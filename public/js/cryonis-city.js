import { goToRoom } from './core.js';
import { roundRect } from './render-utils.js';
import { CRYONIS_BUILDINGS, CRYONIS_GROUND_Y } from './data/rooms.js';

// Fliegende Autos: verteilt ueber mehrere Hoehen im Himmel, manche vor/hinter den Wolkenkratzern
const CARS=[
  {laneY:40, speed:82, phase:.05,color:'#ff2e88',scale:0.85},
  {laneY:80, speed:-58,phase:.55,color:'#31e1ff',scale:1},
  {laneY:130,speed:96, phase:.30,color:'#ffd166',scale:0.9},
  {laneY:170,speed:-72,phase:.75,color:'#7be0b0',scale:1.1},
  {laneY:210,speed:64, phase:.42,color:'#b467ff',scale:0.95},
  {laneY:260,speed:-88,phase:.18,color:'#ff9e64',scale:1},
  {laneY:300,speed:70, phase:.62,color:'#4dd0ff',scale:1.05},
  {laneY:340,speed:-50,phase:.88,color:'#ff5ea8',scale:0.9}
];

// Hochbahn: ein Zug faehrt regelmaessig quer durchs Bild, hoch oben ueber den Daechern
const MONORAIL_Y=64;
const MONORAIL_SPEED=260;
const MONORAIL_PERIOD=13000; // ms zwischen zwei Durchfahrten

let stars=null,skyline=null,rain=null,entryArmed=true;
const doorAnim={}; // building id -> aktueller Oeffnungsgrad 0..1 (fuer den Hover-Schiebetuer-Effekt)
const DOOR_W=54;

function doorRect(b){
  const h=CRYONIS_GROUND_Y-b.topY,doorH=Math.min(70,h-40);
  return {x0:b.x-DOOR_W/2-14,y0:CRYONIS_GROUND_Y-doorH-14,w:DOOR_W+28,h:doorH+14};
}

export function buildingDoorAt(p){
  for(const b of CRYONIS_BUILDINGS){
    const d=doorRect(b);
    if(p.x>=d.x0&&p.x<=d.x0+d.w&&p.y>=d.y0&&p.y<=d.y0+d.h)return b.id;
  }
  return null;
}

export function initCryonisScene(){
  stars=[];for(let i=0;i<90;i++)stars.push({x:Math.random()*3600,y:Math.random()*180,r:Math.random()*1.5+.3,t:Math.random()*6});
  skyline=[];for(let i=0;i<30;i++)skyline.push({x:Math.random()*3800-100,w:50+Math.random()*80,h:60+Math.random()*140,c:Math.random()<0.5?'#1c1440':'#20124a'});
  rain=[];for(let i=0;i<70;i++)rain.push({x:Math.random()*3600,y:Math.random()*620,speed:260+Math.random()*180,len:10+Math.random()*10});
  entryArmed=true;
}

function carX(now,pl,car){
  const span=pl.w+300;
  let x=(now/1000*car.speed+car.phase*span)%span;
  if(x<0)x+=span;
  return x-150;
}

function drawWindows(ctx,x0,y0,w,h,color,seed){
  const cols=Math.max(2,Math.floor(w/30)),rows=Math.max(2,Math.floor(h/28));
  const cw=w/cols,ch=h/rows,now=performance.now();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const wx=x0+c*cw+cw*0.22,wy=y0+r*ch+ch*0.22,ww=cw*0.56,wh=ch*0.56;
    const flick=Math.sin(now/450+seed+r*3.1+c*1.7);
    const lit=flick>-0.25;
    ctx.fillStyle=lit?color:'rgba(10,8,26,.85)';
    ctx.globalAlpha=lit?(0.55+0.35*Math.max(0,flick)):1;
    ctx.fillRect(wx,wy,ww,wh);
    ctx.globalAlpha=1;
  }
}

function drawBuilding(ctx,b,openAmt){
  const x0=b.x-b.w/2,topY=b.topY,h=CRYONIS_GROUND_Y-topY;
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(b.x,CRYONIS_GROUND_Y+10,b.w*0.6,10,0,0,7);ctx.fill();
  const g=ctx.createLinearGradient(0,topY,0,CRYONIS_GROUND_Y);g.addColorStop(0,'#241a44');g.addColorStop(1,'#0f0a24');
  ctx.fillStyle=g;ctx.strokeStyle='#000';ctx.lineWidth=3;
  roundRect(ctx,x0,topY,b.w,h,12);ctx.fill();ctx.stroke();
  drawWindows(ctx,x0+8,topY+12,b.w-16,h-28,b.color,b.x*0.01);
  const antX=b.x+b.w*0.28;
  ctx.strokeStyle='#3a2f5a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(antX,topY);ctx.lineTo(antX,topY-16);ctx.stroke();
  ctx.fillStyle=Math.sin(performance.now()/260)>0?'#ff5a5a':'#5a1c1c';ctx.beginPath();ctx.arc(antX,topY-16,3,0,7);ctx.fill();
  ctx.fillStyle=b.color;ctx.globalAlpha=.85;ctx.fillRect(x0+5,topY+6,4,h-12);ctx.fillRect(x0+b.w-9,topY+6,4,h-12);ctx.globalAlpha=1;
  ctx.font='800 13px Fredoka';ctx.textAlign='center';
  const label=b.icon+' '+b.name,tw=ctx.measureText(label).width;
  const signY=topY+22;
  ctx.fillStyle='#0a0818';ctx.strokeStyle=b.color;ctx.lineWidth=2;
  roundRect(ctx,b.x-tw/2-10,signY-14,tw+20,26,10);ctx.fill();ctx.stroke();
  const pulse=.6+.4*Math.sin(performance.now()/300+b.x);
  ctx.fillStyle=b.glow;ctx.globalAlpha=pulse;ctx.fillText(label,b.x,signY+4);ctx.globalAlpha=1;
  const doorW=DOOR_W,doorH=Math.min(70,h-40),dy=CRYONIS_GROUND_Y;
  // Tuerrahmen + Innenraum-Glimmer (wird sichtbar, sobald die Fluegel aufgleiten)
  ctx.fillStyle='#05030f';ctx.strokeStyle=b.color;ctx.lineWidth=3;
  roundRect(ctx,b.x-doorW/2,dy-doorH,doorW,doorH,8);ctx.fill();ctx.stroke();
  const gp=.5+.5*Math.sin(performance.now()/260);
  ctx.fillStyle=b.glow;ctx.globalAlpha=(.35+.45*gp)*Math.max(0.15,openAmt);
  roundRect(ctx,b.x-doorW/2+5,dy-doorH+5,doorW-10,doorH-10,6);ctx.fill();ctx.globalAlpha=1;
  if(openAmt>0.05){
    ctx.fillStyle='#fff';ctx.font='700 16px Fredoka';ctx.textAlign='center';ctx.globalAlpha=openAmt;
    ctx.fillText('⇪',b.x,dy-doorH*0.32);ctx.globalAlpha=1;
  }
  // Zwei Tuerfluegel, die bei Hover zur Seite in die Wand gleiten
  const panelW=doorW/2,slide=panelW*openAmt;
  ctx.strokeStyle='#0a0818';ctx.lineWidth=2;
  ctx.fillStyle=b.color;
  roundRect(ctx,b.x-doorW/2-slide,dy-doorH,panelW,doorH,6);ctx.fill();ctx.stroke();
  roundRect(ctx,b.x+slide,dy-doorH,panelW,doorH,6);ctx.fill();ctx.stroke();
  ctx.strokeStyle=b.glow;ctx.lineWidth=1.5;ctx.globalAlpha=.6;
  ctx.beginPath();ctx.moveTo(b.x-doorW/2-slide+panelW*0.5,dy-doorH+6);ctx.lineTo(b.x-doorW/2-slide+panelW*0.5,dy-6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(b.x+slide+panelW*0.5,dy-doorH+6);ctx.lineTo(b.x+slide+panelW*0.5,dy-6);ctx.stroke();
  ctx.globalAlpha=1;
}

function drawCar(ctx,x,y,color,dir,scale){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(dir<0)ctx.scale(-1,1);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,14,24,4,0,0,7);ctx.fill();
  const trail=ctx.createLinearGradient(-70,0,-10,0);trail.addColorStop(0,'transparent');trail.addColorStop(1,color);
  ctx.fillStyle=trail;ctx.fillRect(-70,-2,60,4);
  ctx.fillStyle=color;ctx.strokeStyle='#0a0818';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-22,4);ctx.quadraticCurveTo(-14,-9,0,-9);ctx.quadraticCurveTo(14,-9,22,4);ctx.quadraticCurveTo(10,10,0,10);ctx.quadraticCurveTo(-10,10,-22,4);ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(200,240,255,.75)';ctx.beginPath();ctx.ellipse(2,-4,9,4,0,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(20,2,2.4,0,7);ctx.fill();
  ctx.restore();
}

function drawMonorail(ctx,pl){
  const now=performance.now();
  // Schiene: durchgehende Linie mit Stuetzen
  ctx.strokeStyle='rgba(150,170,220,.35)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,MONORAIL_Y+14);ctx.lineTo(pl.w,MONORAIL_Y+14);ctx.stroke();
  ctx.strokeStyle='rgba(150,170,220,.2)';ctx.lineWidth=2;
  for(let x=40;x<pl.w;x+=160){ctx.beginPath();ctx.moveTo(x,MONORAIL_Y+14);ctx.lineTo(x,MONORAIL_Y+30);ctx.stroke();}
  const cyclePos=(now%MONORAIL_PERIOD)/MONORAIL_PERIOD;
  const trainLen=260,travel=pl.w+trainLen;
  const headX=cyclePos*travel-trainLen;
  if(headX<-trainLen||headX>pl.w+trainLen)return;
  for(let i=0;i<3;i++){
    const cx=headX-i*88;
    ctx.fillStyle=i===0?'#dfe8ff':'#aebbee';ctx.strokeStyle='#0a0818';ctx.lineWidth=2;
    roundRect(ctx,cx-38,MONORAIL_Y-12,76,24,10);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(120,220,255,.7)';
    for(let w=-26;w<=26;w+=17)ctx.fillRect(cx+w,MONORAIL_Y-7,10,10);
  }
}

function drawRain(ctx,pl){
  ctx.strokeStyle='rgba(160,200,255,.28)';ctx.lineWidth=1.4;
  for(const d of rain){
    d.y+=(d.speed*0.016);
    if(d.y>620){d.y=-20;d.x=Math.random()*pl.w;}
    ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-4,d.y+d.len);ctx.stroke();
  }
}

export function renderCryonisCity(ctx,pl,hoveredDoorId){
  const now=performance.now();
  for(const b of CRYONIS_BUILDINGS){
    const target=(b.id===hoveredDoorId)?1:0;
    const cur=doorAnim[b.id]||0;
    doorAnim[b.id]=cur+(target-cur)*0.18;
  }
  const sky=ctx.createLinearGradient(0,0,0,CRYONIS_GROUND_Y);sky.addColorStop(0,'#1a0f3d');sky.addColorStop(.6,'#170b38');sky.addColorStop(1,'#0c0726');
  ctx.fillStyle=sky;ctx.fillRect(0,0,pl.w,CRYONIS_GROUND_Y);
  ctx.fillStyle='#cdeaff';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(pl.w*0.1,70,30,0,7);ctx.fill();
  ctx.fillStyle='#ffb3e6';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(pl.w*0.1+44,88,16,0,7);ctx.fill();ctx.globalAlpha=1;
  if(stars)for(const s of stars){const a=.3+.5*Math.abs(Math.sin(now/1000+s.t));ctx.fillStyle='rgba(220,226,255,'+a+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
  if(skyline)for(const s of skyline){ctx.fillStyle=s.c;ctx.fillRect(s.x,CRYONIS_GROUND_Y-s.h,s.w,s.h);
    ctx.fillStyle='rgba(122,224,255,.16)';for(let wy=CRYONIS_GROUND_Y-s.h+8;wy<CRYONIS_GROUND_Y-6;wy+=14)ctx.fillRect(s.x+5,wy,s.w-10,3);}
  drawMonorail(ctx,pl);
  // Gebaeude (Sortierung nach oben-Kante fuer etwas Tiefenwirkung)
  for(const b of CRYONIS_BUILDINGS)drawBuilding(ctx,b,doorAnim[b.id]||0);
  // Fliegende Autos ueber allem
  for(const car of CARS){const x=carX(now,pl,car),dir=car.speed>=0?1:-1;drawCar(ctx,x,car.laneY,car.color,dir,car.scale);}
  // Boden / nasse Strasse
  const groundG=ctx.createLinearGradient(0,CRYONIS_GROUND_Y,0,pl.h);groundG.addColorStop(0,'#100a26');groundG.addColorStop(1,'#050414');
  ctx.fillStyle=groundG;ctx.fillRect(0,CRYONIS_GROUND_Y,pl.w,pl.h-CRYONIS_GROUND_Y);
  ctx.strokeStyle='rgba(122,224,255,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,CRYONIS_GROUND_Y);ctx.lineTo(pl.w,CRYONIS_GROUND_Y);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.setLineDash([22,18]);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,pl.h-24);ctx.lineTo(pl.w,pl.h-24);ctx.stroke();ctx.setLineDash([]);
  for(const b of CRYONIS_BUILDINGS){
    const rg=ctx.createLinearGradient(0,CRYONIS_GROUND_Y,0,pl.h);rg.addColorStop(0,b.color+'55');rg.addColorStop(1,'transparent');
    ctx.fillStyle=rg;ctx.fillRect(b.x-b.w*0.42,CRYONIS_GROUND_Y,b.w*0.84,pl.h-CRYONIS_GROUND_Y);
  }
  // Regen ueber der ganzen Szene
  drawRain(ctx,pl);
}

export function getBuildingExitSpot(fromRoom){
  const b=CRYONIS_BUILDINGS.find(x=>x.room===fromRoom);
  if(!b)return null;
  return {x:b.x,y:CRYONIS_GROUND_Y+70}; // aussen vor der Tuer, ausserhalb der Eintritts-Trigger-Zone
}

export function checkCryonisEntrance(me){
  let onAny=false;
  for(const b of CRYONIS_BUILDINGS){
    const near=Math.abs(me.x-b.x)<46&&Math.abs(me.y-CRYONIS_GROUND_Y)<60;
    if(near){onAny=true;if(entryArmed){entryArmed=false;goToRoom(b.room,'cryonis');}}
  }
  if(!onAny)entryArmed=true;
}
