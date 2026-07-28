import { WeaponId } from '../src/data/weapons.db.js';
import { BossKind } from '../src/data/bosses.db.js';
import { CROP_IDS } from '../src/data/crops.db.js';
import { listFractionalPositions, snapGamePositions } from '../src/pixel-grid.js';

class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(image){ this.lastImageData=image; }
  fillRect(){}
  clearRect(){}
  drawImage(){}
  getImageData(){ return this.createImageData(180,105); }
  set fillStyle(value){ this._fillStyle=value; }
}

class FakeElement {
  constructor(){
    this.textContent='';
    this.hidden=false;
    this.disabled=false;
    this.innerHTML='';
    this.listeners=new Map();
  }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
  closest(){ return null; }
}

class FakeCanvas extends FakeElement {
  constructor(){
    super();
    this.width=180;
    this.height=105;
    this.context=new FakeContext();
    this.style={};
  }
  getContext(){ return this.context; }
  getBoundingClientRect(){ return {left:0,top:0,width:720,height:420}; }
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
globalThis.window={ addEventListener(){} };
globalThis.requestAnimationFrame=()=>0;

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();
const {state,systems}=game;

function assertIntegerPositions(label){
  const failures=listFractionalPositions(state);
  if(failures.length)throw new Error(`${label} retained fractional coordinates: ${failures.slice(0,8).join(', ')}`);
}

assertIntegerPositions('world start');

systems.input.updatePointer({clientX:173.7,clientY:91.3});
if(!Number.isInteger(state.input.pointerX)||!Number.isInteger(state.input.pointerY)){
  throw new Error('Pointer input was not snapped immediately to the nearest canvas pixel.');
}

const startingX=state.player.x;
state.input.keys.add('d');
for(let frame=0;frame<120;frame++){
  state.frame++;
  systems.player.update();
  assertIntegerPositions(`player frame ${frame}`);
}
state.input.keys.delete('d');
if(state.player.x===startingX)throw new Error('Integer-only player motion failed to advance across pixels.');

state.input.pointerInside=true;
state.input.pointerX=Math.min(179,state.player.x-state.world.camera.chunkX*180+30);
state.input.pointerY=Math.max(0,state.player.y-state.world.camera.chunkY*105-10);

for(const weaponId of [WeaponId.GUN,WeaponId.NAPALM_SPRAYER,WeaponId.GLAIVE,WeaponId.HOOK,WeaponId.GRENADE]){
  state.weaponId=weaponId;
  state.cooldown=0;
  systems.weapons.attack();
  snapGamePositions(state);
  assertIntegerPositions(`weapon ${weaponId} spawn`);
  if(weaponId===WeaponId.HOOK){
    systems.weapons.updateHook();
    assertIntegerPositions('hook update');
    state.entities.hook.active=false;
  }
}

const cropId=CROP_IDS[0];
state.inventory.addSeed(cropId,4);
systems.crops.throwSeeds(cropId,{angle:-0.35});
systems.crops.spawnPickup('produce',cropId,state.player.x+2,state.player.y-3,2,1);
assertIntegerPositions('crop entity spawn');

systems.boss.spawnBossForTest(BossKind.FROST_COLOSSUS,{entry:'above'});
assertIntegerPositions('boss spawn');

for(let frame=0;frame<180;frame++){
  state.frame++;
  systems.projectiles.update();
  assertIntegerPositions(`projectiles frame ${frame}`);
  systems.enemies.update();
  assertIntegerPositions(`enemies frame ${frame}`);
  systems.boss.update();
  assertIntegerPositions(`boss frame ${frame}`);
  systems.crops.update();
  assertIntegerPositions(`crops frame ${frame}`);
}

// The normalizer must also remove fractions introduced by any future system
// before another system or renderer can observe them.
state.entities.bullets.push({x:12.49,y:9.51,vx:0,vy:0,life:1,pierce:1,targetX:7.7,targetY:8.2});
snapGamePositions(state);
assertIntegerPositions('global normalization');

console.log('integer-grid position test passed',{
  player:[state.player.x,state.player.y],
  pointer:[state.input.pointerX,state.input.pointerY],
});
