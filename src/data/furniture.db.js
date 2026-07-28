import { MaterialId } from './materials.db.js';

const M=MaterialId;

export const FurnitureId=Object.freeze({
  WORKBENCH:'workbench',
  WOOD_TABLE:'wood_table',
  STONE_TABLE:'stone_table',
  CHAIR:'chair',
  STOOL:'stool',
  DOOR:'door',
  GATE:'gate',
  FLOOR_LAMP:'floor_lamp',
  WALL_LAMP:'wall_lamp',
  LANTERN:'lantern',
  SWITCH:'switch',
  CHEST:'chest',
  BED:'bed',
  BUNK_BED:'bunk_bed',
  LADDER:'ladder',
  BOOKSHELF:'bookshelf',
  PLANTER:'planter',
  SIGN:'sign',
  CLOCK:'clock',
  RUG:'rug',
  WINDOW:'window',
  FENCE:'fence',
});

const F=FurnitureId;
const recipe=(...pairs)=>Object.freeze(pairs.map(([materialId,count])=>Object.freeze({materialId,count})));
const freezeRows=rows=>Object.freeze(rows);

export const FURNITURE_DB=Object.freeze([
  {id:F.WORKBENCH,name:'workbench',category:'work',w:7,h:4,placement:'floor',action:'craft',recipe:recipe([M.WOOD,8],[M.ROCK,2]),sprite:freezeRows(['wwwwwww','wddwddw','w w w w','w w w w']),solidRects:[[0,0,7,1],[0,1,1,3],[3,1,1,3],[6,1,1,3]]},
  {id:F.WOOD_TABLE,name:'wood table',category:'tables',w:7,h:4,placement:'floor',recipe:recipe([M.WOOD,6]),sprite:freezeRows(['wwwwwww','ddddddd','w     w','w     w']),solidRects:[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
  {id:F.STONE_TABLE,name:'stone table',category:'tables',w:7,h:4,placement:'floor',recipe:recipe([M.ROCK,7]),sprite:freezeRows(['sssssss','sdddsds','s     s','s     s']),solidRects:[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
  {id:F.CHAIR,name:'chair',category:'seating',w:3,h:4,placement:'floor',action:'sit',seatOffsetY:-1,recipe:recipe([M.WOOD,4]),sprite:freezeRows(['w  ','www','w w','w w']),solidRects:[[0,0,1,4],[1,1,2,1],[2,2,1,2]]},
  {id:F.STOOL,name:'stool',category:'seating',w:3,h:3,placement:'floor',action:'sit',seatOffsetY:-1,recipe:recipe([M.WOOD,3]),sprite:freezeRows(['www','w w','w w']),solidRects:[[0,0,3,1],[0,1,1,2],[2,1,1,2]]},
  {id:F.DOOR,name:'wood door',category:'doors',w:2,h:7,placement:'floor',action:'toggle',recipe:recipe([M.WOOD,7]),sprite:freezeRows(['ww','wd','ww','wd','ww','wd','ww']),openSprite:freezeRows(['w ','w ','w ','w ','w ','w ','w ']),solidRects:[[0,0,2,7]],openSolidRects:[[0,0,1,7]]},
  {id:F.GATE,name:'base gate',category:'doors',w:5,h:4,placement:'floor',action:'toggle',recipe:recipe([M.WOOD,7],[M.ROCK,1]),sprite:freezeRows(['wwwww','wdwdw','wwwww','w w w']),openSprite:freezeRows(['w   w','w   w','w   w','w   w']),solidRects:[[0,0,5,3],[0,3,1,1],[2,3,1,1],[4,3,1,1]],openSolidRects:[[0,0,1,4],[4,0,1,4]]},
  {id:F.FLOOR_LAMP,name:'floor lamp',category:'lights',w:3,h:7,placement:'floor',action:'light',lightRadius:18,recipe:recipe([M.WOOD,3],[M.CRYSTAL,2]),sprite:freezeRows([' l ','lll',' l ',' w ',' w ',' w ','www']),solidRects:[[1,2,1,5],[0,6,3,1]]},
  {id:F.WALL_LAMP,name:'wall lamp',category:'lights',w:3,h:3,placement:'wall',action:'light',lightRadius:13,recipe:recipe([M.ROCK,1],[M.CRYSTAL,1]),sprite:freezeRows(['sll','sll','s l']),solidRects:[[0,0,1,3]]},
  {id:F.LANTERN,name:'hanging lantern',category:'lights',w:3,h:4,placement:'wall',action:'light',lightRadius:15,recipe:recipe([M.BAMBOO,2],[M.CRYSTAL,1]),sprite:freezeRows([' w ','wlw','lll',' d ']),solidRects:[[1,0,1,1]]},
  {id:F.SWITCH,name:'wall switch',category:'utility',w:3,h:3,placement:'wall',action:'switch',recipe:recipe([M.ROCK,1],[M.CRYSTAL,1]),sprite:freezeRows(['sss','sd ','sss']),solidRects:[[0,0,1,3]]},
  {id:F.CHEST,name:'collector chest',category:'storage',w:5,h:3,placement:'floor',action:'chest',recipe:recipe([M.WOOD,6],[M.CRYSTAL,1]),sprite:freezeRows(['wwwww','wdddw','wwwww']),solidRects:[[0,0,5,3]]},
  {id:F.BED,name:'bed',category:'comfort',w:7,h:3,placement:'floor',action:'sleep',recipe:recipe([M.WOOD,5],[M.LEAF,5]),sprite:freezeRows(['fffffff','wwwwwww','w     w']),solidRects:[[0,0,7,2],[0,2,1,1],[6,2,1,1]]},
  {id:F.BUNK_BED,name:'bunk bed',category:'comfort',w:5,h:7,placement:'floor',action:'sleep',recipe:recipe([M.WOOD,9],[M.LEAF,8]),sprite:freezeRows(['fffff','wwwww','w   w','w   w','fffff','wwwww','w   w']),solidRects:[[0,0,5,2],[0,2,1,5],[4,2,1,5],[0,4,5,2]]},
  {id:F.LADDER,name:'ladder',category:'utility',w:2,h:7,placement:'floor',action:'ladder',recipe:recipe([M.WOOD,5]),sprite:freezeRows(['ww','dd','ww','dd','ww','dd','ww']),solidRects:[]},
  {id:F.BOOKSHELF,name:'portal bookshelf',category:'storage',w:5,h:7,placement:'floor',action:'bookshelf',recipe:recipe([M.WOOD,8],[M.LEAF,2]),sprite:freezeRows(['wwwww','wcbgw','wwwww','wgbcw','wwwww','wbcgw','wwwww']),solidRects:[[0,0,5,7]]},
  {id:F.PLANTER,name:'planter box',category:'garden',w:5,h:3,placement:'floor',action:'planter',recipe:recipe([M.WOOD,4],[M.DIRT,3]),sprite:freezeRows([' p p ','wdddw','wwwww']),solidRects:[[0,1,5,2]]},
  {id:F.SIGN,name:'base sign',category:'decor',w:5,h:5,placement:'floor',action:'sign',recipe:recipe([M.WOOD,4]),sprite:freezeRows(['wwwww','wdddw','wwwww','  w  ',' www ']),solidRects:[[0,0,5,3],[2,3,1,2]]},
  {id:F.CLOCK,name:'wall clock',category:'utility',w:5,h:5,placement:'wall',action:'clock',recipe:recipe([M.WOOD,2],[M.CRYSTAL,2]),sprite:freezeRows([' www ','wlllw','wlldw','wlllw',' www ']),solidRects:[]},
  {id:F.RUG,name:'woven rug',category:'decor',w:7,h:1,placement:'floor',recipe:recipe([M.LEAF,3],[M.BAMBOO,2]),sprite:freezeRows(['frfrfrf']),solidRects:[]},
  {id:F.WINDOW,name:'crystal window',category:'walls',w:5,h:5,placement:'floor',recipe:recipe([M.ROCK,4],[M.CRYSTAL,3]),sprite:freezeRows(['sssss','sgggs','sgdgs','sgggs','sssss']),solidRects:[[0,0,5,1],[0,4,5,1],[0,1,1,3],[4,1,1,3]]},
  {id:F.FENCE,name:'wood fence',category:'walls',w:5,h:3,placement:'floor',recipe:recipe([M.WOOD,4]),sprite:freezeRows(['wwwww','w w w','wwwww']),solidRects:[[0,0,5,1],[0,1,1,2],[2,1,1,2],[4,1,1,2]]},
]);

const BY_ID=new Map(FURNITURE_DB.map(item=>[item.id,item]));
export const FURNITURE_IDS=Object.freeze(FURNITURE_DB.map(item=>item.id));
export const FURNITURE_MAX_PER_DIMENSION=160;

export function furnitureById(id){ return BY_ID.get(String(id??''))??null; }
export function furnitureRecipeText(definition,materialName){
  return (definition?.recipe??[]).map(cost=>`${cost.count} ${materialName(cost.materialId)}`).join(' + ');
}

export function furnitureBounds(entity,definition=furnitureById(entity?.furnitureId)){
  if(!entity||!definition)return null;
  const left=Math.round(entity.x)-Math.floor(definition.w*.5);
  const bottom=Math.round(entity.y);
  return {left,right:left+definition.w-1,top:bottom-definition.h+1,bottom,w:definition.w,h:definition.h};
}

export function furnitureSolidAtEntity(entity,x,y){
  const definition=furnitureById(entity?.furnitureId);
  const bounds=furnitureBounds(entity,definition);
  if(!definition||!bounds||x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return false;
  const localX=Math.round(x)-bounds.left;
  const localY=Math.round(y)-bounds.top;
  const rects=entity.open?(definition.openSolidRects??[]):(definition.solidRects??[]);
  for(const [rx,ry,rw,rh] of rects){
    if(localX>=rx&&localX<rx+rw&&localY>=ry&&localY<ry+rh)return true;
  }
  return false;
}

export function furnitureSolidAt(entities,x,y,dimension=null){
  for(const entity of entities??[]){
    if(dimension&&entity.dimension&&entity.dimension!==dimension)continue;
    if(furnitureSolidAtEntity(entity,x,y))return true;
  }
  return false;
}

export const FURNITURE_PIXEL_COLORS=Object.freeze({
  w:'rgb(151,94,48)',d:'rgb(86,51,32)',s:'rgb(126,132,145)',c:'rgb(100,206,239)',
  b:'rgb(86,135,220)',g:'rgba(134,227,246,.66)',l:'rgb(255,235,126)',f:'rgb(192,86,105)',
  r:'rgb(233,153,57)',p:'rgb(91,198,105)',m:'rgb(186,91,195)',
});

export const SIGN_LABELS=Object.freeze(['HOME','MINE','FARM','PORTAL','DANGER','REST']);
