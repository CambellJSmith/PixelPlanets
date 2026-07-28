import { createGameState } from '../src/state/game-state.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { MaterialId } from '../src/data/materials.db.js';
import { WeaponId } from '../src/data/weapons.db.js';

const M=MaterialId;
const state=createGameState();
state.weaponId=WeaponId.DESTRUCULATOR;
Object.assign(state.player,{x:5,y:10,width:3,height:5});
Object.assign(state.input,{pointerX:20,pointerY:8,pointerInside:true,pointerDown:false,pointerButton:2});
Object.assign(state.world.camera,{chunkX:0,chunkY:0});

const grid=new Map();
const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
const cells={
  getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
  setCell(x,y,type){ grid.set(key(x,y),type); return true; },
  isSolid(type){ return type!==M.AIR; },
};
const hud={update(){},showMessage(){}};
const noise={randomAt(){return .5;}};
const weapons=createWeaponSystem(state,cells,{},noise,hud);


// Liquids are transparent to automatic Destruculator targeting. A fluid cell
// is selected only when the pointer is placed directly on that exact pixel.
grid.clear();
grid.set('8,8',M.WATER);
grid.set('10,8',M.ROCK);
Object.assign(state.input,{pointerX:20,pointerY:8});
const throughLiquid=weapons.getDestruculatorPreview();
if(!throughLiquid.valid||throughLiquid.x!==10||throughLiquid.y!==8||throughLiquid.type!==M.ROCK){
  throw new Error(`Liquid incorrectly intercepted automatic targeting: ${JSON.stringify(throughLiquid)}`);
}
Object.assign(state.input,{pointerX:8,pointerY:8});
const directLiquid=weapons.getDestruculatorPreview();
if(!directLiquid.valid||directLiquid.x!==8||directLiquid.y!==8||directLiquid.type!==M.WATER||!directLiquid.explicitlyHoveredLiquid){
  throw new Error(`Direct liquid hover did not select the fluid: ${JSON.stringify(directLiquid)}`);
}
state.cooldown=0;
weapons.attack();
if(grid.get('8,8')!==M.AIR)throw new Error('Directly hovered fluid was not mined.');
if(state.inventory.counts[M.WATER]!==1)throw new Error('Mined fluid was not added to inventory.');

grid.clear();
state.inventory.clear();
state.cooldown=0;
Object.assign(state.input,{pointerX:20,pointerY:8});

grid.set('10,8',M.ROCK);
const destroy=weapons.getDestruculatorPreview();
if(!destroy.valid||destroy.x!==10||destroy.y!==8||destroy.type!==M.ROCK){
  throw new Error(`Destruction preview failed: ${JSON.stringify(destroy)}`);
}

// Right and left click are intentionally identical: the Destruculator always
// destroys and stores the target block.
weapons.attack();
if(grid.get('10,8')!==M.AIR)throw new Error('Destruculator did not destroy its target.');
if(state.inventory.counts[M.ROCK]!==1)throw new Error('Destroyed block was not added to inventory.');
if(state.inventory.order[0]!==M.ROCK)throw new Error('Inventory did not preserve acquisition order.');

state.cooldown=0;
grid.set('10,8',M.ROCK);
if(!weapons.equipMaterial(M.ROCK))throw new Error('Placeable inventory block could not be equipped.');
if(!state.build.active||state.build.equippedMaterial!==M.ROCK)throw new Error('Equipping a block did not enter build mode.');

const place=weapons.getBuildPreview();
if(!place.valid||place.x!==9||place.y!==8||!place.snappedToSurface){
  throw new Error(`Surface-snapped build preview failed: ${JSON.stringify(place)}`);
}

weapons.attack();
if(grid.get('9,8')!==M.ROCK)throw new Error('Build mode did not place the equipped block.');
if(state.inventory.counts[M.ROCK]!==0)throw new Error('Placed block was not removed from inventory.');
if(state.build.active)throw new Error('Build mode did not close after the equipped stack was depleted.');

console.log('destruculator and build inventory test passed');
