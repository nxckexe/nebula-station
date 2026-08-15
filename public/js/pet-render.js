import { INK } from './data/appearance.js';
import { shade } from './render-utils.js';

// Gemeinsame Zeichenfunktion fuer Haustiere - wird sowohl von der Welt-Ansicht
// (Haustier laeuft dem Spieler hinterher) als auch der Adoptions-Vorschau im
// Pet-Shop-Modal verwendet, damit beide garantiert exakt gleich aussehen.
export function drawPetShape(ctx,x,y,species,color,now,face){
  const cy=y+Math.sin((now||0)/260)*2;
  const ex=(face||1)*1.5;
  ctx.strokeStyle=INK;ctx.lineWidth=2.5;
  if(species==='sprout'){ctx.fillStyle='#3fae6c';ctx.beginPath();ctx.ellipse(x,cy-16,4,7,0.3,0,7);ctx.fill();ctx.stroke();}
  else if(species==='spark'){ctx.strokeStyle=INK;ctx.lineWidth=2;
    for(const dx of [-4,0,4]){ctx.beginPath();ctx.moveTo(x+dx,cy-11);ctx.lineTo(x+dx*1.4,cy-19);ctx.stroke();}}
  else if(species==='fin'){ctx.fillStyle=shade(color,-20);ctx.beginPath();ctx.moveTo(x,cy-13);ctx.lineTo(x-5,cy-22);ctx.lineTo(x+5,cy-13);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(species==='wing'){ctx.fillStyle='rgba(255,255,255,.7)';
    ctx.beginPath();ctx.ellipse(x-14,cy-2,7,5,-0.4,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(x+14,cy-2,7,5,0.4,0,7);ctx.fill();ctx.stroke();}
  ctx.fillStyle=color;ctx.strokeStyle=INK;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(x,cy,15,13,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(x-5,cy-4,5,4,-0.3,0,7);ctx.fill();
  if(species==='mochi'){
    ctx.fillStyle=color;ctx.strokeStyle=INK;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.ellipse(x-8,cy-12,4,5,0,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(x+8,cy-12,4,5,0,0,7);ctx.fill();ctx.stroke();
  }
  ctx.fillStyle='#fff';ctx.strokeStyle=INK;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x-5+ex,cy-1,3.2,3.8,0,0,7);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(x+5+ex,cy-1,3.2,3.8,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.beginPath();ctx.arc(x-5+ex,cy,1.6,0,7);ctx.fill();ctx.beginPath();ctx.arc(x+5+ex,cy,1.6,0,7);ctx.fill();
  ctx.fillStyle=shade(color,-30);ctx.strokeStyle=INK;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x-7,cy+13,4,2.5,0,0,7);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(x+7,cy+13,4,2.5,0,0,7);ctx.fill();ctx.stroke();
}
