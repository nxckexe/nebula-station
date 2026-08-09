export const CW=2000; // Breite des Casino-Decks (Scroll-Raum)
export const CRUG=800; // Mittelpunkt von Teppich + Casino-Schild (beim Lucky Wheel)
export const ROOMS={
  deck:{id:'deck',accent:'#4dd0ff',wall1:'#4a3aa0',wall2:'#382a80',floor1:'#efe4ff',floor2:'#ddceff',
    door:{x:970,y:360,to:'obs',dirRight:true},
    door2:{x:70,y:470,to:'casino',dirRight:true,icon:'🎰'},
    deco:[{t:'console',x:160,y:250},{t:'crate',x:262,y:262},{t:'crate',x:238,y:290},{t:'holo',x:520,y:250},{t:'vending',x:735,y:236},{t:'plant',x:905,y:272},{t:'plant',x:70,y:330}]},
  obs:{id:'obs',accent:'#ff5ea8',wall1:'#5a3a95',wall2:'#402872',floor1:'#ffe9f4',floor2:'#ffd3ea',
    door:{x:70,y:360,to:'deck',dirRight:false},
    deco:[{t:'telescope',x:210,y:262},{t:'bench',x:470,y:300},{t:'bench',x:640,y:300},{t:'plant',x:900,y:284},{t:'holo',x:820,y:246}]},
  casino:{id:'casino',accent:'#ffd166',wall1:'#7a1233',wall2:'#43091d',floor1:'#efe7d6',floor2:'#e2d6bd',w:CW,
    door:{x:70,y:360,to:'deck',dirRight:false},
    door2:{x:1900,y:360,to:'vip',dirRight:true,icon:'💎'},
    deco:[]},
  vip:{id:'vip',accent:'#ffd166',wall1:'#2a2440',wall2:'#12101f',floor1:'#1b1730',floor2:'#141126',
    door:{x:70,y:360,to:'casino',dirRight:false},
    deco:[]},
  cryo_arcade:{id:'cryo_arcade',accent:'#ff2e88',wall1:'#3a1250',wall2:'#1f0a30',floor1:'#241033',floor2:'#1a0b26',
    door:{x:70,y:360,to:'cryonis',dirRight:false},
    deco:[{t:'console',x:200,y:250},{t:'console',x:330,y:250},{t:'holo',x:540,y:246},{t:'vending',x:745,y:236},{t:'crate',x:905,y:272}]},
  cryo_plaza:{id:'cryo_plaza',accent:'#31e1ff',wall1:'#0d2b45',wall2:'#071a2c',floor1:'#12283a',floor2:'#0d1f2d',
    door:{x:70,y:360,to:'cryonis',dirRight:false},
    deco:[{t:'holo',x:300,y:246},{t:'holo',x:610,y:246},{t:'bench',x:470,y:300},{t:'bench',x:730,y:300},{t:'plant',x:905,y:272},{t:'plant',x:160,y:272}]},
  cryo_club:{id:'cryo_club',accent:'#b467ff',wall1:'#2a0f45',wall2:'#160726',floor1:'#1c0e30',floor2:'#150a24',
    door:{x:70,y:360,to:'cryonis',dirRight:false},
    door2:{x:930,y:400,to:'cryo_club_roof',dirRight:true,icon:'🛗'},
    deco:[]},
  cryo_club_roof:{id:'cryo_club_roof',accent:'#b467ff',wall1:'#160726',wall2:'#0a0316',floor1:'#1c0e30',floor2:'#150a24',
    door:{x:130,y:400,to:'cryo_club',dirRight:false,icon:'🛗'},
    deco:[]}
};
export const VIP_LEVEL=10;
export const VIP_SLOTS=[{x:300,y:300},{x:470,y:300},{x:800,y:300}];
export const VIP_BJ={x:520,y:470};
export const FOUNTAINS=[{x:210,y:500,r:44},{x:1390,y:500,r:44}];
export const CASINO_SLOTS=[{x:300,y:300},{x:470,y:300},{x:640,y:300},{x:1160,y:300},{x:1330,y:300}];
export const WHEEL_OBJ={x:800,y:378,r:74};
export const BJ_TABLES=[{x:450,y:492},{x:1150,y:492}];
export const PLINKO_OBJ={x:950,y:300,r:58};
export const ROU_OBJ={x:1750,y:430,r:110};
export const HALL_OBJ={x:1580,y:330,r:62};
export const PLANETS={
  verdiania:{name:'Verdiania',minLevel:1,w:2200,h:1300,sky:['#0c3322','#08201a'],ground:'#1f7a4d',ground2:'#166b41',flora:'#7be0b0',dot:'radial-gradient(circle at 35% 30%,#7be0b0,#1f7a4d)'},
  cryonis:{name:'Cryonis',minLevel:5,w:3600,h:620,sky:['#1a0f3d','#05030f'],ground:'#0d0a1f',ground2:'#161029',flora:'#31e1ff',dot:'radial-gradient(circle at 35% 30%,#bfeaff,#4d7fb0)',city:true},
  magmara:{name:'Magmara',minLevel:12,w:2200,h:1300,sky:['#2e0d0a','#1a0707'],ground:'#7a3320',ground2:'#631f12',flora:'#ffb14d',dot:'radial-gradient(circle at 35% 30%,#ffcaa0,#7a3320)'}
};
export const PLANET_ORDER=['verdiania','cryonis','magmara'];

// ---- Cryonis: begehbare Cyberpunk-Stadt ----
// Die Welt ist so hoch wie das feste Kamerafenster (H=620) -> kein vertikales Scrollen,
// die Wolkenkratzer passen dadurch immer komplett ins Bild. Sie sind bewusst hoch angelegt
// (fast bis zum oberen Rand), damit sie den Bildschirm dominieren wie in Club Penguins Town,
// mit nur einem schmalen begehbaren Gehweg-Streifen ganz unten.
export const CRYONIS_GROUND_Y=520;
export const CRYONIS_WALK_Y0=508;
export const CRYONIS_WALK_Y1=604;
// Ankunftspunkt/Portal bewusst weit von jedem Gebaeude entfernt (>500px), damit man beim
// Herumlaufen nicht versehentlich zurueck zur Station oder in ein Gebaeude stolpert.
export const CRYONIS_PORTAL_X=1300;
export const CRYONIS_BUILDINGS=[
  {id:'cryo_arcade',room:'cryo_arcade',x:750, w:340,topY:200,color:'#ff2e88',glow:'#ff8fc7',name:'Neon Arcade',icon:'🕹️'},
  {id:'cryo_plaza', room:'cryo_plaza', x:1900,w:520,topY:20, color:'#31e1ff',glow:'#9df3ff',name:'Cryo Plaza',  icon:'🏢'},
  {id:'cryo_club',  room:'cryo_club',  x:3050,w:320,topY:240,color:'#b467ff',glow:'#e2c6ff',name:'Data Club',   icon:'🎧'}
];
