import { MaterialId } from '../src/data/materials.db.js';
import { CropId } from '../src/data/crops.db.js';
import { BossKind } from '../src/data/bosses.db.js';
import { FurnitureId } from '../src/data/furniture.db.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); }
  getItem(key){ return this.map.has(key)?this.map.get(key):null; }
  setItem(key,value){ this.map.set(String(key),String(value)); }
  removeItem(key){ this.map.delete(String(key)); }
  clear(){ this.map.clear(); }
}

class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(){}
  fillRect(){}
  getImageData(x,y,width=360,height=210){ return this.createImageData(width,height); }
  set fillStyle(value){ this._fillStyle=value; }
}
class FakeElement {
  constructor(){ this.textContent=''; this.hidden=false; this.listeners=new Map(); this.style={}; }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
}
class FakeCanvas extends FakeElement {
  constructor(){ super(); this.width=360; this.height=210; this.context=new FakeContext(); }
  getContext(){ return this.context; }
  getBoundingClientRect(){ return {left:0,top:0,width:360,height:210}; }
  setPointerCapture(){}
  releasePointerCapture(){}
  hasPointerCapture(){ return false; }
}

const storage=new MemoryStorage();
const elements=new Map();
const canvas=new FakeCanvas();
elements.set('game',canvas);
for(const id of ['boot-status','accessibility-status'])elements.set(id,new FakeElement());

globalThis.localStorage=storage;
globalThis.HTMLCanvasElement=FakeCanvas;
globalThis.document={
  documentElement:{dataset:{}},
  getElementById(id){ return elements.get(id)??null; },
  createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=()=>0;
globalThis.setTimeout=()=>0;
globalThis.clearTimeout=()=>{};

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();

if(!game.systems.save.supported)throw new Error('Save system did not detect browser storage.');
if(!game.state.ui.saveSlots[0]||game.state.ui.saveSlots[0].empty)throw new Error('Initial world was not assigned to slot 1.');

const currentChunk=game.stores.world.activeChunks.find(chunk=>chunk.x===game.state.world.camera.chunkX&&chunk.y===game.state.world.camera.chunkY);
if(!currentChunk)throw new Error('Current chunk was unavailable for save test.');
const changedIndex=17+19*canvas.width;
currentChunk.cells[changedIndex]=MaterialId.CRYSTAL;
currentChunk.shade[changedIndex]=7;
currentChunk.saveDirtyIndices??=new Set();
currentChunk.saveDirtyIndices.add(changedIndex);
game.state.player.hp=63;
game.state.player.hunger=41;
game.state.crystals=27;
game.state.inventory.addProduce(CropId.CARROT,4);
game.state.inventory.addFurniture(FurnitureId.CHAIR,2);
game.state.entities.furniture.push({id:'saved_chair',furnitureId:FurnitureId.CHAIR,x:game.state.player.x+10,y:game.state.player.y,dimension:'earth',open:false,on:true});
const ritualRecord=game.systems.boss.encounter(BossKind.FROST_COLOSSUS);
ritualRecord.ritualProgress=75;
ritualRecord.ritualRegionIndex=4;
game.systems.save.markDirty();
if(!game.saveWorld(2))throw new Error('Manual slot save failed.');

currentChunk.cells[changedIndex]=MaterialId.AIR;
game.state.player.hp=5;
game.state.player.hunger=3;
game.state.crystals=0;
game.state.inventory.clear();
game.state.entities.furniture.length=0;
game.systems.boss.encounter(BossKind.FROST_COLOSSUS).ritualProgress=0;
if(!game.loadWorld(2))throw new Error('Saved slot could not be loaded.');

if(game.state.player.hp!==63||game.state.player.hunger!==41||game.state.crystals!==27){
  throw new Error('Player state did not round-trip through the save slot.');
}
if(game.state.inventory.produceCount(CropId.CARROT)!==4)throw new Error('Inventory did not round-trip through the save slot.');
if(game.state.inventory.furnitureCount(FurnitureId.CHAIR)!==2)throw new Error('Crafted furniture inventory did not round-trip through the save slot.');
if(game.state.entities.furniture.length!==1||game.state.entities.furniture[0].id!=='saved_chair')throw new Error('Placed furniture did not round-trip through the save slot.');
if(game.systems.boss.encounter(BossKind.FROST_COLOSSUS).ritualProgress!==75)throw new Error('Boss ritual progress did not round-trip through the save slot.');
const restoredChunk=game.stores.world.chunks.get(`earth:${currentChunk.x},${currentChunk.y}`);
if(restoredChunk?.cells[changedIndex]!==MaterialId.CRYSTAL)throw new Error('Changed world pixels did not round-trip through the save slot.');

// A new game instance must continue from the active slot without needing a DOM panel.
const secondCanvas=new FakeCanvas();
const secondGame=createGame(secondCanvas);
secondGame.start();
if(secondGame.state.save.activeSlot!==2||secondGame.state.player.hp!==63||secondGame.state.crystals!==27){
  throw new Error('The active world slot was not restored on startup.');
}

secondGame.systems.input.toggleWorldMenu(true);
secondGame.systems.renderer.render();
const kinds=new Set(secondGame.state.ui.inventoryRects.map(rect=>rect.kind));
for(const kind of ['world-close','world-load','world-save','world-new','world-delete']){
  if(!kinds.has(kind))throw new Error(`World menu is missing the ${kind} canvas control.`);
}
for(const rect of secondGame.state.ui.inventoryRects){
  if(rect.x<0||rect.y<0||rect.x+rect.w>360||rect.y+rect.h>210){
    throw new Error(`Canvas UI control escaped the game window: ${rect.kind}`);
  }
}
secondGame.systems.input.toggleWorldMenu(false);
secondGame.systems.input.toggleCrafting(true);
secondGame.systems.renderer.render();
const craftingKinds=new Set(secondGame.state.ui.inventoryRects.map(rect=>rect.kind));
if(!craftingKinds.has('crafting-close')||!craftingKinds.has('crafting-item'))throw new Error('Furniture crafting overlay is missing canvas controls.');
for(const rect of secondGame.state.ui.inventoryRects){
  if(rect.x<0||rect.y<0||rect.x+rect.w>360||rect.y+rect.h>210)throw new Error(`Crafting control escaped the game window: ${rect.kind}`);
}
secondGame.systems.input.toggleCrafting(false);

// Dimension state and changed chunks must survive the same sparse save format.
secondGame.systems.structures.switchDimension('moon',{x:48,y:55});
if(secondGame.state.world.dimension!=='moon')throw new Error('Could not enter moon dimension for save test.');
const moonChunk=secondGame.stores.world.activeChunks.find(chunk=>chunk.x===secondGame.state.world.camera.chunkX&&chunk.y===secondGame.state.world.camera.chunkY);
if(!moonChunk||moonChunk.dimension!=='moon')throw new Error('Moon chunk was not active for save test.');
const moonChangedIndex=23+23*canvas.width;
moonChunk.cells[moonChangedIndex]=MaterialId.CRYSTAL;
moonChunk.saveDirtyIndices??=new Set();
moonChunk.saveDirtyIndices.add(moonChangedIndex);
secondGame.systems.save.markDirty();
if(!secondGame.saveWorld(3))throw new Error('Moon-dimension slot save failed.');
secondGame.state.world.dimension='earth';
moonChunk.cells[moonChangedIndex]=MaterialId.AIR;
if(!secondGame.loadWorld(3))throw new Error('Moon-dimension slot could not load.');
if(secondGame.state.world.dimension!=='moon'||secondGame.state.player.x!==48)throw new Error('Active dimension did not round-trip through save data.');
const restoredMoonChunk=secondGame.stores.world.chunks.get(`moon:${moonChunk.x},${moonChunk.y}`);
if(restoredMoonChunk?.cells[moonChangedIndex]!==MaterialId.CRYSTAL)throw new Error('Changed moon pixels did not round-trip through the save slot.');
if(![...secondGame.stores.world.chunks.keys()].some(key=>key.startsWith('earth:')))throw new Error('Earth chunks were not preserved alongside moon chunks.');

console.log('save, load, world slots, and HUD layout test passed',{
  slots:secondGame.state.ui.saveSlots.length,
  active:secondGame.state.save.activeSlot,
  controls:secondGame.state.ui.inventoryRects.length,
});
