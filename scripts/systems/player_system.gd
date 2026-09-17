class_name PlayerSystem
extends RefCounted

var state: GameState
var world: WorldModel
var weapon_system: Variant
var furniture_system: Variant
var motion_remainder: Vector2 = Vector2.ZERO

func _init(game_state: GameState, world_model: WorldModel) -> void:
	state = game_state
	world = world_model

func set_weapon_system(system: Variant) -> void:
	weapon_system = system

func set_furniture_system(system: Variant) -> void:
	furniture_system = system

func _pressed(key: String) -> bool:
	return bool((state.input["keys"] as Dictionary).get(key, false))

func _bunny() -> Dictionary:
	return state.player["bunny_hop"]

func reset_bunny_hop() -> void:
	var bunny: Dictionary = _bunny()
	bunny["chain"] = 0
	bunny["landing_window"] = 0
	bunny["ground_frames"] = 0

func bunny_jump_multiplier(chain: int = -1) -> float:
	if chain < 0:
		chain = int(_bunny()["chain"])
	return minf(float(GameConfig.BUNNYHOP["max_jump_multiplier"]), 1.0 + float(max(0, chain - 1)) * float(GameConfig.BUNNYHOP["jump_speed_bonus_per_hop"]))

func bunny_speed_multiplier(chain: int = -1) -> float:
	if chain < 0:
		chain = int(_bunny()["chain"])
	return minf(float(GameConfig.BUNNYHOP["max_speed_multiplier"]), 1.0 + float(max(0, chain - 1)) * float(GameConfig.BUNNYHOP["speed_limit_bonus_per_hop"]))

func _bounds(x: int, y: int) -> Rect2i:
	var width: int = int(state.player["width"])
	var height: int = int(state.player["height"])
	var left: int = x - floori(float(width - 1) * 0.5)
	return Rect2i(left, y - height + 1, width, height)

func _blocked_at(x: int, y: int) -> bool:
	if world.is_solid(world.get_cell(x, y)):
		return true
	if furniture_system != null and furniture_system.has_method("solid_at"):
		return bool(furniture_system.solid_at(x, y))
	return false

func collides(x: int, y: int) -> bool:
	var bounds: Rect2i = _bounds(x, y)
	for py: int in range(bounds.position.y, bounds.end.y):
		for px: int in range(bounds.position.x, bounds.end.x):
			if _blocked_at(px, py):
				return true
	return false

func ground_probe_at(x: int, y: int) -> bool:
	var bounds: Rect2i = _bounds(x, y)
	var ground_row: int = bounds.end.y
	for px: int in range(bounds.position.x, bounds.end.x):
		if _blocked_at(px, ground_row):
			return true
	return false

func ground_probe() -> bool:
	return ground_probe_at(roundi(float(state.player["x"])), roundi(float(state.player["y"])))

func reset_motion_remainder() -> void:
	motion_remainder = Vector2.ZERO

func _whole_pixel_motion(axis: int, velocity: float) -> int:
	if axis == 0:
		var total: float = motion_remainder.x + velocity
		var pixels: int = int(total)
		motion_remainder.x = total - float(pixels)
		return pixels
	var total: float = motion_remainder.y + velocity
	var pixels: int = int(total)
	motion_remainder.y = total - float(pixels)
	return pixels

func _perform_jump() -> void:
	var player: Dictionary = state.player
	var bunny: Dictionary = _bunny()
	var within_landing_window: bool = int(bunny["chain"]) > 0 and state.frame - int(bunny["last_landing_frame"]) <= int(GameConfig.BUNNYHOP["landing_window_frames"])
	bunny["chain"] = min(int(GameConfig.BUNNYHOP["max_chain"]), int(bunny["chain"]) + 1) if within_landing_window else 1
	bunny["landing_window"] = 0
	bunny["ground_frames"] = 0
	bunny["last_jump_frame"] = state.frame
	var direction: int = -1 if _pressed("a") or _pressed("arrowleft") else (1 if _pressed("d") or _pressed("arrowright") else int(sign(float(player["vx"]))))
	if int(bunny["chain"]) > 1 and direction != 0:
		var growth: float = 1.0 + float(min(4, int(bunny["chain"]) - 2)) * float(GameConfig.BUNNYHOP["momentum_boost_growth"])
		player["vx"] = float(player["vx"]) + float(direction) * float(GameConfig.BUNNYHOP["momentum_boost"]) * growth
	var parasite_multiplier: float = clampf(float(player.get("parasite_slow_multiplier", 1.0)), 0.4, 1.0)
	var speed_limit: float = float(GameConfig.PLAYER["max_speed"]) * bunny_speed_multiplier(int(bunny["chain"])) * parasite_multiplier
	player["vx"] = clampf(float(player["vx"]), -speed_limit, speed_limit)
	player["vy"] = -float(GameConfig.PLAYER["jump_speed"]) * bunny_jump_multiplier(int(bunny["chain"]))
	player["grounded"] = false
	player["hunger"] = maxf(0.0, float(player["hunger"]) - float(GameConfig.HUNGER["jump_cost"]))
	motion_remainder.y = 0.0
	state.coyote_frames = 0
	state.jump_buffer = 0

func _scan_water_column(px: int, seed_y: int) -> Dictionary:
	var top: int = seed_y
	var upward_steps: int = 0
	while upward_steps < int(GameConfig.SWIM["column_scan_depth"]) and world.get_cell(px, top - 1) == GameData.WATER:
		top -= 1
		upward_steps += 1
	var cursor: int = top
	var liquid_depth: int = 0
	while liquid_depth < int(GameConfig.SWIM["column_scan_depth"]) and world.get_cell(px, cursor) == GameData.WATER:
		liquid_depth += 1
		cursor += 1
	var next_material: int = world.get_cell(px, cursor)
	return {"top": top, "bottom": cursor - 1, "liquid_depth": liquid_depth, "floor_y": cursor if world.is_solid(next_material) else null, "scan_limited": liquid_depth >= int(GameConfig.SWIM["column_scan_depth"])}

func water_exposure_at(x: int, y: int) -> Dictionary:
	var bounds: Rect2i = _bounds(x, y)
	var water_cells: int = 0
	var head_water_cells: int = 0
	var liquid_columns: int = 0
	var nearby_liquid_columns: int = 0
	var deep_columns: int = 0
	var nearby_deep_columns: int = 0
	var standable_columns: int = 0
	var columns: Array = []
	var surface_tops: Array[int] = []
	var ground_row: int = bounds.end.y
	for px: int in range(bounds.position.x, bounds.end.x):
		var seed_y: Variant = null
		var overlaps_body: bool = false
		for py: int in range(bounds.position.y, bounds.end.y):
			if world.get_cell(px, py) != GameData.WATER:
				continue
			water_cells += 1
			overlaps_body = true
			if seed_y == null:
				seed_y = py
			if py == bounds.position.y:
				head_water_cells += 1
		if seed_y == null:
			for py: int in range(ground_row, ground_row + int(GameConfig.SWIM["surface_latch_depth"]) + 1):
				if world.get_cell(px, py) == GameData.WATER:
					seed_y = py
					break
		if seed_y == null:
			continue
		nearby_liquid_columns += 1
		if overlaps_body:
			liquid_columns += 1
		var column: Dictionary = _scan_water_column(px, int(seed_y))
		surface_tops.append(int(column["top"]))
		var water_is_shallow: bool = column["floor_y"] != null and int(column["liquid_depth"]) <= int(GameConfig.SWIM["max_wade_depth"])
		var has_standing_room: bool = water_is_shallow and not collides(x, int(column["floor_y"])) and ground_probe_at(x, int(column["floor_y"]))
		if has_standing_room:
			standable_columns += 1
		else:
			nearby_deep_columns += 1
			if overlaps_body:
				deep_columns += 1
		column["x"] = px
		column["standable"] = has_standing_room
		column["overlaps_body"] = overlaps_body
		columns.append(column)
	var required_deep_columns: int = max(1, ceili(float(int(state.player["width"])) * float(GameConfig.SWIM["minimum_deep_column_ratio"])))
	surface_tops.sort()
	var surface_baseline_y: Variant = null
	if not surface_tops.is_empty():
		surface_baseline_y = surface_tops[floori(float(surface_tops.size()) * 0.5)] + int(GameConfig.SWIM["surface_body_depth"])
	var can_stand: bool = standable_columns > 0
	return {
		"water_cells": water_cells, "liquid_columns": liquid_columns, "nearby_liquid_columns": nearby_liquid_columns,
		"deep_columns": deep_columns, "nearby_deep_columns": nearby_deep_columns, "standable_columns": standable_columns,
		"can_stand": can_stand, "columns": columns, "surface_baseline_y": surface_baseline_y,
		"swimming": water_cells >= int(GameConfig.SWIM["water_cell_threshold"]) and liquid_columns >= required_deep_columns and deep_columns >= required_deep_columns and not can_stand,
		"surface_swimming": nearby_liquid_columns >= required_deep_columns and nearby_deep_columns >= required_deep_columns and not can_stand,
		"head_submerged": head_water_cells >= ceili(float(int(state.player["width"])) * 0.5), "bounds": bounds,
	}

func try_auto_step(next_x: int) -> bool:
	var player: Dictionary = state.player
	if not bool(player["grounded"]) or int(GameConfig.PLAYER["auto_step_height"]) <= 0 or is_zero_approx(float(player["vx"])):
		return false
	var target_x: int = roundi(next_x)
	var direction: int = signi(target_x - int(player["x"]))
	if direction == 0:
		return false
	var bounds: Rect2i = _bounds(target_x, int(player["y"]))
	var leading_x: int = bounds.end.x - 1 if direction > 0 else bounds.position.x
	var foot_row: int = bounds.end.y - 1
	if not _blocked_at(leading_x, foot_row):
		return false
	if _blocked_at(leading_x, foot_row - int(GameConfig.PLAYER["auto_step_height"])):
		return false
	var stepped_y: int = int(player["y"]) - int(GameConfig.PLAYER["auto_step_height"])
	if collides(target_x, stepped_y):
		return false
	player["x"] = target_x
	player["y"] = stepped_y
	player["vy"] = 0.0
	motion_remainder.y = 0.0
	return true

func _move_horizontal(pixel_count: int) -> bool:
	var player: Dictionary = state.player
	var direction: int = signi(pixel_count)
	var stepped_up: bool = false
	var landed: bool = false
	for _step: int in range(abs(pixel_count)):
		var next_x: int = int(player["x"]) + direction
		if not collides(next_x, int(player["y"])):
			player["x"] = next_x
			continue
		if not stepped_up and try_auto_step(next_x):
			stepped_up = true
			landed = true
			continue
		player["vx"] = 0.0
		motion_remainder.x = 0.0
		reset_bunny_hop()
		break
	return landed

func _move_vertical(pixel_count: int) -> bool:
	var player: Dictionary = state.player
	var direction: int = signi(pixel_count)
	var landed: bool = false
	for _step: int in range(abs(pixel_count)):
		var next_y: int = int(player["y"]) + direction
		if not collides(int(player["x"]), next_y):
			player["y"] = next_y
			continue
		if direction > 0:
			landed = true
		player["vy"] = 0.0
		motion_remainder.y = 0.0
		break
	return landed

func resolve_overlap(max_radius: int = 12) -> bool:
	var player: Dictionary = state.player
	player["x"] = roundi(float(player["x"]))
	player["y"] = roundi(float(player["y"]))
	if not collides(int(player["x"]), int(player["y"])):
		return false
	var offsets: Array[Vector3i] = []
	for dy: int in range(-max_radius, max_radius + 1):
		for dx: int in range(-max_radius, max_radius + 1):
			var distance: int = abs(dx) + abs(dy)
			if distance == 0 or distance > max_radius:
				continue
			offsets.append(Vector3i(dx, dy, distance))
	offsets.sort_custom(func(a: Vector3i, b: Vector3i) -> bool:
		if a.z != b.z: return a.z < b.z
		var ap: int = 0 if a.y < 0 else (1 if a.y == 0 else 2)
		var bp: int = 0 if b.y < 0 else (1 if b.y == 0 else 2)
		if ap != bp: return ap < bp
		if abs(a.x) != abs(b.x): return abs(a.x) < abs(b.x)
		return a.x < b.x
	)
	for offset: Vector3i in offsets:
		var candidate_x: int = int(player["x"]) + offset.x
		var candidate_y: int = int(player["y"]) + offset.y
		if collides(candidate_x, candidate_y):
			continue
		player["x"] = candidate_x
		player["y"] = candidate_y
		player["vx"] = 0.0
		player["vy"] = 0.0
		reset_motion_remainder()
		reset_bunny_hop()
		player["grounded"] = ground_probe_at(candidate_x, candidate_y)
		return true
	var bounds: Rect2i = _bounds(int(player["x"]), int(player["y"]))
	for py: int in range(bounds.position.y, bounds.end.y):
		for px: int in range(bounds.position.x, bounds.end.x):
			if world.is_solid(world.get_cell(px, py)):
				world.set_cell(px, py, GameData.AIR, 0, {"reason": "player-depenetration", "ignore_player": true})
	player["vx"] = 0.0
	player["vy"] = 0.0
	reset_motion_remainder()
	reset_bunny_hop()
	player["grounded"] = ground_probe()
	return true

func damage(amount: float, source_x: Variant = null) -> void:
	if int(state.player["invulnerability"]) > 0:
		return
	state.player["hp"] = float(state.player["hp"]) - amount
	state.player["invulnerability"] = 24
	state.ui["damage_flash"] = 12
	if source_x != null:
		state.ui["damage_direction"] = sign(float(source_x) - float(state.player["x"]))

func release_jump() -> void:
	if float(state.player["vy"]) < -0.45:
		state.player["vy"] = float(state.player["vy"]) * 0.55

func queue_jump() -> void:
	state.jump_buffer = int(GameConfig.PLAYER["jump_buffer_frames"])

func _collect_crystals() -> void:
	var player: Dictionary = state.player
	var found: bool = false
	for y: int in range(int(player["y"]) - 5, int(player["y"]) + 2):
		for x: int in range(int(player["x"]) - 3, int(player["x"]) + 4):
			if world.get_cell(x, y) == GameData.CRYSTAL:
				world.set_cell(x, y, GameData.AIR, 0, {"reason": "collect-crystal", "ignore_player": true})
				found = true
	if found:
		state.crystals += 1
		state.show_message("Crystal collected · total %d" % state.crystals)

func _on_ladder() -> bool:
	if furniture_system == null or not furniture_system.has_method("player_on_ladder"):
		return false
	return furniture_system.player_on_ladder() != null

func update() -> void:
	var player: Dictionary = state.player
	if bool(player["locked"]):
		player["vx"] = 0.0
		player["vy"] = 0.0
		player["grounded"] = true
		return
	if String(player.get("furniture_mode", "")) == "sit":
		player["vx"] = 0.0
		player["vy"] = 0.0
		player["grounded"] = true
		if int(player["invulnerability"]) > 0: player["invulnerability"] = int(player["invulnerability"]) - 1
		return
	resolve_overlap()
	var status: Dictionary = player["status"]
	var previous_swimming: bool = bool(status.get("swimming", false))
	var pressing_left: bool = _pressed("a") or _pressed("arrowleft")
	var pressing_right: bool = _pressed("d") or _pressed("arrowright")
	if pressing_left and not pressing_right: player["facing"] = -1
	elif pressing_right and not pressing_left: player["facing"] = 1
	elif float(player["vx"]) < -0.04: player["facing"] = -1
	elif float(player["vx"]) > 0.04: player["facing"] = 1
	var initial_water: Dictionary = water_exposure_at(int(player["x"]), int(player["y"]))
	var parasite_multiplier: float = clampf(float(player.get("parasite_slow_multiplier", 1.0)), 0.4, 1.0)
	var swimming: bool = (bool(initial_water["swimming"]) or (previous_swimming and bool(initial_water["surface_swimming"]))) and not bool(player["sky_spawn"])
	var climbing: bool = _on_ladder() and not swimming and not bool(player["sky_spawn"])
	var was_grounded: bool = bool(player["grounded"])
	player["grounded"] = not swimming and not climbing and ground_probe()
	state.coyote_frames = int(GameConfig.PLAYER["coyote_frames"]) if bool(player["grounded"]) else max(0, state.coyote_frames - 1)
	state.jump_buffer = max(0, state.jump_buffer - 1)
	var bunny: Dictionary = _bunny()
	if climbing:
		reset_bunny_hop()
		state.coyote_frames = 0
		var up: bool = _pressed("w") or _pressed("arrowup") or _pressed(" ")
		var down: bool = _pressed("s") or _pressed("arrowdown")
		if pressing_left: player["vx"] = float(player["vx"]) - 0.08 * parasite_multiplier
		if pressing_right: player["vx"] = float(player["vx"]) + 0.08 * parasite_multiplier
		player["vx"] = clampf(float(player["vx"]) * 0.72, -0.75, 0.75)
		player["vy"] = -1.05 if up and not down else (1.05 if down and not up else 0.0)
		motion_remainder.y = 0.0
		state.jump_buffer = 0
	elif swimming:
		reset_bunny_hop()
		state.jump_buffer = 0
		state.coyote_frames = 0
		var up: bool = _pressed("w") or _pressed("arrowup") or _pressed(" ")
		var down: bool = _pressed("s") or _pressed("arrowdown")
		if pressing_left: player["vx"] = float(player["vx"]) - float(GameConfig.SWIM["acceleration"]) * parasite_multiplier
		if pressing_right: player["vx"] = float(player["vx"]) + float(GameConfig.SWIM["acceleration"]) * parasite_multiplier
		var at_surface: bool = not bool(initial_water["head_submerged"]) and initial_water["surface_baseline_y"] != null
		if up and bool(initial_water["head_submerged"]):
			player["vy"] = float(player["vy"]) - float(GameConfig.SWIM["vertical_acceleration"])
		elif at_surface:
			var error: float = float(initial_water["surface_baseline_y"]) - float(player["y"])
			if error > 0.0: player["vy"] = float(player["vy"]) + minf(float(GameConfig.SWIM["surface_settle_acceleration"]), error * float(GameConfig.SWIM["surface_spring"]))
			elif error < 0.0 and not down: player["vy"] = float(player["vy"]) - minf(float(GameConfig.SWIM["buoyancy"]), -error * float(GameConfig.SWIM["surface_spring"]))
			if not down and float(player["y"]) <= float(initial_water["surface_baseline_y"]) and float(player["vy"]) < 0.0:
				player["vy"] = 0.0
				motion_remainder.y = 0.0
		else:
			player["vy"] = float(player["vy"]) - float(GameConfig.SWIM["buoyancy"])
		if down: player["vy"] = float(player["vy"]) + float(GameConfig.SWIM["downward_acceleration"])
		player["vx"] = float(player["vx"]) * float(GameConfig.SWIM["drag"])
		player["vy"] = float(player["vy"]) * float(GameConfig.SWIM["drag"])
		player["vx"] = clampf(float(player["vx"]), -float(GameConfig.SWIM["max_horizontal_speed"]) * parasite_multiplier, float(GameConfig.SWIM["max_horizontal_speed"]) * parasite_multiplier)
		player["vy"] = clampf(float(player["vy"]), -float(GameConfig.SWIM["max_vertical_speed"]), float(GameConfig.SWIM["max_vertical_speed"]))
	else:
		if not bool(player["sky_spawn"]) and state.jump_buffer > 0 and state.coyote_frames > 0:
			_perform_jump()
		var air_control: float = minf(float(GameConfig.BUNNYHOP["max_air_control_multiplier"]), 1.0 + float(max(0, int(bunny["chain"]) - 1)) * float(GameConfig.BUNNYHOP["air_control_bonus_per_hop"]))
		if not bool(player["sky_spawn"]):
			if pressing_left: player["vx"] = float(player["vx"]) - float(GameConfig.PLAYER["acceleration"]) * air_control * parasite_multiplier
			if pressing_right: player["vx"] = float(player["vx"]) + float(GameConfig.PLAYER["acceleration"]) * air_control * parasite_multiplier
		var preserving: bool = bool(player["grounded"]) and int(bunny["chain"]) > 0 and int(bunny["landing_window"]) > 0
		var drag: float = float(GameConfig.BUNNYHOP["ground_momentum_drag"]) if preserving else (float(GameConfig.PLAYER["ground_drag"]) if bool(player["grounded"]) else float(GameConfig.PLAYER["air_drag"]))
		player["vx"] = float(player["vx"]) * drag
		var speed_limit: float = float(GameConfig.PLAYER["max_speed"]) * bunny_speed_multiplier(int(bunny["chain"])) * parasite_multiplier
		player["vx"] = clampf(float(player["vx"]), -speed_limit, speed_limit)
		player["vy"] = minf(float(GameConfig.PLAYER["max_fall_speed"]), float(player["vy"]) + float(GameConfig.PLAYER["gravity"]) * world.dimension_gravity_scale())
	var impact_velocity: float = float(player["vy"])
	var horizontal_pixels: int = _whole_pixel_motion(0, float(player["vx"]))
	var vertical_pixels: int = _whole_pixel_motion(1, float(player["vy"]))
	var stepped_landed: bool = _move_horizontal(horizontal_pixels)
	var vertical_landed: bool = _move_vertical(vertical_pixels)
	var landed: bool = stepped_landed or vertical_landed
	var previous_chunk_x: int = int(state.world["camera"]["chunk_x"])
	var previous_chunk_y: int = int(state.world["camera"]["chunk_y"])
	if world.chunk_x(float(player["x"])) != previous_chunk_x or world.chunk_y(float(player["y"])) != previous_chunk_y:
		world.update_active_neighborhood()
		state.show_message("%s · region %d, %d" % [world.biome_name_at(int(player["x"]), int(player["y"])), int(state.world["camera"]["chunk_x"]), int(state.world["camera"]["chunk_y"])])
	var post_water: Dictionary = water_exposure_at(int(player["x"]), int(player["y"]))
	var now_swimming: bool = (bool(post_water["swimming"]) or (swimming and bool(post_water["surface_swimming"]))) and not bool(player["sky_spawn"])
	var still_climbing: bool = _on_ladder() and not now_swimming and not bool(player["sky_spawn"])
	player["grounded"] = false if now_swimming or still_climbing else (landed or ground_probe())
	if bool(player["grounded"]): state.coyote_frames = int(GameConfig.PLAYER["coyote_frames"])
	if not was_grounded and bool(player["grounded"]):
		bunny["last_landing_frame"] = state.frame
		bunny["landing_window"] = int(GameConfig.BUNNYHOP["landing_window_frames"])
		bunny["ground_frames"] = 0
	if bool(player["sky_spawn"]) and bool(player["grounded"]):
		player["sky_spawn"] = false
		player["spawn_ground_y"] = 0
		player["invulnerability"] = max(int(player["invulnerability"]), 60)
		state.jump_buffer = 0
		reset_bunny_hop()
		state.show_message("Touchdown", 900)
	if not bool(player["sky_spawn"]) and bool(player["grounded"]) and state.jump_buffer > 0:
		_perform_jump()
	if bool(player["grounded"]):
		bunny["ground_frames"] = int(bunny["ground_frames"]) + 1
		if int(bunny["landing_window"]) > 0: bunny["landing_window"] = int(bunny["landing_window"]) - 1
		if int(bunny["chain"]) > 0 and int(bunny["ground_frames"]) > int(GameConfig.BUNNYHOP["ground_reset_frames"]): reset_bunny_hop()
	else:
		bunny["ground_frames"] = 0
	var base_drain: float = float(GameConfig.HUNGER["max"]) / float(GameConfig.HUNGER["full_drain_frames"])
	var moving: bool = absf(float(player["vx"])) > 0.04 or not bool(player["grounded"])
	player["hunger_remainder"] = float(player["hunger_remainder"]) + (base_drain * float(GameConfig.HUNGER["moving_multiplier"]) if moving else base_drain)
	if float(player["hunger_remainder"]) >= 0.01:
		var hunger_drain: float = floor(float(player["hunger_remainder"]) * 100.0) / 100.0
		player["hunger"] = maxf(0.0, float(player["hunger"]) - hunger_drain)
		player["hunger_remainder"] = float(player["hunger_remainder"]) - hunger_drain
	player["starvation_timer"] = int(player["starvation_timer"]) + 1 if float(player["hunger"]) <= 0.0 else 0
	if int(player["starvation_timer"]) >= int(GameConfig.HUNGER["starvation_interval_frames"]):
		player["starvation_timer"] = 0
		damage(float(GameConfig.HUNGER["starvation_damage"]))
	var bounds: Rect2i = _bounds(int(player["x"]), int(player["y"]))
	var touches_lava: bool = false
	var touches_fire: bool = false
	var touches_steam: bool = false
	for py: int in range(bounds.position.y, bounds.end.y):
		for px: int in range(bounds.position.x, bounds.end.x):
			var material: int = world.get_cell(px, py)
			if material == GameData.LAVA: touches_lava = true
			if material == GameData.FIRE: touches_fire = true
			if material == GameData.STEAM: touches_steam = true
	var has_oxygen: bool = GameData.dimension_has_oxygen(String(state.world["dimension"]))
	var breath_using: bool = bool(post_water["head_submerged"]) or not has_oxygen
	status["lava"] = touches_lava
	status["fire"] = touches_fire
	status["steam"] = touches_steam
	status["starving"] = float(player["hunger"]) <= 0.0
	status["swimming"] = now_swimming
	status["climbing"] = still_climbing
	status["head_submerged"] = bool(post_water["head_submerged"])
	status["breath_using"] = breath_using
	status["no_oxygen"] = not has_oxygen
	if breath_using:
		player["breath_remainder"] = float(player["breath_remainder"]) + float(GameConfig.BREATH["max"]) / float(GameConfig.BREATH["full_drain_frames"])
		if float(player["breath_remainder"]) >= 0.01:
			var drain: float = floor(float(player["breath_remainder"]) * 100.0) / 100.0
			player["breath"] = maxf(0.0, float(player["breath"]) - drain)
			player["breath_remainder"] = float(player["breath_remainder"]) - drain
	else:
		player["breath_remainder"] = float(player["breath_remainder"]) - float(GameConfig.BREATH["max"]) / float(GameConfig.BREATH["full_recovery_frames"])
		if float(player["breath_remainder"]) <= -0.01:
			var recovery: float = floor(-float(player["breath_remainder"]) * 100.0) / 100.0
			player["breath"] = minf(float(GameConfig.BREATH["max"]), float(player["breath"]) + recovery)
			player["breath_remainder"] = float(player["breath_remainder"]) + recovery
	player["drowning_timer"] = int(player["drowning_timer"]) + 1 if float(player["breath"]) <= 0.0 else 0
	if int(player["drowning_timer"]) >= int(GameConfig.BREATH["drowning_interval_frames"]):
		player["drowning_timer"] = 0
		damage(float(GameConfig.BREATH["drowning_damage"]))
	if touches_lava: damage(5.0)
	if touches_fire: damage(4.0)
	if touches_steam: damage(float(GameConfig.STEAM["player_damage"]))
	if bool(player["sky_spawn"]): player["invulnerability"] = max(int(player["invulnerability"]), 60)
	if int(player["invulnerability"]) > 0: player["invulnerability"] = int(player["invulnerability"]) - 1
	if state.cooldown > 0: state.cooldown -= 1
	if state.sword_timer > 0: state.sword_timer -= 1
	if int(state.tool_effect["frames"]) > 0: state.tool_effect["frames"] = int(state.tool_effect["frames"]) - 1
	if bool(state.input["pointer_down"]) and weapon_system != null and weapon_system.has_method("attack"):
		weapon_system.attack()
	_collect_crystals()
	if float(player["hp"]) <= 0.0:
		player["hp"] = 0.0
		state.paused = true
		state.show_message("You died — press R to generate a new world", 5000)
