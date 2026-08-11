import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, SESSION_LEN=45;
const GRAVITY=900, BALL_R=13, BALL_START={x:150,y:420};
const HOOP_Y=120, RIM_R=34, POST_R=5, HOOP_CX=150, HOOP_AMP=68;
const BACKBOARD_Y=HOOP_Y-52, BACKBOARD_HALF=44;
const CHARGE_OSC=1.15, ANGLE_SPEED=1.6, ANGLE_MAX=0.75, VY_MIN=550, VY_MAX=850, AIM_VX_SCALE=113;

function clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}

let szG=null, szRAF=null, szLast=0, phase='aim';
let ball={x:150,y:420,vx:0,vy:0}, angle=0, power=0, chargeT=0, aimDir=0, dragStartX=null;
let hoopPhase=0, hoopX=HOOP_CX, touchedRim=false, scored=false, respawnT=0;
let score=0, combo=0, maxCombo=0, timeLeft=SESSION_LEN, shotsMade=0, shotsTaken=0;
let popup=null, popupT=0, szNewRecord=false, szBest=0;

function reset(){
  ball={x:BALL_START.x,y:BALL_START.y,vx:0,vy:0};
  angle=0;power=0;chargeT=0;aimDir=0;dragStartX=null;
  hoopPhase=Math.random()*10;hoopX=HOOP_CX;touchedRim=false;scored=false;respawnT=0;
  score=0;combo=0;maxCombo=0;timeLeft=SESSION_LEN;shotsMade=0;shotsTaken=0;
  popup=null;popupT=0;szNewRecord=false;phase='aim';
}
export function openSlamZone(){
  const c=$('slamzoneCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;szG=c.getContext('2d');szG.setTransform(dpr,0,0,dpr,0,0);
  reset();
  $('slamzonefoot').textContent=t('slamzone_controls');
  $('slamzone').style.display='flex';setLocked(true);szLast=performance.now();if(!szRAF)szLoop();
}
function closeSlamZone(){$('slamzone').style.display='none';if(szRAF)cancelAnimationFrame(szRAF);szRAF=null;setLocked(false);}
function sessionEnd(){
  phase='over';
  const gained=Math.min(500,Math.round(score/6));
  socket&&socket.emit('slamzone-score',{score});
  showPopup('🏀',t('popup_slamzone_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('slamzonefoot').innerHTML='<button class="betb" id="slamzoneagain">🔁 '+t('btn_again')+'</button><button class="betb" id="slamzoneboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="slamzoneexit">'+t('btn_exit')+'</button>';
  const a=$('slamzoneagain'),x=$('slamzoneexit'),b=$('slamzoneboard');
  if(a)a.onclick=()=>openSlamZone();
  if(x)x.onclick=closeSlamZone;
  if(b)b.onclick=openSlamZoneBoard;
}
function szLoop(){
  const now=performance.now(),dt=Math.min((now-szLast)/1000,.05);szLast=now;
  if($('slamzone').style.display==='none'){szRAF=null;return;}
  if(phase!=='over')updateSlamZone(dt);
  drawSlamZone(now);
  szRAF=requestAnimationFrame(szLoop);
}
function launchBall(){
  const vyMag=VY_MIN+power*(VY_MAX-VY_MIN);
  ball.vx=angle*AIM_VX_SCALE;ball.vy=-vyMag;
  touchedRim=false;scored=false;phase='fly';
}
function finishShot(made){
  shotsTaken++;
  if(made){
    shotsMade++;combo++;maxCombo=Math.max(maxCombo,combo);
    const base=touchedRim?15:25;
    const gain=base+Math.min(30,(combo-1)*5);
    score+=gain;
    popup={text:'+'+gain+(touchedRim?'':' ✨'),x:ball.x,y:HOOP_Y,miss:false};popupT=0.7;
  } else {
    combo=0;
    popup={text:'❌',x:ball.x,y:Math.min(ball.y,H2-30),miss:true};popupT=0.5;
  }
  phase='settle';respawnT=0.45;
}
function updateSlamZone(dt){
  timeLeft-=dt;
  if(timeLeft<=0){timeLeft=0;sessionEnd();return;}
  hoopPhase+=dt;hoopX=HOOP_CX+Math.sin(hoopPhase*0.7)*HOOP_AMP;
  if(popupT>0){popupT-=dt;if(popupT<=0)popup=null;}
  if(phase==='charge'){
    chargeT+=dt;
    power=(1-Math.cos(chargeT*2*Math.PI/CHARGE_OSC))/2;
    if(aimDir!==0)angle=clamp(angle+aimDir*ANGLE_SPEED*dt,-ANGLE_MAX,ANGLE_MAX);
  } else if(phase==='fly'){
    ball.vy+=GRAVITY*dt;
    const py=ball.y;
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<BALL_R){ball.x=BALL_R;ball.vx=Math.abs(ball.vx)*0.55;}
    if(ball.x>W2-BALL_R){ball.x=W2-BALL_R;ball.vx=-Math.abs(ball.vx)*0.55;}
    const bLeft=hoopX-BACKBOARD_HALF,bRight=hoopX+BACKBOARD_HALF;
    if(ball.vy<0&&py>BACKBOARD_Y&&ball.y<=BACKBOARD_Y&&ball.x>bLeft-BALL_R&&ball.x<bRight+BALL_R){
      ball.y=BACKBOARD_Y+BALL_R;ball.vy=-ball.vy*0.5;ball.vx*=0.85;touchedRim=true;
    }
    for(const postX of [hoopX-RIM_R,hoopX+RIM_R]){
      const dx=ball.x-postX,dy=ball.y-HOOP_Y,dist=Math.hypot(dx,dy);
      if(dist<BALL_R+POST_R){
        const nx=dx/(dist||1),ny=dy/(dist||1);
        ball.x=postX+nx*(BALL_R+POST_R);ball.y=HOOP_Y+ny*(BALL_R+POST_R);
        const dot=ball.vx*nx+ball.vy*ny;
        ball.vx-=1.7*dot*nx;ball.vy-=1.7*dot*ny;ball.vx*=0.8;ball.vy*=0.8;
        touchedRim=true;
      }
    }
    if(!scored&&py<HOOP_Y&&ball.y>=HOOP_Y&&ball.vy>0){
      const gateHalf=RIM_R-BALL_R*0.5;
      if(ball.x>hoopX-gateHalf&&ball.x<hoopX+gateHalf)scored=true;
    }
    if(scored){
      if(ball.y>HOOP_Y+40)finishShot(true);
    } else if(ball.y>H2+40||ball.x<-40||ball.x>W2+40||ball.y>H2-BALL_R){
      finishShot(false);
    }
  } else if(phase==='settle'){
    respawnT-=dt;
    if(respawnT<=0){
      ball={x:BALL_START.x,y:BALL_START.y,vx:0,vy:0};
      angle=0;power=0;chargeT=0;touchedRim=false;scored=false;phase='aim';
    }
  }
}
function drawNet(g,cx,y){
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;
  for(let i=-3;i<=3;i++){
    g.beginPath();g.moveTo(cx+i*(RIM_R/3.2),y+2);g.lineTo(cx+i*(RIM_R/4.6),y+30);g.stroke();
  }
  for(let j=1;j<=2;j++){
    g.beginPath();g.ellipse(cx,y+8*j+4,RIM_R-j*7,4,0,0,Math.PI*2);g.stroke();
  }
}
function drawSlamZone(now){
  const g=szG;
  const bg=g.createLinearGradient(0,0,0,H2);bg.addColorStop(0,'#0a1428');bg.addColorStop(1,'#160a28');
  g.fillStyle=bg;g.fillRect(0,0,W2,H2);
  g.fillStyle='rgba(255,255,255,.04)';
  for(let i=0;i<5;i++)g.fillRect(0,60+i*70,W2,2);

  g.fillStyle='#241a3a';g.fillRect(hoopX-BACKBOARD_HALF,BACKBOARD_Y-6,BACKBOARD_HALF*2,12);
  g.strokeStyle=INK;g.lineWidth=2;g.strokeRect(hoopX-BACKBOARD_HALF,BACKBOARD_Y-6,BACKBOARD_HALF*2,12);

  drawNet(g,hoopX,HOOP_Y);
  g.strokeStyle='#ff8200';g.lineWidth=5;g.lineCap='round';
  g.beginPath();g.moveTo(hoopX-RIM_R,HOOP_Y);g.lineTo(hoopX+RIM_R,HOOP_Y);g.stroke();
  g.fillStyle='#ff8200';
  g.beginPath();g.arc(hoopX-RIM_R,HOOP_Y,POST_R,0,7);g.fill();
  g.beginPath();g.arc(hoopX+RIM_R,HOOP_Y,POST_R,0,7);g.fill();

  if((phase==='aim'||phase==='charge')){
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.setLineDash([5,6]);
    g.beginPath();g.moveTo(ball.x,ball.y);
    g.lineTo(ball.x+Math.sin(angle)*90,ball.y-Math.cos(angle)*90);g.stroke();
    g.setLineDash([]);
  }

  g.fillStyle='#ffb14d';g.beginPath();g.arc(ball.x,ball.y,BALL_R,0,7);g.fill();
  g.strokeStyle='#0a0818';g.lineWidth=1.5;g.stroke();
  g.beginPath();g.moveTo(ball.x-BALL_R,ball.y);g.lineTo(ball.x+BALL_R,ball.y);g.stroke();
  g.beginPath();g.moveTo(ball.x,ball.y-BALL_R);g.lineTo(ball.x,ball.y+BALL_R);g.stroke();

  if(phase==='charge'){
    const bx=W2-22,by0=60,bh=280;
    g.fillStyle='rgba(255,255,255,.15)';g.fillRect(bx-6,by0,12,bh);
    const fillH=bh*power;
    g.fillStyle='#ff2e88';g.fillRect(bx-6,by0+bh-fillH,12,fillH);
    g.strokeStyle=INK;g.lineWidth=2;g.strokeRect(bx-6,by0,12,bh);
  }

  g.fillStyle='#cbb8ff';g.font='800 15px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,20);
  g.textAlign='right';g.fillText(Math.ceil(timeLeft)+'s',W2-8,20);
  g.textAlign='center';
  if(combo>1){g.fillStyle='#ffd166';g.font='800 12px Fredoka';g.fillText(combo+'x '+t('stepbeat_combo'),W2/2,20);}

  if(popup){
    g.globalAlpha=Math.min(1,popupT*3);
    g.fillStyle=popup.miss?'#ff6b6b':'#ffd166';
    g.font='800 20px Fredoka';g.textAlign='center';
    g.fillText(popup.text,popup.x,popup.y-30-(0.7-popupT)*30);
    g.globalAlpha=1;
  }

  if(phase==='over'){
    g.fillStyle='rgba(20,12,8,.65)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#ff8200';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('slamzone_over'),W2/2,H2/2-24);g.fillText(t('slamzone_over'),W2/2,H2/2-24);
    g.fillStyle='#fff';g.font='700 13px Fredoka';
    g.fillText(shotsMade+'/'+shotsTaken+' '+t('label_score'),W2/2,H2/2);
    g.fillText(t('stepbeat_max_combo')+': '+maxCombo+'x',W2/2,H2/2+20);
    if(szNewRecord){g.fillStyle='#ffd166';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+42);}
    else if(szBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+szBest,W2/2,H2/2+42);}
  }
}
function renderSlamZoneBoard(rows){const el=$('szlblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('slamzone_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🏀 '+(r.slamzone_best||0)+'</span>';
    el.appendChild(row);});}
function openSlamZoneBoard(){socket&&socket.emit('slamzone-leaderboard');$('szlblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('szlb').style.display='flex';}

export function onSlamZoneBest(d){szBest=d.best||0;if(d.record)szNewRecord=true;}
export function onSlamZoneLeaderboardData(d){renderSlamZoneBoard(d.rows||[]);}

function pointerToCanvas(e){const c=$('slamzoneCanvas'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(W2/r.width),y:(e.clientY-r.top)*(H2/r.height)};}
export function initSlamZoneDom(){
  $('slamzoneCanvas').addEventListener('pointerdown',e=>{
    if($('slamzone').style.display==='none'||phase!=='aim')return;
    const p=pointerToCanvas(e);dragStartX=p.x;chargeT=0;phase='charge';
  });
  $('slamzoneCanvas').addEventListener('pointermove',e=>{
    if(phase!=='charge'||dragStartX===null)return;
    const p=pointerToCanvas(e);angle=clamp((p.x-dragStartX)/70,-ANGLE_MAX,ANGLE_MAX);
  });
  const release=()=>{if(phase==='charge'){launchBall();}dragStartX=null;};
  $('slamzoneCanvas').addEventListener('pointerup',release);
  $('slamzoneCanvas').addEventListener('pointercancel',release);
  addEventListener('keydown',e=>{
    if($('slamzone').style.display==='none')return;
    if(e.code==='Space'&&!e.repeat&&phase==='aim'){e.preventDefault();chargeT=0;phase='charge';}
    if(e.code==='ArrowLeft'){e.preventDefault();aimDir=-1;}
    if(e.code==='ArrowRight'){e.preventDefault();aimDir=1;}
  });
  addEventListener('keyup',e=>{
    if($('slamzone').style.display==='none')return;
    if(e.code==='Space'&&phase==='charge'){launchBall();}
    if(e.code==='ArrowLeft'&&aimDir===-1)aimDir=0;
    if(e.code==='ArrowRight'&&aimDir===1)aimDir=0;
  });
  $('slamzoneclose').onclick=closeSlamZone;
  $('szlbclose').onclick=()=>$('szlb').style.display='none';
  $('szlb').onclick=e=>{if(e.target.id==='szlb')$('szlb').style.display='none';};
}
