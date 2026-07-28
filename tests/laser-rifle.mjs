import { LASER_RIFLE_CONFIG } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { WeaponId } from '../src/data/weapons.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=918273;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const messages=[];
const hud={update(){},showMessage(text){messages.push(text);}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud,{throwSeeds(){return false;}});

const surface=generator.surfaceAt(40);
Object.assign(state.player,{x:40,y:surface.ground-1,hp:100});
chunks.updateActiveNeighborhood();
state.weaponId=WeaponId.LASER_RIFLE;
state.input.pointerInside=true;
state.input.pointerDown=true;

const impactY=state.player.y-2;
for(let x=38;x<=80;x++)cells.setCell(x,impactY,M.AIR);
state.input.pointerX=75-state.world.camera.chunkX*360;
state.input.pointerY=impactY-state.world.camera.chunkY*210;

const waterX=58;
cells.setCell(waterX,impactY,M.WATER);
for(let frame=0;frame<Math.ceil(LASER_RIFLE_CONFIG.waterSteamHeat/(LASER_RIFLE_CONFIG.pixelHeatPerFrame-LASER_RIFLE_CONFIG.pixelHeatDecay))+2;frame++){
  state.frame++;
  weapons.updateContinuous();
}
if(cells.getCell(waterX,impactY)!==M.STEAM)throw new Error('Laser did not heat water into steam.');
if(state.entities.laserSparks.length===0)throw new Error('Laser contact produced no sparks.');
if(!state.laser.beam)throw new Error('Continuous laser beam state was not created.');
if(state.laser.hotPixels.length===0)throw new Error('Laser did not publish visibly heated pixels.');

state.input.pointerDown=false;
for(let frame=0;frame<20;frame++){state.frame++;weapons.updateContinuous();}

const woodX=60;
cells.setCell(waterX,impactY,M.AIR);
cells.setCell(woodX,impactY,M.WOOD);
state.input.pointerDown=true;
for(let frame=0;frame<Math.ceil(LASER_RIFLE_CONFIG.ignitionHeat/(LASER_RIFLE_CONFIG.pixelHeatPerFrame-LASER_RIFLE_CONFIG.pixelHeatDecay))+3;frame++){
  state.frame++;
  weapons.updateContinuous();
}
if(cells.getCell(woodX,impactY)!==M.FIRE)throw new Error('Laser did not ignite sustained-contact wood.');

// Clear a long beam and verify continuous damage to a creature before terrain.
for(let x=38;x<=80;x++)cells.setCell(x,impactY,M.AIR);
const chunk=chunks.getChunk(state.world.camera.chunkX,state.world.camera.chunkY,true);
const enemy={speciesId:'test',x:52,y:impactY,vx:0,vy:0,hp:20,maxHp:20,hit:0};
chunk.enemies.push(enemy);
const previousHp=enemy.hp;
state.frame++;
weapons.updateContinuous();
if(enemy.hp>=previousHp)throw new Error('Laser did not continuously damage an intersected creature.');

while(!state.laser.overheated){
  state.frame++;
  weapons.updateContinuous();
  if(state.frame>1000)throw new Error('Laser never overheated.');
}
if(state.laser.active||state.laser.beam)throw new Error('Overheated laser remained active.');
if(!messages.some(text=>text.toLowerCase().includes('overheated')))throw new Error('Laser overheat was not communicated.');

state.input.pointerDown=false;
while(state.laser.overheated){
  state.frame++;
  weapons.updateContinuous();
  if(state.frame>1400)throw new Error('Laser never cooled enough to unlock.');
}
if(state.laser.heat>LASER_RIFLE_CONFIG.overheatRelease)throw new Error('Laser unlocked above the configured release heat.');

console.log('laser rifle test passed',{sparks:state.entities.laserSparks.length,heat:state.laser.heat.toFixed(1)});
