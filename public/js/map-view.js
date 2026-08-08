import { $, t, myRoom, getMe, goToRoom } from './core.js';
import { ROOMS, VIP_LEVEL } from './data/rooms.js';

const ICONS = { deck:'🛰️', obs:'🔭', casino:'🎰', vip:'💎' };
const MW=1040, MH=540;

// Echter Deck-Grundriss: jeder Raum hat eine eigene Form + Bounding-Box (fuer Klicks),
// verbunden durch einen Korridor entlang der echten Tuer-Topologie (Aussichtsdeck-Hauptdeck-Casino-VIP).
const NODES = [
  { id:'obs',    shape:'dome',     x0:40,  y0:230, w:220, h:180 },
  { id:'deck',   shape:'hex',      x0:300, y0:90,  w:300, h:250 },
  { id:'casino', shape:'chamfer',  x0:650, y0:250, w:260, h:190 },
  { id:'vip',    shape:'vault',    x0:890, y0:160, w:140, h:140 }
];
const CORRIDORS = [ [0,1], [1,2], [2,3] ]; // Indizes in NODES

let mapG=null, mapRAF=null, mapStars=null, hoverId=null;

function isVipUnlocked(){const me=getMe();return me&&(me.level||1)>=VIP_LEVEL;}
function center(n){return {x:n.x0+n.w/2, y:n.y0+n.h/2};}
function inBox(n,px,py){return px>=n.x0&&px<=n.x0+n.w&&py>=n.y0&&py<=n.y0+n.h;}
function nodeAt(px,py){for(const n of NODES){if(inBox(n,px,py))return n;}return null;}

function roomOutline(g,n){
  const {x0,y0,w,h}=n;
  g.beginPath();
  if(n.shape==='hex'){
    const cut=w*0.16;
    g.moveTo(x0+cut,y0);g.lineTo(x0+w-cut,y0);g.lineTo(x0+w,y0+h/2);
    g.lineTo(x0+w-cut,y0+h);g.lineTo(x0+cut,y0+h);g.lineTo(x0,y0+h/2);g.closePath();
  } else if(n.shape==='dome'){
    const r=Math.min(w,h)*0.42;
    g.moveTo(x0,y0+h*0.5);
    g.arcTo(x0,y0,x0+w/2,y0,r);
    g.arcTo(x0+w,y0,x0+w,y0+h*0.5,r);
    g.lineTo(x0+w,y0+h-18);g.arcTo(x0+w,y0+h,x0+w-18,y0+h,18);
    g.lineTo(x0+18,y0+h);g.arcTo(x0,y0+h,x0,y0+h-18,18);
    g.closePath();
  } else if(n.shape==='chamfer'){
    const cut=w*0.2;
    g.moveTo(x0+16,y0);g.arcTo(x0,y0,x0,y0+16,16);
    g.lineTo(x0,y0+h-16);g.arcTo(x0,y0+h,x0+16,y0+h,16);
    g.lineTo(x0+w,y0+h);g.lineTo(x0+w,y0+cut);g.lineTo(x0+w-cut,y0);g.closePath();
  } else { // vault: gerundetes Rechteck
    const r=20;
    g.moveTo(x0+r,y0);g.lineTo(x0+w-r,y0);g.arcTo(x0+w,y0,x0+w,y0+r,r);
    g.lineTo(x0+w,y0+h-r);g.arcTo(x0+w,y0+h,x0+w-r,y0+h,r);
    g.lineTo(x0+r,y0+h);g.arcTo(x0,y0+h,x0,y0+h-r,r);
    g.lineTo(x0,y0+r);g.arcTo(x0,y0,x0+r,y0,r);g.closePath();
  }
}

function drawCorridor(g,a,b,now){
  const ca=center(a),cb=center(b);
  const dx=cb.x-ca.x,dy=cb.y-ca.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,px=-uy,py=ux;
  const half=22;
  const ax=ca.x+ux*(a.w*0.36),ay=ca.y+uy*(a.h*0.36);
  const bx=cb.x-ux*(b.w*0.36),by=cb.y-uy*(b.h*0.36);
  g.fillStyle='#1c1642';g.strokeStyle='rgba(122,180,255,.4)';g.lineWidth=2;
  g.beginPath();
  g.moveTo(ax+px*half,ay+py*half);g.lineTo(bx+px*half,by+py*half);
  g.lineTo(bx-px*half,by-py*half);g.lineTo(ax-px*half,ay-py*half);g.closePath();
  g.fill();g.stroke();
  // Bodenpaneele quer zum Korridor
  const segLen=Math.hypot(bx-ax,by-ay),steps=Math.max(2,Math.floor(segLen/26));
  g.strokeStyle='rgba(122,180,255,.22)';g.lineWidth=1.5;
  for(let i=1;i<steps;i++){const t2=i/steps,mx=ax+(bx-ax)*t2,my=ay+(by-ay)*t2;
    g.beginPath();g.moveTo(mx+px*half*0.85,my+py*half*0.85);g.lineTo(mx-px*half*0.85,my-py*half*0.85);g.stroke();}
  // Laufende Lichtpulse zur Zielrichtung
  const pulse=(now/900)%1;
  const lx=ax+(bx-ax)*pulse,ly=ay+(by-ay)*pulse;
  g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(lx,ly,3.2,0,7);g.fill();
}

function drawRoom(g,n,now){
  const room=ROOMS[n.id];
  const accent=room?room.accent:'#7be0b0';
  const locked=n.id==='vip'&&!isVipUnlocked();
  const here=myRoom()===n.id;
  const hovered=hoverId===n.id;
  const {x:cx,y:cy}=center(n);

  if(here){ // pulsierender Rahmen "Du bist hier"
    const p=1+Math.sin(now/300)*.03;
    g.save();g.translate(cx,cy);g.scale(p,p);g.translate(-cx,-cy);
    roomOutline(g,n);g.strokeStyle='#ffd166';g.lineWidth=6;g.globalAlpha=.7;g.stroke();g.globalAlpha=1;
    g.restore();
  }

  roomOutline(g,n);
  const grad=g.createLinearGradient(n.x0,n.y0,n.x0,n.y0+n.h);
  grad.addColorStop(0,locked?'#2c2540':shade(accent,-140));
  grad.addColorStop(1,locked?'#181334':shade(accent,-170));
  g.fillStyle=grad;g.fill();
  g.strokeStyle=hovered&&!locked?'#fff':accent;g.lineWidth=hovered&&!locked?4:3;g.stroke();

  // Bodenraster im Raum (Blaupausen-Look)
  g.save();roomOutline(g,n);g.clip();
  g.strokeStyle=accent+'22';g.lineWidth=1;
  for(let gx=n.x0;gx<n.x0+n.w;gx+=22){g.beginPath();g.moveTo(gx,n.y0);g.lineTo(gx,n.y0+n.h);g.stroke();}
  for(let gy=n.y0;gy<n.y0+n.h;gy+=22){g.beginPath();g.moveTo(n.x0,gy);g.lineTo(n.x0+n.w,gy);g.stroke();}
  g.restore();

  // Icon
  g.font='40px serif';g.textAlign='center';g.textBaseline='middle';g.globalAlpha=locked?.5:1;
  g.fillText(locked?'🔒':(ICONS[n.id]||'❔'),cx,cy-10);
  g.globalAlpha=1;g.textBaseline='alphabetic';

  // Namensschild
  const label=t('room_'+n.id),tw=g.measureText(label).width;
  g.font='800 15px Fredoka';const tw2=g.measureText(label).width;
  const ly=n.y0+n.h-22;
  g.fillStyle='rgba(10,7,28,.88)';g.strokeStyle=locked?'#5a4f7a':accent;g.lineWidth=2;
  const bw=tw2+22,bx2=cx-bw/2;
  g.beginPath();g.moveTo(bx2+9,ly-12);g.lineTo(bx2+bw-9,ly-12);g.arcTo(bx2+bw,ly-12,bx2+bw,ly-3,9);
  g.lineTo(bx2+bw,ly+9);g.arcTo(bx2+bw,ly+16,bx2+bw-9,ly+16,9);g.lineTo(bx2+9,ly+16);
  g.arcTo(bx2,ly+16,bx2,ly+7,9);g.lineTo(bx2,ly-3);g.arcTo(bx2,ly-12,bx2+9,ly-12,9);g.closePath();
  g.fill();g.stroke();
  g.fillStyle=locked?'#b3a8d6':'#fff';g.fillText(label,cx,ly+3);

  if(locked){
    g.font='700 11px Fredoka';g.fillStyle='#ff9db5';g.textAlign='center';
    g.fillText(t('holo_locked',{level:VIP_LEVEL}),cx,n.y0+n.h+18);
  }
}

function shade(hex,amt){const n=parseInt(hex.slice(1),16);const cl=(v)=>Math.max(0,Math.min(255,v));
  const r=cl((n>>16)+amt),g2=cl(((n>>8)&255)+amt),b=cl((n&255)+amt);return`rgb(${r},${g2},${b})`;}

function drawFrame(g){
  const pad=14,len=34;
  g.strokeStyle='rgba(122,180,255,.55)';g.lineWidth=3;
  [[pad,pad,1,1],[MW-pad,pad,-1,1],[pad,MH-pad,1,-1],[MW-pad,MH-pad,-1,-1]].forEach(([x,y,dx,dy])=>{
    g.beginPath();g.moveTo(x,y+len*dy);g.lineTo(x,y);g.lineTo(x+len*dx,y);g.stroke();
  });
  g.font='700 12px Fredoka';g.fillStyle='rgba(200,220,255,.55)';g.textAlign='left';
  g.fillText('NEBULA STATION — DECKPLAN',pad+8,pad+22);
  g.textAlign='right';g.fillText('SEKTOR 1 / 1',MW-pad-8,MH-pad-10);
}

function drawMap(){
  const g=mapG;if(!g)return;
  const now=performance.now();
  g.clearRect(0,0,MW,MH);
  const bg=g.createLinearGradient(0,0,0,MH);bg.addColorStop(0,'#150f3d');bg.addColorStop(1,'#08051f');
  g.fillStyle=bg;g.fillRect(0,0,MW,MH);
  if(!mapStars){mapStars=[];for(let i=0;i<110;i++)mapStars.push({x:Math.random()*MW,y:Math.random()*MH,r:Math.random()*1.5+.3,t:Math.random()*6});}
  for(const s of mapStars){const a=.25+.4*Math.abs(Math.sin(now/1000+s.t));g.fillStyle='rgba(220,226,255,'+a+')';g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill();}
  g.strokeStyle='rgba(122,180,255,.06)';g.lineWidth=1;
  for(let x=0;x<MW;x+=28){g.beginPath();g.moveTo(x,0);g.lineTo(x,MH);g.stroke();}
  for(let y=0;y<MH;y+=28){g.beginPath();g.moveTo(0,y);g.lineTo(MW,y);g.stroke();}

  for(const [ai,bi] of CORRIDORS)drawCorridor(g,NODES[ai],NODES[bi],now);
  for(const n of NODES)drawRoom(g,n,now);
  drawFrame(g);
}

function mapLoop(){
  if($('map').style.display==='none'){mapRAF=null;return;}
  drawMap();
  mapRAF=requestAnimationFrame(mapLoop);
}

function fitCanvasCss(c){
  const cardWidth=c.parentElement.getBoundingClientRect().width||MW;
  const displayWidth=Math.min(cardWidth,MW);
  c.style.width=displayWidth+'px';
  c.style.height=(displayWidth*(MH/MW))+'px';
}

export function renderMap(){
  const c=$('mapCanvas');
  if(!mapG){
    const dpr=Math.min(devicePixelRatio||1,2);
    c.width=MW*dpr;c.height=MH*dpr;mapG=c.getContext('2d');mapG.setTransform(dpr,0,0,dpr,0,0);
  }
  fitCanvasCss(c);
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
  addEventListener('resize',()=>{if($('map').style.display!=='none')fitCanvasCss(c);});
  $('mapBtn').onclick=()=>{$('map').style.display='flex';renderMap();};
  $('mclose').onclick=()=>$('map').style.display='none';
  $('map').onclick=e=>{if(e.target.id==='map')$('map').style.display='none';};
}
