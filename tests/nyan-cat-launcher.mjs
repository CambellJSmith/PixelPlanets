import { NYAN_CAT_CONFIG } from '../src/config.js';
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
state.seed=4242001;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const messages=[];
const hud={update(){},showMessage(text){messages.push(String(text));}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud,{throwSeeds(){return false;}});
const projectiles=createProjectileSystem(state,cells,chunks,noise);

const surface=generator.surfaceAt(44);
Object.assign(state.player,{x:44,y:surface.ground-1,hp:100});
chunks.updateActiveNeighborhood();
state.weaponId=WeaponId.NYAN_CAT_LAUNCHER;
state.input.pointerInside=true;
const fireY=state.player.y-2;
for(let x=40;x<=90;x++)for(let y=fireY-4;y<=fireY+4;y++)cells.setCell(x,y,M.AIR);
state.input.pointerX=82-state.world.camera.chunkX*360;
state.input.pointerY=fireY-state.world.camera.chunkY*210;

const wallX=70;
for(let y=fireY-3;y<=fireY+3;y++)cells.setCell(wallX,y,M.ROCK);
weapons.attack();
if(state.entities.nyanCats.length!==1)throw new Error('Nyan Cat launcher did not create a projectile.');
if(state.cooldown!==NYAN_CAT_CONFIG.cooldown)throw new Error('Nyan Cat launcher cooldown does not match configuration.');
if(!messages.some(text=>text.includes('NYAN CAT')))throw new Error('Nyan Cat launch was not communicated.');

let bounced=false;
let preBounceSpeed=0;
for(let frame=0;frame<90&&state.entities.nyanCats.length;frame++){
  const cat=state.entities.nyanCats[0];
  preBounceSpeed=Math.max(preBounceSpeed,Math.hypot(cat.vx,cat.vy));
  state.frame++;
  projectiles.update();
  const remaining=state.entities.nyanCats[0];
  if(remaining&&(remaining.bounces??0)>0&&remaining.vx<0){
    bounced=true;
    const retainedSpeed=Math.hypot(remaining.vx,remaining.vy);
    if(retainedSpeed<NYAN_CAT_CONFIG.minimumMomentum-.01){
      throw new Error(`Nyan Cat lost continuous momentum after bouncing: ${retainedSpeed}.`);
    }
    break;
  }
}
if(!bounced)throw new Error('Nyan Cat did not bounce from terrain.');
if(state.entities.nyanCats.length!==1)throw new Error('Nyan Cat detonated on its first terrain contact instead of bouncing.');
if(state.entities.nyanSparks.length===0)throw new Error('Nyan Cat bounce produced no rainbow sparks.');
state.entities.nyanCats[0].life=1;
state.frame++;
projectiles.update();
if(state.entities.nyanCats.length!==0)throw new Error('Nyan Cat did not detonate after its life expired.');
if(!state.entities.explosions.some(effect=>effect.kind==='nyan'))throw new Error('Nyan Cat produced no rainbow explosion effect.');
if(state.entities.nyanSparks.length>NYAN_CAT_CONFIG.maxSparks)throw new Error('Nyan spark population exceeded its performance cap.');
const impactTypes=[];
for(let y=fireY-2;y<=fireY+2;y++)impactTypes.push(cells.getCell(Math.round(state.entities.explosions.at(-1).x),y));

// Verify direct boss contact causes meaningful damage and detonates immediately.
for(let x=40;x<=90;x++)for(let y=fireY-4;y<=fireY+4;y++)cells.setCell(x,y,M.AIR);
state.entities.explosions.length=0;
state.entities.nyanSparks.length=0;
state.cooldown=0;
const boss={x:61,y:fireY,width:13,height:9,hp:300,maxHp:300,hit:0,vx:0,vy:0};
state.entities.bosses.push(boss);
weapons.attack();
for(let frame=0;frame<30&&state.entities.nyanCats.length;frame++){
  state.frame++;
  projectiles.update();
}
if(boss.hp>=300)throw new Error('Nyan Cat did not damage a boss.');
if(state.entities.nyanCats.length!==0)throw new Error('Nyan Cat did not detonate on boss contact.');

console.log('nyan cat launcher test passed',{
  bossDamage:300-boss.hp,
  sparks:state.entities.nyanSparks.length,
  impactTypes,
  bounced,
  preBounceSpeed:Number(preBounceSpeed.toFixed(2)),
});
