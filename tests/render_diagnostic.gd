extends SceneTree

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var packed_scene: PackedScene = load("res://main.tscn") as PackedScene
	if packed_scene == null:
		push_error("RENDER_DIAGNOSTIC: main scene failed to load")
		quit(1)
		return
	var game: Node = packed_scene.instantiate()
	root.add_child(game)
	await process_frame
	await process_frame
	var display: TextureRect = game.get_node("Display") as TextureRect
	var renderer: PixelRenderer = game.get("renderer") as PixelRenderer
	if display == null or renderer == null:
		push_error("RENDER_DIAGNOSTIC: display or renderer missing")
		quit(1)
		return
	if display.texture == null:
		push_error("RENDER_DIAGNOSTIC: display texture is null")
		quit(1)
		return
	var image: Image = renderer.image
	if image == null or image.is_empty():
		push_error("RENDER_DIAGNOSTIC: renderer image is empty")
		quit(1)
		return
	var texture_image: Image = display.texture.get_image()
	if texture_image == null or texture_image.is_empty():
		push_error("RENDER_DIAGNOSTIC: display texture image is empty")
		quit(1)
		return
	var non_dark_samples: int = 0
	var colorful_samples: int = 0
	var texture_non_dark_samples: int = 0
	for y: int in range(0, image.get_height(), 7):
		for x: int in range(0, image.get_width(), 7):
			var color: Color = image.get_pixel(x, y)
			if maxf(color.r, maxf(color.g, color.b)) > 0.08:
				non_dark_samples += 1
			if maxf(color.r, maxf(color.g, color.b)) - minf(color.r, minf(color.g, color.b)) > 0.04:
				colorful_samples += 1
			var texture_color: Color = texture_image.get_pixel(x, y)
			if maxf(texture_color.r, maxf(texture_color.g, texture_color.b)) > 0.08:
				texture_non_dark_samples += 1
	print("RENDER_DIAGNOSTIC display_size=", display.size)
	print("RENDER_DIAGNOSTIC texture_size=", Vector2i(display.texture.get_width(), display.texture.get_height()))
	print("RENDER_DIAGNOSTIC image_size=", Vector2i(image.get_width(), image.get_height()))
	print("RENDER_DIAGNOSTIC non_dark_samples=", non_dark_samples)
	print("RENDER_DIAGNOSTIC colorful_samples=", colorful_samples)
	print("RENDER_DIAGNOSTIC texture_non_dark_samples=", texture_non_dark_samples)
	print("RENDER_DIAGNOSTIC display_z=", display.z_index)
	if display.size.x <= 1.0 or display.size.y <= 1.0:
		push_error("RENDER_DIAGNOSTIC: display control has no usable size")
		quit(1)
		return
	if non_dark_samples < 20 or colorful_samples < 10 or texture_non_dark_samples < 20:
		push_error("RENDER_DIAGNOSTIC: rendered frame is effectively black")
		quit(1)
		return
	quit(0)
