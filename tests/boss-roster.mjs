import fs from 'node:fs';
import { BOSS_KINDS, BossKind, bossDefinition } from '../src/data/bosses.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createBossSystem } from '../src/systems/boss-system.js';

const expected=[
  BossKind.CALDERA_TYRANT,
  BossKind.SEA_SERPENT,
  BossKind.FROST_COLOSSUS,
  BossKind.BOG_LEVIATHAN,
  BossKind.MYCELIAL_MONARCH,
  BossKind.BAMBOO_WAR_MACHINE,
  BossKind.CANOPY_WYRM,
  BossKind.CRYSTAL_BURROWER,
  BossKind.MAGMA_BEHEMOTH,
  BossKind.STORM_ROC,
  BossKind.MOON_STALKER,
  BossKind.DROWNED_FLEET,
  BossKind.SKY_JELLYFISH,
  BossKind.WORLD_EATER,
];

if(BOSS_KINDS.length!==expected.length)throw new Error(`Expected ${expected.length} registered bosses, received ${BOSS_KINDS.length}.`);
for(const kind of expected){
  const definition=bossDefinition(kind);
  if(!definition)throw new Error(`Missing boss definition for ${kind}.`);
  if(definition.maxHealth<300||definition.width<13||definition.height<9)throw new Error(`${kind} is not configured as a large boss.`);
  if(definition.reward<=0)throw new Error(`${kind} has no crystal reward.`);
}

const state=createGameState();
state.seed=731925;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const hud={update(){},showMessage(){}};
const crops={harvestAt(){return false;},throwSeeds(){return false;},eatProduce(){return false;}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud,crops);
const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
const bosses=createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem);
const surface=generator.surfaceAt(36);
Object.assign(state.player,{x:36,y:surface.ground,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
chunks.updateActiveNeighborhood();

const attackKinds=[];
for(const kind of expected){
  state.entities.explosions.length=0;
  const rewardBefore=state.crystals;
  const boss=bosses.spawnBossForTest(kind);
  if(!boss||boss.kind!==kind)throw new Error(`Could not force-spawn ${kind}.`);

  let reachedFight=boss.phase==='fight';
  for(let tick=0;tick<320&&!reachedFight;tick++){
    state.frame++;
    bosses.update();
    const active=state.entities.bosses[0];
    if(!active)break;
    reachedFight=active.phase==='fight';
  }
  if(!reachedFight)throw new Error(`${kind} never completed its entry sequence.`);

  const active=state.entities.bosses[0];
  active.attackTimer=0;
  const effectsBefore=state.entities.explosions.length;
  state.frame++;
  bosses.update();
  const attacked=(state.entities.bosses[0]?.attackTimer??0)>0||
    state.entities.bossFireballs.length>0||
    state.entities.serpentProjectiles.length>0||
    state.entities.bossProjectiles.length>0||
    state.entities.explosions.length>effectsBefore;
  if(!attacked)throw new Error(`${kind} never produced its signature attack.`);
  attackKinds.push(kind);

  state.entities.bosses[0].hp=0;
  state.frame++;
  bosses.update();
  if(state.entities.bosses.length!==0)throw new Error(`${kind} remained active after defeat.`);
  if(!bosses.encounter(kind).defeated)throw new Error(`${kind} defeat state was not persisted.`);
  if(state.crystals<=rewardBefore)throw new Error(`${kind} did not award crystals.`);
}

const rendererSource=fs.readFileSync(new URL('../src/render/renderer.js',import.meta.url),'utf8');
for(const kind of expected){
  if(kind===BossKind.CALDERA_TYRANT)continue;
  if(!rendererSource.includes(`'${kind}'`)&&!rendererSource.includes(`kind==='${kind}'`)){
    throw new Error(`Renderer has no pixel-art dispatch for ${kind}.`);
  }
}
if(!rendererSource.includes('drawBossSprite'))throw new Error('Caldera boss pixel-art renderer is missing.');
if(!rendererSource.includes('state.entities.bossProjectiles'))throw new Error('Generic boss projectiles are not rendered.');

console.log('complete boss roster test passed',{bosses:expected.length,attacks:attackKinds.length,reward:state.crystals});
