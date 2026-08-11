import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, SESSION_LEN=45, HOLE_R=38;
const HOLES=[
  {x:75,y:220},{x:150,y:220},{x:225,y:220},
  {x:75,y:340},{x:150,y:340},{x:225,y:340}
];

let bbG=null, bbRAF=null, bbLast=0, phase='play';
let holes=[], score=0, combo=0, maxCombo=0, timeLeft=SESSION_LEN, spawnT=0, popup=null, popupT=0;
let bbNewRecord=false, bbBest=0;

function reset(){
  holes=HOLES.map(h=>({x:h.x,y:h.y,state:'idle',t:0,dur:0,golden:false}));
  score=0;combo=0;maxCombo=0;timeLeft=SESSION_LEN;spawnT=0.5;popup=null;popupT=0;bbNewRecord=false;
}
export function openBonkABot(){
  const c=$('bonkabotCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;bbG=c.getContext('2d');bbG.setTransform(dpr,0,0,dpr,0,0);
  reset();phase='play';
  $('bonkabotfoot').textContent=t('bonkabot_controls');
  $('bonkabot').style.display='flex';setLocked(true);bbLast=performance.now();if(!bbRAF)bbLoop();
}
function closeBonkABot(){$('bonkabot').style.display='none';if(bbRAF)cancelAnimationFrame(bbRAF);bbRAF=null;setLocked(false);}
function sessionEnd(){
  phase='over';
  const gained=Math.min(500,Math.round(score/10));
  socket&&socket.emit('bonkabot-score',{score});
  showPopup('🤖',t('popup_bonkabot_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('bonkabotfoot').innerHTML='<button class="betb" id="bonkabotagain">🔁 '+t('btn_again')+'</button><button class="betb" id="bonkabotboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="bonkabotexit">'+t('btn_exit')+'</button>';
  const a=$('bonkabotagain'),x=$('bonkabotexit'),b=$('bonkabotboard');
  if(a)a.onclick=()=>openBonkABot();
  if(x)x.onclick=closeBonkABot;
  if(b)b.onclick=openBonkABotBoard;
}
function bbLoop(){
  const now=performance.now(),dt=Math.min((now-bbLast)/1000,.05);bbLast=now;
  if($('bonkabot').style.display==='none'){bbRAF=null;return;}
  if(phase==='play')updateBonkABot(dt);
  drawBonkABot(now);
  bbRAF=requestAnimationFrame(bbLoop);
}
function updateBonkABot(dt){
  timeLeft-=dt;
  if(timeLeft<=0){timeLeft=0;sessionEnd();return;}
  spawnT-=dt;
  if(spawnT<=0){
    const idle=holes.filter(h=>h.state==='idle');
    if(idle.length){
      spawnT=Math.max(0.32,0.85-(SESSION_LEN-timeLeft)*0.008);
      const h=idle[Math.floor(Math.random()*idle.length)];
      h.state='up';h.t=0;h.dur=Math.max(0.55,1.15-(SESSION_LEN-timeLeft)*0.01);h.golden=Math.random()<0.12;
    }
  }
  for(const h of holes){
    if(h.state==='up'){h.t+=dt;if(h.t>=h.dur){h.state='idle';combo=0;}}
    else if(h.state==='hit'){h.t+=dt;if(h.t>=0.25)h.state='idle';}
  }
  if(popupT>0){popupT-=dt;if(popupT<=0)popup=null;}
}
function tryBonk(px,py){
  if(phase!=='play')return;
  for(const h of holes){
    if(h.state!=='up')continue;
    if(Math.hypot(px-h.x,py-h.y)<HOLE_R){
      h.state='hit';h.t=0;
      combo++;maxCombo=Math.max(maxCombo,combo);
      const mult=h.golden?3:1;
      const gain=Math.round((20+Math.min(30,combo*2))*mult);
      score+=gain;
      popup={text:'+'+gain,x:h.x,y:h.y,golden:h.golden};popupT=0.55;
      return;
    }
  }
}
function drawBot(g,x,y,progress,golden,hit){
  const squish=hit?Math.max(0,1-progress*4):1;
  const popAmt=hit?1:Math.min(1,progress*6);
  g.save();g.translate(x,y+ (1-popAmt)*30);g.scale(1,squish);
  g.fillStyle=golden?'#ffd166':'#7be0b0';g.strokeStyle=INK;g.lineWidth=3;
  g.beginPath();g.ellipse(0,0,24,26,0,0,7);g.fill();g.stroke();
  g.fillStyle='#0a0818';g.beginPath();g.arc(-8,-4,4,0,7);g.fill();g.beginPath();g.arc(8,-4,4,0,7);g.fill();
  g.strokeStyle=INK;g.lineWidth=2.5;g.lineCap='round';
  g.beginPath();g.arc(0,8,8,0.15*Math.PI,0.85*Math.PI);g.stroke();
  g.fillStyle=golden?'#fff8d0':'#c9f5e0';g.beginPath();g.arc(-10,-16,4,0,7);g.fill();g.arc(10,-16,4,0,7);g.fill();
  g.restore();
}
function drawBonkABot(now){
  const g=bbG;
  g.fillStyle='#241a10';g.fillRect(0,0,W2,H2);
  g.fillStyle='#cbb8ff';g.font='800 15px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,20);
  g.textAlign='right';g.fillText(Math.ceil(timeLeft)+'s',W2-8,20);
  g.textAlign='center';
  if(combo>1){g.fillStyle='#ffd166';g.font='800 12px Fredoka';g.fillText(combo+'x '+t('stepbeat_combo'),W2/2,20);}
  for(const h of holes){
    g.fillStyle='#0d0805';g.beginPath();g.ellipse(h.x,h.y+26,34,12,0,0,7);g.fill();
    g.strokeStyle='#4a3524';g.lineWidth=3;g.stroke();
    if(h.state==='up'){drawBot(g,h.x,h.y,h.t/h.dur,h.golden,false);}
    else if(h.state==='hit'){drawBot(g,h.x,h.y,h.t/0.25,h.golden,true);}
  }
  if(popup){
    g.globalAlpha=Math.min(1,popupT*3);g.fillStyle=popup.golden?'#ffd166':'#7be0b0';
    g.font='800 20px Fredoka';g.textAlign='center';g.fillText(popup.text,popup.x,popup.y-40-(0.55-popupT)*30);
    g.globalAlpha=1;
  }
  if(phase==='over'){
    g.fillStyle='rgba(20,12,8,.65)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#7be0b0';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('bonkabot_over'),W2/2,H2/2-14);g.fillText(t('bonkabot_over'),W2/2,H2/2-14);
    g.fillStyle='#fff';g.font='700 13px Fredoka';g.fillText(t('stepbeat_max_combo')+': '+maxCombo+'x',W2/2,H2/2+8);
    if(bbNewRecord){g.fillStyle='#ffd166';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+28);}
    else if(bbBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+bbBest,W2/2,H2/2+28);}
  }
}
function renderBonkABotBoard(rows){const el=$('bblblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('bonkabot_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🤖 '+(r.bonkabot_best||0)+'</span>';
    el.appendChild(row);});}
function openBonkABotBoard(){socket&&socket.emit('bonkabot-leaderboard');$('bblblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('bblb').style.display='flex';}

export function onBonkABotBest(d){bbBest=d.best||0;if(d.record)bbNewRecord=true;}
export function onBonkABotLeaderboardData(d){renderBonkABotBoard(d.rows||[]);}

function pointerToCanvas(e){const c=$('bonkabotCanvas'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(W2/r.width),y:(e.clientY-r.top)*(H2/r.height)};}
export function initBonkABotDom(){
  $('bonkabotCanvas').addEventListener('pointerdown',e=>{if(phase==='play'){const p=pointerToCanvas(e);tryBonk(p.x,p.y);}});
  addEventListener('keydown',e=>{
    if($('bonkabot').style.display==='none'||phase!=='play'||!e.key)return;
    const n=+e.key;
    if(n>=1&&n<=6){e.preventDefault();const h=HOLES[n-1];tryBonk(h.x,h.y);}
  });
  $('bonkabotclose').onclick=closeBonkABot;
  $('bblbclose').onclick=()=>$('bblb').style.display='none';
  $('bblb').onclick=e=>{if(e.target.id==='bblb')$('bblb').style.display='none';};
}
