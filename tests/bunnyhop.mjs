import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';
import { BUNNYHOP_CONFIG, PLAYER_CONFIG } from '../src/config.js';

const M=MaterialId;
const grid=new Map();
const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
for(let x=-400;x<=400;x++)grid.set(key(x,20),M.ROCK);
const cells={
  getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
  setCell(x,y,type){ grid.set(key(x,y),type); return true; },
  isSolid(type){ return SOLID_MATERIALS.has(type); },
};
const state=createGameState();
Object.assign(state.player,{x:0,y:20,vx:0,vy:0,grounded:true,skySpawn:false});
state.input.keys.add('d');
const noop=()=>{};
const juice={jump:noop,bunnyHop:noop,land:noop};
const system=createPlayerSystem(
  state,
  cells,
  {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
  {biomeNameAt:()=> 'plains',isMoonWorld:()=>false},
  {attack:noop},
  {showMessage:noop},
  juice,
);

function step(){ state.frame++; system.update(); }
function hop(){
  state.jumpBuffer=PLAYER_CONFIG.jumpBufferFrames;
  step();
  const launchSpeed=-state.player.vy;
  let minY=state.player.y;
  let maxHorizontalSpeed=Math.abs(state.player.vx);
  let frames=0;
  while(!state.player.grounded&&frames<240){
    step();
    minY=Math.min(minY,state.player.y);
    maxHorizontalSpeed=Math.max(maxHorizontalSpeed,Math.abs(state.player.vx));
    frames++;
  }
  if(!state.player.grounded)throw new Error('Bunnyhop test player did not land.');
  return {launchSpeed,minY,maxHorizontalSpeed};
}

const hops=[];
for(let index=0;index<5;index++)hops.push(hop());
if(state.player.bunnyHop.chain!==5){
  throw new Error(`Expected five-hop chain, got ${state.player.bunnyHop.chain}.`);
}
for(let index=1;index<hops.length;index++){
  if(hops[index].launchSpeed<=hops[index-1].launchSpeed){
    throw new Error(`Jump impulse did not increase at hop ${index+1}.`);
  }
  if(hops[index].minY>=hops[index-1].minY){
    throw new Error(`Jump height did not increase at hop ${index+1}.`);
  }
}
if(hops.at(-1).maxHorizontalSpeed<=hops[0].maxHorizontalSpeed+.2){
  throw new Error('Repeated bunnyhops did not materially increase movement speed.');
}

for(let frame=0;frame<BUNNYHOP_CONFIG.groundResetFrames+2;frame++)step();
if(state.player.bunnyHop.chain!==0)throw new Error('Bunnyhop chain did not reset after lingering on the ground.');

// A wall collision must cancel built momentum and the chain.
state.player.bunnyHop.chain=4;
state.player.bunnyHop.landingWindow=BUNNYHOP_CONFIG.landingWindowFrames;
state.player.vx=2;
for(let y=15;y<=20;y++)grid.set(key(state.player.x+2,y),M.ROCK);
step();
if(state.player.bunnyHop.chain!==0)throw new Error('Wall collision did not reset bunnyhop chain.');

console.log('bunnyhop movement test passed',{
  chain:5,
  firstJump:hops[0].launchSpeed.toFixed(3),
  fifthJump:hops[4].launchSpeed.toFixed(3),
  firstSpeed:hops[0].maxHorizontalSpeed.toFixed(3),
  fifthSpeed:hops[4].maxHorizontalSpeed.toFixed(3),
});
