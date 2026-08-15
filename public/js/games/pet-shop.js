import { $, t, showPopup, setLocked, getMe } from '../core.js';
import { socket } from '../net.js';
import { COLORS } from '../data/appearance.js';
import { PET_SPECIES, PET_LABEL, PET_PRICE } from '../data/pets.js';
import { drawPetShape } from '../pet-render.js';

let previewG=null, previewRAF=null, selSpecies=PET_SPECIES[0], selColor=COLORS[0];

function renderSpeciesButtons(){
  const wrap=$('petSpeciesList');wrap.innerHTML='';
  PET_SPECIES.forEach(sp=>{
    const b=document.createElement('button');b.className='betb'+(sp===selSpecies?' on':'');
    b.textContent=PET_LABEL[sp];
    b.onclick=()=>{selSpecies=sp;renderSpeciesButtons();};
    wrap.appendChild(b);
  });
}
function renderColorSwatches(){
  const wrap=$('petColorList');wrap.innerHTML='';
  COLORS.forEach(c=>{
    const d=document.createElement('div');d.className='sw'+(c===selColor?' on':'');d.style.background=c;
    d.onclick=()=>{selColor=c;renderColorSwatches();};
    wrap.appendChild(d);
  });
}
function updateInfo(){
  const me=getMe();
  $('petShopInfo').textContent=(me&&me.pet)?t('pet_current',{name:me.pet.name}):t('pet_none');
  $('petAdoptBtn').textContent=t('pet_adopt_btn',{price:PET_PRICE});
}
export function openPetShop(){
  const me=getMe();
  if(me&&me.pet){selSpecies=me.pet.species;selColor=me.pet.color;}
  const c=$('petPreviewCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=160*dpr;c.height=160*dpr;previewG=c.getContext('2d');previewG.setTransform(dpr,0,0,dpr,0,0);
  renderSpeciesButtons();renderColorSwatches();updateInfo();
  $('petshop').style.display='flex';setLocked(true);
  if(!previewRAF)previewLoop();
}
function closePetShop(){$('petshop').style.display='none';if(previewRAF)cancelAnimationFrame(previewRAF);previewRAF=null;setLocked(false);}
function previewLoop(){
  if($('petshop').style.display==='none'){previewRAF=null;return;}
  const g=previewG;g.clearRect(0,0,160,160);
  drawPetShape(g,80,90,selSpecies,selColor,performance.now(),1);
  previewRAF=requestAnimationFrame(previewLoop);
}
function tryAdopt(){
  const me=getMe();if(!me)return;
  if((me.stardust||0)<PET_PRICE){showPopup('🐾',t('popup_pet_title'),t('claw_no_funds'),'purple');return;}
  const name=($('petNameInput').value||'').trim().slice(0,14)||PET_LABEL[selSpecies];
  socket&&socket.emit('pet-adopt',{species:selSpecies,color:selColor,name});
}
export function onPetAdoptResult(d){
  if(!d||!d.ok){if(d&&d.code==='err_funds')showPopup('🐾',t('popup_pet_title'),t('claw_no_funds'),'purple');return;}
  const me=getMe();if(me){me.pet=d.pet;me.stardust=d.stardust;}
  const bal=document.getElementById('orbs');if(bal)bal.textContent=d.stardust;
  showPopup('🐾',t('popup_pet_title'),t('pet_adopted',{name:d.pet.name}),'gold');
  updateInfo();
}
export function initPetShopDom(){
  $('petshopclose').onclick=closePetShop;
  $('petAdoptBtn').onclick=tryAdopt;
  $('petshop').onclick=e=>{if(e.target.id==='petshop')closePetShop();};
}
