export const FOOD_ITEMS=[
  {id:'egg_sando',name:'Ei-Sandwich',ico:'🥪',price:20,stores:['familymart','seven']},
  {id:'onigiri',name:'Onigiri',ico:'🍙',price:15,stores:['familymart','seven']},
  {id:'mitsuya_cider',name:'Mitsuya Cider',ico:'🥤',price:18,stores:['familymart','seven']},
  {id:'famichiki',name:'Famichiki',ico:'🍗',price:35,stores:['familymart']},
  {id:'nikuman',name:'Nikuman',ico:'🥟',price:25,stores:['familymart']},
  {id:'oden',name:'Oden',ico:'🍢',price:20,stores:['seven']},
  {id:'slush',name:'Slush',ico:'🧊',price:40,stores:['seven'],machineOnly:true}
];
export const ITEM_NAME_JA={egg_sando:'たまごサンド',onigiri:'おにぎり',mitsuya_cider:'三ツ矢サイダー',
  famichiki:'ファミチキ',nikuman:'肉まん',oden:'おでん',slush:'スラッシュ'};
export const ITEM_FLAVOR={
  egg_sando:'Fluffiges Ei zwischen weichem Toastbrot. Ein echter Klassiker.',
  onigiri:'Ein handlicher Reisball, frisch aus dem Kühlregal.',
  mitsuya_cider:'Prickelnd-süße Limonade mit dem gewissen Etwas.',
  famichiki:'Knusprig gewürztes Brathähnchen, direkt aus der Wärmevitrine.',
  nikuman:'Ein warmer, gedämpfter Teigbausch mit herzhafter Füllung.',
  oden:'Verschiedene Zutaten, lange in würziger Brühe geschmort.',
  slush:'Eiskalt, fruchtig und frisch aus dem Automaten gezapft.'
};
export function foodItemsFor(store){return FOOD_ITEMS.filter(i=>i.stores.includes(store)&&!i.machineOnly);}
