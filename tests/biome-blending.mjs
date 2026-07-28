import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { BIOME_REGION_SIZE, BIOME_TRANSITION_WIDTH } from '../src/data/biomes.db.js';

const state=createGameState();
state.seed=424242;
const generator=createWorldGenerator(state,createNoise(state));

let transitions=0;
let previous=generator.biomeIdAt(0);
for(let x=10;x<=BIOME_REGION_SIZE*7;x+=10){
  const current=generator.biomeIdAt(x);
  if(current!==previous)transitions++;
  previous=current;
}
if(transitions>7){
  throw new Error(`Biomes changed too frequently: ${transitions} transitions.`);
}

for(let x=-BIOME_REGION_SIZE;x<=BIOME_REGION_SIZE*3;x+=37){
  const mix=generator.biomeMixAt(x);
  const sum=mix.entries.reduce((total,item)=>total+item.weight,0);
  if(Math.abs(sum-1)>1e-9)throw new Error(`Biome weights do not sum to one at ${x}.`);
}

const boundary=BIOME_REGION_SIZE;
let previousSky=generator.skyAt(boundary-BIOME_TRANSITION_WIDTH);
let largestStep=0;
for(let x=boundary-BIOME_TRANSITION_WIDTH+1;x<=boundary+BIOME_TRANSITION_WIDTH;x++){
  const current=generator.skyAt(x);
  for(const band of ['top','bottom']){
    for(let channel=0;channel<3;channel++){
      largestStep=Math.max(largestStep,Math.abs(current[band][channel]-previousSky[band][channel]));
    }
  }
  previousSky=current;
}
if(largestStep>2.5){
  throw new Error(`Sky transition contains an abrupt color step of ${largestStep.toFixed(2)}.`);
}

console.log('biome blending test passed',{transitions,largestStep:largestStep.toFixed(3)});
