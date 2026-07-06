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

  socket.on('c4-sit', (d) => {
    const p2 = players[socket.id]; if (!p2 || p2.room !== 'obs') return;
    if (p2.table >= 0) return;                       // schon an einem Tisch
    const ti = +d.table; if (!(ti >= 0 && ti < TABLES)) return;
    let g = games[ti];
    if (!g) {
      g = { table: ti, a:{id:socket.id,name:p2.name,color:p2.color}, b:null, colA:p2.color, colB:null, board:c4NewBoard(), turn:0, started:false };
      games[ti] = g; p2.table = ti; c4SetSitting(socket.id, true);
      io.to(socket.id).emit('c4-waiting', { table: ti }); return;
    }
    if (g.a.id === socket.id) return;
    if (g.b) { io.to(socket.id).emit('c4-busy'); return; }
    g.b = { id:socket.id, name:p2.name, color:p2.color };
    g.colA = g.a.color;
    g.colB = (p2.color !== g.a.color) ? p2.color : (COLORS.find(c => c !== g.a.color) || '#ff5ea8'); // gleiche Farbe -> Gegner bekommt eine andere
    g.started = true; g.turn = 0; p2.table = ti; c4SetSitting(socket.id, true);
    const common = { table:ti, board:g.board, turn:g.turn, a:{name:g.a.name,color:g.colA}, b:{name:g.b.name,color:g.colB} };
    io.to(g.a.id).emit('c4-start', Object.assign({seat:0}, common));
    io.to(g.b.id).emit('c4-start', Object.assign({seat:1}, common));
  });

  socket.on('c4-drop', (d) => {
    const p2 = players[socket.id]; if (!p2) return;
    const g = games[p2.table]; if (!g || !g.started) return;
    const seat = g.a.id === socket.id ? 0 : (g.b && g.b.id === socket.id ? 1 : -1);
    if (seat < 0 || seat !== g.turn) return;
    const col = +d.col; if (!(col >= 0 && col < C4_COLS)) return;
    let row = -1; for (let r = C4_ROWS-1; r >= 0; r--) { if (g.board[r][col] === 0) { row = r; break; } }
    if (row < 0) return;
    g.board[row][col] = seat + 1;
    if (c4Win(g.board, seat+1)) { c4Both(g, 'c4-update', {board:g.board, turn:-1, lastCol:col}); return c4End(g, seat, 'win'); }
    if (g.board[0].every(v => v !== 0)) { c4Both(g, 'c4-update', {board:g.board, turn:-1, lastCol:col}); return c4End(g, -1, 'draw'); }
    g.turn = 1 - g.turn;
    c4Both(g, 'c4-update', {board:g.board, turn:g.turn, lastCol:col});
  });

  socket.on('c4-leave', () => c4LeaveHandler(socket.id));

  socket.on('leaderboard', async () => {
    const { data } = await admin.from('profiles')
      .select('username,wins,game_stardust')
      .order('wins', { ascending: false }).order('game_stardust', { ascending: false })
      .limit(10);
    socket.emit('leaderboard-data', { rows: data || [] });
  });

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
    wins: profile.wins || 0,
    game_stardust: profile.game_stardust || 0,
    sitting: false, table: -1,
    room: 'deck', x: 520, y: 400, face: 1, lastCollect: 0, lastSave: 0
  };
  players[socket.id] = me;
  socket.emit('spawn', { name: me.name, color: me.color, species: me.species, acc: me.acc, stardust: profile.stardust || 0 });
  socket.emit('world', players);
  socket.broadcast.emit('player-joined', me);
  io.emit('system', me.name + ' ist angedockt.');
}

// ---------------- 4 GEWINNT (mehrere Tische) ----------------
const C4_COLS = 7, C4_ROWS = 6, C4_REWARD = 25, TABLES = 3;
const games = new Array(TABLES).fill(null); // je Tisch ein Spiel

function c4NewBoard() { return Array.from({length:C4_ROWS}, () => Array(C4_COLS).fill(0)); }
function c4Both(g, ev, payload) { if (g.a) io.to(g.a.id).emit(ev, payload); if (g.b) io.to(g.b.id).emit(ev, payload); }
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
function c4SetSitting(id, val) { const p = players[id]; if (p) { p.sitting = val; io.emit('player-sit', { id, sitting: val }); } }
function c4End(g, seat, reason) {
  const payload = { winnerSeat: seat, reason, board: g.board };
  if (seat >= 0) {
    const win = seat === 0 ? g.a : g.b;
    const wp = players[win.id];
    if (wp) {
      wp.stardust += C4_REWARD;
      wp.wins = (wp.wins || 0) + 1;
      wp.game_stardust = (wp.game_stardust || 0) + C4_REWARD;
      io.to(win.id).emit('stardust', { value: wp.stardust });
      admin.from('profiles').update({ stardust: wp.stardust, wins: wp.wins, game_stardust: wp.game_stardust })
        .eq('id', wp.userId).then(() => {}, () => {});
    }
  }
  c4Both(g, 'c4-over', payload);
  if (g.a && players[g.a.id]) players[g.a.id].table = -1;
  if (g.b && players[g.b.id]) players[g.b.id].table = -1;
  c4SetSitting(g.a.id, false);
  if (g.b) c4SetSitting(g.b.id, false);
  games[g.table] = null;
}
function c4LeaveHandler(id) {
  const p = players[id]; if (!p) return;
  const ti = p.table; if (ti < 0 || !games[ti]) return;
  const g = games[ti];
  const inGame = g.a.id === id || (g.b && g.b.id === id);
  if (!inGame) return;
  if (!g.started) { // nur Warteschlange -> abbrechen
    io.to(g.a.id).emit('c4-cancel');
    if (players[g.a.id]) players[g.a.id].table = -1;
    c4SetSitting(g.a.id, false);
    games[ti] = null; return;
  }
  c4End(g, g.a.id === id ? 1 : 0, 'forfeit'); // Gegner gewinnt durch Aufgabe
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Nebula Station laeuft auf http://localhost:' + PORT));
