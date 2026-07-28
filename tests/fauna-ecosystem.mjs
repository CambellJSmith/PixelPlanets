import { FAUNA_DB, LOOT_DB, faunaById, lootById } from '../src/data/fauna.db.js';
import { BiomeId } from '../src/data/biomes.db.js';
import { UndergroundBiomeId } from '../src/data/underground-biomes.db.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createEnemySystem } from '../src/systems/enemy-system.js';
import { createCropSystem } from '../src/systems/crop-system.js';

const M=MaterialId;

if(FAUNA_DB.length<70)throw new Error(`Expected a very large fauna roster, received ${FAUNA_DB.length}.`);
const passive=FAUNA_DB.filter(item=>item.temperament==='passive').length;
const hostile=FAUNA_DB.filter(item=>item.temperament==='hostile').length;
if(passive<35||hostile<25)throw new Error(`Fauna temperament coverage is too small (${passive} passive, ${hostile} hostile).`);
if(LOOT_DB.length<25)throw new Error('Creature loot registry is too small.');

for(const species of FAUNA_DB){
  if(!species.sprite||!species.palette||species.palette.length<3)throw new Error(`${species.id} lacks complete pixel-art data.`);
  if(species.biomes.length===0&&species.undergroundBiomes.length===0)throw new Error(`${species.id} has no habitat.`);
  for(const [lootId,min,max,chance] of species.loot){
    if(!lootById(lootId))throw new Error(`${species.id} references unknown loot ${lootId}.`);
    if(min<1||max<min||chance<=0||chance>1)throw new Error(`${species.id} has an invalid loot entry.`);
  }
}

for(const biome of Object.values(BiomeId)){
  const species=FAUNA_DB.filter(item=>item.biomes.includes(biome));
  if(species.length<7)throw new Error(`Surface biome ${biome} has only ${species.length} fauna species.`);
}
for(const biome of Object.values(UndergroundBiomeId)){
  const species=FAUNA_DB.filter(item=>item.undergroundBiomes.includes(biome));
  if(species.length<6)throw new Error(`Underground biome ${biome} has only ${species.length} fauna species.`);
}

function harness(seed=715827883){
  const state=createGameState();
  state.seed=seed;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const drops=[];
  const crops={spawnLootPickup(...args){ drops.push(args); return {kind:'loot'}; }};
  const hud={update(){},showMessage(){}};
  const playerSystem={damage(){}};
  const enemies=createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud);
  return{state,noise,generator,chunks,cells,drops,enemies};
}

// Generated surface chunks contain only species appropriate to the actual biome
// at their spawn coordinate.
{
  const h=harness();
  const found=new Set();
  for(let region=-80;region<=80&&found.size<Object.values(BiomeId).length;region++){
    const biome=h.generator.regionBiomeId(region);
    if(found.has(biome))continue;
    const center=region*960+480;
    for(let offset=-1;offset<=1;offset++){
      const chunk=h.generator.makeChunk(Math.floor(center/180)+offset,0);
      for(const creature of chunk.enemies){
        const species=faunaById(creature.speciesId);
        if(!species)throw new Error(`Generated unknown species ${creature.speciesId}.`);
        const actualBiome=h.generator.surfaceAt(creature.x).biome;
        if(!species.biomes.includes(actualBiome)){
          throw new Error(`${species.id} spawned in inappropriate biome ${actualBiome}.`);
        }
        if(!Number.isInteger(creature.x)||!Number.isInteger(creature.y))throw new Error(`${species.id} spawned off the integer grid.`);
      }
      if(chunk.enemies.length>0)found.add(biome);
    }
  }
  if(found.size<Object.values(BiomeId).length-1){
    throw new Error(`Fauna failed to populate enough surface biomes (${found.size}).`);
  }
}

// Passive animals flee, hostile creatures pursue, and death emits loot.
{
  const h=harness(1431655765);
  const {state,chunks,cells,enemies,drops}=h;
  Object.assign(state.player,{x:40,y:50,vx:0,vy:0,hp:100});
  chunks.updateActiveNeighborhood();
  const chunk=chunks.getChunk(0,0,true);
  chunk.enemies.length=0;

  for(let y=38;y<=51;y++)for(let x=15;x<=90;x++)cells.setCell(x,y,y===51?M.ROCK:M.AIR,0,{silent:true,allowPlayerOverlap:true});

  const hare=faunaById('meadow_hare');
  const fox=faunaById('grassland_fox');
  const deer=faunaById('prairie_deer');
  const passiveCreature={speciesId:hare.id,x:46,y:50,vx:0,vy:0,moveCarryX:0,moveCarryY:0,hp:hare.hp,phase:0,hit:0,burning:0,facing:1,idleTimer:1,hopCooldown:100};
  const hostileCreature={speciesId:fox.id,x:60,y:50,vx:0,vy:0,moveCarryX:0,moveCarryY:0,hp:fox.hp,phase:0,hit:0,burning:0,facing:-1,idleTimer:1,hopCooldown:100};
  const deadCreature={speciesId:deer.id,x:58,y:50,vx:0,vy:0,moveCarryX:0,moveCarryY:0,hp:0,phase:0,hit:0,burning:0,facing:1,idleTimer:1,hopCooldown:100};
  chunk.enemies.push(passiveCreature,hostileCreature,deadCreature);

  const passiveStart=passiveCreature.x;
  const hostileStart=hostileCreature.x;
  for(let frame=0;frame<140;frame++){
    state.frame++;
    enemies.update();
  }

  if(passiveCreature.x<=passiveStart)throw new Error('Passive fauna did not flee from the player.');
  if(hostileCreature.x>=hostileStart)throw new Error('Hostile fauna did not pursue the player.');
  if(drops.length===0)throw new Error('Killed fauna did not produce loot pickups.');
  if(drops.some(([lootId])=>!lootById(lootId)))throw new Error('Fauna dropped an unknown loot item.');
  if(chunk.enemies.some(creature=>!Number.isInteger(creature.x)||!Number.isInteger(creature.y))){
    throw new Error('Fauna movement retained sub-pixel coordinates.');
  }
}


// Creature loot pickups use the same physical pickup and collection path as
// seeds and produce, then appear as persistent inventory items.
{
  const h=harness(19088743);
  const {state,chunks,cells,noise}=h;
  const hud={update(){},showMessage(){}};
  Object.assign(state.player,{x:30,y:40,vx:0,vy:0,hp:100});
  chunks.updateActiveNeighborhood();
  const crops=createCropSystem(state,cells,chunks,noise,hud);
  crops.spawnLootPickup('fang',state.player.x,state.player.y-2,2,0);
  for(let frame=0;frame<5;frame++){
    state.frame++;
    crops.updatePickups();
  }
  if(state.inventory.lootCount('fang')!==2)throw new Error('Creature loot pickup did not enter the inventory.');
  if(!state.inventory.list().some(item=>item.kind==='loot'&&item.lootId==='fang')){
    throw new Error('Creature loot was absent from the unified inventory list.');
  }
}

console.log('fauna ecosystem test passed',{species:FAUNA_DB.length,passive,hostile,loot:LOOT_DB.length});
