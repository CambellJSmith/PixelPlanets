class_name WorldPopulation
extends RefCounted

static func populate(world: WorldModel, chunk: Dictionary) -> void:
	_generate_biome_features(world, chunk)
	_generate_underground_mushrooms(world, chunk)
	for descriptor: Dictionary in StructureData.descriptors_for_chunk(chunk, world):
		StructureData.apply(chunk, descriptor)
	_generate_fauna(world, chunk)

static func _put(world: WorldModel, chunk: Dictionary, world_x: int, world_y: int, material_id: int) -> void:
	var local_x: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var local_y: int = world_y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	if local_x < 0 or local_y < 0 or local_x >= GameConfig.WORLD_WIDTH or local_y >= GameConfig.WORLD_HEIGHT:
		return
	var cells: PackedByteArray = chunk["cells"]
	var index: int = local_x + local_y * GameConfig.WORLD_WIDTH
	if cells[index] == GameData.AIR:
		cells[index] = material_id

static func _generate_biome_features(world: WorldModel, chunk: Dictionary) -> void:
	if int(chunk["y"]) != 0 or String(world.state.world["dimension"]) != "earth":
		return
	var start_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH - 40
	var end_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH + GameConfig.WORLD_WIDTH + 40
	for world_x: int in range(start_x, end_x):
		var surface: Dictionary = world.surface_at(world_x)
		var swamp_weight: float = world.biome_weight(surface["mix"], GameData.SWAMP)
		if swamp_weight > 0.45 and bool(surface["lake"]) and world.noise.random_at(world_x, 0, 610) > 0.93:
			var height: int = 2 + floori(world.noise.random_at(world_x, 1, 611) * 4.0)
			for rise: int in range(1, height + 1):
				_put(world, chunk, world_x, int(surface["water"]) - rise, GameData.BAMBOO)

static func _generate_underground_mushrooms(world: WorldModel, chunk: Dictionary) -> void:
	if int(chunk["y"]) < 0 or String(world.state.world["dimension"]) != "earth":
		return
	var chunk_top: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	var chunk_bottom: int = chunk_top + GameConfig.WORLD_HEIGHT
	var first: int = floori(float(int(chunk["x"]) * GameConfig.WORLD_WIDTH - 18) / 8.0)
	var last: int = floori(float(int(chunk["x"]) * GameConfig.WORLD_WIDTH + GameConfig.WORLD_WIDTH + 18) / 8.0)
	var cells: PackedByteArray = chunk["cells"]
	for slot: int in range(first, last + 1):
		var world_x: int = slot * 8 + 2 + floori(world.noise.random_at(slot, 12, 1810) * 5.0)
		var local_x: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
		if local_x < 0 or local_x >= GameConfig.WORLD_WIDTH:
			continue
		var surface: Dictionary = world.surface_at(world_x)
		var scan_start: int = maxi(chunk_top + 3, int(surface["ground"]) + 28)
		var scan_end: int = mini(chunk_bottom - 15, chunk_bottom - 3)
		for world_y: int in range(scan_start, scan_end):
			var local_y: int = world_y - chunk_top
			if local_y < 1 or local_y >= GameConfig.WORLD_HEIGHT - 1:
				continue
			if cells[local_x + local_y * GameConfig.WORLD_WIDTH] != GameData.AIR:
				continue
			if cells[local_x + (local_y + 1) * GameConfig.WORLD_WIDTH] != GameData.MYCELIUM:
				continue
			var strength: float = world.mushroom_strength_at(world_x, world_y)
			if strength < 0.48 or world.noise.random_at(world_x, world_y, 1811) > 0.28 * strength:
				continue
			var big: bool = world.noise.random_at(world_x, world_y, 1812) < 0.2 * strength
			var height: int = 8 + floori(world.noise.random_at(world_x, world_y, 1813) * 8.0) if big else 2 + floori(world.noise.random_at(world_x, world_y, 1814) * 4.0)
			var stem_width: int = 2 if big and world.noise.random_at(world_x, world_y, 1815) > 0.45 else 1
			for stem_x: int in range(stem_width):
				for rise: int in range(height):
					_put(world, chunk, world_x + stem_x, world_y - rise, GameData.MUSHROOM_STEM)
			var cap_y: int = world_y - height
			var radius: int = 5 + floori(world.noise.random_at(world_x, world_y, 1816) * 3.0) if big else 2
			var vertical_radius: int = maxi(2, floori(radius * 0.55)) if big else 1
			var center_x: float = world_x + float(stem_width - 1) * 0.5
			for oy: int in range(-vertical_radius, vertical_radius + 1):
				for ox: int in range(-radius, radius + 1):
					var normalized: float = float(ox * ox) / float(radius * radius) + float(oy * oy) / float(vertical_radius * vertical_radius)
					var underside: bool = oy > 0 and absf(ox) > radius * 0.68
					if normalized <= 1.0 and not underside and world.noise.random_at(world_x + ox, cap_y + oy, 1817) > 0.08:
						_put(world, chunk, roundi(center_x + ox), cap_y + oy, GameData.MUSHROOM_CAP)
			break

static func _weighted_fauna(world: WorldModel, candidates: Array[Dictionary], a: int, b: int, salt: int) -> Dictionary:
	if candidates.is_empty():
		return {}
	var total: float = 0.0
	for candidate: Dictionary in candidates:
		total += float(candidate.get("spawn_weight", 1.0))
	var roll: float = world.noise.random_at(a, b, salt) * total
	for candidate: Dictionary in candidates:
		roll -= float(candidate.get("spawn_weight", 1.0))
		if roll <= 0.0:
			return candidate
	return candidates[candidates.size() - 1]

static func _creature_at(world: WorldModel, species: Dictionary, x: int, y: int, salt: int) -> Dictionary:
	return {
		"species_id": String(species["id"]), "x": x, "y": y, "vx": 0.0, "vy": 0.0,
		"move_carry_x": 0.0, "move_carry_y": 0.0, "hp": float(species["hp"]), "max_hp": float(species["hp"]),
		"phase": world.noise.random_at(x, y, salt) * TAU, "animation_offset": floori(world.noise.random_at(y, x, salt + 1) * 240.0),
		"facing": -1 if world.noise.random_at(x, y, salt + 2) < 0.5 else 1, "hit": 0, "burning": 0,
		"attack_cooldown": 0, "hop_cooldown": 20 + floori(world.noise.random_at(x, y, salt + 3) * 90.0),
		"idle_timer": 20 + floori(world.noise.random_at(y, x, salt + 4) * 120.0), "startled": 0,
	}

static func _surface_spawn_position(world: WorldModel, chunk: Dictionary, species: Dictionary, slot: int, salt: int) -> Dictionary:
	var min_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH + 5
	var max_x: int = (int(chunk["x"]) + 1) * GameConfig.WORLD_WIDTH - 6
	var cells: PackedByteArray = chunk["cells"]
	for attempt: int in range(48):
		var world_x: int = min_x + floori(world.noise.random_at(int(chunk["x"]) * 431 + slot * 17 + attempt, salt, 7301) * float(max_x - min_x + 1))
		var surface: Dictionary = world.surface_at(world_x)
		if not (species["biomes"] as Array).has(int(surface["biome"])):
			continue
		var habitat: String = String(species["habitat"])
		if habitat == "water":
			if not bool(surface["lake"]) or int(surface["ground"]) - int(surface["water"]) < 4:
				continue
			var min_y: int = int(surface["water"]) + 1
			var max_y: int = int(surface["ground"]) - 2
			if max_y < min_y:
				continue
			var world_y: int = min_y + floori(world.noise.random_at(world_x, attempt, salt + 1) * float(max_y - min_y + 1))
			var lx: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
			var ly: int = world_y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
			if lx > 0 and lx < GameConfig.WORLD_WIDTH - 1 and ly > 0 and ly < GameConfig.WORLD_HEIGHT - 1 and cells[lx + ly * GameConfig.WORLD_WIDTH] == GameData.WATER:
				return {"x": world_x, "y": world_y}
		elif habitat == "air":
			var ceiling: int = maxi(5, (int(surface["water"]) if bool(surface["lake"]) else int(surface["ground"])) - 4)
			var world_y: int = maxi(5, ceiling - 3 - floori(world.noise.random_at(world_x, attempt, salt + 2) * 18.0))
			var lx: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
			var ly: int = world_y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
			if lx > 1 and lx < GameConfig.WORLD_WIDTH - 2 and ly > 1 and ly < GameConfig.WORLD_HEIGHT - 2 and cells[lx + ly * GameConfig.WORLD_WIDTH] == GameData.AIR and cells[lx + (ly + 1) * GameConfig.WORLD_WIDTH] == GameData.AIR:
				return {"x": world_x, "y": world_y}
		else:
			var world_y: int = int(surface["ground"]) - 1
			var lx: int = world_x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
			var ly: int = world_y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
			if lx > 1 and lx < GameConfig.WORLD_WIDTH - 2 and ly > 1 and ly < GameConfig.WORLD_HEIGHT - 2:
				var body: int = cells[lx + ly * GameConfig.WORLD_WIDTH]
				var head: int = cells[lx + (ly - 1) * GameConfig.WORLD_WIDTH]
				var support: int = cells[lx + (ly + 1) * GameConfig.WORLD_WIDTH]
				if body == GameData.AIR and head == GameData.AIR and support not in [GameData.AIR, GameData.WATER, GameData.LAVA]:
					return {"x": world_x, "y": world_y}
	return {}

static func _cave_spawn_position(world: WorldModel, chunk: Dictionary, species: Dictionary, slot: int, salt: int) -> Dictionary:
	var cells: PackedByteArray = chunk["cells"]
	for attempt: int in range(120):
		var lx: int = 4 + floori(world.noise.random_at(int(chunk["x"]) * 613 + slot * 19 + attempt, int(chunk["y"]) * 127 + salt, 7401) * float(GameConfig.WORLD_WIDTH - 8))
		var ly: int = 4 + floori(world.noise.random_at(int(chunk["y"]) * 557 + slot * 23 + attempt, int(chunk["x"]) * 109 + salt, 7402) * float(GameConfig.WORLD_HEIGHT - 8))
		var world_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH + lx
		var world_y: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT + ly
		if not (species["underground_biomes"] as Array).has(world.underground_biome_id_at(world_x, world_y)) or cells[lx + ly * GameConfig.WORLD_WIDTH] != GameData.AIR:
			continue
		if String(species["habitat"]) == "cave_air":
			if cells[lx + (ly - 1) * GameConfig.WORLD_WIDTH] == GameData.AIR and cells[lx + (ly + 1) * GameConfig.WORLD_WIDTH] == GameData.AIR:
				return {"x": world_x, "y": world_y}
		else:
			var support: int = cells[lx + (ly + 1) * GameConfig.WORLD_WIDTH]
			if support not in [GameData.AIR, GameData.WATER, GameData.LAVA]:
				return {"x": world_x, "y": world_y}
	return {}

static func _generate_fauna(world: WorldModel, chunk: Dictionary) -> void:
	if int(chunk["y"]) < 0 or String(world.state.world["dimension"]) != "earth":
		return
	var surface_chunk: bool = int(chunk["y"]) == 0
	var center_y: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT + floori(GameConfig.WORLD_HEIGHT * 0.5)
	var target_count: int = 5 + floori(world.noise.random_at(int(chunk["x"]), int(chunk["y"]), 7501) * 7.0) if surface_chunk else 4 + floori(world.noise.random_at(int(chunk["x"]), int(chunk["y"]), 7502) * 6.0)
	var spawned: int = 0
	var enemies: Array = chunk["enemies"]
	for slot: int in range(target_count * 3):
		if spawned >= target_count:
			break
		var sample_x: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH + 8 + floori(world.noise.random_at(int(chunk["x"]) * 83 + slot, int(chunk["y"]), 7503) * float(GameConfig.WORLD_WIDTH - 16))
		var candidates: Array[Dictionary] = FaunaData.for_surface_biome(world.biome_id_at(sample_x)) if surface_chunk else FaunaData.for_underground_biome(world.underground_biome_id_at(sample_x, center_y))
		var species: Dictionary = _weighted_fauna(world, candidates, int(chunk["x"]) * 97 + slot, int(chunk["y"]) * 131, 7504)
		if species.is_empty():
			continue
		var group_min: int = int(species.get("group_min", 1))
		var group_max: int = int(species.get("group_max", 1))
		var group_size: int = clampi(group_min + floori(world.noise.random_at(slot, int(chunk["x"]) + int(chunk["y"]), 7505) * float(group_max - group_min + 1)), 1, group_max)
		for member: int in range(group_size):
			if spawned >= target_count:
				break
			var position: Dictionary = _surface_spawn_position(world, chunk, species, slot * 11 + member, 7600 + member) if surface_chunk else _cave_spawn_position(world, chunk, species, slot * 11 + member, 7700 + member)
			if position.is_empty():
				continue
			var occupied: bool = false
			for enemy: Dictionary in enemies:
				if Vector2(float(enemy["x"]) - float(position["x"]), float(enemy["y"]) - float(position["y"])).length_squared() < 9.0:
					occupied = true
					break
			if occupied:
				continue
			enemies.append(_creature_at(world, species, int(position["x"]), int(position["y"]), 7800 + slot * 17 + member))
			spawned += 1
