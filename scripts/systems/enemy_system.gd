class_name EnemySystem
extends RefCounted

const VOLCANIC_FAUNA: Array[String] = ["ember_lizard","ash_beetle","magma_moth","cinder_imp","fire_bat","lava_crab","ash_crawler","obsidian_scarab","ember_raider"]

var state: GameState
var world: WorldModel
var player_system: PlayerSystem
var noise: PixelNoise
var crops: CropSystem
var furniture: FurnitureSystem

func _init(game_state: GameState, world_model: WorldModel, player: PlayerSystem, pixel_noise: PixelNoise, crop_system: CropSystem, furniture_system: FurnitureSystem) -> void:
	state = game_state
	world = world_model
	player_system = player
	noise = pixel_noise
	crops = crop_system
	furniture = furniture_system

func species_of(enemy: Dictionary) -> Dictionary:
	var species_data: Dictionary = FaunaData.fauna(String(enemy.get("species_id", "")))
	if not species_data.is_empty():
		return species_data
	return {"id":"legacy_wisp","name":"cave wisp","temperament":"hostile","movement":"flying","habitat":"cave_air","hp":float(enemy.get("max_hp",30.0)),"contact_damage":5.0,"speed":0.35,"aggro_range":48.0,"flee_range":0.0,"width":3,"height":3,"hit_radius":2.0,"animation_rate":8,"sprite":"wisp","palette":[[195,65,100],[255,170,190],[84,34,60]],"loot":[],"behaviors":[]}

func behaviors_of(species_data: Dictionary) -> Array[String]:
	return FaunaData.behaviors(species_data)

func _has_behavior(species_data: Dictionary, behavior: String) -> bool:
	return behaviors_of(species_data).has(behavior)

func _random_at(x: float, y: float, salt: int) -> float:
	return noise.random_at(x, y, salt)

func _random_int(minimum: int, maximum: int, x: float, y: float, salt: int) -> int:
	return minimum + floori(_random_at(x, y, salt) * float(maximum - minimum + 1))

func _creature_at(species_data: Dictionary, x: float, y: float, salt: int, extra: Dictionary = {}) -> Dictionary:
	var creature: Dictionary = {
		"species_id":String(species_data["id"]), "x":roundi(x), "y":roundi(y), "vx":0.0, "vy":0.0,
		"move_carry_x":0.0, "move_carry_y":0.0, "hp":float(species_data["hp"]), "max_hp":float(species_data["hp"]),
		"phase":_random_at(x,y,salt) * TAU, "animation_offset":floori(_random_at(y,x,salt+1)*240.0),
		"facing":-1 if _random_at(x,y,salt+2) < 0.5 else 1, "hit":0, "burning":0, "attack_cooldown":0,
		"hop_cooldown":20 + floori(_random_at(x,y,salt+3)*90.0), "idle_timer":20 + floori(_random_at(y,x,salt+4)*120.0),
		"startled":0, "nest_timer":_random_int(floori(float(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"])*0.65), int(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"]), x,y,salt+5),
		"burrow_cooldown":_random_int(30,int(GameConfig.ENEMY_BEHAVIOR["burrow_cooldown_frames"]),x,y,salt+6), "theft_cooldown":0,
	}
	creature.merge(extra, true)
	return creature

func spawn_creature(species_id: String, x: float, y: float, extra: Dictionary = {}) -> Dictionary:
	var species_data: Dictionary = FaunaData.fauna(species_id)
	if species_data.is_empty():
		return {}
	var chunk: Dictionary = world.get_chunk(world.chunk_x(x), world.chunk_y(y), true)
	var enemies: Array = chunk["enemies"]
	var enemy: Dictionary = _creature_at(species_data, x, y, state.frame + enemies.size() * 17, extra)
	enemies.append(enemy)
	chunk["save_enemies"] = true
	return enemy

func _drop_loot(enemy: Dictionary, species_data: Dictionary) -> void:
	var loot_table: Array = species_data.get("loot", [])
	for index: int in range(loot_table.size()):
		var entry: Array = loot_table[index]
		var chance: float = float(entry[3]) if entry.size() > 3 else 1.0
		if _random_at(float(enemy["x"])+index,float(enemy["y"]),state.frame+8101+index) > chance:
			continue
		var amount: int = _random_int(int(entry[1]),int(entry[2]),float(enemy["y"]),float(enemy["x"]),state.frame+8201+index)
		if amount > 0:
			crops.spawn_loot_pickup(String(entry[0]), float(enemy["x"])+(index%3)-1.0, float(enemy["y"]), amount, 1.35)

func _blocked_at(x: int, y: int) -> bool:
	return world.is_solid(world.get_cell(x,y)) or furniture.solid_at(x,y)

func _can_occupy(enemy: Dictionary, species_data: Dictionary, x: int, y: int) -> bool:
	if not world.is_active_world_position(x,y):
		return false
	var material: int = world.get_cell(x,y)
	if bool(enemy.get("burrowed",false)):
		return world.is_solid(material) and material != GameData.LAVA
	var movement: String = String(species_data["movement"])
	if movement == "swimming":
		return material == GameData.WATER
	if movement == "flying":
		return not _blocked_at(x,y) and material != GameData.WATER and material != GameData.LAVA
	return not _blocked_at(x,y) and material != GameData.LAVA

func _on_ground(enemy: Dictionary) -> bool:
	return _blocked_at(roundi(float(enemy["x"])), roundi(float(enemy["y"])) + 1)

func _move_horizontal(enemy: Dictionary, species_data: Dictionary, pixels: int) -> bool:
	var direction: int = int(sign(pixels))
	var collided: bool = false
	for _step: int in range(abs(pixels)):
		var next_x: int = roundi(float(enemy["x"])) + direction
		var current_y: int = roundi(float(enemy["y"]))
		if _can_occupy(enemy,species_data,next_x,current_y):
			enemy["x"] = next_x
			continue
		if bool(enemy.get("burrowed",false)):
			var escaped: bool = false
			for offset: int in [1,-1,2,-2]:
				if _can_occupy(enemy,species_data,next_x,current_y+offset):
					enemy["x"] = next_x
					enemy["y"] = current_y + offset
					escaped = true
					break
			if escaped:
				continue
		var movement: String = String(species_data["movement"])
		if movement != "flying" and movement != "swimming" and _can_occupy(enemy,species_data,next_x,current_y-1) and not _blocked_at(next_x,current_y):
			enemy["x"] = next_x
			enemy["y"] = current_y - 1
			continue
		collided = true
		enemy["wall_direction"] = direction
		enemy["vx"] = float(enemy["vx"]) * -0.45
		enemy["move_carry_x"] = 0.0
		if not _has_behavior(species_data,"wall_climber"):
			enemy["facing"] = -int(enemy.get("facing",1))
		break
	return collided

func _move_vertical(enemy: Dictionary, species_data: Dictionary, pixels: int) -> bool:
	var direction: int = int(sign(pixels))
	var collided: bool = false
	for _step: int in range(abs(pixels)):
		var current_x: int = roundi(float(enemy["x"]))
		var next_y: int = roundi(float(enemy["y"])) + direction
		if _can_occupy(enemy,species_data,current_x,next_y):
			enemy["y"] = next_y
			continue
		collided = true
		var bounce: float = 0.6 if ["flying","swimming"].has(String(species_data["movement"])) else 0.2
		enemy["vy"] = float(enemy["vy"]) * -bounce
		enemy["move_carry_y"] = 0.0
		break
	return collided

func _consume_motion(enemy: Dictionary, species_data: Dictionary) -> void:
	enemy["move_carry_x"] = float(enemy.get("move_carry_x",0.0)) + float(enemy["vx"])
	enemy["move_carry_y"] = float(enemy.get("move_carry_y",0.0)) + float(enemy["vy"])
	var pixels_x: int = int(float(enemy["move_carry_x"]))
	var pixels_y: int = int(float(enemy["move_carry_y"]))
	enemy["move_carry_x"] = float(enemy["move_carry_x"]) - pixels_x
	enemy["move_carry_y"] = float(enemy["move_carry_y"]) - pixels_y
	_move_horizontal(enemy,species_data,pixels_x)
	_move_vertical(enemy,species_data,pixels_y)
	enemy["x"] = roundi(float(enemy["x"]))
	enemy["y"] = roundi(float(enemy["y"]))

func _wander_direction(enemy: Dictionary) -> int:
	if int(enemy.get("idle_timer",0)) > 0:
		enemy["idle_timer"] = int(enemy["idle_timer"]) - 1
		return int(enemy.get("wander_direction",enemy.get("facing",1)))
	enemy["idle_timer"] = 35 + floori(_random_at(float(enemy["x"]),float(enemy["y"]),state.frame+8301)*130.0)
	enemy["wander_direction"] = -1 if _random_at(float(enemy["y"]),float(enemy["x"]),state.frame+8302) < 0.5 else 1
	return int(enemy["wander_direction"])

func _pack_context(enemy: Dictionary, species_data: Dictionary, enemies: Array) -> Dictionary:
	if not _has_behavior(species_data,"pack_hunter"):
		return {"count":1,"center_x":float(enemy["x"]),"center_y":float(enemy["y"]),"speed_multiplier":1.0,"flank_offset":0.0}
	var count: int = 1
	var center_x: float = float(enemy["x"])
	var center_y: float = float(enemy["y"])
	for ally_value: Variant in enemies:
		var ally: Dictionary = ally_value
		if ally == enemy or String(ally.get("species_id","")) != String(enemy.get("species_id","")) or float(ally.get("hp",0.0)) <= 0.0:
			continue
		if Vector2(float(ally["x"])-float(enemy["x"]),float(ally["y"])-float(enemy["y"])).length() > float(GameConfig.ENEMY_BEHAVIOR["pack_radius"]):
			continue
		count += 1
		center_x += float(ally["x"])
		center_y += float(ally["y"])
	center_x /= count
	center_y /= count
	var bonus: float = minf(float(GameConfig.ENEMY_BEHAVIOR["pack_max_speed_bonus"]), float(max(0,count-1))*float(GameConfig.ENEMY_BEHAVIOR["pack_speed_bonus_per_ally"]))
	var side: int = 1 if int(enemy.get("animation_offset",0)) % 2 == 0 else -1
	enemy["pack_count"] = count
	return {"count":count,"center_x":center_x,"center_y":center_y,"speed_multiplier":1.0+bonus,"flank_offset":side*float(GameConfig.ENEMY_BEHAVIOR["pack_flank_distance"])}

func _nearest_pickup(enemy: Dictionary) -> Dictionary:
	var best: Dictionary = {}
	var best_distance: float = float(GameConfig.ENEMY_BEHAVIOR["scavenger_sense_radius"])
	for pickup_value: Variant in state.entities["pickups"]:
		var pickup: Dictionary = pickup_value
		if int(pickup.get("life",1)) <= 0:
			continue
		var distance: float = Vector2(float(pickup["x"])-float(enemy["x"]),float(pickup["y"])-float(enemy["y"])).length()
		if distance < best_distance:
			best = pickup
			best_distance = distance
	return {} if best.is_empty() else {"pickup":best,"distance":best_distance}

func _consume_pickup(enemy: Dictionary, pickup: Dictionary) -> bool:
	var pickups: Array = state.entities["pickups"]
	var index: int = pickups.find(pickup)
	if index < 0:
		return false
	pickups.remove_at(index)
	var amount: int = max(1,int(pickup.get("amount",1)))
	enemy["hp"] = minf(float(enemy["max_hp"]),float(enemy["hp"])+float(GameConfig.ENEMY_BEHAVIOR["scavenger_heal_per_item"])*amount)
	enemy["fed_level"] = min(6,int(enemy.get("fed_level",0))+1)
	if int(enemy["fed_level"]) % 2 == 0:
		enemy["max_hp"] = float(enemy["max_hp"]) + 1.0
	return true

func _update_ground(enemy: Dictionary, species_data: Dictionary, dx: float, dy: float, distance: float, enemies: Array) -> void:
	var grounded: bool = _on_ground(enemy)
	var hostile: bool = String(species_data["temperament"]) == "hostile"
	var pack: Dictionary = _pack_context(enemy,species_data,enemies)
	var direction: int = _wander_direction(enemy)
	var target_speed: float = float(species_data["speed"]) * 0.42
	var scavenging: Dictionary = _nearest_pickup(enemy) if _has_behavior(species_data,"scavenger") else {}
	if not scavenging.is_empty() and (not hostile or distance > 11.0):
		var pickup: Dictionary = scavenging["pickup"]
		direction = int(sign(float(pickup["x"])-float(enemy["x"])))
		if direction == 0: direction = int(enemy.get("facing",1))
		target_speed = float(species_data["speed"]) * 0.82
		enemy["scavenging"] = true
		if float(scavenging["distance"]) < 2.3: _consume_pickup(enemy,pickup)
	else:
		enemy["scavenging"] = false
		if hostile and distance < float(species_data["aggro_range"]):
			var target_x: float = float(state.player["x"]) + (float(pack["flank_offset"]) if int(pack["count"]) > 1 and distance < 18.0 else 0.0)
			direction = int(sign(target_x-float(enemy["x"])))
			if direction == 0: direction = int(enemy.get("facing",1))
			target_speed = float(species_data["speed"]) * float(pack["speed_multiplier"])
		elif not hostile and distance < float(species_data["flee_range"]):
			direction = -int(sign(dx))
			if direction == 0: direction = int(enemy.get("facing",1))
			target_speed = float(species_data["speed"]) * 1.15
			enemy["startled"] = 30
	if String(species_data["movement"]) == "charger" and hostile and distance < 18.0:
		enemy["charge_timer"] = int(enemy.get("charge_timer",0)) - 1
		if int(enemy["charge_timer"]) <= 0:
			enemy["charge_timer"] = 70
			enemy["vx"] = direction * float(species_data["speed"]) * 2.2
	enemy["facing"] = direction if direction != 0 else int(enemy.get("facing",1))
	enemy["vx"] = float(enemy["vx"]) + (float(direction)*target_speed-float(enemy["vx"]))*0.18
	enemy["vx"] = float(enemy["vx"]) * (0.82 if grounded else 0.95)
	enemy["hop_cooldown"] = int(enemy.get("hop_cooldown",0)) - 1
	if grounded and int(enemy["hop_cooldown"]) <= 0 and String(species_data["movement"]) == "hopper":
		enemy["vy"] = -0.82
		enemy["hop_cooldown"] = 35 + floori(_random_at(float(enemy["x"]),float(enemy["y"]),state.frame+8401)*75.0)
	if _has_behavior(species_data,"wall_climber"):
		var wall_direction: int = direction if direction != 0 else int(enemy.get("facing",1))
		var vertical_direction: int = int(sign(dy))
		if vertical_direction == 0: vertical_direction = -1
		if _blocked_at(roundi(float(enemy["x"]))+wall_direction,roundi(float(enemy["y"]))) and not _blocked_at(roundi(float(enemy["x"])),roundi(float(enemy["y"]))+vertical_direction):
			enemy["climbing"] = true
			enemy["facing"] = wall_direction
			enemy["vx"] = wall_direction * 0.06
			enemy["vy"] = float(enemy["vy"]) + (vertical_direction*float(species_data["speed"])*0.9-float(enemy["vy"]))*0.35
		else:
			enemy["climbing"] = false
	if not bool(enemy.get("climbing",false)):
		enemy["vy"] = minf(1.2,float(enemy.get("vy",0.0))+0.09)

func _update_flying(enemy: Dictionary, species_data: Dictionary, dx: float, dy: float, distance: float, enemies: Array) -> void:
	var hostile: bool = String(species_data["temperament"]) == "hostile"
	var pack: Dictionary = _pack_context(enemy,species_data,enemies)
	var direction_x: float = sin(float(enemy["phase"])*0.73)
	var direction_y: float = cos(float(enemy["phase"])*1.17)*0.55
	var speed: float = float(species_data["speed"])*0.55
	if hostile and distance < float(species_data["aggro_range"]):
		var target_x: float = float(state.player["x"]) + (float(pack["flank_offset"]) if int(pack["count"]) > 1 else 0.0)
		direction_x = (target_x-float(enemy["x"]))/maxf(1.0,distance)
		direction_y = dy/maxf(1.0,distance)
		speed = float(species_data["speed"])*float(pack["speed_multiplier"])
	elif not hostile and distance < float(species_data["flee_range"]):
		direction_x = -dx/maxf(1.0,distance)
		direction_y = -dy/maxf(1.0,distance)
		speed = float(species_data["speed"])*1.1
		enemy["startled"] = 30
	if absf(direction_x) > 0.001: enemy["facing"] = int(sign(direction_x))
	enemy["vx"] = (float(enemy["vx"])+(direction_x*speed-float(enemy["vx"]))*0.12)*0.94
	enemy["vy"] = (float(enemy["vy"])+(direction_y*speed-float(enemy["vy"]))*0.12)*0.94

func _update_swimming(enemy: Dictionary, species_data: Dictionary, dx: float, dy: float, distance: float, enemies: Array) -> void:
	var hostile: bool = String(species_data["temperament"]) == "hostile"
	var pack: Dictionary = _pack_context(enemy,species_data,enemies)
	var direction_x: float = sin(float(enemy["phase"])*0.61)
	var direction_y: float = cos(float(enemy["phase"])*0.83)*0.45
	var speed: float = float(species_data["speed"])*0.55
	if hostile and distance < float(species_data["aggro_range"]):
		direction_x = dx/maxf(1.0,distance)
		direction_y = dy/maxf(1.0,distance)
		speed = float(species_data["speed"])*float(pack["speed_multiplier"])
	elif not hostile and distance < float(species_data["flee_range"]):
		direction_x = -dx/maxf(1.0,distance)
		direction_y = -dy/maxf(1.0,distance)
		speed = float(species_data["speed"])*1.15
		enemy["startled"] = 30
	if absf(direction_x) > 0.001: enemy["facing"] = int(sign(direction_x))
	enemy["vx"] = (float(enemy["vx"])+(direction_x*speed-float(enemy["vx"]))*0.16)*0.92
	enemy["vy"] = (float(enemy["vy"])+(direction_y*speed-float(enemy["vy"]))*0.16)*0.92

func _find_burrow_cell(enemy: Dictionary) -> Variant:
	for depth: int in range(1,5):
		var y: int = roundi(float(enemy["y"])) + depth
		var material: int = world.get_cell(roundi(float(enemy["x"])),y)
		if world.is_solid(material) and material != GameData.LAVA: return y
	return null

func _emerge_burrower(enemy: Dictionary) -> bool:
	for rise: int in range(1,11):
		var x: int = roundi(float(enemy["x"]))
		var candidate_y: int = roundi(float(enemy["y"])) - rise
		if world.is_solid(world.get_cell(x,candidate_y)): continue
		if world.is_solid(world.get_cell(x,candidate_y+1)):
			enemy["y"] = candidate_y
			enemy["burrowed"] = false
			enemy["hidden"] = false
			enemy["vy"] = -0.55
			enemy["burrow_cooldown"] = int(GameConfig.ENEMY_BEHAVIOR["burrow_cooldown_frames"])
			return true
	return false

func _update_burrower(enemy: Dictionary, species_data: Dictionary, dx: float, distance: float) -> bool:
	enemy["burrow_cooldown"] = max(0,int(enemy.get("burrow_cooldown",0))-1)
	if bool(enemy.get("burrowed",false)):
		enemy["hidden"] = true
		enemy["burrow_timer"] = int(enemy.get("burrow_timer",0))-1
		enemy["facing"] = int(sign(dx)) if absf(dx)>0.001 else int(enemy.get("facing",1))
		enemy["vx"] = float(enemy["vx"]) + (int(enemy["facing"])*float(species_data["speed"])*1.18-float(enemy["vx"]))*0.22
		enemy["vy"] = float(enemy["vy"])*0.3
		if distance <= float(GameConfig.ENEMY_BEHAVIOR["burrow_emerge_distance"]) or int(enemy["burrow_timer"]) <= 0: _emerge_burrower(enemy)
		return true
	if distance < float(species_data["aggro_range"]) and distance > float(GameConfig.ENEMY_BEHAVIOR["burrow_emerge_distance"])+2.0 and int(enemy["burrow_cooldown"]) <= 0 and _on_ground(enemy):
		var burrow_y: Variant = _find_burrow_cell(enemy)
		if burrow_y != null:
			enemy["y"] = int(burrow_y)
			enemy["burrowed"] = true
			enemy["hidden"] = true
			enemy["burrow_timer"] = _random_int(int(GameConfig.ENEMY_BEHAVIOR["burrow_duration_min"]),int(GameConfig.ENEMY_BEHAVIOR["burrow_duration_max"]),float(enemy["x"]),float(enemy["y"]),state.frame+8411)
			enemy["vy"] = 0.0
			return true
	return false

func _update_mimic(enemy: Dictionary, species_data: Dictionary, distance: float) -> bool:
	if not _has_behavior(species_data,"mimic"): return false
	if not enemy.has("mimic_awake"): enemy["mimic_awake"] = false
	if not bool(enemy["mimic_awake"]):
		enemy["hidden"] = true
		enemy["disguised"] = true
		enemy["vx"] = 0.0
		enemy["vy"] = 0.0
		if distance < 9.0 or int(enemy.get("hit",0)) > 0 or int(enemy.get("burning",0)) > 0:
			enemy["mimic_awake"] = true
			enemy["hidden"] = false
			enemy["disguised"] = false
			enemy["vy"] = -0.62
		return not bool(enemy["mimic_awake"])
	enemy["hidden"] = false
	enemy["disguised"] = false
	return false

func _build_nest(enemy: Dictionary, species_data: Dictionary, distance: float) -> void:
	if not _has_behavior(species_data,"nest_builder"): return
	enemy["nest_timer"] = int(enemy.get("nest_timer",int(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"]))) - 1
	var nests: Array = state.entities["enemy_nests"]
	if int(enemy["nest_timer"]) > 0 or distance < 22.0 or not _on_ground(enemy) or nests.size() >= int(GameConfig.ENEMY_BEHAVIOR["max_nests"]): return
	for nest_value: Variant in nests:
		var nest: Dictionary = nest_value
		if Vector2(float(nest["x"])-float(enemy["x"]),float(nest["y"])-float(enemy["y"])).length() < 18.0:
			enemy["nest_timer"] = floori(float(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"])*0.6)
			return
	nests.append({"id":"nest-%s-%d-%d" % [String(state.world["dimension"]),state.frame,int(enemy.get("animation_offset",0))],"x":roundi(float(enemy["x"])),"y":roundi(float(enemy["y"])),"species_id":String(species_data["id"]),"hp":34.0,"max_hp":34.0,"life":int(GameConfig.ENEMY_BEHAVIOR["nest_life_frames"]),"spawn_timer":int(GameConfig.ENEMY_BEHAVIOR["nest_spawn_frames"]),"phase":_random_at(float(enemy["x"]),float(enemy["y"]),state.frame+8501)*TAU})
	enemy["nest_timer"] = int(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"])

func _valid_spawn_near(x: int, y: int, species_data: Dictionary) -> Dictionary:
	for radius: int in range(1,int(GameConfig.ENEMY_BEHAVIOR["nest_spawn_radius"])+1):
		for direction: int in [-1,1]:
			var px: int = x + radius*direction
			for py: int in range(y-5,y+4):
				if not world.is_active_world_position(px,py): continue
				var movement: String = String(species_data["movement"])
				if movement == "flying":
					if not world.is_solid(world.get_cell(px,py)) and world.get_cell(px,py) != GameData.WATER: return {"x":px,"y":py}
				elif movement == "swimming":
					if world.get_cell(px,py) == GameData.WATER: return {"x":px,"y":py}
				elif not world.is_solid(world.get_cell(px,py)) and world.is_solid(world.get_cell(px,py+1)):
					return {"x":px,"y":py}
	return {}

func _active_enemy_count() -> int:
	var count: int = 0
	for chunk_value: Variant in state.world["active_chunks"]: count += ((chunk_value as Dictionary)["enemies"] as Array).size()
	return count

func _update_nests() -> void:
	var nests: Array = state.entities["enemy_nests"]
	for index: int in range(nests.size()-1,-1,-1):
		var nest: Dictionary = nests[index]
		if not world.is_active_world_position(float(nest["x"]),float(nest["y"])): continue
		nest["life"] = int(nest["life"])-1
		nest["phase"] = float(nest.get("phase",0.0))+0.025
		if int(nest["life"]) <= 0 or float(nest["hp"]) <= 0.0 or not world.is_solid(world.get_cell(int(nest["x"]),int(nest["y"])+1)):
			nests.remove_at(index)
			continue
		nest["spawn_timer"] = int(nest["spawn_timer"])-1
		if int(nest["spawn_timer"]) > 0 or _active_enemy_count() >= int(GameConfig.ENEMY_BEHAVIOR["nest_enemy_cap"]): continue
		var species_data: Dictionary = FaunaData.fauna(String(nest["species_id"]))
		if species_data.is_empty():
			nests.remove_at(index)
			continue
		var position: Dictionary = _valid_spawn_near(int(nest["x"]),int(nest["y"]),species_data)
		if not position.is_empty(): spawn_creature(String(species_data["id"]),float(position["x"]),float(position["y"]),{"from_nest":true,"nest_timer":int(GameConfig.ENEMY_BEHAVIOR["nest_build_frames"])})
		nest["spawn_timer"] = int(GameConfig.ENEMY_BEHAVIOR["nest_spawn_frames"]) + _random_int(-120,180,float(nest["x"]),float(nest["y"]),state.frame+8511)

func _next_available_weapon(current: int) -> int:
	var count: int = GameData.WEAPONS.size()
	for offset: int in range(1,count+1):
		var candidate: int = (current+offset)%count
		if state.player["stolen_weapon_id"] == null or candidate != int(state.player["stolen_weapon_id"]): return candidate
	return 0

func _steal_weapon(enemy: Dictionary, species_data: Dictionary) -> bool:
	if not _has_behavior(species_data,"weapon_thief") or state.player["stolen_weapon_id"] != null or int(state.player.get("weapon_theft_cooldown",0)) > 0 or enemy.get("stolen_weapon_id") != null: return false
	enemy["stolen_weapon_id"] = state.weapon_id
	state.player["stolen_weapon_id"] = state.weapon_id
	state.player["weapon_theft_cooldown"] = int(GameConfig.ENEMY_BEHAVIOR["weapon_theft_cooldown"])
	state.weapon_id = _next_available_weapon(state.weapon_id)
	enemy["fleeing_with_weapon"] = true
	enemy["startled"] = 180
	state.show_message("%s stole your weapon!" % String(species_data["name"]),1200)
	return true

func _attach_parasite(enemy: Dictionary, species_data: Dictionary, chunk: Dictionary, index: int) -> bool:
	if not _has_behavior(species_data,"parasite") or int(enemy.get("attach_cooldown",0)) > 0: return false
	var attached: Array = state.player["attached_parasites"]
	if attached.size() >= int(GameConfig.ENEMY_BEHAVIOR["parasite_max_attached"]): return false
	attached.append({"species_id":String(species_data["id"]),"life":int(GameConfig.ENEMY_BEHAVIOR["parasite_life_frames"]),"phase":float(enemy.get("phase",0.0)),"damage_timer":int(GameConfig.ENEMY_BEHAVIOR["parasite_damage_interval"]),"shake":0.0})
	(chunk["enemies"] as Array).remove_at(index)
	chunk["save_enemies"] = true
	state.show_message("%s latched on — move and jump to shake it off" % String(species_data["name"]),1100)
	return true

func _update_attached_parasites() -> void:
	var attached: Array = state.player["attached_parasites"]
	state.player["weapon_theft_cooldown"] = max(0,int(state.player.get("weapon_theft_cooldown",0))-1)
	for index: int in range(attached.size()-1,-1,-1):
		var parasite: Dictionary = attached[index]
		parasite["life"] = int(parasite["life"])-1
		parasite["phase"] = float(parasite.get("phase",0.0))+0.18
		parasite["damage_timer"] = int(parasite.get("damage_timer",int(GameConfig.ENEMY_BEHAVIOR["parasite_damage_interval"])))-1
		parasite["shake"] = float(parasite.get("shake",0.0))+absf(float(state.player["vx"]))*0.28+absf(float(state.player["vy"]))*0.18
		if int(parasite["damage_timer"]) <= 0:
			player_system.damage(float(GameConfig.ENEMY_BEHAVIOR["parasite_damage"]))
			parasite["damage_timer"] = int(GameConfig.ENEMY_BEHAVIOR["parasite_damage_interval"])
		if int(parasite["life"]) <= 0 or float(parasite["shake"]) >= 42.0:
			var species_data: Dictionary = FaunaData.fauna(String(parasite["species_id"]))
			attached.remove_at(index)
			if not species_data.is_empty(): spawn_creature(String(species_data["id"]),float(state.player["x"])-int(state.player["facing"])*4.0,float(state.player["y"])-3.0,{"hp":maxf(1.0,floor(float(species_data["hp"])*0.45)),"startled":120,"vx":-int(state.player["facing"])*0.8,"attach_cooldown":180})
	state.player["parasite_slow_multiplier"] = maxf(float(GameConfig.ENEMY_BEHAVIOR["parasite_minimum_speed_multiplier"]),1.0-attached.size()*float(GameConfig.ENEMY_BEHAVIOR["parasite_slow_per_attachment"]))

func _invasion_position(x: int, y: int) -> Dictionary:
	for radius: int in range(0,11):
		for direction: int in [1,-1]:
			var px: int = x+radius*direction
			for py: int in range(y-8,y+7):
				if world.is_active_world_position(px,py) and not world.is_solid(world.get_cell(px,py)) and not world.is_solid(world.get_cell(px,py-1)): return {"x":px,"y":py}
	return {"x":x,"y":y}

func open_invasion_portal(source_dimension: String, x: float = NAN, y: float = NAN, wave_size: int = -1) -> Dictionary:
	var portals: Array = state.entities["invasion_portals"]
	if portals.size() >= int(GameConfig.ENEMY_BEHAVIOR["max_invasion_portals"]): return {}
	if is_nan(x): x = float(state.player["x"])+32.0
	if is_nan(y): y = float(state.player["y"])-4.0
	var position: Dictionary = _invasion_position(roundi(x),roundi(y))
	var resolved_wave: int = wave_size if wave_size >= 0 else _random_int(int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_wave_min"]),int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_wave_max"]),float(position["x"]),float(position["y"]),state.frame+8601)
	var portal: Dictionary = {"id":"invasion-%d" % int(state.world.get("invasion_serial",1)),"x":int(position["x"]),"y":int(position["y"]),"source_dimension":source_dimension,"age":0,"life":int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_life_frames"]),"spawn_timer":int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_open_frames"]),"wave_size":resolved_wave,"spawned":0,"phase":_random_at(float(position["x"]),float(position["y"]),state.frame+8602)*TAU}
	state.world["invasion_serial"] = int(state.world.get("invasion_serial",1))+1
	portals.append(portal)
	state.show_message("Unstable %s rift detected" % String(GameData.dimension(source_dimension)["name"]),1200)
	return portal

func _schedule_next_invasion(initial: bool = false) -> void:
	var minimum: int = int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_initial_min_frames"] if initial else GameConfig.ENEMY_BEHAVIOR["invasion_portal_min_frames"])
	var maximum: int = int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_initial_max_frames"] if initial else GameConfig.ENEMY_BEHAVIOR["invasion_portal_max_frames"])
	state.world["next_invasion_frame"] = state.frame + _random_int(minimum,maximum,float(state.player["x"]),float(state.player["y"]),state.frame+8611)

func _maybe_open_invasion() -> void:
	if state.world["next_invasion_frame"] == null: _schedule_next_invasion(int(state.world.get("invasion_count",0)) == 0)
	if state.frame < int(state.world["next_invasion_frame"]) or (state.entities["invasion_portals"] as Array).size() >= int(GameConfig.ENEMY_BEHAVIOR["max_invasion_portals"]) or bool(state.player["sky_spawn"]) or bool(state.player["locked"]): return
	var choices: Array[String] = []
	for dimension_id: String in GameData.dimension_ids():
		if dimension_id != String(state.world["dimension"]): choices.append(dimension_id)
	if choices.is_empty(): return
	var source: String = choices[floori(_random_at(float(state.player["x"]),float(state.player["y"]),state.frame+8621)*choices.size())%choices.size()]
	var side: int = -1 if _random_at(float(state.player["y"]),float(state.player["x"]),state.frame+8622)<0.5 else 1
	var portal: Dictionary = open_invasion_portal(source,float(state.player["x"])+side*_random_int(25,42,float(state.player["x"]),float(state.player["y"]),state.frame+8623),float(state.player["y"])-3.0)
	if not portal.is_empty(): state.world["invasion_count"] = int(state.world.get("invasion_count",0))+1
	_schedule_next_invasion(false)

func _update_invasion_portals() -> void:
	_maybe_open_invasion()
	var portals: Array = state.entities["invasion_portals"]
	for index: int in range(portals.size()-1,-1,-1):
		var portal: Dictionary = portals[index]
		portal["age"] = int(portal["age"])+1
		portal["life"] = int(portal["life"])-1
		portal["phase"] = float(portal["phase"])+0.08
		portal["spawn_timer"] = int(portal["spawn_timer"])-1
		if int(portal["spawn_timer"]) <= 0 and int(portal["spawned"]) < min(int(portal["wave_size"]),int(GameConfig.ENEMY_BEHAVIOR["max_invaders_per_portal"])):
			var choices: Array = FaunaData.INVADERS_BY_DIMENSION.get(String(portal["source_dimension"]),FaunaData.INVADERS_BY_DIMENSION["static"])
			var species_id: String = String(choices[int(portal["spawned"])%choices.size()])
			var species_data: Dictionary = FaunaData.fauna(species_id)
			var position: Dictionary = _valid_spawn_near(int(portal["x"]),int(portal["y"]),species_data)
			if position.is_empty(): position = {"x":portal["x"],"y":portal["y"]}
			spawn_creature(species_id,float(position["x"]),float(position["y"]),{"invader":true,"source_dimension":String(portal["source_dimension"]),"startled":45})
			portal["spawned"] = int(portal["spawned"])+1
			portal["spawn_timer"] = int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_spawn_interval"])
		if int(portal["life"]) <= 0 or (int(portal["spawned"]) >= int(portal["wave_size"]) and int(portal["age"]) > int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_open_frames"])+int(portal["wave_size"])*int(GameConfig.ENEMY_BEHAVIOR["invasion_portal_spawn_interval"])+90): portals.remove_at(index)

func _return_stolen_weapon(enemy: Dictionary, quiet: bool = false) -> bool:
	if enemy.get("stolen_weapon_id") == null: return false
	if state.player["stolen_weapon_id"] == enemy["stolen_weapon_id"]: state.player["stolen_weapon_id"] = null
	if not quiet: state.show_message("Stolen weapon recovered",900)
	enemy["stolen_weapon_id"] = null
	return true

func recall_stolen_weapon() -> bool:
	if state.player["stolen_weapon_id"] == null: return false
	for chunk_value: Variant in state.world["active_chunks"]:
		for enemy_value: Variant in (chunk_value as Dictionary)["enemies"]:
			var enemy: Dictionary = enemy_value
			if enemy.get("stolen_weapon_id") == state.player["stolen_weapon_id"]: enemy["stolen_weapon_id"] = null
	state.player["stolen_weapon_id"] = null
	state.show_message("Dimensional transit recalled your stolen weapon",900)
	return true

func _update_environment(enemy: Dictionary, species_data: Dictionary) -> void:
	var material: int = world.get_cell(roundi(float(enemy["x"])),roundi(float(enemy["y"])))
	var volcanic: bool = VOLCANIC_FAUNA.has(String(species_data["id"]))
	if material == GameData.LAVA and not volcanic: enemy["hp"] = float(enemy["hp"])-0.45
	if material == GameData.FIRE and not volcanic:
		enemy["hp"] = float(enemy["hp"])-0.24
		enemy["burning"] = max(100,int(enemy.get("burning",0)))
	if material == GameData.STEAM: enemy["hp"] = float(enemy["hp"])-float(GameConfig.STEAM["enemy_damage_per_frame"])
	if String(species_data["movement"]) == "swimming" and material != GameData.WATER: enemy["hp"] = float(enemy["hp"])-0.06

func update() -> void:
	_update_attached_parasites()
	_update_nests()
	_update_invasion_portals()
	var camera: Dictionary = state.world["camera"]
	var transfers: Array = []
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		if int(chunk["x"]) != int(camera["chunk_x"]) or int(chunk["y"]) != int(camera["chunk_y"]): continue
		var enemies: Array = chunk["enemies"]
		for index: int in range(enemies.size()-1,-1,-1):
			var enemy: Dictionary = enemies[index]
			var species_data: Dictionary = species_of(enemy)
			if float(enemy.get("hp",0.0)) <= 0.0:
				_return_stolen_weapon(enemy)
				_drop_loot(enemy,species_data)
				enemies.remove_at(index)
				chunk["save_enemies"] = true
				continue
			enemy["phase"] = float(enemy.get("phase",0.0))+0.04
			enemy["age"] = int(enemy.get("age",0))+1
			for timer: String in ["hit","startled","attack_cooldown","theft_cooldown","attach_cooldown"]:
				if int(enemy.get(timer,0)) > 0: enemy[timer] = int(enemy[timer])-1
			if int(enemy.get("burning",0)) > 0:
				enemy["burning"] = int(enemy["burning"])-1
				if not VOLCANIC_FAUNA.has(String(species_data["id"])): enemy["hp"] = float(enemy["hp"])-0.16
				if state.frame%9 == 0 and world.get_cell(roundi(float(enemy["x"])),roundi(float(enemy["y"]))) == GameData.AIR: world.set_cell(roundi(float(enemy["x"])),roundi(float(enemy["y"])),GameData.FIRE,30)
			var dx: float = float(state.player["x"])-float(enemy["x"])
			var dy: float = float(state.player["y"])-2.0-float(enemy["y"])
			var distance: float = maxf(0.0001,Vector2(dx,dy).length())
			if _update_mimic(enemy,species_data,distance): continue
			var burrowing: bool = _has_behavior(species_data,"burrower") and _update_burrower(enemy,species_data,dx,distance)
			if not burrowing:
				match String(species_data["movement"]):
					"flying": _update_flying(enemy,species_data,dx,dy,distance,enemies)
					"swimming": _update_swimming(enemy,species_data,dx,dy,distance,enemies)
					_: _update_ground(enemy,species_data,dx,dy,distance,enemies)
			if bool(enemy.get("fleeing_with_weapon",false)):
				enemy["facing"] = -int(sign(dx)) if absf(dx)>0.001 else int(enemy.get("facing",1))
				enemy["vx"] = float(enemy["vx"])+(int(enemy["facing"])*float(species_data["speed"])*1.35-float(enemy["vx"]))*0.25
				if distance > 50.0: enemy["fleeing_with_weapon"] = false
			_consume_motion(enemy,species_data)
			_update_environment(enemy,species_data)
			_build_nest(enemy,species_data,distance)
			var contact_radius: float = float(species_data.get("hit_radius",2.0))+1.4
			if not bool(enemy.get("burrowed",false)) and String(species_data["temperament"]) == "hostile" and distance < contact_radius and int(enemy.get("attack_cooldown",0)) <= 0:
				if _attach_parasite(enemy,species_data,chunk,index): continue
				if not _steal_weapon(enemy,species_data): player_system.damage(float(species_data["contact_damage"]),float(enemy["x"]))
				enemy["attack_cooldown"] = 28
			var target_chunk_x: int = world.chunk_x(float(enemy["x"]))
			var target_chunk_y: int = world.chunk_y(float(enemy["y"]))
			if target_chunk_x != int(chunk["x"]) or target_chunk_y != int(chunk["y"]):
				var target: Dictionary = world.get_chunk(target_chunk_x,target_chunk_y,false)
				if not target.is_empty() and (state.world["active_keys"] as Dictionary).has(world.chunk_key(target_chunk_x,target_chunk_y)):
					enemies.remove_at(index)
					chunk["save_enemies"] = true
					target["save_enemies"] = true
					transfers.append([enemy,target])
				else:
					enemy["vx"] = float(enemy["vx"])*-0.7
					enemy["vy"] = float(enemy["vy"])*-0.7
	for transfer_value: Variant in transfers:
		var transfer: Array = transfer_value
		(transfer[1]["enemies"] as Array).append(transfer[0])
