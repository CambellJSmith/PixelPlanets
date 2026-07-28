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
Object.assign(state.player,{x:5,y:7,vx:0,vy:0,grounded:false,invulnerability:0});
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

function clear(){ grid.clear(); }
function fillWater(x0,x1,y0,y1){
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)cells.setCell(x,y,M.WATER);
}
function fillFloor(x0,x1,y){
  for(let x=x0;x<=x1;x++)cells.setCell(x,y,M.ROCK);
}

// The player overlaps enough water to satisfy the old count-only test, but the
// complete liquid columns are only four pixels deep and have a usable floor.
clear();
fillWater(4,6,5,8);
fillFloor(4,6,9);
let exposure=system.waterExposureAt(5,7);
if(exposure.waterCells<4)throw new Error('Shallow-water fixture did not meet the old water-cell threshold.');
if(!exposure.canStand||exposure.standableColumns!==3){
  throw new Error('Shallow water floor was not detected across the player columns.');
}
if(exposure.swimming)throw new Error('Player entered swimming state despite a standable shallow floor.');

// A floor farther below the surface than the upright player is tall requires
// swimming even if the player is currently close to the bottom.
clear();
fillWater(4,6,0,9);
fillFloor(4,6,10);
exposure=system.waterExposureAt(5,7);
if(exposure.canStand)throw new Error('Deep liquid column was incorrectly classified as standable.');
if(!exposure.swimming)throw new Error('Deep liquid column did not trigger swimming.');

// One shallow ledge is enough support under the existing any-pixel ground
// collision rule, so the player should settle onto it instead of rotating.
clear();
fillWater(4,6,0,12);
cells.setCell(4,4,M.ROCK);
exposure=system.waterExposureAt(5,3);
if(!exposure.canStand||exposure.standableColumns<1){
  throw new Error('A usable shallow ledge was not recognized as standing support.');
}
if(exposure.swimming)throw new Error('Player swam despite having a reachable standing ledge.');

// Bottomless or very deep water remains swimmable.
clear();
fillWater(4,6,-60,80);
exposure=system.waterExposureAt(5,7);
if(!exposure.swimming)throw new Error('Bottomless water did not trigger swimming.');
if(exposure.canStand)throw new Error('Bottomless water reported false standing support.');

console.log('swimming liquid-column depth test passed',{
  scanColumns:exposure.columns.length,
  deepColumns:exposure.deepColumns,
});
