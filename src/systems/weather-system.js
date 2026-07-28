import { WORLD_WIDTH, WORLD_HEIGHT, WEATHER_CONFIG, STEAM_CONFIG } from '../config.js';
import { BIOME_REGION_SIZE } from '../data/biomes.db.js';
import { WeatherType, weatherDefinition } from '../data/weather.db.js';
import { MaterialId, FLAMMABLE_MATERIALS } from '../data/materials.db.js';
import { faunaById } from '../data/fauna.db.js';
import { nearestPixel, snapPixelPosition } from '../pixel-grid.js';
import { dimensionDefinition, isEarthDimension } from '../data/dimensions.db.js';

const W=WeatherType;

export function createWeatherSystem(state,cells,chunks,generator,noise,timeSystem,juice=null){
  const M=MaterialId;
  let playerDamage=amount=>{
    if(state.player.invulnerability>0)return false;
    state.player.hp=Math.max(0,state.player.hp-amount);
    state.player.invulnerability=45;
    return true;
  };

  const SURFACE_WEIGHTS=Object.freeze({
    plains:[[W.CLEAR,30],[W.BREEZE,20],[W.RAIN,25],[W.THUNDERSTORM,10],[W.FOG,5],[W.HEATWAVE,10]],
    snow_peaks:[[W.CLEAR,20],[W.BREEZE,10],[W.SNOW,35],[W.BLIZZARD,25],[W.FOG,10]],
    bamboo_grove:[[W.CLEAR,20],[W.BREEZE,15],[W.RAIN,30],[W.THUNDERSTORM,10],[W.FOG,20],[W.HEATWAVE,5]],
    swamp:[[W.CLEAR,10],[W.RAIN,30],[W.THUNDERSTORM,15],[W.FOG,35],[W.HEATWAVE,10]],
    volcano:[[W.CLEAR,15],[W.BREEZE,10],[W.ASHFALL,45],[W.HEATWAVE,30]],
    giant_forest:[[W.CLEAR,20],[W.BREEZE,15],[W.RAIN,30],[W.THUNDERSTORM,15],[W.FOG,20]],
    ocean:[[W.CLEAR,10],[W.BREEZE,15],[W.RAIN,25],[W.OCEAN_STORM,35],[W.FOG,15]],
  });

  function ensureState(){
    if(state.weather)return state.weather;
    state.weather={
      overrideType:null,
      currentType:W.CLEAR,
      previousType:W.CLEAR,
      segment:-1,
      intensity:0,
      windX:0,
      visibility:1,
      nextLightningFrame:0,
      flashes:[],
    };
    return state.weather;
  }

  function cameraOrigin(){
    return{
      x:state.world.camera.chunkX*WORLD_WIDTH,
      y:state.world.camera.chunkY*WORLD_HEIGHT,
    };
  }

  function isUnderground(){
    const surface=generator.surfaceAt(state.player.x);
    return state.player.y>surface.ground+12||state.world.camera.chunkY>0;
  }

  function habitatName(){
    if(!isEarthDimension(state.world.dimension))return `dimension:${state.world.dimension}`;
    if(isUnderground()){
      return generator.undergroundBiomeIdAt(state.player.x,state.player.y-2)===1?'mushroom_caverns':'standard_caves';
    }
    return generator.biomeNameAt(state.player.x,state.player.y-2);
  }

  function chooseWeighted(entries,roll){
    const total=entries.reduce((sum,item)=>sum+item[1],0);
    let cursor=roll*total;
    for(const [type,weight] of entries){
      cursor-=weight;
      if(cursor<=0)return type;
    }
    return entries.at(-1)?.[0]??W.CLEAR;
  }

  function typeForSegment(segment,habitat){
    const weatherState=ensureState();
    if(habitat.startsWith('dimension:')){
      if(weatherState.overrideType)return weatherState.overrideType;
      const dimension=habitat.slice('dimension:'.length);
      const weatherList=dimensionDefinition(dimension).weather??[W.CLEAR];
      return weatherList[Math.floor(noise.randomAt(segment,state.seed+dimension.length,9007)*weatherList.length)%weatherList.length]??W.CLEAR;
    }
    if(weatherState.overrideType)return weatherState.overrideType;
    const region=Math.floor(state.player.x/BIOME_REGION_SIZE);
    const time=timeSystem.getTime();
    const daySalt=time.dayNumber*97+region*313;
    const roll=noise.randomAt(segment,daySalt,state.seed+9001);

    if(habitat==='mushroom_caverns'){
      return chooseWeighted([[W.SPORE_HAZE,58],[W.CAVE_DRIP,27],[W.CLEAR,15]],roll);
    }
    if(habitat==='standard_caves'){
      return chooseWeighted([[W.CAVE_DRIP,58],[W.CLEAR,42]],roll);
    }
    return chooseWeighted(SURFACE_WEIGHTS[habitat]??SURFACE_WEIGHTS.plains,roll);
  }

  function windDirection(segment,habitat){
    if(habitat==='dimension:moon')return 0;
    if(habitat.startsWith('dimension:')){
      const dimension=habitat.slice('dimension:'.length);
      const definition=dimensionDefinition(dimension);
      if((definition.weather??[]).every(type=>type===W.CLEAR))return 0;
      return noise.randomAt(segment,dimension.length,state.seed+9017)<.5?-1:1;
    }
    if(habitat==='standard_caves'||habitat==='mushroom_caverns')return 0;
    const region=Math.floor(state.player.x/BIOME_REGION_SIZE);
    return noise.randomAt(segment,region,state.seed+9011)<.5?-1:1;
  }

  function getWeather(){
    const weatherState=ensureState();
    const habitat=habitatName();
    const segment=Math.floor(state.frame/WEATHER_CONFIG.periodFrames);
    const segmentFrame=((state.frame%WEATHER_CONFIG.periodFrames)+WEATHER_CONFIG.periodFrames)%WEATHER_CONFIG.periodFrames;
    const type=typeForSegment(segment,habitat);
    const definition=weatherDefinition(type);
    const transition=Math.max(1,WEATHER_CONFIG.transitionFrames);
    const rampIn=Math.min(1,segmentFrame/transition);
    const rampOut=Math.min(1,(WEATHER_CONFIG.periodFrames-segmentFrame)/transition);
    const intensity=weatherState.overrideType?1:Math.max(0,Math.min(rampIn,rampOut));
    const direction=windDirection(segment,habitat);
    const windX=direction*definition.wind*intensity;
    const visibility=1-(1-definition.visibility)*intensity;

    if(segment!==weatherState.segment||type!==weatherState.currentType){
      weatherState.previousType=weatherState.currentType;
      weatherState.currentType=type;
      weatherState.segment=segment;
      const min=WEATHER_CONFIG.lightningMinFrames;
      const max=WEATHER_CONFIG.lightningMaxFrames;
      weatherState.nextLightningFrame=state.frame+min+Math.floor(noise.randomAt(segment,state.seed,9021)*(max-min));
    }
    weatherState.intensity=intensity;
    weatherState.windX=windX;
    weatherState.visibility=visibility;

    const windLabel=Math.abs(windX)<.08?'calm':`${windX<0?'←':'→'} ${Math.abs(windX)>.75?'strong':Math.abs(windX)>.35?'steady':'light'}`;
    return{
      type,
      label:definition.label,
      habitat,
      segment,
      segmentFrame,
      intensity,
      windX,
      windLabel,
      visibility,
      precipitation:definition.precipitation,
      lightning:definition.lightning,
      growthMultiplier:1+(definition.growthMultiplier-1)*intensity,
    };
  }

  function findSurfaceY(worldX){
    const {y:originY}=cameraOrigin();
    for(let localY=1;localY<WORLD_HEIGHT-1;localY++){
      const worldY=originY+localY;
      if(cells.getCell(worldX,worldY)!==M.AIR)return worldY;
    }
    return originY+WORLD_HEIGHT-2;
  }

  function randomVisibleX(salt){
    const {x:originX}=cameraOrigin();
    return originX+2+Math.floor(noise.randomAt(state.frame,salt,state.seed+9031)*(WORLD_WIDTH-4));
  }

  function depositAtSurface(material,salt){
    const x=randomVisibleX(salt);
    const y=findSurfaceY(x);
    const target=cells.getCell(x,y);
    const above=cells.getCell(x,y-1);

    if(material===M.WATER){
      if(target===M.FIRE){
        cells.setCell(x,y,M.SMOKE,18,{reason:'rain-extinguish'});
        return{x,y};
      }
      if(target===M.LAVA){
        cells.setCell(x,y-1,M.STEAM,STEAM_CONFIG.lifeFrames,{reason:'rain-lava'});
        return{x,y:y-1};
      }
      if(above===M.AIR||above===M.SMOKE||above===M.STEAM){
        cells.setCell(x,y-1,M.WATER,0,{reason:'rain'});
        return{x,y:y-1};
      }
      return null;
    }

    if(above===M.AIR){
      cells.setCell(x,y-1,material,0,{reason:'weather-deposit'});
      return{x,y:y-1};
    }
    return null;
  }

  function findCaveCeiling(salt){
    const {x:originX,y:originY}=cameraOrigin();
    const x=originX+2+Math.floor(noise.randomAt(state.frame,salt,state.seed+9041)*(WORLD_WIDTH-4));
    for(let localY=2;localY<WORLD_HEIGHT-3;localY++){
      const y=originY+localY;
      if(cells.isSolid(cells.getCell(x,y-1))&&cells.getCell(x,y)===M.AIR)return{x,y};
    }
    return null;
  }

  function applyPrecipitation(weather=getWeather()){
    if(weather.intensity<=.08||!weather.precipitation)return 0;
    const heavy=weather.type===W.THUNDERSTORM||weather.type===W.OCEAN_STORM||weather.type===W.BLIZZARD;
    const count=Math.max(1,Math.min(WEATHER_CONFIG.maxSurfaceDepositsPerTick,heavy?2+Math.round(weather.intensity):1));
    let deposits=0;

    for(let index=0;index<count;index++){
      if(weather.precipitation==='rain'){
        if(depositAtSurface(M.WATER,9100+index))deposits++;
      }else if(weather.precipitation==='snow'){
        if(depositAtSurface(M.SNOW,9200+index))deposits++;
      }else if(weather.precipitation==='ash'){
        if(depositAtSurface(M.ASH,9300+index))deposits++;
      }else if(weather.precipitation==='drip'){
        const point=findCaveCeiling(9400+index);
        if(point&&cells.setCell(point.x,point.y,M.WATER,0,{reason:'cave-drip'}))deposits++;
      }else if(weather.precipitation==='spore'){
        const point=findCaveCeiling(9500+index);
        if(point){
          for(let depth=1;depth<18;depth++){
            const y=point.y+depth;
            const type=cells.getCell(point.x,y);
            if(type===M.DIRT){
              cells.setCell(point.x,y,M.MYCELIUM,0,{reason:'spore-haze'});
              deposits++;
              break;
            }
            if(cells.isSolid(type))break;
          }
        }
      }
    }
    return deposits;
  }

  function applyHeatPulse(weather=getWeather()){
    if(weather.type!==W.HEATWAVE||weather.intensity<.3)return 0;
    let changed=0;
    for(let index=0;index<3;index++){
      const x=randomVisibleX(9600+index);
      const y=findSurfaceY(x);
      const type=cells.getCell(x,y);
      if(type===M.WATER){
        cells.setCell(x,y,M.STEAM,STEAM_CONFIG.lifeFrames,{reason:'heatwave'});
        changed++;
      }else if(type===M.SNOW){
        cells.setCell(x,y,M.WATER,0,{reason:'heatwave'});
        changed++;
      }else if(type===M.FIRE){
        cells.setLife(x,y,Math.min(255,cells.getLife(x,y)+16));
        changed++;
      }
    }
    return changed;
  }

  function damageActorsAt(x,y,radius){
    if(Math.hypot(state.player.x-x,(state.player.y-2)-y)<=radius)playerDamage(WEATHER_CONFIG.lightningDamage);
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(const enemy of chunk.enemies){
        if(Math.hypot(enemy.x-x,enemy.y-y)>radius)continue;
        enemy.hp-=WEATHER_CONFIG.lightningDamage;
        enemy.hit=Math.max(enemy.hit??0,8);
      }
    }
    for(const boss of state.entities.bosses){
      if(Math.hypot(boss.x-x,boss.y-y)>radius+6)continue;
      boss.hp-=WEATHER_CONFIG.lightningDamage;
      boss.hit=Math.max(boss.hit??0,8);
    }
  }

  function triggerLightning(weather=getWeather(),forcedX=null){
    if(!weather.lightning&&forcedX===null)return null;
    const x=nearestPixel(forcedX??randomVisibleX(9701));
    const y=findSurfaceY(x);
    const weatherState=ensureState();
    weatherState.flashes.push({x,y,frames:14,maxFrames:14});
    const strikeType=cells.getCell(x,y);
    if(FLAMMABLE_MATERIALS.has(strikeType))cells.setCell(x,y,M.FIRE,WEATHER_CONFIG.lightningFireLife,{reason:'lightning'});
    else if(cells.getCell(x,y-1)===M.AIR)cells.setCell(x,y-1,M.FIRE,WEATHER_CONFIG.lightningFireLife,{reason:'lightning'});
    state.entities.explosions.push({x,y:y-1,radius:5,frames:10,maxFrames:10,kind:'lightning',color:'rgb(226,239,255)'});
    juice?.screenFlash?.('rgba(235,246,255,.34)',6);
    juice?.shake?.(4.5,22);
    juice?.play?.('explosion',.62);
    damageActorsAt(x,y,4);

    const min=WEATHER_CONFIG.lightningMinFrames;
    const max=WEATHER_CONFIG.lightningMaxFrames;
    weatherState.nextLightningFrame=state.frame+min+Math.floor(noise.randomAt(x,y,state.frame+9702)*(max-min));
    return{x,y};
  }

  function updateFlashes(){
    const flashes=ensureState().flashes;
    for(let index=flashes.length-1;index>=0;index--){
      flashes[index].frames--;
      if(flashes[index].frames<=0)flashes.splice(index,1);
    }
  }

  function applyWind(weather=getWeather()){
    const force=weather.windX*WEATHER_CONFIG.windEntityForce;
    if(Math.abs(force)<.001)return;
    for(const key of ['seedParticles','pickups','napalmShots','bossFireballs','serpentProjectiles','bossProjectiles']){
      for(const entity of state.entities[key]??[]){
        if(entity.kind==='lightning_marker')continue;
        entity.vx=(entity.vx??0)+force;
      }
    }
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(const enemy of chunk.enemies){
        const species=faunaById(enemy.speciesId);
        if(species?.movement==='flying')enemy.vx=(enemy.vx??0)+force*1.8;
      }
    }
  }

  function update(){
    const weather=getWeather();
    updateFlashes();
    applyWind(weather);

    if(weather.precipitation){
      const interval=(weather.type===W.THUNDERSTORM||weather.type===W.OCEAN_STORM||weather.type===W.BLIZZARD)
        ?WEATHER_CONFIG.heavyPrecipitationIntervalFrames
        :WEATHER_CONFIG.precipitationIntervalFrames;
      if(state.frame%interval===0)applyPrecipitation(weather);
    }
    if(state.frame%WEATHER_CONFIG.heatPulseFrames===0)applyHeatPulse(weather);
    if(weather.lightning&&state.frame>=ensureState().nextLightningFrame)triggerLightning(weather);
  }

  function growthMultiplier(){ return getWeather().growthMultiplier; }
  function windX(){ return getWeather().windX; }
  function forceWeather(type=null){
    ensureState().overrideType=type;
    ensureState().segment=-1;
    return getWeather();
  }
  function setPlayerDamage(handler){ if(typeof handler==='function')playerDamage=handler; }

  ensureState();
  return{
    update,
    getWeather,
    growthMultiplier,
    windX,
    forceWeather,
    setPlayerDamage,
    applyPrecipitation,
    applyHeatPulse,
    triggerLightning,
  };
}
