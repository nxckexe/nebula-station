import { $, t } from '../core.js';

export const VIP_BETS=[5000,10000,25000];

export function buildBets(containerId,cls,vip,cur,setter){
  const el=$(containerId);if(!el)return cur;
  const list=vip?VIP_BETS:[100,500,1000];
  if(!list.includes(cur))cur=list[0];
  el.innerHTML='<span style="color:'+(vip?'#d99a1f':'#8a76c4')+';font-weight:600;font-size:12px">'+(vip?t('label_vip_bet'):t('label_bet'))+'</span>';
  list.forEach(v=>{const b=document.createElement('button');b.className=cls+(v===cur?' on':'');b.dataset.bet=v;b.textContent=v;
    b.onclick=()=>{setter(v);el.querySelectorAll('.'+cls).forEach(x=>x.classList.remove('on'));b.classList.add('on');};
    el.appendChild(b);});
  return cur;
}
