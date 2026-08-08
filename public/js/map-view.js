import { $, t, myRoom, getMe, goToRoom } from './core.js';
import { roundRect } from './render-utils.js';
import { ROOMS, VIP_LEVEL } from './data/rooms.js';

const ICONS = { deck:'🛰️', obs:'🔭', casino:'🎰', vip:'💎' };
// Stilisierter Grundriss: Positionen im Canvas-Koordinatensystem (340x260), Reihenfolge = echte Tür-Topologie
const NODES = [
  { id:'obs',    x:66,  y:186, r:34 },
  { id:'deck',   x:150, y:90,  r:40 },
  { id:'casino', x:238, y:186, r:36 },
  { id:'vip',    x:302, y:96,  r:30 }
];
const MW=340, MH=260;

let mapG=null, mapRAF=null, mapStars=null, hoverId=null;

function isVipUnlocked(){const me=getMe();return me&&(me.level||1)>=VIP_LEVEL;}

function nodeAt(x,y){
  for(const n of NODES){if(Math.hypot(x-n.x,y-n.y)<n.r)return n;}
  return null;
}

function drawMap(){
  const g=mapG;if(!g)return;
  g.clearRect(0,0,MW,MH);
  // Sternenfeld-Hintergrund
  const bg=g.createLinearGradient(0,0,0,MH);bg.addColorStop(0,'#150f3d');bg.addColorStop(1,'#0a0725');
  g.fillStyle=bg;g.fillRect(0,0,MW,MH);
  if(!mapStars){mapStars=[];for(let i=0;i<60;i++)mapStars.push({x:Math.random()*MW,y:Math.random()*MH,r:Math.random()*1.4+.3,t:Math.random()*6});}
  const now=performance.now()/1000;
  for(const s of mapStars){const a=.3+.4*Math.abs(Math.sin(now*.6+s.t));g.fillStyle='rgba(220,226,255,'+a+')';g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill();}
  // Grundriss-Gitter (Blaupausen-Look)
  g.strokeStyle='rgba(122,180,255,.08)';g.lineWidth=1;
  for(let x=0;x<MW;x+=20){g.beginPath();g.moveTo(x,0);g.lineTo(x,MH);g.stroke();}
  for(let y=0;y<MH;y+=20){g.beginPath();g.moveTo(0,y);g.lineTo(MW,y);g.stroke();}

  // Gepunktete Wege zwischen den Räumen
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2.5;g.setLineDash([6,7]);
  for(let i=0;i<NODES.length-1;i++){
    g.beginPath();g.moveTo(NODES[i].x,NODES[i].y);g.lineTo(NODES[i+1].x,NODES[i+1].y);g.stroke();}
  g.setLineDash([]);

  const here=myRoom();
  for(const n of NODES){
    const room=ROOMS[n.id];
    const locked=n.id==='vip'&&!isVipUnlocked();
    const hovered=hoverId===n.id;
    const you=here===n.id;
    const R=n.r+(hovered?3:0);

    if(you){ // pulsierender "Du bist hier"-Ring
      const p=1+Math.sin(now*3)*.08;
      g.strokeStyle='#ffd166';g.lineWidth=3;g.globalAlpha=.8;
      g.beginPath();g.arc(n.x,n.y,R*1.28*p,0,7);g.stroke();g.globalAlpha=1;
    }
    // Raum-Blase
    g.fillStyle=locked?'#463a63':(room?room.accent:'#7be0b0');
    g.globalAlpha=locked?.55:1;
    g.beginPath();g.arc(n.x,n.y,R,0,7);g.fill();
    g.strokeStyle='#fff';g.lineWidth=3;g.stroke();
    g.globalAlpha=1;
    // Icon
    g.font=(R*0.85)+'px serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText(locked?'🔒':(ICONS[n.id]||'❔'),n.x,n.y+1);
    g.textBaseline='alphabetic';
    // Label-Schild
    const label=t('room_'+n.id),tw=g.measureText(label).width;
    g.font='700 11px Fredoka';const tw2=g.measureText(label).width;
    const ly=n.y+R+16;
    g.fillStyle='rgba(21,15,61,.85)';g.strokeStyle=locked?'#7a6f9c':'#fff';g.lineWidth=2;
    roundRect(g,n.x-tw2/2-8,ly-13,tw2+16,20,10);g.fill();g.stroke();
    g.fillStyle=locked?'#b3a8d6':'#fff';g.fillText(label,n.x,ly+2);
  }
}

function mapLoop(){
  if($('map').style.display==='none'){mapRAF=null;return;}
  drawMap();
  mapRAF=requestAnimationFrame(mapLoop);
}

export function renderMap(){
  if(!mapG){
    const c=$('mapCanvas'),dpr=Math.min(devicePixelRatio||1,3);
    c.width=MW*dpr;c.height=MH*dpr;mapG=c.getContext('2d');mapG.setTransform(dpr,0,0,dpr,0,0);
  }
  if(!mapRAF)mapLoop();
}

export function initMapDom(){
  const c=$('mapCanvas');
  const posFromEvent=(e)=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(MW/r.width),y:(e.clientY-r.top)*(MH/r.height)};};
  c.addEventListener('pointermove',e=>{const p=posFromEvent(e);const n=nodeAt(p.x,p.y);const id=n?n.id:null;
    hoverId=id;c.style.cursor=id?'pointer':'default';});
  c.addEventListener('pointerleave',()=>{hoverId=null;});
  c.addEventListener('click',e=>{
    const p=posFromEvent(e);const n=nodeAt(p.x,p.y);if(!n)return;
    if(n.id==='vip'&&!isVipUnlocked())return;
    goToRoom(n.id);$('map').style.display='none';
  });
  $('mapBtn').onclick=()=>{$('map').style.display='flex';renderMap();};
  $('mclose').onclick=()=>$('map').style.display='none';
  $('map').onclick=e=>{if(e.target.id==='map')$('map').style.display='none';};
}
