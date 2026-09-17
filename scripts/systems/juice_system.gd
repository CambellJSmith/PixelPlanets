class_name JuiceSystem
extends RefCounted

const IMPACT_COLORS: Dictionary = {
	"bullet":[Color8(255,247,196),Color8(255,174,62),Color8(199,77,36)],
	"blade":[Color8(246,250,255),Color8(145,205,238),Color8(72,116,166)],
	"laser":[Color8(255,252,220),Color8(255,149,48),Color8(238,54,35)],
	"fire":[Color8(255,236,134),Color8(255,105,34),Color8(151,38,29)],
	"crystal":[Color8(245,240,255),Color8(173,126,246),Color8(76,63,154)],
	"enemy":[Color8(255,232,213),Color8(255,106,92),Color8(136,42,61)],
	"boss":[Color8(255,249,222),Color8(255,172,75),Color8(202,54,67)],
	"pickup":[Color8(245,255,212),Color8(139,239,142),Color8(73,169,125)],
	"dust":[Color8(218,199,157),Color8(151,126,92),Color8(92,75,66)],
	"rainbow":[Color8(255,65,96),Color8(255,180,55),Color8(255,239,91),Color8(74,221,127),Color8(67,161,244),Color8(191,93,246)],
}

const AUDIO_SETTINGS: Dictionary = {
	"shot":["square",180.0,70.0,0.055], "hit":["square",110.0,55.0,0.04], "slice":["sawtooth",360.0,110.0,0.07],
	"explosion":["sawtooth",85.0,28.0,0.18], "jump":["square",180.0,280.0,0.08], "land":["triangle",95.0,55.0,0.06],
	"pickup":["sine",520.0,820.0,0.10], "defeat":["square",180.0,75.0,0.12], "boss":["sawtooth",72.0,42.0,0.36],
	"victory":["square",260.0,780.0,0.42], "bounce":["square",240.0,145.0,0.055], "nyan":["square",330.0,660.0,0.12],
}

var state: GameState
var noise: PixelNoise
var audio_root: Node
var audio_players: Array[AudioStreamPlayer] = []
var audio_streams: Dictionary = {}
var audio_index: int = 0
var serial: int = 0
var next_observer_id: int = 1
var health_snapshots: Dictionary = {}
var hit_effect_frames: Dictionary = {}
var projectile_snapshots: Dictionary = {}
var observed_explosions: Dictionary = {}
var previous_grounded: bool = false
var previous_vy: float = 0.0
var previous_boss_ids: Dictionary = {}
var previous_enemy_ids: Dictionary = {}
var previous_pickup_count: int = 0
var last_audio_frame: int = -999
var cell_burst_budget: int = 0

func _init(game_state: GameState, pixel_noise: PixelNoise, sound_root: Node = null) -> void:
	state = game_state
	noise = pixel_noise
	audio_root = sound_root
	previous_grounded = bool(state.player.get("grounded", false))
	previous_vy = float(state.player.get("vy", 0.0))
	cell_burst_budget = int(GameConfig.JUICE["max_cell_bursts_per_frame"])
	_setup_audio()

func _random(index: int, salt: int = 0) -> float:
	serial += 1
	return noise.random_at(state.frame + serial, index + salt, state.seed ^ 0x6a09e667)

func _trim(array: Array, maximum: int) -> void:
	while array.size() > maximum:
		array.remove_at(0)

func _color_array(value: Variant, fallback: String = "dust") -> Array:
	if value is Array and not (value as Array).is_empty():
		return value
	return IMPACT_COLORS[fallback]

func particle(x: float, y: float, options: Dictionary = {}) -> void:
	var life: int = maxi(2, roundi(float(options.get("life", 18))))
	var particles: Array = state.entities["juice_particles"]
	particles.append({
		"x":roundi(x), "y":roundi(y), "vx":float(options.get("vx",0.0)), "vy":float(options.get("vy",0.0)),
		"carry_x":0.0, "carry_y":0.0, "gravity":float(options.get("gravity",0.0)), "drag":float(options.get("drag",0.95)),
		"life":life, "max_life":life, "color":options.get("color",Color.WHITE), "size":maxi(1,roundi(float(options.get("size",1)))),
		"kind":String(options.get("kind","pixel")), "twinkle":int(options.get("twinkle",0)),
	})
	_trim(particles, int(GameConfig.JUICE["max_particles"]))

func burst(x: float, y: float, options: Dictionary = {}) -> void:
	var colors: Array = _color_array(options.get("colors", null), "dust")
	var count: int = clampi(roundi(float(options.get("count",8))),1,64)
	var speed_min: float = float(options.get("speed_min",0.35))
	var speed_max: float = float(options.get("speed_max",1.55))
	var base_angle: float = float(options.get("angle",0.0))
	var spread: float = float(options.get("spread",TAU))
	for index: int in range(count):
		var t: float = 0.5 if count <= 1 else float(index) / float(count - 1)
		var angle: float = base_angle - spread * 0.5 + spread * t + (_random(index,31)-0.5)*0.42
		var speed: float = lerpf(speed_min,speed_max,_random(index,32))
		var life_min: int = int(options.get("life_min",10))
		var life_max: int = int(options.get("life_max",24))
		particle(x,y,{
			"vx":cos(angle)*speed, "vy":sin(angle)*speed+float(options.get("lift",0.0)), "gravity":float(options.get("gravity",0.055)),
			"drag":float(options.get("drag",0.95)), "life":life_min+floori(_random(index,33)*float(life_max-life_min+1)),
			"color":colors[floori(_random(index,34)*float(colors.size()))%colors.size()], "size":2 if _random(index,35)>float(options.get("large_chance",0.76)) else 1,
			"kind":String(options.get("kind","pixel")), "twinkle":int(options.get("twinkle",0)),
		})

func shake(amount: float, frames: int = 14) -> void:
	state.juice["shake"] = maxf(float(state.juice["shake"]),maxf(0.0,amount))
	state.juice["shake_frames"] = maxi(int(state.juice["shake_frames"]),maxi(1,frames))

func hit_stop(frames: int = 1) -> void:
	state.juice["hit_stop_frames"] = maxi(int(state.juice["hit_stop_frames"]),clampi(frames,0,int(GameConfig.JUICE["max_hit_stop_frames"])))

func world_flash(x: float, y: float, color: Color = Color.WHITE, radius: float = 4.0, life: int = 7) -> void:
	var flashes: Array = state.entities["juice_flashes"]
	flashes.append({"x":roundi(x),"y":roundi(y),"color":color,"radius":radius,"life":life,"max_life":life})
	_trim(flashes,int(GameConfig.JUICE["max_flashes"]))

func screen_flash(color: Color = Color(1.0,1.0,1.0,0.22), life: int = 4) -> void:
	state.juice["screen_flash_color"] = color
	state.juice["screen_flash"] = maxi(int(state.juice["screen_flash"]),maxi(1,life))
	state.juice["screen_flash_max"] = maxi(int(state.juice["screen_flash_max"]),int(state.juice["screen_flash"]))

func shockwave(x: float, y: float, color: Color = Color8(255,238,180), radius: float = 12.0, life: int = 14) -> void:
	var waves: Array = state.entities["juice_shockwaves"]
	waves.append({"x":roundi(x),"y":roundi(y),"color":color,"radius":maxf(2.0,radius),"life":life,"max_life":life})
	_trim(waves,int(GameConfig.JUICE["max_shockwaves"]))

func number(x: float, y: float, value: Variant, color: Color = Color8(255,246,218), options: Dictionary = {}) -> void:
	if value == null:
		return
	var text: String = String(value)
	if value is int or value is float:
		text = "%s%d" % [String(options.get("prefix","")),maxi(1,roundi(absf(float(value))))]
	var numbers: Array = state.entities["damage_numbers"]
	var life: int = int(options.get("life",42))
	numbers.append({"x":roundi(x),"y":roundi(y),"text":text,"color":color,"life":life,"max_life":life,"carry_y":0.0,"vy":float(options.get("vy",-0.28)),"big":bool(options.get("big",false))})
	_trim(numbers,int(GameConfig.JUICE["max_damage_numbers"]))

func impact(x: float, y: float, options: Dictionary = {}) -> void:
	var kind: String = String(options.get("kind","enemy"))
	var heavy: bool = bool(options.get("heavy",false))
	var colors: Array = _color_array(options.get("colors",null),kind if IMPACT_COLORS.has(kind) else "enemy")
	var angle: float = float(options.get("angle",0.0))
	burst(x,y,{"colors":colors,"count":int(options.get("count",18 if heavy else 7)),"speed_min":0.55 if heavy else 0.28,"speed_max":2.1 if heavy else 1.25,"angle":angle+PI,"spread":PI*1.75 if heavy else PI*1.2,"gravity":0.035 if kind=="laser" else 0.065,"life_min":15 if heavy else 8,"life_max":32 if heavy else 20,"large_chance":0.58 if heavy else 0.86,"kind":"slash" if kind=="blade" else "pixel"})
	world_flash(x,y,colors[0],6.0 if heavy else 3.0,9 if heavy else 5)
	if options.has("damage"):
		number(x,y-3.0,options["damage"],options.get("number_color",colors[0]),{"big":heavy})
	shake(float(options.get("shake",3.4 if heavy else 0.85)),18 if heavy else 8)
	hit_stop(int(options.get("hit_stop",3 if heavy else 1)))
	play("slice" if kind=="blade" else "hit",1.0 if heavy else 0.55)

func explosion(x: float, y: float, radius: float = 8.0, options: Dictionary = {}) -> void:
	var kind: String = String(options.get("kind","fire"))
	var colors: Array = _color_array(options.get("colors",null),"rainbow" if kind=="rainbow" else kind if IMPACT_COLORS.has(kind) else "fire")
	var strength: float = clampf(radius,1.0,16.0)
	burst(x,y,{"colors":colors,"count":mini(48,18+roundi(strength*1.8)),"speed_min":0.65,"speed_max":1.8+strength*0.13,"gravity":0.05,"life_min":16,"life_max":38,"large_chance":0.46,"kind":"star" if kind=="rainbow" else "pixel","twinkle":3 if kind=="rainbow" else 0})
	shockwave(x,y,colors[0],strength*1.5,18+roundi(strength*0.35))
	world_flash(x,y,colors[0],maxf(5.0,strength*0.8),10)
	shake(minf(8.0,1.8+strength*0.52),20+roundi(strength))
	hit_stop(mini(int(GameConfig.JUICE["max_hit_stop_frames"]),3+floori(strength/4.0)))
	screen_flash(Color(1.0,0.35,0.9,0.18) if kind=="rainbow" else Color(1.0,0.85,0.62,0.18),4)
	play("explosion",minf(1.0,0.35+strength/16.0))

func weapon_fire(kind: String, x: float, y: float, direction: Vector2 = Vector2.RIGHT) -> void:
	var colors: Array = IMPACT_COLORS["laser"] if kind=="laser" else IMPACT_COLORS["rainbow"] if kind=="nyan" else [Color8(255,250,210),Color8(255,190,70)]
	var count: int = 12 if kind=="sword" else 7 if kind=="grenade" else 18 if kind=="nyan" else 5
	burst(x,y,{"colors":colors,"count":count,"speed_min":0.25,"speed_max":1.7 if kind=="nyan" else 1.05,"angle":direction.angle(),"spread":2.4 if kind=="sword" else 0.8,"gravity":0.025,"life_min":6,"life_max":16,"large_chance":0.9,"kind":"slash" if kind=="sword" else "pixel","twinkle":3 if kind=="nyan" else 0})
	state.juice["recoil_frames"] = maxi(int(state.juice["recoil_frames"]),8 if kind=="grenade" or kind=="nyan" else 4)
	state.juice["recoil_x"] = -int(signf(direction.x if absf(direction.x)>0.001 else 1.0))*(2 if kind=="grenade" or kind=="nyan" else 1)
	shake(2.8 if kind=="nyan" else 1.6 if kind=="grenade" else 0.55 if kind=="gun" else 0.35,8)
	if kind=="gun": play("shot",0.5)
	elif kind=="sword": play("slice",0.65)
	elif kind=="nyan": play("nyan",0.55)

func jump(x: float, y: float) -> void:
	burst(x,y,{"colors":IMPACT_COLORS["dust"],"count":7,"speed_min":0.2,"speed_max":0.8,"angle":PI*0.5,"spread":2.4,"gravity":0.04,"life_min":9,"life_max":18})
	state.juice["player_stretch"] = maxi(int(state.juice["player_stretch"]),6)
	play("jump",0.35)

func bunny_hop(x: float, y: float, chain: int = 2) -> void:
	var level: int = maxi(2,chain)
	var colors: Array = IMPACT_COLORS["rainbow"] if level>=8 else [Color8(112,232,255),Color8(203,250,255),Color8(110,156,255)]
	burst(x,y,{"colors":colors,"count":mini(26,8+level*2),"speed_min":0.35,"speed_max":1.05+level*0.08,"angle":-PI*0.5,"spread":PI*0.8,"gravity":0.025,"life_min":10,"life_max":24,"twinkle":2 if level>=6 else 0,"kind":"star" if level>=8 else "streak"})
	number(x,y-7,"X%d"%level,Color8(255,126,238) if level>=8 else Color8(151,239,255),{"life":28,"big":level>=6,"vy":-0.34})
	world_flash(x,y,Color8(255,92,225) if level>=8 else Color8(124,232,255),minf(7.0,3.0+floorf(level/2.0)),6)
	if level>=4: shockwave(x,y,Color8(255,110,234) if level>=8 else Color8(122,224,255),4.0+level*0.55,9)
	shake(minf(2.4,0.25+level*0.18),8+floori(level/2.0))
	state.juice["player_stretch"] = maxi(int(state.juice["player_stretch"]),7+floori(level/3.0))
	state.juice["speed_intensity"] = maxf(float(state.juice["speed_intensity"]),minf(1.0,0.2+level*0.08))
	play("jump",minf(1.0,0.35+level*0.055))

func land(x: float, y: float, speed: float = 1.0) -> void:
	var strength: float = clampf(speed,0.2,3.0)
	burst(x,y,{"colors":IMPACT_COLORS["dust"],"count":roundi(5.0+strength*5.0),"speed_min":0.25,"speed_max":0.65+strength*0.32,"angle":-PI*0.5,"spread":PI*0.92,"gravity":0.055,"life_min":10,"life_max":24})
	state.juice["player_squash"] = maxi(int(state.juice["player_squash"]),roundi(5.0+strength*2.0))
	if strength>1.0:
		shake(strength*0.7,9)
		shockwave(x,y,Color8(205,187,147),3.0+strength*2.0,9)
	play("land",minf(0.65,strength*0.28))

func pickup(x: float, y: float, label: String = "+1") -> void:
	burst(x,y,{"colors":IMPACT_COLORS["pickup"],"count":10,"speed_min":0.15,"speed_max":0.8,"gravity":-0.01,"drag":0.96,"life_min":16,"life_max":30,"twinkle":3})
	world_flash(x,y,Color8(235,255,205),4.0,9)
	number(x,y-3,label,Color8(222,255,190),{"life":34})
	state.juice["hud_pulse"] = maxi(int(state.juice["hud_pulse"]),12)
	play("pickup",0.35)

func enemy_death(x: float, y: float, color: Color = Color8(255,120,100)) -> void:
	burst(x,y,{"colors":[color,Color8(255,238,215),Color8(110,43,58)],"count":20,"speed_min":0.3,"speed_max":1.7,"gravity":0.07,"life_min":14,"life_max":34,"large_chance":0.55})
	shockwave(x,y,color,7.0,12)
	hit_stop(2); shake(1.4,12); play("defeat",0.45)

func boss_spawn(x: float, y: float, color: Color = Color8(255,220,140)) -> void:
	burst(x,y,{"colors":[color,Color8(255,255,245),Color8(120,80,190)],"count":42,"speed_min":0.5,"speed_max":2.4,"gravity":-0.005,"drag":0.97,"life_min":22,"life_max":48,"large_chance":0.5,"twinkle":2})
	shockwave(x,y,color,20.0,28); screen_flash(Color(1.0,0.96,0.82,0.28),8); shake(7.0,38); hit_stop(6); play("boss",0.9)

func boss_defeat(x: float, y: float, color: Color = Color8(255,220,140)) -> void:
	var colors: Array = [color]
	colors.append_array(IMPACT_COLORS["rainbow"])
	for wave: int in range(3):
		burst(x,y,{"colors":colors,"count":30,"speed_min":0.55+wave*0.3,"speed_max":2.4+wave*0.45,"gravity":0.045,"life_min":24,"life_max":58,"large_chance":0.48,"twinkle":3,"kind":"star"})
	shockwave(x,y,Color.WHITE,28.0,34); screen_flash(Color(1.0,1.0,1.0,0.42),11); shake(9.0,48); hit_stop(8)
	state.juice["celebration_frames"] = maxi(int(state.juice["celebration_frames"]),150)
	play("victory",1.0)

func cell_change(event: Dictionary) -> void:
	if cell_burst_budget<=0:
		return
	var reason: String = String(event.get("reason",""))
	if ["simulation","weather","plant-growth","safe-spawn","player-depenetration"].has(reason):
		return
	var dramatic: bool = false
	for token: String in ["destruculator","grenade","drone","nyan","laser","boss","explosion","weapon","reality","fire","harvest"]:
		if reason.contains(token): dramatic=true; break
	if not dramatic:
		return
	var old_type: int = int(event.get("old_type",event.get("oldType",GameData.AIR)))
	var new_type: int = int(event.get("new_type",event.get("newType",GameData.AIR)))
	if new_type==GameData.STEAM:
		cell_burst_budget-=1; burst(float(event["x"]),float(event["y"]),{"colors":[Color(0.94,0.98,1.0,0.78),Color(0.60,0.81,0.89,0.52)],"count":4,"speed_min":0.1,"speed_max":0.55,"gravity":-0.045,"drag":0.97,"life_min":12,"life_max":24}); return
	if new_type==GameData.FIRE or new_type==GameData.LAVA:
		cell_burst_budget-=1; burst(float(event["x"]),float(event["y"]),{"colors":IMPACT_COLORS["fire"],"count":4,"speed_min":0.15,"speed_max":0.75,"gravity":-0.025,"life_min":9,"life_max":19}); return
	if new_type==GameData.AIR and old_type!=GameData.AIR:
		cell_burst_budget-=1; burst(float(event["x"]),float(event["y"]),{"colors":IMPACT_COLORS["crystal"] if old_type==GameData.CRYSTAL else IMPACT_COLORS["dust"],"count":3,"speed_min":0.12,"speed_max":0.7,"gravity":0.06,"life_min":8,"life_max":18,"large_chance":0.9})

func camera_offset() -> Vector2i:
	if int(state.juice["shake_frames"])<=0 or float(state.juice["shake"])<=0.05:
		return Vector2i.ZERO
	var magnitude: int = maxi(1,ceili(float(state.juice["shake"])))
	return Vector2i(floori(_random(1,1201)*float(magnitude*2+1))-magnitude,floori(_random(2,1202)*float(magnitude*2+1))-magnitude)

func _move_integer(entity: Dictionary) -> void:
	entity["carry_x"] = float(entity.get("carry_x",0.0))+float(entity.get("vx",0.0))
	entity["carry_y"] = float(entity.get("carry_y",0.0))+float(entity.get("vy",0.0))
	var dx: int = int(float(entity["carry_x"])); var dy: int = int(float(entity["carry_y"]))
	entity["carry_x"] = float(entity["carry_x"])-dx; entity["carry_y"] = float(entity["carry_y"])-dy
	entity["x"] = int(entity["x"])+dx; entity["y"] = int(entity["y"])+dy

func _update_particles() -> void:
	var particles: Array = state.entities["juice_particles"]
	for index: int in range(particles.size()-1,-1,-1):
		var item: Dictionary = particles[index]
		item["vx"] = float(item["vx"])*float(item["drag"]); item["vy"] = float(item["vy"])*float(item["drag"])+float(item["gravity"])
		_move_integer(item); item["life"] = int(item["life"])-1
		if int(item["life"])<=0: particles.remove_at(index)
	for index: int in range((state.entities["damage_numbers"] as Array).size()-1,-1,-1):
		var item: Dictionary = state.entities["damage_numbers"][index]
		item["carry_y"] = float(item.get("carry_y",0.0))+float(item["vy"]); var dy: int = int(float(item["carry_y"])); item["carry_y"] = float(item["carry_y"])-dy; item["y"] = int(item["y"])+dy; item["vy"] = float(item["vy"])*0.96; item["life"] = int(item["life"])-1
		if int(item["life"])<=0: (state.entities["damage_numbers"] as Array).remove_at(index)
	for key: String in ["juice_flashes","juice_shockwaves"]:
		var array: Array = state.entities[key]
		for index: int in range(array.size()-1,-1,-1):
			array[index]["life"] = int(array[index]["life"])-1
			if int(array[index]["life"])<=0: array.remove_at(index)

func _observer_id(entity: Dictionary) -> int:
	if not entity.has("_juice_id"):
		entity["_juice_id"] = next_observer_id; next_observer_id += 1
	return int(entity["_juice_id"])

func _observe_explosions() -> void:
	for effect_value: Variant in state.entities["explosions"]:
		var effect: Dictionary = effect_value; var id: int = _observer_id(effect)
		if observed_explosions.has(id): continue
		observed_explosions[id]=true
		var kind: String = "rainbow" if String(effect.get("kind",""))=="nyan" else "crystal" if String(effect.get("kind",""))=="serpent" else "fire"
		explosion(float(effect["x"]),float(effect["y"]),minf(16.0,float(effect.get("radius",7.0))),{"kind":kind})

func _observe_health() -> void:
	var current_enemy_ids: Dictionary = {}
	for chunk_value: Variant in state.world["active_chunks"]:
		for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]:
			var enemy: Dictionary = enemy_value; var id: int = _observer_id(enemy); current_enemy_ids[id]=true
			var hp: float = float(enemy.get("hp",0.0)); var previous: float = float(health_snapshots.get(id,hp))
			if hp<previous:
				var delta: float = previous-hp; var last: int = int(hit_effect_frames.get(id,-999)); var interval: int = 0 if delta>=8.0 else 3 if delta>=2.0 else 7
				if delta>=0.35 and state.frame-last>=interval:
					impact(float(enemy["x"]),float(enemy["y"])-1.0,{"kind":"enemy","damage":delta,"shake":1.8 if delta>25.0 else 0.35,"hit_stop":2 if delta>25.0 else 0,"count":12 if delta>25.0 else 5}); hit_effect_frames[id]=state.frame
			health_snapshots[id]=hp
	for id_variant: Variant in previous_enemy_ids.keys():
		var id: int = int(id_variant)
		if not current_enemy_ids.has(id) and health_snapshots.has(id) and float(health_snapshots[id])<=0.0:
			var last: Dictionary = previous_enemy_ids[id]; enemy_death(float(last["x"]),float(last["y"]),last.get("color",Color8(255,120,100)))
	previous_enemy_ids.clear()
	for chunk_value: Variant in state.world["active_chunks"]:
		for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]:
			var enemy: Dictionary=enemy_value; var id:int=_observer_id(enemy); previous_enemy_ids[id]={"x":enemy["x"],"y":enemy["y"],"color":Color8(255,120,100)}
	var current_boss_ids: Dictionary = {}
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary=boss_value; var id:int=_observer_id(boss); current_boss_ids[id]={"x":boss["x"],"y":boss["y"],"color":boss.get("bar_fill",Color8(255,220,140))}
		if not previous_boss_ids.has(id): boss_spawn(float(boss["x"]),float(boss["y"]),boss.get("bar_highlight",Color8(255,220,140)))
		var hp:float=float(boss.get("hp",0.0)); var previous:float=float(health_snapshots.get(id,hp))
		if hp<previous:
			var delta:float=previous-hp; var last:int=int(hit_effect_frames.get(id,-999)); var interval:int=0 if delta>=10.0 else 3 if delta>=2.0 else 7
			if delta>=0.3 and state.frame-last>=interval:
				impact(float(boss["x"]),float(boss["y"]),{"kind":"boss","damage":delta,"heavy":delta>=25.0,"shake":2.8 if delta>=25.0 else 0.55,"hit_stop":3 if delta>=25.0 else 0,"count":16 if delta>=25.0 else 6}); hit_effect_frames[id]=state.frame
		health_snapshots[id]=hp
	for id_variant: Variant in previous_boss_ids.keys():
		var id:int=int(id_variant)
		if not current_boss_ids.has(id) and health_snapshots.has(id) and float(health_snapshots[id])<=0.0:
			var last:Dictionary=previous_boss_ids[id]; boss_defeat(float(last["x"]),float(last["y"]),last["color"])
	previous_boss_ids=current_boss_ids

func _observe_projectiles() -> void:
	var current: Dictionary = {}
	var tracked: Array = [["bullet",state.entities["bullets"]],["grenade",state.entities["grenades"]],["glaive",state.entities["glaives"]],["nyan",state.entities["nyan_cats"]]]
	for pair_value: Variant in tracked:
		var pair: Array=pair_value; var kind:String=pair[0]
		for entity_value: Variant in pair[1]:
			var entity:Dictionary=entity_value; var id:int=_observer_id(entity); current[id]=true
			if not projectile_snapshots.has(id):
				var direction:=Vector2(float(entity.get("vx",1.0)),float(entity.get("vy",0.0))).normalized(); weapon_fire("gun" if kind=="bullet" else kind,float(entity["x"]),float(entity["y"]),direction)
			else:
				var previous:Dictionary=projectile_snapshots[id]
				if kind=="glaive" and int(entity.get("bounces",0))>int(previous.get("bounces",0)): impact(float(entity["x"]),float(entity["y"]),{"kind":"blade","angle":atan2(float(entity.get("vy",0.0)),float(entity.get("vx",1.0))),"count":9,"shake":0.6,"hit_stop":1})
				if kind=="nyan" and int(entity.get("bounces",0))>int(previous.get("bounces",0)): burst(float(entity["x"]),float(entity["y"]),{"colors":IMPACT_COLORS["rainbow"],"count":14,"speed_min":0.35,"speed_max":1.3,"gravity":0.04,"life_min":10,"life_max":24,"twinkle":2}); shake(1.1,8); play("bounce",0.45)
			projectile_snapshots[id]={"x":entity["x"],"y":entity["y"],"bounces":entity.get("bounces",0),"kind":kind}
	for id_variant: Variant in projectile_snapshots.keys().duplicate():
		var id:int=int(id_variant)
		if current.has(id): continue
		var previous:Dictionary=projectile_snapshots[id]; projectile_snapshots.erase(id)
		if String(previous["kind"])=="bullet": impact(float(previous["x"]),float(previous["y"]),{"kind":"bullet","count":5,"shake":0.25,"hit_stop":0})

func _observe_motion() -> void:
	var speed: float = Vector2(float(state.player.get("vx",0.0)),float(state.player.get("vy",0.0))).length()
	state.juice["speed_intensity"] = clampf((speed-0.75)/1.4,0.0,1.0)
	var grounded: bool = bool(state.player.get("grounded",false))
	if previous_grounded and not grounded and float(state.player.get("vy",0.0))<0.0:
		var chain: int = int((state.player["bunny_hop"] as Dictionary).get("chain",1))
		if chain > 1:
			bunny_hop(float(state.player["x"]),float(state.player["y"]),chain)
		else:
			jump(float(state.player["x"]),float(state.player["y"]))
	if not previous_grounded and grounded and previous_vy>0.2:
		land(float(state.player["x"]),float(state.player["y"]),previous_vy)
	if grounded and absf(float(state.player.get("vx",0.0)))>0.34 and state.frame%7==0:
		particle(float(state.player["x"])-signf(float(state.player["vx"])),float(state.player["y"]),{"vx":-float(state.player["vx"])*0.2,"vy":-0.18,"gravity":0.04,"drag":0.9,"life":10,"color":Color(0.77,0.70,0.55,0.55)})
	if speed>1.15 and state.frame%4==0:
		particle(float(state.player["x"])-signf(float(state.player.get("vx",1.0)))*2.0,float(state.player["y"])-2.0,{"vx":-float(state.player["vx"])*0.35,"vy":-float(state.player["vy"])*0.18,"gravity":0.0,"drag":0.9,"life":9,"color":Color(0.70,0.88,1.0,0.55),"kind":"streak"})
	previous_grounded=grounded; previous_vy=float(state.player.get("vy",0.0))

func _observe_pickups() -> void:
	var count:int=(state.entities["pickups"] as Array).size()
	if count<previous_pickup_count:
		pickup(float(state.player["x"]),float(state.player["y"])-2.0,"+1")
	previous_pickup_count=count

func reset_runtime() -> void:
	serial = 0
	next_observer_id = 1
	health_snapshots.clear()
	hit_effect_frames.clear()
	observed_explosions.clear()
	projectile_snapshots.clear()
	previous_grounded = bool(state.player.get("grounded", false))
	previous_vy = float(state.player.get("vy", 0.0))
	previous_pickup_count = (state.entities["pickups"] as Array).size()
	last_audio_frame = -999
	cell_burst_budget = int(GameConfig.JUICE["max_cell_bursts_per_frame"])

func update() -> bool:
	cell_burst_budget=int(GameConfig.JUICE["max_cell_bursts_per_frame"])
	var frozen:bool=int(state.juice["hit_stop_frames"])>0
	if int(state.juice["hit_stop_frames"])>0: state.juice["hit_stop_frames"]=int(state.juice["hit_stop_frames"])-1
	if int(state.juice["shake_frames"])>0: state.juice["shake_frames"]=int(state.juice["shake_frames"])-1; state.juice["shake"]=float(state.juice["shake"])*0.86
	else: state.juice["shake"]=0.0
	for key: String in ["screen_flash","recoil_frames","player_squash","player_stretch","hud_pulse"]:
		if int(state.juice[key])>0: state.juice[key]=int(state.juice[key])-1
	if int(state.juice["recoil_frames"])<=0: state.juice["recoil_x"]=0
	if int(state.juice["celebration_frames"])>0:
		state.juice["celebration_frames"]=int(state.juice["celebration_frames"])-1
		if state.frame%4==0: particle(float(state.player["x"])-24.0+floori(_random(3)*48.0),float(state.player["y"])-28.0,{"vx":(_random(4)-0.5)*0.8,"vy":0.25+_random(5)*0.45,"gravity":0.01,"drag":0.99,"life":28+floori(_random(6)*28.0),"color":(IMPACT_COLORS["rainbow"] as Array)[floori(_random(7)*6.0)],"kind":"star","twinkle":3})
	_update_particles(); _observe_motion(); _observe_pickups()
	return frozen

func after_simulation() -> void:
	_observe_explosions(); _observe_health(); _observe_projectiles()

func _setup_audio() -> void:
	if audio_root==null:
		return
	for index: int in range(4):
		var player:=AudioStreamPlayer.new(); player.name="Juice Audio %d"%(index+1); audio_root.add_child(player); audio_players.append(player)
	for kind: String in AUDIO_SETTINGS.keys():
		audio_streams[kind]=_make_tone(AUDIO_SETTINGS[kind])

func _wave_sample(kind: String, phase: float) -> float:
	match kind:
		"sine": return sin(phase)
		"triangle": return asin(sin(phase))*2.0/PI
		"sawtooth": return 2.0*(phase/TAU-floor(0.5+phase/TAU))
		_: return 1.0 if sin(phase)>=0.0 else -1.0

func _make_tone(settings: Array) -> AudioStreamWAV:
	var waveform:String=String(settings[0]); var start_hz:float=float(settings[1]); var end_hz:float=float(settings[2]); var duration:float=float(settings[3]); var rate:int=22050; var frames:int=maxi(1,roundi(duration*rate)); var data:=PackedByteArray(); data.resize(frames*2); var phase:float=0.0
	for index:int in range(frames):
		var t:float=float(index)/float(maxi(1,frames-1)); var hz:float=lerpf(start_hz,end_hz,t); phase+=TAU*hz/float(rate); var envelope:float=pow(1.0-t,1.6); var sample:int=clampi(roundi(_wave_sample(waveform,phase)*envelope*9000.0),-32768,32767); data[index*2]=sample&0xff; data[index*2+1]=(sample>>8)&0xff
	var stream:=AudioStreamWAV.new(); stream.format=AudioStreamWAV.FORMAT_16_BITS; stream.mix_rate=rate; stream.stereo=false; stream.data=data
	return stream

func play(kind: String, intensity: float = 0.5) -> void:
	if state.frame-last_audio_frame<2 and not ["explosion","boss","victory"].has(kind): return
	last_audio_frame=state.frame
	if audio_players.is_empty(): return
	var player:AudioStreamPlayer=audio_players[audio_index%audio_players.size()]; audio_index+=1; player.stream=audio_streams.get(kind,audio_streams.get("hit")); player.volume_db=linear_to_db(clampf(0.2+0.55*intensity,0.05,1.0)); player.play()
