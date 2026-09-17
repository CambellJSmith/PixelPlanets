class_name StructureData
extends RefCounted

const MOON_LANDING_X: int = 48
const STRUCTURE_SPACING: int = 280
const UNDERGROUND_STRUCTURE_SPACING: int = 360

static func rocket_silo_descriptor(world: WorldModel) -> Dictionary:
	var center: int = 220 + floori(world.noise.random_at(0, 0, 9601) * 90.0)
	var surface: Dictionary = world.surface_at(center)
	var chamber_top: int = int(surface["ground"]) + 18
	var chamber_bottom: int = int(surface["ground"]) + 40
	return {"id":"rocket_silo","unique":true,"center_x":center,"surface_y":int(surface["ground"]),"shaft_top":int(surface["ground"])-2,"shaft_bottom":chamber_top,"chamber_top":chamber_top,"chamber_bottom":chamber_bottom,"launch_pad_y":chamber_bottom-4,"launch_zone":Rect2i(center, chamber_bottom-5, 5, 6)}

static func _chunk_intersects(chunk: Dictionary, x0: int, y0: int, x1: int, y1: int) -> bool:
	var left: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var top: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	var right: int = left + GameConfig.WORLD_WIDTH - 1
	var bottom: int = top + GameConfig.WORLD_HEIGHT - 1
	return not (x1 < left or x0 > right or y1 < top or y0 > bottom)

static func descriptors_for_chunk(chunk: Dictionary, world: WorldModel) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var chunk_left: int = int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var chunk_right: int = chunk_left + GameConfig.WORLD_WIDTH - 1
	var chunk_top: int = int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	var dimension: String = String(world.state.world["dimension"])
	if dimension == "moon":
		if int(chunk["y"]) == 0:
			var landing: Dictionary = {"id":"moon_outpost","center_x":140,"surface_y":int(world.surface_at(140)["ground"])}
			if _chunk_intersects(chunk, 118, int(landing["surface_y"])-18, 162, int(landing["surface_y"])+4): results.append(landing)
			var first_slot: int = floori(float(chunk_left - 120) / 720.0)
			var last_slot: int = floori(float(chunk_right + 120) / 720.0)
			for slot: int in range(first_slot, last_slot + 1):
				if slot == 0: continue
				var center_x: int = slot * 720 + 180 + floori(world.noise.random_at(slot, 9, 9291) * 300.0)
				var surface_y: int = int(world.surface_at(center_x)["ground"])
				results.append({"id":"moon_outpost" if world.noise.random_at(slot,10,9292) > 0.55 else "lunar_monolith","center_x":center_x,"surface_y":surface_y})
		return results
	if dimension != "earth":
		if int(chunk["y"]) == 0:
			var definition: Dictionary = GameData.dimension(dimension)
			var spacing: int = 560
			var first_slot: int = floori(float(chunk_left - 120) / spacing)
			var last_slot: int = floori(float(chunk_right + 120) / spacing)
			for slot: int in range(first_slot, last_slot + 1):
				var center_x: int = slot * spacing + 120 + floori(world.noise.random_at(slot, dimension.length(), 9298) * 260.0)
				if slot == 0 or world.noise.random_at(slot, 11, 9299) > 0.48:
					results.append({"id":String(definition["structure"]),"center_x":center_x,"surface_y":int(world.surface_at(center_x)["ground"]),"dimension":dimension})
		return results
	var rocket: Dictionary = rocket_silo_descriptor(world)
	if _chunk_intersects(chunk, int(rocket["center_x"])-18, int(rocket["surface_y"])-10, int(rocket["center_x"])+18, int(rocket["chamber_bottom"])+4): results.append(rocket)
	if int(chunk["y"]) == 0:
		var first_slot: int = floori(float(chunk_left - 100) / STRUCTURE_SPACING)
		var last_slot: int = floori(float(chunk_right + 100) / STRUCTURE_SPACING)
		for slot: int in range(first_slot, last_slot + 1):
			var center_x: int = slot * STRUCTURE_SPACING + 80 + floori(world.noise.random_at(slot,0,9201) * 120.0)
			var surface: Dictionary = world.surface_at(center_x)
			if bool(surface["ocean"]) or (bool(surface["lake"]) and int(surface["ground"]) - int(surface["water"]) > 8):
				if bool(surface["ocean"]) and world.noise.random_at(slot,1,9203) > 0.52: results.append({"id":"lighthouse","center_x":center_x,"surface_y":int(surface["ground"]),"biome":world.biome_id_at(center_x)})
				continue
			if abs(int(world.surface_at(center_x-8)["ground"]) - int(world.surface_at(center_x+8)["ground"])) > 6 or world.noise.random_at(slot,2,9204) < 0.38: continue
			var biome: int = world.biome_id_at(center_x)
			var structure_id: String = "stone_arch"
			match biome:
				GameData.PLAINS: structure_id = "ruined_well" if world.noise.random_at(slot,3,9205) < 0.5 else "stone_arch"
				GameData.SNOW_PEAKS: structure_id = "snow_temple"
				GameData.BAMBOO_GROVE: structure_id = "bamboo_shrine"
				GameData.SWAMP: structure_id = "swamp_hut"
				GameData.VOLCANO: structure_id = "ash_forge"
				GameData.GIANT_FOREST: structure_id = "tree_house" if world.noise.random_at(slot,4,9206) < 0.5 else "forest_tower"
				GameData.OCEAN: structure_id = "lighthouse"
			results.append({"id":structure_id,"center_x":center_x,"surface_y":int(surface["ground"]),"biome":biome})
	if int(chunk["y"]) >= 1:
		var first_slot: int = floori(float(chunk_left - 120) / UNDERGROUND_STRUCTURE_SPACING)
		var last_slot: int = floori(float(chunk_right + 120) / UNDERGROUND_STRUCTURE_SPACING)
		for slot: int in range(first_slot, last_slot + 1):
			var center_x: int = slot * UNDERGROUND_STRUCTURE_SPACING + 120 + floori(world.noise.random_at(slot,0,9202) * 100.0)
			var center_y: int = chunk_top + floori(GameConfig.WORLD_HEIGHT * 0.5)
			var depth: int = center_y - int(world.surface_at(center_x)["ground"])
			if depth < 18 or world.noise.random_at(slot,int(chunk["y"]),9210) < 0.55: continue
			var structure_id: String = "mine_shaft"
			if depth > 54 and world.noise.random_at(slot,int(chunk["y"]),9211) < 0.35: structure_id = "crystal_vault"
			elif depth > 34 and world.noise.random_at(slot,int(chunk["y"]),9212) < 0.33: structure_id = "mushroom_hamlet"
			elif depth > 26 and world.noise.random_at(slot,int(chunk["y"]),9213) < 0.28: structure_id = "buried_library"
			results.append({"id":structure_id,"center_x":center_x,"center_y":center_y,"depth":depth})
	return results

static func _set(chunk: Dictionary, x: int, y: int, material: int) -> void:
	var local_x: int = x - int(chunk["x"]) * GameConfig.WORLD_WIDTH
	var local_y: int = y - int(chunk["y"]) * GameConfig.WORLD_HEIGHT
	if local_x < 0 or local_y < 0 or local_x >= GameConfig.WORLD_WIDTH or local_y >= GameConfig.WORLD_HEIGHT: return
	(chunk["cells"] as PackedByteArray)[local_x + local_y * GameConfig.WORLD_WIDTH] = material

static func _fill(chunk: Dictionary, x0: int, y0: int, x1: int, y1: int, material: int) -> void:
	for y: int in range(mini(y0,y1), maxi(y0,y1)+1):
		for x: int in range(mini(x0,x1), maxi(x0,x1)+1): _set(chunk,x,y,material)

static func _frame(chunk: Dictionary, x0: int, y0: int, x1: int, y1: int, material: int) -> void:
	for x: int in range(mini(x0,x1), maxi(x0,x1)+1): _set(chunk,x,mini(y0,y1),material); _set(chunk,x,maxi(y0,y1),material)
	for y: int in range(mini(y0,y1), maxi(y0,y1)+1): _set(chunk,mini(x0,x1),y,material); _set(chunk,maxi(x0,x1),y,material)

static func apply(chunk: Dictionary, d: Dictionary) -> void:
	var cx: int = roundi(float(d["center_x"])); var id: String = String(d["id"])
	if id == "rocket_silo":
		var top: int = int(d["shaft_top"]); var pad: int = int(d["launch_pad_y"]); _frame(chunk,cx-3,top-3,cx+3,top,GameData.ROCK); _fill(chunk,cx-2,top-2,cx+2,pad+1,GameData.AIR); _frame(chunk,cx-3,top,cx+3,pad+1,GameData.ROCK); _fill(chunk,cx-9,int(d["chamber_top"]),cx+9,int(d["chamber_bottom"]),GameData.AIR); _frame(chunk,cx-10,int(d["chamber_top"])-1,cx+10,int(d["chamber_bottom"])+1,GameData.ROCK); _fill(chunk,cx-6,pad+1,cx+6,int(d["chamber_bottom"])+1,GameData.ROCK); _fill(chunk,cx-5,pad-7,cx+5,pad,GameData.AIR); _fill(chunk,cx-1,pad-6,cx+1,pad-1,GameData.WOOD); _fill(chunk,cx-2,pad-7,cx+2,pad-7,GameData.CRYSTAL); _fill(chunk,cx-3,pad+1,cx+3,pad+1,GameData.CRYSTAL); return
	var sy: int = int(d.get("surface_y",0))
	match id:
		"moon_outpost": _fill(chunk,cx-18,sy-1,cx+18,sy+1,GameData.CRYSTAL); _frame(chunk,cx-11,sy-12,cx+11,sy-1,GameData.ROCK); _fill(chunk,cx-10,sy-11,cx+10,sy-2,GameData.AIR); _fill(chunk,cx-3,sy-9,cx+3,sy-4,GameData.CRYSTAL)
		"lunar_monolith": _fill(chunk,cx-2,sy-17,cx+2,sy,GameData.ROCK); _fill(chunk,cx-1,sy-15,cx+1,sy-2,GameData.CRYSTAL); _fill(chunk,cx-7,sy-1,cx+7,sy+1,GameData.SAND)
		"ember_fortress": _frame(chunk,cx-13,sy-12,cx+13,sy,GameData.ROCK); _fill(chunk,cx-11,sy-10,cx+11,sy-1,GameData.AIR); _fill(chunk,cx-7,sy-2,cx+7,sy-1,GameData.LAVA); _fill(chunk,cx-2,sy-16,cx+2,sy-11,GameData.ASH)
		"ice_cathedral": _frame(chunk,cx-14,sy-13,cx+14,sy,GameData.CRYSTAL); _fill(chunk,cx-12,sy-11,cx+12,sy-1,GameData.AIR); _fill(chunk,cx-4,sy-18,cx+4,sy-13,GameData.SNOW)
		"prism_spire":
			for layer: int in range(20):
				var width: int = maxi(1,5-floori(layer/4.0))
				_fill(chunk,cx-width,sy-layer,cx+width,sy-layer,GameData.CRYSTAL)
			_fill(chunk,cx-9,sy-1,cx+9,sy+1,GameData.CRYSTAL)
		"drowned_dome": _frame(chunk,cx-14,sy-12,cx+14,sy,GameData.CRYSTAL); _fill(chunk,cx-12,sy-10,cx+12,sy-1,GameData.AIR); _fill(chunk,cx-5,sy-3,cx+5,sy-1,GameData.WOOD)
		"living_temple": _fill(chunk,cx-12,sy-9,cx-9,sy,GameData.WOOD); _fill(chunk,cx+9,sy-9,cx+12,sy,GameData.WOOD); _fill(chunk,cx-12,sy-12,cx+12,sy-9,GameData.LEAF); _fill(chunk,cx-8,sy-8,cx+8,sy-1,GameData.AIR); _fill(chunk,cx-2,sy-6,cx+2,sy-1,GameData.MYCELIUM)
		"gear_tower": _frame(chunk,cx-10,sy-16,cx+10,sy,GameData.ROCK); _fill(chunk,cx-8,sy-14,cx+8,sy-1,GameData.AIR); _fill(chunk,cx-2,sy-21,cx+2,sy-16,GameData.CRYSTAL)
		"impossible_house": _frame(chunk,cx-12,sy-9,cx+8,sy,GameData.MUSHROOM_CAP); _fill(chunk,cx-10,sy-7,cx+6,sy-1,GameData.AIR); _frame(chunk,cx-5,sy-16,cx+13,sy-8,GameData.MYCELIUM); _fill(chunk,cx-3,sy-14,cx+11,sy-9,GameData.AIR); _fill(chunk,cx-1,sy-5,cx+2,sy-1,GameData.CRYSTAL)
		"cloud_shrine": _fill(chunk,cx-15,sy-1,cx+15,sy+1,GameData.SNOW); _fill(chunk,cx-8,sy-8,cx-6,sy-2,GameData.CRYSTAL); _fill(chunk,cx+6,sy-8,cx+8,sy-2,GameData.CRYSTAL); _fill(chunk,cx-8,sy-10,cx+8,sy-8,GameData.SNOW); _fill(chunk,cx-5,sy-7,cx+5,sy-2,GameData.AIR)
		"glitch_obelisk":
			for y: int in range(19):
				var offset: int = 2 if y % 4 == 0 else 0
				_fill(chunk,cx-3+offset,sy-y,cx+3+offset,sy-y,GameData.CRYSTAL if y%3==0 else GameData.MYCELIUM)
			_fill(chunk,cx-10,sy-1,cx+10,sy+1,GameData.ASH)
		"ruined_well": _frame(chunk,cx-5,sy-6,cx+5,sy,GameData.ROCK); _fill(chunk,cx-4,sy-5,cx+4,sy-1,GameData.AIR); _fill(chunk,cx-2,sy-1,cx+2,sy+2,GameData.WATER)
		"stone_arch": _fill(chunk,cx-8,sy-7,cx-6,sy,GameData.ROCK); _fill(chunk,cx+6,sy-7,cx+8,sy,GameData.ROCK); _fill(chunk,cx-8,sy-9,cx+8,sy-7,GameData.ROCK); _fill(chunk,cx-5,sy-6,cx+5,sy-1,GameData.AIR)
		"snow_temple": _frame(chunk,cx-9,sy-10,cx+9,sy,GameData.CRYSTAL); _fill(chunk,cx-8,sy-9,cx+8,sy-1,GameData.AIR); _fill(chunk,cx-10,sy,cx+10,sy+1,GameData.SNOW); _fill(chunk,cx-2,sy-4,cx+2,sy-1,GameData.CRYSTAL)
		"bamboo_shrine": _fill(chunk,cx-8,sy-1,cx+8,sy,GameData.BAMBOO); _fill(chunk,cx-7,sy-8,cx-6,sy-2,GameData.BAMBOO); _fill(chunk,cx+6,sy-8,cx+7,sy-2,GameData.BAMBOO); _fill(chunk,cx-8,sy-9,cx+8,sy-8,GameData.BAMBOO); _fill(chunk,cx-5,sy-6,cx+5,sy-5,GameData.LEAF); _fill(chunk,cx-4,sy-4,cx+4,sy-1,GameData.AIR)
		"swamp_hut": _fill(chunk,cx-7,sy-4,cx+7,sy-1,GameData.WOOD); _fill(chunk,cx-9,sy-1,cx-8,sy+3,GameData.WOOD); _fill(chunk,cx+8,sy-1,cx+9,sy+3,GameData.WOOD); _fill(chunk,cx-7,sy-7,cx+7,sy-5,GameData.LEAF); _fill(chunk,cx-5,sy-3,cx+5,sy-2,GameData.AIR)
		"ash_forge": _frame(chunk,cx-9,sy-7,cx+9,sy,GameData.ROCK); _fill(chunk,cx-8,sy-6,cx+8,sy-1,GameData.AIR); _fill(chunk,cx-4,sy-2,cx+4,sy-1,GameData.LAVA); _fill(chunk,cx-10,sy,cx+10,sy+1,GameData.ASH)
		"tree_house": _fill(chunk,cx-1,sy-18,cx+1,sy,GameData.WOOD); _fill(chunk,cx-6,sy-15,cx+6,sy-10,GameData.WOOD); _fill(chunk,cx-5,sy-14,cx+5,sy-11,GameData.AIR); _fill(chunk,cx-8,sy-18,cx+8,sy-16,GameData.LEAF)
		"forest_tower": _fill(chunk,cx-2,sy-16,cx+2,sy,GameData.WOOD); _fill(chunk,cx-7,sy-16,cx+7,sy-14,GameData.WOOD); _fill(chunk,cx-7,sy-9,cx+7,sy-7,GameData.WOOD); _fill(chunk,cx-6,sy-15,cx+6,sy-8,GameData.AIR)
		"lighthouse": _fill(chunk,cx-3,sy-17,cx+3,sy,GameData.ROCK); _fill(chunk,cx-5,sy-19,cx+5,sy-17,GameData.WOOD); _fill(chunk,cx-2,sy-16,cx+2,sy-1,GameData.AIR); _fill(chunk,cx-2,sy-18,cx+2,sy-18,GameData.CRYSTAL)
		"mine_shaft", "crystal_vault", "mushroom_hamlet", "buried_library":
			var cy: int = roundi(float(d["center_y"])); _fill(chunk,cx-12,cy-6,cx+12,cy+6,GameData.AIR)
			if id == "mine_shaft": _frame(chunk,cx-11,cy-6,cx+11,cy+6,GameData.WOOD); _fill(chunk,cx-7,cy,cx+7,cy+1,GameData.ROCK)
			elif id == "crystal_vault": _frame(chunk,cx-13,cy-7,cx+13,cy+7,GameData.ROCK); _fill(chunk,cx-5,cy-2,cx+5,cy+2,GameData.CRYSTAL)
			elif id == "mushroom_hamlet": _frame(chunk,cx-15,cy-7,cx+15,cy+7,GameData.MYCELIUM); _fill(chunk,cx-10,cy+1,cx-4,cy+5,GameData.MUSHROOM_STEM); _fill(chunk,cx-12,cy-1,cx-2,cy+1,GameData.MUSHROOM_CAP); _fill(chunk,cx+4,cy+1,cx+10,cy+5,GameData.MUSHROOM_STEM); _fill(chunk,cx+2,cy-1,cx+12,cy+1,GameData.MUSHROOM_CAP)
			else: _frame(chunk,cx-14,cy-6,cx+14,cy+6,GameData.ROCK); _fill(chunk,cx-11,cy-4,cx-9,cy+3,GameData.WOOD); _fill(chunk,cx+9,cy-4,cx+11,cy+3,GameData.WOOD); _fill(chunk,cx-7,cy+2,cx+7,cy+3,GameData.WOOD); _fill(chunk,cx-2,cy-2,cx+2,cy+1,GameData.CRYSTAL)
