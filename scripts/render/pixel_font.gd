class_name PixelFont
extends RefCounted

const GLYPHS: Dictionary = {
	" ":[0,0,0,0,0],
	"A":[2,5,7,5,5], "B":[6,5,6,5,6], "C":[3,4,4,4,3], "D":[6,5,5,5,6],
	"E":[7,4,6,4,7], "F":[7,4,6,4,4], "G":[3,4,5,5,3], "H":[5,5,7,5,5],
	"I":[7,2,2,2,7], "J":[1,1,1,5,2], "K":[5,5,6,5,5], "L":[4,4,4,4,7],
	"M":[5,7,7,5,5], "N":[5,7,7,7,5], "O":[2,5,5,5,2], "P":[6,5,6,4,4],
	"Q":[2,5,5,3,1], "R":[6,5,6,5,5], "S":[3,4,2,1,6], "T":[7,2,2,2,2],
	"U":[5,5,5,5,7], "V":[5,5,5,5,2], "W":[5,5,7,7,5], "X":[5,5,2,5,5],
	"Y":[5,5,2,2,2], "Z":[7,1,2,4,7],
	"0":[7,5,5,5,7], "1":[2,6,2,2,7], "2":[6,1,7,4,7], "3":[6,1,3,1,6],
	"4":[5,5,7,1,1], "5":[7,4,6,1,6], "6":[3,4,7,5,7], "7":[7,1,2,2,2],
	"8":[7,5,7,5,7], "9":[7,5,7,1,6],
	".":[0,0,0,0,2], ",":[0,0,0,2,4], ":":[0,2,0,2,0], ";":[0,2,0,2,4],
	"!":[2,2,2,0,2], "?":[6,1,2,0,2], "-":[0,0,7,0,0], "+":[0,2,7,2,0],
	"/":[1,1,2,4,4], "\\":[4,4,2,1,1], "(":[1,2,2,2,1], ")":[4,2,2,2,4],
	"[":[3,2,2,2,3], "]":[6,2,2,2,6], "<":[1,2,4,2,1], ">":[4,2,1,2,4],
	"=":[0,7,0,7,0], "_":[0,0,0,0,7], "%":[5,1,2,4,5], "#":[5,7,5,7,5],
	"*":[0,5,2,5,0], "'":[2,2,0,0,0], "\"":[5,5,0,0,0], "|":[2,2,2,2,2],
}

static func text_width(text: String, scale: int = 1, spacing: int = 1) -> int:
	if text.is_empty():
		return 0
	return text.length() * (3 * scale + spacing) - spacing

static func draw(image: Image, text: String, x: int, y: int, color: Color, scale: int = 1, spacing: int = 1, max_width: int = 2147483647) -> int:
	var cursor: int = x
	var pixel_scale: int = max(1, scale)
	var gap: int = max(0, spacing)
	for raw_character: String in text.to_upper():
		var character: String = " " if raw_character == "\n" else raw_character
		if cursor + 3 * pixel_scale > x + max_width:
			break
		var rows: Array = GLYPHS.get(character, GLYPHS["?"])
		for row: int in range(5):
			var bits: int = int(rows[row])
			for column: int in range(3):
				if (bits & (1 << (2 - column))) == 0:
					continue
				for oy: int in range(pixel_scale):
					for ox: int in range(pixel_scale):
						var px: int = cursor + column * pixel_scale + ox
						var py: int = y + row * pixel_scale + oy
						if px >= 0 and py >= 0 and px < image.get_width() and py < image.get_height():
							image.set_pixel(px, py, color)
		cursor += 3 * pixel_scale + gap
	return cursor - x
