import { getMe, goToRoom } from './core.js';
import { roundRect, clamp } from './render-utils.js';
import { CRYONIS_BUILDINGS, CRYONIS_GROUND_Y } from './data/rooms.js';

const CARS=[
  {laneY:150,speed:76, phase:.10,color:'#ff2e88'},
  {laneY:210,speed:-54,phase:.62,color:'#31e1ff'},
  {laneY:270,speed:95, phase:.35,color:'#ffd166'},
  {laneY:330,speed:-70,phase:.80,color:'#7be0b0'},
  {laneY:195,speed:60, phase:.48,color:'#b467ff'}
];

let stars=null,skyline=null,entryArmed=true;

export function initCryonisScene(){
  stars=[];for(let i=0;i<120;i++)stars.push({x:Math.random()*3400,y:Math.random()*CRYONIS_GROUND_Y*0.6,r:Math.random()*1.6+.4,t:Math.random()*6});
  skyline=[];for(let i=0;i<26;i++)skyline.push({x:Math.random()*3600-100,w:60+Math.random()*90,h:120+Math.random()*260,c:Math.random()<0.5?'#1c1440':'#20124a'});
  entryArmed=true;
}

function carX(now,pl,car){
  const span=pl.w+300;
  let x=(now/1000*car.speed+car.phase*span)%span;
  if(x<0)x+=span;
  return x-150;
}

function drawWindows(ctx,x0,y0,w,h,color,seed){
  const cols=Math.max(2,Math.floor(w/34)),rows=Math.max(3,Math.floor(h/40));
  const cw=w/cols,ch=h/rows,now=performance.now();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const wx=x0+c*cw+cw*0.22,wy=y0+r*ch+ch*0.22,ww=cw*0.56,wh=ch*0.56;
    const flick=Math.sin(now/500+seed+r*3.1+c*1.7);
    const lit=flick>-0.25;
    ctx.fillStyle=lit?color:'rgba(10,8,26,.85)';
    ctx.globalAlpha=lit?(0.55+0.35*Math.max(0,flick)):1;
    ctx.fillRect(wx,wy,ww,wh);
    ctx.globalAlpha=1;
  }
}

function drawBuilding(ctx,b,pl){
  const x0=b.x-b.w/2,topY=b.topY,h=CRYONIS_GROUND_Y-topY;
  // Schatten am Boden
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(b.x,CRYONIS_GROUND_Y+14,b.w*0.62,16,0,0,7);ctx.fill();
  // Baukoerper
  const g=ctx.createLinearGradient(0,topY,0,CRYONIS_GROUND_Y);g.addColorStop(0,'#241a44');g.addColorStop(1,'#0f0a24');
  ctx.fillStyle=g;ctx.strokeStyle='#000';ctx.lineWidth=3;
  roundRect(ctx,x0,topY,b.w,h,14);ctx.fill();ctx.stroke();
  // Fenster
  drawWindows(ctx,x0+10,topY+16,b.w-20,h-36,b.color,b.x*0.01);
  // Dach-Antenne mit Blinklicht
  const antX=b.x+b.w*0.28;
  ctx.strokeStyle='#3a2f5a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(antX,topY);ctx.lineTo(antX,topY-26);ctx.stroke();
  ctx.fillStyle=Math.sin(performance.now()/260)>0?'#ff5a5a':'#5a1c1c';ctx.beginPath();ctx.arc(antX,topY-26,4,0,7);ctx.fill();
  // Vertikaler Neon-Streifen
  ctx.fillStyle=b.color;ctx.globalAlpha=.85;ctx.fillRect(x0+6,topY+8,5,h-16);ctx.fillRect(x0+b.w-11,topY+8,5,h-16);ctx.globalAlpha=1;
  // Leuchtschild
  ctx.font='800 15px Fredoka';ctx.textAlign='center';
  const label=b.icon+' '+b.name,tw=ctx.measureText(label).width;
  const signY=topY+34;
  ctx.fillStyle='#0a0818';ctx.strokeStyle=b.color;ctx.lineWidth=3;
  roundRect(ctx,b.x-tw/2-14,signY-18,tw+28,32,12);ctx.fill();ctx.stroke();
  const pulse=.6+.4*Math.sin(performance.now()/300+b.x);
  ctx.fillStyle=b.glow;ctx.globalAlpha=pulse;ctx.fillText(label,b.x,signY+5);ctx.globalAlpha=1;
  // Eingang
  const doorW=64,doorH=90,dy=CRYONIS_GROUND_Y;
  ctx.fillStyle='#05030f';ctx.strokeStyle=b.color;ctx.lineWidth=4;
  roundRect(ctx,b.x-doorW/2,dy-doorH,doorW,doorH,10);ctx.fill();ctx.stroke();
  const gp=.5+.5*Math.sin(performance.now()/260);
  ctx.fillStyle=b.glow;ctx.globalAlpha=.25+.35*gp;
  roundRect(ctx,b.x-doorW/2+6,dy-doorH+6,doorW-12,doorH-12,8);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#fff';ctx.font='700 22px Fredoka';ctx.textAlign='center';ctx.fillText('⇪',b.x,dy-doorH*0.32);
}

function drawCar(ctx,x,y,color,dir){
  ctx.save();ctx.translate(x,y);if(dir<0)ctx.scale(-1,1);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,16,26,5,0,0,7);ctx.fill();
  // Lichtschweif
  const trail=ctx.createLinearGradient(-70,0,-10,0);trail.addColorStop(0,'transparent');trail.addColorStop(1,color);
  ctx.fillStyle=trail;ctx.fillRect(-70,-2,60,4);
  // Karosserie
  ctx.fillStyle=color;ctx.strokeStyle='#0a0818';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-22,4);ctx.quadraticCurveTo(-14,-9,0,-9);ctx.quadraticCurveTo(14,-9,22,4);ctx.quadraticCurveTo(10,10,0,10);ctx.quadraticCurveTo(-10,10,-22,4);ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(200,240,255,.75)';ctx.beginPath();ctx.ellipse(2,-4,9,4,0,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(20,2,2.4,0,7);ctx.fill();
  ctx.restore();
}

export function renderCryonisCity(ctx,pl){
  const now=performance.now();
  // Himmel
  const sky=ctx.createLinearGradient(0,0,0,pl.h);sky.addColorStop(0,'#1a0f3d');sky.addColorStop(.55,'#150a30');sky.addColorStop(1,'#05030f');
  ctx.fillStyle=sky;ctx.fillRect(0,0,pl.w,pl.h);
  // Doppelmond
  ctx.fillStyle='#cdeaff';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(pl.w*0.14,120,46,0,7);ctx.fill();
  ctx.fillStyle='#ffb3e6';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(pl.w*0.14+70,150,26,0,7);ctx.fill();ctx.globalAlpha=1;
  // Sterne
  if(stars)for(const s of stars){const a=.3+.5*Math.abs(Math.sin(now/1000+s.t));ctx.fillStyle='rgba(220,226,255,'+a+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
  // Ferne Skyline (Silhouette)
  if(skyline)for(const s of skyline){ctx.fillStyle=s.c;ctx.fillRect(s.x,CRYONIS_GROUND_Y-s.h,s.w,s.h);
    ctx.fillStyle='rgba(122,224,255,.18)';for(let wy=CRYONIS_GROUND_Y-s.h+10;wy<CRYONIS_GROUND_Y-8;wy+=18)ctx.fillRect(s.x+6,wy,s.w-12,4);}
  // Boden / nasse Strasse
  const groundG=ctx.createLinearGradient(0,CRYONIS_GROUND_Y,0,pl.h);groundG.addColorStop(0,'#100a26');groundG.addColorStop(1,'#050414');
  ctx.fillStyle=groundG;ctx.fillRect(0,CRYONIS_GROUND_Y,pl.w,pl.h-CRYONIS_GROUND_Y);
  ctx.strokeStyle='rgba(122,224,255,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,CRYONIS_GROUND_Y);ctx.lineTo(pl.w,CRYONIS_GROUND_Y);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.setLineDash([26,22]);ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,pl.h-40);ctx.lineTo(pl.w,pl.h-40);ctx.stroke();ctx.setLineDash([]);
  // Neon-Reflexionen im Boden je Gebaeude
  for(const b of CRYONIS_BUILDINGS){
    const rg=ctx.createLinearGradient(0,CRYONIS_GROUND_Y,0,pl.h);rg.addColorStop(0,b.color+'55');rg.addColorStop(1,'transparent');
    ctx.fillStyle=rg;ctx.fillRect(b.x-b.w*0.42,CRYONIS_GROUND_Y,b.w*0.84,pl.h-CRYONIS_GROUND_Y);
  }
  // Gebaeude
  for(const b of CRYONIS_BUILDINGS)drawBuilding(ctx,b,pl);
  // Fliegende Autos
  for(const car of CARS){const x=carX(now,pl,car),dir=car.speed>=0?1:-1;drawCar(ctx,x,car.laneY,car.color,dir);}
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
