class_name ProjectileSystem
extends RefCounted

var state: GameState
var world: WorldModel
var noise: PixelNoise

func _hypot(x: float, y: float) -> float:
	return Vector2(x, y).length()

func _init(game_state: GameState, world_model: WorldModel, pixel_noise: PixelNoise) -> void:
	state = game_state
	world = world_model
	noise = pixel_noise

func _for_each_enemy(callback: Callable) -> void:
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		for enemy_value: Variant in chunk["enemies"]:
			callback.call(enemy_value)

func _for_each_boss_in_radius(x: float, y: float, radius: float, callback: Callable) -> void:
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary = boss_value
		var half_width: float = float(boss.get("width", 17)) * 0.5
		var half_height: float = float(boss.get("height", 11)) * 0.5
		if absf(float(boss["x"]) - x) > half_width + radius or absf(float(boss["y"]) - y) > half_height + radius:
			continue
		callback.call(boss)

func _damage_bosses_at(x: float, y: float, radius: float, damage: float, impulse_x: float = 0.0, impulse_y: float = 0.0) -> bool:
	var hit: bool = false
	_for_each_boss_in_radius(x, y, radius, func(boss: Dictionary) -> void:
		boss["hp"] = float(boss["hp"]) - damage
		boss["hit"] = max(6, int(boss.get("hit", 0)))
		boss["vx"] = float(boss.get("vx", 0.0)) + impulse_x
		boss["vy"] = float(boss.get("vy", 0.0)) + impulse_y
		hit = true
	)
	return hit

func _damage_bosses_in_radius(x: float, y: float, radius: float, damage: float) -> bool:
	var hit: bool = false
	_for_each_boss_in_radius(x, y, radius, func(boss: Dictionary) -> void:
		boss["hp"] = float(boss["hp"]) - damage
		boss["hit"] = max(8, int(boss.get("hit", 0)))
		hit = true
	)
	return hit

func _enemy_radius(enemy: Dictionary) -> float:
	var species: Dictionary = FaunaData.fauna(String(enemy.get("species_id", "")))
	return float(species.get("hit_radius", enemy.get("hit_radius", 2.0)))

func _update_bullets() -> void:
	var bullets: Array = state.entities["bullets"]
	for index: int in range(bullets.size() - 1, -1, -1):
		var bullet: Dictionary = bullets[index]
		bullet["life"] = int(bullet["life"]) - 1
		var dead: bool = int(bullet["life"]) <= 0
		for _step: int in range(4):
			if dead:
				break
			bullet["x"] = float(bullet["x"]) + float(bullet["vx"]) / 4.0
			bullet["y"] = float(bullet["y"]) + float(bullet["vy"]) / 4.0
			if not world.is_active_world_position(float(bullet["x"]), float(bullet["y"])):
				dead = true
				break
			if world.is_solid(world.get_cell(floori(float(bullet["x"])), floori(float(bullet["y"])))):
				dead = true
				break
			if _damage_bosses_at(float(bullet["x"]), float(bullet["y"]), 1.5, 22.0, float(bullet["vx"]) * 0.02, float(bullet["vy"]) * 0.02):
				bullet["pierce"] = int(bullet["pierce"]) - 1
				if int(bullet["pierce"]) <= 0:
					dead = true
			for chunk_value: Variant in state.world["active_chunks"]:
				var chunk: Dictionary = chunk_value
				for enemy_value: Variant in chunk["enemies"]:
					var enemy: Dictionary = enemy_value
					if _hypot(float(enemy["x"]) - float(bullet["x"]), float(enemy["y"]) - float(bullet["y"])) >= _enemy_radius(enemy) + 1.0:
						continue
					enemy["hp"] = float(enemy["hp"]) - 22.0
					enemy["hit"] = 6
					bullet["pierce"] = int(bullet["pierce"]) - 1
					if int(bullet["pierce"]) <= 0:
						dead = true
					break
				if dead:
					break
		if dead:
			bullets.remove_at(index)

func _touches_solid(x: int, y: int) -> bool:
	for offset: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		if world.is_solid(world.get_cell(x + offset.x, y + offset.y)):
			return true
	return false

func _touches_heat(x: int, y: int) -> bool:
	for offset: Vector2i in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var material: int = world.get_cell(x + offset.x, y + offset.y)
		if material == GameData.FIRE or material == GameData.LAVA:
			return true
	return false

func _can_receive_napalm(x: int, y: int) -> bool:
	return world.get_cell(x, y) in [GameData.AIR, GameData.SMOKE, GameData.STEAM]

func _deposit_napalm(preferred_x: int, preferred_y: int, impact_x: int, impact_y: int) -> bool:
	var candidates: Array[Vector2i] = [Vector2i(preferred_x, preferred_y)]
	for radius: int in range(3):
		for offset_y: int in range(-radius, radius + 1):
			for offset_x: int in range(-radius, radius + 1):
				candidates.append(Vector2i(impact_x + offset_x, impact_y + offset_y))
	var seen: Dictionary = {}
	for point: Vector2i in candidates:
		if seen.has(point):
			continue
		seen[point] = true
		if not _can_receive_napalm(point.x, point.y):
			continue
		if _touches_heat(point.x, point.y):
			world.set_cell(point.x, point.y, GameData.FIRE, int(GameConfig.NAPALM["fire_life_frames"]), {"reason": "napalm-impact", "ignore_player": true})
		else:
			world.set_cell(point.x, point.y, GameData.NAPALM, 1 if _touches_solid(point.x, point.y) else 0, {"reason": "napalm-impact", "ignore_player": true})
		return true
	return false

func _update_napalm_shots() -> void:
	var shots: Array = state.entities["napalm_shots"]
	for index: int in range(shots.size() - 1, -1, -1):
		var shot: Dictionary = shots[index]
		shot["life"] = int(shot["life"]) - 1
		shot["vy"] = float(shot["vy"]) + 0.035
		shot["vx"] = float(shot["vx"]) * 0.992
		var hit: bool = int(shot["life"]) <= 0
		var last_open_x: int = floori(float(shot["x"]))
		var last_open_y: int = floori(float(shot["y"]))
		var impact_x: int = last_open_x
		var impact_y: int = last_open_y
		for _step: int in range(3):
			if hit:
				break
			var previous_x: float = float(shot["x"])
			var previous_y: float = float(shot["y"])
			shot["x"] = previous_x + float(shot["vx"]) / 3.0
			shot["y"] = previous_y + float(shot["vy"]) / 3.0
			if not world.is_active_world_position(float(shot["x"]), float(shot["y"])):
				hit = true
				break
			impact_x = floori(float(shot["x"]))
			impact_y = floori(float(shot["y"]))
			var material: int = world.get_cell(impact_x, impact_y)
			if world.is_solid(material) or material in [GameData.WATER, GameData.LAVA, GameData.FIRE]:
				hit = true
				shot["x"] = previous_x
				shot["y"] = previous_y
				break
			last_open_x = impact_x
			last_open_y = impact_y
			if _damage_bosses_at(float(shot["x"]), float(shot["y"]), 1.6, 0.0):
				hit = true
				break
			for chunk_value: Variant in state.world["active_chunks"]:
				var chunk: Dictionary = chunk_value
				for enemy_value: Variant in chunk["enemies"]:
					var enemy: Dictionary = enemy_value
					if _hypot(float(enemy["x"]) - float(shot["x"]), float(enemy["y"]) - float(shot["y"])) < _enemy_radius(enemy) + 1.2:
						hit = true
						break
				if hit:
					break
		if hit:
			_deposit_napalm(last_open_x, last_open_y, impact_x, impact_y)
			shots.remove_at(index)

func _glaive_blocked_at(x: float, y: float) -> bool:
	if not world.is_active_world_position(x, y):
		return true
	return world.is_solid(world.get_cell(floori(x), floori(y)))

func _record_glaive_ricochet(blade: Dictionary) -> void:
	blade["bounces"] = int(blade.get("bounces", 0)) + 1
	blade["spin_speed"] = -float(blade.get("spin_speed", GameConfig.GLAIVE["spin_speed"])) * 1.04
	if int(blade["bounces"]) >= int(GameConfig.GLAIVE["max_bounces"]):
		blade["returning"] = true

func _move_glaive_with_ricochet(blade: Dictionary) -> void:
	var steps: int = maxi(1, ceili(maxf(absf(float(blade["vx"])), absf(float(blade["vy"]))) * 3.0))
	for _step: int in range(steps):
		var step_x: float = float(blade["vx"]) / float(steps)
		var step_y: float = float(blade["vy"]) / float(steps)
		var next_x: float = float(blade["x"]) + step_x
		var next_y: float = float(blade["y"]) + step_y
		var blocked_x: bool = _glaive_blocked_at(next_x, float(blade["y"]))
		var blocked_y: bool = _glaive_blocked_at(float(blade["x"]), next_y)
		var blocked_diagonal: bool = _glaive_blocked_at(next_x, next_y)
		if not blocked_x and not blocked_y and not blocked_diagonal:
			blade["x"] = next_x
			blade["y"] = next_y
			continue
		var bounce_x: bool = blocked_x
		var bounce_y: bool = blocked_y
		if not bounce_x and not bounce_y and blocked_diagonal:
			bounce_x = true
			bounce_y = true
		if bounce_x:
			blade["vx"] = -float(blade["vx"]) * float(GameConfig.GLAIVE["ricochet_retention"])
		if bounce_y:
			blade["vy"] = -float(blade["vy"]) * float(GameConfig.GLAIVE["ricochet_retention"])
		if not bounce_x and not bounce_y:
			blade["vx"] = -float(blade["vx"]) * float(GameConfig.GLAIVE["ricochet_retention"])
			blade["vy"] = -float(blade["vy"]) * float(GameConfig.GLAIVE["ricochet_retention"])
		_record_glaive_ricochet(blade)
		var nudge_x: float = signf(float(blade["vx"])) * 0.12
		var nudge_y: float = signf(float(blade["vy"])) * 0.12
		if not _glaive_blocked_at(float(blade["x"]) + nudge_x, float(blade["y"])):
			blade["x"] = float(blade["x"]) + nudge_x
		if not _glaive_blocked_at(float(blade["x"]), float(blade["y"]) + nudge_y):
			blade["y"] = float(blade["y"]) + nudge_y
		break

func _ricochet_glaive_from_entity(blade: Dictionary, entity: Dictionary) -> void:
	var normal: Vector2 = Vector2(float(blade["x"]) - float(entity["x"]), float(blade["y"]) - float(entity["y"]))
	if normal.length_squared() <= 0.000001:
		normal = Vector2.LEFT
	else:
		normal = normal.normalized()
	var velocity: Vector2 = Vector2(float(blade["vx"]), float(blade["vy"]))
	var dot: float = velocity.dot(normal)
	if dot < 0.0:
		velocity = (velocity - 2.0 * dot * normal) * float(GameConfig.GLAIVE["ricochet_retention"])
	else:
		velocity *= -float(GameConfig.GLAIVE["ricochet_retention"])
	blade["vx"] = velocity.x
	blade["vy"] = velocity.y
	_record_glaive_ricochet(blade)

func _enemy_hit_key(enemy: Dictionary) -> String:
	if enemy.has("id"):
		return "enemy:%s" % String(enemy["id"])
	if enemy.has("spawn_id"):
		return "enemy:%s" % String(enemy["spawn_id"])
	return "enemy:%s:%s" % [String(enemy.get("species_id", "unknown")), String(enemy.get("animation_offset", 0))]

func _update_glaives() -> void:
	var glaives: Array = state.entities["glaives"]
	for index: int in range(glaives.size() - 1, -1, -1):
		var blade: Dictionary = glaives[index]
		blade["age"] = int(blade.get("age", 0)) + 1
		blade["spin"] = float(blade.get("spin", 0.0)) + float(blade.get("spin_speed", GameConfig.GLAIVE["spin_speed"]))
		if int(blade["age"]) > int(GameConfig.GLAIVE["return_after_frames"]):
			blade["returning"] = true
		if int(blade["age"]) > int(GameConfig.GLAIVE["max_life_frames"]):
			glaives.remove_at(index)
			continue
		if bool(blade.get("returning", false)):
			var delta: Vector2 = Vector2(float(state.player["x"]), float(state.player["y"]) - 2.0) - Vector2(float(blade["x"]), float(blade["y"]))
			var distance: float = maxf(0.0001, delta.length())
			blade["vx"] = (float(blade["vx"]) + delta.x / distance * 0.14) * 0.96
			blade["vy"] = (float(blade["vy"]) + delta.y / distance * 0.14) * 0.96
			if distance < 3.0:
				glaives.remove_at(index)
				continue
		_move_glaive_with_ricochet(blade)
		var hits: Dictionary = blade.get("hits", {})
		blade["hits"] = hits
		for boss_value: Variant in state.entities["bosses"]:
			var boss: Dictionary = boss_value
			var key: String = "boss:%s" % String(boss.get("region_index", boss.get("kind", "boss")))
			if int(hits.get(key, 0)) > state.frame:
				continue
			var boss_radius: float = maxf(3.0, minf(float(boss.get("width", 12)) * 0.42, float(boss.get("height", 10)) * 0.55))
			if _hypot(float(boss["x"]) - float(blade["x"]), float(boss["y"]) - float(blade["y"])) >= boss_radius + 2.0:
				continue
			boss["hp"] = float(boss["hp"]) - 28.0
			boss["hit"] = max(6, int(boss.get("hit", 0)))
			hits[key] = state.frame + int(GameConfig.GLAIVE["enemy_hit_cooldown"])
			_ricochet_glaive_from_entity(blade, boss)
		for chunk_value: Variant in state.world["active_chunks"]:
			var chunk: Dictionary = chunk_value
			for enemy_value: Variant in chunk["enemies"]:
				var enemy: Dictionary = enemy_value
				var key: String = _enemy_hit_key(enemy)
				if int(hits.get(key, 0)) > state.frame:
					continue
				if _hypot(float(enemy["x"]) - float(blade["x"]), float(enemy["y"]) - float(blade["y"])) >= _enemy_radius(enemy) + 2.0:
					continue
				enemy["hp"] = float(enemy["hp"]) - 28.0
				enemy["hit"] = 4
				hits[key] = state.frame + int(GameConfig.GLAIVE["enemy_hit_cooldown"])
				_ricochet_glaive_from_entity(blade, enemy)

func _fire_life_at(x: int, y: int, salt: int, minimum: int, maximum: int) -> int:
	var span: int = maximum - minimum
	return minimum + floori(noise.random_at(x, y, salt) * float(span))

func _place_explosion_fire(x: int, y: int, life: int, ignore_player: bool = false) -> bool:
	var material: int = world.get_cell(x, y)
	if material == GameData.AIR or material == GameData.SMOKE:
		return world.set_cell(x, y, GameData.FIRE, life, {"reason": "explosion-fire", "ignore_player": ignore_player})
	if material != GameData.NAPALM and GameData.is_flammable(material):
		return world.set_cell(x, y, GameData.FIRE, life, {"reason": "explosion-fire", "ignore_player": ignore_player})
	return false

func _ignite_entity_positions(center_x: int, center_y: int, radius: float, fire_life: int) -> void:
	var player_distance: float = _hypot(float(state.player["x"]) - float(center_x), float(state.player["y"]) - 2.0 - float(center_y))
	if player_distance <= radius:
		_place_explosion_fire(floori(float(state.player["x"])), floori(float(state.player["y"]) - 2.0), fire_life, true)
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		for enemy_value: Variant in chunk["enemies"]:
			var enemy: Dictionary = enemy_value
			if _hypot(float(enemy["x"]) - float(center_x), float(enemy["y"]) - float(center_y)) <= radius:
				_place_explosion_fire(floori(float(enemy["x"])), floori(float(enemy["y"])), fire_life, true)

func _explode_grenade(grenade: Dictionary) -> void:
	var center_x: int = floori(float(grenade["x"]))
	var center_y: int = floori(float(grenade["y"]))
	var blast_radius: int = int(GameConfig.GRENADE["blast_radius"])
	var fire_radius: int = int(GameConfig.GRENADE["fire_radius"])
	(state.entities["explosions"] as Array).append({"x": center_x, "y": center_y, "radius": fire_radius, "frames": 12, "max_frames": 12})
	for y: int in range(center_y - blast_radius, center_y + blast_radius + 1):
		for x: int in range(center_x - blast_radius, center_x + blast_radius + 1):
			if Vector2(float(x - center_x), float(y - center_y)).length_squared() > float(blast_radius * blast_radius):
				continue
			if world.is_solid(world.get_cell(x, y)):
				world.set_cell(x, y, GameData.AIR, 0, {"reason": "grenade-explosion"})
	for y: int in range(center_y - fire_radius, center_y + fire_radius + 1):
		for x: int in range(center_x - fire_radius, center_x + fire_radius + 1):
			var distance: float = _hypot(float(x - center_x), float(y - center_y))
			if distance > float(fire_radius):
				continue
			var strength: float = 1.0 - distance / float(fire_radius)
			if noise.random_at(x, y, state.frame + 930) > 0.16 + strength * 0.55:
				continue
			_place_explosion_fire(x, y, _fire_life_at(x, y, state.frame + 931, int(GameConfig.GRENADE["fire_life_min"]), int(GameConfig.GRENADE["fire_life_max"])))
	for point: Vector2i in [Vector2i(center_x, center_y), Vector2i(center_x, center_y - 1), Vector2i(center_x - 1, center_y), Vector2i(center_x + 1, center_y)]:
		_place_explosion_fire(point.x, point.y, int(GameConfig.GRENADE["fire_life_max"]))
	_ignite_entity_positions(center_x, center_y, float(fire_radius), int(GameConfig.GRENADE["fire_life_max"]))
	_damage_bosses_in_radius(center_x, center_y, float(fire_radius), 22.0)

func _update_grenades() -> void:
	var grenades: Array = state.entities["grenades"]
	for index: int in range(grenades.size() - 1, -1, -1):
		var grenade: Dictionary = grenades[index]
		grenade["fuse"] = int(grenade["fuse"]) - 1
		if int(grenade["fuse"]) <= 0:
			_explode_grenade(grenade)
			grenades.remove_at(index)
			continue
		grenade["vy"] = float(grenade["vy"]) + float(GameConfig.GRENADE["gravity"])
		grenade["vx"] = float(grenade["vx"]) * float(GameConfig.GRENADE["air_drag"])
		grenade["rotation"] = float(grenade.get("rotation", 0.0)) + float(grenade["vx"]) * 0.22
		var active: bool = true
		for _step: int in range(4):
			if not active:
				break
			var next_x: float = float(grenade["x"]) + float(grenade["vx"]) / 4.0
			if not world.is_active_world_position(next_x, float(grenade["y"])):
				grenades.remove_at(index)
				active = false
				break
			if world.is_solid(world.get_cell(floori(next_x), floori(float(grenade["y"])))):
				grenade["vx"] = -float(grenade["vx"]) * float(GameConfig.GRENADE["bounce"])
				grenade["bounces"] = int(grenade.get("bounces", 0)) + 1
			else:
				grenade["x"] = next_x
			var next_y: float = float(grenade["y"]) + float(grenade["vy"]) / 4.0
			if not world.is_active_world_position(float(grenade["x"]), next_y):
				grenades.remove_at(index)
				active = false
				break
			if world.is_solid(world.get_cell(floori(float(grenade["x"])), floori(next_y))):
				grenade["vy"] = -float(grenade["vy"]) * float(GameConfig.GRENADE["bounce"])
				grenade["bounces"] = int(grenade.get("bounces", 0)) + 1
				grenade["vx"] = float(grenade["vx"]) * float(GameConfig.GRENADE["ground_friction"])
				if absf(float(grenade["vy"])) < 0.08:
					grenade["vy"] = 0.0
			else:
				grenade["y"] = next_y
		if not active:
			continue
		var material: int = world.get_cell(floori(float(grenade["x"])), floori(float(grenade["y"])))
		if material == GameData.FIRE or material == GameData.LAVA:
			grenade["fuse"] = mini(4, int(grenade["fuse"]))

func _launch_drone_rocket(drone: Dictionary) -> void:
	var delta: Vector2 = Vector2(float(drone["target_x"]), float(drone["target_y"])) - Vector2(float(drone["x"]), float(drone["y"]))
	var distance: float = maxf(0.0001, delta.length())
	(state.entities["drone_rockets"] as Array).append({
		"x": float(drone["x"]), "y": roundi(float(drone["y"]) + 1.5),
		"vx": delta.x / distance * 0.55, "vy": maxf(0.65, delta.y / distance * 0.85),
		"target_x": drone["target_x"], "target_y": drone["target_y"], "age": 0,
	})

func _update_drones() -> void:
	var drones: Array = state.entities["drones"]
	for index: int in range(drones.size() - 1, -1, -1):
		var drone: Dictionary = drones[index]
		drone["bob"] = float(drone.get("bob", 0.0)) + 0.16
		drone["x"] = float(drone["x"]) + float(drone["direction"]) * float(GameConfig.DRONE_STRIKE["drone_speed"])
		if not world.is_active_world_position(float(drone["x"]), float(drone["y"])):
			drones.remove_at(index)
			continue
		if world.get_cell(floori(float(drone["x"])), floori(float(drone["y"]))) != GameData.AIR:
			drones.remove_at(index)
			continue
		if String(drone["phase"]) == "approach":
			var reached_target: bool = float(drone["x"]) >= float(drone["target_x"]) if int(drone["direction"]) > 0 else float(drone["x"]) <= float(drone["target_x"])
			if reached_target:
				_launch_drone_rocket(drone)
				drone["phase"] = "exit"
				drone["launched"] = true
		if String(drone["phase"]) == "exit":
			var left_map: bool = float(drone["x"]) >= float(drone["exit_x"]) if int(drone["direction"]) > 0 else float(drone["x"]) <= float(drone["exit_x"])
			if left_map:
				drones.remove_at(index)

func _explode_drone_rocket(rocket: Dictionary) -> void:
	var center_x: int = floori(float(rocket.get("target_x", rocket["x"])))
	var center_y: int = floori(float(rocket.get("target_y", rocket["y"])))
	var blast_radius: int = int(GameConfig.DRONE_STRIKE["blast_radius"])
	var fire_radius: int = int(GameConfig.DRONE_STRIKE["fire_radius"])
	var explosion_frames: int = int(GameConfig.DRONE_STRIKE["explosion_frames"])
	(state.entities["explosions"] as Array).append({"x": center_x, "y": center_y, "radius": fire_radius, "frames": explosion_frames, "max_frames": explosion_frames, "kind": "drone"})
	for y: int in range(center_y - blast_radius, center_y + blast_radius + 1):
		for x: int in range(center_x - blast_radius, center_x + blast_radius + 1):
			if Vector2(float(x - center_x), float(y - center_y)).length_squared() <= float(blast_radius * blast_radius) and world.is_solid(world.get_cell(x, y)):
				world.set_cell(x, y, GameData.AIR, 0, {"reason": "drone-explosion"})
	for y: int in range(center_y - fire_radius, center_y + fire_radius + 1):
		for x: int in range(center_x - fire_radius, center_x + fire_radius + 1):
			var distance: float = _hypot(float(x - center_x), float(y - center_y))
			if distance > float(fire_radius):
				continue
			var strength: float = 1.0 - distance / float(fire_radius)
			var guaranteed: bool = distance <= 5.0
			if not guaranteed and noise.random_at(x, y, state.frame + 2520) > 0.28 + strength * 0.66:
				continue
			_place_explosion_fire(x, y, _fire_life_at(x, y, state.frame + 2521, int(GameConfig.DRONE_STRIKE["fire_life_min"]), int(GameConfig.DRONE_STRIKE["fire_life_max"])))
	for offset: int in range(-7, 8):
		_place_explosion_fire(center_x + offset, center_y - 1 - floori(absf(float(offset)) * 0.18), int(GameConfig.DRONE_STRIKE["fire_life_max"]))
	_ignite_entity_positions(center_x, center_y, float(fire_radius), int(GameConfig.DRONE_STRIKE["fire_life_max"]))
	_damage_bosses_in_radius(center_x, center_y, float(fire_radius), 46.0)

func _update_drone_rockets() -> void:
	var rockets: Array = state.entities["drone_rockets"]
	for index: int in range(rockets.size() - 1, -1, -1):
		var rocket: Dictionary = rockets[index]
		rocket["age"] = int(rocket.get("age", 0)) + 1
		var delta: Vector2 = Vector2(float(rocket["target_x"]), float(rocket["target_y"])) - Vector2(float(rocket["x"]), float(rocket["y"]))
		var distance: float = maxf(0.0001, delta.length())
		var desired_vx: float = delta.x / distance * float(GameConfig.DRONE_STRIKE["rocket_speed"])
		var desired_vy: float = delta.y / distance * float(GameConfig.DRONE_STRIKE["rocket_speed"])
		rocket["vx"] = float(rocket["vx"]) + (desired_vx - float(rocket["vx"])) * float(GameConfig.DRONE_STRIKE["rocket_homing"])
		rocket["vy"] = float(rocket["vy"]) + (desired_vy - float(rocket["vy"])) * float(GameConfig.DRONE_STRIKE["rocket_homing"])
		rocket["vy"] = float(rocket["vy"]) + float(GameConfig.DRONE_STRIKE["rocket_gravity"])
		var detonated: bool = false
		for _step: int in range(5):
			if detonated:
				break
			var next_x: float = float(rocket["x"]) + float(rocket["vx"]) / 5.0
			var next_y: float = float(rocket["y"]) + float(rocket["vy"]) / 5.0
			if not world.is_active_world_position(next_x, next_y):
				rockets.remove_at(index)
				detonated = true
				break
			var material: int = world.get_cell(floori(next_x), floori(next_y))
			if world.is_solid(material):
				if GameData.is_flammable(material):
					world.set_cell(floori(next_x), floori(next_y), GameData.FIRE, int(GameConfig.DRONE_STRIKE["fire_life_max"]), {"reason": "drone-rocket"})
					rocket["x"] = next_x
					rocket["y"] = next_y
					continue
				_explode_drone_rocket(rocket)
				rockets.remove_at(index)
				detonated = true
				break
			rocket["x"] = next_x
			rocket["y"] = next_y
			if _hypot(float(rocket["target_x"]) - next_x, float(rocket["target_y"]) - next_y) < 1.35 or next_y >= float(rocket["target_y"]):
				_explode_drone_rocket(rocket)
				rockets.remove_at(index)
				detonated = true

func _spawn_nyan_sparks(x: float, y: float, count: int = -1) -> void:
	var spark_count: int = int(GameConfig.NYAN_CAT["spark_count"]) if count < 0 else count
	var sparks: Array = state.entities["nyan_sparks"]
	for index: int in range(spark_count):
		var angle: float = noise.random_at(roundi(x) + index, roundi(y), state.frame + 9920) * TAU
		var speed: float = 0.45 + noise.random_at(index, roundi(x + y), state.frame + 9921) * 2.25
		sparks.append({
			"x": roundi(x), "y": roundi(y), "vx": cos(angle) * speed, "vy": sin(angle) * speed - 0.15,
			"life": 18 + floori(noise.random_at(roundi(y), index, state.frame + 9922) * 30.0), "color_index": index % 6,
		})
	var max_sparks: int = int(GameConfig.NYAN_CAT["max_sparks"])
	while sparks.size() > max_sparks:
		sparks.pop_front()

func _update_nyan_sparks() -> void:
	var sparks: Array = state.entities["nyan_sparks"]
	for index: int in range(sparks.size() - 1, -1, -1):
		var spark: Dictionary = sparks[index]
		spark["x"] = float(spark["x"]) + float(spark["vx"])
		spark["y"] = float(spark["y"]) + float(spark["vy"])
		spark["vx"] = float(spark["vx"]) * 0.975
		spark["vy"] = float(spark["vy"]) + 0.055
		spark["life"] = int(spark["life"]) - 1
		if int(spark["life"]) <= 0:
			sparks.remove_at(index)

func _preserve_nyan_momentum(cat: Dictionary) -> void:
	var velocity: Vector2 = Vector2(float(cat["vx"]), float(cat["vy"]))
	var speed: float = velocity.length()
	var minimum: float = float(GameConfig.NYAN_CAT["minimum_momentum"])
	if speed <= 0.0 or speed >= minimum:
		return
	velocity *= minimum / speed
	cat["vx"] = velocity.x
	cat["vy"] = velocity.y

func _nyan_hits_terrain_at(cat: Dictionary, x: float, y: float, axis: String) -> bool:
	if axis == "x":
		var facing: int = 1 if float(cat.get("vx", 1.0)) >= 0.0 else -1
		var probe_x: int = roundi(x + float(facing * 6))
		var center_y: int = roundi(y)
		for offset_y: int in range(-2, 3):
			if world.is_solid(world.get_cell(probe_x, center_y + offset_y)):
				return true
		return false
	var vertical: int = 1 if float(cat.get("vy", 1.0)) >= 0.0 else -1
	var probe_y: int = roundi(y + float(vertical * 3))
	var center_x: int = roundi(x)
	for offset_x: int in range(-5, 6, 2):
		if world.is_solid(world.get_cell(center_x + offset_x, probe_y)):
			return true
	return false

func _bounce_nyan_cat(cat: Dictionary, axis: String) -> void:
	if axis == "x":
		cat["vx"] = -float(cat["vx"]) * float(GameConfig.NYAN_CAT["bounce_retention"])
	else:
		cat["vy"] = -float(cat["vy"]) * float(GameConfig.NYAN_CAT["bounce_retention"])
	cat["bounces"] = int(cat.get("bounces", 0)) + 1
	_preserve_nyan_momentum(cat)
	_spawn_nyan_sparks(float(cat["x"]), float(cat["y"]), int(GameConfig.NYAN_CAT["bounce_spark_count"]))

func _damage_enemies_in_nyan_blast(x: float, y: float, radius: float) -> void:
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		for enemy_value: Variant in chunk["enemies"]:
			var enemy: Dictionary = enemy_value
			var delta: Vector2 = Vector2(float(enemy["x"]) - x, float(enemy["y"]) - y)
			var distance: float = delta.length()
			if distance > radius:
				continue
			var force: float = maxf(0.1, 1.0 - distance / radius)
			enemy["hp"] = float(enemy["hp"]) - float(GameConfig.NYAN_CAT["blast_damage"])
			enemy["hit"] = max(10, int(enemy.get("hit", 0)))
			var normal: Vector2 = delta.normalized() if distance > 0.0 else Vector2.RIGHT
			enemy["vx"] = float(enemy.get("vx", 0.0)) + normal.x * 1.2 * force
			enemy["vy"] = float(enemy.get("vy", 0.0)) + normal.y * 1.2 * force - 0.25

func _explode_nyan(cat: Dictionary) -> void:
	var center_x: int = roundi(float(cat["x"]))
	var center_y: int = roundi(float(cat["y"]))
	var blast_radius: int = int(GameConfig.NYAN_CAT["blast_radius"])
	(state.entities["explosions"] as Array).append({"x": center_x, "y": center_y, "radius": blast_radius, "frames": 22, "max_frames": 22, "kind": "nyan"})
	var terrain_radius: int = int(GameConfig.NYAN_CAT["terrain_radius"])
	for y: int in range(center_y - terrain_radius, center_y + terrain_radius + 1):
		for x: int in range(center_x - terrain_radius, center_x + terrain_radius + 1):
			var delta: Vector2 = Vector2(float(x - center_x), float(y - center_y))
			var distance: float = delta.length()
			var star_radius: float = float(terrain_radius) * (0.7 + 0.3 * absf(cos(atan2(delta.y, delta.x) * 5.0)))
			if distance > star_radius or not world.is_solid(world.get_cell(x, y)):
				continue
			if distance > star_radius - 1.4 and noise.random_at(x, y, state.frame + 9931) < 0.28:
				world.set_cell(x, y, GameData.CRYSTAL, 0, {"reason": "nyan-cat-impact"})
			else:
				world.set_cell(x, y, GameData.AIR, 0, {"reason": "nyan-cat-impact"})
	_damage_bosses_in_radius(center_x, center_y, float(blast_radius), float(GameConfig.NYAN_CAT["boss_damage"]))
	_damage_enemies_in_nyan_blast(center_x, center_y, float(blast_radius))
	_spawn_nyan_sparks(center_x, center_y)

func _update_nyan() -> void:
	var cats: Array = state.entities["nyan_cats"]
	for index: int in range(cats.size() - 1, -1, -1):
		var cat: Dictionary = cats[index]
		cat["life"] = int(cat["life"]) - 1
		cat["phase"] = float(cat.get("phase", 0.0)) + 0.35
		cat["bounces"] = int(cat.get("bounces", 0))
		var trail: Array = cat.get("trail", [])
		cat["trail"] = trail
		var hits: Dictionary = cat.get("hits", {})
		cat["hits"] = hits
		trail.push_front({"x": roundi(float(cat["x"])), "y": roundi(float(cat["y"]))})
		while trail.size() > int(GameConfig.NYAN_CAT["trail_length"]):
			trail.pop_back()
		cat["vy"] = float(cat["vy"]) + float(GameConfig.NYAN_CAT["gravity"])
		cat["vx"] = float(cat["vx"]) * float(GameConfig.NYAN_CAT["air_drag"])
		cat["vy"] = float(cat["vy"]) * float(GameConfig.NYAN_CAT["air_drag"])
		_preserve_nyan_momentum(cat)
		var detonate: bool = int(cat["life"]) <= 0 or int(cat["bounces"]) >= int(GameConfig.NYAN_CAT["max_bounces"])
		var steps: int = maxi(1, ceili(maxf(absf(float(cat["vx"])), absf(float(cat["vy"]))) * 2.0))
		for _step: int in range(steps):
			if detonate:
				break
			var next_x: float = float(cat["x"]) + float(cat["vx"]) / float(steps)
			if not world.is_active_world_position(next_x, float(cat["y"])):
				detonate = true
				break
			if _nyan_hits_terrain_at(cat, next_x, float(cat["y"]), "x"):
				_bounce_nyan_cat(cat, "x")
				if int(cat["bounces"]) >= int(GameConfig.NYAN_CAT["max_bounces"]):
					detonate = true
					break
			else:
				cat["x"] = next_x
			var next_y: float = float(cat["y"]) + float(cat["vy"]) / float(steps)
			if not world.is_active_world_position(float(cat["x"]), next_y):
				detonate = true
				break
			if _nyan_hits_terrain_at(cat, float(cat["x"]), next_y, "y"):
				_bounce_nyan_cat(cat, "y")
				if int(cat["bounces"]) >= int(GameConfig.NYAN_CAT["max_bounces"]):
					detonate = true
					break
			else:
				cat["y"] = next_y
			if _damage_bosses_at(float(cat["x"]), float(cat["y"]), 4.0, float(GameConfig.NYAN_CAT["contact_damage"]), float(cat["vx"]) * 0.08, float(cat["vy"]) * 0.08):
				detonate = true
				break
			for chunk_value: Variant in state.world["active_chunks"]:
				var chunk: Dictionary = chunk_value
				for enemy_value: Variant in chunk["enemies"]:
					var enemy: Dictionary = enemy_value
					if float(enemy.get("hp", 0.0)) <= 0.0:
						continue
					var enemy_key: String = _enemy_hit_key(enemy)
					if hits.has(enemy_key):
						continue
					if _hypot(float(enemy["x"]) - float(cat["x"]), float(enemy["y"]) - float(cat["y"])) > _enemy_radius(enemy) + 3.0:
						continue
					enemy["hp"] = float(enemy["hp"]) - float(GameConfig.NYAN_CAT["contact_damage"])
					enemy["hit"] = max(8, int(enemy.get("hit", 0)))
					enemy["vx"] = float(enemy.get("vx", 0.0)) + signf(float(cat.get("vx", 1.0))) * 1.1
					enemy["vy"] = float(enemy.get("vy", 0.0)) - 0.45
					hits[enemy_key] = true
					cat["pierce"] = int(cat["pierce"]) - 1
					_spawn_nyan_sparks(float(enemy["x"]), float(enemy["y"]), 8)
					if int(cat["pierce"]) <= 0:
						detonate = true
						break
				if detonate:
					break
		if detonate:
			_explode_nyan(cat)
			cats.remove_at(index)

func _reality_line_points(x0: float, y0: float, x1: float, y1: float) -> Array[Vector2i]:
	var points: Array[Vector2i] = []
	var ax: int = roundi(x0)
	var ay: int = roundi(y0)
	var bx: int = roundi(x1)
	var by: int = roundi(y1)
	var dx: int = absi(bx - ax)
	var sx: int = 1 if ax < bx else -1
	var dy: int = -absi(by - ay)
	var sy: int = 1 if ay < by else -1
	var error: int = dx + dy
	while true:
		points.append(Vector2i(ax, ay))
		if ax == bx and ay == by:
			break
		var doubled: int = 2 * error
		if doubled >= dy:
			error += dy
			ax += sx
		if doubled <= dx:
			error += dx
			ay += sy
	return points

func _reality_cell_state(x: int, y: int) -> Dictionary:
	return {"x": x, "y": y, "type": world.get_cell(x, y), "life": world.get_life(x, y), "crop_id": world.get_crop_id(x, y), "plant_id": world.get_plant_id(x, y), "age": world.get_age(x, y)}

func _spawn_reality_sparks(x: float, y: float, count: int = -1, normal_x: int = 0, normal_y: int = 1) -> void:
	var spark_count: int = int(GameConfig.REALITY_ZIPPER["pulse_spark_count"]) if count < 0 else count
	var sparks: Array = state.entities["reality_sparks"]
	for index: int in range(spark_count):
		var polarity: int = 1 if index % 2 == 0 else -1
		var tangent_x: int = -normal_y
		var tangent_y: int = normal_x
		var tangent: float = (noise.random_at(index, state.frame, roundi(x + y) + 10101) - 0.5) * 1.9
		var normal: float = 0.35 + noise.random_at(state.frame, index, roundi(x - y) + 10102) * 1.45
		sparks.append({
			"x": roundi(x), "y": roundi(y),
			"vx": float(tangent_x) * tangent + float(normal_x * polarity) * normal,
			"vy": float(tangent_y) * tangent + float(normal_y * polarity) * normal,
			"life": 15 + floori(noise.random_at(roundi(x) + index, roundi(y), state.frame + 10103) * 26.0),
			"color_index": (index + floori(float(state.frame) / 3.0)) % 8,
			"phase": noise.random_at(roundi(y), index, state.frame + 10104) * TAU,
		})
	while sparks.size() > int(GameConfig.REALITY_ZIPPER["max_sparks"]):
		sparks.pop_front()

func _open_reality_rift(rift: Dictionary) -> void:
	var points: Array[Vector2i] = _reality_line_points(float(rift["start_x"]), float(rift["start_y"]), float(rift["end_x"]), float(rift["end_y"]))
	rift["points"] = points
	var snapshot_map: Dictionary = {}
	var reach: int = int(GameConfig.REALITY_ZIPPER["split_distance"]) + int(GameConfig.REALITY_ZIPPER["half_width"]) + 1
	for point: Vector2i in points:
		for offset: int in range(-reach, reach + 1):
			var x: int = point.x + int(rift["normal_x"]) * offset
			var y: int = point.y + int(rift["normal_y"]) * offset
			var key: String = "%d,%d" % [x, y]
			if not snapshot_map.has(key):
				snapshot_map[key] = _reality_cell_state(x, y)
	rift["snapshot"] = snapshot_map.values()
	var processed: Dictionary = {}
	for point: Vector2i in points:
		for side: int in [-1, 1]:
			for offset: int in range(int(GameConfig.REALITY_ZIPPER["half_width"]), -1, -1):
				var source_x: int = point.x + int(rift["normal_x"]) * side * offset
				var source_y: int = point.y + int(rift["normal_y"]) * side * offset
				var source_key: String = "%d,%d" % [source_x, source_y]
				if processed.has(source_key):
					continue
				processed[source_key] = true
				var source: Dictionary = _reality_cell_state(source_x, source_y)
				var destination_x: int = point.x + int(rift["normal_x"]) * side * (offset + int(GameConfig.REALITY_ZIPPER["split_distance"]))
				var destination_y: int = point.y + int(rift["normal_y"]) * side * (offset + int(GameConfig.REALITY_ZIPPER["split_distance"]))
				if int(source["type"]) != GameData.AIR:
					world.set_cell(destination_x, destination_y, int(source["type"]), int(source["life"]), {"crop_id": source["crop_id"], "plant_id": source["plant_id"], "reason": "reality-zipper-open", "ignore_player": true})
					world.set_age(destination_x, destination_y, int(source["age"]))
				world.set_cell(source_x, source_y, GameData.AIR, 0, {"reason": "reality-zipper-open", "ignore_player": true})
	rift["applied"] = true
	rift["restored"] = false
	rift["split_count"] = int(rift.get("split_count", 0))
	var sample_step: int = maxi(1, floori(float(points.size()) / 12.0))
	for index: int in range(0, points.size(), sample_step):
		var point: Vector2i = points[index]
		_spawn_reality_sparks(point.x, point.y, 6, int(rift["normal_x"]), int(rift["normal_y"]))

func _restore_reality_rift(rift: Dictionary) -> void:
	if bool(rift.get("restored", false)):
		return
	for cell_value: Variant in rift.get("snapshot", []):
		var cell: Dictionary = cell_value
		var restored: bool = world.set_cell(int(cell["x"]), int(cell["y"]), int(cell["type"]), int(cell["life"]), {"crop_id": cell["crop_id"], "plant_id": cell["plant_id"], "reason": "reality-zipper-restore", "ignore_player": true})
		if restored:
			world.set_age(int(cell["x"]), int(cell["y"]), int(cell["age"]))
	rift["restored"] = true
	var midpoint_x: int = roundi((float(rift["start_x"]) + float(rift["end_x"])) * 0.5)
	var midpoint_y: int = roundi((float(rift["start_y"]) + float(rift["end_y"])) * 0.5)
	_spawn_reality_sparks(midpoint_x, midpoint_y, int(GameConfig.REALITY_ZIPPER["spark_count"]), int(rift["normal_x"]), int(rift["normal_y"]))

func _distance_to_reality_rift(rift: Dictionary, x: float, y: float) -> float:
	var a: Vector2 = Vector2(float(rift["start_x"]), float(rift["start_y"]))
	var b: Vector2 = Vector2(float(rift["end_x"]), float(rift["end_y"]))
	var ab: Vector2 = b - a
	var length_squared: float = maxf(1.0, ab.length_squared())
	var projection: float = clampf((Vector2(x, y) - a).dot(ab) / length_squared, 0.0, 1.0)
	return Vector2(x, y).distance_to(a + ab * projection)

func _rotate_reality_velocity(entity: Dictionary, angle: float) -> void:
	var velocity: Vector2 = Vector2(float(entity.get("vx", 0.0)), float(entity.get("vy", 0.0))).rotated(angle)
	entity["vx"] = velocity.x
	entity["vy"] = velocity.y

func _split_projectiles_at_rift(rift: Dictionary) -> void:
	if int(rift.get("split_count", 0)) >= int(GameConfig.REALITY_ZIPPER["projectile_split_limit"]):
		return
	var arrays: Array = [state.entities["bullets"], state.entities["napalm_shots"], state.entities["boss_fireballs"], state.entities["serpent_projectiles"], state.entities["boss_projectiles"]]
	for array_value: Variant in arrays:
		var array: Array = array_value
		var initial_length: int = array.size()
		for index: int in range(initial_length):
			if int(rift.get("split_count", 0)) >= int(GameConfig.REALITY_ZIPPER["projectile_split_limit"]):
				break
			var projectile: Dictionary = array[index]
			if not projectile.has("x") or not projectile.has("y") or not projectile.has("vx") or not projectile.has("vy"):
				continue
			if String(projectile.get("reality_split_id", "")) == String(rift["id"]):
				continue
			if _distance_to_reality_rift(rift, float(projectile["x"]), float(projectile["y"])) > 2.2:
				continue
			var clone: Dictionary = projectile.duplicate(true)
			projectile["reality_split_id"] = rift["id"]
			clone["reality_split_id"] = rift["id"]
			_rotate_reality_velocity(projectile, float(GameConfig.REALITY_ZIPPER["split_angle"]))
			_rotate_reality_velocity(clone, -float(GameConfig.REALITY_ZIPPER["split_angle"]))
			clone["x"] = roundi(float(clone["x"]) + float(int(rift["normal_x"]) * 2))
			clone["y"] = roundi(float(clone["y"]) + float(int(rift["normal_y"]) * 2))
			array.append(clone)
			rift["split_count"] = int(rift.get("split_count", 0)) + 1
			_spawn_reality_sparks(float(projectile["x"]), float(projectile["y"]), 10, int(rift["normal_x"]), int(rift["normal_y"]))

func _pulse_reality_field(rift: Dictionary) -> void:
	var polarity: int = 1 if floori(float(rift["age"]) / float(GameConfig.REALITY_ZIPPER["pulse_interval"])) % 2 == 0 else -1
	var radius: float = float(GameConfig.REALITY_ZIPPER["field_radius"])
	var force: float = float(GameConfig.REALITY_ZIPPER["gravity_force"]) * float(polarity)
	for chunk_value: Variant in state.world["active_chunks"]:
		var chunk: Dictionary = chunk_value
		for enemy_value: Variant in chunk["enemies"]:
			var enemy: Dictionary = enemy_value
			if float(enemy.get("hp", 0.0)) <= 0.0 or _distance_to_reality_rift(rift, float(enemy["x"]), float(enemy["y"])) > radius:
				continue
			enemy["hp"] = float(enemy["hp"]) - float(GameConfig.REALITY_ZIPPER["enemy_damage_per_pulse"])
			enemy["hit"] = max(5, int(enemy.get("hit", 0)))
			enemy["vx"] = float(enemy.get("vx", 0.0)) + float(rift["normal_x"]) * force
			enemy["vy"] = float(enemy.get("vy", 0.0)) - force * 1.4 + float(rift["normal_y"]) * force * 0.4
	for boss_value: Variant in state.entities["bosses"]:
		var boss: Dictionary = boss_value
		if float(boss.get("hp", 0.0)) <= 0.0 or _distance_to_reality_rift(rift, float(boss["x"]), float(boss["y"])) > radius + 4.0:
			continue
		boss["hp"] = float(boss["hp"]) - float(GameConfig.REALITY_ZIPPER["boss_damage_per_pulse"])
		boss["hit"] = max(4, int(boss.get("hit", 0)))
		boss["vx"] = float(boss.get("vx", 0.0)) + float(rift["normal_x"]) * force * 0.45
		boss["vy"] = float(boss.get("vy", 0.0)) - force * 0.55
	if not bool(state.player.get("locked", false)) and _distance_to_reality_rift(rift, float(state.player["x"]), float(state.player["y"]) - 2.0) < radius * 0.62:
		state.player["vx"] = float(state.player["vx"]) + float(rift["normal_x"]) * force * 0.45
		state.player["vy"] = float(state.player["vy"]) - force * 0.8
	var affected_arrays: Array = [
		state.entities["bullets"], state.entities["napalm_shots"], state.entities["glaives"], state.entities["grenades"],
		state.entities["nyan_cats"], state.entities["seed_particles"], state.entities["pickups"],
		state.entities["boss_fireballs"], state.entities["serpent_projectiles"], state.entities["boss_projectiles"],
	]
	for array_value: Variant in affected_arrays:
		for entity_value: Variant in (array_value as Array):
			var entity: Dictionary = entity_value
			if not entity.has("x") or not entity.has("y"):
				continue
			if _distance_to_reality_rift(rift, float(entity["x"]), float(entity["y"])) > radius:
				continue
			entity["vx"] = float(entity.get("vx", 0.0)) + float(rift["normal_x"]) * force * 0.75
			entity["vy"] = float(entity.get("vy", 0.0)) - force
	var points: Array = rift.get("points", [])
	var spark_point: Vector2i = Vector2i(int(rift["start_x"]), int(rift["start_y"]))
	if not points.is_empty():
		var point_index: int = (floori(float(rift["age"]) / float(GameConfig.REALITY_ZIPPER["pulse_interval"])) * 7) % points.size()
		spark_point = points[point_index]
	_spawn_reality_sparks(spark_point.x, spark_point.y, int(GameConfig.REALITY_ZIPPER["pulse_spark_count"]), int(rift["normal_x"]), int(rift["normal_y"]))

func _update_reality_sparks() -> void:
	var sparks: Array = state.entities["reality_sparks"]
	for index: int in range(sparks.size() - 1, -1, -1):
		var spark: Dictionary = sparks[index]
		spark["phase"] = float(spark.get("phase", 0.0)) + 0.42
		spark["x"] = float(spark["x"]) + float(spark["vx"]) + sin(float(spark["phase"])) * 0.08
		spark["y"] = float(spark["y"]) + float(spark["vy"]) + cos(float(spark["phase"]) * 0.77) * 0.08
		spark["vx"] = float(spark["vx"]) * 0.965
		spark["vy"] = float(spark["vy"]) * 0.965
		spark["life"] = int(spark["life"]) - 1
		if int(spark["life"]) <= 0:
			sparks.remove_at(index)

func close_reality_rifts() -> void:
	for rift_value: Variant in state.entities["reality_rifts"]:
		_restore_reality_rift(rift_value)
	(state.entities["reality_rifts"] as Array).clear()
	state.reality_zipper["active"] = false
	state.reality_zipper["phase"] = "idle"

func _update_reality_rifts() -> void:
	var rifts: Array = state.entities["reality_rifts"]
	for index: int in range(rifts.size() - 1, -1, -1):
		var rift: Dictionary = rifts[index]
		rift["age"] = int(rift.get("age", 0)) + 1
		rift["life"] = int(rift.get("life", 0)) - 1
		if not bool(rift.get("applied", false)):
			_open_reality_rift(rift)
		if int(rift["age"]) >= int(GameConfig.REALITY_ZIPPER["opening_frames"]) and int(rift["life"]) > int(GameConfig.REALITY_ZIPPER["closing_frames"]):
			rift["phase"] = "open"
		if int(rift["life"]) <= int(GameConfig.REALITY_ZIPPER["closing_frames"]):
			rift["phase"] = "closing"
			_restore_reality_rift(rift)
		if String(rift["phase"]) != "closing":
			_split_projectiles_at_rift(rift)
			if int(rift["age"]) % int(GameConfig.REALITY_ZIPPER["pulse_interval"]) == 0:
				_pulse_reality_field(rift)
		rift["pulse"] = float(rift.get("pulse", 0.0)) + 0.18
		if int(rift["life"]) <= 0:
			_restore_reality_rift(rift)
			rifts.remove_at(index)
	state.reality_zipper["active"] = not rifts.is_empty()
	state.reality_zipper["phase"] = String((rifts[0] as Dictionary).get("phase", "idle")) if not rifts.is_empty() else "idle"
	_update_reality_sparks()

func _update_explosions() -> void:
	var explosions: Array = state.entities["explosions"]
	for index: int in range(explosions.size() - 1, -1, -1):
		var explosion: Dictionary = explosions[index]
		explosion["frames"] = int(explosion["frames"]) - 1
		if int(explosion["frames"]) <= 0:
			explosions.remove_at(index)

func _ensure_glaive_is_clear(blade: Dictionary) -> void:
	var x: int = roundi(float(blade["x"]))
	var y: int = roundi(float(blade["y"]))
	if not world.is_solid(world.get_cell(x, y)):
		return
	var away_x: int = -1 if float(blade.get("vx", 1.0)) > 0.0 else 1
	var away_y: int = -1 if float(blade.get("vy", 0.0)) > 0.0 else 1 if float(blade.get("vy", 0.0)) < 0.0 else 0
	var candidates: Array[Vector2i] = [
		Vector2i(x + away_x, y), Vector2i(x, y + away_y), Vector2i(x + away_x, y + away_y),
		Vector2i(x - away_x, y), Vector2i(x, y - away_y), Vector2i(x - 1, y), Vector2i(x + 1, y), Vector2i(x, y - 1), Vector2i(x, y + 1),
	]
	for point: Vector2i in candidates:
		if not world.is_active_world_position(point.x, point.y) or world.is_solid(world.get_cell(point.x, point.y)):
			continue
		PixelGrid.place_on_pixel(blade, point.x, point.y)
		return

func _snap_projectile_positions() -> void:
	for key: String in ["napalm_shots", "bullets", "glaives", "grenades", "drones", "drone_rockets", "nyan_cats", "nyan_sparks", "reality_sparks", "explosions"]:
		for entity_value: Variant in state.entities[key]:
			var entity: Dictionary = entity_value
			PixelGrid.snap_pixel_position(entity)
			PixelGrid.snap_stored_coordinates(entity)
			if key == "glaives":
				_ensure_glaive_is_clear(entity)

func update() -> void:
	_update_napalm_shots()
	_update_bullets()
	_update_glaives()
	_update_grenades()
	_update_drones()
	_update_drone_rockets()
	_update_nyan()
	_update_nyan_sparks()
	_update_reality_rifts()
	_update_explosions()
	_snap_projectile_positions()
