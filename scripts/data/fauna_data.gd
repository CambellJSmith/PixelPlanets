class_name FaunaData
extends RefCounted

const LOOT: Array[Dictionary] = [
	{"id":"raw_meat","name":"raw meat","color":[188,72,72],"cook_to":"cooked_meat"},
	{"id":"cooked_meat","name":"cooked meat","color":[174,94,48],"edible":true,"hunger_restore":34,"health_restore":4},
	{"id":"small_hide","name":"small hide","color":[145,101,66]},
	{"id":"thick_fur","name":"thick fur","color":[217,220,215]},
	{"id":"fine_fur","name":"fine fur","color":[183,127,79]},
	{"id":"feather","name":"feather","color":[214,222,230]},
	{"id":"bright_feather","name":"bright feather","color":[103,178,194]},
	{"id":"egg","name":"wild egg","color":[230,216,165],"cook_to":"cooked_egg"},
	{"id":"cooked_egg","name":"cooked egg","color":[244,194,88],"edible":true,"hunger_restore":18,"health_restore":2},
	{"id":"horn","name":"horn","color":[195,184,151]},
	{"id":"antler","name":"antler","color":[143,103,67]},
	{"id":"fang","name":"fang","color":[231,226,202]},
	{"id":"claw","name":"claw","color":[204,194,166]},
	{"id":"bone","name":"bone","color":[216,211,183]},
	{"id":"chitin","name":"chitin plate","color":[82,75,93]},
	{"id":"insect_shell","name":"insect shell","color":[100,117,71]},
	{"id":"silk","name":"spider silk","color":[220,220,224]},
	{"id":"venom_sac","name":"venom sac","color":[115,194,88]},
	{"id":"slime_gel","name":"slime gel","color":[91,202,151]},
	{"id":"glow_dust","name":"glow dust","color":[190,236,128]},
	{"id":"spore_sac","name":"spore sac","color":[191,103,185]},
	{"id":"mushroom_flesh","name":"mushroom flesh","color":[210,158,165],"cook_to":"roasted_mushroom"},
	{"id":"roasted_mushroom","name":"roasted mushroom","color":[151,92,70],"edible":true,"hunger_restore":16,"health_restore":2},
	{"id":"scale","name":"scale","color":[89,151,122]},
	{"id":"ember_scale","name":"ember scale","color":[208,83,40]},
	{"id":"ember_gland","name":"ember gland","color":[255,151,54]},
	{"id":"fish","name":"fresh fish","color":[100,164,196],"cook_to":"cooked_fish"},
	{"id":"cooked_fish","name":"cooked fish","color":[197,132,76],"edible":true,"hunger_restore":28,"health_restore":3},
	{"id":"fin","name":"fin","color":[83,145,172]},
	{"id":"shell","name":"shell","color":[194,165,126]},
	{"id":"pearl","name":"pearl","color":[231,226,238]},
	{"id":"eel_gland","name":"electric gland","color":[154,174,241]},
	{"id":"ink_sac","name":"ink sac","color":[65,57,90]},
	{"id":"crab_claw","name":"crab claw","color":[205,94,71],"cook_to":"cooked_crab"},
	{"id":"cooked_crab","name":"cooked crab","color":[230,130,73],"edible":true,"hunger_restore":24,"health_restore":3},
	{"id":"honeycomb","name":"honeycomb","color":[227,173,55]},
	{"id":"ash_core","name":"ash core","color":[92,80,82]},
	{"id":"crystal_fragment","name":"crystal fragment","color":[151,132,236]},
]

const BEHAVIOR_OVERRIDES: Dictionary = {
	"burrow_badger":["burrower"], "burrow_worm":["burrower"], "red_squirrel":["wall_climber"],
	"bark_beetle":["wall_climber"], "giant_spider":["wall_climber","nest_builder"], "red_panda":["wall_climber"],
	"cave_spider":["wall_climber","nest_builder"], "glow_worm":["wall_climber"], "grassland_fox":["pack_hunter"],
	"grey_wolf":["pack_hunter"], "snow_wolf":["pack_hunter"], "fire_bat":["pack_hunter"], "piranha":["pack_hunter"],
	"thorn_hornet":["pack_hunter","nest_builder"], "honey_bee":["nest_builder"], "stump_mimic":["mimic"],
	"sporeling":["mimic","nest_builder"], "field_mouse":["scavenger"], "swamp_rat":["scavenger"],
	"tusk_boar":["scavenger"], "sand_crab":["scavenger"], "mud_crab":["scavenger"],
	"giant_leech":["parasite"], "rock_mite":["parasite"], "ice_mite":["parasite"],
}

const INVADERS_BY_DIMENSION: Dictionary = {
	"emberdeep":["ember_raider","frost_borer"], "frostvoid":["frost_borer","void_climber"],
	"prism":["prism_mimic","static_leech"], "abyss":["static_leech","void_climber"],
	"verdant":["void_climber","prism_mimic"], "clockwork":["gear_gremlin","void_climber"],
	"dream":["prism_mimic","static_leech"], "skyrealm":["static_leech","gear_gremlin"],
	"static":["gear_gremlin","static_leech","prism_mimic"], "moon":["void_climber","gear_gremlin"],
	"earth":["ember_raider","frost_borer","gear_gremlin","static_leech"],
}

static var _fauna: Array[Dictionary] = []
static var _fauna_by_id: Dictionary = {}
static var _loot_by_id: Dictionary = {}

static func _species(id: String, name: String, options: Dictionary) -> Dictionary:
	var result: Dictionary = {
		"id":id, "name":name, "temperament":"passive", "movement":"ground", "habitat":"surface",
		"biomes":[], "underground_biomes":[], "hp":12.0, "contact_damage":0.0, "speed":0.32,
		"aggro_range":28.0, "flee_range":24.0, "width":3, "height":3, "hit_radius":2.0,
		"spawn_weight":1.0, "group_min":1, "group_max":2, "animation_rate":9, "sprite":"quadruped",
		"palette":[[135,105,76],[205,177,126],[65,52,44]], "loot":[], "behaviors":[], "invasion_only":false,
	}
	result.merge(options, true)
	return result

static func _build_fauna() -> Array[Dictionary]:
	const P: int = 0
	const S: int = 1
	const B: int = 2
	const W: int = 3
	const V: int = 4
	const F: int = 5
	const O: int = 6
	const STANDARD: int = 0
	const MUSHROOM: int = 1
	return [
		_species("meadow_hare","meadow hare",{"biomes":[P],"movement":"hopper","sprite":"hare","hp":8,"speed":0.48,"group_min":2,"group_max":4,"palette":[[181,151,111],[232,215,177],[89,73,58]],"loot":[["raw_meat",1,1,0.8],["small_hide",1,1,0.65]]}),
		_species("field_mouse","field mouse",{"biomes":[P],"sprite":"mouse","hp":5,"speed":0.4,"group_min":2,"group_max":5,"width":2,"height":2,"palette":[[122,101,82],[211,176,144],[62,53,48]],"loot":[["raw_meat",1,1,0.35]]}),
		_species("prairie_deer","prairie deer",{"biomes":[P],"sprite":"deer","hp":32,"speed":0.55,"width":5,"height":5,"hit_radius":3,"group_min":2,"group_max":4,"spawn_weight":0.45,"palette":[[161,108,68],[224,188,137],[72,52,40]],"loot":[["raw_meat",2,4,1.0],["small_hide",1,2,1.0],["antler",1,2,0.4]]}),
		_species("burrow_badger","burrow badger",{"biomes":[P],"sprite":"badger","hp":24,"speed":0.34,"width":5,"height":3,"spawn_weight":0.55,"palette":[[82,78,75],[213,205,188],[36,35,36]],"loot":[["raw_meat",1,2,0.8],["small_hide",1,1,1.0],["claw",1,1,0.4]]}),
		_species("honey_bee","honey bee",{"biomes":[P],"habitat":"air","movement":"flying","sprite":"bee","hp":4,"speed":0.44,"group_min":3,"group_max":7,"width":2,"height":2,"palette":[[224,170,51],[240,224,153],[52,44,38]],"loot":[["honeycomb",1,1,0.22]]}),
		_species("grassland_fox","grassland fox",{"biomes":[P],"temperament":"hostile","sprite":"fox","hp":20,"contact_damage":4,"speed":0.55,"spawn_weight":0.7,"palette":[[194,100,48],[240,198,132],[71,47,36]],"loot":[["raw_meat",1,2,0.8],["fine_fur",1,1,1.0],["fang",1,1,0.35]]}),
		_species("tusk_boar","tusk boar",{"biomes":[P],"temperament":"hostile","movement":"charger","sprite":"boar","hp":42,"contact_damage":7,"speed":0.42,"width":5,"height":4,"hit_radius":3,"spawn_weight":0.42,"palette":[[91,70,55],[160,119,85],[225,213,174]],"loot":[["raw_meat",2,4,1.0],["small_hide",1,2,0.9],["fang",1,2,0.7]]}),
		_species("thorn_hornet","thorn hornet",{"biomes":[P,F],"habitat":"air","movement":"flying","temperament":"hostile","sprite":"hornet","hp":9,"contact_damage":3,"speed":0.62,"group_min":2,"group_max":4,"palette":[[183,124,41],[245,205,91],[42,39,42]],"loot":[["insect_shell",1,1,0.6],["venom_sac",1,1,0.35]]}),
		_species("red_squirrel","red squirrel",{"biomes":[F],"movement":"climber","sprite":"squirrel","hp":7,"speed":0.5,"group_min":2,"group_max":4,"palette":[[174,81,46],[229,155,95],[69,43,34]],"loot":[["raw_meat",1,1,0.4],["fine_fur",1,1,0.55]]}),
		_species("forest_deer","forest deer",{"biomes":[F],"sprite":"deer","hp":36,"speed":0.52,"width":5,"height":5,"hit_radius":3,"group_min":2,"group_max":3,"spawn_weight":0.45,"palette":[[122,82,53],[205,157,104],[54,45,38]],"loot":[["raw_meat",2,4,1.0],["small_hide",1,2,1.0],["antler",1,2,0.55]]}),
		_species("hedgehog","hedgehog",{"biomes":[F],"sprite":"hedgehog","hp":13,"speed":0.25,"width":4,"height":3,"palette":[[92,67,52],[179,139,93],[44,39,38]],"loot":[["raw_meat",1,1,0.5],["small_hide",1,1,0.35]]}),
		_species("songbird","songbird",{"biomes":[F,P],"habitat":"air","movement":"flying","sprite":"bird","hp":5,"speed":0.55,"group_min":2,"group_max":5,"palette":[[82,155,185],[222,192,103],[48,55,65]],"loot":[["feather",1,2,0.8],["egg",1,1,0.12]]}),
		_species("dusk_owl","dusk owl",{"biomes":[F],"habitat":"air","movement":"flying","sprite":"owl","hp":14,"speed":0.35,"spawn_weight":0.45,"palette":[[103,86,84],[221,198,151],[42,38,42]],"loot":[["feather",1,3,1.0],["fang",1,1,0.15]]}),
		_species("bark_beetle","bark beetle",{"biomes":[F],"movement":"climber","sprite":"beetle","hp":6,"speed":0.26,"group_min":2,"group_max":5,"palette":[[93,74,45],[161,119,62],[39,36,31]],"loot":[["insect_shell",1,1,0.7]]}),
		_species("grey_wolf","grey wolf",{"biomes":[F,S],"temperament":"hostile","sprite":"wolf","hp":35,"contact_damage":6,"speed":0.62,"width":5,"height":4,"hit_radius":3,"group_min":2,"group_max":4,"spawn_weight":0.55,"palette":[[105,112,117],[184,191,193],[46,52,57]],"loot":[["raw_meat",2,3,1.0],["thick_fur",1,2,1.0],["fang",1,2,0.7]]}),
		_species("giant_spider","giant spider",{"biomes":[F],"movement":"climber","temperament":"hostile","sprite":"spider","hp":22,"contact_damage":5,"speed":0.48,"width":5,"height":3,"hit_radius":3,"palette":[[55,47,55],[142,66,79],[27,25,30]],"loot":[["chitin",1,2,0.9],["silk",1,3,1.0],["venom_sac",1,1,0.45]]}),
		_species("stump_mimic","stump mimic",{"biomes":[F],"movement":"ambusher","temperament":"hostile","sprite":"mimic","hp":52,"contact_damage":8,"speed":0.3,"width":5,"height":5,"hit_radius":3,"spawn_weight":0.28,"palette":[[87,59,38],[134,94,53],[42,37,31]],"loot":[["raw_meat",1,2,0.5],["bone",1,2,0.5],["crystal_fragment",1,1,0.12]]}),
		_species("vine_crawler","vine crawler",{"biomes":[F],"temperament":"hostile","sprite":"lizard","hp":18,"contact_damage":4,"speed":0.46,"group_min":1,"group_max":3,"palette":[[68,135,67],[143,188,80],[39,66,40]],"loot":[["scale",1,2,0.8],["venom_sac",1,1,0.2]]}),
		_species("snow_hare","snow hare",{"biomes":[S],"movement":"hopper","sprite":"hare","hp":9,"speed":0.5,"group_min":2,"group_max":4,"palette":[[226,232,231],[181,201,215],[92,101,110]],"loot":[["raw_meat",1,1,0.8],["thick_fur",1,1,0.85]]}),
		_species("mountain_goat","mountain goat",{"biomes":[S],"sprite":"goat","hp":38,"speed":0.48,"width":5,"height":5,"hit_radius":3,"group_min":2,"group_max":4,"spawn_weight":0.55,"palette":[[197,194,181],[229,222,201],[89,78,65]],"loot":[["raw_meat",2,4,1.0],["thick_fur",1,2,1.0],["horn",1,2,0.8]]}),
		_species("woolly_yak","woolly yak",{"biomes":[S],"sprite":"yak","hp":58,"speed":0.3,"width":6,"height":5,"hit_radius":4,"spawn_weight":0.3,"palette":[[71,59,55],[126,104,83],[219,205,174]],"loot":[["raw_meat",3,5,1.0],["thick_fur",2,4,1.0],["horn",1,2,0.65]]}),
		_species("snow_owl","snow owl",{"biomes":[S],"habitat":"air","movement":"flying","sprite":"owl","hp":12,"speed":0.38,"spawn_weight":0.6,"palette":[[225,231,234],[173,193,211],[70,78,89]],"loot":[["feather",1,3,1.0]]}),
		_species("penguin","cliff penguin",{"biomes":[S,O],"sprite":"penguin","hp":18,"speed":0.25,"width":3,"height":4,"group_min":2,"group_max":5,"spawn_weight":0.45,"palette":[[42,52,63],[229,234,227],[232,157,60]],"loot":[["raw_meat",1,2,0.7],["feather",1,2,0.8],["fish",1,1,0.2]]}),
		_species("glacier_beetle","glacier beetle",{"biomes":[S],"sprite":"beetle","hp":12,"speed":0.22,"group_min":2,"group_max":4,"palette":[[94,157,190],[176,225,240],[45,76,100]],"loot":[["insect_shell",1,2,0.8],["crystal_fragment",1,1,0.2]]}),
		_species("frost_fox","frost fox",{"biomes":[S],"temperament":"hostile","sprite":"fox","hp":25,"contact_damage":5,"speed":0.58,"palette":[[185,207,220],[233,242,245],[68,83,96]],"loot":[["raw_meat",1,2,0.8],["thick_fur",1,2,1.0],["fang",1,1,0.45]]}),
		_species("ice_mite","ice mite",{"biomes":[S],"movement":"hopper","temperament":"hostile","sprite":"mite","hp":10,"contact_damage":3,"speed":0.42,"group_min":2,"group_max":5,"palette":[[117,187,218],[217,246,252],[54,91,119]],"loot":[["chitin",1,1,0.75],["crystal_fragment",1,1,0.15]]}),
		_species("snow_wolf","snow wolf",{"biomes":[S],"temperament":"hostile","sprite":"wolf","hp":39,"contact_damage":7,"speed":0.65,"width":5,"height":4,"hit_radius":3,"group_min":2,"group_max":4,"spawn_weight":0.4,"palette":[[171,183,191],[230,235,235],[72,82,91]],"loot":[["raw_meat",2,3,1.0],["thick_fur",1,2,1.0],["fang",1,2,0.75]]}),
		_species("giant_panda","giant panda",{"biomes":[B],"sprite":"panda","hp":52,"speed":0.25,"width":6,"height":5,"hit_radius":4,"spawn_weight":0.25,"palette":[[42,47,48],[226,224,206],[107,150,68]],"loot":[["raw_meat",2,4,0.8],["thick_fur",2,3,1.0]]}),
		_species("red_panda","red panda",{"biomes":[B],"movement":"climber","sprite":"squirrel","hp":16,"speed":0.5,"width":4,"height":3,"palette":[[179,76,45],[230,164,93],[57,45,40]],"loot":[["raw_meat",1,1,0.45],["fine_fur",1,2,0.9]]}),
		_species("bamboo_pheasant","bamboo pheasant",{"biomes":[B],"habitat":"air","movement":"flying","sprite":"bird","hp":10,"speed":0.42,"group_min":2,"group_max":4,"palette":[[73,137,91],[210,174,72],[62,52,48]],"loot":[["feather",1,3,1.0],["bright_feather",1,1,0.45],["egg",1,1,0.18]]}),
		_species("leaf_gecko","leaf gecko",{"biomes":[B],"movement":"climber","sprite":"gecko","hp":7,"speed":0.42,"group_min":2,"group_max":4,"palette":[[105,164,62],[184,211,94],[55,85,43]],"loot":[["scale",1,1,0.55]]}),
		_species("bamboo_beetle","bamboo beetle",{"biomes":[B],"movement":"climber","sprite":"beetle","hp":7,"speed":0.25,"group_min":2,"group_max":5,"palette":[[81,126,56],[149,181,76],[42,62,37]],"loot":[["insect_shell",1,1,0.75]]}),
		_species("dart_frog","dart frog",{"biomes":[B,W],"movement":"hopper","sprite":"frog","hp":6,"speed":0.46,"group_min":2,"group_max":4,"palette":[[56,177,151],[229,178,56],[35,76,69]],"loot":[["venom_sac",1,1,0.28]]}),
		_species("stalker_mantis","stalker mantis",{"biomes":[B],"temperament":"hostile","sprite":"mantis","hp":22,"contact_damage":5,"speed":0.52,"width":4,"height":5,"hit_radius":3,"palette":[[85,157,62],[178,204,76],[43,72,38]],"loot":[["chitin",1,2,0.9],["venom_sac",1,1,0.25]]}),
		_species("vine_snake","vine snake",{"biomes":[B],"temperament":"hostile","sprite":"snake","hp":18,"contact_damage":5,"speed":0.48,"width":5,"height":2,"hit_radius":3,"palette":[[58,118,54],[136,181,67],[32,63,34]],"loot":[["raw_meat",1,2,0.6],["scale",1,2,1.0],["venom_sac",1,1,0.45]]}),
		_species("marsh_frog","marsh frog",{"biomes":[W],"movement":"hopper","sprite":"frog","hp":7,"speed":0.42,"group_min":2,"group_max":5,"palette":[[74,137,73],[151,181,86],[42,72,48]],"loot":[["raw_meat",1,1,0.45]]}),
		_species("reed_duck","reed duck",{"biomes":[W],"habitat":"air","movement":"flying","sprite":"duck","hp":12,"speed":0.38,"group_min":2,"group_max":5,"palette":[[80,112,80],[185,155,78],[226,210,161]],"loot":[["raw_meat",1,2,0.7],["feather",1,3,1.0],["egg",1,1,0.2]]}),
		_species("bog_turtle","bog turtle",{"biomes":[W],"sprite":"turtle","hp":28,"speed":0.18,"width":5,"height":3,"hit_radius":3,"palette":[[73,96,57],[132,137,70],[41,56,39]],"loot":[["raw_meat",1,2,0.6],["shell",1,2,1.0]]}),
		_species("firefly","firefly",{"biomes":[W],"habitat":"air","movement":"flying","sprite":"firefly","hp":3,"speed":0.3,"group_min":3,"group_max":8,"width":2,"height":2,"palette":[[96,111,57],[222,237,102],[50,54,38]],"loot":[["glow_dust",1,1,0.3]]}),
		_species("lantern_newt","lantern newt",{"biomes":[W],"sprite":"newt","hp":10,"speed":0.3,"group_min":2,"group_max":4,"palette":[[69,122,105],[203,177,74],[39,65,58]],"loot":[["scale",1,1,0.5],["glow_dust",1,1,0.12]]}),
		_species("swamp_rat","swamp rat",{"biomes":[W],"temperament":"hostile","sprite":"rat","hp":15,"contact_damage":4,"speed":0.5,"group_min":2,"group_max":5,"palette":[[92,86,66],[154,136,94],[47,45,39]],"loot":[["raw_meat",1,1,0.65],["small_hide",1,1,0.45],["fang",1,1,0.2]]}),
		_species("giant_leech","giant leech",{"biomes":[W],"habitat":"water","movement":"swimming","temperament":"hostile","sprite":"leech","hp":18,"contact_damage":5,"speed":0.42,"width":5,"height":2,"hit_radius":3,"palette":[[91,48,61],[164,72,76],[42,31,37]],"loot":[["raw_meat",1,2,0.5],["slime_gel",1,2,0.8]]}),
		_species("mosquito_swarm","mosquito swarm",{"biomes":[W],"habitat":"air","movement":"flying","temperament":"hostile","sprite":"swarm","hp":8,"contact_damage":3,"speed":0.58,"group_min":2,"group_max":4,"palette":[[86,76,68],[191,162,100],[41,39,39]],"loot":[["insect_shell",1,1,0.25]]}),
		_species("mud_crab","mud crab",{"biomes":[W],"temperament":"hostile","sprite":"crab","hp":25,"contact_damage":5,"speed":0.3,"width":5,"height":3,"hit_radius":3,"palette":[[112,78,53],[176,119,64],[53,46,39]],"loot":[["raw_meat",1,2,0.8],["shell",1,2,0.75],["crab_claw",1,2,1.0]]}),
		_species("bog_crawler","bog crawler",{"biomes":[W],"temperament":"hostile","sprite":"crawler","hp":31,"contact_damage":6,"speed":0.38,"width":5,"height":4,"hit_radius":3,"palette":[[62,87,61],[124,125,70],[38,49,39]],"loot":[["raw_meat",1,3,0.8],["chitin",1,2,0.55],["slime_gel",1,2,0.45]]}),
		_species("ember_lizard","ember lizard",{"biomes":[V],"sprite":"lizard","hp":14,"speed":0.42,"group_min":2,"group_max":4,"palette":[[139,54,38],[234,118,47],[64,38,35]],"loot":[["raw_meat",1,1,0.5],["ember_scale",1,2,0.9]]}),
		_species("ash_beetle","ash beetle",{"biomes":[V],"sprite":"beetle","hp":12,"speed":0.25,"group_min":2,"group_max":5,"palette":[[77,70,70],[139,94,67],[39,36,38]],"loot":[["insect_shell",1,2,0.75],["ash_core",1,1,0.25]]}),
		_species("magma_moth","magma moth",{"biomes":[V],"habitat":"air","movement":"flying","sprite":"moth","hp":8,"speed":0.38,"group_min":2,"group_max":5,"palette":[[111,57,49],[237,131,53],[251,205,91]],"loot":[["ember_scale",1,1,0.5],["glow_dust",1,1,0.25]]}),
		_species("cinder_imp","cinder imp",{"biomes":[V],"habitat":"air","movement":"flying","temperament":"hostile","sprite":"imp","hp":24,"contact_damage":5,"speed":0.48,"palette":[[112,48,48],[226,81,42],[255,179,63]],"loot":[["ash_core",1,1,0.8],["ember_gland",1,1,0.35],["fang",1,1,0.3]]}),
		_species("fire_bat","fire bat",{"biomes":[V],"habitat":"air","movement":"flying","temperament":"hostile","sprite":"bat","hp":16,"contact_damage":4,"speed":0.58,"group_min":2,"group_max":4,"palette":[[79,44,49],[188,67,47],[244,134,48]],"loot":[["raw_meat",1,1,0.45],["ember_scale",1,1,0.5],["fang",1,1,0.3]]}),
		_species("lava_crab","lava crab",{"biomes":[V],"temperament":"hostile","sprite":"crab","hp":34,"contact_damage":7,"speed":0.28,"width":5,"height":3,"hit_radius":3,"palette":[[129,49,37],[233,78,34],[255,178,54]],"loot":[["crab_claw",1,2,1.0],["ember_scale",1,2,0.8],["ember_gland",1,1,0.25]]}),
		_species("ash_crawler","ash crawler",{"biomes":[V],"temperament":"hostile","sprite":"crawler","hp":28,"contact_damage":6,"speed":0.42,"width":5,"height":3,"hit_radius":3,"palette":[[72,61,60],[145,83,59],[217,93,42]],"loot":[["ash_core",1,2,0.8],["chitin",1,2,0.7]]}),
		_species("obsidian_scarab","obsidian scarab",{"biomes":[V],"temperament":"hostile","sprite":"beetle","hp":30,"contact_damage":5,"speed":0.3,"width":4,"height":3,"spawn_weight":0.45,"palette":[[39,36,48],[88,65,99],[224,81,54]],"loot":[["chitin",1,2,1.0],["ash_core",1,2,0.65],["crystal_fragment",1,1,0.2]]}),
		_species("reef_fish","reef fish",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"fish","hp":7,"speed":0.48,"group_min":3,"group_max":7,"palette":[[59,161,179],[236,184,76],[34,91,116]],"loot":[["fish",1,1,0.85],["fin",1,1,0.35]]}),
		_species("seahorse","seahorse",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"seahorse","hp":8,"speed":0.25,"group_min":2,"group_max":4,"palette":[[211,143,67],[239,196,104],[92,80,54]],"loot":[["fish",1,1,0.45],["scale",1,1,0.35]]}),
		_species("sea_turtle","sea turtle",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"turtle","hp":38,"speed":0.3,"width":6,"height":4,"hit_radius":4,"spawn_weight":0.35,"palette":[[54,123,103],[126,156,90],[37,72,65]],"loot":[["raw_meat",1,3,0.55],["shell",1,3,1.0]]}),
		_species("dolphin","dolphin",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"dolphin","hp":42,"speed":0.62,"width":6,"height":3,"hit_radius":4,"group_min":2,"group_max":4,"spawn_weight":0.35,"palette":[[79,142,174],[177,210,221],[38,78,104]],"loot":[["fish",2,4,0.55],["fin",1,2,0.8]]}),
		_species("moon_jelly","moon jelly",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"jellyfish","hp":12,"speed":0.2,"group_min":2,"group_max":5,"palette":[[150,174,226],[220,226,248],[90,93,163]],"loot":[["slime_gel",1,2,0.8],["glow_dust",1,1,0.25]]}),
		_species("sand_crab","sand crab",{"biomes":[O],"sprite":"crab","hp":16,"speed":0.25,"group_min":2,"group_max":5,"palette":[[191,137,83],[225,177,109],[89,65,50]],"loot":[["raw_meat",1,1,0.6],["shell",1,1,0.7],["crab_claw",1,2,0.8]]}),
		_species("lantern_fish","lantern fish",{"biomes":[O],"habitat":"water","movement":"swimming","sprite":"fish","hp":10,"speed":0.35,"group_min":2,"group_max":5,"spawn_weight":0.55,"palette":[[52,67,112],[105,201,190],[224,239,145]],"loot":[["fish",1,2,0.8],["glow_dust",1,1,0.35]]}),
		_species("piranha","piranha",{"biomes":[O],"habitat":"water","movement":"swimming","temperament":"hostile","sprite":"fish","hp":14,"contact_damage":4,"speed":0.65,"group_min":3,"group_max":6,"palette":[[150,72,65],[226,169,93],[62,49,51]],"loot":[["fish",1,2,0.8],["fang",1,1,0.5],["fin",1,1,0.4]]}),
		_species("shark_pup","shark pup",{"biomes":[O],"habitat":"water","movement":"swimming","temperament":"hostile","sprite":"shark","hp":42,"contact_damage":8,"speed":0.7,"width":7,"height":4,"hit_radius":4,"spawn_weight":0.4,"palette":[[75,111,134],[177,198,205],[37,58,72]],"loot":[["fish",2,4,1.0],["fang",1,3,0.9],["fin",1,2,1.0]]}),
		_species("electric_eel","electric eel",{"biomes":[O],"habitat":"water","movement":"swimming","temperament":"hostile","sprite":"eel","hp":28,"contact_damage":6,"speed":0.5,"width":7,"height":2,"hit_radius":4,"palette":[[65,79,126],[123,160,222],[216,225,120]],"loot":[["fish",1,3,0.75],["eel_gland",1,2,1.0]]}),
		_species("reef_squid","reef squid",{"biomes":[O],"habitat":"water","movement":"swimming","temperament":"hostile","sprite":"squid","hp":30,"contact_damage":6,"speed":0.48,"width":5,"height":5,"hit_radius":3,"palette":[[126,68,150],[206,118,169],[61,43,89]],"loot":[["raw_meat",1,3,0.8],["ink_sac",1,2,1.0]]}),
		_species("cave_bat","cave bat",{"underground_biomes":[STANDARD],"habitat":"cave_air","movement":"flying","sprite":"bat","hp":8,"speed":0.5,"group_min":2,"group_max":6,"palette":[[76,68,83],[135,111,126],[37,35,42]],"loot":[["raw_meat",1,1,0.35],["fang",1,1,0.15]]}),
		_species("glow_worm","glow worm",{"underground_biomes":[STANDARD],"habitat":"cave","movement":"climber","sprite":"worm","hp":4,"speed":0.15,"group_min":2,"group_max":6,"palette":[[80,101,62],[194,228,99],[47,53,41]],"loot":[["glow_dust",1,1,0.55]]}),
		_species("stone_beetle","stone beetle",{"underground_biomes":[STANDARD],"habitat":"cave","sprite":"beetle","hp":14,"speed":0.22,"group_min":2,"group_max":5,"palette":[[83,81,77],[139,132,117],[42,41,40]],"loot":[["insect_shell",1,2,0.8],["chitin",1,1,0.35]]}),
		_species("cave_spider","cave spider",{"underground_biomes":[STANDARD],"habitat":"cave","movement":"climber","temperament":"hostile","sprite":"spider","hp":20,"contact_damage":5,"speed":0.48,"width":5,"height":3,"hit_radius":3,"palette":[[67,57,72],[126,83,124],[30,28,34]],"loot":[["chitin",1,2,0.9],["silk",1,3,1.0],["venom_sac",1,1,0.4]]}),
		_species("rock_mite","rock mite",{"underground_biomes":[STANDARD],"habitat":"cave","movement":"hopper","temperament":"hostile","sprite":"mite","hp":13,"contact_damage":4,"speed":0.4,"group_min":2,"group_max":5,"palette":[[92,86,75],[163,144,102],[45,43,39]],"loot":[["chitin",1,1,0.85],["crystal_fragment",1,1,0.08]]}),
		_species("crystal_scorpion","crystal scorpion",{"underground_biomes":[STANDARD],"habitat":"cave","temperament":"hostile","sprite":"scorpion","hp":32,"contact_damage":7,"speed":0.36,"width":6,"height":4,"hit_radius":4,"spawn_weight":0.45,"palette":[[81,64,126],[150,119,220],[217,201,255]],"loot":[["chitin",1,2,1.0],["venom_sac",1,1,0.55],["crystal_fragment",1,3,0.8]]}),
		_species("burrow_worm","burrow worm",{"underground_biomes":[STANDARD],"habitat":"cave","movement":"burrower","temperament":"hostile","sprite":"worm","hp":27,"contact_damage":6,"speed":0.45,"width":6,"height":2,"hit_radius":4,"palette":[[129,88,66],[190,137,91],[65,51,45]],"loot":[["raw_meat",1,3,0.65],["chitin",1,2,0.5],["fang",1,1,0.25]]}),
		_species("cave_slime","cave slime",{"underground_biomes":[STANDARD],"habitat":"cave","movement":"hopper","temperament":"hostile","sprite":"slime","hp":18,"contact_damage":4,"speed":0.32,"width":4,"height":3,"hit_radius":3,"palette":[[66,139,115],[119,201,157],[35,72,65]],"loot":[["slime_gel",1,3,1.0]]}),
		_species("spore_moth","spore moth",{"underground_biomes":[MUSHROOM],"habitat":"cave_air","movement":"flying","sprite":"moth","hp":7,"speed":0.35,"group_min":2,"group_max":5,"palette":[[139,80,145],[217,143,196],[237,198,126]],"loot":[["spore_sac",1,1,0.35],["glow_dust",1,1,0.2]]}),
		_species("mushroom_snail","mushroom snail",{"underground_biomes":[MUSHROOM],"habitat":"cave","sprite":"snail","hp":16,"speed":0.12,"width":5,"height":3,"palette":[[114,87,77],[194,102,145],[232,165,186]],"loot":[["mushroom_flesh",1,2,0.8],["shell",1,1,0.65]]}),
		_species("glowcap_beetle","glowcap beetle",{"underground_biomes":[MUSHROOM],"habitat":"cave","sprite":"beetle","hp":10,"speed":0.22,"group_min":2,"group_max":5,"palette":[[96,61,112],[190,91,166],[224,192,114]],"loot":[["insect_shell",1,1,0.75],["glow_dust",1,1,0.45],["spore_sac",1,1,0.2]]}),
		_species("puffcap_hopper","puffcap hopper",{"underground_biomes":[MUSHROOM],"habitat":"cave","movement":"hopper","temperament":"hostile","sprite":"frog","hp":17,"contact_damage":4,"speed":0.42,"palette":[[131,69,126],[219,117,169],[231,184,117]],"loot":[["mushroom_flesh",1,2,0.75],["spore_sac",1,2,0.75]]}),
		_species("mycelial_grub","mycelial grub",{"underground_biomes":[MUSHROOM],"habitat":"cave","temperament":"hostile","sprite":"grub","hp":20,"contact_damage":4,"speed":0.3,"group_min":2,"group_max":4,"palette":[[189,147,153],[220,194,171],[98,72,81]],"loot":[["mushroom_flesh",1,3,0.9],["spore_sac",1,1,0.4],["slime_gel",1,1,0.25]]}),
		_species("sporeling","sporeling",{"underground_biomes":[MUSHROOM],"habitat":"cave","movement":"ambusher","temperament":"hostile","sprite":"sporeling","hp":26,"contact_damage":5,"speed":0.32,"width":4,"height":5,"hit_radius":3,"palette":[[125,70,128],[210,103,167],[229,181,111]],"loot":[["mushroom_flesh",1,2,0.8],["spore_sac",1,3,1.0]]}),
		_species("ember_raider","ember raider",{"biomes":[V],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","movement":"charger","sprite":"imp","hp":34,"contact_damage":7,"speed":0.52,"width":4,"height":5,"hit_radius":3,"palette":[[124,38,31],[255,111,38],[255,214,91]],"loot":[["ash_core",1,2,0.8],["ember_gland",1,1,0.35]],"behaviors":["pack_hunter","nest_builder"]}),
		_species("frost_borer","frost borer",{"biomes":[S],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","movement":"burrower","sprite":"worm","hp":38,"contact_damage":7,"speed":0.46,"width":7,"height":2,"hit_radius":4,"palette":[[116,188,224],[226,249,255],[52,83,128]],"loot":[["crystal_fragment",1,3,0.8],["chitin",1,2,0.65]],"behaviors":["burrower"]}),
		_species("prism_mimic","prism mimic",{"biomes":[F],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","movement":"ambusher","sprite":"mimic","hp":58,"contact_damage":9,"speed":0.34,"width":5,"height":5,"hit_radius":4,"palette":[[117,58,191],[255,78,207],[77,245,219]],"loot":[["crystal_fragment",2,4,1.0]],"behaviors":["mimic"]}),
		_species("gear_gremlin","gear gremlin",{"biomes":[P],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","sprite":"imp","hp":30,"contact_damage":4,"speed":0.6,"width":4,"height":4,"hit_radius":3,"palette":[[130,93,47],[236,177,72],[47,42,38]],"loot":[["crystal_fragment",1,2,0.55],["chitin",1,1,0.45]],"behaviors":["weapon_thief","scavenger","wall_climber"]}),
		_species("static_leech","static leech",{"biomes":[W],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","movement":"flying","sprite":"leech","hp":18,"contact_damage":2,"speed":0.68,"width":5,"height":2,"hit_radius":3,"palette":[[255,43,197],[70,255,211],[92,53,166]],"loot":[["slime_gel",1,2,0.75],["crystal_fragment",1,1,0.35]],"behaviors":["parasite","pack_hunter"]}),
		_species("void_climber","void climber",{"underground_biomes":[STANDARD],"spawn_weight":0.0,"invasion_only":true,"temperament":"hostile","movement":"climber","sprite":"spider","hp":36,"contact_damage":6,"speed":0.54,"width":5,"height":3,"hit_radius":3,"palette":[[42,33,68],[121,86,188],[232,235,255]],"loot":[["silk",1,3,0.9],["crystal_fragment",1,2,0.45]],"behaviors":["wall_climber","nest_builder"]}),
	]

static func _ensure() -> void:
	if not _fauna.is_empty():
		return
	_fauna = _build_fauna()
	for item: Dictionary in _fauna:
		_fauna_by_id[String(item["id"])] = item
	for item: Dictionary in LOOT:
		_loot_by_id[String(item["id"])] = item

static func all() -> Array[Dictionary]:
	_ensure()
	return _fauna

static func fauna(species_id: String) -> Dictionary:
	_ensure()
	return _fauna_by_id.get(species_id, {})

static func loot(loot_id: String) -> Dictionary:
	_ensure()
	return _loot_by_id.get(loot_id, {})

static func behaviors(species_or_id: Variant) -> Array[String]:
	_ensure()
	var species_data: Dictionary = fauna(String(species_or_id)) if species_or_id is String else species_or_id
	if species_data.is_empty():
		return []
	var result: Array[String] = []
	for value: Variant in BEHAVIOR_OVERRIDES.get(String(species_data["id"]), []):
		var behavior: String = String(value)
		if not result.has(behavior):
			result.append(behavior)
	for value: Variant in species_data.get("behaviors", []):
		var behavior: String = String(value)
		if not result.has(behavior):
			result.append(behavior)
	return result

static func for_surface_biome(biome_id: int, habitat: String = "") -> Array[Dictionary]:
	_ensure()
	var result: Array[Dictionary] = []
	for item: Dictionary in _fauna:
		if bool(item.get("invasion_only", false)) or not (item.get("biomes", []) as Array).has(biome_id):
			continue
		if not habitat.is_empty() and String(item["habitat"]) != habitat:
			continue
		result.append(item)
	return result

static func for_underground_biome(biome_id: int, habitat: String = "") -> Array[Dictionary]:
	_ensure()
	var result: Array[Dictionary] = []
	for item: Dictionary in _fauna:
		if bool(item.get("invasion_only", false)) or not (item.get("underground_biomes", []) as Array).has(biome_id):
			continue
		if not habitat.is_empty() and String(item["habitat"]) != habitat:
			continue
		result.append(item)
	return result
