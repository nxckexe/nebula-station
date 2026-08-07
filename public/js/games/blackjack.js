import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl } from '../render-utils.js';
import { INK } from '../data/appearance.js';
import { buildBets } from './bet-ui.js';

const SUITS=['♠','♥','♦','♣'];
let bjBet=100,bjCanDouble=false;
let bjLive={},bjMyTable=-1;

function bjRank(r){return r===1?'A':r===11?'J':r===12?'Q':r===13?'K':String(r);}

export function getBjLive(){ return bjLive; }
export function resetBjLive(){ bjLive={}; }

export function openBj(ti){bjMyTable=ti;$('bj').style.display='flex';setLocked(true);$('bjbal').textContent=(getMe()&&getMe().stardust)||0;refreshBjBets(ti===2);socket&&socket.emit('bj-open',{table:ti});}
function closeBj(){$('bj').style.display='none';setLocked(false);socket&&socket.emit('bj-close');bjMyTable=-1;}
function bjButtons(mode){
  $('bjdeal').style.display=(mode==='pre'||mode==='over')?'':'none';
  $('bjhit').style.display=mode==='play'?'':'none';
  $('bjstand').style.display=mode==='play'?'':'none';
  $('bjdouble').style.display=(mode==='play'&&bjCanDouble)?'':'none';
  $('bjbets').style.display=mode==='play'?'none':'flex';
  $('bjdeal').textContent=mode==='over'?'Nochmal':'Karten geben';}
function bjCards(el,cards){el.innerHTML='';for(const c of cards){const d=document.createElement('div');
  if(c.hidden){d.className='bjcard back';d.textContent='★';}
  else{const red=(c.s===1||c.s===2);d.className='bjcard'+(red?' red':'');d.innerHTML=bjRank(c.r)+'<span style="font-size:14px">'+SUITS[c.s]+'</span>';}
  el.appendChild(d);}}
function refreshBjBets(vip){bjBet=buildBets('bjbets','bjbet',vip,bjBet,v=>bjBet=v);}

function bjMiniCard(ctx,x,y,card){const w=17,h=23;  if(!card||card.hidden){ctx.fillStyle='#7a1233';ctx.strokeStyle='#ffd166';ctx.lineWidth=1.5;roundRectImpl(ctx,x,y,w,h,3);ctx.fill();ctx.stroke();ctx.fillStyle='#ffd166';ctx.font='700 10px Fredoka';ctx.textAlign='center';ctx.fillText('★',x+w/2,y+15);return;}
  ctx.fillStyle='#fff';ctx.strokeStyle=INK;ctx.lineWidth=1.5;roundRectImpl(ctx,x,y,w,h,3);ctx.fill();ctx.stroke();
  const red=(card.s===1||card.s===2);ctx.fillStyle=red?'#e0396b':INK;ctx.textAlign='center';
  ctx.font='800 10px Fredoka';ctx.fillText(bjRank(card.r),x+w/2,y+11);
  ctx.font='700 9px Fredoka';ctx.fillText(SUITS[card.s],x+w/2,y+20);}
export function drawBjLive(ctx,table,tx,ty){
  const list=Object.values(bjLive).filter(e=>e.table===table);if(!list.length)return;
  list.sort((a,b)=>(a.id<b.id?-1:1));const shown=list.slice(0,2);
  const rowH=40,w=236,h=24+shown.length*rowH+(list.length>2?14:6);
  let px=tx-w/2, py=ty-70-h; if(py<250)py=250;
  ctx.fillStyle='rgba(28,17,58,.93)';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;roundRectImpl(ctx,px,py,w,h,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(28,17,58,.93)';ctx.beginPath();ctx.moveTo(tx-9,py+h-1);ctx.lineTo(tx+9,py+h-1);ctx.lineTo(tx,py+h+11);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd166';ctx.font='800 11px Fredoka';ctx.textAlign='center';ctx.fillText('♠ TISCH '+(table+1)+' ♥',tx,py+15);
  let ry=py+26;
  for(const e of shown){
    ctx.fillStyle=e.color||'#fff';ctx.font='700 11px Fredoka';ctx.textAlign='left';ctx.fillText((e.name||'?').slice(0,10),px+10,ry+9);
    let st='',stc='#ffd166';
    if(e.done){st=({blackjack:t('canvas_bj_blackjack'),win:t('canvas_bj_win'),lose:t('canvas_bj_lose'),bust:t('canvas_bj_bust'),push:t('canvas_bj_push')})[e.outcome]||'';stc=(e.outcome==='win'||e.outcome==='blackjack')?'#7be0b0':(e.outcome==='push'?'#ffd166':'#ff6b8a');}
    else if(e.active)st='spielt…';else st='setzt…';
    ctx.fillStyle=stc;ctx.font='700 9px Fredoka';ctx.textAlign='right';ctx.fillText(st,px+w-10,ry+9);
    const cy=ry+13;let cx=px+10;
    ctx.fillStyle='#cbb3ff';ctx.font='700 9px Fredoka';ctx.textAlign='left';ctx.fillText('D',cx,cy+15);cx+=12;
    for(const c of (e.dealer||[]).slice(0,4)){bjMiniCard(ctx,cx,cy,c);cx+=13;}
    if(e.dVal!=null){ctx.fillStyle='#cbb3ff';ctx.font='800 11px Fredoka';ctx.fillText(String(e.dVal),cx+2,cy+15);cx+=17;}else cx+=6;
    cx+=6;ctx.fillStyle='#8fe3ff';ctx.font='700 9px Fredoka';ctx.fillText('S',cx,cy+15);cx+=12;
    for(const c of (e.player||[]).slice(0,5)){bjMiniCard(ctx,cx,cy,c);cx+=13;}
    if(e.player&&e.player.length){ctx.fillStyle='#8fe3ff';ctx.font='800 11px Fredoka';ctx.fillText(String(e.pVal),cx+2,cy+15);}
    ry+=rowH;}
  if(list.length>2){ctx.fillStyle='#cbb3ff';ctx.font='600 9px Fredoka';ctx.textAlign='center';ctx.fillText(t('bj_more_players',{n:list.length-2}),tx,py+h-6);}
}

export function onBjIdle(){bjCanDouble=false;$('bjdealer').innerHTML='';$('bjplayer').innerHTML='';$('bjdval').textContent='';$('bjpval').textContent='';$('bjmsg').textContent='Setze deinen Einsatz und gib die Karten!';bjButtons('pre');$('bjbal').textContent=(getMe()&&getMe().stardust)||0;}
export function onBjState(d){if(d.errorCode||d.error){$('bjmsg').textContent=d.errorCode?t(d.errorCode):d.error;return;}
  bjCards($('bjdealer'),d.dealer);bjCards($('bjplayer'),d.player);
  $('bjpval').textContent=d.pVal;$('bjdval').textContent=(d.reveal&&d.dVal!=null)?d.dVal:'?';
  bjCanDouble=!!d.canDouble;
  if(d.done){bjButtons('over');}else{$('bjmsg').textContent=t('bj_hit_or_stand');bjButtons('play');}
  $('bjbal').textContent=(getMe()&&getMe().stardust)||0;}
export function onBjResult(d){
  const outText={blackjack:t('bj_out_blackjack'),win:t('bj_out_win'),lose:t('bj_out_lose'),bust:t('bj_out_bust'),push:t('bj_out_push')}[d.outcome]||'';
  const net=d.payout-d.bet;$('bjmsg').textContent=outText+'  ('+(net>=0?'+':'')+net+')';
  bjCanDouble=false;bjButtons('over');$('bjbal').textContent=(getMe()&&getMe().stardust)||0;
  if(d.outcome==='win'||d.outcome==='blackjack')showPopup('♠',t('popup_bj_title'),t('amount_stardust',{amount:net}),'gold');}
export function onBjMsg(d){$('bjmsg').textContent=d.code?t(d.code):(d.text||'');}
export function onBjLive(d){if(d&&d.id)bjLive[d.id]=d;}
export function onBjLiveClear(d){if(d&&d.id)delete bjLive[d.id];}

export function initBlackjackDom(){
  $('bjclose').onclick=closeBj;
  $('bj').onclick=e=>{if(e.target.id==='bj')closeBj();};
  $('bjdeal').onclick=()=>{if(((getMe()&&getMe().stardust)||0)<bjBet){$('bjmsg').textContent='Zu wenig Sternenstaub!';return;}socket&&socket.emit('bj-deal',{bet:bjBet});};
  $('bjhit').onclick=()=>socket&&socket.emit('bj-hit');
  $('bjstand').onclick=()=>socket&&socket.emit('bj-stand');
  $('bjdouble').onclick=()=>socket&&socket.emit('bj-double');
}
