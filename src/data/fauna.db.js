import { BiomeId } from './biomes.db.js';
import { UndergroundBiomeId } from './underground-biomes.db.js';

const B=BiomeId;
const U=UndergroundBiomeId;

export const LOOT_DB=Object.freeze([
  {id:'raw_meat',name:'raw meat',color:[188,72,72],cookTo:'cooked_meat'},
  {id:'cooked_meat',name:'cooked meat',color:[174,94,48],edible:true,hungerRestore:34,healthRestore:4},
  {id:'small_hide',name:'small hide',color:[145,101,66]},
  {id:'thick_fur',name:'thick fur',color:[217,220,215]},
  {id:'fine_fur',name:'fine fur',color:[183,127,79]},
  {id:'feather',name:'feather',color:[214,222,230]},
  {id:'bright_feather',name:'bright feather',color:[103,178,194]},
  {id:'egg',name:'wild egg',color:[230,216,165],cookTo:'cooked_egg'},
  {id:'cooked_egg',name:'cooked egg',color:[244,194,88],edible:true,hungerRestore:18,healthRestore:2},
  {id:'horn',name:'horn',color:[195,184,151]},
  {id:'antler',name:'antler',color:[143,103,67]},
  {id:'fang',name:'fang',color:[231,226,202]},
  {id:'claw',name:'claw',color:[204,194,166]},
  {id:'bone',name:'bone',color:[216,211,183]},
  {id:'chitin',name:'chitin plate',color:[82,75,93]},
  {id:'insect_shell',name:'insect shell',color:[100,117,71]},
  {id:'silk',name:'spider silk',color:[220,220,224]},
  {id:'venom_sac',name:'venom sac',color:[115,194,88]},
  {id:'slime_gel',name:'slime gel',color:[91,202,151]},
  {id:'glow_dust',name:'glow dust',color:[190,236,128]},
  {id:'spore_sac',name:'spore sac',color:[191,103,185]},
  {id:'mushroom_flesh',name:'mushroom flesh',color:[210,158,165],cookTo:'roasted_mushroom'},
  {id:'roasted_mushroom',name:'roasted mushroom',color:[151,92,70],edible:true,hungerRestore:16,healthRestore:2},
  {id:'scale',name:'scale',color:[89,151,122]},
  {id:'ember_scale',name:'ember scale',color:[208,83,40]},
  {id:'ember_gland',name:'ember gland',color:[255,151,54]},
  {id:'fish',name:'fresh fish',color:[100,164,196],cookTo:'cooked_fish'},
  {id:'cooked_fish',name:'cooked fish',color:[197,132,76],edible:true,hungerRestore:28,healthRestore:3},
  {id:'fin',name:'fin',color:[83,145,172]},
  {id:'shell',name:'shell',color:[194,165,126]},
  {id:'pearl',name:'pearl',color:[231,226,238]},
  {id:'eel_gland',name:'electric gland',color:[154,174,241]},
  {id:'ink_sac',name:'ink sac',color:[65,57,90]},
  {id:'crab_claw',name:'crab claw',color:[205,94,71],cookTo:'cooked_crab'},
  {id:'cooked_crab',name:'cooked crab',color:[230,130,73],edible:true,hungerRestore:24,healthRestore:3},
  {id:'honeycomb',name:'honeycomb',color:[227,173,55]},
  {id:'ash_core',name:'ash core',color:[92,80,82]},
  {id:'crystal_fragment',name:'crystal fragment',color:[151,132,236]},
]);

const lootByIdMap=new Map(LOOT_DB.map(item=>[item.id,item]));
export function lootById(id){ return lootByIdMap.get(id)??null; }

function species(id,name,options){
  return Object.freeze({
    id,name,
    temperament:'passive',
    movement:'ground',
    habitat:'surface',
    biomes:[],
    undergroundBiomes:[],
    hp:12,
    contactDamage:0,
    speed:.32,
    aggroRange:28,
    fleeRange:24,
    width:3,
    height:3,
    hitRadius:2,
    spawnWeight:1,
    groupMin:1,
    groupMax:2,
    animationRate:9,
    sprite:'quadruped',
    palette:[[135,105,76],[205,177,126],[65,52,44]],
    loot:[],
    behaviors:[],
    invasionOnly:false,
    ...options,
  });
}

export const FAUNA_DB=Object.freeze([
  // Plains
  species('meadow_hare','meadow hare',{biomes:[B.PLAINS],movement:'hopper',sprite:'hare',hp:8,speed:.48,groupMin:2,groupMax:4,palette:[[181,151,111],[232,215,177],[89,73,58]],loot:[['raw_meat',1,1,.8],['small_hide',1,1,.65]]}),
  species('field_mouse','field mouse',{biomes:[B.PLAINS],sprite:'mouse',hp:5,speed:.4,groupMin:2,groupMax:5,width:2,height:2,palette:[[122,101,82],[211,176,144],[62,53,48]],loot:[['raw_meat',1,1,.35]]}),
  species('prairie_deer','prairie deer',{biomes:[B.PLAINS],sprite:'deer',hp:32,speed:.55,width:5,height:5,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.45,palette:[[161,108,68],[224,188,137],[72,52,40]],loot:[['raw_meat',2,4,1],['small_hide',1,2,1],['antler',1,2,.4]]}),
  species('burrow_badger','burrow badger',{biomes:[B.PLAINS],sprite:'badger',hp:24,speed:.34,width:5,height:3,spawnWeight:.55,palette:[[82,78,75],[213,205,188],[36,35,36]],loot:[['raw_meat',1,2,.8],['small_hide',1,1,1],['claw',1,1,.4]]}),
  species('honey_bee','honey bee',{biomes:[B.PLAINS],habitat:'air',movement:'flying',sprite:'bee',hp:4,speed:.44,groupMin:3,groupMax:7,width:2,height:2,palette:[[224,170,51],[240,224,153],[52,44,38]],loot:[['honeycomb',1,1,.22]]}),
  species('grassland_fox','grassland fox',{biomes:[B.PLAINS],temperament:'hostile',sprite:'fox',hp:20,contactDamage:4,speed:.55,spawnWeight:.7,palette:[[194,100,48],[240,198,132],[71,47,36]],loot:[['raw_meat',1,2,.8],['fine_fur',1,1,1],['fang',1,1,.35]]}),
  species('tusk_boar','tusk boar',{biomes:[B.PLAINS],temperament:'hostile',movement:'charger',sprite:'boar',hp:42,contactDamage:7,speed:.42,width:5,height:4,hitRadius:3,spawnWeight:.42,palette:[[91,70,55],[160,119,85],[225,213,174]],loot:[['raw_meat',2,4,1],['small_hide',1,2,.9],['fang',1,2,.7]]}),
  species('thorn_hornet','thorn hornet',{biomes:[B.PLAINS,B.GIANT_FOREST],habitat:'air',movement:'flying',temperament:'hostile',sprite:'hornet',hp:9,contactDamage:3,speed:.62,groupMin:2,groupMax:4,palette:[[183,124,41],[245,205,91],[42,39,42]],loot:[['insect_shell',1,1,.6],['venom_sac',1,1,.35]]}),

  // Giant forest
  species('red_squirrel','red squirrel',{biomes:[B.GIANT_FOREST],movement:'climber',sprite:'squirrel',hp:7,speed:.5,groupMin:2,groupMax:4,palette:[[174,81,46],[229,155,95],[69,43,34]],loot:[['raw_meat',1,1,.4],['fine_fur',1,1,.55]]}),
  species('forest_deer','forest deer',{biomes:[B.GIANT_FOREST],sprite:'deer',hp:36,speed:.52,width:5,height:5,hitRadius:3,groupMin:2,groupMax:3,spawnWeight:.45,palette:[[122,82,53],[205,157,104],[54,45,38]],loot:[['raw_meat',2,4,1],['small_hide',1,2,1],['antler',1,2,.55]]}),
  species('hedgehog','hedgehog',{biomes:[B.GIANT_FOREST],sprite:'hedgehog',hp:13,speed:.25,width:4,height:3,palette:[[92,67,52],[179,139,93],[44,39,38]],loot:[['raw_meat',1,1,.5],['small_hide',1,1,.35]]}),
  species('songbird','songbird',{biomes:[B.GIANT_FOREST,B.PLAINS],habitat:'air',movement:'flying',sprite:'bird',hp:5,speed:.55,groupMin:2,groupMax:5,palette:[[82,155,185],[222,192,103],[48,55,65]],loot:[['feather',1,2,.8],['egg',1,1,.12]]}),
  species('dusk_owl','dusk owl',{biomes:[B.GIANT_FOREST],habitat:'air',movement:'flying',sprite:'owl',hp:14,speed:.35,spawnWeight:.45,palette:[[103,86,84],[221,198,151],[42,38,42]],loot:[['feather',1,3,1],['fang',1,1,.15]]}),
  species('bark_beetle','bark beetle',{biomes:[B.GIANT_FOREST],movement:'climber',sprite:'beetle',hp:6,speed:.26,groupMin:2,groupMax:5,palette:[[93,74,45],[161,119,62],[39,36,31]],loot:[['insect_shell',1,1,.7]]}),
  species('grey_wolf','grey wolf',{biomes:[B.GIANT_FOREST,B.SNOW_PEAKS],temperament:'hostile',sprite:'wolf',hp:35,contactDamage:6,speed:.62,width:5,height:4,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.55,palette:[[105,112,117],[184,191,193],[46,52,57]],loot:[['raw_meat',2,3,1],['thick_fur',1,2,1],['fang',1,2,.7]]}),
  species('giant_spider','giant spider',{biomes:[B.GIANT_FOREST],movement:'climber',temperament:'hostile',sprite:'spider',hp:22,contactDamage:5,speed:.48,width:5,height:3,hitRadius:3,palette:[[55,47,55],[142,66,79],[27,25,30]],loot:[['chitin',1,2,.9],['silk',1,3,1],['venom_sac',1,1,.45]]}),
  species('stump_mimic','stump mimic',{biomes:[B.GIANT_FOREST],movement:'ambusher',temperament:'hostile',sprite:'mimic',hp:52,contactDamage:8,speed:.3,width:5,height:5,hitRadius:3,spawnWeight:.28,palette:[[87,59,38],[134,94,53],[42,37,31]],loot:[['raw_meat',1,2,.5],['bone',1,2,.5],['crystal_fragment',1,1,.12]]}),
  species('vine_crawler','vine crawler',{biomes:[B.GIANT_FOREST],temperament:'hostile',sprite:'lizard',hp:18,contactDamage:4,speed:.46,groupMin:1,groupMax:3,palette:[[68,135,67],[143,188,80],[39,66,40]],loot:[['scale',1,2,.8],['venom_sac',1,1,.2]]}),

  // Snow peaks
  species('snow_hare','snow hare',{biomes:[B.SNOW_PEAKS],movement:'hopper',sprite:'hare',hp:9,speed:.5,groupMin:2,groupMax:4,palette:[[226,232,231],[181,201,215],[92,101,110]],loot:[['raw_meat',1,1,.8],['thick_fur',1,1,.85]]}),
  species('mountain_goat','mountain goat',{biomes:[B.SNOW_PEAKS],sprite:'goat',hp:38,speed:.48,width:5,height:5,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.55,palette:[[197,194,181],[229,222,201],[89,78,65]],loot:[['raw_meat',2,4,1],['thick_fur',1,2,1],['horn',1,2,.8]]}),
  species('woolly_yak','woolly yak',{biomes:[B.SNOW_PEAKS],sprite:'yak',hp:58,speed:.3,width:6,height:5,hitRadius:4,spawnWeight:.3,palette:[[71,59,55],[126,104,83],[219,205,174]],loot:[['raw_meat',3,5,1],['thick_fur',2,4,1],['horn',1,2,.65]]}),
  species('snow_owl','snow owl',{biomes:[B.SNOW_PEAKS],habitat:'air',movement:'flying',sprite:'owl',hp:12,speed:.38,spawnWeight:.6,palette:[[225,231,234],[173,193,211],[70,78,89]],loot:[['feather',1,3,1]]}),
  species('penguin','cliff penguin',{biomes:[B.SNOW_PEAKS,B.OCEAN],sprite:'penguin',hp:18,speed:.25,width:3,height:4,groupMin:2,groupMax:5,spawnWeight:.45,palette:[[42,52,63],[229,234,227],[232,157,60]],loot:[['raw_meat',1,2,.7],['feather',1,2,.8],['fish',1,1,.2]]}),
  species('glacier_beetle','glacier beetle',{biomes:[B.SNOW_PEAKS],sprite:'beetle',hp:12,speed:.22,groupMin:2,groupMax:4,palette:[[94,157,190],[176,225,240],[45,76,100]],loot:[['insect_shell',1,2,.8],['crystal_fragment',1,1,.2]]}),
  species('frost_fox','frost fox',{biomes:[B.SNOW_PEAKS],temperament:'hostile',sprite:'fox',hp:25,contactDamage:5,speed:.58,palette:[[185,207,220],[233,242,245],[68,83,96]],loot:[['raw_meat',1,2,.8],['thick_fur',1,2,1],['fang',1,1,.45]]}),
  species('ice_mite','ice mite',{biomes:[B.SNOW_PEAKS],movement:'hopper',temperament:'hostile',sprite:'mite',hp:10,contactDamage:3,speed:.42,groupMin:2,groupMax:5,palette:[[117,187,218],[217,246,252],[54,91,119]],loot:[['chitin',1,1,.75],['crystal_fragment',1,1,.15]]}),
  species('snow_wolf','snow wolf',{biomes:[B.SNOW_PEAKS],temperament:'hostile',sprite:'wolf',hp:39,contactDamage:7,speed:.65,width:5,height:4,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.4,palette:[[171,183,191],[230,235,235],[72,82,91]],loot:[['raw_meat',2,3,1],['thick_fur',1,2,1],['fang',1,2,.75]]}),

  // Bamboo grove
  species('giant_panda','giant panda',{biomes:[B.BAMBOO_GROVE],sprite:'panda',hp:52,speed:.25,width:6,height:5,hitRadius:4,spawnWeight:.25,palette:[[42,47,48],[226,224,206],[107,150,68]],loot:[['raw_meat',2,4,.8],['thick_fur',2,3,1]]}),
  species('red_panda','red panda',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'squirrel',hp:16,speed:.5,width:4,height:3,palette:[[179,76,45],[230,164,93],[57,45,40]],loot:[['raw_meat',1,1,.45],['fine_fur',1,2,.9]]}),
  species('bamboo_pheasant','bamboo pheasant',{biomes:[B.BAMBOO_GROVE],habitat:'air',movement:'flying',sprite:'bird',hp:10,speed:.42,groupMin:2,groupMax:4,palette:[[73,137,91],[210,174,72],[62,52,48]],loot:[['feather',1,3,1],['bright_feather',1,1,.45],['egg',1,1,.18]]}),
  species('leaf_gecko','leaf gecko',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'gecko',hp:7,speed:.42,groupMin:2,groupMax:4,palette:[[105,164,62],[184,211,94],[55,85,43]],loot:[['scale',1,1,.55]]}),
  species('bamboo_beetle','bamboo beetle',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'beetle',hp:7,speed:.25,groupMin:2,groupMax:5,palette:[[81,126,56],[149,181,76],[42,62,37]],loot:[['insect_shell',1,1,.75]]}),
  species('dart_frog','dart frog',{biomes:[B.BAMBOO_GROVE,B.SWAMP],movement:'hopper',sprite:'frog',hp:6,speed:.46,groupMin:2,groupMax:4,palette:[[56,177,151],[229,178,56],[35,76,69]],loot:[['venom_sac',1,1,.28]]}),
  species('stalker_mantis','stalker mantis',{biomes:[B.BAMBOO_GROVE],temperament:'hostile',sprite:'mantis',hp:22,contactDamage:5,speed:.52,width:4,height:5,hitRadius:3,palette:[[85,157,62],[178,204,76],[43,72,38]],loot:[['chitin',1,2,.9],['venom_sac',1,1,.25]]}),
  species('vine_snake','vine snake',{biomes:[B.BAMBOO_GROVE],temperament:'hostile',sprite:'snake',hp:18,contactDamage:5,speed:.48,width:5,height:2,hitRadius:3,palette:[[58,118,54],[136,181,67],[32,63,34]],loot:[['raw_meat',1,2,.6],['scale',1,2,1],['venom_sac',1,1,.45]]}),

  // Swamp
  species('marsh_frog','marsh frog',{biomes:[B.SWAMP],movement:'hopper',sprite:'frog',hp:7,speed:.42,groupMin:2,groupMax:5,palette:[[74,137,73],[151,181,86],[42,72,48]],loot:[['raw_meat',1,1,.45]]}),
  species('reed_duck','reed duck',{biomes:[B.SWAMP],habitat:'air',movement:'flying',sprite:'duck',hp:12,speed:.38,groupMin:2,groupMax:5,palette:[[80,112,80],[185,155,78],[226,210,161]],loot:[['raw_meat',1,2,.7],['feather',1,3,1],['egg',1,1,.2]]}),
  species('bog_turtle','bog turtle',{biomes:[B.SWAMP],sprite:'turtle',hp:28,speed:.18,width:5,height:3,hitRadius:3,palette:[[73,96,57],[132,137,70],[41,56,39]],loot:[['raw_meat',1,2,.6],['shell',1,2,1]]}),
  species('firefly','firefly',{biomes:[B.SWAMP],habitat:'air',movement:'flying',sprite:'firefly',hp:3,speed:.3,groupMin:3,groupMax:8,width:2,height:2,palette:[[96,111,57],[222,237,102],[50,54,38]],loot:[['glow_dust',1,1,.3]]}),
  species('lantern_newt','lantern newt',{biomes:[B.SWAMP],sprite:'newt',hp:10,speed:.3,groupMin:2,groupMax:4,palette:[[69,122,105],[203,177,74],[39,65,58]],loot:[['scale',1,1,.5],['glow_dust',1,1,.12]]}),
  species('swamp_rat','swamp rat',{biomes:[B.SWAMP],temperament:'hostile',sprite:'rat',hp:15,contactDamage:4,speed:.5,groupMin:2,groupMax:5,palette:[[92,86,66],[154,136,94],[47,45,39]],loot:[['raw_meat',1,1,.65],['small_hide',1,1,.45],['fang',1,1,.2]]}),
  species('giant_leech','giant leech',{biomes:[B.SWAMP],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'leech',hp:18,contactDamage:5,speed:.42,width:5,height:2,hitRadius:3,palette:[[91,48,61],[164,72,76],[42,31,37]],loot:[['raw_meat',1,2,.5],['slime_gel',1,2,.8]]}),
  species('mosquito_swarm','mosquito swarm',{biomes:[B.SWAMP],habitat:'air',movement:'flying',temperament:'hostile',sprite:'swarm',hp:8,contactDamage:3,speed:.58,groupMin:2,groupMax:4,palette:[[86,76,68],[191,162,100],[41,39,39]],loot:[['insect_shell',1,1,.25]]}),
  species('mud_crab','mud crab',{biomes:[B.SWAMP],temperament:'hostile',sprite:'crab',hp:25,contactDamage:5,speed:.3,width:5,height:3,hitRadius:3,palette:[[112,78,53],[176,119,64],[53,46,39]],loot:[['raw_meat',1,2,.8],['shell',1,2,.75],['crab_claw',1,2,1]]}),
  species('bog_crawler','bog crawler',{biomes:[B.SWAMP],temperament:'hostile',sprite:'crawler',hp:31,contactDamage:6,speed:.38,width:5,height:4,hitRadius:3,palette:[[62,87,61],[124,125,70],[38,49,39]],loot:[['raw_meat',1,3,.8],['chitin',1,2,.55],['slime_gel',1,2,.45]]}),

  // Volcano
  species('ember_lizard','ember lizard',{biomes:[B.VOLCANO],sprite:'lizard',hp:14,speed:.42,groupMin:2,groupMax:4,palette:[[139,54,38],[234,118,47],[64,38,35]],loot:[['raw_meat',1,1,.5],['ember_scale',1,2,.9]]}),
  species('ash_beetle','ash beetle',{biomes:[B.VOLCANO],sprite:'beetle',hp:12,speed:.25,groupMin:2,groupMax:5,palette:[[77,70,70],[139,94,67],[39,36,38]],loot:[['insect_shell',1,2,.75],['ash_core',1,1,.25]]}),
  species('magma_moth','magma moth',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',sprite:'moth',hp:8,speed:.38,groupMin:2,groupMax:5,palette:[[111,57,49],[237,131,53],[251,205,91]],loot:[['ember_scale',1,1,.5],['glow_dust',1,1,.25]]}),
  species('cinder_imp','cinder imp',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',temperament:'hostile',sprite:'imp',hp:24,contactDamage:5,speed:.48,palette:[[112,48,48],[226,81,42],[255,179,63]],loot:[['ash_core',1,1,.8],['ember_gland',1,1,.35],['fang',1,1,.3]]}),
  species('fire_bat','fire bat',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',temperament:'hostile',sprite:'bat',hp:16,contactDamage:4,speed:.58,groupMin:2,groupMax:4,palette:[[79,44,49],[188,67,47],[244,134,48]],loot:[['raw_meat',1,1,.45],['ember_scale',1,1,.5],['fang',1,1,.3]]}),
  species('lava_crab','lava crab',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'crab',hp:34,contactDamage:7,speed:.28,width:5,height:3,hitRadius:3,palette:[[129,49,37],[233,78,34],[255,178,54]],loot:[['crab_claw',1,2,1],['ember_scale',1,2,.8],['ember_gland',1,1,.25]]}),
  species('ash_crawler','ash crawler',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'crawler',hp:28,contactDamage:6,speed:.42,width:5,height:3,hitRadius:3,palette:[[72,61,60],[145,83,59],[217,93,42]],loot:[['ash_core',1,2,.8],['chitin',1,2,.7]]}),
  species('obsidian_scarab','obsidian scarab',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'beetle',hp:30,contactDamage:5,speed:.3,width:4,height:3,spawnWeight:.45,palette:[[39,36,48],[88,65,99],[224,81,54]],loot:[['chitin',1,2,1],['ash_core',1,2,.65],['crystal_fragment',1,1,.2]]}),

  // Ocean
  species('reef_fish','reef fish',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'fish',hp:7,speed:.48,groupMin:3,groupMax:7,palette:[[59,161,179],[236,184,76],[34,91,116]],loot:[['fish',1,1,.85],['fin',1,1,.35]]}),
  species('seahorse','seahorse',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'seahorse',hp:8,speed:.25,groupMin:2,groupMax:4,palette:[[211,143,67],[239,196,104],[92,80,54]],loot:[['fish',1,1,.45],['scale',1,1,.35]]}),
  species('sea_turtle','sea turtle',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'turtle',hp:38,speed:.3,width:6,height:4,hitRadius:4,spawnWeight:.35,palette:[[54,123,103],[126,156,90],[37,72,65]],loot:[['raw_meat',1,3,.55],['shell',1,3,1]]}),
  species('dolphin','dolphin',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'dolphin',hp:42,speed:.62,width:6,height:3,hitRadius:4,groupMin:2,groupMax:4,spawnWeight:.35,palette:[[79,142,174],[177,210,221],[38,78,104]],loot:[['fish',2,4,.55],['fin',1,2,.8]]}),
  species('moon_jelly','moon jelly',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'jellyfish',hp:12,speed:.2,groupMin:2,groupMax:5,palette:[[150,174,226],[220,226,248],[90,93,163]],loot:[['slime_gel',1,2,.8],['glow_dust',1,1,.25]]}),
  species('sand_crab','sand crab',{biomes:[B.OCEAN],sprite:'crab',hp:16,speed:.25,groupMin:2,groupMax:5,palette:[[191,137,83],[225,177,109],[89,65,50]],loot:[['raw_meat',1,1,.6],['shell',1,1,.7],['crab_claw',1,2,.8]]}),
  species('lantern_fish','lantern fish',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'fish',hp:10,speed:.35,groupMin:2,groupMax:5,spawnWeight:.55,palette:[[52,67,112],[105,201,190],[224,239,145]],loot:[['fish',1,2,.8],['glow_dust',1,1,.35]]}),
  species('piranha','piranha',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'fish',hp:14,contactDamage:4,speed:.65,groupMin:3,groupMax:6,palette:[[150,72,65],[226,169,93],[62,49,51]],loot:[['fish',1,2,.8],['fang',1,1,.5],['fin',1,1,.4]]}),
  species('shark_pup','shark pup',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'shark',hp:42,contactDamage:8,speed:.7,width:7,height:4,hitRadius:4,spawnWeight:.4,palette:[[75,111,134],[177,198,205],[37,58,72]],loot:[['fish',2,4,1],['fang',1,3,.9],['fin',1,2,1]]}),
  species('electric_eel','electric eel',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'eel',hp:28,contactDamage:6,speed:.5,width:7,height:2,hitRadius:4,palette:[[65,79,126],[123,160,222],[216,225,120]],loot:[['fish',1,3,.75],['eel_gland',1,2,1]]}),
  species('reef_squid','reef squid',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'squid',hp:30,contactDamage:6,speed:.48,width:5,height:5,hitRadius:3,palette:[[126,68,150],[206,118,169],[61,43,89]],loot:[['raw_meat',1,3,.8],['ink_sac',1,2,1]]}),

  // Standard caves
  species('cave_bat','cave bat',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave_air',movement:'flying',sprite:'bat',hp:8,speed:.5,groupMin:2,groupMax:6,palette:[[76,68,83],[135,111,126],[37,35,42]],loot:[['raw_meat',1,1,.35],['fang',1,1,.15]]}),
  species('glow_worm','glow worm',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'climber',sprite:'worm',hp:4,speed:.15,groupMin:2,groupMax:6,palette:[[80,101,62],[194,228,99],[47,53,41]],loot:[['glow_dust',1,1,.55]]}),
  species('stone_beetle','stone beetle',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',sprite:'beetle',hp:14,speed:.22,groupMin:2,groupMax:5,palette:[[83,81,77],[139,132,117],[42,41,40]],loot:[['insect_shell',1,2,.8],['chitin',1,1,.35]]}),
  species('cave_spider','cave spider',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'climber',temperament:'hostile',sprite:'spider',hp:20,contactDamage:5,speed:.48,width:5,height:3,hitRadius:3,palette:[[67,57,72],[126,83,124],[30,28,34]],loot:[['chitin',1,2,.9],['silk',1,3,1],['venom_sac',1,1,.4]]}),
  species('rock_mite','rock mite',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'mite',hp:13,contactDamage:4,speed:.4,groupMin:2,groupMax:5,palette:[[92,86,75],[163,144,102],[45,43,39]],loot:[['chitin',1,1,.85],['crystal_fragment',1,1,.08]]}),
  species('crystal_scorpion','crystal scorpion',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',temperament:'hostile',sprite:'scorpion',hp:32,contactDamage:7,speed:.36,width:6,height:4,hitRadius:4,spawnWeight:.45,palette:[[81,64,126],[150,119,220],[217,201,255]],loot:[['chitin',1,2,1],['venom_sac',1,1,.55],['crystal_fragment',1,3,.8]]}),
  species('burrow_worm','burrow worm',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'burrower',temperament:'hostile',sprite:'worm',hp:27,contactDamage:6,speed:.45,width:6,height:2,hitRadius:4,palette:[[129,88,66],[190,137,91],[65,51,45]],loot:[['raw_meat',1,3,.65],['chitin',1,2,.5],['fang',1,1,.25]]}),
  species('cave_slime','cave slime',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'slime',hp:18,contactDamage:4,speed:.32,width:4,height:3,hitRadius:3,palette:[[66,139,115],[119,201,157],[35,72,65]],loot:[['slime_gel',1,3,1]]}),

  // Mushroom caverns
  species('spore_moth','spore moth',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave_air',movement:'flying',sprite:'moth',hp:7,speed:.35,groupMin:2,groupMax:5,palette:[[139,80,145],[217,143,196],[237,198,126]],loot:[['spore_sac',1,1,.35],['glow_dust',1,1,.2]]}),
  species('mushroom_snail','mushroom snail',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',sprite:'snail',hp:16,speed:.12,width:5,height:3,palette:[[114,87,77],[194,102,145],[232,165,186]],loot:[['mushroom_flesh',1,2,.8],['shell',1,1,.65]]}),
  species('glowcap_beetle','glowcap beetle',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',sprite:'beetle',hp:10,speed:.22,groupMin:2,groupMax:5,palette:[[96,61,112],[190,91,166],[224,192,114]],loot:[['insect_shell',1,1,.75],['glow_dust',1,1,.45],['spore_sac',1,1,.2]]}),
  species('puffcap_hopper','puffcap hopper',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'frog',hp:17,contactDamage:4,speed:.42,palette:[[131,69,126],[219,117,169],[231,184,117]],loot:[['mushroom_flesh',1,2,.75],['spore_sac',1,2,.75]]}),
  species('mycelial_grub','mycelial grub',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',temperament:'hostile',sprite:'grub',hp:20,contactDamage:4,speed:.3,groupMin:2,groupMax:4,palette:[[189,147,153],[220,194,171],[98,72,81]],loot:[['mushroom_flesh',1,3,.9],['spore_sac',1,1,.4],['slime_gel',1,1,.25]]}),
  species('sporeling','sporeling',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',movement:'ambusher',temperament:'hostile',sprite:'sporeling',hp:26,contactDamage:5,speed:.32,width:4,height:5,hitRadius:3,palette:[[125,70,128],[210,103,167],[229,181,111]],loot:[['mushroom_flesh',1,2,.8],['spore_sac',1,3,1]]}),

  // Unstable-portal invaders. They retain a nominal habitat for registry and
  // renderer compatibility, but spawnWeight 0 keeps them out of ordinary
  // biome generation. The enemy system creates them through invasion rifts.
  species('ember_raider','ember raider',{biomes:[B.VOLCANO],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'charger',sprite:'imp',hp:34,contactDamage:7,speed:.52,width:4,height:5,hitRadius:3,palette:[[124,38,31],[255,111,38],[255,214,91]],loot:[['ash_core',1,2,.8],['ember_gland',1,1,.35]],behaviors:['pack_hunter','nest_builder']}),
  species('frost_borer','frost borer',{biomes:[B.SNOW_PEAKS],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'burrower',sprite:'worm',hp:38,contactDamage:7,speed:.46,width:7,height:2,hitRadius:4,palette:[[116,188,224],[226,249,255],[52,83,128]],loot:[['crystal_fragment',1,3,.8],['chitin',1,2,.65]],behaviors:['burrower']}),
  species('prism_mimic','prism mimic',{biomes:[B.GIANT_FOREST],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'ambusher',sprite:'mimic',hp:58,contactDamage:9,speed:.34,width:5,height:5,hitRadius:4,palette:[[117,58,191],[255,78,207],[77,245,219]],loot:[['crystal_fragment',2,4,1]],behaviors:['mimic']}),
  species('gear_gremlin','gear gremlin',{biomes:[B.PLAINS],spawnWeight:0,invasionOnly:true,temperament:'hostile',sprite:'imp',hp:30,contactDamage:4,speed:.6,width:4,height:4,hitRadius:3,palette:[[130,93,47],[236,177,72],[47,42,38]],loot:[['crystal_fragment',1,2,.55],['chitin',1,1,.45]],behaviors:['weapon_thief','scavenger','wall_climber']}),
  species('static_leech','static leech',{biomes:[B.SWAMP],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'flying',sprite:'leech',hp:18,contactDamage:2,speed:.68,width:5,height:2,hitRadius:3,palette:[[255,43,197],[70,255,211],[92,53,166]],loot:[['slime_gel',1,2,.75],['crystal_fragment',1,1,.35]],behaviors:['parasite','pack_hunter']}),
  species('void_climber','void climber',{undergroundBiomes:[U.STANDARD_CAVES],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'climber',sprite:'spider',hp:36,contactDamage:6,speed:.54,width:5,height:3,hitRadius:3,palette:[[42,33,68],[121,86,188],[232,235,255]],loot:[['silk',1,3,.9],['crystal_fragment',1,2,.45]],behaviors:['wall_climber','nest_builder']}),
]);



const BEHAVIOR_OVERRIDES=Object.freeze({
  burrow_badger:['burrower'],
  burrow_worm:['burrower'],
  red_squirrel:['wall_climber'],
  bark_beetle:['wall_climber'],
  giant_spider:['wall_climber','nest_builder'],
  red_panda:['wall_climber'],
  cave_spider:['wall_climber','nest_builder'],
  glow_worm:['wall_climber'],
  grassland_fox:['pack_hunter'],
  grey_wolf:['pack_hunter'],
  snow_wolf:['pack_hunter'],
  fire_bat:['pack_hunter'],
  piranha:['pack_hunter'],
  thorn_hornet:['pack_hunter','nest_builder'],
  honey_bee:['nest_builder'],
  stump_mimic:['mimic'],
  sporeling:['mimic','nest_builder'],
  field_mouse:['scavenger'],
  swamp_rat:['scavenger'],
  tusk_boar:['scavenger'],
  sand_crab:['scavenger'],
  mud_crab:['scavenger'],
  giant_leech:['parasite'],
  rock_mite:['parasite'],
  ice_mite:['parasite'],
});

export function faunaBehaviors(speciesOrId){
  const species=typeof speciesOrId==='string'?faunaById(speciesOrId):speciesOrId;
  if(!species)return [];
  const combined=[...(BEHAVIOR_OVERRIDES[species.id]??[]),...(species.behaviors??[])];
  return [...new Set(combined)];
}

export const INVADER_SPECIES_BY_DIMENSION=Object.freeze({
  emberdeep:['ember_raider','frost_borer'],
  frostvoid:['frost_borer','void_climber'],
  prism:['prism_mimic','static_leech'],
  abyss:['static_leech','void_climber'],
  verdant:['void_climber','prism_mimic'],
  clockwork:['gear_gremlin','void_climber'],
  dream:['prism_mimic','static_leech'],
  skyrealm:['static_leech','gear_gremlin'],
  static:['gear_gremlin','static_leech','prism_mimic'],
  moon:['void_climber','gear_gremlin'],
  earth:['ember_raider','frost_borer','gear_gremlin','static_leech'],
});
const faunaByIdMap=new Map(FAUNA_DB.map(item=>[item.id,item]));
export function faunaById(id){ return faunaByIdMap.get(id)??null; }

export function faunaForSurfaceBiome(biomeId,habitat=null){
  return FAUNA_DB.filter(item=>item.biomes.includes(biomeId)&&(!habitat||item.habitat===habitat));
}

export function faunaForUndergroundBiome(biomeId,habitat=null){
  return FAUNA_DB.filter(item=>item.undergroundBiomes.includes(biomeId)&&(!habitat||item.habitat===habitat));
}
