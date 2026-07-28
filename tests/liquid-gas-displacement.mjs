import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createMaterialSystem } from '../src/systems/material-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=83421;
Object.assign(state.player,{x:60,y:30});
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
chunks.updateActiveNeighborhood();
const cells=createCellAccess(state,chunks,noise);
const materials=createMaterialSystem(state,cells,noise);

function prepareColumn(x,y,liquid,gas){
  cells.setCell(x,y,liquid);
  cells.setCell(x,y+1,gas,90);
  cells.setCell(x,y+2,M.AIR);

  // Keep the gas from rising or drifting before the liquid gets its turn.
  cells.setCell(x-1,y,M.ROCK);
  cells.setCell(x+1,y,M.ROCK);
  cells.setCell(x-1,y+1,M.ROCK);
  cells.setCell(x+1,y+1,M.ROCK);
}

prepareColumn(60,30,M.WATER,M.STEAM);
materials.update();
if(cells.getCell(60,31)!==M.WATER)throw new Error('Water was blocked by steam.');
if(cells.getCell(60,32)!==M.STEAM)throw new Error('Water did not push steam downward.');
if(cells.getCell(60,30)!==M.AIR)throw new Error('Water source cell was not vacated.');

state.frame++;
prepareColumn(90,30,M.LAVA,M.SMOKE);
materials.update();
if(cells.getCell(90,31)!==M.LAVA)throw new Error('Lava was blocked by smoke.');
if(cells.getCell(90,32)!==M.SMOKE)throw new Error('Lava did not push smoke downward.');
if(cells.getCell(90,30)!==M.AIR)throw new Error('Lava source cell was not vacated.');

console.log('liquid gas displacement test passed');
