class_name WeaponSystem
extends RefCounted

const DESTRUCULATOR_RANGE: float = 18.0

var state: GameState
var world: WorldModel
var noise: PixelNoise
var crops: CropSystem
var furniture: FurnitureSystem
var laser_cell_heat: Dictionary = {}

func _hypot(x: float, y: float) -> float:
	return Vector2(x, y).length()

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise, crop_system: CropSystem, furniture_system: FurnitureSystem) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise
	crops = crop_system
	furniture = furniture_system

func aim() -> Dictionary:
	var camera: Dictionary = state.world["camera"]
	var target_x: float = float(int(camera["chunk_x"]) * GameConfig.WORLD_WIDTH + int(state.input["pointer_x"]))
	var target_y: float = float(int(camera["chunk_y"]) * GameConfig.WORLD_HEIGHT + int(state.input["pointer_y"]))
	var dx: float = target_x - float(state.player["x"])
	var dy: float = target_y - (float(state.player["y"]) - 2.0)
	var distance: float = maxf(0.0001, _hypot(dx, dy))
	return {"x": dx / distance, "y": dy / distance, "angle": atan2(dy, dx), "distance": distance, "target_x": target_x, "target_y": target_y}

func _direction_vector(direction: Dictionary) -> Vector2:
	return Vector2(float(direction["x"]), float(direction["y"]))

func exit_build_mode(show_message: bool = false) -> void:
	var had_hand: bool = bool(state.build["active"]) or bool(state.seed_mode["active"]) or state.build["equipped_material"] != null or state.build["equipped_furniture_id"] != null or state.seed_mode["crop_id"] != null
	if not had_hand:
		return
	state.build["active"] = false
	state.build["equipped_material"] = null
	state.build["equipped_furniture_id"] = null
	state.seed_mode["active"] = false
	state.seed_mode["crop_id"] = null
	state.cooldown = 0
	if show_message:
		state.show_message("Hand emptied", 800)

func _weapon_is_stolen(weapon_id: int) -> bool:
	return state.player.get("stolen_weapon_id") != null and int(state.player["stolen_weapon_id"]) == weapon_id

func cycle_weapon() -> void:
	if bool(state.build["active"]) or bool(state.seed_mode["active"]):
		exit_build_mode(false)
	for offset: int in range(1, GameData.WEAPONS.size() + 1):
		var candidate: int = posmod(state.weapon_id + offset, GameData.WEAPONS.size())
		if not _weapon_is_stolen(candidate):
			state.weapon_id = candidate
			break
	state.entities["hook"]["active"] = false
	state.laser["active"] = false
	state.laser["beam"] = null
	state.cooldown = 0

func equip_material(material_id: int) -> bool:
	if not GameData.is_placeable(material_id):
		state.show_message("That inventory item is not a placeable block")
		return false
	if int((state.inventory["counts"] as Dictionary).get(material_id, 0)) <= 0:
		state.show_message("%s is empty" % GameData.material_name(material_id))
		return false
	state.entities["hook"]["active"] = false
	state.seed_mode["active"] = false
	state.seed_mode["crop_id"] = null
	state.build["active"] = true
	state.build["equipped_material"] = material_id
	state.build["equipped_furniture_id"] = null
	state.cooldown = 0
	state.show_message("%s equipped · build mode" % GameData.material_name(material_id), 900)
	return true

func equip_furniture(furniture_id: String) -> bool:
	var definition: Dictionary = GameData.furniture(furniture_id)
	if definition.is_empty() or state.inventory_furniture_count(furniture_id) <= 0:
		state.show_message("Furniture is empty")
		return false
	state.entities["hook"]["active"] = false
	state.seed_mode["active"] = false
	state.seed_mode["crop_id"] = null
	state.build["active"] = true
	state.build["equipped_material"] = null
	state.build["equipped_furniture_id"] = furniture_id
	state.cooldown = 0
	state.show_message("%s equipped · place mode" % String(definition["name"]), 900)
	return true

func equip_seed(crop_id: int) -> bool:
	var crop: Dictionary = GameData.crop(crop_id)
	if crop.is_empty() or state.inventory_item_count("seed", crop_id) <= 0:
		state.show_message("Seeds are empty")
		return false
	state.entities["hook"]["active"] = false
	state.build["active"] = false
	state.build["equipped_material"] = null
	state.build["equipped_furniture_id"] = null
	state.seed_mode["active"] = true
	state.seed_mode["crop_id"] = crop_id
	state.cooldown = 0
	state.show_message("%s equipped · click to scatter" % String(crop["seed_name"]), 900)
	return true

func cycle_stored_material() -> void:
	var placeable: Array[int] = []
	for value: Variant in state.inventory["order"]:
		var material_id: int = int(value)
		if int((state.inventory["counts"] as Dictionary).get(material_id, 0)) > 0 and GameData.is_placeable(material_id):
			placeable.append(material_id)
	if placeable.is_empty():
		state.show_message("No placeable blocks in inventory")
		return
	var current: Variant = state.build["equipped_material"]
	var current_index: int = placeable.find(int(current)) if current != null else -1
	equip_material(placeable[posmod(current_index + 1, placeable.size())])

func _trace_ray(direction: Dictionary, max_range: float, ignore_types: Array[int] = []) -> Dictionary:
	var distance: float = minf(max_range, float(direction["distance"]))
	var endpoint: Vector2i = Vector2i(floori(float(state.player["x"]) + float(direction["x"]) * distance), floori(float(state.player["y"]) - 2.0 + float(direction["y"]) * distance))
	var last_air: Variant = null
	var previous: Vector2i = Vector2i(2147483647, 2147483647)
	for step: int in range(1, ceili(distance * 4.0) + 1):
		var beam_distance: float = float(step) / 4.0
		var point: Vector2i = Vector2i(floori(float(state.player["x"]) + float(direction["x"]) * beam_distance), floori(float(state.player["y"]) - 2.0 + float(direction["y"]) * beam_distance))
		if point == previous:
			continue
		previous = point
		var material: int = world.get_cell(point.x, point.y)
		if material == GameData.AIR or ignore_types.has(material):
			if material == GameData.AIR:
				last_air = point
			continue
		return {"hit": {"x": point.x, "y": point.y, "type": material}, "last_air": last_air, "endpoint": endpoint, "distance": distance}
	return {"hit": null, "last_air": last_air, "endpoint": endpoint, "distance": distance}

func get_destruculator_preview() -> Dictionary:
	var direction: Dictionary = aim()
	var hover_x: int = roundi(float(direction["target_x"]))
	var hover_y: int = roundi(float(direction["target_y"]))
	var hover_type: int = world.get_cell(hover_x, hover_y)
	var hover_distance: float = _hypot(float(hover_x) - float(state.player["x"]), float(hover_y) - (float(state.player["y"]) - 2.0))
	var explicit_liquid: bool = hover_distance <= DESTRUCULATOR_RANGE and GameData.LIQUIDS.has(hover_type)
	var trace: Dictionary = {"hit": {"x": hover_x, "y": hover_y, "type": hover_type}, "endpoint": Vector2i(hover_x, hover_y), "distance": hover_distance} if explicit_liquid else _trace_ray(direction, DESTRUCULATOR_RANGE, GameData.LIQUIDS)
	var furniture_hit: Dictionary = furniture.ray_hit(_direction_vector(direction), DESTRUCULATOR_RANGE)
	var terrain_distance: float = INF
	if trace["hit"] != null:
		terrain_distance = _hypot(float(trace["hit"]["x"]) - float(state.player["x"]), float(trace["hit"]["y"]) - (float(state.player["y"]) - 2.0))
	if not furniture_hit.is_empty() and float(furniture_hit["distance"]) <= terrain_distance:
		return {"valid": true, "x": int(furniture_hit["x"]), "y": int(furniture_hit["y"]), "type": GameData.AIR, "is_furniture": true, "furniture_entity": furniture_hit["entity"], "reason": "dismantle and collect furniture"}
	var target: Variant = trace["hit"] if trace["hit"] != null else trace["endpoint"]
	var target_type: int = int(trace["hit"]["type"]) if trace["hit"] != null else GameData.AIR
	var valid: bool = trace["hit"] != null and (GameData.is_collectable(target_type) or GameData.CROPS_MATERIALS.has(target_type))
	var target_point: Vector2i = Vector2i(int(target["x"]), int(target["y"])) if target is Dictionary else target
	var tx: int = target_point.x
	var ty: int = target_point.y
	return {"valid": valid, "x": tx, "y": ty, "type": target_type, "is_furniture": false, "reason": "destroy and collect" if valid else "no collectible block in range"}

func get_build_preview() -> Dictionary:
	var direction: Dictionary = aim()
	var trace: Dictionary = _trace_ray(direction, float(GameConfig.BUILD["range"]))
	var candidate: Variant = trace["last_air"] if trace["hit"] != null else trace["endpoint"]
	if candidate == null:
		return {"valid": false, "x": int(state.player["x"]), "y": int(state.player["y"]), "reason": "no open placement cell"}
	var candidate_point: Vector2i = candidate
	var x: int = candidate_point.x
	var y: int = candidate_point.y
	if state.build["equipped_furniture_id"] != null:
		var furniture_id: String = String(state.build["equipped_furniture_id"])
		var placement: Dictionary = furniture.can_place(furniture_id, x, y)
		var count: int = state.inventory_furniture_count(furniture_id)
		return {"valid": bool(state.build["active"]) and count > 0 and bool(placement.get("valid", false)), "x": x, "y": y, "is_furniture": true, "furniture_id": furniture_id, "reason": String(placement.get("reason", "invalid placement"))}
	var selected: Variant = state.build["equipped_material"]
	var material_id: int = int(selected) if selected != null else GameData.AIR
	var has_material: bool = selected != null and int((state.inventory["counts"] as Dictionary).get(material_id, 0)) > 0
	var valid: bool = bool(state.build["active"]) and has_material and GameData.is_placeable(material_id) and world.get_cell(x, y) == GameData.AIR and not world.player_occupies_pixel(x, y)
	return {"valid": valid, "x": x, "y": y, "type": material_id, "is_furniture": false, "reason": "ready to build" if valid else "invalid placement"}

func _use_destruculator() -> void:
	var preview: Dictionary = get_destruculator_preview()
	state.tool_effect = {"x": int(preview["x"]), "y": int(preview["y"]), "kind": "destroy", "valid": bool(preview["valid"]), "frames": 8 if bool(preview["valid"]) else 5}
	if not bool(preview["valid"]):
		state.cooldown = 5
		return
	if bool(preview["is_furniture"]):
		furniture.remove(preview["furniture_entity"], true)
	else:
		var material_id: int = int(preview["type"])
		if not GameData.CROPS_MATERIALS.has(material_id):
			state.inventory_add_material(material_id, 1)
		world.set_cell(int(preview["x"]), int(preview["y"]), GameData.AIR, 0, {"reason": "destruculator"})
	state.cooldown = 4

func _use_build_mode() -> void:
	var preview: Dictionary = get_build_preview()
	state.tool_effect = {"x": int(preview["x"]), "y": int(preview["y"]), "kind": "build", "valid": bool(preview["valid"]), "frames": 7 if bool(preview["valid"]) else 5}
	if not bool(preview["valid"]):
		state.cooldown = 4
		return
	if bool(preview["is_furniture"]):
		var furniture_id: String = String(preview["furniture_id"])
		furniture.place(furniture_id, int(preview["x"]), int(preview["y"]))
		state.inventory_remove_furniture(furniture_id, 1)
		state.cooldown = 8
		if state.inventory_furniture_count(furniture_id) <= 0:
			state.build["active"] = false
			state.build["equipped_furniture_id"] = null
		return
	var material_id: int = int(state.build["equipped_material"])
	if world.set_cell(int(preview["x"]), int(preview["y"]), material_id, 0, {"reason": "build"}):
		state.inventory_remove_material(material_id, 1)
	state.cooldown = 4
	if int((state.inventory["counts"] as Dictionary).get(material_id, 0)) <= 0:
		state.build["active"] = false
		state.build["equipped_material"] = null

func _damage_bosses_sword(direction: Dictionary, damage: float) -> void:
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary = boss_value
		var dx: float = float(boss["x"]) - float(state.player["x"])
		var dy: float = float(boss["y"]) - (float(state.player["y"]) - 2.0)
		var difference: float = wrapf(atan2(dy, dx) - float(direction["angle"]), -PI, PI)
		if _hypot(dx, dy) < 15.0 and absf(difference) < 1.1:
			boss["hp"] = float(boss["hp"]) - damage
			boss["hit"] = max(8, int(boss.get("hit", 0)))


func _find_drone_ground_target(direction: Dictionary) -> Dictionary:
	var camera: Dictionary = state.world["camera"]
	var origin_x: int = int(camera["chunk_x"]) * GameConfig.WORLD_WIDTH
	var origin_y: int = int(camera["chunk_y"]) * GameConfig.WORLD_HEIGHT
	var x: int = clampi(floori(float(direction["target_x"])), origin_x + 2, origin_x + GameConfig.WORLD_WIDTH - 3)
	var pointer_y: int = clampi(floori(float(direction["target_y"])), origin_y + 1, origin_y + GameConfig.WORLD_HEIGHT - 2)
	for y: int in range(origin_y + 1, origin_y + GameConfig.WORLD_HEIGHT - 1):
		if not world.is_solid(world.get_cell(x, y)):
			continue
		return {"x":x,"y":y,"snapped":y != pointer_y,"pointer_x":x,"pointer_y":pointer_y}
	return {}

func _drone_corridor_is_air(from_x: int, to_x: int, y: int) -> bool:
	var step: int = 1 if from_x <= to_x else -1
	var half_height: int = int(GameConfig.DRONE_STRIKE["corridor_half_height"])
	var x: int = from_x
	while true:
		for offset_y: int in range(-half_height, half_height + 1):
			if world.get_cell(x, y + offset_y) != GameData.AIR:
				return false
		if x == to_x:
			break
		x += step
	return true

func get_drone_strike_preview() -> Dictionary:
	var direction: Dictionary = aim()
	var camera: Dictionary = state.world["camera"]
	var origin_x: int = int(camera["chunk_x"]) * GameConfig.WORLD_WIDTH
	var origin_y: int = int(camera["chunk_y"]) * GameConfig.WORLD_HEIGHT
	var fallback_x: int = clampi(floori(float(direction["target_x"])), origin_x + 2, origin_x + GameConfig.WORLD_WIDTH - 3)
	var fallback_y: int = clampi(floori(float(direction["target_y"])), origin_y + 1, origin_y + GameConfig.WORLD_HEIGHT - 2)
	var target: Dictionary = _find_drone_ground_target(direction)
	if target.is_empty():
		return {"valid":false,"x":fallback_x,"y":fallback_y,"entry_x":null,"entry_y":null,"exit_x":null,"flight_direction":0,"pointer_x":fallback_x,"pointer_y":fallback_y,"snapped":false,"reason":"no solid pixel exists in the selected visible column"}
	var top_start: int = origin_y + int(GameConfig.DRONE_STRIKE["entry_top_margin"])
	var top_end: int = origin_y + floori(float(GameConfig.WORLD_HEIGHT) * float(GameConfig.DRONE_STRIKE["top_half_ratio"])) - int(GameConfig.DRONE_STRIKE["entry_top_margin"])
	var row_count: int = maxi(0, top_end - top_start + 1)
	if row_count == 0:
		return {"valid":false,"x":int(target["x"]),"y":int(target["y"]),"entry_x":null,"entry_y":null,"exit_x":null,"flight_direction":0,"pointer_x":int(target["pointer_x"]),"pointer_y":int(target["pointer_y"]),"snapped":bool(target["snapped"]),"reason":"the visible upper half is too obstructed for a drone"}
	var outside: int = int(GameConfig.DRONE_STRIKE["entry_outside_offset"])
	var left_entry: int = origin_x - outside
	var right_entry: int = origin_x + GameConfig.WORLD_WIDTH - 1 + outside
	var left_side: Dictionary = {"entry_x":left_entry,"exit_x":right_entry,"direction":1,"side":"left"}
	var right_side: Dictionary = {"entry_x":right_entry,"exit_x":left_entry,"direction":-1,"side":"right"}
	var sides: Array[Dictionary] = [left_side, right_side] if noise.random_at(int(target["x"]), int(target["y"]), 2241) < 0.5 else [right_side, left_side]
	var row_offset: int = floori(noise.random_at(int(target["x"]), int(target["y"]), 2242) * float(row_count))
	for index: int in range(row_count):
		var y: int = top_start + posmod(row_offset + index, row_count)
		for side: Dictionary in sides:
			if not _drone_corridor_is_air(int(side["entry_x"]), int(target["x"]), y):
				continue
			return {"valid":true,"x":int(target["x"]),"y":int(target["y"]),"entry_x":int(side["entry_x"]),"entry_y":y,"exit_x":int(side["exit_x"]),"flight_direction":int(side["direction"]),"side":String(side["side"]),"pointer_x":int(target["pointer_x"]),"pointer_y":int(target["pointer_y"]),"snapped":bool(target["snapped"]),"reason":"clear %s-side air approach" % String(side["side"])}
	return {"valid":false,"x":int(target["x"]),"y":int(target["y"]),"entry_x":null,"entry_y":null,"exit_x":null,"flight_direction":0,"pointer_x":int(target["pointer_x"]),"pointer_y":int(target["pointer_y"]),"snapped":bool(target["snapped"]),"reason":"no all-air flight corridor exists in the visible upper half"}

func _summon_drone_strike() -> bool:
	var preview: Dictionary = get_drone_strike_preview()
	if not bool(preview["valid"]):
		state.cooldown = 12
		state.show_message("Drone strike unavailable · %s" % String(preview["reason"]), 1300)
		return false
	(state.entities["drones"] as Array).append({
		"x":roundi(float(preview["entry_x"])),
		"y":roundi(float(preview["entry_y"])),
		"target_x":roundi(float(preview["x"])),
		"target_y":roundi(float(preview["y"])),
		"exit_x":roundi(float(preview["exit_x"])),
		"direction":int(preview["flight_direction"]),
		"phase":"approach",
		"bob":noise.random_at(int(preview["x"]), int(preview["y"]), 2243) * TAU,
		"launched":false,
	})
	state.cooldown = int(GameConfig.DRONE_STRIKE["cooldown"])
	state.show_message("Drone inbound · large rocket authorized", 1100)
	return true

func _spray_napalm(direction: Dictionary) -> void:
	var angle: float = float(direction["angle"]) + (noise.random_at(state.frame, int(state.player["x"]), 510) - 0.5) * 0.16
	var speed: float = 1.65 + noise.random_at(state.frame, int(state.player["y"]), 511) * 0.65
	(state.entities["napalm_shots"] as Array).append({"x": roundi(float(state.player["x"]) + cos(angle) * 2.2), "y": roundi(float(state.player["y"]) - 2.0 + sin(angle) * 2.2), "vx": cos(angle) * speed + float(state.player["vx"]) * 0.2, "vy": sin(angle) * speed + float(state.player["vy"]) * 0.12, "life": 45})
	state.cooldown = 2

func _spawn_laser_sparks(x: int, y: int, direction: Dictionary) -> void:
	for index: int in range(int(GameConfig.LASER_RIFLE["spark_count_per_frame"])):
		var spread: float = (noise.random_at(state.frame, index, x + y * 13 + 8801) - 0.5) * 2.4
		var speed: float = 0.45 + noise.random_at(index, state.frame, 8802) * 1.05
		var angle: float = atan2(-float(direction["y"]), -float(direction["x"])) + spread
		(state.entities["laser_sparks"] as Array).append({"x":float(x),"y":float(y),"vx":cos(angle)*speed,"vy":sin(angle)*speed-0.18,"life":8+floori(noise.random_at(x+index,y,state.frame+8803)*11.0)})
	var sparks: Array = state.entities["laser_sparks"]
	var overflow: int = sparks.size() - int(GameConfig.LASER_RIFLE["max_sparks"])
	if overflow > 0:
		sparks = sparks.slice(overflow)
		state.entities["laser_sparks"] = sparks

func _update_laser_sparks() -> void:
	var sparks: Array = state.entities["laser_sparks"]
	for index: int in range(sparks.size()-1,-1,-1):
		var spark: Dictionary = sparks[index]
		spark["x"] = float(spark["x"]) + float(spark["vx"])
		spark["y"] = float(spark["y"]) + float(spark["vy"])
		spark["vx"] = float(spark["vx"]) * 0.94
		spark["vy"] = float(spark["vy"]) + 0.075
		spark["life"] = int(spark["life"]) - 1
		if int(spark["life"]) <= 0:
			sparks.remove_at(index)

func _fire_laser_frame() -> void:
	var direction: Dictionary = aim()
	var trace: Dictionary = _trace_ray(direction, float(GameConfig.LASER_RIFLE["range"]), [GameData.SMOKE, GameData.STEAM, GameData.FIRE])
	var target: Variant = trace["hit"] if trace["hit"] != null else trace["endpoint"]
	var impact_point: Vector2i = Vector2i(int(target["x"]), int(target["y"])) if target is Dictionary else target
	var impact_x: int = impact_point.x
	var impact_y: int = impact_point.y
	var start: Vector2 = Vector2(float(state.player["x"]), float(state.player["y"]) - 2.0)
	var ray: Vector2 = _direction_vector(direction)
	var max_distance: float = start.distance_to(Vector2(impact_x, impact_y))
	var closest_entity: Dictionary = {}
	var closest_distance: float = max_distance + 1.0
	for chunk_value: Variant in state.world["active_chunks"]:
		for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]:
			var enemy: Dictionary = enemy_value
			var delta: Vector2 = Vector2(float(enemy["x"]), float(enemy["y"])) - start
			var projected: float = delta.dot(ray)
			if projected <= 0.0 or projected >= closest_distance or projected > max_distance:
				continue
			if absf(delta.cross(ray)) <= float(enemy.get("hit_radius", 2.0)) + 0.65:
				closest_entity = {"kind": "enemy", "entity": enemy}
				closest_distance = projected
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary = boss_value
		var delta: Vector2 = Vector2(float(boss["x"]), float(boss["y"])) - start
		var projected: float = delta.dot(ray)
		if projected <= 0.0 or projected >= closest_distance or projected > max_distance:
			continue
		var radius: float = maxf(3.0, minf(float(boss.get("width", 12)) * 0.42, float(boss.get("height", 10)) * 0.55))
		if absf(delta.cross(ray)) <= radius:
			closest_entity = {"kind": "boss", "entity": boss}
			closest_distance = projected
	if not closest_entity.is_empty():
		state.laser["contact_heat"] = 0.0
		impact_x = roundi(start.x + ray.x * closest_distance)
		impact_y = roundi(start.y + ray.y * closest_distance)
		var entity: Dictionary = closest_entity["entity"]
		entity["hp"] = float(entity["hp"]) - (float(GameConfig.LASER_RIFLE["enemy_damage_per_frame"]) if String(closest_entity["kind"]) == "enemy" else float(GameConfig.LASER_RIFLE["boss_damage_per_frame"]))
		entity["hit"] = max(3, int(entity.get("hit", 0)))
	elif trace["hit"] != null:
		var key: String = "%d,%d" % [impact_x, impact_y]
		var heat: float = minf(140.0, float(laser_cell_heat.get(key, 0.0)) + float(GameConfig.LASER_RIFLE["pixel_heat_per_frame"]))
		laser_cell_heat[key] = heat
		state.laser["contact_heat"] = heat
		var material: int = world.get_cell(impact_x, impact_y)
		if material == GameData.WATER and heat >= float(GameConfig.LASER_RIFLE["water_steam_heat"]):
			world.set_cell(impact_x, impact_y, GameData.STEAM, 90, {"reason": "laser-heating"})
		elif material == GameData.SNOW and heat >= float(GameConfig.LASER_RIFLE["snow_melt_heat"]):
			world.set_cell(impact_x, impact_y, GameData.WATER, 0, {"reason": "laser-heating"})
		elif (material == GameData.NAPALM and heat >= float(GameConfig.LASER_RIFLE["ignition_heat"]) * 0.45) or (GameData.is_flammable(material) and heat >= float(GameConfig.LASER_RIFLE["ignition_heat"])):
			world.set_cell(impact_x, impact_y, GameData.FIRE, 105, {"reason": "laser-heating"})
		elif material == GameData.SAND and heat >= float(GameConfig.LASER_RIFLE["sand_melt_heat"]):
			world.set_cell(impact_x, impact_y, GameData.LAVA, 0, {"reason": "laser-heating"})
		elif [GameData.ROCK, GameData.DIRT, GameData.CRYSTAL].has(material) and heat >= float(GameConfig.LASER_RIFLE["stone_melt_heat"]):
			world.set_cell(impact_x, impact_y, GameData.LAVA, 0, {"reason": "laser-heating"})
	else:
		state.laser["contact_heat"] = 0.0
	state.laser["active"] = true
	state.laser["beam"] = {"start_x": roundi(start.x), "start_y": roundi(start.y), "end_x": impact_x, "end_y": impact_y, "impact_x": impact_x, "impact_y": impact_y, "contact_kind": String(closest_entity.get("kind", "terrain" if trace["hit"] != null else "air"))}
	_spawn_laser_sparks(impact_x, impact_y, direction)
	state.laser["heat"] = minf(100.0, float(state.laser["heat"]) + float(GameConfig.LASER_RIFLE["weapon_heat_per_frame"]))
	if float(state.laser["heat"]) >= 100.0:
		state.laser["heat"] = 100.0
		state.laser["overheated"] = true
		state.laser["active"] = false
		state.laser["beam"] = null
		state.show_message("Laser rifle overheated", 900)

func update_continuous() -> void:
	_update_laser_sparks()
	var keys: Array = laser_cell_heat.keys()
	for key_value: Variant in keys:
		var key: String = String(key_value)
		var next_heat: float = float(laser_cell_heat[key]) - float(GameConfig.LASER_RIFLE["pixel_heat_decay"])
		if next_heat <= 0.0:
			laser_cell_heat.erase(key)
		else:
			laser_cell_heat[key] = next_heat
	if laser_cell_heat.size() > 96:
		var heat_entries: Array = []
		for heat_key: Variant in laser_cell_heat.keys():
			heat_entries.append({"key":String(heat_key),"heat":float(laser_cell_heat[heat_key])})
		heat_entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["heat"]) < float(b["heat"]))
		for index: int in range(heat_entries.size() - 96):
			laser_cell_heat.erase(String(heat_entries[index]["key"]))
	var firing: bool = state.weapon_id == 8 and bool(state.input["pointer_down"]) and not bool(state.build["active"]) and not bool(state.seed_mode["active"]) and float(state.player["hp"]) > 0.0
	if firing and not bool(state.laser["overheated"]):
		_fire_laser_frame()
	else:
		state.laser["active"] = false
		state.laser["beam"] = null
		state.laser["contact_heat"] = 0.0
		state.laser["heat"] = maxf(0.0, float(state.laser["heat"]) - float(GameConfig.LASER_RIFLE["weapon_cool_per_frame"]))
		if bool(state.laser["overheated"]) and float(state.laser["heat"]) <= float(GameConfig.LASER_RIFLE["overheat_release"]):
			state.laser["overheated"] = false
			state.show_message("Laser rifle cooled", 700)
	var hot: Array = []
	for key_value: Variant in laser_cell_heat.keys():
		var parts: PackedStringArray = String(key_value).split(",")
		hot.append({"x": int(parts[0]), "y": int(parts[1]), "heat": float(laser_cell_heat[key_value])})
	state.laser["hot_pixels"] = hot

func _fire_reality_zipper(direction: Dictionary) -> bool:
	if not (state.entities["reality_rifts"] as Array).is_empty():
		state.show_message("Reality is already unzipped", 700)
		state.cooldown = 12
		return false
	var distance: float = clampf(float(direction["distance"]), 14.0, float(GameConfig.REALITY_ZIPPER["range"]))
	var start_distance: float = minf(7.0, maxf(4.0, distance * 0.14))
	var start_x: int = roundi(float(state.player["x"]) + float(direction["x"]) * start_distance)
	var start_y: int = roundi(float(state.player["y"]) - 2.0 + float(direction["y"]) * start_distance)
	var end_x: int = roundi(float(state.player["x"]) + float(direction["x"]) * distance)
	var end_y: int = roundi(float(state.player["y"]) - 2.0 + float(direction["y"]) * distance)
	var horizontal: bool = abs(end_x - start_x) >= abs(end_y - start_y)
	(state.entities["reality_rifts"] as Array).append({"id": "rift-%d-%d-%d" % [state.frame, start_x, start_y], "start_x": start_x, "start_y": start_y, "end_x": end_x, "end_y": end_y, "normal_x": 0 if horizontal else 1, "normal_y": 1 if horizontal else 0, "age": 0, "life": int(GameConfig.REALITY_ZIPPER["life_frames"]), "phase": "opening", "snapshot": [], "points": []})
	state.reality_zipper["active"] = true
	state.reality_zipper["phase"] = "opening"
	state.cooldown = int(GameConfig.REALITY_ZIPPER["cooldown"])
	state.show_message("REALITY UNZIPPED", 900)
	return true

func attack() -> void:
	if float(state.player["hp"]) <= 0.0:
		return
	if _weapon_is_stolen(state.weapon_id):
		state.show_message("That weapon was stolen — hunt down the thief", 800)
		cycle_weapon()
		return
	var direction: Dictionary = aim()
	if bool(state.seed_mode["active"]) and state.seed_mode["crop_id"] != null:
		if state.cooldown <= 0 and crops.throw_seeds(int(state.seed_mode["crop_id"]), _direction_vector(direction)):
			state.cooldown = 14
		return
	if bool(state.build["active"]):
		if state.cooldown <= 0:
			_use_build_mode()
		return
	if state.weapon_id == 8:
		if not bool(state.laser["overheated"]):
			_fire_laser_frame()
		return
	if state.cooldown > 0:
		return
	match state.weapon_id:
		0:
			(state.entities["bullets"] as Array).append({"x": roundi(float(state.player["x"]) + float(direction["x"]) * 2.0), "y": roundi(float(state.player["y"]) - 2.0 + float(direction["y"]) * 2.0), "vx": float(direction["x"]) * 3.6, "vy": float(direction["y"]) * 3.6, "life": 72, "pierce": 2})
			state.player["vx"] = float(state.player["vx"]) - float(direction["x"]) * 0.08
			state.cooldown = 9
		1:
			_spray_napalm(direction)
		2:
			if not (state.entities["glaives"] as Array).is_empty():
				return
			(state.entities["glaives"] as Array).append({"x": float(state.player["x"]), "y": float(state.player["y"]) - 2.0, "vx": float(direction["x"]) * float(GameConfig.GLAIVE["launch_speed"]), "vy": float(direction["y"]) * float(GameConfig.GLAIVE["launch_speed"]), "age": 0, "returning": false, "spin": float(direction["angle"]), "spin_speed": float(GameConfig.GLAIVE["spin_speed"]), "bounces": 0, "hits": {}})
			state.cooldown = 24
		3:
			var hook: Dictionary = state.entities["hook"]
			if bool(hook["active"]):
				return
			hook.merge({"active": true, "stuck": false, "x": float(state.player["x"]), "y": float(state.player["y"]) - 2.0, "vx": float(direction["x"]) * 3.1, "vy": float(direction["y"]) * 3.1}, true)
			state.cooldown = 8
		4:
			state.sword_timer = 12
			state.sword_angle = float(direction["angle"])
			state.cooldown = 16
			for chunk_value: Variant in state.world["active_chunks"]:
				for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]:
					var enemy: Dictionary = enemy_value
					var dx: float = float(enemy["x"]) - float(state.player["x"])
					var dy: float = float(enemy["y"]) - (float(state.player["y"]) - 2.0)
					var difference: float = wrapf(atan2(dy, dx) - float(direction["angle"]), -PI, PI)
					if _hypot(dx, dy) < 8.0 + float(enemy.get("hit_radius", 2.0)) and absf(difference) < 1.05:
						enemy["hp"] = float(enemy["hp"]) - 35.0
						enemy["hit"] = 8
						enemy["vx"] = float(enemy.get("vx", 0.0)) + cos(float(direction["angle"])) * 0.5
						enemy["vy"] = float(enemy.get("vy", 0.0)) + sin(float(direction["angle"])) * 0.5
			_damage_bosses_sword(direction, 35.0)
		5:
			var speed: float = float(GameConfig.GRENADE["launch_speed"])
			(state.entities["grenades"] as Array).append({"x": roundi(float(state.player["x"]) + float(direction["x"]) * 2.0), "y": roundi(float(state.player["y"]) - 2.0 + float(direction["y"]) * 2.0), "vx": float(direction["x"]) * speed + float(state.player["vx"]) * 0.35, "vy": float(direction["y"]) * speed + float(state.player["vy"]) * 0.18, "fuse": int(GameConfig.GRENADE["fuse_frames"]), "rotation": 0.0})
			state.player["vx"] = float(state.player["vx"]) - float(direction["x"]) * 0.22
			state.cooldown = int(GameConfig.GRENADE["cooldown"])
		6:
			_use_destruculator()
		7:
			_summon_drone_strike()
		9:
			if not (state.entities["nyan_cats"] as Array).is_empty():
				state.cooldown = 12
				return
			(state.entities["nyan_cats"] as Array).append({"x": roundi(float(state.player["x"]) + float(direction["x"]) * 5.0), "y": roundi(float(state.player["y"]) - 2.0 + float(direction["y"]) * 3.0), "vx": float(direction["x"]) * float(GameConfig.NYAN_CAT["speed"]) + float(state.player["vx"]) * 0.18, "vy": float(direction["y"]) * float(GameConfig.NYAN_CAT["speed"]) + float(state.player["vy"]) * 0.1, "life": int(GameConfig.NYAN_CAT["life_frames"]), "pierce": int(GameConfig.NYAN_CAT["pierce"]), "bounces": 0, "phase": noise.random_at(state.frame, int(state.player["x"]), 9901) * TAU, "trail": [], "hits": {}})
			state.player["vx"] = float(state.player["vx"]) - float(direction["x"]) * 0.55
			state.player["vy"] = float(state.player["vy"]) - float(direction["y"]) * 0.18
			state.cooldown = int(GameConfig.NYAN_CAT["cooldown"])
			state.show_message("NYAN CAT LAUNCHED", 700)
		10:
			_fire_reality_zipper(direction)

func update_hook() -> void:
	var hook: Dictionary = state.entities["hook"]
	if not bool(hook["active"]):
		return
	if not bool(hook["stuck"]):
		for _step: int in range(3):
			hook["x"] = float(hook["x"]) + float(hook["vx"]) / 3.0
			hook["y"] = float(hook["y"]) + float(hook["vy"]) / 3.0
			if _hypot(float(hook["x"]) - float(state.player["x"]), float(hook["y"]) - float(state.player["y"])) > 58.0:
				hook["active"] = false
				return
			if world.is_solid(world.get_cell(floori(float(hook["x"])), floori(float(hook["y"])))):
				hook["stuck"] = true
				break
		hook["x"] = roundi(float(hook["x"]))
		hook["y"] = roundi(float(hook["y"]))
		return
	if bool(state.input["pointer_down"]) and state.weapon_id == 3 and not bool(state.build["active"]):
		var dx: float = float(hook["x"]) - float(state.player["x"])
		var dy: float = float(hook["y"]) - (float(state.player["y"]) - 2.0)
		var distance: float = maxf(0.0001, _hypot(dx, dy))
		state.player["vx"] = float(state.player["vx"]) + dx / distance * 0.14
		state.player["vy"] = float(state.player["vy"]) + dy / distance * 0.14
	else:
		hook["active"] = false
