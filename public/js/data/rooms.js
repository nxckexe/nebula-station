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
  cryonis:{name:'Cryonis',minLevel:5,w:2200,h:1300,sky:['#0a2033','#08131f'],ground:'#4d7fb0','ground2':'#3c6a97',flora:'#bfeaff',dot:'radial-gradient(circle at 35% 30%,#bfeaff,#4d7fb0)'},
  magmara:{name:'Magmara',minLevel:12,w:2200,h:1300,sky:['#2e0d0a','#1a0707'],ground:'#7a3320',ground2:'#631f12',flora:'#ffb14d',dot:'radial-gradient(circle at 35% 30%,#ffcaa0,#7a3320)'}
};
export const PLANET_ORDER=['verdiania','cryonis','magmara'];
