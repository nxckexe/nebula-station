import { $, t, showPopup, setLocked, getMe, getMyId, myRoom, getPlanetScene } from '../core.js';
import { socket } from '../net.js';
import { esc } from '../render-utils.js';
import { PLANETS } from '../data/rooms.js';

const RACE_W=900;
let raceState=null,raceTrack=null,raceG=null,raceRAF=null,raceMyX=RACE_W/2,raceResults=null,raceCam=0,raceGoAt=0,racePadArmed=true;

export function openRace(){$('race').style.display='flex';setLocked(true);
  const c=$('raceCanvas'),dpr=Math.min(devicePixelRatio||1,3);
  c.width=360*dpr;c.height=440*dpr;raceG=c.getContext('2d');raceG.setTransform(dpr,0,0,dpr,0,0);
  raceResults=null;raceState=null;raceTrack=null;raceCam=0;
  $('racemsg').textContent=t('race_waiting');$('racefoot').textContent='';
  socket&&socket.emit('race-join');
  if(!raceRAF)raceLoop();}
function closeRace(){socket&&socket.emit('race-leave');$('race').style.display='none';
  if(raceRAF)cancelAnimationFrame(raceRAF);raceRAF=null;setLocked(false);raceState=null;raceResults=null;
  racePadArmed=false;                                  // erst nach Weglaufen wieder auslösen
  const me=getMe(),planetScene=getPlanetScene();
  if(me&&planetScene&&planetScene.racePad){            // ein Stück von der Rampe wegstellen
    me.ty=Math.min((PLANETS[myRoom()]||{h:1300}).h-60,planetScene.racePad.y+110);}}
export function checkRacePad(me,rp){
  if(!rp)return;
  const onPad=Math.abs(me.x-rp.x)<58&&Math.abs(me.y-rp.y)<40;
  if(!onPad)racePadArmed=true;
  else if(racePadArmed&&$('race').style.display==='none')openRace();
}
function raceSteer(clientX){
  const c=$('raceCanvas'),r=c.getBoundingClientRect();
  const rel=(clientX-r.left)/r.width;           // 0..1
  raceMyX=Math.max(30,Math.min(RACE_W-30,rel*RACE_W));
  socket&&socket.emit('race-move',{x:raceMyX});
}
function drawRaceCanvas(){const g=raceG;if(!g)return;
  const CW2=360,CH2=440,sc=CW2/RACE_W;   // Bahn auf Canvas-Breite skalieren
  g.clearRect(0,0,CW2,CH2);
  // Hintergrund (Weltraum über dem Planeten)
  const bg=g.createLinearGradient(0,0,0,CH2);bg.addColorStop(0,'#0c3322');bg.addColorStop(1,'#04120d');
  g.fillStyle=bg;g.fillRect(0,0,CW2,CH2);
  const myId=getMyId();
  const meP=raceState&&raceState.players.find(p=>p.id===myId);
  const myY=meP?meP.y:0;
  raceCam+=((myY-140/sc)-raceCam)*0.25;   // Kamera folgt weich
  const camY=raceCam;
  const toY=wy=>(wy-camY)*sc;
  // Sterne
  for(let i=0;i<40;i++){const sy=((i*137+ (camY*0.3))%CH2);
    g.fillStyle='rgba(200,255,230,'+(0.2+0.3*Math.sin(i))+')';g.fillRect((i*97)%CW2,CH2-sy,1.6,1.6);}
  // Bahnränder
  g.strokeStyle='rgba(123,224,176,.35)';g.lineWidth=3;
  g.beginPath();g.moveTo(2,0);g.lineTo(2,CH2);g.moveTo(CW2-2,0);g.lineTo(CW2-2,CH2);g.stroke();
  // Ziellinie
  if(raceState){const fy=toY(raceState.len);
    if(fy>-20&&fy<CH2+20){for(let i=0;i<12;i++){g.fillStyle=i%2?'#fff':'#2b1b52';g.fillRect(i*30,fy-8,30,16);}
      g.fillStyle='#7be0b0';g.font='800 13px Fredoka';g.textAlign='center';g.fillText(t('race_finish'),CW2/2,fy-16);}}
  // Boosts
  if(raceTrack)for(const b of raceTrack.boosts){const by=toY(b.y);if(by<-30||by>CH2+30)continue;
    const pulse=0.7+0.3*Math.sin(performance.now()/180+b.x);
    const R=b.r*sc;
    // Glühen
    g.fillStyle='rgba(123,224,176,'+(0.28*pulse)+')';g.beginPath();g.arc(b.x*sc,by,R*2.1,0,7);g.fill();
    // Ring (offen, damit man durchfliegt)
    g.strokeStyle='#7be0b0';g.lineWidth=4;g.beginPath();g.arc(b.x*sc,by,R,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,'+(0.5*pulse)+')';g.lineWidth=1.5;g.beginPath();g.arc(b.x*sc,by,R-3,0,7);g.stroke();
    // Pfeil nach oben
    g.fillStyle='#d8fff0';g.beginPath();
    g.moveTo(b.x*sc,by-R*0.5);g.lineTo(b.x*sc-R*0.42,by+R*0.18);g.lineTo(b.x*sc-R*0.16,by+R*0.18);
    g.lineTo(b.x*sc-R*0.16,by+R*0.5);g.lineTo(b.x*sc+R*0.16,by+R*0.5);g.lineTo(b.x*sc+R*0.16,by+R*0.18);
    g.lineTo(b.x*sc+R*0.42,by+R*0.18);g.closePath();g.fill();}
  // Meteoriten
  if(raceTrack)for(const o of raceTrack.obstacles){const oy=toY(o.y);if(oy<-40||oy>CH2+40)continue;
    const rr=o.r*sc;
    g.fillStyle='#5a3a2a';g.strokeStyle='#2b1b52';g.lineWidth=2.5;
    g.beginPath();g.arc(o.x*sc,oy,rr,0,7);g.fill();g.stroke();
    g.fillStyle='#7a5240';g.beginPath();g.arc(o.x*sc-rr*0.25,oy-rr*0.25,rr*0.45,0,7);g.fill();
    g.fillStyle='#3f2718';g.beginPath();g.arc(o.x*sc+rr*0.3,oy+rr*0.2,rr*0.22,0,7);g.fill();}
  // Spieler
  if(raceState)for(const p of raceState.players){
    const py=toY(p.y),px=p.x*sc;
    if(py<-40||py>CH2+40)continue;
    const own=p.id===myId;
    // Boost-Flamme (hinten = unten, da wir nach oben fliegen)
    if(p.boost){const fl=14+Math.random()*10;
      g.fillStyle='rgba(255,209,102,.85)';g.beginPath();
      g.moveTo(px-7,py+11);g.lineTo(px+7,py+11);g.lineTo(px,py+11+fl);g.closePath();g.fill();
      g.fillStyle='rgba(255,120,60,.7)';g.beginPath();
      g.moveTo(px-4,py+11);g.lineTo(px+4,py+11);g.lineTo(px,py+11+fl*0.6);g.closePath();g.fill();}
    // Kapsel – Spitze nach oben (Fahrtrichtung)
    g.fillStyle=p.color||'#4dd0ff';g.strokeStyle=own?'#fff':'#2b1b52';g.lineWidth=own?3:2.5;
    g.beginPath();
    g.moveTo(px,py-16);
    g.quadraticCurveTo(px+11,py-4,px+9,py+12);
    g.lineTo(px-9,py+12);
    g.quadraticCurveTo(px-11,py-4,px,py-16);
    g.closePath();g.fill();g.stroke();
    // Flügel
    g.fillStyle=own?'#fff':'#2b1b52';
    g.beginPath();g.moveTo(px-9,py+4);g.lineTo(px-14,py+13);g.lineTo(px-9,py+12);g.closePath();g.fill();
    g.beginPath();g.moveTo(px+9,py+4);g.lineTo(px+14,py+13);g.lineTo(px+9,py+12);g.closePath();g.fill();
    // Kuppel
    g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(px,py-4,5.5,6,0,0,7);g.fill();
    // Treffer-Blitz
    if(p.hit){g.strokeStyle='#ff5ea8';g.lineWidth=2.5;g.beginPath();g.arc(px,py,20,0,7);g.stroke();}
    // Name
    g.font='700 10px Fredoka';g.textAlign='center';
    g.fillStyle=own?'#ffd166':'#cfe6ff';g.fillText((p.name||'').slice(0,9),px,py-20);
    if(p.done){g.fillStyle='#7be0b0';g.font='800 10px Fredoka';g.fillText('#'+p.place,px,py+30);}
  }
  // Fortschrittsleiste rechts
  if(raceState){const bx=CW2-12;
    g.fillStyle='rgba(255,255,255,.15)';g.fillRect(bx-3,20,6,CH2-40);
    for(const p of raceState.players){const frac=Math.min(1,p.y/raceState.len);
      const yy=20+(CH2-40)*frac;
      g.fillStyle=p.color||'#4dd0ff';g.strokeStyle=p.id===myId?'#fff':'#2b1b52';g.lineWidth=1.5;
      g.beginPath();g.arc(bx,yy,4.5,0,7);g.fill();g.stroke();}}
  // Countdown
  if(raceState&&raceState.phase==='countdown'){
    const left=Math.max(0,Math.ceil((raceGoAt-Date.now())/1000));
    g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,0,CW2,CH2);
    g.fillStyle='#ffd166';g.font='800 64px Fredoka';g.textAlign='center';
    g.fillText(left>0?String(left):'GO!',CW2/2,CH2/2+20);}
}
function raceLoop(){if($('race').style.display==='none'){raceRAF=null;return;}
  drawRaceCanvas();raceRAF=requestAnimationFrame(raceLoop);}

export function onRaceJoined(){$('racemsg').textContent=t('race_waiting');}
export function onRaceLobby(s){raceState=s;
  $('racemsg').textContent=t('race_lobby',{n:s.players.length,need:3});
  $('racefoot').textContent=s.players.map(p=>p.name).join(' · ');}
export function onRaceBusy(){$('racemsg').textContent=t('race_busy');
  setTimeout(()=>{if($('race').style.display!=='none')closeRace();},2400);}
export function onRaceCancel(){$('racemsg').textContent=t('race_cancel');
  setTimeout(()=>{if($('race').style.display!=='none')closeRace();},2400);}
export function onRaceStart(d){raceTrack=d.track;raceState=d.state;raceGoAt=Date.now()+d.countdown;
  raceMyX=RACE_W/2;$('racemsg').textContent=t('race_get_ready');$('racefoot').textContent=t('race_controls');}
export function onRaceGo(d){raceState=d.state;$('racemsg').textContent=t('race_go');}
export function onRaceState(s){raceState=s;}
export function onRaceFinished(d){if(d.id===getMyId())$('racemsg').textContent=t('race_you_finished',{place:d.place});}
export function onRaceResult(d){raceResults=d.results;
  const mine=d.results.find(r=>r.id===getMyId());
  if(mine){$('racemsg').textContent=t('race_result_you',{place:mine.place,coins:mine.coins});
    if(mine.place===1)showPopup('🏆',t('race_won_title'),t('amount_stardust',{amount:mine.coins}),'gold');}
  $('racefoot').innerHTML=d.results.map(r=>'<div class="racerow"><span style="color:'+(r.color||'#333')+'">#'+r.place+' '+esc(r.name)+'</span><span>+'+r.coins+' ✦</span></div>').join('');}

export function initRaceDom(){
  $('raceclose').onclick=closeRace;
  $('race').onclick=e=>{if(e.target.id==='race')closeRace();};
  const c=$('raceCanvas');let down=false;
  c.addEventListener('pointerdown',e=>{down=true;raceSteer(e.clientX);e.preventDefault();});
  c.addEventListener('pointermove',e=>{if(down)raceSteer(e.clientX);});
  addEventListener('pointerup',()=>{down=false;});
  addEventListener('keydown',e=>{
    if($('race').style.display==='none')return;
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){raceMyX=Math.max(30,raceMyX-70);socket&&socket.emit('race-move',{x:raceMyX});}
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){raceMyX=Math.min(RACE_W-30,raceMyX+70);socket&&socket.emit('race-move',{x:raceMyX});}
  });
}
