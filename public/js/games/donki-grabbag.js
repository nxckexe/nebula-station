import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { INK } from '../data/appearance.js';

const COST=80;
const FOOD_ICON={onigiri:'🍙',egg_sando:'🥪',mitsuya_cider:'🥤'};

let dG=null, dRAF=null, dLast=0;
let phase='idle', animT=0, waitT=0, pending=false, lastResult=null;

export function openDonkiGrabbag(){
  const c=$('donkiCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=300*dpr;c.height=260*dpr;dG=c.getContext('2d');dG.setTransform(dpr,0,0,dpr,0,0);
  phase='idle';animT=0;waitT=0;pending=false;lastResult=null;
  $('donkiInfo').textContent=t('donki_cost',{price:COST});
  $('donki').style.display='flex';setLocked(true);dLast=performance.now();
  if(!dRAF)dLoop();
}
function closeDonkiGrabbag(){$('donki').style.display='none';if(dRAF)cancelAnimationFrame(dRAF);dRAF=null;setLocked(false);}
function tryPull(){
  if(phase!=='idle')return;
  const me=getMe();
  if(!me||(me.stardust||0)<COST){showPopup('🎁',t('popup_donki_title'),t('claw_no_funds'),'purple');return;}
  phase='shake';animT=0;waitT=0;pending=true;lastResult=null;
  socket&&socket.emit('donki-grabbag',{});
}
export function onDonkiResult(d){
  if(!d||!d.ok){
    pending=false;phase='idle';animT=0;
    if(d&&d.code==='err_funds')showPopup('🎁',t('popup_donki_title'),t('claw_no_funds'),'purple');
    return;
  }
  lastResult=d;pending=false;
  const me=getMe();if(me){me.stardust=d.stardust;if(d.inventory)me.inventory=d.inventory;}
  const bal=document.getElementById('orbs');if(bal)bal.textContent=d.stardust;
}
function revealPrize(){
  if(!lastResult)return;
  if(lastResult.type==='stardust'){
    showPopup('✨',t('popup_donki_title'),t('amount_stardust',{amount:lastResult.amount}),'gold');
  } else if(lastResult.type==='food'){
    showPopup(FOOD_ICON[lastResult.id]||'🎁',t('popup_donki_title'),t('donki_won_food'),'gold');
  }
}
function dLoop(){
  const now=performance.now(),dt=Math.min((now-dLast)/1000,.05);dLast=now;
  if($('donki').style.display==='none'){dRAF=null;return;}
  updateDonki(dt);
  drawDonki(now);
  dRAF=requestAnimationFrame(dLoop);
}
function updateDonki(dt){
  if(phase==='shake'){
    animT+=dt;
    if(animT>=0.7){
      if(pending){
        animT=0.7;waitT+=dt;
        if(waitT>3){pending=false;lastResult={type:'stardust',amount:0};} // Sicherheitsnetz bei Netzwerkausfall
      } else if(lastResult){phase='reveal';animT=0;}
    }
  } else if(phase==='reveal'){
    animT+=dt;
    if(animT>1.6){revealPrize();phase='idle';animT=0;}
  }
}
function drawDonki(now){
  const g=dG;
  g.fillStyle='#241a00';g.fillRect(0,0,300,260);
  g.save();g.beginPath();g.rect(0,0,300,260);g.clip();
  for(let i=-2;i<12;i++){g.fillStyle=i%2?'#0a0a0a':'#ffe15e';g.save();g.translate(i*44,0);g.rotate(-0.35);g.fillRect(-20,-20,40,300);g.restore();}
  g.restore();
  const cx=150,cy=150;
  let shakeX=0;
  if(phase==='shake')shakeX=Math.sin(animT*40)*(pending?6:6*Math.max(0,1-animT/0.7));
  g.save();g.translate(cx+shakeX,cy);
  if(phase==='reveal'){
    const p=Math.min(1,animT/0.5);
    g.scale(1+p*0.4,1+p*0.4);g.globalAlpha=Math.max(0,1-Math.max(0,animT-0.5)/1.1);
  }
  g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=4;
  g.beginPath();g.moveTo(-38,-40);g.lineTo(38,-40);g.lineTo(48,60);g.lineTo(-48,60);g.closePath();g.fill();g.stroke();
  g.fillStyle='#e2231a';g.font='800 26px Fredoka';g.textAlign='center';g.fillText('?',0,10);
  g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(-20,-40);g.quadraticCurveTo(-20,-60,0,-60);g.quadraticCurveTo(20,-60,20,-40);g.stroke();
  g.restore();
  if(phase==='reveal'&&animT>0.5&&lastResult){
    const p2=Math.min(1,(animT-0.5)/0.4);
    g.globalAlpha=p2;g.font=(20+p2*10)+'px serif';g.textAlign='center';
    const icon=lastResult.type==='stardust'?'✨':(FOOD_ICON[lastResult.id]||'🎁');
    g.fillText(icon,cx,cy-40-p2*20);
    g.globalAlpha=1;
  }
  g.fillStyle='#fff';g.font='800 20px Fredoka';g.textAlign='center';g.strokeStyle=INK;g.lineWidth=3;
  g.strokeText('MYSTERY BAG',150,26);g.fillText('MYSTERY BAG',150,26);
  if(phase==='shake'&&pending&&animT>=0.7){g.fillStyle='#ffe15e';g.font='700 12px Fredoka';g.fillText(t('loading'),150,230);}
}
export function initDonkiGrabbagDom(){
  $('donkiclose').onclick=closeDonkiGrabbag;
  $('donkiPullBtn').onclick=tryPull;
  $('donki').onclick=e=>{if(e.target.id==='donki')closeDonkiGrabbag();};
}
