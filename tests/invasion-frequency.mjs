import { ENEMY_BEHAVIOR_CONFIG as C } from '../src/config.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createEnemySystem } from '../src/systems/enemy-system.js';

const MINUTE=60*60;
if(C.invasionPortalInitialMinFrames<6*MINUTE)throw new Error('First natural invasion is still too common.');
if(C.invasionPortalInitialMaxFrames<10*MINUTE)throw new Error('Initial invasion window is too short.');
if(C.invasionPortalMinFrames<12*MINUTE)throw new Error('Repeat invasion cooldown is still too short.');
if(C.invasionPortalMaxFrames<20*MINUTE)throw new Error('Repeat invasion maximum is still too short.');
if(C.maxInvasionPortals!==1)throw new Error('More than one unstable invasion rift can still be active.');

const state=createGameState();
state.seed=0x71f7;
Object.assign(state.player,{x:25,y:50,skySpawn:false,locked:false});
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
chunks.updateActiveNeighborhood();
const playerSystem={damage(){}};
const crops={spawnLootPickup(){return null;}};
const hud={update(){},showMessage(){}};
const juice={burst(){},shockwave(){},worldFlash(){},screenFlash(){},impact(){},enemyDeath(){}};
const enemies=createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud,juice);

if(state.world.nextInvasionFrame!==null)throw new Error('New worlds should defer initial invasion scheduling to the rare-event scheduler.');
enemies.update();
const initialDelay=state.world.nextInvasionFrame-state.frame;
if(initialDelay<C.invasionPortalInitialMinFrames||initialDelay>C.invasionPortalInitialMaxFrames){
  throw new Error(`Initial invasion scheduled outside rare window: ${initialDelay}.`);
}

state.frame=state.world.nextInvasionFrame;
enemies.update();
if(state.world.invasionCount!==1)throw new Error('Natural invasion did not increment the invasion count.');
const repeatDelay=state.world.nextInvasionFrame-state.frame;
if(repeatDelay<C.invasionPortalMinFrames||repeatDelay>C.invasionPortalMaxFrames){
  throw new Error(`Repeat invasion scheduled outside rare window: ${repeatDelay}.`);
}
if(state.entities.invasionPortals.length!==1)throw new Error('Natural invasion did not create exactly one portal.');

console.log('rare invasion frequency test passed',{
  firstMinutes:[C.invasionPortalInitialMinFrames/MINUTE,C.invasionPortalInitialMaxFrames/MINUTE],
  repeatMinutes:[C.invasionPortalMinFrames/MINUTE,C.invasionPortalMaxFrames/MINUTE],
  maxPortals:C.maxInvasionPortals,
});
