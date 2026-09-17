class_name WeatherSystem
extends RefCounted

const SURFACE_WEIGHTS: Dictionary = {
	"plains":[["clear",30],["breeze",20],["rain",25],["thunderstorm",10],["fog",5],["heatwave",10]],
	"snow_peaks":[["clear",20],["breeze",10],["snow",35],["blizzard",25],["fog",10]],
	"bamboo_grove":[["clear",20],["breeze",15],["rain",30],["thunderstorm",10],["fog",20],["heatwave",5]],
	"swamp":[["clear",10],["rain",30],["thunderstorm",15],["fog",35],["heatwave",10]],
	"volcano":[["clear",15],["breeze",10],["ashfall",45],["heatwave",30]],
	"giant_forest":[["clear",20],["breeze",15],["rain",30],["thunderstorm",15],["fog",20]],
	"ocean":[["clear",10],["breeze",15],["rain",25],["ocean_storm",35],["fog",15]],
}

var state: GameState
var world: WorldModel
var noise: PixelNoise
var time_system: TimeSystem
var player_system: Variant

func _hypot(x: float, y: float) -> float:
	return Vector2(x, y).length()

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise, time: TimeSystem) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise
	time_system = time

func set_player_system(system: Variant) -> void:
	player_system = system

func _is_underground() -> bool:
	var surface: Dictionary = world.surface_at(float(state.player["x"]))
	return float(state.player["y"]) > float(surface["ground"]) + 12.0 or int(state.world["camera"]["chunk_y"]) > 0

func _habitat_name() -> String:
	var dimension_id: String = String(state.world["dimension"])
	if dimension_id != "earth":
		return "dimension:%s" % dimension_id
	if _is_underground():
		return "mushroom_caverns" if world.underground_biome_id_at(int(state.player["x"]), int(state.player["y"]) - 2) == 1 else "standard_caves"
	return world.biome_name_at(int(state.player["x"]), int(state.player["y"]) - 2)

func _choose_weighted(entries: Array, roll: float) -> String:
	var total: float = 0.0
	for entry: Variant in entries:
		total += float((entry as Array)[1])
	var cursor: float = roll * total
	for entry: Variant in entries:
		var pair: Array = entry
		cursor -= float(pair[1])
		if cursor <= 0.0:
			return String(pair[0])
	return String((entries.back() as Array)[0]) if not entries.is_empty() else "clear"

func _type_for_segment(segment: int, habitat: String) -> String:
	var override_value: Variant = state.weather.get("override_type")
	if override_value != null:
		return String(override_value)
	if habitat.begins_with("dimension:"):
		var dimension_id: String = habitat.trim_prefix("dimension:")
		var weather_list: Array = GameData.dimension(dimension_id)["weather"]
		if weather_list.is_empty():
			return "clear"
		var index: int = floori(noise.random_at(segment, state.seed + dimension_id.length(), 9007) * float(weather_list.size())) % weather_list.size()
		return String(weather_list[index])
	var region: int = floori(float(state.player["x"]) / float(GameData.BIOME_REGION_SIZE))
	var day_number: int = int(time_system.get_time()["day_number"])
	var roll: float = noise.random_at(segment, day_number * 97 + region * 313, state.seed + 9001)
	if habitat == "mushroom_caverns":
		return _choose_weighted([["spore_haze",58],["cave_drip",27],["clear",15]], roll)
	if habitat == "standard_caves":
		return _choose_weighted([["cave_drip",58],["clear",42]], roll)
	return _choose_weighted(SURFACE_WEIGHTS.get(habitat, SURFACE_WEIGHTS["plains"]), roll)

func _wind_direction(segment: int, habitat: String) -> int:
	if habitat == "dimension:moon":
		return 0
	if habitat.begins_with("dimension:"):
		var dimension_id: String = habitat.trim_prefix("dimension:")
		var weather_list: Array = GameData.dimension(dimension_id)["weather"]
		var all_clear: bool = true
		for item: Variant in weather_list:
			if String(item) != "clear":
				all_clear = false
				break
		if all_clear:
			return 0
		return -1 if noise.random_at(segment, dimension_id.length(), state.seed + 9017) < 0.5 else 1
	if habitat == "standard_caves" or habitat == "mushroom_caverns":
		return 0
	var region: int = floori(float(state.player["x"]) / float(GameData.BIOME_REGION_SIZE))
	return -1 if noise.random_at(segment, region, state.seed + 9011) < 0.5 else 1

func get_weather() -> Dictionary:
	var habitat: String = _habitat_name()
	var period: int = int(GameConfig.WEATHER["period_frames"])
	var segment: int = floori(float(state.frame) / float(period))
	var segment_frame: int = posmod(state.frame, period)
	var weather_type: String = _type_for_segment(segment, habitat)
	var definition: Dictionary = GameData.WEATHER.get(weather_type, GameData.WEATHER["clear"])
	var transition: int = max(1, int(GameConfig.WEATHER["transition_frames"]))
	var ramp_in: float = minf(1.0, float(segment_frame) / float(transition))
	var ramp_out: float = minf(1.0, float(period - segment_frame) / float(transition))
	var intensity: float = 1.0 if state.weather.get("override_type") != null else clampf(minf(ramp_in, ramp_out), 0.0, 1.0)
	var direction: int = _wind_direction(segment, habitat)
	var wind: float = float(direction) * float(definition["wind"]) * intensity
	var visibility: float = 1.0 - (1.0 - float(definition["visibility"])) * intensity
	if segment != int(state.weather["segment"]) or weather_type != String(state.weather["current_type"]):
		state.weather["previous_type"] = state.weather["current_type"]
		state.weather["current_type"] = weather_type
		state.weather["segment"] = segment
		var minimum: int = int(GameConfig.WEATHER["lightning_min_frames"])
		var maximum: int = int(GameConfig.WEATHER["lightning_max_frames"])
		state.weather["next_lightning_frame"] = state.frame + minimum + floori(noise.random_at(segment, state.seed, 9021) * float(maximum - minimum))
	state.weather["intensity"] = intensity
	state.weather["wind_x"] = wind
	state.weather["visibility"] = visibility
	var wind_label: String = "calm"
	if absf(wind) >= 0.08:
		var strength: String = "strong" if absf(wind) > 0.75 else ("steady" if absf(wind) > 0.35 else "light")
		wind_label = "%s %s" % ["←" if wind < 0.0 else "→", strength]
	return {
		"type": weather_type, "label": String(definition["label"]), "habitat": habitat,
		"segment": segment, "segment_frame": segment_frame, "intensity": intensity, "wind_x": wind,
		"wind_label": wind_label, "visibility": visibility, "precipitation": definition["precipitation"],
		"lightning": bool(definition["lightning"]),
		"growth_multiplier": 1.0 + (float(definition["growth_multiplier"]) - 1.0) * intensity,
	}

func growth_multiplier() -> float:
	return float(get_weather()["growth_multiplier"])

func wind_x() -> float:
	return float(get_weather()["wind_x"])

func force_weather(weather_type: Variant = null) -> Dictionary:
	state.weather["override_type"] = weather_type
	state.weather["segment"] = -1
	return get_weather()

func _camera_origin() -> Vector2i:
	return Vector2i(int(state.world["camera"]["chunk_x"]) * GameConfig.WORLD_WIDTH, int(state.world["camera"]["chunk_y"]) * GameConfig.WORLD_HEIGHT)

func _find_surface_y(world_x: int) -> int:
	var origin: Vector2i = _camera_origin()
	for local_y: int in range(1, GameConfig.WORLD_HEIGHT - 1):
		var world_y: int = origin.y + local_y
		if world.get_cell(world_x, world_y) != GameData.AIR:
			return world_y
	return origin.y + GameConfig.WORLD_HEIGHT - 2

func _random_visible_x(salt: int) -> int:
	var origin: Vector2i = _camera_origin()
	return origin.x + 2 + floori(noise.random_at(state.frame, salt, state.seed + 9031) * float(GameConfig.WORLD_WIDTH - 4))

func _deposit_at_surface(material_id: int, salt: int) -> bool:
	var x: int = _random_visible_x(salt)
	var y: int = _find_surface_y(x)
	var target: int = world.get_cell(x, y)
	var above: int = world.get_cell(x, y - 1)
	if material_id == GameData.WATER:
		if target == GameData.FIRE:
			return world.set_cell(x, y, GameData.SMOKE, 18, {"reason": "rain-extinguish"})
		if target == GameData.LAVA:
			return world.set_cell(x, y - 1, GameData.STEAM, int(GameConfig.STEAM["life_frames"]), {"reason": "rain-lava"})
		if above == GameData.AIR or above == GameData.SMOKE or above == GameData.STEAM:
			return world.set_cell(x, y - 1, GameData.WATER, 0, {"reason": "rain"})
		return false
	if above == GameData.AIR:
		return world.set_cell(x, y - 1, material_id, 0, {"reason": "weather-deposit"})
	return false

func _find_cave_ceiling(salt: int) -> Vector2i:
	var origin: Vector2i = _camera_origin()
	var x: int = origin.x + 2 + floori(noise.random_at(state.frame, salt, state.seed + 9041) * float(GameConfig.WORLD_WIDTH - 4))
	for local_y: int in range(2, GameConfig.WORLD_HEIGHT - 3):
		var y: int = origin.y + local_y
		if world.is_solid(world.get_cell(x, y - 1)) and world.get_cell(x, y) == GameData.AIR:
			return Vector2i(x, y)
	return Vector2i(2147483647, 2147483647)

func _apply_precipitation(weather: Dictionary) -> void:
	if float(weather["intensity"]) <= 0.08 or weather["precipitation"] == null:
		return
	var heavy: bool = ["thunderstorm", "ocean_storm", "blizzard"].has(String(weather["type"]))
	var count: int = clampi(2 + roundi(float(weather["intensity"])) if heavy else 1, 1, int(GameConfig.WEATHER["max_surface_deposits_per_tick"]))
	for index: int in range(count):
		var precipitation: String = String(weather["precipitation"])
		if precipitation == "rain":
			_deposit_at_surface(GameData.WATER, 9100 + index)
		elif precipitation == "snow":
			_deposit_at_surface(GameData.SNOW, 9200 + index)
		elif precipitation == "ash":
			_deposit_at_surface(GameData.ASH, 9300 + index)
		elif precipitation == "drip":
			var point: Vector2i = _find_cave_ceiling(9400 + index)
			if point.x != 2147483647:
				world.set_cell(point.x, point.y, GameData.WATER, 0, {"reason": "cave-drip"})
		elif precipitation == "spore":
			var point: Vector2i = _find_cave_ceiling(9500 + index)
			if point.x == 2147483647:
				continue
			for depth: int in range(1, 18):
				var y: int = point.y + depth
				var material: int = world.get_cell(point.x, y)
				if material == GameData.DIRT:
					world.set_cell(point.x, y, GameData.MYCELIUM, 0, {"reason": "spore-haze"})
					break
				if world.is_solid(material):
					break

func _apply_heat_pulse(weather: Dictionary) -> void:
	if String(weather["type"]) != "heatwave" or float(weather["intensity"]) < 0.3:
		return
	for index: int in range(3):
		var x: int = _random_visible_x(9600 + index)
		var y: int = _find_surface_y(x)
		var material: int = world.get_cell(x, y)
		if material == GameData.WATER:
			world.set_cell(x, y, GameData.STEAM, int(GameConfig.STEAM["life_frames"]), {"reason": "heatwave"})
		elif material == GameData.SNOW:
			world.set_cell(x, y, GameData.WATER, 0, {"reason": "heatwave"})
		elif material == GameData.FIRE:
			world.set_life(x, y, min(255, world.get_life(x, y) + 16))

func trigger_lightning(forced_x: Variant = null) -> Vector2i:
	var weather: Dictionary = get_weather()
	if not bool(weather["lightning"]) and forced_x == null:
		return Vector2i(2147483647, 2147483647)
	var x: int = roundi(float(forced_x)) if forced_x != null else _random_visible_x(9701)
	var y: int = _find_surface_y(x)
	(state.weather["flashes"] as Array).append({"x": x, "y": y, "frames": 14, "max_frames": 14})
	var strike_type: int = world.get_cell(x, y)
	if GameData.is_flammable(strike_type):
		world.set_cell(x, y, GameData.FIRE, int(GameConfig.WEATHER["lightning_fire_life"]), {"reason": "lightning"})
	elif world.get_cell(x, y - 1) == GameData.AIR:
		world.set_cell(x, y - 1, GameData.FIRE, int(GameConfig.WEATHER["lightning_fire_life"]), {"reason": "lightning"})
	(state.entities["explosions"] as Array).append({"x": x, "y": y - 1, "radius": 5, "frames": 10, "max_frames": 10, "kind": "lightning", "color": Color(0.886, 0.937, 1.0)})
	if _hypot(float(state.player["x"]) - float(x), float(state.player["y"]) - 2.0 - float(y)) <= 4.0:
		if player_system != null:
			player_system.damage(int(GameConfig.WEATHER["lightning_damage"]))
		else:
			state.player["hp"] = maxf(0.0, float(state.player["hp"]) - float(GameConfig.WEATHER["lightning_damage"]))
	var minimum: int = int(GameConfig.WEATHER["lightning_min_frames"])
	var maximum: int = int(GameConfig.WEATHER["lightning_max_frames"])
	state.weather["next_lightning_frame"] = state.frame + minimum + floori(noise.random_at(x, y, state.frame + 9702) * float(maximum - minimum))
	return Vector2i(x, y)

func _apply_wind(weather: Dictionary) -> void:
	var force: float = float(weather["wind_x"]) * float(GameConfig.WEATHER["wind_entity_force"])
	if absf(force) < 0.001:
		return
	for key: String in ["seed_particles", "pickups", "napalm_shots", "boss_fireballs", "serpent_projectiles", "boss_projectiles"]:
		for entity_value: Variant in state.entities[key]:
			var entity: Dictionary = entity_value
			if String(entity.get("kind", "")) == "lightning_marker":
				continue
			entity["vx"] = float(entity.get("vx", 0.0)) + force
	var camera: Dictionary = state.world["camera"]
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		if int(chunk["x"]) != int(camera["chunk_x"]) or int(chunk["y"]) != int(camera["chunk_y"]):
			continue
		for enemy_value: Variant in chunk["enemies"]:
			var enemy: Dictionary = enemy_value
			if String(enemy.get("movement", "")) == "flying":
				enemy["vx"] = float(enemy.get("vx", 0.0)) + force * 1.8

func update() -> void:
	var weather: Dictionary = get_weather()
	var flashes: Array = state.weather["flashes"]
	for index: int in range(flashes.size() - 1, -1, -1):
		flashes[index]["frames"] = int(flashes[index]["frames"]) - 1
		if int(flashes[index]["frames"]) <= 0:
			flashes.remove_at(index)
	_apply_wind(weather)
	if weather["precipitation"] != null:
		var interval: int = int(GameConfig.WEATHER["heavy_precipitation_interval_frames"]) if ["thunderstorm", "ocean_storm", "blizzard"].has(String(weather["type"])) else int(GameConfig.WEATHER["precipitation_interval_frames"])
		if state.frame % interval == 0:
			_apply_precipitation(weather)
	if state.frame % int(GameConfig.WEATHER["heat_pulse_frames"]) == 0:
		_apply_heat_pulse(weather)
	if bool(weather["lightning"]) and state.frame >= int(state.weather["next_lightning_frame"]):
		trigger_lightning()
