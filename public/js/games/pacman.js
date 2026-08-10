import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const CW=7, CH=8; // Korridor-Zellen (Raeume) je Richtung
const COLS=CW*2-1, ROWS=CH*2-1; // tatsaechliches Gitter inkl. Verbindungswaende
const CELL=20, OX=20, OY=56;

const GHOST_COLORS=['#ff5ea8','#31e1ff','#ffb14d'];

let pmG=null, pmRAF=null, pmLast=0;
let maze=null, dots=null, power=null, dotsLeft=0;
let pac=null, ghosts=[], scaredT=0, score=0, lives=3, level=1, phase='play', pmNewRecord=false, pmBest=0;

function genMaze(){
  const grid=Array.from({length:ROWS},()=>Array(COLS).fill(1));
  for(let r=0;r<CH;r++)for(let c=0;c<CW;c++)grid[r*2][c*2]=0;
  const visited=Array.from({length:CH},()=>Array(CW).fill(false));
  const stack=[[0,0]];visited[0][0]=true;
  while(stack.length){
    const [cr,cc]=stack[stack.length-1];
    const opts=[[0,1],[0,-1],[1,0],[-1,0]].filter(([dr,dc])=>{const nr=cr+dr,nc=cc+dc;return nr>=0&&nr<CH&&nc>=0&&nc<CW&&!visited[nr][nc];});
    if(!opts.length){stack.pop();continue;}
    const [dr,dc]=opts[Math.floor(Math.random()*opts.length)];
    grid[cr*2+dr][cc*2+dc]=0;
    visited[cr+dr][cc+dc]=true;stack.push([cr+dr,cc+dc]);
  }
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const isConnector=(r%2===0&&c%2===1)||(r%2===1&&c%2===0);
    if(isConnector&&grid[r][c]===1&&Math.random()<0.32)grid[r][c]=0;
  }
  return grid;
}
function isWall(c,r){if(c<0||c>=COLS||r<0||r>=ROWS)return true;return maze[r][c]===1;}
function newGame(){
  maze=genMaze();
  dots=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  power=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  dotsLeft=0;
  const startC=(CW>>1)*2, startR=(CH-1)*2;
  for(let r=0;r<CH;r++)for(let c=0;c<CW;c++){
    if(r*2===startR&&c*2===startC)continue;
    dots[r*2][c*2]=true;dotsLeft++;
  }
  const corners=[[0,0],[0,CW-1],[CH-1,0],[CH-1,CW-1]];
  for(const [r,c] of corners){dots[r*2][c*2]=false;power[r*2][c*2]=true;}
  pac={col:startC,row:startR,dir:[0,0],next:[0,0]};
  const ghostCols=[0,COLS-1,(CW>>1)*2];
  ghosts=ghostCols.map((gc,i)=>({col:gc,row:0,dir:[1,0],color:GHOST_COLORS[i],scared:false}));
  scaredT=0;
}
function cellDist(a,b){return Math.abs(a.col-b.col)+Math.abs(a.row-b.row);}
function validDirs(col,row,excludeReverse){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  return dirs.filter(([dc,dr])=>!isWall(col+dc,row+dr)&&!(excludeReverse&&dc===-excludeReverse[0]&&dr===-excludeReverse[1]));
}
// Bewegt eine Figur um genau `speed*dt`, aber IMMER in Teilschritten, die exakt an
// Zellgrenzen einrasten - so kann eine Richtungsentscheidung (und damit eine
// Wandpruefung) bei keiner Geschwindigkeit/Framerate jemals "uebersprungen" werden
// (der alte Code prüfte Wände nur, wenn die Position zufällig nahe genug an einer
// ganzen Zahl lag, was Pac/Geister gelegentlich durch Wände aus dem Feld rutschen
// und dort komplett feststecken liess, weil ausserhalb des Gitters jede Richtung
// als "Wand" gilt).
function stepEntity(e,speed,dt,decideDir){
  // e.fromCol/e.fromRow ist die zuletzt vollstaendig erreichte Gitterzelle - wird NUR
  // beim Einrasten gesetzt, niemals per Math.round() aus der aktuellen Position
  // hergeleitet (das kippt genau in der Zellmitte um einen Schritt und liess Figuren
  // sonst am Feldrand ins Nichts laufen). Geister starten mit bereits gesetzter
  // Richtung (nicht im Stillstand) - deshalb hier defensiv initialisieren, falls
  // noch nie gesetzt.
  if(e.fromCol===undefined){e.fromCol=Math.round(e.col);e.fromRow=Math.round(e.row);}
  let remaining=speed*dt;
  for(let iter=0;iter<8&&remaining>1e-6;iter++){
    if(!(e.dir[0]||e.dir[1])){
      e.col=Math.round(e.col);e.row=Math.round(e.row);
      e.fromCol=e.col;e.fromRow=e.row;
      decideDir(e);
      if(!(e.dir[0]||e.dir[1]))return;
    }
    const targetCol=e.fromCol+e.dir[0], targetRow=e.fromRow+e.dir[1];
    const distToTarget=e.dir[0]!==0?Math.abs(targetCol-e.col):Math.abs(targetRow-e.row);
    if(remaining<distToTarget){
      e.col+=e.dir[0]*remaining;e.row+=e.dir[1]*remaining;
      remaining=0;
    }else{
      e.col=targetCol;e.row=targetRow;
      e.fromCol=targetCol;e.fromRow=targetRow;
      remaining-=distToTarget;
      decideDir(e);
      if(!(e.dir[0]||e.dir[1]))return;
    }
  }
}
function pacDecide(e){
  const want=(e.next[0]||e.next[1])?e.next:e.dir;
  if(!isWall(e.col+want[0],e.row+want[1]))e.dir=want;
  else if(isWall(e.col+e.dir[0],e.row+e.dir[1]))e.dir=[0,0];
}
function ghostDecide(g){
  let opts=validDirs(g.col,g.row,g.dir);
  if(!opts.length)opts=validDirs(g.col,g.row,null);
  if(!opts.length){g.dir=[0,0];return;}
  if(Math.random()<0.22){g.dir=opts[Math.floor(Math.random()*opts.length)];return;}
  let best=opts[0],bestScore=g.scared?-1:1e9;
  for(const o of opts){
    const nd=cellDist({col:g.col+o[0],row:g.row+o[1]},pac);
    if(g.scared?nd>bestScore:nd<bestScore){bestScore=nd;best=o;}
  }
  g.dir=best;
}

function updatePac(dt){
  stepEntity(pac,6.2,dt,pacDecide);
  const cc=Math.round(pac.col),cr=Math.round(pac.row);
  if(cc>=0&&cc<COLS&&cr>=0&&cr<ROWS){
    if(dots[cr][cc]){dots[cr][cc]=false;dotsLeft--;score+=10;}
    if(power[cr][cc]){power[cr][cc]=false;score+=50;scaredT=7;for(const g of ghosts)g.scared=true;}
  }
  if(dotsLeft<=0)nextLevel();
}
function nextLevel(){level++;maze=genMaze();
  dots=Array.from({length:ROWS},()=>Array(COLS).fill(false));power=Array.from({length:ROWS},()=>Array(COLS).fill(false));dotsLeft=0;
  const startC=(CW>>1)*2,startR=(CH-1)*2;
  for(let r=0;r<CH;r++)for(let c=0;c<CW;c++){if(r*2===startR&&c*2===startC)continue;dots[r*2][c*2]=true;dotsLeft++;}
  const corners=[[0,0],[0,CW-1],[CH-1,0],[CH-1,CW-1]];
  for(const [r,c] of corners){dots[r*2][c*2]=false;power[r*2][c*2]=true;}
  pac.col=startC;pac.row=startR;pac.dir=[0,0];pac.next=[0,0];
  for(const g of ghosts){g.col=0;g.row=0;g.dir=[0,0];g.scared=false;}
  scaredT=0;
}
function updateGhosts(dt){
  const speed=(scaredT>0?4.0:4.7+level*0.25);
  for(const g of ghosts){
    stepEntity(g,speed,dt,ghostDecide);
    if(Math.hypot(g.col-pac.col,g.row-pac.row)<0.5){
      if(g.scared){g.scared=false;g.col=0;g.row=0;g.dir=[0,0];score+=200;}
      else loseLife();
    }
  }
  if(scaredT>0){scaredT-=dt;if(scaredT<=0){scaredT=0;for(const g of ghosts)g.scared=false;}}
}
function loseLife(){
  lives--;
  if(lives<=0){gameOver();return;}
  const startC=(CW>>1)*2,startR=(CH-1)*2;
  pac.col=startC;pac.row=startR;pac.dir=[0,0];pac.next=[0,0];
  for(const g of ghosts){g.col=0;g.row=0;g.dir=[0,0];g.scared=false;}
  scaredT=0;
}
export function openPacman(){
  const c=$('pacmanCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=320*dpr;c.height=470*dpr;pmG=c.getContext('2d');pmG.setTransform(dpr,0,0,dpr,0,0);
  score=0;lives=3;level=1;phase='play';pmNewRecord=false;newGame();
  $('pacmanfoot').textContent=t('pacman_controls');
  $('pacman').style.display='flex';setLocked(true);pmLast=performance.now();if(!pmRAF)pmLoop();
}
function closePacman(){$('pacman').style.display='none';if(pmRAF)cancelAnimationFrame(pmRAF);pmRAF=null;setLocked(false);}
function gameOver(){
  phase='over';
  const gained=Math.min(500,Math.round(score/6));
  socket&&socket.emit('pacman-score',{score});
  showPopup('👻',t('popup_pacman_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('pacmanfoot').innerHTML='<button class="betb" id="pacmanagain">🔁 '+t('btn_again')+'</button><button class="betb" id="pacmanboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="pacmanexit">'+t('btn_exit')+'</button>';
  const a=$('pacmanagain'),x=$('pacmanexit'),b=$('pacmanboard');
  if(a)a.onclick=()=>openPacman();
  if(x)x.onclick=closePacman;
  if(b)b.onclick=openPacmanBoard;
}
function pmLoop(){
  const now=performance.now(),dt=Math.min((now-pmLast)/1000,.05);pmLast=now;
  if($('pacman').style.display==='none'){pmRAF=null;return;}
  if(phase==='play'){updatePac(dt);updateGhosts(dt);}
  drawPacman();
  pmRAF=requestAnimationFrame(pmLoop);
}
function drawPacman(){
  const g=pmG,now=performance.now();
  g.fillStyle='#050310';g.fillRect(0,0,320,470);
  g.fillStyle='#ffe15e';g.font='800 17px Fredoka';g.textAlign='center';g.fillText('PAC-CHASE',160,24);
  g.fillStyle='#cbb8ff';g.font='700 12px Fredoka';g.textAlign='left';
  g.fillText(t('label_score')+' '+score,OX,OY-8);
  g.textAlign='right';g.fillText('❤'.repeat(Math.max(0,lives)),OX+COLS*CELL,OY-8);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(maze[r][c]===1){g.fillStyle='#1a1040';g.fillRect(OX+c*CELL,OY+r*CELL,CELL+1,CELL+1);}
  }
  g.strokeStyle='#31e1ff';g.lineWidth=1.5;g.globalAlpha=.5;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(maze[r][c]===1)g.strokeRect(OX+c*CELL+1,OY+r*CELL+1,CELL-2,CELL-2);
  g.globalAlpha=1;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const cx=OX+c*CELL+CELL/2,cy=OY+r*CELL+CELL/2;
    if(dots[r][c]){g.fillStyle='#ffe9a8';g.beginPath();g.arc(cx,cy,2.2,0,7);g.fill();}
    if(power[r][c]){const p=.6+.4*Math.sin(now/200);g.fillStyle='#ffd166';g.globalAlpha=p;g.beginPath();g.arc(cx,cy,5.5,0,7);g.fill();g.globalAlpha=1;}
  }
  const px=OX+pac.col*CELL+CELL/2,py=OY+pac.row*CELL+CELL/2;
  const mouth=Math.abs(Math.sin(now/90))*0.85+0.1;
  const ang=pac.dir[0]===-1?Math.PI:pac.dir[1]===1?Math.PI/2:pac.dir[1]===-1?-Math.PI/2:0;
  g.save();g.translate(px,py);g.rotate(ang);
  g.fillStyle='#ffe15e';g.beginPath();g.arc(0,0,CELL*0.42,mouth,Math.PI*2-mouth);g.closePath();g.fill();
  g.restore();
  for(const gh of ghosts){
    const gx=OX+gh.col*CELL+CELL/2,gy=OY+gh.row*CELL+CELL/2;
    const blink=gh.scared&&scaredT<2&&Math.sin(now/100)>0;
    g.fillStyle=gh.scared?(blink?'#fff':'#4a5568'):gh.color;
    g.beginPath();g.arc(gx,gy-2,CELL*0.38,Math.PI,0);
    g.lineTo(gx+CELL*0.38,gy+CELL*0.36);
    for(let w=0;w<3;w++)g.lineTo(gx+CELL*0.38-((w+1)*CELL*0.19),gy+(w%2?CELL*0.2:CELL*0.36));
    g.lineTo(gx-CELL*0.38,gy+CELL*0.36);g.closePath();g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(gx-5,gy-4,3.4,0,7);g.fill();g.beginPath();g.arc(gx+5,gy-4,3.4,0,7);g.fill();
    g.fillStyle=INK;g.beginPath();g.arc(gx-5,gy-4,1.6,0,7);g.fill();g.beginPath();g.arc(gx+5,gy-4,1.6,0,7);g.fill();
  }
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(OX-2,OY-2,COLS*CELL+4,ROWS*CELL+4);
    const cx2=OX+COLS*CELL/2,cy2=OY+ROWS*CELL/2;
    g.fillStyle='#ff5ea8';g.strokeStyle=INK;g.lineWidth=4;g.font='800 22px Fredoka';g.textAlign='center';
    g.strokeText(t('pacman_over'),cx2,cy2-14);g.fillText(t('pacman_over'),cx2,cy2-14);
    if(pmNewRecord){g.fillStyle='#7be0b0';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),cx2,cy2+12);}
    else if(pmBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+pmBest,cx2,cy2+12);}
  }
}
function renderPacmanBoard(rows){const el=$('pmlblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('pacman_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">👻 '+(r.pacman_best||0)+'</span>';
    el.appendChild(row);});}
function openPacmanBoard(){socket&&socket.emit('pacman-leaderboard');$('pmlblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('pmlb').style.display='flex';}

export function onPacmanBest(d){pmBest=d.best||0;if(d.record)pmNewRecord=true;}
export function onPacmanLeaderboardData(d){renderPacmanBoard(d.rows||[]);}

export function initPacmanDom(){
  addEventListener('keydown',e=>{
    if($('pacman').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w'].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')pac.next=[-1,0];
    else if(k==='arrowright'||k==='d')pac.next=[1,0];
    else if(k==='arrowup'||k==='w')pac.next=[0,-1];
    else if(k==='arrowdown'||k==='s')pac.next=[0,1];
  });
  $('pacmanclose').onclick=closePacman;
  $('pmlbclose').onclick=()=>$('pmlb').style.display='none';
  $('pmlb').onclick=e=>{if(e.target.id==='pmlb')$('pmlb').style.display='none';};
}
