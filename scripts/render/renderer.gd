class_name PixelRenderer
extends RefCounted

const NYAN_RAINBOW: Array[Color] = [Color8(255,64,72),Color8(255,145,46),Color8(255,224,76),Color8(83,208,98),Color8(62,151,238),Color8(154,91,224)]
const REALITY_COLORS: Array[Color] = [Color8(255,45,196),Color8(82,250,244),Color8(255,238,72),Color8(118,255,92),Color8(143,72,255),Color8(255,103,48),Color8(235,247,255),Color8(48,126,255)]

var state: GameState
var world: WorldModel
var weapons: WeaponSystem
var palette: PixelPalette
var time_system: TimeSystem
var weather_system: WeatherSystem
var juice_system: JuiceSystem
var render_offset: Vector2i = Vector2i.ZERO
var image: Image
var base_image: Image
var texture: ImageTexture
var last_camera: Vector2i = Vector2i(999999,999999)
var last_full_refresh: int = -9999

func _init(game_state: GameState, world_model: WorldModel, weapon_system: WeaponSystem, pixel_palette: PixelPalette, time: TimeSystem, weather: WeatherSystem, juice: JuiceSystem = null) -> void:
	state = game_state
	world = world_model
	weapons = weapon_system
	palette = pixel_palette
	time_system = time
	weather_system = weather
	juice_system = juice
	base_image = Image.create(GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT, false, Image.FORMAT_RGBA8)
	if render_offset == Vector2i.ZERO:
		image = base_image.duplicate()
	else:
		image = Image.create(GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT, false, Image.FORMAT_RGBA8)
		image.fill(Color8(5, 7, 11))
		image.blit_rect(base_image, Rect2i(0, 0, GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT), render_offset)
	texture = ImageTexture.create_from_image(image)

func invalidate_terrain_cache() -> void:
	last_full_refresh = -9999
	last_camera = Vector2i(999999,999999)

func _origin() -> Vector2i:
	return Vector2i(int(state.world["camera"]["chunk_x"]) * GameConfig.WORLD_WIDTH, int(state.world["camera"]["chunk_y"]) * GameConfig.WORLD_HEIGHT)

func _inside(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < GameConfig.WORLD_WIDTH and y < GameConfig.WORLD_HEIGHT

func _pixel(x: int, y: int, color: Color) -> void:
	if _inside(x,y): image.set_pixel(x,y,color)

func _blend_pixel(x: int, y: int, color: Color) -> void:
	if not _inside(x,y): return
	var under: Color = image.get_pixel(x,y)
	image.set_pixel(x,y,under.lerp(Color(color.r,color.g,color.b,1.0),color.a))

func _rect(x: int, y: int, width: int, height: int, color: Color) -> void:
	for py: int in range(max(0,y), min(GameConfig.WORLD_HEIGHT,y+height)):
		for px: int in range(max(0,x), min(GameConfig.WORLD_WIDTH,x+width)):
			_pixel(px,py,color)

func _blend_rect(x: int, y: int, width: int, height: int, color: Color) -> void:
	for py: int in range(max(0,y), min(GameConfig.WORLD_HEIGHT,y+height)):
		for px: int in range(max(0,x), min(GameConfig.WORLD_WIDTH,x+width)):
			_blend_pixel(px,py,color)

func _line(from_x: int, from_y: int, to_x: int, to_y: int, color: Color, width: int = 1) -> void:
	var x0: int = from_x
	var y0: int = from_y
	var dx: int = absi(to_x-x0)
	var sx: int = 1 if x0 < to_x else -1
	var dy: int = -absi(to_y-y0)
	var sy: int = 1 if y0 < to_y else -1
	var error: int = dx+dy
	while true:
		for oy: int in range(-(width-1)/2, width/2+1):
			for ox: int in range(-(width-1)/2, width/2+1): _pixel(x0+ox,y0+oy,color)
		if x0 == to_x and y0 == to_y: break
		var twice: int = 2*error
		if twice >= dy: error += dy; x0 += sx
		if twice <= dx: error += dx; y0 += sy

func _draw_pixel_box(x: int, y: int, width: int, height: int, color: Color) -> void:
	var right: int = x + maxi(1, width) - 1
	var bottom: int = y + maxi(1, height) - 1
	_line(x, y, right, y, color)
	_line(x, bottom, right, bottom, color)
	_line(x, y, x, bottom, color)
	_line(right, y, right, bottom, color)

func _draw_pixel_circle(center_x: int, center_y: int, radius: int, color: Color, thickness: int = 1) -> void:
	var outer: int = maxi(1, radius)
	var inner: int = maxi(0, outer - maxi(1, thickness))
	for offset_y: int in range(-outer, outer + 1):
		for offset_x: int in range(-outer, outer + 1):
			var distance_squared: int = offset_x * offset_x + offset_y * offset_y
			if distance_squared <= outer * outer and distance_squared >= inner * inner:
				_blend_pixel(center_x + offset_x, center_y + offset_y, color)

func _hash(value: int) -> int:
	var x: int = value
	x = ((x >> 16) ^ x) * 0x45d9f3b
	x = ((x >> 16) ^ x) * 0x45d9f3b
	return (x >> 16) ^ x

func _refresh_terrain() -> void:
	var camera: Vector2i = Vector2i(int(state.world["camera"]["chunk_x"]),int(state.world["camera"]["chunk_y"]))
	var chunk: Dictionary = world.get_chunk(camera.x,camera.y,true)
	var cells: PackedByteArray = chunk["cells"]
	var shade: PackedByteArray = chunk["shade"]
	var crop_ids: PackedByteArray = chunk["crop_id"]
	for y: int in range(GameConfig.WORLD_HEIGHT):
		var row: int = y*GameConfig.WORLD_WIDTH
		for x: int in range(GameConfig.WORLD_WIDTH):
			var index: int = row+x
			base_image.set_pixel(x,y,palette.color(int(cells[index]),int(shade[index]),x,y,int(crop_ids[index])))
	chunk["render_dirty"] = []
	chunk["render_full_dirty"] = false
	last_camera = camera
	last_full_refresh = state.frame

func _refresh_dirty_terrain() -> void:
	var camera: Vector2i = Vector2i(int(state.world["camera"]["chunk_x"]),int(state.world["camera"]["chunk_y"]))
	var chunk: Dictionary = world.get_chunk(camera.x,camera.y,true)
	var dirty: Array = chunk["render_dirty"]
	if dirty.is_empty(): return
	var cells: PackedByteArray = chunk["cells"]
	var shade: PackedByteArray = chunk["shade"]
	var crop_ids: PackedByteArray = chunk["crop_id"]
	for value: Variant in dirty:
		var index: int = int(value)
		var x: int = index%GameConfig.WORLD_WIDTH
		var y: int = index/GameConfig.WORLD_WIDTH
		base_image.set_pixel(x,y,palette.color(int(cells[index]),int(shade[index]),x,y,int(crop_ids[index])))
	chunk["render_dirty"] = []

func _prepare_terrain() -> void:
	var camera: Vector2i = Vector2i(int(state.world["camera"]["chunk_x"]), int(state.world["camera"]["chunk_y"]))
	var chunk: Dictionary = world.get_chunk(camera.x, camera.y, true)
	if camera != last_camera or bool(chunk.get("render_full_dirty", true)) or state.frame - last_full_refresh >= int(GameConfig.TERRAIN_FULL_REFRESH_FRAMES):
		_refresh_terrain()
	else:
		_refresh_dirty_terrain()
	image = Image.create(GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT, false, Image.FORMAT_RGBA8)
	image.fill(Color8(5, 7, 11))
	var source_x: int = maxi(0, -render_offset.x)
	var source_y: int = maxi(0, -render_offset.y)
	var target_x: int = maxi(0, render_offset.x)
	var target_y: int = maxi(0, render_offset.y)
	var copy_width: int = GameConfig.WORLD_WIDTH - absi(render_offset.x)
	var copy_height: int = GameConfig.WORLD_HEIGHT - absi(render_offset.y)
	if copy_width > 0 and copy_height > 0:
		image.blit_rect(base_image, Rect2i(source_x, source_y, copy_width, copy_height), Vector2i(target_x, target_y))

func _paint_sky_pixel(chunk: Dictionary, x: int, y: int, color: Color) -> void:
	if not _inside(x, y):
		return
	var cells: PackedByteArray = chunk["cells"]
	if int(cells[x + y * GameConfig.WORLD_WIDTH]) != GameData.AIR:
		return
	_blend_pixel(x, y, color)

func _draw_disk(chunk: Dictionary, center_x: int, center_y: int, radius: int, color: Color) -> void:
	for offset_y: int in range(-radius, radius + 1):
		for offset_x: int in range(-radius, radius + 1):
			if offset_x * offset_x + offset_y * offset_y <= radius * radius:
				_paint_sky_pixel(chunk, center_x + offset_x, center_y + offset_y, color)

func _draw_sky_details(base_origin: Vector2i, visual_origin_x: int) -> void:
	if base_origin.y > 0:
		return
	var chunk: Dictionary = world.get_chunk(int(state.world["camera"]["chunk_x"]), int(state.world["camera"]["chunk_y"]), true)
	var time: Dictionary = time_system.get_time()
	var night_strength: float = float(time.get("night_strength", 0.0))
	if night_strength > 0.08:
		for index: int in range(72):
			var value: int = absi(_hash(index + int(state.world["camera"]["chunk_x"]) * 977))
			var x: int = value % GameConfig.WORLD_WIDTH
			var y: int = 3 + ((value >> 9) % 52)
			var twinkle: float = 0.35 + float(((state.frame >> 4) + index) % 5) * 0.12
			_paint_sky_pixel(chunk, x, y, Color(225.0 / 255.0, 233.0 / 255.0, 1.0, minf(0.95, night_strength * twinkle)))
	var phase_progress: float = float(time.get("phase_progress", 0.0))
	if bool(time.get("is_day", true)):
		var sun_x: int = roundi(7.0 + phase_progress * float(GameConfig.WORLD_WIDTH - 14))
		var sun_y: int = roundi(42.0 - sin(phase_progress * PI) * 31.0)
		var daylight: float = float(time.get("daylight", 1.0))
		_draw_disk(chunk, sun_x, sun_y, 4, Color(1.0, 226.0 / 255.0, 118.0 / 255.0, maxf(0.35, daylight)))
		_paint_sky_pixel(chunk, sun_x - 1, sun_y - 1, Color(1.0, 248.0 / 255.0, 208.0 / 255.0, daylight))
	else:
		var moon_x: int = roundi(7.0 + phase_progress * float(GameConfig.WORLD_WIDTH - 14))
		var moon_y: int = roundi(39.0 - sin(phase_progress * PI) * 27.0)
		_draw_disk(chunk, moon_x, moon_y, 3, Color(210.0 / 255.0, 220.0 / 255.0, 238.0 / 255.0, 0.85))
		_draw_disk(chunk, moon_x + 1, moon_y - 1, 2, Color(91.0 / 255.0, 103.0 / 255.0, 139.0 / 255.0, 0.55))
	var drift: float = float(state.frame) * 0.012
	var first_cloud: int = floori((float(visual_origin_x) - drift - 100.0) / 66.0)
	var last_cloud: int = ceili((float(visual_origin_x + GameConfig.WORLD_WIDTH) - drift + 100.0) / 66.0)
	var cloud_color: Color = Color8(224, 230, 232) if bool(time.get("is_day", true)) else Color8(76, 83, 105)
	cloud_color.a = 0.46 + 0.34 * float(time.get("daylight", 1.0))
	var cloud_shape: Array[Vector2i] = [Vector2i(-5,1),Vector2i(-4,0),Vector2i(-3,0),Vector2i(-2,-1),Vector2i(-1,-2),Vector2i(0,-2),Vector2i(1,-1),Vector2i(2,-1),Vector2i(3,0),Vector2i(4,0),Vector2i(5,1),Vector2i(-4,1),Vector2i(-3,1),Vector2i(-2,1),Vector2i(-1,1),Vector2i(0,1),Vector2i(1,1),Vector2i(2,1),Vector2i(3,1),Vector2i(4,1)]
	for cloud_index: int in range(first_cloud, last_cloud + 1):
		var value: int = absi(_hash(cloud_index * 7919 + 27))
		var world_x: float = float(cloud_index * 66 + (value % 31)) + drift
		var local_x: int = roundi(world_x - float(visual_origin_x))
		var y: int = 11 + ((value >> 8) % 25)
		var scale: int = 1 + ((value >> 15) & 1)
		for point: Vector2i in cloud_shape:
			for scale_x: int in range(scale):
				_paint_sky_pixel(chunk, local_x + point.x * scale + scale_x, y + point.y, cloud_color)

func _draw_player(origin: Vector2i) -> void:
	if int(state.player.get("invulnerability", 0)) > 0 and state.frame % 4 < 2:
		return
	var center_x: int = roundi(float(state.player["x"])) - origin.x
	var baseline_y: int = roundi(float(state.player["y"])) - origin.y
	var recoil: int = int(state.juice.get("recoil_x", 0)) if int(state.juice.get("recoil_frames", 0)) > 0 else 0
	var x: int = center_x + recoil
	var swimming: bool = bool((state.player["status"] as Dictionary).get("swimming", false))
	var seated: bool = not swimming and String(state.player.get("furniture_mode", "")) == "sit"
	var squashed: bool = not swimming and not seated and int(state.juice.get("player_squash", 0)) > 0
	var stretched: bool = not swimming and not squashed and int(state.juice.get("player_stretch", 0)) > 0
	var visual_width: int = 3 if seated else 5 if squashed else int(state.player.get("width", 3))
	var visual_height: int = 3 if seated else 3 if squashed else 6 if stretched else int(state.player.get("height", 5))
	var visual_left: int = x - floori(float(visual_width) * 0.5)
	var visual_top: int = baseline_y - visual_height + 1
	var swim_facing: int = int(state.player.get("facing", 1))
	if swimming:
		if float(state.player.get("vx", 0.0)) < -0.04:
			swim_facing = -1
		elif float(state.player.get("vx", 0.0)) > 0.04:
			swim_facing = 1
		var skin: Color = Color8(235, 210, 125)
		var body: Color = Color8(70, 150, 220)
		var eye: Color = Color8(28, 49, 73)
		var upright: Array = [[skin,skin,skin],[skin,eye,skin],[body,body,body],[body,body,body],[body,null,body]]
		var rotated: Array = []
		for _row: int in range(3):
			rotated.append([null,null,null,null,null])
		if swim_facing >= 0:
			for row: int in range(3):
				for column: int in range(5):
					rotated[row][column] = upright[4-column][row]
		else:
			for row: int in range(3):
				for column: int in range(5):
					rotated[row][column] = upright[column][2-row]
		visual_height = 3
		visual_width = 5
		visual_left = x - 2
		visual_top = baseline_y - 3
		for row: int in range(3):
			for column: int in range(5):
				var pixel_value: Variant = rotated[row][column]
				if pixel_value != null:
					_pixel(visual_left + column, visual_top + row, pixel_value)
		var kick_x: int = visual_left - 1 if swim_facing > 0 else visual_left + visual_width
		var kick_y: int = visual_top if floori(float(state.frame) / 5.0) % 2 == 0 else visual_top + visual_height - 1
		_pixel(kick_x, kick_y, Color8(55, 125, 202))
	else:
		var head_height: int = 1 if squashed or seated else 2
		_rect(visual_left, visual_top, visual_width, head_height, Color8(235, 210, 125))
		_rect(visual_left, visual_top + head_height, visual_width, visual_height - head_height, Color8(70, 150, 220))
		if seated:
			_rect(visual_left + (2 if int(state.player.get("facing",1)) > 0 else 0), visual_top + 2, 2, 1, Color8(55,125,202))
	if int(state.juice.get("recoil_frames", 0)) > 0:
		_blend_rect(visual_left - recoil, visual_top + 1, 1, maxi(1, visual_height - 2), Color(184.0/255.0,225.0/255.0,1.0,0.45))
	var held_facing: int = swim_facing if swimming else (1 if int(state.input["pointer_x"]) >= x else -1)
	if bool(state.build["active"]) and state.build["equipped_furniture_id"] != null:
		var held_x: int = x + held_facing * 3
		var held_y: int = visual_top + 1 if swimming else baseline_y - 3
		var left: int = held_x - (2 if held_facing < 0 else 0)
		_rect(left, held_y, 3, 2, Color8(214,184,123))
		_draw_pixel_box(left, held_y, 3, 2, Color(245.0/255.0,248.0/255.0,1.0,0.8))
	elif bool(state.build["active"]) and state.build["equipped_material"] != null:
		var material_id: int = int(state.build["equipped_material"])
		var held_color: Color = palette.color(material_id, 10, x, baseline_y)
		var held_x: int = x + held_facing * (3 if swimming else 2) - (1 if held_facing < 0 else 0)
		var held_y: int = visual_top + 1 if swimming else baseline_y - 3
		_rect(held_x, held_y, 2, 2, held_color)
		_draw_pixel_box(held_x, held_y, 2, 2, Color(245.0/255.0,248.0/255.0,1.0,0.8))
	elif bool(state.seed_mode["active"]) and state.seed_mode["crop_id"] != null:
		var crop_id: int = int(state.seed_mode["crop_id"])
		var held_color: Color = palette.crop_color(crop_id, "seed", 8)
		var held_x: int = x + held_facing * (3 if swimming else 2)
		var held_y: int = visual_top + 1 if swimming else baseline_y - 3
		_pixel(held_x, held_y, held_color)
		_pixel(held_x + held_facing, held_y + 1, held_color)

func _draw_furniture_entity(entity: Dictionary, origin: Vector2i, ghost: bool = false) -> void:
	var definition: Dictionary = GameData.furniture(String(entity.get("furniture_id", "")))
	if definition.is_empty():
		return
	var bounds: Rect2i = GameData.furniture_bounds(entity, definition)
	var rows: Array = definition.get("open_sprite", definition["sprite"]) if bool(entity.get("open", false)) else definition["sprite"]
	for local_y: int in range(rows.size()):
		var row: String = String(rows[local_y])
		for local_x: int in range(row.length()):
			var glyph: String = row.substr(local_x, 1)
			if glyph == " ":
				continue
			var color: Color = GameData.FURNITURE_PIXEL_COLORS.get(glyph, Color.WHITE)
			if glyph == "l" and not bool(entity.get("on", true)):
				color = Color8(83, 76, 64)
			if ghost:
				color.a = 0.48
				_blend_pixel(bounds.position.x + local_x - origin.x, bounds.position.y + local_y - origin.y, color)
			else:
				_pixel(bounds.position.x + local_x - origin.x, bounds.position.y + local_y - origin.y, color)
	var left: int = bounds.position.x - origin.x
	var top: int = bounds.position.y - origin.y
	if String(entity.get("furniture_id", "")) == "chest" and int(entity.get("stored_total", 0)) > 0:
		_pixel(left + 2, top + 1, Color8(255,224,111))
	if String(entity.get("furniture_id", "")) == "planter" and entity.get("crop_id", null) != null:
		var growth: int = clampi(floori(float(entity.get("growth",0)) / 900.0) + 1, 1, 4)
		var plant_color: Color = Color8(255,191,75) if int(entity.get("growth",0)) >= 3600 else Color8(87,198,93)
		for rise: int in range(growth):
			_pixel(left + 2, top - rise, plant_color)
		if growth >= 3:
			_pixel(left + 1, top - growth + 2, plant_color)
			_pixel(left + 3, top - growth + 1, plant_color)
	if String(entity.get("furniture_id", "")) == "sign":
		var label_index: int = posmod(int(entity.get("label_index",0)), GameData.SIGN_LABELS.size())
		var label: String = GameData.SIGN_LABELS[label_index]
		var label_x: int = left - maxi(0, floori(float(PixelFont.text_width(label) - int(definition["w"])) * 0.5))
		PixelFont.draw(image, label, label_x, top - 6, Color8(238,225,180), 1, 1, 38)
	if String(entity.get("furniture_id", "")) == "clock":
		var time: Dictionary = time_system.get_time()
		var center_x: int = left + 2
		var center_y: int = top + 2
		_pixel(center_x, center_y, Color8(43,55,69))
		var hour_angle: float = (fmod(float(time.get("hours",0)),12.0) + float(time.get("minutes",0))/60.0) / 12.0 * TAU - PI * 0.5
		var minute_angle: float = float(time.get("minutes",0)) / 60.0 * TAU - PI * 0.5
		_pixel(center_x + roundi(cos(hour_angle)), center_y + roundi(sin(hour_angle)), Color8(75,55,39))
		_pixel(center_x + roundi(cos(minute_angle)*2.0), center_y + roundi(sin(minute_angle)*2.0), Color8(199,77,66))

func _draw_furniture_lights(origin: Vector2i) -> void:
	for entity_value: Variant in state.entities["furniture"]:
		var entity: Dictionary = entity_value
		if String(entity.get("dimension", state.world["dimension"])) != String(state.world["dimension"]):
			continue
		var definition: Dictionary = GameData.furniture(String(entity.get("furniture_id", "")))
		var radius: int = int(definition.get("light_radius", 0))
		if radius <= 0 or not bool(entity.get("on", true)):
			continue
		var x: int = roundi(float(entity["x"])) - origin.x
		var y: int = roundi(float(entity["y"])) - floori(float(definition.get("h",1)) * 0.65) - origin.y
		var ring: int = radius
		while ring >= 4:
			var alpha: float = 0.012 + float(radius - ring) / float(radius) * 0.012
			_blend_rect(x - ring, y - floori(float(ring) * 0.65), ring * 2 + 1, floori(float(ring) * 1.3) + 1, Color(1.0,226.0/255.0,126.0/255.0,alpha))
			ring -= 4

func _draw_furniture(origin: Vector2i) -> void:
	for entity_value: Variant in state.entities["furniture"]:
		var entity: Dictionary = entity_value
		if String(entity.get("dimension", state.world["dimension"])) == String(state.world["dimension"]):
			_draw_furniture_entity(entity, origin)

func _creature_pixel(x: int, y: int, offset_x: int, offset_y: int, facing: int, color: Color) -> void:
	_pixel(x + offset_x * facing, y + offset_y, color)

func _creature_rect(x: int, y: int, offset_x: int, offset_y: int, width: int, height: int, facing: int, color: Color) -> void:
	var left: int = x - offset_x - width + 1 if facing < 0 else x + offset_x
	_rect(left, y + offset_y, width, height, color)

func _species_color(values: Variant, fallback: Color = Color.WHITE) -> Color:
	if values is Array and (values as Array).size() >= 3:
		return Color8(int(values[0]), int(values[1]), int(values[2]))
	return fallback

func _draw_creature_sprite(enemy: Dictionary, species: Dictionary, x: int, y: int) -> void:
	var animation_rate: int = maxi(2, int(species.get("animation_rate", 8)))
	var frame: int = floori(float(state.frame + int(enemy.get("animation_offset", 0))) / float(animation_rate)) % 2
	var facing: int = -1 if int(enemy.get("facing", 1)) < 0 else 1
	var moving: bool = absf(float(enemy.get("vx", 0.0))) > 0.08 or absf(float(enemy.get("vy", 0.0))) > 0.08
	var palette_data: Array = species.get("palette", [[195,65,100],[255,170,190],[84,34,60]])
	var body: Color = Color8(255,145,35) if int(enemy.get("burning", 0)) > 0 and state.frame % 4 < 2 else Color8(255,235,235) if int(enemy.get("hit", 0)) > 0 else _species_color(palette_data[0])
	var accent: Color = _species_color(palette_data[min(1, palette_data.size()-1)])
	var dark: Color = _species_color(palette_data[min(2, palette_data.size()-1)])
	var leg_a: int = (0 if frame else 1) if moving else 0
	var leg_b: int = (1 if frame else 0) if moving else 0
	var sprite: String = String(species.get("sprite", "quadruped"))
	match sprite:
		"hare":
			_creature_rect(x,y,-1,-2,3,2,facing,body); _creature_pixel(x,y,1,-3,facing,body); _creature_pixel(x,y,1,-4,facing,body); _creature_pixel(x,y,0,-4,facing,accent); _creature_pixel(x,y,-2,-2,facing,accent); _creature_pixel(x,y,1,0,facing,dark); _creature_pixel(x,y,-1-leg_a,0,facing,dark)
		"mouse", "rat":
			_creature_rect(x,y,-1,-1,3,2,facing,body); _creature_pixel(x,y,1,-2,facing,accent); _creature_pixel(x,y,2,-1,facing,dark); _line(x-2*facing,y,x-(4+frame)*facing,y+frame,dark); _creature_pixel(x,y,-1,1,facing,dark); _creature_pixel(x,y,1,1,facing,dark)
		"deer", "goat", "yak":
			var long_body: int = 5 if sprite == "yak" else 4
			_creature_rect(x,y,-2,-3,long_body,3,facing,body); _creature_rect(x,y,2,-5,2,3,facing,accent); _creature_pixel(x,y,3,-5,facing,dark)
			if sprite == "deer": _line(x+2*facing,y-5,x+1*facing,y-7,dark); _line(x+3*facing,y-5,x+4*facing,y-7,dark)
			elif sprite == "goat": _creature_pixel(x,y,2,-6,facing,dark); _creature_pixel(x,y,3,-6,facing,dark)
			else: _creature_rect(x,y,-3,-4,6,1,facing,dark); _creature_pixel(x,y,3,-5,facing,dark)
			_creature_pixel(x,y,-1-leg_a,0,facing,dark); _creature_pixel(x,y,1+leg_b,0,facing,dark)
		"fox", "wolf", "badger", "boar", "panda", "quadruped":
			var quad_width: int = 5 if sprite == "panda" else 4
			_creature_rect(x,y,-2,-3,quad_width,3,facing,body); _creature_rect(x,y,2,-4,2,2,facing,accent); _creature_pixel(x,y,3,-4,facing,dark)
			if sprite == "fox" or sprite == "wolf": _line(x-2*facing,y-3,x-(4+frame)*facing,y-4+frame,accent)
			if sprite == "boar": _creature_pixel(x,y,4,-3,facing,accent); _creature_pixel(x,y,4,-2,facing,dark)
			if sprite == "badger": _creature_rect(x,y,-1,-3,3,1,facing,accent)
			if sprite == "panda": _creature_pixel(x,y,2,-5,facing,dark); _creature_pixel(x,y,3,-5,facing,dark)
			_creature_pixel(x,y,-1-leg_a,0,facing,dark); _creature_pixel(x,y,1+leg_b,0,facing,dark)
		"squirrel":
			_creature_rect(x,y,-1,-2,3,2,facing,body); _creature_rect(x,y,1,-4,2,2,facing,accent); _line(x-1*facing,y-2,x-(3+frame)*facing,y-5+frame,accent,2); _creature_pixel(x,y,2,-4,facing,dark); _creature_pixel(x,y,-1,0,facing,dark)
		"hedgehog":
			_creature_rect(x,y,-2,-2,4,2,facing,body)
			for i: int in range(-2,2): _creature_pixel(x,y,i,-3-(absi(i)%2),facing,dark)
			_creature_pixel(x,y,2,-1,facing,accent); _creature_pixel(x,y,2,-2,facing,dark)
		"bee", "hornet", "firefly":
			_creature_rect(x,y,-1,-1,3,2,facing,body); _creature_pixel(x,y,0,-2-frame,facing,accent); _creature_pixel(x,y,-1,-2+(1 if frame else 0),facing,accent); _creature_pixel(x,y,1,-1,facing,dark); _creature_pixel(x,y,-1,0 if sprite=="firefly" else -1,facing,accent if sprite=="firefly" else dark)
		"swarm":
			for point: Vector2i in [Vector2i(-2,-1),Vector2i(0,-2),Vector2i(2,-1),Vector2i(-1,1),Vector2i(1,1)]: _creature_pixel(x,y,point.x+(1 if frame and point.y<0 else 0),point.y,facing,body)
			_creature_pixel(x,y,0,0,facing,accent)
		"bird", "owl", "duck":
			_creature_rect(x,y,-1,-1,3,2,facing,body); _creature_pixel(x,y,2,-1,facing,accent); _creature_pixel(x,y,2,-2,facing,dark); var wing_y: int = -3 if frame else 0; _line(x,y-1,x-2*facing,y+wing_y,accent)
			if sprite == "owl": _creature_pixel(x,y,1,-2,facing,accent); _creature_pixel(x,y,0,-2,facing,accent)
			if sprite == "duck": _creature_pixel(x,y,3,-1,facing,accent)
		"penguin":
			_creature_rect(x,y,-1,-4,3,4,facing,dark); _creature_rect(x,y,0,-3,2,3,facing,accent); _creature_pixel(x,y,2,-3,facing,Color8(232,157,60)); _creature_pixel(x,y,-1-frame,0,facing,accent); _creature_pixel(x,y,1+frame,0,facing,accent)
		"bat", "moth":
			_creature_rect(x,y,0,-1,2,3,facing,body); var wing_height: int = 1 if frame else 3; _line(x-1*facing,y-1,x-(4+frame)*facing,y-wing_height,accent,2); _line(x+1*facing,y-1,x+(4+frame)*facing,y-wing_height,accent,2); _creature_pixel(x,y,1,-2,facing,dark)
		"imp":
			_creature_rect(x,y,-1,-2,3,4,facing,body); _creature_pixel(x,y,-1,-3,facing,accent); _creature_pixel(x,y,1,-3,facing,accent); _line(x-1*facing,y,x-(3+frame)*facing,y+2,dark); _creature_pixel(x,y,1,-1,facing,accent)
		"beetle", "mite":
			_creature_rect(x,y,-2,-2,4,3,facing,body); _creature_rect(x,y,-1,-2,2,2,facing,accent); _creature_pixel(x,y,2,-1,facing,dark)
			for side: int in [-1,1]: _creature_pixel(x,y,-1+frame,1 if side>0 else -3,facing,dark); _creature_pixel(x,y,1-frame,1 if side>0 else -3,facing,dark)
		"mantis":
			_creature_rect(x,y,0,-4,2,4,facing,body); _creature_pixel(x,y,1,-5,facing,accent); _line(x,y-3,x+3*facing,y-4+frame,dark); _line(x,y-2,x-2*facing,y-1-frame,dark); _creature_pixel(x,y,-1,0,facing,dark); _creature_pixel(x,y,1,0,facing,dark)
		"spider":
			_creature_rect(x,y,-1,-2,3,3,facing,body); _creature_pixel(x,y,0,-2,facing,accent)
			for side: int in [-1,1]:
				for leg: int in range(3): _line(x+side,y-1+leg,x+side*(3+frame),y-3+leg*2+(1 if frame else 0),dark)
		"scorpion":
			_creature_rect(x,y,-2,-2,4,3,facing,body); _creature_pixel(x,y,2,-1,facing,accent); _line(x-2*facing,y-2,x-4*facing,y-4-frame,dark); _creature_pixel(x,y,-4,-5-frame,facing,accent); _creature_pixel(x,y,-1,1,facing,dark); _creature_pixel(x,y,1,1,facing,dark)
		"crab":
			_creature_rect(x,y,-2,-2,5,3,facing,body); _creature_pixel(x,y,-3,-2-frame,facing,accent); _creature_pixel(x,y,3,-2+(0 if frame else -1),facing,accent); _creature_pixel(x,y,-2,1,facing,dark); _creature_pixel(x,y,2,1,facing,dark); _creature_pixel(x,y,-1,-2,facing,dark); _creature_pixel(x,y,1,-2,facing,dark)
		"lizard", "gecko", "newt", "crawler":
			_creature_rect(x,y,-2,-2,5,2,facing,body); _creature_pixel(x,y,2,-3,facing,accent); _creature_pixel(x,y,3,-2,facing,dark); _line(x-2*facing,y-1,x-(5+frame)*facing,y-2+frame,accent); _creature_pixel(x,y,-1-leg_a,0,facing,dark); _creature_pixel(x,y,1+leg_b,0,facing,dark)
			if sprite == "crawler": _creature_rect(x,y,-1,-3,3,1,facing,dark)
		"frog":
			var crouch: int = 1 if frame and moving else 0; _creature_rect(x,y,-1,-2+crouch,3,2,facing,body); _creature_pixel(x,y,1,-3+crouch,facing,accent); _creature_pixel(x,y,2,-2+crouch,facing,dark); _creature_pixel(x,y,-2,0,facing,dark); _creature_pixel(x,y,2+(1 if frame else 0),0,facing,dark)
		"snake", "eel", "leech", "worm", "grub":
			var length: int = int(species.get("width",6))
			for i: int in range(length): _creature_pixel(x,y,2-floori(length/2.0)+i,(i+frame)%2,facing,accent if i==length-1 else body)
			_creature_pixel(x,y,ceili(length/2.0),0,facing,dark)
		"fish", "shark", "dolphin":
			var length: int = 6 if sprite=="shark" or sprite=="dolphin" else 4; _creature_rect(x,y,-floori(length/2.0),-1,length,3,facing,body); _creature_pixel(x,y,ceili(length/2.0),0,facing,dark); _creature_pixel(x,y,-ceili(length/2.0)-1,-1-frame,facing,accent); _creature_pixel(x,y,-ceili(length/2.0)-1,1+frame,facing,accent)
			if sprite=="shark": _creature_pixel(x,y,0,-2,facing,accent)
			if sprite=="dolphin": _creature_pixel(x,y,2,-2,facing,accent)
		"seahorse":
			_creature_rect(x,y,0,-2,2,4,facing,body); _creature_pixel(x,y,2,-2,facing,accent); _creature_pixel(x,y,2,-3,facing,dark); _line(x,y+1,x-2*facing,y+3-frame,accent)
		"squid":
			_creature_rect(x,y,-1,-3,3,3,facing,body); _creature_pixel(x,y,0,-4,facing,accent)
			for i: int in [-2,0,2]: _line(x+i,y,x+i+(1 if frame else -1),y+3,dark)
			_creature_pixel(x,y,1,-2,facing,dark)
		"jellyfish":
			_creature_rect(x,y,-2,-2,5,2,facing,body); _creature_rect(x,y,-1,-3,3,1,facing,accent)
			for i: int in [-2,0,2]: _line(x+i,y,x+i+(1 if frame else 0),y+3,dark)
		"turtle":
			_creature_rect(x,y,-2,-2,5,3,facing,body); _creature_rect(x,y,-1,-2,3,2,facing,accent); _creature_pixel(x,y,3,-1,facing,dark); _creature_pixel(x,y,-2-leg_a,1,facing,dark); _creature_pixel(x,y,2+leg_b,1,facing,dark)
		"snail":
			_creature_rect(x,y,-2,-1,5,2,facing,body); _creature_rect(x,y,-1,-3,3,3,facing,accent); _creature_pixel(x,y,3,-2,facing,dark); _creature_pixel(x,y,3,-3-frame,facing,dark)
		"slime":
			var squish: int = 1 if frame and moving else 0; _creature_rect(x,y,-2,-3+squish,5,3-squish,facing,body); _creature_rect(x,y,-1,-4+squish,3,1,facing,accent); _creature_pixel(x,y,1,-2+squish,facing,dark); _creature_pixel(x,y,-1,-2+squish,facing,dark)
		"sporeling":
			_creature_rect(x,y,-1,-3,3,4,facing,body); _creature_rect(x,y,-2,-5,5,2,facing,accent); _creature_pixel(x,y,1,-4,facing,dark); _creature_pixel(x,y,-1-leg_a,1,facing,dark); _creature_pixel(x,y,1+leg_b,1,facing,dark)
		"mimic":
			_creature_rect(x,y,-2,-4,5,5,facing,body); _creature_rect(x,y,-1,-3,3,3 if bool(enemy.get("disguised",false)) else 2,facing,dark)
			if bool(enemy.get("disguised",false)): _creature_pixel(x,y,-2,-5,facing,accent); _creature_pixel(x,y,0,-5,facing,accent); _creature_pixel(x,y,2,-5,facing,accent); _creature_pixel(x,y,-1,-2,facing,body); _creature_pixel(x,y,1,-1,facing,body)
			else: _creature_pixel(x,y,-1,-2,facing,accent); _creature_pixel(x,y,1,-2,facing,accent); _creature_pixel(x,y,-2,1,facing,dark); _creature_pixel(x,y,2,1,facing,dark)
		_:
			_creature_rect(x,y,-1,-1,3,3,facing,body); _creature_pixel(x,y,1,-1,facing,accent)

func _draw_enemy(enemy: Dictionary, origin: Vector2i) -> void:
	var species: Dictionary = FaunaData.fauna(String(enemy.get("species_id","")))
	if species.is_empty(): species={"sprite":"wisp","animation_rate":8,"palette":[[195,65,100],[255,170,190],[84,34,60]],"width":3,"height":3}
	var x: int = roundi(float(enemy["x"]))-origin.x; var y: int = roundi(float(enemy["y"]))-origin.y
	var margin: int = maxi(int(species.get("width",3)),int(species.get("height",3)))+4
	if x < -margin or y < -margin or x > GameConfig.WORLD_WIDTH+margin or y > GameConfig.WORLD_HEIGHT+margin: return
	if bool(enemy.get("burrowed",false)):
		_rect(x-2,y-1,5,1,Color8(108,78,54)); _pixel(x+(-1 if state.frame%5<2 else 1),y-2,Color8(174,127,75)); return
	_draw_creature_sprite(enemy,species,x,y)
	var palette_data: Array = species["palette"]
	if bool(enemy.get("climbing",false)):
		var accent:Color=_species_color(palette_data[1]); _pixel(x+int(enemy.get("facing",1))*3,y-3,accent); _pixel(x+int(enemy.get("facing",1))*3,y,accent)
	if enemy.get("stolen_weapon_id",null) != null:
		var icon_color: Color = Color8(255,233,116) if state.frame%8<4 else Color8(255,126,64); _rect(x-4,y-11,7,4,Color(0.05,0.05,0.07,0.8)); PixelFont.draw(image,str(enemy["stolen_weapon_id"]),x-2,y-10,icon_color); _pixel(x,y-7,icon_color)

func _draw_enemy_behavior_world(origin: Vector2i) -> void:
	for nest_value: Variant in state.entities["enemy_nests"]:
		var nest: Dictionary = nest_value
		var x: int = roundi(float(nest["x"])) - origin.x
		var y: int = roundi(float(nest["y"])) - origin.y
		var species: Dictionary = FaunaData.fauna(String(nest["species_id"]))
		var colors: Array = species.get("palette", [[143,104,65],[221,194,137],[69,52,42]])
		var pulse: int = floori(float(state.frame + int(float(nest.get("phase",0.0)) * 10.0)) / 7.0) % 2
		_rect(x-3,y-2,7,3,_species_color(colors[2]))
		_rect(x-2,y-4,5,2,_species_color(colors[2]))
		_rect(x-2,y-3,5,3,_species_color(colors[0]))
		_pixel(x-1,y-3,_species_color(colors[1]))
		_pixel(x+1,y-2,_species_color(colors[1]))
		if pulse != 0:
			_pixel(x,y-4,Color8(244,232,185))
	for portal_value: Variant in state.entities["invasion_portals"]:
		var portal: Dictionary = portal_value
		var x: int = roundi(float(portal["x"])) - origin.x
		var y: int = roundi(float(portal["y"])) - origin.y
		var definition: Dictionary = GameData.dimension(String(portal["source_dimension"]))
		var colors: Array = definition.get("portal_colors", [[255,255,255]])
		var opening: float = minf(1.0, float(portal.get("age",0)) / 70.0)
		var radius_x: int = maxi(2, roundi(4.0 * opening))
		var radius_y: int = maxi(3, roundi(7.0 * opening))
		_rect(x-radius_x+1,y-radius_y+1,maxi(1,radius_x*2-1),maxi(2,radius_y*2-1),Color8(4,2,12))
		for step: int in range(24):
			var angle: float = float(portal.get("phase",0.0)) + float(step) / 24.0 * TAU
			var px: int = x + roundi(cos(angle) * radius_x)
			var py: int = y + roundi(sin(angle) * radius_y)
			var rgb_values: Array = colors[(step + floori(state.frame / 3.0)) % colors.size()]
			_rect(px,py,2 if step%6==0 else 1,2 if step%5==0 else 1,_species_color(rgb_values))

func _draw_attached_parasites(origin: Vector2i) -> void:
	var attached:Array=state.player.get("attached_parasites",[]); var base_x:int=roundi(float(state.player["x"]))-origin.x; var base_y:int=roundi(float(state.player["y"])-2.0)-origin.y
	for index:int in range(attached.size()):
		var parasite:Dictionary=attached[index]; var species:Dictionary=FaunaData.fauna(String(parasite["species_id"])); var p:Array=species.get("palette",[[255,68,190],[80,255,216],[20,20,20]]); var angle:float=float(parasite.get("phase",0.0))+float(index)*TAU/maxf(1.0,float(attached.size())); var x:int=base_x+roundi(cos(angle)*2.0); var y:int=base_y+roundi(sin(angle)*2.0); _rect(x-1,y,3,1,_species_color(p[0])); _pixel(x,y-1,_species_color(p[1]))

func _draw_enemies(origin: Vector2i) -> void:
	for chunk_value: Variant in state.world["active_chunks"]:
		for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]: _draw_enemy(enemy_value,origin)

func _draw_segmented_wyrm(x: int, y: int, boss: Dictionary, colors: Array, segments: int = 8, scale: int = 1) -> void:
	var phase: float = float(boss.get("flap",0.0)) * 0.35
	for segment: int in range(segments-1,-1,-1):
		var sx: int = x - segment * 3 * scale
		var sy: int = y + roundi(sin(phase + segment * 0.7) * 2.0)
		_rect(sx-2*scale,sy-scale,5*scale,3*scale,colors[0] if segment%2 else colors[1])
	_rect(x-5*scale,y-3*scale,9*scale,6*scale,Color.WHITE if int(boss.get("hit",0))>0 else colors[2])
	_rect(x+2*scale,y-2*scale,3*scale,2*scale,colors[3])
	_pixel(x+2*scale,y-2*scale,Color8(245,225,112))

func _draw_boss_generic(x:int,y:int,boss:Dictionary) -> void:
	var flap:bool=floori(float(boss.get("flap",0.0))/2.0)%2==0; var body:Color=Color8(255,235,235) if int(boss.get("hit",0))>0 else Color8(76,40,56); var wing:Color=Color8(114,54,68)
	if flap: _rect(x-10,y-5,4,1,wing); _rect(x-12,y-4,5,1,wing); _rect(x-14,y-3,6,1,wing); _rect(x+7,y-5,4,1,wing); _rect(x+8,y-4,5,1,wing); _rect(x+8,y-3,6,1,wing)
	else: _rect(x-12,y-1,6,1,wing); _rect(x-14,y,7,1,wing); _rect(x-12,y+1,6,1,wing); _rect(x+7,y-1,6,1,wing); _rect(x+8,y,7,1,wing); _rect(x+7,y+1,6,1,wing)
	_rect(x-4,y-4,9,2,Color8(46,24,36)); _rect(x-6,y-1,13,5,Color8(46,24,36)); _rect(x-4,y+4,9,2,Color8(46,24,36)); _rect(x-1,y+6,3,1,Color8(46,24,36)); _rect(x-3,y-5,7,2,body); _rect(x-5,y-2,11,6,body); _rect(x-3,y+4,7,1,body); _rect(x-2,y-1,5,3,Color8(214,86,52)); _rect(x-1,y+2,3,1,Color8(214,86,52)); _pixel(x-1,y,Color8(255,192,88)); _pixel(x+1,y,Color8(255,192,88)); _pixel(x,y+1,Color8(255,192,88)); _pixel(x-2,y-3,Color8(245,72,56)); _pixel(x+2,y-3,Color8(245,72,56))

func _draw_sea_serpent(x: int, y: int, boss: Dictionary, origin: Vector2i) -> void:
	var water_y: int = roundi(float(boss.get("water_y",float(boss["y"])+10.0))) - origin.y
	var hit_flash: bool = int(boss.get("hit",0)) > 0
	var body: Color = Color8(238,250,255) if hit_flash else Color8(24,110,126)
	var phase: float = float(boss.get("flap",0.0)) * 0.28
	var segments: int = clampi(ceili(float(water_y-y+18)/3.0),5,11)
	for segment: int in range(segments-1,-1,-1):
		var sy: int = y + 5 + segment * 3
		var sx: int = x + roundi(sin(phase + segment * 0.72) * (3.0 + segment * 0.38))
		var submerged: bool = sy >= water_y
		_rect(sx-3,sy-1,7,3,Color8(18,77,109) if submerged else Color8(14,62,83))
		_rect(sx-2,sy-1,5,2,Color8(24,105,132) if submerged else body)
		if segment % 2 == 0:
			_rect(sx-4,sy,1,2,Color8(28,118,137) if submerged else Color8(38,154,151))
			_rect(sx+4,sy,1,2,Color8(28,118,137) if submerged else Color8(38,154,151))
	_rect(x-5,y-5,11,8,Color8(14,62,83))
	_rect(x-7,y-2,15,4,Color8(14,62,83))
	_rect(x-4,y+3,9,3,Color8(14,62,83))
	_rect(x-4,y-6,9,8,body)
	_rect(x-6,y-2,13,3,body)
	_rect(x-3,y+2,7,3,body)
	_rect(x-2,y-1,5,5,Color8(82,190,174))
	_rect(x-1,y+4,3,1,Color8(82,190,174))
	_rect(x-7,y-5,2,4,Color8(38,154,151))
	_rect(x+6,y-5,2,4,Color8(38,154,151))
	_pixel(x-3,y-4,Color8(255,220,96))
	_pixel(x+3,y-4,Color8(255,220,96))
	if String(boss.get("phase","")) == "emerge" or absi(y-water_y) < 18:
		var splash_phase: int = floori(float(boss.get("flap",0.0))) % 3
		_rect(x-10-splash_phase,water_y,5,1,Color8(164,225,238))
		_rect(x+6+splash_phase,water_y,5,1,Color8(164,225,238))

func _draw_bosses(origin: Vector2i) -> void:
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary = boss_value
		var x: int = roundi(float(boss["x"])) - origin.x
		var y: int = roundi(float(boss["y"])) - origin.y
		var hit: bool = int(boss.get("hit",0)) > 0
		match String(boss.get("kind","")):
			"sea_serpent":
				_draw_sea_serpent(x,y,boss,origin)
			"frost_colossus":
				var body: Color = Color.WHITE if hit else Color8(166,219,240)
				_rect(x-5,y-6,11,12,Color8(77,125,160))
				_rect(x-8,y-2,3,7,Color8(77,125,160))
				_rect(x+6,y-2,3,7,Color8(77,125,160))
				_rect(x-4,y-7,9,5,body)
				_rect(x-6,y-2,13,8,body)
				_pixel(x-2,y-5,Color8(229,248,255))
				_pixel(x+2,y-5,Color8(229,248,255))
			"bog_leviathan":
				var body: Color = Color8(235,247,208) if hit else Color8(84,126,63)
				_rect(x-9,y-3,19,7,Color8(55,70,43))
				_rect(x-7,y-6,15,4,Color8(55,70,43))
				_rect(x-8,y-4,17,7,body)
				_rect(x-6,y-7,13,4,body)
				_rect(x-4,y,9,2,Color8(37,30,27))
				_rect(x-1,y+2,5,1,Color8(166,71,79))
			"mycelial_monarch":
				var cap: Color = Color8(255,224,250) if hit else Color8(191,76,178)
				_rect(x-10,y-6,21,5,Color8(68,39,74))
				_rect(x-7,y-9,15,4,Color8(68,39,74))
				_rect(x-9,y-7,19,5,cap)
				_rect(x-6,y-10,13,4,cap)
				_rect(x-4,y-2,9,10,Color8(217,190,168))
				_pixel(x-2,y+1,Color8(75,35,76))
				_pixel(x+2,y+1,Color8(75,35,76))
			"bamboo_war_machine":
				var bamboo: Color = Color8(240,250,188) if hit else Color8(126,181,67)
				_rect(x-7,y-5,15,9,Color8(55,80,42))
				_rect(x-9,y-2,2,7,Color8(55,80,42))
				_rect(x+8,y-2,2,7,Color8(55,80,42))
				for ox: int in [-6,-3,0,3,6]:
					_rect(x+ox,y-4,2,8,bamboo)
				_rect(x-1,y-1,3,3,Color8(231,74,45))
			"canopy_wyrm":
				_draw_segmented_wyrm(x+7,y,boss,[Color8(35,97,56),Color8(57,132,70),Color8(81,166,91),Color8(28,50,34)],8)
				_rect(x-2,y-6,6,2,Color8(79,146,67))
				_rect(x+1,y+4,6,2,Color8(79,146,67))
			"crystal_burrower":
				_draw_segmented_wyrm(x+9,y,boss,[Color8(57,46,112),Color8(91,72,174),Color8(129,104,231),Color8(37,31,67)],10)
				for ox: int in [-14,-8,-2,4]:
					_rect(x+ox,y-4,1,3,Color8(216,207,255))
					_rect(x+ox-1,y-3,3,1,Color8(216,207,255))
			"magma_behemoth":
				var rock: Color = Color8(255,230,205) if hit else Color8(83,54,48)
				_rect(x-8,y-6,17,12,Color8(45,29,27))
				_rect(x-7,y-7,15,12,rock)
				_rect(x-3,y-4,2,7,Color8(231,69,28))
				_rect(x+2,y-2,2,7,Color8(231,69,28))
				_rect(x-1,y+3,4,2,Color8(231,69,28))
			"storm_roc":
				var wing_up: bool = floori(float(boss.get("flap",0.0))) % 4 < 2
				var feather: Color = Color.WHITE if hit else Color8(79,100,145)
				_rect(x-13,y-7 if wing_up else y,9,2,Color8(42,50,74))
				_rect(x+5,y-7 if wing_up else y,9,2,Color8(42,50,74))
				_rect(x-5,y-4,11,8,feather)
				_rect(x-2,y-6,5,3,feather)
				_rect(x+5,y-2,3,2,Color8(224,177,68))
			"moon_stalker":
				var body: Color = Color8(235,229,255) if hit else Color8(58,48,101)
				_rect(x-5,y-7,11,13,Color8(25,23,48))
				_rect(x-3,y-8,7,5,body)
				_rect(x-4,y-3,9,9,body)
				_pixel(x-1,y-6,Color8(210,202,255))
				_pixel(x+2,y-6,Color8(210,202,255))
			"drowned_fleet":
				var ratio: float = float(boss["hp"]) / maxf(1.0,float(boss["max_hp"]))
				var hull: Color = Color8(225,237,231) if hit else Color8(74,93,86)
				_rect(x-14,y,29,6,Color8(37,52,54))
				_rect(x-13,y-1,27,6,hull)
				_rect(x-10,y+5,21,2,hull)
				if ratio > 0.33:
					_rect(x,y-10,2,10,Color8(96,78,64))
					_rect(x+2,y-9,8,6,Color8(113,135,124))
					_rect(x-8,y-8,7,5,Color8(113,135,124))
				if ratio > 0.66:
					_rect(x-12,y-3,5,2,Color8(137,160,162))
					_rect(x+8,y-3,5,2,Color8(137,160,162))
			"sky_jellyfish":
				var dome: Color = Color.WHITE if hit else Color8(142,134,226)
				_rect(x-9,y-5,19,7,Color8(70,67,139))
				_rect(x-8,y-6,17,7,dome)
				_rect(x-6,y-9,13,4,dome)
				for tentacle: int in range(-6,7,3):
					var offset: int = roundi(sin(float(boss.get("flap",0.0))*0.3+tentacle)*2.0)
					_rect(x+tentacle,y+1,1,8+offset,Color8(94,85,183))
					_rect(x+tentacle+1,y+7+offset,2,1,Color8(94,85,183))
			"world_eater":
				_draw_segmented_wyrm(x+12,y,boss,[Color8(84,48,35),Color8(128,69,43),Color8(180,93,52),Color8(48,28,24)],11)
				_rect(x+10,y-1,5,3,Color8(39,23,21))
				_pixel(x+8,y-2,Color8(255,178,72))
			_:
				_draw_boss_generic(x,y,boss)

func _draw_projectiles(origin: Vector2i) -> void:
	for cat_value: Variant in state.entities["nyan_cats"]:
		var cat: Dictionary = cat_value
		var trail: Array = cat.get("trail",[])
		for index: int in range(trail.size()-2,-1,-1):
			var point: Vector2i = trail[index]
			var next_point: Vector2i = trail[index+1]
			var fade: float = float(index) / maxf(1.0,float(trail.size()-1))
			if fade > 0.92: continue
			for band: int in range(NYAN_RAINBOW.size()):
				_line(point.x-origin.x,point.y-origin.y-3+band,next_point.x-origin.x,next_point.y-origin.y-3+band,NYAN_RAINBOW[band])
		var x: int = roundi(float(cat["x"]))-origin.x
		var y: int = roundi(float(cat["y"]))-origin.y
		var facing: int = int(signf(float(cat.get("vx",1.0)))) if absf(float(cat.get("vx",0.0))) > 0.001 else 1
		var flap: int = floori(float(state.frame + roundi(float(cat.get("phase",0.0))*4.0))/4.0)%2
		_rect(mini(x-5*facing,x+4*facing),y-3,10,7,Color8(92,72,91))
		_rect(mini(x-4*facing,x+3*facing),y-2,8,5,Color8(237,181,114))
		_rect(mini(x-3*facing,x+2*facing),y-1,6,3,Color8(247,213,151))
		_rect(mini(x+4*facing,x+8*facing),y-3,5,6,Color8(126,127,145))
		_pixel(x+5*facing,y-2,Color8(207,210,220)); _pixel(x+7*facing,y-2,Color8(207,210,220)); _pixel(x+5*facing,y-1,Color8(42,43,55)); _pixel(x+7*facing,y-1,Color8(42,43,55))
		_rect(x-6*facing,y-1,2,2,Color8(126,127,145)); _rect(x-7*facing,y-2+(1 if flap else 0),2,1,Color8(126,127,145))
	for spark_value: Variant in state.entities["nyan_sparks"]:
		var spark: Dictionary = spark_value
		var x: int = roundi(float(spark["x"]))-origin.x; var y: int = roundi(float(spark["y"]))-origin.y
		_rect(x,y,2 if int(spark.get("life",0))>25 else 1,1,NYAN_RAINBOW[posmod(int(spark.get("color_index",0)),NYAN_RAINBOW.size())])
	for spark_value: Variant in state.entities["reality_sparks"]:
		var spark: Dictionary = spark_value
		var x: int = roundi(float(spark["x"]))-origin.x; var y: int = roundi(float(spark["y"]))-origin.y
		_rect(x,y,2 if int(spark.get("life",0))>27 and state.frame%3==0 else 1,2 if int(spark.get("life",0))>27 and state.frame%3==0 else 1,REALITY_COLORS[posmod(int(spark.get("color_index",0)),REALITY_COLORS.size())])
	for bullet_value: Variant in state.entities["bullets"]:
		var bullet: Dictionary=bullet_value; _rect(roundi(float(bullet["x"]))-origin.x,roundi(float(bullet["y"]))-origin.y,2,1,Color8(255,235,145))
	for spark_value: Variant in state.entities["laser_sparks"]:
		var spark: Dictionary = spark_value
		var x: int = roundi(float(spark["x"]))-origin.x; var y: int = roundi(float(spark["y"]))-origin.y; var life: int = int(spark.get("life",0))
		_rect(x,y,2 if life>10 else 1,1,Color8(255,248,204) if life>11 else Color8(255,176,62) if life>6 else Color8(235,76,32))
	for shot_value: Variant in state.entities["napalm_shots"]:
		var shot: Dictionary=shot_value; var x:int=roundi(float(shot["x"]))-origin.x; var y:int=roundi(float(shot["y"]))-origin.y; _rect(x-1,y-1,3,2,Color8(232,132,34)); _pixel(x,y,Color8(255,190,64))
	for grenade_value: Variant in state.entities["grenades"]:
		var grenade: Dictionary=grenade_value; var x:int=roundi(float(grenade["x"]))-origin.x; var y:int=roundi(float(grenade["y"]))-origin.y; _rect(x-1,y-1,3,3,Color8(42,54,42)); _rect(x-1,y-1,2,1,Color8(128,148,82))
		if int(grenade["fuse"])<24 and state.frame%6<3: _pixel(x+1,y-2,Color8(255,176,55))
	for blade_value: Variant in state.entities["glaives"]:
		var blade: Dictionary=blade_value; var x:int=roundi(float(blade["x"]))-origin.x; var y:int=roundi(float(blade["y"]))-origin.y; _pixel(x,y,Color8(215,230,238)); _pixel(x-1,y,Color8(115,164,190)); _pixel(x+1,y,Color8(115,164,190)); _pixel(x,y-1,Color8(115,164,190)); _pixel(x,y+1,Color8(115,164,190))
	for drone_value: Variant in state.entities["drones"]:
		var drone: Dictionary=drone_value; var x:int=roundi(float(drone["x"]))-origin.x; var y:int=roundi(float(drone["y"])+sin(float(drone.get("bob",0.0)))*0.45)-origin.y
		_rect(x-3,y-1,7,3,Color8(72,84,96)); _rect(x-1,y-2,3,2,Color8(148,166,176)); _rect(x-5,y-2,3,1,Color8(32,38,44)); _rect(x+3,y-2,3,1,Color8(32,38,44)); _pixel(x+(3 if int(drone.get("direction",1))>0 else -3),y,Color8(108,225,240))
		if not bool(drone.get("launched",false)): _rect(x,y+2,1,2,Color8(94,102,72))
	for rocket_value: Variant in state.entities["drone_rockets"]:
		var rocket: Dictionary=rocket_value; var x:int=roundi(float(rocket["x"]))-origin.x; var y:int=roundi(float(rocket["y"]))-origin.y; var angle:float=atan2(float(rocket["vy"]),float(rocket["vx"])); var tail_x:int=roundi(float(x)-cos(angle)*3.0); var tail_y:int=roundi(float(y)-sin(angle)*3.0)
		_line(tail_x,tail_y,x,y,Color8(226,230,220),2); _rect(tail_x-1,tail_y-1,2,2,Color8(255,232,126)); _pixel(roundi(float(tail_x)-cos(angle)*2.0),roundi(float(tail_y)-sin(angle)*2.0),Color8(255,104,36))

func _draw_hook(origin: Vector2i) -> void:
	var hook: Dictionary = state.entities["hook"]
	if not bool(hook.get("active",false)):
		return
	var hook_x: int = roundi(float(hook["x"]))-origin.x
	var hook_y: int = roundi(float(hook["y"]))-origin.y
	var player_x: int = roundi(float(state.player["x"]))-origin.x
	var player_y: int = roundi(float(state.player["y"])-2.0)-origin.y
	_line(player_x,player_y,hook_x,hook_y,Color8(185,190,200))
	_rect(hook_x-1,hook_y-1,3,3,Color8(240,205,80))

func _draw_pickups(origin: Vector2i) -> void:
	for pickup_value: Variant in state.entities["pickups"]:
		var pickup: Dictionary=pickup_value; var x:int=roundi(float(pickup["x"]))-origin.x; var y:int=roundi(float(pickup["y"])+sin(float(pickup.get("bob",0.0)))*0.5)-origin.y; var color:Color=Color8(240,210,100)
		if String(pickup["kind"])=="loot":
			var loot:Dictionary=FaunaData.loot(String(pickup["loot_id"])); var rgb:Array=loot.get("color",[235,210,150]); color=Color8(int(rgb[0]),int(rgb[1]),int(rgb[2]))
		else:
			var crop:Dictionary=GameData.crop(int(pickup["crop_id"])); var rgb:Array=crop.get("seed",[180,140,80]) if String(pickup["kind"])=="seed" else crop.get("fruit",[210,100,70]); color=Color8(int(rgb[0]),int(rgb[1]),int(rgb[2]))
		_rect(x-1,y-1,3,3,color); _pixel(x,y,Color.WHITE if int(pickup.get("cooked_flash",0))>0 and state.frame%4<2 else color)
	for seed_value:Variant in state.entities["seed_particles"]:
		var seed:Dictionary=seed_value; _pixel(roundi(float(seed["x"]))-origin.x,roundi(float(seed["y"]))-origin.y,Color8(210,180,102))

func _draw_explosions(origin: Vector2i) -> void:
	for effect_value:Variant in state.entities["explosions"]:
		var effect:Dictionary=effect_value; var life:float=float(effect["frames"])/maxf(1.0,float(effect.get("max_frames",effect["frames"]))); var radius:int=max(1,roundi(float(effect.get("radius",5))*(1.0-life*0.4))); var x:int=roundi(float(effect["x"]))-origin.x; var y:int=roundi(float(effect["y"]))-origin.y; var color:Color=Color8(255,185,72)
		if String(effect.get("kind",""))=="nyan": color=NYAN_RAINBOW[(state.frame/2)%NYAN_RAINBOW.size()]
		for angle_index:int in range(0,24):
			var angle:float=TAU*float(angle_index)/24.0; _pixel(x+roundi(cos(angle)*radius),y+roundi(sin(angle)*radius),color)


func _draw_juice_world(origin: Vector2i) -> void:
	for flash_value: Variant in state.entities["juice_flashes"]:
		var flash: Dictionary = flash_value
		var x: int = roundi(float(flash["x"])) - origin.x
		var y: int = roundi(float(flash["y"])) - origin.y
		var progress: float = float(flash["life"]) / maxf(1.0, float(flash["max_life"]))
		var radius: int = maxi(1, roundi(float(flash["radius"]) * (1.0 - progress * 0.35)))
		var color: Color = flash["color"]
		color.a = clampf(progress * 0.8, 0.0, 1.0)
		for oy: int in range(-radius, radius + 1):
			for ox: int in range(-radius, radius + 1):
				if ox * ox + oy * oy <= radius * radius:
					_blend_pixel(x + ox, y + oy, color)
	for wave_value: Variant in state.entities["juice_shockwaves"]:
		var wave: Dictionary = wave_value
		var x: int = roundi(float(wave["x"])) - origin.x
		var y: int = roundi(float(wave["y"])) - origin.y
		var progress: float = 1.0 - float(wave["life"]) / maxf(1.0, float(wave["max_life"]))
		var radius: int = maxi(1, roundi(float(wave["radius"]) * progress))
		var color: Color = wave["color"]
		color.a = clampf((1.0 - progress) * 0.8, 0.0, 1.0)
		for angle_step: int in range(0, 360, 12):
			var angle: float = deg_to_rad(float(angle_step))
			_blend_pixel(x + roundi(cos(angle) * radius), y + roundi(sin(angle) * radius), color)
	for item_value: Variant in state.entities["juice_particles"]:
		var item: Dictionary = item_value
		var x: int = roundi(float(item["x"])) - origin.x
		var y: int = roundi(float(item["y"])) - origin.y
		if x < -6 or y < -6 or x > GameConfig.WORLD_WIDTH + 6 or y > GameConfig.WORLD_HEIGHT + 6:
			continue
		var color: Color = item["color"] if item["color"] is Color else Color.WHITE
		var progress: float = float(item["life"]) / maxf(1.0, float(item["max_life"]))
		color.a *= clampf(progress * 1.4, 0.0, 1.0)
		var kind: String = String(item.get("kind", "pixel"))
		var size: int = int(item.get("size", 1))
		if int(item.get("twinkle", 0)) > 0 and state.frame % maxi(1, int(item["twinkle"])) == 0:
			size += 1
		match kind:
			"star":
				_blend_rect(x - 1, y, 3, 1, color)
				_blend_rect(x, y - 1, 1, 3, color)
			"slash":
				var horizontal: bool = absf(float(item["vx"])) >= absf(float(item["vy"]))
				_blend_rect(x - (1 if horizontal else 0), y - (0 if horizontal else 1), 3 if horizontal else 1, 1 if horizontal else 3, color)
			"streak":
				var speed: float = Vector2(float(item["vx"]), float(item["vy"])).length()
				var length: int = clampi(roundi(speed * 3.0), 2, 5)
				if absf(float(item["vx"])) >= absf(float(item["vy"])):
					var direction: int = int(signf(float(item["vx"]))) if absf(float(item["vx"])) > 0.001 else 1
					_blend_rect(x - direction * length, y, length, 1, color)
				else:
					var direction: int = int(signf(float(item["vy"]))) if absf(float(item["vy"])) > 0.001 else 1
					_blend_rect(x, y - direction * length, 1, length, color)
			_:
				_blend_rect(x, y, size, size, color)
	for number_value: Variant in state.entities["damage_numbers"]:
		var number_data: Dictionary = number_value
		var x: int = roundi(float(number_data["x"])) - origin.x
		var y: int = roundi(float(number_data["y"])) - origin.y
		var scale: int = 2 if bool(number_data.get("big", false)) and float(number_data["life"]) > float(number_data["max_life"]) * 0.58 else 1
		var text: String = String(number_data["text"])
		var width: int = PixelFont.text_width(text, scale, scale)
		PixelFont.draw(image, text, x - floori(width * 0.5) + 1, y + 1, Color(0.05, 0.03, 0.07, 0.78), scale, scale)
		PixelFont.draw(image, text, x - floori(width * 0.5), y, number_data["color"], scale, scale)

func _draw_juice_screen() -> void:
	var speed: float = clampf(float(state.juice.get("speed_intensity", 0.0)), 0.0, 1.0)
	if speed > 0.02:
		var count: int = roundi(4.0 + speed * 18.0)
		for index: int in range(count):
			var value: int = absi(_hash(index * 2017 + floori(state.frame / 2.0)))
			var x: int = value % GameConfig.WORLD_WIDTH
			var y: int = (value >> 9) % GameConfig.WORLD_HEIGHT
			var direction: int = int(signf(float(state.player.get("vx", 1.0)))) if absf(float(state.player.get("vx", 0.0))) > 0.001 else 1
			var length: int = 2 + roundi(speed * 6.0) + index % 3
			_blend_rect(x - direction * length, y, length, 1, Color(0.85, 0.93, 1.0, 0.28))
	var hp_ratio: float = clampf(float(state.player["hp"]) / 100.0, 0.0, 1.0)
	if hp_ratio < 0.28 and not bool(state.ui["inventory_open"]) and not bool(state.ui["world_menu_open"]):
		var pulse: float = (sin(state.frame * 0.18) + 1.0) * 0.5
		var thickness: int = 1 + roundi((1.0 - hp_ratio) * 3.0 + pulse)
		var red: Color = Color(0.57, 0.07, 0.13, 0.16 + pulse * 0.12)
		_blend_rect(0, 0, GameConfig.WORLD_WIDTH, thickness, red)
		_blend_rect(0, GameConfig.WORLD_HEIGHT - thickness, GameConfig.WORLD_WIDTH, thickness, red)
		_blend_rect(0, 0, thickness, GameConfig.WORLD_HEIGHT, red)
		_blend_rect(GameConfig.WORLD_WIDTH - thickness, 0, thickness, GameConfig.WORLD_HEIGHT, red)
	if int(state.juice.get("screen_flash", 0)) > 0:
		var flash_color: Color = state.juice.get("screen_flash_color", Color(1.0, 1.0, 1.0, 0.2))
		_blend_rect(0, 0, GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT, flash_color)

func _draw_visibility_haze(weather: Dictionary) -> void:
	var haze_strength: float = maxf(0.0, (1.0 - float(weather.get("visibility",1.0))) * 0.68)
	if haze_strength <= 0.025:
		return
	var type: String = String(weather["type"])
	var colors: Dictionary = {"fog":Color8(194,204,211),"blizzard":Color8(222,232,238),"ocean_storm":Color8(142,164,181),"ashfall":Color8(94,82,78),"spore_haze":Color8(114,78,128)}
	var color: Color = colors.get(type, Color8(194,204,211))
	var alpha: float = minf(0.34, 0.055 + haze_strength * 0.48)
	var slow_frame: int = floori(float(state.frame) / 18.0)
	var wind_drift: int = floori(float(state.frame) * float(weather.get("wind_x",0.0)) * 0.08)
	var bank_count: int = 8 + roundi(haze_strength * 18.0)
	for bank: int in range(bank_count):
		var value: int = absi(_hash(bank * 3253 + int(weather.get("segment",0)) * 1877 + 41))
		var width: int = 24 + ((value >> 2) % 72)
		var height: int = 2 + ((value >> 9) % 7)
		var direction: int = -1 if bank % 3 == 0 else 1
		var base_x: int = posmod((value % GameConfig.WORLD_WIDTH) + wind_drift + slow_frame * direction, GameConfig.WORLD_WIDTH)
		var base_y: int = 3 + ((value >> 17) % maxi(1, GameConfig.WORLD_HEIGHT - 8))
		for row: int in range(height):
			var row_value: int = absi(_hash(value + row * 811 + 97))
			var max_inset: int = maxi(2, floori(float(width) * 0.18))
			var inset: int = row_value % max_inset
			var row_shift: int = ((row_value >> 7) % 7) - 3
			var row_width: int = maxi(4, width - inset * 2 - ((row_value >> 13) % 9))
			var first_width: int = mini(row_width, GameConfig.WORLD_WIDTH - base_x)
			_blend_rect(base_x + inset + row_shift, base_y + row, first_width, 1, Color(color.r,color.g,color.b,alpha))
			if first_width < row_width:
				_blend_rect(0, base_y + row, row_width - first_width, 1, Color(color.r,color.g,color.b,alpha))
	var fleck_count: int = 10 + roundi(haze_strength * 36.0)
	for index: int in range(fleck_count):
		var value: int = absi(_hash(index * 4937 + int(weather.get("segment",0)) * 659 + 173))
		var x: int = posmod((value % GameConfig.WORLD_WIDTH) + wind_drift + floori(float(slow_frame)/2.0), GameConfig.WORLD_WIDTH)
		var y: int = 2 + ((value >> 10) % maxi(1, GameConfig.WORLD_HEIGHT - 4))
		_blend_rect(x, y, 2 if ((value >> 21) % 5 == 0) else 1, 1, Color(color.r,color.g,color.b,maxf(0.035,alpha*0.52)))

func _draw_weather(origin: Vector2i) -> void:
	var weather: Dictionary = weather_system.get_weather()
	var intensity: float = float(weather["intensity"])
	if intensity <= 0.02:
		return
	var weather_type: String = String(weather["type"])
	var segment: int = int(weather["segment"])
	var wind: float = float(weather["wind_x"])
	if weather_type in ["rain","thunderstorm","ocean_storm"]:
		var count: int = roundi((48.0 if weather_type == "rain" else 88.0) * intensity)
		var speed: int = 3 if weather_type == "rain" else 4
		for index: int in range(count):
			var value: int = absi(_hash(index * 1777 + segment * 991))
			var x: int = posmod((value % GameConfig.WORLD_WIDTH) + floori(float(state.frame) * wind * 0.32), GameConfig.WORLD_WIDTH)
			var y: int = posmod(((value >> 8) % GameConfig.WORLD_HEIGHT) + state.frame * speed + index * 7, GameConfig.WORLD_HEIGHT)
			var wind_step: int = int(signf(wind))
			_line(x, y, x + wind_step, y + (2 if weather_type == "rain" else 3), Color(139.0/255.0,199.0/255.0,235.0/255.0,0.8) if weather_type == "rain" else Color(185.0/255.0,224.0/255.0,248.0/255.0,0.9))
	elif weather_type in ["snow","blizzard"]:
		var count: int = roundi((55.0 if weather_type == "snow" else 105.0) * intensity)
		for index: int in range(count):
			var value: int = absi(_hash(index * 2099 + segment * 613))
			var sway: int = roundi(sin(float(state.frame + index * 11) * 0.08) * (3.0 if weather_type == "blizzard" else 1.0))
			var x: int = posmod((value % GameConfig.WORLD_WIDTH) + floori(float(state.frame) * wind * 0.45) + sway, GameConfig.WORLD_WIDTH)
			var y: int = posmod(((value >> 9) % GameConfig.WORLD_HEIGHT) + floori(float(state.frame) / (2.0 if weather_type == "blizzard" else 3.0)) + index * 5, GameConfig.WORLD_HEIGHT)
			_rect(x,y,2 if weather_type == "blizzard" and index % 5 == 0 else 1,1,Color(0.96,0.98,1.0,0.95))
	elif weather_type == "ashfall":
		for index: int in range(roundi(72.0 * intensity)):
			var value: int = absi(_hash(index * 2371 + segment * 701))
			var x: int = posmod((value % GameConfig.WORLD_WIDTH) + floori(float(state.frame) * wind * 0.25), GameConfig.WORLD_WIDTH)
			var y: int = posmod(((value >> 8) % GameConfig.WORLD_HEIGHT) + floori(float(state.frame)/3.0) + index * 3, GameConfig.WORLD_HEIGHT)
			_pixel(x,y,Color(160.0/255.0,119.0/255.0,91.0/255.0,0.9) if index % 4 == 0 else Color(97.0/255.0,85.0/255.0,82.0/255.0,0.86))
	elif weather_type == "cave_drip":
		for index: int in range(roundi(20.0 * intensity)):
			var value: int = absi(_hash(index * 1871 + segment * 433))
			var x: int = value % GameConfig.WORLD_WIDTH
			var y: int = posmod(((value >> 8) % GameConfig.WORLD_HEIGHT) + state.frame * 2 + index * 13, GameConfig.WORLD_HEIGHT)
			_blend_rect(x,y,1,2,Color(112.0/255.0,181.0/255.0,224.0/255.0,0.8))
	elif weather_type == "spore_haze":
		for index: int in range(roundi(64.0 * intensity)):
			var value: int = absi(_hash(index * 2791 + segment * 557))
			var x: int = posmod((value % GameConfig.WORLD_WIDTH) + roundi(sin(float(state.frame + index * 17) * 0.025) * 4.0), GameConfig.WORLD_WIDTH)
			var y: int = posmod(((value >> 8) % GameConfig.WORLD_HEIGHT) - floori(float(state.frame)/5.0) + index * 3, GameConfig.WORLD_HEIGHT)
			_blend_pixel(x,y,Color(231.0/255.0,148.0/255.0,218.0/255.0,0.82) if index % 3 == 0 else Color(154.0/255.0,93.0/255.0,177.0/255.0,0.66))
	elif weather_type == "breeze":
		for index: int in range(roundi(18.0 * intensity)):
			var value: int = absi(_hash(index * 1597 + segment * 379))
			var x: int = posmod((value % GameConfig.WORLD_WIDTH) + floori(float(state.frame) * wind), GameConfig.WORLD_WIDTH)
			var y: int = 5 + ((value >> 8) % (GameConfig.WORLD_HEIGHT - 10))
			_line(x,y,x+int(signf(wind))*3,y,Color(224.0/255.0,235.0/255.0,238.0/255.0,0.32))
	for flash_value: Variant in state.weather["flashes"]:
		var flash: Dictionary = flash_value
		var target_x: int = roundi(float(flash["x"])) - origin.x
		var target_y: int = roundi(float(flash["y"])) - origin.y
		var x: int = target_x
		var y: int = 0
		var bright: bool = int(flash["frames"]) % 4 < 2
		while y < target_y:
			var next_y: int = mini(target_y, y + 5)
			var next_x: int = x + (absi(_hash(y + int(flash["x"]) + int(flash["frames"]))) % 3) - 1
			_line(x,y,next_x,next_y,Color.WHITE if bright else Color8(161,190,235),2 if bright else 1)
			x = next_x
			y = next_y
	if weather_type in ["fog","blizzard","ocean_storm","ashfall","spore_haze"]:
		_draw_visibility_haze(weather)
	if weather_type == "heatwave":
		for x: int in range((state.frame >> 2) % 5, GameConfig.WORLD_WIDTH, 5):
			var y: int = 8 + posmod(absi(_hash(x + segment)) % 83 + floori(float(state.frame)/6.0), 83)
			_blend_rect(x,y,1,2,Color(1.0,188.0/255.0,102.0/255.0,0.12))

func _draw_portals(origin: Vector2i) -> void:
	var portal: Dictionary = state.world["dimension_portal"]
	if not bool(portal.get("active",false)):
		return
	var center_x: int = roundi(float(portal["x"]))-origin.x; var center_y: int = roundi(float(portal["y"]))-origin.y
	var opening: float = minf(1.0,float(portal.get("timer",0))/10.0)
	var phase_name: String = String(portal.get("phase","idle"))
	var closing: float = maxf(0.0,1.0-float(portal.get("timer",0))/(28.0 if phase_name=="arrival" else 18.0)) if phase_name=="closing" or phase_name=="arrival" else 1.0
	var scale: float = maxf(0.15,opening*closing); var radius_x:int=maxi(1,roundi(5.0*scale)); var radius_y:int=maxi(2,roundi(9.0*scale))
	var definition: Dictionary = GameData.dimension(String(portal.get("target_dimension","moon"))); var colors:Array=portal.get("colors",definition.get("portal_colors",[[91,229,255],[130,128,255],[207,92,255],[255,103,205],[244,238,255]]))
	_blend_rect(center_x-radius_x+1,center_y-radius_y+2,maxi(1,radius_x*2-1),maxi(2,radius_y*2-3),Color(20.0/255.0,9.0/255.0,45.0/255.0,0.88))
	var phase: float = float(state.frame+int(portal.get("timer",0))*2)*0.22
	for step: int in range(30):
		var angle: float = phase+float(step)/30.0*TAU; var wobble:float=1.0+sin(phase*1.7+float(step)*0.9)*0.12; var x:int=center_x+roundi(cos(angle)*float(radius_x)*wobble); var y:int=center_y+roundi(sin(angle)*float(radius_y)); var rgb:Array=colors[(step+floori(float(state.frame)/3.0))%colors.size()]; _rect(x,y,2 if step%5==0 else 1,2 if step%4==0 else 1,Color8(int(rgb[0]),int(rgb[1]),int(rgb[2])))
	if phase_name == "transit": _blend_rect(center_x-radius_x-2,center_y-1,radius_x*2+5,2,Color(1,1,1,0.46))

func _draw_dotted_beam(start_x: float, start_y: float, end_x: float, end_y: float, color: Color) -> void:
	var delta: Vector2 = Vector2(end_x - start_x, end_y - start_y)
	var distance: float = maxf(1.0, delta.length())
	var step: int = 1
	while float(step) < distance:
		var t: float = float(step) / distance
		_blend_pixel(roundi(start_x + delta.x * t), roundi(start_y + delta.y * t), color)
		step += 2

func _draw_target_corners(x: int, y: int, color: Color, size: int = 5) -> void:
	var half: int = floori(float(size) * 0.5)
	var left: int = x - half
	var top: int = y - half
	var right: int = x + half
	var bottom: int = y + half
	_rect(left,top,2,1,color); _rect(left,top,1,2,color); _rect(right-1,top,2,1,color); _rect(right,top,1,2,color)
	_rect(left,bottom,2,1,color); _rect(left,bottom-1,1,2,color); _rect(right-1,bottom,2,1,color); _rect(right,bottom-1,1,2,color)

func _draw_invalid_cross(x: int, y: int, color: Color) -> void:
	for point: Vector2i in [Vector2i(-2,-2),Vector2i(2,-2),Vector2i(-1,-1),Vector2i(1,-1),Vector2i(0,0),Vector2i(-1,1),Vector2i(1,1),Vector2i(-2,2),Vector2i(2,2)]:
		_pixel(x + point.x, y + point.y, color)

func _draw_laser_heated_pixels(origin: Vector2i) -> void:
	for hot_value: Variant in state.laser.get("hot_pixels", []):
		var hot: Dictionary = hot_value
		var x: int = int(hot["x"]) - origin.x
		var y: int = int(hot["y"]) - origin.y
		var ratio: float = clampf(float(hot["heat"]) / 112.0, 0.0, 1.0)
		var color: Color = Color(1.0,246.0/255.0,210.0/255.0,0.9) if ratio > 0.72 else Color(1.0,142.0/255.0,46.0/255.0,0.72) if ratio > 0.34 else Color(215.0/255.0,57.0/255.0,31.0/255.0,0.48)
		_blend_pixel(x,y,color)

func _draw_laser_rifle(origin: Vector2i) -> void:
	if not bool(state.laser.get("active",false)) or state.laser.get("beam",null) == null:
		return
	var beam: Dictionary = state.laser["beam"]
	var start_x: int = int(beam["start_x"]) - origin.x
	var start_y: int = int(beam["start_y"]) - origin.y
	var end_x: int = int(beam["end_x"]) - origin.x
	var end_y: int = int(beam["end_y"]) - origin.y
	_line(start_x,start_y,end_x,end_y,Color8(141,26,34),3)
	_line(start_x,start_y,end_x,end_y,Color8(255,82,46),2)
	_line(start_x,start_y,end_x,end_y,Color8(255,250,214) if state.frame % 4 < 2 else Color8(255,208,105),1)
	var heat: float = clampf(float(state.laser.get("contact_heat",0.0)) / 112.0, 0.0, 1.0)
	var impact_color: Color = Color8(255,250,224) if heat > 0.7 else Color8(255,178,62) if heat > 0.35 else Color8(255,92,42)
	_rect(end_x-1,end_y-1,3,3,impact_color); _pixel(end_x,end_y,Color8(255,248,220))
	if state.frame % 3 == 0:
		_pixel(end_x-2,end_y,Color8(255,113,36)); _pixel(end_x+2,end_y-1,Color8(255,113,36))

func _draw_reality_rifts(origin: Vector2i) -> void:
	for rift_value: Variant in state.entities["reality_rifts"]:
		var rift: Dictionary = rift_value
		var start_x: int = int(rift["start_x"]) - origin.x
		var start_y: int = int(rift["start_y"]) - origin.y
		var end_x: int = int(rift["end_x"]) - origin.x
		var end_y: int = int(rift["end_y"]) - origin.y
		var opening: float = minf(1.0, float(rift.get("age",0)) / maxf(1.0,float(GameConfig.REALITY_ZIPPER["opening_frames"])))
		var closing: float = maxf(0.0, float(rift.get("life",0)) / maxf(1.0,float(GameConfig.REALITY_ZIPPER["closing_frames"]))) if String(rift.get("phase","")) == "closing" else 1.0
		var strength: float = maxf(0.08, opening * closing)
		var spread: int = maxi(1, roundi((float(GameConfig.REALITY_ZIPPER["split_distance"]) + 1.0) * strength))
		var normal_x: int = int(rift.get("normal_x",0)); var normal_y: int = int(rift.get("normal_y",1))
		for band: int in range(-spread,spread+1):
			if band == 0: continue
			var wobble: int = roundi(sin(float(state.frame)*0.21 + float(band)*1.7 + float(rift.get("age",0))*0.09))
			var offset: int = band + (wobble if absi(band) == spread else 0)
			var color: Color = REALITY_COLORS[posmod(band + floori(float(state.frame)/3.0) + int(rift.get("age",0)) + REALITY_COLORS.size()*4,REALITY_COLORS.size())]
			_line(start_x+normal_x*offset,start_y+normal_y*offset,end_x+normal_x*offset,end_y+normal_y*offset,color,2 if absi(band)==1 and state.frame%4<2 else 1)
		_line(start_x,start_y,end_x,end_y,Color8(8,3,20),3)
		_line(start_x,start_y,end_x,end_y,Color.WHITE if state.frame%4<2 else Color8(36,10,68),1)
		var points: Array = rift.get("points",[])
		var point_step: int = maxi(3, floori(float(points.size()) / 18.0))
		for index: int in range(0, points.size(), point_step):
			var point: Vector2i = points[index]
			var side: int = 1 if index % 2 == 0 else -1
			var oscillation: int = roundi(sin(float(index)*0.8 + float(state.frame)*0.28) * 2.0)
			var ghost_x: int = point.x-origin.x + normal_x*(spread+2+oscillation)*side
			var ghost_y: int = point.y-origin.y + normal_y*(spread+2+oscillation)*side
			_rect(ghost_x-1,ghost_y-1,3 if index%3==0 else 2,2 if index%4==0 else 1,REALITY_COLORS[(index+floori(float(state.frame)/2.0))%REALITY_COLORS.size()])
		for endpoint: Vector2i in [Vector2i(start_x,start_y),Vector2i(end_x,end_y)]:
			var size: int = 3 + roundi(absf(sin(float(state.frame)*0.16))*2.0)
			for ring: int in range(3):
				var color: Color = REALITY_COLORS[(ring+floori(float(state.frame)/4.0))%REALITY_COLORS.size()]
				_rect(endpoint.x-size+ring,endpoint.y-ring,maxi(1,(size-ring)*2+1),1,color)
				_rect(endpoint.x-ring,endpoint.y-size+ring,1,maxi(1,(size-ring)*2+1),color)
			_rect(endpoint.x-1,endpoint.y-1,3,3,Color8(5,1,14)); _pixel(endpoint.x,endpoint.y,Color.WHITE)

func _draw_weapon_effects(origin: Vector2i) -> void:
	_draw_reality_rifts(origin)
	_draw_laser_heated_pixels(origin)
	if state.sword_timer > 0:
		var angle: float = state.sword_angle - 0.9 + (1.0 - float(state.sword_timer) / 12.0) * 1.8
		_line(roundi(float(state.player["x"]))-origin.x,roundi(float(state.player["y"])-3.0)-origin.y,roundi(float(state.player["x"])+cos(angle)*8.0)-origin.x,roundi(float(state.player["y"])-3.0+sin(angle)*8.0)-origin.y,Color8(235,240,250),2)
	if bool(state.build["active"]):
		var preview: Dictionary = weapons.get_build_preview()
		var start_x: int = roundi(float(state.player["x"]))-origin.x; var start_y: int = roundi(float(state.player["y"])-2.0)-origin.y
		var target_x: int = int(preview["x"])-origin.x; var target_y: int = int(preview["y"])-origin.y
		var color: Color = Color8(89,225,245) if bool(preview["valid"]) else Color8(255,104,112)
		_draw_pixel_circle(start_x,start_y,roundi(float(GameConfig.BUILD["range"])),Color(89.0/255.0,225.0/255.0,245.0/255.0,0.28))
		_draw_dotted_beam(start_x,start_y,target_x,target_y,color)
		if bool(preview.get("is_furniture",false)):
			var ghost: Dictionary = {"furniture_id":String(preview["furniture_id"]),"x":int(preview["x"]),"y":int(preview["y"]),"on":true,"open":false,"dimension":state.world["dimension"]}
			_draw_furniture_entity(ghost,origin,true)
			var bounds: Rect2i = GameData.furniture_bounds(ghost)
			_draw_pixel_box(bounds.position.x-origin.x,bounds.position.y-origin.y,bounds.size.x,bounds.size.y,color)
		elif bool(preview["valid"]):
			var ghost_color: Color = palette.color(int(preview["type"]),8,target_x,target_y)
			ghost_color.a = 0.76
			_blend_pixel(target_x,target_y,ghost_color)
			_draw_target_corners(target_x,target_y,color,7)
		else:
			_draw_invalid_cross(target_x,target_y,color)
	elif state.weapon_id == 6:
		var preview: Dictionary = weapons.get_destruculator_preview()
		var start_x: int = roundi(float(state.player["x"]))-origin.x; var start_y: int = roundi(float(state.player["y"])-2.0)-origin.y
		var target_x: int = int(preview["x"])-origin.x; var target_y: int = int(preview["y"])-origin.y
		var color: Color = Color8(224,105,255) if bool(preview["valid"]) else Color8(255,104,112)
		_draw_pixel_circle(start_x,start_y,roundi(WeaponSystem.DESTRUCULATOR_RANGE),Color(224.0/255.0,105.0/255.0,1.0,0.28))
		_draw_dotted_beam(start_x,start_y,target_x,target_y,color)
		if bool(preview["valid"]): _draw_target_corners(target_x,target_y,color,7)
		else: _draw_invalid_cross(target_x,target_y,color)
	elif state.weapon_id == 7:
		var preview: Dictionary = weapons.get_drone_strike_preview()
		var target_x: int = int(preview["x"])-origin.x; var target_y: int = int(preview["y"])-origin.y
		var pointer_x: int = int(preview.get("pointer_x",preview["x"]))-origin.x; var pointer_y: int = int(preview.get("pointer_y",preview["y"]))-origin.y
		var color: Color = Color8(255,178,58) if bool(preview["valid"]) else Color8(255,104,112)
		if bool(preview.get("snapped",false)): _draw_dotted_beam(pointer_x,pointer_y,target_x,target_y,Color(1.0,214.0/255.0,128.0/255.0,0.72))
		if bool(preview["valid"]):
			var entry_x: int = int(preview["entry_x"])-origin.x; var entry_y: int = int(preview["entry_y"])-origin.y
			_draw_dotted_beam(entry_x,entry_y,target_x,entry_y,Color(132.0/255.0,225.0/255.0,242.0/255.0,0.9)); _draw_dotted_beam(target_x,entry_y,target_x,target_y,color)
			_rect(entry_x-2,entry_y-1,5,3,Color8(132,225,242)); _draw_pixel_circle(target_x,target_y,15,Color(1.0,178.0/255.0,58.0/255.0,0.75)); _draw_target_corners(target_x,target_y,color,11); _pixel(target_x,target_y,color)
		else:
			_draw_invalid_cross(pointer_x,pointer_y,color); _draw_pixel_circle(pointer_x,pointer_y,7,Color(1.0,104.0/255.0,112.0/255.0,0.45))
	elif state.weapon_id == 8:
		_draw_laser_rifle(origin)
	if int(state.tool_effect.get("frames",0)) > 0:
		var effect_x: int = int(state.tool_effect.get("x",0))-origin.x; var effect_y: int = int(state.tool_effect.get("y",0))-origin.y
		_draw_target_corners(effect_x,effect_y,Color8(244,190,255) if bool(state.tool_effect.get("valid",false)) else Color8(255,104,112),9)

func _draw_pointer_cursor() -> void:
	if not bool(state.input.get("pointer_inside",false)):
		return
	var color: Color = Color(238.0/255.0,244.0/255.0,1.0,0.98)
	if bool(state.build["active"]): color = Color(180.0/255.0,248.0/255.0,1.0,0.98)
	elif bool(state.seed_mode["active"]): color = Color(210.0/255.0,242.0/255.0,150.0/255.0,0.98)
	elif state.weapon_id == 6: color = Color(248.0/255.0,238.0/255.0,1.0,0.98)
	elif state.weapon_id == 7: color = Color(1.0,246.0/255.0,220.0/255.0,0.98)
	elif state.weapon_id == 8: color = Color(1.0,104.0/255.0,92.0/255.0,0.98) if bool(state.laser.get("overheated",false)) else Color(1.0,229.0/255.0,170.0/255.0,0.98)
	elif state.weapon_id == 10: color = Color(1.0,77.0/255.0,225.0/255.0,0.98) if state.frame%6<3 else Color(67.0/255.0,244.0/255.0,1.0,0.98)
	var x: int = roundi(float(state.input["pointer_x"])); var y: int = roundi(float(state.input["pointer_y"]))
	_rect(x-4,y,3,1,color); _rect(x+2,y,3,1,color); _rect(x,y-4,1,3,color); _rect(x,y+2,1,3,color); _pixel(x,y,color)

func _draw_magnifier() -> void:
	if not bool(state.input.get("pointer_inside",false)) or float(state.magnifier.get("zoom",1.0)) <= float(GameConfig.MAGNIFIER["min_zoom"]):
		return
	var radius: int = maxi(2, roundi(float(state.magnifier.get("radius",GameConfig.MAGNIFIER["radius"]))))
	var center_x: int = roundi(float(state.input["pointer_x"])); var center_y: int = roundi(float(state.input["pointer_y"]))
	var source: Image = image.duplicate()
	var outer_squared: int = radius * radius; var white_squared: int = (radius-1)*(radius-1); var image_squared: int = (radius-2)*(radius-2)
	var zoom: float = float(state.magnifier["zoom"])
	for offset_y: int in range(-radius,radius+1):
		for offset_x: int in range(-radius,radius+1):
			var distance_squared: int = offset_x*offset_x + offset_y*offset_y
			if distance_squared > outer_squared: continue
			var destination_x: int = center_x+offset_x; var destination_y: int = center_y+offset_y
			if not _inside(destination_x,destination_y): continue
			if distance_squared > white_squared: _pixel(destination_x,destination_y,Color8(15,18,26)); continue
			if distance_squared > image_squared: _pixel(destination_x,destination_y,Color8(245,248,255)); continue
			var source_x: int = clampi(roundi(float(center_x)+float(offset_x)/zoom),0,GameConfig.WORLD_WIDTH-1)
			var source_y: int = clampi(roundi(float(center_y)+float(offset_y)/zoom),0,GameConfig.WORLD_HEIGHT-1)
			_pixel(destination_x,destination_y,source.get_pixel(source_x,source_y))

func _draw_bar(x:int,y:int,width:int,value:float,maximum:float,back:Color,fill:Color) -> void:
	_rect(x,y,width,4,back); var amount:int=clampi(roundi(float(width-2)*clampf(value/maxf(1.0,maximum),0.0,1.0)),0,width-2); _rect(x+1,y+1,amount,2,fill)

func _ui_rect(kind:String,x:int,y:int,width:int,height:int,extra:Dictionary={}) -> void:
	var entry:Dictionary={"kind":kind,"x":x,"y":y,"w":width,"h":height}; entry.merge(extra,true); (state.ui["inventory_rects"] as Array).append(entry)

func _draw_hud() -> void:
	var hud:Dictionary=state.ui.get("hud",{})
	if hud.is_empty():return
	(state.ui["inventory_rects"] as Array).clear()
	_blend_rect(4,4,118,31,Color(0.02,0.025,0.04,0.72))
	PixelFont.draw(image,"HP",8,8,Color8(244,230,210)); _draw_bar(22,8,62,float(hud["hp"]),100.0,Color8(63,41,48),Color8(216,65,72)); PixelFont.draw(image,str(hud["hp"]),89,8,Color.WHITE)
	PixelFont.draw(image,"FOOD",8,15,Color8(244,230,210)); _draw_bar(30,15,54,float(hud["hunger"]),100.0,Color8(62,50,35),Color8(221,158,61))
	if bool(hud.get("breath_using",false)) or float(hud.get("breath",100))<100.0:
		PixelFont.draw(image,"AIR",8,22,Color8(224,241,249)); _draw_bar(26,22,58,float(hud["breath"]),100.0,Color8(34,51,66),Color8(87,190,229))
	PixelFont.draw(image,String(hud["weapon"]).replace("_"," "),8,29,Color8(244,230,210),1,1,108)
	var region_text:String="%s  %s"%[String(hud["region"]),String(hud["biome"]).to_upper()]; PixelFont.draw(image,region_text,128,6,Color(1,1,1,0.82),1,1,224)
	PixelFont.draw(image,String(hud["time"]),128,13,Color(1,1,1,0.72),1,1,224); PixelFont.draw(image,String(hud["weather"]),128,20,Color(1,1,1,0.72),1,1,224)
	for item_index:int in range(min(4,(state.ui.get("pickup_feed",[]) as Array).size())):
		var feed:Dictionary=(state.ui["pickup_feed"] as Array)[item_index]; PixelFont.draw(image,String(feed["text"]),GameConfig.WORLD_WIDTH-112,30+item_index*7,Color8(216,245,191),1,1,108)
	var buttons:Array=[{"kind":"inventory-toggle","label":"I INVENTORY","x":5},{"kind":"crafting-toggle","label":"K CRAFT","x":57},{"kind":"world-toggle","label":"O WORLDS","x":101},{"kind":"save-current","label":"F5 SAVE","x":151},{"kind":"pause-toggle","label":"P PAUSE","x":193}]
	for button:Dictionary in buttons:
		var width:int=PixelFont.text_width(String(button["label"]))+6; _blend_rect(int(button["x"]),GameConfig.WORLD_HEIGHT-12,width,9,Color(0.02,0.025,0.04,0.74)); PixelFont.draw(image,String(button["label"]),int(button["x"])+3,GameConfig.WORLD_HEIGHT-10,Color(1,1,1,0.78)); _ui_rect(String(button["kind"]),int(button["x"]),GameConfig.WORLD_HEIGHT-12,width,9)
	if not String(state.ui.get("tool_status","")).is_empty():
		var text:String=String(state.ui["tool_status"]); var width:int=min(344,PixelFont.text_width(text)+8); _blend_rect(8,GameConfig.WORLD_HEIGHT-25,width,9,Color(0.02,0.025,0.04,0.72)); PixelFont.draw(image,text,12,GameConfig.WORLD_HEIGHT-23,Color8(230,236,220),1,1,width-8)
	if not String(state.ui.get("message","")).is_empty():
		var message:String=String(state.ui["message"]); var width:int=min(344,PixelFont.text_width(message)+10); var x:int=(GameConfig.WORLD_WIDTH-width)/2; _blend_rect(x,43,width,11,Color(0.02,0.025,0.04,0.82)); PixelFont.draw(image,message,x+5,46,Color.WHITE,1,1,width-10)
	_draw_boss_ui()
	if bool(state.ui["inventory_open"]): _draw_inventory_panel()
	elif bool(state.ui["crafting_open"]): _draw_crafting_panel()
	elif bool(state.ui["world_menu_open"]): _draw_world_panel()
	elif state.paused:
		_blend_rect(135,88,90,28,Color(0.02,0.025,0.04,0.88)); PixelFont.draw(image,"PAUSED",164,96,Color.WHITE)

func _draw_boss_ui() -> void:
	if (state.entities["bosses"] as Array).is_empty(): return
	var boss:Dictionary=(state.entities["bosses"] as Array)[0]; var width:int=154; var x:int=(GameConfig.WORLD_WIDTH-width)/2; _blend_rect(x,30,width,15,Color(0.03,0.02,0.03,0.82)); PixelFont.draw(image,String(boss["name"]),x+5,33,Color.WHITE,1,1,width-10); _draw_bar(x+5,40,width-10,float(boss["hp"]),float(boss["max_hp"]),boss["bar_back"],boss["bar_fill"])

func _draw_inventory_panel() -> void:
	var entries:Array=state.ui.get("hud",{}).get("inventory",[]); var x:int=64; var y:int=31; var width:int=232; var height:int=146; _blend_rect(x,y,width,height,Color(0.015,0.02,0.03,0.94)); PixelFont.draw(image,"INVENTORY",x+8,y+8,Color.WHITE,2,1); _ui_rect("inventory-close",x+width-18,y+5,12,9); PixelFont.draw(image,"X",x+width-14,y+7,Color.WHITE)
	var start:int=max(0,int(state.ui["inventory_index"])-7)
	for row:int in range(min(15,max(0,entries.size()-start))):
		var index:int=start+row; var entry:Dictionary=entries[index]; var row_y:int=y+25+row*7
		if index==int(state.ui["inventory_index"]): _blend_rect(x+5,row_y-1,width-10,7,Color(0.24,0.3,0.4,0.55))
		PixelFont.draw(image,"%s X%d  %s"%[String(entry["name"]),int(entry["count"]),String(entry["action"])],x+9,row_y,Color.WHITE,1,1,width-18); _ui_rect("inventory-item",x+5,row_y-1,width-10,7,{"index":index})

func _draw_crafting_panel() -> void:
	var entries:Array=state.ui.get("hud",{}).get("crafting",[]); var x:int=45; var y:int=25; var width:int=270; var height:int=160; _blend_rect(x,y,width,height,Color(0.015,0.02,0.03,0.94)); PixelFont.draw(image,"CRAFTING",x+8,y+8,Color.WHITE,2,1); _ui_rect("crafting-close",x+width-18,y+5,12,9); PixelFont.draw(image,"X",x+width-14,y+7,Color.WHITE)
	var selected:int=int(state.ui["crafting_index"]); var start:int=max(0,selected-7)
	for row:int in range(min(15,max(0,entries.size()-start))):
		var index:int=start+row; var entry:Dictionary=entries[index]; var row_y:int=y+25+row*8
		if index==selected:_blend_rect(x+5,row_y-1,width-10,8,Color(0.24,0.3,0.4,0.55))
		var color:Color=Color.WHITE if bool(entry["affordable"]) else Color8(151,151,151); PixelFont.draw(image,"%s  %s"%[String(entry["name"]),String(entry["recipe"])],x+9,row_y,color,1,1,width-18); _ui_rect("crafting-item",x+5,row_y-1,width-10,8,{"index":index})

func _draw_world_panel() -> void:
	var x: int = 56
	var y: int = 34
	var width: int = 248
	var height: int = 142
	_blend_rect(x,y,width,height,Color(0.015,0.02,0.03,0.95))
	PixelFont.draw(image,"WORLDS",x+8,y+8,Color.WHITE,2,1)
	_ui_rect("world-close",x+width-18,y+5,12,9)
	PixelFont.draw(image,"X",x+width-14,y+7,Color.WHITE)
	var slots: Array = state.ui["save_slots"]
	for index: int in range(3):
		var row_y: int = y + 28 + index * 28
		var selected: bool = index == int(state.ui["world_slot_index"])
		if selected:
			_blend_rect(x+6,row_y-3,width-12,24,Color(0.24,0.3,0.4,0.5))
		var meta: Dictionary = slots[index] if index < slots.size() else {"slot":index+1,"empty":true}
		var label: String = "SLOT %d  EMPTY" % (index+1) if bool(meta.get("empty",true)) else "SLOT %d  DAY %d  %s" % [index+1,int(meta.get("day",1)),String(meta.get("biome","unknown"))]
		PixelFont.draw(image,label,x+10,row_y,Color.WHITE,1,1,width-20)
		PixelFont.draw(image,"ENTER LOAD   N NEW   DELETE",x+10,row_y+8,Color(0.78,0.82,0.86,1),1,1,width-20)
		_ui_rect("world-slot",x+6,row_y-3,width-12,24,{"slot":index+1})
	var confirm: String = String(state.ui["confirm_world_action"])
	if not confirm.is_empty():
		PixelFont.draw(image,"PRESS AGAIN TO %s SLOT %d" % [confirm.to_upper(),int(state.ui["confirm_world_slot"])],x+10,y+119,Color8(255,188,106),1,1,width-20)

func render() -> ImageTexture:
	render_offset = juice_system.camera_offset() if juice_system != null else Vector2i.ZERO
	_prepare_terrain()
	var base_origin: Vector2i = _origin()
	var origin: Vector2i = base_origin - render_offset
	_draw_sky_details(base_origin, origin.x)
	_draw_furniture_lights(origin)
	_draw_projectiles(origin)
	_draw_explosions(origin)
	_draw_hook(origin)
	_draw_portals(origin)
	_draw_furniture(origin)
	_draw_enemy_behavior_world(origin)
	_draw_enemies(origin)
	_draw_bosses(origin)
	_draw_player(origin)
	_draw_attached_parasites(origin)
	_draw_weapon_effects(origin)
	_draw_pickups(origin)
	_draw_juice_world(origin)
	_draw_weather(origin)
	_draw_magnifier()
	_draw_juice_screen()
	_draw_hud()
	_draw_pointer_cursor()
	texture.update(image)
	return texture

