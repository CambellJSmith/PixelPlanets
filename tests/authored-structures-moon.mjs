import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { MaterialId } from '../src/data/materials.db.js';

const state=createGameState();
state.seed=777777;
const generator=createWorldGenerator(state,createNoise(state));

const rocket=generator.rocketSiloDescriptor();
if(!rocket||rocket.id!=='rocket_silo')throw new Error('Rocket silo descriptor missing.');
const siloChunk=generator.makeChunk(Math.floor(rocket.centerX/360),Math.floor(rocket.launchPadY/210));
const localX=rocket.centerX-siloChunk.x*360;
const localY=rocket.launchPadY-siloChunk.y*210;
const index=localX+localY*360;
if(siloChunk.cells[index]!==MaterialId.AIR&&siloChunk.cells[index]!==MaterialId.CRYSTAL&&siloChunk.cells[index]!==MaterialId.WOOD){
  throw new Error('Rocket silo launch area was not carved/generated correctly.');
}

const distantEarthName=generator.biomeNameAt(200048,50);
if(distantEarthName==='moon')throw new Error('Moon still appears as a distant Earth biome.');
const moon=generator.moonSpawnPoint();
if(moon.x!==48)throw new Error(`Moon landing coordinates should use an independent local space, got ${moon.x}.`);
if(state.world.dimension!=='earth')throw new Error('Querying the moon spawn point changed the active dimension.');
state.world.dimension='moon';
for(const x of [-1000000,-720,0,720,1000000]){
  if(generator.biomeNameAt(x,50)!=='moon')throw new Error(`Moon dimension was not infinite at x=${x}.`);
  const surface=generator.surfaceAt(x);
  const top=generator.generatedMaterial(x,surface.ground);
  if(top!==MaterialId.SAND)throw new Error(`Expected lunar regolith at x=${x}, got ${top}.`);
}
const moonSurface=generator.surfaceAt(moon.x);
if(moonSurface.ground<30||moonSurface.ground>90)throw new Error('Moon surface outside expected range.');
state.world.dimension='earth';
console.log('authored structures and separate moon dimension test passed',{rocketX:rocket.centerX,moonX:moon.x,distantEarthName});
