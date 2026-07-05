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

  socket.on('disconnect', () => {
    const me = players[socket.id];
    if (me) io.emit('system', me.name + ' hat die Station verlassen.');
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

function finalizeSpawn(socket, profile) {
  const me = {
    id: socket.id,
    name: profile.username || 'Alien',
    color: COLORS.includes(profile.color) ? profile.color : COLORS[0],
    species: SPECIES.includes(profile.species) ? profile.species : SPECIES[0],
    acc: ACCS.includes(profile.acc) ? profile.acc : 'none',
    room: 'deck', x: 520, y: 400, face: 1
  };
  players[socket.id] = me;
  socket.emit('spawn', { name: me.name, color: me.color, species: me.species, acc: me.acc, stardust: profile.stardust || 0 });
  socket.emit('world', players);
  socket.broadcast.emit('player-joined', me);
  io.emit('system', me.name + ' ist angedockt.');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Nebula Station laeuft auf http://localhost:' + PORT));
