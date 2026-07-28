import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';

const state=createGameState();
state.seed=919191;
const generator=createWorldGenerator(state,createNoise(state));
const chunks=createChunkManager(state,generator);

state.world.dimension='earth';
state.player.x=48;
state.player.y=55;
chunks.updateActiveNeighborhood();
const earthChunk=chunks.getChunk(0,0,false,'earth');
if(!earthChunk||earthChunk.dimension!=='earth')throw new Error('Earth chunk was not namespaced to Earth.');
if(generator.biomeNameAt(1000000,55)==='moon')throw new Error('Moon appeared in distant Earth terrain.');

state.world.dimension='moon';
state.player.x=48;
state.player.y=55;
chunks.updateActiveNeighborhood();
const moonChunk=chunks.getChunk(0,0,false,'moon');
if(!moonChunk||moonChunk.dimension!=='moon')throw new Error('Moon chunk was not namespaced to the moon dimension.');
if(moonChunk===earthChunk)throw new Error('Earth and moon shared the same chunk object.');
for(const x of [-1000000,-1000,0,1000,1000000]){
  if(generator.biomeNameAt(x,55)!=='moon')throw new Error(`Moon dimension ended or changed biome at x=${x}.`);
}

state.world.dimension='earth';
state.player.x=48;
state.player.y=55;
chunks.updateActiveNeighborhood();
if(chunks.getChunk(0,0,false,'earth')!==earthChunk)throw new Error('Returning to Earth did not restore its original chunk state.');
if(state.world.chunks.has('0,0'))throw new Error('Unnamespaced legacy chunk key was created.');
if(!state.world.chunks.has('earth:0,0')||!state.world.chunks.has('moon:0,0'))throw new Error('Dimension chunk keys are missing.');

console.log('separate infinite moon dimension test passed',{
  earthKey:'earth:0,0',
  moonKey:'moon:0,0',
  moonSamples:5,
});
