class_name StructureSystem
extends RefCounted

const DIMENSION_ENTITY_KEYS: Array[String] = ["bosses","boss_fireballs","serpent_projectiles","boss_projectiles","pickups","seed_particles","enemy_nests","invasion_portals","furniture"]
const TRANSIENT_ENTITY_KEYS: Array[String] = ["bullets","napalm_shots","glaives","grenades","drones","drone_rockets","nyan_cats","nyan_sparks","laser_sparks","reality_rifts","reality_sparks","explosions","juice_particles","damage_numbers","juice_flashes","juice_shockwaves"]

var state: GameState
var world: WorldModel

func _init(game_state: GameState, world_model: WorldModel) -> void:
	state = game_state
	world = world_model
	_ensure_dimension_entities()

func _ensure_dimension_entities() -> Dictionary:
	var stores: Dictionary = state.world["dimension_entities"]
	var positions: Dictionary = state.world["dimension_positions"]
	for dimension_id: String in GameData.dimension_ids():
		if not stores.has(dimension_id):
			stores[dimension_id] = {}
		if not positions.has(dimension_id):
			positions[dimension_id] = {"x": int(GameData.dimension(dimension_id).get("spawn_x", 48)), "y": 45}
	return stores

func switch_dimension(target_dimension: String, target_position: Vector2, current_return_position: Variant = null) -> void:
	var current: String = String(state.world["dimension"])
	if state.player["stolen_weapon_id"] != null:
		for chunk_variant: Variant in (state.world["chunks"] as Dictionary).values():
			var chunk: Dictionary = chunk_variant
			if String(chunk.get("dimension", "earth")) != current:
				continue
			for enemy: Dictionary in chunk["enemies"]:
				if enemy.get("stolen_weapon_id", null) == state.player["stolen_weapon_id"]:
					enemy["stolen_weapon_id"] = null
		state.player["stolen_weapon_id"] = null
		state.show_message("Dimensional transit recalled your stolen weapon", 900)
	if current == target_dimension:
		state.player["x"] = roundf(target_position.x)
		state.player["y"] = roundf(target_position.y)
		state.player["vx"] = 0.0
		state.player["vy"] = 0.0
		world.update_active_neighborhood()
		return
	var stores: Dictionary = _ensure_dimension_entities()
	var return_position: Dictionary = {"x": float(state.player["x"]), "y": float(state.player["y"])}
	if current_return_position is Vector2:
		return_position = {"x": current_return_position.x, "y": current_return_position.y}
	elif current_return_position is Dictionary:
		return_position = current_return_position
	state.world["dimension_positions"][current] = return_position
	var current_store: Dictionary = stores[current]
	var target_store: Dictionary = stores[target_dimension]
	for key: String in DIMENSION_ENTITY_KEYS:
		var array: Array = state.entities[key]
		current_store[key] = array.duplicate(true)
		array.clear()
		var incoming: Array = target_store.get(key, [])
		array.append_array(incoming)
		target_store[key] = []
	for key: String in TRANSIENT_ENTITY_KEYS:
		(state.entities[key] as Array).clear()
	var hook: Dictionary = state.entities["hook"]
	hook.merge({"active":false,"stuck":false,"x":0.0,"y":0.0,"vx":0.0,"vy":0.0}, true)
	state.world["dimension"] = target_dimension
	state.world["dimension_positions"][target_dimension] = {"x": target_position.x, "y": target_position.y}
	state.world["visited_dimensions"][target_dimension] = true
	state.player["x"] = roundf(target_position.x)
	state.player["y"] = roundf(target_position.y)
	state.player["vx"] = 0.0
	state.player["vy"] = 0.0
	(state.world["active_chunks"] as Array).clear()
	(state.world["active_keys"] as Dictionary).clear()
	state.weather.merge({"override_type":null,"current_type":"clear","previous_type":"clear","segment":-1,"intensity":0.0,"wind_x":0.0,"visibility":1.0,"next_lightning_frame":0}, true)
	(state.weather["flashes"] as Array).clear()
	world.update_active_neighborhood()

func _portal_state() -> Dictionary:
	return state.world["dimension_portal"]

func _portal_space_open(center_x: int, center_y: int) -> bool:
	for y: int in range(center_y - 6, center_y + 6):
		for x: int in range(center_x - 2, center_x + 3):
			if world.is_solid(world.get_cell(x, y)):
				return false
	return true

func _find_portal_position() -> Vector2i:
	for offset: int in [10,-10,14,-14,7,-7,18,-18]:
		for vertical: int in [0,-4,4,-8,8]:
			var x: int = roundi(float(state.player["x"])) + offset
			var y: int = roundi(float(state.player["y"])) + vertical - 2
			if _portal_space_open(x, y):
				return Vector2i(x, y)
	return Vector2i(roundi(float(state.player["x"])) + 8, roundi(float(state.player["y"])) - 2)

func open_dimension_portal(target_dimension: String) -> bool:
	var definition: Dictionary = GameData.dimension(target_dimension)
	if definition.is_empty() or String(definition["id"]) != target_dimension:
		return false
	if String(state.world["dimension"]) == target_dimension:
		state.show_message("Already in %s" % definition["name"], 1000)
		return false
	if bool(state.world["rocket_flight"]["active"]):
		return false
	var portal: Dictionary = _portal_state()
	var position: Vector2i = _find_portal_position()
	portal.merge({"active":true,"phase":"open","timer":0,"life":1200,"x":position.x,"y":position.y,"target_dimension":target_dimension,"source_dimension":String(state.world["dimension"]),"source_return_position":{"x":float(state.player["x"]),"y":float(state.player["y"])},"colors":definition["portal_colors"]}, true)
	state.show_message("A lunar portal tears open" if target_dimension == "moon" else "%s portal opened" % definition["name"], 1400)
	return true

func open_moon_portal() -> bool:
	return open_dimension_portal("moon")

func _update_portal() -> bool:
	var portal: Dictionary = _portal_state()
	if not bool(portal["active"]):
		return false
	portal["timer"] = int(portal["timer"]) + 1
	match String(portal["phase"]):
		"open":
			portal["life"] = int(portal["life"]) - 1
			var close_enough: bool = absf(float(state.player["x"]) - float(portal["x"])) <= 2.0 and absf(float(state.player["y"]) - float(portal["y"])) <= 6.0
			if close_enough:
				portal["phase"] = "transit"
				portal["timer"] = 0
				state.player["locked"] = true
				state.player["vx"] = 0.0
				state.player["vy"] = 0.0
				state.show_message("Entering %s" % GameData.dimension(String(portal["target_dimension"]))["name"], 700)
			elif int(portal["life"]) <= 0:
				portal["phase"] = "closing"
				portal["timer"] = 0
		"transit":
			state.player["locked"] = true
			state.player["x"] = roundf(float(portal["x"]))
			state.player["y"] = roundf(float(portal["y"]))
			state.player["vx"] = 0.0
			state.player["vy"] = 0.0
			if int(portal["timer"]) >= 24:
				var target: String = String(portal["target_dimension"])
				var remembered: Variant = state.world["dimension_positions"].get(target, null) if bool(state.world["visited_dimensions"].get(target, false)) else null
				var destination: Vector2 = Vector2(world.dimension_spawn_point(target))
				if remembered is Dictionary:
					destination = Vector2(float(remembered["x"]), float(remembered["y"]))
				var source_return: Dictionary = portal["source_return_position"]
				switch_dimension(target, destination, source_return)
				state.player["locked"] = false
				state.player["invulnerability"] = 120
				if target == "moon":
					state.world["moon_reached"] = true
				portal["x"] = state.player["x"]
				portal["y"] = float(state.player["y"]) - 2.0
				portal["phase"] = "arrival"
				portal["timer"] = 0
				state.show_message("%s arrival" % GameData.dimension(target)["name"], 1200)
		"arrival":
			if int(portal["timer"]) >= 28:
				portal.merge({"active":false,"phase":"idle","timer":0,"life":0}, true)
		"closing":
			if int(portal["timer"]) >= 18:
				portal.merge({"active":false,"phase":"idle","timer":0,"life":0}, true)
	return bool(portal["active"])

func begin_launch() -> bool:
	if String(state.world["dimension"]) != "earth":
		return false
	var rocket: Dictionary = StructureData.rocket_silo_descriptor(world)
	var moon: Vector2i = world.dimension_spawn_point("moon")
	var flight: Dictionary = state.world["rocket_flight"]
	flight.merge({"active":true,"phase":"launch","timer":0,"rocket_x":int(rocket["center_x"]),"start_y":int(rocket["launch_pad_y"])-1,"target_x":moon.x,"target_y":moon.y,"transfer_height":-84,"lunar_entry_y":moon.y-42}, true)
	state.player["locked"] = true
	state.player["vx"] = 0.0
	state.player["vy"] = 0.0
	state.jump_buffer = 0
	state.ui["context_prompt"] = ""
	state.show_message("Rocket launch initiated", 1200)
	return true

func _update_flight() -> bool:
	var flight: Dictionary = state.world["rocket_flight"]
	if not bool(flight["active"]):
		return false
	flight["timer"] = int(flight["timer"]) + 1
	state.player["locked"] = true
	state.player["vx"] = 0.0
	state.player["vy"] = 0.0
	match String(flight["phase"]):
		"launch":
			state.player["x"] = int(flight["rocket_x"])
			state.player["y"] = int(flight["start_y"]) - int(flight["timer"]) * 2
			state.juice["speed_intensity"] = 1.0
			state.ui["context_prompt"] = "ROCKET ASCENT"
			if int(flight["timer"]) == 35:
				state.show_message("Leaving atmosphere", 900)
			if int(flight["timer"]) >= 70:
				flight["phase"] = "transfer"
				flight["timer"] = 0
		"transfer":
			state.player["x"] = int(flight["rocket_x"])
			state.player["y"] = int(flight["transfer_height"]) - int(flight["timer"]) * 3
			state.juice["speed_intensity"] = 1.0
			state.ui["context_prompt"] = "CRUISING TO THE MOON"
			if int(flight["timer"]) >= 28:
				flight["phase"] = "landing"
				flight["timer"] = 0
				switch_dimension("moon", Vector2(float(flight["target_x"]), float(flight["lunar_entry_y"])))
				state.show_message("Lunar approach", 900)
		"landing":
			state.player["x"] = int(flight["target_x"])
			state.player["y"] = mini(int(flight["target_y"]), int(flight["lunar_entry_y"]) + int(flight["timer"]) * 2)
			state.ui["context_prompt"] = "MOON LANDING"
			if int(state.player["y"]) >= int(flight["target_y"]):
				state.player["y"] = int(flight["target_y"])
				state.player["locked"] = false
				state.player["invulnerability"] = 120
				state.world["moon_reached"] = true
				state.world["visited_dimensions"]["moon"] = true
				state.ui["context_prompt"] = ""
				flight.merge({"active":false,"phase":"idle","timer":0}, true)
				world.update_active_neighborhood()
				state.show_message("You have landed on the moon", 1600)
	if world.chunk_x(float(state.player["x"])) != int(state.world["camera"]["chunk_x"]) or world.chunk_y(float(state.player["y"])) != int(state.world["camera"]["chunk_y"]):
		world.update_active_neighborhood()
	return true

func _update_prompt() -> void:
	state.ui["context_prompt"] = ""
	if String(state.world["dimension"]) != "earth":
		return
	var rocket: Dictionary = StructureData.rocket_silo_descriptor(world)
	var zone: Rect2i = rocket["launch_zone"]
	var point: Vector2i = Vector2i(roundi(float(state.player["x"])), roundi(float(state.player["y"])))
	if zone.has_point(point):
		state.ui["context_prompt"] = "UP TO BOARD ROCKET"
		var keys: Dictionary = state.input["keys"]
		if state.jump_buffer > 0 or bool(keys.get("w", false)) or bool(keys.get("arrowup", false)):
			begin_launch()

func update() -> void:
	if _update_flight():
		return
	var portal_active: bool = _update_portal()
	if portal_active and String(_portal_state()["phase"]) == "transit":
		return
	_update_prompt()

func flight_active() -> bool:
	return bool(state.world["rocket_flight"]["active"])
