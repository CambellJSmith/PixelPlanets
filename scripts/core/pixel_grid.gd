class_name PixelGrid
extends RefCounted

const STORED_COORDINATE_KEYS: Array[String] = [
	"target_x", "target_y", "home_x", "home_y", "ground_y", "water_y",
	"entry_x", "entry_y", "exit_x", "exit_y", "pointer_x", "pointer_y",
	"beam_x", "beam_y", "impact_x", "impact_y", "source_x", "source_y",
	"anchor_x", "anchor_y", "base_x", "base_y",
]

static func nearest_pixel(value: Variant) -> int:
	return roundi(float(value)) if value != null else 0

static func place_on_pixel(entity: Dictionary, x: Variant = null, y: Variant = null) -> Dictionary:
	entity["x"] = nearest_pixel(entity.get("x", 0) if x == null else x)
	entity["y"] = nearest_pixel(entity.get("y", 0) if y == null else y)
	entity.erase("__pixel_carry_x")
	entity.erase("__pixel_carry_y")
	return entity

static func snap_pixel_position(entity: Dictionary) -> Dictionary:
	var raw_x: float = float(entity.get("x", 0.0))
	var raw_y: float = float(entity.get("y", 0.0))
	var combined_x: float = raw_x + float(entity.get("__pixel_carry_x", 0.0))
	var combined_y: float = raw_y + float(entity.get("__pixel_carry_y", 0.0))
	var snapped_x: int = roundi(combined_x)
	var snapped_y: int = roundi(combined_y)
	entity["__pixel_carry_x"] = combined_x - float(snapped_x)
	entity["__pixel_carry_y"] = combined_y - float(snapped_y)
	entity["x"] = snapped_x
	entity["y"] = snapped_y
	return entity

static func snap_stored_coordinates(entity: Dictionary, keys: Array[String] = STORED_COORDINATE_KEYS) -> Dictionary:
	for key: String in keys:
		if entity.has(key) and entity[key] != null:
			entity[key] = nearest_pixel(entity[key])
	return entity

static func _snap_array(array: Array) -> void:
	for value: Variant in array:
		if value is Dictionary:
			var entity: Dictionary = value
			snap_pixel_position(entity)
			snap_stored_coordinates(entity)

static func snap_game_positions(state: GameState) -> void:
	state.player["x"] = nearest_pixel(state.player.get("x", 0))
	state.player["y"] = nearest_pixel(state.player.get("y", 0))
	state.input["pointer_x"] = nearest_pixel(state.input.get("pointer_x", 0))
	state.input["pointer_y"] = nearest_pixel(state.input.get("pointer_y", 0))
	state.tool_effect["x"] = nearest_pixel(state.tool_effect.get("x", 0))
	state.tool_effect["y"] = nearest_pixel(state.tool_effect.get("y", 0))
	var hook: Dictionary = state.entities["hook"]
	snap_pixel_position(hook)
	for key: String in [
		"bullets", "napalm_shots", "glaives", "grenades", "drones", "drone_rockets",
		"bosses", "boss_fireballs", "serpent_projectiles", "boss_projectiles", "explosions",
		"seed_particles", "pickups", "laser_sparks", "nyan_cats", "nyan_sparks", "reality_sparks",
		"enemy_nests", "invasion_portals", "furniture", "juice_particles", "damage_numbers",
		"juice_flashes", "juice_shockwaves",
	]:
		_snap_array(state.entities[key])
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		_snap_array(chunk["enemies"])
	_snap_array(state.weather["flashes"])
