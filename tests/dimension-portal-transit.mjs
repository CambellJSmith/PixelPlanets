import { createGameState } from '../src/state/game-state.js';
import { createStructureSystem } from '../src/systems/structure-system.js';
import { DimensionId, dimensionDefinition } from '../src/data/dimensions.db.js';

const state=createGameState();
state.world.dimension=DimensionId.EARTH;
state.player.x=20;
state.player.y=45;
const cells={getCell(){return 0;},isSolid(){return false;}};
const chunks={
  chunkX(x){return Math.floor(x/360);},chunkY(y){return Math.floor(y/210);},
  updateActiveNeighborhood(){state.world.camera.chunkX=this.chunkX(state.player.x);state.world.camera.chunkY=this.chunkY(state.player.y);},
};
const generator={
  dimensionSpawnPoint(id){return {x:dimensionDefinition(id).spawnX??48,y:57};},
  rocketSiloDescriptor(){return {launchZone:{x:9999,y:9999,w:1,h:1}};},
};
const messages=[];
const hud={showMessage(text){messages.push(text);}};
const juice={screenFlash(){},shake(){},shockwave(){},burst(){},particle(){},hitStop(){},explosion(){}};
const system=createStructureSystem(state,cells,chunks,generator,hud,juice);

if(!system.openDimensionPortal(DimensionId.CLOCKWORK))throw new Error('Could not open Clockwork portal.');
const portal=state.world.dimensionPortal;
state.player.x=portal.x; state.player.y=portal.y;
system.update();
for(let i=0;i<25;i++)system.update();
if(state.world.dimension!==DimensionId.CLOCKWORK)throw new Error('Portal did not switch to Clockwork.');
if(!state.world.visitedDimensions.clockwork)throw new Error('Clockwork visit was not recorded.');
state.player.x=123; state.player.y=66;
state.world.dimensionPositions.clockwork={x:123,y:66};
if(!system.openDimensionPortal(DimensionId.EARTH))throw new Error('Could not open Earth return portal.');
state.player.x=state.world.dimensionPortal.x;state.player.y=state.world.dimensionPortal.y;
system.update();
for(let i=0;i<25;i++)system.update();
if(state.world.dimension!==DimensionId.EARTH)throw new Error('Homeward portal did not return to Earth.');
if(state.player.x!==20||state.player.y!==45)throw new Error(`Earth return position was not restored: ${state.player.x},${state.player.y}`);
if(!messages.some(text=>text.includes('Clockwork Expanse')))throw new Error('Dimension portal messages did not name the destination.');
console.log('dimension portal transit test passed',{returned:[state.player.x,state.player.y]});
