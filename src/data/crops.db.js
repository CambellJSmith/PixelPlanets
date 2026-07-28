export const CropId = Object.freeze({
  CARROT:1,
  POTATO:2,
  TOMATO:3,
  CORN:4,
  PUMPKIN:5,
  STRAWBERRY:6,
  BLUEBERRY:7,
  PEPPER:8,
  CUCUMBER:9,
  EGGPLANT:10,
  CABBAGE:11,
  SUNFLOWER:12,
});

const C=CropId;

export const CROP_DB = Object.freeze([
  null,
  { id:C.CARROT, name:'carrot', seedName:'carrot seeds', produceName:'carrot', pattern:'root', matureHeight:4, canopyRadius:2, heal:7, produceMin:2, produceMax:4, seedMin:2, seedMax:5, stem:[76,151,70], leaf:[55,174,69], fruit:[235,112,37], seed:[147,105,58] },
  { id:C.POTATO, name:'potato', seedName:'seed potatoes', produceName:'potato', pattern:'bush', matureHeight:5, canopyRadius:3, heal:8, produceMin:3, produceMax:6, seedMin:2, seedMax:4, stem:[82,139,74], leaf:[61,151,69], fruit:[190,150,89], seed:[169,127,75] },
  { id:C.TOMATO, name:'tomato', seedName:'tomato seeds', produceName:'tomato', pattern:'vine', matureHeight:8, canopyRadius:3, heal:9, produceMin:3, produceMax:7, seedMin:3, seedMax:6, stem:[63,151,70], leaf:[43,133,57], fruit:[226,55,47], seed:[209,184,92] },
  { id:C.CORN, name:'corn', seedName:'corn kernels', produceName:'corn cob', pattern:'stalk', matureHeight:11, canopyRadius:2, heal:10, produceMin:2, produceMax:4, seedMin:4, seedMax:8, stem:[101,167,67], leaf:[73,151,58], fruit:[241,198,55], seed:[218,171,53] },
  { id:C.PUMPKIN, name:'pumpkin', seedName:'pumpkin seeds', produceName:'pumpkin', pattern:'mound', matureHeight:4, canopyRadius:5, heal:15, produceMin:1, produceMax:3, seedMin:4, seedMax:8, stem:[67,137,58], leaf:[47,126,54], fruit:[232,119,32], seed:[218,192,126] },
  { id:C.STRAWBERRY, name:'strawberry', seedName:'strawberry seeds', produceName:'strawberry', pattern:'low_bush', matureHeight:3, canopyRadius:3, heal:6, produceMin:4, produceMax:8, seedMin:3, seedMax:6, stem:[63,147,63], leaf:[45,139,55], fruit:[225,47,65], seed:[244,205,77] },
  { id:C.BLUEBERRY, name:'blueberry', seedName:'blueberry seeds', produceName:'blueberries', pattern:'bush', matureHeight:6, canopyRadius:4, heal:7, produceMin:4, produceMax:9, seedMin:3, seedMax:6, stem:[83,121,67], leaf:[54,128,71], fruit:[72,83,185], seed:[156,112,72] },
  { id:C.PEPPER, name:'pepper', seedName:'pepper seeds', produceName:'pepper', pattern:'bush', matureHeight:6, canopyRadius:3, heal:8, produceMin:3, produceMax:6, seedMin:3, seedMax:7, stem:[62,144,65], leaf:[47,128,57], fruit:[221,62,48], seed:[225,195,102] },
  { id:C.CUCUMBER, name:'cucumber', seedName:'cucumber seeds', produceName:'cucumber', pattern:'vine', matureHeight:7, canopyRadius:5, heal:9, produceMin:3, produceMax:6, seedMin:3, seedMax:7, stem:[59,144,63], leaf:[44,132,58], fruit:[79,169,75], seed:[214,194,128] },
  { id:C.EGGPLANT, name:'eggplant', seedName:'eggplant seeds', produceName:'eggplant', pattern:'bush', matureHeight:7, canopyRadius:3, heal:10, produceMin:2, produceMax:5, seedMin:3, seedMax:6, stem:[72,139,68], leaf:[52,125,65], fruit:[112,54,145], seed:[201,169,104] },
  { id:C.CABBAGE, name:'cabbage', seedName:'cabbage seeds', produceName:'cabbage', pattern:'rosette', matureHeight:3, canopyRadius:4, heal:12, produceMin:1, produceMax:3, seedMin:3, seedMax:6, stem:[72,144,74], leaf:[78,163,91], fruit:[130,189,112], seed:[150,104,68] },
  { id:C.SUNFLOWER, name:'sunflower', seedName:'sunflower seeds', produceName:'sunflower head', pattern:'flower', matureHeight:12, canopyRadius:3, heal:8, produceMin:1, produceMax:2, seedMin:6, seedMax:12, stem:[76,151,65], leaf:[56,137,57], fruit:[231,176,43], seed:[95,72,52] },
]);

export const CROP_IDS = Object.freeze(CROP_DB.filter(Boolean).map(crop=>crop.id));
export const CROP_COUNT = CROP_IDS.length;

export function cropById(id){
  return CROP_DB[id]??null;
}

export function cropName(id){
  return cropById(id)?.name??'unknown crop';
}
