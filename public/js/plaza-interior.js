import { roundRect, shade, hexA } from './render-utils.js';
import { INK } from './data/appearance.js';
import { PLAZA_FLOORS } from './data/rooms.js';

const W=1040,H=620;
// Der Fahrstuhl sitzt jetzt unten rechts auf JEDER Etage - dort ist bei allen sechs
// Layouts garantiert Platz, anders als die alte zentrale Position, die staendig mit
// Regalen/Kaefigen/Kleiderstaendern kollidierte.
const ELEV_X=900,ELEV_Y=555;

const THEMES={
  cryo_plaza:        {bg1:'#0d2b45',bg2:'#071a2c',floor:'#12283a',floor2:'#0d1f2d',accent:'#31e1ff'},
  cryo_plaza_donki:  {bg1:'#241a00',bg2:'#120d00',floor:'#2e2200',floor2:'#241a00',accent:'#ffe15e'},
  cryo_plaza_pets:   {bg1:'#3a1030',bg2:'#210a1c',floor:'#4a1a3e',floor2:'#3a1230',accent:'#ff9ed6'},
  cryo_plaza_food:   {bg1:'#3a2410',bg2:'#22150a',floor:'#4a3018',floor2:'#3a2410',accent:'#ffb14d'},
  cryo_plaza_fashion:{bg1:'#2a1040',bg2:'#160726',floor:'#341450',floor2:'#2a1040',accent:'#d857e0'},
  cryo_plaza_roof:   {bg1:'#0a0a20',bg2:'#050510',floor:'#141430',floor2:'#0e0e26',accent:'#ffd166'}
};

const elevAnim={};
function elevOpen(roomId,hovered){const cur=elevAnim[roomId]||0;return elevAnim[roomId]=cur+((hovered?1:0)-cur)*0.18;}

export function plazaElevatorHoverAt(p){return Math.abs(p.x-ELEV_X)<46&&p.y>ELEV_Y-104&&p.y<ELEV_Y+16;}
export function petCounterHoverAt(p){return p.x>340&&p.x<700&&p.y>380&&p.y<520;}
export function donkiMachineHoverAt(p){return p.x>580&&p.x<680&&p.y>380&&p.y<540;}
export function boutiqueRackHoverAt(p){return p.x>210&&p.x<730&&p.y>250&&p.y<390;}

function drawShell(ctx,theme){
  const wg=ctx.createLinearGradient(0,0,0,90);wg.addColorStop(0,theme.bg1);wg.addColorStop(1,theme.bg2);
  ctx.fillStyle=wg;ctx.fillRect(0,0,W,90);
  ctx.fillStyle=theme.floor;ctx.fillRect(0,90,W,H-90);
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x,H);ctx.stroke();}
  ctx.strokeStyle=hexA(theme.accent,.5);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,90);ctx.lineTo(W,90);ctx.stroke();
}
function drawElevatorProp(ctx,roomId,hovered,accent){
  const doorW=76,doorH=104,x=ELEV_X,y=ELEV_Y;
  const openAmt=elevOpen(roomId,hovered);
  if(hovered){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=16;}
  const fg=ctx.createLinearGradient(x-doorW/2-10,y-doorH-10,x+doorW/2+10,y);
  fg.addColorStop(0,'#241a3a');fg.addColorStop(.5,'#3a2a5a');fg.addColorStop(1,'#1a1230');
  ctx.fillStyle=fg;ctx.strokeStyle=accent;ctx.lineWidth=4;
  roundRect(ctx,x-doorW/2-10,y-doorH-10,doorW+20,doorH+16,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#0a0818';roundRect(ctx,x-doorW/2,y-doorH,doorW,doorH,4);ctx.fill();
  const gap=2+openAmt*9;
  ctx.fillStyle='#c7cfd6';
  roundRect(ctx,x-doorW/2,y-doorH,doorW/2-gap/2,doorH,3);ctx.fill();
  roundRect(ctx,x+gap/2,y-doorH,doorW/2-gap/2,doorH,3);ctx.fill();
  ctx.strokeStyle=INK;ctx.lineWidth=2;
  roundRect(ctx,x-doorW/2,y-doorH,doorW/2-gap/2,doorH,3);ctx.stroke();
  roundRect(ctx,x+gap/2,y-doorH,doorW/2-gap/2,doorH,3);ctx.stroke();
  ctx.fillStyle='#fff';ctx.strokeStyle=INK;ctx.lineWidth=2;
  roundRect(ctx,x-42,y-doorH-30,84,20,8);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.font='700 11px Fredoka';ctx.textAlign='center';ctx.fillText('🛗 Aufzug',x,y-doorH-16);
  if(hovered)ctx.restore();
}
function drawPlant(ctx,x,y,now,seed){
  const sway=Math.sin((now||0)/1400+(seed||0))*0.06;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(x,y+26,20,6,0,0,7);ctx.fill();
  ctx.fillStyle='#8a5a3a';ctx.strokeStyle=INK;ctx.lineWidth=3;roundRect(ctx,x-14,y,28,26,6);ctx.fill();ctx.stroke();
  ctx.save();ctx.translate(x,y);ctx.rotate(sway);ctx.translate(-x,-y);
  ctx.fillStyle='#3fae6c';for(const [dx,dy,r] of [[-8,-6,13],[8,-8,15],[0,-18,14]]){ctx.beginPath();ctx.ellipse(x+dx,y+dy,r,r*.8,0,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
// Kleine wiederverwendbare NPC-Silhouette (Personal/Gaeste), leicht abgewandelt je nach
// Etage - sorgt dafuer, dass die Etagen nicht wie leere Ausstellungsraeume wirken.
function drawStaffNPC(ctx,cx,cy,color,now){
  const bob=Math.sin(now/900+cx)*2;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(cx,cy+52,22,6,0,0,7);ctx.fill();
  ctx.fillStyle=color;ctx.strokeStyle=INK;ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(cx,cy+26+bob,22,28,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd9a0';ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy-6+bob,18,0,7);ctx.fill();ctx.stroke();
  const blink=Math.sin(now/2600+cx)>0.96;
  ctx.fillStyle=INK;
  if(blink){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-8,cy-7+bob);ctx.lineTo(cx-2,cy-7+bob);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+2,cy-7+bob);ctx.lineTo(cx+8,cy-7+bob);ctx.stroke();}
  else{ctx.beginPath();ctx.arc(cx-5,cy-7+bob,2.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(cx+5,cy-7+bob,2.2,0,7);ctx.fill();}
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy+0+bob,5,.15*Math.PI,.85*Math.PI);ctx.stroke();
}
// Treibende Staubkoerner/Lichtpartikel fuer Ambiente auf ansonsten ruhigen Etagen.
function drawFloatDust(ctx,now,seedBase,color){
  for(let i=0;i<10;i++){
    const seed=seedBase+i;
    const px=(seed*173)%W, cyc=(now/30+i*450)%4500, py=560-cyc/9;
    const a=Math.max(0,Math.min(1,cyc/900))*Math.max(0,Math.min(1,(4500-cyc)/900));
    ctx.fillStyle=hexA(color,a*.5);ctx.beginPath();ctx.arc(px,py,1.6,0,7);ctx.fill();
  }
}

export function renderPlazaLobby(ctx,opts){
  const theme=THEMES.cryo_plaza,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  drawShell(ctx,theme);
  drawFloatDust(ctx,now,11,theme.accent);
  ctx.fillStyle='#050912';ctx.strokeStyle=theme.accent;ctx.lineWidth=3;
  roundRect(ctx,260,120,520,150,16);ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.accent;ctx.font='800 18px Fredoka';ctx.textAlign='center';
  ctx.globalAlpha=.8+.2*Math.sin(now/400);ctx.fillText('🏢 CRYO PLAZA — WEGWEISER',520,146);ctx.globalAlpha=1;
  ctx.font='700 13px Fredoka';ctx.textAlign='left';
  PLAZA_FLOORS.forEach((f,i)=>{
    const col=i%2,row=Math.floor(i/2),fx=290+col*250,fy=170+row*30;
    const glow=.5+.5*Math.sin(now/500+i*1.3);
    ctx.fillStyle=`rgba(203,184,255,${glow})`;ctx.fillText(f.floor,fx,fy);
    ctx.fillStyle='#fff';ctx.fillText(f.icon+' '+f.label,fx+30,fy);
  });
  // Bodenmuster/Empfangsteppich
  ctx.strokeStyle=hexA(theme.accent,.25);ctx.lineWidth=2;
  roundRect(ctx,380,330,300,170,20);ctx.stroke();
  drawPlant(ctx,910,300,now,0);drawPlant(ctx,130,300,now,3);
  drawStaffNPC(ctx,300,470,'#7a5aa8',now);
  // Leuchtender Wegweiser-Pfeil, der zum Fahrstuhl zeigt
  const arrowT=(now/900)%1;
  ctx.strokeStyle=hexA(theme.accent,.6*(1-arrowT));ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(700+arrowT*150,470);ctx.lineTo(760+arrowT*150,470);ctx.moveTo(745+arrowT*150,462);ctx.lineTo(760+arrowT*150,470);ctx.lineTo(745+arrowT*150,478);ctx.stroke();
  drawElevatorProp(ctx,'cryo_plaza',hoveredElevator,theme.accent);
}

export function renderPlazaDonki(ctx,opts){
  const theme=THEMES.cryo_plaza_donki,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const hoveredMachine=(opts&&opts.hoveredMachine)||false;
  drawShell(ctx,theme);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,90);ctx.clip();
  for(let i=-2;i<20;i++){ctx.fillStyle=i%2?'#0a0a0a':'#ffe15e';ctx.save();ctx.translate(i*56,0);ctx.rotate(-0.35);ctx.fillRect(-20,-20,40,140);ctx.restore();}
  ctx.restore();
  // Blinkende "Sale"-Lichterkette direkt unter dem Streifenbanner
  for(let x=10;x<W;x+=26){const on=Math.sin(now/260+x*0.4)>0;ctx.fillStyle=on?'#fff':'#e2231a';ctx.beginPath();ctx.arc(x,92,3,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.stroke();}
  ctx.fillStyle='#e2231a';ctx.font='900 26px Fredoka';ctx.textAlign='center';ctx.strokeStyle=INK;ctx.lineWidth=4;
  ctx.strokeText('DON DON DONKI',520,54);ctx.fillText('DON DON DONKI',520,54);
  ctx.fillStyle='#fff';ctx.font='700 12px Fredoka';ctx.fillText('激安の殿堂 — 何でも安い！',520,74);
  // Warentuerme (rechte Seite naeher an die Mitte gerueckt, damit der Fahrstuhl unten rechts frei bleibt)
  for(const [tx,ty] of [[150,470],[260,480],[720,470],[800,480]]){
    const wob=Math.sin(now/500+tx)*2;
    ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(tx,ty+16,36,8,0,0,7);ctx.fill();
    for(let s=0;s<4;s++){ctx.fillStyle=['#ff5ea8','#4dd0ff','#ffe15e','#7be0b0'][(s+tx)%4];ctx.strokeStyle=INK;ctx.lineWidth=2;
      roundRect(ctx,tx-28+wob*(s+1)*0.15,ty-s*22,56,22,4);ctx.fill();ctx.stroke();}
  }
  // Herabschwebende Preisschild-Konfetti fuer Chaos-Flair
  for(let i=0;i<10;i++){const cyc=(now/40+i*260)%520,px=(i*97+40)%W,py=90+cyc,rot=cyc/30+i;
    ctx.save();ctx.translate(px,py);ctx.rotate(rot);ctx.fillStyle=['#ffe15e','#ff5ea8','#4dd0ff'][i%3];ctx.strokeStyle=INK;ctx.lineWidth=1;
    ctx.fillRect(-4,-3,8,6);ctx.strokeRect(-4,-3,8,6);ctx.restore();}
  // Maskottchen-Standee: ein rundlicher Pinguin, eigene Kreation - winkt jetzt
  const mx=380,my=470,wave=Math.sin(now/450)*0.5;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(mx,my+50,26,7,0,0,7);ctx.fill();
  ctx.fillStyle='#1a1a1a';ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(mx,my,24,40,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(mx,my+6,15,28,0,0,7);ctx.fill();
  ctx.fillStyle='#ff8200';ctx.beginPath();ctx.moveTo(mx-6,my-30);ctx.lineTo(mx+6,my-30);ctx.lineTo(mx,my-20);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.beginPath();ctx.arc(mx-6,my-16,2.4,0,7);ctx.fill();ctx.beginPath();ctx.arc(mx+6,my-16,2.4,0,7);ctx.fill();
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(mx+20,my-4);ctx.lineTo(mx+34,my-18-wave*14);ctx.stroke();
  // Wundertueten-Automat
  const bx=630,by=480;
  if(hoveredMachine){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=16;}
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(bx,by+56,42,9,0,0,7);ctx.fill();
  ctx.fillStyle='#e2231a';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,bx-40,by-90,80,146,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffe15e';ctx.font='800 12px Fredoka';ctx.textAlign='center';ctx.fillText('🎁',bx,by-30);
  ctx.font='700 11px Fredoka';ctx.fillText('MYSTERY',bx,by-4);ctx.fillText('BAG',bx,by+10);
  ctx.fillStyle='#fff';ctx.font='700 10px Fredoka';ctx.fillText('anklicken',bx,by+34);
  if(hoveredMachine)ctx.restore();
  drawElevatorProp(ctx,'cryo_plaza_donki',hoveredElevator,theme.accent);
}

export function renderPlazaPets(ctx,opts){
  const theme=THEMES.cryo_plaza_pets,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const hoveredCounter=(opts&&opts.hoveredCounter)||false;
  drawShell(ctx,theme);
  drawFloatDust(ctx,now,29,'#ffe6f5');
  ctx.fillStyle='#fff';ctx.font='800 22px Fredoka';ctx.textAlign='center';
  ctx.fillStyle='#ffe6f5';ctx.strokeStyle=INK;ctx.lineWidth=3;
  ctx.fillText('🐾 PET SHOP',520,52);
  const petCols=['#ff9ed6','#7be0b0','#4dd0ff','#ffd166','#c9a0ff','#ff9e64'];
  const cageX=[190,340,490,640,790,930];
  for(let i=0;i<cageX.length;i++){
    const cx=cageX[i],cy=280;
    ctx.fillStyle='#fff5fa';ctx.strokeStyle=INK;ctx.lineWidth=3;roundRect(ctx,cx-56,cy-56,112,112,16);ctx.fill();ctx.stroke();
    ctx.fillStyle=petCols[i];ctx.strokeStyle=INK;ctx.lineWidth=2.5;
    const bob=Math.sin(now/700+i*2)*4;
    ctx.beginPath();ctx.ellipse(cx,cy+10+bob,26,22,0,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx-14,cy-6+bob,7,9,0,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx+14,cy-6+bob,7,9,0,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=INK;ctx.beginPath();ctx.arc(cx-7,cy+6+bob,2,0,7);ctx.fill();ctx.beginPath();ctx.arc(cx+7,cy+6+bob,2,0,7);ctx.fill();
    // gelegentliches Herzchen ueber einem zufaellig ausgewaehlten Kaefig
    if(Math.sin(now/1300+i*4)>0.85){
      const ha=1-Math.abs(Math.sin(now/1300+i*4)-1)*6;
      ctx.globalAlpha=Math.max(0,Math.min(1,ha));ctx.font='14px serif';ctx.fillStyle='#ff5ea8';ctx.fillText('💗',cx,cy-50);ctx.globalAlpha=1;
    }
  }
  // Adoptionstresen
  const cx0=340,cy0=420,cx1=700,cy1=520;
  if(hoveredCounter){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=16;}
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse((cx0+cx1)/2,cy1+14,(cx1-cx0)*0.52,10,0,0,7);ctx.fill();
  ctx.fillStyle='#fff0f8';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,cx0,cy0,cx1-cx0,cy1-cy0,14);ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.accent;ctx.fillRect(cx0+6,cy1-22,cx1-cx0-12,14);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(cx0+6,cy1-22,cx1-cx0-12,14);
  ctx.fillStyle=INK;ctx.font='800 14px Fredoka';ctx.fillText('Adoption-Tresen',(cx0+cx1)/2,cy0+30);
  ctx.font='700 11px Fredoka';ctx.fillText('anklicken zum Adoptieren',(cx0+cx1)/2,cy0+50);
  if(hoveredCounter)ctx.restore();
  drawStaffNPC(ctx,cx0-40,cy0+30,'#c9a0ff',now);
  drawElevatorProp(ctx,'cryo_plaza_pets',hoveredElevator,theme.accent);
}

export function renderPlazaFood(ctx,opts){
  const theme=THEMES.cryo_plaza_food,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  drawShell(ctx,theme);
  ctx.fillStyle='#fff';ctx.font='800 22px Fredoka';ctx.textAlign='center';ctx.fillText('🍜 FOOD COURT',520,52);
  // Haengelampen ueber den Tischen, sanft schwingend
  for(const lx of [400,640]){
    const sway=Math.sin(now/1100+lx)*8;
    ctx.strokeStyle='#8a6a30';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,90);ctx.lineTo(lx+sway,180);ctx.stroke();
    ctx.fillStyle=theme.accent;ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx+sway-14,180);ctx.lineTo(lx+sway+14,180);ctx.lineTo(lx+sway+8,204);ctx.lineTo(lx+sway-8,204);ctx.closePath();ctx.fill();ctx.stroke();
  }
  // Imbissstaende (rechter Stand nach links gerueckt, damit der Fahrstuhl unten rechts frei bleibt)
  for(const [sx,sy] of [[220,470],[760,470]]){
    ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(sx,sy+56,64,10,0,0,7);ctx.fill();
    ctx.fillStyle='#c9a06a';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,sx-60,sy-70,120,120,10);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff8200';ctx.fillRect(sx-60,sy-70,120,14);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(sx-60,sy-70,120,14);
    ctx.fillStyle='#fff';ctx.font='700 11px Fredoka';ctx.fillText('SNACK STAND',sx,sy-59);
    ctx.font='24px serif';ctx.fillText(sx<500?'🍡':'🥟',sx,sy);
    // Dampf steigt auf
    for(let i=0;i<3;i++){const cyc=(now/22+i*180)%420,a=Math.max(0,1-cyc/420);
      ctx.strokeStyle=`rgba(255,255,255,${a*.5})`;ctx.lineWidth=2;ctx.beginPath();
      ctx.moveTo(sx-14+i*14,sy-40-cyc*0.35);ctx.quadraticCurveTo(sx-14+i*14+Math.sin(cyc/40)*6,sy-60-cyc*0.35,sx-14+i*14,sy-80-cyc*0.35);ctx.stroke();}
  }
  const tables=[[400,300],[640,300],[400,400],[640,400]];
  for(const [tx,ty] of tables){
    ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(tx,ty+22,38,8,0,0,7);ctx.fill();
    ctx.fillStyle='#e8c896';ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(tx,ty,34,20,0,0,7);ctx.fill();ctx.stroke();
    ctx.strokeStyle=shade('#e8c896',-40);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(tx,ty,24,13,0,0,7);ctx.stroke();
    for(const [dx,dy] of [[-46,14],[46,14],[-46,-14],[46,-14]]){
      ctx.fillStyle='#ffd9a0';ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(tx+dx,ty+dy,10,8,0,0,7);ctx.fill();ctx.stroke();
    }
  }
  // Ein Gast, der schon Platz genommen hat
  drawStaffNPC(ctx,400,278,'#7be0b0',now);
  drawElevatorProp(ctx,'cryo_plaza_food',hoveredElevator,theme.accent);
}

export function renderPlazaFashion(ctx,opts){
  const theme=THEMES.cryo_plaza_fashion,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const hoveredRacks=(opts&&opts.hoveredRacks)||false;
  drawShell(ctx,theme);
  drawFloatDust(ctx,now,53,theme.accent);
  ctx.fillStyle='#fff';ctx.font='800 22px Fredoka';ctx.textAlign='center';ctx.fillText('👗 BOUTIQUE',520,52);
  if(hoveredRacks){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=16;}
  const racks=[260,470,680];
  for(const rx of racks){
    ctx.strokeStyle='#c7cfd6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(rx-50,330);ctx.lineTo(rx+50,330);ctx.stroke();
    ctx.beginPath();ctx.moveTo(rx-50,260);ctx.lineTo(rx-50,330);ctx.moveTo(rx+50,260);ctx.lineTo(rx+50,330);ctx.stroke();
    const cols=['#ff5ea8','#4dd0ff','#ffd166','#7be0b0','#c9a0ff'];
    for(let i=0;i<5;i++){
      const sway=Math.sin(now/900+rx+i*1.7)*3;
      const hx=rx-40+i*20;
      ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(hx,332);ctx.lineTo(hx+sway*0.3,340);ctx.stroke();
      ctx.save();ctx.translate(hx+sway*0.3,340);ctx.rotate(sway*0.02);
      ctx.fillStyle=cols[i];ctx.strokeStyle=INK;ctx.lineWidth=2;roundRect(ctx,-9,0,18,34,4);ctx.fill();ctx.stroke();
      ctx.restore();
    }
  }
  if(hoveredRacks)ctx.restore();
  ctx.fillStyle='#fff';ctx.font='700 11px Fredoka';ctx.textAlign='center';ctx.fillText('anklicken zum Stöbern',470,240);
  // Schaufensterpuppe (nach links gerueckt, damit der Fahrstuhl unten rechts frei bleibt) mit Spotlight
  const mx=780,my=380;
  const glow=ctx.createRadialGradient(mx,my-10,4,mx,my-10,60);glow.addColorStop(0,hexA(theme.accent,.25+.1*Math.sin(now/700)));glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(mx,my-10,60,0,7);ctx.fill();
  ctx.fillStyle='#e8d8c0';ctx.strokeStyle=INK;ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(mx,my-40,10,12,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.accent;roundRect(ctx,mx-16,my-28,32,60,8);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#c7cfd6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(mx,my+32);ctx.lineTo(mx,my+70);ctx.stroke();
  ctx.fillStyle='#c7cfd6';ctx.beginPath();ctx.ellipse(mx,my+72,20,6,0,0,7);ctx.fill();
  // Spiegel mit Glanzlicht, das langsam vorueberzieht
  const sx=140,sy=380;
  ctx.fillStyle='#c7cfd6';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,sx-28,sy-56,56,110,20);ctx.fill();ctx.stroke();
  ctx.save();roundRect(ctx,sx-20,sy-48,40,94,14);ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(sx-20,sy-48,40,94);
  const glintX=sx-20+((now/12)%80);
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.moveTo(glintX,sy-48);ctx.lineTo(glintX+12,sy-48);ctx.lineTo(glintX-14,sy+46);ctx.lineTo(glintX-26,sy+46);ctx.closePath();ctx.fill();
  ctx.restore();
  drawStaffNPC(ctx,140,470,'#d857e0',now);
  drawElevatorProp(ctx,'cryo_plaza_fashion',hoveredElevator,theme.accent);
}

const ROOF_BAR={x0:650,y0:420,x1:810,y1:520};
export function roofDrinkAt(p){
  if(p.x<ROOF_BAR.x0||p.x>ROOF_BAR.x1||p.y<ROOF_BAR.y0||p.y>ROOF_BAR.y1)return null;
  return p.x<(ROOF_BAR.x0+ROOF_BAR.x1)/2?'fizz':'martini';
}
export function renderPlazaRoof(ctx,opts){
  const theme=THEMES.cryo_plaza_roof,now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const hoveredDrink=(opts&&opts.hoveredDrink)||null;
  const sky=ctx.createLinearGradient(0,0,0,340);sky.addColorStop(0,'#050318');sky.addColorStop(1,'#1a0f3d');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,340);
  for(let i=0;i<70;i++){const sx=(i*137)%W,sy=(i*79)%300,a=.3+.6*Math.abs(Math.sin(now/900+i));ctx.fillStyle=`rgba(232,236,255,${a})`;ctx.beginPath();ctx.arc(sx,sy,1.4,0,7);ctx.fill();}
  // Treibende Nebelschwaden ueber der Skyline
  for(let i=0;i<3;i++){const mx=((now/60+i*400)%(W+300))-150;ctx.fillStyle='rgba(150,170,255,.05)';ctx.beginPath();ctx.ellipse(mx,120+i*60,160,26,0,0,7);ctx.fill();}
  const towers=[[40,.5,.4],[160,.8,.7],[300,.6,.55],[440,.95,.3],[600,.65,.8],[760,.85,.45],[900,.55,.65]];
  for(const [tx,th,seed] of towers){
    const tw=70,ty=340-th*220;
    ctx.fillStyle='#1a1040';ctx.fillRect(tx,ty,tw,340-ty);
    ctx.fillStyle='rgba(122,224,255,.55)';
    for(let wy=ty+8;wy<330;wy+=14){const lit=Math.sin(now/500+seed*7+wy)>0.15;if(lit)ctx.fillRect(tx+6,wy,8,7);}
  }
  ctx.fillStyle=theme.floor;ctx.fillRect(0,340,W,H-340);
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,340);ctx.lineTo(x,H);ctx.stroke();}
  // Lichterkette
  ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,342);for(let x=0;x<=W;x+=40)ctx.lineTo(x,342+Math.sin(x/60)*6);ctx.stroke();
  for(let x=20;x<W;x+=40){const on=Math.sin(now/400+x)>0;ctx.fillStyle=on?'#ffd166':'#8a6a30';ctx.beginPath();ctx.arc(x,342+Math.sin(x/60)*6+4,3,0,7);ctx.fill();}
  ctx.fillStyle='#fff';ctx.font='800 22px Fredoka';ctx.textAlign='center';ctx.strokeStyle=INK;ctx.lineWidth=3;
  ctx.strokeText('🌃 ROOFTOP BAR',520,60);ctx.fillText('🌃 ROOFTOP BAR',520,60);
  // Bartresen (schmaler und nach links gerueckt, damit der Fahrstuhl unten rechts frei bleibt)
  const {x0:bx0,y0:by0,x1:bx1,y1:by1}=ROOF_BAR,bmid=(bx0+bx1)/2;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(bmid,by1+14,(bx1-bx0)*0.55,10,0,0,7);ctx.fill();
  ctx.fillStyle='#241a3a';ctx.strokeStyle=theme.accent;ctx.lineWidth=4;roundRect(ctx,bx0,by0,bx1-bx0,by1-by0,14);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bmid,by0+6);ctx.lineTo(bmid,by1-6);ctx.stroke();
  ctx.fillStyle=theme.accent;ctx.fillRect(bx0+6,by1-22,bx1-bx0-12,14);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(bx0+6,by1-22,bx1-bx0-12,14);
  const drinks=[{key:'fizz',cx:(bx0+bmid)/2,icon:'🍹',label:'Nebula Fizz',price:55},{key:'martini',cx:(bmid+bx1)/2,icon:'🍸',label:'Starlight Martini',price:95}];
  for(const d of drinks){
    const hov=hoveredDrink===d.key;
    if(hov){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=14;}
    ctx.font='24px serif';ctx.textAlign='center';ctx.fillText(d.icon,d.cx,by0+32+Math.sin(now/500+d.cx)*2);
    ctx.font='700 9px Fredoka';ctx.fillStyle='#fff';ctx.fillText(d.label,d.cx,by0+47);
    ctx.fillStyle='#ffd166';ctx.font='700 9px Fredoka';ctx.fillText(d.price+' ✦',d.cx,by0+60);
    if(hov)ctx.restore();
  }
  for(let i=0;i<8;i++){const px=bx0+((now/900+i*70)%(bx1-bx0)),py=by0-6-((now/40+i*30)%40);const a=Math.max(0,1-((now/40+i*30)%40)/40);
    ctx.fillStyle=`rgba(255,255,255,${a*.6})`;ctx.beginPath();ctx.arc(px,py,1.6,0,7);ctx.fill();}
  drawStaffNPC(ctx,bmid,by0-34,'#ffd166',now);
  // Lounge-Sitzecke
  for(const [lx,ly] of [[180,470],[320,470],[180,540],[320,540]]){
    ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(lx,ly+16,30,7,0,0,7);ctx.fill();
    ctx.fillStyle='#7a5aa8';ctx.strokeStyle=INK;ctx.lineWidth=3;roundRect(ctx,lx-26,ly-14,52,28,10);ctx.fill();ctx.stroke();
  }
  drawElevatorProp(ctx,'cryo_plaza_roof',hoveredElevator,theme.accent);
}
