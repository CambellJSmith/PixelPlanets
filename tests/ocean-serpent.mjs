import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createProjectileSystem } from '../src/systems/projectile-system.js';
import { createBossSystem } from '../src/systems/boss-system.js';
import { faunaById } from '../src/data/fauna.db.js';
import { BiomeId } from '../src/data/biomes.db.js';
import { BossKind } from '../src/data/bosses.db.js';
import { bossRitualDefinition } from '../src/data/boss-rituals.db.js';

const M=MaterialId;

function createHarness(seed){
  const state=createGameState();
  state.seed=seed;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const messages=[];
  const hud={
    update(){},
    showMessage(message){ messages.push(message); },
  };
  const crops={ harvestAt(){ return false; }, throwSeeds(){ return false; }, eatProduce(){ return false; } };
  const weapons=createWeaponSystem(state,cells,chunks,noise,hud,crops);
  const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
  const projectiles=createProjectileSystem(state,cells,chunks,noise);
  const bosses=createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem);
  return {state,noise,generator,chunks,cells,weapons,playerSystem,projectiles,bosses,messages};
}

const h=createHarness(975318642);
const {state,generator,chunks,cells,projectiles,bosses,messages}=h;

let ocean=null;
for(let region=-80;region<=80&&!ocean;region++)ocean=generator.oceanDescriptor(region);
if(!ocean)throw new Error('Expected to find a deterministic ocean biome.');

const centerX=Math.round(ocean.center);
const surface=generator.surfaceAt(centerX);
if(!surface.ocean)throw new Error('The ocean descriptor center was not generated as ocean terrain.');
if(surface.water>=surface.ground-6){
  throw new Error(`Ocean water was not deep enough (${surface.water} to ${surface.ground}).`);
}
if(generator.generatedMaterial(centerX,surface.water+2)!==M.WATER){
  throw new Error('The ocean water column did not contain water.');
}
if(generator.generatedMaterial(centerX,surface.ground)!==M.SAND){
  throw new Error('The ocean floor was not sandy.');
}

const oceanChunk=generator.makeChunk(chunks.chunkX(centerX),0);
if(oceanChunk.enemies.length===0){
  throw new Error('The open ocean spawned without any aquatic fauna.');
}
for(const creature of oceanChunk.enemies){
  const species=faunaById(creature.speciesId);
  if(!species||!species.biomes.includes(BiomeId.OCEAN)){
    throw new Error(`Non-ocean fauna spawned in open water: ${creature.speciesId}.`);
  }
}

Object.assign(state.player,{
  x:ocean.center,
  y:surface.water+4,
  vx:0,
  vy:0,
  hp:100,
  grounded:false,
  invulnerability:0,
});
chunks.updateActiveNeighborhood();

bosses.update();
if(state.entities.bosses.length!==0)throw new Error('The sea serpent spawned from ocean entry alone.');
if(!state.ui.bossRitual?.title?.includes('ABYSS'))throw new Error('The sea-serpent bait ritual was not shown.');

state.inventory.addLoot('fish',1);
const ritual=bossRitualDefinition(BossKind.SEA_SERPENT);
bosses.encounter(BossKind.SEA_SERPENT).ritualProgress=ritual.progressFrames-15;
state.frame=15;
bosses.update();
if(state.entities.bosses.length!==1)throw new Error('The sea serpent did not rise after fish was carried into deep water.');
if(state.inventory.lootCount('fish')!==0)throw new Error('The sea-serpent bait was not consumed.');
let serpent=state.entities.bosses[0];
if(serpent.kind!=='sea_serpent')throw new Error(`Expected a sea serpent, received ${serpent.kind}.`);
if(serpent.y<=serpent.waterY)throw new Error('The sea serpent did not begin below the water surface.');
if(!messages.some(message=>message.includes('sea serpent rises'))){
  throw new Error('The emergence announcement was not shown.');
}

let sawFight=false;
let sawProjectile=false;
for(let tick=0;tick<220;tick++){
  state.frame++;
  bosses.update();
  serpent=state.entities.bosses[0];
  if(!serpent)break;
  if(serpent.phase==='fight'&&serpent.y<serpent.waterY)sawFight=true;
  if(state.entities.serpentProjectiles.length>0){
    sawProjectile=true;
    break;
  }
}
if(!sawFight)throw new Error('The sea serpent never emerged above the water into its fight phase.');
if(!sawProjectile)throw new Error('The sea serpent never launched a water-burst attack.');

serpent=state.entities.bosses[0];
const hpBefore=serpent.hp;
state.entities.bullets.push({
  x:serpent.x-5,
  y:serpent.y,
  vx:2,
  vy:0,
  life:12,
  pierce:1,
});
for(let tick=0;tick<8;tick++){
  state.frame++;
  projectiles.update();
}
if(state.entities.bosses[0].hp>=hpBefore)throw new Error('Player bullets did not damage the sea serpent.');

state.entities.bosses[0].hp=0;
state.frame++;
bosses.update();
if(!state.world.seaSerpentDefeated)throw new Error('Sea-serpent defeat state was not recorded.');
if(state.entities.bosses.length!==0)throw new Error('The defeated sea serpent remained active.');
if(state.crystals<30)throw new Error('The sea-serpent crystal reward was not granted.');

console.log('ocean biome and sea serpent test passed',{
  region:ocean.regionIndex,
  waterDepth:surface.ground-surface.water,
  reward:state.crystals,
});
