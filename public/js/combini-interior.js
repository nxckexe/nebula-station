import { roundRect } from './render-utils.js';
import { INK } from './data/appearance.js';
import { FOOD_ITEMS } from './data/store-items.js';

// Ladenthemen: Farben lehnen sich an die echten Fassaden an (siehe cryonis-city.js)
const THEMES={
  familymart:{trim:'#00a651',trim2:'#0072bc',counter:'#f2f4f0',shelf:'#dfe4d8',shelfEdge:'#00a651',cashierAccent:'#00a651'},
  seven:{trim:'#ff8200',trim2:'#e2231a',counter:'#eee7d5',shelf:'#f2ead0',shelfEdge:'#e2231a',cashierAccent:'#e2231a'}
};

const SLOT_POS=[{x:260,y:300},{x:460,y:300},{x:260,y:410},{x:460,y:410},{x:260,y:520},{x:460,y:520}];
const MACHINE_BOX={x0:585,y0:280,x1:715,y1:430};
const COUNTER_BOX={x0:770,y0:330,x1:1010,y1:480};

// Nimmt sowohl die reine Laden-Kennung ('seven') als auch die Zimmer-ID ('cryo_seven') entgegen,
// damit ein Aufruf mit der Raum-ID (wie sie ueberall sonst im Spiel verwendet wird) nicht auf das
// falsche Theme/leere Regale zurueckfaellt.
function normalizeStore(id){return id==='cryo_familymart'?'familymart':id==='cryo_seven'?'seven':id;}

function slotItemsFor(storeId){return FOOD_ITEMS.filter(i=>i.stores.includes(normalizeStore(storeId))&&!i.machineOnly);}

export function combiniShelfItemAt(p,storeId){
  const items=slotItemsFor(storeId);
  for(let i=0;i<items.length&&i<SLOT_POS.length;i++){
    const s=SLOT_POS[i];
    if(Math.abs(p.x-s.x)<62&&Math.abs(p.y-s.y)<42)return items[i].id;
  }
  return null;
}
export function combiniMachineAt(p,storeId){
  if(normalizeStore(storeId)!=='seven')return false;
  return p.x>=MACHINE_BOX.x0&&p.x<=MACHINE_BOX.x1&&p.y>=MACHINE_BOX.y0&&p.y<=MACHINE_BOX.y1;
}

function drawTileWall(ctx,theme){
  ctx.fillStyle=theme.trim;ctx.fillRect(0,0,1040,50);
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2;
  for(let x=30;x<1040;x+=70){ctx.fillStyle='#fff';ctx.globalAlpha=.85+.15*Math.sin(performance.now()/500+x);roundRect(ctx,x-20,10,40,14,5);ctx.fill();ctx.globalAlpha=1;}
  ctx.fillStyle='#eef1f0';ctx.fillRect(0,50,1040,180);
  ctx.strokeStyle='rgba(150,160,155,.5)';ctx.lineWidth=1.5;
  for(let ty=50;ty<230;ty+=24){for(let tx=(((ty-50)/24)%2)*30;tx<1040;tx+=60){ctx.strokeRect(tx,ty,60,24);}}
}
function drawCityWindow(ctx,x0,y0,w,h){
  ctx.fillStyle='#c7cfd6';ctx.strokeStyle='#000';ctx.lineWidth=3;
  roundRect(ctx,x0-10,y0-10,w+20,h+20,10);ctx.fill();ctx.stroke();
  ctx.save();roundRect(ctx,x0,y0,w,h,4);ctx.clip();
  const now=performance.now();
  const sky=ctx.createLinearGradient(0,y0,0,y0+h);sky.addColorStop(0,'#1a0f3d');sky.addColorStop(1,'#0c0726');
  ctx.fillStyle=sky;ctx.fillRect(x0,y0,w,h);
  const towers=[[0,.55,.35],[.28,.85,.55],[.55,.6,.75],[.78,.95,.4]];
  for(const [tx,th,seed] of towers){
    const tw2=w*0.22,tx2=x0+tx*w,th2=h*th;
    ctx.fillStyle='#241a44';ctx.fillRect(tx2,y0+h-th2,tw2,th2);
    ctx.fillStyle='rgba(122,224,255,.5)';
    for(let wy=y0+h-th2+6;wy<y0+h-6;wy+=12){const lit=Math.sin(now/500+seed*7+wy)>0.1;if(lit)ctx.fillRect(tx2+4,wy,8,6);}
  }
  const carX=(now/40)%(w+40)-20;
  ctx.strokeStyle='rgba(255,120,190,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0+carX,y0+h*0.25);ctx.lineTo(x0+carX-18,y0+h*0.25);ctx.stroke();
  ctx.restore();
  ctx.strokeStyle='#8a94a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x0+w/2,y0);ctx.lineTo(x0+w/2,y0+h);ctx.moveTo(x0,y0+h/2);ctx.lineTo(x0+w,y0+h/2);ctx.stroke();
}
function drawTileFloor(ctx){
  ctx.fillStyle='#e9e4d6';ctx.fillRect(0,230,1040,372);
  ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=1;
  for(let x=0;x<1040;x+=52)for(let y=230;y<602;y+=52){ctx.strokeRect(x,y,52,52);}
}
// -196 Strong Zero-Dose: silbrig gebuersteter Korpus, große "-196"-Wortmarke, farbige
// Sorten-Banderole (gelb=Lemon, hellblau=Grapefruit) und ein Zitrusfrucht-Farbtupfer oben,
// dem echten Dosendesign nachempfunden, aber als Vektorgrafik statt Fotoausschnitt.
function drawStrongZeroCan(ctx,cx,cy,flavor){
  const w=30,h=58,x0=cx-w/2,y0=cy-h/2;
  const isLemon=flavor==='lemon';
  const stripe=isLemon?'#ffd93d':'#8fd9ea';
  const fruit=isLemon?'#ffd93d':'#8fce4a';
  ctx.save();
  const body=ctx.createLinearGradient(x0,0,x0+w,0);
  body.addColorStop(0,'#c9ced4');body.addColorStop(.15,'#f4f6f8');body.addColorStop(.5,'#dfe3e6');body.addColorStop(.85,'#f4f6f8');body.addColorStop(1,'#b9bfc4');
  ctx.fillStyle=body;ctx.strokeStyle=INK;ctx.lineWidth=1.6;
  roundRect(ctx,x0,y0,w,h,6);ctx.fill();ctx.stroke();
  ctx.save();roundRect(ctx,x0,y0,w,h,6);ctx.clip();
  ctx.beginPath();ctx.ellipse(cx,y0+7,w*0.7,5,0,0,7);ctx.fillStyle='#aeb4b9';ctx.fill();
  ctx.fillStyle=fruit;ctx.beginPath();ctx.arc(cx-6,y0+13,6.5,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=.6;
  for(let i=0;i<6;i++){const a=i/6*6.28;ctx.beginPath();ctx.moveTo(cx-6,y0+13);ctx.lineTo(cx-6+Math.cos(a)*6,y0+13+Math.sin(a)*6);ctx.stroke();}
  ctx.fillStyle=INK;ctx.font='800 8px Fredoka';ctx.textAlign='center';ctx.fillText('-196',cx,y0+30);
  ctx.fillStyle=stripe;ctx.fillRect(x0,y0+h*0.62,w,h*0.24);
  ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.strokeRect(x0,y0+h*0.62,w,h*0.24);
  ctx.fillStyle=isLemon?'#2a2a2a':'#1a3a44';ctx.font='700 5.5px Fredoka';ctx.fillText('STRONG ZERO',cx,y0+h*0.62+9);
  ctx.fillStyle='#e2231a';ctx.font='800 8px Fredoka';ctx.fillText('9%',cx,y0+h*0.62+19);
  ctx.restore();
  ctx.restore();
}
function drawShelf(ctx,x,y,item){
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(x,y+46,68,10,0,0,7);ctx.fill();
  ctx.fillStyle='#c9a06a';ctx.strokeStyle=INK;ctx.lineWidth=3;
  roundRect(ctx,x-64,y-42,128,10,3);ctx.fill();ctx.stroke();
  roundRect(ctx,x-64,y+30,128,10,3);ctx.fill();ctx.stroke();
  ctx.fillStyle='#a9814e';roundRect(ctx,x-64,y-42,8,82,2);ctx.fill();roundRect(ctx,x+56,y-42,8,82,2);ctx.fill();
  if(!item)return;
  ctx.fillStyle=item.ico?'#fff8e8':'#fff';ctx.strokeStyle=INK;ctx.lineWidth=3;
  roundRect(ctx,x-46,y-30,92,54,10);ctx.fill();ctx.stroke();
  if(item.canArt)drawStrongZeroCan(ctx,x,y-2,item.canArt);
  else{ctx.font='30px Fredoka';ctx.textAlign='center';ctx.fillText(item.ico,x,y-1);}
  ctx.fillStyle='#ffd166';ctx.strokeStyle=INK;ctx.lineWidth=2;
  const label=item.price+' ✦',tw=ctx.measureText(label).width;
  ctx.font='700 12px Fredoka';const pw=Math.max(tw+14,0);
  roundRect(ctx,x-pw/2,y+26,pw,18,8);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.fillText(label,x,y+39);
}
function drawCounter(ctx,x0,y0,x1,y1,theme){
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse((x0+x1)/2,y1+14,(x1-x0)*0.52,10,0,0,7);ctx.fill();
  ctx.fillStyle=theme.counter;ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,x0,y0,x1-x0,y1-y0,14);ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.trim;ctx.fillRect(x0+6,y1-22,x1-x0-12,14);
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(x0+6,y1-22,x1-x0-12,14);
  // Kasse
  const rx=x0+34,ry=y0-14;
  ctx.fillStyle='#e7e9ee';ctx.strokeStyle=INK;ctx.lineWidth=3;roundRect(ctx,rx-30,ry-8,60,26,6);ctx.fill();ctx.stroke();
  ctx.fillStyle='#1c1442';roundRect(ctx,rx-22,ry-4,44,14,3);ctx.fill();
  ctx.fillStyle=Math.sin(performance.now()/400)>0?'#7be0b0':'#3a8a63';ctx.font='700 9px Fredoka';ctx.textAlign='center';ctx.fillText('READY',rx,ry+6);
}
function drawCashier(ctx,cx,cy,theme){
  const now=performance.now();
  const bob=Math.sin(now/900)*2;
  ctx.fillStyle='#ffd9a0';ctx.strokeStyle=INK;ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(cx,cy+30+bob,30,34,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.cashierAccent;ctx.beginPath();ctx.moveTo(cx-28,cy+50+bob);ctx.lineTo(cx-24,cy+8+bob);ctx.quadraticCurveTo(cx,cy-2+bob,cx+24,cy+8+bob);ctx.lineTo(cx+28,cy+50+bob);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy+18+bob,6,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#ffd9a0';ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy-14+bob,24,0,7);ctx.fill();ctx.stroke();
  const blink=Math.sin(now/2600)>0.96;
  ctx.fillStyle=INK;
  if(blink){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-11,cy-15+bob);ctx.lineTo(cx-3,cy-15+bob);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+3,cy-15+bob);ctx.lineTo(cx+11,cy-15+bob);ctx.stroke();}
  else{ctx.beginPath();ctx.arc(cx-7,cy-15+bob,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(cx+7,cy-15+bob,3,0,7);ctx.fill();}
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy-6+bob,7,.15*Math.PI,.85*Math.PI);ctx.stroke();
  const cyclePos=(now/1000)%9;
  if(cyclePos<2.4){
    const a=Math.min(1,cyclePos/0.4)*Math.min(1,(2.4-cyclePos)/0.4);
    ctx.globalAlpha=Math.max(0,Math.min(1,a));
    ctx.fillStyle='#fff';ctx.strokeStyle=INK;ctx.lineWidth=2;
    roundRect(ctx,cx+18,cy-70+bob,86,26,10);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+30,cy-46+bob);ctx.lineTo(cx+22,cy-38+bob);ctx.lineTo(cx+38,cy-46+bob);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=INK;ctx.font='700 12px Fredoka';ctx.textAlign='center';ctx.fillText('Irasshaimase!',cx+61,cy-53+bob);
    ctx.globalAlpha=1;
  }
}
function drawPromoStandee(ctx,x,y){
  ctx.fillStyle='#c9a06a';ctx.fillRect(x-3,y+40,6,50);ctx.fillRect(x-3,y+40,6,50);
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(x-3,y+40,6,50);
  const g=ctx.createLinearGradient(x-40,y-50,x+40,y+40);g.addColorStop(0,'#ffd166');g.addColorStop(1,'#ff5ea8');
  ctx.fillStyle=g;ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,x-42,y-52,84,92,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='800 22px Fredoka';ctx.textAlign='center';ctx.fillText('NEU!',x,y-14);
  ctx.font='700 13px Fredoka';ctx.fillText('Frische',x,y+8);ctx.fillText('Snacks',x,y+24);
}
function drawSlushMachine(ctx,x0,y0,x1,y1,pourT){
  const cx=(x0+x1)/2;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(cx,y1+10,(x1-x0)*0.5,9,0,0,7);ctx.fill();
  ctx.fillStyle='#f2f2f2';ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,x0,y0,x1-x0,y1-y0,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#e2231a';ctx.fillRect(x0,y0,x1-x0,16);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(x0,y0,x1-x0,16);
  ctx.fillStyle='#fff';ctx.font='800 11px Fredoka';ctx.textAlign='center';ctx.fillText('SLUSH',cx,y0+12);
  const now=performance.now();
  const winX=x0+14,winY=y0+24,winW=x1-x0-28,winH=60;
  ctx.fillStyle='#0a0a12';roundRect(ctx,winX,winY,winW,winH,6);ctx.fill();
  ctx.save();roundRect(ctx,winX,winY,winW,winH,6);ctx.clip();
  const swirl=Math.sin(now/500)*8;
  ctx.fillStyle='#2f6fff';ctx.fillRect(winX,winY,winW,winH);
  ctx.fillStyle='#ff2e5e';ctx.beginPath();
  ctx.moveTo(winX,winY+winH*0.5+swirl);
  ctx.quadraticCurveTo(winX+winW*0.5,winY+winH*0.3+swirl,winX+winW,winY+winH*0.55-swirl);
  ctx.lineTo(winX+winW,winY+winH);ctx.lineTo(winX,winY+winH);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<6;i++){const bx=winX+((now/300+i*40)%winW);ctx.beginPath();ctx.arc(bx,winY+winH*0.3+i*4,2.5,0,7);ctx.fill();}
  ctx.restore();
  ctx.strokeStyle='#8a8a8a';ctx.lineWidth=2;ctx.strokeRect(winX,winY,winW,winH);
  ctx.fillStyle='#c7c7c7';ctx.strokeStyle=INK;ctx.lineWidth=2;
  roundRect(ctx,x1-14,y0+40,14,34,4);ctx.fill();ctx.stroke();
  // Ausgabe: Becher, der sich waehrend pourT (0..1) fuellt
  const cupX=cx,cupY=y1-16;
  if(pourT>0){
    ctx.strokeStyle='rgba(160,200,255,.9)';ctx.lineWidth=3;
    ctx.globalAlpha=Math.min(1,pourT*3);
    ctx.beginPath();ctx.moveTo(cx,winY+winH);ctx.lineTo(cx,cupY-24);ctx.stroke();
    ctx.globalAlpha=1;
  }
  ctx.fillStyle='#fff';ctx.strokeStyle=INK;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(cupX-16,cupY-24);ctx.lineTo(cupX-12,cupY+8);ctx.lineTo(cupX+12,cupY+8);ctx.lineTo(cupX+16,cupY-24);ctx.closePath();ctx.fill();ctx.stroke();
  if(pourT>0.02){
    const fillH=Math.min(1,pourT)*28;
    ctx.save();ctx.beginPath();ctx.moveTo(cupX-16,cupY-24);ctx.lineTo(cupX-12,cupY+8);ctx.lineTo(cupX+12,cupY+8);ctx.lineTo(cupX+16,cupY-24);ctx.closePath();ctx.clip();
    ctx.fillStyle='#7f5fff';ctx.fillRect(cupX-16,cupY+8-fillH,32,fillH);
    ctx.restore();
  }
}

export function renderCombiniInterior(ctx,rawStoreId,opts){
  const storeId=normalizeStore(rawStoreId);
  const theme=THEMES[storeId]||THEMES.familymart;
  const playersHere=(opts&&opts.playersHere)||[];
  const pourT=(opts&&opts.pourT)||0;
  drawTileWall(ctx,theme);
  drawCityWindow(ctx,760,60,220,150);
  drawTileFloor(ctx);
  const items=slotItemsFor(storeId);
  for(let i=0;i<SLOT_POS.length;i++){const s=SLOT_POS[i];drawShelf(ctx,s.x,s.y,items[i]||null);}
  if(storeId==='seven')drawSlushMachine(ctx,MACHINE_BOX.x0,MACHINE_BOX.y0,MACHINE_BOX.x1,MACHINE_BOX.y1,pourT);
  else drawPromoStandee(ctx,650,470);
  drawCounter(ctx,COUNTER_BOX.x0,COUNTER_BOX.y0,COUNTER_BOX.x1,COUNTER_BOX.y1,theme);
  drawCashier(ctx,(COUNTER_BOX.x0+COUNTER_BOX.x1)/2,COUNTER_BOX.y0-6,theme);
}
