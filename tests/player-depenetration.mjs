import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { playerPixelBounds } from '../src/player-geometry.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';

const M=MaterialId;
const noop=()=>{};

function createFakePlayerHarness(){
  const grid=new Map();
  const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
  const cells={
    getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
    setCell(x,y,type){ grid.set(key(x,y),type); return true; },
    isSolid(type){ return SOLID_MATERIALS.has(type); },
  };
  const state=createGameState();
  Object.assign(state.player,{x:5,y:10,vx:0,vy:0,grounded:true});
  const system=createPlayerSystem(
    state,
    cells,
    {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
    {biomeNameAt:()=> 'plains'},
    {attack:noop},
    {showMessage:noop},
  );
  return {grid,key,cells,state,system};
}

// Residual fractional velocity must never round the player through a solid wall.
{
  const h=createFakePlayerHarness();
  for(let x=-4;x<=14;x++)h.cells.setCell(x,10,M.ROCK);
  for(let y=3;y<=9;y++)h.cells.setCell(8,y,M.ROCK);
  h.state.input.keys.add('d');

  for(let frame=0;frame<480;frame++){
    h.state.frame++;
    h.system.update();
    if(h.system.collides(h.state.player.x,h.state.player.y)){
      throw new Error(`Player entered the wall on frame ${frame}.`);
    }
    if(!Number.isInteger(h.state.player.x)||!Number.isInteger(h.state.player.y)){
      throw new Error('Player movement retained a fractional position.');
    }
  }

  if(h.state.player.x!==6){
    throw new Error(`Player crossed or stopped too far from the wall (${h.state.player.x} instead of 6).`);
  }
}

// If legacy or future code leaves a solid inside the sprite, depenetration must
// move the player to the nearest open integer footprint rather than trapping it.
{
  const h=createFakePlayerHarness();
  for(let x=-4;x<=14;x++)h.cells.setCell(x,10,M.ROCK);
  h.cells.setCell(6,9,M.ROCK);
  if(!h.system.collides(h.state.player.x,h.state.player.y)){
    throw new Error('Depenetration fixture did not overlap the player.');
  }
  if(!h.system.resolveOverlap())throw new Error('Overlap resolver did not report a correction.');
  if(h.system.collides(h.state.player.x,h.state.player.y)){
    throw new Error('Overlap resolver left the player inside a solid pixel.');
  }
  if(!Number.isInteger(h.state.player.x)||!Number.isInteger(h.state.player.y)){
    throw new Error('Overlap resolver moved the player to a sub-pixel position.');
  }
}

// The central cell API must reject any newly introduced solid or moving powder
// that would occupy one of the player's visible pixels.
{
  const state=createGameState();
  state.seed=918273;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  Object.assign(state.player,{x:20,y:45,width:3,height:5});
  chunks.updateActiveNeighborhood();
  const bounds=playerPixelBounds(state.player.x,state.player.y,state.player.width,state.player.height);

  for(let y=bounds.top-2;y<=bounds.bottom+2;y++){
    for(let x=bounds.left-2;x<=bounds.right+2;x++){
      cells.setCell(x,y,M.AIR,0,{silent:true});
    }
  }

  const bodyX=bounds.centerX;
  const bodyY=bounds.top+2;
  if(cells.setCell(bodyX,bodyY,M.ROCK)!==false){
    throw new Error('Cell writer allowed a new solid pixel inside the player sprite.');
  }
  if(cells.getCell(bodyX,bodyY)!==M.AIR){
    throw new Error('Rejected solid placement still changed the player cell.');
  }

  const sourceX=bounds.left-1;
  const sourceY=bodyY;
  if(!cells.setCell(sourceX,sourceY,M.SAND))throw new Error('Could not create powder swap fixture.');
  if(cells.swapCells(sourceX,sourceY,bodyX,bodyY)!==false){
    throw new Error('Dynamic powder was allowed to swap into the player sprite.');
  }
  if(cells.getCell(sourceX,sourceY)!==M.SAND||cells.getCell(bodyX,bodyY)!==M.AIR){
    throw new Error('Rejected powder swap modified the cells.');
  }
}

console.log('player depenetration test passed');
