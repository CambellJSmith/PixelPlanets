class_name PixelNoise
extends RefCounted

var seed: int

func _init(world_seed: int) -> void:
	seed = world_seed

func _imul_32(a: int, b: int) -> int:
	var value: int = (a & 0xffffffff) * (b & 0xffffffff)
	return value & 0xffffffff

func hash_value(a: int, b: int = 0, c: int = 0) -> int:
	var h: int = seed & 0xffffffff
	h = (h ^ _imul_32(a, 0x45d9f3b)) & 0xffffffff
	h = (h ^ _imul_32(b, 0x27d4eb2d)) & 0xffffffff
	h = (h ^ _imul_32(c, 0x165667b1)) & 0xffffffff
	h = (h ^ (h >> 16)) & 0xffffffff
	h = _imul_32(h, 0x7feb352d)
	h = (h ^ (h >> 15)) & 0xffffffff
	h = _imul_32(h, 0x846ca68b)
	h = (h ^ (h >> 16)) & 0xffffffff
	return h

func random_at(a: int, b: int = 0, c: int = 0) -> float:
	return float(hash_value(a, b, c)) / 4294967296.0

func _smooth(value: float) -> float:
	return value * value * (3.0 - 2.0 * value)

func noise_1d(x: float, scale: float, salt: int = 0) -> float:
	var scaled: float = x / scale
	var x0: int = floori(scaled)
	var fraction: float = scaled - float(x0)
	var first: float = random_at(x0, salt, 0)
	var second: float = random_at(x0 + 1, salt, 0)
	return lerpf(first, second, _smooth(fraction))

func noise_2d(x: float, y: float, scale: float, salt: int = 0) -> float:
	var sx: float = x / scale
	var sy: float = y / scale
	var x0: int = floori(sx)
	var y0: int = floori(sy)
	var tx: float = _smooth(sx - float(x0))
	var ty: float = _smooth(sy - float(y0))
	var a: float = random_at(x0, y0, salt)
	var b: float = random_at(x0 + 1, y0, salt)
	var c: float = random_at(x0, y0 + 1, salt)
	var d: float = random_at(x0 + 1, y0 + 1, salt)
	return lerpf(lerpf(a, b, tx), lerpf(c, d, tx), ty)
