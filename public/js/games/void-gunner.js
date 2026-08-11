import { $, t, showPopup, setLocked } from '../core.js';
import { socket } from '../net.js';
import { roundRect as roundRectImpl, esc, clamp } from '../render-utils.js';
import { INK } from '../data/appearance.js';

const W2=300, H2=480, PLAYER_Y=440;
const ENEMY_COLORS=['#ff5ea8','#31e1ff','#ffb14d'];

let vG=null, vRAF=null, vLast=0, phase='play';
let player=null, bullets=[], enemies=[], ebullets=[], stars=null;
let score=0, lives=3, spawnT=0, fireCd=0, elapsed=0;
let vgNewRecord=false, vgBest=0;
const held={left:false,right:false};

function reset(){
  player={x:W2/2};bullets=[];enemies=[];ebullets=[];
  score=0;lives=3;spawnT=0.8;fireCd=0;elapsed=0;vgNewRecord=false;
  stars=[];for(let i=0;i<40;i++)stars.push({x:Math.random()*W2,y:Math.random()*H2,sp:40+Math.random()*80,r:Math.random()*1.4+.4});
}
export function openVoidGunner(){
  const c=$('voidgunnerCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=W2*dpr;c.height=H2*dpr;vG=c.getContext('2d');vG.setTransform(dpr,0,0,dpr,0,0);
  reset();phase='play';held.left=false;held.right=false;
  $('voidgunnerfoot').textContent=t('voidgunner_controls');
  $('voidgunner').style.display='flex';setLocked(true);vLast=performance.now();if(!vRAF)vLoop();
}
function closeVoidGunner(){$('voidgunner').style.display='none';if(vRAF)cancelAnimationFrame(vRAF);vRAF=null;setLocked(false);}
function gameOver(){
  phase='over';
  const gained=Math.min(500,Math.round(score/8));
  socket&&socket.emit('voidgunner-score',{score});
  showPopup('👾',t('popup_voidgunner_over_title'),t('amount_stardust',{amount:gained}),'gold');
  $('voidgunnerfoot').innerHTML='<button class="betb" id="voidgunneragain">🔁 '+t('btn_again')+'</button><button class="betb" id="voidgunnerboard">🏆 '+t('btn_leaderboard')+'</button><button class="betb" id="voidgunnerexit">'+t('btn_exit')+'</button>';
  const a=$('voidgunneragain'),x=$('voidgunnerexit'),b=$('voidgunnerboard');
  if(a)a.onclick=()=>openVoidGunner();
  if(x)x.onclick=closeVoidGunner;
  if(b)b.onclick=openVoidGunnerBoard;
}
function fire(){
  if(fireCd>0||phase!=='play')return;
  fireCd=0.22;
  bullets.push({x:player.x,y:PLAYER_Y-20});
}
function vLoop(){
  const now=performance.now(),dt=Math.min((now-vLast)/1000,.05);vLast=now;
  if($('voidgunner').style.display==='none'){vRAF=null;return;}
  if(phase==='play')updateVoidGunner(dt);
  drawVoidGunner(now);
  vRAF=requestAnimationFrame(vLoop);
}
function updateVoidGunner(dt){
  elapsed+=dt;
  const speed=220;
  if(held.left)player.x-=speed*dt;
  if(held.right)player.x+=speed*dt;
  player.x=clamp(player.x,20,W2-20);
  fireCd=Math.max(0,fireCd-dt);

  for(const s of stars){s.y+=s.sp*dt;if(s.y>H2){s.y=0;s.x=Math.random()*W2;}}

  spawnT-=dt;
  if(spawnT<=0){
    spawnT=Math.max(0.35,0.95-elapsed*0.01);
    const shooter=Math.random()<0.3;
    enemies.push({x:30+Math.random()*(W2-60),y:-20,vx:(Math.random()-.5)*40,phase:Math.random()*6.28,shooter,shootCd:1+Math.random(),color:ENEMY_COLORS[Math.floor(Math.random()*ENEMY_COLORS.length)]});
  }
  const espeed=60+elapsed*2.2;
  for(const e of enemies){
    e.y+=Math.min(220,espeed)*dt;
    e.x+=Math.sin(elapsed*2+e.phase)*30*dt;
    e.x=clamp(e.x,14,W2-14);
    if(e.shooter){e.shootCd-=dt;if(e.shootCd<=0&&e.y>0){e.shootCd=1.4+Math.random();ebullets.push({x:e.x,y:e.y+14});}}
  }
  enemies=enemies.filter(e=>e.y<H2+30);

  for(const b of bullets)b.y-=340*dt;
  bullets=bullets.filter(b=>b.y>-20);
  for(const b of ebullets)b.y+=220*dt;
  ebullets=ebullets.filter(b=>b.y<H2+20);

  bullets=bullets.filter(b=>{
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i];
      if(Math.hypot(b.x-e.x,b.y-e.y)<20){enemies.splice(i,1);score+=15;return false;}
    }
    return true;
  });
  for(const e of enemies){
    if(Math.hypot(e.x-player.x,e.y-PLAYER_Y)<22){enemies.splice(enemies.indexOf(e),1);hitPlayer();break;}
  }
  ebullets=ebullets.filter(b=>{
    if(Math.hypot(b.x-player.x,b.y-PLAYER_Y)<16){hitPlayer();return false;}
    return true;
  });
  score+=Math.round(dt*3);
}
function hitPlayer(){
  lives--;
  if(lives<=0)gameOver();
}
function drawVoidGunner(now){
  const g=vG;
  g.fillStyle='#03030c';g.fillRect(0,0,W2,H2);
  for(const s of stars){g.fillStyle='rgba(200,220,255,.7)';g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill();}
  g.fillStyle='#4dd0ff';g.font='800 16px Fredoka';g.textAlign='left';g.fillText(t('label_score')+' '+score,8,22);
  g.textAlign='right';g.fillText('❤'.repeat(Math.max(0,lives)),W2-8,22);
  for(const e of enemies){
    g.save();g.translate(e.x,e.y);
    g.fillStyle=e.color;g.strokeStyle=INK;g.lineWidth=2;
    g.beginPath();g.moveTo(0,-14);g.lineTo(13,10);g.lineTo(0,4);g.lineTo(-13,10);g.closePath();g.fill();g.stroke();
    if(e.shooter){g.fillStyle='#fff';g.beginPath();g.arc(0,0,3,0,7);g.fill();}
    g.restore();
  }
  g.fillStyle='#ffe15e';
  for(const b of bullets){g.fillRect(b.x-2,b.y-8,4,12);}
  g.fillStyle='#ff5ea8';
  for(const b of ebullets){g.beginPath();g.arc(b.x,b.y,3.4,0,7);g.fill();}
  g.save();g.translate(player.x,PLAYER_Y);
  g.fillStyle='#7be0b0';g.strokeStyle=INK;g.lineWidth=3;
  g.beginPath();g.moveTo(0,-18);g.lineTo(16,16);g.lineTo(0,8);g.lineTo(-16,16);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(0,-2,5,0,7);g.fill();
  g.restore();
  if(phase==='over'){
    g.fillStyle='rgba(6,4,20,.6)';g.fillRect(0,0,W2,H2);
    g.fillStyle='#ff5ea8';g.strokeStyle=INK;g.lineWidth=4;g.font='800 24px Fredoka';g.textAlign='center';
    g.strokeText(t('voidgunner_over'),W2/2,H2/2-10);g.fillText(t('voidgunner_over'),W2/2,H2/2-10);
    if(vgNewRecord){g.fillStyle='#7be0b0';g.font='800 13px Fredoka';g.fillText('🏆 '+t('new_record'),W2/2,H2/2+16);}
    else if(vgBest>0){g.fillStyle='#bfeaff';g.font='700 12px Fredoka';g.fillText(t('label_best')+': '+vgBest,W2/2,H2/2+16);}
  }
}
function renderVoidGunnerBoard(rows){const el=$('vglblist');el.innerHTML='';
  if(!rows.length){el.innerHTML='<div class="lbempty">'+t('voidgunner_no_scores')+'</div>';return;}
  rows.forEach((r,i)=>{const row=document.createElement('div');row.className='lbrow';
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    row.innerHTML='<span class="lbrank">'+medal+'</span><span class="lbname">'+esc(r.username||'Alien')+'</span><span class="lbwins">👾 '+(r.voidgunner_best||0)+'</span>';
    el.appendChild(row);});}
function openVoidGunnerBoard(){socket&&socket.emit('voidgunner-leaderboard');$('vglblist').innerHTML='<div class="lbempty">'+t('loading')+'</div>';$('vglb').style.display='flex';}

export function onVoidGunnerBest(d){vgBest=d.best||0;if(d.record)vgNewRecord=true;}
export function onVoidGunnerLeaderboardData(d){renderVoidGunnerBoard(d.rows||[]);}

export function initVoidGunnerDom(){
  addEventListener('keydown',e=>{
    if($('voidgunner').style.display==='none'||phase!=='play'||!e.key)return;
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','a','d',' '].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')held.left=true;
    else if(k==='arrowright'||k==='d')held.right=true;
    else if(k===' ')fire();
  });
  addEventListener('keyup',e=>{
    if(!e.key)return;const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a')held.left=false;
    else if(k==='arrowright'||k==='d')held.right=false;
  });
  $('voidgunnerclose').onclick=closeVoidGunner;
  $('vglbclose').onclick=()=>$('vglb').style.display='none';
  $('vglb').onclick=e=>{if(e.target.id==='vglb')$('vglb').style.display='none';};
}
