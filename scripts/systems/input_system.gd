class_name PixelInputSystem
extends RefCounted

const PORTAL_CODE_TIMEOUT_MS: int = 3200

var state: GameState
var player_system: PlayerSystem
var weapon_system: WeaponSystem
var crop_system: CropSystem
var furniture_system: FurnitureSystem
var structure_system: StructureSystem
var hud_system: HudSystem
var save_system: SaveSystem
var new_world_callback: Callable
var toggle_pause_callback: Callable

func _init(
	game_state: GameState,
	player: PlayerSystem,
	weapons: WeaponSystem,
	crops: CropSystem,
	furniture: FurnitureSystem,
	structures: StructureSystem,
	hud: HudSystem,
	saves: SaveSystem,
	new_world: Callable,
	toggle_pause: Callable
) -> void:
	state = game_state
	player_system = player
	weapon_system = weapons
	crop_system = crops
	furniture_system = furniture
	structure_system = structures
	hud_system = hud
	save_system = saves
	new_world_callback = new_world
	toggle_pause_callback = toggle_pause

func _set_key(key: String, pressed: bool) -> void:
	var keys: Dictionary = state.input["keys"]
	if pressed:
		keys[key] = true
	else:
		keys.erase(key)

func _reset_actions() -> void:
	(state.input["keys"] as Dictionary).clear()
	state.input["pointer_down"] = false
	(state.entities["hook"] as Dictionary)["active"] = false

func update_pointer(position: Vector2, control_size: Vector2) -> void:
	var width: float = maxf(1.0, control_size.x)
	var height: float = maxf(1.0, control_size.y)
	state.input["pointer_x"] = clampi(roundi(position.x / width * float(GameConfig.WORLD_WIDTH)), 0, GameConfig.WORLD_WIDTH - 1)
	state.input["pointer_y"] = clampi(roundi(position.y / height * float(GameConfig.WORLD_HEIGHT)), 0, GameConfig.WORLD_HEIGHT - 1)
	state.input["pointer_inside"] = true

func _inventory_items() -> Array[Dictionary]:
	return hud_system.inventory_entries()

func activate_inventory_index(index: int = -1) -> bool:
	var items: Array[Dictionary] = _inventory_items()
	if items.is_empty():
		return false
	var safe_index: int = clampi(int(state.ui["inventory_index"]) if index < 0 else index, 0, items.size() - 1)
	state.ui["inventory_index"] = safe_index
	var item: Dictionary = items[safe_index]
	match String(item["kind"]):
		"material":
			if bool(item.get("placeable", false)):
				return weapon_system.equip_material(int(item["material_id"]))
		"furniture":
			return weapon_system.equip_furniture(String(item["furniture_id"]))
		"seed":
			return weapon_system.equip_seed(int(item["crop_id"]))
		"produce":
			return crop_system.eat_produce(int(item["crop_id"]))
		"loot":
			if bool(item.get("edible", false)):
				return crop_system.eat_loot(String(item["loot_id"]))
	return false

func _move_inventory(delta: int) -> void:
	var length: int = _inventory_items().size()
	state.ui["inventory_index"] = 0 if length == 0 else posmod(int(state.ui["inventory_index"]) + delta, length)
	hud_system.update()

func _crafting_entries() -> Array:
	return state.ui.get("hud", {}).get("crafting", [])

func activate_crafting_index(index: int = -1) -> bool:
	var entries: Array = _crafting_entries()
	if entries.is_empty():
		return false
	var safe_index: int = clampi(int(state.ui["crafting_index"]) if index < 0 else index, 0, entries.size() - 1)
	state.ui["crafting_index"] = safe_index
	return furniture_system.craft(String((entries[safe_index] as Dictionary)["id"]))

func _move_crafting(delta: int) -> void:
	var entries: Array = _crafting_entries()
	state.ui["crafting_index"] = 0 if entries.is_empty() else posmod(int(state.ui["crafting_index"]) + delta, entries.size())
	hud_system.update()

func toggle_inventory(force: Variant = null) -> void:
	var opening: bool = not bool(state.ui["inventory_open"]) if force == null else bool(force)
	state.ui["inventory_open"] = opening
	if opening:
		state.ui["crafting_open"] = false
		state.ui["world_menu_open"] = false
		state.ui["confirm_world_action"] = ""
	_reset_actions()
	hud_system.update()

func toggle_crafting(force: Variant = null) -> void:
	var opening: bool = not bool(state.ui["crafting_open"]) if force == null else bool(force)
	state.ui["crafting_open"] = opening
	if opening:
		state.ui["inventory_open"] = false
		if bool(state.ui["world_menu_open"]):
			state.paused = bool(state.ui["world_menu_return_paused"])
		state.ui["world_menu_open"] = false
		state.ui["confirm_world_action"] = ""
	_reset_actions()
	hud_system.update()

func toggle_world_menu(force: Variant = null) -> void:
	var opening: bool = not bool(state.ui["world_menu_open"]) if force == null else bool(force)
	if opening and not bool(state.ui["world_menu_open"]):
		state.ui["world_menu_return_paused"] = state.paused
		state.paused = true
		state.ui["inventory_open"] = false
		state.ui["crafting_open"] = false
		state.ui["world_slot_index"] = max(0, int(state.save["active_slot"]) - 1)
		save_system.refresh_slots()
	elif not opening and bool(state.ui["world_menu_open"]):
		state.paused = bool(state.ui["world_menu_return_paused"])
	state.ui["world_menu_open"] = opening
	state.ui["confirm_world_action"] = ""
	state.ui["confirm_world_slot"] = 0
	_reset_actions()
	hud_system.update()

func _select_world_slot(delta: int) -> void:
	var count: int = max(1, (state.ui["save_slots"] as Array).size())
	state.ui["world_slot_index"] = posmod(int(state.ui["world_slot_index"]) + delta, count)
	state.ui["confirm_world_action"] = ""
	hud_system.update()

func _world_slot_number() -> int:
	return clampi(int(state.ui["world_slot_index"]) + 1, 1, 3)

func perform_world_action(action: String, slot: int) -> bool:
	var safe_slot: int = clampi(slot, 1, 3)
	match action:
		"load":
			if save_system.load(safe_slot):
				toggle_world_menu(false)
			return true
		"save":
			save_system.save(safe_slot)
			save_system.refresh_slots()
			hud_system.update()
			return true
		"new":
			if String(state.ui["confirm_world_action"]) != "new" or int(state.ui["confirm_world_slot"]) != safe_slot:
				state.ui["confirm_world_action"] = "new"
				state.ui["confirm_world_slot"] = safe_slot
				hud_system.update()
				return true
			if new_world_callback.is_valid():
				new_world_callback.call(safe_slot, true)
			state.ui["world_menu_open"] = false
			state.paused = false
			state.ui["confirm_world_action"] = ""
			return true
		"delete":
			if String(state.ui["confirm_world_action"]) != "delete" or int(state.ui["confirm_world_slot"]) != safe_slot:
				state.ui["confirm_world_action"] = "delete"
				state.ui["confirm_world_slot"] = safe_slot
				hud_system.update()
				return true
			save_system.remove(safe_slot)
			state.ui["confirm_world_action"] = ""
			save_system.refresh_slots()
			hud_system.update()
			return true
	return false

func _hit_canvas_ui() -> bool:
	var x: int = int(state.input["pointer_x"])
	var y: int = int(state.input["pointer_y"])
	var rects: Array = state.ui["inventory_rects"]
	for index: int in range(rects.size() - 1, -1, -1):
		var item: Dictionary = rects[index]
		if x < int(item["x"]) or y < int(item["y"]) or x >= int(item["x"]) + int(item["w"]) or y >= int(item["y"]) + int(item["h"]):
			continue
		var kind: String = String(item["kind"])
		match kind:
			"inventory-toggle": toggle_inventory()
			"crafting-toggle": toggle_crafting()
			"world-toggle": toggle_world_menu()
			"save-current": save_system.save()
			"pause-toggle":
				if toggle_pause_callback.is_valid(): toggle_pause_callback.call()
			"new-world": toggle_world_menu(true)
			"inventory-close": toggle_inventory(false)
			"crafting-close": toggle_crafting(false)
			"world-close": toggle_world_menu(false)
			"inventory-item": activate_inventory_index(int(item["index"]))
			"crafting-item": activate_crafting_index(int(item["index"]))
			"world-slot":
				state.ui["world_slot_index"] = int(item["slot"]) - 1
				state.ui["confirm_world_action"] = ""
				hud_system.update()
			_:
				if kind.begins_with("world-"):
					perform_world_action(kind.substr(6), int(item["slot"]))
		return true
	return false

func _capture_portal_code(key: String, echo: bool) -> bool:
	if echo or key.length() != 1 or key < "a" or key > "z":
		return false
	var now: int = Time.get_ticks_msec()
	if now > int(state.input.get("portal_code_until", 0)):
		state.input["portal_code_buffer"] = ""
	var current: String = String(state.input.get("portal_code_buffer", ""))
	var attempt: String = current + key
	var prefix_matches: Array[Dictionary] = []
	for code: Dictionary in GameData.PORTAL_CODES:
		if String(code["code"]).begins_with(attempt):
			prefix_matches.append(code)
	if not prefix_matches.is_empty():
		state.input["portal_code_buffer"] = attempt
		state.input["portal_code_until"] = now + PORTAL_CODE_TIMEOUT_MS
		for code: Dictionary in prefix_matches:
			if String(code["code"]) == attempt:
				state.input["portal_code_buffer"] = ""
				state.input["portal_code_until"] = 0
				structure_system.open_dimension_portal(String(code["dimension"]))
				break
		return true
	for code: Dictionary in GameData.PORTAL_CODES:
		if String(code["code"]).begins_with(key):
			state.input["portal_code_buffer"] = key
			state.input["portal_code_until"] = now + PORTAL_CODE_TIMEOUT_MS
			return true
	state.input["portal_code_buffer"] = ""
	state.input["portal_code_until"] = 0
	return false

func handle_input(event: InputEvent, control_size: Vector2) -> void:
	if event is InputEventMouseMotion:
		update_pointer((event as InputEventMouseMotion).position, control_size)
		return
	if event is InputEventMouseButton:
		var mouse: InputEventMouseButton = event
		update_pointer(mouse.position, control_size)
		if mouse.button_index == MOUSE_BUTTON_WHEEL_UP and mouse.pressed:
			_handle_wheel(-1)
			return
		if mouse.button_index == MOUSE_BUTTON_WHEEL_DOWN and mouse.pressed:
			_handle_wheel(1)
			return
		if mouse.button_index != MOUSE_BUTTON_LEFT:
			return
		state.input["pointer_button"] = int(mouse.button_index) if mouse.pressed else 0
		if mouse.pressed:
			if _hit_canvas_ui() or bool(state.ui["inventory_open"]) or bool(state.ui["crafting_open"]) or bool(state.ui["world_menu_open"]) or state.paused:
				return
			state.input["pointer_down"] = true
			weapon_system.attack()
		else:
			state.input["pointer_down"] = false
			(state.entities["hook"] as Dictionary)["active"] = false
		return
	if event is InputEventKey:
		var keyboard: InputEventKey = event
		var key: String = keyboard.as_text_keycode().to_lower()
		if key == "space": key = " "
		elif key == "left": key = "arrowleft"
		elif key == "right": key = "arrowright"
		elif key == "up": key = "arrowup"
		elif key == "down": key = "arrowdown"
		if keyboard.pressed:
			_handle_key_down(key, keyboard.echo)
		else:
			_handle_key_up(key)

func _handle_wheel(delta: int) -> void:
	if bool(state.ui["world_menu_open"]):
		_select_world_slot(delta)
	elif bool(state.ui["crafting_open"]):
		_move_crafting(delta)
	elif bool(state.ui["inventory_open"]):
		_move_inventory(delta)
	else:
		var step: float = float(GameConfig.MAGNIFIER["zoom_step"])
		state.magnifier["zoom"] = clampf(float(state.magnifier["zoom"]) + (-step if delta > 0 else step), float(GameConfig.MAGNIFIER["min_zoom"]), float(GameConfig.MAGNIFIER["max_zoom"]))
		hud_system.update()

func _handle_key_down(key: String, echo: bool) -> void:
	if _capture_portal_code(key, echo):
		return
	if key == "f5" and not echo:
		save_system.save()
		return
	if key == "f9" and not echo:
		save_system.load()
		return
	if key == "o" and not echo:
		toggle_world_menu()
		return
	if key == "k" and not echo:
		toggle_crafting()
		return
	if bool(state.ui["world_menu_open"]):
		if (key == "arrowup" or key == "w") and not echo: _select_world_slot(-1)
		elif (key == "arrowdown" or key == "s") and not echo: _select_world_slot(1)
		elif key == "enter" and not echo:
			var slot: int = _world_slot_number()
			var slots: Array = state.ui["save_slots"]
			var empty: bool = slot - 1 >= slots.size() or bool((slots[slot - 1] as Dictionary).get("empty", true))
			perform_world_action("new" if empty else "load", slot)
		elif key == "n" and not echo: perform_world_action("new", _world_slot_number())
		elif key == "delete" and not echo: perform_world_action("delete", _world_slot_number())
		elif key == "escape" and not echo: toggle_world_menu(false)
		return
	if bool(state.ui["crafting_open"]):
		if (key == "arrowup" or key == "w") and not echo: _move_crafting(-1)
		elif (key == "arrowdown" or key == "s") and not echo: _move_crafting(1)
		elif key == "enter" and not echo: activate_crafting_index()
		elif key == "escape" and not echo: toggle_crafting(false)
		return
	if (key == "i" or key == "tab") and not echo:
		toggle_inventory()
		return
	if bool(state.ui["inventory_open"]):
		if (key == "arrowup" or key == "w") and not echo: _move_inventory(-1)
		elif (key == "arrowdown" or key == "s") and not echo: _move_inventory(1)
		elif key == "enter" and not echo: activate_inventory_index()
		elif key == "escape" and not echo: toggle_inventory(false)
		return
	if key == "p" and not echo:
		if toggle_pause_callback.is_valid(): toggle_pause_callback.call()
		return
	if key == "r" and not echo:
		toggle_world_menu(true)
		return
	if state.paused:
		return
	if key == "f" and not echo:
		furniture_system.interact_nearest()
		return
	if (key == "w" or key == "arrowup" or key == " ") and not echo:
		player_system.queue_jump()
	if key == "q" and not echo: weapon_system.cycle_weapon()
	elif key == "e" and not echo: weapon_system.cycle_stored_material()
	elif key == "escape" and not echo: weapon_system.exit_build_mode(true)
	else: _set_key(key, true)

func _handle_key_up(key: String) -> void:
	_set_key(key, false)
	if key == "w" or key == "arrowup" or key == " ":
		player_system.release_jump()

func update_gamepad() -> void:
	# Only mirror InputMap actions when a joypad exists; keyboard input already follows the original key path.
	if Input.get_connected_joypads().is_empty():
		return
	if bool(state.ui["world_menu_open"]) or bool(state.ui["crafting_open"]) or bool(state.ui["inventory_open"]):
		return
	_set_key("a", Input.is_action_pressed("StickLeft_West"))
	_set_key("d", Input.is_action_pressed("StickLeft_East"))
	_set_key("w", Input.is_action_pressed("StickLeft_North"))
	_set_key("s", Input.is_action_pressed("StickLeft_South"))
	if Input.is_action_just_pressed("Button_A"):
		player_system.queue_jump()
	if Input.is_action_just_released("Button_A"):
		player_system.release_jump()
	if Input.is_action_just_pressed("Button_X"):
		weapon_system.cycle_weapon()
	if Input.is_action_just_pressed("Button_Y"):
		weapon_system.cycle_stored_material()
	if Input.is_action_just_pressed("Button_Start"):
		if toggle_pause_callback.is_valid(): toggle_pause_callback.call()
	state.input["pointer_down"] = Input.is_action_pressed("Button_RightShoulder")
	if Input.is_action_just_pressed("Button_RightShoulder"):
		weapon_system.attack()
