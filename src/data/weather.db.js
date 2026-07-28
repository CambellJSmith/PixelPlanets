export const WeatherType = Object.freeze({
  CLEAR:'clear',
  BREEZE:'breeze',
  RAIN:'rain',
  THUNDERSTORM:'thunderstorm',
  SNOW:'snow',
  BLIZZARD:'blizzard',
  FOG:'fog',
  HEATWAVE:'heatwave',
  ASHFALL:'ashfall',
  OCEAN_STORM:'ocean_storm',
  CAVE_DRIP:'cave_drip',
  SPORE_HAZE:'spore_haze',
});

const W=WeatherType;

export const WEATHER_DB = Object.freeze({
  [W.CLEAR]:{label:'Clear',precipitation:null,wind:0,visibility:1,lightning:false,growthMultiplier:1},
  [W.BREEZE]:{label:'Breezy',precipitation:null,wind:.55,visibility:1,lightning:false,growthMultiplier:1},
  [W.RAIN]:{label:'Rain',precipitation:'rain',wind:.28,visibility:.9,lightning:false,growthMultiplier:1.35},
  [W.THUNDERSTORM]:{label:'Thunderstorm',precipitation:'rain',wind:.72,visibility:.73,lightning:true,growthMultiplier:1.5},
  [W.SNOW]:{label:'Snowfall',precipitation:'snow',wind:.2,visibility:.9,lightning:false,growthMultiplier:.85},
  [W.BLIZZARD]:{label:'Blizzard',precipitation:'snow',wind:.92,visibility:.58,lightning:false,growthMultiplier:.62},
  [W.FOG]:{label:'Dense fog',precipitation:null,wind:.05,visibility:.56,lightning:false,growthMultiplier:1.05},
  [W.HEATWAVE]:{label:'Heatwave',precipitation:null,wind:.12,visibility:.88,lightning:false,growthMultiplier:.78},
  [W.ASHFALL]:{label:'Ashfall',precipitation:'ash',wind:.38,visibility:.7,lightning:false,growthMultiplier:.68},
  [W.OCEAN_STORM]:{label:'Ocean storm',precipitation:'rain',wind:1,visibility:.62,lightning:true,growthMultiplier:1.45},
  [W.CAVE_DRIP]:{label:'Cave drips',precipitation:'drip',wind:0,visibility:.92,lightning:false,growthMultiplier:1.1},
  [W.SPORE_HAZE]:{label:'Spore haze',precipitation:'spore',wind:.08,visibility:.7,lightning:false,growthMultiplier:1.22},
});

export function weatherDefinition(type){
  return WEATHER_DB[type]??WEATHER_DB[W.CLEAR];
}
