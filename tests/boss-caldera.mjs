import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createProjectileSystem } from '../src/systems/projectile-system.js';
import { createBossSystem } from '../src/systems/boss-system.js';
import { bossRitualDefinition } from '../src/data/boss-rituals.db.js';
import { BossKind } from '../src/data/bosses.db.js';
import { MaterialId } from '../src/data/materials.db.js';

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
  const crops={ harvestAt(){ return false; }, throwSeeds(){ return false; }, eatProduce(){ return false; } };
  const weapons=createWeaponSystem(state,cells,chunks,noise,hud,crops);
  const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
  const projectileSystem=createProjectileSystem(state,cells,chunks,noise);
  const bossSystem=createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem);
  return {state,noise,generator,chunks,cells,weapons,playerSystem,projectileSystem,bossSystem,messages};
}

const h=createHarness(24681357);
const {state,generator,chunks,cells,projectileSystem,bossSystem}=h;

let descriptor=null;
for(let region=0;region<80&&!descriptor;region++)descriptor=generator.volcanoDescriptor(region);
if(!descriptor)throw new Error('Expected at least one volcano region in the search range.');

let surface=generator.surfaceAt(Math.round(descriptor.center+70));
Object.assign(state.player,{x:descriptor.center+70,y:surface.ground-1,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
chunks.updateActiveNeighborhood();

bossSystem.update();
if(state.entities.bosses.length!==0)throw new Error('The caldera boss spawned from biome entry alone.');
if(!state.ui.bossRitual?.title?.includes('CALDERA'))throw new Error('The caldera ritual was not communicated through the HUD.');

surface=generator.surfaceAt(Math.round(descriptor.center));
Object.assign(state.player,{x:descriptor.center,y:surface.ground-1,vx:0,vy:0,grounded:true});
chunks.updateActiveNeighborhood();
for(let oy=-10;oy<=10;oy+=4){
  for(let ox=-12;ox<=12;ox+=4){
    if(Math.abs(ox)+Math.abs(oy)>18)continue;
    cells.setCell(Math.round(state.player.x+ox),Math.round(state.player.y-2+oy),MaterialId.FIRE,120,{silent:true});
  }
}
const ritual=bossRitualDefinition(BossKind.CALDERA_TYRANT);
bossSystem.encounter(BossKind.CALDERA_TYRANT).ritualProgress=ritual.progressFrames-15;
state.frame=15;
bossSystem.update();
if(state.entities.bosses.length!==1)throw new Error('Expected the caldera ritual to summon the boss after sustained crater heat.');
if(state.entities.bosses[0].y>=0)throw new Error('The caldera boss did not enter from above the screen.');

let boss=state.entities.bosses[0];
let sawFightPhase=false;
let sawFireball=false;
for(let tick=0;tick<260;tick++){
  state.frame++;
  bossSystem.update();
  boss=state.entities.bosses[0];
  if(!boss)break;
  if(boss.phase==='fight')sawFightPhase=true;
  if(state.entities.bossFireballs.length>0){
    sawFireball=true;
    break;
  }
}

if(!sawFightPhase)throw new Error('The caldera boss never reached its hovering fight phase.');
if(!sawFireball)throw new Error('The caldera boss never launched a fireball burst.');

boss=state.entities.bosses[0];
const startingHp=boss.hp;
state.entities.bullets.push({
  x:boss.x-4,
  y:boss.y,
  vx:1.5,
  vy:0,
  life:12,
  pierce:1,
});
for(let tick=0;tick<12;tick++){
  state.frame++;
  projectileSystem.update();
}
if(state.entities.bosses[0].hp>=startingHp)throw new Error('Bullets did not damage the caldera boss.');

console.log('boss caldera test passed',{region:descriptor.regionIndex,hp:state.entities.bosses[0].hp});
