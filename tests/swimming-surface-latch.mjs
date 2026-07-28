import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createHud } from '../src/ui/hud.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';

const M=MaterialId;
const grid=new Map();
const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
const cells={
  getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
  setCell(x,y,type){ grid.set(key(x,y),type); return true; },
  isSolid(type){ return SOLID_MATERIALS.has(type); },
};
const state=createGameState();
Object.assign(state.player,{x:5,y:12,vx:0,vy:0,grounded:false,invulnerability:0});
const noop=()=>{};
const generator={biomeNameAt:()=> 'ocean',dimensionGravityScale:()=>1};
const hud=createHud(
  state,
  generator,
  {getTime:()=>({label:'Day 1 · 12:00',isDay:true})},
  {getWeather:()=>({label:'Clear',windLabel:'calm',type:'clear'})},
);
const system=createPlayerSystem(
  state,
  cells,
  {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
  generator,
  {attack:noop},
  hud,
  {burst:noop,worldFlash:noop,impact:noop,screenFlash:noop,land:noop,jump:noop,bunnyHop:noop},
);

// Deep pool with a surface at y=5 and a floor far below the player's
// standable depth. Passive buoyancy should settle the swimmer at the surface,
// not lift them clear, switch to walking, and make them fall back in.
for(let y=5;y<=30;y++)for(let x=3;x<=7;x++)cells.setCell(x,y,M.WATER);
for(let x=3;x<=7;x++)cells.setCell(x,31,M.ROCK);

let swimmingFrames=0;
let walkingFramesAfterEntry=0;
let entered=false;
let minY=Infinity;
let maxY=-Infinity;
for(let frame=0;frame<360;frame++){
  state.frame++;
  system.update();
  minY=Math.min(minY,state.player.y);
  maxY=Math.max(maxY,state.player.y);
  if(state.player.status.swimming){
    entered=true;
    swimmingFrames++;
  }else if(entered){
    walkingFramesAfterEntry++;
  }
}

if(!entered)throw new Error('Player never entered swimming in the deep pool.');
if(walkingFramesAfterEntry!==0){
  throw new Error(`Deep-water surface latch toggled into walking for ${walkingFramesAfterEntry} frames.`);
}
if(state.player.y<8||state.player.y>10){
  throw new Error(`Surface buoyancy did not settle near the waterline; baseline=${state.player.y}.`);
}
if(maxY-minY>8){
  throw new Error(`Swimmer oscillated too far vertically (${minY}..${maxY}).`);
}

// A reachable shallow floor must still release the swim latch normally.
grid.clear();
for(let y=5;y<=8;y++)for(let x=3;x<=7;x++)cells.setCell(x,y,M.WATER);
for(let x=3;x<=7;x++)cells.setCell(x,9,M.ROCK);
Object.assign(state.player,{x:5,y:7,vx:0,vy:0,grounded:false});
state.player.status.swimming=true;
state.frame++;
system.update();
if(state.player.status.swimming)throw new Error('Surface latch prevented standing in shallow water.');

console.log('swimming surface latch test passed',{
  swimmingFrames,
  finalBaseline:state.player.y,
  range:[minY,maxY],
});
