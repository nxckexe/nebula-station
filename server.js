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

// ---- Fortschritt: XP -> Level -> Rang ----
function xpLevel(xp) { return 1 + Math.floor(Math.sqrt((xp || 0) / 50)); }
function xpForLevel(l) { return 50 * (l - 1) * (l - 1); }
function rankName(lvl) {
  if (lvl >= 25) return 'Sternenadmiral';
  if (lvl >= 15) return 'Captain';
  if (lvl >= 10) return 'Kommandant';
  if (lvl >= 6)  return 'Navigator';
  if (lvl >= 3)  return 'Pilot';
  return 'Kadett';
}

// ---- Shop ----
const SHOP = [
  { id:'party',     type:'acc', name:'Partyhut',        price:150, minLevel:1 },
  { id:'shades',    type:'acc', name:'Sonnenbrille',    price:200, minLevel:1 },
  { id:'phones',    type:'acc', name:'Kopfhörer',       price:250, minLevel:2 },
  { id:'crown',     type:'acc', name:'Krone',           price:500, minLevel:4 },
  { id:'bg_grid',   type:'bg',  name:'Neon-Grid',       price:250, minLevel:1 },
  { id:'bg_aurora', type:'bg',  name:'Aurora',          price:350, minLevel:2 },
  { id:'bg_sunset', type:'bg',  name:'Sonnenuntergang', price:350, minLevel:3 }
];
function ownedSet(str) { return new Set(String(str || '').split(',').filter(Boolean)); }

// ---- Planeten (Level-basiert freigeschaltet) ----
const PLANETS = [
  { id:'verdiania', name:'Verdiania', minLevel:1,  theme:'verdant' },
  { id:'cryonis',   name:'Cryonis',   minLevel:5,  theme:'ice'     },
  { id:'magmara',   name:'Magmara',   minLevel:12, theme:'lava'    }
];
const ROOM_IDS = new Set(['deck', 'obs'].concat(PLANETS.map(p => p.id)));
const clamp = (v,a,b) => v<a?a:v>b?b:v;

const players = {}; // socket.id -> Spielerzustand (nur fuer aktive Sitzung)
const online = {};  // userId -> socket.id (fuer Freunde/DMs)

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
    me.x = clamp(+m.x || 0, 0, 2600);
    me.y = clamp(+m.y || 0, 0, 1700);
    me.face = m.face === -1 ? -1 : 1;
    socket.broadcast.emit('player-moved', { id: socket.id, x: me.x, y: me.y, face: me.face });
  });

  socket.on('room', (m) => {
    const me = players[socket.id]; if (!me) return;
    const target = String(m.room || '');
    if (!ROOM_IDS.has(target)) return;
    const planet = PLANETS.find(p => p.id === target);
    if (planet && xpLevel(me.xp) < planet.minLevel) { socket.emit('planet-locked', { minLevel: planet.minLevel }); return; }
    me.room = target;
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
    if (a.acc !== 'none' && !ownedSet(me.owned).has(a.acc)) return; // nur Besessenes anlegen
    me.acc = a.acc;
    io.emit('player-acc', { id: socket.id, acc: me.acc });
    await admin.from('profiles').update({ acc: me.acc }).eq('id', socket.userId);
  });

  socket.on('equip-bg', async (d) => {
    const me = players[socket.id]; if (!me) return;
    if (d.bg !== 'space' && !ownedSet(me.owned).has(d.bg)) return;
    me.bg = d.bg;
    io.emit('player-bg', { id: socket.id, bg: me.bg });
    await admin.from('profiles').update({ bg: me.bg }).eq('id', socket.userId);
  });

  socket.on('shop-buy', async (d) => {
    const me = players[socket.id]; if (!me) return;
    const item = SHOP.find(s => s.id === d.id);
    if (!item) { socket.emit('shop-result', { ok:false, text:'Unbekannter Artikel.' }); return; }
    const owned = ownedSet(me.owned);
    if (owned.has(item.id)) { socket.emit('shop-result', { ok:false, text:'Schon im Inventar.' }); return; }
    if (xpLevel(me.xp) < item.minLevel) { socket.emit('shop-result', { ok:false, text:'Erst ab Level ' + item.minLevel + '.' }); return; }
    if (me.stardust < item.price) { socket.emit('shop-result', { ok:false, text:'Zu wenig Sternenstaub.' }); return; }
    me.stardust -= item.price; owned.add(item.id); me.owned = Array.from(owned).join(',');
    await admin.from('profiles').update({ stardust: me.stardust, owned: me.owned }).eq('id', socket.userId);
    socket.emit('stardust', { value: me.stardust });
    socket.emit('shop-result', { ok:true, text:item.name + ' gekauft!', owned: me.owned });
  });

  // Orb (Station) eingesammelt -> Sternenstaub + XP
  socket.on('collect', async () => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastCollect || 0) < 150) return;
    me.lastCollect = now;
    me.stardust += 5;
    socket.emit('stardust', { value: me.stardust });
    grantXp(socket, me, 2);
    if (now - (me.lastSave || 0) > 4000) {
      me.lastSave = now;
      await admin.from('profiles').update({ stardust: me.stardust, xp: me.xp }).eq('id', socket.userId);
    }
  });

  // Kristall auf einem Planeten -> mehr Sternenstaub + XP
  socket.on('crystal', async () => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastCollect || 0) < 150) return;
    me.lastCollect = now;
    me.stardust += 10;
    socket.emit('stardust', { value: me.stardust });
    grantXp(socket, me, 6);
    if (now - (me.lastSave || 0) > 3000) {
      me.lastSave = now;
      await admin.from('profiles').update({ stardust: me.stardust, xp: me.xp }).eq('id', socket.userId);
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

  // ---- Freunde ----
  socket.on('friend-add', async (d) => {
    const uname = String(d.username || '').trim(); if (!uname) return;
    const { data: target } = await admin.from('profiles').select('id,username').ilike('username', uname).limit(1).maybeSingle();
    if (!target || target.id === socket.userId) { socket.emit('friend-msg', { ok:false, text:'Spieler nicht gefunden.' }); return; }
    const { data: rows } = await admin.from('friendships').select('*').or(`requester.eq.${socket.userId},addressee.eq.${socket.userId}`);
    if ((rows || []).some(r => r.requester === target.id || r.addressee === target.id)) {
      socket.emit('friend-msg', { ok:false, text:'Ihr seid schon verbunden oder eine Anfrage läuft.' }); return;
    }
    await admin.from('friendships').insert({ requester: socket.userId, addressee: target.id, status:'pending' });
    socket.emit('friend-msg', { ok:true, text:'Anfrage an ' + target.username + ' gesendet!' });
    const ts = online[target.id]; if (ts) io.to(ts).emit('friend-refresh');
  });
  socket.on('friend-accept', async (d) => {
    await admin.from('friendships').update({ status:'accepted' }).eq('requester', d.fromId).eq('addressee', socket.userId);
    socket.emit('friend-refresh');
    const s = online[d.fromId]; if (s) io.to(s).emit('friend-refresh');
  });
  socket.on('friend-decline', async (d) => {
    await admin.from('friendships').delete().eq('requester', d.fromId).eq('addressee', socket.userId);
    socket.emit('friend-refresh');
  });
  socket.on('friends-list', async () => {
    const { data: rows } = await admin.from('friendships').select('*').or(`requester.eq.${socket.userId},addressee.eq.${socket.userId}`);
    const ids = new Set(); (rows || []).forEach(r => { ids.add(r.requester); ids.add(r.addressee); }); ids.delete(socket.userId);
    const { data: profs } = ids.size ? await admin.from('profiles').select('id,username').in('id', Array.from(ids)) : { data: [] };
    const nameOf = {}; (profs || []).forEach(p => nameOf[p.id] = p.username);
    const friends = [], incoming = [], outgoing = [];
    (rows || []).forEach(r => {
      const otherId = r.requester === socket.userId ? r.addressee : r.requester;
      const entry = { id: otherId, username: nameOf[otherId] || 'Alien', online: !!online[otherId] };
      if (r.status === 'accepted') friends.push(entry);
      else if (r.addressee === socket.userId) incoming.push(entry);
      else outgoing.push(entry);
    });
    socket.emit('friends-data', { friends, incoming, outgoing });
  });

  // ---- Direktnachrichten ----
  socket.on('dm', async (d) => {
    const text = String(d.text || '').slice(0, 300), toId = d.toId; if (!text || !toId) return;
    await admin.from('messages').insert({ sender: socket.userId, receiver: toId, text });
    const s = online[toId]; if (s) io.to(s).emit('dm-in', { fromId: socket.userId, text });
  });
  socket.on('dm-history', async (d) => {
    const withId = d.withId; if (!withId) return;
    const { data } = await admin.from('messages').select('sender,receiver,text,created_at')
      .or(`and(sender.eq.${socket.userId},receiver.eq.${withId}),and(sender.eq.${withId},receiver.eq.${socket.userId})`)
      .order('created_at', { ascending: true }).limit(50);
    socket.emit('dm-history-data', { withId, messages: (data || []).map(m => ({ mine: m.sender === socket.userId, text: m.text })) });
  });

  // ---- Teleskop-Geheimnis ----
  socket.on('secret-found', async () => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastSecret || 0) < 120000) { socket.emit('secret-result', { ok:false }); return; } // 2 Min Cooldown
    me.lastSecret = now; me.stardust += 50;
    socket.emit('stardust', { value: me.stardust });
    grantXp(socket, me, 30);
    socket.emit('secret-result', { ok:true, amount:50 });
    admin.from('profiles').update({ stardust: me.stardust, xp: me.xp }).eq('id', me.userId).then(() => {}, () => {});
  });

  socket.on('disconnect', async () => {
    const me = players[socket.id];
    c4LeaveHandler(socket.id);
    if (online[socket.userId] === socket.id) delete online[socket.userId];
    if (me) {
      io.emit('system', me.name + ' hat die Station verlassen.');
      await admin.from('profiles').update({ stardust: me.stardust }).eq('id', socket.userId); // beim Verlassen sichern
    }
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

function finalizeSpawn(socket, profile) {
  const lvl = xpLevel(profile.xp || 0);
  const me = {
    id: socket.id,
    userId: socket.userId,
    name: profile.username || 'Alien',
    color: COLORS.includes(profile.color) ? profile.color : COLORS[0],
    species: SPECIES.includes(profile.species) ? profile.species : SPECIES[0],
    acc: ACCS.includes(profile.acc) ? profile.acc : 'none',
    bg: profile.bg || 'space',
    stardust: profile.stardust || 0,
    xp: profile.xp || 0, level: lvl, rank: rankName(lvl),
    owned: profile.owned || '',
    wins: profile.wins || 0,
    game_stardust: profile.game_stardust || 0,
    sitting: false, table: -1,
    room: 'deck', x: 520, y: 400, face: 1, lastCollect: 0, lastSave: 0
  };
  players[socket.id] = me;
  online[socket.userId] = socket.id;
  socket.emit('spawn', {
    name: me.name, color: me.color, species: me.species, acc: me.acc, bg: me.bg,
    stardust: me.stardust, xp: me.xp, level: lvl, rank: me.rank, owned: me.owned
  });
  socket.emit('world', players);
  socket.broadcast.emit('player-joined', me);
  io.emit('system', me.name + ' ist angedockt.');
}

function grantXp(socket, me, amt) {
  const before = xpLevel(me.xp || 0);
  me.xp = (me.xp || 0) + amt;
  const after = xpLevel(me.xp);
  me.level = after; me.rank = rankName(after);
  socket.emit('progress', { xp: me.xp, level: after, rank: me.rank, leveled: after > before, nextXp: xpForLevel(after + 1), curXp: xpForLevel(after) });
  if (after > before) io.emit('system', me.name + ' ist jetzt Level ' + after + ' (' + me.rank + ')!');
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
      const before = xpLevel(wp.xp || 0); wp.xp = (wp.xp || 0) + 40; const after = xpLevel(wp.xp);
      wp.level = after; wp.rank = rankName(after);
      io.to(win.id).emit('stardust', { value: wp.stardust });
      io.to(win.id).emit('progress', { xp: wp.xp, level: after, rank: wp.rank, leveled: after > before, nextXp: xpForLevel(after + 1), curXp: xpForLevel(after) });
      if (after > before) io.emit('system', wp.name + ' ist jetzt Level ' + after + ' (' + wp.rank + ')!');
      admin.from('profiles').update({ stardust: wp.stardust, wins: wp.wins, game_stardust: wp.game_stardust, xp: wp.xp })
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
