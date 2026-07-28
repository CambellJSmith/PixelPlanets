import { MaterialId } from './materials.db.js';
import { WeatherType } from './weather.db.js';

const M=MaterialId;
const W=WeatherType;

export const DimensionId=Object.freeze({
  EARTH:'earth',
  MOON:'moon',
  EMBERDEEP:'emberdeep',
  FROSTVOID:'frostvoid',
  PRISM:'prism',
  ABYSS:'abyss',
  VERDANT:'verdant',
  CLOCKWORK:'clockwork',
  DREAM:'dream',
  SKYREALM:'skyrealm',
  STATIC:'static',
});

export const DIMENSION_DB=Object.freeze([
  {
    id:DimensionId.EARTH,name:'Earth',code:'homeward',terrain:'earth',gravity:1,oxygen:true,
    skyTop:[91,166,224],skyBottom:[151,201,229],materialTint:[128,128,128],tintStrength:0,
    weather:[W.CLEAR,W.BREEZE,W.RAIN,W.THUNDERSTORM,W.FOG,W.SNOW,W.HEATWAVE],
    portalColors:['rgb(84,198,126)','rgb(92,174,255)','rgb(240,231,159)','rgb(244,250,255)'],
    structure:'earth',spawnX:20,
  },
  {
    id:DimensionId.MOON,name:'Moon',code:'moonme',terrain:'moon',gravity:.38,oxygen:false,
    skyTop:[7,9,21],skyBottom:[28,30,55],materialTint:[172,164,215],tintStrength:.14,
    weather:[W.CLEAR],portalColors:['rgb(91,229,255)','rgb(130,128,255)','rgb(207,92,255)','rgb(255,103,205)','rgb(244,238,255)'],
    structure:'lunar',spawnX:48,
  },
  {
    id:DimensionId.EMBERDEEP,name:'Emberdeep',code:'burnbright',terrain:'ember',gravity:1.08,oxygen:false,
    skyTop:[35,8,12],skyBottom:[146,47,24],materialTint:[226,74,36],tintStrength:.22,
    weather:[W.ASHFALL,W.HEATWAVE],portalColors:['rgb(255,235,126)','rgb(255,121,31)','rgb(214,38,28)','rgb(76,12,21)'],
    structure:'ember_fortress',spawnX:48,
  },
  {
    id:DimensionId.FROSTVOID,name:'Frostvoid',code:'coldsnap',terrain:'frost',gravity:.82,oxygen:true,
    skyTop:[15,34,67],skyBottom:[105,167,207],materialTint:[154,215,244],tintStrength:.22,
    weather:[W.SNOW,W.BLIZZARD,W.FOG],portalColors:['rgb(244,255,255)','rgb(148,226,255)','rgb(79,148,235)','rgb(95,74,202)'],
    structure:'ice_cathedral',spawnX:48,
  },
  {
    id:DimensionId.PRISM,name:'Prismatica',code:'neonpulse',terrain:'prism',gravity:.72,oxygen:true,
    skyTop:[39,14,74],skyBottom:[217,84,188],materialTint:[214,112,242],tintStrength:.18,
    weather:[W.CLEAR,W.BREEZE],portalColors:['rgb(255,80,190)','rgb(255,222,72)','rgb(67,255,176)','rgb(72,188,255)','rgb(176,84,255)'],
    structure:'prism_spire',spawnX:48,
  },
  {
    id:DimensionId.ABYSS,name:'Blacktide Abyss',code:'blacktide',terrain:'abyss',gravity:.9,oxygen:false,
    skyTop:[2,13,27],skyBottom:[10,54,78],materialTint:[38,112,154],tintStrength:.24,
    weather:[W.OCEAN_STORM,W.FOG],portalColors:['rgb(27,54,82)','rgb(29,136,174)','rgb(78,230,224)','rgb(8,18,36)'],
    structure:'drowned_dome',spawnX:48,
  },
  {
    id:DimensionId.VERDANT,name:'Verdant Wilds',code:'growwild',terrain:'verdant',gravity:.92,oxygen:true,
    skyTop:[25,87,64],skyBottom:[112,205,118],materialTint:[70,178,86],tintStrength:.2,
    weather:[W.RAIN,W.FOG,W.BREEZE],portalColors:['rgb(236,255,137)','rgb(88,232,105)','rgb(34,145,78)','rgb(19,75,55)'],
    structure:'living_temple',spawnX:48,
  },
  {
    id:DimensionId.CLOCKWORK,name:'Clockwork Expanse',code:'ticktock',terrain:'clockwork',gravity:1.25,oxygen:false,
    skyTop:[42,35,31],skyBottom:[148,105,59],materialTint:[194,136,65],tintStrength:.19,
    weather:[W.BREEZE,W.CLEAR],portalColors:['rgb(255,225,139)','rgb(210,144,53)','rgb(111,79,48)','rgb(239,241,224)'],
    structure:'gear_tower',spawnX:48,
  },
  {
    id:DimensionId.DREAM,name:'Lucid Dream',code:'lucidloop',terrain:'dream',gravity:.48,oxygen:true,
    skyTop:[48,19,89],skyBottom:[235,108,195],materialTint:[194,89,210],tintStrength:.22,
    weather:[W.SPORE_HAZE,W.FOG],portalColors:['rgb(255,165,245)','rgb(169,104,255)','rgb(81,231,255)','rgb(255,247,181)'],
    structure:'impossible_house',spawnX:48,
  },
  {
    id:DimensionId.SKYREALM,name:'Cloudsea',code:'cloudnine',terrain:'skylands',gravity:.32,oxygen:true,
    skyTop:[70,137,225],skyBottom:[230,242,255],materialTint:[177,215,244],tintStrength:.12,
    weather:[W.BREEZE,W.THUNDERSTORM],portalColors:['rgb(255,255,255)','rgb(166,228,255)','rgb(94,177,255)','rgb(255,229,124)'],
    structure:'cloud_shrine',spawnX:48,
  },
  {
    id:DimensionId.STATIC,name:'The Static',code:'glitchme',terrain:'static',gravity:.66,oxygen:false,
    skyTop:[7,2,15],skyBottom:[47,9,61],materialTint:[86,255,202],tintStrength:.2,
    weather:[W.FOG,W.THUNDERSTORM],portalColors:['rgb(255,44,198)','rgb(53,255,205)','rgb(255,245,65)','rgb(112,64,255)','rgb(245,245,245)'],
    structure:'glitch_obelisk',spawnX:48,
  },
]);

const BY_ID=new Map(DIMENSION_DB.map(item=>[item.id,item]));
const BY_CODE=new Map(DIMENSION_DB.map(item=>[item.code,item]));

export const DIMENSION_IDS=Object.freeze(DIMENSION_DB.map(item=>item.id));
export const PORTAL_CODES=Object.freeze(DIMENSION_DB.map(item=>({code:item.code,dimension:item.id})));
export const MAX_PORTAL_CODE_LENGTH=Math.max(...DIMENSION_DB.map(item=>item.code.length));

export function dimensionDefinition(id){ return BY_ID.get(id)??BY_ID.get(DimensionId.EARTH); }
export function dimensionByCode(code){ return BY_CODE.get(String(code??'').toLowerCase())??null; }
export function isEarthDimension(id){ return id===DimensionId.EARTH; }
export function isMoonDimension(id){ return id===DimensionId.MOON; }
export function dimensionName(id){ return dimensionDefinition(id).name; }
export function dimensionHasOxygen(id){ return dimensionDefinition(id).oxygen!==false; }
export function createDimensionPositionMap(){
  const result=Object.create(null);
  for(const definition of DIMENSION_DB)result[definition.id]={x:definition.spawnX??48,y:45};
  return result;
}
export function createDimensionEntityMap(){
  const result=Object.create(null);
  for(const definition of DIMENSION_DB)result[definition.id]=Object.create(null);
  return result;
}

export function dimensionSurfaceProfile(id,x,noise1,randomAt){
  const d=dimensionDefinition(id);
  const worldX=Math.floor(x);
  const baseMix={dominant:0,entries:[{id:0,weight:1,regionIndex:0}],weight(){return 0;}};
  let ground=58;
  let water=ground;
  let lake=false;
  let ocean=false;

  switch(d.terrain){
    case 'moon':{
      const basin=(noise1(worldX,280,9101)-.5)*10;
      const crater=(noise1(worldX,74,9102)-.5)*8;
      const micro=(noise1(worldX,19,9103)-.5)*2;
      const craterCenter=Math.floor(worldX/58)*58+29;
      const distance=Math.abs(worldX-craterCenter);
      ground=Math.floor(58+basin+crater+micro+Math.max(0,1-distance/16)*6-Math.max(0,1-Math.abs(distance-15)/6)*2);
      break;
    }
    case 'ember':
      ground=Math.floor(58+(noise1(worldX,125,9301)-.5)*19+(noise1(worldX,31,9302)-.5)*5);
      break;
    case 'frost':
      ground=Math.floor(56+(noise1(worldX,230,9311)-.5)*18-(Math.max(0,noise1(worldX,82,9312)-.58))*25);
      break;
    case 'prism':{
      const facet=Math.round((noise1(Math.floor(worldX/12)*12,90,9321)-.5)*17);
      ground=57+facet+Math.round(Math.sin(worldX*.035)*3);
      break;
    }
    case 'abyss':
      ground=Math.floor(86+(noise1(worldX,180,9331)-.5)*14+(noise1(worldX,45,9332)-.5)*5);
      water=24;
      lake=true;
      ocean=true;
      break;
    case 'verdant':
      ground=Math.floor(61+(noise1(worldX,250,9341)-.5)*12+(noise1(worldX,52,9342)-.5)*5);
      break;
    case 'clockwork':{
      const step=Math.floor(worldX/24);
      ground=54+Math.floor(randomAt(step,0,9351)*5)*4;
      break;
    }
    case 'dream':
      ground=Math.floor(58+Math.sin(worldX*.023)*9+Math.sin(worldX*.071)*4+(noise1(worldX,180,9361)-.5)*7);
      break;
    case 'skylands':
      ground=Math.floor(50+(noise1(worldX,190,9371)-.5)*16+Math.sin(worldX*.018)*4);
      break;
    case 'static':{
      const block=Math.floor(worldX/18);
      ground=48+Math.floor(randomAt(block,1,9381)*7)*5+((block%5===0)?8:0);
      break;
    }
    default:
      break;
  }

  ground=Math.max(28,Math.min(96,ground));
  return {
    ground,water,lake,ocean,oceanWeight:ocean?1:0,lakeDepth:ocean?Math.max(0,ground-water):0,
    biome:d.id,mix:baseMix,
  };
}

export function dimensionMaterialAt(id,x,y,surface,noise2,randomAt){
  const d=dimensionDefinition(id);
  const depth=y-surface.ground;
  if(d.terrain==='abyss'){
    if(y<surface.water)return M.AIR;
    if(y<surface.ground)return M.WATER;
  }else if(y<surface.ground){
    return M.AIR;
  }

  if(d.terrain==='skylands'){
    if(depth<0)return M.AIR;
    const thickness=7+Math.floor(noise2(x,surface.ground,80,9471)*7);
    if(depth>thickness)return M.AIR;
    if(depth===0)return M.GRASS;
    if(depth<4)return M.DIRT;
    return randomAt(x,y,9472)>.91?M.CRYSTAL:M.ROCK;
  }

  if(d.terrain==='static'){
    if(depth<0)return M.AIR;
    const glitch=randomAt(Math.floor(x/3),Math.floor(y/3),9481);
    if(depth>5&&glitch>.91)return M.AIR;
    if(depth===0)return (Math.floor(x/7)%3===0)?M.CRYSTAL:M.ASH;
    if(glitch<.12)return M.CRYSTAL;
    if(glitch<.2)return M.MYCELIUM;
    return M.ROCK;
  }

  const cave=noise2(x,y,d.terrain==='clockwork'?38:58,9400+d.id.length)*.68+noise2(x,y,21,9410+d.id.length)*.32;
  const caveThreshold=d.terrain==='dream'?.68:d.terrain==='verdant'?.75:.79;
  if(depth>12&&cave>caveThreshold)return M.AIR;

  switch(d.terrain){
    case 'moon':
      if(depth===0)return M.SAND;
      if(depth<5)return randomAt(x,y,9110)>.82?M.CRYSTAL:M.SAND;
      if(depth<18&&randomAt(x,y,9111)>.92)return M.CRYSTAL;
      return M.ROCK;
    case 'ember':
      if(depth===0)return M.ASH;
      if(depth<5)return randomAt(x,y,9421)>.8?M.LAVA:M.ASH;
      if(depth>18&&noise2(x,y,34,9422)>.79)return M.LAVA;
      return randomAt(x,y,9423)>.94?M.CRYSTAL:M.ROCK;
    case 'frost':
      if(depth===0)return M.SNOW;
      if(depth<6)return randomAt(x,y,9431)>.7?M.CRYSTAL:M.SNOW;
      if(depth>16&&noise2(x,y,44,9432)>.86)return M.WATER;
      return M.ROCK;
    case 'prism':
      if(depth===0)return M.CRYSTAL;
      if(depth<9)return ((x+y)%5===0)?M.SAND:M.CRYSTAL;
      return randomAt(x,y,9441)>.62?M.CRYSTAL:M.ROCK;
    case 'abyss':
      if(depth===0)return M.SAND;
      if(depth<8)return randomAt(x,y,9451)>.88?M.CRYSTAL:M.SAND;
      return noise2(x,y,42,9452)>.89?M.CRYSTAL:M.ROCK;
    case 'verdant':
      if(depth===0)return M.GRASS;
      if(depth<10)return randomAt(x,y,9461)>.93?M.MYCELIUM:M.DIRT;
      if(depth<28&&noise2(x,y,33,9462)>.87)return M.WOOD;
      return M.ROCK;
    case 'clockwork':
      if(depth===0)return M.ROCK;
      if(depth<6)return ((Math.floor(x/4)+Math.floor(y/4))%2===0)?M.CRYSTAL:M.ROCK;
      if(depth>18&&Math.abs((x%24+24)%24-12)<2)return M.AIR;
      return randomAt(x,y,9465)>.86?M.CRYSTAL:M.ROCK;
    case 'dream':
      if(depth===0)return M.MYCELIUM;
      if(depth<7)return randomAt(x,y,9468)>.62?M.MUSHROOM_CAP:M.MYCELIUM;
      if(depth<20&&noise2(x,y,27,9469)>.83)return M.MUSHROOM_STEM;
      return randomAt(x,y,9470)>.9?M.CRYSTAL:M.ROCK;
    default:
      return M.ROCK;
  }
}
