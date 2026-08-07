import { $, t, addMsg, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { clamp, esc } from '../render-utils.js';

export const C4_TABLES=[{x:250,y:445,r:60},{x:520,y:445,r:60},{x:790,y:445,r:60}];

let cg=null,pendingSit=false,sitTable=-1,menuTable=-1;

export function requestSit(ti){const me=getMe();if(!me)return;const t=C4_TABLES[ti];sitTable=ti;setLocked(true);
  me.tx=clamp(t.x,80,1040-80);me.ty=clamp(t.y+70,250,620-40);pendingSit=true;
  addMsg('','','Du gehst zu Tisch '+(ti+1)+'…','sys');}
export function checkArrivedAtTable(me){
  if(pendingSit&&Math.hypot(me.x-me.tx,me.y-me.ty)<10){pendingSit=false;socket&&socket.emit('c4-sit',{table:sitTable});}
}
export function openC4Menu(ti){menuTable=ti;$('c4mtable').textContent='Tisch '+(ti+1);$('c4menu').style.display='flex';}
function renderLeaderboard(rows){const el=$('lblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('c4_no_wins')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    row.innerHTML='<span class="lbrank">'+(i+1)+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">🏆 '+(r.wins||0)+'</span><span class="lbstar">✦ '+(r.game_stardust||0)+'</span>';
    el.appendChild(row);});}
function buildC4(){const bd=$('c4board');bd.innerHTML='';
  for(let i=0;i<42;i++){const c=document.createElement('div');c.className='c4cell';c.dataset.col=i%7;
    c.onclick=()=>{if(!cg||cg.over||cg.turn!==cg.seat)return;socket&&socket.emit('c4-drop',{col:+c.dataset.col});};
    bd.appendChild(c);}}
function updateC4(){if(!cg)return;const cells=$('c4board').children;
  for(let r=0;r<6;r++)for(let col=0;col<7;col++){const v=cg.board[r][col];const cell=cells[r*7+col];
    cell.style.background = v===0?'#1c1442' : (v===1?cg.a.color:cg.b.color);}
  $('c4pa').classList.toggle('turn',cg.turn===0);
  $('c4pb').classList.toggle('turn',cg.turn===1);
  $('c4board').classList.toggle('locked',cg.over||cg.turn!==cg.seat);
  if(!cg.over)$('c4status').textContent = cg.turn===cg.seat?t('c4_your_turn'):t('c4_opp_turn');}
function showC4Result(d){
  let msg;
  if(d.winnerSeat===-1)msg=t('c4_tie');
  else if(d.winnerSeat===cg.seat)msg=(d.reason==='forfeit'?t('c4_opp_forfeit'):'')+t('c4_win_msg');
  else msg=t('c4_lose_msg');
  $('c4status').textContent=msg;}
function c4CloseView(){if(cg&&!cg.over)socket&&socket.emit('c4-leave');$('c4modal').style.display='none';cg=null;setLocked(false);sitTable=-1;}

export function onC4Waiting(){$('c4wait').style.display='flex';}
export function onC4Busy(){setLocked(false);sitTable=-1;}
export function onC4Cancel(){$('c4wait').style.display='none';cg=null;setLocked(false);sitTable=-1;}
export function onC4Start(d){$('c4wait').style.display='none';
  cg={board:d.board,turn:d.turn,seat:d.seat,a:d.a,b:d.b,over:false};
  $('c4na').textContent=d.a.name;$('c4nb').textContent=d.b.name;
  $('c4da').style.background=d.a.color;$('c4db').style.background=d.b.color;
  buildC4();updateC4();$('c4modal').style.display='flex';}
export function onC4Update(d){if(!cg)return;cg.board=d.board;cg.turn=d.turn;updateC4();}
export function onC4Over(d){if(!cg)return;cg.board=d.board;cg.over=true;cg.turn=-1;updateC4();showC4Result(d);
  if(d.winnerSeat===cg.seat)showPopup('🏆',t('popup_won_title'),t('popup_c4_sub'),'gold');
  setLocked(false);sitTable=-1;}
export function onLeaderboardData(d){renderLeaderboard(d.rows||[]);}

export function initC4Dom(){
  $('c4close').onclick=c4CloseView;
  $('c4cancel').onclick=()=>{socket&&socket.emit('c4-leave');$('c4wait').style.display='none';cg=null;setLocked(false);sitTable=-1;};
  $('c4mclose').onclick=()=>$('c4menu').style.display='none';
  $('c4menu').onclick=e=>{if(e.target.id==='c4menu')$('c4menu').style.display='none';};
  $('c4mplay').onclick=()=>{$('c4menu').style.display='none';requestSit(menuTable);};
  $('c4mlb').onclick=()=>{$('c4menu').style.display='none';socket&&socket.emit('leaderboard');$('lblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('lb').style.display='flex';};
  $('lbclose').onclick=()=>$('lb').style.display='none';
  $('lb').onclick=e=>{if(e.target.id==='lb')$('lb').style.display='none';};
}
