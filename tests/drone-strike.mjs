import { WORLD_WIDTH, WORLD_HEIGHT, DRONE_STRIKE_CONFIG } from '../src/config.js';
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

function createHarness(seed){
  const state=createGameState();
  state.seed=seed;
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const messages=[];
  const hud={
    update(){},
    showMessage(message){ messages.push(message); },
  };
  const weapons=createWeaponSystem(state,cells,chunks,noise,hud);
  const projectiles=createProjectileSystem(state,cells,chunks,noise);
  const surface=generator.surfaceAt(24);
  Object.assign(state.player,{x:24,y:surface.ground-1,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
  chunks.updateActiveNeighborhood();
  return{state,noise,generator,chunks,cells,weapons,projectiles,messages};
}

// Clear route: a drone must enter from a side edge in the upper half, launch a
// rocket, remove a large block circle, and leave a dense fire field.
{
  const h=createHarness(514229);
  const {state,cells,weapons,projectiles}=h;
  const originX=state.world.camera.chunkX*WORLD_WIDTH;
  const originY=state.world.camera.chunkY*WORLD_HEIGHT;
  const targetX=originX+102;
  const targetY=originY+76;

  for(let y=originY+3;y<=originY+Math.floor(WORLD_HEIGHT*.5);y++){
    for(let x=originX-DRONE_STRIKE_CONFIG.entryOutsideOffset;x<=originX+WORLD_WIDTH-1+DRONE_STRIKE_CONFIG.entryOutsideOffset;x++){
      cells.setCell(x,y,M.AIR);
    }
  }
  for(let y=targetY;y<=Math.min(originY+WORLD_HEIGHT-2,targetY+20);y++){
    for(let x=targetX-22;x<=targetX+22;x++)cells.setCell(x,y,M.ROCK);
  }

  state.input.pointerX=targetX-originX+.25;
  state.input.pointerY=targetY-originY-10;
  state.input.pointerInside=true;
  state.weaponId=WeaponId.DRONE_STRIKE;

  const preview=weapons.getDroneStrikePreview();
  if(!preview.valid)throw new Error(`Expected a valid drone route: ${preview.reason}`);
  if(preview.entryY-originY>WORLD_HEIGHT*.5)throw new Error('Drone entry was not in the upper half.');
  if(cells.getCell(preview.entryX,preview.entryY)!==M.AIR)throw new Error('Drone did not enter through an air block.');

  weapons.attack();
  if(state.entities.drones.length!==1)throw new Error('Valid strike did not summon a drone.');

  let sawRocket=false;
  let sawExplosion=false;
  for(let tick=0;tick<320;tick++){
    state.frame++;
    projectiles.update();
    if(state.entities.droneRockets.length>0)sawRocket=true;
    if(state.entities.explosions.some(effect=>effect.kind==='drone'))sawExplosion=true;
    if(sawExplosion&&state.entities.droneRockets.length===0)break;
  }

  if(!sawRocket)throw new Error('Drone never launched its rocket.');
  if(!sawExplosion)throw new Error('Drone rocket never exploded.');

  for(const [dx,dy] of [[0,0],[8,0],[-8,0],[0,8]]){
    if(cells.isSolid(cells.getCell(preview.x+dx,preview.y+dy))){
      throw new Error(`Drone rocket failed to clear blast cell ${dx},${dy}.`);
    }
  }

  let fireCount=0;
  for(let y=preview.y-DRONE_STRIKE_CONFIG.fireRadius;y<=preview.y+DRONE_STRIKE_CONFIG.fireRadius;y++){
    for(let x=preview.x-DRONE_STRIKE_CONFIG.fireRadius;x<=preview.x+DRONE_STRIKE_CONFIG.fireRadius;x++){
      if(cells.getCell(x,y)===M.FIRE)fireCount++;
    }
  }
  if(fireCount<80)throw new Error(`Drone strike fire field was too small (${fireCount}).`);
}

// Targeting always resolves to the highest visible solid pixel in the selected
// column. A cursor placed beneath terrain cannot select an underground cell.
{
  const h=createHarness(1346269);
  const {state,cells,weapons}=h;
  const originX=state.world.camera.chunkX*WORLD_WIDTH;
  const originY=state.world.camera.chunkY*WORLD_HEIGHT;
  const targetX=originX+118;
  const upperY=originY+28;
  const lowerY=originY+82;

  for(let y=originY+3;y<=originY+Math.floor(WORLD_HEIGHT*.5);y++){
    for(let x=originX-DRONE_STRIKE_CONFIG.entryOutsideOffset;x<=originX+WORLD_WIDTH-1+DRONE_STRIKE_CONFIG.entryOutsideOffset;x++){
      cells.setCell(x,y,M.AIR);
    }
  }
  for(let y=originY+1;y<lowerY;y++)cells.setCell(targetX,y,M.AIR);
  cells.setCell(targetX,upperY,M.ROCK);
  cells.setCell(targetX,lowerY,M.ROCK);

  state.input.pointerX=targetX-originX+.2;
  state.input.pointerY=lowerY-originY+.2;
  state.input.pointerInside=true;
  state.weaponId=WeaponId.DRONE_STRIKE;

  let preview=weapons.getDroneStrikePreview();
  if(preview.y!==upperY){
    throw new Error(`Underground drone target was not snapped to the highest pixel (${preview.y} instead of ${upperY}).`);
  }
  if(!preview.snapped)throw new Error('An underground cursor target was not marked as snapped.');

  state.input.pointerY=upperY-originY+.2;
  preview=weapons.getDroneStrikePreview();
  if(preview.y!==upperY)throw new Error('Directly pointing at the highest pixel changed the target.');
  if(preview.snapped)throw new Error('The directly pointed highest pixel was incorrectly marked as snapped.');

  cells.setCell(targetX,upperY,M.AIR);
  preview=weapons.getDroneStrikePreview();
  if(preview.y!==lowerY){
    throw new Error(`Removing the upper obstruction did not expose the next highest pixel (${preview.y} instead of ${lowerY}).`);
  }
}

// Blocked route: solidifying the whole upper half must prevent the drone from
// ever being created.
{
  const h=createHarness(832040);
  const {state,cells,weapons}=h;
  const originX=state.world.camera.chunkX*WORLD_WIDTH;
  const originY=state.world.camera.chunkY*WORLD_HEIGHT;
  const targetX=originX+90;
  const targetY=originY+72;

  for(let y=originY+1;y<=originY+Math.floor(WORLD_HEIGHT*.52);y++){
    for(let x=originX-DRONE_STRIKE_CONFIG.entryOutsideOffset;x<=originX+WORLD_WIDTH-1+DRONE_STRIKE_CONFIG.entryOutsideOffset;x++){
      cells.setCell(x,y,M.ROCK);
    }
  }
  for(let y=targetY;y<=originY+WORLD_HEIGHT-2;y++)cells.setCell(targetX,y,M.ROCK);

  state.input.pointerX=targetX-originX;
  state.input.pointerY=targetY-originY;
  state.input.pointerInside=true;
  state.weaponId=WeaponId.DRONE_STRIKE;

  const preview=weapons.getDroneStrikePreview();
  if(preview.valid)throw new Error('Blocked upper half incorrectly allowed a drone route.');
  weapons.attack();
  if(state.entities.drones.length!==0)throw new Error('A drone appeared without a valid air entry route.');
  if(state.entities.droneRockets.length!==0)throw new Error('A rocket appeared without a drone.');
}

console.log('drone strike test passed');
