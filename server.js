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

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));

// Der Browser holt sich hier URL + oeffentlichen Key fuer die Anmeldung.
app.get('/config', (req, res) => {
  res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
});

const COLORS  = ['#4dd0ff','#ff5ea8','#ffb14d','#7be0b0','#b18cff','#ffe15e'];
const SPECIES = ['blobbi','knuffo','slink','zacki','nebli'];
const ACCS    = ['none','cap','glasses','shades','bow','flower','beanie','phones','party','monocle','cowboy','horns','star','propeller','tophat','wizard','halo','crown'];

// ---- Fortschritt: XP -> Level -> Rang (steilere Kurve) ----
function xpLevel(xp) { return 1 + Math.floor(Math.sqrt((xp || 0) / 70)); }
function xpForLevel(l) { return 70 * (l - 1) * (l - 1); }
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
  { id:'cap',       type:'acc', name:'Cap',              price:800,   minLevel:1 },
  { id:'glasses',   type:'acc', name:'Brille',           price:1200,  minLevel:1 },
  { id:'shades',    type:'acc', name:'Sonnenbrille',     price:1800,  minLevel:1 },
  { id:'bow',       type:'acc', name:'Schleife',         price:2500,  minLevel:2 },
  { id:'flower',    type:'acc', name:'Blume',            price:2500,  minLevel:2 },
  { id:'beanie',    type:'acc', name:'Mütze',            price:3500,  minLevel:2 },
  { id:'phones',    type:'acc', name:'Kopfhörer',        price:4500,  minLevel:3 },
  { id:'party',     type:'acc', name:'Partyhut',         price:5000,  minLevel:3 },
  { id:'monocle',   type:'acc', name:'Monokel',          price:7000,  minLevel:4 },
  { id:'cowboy',    type:'acc', name:'Cowboyhut',        price:9500,  minLevel:5 },
  { id:'horns',     type:'acc', name:'Hörner',           price:13000, minLevel:6 },
  { id:'star',      type:'acc', name:'Sternchen',        price:17000, minLevel:7 },
  { id:'propeller', type:'acc', name:'Propellermütze',   price:22000, minLevel:8 },
  { id:'tophat',    type:'acc', name:'Zylinder',         price:28000, minLevel:9 },
  { id:'wizard',    type:'acc', name:'Zaubererhut',      price:40000, minLevel:11 },
  { id:'halo',      type:'acc', name:'Heiligenschein',   price:60000, minLevel:14 },
  { id:'crown',     type:'acc', name:'Krone',            price:90000, minLevel:16 },
  { id:'bg_grid',   type:'bg',  name:'Neon-Grid',        price:2500,  minLevel:1 },
  { id:'bg_mint',   type:'bg',  name:'Minze',            price:3000,  minLevel:2 },
  { id:'bg_candy',  type:'bg',  name:'Bonbon',           price:3000,  minLevel:2 },
  { id:'bg_deep',   type:'bg',  name:'Tiefsee',          price:4500,  minLevel:3 },
  { id:'bg_aurora', type:'bg',  name:'Aurora',           price:6500,  minLevel:4 },
  { id:'bg_sunset', type:'bg',  name:'Sonnenuntergang',  price:6500,  minLevel:4 },
  { id:'bg_stars',  type:'bg',  name:'Sternenhimmel',    price:9500,  minLevel:5 },
  { id:'bg_nebula', type:'bg',  name:'Nebel',            price:14000, minLevel:6 },
  { id:'bg_gold',   type:'bg',  name:'Gold',             price:24000, minLevel:9 },
  { id:'bg_matrix', type:'bg',  name:'Matrix',           price:30000, minLevel:10 },
  { id:'bg_rainbow',type:'bg',  name:'Regenbogen',       price:45000, minLevel:13 }
];
function ownedSet(str) { return new Set(String(str || '').split(',').filter(Boolean)); }

// ---- Slot Machine (Nickusch Industries) ----
const SLOT_SYMS = [ {i:0,w:26,three:8}, {i:1,w:22,three:10}, {i:2,w:18,three:12}, {i:3,w:14,three:15}, {i:4,w:10,three:25}, {i:5,w:6,three:50}, {i:6,w:4,three:100} ];
const SLOT_BETS = [100, 500, 1000];
const WHEEL_VALUES = [50, 100, 200, 500, 100, 300, 1000, 2000];
const WHEEL_WEIGHTS = [30, 24, 16, 8, 24, 12, 4, 2];
const WHEEL_DAY = 24 * 3600 * 1000;
function wheelRoll(){ const total=WHEEL_WEIGHTS.reduce((a,b)=>a+b,0); let r=Math.random()*total; for(let i=0;i<WHEEL_WEIGHTS.length;i++){ if((r-=WHEEL_WEIGHTS[i])<0) return i; } return 0; }

// ---- Blackjack ----
const BJ_BETS = [100, 500, 1000];
function bjMakeDeck(){ const d=[]; for(let s=0;s<4;s++) for(let r=1;r<=13;r++) d.push({r,s}); for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=d[i]; d[i]=d[j]; d[j]=t; } return d; }
function bjCardVal(r){ return r===1?11:Math.min(r,10); }
function bjHand(cards){ let sum=0,aces=0; for(const c of cards){ sum+=bjCardVal(c.r); if(c.r===1)aces++; } while(sum>21&&aces>0){ sum-=10; aces--; } return sum; }
function bjIsBJ(cards){ return cards.length===2 && bjHand(cards)===21; }

// ---- Plinko ----
const PLINKO_BETS = [100, 500, 1000];
const PLINKO_ROWS = 12;
const PLINKO_MULT = [25, 10, 5, 2, 1, 0.5, 0.3, 0.5, 1, 2, 5, 10, 25]; // RTP ~95%
function plinkoDrop(){ const path = []; let slot = 0;
  for (let i = 0; i < PLINKO_ROWS; i++) { const right = Math.random() < 0.5 ? 0 : 1; path.push(right); slot += right; }
  return { path, slot };
}

// ---- Roulette (europäisch, eine Null) ----
const ROU_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ROU_BETS = [100, 500, 1000];
const ROU_BET_MS = 24000, ROU_SPIN_MS = 8000, ROU_RESULT_MS = 6000;
const rou = { phase: 'bet', endsAt: Date.now() + ROU_BET_MS, round: 1, number: null, bets: {}, history: [] };
function rouColor(n){ return n === 0 ? 'green' : (ROU_RED.has(n) ? 'red' : 'black'); }
function rouPayout(bet, n){ // Rückzahlung inkl. Einsatz (0 = verloren)
  const a = bet.amount, v = bet.value;
  switch (bet.type) {
    case 'number': return v === n ? a * 36 : 0;            // 35:1
    case 'red':    return rouColor(n) === 'red' ? a * 2 : 0;
    case 'black':  return rouColor(n) === 'black' ? a * 2 : 0;
    case 'even':   return n !== 0 && n % 2 === 0 ? a * 2 : 0;
    case 'odd':    return n !== 0 && n % 2 === 1 ? a * 2 : 0;
    case 'low':    return n >= 1 && n <= 18 ? a * 2 : 0;
    case 'high':   return n >= 19 && n <= 36 ? a * 2 : 0;
    case 'dozen':  return n !== 0 && Math.ceil(n / 12) === v ? a * 3 : 0;  // 2:1
    default: return 0;
  }
}
function rouPublic(){
  const players_ = [];
  for (const id in rou.bets) {
    const e = rou.bets[id];
    if (!e.list.length) continue;
    players_.push({ id, name: e.name, color: e.color, total: e.list.reduce((s,b)=>s+b.amount,0), n: e.list.length, won: e.won });
  }
  return { phase: rou.phase, endsAt: rou.endsAt, round: rou.round, number: rou.number, history: rou.history.slice(0,10), players: players_ };
}
function rouBroadcast(){ io.emit('roul-state', rouPublic()); }
function rouSettle(){
  const n = rou.number;
  for (const id in rou.bets) {
    const e = rou.bets[id];
    const me = players[id];
    if (!me) continue;
    let payout = 0;
    for (const b of e.list) payout += rouPayout(b, n);
    e.won = payout;
    const staked = e.list.reduce((s,b)=>s+b.amount,0);
    if (payout > 0) {
      me.stardust += payout;
      const sock = io.sockets.sockets.get(id);
      if (sock) {
        sock.emit('stardust', { value: me.stardust });
        sock.emit('roul-win', { number: n, payout, staked, net: payout - staked, stardust: me.stardust });
        if (payout > staked) grantXp(sock, me, 5);
        recordWin(sock, me, 'roulette', payout - staked);
      }
      admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(()=>{},()=>{});
      if (payout >= staked * 10 && staked > 0) io.emit('system', me.name + ' gewinnt ' + payout + ' Sternenstaub am Roulette (Zahl ' + n + ')!');
    } else {
      const sock = io.sockets.sockets.get(id);
      if (sock) sock.emit('roul-win', { number: n, payout: 0, staked, net: -staked, stardust: me.stardust });
    }
  }
}
function rouTick(){
  const now = Date.now();
  if (now < rou.endsAt) return;
  if (rou.phase === 'bet') {
    rou.number = Math.floor(Math.random() * 37);
    rou.phase = 'spin'; rou.endsAt = now + ROU_SPIN_MS;
    io.emit('roul-spin', { number: rou.number, endsAt: rou.endsAt });
    rouBroadcast();
  } else if (rou.phase === 'spin') {
    rouSettle();
    rou.history.unshift({ n: rou.number, c: rouColor(rou.number) });
    rou.history = rou.history.slice(0, 12);
    rou.phase = 'result'; rou.endsAt = now + ROU_RESULT_MS;
    rouBroadcast();
  } else {
    rou.bets = {}; rou.number = null; rou.round++;
    rou.phase = 'bet'; rou.endsAt = now + ROU_BET_MS;
    rouBroadcast();
  }
}
setInterval(rouTick, 500);
function slotRoll(){ const total=SLOT_SYMS.reduce((s,x)=>s+x.w,0); let r=Math.random()*total; for(const s of SLOT_SYMS){ if((r-=s.w)<0) return s.i; } return 0; }

// ---- Planeten (Level-basiert freigeschaltet) ----
const PLANETS = [
  { id:'verdiania', name:'Verdiania', minLevel:1,  theme:'verdant' },
  { id:'cryonis',   name:'Cryonis',   minLevel:5,  theme:'ice'     },
  { id:'magmara',   name:'Magmara',   minLevel:12, theme:'lava'    }
];
const ROOM_IDS = new Set(['deck', 'obs', 'casino'].concat(PLANETS.map(p => p.id)));
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
    if (me.bjTable != null && target !== 'casino') bjLeave(socket);
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

  socket.on('slot-spin', async (d) => {
    const me = players[socket.id]; if (!me) return;
    const bet = +d.bet;
    if (!SLOT_BETS.includes(bet)) { socket.emit('slot-result', { ok:false, text:'Ungültiger Einsatz.' }); return; }
    if (me.stardust < bet) { socket.emit('slot-result', { ok:false, text:'Zu wenig Sternenstaub.' }); return; }
    const now = Date.now();
    if (now - (me.lastSlot || 0) < 1200) return; // Anti-Spam
    me.lastSlot = now;
    me.stardust -= bet;
    const r = [slotRoll(), slotRoll(), slotRoll()];
    let win = 0;
    if (r[0] === r[1] && r[1] === r[2]) win = bet * SLOT_SYMS[r[0]].three;
    else { const cherries = r.filter(x => x === 0).length; if (cherries >= 2) win = bet * 2; }
    me.stardust += win;
    socket.emit('slot-result', { ok:true, reels:r, win, bet, stardust: me.stardust });
    recordWin(socket, me, 'slot', win - bet);
    admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(() => {}, () => {});
  });

  socket.on('space-score', async (d) => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastSpace || 0) < 3000) return;
    me.lastSpace = now;
    const gained = Math.max(0, Math.min(3000, Math.round(+d.collected || 0)));
    const dist = Math.max(0, Math.min(100000, Math.round(+d.dist || 0)));
    const xp = Math.max(0, Math.min(200, Math.round(dist / 10)));
    me.stardust += gained;
    socket.emit('stardust', { value: me.stardust });
    if (xp > 0) grantXp(socket, me, xp);
    const isRecord = dist > (me.spaceBest || 0);
    if (isRecord) me.spaceBest = dist;
    socket.emit('space-best', { best: me.spaceBest, record: isRecord });
    admin.from('profiles').update({ stardust: me.stardust, xp: me.xp, space_best: me.spaceBest }).eq('id', me.userId).then(() => {}, () => {});
  });

  socket.on('space-leaderboard', async () => {
    const { data } = await admin.from('profiles')
      .select('username,space_best')
      .order('space_best', { ascending: false })
      .limit(10);
    socket.emit('space-leaderboard-data', { rows: (data || []).filter(r => (r.space_best || 0) > 0) });
  });

  socket.on('wheel-spin', async () => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    const since = now - (me.lastWheel || 0);
    if (since < WHEEL_DAY) { socket.emit('wheel-result', { ok:false, wait: WHEEL_DAY - since }); return; }
    const idx = wheelRoll();
    const amount = WHEEL_VALUES[idx];
    me.lastWheel = now;
    me.stardust += amount;
    socket.emit('wheel-result', { ok:true, index: idx, amount, stardust: me.stardust });
    recordWin(socket, me, 'wheel', amount);
    socket.emit('stardust', { value: me.stardust });
    grantXp(socket, me, 10);
    admin.from('profiles').update({ stardust: me.stardust, xp: me.xp }).eq('id', me.userId).then(() => {}, () => {});
    admin.from('profiles').update({ last_wheel: me.lastWheel }).eq('id', me.userId).then(() => {}, () => {});
  });

  socket.on('bj-open', (d) => {
    const me = players[socket.id]; if (!me) return;
    if (me.room !== 'casino') return;
    const t = +(d && d.table);
    if (!(t >= 0 && t < 2)) return;
    me.bjTable = t; me.bj = null;
    socket.emit('bj-idle');
    bjBroadcastLive(socket, me);
  });
  socket.on('bj-close', () => { bjLeave(socket); });
  socket.on('bj-watch', () => {
    const me = players[socket.id]; if (!me) return;
    for (const id in players) {
      const p = players[id]; if (p.bjTable == null) continue;
      const bj = p.bj;
      const dealer = bj ? (bj.done ? bj.dealer : [bj.dealer[0], { hidden: true }]) : [];
      socket.emit('bj-live', { id, table: p.bjTable, name: p.name, color: p.color, dealer, player: bj ? bj.player : [], pVal: bj ? bjHand(bj.player) : 0, dVal: (bj && bj.done) ? bjHand(bj.dealer) : null, done: bj ? bj.done : false, outcome: bj ? bj.outcome : null, active: !!bj && !bj.done });
    }
  });
  socket.on('bj-deal', (d) => {
    const me = players[socket.id]; if (!me) return;
    if (me.bjTable == null) return;
    if (me.bj && !me.bj.done) return; // laufende Hand
    const bet = +(d && d.bet);
    if (!BJ_BETS.includes(bet)) { socket.emit('bj-state', { error: 'Ungültiger Einsatz.' }); return; }
    if (me.stardust < bet) { socket.emit('bj-state', { error: 'Zu wenig Sternenstaub.' }); return; }
    me.stardust -= bet;
    const deck = bjMakeDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    me.bj = { deck, player, dealer, bet, done: false, doubled: false, outcome: null };
    socket.emit('stardust', { value: me.stardust });
    admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(() => {}, () => {});
    if (bjIsBJ(player) || bjIsBJ(dealer)) { bjSettle(socket, me); return; }
    bjEmitState(socket, me, false);
    bjBroadcastLive(socket, me);
  });
  socket.on('bj-hit', () => {
    const me = players[socket.id]; if (!me || me.bjTable == null || !me.bj || me.bj.done) return;
    me.bj.player.push(me.bj.deck.pop());
    if (bjHand(me.bj.player) >= 21) { bjSettle(socket, me); return; }
    bjEmitState(socket, me, false);
    bjBroadcastLive(socket, me);
  });
  socket.on('bj-stand', () => {
    const me = players[socket.id]; if (!me || me.bjTable == null || !me.bj || me.bj.done) return;
    bjSettle(socket, me);
  });
  socket.on('bj-double', () => {
    const me = players[socket.id]; if (!me || me.bjTable == null || !me.bj || me.bj.done) return;
    if (me.bj.player.length !== 2 || me.bj.doubled) return;
    if (me.stardust < me.bj.bet) { socket.emit('bj-msg', { text: 'Zu wenig zum Verdoppeln.' }); return; }
    me.stardust -= me.bj.bet; me.bj.bet *= 2; me.bj.doubled = true;
    socket.emit('stardust', { value: me.stardust });
    me.bj.player.push(me.bj.deck.pop());
    bjSettle(socket, me);
  });

  socket.on('plinko-drop', (d) => {
    const me = players[socket.id]; if (!me) return;
    const now = Date.now();
    if (now - (me.lastPlinko || 0) < 700) return; // Anti-Spam
    const bet = +(d && d.bet);
    if (!PLINKO_BETS.includes(bet)) { socket.emit('plinko-result', { ok:false, text:'Ungültiger Einsatz.' }); return; }
    if (me.stardust < bet) { socket.emit('plinko-result', { ok:false, text:'Zu wenig Sternenstaub.' }); return; }
    me.lastPlinko = now;
    me.stardust -= bet;
    const { path, slot } = plinkoDrop();
    const mult = PLINKO_MULT[slot];
    const win = Math.round(bet * mult);
    me.stardust += win;
    socket.emit('plinko-result', { ok:true, path, slot, mult, win, bet, stardust: me.stardust });
    socket.emit('stardust', { value: me.stardust });
    if (win > bet) grantXp(socket, me, 5);
    recordWin(socket, me, 'plinko', win - bet);
    admin.from('profiles').update({ stardust: me.stardust, xp: me.xp }).eq('id', me.userId).then(() => {}, () => {});
    if (mult >= 10) io.emit('system', me.name + ' gewinnt ' + win + ' Sternenstaub bei Plinko (' + mult + 'x)!');
  });

  socket.on('roul-sync', () => { socket.emit('roul-state', rouPublic()); });
  socket.on('casino-leaderboard', async () => {
    const { data } = await admin.from('profiles')
      .select('username,casino_best,casino_best_game')
      .order('casino_best', { ascending: false })
      .limit(10);
    socket.emit('casino-leaderboard-data', {
      rows: (data || []).filter(r => (r.casino_best || 0) > 0),
      feed: recentWins
    });
  });
  socket.on('roul-bet', (d) => {
    const me = players[socket.id]; if (!me) return;
    if (me.room !== 'casino') return;
    if (rou.phase !== 'bet') { socket.emit('roul-msg', { text: 'Einsätze sind geschlossen!' }); return; }
    const amount = +(d && d.amount);
    if (!ROU_BETS.includes(amount)) return;
    const type = String(d && d.type || '');
    let value = (d && d.value != null) ? +d.value : null;
    const simple = ['red','black','even','odd','low','high'];
    if (type === 'number') { if (!(value >= 0 && value <= 36)) return; }
    else if (type === 'dozen') { if (!(value >= 1 && value <= 3)) return; }
    else if (simple.includes(type)) { value = null; }
    else return;
    if (me.stardust < amount) { socket.emit('roul-msg', { text: 'Zu wenig Sternenstaub.' }); return; }
    const e = rou.bets[socket.id] || (rou.bets[socket.id] = { name: me.name, color: me.color, list: [], won: 0 });
    if (e.list.length >= 12) { socket.emit('roul-msg', { text: 'Maximal 12 Einsätze pro Runde.' }); return; }
    me.stardust -= amount;
    e.list.push({ type, value, amount });
    socket.emit('stardust', { value: me.stardust });
    admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(()=>{},()=>{});
    socket.emit('roul-mybets', { list: e.list });
    rouBroadcast();
  });
  socket.on('roul-clear', () => {
    const me = players[socket.id]; if (!me) return;
    if (rou.phase !== 'bet') return;
    const e = rou.bets[socket.id]; if (!e || !e.list.length) return;
    const back = e.list.reduce((s,b)=>s+b.amount,0);
    me.stardust += back;
    e.list = [];
    socket.emit('stardust', { value: me.stardust });
    admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(()=>{},()=>{});
    socket.emit('roul-mybets', { list: [] });
    rouBroadcast();
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
    if (me && rou.bets[socket.id] && rou.phase === 'bet') { // noch nicht gedreht -> Einsätze zurück
      const back = rou.bets[socket.id].list.reduce((s,b)=>s+b.amount,0);
      if (back > 0) { me.stardust += back; admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(()=>{},()=>{}); }
      delete rou.bets[socket.id];
      rouBroadcast();
    }
    bjLeave(socket);
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
    spaceBest: profile.space_best || 0,
    lastWheel: profile.last_wheel || 0,
    casinoBest: profile.casino_best || 0,
    casinoBestGame: profile.casino_best_game || null,
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
  const wleft = WHEEL_DAY - (Date.now() - (me.lastWheel || 0));
  socket.emit('wheel-status', { ready: wleft <= 0, wait: Math.max(0, wleft) });
  socket.emit('casino-best', { best: me.casinoBest || 0, game: me.casinoBestGame });
}

function grantXp(socket, me, amt) {
  const before = xpLevel(me.xp || 0);
  me.xp = (me.xp || 0) + amt;
  const after = xpLevel(me.xp);
  me.level = after; me.rank = rankName(after);
  socket.emit('progress', { xp: me.xp, level: after, rank: me.rank, leveled: after > before, nextXp: xpForLevel(after + 1), curXp: xpForLevel(after) });
  if (after > before) io.emit('system', me.name + ' ist jetzt Level ' + after + ' (' + me.rank + ')!');
}

function bjEmitState(socket, me, reveal) {
  const bj = me.bj; if (!bj) return;
  const dealer = reveal ? bj.dealer : [bj.dealer[0], { hidden: true }];
  socket.emit('bj-state', {
    player: bj.player, dealer,
    pVal: bjHand(bj.player),
    dVal: reveal ? bjHand(bj.dealer) : null,
    done: false, reveal: !!reveal, bet: bj.bet,
    canDouble: bj.player.length === 2 && !bj.doubled && me.stardust >= bj.bet
  });
}
function bjSettle(socket, me) {
  const bj = me.bj; if (!bj || bj.done) return;
  const pVal = bjHand(bj.player);
  if (pVal <= 21) { while (bjHand(bj.dealer) < 17) bj.dealer.push(bj.deck.pop()); }
  const dVal = bjHand(bj.dealer);
  const pBJ = bjIsBJ(bj.player), dBJ = bjIsBJ(bj.dealer);
  let outcome, payout = 0; // payout = Rückzahlung (Einsatz wurde beim Geben abgezogen)
  if (pBJ && !dBJ) { outcome = 'blackjack'; payout = Math.round(bj.bet * 2.5); }
  else if (pVal > 21) { outcome = 'bust'; payout = 0; }
  else if (dBJ) { outcome = 'lose'; payout = 0; }
  else if (dVal > 21) { outcome = 'win'; payout = bj.bet * 2; }
  else if (pVal > dVal) { outcome = 'win'; payout = bj.bet * 2; }
  else if (pVal < dVal) { outcome = 'lose'; payout = 0; }
  else { outcome = 'push'; payout = bj.bet; }
  me.stardust += payout;
  bj.done = true;
  bj.outcome = outcome;
  socket.emit('bj-state', { player: bj.player, dealer: bj.dealer, pVal, dVal, done: true, reveal: true, bet: bj.bet });
  socket.emit('bj-result', { outcome, payout, bet: bj.bet, stardust: me.stardust, pVal, dVal });
  socket.emit('stardust', { value: me.stardust });
  if (outcome === 'win' || outcome === 'blackjack') grantXp(socket, me, 6);
  recordWin(socket, me, 'blackjack', payout - bj.bet);
  admin.from('profiles').update({ stardust: me.stardust }).eq('id', me.userId).then(() => {}, () => {});
  bjBroadcastLive(socket, me);
}
// ---------------- CASINO-BESTENLISTE ----------------
const GAME_NAMES = { slot: 'Slots', wheel: 'Lucky Wheel', blackjack: 'Blackjack', plinko: 'Plinko', roulette: 'Roulette' };
const recentWins = []; // Live-Feed der letzten großen Gewinne (Speicher)
function recordWin(socket, me, game, net) {
  if (!me || !(net > 0)) return;
  if (net >= 1000) {
    recentWins.unshift({ name: me.name, color: me.color, game, net, t: Date.now() });
    if (recentWins.length > 10) recentWins.pop();
    io.emit('casino-feed', { rows: recentWins });
  }
  if (net > (me.casinoBest || 0)) {
    me.casinoBest = net;
    me.casinoBestGame = game;
    socket.emit('casino-best', { best: net, game });
    admin.from('profiles').update({ casino_best: net }).eq('id', me.userId).then(() => {}, () => {});
    admin.from('profiles').update({ casino_best_game: game }).eq('id', me.userId).then(() => {}, () => {});
    if (net >= 5000) io.emit('system', '🏆 ' + me.name + ' stellt mit ' + net + ' Sternenstaub bei ' + (GAME_NAMES[game] || game) + ' einen neuen Rekord auf!');
  }
}

function bjBroadcastLive(socket, me) {  if (me.bjTable == null) return;
  const bj = me.bj;
  const dealer = bj ? (bj.done ? bj.dealer : [bj.dealer[0], { hidden: true }]) : [];
  io.emit('bj-live', {
    id: socket.id, table: me.bjTable, name: me.name, color: me.color,
    dealer, player: bj ? bj.player : [],
    pVal: bj ? bjHand(bj.player) : 0,
    dVal: (bj && bj.done) ? bjHand(bj.dealer) : null,
    done: bj ? bj.done : false, outcome: bj ? bj.outcome : null,
    active: !!bj && !bj.done
  });
}
function bjLeave(socket) {
  const me = players[socket.id]; if (!me) return;
  if (me.bj && !me.bj.done) bjSettle(socket, me); // faire Abrechnung statt verfallenem Einsatz
  if (me.bjTable != null) io.emit('bj-live-clear', { id: socket.id });
  me.bjTable = null; me.bj = null;
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
