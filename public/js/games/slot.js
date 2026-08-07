import { $, t, showPopup, setLocked, getMe, myRoom } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl } from '../render-utils.js';
import { INK } from '../data/appearance.js';
import { buildBets } from './bet-ui.js';

const SLOT_SYMBOLS=['🍒','🍋','🍊','🍉','🔔','⭐','7️⃣'];
let slotRAF=null,slotG=null,slotBet=500,slotReels=null,slotLever=0,slotSpinning=false,slotWinFlash=0;
let slotLeverTarget=0,slotPending=null,slotLast=performance.now();

function refreshSlotBets(){slotBet=buildBets('slotbets','betb',myRoom()==='vip',slotBet,v=>slotBet=v);}

export function openSlot(){$('slotbal').textContent=(getMe()&&getMe().stardust)||0;$('slotmsg').textContent=myRoom()==='vip'?'💎 High-Roller-Automat – zieh am Hebel!':'Zieh am Hebel! 🍒🍋🍊';refreshSlotBets();
  if(!slotReels)slotReels=[0,1,2].map(()=>({pos:Math.random()*7,vel:0,state:'idle',landing:0,target:0,stopAt:0}));
  slotSpinning=false;slotLever=0;slotLeverTarget=0;slotWinFlash=0;slotPending=null;
  const c=$('slotCanvas'),dpr=Math.min(devicePixelRatio||1,3);c.width=360*dpr;c.height=480*dpr;slotG=c.getContext('2d');slotG.setTransform(dpr,0,0,dpr,0,0);
  $('slot').style.display='flex';slotLast=performance.now();setLocked(true);if(!slotRAF)slotLoop();}
function closeSlot(){$('slot').style.display='none';if(slotRAF)cancelAnimationFrame(slotRAF);slotRAF=null;setLocked(false);}
function slotPull(){if(slotSpinning||!getMe())return;if((getMe().stardust||0)<slotBet){$('slotmsg').textContent='Zu wenig Sternenstaub!';return;}
  slotSpinning=true;slotWinFlash=0;$('slotmsg').textContent=t('slot_good_luck');
  slotLeverTarget=1;setTimeout(()=>{slotLeverTarget=0;},260);
  slotReels.forEach(r=>{r.state='spin';r.vel=26+Math.random()*4;r.stopAt=0;});
  socket&&socket.emit('slot-spin',{bet:slotBet});}
function slotLoop(){const now=performance.now();const dt=Math.min((now-slotLast)/1000,.05);slotLast=now;
  if($('slot').style.display==='none'){slotRAF=null;return;}
  slotLever+=(slotLeverTarget-slotLever)*Math.min(1,dt*12);
  if(slotReels){let allDone=true;
    for(const r of slotReels){
      if(r.state==='spin'){r.pos+=r.vel*dt;if(r.stopAt&&now>=r.stopAt){let land=Math.ceil(r.pos)+3;while((((land%7)+7)%7)!==r.target)land++;r.landing=land;r.state='land';}allDone=false;}
      else if(r.state==='land'){r.pos+=(r.landing-r.pos)*Math.min(1,dt*7);if(Math.abs(r.landing-r.pos)<0.01){r.pos=r.landing;r.state='done';}allDone=false;}
    }
    if(slotSpinning&&allDone&&slotPending){slotSpinning=false;const p=slotPending;slotPending=null;
      $('slotbal').textContent=p.stardust;if(getMe())getMe().stardust=p.stardust;document.getElementById('orbs').textContent=p.stardust;
      if(p.win>0){slotWinFlash=1.3;$('slotmsg').textContent=t('slot_win_flash',{amount:p.win});showPopup('🎰',t('popup_slot_title'),t('amount_stardust',{amount:p.win}),'gold');}
      else $('slotmsg').textContent=t('slot_no_luck');}}
  if(slotWinFlash>0)slotWinFlash-=dt;
  drawSlotMachine();slotRAF=requestAnimationFrame(slotLoop);}
function drawSlotMachine(){const g=slotG,now=performance.now();g.clearRect(0,0,360,480);
  // Korpus
  g.fillStyle='#a01f4a';g.strokeStyle=INK;g.lineWidth=6;roundRectImpl(g,16,16,328,448,28);g.fill();g.stroke();
  g.fillStyle='#e0396b';roundRectImpl(g,28,28,304,424,22);g.fill();
  // Glühbirnen-Rahmen
  const bulb=(bx,by,ph)=>{g.fillStyle=Math.sin(now/220+ph)>0?'#fff7cc':'#a8863a';g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.arc(bx,by,4,0,7);g.fill();g.stroke();};
  for(let i=0;i<11;i++)bulb(40+i*28,26,i);
  for(let i=0;i<15;i++){bulb(26,54+i*28,i+3);bulb(334,54+i*28,i+6);}
  // Marquee
  g.fillStyle='#2b1b52';roundRectImpl(g,50,46,260,56,16);g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
  g.fillStyle='#ffd166';g.font='800 24px Fredoka';g.textAlign='center';g.fillText('NICKUSCH',180,74);
  g.fillStyle='#4dd0ff';g.font='700 12px Fredoka';g.fillText('★ INDUSTRIES ★',180,92);
  // Walzenfenster
  g.fillStyle='#160f34';roundRectImpl(g,46,120,268,150,16);g.fill();g.strokeStyle=INK;g.lineWidth=4;g.stroke();
  const cx=[112,180,248],winY=132,winH=126,symH=46,centerY=winY+winH/2;
  for(let ri=0;ri<3;ri++){const r=slotReels[ri];g.save();roundRectImpl(g,cx[ri]-38,winY,76,winH,10);g.clip();
    g.fillStyle='#fff';g.fillRect(cx[ri]-38,winY,76,winH);
    g.font='40px serif';g.textAlign='center';g.textBaseline='middle';
    const base=Math.floor(r.pos),frac=r.pos-base;
    for(let k=-1;k<=2;k++){const idx=((((base+k)%7)+7)%7);g.fillText(SLOT_SYMBOLS[idx],cx[ri],centerY+(k-frac)*symH);}
    g.restore();g.textBaseline='alphabetic';
    g.strokeStyle=INK;g.lineWidth=3;roundRectImpl(g,cx[ri]-38,winY,76,winH,10);g.stroke();}
  // Gewinnlinie
  g.strokeStyle=slotWinFlash>0?('rgba(255,209,102,'+(0.5+0.5*Math.sin(now/80))+')'):'rgba(255,94,168,.8)';g.lineWidth=4;
  g.beginPath();g.moveTo(52,centerY);g.lineTo(308,centerY);g.stroke();
  // untere Blende + Knöpfe
  g.fillStyle='#7a1638';roundRectImpl(g,46,286,268,150,16);g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
  g.fillStyle='#ffd166';g.font='700 12px Fredoka';g.textAlign='center';g.fillText('CREDITS',180,312);
  g.fillStyle='#1c1442';roundRectImpl(g,120,320,120,26,8);g.fill();g.fillStyle='#7be0b0';g.font='700 16px Fredoka';g.fillText(((getMe()&&getMe().stardust)||0),180,339);
  // Münzschale
  g.fillStyle='#2b1b52';roundRectImpl(g,110,400,140,22,10);g.fill();g.strokeStyle=INK;g.stroke();
  // Hebel rechts
  const baseY=300,ly=344,leverTop=baseY-70+slotLever*66;
  g.fillStyle='#2b1b52';roundRectImpl(g,336,baseY-6,16,26,4);g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
  g.strokeStyle=INK;g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(ly,baseY);g.lineTo(ly,leverTop);g.stroke();
  g.fillStyle='#ff3b6b';g.beginPath();g.arc(ly,leverTop,13,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
  g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(ly-4,leverTop-4,4,0,7);g.fill();
  // Win-Flash Rahmen
  if(slotWinFlash>0){g.strokeStyle='rgba(255,209,102,'+Math.min(1,slotWinFlash)+')';g.lineWidth=8;roundRectImpl(g,16,16,328,448,28);g.stroke();}
}

export function onSlotResult(d){
  if(!d.ok){slotSpinning=false;if(slotReels)slotReels.forEach(r=>r.state='idle');$('slotmsg').textContent=d.code?t(d.code):(d.text||'Fehler');return;}
  slotPending={win:d.win,bet:d.bet,stardust:d.stardust};const now=performance.now();
  if(slotReels)slotReels.forEach((r,i)=>{r.target=d.reels[i];r.stopAt=now+700+i*450;});
}

export function initSlotDom(){
  $('slotclose').onclick=closeSlot;
  $('slot').onclick=e=>{if(e.target.id==='slot')closeSlot();};
  $('slotCanvas').addEventListener('pointerdown',e=>{const c=$('slotCanvas'),r=c.getBoundingClientRect();const px=(e.clientX-r.left)*(360/r.width);if(px>316)slotPull();});
}
