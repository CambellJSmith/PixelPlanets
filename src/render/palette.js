import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';
import { MaterialId } from '../data/materials.db.js';
import { cropById } from '../data/crops.db.js';
import { dimensionDefinition, isEarthDimension } from '../data/dimensions.db.js';

export function createPalette(state,generator,timeSystem,weatherSystem=null){
  const M=MaterialId;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const smooth=t=>{
    const x=clamp(t,0,1);
    return x*x*(3-2*x);
  };
  const mixColor=(a,b,t)=>[
    a[0]+(b[0]-a[0])*t,
    a[1]+(b[1]-a[1])*t,
    a[2]+(b[2]-a[2])*t,
  ];

  function cropColor(cropId,part,shade=0){
    const crop=cropById(cropId);
    const base=crop?.[part]??[112,150,78];
    return base.map((channel,index)=>clamp(channel+shade*(index===1?.45:.28),0,255));
  }

  function skyColor(worldX,worldY,surface){
    const sky=generator.skyAt(worldX);
    const altitude=surface.ground-worldY;
    const topBlend=smooth(altitude/92);
    const horizon=mixColor(sky.bottom,[232,220,185],.07);
    let day=mixColor(horizon,sky.top,topBlend);
    const time=timeSystem.getTime();
    const nightTop=[4,7,24];
    const nightBottom=[19,24,48];
    const night=mixColor(nightBottom,nightTop,topBlend);
    day=mixColor(day,night,time.nightStrength*.94);

    if(time.dawn>0){
      const warm=mixColor([240,123,83],[103,73,128],topBlend);
      day=mixColor(day,warm,time.dawn*(1-topBlend*.45)*.5);
    }
    if(time.dusk>0){
      const warm=mixColor([244,112,68],[92,62,122],topBlend);
      day=mixColor(day,warm,time.dusk*(1-topBlend*.38)*.62);
    }

    const weather=weatherSystem?.getWeather?.();
    if(weather&&weather.intensity>.01){
      const strength=weather.intensity;
      if(['rain','thunderstorm','ocean_storm'].includes(weather.type)){
        day=mixColor(day,[52,64,82],strength*(weather.type==='rain'?.3:.52));
      }else if(weather.type==='fog'){
        day=mixColor(day,[166,174,176],strength*.58);
      }else if(['snow','blizzard'].includes(weather.type)){
        day=mixColor(day,[185,202,218],strength*(weather.type==='blizzard'?.44:.24));
      }else if(weather.type==='ashfall'){
        day=mixColor(day,[92,75,72],strength*.52);
      }else if(weather.type==='heatwave'){
        day=mixColor(day,[224,154,94],strength*.22);
      }else if(weather.type==='spore_haze'){
        day=mixColor(day,[112,75,126],strength*.35);
      }
    }
    return day;
  }

  function baseColor(type,shade,x,y,cropId=0){
    const flicker=(state.frame+x*3+y*5)&7;
    if(type===M.ROCK)return[46+shade,42+shade,57+shade/2];
    if(type===M.DIRT)return[106+shade,70+shade/2,38];
    if(type===M.GRASS)return[48+shade/3,136+shade,52+shade/3];
    if(type===M.WATER){
      const camera=state.world.camera;
      const worldX=camera.chunkX*WORLD_WIDTH+x;
      const worldY=camera.chunkY*WORLD_HEIGHT+y;
      const surface=generator.surfaceAt(worldX);
      if(surface.ocean){
        const depth=Math.max(0,worldY-surface.water);
        return[18+shade*.18,88+shade*.55-Math.min(22,depth*.45),164+shade*.65-Math.min(28,depth*.55)];
      }
      return[28,96+shade,174+shade];
    }
    if(type===M.SAND)return[184+shade,145+shade/2,72];
    if(type===M.WOOD)return[112+shade,68+shade/2,34];
    if(type===M.LEAF)return[35+shade/3,108+shade,44+shade/3];
    if(type===M.LAVA)return[240,65+flicker*9,8];
    if(type===M.CRYSTAL)return[50+shade,220+Math.min(30,shade),245];
    if(type===M.FIRE)return[255,105+flicker*18,18+shade];
    if(type===M.NAPALM)return[206+shade*.6,104+flicker*4,20+shade*.2];
    if(type===M.SMOKE)return[68+shade,64+shade,76+shade];
    if(type===M.SNOW)return[230+shade*.3,238+shade*.3,245+shade*.2];
    if(type===M.MUD)return[78+shade,64+shade*.5,42];
    if(type===M.BAMBOO)return[126+shade*.3,188+shade,74+shade*.2];
    if(type===M.ASH)return[92+shade*.6,86+shade*.6,84+shade*.5];
    if(type===M.MYCELIUM)return[91+shade*.45,68+shade*.3,112+shade*.55];
    if(type===M.MUSHROOM_STEM)return[212+shade*.25,198+shade*.2,170+shade*.15];
    if(type===M.MUSHROOM_CAP)return[174+shade*.45,54+shade*.2,118+shade*.5];
    if(type===M.STEAM)return[188+shade*.35,214+shade*.3,225+shade*.25];
    if(type===M.CROP_STEM)return cropColor(cropId,'stem',shade);
    if(type===M.CROP_LEAF)return cropColor(cropId,'leaf',shade);
    if(type===M.CROP_FRUIT)return cropColor(cropId,'fruit',shade);

    const camera=state.world.camera;
    const worldX=camera.chunkX*WORLD_WIDTH+x;
    const worldY=camera.chunkY*WORLD_HEIGHT+y;
    const surface=generator.surfaceAt(worldX);

    if(worldY<surface.ground)return skyColor(worldX,worldY,surface);

    const depth=worldY-surface.ground;
    const caveBlend=smooth(clamp(depth/58,0,1));
    return mixColor([25,27,38],[8,9,17],caveBlend);
  }

  function color(type,shade,x,y,cropId=0){
    const base=baseColor(type,shade,x,y,cropId);
    if(isEarthDimension(state.world.dimension)||type===M.AIR)return base;
    const definition=dimensionDefinition(state.world.dimension);
    let strength=definition.tintStrength??0;
    if(state.world.dimension==='prism')strength+=((state.frame+x+y)%12<4)?.12:0;
    if(state.world.dimension==='static')strength+=((Math.floor(x/3)+Math.floor(y/3)+Math.floor(state.frame/8))%5===0)?.2:0;
    return mixColor(base,definition.materialTint??base,Math.min(.55,strength));
  }

  return { color, cropColor, skyColor };
}
