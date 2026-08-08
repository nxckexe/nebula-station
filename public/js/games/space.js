import { $, t, addMsg, showPopup, setLocked, getMe, drawAvatarPreview } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl, clamp, esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

export const SHIP_OBJ={x:840,y:495,r:56};

let pendingBoard=false;
let spaceRAF=null,spaceG=null,spacePhase='boarding',spaceT=0,spaceLast=0,spaceStars=null,spacePointer=null;
let ship={x:210,y:340},aster=[],dust=[],spSpeed=1,spDist=0,spColl=0,spSpawn=0,spDustSpawn=0;
let spaceBest=0,spaceNewRecord=false;
const spaceKeys={};

export function requestBoard(){const me=getMe();if(!me)return;setLocked(true);me.tx=clamp(SHIP_OBJ.x,80,1040-80);me.ty=clamp(SHIP_OBJ.y+64,250,620-40);pendingBoard=true;addMsg('','',t('msg_going_to_capsule'),'sys');}
export function checkBoardArrival(me){
  if(pendingBoard&&Math.hypot(me.x-me.tx,me.y-me.ty)<10){pendingBoard=false;openSpace();}
}
export function openSpace(){const c=$('spaceCanvas'),dpr=Math.min(devicePixelRatio||1,2);c.width=420*dpr;c.height=470*dpr;spaceG=c.getContext('2d');spaceG.setTransform(dpr,0,0,dpr,0,0);
  spacePhase='boarding';spaceT=0;spaceStars=[];for(let i=0;i<70;i++)spaceStars.push({a:Math.random()*6.28,r:Math.random()*300,sp:40+Math.random()*140});
  $('spacefoot').textContent='Einsteigen…';$('space').style.display='flex';setLocked(true);spaceLast=performance.now();if(!spaceRAF)spaceLoop();}
function closeSpace(){$('space').style.display='none';if(spaceRAF)cancelAnimationFrame(spaceRAF);spaceRAF=null;setLocked(false);}
function spaceStart(){spacePhase='play';ship={x:210,y:350};aster=[];dust=[];spSpeed=1;spDist=0;spColl=0;spSpawn=0.6;spDustSpawn=0.4;$('spacefoot').textContent=t('space_controls');}
function spaceGameOver(){spacePhase='over';spaceNewRecord=false;socket&&socket.emit('space-score',{collected:spColl,dist:spDist});
  showPopup('🛸',t('popup_crash_title'),t('amount_stardust',{amount:spColl}),'gold');
  $('spacefoot').innerHTML='<button class="betb" id="spaceagain">🚀 Nochmal</button><button class="betb" id="spaceboard">🏆 Rekorde</button><button class="betb" id="spaceexit">Aussteigen</button>';
  const a=$('spaceagain'),x=$('spaceexit'),b=$('spaceboard');if(a)a.onclick=()=>{spacePhase='boarding';spaceT=0;$('spacefoot').textContent='Einsteigen…';};if(x)x.onclick=closeSpace;if(b)b.onclick=openSpaceBoard;}
function spaceLoop(){const now=performance.now(),dt=Math.min((now-spaceLast)/1000,.05);spaceLast=now;
  if($('space').style.display==='none'){spaceRAF=null;return;}
  const g=spaceG,W2=420,H2=470;g.fillStyle='#060418';g.fillRect(0,0,W2,H2);
  const cxp=W2/2,cyp=175;
  for(const s of spaceStars){s.r+=s.sp*dt*(spacePhase==='play'?(1+spSpeed*0.5):1);if(s.r>340){s.r=Math.random()*30;s.a=Math.random()*6.28;}
    const x1=cxp+Math.cos(s.a)*s.r,y1=cyp+Math.sin(s.a)*s.r*.85,x2=cxp+Math.cos(s.a)*(s.r-9),y2=cyp+Math.sin(s.a)*(s.r-9)*.85;
    g.strokeStyle='rgba(200,220,255,'+Math.min(1,s.r/300)+')';g.lineWidth=Math.max(1,s.r/130);g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
  if(spacePhase==='boarding')drawBoarding(g,dt,W2);
  else if(spacePhase==='play')playSpace(g,dt,W2,H2);
  else drawSpaceOver(g,W2,H2);
  drawCockpit(g,W2,H2);
  spaceRAF=requestAnimationFrame(spaceLoop);}
function drawBoarding(g,dt,W2){spaceT+=dt;const t=spaceT,cx=210,cy=250;
  g.fillStyle='#cfd8f2';g.strokeStyle=INK;g.lineWidth=4;roundRectImpl(g,cx-58,cy-18,116,78,22);g.fill();g.stroke();
  const slide=Math.min(1,t/0.9),ax=cx+90-90*slide,ay=cy+18;
  const me=getMe();
  const fake={species:(me&&me.species)||'blobbi',color:(me&&me.color)||'#4dd0ff',acc:(me&&me.acc)||'none',face:-1,step:0,expr:t>1?'happy':'wow'};
  drawAvatarPreview(g,fake,ax,ay);
  const close=Math.max(0,Math.min(1,(t-1.0)/0.7));
  g.fillStyle='rgba(120,200,255,'+(0.22+0.32*close)+')';g.strokeStyle=INK;g.lineWidth=4;
  g.beginPath();g.ellipse(cx,cy-2,62,42*close+2,0,Math.PI,0);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(cx-16,cy-14*close-2,10,5*close,-.4,0,7);g.fill();
  if(t>=2.6){spaceStart();return;}
  if(t>1.6){const num=Math.max(1,Math.ceil((2.6-t)/0.34));g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=5;g.font='800 62px Fredoka';g.textAlign='center';g.strokeText(num,210,150);g.fillText(num,210,150);}
  else{g.fillStyle='#cbb8ff';g.font='700 15px Fredoka';g.textAlign='center';g.fillText('Anschnallen…',210,150);}}
function playSpace(g,dt,W2,H2){spDist+=spSpeed*dt*55;spSpeed+=dt*0.05;
  let vx=0,vy=0;if(spaceKeys['arrowleft']||spaceKeys['a'])vx--;if(spaceKeys['arrowright']||spaceKeys['d'])vx++;if(spaceKeys['arrowup']||spaceKeys['w'])vy--;if(spaceKeys['arrowdown']||spaceKeys['s'])vy++;
  if(spacePointer){ship.x+=(spacePointer.x-ship.x)*Math.min(1,dt*11);ship.y+=(spacePointer.y-ship.y)*Math.min(1,dt*11);}
  else{const sp=190;ship.x+=vx*sp*dt;ship.y+=vy*sp*dt;}
  ship.x=clamp(ship.x,44,W2-44);ship.y=clamp(ship.y,150,H2-72);
  spSpawn-=dt;const rate=Math.max(0.28,0.85-spSpeed*0.04);
  if(spSpawn<=0){spSpawn=rate;aster.push({x:60+Math.random()*(W2-120),y:118,size:8,spd:70+spSpeed*28,rot:Math.random()*6,rs:(Math.random()-.5)*4});}
  spDustSpawn-=dt;if(spDustSpawn<=0){spDustSpawn=0.5+Math.random()*0.6;dust.push({x:60+Math.random()*(W2-120),y:118,size:6,spd:80+spSpeed*26});}
  for(const a of aster){a.y+=a.spd*dt;a.size=8+(a.y-118)/(H2-118)*26;a.rot+=a.rs*dt;}
  for(const d of dust){d.y+=d.spd*dt;d.size=6+(d.y-118)/(H2-118)*7;}
  for(const a of aster){if(Math.hypot(a.x-ship.x,a.y-ship.y)<a.size+14){spaceGameOver();return;}}
  dust=dust.filter(d=>{if(Math.hypot(d.x-ship.x,d.y-ship.y)<d.size+16){spColl+=5;return false;}return d.y<H2+20;});
  aster=aster.filter(a=>a.y<H2+40);
  for(const d of dust)drawSpaceDust(g,d);
  for(const a of aster)drawAsteroid(g,a);
  drawShip(g,ship.x,ship.y);
  g.fillStyle='#fff';g.font='700 15px Fredoka';g.textAlign='left';g.fillText('✦ '+spColl,16,140);g.textAlign='right';g.fillText(Math.floor(spDist)+' m',W2-16,140);}
function drawSpaceOver(g,W2,H2){g.fillStyle='rgba(6,4,20,.55)';g.fillRect(0,110,W2,H2-170);
  g.fillStyle='#ff5ea8';g.strokeStyle=INK;g.lineWidth=5;g.font='800 32px Fredoka';g.textAlign='center';g.strokeText('BRUCHLANDUNG',210,225);g.fillText('BRUCHLANDUNG',210,225);
  g.fillStyle='#fff';g.font='700 18px Fredoka';g.fillText('Strecke: '+Math.floor(spDist)+' m',210,262);
  g.fillStyle='#ffd166';g.fillText('+'+spColl+' ✦ gesammelt',210,290);
  if(spaceNewRecord){g.fillStyle='#7be0b0';g.font='800 17px Fredoka';g.fillText('🏆 NEUER REKORD!',210,318);}
  else if(spaceBest>0){g.fillStyle='#bfeaff';g.font='700 15px Fredoka';g.fillText('Rekord: '+spaceBest+' m',210,316);}}
function drawCockpit(g,W2,H2){
  g.strokeStyle='#0b0a1c';g.lineWidth=26;roundRectImpl(g,13,13,W2-26,H2-66,30);g.stroke();
  g.fillStyle='#141a3d';g.fillRect(0,H2-52,W2,52);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(0,H2-52);g.lineTo(W2,H2-52);g.stroke();
  for(let i=0;i<7;i++){g.fillStyle=Math.sin(performance.now()/300+i)>0?'#7be0b0':'#2b6b52';g.beginPath();g.arc(28+i*22,H2-30,5,0,7);g.fill();}
  g.fillStyle='#2b1b52';roundRectImpl(g,W2/2-46,H2-40,92,22,9);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();
  g.fillStyle='#4dd0ff';g.font='700 11px Fredoka';g.textAlign='center';g.fillText('NEBULA-1',W2/2,H2-25);}
function drawShip(g,x,y){g.save();g.translate(x,y);
  g.fillStyle='#ffb14d';g.beginPath();g.moveTo(-5,10);g.lineTo(0,20+Math.random()*7);g.lineTo(5,10);g.closePath();g.fill();
  g.fillStyle='#4dd0ff';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(0,-17);g.lineTo(15,15);g.lineTo(0,8);g.lineTo(-15,15);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(20,26,61,.8)';g.beginPath();g.ellipse(0,-2,5,7,0,0,7);g.fill();g.restore();}
function drawAsteroid(g,a){g.save();g.translate(a.x,a.y);g.rotate(a.rot);g.fillStyle='#7a6f8c';g.strokeStyle=INK;g.lineWidth=3;
  g.beginPath();for(let i=0;i<8;i++){const ang=i/8*6.28,rr=a.size*(0.78+((i*37)%10)/24),px=Math.cos(ang)*rr,py=Math.sin(ang)*rr;i?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.fill();g.stroke();
  g.fillStyle='#5b5570';g.beginPath();g.arc(-a.size*.2,a.size*.1,a.size*.24,0,7);g.fill();g.restore();}
function drawSpaceDust(g,d){g.save();g.translate(d.x,d.y);const gl=g.createRadialGradient(0,0,1,0,0,d.size+7);gl.addColorStop(0,'#fff6c8');gl.addColorStop(1,'transparent');g.fillStyle=gl;g.beginPath();g.arc(0,0,d.size+7,0,7);g.fill();
  g.fillStyle='#ffe15e';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();for(let i=0;i<10;i++){const a=-1.57+i*Math.PI/5,rr=i%2?d.size*.4:d.size,px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.fill();g.stroke();g.restore();}
function setSpacePointer(e){const c=$('spaceCanvas'),r=c.getBoundingClientRect();spacePointer={x:(e.clientX-r.left)*(420/r.width),y:(e.clientY-r.top)*(470/r.height)};}

function renderSpaceBoard(rows){const el=$('sblblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('space_no_flights')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🚀 '+(r.space_best||0)+' m</span>';
    el.appendChild(row);});}
function openSpaceBoard(){socket&&socket.emit('space-leaderboard');$('sblblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('sblb').style.display='flex';}

export function onSpaceBest(d){spaceBest=d.best||0;if(d.record)spaceNewRecord=true;}
export function onSpaceLeaderboardData(d){renderSpaceBoard(d.rows||[]);}

export function initSpaceDom(){
  addEventListener('keydown',e=>{if($('space').style.display==='none'||!e.key)return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){spaceKeys[k]=true;e.preventDefault();}});
  addEventListener('keyup',e=>{if(!e.key)return;spaceKeys[e.key.toLowerCase()]=false;});
  $('spaceCanvas').addEventListener('pointerdown',e=>{if(spacePhase==='play')setSpacePointer(e);});
  $('spaceCanvas').addEventListener('pointermove',e=>{if(spacePointer&&spacePhase==='play')setSpacePointer(e);});
  addEventListener('pointerup',()=>{spacePointer=null;});
  $('spaceclose').onclick=closeSpace;
  $('sblbclose').onclick=()=>$('sblb').style.display='none';
  $('sblb').onclick=e=>{if(e.target.id==='sblb')$('sblb').style.display='none';};
}
