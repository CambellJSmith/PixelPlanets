class_name FurnitureSystem
extends RefCounted

const CHEST_RADIUS: float = 13.0
const CHEST_CAPACITY: int = 64
const INTERACT_RADIUS: float = 8.0

var state: GameState
var world: WorldModel
var time_system: TimeSystem

func _hypot(x: float, y: float) -> float:
	return Vector2(x, y).length()

func _init(game_state: GameState, world_model: WorldModel, time: TimeSystem) -> void:
	state = game_state
	world = world_model
	time_system = time

func active_furniture() -> Array:
	var result: Array = []
	for entity_value: Variant in state.entities["furniture"]:
		var entity: Dictionary = entity_value
		if String(entity.get("dimension", "earth")) == String(state.world["dimension"]):
			result.append(entity)
	return result

func solid_at(x: int, y: int) -> bool:
	for entity_value: Variant in active_furniture():
		if GameData.furniture_solid_at_entity(entity_value, x, y):
			return true
	return false

func furniture_at_pixel(x: int, y: int, solid_only: bool = false) -> Dictionary:
	var items: Array = active_furniture()
	for index: int in range(items.size() - 1, -1, -1):
		var entity: Dictionary = items[index]
		var bounds: Rect2i = GameData.furniture_bounds(entity)
		if not bounds.has_point(Vector2i(x, y)):
			continue
		if solid_only and not GameData.furniture_solid_at_entity(entity, x, y):
			continue
		return entity
	return {}

func _player_bounds() -> Rect2i:
	var player_x: int = roundi(float(state.player["x"]))
	var player_y: int = roundi(float(state.player["y"]))
	var width: int = int(state.player["width"])
	var height: int = int(state.player["height"])
	var left: int = player_x - floori(float(width - 1) * 0.5)
	return Rect2i(left, player_y - height + 1, width, height)

func _has_terrain_support(definition: Dictionary, bounds: Rect2i) -> bool:
	if String(definition["placement"]) == "wall":
		for y: int in range(bounds.position.y, bounds.end.y):
			if world.is_solid(world.get_cell(bounds.position.x - 1, y)) or world.is_solid(world.get_cell(bounds.end.x, y)) or solid_at(bounds.position.x - 1, y) or solid_at(bounds.end.x, y):
				return true
		return false
	for x: int in range(bounds.position.x, bounds.end.x):
		if world.is_solid(world.get_cell(x, bounds.end.y)) or solid_at(x, bounds.end.y):
			return true
	return false

func can_place(furniture_id: String, x: int, y: int) -> Dictionary:
	var definition: Dictionary = GameData.furniture(furniture_id)
	if definition.is_empty():
		return {"valid": false, "reason": "unknown furniture"}
	if active_furniture().size() >= GameData.FURNITURE_MAX_PER_DIMENSION:
		return {"valid": false, "reason": "dimension furniture limit reached"}
	var entity: Dictionary = {"furniture_id": furniture_id, "x": roundi(x), "y": roundi(y)}
	var bounds: Rect2i = GameData.furniture_bounds(entity, definition)
	var player_bounds: Rect2i = _player_bounds()
	for py: int in range(bounds.position.y, bounds.end.y):
		for px: int in range(bounds.position.x, bounds.end.x):
			if world.get_cell(px, py) != GameData.AIR:
				return {"valid": false, "reason": "space is blocked"}
			if player_bounds.has_point(Vector2i(px, py)):
				return {"valid": false, "reason": "cannot place inside player"}
	for other_value: Variant in active_furniture():
		var other_bounds: Rect2i = GameData.furniture_bounds(other_value)
		if other_bounds.intersects(bounds):
			return {"valid": false, "reason": "another furnishing is in the way"}
	if not _has_terrain_support(definition, bounds):
		return {"valid": false, "reason": "needs a wall" if String(definition["placement"]) == "wall" else "needs floor support"}
	return {"valid": true, "reason": "ready to place", "definition": definition, "bounds": bounds, "x": entity["x"], "y": entity["y"]}

func place(furniture_id: String, x: int, y: int) -> Dictionary:
	var preview: Dictionary = can_place(furniture_id, x, y)
	if not bool(preview["valid"]):
		return preview
	var definition: Dictionary = preview["definition"]
	var entity: Dictionary = {
		"id": "f%d_%d_%d_%d" % [state.frame, roundi(x), roundi(y), (state.entities["furniture"] as Array).size()],
		"furniture_id": String(definition["id"]), "x": roundi(x), "y": roundi(y), "dimension": String(state.world["dimension"]),
		"open": false, "on": true, "label_index": 0, "storage": {}, "stored_total": 0, "crop_id": null, "growth": 0, "harvests": 0,
	}
	(state.entities["furniture"] as Array).append(entity)
	preview["entity"] = entity
	state.save["dirty"] = true
	return preview

func remove(entity: Dictionary, refund: bool = true) -> bool:
	var items: Array = state.entities["furniture"]
	var index: int = items.find(entity)
	if index < 0:
		return false
	items.remove_at(index)
	if refund:
		state.inventory_add_furniture(String(entity["furniture_id"]), 1)
	if String(state.player.get("furniture_seat_id", "")) == String(entity["id"]):
		state.player["furniture_mode"] = ""
		state.player["furniture_seat_id"] = null
	state.save["dirty"] = true
	return true

func recipe_affordable(definition: Dictionary) -> bool:
	for cost_value: Variant in definition.get("recipe", []):
		var cost: Array = cost_value
		if int((state.inventory["counts"] as Dictionary).get(int(cost[0]), 0)) < int(cost[1]):
			return false
	return true

func craft(furniture_id: String) -> bool:
	var definition: Dictionary = GameData.furniture(furniture_id)
	if definition.is_empty() or not recipe_affordable(definition):
		state.show_message("Missing crafting materials", 1100)
		return false
	for cost_value: Variant in definition["recipe"]:
		var cost: Array = cost_value
		state.inventory_remove_material(int(cost[0]), int(cost[1]))
	state.inventory_add_furniture(furniture_id, 1)
	state.show_message("%s CRAFTED" % String(definition["name"]).to_upper(), 900)
	return true

func ray_hit(direction: Vector2, max_range: float) -> Dictionary:
	var max_distance: float = minf(max_range, direction.length()) if direction.length() > 1.0 else max_range
	var normalized: Vector2 = direction.normalized()
	var previous: Vector2i = Vector2i(2147483647, 2147483647)
	for step: int in range(1, ceili(max_distance * 4.0) + 1):
		var distance: float = float(step) / 4.0
		var point: Vector2i = Vector2i(floori(float(state.player["x"]) + normalized.x * distance), floori(float(state.player["y"]) - 2.0 + normalized.y * distance))
		if point == previous:
			continue
		previous = point
		var entity: Dictionary = furniture_at_pixel(point.x, point.y)
		if not entity.is_empty():
			return {"entity": entity, "x": point.x, "y": point.y, "distance": distance}
	return {}

func nearest_furniture(max_distance: float = INTERACT_RADIUS) -> Dictionary:
	var nearest: Dictionary = {}
	var nearest_distance: float = max_distance + 0.001
	for entity_value: Variant in active_furniture():
		var entity: Dictionary = entity_value
		var distance: float = _hypot(float(entity["x"]) - float(state.player["x"]), float(entity["y"]) - float(state.player["y"]))
		if distance < nearest_distance:
			nearest = entity
			nearest_distance = distance
	return nearest

func _empty_chest(chest: Dictionary) -> bool:
	var storage: Dictionary = chest["storage"]
	if storage.is_empty():
		state.show_message("Collector chest is empty", 700)
		return false
	var total: int = 0
	for key_value: Variant in storage.keys():
		var key: String = String(key_value)
		var count: int = int(storage[key])
		var parts: PackedStringArray = key.split(":", false, 1)
		if parts.size() == 2:
			if parts[0] == "loot":
				state.inventory_add_loot(parts[1], count)
			elif parts[0] == "seed" or parts[0] == "produce":
				state.inventory_add_item(parts[0], int(parts[1]), count)
		total += count
	chest["storage"] = {}
	chest["stored_total"] = 0
	state.show_message("Collected %d stored items" % total, 900)
	return true

func _sleep_at(_entity: Dictionary) -> bool:
	var time: Dictionary = time_system.get_time()
	state.player["hp"] = minf(100.0, float(state.player["hp"]) + (12.0 if bool(time["is_day"]) else 35.0))
	state.player["hunger"] = minf(100.0, float(state.player["hunger"]) + (4.0 if bool(time["is_day"]) else 12.0))
	if not bool(time["is_day"]):
		state.frame += max(1, int(time["cycle_frames"]) - int(time["cycle_frame"]))
		state.show_message("Slept until dawn", 1000)
	else:
		state.show_message("Rested and recovered", 900)
	return true

func _use_planter(entity: Dictionary) -> bool:
	var crop_value: Variant = entity.get("crop_id", null)
	if crop_value != null:
		if int(entity.get("growth", 0)) < 3600:
			state.show_message("The planter is still growing", 700)
			return false
		var crop_id: int = int(crop_value)
		state.inventory_add_item("produce", crop_id, 2)
		var crop: Dictionary = GameData.crop(crop_id)
		entity["growth"] = 0
		entity["harvests"] = int(entity.get("harvests", 0)) + 1
		var feed: Array = state.ui.get("pickup_feed", [])
		feed.push_front({"text": "+2 %s" % String(crop.get("produce_name", "produce")), "until": state.frame + 150})
		if feed.size() > 4:
			feed.resize(4)
		state.ui["pickup_feed"] = feed
		state.show_message("Harvested %s" % String(crop.get("produce_name", "produce")), 800)
		return true
	var equipped_crop: Variant = state.seed_mode.get("crop_id", null) if bool(state.seed_mode.get("active", false)) else null
	if equipped_crop == null or state.inventory_item_count("seed", int(equipped_crop)) <= 0:
		state.show_message("Equip seeds, then interact with the planter", 900)
		return false
	var crop_id: int = int(equipped_crop)
	if not state.inventory_remove_item("seed", crop_id, 1):
		return false
	entity["crop_id"] = crop_id
	entity["growth"] = 0
	state.show_message("%s planted" % String(GameData.crop(crop_id).get("name", "Seed")), 750)
	return true

func interact_nearest() -> bool:
	var entity: Dictionary = nearest_furniture()
	if entity.is_empty():
		state.show_message("No furniture close enough", 600)
		return false
	var definition: Dictionary = GameData.furniture(String(entity["furniture_id"]))
	var action: String = String(definition.get("action", ""))
	match action:
		"craft":
			state.ui["crafting_open"] = true
			state.ui["inventory_open"] = false
			return true
		"toggle":
			entity["open"] = not bool(entity["open"])
			state.show_message("%s %s" % [String(definition["name"]), "opened" if bool(entity["open"]) else "closed"], 650)
			return true
		"light":
			entity["on"] = not bool(entity["on"])
			state.show_message("%s %s" % [String(definition["name"]), "on" if bool(entity["on"]) else "off"], 650)
			return true
		"switch":
			var changed: int = 0
			for other_value: Variant in active_furniture():
				var other: Dictionary = other_value
				if other == entity or _hypot(float(other["x"] - entity["x"]), float(other["y"] - entity["y"])) > 18.0:
					continue
				var other_definition: Dictionary = GameData.furniture(String(other["furniture_id"]))
				if String(other_definition.get("action", "")) == "light":
					other["on"] = not bool(other["on"])
					changed += 1
				elif String(other_definition.get("action", "")) == "toggle":
					other["open"] = not bool(other["open"])
					changed += 1
			state.show_message("Switch toggled %d fixtures" % changed if changed > 0 else "No linked fixtures nearby", 850)
			return true
		"sit":
			state.player["furniture_mode"] = "sit"
			state.player["furniture_seat_id"] = entity["id"]
			state.player["x"] = int(entity["x"])
			state.player["y"] = int(entity["y"]) + int(definition.get("seat_offset_y", 0))
			state.player["vx"] = 0.0
			state.player["vy"] = 0.0
			state.show_message("Seated · move or jump to stand", 800)
			return true
		"sleep":
			return _sleep_at(entity)
		"chest":
			return _empty_chest(entity)
		"bookshelf":
			var destination: Dictionary = GameData.DIMENSIONS[posmod(state.frame + abs(int(entity["x"])), GameData.DIMENSIONS.size())]
			state.show_message("%s: type %s" % [String(destination["name"]), String(destination["code"])], 1700)
			return true
		"planter":
			return _use_planter(entity)
		"sign":
			entity["label_index"] = posmod(int(entity.get("label_index", 0)) + 1, GameData.SIGN_LABELS.size())
			state.show_message("Sign: %s" % GameData.SIGN_LABELS[int(entity["label_index"])], 650)
			return true
		"clock":
			state.show_message(String(time_system.get_time()["label"]), 1000)
			return true
		_:
			state.show_message(String(definition["name"]).to_upper(), 550)
			return true

func _update_chest(chest: Dictionary) -> void:
	if state.frame % 12 != 0 or int(chest.get("stored_total", 0)) >= CHEST_CAPACITY:
		return
	var pickups: Array = state.entities["pickups"]
	for index: int in range(pickups.size() - 1, -1, -1):
		var pickup: Dictionary = pickups[index]
		if _hypot(float(pickup["x"]) - float(chest["x"]), float(pickup["y"]) - float(chest["y"]) + 2.0) > CHEST_RADIUS:
			continue
		var amount: int = max(1, int(pickup.get("amount", 1)))
		if int(chest["stored_total"]) + amount > CHEST_CAPACITY:
			continue
		var key: String = "loot:%s" % String(pickup["loot_id"]) if String(pickup["kind"]) == "loot" else "%s:%d" % [String(pickup["kind"]), int(pickup["crop_id"])]
		var storage: Dictionary = chest["storage"]
		storage[key] = int(storage.get(key, 0)) + amount
		chest["stored_total"] = int(chest["stored_total"]) + amount
		pickups.remove_at(index)
		if int(chest["stored_total"]) >= CHEST_CAPACITY:
			break

func _update_seat() -> void:
	if String(state.player.get("furniture_mode", "")) != "sit":
		return
	var seat: Dictionary = {}
	for entity_value: Variant in active_furniture():
		var candidate: Dictionary = entity_value
		if String(candidate["id"]) == String(state.player.get("furniture_seat_id", "")):
			seat = candidate
			break
	var keys: Dictionary = state.input["keys"]
	var movement: bool = state.jump_buffer > 0
	for key: String in ["a", "d", "w", "s", "arrowleft", "arrowright", "arrowup", "arrowdown", " "]:
		if bool(keys.get(key, false)):
			movement = true
			break
	if seat.is_empty() or movement:
		state.player["furniture_mode"] = ""
		state.player["furniture_seat_id"] = null
		state.player["y"] = int(state.player["y"]) - 1
		return
	var definition: Dictionary = GameData.furniture(String(seat["furniture_id"]))
	state.player["x"] = int(seat["x"])
	state.player["y"] = int(seat["y"]) + int(definition.get("seat_offset_y", 0))
	state.player["vx"] = 0.0
	state.player["vy"] = 0.0

func player_on_ladder() -> Variant:
	var bounds: Rect2i = _player_bounds()
	for entity_value: Variant in active_furniture():
		var entity: Dictionary = entity_value
		if String(entity["furniture_id"]) != "ladder":
			continue
		if GameData.furniture_bounds(entity).intersects(bounds):
			return entity
	return null

func context_prompt() -> String:
	var nearest: Dictionary = {}
	var nearest_distance: float = 6.001
	for entity_value: Variant in active_furniture():
		var entity: Dictionary = entity_value
		var definition: Dictionary = GameData.furniture(String(entity["furniture_id"]))
		var action: String = String(definition.get("action", ""))
		if action.is_empty() or action == "ladder":
			continue
		var distance: float = _hypot(float(entity["x"]) - float(state.player["x"]), float(entity["y"]) - float(state.player["y"]))
		if distance <= 6.0 and distance < nearest_distance:
			nearest = entity
			nearest_distance = distance
	if nearest.is_empty():
		return ""
	var definition: Dictionary = GameData.furniture(String(nearest["furniture_id"]))
	var action: String = String(definition.get("action", ""))
	var label: String = "USE"
	match action:
		"craft": label = "OPEN CRAFTING"
		"toggle": label = "CLOSE" if bool(nearest.get("open", false)) else "OPEN"
		"light": label = "TURN OFF" if bool(nearest.get("on", true)) else "TURN ON"
		"switch": label = "TOGGLE FIXTURES"
		"sit": label = "SIT"
		"sleep": label = "REST"
		"chest": label = "COLLECT %d" % int(nearest.get("stored_total", 0))
		"bookshelf": label = "READ PORTAL CODE"
		"planter": label = "HARVEST" if nearest.get("crop_id", null) != null and int(nearest.get("growth", 0)) >= 3600 else "PLANT / CHECK"
		"sign": label = "CHANGE LABEL"
		"clock": label = "READ TIME"
	return "F %s %s" % [label, String(definition["name"]).to_upper()]

func update() -> void:
	_update_seat()
	for entity_value: Variant in active_furniture():
		var entity: Dictionary = entity_value
		var action: String = String(GameData.furniture(String(entity["furniture_id"])).get("action", ""))
		if action == "chest":
			_update_chest(entity)
		elif action == "planter" and entity.get("crop_id") != null:
			entity["growth"] = min(3600, int(entity.get("growth", 0)) + 1)
