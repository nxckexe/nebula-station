import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl, clamp } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const ARENA_W=300, HP=100, W2=320, H2=220, GROUND=150;
const XOFF=(W2-ARENA_W)/2;

let dg=null, dRAF=null, dLast=0;
let phase='idle', seat=-1, opponent=null, mySpecies='blobbi', myColor='#ff5ea8';
let xA=60, xB=ARENA_W-60, hpA=HP, hpB=HP, actA='idle', actB='idle', blockA=false, blockB=false;
let countdownEndsAt=0, overInfo=null;
const held={left:false,right:false,block:false};

function sendInput(extra){
  const move=(held.left?-1:0)+(held.right?1:0);
  socket&&socket.emit('duel-input',Object.assign({move,block:held.block},extra||{}));
}

export function openIronDuel(){
  const c=$('duelCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;dg=c.getContext('2d');dg.setTransform(dpr,0,0,dpr,0,0);
  phase='waiting';overInfo=null;seat=-1;opponent=null;
  xA=60;xB=ARENA_W-60;hpA=HP;hpB=HP;actA='idle';actB='idle';blockA=false;blockB=false;
  held.left=false;held.right=false;held.block=false;
  const me=getMe();mySpecies=(me&&me.species)||'blobbi';myColor=(me&&me.color)||'#ff5ea8';
  $('duelfoot').textContent=t('duel_searching');
  $('duel').style.display='flex';setLocked(true);dLast=performance.now();if(!dRAF)dLoop();
  socket&&socket.emit('duel-join');
}
function closeDuel(){if(phase==='waiting'||phase==='run'||phase==='countdown')socket&&socket.emit('duel-leave');
  $('duel').style.display='none';if(dRAF)cancelAnimationFrame(dRAF);dRAF=null;setLocked(false);}

export function onDuelWaiting(){phase='waiting';$('duelfoot').innerHTML=t('duel_searching')+' <button class="betb" id="duelcancel">'+t('btn_exit')+'</button>';
  const cb=$('duelcancel');if(cb)cb.onclick=closeDuel;}
export function onDuelStart(d){
  phase='countdown';seat=d.seat;opponent=d.opponent;countdownEndsAt=performance.now()+2200;
  xA=60;xB=ARENA_W-60;hpA=d.hp||HP;hpB=d.hp||HP;actA='idle';actB='idle';
  $('duelfoot').textContent=t('duel_controls');
}
export function onDuelGo(){phase='run';}
export function onDuelState(d){xA=d.xA;xB=d.xB;hpA=d.hpA;hpB=d.hpB;actA=d.actA;actB=d.actB;blockA=d.blockA;blockB=d.blockB;}
export function onDuelOver(d){
  phase='over';overInfo=d;
  const iWon=d.winnerSeat===seat;
  const title=d.winnerSeat<0?t('duel_draw'):(iWon?t('duel_win'):t('duel_lose'));
  showPopup(iWon?'🏆':'👊',title,d.reason==='forfeit'?t('duel_forfeit_note'):'','purple');
  $('duelfoot').innerHTML='<button class="betb" id="duelagain">🔁 '+t('btn_again')+'</button><button class="betb" id="duelboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="duelexit">'+t('btn_exit')+'</button>';
  const a=$('duelagain'),x=$('duelexit'),b=$('duelboard');
  if(a)a.onclick=()=>openIronDuel();
  if(x)x.onclick=closeDuel;
  if(b)b.onclick=()=>{socket&&socket.emit('leaderboard');$('lblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('duel').style.display='none';$('lb').style.display='flex';};
}

function dLoop(){
  const now=performance.now();dLast=now;
  if($('duel').style.display==='none'){dRAF=null;return;}
  drawDuel(now); // Phasenwechsel countdown->run kommt vom Server per 'duel-go'
  dRAF=requestAnimationFrame(dLoop);
}
function drawFighter(g,x,facing,color,species,action,blocking,now,seed){
  const bob=Math.sin(now/300+seed)*2;
  const y=GROUND+bob;
  let lunge=0;
  if(action==='punch'||action==='kick')lunge=facing*8;
  g.save();g.translate(x+lunge,y);
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,18,20,5,0,0,7);g.fill();
  g.fillStyle=color;g.strokeStyle=INK;g.lineWidth=3;
  const squat=blocking?6:0;
  g.beginPath();g.ellipse(0,-6+squat*0.5,17,20-squat,0,0,7);g.fill();g.stroke();
  const eyeX=facing*5;
  g.fillStyle='#fff';g.beginPath();g.arc(eyeX-4,-12,4,0,7);g.fill();g.beginPath();g.arc(eyeX+4,-12,4,0,7);g.fill();
  g.fillStyle=INK;g.beginPath();g.arc(eyeX-4+facing,-12,2,0,7);g.fill();g.beginPath();g.arc(eyeX+4+facing,-12,2,0,7);g.fill();
  if(blocking){
    g.fillStyle='#cbd5e1';g.strokeStyle=INK;g.lineWidth=2;
    g.beginPath();g.ellipse(facing*14,-2,7,14,0,0,7);g.fill();g.stroke();
  }else if(action==='punch'){
    g.fillStyle=color;g.strokeStyle=INK;g.lineWidth=2;
    g.beginPath();g.arc(facing*24,-8,6,0,7);g.fill();g.stroke();
  }else if(action==='kick'){
    g.fillStyle=color;g.strokeStyle=INK;g.lineWidth=2;
    g.beginPath();g.ellipse(facing*20,6,10,6,0,0,7);g.fill();g.stroke();
  }
  g.restore();
}
function drawDuel(now){
  const g=dg;
  g.fillStyle='#150a24';g.fillRect(0,0,W2,H2);
  const skyG=g.createLinearGradient(0,0,0,GROUND+10);skyG.addColorStop(0,'#2a0f45');skyG.addColorStop(1,'#150a24');
  g.fillStyle=skyG;g.fillRect(0,0,W2,GROUND+10);
  g.fillStyle='#0c0616';g.fillRect(0,GROUND+10,W2,H2-GROUND-10);
  g.strokeStyle='rgba(180,103,255,.3)';g.lineWidth=2;g.beginPath();g.moveTo(0,GROUND+10);g.lineTo(W2,GROUND+10);g.stroke();
  if(phase==='idle'||phase==='waiting'){
    g.fillStyle='#cbb8ff';g.font='700 14px Fredoka';g.textAlign='center';g.fillText(t('duel_searching'),W2/2,H2/2);
    return;
  }
  drawFighter(g,XOFF+xA,1,seat===0?myColor:(opponent&&opponent.color)||'#ff5ea8',null,actA,blockA,now,0);
  drawFighter(g,XOFF+xB,-1,seat===1?myColor:(opponent&&opponent.color)||'#31e1ff',null,actB,blockB,now,1.7);
  // Health-Bars
  drawBar(g,10,10,130,14,hpA/HP,'#ff5ea8');
  drawBar(g,W2-140,10,130,14,hpB/HP,'#31e1ff');
  g.fillStyle='#fff';g.font='700 10px Fredoka';g.textAlign='left';g.fillText(seat===0?t('duel_you'):(opponent&&opponent.name)||'?',12,32);
  g.textAlign='right';g.fillText(seat===1?t('duel_you'):(opponent&&opponent.name)||'?',W2-12,32);
  if(phase==='countdown'){
    const left=Math.max(0,countdownEndsAt-now);
    g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=4;g.font='800 40px Fredoka';g.textAlign='center';
    const label=left>1500?'3':left>800?'2':left>0?'1':t('duel_fight');
    g.strokeText(label,W2/2,H2/2);g.fillText(label,W2/2,H2/2);
  }
  if(phase==='over'&&overInfo){
    g.fillStyle='rgba(6,4,20,.55)';g.fillRect(0,0,W2,H2);
    const iWon=overInfo.winnerSeat===seat;
    g.fillStyle=overInfo.winnerSeat<0?'#bfeaff':(iWon?'#7be0b0':'#ff5ea8');
    g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    const label=overInfo.winnerSeat<0?t('duel_draw'):(iWon?t('duel_win'):t('duel_lose'));
    g.strokeText(label,W2/2,H2/2);g.fillText(label,W2/2,H2/2);
  }
}
function drawBar(g,x,y,w,h,frac,color){
  g.fillStyle='#1c1442';g.strokeStyle=INK;g.lineWidth=2;roundRectImpl(g,x,y,w,h,5);g.fill();g.stroke();
  g.fillStyle=color;roundRectImpl(g,x+2,y+2,Math.max(0,(w-4)*clamp(frac,0,1)),h-4,3);g.fill();
}

export function initIronDuelDom(){
  addEventListener('keydown',e=>{
    if($('duel').style.display==='none'||phase!=='run'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','a','d','j','k','l'].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a'){if(!held.left){held.left=true;sendInput();}}
    else if(k==='arrowright'||k==='d'){if(!held.right){held.right=true;sendInput();}}
    else if(k==='l'){if(!held.block){held.block=true;sendInput();}}
    else if(k==='j')sendInput({action:'punch'});
    else if(k==='k')sendInput({action:'kick'});
  });
  addEventListener('keyup',e=>{
    if(!e.key)return;const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a'){held.left=false;sendInput();}
    else if(k==='arrowright'||k==='d'){held.right=false;sendInput();}
    else if(k==='l'){held.block=false;sendInput();}
  });
  $('duelclose').onclick=closeDuel;
}
