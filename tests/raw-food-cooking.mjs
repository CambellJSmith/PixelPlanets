import { FOOD_COOKING_CONFIG } from '../src/config.js';
import { LOOT_DB, lootById } from '../src/data/fauna.db.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createCropSystem } from '../src/systems/crop-system.js';

const M=MaterialId;
const rawFoods=LOOT_DB.filter(item=>item.cookTo);
if(rawFoods.length<5)throw new Error(`Expected at least five raw foods, received ${rawFoods.length}.`);
for(const raw of rawFoods){
  const cooked=lootById(raw.cookTo);
  if(!cooked?.edible)throw new Error(`${raw.id} does not convert into edible cooked food.`);
  if(!(cooked.hungerRestore>0))throw new Error(`${cooked.id} does not restore hunger.`);
}
if(FOOD_COOKING_CONFIG.cookFrames!==60)throw new Error('Raw food must require exactly one second at 60 Hz.');

function harness(seed=0x51c0ffee){
  const state=createGameState();
  state.seed=seed;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const messages=[];
  const hud={update(){},showMessage(text){messages.push(text);},pushPickup(){}};
  const crops=createCropSystem(state,cells,chunks,noise,hud);
  Object.assign(state.player,{x:100,y:50,hp:60,hunger:20});
  chunks.updateActiveNeighborhood();
  for(let y=35;y<=43;y++)for(let x=20;x<=42;x++){
    cells.setCell(x,y,y===42?M.ROCK:M.AIR,0,{silent:true,allowPlayerOverlap:true});
  }
  return {state,cells,crops,messages};
}

// Continuous heat converts the world pickup only after the full 60 frames.
{
  const h=harness();
  h.cells.setCell(31,40,M.FIRE,120,{silent:true,allowPlayerOverlap:true});
  const pickup=h.crops.spawnLootPickup('raw_meat',30,40,1,0);
  pickup.vx=0;
  pickup.vy=0;
  for(let frame=1;frame<FOOD_COOKING_CONFIG.cookFrames;frame++){
    h.state.frame++;
    h.crops.updatePickups();
    if(pickup.lootId!=='raw_meat')throw new Error(`Raw meat cooked too early on frame ${frame}.`);
    if(!h.state.entities.pickups.includes(pickup))throw new Error('Cooking food was collected before cooking completed.');
  }
  h.state.frame++;
  h.crops.updatePickups();
  if(pickup.lootId!=='cooked_meat')throw new Error('Raw meat did not become cooked meat after one second.');
  if(!h.messages.some(message=>message.includes('COOKED')))throw new Error('Cooking completion was not communicated to the player.');
}

// Breaking heat exposure resets progress instead of preserving partial cooking.
{
  const h=harness(0x20260727);
  h.cells.setCell(31,40,M.LAVA,0,{silent:true,allowPlayerOverlap:true});
  const pickup=h.crops.spawnLootPickup('fish',30,40,1,0);
  pickup.vx=0;
  pickup.vy=0;
  for(let frame=0;frame<30;frame++){
    h.state.frame++;
    h.crops.updatePickups();
  }
  if((pickup.cookFrames??0)!==30)throw new Error('Partial cooking progress was not tracked.');
  h.cells.setCell(31,40,M.AIR,0,{silent:true,allowPlayerOverlap:true});
  h.state.frame++;
  h.crops.updatePickups();
  if((pickup.cookFrames??0)!==0)throw new Error('Cooking progress did not reset after heat was removed.');
  h.cells.setCell(31,40,M.STEAM,120,{silent:true,allowPlayerOverlap:true});
  for(let frame=0;frame<FOOD_COOKING_CONFIG.cookFrames;frame++){
    h.state.frame++;
    h.crops.updatePickups();
  }
  if(pickup.lootId!=='cooked_fish')throw new Error('Steam did not cook fresh fish after a fresh full exposure.');
}

// Cooked food is edible; raw food is not.
{
  const h=harness(0x12344321);
  h.state.inventory.addLoot('raw_meat',1);
  if(h.crops.eatLoot('raw_meat'))throw new Error('Raw meat was incorrectly edible.');
  h.state.inventory.addLoot('cooked_meat',1);
  const hungerBefore=h.state.player.hunger;
  const healthBefore=h.state.player.hp;
  if(!h.crops.eatLoot('cooked_meat'))throw new Error('Cooked meat could not be eaten.');
  if(h.state.player.hunger<=hungerBefore)throw new Error('Cooked meat did not restore hunger.');
  if(h.state.player.hp<=healthBefore)throw new Error('Cooked meat did not restore its small health benefit.');
  if(h.state.inventory.lootCount('cooked_meat')!==0)throw new Error('Eating cooked meat did not consume one item.');
}

console.log('raw food cooking test passed',{rawFoods:rawFoods.length,cookFrames:FOOD_COOKING_CONFIG.cookFrames});
