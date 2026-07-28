export const PERFORMANCE_CONFIG = Object.freeze({
  targetFps:60,
  maxCatchUpSteps:3,
  terrainFullRefreshFrames:12,
});

export const WORLD_WIDTH = 360;
export const WORLD_HEIGHT = 210;
export const CHUNK_CELL_COUNT = WORLD_WIDTH * WORLD_HEIGHT;
export const ACTIVE_RADIUS = 1;
export const ACTIVE_CHUNK_COUNT = 9;

export const PLAYER_CONFIG = Object.freeze({
  width: 3,
  height: 5,
  acceleration: 0.08,
  airDrag: 0.93,
  groundDrag: 0.78,
  maxSpeed: 1.15,
  gravity: 0.075,
  maxFallSpeed: 1.45,
  jumpSpeed: 1.18,
  coyoteFrames: 7,
  jumpBufferFrames: 8,
  autoStepHeight: 1,
});

export const BUNNYHOP_CONFIG = Object.freeze({
  landingWindowFrames:8,
  groundResetFrames:8,
  maxChain:10,
  jumpSpeedBonusPerHop:.065,
  maxJumpMultiplier:1.62,
  speedLimitBonusPerHop:.14,
  maxSpeedMultiplier:2.45,
  momentumBoost:.13,
  momentumBoostGrowth:.15,
  groundMomentumDrag:.96,
  airControlBonusPerHop:.045,
  maxAirControlMultiplier:1.55,
});


export const SWIM_CONFIG = Object.freeze({
  acceleration:.065,
  verticalAcceleration:.09,
  downwardAcceleration:.055,
  drag:.86,
  maxHorizontalSpeed:.78,
  maxVerticalSpeed:.72,
  buoyancy:.018,
  waterCellThreshold:4,
  columnScanDepth:48,
  maxWadeDepth:PLAYER_CONFIG.height-1,
  minimumDeepColumnRatio:.5,
  surfaceLatchDepth:3,
  surfaceBodyDepth:4,
  surfaceSpring:.04,
  surfaceSettleAcceleration:.045,
});

export const BREATH_CONFIG = Object.freeze({
  max:100,
  fullDrainFrames:20*60,
  fullRecoveryFrames:5*60,
  drowningDamage:5,
  drowningIntervalFrames:90,
  criticalThreshold:20,
});

export const MAGNIFIER_CONFIG = Object.freeze({
  minZoom: 1,
  maxZoom: 8,
  zoomStep: 0.5,
  radius: 15,
});


export const NAPALM_CONFIG = Object.freeze({
  ignitionFrames: 60,
  simulationStepFrames: 2,
  fireLifeFrames: 90,
});


export const GLAIVE_CONFIG = Object.freeze({
  launchSpeed:2.25,
  returnAfterFrames:48,
  maxBounces:8,
  maxLifeFrames:360,
  ricochetRetention:0.9,
  spinSpeed:1.28,
  enemyHitCooldown:15,
});

export const GRENADE_CONFIG = Object.freeze({
  cooldown: 34,
  launchSpeed: 2.35,
  gravity: 0.055,
  airDrag: 0.995,
  bounce: 0.58,
  groundFriction: 0.82,
  fuseFrames: 78,
  blastRadius: 7,
  fireRadius: 9,
  fireLifeMin: 48,
  fireLifeMax: 92,
});


export const DRONE_STRIKE_CONFIG = Object.freeze({
  cooldown: 210,
  entryOutsideOffset: 4,
  entryTopMargin: 5,
  topHalfRatio: 0.48,
  corridorHalfHeight: 1,
  droneSpeed: 1.25,
  rocketSpeed: 2.8,
  rocketHoming: 0.13,
  rocketGravity: 0.035,
  blastRadius: 15,
  fireRadius: 20,
  fireLifeMin: 85,
  fireLifeMax: 155,
  explosionFrames: 22,
});






export const OCEAN_CONFIG = Object.freeze({
  seaLevelMin: 48,
  seaLevelMax: 53,
  floorMin: 73,
  floorMax: 84,
  trenchDepth: 9,
  beachBlendThreshold: 0.16,
  sandDepth: 6,
});

export const SEA_SERPENT_CONFIG = Object.freeze({
  maxHealth: 380,
  width: 15,
  height: 14,
  emergeDepth: 25,
  hoverAboveWater: 11,
  wanderX: 22,
  wanderY: 4,
  contactDamage: 9,
  projectileSpeed: 1.65,
  projectileLifeFrames: 190,
  projectileCooldownMin: 72,
  projectileCooldownMax: 118,
  projectileSpread: 0.2,
  projectileBurstCount: 3,
  projectileGravity: 0.026,
  splashRadius: 3,
  crystalReward: 30,
});

export const CALDERA_BOSS_CONFIG = Object.freeze({
  maxHealth: 320,
  width: 17,
  height: 11,
  hoverHeight: 14,
  wanderX: 18,
  wanderY: 5,
  contactDamage: 8,
  fireballSpeed: 1.45,
  fireballGravity: 0.04,
  fireballLifeFrames: 180,
  fireballCooldownMin: 78,
  fireballCooldownMax: 132,
  fireballSpread: 0.18,
  fireballBurstCount: 3,
  fireballBlastRadius: 3,
  fireLifeMin: 44,
  fireLifeMax: 88,
  crystalReward: 25,
});

export const STEAM_CONFIG = Object.freeze({
  lifeFrames: 110,
  playerDamage: 3,
  enemyDamagePerFrame: 0.2,
});

export const VOLCANO_CONFIG = Object.freeze({
  coneRadiusRatio: 0.38,
  calderaRadiusMin: 48,
  calderaRadiusMax: 68,
  calderaDepth: 18,
  lavaPoolDepth: 8,
  conduitRadiusMin: 4,
  conduitRadiusMax: 7,
  chamberDepthMin: 96,
  chamberDepthMax: 132,
  chamberRadiusXMin: 42,
  chamberRadiusXMax: 62,
  chamberRadiusYMin: 17,
  chamberRadiusYMax: 26,
});

export const DIRT_GRASS_CONFIG = Object.freeze({
  exposedFrames: 60 * 60,
  updateStepFrames: 2,
});

export const BUILD_CONFIG = Object.freeze({
  range: 18,
});

export const DAY_NIGHT_CONFIG = Object.freeze({
  framesPerSecond:60,
  dayFrames:15*60*60,
  nightFrames:5*60*60,
  dawnFraction:0.12,
  duskFraction:0.14,
});

export const FARM_CONFIG = Object.freeze({
  growFrames:(15+5)*60*60,
  growthStages:5,
  growthUpdateInterval:30,
  seedScatterCount:7,
  seedSpreadRadians:0.7,
  seedLaunchSpeedMin:1.15,
  seedLaunchSpeedMax:2.05,
  seedGravity:0.052,
  seedAirDrag:0.994,
  seedLifeFrames:60*18,
  pickupLifeFrames:60*60*5,
  pickupCollectRadius:2.6,
  pickupAttractRadius:12,
  maxLoosePickups:600,
});

export const WEATHER_CONFIG = Object.freeze({
  periodFrames:75*60,
  transitionFrames:6*60,
  precipitationIntervalFrames:8,
  heavyPrecipitationIntervalFrames:4,
  maxSurfaceDepositsPerTick:3,
  lightningMinFrames:7*60,
  lightningMaxFrames:15*60,
  lightningDamage:18,
  lightningFireLife:95,
  heatPulseFrames:24,
  weatherParticleCount:90,
  windEntityForce:.018,
  windGasChance:.58,
});






export const JUICE_CONFIG = Object.freeze({
  maxParticles:320,
  maxDamageNumbers:28,
  maxFlashes:24,
  maxShockwaves:12,
  maxHitStopFrames:8,
  maxCellBurstsPerFrame:14,
});

export const REALITY_ZIPPER_CONFIG = Object.freeze({
  cooldown:270,
  range:78,
  lifeFrames:180,
  openingFrames:18,
  closingFrames:30,
  splitDistance:3,
  halfWidth:2,
  fieldRadius:11,
  pulseInterval:12,
  enemyDamagePerPulse:5,
  bossDamagePerPulse:3,
  gravityForce:.16,
  projectileSplitLimit:6,
  splitAngle:.34,
  maxRifts:1,
  sparkCount:72,
  pulseSparkCount:8,
  maxSparks:180,
});

export const NYAN_CAT_CONFIG = Object.freeze({
  cooldown:150,
  speed:2.85,
  lifeFrames:210,
  trailLength:30,
  contactDamage:42,
  bossDamage:92,
  blastDamage:78,
  blastRadius:12,
  terrainRadius:8,
  pierce:5,
  gravity:.035,
  airDrag:.999,
  bounceRetention:.91,
  minimumMomentum:2.15,
  maxBounces:6,
  bounceSparkCount:10,
  sparkCount:54,
  maxSparks:180,
});

export const LASER_RIFLE_CONFIG = Object.freeze({
  range:72,
  weaponHeatPerFrame:.58,
  weaponCoolPerFrame:1.15,
  overheatRelease:28,
  pixelHeatPerFrame:2.5,
  pixelHeatDecay:.72,
  sparkCountPerFrame:3,
  maxSparks:96,
  enemyDamagePerFrame:.46,
  bossDamagePerFrame:.3,
  waterSteamHeat:22,
  snowMeltHeat:16,
  ignitionHeat:44,
  sandMeltHeat:76,
  stoneMeltHeat:112,
});

export const FOOD_COOKING_CONFIG = Object.freeze({
  cookFrames:60,
  heatRadius:2,
});

export const HUNGER_CONFIG = Object.freeze({
  max:100,
  fullDrainFrames:30*60*60,
  movingMultiplier:1.35,
  jumpCost:0.45,
  lowThreshold:25,
  criticalThreshold:10,
  starvationDamage:2,
  starvationIntervalFrames:180,
});

export const ENEMY_BEHAVIOR_CONFIG = Object.freeze({
  maxNests:8,
  nestBuildFrames:60*18,
  nestSpawnFrames:60*12,
  nestLifeFrames:60*60*4,
  nestSpawnRadius:10,
  nestEnemyCap:18,
  packRadius:30,
  packSpeedBonusPerAlly:.1,
  packMaxSpeedBonus:.42,
  packFlankDistance:6,
  burrowDurationMin:65,
  burrowDurationMax:130,
  burrowCooldownFrames:180,
  burrowEmergeDistance:6,
  scavengerSenseRadius:20,
  scavengerHealPerItem:4,
  parasiteLifeFrames:60*12,
  parasiteDamageInterval:120,
  parasiteDamage:2,
  parasiteMaxAttached:3,
  parasiteSlowPerAttachment:.11,
  parasiteMinimumSpeedMultiplier:.62,
  weaponTheftCooldown:60*8,
  invasionPortalInitialMinFrames:60*60*6,
  invasionPortalInitialMaxFrames:60*60*10,
  invasionPortalMinFrames:60*60*12,
  invasionPortalMaxFrames:60*60*20,
  invasionPortalOpenFrames:70,
  invasionPortalLifeFrames:60*16,
  invasionPortalSpawnInterval:42,
  invasionPortalWaveMin:3,
  invasionPortalWaveMax:6,
  maxInvasionPortals:1,
  maxInvadersPerPortal:6,
});
