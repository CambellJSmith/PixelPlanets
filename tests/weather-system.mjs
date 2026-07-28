import { WORLD_WIDTH } from '../src/config.js';
import { MaterialId } from '../src/data/materials.db.js';
import { WeatherType } from '../src/data/weather.db.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createTimeSystem } from '../src/systems/time-system.js';
import { createWeatherSystem } from '../src/systems/weather-system.js';
import { createMaterialSystem } from '../src/systems/material-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=991827;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const time=createTimeSystem(state);
const weather=createWeatherSystem(state,cells,chunks,generator,noise,time);
const materials=createMaterialSystem(state,cells,noise,weather);

const surface=generator.surfaceAt(24);
Object.assign(state.player,{x:24,y:surface.ground-1,hp:100,invulnerability:0});
chunks.updateActiveNeighborhood();
const originX=state.world.camera.chunkX*WORLD_WIDTH;

function count(type){
  let total=0;
  for(const chunk of state.world.activeChunks){
    for(const value of chunk.cells)if(value===type)total++;
  }
  return total;
}

weather.forceWeather(WeatherType.RAIN);
const waterBefore=count(M.WATER);
for(let i=0;i<80;i++){
  state.frame++;
  weather.applyPrecipitation();
}
if(count(M.WATER)<=waterBefore)throw new Error('Rain did not add physical water pixels.');
if(weather.growthMultiplier()<=1)throw new Error('Rain did not increase crop growth rate.');

weather.forceWeather(WeatherType.SNOW);
const snowBefore=count(M.SNOW);
for(let i=0;i<60;i++){
  state.frame++;
  weather.applyPrecipitation();
}
if(count(M.SNOW)<=snowBefore)throw new Error('Snowfall did not accumulate snow pixels.');

weather.forceWeather(WeatherType.HEATWAVE);
for(let x=originX+2;x<originX+WORLD_WIDTH-2;x++){
  for(let y=2;y<45;y++)cells.setCell(x,y,M.AIR,0,{silent:true});
  cells.setCell(x,45,M.WATER,0,{silent:true});
}
const steamBefore=count(M.STEAM);
for(let i=0;i<20;i++){
  state.frame+=24;
  weather.applyHeatPulse();
}
if(count(M.STEAM)<=steamBefore)throw new Error('Heatwave did not evaporate exposed water into steam.');
if(weather.growthMultiplier()>=1)throw new Error('Heatwave did not slow crop growth.');

weather.forceWeather(WeatherType.THUNDERSTORM);
const strikeX=originX+70;
for(let y=2;y<50;y++)cells.setCell(strikeX,y,M.AIR,0,{silent:true});
cells.setCell(strikeX,50,M.WOOD,0,{silent:true});
const hpBefore=state.player.hp;
Object.assign(state.player,{x:strikeX,y:52,invulnerability:0});
const strike=weather.triggerLightning(weather.getWeather(),strikeX);
if(!strike||state.weather.flashes.length!==1)throw new Error('Thunderstorm did not create a lightning flash.');
if(cells.getCell(strikeX,50)!==M.FIRE&&cells.getCell(strikeX,49)!==M.FIRE){
  throw new Error('Lightning did not ignite its impact point.');
}
if(state.player.hp>=hpBefore)throw new Error('Nearby lightning did not damage the player.');

weather.forceWeather(WeatherType.OCEAN_STORM);
Object.assign(state.player,{x:24,y:surface.ground-1});
chunks.updateActiveNeighborhood();
const smokeX=originX+90;
const smokeY=25;
for(let x=smokeX-14;x<=smokeX+14;x++)for(let y=smokeY-3;y<=smokeY+3;y++)cells.setCell(x,y,M.AIR,0,{silent:true});
for(let x=smokeX-14;x<=smokeX+14;x++)cells.setCell(x,smokeY-1,M.ROCK,0,{silent:true});
cells.setCell(smokeX,smokeY,M.SMOKE,100,{silent:true});
let movedSideways=false;
for(let tick=0;tick<30;tick++){
  state.frame+=2;
  materials.update();
  for(let x=smokeX-14;x<=smokeX+14;x++){
    if(x!==smokeX&&cells.getCell(x,smokeY)===M.SMOKE)movedSideways=true;
  }
  if(movedSideways)break;
}
if(!movedSideways)throw new Error('Strong weather wind did not push smoke horizontally.');

weather.forceWeather(WeatherType.ASHFALL);
const ashBefore=count(M.ASH);
for(let i=0;i<60;i++){
  state.frame++;
  weather.applyPrecipitation();
}
if(count(M.ASH)<=ashBefore)throw new Error('Ashfall did not deposit ash pixels.');

console.log('weather system test passed',{
  rainWater:count(M.WATER)-waterBefore,
  snow:count(M.SNOW)-snowBefore,
  flashes:state.weather.flashes.length,
});
