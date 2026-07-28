import { DIRT_GRASS_CONFIG } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createMaterialSystem } from '../src/systems/material-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=74291;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);

let surfaceX=null;
for(let x=-1200;x<2400;x+=7){
  const surface=generator.surfaceAt(x);
  const name=generator.biomeNameAt(x);
  if(!surface.lake&&!['snow_peaks','swamp','volcano'].includes(name)){
    surfaceX=x;
    break;
  }
}
if(surfaceX===null)throw new Error('Could not find a normal soil surface for the test.');
const surface=generator.surfaceAt(surfaceX);
for(let depth=1;depth<=10;depth++){
  if(generator.generatedMaterial(surfaceX,surface.ground+depth)!==M.DIRT){
    throw new Error(`Surface dirt layer was not deep enough at depth ${depth}.`);
  }
}

let undergroundDirt=0;
for(let x=-1000;x<2000;x+=17){
  const ground=generator.surfaceAt(x).ground;
  for(let depth=18;depth<120;depth+=7){
    if(generator.generatedMaterial(x,ground+depth)===M.DIRT)undergroundDirt++;
  }
}
if(undergroundDirt<10)throw new Error('Underground dirt clusters were not generated.');

let mycelium=0;
let stems=0;
let caps=0;
for(let chunkY=0;chunkY<5;chunkY++){
  for(let chunkX=-5;chunkX<10;chunkX++){
    const chunk=generator.makeChunk(chunkX,chunkY);
    for(const type of chunk.cells){
      if(type===M.MYCELIUM)mycelium++;
      else if(type===M.MUSHROOM_STEM)stems++;
      else if(type===M.MUSHROOM_CAP)caps++;
    }
  }
}
if(mycelium===0||stems===0||caps===0){
  throw new Error(`Mushroom biome generation incomplete: ${JSON.stringify({mycelium,stems,caps})}`);
}

const chunks=createChunkManager(state,generator);
Object.assign(state.player,{x:surfaceX,y:surface.ground-1});
chunks.updateActiveNeighborhood();
const cells=createCellAccess(state,chunks,noise);
const materials=createMaterialSystem(state,cells,noise);
const dirtX=Math.floor(state.player.x)+4;
const dirtY=Math.floor(state.player.y)-2;
cells.setCell(dirtX,dirtY,M.DIRT);
cells.setCell(dirtX,dirtY-1,M.AIR);
cells.setAge(dirtX,dirtY,DIRT_GRASS_CONFIG.exposedFrames-DIRT_GRASS_CONFIG.updateStepFrames);
materials.updateDirt(dirtX,dirtY);
if(cells.getCell(dirtX,dirtY)!==M.GRASS)throw new Error('Exposed dirt did not become grass after one minute.');

cells.setCell(dirtX,dirtY,M.DIRT);
cells.setCell(dirtX,dirtY-1,M.ROCK);
cells.setAge(dirtX,dirtY,100);
materials.updateDirt(dirtX,dirtY);
if(cells.getAge(dirtX,dirtY)!==0)throw new Error('Covered dirt did not reset its grass timer.');

console.log('terrain, mushroom biome, and grass growth test passed',{undergroundDirt,mycelium,stems,caps});
