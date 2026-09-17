class_name GameData
extends RefCounted

# Material ids are intentionally identical to the browser implementation.
const AIR: int = 0
const ROCK: int = 1
const DIRT: int = 2
const GRASS: int = 3
const WATER: int = 4
const SAND: int = 5
const WOOD: int = 6
const LEAF: int = 7
const LAVA: int = 8
const CRYSTAL: int = 9
const FIRE: int = 10
const NAPALM: int = 11
const SMOKE: int = 12
const SNOW: int = 13
const MUD: int = 14
const BAMBOO: int = 15
const ASH: int = 16
const MYCELIUM: int = 17
const MUSHROOM_STEM: int = 18
const MUSHROOM_CAP: int = 19
const STEAM: int = 20
const CROP_STEM: int = 21
const CROP_LEAF: int = 22
const CROP_FRUIT: int = 23
const MATERIAL_COUNT: int = 24

const MATERIALS: Array[Dictionary] = [
	{"id": AIR, "name": "air", "solid": false, "collectable": false, "placeable": false, "dynamic": false, "flammable": false},
	{"id": ROCK, "name": "rock", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": false},
	{"id": DIRT, "name": "dirt", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": false},
	{"id": GRASS, "name": "grass", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": WATER, "name": "water", "solid": false, "collectable": true, "placeable": false, "dynamic": true, "flammable": false},
	{"id": SAND, "name": "sand", "solid": true, "collectable": true, "placeable": true, "dynamic": true, "flammable": false},
	{"id": WOOD, "name": "wood", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": LEAF, "name": "leaf", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": LAVA, "name": "lava", "solid": false, "collectable": true, "placeable": false, "dynamic": true, "flammable": false},
	{"id": CRYSTAL, "name": "crystal", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": false},
	{"id": FIRE, "name": "fire", "solid": false, "collectable": false, "placeable": false, "dynamic": true, "flammable": false},
	{"id": NAPALM, "name": "napalm", "solid": false, "collectable": true, "placeable": false, "dynamic": true, "flammable": false},
	{"id": SMOKE, "name": "smoke", "solid": false, "collectable": false, "placeable": false, "dynamic": true, "flammable": false},
	{"id": SNOW, "name": "snow", "solid": true, "collectable": true, "placeable": true, "dynamic": true, "flammable": false},
	{"id": MUD, "name": "mud", "solid": true, "collectable": true, "placeable": true, "dynamic": true, "flammable": true},
	{"id": BAMBOO, "name": "bamboo", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": ASH, "name": "ash", "solid": true, "collectable": true, "placeable": true, "dynamic": true, "flammable": true},
	{"id": MYCELIUM, "name": "mycelium dirt", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": MUSHROOM_STEM, "name": "mushroom stem", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": MUSHROOM_CAP, "name": "mushroom cap", "solid": true, "collectable": true, "placeable": true, "dynamic": false, "flammable": true},
	{"id": STEAM, "name": "steam", "solid": false, "collectable": false, "placeable": false, "dynamic": true, "flammable": false},
	{"id": CROP_STEM, "name": "crop stem", "solid": true, "collectable": false, "placeable": false, "dynamic": false, "flammable": true},
	{"id": CROP_LEAF, "name": "crop leaves", "solid": false, "collectable": false, "placeable": false, "dynamic": false, "flammable": true},
	{"id": CROP_FRUIT, "name": "crop produce", "solid": true, "collectable": false, "placeable": false, "dynamic": false, "flammable": true},
]
const POWDERS: Array[int] = [SAND, SNOW, MUD, ASH]
const LIQUIDS: Array[int] = [WATER, LAVA, NAPALM]
const GASES: Array[int] = [SMOKE, STEAM]
const CROPS_MATERIALS: Array[int] = [CROP_STEM, CROP_LEAF, CROP_FRUIT]

const BIOME_REGION_SIZE: int = 960
const BIOME_TRANSITION_WIDTH: int = 280
const PLAINS: int = 0
const SNOW_PEAKS: int = 1
const BAMBOO_GROVE: int = 2
const SWAMP: int = 3
const VOLCANO: int = 4
const GIANT_FOREST: int = 5
const OCEAN: int = 6
const BIOMES: Array[Dictionary] = [
	{"id": PLAINS, "name": "plains", "sky_top": [91, 166, 224], "sky_bottom": [151, 201, 229]},
	{"id": SNOW_PEAKS, "name": "snow_peaks", "sky_top": [142, 178, 222], "sky_bottom": [210, 225, 238]},
	{"id": BAMBOO_GROVE, "name": "bamboo_grove", "sky_top": [91, 157, 170], "sky_bottom": [157, 199, 181]},
	{"id": SWAMP, "name": "swamp", "sky_top": [103, 137, 132], "sky_bottom": [157, 174, 145]},
	{"id": VOLCANO, "name": "volcano", "sky_top": [104, 82, 86], "sky_bottom": [181, 135, 111]},
	{"id": GIANT_FOREST, "name": "giant_forest", "sky_top": [74, 137, 184], "sky_bottom": [133, 184, 198]},
	{"id": OCEAN, "name": "ocean", "sky_top": [57, 142, 207], "sky_bottom": [137, 199, 224]},
]

const WEAPONS: Array[Dictionary] = [
	{"id": 0, "name": "gun", "cooldown": 9, "terrain_damage": "negligible"},
	{"id": 1, "name": "napalm_sprayer", "cooldown": 2, "terrain_damage": "fire only"},
	{"id": 2, "name": "glaive", "cooldown": 24, "terrain_damage": "none"},
	{"id": 3, "name": "hook", "cooldown": 8, "terrain_damage": "none"},
	{"id": 4, "name": "sword", "cooldown": 16, "terrain_damage": "none"},
	{"id": 5, "name": "grenade", "cooldown": 34, "terrain_damage": "circular blast"},
	{"id": 6, "name": "destruculator", "cooldown": 4, "terrain_damage": "extract only"},
	{"id": 7, "name": "drone_strike", "cooldown": 210, "terrain_damage": "large circular strike"},
	{"id": 8, "name": "laser_rifle", "cooldown": 1, "terrain_damage": "continuous heat"},
	{"id": 9, "name": "nyan_cat_launcher", "cooldown": 150, "terrain_damage": "rainbow star burst"},
	{"id": 10, "name": "reality_zipper", "cooldown": 270, "terrain_damage": "temporary psychedelic rift"},
]

const CROPS: Array[Dictionary] = [
	{},
	{"id":1,"name":"carrot","seed_name":"carrot seeds","produce_name":"carrot","pattern":"root","mature_height":4,"canopy_radius":2,"heal":7,"produce_min":2,"produce_max":4,"seed_min":2,"seed_max":5,"stem":[76,151,70],"leaf":[55,174,69],"fruit":[235,112,37],"seed":[147,105,58]},
	{"id":2,"name":"potato","seed_name":"seed potatoes","produce_name":"potato","pattern":"bush","mature_height":5,"canopy_radius":3,"heal":8,"produce_min":3,"produce_max":6,"seed_min":2,"seed_max":4,"stem":[82,139,74],"leaf":[61,151,69],"fruit":[190,150,89],"seed":[169,127,75]},
	{"id":3,"name":"tomato","seed_name":"tomato seeds","produce_name":"tomato","pattern":"vine","mature_height":8,"canopy_radius":3,"heal":9,"produce_min":3,"produce_max":7,"seed_min":3,"seed_max":6,"stem":[63,151,70],"leaf":[43,133,57],"fruit":[226,55,47],"seed":[209,184,92]},
	{"id":4,"name":"corn","seed_name":"corn kernels","produce_name":"corn cob","pattern":"stalk","mature_height":11,"canopy_radius":2,"heal":10,"produce_min":2,"produce_max":4,"seed_min":4,"seed_max":8,"stem":[101,167,67],"leaf":[73,151,58],"fruit":[241,198,55],"seed":[218,171,53]},
	{"id":5,"name":"pumpkin","seed_name":"pumpkin seeds","produce_name":"pumpkin","pattern":"mound","mature_height":4,"canopy_radius":5,"heal":15,"produce_min":1,"produce_max":3,"seed_min":4,"seed_max":8,"stem":[67,137,58],"leaf":[47,126,54],"fruit":[232,119,32],"seed":[218,192,126]},
	{"id":6,"name":"strawberry","seed_name":"strawberry seeds","produce_name":"strawberry","pattern":"low_bush","mature_height":3,"canopy_radius":3,"heal":6,"produce_min":4,"produce_max":8,"seed_min":3,"seed_max":6,"stem":[63,147,63],"leaf":[45,139,55],"fruit":[225,47,65],"seed":[244,205,77]},
	{"id":7,"name":"blueberry","seed_name":"blueberry seeds","produce_name":"blueberries","pattern":"bush","mature_height":6,"canopy_radius":4,"heal":7,"produce_min":4,"produce_max":9,"seed_min":3,"seed_max":6,"stem":[83,121,67],"leaf":[54,128,71],"fruit":[72,83,185],"seed":[156,112,72]},
	{"id":8,"name":"pepper","seed_name":"pepper seeds","produce_name":"pepper","pattern":"bush","mature_height":6,"canopy_radius":3,"heal":8,"produce_min":3,"produce_max":6,"seed_min":3,"seed_max":7,"stem":[62,144,65],"leaf":[47,128,57],"fruit":[221,62,48],"seed":[225,195,102]},
	{"id":9,"name":"cucumber","seed_name":"cucumber seeds","produce_name":"cucumber","pattern":"vine","mature_height":7,"canopy_radius":5,"heal":9,"produce_min":3,"produce_max":6,"seed_min":3,"seed_max":7,"stem":[59,144,63],"leaf":[44,132,58],"fruit":[79,169,75],"seed":[214,194,128]},
	{"id":10,"name":"eggplant","seed_name":"eggplant seeds","produce_name":"eggplant","pattern":"bush","mature_height":7,"canopy_radius":3,"heal":10,"produce_min":2,"produce_max":5,"seed_min":3,"seed_max":6,"stem":[72,139,68],"leaf":[52,125,65],"fruit":[112,54,145],"seed":[201,169,104]},
	{"id":11,"name":"cabbage","seed_name":"cabbage seeds","produce_name":"cabbage","pattern":"rosette","mature_height":3,"canopy_radius":4,"heal":12,"produce_min":1,"produce_max":3,"seed_min":3,"seed_max":6,"stem":[72,144,74],"leaf":[78,163,91],"fruit":[130,189,112],"seed":[150,104,68]},
	{"id":12,"name":"sunflower","seed_name":"sunflower seeds","produce_name":"sunflower head","pattern":"flower","mature_height":12,"canopy_radius":3,"heal":8,"produce_min":1,"produce_max":2,"seed_min":6,"seed_max":12,"stem":[76,151,65],"leaf":[56,137,57],"fruit":[231,176,43],"seed":[95,72,52]},
]


const FURNITURE_MAX_PER_DIMENSION: int = 160
const SIGN_LABELS: Array[String] = ["HOME", "MINE", "FARM", "PORTAL", "DANGER", "REST"]
const FURNITURE: Array[Dictionary] = [
	{"id":"workbench","name":"workbench","category":"work","w":7,"h":4,"placement":"floor","action":"craft","recipe":[[WOOD,8],[ROCK,2]],"sprite":["wwwwwww","wddwddw","w w w w","w w w w"],"solid_rects":[[0,0,7,1],[0,1,1,3],[3,1,1,3],[6,1,1,3]]},
	{"id":"wood_table","name":"wood table","category":"tables","w":7,"h":4,"placement":"floor","recipe":[[WOOD,6]],"sprite":["wwwwwww","ddddddd","w     w","w     w"],"solid_rects":[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
	{"id":"stone_table","name":"stone table","category":"tables","w":7,"h":4,"placement":"floor","recipe":[[ROCK,7]],"sprite":["sssssss","sdddsds","s     s","s     s"],"solid_rects":[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
	{"id":"chair","name":"chair","category":"seating","w":3,"h":4,"placement":"floor","action":"sit","seat_offset_y":-1,"recipe":[[WOOD,4]],"sprite":["w  ","www","w w","w w"],"solid_rects":[[0,0,1,4],[1,1,2,1],[2,2,1,2]]},
	{"id":"stool","name":"stool","category":"seating","w":3,"h":3,"placement":"floor","action":"sit","seat_offset_y":-1,"recipe":[[WOOD,3]],"sprite":["www","w w","w w"],"solid_rects":[[0,0,3,1],[0,1,1,2],[2,1,1,2]]},
	{"id":"door","name":"wood door","category":"doors","w":2,"h":7,"placement":"floor","action":"toggle","recipe":[[WOOD,7]],"sprite":["ww","wd","ww","wd","ww","wd","ww"],"open_sprite":["w ","w ","w ","w ","w ","w ","w "],"solid_rects":[[0,0,2,7]],"open_solid_rects":[[0,0,1,7]]},
	{"id":"gate","name":"base gate","category":"doors","w":5,"h":4,"placement":"floor","action":"toggle","recipe":[[WOOD,7],[ROCK,1]],"sprite":["wwwww","wdwdw","wwwww","w w w"],"open_sprite":["w   w","w   w","w   w","w   w"],"solid_rects":[[0,0,5,3],[0,3,1,1],[2,3,1,1],[4,3,1,1]],"open_solid_rects":[[0,0,1,4],[4,0,1,4]]},
	{"id":"floor_lamp","name":"floor lamp","category":"lights","w":3,"h":7,"placement":"floor","action":"light","light_radius":18,"recipe":[[WOOD,3],[CRYSTAL,2]],"sprite":[" l ","lll"," l "," w "," w "," w ","www"],"solid_rects":[[1,2,1,5],[0,6,3,1]]},
	{"id":"wall_lamp","name":"wall lamp","category":"lights","w":3,"h":3,"placement":"wall","action":"light","light_radius":13,"recipe":[[ROCK,1],[CRYSTAL,1]],"sprite":["sll","sll","s l"],"solid_rects":[[0,0,1,3]]},
	{"id":"lantern","name":"hanging lantern","category":"lights","w":3,"h":4,"placement":"wall","action":"light","light_radius":15,"recipe":[[BAMBOO,2],[CRYSTAL,1]],"sprite":[" w ","wlw","lll"," d "],"solid_rects":[[1,0,1,1]]},
	{"id":"switch","name":"wall switch","category":"utility","w":3,"h":3,"placement":"wall","action":"switch","recipe":[[ROCK,1],[CRYSTAL,1]],"sprite":["sss","sd ","sss"],"solid_rects":[[0,0,1,3]]},
	{"id":"chest","name":"collector chest","category":"storage","w":5,"h":3,"placement":"floor","action":"chest","recipe":[[WOOD,6],[CRYSTAL,1]],"sprite":["wwwww","wdddw","wwwww"],"solid_rects":[[0,0,5,3]]},
	{"id":"bed","name":"bed","category":"comfort","w":7,"h":3,"placement":"floor","action":"sleep","recipe":[[WOOD,5],[LEAF,5]],"sprite":["fffffff","wwwwwww","w     w"],"solid_rects":[[0,0,7,2],[0,2,1,1],[6,2,1,1]]},
	{"id":"bunk_bed","name":"bunk bed","category":"comfort","w":5,"h":7,"placement":"floor","action":"sleep","recipe":[[WOOD,9],[LEAF,8]],"sprite":["fffff","wwwww","w   w","w   w","fffff","wwwww","w   w"],"solid_rects":[[0,0,5,2],[0,2,1,5],[4,2,1,5],[0,4,5,2]]},
	{"id":"ladder","name":"ladder","category":"utility","w":2,"h":7,"placement":"floor","action":"ladder","recipe":[[WOOD,5]],"sprite":["ww","dd","ww","dd","ww","dd","ww"],"solid_rects":[]},
	{"id":"bookshelf","name":"portal bookshelf","category":"storage","w":5,"h":7,"placement":"floor","action":"bookshelf","recipe":[[WOOD,8],[LEAF,2]],"sprite":["wwwww","wcbgw","wwwww","wgbcw","wwwww","wbcgw","wwwww"],"solid_rects":[[0,0,5,7]]},
	{"id":"planter","name":"planter box","category":"garden","w":5,"h":3,"placement":"floor","action":"planter","recipe":[[WOOD,4],[DIRT,3]],"sprite":[" p p ","wdddw","wwwww"],"solid_rects":[[0,1,5,2]]},
	{"id":"sign","name":"base sign","category":"decor","w":5,"h":5,"placement":"floor","action":"sign","recipe":[[WOOD,4]],"sprite":["wwwww","wdddw","wwwww","  w  "," www "],"solid_rects":[[0,0,5,3],[2,3,1,2]]},
	{"id":"clock","name":"wall clock","category":"utility","w":5,"h":5,"placement":"wall","action":"clock","recipe":[[WOOD,2],[CRYSTAL,2]],"sprite":[" www ","wlllw","wlldw","wlllw"," www "],"solid_rects":[]},
	{"id":"rug","name":"woven rug","category":"decor","w":7,"h":1,"placement":"floor","recipe":[[LEAF,3],[BAMBOO,2]],"sprite":["frfrfrf"],"solid_rects":[]},
	{"id":"window","name":"crystal window","category":"walls","w":5,"h":5,"placement":"floor","recipe":[[ROCK,4],[CRYSTAL,3]],"sprite":["sssss","sgggs","sgdgs","sgggs","sssss"],"solid_rects":[[0,0,5,1],[0,4,5,1],[0,1,1,3],[4,1,1,3]]},
	{"id":"fence","name":"wood fence","category":"walls","w":5,"h":3,"placement":"floor","recipe":[[WOOD,4]],"sprite":["wwwww","w w w","wwwww"],"solid_rects":[[0,0,5,1],[0,1,1,2],[2,1,1,2],[4,1,1,2]]},
]
const FURNITURE_PIXEL_COLORS: Dictionary = {"w":Color8(151,94,48),"d":Color8(86,51,32),"s":Color8(126,132,145),"c":Color8(100,206,239),"b":Color8(86,135,220),"g":Color(0.525,0.89,0.965,0.66),"l":Color8(255,235,126),"f":Color8(192,86,105),"r":Color8(233,153,57),"p":Color8(91,198,105),"m":Color8(186,91,195)}

const WEATHER: Dictionary = {
	"clear":{"label":"Clear","precipitation":null,"wind":0.0,"visibility":1.0,"lightning":false,"growth_multiplier":1.0},
	"breeze":{"label":"Breezy","precipitation":null,"wind":0.55,"visibility":1.0,"lightning":false,"growth_multiplier":1.0},
	"rain":{"label":"Rain","precipitation":"rain","wind":0.28,"visibility":0.9,"lightning":false,"growth_multiplier":1.35},
	"thunderstorm":{"label":"Thunderstorm","precipitation":"rain","wind":0.72,"visibility":0.73,"lightning":true,"growth_multiplier":1.5},
	"snow":{"label":"Snowfall","precipitation":"snow","wind":0.2,"visibility":0.9,"lightning":false,"growth_multiplier":0.85},
	"blizzard":{"label":"Blizzard","precipitation":"snow","wind":0.92,"visibility":0.58,"lightning":false,"growth_multiplier":0.62},
	"fog":{"label":"Dense fog","precipitation":null,"wind":0.05,"visibility":0.56,"lightning":false,"growth_multiplier":1.05},
	"heatwave":{"label":"Heatwave","precipitation":null,"wind":0.12,"visibility":0.88,"lightning":false,"growth_multiplier":0.78},
	"ashfall":{"label":"Ashfall","precipitation":"ash","wind":0.38,"visibility":0.7,"lightning":false,"growth_multiplier":0.68},
	"ocean_storm":{"label":"Ocean storm","precipitation":"rain","wind":1.0,"visibility":0.62,"lightning":true,"growth_multiplier":1.45},
	"cave_drip":{"label":"Cave drips","precipitation":"drip","wind":0.0,"visibility":0.92,"lightning":false,"growth_multiplier":1.1},
	"spore_haze":{"label":"Spore haze","precipitation":"spore","wind":0.08,"visibility":0.7,"lightning":false,"growth_multiplier":1.22},
}

const DIMENSIONS: Array[Dictionary] = [
	{"id":"earth","name":"Earth","code":"homeward","terrain":"earth","gravity":1.0,"oxygen":true,"sky_top":[91,166,224],"sky_bottom":[151,201,229],"material_tint":[128,128,128],"tint_strength":0.0,"weather":["clear","breeze","rain","thunderstorm","fog","snow","heatwave"],"portal_colors":[[84,198,126],[92,174,255],[240,231,159],[244,250,255]],"structure":"earth","spawn_x":20},
	{"id":"moon","name":"Moon","code":"moonme","terrain":"moon","gravity":0.38,"oxygen":false,"sky_top":[7,9,21],"sky_bottom":[28,30,55],"material_tint":[172,164,215],"tint_strength":0.14,"weather":["clear"],"portal_colors":[[91,229,255],[130,128,255],[207,92,255],[255,103,205],[244,238,255]],"structure":"lunar","spawn_x":48},
	{"id":"emberdeep","name":"Emberdeep","code":"burnbright","terrain":"ember","gravity":1.08,"oxygen":false,"sky_top":[35,8,12],"sky_bottom":[146,47,24],"material_tint":[226,74,36],"tint_strength":0.22,"weather":["ashfall","heatwave"],"portal_colors":[[255,235,126],[255,121,31],[214,38,28],[76,12,21]],"structure":"ember_fortress","spawn_x":48},
	{"id":"frostvoid","name":"Frostvoid","code":"coldsnap","terrain":"frost","gravity":0.82,"oxygen":true,"sky_top":[15,34,67],"sky_bottom":[105,167,207],"material_tint":[154,215,244],"tint_strength":0.22,"weather":["snow","blizzard","fog"],"portal_colors":[[244,255,255],[148,226,255],[79,148,235],[95,74,202]],"structure":"ice_cathedral","spawn_x":48},
	{"id":"prism","name":"Prismatica","code":"neonpulse","terrain":"prism","gravity":0.72,"oxygen":true,"sky_top":[39,14,74],"sky_bottom":[217,84,188],"material_tint":[214,112,242],"tint_strength":0.18,"weather":["clear","breeze"],"portal_colors":[[255,80,190],[255,222,72],[67,255,176],[72,188,255],[176,84,255]],"structure":"prism_spire","spawn_x":48},
	{"id":"abyss","name":"Blacktide Abyss","code":"blacktide","terrain":"abyss","gravity":0.9,"oxygen":false,"sky_top":[2,13,27],"sky_bottom":[10,54,78],"material_tint":[38,112,154],"tint_strength":0.24,"weather":["ocean_storm","fog"],"portal_colors":[[27,54,82],[29,136,174],[78,230,224],[8,18,36]],"structure":"drowned_dome","spawn_x":48},
	{"id":"verdant","name":"Verdant Wilds","code":"growwild","terrain":"verdant","gravity":0.92,"oxygen":true,"sky_top":[25,87,64],"sky_bottom":[112,205,118],"material_tint":[70,178,86],"tint_strength":0.2,"weather":["rain","fog","breeze"],"portal_colors":[[236,255,137],[88,232,105],[34,145,78],[19,75,55]],"structure":"living_temple","spawn_x":48},
	{"id":"clockwork","name":"Clockwork Expanse","code":"ticktock","terrain":"clockwork","gravity":1.25,"oxygen":false,"sky_top":[42,35,31],"sky_bottom":[148,105,59],"material_tint":[194,136,65],"tint_strength":0.19,"weather":["breeze","clear"],"portal_colors":[[255,225,139],[210,144,53],[111,79,48],[239,241,224]],"structure":"gear_tower","spawn_x":48},
	{"id":"dream","name":"Lucid Dream","code":"lucidloop","terrain":"dream","gravity":0.48,"oxygen":true,"sky_top":[48,19,89],"sky_bottom":[235,108,195],"material_tint":[194,89,210],"tint_strength":0.22,"weather":["spore_haze","fog"],"portal_colors":[[255,165,245],[169,104,255],[81,231,255],[255,247,181]],"structure":"impossible_house","spawn_x":48},
	{"id":"skyrealm","name":"Cloudsea","code":"cloudnine","terrain":"skylands","gravity":0.32,"oxygen":true,"sky_top":[70,137,225],"sky_bottom":[230,242,255],"material_tint":[177,215,244],"tint_strength":0.12,"weather":["breeze","thunderstorm"],"portal_colors":[[255,255,255],[166,228,255],[94,177,255],[255,229,124]],"structure":"cloud_shrine","spawn_x":48},
	{"id":"static","name":"The Static","code":"glitchme","terrain":"static","gravity":0.66,"oxygen":false,"sky_top":[7,2,15],"sky_bottom":[47,9,61],"material_tint":[86,255,202],"tint_strength":0.2,"weather":["fog","thunderstorm"],"portal_colors":[[255,44,198],[53,255,205],[255,245,65],[112,64,255],[245,245,245]],"structure":"glitch_obelisk","spawn_x":48},
]

const PORTAL_CODES: Array[Dictionary] = [
	{"code":"homeward","dimension":"earth"},
	{"code":"moonme","dimension":"moon"},
	{"code":"burnbright","dimension":"emberdeep"},
	{"code":"coldsnap","dimension":"frostvoid"},
	{"code":"neonpulse","dimension":"prism"},
	{"code":"blacktide","dimension":"abyss"},
	{"code":"growwild","dimension":"verdant"},
	{"code":"ticktock","dimension":"clockwork"},
	{"code":"lucidloop","dimension":"dream"},
	{"code":"cloudnine","dimension":"skyrealm"},
	{"code":"glitchme","dimension":"static"},
]


static func furniture(furniture_id: String) -> Dictionary:
	for item: Dictionary in FURNITURE:
		if String(item["id"]) == furniture_id:
			return item
	return {}

static func furniture_bounds(entity: Dictionary, definition: Dictionary = {}) -> Rect2i:
	var resolved: Dictionary = definition if not definition.is_empty() else furniture(String(entity.get("furniture_id", "")))
	if resolved.is_empty():
		return Rect2i()
	var left: int = roundi(float(entity["x"])) - floori(float(int(resolved["w"])) * 0.5)
	var bottom: int = roundi(float(entity["y"]))
	return Rect2i(left, bottom - int(resolved["h"]) + 1, int(resolved["w"]), int(resolved["h"]))

static func furniture_solid_at_entity(entity: Dictionary, x: int, y: int) -> bool:
	var definition: Dictionary = furniture(String(entity.get("furniture_id", "")))
	if definition.is_empty():
		return false
	var bounds: Rect2i = furniture_bounds(entity, definition)
	if not bounds.has_point(Vector2i(x, y)):
		return false
	var local_x: int = x - bounds.position.x
	var local_y: int = y - bounds.position.y
	var rects: Array = definition.get("open_solid_rects", []) if bool(entity.get("open", false)) else definition.get("solid_rects", [])
	for rect_value: Variant in rects:
		var rect: Array = rect_value
		if local_x >= int(rect[0]) and local_x < int(rect[0]) + int(rect[2]) and local_y >= int(rect[1]) and local_y < int(rect[1]) + int(rect[3]):
			return true
	return false

static func material_name(material_id: int) -> String:
	if material_id < 0 or material_id >= MATERIALS.size():
		return "unknown"
	return String(MATERIALS[material_id]["name"])

static func is_solid(material_id: int) -> bool:
	return material_id >= 0 and material_id < MATERIALS.size() and bool(MATERIALS[material_id]["solid"])

static func is_collectable(material_id: int) -> bool:
	return material_id >= 0 and material_id < MATERIALS.size() and bool(MATERIALS[material_id]["collectable"])

static func is_placeable(material_id: int) -> bool:
	return material_id >= 0 and material_id < MATERIALS.size() and bool(MATERIALS[material_id]["placeable"])

static func is_flammable(material_id: int) -> bool:
	return material_id >= 0 and material_id < MATERIALS.size() and bool(MATERIALS[material_id]["flammable"])

static func crop(crop_id: int) -> Dictionary:
	if crop_id <= 0 or crop_id >= CROPS.size():
		return {}
	return CROPS[crop_id]

static func dimension(dimension_id: String) -> Dictionary:
	for item: Dictionary in DIMENSIONS:
		if String(item["id"]) == dimension_id:
			return item
	return DIMENSIONS[0]

static func dimension_by_code(code: String) -> Dictionary:
	var normalized: String = code.to_lower()
	for item: Dictionary in DIMENSIONS:
		if String(item["code"]) == normalized:
			return item
	return {}

static func dimension_has_oxygen(dimension_id: String) -> bool:
	return bool(dimension(dimension_id)["oxygen"])

static func dimension_ids() -> Array[String]:
	var result: Array[String] = []
	for item: Dictionary in DIMENSIONS:
		result.append(String(item["id"]))
	return result

static func color_from_rgb(values: Array) -> Color:
	return Color(float(values[0]) / 255.0, float(values[1]) / 255.0, float(values[2]) / 255.0, 1.0)
