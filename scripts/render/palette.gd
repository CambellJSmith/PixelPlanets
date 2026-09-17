class_name PixelPalette
extends RefCounted

var state: GameState
var world: WorldModel
var time_system: TimeSystem
var weather_system: WeatherSystem

func _init(game_state: GameState, world_model: WorldModel, time: TimeSystem, weather: WeatherSystem) -> void:
	state = game_state
	world = world_model
	time_system = time
	weather_system = weather

func _smooth(value: float) -> float:
	var x: float = clampf(value, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

func _mix(a: Color, b: Color, amount: float) -> Color:
	return a.lerp(b, clampf(amount, 0.0, 1.0))

func _rgb(values: Array) -> Color:
	return Color(float(values[0]) / 255.0, float(values[1]) / 255.0, float(values[2]) / 255.0, 1.0)

func _crop_color(crop_id: int, part: String, shade: int) -> Color:
	var crop: Dictionary = GameData.crop(crop_id)
	var base: Array = crop.get(part, [112,150,78])
	return Color(
		clampf((float(base[0]) + float(shade) * 0.28) / 255.0, 0.0, 1.0),
		clampf((float(base[1]) + float(shade) * 0.45) / 255.0, 0.0, 1.0),
		clampf((float(base[2]) + float(shade) * 0.28) / 255.0, 0.0, 1.0), 1.0)

func crop_color(crop_id: int, part: String, shade: int = 8) -> Color:
	return _crop_color(crop_id, part, shade)

func sky_color(world_x: int, world_y: int, surface: Dictionary) -> Color:
	var sky: Dictionary = world.sky_at(world_x)
	var altitude: float = float(surface["ground"]) - float(world_y)
	var top_blend: float = _smooth(altitude / 92.0)
	var horizon: Color = _mix(_rgb(sky["bottom"]), Color8(232,220,185), 0.07)
	var day: Color = _mix(horizon, _rgb(sky["top"]), top_blend)
	var time: Dictionary = time_system.get_time()
	var night: Color = _mix(Color8(19,24,48), Color8(4,7,24), top_blend)
	day = _mix(day, night, float(time["night_strength"]) * 0.94)
	if float(time["dawn"]) > 0.0:
		var warm_dawn: Color = _mix(Color8(240,123,83), Color8(103,73,128), top_blend)
		day = _mix(day, warm_dawn, float(time["dawn"]) * (1.0 - top_blend * 0.45) * 0.5)
	if float(time["dusk"]) > 0.0:
		var warm_dusk: Color = _mix(Color8(244,112,68), Color8(92,62,122), top_blend)
		day = _mix(day, warm_dusk, float(time["dusk"]) * (1.0 - top_blend * 0.38) * 0.62)
	var weather: Dictionary = weather_system.get_weather()
	var strength: float = float(weather["intensity"])
	if strength > 0.01:
		var weather_type: String = String(weather["type"])
		if weather_type in ["rain", "thunderstorm", "ocean_storm"]:
			day = _mix(day, Color8(52,64,82), strength * (0.3 if weather_type == "rain" else 0.52))
		elif weather_type == "fog":
			day = _mix(day, Color8(166,174,176), strength * 0.58)
		elif weather_type in ["snow", "blizzard"]:
			day = _mix(day, Color8(185,202,218), strength * (0.44 if weather_type == "blizzard" else 0.24))
		elif weather_type == "ashfall":
			day = _mix(day, Color8(92,75,72), strength * 0.52)
		elif weather_type == "heatwave":
			day = _mix(day, Color8(224,154,94), strength * 0.22)
		elif weather_type == "spore_haze":
			day = _mix(day, Color8(112,75,126), strength * 0.35)
	return day

func color(material: int, shade: int, local_x: int, local_y: int, crop_id: int = 0) -> Color:
	var flicker: int = (state.frame + local_x * 3 + local_y * 5) & 7
	var s: float = float(shade)
	var base: Color
	match material:
		GameData.ROCK: base = Color8(clampi(46+shade,0,255),clampi(42+shade,0,255),clampi(57+shade/2,0,255))
		GameData.DIRT: base = Color8(clampi(106+shade,0,255),clampi(70+shade/2,0,255),38)
		GameData.GRASS: base = Color8(clampi(48+shade/3,0,255),clampi(136+shade,0,255),clampi(52+shade/3,0,255))
		GameData.WATER:
			var world_x: int = int(state.world["camera"]["chunk_x"]) * GameConfig.WORLD_WIDTH + local_x
			var world_y: int = int(state.world["camera"]["chunk_y"]) * GameConfig.WORLD_HEIGHT + local_y
			var surface: Dictionary = world.surface_at(world_x)
			if bool(surface["ocean"]):
				var depth: float = maxf(0.0, float(world_y) - float(surface["water"]))
				base = Color8(clampi(roundi(18+s*.18),0,255),clampi(roundi(88+s*.55-minf(22.0,depth*.45)),0,255),clampi(roundi(164+s*.65-minf(28.0,depth*.55)),0,255))
			else: base = Color8(28,clampi(96+shade,0,255),clampi(174+shade,0,255))
		GameData.SAND: base = Color8(clampi(184+shade,0,255),clampi(145+shade/2,0,255),72)
		GameData.WOOD: base = Color8(clampi(112+shade,0,255),clampi(68+shade/2,0,255),34)
		GameData.LEAF: base = Color8(clampi(35+shade/3,0,255),clampi(108+shade,0,255),clampi(44+shade/3,0,255))
		GameData.LAVA: base = Color8(240,clampi(65+flicker*9,0,255),8)
		GameData.CRYSTAL: base = Color8(clampi(50+shade,0,255),clampi(220+min(30,shade),0,255),245)
		GameData.FIRE: base = Color8(255,clampi(105+flicker*18,0,255),clampi(18+shade,0,255))
		GameData.NAPALM: base = Color8(clampi(roundi(206+s*.6),0,255),clampi(104+flicker*4,0,255),clampi(roundi(20+s*.2),0,255))
		GameData.SMOKE: base = Color8(clampi(68+shade,0,255),clampi(64+shade,0,255),clampi(76+shade,0,255))
		GameData.SNOW: base = Color8(clampi(roundi(230+s*.3),0,255),clampi(roundi(238+s*.3),0,255),clampi(roundi(245+s*.2),0,255))
		GameData.MUD: base = Color8(clampi(78+shade,0,255),clampi(roundi(64+s*.5),0,255),42)
		GameData.BAMBOO: base = Color8(clampi(roundi(126+s*.3),0,255),clampi(188+shade,0,255),clampi(roundi(74+s*.2),0,255))
		GameData.ASH: base = Color8(clampi(roundi(92+s*.6),0,255),clampi(roundi(86+s*.6),0,255),clampi(roundi(84+s*.5),0,255))
		GameData.MYCELIUM: base = Color8(clampi(roundi(91+s*.45),0,255),clampi(roundi(68+s*.3),0,255),clampi(roundi(112+s*.55),0,255))
		GameData.MUSHROOM_STEM: base = Color8(clampi(roundi(212+s*.25),0,255),clampi(roundi(198+s*.2),0,255),clampi(roundi(170+s*.15),0,255))
		GameData.MUSHROOM_CAP: base = Color8(clampi(roundi(174+s*.45),0,255),clampi(roundi(54+s*.2),0,255),clampi(roundi(118+s*.5),0,255))
		GameData.STEAM: base = Color8(clampi(roundi(188+s*.35),0,255),clampi(roundi(214+s*.3),0,255),clampi(roundi(225+s*.25),0,255))
		GameData.CROP_STEM: base = _crop_color(crop_id, "stem", shade)
		GameData.CROP_LEAF: base = _crop_color(crop_id, "leaf", shade)
		GameData.CROP_FRUIT: base = _crop_color(crop_id, "fruit", shade)
		_:
			var world_x: int = int(state.world["camera"]["chunk_x"]) * GameConfig.WORLD_WIDTH + local_x
			var world_y: int = int(state.world["camera"]["chunk_y"]) * GameConfig.WORLD_HEIGHT + local_y
			var surface: Dictionary = world.surface_at(world_x)
			if world_y < int(surface["ground"]): base = sky_color(world_x, world_y, surface)
			else:
				var depth: float = float(world_y - int(surface["ground"]))
				base = _mix(Color8(25,27,38), Color8(8,9,17), _smooth(clampf(depth / 58.0, 0.0, 1.0)))
	if String(state.world["dimension"]) == "earth" or material == GameData.AIR:
		return base
	var definition: Dictionary = GameData.dimension(String(state.world["dimension"]))
	var tint: Array = definition.get("material_tint", [128,128,128])
	var amount: float = float(definition.get("tint_strength", 0.0))
	if String(state.world["dimension"]) == "prism" and (state.frame + local_x + local_y) % 12 < 4: amount += 0.12
	if String(state.world["dimension"]) == "static" and (floori(float(local_x)/3.0)+floori(float(local_y)/3.0)+floori(float(state.frame)/8.0))%5 == 0: amount += 0.2
	return _mix(base, _rgb(tint), minf(0.55, amount))
