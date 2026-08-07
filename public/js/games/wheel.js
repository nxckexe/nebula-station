import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { INK } from '../data/appearance.js';
import { WHEEL_VALUES, WHEEL_COLS } from '../data/casino-games.js';

let wheelReady=false,wheelWait=0,wheelG=null,wheelAngle=0,wheelSpinning=false,wheelRAF=null,wheelTarget=null,wheelAnim=null;

export function isWheelReady(){ return wheelReady; }

function fmtWait(ms){const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+'h '+m+'m';}
function updateWheelBtn(){const b=$('wheelspin'),msg=$('wheelmsg');if(!b)return;
  if(wheelSpinning){b.disabled=true;b.textContent=t('wheel_spinning');msg.textContent=t('wheel_spin_msg');return;}
  if(wheelReady){b.disabled=false;b.textContent=t('wheel_spin_btn');msg.textContent=t('wheel_ready_msg');}
  else{b.disabled=true;b.textContent='⏳ '+fmtWait(wheelWait);msg.textContent=t('wheel_wait_msg',{wait:fmtWait(wheelWait)});}}
export function openWheel(){$('wheel').style.display='flex';setLocked(true);
  const c=$('wheelCanvas'),dpr=Math.min(devicePixelRatio||1,3);c.width=300*dpr;c.height=320*dpr;wheelG=c.getContext('2d');wheelG.setTransform(dpr,0,0,dpr,0,0);
  updateWheelBtn();if(!wheelRAF)wheelModalLoop();}
function closeWheel(){$('wheel').style.display='none';if(wheelRAF)cancelAnimationFrame(wheelRAF);wheelRAF=null;wheelSpinning=false;wheelAnim=null;wheelTarget=null;setLocked(false);}
function spinWheel(){if(wheelSpinning||!wheelReady)return;wheelSpinning=true;updateWheelBtn();socket&&socket.emit('wheel-spin');}
function drawWheelModal(){const g=wheelG;if(!g)return;const cx=150,cy=160,R=118,seg=Math.PI/4,now=performance.now();
  g.clearRect(0,0,300,320);
  g.save();g.translate(cx,cy);g.rotate(wheelAngle);
  for(let i=0;i<8;i++){g.beginPath();g.moveTo(0,0);g.arc(0,0,R,i*seg,(i+1)*seg);g.closePath();g.fillStyle=WHEEL_COLS[i];g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
    g.save();g.rotate(i*seg+seg/2);g.translate(R*0.6,0);g.rotate(Math.PI/2);g.fillStyle=INK;g.font='700 15px Fredoka';g.textAlign='center';g.fillText(WHEEL_VALUES[i]===2000?'JACKPOT':String(WHEEL_VALUES[i]),0,5);g.restore();}
  g.restore();
  g.strokeStyle='#ffd166';g.lineWidth=6;g.beginPath();g.arc(cx,cy,R+5,0,7);g.stroke();
  for(let i=0;i<16;i++){const a=i/16*6.283;g.fillStyle=Math.sin(now/200+i)>0?'#fff2c0':'#d99a1f';g.beginPath();g.arc(cx+Math.cos(a)*(R+5),cy+Math.sin(a)*(R+5),3.6,0,7);g.fill();}
  g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.arc(cx,cy,16,0,7);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(cx-4,cy-4,4,0,7);g.fill();
  g.fillStyle='#e0396b';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(cx,cy-R-14);g.lineTo(cx-12,cy-R+8);g.lineTo(cx+12,cy-R+8);g.closePath();g.fill();g.stroke();}
function wheelModalLoop(){if($('wheel').style.display==='none'){wheelRAF=null;return;}
  if(wheelAnim){const wp=Math.min(1,(performance.now()-wheelAnim.t0)/wheelAnim.dur),e=1-Math.pow(1-wp,3);
    wheelAngle=wheelAnim.start+(wheelAnim.end-wheelAnim.start)*e;
    if(wp>=1){wheelAngle=((wheelAnim.end%(2*Math.PI))+2*Math.PI)%(2*Math.PI);wheelAnim=null;wheelSpinning=false;wheelReady=false;wheelWait=24*3600*1000;
      const w=wheelTarget;wheelTarget=null;updateWheelBtn();
      if(w)showPopup(w.amount>=2000?'🎉':'🎡',w.amount>=2000?t('popup_jackpot'):t('popup_wheel_title'),t('amount_stardust',{amount:w.amount}),'gold');}}
  drawWheelModal();wheelRAF=requestAnimationFrame(wheelModalLoop);}

export function onWheelStatus(d){wheelReady=!!d.ready;wheelWait=d.wait||0;if($('wheel').style.display!=='none')updateWheelBtn();}
export function onWheelResult(d){
  if(!d.ok){wheelSpinning=false;wheelReady=false;wheelWait=d.wait||0;updateWheelBtn();return;}
  wheelReady=false;wheelWait=24*3600*1000;
  const seg=Math.PI/4,turns=5,targetCenter=-Math.PI/2-(d.index*seg+seg/2);let end=targetCenter;while(end<wheelAngle+turns*2*Math.PI)end+=2*Math.PI;
  wheelTarget={index:d.index,amount:d.amount,stardust:d.stardust};wheelAnim={start:wheelAngle,end,t0:performance.now(),dur:4200};
}

export function initWheelDom(){
  $('wheelspin').onclick=spinWheel;
  $('wheelclose').onclick=closeWheel;
  $('wheel').onclick=e=>{if(e.target.id==='wheel')closeWheel();};
}
