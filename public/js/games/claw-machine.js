import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, COST=50;
const RAIL_Y=68, IDLE_JAW_Y=95, CLAW_MIN_X=58, CLAW_MAX_X=242, CLAW_SPEED=150;
const GLASS={x0:24,y0:50,x1:276,y1:420};
const PRIZE_SLOTS=[
  {x:70,y:372,tier:'common'},
  {x:112,y:392,tier:'common'},
  {x:188,y:392,tier:'common'},
  {x:230,y:372,tier:'common'},
  {x:95,y:340,tier:'rare'},
  {x:205,y:340,tier:'rare'},
  {x:150,y:314,tier:'jackpot'},
];
const TIER_EMOJI={common:'🧸',rare:'⭐',jackpot:'🏆'};
const TIER_COLOR={common:'#ff9e64',rare:'#4dd0ff',jackpot:'#ffd166'};
const GRAB_RADIUS={common:32,rare:20,jackpot:13};
const TIER_REWARD={common:120,rare:280,jackpot:650};
const ANIM={descendEnd:0.35,grabEnd:0.55,riseEnd:0.85,deliverEnd:1.2};

let clG=null, clRAF=null, clLast=0;
let clawX=150, clawY=IDLE_JAW_Y, leftHeld=false, rightHeld=false;
let phase='idle', animT=0, waitT=0, dropSlot=null, grabQuality=0, pendingResult=null, lastResult=null;
let heldTier=null, deliverFlyT=0, popupMsg=null, popupMsgT=0, wins=0, clawNewRecord=false;

function nearestSlot(x){
  let best=PRIZE_SLOTS[0], bestD=Infinity;
  for(const s of PRIZE_SLOTS){const d=Math.abs(x-s.x);if(d<bestD){bestD=d;best=s;}}
  return {slot:best,dist:bestD};
}
function setMsg(msg){popupMsg=msg;popupMsgT=2.2;}

function reset(){
  clawX=150;clawY=IDLE_JAW_Y;leftHeld=false;rightHeld=false;
  phase='idle';animT=0;waitT=0;dropSlot=null;grabQuality=0;pendingResult=null;lastResult=null;
  heldTier=null;deliverFlyT=0;popupMsg=null;popupMsgT=0;
}
export function openClawMachine(){
  const c=$('clawCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;clG=c.getContext('2d');clG.setTransform(dpr,0,0,dpr,0,0);
  reset();
  const me=getMe();wins=(me&&me.clawmachineWins)||0;
  $('clawfoot').textContent=t('claw_controls');
  $('claw').style.display='flex';setLocked(true);clLast=performance.now();if(!clRAF)clLoop();
}
function closeClawMachine(){$('claw').style.display='none';if(clRAF)cancelAnimationFrame(clRAF);clRAF=null;setLocked(false);}

function tryDrop(){
  if(phase!=='idle')return;
  const me=getMe();
  if(!me||(me.stardust||0)<COST){setMsg(t('claw_no_funds'));return;}
  const {slot,dist}=nearestSlot(clawX);
  const radius=GRAB_RADIUS[slot.tier];
  const quality=Math.max(0,Math.min(1,1-dist/radius));
  dropSlot=slot;grabQuality=quality;
  phase='anim';animT=0;waitT=0;pendingResult=true;lastResult=null;heldTier=null;
  socket&&socket.emit('clawmachine-play',{tier:slot.tier,quality});
}
export function onClawMachineResult(d){
  if(!d||!d.ok){
    if(d&&d.code==='err_funds')setMsg(t('claw_no_funds'));
    else if(d&&d.code==='err_cooldown')setMsg(t('claw_cooldown',{sec:Math.ceil((d.remainingMs||0)/1000)}));
    pendingResult=false;phase='idle';animT=0;heldTier=null;deliverFlyT=0;dropSlot=null;
    return;
  }
  lastResult=d;pendingResult=false;
  const me=getMe();if(me){me.stardust=d.stardust;if(typeof d.wins==='number')me.clawmachineWins=d.wins;}
  const bal=document.getElementById('orbs');if(bal)bal.textContent=d.stardust;
  if(typeof d.wins==='number')wins=d.wins;
  if(d.record)clawNewRecord=true;
}

function clLoop(){
  const now=performance.now(),dt=Math.min((now-clLast)/1000,.05);clLast=now;
  if($('claw').style.display==='none'){clRAF=null;return;}
  updateClaw(dt);
  drawClaw(now);
  clRAF=requestAnimationFrame(clLoop);
}
function updateClaw(dt){
  if(popupMsgT>0){popupMsgT-=dt;if(popupMsgT<=0)popupMsg=null;}
  if(phase==='idle'){
    if(leftHeld)clawX=Math.max(CLAW_MIN_X,clawX-CLAW_SPEED*dt);
    if(rightHeld)clawX=Math.min(CLAW_MAX_X,clawX+CLAW_SPEED*dt);
    clawY=IDLE_JAW_Y;
    return;
  }
  animT+=dt;
  const targetY=dropSlot.y-4;
  if(animT<ANIM.descendEnd){
    const p=animT/ANIM.descendEnd;
    clawY=IDLE_JAW_Y+(targetY-IDLE_JAW_Y)*p;
  } else if(animT<ANIM.grabEnd){
    clawY=targetY;
    if(pendingResult){
      waitT+=dt;
      if(waitT<2.5)animT=ANIM.grabEnd-0.001; // an der Greif-Stelle warten, bis das Serverergebnis da ist
      else{lastResult={ok:true,success:false,reward:0};pendingResult=false;} // Sicherheitsnetz bei Netzwerkausfall
    } else if(lastResult&&lastResult.success){
      heldTier=dropSlot.tier;
    }
  } else if(animT<ANIM.riseEnd){
    const p=(animT-ANIM.grabEnd)/(ANIM.riseEnd-ANIM.grabEnd);
    clawY=targetY+(IDLE_JAW_Y-targetY)*p;
  } else if(animT<ANIM.deliverEnd){
    if(heldTier){deliverFlyT=(animT-ANIM.riseEnd)/(ANIM.deliverEnd-ANIM.riseEnd);}
    clawY=IDLE_JAW_Y;
  } else {
    if(lastResult){
      if(lastResult.success){
        const reward=lastResult.reward||TIER_REWARD[dropSlot.tier]||0;
        setMsg('🎉 '+t('claw_win')+' +'+reward+' ✦');
        showPopup(TIER_EMOJI[dropSlot.tier],t('popup_claw_win_title'),t('amount_stardust',{amount:reward}),'gold');
      } else {
        setMsg('😅 '+t('claw_empty'));
      }
    }
    phase='idle';animT=0;heldTier=null;deliverFlyT=0;dropSlot=null;
  }
}
function drawClawArm(g,x,jawY,closed){
  g.strokeStyle='#c7cfd6';g.lineWidth=3;g.beginPath();g.moveTo(x,RAIL_Y);g.lineTo(x,jawY);g.stroke();
  g.fillStyle='#e8edf2';g.strokeStyle=INK;g.lineWidth=2;roundRect(g,x-13,jawY-8,26,14,4);g.fill();g.stroke();
  const spread=closed?4:14;
  g.strokeStyle='#c7cfd6';g.lineWidth=5;g.lineCap='round';
  g.beginPath();g.moveTo(x-8,jawY+4);g.quadraticCurveTo(x-spread,jawY+16,x-spread*0.6,jawY+26);g.stroke();
  g.beginPath();g.moveTo(x+8,jawY+4);g.quadraticCurveTo(x+spread,jawY+16,x+spread*0.6,jawY+26);g.stroke();
}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function drawClaw(now){
  const g=clG;
  const bg=g.createLinearGradient(0,0,0,H2);bg.addColorStop(0,'#1a0e2e');bg.addColorStop(1,'#0e0818');
  g.fillStyle=bg;g.fillRect(0,0,W2,H2);
  g.fillStyle='#e2231a';g.strokeStyle=INK;g.lineWidth=5;roundRect(g,10,36,W2-20,H2-56,16);g.fill();g.stroke();
  g.fillStyle='#0a0a16';roundRect(g,GLASS.x0,GLASS.y0,GLASS.x1-GLASS.x0,GLASS.y1-GLASS.y0,10);g.fill();
  g.save();roundRect(g,GLASS.x0,GLASS.y0,GLASS.x1-GLASS.x0,GLASS.y1-GLASS.y0,10);g.clip();
  g.fillStyle='rgba(255,255,255,.04)';for(let y=GLASS.y0;y<GLASS.y1;y+=18)g.fillRect(GLASS.x0,y,GLASS.x1-GLASS.x0,1);
  const isDropping=(phase==='anim'&&dropSlot);
  for(const s of PRIZE_SLOTS){
    if(isDropping&&s===dropSlot&&heldTier)continue; // liegt gerade in der Klaue
    const bob=Math.sin(now/900+s.x)*1.5;
    g.font='26px serif';g.textAlign='center';g.fillText(TIER_EMOJI[s.tier],s.x,s.y+bob);
  }
  const jawClosed=phase==='anim'&&animT>=ANIM.descendEnd;
  drawClawArm(g,clawX,clawY,jawClosed);
  if(heldTier&&phase==='anim'&&animT<ANIM.riseEnd){
    g.font='24px serif';g.textAlign='center';g.fillText(TIER_EMOJI[heldTier],clawX,clawY+22);
  }
  if(heldTier&&phase==='anim'&&animT>=ANIM.riseEnd&&animT<ANIM.deliverEnd){
    const trayX=GLASS.x1-24,trayY=GLASS.y0+16;
    const fx=clawX+(trayX-clawX)*deliverFlyT, fy=clawY+22+(trayY-(clawY+22))*deliverFlyT;
    g.globalAlpha=1-deliverFlyT*0.6;g.font=(24-8*deliverFlyT)+'px serif';g.textAlign='center';g.fillText(TIER_EMOJI[heldTier],fx,fy);g.globalAlpha=1;
  }
  g.restore();
  g.strokeStyle=INK;g.lineWidth=3;roundRect(g,GLASS.x0,GLASS.y0,GLASS.x1-GLASS.x0,GLASS.y1-GLASS.y0,10);g.stroke();
  g.fillStyle='#fff';g.font='800 15px Fredoka';g.textAlign='center';g.fillText('🧸 CLAW MACHINE',W2/2,26);
  const me=getMe();
  g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.textAlign='left';g.fillText(t('claw_cost')+': '+COST+' ✦',18,H2-16);
  g.textAlign='right';g.fillText('🏆 '+wins,W2-18,H2-16);
  if(phase==='anim'&&animT>=ANIM.grabEnd-0.001&&animT<ANIM.grabEnd&&pendingResult){
    g.fillStyle='#ffd166';g.font='700 12px Fredoka';g.textAlign='center';g.fillText(t('loading'),W2/2,GLASS.y1+16);
  }
  if(popupMsg){
    g.globalAlpha=Math.min(1,popupMsgT);
    g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=3;g.font='800 14px Fredoka';g.textAlign='center';
    g.strokeText(popupMsg,W2/2,H2-38);g.fillText(popupMsg,W2/2,H2-38);
    g.globalAlpha=1;
  }
}
function renderClawBoard(rows){const el=$('clwlblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('claw_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🧸 '+(r.clawmachine_wins||0)+'</span>';
    el.appendChild(row);});}
function openClawBoard(){socket&&socket.emit('clawmachine-leaderboard');$('clwlblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('clwlb').style.display='flex';}
export function onClawMachineLeaderboardData(d){renderClawBoard(d.rows||[]);}

export function initClawMachineDom(){
  addEventListener('keydown',e=>{
    if($('claw').style.display==='none'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','a','d',' '].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')leftHeld=true;
    else if(k==='arrowright'||k==='d')rightHeld=true;
    else if(k===' ')tryDrop();
  });
  addEventListener('keyup',e=>{
    if(!e.key)return;const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a')leftHeld=false;
    else if(k==='arrowright'||k==='d')rightHeld=false;
  });
  const c=$('clawCanvas');
  c.addEventListener('pointerdown',e=>{
    const r=c.getBoundingClientRect();
    const px=(e.clientX-r.left)*(W2/r.width);
    if(phase!=='idle')return;
    if(px<W2*0.33)leftHeld=true;else if(px>W2*0.67)rightHeld=true;else tryDrop();
  });
  const stopHeld=()=>{leftHeld=false;rightHeld=false;};
  c.addEventListener('pointerup',stopHeld);
  c.addEventListener('pointercancel',stopHeld);
  c.addEventListener('pointerleave',stopHeld);
  $('clawclose').onclick=closeClawMachine;
  $('clawboardbtn').onclick=openClawBoard;
  $('clwlbclose').onclick=()=>$('clwlb').style.display='none';
  $('clwlb').onclick=e=>{if(e.target.id==='clwlb')$('clwlb').style.display='none';};
}
