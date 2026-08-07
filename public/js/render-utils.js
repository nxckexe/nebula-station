export function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
export function clamp(v,a,b){return v<a?a:v>b?b:v;}
export function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return`rgb(${r},${g},${b})`;}
export function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;}
export function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
