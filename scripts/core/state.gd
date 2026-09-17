class_name GameState
extends RefCounted

var seed: int = 1
var frame: int = 0
var paused: bool = false
var crystals: int = 0
var weapon_id: int = 0
var cooldown: int = 0
var jump_buffer: int = 0
var coyote_frames: int = 0
var sword_timer: int = 0
var sword_angle: float = 0.0

var player: Dictionary = {}
var input: Dictionary = {}
var world: Dictionary = {}
var entities: Dictionary = {}
var inventory: Dictionary = {}
var ui: Dictionary = {}
var weather: Dictionary = {}
var build: Dictionary = {}
var seed_mode: Dictionary = {}
var magnifier: Dictionary = {}
var laser: Dictionary = {}
var reality_zipper: Dictionary = {}
var tool_effect: Dictionary = {}
var juice: Dictionary = {}
var save: Dictionary = {}

func _init(world_seed: int = 1) -> void:
	reset(world_seed)

func reset(world_seed: int) -> void:
	seed = world_seed
	frame = 0
	paused = false
	crystals = 0
	weapon_id = 0
	cooldown = 0
	jump_buffer = 0
	coyote_frames = 0
	sword_timer = 0
	sword_angle = 0.0
	player = {
		"x": 48, "y": 45, "vx": 0.0, "vy": 0.0, "width": 3, "height": 5,
		"facing": 1, "grounded": false, "hp": 100.0, "hunger": 100.0,
		"hunger_remainder": 0.0, "starvation_timer": 0, "breath": 100.0,
		"breath_remainder": 0.0, "drowning_timer": 0, "invulnerability": 0,
		"locked": false, "sky_spawn": false, "spawn_ground_y": 0,
		"parasite_slow_multiplier": 1.0, "attached_parasites": [],
		"stolen_weapon_id": null, "weapon_theft_cooldown": 0,
		"furniture_mode": "", "furniture_seat_id": null,
		"bunny_hop": {"chain": 0, "landing_window": 0, "ground_frames": 0, "last_landing_frame": -9999, "last_jump_frame": -9999},
		"status": {"lava": false, "fire": false, "steam": false, "starving": false, "swimming": false, "climbing": false, "head_submerged": false, "breath_using": false, "no_oxygen": false},
	}
	input = {"keys": {}, "pointer_x": 180, "pointer_y": 105, "pointer_down": false, "pointer_button": 0, "pointer_inside": false, "touch_mode": false, "portal_code_buffer": "", "portal_code_until": 0}
	world = {
		"camera": {"chunk_x": 0, "chunk_y": 0}, "chunks": {}, "active_chunks": [], "active_keys": {},
		"simulation_stamp": 1, "dimension": "earth", "dimension_positions": {}, "dimension_entities": {},
		"visited_dimensions": {"earth": true}, "moon_reached": false, "rocket_flight": {"active": false, "phase": "idle", "timer": 0},
		"dimension_portal": {"active": false, "phase": "idle", "timer": 0, "life": 0, "x": 0, "y": 0, "target_dimension": "moon"},
		"plants": {}, "next_plant_id": 1, "first_volcano_region_index": null, "boss_spawned": false,
		"boss_defeated": false, "first_ocean_region_index": null, "sea_serpent_spawned": false,
		"sea_serpent_defeated": false, "boss_encounters": {}, "defeated_boss_count": 0,
		"boss_cooldown_until": 0, "travel_origin_x": 48, "next_invasion_frame": null,
		"invasion_count": 0, "invasion_serial": 1,
	}
	entities = {}
	for key: String in [
		"bullets", "napalm_shots", "glaives", "grenades", "drones", "drone_rockets", "nyan_cats", "nyan_sparks",
		"laser_sparks", "reality_rifts", "reality_sparks", "explosions", "bosses", "boss_fireballs", "serpent_projectiles",
		"boss_projectiles", "pickups", "seed_particles", "enemy_nests", "invasion_portals", "furniture",
		"juice_particles", "damage_numbers", "juice_flashes", "juice_shockwaves"
	]:
		entities[key] = []
	entities["hook"] = {"active": false, "stuck": false, "x": 0.0, "y": 0.0, "vx": 0.0, "vy": 0.0}
	inventory = {"counts": {}, "order": [], "items": {}, "loot": {}, "furniture": {}}
	ui = {
		"inventory_open": false, "inventory_index": 0, "crafting_open": false, "crafting_index": 0,
		"world_menu_open": false, "world_slot_index": 0, "world_menu_return_paused": false,
		"confirm_world_action": "", "confirm_world_slot": 0, "save_slots": [], "inventory_rects": [],
		"message": "", "message_until": 0, "save_status": "", "save_status_until": 0,
		"damage_flash": 0, "damage_direction": 0, "context_prompt": "", "boss_ritual": null,
		"pickup_feed": [], "hud": {}, "tool_status": "",
	}
	weather = {"override_type": null, "current_type": "clear", "previous_type": "clear", "segment": -1, "intensity": 0.0, "wind_x": 0.0, "visibility": 1.0, "next_lightning_frame": 0, "flashes": []}
	build = {"active": false, "equipped_material": null, "equipped_furniture_id": null}
	seed_mode = {"active": false, "crop_id": null}
	magnifier = {"zoom": 1.0}
	laser = {"heat": 0.0, "overheated": false, "active": false, "beam": null, "contact_heat": 0.0, "hot_pixels": []}
	reality_zipper = {"active": false, "phase": "idle"}
	tool_effect = {"x": 0, "y": 0, "kind": "", "valid": false, "frames": 0}
	juice = {"shake": 0.0, "shake_frames": 0, "hit_stop_frames": 0, "screen_flash": 0, "screen_flash_max": 0, "screen_flash_color": Color.TRANSPARENT, "recoil_frames": 0, "recoil_x": 0, "player_squash": 0, "player_stretch": 0, "hud_pulse": 0, "celebration_frames": 0, "speed_intensity": 0.0}
	save = {"active_slot": 1, "last_saved_at": 0, "dirty": false}

func show_message(text: String, duration_ms: int = 1400) -> void:
	ui["message"] = text
	ui["message_until"] = frame + max(1, ceili(float(duration_ms) / 1000.0 * 60.0))

func inventory_add_material(material_id: int, count: int = 1) -> void:
	if count <= 0:
		return
	var counts: Dictionary = inventory["counts"]
	counts[material_id] = int(counts.get(material_id, 0)) + count
	var order: Array = inventory["order"]
	if not order.has(material_id):
		order.append(material_id)

func inventory_remove_material(material_id: int, count: int = 1) -> bool:
	var counts: Dictionary = inventory["counts"]
	var held: int = int(counts.get(material_id, 0))
	if held < count:
		return false
	counts[material_id] = held - count
	return true

func inventory_add_item(kind: String, item_id: Variant, count: int = 1) -> void:
	var key: String = "%s:%s" % [kind, str(item_id)]
	var items: Dictionary = inventory["items"]
	items[key] = int(items.get(key, 0)) + count

func inventory_item_count(kind: String, item_id: Variant) -> int:
	return int((inventory["items"] as Dictionary).get("%s:%s" % [kind, str(item_id)], 0))

func inventory_remove_item(kind: String, item_id: Variant, count: int = 1) -> bool:
	var key: String = "%s:%s" % [kind, str(item_id)]
	var items: Dictionary = inventory["items"]
	var held: int = int(items.get(key, 0))
	if held < count:
		return false
	items[key] = held - count
	return true

func inventory_add_loot(loot_id: String, count: int = 1) -> void:
	var loot: Dictionary = inventory["loot"]
	loot[loot_id] = int(loot.get(loot_id, 0)) + count

func inventory_loot_count(loot_id: String) -> int:
	return int((inventory["loot"] as Dictionary).get(loot_id, 0))

func inventory_remove_loot(loot_id: String, count: int = 1) -> bool:
	var loot: Dictionary = inventory["loot"]
	var held: int = int(loot.get(loot_id, 0))
	if held < count:
		return false
	loot[loot_id] = held - count
	return true

func inventory_add_furniture(furniture_id: String, count: int = 1) -> void:
	var items: Dictionary = inventory["furniture"]
	items[furniture_id] = int(items.get(furniture_id, 0)) + count

func inventory_furniture_count(furniture_id: String) -> int:
	return int((inventory["furniture"] as Dictionary).get(furniture_id, 0))

func inventory_remove_furniture(furniture_id: String, count: int = 1) -> bool:
	var items: Dictionary = inventory["furniture"]
	var held: int = int(items.get(furniture_id, 0))
	if held < count:
		return false
	items[furniture_id] = held - count
	return true
