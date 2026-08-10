import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const COLS=10, ROWS=20, CELL=18;
const OX=20, OY=40; // Spielfeld-Ursprung im Canvas

const SHAPES={
  I:{m:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],c:'#31e1ff'},
  O:{m:[[1,1,0,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],c:'#ffe15e'},
  T:{m:[[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],c:'#b467ff'},
  S:{m:[[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],c:'#7be0b0'},
  Z:{m:[[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],c:'#ff5ea8'},
  J:{m:[[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],c:'#4dd0ff'},
  L:{m:[[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],c:'#ff9e64'}
};
const TYPES=Object.keys(SHAPES);

let tetG=null, tetRAF=null, tetLast=0;
let board=null, cur=null, nextType=null, dropTimer=0, dropInterval=0.8;
let score=0, lines=0, level=1, phase='play', bag=[];
const tetKeys={};

function rotateMatrix(m){const n=4,res=Array.from({length:n},()=>Array(n).fill(0));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)res[c][n-1-r]=m[r][c];return res;}
function freshBoard(){return Array.from({length:ROWS},()=>Array(COLS).fill(null));}
function drawBag(){if(!bag.length)bag=TYPES.slice().sort(()=>Math.random()-.5);return bag.pop();}
function spawnPiece(){const type=nextType||drawBag();nextType=drawBag();
  cur={type,m:SHAPES[type].m,c:SHAPES[type].c,row:-1,col:3};
  if(collides(cur.m,cur.row,cur.col)){gameOver();}}
function collides(m,row,col){
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(!m[r][c])continue;
    const rr=row+r,cc=col+c;
    if(cc<0||cc>=COLS||rr>=ROWS)return true;
    if(rr>=0&&board[rr][cc])return true;}
  return false;}
function lockPiece(){
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(!cur.m[r][c])continue;
    const rr=cur.row+r,cc=cur.col+c;if(rr>=0&&rr<ROWS)board[rr][cc]=cur.c;}
  let cleared=0;
  for(let r=ROWS-1;r>=0;r--){if(board[r].every(Boolean)){board.splice(r,1);board.unshift(Array(COLS).fill(null));cleared++;r++;}}
  if(cleared>0){
    const points=[0,100,300,500,800][cleared]*level;
    score+=points;lines+=cleared;
    level=1+Math.floor(lines/10);
    dropInterval=Math.max(0.11,0.8-0.065*(level-1));
  }
  spawnPiece();
}
function hardDrop(){let d=0;while(!collides(cur.m,cur.row+1,cur.col)){cur.row++;d++;}score+=d;lockPiece();}

export function openTetris(){
  const c=$('tetrisCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=300*dpr;c.height=520*dpr;tetG=c.getContext('2d');tetG.setTransform(dpr,0,0,dpr,0,0);
  board=freshBoard();score=0;lines=0;level=1;dropInterval=0.8;dropTimer=0;phase='play';bag=[];
  nextType=drawBag();spawnPiece();
  $('tetrisfoot').textContent=t('tetris_controls');
  $('tetris').style.display='flex';setLocked(true);tetLast=performance.now();if(!tetRAF)tetLoop();
}
function closeTetris(){$('tetris').style.display='none';if(tetRAF)cancelAnimationFrame(tetRAF);tetRAF=null;setLocked(false);}
function gameOver(){
  phase='over';
  const gained=Math.min(600,Math.round(score/8));
  socket&&socket.emit('tetris-score',{score,lines});
  showPopup('🧱',t('popup_tetris_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('tetrisfoot').innerHTML='<button class="betb" id="tetrisagain">🔁 '+t('btn_again')+'</button><button class="betb" id="tetrisexit">'+t('btn_exit')+'</button>';
  const a=$('tetrisagain'),x=$('tetrisexit');
  if(a)a.onclick=()=>openTetris();
  if(x)x.onclick=closeTetris;
}
function tetLoop(){
  const now=performance.now(),dt=Math.min((now-tetLast)/1000,.05);tetLast=now;
  if($('tetris').style.display==='none'){tetRAF=null;return;}
  if(phase==='play'){
    dropTimer+=dt;
    const fastDrop=tetKeys['arrowdown']||tetKeys['s'];
    if(dropTimer>(fastDrop?0.04:dropInterval)){
      dropTimer=0;
      if(!collides(cur.m,cur.row+1,cur.col))cur.row++;else lockPiece();
    }
  }
  drawTetris();
  tetRAF=requestAnimationFrame(tetLoop);
}
function drawTetris(){
  const g=tetG;
  g.fillStyle='#0a0818';g.fillRect(0,0,300,520);
  g.fillStyle='#ffd166';g.font='800 18px Fredoka';g.textAlign='center';g.fillText('TETRIS',150,26);
  g.fillStyle='#050310';g.fillRect(OX-2,OY-2,COLS*CELL+4,ROWS*CELL+4);
  g.strokeStyle='#241a3a';g.lineWidth=1;
  for(let r=0;r<=ROWS;r++){g.beginPath();g.moveTo(OX,OY+r*CELL);g.lineTo(OX+COLS*CELL,OY+r*CELL);g.stroke();}
  for(let c=0;c<=COLS;c++){g.beginPath();g.moveTo(OX+c*CELL,OY);g.lineTo(OX+c*CELL,OY+ROWS*CELL);g.stroke();}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(board[r][c])drawCell(g,OX+c*CELL,OY+r*CELL,board[r][c]);
  if(cur&&phase==='play')for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(cur.m[r][c]){
    const rr=cur.row+r;if(rr<0)continue;drawCell(g,OX+(cur.col+c)*CELL,OY+rr*CELL,cur.c);
  }
  g.strokeStyle=INK;g.lineWidth=3;g.strokeRect(OX-2,OY-2,COLS*CELL+4,ROWS*CELL+4);
  const px=OX+COLS*CELL+18;
  g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.textAlign='left';
  g.fillText(t('label_score'),px,OY+14);
  g.fillStyle='#fff';g.font='800 16px Fredoka';g.fillText(''+score,px,OY+34);
  g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.fillText(t('label_lines'),px,OY+62);
  g.fillStyle='#fff';g.font='800 16px Fredoka';g.fillText(''+lines,px,OY+82);
  g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.fillText(t('label_level'),px,OY+110);
  g.fillStyle='#fff';g.font='800 16px Fredoka';g.fillText(''+level,px,OY+130);
  if(nextType){
    g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.fillText(t('label_next'),px,OY+164);
    const nm=SHAPES[nextType].m,nc=SHAPES[nextType].c;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(nm[r][c])drawCell(g,px+c*13,OY+176+r*13,nc,12);
  }
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(OX-2,OY-2,COLS*CELL+4,ROWS*CELL+4);
    g.fillStyle='#ff5ea8';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('tetris_over'),OX+COLS*CELL/2,OY+ROWS*CELL/2);g.fillText(t('tetris_over'),OX+COLS*CELL/2,OY+ROWS*CELL/2);
  }
}
function drawCell(g,x,y,color,size){
  const s=size||CELL;
  g.fillStyle=color;g.fillRect(x+1,y+1,s-2,s-2);
  g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+1,y+1,s-2,2);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+1,y+s-3,s-2,2);
}

export function initTetrisDom(){
  addEventListener('keydown',e=>{
    if($('tetris').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w',' '].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a'){if(!collides(cur.m,cur.row,cur.col-1))cur.col--;}
    else if(k==='arrowright'||k==='d'){if(!collides(cur.m,cur.row,cur.col+1))cur.col++;}
    else if(k==='arrowup'||k==='w'){
      const rm=rotateMatrix(cur.m);
      if(!collides(rm,cur.row,cur.col))cur.m=rm;
      else if(!collides(rm,cur.row,cur.col-1)){cur.m=rm;cur.col--;}
      else if(!collides(rm,cur.row,cur.col+1)){cur.m=rm;cur.col++;}
    }
    else if(k===' ')hardDrop();
    else tetKeys[k]=true;
  });
  addEventListener('keyup',e=>{if(!e.key)return;tetKeys[e.key.toLowerCase()]=false;});
  $('tetrisclose').onclick=closeTetris;
}
