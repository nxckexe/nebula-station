import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { INK } from '../data/appearance.js';
import { PLINKO_ROWS, PLINKO_MULT, PLINKO_COLS } from '../data/casino-games.js';

const PLW=320,PLH=340,PLCX=160,PLTOP=34,PLROWH=19,PLSP=23,PLSLOTY=272;
let plBet=100,plBalls=[],plRAF=null,plG=null,plBusy=false,plLast=null;

function plPegX(row,rights){return PLCX+(2*rights-row)*PLSP/2;}
function plPegY(row){return PLTOP+row*PLROWH;}
function plSlotX(k){return PLCX+(2*k-PLINKO_ROWS)*PLSP/2;}
function plFmt(m){return (m>=1?m:m.toFixed(1).replace('.',','))+'x';}
export function openPlinko(){$('plinko').style.display='flex';setLocked(true);$('plbal').textContent=(getMe()&&getMe().stardust)||0;
  const c=$('plCanvas'),dpr=Math.min(devicePixelRatio||1,3);c.width=PLW*dpr;c.height=PLH*dpr;plG=c.getContext('2d');plG.setTransform(dpr,0,0,dpr,0,0);
  if(!plRAF)plLoop();}
function closePlinko(){$('plinko').style.display='none';if(plRAF)cancelAnimationFrame(plRAF);plRAF=null;plBalls=[];plBusy=false;setLocked(false);}
function plDrop(){if(plBusy)return;if(((getMe()&&getMe().stardust)||0)<plBet){$('plmsg').textContent='Zu wenig Sternenstaub!';return;}
  plBusy=true;$('pldrop').disabled=true;$('plmsg').textContent=t('plinko_dropping');socket&&socket.emit('plinko-drop',{bet:plBet});}
function plStartBall(path,slot,mult,win,bet){
  plBalls.push({path,slot,mult,win,bet,t0:performance.now(),seg:0,done:false});}
function plBallPos(b,now){
  const SEG=95,drop=380;const el=now-b.t0;
  const seg=Math.floor(el/SEG);
  if(seg>=PLINKO_ROWS){
    // in den Slot fallen
    const t=Math.min(1,(el-PLINKO_ROWS*SEG)/drop);
    const sx=plSlotX(b.slot),sy0=plPegY(PLINKO_ROWS),sy1=PLSLOTY+26;
    const e=t*t; // beschleunigt
    if(t>=1)b.done=true;
    return{x:sx,y:sy0+(sy1-sy0)*e,land:t>=1};}
  const f=(el-seg*SEG)/SEG;
  let rights=0;for(let i=0;i<seg;i++)rights+=b.path[i];
  const x0=plPegX(seg,rights),y0=plPegY(seg);
  const r2=rights+b.path[seg];
  const x1=plPegX(seg+1,r2),y1=plPegY(seg+1);
  // Bogen: seitlich linear, vertikal mit kleinem Hüpfer
  const x=x0+(x1-x0)*f, y=y0+(y1-y0)*f-Math.sin(f*Math.PI)*5;
  return{x,y,land:false};}
function drawPlinkoModal(){const g=plG;if(!g)return;const now=performance.now();
  g.clearRect(0,0,PLW,PLH);
  // Rahmen
  g.fillStyle='#241a5c';g.strokeStyle=INK;g.lineWidth=3;
  g.beginPath();g.roundRect?g.roundRect(6,6,PLW-12,PLH-12,14):g.rect(6,6,PLW-12,PLH-12);g.fill();g.stroke();
  // Stifte
  for(let r=0;r<PLINKO_ROWS;r++)for(let j=0;j<=r;j++){
    const px=plPegX(r,j),py=plPegY(r);
    g.fillStyle='#fff';g.beginPath();g.arc(px,py,2.8,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(px,py,4.6,0,7);g.fill();}
  // Slots
  for(let k=0;k<=PLINKO_ROWS;k++){
    const sx=plSlotX(k),w=PLSP-2,m=PLINKO_MULT[k];
    const hot=plLast&&plLast.slot===k&&now-plLast.t<1600;
    g.fillStyle=PLINKO_COLS[k];g.globalAlpha=hot?1:.85;
    g.beginPath();g.roundRect?g.roundRect(sx-w/2,PLSLOTY,w,34,5):g.rect(sx-w/2,PLSLOTY,w,34);g.fill();g.globalAlpha=1;
    if(hot){g.strokeStyle='#fff';g.lineWidth=2;g.stroke();}
    g.fillStyle=INK;g.font='800 9px Fredoka';g.textAlign='center';
    g.save();g.translate(sx,PLSLOTY+21);if(m>=10)g.font='800 10px Fredoka';g.fillText(plFmt(m),0,0);g.restore();}
  // Kugeln
  for(const b of plBalls){const p=plBallPos(b,now);
    const gl=g.createRadialGradient(p.x,p.y,1,p.x,p.y,11);gl.addColorStop(0,'rgba(255,120,160,.55)');gl.addColorStop(1,'transparent');g.fillStyle=gl;g.beginPath();g.arc(p.x,p.y,11,0,7);g.fill();
    g.fillStyle='#e0396b';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,6,0,7);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.arc(p.x-2,p.y-2,2,0,7);g.fill();}
}
function plLoop(){if($('plinko').style.display==='none'){plRAF=null;return;}
  const now=performance.now();
  for(const b of plBalls){if(b.done&&!b.settled){b.settled=true;plLast={slot:b.slot,t:now};
      const net=b.win-b.bet;
      $('plmsg').textContent=plFmt(b.mult)+' → '+(net>=0?'+':'')+net+' Sternenstaub';
      $('plbal').textContent=(getMe()&&getMe().stardust)||0;
      plBusy=false;$('pldrop').disabled=false;
      if(b.mult>=5)showPopup('🔴',b.mult>=25?t('popup_plinko_jackpot'):t('popup_plinko_title'),plFmt(b.mult)+' – '+t('amount_stardust',{amount:net}),'gold');}}
  plBalls=plBalls.filter(b=>!b.settled||now-b.t0<3000);
  drawPlinkoModal();plRAF=requestAnimationFrame(plLoop);}

export function onPlinkoResult(d){
  if(!d.ok){plBusy=false;$('pldrop').disabled=false;$('plmsg').textContent=d.code?t(d.code):(d.text||'Fehler');return;}
  plStartBall(d.path,d.slot,d.mult,d.win,d.bet);
}

export function initPlinkoDom(){
  $('pldrop').onclick=plDrop;
  $('plclose').onclick=closePlinko;
  $('plinko').onclick=e=>{if(e.target.id==='plinko')closePlinko();};
  document.querySelectorAll('.plbet').forEach(b=>b.onclick=()=>{plBet=+b.dataset.bet;document.querySelectorAll('.plbet').forEach(x=>x.classList.remove('on'));b.classList.add('on');});
}
