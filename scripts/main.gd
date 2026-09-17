class_name PixelPlanetsGame
extends Control

var state: GameState
var noise: PixelNoise
var world: WorldModel
var time_system: TimeSystem
var weather_system: WeatherSystem
var hud_system: HudSystem
var crop_system: CropSystem
var furniture_system: FurnitureSystem
var weapon_system: WeaponSystem
var player_system: PlayerSystem
var projectile_system: ProjectileSystem
var structure_system: StructureSystem
var enemy_system: EnemySystem
var boss_system: BossSystem
var material_system: MaterialSystem
var juice_system: JuiceSystem
var palette: PixelPalette
var renderer: PixelRenderer
var save_system: SaveSystem
var input_system: PixelInputSystem

var frame_accumulator: float = 0.0
var started: bool = false

@onready var display: TextureRect = $Display

func _ready() -> void:
	set_process(true)
	set_process_input(true)
	_create_runtime()
	if not save_system.load_last_active():
		new_world(1, true)
	else:
		state.show_message("Loaded world slot %d" % int(state.save["active_slot"]), 1200)
		hud_system.update()
	started = true
	display.texture = renderer.render()

func _create_runtime() -> void:
	state = GameState.new(1)
	noise = PixelNoise.new(state.seed)
	world = WorldModel.new(state, noise)
	time_system = TimeSystem.new(state)
	weather_system = WeatherSystem.new(state, world, noise, time_system)
	hud_system = HudSystem.new(state, world, time_system, weather_system)
	crop_system = CropSystem.new(state, world, noise, weather_system)
	furniture_system = FurnitureSystem.new(state, world, time_system)
	weapon_system = WeaponSystem.new(state, world, noise, crop_system, furniture_system)
	player_system = PlayerSystem.new(state, world)
	player_system.set_weapon_system(weapon_system)
	player_system.set_furniture_system(furniture_system)
	weather_system.set_player_system(player_system)
	projectile_system = ProjectileSystem.new(state, world, noise)
	structure_system = StructureSystem.new(state, world)
	enemy_system = EnemySystem.new(state, world, player_system, noise, crop_system, furniture_system)
	boss_system = BossSystem.new(state, world, noise, player_system, time_system, weather_system)
	material_system = MaterialSystem.new(state, world, noise, weather_system)
	juice_system = JuiceSystem.new(state, noise, self)
	palette = PixelPalette.new(state, world, time_system, weather_system)
	renderer = PixelRenderer.new(state, world, weapon_system, palette, time_system, weather_system, juice_system)
	save_system = SaveSystem.new(state, world, time_system, Callable(self, "_reset_world"), Callable(self, "_after_load"), Callable(projectile_system, "close_reality_rifts"))
	input_system = PixelInputSystem.new(state, player_system, weapon_system, crop_system, furniture_system, structure_system, hud_system, save_system, Callable(self, "new_world"), Callable(self, "toggle_pause"))
	world.add_change_observer(Callable(self, "_on_cell_change"))

func _reset_world(seed_value: int) -> void:
	state.reset(seed_value)
	state.ui["pickup_feed"] = []
	state.ui["hud"] = {}
	state.ui["tool_status"] = ""
	player_system.reset_motion_remainder()
	juice_system.reset_runtime()
	renderer.invalidate_terrain_cache()

func _after_load() -> void:
	player_system.reset_motion_remainder()
	world.update_active_neighborhood()
	player_system.resolve_overlap()
	PixelGrid.snap_game_positions(state)
	state.world["dimension_positions"][String(state.world["dimension"])] = {"x": state.player["x"], "y": state.player["y"]}
	renderer.invalidate_terrain_cache()
	juice_system.reset_runtime()
	hud_system.update()

func _on_cell_change(event: Dictionary) -> void:
	if save_system != null:
		save_system.mark_dirty()
	if juice_system != null:
		juice_system.cell_change(event)

func _player_bounds(x: int, y: int) -> Rect2i:
	var width: int = int(state.player["width"])
	var height: int = int(state.player["height"])
	var left: int = x - floori(float(width - 1) * 0.5)
	return Rect2i(left, y - height + 1, width, height)

func _prepare_safe_player_space(spawn_x: int, spawn_y: int) -> void:
	var bounds: Rect2i = _player_bounds(spawn_x, spawn_y)
	if player_system.collides(spawn_x, spawn_y) or not player_system.ground_probe_at(spawn_x, spawn_y):
		for y: int in range(bounds.position.y, bounds.end.y):
			for x: int in range(bounds.position.x, bounds.end.x):
				world.set_cell(x, y, GameData.AIR, 0, {"silent": true, "reason": "safe-spawn"})
		for x: int in range(bounds.position.x, bounds.end.x):
			world.set_cell(x, bounds.end.y, GameData.DIRT, 0, {"silent": true, "reason": "safe-spawn"})

func _find_safe_spawn() -> Vector2i:
	var screen_center_x: int = floori(float(GameConfig.WORLD_WIDTH) * 0.5)
	var spawn_x: int = screen_center_x
	var spawn_surface: Dictionary = world.surface_at(spawn_x)
	for attempt: int in range(640):
		var ring: int = ceili(float(attempt) * 0.5)
		var chunk_offset: int = 0 if attempt == 0 else (ring if attempt % 2 == 1 else -ring)
		var x: int = chunk_offset * GameConfig.WORLD_WIDTH + screen_center_x
		var surface: Dictionary = world.surface_at(x)
		var biome: String = world.biome_name_at(x, int(surface["ground"]) - 2)
		var slope: int = absi(int(world.surface_at(x - 2)["ground"]) - int(world.surface_at(x + 2)["ground"]))
		if bool(surface.get("ocean", false)) or bool(surface.get("lake", false)) or biome == "volcano" or biome == "moon" or slope > 5:
			continue
		spawn_x = x
		spawn_surface = surface
		break
	var spawn_y: int = roundi(float(spawn_surface["ground"]))
	state.player["x"] = spawn_x
	state.player["y"] = spawn_y
	world.update_active_neighborhood()
	_prepare_safe_player_space(spawn_x, spawn_y)
	return Vector2i(spawn_x, spawn_y)

func new_world(slot: int = 1, save_after: bool = true) -> bool:
	var generator := RandomNumberGenerator.new()
	generator.randomize()
	_reset_world(generator.randi_range(1, 2147483000))
	state.weapon_id = 0
	state.player.merge({
		"x": 20, "y": 45, "vx": 0.0, "vy": 0.0, "hp": 100.0, "hunger": 100.0,
		"hunger_remainder": 0.0, "starvation_timer": 0, "breath": 100.0, "breath_remainder": 0.0,
		"drowning_timer": 0, "grounded": false, "invulnerability": 90, "locked": false, "facing": 1,
		"sky_spawn": false, "spawn_ground_y": 0, "stolen_weapon_id": null, "weapon_theft_cooldown": 0,
		"attached_parasites": [], "parasite_slow_multiplier": 1.0, "furniture_mode": "", "furniture_seat_id": null,
		"status": {"lava": false, "fire": false, "steam": false, "starving": false, "swimming": false, "climbing": false, "head_submerged": false, "breath_using": false, "no_oxygen": false},
		"bunny_hop": {"chain": 0, "landing_window": 0, "ground_frames": 0, "last_landing_frame": -9999, "last_jump_frame": -9999},
	}, true)
	var spawn: Vector2i = _find_safe_spawn()
	state.world["travel_origin_x"] = spawn.x
	var spawn_chunk_top: int = world.chunk_y(spawn.y) * GameConfig.WORLD_HEIGHT
	var sky_y: int = maxi(spawn_chunk_top + 10, mini(spawn_chunk_top + 18, spawn.y - 9))
	var landing_bounds: Rect2i = _player_bounds(spawn.x, spawn.y)
	for y: int in range(sky_y - int(state.player["height"]), landing_bounds.end.y):
		for x: int in range(landing_bounds.position.x, landing_bounds.end.x):
			world.set_cell(x, y, GameData.AIR, 0, {"silent": true, "reason": "safe-spawn"})
	for x: int in range(landing_bounds.position.x, landing_bounds.end.x):
		world.set_cell(x, landing_bounds.end.y, GameData.DIRT, 0, {"silent": true, "reason": "safe-spawn"})
	state.player.merge({"x": spawn.x, "y": sky_y, "vx": 0.0, "vy": 0.18, "grounded": false, "invulnerability": 240, "locked": false, "facing": 1, "sky_spawn": true, "spawn_ground_y": spawn.y}, true)
	PixelGrid.snap_game_positions(state)
	world.update_active_neighborhood()
	state.save["active_slot"] = clampi(slot, 1, SaveSystem.SLOT_COUNT)
	state.save["dirty"] = true
	renderer.invalidate_terrain_cache()
	hud_system.update()
	state.show_message("Infinite world %d - falling in" % state.seed, 1800)
	save_system.refresh_slots()
	if save_after:
		save_system.save(int(state.save["active_slot"]), true, "manual")
	return true

func toggle_pause() -> void:
	state.paused = not state.paused
	if state.paused:
		save_system.autosave()
	hud_system.update()

func _simulation_step() -> void:
	state.frame += 1
	hud_system.update_transient()
	input_system.update_gamepad()
	var frozen: bool = juice_system.update()
	if frozen:
		if state.frame % 3 == 0:
			hud_system.update()
		return
	structure_system.update()
	furniture_system.update()
	if String(state.ui.get("context_prompt", "")).is_empty():
		state.ui["context_prompt"] = furniture_system.context_prompt()
	player_system.update()
	player_system.resolve_overlap()
	weapon_system.update_hook()
	weapon_system.update_continuous()
	projectile_system.update()
	enemy_system.update()
	boss_system.update()
	weather_system.update()
	player_system.resolve_overlap()
	crop_system.update()
	player_system.resolve_overlap()
	if state.frame % 2 == 0:
		material_system.update()
		player_system.resolve_overlap()
	juice_system.after_simulation()
	PixelGrid.snap_game_positions(state)
	if state.frame % 60 == 0:
		save_system.mark_dirty()
	save_system.update()
	if state.frame % 10 == 0:
		hud_system.update()

func _process(delta: float) -> void:
	if not started:
		return
	frame_accumulator += minf(delta, 0.25)
	var steps: int = 0
	while frame_accumulator >= GameConfig.FIXED_STEP and steps < GameConfig.MAX_CATCH_UP_STEPS:
		if not state.paused:
			_simulation_step()
		frame_accumulator -= GameConfig.FIXED_STEP
		steps += 1
	if steps == GameConfig.MAX_CATCH_UP_STEPS and frame_accumulator >= GameConfig.FIXED_STEP:
		frame_accumulator = 0.0
	if steps > 0 or state.paused:
		display.texture = renderer.render()

func _input(event: InputEvent) -> void:
	if input_system == null:
		return
	input_system.handle_input(event, size)
