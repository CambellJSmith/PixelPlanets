import fs from 'node:fs';
import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { playerPixelBounds } from '../src/player-geometry.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';
import { WORLD_WIDTH } from '../src/config.js';

const M=MaterialId;

// Collision must cover exactly the same integer pixels drawn by the renderer.
{
  const grid=new Map();
  const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
  const cells={
    getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
    setCell(x,y,type){ grid.set(key(x,y),type); },
    isSolid(type){ return SOLID_MATERIALS.has(type); },
  };
  const state=createGameState();
  Object.assign(state.player,{x:5.5,y:10,vx:0,vy:0});
  const noop=()=>{};
  const system=createPlayerSystem(
    state,
    cells,
    {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
    {biomeNameAt:()=> 'plains'},
    {attack:noop},
    {showMessage:noop},
  );

  const bounds=playerPixelBounds(state.player.x,state.player.y,state.player.width,state.player.height);
  if(bounds.left!==5||bounds.right!==7||bounds.top!==5||bounds.bottom!==9){
    throw new Error(`Unexpected rendered player footprint: ${JSON.stringify(bounds)}`);
  }

  for(const [x,y] of [[bounds.left,bounds.top],[bounds.right,bounds.bottom],[bounds.centerX,bounds.top+2]]){
    grid.clear();
    cells.setCell(x,y,M.ROCK);
    if(!system.collides(state.player.x,state.player.y)){
      throw new Error(`Visible player pixel ${x},${y} was missing from collision.`);
    }
  }

  for(const [x,y] of [[bounds.left-1,bounds.top],[bounds.right+1,bounds.bottom],[bounds.centerX,bounds.bottom+1]]){
    grid.clear();
    cells.setCell(x,y,M.ROCK);
    if(system.collides(state.player.x,state.player.y)){
      throw new Error(`Pixel outside visible sprite ${x},${y} incorrectly blocked the player.`);
    }
  }
}

class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(image){ this.lastImageData=image; }
  getImageData(){ return this.createImageData(180,105); }
  fillRect(){}
  set fillStyle(value){ this._fillStyle=value; }
}
class FakeElement {
  constructor(){
    this.textContent='';
    this.innerHTML='';
    this.hidden=false;
    this.disabled=false;
    this.listeners=new Map();
    this.style={};
  }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
  classList={add(){},remove(){}};
}
class FakeCanvas extends FakeElement {
  constructor(){ super(); this.width=180; this.height=105; this.context=new FakeContext(); }
  getContext(){ return this.context; }
  getBoundingClientRect(){ return {left:0,top:0,width:180,height:105}; }
  setPointerCapture(){}
  releasePointerCapture(){}
  hasPointerCapture(){ return false; }
}

const elements=new Map();
const canvas=new FakeCanvas();
elements.set('game',canvas);
for(const id of ['hp','weapon','region','biome','time','weather','active-chunks','inventory-count','equipped','inventory-list','tool-status','zoom','crystals','message','pause','new-world','cycle-weapon','cycle-material','exit-build']){
  elements.set(id,new FakeElement());
}
globalThis.document={
  getElementById(id){ return elements.get(id)??null; },
  createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=()=>0;

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();

for(let world=0;world<24;world++){
  if(world>0)game.newWorld();
  const player=game.state.player;
  const localX=((player.x%WORLD_WIDTH)+WORLD_WIDTH)%WORLD_WIDTH;
  if(localX!==Math.floor(WORLD_WIDTH*.5)){
    throw new Error(`World ${world} sky spawn was not horizontally centered: ${localX}.`);
  }
  if(!player.skySpawn||player.grounded){
    throw new Error(`World ${world} did not begin as an airborne sky spawn.`);
  }
  if(game.systems.player.collides(player.x,player.y)){
    throw new Error(`World ${world} spawned the player inside a solid pixel.`);
  }

  for(let frame=0;frame<240&&!player.grounded;frame++){
    game.state.frame++;
    game.systems.player.update();
  }
  if(!player.grounded||player.skySpawn){
    throw new Error(`World ${world} did not complete its sky-drop landing.`);
  }
  if(!game.systems.player.groundProbeAt(player.x,player.y)){
    throw new Error(`World ${world} did not land on solid support.`);
  }
}

const rendererSource=fs.readFileSync(new URL('../src/render/renderer.js',import.meta.url),'utf8');
const collisionSource=fs.readFileSync(new URL('../src/systems/player-system.js',import.meta.url),'utf8');
if(!rendererSource.includes('playerPixelBounds')||!collisionSource.includes('playerPixelBounds')){
  throw new Error('Rendering and collision are not using the shared player footprint.');
}

console.log('player spawn and sprite collision test passed',{worlds:24});
