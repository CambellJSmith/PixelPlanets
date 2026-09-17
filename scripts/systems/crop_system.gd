class_name CropSystem
extends RefCounted

const SOIL_MATERIALS: Array[int] = [GameData.DIRT, GameData.GRASS, GameData.MUD, GameData.MYCELIUM]
const COOKING_HEAT_MATERIALS: Array[int] = [GameData.FIRE, GameData.LAVA, GameData.STEAM]

var state: GameState
var world: WorldModel
var noise: PixelNoise
var weather_system: Variant
var handling_harvest: bool = false

func _hypot(x: float, y: float) -> float:
	return Vector2(x, y).length()

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise, weather: Variant = null) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise
	weather_system = weather
	world.add_change_observer(_handle_cell_change)

func _random_int(minimum: int, maximum: int, x: int, y: int, salt: int) -> int:
	return minimum + floori(noise.random_at(x, y, salt) * float(maximum - minimum + 1))

func random_crop_id(x: int, y: int, salt: int = 0) -> int:
	return 1 + floori(noise.random_at(x, y, state.frame + salt) * 12.0) % 12

func _seed_count(crop_id: int) -> int:
	return state.inventory_item_count("seed", crop_id)

func _produce_count(crop_id: int) -> int:
	return state.inventory_item_count("produce", crop_id)

func spawn_pickup(kind: String, crop_id: int, x: float, y: float, amount: int = 1, scatter: float = 1.0) -> Dictionary:
	if GameData.crop(crop_id).is_empty() or amount <= 0:
		return {}
	var pickups: Array = state.entities["pickups"]
	if pickups.size() >= int(GameConfig.FARM["max_loose_pickups"]):
		pickups.pop_front()
	var angle: float = noise.random_at(roundi(x), roundi(y), state.frame + 3011) * TAU
	var speed: float = (0.08 + noise.random_at(roundi(y), roundi(x), state.frame + 3012) * 0.32) * scatter
	var pickup: Dictionary = {
		"kind": kind, "crop_id": crop_id, "amount": amount, "x": roundi(x), "y": roundi(y),
		"vx": cos(angle) * speed, "vy": -0.35 - absf(sin(angle)) * speed,
		"life": int(GameConfig.FARM["pickup_life_frames"]), "bob": noise.random_at(roundi(x), roundi(y), state.frame + 3013) * TAU,
	}
	pickups.append(pickup)
	return pickup

func spawn_loot_pickup(loot_id: String, x: float, y: float, amount: int = 1, scatter: float = 1.0) -> Dictionary:
	if loot_id.is_empty() or amount <= 0:
		return {}
	var pickups: Array = state.entities["pickups"]
	if pickups.size() >= int(GameConfig.FARM["max_loose_pickups"]):
		pickups.pop_front()
	var angle: float = noise.random_at(roundi(x), roundi(y), state.frame + 3511) * TAU
	var speed: float = (0.08 + noise.random_at(roundi(y), roundi(x), state.frame + 3512) * 0.32) * scatter
	var pickup: Dictionary = {
		"kind": "loot", "loot_id": loot_id, "amount": amount, "x": roundi(x), "y": roundi(y),
		"vx": cos(angle) * speed, "vy": -0.35 - absf(sin(angle)) * speed,
		"life": int(GameConfig.FARM["pickup_life_frames"]), "bob": noise.random_at(roundi(x), roundi(y), state.frame + 3513) * TAU,
	}
	pickups.append(pickup)
	return pickup

func _clear_plant_cells(plant: Dictionary) -> void:
	for cell_value: Variant in plant["cells"]:
		var cell: Dictionary = cell_value
		if world.get_plant_id(int(cell["x"]), int(cell["y"])) != int(plant["id"]):
			continue
		world.set_cell(int(cell["x"]), int(cell["y"]), GameData.AIR, 0, {"silent": true, "reason": "plant-clear"})
	plant["cells"] = []

func _shape_add(shape: Dictionary, x: int, y: int, material_id: int) -> void:
	var key: String = "%d,%d" % [x, y]
	var keys: Dictionary = shape["keys"]
	if keys.has(key):
		return
	keys[key] = true
	(shape["cells"] as Array).append({"x": x, "y": y, "type": material_id})

func _build_plant_shape(plant: Dictionary, stage: int) -> Array:
	var crop: Dictionary = GameData.crop(int(plant["crop_id"]))
	var shape: Dictionary = {"cells": [], "keys": {}}
	if crop.is_empty():
		return []
	var mature: bool = stage >= int(GameConfig.FARM["growth_stages"]) - 1
	var progress: float = float(stage + 1) / float(GameConfig.FARM["growth_stages"])
	var height: int = max(1, roundi(float(crop["mature_height"]) * progress))
	var radius: int = max(1, roundi(float(crop["canopy_radius"]) * maxf(0.35, progress)))
	var base_x: int = int(plant["base_x"])
	var base_y: int = int(plant["base_y"])
	var pattern: String = String(crop["pattern"])
	if pattern == "root":
		_shape_add(shape, base_x, base_y, GameData.CROP_FRUIT if mature else GameData.CROP_STEM)
		for rise: int in range(1, height):
			_shape_add(shape, base_x, base_y - rise, GameData.CROP_STEM)
		var crown_y: int = base_y - height + 1
		for offset: int in range(-radius, radius + 1):
			_shape_add(shape, base_x + offset, crown_y - floori(float(radius - abs(offset)) * 0.35), GameData.CROP_LEAF)
	elif pattern == "stalk":
		for rise: int in range(height):
			_shape_add(shape, base_x, base_y - rise, GameData.CROP_STEM)
		for rise: int in range(2, height - 1, 2):
			var side: int = -1 if rise % 4 == 0 else 1
			_shape_add(shape, base_x + side, base_y - rise, GameData.CROP_LEAF)
			if stage >= 2:
				_shape_add(shape, base_x + side * 2, base_y - rise - 1, GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x - 1, base_y - height + 3, GameData.CROP_FRUIT)
			_shape_add(shape, base_x + 1, base_y - height + 5, GameData.CROP_FRUIT)
	elif pattern == "vine":
		for rise: int in range(height):
			_shape_add(shape, base_x, base_y - rise, GameData.CROP_STEM)
		for rise: int in range(2, height, 2):
			var side: int = -1 if rise % 4 == 0 else 1
			for run: int in range(1, radius + 1):
				_shape_add(shape, base_x + side * run, base_y - rise - floori(float(run) * 0.25), GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x - radius, base_y - max(2, height - 3), GameData.CROP_FRUIT)
			_shape_add(shape, base_x + radius, base_y - max(3, height - 5), GameData.CROP_FRUIT)
			if height > 6:
				_shape_add(shape, base_x + 1, base_y - height + 1, GameData.CROP_FRUIT)
	elif pattern == "mound":
		var spread: int = max(1, roundi(float(radius) * progress))
		_shape_add(shape, base_x, base_y, GameData.CROP_STEM)
		for offset: int in range(-spread, spread + 1):
			_shape_add(shape, base_x + offset, base_y - 1 - floori(float(spread - abs(offset)) * 0.35), GameData.CROP_LEAF)
			if stage >= 2 and offset % 2 == 0:
				_shape_add(shape, base_x + offset, base_y - 2 - floori(float(spread - abs(offset)) * 0.2), GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x - spread + 1, base_y, GameData.CROP_FRUIT)
			_shape_add(shape, base_x + spread - 1, base_y, GameData.CROP_FRUIT)
	elif pattern == "low_bush":
		for offset: int in range(-radius, radius + 1):
			var rise: int = max(0, roundi(float(radius - abs(offset)) * 0.6))
			_shape_add(shape, base_x + offset, base_y - rise, GameData.CROP_LEAF)
			if rise > 0:
				var side: int = -1 if offset < 0 else 1
				_shape_add(shape, base_x + side * min(1, abs(offset)), base_y - rise + 1, GameData.CROP_STEM)
		if mature:
			for offset: int in range(-radius + 1, radius, 2):
				_shape_add(shape, base_x + offset, base_y - 1 - abs(offset) % 2, GameData.CROP_FRUIT)
	elif pattern == "rosette":
		_shape_add(shape, base_x, base_y, GameData.CROP_STEM)
		for ring: int in range(1, radius + 1):
			_shape_add(shape, base_x - ring, base_y - floori(float(ring) * 0.35), GameData.CROP_LEAF)
			_shape_add(shape, base_x + ring, base_y - floori(float(ring) * 0.35), GameData.CROP_LEAF)
		if stage >= 2:
			for ox: int in [-1, 0, 1]:
				_shape_add(shape, base_x + ox, base_y - 1, GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x, base_y - 2, GameData.CROP_FRUIT)
	elif pattern == "flower":
		for rise: int in range(height):
			_shape_add(shape, base_x, base_y - rise, GameData.CROP_STEM)
		if stage >= 1:
			_shape_add(shape, base_x - 1, base_y - max(2, floori(float(height) * 0.45)), GameData.CROP_LEAF)
			_shape_add(shape, base_x + 1, base_y - max(3, floori(float(height) * 0.62)), GameData.CROP_LEAF)
		var top_y: int = base_y - height
		for oy: int in range(-1, 2):
			for ox: int in range(-radius, radius + 1):
				if abs(ox) + abs(oy) <= radius + 1:
					_shape_add(shape, base_x + ox, top_y + oy, GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x, top_y, GameData.CROP_FRUIT)
	else:
		for rise: int in range(height):
			_shape_add(shape, base_x, base_y - rise, GameData.CROP_STEM)
		for oy: int in range(max(2, roundi(float(height) * 0.62))):
			var width: int = max(1, roundi(float(radius) * (1.0 - float(oy) / float(height + 2))))
			for ox: int in range(-width, width + 1):
				if (abs(ox) + oy) % 2 == 0 or stage >= 3:
					_shape_add(shape, base_x + ox, base_y - height + 1 + oy, GameData.CROP_LEAF)
		if mature:
			_shape_add(shape, base_x - radius + 1, base_y - height + 2, GameData.CROP_FRUIT)
			_shape_add(shape, base_x + radius - 1, base_y - height + 3, GameData.CROP_FRUIT)
			if height > 5:
				_shape_add(shape, base_x, base_y - height + 1, GameData.CROP_FRUIT)
	return shape["cells"]

func _apply_plant_stage(plant: Dictionary, stage: int) -> void:
	_clear_plant_cells(plant)
	var placed: Array = []
	for part_value: Variant in _build_plant_shape(plant, stage):
		var part: Dictionary = part_value
		var x: int = int(part["x"])
		var y: int = int(part["y"])
		var material: int = world.get_cell(x, y)
		if material != GameData.AIR and world.get_plant_id(x, y) != int(plant["id"]):
			continue
		if world.set_plant_cell(x, y, int(part["type"]), int(plant["crop_id"]), int(plant["id"]), {"silent": true}):
			placed.append({"x": x, "y": y})
	plant["cells"] = placed
	plant["stage"] = stage
	plant["mature"] = stage >= int(GameConfig.FARM["growth_stages"]) - 1

func plant_seed(crop_id: int, base_x: int, base_y: int, planted_frame: int = -1) -> Dictionary:
	if GameData.crop(crop_id).is_empty():
		return {}
	var x: int = floori(base_x)
	var y: int = floori(base_y)
	if world.get_cell(x, y) != GameData.AIR or not SOIL_MATERIALS.has(world.get_cell(x, y + 1)):
		return {}
	for plant_value: Variant in (state.world["plants"] as Dictionary).values():
		var existing: Dictionary = plant_value
		if String(existing.get("dimension", "earth")) == String(state.world["dimension"]) and abs(int(existing["base_x"]) - x) <= 2 and abs(int(existing["base_y"]) - y) <= 2:
			return {}
	var plant_id: int = int(state.world["next_plant_id"])
	state.world["next_plant_id"] = plant_id + 1
	var plant: Dictionary = {
		"id": plant_id, "crop_id": crop_id, "dimension": String(state.world["dimension"]), "base_x": x, "base_y": y,
		"planted_frame": state.frame if planted_frame < 0 else planted_frame, "stage": -1, "mature": false,
		"harvested": false, "weather_growth_credit": 0.0, "cells": [],
	}
	(state.world["plants"] as Dictionary)[plant_id] = plant
	_apply_plant_stage(plant, 0)
	return plant

func harvest_plant(plant_id: int, break_x: int, break_y: int) -> bool:
	var plants: Dictionary = state.world["plants"]
	if not plants.has(plant_id) or handling_harvest:
		return false
	var plant: Dictionary = plants[plant_id]
	if bool(plant["harvested"]):
		return false
	plant["harvested"] = true
	handling_harvest = true
	_clear_plant_cells(plant)
	plants.erase(plant_id)
	var crop: Dictionary = GameData.crop(int(plant["crop_id"]))
	if not crop.is_empty():
		if bool(plant["mature"]):
			var produce: int = _random_int(int(crop["produce_min"]), int(crop["produce_max"]), break_x, break_y, 3201 + plant_id)
			var seeds: int = _random_int(int(crop["seed_min"]), int(crop["seed_max"]), break_y, break_x, 3202 + plant_id)
			spawn_pickup("produce", int(plant["crop_id"]), break_x, break_y, produce, 1.5)
			spawn_pickup("seed", int(plant["crop_id"]), break_x + 1, break_y, seeds, 1.35)
		else:
			spawn_pickup("seed", int(plant["crop_id"]), break_x, break_y, 1, 1.0)
	handling_harvest = false
	return true

func _handle_cell_change(event: Dictionary) -> void:
	if int(event["old_type"]) == GameData.GRASS and int(event["new_type"]) != GameData.GRASS:
		spawn_pickup("seed", random_crop_id(int(event["x"]), int(event["y"]), 3100), float(event["x"]), float(event["y"]), 1, 1.2)
	if int(event.get("old_plant_id", 0)) > 0 and int(event.get("old_plant_id", 0)) != int(event.get("new_plant_id", 0)):
		harvest_plant(int(event["old_plant_id"]), int(event["x"]), int(event["y"]))

func throw_seeds(crop_id: int, direction: Vector2) -> bool:
	var crop: Dictionary = GameData.crop(crop_id)
	var available: int = _seed_count(crop_id)
	if crop.is_empty() or available <= 0:
		return false
	var count: int = min(int(GameConfig.FARM["seed_scatter_count"]), available)
	state.inventory_remove_item("seed", crop_id, count)
	var base_angle: float = direction.angle()
	for index: int in range(count):
		var centered: float = 0.0 if count == 1 else float(index) / float(count - 1) - 0.5
		var jitter: float = (noise.random_at(state.frame, index, crop_id + 3301) - 0.5) * 0.18
		var angle: float = base_angle + centered * float(GameConfig.FARM["seed_spread_radians"]) + jitter
		var speed: float = float(GameConfig.FARM["seed_launch_speed_min"]) + noise.random_at(index, state.frame, crop_id + 3302) * (float(GameConfig.FARM["seed_launch_speed_max"]) - float(GameConfig.FARM["seed_launch_speed_min"]))
		(state.entities["seed_particles"] as Array).append({
			"crop_id": crop_id, "x": roundi(float(state.player["x"]) + cos(angle) * 2.0), "y": roundi(float(state.player["y"]) - 2.0 + sin(angle) * 2.0),
			"vx": cos(angle) * speed + float(state.player["vx"]) * 0.3, "vy": sin(angle) * speed + float(state.player["vy"]) * 0.15,
			"life": int(GameConfig.FARM["seed_life_frames"]),
		})
	if _seed_count(crop_id) <= 0:
		state.seed_mode["active"] = false
		state.seed_mode["crop_id"] = null
		state.show_message("%s depleted · empty hand" % String(crop["seed_name"]), 900)
	return true

func _try_embed_seed(seed: Dictionary, next_x: float, next_y: float) -> bool:
	var cell_x: int = floori(next_x)
	var cell_y: int = floori(next_y)
	var target: int = world.get_cell(cell_x, cell_y)
	if not world.is_solid(target):
		return false
	return SOIL_MATERIALS.has(target) and world.get_cell(cell_x, cell_y - 1) == GameData.AIR and not plant_seed(int(seed["crop_id"]), cell_x, cell_y - 1, state.frame).is_empty()

func _update_seed_particles() -> void:
	var particles: Array = state.entities["seed_particles"]
	for index: int in range(particles.size() - 1, -1, -1):
		var seed: Dictionary = particles[index]
		seed["life"] = int(seed["life"]) - 1
		if int(seed["life"]) <= 0:
			particles.remove_at(index)
			continue
		seed["vy"] = float(seed["vy"]) + float(GameConfig.FARM["seed_gravity"])
		seed["vx"] = float(seed["vx"]) * float(GameConfig.FARM["seed_air_drag"])
		var removed: bool = false
		for _step: int in range(3):
			var next_x: float = float(seed["x"]) + float(seed["vx"]) / 3.0
			var next_y: float = float(seed["y"]) + float(seed["vy"]) / 3.0
			if not world.is_active_world_position(next_x, next_y):
				particles.remove_at(index)
				removed = true
				break
			if world.is_solid(world.get_cell(floori(next_x), floori(next_y))):
				if float(seed["vy"]) >= 0.0 and _try_embed_seed(seed, next_x, next_y):
					particles.remove_at(index)
					removed = true
					break
				seed["vy"] = float(seed["vy"]) * -0.26
				seed["vx"] = float(seed["vx"]) * 0.55
				if absf(float(seed["vy"])) < 0.08:
					particles.remove_at(index)
					removed = true
				break
			seed["x"] = next_x
			seed["y"] = next_y
		if not removed:
			seed["x"] = roundi(float(seed["x"]))
			seed["y"] = roundi(float(seed["y"]))

func pickup_touches_heat(pickup: Dictionary) -> bool:
	var center_x: int = roundi(float(pickup["x"]))
	var center_y: int = roundi(float(pickup["y"]))
	var radius: int = int(GameConfig.FOOD_COOKING["heat_radius"])
	for offset_y: int in range(-radius, radius + 1):
		for offset_x: int in range(-radius, radius + 1):
			if absi(offset_x) + absi(offset_y) > radius + 1:
				continue
			if COOKING_HEAT_MATERIALS.has(world.get_cell(center_x + offset_x, center_y + offset_y)):
				return true
	return false

func update_loot_cooking(pickup: Dictionary) -> bool:
	if String(pickup.get("kind", "")) != "loot":
		return false
	var raw: Dictionary = FaunaData.loot(String(pickup.get("loot_id", "")))
	if raw.is_empty() or not raw.has("cook_to"):
		pickup["cook_frames"] = 0
		return false
	if not pickup_touches_heat(pickup):
		pickup["cook_frames"] = 0
		return false
	pickup["cook_frames"] = int(pickup.get("cook_frames", 0)) + 1
	pickup["vx"] = float(pickup.get("vx", 0.0)) * 0.72
	pickup["vy"] = float(pickup.get("vy", 0.0)) * 0.72
	if int(pickup["cook_frames"]) < int(GameConfig.FOOD_COOKING["cook_frames"]):
		return true
	var cooked: Dictionary = FaunaData.loot(String(raw["cook_to"]))
	if cooked.is_empty():
		return false
	pickup["loot_id"] = String(cooked["id"])
	pickup["cook_frames"] = 0
	pickup["cooked_flash"] = 30
	state.show_message("%s COOKED" % String(raw["name"]).to_upper(), 900)
	return false

func _collect_pickup(pickup: Dictionary) -> void:
	var amount: int = max(1, int(pickup.get("amount", 1)))
	if String(pickup["kind"]) == "loot":
		state.inventory_add_loot(String(pickup["loot_id"]), amount)
	else:
		state.inventory_add_item(String(pickup["kind"]), int(pickup["crop_id"]), amount)

func _update_pickups() -> void:
	var pickups: Array = state.entities["pickups"]
	for index: int in range(pickups.size() - 1, -1, -1):
		var pickup: Dictionary = pickups[index]
		pickup["life"] = int(pickup["life"]) - 1
		pickup["bob"] = float(pickup.get("bob", 0.0)) + 0.08
		if int(pickup.get("cooked_flash", 0)) > 0:
			pickup["cooked_flash"] = int(pickup["cooked_flash"]) - 1
		if int(pickup["life"]) <= 0 or not world.is_active_world_position(float(pickup["x"]), float(pickup["y"])):
			pickups.remove_at(index)
			continue
		var cooking: bool = update_loot_cooking(pickup)
		var dx: float = float(state.player["x"]) - float(pickup["x"])
		var dy: float = float(state.player["y"]) - 2.0 - float(pickup["y"])
		var distance: float = maxf(0.0001, _hypot(dx, dy))
		if distance <= float(GameConfig.FARM["pickup_collect_radius"]) and not cooking:
			_collect_pickup(pickup)
			pickups.remove_at(index)
			continue
		if cooking:
			pickup["vx"] = 0.0
			pickup["vy"] = 0.0
			pickup["x"] = roundi(float(pickup["x"]))
			pickup["y"] = roundi(float(pickup["y"]))
			continue
		if distance < float(GameConfig.FARM["pickup_attract_radius"]):
			pickup["vx"] = float(pickup["vx"]) + dx / distance * 0.025
			pickup["vy"] = float(pickup["vy"]) + dy / distance * 0.025
		else:
			pickup["vy"] = float(pickup["vy"]) + 0.035
		pickup["vx"] = float(pickup["vx"]) * 0.94
		pickup["vy"] = minf(0.8, float(pickup["vy"]) * 0.97)
		var next_x: float = float(pickup["x"]) + float(pickup["vx"])
		var next_y: float = float(pickup["y"]) + float(pickup["vy"])
		if not world.is_solid(world.get_cell(floori(next_x), floori(float(pickup["y"])))):
			pickup["x"] = next_x
		else:
			pickup["vx"] = float(pickup["vx"]) * -0.25
		if not world.is_solid(world.get_cell(floori(float(pickup["x"])), floori(next_y))):
			pickup["y"] = next_y
		else:
			pickup["vy"] = float(pickup["vy"]) * -0.22
			if absf(float(pickup["vy"])) < 0.04:
				pickup["vy"] = 0.0
		pickup["x"] = roundi(float(pickup["x"]))
		pickup["y"] = roundi(float(pickup["y"]))

func _update_plants() -> void:
	var plants: Dictionary = state.world["plants"]
	for plant_value: Variant in plants.values().duplicate():
		var plant: Dictionary = plant_value
		if String(plant.get("dimension", "earth")) != String(state.world["dimension"]) or bool(plant["harvested"]):
			continue
		if not world.is_active_world_position(float(plant["base_x"]), float(plant["base_y"])):
			continue
		if not SOIL_MATERIALS.has(world.get_cell(int(plant["base_x"]), int(plant["base_y"]) + 1)):
			harvest_plant(int(plant["id"]), int(plant["base_x"]), int(plant["base_y"]))
			continue
		var multiplier: float = weather_system.growth_multiplier() if weather_system != null else 1.0
		plant["weather_growth_credit"] = float(plant.get("weather_growth_credit", 0.0)) + float(GameConfig.FARM["growth_update_interval"]) * (multiplier - 1.0)
		var elapsed: float = maxf(0.0, float(state.frame - int(plant["planted_frame"])) + float(plant["weather_growth_credit"]))
		var final_stage: int = int(GameConfig.FARM["growth_stages"]) - 1
		var stage: int = final_stage if elapsed >= float(GameConfig.FARM["grow_frames"]) else min(final_stage - 1, floori(elapsed / float(GameConfig.FARM["grow_frames"]) * float(final_stage)))
		if stage != int(plant["stage"]):
			_apply_plant_stage(plant, stage)

func eat_produce(crop_id: int) -> bool:
	var crop: Dictionary = GameData.crop(crop_id)
	if crop.is_empty() or _produce_count(crop_id) <= 0:
		return false
	state.inventory_remove_item("produce", crop_id, 1)
	var before_health: float = float(state.player["hp"])
	var before_hunger: float = float(state.player["hunger"])
	var nutrition: int = min(35, 8 + int(crop["heal"]) * 2)
	state.player["hunger"] = minf(100.0, before_hunger + float(nutrition))
	state.player["hp"] = minf(100.0, before_health + float(max(1, ceili(float(crop["heal"]) * 0.35))))
	state.show_message("ATE %s  +%d HUNGER" % [String(crop["produce_name"]), roundi(float(state.player["hunger"]) - before_hunger)], 1200)
	return true

func eat_loot(loot_id: String) -> bool:
	var loot: Dictionary = FaunaData.loot(loot_id)
	if loot.is_empty() or not bool(loot.get("edible", false)) or state.inventory_loot_count(loot_id) <= 0:
		return false
	state.inventory_remove_loot(loot_id, 1)
	var before_health: float = float(state.player["hp"])
	var before_hunger: float = float(state.player["hunger"])
	state.player["hunger"] = minf(100.0, before_hunger + float(max(1, int(loot.get("hunger_restore", 12)))))
	state.player["hp"] = minf(100.0, before_health + float(max(0, int(loot.get("health_restore", 0)))))
	var hunger_gain: int = roundi(float(state.player["hunger"]) - before_hunger)
	var health_gain: int = roundi(float(state.player["hp"]) - before_health)
	var health_text: String = "  +%d HEALTH" % health_gain if health_gain > 0 else ""
	state.show_message("ATE %s  +%d HUNGER%s" % [String(loot["name"]), hunger_gain, health_text], 1200)
	return true

func update() -> void:
	_update_seed_particles()
	_update_pickups()
	if state.frame % int(GameConfig.FARM["growth_update_interval"]) == 0:
		_update_plants()
