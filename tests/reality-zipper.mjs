import { REALITY_ZIPPER_CONFIG } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { WeaponId } from '../src/data/weapons.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createProjectileSystem } from '../src/systems/projectile-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=610246;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const messages=[];
const hud={update(){},showMessage(text){messages.push(String(text));}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud,{throwSeeds(){return false;}});
const projectiles=createProjectileSystem(state,cells,chunks,noise);

const surface=generator.surfaceAt(42);
Object.assign(state.player,{x:42,y:surface.ground-1,hp:100,vx:0,vy:0});
chunks.updateActiveNeighborhood();
state.weaponId=WeaponId.REALITY_ZIPPER;
state.input.pointerInside=true;
const lineY=state.player.y-2;
for(let x=38;x<=110;x++)for(let y=lineY-10;y<=lineY+10;y++)cells.setCell(x,y,M.AIR);
const rockX=66;
cells.setCell(rockX,lineY,M.ROCK);
state.input.pointerX=100-state.world.camera.chunkX*360;
state.input.pointerY=lineY-state.world.camera.chunkY*210;

weapons.attack();
if(state.entities.realityRifts.length!==1)throw new Error('Reality Zipper did not create a rift.');
if(state.cooldown!==REALITY_ZIPPER_CONFIG.cooldown)throw new Error('Reality Zipper cooldown does not match configuration.');
if(!messages.some(text=>text.includes('REALITY')))throw new Error('Reality Zipper activation was not communicated.');

state.frame++;
projectiles.update();
const rift=state.entities.realityRifts[0];
if(!rift.applied||rift.snapshot.length===0)throw new Error('Reality rift did not snapshot and open terrain.');
if(cells.getCell(rockX,lineY)!==M.AIR)throw new Error('Reality rift did not unzip the center terrain strip.');
const shiftedRock=[lineY-REALITY_ZIPPER_CONFIG.splitDistance,lineY+REALITY_ZIPPER_CONFIG.splitDistance]
  .some(y=>cells.getCell(rockX,y)===M.ROCK);
if(!shiftedRock)throw new Error('Reality rift did not shift terrain away from the tear.');
if(state.entities.realitySparks.length===0)throw new Error('Reality rift produced no psychedelic sparks.');

const chunk=chunks.getChunk(state.world.camera.chunkX,state.world.camera.chunkY,true);
for(const active of state.world.activeChunks)active.enemies.length=0;
const enemy={speciesId:'test',x:72,y:lineY,vx:0,vy:0,hp:30,maxHp:30,hit:0};
chunk.enemies.push(enemy);
state.entities.bullets.push({x:86,y:lineY,vx:.2,vy:0,life:50,pierce:3});
for(let frame=0;frame<REALITY_ZIPPER_CONFIG.pulseInterval+1;frame++){
  state.frame++;
  projectiles.update();
}
if(enemy.hp>=30)throw new Error('Reality field did not damage an enemy trapped near the tear.');
if(state.entities.bullets.length<2)throw new Error('Reality rift did not split a crossing projectile.');
if(rift.splitCount<1)throw new Error('Reality rift did not record projectile splitting.');

rift.life=1;
state.frame++;
projectiles.update();
if(state.entities.realityRifts.length!==0)throw new Error('Reality rift did not close after its life expired.');
if(cells.getCell(rockX,lineY)!==M.ROCK)throw new Error('Reality rift did not restore the original terrain.');
if(state.entities.realitySparks.length>REALITY_ZIPPER_CONFIG.maxSparks)throw new Error('Reality spark population exceeded its performance cap.');

console.log('reality zipper test passed',{
  snapshot:rift.snapshot.length,
  splitCount:rift.splitCount,
  enemyDamage:30-enemy.hp,
  sparks:state.entities.realitySparks.length,
});
