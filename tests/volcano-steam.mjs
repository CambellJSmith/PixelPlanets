import { STEAM_CONFIG } from '../src/config.js';
import { BiomeId } from '../src/data/biomes.db.js';
import { MaterialId } from '../src/data/materials.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createMaterialSystem } from '../src/systems/material-system.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createEnemySystem } from '../src/systems/enemy-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=74291;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);

let volcanoRegion=null;
for(let region=-30;region<=30;region++){
  if(generator.regionBiomeId(region)===BiomeId.VOLCANO){
    volcanoRegion=region;
    break;
  }
}
if(volcanoRegion===null)throw new Error('Could not find a volcano region for the test seed.');

const descriptor=generator.volcanoDescriptor(volcanoRegion);
if(!descriptor)throw new Error('Volcano descriptor was not generated.');
const center=Math.round(descriptor.center);
const centerSurface=generator.surfaceAt(center);
const rimX=Math.round(descriptor.center+descriptor.calderaRadius*.9);
const rimSurface=generator.surfaceAt(rimX);
if(centerSurface.ground<rimSurface.ground+5){
  throw new Error(`Volcano caldera was not substantially deeper than its rim: ${centerSurface.ground} vs ${rimSurface.ground}.`);
}

const lavaTop=centerSurface.ground-8;
if(generator.generatedMaterial(center,lavaTop)!==M.LAVA||generator.generatedMaterial(center,centerSurface.ground-1)!==M.LAVA){
  throw new Error('Volcano caldera did not contain a surface lava lake.');
}

const conduitY=Math.round(centerSurface.ground+descriptor.chamberDepth*.45);
let conduitLava=0;
for(let x=center-14;x<=center+14;x++){
  if(generator.generatedMaterial(x,conduitY)===M.LAVA)conduitLava++;
}
if(conduitLava<Math.floor(descriptor.conduitRadius*1.5)){
  throw new Error(`Volcano conduit was missing or too narrow: ${conduitLava} lava cells.`);
}

const chamberCenterY=centerSurface.ground+descriptor.chamberDepth;
const chamberTestX=Math.round(descriptor.center+descriptor.chamberRadiusX*.42);
const chamberAirY=Math.round(chamberCenterY-descriptor.chamberRadiusY*.55);
const chamberLavaY=Math.round(chamberCenterY+descriptor.chamberRadiusY*.28);
if(generator.generatedMaterial(chamberTestX,chamberAirY)!==M.AIR){
  throw new Error('Upper magma chamber was not an open cavern.');
}
if(generator.generatedMaterial(chamberTestX,chamberLavaY)!==M.LAVA){
  throw new Error('Lower magma chamber was not filled with lava.');
}

const chunks=createChunkManager(state,generator);
Object.assign(state.player,{x:30,y:40,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
chunks.updateActiveNeighborhood();
const cells=createCellAccess(state,chunks,noise);
const materials=createMaterialSystem(state,cells,noise);

const fireX=70;
const fireY=38;
cells.setCell(fireX,fireY,M.FIRE,80);
cells.setCell(fireX,fireY-1,M.ROCK);
cells.setCell(fireX+1,fireY,M.SNOW);
cells.setCell(fireX-1,fireY,M.WATER);
materials.updateFire(fireX,fireY);
if(cells.getCell(fireX+1,fireY)!==M.WATER)throw new Error('Fire did not melt nearby snow into water.');
if(cells.getCell(fireX-1,fireY)!==M.STEAM)throw new Error('Fire did not boil nearby water into steam.');
if(cells.getLife(fireX-1,fireY)!==STEAM_CONFIG.lifeFrames)throw new Error('Steam lifetime was not initialized.');

const hud={update(){},showMessage(){}};
const weapons={attack(){}};
const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud);
const playerX=30;
const playerY=40;
Object.assign(state.player,{x:playerX,y:playerY,vx:0,vy:0,hp:100,grounded:true,invulnerability:0});
cells.setCell(playerX,playerY,M.ROCK);
cells.setCell(playerX,playerY-2,M.STEAM,STEAM_CONFIG.lifeFrames);
playerSystem.update();
if(state.player.hp>=100)throw new Error('Steam did not damage the player.');

const enemySystem=createEnemySystem(state,cells,chunks,playerSystem);
const enemyChunk=chunks.getChunk(0,0,true);
const enemy={x:120,y:32,vx:0,vy:0,hp:30,phase:0,hit:0,burning:0};
enemyChunk.enemies.push(enemy);
cells.setCell(120,32,M.STEAM,STEAM_CONFIG.lifeFrames);
const enemyHealth=enemy.hp;
enemySystem.update();
if(enemy.hp>=enemyHealth)throw new Error('Steam did not damage an enemy.');
if(enemy.burning!==0)throw new Error('Steam incorrectly ignited the enemy.');

console.log('volcano caldera, magma chamber, and steam reaction test passed',{
  volcanoRegion,
  calderaRadius:descriptor.calderaRadius,
  conduitLava,
  chamberDepth:descriptor.chamberDepth,
});
