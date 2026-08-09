import { roundRect } from './render-utils.js';
import { INK } from './data/appearance.js';

// ---------------- Tanzflaeche ----------------
const FLOOR_X0=210,FLOOR_Y0=290,FLOOR_W=620,FLOOR_H=270,FLOOR_COLS=8,FLOOR_ROWS=5;
const TILE_COLORS=['#ff2e88','#31e1ff','#ffd166','#7be0b0','#b467ff','#ff9e64'];
const flash={}; // "col,row" -> verbleibende Flash-Zeit (s)
let speakerPulse=[0,0]; // links, rechts

function tileRect(col,row){
  const tw=FLOOR_W/FLOOR_COLS,th=FLOOR_H/FLOOR_ROWS;
  return {x:FLOOR_X0+col*tw,y:FLOOR_Y0+row*th,w:tw,h:th,cx:FLOOR_X0+col*tw+tw/2,cy:FLOOR_Y0+row*th+th/2};
}

export function clubDanceTileAt(p){
  if(p.x<FLOOR_X0||p.x>FLOOR_X0+FLOOR_W||p.y<FLOOR_Y0||p.y>FLOOR_Y0+FLOOR_H)return null;
  const col=Math.floor((p.x-FLOOR_X0)/(FLOOR_W/FLOOR_COLS)),row=Math.floor((p.y-FLOOR_Y0)/(FLOOR_H/FLOOR_ROWS));
  return {col,row};
}
export function flashDanceTile(col,row){flash[col+','+row]=0.5;}

const SPEAKER_L={x:150,y:170,r:60},SPEAKER_R={x:890,y:170,r:60};
export function clubSpeakerAt(p){
  if(Math.hypot(p.x-SPEAKER_L.x,p.y-SPEAKER_L.y)<SPEAKER_L.r)return 'left';
  if(Math.hypot(p.x-SPEAKER_R.x,p.y-SPEAKER_R.y)<SPEAKER_R.r)return 'right';
  return null;
}
export function pulseSpeaker(side){speakerPulse[side==='left'?0:1]=1;}

// ---------------- Fahrstuhl (fuer beide Etagen wiederverwendet) ----------------
const doorAnim={ground:0,roof:0};
export function clubElevatorHoverAt(p,floor){
  const ex=floor==='roof'?130:930,ey=400;
  return Math.abs(p.x-ex)<44&&p.y>ey-96&&p.y<ey+10;
}
function drawElevator(ctx,x,y,openAmt,label){
  const doorW=70,doorH=96,dy=y;
  // Rahmen aus gebuerstetem Metall
  const fg=ctx.createLinearGradient(x-doorW/2-10,dy-doorH-10,x+doorW/2+10,dy);
  fg.addColorStop(0,'#8891a3');fg.addColorStop(.5,'#c7cede');fg.addColorStop(1,'#7d859a');
  ctx.fillStyle=fg;ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,x-doorW/2-10,dy-doorH-10,doorW+20,doorH+16,10);ctx.fill();ctx.stroke();
  // Etagenanzeige
  ctx.fillStyle='#0a0818';roundRect(ctx,x-20,dy-doorH-28,40,18,5);ctx.fill();
  ctx.fillStyle='#31e1ff';ctx.font='800 12px Fredoka';ctx.textAlign='center';ctx.fillText(label,x,dy-doorH-15);
  // Tuerschacht (dunkel, wird beim Oeffnen sichtbar)
  ctx.fillStyle='#050308';roundRect(ctx,x-doorW/2,dy-doorH,doorW,doorH,6);ctx.fill();
  const gp=.5+.5*Math.sin(performance.now()/300);
  ctx.fillStyle='#9df3ff';ctx.globalAlpha=(.3+.4*gp)*Math.max(.12,openAmt);
  roundRect(ctx,x-doorW/2+5,dy-doorH+5,doorW-10,doorH-10,5);ctx.fill();ctx.globalAlpha=1;
  // Zwei Fluegel, gleiten bei Hover in die Wand
  const panelW=doorW/2,slide=panelW*openAmt;
  ctx.fillStyle='#dfe4ee';ctx.strokeStyle='#5b6274';ctx.lineWidth=2;
  roundRect(ctx,x-doorW/2-slide,dy-doorH,panelW,doorH,4);ctx.fill();ctx.stroke();
  roundRect(ctx,x+slide,dy-doorH,panelW,doorH,4);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#31e1ff';ctx.lineWidth=1.5;ctx.globalAlpha=.7;
  ctx.beginPath();ctx.moveTo(x-doorW/2-slide+panelW*0.5,dy-doorH+8);ctx.lineTo(x-doorW/2-slide+panelW*0.5,dy-8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+slide+panelW*0.5,dy-doorH+8);ctx.lineTo(x+slide+panelW*0.5,dy-8);ctx.stroke();
  ctx.globalAlpha=1;
  // Ruf-Knopf
  ctx.fillStyle='#1c1442';ctx.beginPath();ctx.arc(x+doorW/2+16,dy-doorH/2,7,0,7);ctx.fill();
  ctx.fillStyle=gp>0?'#7be0b0':'#3aa87a';ctx.beginPath();ctx.arc(x+doorW/2+16,dy-doorH/2,3.5,0,7);ctx.fill();
}

// ---------------- Erdgeschoss: Tanzflaeche + DJ-Buehne ----------------
function drawSpotlight(ctx,x,y,color,phase){
  const now=performance.now();
  ctx.fillStyle='#1c1442';ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,10,0,7);ctx.fill();ctx.stroke();
  const swing=Math.sin(now/1400+phase)*0.18,len=170;
  const bx=x+Math.sin(swing)*70,by=y+len;
  const beam=ctx.createLinearGradient(x,y,bx,by);
  const on=Math.sin(now/500+phase*3)>-.6;
  beam.addColorStop(0,color+(on?'aa':'22'));beam.addColorStop(1,'transparent');
  ctx.fillStyle=beam;
  ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.lineTo(bx+34,by);ctx.lineTo(bx-34,by);ctx.closePath();ctx.fill();
  ctx.fillStyle=on?color:'#3a3550';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();
}
function drawSpeakerStack(ctx,x,y,pulse){
  const bump=1+pulse*0.09;
  ctx.save();ctx.translate(x,y);ctx.scale(bump,bump);
  ctx.fillStyle='#18131f';ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,-42,-90,84,180,10);ctx.fill();ctx.stroke();
  for(const cy of [-55,-5,45]){
    ctx.fillStyle='#2a2436';ctx.beginPath();ctx.arc(0,cy,26,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#0c0a12';ctx.beginPath();ctx.arc(0,cy,15,0,7);ctx.fill();
    ctx.strokeStyle='rgba(180,103,255,'+(0.3+0.5*pulse)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,cy,20,0,7);ctx.stroke();
  }
  if(pulse>0.02){
    ctx.strokeStyle='rgba(180,103,255,'+pulse*0.6+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,-5,40+pulse*30,0,7);ctx.stroke();
  }
  ctx.restore();
}
function drawDJBooth(ctx,x,y){
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y+58,120,16,0,0,7);ctx.fill();
  ctx.fillStyle='#241a3a';ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,x-110,y-10,220,60,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#150c26';roundRect(ctx,x-98,y-2,196,30,6);ctx.fill();
  const now=performance.now();
  for(const dx of [-55,55]){
    ctx.save();ctx.translate(x+dx,y+14);
    ctx.fillStyle='#0c0a12';ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.strokeStyle='#31e1ff';ctx.lineWidth=2;ctx.stroke();
    ctx.rotate(now/900+dx);
    ctx.strokeStyle='rgba(180,103,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(18,0);ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle='#ffd166';ctx.font='800 11px Fredoka';ctx.textAlign='center';ctx.fillText('DJ',x,y-16);
}
function drawDanceFloor(ctx,playersHere){
  const now=performance.now();
  ctx.strokeStyle='#000';ctx.lineWidth=3;
  for(let row=0;row<FLOOR_ROWS;row++)for(let col=0;col<FLOOR_COLS;col++){
    const r=tileRect(col,row);
    const key=col+','+row;
    let f=flash[key]||0;
    if(f>0){f=Math.max(0,f-0.02);flash[key]=f;}
    const nearPlayer=playersHere.some(pl=>Math.abs(pl.x-r.cx)<r.w*0.55&&Math.abs(pl.y-r.cy)<r.h*0.55);
    const wave=.5+.5*Math.sin(now/650+(col+row)*0.5);
    const baseColor=TILE_COLORS[(col+row)%TILE_COLORS.length];
    ctx.fillStyle=baseColor;
    ctx.globalAlpha=0.35+0.35*wave+(nearPlayer?0.3:0)+f*0.6;
    ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.globalAlpha=1;
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    if(nearPlayer){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(r.x+2,r.y+2,r.w-4,r.h-4);ctx.strokeStyle='#000';ctx.lineWidth=3;}
  }
}

export function renderClubFloor(ctx,playersHere,hoveredElevator){
  // Wand
  const wg=ctx.createLinearGradient(0,0,0,220);wg.addColorStop(0,'#2a0f45');wg.addColorStop(1,'#160726');
  ctx.fillStyle=wg;ctx.fillRect(0,0,1040,220);
  const colors=['#3ddc70','#ffe15e','#ff4d4d','#ff5ea8','#31e1ff','#3ddc70','#ffb14d'];
  const lx=[160,300,440,520,600,740,880];
  for(let i=0;i<lx.length;i++)drawSpotlight(ctx,lx[i],40,colors[i],i*1.3);
  drawSpeakerStack(ctx,SPEAKER_L.x,SPEAKER_L.y,speakerPulse[0]);
  drawSpeakerStack(ctx,SPEAKER_R.x,SPEAKER_R.y,speakerPulse[1]);
  drawDJBooth(ctx,520,150);
  speakerPulse[0]=Math.max(0,speakerPulse[0]-0.035);
  speakerPulse[1]=Math.max(0,speakerPulse[1]-0.035);
  // Boden
  const fg=ctx.createLinearGradient(0,220,0,602);fg.addColorStop(0,'#1c0e30');fg.addColorStop(1,'#120820');
  ctx.fillStyle=fg;ctx.fillRect(0,220,1040,382);
  drawDanceFloor(ctx,playersHere);
  // Fahrstuhl (rechts, ersetzt eine Treppe)
  doorAnimStep('ground',hoveredElevator);
  drawElevator(ctx,930,400,doorAnimGet('ground'),'1');
}

export function renderClubRoof(ctx,hoveredElevator){
  const now=performance.now();
  const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#1a0f3d');sky.addColorStop(1,'#0a0520');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1040,300);
  ctx.fillStyle='#cdeaff';ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(880,70,26,0,7);ctx.fill();ctx.globalAlpha=1;
  if(!roofStars)roofStars=Array.from({length:60},()=>({x:Math.random()*1040,y:Math.random()*260,r:Math.random()*1.4+.3,t:Math.random()*6}));
  for(const s of roofStars){const a=.3+.5*Math.abs(Math.sin(now/1000+s.t));ctx.fillStyle='rgba(220,226,255,'+a+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
  // Ferne Skyline
  const skylineDefs=[[60,60,120],[220,90,80],[340,40,150],[560,70,110],[720,50,140],[860,80,90]];
  for(const [x,w,h] of skylineDefs){
    ctx.fillStyle='#170c30';ctx.fillRect(x,300-h,w,h);
    ctx.fillStyle='rgba(122,224,255,.18)';for(let wy=300-h+8;wy<292;wy+=14)ctx.fillRect(x+5,wy,w-10,3);
  }
  // Boden Terrasse
  const fg=ctx.createLinearGradient(0,300,0,602);fg.addColorStop(0,'#1c0e30');fg.addColorStop(1,'#100718');
  ctx.fillStyle=fg;ctx.fillRect(0,300,1040,302);
  // Gelaender
  ctx.strokeStyle='#5b4f7a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,300);ctx.lineTo(1040,300);ctx.stroke();
  for(let x=20;x<1040;x+=60){ctx.beginPath();ctx.moveTo(x,300);ctx.lineTo(x,330);ctx.stroke();}
  // Lounge-Sitzecke
  ctx.fillStyle='#2a1f45';roundRect(ctx,420,420,200,70,20);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;roundRect(ctx,420,420,200,70,20);ctx.stroke();
  ctx.fillStyle='#3a2c5a';roundRect(ctx,460,400,120,40,16);ctx.fill();ctx.strokeStyle=INK;roundRect(ctx,460,400,120,40,16);ctx.stroke();
  for(const [lx,ly] of [[480,410],[560,410],[620,460]]){
    ctx.fillStyle=Math.sin(now/400+lx)>0?'#ffd166':'#7a6a3a';ctx.beginPath();ctx.arc(lx,ly,4,0,7);ctx.fill();
  }
  // Laternen-Lichterkette
  ctx.strokeStyle='rgba(180,103,255,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(60,340);ctx.quadraticCurveTo(520,380,980,340);ctx.stroke();
  for(let t=0;t<=1;t+=0.08){
    const x=60+(980-60)*t,y=340+Math.sin(t*Math.PI)*40;
    ctx.fillStyle=Math.sin(now/300+t*20)>0?'#ffe15e':'#8a7a3a';ctx.beginPath();ctx.arc(x,y,3.4,0,7);ctx.fill();
  }
  // Fahrstuhl (links)
  doorAnimStep('roof',hoveredElevator);
  drawElevator(ctx,130,400,doorAnimGet('roof'),'2');
}

let roofStars=null;

function doorAnimGet(floor){return doorAnim[floor]||0;}
function doorAnimStep(floor,hovered){
  const target=hovered?1:0,cur=doorAnim[floor]||0;
  doorAnim[floor]=cur+(target-cur)*0.18;
}
