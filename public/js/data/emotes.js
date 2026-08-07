export const EMOTES=[{icon:'😄',expr:'happy'},{icon:'😂',expr:'laugh'},{icon:'❤️',expr:'love'},{icon:'😮',expr:'wow'},{icon:'😎',expr:'cool'},{icon:'😴',expr:'sleep'}];
// Emote-Aktionen (Körperanimation). free: wave+dance, Rest im Shop.
export const EMOTE_LIST=[
  {name:'wave',  label:'Winken',       icon:'👋', free:true},
  {name:'dance', label:'Tanzen',       icon:'🕺', free:true},
  {name:'cheer', label:'Jubeln',       icon:'🎉', item:'em_cheer'},
  {name:'jump',  label:'Hüpfen',       icon:'⬆️', item:'em_jump'},
  {name:'clap',  label:'Applaus',      icon:'👏', item:'em_clap'},
  {name:'wobble',label:'Wackelpudding',icon:'🫨', item:'em_wobble'},
  {name:'spin',  label:'Drehung',      icon:'🌀', item:'em_spin'},
  {name:'heart', label:'Herzchen',     icon:'💖', item:'em_heart'},
  {name:'angry', label:'Wütend',       icon:'😡', item:'em_angry'},
  {name:'laugh', label:'Lachanfall',   icon:'😂', item:'em_laugh'},
  {name:'cry',   label:'Heulen',       icon:'😭', item:'em_cry'},
  {name:'facepalm',label:'Facepalm',   icon:'🤦', item:'em_facepalm'},
  {name:'sit',   label:'Hinsetzen',    icon:'🪑', item:'em_sit'},
  {name:'sleep', label:'Schlafen',     icon:'😴', item:'em_sleep'},
  {name:'roll',  label:'Purzeln',      icon:'🤾', item:'em_roll'},
  {name:'moonwalk',label:'Moonwalk',   icon:'🌙', item:'em_moonwalk'},
  {name:'backflip',label:'Salto',      icon:'🤸', item:'em_backflip'},
  {name:'disco', label:'Disco-Fieber', icon:'🪩', item:'em_disco'},
  {name:'bow',   label:'Verbeugung',   icon:'🙇', item:'em_bow'},
  {name:'shrug', label:'Schulterzucken',icon:'🤷', item:'em_shrug'},
  {name:'think', label:'Grübeln',      icon:'🤔', item:'em_think'},
  {name:'salute',label:'Salutieren',   icon:'🫡', item:'em_salute'},
  {name:'float', label:'Schweben',     icon:'🧘', item:'em_float'},
  {name:'teleport',label:'Teleport',   icon:'✨', item:'em_teleport'},
  {name:'breakdance',label:'Breakdance',icon:'🕺', item:'em_breakdance'},
  {name:'rage',  label:'Weltraum-Wut', icon:'🔥', item:'em_rage'}
];
export const EMOTE_DUR={wave:2.2,dance:3.4,cheer:2.4,jump:1.6,clap:2.2,wobble:2,spin:1.4,heart:2.6,angry:2.2,laugh:2.4,cry:2.8,facepalm:2.4,sit:4,sleep:4.5,roll:1.4,moonwalk:3,backflip:1.1,disco:4,bow:2,shrug:2.2,think:3,salute:2.4,float:4,teleport:1.6,breakdance:3.2,rage:3};
export const EMOTE_META={em_cheer:{price:1500,minLevel:1},em_jump:{price:2000,minLevel:1},em_clap:{price:2000,minLevel:1},em_wobble:{price:2500,minLevel:1},em_spin:{price:3000,minLevel:2},em_heart:{price:3500,minLevel:2},em_angry:{price:3500,minLevel:2},em_laugh:{price:4000,minLevel:3},em_cry:{price:4000,minLevel:3},em_facepalm:{price:4500,minLevel:3},em_sit:{price:5000,minLevel:4},em_sleep:{price:5500,minLevel:4},em_roll:{price:7000,minLevel:5},em_moonwalk:{price:9000,minLevel:5},em_backflip:{price:12000,minLevel:6},em_disco:{price:18000,minLevel:8},em_bow:{price:2500,minLevel:1},em_shrug:{price:3000,minLevel:2},em_think:{price:3500,minLevel:2},em_salute:{price:4000,minLevel:3},em_float:{price:6000,minLevel:4},em_teleport:{price:9000,minLevel:5},em_breakdance:{price:15000,minLevel:7},em_rage:{price:22000,minLevel:9}};
