import { $, t, showPopup, setLocked, getMe, getLang } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl } from '../render-utils.js';
import { INK } from '../data/appearance.js';
import { ROU_RED, ROU_ORDER } from '../data/casino-games.js';

let rouState=null,rouMyBets=[],rouChip=100,rouAngle=0,rouAnim=null,rouRAF=null,rouG=null,rouLastWin=null,rouSkew=0;

export function rouCol(n){return n===0?'#1aa661':(ROU_RED.has(n)?'#e0396b':'#2b1b52');}

function rouLabel(b){const m={red:t('roul_red'),black:t('roul_black'),even:t('roul_even'),odd:t('roul_odd'),low:t('roul_low'),high:t('roul_high')};
  if(b.type==='number')return (getLang()==='ja'?'数字 ':'Zahl ')+b.value;
  if(b.type==='dozen')return t('roul_dozen'+b.value);
  return m[b.type]||b.type;}
export function openRoul(){$('roul').style.display='flex';setLocked(true);
  const c=$('roulCanvas'),dpr=Math.min(devicePixelRatio||1,3);c.width=150*dpr;c.height=150*dpr;rouG=c.getContext('2d');rouG.setTransform(dpr,0,0,dpr,0,0);
  buildRouNums();socket&&socket.emit('roul-sync');if(!rouRAF)rouLoop();}
function closeRoul(){$('roul').style.display='none';if(rouRAF)cancelAnimationFrame(rouRAF);rouRAF=null;setLocked(false);}
function buildRouNums(){const g=$('rounums');if(g.dataset.built)return;g.dataset.built='1';
  for(let n=0;n<=36;n++){const b=document.createElement('button');b.className='roun';b.textContent=n;
    b.style.background=rouCol(n);b.onclick=()=>rouPlace('number',n);g.appendChild(b);}}
function rouPlace(type,value){
  if(!rouState||rouState.phase!=='bet'){$('roulmsg').textContent=t('err_roul_closed');return;}
  if(((getMe()&&getMe().stardust)||0)<rouChip){$('roulmsg').textContent=t('err_funds');return;}
  socket&&socket.emit('roul-bet',{type,value,amount:rouChip});}
function renderRouMine(){
  if(!rouMyBets.length){$('roulmine').textContent=t('roul_no_bets');return;}
  const tot=rouMyBets.reduce((s,b)=>s+b.amount,0);
  $('roulmine').innerHTML='<b>'+(getLang()==='ja'?'あなたの合計ベット: '+tot:'Dein Einsatz: '+tot)+'</b> — '+rouMyBets.map(b=>rouLabel(b)+' ('+b.amount+')').join(', ');}
function renderRouPanel(){
  const s=rouState;if(!s)return;
  $('roulhist').innerHTML=(s.history||[]).map(h=>'<div class="rouh" style="background:'+rouCol(h.n)+'">'+h.n+'</div>').join('');
  const ps=(s.players||[]);
  $('roulplayers').innerHTML=ps.length?ps.map(p=>'<div class="roulp"><span style="color:'+(p.color||'#333')+'">'+p.name+'</span><span>'+p.total+'</span></div>').join(''):'<div class="roulp" style="color:#8a76c4">'+t('roul_no_bets_yet')+'</div>';
  // Zahlen markieren
  document.querySelectorAll('.roun').forEach((el,n)=>{el.classList.toggle('sel',rouMyBets.some(b=>b.type==='number'&&b.value===n));});}
function rouPhaseText(){
  const s=rouState;if(!s)return '…';
  const left=Math.max(0,Math.ceil((s.endsAt-Date.now()-rouSkew)/1000));
  if(s.phase==='bet')return t('roul_bets_open')+left+'s';
  if(s.phase==='spin')return t('roul_ball_rolling');
  return t('roul_result_prefix')+(s.number!=null?s.number:'?')+t('roul_next_round')+left+'s';}
function drawRouWheel(){const g=rouG;if(!g)return;const cx=75,cy=75,R=64,N=37,seg=2*Math.PI/N;
  g.clearRect(0,0,150,150);
  g.save();g.translate(cx,cy);g.rotate(rouAngle);
  for(let i=0;i<N;i++){const n=ROU_ORDER[i];
    g.beginPath();g.moveTo(0,0);g.arc(0,0,R,i*seg,(i+1)*seg);g.closePath();
    g.fillStyle=rouCol(n);g.fill();g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1;g.stroke();
    g.save();g.rotate(i*seg+seg/2);g.fillStyle='#fff';g.font='700 8px Fredoka';g.textAlign='right';g.fillText(String(n),R-3,3);g.restore();}
  g.restore();
  g.strokeStyle='#ffd166';g.lineWidth=4;g.beginPath();g.arc(cx,cy,R+2,0,7);g.stroke();
  g.fillStyle='#ffd166';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(cx,cy,13,0,7);g.fill();g.stroke();
  // Kugel
  if(rouAnim||rouState&&rouState.number!=null){
    const idx=ROU_ORDER.indexOf(rouState&&rouState.number!=null?rouState.number:0);
    const ba=rouAngle+idx*seg+seg/2;const br=R-11;
    g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.arc(cx+Math.cos(ba)*br,cy+Math.sin(ba)*br,4.5,0,7);g.fill();g.stroke();}
  // Zeiger
  g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.moveTo(cx,cy-R-9);g.lineTo(cx-5,cy-R+3);g.lineTo(cx+5,cy-R+3);g.closePath();g.fill();g.stroke();}
function rouLoop(){if($('roul').style.display==='none'){rouRAF=null;return;}
  if(rouAnim){const t=Math.min(1,(performance.now()-rouAnim.t0)/rouAnim.dur),e=1-Math.pow(1-t,3);
    rouAngle=rouAnim.start+(rouAnim.end-rouAnim.start)*e;
    if(t>=1){rouAngle=((rouAnim.end%(2*Math.PI))+2*Math.PI)%(2*Math.PI);rouAnim=null;}}
  else if(!rouState||rouState.phase==='bet')rouAngle+=0.004;
  $('roulphase').textContent=rouPhaseText();
  drawRouWheel();rouRAF=requestAnimationFrame(rouLoop);}

export function drawRouLive(ctx,x,y){
  const s=rouState;if(!s)return;
  const ps=(s.players||[]).slice(0,3);
  const w=210,h=40+ps.length*15+(s.history&&s.history.length?18:0);
  let px=x-w/2,py=y-92-h;if(py<250)py=250;
  ctx.fillStyle='rgba(28,17,58,.93)';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;roundRectImpl(ctx,px,py,w,h,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(28,17,58,.93)';ctx.beginPath();ctx.moveTo(x-9,py+h-1);ctx.lineTo(x+9,py+h-1);ctx.lineTo(x,py+h+11);ctx.closePath();ctx.fill();
  const left=Math.max(0,Math.ceil((s.endsAt-Date.now())/1000));
  ctx.textAlign='center';ctx.font='800 11px Fredoka';
  if(s.phase==='bet'){ctx.fillStyle='#7be0b0';ctx.fillText(t('roul_bets_open_short')+left+'s',x,py+16);}
  else if(s.phase==='spin'){ctx.fillStyle='#ffd166';ctx.fillText('KUGEL ROLLT…',x,py+16);}
  else{ctx.fillStyle='#fff';ctx.fillText('ERGEBNIS: '+(s.number!=null?s.number:'?'),x,py+16);}
  let ry=py+30;
  if(ps.length){for(const p of ps){ctx.textAlign='left';ctx.fillStyle=p.color||'#fff';ctx.font='700 10px Fredoka';ctx.fillText((p.name||'?').slice(0,12),px+10,ry);
    ctx.textAlign='right';ctx.fillStyle='#ffd166';ctx.fillText(String(p.total),px+w-10,ry);ry+=15;}}
  else{ctx.textAlign='center';ctx.fillStyle='#8a76c4';ctx.font='600 10px Fredoka';ctx.fillText('Noch keine Einsätze',x,ry);ry+=15;}
  if(s.history&&s.history.length){let hx=px+10;ctx.textAlign='center';
    for(const hh of s.history.slice(0,8)){ctx.fillStyle=rouCol(hh.n);roundRectImpl(ctx,hx,ry-1,20,14,4);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 9px Fredoka';ctx.fillText(String(hh.n),hx+10,ry+9);hx+=24;}}
}

export function onRoulState(s){const prev=rouState;rouState=s;
  if(!prev||prev.round!==s.round){rouMyBets=[];renderRouMine();}
  if(s.phase==='bet'&&$('roul').style.display!=='none'&&(!prev||prev.phase!=='bet'))$('roulmsg').textContent='Neue Runde – setze deine Chips!';
  if($('roul').style.display!=='none')renderRouPanel();}
export function onRoulMybets(d){rouMyBets=d.list||[];renderRouMine();renderRouPanel();}
export function onRoulMsg(d){$('roulmsg').textContent=d.code?t(d.code):(d.text||'');}
export function onRoulSpin(d){
  if(rouState){rouState.phase='spin';rouState.number=d.number;rouState.endsAt=d.endsAt;}
  const idx=ROU_ORDER.indexOf(d.number),seg=2*Math.PI/37;
  // Rad so drehen, dass die Gewinnzahl oben unter dem Zeiger landet
  let end=-Math.PI/2-(idx*seg+seg/2);
  while(end<rouAngle+6*2*Math.PI)end+=2*Math.PI;
  rouAnim={start:rouAngle,end,t0:performance.now(),dur:7400};}
export function onRoulWin(d){
  rouLastWin=d;
  const c=d.number===0?t('roul_green'):(ROU_RED.has(d.number)?t('roul_red'):t('roul_black'));
  const numLabel=(getLang()==='ja'?'数字'+d.number:'Zahl '+d.number);
  if(d.staked>0){
    $('roulmsg').textContent=numLabel+' ('+c+') → '+(d.net>=0?'+':'')+d.net+' '+t('shop_currency_suffix');
    if(d.net>0)showPopup('🎯',t('popup_roulette_title'),(getLang()==='ja'?numLabel+' – ':numLabel+' – ')+t('amount_stardust',{amount:d.net}),'gold');}
  else $('roulmsg').textContent=numLabel+' ('+c+')';
  rouMyBets=[];renderRouMine();}

export function initRouletteDom(){
  $('roulclose').onclick=closeRoul;
  $('roul').onclick=e=>{if(e.target.id==='roul')closeRoul();};
  $('roulclear').onclick=()=>socket&&socket.emit('roul-clear');
  document.querySelectorAll('.roubet').forEach(b=>b.onclick=()=>{rouChip=+b.dataset.chip;document.querySelectorAll('.roubet').forEach(x=>x.classList.remove('on'));b.classList.add('on');});
  document.querySelectorAll('.roub').forEach(b=>b.onclick=()=>rouPlace(b.dataset.t,b.dataset.v?+b.dataset.v:null));
}
