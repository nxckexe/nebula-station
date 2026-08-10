import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl, esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480;
const LANES=4, ROAD_X0=50, ROAD_W=200, LANE_W=ROAD_W/LANES;
const PLAYER_Y=410;
const laneX=i=>ROAD_X0+LANE_W*i+LANE_W/2;

let rG=null, rRAF=null, rLast=0, phase='play';
let player=null, obstacles=[], coins=[], dist=0, speed=140, score=0, spawnT=0, coinT=0, dashOff=0;
let racerNewRecord=false, racerBest=0;
const OBST_COLORS=['#ff5ea8','#31e1ff','#ffb14d','#7be0b0'];

function reset(){
  player={lane:1,x:laneX(1)};
  obstacles=[];coins=[];dist=0;speed=140;score=0;spawnT=0.9;coinT=1.4;dashOff=0;racerNewRecord=false;
}
function moveLane(d){player.lane=Math.max(0,Math.min(LANES-1,player.lane+d));}

export function openRacer(){
  const c=$('racerCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;rG=c.getContext('2d');rG.setTransform(dpr,0,0,dpr,0,0);
  reset();phase='play';
  $('racerfoot').textContent=t('racer_controls');
  $('racer').style.display='flex';setLocked(true);rLast=performance.now();if(!rRAF)rLoop();
}
function closeRacer(){$('racer').style.display='none';if(rRAF)cancelAnimationFrame(rRAF);rRAF=null;setLocked(false);}
function gameOver(){
  phase='over';
  const gained=Math.min(500,Math.round(score/10));
  socket&&socket.emit('racer-score',{score,dist:Math.round(dist)});
  showPopup('🏎️',t('popup_racer_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('racerfoot').innerHTML='<button class="betb" id="raceragain">🔁 '+t('btn_again')+'</button><button class="betb" id="racerboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="racerexit">'+t('btn_exit')+'</button>';
  const a=$('raceragain'),x=$('racerexit'),b=$('racerboard');
  if(a)a.onclick=()=>openRacer();
  if(x)x.onclick=closeRacer;
  if(b)b.onclick=openRacerBoard;
}
function rLoop(){
  const now=performance.now(),dt=Math.min((now-rLast)/1000,.05);rLast=now;
  if($('racer').style.display==='none'){rRAF=null;return;}
  if(phase==='play')updateRacer(dt);
  drawRacer(now);
  rRAF=requestAnimationFrame(rLoop);
}
function updateRacer(dt){
  dist+=speed*dt*0.12;
  speed=Math.min(420,140+dist*0.9);
  score=Math.floor(dist);
  dashOff=(dashOff+speed*dt)%40;
  player.x+=(laneX(player.lane)-player.x)*Math.min(1,dt*10);

  spawnT-=dt;
  if(spawnT<=0){
    spawnT=Math.max(0.45,0.95-dist*0.002);
    const lane=Math.floor(Math.random()*LANES);
    obstacles.push({lane,y:-40,color:OBST_COLORS[Math.floor(Math.random()*OBST_COLORS.length)]});
  }
  coinT-=dt;
  if(coinT<=0){coinT=1.1+Math.random()*0.8;coins.push({lane:Math.floor(Math.random()*LANES),y:-40});}

  for(const o of obstacles)o.y+=speed*dt;
  for(const c of coins)c.y+=speed*dt;
  obstacles=obstacles.filter(o=>o.y<H2+40);
  coins=coins.filter(c=>{
    if(Math.abs(c.y-PLAYER_Y)<22&&c.lane===player.lane){score+=25;return false;}
    return c.y<H2+40;
  });
  for(const o of obstacles){
    if(o.lane===player.lane&&Math.abs(o.y-PLAYER_Y)<24){gameOver();return;}
  }
}
function drawRacer(now){
  const g=rG;
  g.fillStyle='#0c0a16';g.fillRect(0,0,W2,H2);
  g.fillStyle='#141414';g.fillRect(ROAD_X0,0,ROAD_W,H2);
  g.strokeStyle='#ffe15e';g.lineWidth=3;g.setLineDash([18,16]);g.lineDashOffset=-dashOff;
  for(let i=1;i<LANES;i++){g.beginPath();g.moveTo(ROAD_X0+LANE_W*i,0);g.lineTo(ROAD_X0+LANE_W*i,H2);g.stroke();}
  g.setLineDash([]);
  g.strokeStyle='#fff';g.lineWidth=4;
  g.beginPath();g.moveTo(ROAD_X0,0);g.lineTo(ROAD_X0,H2);g.moveTo(ROAD_X0+ROAD_W,0);g.lineTo(ROAD_X0+ROAD_W,H2);g.stroke();
  for(const c of coins){
    const cx=laneX(c.lane);
    g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(cx,c.y,8,0,7);g.fill();g.stroke();
    g.fillStyle='#fff';g.font='700 9px Fredoka';g.textAlign='center';g.fillText('✦',cx,c.y+3);
  }
  for(const o of obstacles){
    const cx=laneX(o.lane);
    g.fillStyle=o.color;g.strokeStyle=INK;g.lineWidth=3;
    roundRectImpl(g,cx-16,o.y-22,32,44,8);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.4)';roundRectImpl(g,cx-11,o.y-15,22,14,4);g.fill();
  }
  g.fillStyle='#7be0b0';g.strokeStyle=INK;g.lineWidth=3;
  roundRectImpl(g,player.x-16,PLAYER_Y-22,32,44,8);g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,.5)';roundRectImpl(g,player.x-11,PLAYER_Y+6,22,14,4);g.fill();
  g.fillStyle='#ffd166';g.font='800 16px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,22);
  g.textAlign='right';g.fillText(Math.round(speed)+' km/h',W2-8,22);
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#ff5ea8';g.strokeStyle=INK;g.lineWidth=4;g.font='800 26px Fredoka';g.textAlign='center';
    g.strokeText(t('racer_over'),W2/2,H2/2-10);g.fillText(t('racer_over'),W2/2,H2/2-10);
    if(racerNewRecord){g.fillStyle='#7be0b0';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+16);}
    else if(racerBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+racerBest,W2/2,H2/2+16);}
  }
}
function renderRacerBoard(rows){const el=$('rlblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('racer_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🏎️ '+(r.racer_best||0)+'</span>';
    el.appendChild(row);});}
function openRacerBoard(){socket&&socket.emit('racer-leaderboard');$('rlblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('rlb').style.display='flex';}

export function onRacerBest(d){racerBest=d.best||0;if(d.record)racerNewRecord=true;}
export function onRacerLeaderboardData(d){renderRacerBoard(d.rows||[]);}

export function initRacerDom(){
  addEventListener('keydown',e=>{
    if($('racer').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','a','d'].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')moveLane(-1);
    else if(k==='arrowright'||k==='d')moveLane(1);
  });
  $('racerclose').onclick=closeRacer;
  $('rlbclose').onclick=()=>$('rlb').style.display='none';
  $('rlb').onclick=e=>{if(e.target.id==='rlb')$('rlb').style.display='none';};
}
