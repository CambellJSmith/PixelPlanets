class_name MaterialSystem
extends RefCounted

const STUCK_NAPALM_LIFE: int = 1

var state: GameState
var world: WorldModel
var noise: PixelNoise
var weather_system: Variant
var last_processed_count: int = 0

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise, weather: Variant = null) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise
	weather_system = weather

func _wind_x() -> float:
	if weather_system != null and weather_system.has_method("wind_x"):
		return float(weather_system.wind_x())
	return float(state.weather.get("wind_x", 0.0))

func _drift_gas_with_wind(x: int, y: int) -> bool:
	var wind: float = _wind_x()
	if absf(wind) < 0.12:
		return false
	var direction: int = int(sign(wind))
	var chance: float = minf(0.92, absf(wind) * float(GameConfig.WEATHER["wind_gas_chance"]))
	if noise.random_at(x, y, state.frame + 699) > chance:
		return false
	if world.get_cell(x + direction, y) == GameData.AIR:
		world.swap_cells(x, y, x + direction, y)
		return true
	return false

func _touches_heat(x: int, y: int) -> bool:
	for offset: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var material: int = world.get_cell(x + offset.x, y + offset.y)
		if material == GameData.FIRE or material == GameData.LAVA:
			return true
	return false

func _touches_solid(x: int, y: int) -> bool:
	for offset: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		if world.is_solid(world.get_cell(x + offset.x, y + offset.y)):
			return true
	return false

func _update_fire(x: int, y: int) -> void:
	var life: int = world.get_life(x, y)
	if life <= 1:
		var result: int = GameData.SMOKE if noise.random_at(x, y, state.frame + 700) < 0.72 else GameData.AIR
		world.set_cell(x, y, result, 25, {"reason": "simulation"})
		return
	world.set_life(x, y, life - 1)
	for offset: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var nx: int = x + offset.x
		var ny: int = y + offset.y
		var material: int = world.get_cell(nx, ny)
		if material == GameData.SNOW:
			world.set_cell(nx, ny, GameData.WATER, 0, {"reason": "simulation"})
		elif material == GameData.WATER:
			world.set_cell(nx, ny, GameData.STEAM, int(GameConfig.STEAM["life_frames"]), {"reason": "simulation"})
		elif material == GameData.NAPALM:
			world.set_cell(nx, ny, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "simulation"})
		elif GameData.is_flammable(material) and noise.random_at(nx, ny, state.frame) < 0.07:
			world.set_cell(nx, ny, GameData.FIRE, 55 if material == GameData.LEAF else 80, {"reason": "simulation"})
	if world.get_cell(x, y - 1) == GameData.AIR and noise.random_at(x, y, state.frame + 4) < 0.58:
		world.swap_cells(x, y, x, y - 1)
		return
	var direction: int = -1 if noise.random_at(x, y, state.frame + 5) < 0.5 else 1
	if world.get_cell(x + direction, y - 1) == GameData.AIR and noise.random_at(x, y, state.frame + 6) < 0.45:
		world.swap_cells(x, y, x + direction, y - 1)

func _update_smoke(x: int, y: int) -> void:
	var life: int = world.get_life(x, y)
	if life <= 1:
		world.set_cell(x, y, GameData.AIR, 0, {"reason": "simulation"})
		return
	world.set_life(x, y, life - 1)
	if _drift_gas_with_wind(x, y):
		return
	var direction: int = -1 if noise.random_at(x, y, state.frame + 720) < 0.5 else 1
	if world.get_cell(x, y - 1) == GameData.AIR:
		world.swap_cells(x, y, x, y - 1)
	elif world.get_cell(x + direction, y - 1) == GameData.AIR:
		world.swap_cells(x, y, x + direction, y - 1)
	elif world.get_cell(x + direction, y) == GameData.AIR and noise.random_at(x, y, state.frame + 721) < 0.22:
		world.swap_cells(x, y, x + direction, y)

func _update_steam(x: int, y: int) -> void:
	var life: int = world.get_life(x, y)
	if life <= 1:
		world.set_cell(x, y, GameData.AIR, 0, {"reason": "simulation"})
		return
	world.set_life(x, y, life - 1)
	if _drift_gas_with_wind(x, y):
		return
	var direction: int = -1 if noise.random_at(x, y, state.frame + 760) < 0.5 else 1
	for destination: Vector2i in [Vector2i(x, y - 1), Vector2i(x + direction, y - 1), Vector2i(x - direction, y - 1), Vector2i(x + direction, y)]:
		var material: int = world.get_cell(destination.x, destination.y)
		if material == GameData.AIR or material == GameData.SMOKE:
			world.swap_cells(x, y, destination.x, destination.y)
			return

func _move_liquid_into(x: int, y: int, target_x: int, target_y: int) -> Vector2i:
	var target: int = world.get_cell(target_x, target_y)
	if target == GameData.AIR:
		world.swap_cells(x, y, target_x, target_y)
		return Vector2i(target_x, target_y)
	if not GameData.GASES.has(target):
		return Vector2i(2147483647, 2147483647)
	if world.get_cell(target_x, target_y + 1) == GameData.AIR:
		world.swap_cells(target_x, target_y, target_x, target_y + 1)
		world.swap_cells(x, y, target_x, target_y)
	else:
		world.swap_cells(x, y, target_x, target_y)
	return Vector2i(target_x, target_y)

func _update_liquid(x: int, y: int, material_id: int) -> Vector2i:
	var invalid: Vector2i = Vector2i(2147483647, 2147483647)
	var position: Vector2i = _move_liquid_into(x, y, x, y + 1)
	if position == invalid:
		var direction: int = -1 if noise.random_at(x, y, state.frame + 44) < 0.5 else 1
		position = _move_liquid_into(x, y, x + direction, y)
		if position == invalid:
			position = _move_liquid_into(x, y, x - direction, y)
		if position == invalid:
			position = Vector2i(x, y)
	if material_id != GameData.LAVA:
		return position
	for offset: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var nx: int = position.x + offset.x
		var ny: int = position.y + offset.y
		var neighbor: int = world.get_cell(nx, ny)
		if neighbor == GameData.WATER:
			world.set_cell(position.x, position.y, GameData.ROCK, 0, {"reason": "simulation"})
			world.set_cell(nx, ny, GameData.STEAM, int(GameConfig.STEAM["life_frames"]), {"reason": "simulation"})
			break
		if neighbor == GameData.NAPALM:
			world.set_cell(nx, ny, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "simulation"})
		elif GameData.is_flammable(neighbor):
			world.set_cell(nx, ny, GameData.FIRE, 65, {"reason": "simulation"})
	return position

func _update_napalm(x: int, y: int) -> void:
	if _touches_heat(x, y):
		world.set_cell(x, y, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "simulation"})
		return
	var age: int = world.get_age(x, y) + int(GameConfig.NAPALM["simulation_step_frames"])
	if age >= int(GameConfig.NAPALM["ignition_frames"]):
		world.set_cell(x, y, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "simulation"})
		return
	world.set_age(x, y, age)
	if world.get_life(x, y) == STUCK_NAPALM_LIFE or _touches_solid(x, y):
		world.set_life(x, y, STUCK_NAPALM_LIFE)
		return
	var position: Vector2i = _update_liquid(x, y, GameData.NAPALM)
	if _touches_heat(position.x, position.y):
		world.set_cell(position.x, position.y, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "simulation"})
	elif _touches_solid(position.x, position.y):
		world.set_life(position.x, position.y, STUCK_NAPALM_LIFE)

func _update_powder(x: int, y: int, material_id: int) -> void:
	var below: int = world.get_cell(x, y + 1)
	if below == GameData.AIR or below == GameData.WATER or below == GameData.NAPALM:
		world.swap_cells(x, y, x, y + 1)
		return
	var direction: int = -1 if noise.random_at(x, y, state.frame) < 0.5 else 1
	var diagonal: int = world.get_cell(x + direction, y + 1)
	if diagonal == GameData.AIR or diagonal == GameData.WATER or diagonal == GameData.NAPALM:
		world.swap_cells(x, y, x + direction, y + 1)
		return
	if material_id == GameData.MUD and state.frame % 4 == 0 and world.get_cell(x + direction, y) == GameData.AIR:
		world.swap_cells(x, y, x + direction, y)

func _update_dirt(x: int, y: int) -> void:
	if world.get_cell(x, y - 1) != GameData.AIR:
		if world.get_age(x, y) != 0:
			world.set_age(x, y, 0)
		return
	var age: int = world.get_age(x, y) + int(GameConfig.DIRT_GRASS["update_step_frames"])
	if age >= int(GameConfig.DIRT_GRASS["exposed_frames"]):
		world.set_cell(x, y, GameData.GRASS, 0, {"reason": "simulation"})
		return
	world.set_age(x, y, age)

func _compact_active_queue(chunk: Dictionary) -> void:
	var next: Array = []
	var flags: PackedByteArray = chunk["active_material_flags"]
	var queued: PackedByteArray = chunk["active_material_queued"]
	queued.fill(0)
	for value: Variant in chunk["active_material_queue"]:
		var index: int = int(value)
		if flags[index] == 0 or queued[index] != 0:
			continue
		queued[index] = 1
		next.append(index)
	chunk["active_material_queue"] = next

func update() -> void:
	state.world["simulation_stamp"] = int(state.world["simulation_stamp"]) + 1
	if int(state.world["simulation_stamp"]) >= 2147483000:
		state.world["simulation_stamp"] = 1
		for active_chunk: Variant in state.world["active_chunks"]:
			(active_chunk as Dictionary)["moved"].fill(0)
	var stamp: int = int(state.world["simulation_stamp"])
	var camera: Dictionary = state.world["camera"]
	var chunk: Dictionary = {}
	for candidate_value: Variant in state.world["active_chunks"]:
		var candidate: Dictionary = candidate_value
		if int(candidate["x"]) == int(camera["chunk_x"]) and int(candidate["y"]) == int(camera["chunk_y"]):
			chunk = candidate
			break
	if chunk.is_empty():
		last_processed_count = 0
		return
	world.initialize_chunk_tracking(chunk)
	var queue: Array = chunk["active_material_queue"]
	var initial_length: int = queue.size()
	var reverse: bool = state.frame % 4 >= 2
	var flags: PackedByteArray = chunk["active_material_flags"]
	var moved: PackedInt32Array = chunk["moved"]
	var cells: PackedByteArray = chunk["cells"]
	var processed: int = 0
	for pass_index: int in range(initial_length):
		var queue_index: int = initial_length - 1 - pass_index if reverse else pass_index
		var index: int = int(queue[queue_index])
		if flags[index] == 0 or moved[index] == stamp:
			continue
		var local_x: int = index % GameConfig.WORLD_WIDTH
		var local_y: int = floori(float(index) / float(GameConfig.WORLD_WIDTH))
		var material: int = int(cells[index])
		var world_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH + local_x
		var world_y: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT + local_y
		processed += 1
		if material == GameData.DIRT:
			_update_dirt(world_x, world_y)
		elif material == GameData.FIRE:
			_update_fire(world_x, world_y)
		elif material == GameData.SMOKE:
			_update_smoke(world_x, world_y)
		elif material == GameData.STEAM:
			_update_steam(world_x, world_y)
		elif material == GameData.NAPALM:
			_update_napalm(world_x, world_y)
		elif GameData.POWDERS.has(material):
			_update_powder(world_x, world_y, material)
		elif material == GameData.WATER or material == GameData.LAVA:
			_update_liquid(world_x, world_y, material)
	last_processed_count = processed
	if state.frame % 240 == 0 or queue.size() > max(2048, int(chunk["active_material_count"]) * 2 + 512):
		_compact_active_queue(chunk)
