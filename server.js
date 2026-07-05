/* ============================================================
   NEBULA STATION — Multiplayer-Server (Cartoon-Version)
   Node.js + Socket.IO. Synchronisiert Spieler, Bewegung,
   Chat, Emotes, Accessoires und Raumwechsel in Echtzeit.
   Start:  npm install  &&  npm start   →  http://localhost:3000
   ============================================================ */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Der Server ist die "Wahrheit": hier leben alle Spieler.
const players = {}; // id -> { id, name, color, species, acc, room, x, y, face }

const COLORS   = ['#4dd0ff','#ff5ea8','#ffb14d','#7be0b0','#b18cff','#ffe15e'];
const SPECIES  = ['blobbi','knuffo','slink','zacki','nebli'];
const ACCS     = ['none','party','crown','phones','shades'];
const clamp = (v,a,b) => v<a?a:v>b?b:v;

io.on('connection', (socket) => {

  // --- Andocken ---
  socket.on('join', (d) => {
    players[socket.id] = {
      id: socket.id,
      name: String(d.name || 'Reisender').slice(0, 14),
      color: COLORS.includes(d.color) ? d.color : COLORS[0],
      species: SPECIES.includes(d.species) ? d.species : SPECIES[0],
      acc: ACCS.includes(d.acc) ? d.acc : 'none',
      room: 'deck',
      x: 520, y: 400, face: 1
    };
    socket.emit('world', players);                         // alle aktuellen Spieler an den Neuen
    socket.broadcast.emit('player-joined', players[socket.id]); // Neuen an alle anderen
    io.emit('system', players[socket.id].name + ' ist angedockt.');
  });

  // --- Bewegung ---
  socket.on('move', (p) => {
    const me = players[socket.id]; if (!me) return;
    me.x = clamp(+p.x || 0, 60, 980);
    me.y = clamp(+p.y || 0, 240, 600);
    me.face = p.face === -1 ? -1 : 1;
    socket.broadcast.emit('player-moved', { id: socket.id, x: me.x, y: me.y, face: me.face });
  });

  // --- Raumwechsel ---
  socket.on('room', (p) => {
    const me = players[socket.id]; if (!me) return;
    me.room = p.room === 'obs' ? 'obs' : 'deck';
    me.x = +p.x || me.x; me.y = +p.y || me.y;
    io.emit('player-room', { id: socket.id, room: me.room, x: me.x, y: me.y });
  });

  // --- Chat ---
  socket.on('chat', (text) => {
    const me = players[socket.id]; if (!me || !text) return;
    io.emit('chat', { id: socket.id, name: me.name, color: me.color, text: String(text).slice(0, 120) });
  });

  // --- Emote ---
  socket.on('emote', (e) => {
    if (!players[socket.id]) return;
    io.emit('player-emote', { id: socket.id, icon: String(e.icon || '').slice(0, 8), expr: String(e.expr || 'happy') });
  });

  // --- Accessoire wechseln ---
  socket.on('acc', (a) => {
    const me = players[socket.id]; if (!me) return;
    if (ACCS.includes(a.acc)) me.acc = a.acc;
    io.emit('player-acc', { id: socket.id, acc: me.acc });
  });

  // --- Verlassen ---
  socket.on('disconnect', () => {
    const me = players[socket.id];
    if (me) io.emit('system', me.name + ' hat die Station verlassen.');
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('🚀 Nebula Station läuft auf http://localhost:' + PORT));
