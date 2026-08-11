import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, BALL_R=7, GRAVITY=480;
const WALL_L=20, WALL_R=280, WALL_T=20, DRAIN_Y=475;
const BUMPERS=[{x:110,y:150,r:16},{x:190,y:150,r:16},{x:150,y:212,r:16}];
const DEG=Math.PI/180;
const FLIP_L={pivot:{x:95,y:430},len:48,rest:70*DEG,active:-35*DEG,angle:70*DEG,held:false};
const FLIP_R={pivot:{x:205,y:430},len:48,rest:110*DEG,active:215*DEG,angle:110*DEG,held:false};
const FLIP_SPEED=16;
// Seiten-Leitwaende: fuehren den Ball von den Aussenwaenden zur Mitte, damit er NUR noch
// in der Luecke zwischen den beiden Flippern durchfallen kann, nicht mehr an den Seiten vorbei.
// Bewusst kurz und tief gehalten (nur knapp oberhalb der Flipper), damit sie nicht in die
// Startbahn des Balls hineinragen und ihn dort schon abfangen, bevor er die Bumper erreicht.
const GUIDES=[
  {a:{x:WALL_L,y:415},b:{x:86,y:432}},
  {a:{x:WALL_R,y:415},b:{x:214,y:432}}
];

let stG=null, stRAF=null, stLast=0, phase='play';
let ball=null, score=0, balls=3, bumperFlash=[0,0,0], tiltT=0, tiltPresses=[], newBallT=0;
let stNewRecord=false, stBest=0, entryOpen=true, stuckT=0;
// Hoehe, ab der die Einschuss-Luecke in der rechten Leitwand wieder schliesst: der Ball
// startet direkt neben dieser Wand (x:265,y:430) und wuerde sonst sofort beim Start an ihr
// abprallen. Die Luecke bleibt nur offen, bis der Ball diese Zone nach oben verlassen hat,
// und geht bei jedem neuen Ball (Start & nach Ballverlust) automatisch wieder auf.
const ENTRY_CLEAR_Y=400;

function launchBall(){
  // Startwinkel/-tempo bewusst so gewaehlt, dass die Flugbahn zuverlaessig durch den
  // Bumper-Cluster fuehrt (analytisch gegen die Bumper-Positionen geprueft), statt
  // einfach leer am Spielfeld hochzufliegen und wieder abzufallen.
  ball={x:265,y:430,vx:-90,vy:-500,inPlay:true};
  entryOpen=true;stuckT=0;
}
function reset(){
  score=0;balls=3;bumperFlash=[0,0,0];tiltT=0;tiltPresses=[];newBallT=0;stNewRecord=false;
  FLIP_L.angle=FLIP_L.rest;FLIP_R.angle=FLIP_R.rest;FLIP_L.held=false;FLIP_R.held=false;
  launchBall();
}
export function openStarTilt(){
  const c=$('startiltCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;stG=c.getContext('2d');stG.setTransform(dpr,0,0,dpr,0,0);
  reset();phase='play';
  $('startiltfoot').textContent=t('startilt_controls');
  $('startilt').style.display='flex';setLocked(true);stLast=performance.now();if(!stRAF)stLoop();
}
function closeStarTilt(){$('startilt').style.display='none';if(stRAF)cancelAnimationFrame(stRAF);stRAF=null;setLocked(false);}
function gameOver(){
  phase='over';
  const gained=Math.min(500,Math.round(score/12));
  socket&&socket.emit('startilt-score',{score});
  showPopup('🪩',t('popup_startilt_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('startiltfoot').innerHTML='<button class="betb" id="startiltagain">🔁 '+t('btn_again')+'</button><button class="betb" id="startiltboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="startiltexit">'+t('btn_exit')+'</button>';
  const a=$('startiltagain'),x=$('startiltexit'),b=$('startiltboard');
  if(a)a.onclick=()=>openStarTilt();
  if(x)x.onclick=closeStarTilt;
  if(b)b.onclick=openStarTiltBoard;
}
function stLoop(){
  const now=performance.now(),dt=Math.min((now-stLast)/1000,.05);stLast=now;
  if($('startilt').style.display==='none'){stRAF=null;return;}
  if(phase==='play')updateStarTilt(dt);
  drawStarTilt(now);
  stRAF=requestAnimationFrame(stLoop);
}
function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  let tt=len2>0?((px-ax)*dx+(py-ay)*dy)/len2:0;tt=Math.max(0,Math.min(1,tt));
  const cx=ax+dx*tt,cy=ay+dy*tt;
  return {dist:Math.hypot(px-cx,py-cy),cx,cy};
}
function stepFlipper(fl,dt){
  const target=(fl.held&&tiltT<=0)?fl.active:fl.rest;
  const diff=target-fl.angle;
  const maxStep=FLIP_SPEED*dt;
  if(Math.abs(diff)<=maxStep)fl.angle=target;else fl.angle+=Math.sign(diff)*maxStep;
}
function guideHit(seg){
  const {dist,cx,cy}=segDist(ball.x,ball.y,seg.a.x,seg.a.y,seg.b.x,seg.b.y);
  if(dist>=BALL_R+4)return;
  const nx=(ball.x-cx)/(dist||1),ny=(ball.y-cy)/(dist||1);
  ball.x=cx+nx*(BALL_R+4);ball.y=cy+ny*(BALL_R+4);
  const dot=ball.vx*nx+ball.vy*ny;
  ball.vx-=2*dot*nx*0.65;ball.vy-=2*dot*ny*0.65;
}
function flipperHit(fl,active){
  const tipX=fl.pivot.x+Math.cos(fl.angle)*fl.len, tipY=fl.pivot.y+Math.sin(fl.angle)*fl.len;
  const {dist,cx,cy}=segDist(ball.x,ball.y,fl.pivot.x,fl.pivot.y,tipX,tipY);
  if(dist>=BALL_R+7)return false;
  const nx=(ball.x-cx)/(dist||1),ny=(ball.y-cy)/(dist||1);
  ball.x=cx+nx*(BALL_R+7);ball.y=cy+ny*(BALL_R+7);
  if(active){ball.vx=(nx*0.5+(fl===FLIP_L?0.5:-0.5))*380;ball.vy=-420;score+=5;}
  else{const dot=ball.vx*nx+ball.vy*ny;ball.vx-=2*dot*nx*0.6;ball.vy-=2*dot*ny*0.6;}
  return true;
}
function updateStarTilt(dt){
  if(tiltT>0){tiltT-=dt;}
  stepFlipper(FLIP_L,dt);stepFlipper(FLIP_R,dt);
  for(let i=0;i<bumperFlash.length;i++)if(bumperFlash[i]>0)bumperFlash[i]-=dt;
  if(newBallT>0){newBallT-=dt;if(newBallT<=0)launchBall();return;}
  if(!ball)return;
  ball.vy+=GRAVITY*dt;
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  const sp=Math.hypot(ball.vx,ball.vy);
  if(sp>560){ball.vx=ball.vx/sp*560;ball.vy=ball.vy/sp*560;}
  if(ball.x<WALL_L+BALL_R){ball.x=WALL_L+BALL_R;ball.vx=Math.abs(ball.vx)*0.7;}
  if(ball.x>WALL_R-BALL_R){ball.x=WALL_R-BALL_R;ball.vx=-Math.abs(ball.vx)*0.7;}
  if(ball.y<WALL_T+BALL_R){ball.y=WALL_T+BALL_R;ball.vy=Math.abs(ball.vy)*0.7;}
  for(let i=0;i<BUMPERS.length;i++){
    const b=BUMPERS[i],d=Math.hypot(ball.x-b.x,ball.y-b.y);
    if(d<BALL_R+b.r){
      const nx=(ball.x-b.x)/(d||1),ny=(ball.y-b.y)/(d||1);
      ball.x=b.x+nx*(BALL_R+b.r);ball.y=b.y+ny*(BALL_R+b.r);
      ball.vx=nx*300;ball.vy=ny*300-60;
      score+=50;bumperFlash[i]=0.3;
    }
  }
  flipperHit(FLIP_L,FLIP_L.held&&tiltT<=0&&FLIP_L.angle<FLIP_L.rest-0.3);
  flipperHit(FLIP_R,FLIP_R.held&&tiltT<=0&&FLIP_R.angle>FLIP_R.rest+0.3);
  if(entryOpen&&ball.y<ENTRY_CLEAR_Y)entryOpen=false;
  for(const seg of GUIDES){if(seg===GUIDES[1]&&entryOpen)continue;guideHit(seg);}
  // Notausstieg gegen seltene Ruhekontakt-Faelle (Ball klemmt sich z.B. genau zwischen
  // Leitwand und Flipper-Drehpunkt fest und bewegt sich effektiv nicht mehr von der
  // Stelle): nach kurzer Standzeit wird er aktiv von der naeheren Seitenwand weggestossen.
  if(Math.hypot(ball.vx,ball.vy)<15){stuckT+=dt;if(stuckT>1.2){ball.vx+=ball.x<(WALL_L+WALL_R)/2?90:-90;ball.vy-=220;stuckT=0;}}
  else stuckT=0;
  if(ball.y>DRAIN_Y){
    ball=null;balls--;
    if(balls<=0){gameOver();}
    else newBallT=1.1;
  }
}
function pressFlipper(fl,side){
  if(fl.held)return;fl.held=true;
  if(tiltT>0)return;
  const now=performance.now();
  tiltPresses=tiltPresses.filter(p=>now-p<1000);tiltPresses.push(now);
  if(tiltPresses.length>9){tiltT=1.6;tiltPresses=[];}
}
function drawStarTilt(now){
  const g=stG;
  g.fillStyle='#0c0716';g.fillRect(0,0,W2,H2);
  g.strokeStyle=INK;g.lineWidth=6;g.strokeRect(WALL_L-6,WALL_T-6,WALL_R-WALL_L+12,DRAIN_Y-WALL_T+6);
  g.fillStyle='#cbb8ff';g.font='800 15px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,20);
  g.textAlign='right';g.fillText('🔮'.repeat(Math.max(0,balls)),W2-8,20);
  for(let i=0;i<BUMPERS.length;i++){
    const b=BUMPERS[i],hot=bumperFlash[i]>0;
    g.fillStyle=hot?'#ffe15e':'#b467ff';g.strokeStyle=INK;g.lineWidth=3;
    g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill();g.stroke();
    g.fillStyle=hot?'#fff8d0':'#e2c6ff';g.beginPath();g.arc(b.x,b.y,b.r*0.5,0,7);g.fill();
  }
  g.strokeStyle='#8891a3';g.lineWidth=6;g.lineCap='round';
  for(const seg of GUIDES){if(seg===GUIDES[1]&&entryOpen)continue;g.beginPath();g.moveTo(seg.a.x,seg.a.y);g.lineTo(seg.b.x,seg.b.y);g.stroke();}
  g.strokeStyle=INK;g.lineWidth=2;
  for(const seg of GUIDES){if(seg===GUIDES[1]&&entryOpen)continue;g.beginPath();g.moveTo(seg.a.x,seg.a.y);g.lineTo(seg.b.x,seg.b.y);g.stroke();}
  for(const fl of [FLIP_L,FLIP_R]){
    const tipX=fl.pivot.x+Math.cos(fl.angle)*fl.len,tipY=fl.pivot.y+Math.sin(fl.angle)*fl.len;
    g.strokeStyle=tiltT>0?'#5a4a6a':'#7be0b0';g.lineWidth=13;g.lineCap='round';
    g.beginPath();g.moveTo(fl.pivot.x,fl.pivot.y);g.lineTo(tipX,tipY);g.stroke();
    g.strokeStyle=INK;g.lineWidth=2;g.stroke();
  }
  if(ball){g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(ball.x,ball.y,BALL_R,0,7);g.fill();g.stroke();}
  if(tiltT>0){g.fillStyle='#ff5ea8';g.font='800 26px Fredoka';g.textAlign='center';g.globalAlpha=Math.min(1,tiltT);g.fillText(t('startilt_tilt'),W2/2,H2/2);g.globalAlpha=1;}
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#7be0b0';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('startilt_over'),W2/2,H2/2-10);g.fillText(t('startilt_over'),W2/2,H2/2-10);
    if(stNewRecord){g.fillStyle='#ffd166';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+16);}
    else if(stBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+stBest,W2/2,H2/2+16);}
  }
}
function renderStarTiltBoard(rows){const el=$('stlblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('startilt_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🪩 '+(r.startilt_best||0)+'</span>';
    el.appendChild(row);});}
function openStarTiltBoard(){socket&&socket.emit('startilt-leaderboard');$('stlblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('stlb').style.display='flex';}

export function onStarTiltBest(d){stBest=d.best||0;if(d.record)stNewRecord=true;}
export function onStarTiltLeaderboardData(d){renderStarTiltBoard(d.rows||[]);}

export function initStarTiltDom(){
  addEventListener('keydown',e=>{
    if($('startilt').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','a','d'].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')pressFlipper(FLIP_L,'l');
    else if(k==='arrowright'||k==='d')pressFlipper(FLIP_R,'r');
  });
  addEventListener('keyup',e=>{
    if(!e.key)return;const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a')FLIP_L.held=false;
    else if(k==='arrowright'||k==='d')FLIP_R.held=false;
  });
  $('startiltclose').onclick=closeStarTilt;
  $('stlbclose').onclick=()=>$('stlb').style.display='none';
  $('stlb').onclick=e=>{if(e.target.id==='stlb')$('stlb').style.display='none';};
}
