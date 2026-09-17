class_name HudSystem
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
	if not state.ui.has("pickup_feed"):
		state.ui["pickup_feed"] = []
	if not state.ui.has("hud"):
		state.ui["hud"] = {}
	if not state.ui.has("tool_status"):
		state.ui["tool_status"] = ""
	update()

func inventory_entries() -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	var counts: Dictionary = state.inventory["counts"]
	for id_variant: Variant in state.inventory["order"]:
		var material_id: int = int(id_variant)
		var count: int = int(counts.get(material_id, 0))
		if count <= 0:
			continue
		entries.append({"kind":"material","material_id":material_id,"count":count,"name":GameData.material_name(material_id),"action":"EQUIP" if GameData.is_placeable(material_id) else "STORED","placeable":GameData.is_placeable(material_id),"selected":bool(state.build["active"]) and state.build["equipped_material"] == material_id})
	var furniture_counts: Dictionary = state.inventory["furniture"]
	for id_variant: Variant in furniture_counts.keys():
		var furniture_id: String = String(id_variant)
		var count: int = int(furniture_counts[id_variant])
		if count <= 0:
			continue
		var definition: Dictionary = GameData.furniture(furniture_id)
		entries.append({"kind":"furniture","furniture_id":furniture_id,"count":count,"name":String(definition.get("name","unknown furniture")),"action":"EQUIP","selected":bool(state.build["active"]) and state.build["equipped_furniture_id"] == furniture_id})
	var item_counts: Dictionary = state.inventory["items"]
	for key_variant: Variant in item_counts.keys():
		var key: String = String(key_variant)
		var count: int = int(item_counts[key_variant])
		if count <= 0:
			continue
		var parts: PackedStringArray = key.split(":", false, 1)
		if parts.size() != 2:
			continue
		var crop_id: int = int(parts[1])
		var crop: Dictionary = GameData.crop(crop_id)
		if parts[0] == "seed":
			entries.append({"kind":"seed","crop_id":crop_id,"count":count,"name":String(crop.get("seed_name","unknown seeds")),"action":"EQUIP","selected":bool(state.seed_mode["active"]) and state.seed_mode["crop_id"] == crop_id})
		elif parts[0] == "produce":
			entries.append({"kind":"produce","crop_id":crop_id,"count":count,"name":String(crop.get("produce_name","unknown produce")),"action":"EAT","selected":false})
	var loot_counts: Dictionary = state.inventory["loot"]
	for id_variant: Variant in loot_counts.keys():
		var loot_id: String = String(id_variant)
		var count: int = int(loot_counts[id_variant])
		if count <= 0:
			continue
		var loot: Dictionary = FaunaData.loot(loot_id)
		var action: String = "EAT" if bool(loot.get("edible", false)) else "COOK" if loot.has("cook_to") else "LOOT"
		entries.append({"kind":"loot","loot_id":loot_id,"count":count,"name":String(loot.get("name","unknown loot")),"action":action,"edible":bool(loot.get("edible",false)),"selected":false})
	return entries

func _inventory_total(entries: Array[Dictionary]) -> int:
	var total: int = 0
	for entry: Dictionary in entries:
		total += int(entry["count"])
	return total

func _crafting_entries() -> Array[Dictionary]:
	var crafting: Array[Dictionary] = []
	for definition: Dictionary in GameData.FURNITURE:
		var affordable: bool = true
		var recipe_parts: PackedStringArray = []
		for cost_variant: Variant in definition.get("recipe", []):
			var cost: Array = cost_variant
			var material_id: int = int(cost[0])
			var amount: int = int(cost[1])
			recipe_parts.append("%d %s" % [amount, GameData.material_name(material_id)])
			if int((state.inventory["counts"] as Dictionary).get(material_id, 0)) < amount:
				affordable = false
		crafting.append({"id":String(definition["id"]),"name":String(definition["name"]),"category":String(definition["category"]),"recipe":" + ".join(recipe_parts),"affordable":affordable,"owned":state.inventory_furniture_count(String(definition["id"]))})
	return crafting

func update() -> void:
	var entries: Array[Dictionary] = inventory_entries()
	state.ui["inventory_index"] = clampi(int(state.ui["inventory_index"]), 0, maxi(0, entries.size() - 1))
	var crafting: Array[Dictionary] = _crafting_entries()
	state.ui["crafting_index"] = clampi(int(state.ui["crafting_index"]), 0, maxi(0, crafting.size() - 1))
	var equipped_material: Variant = state.build["equipped_material"]
	var equipped_furniture_id: Variant = state.build["equipped_furniture_id"]
	var furniture_definition: Dictionary = GameData.furniture(String(equipped_furniture_id)) if equipped_furniture_id != null else {}
	var seed_crop_id: Variant = state.seed_mode["crop_id"]
	var seed: Dictionary = GameData.crop(int(seed_crop_id)) if seed_crop_id != null else {}
	var block_build: bool = bool(state.build["active"]) and equipped_material != null
	var furniture_build: bool = bool(state.build["active"]) and not furniture_definition.is_empty()
	var seed_active: bool = bool(state.seed_mode["active"]) and not seed.is_empty()
	var tool_status: String = String(state.ui.get("context_prompt", ""))
	if tool_status.is_empty() and furniture_build:
		tool_status = "PLACE %s X%d  CLICK BUILD  F USE  ESC EMPTY" % [String(furniture_definition["name"]).to_upper(), state.inventory_furniture_count(String(equipped_furniture_id))]
	elif tool_status.is_empty() and block_build:
		tool_status = "BUILD %s X%d  CLICK PLACE  ESC EMPTY" % [GameData.material_name(int(equipped_material)).to_upper(), int((state.inventory["counts"] as Dictionary).get(equipped_material, 0))]
	elif tool_status.is_empty() and seed_active:
		tool_status = "%s X%d  CLICK SCATTER" % [String(seed["seed_name"]).to_upper(), state.inventory_item_count("seed", int(seed_crop_id))]
	elif tool_status.is_empty() and state.weapon_id == 6:
		tool_status = "DESTRUCULATOR  DESTROYS AND COLLECTS FIRST BLOCK"
	elif tool_status.is_empty() and state.weapon_id == 7:
		tool_status = "DRONE STRIKE  TARGETS HIGHEST PIXEL IN COLUMN"
	elif tool_status.is_empty() and state.weapon_id == 8:
		tool_status = "LASER OVERHEATED  RELEASE TO COOL" if bool(state.laser["overheated"]) else "HOLD CLICK  CONTINUOUS LASER  HEATS PIXELS"
	state.ui["tool_status"] = tool_status
	var time: Dictionary = time_system.get_time()
	var weather: Dictionary = weather_system.get_weather()
	var camera: Dictionary = state.world["camera"]
	var weapon_name: String = String(GameData.WEAPONS[state.weapon_id]["name"])
	if furniture_build: weapon_name = String(furniture_definition["name"])
	elif block_build: weapon_name = "build"
	elif seed_active: weapon_name = "seeds"
	var dimension: Dictionary = GameData.dimension(String(state.world["dimension"]))
	state.ui["hud"] = {
		"hp": maxi(0, roundi(float(state.player["hp"]))), "max_hp": 100,
		"hunger": maxi(0, roundi(float(state.player["hunger"]))), "max_hunger": int(GameConfig.HUNGER["max"]),
		"low_hunger": float(state.player["hunger"]) <= float(GameConfig.HUNGER["low_threshold"]), "critical_hunger": float(state.player["hunger"]) <= float(GameConfig.HUNGER["critical_threshold"]),
		"breath": maxi(0, roundi(float(state.player["breath"]))), "max_breath": int(GameConfig.BREATH["max"]), "breath_using": bool(state.player["status"]["breath_using"]), "critical_breath": float(state.player["breath"]) <= float(GameConfig.BREATH["critical_threshold"]),
		"no_oxygen": bool(state.player["status"]["no_oxygen"]), "swimming": bool(state.player["status"]["swimming"]),
		"weapon": weapon_name, "weapon_id": state.weapon_id, "region": "%s %d,%d" % [String(dimension["name"]).to_upper(), int(camera["chunk_x"]), int(camera["chunk_y"])],
		"biome": world.biome_name_at(roundi(float(state.player["x"])), roundi(float(state.player["y"]) - 2.0)).replace("_", " "),
		"time": String(time["label"]).replace(" · ", " "), "time_phase": "day" if bool(time["is_day"]) else "night",
		"weather": "%s %s" % [weather["label"], String(weather["wind_label"]).replace("←","<").replace("→",">")], "weather_type": weather["type"], "wind": weather["wind_label"],
		"active_chunks": 9, "inventory_count": _inventory_total(entries), "inventory": entries, "crafting": crafting,
		"equipped": String(furniture_definition["name"]) if furniture_build else GameData.material_name(int(equipped_material)) if block_build else String(seed["seed_name"]) if seed_active else "empty",
		"zoom": "off" if float(state.magnifier["zoom"]) <= 1.0 else "%.1fx" % float(state.magnifier["zoom"]), "crystals": state.crystals,
		"bunny_chain": int(state.player["bunny_hop"]["chain"]), "bunny_window": int(state.player["bunny_hop"]["landing_window"]),
		"parasite_count": (state.player["attached_parasites"] as Array).size(), "stolen_weapon_id": state.player["stolen_weapon_id"],
		"invasion_active": not (state.entities["invasion_portals"] as Array).is_empty(), "laser_heat": float(state.laser["heat"]), "laser_overheated": bool(state.laser["overheated"]),
		"paused": state.paused, "active_slot": int(state.save["active_slot"]), "save_status": String(state.ui["save_status"]), "save_slots": state.ui["save_slots"],
	}

func push_pickup(text: String, amount: int = 1) -> void:
	var feed: Array = state.ui["pickup_feed"]
	feed.push_front({"text":"+%d %s" % [maxi(1, amount), text], "until":state.frame + 150})
	if feed.size() > 4:
		feed.resize(4)

func update_transient() -> void:
	if int(state.ui["message_until"]) <= state.frame:
		state.ui["message"] = ""
	var feed: Array = state.ui["pickup_feed"]
	for index: int in range(feed.size() - 1, -1, -1):
		if int(feed[index]["until"]) <= state.frame:
			feed.remove_at(index)
	if int(state.ui["damage_flash"]) > 0:
		state.ui["damage_flash"] = int(state.ui["damage_flash"]) - 1
	if int(state.ui["save_status_until"]) <= state.frame:
		state.ui["save_status"] = ""
