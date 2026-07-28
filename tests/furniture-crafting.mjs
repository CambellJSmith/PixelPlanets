import { createGameState } from '../src/state/game-state.js';
import { createFurnitureSystem } from '../src/systems/furniture-system.js';
import { createStructureSystem } from '../src/systems/structure-system.js';
import { FURNITURE_DB, FurnitureId, furnitureById } from '../src/data/furniture.db.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';
import { CropId } from '../src/data/crops.db.js';

const M=MaterialId;
const F=FurnitureId;
const grid=new Map();
const key=(x,y)=>`${Math.round(x)},${Math.round(y)}`;
const cells={
  getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
  setCell(x,y,type){ grid.set(key(x,y),type); return true; },
  isSolid(type){ return SOLID_MATERIALS.has(type); },
};
const state=createGameState();
Object.assign(state.player,{x:40,y:59,skySpawn:false,invulnerability:0});
for(let x=0;x<180;x++)cells.setCell(x,60,M.ROCK);
const chunks={
  chunkX:x=>Math.floor(x/360),chunkY:y=>Math.floor(y/210),
  isActiveWorldPosition:()=>true,updateActiveNeighborhood(){},
};
const messages=[];
const hud={update(){},showMessage(text){messages.push(String(text));},pushPickup(){}};
const timeSystem={
  cycleFrames:1000,
  getTime(){ return {isDay:false,cycleFrame:700,cycleFrames:1000,hours:22,minutes:15,label:'Day 1 · 22:15'}; },
};
const juice={burst(){},worldFlash(){},pickup(){},screenFlash(){},shockwave(){},particle(){},celebrate(){}};
const furniture=createFurnitureSystem(state,cells,chunks,timeSystem,hud,juice);

// Recipes are intentionally shallow and must all be craftable from ordinary materials.
for(let id=0;id<24;id++)state.inventory.add(id,500);
for(const definition of FURNITURE_DB){
  if(!definition.recipe?.length)throw new Error(`${definition.id} has no simple recipe.`);
  if(!furniture.craft(definition.id))throw new Error(`Could not craft ${definition.id}.`);
  if(state.inventory.furnitureCount(definition.id)!==1)throw new Error(`${definition.id} was not added to furniture inventory.`);
}
if(FURNITURE_DB.length<20)throw new Error('Furniture roster is not broad enough.');

// Multi-pixel placement checks the complete footprint and support.
let preview=furniture.canPlace(F.DOOR,66,59);
if(!preview.valid)throw new Error(`Supported door placement failed: ${preview.reason}`);
const door=furniture.place(F.DOOR,66,59).entity;
if(!door||!furniture.solidAt(66,56))throw new Error('Closed door did not create a collision barrier.');
state.player.x=60;
state.player.y=59;
furniture.interactNearest();
if(!door.open||furniture.solidAt(66,56))throw new Error('Door did not open and release its doorway collision.');

// Furniture placement refuses blocked footprints.
cells.setCell(77,57,M.ROCK);
preview=furniture.canPlace(F.WOOD_TABLE,77,59);
if(preview.valid)throw new Error('Furniture placement ignored blocked pixels inside its footprint.');
cells.setCell(77,57,M.AIR);

// Chairs create a stable seated state that movement can cancel.
const chair=furniture.place(F.CHAIR,76,59).entity;
state.player.x=72;
state.player.y=59;
furniture.interactNearest();
if(state.player.furnitureMode!=='sit'||state.player.furnitureSeatId!==chair.id)throw new Error('Chair did not seat the player.');
state.input.keys.add('d');
furniture.update();
state.input.keys.clear();
if(state.player.furnitureMode)throw new Error('Movement did not release the seated state.');

// Ladders are non-solid movement fixtures and detect body overlap.
const ladder=furniture.place(F.LADDER,86,59).entity;
state.player.x=86;
state.player.y=57;
if(furniture.playerOnLadder()?.id!==ladder.id)throw new Error('Ladder did not detect the overlapping player.');
if(furniture.solidAt(86,56))throw new Error('Ladder incorrectly became a solid wall.');

// Collector chests vacuum loose items, retain them, then empty into the pack.
const chest=furniture.place(F.CHEST,100,59).entity;
state.entities.pickups.push({kind:'seed',cropId:CropId.CARROT,amount:3,x:101,y:57,vx:0,vy:0,life:999,bob:0});
state.frame=12;
furniture.update();
if(state.entities.pickups.length!==0||chest.storedTotal!==3)throw new Error('Collector chest did not vacuum the nearby pickup.');
state.player.x=96;
state.player.y=59;
furniture.interactNearest();
if(state.inventory.seedCount(CropId.CARROT)!==3||chest.storedTotal!==0)throw new Error('Collector chest did not return stored items.');

// Planters consume an equipped seed and later yield produce.
const planter=furniture.place(F.PLANTER,112,59).entity;
const seedsBeforePlant=state.inventory.seedCount(CropId.CARROT);
state.inventory.addSeed(CropId.CARROT,1);
state.seedMode.active=true;
state.seedMode.cropId=CropId.CARROT;
state.player.x=108;
state.player.y=59;
furniture.interactNearest();
if(planter.cropId!==CropId.CARROT||state.inventory.seedCount(CropId.CARROT)!==seedsBeforePlant)throw new Error('Planter did not consume the equipped seed.');
planter.growth=3600;
furniture.interactNearest();
if(state.inventory.produceCount(CropId.CARROT)!==2)throw new Error('Mature planter did not yield produce.');

// Dimension transit must keep each base in its own world.
const generator={dimensionSpawnPoint:()=>({x:48,y:59}),rocketSiloDescriptor:()=>null};
const structure=createStructureSystem(state,cells,chunks,generator,hud,juice);
const earthFurnitureCount=state.entities.furniture.length;
structure.switchDimension('moon',{x:48,y:59});
if(state.entities.furniture.length!==0)throw new Error('Earth furniture leaked into the moon dimension.');
state.entities.furniture.push({id:'moon_lamp',furnitureId:F.FLOOR_LAMP,x:52,y:59,dimension:'moon',on:true,open:false});
structure.switchDimension('earth',{x:40,y:59});
if(state.entities.furniture.length!==earthFurnitureCount)throw new Error('Earth furniture was not restored after dimension travel.');
structure.switchDimension('moon',{x:48,y:59});
if(state.entities.furniture.length!==1||state.entities.furniture[0].id!=='moon_lamp')throw new Error('Moon furniture was not stored independently.');

// Data lookup remains stable for inventory and rendering.
for(const definition of FURNITURE_DB){
  if(furnitureById(definition.id)!==definition)throw new Error(`Furniture lookup failed for ${definition.id}.`);
}

console.log('furniture crafting test passed',{
  recipes:FURNITURE_DB.length,
  earthFurniture:earthFurnitureCount,
  chestCapacity:64,
});
