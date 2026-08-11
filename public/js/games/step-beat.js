import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl, esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, JUDGE_Y=80, SPAWN_Y=440, NOTE_SPEED=220, SESSION_LEN=60;
const LANES=['left','up','down','right'];
const LANE_GLYPH={left:'◄',up:'▲',down:'▼',right:'►'};
const LANE_COLOR={left:'#ff5ea8',up:'#31e1ff',down:'#ffd166',right:'#7be0b0'};
const LANE_X=i=>40+i*((W2-80)/3);

let sbG=null, sbRAF=null, sbLast=0, phase='play';
let notes=[], score=0, combo=0, maxCombo=0, timeLeft=SESSION_LEN, spawnT=0, flash=null, flashT=0;
let sbNewRecord=false, sbBest=0;

function reset(){
  notes=[];score=0;combo=0;maxCombo=0;timeLeft=SESSION_LEN;spawnT=0.5;flash=null;flashT=0;sbNewRecord=false;
}
export function openStepBeat(){
  const c=$('stepbeatCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;sbG=c.getContext('2d');sbG.setTransform(dpr,0,0,dpr,0,0);
  reset();phase='play';
  $('stepbeatfoot').textContent=t('stepbeat_controls');
  $('stepbeat').style.display='flex';setLocked(true);sbLast=performance.now();if(!sbRAF)sbLoop();
}
function closeStepBeat(){$('stepbeat').style.display='none';if(sbRAF)cancelAnimationFrame(sbRAF);sbRAF=null;setLocked(false);}
function sessionEnd(){
  phase='over';
  const gained=Math.min(500,Math.round(score/15));
  socket&&socket.emit('stepbeat-score',{score});
  showPopup('🕺',t('popup_stepbeat_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('stepbeatfoot').innerHTML='<button class="betb" id="stepbeatagain">🔁 '+t('btn_again')+'</button><button class="betb" id="stepbeatboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="stepbeatexit">'+t('btn_exit')+'</button>';
  const a=$('stepbeatagain'),x=$('stepbeatexit'),b=$('stepbeatboard');
  if(a)a.onclick=()=>openStepBeat();
  if(x)x.onclick=closeStepBeat;
  if(b)b.onclick=openStepBeatBoard;
}
function sbLoop(){
  const now=performance.now(),dt=Math.min((now-sbLast)/1000,.05);sbLast=now;
  if($('stepbeat').style.display==='none'){sbRAF=null;return;}
  if(phase==='play')updateStepBeat(dt);
  drawStepBeat(now);
  sbRAF=requestAnimationFrame(sbLoop);
}
function updateStepBeat(dt){
  timeLeft-=dt;
  if(timeLeft<=0){timeLeft=0;sessionEnd();return;}
  spawnT-=dt;
  if(spawnT<=0){
    spawnT=Math.max(0.34,0.62-(SESSION_LEN-timeLeft)*0.004);
    notes.push({lane:Math.floor(Math.random()*4),y:SPAWN_Y});
  }
  for(const n of notes)n.y-=NOTE_SPEED*dt;
  // Cutoff bewusst deutlich jenseits des Treffer-Fensters (34px), damit eine Note nie
  // als "verpasst" verschwindet, waehrend sie fuer den Spieler technisch noch trefferbar waere.
  const missed=notes.filter(n=>n.y<JUDGE_Y-40);
  if(missed.length){combo=0;setFlash(t('stepbeat_miss'),'#ff5ea8');}
  notes=notes.filter(n=>n.y>=JUDGE_Y-40);
  if(flashT>0){flashT-=dt;if(flashT<=0)flash=null;}
}
function setFlash(text,color){flash={text,color};flashT=0.5;}
function hitLane(idx){
  if(phase!=='play')return;
  let best=null,bestDist=1e9;
  for(const n of notes){if(n.lane!==idx)continue;const d=Math.abs(n.y-JUDGE_Y);if(d<bestDist){bestDist=d;best=n;}}
  if(!best||bestDist>34)return;
  notes.splice(notes.indexOf(best),1);
  combo++;maxCombo=Math.max(maxCombo,combo);
  const mult=1+Math.min(2,Math.floor(combo/10)*0.5);
  if(bestDist<14){score+=Math.round(300*mult);setFlash(t('stepbeat_perfect'),'#7be0b0');}
  else{score+=Math.round(100*mult);setFlash(t('stepbeat_good'),'#ffd166');}
}
function drawStepBeat(now){
  const g=sbG;
  g.fillStyle='#0a0018';g.fillRect(0,0,W2,H2);
  g.fillStyle='#cbb8ff';g.font='800 15px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,20);
  g.textAlign='right';g.fillText(Math.ceil(timeLeft)+'s',W2-8,20);
  g.textAlign='center';
  if(combo>1){g.fillStyle='#ffd166';g.font='800 13px Fredoka';g.fillText(combo+'x '+t('stepbeat_combo'),W2/2,20);}
  for(let i=0;i<4;i++){
    const lx=LANE_X(i);
    g.strokeStyle='rgba(255,255,255,.15)';g.lineWidth=2;g.beginPath();g.moveTo(lx,JUDGE_Y-40);g.lineTo(lx,H2);g.stroke();
    g.fillStyle=LANE_COLOR[LANES[i]];g.globalAlpha=.9;g.strokeStyle=INK;g.lineWidth=2;
    roundRectImpl(g,lx-20,JUDGE_Y-20,40,40,8);g.globalAlpha=.18;g.fill();g.globalAlpha=1;g.stroke();
    g.font='800 20px Fredoka';g.fillStyle=LANE_COLOR[LANES[i]];g.fillText(LANE_GLYPH[LANES[i]],lx,JUDGE_Y+7);
  }
  for(const n of notes){
    const lx=LANE_X(n.lane);
    g.fillStyle=LANE_COLOR[LANES[n.lane]];g.strokeStyle=INK;g.lineWidth=2;
    roundRectImpl(g,lx-18,n.y-18,36,36,8);g.fill();g.stroke();
    g.fillStyle='#0a0018';g.font='800 18px Fredoka';g.textAlign='center';g.fillText(LANE_GLYPH[LANES[n.lane]],lx,n.y+6);
  }
  if(flash){g.globalAlpha=Math.min(1,flashT*2.4);g.fillStyle=flash.color;g.font='800 22px Fredoka';g.textAlign='center';g.fillText(flash.text,W2/2,H2/2);g.globalAlpha=1;}
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#7be0b0';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('stepbeat_over'),W2/2,H2/2-14);g.fillText(t('stepbeat_over'),W2/2,H2/2-14);
    g.fillStyle='#fff';g.font='700 13px Fredoka';g.fillText(t('stepbeat_max_combo')+': '+maxCombo+'x',W2/2,H2/2+8);
    if(sbNewRecord){g.fillStyle='#ffd166';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+28);}
    else if(sbBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+sbBest,W2/2,H2/2+28);}
  }
}
function renderStepBeatBoard(rows){const el=$('sblist2');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('stepbeat_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🕺 '+(r.stepbeat_best||0)+'</span>';
    el.appendChild(row);});}
function openStepBeatBoard(){socket&&socket.emit('stepbeat-leaderboard');$('sblist2').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('sblb2').style.display='flex';}

export function onStepBeatBest(d){sbBest=d.best||0;if(d.record)sbNewRecord=true;}
export function onStepBeatLeaderboardData(d){renderStepBeatBoard(d.rows||[]);}

export function initStepBeatDom(){
  addEventListener('keydown',e=>{
    if($('stepbeat').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowup','arrowdown','arrowright'].includes(k))e.preventDefault();
    if(k==='arrowleft')hitLane(0);
    else if(k==='arrowup')hitLane(1);
    else if(k==='arrowdown')hitLane(2);
    else if(k==='arrowright')hitLane(3);
  });
  $('stepbeatclose').onclick=closeStepBeat;
  $('sblbclose2').onclick=()=>$('sblb2').style.display='none';
  $('sblb2').onclick=e=>{if(e.target.id==='sblb2')$('sblb2').style.display='none';};
}
