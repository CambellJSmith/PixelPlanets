import fs from 'node:fs';
import { BOSS_KINDS, BossKind } from '../src/data/bosses.db.js';
import { bossRitualDefinition } from '../src/data/boss-rituals.db.js';
import { BiomeId, BIOME_REGION_SIZE } from '../src/data/biomes.db.js';
import { UndergroundBiomeId } from '../src/data/underground-biomes.db.js';
import { WeatherType } from '../src/data/weather.db.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createBossSystem } from '../src/systems/boss-system.js';

const M=MaterialId;

for(const kind of BOSS_KINDS){
  const ritual=bossRitualDefinition(kind);
  if(!ritual)throw new Error(`Missing spawn ritual for ${kind}.`);
  if(!ritual.title||!ritual.hint||ritual.progressFrames<180)throw new Error(`Incomplete spawn ritual for ${kind}.`);
}

function harness(seed=4829517){
  const state=createGameState();
  state.seed=seed;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const messages=[];
  const hud={update(){},showMessage(message){messages.push(message);}};
  const crops={harvestAt(){return false;},throwSeeds(){return false;},eatProduce(){return false;}};
  const weapons=createWeaponSystem(state,cells,chunks,noise,hud,crops);
  const player=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
  const bosses=createBossSystem(state,cells,chunks,generator,noise,hud,player);
  return {state,generator,chunks,cells,bosses,messages};
}

function findBiomeX(generator,biome){
  for(let region=-80;region<=80;region++){
    const x=region*BIOME_REGION_SIZE+Math.floor(BIOME_REGION_SIZE*.5);
    if(generator.biomeIdAt(x)===biome)return x;
  }
  throw new Error(`Could not locate biome ${biome}.`);
}

// Snow peaks: entering is insufficient; collected snow plus active snowfall completes the idol ritual.
{
  const h=harness(581923);
  const x=findBiomeX(h.generator,BiomeId.SNOW_PEAKS);
  const surface=h.generator.surfaceAt(x);
  Object.assign(h.state.player,{x,y:surface.ground-1,vx:0,vy:0,grounded:true});
  h.chunks.updateActiveNeighborhood();
  h.bosses.update();
  if(h.state.entities.bosses.length)throw new Error('Frost colossus spawned on snow-biome entry.');
  if(h.state.ui.bossRitual?.kind!==BossKind.FROST_COLOSSUS)throw new Error('Frost ritual hint was not selected in snow peaks.');

  h.state.inventory.add(M.SNOW,12);
  h.state.weather.currentType=WeatherType.SNOW;
  const ritual=bossRitualDefinition(BossKind.FROST_COLOSSUS);
  h.bosses.encounter(BossKind.FROST_COLOSSUS).ritualProgress=ritual.progressFrames-15;
  h.state.frame=15;
  h.bosses.update();
  if(h.state.entities.bosses[0]?.kind!==BossKind.FROST_COLOSSUS)throw new Error('Snow idol ritual did not summon the frost colossus.');
  if(h.state.inventory.counts[M.SNOW]!==0)throw new Error('Snow idol materials were not consumed.');
}

// Plains: the Storm Roc requires a thunderstorm and open sky, not simply visiting the biome.
{
  const h=harness(991753);
  const x=findBiomeX(h.generator,BiomeId.PLAINS);
  const surface=h.generator.surfaceAt(x);
  Object.assign(h.state.player,{x,y:surface.ground-1,vx:0,vy:0,grounded:true});
  h.chunks.updateActiveNeighborhood();
  for(let y=Math.round(h.state.player.y-4);y>=Math.round(h.state.player.y-34);y--){
    h.cells.setCell(Math.round(x),y,M.AIR,0,{silent:true});
  }
  h.bosses.update();
  if(h.state.entities.bosses.length)throw new Error('Storm Roc spawned without a storm.');

  h.state.weather.currentType=WeatherType.THUNDERSTORM;
  const ritual=bossRitualDefinition(BossKind.STORM_ROC);
  h.bosses.encounter(BossKind.STORM_ROC).ritualProgress=ritual.progressFrames-15;
  h.state.frame=15;
  h.bosses.update();
  if(h.state.entities.bosses[0]?.kind!==BossKind.STORM_ROC)throw new Error('Open-sky thunder challenge did not summon the Storm Roc.');
}

// Mushroom caverns: three sustained fires among dense fungal roots awaken the monarch.
{
  const h=harness(731991);
  let point=null;
  for(let region=-30;region<=30&&!point;region++){
    const x=region*BIOME_REGION_SIZE+Math.floor(BIOME_REGION_SIZE*.5);
    const ground=h.generator.surfaceAt(x).ground;
    for(let y=Math.max(ground+40,230);y<=ground+650;y+=12){
      if(h.generator.undergroundBiomeIdAt(x,y-2)===UndergroundBiomeId.MUSHROOM_CAVERNS){point={x,y};break;}
    }
  }
  if(!point)throw new Error('Could not locate mushroom caverns for ritual test.');
  Object.assign(h.state.player,{x:point.x,y:point.y,vx:0,vy:0,grounded:false});
  h.chunks.updateActiveNeighborhood();
  for(let oy=-12;oy<=12;oy+=4){
    for(let ox=-16;ox<=16;ox+=4)h.cells.setCell(point.x+ox,point.y-2+oy,M.MYCELIUM,0,{silent:true});
  }
  for(const [ox,oy] of [[-5,-5],[0,-7],[6,-4]])h.cells.setCell(point.x+ox,point.y+oy,M.FIRE,120,{silent:true});
  const ritual=bossRitualDefinition(BossKind.MYCELIAL_MONARCH);
  h.bosses.encounter(BossKind.MYCELIAL_MONARCH).ritualProgress=ritual.progressFrames-15;
  h.state.frame=15;
  h.bosses.update();
  if(h.state.entities.bosses[0]?.kind!==BossKind.MYCELIAL_MONARCH)throw new Error('Burning fungal roots did not awaken the mycelial monarch.');
}

const renderer=fs.readFileSync(new URL('../src/render/renderer.js',import.meta.url),'utf8');
if(!renderer.includes('drawBossRitual'))throw new Error('Boss ritual HUD renderer is missing.');
if(!renderer.includes('ritual.progress'))throw new Error('Boss ritual progress is not visually displayed.');

console.log('boss spawn ritual test passed',{rituals:BOSS_KINDS.length});
