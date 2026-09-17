class_name SaveSystem
extends RefCounted

const SAVE_VERSION: int = 4
const SLOT_COUNT: int = 3
const AUTOSAVE_INTERVAL_FRAMES: int = 60 * 60 * 3
const ACTIVE_SLOT_PATH: String = "user://pixel_planets_active_slot.txt"

var state: GameState
var world: WorldModel
var time_system: TimeSystem
var reset_world: Callable
var after_load: Callable
var before_save: Callable
var next_autosave_frame: int = AUTOSAVE_INTERVAL_FRAMES

func _init(game_state: GameState, world_model: WorldModel, time: TimeSystem, reset_callback: Callable = Callable(), after_load_callback: Callable = Callable(), before_save_callback: Callable = Callable()) -> void:
	state = game_state
	world = world_model
	time_system = time
	reset_world = reset_callback
	after_load = after_load_callback
	before_save = before_save_callback
	refresh_slots()


func _clean_runtime_clone(value: Variant) -> Variant:
	if value is Dictionary:
		var source: Dictionary = value
		var cleaned: Dictionary = {}
		for key_value: Variant in source.keys():
			var key: String = String(key_value)
			if key.begins_with("__pixel_"):
				continue
			cleaned[key_value] = _clean_runtime_clone(source[key_value])
		return cleaned
	if value is Array:
		var cleaned_array: Array = []
		for item: Variant in value:
			cleaned_array.append(_clean_runtime_clone(item))
		return cleaned_array
	return value

func _clamp_slot(slot: int) -> int:
	return clampi(slot, 1, SLOT_COUNT)

func _slot_path(slot: int) -> String:
	return "user://pixel_planets_slot_%d.json" % _clamp_slot(slot)

func _set_status(text: String, duration_frames: int = 210) -> void:
	state.ui["save_status"] = text
	state.ui["save_status_until"] = state.frame + maxi(1, duration_frames)

func mark_dirty() -> void:
	state.save["dirty"] = true

func _read_snapshot(slot: int) -> Dictionary:
	var path: String = _slot_path(slot)
	if not FileAccess.file_exists(path):
		return {}
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return {}
	var data: Dictionary = parsed
	if int(data.get("version", 0)) not in [1, 2, 3, SAVE_VERSION]:
		return {}
	return data

func _slot_metadata(slot: int, snapshot: Dictionary = {}) -> Dictionary:
	var data: Dictionary = snapshot if not snapshot.is_empty() else _read_snapshot(slot)
	if data.is_empty():
		return {"slot": slot, "empty": true}
	var meta: Dictionary = data.get("meta", {})
	var player: Dictionary = data.get("player", {})
	return {
		"slot": slot, "empty": false, "seed": int(data.get("seed", 0)), "frame": int(data.get("frame", 0)),
		"day": int(meta.get("day", 1)), "biome": String(meta.get("biome", "unknown")).replace("_", " "),
		"saved_at": int(meta.get("saved_at", 0)), "hp": maxi(0, roundi(float(player.get("hp", 100)))),
		"hunger": maxi(0, roundi(float(player.get("hunger", 100)))),
	}

func refresh_slots() -> Array:
	var slots: Array = []
	for slot: int in range(1, SLOT_COUNT + 1):
		slots.append(_slot_metadata(slot))
	state.ui["save_slots"] = slots
	return slots

func _serialize_inventory() -> Dictionary:
	var materials: Array = []
	for material_id: Variant in state.inventory["order"]:
		materials.append([int(material_id), int((state.inventory["counts"] as Dictionary).get(material_id, 0))])
	return {
		"materials": materials,
		"items": state.inventory["items"],
		"loot": state.inventory["loot"],
		"furniture": state.inventory["furniture"],
	}

func _serialize_chunk(chunk: Dictionary) -> Dictionary:
	var dirty: Dictionary = chunk["save_dirty"]
	var preserve_enemies: bool = bool(chunk.get("save_enemies", false)) or bool((state.world["active_keys"] as Dictionary).get(world.chunk_key(int(chunk["x"]), int(chunk["y"]), String(chunk.get("dimension", state.world["dimension"]))), false))
	if dirty.is_empty() and not preserve_enemies:
		return {}
	var indices: Array = dirty.keys()
	indices.sort()
	var changes: Array = []
	var cells: PackedByteArray = chunk["cells"]
	var shade: PackedByteArray = chunk["shade"]
	var life: PackedByteArray = chunk["life"]
	var age: PackedInt32Array = chunk["age"]
	var crop_id: PackedByteArray = chunk["crop_id"]
	var plant_id: PackedInt32Array = chunk["plant_id"]
	for index_variant: Variant in indices:
		var index: int = int(index_variant)
		changes.append_array([index, int(cells[index]), int(shade[index]), int(life[index]), int(age[index]), int(crop_id[index]), int(plant_id[index])])
	var result: Dictionary = {"x": int(chunk["x"]), "y": int(chunk["y"]), "dimension": String(chunk.get("dimension", "earth")), "changes": changes}
	if preserve_enemies:
		result["enemies"] = _clean_runtime_clone(chunk["enemies"])
	return result

func _serialize_world(slot: int) -> Dictionary:
	var time: Dictionary = time_system.get_time()
	var chunk_data: Array = []
	for chunk_variant: Variant in (state.world["chunks"] as Dictionary).values():
		var serialized: Dictionary = _serialize_chunk(chunk_variant)
		if not serialized.is_empty():
			chunk_data.append(serialized)
	var plants: Array = []
	for plant_id: Variant in (state.world["plants"] as Dictionary).keys():
		plants.append([plant_id, (state.world["plants"] as Dictionary)[plant_id]])
	var entity_data: Dictionary = {}
	for key: String in ["bosses","boss_fireballs","serpent_projectiles","boss_projectiles","pickups","seed_particles","enemy_nests","invasion_portals","furniture"]:
		entity_data[key] = _clean_runtime_clone(state.entities[key])
	return {
		"version": SAVE_VERSION,
		"meta": {"slot": slot, "saved_at": int(Time.get_unix_time_from_system() * 1000.0), "day": int(time["day_number"]), "biome": world.biome_name_at(roundi(float(state.player["x"])), roundi(float(state.player["y"]) - 2.0))},
		"seed": state.seed, "frame": state.frame, "crystals": state.crystals, "weapon_id": state.weapon_id, "cooldown": state.cooldown,
		"laser": {"heat": state.laser["heat"], "overheated": state.laser["overheated"]}, "jump_buffer": state.jump_buffer,
		"coyote_frames": state.coyote_frames, "sword_timer": state.sword_timer, "sword_angle": state.sword_angle,
		"player": _clean_runtime_clone(state.player), "magnifier": _clean_runtime_clone(state.magnifier), "build": _clean_runtime_clone(state.build),
		"seed_mode": _clean_runtime_clone(state.seed_mode), "weather": _clean_runtime_clone(state.weather),
		"world": {
			"first_volcano_region_index": state.world["first_volcano_region_index"], "boss_spawned": state.world["boss_spawned"], "boss_defeated": state.world["boss_defeated"],
			"first_ocean_region_index": state.world["first_ocean_region_index"], "sea_serpent_spawned": state.world["sea_serpent_spawned"], "sea_serpent_defeated": state.world["sea_serpent_defeated"],
			"boss_encounters": state.world["boss_encounters"], "defeated_boss_count": state.world["defeated_boss_count"], "boss_cooldown_until": state.world["boss_cooldown_until"],
			"travel_origin_x": state.world["travel_origin_x"], "dimension": state.world["dimension"], "dimension_positions": state.world["dimension_positions"], "dimension_entities": state.world["dimension_entities"],
			"moon_reached": state.world["moon_reached"], "visited_dimensions": state.world["visited_dimensions"], "rocket_flight": state.world["rocket_flight"],
			"next_plant_id": state.world["next_plant_id"], "next_invasion_frame": state.world["next_invasion_frame"], "invasion_count": state.world["invasion_count"], "invasion_serial": state.world["invasion_serial"],
		},
		"plants": _clean_runtime_clone(plants), "chunks": chunk_data, "inventory": _clean_runtime_clone(_serialize_inventory()), "entities": entity_data,
	}

func save(slot: int = -1, silent: bool = false, reason: String = "manual") -> bool:
	var safe_slot: int = _clamp_slot(int(state.save["active_slot"]) if slot < 0 else slot)
	if before_save.is_valid():
		before_save.call()
	var snapshot: Dictionary = _serialize_world(safe_slot)
	var file: FileAccess = FileAccess.open(_slot_path(safe_slot), FileAccess.WRITE)
	if file == null:
		if not silent: _set_status("SAVE FAILED")
		return false
	file.store_string(JSON.stringify(snapshot))
	var active_file: FileAccess = FileAccess.open(ACTIVE_SLOT_PATH, FileAccess.WRITE)
	if active_file != null:
		active_file.store_string(str(safe_slot))
	state.save["active_slot"] = safe_slot
	state.save["last_saved_at"] = int(snapshot["meta"]["saved_at"])
	state.save["dirty"] = false
	next_autosave_frame = state.frame + AUTOSAVE_INTERVAL_FRAMES
	refresh_slots()
	if not silent:
		_set_status("AUTOSAVED SLOT %d" % safe_slot if reason == "auto" else "SAVED SLOT %d" % safe_slot)
	return true

func _restore_inventory(data: Dictionary) -> void:
	state.inventory = {"counts": {}, "order": [], "items": {}, "loot": {}, "furniture": {}}
	for pair: Variant in data.get("materials", []):
		state.inventory_add_material(int(pair[0]), int(pair[1]))
	state.inventory["items"] = (data.get("items", {}) as Dictionary).duplicate(true)
	state.inventory["loot"] = (data.get("loot", {}) as Dictionary).duplicate(true)
	state.inventory["furniture"] = (data.get("furniture", {}) as Dictionary).duplicate(true)

func _restore_chunk(data: Dictionary) -> void:
	var dimension: String = String(data.get("dimension", "earth"))
	var previous_dimension: String = String(state.world["dimension"])
	state.world["dimension"] = dimension
	var chunk: Dictionary = world._generate_chunk(int(data["x"]), int(data["y"]))
	state.world["dimension"] = previous_dimension
	var changes: Array = data.get("changes", [])
	var cells: PackedByteArray = chunk["cells"]
	var shade: PackedByteArray = chunk["shade"]
	var life: PackedByteArray = chunk["life"]
	var age: PackedInt32Array = chunk["age"]
	var crop_id: PackedByteArray = chunk["crop_id"]
	var plant_id: PackedInt32Array = chunk["plant_id"]
	for offset: int in range(0, changes.size() - 6, 7):
		var index: int = int(changes[offset])
		if index < 0 or index >= GameConfig.CHUNK_CELL_COUNT:
			continue
		cells[index] = int(changes[offset + 1]); shade[index] = int(changes[offset + 2]); life[index] = int(changes[offset + 3]); age[index] = int(changes[offset + 4]); crop_id[index] = int(changes[offset + 5]); plant_id[index] = int(changes[offset + 6])
		(chunk["save_dirty"] as Dictionary)[index] = true
	if data.has("enemies"):
		chunk["enemies"] = (data["enemies"] as Array).duplicate(true)
		chunk["save_enemies"] = true
	chunk["render_full_dirty"] = true
	world.initialize_chunk_tracking(chunk)
	(state.world["chunks"] as Dictionary)[world.chunk_key(int(chunk["x"]), int(chunk["y"]), dimension)] = chunk

func load(slot: int = -1, silent: bool = false) -> bool:
	var safe_slot: int = _clamp_slot(int(state.save["active_slot"]) if slot < 0 else slot)
	var snapshot: Dictionary = _read_snapshot(safe_slot)
	if snapshot.is_empty():
		if not silent: _set_status("SLOT %d IS EMPTY" % safe_slot)
		return false
	var seed_value: int = int(snapshot.get("seed", 1))
	if reset_world.is_valid():
		reset_world.call(seed_value)
	else:
		state.reset(seed_value)
	state.frame = maxi(0, int(snapshot.get("frame", 0)))
	state.crystals = maxi(0, int(snapshot.get("crystals", 0)))
	state.weapon_id = int(snapshot.get("weapon_id", 0))
	state.cooldown = maxi(0, int(snapshot.get("cooldown", 0)))
	state.laser.merge(snapshot.get("laser", {}), true)
	state.laser["active"] = false
	state.laser["beam"] = null
	state.laser["contact_heat"] = 0.0
	state.laser["hot_pixels"] = []
	state.jump_buffer = maxi(0, int(snapshot.get("jump_buffer", 0)))
	state.coyote_frames = maxi(0, int(snapshot.get("coyote_frames", 0)))
	state.sword_timer = maxi(0, int(snapshot.get("sword_timer", 0)))
	state.sword_angle = float(snapshot.get("sword_angle", 0.0))
	state.player.merge(snapshot.get("player", {}), true)
	state.magnifier.merge(snapshot.get("magnifier", {}), true)
	state.build.merge(snapshot.get("build", {}), true)
	state.seed_mode.merge(snapshot.get("seed_mode", {}), true)
	state.weather.merge(snapshot.get("weather", {}), true)
	var world_data: Dictionary = snapshot.get("world", {})
	for key: String in world_data.keys():
		state.world[key] = world_data[key]
	state.world["dimension_portal"] = {"active":false,"phase":"idle","timer":0,"life":0,"x":0,"y":0,"target_dimension":"moon"}
	state.world["chunks"] = {}
	state.world["active_chunks"] = []
	state.world["active_keys"] = {}
	state.world["plants"] = {}
	for pair: Variant in snapshot.get("plants", []):
		(state.world["plants"] as Dictionary)[int(pair[0])] = (pair[1] as Dictionary).duplicate(true)
	_restore_inventory(snapshot.get("inventory", {}))
	for chunk_data: Variant in snapshot.get("chunks", []):
		_restore_chunk(chunk_data)
	var entities: Dictionary = snapshot.get("entities", {})
	for key: String in ["bosses","boss_fireballs","serpent_projectiles","boss_projectiles","pickups","seed_particles","enemy_nests","invasion_portals","furniture"]:
		(state.entities[key] as Array).clear()
		(state.entities[key] as Array).append_array((entities.get(key, []) as Array).duplicate(true))
	state.ui["inventory_open"] = false
	state.ui["crafting_open"] = false
	state.ui["world_menu_open"] = false
	state.paused = false
	state.save["active_slot"] = safe_slot
	state.save["last_saved_at"] = int((snapshot.get("meta", {}) as Dictionary).get("saved_at", 0))
	state.save["dirty"] = false
	world.update_active_neighborhood()
	if after_load.is_valid():
		after_load.call()
	refresh_slots()
	next_autosave_frame = state.frame + AUTOSAVE_INTERVAL_FRAMES
	if not silent: _set_status("LOADED SLOT %d" % safe_slot)
	return true

func remove(slot: int) -> bool:
	var safe_slot: int = _clamp_slot(slot)
	var error: Error = DirAccess.remove_absolute(ProjectSettings.globalize_path(_slot_path(safe_slot))) if FileAccess.file_exists(_slot_path(safe_slot)) else OK
	if error != OK:
		_set_status("DELETE FAILED")
		return false
	refresh_slots()
	_set_status("DELETED SLOT %d" % safe_slot)
	return true

func active_slot_from_storage() -> int:
	if not FileAccess.file_exists(ACTIVE_SLOT_PATH):
		return 1
	var file: FileAccess = FileAccess.open(ACTIVE_SLOT_PATH, FileAccess.READ)
	return _clamp_slot(int(file.get_as_text())) if file != null else 1

func load_last_active() -> bool:
	var slot: int = active_slot_from_storage()
	state.save["active_slot"] = slot
	return load(slot, true)

func autosave() -> bool:
	if not bool(state.save["dirty"]):
		return false
	return save(int(state.save["active_slot"]), false, "auto")

func update() -> void:
	if state.frame >= next_autosave_frame:
		autosave()
		next_autosave_frame = state.frame + AUTOSAVE_INTERVAL_FRAMES
