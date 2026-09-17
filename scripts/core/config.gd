class_name GameConfig
extends RefCounted

const WORLD_WIDTH: int = 360
const WORLD_HEIGHT: int = 210
const CHUNK_CELL_COUNT: int = WORLD_WIDTH * WORLD_HEIGHT
const ACTIVE_RADIUS: int = 1
const TARGET_FPS: float = 60.0
const FIXED_STEP: float = 1.0 / TARGET_FPS
const MAX_CATCH_UP_STEPS: int = 3
const TERRAIN_FULL_REFRESH_FRAMES: int = 12

const PLAYER: Dictionary = {
	"width": 3, "height": 5, "acceleration": 0.08, "air_drag": 0.93,
	"ground_drag": 0.78, "max_speed": 1.15, "gravity": 0.075,
	"max_fall_speed": 1.45, "jump_speed": 1.18, "coyote_frames": 7,
	"jump_buffer_frames": 8, "auto_step_height": 1,
}
const BUNNYHOP: Dictionary = {
	"landing_window_frames": 8, "ground_reset_frames": 8, "max_chain": 10,
	"jump_speed_bonus_per_hop": 0.065, "max_jump_multiplier": 1.62,
	"speed_limit_bonus_per_hop": 0.14, "max_speed_multiplier": 2.45,
	"momentum_boost": 0.13, "momentum_boost_growth": 0.15,
	"ground_momentum_drag": 0.96, "air_control_bonus_per_hop": 0.045,
	"max_air_control_multiplier": 1.55,
}
const SWIM: Dictionary = {
	"acceleration": 0.065, "vertical_acceleration": 0.09, "downward_acceleration": 0.055,
	"drag": 0.86, "max_horizontal_speed": 0.78, "max_vertical_speed": 0.72,
	"buoyancy": 0.018, "water_cell_threshold": 4, "column_scan_depth": 48,
	"max_wade_depth": 4, "minimum_deep_column_ratio": 0.5, "surface_latch_depth": 3,
	"surface_body_depth": 4, "surface_spring": 0.04, "surface_settle_acceleration": 0.045,
}
const BREATH: Dictionary = {
	"max": 100.0, "full_drain_frames": 1200.0, "full_recovery_frames": 300.0,
	"drowning_damage": 5.0, "drowning_interval_frames": 90, "critical_threshold": 20.0,
}
const MAGNIFIER: Dictionary = {"min_zoom": 1.0, "max_zoom": 8.0, "zoom_step": 0.5, "radius": 15}
const NAPALM: Dictionary = {"ignition_frames": 60, "simulation_step_frames": 2, "fire_life_frames": 90}
const GLAIVE: Dictionary = {
	"launch_speed": 2.25, "return_after_frames": 48, "max_bounces": 8,
	"max_life_frames": 360, "ricochet_retention": 0.9, "spin_speed": 1.28,
	"enemy_hit_cooldown": 15,
}
const GRENADE: Dictionary = {
	"cooldown": 34, "launch_speed": 2.35, "gravity": 0.055, "air_drag": 0.995,
	"bounce": 0.58, "ground_friction": 0.82, "fuse_frames": 78, "blast_radius": 7,
	"fire_radius": 9, "fire_life_min": 48, "fire_life_max": 92,
}
const DRONE_STRIKE: Dictionary = {
	"cooldown": 210, "entry_outside_offset": 4, "entry_top_margin": 5, "top_half_ratio": 0.48,
	"corridor_half_height": 1, "drone_speed": 1.25, "rocket_speed": 2.8, "rocket_homing": 0.13,
	"rocket_gravity": 0.035, "blast_radius": 15, "fire_radius": 20, "fire_life_min": 85,
	"fire_life_max": 155, "explosion_frames": 22,
}
const OCEAN: Dictionary = {
	"sea_level_min": 48.0, "sea_level_max": 53.0, "floor_min": 73.0, "floor_max": 84.0,
	"trench_depth": 9.0, "beach_blend_threshold": 0.16, "sand_depth": 6,
}
const SEA_SERPENT: Dictionary = {
	"max_health": 380.0, "width": 15, "height": 14, "emerge_depth": 25,
	"hover_above_water": 11, "wander_x": 22.0, "wander_y": 4.0, "contact_damage": 9.0,
	"projectile_speed": 1.65, "projectile_life_frames": 190, "projectile_cooldown_min": 72,
	"projectile_cooldown_max": 118, "projectile_spread": 0.2, "projectile_burst_count": 3,
	"projectile_gravity": 0.026, "splash_radius": 3, "crystal_reward": 30,
}
const CALDERA_BOSS: Dictionary = {
	"max_health": 320.0, "width": 17, "height": 11, "hover_height": 14,
	"wander_x": 18.0, "wander_y": 5.0, "contact_damage": 8.0, "fireball_speed": 1.45,
	"fireball_gravity": 0.04, "fireball_life_frames": 180, "fireball_cooldown_min": 78,
	"fireball_cooldown_max": 132, "fireball_spread": 0.18, "fireball_burst_count": 3,
	"fireball_blast_radius": 3, "fire_life_min": 44, "fire_life_max": 88, "crystal_reward": 25,
}
const STEAM: Dictionary = {"life_frames": 110, "player_damage": 3.0, "enemy_damage_per_frame": 0.2}
const VOLCANO: Dictionary = {
	"cone_radius_ratio": 0.38, "caldera_radius_min": 48.0, "caldera_radius_max": 68.0,
	"caldera_depth": 18.0, "lava_pool_depth": 8.0, "conduit_radius_min": 4.0,
	"conduit_radius_max": 7.0, "chamber_depth_min": 96.0, "chamber_depth_max": 132.0,
	"chamber_radius_x_min": 42.0, "chamber_radius_x_max": 62.0,
	"chamber_radius_y_min": 17.0, "chamber_radius_y_max": 26.0,
}
const DIRT_GRASS: Dictionary = {"exposed_frames": 3600, "update_step_frames": 2}
const BUILD: Dictionary = {"range": 18.0}
const DAY_NIGHT: Dictionary = {
	"day_frames": 54000, "night_frames": 18000, "dawn_fraction": 0.12, "dusk_fraction": 0.14,
}
const FARM: Dictionary = {
	"grow_frames": 72000, "growth_stages": 5, "growth_update_interval": 30,
	"seed_scatter_count": 7, "seed_spread_radians": 0.7, "seed_launch_speed_min": 1.15,
	"seed_launch_speed_max": 2.05, "seed_gravity": 0.052, "seed_air_drag": 0.994,
	"seed_life_frames": 1080, "pickup_life_frames": 18000, "pickup_collect_radius": 2.6,
	"pickup_attract_radius": 12.0, "max_loose_pickups": 600,
}
const WEATHER: Dictionary = {
	"period_frames": 4500, "transition_frames": 360, "precipitation_interval_frames": 8,
	"heavy_precipitation_interval_frames": 4, "max_surface_deposits_per_tick": 3,
	"lightning_min_frames": 420, "lightning_max_frames": 900, "lightning_damage": 18.0,
	"lightning_fire_life": 95, "heat_pulse_frames": 24, "weather_particle_count": 90,
	"wind_entity_force": 0.018, "wind_gas_chance": 0.58,
}
const JUICE: Dictionary = {
	"max_particles": 320, "max_damage_numbers": 28, "max_flashes": 24, "max_shockwaves": 12,
	"max_hit_stop_frames": 8, "max_cell_bursts_per_frame": 14,
}
const REALITY_ZIPPER: Dictionary = {
	"cooldown": 270, "range": 78.0, "life_frames": 180, "opening_frames": 18, "closing_frames": 30,
	"split_distance": 3, "half_width": 2, "field_radius": 11.0, "pulse_interval": 12,
	"enemy_damage_per_pulse": 5.0, "boss_damage_per_pulse": 3.0, "gravity_force": 0.16,
	"projectile_split_limit": 6, "split_angle": 0.34, "max_rifts": 1, "spark_count": 72,
	"pulse_spark_count": 8, "max_sparks": 180,
}
const NYAN_CAT: Dictionary = {
	"cooldown": 150, "speed": 2.85, "life_frames": 210, "trail_length": 30,
	"contact_damage": 42.0, "boss_damage": 92.0, "blast_damage": 78.0, "blast_radius": 12,
	"terrain_radius": 8, "pierce": 5, "gravity": 0.035, "air_drag": 0.999,
	"bounce_retention": 0.91, "minimum_momentum": 2.15, "max_bounces": 6,
	"bounce_spark_count": 10, "spark_count": 54, "max_sparks": 180,
}
const LASER_RIFLE: Dictionary = {
	"range": 72.0, "weapon_heat_per_frame": 0.58, "weapon_cool_per_frame": 1.15,
	"overheat_release": 28.0, "pixel_heat_per_frame": 2.5, "pixel_heat_decay": 0.72,
	"spark_count_per_frame": 3, "max_sparks": 96, "enemy_damage_per_frame": 0.46,
	"boss_damage_per_frame": 0.3, "water_steam_heat": 22.0, "snow_melt_heat": 16.0,
	"ignition_heat": 44.0, "sand_melt_heat": 76.0, "stone_melt_heat": 112.0,
}
const FOOD_COOKING: Dictionary = {"cook_frames": 60, "heat_radius": 2}
const HUNGER: Dictionary = {
	"max": 100.0, "full_drain_frames": 108000.0, "moving_multiplier": 1.35,
	"jump_cost": 0.45, "low_threshold": 25.0, "critical_threshold": 10.0,
	"starvation_damage": 2.0, "starvation_interval_frames": 180,
}
const ENEMY_BEHAVIOR: Dictionary = {
	"max_nests": 8, "nest_build_frames": 1080, "nest_spawn_frames": 720,
	"nest_life_frames": 14400, "nest_spawn_radius": 10, "nest_enemy_cap": 18,
	"pack_radius": 30.0, "pack_speed_bonus_per_ally": 0.1, "pack_max_speed_bonus": 0.42,
	"pack_flank_distance": 6.0, "burrow_duration_min": 65, "burrow_duration_max": 130,
	"burrow_cooldown_frames": 180, "burrow_emerge_distance": 6.0, "scavenger_sense_radius": 20.0,
	"scavenger_heal_per_item": 4.0, "parasite_life_frames": 720, "parasite_damage_interval": 120,
	"parasite_damage": 2.0, "parasite_max_attached": 3, "parasite_slow_per_attachment": 0.11,
	"parasite_minimum_speed_multiplier": 0.62, "weapon_theft_cooldown": 480,
	"invasion_portal_initial_min_frames": 21600, "invasion_portal_initial_max_frames": 36000,
	"invasion_portal_min_frames": 43200, "invasion_portal_max_frames": 72000,
	"invasion_portal_open_frames": 70, "invasion_portal_life_frames": 960,
	"invasion_portal_spawn_interval": 42, "invasion_portal_wave_min": 3,
	"invasion_portal_wave_max": 6, "max_invasion_portals": 1, "max_invaders_per_portal": 6,
}
