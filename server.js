/* ============================================================
   NEBULA STATION — Server mit Accounts (Supabase)
   - prueft bei jeder Socket-Verbindung den Login-Token
   - laedt/speichert das Profil (Alien) aus der Datenbank
   Benoetigte Umgebungsvariablen (auf Render setzen):
     SUPABASE_URL          z.B. https://abcd.supabase.co
     SUPABASE_ANON_KEY     oeffentlicher Key (geht auch an den Browser)
     SUPABASE_SERVICE_KEY  geheimer Service-Role-Key (nur Server!)
   ============================================================ */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('WARN: SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen - Login funktioniert erst, wenn die Umgebungsvariablen gesetzt sind.');
}

// Server-Client mit Service-Role-Key (umgeht RLS). NUR serverseitig verwenden.
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

app.use(express.static(path.join(__dirname, 'public')));

// Der Browser holt sich hier URL + oeffentlichen Key fuer die Anmeldung.
app.get('/config', (req, res) => {
  res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
});

const COLORS  = ['#4dd0ff','#ff5ea8','#ffb14d','#7be0b0','#b18cff','#ffe15e'];
const SPECIES = ['blobbi','knuffo','slink','zacki','nebli'];
const ACCS    = ['none','party','crown','phones','shades'];
const clamp = (v,a,b) => v<a?a:v>b?b:v;

const players = {}; // socket.id -> Spielerzustand (nur fuer aktive Sitzung)

// --- Login-Pruefung: laeuft VOR jeder Verbindung ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('kein Token'));
    const { data, error } = await admin.auth.getUser(token); // validiert den Token serverseitig
    if (error || !data.user) return next(new Error('ungueltiger Token'));
    socket.userId = data.user.id;

    // Profil laden (wird beim Signup per DB-Trigger automatisch angelegt)
    let { data: profile } = await admin.from('profiles').select('*').eq('id', socket.userId).single();
    if (!profile) {
      const username = (data.user.user_metadata && data.user.user_metadata.username) || 'Alien';
      const ins = await admin.from('profiles').insert({ id: socket.userId, username }).select('*').single();
      profile = ins.data;
    }
    socket.profile = profile;
    next();
  } catch (e) {
    next(new Error('Auth-Fehler'));
  }
});

io.on('connection', (socket) => {
  const p = socket.profile;

  if (!p.species) {
    socket.emit('needs-setup', { username: p.username }); // neuer Account -> Alien waehlen
  } else {
    finalizeSpawn(socket, p);
  }

  socket.on('setup', async (d) => {
    if (players[socket.id]) return;
    const species = SPECIES.includes(d.species) ? d.species : SPECIES[0];
    const color   = COLORS.includes(d.color) ? d.color : COLORS[0];
    await admin.from('profiles').update({ species, color }).eq('id', socket.userId);
    finalizeSpawn(socket, Object.assign({}, socket.profile, { species, color }));
  });

  socket.on('move', (m) => {
    const me = players[socket.id]; if (!me) return;
    me.x = clamp(+m.x || 0, 60, 980);
    me.y = clamp(+m.y || 0, 240, 600);
    me.face = m.face === -1 ? -1 : 1;
    socket.broadcast.emit('player-moved', { id: socket.id, x: me.x, y: me.y, face: me.face });
  });

  socket.on('room', (m) => {
    const me = players[socket.id]; if (!me) return;
    me.room = m.room === 'obs' ? 'obs' : 'deck';
    me.x = +m.x || me.x; me.y = +m.y || me.y;
    io.emit('player-room', { id: socket.id, room: me.room, x: me.x, y: me.y });
  });

  socket.on('chat', (text) => {
    const me = players[socket.id]; if (!me || !text) return;
    io.emit('chat', { id: socket.id, name: me.name, color: me.color, text: String(text).slice(0, 120) });
  });

  socket.on('emote', (e) => {
    if (!players[socket.id]) return;
    io.emit('player-emote', { id: socket.id, icon: String(e.icon || '').slice(0, 8), expr: String(e.expr || 'happy') });
  });

  socket.on('acc', async (a) => {
    const me = players[socket.id]; if (!me) return;
    if (!ACCS.includes(a.acc)) return;
    me.acc = a.acc;
    io.emit('player-acc', { id: socket.id, acc: me.acc });
    await admin.from('profiles').update({ acc: me.acc }).eq('id', socket.userId); // dauerhaft speichern
  });

  // Orb eingesammelt -> Sternenstaub gutschreiben (mit Spam-Bremse)
  socket.on('collect', async () => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastCollect || 0) < 150) return; // Rate-Limit
    me.lastCollect = now;
    me.stardust += 5;
    socket.emit('stardust', { value: me.stardust });
    if (now - (me.lastSave || 0) > 4000) {          // DB-Schreiben drosseln
      me.lastSave = now;
      await admin.from('profiles').update({ stardust: me.stardust }).eq('id', socket.userId);
    }
  });

  socket.on('c4-sit', () => {
    const p2 = players[socket.id]; if (!p2 || p2.room !== 'obs') return;
    if (!c4) { c4 = { a:{id:socket.id,name:p2.name,color:p2.color}, b:null, board:c4NewBoard(), turn:0, started:false };
      io.to(socket.id).emit('c4-waiting'); return; }
    if (c4.a.id === socket.id || (c4.b && c4.b.id === socket.id)) return;
    if (c4.b) { io.to(socket.id).emit('c4-busy'); return; }
    c4.b = {id:socket.id,name:p2.name,color:p2.color}; c4.started = true; c4.turn = 0;
    const common = { board:c4.board, turn:c4.turn, a:{name:c4.a.name,color:c4.a.color}, b:{name:c4.b.name,color:c4.b.color} };
    io.to(c4.a.id).emit('c4-start', Object.assign({seat:0}, common));
    io.to(c4.b.id).emit('c4-start', Object.assign({seat:1}, common));
  });

  socket.on('c4-drop', (d) => {
    if (!c4 || !c4.started) return;
    const seat = c4.a.id === socket.id ? 0 : (c4.b && c4.b.id === socket.id ? 1 : -1);
    if (seat < 0 || seat !== c4.turn) return;
    const col = +d.col; if (!(col >= 0 && col < C4_COLS)) return;
    let row = -1; for (let r = C4_ROWS-1; r >= 0; r--) { if (c4.board[r][col] === 0) { row = r; break; } }
    if (row < 0) return;
    c4.board[row][col] = seat + 1;
    if (c4Win(c4.board, seat+1)) { c4Both('c4-update', {board:c4.board, turn:-1, lastCol:col}); return c4Over(seat, 'win'); }
    if (c4.board[0].every(v => v !== 0)) { c4Both('c4-update', {board:c4.board, turn:-1, lastCol:col}); return c4Over(-1, 'draw'); }
    c4.turn = 1 - c4.turn;
    c4Both('c4-update', {board:c4.board, turn:c4.turn, lastCol:col});
  });

  socket.on('c4-leave', () => c4LeaveHandler(socket.id));

  socket.on('disconnect', async () => {
    const me = players[socket.id];
    c4LeaveHandler(socket.id);
    if (me) {
      io.emit('system', me.name + ' hat die Station verlassen.');
      await admin.from('profiles').update({ stardust: me.stardust }).eq('id', socket.userId); // beim Verlassen sichern
    }
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

function finalizeSpawn(socket, profile) {
  const me = {
    id: socket.id,
    userId: socket.userId,
    name: profile.username || 'Alien',
    color: COLORS.includes(profile.color) ? profile.color : COLORS[0],
    species: SPECIES.includes(profile.species) ? profile.species : SPECIES[0],
    acc: ACCS.includes(profile.acc) ? profile.acc : 'none',
    stardust: profile.stardust || 0,
    room: 'deck', x: 520, y: 400, face: 1, lastCollect: 0, lastSave: 0
  };
  players[socket.id] = me;
  socket.emit('spawn', { name: me.name, color: me.color, species: me.species, acc: me.acc, stardust: profile.stardust || 0 });
  socket.emit('world', players);
  socket.broadcast.emit('player-joined', me);
  io.emit('system', me.name + ' ist angedockt.');
}

// ---------------- 4 GEWINNT ----------------
const C4_COLS = 7, C4_ROWS = 6, C4_REWARD = 25;
let c4 = null; // { a:{id,name,color}, b:{id,name,color}|null, board, turn, started }

function c4NewBoard() { return Array.from({length:C4_ROWS}, () => Array(C4_COLS).fill(0)); }
function c4Both(ev, payload) { if (c4.a) io.to(c4.a.id).emit(ev, payload); if (c4.b) io.to(c4.b.id).emit(ev, payload); }
function c4Win(b, val) {
  for (let r = 0; r < C4_ROWS; r++) for (let c = 0; c < C4_COLS; c++) {
    if (b[r][c] !== val) continue;
    for (const d of [[0,1],[1,0],[1,1],[1,-1]]) {
      let k = 1;
      while (k < 4) { const nr = r+d[0]*k, nc = c+d[1]*k;
        if (nr<0||nr>=C4_ROWS||nc<0||nc>=C4_COLS||b[nr][nc]!==val) break; k++; }
      if (k === 4) return true;
    }
  }
  return false;
}
function c4Over(seat, reason) {
  const payload = { winnerSeat: seat, reason, board: c4.board };
  if (seat >= 0) {
    const win = seat === 0 ? c4.a : c4.b;
    const wp = players[win.id];
    if (wp) {
      wp.stardust += C4_REWARD;
      io.to(win.id).emit('stardust', { value: wp.stardust });
      admin.from('profiles').update({ stardust: wp.stardust }).eq('id', wp.userId).then(() => {}, () => {});
    }
  }
  c4Both('c4-over', payload);
  c4 = null;
}
function c4LeaveHandler(id) {
  if (!c4) return;
  const inGame = c4.a.id === id || (c4.b && c4.b.id === id);
  if (!inGame) return;
  if (!c4.started) { io.to(c4.a.id).emit('c4-cancel'); c4 = null; return; }
  c4Over(c4.a.id === id ? 1 : 0, 'forfeit'); // Gegner gewinnt durch Aufgabe
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Nebula Station laeuft auf http://localhost:' + PORT));
