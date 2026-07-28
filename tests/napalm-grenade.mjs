import { GRENADE_CONFIG, NAPALM_CONFIG } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createProjectileSystem } from '../src/systems/projectile-system.js';
import { createEnemySystem } from '../src/systems/enemy-system.js';
import { createMaterialSystem } from '../src/systems/material-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=74291;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const hud={update(){},showMessage(){}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud);
const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
const projectileSystem=createProjectileSystem(state,cells,chunks,noise);
const enemySystem=createEnemySystem(state,cells,chunks,playerSystem);
const materialSystem=createMaterialSystem(state,cells,noise);

const startSurface=generator.surfaceAt(24);
Object.assign(state.player,{x:24,y:startSurface.ground-1,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
chunks.updateActiveNeighborhood();

// Standing in raw napalm is inert.
const playerNapalmX=Math.floor(state.player.x);
const playerNapalmY=Math.floor(state.player.y-2);
cells.setCell(playerNapalmX,playerNapalmY,M.NAPALM);
playerSystem.update();
if(state.player.hp!==100)throw new Error('Raw napalm damaged the player.');
cells.setCell(playerNapalmX,playerNapalmY,M.AIR);

// Raw napalm under an enemy neither damages nor starts burning it.
const currentChunk=chunks.getChunk(state.world.camera.chunkX,state.world.camera.chunkY,true);
const enemy={x:54,y:36,vx:0,vy:0,hp:30,phase:0,hit:0,burning:0};
currentChunk.enemies.push(enemy);
cells.setCell(54,36,M.NAPALM);
enemySystem.update();
if(enemy.hp!==30)throw new Error('Raw napalm damaged an enemy.');
if(enemy.burning!==0)throw new Error('Raw napalm ignited an enemy without fire.');

// A direct unignited napalm droplet impact is also harmless.
enemy.x=60;
enemy.y=30;
enemy.vx=0;
enemy.vy=0;
enemy.hp=30;
enemy.burning=0;
cells.setCell(60,30,M.AIR);
state.entities.napalmShots.push({x:60,y:30,vx:0,vy:0,life:10});
projectileSystem.update();
if(enemy.hp!==30)throw new Error('A raw napalm projectile dealt contact damage.');
if(enemy.burning!==0)throw new Error('A raw napalm projectile directly applied burning.');

// Napalm behaves like water while airborne.
const flowX=70;
const flowY=25;
for(let y=flowY;y<=flowY+4;y++)cells.setCell(flowX,y,M.AIR);
cells.setCell(flowX,flowY,M.NAPALM);
materialSystem.update();
if(cells.getCell(flowX,flowY+1)!==M.NAPALM){
  throw new Error('Napalm did not flow downward like water.');
}

// Once a flowing pixel reaches any solid surface it adheres and stops moving.
const stickX=76;
const stickY=24;
for(let y=stickY;y<=stickY+4;y++)cells.setCell(stickX,y,M.AIR);
cells.setCell(stickX,stickY+2,M.ROCK);
cells.setCell(stickX,stickY,M.NAPALM);
materialSystem.update();
if(cells.getCell(stickX,stickY+1)!==M.NAPALM){
  throw new Error('Napalm did not reach the solid surface.');
}
if(cells.getLife(stickX,stickY+1)!==1){
  throw new Error('Napalm did not mark itself as stuck after touching a solid.');
}
cells.setCell(stickX-1,stickY+1,M.AIR);
cells.setCell(stickX+1,stickY+1,M.AIR);
materialSystem.update();
if(cells.getCell(stickX,stickY+1)!==M.NAPALM){
  throw new Error('Stuck napalm slid away from the solid surface.');
}

// Fire or lava contact bypasses the one-second timer.
const fireIgnitionX=80;
const fireIgnitionY=24;
cells.setCell(fireIgnitionX,fireIgnitionY,M.NAPALM);
cells.setCell(fireIgnitionX+1,fireIgnitionY,M.FIRE,40);
materialSystem.update();
if(cells.getCell(fireIgnitionX,fireIgnitionY)!==M.FIRE){
  throw new Error('Napalm touching fire did not ignite immediately.');
}

const lavaIgnitionX=84;
const lavaIgnitionY=24;
cells.setCell(lavaIgnitionX,lavaIgnitionY,M.NAPALM);
cells.setCell(lavaIgnitionX+1,lavaIgnitionY,M.LAVA);
materialSystem.update();
if(cells.getCell(lavaIgnitionX,lavaIgnitionY)!==M.FIRE){
  throw new Error('Napalm touching lava did not ignite immediately.');
}

// A sprayed droplet sticks in the open cell immediately beside a wall.
const wallX=92;
const wallY=28;
for(let x=wallX-4;x<=wallX;x++)cells.setCell(x,wallY,M.AIR);
cells.setCell(wallX,wallY,M.ROCK);
state.entities.napalmShots.push({x:wallX-3.2,y:wallY+.1,vx:3.5,vy:0,life:10});
projectileSystem.update();
let stuckShotFound=false;
for(let x=wallX-3;x<wallX;x++){
  if(cells.getCell(x,wallY)===M.NAPALM&&cells.getLife(x,wallY)===1){
    stuckShotFound=true;
    break;
  }
}
if(!stuckShotFound)throw new Error('A napalm projectile did not stick beside the solid pixel it hit.');

// Every particle remains inert for one second, then automatically ignites.
const ignitionX=74;
const ignitionY=30;
cells.setCell(ignitionX,ignitionY+1,M.ROCK);
cells.setCell(ignitionX-1,ignitionY,M.ROCK);
cells.setCell(ignitionX+1,ignitionY,M.ROCK);
cells.setCell(ignitionX,ignitionY,M.NAPALM);
const updatesBeforeIgnition=Math.ceil(NAPALM_CONFIG.ignitionFrames/NAPALM_CONFIG.simulationStepFrames)-1;
for(let i=0;i<updatesBeforeIgnition;i++)materialSystem.update();
if(cells.getCell(ignitionX,ignitionY)!==M.NAPALM){
  throw new Error('Napalm ignited before one second elapsed.');
}
materialSystem.update();
if(cells.getCell(ignitionX,ignitionY)!==M.FIRE){
  throw new Error('Napalm did not automatically ignite after one second.');
}

// A grenade removes solid cells in a circular blast and creates fire, but
// applies no hidden direct damage to actors.
const blastX=82;
const blastY=42;
for(let y=blastY-GRENADE_CONFIG.blastRadius;y<=blastY+GRENADE_CONFIG.blastRadius;y++){
  for(let x=blastX-GRENADE_CONFIG.blastRadius;x<=blastX+GRENADE_CONFIG.blastRadius;x++){
    if((x-blastX)**2+(y-blastY)**2<=GRENADE_CONFIG.blastRadius**2){
      cells.setCell(x,y,M.ROCK);
    }
  }
}

enemy.x=blastX;
enemy.y=blastY;
enemy.vx=0;
enemy.vy=0;
enemy.hp=30;
enemy.burning=0;
state.entities.grenades.push({x:blastX,y:blastY,vx:0,vy:0,fuse:1,rotation:0});
projectileSystem.update();

if(state.entities.grenades.length!==0)throw new Error('Grenade did not detonate at the end of its fuse.');
for(const [dx,dy] of [[0,0],[3,0],[-3,0],[0,3],[0,-3]]){
  if(cells.isSolid(cells.getCell(blastX+dx,blastY+dy))){
    throw new Error(`Grenade failed to clear blast cell ${dx},${dy}.`);
  }
}

let fireCount=0;
for(let y=blastY-GRENADE_CONFIG.fireRadius;y<=blastY+GRENADE_CONFIG.fireRadius;y++){
  for(let x=blastX-GRENADE_CONFIG.fireRadius;x<=blastX+GRENADE_CONFIG.fireRadius;x++){
    if(cells.getCell(x,y)===M.FIRE)fireCount++;
  }
}
if(fireCount===0)throw new Error('Grenade created no fire burst.');
if(enemy.hp!==30)throw new Error('Grenade applied direct damage instead of relying on fire.');
if(cells.getCell(Math.floor(enemy.x),Math.floor(enemy.y))!==M.FIRE){
  throw new Error('Grenade did not place damaging fire at a nearby enemy position.');
}

console.log('napalm and grenade test passed',{fireCount});
