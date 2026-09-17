class_name BossSystem
extends RefCounted

const RITUAL_CHECK_INTERVAL: int = 15

var state: GameState
var world: WorldModel
var noise: PixelNoise
var player_system: PlayerSystem
var time_system: TimeSystem
var weather_system: WeatherSystem

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise, player: PlayerSystem, time: TimeSystem, weather: WeatherSystem) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise
	player_system = player
	time_system = time
	weather_system = weather

func _distance(ax: float, ay: float, bx: float, by: float) -> float:
	return Vector2(ax - bx, ay - by).length()

func encounter(kind: String) -> Dictionary:
	var encounters: Dictionary = state.world["boss_encounters"]
	if not encounters.has(kind):
		encounters[kind] = {"spawned": false, "defeated": false, "region_index": null, "defeated_frame": -1, "ritual_progress": 0, "ritual_completed": false, "ritual_region_index": null}
	return encounters[kind]

func _camera_origin() -> Vector2i:
	var camera: Dictionary = state.world["camera"]
	return Vector2i(int(camera["chunk_x"]) * GameConfig.WORLD_WIDTH, int(camera["chunk_y"]) * GameConfig.WORLD_HEIGHT)

func _count_nearby_materials(materials: Array[int], radius_x: int = 18, radius_y: int = 12, step: int = 1) -> int:
	var center_x: int = roundi(float(state.player["x"]))
	var center_y: int = roundi(float(state.player["y"]) - 2.0)
	var count: int = 0
	for y: int in range(center_y - radius_y, center_y + radius_y + 1, step):
		for x: int in range(center_x - radius_x, center_x + radius_x + 1, step):
			if materials.has(world.get_cell(x, y)):
				count += 1
	return count

func _player_touches(materials: Array[int]) -> bool:
	var x: int = roundi(float(state.player["x"]))
	for y: int in [roundi(float(state.player["y"])), roundi(float(state.player["y"]) - 1.0), roundi(float(state.player["y"]) - 2.0)]:
		if materials.has(world.get_cell(x, y)):
			return true
	return false

func _uncovered_above(height: int = 28) -> bool:
	var x: int = roundi(float(state.player["x"]))
	var top: int = roundi(float(state.player["y"]) - 3.0)
	for y: int in range(top - 1, top - height - 1, -1):
		if world.is_solid(world.get_cell(x, y)):
			return false
	return true

func _weather_is(types: Array[String]) -> bool:
	return types.has(String(state.weather.get("current_type", "clear")))

func _set_ritual_hint(kind: String, detail: String = "") -> void:
	if state.ui["boss_ritual"] != null:
		return
	var ritual: Dictionary = BossData.ritual(kind)
	if ritual.is_empty():
		return
	var record: Dictionary = encounter(kind)
	state.ui["boss_ritual"] = {"kind": kind, "title": ritual["title"], "hint": detail if not detail.is_empty() else ritual["hint"], "progress": mini(int(ritual["progress_frames"]), int(record["ritual_progress"])), "max_progress": int(ritual["progress_frames"])}

func _advance_ritual(kind: String, present: bool, eligible: bool, region_index: int, detail: String = "", consume: Callable = Callable()) -> bool:
	var record: Dictionary = encounter(kind)
	if bool(record["spawned"]) or bool(record["defeated"]) or not present:
		return false
	var ritual: Dictionary = BossData.ritual(kind)
	if ritual.is_empty():
		return false
	_set_ritual_hint(kind, detail)
	if bool(record["ritual_completed"]):
		return true
	var progress: int = int(record["ritual_progress"])
	if eligible:
		progress = mini(int(ritual["progress_frames"]), progress + RITUAL_CHECK_INTERVAL)
	else:
		progress = maxi(0, progress - 3)
	record["ritual_progress"] = progress
	var hint: Variant = state.ui["boss_ritual"]
	if hint is Dictionary and String(hint.get("kind", "")) == kind:
		hint["progress"] = progress
	if progress < int(ritual["progress_frames"]):
		return false
	if consume.is_valid() and not bool(consume.call()):
		record["ritual_progress"] = maxi(0, int(ritual["progress_frames"]) - RITUAL_CHECK_INTERVAL)
		return false
	record["ritual_completed"] = true
	record["ritual_region_index"] = region_index
	record["ritual_progress"] = int(ritual["progress_frames"])
	return true

func _clear_boss_pocket(center_x: float, center_y: float, width: int, height: int) -> void:
	var half_width: int = ceili(float(width) * 0.5) + 2
	var half_height: int = ceili(float(height) * 0.5) + 2
	for y: int in range(floori(center_y - half_height), ceili(center_y + half_height) + 1):
		for x: int in range(floori(center_x - half_width), ceili(center_x + half_width) + 1):
			var material: int = world.get_cell(x, y)
			if material != GameData.LAVA and material != GameData.WATER:
				world.set_cell(x, y, GameData.AIR, 0, {"silent": true, "reason": "boss-arena"})

func _spawn_boss(kind: String, options: Dictionary = {}) -> Dictionary:
	var definition: Dictionary = BossData.definition(kind)
	var bosses: Array = state.entities["bosses"]
	if definition.is_empty() or not bosses.is_empty():
		return {}
	var origin: Vector2i = _camera_origin()
	var region_index: int = int(options.get("region_index", floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)))
	var home_x: float = float(options.get("home_x", float(state.player["x"]) + (20.0 if noise.random_at(region_index, state.frame, 8101) > 0.5 else -20.0)))
	var surface: Dictionary = world.surface_at(home_x)
	var ground_y: float = float(options.get("ground_y", surface["ground"]))
	var water_y: float = float(options.get("water_y", surface["water"]))
	var home_y: float = float(options.get("home_y", water_y - float(definition["height"]) * 0.35 if bool(surface["ocean"]) else ground_y - float(definition["height"]) * 0.5 - 1.0))
	match kind:
		BossData.CALDERA_TYRANT: home_y = maxf(origin.y + 10.0, ground_y - float(GameConfig.CALDERA_BOSS["hover_height"]))
		BossData.SEA_SERPENT: home_y = water_y - float(GameConfig.SEA_SERPENT["hover_above_water"])
		BossData.BOG_LEVIATHAN: home_y = minf(ground_y - 4.0, water_y - 4.0)
		BossData.MYCELIAL_MONARCH, BossData.CRYSTAL_BURROWER, BossData.WORLD_EATER: home_y = float(options.get("home_y", float(state.player["y"]) - 3.0))
		BossData.MAGMA_BEHEMOTH: home_y = float(options.get("home_y", float(state.player["y"]) - 6.0))
		BossData.DROWNED_FLEET: home_y = water_y - 5.0
		BossData.SKY_JELLYFISH: home_y = maxf(origin.y + 18.0, water_y - 24.0)
		BossData.STORM_ROC, BossData.CANOPY_WYRM: home_y = maxf(origin.y + 15.0, ground_y - 18.0)
	var x: float = home_x
	var y: float = home_y
	var phase: String = "fight"
	var entry_direction: int = 1
	var entry: String = String(options.get("entry", definition["entry"]))
	match entry:
		"above":
			x = home_x + (noise.random_at(region_index, 91, 8201) - 0.5) * 20.0
			y = origin.y - 18.0
			phase = "arrival"
		"below_water":
			x = home_x
			y = water_y + (float(GameConfig.SEA_SERPENT["emerge_depth"]) if kind == BossData.SEA_SERPENT else 22.0)
			phase = "emerge"
		"below_ground", "assemble":
			x = home_x
			y = home_y + (13.0 if entry == "assemble" else 20.0)
			phase = "assemble" if entry == "assemble" else "emerge"
		"side":
			entry_direction = 1 if noise.random_at(region_index, state.frame, 8202) > 0.5 else -1
			x = origin.x - 32.0 if entry_direction > 0 else origin.x + GameConfig.WORLD_WIDTH + 32.0
			y = home_y
			phase = "arrival"
		"shadow":
			x = float(state.player["x"]) + (14.0 if noise.random_at(region_index, state.frame, 8203) > 0.5 else -14.0)
			y = float(state.player["y"]) - float(definition["height"]) * 0.5
	if [BossData.MYCELIAL_MONARCH, BossData.CRYSTAL_BURROWER, BossData.MAGMA_BEHEMOTH, BossData.WORLD_EATER].has(kind):
		_clear_boss_pocket(home_x, home_y, int(definition["width"]), int(definition["height"]))
	var boss: Dictionary = {
		"kind": kind, "name": definition["name"], "region_index": region_index,
		"x": roundf(x), "y": roundf(y), "vx": 0.0, "vy": 0.0, "home_x": roundf(home_x), "home_y": roundf(home_y),
		"ground_y": roundf(ground_y), "water_y": roundf(water_y), "width": int(definition["width"]), "height": int(definition["height"]),
		"hp": float(definition["max_health"]), "max_hp": float(definition["max_health"]), "contact_damage": float(definition["contact_damage"]),
		"reward": int(definition["reward"]), "bar_back": definition["bar_back"], "bar_fill": definition["bar_fill"], "bar_highlight": definition["bar_highlight"],
		"phase": phase, "entry": entry, "entry_direction": entry_direction, "flap": 0.0, "hit": 0, "attack_timer": 48, "special_timer": 0,
		"phase_offset": floori(noise.random_at(region_index, 92, 8204) * 9999.0),
	}
	bosses.append(boss)
	state.ui["boss_ritual"] = null
	var record: Dictionary = encounter(kind)
	record["spawned"] = true
	record["region_index"] = region_index
	if kind == BossData.CALDERA_TYRANT: state.world["boss_spawned"] = true
	if kind == BossData.SEA_SERPENT: state.world["sea_serpent_spawned"] = true
	if bool(options.get("announce", true)): state.show_message(String(definition["message"]), 3400)
	return boss

func _consume_loot(id: String, count: int) -> bool:
	return state.inventory_remove_loot(id, count)

func _consume_material(id: int, count: int) -> bool:
	return state.inventory_remove_material(id, count)

func _consume_fish() -> bool:
	if state.inventory_loot_count("fish") > 0:
		return state.inventory_remove_loot("fish", 1)
	return state.inventory_remove_loot("cooked_fish", 1)

func _spawn_caldera_if_ready() -> bool:
	var record: Dictionary = encounter(BossData.CALDERA_TYRANT)
	if bool(state.world["boss_spawned"]) or bool(state.world["boss_defeated"]) or bool(record["spawned"]) or bool(record["defeated"]): return false
	if int(state.world["camera"]["chunk_y"]) != 0: return false
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	var descriptor: Dictionary = {}
	var nearest: float = INF
	for offset: int in range(-1, 2):
		var candidate: Dictionary = world.volcano_descriptor(region + offset)
		if candidate.is_empty(): continue
		var distance: float = absf(float(candidate["center"]) - float(state.player["x"]))
		if distance < nearest and distance <= 80.0:
			nearest = distance
			descriptor = candidate
	if descriptor.is_empty() or world.biome_id_at(float(state.player["x"])) != GameData.VOLCANO: return false
	var hot_count: int = _count_nearby_materials([GameData.LAVA, GameData.FIRE], 20, 15, 2)
	if not _advance_ritual(BossData.CALDERA_TYRANT, true, nearest <= 42.0 and hot_count >= 8, int(descriptor["region_index"]), "CRATER HEAT %d/8" % mini(8, hot_count)): return false
	state.world["first_volcano_region_index"] = int(descriptor["region_index"])
	var surface: Dictionary = world.surface_at(float(descriptor["center"]))
	return not _spawn_boss(BossData.CALDERA_TYRANT, {"region_index": int(descriptor["region_index"]), "home_x": roundf(float(descriptor["center"])), "ground_y": surface["ground"], "entry": "above"}).is_empty()

func _spawn_sea_serpent_if_ready() -> bool:
	var record: Dictionary = encounter(BossData.SEA_SERPENT)
	if bool(state.world["sea_serpent_spawned"]) or bool(state.world["sea_serpent_defeated"]) or bool(record["spawned"]) or bool(record["defeated"]): return false
	if int(state.world["camera"]["chunk_y"]) != 0: return false
	var surface: Dictionary = world.surface_at(float(state.player["x"]))
	if world.biome_id_at(float(state.player["x"])) != GameData.OCEAN or not bool(surface["ocean"]): return false
	var fish_count: int = state.inventory_loot_count("fish") + state.inventory_loot_count("cooked_fish")
	var deep: bool = int(surface["ground"]) - int(surface["water"]) >= 15 and _player_touches([GameData.WATER])
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	if not _advance_ritual(BossData.SEA_SERPENT, true, deep and fish_count >= 1, region, "FISH %d/1  ENTER DEEP WATER" % mini(1, fish_count), _consume_fish): return false
	state.world["first_ocean_region_index"] = region
	return not _spawn_boss(BossData.SEA_SERPENT, {"region_index": region, "home_x": roundf(float(state.player["x"])), "ground_y": surface["ground"], "water_y": surface["water"], "entry": "below_water"}).is_empty()

func _spawn_underground() -> bool:
	if int(state.world["camera"]["chunk_y"]) <= 0: return false
	var surface: Dictionary = world.surface_at(float(state.player["x"]))
	var depth: float = float(state.player["y"]) - float(surface["ground"])
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	var underground: int = world.underground_biome_id_at(roundi(float(state.player["x"])), roundi(float(state.player["y"]) - 2.0))
	var biome: int = world.biome_id_at(float(state.player["x"]))
	if underground == 1 and not bool(encounter(BossData.MYCELIAL_MONARCH)["spawned"]):
		var roots: int = _count_nearby_materials([GameData.MYCELIUM, GameData.MUSHROOM_STEM, GameData.MUSHROOM_CAP], 22, 16, 2)
		var fire: int = _count_nearby_materials([GameData.FIRE], 22, 16, 1)
		if _advance_ritual(BossData.MYCELIAL_MONARCH, true, roots >= 16 and fire >= 3, region, "ROOTS %d/16  FIRE %d/3" % [mini(16, roots), mini(3, fire)]):
			return not _spawn_boss(BossData.MYCELIAL_MONARCH, {"region_index": region, "home_x": float(state.player["x"]) + 18.0, "home_y": float(state.player["y"]) - 4.0, "entry": "rooted"}).is_empty()
		return false
	if biome == GameData.VOLCANO and depth > 38.0 and not bool(encounter(BossData.MAGMA_BEHEMOTH)["spawned"]):
		var lava: int = _count_nearby_materials([GameData.LAVA], 24, 17, 2)
		var steam: int = _count_nearby_materials([GameData.STEAM], 24, 17, 1)
		if _advance_ritual(BossData.MAGMA_BEHEMOTH, true, depth > 48.0 and lava >= 5 and steam >= 2, region, "LAVA %d/5  STEAM %d/2" % [mini(5, lava), mini(2, steam)]):
			return not _spawn_boss(BossData.MAGMA_BEHEMOTH, {"region_index": region, "home_x": float(state.player["x"]) + 20.0, "home_y": float(state.player["y"]) - 6.0, "entry": "below_ground"}).is_empty()
		return false
	if depth > 42.0 and not bool(encounter(BossData.CRYSTAL_BURROWER)["spawned"]):
		var crystal: int = _count_nearby_materials([GameData.CRYSTAL], 24, 17, 2)
		var fragments: int = state.inventory_loot_count("crystal_fragment")
		var consume: Callable = func() -> bool: return _consume_loot("crystal_fragment", 5)
		if _advance_ritual(BossData.CRYSTAL_BURROWER, true, depth > 58.0 and crystal >= 5 and fragments >= 5, region, "VEIN %d/5  FRAGMENTS %d/5" % [mini(5, crystal), mini(5, fragments)], consume):
			return not _spawn_boss(BossData.CRYSTAL_BURROWER, {"region_index": region, "home_x": float(state.player["x"]) + 18.0, "home_y": float(state.player["y"]) - 4.0, "entry": "side"}).is_empty()
	return false

func _spawn_surface() -> bool:
	if int(state.world["camera"]["chunk_y"]) != 0: return false
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	var biome: int = world.biome_id_at(float(state.player["x"]))
	var surface: Dictionary = world.surface_at(float(state.player["x"]))
	if float(state.player["y"]) > float(surface["ground"]) + 12.0: return false
	if biome == GameData.SNOW_PEAKS:
		var frost: Dictionary = encounter(BossData.FROST_COLOSSUS)
		if not bool(frost["spawned"]) and not bool(frost["defeated"]):
			var snow: int = int((state.inventory["counts"] as Dictionary).get(GameData.SNOW, 0))
			var snowy: bool = _weather_is(["snow", "blizzard"])
			var consume_snow: Callable = func() -> bool: return _consume_material(GameData.SNOW, 12)
			if _advance_ritual(BossData.FROST_COLOSSUS, true, snow >= 12 and snowy, region, "SNOW %d/12  WAIT FOR SNOWFALL" % mini(12, snow), consume_snow):
				return not _spawn_boss(BossData.FROST_COLOSSUS, {"region_index": region, "home_x": float(state.player["x"]) + 22.0, "entry": "assemble"}).is_empty()
			return false
		var sky: Dictionary = encounter(BossData.SKY_JELLYFISH)
		if bool(frost["defeated"]) and not bool(sky["spawned"]) and not bool(sky["defeated"]):
			var glands: int = state.inventory_loot_count("eel_gland")
			var high: bool = float(state.player["y"]) <= float(surface["ground"]) - 18.0
			var storm: bool = _weather_is(["blizzard", "thunderstorm"])
			var consume_glands: Callable = func() -> bool: return _consume_loot("eel_gland", 2)
			if _advance_ritual(BossData.SKY_JELLYFISH, true, glands >= 2 and high and storm, region, "GLANDS %d/2  CLIMB INTO THE STORM" % mini(2, glands), consume_glands):
				return not _spawn_boss(BossData.SKY_JELLYFISH, {"region_index": region, "home_x": float(state.player["x"]) + 18.0, "entry": "above"}).is_empty()
		return false
	if biome == GameData.SWAMP and not bool(encounter(BossData.BOG_LEVIATHAN)["spawned"]) and not bool(encounter(BossData.BOG_LEVIATHAN)["defeated"]):
		var venom: int = state.inventory_loot_count("venom_sac")
		var wet: bool = _player_touches([GameData.MUD, GameData.WATER])
		var dark_or_wet: bool = not bool(time_system.get_time()["is_day"]) or _weather_is(["rain", "thunderstorm", "fog"])
		var consume_venom: Callable = func() -> bool: return _consume_loot("venom_sac", 3)
		if _advance_ritual(BossData.BOG_LEVIATHAN, true, venom >= 3 and wet and dark_or_wet, region, "VENOM %d/3  STAND IN WET MIRE" % mini(3, venom), consume_venom):
			return not _spawn_boss(BossData.BOG_LEVIATHAN, {"region_index": region, "home_x": float(state.player["x"]) + 20.0, "entry": "below_ground"}).is_empty()
		return false
	if biome == GameData.BAMBOO_GROVE and not bool(encounter(BossData.BAMBOO_WAR_MACHINE)["spawned"]) and not bool(encounter(BossData.BAMBOO_WAR_MACHINE)["defeated"]):
		var stored: int = int((state.inventory["counts"] as Dictionary).get(GameData.BAMBOO, 0))
		var bamboo: int = _count_nearby_materials([GameData.BAMBOO], 22, 15, 2)
		var fire: int = _count_nearby_materials([GameData.FIRE], 22, 15, 1)
		var consume_bamboo: Callable = func() -> bool: return _consume_material(GameData.BAMBOO, 8)
		if _advance_ritual(BossData.BAMBOO_WAR_MACHINE, true, stored >= 8 and bamboo >= 6 and fire >= 1, region, "PACK %d/8  GROVE %d/6  FIRE %d/1" % [mini(8, stored), mini(6, bamboo), mini(1, fire)], consume_bamboo):
			return not _spawn_boss(BossData.BAMBOO_WAR_MACHINE, {"region_index": region, "home_x": float(state.player["x"]) + 22.0, "entry": "above"}).is_empty()
		return false
	if biome == GameData.GIANT_FOREST and not bool(encounter(BossData.CANOPY_WYRM)["spawned"]) and not bool(encounter(BossData.CANOPY_WYRM)["defeated"]):
		var feathers: int = state.inventory_loot_count("bright_feather")
		var high: bool = float(state.player["y"]) <= float(surface["ground"]) - 18.0
		var wind: bool = absf(float(state.weather.get("wind_x", 0.0))) >= 0.22 or _weather_is(["breeze", "thunderstorm"])
		var consume_feathers: Callable = func() -> bool: return _consume_loot("bright_feather", 2)
		if _advance_ritual(BossData.CANOPY_WYRM, true, feathers >= 2 and high and wind, region, "FEATHERS %d/2  REACH THE WINDY CANOPY" % mini(2, feathers), consume_feathers):
			return not _spawn_boss(BossData.CANOPY_WYRM, {"region_index": region, "home_x": float(state.player["x"]) + 20.0, "entry": "above"}).is_empty()
		return false
	if biome == GameData.PLAINS and not bool(encounter(BossData.STORM_ROC)["spawned"]) and not bool(encounter(BossData.STORM_ROC)["defeated"]):
		var storm: bool = _weather_is(["thunderstorm"])
		var exposed: bool = _uncovered_above(28)
		if _advance_ritual(BossData.STORM_ROC, true, storm and exposed, region, "THUNDER %s  SKY %s" % ["READY" if storm else "WAIT", "OPEN" if exposed else "BLOCKED"]):
			return not _spawn_boss(BossData.STORM_ROC, {"region_index": region, "home_x": float(state.player["x"]) + 22.0, "entry": "above"}).is_empty()
		return false
	if biome == GameData.OCEAN:
		var fleet: Dictionary = encounter(BossData.DROWNED_FLEET)
		if bool(encounter(BossData.SEA_SERPENT)["defeated"]) and not bool(fleet["spawned"]) and not bool(fleet["defeated"]):
			var pearls: int = state.inventory_loot_count("pearl")
			var storm: bool = _weather_is(["ocean_storm"])
			var consume_pearls: Callable = func() -> bool: return _consume_loot("pearl", 3)
			if _advance_ritual(BossData.DROWNED_FLEET, true, pearls >= 3 and storm and _uncovered_above(18), region, "PEARLS %d/3  WAIT FOR OCEAN STORM" % mini(3, pearls), consume_pearls):
				return not _spawn_boss(BossData.DROWNED_FLEET, {"region_index": region, "home_x": float(state.player["x"]) + 18.0, "ground_y": surface["ground"], "water_y": surface["water"], "entry": "below_water"}).is_empty()
			return false
		var sky: Dictionary = encounter(BossData.SKY_JELLYFISH)
		if bool(fleet["defeated"]) and not bool(sky["spawned"]) and not bool(sky["defeated"]):
			var glands: int = state.inventory_loot_count("eel_gland")
			var storm: bool = _weather_is(["ocean_storm", "thunderstorm"])
			var consume_glands: Callable = func() -> bool: return _consume_loot("eel_gland", 2)
			if _advance_ritual(BossData.SKY_JELLYFISH, true, glands >= 2 and storm and _uncovered_above(18), region, "GLANDS %d/2  STAND UNDER THE STORM" % mini(2, glands), consume_glands):
				return not _spawn_boss(BossData.SKY_JELLYFISH, {"region_index": region, "home_x": float(state.player["x"]) + 18.0, "ground_y": surface["ground"], "water_y": surface["water"], "entry": "above"}).is_empty()
	return false

func _spawn_night() -> bool:
	if int(state.world["camera"]["chunk_y"]) != 0: return false
	var time: Dictionary = time_system.get_time()
	var record: Dictionary = encounter(BossData.MOON_STALKER)
	if bool(record["spawned"]) or bool(record["defeated"]) or bool(time["is_day"]) or float(time["night_strength"]) < 0.62: return false
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	var fire: int = _count_nearby_materials([GameData.FIRE], 18, 12, 1)
	var still: bool = absf(float(state.player["vx"])) < 0.04 and absf(float(state.player["vy"])) < 0.04
	if not _advance_ritual(BossData.MOON_STALKER, true, float(time["night_strength"]) > 0.75 and fire == 0 and still, region, "DARK %s  STILL %s" % ["YES" if fire == 0 else "NO", "YES" if still else "NO"]): return false
	return not _spawn_boss(BossData.MOON_STALKER, {"region_index": region, "entry": "shadow"}).is_empty()

func _spawn_world_eater() -> bool:
	var record: Dictionary = encounter(BossData.WORLD_EATER)
	if bool(record["spawned"]) or bool(record["defeated"]) or int(state.world["defeated_boss_count"]) < 5: return false
	var surface: Dictionary = world.surface_at(float(state.player["x"]))
	var depth: float = float(state.player["y"]) - float(surface["ground"])
	var travelled: float = absf(float(state.player["x"]) - float(state.world["travel_origin_x"]))
	var present: bool = int(state.world["camera"]["chunk_y"]) > 0 and depth > 28.0
	if not present: return false
	var region: int = floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE)
	if not _advance_ritual(BossData.WORLD_EATER, present, depth > 48.0 and travelled >= GameData.BIOME_REGION_SIZE * 1.5, region, "DEPTH %d/48  TRAVEL %s" % [mini(48, maxi(0, roundi(depth))), "YES" if travelled >= GameData.BIOME_REGION_SIZE * 1.5 else "NO"]): return false
	return not _spawn_boss(BossData.WORLD_EATER, {"region_index": region, "home_x": float(state.player["x"]) + 22.0, "home_y": float(state.player["y"]) - 4.0, "entry": "side"}).is_empty()

func _try_spawn_encounter() -> void:
	if state.frame % RITUAL_CHECK_INTERVAL != 0: return
	state.ui["boss_ritual"] = null
	if not (state.entities["bosses"] as Array).is_empty() or state.frame < int(state.world["boss_cooldown_until"]): return
	if _spawn_caldera_if_ready(): return
	if _spawn_sea_serpent_if_ready(): return
	if _spawn_underground(): return
	if _spawn_surface(): return
	if _spawn_night(): return
	_spawn_world_eater()

func _attack_delay(kind: String) -> int:
	var ranges: Dictionary = {
		BossData.CALDERA_TYRANT: [78,132], BossData.SEA_SERPENT: [72,118], BossData.FROST_COLOSSUS: [78,118], BossData.BOG_LEVIATHAN: [70,108],
		BossData.MYCELIAL_MONARCH: [64,102], BossData.BAMBOO_WAR_MACHINE: [58,92], BossData.CANOPY_WYRM: [68,104], BossData.CRYSTAL_BURROWER: [64,96],
		BossData.MAGMA_BEHEMOTH: [72,108], BossData.STORM_ROC: [82,118], BossData.MOON_STALKER: [58,86], BossData.DROWNED_FLEET: [68,104],
		BossData.SKY_JELLYFISH: [62,96], BossData.WORLD_EATER: [54,82],
	}
	var range_values: Array = ranges.get(kind, [70,110])
	return int(range_values[0]) + floori(noise.random_at(state.frame, kind.length(), 8301) * float(int(range_values[1]) - int(range_values[0])))

func _aimed_angle(boss: Dictionary, offset: float = 0.0) -> float:
	return atan2(float(state.player["y"]) - 2.0 - float(boss["y"]), float(state.player["x"]) - float(boss["x"])) + offset

func _push_projectile(boss: Dictionary, kind: String, angle: float, speed: float, options: Dictionary = {}) -> void:
	(state.entities["boss_projectiles"] as Array).append({"owner_kind": boss["kind"], "kind": kind, "x": roundf(float(boss["x"]) + float(options.get("offset_x", 0.0))), "y": roundf(float(boss["y"]) + float(options.get("offset_y", 0.0))), "vx": cos(angle) * speed + float(options.get("extra_vx", 0.0)), "vy": sin(angle) * speed + float(options.get("extra_vy", 0.0)), "gravity": float(options.get("gravity", 0.035)), "life": int(options.get("life", 180)), "delay": int(options.get("delay", 0)), "target_x": options.get("target_x", null), "target_y": options.get("target_y", null), "phase": 0})

func _attack_boss(boss: Dictionary) -> void:
	var kind: String = String(boss["kind"])
	if kind == BossData.CALDERA_TYRANT:
		var count: int = int(GameConfig.CALDERA_BOSS["fireball_burst_count"])
		var base: float = _aimed_angle(boss)
		for index: int in range(count):
			var middle: float = float(count - 1) * 0.5
			var angle: float = base + (index - middle) * float(GameConfig.CALDERA_BOSS["fireball_spread"])
			(state.entities["boss_fireballs"] as Array).append({"x": roundf(float(boss["x"]) + (index - middle) * 2.0), "y": roundf(float(boss["y"]) + 2.0), "vx": cos(angle) * float(GameConfig.CALDERA_BOSS["fireball_speed"]), "vy": maxf(0.35, sin(angle) * float(GameConfig.CALDERA_BOSS["fireball_speed"])), "life": int(GameConfig.CALDERA_BOSS["fireball_life_frames"])})
	elif kind == BossData.SEA_SERPENT:
		var count: int = int(GameConfig.SEA_SERPENT["projectile_burst_count"])
		var base: float = _aimed_angle(boss)
		for index: int in range(count):
			var middle: float = float(count - 1) * 0.5
			var angle: float = base + (index - middle) * float(GameConfig.SEA_SERPENT["projectile_spread"])
			(state.entities["serpent_projectiles"] as Array).append({"kind": "water_burst", "x": roundf(float(boss["x"]) + (index - middle) * 1.5), "y": roundf(float(boss["y"]) - 2.0), "vx": cos(angle) * float(GameConfig.SEA_SERPENT["projectile_speed"]), "vy": sin(angle) * float(GameConfig.SEA_SERPENT["projectile_speed"]), "life": int(GameConfig.SEA_SERPENT["projectile_life_frames"])})
	else:
		var projectile: String = String(BossData.definition(kind).get("projectile", ""))
		match projectile:
			"ice_boulder":
				for offset: float in [-0.16, 0.16]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.35, {"gravity": 0.045, "life": 190})
			"mud_glob":
				for offset: float in [-0.22, 0.0, 0.22]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.25, {"gravity": 0.04, "life": 180})
			"spore":
				for offset: float in [-0.32, -0.16, 0.0, 0.16, 0.32]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.05, {"gravity": -0.004, "life": 210})
			"bamboo_shard":
				for offset: float in [-0.12, 0.0, 0.12]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 2.15, {"gravity": 0.012, "life": 150})
			"branch":
				for offset: float in [-0.18, 0.18]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.45, {"gravity": 0.06, "life": 170})
			"crystal_shard":
				for offset: float in [-0.24, -0.08, 0.08, 0.24]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 2.0, {"gravity": 0.0, "life": 160})
			"magma_rock":
				for offset: float in [-0.17, 0.17]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.3, {"gravity": 0.055, "life": 190})
			"lightning_marker":
				(state.entities["boss_projectiles"] as Array).append({"owner_kind": kind, "kind": projectile, "x": float(state.player["x"]), "y": _camera_origin().y + 1.0, "vx": 0.0, "vy": 0.0, "gravity": 0.0, "life": 52, "delay": 36, "target_x": float(state.player["x"]), "target_y": float(state.player["y"]), "phase": 0})
			"shadow_bolt":
				for offset: float in [-0.16, 0.16]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.55, {"gravity": 0.0, "life": 190})
			"cannonball":
				for offset: float in [-0.2, 0.2]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.5, {"gravity": 0.07, "life": 200, "offset_x": offset * 18.0})
			"electric_orb":
				for offset: float in [-0.2, 0.0, 0.2]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.25, {"gravity": 0.0, "life": 210})
			"world_spit":
				for offset: float in [-0.12, 0.12]: _push_projectile(boss, projectile, _aimed_angle(boss, offset), 1.7, {"gravity": 0.035, "life": 190})
	boss["attack_timer"] = _attack_delay(kind)

func _advance_entry(boss: Dictionary) -> bool:
	if String(boss["phase"]) == "fight": return true
	boss["flap"] = float(boss["flap"]) + 0.55
	var entry: String = String(boss["entry"])
	if entry == "above":
		boss["x"] = float(boss["x"]) + (float(boss["home_x"]) - float(boss["x"])) * 0.075
		boss["y"] = float(boss["y"]) + maxf(0.34, (float(boss["home_y"]) - float(boss["y"])) * 0.075)
		if float(boss["y"]) >= float(boss["home_y"]) - 0.75: boss["y"] = boss["home_y"]; boss["phase"] = "fight"
	elif entry == "side":
		boss["x"] = float(boss["x"]) + (float(boss["home_x"]) - float(boss["x"])) * 0.07
		boss["y"] = float(boss["y"]) + (float(boss["home_y"]) - float(boss["y"])) * 0.08
		if absf(float(boss["x"]) - float(boss["home_x"])) < 1.0: boss["x"] = boss["home_x"]; boss["phase"] = "fight"
	else:
		boss["y"] = float(boss["y"]) + (float(boss["home_y"]) - float(boss["y"])) * 0.075
		if float(boss["y"]) <= float(boss["home_y"]) + 0.75: boss["y"] = boss["home_y"]; boss["phase"] = "fight"
	if String(boss["phase"]) == "fight": boss["attack_timer"] = 45
	return String(boss["phase"]) == "fight"

func _hover(boss: Dictionary, x_amplitude: float, y_amplitude: float, x_speed: float = 0.018, y_speed: float = 0.045) -> void:
	var desired_x: float = float(boss["home_x"]) + sin((state.frame + int(boss["phase_offset"])) * x_speed) * x_amplitude
	var desired_y: float = float(boss["home_y"]) + sin((state.frame + int(boss["phase_offset"])) * y_speed) * y_amplitude
	boss["vx"] = (float(boss["vx"]) + (desired_x - float(boss["x"])) * 0.04) * 0.9
	boss["vy"] = (float(boss["vy"]) + (desired_y - float(boss["y"])) * 0.05) * 0.88
	boss["x"] = float(boss["x"]) + float(boss["vx"])
	boss["y"] = float(boss["y"]) + float(boss["vy"])

func _ground_motion(boss: Dictionary, speed: float = 0.035, motion_range: float = 24.0) -> void:
	var target_x: float = clampf(float(state.player["x"]), float(boss["home_x"]) - motion_range, float(boss["home_x"]) + motion_range)
	boss["vx"] = (float(boss["vx"]) + (target_x - float(boss["x"])) * speed) * 0.83
	boss["x"] = float(boss["x"]) + float(boss["vx"])
	var surface: Dictionary = world.surface_at(float(boss["x"]))
	boss["ground_y"] = surface["ground"]
	boss["home_y"] = float(surface["ground"]) - float(boss["height"]) * 0.5 - 1.0
	boss["y"] = float(boss["y"]) + (float(boss["home_y"]) - float(boss["y"])) * 0.28

func _dig_terrain(boss: Dictionary, radius: int) -> void:
	var center_x: int = roundi(float(boss["x"]) + signf(float(boss["vx"]) if absf(float(boss["vx"])) > 0.001 else float(boss["entry_direction"])) * float(boss["width"]) * 0.35)
	var center_y: int = roundi(float(boss["y"]))
	for y: int in range(center_y - radius, center_y + radius + 1):
		for x: int in range(center_x - radius, center_x + radius + 1):
			if Vector2i(x - center_x, y - center_y).length_squared() <= radius * radius and world.is_solid(world.get_cell(x, y)):
				world.set_cell(x, y, GameData.AIR, 0, {"reason": "boss-tunnel"})

func _update_boss_motion(boss: Dictionary) -> void:
	match String(boss["kind"]):
		BossData.CALDERA_TYRANT: _hover(boss, float(GameConfig.CALDERA_BOSS["wander_x"]), float(GameConfig.CALDERA_BOSS["wander_y"]), 0.018, 0.05)
		BossData.SEA_SERPENT: _hover(boss, float(GameConfig.SEA_SERPENT["wander_x"]), float(GameConfig.SEA_SERPENT["wander_y"]), 0.015, 0.038)
		BossData.FROST_COLOSSUS: _ground_motion(boss, 0.055 if float(boss["hp"]) < float(boss["max_hp"]) * 0.35 else 0.035, 26.0)
		BossData.BOG_LEVIATHAN:
			boss["special_timer"] = int(boss["special_timer"]) - 1
			if int(boss["special_timer"]) > 0: boss["y"] = float(boss["y"]) + (float(boss["water_y"]) + 10.0 - float(boss["y"])) * 0.13
			else:
				if int(boss["special_timer"]) == 0:
					boss["x"] = clampf(float(state.player["x"]) + (noise.random_at(state.frame, int(boss["region_index"]), 8501) - 0.5) * 16.0, float(boss["home_x"]) - 24.0, float(boss["home_x"]) + 24.0)
					boss["y"] = float(boss["water_y"]) + 9.0
					boss["special_timer"] = -1
				boss["y"] = float(boss["y"]) + (float(boss["home_y"]) - float(boss["y"])) * 0.13
				boss["x"] = float(boss["x"]) + sin((state.frame + int(boss["phase_offset"])) * 0.03) * 0.14
				if int(boss["attack_timer"]) < 12 and int(boss["special_timer"]) < 0: boss["special_timer"] = 42
		BossData.MYCELIAL_MONARCH:
			boss["y"] = float(boss["home_y"]) + sin((state.frame + int(boss["phase_offset"])) * 0.04) * 1.2
			boss["x"] = boss["home_x"]
		BossData.BAMBOO_WAR_MACHINE:
			_ground_motion(boss, 0.044, 28.0)
			if state.frame % 60 == 0 and float(boss["hp"]) < float(boss["max_hp"]):
				for y: int in range(floori(float(boss["y"]) - 10.0), ceili(float(boss["y"]) + 10.0) + 1):
					var consumed: bool = false
					for x: int in range(floori(float(boss["x"]) - 14.0), ceili(float(boss["x"]) + 14.0) + 1):
						if world.get_cell(x, y) == GameData.BAMBOO:
							world.set_cell(x, y, GameData.AIR, 0, {"reason": "boss-repair"}); boss["hp"] = minf(float(boss["max_hp"]), float(boss["hp"]) + 7.0); consumed = true; break
					if consumed: break
		BossData.CANOPY_WYRM: _hover(boss, 27.0, 7.0, 0.021, 0.052)
		BossData.CRYSTAL_BURROWER:
			var direction: Vector2 = Vector2(float(state.player["x"]) - float(boss["x"]), float(state.player["y"]) - 2.0 - float(boss["y"])).normalized()
			boss["vx"] = (float(boss["vx"]) + direction.x * 0.045) * 0.93; boss["vy"] = (float(boss["vy"]) + direction.y * 0.035) * 0.93
			boss["x"] = float(boss["x"]) + float(boss["vx"]); boss["y"] = float(boss["y"]) + float(boss["vy"]); _dig_terrain(boss, 2)
		BossData.MAGMA_BEHEMOTH: _ground_motion(boss, 0.028, 20.0); boss["y"] = float(boss["y"]) + sin((state.frame + int(boss["phase_offset"])) * 0.04) * 0.08
		BossData.STORM_ROC: _hover(boss, 30.0, 8.0, 0.025, 0.055)
		BossData.MOON_STALKER:
			if bool(time_system.get_time()["is_day"]): boss["hp"] = float(boss["hp"]) - 0.42
			boss["special_timer"] = int(boss["special_timer"]) - 1
			if int(boss["special_timer"]) <= 0:
				var side: int = 1 if noise.random_at(state.frame, int(boss["region_index"]), 8601) > 0.5 else -1
				boss["x"] = float(state.player["x"]) + side * (10.0 + floori(noise.random_at(state.frame, int(boss["region_index"]), 8602) * 12.0)); boss["y"] = float(state.player["y"]) - float(boss["height"]) * 0.5 - 1.0; boss["special_timer"] = 76
			boss["x"] = float(boss["x"]) + (float(state.player["x"]) - float(boss["x"])) * 0.012
		BossData.DROWNED_FLEET:
			boss["x"] = float(boss["home_x"]) + sin((state.frame + int(boss["phase_offset"])) * 0.012) * 5.0; boss["y"] = float(boss["home_y"]) + sin((state.frame + int(boss["phase_offset"])) * 0.045) * 1.2
		BossData.SKY_JELLYFISH: _hover(boss, 24.0, 9.0, 0.017, 0.043)
		BossData.WORLD_EATER:
			var desired: int = int(signf(float(state.player["x"]) - float(boss["x"]))) if absf(float(boss["x"]) - float(state.player["x"])) > 42.0 else int(boss["entry_direction"])
			boss["entry_direction"] = desired if desired != 0 else 1; boss["vx"] = (float(boss["vx"]) + int(boss["entry_direction"]) * 0.055) * 0.96; boss["vy"] = (float(boss["vy"]) + (float(state.player["y"]) - 3.0 - float(boss["y"])) * 0.006) * 0.94
			boss["x"] = float(boss["x"]) + float(boss["vx"]); boss["y"] = float(boss["y"]) + float(boss["vy"]); _dig_terrain(boss, 3)

func _apply_environment(boss: Dictionary) -> void:
	var samples: Array[int] = []
	for offset: Vector2 in [Vector2.ZERO, Vector2(-float(boss["width"]) * 0.25, 0.0), Vector2(float(boss["width"]) * 0.25, 0.0), Vector2(0.0, float(boss["height"]) * 0.25)]:
		samples.append(world.get_cell(floori(float(boss["x"]) + offset.x), floori(float(boss["y"]) + offset.y)))
	var fire_count: int = samples.count(GameData.FIRE); var lava_count: int = samples.count(GameData.LAVA); var water_count: int = samples.count(GameData.WATER); var steam_count: int = samples.count(GameData.STEAM)
	boss["hp"] = float(boss["hp"]) - fire_count * 0.16 - steam_count * float(GameConfig.STEAM["enemy_damage_per_frame"]) * 0.35
	if String(boss["kind"]) != BossData.MAGMA_BEHEMOTH: boss["hp"] = float(boss["hp"]) - lava_count * 0.28
	if String(boss["kind"]) == BossData.FROST_COLOSSUS: boss["hp"] = float(boss["hp"]) - fire_count * 0.42 - lava_count * 0.7
	if [BossData.MYCELIAL_MONARCH, BossData.BAMBOO_WAR_MACHINE, BossData.CANOPY_WYRM].has(String(boss["kind"])): boss["hp"] = float(boss["hp"]) - fire_count * 0.34
	if String(boss["kind"]) == BossData.MAGMA_BEHEMOTH:
		boss["hp"] = minf(float(boss["max_hp"]), float(boss["hp"]) + lava_count * 0.16)
		if water_count > 0: boss["hp"] = float(boss["hp"]) - water_count * 0.48

func _overlaps_player(boss: Dictionary) -> bool:
	var half_w: float = float(boss["width"]) * 0.5
	var half_h: float = float(boss["height"]) * 0.5
	var px: float = float(state.player["x"]); var py: float = float(state.player["y"]) - 2.0
	return absf(px - float(boss["x"])) <= half_w + float(state.player["width"]) * 0.5 and absf(py - float(boss["y"])) <= half_h + float(state.player["height"]) * 0.5

func _paint_circle(center_x: int, center_y: int, radius: int, callback: Callable) -> void:
	for y: int in range(center_y - radius, center_y + radius + 1):
		for x: int in range(center_x - radius, center_x + radius + 1):
			if Vector2i(x - center_x, y - center_y).length_squared() <= radius * radius: callback.call(x, y, world.get_cell(x, y))

func _impact_generic(projectile: Dictionary) -> void:
	var x: int = floori(float(projectile["x"])); var y: int = floori(float(projectile["y"])); var kind: String = String(projectile["kind"]); var radius: int = 2
	match kind:
		"ice_boulder": _paint_circle(x, y, 2, func(px: int, py: int, material: int) -> void: if [GameData.AIR, GameData.WATER, GameData.SMOKE, GameData.STEAM].has(material): world.set_cell(px, py, GameData.SNOW))
		"mud_glob": _paint_circle(x, y, 2, func(px: int, py: int, material: int) -> void: if [GameData.AIR, GameData.WATER, GameData.SMOKE, GameData.STEAM].has(material): world.set_cell(px, py, GameData.MUD))
		"spore":
			radius = 3; _paint_circle(x, y, 3, func(px: int, py: int, material: int) -> void: if [GameData.DIRT, GameData.GRASS].has(material): world.set_cell(px, py, GameData.MYCELIUM))
		"bamboo_shard": if world.get_cell(x, y) == GameData.AIR: world.set_cell(x, y, GameData.BAMBOO)
		"branch": if world.get_cell(x, y) == GameData.AIR: world.set_cell(x, y, GameData.WOOD)
		"crystal_shard": if world.get_cell(x, y) == GameData.AIR: world.set_cell(x, y, GameData.CRYSTAL)
		"magma_rock":
			radius = 3; _paint_circle(x, y, 3, func(px: int, py: int, material: int) -> void: if material == GameData.AIR or GameData.is_flammable(material): world.set_cell(px, py, GameData.FIRE, 80))
		"shadow_bolt": _paint_circle(x, y, 2, func(px: int, py: int, material: int) -> void: if material == GameData.AIR: world.set_cell(px, py, GameData.SMOKE, 55))
		"cannonball":
			radius = 4; _paint_circle(x, y, 3, func(px: int, py: int, material: int) -> void: if world.is_solid(material): world.set_cell(px, py, GameData.AIR))
		"electric_orb":
			radius = 3; _paint_circle(x, y, 3, func(px: int, py: int, material: int) -> void: if [GameData.WATER, GameData.AIR, GameData.SMOKE].has(material): world.set_cell(px, py, GameData.STEAM, int(GameConfig.STEAM["life_frames"])))
		"world_spit":
			radius = 4; _paint_circle(x, y, 3, func(px: int, py: int, material: int) -> void: if world.is_solid(material): world.set_cell(px, py, GameData.AIR))
	(state.entities["explosions"] as Array).append({"x": x, "y": y, "radius": radius, "frames": 10, "max_frames": 10, "kind": "boss_generic"})
	if _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, x, y) <= radius + 1.0:
		var damages: Dictionary = {"ice_boulder":6,"mud_glob":6,"spore":5,"bamboo_shard":7,"branch":7,"crystal_shard":8,"magma_rock":8,"shadow_bolt":7,"cannonball":10,"electric_orb":8,"world_spit":10}
		player_system.damage(float(damages.get(kind, 6)))

func _strike_lightning(projectile: Dictionary) -> void:
	var x: int = floori(float(projectile.get("target_x", projectile["x"]))); var origin: Vector2i = _camera_origin(); var impact_y: int = floori(float(projectile.get("target_y", state.player["y"])))
	for y: int in range(origin.y + 1, origin.y + GameConfig.WORLD_HEIGHT):
		if world.is_solid(world.get_cell(x, y)): impact_y = y; break
	for y: int in range(origin.y + 1, impact_y + 1):
		var material: int = world.get_cell(x, y)
		if material == GameData.WATER: world.set_cell(x, y, GameData.STEAM, int(GameConfig.STEAM["life_frames"]))
		elif material in [GameData.AIR, GameData.SMOKE]: world.set_cell(x, y, GameData.FIRE, 28)
	(state.entities["explosions"] as Array).append({"x": x, "y": impact_y, "radius": 5, "frames": 12, "max_frames": 12, "kind": "lightning"})
	if absf(float(state.player["x"]) - x) < 2.5: player_system.damage(10.0)

func _update_generic_projectiles() -> void:
	var projectiles: Array = state.entities["boss_projectiles"]
	for index: int in range(projectiles.size() - 1, -1, -1):
		var p: Dictionary = projectiles[index]; p["life"] = int(p["life"]) - 1
		if int(p["life"]) <= 0: projectiles.remove_at(index); continue
		if String(p["kind"]) == "lightning_marker":
			p["delay"] = int(p["delay"]) - 1; p["phase"] = int(p["phase"]) + 1
			if int(p["delay"]) <= 0: _strike_lightning(p); projectiles.remove_at(index)
			continue
		if String(p["kind"]) in ["shadow_bolt", "electric_orb"]:
			var direction: Vector2 = Vector2(float(state.player["x"]) - float(p["x"]), float(state.player["y"]) - 2.0 - float(p["y"])).normalized(); var strength: float = 0.018 if String(p["kind"]) == "shadow_bolt" else 0.012
			p["vx"] = (float(p["vx"]) + direction.x * strength) * 0.995; p["vy"] = (float(p["vy"]) + direction.y * strength) * 0.995
		p["vy"] = float(p["vy"]) + float(p.get("gravity", 0.0))
		var impacted: bool = false
		for _step: int in range(4):
			var next_x: float = float(p["x"]) + float(p["vx"]) / 4.0; var next_y: float = float(p["y"]) + float(p["vy"]) / 4.0
			if not world.is_active_world_position(next_x, next_y): impacted = true; break
			p["x"] = next_x; p["y"] = next_y
			var material: int = world.get_cell(floori(next_x), floori(next_y))
			if world.is_solid(material) or material in [GameData.WATER, GameData.LAVA] or _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, next_x, next_y) < 2.3: _impact_generic(p); impacted = true; break
		if impacted: projectiles.remove_at(index)

func _explode_fireball(fireball: Dictionary) -> void:
	var x: int = floori(float(fireball["x"])); var y: int = floori(float(fireball["y"])); var radius: int = int(GameConfig.CALDERA_BOSS["fireball_blast_radius"])
	_paint_circle(x, y, radius, func(px: int, py: int, material: int) -> void: if material == GameData.AIR or material == GameData.SMOKE or material == GameData.STEAM or GameData.is_flammable(material): world.set_cell(px, py, GameData.FIRE, int(GameConfig.CALDERA_BOSS["fire_life_max"])))
	(state.entities["explosions"] as Array).append({"x": x, "y": y, "radius": 5, "frames": 10, "max_frames": 10, "kind": "boss"})
	if _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, x, y) <= radius + 1.0: player_system.damage(6.0)

func _update_fireballs() -> void:
	var projectiles: Array = state.entities["boss_fireballs"]
	for index: int in range(projectiles.size() - 1, -1, -1):
		var p: Dictionary = projectiles[index]; p["life"] = int(p["life"]) - 1
		if int(p["life"]) <= 0: _explode_fireball(p); projectiles.remove_at(index); continue
		p["vy"] = float(p["vy"]) + float(GameConfig.CALDERA_BOSS["fireball_gravity"])
		var impact: bool = false
		for _step: int in range(4):
			p["x"] = float(p["x"]) + float(p["vx"]) / 4.0; p["y"] = float(p["y"]) + float(p["vy"]) / 4.0
			if not world.is_active_world_position(float(p["x"]), float(p["y"])): impact = true; break
			var material: int = world.get_cell(floori(float(p["x"])), floori(float(p["y"])))
			if world.is_solid(material) or material in [GameData.WATER, GameData.LAVA] or _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, float(p["x"]), float(p["y"])) < 2.4: _explode_fireball(p); impact = true; break
		if impact: projectiles.remove_at(index)

func _splash_serpent(projectile: Dictionary) -> void:
	var x: int = floori(float(projectile["x"])); var y: int = floori(float(projectile["y"])); var radius: int = int(GameConfig.SEA_SERPENT["splash_radius"])
	_paint_circle(x, y, radius, func(px: int, py: int, material: int) -> void: if material in [GameData.AIR, GameData.SMOKE, GameData.STEAM, GameData.FIRE, GameData.NAPALM]: world.set_cell(px, py, GameData.WATER))
	(state.entities["explosions"] as Array).append({"x": x, "y": y, "radius": radius + 2, "frames": 9, "max_frames": 9, "kind": "serpent"})
	if _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, x, y) <= radius + 1.0: player_system.damage(6.0)

func _update_serpent_projectiles() -> void:
	var projectiles: Array = state.entities["serpent_projectiles"]
	for index: int in range(projectiles.size() - 1, -1, -1):
		var p: Dictionary = projectiles[index]; p["life"] = int(p["life"]) - 1
		if int(p["life"]) <= 0: projectiles.remove_at(index); continue
		p["vy"] = float(p["vy"]) + float(GameConfig.SEA_SERPENT["projectile_gravity"])
		var impact: bool = false
		for _step: int in range(4):
			p["x"] = float(p["x"]) + float(p["vx"]) / 4.0; p["y"] = float(p["y"]) + float(p["vy"]) / 4.0
			if not world.is_active_world_position(float(p["x"]), float(p["y"])): impact = true; break
			var material: int = world.get_cell(floori(float(p["x"])), floori(float(p["y"])))
			if world.is_solid(material) or material in [GameData.WATER, GameData.LAVA] or _distance(float(state.player["x"]), float(state.player["y"]) - 2.0, float(p["x"]), float(p["y"])) < 2.4: _splash_serpent(p); impact = true; break
		if impact: projectiles.remove_at(index)

func _defeat_boss(boss: Dictionary, index: int) -> void:
	var definition: Dictionary = BossData.definition(String(boss["kind"])); var record: Dictionary = encounter(String(boss["kind"]))
	(state.entities["explosions"] as Array).append({"x": boss["x"], "y": boss["y"], "radius": 17 if String(boss["kind"]) == BossData.WORLD_EATER else 15 if String(boss["kind"]) == BossData.DROWNED_FLEET else 13, "frames": 22, "max_frames": 22, "kind": "boss_defeat", "color": boss["bar_highlight"]})
	if not bool(record["defeated"]): record["defeated"] = true; record["defeated_frame"] = state.frame; state.world["defeated_boss_count"] = int(state.world["defeated_boss_count"]) + 1; state.crystals += int(definition.get("reward", boss["reward"]))
	if String(boss["kind"]) == BossData.CALDERA_TYRANT: state.world["boss_defeated"] = true
	if String(boss["kind"]) == BossData.SEA_SERPENT: state.world["sea_serpent_defeated"] = true
	state.world["boss_cooldown_until"] = state.frame + 240
	(state.entities["boss_fireballs"] as Array).clear(); (state.entities["serpent_projectiles"] as Array).clear(); (state.entities["boss_projectiles"] as Array).clear(); (state.entities["bosses"] as Array).remove_at(index)
	state.show_message(String(definition.get("defeat_message", "%s is defeated!" % boss["name"])), 3800)

func _update_bosses() -> void:
	var bosses: Array = state.entities["bosses"]
	for index: int in range(bosses.size() - 1, -1, -1):
		var boss: Dictionary = bosses[index]
		if float(boss["hp"]) <= 0.0: _defeat_boss(boss, index); continue
		if int(boss["hit"]) > 0: boss["hit"] = int(boss["hit"]) - 1
		if _advance_entry(boss):
			boss["flap"] = float(boss["flap"]) + 0.55; _update_boss_motion(boss); boss["attack_timer"] = int(boss["attack_timer"]) - 1
			if int(boss["attack_timer"]) <= 0 and world.is_active_world_position(float(boss["x"]), float(boss["y"])): _attack_boss(boss)
		_apply_environment(boss)
		if _overlaps_player(boss): player_system.damage(float(boss["contact_damage"]))

func update() -> void:
	if String(state.world["dimension"]) != "earth":
		state.ui["boss_ritual"] = null; (state.entities["bosses"] as Array).clear(); (state.entities["boss_fireballs"] as Array).clear(); (state.entities["serpent_projectiles"] as Array).clear(); (state.entities["boss_projectiles"] as Array).clear(); return
	if (state.entities["bosses"] as Array).is_empty(): _try_spawn_encounter()
	_update_bosses(); _update_fireballs(); _update_serpent_projectiles(); _update_generic_projectiles()
	for key: String in ["bosses", "boss_fireballs", "serpent_projectiles", "boss_projectiles"]:
		for entity: Dictionary in state.entities[key]: entity["x"] = roundf(float(entity["x"])); entity["y"] = roundf(float(entity["y"]))

func spawn_boss_for_test(kind: String, overrides: Dictionary = {}) -> Dictionary:
	(state.entities["bosses"] as Array).clear(); (state.entities["boss_fireballs"] as Array).clear(); (state.entities["serpent_projectiles"] as Array).clear(); (state.entities["boss_projectiles"] as Array).clear()
	var definition: Dictionary = BossData.definition(kind)
	if definition.is_empty(): return {}
	var surface: Dictionary = world.surface_at(float(state.player["x"]) + 18.0)
	var default_home_y: float = float(state.player["y"]) - 4.0 if [BossData.MYCELIAL_MONARCH, BossData.CRYSTAL_BURROWER, BossData.MAGMA_BEHEMOTH, BossData.WORLD_EATER].has(kind) else float(surface["ground"]) - float(definition["height"]) * 0.5 - 1.0
	var options: Dictionary = {"region_index": floori(float(state.player["x"]) / GameData.BIOME_REGION_SIZE), "home_x": float(state.player["x"]) + 18.0, "home_y": default_home_y, "ground_y": surface["ground"], "water_y": surface["water"], "entry": definition["entry"], "announce": false}
	options.merge(overrides, true)
	return _spawn_boss(kind, options)
