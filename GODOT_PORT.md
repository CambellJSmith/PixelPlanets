# Godot Port

Pixel Planets has been translated to a native Godot 4 project while retaining the original procedural pixel-grid simulation, systems, content, controls, save slots, dimensions, fauna, bosses, structures, weather, farming, furniture, weapons and framebuffer presentation.

Open the repository root with Godot 4.7.2 and run `main.tscn`. The internal game framebuffer remains 360×210 with nearest-neighbour presentation. Save data is stored in Godot's `user://` directory in three JSON slots.

The original JavaScript source and tests are retained as the behavioural reference for the port.
