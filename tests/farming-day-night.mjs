import { DAY_NIGHT_CONFIG, FARM_CONFIG } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { CropId } from '../src/data/crops.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createCropSystem } from '../src/systems/crop-system.js';
import { createTimeSystem } from '../src/systems/time-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=918273;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);

let x=20;
let surface=generator.surfaceAt(x);
while(surface.lake){
  x+=9;
  surface=generator.surfaceAt(x);
}
Object.assign(state.player,{x,y:surface.ground-1});
chunks.updateActiveNeighborhood();
const cells=createCellAccess(state,chunks,noise);
const hud={update(){},showMessage(){}};
const crops=createCropSystem(state,cells,chunks,noise,hud);

const testX=Math.floor(x)+8;
const testGround=surface.ground;
cells.setCell(testX,testGround-1,M.GRASS,0,{silent:true});
cells.setCell(testX,testGround-2,M.AIR,0,{silent:true});
const beforeDrops=state.entities.pickups.length;
cells.setCell(testX,testGround-1,M.FIRE,40,{reason:'fire'});
if(state.entities.pickups.length!==beforeDrops+1)throw new Error('Destroyed grass did not create a seed pickup.');
if(state.entities.pickups.at(-1)?.kind!=='seed')throw new Error('Grass drop was not a seed.');

const plantX=testX+10;
const plantY=testGround-1;
cells.setCell(plantX,plantY,M.AIR,0,{silent:true});
cells.setCell(plantX,plantY+1,M.DIRT,0,{silent:true});
const plant=crops.plantSeed(CropId.TOMATO,plantX,plantY,0);
if(!plant)throw new Error('Seed did not embed in prepared soil.');
state.frame=FARM_CONFIG.growFrames-1;
crops.updatePlants();
if(plant.mature)throw new Error('Crop matured before a complete day/night cycle elapsed.');
state.frame=FARM_CONFIG.growFrames;
crops.updatePlants();
if(!plant.mature)throw new Error('Crop did not mature over one complete day/night cycle.');
const fruitCell=plant.cells.find(cell=>cells.getCell(cell.x,cell.y)===M.CROP_FRUIT);
if(!fruitCell)throw new Error('Mature crop did not grow produce cells.');

const pickupStart=state.entities.pickups.length;
cells.setCell(fruitCell.x,fruitCell.y,M.AIR,0,{reason:'harvest-test'});
if(state.world.plants.has(plant.id))throw new Error('Broken mature crop remained registered.');
const harvestDrops=state.entities.pickups.slice(pickupStart);
if(!harvestDrops.some(drop=>drop.kind==='produce'&&drop.cropId===CropId.TOMATO)){
  throw new Error('Mature crop did not drop matching produce.');
}
if(!harvestDrops.some(drop=>drop.kind==='seed'&&drop.cropId===CropId.TOMATO)){
  throw new Error('Mature crop did not drop matching seeds.');
}

state.inventory.addSeed(CropId.CORN,10);
const particlesBefore=state.entities.seedParticles.length;
const thrown=crops.throwSeeds(CropId.CORN,{angle:-.4});
if(!thrown)throw new Error('Equipped crop seeds could not be thrown.');
if(state.entities.seedParticles.length-particlesBefore!==FARM_CONFIG.seedScatterCount){
  throw new Error('Seed throw did not create the configured pixel scatter.');
}
if(state.inventory.seedCount(CropId.CORN)!==3)throw new Error('Seed scatter did not consume the thrown seeds.');

const time=createTimeSystem(state);
state.frame=0;
if(!time.getTime().isDay)throw new Error('Cycle did not begin during daytime.');
state.frame=DAY_NIGHT_CONFIG.dayFrames-1;
if(!time.getTime().isDay)throw new Error('Daytime ended before 15 minutes.');
state.frame=DAY_NIGHT_CONFIG.dayFrames;
if(time.getTime().isDay)throw new Error('Night did not begin after 15 minutes.');
state.frame=DAY_NIGHT_CONFIG.dayFrames+DAY_NIGHT_CONFIG.nightFrames;
const nextDay=time.getTime();
if(!nextDay.isDay||nextDay.dayNumber!==2)throw new Error('Five-minute night did not roll into the next day.');

console.log('farming and day-night test passed',{
  crops:12,
  growFrames:FARM_CONFIG.growFrames,
  cycleFrames:time.cycleFrames,
});
