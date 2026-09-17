class_name WorldModel
extends RefCounted

var state: GameState
var noise: PixelNoise
var change_observers: Array[Callable] = []
var _surface_cache: Dictionary = {}
var _biome_mix_cache: Dictionary = {}
var _cache_seed: int
var _cache_dimension: String

func _init(game_state: GameState, pixel_noise: PixelNoise) -> void:
	state = game_state
	noise = pixel_noise
	_cache_seed = state.seed
	_cache_dimension = String(state.world["dimension"])

func chunk_x(world_x: float) -> int:
	return floori(world_x / float(GameConfig.WORLD_WIDTH))

func chunk_y(world_y: float) -> int:
	return floori(world_y / float(GameConfig.WORLD_HEIGHT))

func chunk_key(cx: int, cy: int, dimension_id: String = "") -> String:
	var dim: String = dimension_id
	if dim.is_empty():
		dim = String(state.world["dimension"])
	return "%s:%d,%d" % [dim, cx, cy]

func local_index(world_x: int, world_y: int) -> int:
	return posmod(world_x, GameConfig.WORLD_WIDTH) + posmod(world_y, GameConfig.WORLD_HEIGHT) * GameConfig.WORLD_WIDTH

func _new_chunk(cx: int, cy: int) -> Dictionary:
	var cells: PackedByteArray = PackedByteArray()
	cells.resize(GameConfig.CHUNK_CELL_COUNT)
	var shade: PackedByteArray = PackedByteArray()
	shade.resize(GameConfig.CHUNK_CELL_COUNT)
	var life: PackedByteArray = PackedByteArray()
	life.resize(GameConfig.CHUNK_CELL_COUNT)
	var moved: PackedInt32Array = PackedInt32Array()
	moved.resize(GameConfig.CHUNK_CELL_COUNT)
	var age: PackedInt32Array = PackedInt32Array()
	age.resize(GameConfig.CHUNK_CELL_COUNT)
	var crop_id: PackedByteArray = PackedByteArray()
	crop_id.resize(GameConfig.CHUNK_CELL_COUNT)
	var plant_id: PackedInt32Array = PackedInt32Array()
	plant_id.resize(GameConfig.CHUNK_CELL_COUNT)
	var active_flags: PackedByteArray = PackedByteArray()
	active_flags.resize(GameConfig.CHUNK_CELL_COUNT)
	var active_queued: PackedByteArray = PackedByteArray()
	active_queued.resize(GameConfig.CHUNK_CELL_COUNT)
	return {
		"x": cx, "y": cy, "dimension": String(state.world["dimension"]),
		"cells": cells, "shade": shade, "life": life, "moved": moved, "age": age,
		"crop_id": crop_id, "plant_id": plant_id, "enemies": [], "save_enemies": false,
		"render_dirty": [], "render_full_dirty": true, "save_dirty": {},
		"active_material_flags": active_flags, "active_material_queued": active_queued,
		"active_material_queue": [], "active_material_count": 0, "tracking_initialized": false,
	}

func get_chunk(cx: int, cy: int, create: bool = true) -> Dictionary:
	var key: String = chunk_key(cx, cy)
	var chunks: Dictionary = state.world["chunks"]
	if chunks.has(key):
		return chunks[key]
	if not create:
		return {}
	var chunk: Dictionary = _generate_chunk(cx, cy)
	chunks[key] = chunk
	return chunk

func update_active_neighborhood() -> void:
	var camera: Dictionary = state.world["camera"]
	var center_x: int = chunk_x(float(state.player["x"]))
	var center_y: int = chunk_y(float(state.player["y"]))
	camera["chunk_x"] = center_x
	camera["chunk_y"] = center_y
	var active: Array = []
	var active_keys: Dictionary = {}
	for offset_y: int in range(-GameConfig.ACTIVE_RADIUS, GameConfig.ACTIVE_RADIUS + 1):
		for offset_x: int in range(-GameConfig.ACTIVE_RADIUS, GameConfig.ACTIVE_RADIUS + 1):
			var cx: int = center_x + offset_x
			var cy: int = center_y + offset_y
			var chunk: Dictionary = get_chunk(cx, cy, true)
			active.append(chunk)
			active_keys[chunk_key(cx, cy)] = true
	state.world["active_chunks"] = active
	state.world["active_keys"] = active_keys

func is_active_world_position(world_x: float, world_y: float) -> bool:
	return (state.world["active_keys"] as Dictionary).has(chunk_key(chunk_x(world_x), chunk_y(world_y)))

func get_cell(world_x: int, world_y: int) -> int:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	return int((chunk["cells"] as PackedByteArray)[local_index(world_x, world_y)])

func get_life(world_x: int, world_y: int) -> int:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	return int((chunk["life"] as PackedByteArray)[local_index(world_x, world_y)])

func get_age(world_x: int, world_y: int) -> int:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	return int((chunk["age"] as PackedInt32Array)[local_index(world_x, world_y)])

func get_crop_id(world_x: int, world_y: int) -> int:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	return int((chunk["crop_id"] as PackedByteArray)[local_index(world_x, world_y)])

func get_plant_id(world_x: int, world_y: int) -> int:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	return int((chunk["plant_id"] as PackedInt32Array)[local_index(world_x, world_y)])

func set_age(world_x: int, world_y: int, value: int) -> void:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	(chunk["age"] as PackedInt32Array)[local_index(world_x, world_y)] = max(0, value)

func is_solid(material_id: int) -> bool:
	return GameData.is_solid(material_id)

func player_occupies_pixel(world_x: int, world_y: int) -> bool:
	var player_x: int = roundi(float(state.player["x"]))
	var player_y: int = roundi(float(state.player["y"]))
	var half_left: int = int(floor(float(int(state.player["width"]) - 1) * 0.5))
	var left: int = player_x - half_left
	var right: int = left + int(state.player["width"]) - 1
	var top: int = player_y - int(state.player["height"]) + 1
	return world_x >= left and world_x <= right and world_y >= top and world_y <= player_y

func set_cell(world_x: int, world_y: int, material_id: int, life_value: int = 0, options: Dictionary = {}) -> bool:
	if material_id != GameData.AIR and not bool(options.get("ignore_player", false)) and player_occupies_pixel(world_x, world_y):
		return false
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	var index: int = local_index(world_x, world_y)
	var cells: PackedByteArray = chunk["cells"]
	var life: PackedByteArray = chunk["life"]
	var crop_ids: PackedByteArray = chunk["crop_id"]
	var plant_ids: PackedInt32Array = chunk["plant_id"]
	var old_type: int = int(cells[index])
	var old_life: int = int(life[index])
	var old_crop: int = int(crop_ids[index])
	var old_plant: int = int(plant_ids[index])
	var new_crop: int = int(options.get("crop_id", 0))
	var new_plant: int = int(options.get("plant_id", 0))
	if old_type == material_id and old_life == life_value and old_crop == new_crop and old_plant == new_plant:
		return true
	cells[index] = material_id
	life[index] = clampi(life_value, 0, 255)
	crop_ids[index] = clampi(new_crop, 0, 255)
	plant_ids[index] = max(0, new_plant)
	(chunk["age"] as PackedInt32Array)[index] = 0
	(chunk["render_dirty"] as Array).append(index)
	(chunk["save_dirty"] as Dictionary)[index] = true
	state.save["dirty"] = true
	_track_changed_cell(chunk, index)
	if not bool(options.get("silent", false)):
		var event: Dictionary = {
			"x": world_x, "y": world_y, "old_type": old_type, "new_type": material_id,
			"old_life": old_life, "new_life": life_value, "old_crop_id": old_crop,
			"new_crop_id": new_crop, "old_plant_id": old_plant, "new_plant_id": new_plant,
			"reason": String(options.get("reason", "set_cell")),
		}
		for observer: Callable in change_observers:
			observer.call(event)
	return true

func set_plant_cell(world_x: int, world_y: int, material_id: int, crop_id: int, plant_id: int, options: Dictionary = {}) -> bool:
	var merged: Dictionary = options.duplicate()
	merged["crop_id"] = crop_id
	merged["plant_id"] = plant_id
	merged["reason"] = String(options.get("reason", "plant-growth"))
	return set_cell(world_x, world_y, material_id, 0, merged)

func add_change_observer(callback: Callable) -> void:
	if not change_observers.has(callback):
		change_observers.append(callback)

func set_life(world_x: int, world_y: int, value: int) -> void:
	var chunk: Dictionary = get_chunk(chunk_x(world_x), chunk_y(world_y), true)
	var index: int = local_index(world_x, world_y)
	(chunk["life"] as PackedByteArray)[index] = clampi(value, 0, 255)
	_track_changed_cell(chunk, index)

func swap_cells(ax: int, ay: int, bx: int, by: int) -> void:
	var chunk_a: Dictionary = get_chunk(chunk_x(ax), chunk_y(ay), true)
	var chunk_b: Dictionary = get_chunk(chunk_x(bx), chunk_y(by), true)
	var ia: int = local_index(ax, ay)
	var ib: int = local_index(bx, by)
	var fields: Array[String] = ["cells", "shade", "life", "age", "crop_id", "plant_id"]
	for field: String in fields:
		var array_a: Variant = chunk_a[field]
		var array_b: Variant = chunk_b[field]
		var temp: int = int(array_a[ia])
		array_a[ia] = array_b[ib]
		array_b[ib] = temp
	(chunk_a["render_dirty"] as Array).append(ia)
	(chunk_b["render_dirty"] as Array).append(ib)
	(chunk_a["save_dirty"] as Dictionary)[ia] = true
	(chunk_b["save_dirty"] as Dictionary)[ib] = true
	state.save["dirty"] = true
	var stamp: int = int(state.world["simulation_stamp"])
	(chunk_a["moved"] as PackedInt32Array)[ia] = stamp
	(chunk_b["moved"] as PackedInt32Array)[ib] = stamp
	_track_changed_cell(chunk_a, ia)
	_track_changed_cell(chunk_b, ib)

func _is_dynamic_for_sim(material_id: int) -> bool:
	return material_id == GameData.DIRT or material_id == GameData.FIRE or material_id == GameData.SMOKE or material_id == GameData.STEAM or material_id == GameData.NAPALM or material_id == GameData.WATER or material_id == GameData.LAVA or GameData.POWDERS.has(material_id)

func initialize_chunk_tracking(chunk: Dictionary) -> void:
	if bool(chunk.get("tracking_initialized", false)):
		return
	var flags: PackedByteArray = chunk["active_material_flags"]
	var queued: PackedByteArray = chunk["active_material_queued"]
	var queue: Array = chunk["active_material_queue"]
	var cells: PackedByteArray = chunk["cells"]
	var count: int = 0
	for index: int in range(GameConfig.CHUNK_CELL_COUNT):
		if not _is_dynamic_for_sim(int(cells[index])):
			continue
		flags[index] = 1
		queued[index] = 1
		queue.append(index)
		count += 1
	chunk["active_material_count"] = count
	chunk["tracking_initialized"] = true

func _track_changed_cell(chunk: Dictionary, index: int) -> void:
	if not bool(chunk.get("tracking_initialized", false)):
		return
	var flags: PackedByteArray = chunk["active_material_flags"]
	var queued: PackedByteArray = chunk["active_material_queued"]
	var queue: Array = chunk["active_material_queue"]
	var cells: PackedByteArray = chunk["cells"]
	var dynamic: bool = _is_dynamic_for_sim(int(cells[index]))
	var was_active: bool = flags[index] != 0
	if dynamic and not was_active:
		flags[index] = 1
		chunk["active_material_count"] = int(chunk["active_material_count"]) + 1
	elif not dynamic and was_active:
		flags[index] = 0
		chunk["active_material_count"] = max(0, int(chunk["active_material_count"]) - 1)
	if dynamic and queued[index] == 0:
		queued[index] = 1
		queue.append(index)
	var local_x: int = index % GameConfig.WORLD_WIDTH
	var local_y: int = floori(float(index) / float(GameConfig.WORLD_WIDTH))
	for offset: Vector2i in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
		var x: int = local_x + offset.x
		var y: int = local_y + offset.y
		if x < 0 or y < 0 or x >= GameConfig.WORLD_WIDTH or y >= GameConfig.WORLD_HEIGHT:
			continue
		var neighbor_index: int = x + y * GameConfig.WORLD_WIDTH
		if _is_dynamic_for_sim(int(cells[neighbor_index])) and queued[neighbor_index] == 0:
			flags[neighbor_index] = 1
			queued[neighbor_index] = 1
			queue.append(neighbor_index)

func _ensure_generator_cache() -> void:
	var current_dimension: String = String(state.world["dimension"])
	if _cache_seed == state.seed and _cache_dimension == current_dimension:
		return
	_cache_seed = state.seed
	_cache_dimension = current_dimension
	_surface_cache.clear()
	_biome_mix_cache.clear()

func _smooth(value: float) -> float:
	var x: float = clampf(value, 0.0, 1.0)
	return x * x * x * (x * (x * 6.0 - 15.0) + 10.0)

func region_biome_id(region_index: int) -> int:
	return int(floor(noise.random_at(region_index, 1501, 9087) * float(GameData.BIOMES.size()))) % GameData.BIOMES.size()

func biome_mix_at(world_x_value: float) -> Dictionary:
	_ensure_generator_cache()
	var world_x: int = floori(world_x_value)
	if _biome_mix_cache.has(world_x):
		return _biome_mix_cache[world_x]
	var region_index: int = floori(float(world_x) / float(GameData.BIOME_REGION_SIZE))
	var region_start: int = region_index * GameData.BIOME_REGION_SIZE
	var local: int = world_x - region_start
	var half_transition: float = float(GameData.BIOME_TRANSITION_WIDTH) * 0.5
	var current_id: int = region_biome_id(region_index)
	var weights: Dictionary = {}
	var regions: Dictionary = {}
	if float(local) < half_transition:
		var previous_id: int = region_biome_id(region_index - 1)
		var transition: float = _smooth((float(local) + half_transition) / float(GameData.BIOME_TRANSITION_WIDTH))
		weights[previous_id] = float(weights.get(previous_id, 0.0)) + 1.0 - transition
		weights[current_id] = float(weights.get(current_id, 0.0)) + transition
		regions[previous_id] = region_index - 1
		regions[current_id] = region_index
	elif float(local) > float(GameData.BIOME_REGION_SIZE) - half_transition:
		var next_id: int = region_biome_id(region_index + 1)
		var transition: float = _smooth((float(local) - (float(GameData.BIOME_REGION_SIZE) - half_transition)) / float(GameData.BIOME_TRANSITION_WIDTH))
		weights[current_id] = float(weights.get(current_id, 0.0)) + 1.0 - transition
		weights[next_id] = float(weights.get(next_id, 0.0)) + transition
		regions[current_id] = region_index
		regions[next_id] = region_index + 1
	else:
		weights[current_id] = 1.0
		regions[current_id] = region_index
	var entries: Array = []
	var dominant: int = current_id
	var dominant_weight: float = -1.0
	for key_value: Variant in weights.keys():
		var biome_id: int = int(key_value)
		var weight: float = float(weights[biome_id])
		entries.append({"id": biome_id, "weight": weight, "region_index": int(regions.get(biome_id, region_index))})
		if weight > dominant_weight:
			dominant_weight = weight
			dominant = biome_id
	var result: Dictionary = {"dominant": dominant, "region_index": region_index, "entries": entries, "weights": weights}
	_biome_mix_cache[world_x] = result
	return result

func biome_weight(mix: Dictionary, biome_id: int) -> float:
	return float((mix["weights"] as Dictionary).get(biome_id, 0.0))

func biome_id_at(world_x: float) -> int:
	return int(biome_mix_at(world_x)["dominant"])

func volcano_descriptor(region_index: int) -> Dictionary:
	if region_biome_id(region_index) != GameData.VOLCANO:
		return {}
	var region_start: int = region_index * GameData.BIOME_REGION_SIZE
	return {
		"region_index": region_index,
		"center": float(region_start) + float(GameData.BIOME_REGION_SIZE) * 0.5 + (noise.random_at(region_index, 77, 1509) - 0.5) * float(GameData.BIOME_REGION_SIZE) * 0.12,
		"cone_radius": float(GameData.BIOME_REGION_SIZE) * float(GameConfig.VOLCANO["cone_radius_ratio"]),
		"caldera_radius": lerpf(float(GameConfig.VOLCANO["caldera_radius_min"]), float(GameConfig.VOLCANO["caldera_radius_max"]), noise.random_at(region_index, 1, 1511)),
		"conduit_radius": lerpf(float(GameConfig.VOLCANO["conduit_radius_min"]), float(GameConfig.VOLCANO["conduit_radius_max"]), noise.random_at(region_index, 2, 1512)),
		"chamber_depth": lerpf(float(GameConfig.VOLCANO["chamber_depth_min"]), float(GameConfig.VOLCANO["chamber_depth_max"]), noise.random_at(region_index, 3, 1513)),
		"chamber_radius_x": lerpf(float(GameConfig.VOLCANO["chamber_radius_x_min"]), float(GameConfig.VOLCANO["chamber_radius_x_max"]), noise.random_at(region_index, 4, 1514)),
		"chamber_radius_y": lerpf(float(GameConfig.VOLCANO["chamber_radius_y_min"]), float(GameConfig.VOLCANO["chamber_radius_y_max"]), noise.random_at(region_index, 5, 1515)),
	}

func ocean_descriptor(region_index: int) -> Dictionary:
	if region_biome_id(region_index) != GameData.OCEAN:
		return {}
	var region_start: int = region_index * GameData.BIOME_REGION_SIZE
	return {
		"region_index": region_index, "center": float(region_start) + float(GameData.BIOME_REGION_SIZE) * 0.5,
		"sea_level": lerpf(float(GameConfig.OCEAN["sea_level_min"]), float(GameConfig.OCEAN["sea_level_max"]), noise.random_at(region_index, 1, 6101)),
		"floor_base": lerpf(float(GameConfig.OCEAN["floor_min"]), float(GameConfig.OCEAN["floor_max"]), noise.random_at(region_index, 2, 6102)),
		"trench_depth": lerpf(float(GameConfig.OCEAN["trench_depth"]) * 0.6, float(GameConfig.OCEAN["trench_depth"]), noise.random_at(region_index, 3, 6103)),
	}

func _dimension_surface_profile(dimension_id: String, world_x: int) -> Dictionary:
	var definition: Dictionary = GameData.dimension(dimension_id)
	var terrain: String = String(definition["terrain"])
	var ground: int = 58
	var water: int = ground
	var lake: bool = false
	var ocean: bool = false
	match terrain:
		"moon":
			var basin: float = (noise.noise_1d(world_x, 280.0, 9101) - 0.5) * 10.0
			var crater: float = (noise.noise_1d(world_x, 74.0, 9102) - 0.5) * 8.0
			var micro: float = (noise.noise_1d(world_x, 19.0, 9103) - 0.5) * 2.0
			var crater_center: int = floori(float(world_x) / 58.0) * 58 + 29
			var distance: float = absf(float(world_x - crater_center))
			ground = floori(58.0 + basin + crater + micro + maxf(0.0, 1.0 - distance / 16.0) * 6.0 - maxf(0.0, 1.0 - absf(distance - 15.0) / 6.0) * 2.0)
		"ember": ground = floori(58.0 + (noise.noise_1d(world_x, 125.0, 9301) - 0.5) * 19.0 + (noise.noise_1d(world_x, 31.0, 9302) - 0.5) * 5.0)
		"frost": ground = floori(56.0 + (noise.noise_1d(world_x, 230.0, 9311) - 0.5) * 18.0 - maxf(0.0, noise.noise_1d(world_x, 82.0, 9312) - 0.58) * 25.0)
		"prism":
			var facet: int = roundi((noise.noise_1d(float(floori(float(world_x) / 12.0) * 12), 90.0, 9321) - 0.5) * 17.0)
			ground = 57 + facet + roundi(sin(float(world_x) * 0.035) * 3.0)
		"abyss":
			ground = floori(86.0 + (noise.noise_1d(world_x, 180.0, 9331) - 0.5) * 14.0 + (noise.noise_1d(world_x, 45.0, 9332) - 0.5) * 5.0)
			water = 24
			lake = true
			ocean = true
		"verdant": ground = floori(61.0 + (noise.noise_1d(world_x, 250.0, 9341) - 0.5) * 12.0 + (noise.noise_1d(world_x, 52.0, 9342) - 0.5) * 5.0)
		"clockwork":
			var step: int = floori(float(world_x) / 24.0)
			ground = 54 + floori(noise.random_at(step, 0, 9351) * 5.0) * 4
		"dream": ground = floori(58.0 + sin(float(world_x) * 0.023) * 9.0 + sin(float(world_x) * 0.071) * 4.0 + (noise.noise_1d(world_x, 180.0, 9361) - 0.5) * 7.0)
		"skylands": ground = floori(50.0 + (noise.noise_1d(world_x, 190.0, 9371) - 0.5) * 16.0 + sin(float(world_x) * 0.018) * 4.0)
		"static":
			var block: int = floori(float(world_x) / 18.0)
			ground = 48 + floori(noise.random_at(block, 1, 9381) * 7.0) * 5
			if block % 5 == 0:
				ground += 8
	ground = clampi(ground, 28, 96)
	return {"ground": ground, "water": water, "lake": lake, "ocean": ocean, "ocean_weight": 1.0 if ocean else 0.0, "lake_depth": max(0, ground - water) if ocean else 0, "biome": dimension_id, "mix": {"weights": {}}}

func surface_at(world_x_value: float) -> Dictionary:
	_ensure_generator_cache()
	var world_x: int = floori(world_x_value)
	if _surface_cache.has(world_x):
		return _surface_cache[world_x]
	var dimension_id: String = String(state.world["dimension"])
	if dimension_id != "earth":
		var dimension_surface: Dictionary = _dimension_surface_profile(dimension_id, world_x)
		_surface_cache[world_x] = dimension_surface
		return dimension_surface
	var mix: Dictionary = biome_mix_at(world_x)
	var broad: float = (noise.noise_1d(world_x, 270.0, 31) - 0.5) * 13.0
	var medium: float = (noise.noise_1d(world_x, 120.0, 29) - 0.5) * 6.5
	var detail: float = (noise.noise_1d(world_x, 38.0, 27) - 0.5) * 1.7
	var flat_field: float = _smooth((noise.noise_1d(world_x, 230.0, 41) - 0.43) / 0.36)
	var detail_scale: float = 1.0 - flat_field * 0.88
	var ground: float = 57.0 + broad + medium * detail_scale + detail * detail_scale
	var snow_weight: float = biome_weight(mix, GameData.SNOW_PEAKS)
	var swamp_weight: float = biome_weight(mix, GameData.SWAMP)
	var plains_weight: float = biome_weight(mix, GameData.PLAINS)
	var bamboo_weight: float = biome_weight(mix, GameData.BAMBOO_GROVE)
	var forest_weight: float = biome_weight(mix, GameData.GIANT_FOREST)
	var volcano_weight: float = biome_weight(mix, GameData.VOLCANO)
	var ocean_weight: float = biome_weight(mix, GameData.OCEAN)
	if snow_weight > 0.0:
		var ridge: float = maxf(0.0, (noise.noise_1d(world_x, 170.0, 57) - 0.39) * 1.8)
		var peak: float = maxf(0.0, (noise.noise_1d(world_x, 68.0, 58) - 0.61) / 0.39)
		ground -= snow_weight * (ridge * 17.0 + peak * 22.0)
	if volcano_weight > 0.0:
		for entry: Dictionary in mix["entries"]:
			if int(entry["id"]) != GameData.VOLCANO:
				continue
			var descriptor: Dictionary = volcano_descriptor(int(entry["region_index"]))
			if descriptor.is_empty():
				continue
			var distance: float = absf(float(world_x) - float(descriptor["center"]))
			var cone: float = clampf(1.0 - distance / float(descriptor["cone_radius"]), 0.0, 1.0)
			var caldera_distance: float = distance / float(descriptor["caldera_radius"])
			var crater: float = clampf(1.0 - caldera_distance, 0.0, 1.0)
			var rim: float = clampf(1.0 - absf(caldera_distance - 0.88) / 0.18, 0.0, 1.0)
			var weight: float = float(entry["weight"])
			ground -= pow(cone, 2.35) * weight * 32.0
			ground += pow(crater, 1.75) * weight * float(GameConfig.VOLCANO["caldera_depth"])
			ground -= pow(rim, 2.0) * weight * 6.0
	ground += swamp_weight * (4.0 + maxf(0.0, (noise.noise_1d(world_x, 150.0, 61) - 0.47) * 5.0))
	ground += plains_weight * sin(float(world_x) * 0.0065) * 1.1
	ground += bamboo_weight * sin(float(world_x) * 0.012) * 1.25
	ground += forest_weight * sin(float(world_x) * 0.008) * 1.8
	var sea_level: float = float(GameConfig.OCEAN["sea_level_min"])
	if ocean_weight > 0.0:
		var weighted_sea_level: float = 0.0
		var weighted_floor: float = 0.0
		var total_ocean_weight: float = 0.0
		for entry: Dictionary in mix["entries"]:
			if int(entry["id"]) != GameData.OCEAN:
				continue
			var descriptor: Dictionary = ocean_descriptor(int(entry["region_index"]))
			if descriptor.is_empty():
				continue
			var distance: float = absf(float(world_x) - float(descriptor["center"])) / (float(GameData.BIOME_REGION_SIZE) * 0.5)
			var trench: float = maxf(0.0, 1.0 - distance)
			var floor_noise: float = (noise.noise_1d(world_x, 150.0, 6201) - 0.5) * 8.0 + (noise.noise_1d(world_x, 47.0, 6202) - 0.5) * 3.0
			var floor_value: float = float(descriptor["floor_base"]) + floor_noise + pow(trench, 2.0) * float(descriptor["trench_depth"])
			var weight: float = float(entry["weight"])
			weighted_sea_level += float(descriptor["sea_level"]) * weight
			weighted_floor += floor_value * weight
			total_ocean_weight += weight
		if total_ocean_weight > 0.0:
			sea_level = weighted_sea_level / total_ocean_weight
			var ocean_floor: float = weighted_floor / total_ocean_weight
			ground = lerpf(ground, ocean_floor, _smooth(ocean_weight))
	ground = floor(clampf(ground, 24.0, 92.0))
	var lake_noise: float = noise.noise_1d(world_x, 180.0, 71)
	var lake_activation: float = 0.86 - swamp_weight * 0.22
	var lake_strength: float = maxf(0.0, (lake_noise - lake_activation) / (1.0 - lake_activation)) * (1.0 - volcano_weight * 0.98) * (1.0 - ocean_weight)
	var lake_depth: int = floori(lake_strength * (7.0 + swamp_weight * 5.0))
	var ocean: bool = ocean_weight > float(GameConfig.OCEAN["beach_blend_threshold"]) and ground > sea_level + 2.0
	var inland_lake: bool = volcano_weight < 0.55 and (lake_depth >= 3 or (swamp_weight > 0.55 and lake_noise > 0.7))
	var lake: bool = ocean or inland_lake
	var resolved_ground: int = int(ground) if ocean else int(ground) + lake_depth
	var result: Dictionary = {
		"biome": int(mix["dominant"]), "mix": mix, "base": int(ground), "ground": resolved_ground,
		"water": floori(sea_level) if ocean else int(ground) + (1 if swamp_weight > 0.5 else 3),
		"lake": lake, "ocean": ocean, "ocean_weight": ocean_weight,
		"lake_depth": max(0, resolved_ground - floori(sea_level)) if ocean else lake_depth,
	}
	_surface_cache[world_x] = result
	return result

func _shaft_distance(world_x: int, world_y: int) -> float:
	var section: int = floori(float(world_x) / 520.0)
	var best: float = 9999.0
	for offset: int in range(-1, 2):
		var candidate: int = section + offset
		if noise.random_at(candidate, 1, 902) < 0.82:
			continue
		var entrance_x: int = candidate * 520 + 90 + floori(noise.random_at(candidate, 0, 901) * 340.0)
		var surface: Dictionary = surface_at(entrance_x)
		if world_y < int(surface["ground"]) - 1 or world_y > int(surface["ground"]) + 88:
			continue
		var bend: float = sin(float(world_y - int(surface["ground"])) * 0.075 + float(candidate)) * 3.0 + sin(float(world_y - int(surface["ground"])) * 0.021 + float(candidate) * 2.0) * 1.7
		best = minf(best, absf(float(world_x - entrance_x) - bend))
	return best

func mushroom_strength_at(world_x: int, world_y: int) -> float:
	var surface: Dictionary = surface_at(world_x)
	var depth: int = world_y - int(surface["ground"])
	if depth < 30:
		return 0.0
	var broad: float = noise.noise_2d(world_x, world_y, 430.0, 1801) * 0.7 + noise.noise_2d(world_x, world_y, 190.0, 1802) * 0.3
	var depth_fade: float = _smooth(clampf(float(depth - 30) / 55.0, 0.0, 1.0))
	return _smooth((broad - 0.53) / 0.2) * depth_fade

func underground_biome_id_at(world_x: int, world_y: int) -> int:
	return 1 if mushroom_strength_at(world_x, world_y) > 0.48 else 0

func _cave_air_at(world_x: int, world_y: int, surface: Dictionary) -> bool:
	var depth: int = world_y - int(surface["ground"])
	if depth < 0:
		return false
	if _shaft_distance(world_x, world_y) < 3.7 and depth < 88:
		return true
	var cave: float = noise.noise_2d(world_x, world_y, 68.0, 313) * 0.57 + noise.noise_2d(world_x, world_y, 31.0, 332) * 0.27 + noise.noise_2d(world_x, world_y, 15.0, 356) * 0.16
	if depth > 26 and cave > 0.755:
		return true
	if depth > 44 and absf(noise.noise_2d(world_x, world_y, 44.0, 777) - 0.5) < 0.031:
		return true
	return false

func _volcano_feature_at(world_x: int, world_y: int, surface: Dictionary) -> int:
	var base_region: int = floori(float(world_x) / float(GameData.BIOME_REGION_SIZE))
	for offset: int in range(-1, 2):
		var descriptor: Dictionary = volcano_descriptor(base_region + offset)
		if descriptor.is_empty():
			continue
		if absf(float(world_x) - float(descriptor["center"])) > float(descriptor["cone_radius"]) + float(descriptor["chamber_radius_x"]):
			continue
		var dx: float = float(world_x) - float(descriptor["center"])
		var center_surface: Dictionary = surface_at(roundi(float(descriptor["center"])))
		var chamber_center_y: float = float(center_surface["ground"]) + float(descriptor["chamber_depth"])
		var chamber_x: float = dx / float(descriptor["chamber_radius_x"])
		var chamber_y: float = (float(world_y) - chamber_center_y) / float(descriptor["chamber_radius_y"])
		if chamber_x * chamber_x + chamber_y * chamber_y <= 1.0:
			return GameData.LAVA if float(world_y) >= chamber_center_y - float(descriptor["chamber_radius_y"]) * 0.22 else GameData.AIR
		var conduit_top: float = float(center_surface["ground"]) - float(GameConfig.VOLCANO["lava_pool_depth"])
		var conduit_bottom: float = chamber_center_y - float(descriptor["chamber_radius_y"]) * 0.62
		if float(world_y) >= conduit_top and float(world_y) <= conduit_bottom:
			var wobble: float = sin((float(world_y) - float(center_surface["ground"])) * 0.045 + float(descriptor["region_index"])) * 2.2 + sin((float(world_y) - float(center_surface["ground"])) * 0.013 + float(descriptor["region_index"]) * 3.0) * 1.4
			if absf(float(world_x) - (float(descriptor["center"]) + wobble)) <= float(descriptor["conduit_radius"]):
				return GameData.LAVA
		if absf(dx) <= float(descriptor["caldera_radius"]) * 0.72:
			var lava_top: float = float(center_surface["ground"]) - float(GameConfig.VOLCANO["lava_pool_depth"])
			if float(world_y) >= lava_top and world_y < int(surface["ground"]):
				return GameData.LAVA
	return -1

func _dimension_material_at(dimension_id: String, world_x: int, world_y: int, surface: Dictionary) -> int:
	var definition: Dictionary = GameData.dimension(dimension_id)
	var terrain: String = String(definition["terrain"])
	var depth: int = world_y - int(surface["ground"])
	if terrain == "abyss":
		if world_y < int(surface["water"]): return GameData.AIR
		if world_y < int(surface["ground"]): return GameData.WATER
	elif world_y < int(surface["ground"]):
		return GameData.AIR
	if terrain == "skylands":
		if depth < 0: return GameData.AIR
		var thickness: int = 7 + floori(noise.noise_2d(world_x, int(surface["ground"]), 80.0, 9471) * 7.0)
		if depth > thickness: return GameData.AIR
		if depth == 0: return GameData.GRASS
		if depth < 4: return GameData.DIRT
		return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9472) > 0.91 else GameData.ROCK
	if terrain == "static":
		if depth < 0: return GameData.AIR
		var glitch: float = noise.random_at(floori(float(world_x) / 3.0), floori(float(world_y) / 3.0), 9481)
		if depth > 5 and glitch > 0.91: return GameData.AIR
		if depth == 0: return GameData.CRYSTAL if floori(float(world_x) / 7.0) % 3 == 0 else GameData.ASH
		if glitch < 0.12: return GameData.CRYSTAL
		if glitch < 0.2: return GameData.MYCELIUM
		return GameData.ROCK
	var cave_scale: float = 38.0 if terrain == "clockwork" else 58.0
	var cave: float = noise.noise_2d(world_x, world_y, cave_scale, 9400 + dimension_id.length()) * 0.68 + noise.noise_2d(world_x, world_y, 21.0, 9410 + dimension_id.length()) * 0.32
	var cave_threshold: float = 0.68 if terrain == "dream" else (0.75 if terrain == "verdant" else 0.79)
	if depth > 12 and cave > cave_threshold:
		return GameData.AIR
	match terrain:
		"moon":
			if depth == 0: return GameData.SAND
			if depth < 5: return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9110) > 0.82 else GameData.SAND
			if depth < 18 and noise.random_at(world_x, world_y, 9111) > 0.92: return GameData.CRYSTAL
			return GameData.ROCK
		"ember":
			if depth == 0: return GameData.ASH
			if depth < 5: return GameData.LAVA if noise.random_at(world_x, world_y, 9421) > 0.8 else GameData.ASH
			if depth > 18 and noise.noise_2d(world_x, world_y, 34.0, 9422) > 0.79: return GameData.LAVA
			return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9423) > 0.94 else GameData.ROCK
		"frost":
			if depth == 0: return GameData.SNOW
			if depth < 6: return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9431) > 0.7 else GameData.SNOW
			if depth > 16 and noise.noise_2d(world_x, world_y, 44.0, 9432) > 0.86: return GameData.WATER
			return GameData.ROCK
		"prism":
			if depth == 0: return GameData.CRYSTAL
			if depth < 9: return GameData.SAND if posmod(world_x + world_y, 5) == 0 else GameData.CRYSTAL
			return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9441) > 0.62 else GameData.ROCK
		"abyss":
			if depth == 0: return GameData.SAND
			if depth < 8: return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9451) > 0.88 else GameData.SAND
			return GameData.CRYSTAL if noise.noise_2d(world_x, world_y, 42.0, 9452) > 0.89 else GameData.ROCK
		"verdant":
			if depth == 0: return GameData.GRASS
			if depth < 10: return GameData.MYCELIUM if noise.random_at(world_x, world_y, 9461) > 0.93 else GameData.DIRT
			if depth < 28 and noise.noise_2d(world_x, world_y, 33.0, 9462) > 0.87: return GameData.WOOD
			return GameData.ROCK
		"clockwork":
			if depth == 0: return GameData.ROCK
			if depth < 6: return GameData.CRYSTAL if (floori(float(world_x) / 4.0) + floori(float(world_y) / 4.0)) % 2 == 0 else GameData.ROCK
			if depth > 18 and absf(float(posmod(world_x, 24) - 12)) < 2.0: return GameData.AIR
			return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9465) > 0.86 else GameData.ROCK
		"dream":
			if depth == 0: return GameData.MYCELIUM
			if depth < 7: return GameData.MUSHROOM_CAP if noise.random_at(world_x, world_y, 9468) > 0.62 else GameData.MYCELIUM
			if depth < 20 and noise.noise_2d(world_x, world_y, 27.0, 9469) > 0.83: return GameData.MUSHROOM_STEM
			return GameData.CRYSTAL if noise.random_at(world_x, world_y, 9470) > 0.9 else GameData.ROCK
	return GameData.ROCK

func generated_material(world_x: int, world_y: int) -> int:
	var surface: Dictionary = surface_at(world_x)
	var dimension_id: String = String(state.world["dimension"])
	if dimension_id != "earth":
		return _dimension_material_at(dimension_id, world_x, world_y, surface)
	var volcano_feature: int = _volcano_feature_at(world_x, world_y, surface)
	if volcano_feature >= 0:
		return volcano_feature
	if world_y < int(surface["ground"]):
		return GameData.WATER if bool(surface["lake"]) and world_y >= int(surface["water"]) else GameData.AIR
	var depth: int = world_y - int(surface["ground"])
	if _cave_air_at(world_x, world_y, surface):
		return GameData.AIR
	var biome: int = int(surface["biome"])
	if depth == 0:
		if bool(surface["ocean"]): return GameData.SAND
		if bool(surface["lake"]): return GameData.MUD if biome == GameData.SWAMP else GameData.SAND
		if biome == GameData.SNOW_PEAKS: return GameData.SNOW
		if biome == GameData.SWAMP: return GameData.MUD
		if biome == GameData.VOLCANO: return GameData.ASH
		return GameData.GRASS
	if depth < 11:
		if bool(surface["ocean"]): return GameData.SAND if depth < int(GameConfig.OCEAN["sand_depth"]) else GameData.DIRT
		if bool(surface["lake"]): return GameData.MUD if biome == GameData.SWAMP else GameData.SAND
		if biome == GameData.SNOW_PEAKS and depth < 4: return GameData.SNOW
		if biome == GameData.SWAMP: return GameData.MUD
		if biome == GameData.VOLCANO and depth < 5: return GameData.ASH
		return GameData.DIRT
	var mushroom_strength: float = mushroom_strength_at(world_x, world_y)
	var touches_cave: bool = _cave_air_at(world_x, world_y - 1, surface_at(world_x)) or _cave_air_at(world_x - 1, world_y, surface_at(world_x - 1)) or _cave_air_at(world_x + 1, world_y, surface_at(world_x + 1))
	if mushroom_strength > 0.34 and touches_cave:
		return GameData.MYCELIUM
	var dirt_cluster: float = noise.noise_2d(world_x, world_y, 48.0, 1701) * 0.72 + noise.noise_2d(world_x, world_y, 23.0, 1702) * 0.28
	if depth < 125 and dirt_cluster > 0.735:
		return GameData.MYCELIUM if mushroom_strength > 0.42 else GameData.DIRT
	if biome_weight(surface["mix"], GameData.VOLCANO) > 0.35 and depth > 40 and noise.noise_2d(world_x, world_y, 34.0, 515) > 0.81:
		return GameData.LAVA
	if depth > 112 and noise.noise_2d(world_x, world_y, 34.0, 516) > 0.84:
		return GameData.LAVA
	return GameData.ROCK

func _put_generated(chunk: Dictionary, world_x: int, world_y: int, material_id: int) -> void:
	var local_x: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var local_y: int = world_y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	if local_x < 0 or local_y < 0 or local_x >= GameConfig.WORLD_WIDTH or local_y >= GameConfig.WORLD_HEIGHT:
		return
	var index: int = local_x + local_y * GameConfig.WORLD_WIDTH
	var cells: PackedByteArray = chunk["cells"]
	if cells[index] == GameData.AIR:
		cells[index] = material_id

func _generate_vegetation(chunk: Dictionary) -> void:
	if int(chunk["y"]) != 0 or String(state.world["dimension"]) != "earth":
		return
	var world_left: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var first: int = floori(float(world_left - 40) / 11.0)
	var last: int = floori(float(world_left + GameConfig.WORLD_WIDTH + 40) / 11.0)
	for slot: int in range(first, last + 1):
		var world_x: int = slot * 11 + 2 + floori(noise.random_at(slot, 10, 404) * 7.0)
		var surface: Dictionary = surface_at(world_x)
		if bool(surface["ocean"]) or bool(surface["lake"]) or abs(int(surface_at(world_x - 3)["ground"]) - int(surface_at(world_x + 3)["ground"])) > 5:
			continue
		var mix: Dictionary = surface["mix"]
		var bamboo_weight: float = biome_weight(mix, GameData.BAMBOO_GROVE)
		var forest_weight: float = biome_weight(mix, GameData.GIANT_FOREST)
		var swamp_weight: float = biome_weight(mix, GameData.SWAMP)
		var volcano_weight: float = biome_weight(mix, GameData.VOLCANO)
		var snow_weight: float = biome_weight(mix, GameData.SNOW_PEAKS)
		if bamboo_weight > 0.42 and noise.random_at(slot, 0, 430) < 0.78 * bamboo_weight:
			var stems: int = 2 + floori(noise.random_at(slot, 1, 431) * 4.0)
			for stem: int in range(stems):
				var gx: int = world_x - 2 + stem * 2
				var base: int = int(surface_at(gx)["ground"])
				var height: int = 7 + floori(noise.random_at(gx, stem, 433) * 9.0)
				for rise: int in range(1, height + 1): _put_generated(chunk, gx, base - rise, GameData.BAMBOO)
				for leaf_x: int in range(gx - 1, gx + 2): _put_generated(chunk, leaf_x, base - height - 1, GameData.LEAF)
			continue
		if forest_weight > 0.42 and noise.random_at(slot, 0, 440) < 0.34 * forest_weight:
			var height: int = 18 + floori(noise.random_at(slot, 2, 442) * 13.0)
			var width: int = 2 + floori(noise.random_at(slot, 1, 441) * 2.0)
			for trunk_x: int in range(width):
				for rise: int in range(1, height + 1): _put_generated(chunk, world_x + trunk_x, int(surface_at(world_x + trunk_x)["ground"]) - rise, GameData.WOOD)
			var top: int = int(surface["ground"]) - height
			for oy: int in range(-8, 6):
				for ox: int in range(-10, 12):
					if float(ox * ox) * 0.48 + float(oy * oy) <= 42.0 and noise.random_at(world_x + ox, top + oy, 443) > 0.12: _put_generated(chunk, world_x + ox, top + oy, GameData.LEAF)
			continue
		if swamp_weight > 0.42 and noise.random_at(slot, 0, 450) < 0.46 * swamp_weight:
			var height: int = 6 + floori(noise.random_at(slot, 1, 451) * 6.0)
			for rise: int in range(1, height + 1): _put_generated(chunk, world_x, int(surface["ground"]) - rise, GameData.WOOD)
			var top: int = int(surface["ground"]) - height
			for oy: int in range(-3, 3):
				for ox: int in range(-4, 5):
					if float(ox * ox) * 0.85 + float(oy * oy) <= 11.0 and noise.random_at(world_x + ox, top + oy, 452) > 0.22: _put_generated(chunk, world_x + ox, top + oy, GameData.LEAF)
			continue
		if volcano_weight > 0.5:
			if noise.random_at(slot, 0, 460) < 0.92: continue
			var height: int = 3 + floori(noise.random_at(slot, 1, 461) * 4.0)
			for rise: int in range(1, height + 1): _put_generated(chunk, world_x, int(surface["ground"]) - rise, GameData.WOOD)
			continue
		var tree_weight: float = maxf(0.25, 1.0 - bamboo_weight * 0.7 - swamp_weight * 0.35 - volcano_weight * 0.8)
		if noise.random_at(slot, 0, 480) > 0.44 * tree_weight: continue
		var height: int = 7 + floori(noise.random_at(slot, 1, 481) * 7.0)
		for rise: int in range(1, height + 1): _put_generated(chunk, world_x, int(surface["ground"]) - rise, GameData.WOOD)
		var top: int = int(surface["ground"]) - height
		for oy: int in range(-4, 4):
			for ox: int in range(-5, 6):
				if float(ox * ox) * 0.7 + float(oy * oy) <= 18.0 and noise.random_at(world_x + ox, top + oy, 482) > 0.18: _put_generated(chunk, world_x + ox, top + oy, GameData.LEAF)
		if snow_weight > 0.45:
			for oy: int in range(-4, 1):
				for ox: int in range(-4, 5):
					if float(ox * ox) * 0.75 + float(oy * oy) <= 12.0 and noise.random_at(world_x + ox, top + oy, 483) > 0.48: _put_generated(chunk, world_x + ox, top + oy, GameData.SNOW)

func _generate_chunk(cx: int, cy: int) -> Dictionary:
	var chunk: Dictionary = _new_chunk(cx, cy)
	var cells: PackedByteArray = chunk["cells"]
	var shade: PackedByteArray = chunk["shade"]
	var world_left: int = cx * GameConfig.WORLD_WIDTH
	var world_top: int = cy * GameConfig.WORLD_HEIGHT
	for local_y: int in range(GameConfig.WORLD_HEIGHT):
		var world_y: int = world_top + local_y
		for local_x: int in range(GameConfig.WORLD_WIDTH):
			var world_x: int = world_left + local_x
			var index: int = local_x + local_y * GameConfig.WORLD_WIDTH
			cells[index] = generated_material(world_x, world_y)
			shade[index] = floori(noise.random_at(world_x, world_y, 1337) * 25.0)
	_generate_vegetation(chunk)
	WorldPopulation.populate(self, chunk)
	chunk["render_full_dirty"] = true
	return chunk

func dimension_spawn_point(dimension_id: String) -> Vector2i:
	var previous: String = String(state.world["dimension"])
	state.world["dimension"] = dimension_id
	_ensure_generator_cache()
	var x: int = int(GameData.dimension(dimension_id).get("spawn_x", 48))
	var point: Vector2i = Vector2i(x, int(surface_at(x)["ground"]) - 1)
	state.world["dimension"] = previous
	_ensure_generator_cache()
	return point

func dimension_gravity_scale() -> float:
	return float(GameData.dimension(String(state.world["dimension"]))["gravity"])

func biome_name_at(world_x: int, world_y: int) -> String:
	if String(state.world["dimension"]) != "earth":
		return String(GameData.dimension(String(state.world["dimension"]))["name"]).to_lower().replace(" ", "_")
	if underground_biome_id_at(world_x, world_y) == 1:
		return "mushroom_caverns"
	return String(GameData.BIOMES[biome_id_at(world_x)]["name"])
