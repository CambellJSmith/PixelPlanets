class_name BossData
extends RefCounted

const CALDERA_TYRANT: String = "caldera_tyrant"
const SEA_SERPENT: String = "sea_serpent"
const FROST_COLOSSUS: String = "frost_colossus"
const BOG_LEVIATHAN: String = "bog_leviathan"
const MYCELIAL_MONARCH: String = "mycelial_monarch"
const BAMBOO_WAR_MACHINE: String = "bamboo_war_machine"
const CANOPY_WYRM: String = "canopy_wyrm"
const CRYSTAL_BURROWER: String = "crystal_burrower"
const MAGMA_BEHEMOTH: String = "magma_behemoth"
const STORM_ROC: String = "storm_roc"
const MOON_STALKER: String = "moon_stalker"
const DROWNED_FLEET: String = "drowned_fleet"
const SKY_JELLYFISH: String = "sky_jellyfish"
const WORLD_EATER: String = "world_eater"

const KINDS: Array[String] = [
	CALDERA_TYRANT, SEA_SERPENT, FROST_COLOSSUS, BOG_LEVIATHAN,
	MYCELIAL_MONARCH, BAMBOO_WAR_MACHINE, CANOPY_WYRM, CRYSTAL_BURROWER,
	MAGMA_BEHEMOTH, STORM_ROC, MOON_STALKER, DROWNED_FLEET,
	SKY_JELLYFISH, WORLD_EATER,
]

const BOSSES: Dictionary = {
	CALDERA_TYRANT: {"kind": CALDERA_TYRANT, "name": "Caldera Tyrant", "max_health": 320.0, "width": 17, "height": 11, "contact_damage": 8.0, "reward": 25, "entry": "above", "projectile": "fireball", "message": "A caldera tyrant flies in from above!", "defeat_message": "The caldera tyrant is defeated!", "bar_back": "#4a2028", "bar_fill": "#ff6038", "bar_highlight": "#ffd6a4"},
	SEA_SERPENT: {"kind": SEA_SERPENT, "name": "Abyssal Sea Serpent", "max_health": 380.0, "width": 15, "height": 14, "contact_damage": 9.0, "reward": 30, "entry": "below_water", "projectile": "water_burst", "message": "The ocean churns — a sea serpent rises!", "defeat_message": "The abyssal sea serpent is defeated!", "bar_back": "#124054", "bar_fill": "#36bebe", "bar_highlight": "#b4f6f4"},
	FROST_COLOSSUS: {"kind": FROST_COLOSSUS, "name": "Frost Colossus", "max_health": 420.0, "width": 17, "height": 15, "contact_damage": 9.0, "reward": 28, "entry": "assemble", "projectile": "ice_boulder", "message": "The snow gathers into a frost colossus!", "defeat_message": "The frost colossus collapses into snow!", "bar_back": "#364d68", "bar_fill": "#84ccec", "bar_highlight": "#ebfaff"},
	BOG_LEVIATHAN: {"kind": BOG_LEVIATHAN, "name": "Bog Leviathan", "max_health": 390.0, "width": 19, "height": 11, "contact_damage": 9.0, "reward": 27, "entry": "below_ground", "projectile": "mud_glob", "message": "The swamp bubbles — a bog leviathan erupts!", "defeat_message": "The bog leviathan sinks into the mire!", "bar_back": "#39442d", "bar_fill": "#7fa34e", "bar_highlight": "#dae991"},
	MYCELIAL_MONARCH: {"kind": MYCELIAL_MONARCH, "name": "Mycelial Monarch", "max_health": 440.0, "width": 21, "height": 15, "contact_damage": 7.0, "reward": 32, "entry": "rooted", "projectile": "spore", "message": "The cavern roots awaken the mycelial monarch!", "defeat_message": "The mycelial monarch withers!", "bar_back": "#442849", "bar_fill": "#c95bbe", "bar_highlight": "#ffd3f7"},
	BAMBOO_WAR_MACHINE: {"kind": BAMBOO_WAR_MACHINE, "name": "Bamboo War Machine", "max_health": 410.0, "width": 19, "height": 13, "contact_damage": 10.0, "reward": 29, "entry": "above", "projectile": "bamboo_shard", "message": "An ancient bamboo war machine crashes down!", "defeat_message": "The bamboo war machine splinters!", "bar_back": "#304a2a", "bar_fill": "#74b540", "bar_highlight": "#dcf289"},
	CANOPY_WYRM: {"kind": CANOPY_WYRM, "name": "Ancient Canopy Wyrm", "max_health": 360.0, "width": 23, "height": 9, "contact_damage": 8.0, "reward": 28, "entry": "above", "projectile": "branch", "message": "The canopy parts as an ancient wyrm descends!", "defeat_message": "The ancient canopy wyrm falls!", "bar_back": "#234632", "bar_fill": "#48a65b", "bar_highlight": "#c2edae"},
	CRYSTAL_BURROWER: {"kind": CRYSTAL_BURROWER, "name": "Crystal Burrower", "max_health": 460.0, "width": 25, "height": 9, "contact_damage": 11.0, "reward": 35, "entry": "side", "projectile": "crystal_shard", "message": "Crystal veins fracture — something is burrowing closer!", "defeat_message": "The crystal burrower shatters!", "bar_back": "#2e2b5c", "bar_fill": "#7e6ef1", "bar_highlight": "#e2dbff"},
	MAGMA_BEHEMOTH: {"kind": MAGMA_BEHEMOTH, "name": "Magma Behemoth", "max_health": 500.0, "width": 21, "height": 15, "contact_damage": 12.0, "reward": 38, "entry": "below_ground", "projectile": "magma_rock", "message": "The magma reservoir heaves — a behemoth rises!", "defeat_message": "The magma behemoth cools and fractures!", "bar_back": "#502119", "bar_fill": "#e84c20", "bar_highlight": "#ffcd69"},
	STORM_ROC: {"kind": STORM_ROC, "name": "Storm Roc", "max_health": 370.0, "width": 25, "height": 11, "contact_damage": 9.0, "reward": 30, "entry": "above", "projectile": "lightning_marker", "message": "Storm clouds gather — the storm roc dives!", "defeat_message": "The storm roc crashes from the sky!", "bar_back": "#2f354c", "bar_fill": "#6a8fd5", "bar_highlight": "#e2efff"},
	MOON_STALKER: {"kind": MOON_STALKER, "name": "Moon Stalker", "max_health": 340.0, "width": 13, "height": 15, "contact_damage": 10.0, "reward": 34, "entry": "shadow", "projectile": "shadow_bolt", "message": "A moon stalker steps out of the darkness!", "defeat_message": "The moon stalker dissolves into dawn mist!", "bar_back": "#252244", "bar_fill": "#6f5cc1", "bar_highlight": "#ded7ff"},
	DROWNED_FLEET: {"kind": DROWNED_FLEET, "name": "The Drowned Fleet", "max_health": 520.0, "width": 29, "height": 13, "contact_damage": 8.0, "reward": 40, "entry": "below_water", "projectile": "cannonball", "message": "A drowned warship tears through the ocean surface!", "defeat_message": "The drowned fleet sinks for the last time!", "bar_back": "#2a3b41", "bar_fill": "#58979a", "bar_highlight": "#c5e6dc"},
	SKY_JELLYFISH: {"kind": SKY_JELLYFISH, "name": "Sky Jellyfish", "max_health": 400.0, "width": 19, "height": 17, "contact_damage": 8.0, "reward": 36, "entry": "above", "projectile": "electric_orb", "message": "A luminous sky jellyfish drifts down from the clouds!", "defeat_message": "The sky jellyfish disperses in sparks!", "bar_back": "#373156", "bar_fill": "#8079e7", "bar_highlight": "#dde3ff"},
	WORLD_EATER: {"kind": WORLD_EATER, "name": "The World Eater", "max_health": 650.0, "width": 31, "height": 11, "contact_damage": 14.0, "reward": 50, "entry": "side", "projectile": "world_spit", "message": "The ground tears open — the world eater has arrived!", "defeat_message": "The world eater is finally still!", "bar_back": "#3f2b22", "bar_fill": "#aa5b35", "bar_highlight": "#f4cf97"},
}

const RITUALS: Dictionary = {
	CALDERA_TYRANT: {"title": "WAKE THE CALDERA", "hint": "STAND ABOVE THE CRATER HEAT", "progress_frames": 180},
	SEA_SERPENT: {"title": "BAIT THE ABYSS", "hint": "CARRY FISH INTO DEEP WATER", "progress_frames": 180},
	FROST_COLOSSUS: {"title": "BUILD A SNOW IDOL", "hint": "12 SNOW DURING SNOWFALL", "progress_frames": 180},
	BOG_LEVIATHAN: {"title": "VENOM OFFERING", "hint": "3 VENOM SACS IN SWAMP MIRE", "progress_frames": 180},
	MYCELIAL_MONARCH: {"title": "BURN THE DEEP ROOTS", "hint": "KEEP 3 FIRES AMONG MYCELIUM", "progress_frames": 180},
	BAMBOO_WAR_MACHINE: {"title": "LIGHT THE SIGNAL GROVE", "hint": "BURN BAMBOO WITH 8 IN PACK", "progress_frames": 180},
	CANOPY_WYRM: {"title": "CALL FROM THE CANOPY", "hint": "CLIMB HIGH WITH 2 BRIGHT FEATHERS", "progress_frames": 180},
	CRYSTAL_BURROWER: {"title": "RESONATE THE VEIN", "hint": "5 CRYSTAL FRAGMENTS BY DEEP CRYSTAL", "progress_frames": 180},
	MAGMA_BEHEMOTH: {"title": "QUENCH THE MAGMA HEART", "hint": "MAKE STEAM BESIDE DEEP LAVA", "progress_frames": 180},
	STORM_ROC: {"title": "CHALLENGE THE STORM", "hint": "STAND UNCOVERED IN PLAINS THUNDER", "progress_frames": 240},
	MOON_STALKER: {"title": "WAIT IN TRUE DARKNESS", "hint": "STAND STILL AT NIGHT WITHOUT FIRE", "progress_frames": 240},
	DROWNED_FLEET: {"title": "PAY THE DROWNED", "hint": "3 PEARLS DURING AN OCEAN STORM", "progress_frames": 180},
	SKY_JELLYFISH: {"title": "CHARGE THE SKY", "hint": "2 ELECTRIC GLANDS IN A HIGH STORM", "progress_frames": 180},
	WORLD_EATER: {"title": "DRAW THE WORLD EATER", "hint": "GO DEEP AFTER 5 BOSS VICTORIES", "progress_frames": 180},
}

static func definition(kind: String) -> Dictionary:
	return BOSSES.get(kind, {})

static func ritual(kind: String) -> Dictionary:
	return RITUALS.get(kind, {})
