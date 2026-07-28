import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';

const M=MaterialId;
const grid=new Map();
const cellKey=(x,y)=>`${x},${y}`;
const cells={
  getCell(x,y){ return grid.get(cellKey(Math.floor(x),Math.floor(y)))??M.AIR; },
  setCell(x,y,type){ grid.set(cellKey(Math.floor(x),Math.floor(y)),type); },
  isSolid(type){ return SOLID_MATERIALS.has(type); },
};

const state=createGameState();
Object.assign(state.player,{x:5,y:10,vx:1,vy:0,grounded:true});
const noop=()=>{};
const system=createPlayerSystem(
  state,
  cells,
  {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
  {biomeNameAt:()=> 'plains'},
  {attack:noop},
  {showMessage:noop},
);

// A one-cell ledge at the player's leading foot should be climbed.
cells.setCell(7,9,M.ROCK);
if(!system.tryAutoStep(6))throw new Error('Player did not climb a one-cell ledge.');
if(state.player.x!==6||state.player.y!==9)throw new Error('One-cell step produced the wrong player position.');

// Reset and verify that a two-cell wall is not climbed.
grid.clear();
Object.assign(state.player,{x:5,y:10,vx:1,vy:0,grounded:true});
cells.setCell(7,9,M.ROCK);
cells.setCell(7,8,M.ROCK);
if(system.tryAutoStep(6))throw new Error('Player incorrectly climbed a two-cell wall.');
if(state.player.x!==5||state.player.y!==10)throw new Error('Failed wall step changed the player position.');

console.log('player step test passed');
