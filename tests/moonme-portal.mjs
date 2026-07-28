import { createGameState } from '../src/state/game-state.js';
import { createInputSystem } from '../src/systems/input-system.js';
import { createStructureSystem } from '../src/systems/structure-system.js';

const state=createGameState();
state.player.x=20;
state.player.y=45;

const cells={
  getCell(){ return 0; },
  isSolid(){ return false; },
};
let neighborhoodUpdates=0;
const chunks={
  chunkX(x){ return Math.floor(x/360); },
  chunkY(y){ return Math.floor(y/210); },
  updateActiveNeighborhood(){
    state.world.camera.chunkX=this.chunkX(state.player.x);
    state.world.camera.chunkY=this.chunkY(state.player.y);
    neighborhoodUpdates++;
  },
};
const generator={
  isMoonWorld(){ return state.world.dimension==='moon'; },
  moonSpawnPoint(){ return {x:48,y:57}; },
  rocketSiloDescriptor(){ return {launchZone:{x:9000,y:9000,w:1,h:1}}; },
};
const messages=[];
const hud={showMessage(text){ messages.push(text); }};
const juice={
  screenFlash(){},shake(){},shockwave(){},burst(){},particle(){},hitStop(){},explosion(){},
};
const structures=createStructureSystem(state,cells,chunks,generator,hud,juice);

const canvas={
  width:360,height:210,
  listeners:new Map(),
  addEventListener(type,handler){ this.listeners.set(type,handler); },
  getBoundingClientRect(){ return {left:0,top:0,width:360,height:210}; },
};
const windowListeners=new Map();
globalThis.window={addEventListener(type,handler){ windowListeners.set(type,handler); }};

const noop=()=>{};
const input=createInputSystem(state,canvas,{
  openMoonPortal:structures.openMoonPortal,
  saveWorld:noop,loadWorld:noop,togglePause:noop,cycleWeapon:noop,cycleMaterial:noop,
  equipMaterial:noop,equipSeed:noop,eatProduce:noop,eatLoot:noop,exitBuildMode:noop,
  releaseJump:noop,attack:noop,updateHud:noop,refreshSaveSlots:noop,
});
input.install();
const keydown=windowListeners.get('keydown');
if(!keydown)throw new Error('Input system did not install keydown listener.');

for(const character of 'MoonMe')keydown({key:character,repeat:false,preventDefault(){}});
const portal=state.world.moonPortal;
if(!portal.active||portal.phase!=='open')throw new Error('Typing MoonMe did not open a portal.');
if(state.ui.worldMenuOpen)throw new Error('MoonMe sequence accidentally opened the world menu.');
if(!messages.some(message=>message.includes('lunar portal')))throw new Error('Portal opening was not communicated.');

state.player.x=portal.x;
state.player.y=portal.y;
structures.update();
if(portal.phase!=='transit'||!state.player.locked)throw new Error('Touching the portal did not begin transit.');
for(let frame=0;frame<25;frame++)structures.update();
if(!state.world.moonReached)throw new Error('Portal transit did not mark the moon as reached.');
if(state.world.dimension!=='moon')throw new Error('Portal did not switch to the moon dimension.');
if(state.player.x!==48)throw new Error('Portal did not use moon-local coordinates.');
if(state.player.locked)throw new Error('Player remained locked after portal arrival.');
if(neighborhoodUpdates<1)throw new Error('Portal travel did not refresh active chunks.');

console.log('MoonMe portal test passed',{portalX:portal.x,moonX:state.player.x,updates:neighborhoodUpdates});
