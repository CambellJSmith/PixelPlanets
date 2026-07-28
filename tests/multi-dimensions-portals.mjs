import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createInputSystem } from '../src/systems/input-system.js';
import { DIMENSION_DB, DimensionId, dimensionName } from '../src/data/dimensions.db.js';

const state=createGameState();
state.seed=4242069;
const generator=createWorldGenerator(state,createNoise(state));
const signatures=new Set();
for(const definition of DIMENSION_DB){
  if(definition.id===DimensionId.EARTH)continue;
  state.world.dimension=definition.id;
  const samples=[];
  for(const x of [-1000000,-500,0,48,800,1000000]){
    const name=generator.biomeNameAt(x,50).replaceAll('_',' ');
    if(name!==definition.name.toLowerCase())throw new Error(`${definition.name} stopped being its own infinite biome at ${x}: ${name}`);
    const surface=generator.surfaceAt(x);
    samples.push(surface.ground,generator.generatedMaterial(x,surface.ground),generator.generatedMaterial(x,surface.ground+8));
  }
  const sky=generator.skyAt(48);
  const signature=[...sky.top,...sky.bottom,...samples].join(',');
  if(signatures.has(signature))throw new Error(`${definition.name} duplicated another dimension's generation signature.`);
  signatures.add(signature);
  const spawn=generator.dimensionSpawnPoint(definition.id);
  if(!Number.isFinite(spawn.x)||!Number.isFinite(spawn.y))throw new Error(`${definition.name} has no valid spawn point.`);
  if(Math.abs((definition.gravity??1)-generator.dimensionGravityScale())>1e-9)throw new Error(`${definition.name} gravity was not exposed by the generator.`);
}

const opened=[];
const canvas={
  width:360,height:210,listeners:new Map(),
  addEventListener(type,handler){this.listeners.set(type,handler);},
  getBoundingClientRect(){return {left:0,top:0,width:360,height:210};},
};
const windowListeners=new Map();
globalThis.window={addEventListener(type,handler){windowListeners.set(type,handler);}};
const noop=()=>{};
const input=createInputSystem(state,canvas,{
  openDimensionPortal(id){opened.push(id);},
  saveWorld:noop,loadWorld:noop,togglePause:noop,cycleWeapon:noop,cycleMaterial:noop,
  equipMaterial:noop,equipSeed:noop,eatProduce:noop,eatLoot:noop,exitBuildMode:noop,
  releaseJump:noop,attack:noop,updateHud:noop,refreshSaveSlots:noop,
});
input.install();
const keydown=windowListeners.get('keydown');
for(const definition of DIMENSION_DB){
  for(const character of definition.code)keydown({key:character,repeat:false,preventDefault(){}});
}
if(opened.length!==DIMENSION_DB.length)throw new Error(`Expected ${DIMENSION_DB.length} portal codes, got ${opened.length}.`);
for(let index=0;index<DIMENSION_DB.length;index++){
  if(opened[index]!==DIMENSION_DB[index].id)throw new Error(`Code ${DIMENSION_DB[index].code} opened ${opened[index]}.`);
}

console.log('multi-dimension generation and portal-code test passed',{
  dimensions:DIMENSION_DB.length,
  signatures:signatures.size,
  codes:opened.length,
});
