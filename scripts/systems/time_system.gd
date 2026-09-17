class_name TimeSystem
extends RefCounted

var state: GameState
var cycle_frames: int

func _init(game_state: GameState) -> void:
	state = game_state
	cycle_frames = int(GameConfig.DAY_NIGHT["day_frames"]) + int(GameConfig.DAY_NIGHT["night_frames"])

func _smooth(value: float) -> float:
	var x: float = clampf(value, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

func get_time() -> Dictionary:
	var cycle_frame: int = posmod(state.frame, cycle_frames)
	var day_number: int = floori(float(state.frame) / float(cycle_frames)) + 1
	var is_day: bool = cycle_frame < int(GameConfig.DAY_NIGHT["day_frames"])
	var phase_frame: int = cycle_frame if is_day else cycle_frame - int(GameConfig.DAY_NIGHT["day_frames"])
	var phase_length: int = int(GameConfig.DAY_NIGHT["day_frames"]) if is_day else int(GameConfig.DAY_NIGHT["night_frames"])
	var phase_progress: float = float(phase_frame) / float(phase_length)
	var daylight: float = 1.0
	var dawn: float = 0.0
	var dusk: float = 0.0
	var night_strength: float = 0.0
	if is_day:
		var dawn_end: float = float(GameConfig.DAY_NIGHT["dawn_fraction"])
		var dusk_start: float = 1.0 - float(GameConfig.DAY_NIGHT["dusk_fraction"])
		if phase_progress < dawn_end:
			dawn = 1.0 - phase_progress / dawn_end
			daylight = 0.16 + 0.84 * _smooth(phase_progress / dawn_end)
		elif phase_progress > dusk_start:
			dusk = (phase_progress - dusk_start) / (1.0 - dusk_start)
			daylight = 0.16 + 0.84 * (1.0 - _smooth(dusk))
	else:
		var edge: float = minf(phase_progress, 1.0 - phase_progress) * 5.0
		night_strength = 0.55 + 0.45 * _smooth(clampf(edge, 0.0, 1.0))
		daylight = 0.08 * (1.0 - night_strength)
	var clock_hours: float = 6.0 + phase_progress * 12.0 if is_day else 18.0 + phase_progress * 12.0
	var normalized_hours: float = fmod(clock_hours, 24.0)
	var hours: int = floori(normalized_hours)
	var minutes: int = floori((normalized_hours - float(hours)) * 60.0)
	return {
		"cycle_frame": cycle_frame, "cycle_frames": cycle_frames, "day_number": day_number,
		"is_day": is_day, "phase": "day" if is_day else "night", "phase_progress": phase_progress,
		"daylight": clampf(daylight, 0.0, 1.0), "night_strength": clampf(1.0 - daylight if is_day else night_strength, 0.0, 1.0),
		"dawn": clampf(dawn, 0.0, 1.0), "dusk": clampf(dusk, 0.0, 1.0),
		"hours": hours, "minutes": minutes, "label": "Day %d · %02d:%02d" % [day_number, hours, minutes],
	}
