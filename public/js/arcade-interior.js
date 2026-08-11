import { roundRect } from './render-utils.js';
import { INK } from './data/appearance.js';

// Neon-Arcade-Halle: zwei Etagen, bewusst ueberladen mit blinkenden Automaten fuer den
// "Reizueberflutung"-Look. Drei Automaten sind "echt" (Pac-Man/Tetris/Tekken-Stil) und
// als eigene Minispiele in einem naechsten Schritt vorgesehen - hier bereits klickbar
// und optisch fertig, loesen aktuell aber nur ein "Kommt bald"-Popup aus.

const NEON=['#ff2e88','#31e1ff','#ffd166','#7be0b0','#b467ff','#ff9e64','#4dd0ff'];

// ---------------- Automaten-Gehaeuse (generisch, wiederverwendet fuer jeden Typ) ----------------
function cabinetRects(x,y,w,h){
  const bodyW=w, bodyH=h, top=y-bodyH;
  const marqueeH=h*0.16, screenH=h*0.44, panelH=h*0.4;
  return {
    bodyX0:x-bodyW/2, bodyY0:top, bodyW, bodyH,
    marquee:{x0:x-bodyW/2+6,y0:top+4,w:bodyW-12,h:marqueeH},
    screen:{x0:x-bodyW*0.4,y0:top+marqueeH+8,w:bodyW*0.8,h:screenH},
    panel:{x0:x-bodyW/2+4,y0:top+marqueeH+screenH+12,w:bodyW-8,h:panelH-8}
  };
}
function drawCabinetShell(ctx,x,y,w,h,accent,label,now,seed){
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y+6,w*0.55,8,0,0,7);ctx.fill();
  const r=cabinetRects(x,y,w,h);
  const bg=ctx.createLinearGradient(0,r.bodyY0,0,r.bodyY0+r.bodyH);
  bg.addColorStop(0,'#1c1030');bg.addColorStop(1,'#0c0818');
  ctx.fillStyle=bg;ctx.strokeStyle=INK;ctx.lineWidth=4;
  roundRect(ctx,r.bodyX0,r.bodyY0,r.bodyW,r.bodyH,10);ctx.fill();ctx.stroke();
  // Seitliche Neon-Streifen
  const pulse=.55+.45*Math.sin(now/260+seed);
  ctx.fillStyle=accent;ctx.globalAlpha=pulse*0.9;
  ctx.fillRect(r.bodyX0+3,r.bodyY0+r.marquee.h+6,4,r.bodyH-r.marquee.h-14);
  ctx.fillRect(r.bodyX0+r.bodyW-7,r.bodyY0+r.marquee.h+6,4,r.bodyH-r.marquee.h-14);
  ctx.globalAlpha=1;
  // Marquee-Header mit blinkendem Titel
  ctx.fillStyle='#050308';roundRect(ctx,r.marquee.x0,r.marquee.y0,r.marquee.w,r.marquee.h,6);ctx.fill();
  ctx.strokeStyle=accent;ctx.lineWidth=2;roundRect(ctx,r.marquee.x0,r.marquee.y0,r.marquee.w,r.marquee.h,6);ctx.stroke();
  ctx.fillStyle=accent;ctx.globalAlpha=.7+.3*Math.sin(now/180+seed*2);
  ctx.font='800 '+Math.max(9,Math.min(13,w*0.11))+'px Fredoka';ctx.textAlign='center';
  ctx.fillText(label,x,r.marquee.y0+r.marquee.h*0.72);ctx.globalAlpha=1;
  // Bildschirm-Rahmen (Inhalt zeichnet der Aufrufer rein)
  ctx.fillStyle='#000';roundRect(ctx,r.screen.x0-4,r.screen.y0-4,r.screen.w+8,r.screen.h+8,4);ctx.fill();
  // Bedienfeld: Joystick + Knoepfe
  ctx.fillStyle='#2a2136';ctx.strokeStyle=INK;ctx.lineWidth=3;
  roundRect(ctx,r.panel.x0,r.panel.y0,r.panel.w,r.panel.h,8);ctx.fill();ctx.stroke();
  const jx=x-r.bodyW*0.22,jy=r.panel.y0+r.panel.h*0.5;
  ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(jx,jy);
  const jt=now/220+seed;ctx.lineTo(jx+Math.cos(jt)*5,jy+Math.sin(jt)*5);ctx.stroke();
  ctx.fillStyle='#ff2e2e';ctx.beginPath();ctx.arc(jx+Math.cos(jt)*5,jy+Math.sin(jt)*5,5,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
  const btnCols=['#ff5ea8','#7be0b0','#ffe15e'];
  for(let i=0;i<3;i++){ctx.fillStyle=btnCols[i];ctx.strokeStyle=INK;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(x+r.bodyW*0.06+i*16,jy,6,0,7);ctx.fill();ctx.stroke();}
  return r.screen;
}
function clipScreen(ctx,s,fn){ctx.save();roundRect(ctx,s.x0,s.y0,s.w,s.h,3);ctx.clip();fn();ctx.restore();}

// ---------------- Bildschirm-Inhalte je Automat ----------------
function screenPacman(ctx,s,now,seed){
  ctx.fillStyle='#03030f';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  ctx.fillStyle='#1c1c50';ctx.lineWidth=1;
  for(let gx=s.x0+6;gx<s.x0+s.w;gx+=10)for(let gy=s.y0+6;gy<s.y0+s.h;gy+=10)ctx.fillRect(gx,gy,2,2);
  const t=(now/900+seed)%1;
  const px=s.x0+6+t*(s.w-24), py=s.y0+s.h*0.55+Math.sin(t*10)*4;
  const mouth=Math.abs(Math.sin(now/120))*0.9+0.15;
  ctx.fillStyle='#ffe15e';ctx.beginPath();ctx.moveTo(px,py);
  ctx.arc(px,py,7,mouth,Math.PI*2-mouth);ctx.closePath();ctx.fill();
  const ghostCols=['#ff5ea8','#31e1ff'];
  for(let i=0;i<2;i++){
    const gt=((t- (i+1)*0.12)+1)%1;
    const gx=s.x0+6+gt*(s.w-24), gy=py;
    ctx.fillStyle=ghostCols[i];
    ctx.beginPath();ctx.arc(gx,gy-2,6,Math.PI,0);ctx.lineTo(gx+6,gy+6);
    for(let w=0;w<3;w++)ctx.lineTo(gx+6-((w+1)*4),gy+ (w%2?2:6));
    ctx.lineTo(gx-6,gy+6);ctx.closePath();ctx.fill();
  }
}
function screenTetris(ctx,s,now,seed){
  ctx.fillStyle='#050510';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  const cell=Math.max(4,s.w/8),cols=Math.floor(s.w/cell),rows=Math.floor(s.h/cell);
  const cols7=['#31e1ff','#ffe15e','#b467ff','#ff9e64','#4dd0ff','#7be0b0','#ff5ea8'];
  if(!seedStore[seed])seedStore[seed]={grid:Array.from({length:rows},()=>Array(cols).fill(null)),t:0,piece:{x:Math.floor(cols/2),y:0,c:cols7[0]}};
  const st=seedStore[seed];
  st.t+=1/60;
  if(st.t>0.35){
    st.t=0;st.piece.y++;
    const landed=st.piece.y>=rows-1||(st.grid[st.piece.y+1]&&st.grid[st.piece.y+1][st.piece.x]);
    if(landed){
      if(st.piece.y>=0&&st.piece.y<rows)st.grid[st.piece.y][st.piece.x]=st.piece.c;
      for(let r=rows-1;r>=0;r--)if(st.grid[r].every(Boolean))st.grid.splice(r,1),st.grid.unshift(Array(cols).fill(null));
      st.piece={x:Math.floor(Math.random()*cols),y:0,c:cols7[Math.floor(Math.random()*cols7.length)]};
    }
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(st.grid[r][c]){
    ctx.fillStyle=st.grid[r][c];ctx.fillRect(s.x0+c*cell,s.y0+r*cell,cell-1,cell-1);
  }
  ctx.fillStyle=st.piece.c;ctx.fillRect(s.x0+st.piece.x*cell,s.y0+st.piece.y*cell,cell-1,cell-1);
}
const seedStore={};
function screenTekken(ctx,s,now,seed){
  const g=ctx.createLinearGradient(0,s.y0,0,s.y0+s.h);g.addColorStop(0,'#3a0d1c');g.addColorStop(1,'#160408');
  ctx.fillStyle=g;ctx.fillRect(s.x0,s.y0,s.w,s.h);
  const shake=Math.sin(now/40)*(Math.sin(now/900)>0.85?1.5:0);
  const cy=s.y0+s.h*0.68;
  function fighter(fx,color,mirror){
    ctx.save();ctx.translate(fx+shake,cy);if(mirror)ctx.scale(-1,1);
    ctx.fillStyle=color;ctx.strokeStyle='#000';ctx.lineWidth=1.5;
    roundRect(ctx,-6,-26,12,20,3);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,-32,6,0,7);ctx.fill();ctx.stroke();
    const punch=Math.sin(now/150+ (mirror?3.1:0))>0.6;
    ctx.beginPath();ctx.moveTo(6,-20);ctx.lineTo(punch?20:10,punch?-24:-16);ctx.lineWidth=4;ctx.strokeStyle=color;ctx.stroke();
    ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,-6);ctx.lineTo(-5,10);ctx.moveTo(3,-6);ctx.lineTo(5,10);ctx.stroke();
    ctx.restore();
  }
  fighter(s.x0+s.w*0.3,'#4dd0ff',false);
  fighter(s.x0+s.w*0.7,'#ff5ea8',true);
  const hb=s.y0+6;
  ctx.fillStyle='#111';ctx.fillRect(s.x0+4,hb,s.w*0.4,5);ctx.fillRect(s.x0+s.w*0.56,hb,s.w*0.4,5);
  const h1=.4+.3*Math.sin(now/700),h2=.4+.3*Math.cos(now/650);
  ctx.fillStyle='#7be0b0';ctx.fillRect(s.x0+4,hb,s.w*0.4*Math.max(0,h1),5);
  ctx.fillStyle='#ff5ea8';ctx.fillRect(s.x0+s.w*0.96-s.w*0.4*Math.max(0,h2),hb,s.w*0.4*Math.max(0,h2),5);
  if(Math.sin(now/300)>0.4){ctx.fillStyle='#ffe15e';ctx.font='800 12px Fredoka';ctx.textAlign='center';ctx.fillText('VS',s.x0+s.w/2,s.y0+s.h*0.42);}
}
function screenRacer(ctx,s,now,seed){
  ctx.fillStyle='#141414';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  ctx.strokeStyle='#fff';ctx.setLineDash([8,10]);ctx.lineDashOffset=-(now/25+seed*20)%18;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(s.x0+s.w/2,s.y0);ctx.lineTo(s.x0+s.w/2,s.y0+s.h);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ff2e2e';roundRect(ctx,s.x0+s.w*0.5-8,s.y0+s.h*0.72,16,20,4);ctx.fill();
  ctx.fillStyle='#4dd0ff';roundRect(ctx,s.x0+s.w*0.3-6,s.y0+((now/20+seed*40)%(s.h+30))-30,12,16,3);ctx.fill();
}
function screenShooter(ctx,s,now,seed){
  ctx.fillStyle='#04040c';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  for(let i=0;i<14;i++){const sx=s.x0+((i*37+seed*53)%s.w),sy=s.y0+((now/30+i*29)%s.h);
    ctx.fillStyle='rgba(255,255,255,'+(0.3+0.5*((i%3)/3))+')';ctx.fillRect(sx,sy,1.6,1.6);}
  ctx.fillStyle='#7be0b0';ctx.beginPath();ctx.moveTo(s.x0+s.w/2,s.y0+s.h-6);ctx.lineTo(s.x0+s.w/2-6,s.y0+s.h);ctx.lineTo(s.x0+s.w/2+6,s.y0+s.h);ctx.closePath();ctx.fill();
  const bt=(now/12)%(s.h);ctx.fillStyle='#ffe15e';ctx.fillRect(s.x0+s.w/2-1,s.y0+s.h-6-bt,2,6);
}
function screenDance(ctx,s,now,seed){
  ctx.fillStyle='#0a0018';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  const arrows=['◄','▲','▼','►'],cols=4,cw=s.w/cols;
  for(let c=0;c<cols;c++){
    ctx.strokeStyle='rgba(255,255,255,.3)';ctx.strokeRect(s.x0+c*cw,s.y0,cw-2,s.h);
    for(let i=0;i<3;i++){
      const y=s.y0+s.h-((now/16+i*40+c*17+seed*11)%(s.h+20));
      ctx.fillStyle=NEON[(c+i)%NEON.length];ctx.font='700 '+Math.max(8,cw*0.6)+'px Fredoka';ctx.textAlign='center';
      ctx.fillText(arrows[c],s.x0+c*cw+cw/2,y);
    }
  }
}
function screenPinball(ctx,s,now,seed){
  ctx.fillStyle='#0a1c12';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  for(const [bx,by] of [[0.3,0.3],[0.7,0.35],[0.5,0.6]]){
    ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(s.x0+s.w*bx,s.y0+s.h*by,4,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.stroke();
  }
  const bx=s.x0+s.w*(0.5+0.4*Math.sin(now/260+seed)),by=s.y0+s.h*(0.5+0.35*Math.cos(now/310+seed));
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,3,0,7);ctx.fill();
}
function screenWhack(ctx,s,now,seed){
  ctx.fillStyle='#241a10';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  const cols=3,rows=2,cw=s.w/cols,ch=s.h/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cx=s.x0+c*cw+cw/2,cy=s.y0+r*ch+ch*0.7;
    ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx,cy,cw*0.32,ch*0.22,0,0,7);ctx.fill();
    const pop=((now/300+ (r*3+c)*1.7+seed)%4);
    if(pop<1){const h=Math.sin(pop*Math.PI)*ch*0.5;
      ctx.fillStyle='#8a5a3a';ctx.beginPath();ctx.arc(cx,cy-h,cw*0.22,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();}
  }
}
function screenHoop(ctx,s,now,seed){
  ctx.fillStyle='#0a1428';ctx.fillRect(s.x0,s.y0,s.w,s.h);
  ctx.strokeStyle='#ff8200';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x0+s.w*0.7,s.y0+s.h*0.25,s.w*0.12,0,7);ctx.stroke();
  const t=(now/700+seed)%1;
  const bx=s.x0+s.w*(0.2+0.5*t), byArc=s.y0+s.h*0.8-Math.sin(t*Math.PI)*s.h*0.55;
  ctx.fillStyle='#ffb14d';ctx.beginPath();ctx.arc(bx,byArc,4,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.stroke();
}

// ---------------- Automaten-Layout ----------------
const CABINETS_1=[
  {x:180,y:520,w:92,h:150,type:'pacman',   label:'PAC-CHASE',  color:'#ffe15e'},
  {x:350,y:520,w:92,h:150,type:'tetris',   label:'BLOCK DROP', color:'#31e1ff'},
  {x:560,y:530,w:170,h:160,type:'tekken',  label:'IRON DUEL',  color:'#ff5ea8', wide:true},
  {x:760,y:520,w:92,h:150,type:'racer',    label:'HYPER RACE', color:'#7be0b0'},
  {x:860,y:400,w:70,h:120,type:'dance',    label:'STEP BEAT',  color:'#b467ff'},
  {x:120,y:330,w:66,h:112,type:'shooter',  label:'VOID GUNNER',color:'#4dd0ff'},
  {x:250,y:330,w:66,h:112,type:'whack',    label:'BONK-A-BOT', color:'#ff9e64'},
  {x:400,y:330,w:66,h:112,type:'pinball',  label:'STAR TILT',  color:'#ffd166'},
  {x:640,y:330,w:66,h:112,type:'hoop',     label:'SLAM ZONE',  color:'#ff2e88'},
];
const CABINET_HIT={pacman:'pacman',tetris:'tetris',tekken:'tekken',racer:'racer',shooter:'voidgunner',dance:'stepbeat',whack:'bonkabot',pinball:'startilt'};
const SCREEN_FN={pacman:screenPacman,tetris:screenTetris,tekken:screenTekken,racer:screenRacer,
  shooter:screenShooter,dance:screenDance,pinball:screenPinball,whack:screenWhack,hoop:screenHoop};

export function arcadeCabinetAt(p){
  for(const c of CABINETS_1){
    if(!CABINET_HIT[c.type])continue;
    if(Math.abs(p.x-c.x)<c.w/2+8&&p.y>c.y-c.h-8&&p.y<c.y+8)return CABINET_HIT[c.type];
  }
  return null;
}
export function arcadeCabinetHoverAt(p){
  for(const c of CABINETS_1){
    if(Math.abs(p.x-c.x)<c.w/2+8&&p.y>c.y-c.h-8&&p.y<c.y+8)return c;
  }
  return null;
}

// ---------------- Fahrstuhl (gleicher Mechanismus wie Data Club, Arcade-Neon-Optik) ----------------
const doorAnim={ground:0,top:0};
const ELEV_Y=400;
export function arcadeElevatorHoverAt(p,floor){
  const ex=floor==='top'?130:960;
  return Math.abs(p.x-ex)<44&&p.y>ELEV_Y-96&&p.y<ELEV_Y+10;
}
function doorAnimStep(floor,hovered){const target=hovered?1:0,cur=doorAnim[floor]||0;doorAnim[floor]=cur+(target-cur)*0.18;}
function drawElevator(ctx,x,y,openAmt,label){
  const doorW=70,doorH=96,dy=y;
  const fg=ctx.createLinearGradient(x-doorW/2-10,dy-doorH-10,x+doorW/2+10,dy);
  fg.addColorStop(0,'#3a1a4a');fg.addColorStop(.5,'#5a2a70');fg.addColorStop(1,'#2a1240');
  ctx.fillStyle=fg;ctx.strokeStyle='#ff2e88';ctx.lineWidth=4;
  roundRect(ctx,x-doorW/2-10,dy-doorH-10,doorW+20,doorH+16,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#0a0818';roundRect(ctx,x-26,dy-doorH-30,52,20,6);ctx.fill();
  ctx.fillStyle='#31e1ff';ctx.font='800 12px Fredoka';ctx.textAlign='center';ctx.fillText('🕹️ '+label,x,dy-doorH-16);
  ctx.fillStyle='#050308';roundRect(ctx,x-doorW/2,dy-doorH,doorW,doorH,6);ctx.fill();
  const gp=.5+.5*Math.sin(performance.now()/220);
  ctx.fillStyle='#ff5ea8';ctx.globalAlpha=(.3+.4*gp)*Math.max(.12,openAmt);
  roundRect(ctx,x-doorW/2+5,dy-doorH+5,doorW-10,doorH-10,5);ctx.fill();ctx.globalAlpha=1;
  const panelW=doorW/2,slide=panelW*openAmt;
  ctx.fillStyle='#1c1030';ctx.strokeStyle='#ff2e88';ctx.lineWidth=2;
  roundRect(ctx,x-doorW/2-slide,dy-doorH,panelW,doorH,4);ctx.fill();ctx.stroke();
  roundRect(ctx,x+slide,dy-doorH,panelW,doorH,4);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#31e1ff';ctx.lineWidth=1.5;ctx.globalAlpha=.7;
  ctx.beginPath();ctx.moveTo(x-doorW/2-slide+panelW*0.5,dy-doorH+8);ctx.lineTo(x-doorW/2-slide+panelW*0.5,dy-8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+slide+panelW*0.5,dy-doorH+8);ctx.lineTo(x+slide+panelW*0.5,dy-8);ctx.stroke();
  ctx.globalAlpha=1;
}

// ---------------- Umgebung: Neon-Deckenschild, Teppich, Lichterkette ----------------
function drawMarqueeSign(ctx,now){
  const wg=ctx.createLinearGradient(0,0,0,90);wg.addColorStop(0,'#1c1030');wg.addColorStop(1,'#0c0818');
  ctx.fillStyle=wg;ctx.fillRect(0,0,1040,90);
  ctx.fillStyle='#050308';roundRect(ctx,270,10,500,60,16);ctx.fill();ctx.strokeStyle='#ff2e88';ctx.lineWidth=4;roundRect(ctx,270,10,500,60,16);ctx.stroke();
  const letters='ARCADE'.split('');
  const lw=500/letters.length;
  letters.forEach((ch,i)=>{
    const lit=Math.sin(now/220+i*0.9)>-0.3;
    ctx.fillStyle=lit?NEON[i%NEON.length]:'#3a2050';
    ctx.font='800 34px Fredoka';ctx.textAlign='center';
    ctx.fillText(ch,270+lw*i+lw/2,58);
  });
  for(let x=20;x<1040;x+=26){
    const lit=Math.sin(now/260+x*0.05)>0;
    ctx.fillStyle=lit?'#ffe15e':'#4a3a20';ctx.beginPath();ctx.arc(x,84,3,0,7);ctx.fill();
  }
}
function drawCarpet(ctx,now){
  ctx.fillStyle='#160a24';ctx.fillRect(0,90,1040,512);
  ctx.strokeStyle='rgba(255,46,136,.18)';ctx.lineWidth=2;
  for(let x=-40;x<1080;x+=60)for(let y=90;y<602;y+=60){
    ctx.save();ctx.translate(x+((y/60)%2)*30,y);ctx.rotate(Math.PI/4);
    ctx.strokeRect(-14,-14,28,28);ctx.restore();
  }
  // Bodenglow unter jedem Cabinet (an dessen X-Position), zyklisch wechselnde Neon-Farbe
  for(const c of CABINETS_1){
    const glow=ctx.createRadialGradient(c.x,c.y+6,4,c.x,c.y+6,c.w*0.9);
    const col=NEON[(Math.floor(now/500)+CABINETS_1.indexOf(c))%NEON.length];
    glow.addColorStop(0,col+'55');glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(c.x,c.y+6,c.w*0.9,14,0,0,7);ctx.fill();
  }
}

export function renderArcadeFloor1(ctx,opts){
  const now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const hoveredCab=(opts&&opts.hoveredCabinet)||null;
  drawMarqueeSign(ctx,now);
  drawCarpet(ctx,now);
  for(const c of CABINETS_1){
    const isHover=hoveredCab===c;
    if(isHover){ctx.save();const s=1.04;ctx.translate(c.x,c.y);ctx.scale(s,s);ctx.translate(-c.x,-c.y);ctx.shadowColor='#fff';ctx.shadowBlur=14;}
    const screen=drawCabinetShell(ctx,c.x,c.y,c.w,c.h,c.color,c.label,now,CABINETS_1.indexOf(c));
    clipScreen(ctx,screen,()=>SCREEN_FN[c.type](ctx,screen,now,CABINETS_1.indexOf(c)));
    if(isHover){ctx.shadowBlur=0;ctx.restore();}
  }
  doorAnimStep('ground',hoveredElevator);
  drawElevator(ctx,960,ELEV_Y,doorAnim.ground,'OG');
}

// ---------------- Etage 2: Preis-Ecke / Ticket-Ausgabe ----------------
function drawClawMachine(ctx,x,y,now){
  const w=180,h=220,top=y-h;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+8,w*0.5,10,0,0,7);ctx.fill();
  ctx.fillStyle='#e2231a';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,x-w/2,top,w,h,14);ctx.fill();ctx.stroke();
  ctx.fillStyle='#0a0a16';roundRect(ctx,x-w/2+12,top+34,w-24,h-100,8);ctx.fill();
  ctx.save();roundRect(ctx,x-w/2+12,top+34,w-24,h-100,8);ctx.clip();
  const plushCols=['#ff5ea8','#ffd166','#7be0b0','#4dd0ff','#b467ff'];
  for(let i=0;i<9;i++){
    const px=x-w/2+22+ (i%3)*44, py=top+h-110+Math.floor(i/3)*26;
    ctx.fillStyle=plushCols[i%plushCols.length];ctx.beginPath();ctx.arc(px,py,13,0,7);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=INK;ctx.beginPath();ctx.arc(px-4,py-2,1.6,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+4,py-2,1.6,0,7);ctx.fill();
  }
  const cx=x-w/2+22+ (w-44)*((Math.sin(now/1400)+1)/2);
  const cy=top+40+Math.max(0,Math.sin(now/700))* (h-160);
  ctx.strokeStyle='#c7cfd6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,top+34);ctx.lineTo(cx,cy);ctx.stroke();
  ctx.strokeStyle='#c7cfd6';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(cx-10,cy);ctx.lineTo(cx-14,cy+16);ctx.moveTo(cx+10,cy);ctx.lineTo(cx+14,cy+16);ctx.moveTo(cx,cy);ctx.lineTo(cx,cy+18);ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#fff';ctx.font='800 13px Fredoka';ctx.textAlign='center';ctx.fillText('🧸 CLAW',x,top+20);
  ctx.fillStyle='#ffd166';ctx.strokeStyle=INK;ctx.lineWidth=2;roundRect(ctx,x-30,top+h-46,60,26,8);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.font='700 11px Fredoka';ctx.fillText('50 ✦',x,top+h-28);
}
function drawPrizeWall(ctx,x0,y0,w,h,now){
  ctx.fillStyle='#1c1030';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,x0,y0,w,h,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(150,200,255,.12)';ctx.fillRect(x0+8,y0+8,w-16,h-16);
  const items=['🧸','🎧','🪀','🎮','⭐','🏆'];
  const cols=3,rows=2,cw=(w-16)/cols,ch=(h-16)/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cx=x0+8+c*cw+cw/2,cy=y0+8+r*ch+ch/2;
    ctx.font='26px serif';ctx.textAlign='center';ctx.fillStyle='#fff';
    ctx.globalAlpha=.7+.3*Math.sin(now/500+r*3+c);
    ctx.fillText(items[(r*cols+c)%items.length],cx,cy+8);ctx.globalAlpha=1;
  }
  ctx.strokeStyle='#ffd166';ctx.lineWidth=2;
  for(let c=1;c<cols;c++){ctx.beginPath();ctx.moveTo(x0+8+c*cw,y0+8);ctx.lineTo(x0+8+c*cw,y0+h-8);ctx.stroke();}
}
function drawTicketCounter(ctx,x0,y0,x1,y1,now){
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse((x0+x1)/2,y1+14,(x1-x0)*0.52,10,0,0,7);ctx.fill();
  ctx.fillStyle='#2a1240';ctx.strokeStyle=INK;ctx.lineWidth=4;roundRect(ctx,x0,y0,x1-x0,y1-y0,14);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ff2e88';ctx.fillRect(x0+6,y1-22,x1-x0-12,14);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(x0+6,y1-22,x1-x0-12,14);
  const now2=now;
  const spoolX=x0+30,spoolY=y0-6;
  ctx.strokeStyle='#ffd166';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(spoolX,spoolY);
  for(let i=0;i<6;i++)ctx.lineTo(spoolX+ (i%2===0?10:-10),spoolY+6+i*4);
  ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='800 11px Fredoka';ctx.textAlign='center';ctx.fillText('🎟️ TICKETS',(x0+x1)/2,y0-10);
}
function drawAttendant(ctx,cx,cy){
  const now=performance.now(),bob=Math.sin(now/900)*2;
  ctx.fillStyle='#c9a0ff';ctx.strokeStyle=INK;ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(cx,cy+30+bob,30,34,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ff2e88';ctx.beginPath();ctx.moveTo(cx-28,cy+50+bob);ctx.lineTo(cx-24,cy+8+bob);ctx.quadraticCurveTo(cx,cy-2+bob,cx+24,cy+8+bob);ctx.lineTo(cx+28,cy+50+bob);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd9a0';ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy-14+bob,24,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.beginPath();ctx.arc(cx-7,cy-15+bob,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(cx+7,cy-15+bob,3,0,7);ctx.fill();
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy-6+bob,7,.15*Math.PI,.85*Math.PI);ctx.stroke();
}

export function renderArcadeFloor2(ctx,opts){
  const now=performance.now();
  const hoveredElevator=(opts&&opts.hoveredElevator)||false;
  const wg=ctx.createLinearGradient(0,0,0,90);wg.addColorStop(0,'#1f0a30');wg.addColorStop(1,'#12061c');
  ctx.fillStyle=wg;ctx.fillRect(0,0,1040,90);
  ctx.fillStyle='#050308';roundRect(ctx,300,14,440,52,14);ctx.fill();ctx.strokeStyle='#ffd166';ctx.lineWidth=3;roundRect(ctx,300,14,440,52,14);ctx.stroke();
  ctx.fillStyle='#ffd166';ctx.font='800 22px Fredoka';ctx.textAlign='center';
  ctx.globalAlpha=.75+.25*Math.sin(now/260);ctx.fillText('🏆 PREIS-ECKE',520,48);ctx.globalAlpha=1;
  ctx.fillStyle='#160a24';ctx.fillRect(0,90,1040,512);
  ctx.strokeStyle='rgba(255,209,102,.15)';ctx.lineWidth=2;
  for(let x=0;x<1040;x+=70){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x,602);ctx.stroke();}
  drawClawMachine(ctx,370,470,now);
  drawClawMachine(ctx,580,470,now);
  drawPrizeWall(ctx,720,140,240,120,now);
  drawTicketCounter(ctx,700,330,980,470,now);
  drawAttendant(ctx,840,324);
  doorAnimStep('top',hoveredElevator);
  drawElevator(ctx,130,400,doorAnim.top,'EG');
}
