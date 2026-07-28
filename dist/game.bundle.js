/* Generated from the modular src/ tree by scripts/build-standalone.mjs. */
(() => {
'use strict';
const __modules=Object.create(null);

__modules["src/main.js"]=function(exports,__require){
const { createGame } = __require("src/game.js");
const canvas=document.getElementById('game');
if(!(canvas instanceof HTMLCanvasElement)){
  throw new Error('Game canvas was not found.');
}

const game=createGame(canvas);
game.start();

const bootStatus=document.getElementById('boot-status');
if(bootStatus)bootStatus.hidden=true;
document.documentElement.dataset.gameReady='true';

// Exposed for debugging from the browser console.
window.pixelWorldGame=game;

};

__modules["src/game.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, PERFORMANCE_CONFIG } = __require("src/config.js");
const { WeaponId } = __require("src/data/weapons.db.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { playerPixelBounds } = __require("src/player-geometry.js");
const { snapGamePositions } = __require("src/pixel-grid.js");
const { createGameState } = __require("src/state/game-state.js");
const { createNoise } = __require("src/world/noise.js");
const { createWorldGenerator } = __require("src/world/generator.js");
const { createChunkManager } = __require("src/world/chunks.js");
const { createCellAccess } = __require("src/world/cells.js");
const { createHud } = __require("src/ui/hud.js");
const { createWeaponSystem } = __require("src/systems/weapon-system.js");
const { createPlayerSystem } = __require("src/systems/player-system.js");
const { createProjectileSystem } = __require("src/systems/projectile-system.js");
const { createEnemySystem } = __require("src/systems/enemy-system.js");
const { createBossSystem } = __require("src/systems/boss-system.js");
const { createMaterialSystem } = __require("src/systems/material-system.js");
const { createInputSystem } = __require("src/systems/input-system.js");
const { createCropSystem } = __require("src/systems/crop-system.js");
const { createTimeSystem } = __require("src/systems/time-system.js");
const { createWeatherSystem } = __require("src/systems/weather-system.js");
const { createSaveSystem } = __require("src/systems/save-system.js");
const { createJuiceSystem } = __require("src/systems/juice-system.js");
const { createPalette } = __require("src/render/palette.js");
const { createRenderer } = __require("src/render/renderer.js");
const { createStructureSystem } = __require("src/systems/structure-system.js");
const { createFurnitureSystem } = __require("src/systems/furniture-system.js");
const { createDimensionPositionMap, createDimensionEntityMap, DimensionId } = __require("src/data/dimensions.db.js");
function createGame(canvas){
  const state=createGameState();
  const noise=createNoise(state);
  const juiceSystem=createJuiceSystem(state,noise);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  const timeSystem=createTimeSystem(state);
  const weatherSystem=createWeatherSystem(state,cells,chunks,generator,noise,timeSystem,juiceSystem);
  const hud=createHud(state,generator,timeSystem,weatherSystem);
  const crops=createCropSystem(state,cells,chunks,noise,hud,weatherSystem,juiceSystem);
  const furnitureSystem=createFurnitureSystem(state,cells,chunks,timeSystem,hud,juiceSystem);
  const weapons=createWeaponSystem(state,cells,chunks,noise,hud,crops,juiceSystem,furnitureSystem);
  const playerSystem=createPlayerSystem(state,cells,chunks,generator,weapons,hud,juiceSystem,furnitureSystem);
  weatherSystem.setPlayerDamage(playerSystem.damage);
  const projectileSystem=createProjectileSystem(state,cells,chunks,noise,juiceSystem);
  const structureSystem=createStructureSystem(state,cells,chunks,generator,hud,juiceSystem);
  const enemySystem=createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud,juiceSystem);
  const bossSystem=createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem,timeSystem,juiceSystem);
  const materialSystem=createMaterialSystem(state,cells,noise,weatherSystem);
  const palette=createPalette(state,generator,timeSystem,weatherSystem);
  const renderer=createRenderer(state,canvas,chunks,weapons,palette,timeSystem,weatherSystem,juiceSystem,furnitureSystem);
  let saveSystem=null;

  function clearRuntimeStores(){
    state.world.chunks.clear();
    state.world.activeChunks.length=0;
    state.world.activeKeys.clear();
    state.world.simulationStamp=1;
    state.world.dimension=DimensionId.EARTH;
    state.world.dimensionPositions=createDimensionPositionMap();
    state.world.dimensionEntities=createDimensionEntityMap();
    state.world.firstVolcanoRegionIndex=null;
    state.world.bossSpawned=false;
    state.world.bossDefeated=false;
    state.world.firstOceanRegionIndex=null;
    state.world.seaSerpentSpawned=false;
    state.world.seaSerpentDefeated=false;
    state.world.bossEncounters=Object.create(null);
    state.world.defeatedBossCount=0;
    state.world.bossCooldownUntil=0;
    state.world.travelOriginX=20;
    state.world.moonReached=false;
    state.world.visitedDimensions={earth:true};
    state.world.rocketFlight={active:false,phase:'idle',timer:0};
    state.world.dimensionPortal={active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:DimensionId.MOON};
    state.world.moonPortal=state.world.dimensionPortal;
    state.world.nextInvasionFrame=null;
    state.world.invasionCount=0;
    state.world.invasionSerial=1;
    Object.assign(state.weather,{overrideType:null,currentType:'clear',previousType:'clear',segment:-1,intensity:0,windX:0,visibility:1,nextLightningFrame:0});
    Object.assign(state.juice,{shake:0,shakeFrames:0,hitStopFrames:0,screenFlash:0,screenFlashMax:0,recoilFrames:0,recoilX:0,playerSquash:0,playerStretch:0,hudPulse:0,celebrationFrames:0,speedIntensity:0});
    state.weather.flashes.length=0;
    state.entities.bullets.length=0;
    state.entities.napalmShots.length=0;
    state.entities.glaives.length=0;
    state.entities.grenades.length=0;
    state.entities.drones.length=0;
    state.entities.droneRockets.length=0;
    state.entities.bosses.length=0;
    state.entities.bossFireballs.length=0;
    state.entities.serpentProjectiles.length=0;
    state.entities.bossProjectiles.length=0;
    state.entities.explosions.length=0;
    state.entities.seedParticles.length=0;
    state.entities.pickups.length=0;
    state.entities.laserSparks.length=0;
    state.entities.nyanCats.length=0;
    state.entities.nyanSparks.length=0;
    state.entities.realityRifts.length=0;
    state.entities.realitySparks.length=0;
    state.entities.enemyNests.length=0;
    state.entities.invasionPortals.length=0;
    state.entities.furniture.length=0;
    state.entities.juiceParticles.length=0;
    state.entities.damageNumbers.length=0;
    state.entities.juiceFlashes.length=0;
    state.entities.juiceShockwaves.length=0;
    Object.assign(state.realityZipper,{active:false,phase:'idle'});
    Object.assign(state.laser,{active:false,heat:0,overheated:false,beam:null,contactHeat:0,hotPixels:[]});
    Object.assign(state.entities.hook,{active:false,stuck:false,x:0,y:0,vx:0,vy:0});
    state.inventory.clear();
    state.world.plants.clear();
    state.world.nextPlantId=1;
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.ui.message='';
    state.ui.messageUntil=0;
    state.ui.toolStatus='';
    state.ui.inventoryOpen=false;
    state.ui.craftingOpen=false;
    state.ui.craftingIndex=0;
    state.ui.worldMenuOpen=false;
    state.ui.inventoryIndex=0;
    state.ui.worldSlotIndex=0;
    state.ui.worldMenuReturnPaused=false;
    state.ui.confirmWorldAction='';
    state.ui.confirmWorldSlot=0;
    state.ui.inventoryRects.length=0;
    state.ui.pickupFeed.length=0;
    state.ui.damageFlash=0;
    state.ui.damageDirection=0;
    state.ui.saveStatus='';
    state.ui.saveStatusUntil=0;
    state.ui.bossRitual=null;
    state.ui.contextPrompt='';
  }

  function findSafeSpawn(){
    const player=state.player;
    const screenCenterX=Math.floor(WORLD_WIDTH*.5);
    let spawnX=screenCenterX;
    let spawnSurface=generator.surfaceAt(spawnX);

    // Check chunk centers rather than arbitrary positions. This keeps the
    // initial drop horizontally centered on the screen even when the nearest
    // safe biome is several regions away.
    for(let attempt=0;attempt<640;attempt++){
      const ring=Math.ceil(attempt*.5);
      const chunkOffset=attempt===0?0:(attempt%2===1?ring:-ring);
      const x=chunkOffset*WORLD_WIDTH+screenCenterX;
      const surface=generator.surfaceAt(x);
      const biome=generator.biomeNameAt(x);
      const slope=Math.abs(generator.surfaceAt(x-2).ground-generator.surfaceAt(x+2).ground);
      if(surface.ocean||surface.lake||biome==='volcano'||biome==='moon'||slope>5)continue;
      spawnX=x;
      spawnSurface=surface;
      break;
    }

    const spawnY=Math.round(spawnSurface.ground);
    Object.assign(player,{x:spawnX,y:spawnY});
    chunks.updateActiveNeighborhood();

    // Vegetation and authored structures are applied after base terrain, so a
    // valid terrain candidate can still contain a tree or wall. Preserve the
    // natural spawn when possible; otherwise carve only the exact player body
    // and install a stable three-pixel support row.
    if(playerSystem.collides(spawnX,spawnY)||!playerSystem.groundProbeAt(spawnX,spawnY)){
      const bounds=playerPixelBounds(spawnX,spawnY,player.width,player.height);
      for(let y=bounds.top;y<=bounds.bottom;y++){
        for(let x=bounds.left;x<=bounds.right;x++){
          cells.setCell(x,y,MaterialId.AIR,0,{silent:true,reason:'safe-spawn'});
        }
      }
      for(let x=bounds.left;x<=bounds.right;x++){
        cells.setCell(x,bounds.groundRow,MaterialId.DIRT,0,{silent:true,reason:'safe-spawn'});
      }
    }

    return {x:spawnX,y:spawnY};
  }

  function newWorld(slot=state.save.activeSlot||1,{saveAfter=true}={}){
    state.seed=Math.floor(Math.random()*2147483000)+1;
    clearRuntimeStores();

    state.frame=0;
    state.paused=false;
    state.crystals=0;
    state.weaponId=WeaponId.GUN;
    Object.assign(state.laser,{active:false,heat:0,overheated:false,beam:null,contactHeat:0,hotPixels:[]});
    Object.assign(state.realityZipper,{active:false,phase:'idle'});
    state.cooldown=0;
    state.jumpBuffer=0;
    state.coyoteFrames=0;
    state.swordTimer=0;
    state.toolEffect.frames=0;
    state.toolEffect.valid=false;
    state.toolEffect.kind='destroy';
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=false;
    state.seedMode.cropId=null;

    Object.assign(state.player,{
      x:20,
      y:45,
      vx:0,
      vy:0,
      hp:100,
      hunger:100,
      hungerRemainder:0,
      starvationTimer:0,
      breath:100,
      breathRemainder:0,
      drowningTimer:0,
      status:{lava:false,fire:false,steam:false,starving:false,swimming:false,headSubmerged:false,breathUsing:false,noOxygen:false},
      grounded:false,
      invulnerability:90,
      locked:false,
      facing:1,
      skySpawn:false,
      spawnGroundY:0,
      stolenWeaponId:null,
      weaponTheftCooldown:0,
      attachedParasites:[],
      parasiteSlowMultiplier:1,
      furnitureMode:'',
      furnitureSeatId:null,
      bunnyHop:{chain:0,landingWindow:0,groundFrames:0,lastLandingFrame:-9999,lastJumpFrame:-9999},
    });

    playerSystem.resetMotionRemainder();
    const spawn=findSafeSpawn();
    state.world.travelOriginX=spawn.x;
    const spawnChunkTop=Math.floor(spawn.y/WORLD_HEIGHT)*WORLD_HEIGHT;
    const skyY=Math.max(spawnChunkTop+10,Math.min(spawnChunkTop+18,spawn.y-9));
    const landingBounds=playerPixelBounds(spawn.x,spawn.y,state.player.width,state.player.height);
    for(let y=skyY-state.player.height;y<=landingBounds.bottom;y++){
      for(let x=landingBounds.left;x<=landingBounds.right;x++){
        cells.setCell(x,y,MaterialId.AIR,0,{silent:true,reason:'safe-spawn'});
      }
    }
    for(let x=landingBounds.left;x<=landingBounds.right;x++){
      cells.setCell(x,landingBounds.groundRow,MaterialId.DIRT,0,{silent:true,reason:'safe-spawn'});
    }
    Object.assign(state.player,{
      x:spawn.x,
      y:skyY,
      vx:0,
      vy:.18,
      grounded:false,
      invulnerability:240,
      locked:false,
      facing:1,
      skySpawn:true,
      spawnGroundY:spawn.y,
    });
    snapGamePositions(state);
    chunks.updateActiveNeighborhood();
    state.save.activeSlot=Math.max(1,Math.min(3,Math.round(Number(slot)||1)));
    state.save.dirty=true;
    hud.update();
    hud.showMessage(`Infinite world ${state.seed} - falling in`,1800);
    saveSystem?.refreshSlots();
    if(saveAfter)saveSystem?.save(state.save.activeSlot,{silent:true,reason:'manual'});
  }

  function afterLoad(){
    playerSystem.resetMotionRemainder();
    snapGamePositions(state);
    chunks.updateActiveNeighborhood();
    playerSystem.resolveOverlap();
    renderer.invalidateTerrainCache?.();
    state.world.dimensionPositions[state.world.dimension??'earth']={x:state.player.x,y:state.player.y};
    hud.update();
  }

  saveSystem=createSaveSystem(state,{
    generator,
    chunks,
    cells,
    hud,
    timeSystem,
    resetWorld:clearRuntimeStores,
    afterLoad,
    beforeSave:()=>projectileSystem.closeRealityRifts(),
  });
  cells.onChange(event=>{ saveSystem.markDirty(); juiceSystem.cellChange?.(event); });

  function saveWorld(slot=state.save.activeSlot){
    return saveSystem.save(slot);
  }

  function loadWorld(slot=state.save.activeSlot){
    return saveSystem.load(slot);
  }

  function newWorldInSlot(slot){
    newWorld(slot,{saveAfter:true});
    state.ui.worldMenuOpen=false;
    state.paused=false;
    hud.update();
    return true;
  }

  function deleteWorld(slot){
    return saveSystem.remove(slot);
  }

  function togglePause(){
    state.paused=!state.paused;
    if(state.paused)saveSystem.autosave('auto');
    hud.update();
  }

  const input=createInputSystem(state,canvas,{
    attack:weapons.attack,
    cycleWeapon:weapons.cycleWeapon,
    cycleMaterial:weapons.cycleStoredMaterial,
    equipMaterial:weapons.equipMaterial,
    equipFurniture:weapons.equipFurniture,
    equipSeed:weapons.equipSeed,
    eatProduce:crops.eatProduce,
    eatLoot:crops.eatLoot,
    craftFurniture:furnitureSystem.craft,
    interactFurniture:furnitureSystem.interactNearest,
    exitBuildMode:weapons.exitBuildMode,
    releaseJump:playerSystem.releaseJump,
    newWorld,
    newWorldInSlot,
    saveWorld,
    loadWorld,
    deleteWorld,
    refreshSaveSlots:saveSystem.refreshSlots,
    togglePause,
    openMoonPortal:structureSystem.openMoonPortal,
    openDimensionPortal:structureSystem.openDimensionPortal,
    updateHud:hud.update,
  });

  function update(){
    state.frame++;
    hud.updateTransient();
    const frozen=juiceSystem.update();
    if(frozen){
      snapGamePositions(state);
      if(state.frame%3===0)hud.update();
      return;
    }
    structureSystem.update();
    furnitureSystem.update();
    if(!state.ui.contextPrompt)state.ui.contextPrompt=furnitureSystem.contextPrompt();
    playerSystem.update();
    playerSystem.resolveOverlap();
    weapons.updateHook();
    weapons.updateContinuous();
    projectileSystem.update();
    enemySystem.update();
    bossSystem.update();
    weatherSystem.update();
    playerSystem.resolveOverlap();
    crops.update();
    playerSystem.resolveOverlap();
    if(state.frame%2===0){
      materialSystem.update();
      playerSystem.resolveOverlap();
    }
    // Systems use whole-pixel movement internally. One final normalization pass
    // preserves the integer-grid contract without rescanning every entity and
    // explored plant collection after each subsystem.
    juiceSystem.afterSimulation();
    snapGamePositions(state);
    if(state.frame%60===0)saveSystem.markDirty();
    saveSystem.update();
    if(state.frame%10===0)hud.update();
  }

  const frameDuration=1000/PERFORMANCE_CONFIG.targetFps;
  let previousTimestamp=null;
  let frameAccumulator=0;

  function tick(timestamp=null){
    const now=Number.isFinite(timestamp)
      ?timestamp
      :(globalThis.performance?.now?.()??0);

    if(previousTimestamp===null){
      previousTimestamp=now;
      if(!state.paused)update();
      renderer.render();
      requestAnimationFrame(tick);
      return;
    }

    const elapsed=Math.max(0,Math.min(250,now-previousTimestamp));
    previousTimestamp=now;
    frameAccumulator+=elapsed;
    let steps=0;

    while(frameAccumulator>=frameDuration&&steps<PERFORMANCE_CONFIG.maxCatchUpSteps){
      if(!state.paused)update();
      frameAccumulator-=frameDuration;
      steps++;
    }

    if(steps>0||state.paused)renderer.render();
    if(steps===PERFORMANCE_CONFIG.maxCatchUpSteps&&frameAccumulator>=frameDuration){
      frameAccumulator=0;
    }
    requestAnimationFrame(tick);
  }

  function start(){
    canvas.width=WORLD_WIDTH;
    canvas.height=WORLD_HEIGHT;
    input.install();
    saveSystem.install();
    if(!saveSystem.loadLastActive())newWorld(1,{saveAfter:true});
    else hud.showMessage(`Loaded world slot ${state.save.activeSlot}`,1200);
    tick();
  }

  return {
    state,
    start,
    newWorld,
    togglePause,
    saveWorld,
    loadWorld,
    newWorldInSlot,
    deleteWorld,
    systems:{
      weapons,
      player:playerSystem,
      projectiles:projectileSystem,
      enemies:enemySystem,
      boss:bossSystem,
      materials:materialSystem,
      crops,
      time:timeSystem,
      weather:weatherSystem,
      input,
      renderer,
      save:saveSystem,
      structures:structureSystem,
      furniture:furnitureSystem,
      juice:juiceSystem,
    },
    stores:{
      world:state.world,
      entities:state.entities,
      inventory:state.inventory,
    },
  };
}

Object.assign(exports,{createGame});

};

__modules["src/config.js"]=function(exports,__require){
const PERFORMANCE_CONFIG = Object.freeze({
  targetFps:60,
  maxCatchUpSteps:3,
  terrainFullRefreshFrames:12,
});

const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 210;
const CHUNK_CELL_COUNT = WORLD_WIDTH * WORLD_HEIGHT;
const ACTIVE_RADIUS = 1;
const ACTIVE_CHUNK_COUNT = 9;

const PLAYER_CONFIG = Object.freeze({
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

const BUNNYHOP_CONFIG = Object.freeze({
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


const SWIM_CONFIG = Object.freeze({
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

const BREATH_CONFIG = Object.freeze({
  max:100,
  fullDrainFrames:20*60,
  fullRecoveryFrames:5*60,
  drowningDamage:5,
  drowningIntervalFrames:90,
  criticalThreshold:20,
});

const MAGNIFIER_CONFIG = Object.freeze({
  minZoom: 1,
  maxZoom: 8,
  zoomStep: 0.5,
  radius: 15,
});


const NAPALM_CONFIG = Object.freeze({
  ignitionFrames: 60,
  simulationStepFrames: 2,
  fireLifeFrames: 90,
});


const GLAIVE_CONFIG = Object.freeze({
  launchSpeed:2.25,
  returnAfterFrames:48,
  maxBounces:8,
  maxLifeFrames:360,
  ricochetRetention:0.9,
  spinSpeed:1.28,
  enemyHitCooldown:15,
});

const GRENADE_CONFIG = Object.freeze({
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


const DRONE_STRIKE_CONFIG = Object.freeze({
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






const OCEAN_CONFIG = Object.freeze({
  seaLevelMin: 48,
  seaLevelMax: 53,
  floorMin: 73,
  floorMax: 84,
  trenchDepth: 9,
  beachBlendThreshold: 0.16,
  sandDepth: 6,
});

const SEA_SERPENT_CONFIG = Object.freeze({
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

const CALDERA_BOSS_CONFIG = Object.freeze({
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

const STEAM_CONFIG = Object.freeze({
  lifeFrames: 110,
  playerDamage: 3,
  enemyDamagePerFrame: 0.2,
});

const VOLCANO_CONFIG = Object.freeze({
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

const DIRT_GRASS_CONFIG = Object.freeze({
  exposedFrames: 60 * 60,
  updateStepFrames: 2,
});

const BUILD_CONFIG = Object.freeze({
  range: 18,
});

const DAY_NIGHT_CONFIG = Object.freeze({
  framesPerSecond:60,
  dayFrames:15*60*60,
  nightFrames:5*60*60,
  dawnFraction:0.12,
  duskFraction:0.14,
});

const FARM_CONFIG = Object.freeze({
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

const WEATHER_CONFIG = Object.freeze({
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






const JUICE_CONFIG = Object.freeze({
  maxParticles:320,
  maxDamageNumbers:28,
  maxFlashes:24,
  maxShockwaves:12,
  maxHitStopFrames:8,
  maxCellBurstsPerFrame:14,
});

const REALITY_ZIPPER_CONFIG = Object.freeze({
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

const NYAN_CAT_CONFIG = Object.freeze({
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

const LASER_RIFLE_CONFIG = Object.freeze({
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

const FOOD_COOKING_CONFIG = Object.freeze({
  cookFrames:60,
  heatRadius:2,
});

const HUNGER_CONFIG = Object.freeze({
  max:100,
  fullDrainFrames:30*60*60,
  movingMultiplier:1.35,
  jumpCost:0.45,
  lowThreshold:25,
  criticalThreshold:10,
  starvationDamage:2,
  starvationIntervalFrames:180,
});

const ENEMY_BEHAVIOR_CONFIG = Object.freeze({
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

Object.assign(exports,{PERFORMANCE_CONFIG,WORLD_WIDTH,WORLD_HEIGHT,CHUNK_CELL_COUNT,ACTIVE_RADIUS,ACTIVE_CHUNK_COUNT,PLAYER_CONFIG,BUNNYHOP_CONFIG,SWIM_CONFIG,BREATH_CONFIG,MAGNIFIER_CONFIG,NAPALM_CONFIG,GLAIVE_CONFIG,GRENADE_CONFIG,DRONE_STRIKE_CONFIG,OCEAN_CONFIG,SEA_SERPENT_CONFIG,CALDERA_BOSS_CONFIG,STEAM_CONFIG,VOLCANO_CONFIG,DIRT_GRASS_CONFIG,BUILD_CONFIG,DAY_NIGHT_CONFIG,FARM_CONFIG,WEATHER_CONFIG,JUICE_CONFIG,REALITY_ZIPPER_CONFIG,NYAN_CAT_CONFIG,LASER_RIFLE_CONFIG,FOOD_COOKING_CONFIG,HUNGER_CONFIG,ENEMY_BEHAVIOR_CONFIG});

};

__modules["src/data/weapons.db.js"]=function(exports,__require){
const WeaponId = Object.freeze({
  GUN: 0,
  NAPALM_SPRAYER: 1,
  GLAIVE: 2,
  HOOK: 3,
  SWORD: 4,
  GRENADE: 5,
  DESTRUCULATOR: 6,
  DRONE_STRIKE: 7,
  LASER_RIFLE: 8,
  NYAN_CAT_LAUNCHER: 9,
  REALITY_ZIPPER: 10,
});

const W = WeaponId;

const WEAPON_DB = Object.freeze([
  { id:W.GUN, name:'gun', cooldown:9, terrainDamage:'negligible' },
  { id:W.NAPALM_SPRAYER, name:'napalm_sprayer', cooldown:2, terrainDamage:'fire only' },
  { id:W.GLAIVE, name:'glaive', cooldown:24, terrainDamage:'none' },
  { id:W.HOOK, name:'hook', cooldown:8, terrainDamage:'none' },
  { id:W.SWORD, name:'sword', cooldown:16, terrainDamage:'none' },
  { id:W.GRENADE, name:'grenade', cooldown:34, terrainDamage:'circular blast' },
  { id:W.DESTRUCULATOR, name:'destruculator', cooldown:4, terrainDamage:'extract only' },
  { id:W.DRONE_STRIKE, name:'drone_strike', cooldown:210, terrainDamage:'large circular strike' },
  { id:W.LASER_RIFLE, name:'laser_rifle', cooldown:1, terrainDamage:'continuous heat' },
  { id:W.NYAN_CAT_LAUNCHER, name:'nyan_cat_launcher', cooldown:150, terrainDamage:'rainbow star burst' },
  { id:W.REALITY_ZIPPER, name:'reality_zipper', cooldown:270, terrainDamage:'temporary psychedelic rift' },
]);

function weaponName(id){
  return WEAPON_DB[id]?.name ?? 'unknown';
}

Object.assign(exports,{WeaponId,WEAPON_DB,weaponName});

};

__modules["src/data/materials.db.js"]=function(exports,__require){
const MaterialId = Object.freeze({
  AIR: 0,
  ROCK: 1,
  DIRT: 2,
  GRASS: 3,
  WATER: 4,
  SAND: 5,
  WOOD: 6,
  LEAF: 7,
  LAVA: 8,
  CRYSTAL: 9,
  FIRE: 10,
  NAPALM: 11,
  SMOKE: 12,
  SNOW: 13,
  MUD: 14,
  BAMBOO: 15,
  ASH: 16,
  MYCELIUM: 17,
  MUSHROOM_STEM: 18,
  MUSHROOM_CAP: 19,
  STEAM: 20,
  CROP_STEM: 21,
  CROP_LEAF: 22,
  CROP_FRUIT: 23,
});

const M = MaterialId;

const MATERIAL_DB = Object.freeze([
  { id:M.AIR, name:'air', solid:false, collectable:false, placeable:false, dynamic:false, flammable:false },
  { id:M.ROCK, name:'rock', solid:true, collectable:true, placeable:true, dynamic:false, flammable:false },
  { id:M.DIRT, name:'dirt', solid:true, collectable:true, placeable:true, dynamic:false, flammable:false },
  { id:M.GRASS, name:'grass', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.WATER, name:'water', solid:false, collectable:true, placeable:false, dynamic:true, flammable:false },
  { id:M.SAND, name:'sand', solid:true, collectable:true, placeable:true, dynamic:true, flammable:false },
  { id:M.WOOD, name:'wood', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.LEAF, name:'leaf', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.LAVA, name:'lava', solid:false, collectable:true, placeable:false, dynamic:true, flammable:false },
  { id:M.CRYSTAL, name:'crystal', solid:true, collectable:true, placeable:true, dynamic:false, flammable:false },
  { id:M.FIRE, name:'fire', solid:false, collectable:false, placeable:false, dynamic:true, flammable:false },
  { id:M.NAPALM, name:'napalm', solid:false, collectable:true, placeable:false, dynamic:true, flammable:false },
  { id:M.SMOKE, name:'smoke', solid:false, collectable:false, placeable:false, dynamic:true, flammable:false },
  { id:M.SNOW, name:'snow', solid:true, collectable:true, placeable:true, dynamic:true, flammable:false },
  { id:M.MUD, name:'mud', solid:true, collectable:true, placeable:true, dynamic:true, flammable:true },
  { id:M.BAMBOO, name:'bamboo', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.ASH, name:'ash', solid:true, collectable:true, placeable:true, dynamic:true, flammable:true },
  { id:M.MYCELIUM, name:'mycelium dirt', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.MUSHROOM_STEM, name:'mushroom stem', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.MUSHROOM_CAP, name:'mushroom cap', solid:true, collectable:true, placeable:true, dynamic:false, flammable:true },
  { id:M.STEAM, name:'steam', solid:false, collectable:false, placeable:false, dynamic:true, flammable:false },
  { id:M.CROP_STEM, name:'crop stem', solid:true, collectable:false, placeable:false, dynamic:false, flammable:true },
  { id:M.CROP_LEAF, name:'crop leaves', solid:false, collectable:false, placeable:false, dynamic:false, flammable:true },
  { id:M.CROP_FRUIT, name:'crop produce', solid:true, collectable:false, placeable:false, dynamic:false, flammable:true },
]);

const MATERIAL_COUNT = MATERIAL_DB.length;
const SOLID_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.solid).map(item=>item.id));
const COLLECTABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.collectable).map(item=>item.id));
const PLACEABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.placeable).map(item=>item.id));
const FLAMMABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.flammable).map(item=>item.id));
const POWDER_MATERIALS = new Set([M.SAND,M.SNOW,M.MUD,M.ASH]);
const LIQUID_MATERIALS = new Set([M.WATER,M.LAVA,M.NAPALM]);
const GAS_MATERIALS = new Set([M.SMOKE,M.STEAM]);
const CROP_MATERIALS = new Set([M.CROP_STEM,M.CROP_LEAF,M.CROP_FRUIT]);

function materialName(id){
  return MATERIAL_DB[id]?.name ?? 'unknown';
}

Object.assign(exports,{MaterialId,MATERIAL_DB,MATERIAL_COUNT,SOLID_MATERIALS,COLLECTABLE_MATERIALS,PLACEABLE_MATERIALS,FLAMMABLE_MATERIALS,POWDER_MATERIALS,LIQUID_MATERIALS,GAS_MATERIALS,CROP_MATERIALS,materialName});

};

__modules["src/player-geometry.js"]=function(exports,__require){
function playerPixelBounds(x,y,width=3,height=5){
  const pixelWidth=Math.max(1,Math.round(width));
  const pixelHeight=Math.max(1,Math.round(height));
  const centerX=Math.round(x);
  const baselineY=Math.round(y);
  const left=centerX-Math.floor(pixelWidth/2);
  const top=baselineY-pixelHeight;

  return {
    centerX,
    baselineY,
    left,
    right:left+pixelWidth-1,
    top,
    bottom:baselineY-1,
    groundRow:baselineY,
    width:pixelWidth,
    height:pixelHeight,
  };
}

function playerOccupiesPixel(x,y,playerX,playerY,width=3,height=5){
  const bounds=playerPixelBounds(playerX,playerY,width,height);
  return x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom;
}

Object.assign(exports,{playerPixelBounds,playerOccupiesPixel});

};

__modules["src/pixel-grid.js"]=function(exports,__require){
const motionCarry=new WeakMap();

const POSITION_KEYS=Object.freeze(['x','y']);
const STORED_COORDINATE_KEYS=Object.freeze([
  'x','y',
  'targetX','targetY',
  'homeX','homeY',
  'groundY','waterY',
  'entryX','entryY','exitX','exitY',
  'pointerX','pointerY',
  'beamX','beamY',
  'impactX','impactY',
  'sourceX','sourceY',
  'anchorX','anchorY',
  'baseX','baseY',
]);

function nearestPixel(value){
  const number=Number(value);
  return Number.isFinite(number)?Math.round(number):0;
}

function placeOnPixel(object,x=object?.x??0,y=object?.y??0){
  if(!object||typeof object!=='object')return object;
  object.x=nearestPixel(x);
  object.y=nearestPixel(y);
  motionCarry.delete(object);
  return object;
}

function snapPixelPosition(object){
  if(!object||typeof object!=='object')return object;
  const previous=motionCarry.get(object)??{x:0,y:0};
  const rawX=Number.isFinite(Number(object.x))?Number(object.x):0;
  const rawY=Number.isFinite(Number(object.y))?Number(object.y):0;
  const combinedX=rawX+previous.x;
  const combinedY=rawY+previous.y;
  const snappedX=Math.round(combinedX);
  const snappedY=Math.round(combinedY);
  motionCarry.set(object,{
    x:combinedX-snappedX,
    y:combinedY-snappedY,
  });
  object.x=snappedX;
  object.y=snappedY;
  return object;
}

function snapStoredCoordinates(object,keys=STORED_COORDINATE_KEYS){
  if(!object||typeof object!=='object')return object;
  for(const key of keys){
    if(Number.isFinite(Number(object[key])))object[key]=nearestPixel(object[key]);
  }
  return object;
}

function snapPositionArray(array){
  if(!Array.isArray(array))return;
  for(const item of array){
    snapPixelPosition(item);
    snapStoredCoordinates(item,STORED_COORDINATE_KEYS.filter(key=>key!=='x'&&key!=='y'));
  }
}

function snapGamePositions(state){
  if(!state)return;
  snapPixelPosition(state.player);
  snapStoredCoordinates(state.input,['pointerX','pointerY']);
  snapStoredCoordinates(state.toolEffect,['x','y']);

  const entities=state.entities??{};
  snapPixelPosition(entities.hook);
  for(const key of [
    'bullets',
    'napalmShots',
    'glaives',
    'grenades',
    'drones',
    'droneRockets',
    'bosses',
    'bossFireballs',
    'serpentProjectiles',
    'bossProjectiles',
    'explosions',
    'seedParticles',
    'pickups',
    'laserSparks',
    'nyanCats',
    'nyanSparks',
    'realitySparks',
    'enemyNests',
    'invasionPortals',
    'furniture',
    'juiceParticles',
    'damageNumbers',
    'juiceFlashes',
    'juiceShockwaves',
  ])snapPositionArray(entities[key]);

  for(const chunk of state.world?.activeChunks??[]){
    snapPositionArray(chunk.enemies);
  }

  snapPositionArray(state.weather?.flashes);
}

function objectHasFractionalCoordinate(object,keys=STORED_COORDINATE_KEYS){
  if(!object||typeof object!=='object')return false;
  return keys.some(key=>Number.isFinite(Number(object[key]))&&!Number.isInteger(Number(object[key])));
}

function listFractionalPositions(state){
  const failures=[];
  const inspect=(label,object,keys=STORED_COORDINATE_KEYS)=>{
    if(!object||typeof object!=='object')return;
    for(const key of keys){
      const value=Number(object[key]);
      if(Number.isFinite(value)&&!Number.isInteger(value))failures.push(`${label}.${key}=${value}`);
    }
  };

  inspect('player',state?.player);
  inspect('input',state?.input,['pointerX','pointerY']);
  inspect('toolEffect',state?.toolEffect,['x','y']);
  const entities=state?.entities??{};
  inspect('hook',entities.hook);
  for(const key of [
    'bullets','napalmShots','glaives','grenades','drones','droneRockets',
    'bosses','bossFireballs','serpentProjectiles','bossProjectiles','explosions',
    'seedParticles','pickups','laserSparks','nyanCats','nyanSparks','realitySparks',
    'enemyNests','invasionPortals','furniture','juiceParticles','damageNumbers','juiceFlashes','juiceShockwaves',
  ]){
    for(let index=0;index<(entities[key]?.length??0);index++)inspect(`${key}[${index}]`,entities[key][index]);
  }
  for(let index=0;index<(state?.weather?.flashes?.length??0);index++)inspect(`weather.flashes[${index}]`,state.weather.flashes[index]);
  for(const [chunkKey,chunk] of state?.world?.chunks?.entries?.()??[]){
    for(let index=0;index<(chunk.enemies?.length??0);index++)inspect(`chunk(${chunkKey}).enemies[${index}]`,chunk.enemies[index]);
  }
  for(const [plantId,plant] of state?.world?.plants?.entries?.()??[]){
    inspect(`plant(${plantId})`,plant,['baseX','baseY']);
    for(let index=0;index<(plant.cells?.length??0);index++)inspect(`plant(${plantId}).cells[${index}]`,plant.cells[index],['x','y']);
  }
  return failures;
}

function positionsAreInteger(state){
  return listFractionalPositions(state).length===0;
}

Object.assign(exports,{POSITION_KEYS,STORED_COORDINATE_KEYS,nearestPixel,placeOnPixel,snapPixelPosition,snapStoredCoordinates,snapGamePositions,listFractionalPositions,positionsAreInteger});

};

__modules["src/state/game-state.js"]=function(exports,__require){
const { PLAYER_CONFIG, MAGNIFIER_CONFIG } = __require("src/config.js");
const { WeaponId } = __require("src/data/weapons.db.js");
const { createWorldStore } = __require("src/stores/world-store.js");
const { createEntityStore } = __require("src/stores/entity-store.js");
const { createInventoryStore } = __require("src/stores/inventory-store.js");
function createGameState(){
  return {
    seed:1,
    frame:0,
    paused:false,
    crystals:0,
    weaponId:WeaponId.GUN,
    cooldown:0,
    jumpBuffer:0,
    coyoteFrames:0,
    swordTimer:0,
    swordAngle:0,
    toolEffect:{frames:0,x:0,y:0,kind:'destroy',valid:false},
    laser:{active:false,heat:0,overheated:false,beam:null,contactHeat:0,hotPixels:[]},
    realityZipper:{active:false,phase:'idle'},
    juice:{
      shake:0,shakeFrames:0,hitStopFrames:0,screenFlash:0,screenFlashMax:0,
      screenFlashColor:'rgba(255,255,255,.2)',recoilFrames:0,recoilX:0,
      playerSquash:0,playerStretch:0,hudPulse:0,celebrationFrames:0,speedIntensity:0,
    },
    build:{active:false,equippedMaterial:null,equippedFurnitureId:null},
    seedMode:{active:false,cropId:null},
    player:{
      x:20,
      y:45,
      vx:0,
      vy:0,
      width:PLAYER_CONFIG.width,
      height:PLAYER_CONFIG.height,
      hp:100,
      hunger:100,
      hungerRemainder:0,
      starvationTimer:0,
      breath:100,
      breathRemainder:0,
      drowningTimer:0,
      status:{lava:false,fire:false,steam:false,starving:false,swimming:false,headSubmerged:false,breathUsing:false,noOxygen:false},
      grounded:false,
      invulnerability:0,
      locked:false,
      facing:1,
      skySpawn:false,
      spawnGroundY:0,
      stolenWeaponId:null,
      weaponTheftCooldown:0,
      attachedParasites:[],
      parasiteSlowMultiplier:1,
      furnitureMode:'',
      furnitureSeatId:null,
      bunnyHop:{
        chain:0,
        landingWindow:0,
        groundFrames:0,
        lastLandingFrame:-9999,
        lastJumpFrame:-9999,
      },
    },
    ui:{
      message:'',
      messageUntil:0,
      toolStatus:'',
      inventoryOpen:false,
      inventoryIndex:0,
      craftingOpen:false,
      craftingIndex:0,
      inventoryRects:[],
      pickupFeed:[],
      damageFlash:0,
      damageDirection:0,
      regionBanner:'',
      regionBannerUntil:0,
      worldMenuOpen:false,
      worldSlotIndex:0,
      worldMenuReturnPaused:false,
      confirmWorldAction:'',
      confirmWorldSlot:0,
      saveSlots:[],
      saveStatus:'',
      saveStatusUntil:0,
      bossRitual:null,
      contextPrompt:'',
      hud:Object.create(null),
    },
    input:{
      keys:new Set(),
      pointerDown:false,
      pointerInside:false,
      pointerButton:0,
      touchMode:false,
      pointerX:130,
      pointerY:50,
      portalCodeBuffer:'',
      portalCodeUntil:0,
      moonMeIndex:0,
      moonMeUntil:0,
    },
    magnifier:{
      zoom:MAGNIFIER_CONFIG.minZoom,
      radius:MAGNIFIER_CONFIG.radius,
    },
    save:{
      activeSlot:1,
      lastSavedAt:0,
      dirty:true,
    },
    weather:{
      overrideType:null,
      currentType:'clear',
      previousType:'clear',
      segment:-1,
      intensity:0,
      windX:0,
      visibility:1,
      nextLightningFrame:0,
      flashes:[],
    },
    world:createWorldStore(),
    entities:createEntityStore(),
    inventory:createInventoryStore(),
  };
}

Object.assign(exports,{createGameState});

};

__modules["src/stores/world-store.js"]=function(exports,__require){
const { createDimensionPositionMap, createDimensionEntityMap } = __require("src/data/dimensions.db.js");
function createWorldStore(){
  return {
    dimension:'earth',
    dimensionPositions:createDimensionPositionMap(),
    dimensionEntities:createDimensionEntityMap(),
    chunks:new Map(),
    activeChunks:[],
    activeKeys:new Set(),
    camera:{chunkX:0,chunkY:0},
    simulationStamp:1,
    plants:new Map(),
    nextPlantId:1,
    firstVolcanoRegionIndex:null,
    bossSpawned:false,
    bossDefeated:false,
    firstOceanRegionIndex:null,
    seaSerpentSpawned:false,
    seaSerpentDefeated:false,
    bossEncounters:Object.create(null),
    defeatedBossCount:0,
    bossCooldownUntil:0,
    travelOriginX:20,
    moonReached:false,
    visitedDimensions:{earth:true},
    rocketFlight:{active:false,phase:'idle',timer:0},
    dimensionPortal:{active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:'moon'},
    moonPortal:null,
    nextInvasionFrame:null,
    invasionCount:0,
    invasionSerial:1,
  };
}

Object.assign(exports,{createWorldStore});

};

__modules["src/data/dimensions.db.js"]=function(exports,__require){
const { MaterialId } = __require("src/data/materials.db.js");
const { WeatherType } = __require("src/data/weather.db.js");
const M=MaterialId;
const W=WeatherType;

const DimensionId=Object.freeze({
  EARTH:'earth',
  MOON:'moon',
  EMBERDEEP:'emberdeep',
  FROSTVOID:'frostvoid',
  PRISM:'prism',
  ABYSS:'abyss',
  VERDANT:'verdant',
  CLOCKWORK:'clockwork',
  DREAM:'dream',
  SKYREALM:'skyrealm',
  STATIC:'static',
});

const DIMENSION_DB=Object.freeze([
  {
    id:DimensionId.EARTH,name:'Earth',code:'homeward',terrain:'earth',gravity:1,oxygen:true,
    skyTop:[91,166,224],skyBottom:[151,201,229],materialTint:[128,128,128],tintStrength:0,
    weather:[W.CLEAR,W.BREEZE,W.RAIN,W.THUNDERSTORM,W.FOG,W.SNOW,W.HEATWAVE],
    portalColors:['rgb(84,198,126)','rgb(92,174,255)','rgb(240,231,159)','rgb(244,250,255)'],
    structure:'earth',spawnX:20,
  },
  {
    id:DimensionId.MOON,name:'Moon',code:'moonme',terrain:'moon',gravity:.38,oxygen:false,
    skyTop:[7,9,21],skyBottom:[28,30,55],materialTint:[172,164,215],tintStrength:.14,
    weather:[W.CLEAR],portalColors:['rgb(91,229,255)','rgb(130,128,255)','rgb(207,92,255)','rgb(255,103,205)','rgb(244,238,255)'],
    structure:'lunar',spawnX:48,
  },
  {
    id:DimensionId.EMBERDEEP,name:'Emberdeep',code:'burnbright',terrain:'ember',gravity:1.08,oxygen:false,
    skyTop:[35,8,12],skyBottom:[146,47,24],materialTint:[226,74,36],tintStrength:.22,
    weather:[W.ASHFALL,W.HEATWAVE],portalColors:['rgb(255,235,126)','rgb(255,121,31)','rgb(214,38,28)','rgb(76,12,21)'],
    structure:'ember_fortress',spawnX:48,
  },
  {
    id:DimensionId.FROSTVOID,name:'Frostvoid',code:'coldsnap',terrain:'frost',gravity:.82,oxygen:true,
    skyTop:[15,34,67],skyBottom:[105,167,207],materialTint:[154,215,244],tintStrength:.22,
    weather:[W.SNOW,W.BLIZZARD,W.FOG],portalColors:['rgb(244,255,255)','rgb(148,226,255)','rgb(79,148,235)','rgb(95,74,202)'],
    structure:'ice_cathedral',spawnX:48,
  },
  {
    id:DimensionId.PRISM,name:'Prismatica',code:'neonpulse',terrain:'prism',gravity:.72,oxygen:true,
    skyTop:[39,14,74],skyBottom:[217,84,188],materialTint:[214,112,242],tintStrength:.18,
    weather:[W.CLEAR,W.BREEZE],portalColors:['rgb(255,80,190)','rgb(255,222,72)','rgb(67,255,176)','rgb(72,188,255)','rgb(176,84,255)'],
    structure:'prism_spire',spawnX:48,
  },
  {
    id:DimensionId.ABYSS,name:'Blacktide Abyss',code:'blacktide',terrain:'abyss',gravity:.9,oxygen:false,
    skyTop:[2,13,27],skyBottom:[10,54,78],materialTint:[38,112,154],tintStrength:.24,
    weather:[W.OCEAN_STORM,W.FOG],portalColors:['rgb(27,54,82)','rgb(29,136,174)','rgb(78,230,224)','rgb(8,18,36)'],
    structure:'drowned_dome',spawnX:48,
  },
  {
    id:DimensionId.VERDANT,name:'Verdant Wilds',code:'growwild',terrain:'verdant',gravity:.92,oxygen:true,
    skyTop:[25,87,64],skyBottom:[112,205,118],materialTint:[70,178,86],tintStrength:.2,
    weather:[W.RAIN,W.FOG,W.BREEZE],portalColors:['rgb(236,255,137)','rgb(88,232,105)','rgb(34,145,78)','rgb(19,75,55)'],
    structure:'living_temple',spawnX:48,
  },
  {
    id:DimensionId.CLOCKWORK,name:'Clockwork Expanse',code:'ticktock',terrain:'clockwork',gravity:1.25,oxygen:false,
    skyTop:[42,35,31],skyBottom:[148,105,59],materialTint:[194,136,65],tintStrength:.19,
    weather:[W.BREEZE,W.CLEAR],portalColors:['rgb(255,225,139)','rgb(210,144,53)','rgb(111,79,48)','rgb(239,241,224)'],
    structure:'gear_tower',spawnX:48,
  },
  {
    id:DimensionId.DREAM,name:'Lucid Dream',code:'lucidloop',terrain:'dream',gravity:.48,oxygen:true,
    skyTop:[48,19,89],skyBottom:[235,108,195],materialTint:[194,89,210],tintStrength:.22,
    weather:[W.SPORE_HAZE,W.FOG],portalColors:['rgb(255,165,245)','rgb(169,104,255)','rgb(81,231,255)','rgb(255,247,181)'],
    structure:'impossible_house',spawnX:48,
  },
  {
    id:DimensionId.SKYREALM,name:'Cloudsea',code:'cloudnine',terrain:'skylands',gravity:.32,oxygen:true,
    skyTop:[70,137,225],skyBottom:[230,242,255],materialTint:[177,215,244],tintStrength:.12,
    weather:[W.BREEZE,W.THUNDERSTORM],portalColors:['rgb(255,255,255)','rgb(166,228,255)','rgb(94,177,255)','rgb(255,229,124)'],
    structure:'cloud_shrine',spawnX:48,
  },
  {
    id:DimensionId.STATIC,name:'The Static',code:'glitchme',terrain:'static',gravity:.66,oxygen:false,
    skyTop:[7,2,15],skyBottom:[47,9,61],materialTint:[86,255,202],tintStrength:.2,
    weather:[W.FOG,W.THUNDERSTORM],portalColors:['rgb(255,44,198)','rgb(53,255,205)','rgb(255,245,65)','rgb(112,64,255)','rgb(245,245,245)'],
    structure:'glitch_obelisk',spawnX:48,
  },
]);

const BY_ID=new Map(DIMENSION_DB.map(item=>[item.id,item]));
const BY_CODE=new Map(DIMENSION_DB.map(item=>[item.code,item]));

const DIMENSION_IDS=Object.freeze(DIMENSION_DB.map(item=>item.id));
const PORTAL_CODES=Object.freeze(DIMENSION_DB.map(item=>({code:item.code,dimension:item.id})));
const MAX_PORTAL_CODE_LENGTH=Math.max(...DIMENSION_DB.map(item=>item.code.length));

function dimensionDefinition(id){ return BY_ID.get(id)??BY_ID.get(DimensionId.EARTH); }
function dimensionByCode(code){ return BY_CODE.get(String(code??'').toLowerCase())??null; }
function isEarthDimension(id){ return id===DimensionId.EARTH; }
function isMoonDimension(id){ return id===DimensionId.MOON; }
function dimensionName(id){ return dimensionDefinition(id).name; }
function dimensionHasOxygen(id){ return dimensionDefinition(id).oxygen!==false; }
function createDimensionPositionMap(){
  const result=Object.create(null);
  for(const definition of DIMENSION_DB)result[definition.id]={x:definition.spawnX??48,y:45};
  return result;
}
function createDimensionEntityMap(){
  const result=Object.create(null);
  for(const definition of DIMENSION_DB)result[definition.id]=Object.create(null);
  return result;
}

function dimensionSurfaceProfile(id,x,noise1,randomAt){
  const d=dimensionDefinition(id);
  const worldX=Math.floor(x);
  const baseMix={dominant:0,entries:[{id:0,weight:1,regionIndex:0}],weight(){return 0;}};
  let ground=58;
  let water=ground;
  let lake=false;
  let ocean=false;

  switch(d.terrain){
    case 'moon':{
      const basin=(noise1(worldX,280,9101)-.5)*10;
      const crater=(noise1(worldX,74,9102)-.5)*8;
      const micro=(noise1(worldX,19,9103)-.5)*2;
      const craterCenter=Math.floor(worldX/58)*58+29;
      const distance=Math.abs(worldX-craterCenter);
      ground=Math.floor(58+basin+crater+micro+Math.max(0,1-distance/16)*6-Math.max(0,1-Math.abs(distance-15)/6)*2);
      break;
    }
    case 'ember':
      ground=Math.floor(58+(noise1(worldX,125,9301)-.5)*19+(noise1(worldX,31,9302)-.5)*5);
      break;
    case 'frost':
      ground=Math.floor(56+(noise1(worldX,230,9311)-.5)*18-(Math.max(0,noise1(worldX,82,9312)-.58))*25);
      break;
    case 'prism':{
      const facet=Math.round((noise1(Math.floor(worldX/12)*12,90,9321)-.5)*17);
      ground=57+facet+Math.round(Math.sin(worldX*.035)*3);
      break;
    }
    case 'abyss':
      ground=Math.floor(86+(noise1(worldX,180,9331)-.5)*14+(noise1(worldX,45,9332)-.5)*5);
      water=24;
      lake=true;
      ocean=true;
      break;
    case 'verdant':
      ground=Math.floor(61+(noise1(worldX,250,9341)-.5)*12+(noise1(worldX,52,9342)-.5)*5);
      break;
    case 'clockwork':{
      const step=Math.floor(worldX/24);
      ground=54+Math.floor(randomAt(step,0,9351)*5)*4;
      break;
    }
    case 'dream':
      ground=Math.floor(58+Math.sin(worldX*.023)*9+Math.sin(worldX*.071)*4+(noise1(worldX,180,9361)-.5)*7);
      break;
    case 'skylands':
      ground=Math.floor(50+(noise1(worldX,190,9371)-.5)*16+Math.sin(worldX*.018)*4);
      break;
    case 'static':{
      const block=Math.floor(worldX/18);
      ground=48+Math.floor(randomAt(block,1,9381)*7)*5+((block%5===0)?8:0);
      break;
    }
    default:
      break;
  }

  ground=Math.max(28,Math.min(96,ground));
  return {
    ground,water,lake,ocean,oceanWeight:ocean?1:0,lakeDepth:ocean?Math.max(0,ground-water):0,
    biome:d.id,mix:baseMix,
  };
}

function dimensionMaterialAt(id,x,y,surface,noise2,randomAt){
  const d=dimensionDefinition(id);
  const depth=y-surface.ground;
  if(d.terrain==='abyss'){
    if(y<surface.water)return M.AIR;
    if(y<surface.ground)return M.WATER;
  }else if(y<surface.ground){
    return M.AIR;
  }

  if(d.terrain==='skylands'){
    if(depth<0)return M.AIR;
    const thickness=7+Math.floor(noise2(x,surface.ground,80,9471)*7);
    if(depth>thickness)return M.AIR;
    if(depth===0)return M.GRASS;
    if(depth<4)return M.DIRT;
    return randomAt(x,y,9472)>.91?M.CRYSTAL:M.ROCK;
  }

  if(d.terrain==='static'){
    if(depth<0)return M.AIR;
    const glitch=randomAt(Math.floor(x/3),Math.floor(y/3),9481);
    if(depth>5&&glitch>.91)return M.AIR;
    if(depth===0)return (Math.floor(x/7)%3===0)?M.CRYSTAL:M.ASH;
    if(glitch<.12)return M.CRYSTAL;
    if(glitch<.2)return M.MYCELIUM;
    return M.ROCK;
  }

  const cave=noise2(x,y,d.terrain==='clockwork'?38:58,9400+d.id.length)*.68+noise2(x,y,21,9410+d.id.length)*.32;
  const caveThreshold=d.terrain==='dream'?.68:d.terrain==='verdant'?.75:.79;
  if(depth>12&&cave>caveThreshold)return M.AIR;

  switch(d.terrain){
    case 'moon':
      if(depth===0)return M.SAND;
      if(depth<5)return randomAt(x,y,9110)>.82?M.CRYSTAL:M.SAND;
      if(depth<18&&randomAt(x,y,9111)>.92)return M.CRYSTAL;
      return M.ROCK;
    case 'ember':
      if(depth===0)return M.ASH;
      if(depth<5)return randomAt(x,y,9421)>.8?M.LAVA:M.ASH;
      if(depth>18&&noise2(x,y,34,9422)>.79)return M.LAVA;
      return randomAt(x,y,9423)>.94?M.CRYSTAL:M.ROCK;
    case 'frost':
      if(depth===0)return M.SNOW;
      if(depth<6)return randomAt(x,y,9431)>.7?M.CRYSTAL:M.SNOW;
      if(depth>16&&noise2(x,y,44,9432)>.86)return M.WATER;
      return M.ROCK;
    case 'prism':
      if(depth===0)return M.CRYSTAL;
      if(depth<9)return ((x+y)%5===0)?M.SAND:M.CRYSTAL;
      return randomAt(x,y,9441)>.62?M.CRYSTAL:M.ROCK;
    case 'abyss':
      if(depth===0)return M.SAND;
      if(depth<8)return randomAt(x,y,9451)>.88?M.CRYSTAL:M.SAND;
      return noise2(x,y,42,9452)>.89?M.CRYSTAL:M.ROCK;
    case 'verdant':
      if(depth===0)return M.GRASS;
      if(depth<10)return randomAt(x,y,9461)>.93?M.MYCELIUM:M.DIRT;
      if(depth<28&&noise2(x,y,33,9462)>.87)return M.WOOD;
      return M.ROCK;
    case 'clockwork':
      if(depth===0)return M.ROCK;
      if(depth<6)return ((Math.floor(x/4)+Math.floor(y/4))%2===0)?M.CRYSTAL:M.ROCK;
      if(depth>18&&Math.abs((x%24+24)%24-12)<2)return M.AIR;
      return randomAt(x,y,9465)>.86?M.CRYSTAL:M.ROCK;
    case 'dream':
      if(depth===0)return M.MYCELIUM;
      if(depth<7)return randomAt(x,y,9468)>.62?M.MUSHROOM_CAP:M.MYCELIUM;
      if(depth<20&&noise2(x,y,27,9469)>.83)return M.MUSHROOM_STEM;
      return randomAt(x,y,9470)>.9?M.CRYSTAL:M.ROCK;
    default:
      return M.ROCK;
  }
}

Object.assign(exports,{DimensionId,DIMENSION_DB,DIMENSION_IDS,PORTAL_CODES,MAX_PORTAL_CODE_LENGTH,dimensionDefinition,dimensionByCode,isEarthDimension,isMoonDimension,dimensionName,dimensionHasOxygen,createDimensionPositionMap,createDimensionEntityMap,dimensionSurfaceProfile,dimensionMaterialAt});

};

__modules["src/data/weather.db.js"]=function(exports,__require){
const WeatherType = Object.freeze({
  CLEAR:'clear',
  BREEZE:'breeze',
  RAIN:'rain',
  THUNDERSTORM:'thunderstorm',
  SNOW:'snow',
  BLIZZARD:'blizzard',
  FOG:'fog',
  HEATWAVE:'heatwave',
  ASHFALL:'ashfall',
  OCEAN_STORM:'ocean_storm',
  CAVE_DRIP:'cave_drip',
  SPORE_HAZE:'spore_haze',
});

const W=WeatherType;

const WEATHER_DB = Object.freeze({
  [W.CLEAR]:{label:'Clear',precipitation:null,wind:0,visibility:1,lightning:false,growthMultiplier:1},
  [W.BREEZE]:{label:'Breezy',precipitation:null,wind:.55,visibility:1,lightning:false,growthMultiplier:1},
  [W.RAIN]:{label:'Rain',precipitation:'rain',wind:.28,visibility:.9,lightning:false,growthMultiplier:1.35},
  [W.THUNDERSTORM]:{label:'Thunderstorm',precipitation:'rain',wind:.72,visibility:.73,lightning:true,growthMultiplier:1.5},
  [W.SNOW]:{label:'Snowfall',precipitation:'snow',wind:.2,visibility:.9,lightning:false,growthMultiplier:.85},
  [W.BLIZZARD]:{label:'Blizzard',precipitation:'snow',wind:.92,visibility:.58,lightning:false,growthMultiplier:.62},
  [W.FOG]:{label:'Dense fog',precipitation:null,wind:.05,visibility:.56,lightning:false,growthMultiplier:1.05},
  [W.HEATWAVE]:{label:'Heatwave',precipitation:null,wind:.12,visibility:.88,lightning:false,growthMultiplier:.78},
  [W.ASHFALL]:{label:'Ashfall',precipitation:'ash',wind:.38,visibility:.7,lightning:false,growthMultiplier:.68},
  [W.OCEAN_STORM]:{label:'Ocean storm',precipitation:'rain',wind:1,visibility:.62,lightning:true,growthMultiplier:1.45},
  [W.CAVE_DRIP]:{label:'Cave drips',precipitation:'drip',wind:0,visibility:.92,lightning:false,growthMultiplier:1.1},
  [W.SPORE_HAZE]:{label:'Spore haze',precipitation:'spore',wind:.08,visibility:.7,lightning:false,growthMultiplier:1.22},
});

function weatherDefinition(type){
  return WEATHER_DB[type]??WEATHER_DB[W.CLEAR];
}

Object.assign(exports,{WeatherType,WEATHER_DB,weatherDefinition});

};

__modules["src/stores/entity-store.js"]=function(exports,__require){
function createEntityStore(){
  return {
    bullets:[],
    napalmShots:[],
    glaives:[],
    grenades:[],
    drones:[],
    droneRockets:[],
    bosses:[],
    bossFireballs:[],
    serpentProjectiles:[],
    bossProjectiles:[],
    explosions:[],
    seedParticles:[],
    pickups:[],
    laserSparks:[],
    nyanCats:[],
    nyanSparks:[],
    realityRifts:[],
    realitySparks:[],
    enemyNests:[],
    invasionPortals:[],
    furniture:[],
    juiceParticles:[],
    damageNumbers:[],
    juiceFlashes:[],
    juiceShockwaves:[],
    hook:{active:false,stuck:false,x:0,y:0,vx:0,vy:0},
  };
}

Object.assign(exports,{createEntityStore});

};

__modules["src/stores/inventory-store.js"]=function(exports,__require){
const { MATERIAL_COUNT, PLACEABLE_MATERIALS } = __require("src/data/materials.db.js");
const { cropById } = __require("src/data/crops.db.js");
const { lootById } = __require("src/data/fauna.db.js");
const { furnitureById } = __require("src/data/furniture.db.js");
function createInventoryStore(){
  const counts=new Uint32Array(MATERIAL_COUNT);
  const order=[];
  const itemCounts=new Map();
  const itemOrder=[];
  const lootCounts=new Map();
  const lootOrder=[];
  const furnitureCounts=new Map();
  const furnitureOrder=[];

  const itemKey=(kind,cropId)=>`${kind}:${cropId}`;

  function add(materialId,amount=1){
    if(amount<=0)return counts[materialId]??0;
    if(counts[materialId]===0)order.push(materialId);
    counts[materialId]+=amount;
    return counts[materialId];
  }

  function remove(materialId,amount=1){
    if(amount<=0)return true;
    if((counts[materialId]??0)<amount)return false;
    counts[materialId]-=amount;
    if(counts[materialId]===0){
      const index=order.indexOf(materialId);
      if(index>=0)order.splice(index,1);
    }
    return true;
  }

  function addItem(kind,cropId,amount=1){
    if(amount<=0||!cropById(cropId))return 0;
    const key=itemKey(kind,cropId);
    const current=itemCounts.get(key)??0;
    if(current===0)itemOrder.push(key);
    itemCounts.set(key,current+amount);
    return current+amount;
  }

  function removeItem(kind,cropId,amount=1){
    if(amount<=0)return true;
    const key=itemKey(kind,cropId);
    const current=itemCounts.get(key)??0;
    if(current<amount)return false;
    const next=current-amount;
    if(next===0){
      itemCounts.delete(key);
      const index=itemOrder.indexOf(key);
      if(index>=0)itemOrder.splice(index,1);
    }else{
      itemCounts.set(key,next);
    }
    return true;
  }

  function itemCount(kind,cropId){
    return itemCounts.get(itemKey(kind,cropId))??0;
  }

  function addSeed(cropId,amount=1){ return addItem('seed',cropId,amount); }
  function removeSeed(cropId,amount=1){ return removeItem('seed',cropId,amount); }
  function seedCount(cropId){ return itemCount('seed',cropId); }
  function addProduce(cropId,amount=1){ return addItem('produce',cropId,amount); }
  function removeProduce(cropId,amount=1){ return removeItem('produce',cropId,amount); }
  function produceCount(cropId){ return itemCount('produce',cropId); }

  function addLoot(lootId,amount=1){
    if(amount<=0||!lootById(lootId))return 0;
    const current=lootCounts.get(lootId)??0;
    if(current===0)lootOrder.push(lootId);
    lootCounts.set(lootId,current+amount);
    return current+amount;
  }

  function removeLoot(lootId,amount=1){
    if(amount<=0)return true;
    const current=lootCounts.get(lootId)??0;
    if(current<amount)return false;
    const next=current-amount;
    if(next===0){
      lootCounts.delete(lootId);
      const index=lootOrder.indexOf(lootId);
      if(index>=0)lootOrder.splice(index,1);
    }else lootCounts.set(lootId,next);
    return true;
  }

  function lootCount(lootId){ return lootCounts.get(lootId)??0; }

  function addFurniture(furnitureId,amount=1){
    if(amount<=0||!furnitureById(furnitureId))return 0;
    const current=furnitureCounts.get(furnitureId)??0;
    if(current===0)furnitureOrder.push(furnitureId);
    furnitureCounts.set(furnitureId,current+amount);
    return current+amount;
  }

  function removeFurniture(furnitureId,amount=1){
    if(amount<=0)return true;
    const current=furnitureCounts.get(furnitureId)??0;
    if(current<amount)return false;
    const next=current-amount;
    if(next===0){
      furnitureCounts.delete(furnitureId);
      const index=furnitureOrder.indexOf(furnitureId);
      if(index>=0)furnitureOrder.splice(index,1);
    }else furnitureCounts.set(furnitureId,next);
    return true;
  }

  function furnitureCount(furnitureId){ return furnitureCounts.get(furnitureId)??0; }

  function clear(){
    counts.fill(0);
    order.length=0;
    itemCounts.clear();
    itemOrder.length=0;
    lootCounts.clear();
    lootOrder.length=0;
    furnitureCounts.clear();
    furnitureOrder.length=0;
  }

  function list(){
    const materials=order
      .filter(materialId=>counts[materialId]>0)
      .map(materialId=>({
        kind:'material',
        key:`material:${materialId}`,
        materialId,
        count:counts[materialId],
        placeable:PLACEABLE_MATERIALS.has(materialId),
      }));

    const cropItems=itemOrder.flatMap(key=>{
      const count=itemCounts.get(key)??0;
      if(count<=0)return[];
      const [kind,idText]=key.split(':');
      const cropId=Number(idText);
      const crop=cropById(cropId);
      if(!crop)return[];
      return [{
        kind,
        key,
        cropId,
        count,
        placeable:false,
        name:kind==='seed'?crop.seedName:crop.produceName,
      }];
    });

    const furnitureItems=furnitureOrder.flatMap(furnitureId=>{
      const count=furnitureCounts.get(furnitureId)??0;
      const furniture=furnitureById(furnitureId);
      if(count<=0||!furniture)return[];
      return [{kind:'furniture',key:`furniture:${furnitureId}`,furnitureId,count,placeable:true,name:furniture.name}];
    });

    const lootItems=lootOrder.flatMap(lootId=>{
      const count=lootCounts.get(lootId)??0;
      const loot=lootById(lootId);
      if(count<=0||!loot)return[];
      return [{kind:'loot',key:`loot:${lootId}`,lootId,count,placeable:false,name:loot.name,edible:Boolean(loot.edible),cookTo:loot.cookTo??null}];
    });

    return [...materials,...furnitureItems,...cropItems,...lootItems];
  }

  return {
    counts,
    order,
    itemCounts,
    itemOrder,
    lootCounts,
    lootOrder,
    furnitureCounts,
    furnitureOrder,
    add,
    remove,
    addItem,
    removeItem,
    itemCount,
    addSeed,
    removeSeed,
    seedCount,
    addProduce,
    removeProduce,
    produceCount,
    addLoot,
    removeLoot,
    lootCount,
    addFurniture,
    removeFurniture,
    furnitureCount,
    clear,
    list,
  };
}

Object.assign(exports,{createInventoryStore});

};

__modules["src/data/crops.db.js"]=function(exports,__require){
const CropId = Object.freeze({
  CARROT:1,
  POTATO:2,
  TOMATO:3,
  CORN:4,
  PUMPKIN:5,
  STRAWBERRY:6,
  BLUEBERRY:7,
  PEPPER:8,
  CUCUMBER:9,
  EGGPLANT:10,
  CABBAGE:11,
  SUNFLOWER:12,
});

const C=CropId;

const CROP_DB = Object.freeze([
  null,
  { id:C.CARROT, name:'carrot', seedName:'carrot seeds', produceName:'carrot', pattern:'root', matureHeight:4, canopyRadius:2, heal:7, produceMin:2, produceMax:4, seedMin:2, seedMax:5, stem:[76,151,70], leaf:[55,174,69], fruit:[235,112,37], seed:[147,105,58] },
  { id:C.POTATO, name:'potato', seedName:'seed potatoes', produceName:'potato', pattern:'bush', matureHeight:5, canopyRadius:3, heal:8, produceMin:3, produceMax:6, seedMin:2, seedMax:4, stem:[82,139,74], leaf:[61,151,69], fruit:[190,150,89], seed:[169,127,75] },
  { id:C.TOMATO, name:'tomato', seedName:'tomato seeds', produceName:'tomato', pattern:'vine', matureHeight:8, canopyRadius:3, heal:9, produceMin:3, produceMax:7, seedMin:3, seedMax:6, stem:[63,151,70], leaf:[43,133,57], fruit:[226,55,47], seed:[209,184,92] },
  { id:C.CORN, name:'corn', seedName:'corn kernels', produceName:'corn cob', pattern:'stalk', matureHeight:11, canopyRadius:2, heal:10, produceMin:2, produceMax:4, seedMin:4, seedMax:8, stem:[101,167,67], leaf:[73,151,58], fruit:[241,198,55], seed:[218,171,53] },
  { id:C.PUMPKIN, name:'pumpkin', seedName:'pumpkin seeds', produceName:'pumpkin', pattern:'mound', matureHeight:4, canopyRadius:5, heal:15, produceMin:1, produceMax:3, seedMin:4, seedMax:8, stem:[67,137,58], leaf:[47,126,54], fruit:[232,119,32], seed:[218,192,126] },
  { id:C.STRAWBERRY, name:'strawberry', seedName:'strawberry seeds', produceName:'strawberry', pattern:'low_bush', matureHeight:3, canopyRadius:3, heal:6, produceMin:4, produceMax:8, seedMin:3, seedMax:6, stem:[63,147,63], leaf:[45,139,55], fruit:[225,47,65], seed:[244,205,77] },
  { id:C.BLUEBERRY, name:'blueberry', seedName:'blueberry seeds', produceName:'blueberries', pattern:'bush', matureHeight:6, canopyRadius:4, heal:7, produceMin:4, produceMax:9, seedMin:3, seedMax:6, stem:[83,121,67], leaf:[54,128,71], fruit:[72,83,185], seed:[156,112,72] },
  { id:C.PEPPER, name:'pepper', seedName:'pepper seeds', produceName:'pepper', pattern:'bush', matureHeight:6, canopyRadius:3, heal:8, produceMin:3, produceMax:6, seedMin:3, seedMax:7, stem:[62,144,65], leaf:[47,128,57], fruit:[221,62,48], seed:[225,195,102] },
  { id:C.CUCUMBER, name:'cucumber', seedName:'cucumber seeds', produceName:'cucumber', pattern:'vine', matureHeight:7, canopyRadius:5, heal:9, produceMin:3, produceMax:6, seedMin:3, seedMax:7, stem:[59,144,63], leaf:[44,132,58], fruit:[79,169,75], seed:[214,194,128] },
  { id:C.EGGPLANT, name:'eggplant', seedName:'eggplant seeds', produceName:'eggplant', pattern:'bush', matureHeight:7, canopyRadius:3, heal:10, produceMin:2, produceMax:5, seedMin:3, seedMax:6, stem:[72,139,68], leaf:[52,125,65], fruit:[112,54,145], seed:[201,169,104] },
  { id:C.CABBAGE, name:'cabbage', seedName:'cabbage seeds', produceName:'cabbage', pattern:'rosette', matureHeight:3, canopyRadius:4, heal:12, produceMin:1, produceMax:3, seedMin:3, seedMax:6, stem:[72,144,74], leaf:[78,163,91], fruit:[130,189,112], seed:[150,104,68] },
  { id:C.SUNFLOWER, name:'sunflower', seedName:'sunflower seeds', produceName:'sunflower head', pattern:'flower', matureHeight:12, canopyRadius:3, heal:8, produceMin:1, produceMax:2, seedMin:6, seedMax:12, stem:[76,151,65], leaf:[56,137,57], fruit:[231,176,43], seed:[95,72,52] },
]);

const CROP_IDS = Object.freeze(CROP_DB.filter(Boolean).map(crop=>crop.id));
const CROP_COUNT = CROP_IDS.length;

function cropById(id){
  return CROP_DB[id]??null;
}

function cropName(id){
  return cropById(id)?.name??'unknown crop';
}

Object.assign(exports,{CropId,CROP_DB,CROP_IDS,CROP_COUNT,cropById,cropName});

};

__modules["src/data/fauna.db.js"]=function(exports,__require){
const { BiomeId } = __require("src/data/biomes.db.js");
const { UndergroundBiomeId } = __require("src/data/underground-biomes.db.js");
const B=BiomeId;
const U=UndergroundBiomeId;

const LOOT_DB=Object.freeze([
  {id:'raw_meat',name:'raw meat',color:[188,72,72],cookTo:'cooked_meat'},
  {id:'cooked_meat',name:'cooked meat',color:[174,94,48],edible:true,hungerRestore:34,healthRestore:4},
  {id:'small_hide',name:'small hide',color:[145,101,66]},
  {id:'thick_fur',name:'thick fur',color:[217,220,215]},
  {id:'fine_fur',name:'fine fur',color:[183,127,79]},
  {id:'feather',name:'feather',color:[214,222,230]},
  {id:'bright_feather',name:'bright feather',color:[103,178,194]},
  {id:'egg',name:'wild egg',color:[230,216,165],cookTo:'cooked_egg'},
  {id:'cooked_egg',name:'cooked egg',color:[244,194,88],edible:true,hungerRestore:18,healthRestore:2},
  {id:'horn',name:'horn',color:[195,184,151]},
  {id:'antler',name:'antler',color:[143,103,67]},
  {id:'fang',name:'fang',color:[231,226,202]},
  {id:'claw',name:'claw',color:[204,194,166]},
  {id:'bone',name:'bone',color:[216,211,183]},
  {id:'chitin',name:'chitin plate',color:[82,75,93]},
  {id:'insect_shell',name:'insect shell',color:[100,117,71]},
  {id:'silk',name:'spider silk',color:[220,220,224]},
  {id:'venom_sac',name:'venom sac',color:[115,194,88]},
  {id:'slime_gel',name:'slime gel',color:[91,202,151]},
  {id:'glow_dust',name:'glow dust',color:[190,236,128]},
  {id:'spore_sac',name:'spore sac',color:[191,103,185]},
  {id:'mushroom_flesh',name:'mushroom flesh',color:[210,158,165],cookTo:'roasted_mushroom'},
  {id:'roasted_mushroom',name:'roasted mushroom',color:[151,92,70],edible:true,hungerRestore:16,healthRestore:2},
  {id:'scale',name:'scale',color:[89,151,122]},
  {id:'ember_scale',name:'ember scale',color:[208,83,40]},
  {id:'ember_gland',name:'ember gland',color:[255,151,54]},
  {id:'fish',name:'fresh fish',color:[100,164,196],cookTo:'cooked_fish'},
  {id:'cooked_fish',name:'cooked fish',color:[197,132,76],edible:true,hungerRestore:28,healthRestore:3},
  {id:'fin',name:'fin',color:[83,145,172]},
  {id:'shell',name:'shell',color:[194,165,126]},
  {id:'pearl',name:'pearl',color:[231,226,238]},
  {id:'eel_gland',name:'electric gland',color:[154,174,241]},
  {id:'ink_sac',name:'ink sac',color:[65,57,90]},
  {id:'crab_claw',name:'crab claw',color:[205,94,71],cookTo:'cooked_crab'},
  {id:'cooked_crab',name:'cooked crab',color:[230,130,73],edible:true,hungerRestore:24,healthRestore:3},
  {id:'honeycomb',name:'honeycomb',color:[227,173,55]},
  {id:'ash_core',name:'ash core',color:[92,80,82]},
  {id:'crystal_fragment',name:'crystal fragment',color:[151,132,236]},
]);

const lootByIdMap=new Map(LOOT_DB.map(item=>[item.id,item]));
function lootById(id){ return lootByIdMap.get(id)??null; }

function species(id,name,options){
  return Object.freeze({
    id,name,
    temperament:'passive',
    movement:'ground',
    habitat:'surface',
    biomes:[],
    undergroundBiomes:[],
    hp:12,
    contactDamage:0,
    speed:.32,
    aggroRange:28,
    fleeRange:24,
    width:3,
    height:3,
    hitRadius:2,
    spawnWeight:1,
    groupMin:1,
    groupMax:2,
    animationRate:9,
    sprite:'quadruped',
    palette:[[135,105,76],[205,177,126],[65,52,44]],
    loot:[],
    behaviors:[],
    invasionOnly:false,
    ...options,
  });
}

const FAUNA_DB=Object.freeze([
  // Plains
  species('meadow_hare','meadow hare',{biomes:[B.PLAINS],movement:'hopper',sprite:'hare',hp:8,speed:.48,groupMin:2,groupMax:4,palette:[[181,151,111],[232,215,177],[89,73,58]],loot:[['raw_meat',1,1,.8],['small_hide',1,1,.65]]}),
  species('field_mouse','field mouse',{biomes:[B.PLAINS],sprite:'mouse',hp:5,speed:.4,groupMin:2,groupMax:5,width:2,height:2,palette:[[122,101,82],[211,176,144],[62,53,48]],loot:[['raw_meat',1,1,.35]]}),
  species('prairie_deer','prairie deer',{biomes:[B.PLAINS],sprite:'deer',hp:32,speed:.55,width:5,height:5,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.45,palette:[[161,108,68],[224,188,137],[72,52,40]],loot:[['raw_meat',2,4,1],['small_hide',1,2,1],['antler',1,2,.4]]}),
  species('burrow_badger','burrow badger',{biomes:[B.PLAINS],sprite:'badger',hp:24,speed:.34,width:5,height:3,spawnWeight:.55,palette:[[82,78,75],[213,205,188],[36,35,36]],loot:[['raw_meat',1,2,.8],['small_hide',1,1,1],['claw',1,1,.4]]}),
  species('honey_bee','honey bee',{biomes:[B.PLAINS],habitat:'air',movement:'flying',sprite:'bee',hp:4,speed:.44,groupMin:3,groupMax:7,width:2,height:2,palette:[[224,170,51],[240,224,153],[52,44,38]],loot:[['honeycomb',1,1,.22]]}),
  species('grassland_fox','grassland fox',{biomes:[B.PLAINS],temperament:'hostile',sprite:'fox',hp:20,contactDamage:4,speed:.55,spawnWeight:.7,palette:[[194,100,48],[240,198,132],[71,47,36]],loot:[['raw_meat',1,2,.8],['fine_fur',1,1,1],['fang',1,1,.35]]}),
  species('tusk_boar','tusk boar',{biomes:[B.PLAINS],temperament:'hostile',movement:'charger',sprite:'boar',hp:42,contactDamage:7,speed:.42,width:5,height:4,hitRadius:3,spawnWeight:.42,palette:[[91,70,55],[160,119,85],[225,213,174]],loot:[['raw_meat',2,4,1],['small_hide',1,2,.9],['fang',1,2,.7]]}),
  species('thorn_hornet','thorn hornet',{biomes:[B.PLAINS,B.GIANT_FOREST],habitat:'air',movement:'flying',temperament:'hostile',sprite:'hornet',hp:9,contactDamage:3,speed:.62,groupMin:2,groupMax:4,palette:[[183,124,41],[245,205,91],[42,39,42]],loot:[['insect_shell',1,1,.6],['venom_sac',1,1,.35]]}),

  // Giant forest
  species('red_squirrel','red squirrel',{biomes:[B.GIANT_FOREST],movement:'climber',sprite:'squirrel',hp:7,speed:.5,groupMin:2,groupMax:4,palette:[[174,81,46],[229,155,95],[69,43,34]],loot:[['raw_meat',1,1,.4],['fine_fur',1,1,.55]]}),
  species('forest_deer','forest deer',{biomes:[B.GIANT_FOREST],sprite:'deer',hp:36,speed:.52,width:5,height:5,hitRadius:3,groupMin:2,groupMax:3,spawnWeight:.45,palette:[[122,82,53],[205,157,104],[54,45,38]],loot:[['raw_meat',2,4,1],['small_hide',1,2,1],['antler',1,2,.55]]}),
  species('hedgehog','hedgehog',{biomes:[B.GIANT_FOREST],sprite:'hedgehog',hp:13,speed:.25,width:4,height:3,palette:[[92,67,52],[179,139,93],[44,39,38]],loot:[['raw_meat',1,1,.5],['small_hide',1,1,.35]]}),
  species('songbird','songbird',{biomes:[B.GIANT_FOREST,B.PLAINS],habitat:'air',movement:'flying',sprite:'bird',hp:5,speed:.55,groupMin:2,groupMax:5,palette:[[82,155,185],[222,192,103],[48,55,65]],loot:[['feather',1,2,.8],['egg',1,1,.12]]}),
  species('dusk_owl','dusk owl',{biomes:[B.GIANT_FOREST],habitat:'air',movement:'flying',sprite:'owl',hp:14,speed:.35,spawnWeight:.45,palette:[[103,86,84],[221,198,151],[42,38,42]],loot:[['feather',1,3,1],['fang',1,1,.15]]}),
  species('bark_beetle','bark beetle',{biomes:[B.GIANT_FOREST],movement:'climber',sprite:'beetle',hp:6,speed:.26,groupMin:2,groupMax:5,palette:[[93,74,45],[161,119,62],[39,36,31]],loot:[['insect_shell',1,1,.7]]}),
  species('grey_wolf','grey wolf',{biomes:[B.GIANT_FOREST,B.SNOW_PEAKS],temperament:'hostile',sprite:'wolf',hp:35,contactDamage:6,speed:.62,width:5,height:4,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.55,palette:[[105,112,117],[184,191,193],[46,52,57]],loot:[['raw_meat',2,3,1],['thick_fur',1,2,1],['fang',1,2,.7]]}),
  species('giant_spider','giant spider',{biomes:[B.GIANT_FOREST],movement:'climber',temperament:'hostile',sprite:'spider',hp:22,contactDamage:5,speed:.48,width:5,height:3,hitRadius:3,palette:[[55,47,55],[142,66,79],[27,25,30]],loot:[['chitin',1,2,.9],['silk',1,3,1],['venom_sac',1,1,.45]]}),
  species('stump_mimic','stump mimic',{biomes:[B.GIANT_FOREST],movement:'ambusher',temperament:'hostile',sprite:'mimic',hp:52,contactDamage:8,speed:.3,width:5,height:5,hitRadius:3,spawnWeight:.28,palette:[[87,59,38],[134,94,53],[42,37,31]],loot:[['raw_meat',1,2,.5],['bone',1,2,.5],['crystal_fragment',1,1,.12]]}),
  species('vine_crawler','vine crawler',{biomes:[B.GIANT_FOREST],temperament:'hostile',sprite:'lizard',hp:18,contactDamage:4,speed:.46,groupMin:1,groupMax:3,palette:[[68,135,67],[143,188,80],[39,66,40]],loot:[['scale',1,2,.8],['venom_sac',1,1,.2]]}),

  // Snow peaks
  species('snow_hare','snow hare',{biomes:[B.SNOW_PEAKS],movement:'hopper',sprite:'hare',hp:9,speed:.5,groupMin:2,groupMax:4,palette:[[226,232,231],[181,201,215],[92,101,110]],loot:[['raw_meat',1,1,.8],['thick_fur',1,1,.85]]}),
  species('mountain_goat','mountain goat',{biomes:[B.SNOW_PEAKS],sprite:'goat',hp:38,speed:.48,width:5,height:5,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.55,palette:[[197,194,181],[229,222,201],[89,78,65]],loot:[['raw_meat',2,4,1],['thick_fur',1,2,1],['horn',1,2,.8]]}),
  species('woolly_yak','woolly yak',{biomes:[B.SNOW_PEAKS],sprite:'yak',hp:58,speed:.3,width:6,height:5,hitRadius:4,spawnWeight:.3,palette:[[71,59,55],[126,104,83],[219,205,174]],loot:[['raw_meat',3,5,1],['thick_fur',2,4,1],['horn',1,2,.65]]}),
  species('snow_owl','snow owl',{biomes:[B.SNOW_PEAKS],habitat:'air',movement:'flying',sprite:'owl',hp:12,speed:.38,spawnWeight:.6,palette:[[225,231,234],[173,193,211],[70,78,89]],loot:[['feather',1,3,1]]}),
  species('penguin','cliff penguin',{biomes:[B.SNOW_PEAKS,B.OCEAN],sprite:'penguin',hp:18,speed:.25,width:3,height:4,groupMin:2,groupMax:5,spawnWeight:.45,palette:[[42,52,63],[229,234,227],[232,157,60]],loot:[['raw_meat',1,2,.7],['feather',1,2,.8],['fish',1,1,.2]]}),
  species('glacier_beetle','glacier beetle',{biomes:[B.SNOW_PEAKS],sprite:'beetle',hp:12,speed:.22,groupMin:2,groupMax:4,palette:[[94,157,190],[176,225,240],[45,76,100]],loot:[['insect_shell',1,2,.8],['crystal_fragment',1,1,.2]]}),
  species('frost_fox','frost fox',{biomes:[B.SNOW_PEAKS],temperament:'hostile',sprite:'fox',hp:25,contactDamage:5,speed:.58,palette:[[185,207,220],[233,242,245],[68,83,96]],loot:[['raw_meat',1,2,.8],['thick_fur',1,2,1],['fang',1,1,.45]]}),
  species('ice_mite','ice mite',{biomes:[B.SNOW_PEAKS],movement:'hopper',temperament:'hostile',sprite:'mite',hp:10,contactDamage:3,speed:.42,groupMin:2,groupMax:5,palette:[[117,187,218],[217,246,252],[54,91,119]],loot:[['chitin',1,1,.75],['crystal_fragment',1,1,.15]]}),
  species('snow_wolf','snow wolf',{biomes:[B.SNOW_PEAKS],temperament:'hostile',sprite:'wolf',hp:39,contactDamage:7,speed:.65,width:5,height:4,hitRadius:3,groupMin:2,groupMax:4,spawnWeight:.4,palette:[[171,183,191],[230,235,235],[72,82,91]],loot:[['raw_meat',2,3,1],['thick_fur',1,2,1],['fang',1,2,.75]]}),

  // Bamboo grove
  species('giant_panda','giant panda',{biomes:[B.BAMBOO_GROVE],sprite:'panda',hp:52,speed:.25,width:6,height:5,hitRadius:4,spawnWeight:.25,palette:[[42,47,48],[226,224,206],[107,150,68]],loot:[['raw_meat',2,4,.8],['thick_fur',2,3,1]]}),
  species('red_panda','red panda',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'squirrel',hp:16,speed:.5,width:4,height:3,palette:[[179,76,45],[230,164,93],[57,45,40]],loot:[['raw_meat',1,1,.45],['fine_fur',1,2,.9]]}),
  species('bamboo_pheasant','bamboo pheasant',{biomes:[B.BAMBOO_GROVE],habitat:'air',movement:'flying',sprite:'bird',hp:10,speed:.42,groupMin:2,groupMax:4,palette:[[73,137,91],[210,174,72],[62,52,48]],loot:[['feather',1,3,1],['bright_feather',1,1,.45],['egg',1,1,.18]]}),
  species('leaf_gecko','leaf gecko',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'gecko',hp:7,speed:.42,groupMin:2,groupMax:4,palette:[[105,164,62],[184,211,94],[55,85,43]],loot:[['scale',1,1,.55]]}),
  species('bamboo_beetle','bamboo beetle',{biomes:[B.BAMBOO_GROVE],movement:'climber',sprite:'beetle',hp:7,speed:.25,groupMin:2,groupMax:5,palette:[[81,126,56],[149,181,76],[42,62,37]],loot:[['insect_shell',1,1,.75]]}),
  species('dart_frog','dart frog',{biomes:[B.BAMBOO_GROVE,B.SWAMP],movement:'hopper',sprite:'frog',hp:6,speed:.46,groupMin:2,groupMax:4,palette:[[56,177,151],[229,178,56],[35,76,69]],loot:[['venom_sac',1,1,.28]]}),
  species('stalker_mantis','stalker mantis',{biomes:[B.BAMBOO_GROVE],temperament:'hostile',sprite:'mantis',hp:22,contactDamage:5,speed:.52,width:4,height:5,hitRadius:3,palette:[[85,157,62],[178,204,76],[43,72,38]],loot:[['chitin',1,2,.9],['venom_sac',1,1,.25]]}),
  species('vine_snake','vine snake',{biomes:[B.BAMBOO_GROVE],temperament:'hostile',sprite:'snake',hp:18,contactDamage:5,speed:.48,width:5,height:2,hitRadius:3,palette:[[58,118,54],[136,181,67],[32,63,34]],loot:[['raw_meat',1,2,.6],['scale',1,2,1],['venom_sac',1,1,.45]]}),

  // Swamp
  species('marsh_frog','marsh frog',{biomes:[B.SWAMP],movement:'hopper',sprite:'frog',hp:7,speed:.42,groupMin:2,groupMax:5,palette:[[74,137,73],[151,181,86],[42,72,48]],loot:[['raw_meat',1,1,.45]]}),
  species('reed_duck','reed duck',{biomes:[B.SWAMP],habitat:'air',movement:'flying',sprite:'duck',hp:12,speed:.38,groupMin:2,groupMax:5,palette:[[80,112,80],[185,155,78],[226,210,161]],loot:[['raw_meat',1,2,.7],['feather',1,3,1],['egg',1,1,.2]]}),
  species('bog_turtle','bog turtle',{biomes:[B.SWAMP],sprite:'turtle',hp:28,speed:.18,width:5,height:3,hitRadius:3,palette:[[73,96,57],[132,137,70],[41,56,39]],loot:[['raw_meat',1,2,.6],['shell',1,2,1]]}),
  species('firefly','firefly',{biomes:[B.SWAMP],habitat:'air',movement:'flying',sprite:'firefly',hp:3,speed:.3,groupMin:3,groupMax:8,width:2,height:2,palette:[[96,111,57],[222,237,102],[50,54,38]],loot:[['glow_dust',1,1,.3]]}),
  species('lantern_newt','lantern newt',{biomes:[B.SWAMP],sprite:'newt',hp:10,speed:.3,groupMin:2,groupMax:4,palette:[[69,122,105],[203,177,74],[39,65,58]],loot:[['scale',1,1,.5],['glow_dust',1,1,.12]]}),
  species('swamp_rat','swamp rat',{biomes:[B.SWAMP],temperament:'hostile',sprite:'rat',hp:15,contactDamage:4,speed:.5,groupMin:2,groupMax:5,palette:[[92,86,66],[154,136,94],[47,45,39]],loot:[['raw_meat',1,1,.65],['small_hide',1,1,.45],['fang',1,1,.2]]}),
  species('giant_leech','giant leech',{biomes:[B.SWAMP],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'leech',hp:18,contactDamage:5,speed:.42,width:5,height:2,hitRadius:3,palette:[[91,48,61],[164,72,76],[42,31,37]],loot:[['raw_meat',1,2,.5],['slime_gel',1,2,.8]]}),
  species('mosquito_swarm','mosquito swarm',{biomes:[B.SWAMP],habitat:'air',movement:'flying',temperament:'hostile',sprite:'swarm',hp:8,contactDamage:3,speed:.58,groupMin:2,groupMax:4,palette:[[86,76,68],[191,162,100],[41,39,39]],loot:[['insect_shell',1,1,.25]]}),
  species('mud_crab','mud crab',{biomes:[B.SWAMP],temperament:'hostile',sprite:'crab',hp:25,contactDamage:5,speed:.3,width:5,height:3,hitRadius:3,palette:[[112,78,53],[176,119,64],[53,46,39]],loot:[['raw_meat',1,2,.8],['shell',1,2,.75],['crab_claw',1,2,1]]}),
  species('bog_crawler','bog crawler',{biomes:[B.SWAMP],temperament:'hostile',sprite:'crawler',hp:31,contactDamage:6,speed:.38,width:5,height:4,hitRadius:3,palette:[[62,87,61],[124,125,70],[38,49,39]],loot:[['raw_meat',1,3,.8],['chitin',1,2,.55],['slime_gel',1,2,.45]]}),

  // Volcano
  species('ember_lizard','ember lizard',{biomes:[B.VOLCANO],sprite:'lizard',hp:14,speed:.42,groupMin:2,groupMax:4,palette:[[139,54,38],[234,118,47],[64,38,35]],loot:[['raw_meat',1,1,.5],['ember_scale',1,2,.9]]}),
  species('ash_beetle','ash beetle',{biomes:[B.VOLCANO],sprite:'beetle',hp:12,speed:.25,groupMin:2,groupMax:5,palette:[[77,70,70],[139,94,67],[39,36,38]],loot:[['insect_shell',1,2,.75],['ash_core',1,1,.25]]}),
  species('magma_moth','magma moth',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',sprite:'moth',hp:8,speed:.38,groupMin:2,groupMax:5,palette:[[111,57,49],[237,131,53],[251,205,91]],loot:[['ember_scale',1,1,.5],['glow_dust',1,1,.25]]}),
  species('cinder_imp','cinder imp',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',temperament:'hostile',sprite:'imp',hp:24,contactDamage:5,speed:.48,palette:[[112,48,48],[226,81,42],[255,179,63]],loot:[['ash_core',1,1,.8],['ember_gland',1,1,.35],['fang',1,1,.3]]}),
  species('fire_bat','fire bat',{biomes:[B.VOLCANO],habitat:'air',movement:'flying',temperament:'hostile',sprite:'bat',hp:16,contactDamage:4,speed:.58,groupMin:2,groupMax:4,palette:[[79,44,49],[188,67,47],[244,134,48]],loot:[['raw_meat',1,1,.45],['ember_scale',1,1,.5],['fang',1,1,.3]]}),
  species('lava_crab','lava crab',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'crab',hp:34,contactDamage:7,speed:.28,width:5,height:3,hitRadius:3,palette:[[129,49,37],[233,78,34],[255,178,54]],loot:[['crab_claw',1,2,1],['ember_scale',1,2,.8],['ember_gland',1,1,.25]]}),
  species('ash_crawler','ash crawler',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'crawler',hp:28,contactDamage:6,speed:.42,width:5,height:3,hitRadius:3,palette:[[72,61,60],[145,83,59],[217,93,42]],loot:[['ash_core',1,2,.8],['chitin',1,2,.7]]}),
  species('obsidian_scarab','obsidian scarab',{biomes:[B.VOLCANO],temperament:'hostile',sprite:'beetle',hp:30,contactDamage:5,speed:.3,width:4,height:3,spawnWeight:.45,palette:[[39,36,48],[88,65,99],[224,81,54]],loot:[['chitin',1,2,1],['ash_core',1,2,.65],['crystal_fragment',1,1,.2]]}),

  // Ocean
  species('reef_fish','reef fish',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'fish',hp:7,speed:.48,groupMin:3,groupMax:7,palette:[[59,161,179],[236,184,76],[34,91,116]],loot:[['fish',1,1,.85],['fin',1,1,.35]]}),
  species('seahorse','seahorse',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'seahorse',hp:8,speed:.25,groupMin:2,groupMax:4,palette:[[211,143,67],[239,196,104],[92,80,54]],loot:[['fish',1,1,.45],['scale',1,1,.35]]}),
  species('sea_turtle','sea turtle',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'turtle',hp:38,speed:.3,width:6,height:4,hitRadius:4,spawnWeight:.35,palette:[[54,123,103],[126,156,90],[37,72,65]],loot:[['raw_meat',1,3,.55],['shell',1,3,1]]}),
  species('dolphin','dolphin',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'dolphin',hp:42,speed:.62,width:6,height:3,hitRadius:4,groupMin:2,groupMax:4,spawnWeight:.35,palette:[[79,142,174],[177,210,221],[38,78,104]],loot:[['fish',2,4,.55],['fin',1,2,.8]]}),
  species('moon_jelly','moon jelly',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'jellyfish',hp:12,speed:.2,groupMin:2,groupMax:5,palette:[[150,174,226],[220,226,248],[90,93,163]],loot:[['slime_gel',1,2,.8],['glow_dust',1,1,.25]]}),
  species('sand_crab','sand crab',{biomes:[B.OCEAN],sprite:'crab',hp:16,speed:.25,groupMin:2,groupMax:5,palette:[[191,137,83],[225,177,109],[89,65,50]],loot:[['raw_meat',1,1,.6],['shell',1,1,.7],['crab_claw',1,2,.8]]}),
  species('lantern_fish','lantern fish',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',sprite:'fish',hp:10,speed:.35,groupMin:2,groupMax:5,spawnWeight:.55,palette:[[52,67,112],[105,201,190],[224,239,145]],loot:[['fish',1,2,.8],['glow_dust',1,1,.35]]}),
  species('piranha','piranha',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'fish',hp:14,contactDamage:4,speed:.65,groupMin:3,groupMax:6,palette:[[150,72,65],[226,169,93],[62,49,51]],loot:[['fish',1,2,.8],['fang',1,1,.5],['fin',1,1,.4]]}),
  species('shark_pup','shark pup',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'shark',hp:42,contactDamage:8,speed:.7,width:7,height:4,hitRadius:4,spawnWeight:.4,palette:[[75,111,134],[177,198,205],[37,58,72]],loot:[['fish',2,4,1],['fang',1,3,.9],['fin',1,2,1]]}),
  species('electric_eel','electric eel',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'eel',hp:28,contactDamage:6,speed:.5,width:7,height:2,hitRadius:4,palette:[[65,79,126],[123,160,222],[216,225,120]],loot:[['fish',1,3,.75],['eel_gland',1,2,1]]}),
  species('reef_squid','reef squid',{biomes:[B.OCEAN],habitat:'water',movement:'swimming',temperament:'hostile',sprite:'squid',hp:30,contactDamage:6,speed:.48,width:5,height:5,hitRadius:3,palette:[[126,68,150],[206,118,169],[61,43,89]],loot:[['raw_meat',1,3,.8],['ink_sac',1,2,1]]}),

  // Standard caves
  species('cave_bat','cave bat',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave_air',movement:'flying',sprite:'bat',hp:8,speed:.5,groupMin:2,groupMax:6,palette:[[76,68,83],[135,111,126],[37,35,42]],loot:[['raw_meat',1,1,.35],['fang',1,1,.15]]}),
  species('glow_worm','glow worm',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'climber',sprite:'worm',hp:4,speed:.15,groupMin:2,groupMax:6,palette:[[80,101,62],[194,228,99],[47,53,41]],loot:[['glow_dust',1,1,.55]]}),
  species('stone_beetle','stone beetle',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',sprite:'beetle',hp:14,speed:.22,groupMin:2,groupMax:5,palette:[[83,81,77],[139,132,117],[42,41,40]],loot:[['insect_shell',1,2,.8],['chitin',1,1,.35]]}),
  species('cave_spider','cave spider',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'climber',temperament:'hostile',sprite:'spider',hp:20,contactDamage:5,speed:.48,width:5,height:3,hitRadius:3,palette:[[67,57,72],[126,83,124],[30,28,34]],loot:[['chitin',1,2,.9],['silk',1,3,1],['venom_sac',1,1,.4]]}),
  species('rock_mite','rock mite',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'mite',hp:13,contactDamage:4,speed:.4,groupMin:2,groupMax:5,palette:[[92,86,75],[163,144,102],[45,43,39]],loot:[['chitin',1,1,.85],['crystal_fragment',1,1,.08]]}),
  species('crystal_scorpion','crystal scorpion',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',temperament:'hostile',sprite:'scorpion',hp:32,contactDamage:7,speed:.36,width:6,height:4,hitRadius:4,spawnWeight:.45,palette:[[81,64,126],[150,119,220],[217,201,255]],loot:[['chitin',1,2,1],['venom_sac',1,1,.55],['crystal_fragment',1,3,.8]]}),
  species('burrow_worm','burrow worm',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'burrower',temperament:'hostile',sprite:'worm',hp:27,contactDamage:6,speed:.45,width:6,height:2,hitRadius:4,palette:[[129,88,66],[190,137,91],[65,51,45]],loot:[['raw_meat',1,3,.65],['chitin',1,2,.5],['fang',1,1,.25]]}),
  species('cave_slime','cave slime',{undergroundBiomes:[U.STANDARD_CAVES],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'slime',hp:18,contactDamage:4,speed:.32,width:4,height:3,hitRadius:3,palette:[[66,139,115],[119,201,157],[35,72,65]],loot:[['slime_gel',1,3,1]]}),

  // Mushroom caverns
  species('spore_moth','spore moth',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave_air',movement:'flying',sprite:'moth',hp:7,speed:.35,groupMin:2,groupMax:5,palette:[[139,80,145],[217,143,196],[237,198,126]],loot:[['spore_sac',1,1,.35],['glow_dust',1,1,.2]]}),
  species('mushroom_snail','mushroom snail',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',sprite:'snail',hp:16,speed:.12,width:5,height:3,palette:[[114,87,77],[194,102,145],[232,165,186]],loot:[['mushroom_flesh',1,2,.8],['shell',1,1,.65]]}),
  species('glowcap_beetle','glowcap beetle',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',sprite:'beetle',hp:10,speed:.22,groupMin:2,groupMax:5,palette:[[96,61,112],[190,91,166],[224,192,114]],loot:[['insect_shell',1,1,.75],['glow_dust',1,1,.45],['spore_sac',1,1,.2]]}),
  species('puffcap_hopper','puffcap hopper',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',movement:'hopper',temperament:'hostile',sprite:'frog',hp:17,contactDamage:4,speed:.42,palette:[[131,69,126],[219,117,169],[231,184,117]],loot:[['mushroom_flesh',1,2,.75],['spore_sac',1,2,.75]]}),
  species('mycelial_grub','mycelial grub',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',temperament:'hostile',sprite:'grub',hp:20,contactDamage:4,speed:.3,groupMin:2,groupMax:4,palette:[[189,147,153],[220,194,171],[98,72,81]],loot:[['mushroom_flesh',1,3,.9],['spore_sac',1,1,.4],['slime_gel',1,1,.25]]}),
  species('sporeling','sporeling',{undergroundBiomes:[U.MUSHROOM_CAVERNS],habitat:'cave',movement:'ambusher',temperament:'hostile',sprite:'sporeling',hp:26,contactDamage:5,speed:.32,width:4,height:5,hitRadius:3,palette:[[125,70,128],[210,103,167],[229,181,111]],loot:[['mushroom_flesh',1,2,.8],['spore_sac',1,3,1]]}),

  // Unstable-portal invaders. They retain a nominal habitat for registry and
  // renderer compatibility, but spawnWeight 0 keeps them out of ordinary
  // biome generation. The enemy system creates them through invasion rifts.
  species('ember_raider','ember raider',{biomes:[B.VOLCANO],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'charger',sprite:'imp',hp:34,contactDamage:7,speed:.52,width:4,height:5,hitRadius:3,palette:[[124,38,31],[255,111,38],[255,214,91]],loot:[['ash_core',1,2,.8],['ember_gland',1,1,.35]],behaviors:['pack_hunter','nest_builder']}),
  species('frost_borer','frost borer',{biomes:[B.SNOW_PEAKS],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'burrower',sprite:'worm',hp:38,contactDamage:7,speed:.46,width:7,height:2,hitRadius:4,palette:[[116,188,224],[226,249,255],[52,83,128]],loot:[['crystal_fragment',1,3,.8],['chitin',1,2,.65]],behaviors:['burrower']}),
  species('prism_mimic','prism mimic',{biomes:[B.GIANT_FOREST],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'ambusher',sprite:'mimic',hp:58,contactDamage:9,speed:.34,width:5,height:5,hitRadius:4,palette:[[117,58,191],[255,78,207],[77,245,219]],loot:[['crystal_fragment',2,4,1]],behaviors:['mimic']}),
  species('gear_gremlin','gear gremlin',{biomes:[B.PLAINS],spawnWeight:0,invasionOnly:true,temperament:'hostile',sprite:'imp',hp:30,contactDamage:4,speed:.6,width:4,height:4,hitRadius:3,palette:[[130,93,47],[236,177,72],[47,42,38]],loot:[['crystal_fragment',1,2,.55],['chitin',1,1,.45]],behaviors:['weapon_thief','scavenger','wall_climber']}),
  species('static_leech','static leech',{biomes:[B.SWAMP],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'flying',sprite:'leech',hp:18,contactDamage:2,speed:.68,width:5,height:2,hitRadius:3,palette:[[255,43,197],[70,255,211],[92,53,166]],loot:[['slime_gel',1,2,.75],['crystal_fragment',1,1,.35]],behaviors:['parasite','pack_hunter']}),
  species('void_climber','void climber',{undergroundBiomes:[U.STANDARD_CAVES],spawnWeight:0,invasionOnly:true,temperament:'hostile',movement:'climber',sprite:'spider',hp:36,contactDamage:6,speed:.54,width:5,height:3,hitRadius:3,palette:[[42,33,68],[121,86,188],[232,235,255]],loot:[['silk',1,3,.9],['crystal_fragment',1,2,.45]],behaviors:['wall_climber','nest_builder']}),
]);



const BEHAVIOR_OVERRIDES=Object.freeze({
  burrow_badger:['burrower'],
  burrow_worm:['burrower'],
  red_squirrel:['wall_climber'],
  bark_beetle:['wall_climber'],
  giant_spider:['wall_climber','nest_builder'],
  red_panda:['wall_climber'],
  cave_spider:['wall_climber','nest_builder'],
  glow_worm:['wall_climber'],
  grassland_fox:['pack_hunter'],
  grey_wolf:['pack_hunter'],
  snow_wolf:['pack_hunter'],
  fire_bat:['pack_hunter'],
  piranha:['pack_hunter'],
  thorn_hornet:['pack_hunter','nest_builder'],
  honey_bee:['nest_builder'],
  stump_mimic:['mimic'],
  sporeling:['mimic','nest_builder'],
  field_mouse:['scavenger'],
  swamp_rat:['scavenger'],
  tusk_boar:['scavenger'],
  sand_crab:['scavenger'],
  mud_crab:['scavenger'],
  giant_leech:['parasite'],
  rock_mite:['parasite'],
  ice_mite:['parasite'],
});

function faunaBehaviors(speciesOrId){
  const species=typeof speciesOrId==='string'?faunaById(speciesOrId):speciesOrId;
  if(!species)return [];
  const combined=[...(BEHAVIOR_OVERRIDES[species.id]??[]),...(species.behaviors??[])];
  return [...new Set(combined)];
}

const INVADER_SPECIES_BY_DIMENSION=Object.freeze({
  emberdeep:['ember_raider','frost_borer'],
  frostvoid:['frost_borer','void_climber'],
  prism:['prism_mimic','static_leech'],
  abyss:['static_leech','void_climber'],
  verdant:['void_climber','prism_mimic'],
  clockwork:['gear_gremlin','void_climber'],
  dream:['prism_mimic','static_leech'],
  skyrealm:['static_leech','gear_gremlin'],
  static:['gear_gremlin','static_leech','prism_mimic'],
  moon:['void_climber','gear_gremlin'],
  earth:['ember_raider','frost_borer','gear_gremlin','static_leech'],
});
const faunaByIdMap=new Map(FAUNA_DB.map(item=>[item.id,item]));
function faunaById(id){ return faunaByIdMap.get(id)??null; }

function faunaForSurfaceBiome(biomeId,habitat=null){
  return FAUNA_DB.filter(item=>item.biomes.includes(biomeId)&&(!habitat||item.habitat===habitat));
}

function faunaForUndergroundBiome(biomeId,habitat=null){
  return FAUNA_DB.filter(item=>item.undergroundBiomes.includes(biomeId)&&(!habitat||item.habitat===habitat));
}

Object.assign(exports,{LOOT_DB,FAUNA_DB,INVADER_SPECIES_BY_DIMENSION,lootById,faunaBehaviors,faunaById,faunaForSurfaceBiome,faunaForUndergroundBiome});

};

__modules["src/data/biomes.db.js"]=function(exports,__require){
const BiomeId = Object.freeze({
  PLAINS: 0,
  SNOW_PEAKS: 1,
  BAMBOO_GROVE: 2,
  SWAMP: 3,
  VOLCANO: 4,
  GIANT_FOREST: 5,
  OCEAN: 6,
});

const B = BiomeId;

// Biome regions are intentionally much wider than a screen or chunk. The
// transition width is centered on each regional boundary, so terrain and sky
// have a broad blend rather than a hard vertical seam.
const BIOME_REGION_SIZE = 960;
const BIOME_TRANSITION_WIDTH = 280;

const BIOME_DB = Object.freeze([
  {
    id:B.PLAINS,
    name:'plains',
    skyTop:[91,166,224],
    skyBottom:[151,201,229],
  },
  {
    id:B.SNOW_PEAKS,
    name:'snow_peaks',
    skyTop:[142,178,222],
    skyBottom:[210,225,238],
  },
  {
    id:B.BAMBOO_GROVE,
    name:'bamboo_grove',
    skyTop:[91,157,170],
    skyBottom:[157,199,181],
  },
  {
    id:B.SWAMP,
    name:'swamp',
    skyTop:[103,137,132],
    skyBottom:[157,174,145],
  },
  {
    id:B.VOLCANO,
    name:'volcano',
    skyTop:[104,82,86],
    skyBottom:[181,135,111],
  },
  {
    id:B.GIANT_FOREST,
    name:'giant_forest',
    skyTop:[74,137,184],
    skyBottom:[133,184,198],
  },
  {
    id:B.OCEAN,
    name:'ocean',
    skyTop:[57,142,207],
    skyBottom:[137,199,224],
  },
]);

function biomeName(id){
  return BIOME_DB[id]?.name ?? 'unknown';
}

Object.assign(exports,{BiomeId,BIOME_REGION_SIZE,BIOME_TRANSITION_WIDTH,BIOME_DB,biomeName});

};

__modules["src/data/underground-biomes.db.js"]=function(exports,__require){
const UndergroundBiomeId = Object.freeze({
  STANDARD_CAVES: 0,
  MUSHROOM_CAVERNS: 1,
});

const U=UndergroundBiomeId;

const UNDERGROUND_BIOME_DB = Object.freeze([
  { id:U.STANDARD_CAVES, name:'caves' },
  { id:U.MUSHROOM_CAVERNS, name:'mushroom_caverns' },
]);

function undergroundBiomeName(id){
  return UNDERGROUND_BIOME_DB[id]?.name??'caves';
}

Object.assign(exports,{UndergroundBiomeId,UNDERGROUND_BIOME_DB,undergroundBiomeName});

};

__modules["src/data/furniture.db.js"]=function(exports,__require){
const { MaterialId } = __require("src/data/materials.db.js");
const M=MaterialId;

const FurnitureId=Object.freeze({
  WORKBENCH:'workbench',
  WOOD_TABLE:'wood_table',
  STONE_TABLE:'stone_table',
  CHAIR:'chair',
  STOOL:'stool',
  DOOR:'door',
  GATE:'gate',
  FLOOR_LAMP:'floor_lamp',
  WALL_LAMP:'wall_lamp',
  LANTERN:'lantern',
  SWITCH:'switch',
  CHEST:'chest',
  BED:'bed',
  BUNK_BED:'bunk_bed',
  LADDER:'ladder',
  BOOKSHELF:'bookshelf',
  PLANTER:'planter',
  SIGN:'sign',
  CLOCK:'clock',
  RUG:'rug',
  WINDOW:'window',
  FENCE:'fence',
});

const F=FurnitureId;
const recipe=(...pairs)=>Object.freeze(pairs.map(([materialId,count])=>Object.freeze({materialId,count})));
const freezeRows=rows=>Object.freeze(rows);

const FURNITURE_DB=Object.freeze([
  {id:F.WORKBENCH,name:'workbench',category:'work',w:7,h:4,placement:'floor',action:'craft',recipe:recipe([M.WOOD,8],[M.ROCK,2]),sprite:freezeRows(['wwwwwww','wddwddw','w w w w','w w w w']),solidRects:[[0,0,7,1],[0,1,1,3],[3,1,1,3],[6,1,1,3]]},
  {id:F.WOOD_TABLE,name:'wood table',category:'tables',w:7,h:4,placement:'floor',recipe:recipe([M.WOOD,6]),sprite:freezeRows(['wwwwwww','ddddddd','w     w','w     w']),solidRects:[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
  {id:F.STONE_TABLE,name:'stone table',category:'tables',w:7,h:4,placement:'floor',recipe:recipe([M.ROCK,7]),sprite:freezeRows(['sssssss','sdddsds','s     s','s     s']),solidRects:[[0,0,7,2],[0,2,1,2],[6,2,1,2]]},
  {id:F.CHAIR,name:'chair',category:'seating',w:3,h:4,placement:'floor',action:'sit',seatOffsetY:-1,recipe:recipe([M.WOOD,4]),sprite:freezeRows(['w  ','www','w w','w w']),solidRects:[[0,0,1,4],[1,1,2,1],[2,2,1,2]]},
  {id:F.STOOL,name:'stool',category:'seating',w:3,h:3,placement:'floor',action:'sit',seatOffsetY:-1,recipe:recipe([M.WOOD,3]),sprite:freezeRows(['www','w w','w w']),solidRects:[[0,0,3,1],[0,1,1,2],[2,1,1,2]]},
  {id:F.DOOR,name:'wood door',category:'doors',w:2,h:7,placement:'floor',action:'toggle',recipe:recipe([M.WOOD,7]),sprite:freezeRows(['ww','wd','ww','wd','ww','wd','ww']),openSprite:freezeRows(['w ','w ','w ','w ','w ','w ','w ']),solidRects:[[0,0,2,7]],openSolidRects:[[0,0,1,7]]},
  {id:F.GATE,name:'base gate',category:'doors',w:5,h:4,placement:'floor',action:'toggle',recipe:recipe([M.WOOD,7],[M.ROCK,1]),sprite:freezeRows(['wwwww','wdwdw','wwwww','w w w']),openSprite:freezeRows(['w   w','w   w','w   w','w   w']),solidRects:[[0,0,5,3],[0,3,1,1],[2,3,1,1],[4,3,1,1]],openSolidRects:[[0,0,1,4],[4,0,1,4]]},
  {id:F.FLOOR_LAMP,name:'floor lamp',category:'lights',w:3,h:7,placement:'floor',action:'light',lightRadius:18,recipe:recipe([M.WOOD,3],[M.CRYSTAL,2]),sprite:freezeRows([' l ','lll',' l ',' w ',' w ',' w ','www']),solidRects:[[1,2,1,5],[0,6,3,1]]},
  {id:F.WALL_LAMP,name:'wall lamp',category:'lights',w:3,h:3,placement:'wall',action:'light',lightRadius:13,recipe:recipe([M.ROCK,1],[M.CRYSTAL,1]),sprite:freezeRows(['sll','sll','s l']),solidRects:[[0,0,1,3]]},
  {id:F.LANTERN,name:'hanging lantern',category:'lights',w:3,h:4,placement:'wall',action:'light',lightRadius:15,recipe:recipe([M.BAMBOO,2],[M.CRYSTAL,1]),sprite:freezeRows([' w ','wlw','lll',' d ']),solidRects:[[1,0,1,1]]},
  {id:F.SWITCH,name:'wall switch',category:'utility',w:3,h:3,placement:'wall',action:'switch',recipe:recipe([M.ROCK,1],[M.CRYSTAL,1]),sprite:freezeRows(['sss','sd ','sss']),solidRects:[[0,0,1,3]]},
  {id:F.CHEST,name:'collector chest',category:'storage',w:5,h:3,placement:'floor',action:'chest',recipe:recipe([M.WOOD,6],[M.CRYSTAL,1]),sprite:freezeRows(['wwwww','wdddw','wwwww']),solidRects:[[0,0,5,3]]},
  {id:F.BED,name:'bed',category:'comfort',w:7,h:3,placement:'floor',action:'sleep',recipe:recipe([M.WOOD,5],[M.LEAF,5]),sprite:freezeRows(['fffffff','wwwwwww','w     w']),solidRects:[[0,0,7,2],[0,2,1,1],[6,2,1,1]]},
  {id:F.BUNK_BED,name:'bunk bed',category:'comfort',w:5,h:7,placement:'floor',action:'sleep',recipe:recipe([M.WOOD,9],[M.LEAF,8]),sprite:freezeRows(['fffff','wwwww','w   w','w   w','fffff','wwwww','w   w']),solidRects:[[0,0,5,2],[0,2,1,5],[4,2,1,5],[0,4,5,2]]},
  {id:F.LADDER,name:'ladder',category:'utility',w:2,h:7,placement:'floor',action:'ladder',recipe:recipe([M.WOOD,5]),sprite:freezeRows(['ww','dd','ww','dd','ww','dd','ww']),solidRects:[]},
  {id:F.BOOKSHELF,name:'portal bookshelf',category:'storage',w:5,h:7,placement:'floor',action:'bookshelf',recipe:recipe([M.WOOD,8],[M.LEAF,2]),sprite:freezeRows(['wwwww','wcbgw','wwwww','wgbcw','wwwww','wbcgw','wwwww']),solidRects:[[0,0,5,7]]},
  {id:F.PLANTER,name:'planter box',category:'garden',w:5,h:3,placement:'floor',action:'planter',recipe:recipe([M.WOOD,4],[M.DIRT,3]),sprite:freezeRows([' p p ','wdddw','wwwww']),solidRects:[[0,1,5,2]]},
  {id:F.SIGN,name:'base sign',category:'decor',w:5,h:5,placement:'floor',action:'sign',recipe:recipe([M.WOOD,4]),sprite:freezeRows(['wwwww','wdddw','wwwww','  w  ',' www ']),solidRects:[[0,0,5,3],[2,3,1,2]]},
  {id:F.CLOCK,name:'wall clock',category:'utility',w:5,h:5,placement:'wall',action:'clock',recipe:recipe([M.WOOD,2],[M.CRYSTAL,2]),sprite:freezeRows([' www ','wlllw','wlldw','wlllw',' www ']),solidRects:[]},
  {id:F.RUG,name:'woven rug',category:'decor',w:7,h:1,placement:'floor',recipe:recipe([M.LEAF,3],[M.BAMBOO,2]),sprite:freezeRows(['frfrfrf']),solidRects:[]},
  {id:F.WINDOW,name:'crystal window',category:'walls',w:5,h:5,placement:'floor',recipe:recipe([M.ROCK,4],[M.CRYSTAL,3]),sprite:freezeRows(['sssss','sgggs','sgdgs','sgggs','sssss']),solidRects:[[0,0,5,1],[0,4,5,1],[0,1,1,3],[4,1,1,3]]},
  {id:F.FENCE,name:'wood fence',category:'walls',w:5,h:3,placement:'floor',recipe:recipe([M.WOOD,4]),sprite:freezeRows(['wwwww','w w w','wwwww']),solidRects:[[0,0,5,1],[0,1,1,2],[2,1,1,2],[4,1,1,2]]},
]);

const BY_ID=new Map(FURNITURE_DB.map(item=>[item.id,item]));
const FURNITURE_IDS=Object.freeze(FURNITURE_DB.map(item=>item.id));
const FURNITURE_MAX_PER_DIMENSION=160;

function furnitureById(id){ return BY_ID.get(String(id??''))??null; }
function furnitureRecipeText(definition,materialName){
  return (definition?.recipe??[]).map(cost=>`${cost.count} ${materialName(cost.materialId)}`).join(' + ');
}

function furnitureBounds(entity,definition=furnitureById(entity?.furnitureId)){
  if(!entity||!definition)return null;
  const left=Math.round(entity.x)-Math.floor(definition.w*.5);
  const bottom=Math.round(entity.y);
  return {left,right:left+definition.w-1,top:bottom-definition.h+1,bottom,w:definition.w,h:definition.h};
}

function furnitureSolidAtEntity(entity,x,y){
  const definition=furnitureById(entity?.furnitureId);
  const bounds=furnitureBounds(entity,definition);
  if(!definition||!bounds||x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return false;
  const localX=Math.round(x)-bounds.left;
  const localY=Math.round(y)-bounds.top;
  const rects=entity.open?(definition.openSolidRects??[]):(definition.solidRects??[]);
  for(const [rx,ry,rw,rh] of rects){
    if(localX>=rx&&localX<rx+rw&&localY>=ry&&localY<ry+rh)return true;
  }
  return false;
}

function furnitureSolidAt(entities,x,y,dimension=null){
  for(const entity of entities??[]){
    if(dimension&&entity.dimension&&entity.dimension!==dimension)continue;
    if(furnitureSolidAtEntity(entity,x,y))return true;
  }
  return false;
}

const FURNITURE_PIXEL_COLORS=Object.freeze({
  w:'rgb(151,94,48)',d:'rgb(86,51,32)',s:'rgb(126,132,145)',c:'rgb(100,206,239)',
  b:'rgb(86,135,220)',g:'rgba(134,227,246,.66)',l:'rgb(255,235,126)',f:'rgb(192,86,105)',
  r:'rgb(233,153,57)',p:'rgb(91,198,105)',m:'rgb(186,91,195)',
});

const SIGN_LABELS=Object.freeze(['HOME','MINE','FARM','PORTAL','DANGER','REST']);

Object.assign(exports,{FurnitureId,FURNITURE_DB,FURNITURE_IDS,FURNITURE_MAX_PER_DIMENSION,FURNITURE_PIXEL_COLORS,SIGN_LABELS,furnitureById,furnitureRecipeText,furnitureBounds,furnitureSolidAtEntity,furnitureSolidAt});

};

__modules["src/world/noise.js"]=function(exports,__require){
function createNoise(state){
  function hash(value){
    let n=value|0;
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    return (n^(n>>>16))>>>0;
  }

  function randomAt(x,y,salt=0){
    return hash(
      Math.imul(x|0,374761393)^
      Math.imul(y|0,668265263)^
      Math.imul(state.seed,1442695041)^
      salt
    )/4294967295;
  }

  const smooth=t=>t*t*(3-2*t);

  function noise1(x,scale,salt){
    const value=x/scale;
    const base=Math.floor(value);
    const blend=smooth(value-base);
    const a=randomAt(base,salt,salt*13);
    return a+(randomAt(base+1,salt,salt*13)-a)*blend;
  }

  function noise2(x,y,scale,salt){
    const sx=x/scale;
    const sy=y/scale;
    const bx=Math.floor(sx);
    const by=Math.floor(sy);
    const tx=smooth(sx-bx);
    const ty=smooth(sy-by);
    const a=randomAt(bx,by,salt);
    const b=randomAt(bx+1,by,salt);
    const c=randomAt(bx,by+1,salt);
    const d=randomAt(bx+1,by+1,salt);
    const top=a+(b-a)*tx;
    const bottom=c+(d-c)*tx;
    return top+(bottom-top)*ty;
  }

  return { hash, randomAt, noise1, noise2 };
}

Object.assign(exports,{createNoise});

};

__modules["src/world/generator.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, CHUNK_CELL_COUNT, VOLCANO_CONFIG, OCEAN_CONFIG } = __require("src/config.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { BIOME_DB,
  BIOME_REGION_SIZE,
  BIOME_TRANSITION_WIDTH,
  BiomeId,
  biomeName, } = __require("src/data/biomes.db.js");
const { ENTITY_DB } = __require("src/data/entities.db.js");
const { faunaForSurfaceBiome, faunaForUndergroundBiome } = __require("src/data/fauna.db.js");
const { UndergroundBiomeId, undergroundBiomeName } = __require("src/data/underground-biomes.db.js");
const { structureDescriptorsForChunk, applyStructureToChunk, rocketSiloDescriptor } = __require("src/world/structures.js");
const { DimensionId, dimensionDefinition, dimensionSurfaceProfile, dimensionMaterialAt, dimensionName, isEarthDimension, isMoonDimension } = __require("src/data/dimensions.db.js");
const M=MaterialId;
const B=BiomeId;
const U=UndergroundBiomeId;

function createWorldGenerator(state,noise){
  const { randomAt, noise1, noise2 }=noise;
  const index=(x,y)=>x+y*WORLD_WIDTH;
  const mixCache=new Map();
  const surfaceCache=new Map();
  let cacheSeed=state.seed;
  let cacheDimension=state.world.dimension??DimensionId.EARTH;

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const smoother=t=>{
    const x=clamp(t,0,1);
    return x*x*x*(x*(x*6-15)+10);
  };

  function ensureCacheSeed(){
    const dimension=state.world.dimension??DimensionId.EARTH;
    if(cacheSeed===state.seed&&cacheDimension===dimension)return;
    cacheSeed=state.seed;
    cacheDimension=dimension;
    mixCache.clear();
    surfaceCache.clear();
  }

  function rawRegionBiome(regionIndex){
    return Math.floor(randomAt(regionIndex,1501,9087)*BIOME_DB.length)%BIOME_DB.length;
  }

  function regionBiomeId(regionIndex){
    // Consecutive identical rolls are allowed to merge into an extra-large biome.
    // When they differ, the transition is handled by biomeMixAt().
    return rawRegionBiome(regionIndex);
  }

  function addWeight(entries,id,weight,regionIndex){
    if(weight<=0)return;
    const existing=entries.find(item=>item.id===id);
    if(existing){
      existing.weight+=weight;
      return;
    }
    entries.push({id,weight,regionIndex});
  }

  function biomeMixAt(x){
    ensureCacheSeed();
    const worldX=Math.floor(x);
    if(mixCache.has(worldX))return mixCache.get(worldX);

    const regionIndex=Math.floor(worldX/BIOME_REGION_SIZE);
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const local=worldX-regionStart;
    const halfTransition=BIOME_TRANSITION_WIDTH*.5;
    const currentId=regionBiomeId(regionIndex);
    const entries=[];

    if(local<halfTransition){
      const previousId=regionBiomeId(regionIndex-1);
      const transition=smoother((local+halfTransition)/BIOME_TRANSITION_WIDTH);
      addWeight(entries,previousId,1-transition,regionIndex-1);
      addWeight(entries,currentId,transition,regionIndex);
    }else if(local>BIOME_REGION_SIZE-halfTransition){
      const nextId=regionBiomeId(regionIndex+1);
      const transition=smoother((local-(BIOME_REGION_SIZE-halfTransition))/BIOME_TRANSITION_WIDTH);
      addWeight(entries,currentId,1-transition,regionIndex);
      addWeight(entries,nextId,transition,regionIndex+1);
    }else{
      addWeight(entries,currentId,1,regionIndex);
    }

    entries.sort((a,b)=>b.weight-a.weight);
    const dominant=entries[0]?.id??B.PLAINS;
    const result={
      dominant,
      regionIndex,
      entries,
      weight(id){
        return entries.find(item=>item.id===id)?.weight??0;
      },
    };
    mixCache.set(worldX,result);
    return result;
  }

  function biomeIdAt(x){
    return biomeMixAt(x).dominant;
  }

  function volcanoDescriptor(regionIndex){
    if(regionBiomeId(regionIndex)!==B.VOLCANO)return null;
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const range=(min,max,salt)=>min+randomAt(regionIndex,salt,1510+salt)*(max-min);
    return{
      regionIndex,
      center:
        regionStart+BIOME_REGION_SIZE*.5+
        (randomAt(regionIndex,77,1509)-.5)*BIOME_REGION_SIZE*.12,
      coneRadius:BIOME_REGION_SIZE*VOLCANO_CONFIG.coneRadiusRatio,
      calderaRadius:range(VOLCANO_CONFIG.calderaRadiusMin,VOLCANO_CONFIG.calderaRadiusMax,1),
      conduitRadius:range(VOLCANO_CONFIG.conduitRadiusMin,VOLCANO_CONFIG.conduitRadiusMax,2),
      chamberDepth:range(VOLCANO_CONFIG.chamberDepthMin,VOLCANO_CONFIG.chamberDepthMax,3),
      chamberRadiusX:range(VOLCANO_CONFIG.chamberRadiusXMin,VOLCANO_CONFIG.chamberRadiusXMax,4),
      chamberRadiusY:range(VOLCANO_CONFIG.chamberRadiusYMin,VOLCANO_CONFIG.chamberRadiusYMax,5),
    };
  }

  function oceanDescriptor(regionIndex){
    if(regionBiomeId(regionIndex)!==B.OCEAN)return null;
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const range=(min,max,salt)=>min+randomAt(regionIndex,salt,6100+salt)*(max-min);
    return {
      regionIndex,
      center:regionStart+BIOME_REGION_SIZE*.5,
      seaLevel:range(OCEAN_CONFIG.seaLevelMin,OCEAN_CONFIG.seaLevelMax,1),
      floorBase:range(OCEAN_CONFIG.floorMin,OCEAN_CONFIG.floorMax,2),
      trenchDepth:range(OCEAN_CONFIG.trenchDepth*.6,OCEAN_CONFIG.trenchDepth,3),
    };
  }

  function volcanoShape(x,entry){
    if(entry.id!==B.VOLCANO)return{cone:0,crater:0,rim:0};
    const descriptor=volcanoDescriptor(entry.regionIndex);
    if(!descriptor)return{cone:0,crater:0,rim:0};
    const distance=Math.abs(x-descriptor.center);
    const cone=clamp(1-distance/descriptor.coneRadius,0,1);
    const calderaDistance=distance/descriptor.calderaRadius;
    const crater=clamp(1-calderaDistance,0,1);
    const rim=clamp(1-Math.abs(calderaDistance-.88)/.18,0,1);
    return{
      cone:Math.pow(cone,2.35)*entry.weight,
      crater:Math.pow(crater,1.75)*entry.weight,
      rim:Math.pow(rim,2)*entry.weight,
    };
  }

  function surfaceAt(x){
    ensureCacheSeed();
    const worldX=Math.floor(x);
    if(surfaceCache.has(worldX))return surfaceCache.get(worldX);
    if(!isEarthDimension(state.world.dimension)){
      const result=dimensionSurfaceProfile(state.world.dimension,worldX,noise1,randomAt);
      surfaceCache.set(worldX,result);
      return result;
    }

    const mix=biomeMixAt(worldX);
    const broad=(noise1(worldX,270,31)-.5)*13;
    const medium=(noise1(worldX,120,29)-.5)*6.5;
    const detail=(noise1(worldX,38,27)-.5)*1.7;
    const flatField=smoother((noise1(worldX,230,41)-.43)/.36);
    const detailScale=1-flatField*.88;
    let ground=57+broad+medium*detailScale+detail*detailScale;

    const snowWeight=mix.weight(B.SNOW_PEAKS);
    const swampWeight=mix.weight(B.SWAMP);
    const plainsWeight=mix.weight(B.PLAINS);
    const bambooWeight=mix.weight(B.BAMBOO_GROVE);
    const forestWeight=mix.weight(B.GIANT_FOREST);
    const volcanoWeight=mix.weight(B.VOLCANO);
    const oceanWeight=mix.weight(B.OCEAN);

    if(snowWeight>0){
      const ridge=Math.max(0,(noise1(worldX,170,57)-.39)*1.8);
      const peak=Math.max(0,(noise1(worldX,68,58)-.61)/.39);
      ground-=snowWeight*(ridge*17+peak*22);
    }

    if(volcanoWeight>0){
      for(const entry of mix.entries){
        const shape=volcanoShape(worldX,entry);
        ground-=shape.cone*32;
        ground+=shape.crater*VOLCANO_CONFIG.calderaDepth;
        ground-=shape.rim*6;
      }
    }

    ground+=swampWeight*(4+Math.max(0,(noise1(worldX,150,61)-.47)*5));
    ground+=plainsWeight*Math.sin(worldX*.0065)*1.1;
    ground+=bambooWeight*Math.sin(worldX*.012)*1.25;
    ground+=forestWeight*Math.sin(worldX*.008)*1.8;

    let seaLevel=OCEAN_CONFIG.seaLevelMin;
    if(oceanWeight>0){
      let weightedSeaLevel=0;
      let weightedFloor=0;
      let totalOceanWeight=0;
      for(const entry of mix.entries){
        if(entry.id!==B.OCEAN)continue;
        const descriptor=oceanDescriptor(entry.regionIndex);
        if(!descriptor)continue;
        const distance=Math.abs(worldX-descriptor.center)/(BIOME_REGION_SIZE*.5);
        const trench=Math.max(0,1-distance);
        const oceanFloorNoise=(noise1(worldX,150,6201)-.5)*8+(noise1(worldX,47,6202)-.5)*3;
        const floor=descriptor.floorBase+oceanFloorNoise+Math.pow(trench,2)*descriptor.trenchDepth;
        weightedSeaLevel+=descriptor.seaLevel*entry.weight;
        weightedFloor+=floor*entry.weight;
        totalOceanWeight+=entry.weight;
      }
      if(totalOceanWeight>0){
        seaLevel=weightedSeaLevel/totalOceanWeight;
        const oceanFloor=weightedFloor/totalOceanWeight;
        const blend=smoother(oceanWeight);
        ground=ground+(oceanFloor-ground)*blend;
      }
    }

    ground=Math.floor(clamp(ground,24,92));

    const lakeNoise=noise1(worldX,180,71);
    const lakeActivation=.86-swampWeight*.22;
    const lakeStrength=Math.max(0,(lakeNoise-lakeActivation)/(1-lakeActivation))*(1-volcanoWeight*.98)*(1-oceanWeight);
    const lakeDepth=Math.floor(lakeStrength*(7+swampWeight*5));
    const ocean=oceanWeight>OCEAN_CONFIG.beachBlendThreshold&&ground>seaLevel+2;
    const inlandLake=volcanoWeight<.55&&(lakeDepth>=3||swampWeight>.55&&lakeNoise>.7);
    const lake=ocean||inlandLake;
    const dominant=mix.dominant;
    const resolvedGround=ocean?ground:ground+lakeDepth;

    const result={
      biome:dominant,
      mix,
      base:ground,
      ground:resolvedGround,
      water:ocean?Math.floor(seaLevel):ground+(swampWeight>.5?1:3),
      lake,
      ocean,
      oceanWeight,
      lakeDepth:ocean?Math.max(0,resolvedGround-Math.floor(seaLevel)):lakeDepth,
    };
    surfaceCache.set(worldX,result);
    return result;
  }

  function nearbyVolcanoDescriptors(x){
    const baseRegion=Math.floor(x/BIOME_REGION_SIZE);
    const descriptors=[];
    for(let offset=-1;offset<=1;offset++){
      const descriptor=volcanoDescriptor(baseRegion+offset);
      if(descriptor&&Math.abs(x-descriptor.center)<=descriptor.coneRadius+descriptor.chamberRadiusX){
        descriptors.push(descriptor);
      }
    }
    return descriptors;
  }

  function volcanoFeatureAt(x,y,surface=surfaceAt(x)){
    for(const descriptor of nearbyVolcanoDescriptors(x)){
      const dx=x-descriptor.center;
      const absoluteX=Math.abs(dx);
      const centerSurface=surfaceAt(Math.round(descriptor.center));
      const chamberCenterY=centerSurface.ground+descriptor.chamberDepth;
      const chamberX=dx/descriptor.chamberRadiusX;
      const chamberY=(y-chamberCenterY)/descriptor.chamberRadiusY;
      const chamberDistance=chamberX*chamberX+chamberY*chamberY;

      // A large vaulted chamber sits below the volcano. Its upper third is an
      // open cavern and the lower section is a deep lava reservoir.
      if(chamberDistance<=1){
        return y>=chamberCenterY-descriptor.chamberRadiusY*.22?M.LAVA:M.AIR;
      }

      const conduitTop=centerSurface.ground-VOLCANO_CONFIG.lavaPoolDepth;
      const conduitBottom=chamberCenterY-descriptor.chamberRadiusY*.62;
      if(y>=conduitTop&&y<=conduitBottom){
        const wobble=
          Math.sin((y-centerSurface.ground)*.045+descriptor.regionIndex)*2.2+
          Math.sin((y-centerSurface.ground)*.013+descriptor.regionIndex*3)*1.4;
        if(Math.abs(x-(descriptor.center+wobble))<=descriptor.conduitRadius)return M.LAVA;
      }

      // The caldera is a broad open bowl with a visible lava lake rather than
      // a narrow surface crack.
      if(absoluteX<=descriptor.calderaRadius*.72){
        const lavaTop=centerSurface.ground-VOLCANO_CONFIG.lavaPoolDepth;
        if(y>=lavaTop&&y<surface.ground)return M.LAVA;
      }
    }
    return null;
  }

  function skyAt(x){
    if(!isEarthDimension(state.world.dimension)){
      const definition=dimensionDefinition(state.world.dimension);
      return {top:[...definition.skyTop],bottom:[...definition.skyBottom]};
    }
    const mix=biomeMixAt(x);
    const top=[0,0,0];
    const bottom=[0,0,0];

    for(const entry of mix.entries){
      const biome=BIOME_DB[entry.id]??BIOME_DB[B.PLAINS];
      for(let channel=0;channel<3;channel++){
        top[channel]+=biome.skyTop[channel]*entry.weight;
        bottom[channel]+=biome.skyBottom[channel]*entry.weight;
      }
    }

    return{top,bottom};
  }

  function shaftDistance(x,y){
    const section=Math.floor(x/520);
    let best=9999;

    for(let offset=-1;offset<=1;offset++){
      const candidate=section+offset;
      // Fewer surface openings: approximately one viable shaft per 3–4 sections.
      if(randomAt(candidate,1,902)<.82)continue;

      const entranceX=candidate*520+90+Math.floor(randomAt(candidate,0,901)*340);
      const surface=surfaceAt(entranceX);
      if(y<surface.ground-1||y>surface.ground+88)continue;

      const bend=
        Math.sin((y-surface.ground)*.075+candidate)*3+
        Math.sin((y-surface.ground)*.021+candidate*2)*1.7;
      best=Math.min(best,Math.abs(x-entranceX-bend));
    }

    return best;
  }

  function mushroomStrengthAt(x,y){
    const surface=surfaceAt(x);
    const depth=y-surface.ground;
    if(depth<30)return 0;
    const broad=noise2(x,y,430,1801)*.7+noise2(x,y,190,1802)*.3;
    const depthFade=smoother(clamp((depth-30)/55,0,1));
    return smoother((broad-.53)/.2)*depthFade;
  }

  function undergroundBiomeIdAt(x,y){
    return mushroomStrengthAt(x,y)>.48?U.MUSHROOM_CAVERNS:U.STANDARD_CAVES;
  }

  function caveAirAt(x,y,surface=surfaceAt(x)){
    const depth=y-surface.ground;
    if(depth<0)return false;
    if(shaftDistance(x,y)<3.7&&depth<88)return true;

    const cave=noise2(x,y,68,313)*.57+noise2(x,y,31,332)*.27+noise2(x,y,15,356)*.16;
    if(depth>26&&cave>.755)return true;
    if(depth>44&&Math.abs(noise2(x,y,44,777)-.5)<.031)return true;
    return false;
  }

  function generatedMaterial(x,y,cache=null){
    const surface=surfaceAt(x);
    const caveAt=cache?.caveAt??caveAirAt;
    const mushroomAt=cache?.mushroomAt??mushroomStrengthAt;
    if(!isEarthDimension(state.world.dimension)){
      return dimensionMaterialAt(state.world.dimension,x,y,surface,noise2,randomAt);
    }
    const volcanoFeature=volcanoFeatureAt(x,y,surface);
    if(volcanoFeature!==null)return volcanoFeature;
    if(y<surface.ground)return surface.lake&&y>=surface.water?M.WATER:M.AIR;

    const depth=y-surface.ground;
    if(caveAt(x,y,surface))return M.AIR;

    if(depth===0){
      if(surface.ocean)return M.SAND;
      if(surface.lake)return surface.biome===B.SWAMP?M.MUD:M.SAND;
      if(surface.biome===B.SNOW_PEAKS)return M.SNOW;
      if(surface.biome===B.SWAMP)return M.MUD;
      if(surface.biome===B.VOLCANO)return M.ASH;
      return M.GRASS;
    }

    // A deeper topsoil layer makes surface excavation read as soil rather than
    // immediately exposing stone.
    if(depth<11){
      if(surface.ocean)return depth<OCEAN_CONFIG.sandDepth?M.SAND:M.DIRT;
      if(surface.lake)return surface.biome===B.SWAMP?M.MUD:M.SAND;
      if(surface.biome===B.SNOW_PEAKS&&depth<4)return M.SNOW;
      if(surface.biome===B.SWAMP)return M.MUD;
      if(surface.biome===B.VOLCANO&&depth<5)return M.ASH;
      return M.DIRT;
    }

    const mushroomStrength=mushroomAt(x,y);
    const touchesCave=
      caveAt(x,y-1,surfaceAt(x))||
      caveAt(x-1,y,surfaceAt(x-1))||
      caveAt(x+1,y,surfaceAt(x+1));

    if(mushroomStrength>.34&&touchesCave)return M.MYCELIUM;

    // Broad underground soil pockets interrupt the stone with mineable dirt
    // clusters. Mushroom caverns replace the same pockets with mycelium dirt.
    const dirtCluster=noise2(x,y,48,1701)*.72+noise2(x,y,23,1702)*.28;
    if(depth<125&&dirtCluster>.735){
      return mushroomStrength>.42?M.MYCELIUM:M.DIRT;
    }

    if(surface.mix.weight(B.VOLCANO)>.35&&depth>40&&noise2(x,y,34,515)>.81)return M.LAVA;
    if(depth>112&&noise2(x,y,34,516)>.84)return M.LAVA;
    return M.ROCK;
  }

  function putGenerated(chunk,gx,gy,type){
    const x=gx-chunk.x*WORLD_WIDTH;
    const y=gy-chunk.y*WORLD_HEIGHT;
    if(x>=0&&y>=0&&x<WORLD_WIDTH&&y<WORLD_HEIGHT&&chunk.cells[index(x,y)]===M.AIR){
      chunk.cells[index(x,y)]=type;
    }
  }

  function generateVegetation(chunk){
    if(chunk.y!==0)return;

    const first=Math.floor((chunk.x*WORLD_WIDTH-40)/11);
    const last=Math.floor((chunk.x*WORLD_WIDTH+WORLD_WIDTH+40)/11);

    for(let slot=first;slot<=last;slot++){
      const x=slot*11+2+Math.floor(randomAt(slot,10,404)*7);
      const surface=surfaceAt(x);
      if(!isEarthDimension(state.world.dimension))continue;
      if(surface.ocean||surface.lake||Math.abs(surfaceAt(x-3).ground-surfaceAt(x+3).ground)>5)continue;

      const mix=surface.mix;
      const bambooWeight=mix.weight(B.BAMBOO_GROVE);
      const forestWeight=mix.weight(B.GIANT_FOREST);
      const swampWeight=mix.weight(B.SWAMP);
      const volcanoWeight=mix.weight(B.VOLCANO);
      const snowWeight=mix.weight(B.SNOW_PEAKS);

      if(bambooWeight>.42&&randomAt(slot,0,430)<.78*bambooWeight){
        const stems=2+Math.floor(randomAt(slot,1,431)*4);
        for(let stem=0;stem<stems;stem++){
          const gx=x-2+stem*2;
          const base=surfaceAt(gx).ground;
          const height=7+Math.floor(randomAt(gx,stem,433)*9);
          for(let i=1;i<=height;i++)putGenerated(chunk,gx,base-i,M.BAMBOO);
          putGenerated(chunk,gx-1,base-height-1,M.LEAF);
          putGenerated(chunk,gx,base-height-1,M.LEAF);
          putGenerated(chunk,gx+1,base-height-1,M.LEAF);
        }
        continue;
      }

      if(forestWeight>.42&&randomAt(slot,0,440)<.34*forestWeight){
        const height=18+Math.floor(randomAt(slot,2,442)*13);
        const width=2+Math.floor(randomAt(slot,1,441)*2);
        for(let trunkX=0;trunkX<width;trunkX++){
          for(let i=1;i<=height;i++)putGenerated(chunk,x+trunkX,surfaceAt(x+trunkX).ground-i,M.WOOD);
        }
        const top=surface.ground-height;
        for(let oy=-8;oy<=5;oy++){
          for(let ox=-10;ox<=11;ox++){
            if(ox*ox*.48+oy*oy<=42&&randomAt(x+ox,top+oy,443)>.12){
              putGenerated(chunk,x+ox,top+oy,M.LEAF);
            }
          }
        }
        continue;
      }

      if(swampWeight>.42&&randomAt(slot,0,450)<.46*swampWeight){
        const height=6+Math.floor(randomAt(slot,1,451)*6);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
        const top=surface.ground-height;
        for(let oy=-3;oy<=2;oy++){
          for(let ox=-4;ox<=4;ox++){
            if(ox*ox*.85+oy*oy<=11&&randomAt(x+ox,top+oy,452)>.22){
              putGenerated(chunk,x+ox,top+oy,M.LEAF);
            }
          }
        }
        for(let vine=-2;vine<=2;vine+=2){
          const length=2+Math.floor(randomAt(x+vine,0,453)*5);
          for(let i=0;i<length;i++)putGenerated(chunk,x+vine,top+1+i,M.LEAF);
        }
        continue;
      }

      if(volcanoWeight>.5){
        if(randomAt(slot,0,460)<.92)continue;
        const height=3+Math.floor(randomAt(slot,1,461)*4);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
        continue;
      }

      const treeWeight=Math.max(.25,1-bambooWeight*.7-swampWeight*.35-volcanoWeight*.8);
      if(randomAt(slot,0,480)>.44*treeWeight)continue;
      const height=7+Math.floor(randomAt(slot,1,481)*7);
      for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
      const top=surface.ground-height;

      for(let oy=-4;oy<=3;oy++){
        for(let ox=-5;ox<=5;ox++){
          if(ox*ox*.7+oy*oy<=18&&randomAt(x+ox,top+oy,482)>.18){
            putGenerated(chunk,x+ox,top+oy,M.LEAF);
          }
        }
      }

      if(snowWeight>.45){
        for(let oy=-4;oy<=0;oy++){
          for(let ox=-4;ox<=4;ox++){
            if(ox*ox*.75+oy*oy<=12&&randomAt(x+ox,top+oy,483)>.48){
              putGenerated(chunk,x+ox,top+oy,M.SNOW);
            }
          }
        }
      }
    }
  }

  function generateUndergroundMushrooms(chunk){
    const chunkTop=chunk.y*WORLD_HEIGHT;
    const chunkBottom=chunkTop+WORLD_HEIGHT;
    const first=Math.floor((chunk.x*WORLD_WIDTH-18)/8);
    const last=Math.floor((chunk.x*WORLD_WIDTH+WORLD_WIDTH+18)/8);

    for(let slot=first;slot<=last;slot++){
      const x=slot*8+2+Math.floor(randomAt(slot,12,1810)*5);
      const localX=x-chunk.x*WORLD_WIDTH;
      if(localX<0||localX>=WORLD_WIDTH)continue;

      const surface=surfaceAt(x);
      const scanStart=Math.max(chunkTop+3,surface.ground+28);
      const scanEnd=Math.min(chunkBottom-15,chunkBottom-3);

      for(let worldY=scanStart;worldY<scanEnd;worldY++){
        const localY=worldY-chunkTop;
        if(localY<1||localY>=WORLD_HEIGHT-1)continue;
        if(chunk.cells[index(localX,localY)]!==M.AIR)continue;
        if(chunk.cells[index(localX,localY+1)]!==M.MYCELIUM)continue;

        const strength=mushroomStrengthAt(x,worldY);
        if(strength<.48)continue;
        if(randomAt(x,worldY,1811)>.28*strength)continue;

        const big=randomAt(x,worldY,1812)<.2*strength;
        const height=big?
          8+Math.floor(randomAt(x,worldY,1813)*8):
          2+Math.floor(randomAt(x,worldY,1814)*4);
        const stemWidth=big&&randomAt(x,worldY,1815)>.45?2:1;

        for(let stemX=0;stemX<stemWidth;stemX++){
          for(let rise=0;rise<height;rise++){
            putGenerated(chunk,x+stemX,worldY-rise,M.MUSHROOM_STEM);
          }
        }

        const capY=worldY-height;
        const radius=big?5+Math.floor(randomAt(x,worldY,1816)*3):2;
        const verticalRadius=big?Math.max(2,Math.floor(radius*.55)):1;
        const centerX=x+(stemWidth-1)*.5;

        for(let oy=-verticalRadius;oy<=verticalRadius;oy++){
          for(let ox=-radius;ox<=radius;ox++){
            const normalized=ox*ox/(radius*radius)+oy*oy/(verticalRadius*verticalRadius||1);
            const underside=oy>0&&Math.abs(ox)>radius*.68;
            if(normalized<=1&&!underside&&randomAt(x+ox,capY+oy,1817)>.08){
              putGenerated(chunk,Math.round(centerX+ox),capY+oy,M.MUSHROOM_CAP);
            }
          }
        }

        // Keep mushrooms spaced vertically within the same scan column.
        break;
      }
    }
  }

  function generateBiomeFeatures(chunk){
    if(chunk.y!==0)return;

    const start=chunk.x*WORLD_WIDTH-40;
    const end=chunk.x*WORLD_WIDTH+WORLD_WIDTH+40;

    for(let x=start;x<end;x++){
      if(!isEarthDimension(state.world.dimension))continue;
      const surface=surfaceAt(x);
      const swampWeight=surface.mix.weight(B.SWAMP);
      if(swampWeight>.45&&surface.lake&&randomAt(x,0,610)>.93){
        const height=2+Math.floor(randomAt(x,1,611)*4);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.water-i,M.BAMBOO);
      }
    }
  }

  function openSpot(chunk,salt){
    for(let attempt=0;attempt<220;attempt++){
      const x=6+Math.floor(randomAt(chunk.x*71+attempt,chunk.y*43+salt,701)*(WORLD_WIDTH-12));
      const y=6+Math.floor(randomAt(chunk.x*53+salt,chunk.y*83+attempt,702)*(WORLD_HEIGHT-12));
      if(chunk.cells[index(x,y)]===M.AIR&&chunk.cells[index(x,y+2)]===M.AIR)return{x,y};
    }
    return null;
  }

  function weightedFauna(candidates,a,b,salt){
    if(candidates.length===0)return null;
    let total=0;
    for(const candidate of candidates)total+=candidate.spawnWeight??1;
    let roll=randomAt(a,b,salt)*total;
    for(const candidate of candidates){
      roll-=candidate.spawnWeight??1;
      if(roll<=0)return candidate;
    }
    return candidates[candidates.length-1];
  }

  function creatureAt(species,x,y,salt){
    return{
      speciesId:species.id,
      x:Math.round(x),
      y:Math.round(y),
      vx:0,
      vy:0,
      moveCarryX:0,
      moveCarryY:0,
      hp:species.hp,
      maxHp:species.hp,
      phase:randomAt(x,y,salt)*Math.PI*2,
      animationOffset:Math.floor(randomAt(y,x,salt+1)*240),
      facing:randomAt(x,y,salt+2)<.5?-1:1,
      hit:0,
      burning:0,
      attackCooldown:0,
      hopCooldown:20+Math.floor(randomAt(x,y,salt+3)*90),
      idleTimer:20+Math.floor(randomAt(y,x,salt+4)*120),
      startled:0,
    };
  }

  function surfaceSpawnPosition(chunk,species,slot,salt){
    const minWorldX=chunk.x*WORLD_WIDTH+5;
    const maxWorldX=(chunk.x+1)*WORLD_WIDTH-6;
    for(let attempt=0;attempt<48;attempt++){
      const gx=minWorldX+Math.floor(randomAt(chunk.x*431+slot*17+attempt,salt,7301)*(maxWorldX-minWorldX+1));
      const surface=surfaceAt(gx);
      if(!species.biomes.includes(surface.biome))continue;

      if(species.habitat==='water'){
        if(!surface.lake||surface.ground-surface.water<4)continue;
        const minY=surface.water+1;
        const maxY=surface.ground-2;
        if(maxY<minY)continue;
        const gy=minY+Math.floor(randomAt(gx,attempt,salt+1)*(maxY-minY+1));
        const localX=gx-chunk.x*WORLD_WIDTH;
        const localY=gy-chunk.y*WORLD_HEIGHT;
        if(localX<1||localX>=WORLD_WIDTH-1||localY<1||localY>=WORLD_HEIGHT-1)continue;
        if(chunk.cells[index(localX,localY)]===M.WATER)return{x:gx,y:gy};
        continue;
      }

      if(species.habitat==='air'){
        const ceiling=Math.max(5,(surface.lake?surface.water:surface.ground)-4);
        const gy=Math.max(5,ceiling-3-Math.floor(randomAt(gx,attempt,salt+2)*18));
        const localX=gx-chunk.x*WORLD_WIDTH;
        const localY=gy-chunk.y*WORLD_HEIGHT;
        if(localX<2||localX>=WORLD_WIDTH-2||localY<2||localY>=WORLD_HEIGHT-2)continue;
        if(chunk.cells[index(localX,localY)]===M.AIR&&chunk.cells[index(localX,localY+1)]===M.AIR)return{x:gx,y:gy};
        continue;
      }

      const gy=surface.ground-1;
      const localX=gx-chunk.x*WORLD_WIDTH;
      const localY=gy-chunk.y*WORLD_HEIGHT;
      if(localX<2||localX>=WORLD_WIDTH-2||localY<2||localY>=WORLD_HEIGHT-2)continue;
      const body=chunk.cells[index(localX,localY)];
      const head=chunk.cells[index(localX,localY-1)];
      const support=chunk.cells[index(localX,localY+1)];
      if(body===M.AIR&&head===M.AIR&&support!==M.AIR&&support!==M.WATER&&support!==M.LAVA)return{x:gx,y:gy};
    }
    return null;
  }

  function caveSpawnPosition(chunk,species,slot,salt){
    for(let attempt=0;attempt<120;attempt++){
      const localX=4+Math.floor(randomAt(chunk.x*613+slot*19+attempt,chunk.y*127+salt,7401)*(WORLD_WIDTH-8));
      const localY=4+Math.floor(randomAt(chunk.y*557+slot*23+attempt,chunk.x*109+salt,7402)*(WORLD_HEIGHT-8));
      const gx=chunk.x*WORLD_WIDTH+localX;
      const gy=chunk.y*WORLD_HEIGHT+localY;
      const underground=undergroundBiomeIdAt(gx,gy);
      if(!species.undergroundBiomes.includes(underground))continue;
      if(chunk.cells[index(localX,localY)]!==M.AIR)continue;

      if(species.habitat==='cave_air'){
        if(chunk.cells[index(localX,localY-1)]===M.AIR&&chunk.cells[index(localX,localY+1)]===M.AIR)return{x:gx,y:gy};
      }else{
        const support=chunk.cells[index(localX,localY+1)];
        if(support!==M.AIR&&support!==M.WATER&&support!==M.LAVA)return{x:gx,y:gy};
      }
    }
    return null;
  }

  function generateFauna(chunk){
    if(chunk.y<0)return;
    const centerX=chunk.x*WORLD_WIDTH+Math.floor(WORLD_WIDTH*.5);
    const centerY=chunk.y*WORLD_HEIGHT+Math.floor(WORLD_HEIGHT*.5);
    const surfaceChunk=chunk.y===0;
    const centerSurface=surfaceAt(centerX);
    if(!isEarthDimension(state.world.dimension))return;
    const targetCount=surfaceChunk
      ?5+Math.floor(randomAt(chunk.x,chunk.y,7501)*7)
      :4+Math.floor(randomAt(chunk.x,chunk.y,7502)*6);
    let spawned=0;

    for(let slot=0;slot<targetCount*3&&spawned<targetCount;slot++){
      const sampleX=chunk.x*WORLD_WIDTH+8+Math.floor(randomAt(chunk.x*83+slot,chunk.y,7503)*(WORLD_WIDTH-16));
      const candidates=surfaceChunk
        ?faunaForSurfaceBiome(surfaceAt(sampleX).biome)
        :faunaForUndergroundBiome(undergroundBiomeIdAt(sampleX,centerY));
      const species=weightedFauna(candidates,chunk.x*97+slot,chunk.y*131,7504);
      if(!species)continue;
      const groupSize=Math.max(1,Math.min(species.groupMax??1,
        (species.groupMin??1)+Math.floor(randomAt(slot,chunk.x+chunk.y,7505)*((species.groupMax??1)-(species.groupMin??1)+1))));

      for(let member=0;member<groupSize&&spawned<targetCount;member++){
        const position=surfaceChunk
          ?surfaceSpawnPosition(chunk,species,slot*11+member,7600+member)
          :caveSpawnPosition(chunk,species,slot*11+member,7700+member);
        if(!position)continue;
        if(chunk.enemies.some(enemy=>Math.hypot(enemy.x-position.x,enemy.y-position.y)<3))continue;
        chunk.enemies.push(creatureAt(species,position.x,position.y,7800+slot*17+member));
        spawned++;
      }
    }

    // Keep the old cave threat floor if a pathological cave generated no valid
    // habitat positions for the richer fauna table.
    if(!surfaceChunk&&chunk.enemies.length===0){
      const spot=openSpot(chunk,7991);
      if(spot){
        const gx=chunk.x*WORLD_WIDTH+spot.x;
        const gy=chunk.y*WORLD_HEIGHT+spot.y;
        const fallback=faunaForUndergroundBiome(undergroundBiomeIdAt(gx,gy))[0];
        if(fallback)chunk.enemies.push(creatureAt(fallback,gx,gy,7992));
      }
    }

    // Fully open ocean chunks should still feel alive even when the weighted
    // placement attempts hit a trench edge.
    if(surfaceChunk&&centerSurface.ocean&&chunk.enemies.length===0){
      const oceanSpecies=faunaForSurfaceBiome(B.OCEAN).filter(item=>item.habitat==='water');
      const fallback=weightedFauna(oceanSpecies,chunk.x,chunk.y,7993);
      if(fallback){
        const position=surfaceSpawnPosition(chunk,fallback,0,7994);
        if(position)chunk.enemies.push(creatureAt(fallback,position.x,position.y,7995));
      }
    }
  }


  function setGeneratedCell(chunk,gx,gy,type,{onlyAir=false}={}){
    const x=gx-chunk.x*WORLD_WIDTH;
    const y=gy-chunk.y*WORLD_HEIGHT;
    if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return;
    const i=index(x,y);
    if(onlyAir&&chunk.cells[i]!==M.AIR)return;
    chunk.cells[i]=type;
  }

  function carveGeneratedAir(chunk,gx0,gy0,gx1,gy1){
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++)for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++)setGeneratedCell(chunk,gx,gy,M.AIR);
  }

  function fillGeneratedRect(chunk,gx0,gy0,gx1,gy1,type,{onlyAir=false}={}){
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++)for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++)setGeneratedCell(chunk,gx,gy,type,{onlyAir});
  }

  function frameGeneratedRect(chunk,gx0,gy0,gx1,gy1,type){
    for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++){ setGeneratedCell(chunk,gx,Math.min(gy0,gy1),type); setGeneratedCell(chunk,gx,Math.max(gy0,gy1),type); }
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++){ setGeneratedCell(chunk,Math.min(gx0,gx1),gy,type); setGeneratedCell(chunk,Math.max(gx0,gx1),gy,type); }
  }

  function generateAuthoredStructures(chunk){
    const descriptors=structureDescriptorsForChunk(chunk,surfaceAt,biomeIdAt,randomAt,state.world.dimension);
    for(const descriptor of descriptors){
      applyStructureToChunk(chunk,descriptor,{
        surfaceAt,
        setCell:(gx,gy,type)=>setGeneratedCell(chunk,gx,gy,type),
        carveAir:(gx0,gy0,gx1,gy1)=>carveGeneratedAir(chunk,gx0,gy0,gx1,gy1),
        fillRect:(gx0,gy0,gx1,gy1,type)=>fillGeneratedRect(chunk,gx0,gy0,gx1,gy1,type),
        frameRect:(gx0,gy0,gx1,gy1,type)=>frameGeneratedRect(chunk,gx0,gy0,gx1,gy1,type),
      });
    }
  }

  function makeChunkCurrent(x,y){
    const chunk={
      x,
      y,
      dimension:state.world.dimension??DimensionId.EARTH,
      cells:new Uint8Array(CHUNK_CELL_COUNT),
      shade:new Uint8Array(CHUNK_CELL_COUNT),
      life:new Uint8Array(CHUNK_CELL_COUNT),
      moved:new Uint16Array(CHUNK_CELL_COUNT),
      age:new Uint16Array(CHUNK_CELL_COUNT),
      cropId:new Uint8Array(CHUNK_CELL_COUNT),
      plantId:new Uint32Array(CHUNK_CELL_COUNT),
      enemies:[],
    };

    const worldLeft=x*WORLD_WIDTH;
    const worldTop=y*WORLD_HEIGHT;
    const earthDimension=isEarthDimension(state.world.dimension);
    const caveWidth=WORLD_WIDTH+2;
    const caveHeight=WORLD_HEIGHT+1;
    const caveCache=new Uint8Array(caveWidth*caveHeight);
    for(let cacheY=-1;cacheY<WORLD_HEIGHT;cacheY++){
      const gy=worldTop+cacheY;
      for(let cacheX=-1;cacheX<=WORLD_WIDTH;cacheX++){
        const gx=worldLeft+cacheX;
        caveCache[(cacheX+1)+(cacheY+1)*caveWidth]=earthDimension?(caveAirAt(gx,gy,surfaceAt(gx))?1:0):0;
      }
    }
    const mushroomCache=new Float32Array(CHUNK_CELL_COUNT);
    mushroomCache.fill(-1);
    const generationCache={
      caveAt(gx,gy,surface){
        const localX=gx-worldLeft;
        const localY=gy-worldTop;
        if(localX>=-1&&localX<=WORLD_WIDTH&&localY>=-1&&localY<WORLD_HEIGHT){
          return caveCache[(localX+1)+(localY+1)*caveWidth]===1;
        }
        return caveAirAt(gx,gy,surface);
      },
      mushroomAt(gx,gy){
        const localX=gx-worldLeft;
        const localY=gy-worldTop;
        if(localX<0||localX>=WORLD_WIDTH||localY<0||localY>=WORLD_HEIGHT)return mushroomStrengthAt(gx,gy);
        const cacheIndex=index(localX,localY);
        const cached=mushroomCache[cacheIndex];
        if(cached>=0)return cached;
        const value=mushroomStrengthAt(gx,gy);
        mushroomCache[cacheIndex]=value;
        return value;
      },
    };

    for(let py=0;py<WORLD_HEIGHT;py++){
      for(let px=0;px<WORLD_WIDTH;px++){
        const gx=worldLeft+px;
        const gy=worldTop+py;
        const i=index(px,py);
        chunk.cells[i]=generatedMaterial(gx,gy,generationCache);
        chunk.shade[i]=Math.floor(randomAt(gx,gy,1337)*25);
      }
    }

    if(earthDimension){
      generateVegetation(chunk);
      generateBiomeFeatures(chunk);
      generateUndergroundMushrooms(chunk);
    }
    generateAuthoredStructures(chunk);

    if(y>0&&earthDimension){
      for(let i=0;i<5;i++){
        const spot=openSpot(chunk,i+20);
        if(spot&&chunk.cells[index(spot.x,spot.y+3)]===M.ROCK){
          chunk.cells[index(spot.x,spot.y+3)]=M.CRYSTAL;
        }
      }
    }

    if(earthDimension)generateFauna(chunk);

    return chunk;
  }

  function makeChunk(x,y,dimension=state.world.dimension??DimensionId.EARTH){
    const previous=state.world.dimension??DimensionId.EARTH;
    if(previous===dimension)return makeChunkCurrent(x,y);
    state.world.dimension=dimension;
    try{return makeChunkCurrent(x,y);}
    finally{state.world.dimension=previous;}
  }

  function biomeNameAt(x,y=null){
    if(!isEarthDimension(state.world.dimension))return dimensionName(state.world.dimension).toLowerCase().replaceAll(' ','_');
    if(Number.isFinite(y)&&undergroundBiomeIdAt(x,y)===U.MUSHROOM_CAVERNS){
      return undergroundBiomeName(U.MUSHROOM_CAVERNS);
    }
    return biomeName(biomeMixAt(x).dominant);
  }

  return {
    biomeIdAt,
    biomeMixAt,
    skyAt,
    surfaceAt,
    generatedMaterial,
    makeChunk,
    biomeNameAt,
    regionBiomeId,
    mushroomStrengthAt,
    undergroundBiomeIdAt,
    volcanoDescriptor,
    volcanoFeatureAt,
    oceanDescriptor,
    rocketSiloDescriptor:()=>rocketSiloDescriptor(surfaceAt,randomAt),
    dimensionSpawnPoint(dimension){
      const previous=state.world.dimension;
      state.world.dimension=dimension;
      try{
        const x=dimensionDefinition(dimension).spawnX??48;
        const surface=surfaceAt(x);
        return {x,y:surface.ground-1};
      }finally{state.world.dimension=previous;}
    },
    moonSpawnPoint(){ return this.dimensionSpawnPoint(DimensionId.MOON); },
    dimensionGravityScale:()=>dimensionDefinition(state.world.dimension).gravity??1,
    isMoonWorld:()=>isMoonDimension(state.world.dimension),
    isEarthWorld:()=>isEarthDimension(state.world.dimension),
  };
}

Object.assign(exports,{createWorldGenerator});

};

__modules["src/data/entities.db.js"]=function(exports,__require){
const ENTITY_DB = Object.freeze({
  player: {
    maxHealth: 100,
    width: 3,
    height: 5,
  },
  surfaceEnemy: {
    maxHealth: 30,
    contactDamage: 5,
    aggroRange: 48,
  },
  caveEnemy: {
    maxHealth: 45,
    contactDamage: 5,
    aggroRange: 48,
  },
  calderaBoss: {
    maxHealth: 320,
    width: 17,
    height: 11,
    contactDamage: 8,
  },
  seaSerpent: {
    maxHealth: 380,
    width: 15,
    height: 14,
    contactDamage: 9,
  },
  grenade: {
    fuseFrames: 78,
    blastRadius: 7,
    fireRadius: 9,
    directDamage: 0,
  },
});

Object.assign(exports,{ENTITY_DB});

};

__modules["src/world/structures.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT } = __require("src/config.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { BiomeId } = __require("src/data/biomes.db.js");
const { DimensionId, dimensionDefinition, isMoonDimension, isEarthDimension } = __require("src/data/dimensions.db.js");
const M=MaterialId;
const B=BiomeId;

const MOON_LANDING_X=48;
const STRUCTURE_SPACING=280;
const UNDERGROUND_STRUCTURE_SPACING=360;


function moonSurfaceProfile(x,randomAt,noise1){
  const worldX=Math.floor(x);
  const basin=(noise1(worldX,280,9101)-.5)*10;
  const crater=(noise1(worldX,74,9102)-.5)*8;
  const micro=(noise1(worldX,19,9103)-.5)*2;
  const base=58+basin+crater+micro;
  const craterCenter=Math.floor(worldX/58)*58+29;
  const craterDistance=Math.abs(worldX-craterCenter);
  const craterDepth=Math.max(0,1-craterDistance/16)*6;
  const ridge=Math.max(0,1-Math.abs(craterDistance-15)/6)*2;
  const ground=Math.max(34,Math.min(88,Math.floor(base+craterDepth-ridge)));
  return {
    ground,
    water:ground,
    lake:false,
    ocean:false,
    oceanWeight:0,
    lakeDepth:0,
    biome:'moon',
    mix:{
      dominant:B.PLAINS,
      entries:[{id:B.PLAINS,weight:1,regionIndex:0}],
      weight(){ return 0; },
    },
  };
}

function rocketSiloDescriptor(surfaceAt,randomAt){
  const region=0;
  const center=220+Math.floor(randomAt(region,0,9601)*90);
  const surface=surfaceAt(center);
  const chamberTop=surface.ground+18;
  const chamberBottom=surface.ground+40;
  return {
    id:'rocket_silo',
    unique:true,
    centerX:center,
    surfaceY:surface.ground,
    shaftTop:surface.ground-2,
    shaftBottom:chamberTop,
    chamberTop,
    chamberBottom,
    launchPadY:chamberBottom-4,
    launchZone:{x:center,y:chamberBottom-5,w:5,h:6},
  };
}

function chunkIntersects(chunk,gx0,gy0,gx1,gy1){
  const left=chunk.x*WORLD_WIDTH;
  const top=chunk.y*WORLD_HEIGHT;
  const right=left+WORLD_WIDTH-1;
  const bottom=top+WORLD_HEIGHT-1;
  return !(gx1<left||gx0>right||gy1<top||gy0>bottom);
}

function slotCenter(slot,randomAt){
  return slot*STRUCTURE_SPACING+80+Math.floor(randomAt(slot,0,9201)*120);
}

function undergroundSlotCenter(slot,randomAt){
  return slot*UNDERGROUND_STRUCTURE_SPACING+120+Math.floor(randomAt(slot,0,9202)*100);
}

function structureDescriptorsForChunk(chunk,surfaceAt,biomeIdAt,randomAt,dimension=DimensionId.EARTH){
  const results=[];
  const chunkLeft=chunk.x*WORLD_WIDTH;
  const chunkRight=chunkLeft+WORLD_WIDTH-1;
  const chunkTop=chunk.y*WORLD_HEIGHT;
  const chunkBottom=chunkTop+WORLD_HEIGHT-1;

  if(isMoonDimension(dimension)){
    if(chunk.y===0){
      const landingBase={id:'moon_outpost',centerX:140,surfaceY:surfaceAt(140).ground};
      if(chunkIntersects(chunk,landingBase.centerX-22,landingBase.surfaceY-18,landingBase.centerX+22,landingBase.surfaceY+4))results.push(landingBase);
      const firstSlot=Math.floor((chunkLeft-120)/720);
      const lastSlot=Math.floor((chunkRight+120)/720);
      for(let slot=firstSlot;slot<=lastSlot;slot++){
        if(slot===0)continue;
        const centerX=slot*720+180+Math.floor(randomAt(slot,9,9291)*300);
        const surfaceY=surfaceAt(centerX).ground;
        if(randomAt(slot,10,9292)>.55)results.push({id:'moon_outpost',centerX,surfaceY});
        else results.push({id:'lunar_monolith',centerX,surfaceY});
      }
    }
    return results;
  }

  if(!isEarthDimension(dimension)){
    if(chunk.y===0){
      const definition=dimensionDefinition(dimension);
      const spacing=560;
      const firstSlot=Math.floor((chunkLeft-120)/spacing);
      const lastSlot=Math.floor((chunkRight+120)/spacing);
      for(let slot=firstSlot;slot<=lastSlot;slot++){
        const centerX=slot*spacing+120+Math.floor(randomAt(slot,dimension.length,9298)*260);
        const surfaceY=surfaceAt(centerX).ground;
        if(slot===0||randomAt(slot,11,9299)>.48){
          results.push({id:definition.structure,centerX,surfaceY,dimension});
        }
      }
    }
    return results;
  }

  const rocket=rocketSiloDescriptor(surfaceAt,randomAt);
  if(chunkIntersects(chunk,rocket.centerX-18,rocket.surfaceY-10,rocket.centerX+18,rocket.chamberBottom+4))results.push(rocket);

  if(chunk.y===0){
    const firstSlot=Math.floor((chunkLeft-100)/STRUCTURE_SPACING);
    const lastSlot=Math.floor((chunkRight+100)/STRUCTURE_SPACING);
    for(let slot=firstSlot;slot<=lastSlot;slot++){
      const centerX=slotCenter(slot,randomAt);
      const surface=surfaceAt(centerX);
      if(surface.ocean||surface.lake&&surface.ground-surface.water>8){
        if(surface.ocean&&randomAt(slot,1,9203)>.52){
          results.push({id:'lighthouse',centerX,surfaceY:surface.ground,biome:biomeIdAt(centerX)});
        }
        continue;
      }
      if(Math.abs(surfaceAt(centerX-8).ground-surfaceAt(centerX+8).ground)>6)continue;
      if(randomAt(slot,2,9204)<.38)continue;
      const biome=biomeIdAt(centerX);
      const id=(function(){
        switch(biome){
          case B.PLAINS:return randomAt(slot,3,9205)<.5?'ruined_well':'stone_arch';
          case B.SNOW_PEAKS:return 'snow_temple';
          case B.BAMBOO_GROVE:return 'bamboo_shrine';
          case B.SWAMP:return 'swamp_hut';
          case B.VOLCANO:return 'ash_forge';
          case B.GIANT_FOREST:return randomAt(slot,4,9206)<.5?'tree_house':'forest_tower';
          case B.OCEAN:return 'lighthouse';
          default:return 'stone_arch';
        }
      }());
      results.push({id,centerX,surfaceY:surface.ground,biome});
    }
  }

  if(chunk.y>=1){
    const firstSlot=Math.floor((chunkLeft-120)/UNDERGROUND_STRUCTURE_SPACING);
    const lastSlot=Math.floor((chunkRight+120)/UNDERGROUND_STRUCTURE_SPACING);
    for(let slot=firstSlot;slot<=lastSlot;slot++){
      const centerX=undergroundSlotCenter(slot,randomAt);
      const centerY=chunkTop+Math.floor(WORLD_HEIGHT*.5);
      const surface=surfaceAt(centerX);
      const depth=centerY-surface.ground;
      if(depth<18)continue;
      if(randomAt(slot,chunk.y,9210)<.55)continue;
      let id='mine_shaft';
      if(depth>54&&randomAt(slot,chunk.y,9211)<.35)id='crystal_vault';
      else if(depth>34&&randomAt(slot,chunk.y,9212)<.33)id='mushroom_hamlet';
      else if(depth>26&&randomAt(slot,chunk.y,9213)<.28)id='buried_library';
      results.push({id,centerX,centerY,depth});
    }
  }

  return results;
}

function applyStructureToChunk(chunk,descriptor,helpers){
  const { surfaceAt, setCell, carveAir, fillRect, frameRect }=helpers;
  const cx=Math.round(descriptor.centerX);

  if(descriptor.id==='rocket_silo'){
    const top=descriptor.shaftTop;
    const shaftBottom=descriptor.chamberTop;
    frameRect(cx-3,top-3,cx+3,top,M.ROCK);
    carveAir(cx-2,top-2,cx+2,top-1);
    fillRect(cx-2,top,cx+2,descriptor.launchPadY+1,M.AIR);
    frameRect(cx-3,top,cx+3,descriptor.launchPadY+1,M.ROCK);
    fillRect(cx-9,descriptor.chamberTop,cx+9,descriptor.chamberBottom,M.AIR);
    frameRect(cx-10,descriptor.chamberTop-1,cx+10,descriptor.chamberBottom+1,M.ROCK);
    fillRect(cx-6,descriptor.launchPadY+1,cx+6,descriptor.chamberBottom+1,M.ROCK);
    carveAir(cx-5,descriptor.launchPadY-7,cx+5,descriptor.launchPadY);
    fillRect(cx-1,descriptor.launchPadY-6,cx+1,descriptor.launchPadY-1,M.WOOD);
    fillRect(cx-2,descriptor.launchPadY-7,cx+2,descriptor.launchPadY-7,M.CRYSTAL);
    fillRect(cx-3,descriptor.launchPadY+1,cx+3,descriptor.launchPadY+1,M.CRYSTAL);
    return;
  }

  if(descriptor.id==='moon_outpost'){
    const y=descriptor.surfaceY;
    fillRect(cx-18,y-1,cx+18,y+1,M.CRYSTAL);
    frameRect(cx-11,y-12,cx+11,y-1,M.ROCK);
    carveAir(cx-10,y-11,cx+10,y-2);
    fillRect(cx-3,y-9,cx+3,y-4,M.CRYSTAL);
    fillRect(cx-7,y-3,cx-4,y-2,M.CRYSTAL);
    fillRect(cx+4,y-3,cx+7,y-2,M.CRYSTAL);
    return;
  }

  if(descriptor.id==='lunar_monolith'){
    const y=descriptor.surfaceY;
    fillRect(cx-2,y-17,cx+2,y,M.ROCK);
    fillRect(cx-1,y-15,cx+1,y-2,M.CRYSTAL);
    fillRect(cx-7,y-1,cx+7,y+1,M.SAND);
    return;
  }

  const specialY=descriptor.surfaceY;
  if(descriptor.id==='ember_fortress'){
    frameRect(cx-13,specialY-12,cx+13,specialY,M.ROCK);
    carveAir(cx-11,specialY-10,cx+11,specialY-1);
    fillRect(cx-7,specialY-2,cx+7,specialY-1,M.LAVA);
    fillRect(cx-2,specialY-16,cx+2,specialY-11,M.ASH);
    return;
  }
  if(descriptor.id==='ice_cathedral'){
    frameRect(cx-14,specialY-13,cx+14,specialY,M.CRYSTAL);
    carveAir(cx-12,specialY-11,cx+12,specialY-1);
    fillRect(cx-4,specialY-18,cx+4,specialY-13,M.SNOW);
    fillRect(cx-10,specialY-4,cx-7,specialY-1,M.SNOW);
    fillRect(cx+7,specialY-4,cx+10,specialY-1,M.SNOW);
    return;
  }
  if(descriptor.id==='prism_spire'){
    for(let layer=0;layer<20;layer++)fillRect(cx-Math.max(1,5-Math.floor(layer/4)),specialY-layer,cx+Math.max(1,5-Math.floor(layer/4)),specialY-layer,M.CRYSTAL);
    fillRect(cx-9,specialY-1,cx+9,specialY+1,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='drowned_dome'){
    frameRect(cx-14,specialY-12,cx+14,specialY,M.CRYSTAL);
    carveAir(cx-12,specialY-10,cx+12,specialY-1);
    fillRect(cx-5,specialY-3,cx+5,specialY-1,M.WOOD);
    return;
  }
  if(descriptor.id==='living_temple'){
    fillRect(cx-12,specialY-9,cx-9,specialY,M.WOOD);
    fillRect(cx+9,specialY-9,cx+12,specialY,M.WOOD);
    fillRect(cx-12,specialY-12,cx+12,specialY-9,M.LEAF);
    carveAir(cx-8,specialY-8,cx+8,specialY-1);
    fillRect(cx-2,specialY-6,cx+2,specialY-1,M.MYCELIUM);
    return;
  }
  if(descriptor.id==='gear_tower'){
    frameRect(cx-10,specialY-16,cx+10,specialY,M.ROCK);
    carveAir(cx-8,specialY-14,cx+8,specialY-1);
    for(let y=specialY-13;y<specialY;y+=4)fillRect(cx-7,y,cx+7,y,M.CRYSTAL);
    fillRect(cx-2,specialY-21,cx+2,specialY-16,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='impossible_house'){
    frameRect(cx-12,specialY-9,cx+8,specialY,M.MUSHROOM_CAP);
    carveAir(cx-10,specialY-7,cx+6,specialY-1);
    frameRect(cx-5,specialY-16,cx+13,specialY-8,M.MYCELIUM);
    carveAir(cx-3,specialY-14,cx+11,specialY-9);
    fillRect(cx-1,specialY-5,cx+2,specialY-1,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='cloud_shrine'){
    fillRect(cx-15,specialY-1,cx+15,specialY+1,M.SNOW);
    fillRect(cx-8,specialY-8,cx-6,specialY-2,M.CRYSTAL);
    fillRect(cx+6,specialY-8,cx+8,specialY-2,M.CRYSTAL);
    fillRect(cx-8,specialY-10,cx+8,specialY-8,M.SNOW);
    carveAir(cx-5,specialY-7,cx+5,specialY-2);
    return;
  }
  if(descriptor.id==='glitch_obelisk'){
    for(let y=0;y<19;y++){
      const offset=(y%4===0)?2:0;
      fillRect(cx-3+offset,specialY-y,cx+3+offset,specialY-y,y%3===0?M.CRYSTAL:M.MYCELIUM);
    }
    fillRect(cx-10,specialY-1,cx+10,specialY+1,M.ASH);
    return;
  }

  const surfaceY=descriptor.surfaceY;
  switch(descriptor.id){
    case 'ruined_well':
      frameRect(cx-5,surfaceY-6,cx+5,surfaceY,M.ROCK);
      carveAir(cx-4,surfaceY-5,cx+4,surfaceY-1);
      fillRect(cx-2,surfaceY-1,cx+2,surfaceY+2,M.WATER);
      fillRect(cx-6,surfaceY,cx-4,surfaceY,M.ROCK);
      fillRect(cx+4,surfaceY,cx+6,surfaceY,M.ROCK);
      break;
    case 'stone_arch':
      fillRect(cx-8,surfaceY-7,cx-6,surfaceY,M.ROCK);
      fillRect(cx+6,surfaceY-7,cx+8,surfaceY,M.ROCK);
      fillRect(cx-8,surfaceY-9,cx+8,surfaceY-7,M.ROCK);
      carveAir(cx-5,surfaceY-6,cx+5,surfaceY-1);
      break;
    case 'snow_temple':
      frameRect(cx-9,surfaceY-10,cx+9,surfaceY,M.CRYSTAL);
      carveAir(cx-8,surfaceY-9,cx+8,surfaceY-1);
      fillRect(cx-10,surfaceY,cx+10,surfaceY+1,M.SNOW);
      fillRect(cx-2,surfaceY-4,cx+2,surfaceY-1,M.CRYSTAL);
      break;
    case 'bamboo_shrine':
      fillRect(cx-8,surfaceY-1,cx+8,surfaceY,M.BAMBOO);
      fillRect(cx-7,surfaceY-8,cx-6,surfaceY-2,M.BAMBOO);
      fillRect(cx+6,surfaceY-8,cx+7,surfaceY-2,M.BAMBOO);
      fillRect(cx-8,surfaceY-9,cx+8,surfaceY-8,M.BAMBOO);
      fillRect(cx-5,surfaceY-6,cx+5,surfaceY-5,M.LEAF);
      carveAir(cx-4,surfaceY-4,cx+4,surfaceY-1);
      break;
    case 'swamp_hut':
      fillRect(cx-7,surfaceY-4,cx+7,surfaceY-1,M.WOOD);
      fillRect(cx-9,surfaceY-1,cx-8,surfaceY+3,M.WOOD);
      fillRect(cx+8,surfaceY-1,cx+9,surfaceY+3,M.WOOD);
      fillRect(cx-7,surfaceY-7,cx+7,surfaceY-5,M.LEAF);
      carveAir(cx-5,surfaceY-3,cx+5,surfaceY-2);
      break;
    case 'ash_forge':
      frameRect(cx-9,surfaceY-7,cx+9,surfaceY,M.ROCK);
      carveAir(cx-8,surfaceY-6,cx+8,surfaceY-1);
      fillRect(cx-4,surfaceY-2,cx+4,surfaceY-1,M.LAVA);
      fillRect(cx-10,surfaceY,cx+10,surfaceY+1,M.ASH);
      break;
    case 'tree_house':
      fillRect(cx-1,surfaceY-18,cx+1,surfaceY,M.WOOD);
      fillRect(cx-6,surfaceY-15,cx+6,surfaceY-10,M.WOOD);
      carveAir(cx-5,surfaceY-14,cx+5,surfaceY-11);
      fillRect(cx-8,surfaceY-18,cx+8,surfaceY-16,M.LEAF);
      break;
    case 'forest_tower':
      fillRect(cx-2,surfaceY-16,cx+2,surfaceY,M.WOOD);
      fillRect(cx-7,surfaceY-16,cx+7,surfaceY-14,M.WOOD);
      fillRect(cx-7,surfaceY-9,cx+7,surfaceY-7,M.WOOD);
      carveAir(cx-6,surfaceY-15,cx+6,surfaceY-8);
      break;
    case 'lighthouse':
      fillRect(cx-3,surfaceY-17,cx+3,surfaceY,M.ROCK);
      fillRect(cx-5,surfaceY-19,cx+5,surfaceY-17,M.WOOD);
      carveAir(cx-2,surfaceY-16,cx+2,surfaceY-1);
      fillRect(cx-2,surfaceY-18,cx+2,surfaceY-18,M.CRYSTAL);
      break;
    default:
      break;
  }

  if(descriptor.id==='mine_shaft' || descriptor.id==='crystal_vault' || descriptor.id==='mushroom_hamlet' || descriptor.id==='buried_library'){
    const cy=Math.round(descriptor.centerY);
    if(descriptor.id==='mine_shaft'){
      fillRect(cx-10,cy-5,cx+10,cy+5,M.AIR);
      frameRect(cx-11,cy-6,cx+11,cy+6,M.WOOD);
      fillRect(cx-7,cy,cx+7,cy+1,M.ROCK);
    }else if(descriptor.id==='crystal_vault'){
      fillRect(cx-12,cy-6,cx+12,cy+6,M.AIR);
      frameRect(cx-13,cy-7,cx+13,cy+7,M.ROCK);
      fillRect(cx-5,cy-2,cx+5,cy+2,M.CRYSTAL);
      fillRect(cx-9,cy+4,cx-7,cy+5,M.CRYSTAL);
      fillRect(cx+7,cy-5,cx+9,cy-4,M.CRYSTAL);
    }else if(descriptor.id==='mushroom_hamlet'){
      fillRect(cx-14,cy-6,cx+14,cy+6,M.AIR);
      frameRect(cx-15,cy-7,cx+15,cy+7,M.MYCELIUM);
      fillRect(cx-10,cy+1,cx-4,cy+5,M.MUSHROOM_STEM);
      fillRect(cx-12,cy-1,cx-2,cy+1,M.MUSHROOM_CAP);
      fillRect(cx+4,cy+1,cx+10,cy+5,M.MUSHROOM_STEM);
      fillRect(cx+2,cy-1,cx+12,cy+1,M.MUSHROOM_CAP);
    }else if(descriptor.id==='buried_library'){
      fillRect(cx-13,cy-5,cx+13,cy+5,M.AIR);
      frameRect(cx-14,cy-6,cx+14,cy+6,M.ROCK);
      fillRect(cx-11,cy-4,cx-9,cy+3,M.WOOD);
      fillRect(cx+9,cy-4,cx+11,cy+3,M.WOOD);
      fillRect(cx-7,cy+2,cx+7,cy+3,M.WOOD);
      fillRect(cx-2,cy-2,cx+2,cy+1,M.CRYSTAL);
    }
  }
}

Object.assign(exports,{MOON_LANDING_X,STRUCTURE_SPACING,UNDERGROUND_STRUCTURE_SPACING,moonSurfaceProfile,rocketSiloDescriptor,structureDescriptorsForChunk,applyStructureToChunk});

};

__modules["src/world/chunks.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, ACTIVE_RADIUS } = __require("src/config.js");
function createChunkManager(state,generator){
  const store=state.world;

  const key=(x,y,dimension=store.dimension??'earth')=>`${dimension}:${x},${y}`;
  const chunkX=x=>Math.floor(x/WORLD_WIDTH);
  const chunkY=y=>Math.floor(y/WORLD_HEIGHT);
  const localX=x=>((Math.floor(x)%WORLD_WIDTH)+WORLD_WIDTH)%WORLD_WIDTH;
  const localY=y=>((Math.floor(y)%WORLD_HEIGHT)+WORLD_HEIGHT)%WORLD_HEIGHT;
  const index=(x,y)=>x+y*WORLD_WIDTH;

  function getChunk(x,y,create=true,dimension=store.dimension??'earth'){
    const chunkKey=key(x,y,dimension);
    if(!store.chunks.has(chunkKey)&&create){
      store.chunks.set(chunkKey,generator.makeChunk(x,y,dimension));
    }
    return store.chunks.get(chunkKey)??null;
  }

  function updateActiveNeighborhood(){
    store.camera.chunkX=chunkX(state.player.x);
    store.camera.chunkY=chunkY(state.player.y);
    store.activeChunks.length=0;
    store.activeKeys.clear();

    for(let offsetY=-ACTIVE_RADIUS;offsetY<=ACTIVE_RADIUS;offsetY++){
      for(let offsetX=-ACTIVE_RADIUS;offsetX<=ACTIVE_RADIUS;offsetX++){
        const chunk=getChunk(store.camera.chunkX+offsetX,store.camera.chunkY+offsetY,true,store.dimension);
        store.activeChunks.push(chunk);
        store.activeKeys.add(key(chunk.x,chunk.y,store.dimension));
      }
    }
  }

  function isActiveWorldPosition(x,y){
    return store.activeKeys.has(key(chunkX(x),chunkY(y),store.dimension));
  }

  return {
    key,
    chunkX,
    chunkY,
    localX,
    localY,
    index,
    getChunk,
    updateActiveNeighborhood,
    isActiveWorldPosition,
  };
}

Object.assign(exports,{createChunkManager});

};

__modules["src/world/cells.js"]=function(exports,__require){
const { MATERIAL_DB, MaterialId } = __require("src/data/materials.db.js");
const { playerOccupiesPixel } = __require("src/player-geometry.js");
function createCellAccess(state,chunks,noise){
  const M=MaterialId;
  const changeListeners=new Set();
  const trackedMaterialTypes=new Set(MATERIAL_DB.filter(item=>item.dynamic).map(item=>item.id));
  trackedMaterialTypes.add(M.DIRT);

  function ensureChunkTracking(chunk){
    if(!chunk.activeMaterialFlags){
      chunk.activeMaterialFlags=new Uint8Array(chunk.cells.length);
      chunk.activeMaterialQueued=new Uint8Array(chunk.cells.length);
      chunk.activeMaterialQueue=[];
      chunk.activeMaterialCount=0;
      chunk.activeMaterialInitialized=false;
    }
    if(!chunk.renderDirtyFlags){
      chunk.renderDirtyFlags=new Uint8Array(chunk.cells.length);
      chunk.renderDirtyQueue=[];
      chunk.renderAllDirty=true;
    }
    if(!chunk.saveDirtyIndices)chunk.saveDirtyIndices=new Set();
    return chunk;
  }

  function initializeChunkTracking(chunk){
    ensureChunkTracking(chunk);
    if(chunk.activeMaterialInitialized)return chunk;
    chunk.activeMaterialQueue.length=0;
    chunk.activeMaterialFlags.fill(0);
    chunk.activeMaterialQueued.fill(0);
    chunk.activeMaterialCount=0;
    for(let index=0;index<chunk.cells.length;index++){
      if(!trackedMaterialTypes.has(chunk.cells[index]))continue;
      chunk.activeMaterialFlags[index]=1;
      chunk.activeMaterialQueued[index]=1;
      chunk.activeMaterialQueue.push(index);
      chunk.activeMaterialCount++;
    }
    chunk.activeMaterialInitialized=true;
    return chunk;
  }

  function refreshMaterialTracking(chunk,index){
    initializeChunkTracking(chunk);
    const shouldTrack=trackedMaterialTypes.has(chunk.cells[index]);
    const tracked=chunk.activeMaterialFlags[index]===1;
    if(shouldTrack===tracked)return;
    chunk.activeMaterialFlags[index]=shouldTrack?1:0;
    chunk.activeMaterialCount+=shouldTrack?1:-1;
    if(shouldTrack&&!chunk.activeMaterialQueued[index]){
      chunk.activeMaterialQueued[index]=1;
      chunk.activeMaterialQueue.push(index);
    }
  }

  function markSaveDirty(chunk,index){
    ensureChunkTracking(chunk);
    chunk.saveDirtyIndices.add(index);
  }

  function markRenderDirty(chunk,index){
    ensureChunkTracking(chunk);
    if(chunk.renderDirtyFlags[index])return;
    chunk.renderDirtyFlags[index]=1;
    chunk.renderDirtyQueue.push(index);
  }

  function playerOccupiesCell(x,y){
    const player=state.player;
    if(!player)return false;
    return playerOccupiesPixel(
      Math.floor(x),
      Math.floor(y),
      player.x,
      player.y,
      player.width,
      player.height,
    );
  }

  function cellRef(x,y){
    const chunkX=chunks.chunkX(x);
    const chunkY=chunks.chunkY(y);
    const chunk=chunks.getChunk(chunkX,chunkY,false);
    if(!chunk||!state.world.activeKeys.has(chunks.key(chunkX,chunkY)))return null;
    return {
      chunk,
      index:chunks.index(chunks.localX(x),chunks.localY(y)),
    };
  }

  function getCell(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.cells[ref.index]:M.ROCK;
  }

  function getLife(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.life[ref.index]:0;
  }

  function getCropId(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.cropId?.[ref.index]??0:0;
  }

  function getPlantId(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.plantId?.[ref.index]??0:0;
  }

  function emitChange(event){
    if(event.silent)return;
    for(const listener of changeListeners)listener(event);
  }

  function setCell(x,y,type,life=0,metadata=null){
    const ref=cellRef(x,y);
    if(!ref)return false;

    const options=metadata&&typeof metadata==='object'?metadata:{};
    const oldType=ref.chunk.cells[ref.index];
    const oldCropId=ref.chunk.cropId?.[ref.index]??0;
    const oldPlantId=ref.chunk.plantId?.[ref.index]??0;
    const newCropId=options.cropId??0;
    const newPlantId=options.plantId??0;

    // No simulation or construction system may introduce a new solid pixel
    // inside the visible player footprint. This covers growing crops, falling
    // powder, boss-created terrain, lava cooling, and future cell writers.
    const introducesSolid=(MATERIAL_DB[type]?.solid??true)&&!(MATERIAL_DB[oldType]?.solid??true);
    if(introducesSolid&&playerOccupiesCell(x,y)&&!options.allowPlayerOverlap)return false;

    ref.chunk.cells[ref.index]=type;
    ref.chunk.life[ref.index]=life;
    ref.chunk.age[ref.index]=0;
    if(ref.chunk.cropId)ref.chunk.cropId[ref.index]=newCropId;
    if(ref.chunk.plantId)ref.chunk.plantId[ref.index]=newPlantId;
    ref.chunk.shade[ref.index]=Math.floor(noise.randomAt(x,y,state.frame+97)*25);
    refreshMaterialTracking(ref.chunk,ref.index);
    markRenderDirty(ref.chunk,ref.index);
    markSaveDirty(ref.chunk,ref.index);

    if(oldType!==type||oldCropId!==newCropId||oldPlantId!==newPlantId){
      emitChange({
        x,
        y,
        oldType,
        newType:type,
        oldCropId,
        newCropId,
        oldPlantId,
        newPlantId,
        reason:options.reason??'simulation',
        silent:Boolean(options.silent),
      });
    }
    return true;
  }

  function setPlantCell(x,y,type,cropId,plantId,options=null){
    return setCell(x,y,type,0,{
      cropId,
      plantId,
      silent:Boolean(options?.silent),
      reason:options?.reason??'plant-growth',
    });
  }

  function getAge(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.age[ref.index]:0;
  }

  function setAge(x,y,age){
    const ref=cellRef(x,y);
    if(!ref)return false;
    ref.chunk.age[ref.index]=Math.max(0,Math.min(65535,age));
    markSaveDirty(ref.chunk,ref.index);
    return true;
  }

  function setLife(x,y,life){
    const ref=cellRef(x,y);
    if(!ref)return false;
    ref.chunk.life[ref.index]=life;
    markRenderDirty(ref.chunk,ref.index);
    markSaveDirty(ref.chunk,ref.index);
    return true;
  }

  function swapCells(ax,ay,bx,by){
    const a=cellRef(ax,ay);
    const b=cellRef(bx,by);
    if(!a||!b)return false;

    const type=a.chunk.cells[a.index];
    const shade=a.chunk.shade[a.index];
    const life=a.chunk.life[a.index];
    const age=a.chunk.age[a.index];
    const cropId=a.chunk.cropId?.[a.index]??0;
    const plantId=a.chunk.plantId?.[a.index]??0;
    const otherType=b.chunk.cells[b.index];

    // Dynamic solids cannot swap into the player's sprite. Non-solid liquids
    // and gases may still move through those cells normally.
    if((MATERIAL_DB[type]?.solid??true)&&playerOccupiesCell(bx,by))return false;
    if((MATERIAL_DB[otherType]?.solid??true)&&playerOccupiesCell(ax,ay))return false;

    a.chunk.cells[a.index]=otherType;
    a.chunk.shade[a.index]=b.chunk.shade[b.index];
    a.chunk.life[a.index]=b.chunk.life[b.index];
    a.chunk.age[a.index]=b.chunk.age[b.index];
    if(a.chunk.cropId)a.chunk.cropId[a.index]=b.chunk.cropId?.[b.index]??0;
    if(a.chunk.plantId)a.chunk.plantId[a.index]=b.chunk.plantId?.[b.index]??0;

    b.chunk.cells[b.index]=type;
    b.chunk.shade[b.index]=shade;
    b.chunk.life[b.index]=life;
    b.chunk.age[b.index]=age;
    if(b.chunk.cropId)b.chunk.cropId[b.index]=cropId;
    if(b.chunk.plantId)b.chunk.plantId[b.index]=plantId;
    b.chunk.moved[b.index]=state.world.simulationStamp;
    refreshMaterialTracking(a.chunk,a.index);
    refreshMaterialTracking(b.chunk,b.index);
    markRenderDirty(a.chunk,a.index);
    markRenderDirty(b.chunk,b.index);
    markSaveDirty(a.chunk,a.index);
    markSaveDirty(b.chunk,b.index);
    return true;
  }

  function isSolid(type){
    return MATERIAL_DB[type]?.solid??true;
  }

  function isAir(x,y){
    return getCell(x,y)===M.AIR;
  }

  function onChange(listener){
    changeListeners.add(listener);
    return()=>changeListeners.delete(listener);
  }

  return {
    cellRef,
    getCell,
    getLife,
    getCropId,
    getPlantId,
    getAge,
    setAge,
    setCell,
    setPlantCell,
    setLife,
    swapCells,
    isSolid,
    isAir,
    onChange,
    ensureChunkTracking,
    initializeChunkTracking,
    refreshMaterialTracking,
    markRenderDirty,
    markSaveDirty,
  };
}

Object.assign(exports,{createCellAccess});

};

__modules["src/ui/hud.js"]=function(exports,__require){
const { ACTIVE_CHUNK_COUNT, MAGNIFIER_CONFIG, HUNGER_CONFIG, BREATH_CONFIG } = __require("src/config.js");
const { materialName } = __require("src/data/materials.db.js");
const { cropById } = __require("src/data/crops.db.js");
const { WeaponId, weaponName } = __require("src/data/weapons.db.js");
const { lootById } = __require("src/data/fauna.db.js");
const { dimensionDefinition } = __require("src/data/dimensions.db.js");
const { FURNITURE_DB, furnitureById, furnitureRecipeText } = __require("src/data/furniture.db.js");
function createHud(state,generator,timeSystem,weatherSystem=null){
  function inventoryTotal(){
    return state.inventory.list().reduce((total,item)=>total+item.count,0);
  }

  function inventoryEntries(){
    return state.inventory.list().map(item=>{
      if(item.kind==='material'){
        return {
          ...item,
          name:materialName(item.materialId),
          action:item.placeable?'EQUIP':'STORED',
          selected:state.build.active&&state.build.equippedMaterial===item.materialId,
        };
      }
      if(item.kind==='furniture'){
        const furniture=furnitureById(item.furnitureId);
        return {...item,name:furniture?.name??'unknown furniture',action:'EQUIP',selected:state.build.active&&state.build.equippedFurnitureId===item.furnitureId};
      }
      if(item.kind==='loot'){
        const loot=lootById(item.lootId);
        return {...item,name:loot?.name??'unknown loot',action:loot?.edible?'EAT':loot?.cookTo?'COOK':'LOOT',selected:false};
      }
      const crop=cropById(item.cropId);
      if(item.kind==='seed'){
        return {
          ...item,
          name:crop?.seedName??'unknown seeds',
          action:'EQUIP',
          selected:state.seedMode.active&&state.seedMode.cropId===item.cropId,
        };
      }
      return {
        ...item,
        name:crop?.produceName??'unknown produce',
        action:'EAT',
        selected:false,
      };
    });
  }

  function trimInventorySelection(entries){
    const max=Math.max(0,entries.length-1);
    state.ui.inventoryIndex=Math.max(0,Math.min(max,state.ui.inventoryIndex));
  }

  function update(){
    const camera=state.world.camera;
    const equipped=state.build.equippedMaterial;
    const equippedFurniture=state.build.equippedFurnitureId;
    const furnitureDefinition=furnitureById(equippedFurniture);
    const seedCrop=state.seedMode.cropId;
    const seed=state.seedMode.active?cropById(seedCrop):null;
    const isTool=state.weaponId===WeaponId.DESTRUCULATOR&&!state.build.active&&!state.seedMode.active;
    const isDroneStrike=state.weaponId===WeaponId.DRONE_STRIKE&&!state.build.active&&!state.seedMode.active;
    const isRealityZipper=state.weaponId===WeaponId.REALITY_ZIPPER&&!state.build.active&&!state.seedMode.active;
    const isLaser=state.weaponId===WeaponId.LASER_RIFLE&&!state.build.active&&!state.seedMode.active;
    const blockBuildActive=state.build.active&&Number.isInteger(equipped);
    const furnitureBuildActive=state.build.active&&Boolean(furnitureDefinition);
    const buildActive=blockBuildActive||furnitureBuildActive;
    const seedActive=state.seedMode.active&&Boolean(seed);
    const time=timeSystem.getTime();
    const weather=weatherSystem?.getWeather?.()??{label:'Clear',windLabel:'calm',type:'clear'};
    const entries=inventoryEntries();
    trimInventorySelection(entries);

    let toolStatus=state.ui.contextPrompt||'';
    if(!toolStatus&&furnitureBuildActive){
      toolStatus=`PLACE ${furnitureDefinition.name.toUpperCase()} X${state.inventory.furnitureCount(equippedFurniture)}  CLICK BUILD  F USE  ESC EMPTY`;
    }else if(!toolStatus&&blockBuildActive){
      toolStatus=`BUILD ${materialName(equipped)} X${state.inventory.counts[equipped]}  CLICK PLACE  ESC EMPTY`;
    }else if(!toolStatus&&seedActive){
      toolStatus=`${seed.seedName} X${state.inventory.seedCount(seedCrop)}  CLICK SCATTER`;
    }else if(!toolStatus&&isTool){
      toolStatus='DESTRUCULATOR  DESTROYS AND COLLECTS FIRST BLOCK';
    }else if(!toolStatus&&isDroneStrike){
      toolStatus='DRONE STRIKE  TARGETS HIGHEST PIXEL IN COLUMN';
    }else if(!toolStatus&&isLaser){
      toolStatus=state.laser.overheated?'LASER OVERHEATED  RELEASE TO COOL':'HOLD CLICK  CONTINUOUS LASER  HEATS PIXELS';
    }

    const crafting=FURNITURE_DB.map(definition=>({
      id:definition.id,
      name:definition.name,
      category:definition.category,
      recipe:furnitureRecipeText(definition,materialName),
      affordable:(definition.recipe??[]).every(cost=>(state.inventory.counts[cost.materialId]??0)>=cost.count),
      owned:state.inventory.furnitureCount(definition.id),
    }));
    state.ui.craftingIndex=Math.max(0,Math.min(crafting.length-1,state.ui.craftingIndex??0));

    state.ui.toolStatus=toolStatus;
    state.ui.hud={
      hp:Math.max(0,Math.round(state.player.hp)),
      maxHp:100,
      hunger:Math.max(0,Math.round(state.player.hunger)),
      maxHunger:HUNGER_CONFIG.max,
      lowHunger:state.player.hunger<=HUNGER_CONFIG.lowThreshold,
      criticalHunger:state.player.hunger<=HUNGER_CONFIG.criticalThreshold,
      breath:Math.max(0,Math.round(state.player.breath)),
      maxBreath:BREATH_CONFIG.max,
      breathUsing:Boolean(state.player.status?.breathUsing),
      criticalBreath:state.player.breath<=BREATH_CONFIG.criticalThreshold,
      noOxygen:Boolean(state.player.status?.noOxygen),
      swimming:Boolean(state.player.status?.swimming),
      weapon:furnitureBuildActive?furnitureDefinition.name:blockBuildActive?'build':seedActive?'seeds':weaponName(state.weaponId),
      weaponId:state.weaponId,
      region:`${dimensionDefinition(state.world.dimension).name.toUpperCase()} ${camera.chunkX},${camera.chunkY}`,
      biome:generator.biomeNameAt(state.player.x,state.player.y-2).replaceAll('_',' '),
      time:time.label.replace(' · ',' '),
      timePhase:time.isDay?'day':'night',
      weather:`${weather.label} ${String(weather.windLabel).replace('←','<').replace('→','>')}`, 
      weatherType:weather.type??state.weather.currentType,
      wind:weather.windLabel,
      activeChunks:ACTIVE_CHUNK_COUNT,
      inventoryCount:inventoryTotal(),
      inventory:entries,
      crafting,
      equipped:furnitureBuildActive?furnitureDefinition.name:blockBuildActive?materialName(equipped):seedActive?seed.seedName:'empty',
      zoom:state.magnifier.zoom<=MAGNIFIER_CONFIG.minZoom?'off':`${state.magnifier.zoom.toFixed(1)}x`,
      crystals:state.crystals,
      bunnyChain:state.player.bunnyHop?.chain??0,
      bunnyWindow:state.player.bunnyHop?.landingWindow??0,
      parasiteCount:state.player.attachedParasites?.length??0,
      stolenWeaponId:state.player.stolenWeaponId,
      invasionActive:(state.entities.invasionPortals?.length??0)>0,
      laserHeat:state.laser.heat,
      laserOverheated:state.laser.overheated,
      paused:state.paused,
      activeSlot:state.save.activeSlot,
      saveStatus:state.ui.saveStatus,
      saveSlots:state.ui.saveSlots,
    };
  }

  function showMessage(text,duration=1400){
    state.ui.message=String(text);
    const accessibilityStatus=globalThis.document?.getElementById?.('accessibility-status');
    if(accessibilityStatus)accessibilityStatus.textContent=state.ui.message;
    state.ui.messageUntil=state.frame+Math.max(1,Math.ceil(duration/1000*60));
  }

  function pushPickup(text,amount=1){
    state.ui.pickupFeed.unshift({
      text:`+${Math.max(1,Math.round(amount))} ${String(text)}`,
      until:state.frame+150,
    });
    if(state.ui.pickupFeed.length>4)state.ui.pickupFeed.length=4;
  }

  function updateTransient(){
    if(state.ui.messageUntil<=state.frame)state.ui.message='';
    state.ui.pickupFeed=state.ui.pickupFeed.filter(item=>item.until>state.frame);
    if(state.ui.damageFlash>0)state.ui.damageFlash--;
    if(state.ui.saveStatusUntil<=state.frame)state.ui.saveStatus='';
  }

  update();
  return { update, showMessage, pushPickup, updateTransient };
}

Object.assign(exports,{createHud});

};

__modules["src/systems/weapon-system.js"]=function(exports,__require){
const { WORLD_WIDTH,
  WORLD_HEIGHT,
  GRENADE_CONFIG,
  DRONE_STRIKE_CONFIG,
  BUILD_CONFIG,
  GLAIVE_CONFIG,
  LASER_RIFLE_CONFIG,
  NYAN_CAT_CONFIG,
  REALITY_ZIPPER_CONFIG, } = __require("src/config.js");
const { MaterialId,
  COLLECTABLE_MATERIALS,
  PLACEABLE_MATERIALS,
  CROP_MATERIALS,
  LIQUID_MATERIALS,
  FLAMMABLE_MATERIALS,
  materialName, } = __require("src/data/materials.db.js");
const { WeaponId, WEAPON_DB } = __require("src/data/weapons.db.js");
const { cropById } = __require("src/data/crops.db.js");
const { faunaById } = __require("src/data/fauna.db.js");
const { playerOccupiesPixel } = __require("src/player-geometry.js");
const { nearestPixel, snapPixelPosition } = __require("src/pixel-grid.js");
const DESTRUCULATOR_RANGE=18;


function createWeaponSystem(state,cells,chunks,noise,hud,crops,juice=null,furniture=null){
  const M=MaterialId;
  const W=WeaponId;
  const laserCellHeat=new Map();

  function damageBossesAt(x,y,radius,damage,impulseX=0,impulseY=0){
    let hit=false;
    for(const boss of state.entities.bosses){
      const halfWidth=(boss.width??17)*.5;
      const halfHeight=(boss.height??11)*.5;
      if(Math.abs(boss.x-x)>halfWidth+radius||Math.abs(boss.y-y)>halfHeight+radius)continue;
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,8);
      boss.vx=(boss.vx??0)+impulseX;
      boss.vy=(boss.vy??0)+impulseY;
      hit=true;
    }
    return hit;
  }

  function damageBossesInSwordArc(direction,damage){
    for(const boss of state.entities.bosses){
      const dx=boss.x-state.player.x;
      const dy=boss.y-(state.player.y-2);
      const distance=Math.hypot(dx,dy);
      let difference=Math.atan2(dy,dx)-direction.angle;
      while(difference>Math.PI)difference-=Math.PI*2;
      while(difference<-Math.PI)difference+=Math.PI*2;

      if(distance<15&&Math.abs(difference)<1.1){
        boss.hp-=damage;
        boss.hit=Math.max(boss.hit??0,8);
        boss.vx=(boss.vx??0)+Math.cos(direction.angle)*.55;
        boss.vy=(boss.vy??0)+Math.sin(direction.angle)*.55;
      }
    }
  }

  function aim(){
    const camera=state.world.camera;
    const targetX=camera.chunkX*WORLD_WIDTH+state.input.pointerX;
    const targetY=camera.chunkY*WORLD_HEIGHT+state.input.pointerY;
    const dx=targetX-state.player.x;
    const dy=targetY-(state.player.y-2);
    const distance=Math.hypot(dx,dy)||1;
    return {
      x:dx/distance,
      y:dy/distance,
      angle:Math.atan2(dy,dx),
      distance,
      targetX,
      targetY,
    };
  }

  function exitBuildMode(showMessage=false){
    const hadHand=state.build.active||state.seedMode.active||
      Number.isInteger(state.build.equippedMaterial)||Boolean(state.build.equippedFurnitureId)||Number.isInteger(state.seedMode.cropId);
    if(!hadHand)return;
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.cooldown=0;
    if(showMessage)hud.showMessage('Hand emptied',800);
    hud.update();
  }

  function weaponIsStolen(weaponId){ return Number.isInteger(state.player.stolenWeaponId)&&state.player.stolenWeaponId===weaponId; }

  function cycleWeapon(){
    if(state.build.active||state.seedMode.active)exitBuildMode(false);
    for(let offset=1;offset<=WEAPON_DB.length;offset++){
      const candidate=(state.weaponId+offset)%WEAPON_DB.length;
      if(!weaponIsStolen(candidate)){ state.weaponId=candidate; break; }
    }
    state.entities.hook.active=false;
    state.laser.active=false;
    state.laser.beam=null;
    state.cooldown=0;
    hud.update();
  }

  function equipMaterial(materialId){
    const id=Number(materialId);
    if(!Number.isInteger(id)||!PLACEABLE_MATERIALS.has(id)){
      hud.showMessage('That inventory item is not a placeable block');
      return false;
    }
    if(state.inventory.counts[id]<=0){
      hud.showMessage(`${materialName(id)} is empty`);
      return false;
    }

    state.entities.hook.active=false;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.build.active=true;
    state.build.equippedMaterial=id;
    state.build.equippedFurnitureId=null;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${materialName(id)} equipped · build mode`,900);
    return true;
  }

  function equipFurniture(furnitureId){
    const id=String(furnitureId??'');
    const definition=furniture?.definitions?.find(item=>item.id===id);
    if(!definition){ hud.showMessage('Unknown furnishing'); return false; }
    if(state.inventory.furnitureCount(id)<=0){ hud.showMessage(`${definition.name} is empty`); return false; }
    state.entities.hook.active=false;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.build.active=true;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=id;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${definition.name} equipped · place mode`,900);
    return true;
  }

  function equipSeed(cropId){
    const id=Number(cropId);
    const crop=cropById(id);
    if(!crop){
      hud.showMessage('Unknown seed type');
      return false;
    }
    if(state.inventory.seedCount(id)<=0){
      hud.showMessage(`${crop.seedName} are empty`);
      return false;
    }

    state.entities.hook.active=false;
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=true;
    state.seedMode.cropId=id;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${crop.seedName} equipped · click to scatter`,900);
    return true;
  }

  function cycleStoredMaterial(){
    const placeable=state.inventory.order.filter(id=>
      state.inventory.counts[id]>0&&PLACEABLE_MATERIALS.has(id)
    );
    if(placeable.length===0){
      hud.showMessage('No placeable blocks in inventory');
      return;
    }

    const current=state.build.equippedMaterial;
    const currentIndex=placeable.indexOf(current);
    const next=placeable[(currentIndex+1+placeable.length)%placeable.length];
    equipMaterial(next);
  }

  function traceRay(direction,range,{ignoreTypes=null}={}){
    const distance=Math.min(range,direction.distance);
    const endpoint={
      x:Math.floor(state.player.x+direction.x*distance),
      y:Math.floor(state.player.y-2+direction.y*distance),
    };
    let lastAir=null;
    let previousKey='';

    for(let step=1;step<=Math.ceil(distance*4);step++){
      const beamDistance=step/4;
      const x=Math.floor(state.player.x+direction.x*beamDistance);
      const y=Math.floor(state.player.y-2+direction.y*beamDistance);
      const cellKey=`${x},${y}`;
      if(cellKey===previousKey)continue;
      previousKey=cellKey;

      const type=cells.getCell(x,y);
      if(type===M.AIR||ignoreTypes?.has(type)){
        if(type===M.AIR)lastAir={x,y};
        continue;
      }
      return{hit:{x,y,type},lastAir,endpoint,distance};
    }

    return{hit:null,lastAir,endpoint,distance};
  }

  function playerOccupiesCell(x,y){
    return playerOccupiesPixel(
      x,
      y,
      state.player.x,
      state.player.y,
      state.player.width,
      state.player.height,
    );
  }

  function getDestruculatorPreview(){
    const direction=aim();
    const hoverX=nearestPixel(direction.targetX);
    const hoverY=nearestPixel(direction.targetY);
    const hoverType=cells.getCell(hoverX,hoverY);
    const hoverDistance=Math.hypot(hoverX-state.player.x,hoverY-(state.player.y-2));

    // Liquids never intercept the automatic beam. They can only be selected by
    // placing the cursor directly over the exact liquid pixel.
    const explicitLiquid=hoverDistance<=DESTRUCULATOR_RANGE&&LIQUID_MATERIALS.has(hoverType);
    const trace=explicitLiquid
      ?{hit:{x:hoverX,y:hoverY,type:hoverType},endpoint:{x:hoverX,y:hoverY},distance:hoverDistance}
      :traceRay(direction,DESTRUCULATOR_RANGE,{ignoreTypes:LIQUID_MATERIALS});
    const furnitureHit=furniture?.rayHit?.(direction,DESTRUCULATOR_RANGE)??null;
    const terrainDistance=trace.hit?Math.hypot(trace.hit.x-state.player.x,trace.hit.y-(state.player.y-2)):Infinity;
    if(furnitureHit&&furnitureHit.distance<=terrainDistance){
      return{
        valid:true,x:furnitureHit.x,y:furnitureHit.y,type:M.AIR,
        beamX:furnitureHit.x,beamY:furnitureHit.y,explicitlyHoveredLiquid:false,
        isFurniture:true,furnitureEntity:furnitureHit.entity,reason:'dismantle and collect furniture',range:DESTRUCULATOR_RANGE,
      };
    }
    const target=trace.hit??trace.endpoint;
    const valid=Boolean(trace.hit&&(COLLECTABLE_MATERIALS.has(trace.hit.type)||CROP_MATERIALS.has(trace.hit.type)));
    return{
      valid,
      x:target.x,
      y:target.y,
      type:trace.hit?.type??M.AIR,
      beamX:target.x,
      beamY:target.y,
      explicitlyHoveredLiquid:explicitLiquid,
      reason:trace.hit?(valid?'destroy and collect':'material cannot be collected'):'no block in range',
      range:DESTRUCULATOR_RANGE,
    };
  }

  function getBuildPreview(){
    const direction=aim();
    const trace=traceRay(direction,BUILD_CONFIG.range);
    const candidate=trace.hit?trace.lastAir:trace.endpoint;
    const target=candidate??trace.hit??trace.endpoint;
    const furnitureId=state.build.equippedFurnitureId;
    if(furnitureId){
      const count=state.inventory.furnitureCount(furnitureId);
      const placement=candidate?furniture?.canPlace?.(furnitureId,candidate.x,candidate.y):{valid:false,reason:'no open placement cell'};
      return{
        valid:Boolean(state.build.active&&count>0&&placement?.valid),
        x:target.x,y:target.y,type:M.AIR,beamX:target.x,beamY:target.y,
        reason:count<=0?'equipped furniture is empty':placement?.reason??'invalid placement',
        range:BUILD_CONFIG.range,snappedToSurface:Boolean(trace.hit&&candidate),
        furnitureId,isFurniture:true,definition:placement?.definition,bounds:placement?.bounds,
      };
    }
    const selected=state.build.equippedMaterial;
    const candidateType=candidate?cells.getCell(candidate.x,candidate.y):M.ROCK;
    const hasMaterial=Number.isInteger(selected)&&state.inventory.counts[selected]>0;
    const placeable=Number.isInteger(selected)&&PLACEABLE_MATERIALS.has(selected);
    const clear=Boolean(candidate&&candidateType===M.AIR);
    const outsidePlayer=Boolean(candidate&&!playerOccupiesCell(candidate.x,candidate.y));
    const valid=state.build.active&&hasMaterial&&placeable&&clear&&outsidePlayer;

    let reason='ready to build';
    if(!state.build.active)reason='build mode is off';
    else if(!placeable)reason='equipped item is not placeable';
    else if(!hasMaterial)reason='equipped block is empty';
    else if(!candidate)reason='no open placement cell';
    else if(!clear)reason='placement cell is blocked';
    else if(!outsidePlayer)reason='cannot place inside player';

    return{
      valid,x:target.x,y:target.y,type:selected??M.AIR,beamX:target.x,beamY:target.y,
      reason,range:BUILD_CONFIG.range,snappedToSurface:Boolean(trace.hit&&candidate),
    };
  }

  function useDestruculator(){
    const preview=getDestruculatorPreview();
    Object.assign(state.toolEffect,{
      x:preview.x,
      y:preview.y,
      kind:'destroy',
      valid:preview.valid,
      frames:preview.valid?8:5,
    });

    if(!preview.valid){
      state.cooldown=5;
      return;
    }

    if(preview.isFurniture){
      furniture?.remove?.(preview.furnitureEntity,{refund:true});
      juice?.impact?.(preview.x,preview.y,{kind:'dust',count:12,shake:.6,hitStop:1});
    }else{
      if(!CROP_MATERIALS.has(preview.type))state.inventory.add(preview.type,1);
      juice?.impact?.(preview.x,preview.y,{kind:preview.type===M.CRYSTAL?'crystal':'dust',count:10,shake:.45,hitStop:1});
      cells.setCell(preview.x,preview.y,M.AIR,0,{reason:'destruculator'});
    }
    state.cooldown=4;
    hud.update();
  }

  function useBuildMode(){
    const preview=getBuildPreview();
    Object.assign(state.toolEffect,{
      x:preview.x,
      y:preview.y,
      kind:'build',
      valid:preview.valid,
      frames:preview.valid?7:5,
    });

    if(!preview.valid){
      state.cooldown=4;
      return;
    }

    if(preview.isFurniture){
      const furnitureId=preview.furnitureId;
      furniture?.place?.(furnitureId,preview.x,preview.y);
      state.inventory.removeFurniture(furnitureId,1);
      state.cooldown=8;
      if(state.inventory.furnitureCount(furnitureId)===0){
        state.build.active=false;
        state.build.equippedFurnitureId=null;
        hud.showMessage('Furniture stack depleted · build mode closed',1000);
      }
      hud.update();
      return;
    }
    const selected=state.build.equippedMaterial;
    cells.setCell(preview.x,preview.y,selected);
    juice?.burst?.(preview.x,preview.y,{colors:['rgb(220,244,255)','rgb(116,183,216)'],count:6,speedMin:.15,speedMax:.7,gravity:.04,lifeMin:7,lifeMax:16});
    state.inventory.remove(selected,1);
    state.cooldown=4;

    if(state.inventory.counts[selected]===0){
      state.build.active=false;
      state.build.equippedMaterial=null;
      hud.showMessage(`${materialName(selected)} depleted · build mode closed`,1000);
    }
    hud.update();
  }

  function findDroneGroundTarget(direction){
    const camera=state.world.camera;
    const originX=camera.chunkX*WORLD_WIDTH;
    const originY=camera.chunkY*WORLD_HEIGHT;
    const x=Math.max(originX+2,Math.min(originX+WORLD_WIDTH-3,Math.floor(direction.targetX)));
    const pointerY=Math.max(originY+1,Math.min(originY+WORLD_HEIGHT-2,Math.floor(direction.targetY)));
    const firstVisibleY=originY+1;
    const lastVisibleY=originY+WORLD_HEIGHT-2;

    // A drone rocket arrives from above, so a target beneath any solid cell is
    // unreachable. Resolve the selected column to its highest visible solid
    // pixel regardless of the cursor's vertical position.
    for(let y=firstVisibleY;y<=lastVisibleY;y++){
      if(!cells.isSolid(cells.getCell(x,y)))continue;
      return{
        x,
        y,
        snapped:y!==pointerY,
        pointerX:x,
        pointerY,
      };
    }
    return null;
  }

  function droneCorridorIsAir(fromX,toX,y){
    const step=fromX<=toX?1:-1;
    const halfHeight=DRONE_STRIKE_CONFIG.corridorHalfHeight;
    for(let x=fromX;step>0?x<=toX:x>=toX;x+=step){
      for(let offsetY=-halfHeight;offsetY<=halfHeight;offsetY++){
        if(cells.getCell(x,y+offsetY)!==M.AIR)return false;
      }
    }
    return true;
  }

  function getDroneStrikePreview(){
    const direction=aim();
    const camera=state.world.camera;
    const originX=camera.chunkX*WORLD_WIDTH;
    const originY=camera.chunkY*WORLD_HEIGHT;
    const fallbackX=Math.max(originX+2,Math.min(originX+WORLD_WIDTH-3,Math.floor(direction.targetX)));
    const fallbackY=Math.max(originY+1,Math.min(originY+WORLD_HEIGHT-2,Math.floor(direction.targetY)));
    const target=findDroneGroundTarget(direction);

    if(!target){
      return{
        valid:false,
        x:fallbackX,
        y:fallbackY,
        entryX:null,
        entryY:null,
        exitX:null,
        flightDirection:0,
        pointerX:fallbackX,
        pointerY:fallbackY,
        snapped:false,
        reason:'no solid pixel exists in the selected visible column',
      };
    }

    const topStart=originY+DRONE_STRIKE_CONFIG.entryTopMargin;
    const topEnd=originY+Math.floor(WORLD_HEIGHT*DRONE_STRIKE_CONFIG.topHalfRatio)-DRONE_STRIKE_CONFIG.entryTopMargin;
    const rowCount=Math.max(0,topEnd-topStart+1);
    if(rowCount===0){
      return{
        valid:false,
        x:target.x,
        y:target.y,
        entryX:null,
        entryY:null,
        exitX:null,
        flightDirection:0,
        pointerX:target.pointerX,
        pointerY:target.pointerY,
        snapped:target.snapped,
        reason:'the visible upper half is too obstructed for a drone',
      };
    }

    const leftEntry=originX-DRONE_STRIKE_CONFIG.entryOutsideOffset;
    const rightEntry=originX+WORLD_WIDTH-1+DRONE_STRIKE_CONFIG.entryOutsideOffset;
    const sideRoll=noise.randomAt(target.x,target.y,2241);
    const sides=sideRoll<.5
      ?[
        {entryX:leftEntry,exitX:rightEntry,direction:1,side:'left'},
        {entryX:rightEntry,exitX:leftEntry,direction:-1,side:'right'},
      ]
      :[
        {entryX:rightEntry,exitX:leftEntry,direction:-1,side:'right'},
        {entryX:leftEntry,exitX:rightEntry,direction:1,side:'left'},
      ];
    const rowOffset=Math.floor(noise.randomAt(target.x,target.y,2242)*rowCount);

    for(let index=0;index<rowCount;index++){
      const y=topStart+(rowOffset+index)%rowCount;
      for(const side of sides){
        if(!droneCorridorIsAir(side.entryX,target.x,y))continue;
        return{
          valid:true,
          x:target.x,
          y:target.y,
          entryX:side.entryX,
          entryY:y,
          exitX:side.exitX,
          flightDirection:side.direction,
          side:side.side,
          pointerX:target.pointerX,
          pointerY:target.pointerY,
          snapped:target.snapped,
          reason:`clear ${side.side}-side air approach`,
        };
      }
    }

    return{
      valid:false,
      x:target.x,
      y:target.y,
      entryX:null,
      entryY:null,
      exitX:null,
      flightDirection:0,
      pointerX:target.pointerX,
      pointerY:target.pointerY,
      snapped:target.snapped,
      reason:'no all-air flight corridor exists in the visible upper half',
    };
  }

  function summonDroneStrike(){
    const preview=getDroneStrikePreview();
    if(!preview.valid){
      state.cooldown=12;
      hud.showMessage(`Drone strike unavailable · ${preview.reason}`,1300);
      return false;
    }

    state.entities.drones.push({
      x:nearestPixel(preview.entryX),
      y:nearestPixel(preview.entryY),
      targetX:nearestPixel(preview.x),
      targetY:nearestPixel(preview.y),
      exitX:nearestPixel(preview.exitX),
      direction:preview.flightDirection,
      phase:'approach',
      bob:noise.randomAt(preview.x,preview.y,2243)*Math.PI*2,
      launched:false,
    });
    state.cooldown=DRONE_STRIKE_CONFIG.cooldown;
    juice?.screenFlash?.('rgba(120,220,255,.16)',4);
    juice?.play?.('shot',.5);
    hud.showMessage('Drone inbound · large rocket authorized',1100);
    return true;
  }

  function sprayNapalm(direction){
    const angle=direction.angle+(noise.randomAt(state.frame,state.player.x|0,510)-.5)*.16;
    const speed=1.65+noise.randomAt(state.frame,state.player.y|0,511)*.65;
    state.entities.napalmShots.push({
      x:nearestPixel(state.player.x+Math.cos(angle)*2.2),
      y:nearestPixel(state.player.y-2+Math.sin(angle)*2.2),
      vx:Math.cos(angle)*speed+state.player.vx*.2,
      vy:Math.sin(angle)*speed+state.player.vy*.12,
      life:45,
    });
    state.cooldown=2;
  }

  function laserTerrainTrace(direction){
    return traceRay(direction,LASER_RIFLE_CONFIG.range,{ignoreTypes:new Set([M.SMOKE,M.STEAM,M.FIRE])});
  }

  function closestLaserEntity(direction,maxDistance){
    const startX=state.player.x;
    const startY=state.player.y-2;
    let closest=null;
    let closestDistance=maxDistance+1;

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(enemy.hp<=0)continue;
        const dx=enemy.x-startX;
        const dy=enemy.y-startY;
        const projected=dx*direction.x+dy*direction.y;
        if(projected<=0||projected>=closestDistance||projected>maxDistance)continue;
        const perpendicular=Math.abs(dx*direction.y-dy*direction.x);
        const radius=(faunaById(enemy.speciesId)?.hitRadius??2)+.65;
        if(perpendicular>radius)continue;
        closest={kind:'enemy',entity:enemy,distance:projected};
        closestDistance=projected;
      }
    }

    for(const boss of state.entities.bosses){
      if(boss.hp<=0)continue;
      const dx=boss.x-startX;
      const dy=boss.y-startY;
      const projected=dx*direction.x+dy*direction.y;
      if(projected<=0||projected>=closestDistance||projected>maxDistance)continue;
      const perpendicular=Math.abs(dx*direction.y-dy*direction.x);
      const radius=Math.max(3,Math.min((boss.width??12)*.42,(boss.height??10)*.55));
      if(perpendicular>radius)continue;
      closest={kind:'boss',entity:boss,distance:projected};
      closestDistance=projected;
    }
    return closest;
  }

  function laserHeatKey(x,y){ return `${x},${y}`; }

  function reactHeatedPixel(x,y,type,heat){
    if(type===M.WATER&&heat>=LASER_RIFLE_CONFIG.waterSteamHeat){
      cells.setCell(x,y,M.STEAM,90,{reason:'laser-heating'});
      return true;
    }
    if(type===M.SNOW&&heat>=LASER_RIFLE_CONFIG.snowMeltHeat){
      cells.setCell(x,y,M.WATER,0,{reason:'laser-heating'});
      return true;
    }
    if(type===M.NAPALM&&heat>=LASER_RIFLE_CONFIG.ignitionHeat*.45){
      cells.setCell(x,y,M.FIRE,105,{reason:'laser-heating'});
      return true;
    }
    if(FLAMMABLE_MATERIALS.has(type)&&heat>=LASER_RIFLE_CONFIG.ignitionHeat){
      cells.setCell(x,y,M.FIRE,105,{reason:'laser-heating'});
      return true;
    }
    if(type===M.SAND&&heat>=LASER_RIFLE_CONFIG.sandMeltHeat){
      cells.setCell(x,y,M.LAVA,0,{reason:'laser-heating'});
      return true;
    }
    if([M.ROCK,M.DIRT,M.CRYSTAL].includes(type)&&heat>=LASER_RIFLE_CONFIG.stoneMeltHeat){
      cells.setCell(x,y,M.LAVA,0,{reason:'laser-heating'});
      return true;
    }
    return false;
  }

  function addPixelHeat(x,y,amount){
    const type=cells.getCell(x,y);
    if(type===M.AIR||type===M.SMOKE||type===M.STEAM||type===M.FIRE||type===M.LAVA)return 0;
    const key=laserHeatKey(x,y);
    const heat=Math.min(140,(laserCellHeat.get(key)??0)+amount);
    laserCellHeat.set(key,heat);
    reactHeatedPixel(x,y,type,heat);
    return heat;
  }

  function heatImpactPixels(x,y){
    const main=addPixelHeat(x,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame);
    if(state.frame%3===0){
      addPixelHeat(x-1,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x+1,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x,y-1,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x,y+1,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
    }
    state.laser.contactHeat=main;
  }

  function spawnLaserSparks(x,y,direction){
    for(let index=0;index<LASER_RIFLE_CONFIG.sparkCountPerFrame;index++){
      const spread=(noise.randomAt(state.frame,index,x+y*13+8801)-.5)*2.4;
      const speed=.45+noise.randomAt(index,state.frame,8802)*1.05;
      const angle=Math.atan2(-direction.y,-direction.x)+spread;
      state.entities.laserSparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-.18,
        life:8+Math.floor(noise.randomAt(x+index,y,state.frame+8803)*11),
      });
    }
    if(state.entities.laserSparks.length>LASER_RIFLE_CONFIG.maxSparks){
      state.entities.laserSparks.splice(0,state.entities.laserSparks.length-LASER_RIFLE_CONFIG.maxSparks);
    }
  }

  function updateLaserSparks(){
    for(let index=state.entities.laserSparks.length-1;index>=0;index--){
      const spark=state.entities.laserSparks[index];
      spark.x+=spark.vx;
      spark.y+=spark.vy;
      spark.vx*=.94;
      spark.vy+=.075;
      spark.life--;
      if(spark.life<=0)state.entities.laserSparks.splice(index,1);
    }
  }

  function decayLaserPixelHeat(){
    for(const [key,value] of laserCellHeat){
      const next=value-LASER_RIFLE_CONFIG.pixelHeatDecay;
      if(next<=0)laserCellHeat.delete(key);
      else laserCellHeat.set(key,next);
    }
    if(laserCellHeat.size>96){
      const entries=[...laserCellHeat.entries()].sort((a,b)=>a[1]-b[1]);
      for(let index=0;index<entries.length-96;index++)laserCellHeat.delete(entries[index][0]);
    }
  }

  function syncLaserHotPixels(){
    state.laser.hotPixels=[];
    for(const [key,heat] of laserCellHeat){
      const comma=key.indexOf(',');
      state.laser.hotPixels.push({
        x:Number(key.slice(0,comma)),
        y:Number(key.slice(comma+1)),
        heat,
      });
    }
  }

  function fireLaserFrame(){
    const direction=aim();
    const terrain=laserTerrainTrace(direction);
    const startX=state.player.x;
    const startY=state.player.y-2;
    const terrainTarget=terrain.hit??terrain.endpoint;
    const terrainDistance=Math.hypot(terrainTarget.x-startX,terrainTarget.y-startY);
    const entityHit=closestLaserEntity(direction,terrainDistance);
    let impactX=terrainTarget.x;
    let impactY=terrainTarget.y;
    let contactKind=terrain.hit?'terrain':'air';

    if(entityHit){
      impactX=nearestPixel(startX+direction.x*entityHit.distance);
      impactY=nearestPixel(startY+direction.y*entityHit.distance);
      contactKind=entityHit.kind;
      if(entityHit.kind==='enemy'){
        entityHit.entity.hp-=LASER_RIFLE_CONFIG.enemyDamagePerFrame;
        entityHit.entity.hit=Math.max(entityHit.entity.hit??0,3);
      }else{
        entityHit.entity.hp-=LASER_RIFLE_CONFIG.bossDamagePerFrame;
        entityHit.entity.hit=Math.max(entityHit.entity.hit??0,3);
      }
    }else if(terrain.hit){
      heatImpactPixels(impactX,impactY);
    }else{
      state.laser.contactHeat=0;
    }

    state.laser.active=true;
    state.laser.beam={
      startX:nearestPixel(startX),startY:nearestPixel(startY),
      endX:nearestPixel(impactX),endY:nearestPixel(impactY),
      impactX:nearestPixel(impactX),impactY:nearestPixel(impactY),
      contactKind,
    };
    spawnLaserSparks(impactX,impactY,direction);
    if(state.frame%7===0)juice?.impact?.(impactX,impactY,{kind:'laser',count:5,shake:.18,hitStop:0});
    state.laser.heat=Math.min(100,state.laser.heat+LASER_RIFLE_CONFIG.weaponHeatPerFrame);
    if(state.laser.heat>=100){
      state.laser.heat=100;
      state.laser.overheated=true;
      state.laser.active=false;
      state.laser.beam=null;
      juice?.screenFlash?.('rgba(255,78,42,.24)',6);
      juice?.shake?.(2.5,18);
      hud.showMessage('Laser rifle overheated',900);
    }
  }

  function updateContinuous(){
    updateLaserSparks();
    decayLaserPixelHeat();
    const firing=state.weaponId===W.LASER_RIFLE&&state.input.pointerDown&&!state.build.active&&!state.seedMode.active&&state.player.hp>0;
    if(firing&&!state.laser.overheated){
      fireLaserFrame();
      syncLaserHotPixels();
      return;
    }

    state.laser.active=false;
    state.laser.beam=null;
    state.laser.contactHeat=0;
    state.laser.heat=Math.max(0,state.laser.heat-LASER_RIFLE_CONFIG.weaponCoolPerFrame);
    syncLaserHotPixels();
    if(state.laser.overheated&&state.laser.heat<=LASER_RIFLE_CONFIG.overheatRelease){
      state.laser.overheated=false;
      hud.showMessage('Laser rifle cooled',700);
    }
  }


  function fireRealityZipper(direction){
    if(state.entities.realityRifts.length>=REALITY_ZIPPER_CONFIG.maxRifts){
      hud.showMessage('Reality is already unzipped',700);
      state.cooldown=12;
      return false;
    }
    const distance=Math.max(14,Math.min(REALITY_ZIPPER_CONFIG.range,direction.distance));
    const startDistance=Math.min(7,Math.max(4,distance*.14));
    const startX=nearestPixel(state.player.x+direction.x*startDistance);
    const startY=nearestPixel(state.player.y-2+direction.y*startDistance);
    const endX=nearestPixel(state.player.x+direction.x*distance);
    const endY=nearestPixel(state.player.y-2+direction.y*distance);
    const horizontal=Math.abs(endX-startX)>=Math.abs(endY-startY);
    const normalX=horizontal?0:1;
    const normalY=horizontal?1:0;
    state.entities.realityRifts.push({
      id:`rift-${state.frame}-${startX}-${startY}`,
      startX,startY,endX,endY,
      normalX,normalY,
      age:0,
      life:REALITY_ZIPPER_CONFIG.lifeFrames,
      phase:'opening',
      applied:false,
      restored:false,
      snapshot:[],
      points:[],
      splitCount:0,
      pulse:0,
    });
    juice?.screenFlash?.('rgba(255,40,220,.22)',7);
    juice?.shockwave?.(startX,startY,'rgb(255,75,230)',14,20);
    juice?.shockwave?.(endX,endY,'rgb(70,245,255)',14,20);
    juice?.shake?.(4.5,28);
    juice?.hitStop?.(4);
    state.realityZipper.active=true;
    state.realityZipper.phase='opening';
    state.cooldown=REALITY_ZIPPER_CONFIG.cooldown;
    hud.showMessage('REALITY UNZIPPED',900);
    return true;
  }

  function attack(){
    if(state.player.hp<=0)return;
    if(weaponIsStolen(state.weaponId)){
      hud.showMessage('That weapon was stolen — hunt down the thief',800);
      cycleWeapon();
      return;
    }
    const direction=aim();

    if(state.seedMode.active&&Number.isInteger(state.seedMode.cropId)){
      if(state.cooldown>0)return;
      if(crops.throwSeeds(state.seedMode.cropId,direction))state.cooldown=14;
      return;
    }

    if(state.build.active){
      if(state.cooldown>0)return;
      useBuildMode();
      return;
    }

    if(state.weaponId===W.LASER_RIFLE){
      if(!state.laser.overheated){
        juice?.weaponFire?.('laser',state.player.x,state.player.y-2,direction);
        fireLaserFrame();
      }
      return;
    }

    if(state.cooldown>0)return;

    if(state.weaponId===W.REALITY_ZIPPER){
      fireRealityZipper(direction);
      return;
    }

    if(state.weaponId===W.NYAN_CAT_LAUNCHER){
      if(state.entities.nyanCats.length){
        hud.showMessage('Nyan Cat is still airborne',650);
        state.cooldown=12;
        return;
      }
      state.entities.nyanCats.push({
        x:nearestPixel(state.player.x+direction.x*5),
        y:nearestPixel(state.player.y-2+direction.y*3),
        vx:direction.x*NYAN_CAT_CONFIG.speed+state.player.vx*.18,
        vy:direction.y*NYAN_CAT_CONFIG.speed+state.player.vy*.1,
        life:NYAN_CAT_CONFIG.lifeFrames,
        pierce:NYAN_CAT_CONFIG.pierce,
        bounces:0,
        phase:noise.randomAt(state.frame,state.player.x|0,9901)*Math.PI*2,
        trail:[],
        hits:new Set(),
      });
      state.player.vx-=direction.x*.55;
      state.player.vy-=direction.y*.18;
      juice?.weaponFire?.('nyan',state.player.x+direction.x*3,state.player.y-2+direction.y*2,direction);
      state.cooldown=NYAN_CAT_CONFIG.cooldown;
      hud.showMessage('NYAN CAT LAUNCHED',700);
      return;
    }

    if(state.weaponId===W.GUN){
      state.entities.bullets.push({
        x:nearestPixel(state.player.x+direction.x*2),
        y:nearestPixel(state.player.y-2+direction.y*2),
        vx:direction.x*3.6,
        vy:direction.y*3.6,
        life:72,
        pierce:2,
      });
      state.player.vx-=direction.x*.08;
      juice?.weaponFire?.('gun',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      state.cooldown=9;
      return;
    }

    if(state.weaponId===W.NAPALM_SPRAYER){
      juice?.weaponFire?.('fire',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      sprayNapalm(direction);
      return;
    }

    if(state.weaponId===W.GLAIVE){
      if(state.entities.glaives.length)return;
      state.entities.glaives.push({
        x:state.player.x,
        y:state.player.y-2,
        vx:direction.x*GLAIVE_CONFIG.launchSpeed,
        vy:direction.y*GLAIVE_CONFIG.launchSpeed,
        age:0,
        returning:false,
        spin:direction.angle,
        spinSpeed:GLAIVE_CONFIG.spinSpeed,
        bounces:0,
        hits:new Map(),
      });
      juice?.weaponFire?.('blade',state.player.x,state.player.y-2,direction);
      state.cooldown=24;
      return;
    }

    if(state.weaponId===W.HOOK){
      const hook=state.entities.hook;
      if(hook.active)return;
      Object.assign(hook,{
        active:true,
        stuck:false,
        x:state.player.x,
        y:state.player.y-2,
        vx:direction.x*3.1,
        vy:direction.y*3.1,
      });
      juice?.weaponFire?.('hook',state.player.x,state.player.y-2,direction);
      state.cooldown=8;
      return;
    }

    if(state.weaponId===W.SWORD){
      state.swordTimer=12;
      state.swordAngle=direction.angle;
      state.cooldown=16;
      juice?.weaponFire?.('sword',state.player.x,state.player.y-2,direction);

      for(const chunk of state.world.activeChunks){
        for(const enemy of chunk.enemies){
          const dx=enemy.x-state.player.x;
          const dy=enemy.y-(state.player.y-2);
          const distance=Math.hypot(dx,dy);
          let difference=Math.atan2(dy,dx)-direction.angle;
          while(difference>Math.PI)difference-=Math.PI*2;
          while(difference<-Math.PI)difference+=Math.PI*2;

          const hitRadius=faunaById(enemy.speciesId)?.hitRadius??2;
          if(distance<8+hitRadius&&Math.abs(difference)<1.05){
            enemy.hp-=35;
            enemy.hit=8;
            enemy.vx+=Math.cos(direction.angle)*.5;
            enemy.vy+=Math.sin(direction.angle)*.5;
          }
        }
      }
      damageBossesInSwordArc(direction,35);
      return;
    }

    if(state.weaponId===W.GRENADE){
      const speed=GRENADE_CONFIG.launchSpeed;
      state.entities.grenades.push({
        x:nearestPixel(state.player.x+direction.x*2),
        y:nearestPixel(state.player.y-2+direction.y*2),
        vx:direction.x*speed+state.player.vx*.35,
        vy:direction.y*speed+state.player.vy*.18,
        fuse:GRENADE_CONFIG.fuseFrames,
        rotation:0,
      });
      state.player.vx-=direction.x*.22;
      juice?.weaponFire?.('grenade',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      state.cooldown=GRENADE_CONFIG.cooldown;
      return;
    }

    if(state.weaponId===W.DRONE_STRIKE){
      summonDroneStrike();
      return;
    }

    useDestruculator();
  }

  function updateHook(){
    const hook=state.entities.hook;
    if(!hook.active)return;

    if(!hook.stuck){
      for(let i=0;i<3;i++){
        hook.x+=hook.vx/3;
        hook.y+=hook.vy/3;

        if(Math.hypot(hook.x-state.player.x,hook.y-state.player.y)>58){
          hook.active=false;
          return;
        }

        if(cells.isSolid(cells.getCell(Math.floor(hook.x),Math.floor(hook.y)))){
          hook.stuck=true;
          break;
        }
      }
      snapPixelPosition(hook);
      return;
    }

    if(state.input.pointerDown&&state.weaponId===W.HOOK&&!state.build.active){
      const dx=hook.x-state.player.x;
      const dy=hook.y-(state.player.y-2);
      const distance=Math.hypot(dx,dy)||1;
      state.player.vx+=dx/distance*.14;
      state.player.vy+=dy/distance*.14;
    }else{
      hook.active=false;
    }
    snapPixelPosition(hook);
  }

  return {
    aim,
    attack,
    updateHook,
    updateContinuous,
    cycleWeapon,
    cycleStoredMaterial,
    equipMaterial,
    equipFurniture,
    equipSeed,
    exitBuildMode,
    getDestruculatorPreview,
    getBuildPreview,
    getDroneStrikePreview,
    summonDroneStrike,
  };
}

Object.assign(exports,{createWeaponSystem});

};

__modules["src/systems/player-system.js"]=function(exports,__require){
const { PLAYER_CONFIG, STEAM_CONFIG, HUNGER_CONFIG, BUNNYHOP_CONFIG, SWIM_CONFIG, BREATH_CONFIG } = __require("src/config.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { playerPixelBounds } = __require("src/player-geometry.js");
const { dimensionHasOxygen } = __require("src/data/dimensions.db.js");
function createPlayerSystem(state,cells,chunks,generator,weapons,hud,juice=null,furniture=null){
  const M=MaterialId;
  const C=PLAYER_CONFIG;
  const B=BUNNYHOP_CONFIG;
  const S=SWIM_CONFIG;
  const R=BREATH_CONFIG;
  const motionRemainder={x:0,y:0};

  function bunnyHopState(){
    const player=state.player;
    if(!player.bunnyHop){
      player.bunnyHop={chain:0,landingWindow:0,groundFrames:0,lastLandingFrame:-9999,lastJumpFrame:-9999};
    }
    return player.bunnyHop;
  }

  function resetBunnyHop(){
    const bunny=bunnyHopState();
    bunny.chain=0;
    bunny.landingWindow=0;
    bunny.groundFrames=0;
  }

  function bunnyJumpMultiplier(chain=bunnyHopState().chain){
    return Math.min(B.maxJumpMultiplier,1+Math.max(0,chain-1)*B.jumpSpeedBonusPerHop);
  }

  function bunnySpeedMultiplier(chain=bunnyHopState().chain){
    return Math.min(B.maxSpeedMultiplier,1+Math.max(0,chain-1)*B.speedLimitBonusPerHop);
  }

  function performJump(){
    const player=state.player;
    const bunny=bunnyHopState();
    const withinLandingWindow=
      bunny.chain>0&&
      state.frame-bunny.lastLandingFrame<=B.landingWindowFrames;
    bunny.chain=withinLandingWindow
      ?Math.min(B.maxChain,bunny.chain+1)
      :1;
    bunny.landingWindow=0;
    bunny.groundFrames=0;
    bunny.lastJumpFrame=state.frame;

    const direction=state.input.keys.has('a')||state.input.keys.has('arrowleft')
      ?-1
      :state.input.keys.has('d')||state.input.keys.has('arrowright')
        ?1
        :Math.sign(player.vx);
    if(bunny.chain>1&&direction!==0){
      const growth=1+Math.min(4,bunny.chain-2)*B.momentumBoostGrowth;
      player.vx+=direction*B.momentumBoost*growth;
    }
    const parasiteMultiplier=Math.max(.4,Math.min(1,Number(player.parasiteSlowMultiplier)||1));
    const speedLimit=C.maxSpeed*bunnySpeedMultiplier(bunny.chain)*parasiteMultiplier;
    player.vx=Math.max(-speedLimit,Math.min(speedLimit,player.vx));
    player.vy=-C.jumpSpeed*bunnyJumpMultiplier(bunny.chain);
    player.grounded=false;
    juice?.jump?.(player.x,player.y);
    if(bunny.chain>1)juice?.bunnyHop?.(player.x,player.y,bunny.chain);
    player.hunger=Math.max(0,player.hunger-HUNGER_CONFIG.jumpCost);
    motionRemainder.y=0;
    state.coyoteFrames=0;
    state.jumpBuffer=0;
  }

  function scanWaterColumn(px,seedY){
    let top=seedY;
    let upwardSteps=0;
    while(upwardSteps<S.columnScanDepth&&cells.getCell(px,top-1)===M.WATER){
      top--;
      upwardSteps++;
    }

    let cursor=top;
    let liquidDepth=0;
    while(liquidDepth<S.columnScanDepth&&cells.getCell(px,cursor)===M.WATER){
      liquidDepth++;
      cursor++;
    }

    const nextMaterial=cells.getCell(px,cursor);
    return {
      top,
      bottom:cursor-1,
      liquidDepth,
      floorY:cells.isSolid(nextMaterial)?cursor:null,
      scanLimited:liquidDepth>=S.columnScanDepth,
    };
  }

  function waterExposureAt(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    let waterCells=0;
    let headWaterCells=0;
    let liquidColumns=0;
    let nearbyLiquidColumns=0;
    let deepColumns=0;
    let nearbyDeepColumns=0;
    let standableColumns=0;
    const columns=[];
    const surfaceTops=[];

    for(let px=bounds.left;px<=bounds.right;px++){
      let seedY=null;
      let overlapsBody=false;
      for(let py=bounds.top;py<=bounds.bottom;py++){
        if(cells.getCell(px,py)!==M.WATER)continue;
        waterCells++;
        overlapsBody=true;
        if(seedY===null)seedY=py;
        if(py===bounds.top)headWaterCells++;
      }

      // A swimmer can briefly rise until the body no longer overlaps water.
      // Search just beneath the feet as well, so deep water remains valid
      // swimming support instead of toggling the player into walking mid-bob.
      if(seedY===null){
        for(let py=bounds.groundRow;py<=bounds.groundRow+S.surfaceLatchDepth;py++){
          if(cells.getCell(px,py)!==M.WATER)continue;
          seedY=py;
          break;
        }
      }
      if(seedY===null)continue;

      nearbyLiquidColumns++;
      if(overlapsBody)liquidColumns++;
      const column=scanWaterColumn(px,seedY);
      surfaceTops.push(column.top);
      const candidateBaseline=column.floorY;
      const waterIsShallow=column.floorY!==null&&column.liquidDepth<=S.maxWadeDepth;
      const hasStandingRoom=waterIsShallow&&!collides(x,candidateBaseline)&&groundProbeAt(x,candidateBaseline);
      if(hasStandingRoom)standableColumns++;
      else{
        nearbyDeepColumns++;
        if(overlapsBody)deepColumns++;
      }
      columns.push({...column,x:px,standable:hasStandingRoom,overlapsBody});
    }

    const requiredDeepColumns=Math.max(1,Math.ceil(player.width*S.minimumDeepColumnRatio));
    const canStand=standableColumns>0;
    surfaceTops.sort((a,b)=>a-b);
    const medianSurface=surfaceTops.length?surfaceTops[Math.floor(surfaceTops.length*.5)]:null;
    const surfaceBaselineY=medianSurface===null?null:medianSurface+S.surfaceBodyDepth;
    return {
      waterCells,
      liquidColumns,
      nearbyLiquidColumns,
      deepColumns,
      nearbyDeepColumns,
      standableColumns,
      canStand,
      columns,
      surfaceBaselineY,
      swimming:
        waterCells>=S.waterCellThreshold&&
        liquidColumns>=requiredDeepColumns&&
        deepColumns>=requiredDeepColumns&&
        !canStand,
      surfaceSwimming:
        nearbyLiquidColumns>=requiredDeepColumns&&
        nearbyDeepColumns>=requiredDeepColumns&&
        !canStand,
      headSubmerged:headWaterCells>=Math.ceil(player.width*.5),
      bounds,
    };
  }

  function blockedAt(x,y){ return cells.isSolid(cells.getCell(x,y))||Boolean(furniture?.solidAt?.(x,y)); }

  function collides(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    for(let py=bounds.top;py<=bounds.bottom;py++){
      for(let px=bounds.left;px<=bounds.right;px++){
        if(blockedAt(px,py))return true;
      }
    }
    return false;
  }

  function groundProbeAt(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    for(let px=bounds.left;px<=bounds.right;px++){
      if(blockedAt(px,bounds.groundRow))return true;
    }
    return false;
  }

  function groundProbe(){
    return groundProbeAt(state.player.x,state.player.y);
  }

  function resetMotionRemainder(){
    motionRemainder.x=0;
    motionRemainder.y=0;
  }

  function wholePixelMotion(axis,velocity){
    const total=motionRemainder[axis]+velocity;
    const pixels=Math.trunc(total);
    motionRemainder[axis]=total-pixels;
    return pixels;
  }

  function tryAutoStep(nextX){
    const player=state.player;
    if(!player.grounded||C.autoStepHeight<=0||player.vx===0)return false;

    const targetX=Math.round(nextX);
    const direction=Math.sign(targetX-player.x);
    if(direction===0)return false;

    const nextBounds=playerPixelBounds(targetX,player.y,player.width,player.height);
    const leadingX=direction>0?nextBounds.right:nextBounds.left;
    const footRow=nextBounds.bottom;

    // Only climb a true one-cell ledge. Walls with another solid cell above it
    // continue to behave as walls.
    if(!blockedAt(leadingX,footRow))return false;
    if(blockedAt(leadingX,footRow-C.autoStepHeight))return false;

    const steppedY=player.y-C.autoStepHeight;
    if(collides(targetX,steppedY))return false;

    player.x=targetX;
    player.y=steppedY;
    player.vy=0;
    motionRemainder.y=0;
    return true;
  }

  function moveHorizontal(pixelCount){
    const player=state.player;
    const direction=Math.sign(pixelCount);
    let steppedUp=false;
    let landed=false;

    for(let step=0;step<Math.abs(pixelCount);step++){
      const nextX=player.x+direction;
      if(!collides(nextX,player.y)){
        player.x=nextX;
        continue;
      }
      if(!steppedUp&&tryAutoStep(nextX)){
        steppedUp=true;
        landed=true;
        continue;
      }
      player.vx=0;
      motionRemainder.x=0;
      resetBunnyHop();
      break;
    }

    return landed;
  }

  function moveVertical(pixelCount){
    const player=state.player;
    const direction=Math.sign(pixelCount);
    let landed=false;

    for(let step=0;step<Math.abs(pixelCount);step++){
      const nextY=player.y+direction;
      if(!collides(player.x,nextY)){
        player.y=nextY;
        continue;
      }
      if(direction>0)landed=true;
      player.vy=0;
      motionRemainder.y=0;
      break;
    }

    return landed;
  }

  function candidateOffsets(radius){
    const offsets=[];
    for(let dy=-radius;dy<=radius;dy++){
      for(let dx=-radius;dx<=radius;dx++){
        const distance=Math.abs(dx)+Math.abs(dy);
        if(distance===0||distance>radius)continue;
        offsets.push({dx,dy,distance});
      }
    }
    offsets.sort((a,b)=>{
      if(a.distance!==b.distance)return a.distance-b.distance;
      const aPriority=a.dy<0?0:a.dy===0?1:2;
      const bPriority=b.dy<0?0:b.dy===0?1:2;
      if(aPriority!==bPriority)return aPriority-bPriority;
      if(Math.abs(a.dx)!==Math.abs(b.dx))return Math.abs(a.dx)-Math.abs(b.dx);
      return a.dx-b.dx;
    });
    return offsets;
  }

  function resolveOverlap(maxRadius=12){
    const player=state.player;
    player.x=Math.round(player.x);
    player.y=Math.round(player.y);
    if(!collides(player.x,player.y))return false;

    for(const offset of candidateOffsets(maxRadius)){
      const candidateX=player.x+offset.dx;
      const candidateY=player.y+offset.dy;
      if(collides(candidateX,candidateY))continue;
      player.x=candidateX;
      player.y=candidateY;
      player.vx=0;
      player.vy=0;
      resetMotionRemainder();
      resetBunnyHop();
      player.grounded=groundProbeAt(candidateX,candidateY);
      return true;
    }

    // Last-resort depenetration: remove only the solid cells currently occupying
    // the visible 3x5 sprite. This prevents an unrecoverable trap if a future
    // simulation feature creates an enclosed solid mass around the player.
    const bounds=playerPixelBounds(player.x,player.y,player.width,player.height);
    for(let y=bounds.top;y<=bounds.bottom;y++){
      for(let x=bounds.left;x<=bounds.right;x++){
        if(cells.isSolid(cells.getCell(x,y))){
          cells.setCell(x,y,M.AIR,0,{reason:'player-depenetration'});
        }
      }
    }
    player.vx=0;
    player.vy=0;
    resetMotionRemainder();
    resetBunnyHop();
    player.grounded=groundProbe();
    return true;
  }

  function damage(amount,sourceX=null){
    if(state.player.invulnerability>0)return;
    state.player.hp-=amount;
    juice?.impact?.(state.player.x,state.player.y-2,{kind:'enemy',damage:amount,heavy:amount>=12,shake:amount>=12?3.2:1.4,hitStop:amount>=12?3:1,count:amount>=12?16:9});
    juice?.screenFlash?.('rgba(255,42,62,.24)',5);
    state.player.invulnerability=24;
    state.ui.damageFlash=12;
    if(Number.isFinite(sourceX))state.ui.damageDirection=Math.sign(sourceX-state.player.x);
  }

  function collectCrystals(){
    const player=state.player;
    let found=false;
    for(let y=player.y-5;y<=player.y+1;y++){
      for(let x=player.x-3;x<=player.x+3;x++){
        if(cells.getCell(x,y)===M.CRYSTAL){
          cells.setCell(x,y,M.AIR);
          found=true;
        }
      }
    }

    if(found){
      state.crystals++;
      hud.showMessage(`Crystal collected · total ${state.crystals}`);
    }
  }

  function update(){
    const player=state.player;
    if(player.locked){
      player.vx=0;
      player.vy=0;
      player.grounded=true;
      return;
    }
    if(player.furnitureMode==='sit'){
      player.vx=0;
      player.vy=0;
      player.grounded=true;
      if(player.invulnerability>0)player.invulnerability--;
      return;
    }
    resolveOverlap();
    const previousSwimming=Boolean(player.status?.swimming);
    const pressingLeft=state.input.keys.has('a')||state.input.keys.has('arrowleft');
    const pressingRight=state.input.keys.has('d')||state.input.keys.has('arrowright');
    if(pressingLeft&&!pressingRight)player.facing=-1;
    else if(pressingRight&&!pressingLeft)player.facing=1;
    else if(player.vx<-.04)player.facing=-1;
    else if(player.vx>.04)player.facing=1;
    const initialWater=waterExposureAt(player.x,player.y);
    const parasiteMultiplier=Math.max(.4,Math.min(1,Number(player.parasiteSlowMultiplier)||1));
    const swimming=(initialWater.swimming||(previousSwimming&&initialWater.surfaceSwimming))&&!player.skySpawn;
    const ladder=furniture?.playerOnLadder?.()??null;
    const climbing=Boolean(ladder&&!swimming&&!player.skySpawn);
    const wasGrounded=player.grounded;
    player.grounded=!swimming&&!climbing&&groundProbe();
    state.coyoteFrames=player.grounded?C.coyoteFrames:Math.max(0,state.coyoteFrames-1);
    state.jumpBuffer=Math.max(0,state.jumpBuffer-1);

    const bunny=bunnyHopState();
    if(climbing){
      resetBunnyHop();
      state.coyoteFrames=0;
      const left=state.input.keys.has('a')||state.input.keys.has('arrowleft');
      const right=state.input.keys.has('d')||state.input.keys.has('arrowright');
      const up=state.input.keys.has('w')||state.input.keys.has('arrowup')||state.input.keys.has(' ');
      const down=state.input.keys.has('s')||state.input.keys.has('arrowdown');
      if(left)player.vx-=.08*parasiteMultiplier;
      if(right)player.vx+=.08*parasiteMultiplier;
      player.vx*=.72;
      player.vx=Math.max(-.75,Math.min(.75,player.vx));
      player.vy=up&&!down?-1.05:down&&!up?1.05:0;
      motionRemainder.y=0;
      state.jumpBuffer=0;
    }else if(swimming){
      resetBunnyHop();
      state.jumpBuffer=0;
      state.coyoteFrames=0;
      const left=state.input.keys.has('a')||state.input.keys.has('arrowleft');
      const right=state.input.keys.has('d')||state.input.keys.has('arrowright');
      const up=state.input.keys.has('w')||state.input.keys.has('arrowup')||state.input.keys.has(' ');
      const down=state.input.keys.has('s')||state.input.keys.has('arrowdown');
      if(left)player.vx-=S.acceleration*parasiteMultiplier;
      if(right)player.vx+=S.acceleration*parasiteMultiplier;
      const atSurface=!initialWater.headSubmerged&&Number.isFinite(initialWater.surfaceBaselineY);
      if(up&&initialWater.headSubmerged)player.vy-=S.verticalAcceleration;
      else if(atSurface){
        const surfaceError=initialWater.surfaceBaselineY-player.y;
        if(surfaceError>0)player.vy+=Math.min(S.surfaceSettleAcceleration,surfaceError*S.surfaceSpring);
        else if(surfaceError<0&&!down)player.vy-=Math.min(S.buoyancy,-surfaceError*S.surfaceSpring);
        // Do not let passive buoyancy or held-up input lift the whole sprite
        // clear of deep water. The swimmer treads at the surface until they
        // move onto standable terrain or leave the liquid horizontally.
        if(!down&&player.y<=initialWater.surfaceBaselineY&&player.vy<0){
          player.vy=0;
          motionRemainder.y=0;
        }
      }else player.vy-=S.buoyancy;
      if(down)player.vy+=S.downwardAcceleration;
      player.vx*=S.drag;
      player.vy*=S.drag;
      player.vx=Math.max(-S.maxHorizontalSpeed*parasiteMultiplier,Math.min(S.maxHorizontalSpeed*parasiteMultiplier,player.vx));
      player.vy=Math.max(-S.maxVerticalSpeed,Math.min(S.maxVerticalSpeed,player.vy));
    }else{
      if(!player.skySpawn&&state.jumpBuffer>0&&state.coyoteFrames>0)performJump();
      const airControlMultiplier=Math.min(
        B.maxAirControlMultiplier,
        1+Math.max(0,bunny.chain-1)*B.airControlBonusPerHop,
      );
      if(!player.skySpawn){
        if(state.input.keys.has('a')||state.input.keys.has('arrowleft'))player.vx-=C.acceleration*airControlMultiplier*parasiteMultiplier;
        if(state.input.keys.has('d')||state.input.keys.has('arrowright'))player.vx+=C.acceleration*airControlMultiplier*parasiteMultiplier;
      }
      const preservingMomentum=player.grounded&&bunny.chain>0&&bunny.landingWindow>0;
      player.vx*=player.grounded?(preservingMomentum?B.groundMomentumDrag:C.groundDrag):C.airDrag;
      const speedLimit=C.maxSpeed*bunnySpeedMultiplier(bunny.chain)*parasiteMultiplier;
      player.vx=Math.max(-speedLimit,Math.min(speedLimit,player.vx));
      const gravityScale=generator.dimensionGravityScale?.()??1;
      player.vy=Math.min(C.maxFallSpeed,player.vy+C.gravity*gravityScale);
    }
    const impactVelocity=player.vy;

    const horizontalPixels=wholePixelMotion('x',player.vx);
    const verticalPixels=wholePixelMotion('y',player.vy);
    const steppedLanded=moveHorizontal(horizontalPixels);
    const verticalLanded=moveVertical(verticalPixels);
    let landed=steppedLanded||verticalLanded;

    const previousChunkX=state.world.camera.chunkX;
    const previousChunkY=state.world.camera.chunkY;
    if(chunks.chunkX(player.x)!==previousChunkX||chunks.chunkY(player.y)!==previousChunkY){
      chunks.updateActiveNeighborhood();
      hud.showMessage(`${generator.biomeNameAt(player.x)} · region ${state.world.camera.chunkX}, ${state.world.camera.chunkY}`);
    }

    const postWater=waterExposureAt(player.x,player.y);
    const nowSwimming=(postWater.swimming||(swimming&&postWater.surfaceSwimming))&&!player.skySpawn;
    const stillClimbing=Boolean(furniture?.playerOnLadder?.()&&!nowSwimming&&!player.skySpawn);
    player.grounded=(nowSwimming||stillClimbing)?false:(landed||groundProbe());
    if(player.grounded)state.coyoteFrames=C.coyoteFrames;
    if(!wasGrounded&&player.grounded){
      bunny.lastLandingFrame=state.frame;
      bunny.landingWindow=B.landingWindowFrames;
      bunny.groundFrames=0;
      if(impactVelocity>.3)juice?.land?.(player.x,player.y,impactVelocity);
    }
    if(player.skySpawn&&player.grounded){
      player.skySpawn=false;
      player.spawnGroundY=0;
      player.invulnerability=Math.max(player.invulnerability,60);
      state.jumpBuffer=0;
      resetBunnyHop();
      juice?.screenFlash?.('rgba(220,244,255,.16)',4);
      juice?.shockwave?.(player.x,player.y,'rgb(205,231,244)',8,12);
      hud.showMessage('Touchdown',900);
    }

    if(!player.skySpawn&&player.grounded&&state.jumpBuffer>0)performJump();

    if(player.grounded){
      bunny.groundFrames++;
      if(bunny.landingWindow>0)bunny.landingWindow--;
      if(bunny.chain>0&&bunny.groundFrames>B.groundResetFrames)resetBunnyHop();
    }else{
      bunny.groundFrames=0;
    }

    if(nowSwimming!==previousSwimming){
      juice?.burst?.(player.x,player.y-1,{
        colors:['rgb(218,247,255)','rgb(104,197,235)','rgb(44,123,185)'],
        count:nowSwimming?10:6,speedMin:.18,speedMax:.9,gravity:-.025,lifeMin:10,lifeMax:24,twinkle:2,
      });
      if(nowSwimming)juice?.worldFlash?.(player.x,player.y-1,'rgb(157,225,250)',3,5);
    }
    if(nowSwimming&&postWater.headSubmerged&&state.frame%12===0){
      juice?.burst?.(player.x,postWater.bounds.top,{
        colors:['rgb(232,251,255)','rgb(140,220,248)'],
        count:2,speedMin:.08,speedMax:.28,angle:-Math.PI*.5,spread:.7,gravity:-.035,drag:.98,lifeMin:18,lifeMax:34,twinkle:3,
      });
    }

    const baseDrain=HUNGER_CONFIG.max/HUNGER_CONFIG.fullDrainFrames;
    const moving=Math.abs(player.vx)>.04||!player.grounded;
    player.hungerRemainder+=(moving?baseDrain*HUNGER_CONFIG.movingMultiplier:baseDrain);
    if(player.hungerRemainder>=.01){
      const drain=Math.floor(player.hungerRemainder*100)/100;
      player.hunger=Math.max(0,player.hunger-drain);
      player.hungerRemainder-=drain;
    }
    player.starvationTimer=player.hunger<=0?player.starvationTimer+1:0;
    if(player.starvationTimer>=HUNGER_CONFIG.starvationIntervalFrames){
      player.starvationTimer=0;
      damage(HUNGER_CONFIG.starvationDamage);
    }

    const bounds=playerPixelBounds(player.x,player.y,player.width,player.height);
    let touchesLava=false;
    let touchesFire=false;
    let touchesSteam=false;
    for(let y=bounds.top;y<=bounds.bottom;y++){
      for(let x=bounds.left;x<=bounds.right;x++){
        const material=cells.getCell(x,y);
        if(material===M.LAVA)touchesLava=true;
        if(material===M.FIRE)touchesFire=true;
        if(material===M.STEAM)touchesSteam=true;
      }
    }
    const hasOxygen=dimensionHasOxygen(state.world.dimension);
    const breathUsing=postWater.headSubmerged||!hasOxygen;
    player.status.lava=touchesLava;
    player.status.fire=touchesFire;
    player.status.steam=touchesSteam;
    player.status.starving=player.hunger<=0;
    player.status.swimming=nowSwimming;
    player.status.climbing=stillClimbing;
    player.status.headSubmerged=postWater.headSubmerged;
    player.status.breathUsing=breathUsing;
    player.status.noOxygen=!hasOxygen;

    if(breathUsing){
      player.breathRemainder+=R.max/R.fullDrainFrames;
      if(player.breathRemainder>=.01){
        const drain=Math.floor(player.breathRemainder*100)/100;
        player.breath=Math.max(0,player.breath-drain);
        player.breathRemainder-=drain;
      }
    }else{
      player.breathRemainder-=R.max/R.fullRecoveryFrames;
      if(player.breathRemainder<=-.01){
        const recovery=Math.floor(-player.breathRemainder*100)/100;
        player.breath=Math.min(R.max,player.breath+recovery);
        player.breathRemainder+=recovery;
      }
    }
    player.drowningTimer=player.breath<=0?player.drowningTimer+1:0;
    if(player.drowningTimer>=R.drowningIntervalFrames){
      player.drowningTimer=0;
      damage(R.drowningDamage);
      juice?.burst?.(player.x,postWater.bounds.top,{
        colors:['rgb(235,251,255)','rgb(105,191,230)'],count:8,speedMin:.18,speedMax:.7,gravity:-.04,lifeMin:14,lifeMax:28,
      });
    }

    if(touchesLava)damage(5);
    if(touchesFire)damage(4);
    if(touchesSteam)damage(STEAM_CONFIG.playerDamage);

    if(player.skySpawn)player.invulnerability=Math.max(player.invulnerability,60);
    if(player.invulnerability>0)player.invulnerability--;
    if(state.cooldown>0)state.cooldown--;
    if(state.swordTimer>0)state.swordTimer--;
    if(state.toolEffect.frames>0)state.toolEffect.frames--;
    if(state.input.pointerDown)weapons.attack();

    collectCrystals();

    if(player.hp<=0){
      player.hp=0;
      state.paused=true;
      hud.showMessage('You died — press R to generate a new world',5000);
    }
  }

  function releaseJump(){
    if(state.player.vy<-.45)state.player.vy*=.55;
  }

  return {
    update,
    releaseJump,
    damage,
    collides,
    groundProbe,
    groundProbeAt,
    tryAutoStep,
    resolveOverlap,
    resetMotionRemainder,
    resetBunnyHop,
    bunnyJumpMultiplier,
    bunnySpeedMultiplier,
    waterExposureAt,
  };
}

Object.assign(exports,{createPlayerSystem});

};

__modules["src/systems/projectile-system.js"]=function(exports,__require){
const { GRENADE_CONFIG, DRONE_STRIKE_CONFIG, NAPALM_CONFIG, GLAIVE_CONFIG, NYAN_CAT_CONFIG, REALITY_ZIPPER_CONFIG } = __require("src/config.js");
const { MaterialId, FLAMMABLE_MATERIALS } = __require("src/data/materials.db.js");
const { nearestPixel, placeOnPixel, snapPixelPosition, snapStoredCoordinates } = __require("src/pixel-grid.js");
const { faunaById } = __require("src/data/fauna.db.js");
function createProjectileSystem(state,cells,chunks,noise,juice=null){
  const M=MaterialId;

  function forEachBossInRadius(x,y,radius,callback){
    for(const boss of state.entities.bosses){
      const halfWidth=(boss.width??17)*.5;
      const halfHeight=(boss.height??11)*.5;
      if(Math.abs(boss.x-x)>halfWidth+radius||Math.abs(boss.y-y)>halfHeight+radius)continue;
      callback(boss);
    }
  }

  function damageBossesAt(x,y,radius,damage,impulseX=0,impulseY=0){
    let hit=false;
    forEachBossInRadius(x,y,radius,boss=>{
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,6);
      boss.vx=(boss.vx??0)+impulseX;
      boss.vy=(boss.vy??0)+impulseY;
      hit=true;
    });
    return hit;
  }

  function damageBossesInRadius(x,y,radius,damage){
    let hit=false;
    forEachBossInRadius(x,y,radius,boss=>{
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,8);
      hit=true;
    });
    return hit;
  }

  function updateNapalmShots(){
    const shots=state.entities.napalmShots;
    const STUCK_NAPALM_LIFE=1;

    function touchesSolid(x,y){
      return [[1,0],[-1,0],[0,1],[0,-1]].some(([offsetX,offsetY])=>{
        return cells.isSolid(cells.getCell(x+offsetX,y+offsetY));
      });
    }

    function touchesHeat(x,y){
      return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([offsetX,offsetY])=>{
        const type=cells.getCell(x+offsetX,y+offsetY);
        return type===M.FIRE||type===M.LAVA;
      });
    }

    function canReceiveNapalm(x,y){
      const type=cells.getCell(x,y);
      return type===M.AIR||type===M.SMOKE||type===M.STEAM;
    }

    function depositNapalm(preferredX,preferredY,impactX,impactY){
      const candidates=[[preferredX,preferredY]];
      for(let radius=0;radius<3;radius++){
        for(let offsetY=-radius;offsetY<=radius;offsetY++){
          for(let offsetX=-radius;offsetX<=radius;offsetX++){
            candidates.push([impactX+offsetX,impactY+offsetY]);
          }
        }
      }

      const seen=new Set();
      for(const [x,y] of candidates){
        const candidateKey=x+','+y;
        if(seen.has(candidateKey))continue;
        seen.add(candidateKey);
        if(!canReceiveNapalm(x,y))continue;

        if(touchesHeat(x,y)){
          cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
        }else{
          cells.setCell(x,y,M.NAPALM,touchesSolid(x,y)?STUCK_NAPALM_LIFE:0);
        }
        return true;
      }
      return false;
    }

    for(let i=shots.length-1;i>=0;i--){
      const shot=shots[i];
      shot.life--;
      shot.vy+=.035;
      shot.vx*=.992;
      let hit=shot.life<=0;
      let lastOpenX=Math.floor(shot.x);
      let lastOpenY=Math.floor(shot.y);
      let impactX=lastOpenX;
      let impactY=lastOpenY;

      for(let step=0;step<3&&!hit;step++){
        const previousX=shot.x;
        const previousY=shot.y;
        shot.x+=shot.vx/3;
        shot.y+=shot.vy/3;

        if(!chunks.isActiveWorldPosition(shot.x,shot.y)){
          hit=true;
          break;
        }

        const pixelX=Math.floor(shot.x);
        const pixelY=Math.floor(shot.y);
        const type=cells.getCell(pixelX,pixelY);
        impactX=pixelX;
        impactY=pixelY;

        if(cells.isSolid(type)||type===M.WATER||type===M.LAVA||type===M.FIRE){
          hit=true;
          // Keep the deposit on the open side of the impacted material.
          shot.x=previousX;
          shot.y=previousY;
          break;
        }

        lastOpenX=pixelX;
        lastOpenY=pixelY;

        // Raw napalm has no contact damage. Hitting an enemy or boss only stops the
        // droplet so it can coat the nearby world; fire is what causes harm.
        if(damageBossesAt(shot.x,shot.y,1.6,0)){
          hit=true;
          break;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            const radius=faunaById(enemy.speciesId)?.hitRadius??2;
            if(Math.hypot(enemy.x-shot.x,enemy.y-shot.y)<radius+1.2){
              hit=true;
              break;
            }
          }
          if(hit)break;
        }
      }

      if(!hit)continue;

      depositNapalm(lastOpenX,lastOpenY,impactX,impactY);
      shots.splice(i,1);
    }
  }

  function updateBullets(){
    const bullets=state.entities.bullets;

    for(let i=bullets.length-1;i>=0;i--){
      const bullet=bullets[i];
      bullet.life--;
      let dead=bullet.life<=0;

      for(let step=0;step<4&&!dead;step++){
        bullet.x+=bullet.vx/4;
        bullet.y+=bullet.vy/4;

        if(!chunks.isActiveWorldPosition(bullet.x,bullet.y)){
          dead=true;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(bullet.x),Math.floor(bullet.y)))){
          dead=true;
          break;
        }

        if(damageBossesAt(bullet.x,bullet.y,1.5,22,bullet.vx*.02,bullet.vy*.02)){
          bullet.pierce--;
          if(bullet.pierce<=0)dead=true;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            const radius=faunaById(enemy.speciesId)?.hitRadius??2;
            if(Math.hypot(enemy.x-bullet.x,enemy.y-bullet.y)<radius+1){
              enemy.hp-=22;
              enemy.hit=6;
              bullet.pierce--;
              if(bullet.pierce<=0)dead=true;
              break;
            }
          }
          if(dead)break;
        }
      }

      if(dead)bullets.splice(i,1);
    }
  }

  function updateGlaives(){
    const glaives=state.entities.glaives;

    function blockedAt(x,y){
      if(!chunks.isActiveWorldPosition(x,y))return true;
      return cells.isSolid(cells.getCell(Math.floor(x),Math.floor(y)));
    }

    function recordRicochet(blade){
      blade.bounces=(blade.bounces??0)+1;
      blade.spinSpeed=-(blade.spinSpeed||GLAIVE_CONFIG.spinSpeed)*1.04;
      if(blade.bounces>=GLAIVE_CONFIG.maxBounces)blade.returning=true;
    }

    function moveWithRicochet(blade){
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(blade.vx),Math.abs(blade.vy))*3));
      for(let step=0;step<steps;step++){
        const stepX=blade.vx/steps;
        const stepY=blade.vy/steps;
        const nextX=blade.x+stepX;
        const nextY=blade.y+stepY;
        const blockedX=blockedAt(nextX,blade.y);
        const blockedY=blockedAt(blade.x,nextY);
        const blockedDiagonal=blockedAt(nextX,nextY);

        if(!blockedX&&!blockedY&&!blockedDiagonal){
          blade.x=nextX;
          blade.y=nextY;
          continue;
        }

        let bounceX=blockedX;
        let bounceY=blockedY;
        if(!bounceX&&!bounceY&&blockedDiagonal){
          bounceX=true;
          bounceY=true;
        }

        if(bounceX)blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
        if(bounceY)blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
        if(!bounceX&&!bounceY){
          blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
          blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
        }

        recordRicochet(blade);

        // Keep the blade outside the collided cell so it cannot become embedded.
        const nudgeX=Math.sign(blade.vx)*.12;
        const nudgeY=Math.sign(blade.vy)*.12;
        if(!blockedAt(blade.x+nudgeX,blade.y))blade.x+=nudgeX;
        if(!blockedAt(blade.x,blade.y+nudgeY))blade.y+=nudgeY;
        break;
      }
    }

    function ricochetFromEnemy(blade,enemy){
      let nx=blade.x-enemy.x;
      let ny=blade.y-enemy.y;
      const length=Math.hypot(nx,ny)||1;
      nx/=length;
      ny/=length;
      const dot=blade.vx*nx+blade.vy*ny;
      if(dot<0){
        blade.vx=(blade.vx-2*dot*nx)*GLAIVE_CONFIG.ricochetRetention;
        blade.vy=(blade.vy-2*dot*ny)*GLAIVE_CONFIG.ricochetRetention;
      }else{
        blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
        blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
      }
      recordRicochet(blade);
    }

    for(let i=glaives.length-1;i>=0;i--){
      const blade=glaives[i];
      blade.age++;
      blade.spin=(blade.spin??0)+(blade.spinSpeed??GLAIVE_CONFIG.spinSpeed);
      if(blade.age>GLAIVE_CONFIG.returnAfterFrames)blade.returning=true;
      if(blade.age>GLAIVE_CONFIG.maxLifeFrames){
        glaives.splice(i,1);
        continue;
      }

      if(blade.returning){
        const dx=state.player.x-blade.x;
        const dy=state.player.y-2-blade.y;
        const distance=Math.hypot(dx,dy)||1;
        blade.vx=(blade.vx+dx/distance*.14)*.96;
        blade.vy=(blade.vy+dy/distance*.14)*.96;

        if(distance<3){
          glaives.splice(i,1);
          continue;
        }
      }

      moveWithRicochet(blade);

      forEachBossInRadius(blade.x,blade.y,3,boss=>{
        const key='boss:'+boss.regionIndex;
        const nextAllowed=blade.hits.get(key)||0;
        if(nextAllowed>state.frame)return;
        boss.hp-=28;
        boss.hit=Math.max(boss.hit??0,6);
        blade.hits.set(key,state.frame+GLAIVE_CONFIG.enemyHitCooldown);
        ricochetFromEnemy(blade,boss);
      });

      for(const chunk of state.world.activeChunks){
        for(const enemy of chunk.enemies){
          const nextAllowed=blade.hits.get(enemy)||0;
          if(nextAllowed>state.frame)continue;

          const radius=faunaById(enemy.speciesId)?.hitRadius??2;
          if(Math.hypot(enemy.x-blade.x,enemy.y-blade.y)<radius+2){
            enemy.hp-=28;
            enemy.hit=4;
            blade.hits.set(enemy,state.frame+GLAIVE_CONFIG.enemyHitCooldown);
            ricochetFromEnemy(blade,enemy);
          }
        }
      }
    }
  }

  function fireLifeAt(x,y,salt){
    const span=GRENADE_CONFIG.fireLifeMax-GRENADE_CONFIG.fireLifeMin;
    return GRENADE_CONFIG.fireLifeMin+Math.floor(noise.randomAt(x,y,salt)*span);
  }

  function placeExplosionFire(x,y,life){
    const type=cells.getCell(x,y);
    if(type===M.AIR||type===M.SMOKE){
      cells.setCell(x,y,M.FIRE,life);
      return true;
    }
    if(type!==M.NAPALM&&FLAMMABLE_MATERIALS.has(type)){
      cells.setCell(x,y,M.FIRE,life);
      return true;
    }
    return false;
  }

  function igniteEntityPositions(centerX,centerY,radius,fireLife){
    const playerDistance=Math.hypot(state.player.x-centerX,state.player.y-2-centerY);
    if(playerDistance<=radius){
      const x=Math.floor(state.player.x);
      const y=Math.floor(state.player.y-2);
      placeExplosionFire(x,y,fireLife);
    }

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(Math.hypot(enemy.x-centerX,enemy.y-centerY)>radius)continue;
        placeExplosionFire(
          Math.floor(enemy.x),
          Math.floor(enemy.y),
          fireLife,
        );
      }
    }
  }

  function explodeGrenade(grenade){
    const centerX=Math.floor(grenade.x);
    const centerY=Math.floor(grenade.y);
    const blastRadius=GRENADE_CONFIG.blastRadius;
    const fireRadius=GRENADE_CONFIG.fireRadius;

    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:fireRadius,
      frames:12,
      maxFrames:12,
    });

    for(let y=centerY-blastRadius;y<=centerY+blastRadius;y++){
      for(let x=centerX-blastRadius;x<=centerX+blastRadius;x++){
        const distanceSquared=(x-centerX)**2+(y-centerY)**2;
        if(distanceSquared>blastRadius*blastRadius)continue;
        const type=cells.getCell(x,y);
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
      }
    }

    for(let y=centerY-fireRadius;y<=centerY+fireRadius;y++){
      for(let x=centerX-fireRadius;x<=centerX+fireRadius;x++){
        const distance=Math.hypot(x-centerX,y-centerY);
        if(distance>fireRadius)continue;

        const innerStrength=1-distance/fireRadius;
        const chance=.16+innerStrength*.55;
        if(noise.randomAt(x,y,state.frame+930)>chance)continue;
        placeExplosionFire(x,y,fireLifeAt(x,y,state.frame+931));
      }
    }

    // Guarantee a hot core and ensure nearby actors are hurt by generated fire,
    // never by hidden direct explosion damage.
    placeExplosionFire(centerX,centerY,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX,centerY-1,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX-1,centerY,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX+1,centerY,GRENADE_CONFIG.fireLifeMax);
    igniteEntityPositions(
      centerX,
      centerY,
      GRENADE_CONFIG.fireRadius,
      GRENADE_CONFIG.fireLifeMax,
    );
    damageBossesInRadius(centerX,centerY,GRENADE_CONFIG.fireRadius,22);
  }

  function updateGrenades(){
    const grenades=state.entities.grenades;

    for(let i=grenades.length-1;i>=0;i--){
      const grenade=grenades[i];
      grenade.fuse--;

      if(grenade.fuse<=0){
        explodeGrenade(grenade);
        grenades.splice(i,1);
        continue;
      }

      grenade.vy+=GRENADE_CONFIG.gravity;
      grenade.vx*=GRENADE_CONFIG.airDrag;
      grenade.rotation+=grenade.vx*.22;
      let active=true;

      for(let step=0;step<4&&active;step++){
        const nextX=grenade.x+grenade.vx/4;
        if(!chunks.isActiveWorldPosition(nextX,grenade.y)){
          grenades.splice(i,1);
          active=false;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(nextX),Math.floor(grenade.y)))){
          if(Math.abs(grenade.vx)>.35)juice?.impact?.(grenade.x,grenade.y,{kind:'dust',count:5,shake:.18,hitStop:0});
          grenade.vx*=-GRENADE_CONFIG.bounce;
          grenade.bounces=(grenade.bounces??0)+1;
        }else{
          grenade.x=nextX;
        }

        const nextY=grenade.y+grenade.vy/4;
        if(!chunks.isActiveWorldPosition(grenade.x,nextY)){
          grenades.splice(i,1);
          active=false;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(grenade.x),Math.floor(nextY)))){
          if(Math.abs(grenade.vy)>.35)juice?.impact?.(grenade.x,grenade.y,{kind:'dust',count:5,shake:.18,hitStop:0});
          grenade.vy*=-GRENADE_CONFIG.bounce;
          grenade.bounces=(grenade.bounces??0)+1;
          grenade.vx*=GRENADE_CONFIG.groundFriction;
          if(Math.abs(grenade.vy)<.08)grenade.vy=0;
        }else{
          grenade.y=nextY;
        }
      }

      if(!active)continue;
      const material=cells.getCell(Math.floor(grenade.x),Math.floor(grenade.y));
      if(material===M.FIRE||material===M.LAVA)grenade.fuse=Math.min(grenade.fuse,4);
    }
  }

  function droneFireLifeAt(x,y,salt){
    const span=DRONE_STRIKE_CONFIG.fireLifeMax-DRONE_STRIKE_CONFIG.fireLifeMin;
    return DRONE_STRIKE_CONFIG.fireLifeMin+Math.floor(noise.randomAt(x,y,salt)*span);
  }

  function explodeDroneRocket(rocket){
    const centerX=Math.floor(rocket.targetX??rocket.x);
    const centerY=Math.floor(rocket.targetY??rocket.y);
    const blastRadius=DRONE_STRIKE_CONFIG.blastRadius;
    const fireRadius=DRONE_STRIKE_CONFIG.fireRadius;

    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:fireRadius,
      frames:DRONE_STRIKE_CONFIG.explosionFrames,
      maxFrames:DRONE_STRIKE_CONFIG.explosionFrames,
      kind:'drone',
    });

    for(let y=centerY-blastRadius;y<=centerY+blastRadius;y++){
      for(let x=centerX-blastRadius;x<=centerX+blastRadius;x++){
        if((x-centerX)**2+(y-centerY)**2>blastRadius*blastRadius)continue;
        const type=cells.getCell(x,y);
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
      }
    }

    for(let y=centerY-fireRadius;y<=centerY+fireRadius;y++){
      for(let x=centerX-fireRadius;x<=centerX+fireRadius;x++){
        const distance=Math.hypot(x-centerX,y-centerY);
        if(distance>fireRadius)continue;
        const strength=1-distance/fireRadius;
        const guaranteed=distance<=5;
        const chance=.28+strength*.66;
        if(!guaranteed&&noise.randomAt(x,y,state.frame+2520)>chance)continue;
        placeExplosionFire(x,y,droneFireLifeAt(x,y,state.frame+2521));
      }
    }

    for(let offset=-7;offset<=7;offset++){
      placeExplosionFire(
        centerX+offset,
        centerY-1-Math.floor(Math.abs(offset)*.18),
        DRONE_STRIKE_CONFIG.fireLifeMax,
      );
    }

    igniteEntityPositions(
      centerX,
      centerY,
      fireRadius,
      DRONE_STRIKE_CONFIG.fireLifeMax,
    );
    damageBossesInRadius(centerX,centerY,fireRadius,46);
  }

  function launchDroneRocket(drone){
    const dx=drone.targetX-drone.x;
    const dy=drone.targetY-drone.y;
    const distance=Math.hypot(dx,dy)||1;
    state.entities.droneRockets.push({
      x:drone.x,
      y:nearestPixel(drone.y+1.5),
      vx:dx/distance*.55,
      vy:Math.max(.65,dy/distance*.85),
      targetX:drone.targetX,
      targetY:drone.targetY,
      age:0,
    });
  }

  function updateDrones(){
    const drones=state.entities.drones;
    for(let i=drones.length-1;i>=0;i--){
      const drone=drones[i];
      drone.bob+=.16;
      drone.x+=drone.direction*DRONE_STRIKE_CONFIG.droneSpeed;

      if(!chunks.isActiveWorldPosition(drone.x,drone.y)){
        drones.splice(i,1);
        continue;
      }

      if(cells.getCell(Math.floor(drone.x),Math.floor(drone.y))!==M.AIR){
        drones.splice(i,1);
        continue;
      }

      if(drone.phase==='approach'){
        const reachedTarget=drone.direction>0
          ?drone.x>=drone.targetX
          :drone.x<=drone.targetX;
        if(reachedTarget){
          launchDroneRocket(drone);
          drone.phase='exit';
          drone.launched=true;
        }
      }

      if(drone.phase==='exit'){
        const leftMap=drone.direction>0
          ?drone.x>=drone.exitX
          :drone.x<=drone.exitX;
        if(leftMap)drones.splice(i,1);
      }
    }
  }

  function updateDroneRockets(){
    const rockets=state.entities.droneRockets;
    for(let i=rockets.length-1;i>=0;i--){
      const rocket=rockets[i];
      rocket.age++;

      const dx=rocket.targetX-rocket.x;
      const dy=rocket.targetY-rocket.y;
      const distance=Math.hypot(dx,dy)||1;
      const desiredVx=dx/distance*DRONE_STRIKE_CONFIG.rocketSpeed;
      const desiredVy=dy/distance*DRONE_STRIKE_CONFIG.rocketSpeed;
      rocket.vx+=(desiredVx-rocket.vx)*DRONE_STRIKE_CONFIG.rocketHoming;
      rocket.vy+=(desiredVy-rocket.vy)*DRONE_STRIKE_CONFIG.rocketHoming;
      rocket.vy+=DRONE_STRIKE_CONFIG.rocketGravity;

      let detonated=false;
      for(let step=0;step<5&&!detonated;step++){
        const nextX=rocket.x+rocket.vx/5;
        const nextY=rocket.y+rocket.vy/5;

        if(!chunks.isActiveWorldPosition(nextX,nextY)){
          rockets.splice(i,1);
          detonated=true;
          break;
        }

        const type=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        if(cells.isSolid(type)){
          if(FLAMMABLE_MATERIALS.has(type)){
            cells.setCell(Math.floor(nextX),Math.floor(nextY),M.FIRE,DRONE_STRIKE_CONFIG.fireLifeMax);
            rocket.x=nextX;
            rocket.y=nextY;
            continue;
          }
          explodeDroneRocket(rocket);
          rockets.splice(i,1);
          detonated=true;
          break;
        }

        rocket.x=nextX;
        rocket.y=nextY;
        if(Math.hypot(rocket.targetX-rocket.x,rocket.targetY-rocket.y)<1.35||rocket.y>=rocket.targetY){
          explodeDroneRocket(rocket);
          rockets.splice(i,1);
          detonated=true;
        }
      }
    }
  }


  function spawnNyanSparks(x,y,count=NYAN_CAT_CONFIG.sparkCount){
    const colors=6;
    for(let index=0;index<count;index++){
      const angle=noise.randomAt(x+index,y,state.frame+9920)*Math.PI*2;
      const speed=.45+noise.randomAt(index,x+y,state.frame+9921)*2.25;
      state.entities.nyanSparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-.15,
        life:18+Math.floor(noise.randomAt(y,index,state.frame+9922)*30),
        colorIndex:index%colors,
      });
    }
    if(state.entities.nyanSparks.length>NYAN_CAT_CONFIG.maxSparks){
      state.entities.nyanSparks.splice(0,state.entities.nyanSparks.length-NYAN_CAT_CONFIG.maxSparks);
    }
  }

  function damageEnemiesInNyanBlast(x,y,radius){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const dx=enemy.x-x;
        const dy=enemy.y-y;
        const distance=Math.hypot(dx,dy);
        if(distance>radius)continue;
        const force=Math.max(.1,1-distance/radius);
        enemy.hp-=NYAN_CAT_CONFIG.blastDamage;
        enemy.hit=Math.max(enemy.hit??0,10);
        const length=distance||1;
        enemy.vx=(enemy.vx??0)+dx/length*1.2*force;
        enemy.vy=(enemy.vy??0)+dy/length*1.2*force-.25;
      }
    }
  }

  function explodeNyanCat(cat){
    const centerX=Math.round(cat.x);
    const centerY=Math.round(cat.y);
    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:NYAN_CAT_CONFIG.blastRadius,
      frames:22,
      maxFrames:22,
      kind:'nyan',
    });

    const terrainRadius=NYAN_CAT_CONFIG.terrainRadius;
    for(let y=centerY-terrainRadius;y<=centerY+terrainRadius;y++){
      for(let x=centerX-terrainRadius;x<=centerX+terrainRadius;x++){
        const dx=x-centerX;
        const dy=y-centerY;
        const distance=Math.hypot(dx,dy);
        const angle=Math.atan2(dy,dx);
        const starRadius=terrainRadius*(.7+.3*Math.abs(Math.cos(angle*5)));
        if(distance>starRadius)continue;
        const type=cells.getCell(x,y);
        if(!cells.isSolid(type))continue;
        const edge=distance>starRadius-1.4;
        if(edge&&noise.randomAt(x,y,state.frame+9931)<.28){
          cells.setCell(x,y,M.CRYSTAL,0,{reason:'nyan-cat-impact'});
        }else{
          cells.setCell(x,y,M.AIR,0,{reason:'nyan-cat-impact'});
        }
      }
    }

    damageBossesInRadius(centerX,centerY,NYAN_CAT_CONFIG.blastRadius,NYAN_CAT_CONFIG.bossDamage);
    damageEnemiesInNyanBlast(centerX,centerY,NYAN_CAT_CONFIG.blastRadius);
    spawnNyanSparks(centerX,centerY);
  }

  function updateNyanSparks(){
    for(let index=state.entities.nyanSparks.length-1;index>=0;index--){
      const spark=state.entities.nyanSparks[index];
      spark.x+=spark.vx;
      spark.y+=spark.vy;
      spark.vx*=.975;
      spark.vy+=.055;
      spark.life--;
      if(spark.life<=0)state.entities.nyanSparks.splice(index,1);
    }
  }

  function preserveNyanMomentum(cat){
    const speed=Math.hypot(cat.vx,cat.vy);
    if(speed<=0||speed>=NYAN_CAT_CONFIG.minimumMomentum)return;
    const scale=NYAN_CAT_CONFIG.minimumMomentum/speed;
    cat.vx*=scale;
    cat.vy*=scale;
  }

  function nyanHitsTerrainAt(cat,x,y,axis){
    if(axis==='x'){
      const facing=Math.sign(cat.vx||1);
      const probeX=Math.round(x+facing*6);
      const centerY=Math.round(y);
      for(let offsetY=-2;offsetY<=2;offsetY++){
        if(cells.isSolid(cells.getCell(probeX,centerY+offsetY)))return true;
      }
      return false;
    }

    const vertical=Math.sign(cat.vy||1);
    const probeY=Math.round(y+vertical*3);
    const centerX=Math.round(x);
    for(let offsetX=-5;offsetX<=5;offsetX+=2){
      if(cells.isSolid(cells.getCell(centerX+offsetX,probeY)))return true;
    }
    return false;
  }

  function bounceNyanCat(cat,axis){
    if(axis==='x')cat.vx*=-NYAN_CAT_CONFIG.bounceRetention;
    else cat.vy*=-NYAN_CAT_CONFIG.bounceRetention;
    cat.bounces=(cat.bounces??0)+1;
    preserveNyanMomentum(cat);
    spawnNyanSparks(cat.x,cat.y,NYAN_CAT_CONFIG.bounceSparkCount);
  }

  function updateNyanCats(){
    const cats=state.entities.nyanCats;
    for(let index=cats.length-1;index>=0;index--){
      const cat=cats[index];
      cat.life--;
      cat.phase=(cat.phase??0)+.35;
      cat.bounces??=0;
      cat.trail??=[];
      cat.hits??=new Set();
      cat.trail.unshift({x:Math.round(cat.x),y:Math.round(cat.y)});
      if(cat.trail.length>NYAN_CAT_CONFIG.trailLength)cat.trail.length=NYAN_CAT_CONFIG.trailLength;

      cat.vy+=NYAN_CAT_CONFIG.gravity;
      cat.vx*=NYAN_CAT_CONFIG.airDrag;
      cat.vy*=NYAN_CAT_CONFIG.airDrag;
      preserveNyanMomentum(cat);

      let detonate=cat.life<=0||cat.bounces>=NYAN_CAT_CONFIG.maxBounces;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(cat.vx),Math.abs(cat.vy))*2));

      for(let step=0;step<steps&&!detonate;step++){
        const nextX=cat.x+cat.vx/steps;
        if(!chunks.isActiveWorldPosition(nextX,cat.y)){
          detonate=true;
          break;
        }
        if(nyanHitsTerrainAt(cat,nextX,cat.y,'x')){
          bounceNyanCat(cat,'x');
          if(cat.bounces>=NYAN_CAT_CONFIG.maxBounces){detonate=true;break;}
        }else{
          cat.x=nextX;
        }

        const nextY=cat.y+cat.vy/steps;
        if(!chunks.isActiveWorldPosition(cat.x,nextY)){
          detonate=true;
          break;
        }
        if(nyanHitsTerrainAt(cat,cat.x,nextY,'y')){
          bounceNyanCat(cat,'y');
          if(cat.bounces>=NYAN_CAT_CONFIG.maxBounces){detonate=true;break;}
        }else{
          cat.y=nextY;
        }

        if(damageBossesAt(cat.x,cat.y,4,NYAN_CAT_CONFIG.contactDamage,cat.vx*.08,cat.vy*.08)){
          detonate=true;
          break;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            if(enemy.hp<=0||cat.hits.has(enemy))continue;
            const radius=(faunaById(enemy.speciesId)?.hitRadius??2)+3;
            if(Math.hypot(enemy.x-cat.x,enemy.y-cat.y)>radius)continue;
            enemy.hp-=NYAN_CAT_CONFIG.contactDamage;
            enemy.hit=Math.max(enemy.hit??0,8);
            enemy.vx=(enemy.vx??0)+Math.sign(cat.vx||1)*1.1;
            enemy.vy=(enemy.vy??0)-.45;
            cat.hits.add(enemy);
            cat.pierce--;
            spawnNyanSparks(enemy.x,enemy.y,8);
            if(cat.pierce<=0){detonate=true;break;}
          }
          if(detonate)break;
        }
      }

      if(detonate){
        explodeNyanCat(cat);
        cats.splice(index,1);
      }
    }
  }


  function realityLinePoints(x0,y0,x1,y1){
    const points=[];
    let ax=Math.round(x0);
    let ay=Math.round(y0);
    const bx=Math.round(x1);
    const by=Math.round(y1);
    const dx=Math.abs(bx-ax);
    const sx=ax<bx?1:-1;
    const dy=-Math.abs(by-ay);
    const sy=ay<by?1:-1;
    let error=dx+dy;
    for(;;){
      points.push({x:ax,y:ay});
      if(ax===bx&&ay===by)break;
      const doubled=2*error;
      if(doubled>=dy){error+=dy;ax+=sx;}
      if(doubled<=dx){error+=dx;ay+=sy;}
    }
    return points;
  }

  function realityCellState(x,y){
    return {
      x,y,
      type:cells.getCell(x,y),
      life:cells.getLife(x,y),
      cropId:cells.getCropId(x,y),
      plantId:cells.getPlantId(x,y),
      age:cells.getAge(x,y),
    };
  }

  function spawnRealitySparks(x,y,count=REALITY_ZIPPER_CONFIG.pulseSparkCount,normalX=0,normalY=1){
    for(let index=0;index<count;index++){
      const polarity=index%2===0?1:-1;
      const tangentX=-normalY;
      const tangentY=normalX;
      const tangent=(noise.randomAt(index,state.frame,x+y+10101)-.5)*1.9;
      const normal=.35+noise.randomAt(state.frame,index,x-y+10102)*1.45;
      state.entities.realitySparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:tangentX*tangent+normalX*normal*polarity,
        vy:tangentY*tangent+normalY*normal*polarity,
        life:15+Math.floor(noise.randomAt(x+index,y,state.frame+10103)*26),
        colorIndex:(index+Math.floor(state.frame/3))%8,
        phase:noise.randomAt(y,index,state.frame+10104)*Math.PI*2,
      });
    }
    if(state.entities.realitySparks.length>REALITY_ZIPPER_CONFIG.maxSparks){
      state.entities.realitySparks.splice(0,state.entities.realitySparks.length-REALITY_ZIPPER_CONFIG.maxSparks);
    }
  }

  function openRealityRift(rift){
    rift.points=realityLinePoints(rift.startX,rift.startY,rift.endX,rift.endY);
    const snapshot=new Map();
    const reach=REALITY_ZIPPER_CONFIG.splitDistance+REALITY_ZIPPER_CONFIG.halfWidth+1;
    for(const point of rift.points){
      for(let offset=-reach;offset<=reach;offset++){
        const x=point.x+rift.normalX*offset;
        const y=point.y+rift.normalY*offset;
        const key=`${x},${y}`;
        if(!snapshot.has(key))snapshot.set(key,realityCellState(x,y));
      }
    }
    rift.snapshot=[...snapshot.values()];

    const processed=new Set();
    for(const point of rift.points){
      for(const side of [-1,1]){
        for(let offset=REALITY_ZIPPER_CONFIG.halfWidth;offset>=0;offset--){
          const sourceX=point.x+rift.normalX*side*offset;
          const sourceY=point.y+rift.normalY*side*offset;
          const sourceKey=`${sourceX},${sourceY}`;
          if(processed.has(sourceKey))continue;
          processed.add(sourceKey);
          const source=realityCellState(sourceX,sourceY);
          const destinationX=point.x+rift.normalX*side*(offset+REALITY_ZIPPER_CONFIG.splitDistance);
          const destinationY=point.y+rift.normalY*side*(offset+REALITY_ZIPPER_CONFIG.splitDistance);
          if(source.type!==M.AIR){
            cells.setCell(destinationX,destinationY,source.type,source.life,{
              cropId:source.cropId,
              plantId:source.plantId,
              reason:'reality-zipper-open',
            });
            cells.setAge(destinationX,destinationY,source.age);
          }
          cells.setCell(sourceX,sourceY,M.AIR,0,{reason:'reality-zipper-open'});
        }
      }
    }
    rift.applied=true;
    const sampleStep=Math.max(1,Math.floor(rift.points.length/12));
    for(let index=0;index<rift.points.length;index+=sampleStep){
      const point=rift.points[index];
      spawnRealitySparks(point.x,point.y,6,rift.normalX,rift.normalY);
    }
  }

  function restoreRealityRift(rift){
    if(rift.restored)return;
    for(const cell of rift.snapshot??[]){
      const restored=cells.setCell(cell.x,cell.y,cell.type,cell.life,{
        cropId:cell.cropId,
        plantId:cell.plantId,
        reason:'reality-zipper-restore',
      });
      if(restored)cells.setAge(cell.x,cell.y,cell.age);
    }
    rift.restored=true;
    const midpointX=Math.round((rift.startX+rift.endX)*.5);
    const midpointY=Math.round((rift.startY+rift.endY)*.5);
    spawnRealitySparks(midpointX,midpointY,REALITY_ZIPPER_CONFIG.sparkCount,rift.normalX,rift.normalY);
  }

  function distanceToRealityRift(rift,x,y){
    const ax=rift.startX;
    const ay=rift.startY;
    const bx=rift.endX;
    const by=rift.endY;
    const abX=bx-ax;
    const abY=by-ay;
    const lengthSquared=abX*abX+abY*abY||1;
    const projection=Math.max(0,Math.min(1,((x-ax)*abX+(y-ay)*abY)/lengthSquared));
    const px=ax+abX*projection;
    const py=ay+abY*projection;
    return Math.hypot(x-px,y-py);
  }

  function rotateRealityVelocity(entity,angle){
    const vx=Number(entity.vx)||0;
    const vy=Number(entity.vy)||0;
    const cosine=Math.cos(angle);
    const sine=Math.sin(angle);
    entity.vx=vx*cosine-vy*sine;
    entity.vy=vx*sine+vy*cosine;
  }

  function splitProjectilesAtRift(rift){
    if(rift.splitCount>=REALITY_ZIPPER_CONFIG.projectileSplitLimit)return;
    const arrays=[
      state.entities.bullets,
      state.entities.napalmShots,
      state.entities.bossFireballs,
      state.entities.serpentProjectiles,
      state.entities.bossProjectiles,
    ];
    for(const array of arrays){
      const initialLength=array.length;
      for(let index=0;index<initialLength&&rift.splitCount<REALITY_ZIPPER_CONFIG.projectileSplitLimit;index++){
        const projectile=array[index];
        if(!Number.isFinite(projectile?.x)||!Number.isFinite(projectile?.y)||!Number.isFinite(projectile?.vx)||!Number.isFinite(projectile?.vy))continue;
        if(projectile.realitySplitId===rift.id)continue;
        if(distanceToRealityRift(rift,projectile.x,projectile.y)>2.2)continue;
        const clone={...projectile};
        projectile.realitySplitId=rift.id;
        clone.realitySplitId=rift.id;
        rotateRealityVelocity(projectile,REALITY_ZIPPER_CONFIG.splitAngle);
        rotateRealityVelocity(clone,-REALITY_ZIPPER_CONFIG.splitAngle);
        clone.x=nearestPixel(clone.x+rift.normalX*2);
        clone.y=nearestPixel(clone.y+rift.normalY*2);
        array.push(clone);
        rift.splitCount++;
        spawnRealitySparks(projectile.x,projectile.y,10,rift.normalX,rift.normalY);
      }
    }
  }

  function pulseRealityField(rift){
    const polarity=Math.floor(rift.age/REALITY_ZIPPER_CONFIG.pulseInterval)%2===0?1:-1;
    const radius=REALITY_ZIPPER_CONFIG.fieldRadius;
    const force=REALITY_ZIPPER_CONFIG.gravityForce*polarity;

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(enemy.hp<=0||distanceToRealityRift(rift,enemy.x,enemy.y)>radius)continue;
        enemy.hp-=REALITY_ZIPPER_CONFIG.enemyDamagePerPulse;
        enemy.hit=Math.max(enemy.hit??0,5);
        enemy.vx=(enemy.vx??0)+rift.normalX*force;
        enemy.vy=(enemy.vy??0)-force*1.4+rift.normalY*force*.4;
      }
    }
    for(const boss of state.entities.bosses){
      if(boss.hp<=0||distanceToRealityRift(rift,boss.x,boss.y)>radius+4)continue;
      boss.hp-=REALITY_ZIPPER_CONFIG.bossDamagePerPulse;
      boss.hit=Math.max(boss.hit??0,4);
      boss.vx=(boss.vx??0)+rift.normalX*force*.45;
      boss.vy=(boss.vy??0)-force*.55;
    }

    if(!state.player.locked&&distanceToRealityRift(rift,state.player.x,state.player.y-2)<radius*.62){
      state.player.vx+=rift.normalX*force*.45;
      state.player.vy-=force*.8;
    }

    const affectedArrays=[
      state.entities.bullets,state.entities.napalmShots,state.entities.glaives,state.entities.grenades,
      state.entities.nyanCats,state.entities.seedParticles,state.entities.pickups,
      state.entities.bossFireballs,state.entities.serpentProjectiles,state.entities.bossProjectiles,
    ];
    for(const array of affectedArrays){
      for(const entity of array){
        if(!Number.isFinite(entity?.x)||!Number.isFinite(entity?.y)||distanceToRealityRift(rift,entity.x,entity.y)>radius)continue;
        entity.vx=(entity.vx??0)+rift.normalX*force*.75;
        entity.vy=(entity.vy??0)-force;
      }
    }

    const point=rift.points?.[(Math.floor(rift.age/REALITY_ZIPPER_CONFIG.pulseInterval)*7)%(rift.points?.length||1)]??{x:rift.startX,y:rift.startY};
    spawnRealitySparks(point.x,point.y,REALITY_ZIPPER_CONFIG.pulseSparkCount,rift.normalX,rift.normalY);
  }

  function updateRealitySparks(){
    for(let index=state.entities.realitySparks.length-1;index>=0;index--){
      const spark=state.entities.realitySparks[index];
      spark.phase=(spark.phase??0)+.42;
      spark.x+=spark.vx+Math.sin(spark.phase)*.08;
      spark.y+=spark.vy+Math.cos(spark.phase*.77)*.08;
      spark.vx*=.965;
      spark.vy*=.965;
      spark.life--;
      if(spark.life<=0)state.entities.realitySparks.splice(index,1);
    }
  }

  function closeRealityRifts(){
    for(const rift of state.entities.realityRifts)restoreRealityRift(rift);
    state.entities.realityRifts.length=0;
    state.realityZipper.active=false;
    state.realityZipper.phase='idle';
  }

  function updateRealityRifts(){
    const rifts=state.entities.realityRifts;
    for(let index=rifts.length-1;index>=0;index--){
      const rift=rifts[index];
      rift.age++;
      rift.life--;
      if(!rift.applied)openRealityRift(rift);
      if(rift.age>=REALITY_ZIPPER_CONFIG.openingFrames&&rift.life>REALITY_ZIPPER_CONFIG.closingFrames){
        rift.phase='open';
      }
      if(rift.life<=REALITY_ZIPPER_CONFIG.closingFrames){
        rift.phase='closing';
        restoreRealityRift(rift);
      }
      if(rift.phase!=='closing'){
        splitProjectilesAtRift(rift);
        if(rift.age%REALITY_ZIPPER_CONFIG.pulseInterval===0)pulseRealityField(rift);
      }
      rift.pulse=(rift.pulse??0)+.18;
      if(rift.life<=0){
        restoreRealityRift(rift);
        rifts.splice(index,1);
      }
    }
    state.realityZipper.active=rifts.length>0;
    state.realityZipper.phase=rifts[0]?.phase??'idle';
    updateRealitySparks();
  }

  function updateExplosionEffects(){
    const effects=state.entities.explosions;
    for(let i=effects.length-1;i>=0;i--){
      effects[i].frames--;
      if(effects[i].frames<=0)effects.splice(i,1);
    }
  }

  function ensureGlaiveIsClear(blade){
    if(!cells.isSolid(cells.getCell(blade.x,blade.y)))return;
    const awayX=-Math.sign(blade.vx||1);
    const awayY=-Math.sign(blade.vy||0);
    const candidates=[
      [blade.x+awayX,blade.y],
      [blade.x,blade.y+awayY],
      [blade.x+awayX,blade.y+awayY],
      [blade.x-awayX,blade.y],
      [blade.x,blade.y-awayY],
      [blade.x-1,blade.y],[blade.x+1,blade.y],[blade.x,blade.y-1],[blade.x,blade.y+1],
    ];
    for(const [x,y] of candidates){
      if(!chunks.isActiveWorldPosition(x,y)||cells.isSolid(cells.getCell(x,y)))continue;
      placeOnPixel(blade,x,y);
      return;
    }
  }

  function snapProjectilePositions(){
    for(const key of ['napalmShots','bullets','glaives','grenades','drones','droneRockets','nyanCats','nyanSparks','realitySparks','explosions']){
      for(const entity of state.entities[key]){
        snapPixelPosition(entity);
        snapStoredCoordinates(entity,['targetX','targetY','entryX','entryY','exitX','exitY']);
        if(key==='glaives')ensureGlaiveIsClear(entity);
      }
    }
  }

  function update(){
    updateNapalmShots();
    updateBullets();
    updateGlaives();
    updateGrenades();
    updateDrones();
    updateDroneRockets();
    updateNyanCats();
    updateNyanSparks();
    updateRealityRifts();
    updateExplosionEffects();
    snapProjectilePositions();
  }

  return { update, explodeGrenade, explodeDroneRocket, explodeNyanCat, updateRealityRifts, closeRealityRifts };
}

Object.assign(exports,{createProjectileSystem});

};

__modules["src/systems/enemy-system.js"]=function(exports,__require){
const { MaterialId } = __require("src/data/materials.db.js");
const { STEAM_CONFIG, ENEMY_BEHAVIOR_CONFIG } = __require("src/config.js");
const { faunaById, faunaBehaviors, INVADER_SPECIES_BY_DIMENSION } = __require("src/data/fauna.db.js");
const { WEAPON_DB } = __require("src/data/weapons.db.js");
const { DIMENSION_IDS, dimensionDefinition } = __require("src/data/dimensions.db.js");
const { nearestPixel } = __require("src/pixel-grid.js");
const { furnitureSolidAt } = __require("src/data/furniture.db.js");
const VOLCANIC_FAUNA=new Set([
  'ember_lizard','ash_beetle','magma_moth','cinder_imp','fire_bat',
  'lava_crab','ash_crawler','obsidian_scarab','ember_raider',
]);

function createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud,juice=null){
  const M=MaterialId;
  const C=ENEMY_BEHAVIOR_CONFIG;

  function legacySpecies(enemy){
    return{
      id:'legacy_wisp',name:'cave wisp',temperament:'hostile',movement:'flying',habitat:'cave_air',
      hp:enemy.maxHp??30,contactDamage:5,speed:.35,aggroRange:48,fleeRange:0,
      width:3,height:3,hitRadius:2,animationRate:8,sprite:'wisp',palette:[[195,65,100],[255,170,190],[84,34,60]],loot:[],behaviors:[],
    };
  }

  function speciesOf(enemy){ return faunaById(enemy.speciesId)??legacySpecies(enemy); }
  function behaviorsOf(species){ return faunaBehaviors(species); }
  function hasBehavior(species,name){ return behaviorsOf(species).includes(name); }

  function randomAt(x,y,salt){
    const sampled=noise?.randomAt?.(x,y,salt);
    if(Number.isFinite(sampled))return sampled;
    const raw=Math.sin((Number(x)||0)*12.9898+(Number(y)||0)*78.233+(Number(salt)||0)*37.719)*43758.5453;
    return raw-Math.floor(raw);
  }

  function randomInt(min,max,x,y,salt){
    return min+Math.floor(randomAt(x,y,salt)*(max-min+1));
  }

  function creatureAt(species,x,y,salt=state.frame,extra={}){
    return{
      speciesId:species.id,x:nearestPixel(x),y:nearestPixel(y),vx:0,vy:0,moveCarryX:0,moveCarryY:0,
      hp:species.hp,maxHp:species.hp,phase:randomAt(x,y,salt)*Math.PI*2,
      animationOffset:Math.floor(randomAt(y,x,salt+1)*240),facing:randomAt(x,y,salt+2)<.5?-1:1,
      hit:0,burning:0,attackCooldown:0,hopCooldown:20+Math.floor(randomAt(x,y,salt+3)*90),
      idleTimer:20+Math.floor(randomAt(y,x,salt+4)*120),startled:0,
      nestTimer:randomInt(Math.floor(C.nestBuildFrames*.65),C.nestBuildFrames,x,y,salt+5),
      burrowCooldown:randomInt(30,C.burrowCooldownFrames,x,y,salt+6),
      theftCooldown:0,
      ...extra,
    };
  }

  function spawnCreature(speciesId,x,y,extra={}){
    const species=faunaById(speciesId);
    if(!species)return null;
    const chunk=chunks.getChunk(chunks.chunkX(x),chunks.chunkY(y),true);
    const enemy=creatureAt(species,x,y,state.frame+chunk.enemies.length*17,extra);
    chunk.enemies.push(enemy);
    chunk.saveEnemies=true;
    return enemy;
  }

  function dropLoot(enemy,species){
    let dropped=0;
    for(let index=0;index<(species.loot?.length??0);index++){
      const [lootId,min,max,chance]=species.loot[index];
      if(randomAt(enemy.x+index,enemy.y,state.frame+8101+index)>(chance??1))continue;
      const amount=randomInt(min,max,enemy.y,enemy.x,state.frame+8201+index);
      if(amount<=0)continue;
      crops.spawnLootPickup(lootId,enemy.x+(index%3)-1,enemy.y,amount,1.35);
      dropped+=amount;
    }
    if(dropped>0&&(species.spawnWeight??1)<.32)hud.showMessage(`${species.name} dropped rare loot`,850);
  }

  function isWater(type){ return type===M.WATER; }
  function blockedAt(x,y){ return cells.isSolid(cells.getCell(x,y))||furnitureSolidAt(state.entities.furniture,x,y,state.world.dimension); }

  function canOccupy(enemy,species,x,y){
    if(!chunks.isActiveWorldPosition(x,y))return false;
    const type=cells.getCell(x,y);
    if(enemy.burrowed)return cells.isSolid(type)&&type!==M.LAVA;
    if(species.movement==='swimming')return isWater(type);
    if(species.movement==='flying')return !blockedAt(x,y)&&type!==M.WATER&&type!==M.LAVA;
    return !blockedAt(x,y)&&type!==M.LAVA;
  }

  function onGround(enemy){ return blockedAt(enemy.x,enemy.y+1); }

  function moveHorizontal(enemy,species,pixels){
    const direction=Math.sign(pixels);
    let collided=false;
    for(let step=0;step<Math.abs(pixels);step++){
      const nextX=enemy.x+direction;
      if(canOccupy(enemy,species,nextX,enemy.y)){
        enemy.x=nextX;
        continue;
      }
      if(enemy.burrowed){
        for(const offset of [1,-1,2,-2]){
          if(canOccupy(enemy,species,nextX,enemy.y+offset)){
            enemy.x=nextX;
            enemy.y+=offset;
            break;
          }
        }
        if(enemy.x===nextX)continue;
      }
      if(!['flying','swimming'].includes(species.movement)&&canOccupy(enemy,species,nextX,enemy.y-1)&&!blockedAt(nextX,enemy.y)){
        enemy.x=nextX;
        enemy.y--;
        continue;
      }
      collided=true;
      enemy.wallDirection=direction;
      enemy.vx*=-.45;
      enemy.moveCarryX=0;
      if(!hasBehavior(species,'wall_climber'))enemy.facing*=-1;
      break;
    }
    return collided;
  }

  function moveVertical(enemy,species,pixels){
    const direction=Math.sign(pixels);
    let collided=false;
    for(let step=0;step<Math.abs(pixels);step++){
      const nextY=enemy.y+direction;
      if(canOccupy(enemy,species,enemy.x,nextY)){
        enemy.y=nextY;
        continue;
      }
      collided=true;
      enemy.vy*=-(['flying','swimming'].includes(species.movement)?.6:.2);
      enemy.moveCarryY=0;
      break;
    }
    return collided;
  }

  function consumeMotion(enemy,species){
    enemy.moveCarryX=(enemy.moveCarryX??0)+enemy.vx;
    enemy.moveCarryY=(enemy.moveCarryY??0)+enemy.vy;
    const pixelsX=Math.trunc(enemy.moveCarryX);
    const pixelsY=Math.trunc(enemy.moveCarryY);
    enemy.moveCarryX-=pixelsX;
    enemy.moveCarryY-=pixelsY;
    const wallHit=moveHorizontal(enemy,species,pixelsX);
    const verticalHit=moveVertical(enemy,species,pixelsY);
    enemy.x=nearestPixel(enemy.x);
    enemy.y=nearestPixel(enemy.y);
    return{wallHit,verticalHit};
  }

  function wanderDirection(enemy){
    if((enemy.idleTimer??0)>0){ enemy.idleTimer--; return enemy.wanderDirection??enemy.facing??1; }
    enemy.idleTimer=35+Math.floor(randomAt(enemy.x,enemy.y,state.frame+8301)*130);
    enemy.wanderDirection=randomAt(enemy.y,enemy.x,state.frame+8302)<.5?-1:1;
    return enemy.wanderDirection;
  }

  function packContext(enemy,species,enemies){
    if(!hasBehavior(species,'pack_hunter'))return{count:1,centerX:enemy.x,centerY:enemy.y,speedMultiplier:1,flankOffset:0};
    let count=0;
    let centerX=0;
    let centerY=0;
    for(const ally of enemies){
      if(ally===enemy||ally.speciesId!==enemy.speciesId||ally.hp<=0)continue;
      if(Math.hypot(ally.x-enemy.x,ally.y-enemy.y)>C.packRadius)continue;
      count++;
      centerX+=ally.x;
      centerY+=ally.y;
    }
    count++;
    centerX=(centerX+enemy.x)/count;
    centerY=(centerY+enemy.y)/count;
    const bonus=Math.min(C.packMaxSpeedBonus,Math.max(0,count-1)*C.packSpeedBonusPerAlly);
    const side=((enemy.animationOffset??0)%2===0?1:-1);
    enemy.packCount=count;
    return{count,centerX,centerY,speedMultiplier:1+bonus,flankOffset:side*C.packFlankDistance};
  }

  function nearestPickup(enemy){
    let best=null;
    let bestDistance=C.scavengerSenseRadius;
    for(const pickup of state.entities.pickups){
      if((pickup.life??1)<=0)continue;
      const distance=Math.hypot(pickup.x-enemy.x,pickup.y-enemy.y);
      if(distance<bestDistance){ best=pickup; bestDistance=distance; }
    }
    return best?{pickup:best,distance:bestDistance}:null;
  }

  function consumePickup(enemy,species,pickup){
    const index=state.entities.pickups.indexOf(pickup);
    if(index<0)return false;
    state.entities.pickups.splice(index,1);
    const amount=Math.max(1,pickup.amount??1);
    enemy.hp=Math.min(enemy.maxHp,enemy.hp+C.scavengerHealPerItem*amount);
    enemy.fedLevel=Math.min(6,(enemy.fedLevel??0)+1);
    enemy.maxHp+=enemy.fedLevel%2===0?1:0;
    juice?.burst?.(enemy.x,enemy.y-1,{colors:['rgb(245,220,126)','rgb(255,255,228)'],count:6,speedMin:.1,speedMax:.45,gravity:-.02,lifeMin:8,lifeMax:18});
    if(Math.hypot(state.player.x-enemy.x,state.player.y-enemy.y)<28)hud.showMessage(`${species.name} ate a dropped item`,650);
    return true;
  }

  function updateGround(enemy,species,dx,dy,distance,enemies){
    const grounded=onGround(enemy);
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let direction=wanderDirection(enemy);
    let targetSpeed=species.speed*.42;

    const scavenging=hasBehavior(species,'scavenger')?nearestPickup(enemy):null;
    if(scavenging&&(!hostile||distance>11)){
      const pickupDx=scavenging.pickup.x-enemy.x;
      direction=Math.sign(pickupDx)||direction;
      targetSpeed=species.speed*.82;
      enemy.scavenging=true;
      if(scavenging.distance<2.3)consumePickup(enemy,species,scavenging.pickup);
    }else{
      enemy.scavenging=false;
      if(hostile&&distance<species.aggroRange){
        const targetX=state.player.x+(pack.count>1&&distance<18?pack.flankOffset:0);
        direction=Math.sign(targetX-enemy.x)||enemy.facing;
        targetSpeed=species.speed*pack.speedMultiplier;
      }else if(!hostile&&distance<species.fleeRange){
        direction=-Math.sign(dx)||enemy.facing;
        targetSpeed=species.speed*1.15;
        enemy.startled=30;
      }
    }

    if(species.movement==='charger'&&hostile&&distance<18){
      enemy.chargeTimer=(enemy.chargeTimer??0)-1;
      if(enemy.chargeTimer<=0){
        enemy.chargeTimer=70;
        enemy.vx=direction*species.speed*2.2;
      }
    }

    enemy.facing=direction||enemy.facing||1;
    enemy.vx+=(direction*targetSpeed-enemy.vx)*.18;
    enemy.vx*=grounded?.82:.95;

    const hopper=species.movement==='hopper';
    enemy.hopCooldown=(enemy.hopCooldown??0)-1;
    if(grounded&&enemy.hopCooldown<=0&&hopper){
      enemy.vy=-.82;
      enemy.hopCooldown=35+Math.floor(randomAt(enemy.x,enemy.y,state.frame+8401)*75);
    }

    if(hasBehavior(species,'wall_climber')){
      const wallDirection=Math.sign(direction)||enemy.facing||1;
      const wallSolid=blockedAt(enemy.x+wallDirection,enemy.y);
      const verticalDirection=Math.sign(dy)||-1;
      if(wallSolid&&!blockedAt(enemy.x,enemy.y+verticalDirection)){
        enemy.climbing=true;
        enemy.facing=wallDirection;
        enemy.vx=wallDirection*.06;
        enemy.vy+=(verticalDirection*species.speed*.9-enemy.vy)*.35;
      }else if(enemy.climbing&&blockedAt(enemy.x+enemy.facing,enemy.y)){
        enemy.vx=enemy.facing*.05;
        enemy.vy+=(verticalDirection*species.speed*.8-enemy.vy)*.28;
      }else enemy.climbing=false;
    }

    if(!enemy.climbing)enemy.vy=Math.min(1.2,(enemy.vy??0)+.09);
  }

  function updateFlying(enemy,species,dx,dy,distance,enemies){
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let directionX=Math.sin(enemy.phase*.73);
    let directionY=Math.cos(enemy.phase*1.17)*.55;
    let speed=species.speed*.55;

    if(hostile&&distance<species.aggroRange){
      const targetX=state.player.x+(pack.count>1?pack.flankOffset:0);
      directionX=(targetX-enemy.x)/Math.max(1,distance);
      directionY=dy/distance;
      speed=species.speed*pack.speedMultiplier;
    }else if(!hostile&&distance<species.fleeRange){
      directionX=-dx/distance;
      directionY=-dy/distance;
      speed=species.speed*1.1;
      enemy.startled=30;
    }

    enemy.facing=Math.sign(directionX)||enemy.facing||1;
    enemy.vx+=(directionX*speed-enemy.vx)*.12;
    enemy.vy+=(directionY*speed-enemy.vy)*.12;
    enemy.vx*=.94;
    enemy.vy*=.94;
  }

  function updateSwimming(enemy,species,dx,dy,distance,enemies){
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let directionX=Math.sin(enemy.phase*.61);
    let directionY=Math.cos(enemy.phase*.83)*.45;
    let speed=species.speed*.55;

    if(hostile&&distance<species.aggroRange){
      directionX=dx/distance;
      directionY=dy/distance;
      speed=species.speed*pack.speedMultiplier;
    }else if(!hostile&&distance<species.fleeRange){
      directionX=-dx/distance;
      directionY=-dy/distance;
      speed=species.speed*1.15;
      enemy.startled=30;
    }

    enemy.facing=Math.sign(directionX)||enemy.facing||1;
    enemy.vx+=(directionX*speed-enemy.vx)*.16;
    enemy.vy+=(directionY*speed-enemy.vy)*.16;
    enemy.vx*=.92;
    enemy.vy*=.92;
  }

  function findBurrowCell(enemy){
    for(let depth=1;depth<=4;depth++){
      const y=enemy.y+depth;
      const type=cells.getCell(enemy.x,y);
      if(cells.isSolid(type)&&type!==M.LAVA)return y;
    }
    return null;
  }

  function emergeBurrower(enemy){
    for(let rise=1;rise<=10;rise++){
      const candidateY=enemy.y-rise;
      if(cells.isSolid(cells.getCell(enemy.x,candidateY)))continue;
      if(cells.isSolid(cells.getCell(enemy.x,candidateY+1))){
        enemy.y=candidateY;
        enemy.burrowed=false;
        enemy.hidden=false;
        enemy.vy=-.55;
        enemy.burrowCooldown=C.burrowCooldownFrames;
        juice?.burst?.(enemy.x,enemy.y,{colors:['rgb(128,91,57)','rgb(190,147,91)','rgb(72,59,49)'],count:12,speedMin:.18,speedMax:.8,gravity:.08,lifeMin:10,lifeMax:26});
        return true;
      }
    }
    return false;
  }

  function updateBurrower(enemy,species,dx,distance){
    enemy.burrowCooldown=Math.max(0,(enemy.burrowCooldown??0)-1);
    if(enemy.burrowed){
      enemy.hidden=true;
      enemy.burrowTimer--;
      enemy.facing=Math.sign(dx)||enemy.facing||1;
      enemy.vx+=(enemy.facing*species.speed*1.18-enemy.vx)*.22;
      enemy.vy*=.3;
      if(distance<=C.burrowEmergeDistance||enemy.burrowTimer<=0)emergeBurrower(enemy);
      return true;
    }
    if(distance<species.aggroRange&&distance>C.burrowEmergeDistance+2&&enemy.burrowCooldown<=0&&onGround(enemy)){
      const burrowY=findBurrowCell(enemy);
      if(burrowY!==null){
        enemy.y=burrowY;
        enemy.burrowed=true;
        enemy.hidden=true;
        enemy.burrowTimer=randomInt(C.burrowDurationMin,C.burrowDurationMax,enemy.x,enemy.y,state.frame+8411);
        enemy.vy=0;
        juice?.burst?.(enemy.x,enemy.y-1,{colors:['rgb(128,91,57)','rgb(190,147,91)'],count:8,speedMin:.15,speedMax:.65,gravity:.08,lifeMin:9,lifeMax:20});
        return true;
      }
    }
    return false;
  }

  function updateMimic(enemy,species,distance){
    if(!hasBehavior(species,'mimic'))return false;
    if(enemy.mimicAwake===undefined)enemy.mimicAwake=false;
    if(!enemy.mimicAwake){
      enemy.hidden=true;
      enemy.disguised=true;
      enemy.vx=0;
      enemy.vy=0;
      if(distance<9||enemy.hit>0||enemy.burning>0){
        enemy.mimicAwake=true;
        enemy.hidden=false;
        enemy.disguised=false;
        enemy.vy=-.62;
        juice?.shockwave?.(enemy.x,enemy.y,'rgb(197,116,72)',8,10);
        juice?.burst?.(enemy.x,enemy.y-2,{colors:['rgb(123,79,43)','rgb(219,155,78)','rgb(245,228,170)'],count:16,speedMin:.2,speedMax:.95,gravity:.06,lifeMin:12,lifeMax:28});
        hud.showMessage(`${species.name} awakened`,750);
      }
      return !enemy.mimicAwake;
    }
    enemy.hidden=false;
    enemy.disguised=false;
    return false;
  }

  function buildNest(enemy,species,distance){
    if(!hasBehavior(species,'nest_builder'))return;
    enemy.nestTimer=(enemy.nestTimer??C.nestBuildFrames)-1;
    if(enemy.nestTimer>0||distance<22||!onGround(enemy)||state.entities.enemyNests.length>=C.maxNests)return;
    if(state.entities.enemyNests.some(nest=>Math.hypot(nest.x-enemy.x,nest.y-enemy.y)<18)){
      enemy.nestTimer=Math.floor(C.nestBuildFrames*.6);
      return;
    }
    state.entities.enemyNests.push({
      id:`nest-${state.world.dimension}-${state.frame}-${enemy.animationOffset??0}`,
      x:nearestPixel(enemy.x),y:nearestPixel(enemy.y),speciesId:species.id,
      hp:34,maxHp:34,life:C.nestLifeFrames,spawnTimer:C.nestSpawnFrames,
      phase:randomAt(enemy.x,enemy.y,state.frame+8501)*Math.PI*2,
    });
    enemy.nestTimer=C.nestBuildFrames;
    juice?.burst?.(enemy.x,enemy.y,{colors:['rgb(161,126,82)','rgb(221,199,145)','rgb(91,69,50)'],count:10,speedMin:.1,speedMax:.55,gravity:.06,lifeMin:12,lifeMax:26});
  }

  function validSpawnNear(x,y,species){
    for(let radius=1;radius<=C.nestSpawnRadius;radius++){
      for(const direction of [-1,1]){
        const px=nearestPixel(x+radius*direction);
        for(let py=nearestPixel(y-5);py<=nearestPixel(y+3);py++){
          if(!chunks.isActiveWorldPosition(px,py))continue;
          if(species.movement==='flying'){
            if(!cells.isSolid(cells.getCell(px,py))&&cells.getCell(px,py)!==M.WATER)return{x:px,y:py};
          }else if(species.movement==='swimming'){
            if(cells.getCell(px,py)===M.WATER)return{x:px,y:py};
          }else if(!cells.isSolid(cells.getCell(px,py))&&cells.isSolid(cells.getCell(px,py+1))){
            return{x:px,y:py};
          }
        }
      }
    }
    return null;
  }

  function activeEnemyCount(){
    let count=0;
    for(const chunk of state.world.activeChunks)count+=chunk.enemies.length;
    return count;
  }

  function updateNests(){
    const nests=state.entities.enemyNests;
    for(let i=nests.length-1;i>=0;i--){
      const nest=nests[i];
      if(!chunks.isActiveWorldPosition(nest.x,nest.y))continue;
      nest.life--;
      nest.phase=(nest.phase??0)+.025;
      if(nest.life<=0||nest.hp<=0||!cells.isSolid(cells.getCell(nest.x,nest.y+1))){
        if(nest.hp<=0)juice?.enemyDeath?.(nest.x,nest.y,'rgb(177,132,83)');
        nests.splice(i,1);
        continue;
      }
      nest.spawnTimer--;
      if(nest.spawnTimer>0||activeEnemyCount()>=C.nestEnemyCap)continue;
      const species=faunaById(nest.speciesId);
      if(!species){ nests.splice(i,1); continue; }
      const position=validSpawnNear(nest.x,nest.y,species);
      if(position){
        spawnCreature(species.id,position.x,position.y,{fromNest:true,nestTimer:C.nestBuildFrames});
        juice?.burst?.(position.x,position.y,{colors:['rgb(225,202,153)','rgb(145,104,70)'],count:8,speedMin:.12,speedMax:.45,gravity:.03,lifeMin:10,lifeMax:20});
      }
      nest.spawnTimer=C.nestSpawnFrames+randomInt(-120,180,nest.x,nest.y,state.frame+8511);
    }
  }

  function returnStolenWeapon(enemy,quiet=false){
    if(!Number.isInteger(enemy?.stolenWeaponId))return false;
    if(state.player.stolenWeaponId===enemy.stolenWeaponId)state.player.stolenWeaponId=null;
    if(!quiet)hud.showMessage('Stolen weapon recovered',900);
    enemy.stolenWeaponId=null;
    return true;
  }

  function nextAvailableWeapon(current){
    const count=WEAPON_DB.length;
    for(let offset=1;offset<=count;offset++){
      const candidate=(current+offset)%count;
      if(candidate!==state.player.stolenWeaponId)return candidate;
    }
    return 0;
  }

  function stealWeapon(enemy,species){
    if(!hasBehavior(species,'weapon_thief'))return false;
    if(Number.isInteger(state.player.stolenWeaponId)||state.player.weaponTheftCooldown>0||Number.isInteger(enemy.stolenWeaponId))return false;
    enemy.stolenWeaponId=state.weaponId;
    state.player.stolenWeaponId=state.weaponId;
    state.player.weaponTheftCooldown=C.weaponTheftCooldown;
    state.weaponId=nextAvailableWeapon(state.weaponId);
    enemy.fleeingWithWeapon=true;
    enemy.startled=180;
    juice?.worldFlash?.(enemy.x,enemy.y-2,'rgb(255,220,91)',6,7);
    hud.showMessage(`${species.name} stole your weapon!`,1200);
    hud.update();
    return true;
  }

  function attachParasite(enemy,species,chunk,index){
    if(!hasBehavior(species,'parasite')||(enemy.attachCooldown??0)>0)return false;
    const attached=state.player.attachedParasites??(state.player.attachedParasites=[]);
    if(attached.length>=C.parasiteMaxAttached)return false;
    attached.push({speciesId:species.id,life:C.parasiteLifeFrames,phase:enemy.phase??0,damageTimer:C.parasiteDamageInterval,shake:0});
    chunk.enemies.splice(index,1);
    chunk.saveEnemies=true;
    juice?.burst?.(state.player.x,state.player.y-2,{colors:['rgb(255,70,190)','rgb(95,255,214)'],count:8,speedMin:.12,speedMax:.52,gravity:-.01,lifeMin:10,lifeMax:20});
    hud.showMessage(`${species.name} latched on — move and jump to shake it off`,1100);
    return true;
  }

  function updateAttachedParasites(){
    const attached=state.player.attachedParasites??(state.player.attachedParasites=[]);
    state.player.weaponTheftCooldown=Math.max(0,(state.player.weaponTheftCooldown??0)-1);
    for(let i=attached.length-1;i>=0;i--){
      const parasite=attached[i];
      parasite.life--;
      parasite.phase=(parasite.phase??0)+.18;
      parasite.damageTimer=(parasite.damageTimer??C.parasiteDamageInterval)-1;
      parasite.shake=(parasite.shake??0)+Math.abs(state.player.vx)*.28+Math.abs(state.player.vy)*.18;
      if(parasite.damageTimer<=0){
        playerSystem.damage(C.parasiteDamage);
        parasite.damageTimer=C.parasiteDamageInterval;
        juice?.impact?.(state.player.x,state.player.y-2,{kind:'parasite',damage:C.parasiteDamage,color:'rgb(255,72,190)'});
      }
      if(parasite.life<=0||parasite.shake>=42){
        const species=faunaById(parasite.speciesId);
        attached.splice(i,1);
        if(species){
          spawnCreature(species.id,state.player.x-state.player.facing*4,state.player.y-3,{hp:Math.max(1,Math.floor(species.hp*.45)),startled:120,vx:-state.player.facing*.8,attachCooldown:180});
        }
        juice?.burst?.(state.player.x,state.player.y-2,{colors:['rgb(255,87,191)','rgb(91,250,218)'],count:10,speedMin:.18,speedMax:.8,gravity:.03,lifeMin:10,lifeMax:24});
        hud.showMessage('Parasite shaken off',700);
      }
    }
    state.player.parasiteSlowMultiplier=Math.max(C.parasiteMinimumSpeedMultiplier,1-attached.length*C.parasiteSlowPerAttachment);
  }

  function invasionPosition(x,y){
    for(let radius=0;radius<=10;radius++){
      for(const direction of [1,-1]){
        const px=nearestPixel(x+radius*direction);
        for(let py=nearestPixel(y-8);py<=nearestPixel(y+6);py++){
          if(!chunks.isActiveWorldPosition(px,py))continue;
          if(!cells.isSolid(cells.getCell(px,py))&&!cells.isSolid(cells.getCell(px,py-1)))return{x:px,y:py};
        }
      }
    }
    return{x:nearestPixel(x),y:nearestPixel(y)};
  }

  function openInvasionPortal(sourceDimension,x=state.player.x+32,y=state.player.y-4,{waveSize=null}={}){
    if(state.entities.invasionPortals.length>=C.maxInvasionPortals)return null;
    const position=invasionPosition(x,y);
    const definition=dimensionDefinition(sourceDimension);
    const portal={
      id:`invasion-${state.world.invasionSerial??1}`,
      x:position.x,y:position.y,sourceDimension:definition.id,age:0,
      life:C.invasionPortalLifeFrames,spawnTimer:C.invasionPortalOpenFrames,
      waveSize:waveSize??randomInt(C.invasionPortalWaveMin,C.invasionPortalWaveMax,position.x,position.y,state.frame+8601),
      spawned:0,phase:randomAt(position.x,position.y,state.frame+8602)*Math.PI*2,
    };
    state.world.invasionSerial=(state.world.invasionSerial??1)+1;
    state.entities.invasionPortals.push(portal);
    juice?.shockwave?.(portal.x,portal.y,definition.portalColors?.[1]??'rgb(190,90,255)',13,18);
    juice?.screenFlash?.('rgba(180,70,255,.13)',5);
    hud.showMessage(`Unstable ${definition.name} rift detected`,1200);
    return portal;
  }

  function scheduleNextInvasion({initial=false}={}){
    const minFrames=initial?C.invasionPortalInitialMinFrames:C.invasionPortalMinFrames;
    const maxFrames=initial?C.invasionPortalInitialMaxFrames:C.invasionPortalMaxFrames;
    state.world.nextInvasionFrame=state.frame+randomInt(minFrames,maxFrames,state.player.x,state.player.y,state.frame+8611);
  }

  function maybeOpenInvasion(){
    if(!Number.isFinite(state.world.nextInvasionFrame))scheduleNextInvasion({initial:(state.world.invasionCount??0)===0});
    if(state.frame<state.world.nextInvasionFrame||state.entities.invasionPortals.length>=C.maxInvasionPortals||state.player.skySpawn||state.player.locked)return;
    const current=state.world.dimension??'earth';
    const choices=DIMENSION_IDS.filter(id=>id!==current);
    const source=choices[Math.floor(randomAt(state.player.x,state.player.y,state.frame+8621)*choices.length)]??'static';
    const side=randomAt(state.player.y,state.player.x,state.frame+8622)<.5?-1:1;
    const portal=openInvasionPortal(source,state.player.x+side*randomInt(25,42,state.player.x,state.player.y,state.frame+8623),state.player.y-3);
    if(portal)state.world.invasionCount=(state.world.invasionCount??0)+1;
    scheduleNextInvasion();
  }

  function updateInvasionPortals(){
    maybeOpenInvasion();
    for(let i=state.entities.invasionPortals.length-1;i>=0;i--){
      const portal=state.entities.invasionPortals[i];
      portal.age++;
      portal.life--;
      portal.phase+=.08;
      portal.spawnTimer--;
      if(portal.spawnTimer<=0&&portal.spawned<Math.min(portal.waveSize,C.maxInvadersPerPortal)){
        const choices=INVADER_SPECIES_BY_DIMENSION[portal.sourceDimension]??INVADER_SPECIES_BY_DIMENSION.static;
        const speciesId=choices[portal.spawned%choices.length];
        const species=faunaById(speciesId);
        if(species){
          const position=validSpawnNear(portal.x,portal.y,species)??{x:portal.x,y:portal.y};
          spawnCreature(speciesId,position.x,position.y,{invader:true,sourceDimension:portal.sourceDimension,startled:45});
          juice?.burst?.(position.x,position.y,{colors:dimensionDefinition(portal.sourceDimension).portalColors,count:12,speedMin:.16,speedMax:.82,gravity:.01,lifeMin:12,lifeMax:26});
        }
        portal.spawned++;
        portal.spawnTimer=C.invasionPortalSpawnInterval;
      }
      if(portal.life<=0||(portal.spawned>=portal.waveSize&&portal.age>C.invasionPortalOpenFrames+portal.waveSize*C.invasionPortalSpawnInterval+90)){
        juice?.shockwave?.(portal.x,portal.y,dimensionDefinition(portal.sourceDimension).portalColors?.[0]??'rgb(190,90,255)',8,10);
        state.entities.invasionPortals.splice(i,1);
      }
    }
  }

  function updateEnvironment(enemy,species){
    const material=cells.getCell(enemy.x,enemy.y);
    const volcanic=VOLCANIC_FAUNA.has(species.id);
    if(material===M.LAVA&&!volcanic)enemy.hp-=.45;
    if(material===M.FIRE&&!volcanic){
      enemy.hp-=.24;
      enemy.burning=Math.max(enemy.burning,100);
    }
    if(material===M.STEAM)enemy.hp-=STEAM_CONFIG.enemyDamagePerFrame;
    if(species.movement==='swimming'&&!isWater(material))enemy.hp-=.06;
  }

  function update(){
    updateAttachedParasites();
    updateNests();
    updateInvasionPortals();
    const transfers=[];
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(let i=chunk.enemies.length-1;i>=0;i--){
        const enemy=chunk.enemies[i];
        const species=speciesOf(enemy);

        if(enemy.hp<=0){
          returnStolenWeapon(enemy);
          const color=species.palette?.[0]??[255,120,100];
          juice?.enemyDeath?.(enemy.x,enemy.y,`rgb(${color[0]},${color[1]},${color[2]})`);
          dropLoot(enemy,species);
          chunk.enemies.splice(i,1);
          chunk.saveEnemies=true;
          continue;
        }

        enemy.phase=(enemy.phase??0)+.04;
        enemy.age=(enemy.age??0)+1;
        if(enemy.hit>0)enemy.hit--;
        if(enemy.startled>0)enemy.startled--;
        if(enemy.attackCooldown>0)enemy.attackCooldown--;
        if(enemy.theftCooldown>0)enemy.theftCooldown--;
        if(enemy.attachCooldown>0)enemy.attachCooldown--;

        if(enemy.burning>0){
          enemy.burning--;
          if(!VOLCANIC_FAUNA.has(species.id))enemy.hp-=.16;
          if(state.frame%9===0&&cells.getCell(enemy.x,enemy.y)===M.AIR)cells.setCell(enemy.x,enemy.y,M.FIRE,30);
        }

        const dx=state.player.x-enemy.x;
        const dy=state.player.y-2-enemy.y;
        const distance=Math.hypot(dx,dy)||1;

        if(updateMimic(enemy,species,distance))continue;
        const burrowing=hasBehavior(species,'burrower')&&updateBurrower(enemy,species,dx,distance);
        if(!burrowing){
          if(species.movement==='flying')updateFlying(enemy,species,dx,dy,distance,chunk.enemies);
          else if(species.movement==='swimming')updateSwimming(enemy,species,dx,dy,distance,chunk.enemies);
          else updateGround(enemy,species,dx,dy,distance,chunk.enemies);
        }

        if(enemy.fleeingWithWeapon){
          enemy.facing=-Math.sign(dx)||enemy.facing||1;
          enemy.vx+=(enemy.facing*species.speed*1.35-enemy.vx)*.25;
          if(distance>50)enemy.fleeingWithWeapon=false;
        }

        consumeMotion(enemy,species);
        updateEnvironment(enemy,species);
        buildNest(enemy,species,distance);

        const contactRadius=(species.hitRadius??2)+1.4;
        if(!enemy.burrowed&&species.temperament==='hostile'&&distance<contactRadius&&enemy.attackCooldown<=0){
          if(attachParasite(enemy,species,chunk,i))continue;
          if(!stealWeapon(enemy,species))playerSystem.damage(species.contactDamage);
          enemy.attackCooldown=28;
        }

        const targetChunkX=chunks.chunkX(enemy.x);
        const targetChunkY=chunks.chunkY(enemy.y);
        if(targetChunkX!==chunk.x||targetChunkY!==chunk.y){
          const target=chunks.getChunk(targetChunkX,targetChunkY,false);
          if(target&&state.world.activeKeys.has(chunks.key(targetChunkX,targetChunkY))){
            chunk.enemies.splice(i,1);
            chunk.saveEnemies=true;
            target.saveEnemies=true;
            transfers.push([enemy,target]);
          }else{
            enemy.vx*=-.7;
            enemy.vy*=-.7;
          }
        }
      }
    }
    for(const [enemy,target] of transfers)target.enemies.push(enemy);
  }

  function recallStolenWeapon(){
    if(!Number.isInteger(state.player.stolenWeaponId))return false;
    for(const chunk of state.world.activeChunks)for(const enemy of chunk.enemies)if(enemy.stolenWeaponId===state.player.stolenWeaponId)enemy.stolenWeaponId=null;
    state.player.stolenWeaponId=null;
    hud.showMessage('Dimensional transit recalled your stolen weapon',900);
    return true;
  }

  return { update, speciesOf, behaviorsOf, spawnCreature, openInvasionPortal, recallStolenWeapon, updateNests, updateInvasionPortals };
}

Object.assign(exports,{createEnemySystem});

};

__modules["src/systems/boss-system.js"]=function(exports,__require){
const { WORLD_WIDTH,
  WORLD_HEIGHT,
  CALDERA_BOSS_CONFIG,
  SEA_SERPENT_CONFIG,
  STEAM_CONFIG,
  DAY_NIGHT_CONFIG, } = __require("src/config.js");
const { BIOME_REGION_SIZE, BiomeId } = __require("src/data/biomes.db.js");
const { UndergroundBiomeId } = __require("src/data/underground-biomes.db.js");
const { BossKind, BOSS_KINDS, bossDefinition } = __require("src/data/bosses.db.js");
const { bossRitualDefinition } = __require("src/data/boss-rituals.db.js");
const { WeatherType } = __require("src/data/weather.db.js");
const { MaterialId, FLAMMABLE_MATERIALS } = __require("src/data/materials.db.js");
const { playerPixelBounds } = __require("src/player-geometry.js");
const { nearestPixel, snapPixelPosition, snapStoredCoordinates } = __require("src/pixel-grid.js");
const { isEarthDimension } = __require("src/data/dimensions.db.js");
function createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem,timeSystem=null,juice=null){
  const M=MaterialId;
  const B=BiomeId;
  const U=UndergroundBiomeId;
  const K=BossKind;

  function cameraOrigin(){
    return {
      x:state.world.camera.chunkX*WORLD_WIDTH,
      y:state.world.camera.chunkY*WORLD_HEIGHT,
    };
  }

  function timeState(){
    if(timeSystem?.getTime)return timeSystem.getTime();
    const cycle=DAY_NIGHT_CONFIG.dayFrames+DAY_NIGHT_CONFIG.nightFrames;
    const frame=((state.frame%cycle)+cycle)%cycle;
    return {
      isDay:frame<DAY_NIGHT_CONFIG.dayFrames,
      nightStrength:frame<DAY_NIGHT_CONFIG.dayFrames?0:1,
    };
  }

  function encounter(kind){
    if(!state.world.bossEncounters)state.world.bossEncounters=Object.create(null);
    if(!state.world.bossEncounters[kind]){
      state.world.bossEncounters[kind]={
        spawned:false,
        defeated:false,
        regionIndex:null,
        defeatedFrame:-1,
        ritualProgress:0,
        ritualCompleted:false,
        ritualRegionIndex:null,
      };
    }
    const record=state.world.bossEncounters[kind];
    if(!Number.isFinite(record.ritualProgress))record.ritualProgress=0;
    if(typeof record.ritualCompleted!=='boolean')record.ritualCompleted=false;
    if(!('ritualRegionIndex' in record))record.ritualRegionIndex=null;
    return record;
  }

  function overlapsPlayer(boss){
    const player=state.player;
    const bounds=playerPixelBounds(player.x,player.y,player.width,player.height);
    const bossLeft=boss.x-boss.width*.5;
    const bossRight=boss.x+boss.width*.5;
    const bossTop=boss.y-boss.height*.5;
    const bossBottom=boss.y+boss.height*.5;
    return bounds.right>=bossLeft&&bounds.left<=bossRight&&bounds.bottom>=bossTop&&bounds.top<=bossBottom;
  }

  function nearestVisibleDescriptor(getDescriptor){
    const {x:originX}=cameraOrigin();
    const baseRegion=Math.floor(state.player.x/BIOME_REGION_SIZE);
    let best=null;

    for(let offset=-4;offset<=4;offset++){
      const descriptor=getDescriptor(baseRegion+offset);
      if(!descriptor)continue;
      if(descriptor.center<originX-60||descriptor.center>originX+WORLD_WIDTH+60)continue;
      const distance=Math.abs(descriptor.center-state.player.x);
      if(!best||distance<best.distance)best={distance,descriptor};
    }

    return best?.descriptor??null;
  }

  function clearBossPocket(centerX,centerY,width,height){
    const halfWidth=Math.ceil(width*.5)+2;
    const halfHeight=Math.ceil(height*.5)+2;
    for(let y=Math.floor(centerY-halfHeight);y<=Math.ceil(centerY+halfHeight);y++){
      for(let x=Math.floor(centerX-halfWidth);x<=Math.ceil(centerX+halfWidth);x++){
        const type=cells.getCell(x,y);
        if(type!==M.LAVA&&type!==M.WATER)cells.setCell(x,y,M.AIR,0,{silent:true,reason:'boss-arena'});
      }
    }
  }

  function findSurfaceHome(x,definition){
    const surface=generator.surfaceAt(Math.round(x));
    return {
      surface,
      groundY:surface.ground,
      waterY:surface.water,
      homeY:surface.ocean
        ?surface.water-definition.height*.35
        :surface.ground-definition.height*.5-1,
    };
  }

  function spawnBoss(kind,options={}){
    const definition=bossDefinition(kind);
    if(!definition||state.entities.bosses.length>0)return null;

    const {x:originX,y:originY}=cameraOrigin();
    const regionIndex=Number.isInteger(options.regionIndex)
      ?options.regionIndex
      :Math.floor(state.player.x/BIOME_REGION_SIZE);
    const homeX=Number.isFinite(options.homeX)
      ?options.homeX
      :state.player.x+(noise.randomAt(regionIndex,state.frame,8101)>.5?20:-20);
    const surfaceData=findSurfaceHome(homeX,definition);
    const groundY=Number.isFinite(options.groundY)?options.groundY:surfaceData.groundY;
    const waterY=Number.isFinite(options.waterY)?options.waterY:surfaceData.waterY;
    let homeY=Number.isFinite(options.homeY)?options.homeY:surfaceData.homeY;

    if(kind===K.CALDERA_TYRANT){
      homeY=Math.max(originY+10,groundY-CALDERA_BOSS_CONFIG.hoverHeight);
    }else if(kind===K.SEA_SERPENT){
      homeY=waterY-SEA_SERPENT_CONFIG.hoverAboveWater;
    }else if(kind===K.BOG_LEVIATHAN){
      homeY=Math.min(groundY-4,waterY-4);
    }else if(kind===K.MYCELIAL_MONARCH){
      homeY=Number.isFinite(options.homeY)?options.homeY:state.player.y-3;
    }else if(kind===K.CRYSTAL_BURROWER||kind===K.WORLD_EATER){
      homeY=Number.isFinite(options.homeY)?options.homeY:state.player.y-3;
    }else if(kind===K.MAGMA_BEHEMOTH){
      homeY=Number.isFinite(options.homeY)?options.homeY:state.player.y-6;
    }else if(kind===K.DROWNED_FLEET){
      homeY=waterY-5;
    }else if(kind===K.SKY_JELLYFISH){
      homeY=Math.max(originY+18,waterY-24);
    }else if(kind===K.STORM_ROC||kind===K.CANOPY_WYRM){
      homeY=Math.max(originY+15,groundY-18);
    }

    let x=homeX;
    let y=homeY;
    let phase='fight';
    let entryDirection=1;
    const entry=options.entry??definition.entry;

    if(entry==='above'){
      x=homeX+(noise.randomAt(regionIndex,91,8201)-.5)*20;
      y=originY-18;
      phase='arrival';
    }else if(entry==='below_water'){
      x=homeX;
      y=waterY+(kind===K.SEA_SERPENT?SEA_SERPENT_CONFIG.emergeDepth:22);
      phase='emerge';
    }else if(entry==='below_ground'||entry==='assemble'){
      x=homeX;
      y=homeY+(entry==='assemble'?13:20);
      phase=entry==='assemble'?'assemble':'emerge';
    }else if(entry==='side'){
      entryDirection=noise.randomAt(regionIndex,state.frame,8202)>.5?1:-1;
      x=entryDirection>0?originX-32:originX+WORLD_WIDTH+32;
      y=homeY;
      phase='arrival';
    }else if(entry==='shadow'){
      x=state.player.x+(noise.randomAt(regionIndex,state.frame,8203)>.5?14:-14);
      y=state.player.y-definition.height*.5;
      phase='fight';
    }

    if([
      K.MYCELIAL_MONARCH,
      K.CRYSTAL_BURROWER,
      K.MAGMA_BEHEMOTH,
      K.WORLD_EATER,
    ].includes(kind)){
      clearBossPocket(homeX,homeY,definition.width,definition.height);
    }

    const boss={
      kind,
      name:definition.name,
      regionIndex,
      x,
      y,
      vx:0,
      vy:0,
      homeX,
      homeY,
      groundY,
      waterY,
      width:definition.width,
      height:definition.height,
      hp:definition.maxHealth,
      maxHp:definition.maxHealth,
      contactDamage:definition.contactDamage,
      reward:definition.reward,
      barBack:definition.barBack,
      barFill:definition.barFill,
      barHighlight:definition.barHighlight,
      phase,
      entry,
      entryDirection,
      flap:0,
      hit:0,
      attackTimer:48,
      specialTimer:0,
      phaseOffset:Math.floor(noise.randomAt(regionIndex,92,8204)*9999),
    };

    snapPixelPosition(boss);
    snapStoredCoordinates(boss,['homeX','homeY','groundY','waterY']);
    state.entities.bosses.push(boss);
    juice?.bossSpawn?.(boss.x,boss.y,boss.barHighlight);
    state.ui.bossRitual=null;
    const record=encounter(kind);
    record.spawned=true;
    record.regionIndex=regionIndex;

    if(kind===K.CALDERA_TYRANT)state.world.bossSpawned=true;
    if(kind===K.SEA_SERPENT)state.world.seaSerpentSpawned=true;
    if(options.announce!==false)hud.showMessage(definition.message,3400);
    return boss;
  }

  const RITUAL_CHECK_INTERVAL=15;

  function nearbyDescriptor(getDescriptor,maxDistance=96){
    const baseRegion=Math.floor(state.player.x/BIOME_REGION_SIZE);
    let best=null;
    for(let offset=-1;offset<=1;offset++){
      const descriptor=getDescriptor(baseRegion+offset);
      if(!descriptor)continue;
      const distance=Math.abs(descriptor.center-state.player.x);
      if(distance>maxDistance)continue;
      if(!best||distance<best.distance)best={distance,descriptor};
    }
    return best?.descriptor??null;
  }

  function countNearbyMaterials(materials,radiusX=18,radiusY=12,step=1){
    const accepted=materials instanceof Set?materials:new Set(Array.isArray(materials)?materials:[materials]);
    const centerX=Math.round(state.player.x);
    const centerY=Math.round(state.player.y-2);
    let count=0;
    for(let y=centerY-radiusY;y<=centerY+radiusY;y+=step){
      for(let x=centerX-radiusX;x<=centerX+radiusX;x+=step){
        if(accepted.has(cells.getCell(x,y)))count++;
      }
    }
    return count;
  }

  function playerTouches(materials){
    const accepted=materials instanceof Set?materials:new Set(Array.isArray(materials)?materials:[materials]);
    const x=Math.round(state.player.x);
    for(const y of [Math.round(state.player.y),Math.round(state.player.y-1),Math.round(state.player.y-2)]){
      if(accepted.has(cells.getCell(x,y)))return true;
    }
    return false;
  }

  function uncoveredAbove(height=28){
    const x=Math.round(state.player.x);
    const top=Math.round(state.player.y-3);
    for(let y=top-1;y>=top-height;y--){
      if(cells.isSolid(cells.getCell(x,y)))return false;
    }
    return true;
  }

  function weatherIs(...types){
    return types.includes(state.weather.currentType);
  }

  function canSpawnNewEncounter(){
    return state.entities.bosses.length===0&&state.frame>=state.world.bossCooldownUntil;
  }

  function consumeLoot(lootId,count){
    return ()=>state.inventory.removeLoot(lootId,count);
  }

  function consumeMaterial(materialId,count){
    return ()=>state.inventory.remove(materialId,count);
  }

  function consumeFish(){
    if(state.inventory.lootCount('fish')>0)return state.inventory.removeLoot('fish',1);
    return state.inventory.removeLoot('cooked_fish',1);
  }

  function setRitualHint(kind,detail=''){
    if(state.ui.bossRitual)return;
    const definition=bossRitualDefinition(kind);
    if(!definition)return;
    const record=encounter(kind);
    state.ui.bossRitual={
      kind,
      title:definition.title,
      hint:detail||definition.hint,
      progress:Math.min(definition.progressFrames,record.ritualProgress),
      maxProgress:definition.progressFrames,
    };
  }

  function advanceRitual(kind,{present,eligible,regionIndex,detail='',consume=null}){
    const record=encounter(kind);
    if(record.spawned||record.defeated)return false;
    if(!present)return false;
    const definition=bossRitualDefinition(kind);
    if(!definition)return false;

    setRitualHint(kind,detail);
    if(record.ritualCompleted)return true;

    if(eligible){
      record.ritualProgress=Math.min(definition.progressFrames,record.ritualProgress+RITUAL_CHECK_INTERVAL);
    }else{
      // Rituals retain most partial progress but cool down slowly when their
      // environmental requirement is interrupted.
      record.ritualProgress=Math.max(0,record.ritualProgress-3);
    }

    if(state.ui.bossRitual?.kind===kind)state.ui.bossRitual.progress=record.ritualProgress;
    if(record.ritualProgress<definition.progressFrames)return false;
    if(consume&&!consume()){
      record.ritualProgress=Math.max(0,definition.progressFrames-RITUAL_CHECK_INTERVAL);
      return false;
    }

    record.ritualCompleted=true;
    record.ritualRegionIndex=regionIndex;
    record.ritualProgress=definition.progressFrames;
    return true;
  }

  function spawnCalderaBossIfReady(){
    const record=encounter(K.CALDERA_TYRANT);
    if(state.world.bossSpawned||state.world.bossDefeated||record.spawned||record.defeated)return false;
    if(state.world.camera.chunkY!==0)return false;
    const descriptor=nearbyDescriptor(generator.volcanoDescriptor,80);
    const biome=generator.biomeIdAt(state.player.x);
    const present=biome===B.VOLCANO&&Boolean(descriptor);
    if(!present)return false;
    const hotCount=countNearbyMaterials([M.LAVA,M.FIRE],20,15,2);
    const eligible=Math.abs(state.player.x-descriptor.center)<=42&&hotCount>=8;
    if(!advanceRitual(K.CALDERA_TYRANT,{
      present,
      eligible,
      regionIndex:descriptor.regionIndex,
      detail:`CRATER HEAT ${Math.min(8,hotCount)}/8`,
    }))return false;

    state.world.firstVolcanoRegionIndex=descriptor.regionIndex;
    const surface=generator.surfaceAt(Math.round(descriptor.center));
    return Boolean(spawnBoss(K.CALDERA_TYRANT,{
      regionIndex:descriptor.regionIndex,
      homeX:Math.round(descriptor.center),
      groundY:surface.ground,
      entry:'above',
    }));
  }

  function spawnSeaSerpentIfReady(){
    const record=encounter(K.SEA_SERPENT);
    if(state.world.seaSerpentSpawned||state.world.seaSerpentDefeated||record.spawned||record.defeated)return false;
    if(state.world.camera.chunkY!==0)return false;
    const descriptor=nearbyDescriptor(generator.oceanDescriptor,110);
    const surface=generator.surfaceAt(state.player.x);
    const present=generator.biomeIdAt(state.player.x)===B.OCEAN&&surface.ocean&&Boolean(descriptor);
    if(!present)return false;
    const fishCount=state.inventory.lootCount('fish')+state.inventory.lootCount('cooked_fish');
    const inDeepWater=surface.ground-surface.water>=15&&playerTouches(M.WATER);
    const eligible=inDeepWater&&fishCount>=1;
    if(!advanceRitual(K.SEA_SERPENT,{
      present,
      eligible,
      regionIndex:descriptor.regionIndex,
      detail:`FISH ${Math.min(1,fishCount)}/1  ENTER DEEP WATER`,
      consume:consumeFish,
    }))return false;

    state.world.firstOceanRegionIndex=descriptor.regionIndex;
    const centerSurface=generator.surfaceAt(Math.round(descriptor.center));
    return Boolean(spawnBoss(K.SEA_SERPENT,{
      regionIndex:descriptor.regionIndex,
      homeX:Math.round(state.player.x),
      groundY:centerSurface.ground,
      waterY:centerSurface.water,
      entry:'below_water',
    }));
  }

  function spawnUndergroundEncounter(){
    if(state.world.camera.chunkY<=0)return false;
    const surface=generator.surfaceAt(state.player.x);
    const depth=state.player.y-surface.ground;
    const regionIndex=Math.floor(state.player.x/BIOME_REGION_SIZE);
    const underground=generator.undergroundBiomeIdAt(state.player.x,state.player.y-2);
    const biome=generator.biomeIdAt(state.player.x);

    if(underground===U.MUSHROOM_CAVERNS&&!encounter(K.MYCELIAL_MONARCH).spawned){
      const mycelium=countNearbyMaterials([M.MYCELIUM,M.MUSHROOM_STEM,M.MUSHROOM_CAP],22,16,2);
      const fire=countNearbyMaterials(M.FIRE,22,16,1);
      if(advanceRitual(K.MYCELIAL_MONARCH,{
        present:true,
        eligible:mycelium>=16&&fire>=3,
        regionIndex,
        detail:`ROOTS ${Math.min(16,mycelium)}/16  FIRE ${Math.min(3,fire)}/3`,
      })){
        return Boolean(spawnBoss(K.MYCELIAL_MONARCH,{
          regionIndex,
          homeX:state.player.x+18,
          homeY:state.player.y-4,
          entry:'rooted',
        }));
      }
      return false;
    }

    if(biome===B.VOLCANO&&depth>38&&!encounter(K.MAGMA_BEHEMOTH).spawned){
      const lava=countNearbyMaterials(M.LAVA,24,17,2);
      const steam=countNearbyMaterials(M.STEAM,24,17,1);
      if(advanceRitual(K.MAGMA_BEHEMOTH,{
        present:true,
        eligible:depth>48&&lava>=5&&steam>=2,
        regionIndex,
        detail:`LAVA ${Math.min(5,lava)}/5  STEAM ${Math.min(2,steam)}/2`,
      })){
        return Boolean(spawnBoss(K.MAGMA_BEHEMOTH,{
          regionIndex,
          homeX:state.player.x+20,
          homeY:state.player.y-6,
          entry:'below_ground',
        }));
      }
      return false;
    }

    if(depth>42&&!encounter(K.CRYSTAL_BURROWER).spawned){
      const crystal=countNearbyMaterials(M.CRYSTAL,24,17,2);
      const fragments=state.inventory.lootCount('crystal_fragment');
      if(advanceRitual(K.CRYSTAL_BURROWER,{
        present:true,
        eligible:depth>58&&crystal>=5&&fragments>=5,
        regionIndex,
        detail:`VEIN ${Math.min(5,crystal)}/5  FRAGMENTS ${Math.min(5,fragments)}/5`,
        consume:consumeLoot('crystal_fragment',5),
      })){
        return Boolean(spawnBoss(K.CRYSTAL_BURROWER,{
          regionIndex,
          homeX:state.player.x+18,
          homeY:state.player.y-4,
          entry:'side',
        }));
      }
      return false;
    }
    return false;
  }

  function spawnSnowEncounter(regionIndex,surface){
    const frost=encounter(K.FROST_COLOSSUS);
    if(!frost.spawned&&!frost.defeated){
      const snow=state.inventory.counts[M.SNOW]??0;
      const snowyWeather=weatherIs(WeatherType.SNOW,WeatherType.BLIZZARD);
      if(advanceRitual(K.FROST_COLOSSUS,{
        present:true,
        eligible:snow>=12&&snowyWeather,
        regionIndex,
        detail:`SNOW ${Math.min(12,snow)}/12  WAIT FOR SNOWFALL`,
        consume:consumeMaterial(M.SNOW,12),
      })){
        return Boolean(spawnBoss(K.FROST_COLOSSUS,{regionIndex,homeX:state.player.x+22,entry:'assemble'}));
      }
      return false;
    }

    const sky=encounter(K.SKY_JELLYFISH);
    if(frost.defeated&&!sky.spawned&&!sky.defeated){
      const glands=state.inventory.lootCount('eel_gland');
      const high=state.player.y<=surface.ground-18;
      const storm=weatherIs(WeatherType.BLIZZARD,WeatherType.THUNDERSTORM);
      if(advanceRitual(K.SKY_JELLYFISH,{
        present:true,
        eligible:glands>=2&&high&&storm,
        regionIndex,
        detail:`GLANDS ${Math.min(2,glands)}/2  CLIMB INTO THE STORM`,
        consume:consumeLoot('eel_gland',2),
      })){
        return Boolean(spawnBoss(K.SKY_JELLYFISH,{regionIndex,homeX:state.player.x+18,entry:'above'}));
      }
    }
    return false;
  }

  function spawnOceanFollowup(regionIndex,surface){
    const fleet=encounter(K.DROWNED_FLEET);
    if(encounter(K.SEA_SERPENT).defeated&&!fleet.spawned&&!fleet.defeated){
      const pearls=state.inventory.lootCount('pearl');
      const storm=weatherIs(WeatherType.OCEAN_STORM);
      if(advanceRitual(K.DROWNED_FLEET,{
        present:true,
        eligible:pearls>=3&&storm&&uncoveredAbove(18),
        regionIndex,
        detail:`PEARLS ${Math.min(3,pearls)}/3  WAIT FOR OCEAN STORM`,
        consume:consumeLoot('pearl',3),
      })){
        return Boolean(spawnBoss(K.DROWNED_FLEET,{
          regionIndex,
          homeX:state.player.x+18,
          groundY:surface.ground,
          waterY:surface.water,
          entry:'below_water',
        }));
      }
      return false;
    }

    const sky=encounter(K.SKY_JELLYFISH);
    if(fleet.defeated&&!sky.spawned&&!sky.defeated){
      const glands=state.inventory.lootCount('eel_gland');
      const storm=weatherIs(WeatherType.OCEAN_STORM,WeatherType.THUNDERSTORM);
      if(advanceRitual(K.SKY_JELLYFISH,{
        present:true,
        eligible:glands>=2&&storm&&uncoveredAbove(18),
        regionIndex,
        detail:`GLANDS ${Math.min(2,glands)}/2  STAND UNDER THE STORM`,
        consume:consumeLoot('eel_gland',2),
      })){
        return Boolean(spawnBoss(K.SKY_JELLYFISH,{
          regionIndex,
          homeX:state.player.x+18,
          groundY:surface.ground,
          waterY:surface.water,
          entry:'above',
        }));
      }
    }
    return false;
  }

  function spawnSurfaceEncounter(){
    if(state.world.camera.chunkY!==0)return false;
    const regionIndex=Math.floor(state.player.x/BIOME_REGION_SIZE);
    const biome=generator.biomeIdAt(state.player.x);
    const surface=generator.surfaceAt(state.player.x);
    if(state.player.y>surface.ground+12)return false;

    if(biome===B.SNOW_PEAKS)return spawnSnowEncounter(regionIndex,surface);

    if(biome===B.SWAMP&&!encounter(K.BOG_LEVIATHAN).spawned&&!encounter(K.BOG_LEVIATHAN).defeated){
      const venom=state.inventory.lootCount('venom_sac');
      const mire=playerTouches([M.MUD,M.WATER]);
      const darkOrWet=!timeState().isDay||weatherIs(WeatherType.RAIN,WeatherType.THUNDERSTORM,WeatherType.FOG);
      if(advanceRitual(K.BOG_LEVIATHAN,{
        present:true,
        eligible:venom>=3&&mire&&darkOrWet,
        regionIndex,
        detail:`VENOM ${Math.min(3,venom)}/3  STAND IN WET MIRE`,
        consume:consumeLoot('venom_sac',3),
      }))return Boolean(spawnBoss(K.BOG_LEVIATHAN,{regionIndex,homeX:state.player.x+20,entry:'below_ground'}));
      return false;
    }

    if(biome===B.BAMBOO_GROVE&&!encounter(K.BAMBOO_WAR_MACHINE).spawned&&!encounter(K.BAMBOO_WAR_MACHINE).defeated){
      const stored=state.inventory.counts[M.BAMBOO]??0;
      const bamboo=countNearbyMaterials(M.BAMBOO,22,15,2);
      const fire=countNearbyMaterials(M.FIRE,22,15,1);
      if(advanceRitual(K.BAMBOO_WAR_MACHINE,{
        present:true,
        eligible:stored>=8&&bamboo>=6&&fire>=1,
        regionIndex,
        detail:`PACK ${Math.min(8,stored)}/8  GROVE ${Math.min(6,bamboo)}/6  FIRE ${Math.min(1,fire)}/1`,
        consume:consumeMaterial(M.BAMBOO,8),
      }))return Boolean(spawnBoss(K.BAMBOO_WAR_MACHINE,{regionIndex,homeX:state.player.x+22,entry:'above'}));
      return false;
    }

    if(biome===B.GIANT_FOREST&&!encounter(K.CANOPY_WYRM).spawned&&!encounter(K.CANOPY_WYRM).defeated){
      const feathers=state.inventory.lootCount('bright_feather');
      const high=state.player.y<=surface.ground-18;
      const wind=Math.abs(state.weather.windX)>=.22||weatherIs(WeatherType.BREEZE,WeatherType.THUNDERSTORM);
      if(advanceRitual(K.CANOPY_WYRM,{
        present:true,
        eligible:feathers>=2&&high&&wind,
        regionIndex,
        detail:`FEATHERS ${Math.min(2,feathers)}/2  REACH THE WINDY CANOPY`,
        consume:consumeLoot('bright_feather',2),
      }))return Boolean(spawnBoss(K.CANOPY_WYRM,{regionIndex,homeX:state.player.x+20,entry:'above'}));
      return false;
    }

    if(biome===B.PLAINS&&!encounter(K.STORM_ROC).spawned&&!encounter(K.STORM_ROC).defeated){
      const storm=weatherIs(WeatherType.THUNDERSTORM);
      const exposed=uncoveredAbove(28);
      if(advanceRitual(K.STORM_ROC,{
        present:true,
        eligible:storm&&exposed,
        regionIndex,
        detail:`THUNDER ${storm?'READY':'WAIT'}  SKY ${exposed?'OPEN':'BLOCKED'}`,
      }))return Boolean(spawnBoss(K.STORM_ROC,{regionIndex,homeX:state.player.x+22,entry:'above'}));
      return false;
    }

    if(biome===B.OCEAN)return spawnOceanFollowup(regionIndex,surface);
    return false;
  }

  function spawnNightEncounter(){
    if(state.world.camera.chunkY!==0)return false;
    const time=timeState();
    const record=encounter(K.MOON_STALKER);
    if(record.spawned||record.defeated||time.isDay||time.nightStrength<.62)return false;
    const regionIndex=Math.floor(state.player.x/BIOME_REGION_SIZE);
    const fire=countNearbyMaterials(M.FIRE,18,12,1);
    const still=Math.abs(state.player.vx)<.04&&Math.abs(state.player.vy)<.04;
    if(!advanceRitual(K.MOON_STALKER,{
      present:true,
      eligible:time.nightStrength>.75&&fire===0&&still,
      regionIndex,
      detail:`DARK ${fire===0?'YES':'NO'}  STILL ${still?'YES':'NO'}`,
    }))return false;
    return Boolean(spawnBoss(K.MOON_STALKER,{regionIndex,entry:'shadow'}));
  }

  function spawnWorldEaterIfReady(){
    const record=encounter(K.WORLD_EATER);
    if(record.spawned||record.defeated||state.world.defeatedBossCount<5)return false;
    const surface=generator.surfaceAt(state.player.x);
    const depth=state.player.y-surface.ground;
    const travelled=Math.abs(state.player.x-state.world.travelOriginX);
    const present=state.world.camera.chunkY>0&&depth>28;
    if(!present)return false;
    const eligible=depth>48&&travelled>=BIOME_REGION_SIZE*1.5;
    if(!advanceRitual(K.WORLD_EATER,{
      present,
      eligible,
      regionIndex:Math.floor(state.player.x/BIOME_REGION_SIZE),
      detail:`DEPTH ${Math.min(48,Math.max(0,Math.round(depth)))}/48  TRAVEL ${travelled>=BIOME_REGION_SIZE*1.5?'YES':'NO'}`,
    }))return false;
    return Boolean(spawnBoss(K.WORLD_EATER,{
      regionIndex:Math.floor(state.player.x/BIOME_REGION_SIZE),
      homeX:state.player.x+22,
      homeY:state.player.y-4,
      entry:'side',
    }));
  }

  function trySpawnEncounter(){
    if(state.frame%RITUAL_CHECK_INTERVAL!==0)return;
    state.ui.bossRitual=null;
    if(!canSpawnNewEncounter())return;
    if(spawnCalderaBossIfReady())return;
    if(spawnSeaSerpentIfReady())return;
    if(spawnUndergroundEncounter())return;
    if(spawnSurfaceEncounter())return;
    if(spawnNightEncounter())return;
    spawnWorldEaterIfReady();
  }

  function attackDelay(kind){
    const ranges={
      [K.CALDERA_TYRANT]:[78,132],
      [K.SEA_SERPENT]:[72,118],
      [K.FROST_COLOSSUS]:[78,118],
      [K.BOG_LEVIATHAN]:[70,108],
      [K.MYCELIAL_MONARCH]:[64,102],
      [K.BAMBOO_WAR_MACHINE]:[58,92],
      [K.CANOPY_WYRM]:[68,104],
      [K.CRYSTAL_BURROWER]:[64,96],
      [K.MAGMA_BEHEMOTH]:[72,108],
      [K.STORM_ROC]:[82,118],
      [K.MOON_STALKER]:[58,86],
      [K.DROWNED_FLEET]:[68,104],
      [K.SKY_JELLYFISH]:[62,96],
      [K.WORLD_EATER]:[54,82],
    };
    const [min,max]=ranges[kind]??[70,110];
    return min+Math.floor(noise.randomAt(state.frame,kind.length,8301)*(max-min));
  }

  function aimedAngle(boss,offset=0){
    return Math.atan2(state.player.y-2-boss.y,state.player.x-boss.x)+offset;
  }

  function pushGenericProjectile(boss,kind,angle,speed,options={}){
    state.entities.bossProjectiles.push({
      ownerKind:boss.kind,
      kind,
      x:nearestPixel(boss.x+(options.offsetX??0)),
      y:nearestPixel(boss.y+(options.offsetY??0)),
      vx:Math.cos(angle)*speed+(options.extraVx??0),
      vy:Math.sin(angle)*speed+(options.extraVy??0),
      gravity:options.gravity??.035,
      life:options.life??180,
      delay:options.delay??0,
      targetX:options.targetX,
      targetY:options.targetY,
      phase:0,
    });
  }

  function launchFireballBurst(boss){
    const base=aimedAngle(boss);
    for(let index=0;index<CALDERA_BOSS_CONFIG.fireballBurstCount;index++){
      const middle=(CALDERA_BOSS_CONFIG.fireballBurstCount-1)*.5;
      const angle=base+(index-middle)*CALDERA_BOSS_CONFIG.fireballSpread;
      state.entities.bossFireballs.push({
        x:nearestPixel(boss.x+(index-middle)*2),
        y:nearestPixel(boss.y+2),
        vx:Math.cos(angle)*CALDERA_BOSS_CONFIG.fireballSpeed,
        vy:Math.max(.35,Math.sin(angle)*CALDERA_BOSS_CONFIG.fireballSpeed),
        life:CALDERA_BOSS_CONFIG.fireballLifeFrames,
      });
    }
  }

  function launchSerpentBurst(boss){
    const base=aimedAngle(boss);
    for(let index=0;index<SEA_SERPENT_CONFIG.projectileBurstCount;index++){
      const middle=(SEA_SERPENT_CONFIG.projectileBurstCount-1)*.5;
      const angle=base+(index-middle)*SEA_SERPENT_CONFIG.projectileSpread;
      state.entities.serpentProjectiles.push({
        kind:'water_burst',
        x:nearestPixel(boss.x+(index-middle)*1.5),
        y:nearestPixel(boss.y-2),
        vx:Math.cos(angle)*SEA_SERPENT_CONFIG.projectileSpeed,
        vy:Math.sin(angle)*SEA_SERPENT_CONFIG.projectileSpeed,
        life:SEA_SERPENT_CONFIG.projectileLifeFrames,
      });
    }
  }

  function launchGenericAttack(boss){
    const kind=bossDefinition(boss.kind)?.projectile;
    if(!kind)return;

    if(kind==='ice_boulder'){
      for(const offset of [-.16,.16])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.35,{gravity:.045,life:190});
    }else if(kind==='mud_glob'){
      for(const offset of [-.22,0,.22])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.25,{gravity:.04,life:180});
    }else if(kind==='spore'){
      for(const offset of [-.32,-.16,0,.16,.32])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.05,{gravity:-.004,life:210});
    }else if(kind==='bamboo_shard'){
      for(const offset of [-.12,0,.12])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),2.15,{gravity:.012,life:150});
    }else if(kind==='branch'){
      for(const offset of [-.18,.18])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.45,{gravity:.06,life:170});
    }else if(kind==='crystal_shard'){
      for(const offset of [-.24,-.08,.08,.24])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),2.0,{gravity:0,life:160});
    }else if(kind==='magma_rock'){
      for(const offset of [-.17,.17])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.3,{gravity:.055,life:190});
    }else if(kind==='lightning_marker'){
      state.entities.bossProjectiles.push({
        ownerKind:boss.kind,
        kind,
        x:state.player.x,
        y:cameraOrigin().y+1,
        vx:0,
        vy:0,
        gravity:0,
        life:52,
        delay:36,
        targetX:state.player.x,
        targetY:state.player.y,
        phase:0,
      });
      state.player.vx+=Math.sign(state.player.x-boss.x)*.45;
    }else if(kind==='shadow_bolt'){
      for(const offset of [-.16,.16])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.55,{gravity:0,life:190});
    }else if(kind==='cannonball'){
      for(const offset of [-.2,.2])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.5,{gravity:.07,life:200,offsetX:offset*18});
    }else if(kind==='electric_orb'){
      for(const offset of [-.2,0,.2])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.25,{gravity:0,life:210});
    }else if(kind==='world_spit'){
      for(const offset of [-.12,.12])pushGenericProjectile(boss,kind,aimedAngle(boss,offset),1.7,{gravity:.035,life:190});
    }
  }

  function attackBoss(boss){
    if(boss.kind===K.CALDERA_TYRANT)launchFireballBurst(boss);
    else if(boss.kind===K.SEA_SERPENT)launchSerpentBurst(boss);
    else launchGenericAttack(boss);
    boss.attackTimer=attackDelay(boss.kind);
  }

  function advanceEntry(boss){
    if(boss.phase==='fight')return true;
    boss.flap+=.55;

    if(boss.entry==='above'){
      boss.x+=(boss.homeX-boss.x)*.075;
      boss.y+=Math.max(.34,(boss.homeY-boss.y)*.075);
      if(boss.y>=boss.homeY-.75){
        boss.y=boss.homeY;
        boss.phase='fight';
      }
    }else if(boss.entry==='side'){
      boss.x+=(boss.homeX-boss.x)*.07;
      boss.y+=(boss.homeY-boss.y)*.08;
      if(Math.abs(boss.x-boss.homeX)<1){
        boss.x=boss.homeX;
        boss.phase='fight';
      }
    }else{
      boss.y+=(boss.homeY-boss.y)*.075;
      if(boss.y<=boss.homeY+.75){
        boss.y=boss.homeY;
        boss.phase='fight';
      }
    }

    if(boss.phase==='fight')boss.attackTimer=45;
    return boss.phase==='fight';
  }

  function hoverMotion(boss,xAmplitude,yAmplitude,xSpeed=.018,ySpeed=.045){
    const desiredX=boss.homeX+Math.sin((state.frame+boss.phaseOffset)*xSpeed)*xAmplitude;
    const desiredY=boss.homeY+Math.sin((state.frame+boss.phaseOffset)*ySpeed)*yAmplitude;
    boss.vx=(boss.vx+(desiredX-boss.x)*.04)*.9;
    boss.vy=(boss.vy+(desiredY-boss.y)*.05)*.88;
    boss.x+=boss.vx;
    boss.y+=boss.vy;
  }

  function groundMotion(boss,speed=.035,range=24){
    const targetX=Math.max(boss.homeX-range,Math.min(boss.homeX+range,state.player.x));
    boss.vx=(boss.vx+(targetX-boss.x)*speed)*.83;
    boss.x+=boss.vx;
    const surface=generator.surfaceAt(boss.x);
    boss.groundY=surface.ground;
    boss.homeY=surface.ground-boss.height*.5-1;
    boss.y+=(boss.homeY-boss.y)*.28;
  }

  function spawnMinionNear(boss){
    const chunk=chunks.getChunk(chunks.chunkX(boss.x),chunks.chunkY(boss.y),false);
    if(!chunk||chunk.enemies.length>16)return;
    const minion={
      x:boss.x+(noise.randomAt(state.frame,boss.regionIndex,8401)-.5)*14,
      y:boss.y+boss.height*.4,
      vx:0,
      vy:0,
      hp:24,
      phase:noise.randomAt(state.frame,boss.regionIndex,8402)*Math.PI*2,
      hit:0,
      burning:0,
    };
    snapPixelPosition(minion);
    chunk.enemies.push(minion);
  }

  function consumeNearbyBamboo(boss){
    if(boss.hp>=boss.maxHp)return;
    for(let y=Math.floor(boss.y-10);y<=Math.ceil(boss.y+10);y++){
      for(let x=Math.floor(boss.x-14);x<=Math.ceil(boss.x+14);x++){
        if(cells.getCell(x,y)!==M.BAMBOO)continue;
        cells.setCell(x,y,M.AIR,0,{reason:'boss-repair'});
        boss.hp=Math.min(boss.maxHp,boss.hp+7);
        return;
      }
    }
  }

  function digTerrain(boss,radius=2){
    const centerX=Math.round(boss.x+Math.sign(boss.vx||boss.entryDirection||1)*boss.width*.35);
    const centerY=Math.round(boss.y);
    for(let y=centerY-radius;y<=centerY+radius;y++){
      for(let x=centerX-radius;x<=centerX+radius;x++){
        if((x-centerX)**2+(y-centerY)**2>radius*radius)continue;
        const type=cells.getCell(x,y);
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR,0,{reason:'boss-tunnel'});
      }
    }
  }

  function updateCalderaBoss(boss){
    hoverMotion(boss,CALDERA_BOSS_CONFIG.wanderX,CALDERA_BOSS_CONFIG.wanderY,.018,.05);
  }

  function updateSeaSerpent(boss){
    hoverMotion(boss,SEA_SERPENT_CONFIG.wanderX,SEA_SERPENT_CONFIG.wanderY,.015,.038);
  }

  function updateFrostColossus(boss){
    groundMotion(boss,boss.hp<boss.maxHp*.35?.055:.035,26);
  }

  function updateBogLeviathan(boss){
    boss.specialTimer--;
    if(boss.specialTimer>0){
      boss.y+=(boss.waterY+10-boss.y)*.13;
      return;
    }
    if(boss.specialTimer===0){
      boss.x=Math.max(boss.homeX-24,Math.min(boss.homeX+24,state.player.x+(noise.randomAt(state.frame,boss.regionIndex,8501)-.5)*16));
      boss.y=boss.waterY+9;
      boss.specialTimer=-1;
    }
    boss.y+=(boss.homeY-boss.y)*.13;
    boss.x+=Math.sin((state.frame+boss.phaseOffset)*.03)*.14;
    if(boss.attackTimer<12&&boss.specialTimer<0)boss.specialTimer=42;
  }

  function updateMycelialMonarch(boss){
    boss.y=boss.homeY+Math.sin((state.frame+boss.phaseOffset)*.04)*1.2;
    boss.x=boss.homeX;
    if(state.frame%180===0)spawnMinionNear(boss);
  }

  function updateBambooWarMachine(boss){
    groundMotion(boss,.044,28);
    if(state.frame%60===0)consumeNearbyBamboo(boss);
  }

  function updateCanopyWyrm(boss){
    hoverMotion(boss,27,7,.021,.052);
  }

  function updateCrystalBurrower(boss){
    const dx=state.player.x-boss.x;
    const dy=state.player.y-2-boss.y;
    const distance=Math.hypot(dx,dy)||1;
    boss.vx=(boss.vx+dx/distance*.045)*.93;
    boss.vy=(boss.vy+dy/distance*.035)*.93;
    boss.x+=boss.vx;
    boss.y+=boss.vy;
    digTerrain(boss,2);
  }

  function updateMagmaBehemoth(boss){
    groundMotion(boss,.028,20);
    boss.y+=Math.sin((state.frame+boss.phaseOffset)*.04)*.08;
  }

  function updateStormRoc(boss){
    hoverMotion(boss,30,8,.025,.055);
    const dx=state.player.x-boss.x;
    const distance=Math.abs(dx)||1;
    if(distance<48)state.player.vx+=Math.sign(dx)*.006;
  }

  function updateMoonStalker(boss){
    const time=timeState();
    if(time.isDay)boss.hp-=.42;
    boss.specialTimer--;
    if(boss.specialTimer<=0){
      const side=noise.randomAt(state.frame,boss.regionIndex,8601)>.5?1:-1;
      boss.x=state.player.x+side*(10+Math.floor(noise.randomAt(state.frame,boss.regionIndex,8602)*12));
      boss.y=state.player.y-boss.height*.5-1;
      boss.specialTimer=76;
      state.entities.explosions.push({x:boss.x,y:boss.y,radius:5,frames:8,maxFrames:8,kind:'shadow',color:'rgb(139,115,218)'});
    }
    boss.x+=(state.player.x-boss.x)*.012;
  }

  function updateDrownedFleet(boss){
    boss.x=boss.homeX+Math.sin((state.frame+boss.phaseOffset)*.012)*5;
    boss.y=boss.homeY+Math.sin((state.frame+boss.phaseOffset)*.045)*1.2;
  }

  function updateSkyJellyfish(boss){
    hoverMotion(boss,24,9,.017,.043);
  }

  function updateWorldEater(boss){
    const desiredDirection=Math.abs(boss.x-state.player.x)>42?Math.sign(state.player.x-boss.x):(boss.entryDirection||1);
    boss.entryDirection=desiredDirection||1;
    boss.vx=(boss.vx+boss.entryDirection*.055)*.96;
    boss.vy=(boss.vy+(state.player.y-3-boss.y)*.006)*.94;
    boss.x+=boss.vx;
    boss.y+=boss.vy;
    digTerrain(boss,3);
  }

  function updateBossFight(boss){
    boss.flap+=.55;
    switch(boss.kind){
      case K.CALDERA_TYRANT:updateCalderaBoss(boss);break;
      case K.SEA_SERPENT:updateSeaSerpent(boss);break;
      case K.FROST_COLOSSUS:updateFrostColossus(boss);break;
      case K.BOG_LEVIATHAN:updateBogLeviathan(boss);break;
      case K.MYCELIAL_MONARCH:updateMycelialMonarch(boss);break;
      case K.BAMBOO_WAR_MACHINE:updateBambooWarMachine(boss);break;
      case K.CANOPY_WYRM:updateCanopyWyrm(boss);break;
      case K.CRYSTAL_BURROWER:updateCrystalBurrower(boss);break;
      case K.MAGMA_BEHEMOTH:updateMagmaBehemoth(boss);break;
      case K.STORM_ROC:updateStormRoc(boss);break;
      case K.MOON_STALKER:updateMoonStalker(boss);break;
      case K.DROWNED_FLEET:updateDrownedFleet(boss);break;
      case K.SKY_JELLYFISH:updateSkyJellyfish(boss);break;
      case K.WORLD_EATER:updateWorldEater(boss);break;
    }

    boss.attackTimer--;
    if(boss.attackTimer<=0&&chunks.isActiveWorldPosition(boss.x,boss.y))attackBoss(boss);
  }

  function sampledMaterials(boss){
    const samples=[];
    for(const [ox,oy] of [[0,0],[-boss.width*.25,0],[boss.width*.25,0],[0,boss.height*.25]]){
      samples.push(cells.getCell(Math.floor(boss.x+ox),Math.floor(boss.y+oy)));
    }
    return samples;
  }

  function applyEnvironmentalEffects(boss){
    const materials=sampledMaterials(boss);
    const fireCount=materials.filter(type=>type===M.FIRE).length;
    const lavaCount=materials.filter(type=>type===M.LAVA).length;
    const waterCount=materials.filter(type=>type===M.WATER).length;
    const steamCount=materials.filter(type=>type===M.STEAM).length;

    boss.hp-=fireCount*.16+steamCount*STEAM_CONFIG.enemyDamagePerFrame*.35;
    if(boss.kind!==K.MAGMA_BEHEMOTH)boss.hp-=lavaCount*.28;

    if(boss.kind===K.FROST_COLOSSUS)boss.hp-=fireCount*.42+lavaCount*.7;
    if([K.MYCELIAL_MONARCH,K.BAMBOO_WAR_MACHINE,K.CANOPY_WYRM].includes(boss.kind))boss.hp-=fireCount*.34;
    if(boss.kind===K.MAGMA_BEHEMOTH){
      boss.hp=Math.min(boss.maxHp,boss.hp+lavaCount*.16);
      if(waterCount>0){
        boss.hp-=waterCount*.48;
        const x=Math.floor(boss.x);
        const y=Math.floor(boss.y);
        if(cells.getCell(x,y)===M.WATER)cells.setCell(x,y,M.STEAM,STEAM_CONFIG.lifeFrames);
      }
    }
  }

  function paintCircle(centerX,centerY,radius,callback){
    for(let y=centerY-radius;y<=centerY+radius;y++){
      for(let x=centerX-radius;x<=centerX+radius;x++){
        if((x-centerX)**2+(y-centerY)**2>radius*radius)continue;
        callback(x,y,cells.getCell(x,y));
      }
    }
  }

  function bossProjectileDamage(kind){
    return {
      ice_boulder:6,
      mud_glob:6,
      spore:5,
      bamboo_shard:7,
      branch:7,
      crystal_shard:8,
      magma_rock:8,
      shadow_bolt:7,
      cannonball:10,
      electric_orb:8,
      world_spit:10,
    }[kind]??6;
  }

  function impactGenericProjectile(projectile){
    const centerX=Math.floor(projectile.x);
    const centerY=Math.floor(projectile.y);
    const kind=projectile.kind;
    let radius=2;
    let effectColor='rgb(235,225,190)';

    if(kind==='ice_boulder'){
      effectColor='rgb(185,232,252)';
      paintCircle(centerX,centerY,2,(x,y,type)=>{
        if(type===M.AIR||type===M.WATER||type===M.SMOKE||type===M.STEAM)cells.setCell(x,y,M.SNOW);
      });
    }else if(kind==='mud_glob'){
      effectColor='rgb(115,99,55)';
      paintCircle(centerX,centerY,2,(x,y,type)=>{
        if(type===M.AIR||type===M.WATER||type===M.SMOKE||type===M.STEAM)cells.setCell(x,y,M.MUD);
      });
    }else if(kind==='spore'){
      effectColor='rgb(211,109,205)';
      radius=3;
      paintCircle(centerX,centerY,3,(x,y,type)=>{
        if(type===M.DIRT||type===M.GRASS)cells.setCell(x,y,M.MYCELIUM);
        else if(type===M.AIR&&noise.randomAt(x,y,state.frame+8701)>.48)cells.setCell(x,y,M.SMOKE,60);
      });
    }else if(kind==='bamboo_shard'){
      effectColor='rgb(166,211,83)';
      if(cells.getCell(centerX,centerY)===M.AIR)cells.setCell(centerX,centerY,M.BAMBOO);
    }else if(kind==='branch'){
      effectColor='rgb(121,84,50)';
      if(cells.getCell(centerX,centerY)===M.AIR)cells.setCell(centerX,centerY,M.WOOD);
    }else if(kind==='crystal_shard'){
      effectColor='rgb(177,154,255)';
      if(cells.getCell(centerX,centerY)===M.AIR)cells.setCell(centerX,centerY,M.CRYSTAL);
    }else if(kind==='magma_rock'){
      effectColor='rgb(255,111,40)';
      radius=3;
      paintCircle(centerX,centerY,3,(x,y,type)=>{
        if(type===M.AIR||type===M.SMOKE||type===M.NAPALM||FLAMMABLE_MATERIALS.has(type))cells.setCell(x,y,M.FIRE,80);
      });
      if(!cells.isSolid(cells.getCell(centerX,centerY)))cells.setCell(centerX,centerY,M.LAVA);
    }else if(kind==='shadow_bolt'){
      effectColor='rgb(139,115,218)';
      paintCircle(centerX,centerY,2,(x,y,type)=>{
        if(type===M.AIR)cells.setCell(x,y,M.SMOKE,55);
      });
    }else if(kind==='cannonball'){
      effectColor='rgb(120,148,153)';
      radius=4;
      paintCircle(centerX,centerY,3,(x,y,type)=>{
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
        else if(type===M.AIR&&noise.randomAt(x,y,state.frame+8702)>.65)cells.setCell(x,y,M.WATER);
      });
    }else if(kind==='electric_orb'){
      effectColor='rgb(173,180,255)';
      radius=3;
      paintCircle(centerX,centerY,3,(x,y,type)=>{
        if(type===M.WATER||type===M.AIR||type===M.SMOKE)cells.setCell(x,y,M.STEAM,STEAM_CONFIG.lifeFrames);
      });
    }else if(kind==='world_spit'){
      effectColor='rgb(188,112,65)';
      radius=4;
      paintCircle(centerX,centerY,3,(x,y,type)=>{
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
      });
    }

    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius,
      frames:10,
      maxFrames:10,
      kind:'boss_generic',
      color:effectColor,
    });

    if(Math.hypot(state.player.x-centerX,state.player.y-2-centerY)<=radius+1){
      playerSystem.damage(bossProjectileDamage(kind));
    }
  }

  function strikeLightning(projectile){
    const x=Math.floor(projectile.targetX??projectile.x);
    const {y:originY}=cameraOrigin();
    let impactY=Math.floor(projectile.targetY??state.player.y);
    for(let y=originY+1;y<originY+WORLD_HEIGHT;y++){
      if(cells.isSolid(cells.getCell(x,y))){impactY=y;break;}
    }
    for(let y=originY+1;y<=impactY;y++){
      const type=cells.getCell(x,y);
      if(type===M.WATER)cells.setCell(x,y,M.STEAM,STEAM_CONFIG.lifeFrames);
      else if(type===M.AIR||type===M.SMOKE)cells.setCell(x,y,M.FIRE,28);
    }
    state.entities.explosions.push({x:x,y:impactY,radius:5,frames:12,maxFrames:12,kind:'lightning',color:'rgb(226,239,255)'});
    if(Math.abs(state.player.x-x)<2.5)playerSystem.damage(10);
  }

  function updateGenericProjectiles(){
    const projectiles=state.entities.bossProjectiles;
    for(let i=projectiles.length-1;i>=0;i--){
      const projectile=projectiles[i];
      projectile.life--;
      if(projectile.life<=0){projectiles.splice(i,1);continue;}

      if(projectile.kind==='lightning_marker'){
        projectile.delay--;
        projectile.phase++;
        if(projectile.delay<=0){
          strikeLightning(projectile);
          projectiles.splice(i,1);
        }
        continue;
      }

      if(projectile.kind==='shadow_bolt'||projectile.kind==='electric_orb'){
        const dx=state.player.x-projectile.x;
        const dy=state.player.y-2-projectile.y;
        const distance=Math.hypot(dx,dy)||1;
        const strength=projectile.kind==='shadow_bolt'?.018:.012;
        projectile.vx=(projectile.vx+dx/distance*strength)*.995;
        projectile.vy=(projectile.vy+dy/distance*strength)*.995;
      }

      projectile.vy+=projectile.gravity??0;
      let impacted=false;
      for(let step=0;step<4&&!impacted;step++){
        const nextX=projectile.x+projectile.vx/4;
        const nextY=projectile.y+projectile.vy/4;
        if(!chunks.isActiveWorldPosition(nextX,nextY)){
          projectiles.splice(i,1);
          impacted=true;
          break;
        }
        projectile.x=nextX;
        projectile.y=nextY;
        const type=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        const hitsLiquid=type===M.WATER||type===M.LAVA;
        if(cells.isSolid(type)||hitsLiquid||Math.hypot(state.player.x-nextX,state.player.y-2-nextY)<2.3){
          impactGenericProjectile(projectile);
          projectiles.splice(i,1);
          impacted=true;
        }
      }
    }
  }

  function placeBurstFire(centerX,centerY,radius,salt){
    paintCircle(centerX,centerY,radius,(x,y,material)=>{
      if(material===M.AIR||material===M.SMOKE||material===M.STEAM||material===M.NAPALM||FLAMMABLE_MATERIALS.has(material)){
        const span=CALDERA_BOSS_CONFIG.fireLifeMax-CALDERA_BOSS_CONFIG.fireLifeMin;
        const life=CALDERA_BOSS_CONFIG.fireLifeMin+Math.floor(noise.randomAt(x,y,salt)*span);
        cells.setCell(x,y,M.FIRE,life);
      }
    });
  }

  function explodeFireball(fireball){
    const centerX=Math.floor(fireball.x);
    const centerY=Math.floor(fireball.y);
    placeBurstFire(centerX,centerY,CALDERA_BOSS_CONFIG.fireballBlastRadius,state.frame+4801);
    state.entities.explosions.push({x:centerX,y:centerY,radius:5,frames:10,maxFrames:10,kind:'boss'});
    if(Math.hypot(state.player.x-centerX,state.player.y-2-centerY)<=CALDERA_BOSS_CONFIG.fireballBlastRadius+1)playerSystem.damage(6);
  }

  function splashSerpentProjectile(projectile){
    const centerX=Math.floor(projectile.x);
    const centerY=Math.floor(projectile.y);
    const radius=SEA_SERPENT_CONFIG.splashRadius;
    paintCircle(centerX,centerY,radius,(x,y,material)=>{
      if(material===M.AIR||material===M.SMOKE||material===M.STEAM||material===M.FIRE||material===M.NAPALM)cells.setCell(x,y,M.WATER);
    });
    state.entities.explosions.push({x:centerX,y:centerY,radius:radius+2,frames:9,maxFrames:9,kind:'serpent'});
    if(Math.hypot(state.player.x-centerX,state.player.y-2-centerY)<=radius+1)playerSystem.damage(6);
  }

  function updateBossFireballs(){
    const fireballs=state.entities.bossFireballs;
    for(let i=fireballs.length-1;i>=0;i--){
      const fireball=fireballs[i];
      fireball.life--;
      if(fireball.life<=0){explodeFireball(fireball);fireballs.splice(i,1);continue;}
      fireball.vy+=CALDERA_BOSS_CONFIG.fireballGravity;
      let exploded=false;
      for(let step=0;step<4&&!exploded;step++){
        const nextX=fireball.x+fireball.vx/4;
        const nextY=fireball.y+fireball.vy/4;
        if(!chunks.isActiveWorldPosition(nextX,nextY)){fireballs.splice(i,1);exploded=true;break;}
        fireball.x=nextX;
        fireball.y=nextY;
        const type=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        if(cells.isSolid(type)||type===M.WATER||type===M.LAVA||Math.hypot(state.player.x-nextX,state.player.y-2-nextY)<2.4){
          explodeFireball(fireball);
          fireballs.splice(i,1);
          exploded=true;
        }
      }
    }
  }

  function updateSerpentProjectiles(){
    const projectiles=state.entities.serpentProjectiles;
    for(let i=projectiles.length-1;i>=0;i--){
      const projectile=projectiles[i];
      projectile.life--;
      if(projectile.life<=0){projectiles.splice(i,1);continue;}
      projectile.vy+=SEA_SERPENT_CONFIG.projectileGravity;
      let splashed=false;
      for(let step=0;step<4&&!splashed;step++){
        const nextX=projectile.x+projectile.vx/4;
        const nextY=projectile.y+projectile.vy/4;
        if(!chunks.isActiveWorldPosition(nextX,nextY)){projectiles.splice(i,1);splashed=true;break;}
        projectile.x=nextX;
        projectile.y=nextY;
        const type=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        if(cells.isSolid(type)||type===M.WATER||type===M.LAVA||Math.hypot(state.player.x-nextX,state.player.y-2-nextY)<2.4){
          splashSerpentProjectile(projectile);
          projectiles.splice(i,1);
          splashed=true;
        }
      }
    }
  }

  function defeatBoss(boss,index){
    const definition=bossDefinition(boss.kind);
    state.entities.explosions.push({
      x:boss.x,
      y:boss.y,
      radius:boss.kind===K.WORLD_EATER?17:boss.kind===K.DROWNED_FLEET?15:13,
      frames:22,
      maxFrames:22,
      kind:'boss_defeat',
      color:boss.barHighlight,
    });

    juice?.bossDefeat?.(boss.x,boss.y,boss.barHighlight);
    const record=encounter(boss.kind);
    if(!record.defeated){
      record.defeated=true;
      record.defeatedFrame=state.frame;
      state.world.defeatedBossCount=(state.world.defeatedBossCount??0)+1;
      state.crystals+=definition?.reward??boss.reward??25;
    }

    if(boss.kind===K.CALDERA_TYRANT)state.world.bossDefeated=true;
    if(boss.kind===K.SEA_SERPENT)state.world.seaSerpentDefeated=true;
    state.world.bossCooldownUntil=state.frame+240;
    state.entities.bossFireballs.length=0;
    state.entities.serpentProjectiles.length=0;
    state.entities.bossProjectiles.length=0;
    state.entities.bosses.splice(index,1);
    hud.showMessage(definition?.defeatMessage??`${boss.name} is defeated!`,3800);
  }

  function updateBosses(){
    const bosses=state.entities.bosses;
    for(let i=bosses.length-1;i>=0;i--){
      const boss=bosses[i];
      if(boss.hp<=0){defeatBoss(boss,i);continue;}
      if(boss.hit>0)boss.hit--;
      if(advanceEntry(boss))updateBossFight(boss);
      applyEnvironmentalEffects(boss);
      if(overlapsPlayer(boss))playerSystem.damage(boss.contactDamage);
    }
  }

  function snapBossPositions(){
    for(const key of ['bosses','bossFireballs','serpentProjectiles','bossProjectiles']){
      for(const entity of state.entities[key]){
        snapPixelPosition(entity);
        snapStoredCoordinates(entity,['homeX','homeY','groundY','waterY','targetX','targetY']);
      }
    }
    for(const effect of state.entities.explosions)snapPixelPosition(effect);
  }

  function update(){
    if(!isEarthDimension(state.world.dimension)){
      state.ui.bossRitual=null;
      if(state.entities.bosses.length>0)state.entities.bosses.length=0;
      state.entities.bossFireballs.length=0;
      state.entities.serpentProjectiles.length=0;
      state.entities.bossProjectiles.length=0;
      return;
    }
    if(state.entities.bosses.length===0)trySpawnEncounter();
    updateBosses();
    updateBossFireballs();
    updateSerpentProjectiles();
    updateGenericProjectiles();
    snapBossPositions();
  }

  function spawnBossForTest(kind,overrides={}){
    state.entities.bosses.length=0;
    state.entities.bossFireballs.length=0;
    state.entities.serpentProjectiles.length=0;
    state.entities.bossProjectiles.length=0;
    const definition=bossDefinition(kind);
    if(!definition)throw new Error(`Unknown boss kind: ${kind}`);
    const surface=generator.surfaceAt(state.player.x+18);
    const homeY=overrides.homeY??(
      [K.MYCELIAL_MONARCH,K.CRYSTAL_BURROWER,K.MAGMA_BEHEMOTH,K.WORLD_EATER].includes(kind)
        ?state.player.y-4
        :surface.ground-definition.height*.5-1
    );
    return spawnBoss(kind,{
      regionIndex:Math.floor(state.player.x/BIOME_REGION_SIZE),
      homeX:overrides.homeX??state.player.x+18,
      homeY,
      groundY:surface.ground,
      waterY:surface.water,
      entry:overrides.entry??definition.entry,
      announce:false,
      ...overrides,
    });
  }

  return {
    update,
    spawnBossForTest,
    encounter,
    bossKinds:BOSS_KINDS,
  };
}

Object.assign(exports,{createBossSystem});

};

__modules["src/data/bosses.db.js"]=function(exports,__require){
const BossKind = Object.freeze({
  CALDERA_TYRANT:'caldera_tyrant',
  SEA_SERPENT:'sea_serpent',
  FROST_COLOSSUS:'frost_colossus',
  BOG_LEVIATHAN:'bog_leviathan',
  MYCELIAL_MONARCH:'mycelial_monarch',
  BAMBOO_WAR_MACHINE:'bamboo_war_machine',
  CANOPY_WYRM:'canopy_wyrm',
  CRYSTAL_BURROWER:'crystal_burrower',
  MAGMA_BEHEMOTH:'magma_behemoth',
  STORM_ROC:'storm_roc',
  MOON_STALKER:'moon_stalker',
  DROWNED_FLEET:'drowned_fleet',
  SKY_JELLYFISH:'sky_jellyfish',
  WORLD_EATER:'world_eater',
});

const K=BossKind;

const BOSS_DB=Object.freeze({
  [K.CALDERA_TYRANT]:Object.freeze({
    kind:K.CALDERA_TYRANT,
    name:'Caldera Tyrant',
    maxHealth:320,
    width:17,
    height:11,
    contactDamage:8,
    reward:25,
    entry:'above',
    projectile:'fireball',
    message:'A caldera tyrant flies in from above!',
    defeatMessage:'The caldera tyrant is defeated!',
    barBack:'rgb(74,32,40)',
    barFill:'rgb(255,96,56)',
    barHighlight:'rgb(255,214,164)',
  }),
  [K.SEA_SERPENT]:Object.freeze({
    kind:K.SEA_SERPENT,
    name:'Abyssal Sea Serpent',
    maxHealth:380,
    width:15,
    height:14,
    contactDamage:9,
    reward:30,
    entry:'below_water',
    projectile:'water_burst',
    message:'The ocean churns — a sea serpent rises!',
    defeatMessage:'The abyssal sea serpent is defeated!',
    barBack:'rgb(18,64,84)',
    barFill:'rgb(54,190,190)',
    barHighlight:'rgb(180,246,244)',
  }),
  [K.FROST_COLOSSUS]:Object.freeze({
    kind:K.FROST_COLOSSUS,
    name:'Frost Colossus',
    maxHealth:420,
    width:17,
    height:15,
    contactDamage:9,
    reward:28,
    entry:'assemble',
    projectile:'ice_boulder',
    message:'The snow gathers into a frost colossus!',
    defeatMessage:'The frost colossus collapses into snow!',
    barBack:'rgb(54,77,104)',
    barFill:'rgb(132,204,236)',
    barHighlight:'rgb(235,250,255)',
  }),
  [K.BOG_LEVIATHAN]:Object.freeze({
    kind:K.BOG_LEVIATHAN,
    name:'Bog Leviathan',
    maxHealth:390,
    width:19,
    height:11,
    contactDamage:9,
    reward:27,
    entry:'below_ground',
    projectile:'mud_glob',
    message:'The swamp bubbles — a bog leviathan erupts!',
    defeatMessage:'The bog leviathan sinks into the mire!',
    barBack:'rgb(57,68,45)',
    barFill:'rgb(127,163,78)',
    barHighlight:'rgb(218,233,145)',
  }),
  [K.MYCELIAL_MONARCH]:Object.freeze({
    kind:K.MYCELIAL_MONARCH,
    name:'Mycelial Monarch',
    maxHealth:440,
    width:21,
    height:15,
    contactDamage:7,
    reward:32,
    entry:'rooted',
    projectile:'spore',
    message:'The cavern roots awaken the mycelial monarch!',
    defeatMessage:'The mycelial monarch withers!',
    barBack:'rgb(68,40,73)',
    barFill:'rgb(201,91,190)',
    barHighlight:'rgb(255,211,247)',
  }),
  [K.BAMBOO_WAR_MACHINE]:Object.freeze({
    kind:K.BAMBOO_WAR_MACHINE,
    name:'Bamboo War Machine',
    maxHealth:410,
    width:19,
    height:13,
    contactDamage:10,
    reward:29,
    entry:'above',
    projectile:'bamboo_shard',
    message:'An ancient bamboo war machine crashes down!',
    defeatMessage:'The bamboo war machine splinters!',
    barBack:'rgb(48,74,42)',
    barFill:'rgb(116,181,64)',
    barHighlight:'rgb(220,242,137)',
  }),
  [K.CANOPY_WYRM]:Object.freeze({
    kind:K.CANOPY_WYRM,
    name:'Ancient Canopy Wyrm',
    maxHealth:360,
    width:23,
    height:9,
    contactDamage:8,
    reward:28,
    entry:'above',
    projectile:'branch',
    message:'The canopy parts as an ancient wyrm descends!',
    defeatMessage:'The ancient canopy wyrm falls!',
    barBack:'rgb(35,70,50)',
    barFill:'rgb(72,166,91)',
    barHighlight:'rgb(194,237,174)',
  }),
  [K.CRYSTAL_BURROWER]:Object.freeze({
    kind:K.CRYSTAL_BURROWER,
    name:'Crystal Burrower',
    maxHealth:460,
    width:25,
    height:9,
    contactDamage:11,
    reward:35,
    entry:'side',
    projectile:'crystal_shard',
    message:'Crystal veins fracture — something is burrowing closer!',
    defeatMessage:'The crystal burrower shatters!',
    barBack:'rgb(46,43,92)',
    barFill:'rgb(126,110,241)',
    barHighlight:'rgb(226,219,255)',
  }),
  [K.MAGMA_BEHEMOTH]:Object.freeze({
    kind:K.MAGMA_BEHEMOTH,
    name:'Magma Behemoth',
    maxHealth:500,
    width:21,
    height:15,
    contactDamage:12,
    reward:38,
    entry:'below_ground',
    projectile:'magma_rock',
    message:'The magma reservoir heaves — a behemoth rises!',
    defeatMessage:'The magma behemoth cools and fractures!',
    barBack:'rgb(80,33,25)',
    barFill:'rgb(232,76,32)',
    barHighlight:'rgb(255,205,105)',
  }),
  [K.STORM_ROC]:Object.freeze({
    kind:K.STORM_ROC,
    name:'Storm Roc',
    maxHealth:370,
    width:25,
    height:11,
    contactDamage:9,
    reward:30,
    entry:'above',
    projectile:'lightning_marker',
    message:'Storm clouds gather — the storm roc dives!',
    defeatMessage:'The storm roc crashes from the sky!',
    barBack:'rgb(47,53,76)',
    barFill:'rgb(106,143,213)',
    barHighlight:'rgb(226,239,255)',
  }),
  [K.MOON_STALKER]:Object.freeze({
    kind:K.MOON_STALKER,
    name:'Moon Stalker',
    maxHealth:340,
    width:13,
    height:15,
    contactDamage:10,
    reward:34,
    entry:'shadow',
    projectile:'shadow_bolt',
    message:'A moon stalker steps out of the darkness!',
    defeatMessage:'The moon stalker dissolves into dawn mist!',
    barBack:'rgb(37,34,68)',
    barFill:'rgb(111,92,193)',
    barHighlight:'rgb(222,215,255)',
  }),
  [K.DROWNED_FLEET]:Object.freeze({
    kind:K.DROWNED_FLEET,
    name:'The Drowned Fleet',
    maxHealth:520,
    width:29,
    height:13,
    contactDamage:8,
    reward:40,
    entry:'below_water',
    projectile:'cannonball',
    message:'A drowned warship tears through the ocean surface!',
    defeatMessage:'The drowned fleet sinks for the last time!',
    barBack:'rgb(42,59,65)',
    barFill:'rgb(88,151,154)',
    barHighlight:'rgb(197,230,220)',
  }),
  [K.SKY_JELLYFISH]:Object.freeze({
    kind:K.SKY_JELLYFISH,
    name:'Sky Jellyfish',
    maxHealth:400,
    width:19,
    height:17,
    contactDamage:8,
    reward:36,
    entry:'above',
    projectile:'electric_orb',
    message:'A luminous sky jellyfish drifts down from the clouds!',
    defeatMessage:'The sky jellyfish disperses in sparks!',
    barBack:'rgb(55,49,86)',
    barFill:'rgb(128,121,231)',
    barHighlight:'rgb(221,227,255)',
  }),
  [K.WORLD_EATER]:Object.freeze({
    kind:K.WORLD_EATER,
    name:'The World Eater',
    maxHealth:650,
    width:31,
    height:11,
    contactDamage:14,
    reward:50,
    entry:'side',
    projectile:'world_spit',
    message:'The ground tears open — the world eater has arrived!',
    defeatMessage:'The world eater is finally still!',
    barBack:'rgb(63,43,34)',
    barFill:'rgb(170,91,53)',
    barHighlight:'rgb(244,207,151)',
  }),
});

const BOSS_KINDS=Object.freeze(Object.values(BossKind));

function bossDefinition(kind){
  return BOSS_DB[kind]??null;
}

Object.assign(exports,{BossKind,BOSS_DB,BOSS_KINDS,bossDefinition});

};

__modules["src/data/boss-rituals.db.js"]=function(exports,__require){
const { BossKind } = __require("src/data/bosses.db.js");
const K=BossKind;

const BOSS_RITUAL_DB=Object.freeze({
  [K.CALDERA_TYRANT]:Object.freeze({
    title:'WAKE THE CALDERA',
    hint:'STAND ABOVE THE CRATER HEAT',
    progressFrames:180,
  }),
  [K.SEA_SERPENT]:Object.freeze({
    title:'BAIT THE ABYSS',
    hint:'CARRY FISH INTO DEEP WATER',
    progressFrames:180,
  }),
  [K.FROST_COLOSSUS]:Object.freeze({
    title:'BUILD A SNOW IDOL',
    hint:'12 SNOW DURING SNOWFALL',
    progressFrames:180,
  }),
  [K.BOG_LEVIATHAN]:Object.freeze({
    title:'VENOM OFFERING',
    hint:'3 VENOM SACS IN SWAMP MIRE',
    progressFrames:180,
  }),
  [K.MYCELIAL_MONARCH]:Object.freeze({
    title:'BURN THE DEEP ROOTS',
    hint:'KEEP 3 FIRES AMONG MYCELIUM',
    progressFrames:180,
  }),
  [K.BAMBOO_WAR_MACHINE]:Object.freeze({
    title:'LIGHT THE SIGNAL GROVE',
    hint:'BURN BAMBOO WITH 8 IN PACK',
    progressFrames:180,
  }),
  [K.CANOPY_WYRM]:Object.freeze({
    title:'CALL FROM THE CANOPY',
    hint:'CLIMB HIGH WITH 2 BRIGHT FEATHERS',
    progressFrames:180,
  }),
  [K.CRYSTAL_BURROWER]:Object.freeze({
    title:'RESONATE THE VEIN',
    hint:'5 CRYSTAL FRAGMENTS BY DEEP CRYSTAL',
    progressFrames:180,
  }),
  [K.MAGMA_BEHEMOTH]:Object.freeze({
    title:'QUENCH THE MAGMA HEART',
    hint:'MAKE STEAM BESIDE DEEP LAVA',
    progressFrames:180,
  }),
  [K.STORM_ROC]:Object.freeze({
    title:'CHALLENGE THE STORM',
    hint:'STAND UNCOVERED IN PLAINS THUNDER',
    progressFrames:240,
  }),
  [K.MOON_STALKER]:Object.freeze({
    title:'WAIT IN TRUE DARKNESS',
    hint:'STAND STILL AT NIGHT WITHOUT FIRE',
    progressFrames:240,
  }),
  [K.DROWNED_FLEET]:Object.freeze({
    title:'PAY THE DROWNED',
    hint:'3 PEARLS DURING AN OCEAN STORM',
    progressFrames:180,
  }),
  [K.SKY_JELLYFISH]:Object.freeze({
    title:'CHARGE THE SKY',
    hint:'2 ELECTRIC GLANDS IN A HIGH STORM',
    progressFrames:180,
  }),
  [K.WORLD_EATER]:Object.freeze({
    title:'DRAW THE WORLD EATER',
    hint:'GO DEEP AFTER 5 BOSS VICTORIES',
    progressFrames:180,
  }),
});

function bossRitualDefinition(kind){
  return BOSS_RITUAL_DB[kind]??null;
}

Object.assign(exports,{BOSS_RITUAL_DB,bossRitualDefinition});

};

__modules["src/systems/material-system.js"]=function(exports,__require){
const { MaterialId, POWDER_MATERIALS, FLAMMABLE_MATERIALS, GAS_MATERIALS } = __require("src/data/materials.db.js");
const { WORLD_WIDTH, WORLD_HEIGHT, DIRT_GRASS_CONFIG, STEAM_CONFIG, NAPALM_CONFIG, WEATHER_CONFIG } = __require("src/config.js");
function createMaterialSystem(state,cells,noise,weatherSystem=null){
  const M=MaterialId;
  const STUCK_NAPALM_LIFE=1;

  function driftGasWithWind(x,y){
    const wind=weatherSystem?.windX?.()??0;
    if(Math.abs(wind)<.12)return false;
    const direction=Math.sign(wind);
    const chance=Math.min(.92,Math.abs(wind)*WEATHER_CONFIG.windGasChance);
    if(noise.randomAt(x,y,state.frame+699)>chance)return false;
    const target=cells.getCell(x+direction,y);
    if(target===M.AIR){
      cells.swapCells(x,y,x+direction,y);
      return true;
    }
    return false;
  }

  function touchesHeat(x,y){
    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const type=cells.getCell(x+offsetX,y+offsetY);
      if(type===M.FIRE||type===M.LAVA)return true;
    }
    return false;
  }

  function touchesSolid(x,y){
    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(cells.isSolid(cells.getCell(x+offsetX,y+offsetY)))return true;
    }
    return false;
  }

  function updateFire(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,noise.randomAt(x,y,state.frame+700)<.72?M.SMOKE:M.AIR,25);
      return;
    }

    cells.setLife(x,y,life-1);

    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nextX=x+offsetX;
      const nextY=y+offsetY;
      const type=cells.getCell(nextX,nextY);

      if(type===M.SNOW){
        cells.setCell(nextX,nextY,M.WATER);
      }else if(type===M.WATER){
        cells.setCell(nextX,nextY,M.STEAM,STEAM_CONFIG.lifeFrames);
      }else if(type===M.NAPALM){
        cells.setCell(nextX,nextY,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      }else if(FLAMMABLE_MATERIALS.has(type)&&noise.randomAt(nextX,nextY,state.frame)<.07){
        cells.setCell(nextX,nextY,M.FIRE,type===M.LEAF?55:80);
      }
    }

    if(cells.getCell(x,y-1)===M.AIR&&noise.randomAt(x,y,state.frame+4)<.58){
      cells.swapCells(x,y,x,y-1);
      return;
    }

    const direction=noise.randomAt(x,y,state.frame+5)<.5?-1:1;
    if(cells.getCell(x+direction,y-1)===M.AIR&&noise.randomAt(x,y,state.frame+6)<.45){
      cells.swapCells(x,y,x+direction,y-1);
    }
  }

  function updateSmoke(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,M.AIR);
      return;
    }

    cells.setLife(x,y,life-1);
    if(driftGasWithWind(x,y))return;
    const direction=noise.randomAt(x,y,state.frame+720)<.5?-1:1;

    if(cells.getCell(x,y-1)===M.AIR)cells.swapCells(x,y,x,y-1);
    else if(cells.getCell(x+direction,y-1)===M.AIR)cells.swapCells(x,y,x+direction,y-1);
    else if(cells.getCell(x+direction,y)===M.AIR&&noise.randomAt(x,y,state.frame+721)<.22){
      cells.swapCells(x,y,x+direction,y);
    }
  }

  function updateSteam(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,M.AIR);
      return;
    }

    cells.setLife(x,y,life-1);
    if(driftGasWithWind(x,y))return;
    const direction=noise.randomAt(x,y,state.frame+760)<.5?-1:1;
    const destinations=[
      [x,y-1],
      [x+direction,y-1],
      [x-direction,y-1],
      [x+direction,y],
    ];

    for(const [nextX,nextY] of destinations){
      const type=cells.getCell(nextX,nextY);
      if(type===M.AIR||type===M.SMOKE){
        cells.swapCells(x,y,nextX,nextY);
        return;
      }
    }
  }

  function updateNapalm(x,y){
    // Fire and lava override the timer: touching either ignites this pixel now.
    if(touchesHeat(x,y)){
      cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }

    const age=cells.getAge(x,y)+NAPALM_CONFIG.simulationStepFrames;
    if(age>=NAPALM_CONFIG.ignitionFrames){
      cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }

    cells.setAge(x,y,age);

    // A napalm pixel adheres as soon as it touches any solid surface. The life
    // channel is otherwise unused by napalm, so it acts as a compact stuck flag.
    if(cells.getLife(x,y)===STUCK_NAPALM_LIFE||touchesSolid(x,y)){
      cells.setLife(x,y,STUCK_NAPALM_LIFE);
      return;
    }

    const position=updateLiquid(x,y,M.NAPALM);
    if(touchesHeat(position.x,position.y)){
      cells.setCell(position.x,position.y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }
    if(touchesSolid(position.x,position.y))cells.setLife(position.x,position.y,STUCK_NAPALM_LIFE);
  }

  function updatePowder(x,y,type){
    const below=cells.getCell(x,y+1);
    if(below===M.AIR||below===M.WATER||below===M.NAPALM){
      cells.swapCells(x,y,x,y+1);
      return;
    }

    const direction=noise.randomAt(x,y,state.frame)<.5?-1:1;
    const diagonal=cells.getCell(x+direction,y+1);
    if(diagonal===M.AIR||diagonal===M.WATER||diagonal===M.NAPALM){
      cells.swapCells(x,y,x+direction,y+1);
      return;
    }

    if(type===M.MUD&&state.frame%4===0&&cells.getCell(x+direction,y)===M.AIR){
      cells.swapCells(x,y,x+direction,y);
    }
  }

  function updateDirt(x,y){
    if(cells.getCell(x,y-1)!==M.AIR){
      if(cells.getAge(x,y)!==0)cells.setAge(x,y,0);
      return;
    }

    const age=cells.getAge(x,y)+DIRT_GRASS_CONFIG.updateStepFrames;
    if(age>=DIRT_GRASS_CONFIG.exposedFrames){
      cells.setCell(x,y,M.GRASS);
      return;
    }
    cells.setAge(x,y,age);
  }

  function moveLiquidInto(x,y,targetX,targetY){
    const targetType=cells.getCell(targetX,targetY);

    if(targetType===M.AIR){
      cells.swapCells(x,y,targetX,targetY);
      return {x:targetX,y:targetY};
    }

    if(!GAS_MATERIALS.has(targetType))return null;

    // Liquids never treat smoke or steam as a wall. Prefer pushing the gas
    // one cell farther down; if that space is occupied, swap positions so
    // the liquid still displaces it instead of being blocked.
    if(cells.getCell(targetX,targetY+1)===M.AIR){
      cells.swapCells(targetX,targetY,targetX,targetY+1);
      cells.swapCells(x,y,targetX,targetY);
    }else{
      cells.swapCells(x,y,targetX,targetY);
    }

    return {x:targetX,y:targetY};
  }

  function updateLiquid(x,y,type){
    let position=moveLiquidInto(x,y,x,y+1);

    if(!position){
      const direction=noise.randomAt(x,y,state.frame+44)<.5?-1:1;
      position=moveLiquidInto(x,y,x+direction,y)
        ||moveLiquidInto(x,y,x-direction,y)
        ||{x,y};
    }

    if(type!==M.LAVA)return position;

    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nextX=position.x+offsetX;
      const nextY=position.y+offsetY;
      const neighbor=cells.getCell(nextX,nextY);

      if(neighbor===M.WATER){
        cells.setCell(position.x,position.y,M.ROCK);
        cells.setCell(nextX,nextY,M.STEAM,STEAM_CONFIG.lifeFrames);
        break;
      }

      if(neighbor===M.NAPALM){
        cells.setCell(nextX,nextY,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      }else if(FLAMMABLE_MATERIALS.has(neighbor)){
        cells.setCell(nextX,nextY,M.FIRE,65);
      }
    }

    return position;
  }

  let lastProcessedCount=0;

  function compactActiveQueue(chunk){
    const next=[];
    chunk.activeMaterialQueued.fill(0);
    for(const index of chunk.activeMaterialQueue){
      if(!chunk.activeMaterialFlags[index]||chunk.activeMaterialQueued[index])continue;
      chunk.activeMaterialQueued[index]=1;
      next.push(index);
    }
    chunk.activeMaterialQueue=next;
  }

  function update(){
    state.world.simulationStamp++;
    if(state.world.simulationStamp>=65535){
      state.world.simulationStamp=1;
      for(const chunk of state.world.activeChunks)chunk.moved.fill(0);
    }

    const stamp=state.world.simulationStamp;
    const camera=state.world.camera;
    const chunk=state.world.activeChunks.find(item=>item.x===camera.chunkX&&item.y===camera.chunkY)??null;
    if(!chunk){ lastProcessedCount=0; return; }
    cells.initializeChunkTracking(chunk);

    // Only the visible chunk is simulated. The 3x3 neighborhood remains loaded
    // for collision, generation, and seamless crossing, but off-screen liquids
    // and powders sleep until their chunk becomes visible.
    const queue=chunk.activeMaterialQueue;
    const initialLength=queue.length;
    const reverse=state.frame%4>=2;
    let processed=0;

    for(let pass=0;pass<initialLength;pass++){
      const queueIndex=reverse?initialLength-1-pass:pass;
      const index=queue[queueIndex];
      if(!chunk.activeMaterialFlags[index]||chunk.moved[index]===stamp)continue;

      const x=index%WORLD_WIDTH;
      const y=Math.floor(index/WORLD_WIDTH);
      const type=chunk.cells[index];
      const worldX=chunk.x*WORLD_WIDTH+x;
      const worldY=chunk.y*WORLD_HEIGHT+y;
      processed++;

      if(type===M.DIRT)updateDirt(worldX,worldY);
      else if(type===M.FIRE)updateFire(worldX,worldY);
      else if(type===M.SMOKE)updateSmoke(worldX,worldY);
      else if(type===M.STEAM)updateSteam(worldX,worldY);
      else if(type===M.NAPALM)updateNapalm(worldX,worldY);
      else if(POWDER_MATERIALS.has(type))updatePowder(worldX,worldY,type);
      else if(type===M.WATER||type===M.LAVA)updateLiquid(worldX,worldY,type);
    }

    lastProcessedCount=processed;
    if(state.frame%240===0||queue.length>Math.max(2048,chunk.activeMaterialCount*2+512)){
      compactActiveQueue(chunk);
    }
  }

  function getLastProcessedCount(){ return lastProcessedCount; }

  return { update, updateDirt, updateFire, updateSteam, getLastProcessedCount };
}

Object.assign(exports,{createMaterialSystem});

};

__modules["src/systems/input-system.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_CONFIG, MAGNIFIER_CONFIG } = __require("src/config.js");
const { nearestPixel } = __require("src/pixel-grid.js");
const { PORTAL_CODES } = __require("src/data/dimensions.db.js");
function createInputSystem(state,canvas,actions){
  const portalCodeTimeoutMs=3200;
  const jumpKeys=new Set(['w','arrowup',' ']);
  const preventedKeys=new Set([
    'a','d','w','q','e','r','p','i','o','k','f','tab','enter','escape','delete','f5','f9',
    'arrowleft','arrowright','arrowup','arrowdown',' ',
  ]);

  function updatePointer(event){
    const rect=canvas.getBoundingClientRect();
    const width=canvas.width||WORLD_WIDTH;
    const height=canvas.height||WORLD_HEIGHT;
    const localX=(event.clientX-rect.left)/Math.max(1,rect.width)*width;
    const localY=(event.clientY-rect.top)/Math.max(1,rect.height)*height;
    state.input.pointerX=Math.max(0,Math.min(width-1,nearestPixel(localX)));
    state.input.pointerY=Math.max(0,Math.min(height-1,nearestPixel(localY)));
    if(event.pointerType==='touch')state.input.touchMode=true;
  }

  function inventoryItems(){ return state.inventory.list(); }

  function activateInventoryIndex(index=state.ui.inventoryIndex){
    const items=inventoryItems();
    if(items.length===0)return false;
    const safeIndex=Math.max(0,Math.min(items.length-1,index));
    state.ui.inventoryIndex=safeIndex;
    const item=items[safeIndex];
    if(item.kind==='material'&&item.placeable)return actions.equipMaterial(item.materialId);
    if(item.kind==='furniture')return actions.equipFurniture(item.furnitureId);
    if(item.kind==='seed')return actions.equipSeed(item.cropId);
    if(item.kind==='produce')return actions.eatProduce(item.cropId);
    if(item.kind==='loot'&&item.edible)return actions.eatLoot(item.lootId);
    return false;
  }

  function moveInventorySelection(delta){
    const length=inventoryItems().length;
    if(length===0){ state.ui.inventoryIndex=0; return; }
    state.ui.inventoryIndex=(state.ui.inventoryIndex+delta+length)%length;
    actions.updateHud();
  }

  function resetPointerActions(){
    state.input.keys.clear();
    state.input.pointerDown=false;
    state.entities.hook.active=false;
  }

  function toggleInventory(force=null){
    state.ui.inventoryOpen=force===null?!state.ui.inventoryOpen:Boolean(force);
    if(state.ui.inventoryOpen){
      state.ui.worldMenuOpen=false;
      state.ui.craftingOpen=false;
      state.ui.confirmWorldAction='';
    }
    resetPointerActions();
    actions.updateHud();
  }

  function craftingEntries(){ return state.ui.hud?.crafting??[]; }

  function moveCraftingSelection(delta){
    const length=craftingEntries().length;
    if(length===0){ state.ui.craftingIndex=0; return; }
    state.ui.craftingIndex=(state.ui.craftingIndex+delta+length)%length;
    actions.updateHud();
  }

  function activateCraftingIndex(index=state.ui.craftingIndex){
    const entries=craftingEntries();
    if(entries.length===0)return false;
    const safeIndex=Math.max(0,Math.min(entries.length-1,index));
    state.ui.craftingIndex=safeIndex;
    return actions.craftFurniture(entries[safeIndex].id);
  }

  function toggleCrafting(force=null){
    state.ui.craftingOpen=force===null?!state.ui.craftingOpen:Boolean(force);
    if(state.ui.craftingOpen){
      state.ui.inventoryOpen=false;
      if(state.ui.worldMenuOpen)state.paused=Boolean(state.ui.worldMenuReturnPaused);
      state.ui.worldMenuOpen=false;
      state.ui.confirmWorldAction='';
    }
    resetPointerActions();
    actions.updateHud();
  }

  function toggleWorldMenu(force=null){
    const opening=force===null?!state.ui.worldMenuOpen:Boolean(force);
    if(opening&&!state.ui.worldMenuOpen){
      state.ui.worldMenuReturnPaused=state.paused;
      state.paused=true;
      state.ui.inventoryOpen=false;
      state.ui.craftingOpen=false;
      state.ui.worldSlotIndex=Math.max(0,(state.save.activeSlot||1)-1);
      actions.refreshSaveSlots();
    }else if(!opening&&state.ui.worldMenuOpen){
      state.paused=Boolean(state.ui.worldMenuReturnPaused);
    }
    state.ui.worldMenuOpen=opening;
    state.ui.confirmWorldAction='';
    state.ui.confirmWorldSlot=0;
    resetPointerActions();
    actions.updateHud();
  }

  function selectWorldSlot(delta){
    const count=Math.max(1,state.ui.saveSlots.length||3);
    state.ui.worldSlotIndex=(state.ui.worldSlotIndex+delta+count)%count;
    state.ui.confirmWorldAction='';
    actions.updateHud();
  }

  function slotNumber(index=state.ui.worldSlotIndex){ return Math.max(1,Math.min(3,index+1)); }

  function performWorldAction(action,slot){
    const safeSlot=Math.max(1,Math.min(3,Math.round(Number(slot)||1)));
    if(action==='load'){
      if(actions.loadWorld(safeSlot))toggleWorldMenu(false);
      return true;
    }
    if(action==='save'){
      actions.saveWorld(safeSlot);
      actions.refreshSaveSlots();
      actions.updateHud();
      return true;
    }
    if(action==='new'){
      if(state.ui.confirmWorldAction!=='new'||state.ui.confirmWorldSlot!==safeSlot){
        state.ui.confirmWorldAction='new';
        state.ui.confirmWorldSlot=safeSlot;
        actions.updateHud();
        return true;
      }
      actions.newWorldInSlot(safeSlot);
      state.ui.confirmWorldAction='';
      return true;
    }
    if(action==='delete'){
      if(state.ui.confirmWorldAction!=='delete'||state.ui.confirmWorldSlot!==safeSlot){
        state.ui.confirmWorldAction='delete';
        state.ui.confirmWorldSlot=safeSlot;
        actions.updateHud();
        return true;
      }
      actions.deleteWorld(safeSlot);
      state.ui.confirmWorldAction='';
      actions.refreshSaveSlots();
      actions.updateHud();
      return true;
    }
    return false;
  }

  function hitCanvasUi(){
    for(let index=state.ui.inventoryRects.length-1;index>=0;index--){
      const rect=state.ui.inventoryRects[index];
      if(state.input.pointerX<rect.x||state.input.pointerY<rect.y||state.input.pointerX>=rect.x+rect.w||state.input.pointerY>=rect.y+rect.h)continue;
      if(rect.kind==='inventory-toggle')toggleInventory();
      else if(rect.kind==='crafting-toggle')toggleCrafting();
      else if(rect.kind==='world-toggle')toggleWorldMenu();
      else if(rect.kind==='save-current')actions.saveWorld();
      else if(rect.kind==='pause-toggle')actions.togglePause();
      else if(rect.kind==='new-world')toggleWorldMenu(true);
      else if(rect.kind==='inventory-close')toggleInventory(false);
      else if(rect.kind==='crafting-close')toggleCrafting(false);
      else if(rect.kind==='world-close')toggleWorldMenu(false);
      else if(rect.kind==='inventory-item')activateInventoryIndex(rect.index);
      else if(rect.kind==='crafting-item')activateCraftingIndex(rect.index);
      else if(rect.kind==='world-slot'){
        state.ui.worldSlotIndex=rect.slot-1;
        state.ui.confirmWorldAction='';
        actions.updateHud();
      }else if(rect.kind.startsWith('world-'))performWorldAction(rect.kind.slice(6),rect.slot);
      return true;
    }
    return false;
  }

  function onPointerDown(event){
    state.input.pointerInside=true;
    state.input.pointerButton=event.button;
    updatePointer(event);
    if(hitCanvasUi())return;
    if(state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    state.input.pointerDown=true;
    canvas.setPointerCapture?.(event.pointerId);
    actions.attack();
  }

  function onPointerUp(event){
    state.input.pointerDown=false;
    state.input.pointerButton=0;
    state.entities.hook.active=false;
    if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event){
    event.preventDefault();
    state.input.pointerInside=true;
    updatePointer(event);
    if(state.ui.worldMenuOpen){
      selectWorldSlot(event.deltaY<0?-1:1);
      return;
    }
    if(state.ui.craftingOpen){
      moveCraftingSelection(event.deltaY<0?-1:1);
      return;
    }
    if(state.ui.inventoryOpen){
      moveInventorySelection(event.deltaY<0?-1:1);
      return;
    }
    const delta=event.deltaY<0?MAGNIFIER_CONFIG.zoomStep:-MAGNIFIER_CONFIG.zoomStep;
    state.magnifier.zoom=Math.max(
      MAGNIFIER_CONFIG.minZoom,
      Math.min(MAGNIFIER_CONFIG.maxZoom,state.magnifier.zoom+delta),
    );
    actions.updateHud();
  }


  function capturePortalCode(key,event){
    if(event.repeat||key.length!==1||key<'a'||key>'z')return false;
    const now=Date.now();
    if(now>(state.input.portalCodeUntil||0))state.input.portalCodeBuffer='';
    const current=String(state.input.portalCodeBuffer??'');
    const attempt=current+key;
    const prefixMatches=PORTAL_CODES.filter(item=>item.code.startsWith(attempt));
    if(prefixMatches.length>0){
      state.input.portalCodeBuffer=attempt;
      state.input.portalCodeUntil=now+portalCodeTimeoutMs;
      const exact=prefixMatches.find(item=>item.code===attempt);
      if(exact){
        state.input.portalCodeBuffer='';
        state.input.portalCodeUntil=0;
        if(actions.openDimensionPortal)actions.openDimensionPortal(exact.dimension);
        else if(exact.dimension==='moon')actions.openMoonPortal?.();
      }
      return true;
    }
    const restart=PORTAL_CODES.filter(item=>item.code.startsWith(key));
    if(restart.length>0){
      state.input.portalCodeBuffer=key;
      state.input.portalCodeUntil=now+portalCodeTimeoutMs;
      const exact=restart.find(item=>item.code===key);
      if(exact){
        state.input.portalCodeBuffer='';
        state.input.portalCodeUntil=0;
        if(actions.openDimensionPortal)actions.openDimensionPortal(exact.dimension);
        else if(exact.dimension==='moon')actions.openMoonPortal?.();
      }
      return true;
    }
    state.input.portalCodeBuffer='';
    state.input.portalCodeUntil=0;
    return false;
  }

  function onKeyDown(event){
    const key=event.key.toLowerCase();
    if(capturePortalCode(key,event)){ event.preventDefault(); return; }
    if(preventedKeys.has(key))event.preventDefault();

    if(key==='f5'&&!event.repeat){ actions.saveWorld(); return; }
    if(key==='f9'&&!event.repeat){ actions.loadWorld(); return; }
    if(key==='o'&&!event.repeat){ toggleWorldMenu(); return; }
    if(key==='k'&&!event.repeat){ toggleCrafting(); return; }

    if(state.ui.worldMenuOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)selectWorldSlot(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)selectWorldSlot(1);
      else if(key==='enter'&&!event.repeat){
        const slot=slotNumber();
        const metadata=state.ui.saveSlots[slot-1];
        performWorldAction(metadata?.empty?'new':'load',slot);
      }else if(key==='n'&&!event.repeat)performWorldAction('new',slotNumber());
      else if(key==='delete'&&!event.repeat)performWorldAction('delete',slotNumber());
      else if(key==='escape'&&!event.repeat)toggleWorldMenu(false);
      return;
    }

    if(state.ui.craftingOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)moveCraftingSelection(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)moveCraftingSelection(1);
      else if(key==='enter'&&!event.repeat)activateCraftingIndex();
      else if(key==='escape'&&!event.repeat)toggleCrafting(false);
      return;
    }

    if((key==='i'||key==='tab')&&!event.repeat){
      toggleInventory();
      return;
    }

    if(state.ui.inventoryOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)moveInventorySelection(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)moveInventorySelection(1);
      else if(key==='enter'&&!event.repeat)activateInventoryIndex();
      else if(key==='escape'&&!event.repeat)toggleInventory(false);
      return;
    }

    if(key==='p'&&!event.repeat){ actions.togglePause(); return; }
    if(key==='r'&&!event.repeat){ toggleWorldMenu(true); return; }
    if(state.paused)return;
    if(key==='f'&&!event.repeat){ actions.interactFurniture(); return; }

    if(jumpKeys.has(key)&&!event.repeat)state.jumpBuffer=PLAYER_CONFIG.jumpBufferFrames;

    if(key==='q'&&!event.repeat)actions.cycleWeapon();
    else if(key==='e'&&!event.repeat)actions.cycleMaterial();
    else if(key==='escape'&&!event.repeat)actions.exitBuildMode(true);
    else state.input.keys.add(key);
  }

  function onKeyUp(event){
    const key=event.key.toLowerCase();
    state.input.keys.delete(key);
    if(jumpKeys.has(key))actions.releaseJump();
  }

  function onBlur(){
    state.input.keys.clear();
    state.input.pointerDown=false;
    state.input.pointerButton=0;
    state.input.pointerInside=false;
    state.entities.hook.active=false;
    state.input.portalCodeBuffer='';
    state.input.portalCodeUntil=0;
    state.input.moonMeIndex=0;
    state.input.moonMeUntil=0;
  }

  function install(){
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.addEventListener('pointerenter',event=>{
      state.input.pointerInside=true;
      updatePointer(event);
    });
    canvas.addEventListener('pointerleave',()=>{
      if(!state.input.touchMode)state.input.pointerInside=false;
    });
    canvas.addEventListener('pointerdown',onPointerDown);
    canvas.addEventListener('pointermove',event=>{
      state.input.pointerInside=true;
      updatePointer(event);
    });
    canvas.addEventListener('pointerup',onPointerUp);
    canvas.addEventListener('pointercancel',()=>{
      state.input.pointerDown=false;
      state.input.pointerButton=0;
      state.entities.hook.active=false;
    });
    canvas.addEventListener('wheel',onWheel,{passive:false});

    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    window.addEventListener('blur',onBlur);
  }

  return {
    install,
    updatePointer,
    toggleInventory,
    toggleWorldMenu,
    toggleCrafting,
    activateInventoryIndex,
    activateCraftingIndex,
    performWorldAction,
  };
}

Object.assign(exports,{createInputSystem});

};

__modules["src/systems/crop-system.js"]=function(exports,__require){
const { FARM_CONFIG, FOOD_COOKING_CONFIG } = __require("src/config.js");
const { MaterialId, CROP_MATERIALS } = __require("src/data/materials.db.js");
const { CROP_IDS, cropById } = __require("src/data/crops.db.js");
const { lootById } = __require("src/data/fauna.db.js");
const { nearestPixel, snapPixelPosition } = __require("src/pixel-grid.js");
const SOIL_MATERIALS=new Set([
  MaterialId.DIRT,
  MaterialId.GRASS,
  MaterialId.MUD,
  MaterialId.MYCELIUM,
]);

const COOKING_HEAT_MATERIALS=new Set([
  MaterialId.FIRE,
  MaterialId.LAVA,
  MaterialId.STEAM,
]);

function createCropSystem(state,cells,chunks,noise,hud,weatherSystem=null,juice=null){
  const M=MaterialId;
  let handlingHarvest=false;

  function randomInt(min,max,x,y,salt){
    return min+Math.floor(noise.randomAt(x,y,salt)*(max-min+1));
  }

  function randomCropId(x,y,salt=0){
    const index=Math.floor(noise.randomAt(x,y,state.frame+salt)*CROP_IDS.length)%CROP_IDS.length;
    return CROP_IDS[index];
  }

  function spawnPickup(kind,cropId,x,y,amount=1,scatter=1){
    if(!cropById(cropId)||amount<=0)return null;
    const pickups=state.entities.pickups;
    if(pickups.length>=FARM_CONFIG.maxLoosePickups)pickups.shift();
    const angle=noise.randomAt(x,y,state.frame+3011)*Math.PI*2;
    const speed=(.08+noise.randomAt(y,x,state.frame+3012)*.32)*scatter;
    const pickup={
      kind,
      cropId,
      amount,
      x:nearestPixel(x),
      y:nearestPixel(y),
      vx:Math.cos(angle)*speed,
      vy:-.35-Math.abs(Math.sin(angle))*speed,
      life:FARM_CONFIG.pickupLifeFrames,
      bob:noise.randomAt(x,y,state.frame+3013)*Math.PI*2,
    };
    pickups.push(pickup);
    return pickup;
  }


  function spawnLootPickup(lootId,x,y,amount=1,scatter=1){
    if(!lootById(lootId)||amount<=0)return null;
    const pickups=state.entities.pickups;
    if(pickups.length>=FARM_CONFIG.maxLoosePickups)pickups.shift();
    const angle=noise.randomAt(x,y,state.frame+3511)*Math.PI*2;
    const speed=(.08+noise.randomAt(y,x,state.frame+3512)*.32)*scatter;
    const pickup={
      kind:'loot',
      lootId,
      amount,
      x:nearestPixel(x),
      y:nearestPixel(y),
      vx:Math.cos(angle)*speed,
      vy:-.35-Math.abs(Math.sin(angle))*speed,
      life:FARM_CONFIG.pickupLifeFrames,
      bob:noise.randomAt(x,y,state.frame+3513)*Math.PI*2,
    };
    pickups.push(pickup);
    return pickup;
  }

  function clearPlantCells(plant){
    for(const cell of plant.cells){
      if(cells.getPlantId(cell.x,cell.y)!==plant.id)continue;
      cells.setCell(cell.x,cell.y,M.AIR,0,{silent:true,reason:'plant-clear'});
    }
    plant.cells.length=0;
  }

  function addShapeCell(shape,x,y,type){
    const key=`${x},${y}`;
    if(shape.keys.has(key))return;
    shape.keys.add(key);
    shape.cells.push({x,y,type});
  }

  function buildPlantShape(plant,stage){
    const crop=cropById(plant.cropId);
    const shape={cells:[],keys:new Set()};
    if(!crop)return shape.cells;

    const mature=stage>=FARM_CONFIG.growthStages-1;
    const progress=(stage+1)/FARM_CONFIG.growthStages;
    const height=Math.max(1,Math.round(crop.matureHeight*progress));
    const radius=Math.max(1,Math.round(crop.canopyRadius*Math.max(.35,progress)));
    const baseX=plant.baseX;
    const baseY=plant.baseY;
    const stem=(x,y)=>addShapeCell(shape,x,y,M.CROP_STEM);
    const leaf=(x,y)=>addShapeCell(shape,x,y,M.CROP_LEAF);
    const fruit=(x,y)=>addShapeCell(shape,x,y,M.CROP_FRUIT);

    if(crop.pattern==='root'){
      if(mature)fruit(baseX,baseY);
      else stem(baseX,baseY);
      for(let rise=1;rise<height;rise++)stem(baseX,baseY-rise);
      const crownY=baseY-height+1;
      for(let offset=-radius;offset<=radius;offset++)leaf(baseX+offset,crownY-Math.floor((radius-Math.abs(offset))*.35));
    }else if(crop.pattern==='stalk'){
      for(let rise=0;rise<height;rise++)stem(baseX,baseY-rise);
      for(let rise=2;rise<height-1;rise+=2){
        const side=(rise%4===0)?-1:1;
        leaf(baseX+side,baseY-rise);
        if(stage>=2)leaf(baseX+side*2,baseY-rise-1);
      }
      if(mature){
        fruit(baseX-1,baseY-height+3);
        fruit(baseX+1,baseY-height+5);
      }
    }else if(crop.pattern==='vine'){
      for(let rise=0;rise<height;rise++)stem(baseX,baseY-rise);
      const branchRadius=Math.max(1,radius);
      for(let rise=2;rise<height;rise+=2){
        const side=rise%4===0?-1:1;
        for(let run=1;run<=branchRadius;run++)leaf(baseX+side*run,baseY-rise-Math.floor(run*.25));
      }
      if(mature){
        fruit(baseX-radius,baseY-Math.max(2,height-3));
        fruit(baseX+radius,baseY-Math.max(3,height-5));
        if(height>6)fruit(baseX+1,baseY-height+1);
      }
    }else if(crop.pattern==='mound'){
      const spread=Math.max(1,Math.round(radius*progress));
      stem(baseX,baseY);
      for(let offset=-spread;offset<=spread;offset++){
        leaf(baseX+offset,baseY-1-Math.floor((spread-Math.abs(offset))*.35));
        if(stage>=2&&offset%2===0)leaf(baseX+offset,baseY-2-Math.floor((spread-Math.abs(offset))*.2));
      }
      if(mature){
        fruit(baseX-spread+1,baseY);
        fruit(baseX+spread-1,baseY);
      }
    }else if(crop.pattern==='low_bush'){
      const spread=Math.max(1,radius);
      for(let offset=-spread;offset<=spread;offset++){
        const rise=Math.max(0,Math.round((spread-Math.abs(offset))*.6));
        leaf(baseX+offset,baseY-rise);
        if(rise>0)stem(baseX+Math.sign(offset||1)*Math.min(1,Math.abs(offset)),baseY-rise+1);
      }
      if(mature){
        for(let offset=-spread+1;offset<=spread-1;offset+=2)fruit(baseX+offset,baseY-1-(Math.abs(offset)%2));
      }
    }else if(crop.pattern==='rosette'){
      stem(baseX,baseY);
      for(let ring=1;ring<=radius;ring++){
        leaf(baseX-ring,baseY-Math.floor(ring*.35));
        leaf(baseX+ring,baseY-Math.floor(ring*.35));
      }
      if(stage>=2){
        leaf(baseX,baseY-1);
        leaf(baseX-1,baseY-1);
        leaf(baseX+1,baseY-1);
      }
      if(mature)fruit(baseX,baseY-2);
    }else if(crop.pattern==='flower'){
      for(let rise=0;rise<height;rise++)stem(baseX,baseY-rise);
      if(stage>=1){
        leaf(baseX-1,baseY-Math.max(2,Math.floor(height*.45)));
        leaf(baseX+1,baseY-Math.max(3,Math.floor(height*.62)));
      }
      const topY=baseY-height;
      for(let oy=-1;oy<=1;oy++)for(let ox=-radius;ox<=radius;ox++){
        if(Math.abs(ox)+Math.abs(oy)<=radius+1)leaf(baseX+ox,topY+oy);
      }
      if(mature)fruit(baseX,topY);
    }else{
      // General bush used by potatoes, blueberries, peppers, and eggplants.
      const spread=Math.max(1,radius);
      for(let rise=0;rise<height;rise++)stem(baseX,baseY-rise);
      for(let oy=0;oy<Math.max(2,Math.round(height*.62));oy++){
        const width=Math.max(1,Math.round(spread*(1-oy/(height+2))));
        for(let ox=-width;ox<=width;ox++){
          if((Math.abs(ox)+oy)%2===0||stage>=3)leaf(baseX+ox,baseY-height+1+oy);
        }
      }
      if(mature){
        fruit(baseX-spread+1,baseY-height+2);
        fruit(baseX+spread-1,baseY-height+3);
        if(height>5)fruit(baseX,baseY-height+1);
      }
    }

    return shape.cells;
  }

  function applyPlantStage(plant,stage){
    clearPlantCells(plant);
    const shape=buildPlantShape(plant,stage);
    const placed=[];

    for(const part of shape){
      const type=cells.getCell(part.x,part.y);
      if(type!==M.AIR&&cells.getPlantId(part.x,part.y)!==plant.id)continue;
      if(cells.setPlantCell(part.x,part.y,part.type,plant.cropId,plant.id,{silent:true})){
        placed.push({x:part.x,y:part.y});
      }
    }

    plant.cells=placed;
    plant.stage=stage;
    plant.mature=stage>=FARM_CONFIG.growthStages-1;
  }

  function plantSeed(cropId,baseX,baseY,plantedFrame=state.frame){
    if(!cropById(cropId))return null;
    const x=Math.floor(baseX);
    const y=Math.floor(baseY);
    if(cells.getCell(x,y)!==M.AIR)return null;
    if(!SOIL_MATERIALS.has(cells.getCell(x,y+1)))return null;

    for(const plant of state.world.plants.values()){
      if((plant.dimension??'earth')!==state.world.dimension)continue;
      if(Math.abs(plant.baseX-x)<=2&&Math.abs(plant.baseY-y)<=2)return null;
    }

    const plant={
      id:state.world.nextPlantId++,
      cropId,
      dimension:state.world.dimension??'earth',
      baseX:x,
      baseY:y,
      plantedFrame,
      stage:-1,
      mature:false,
      harvested:false,
      weatherGrowthCredit:0,
      cells:[],
    };
    state.world.plants.set(plant.id,plant);
    applyPlantStage(plant,0);
    return plant;
  }

  function harvestPlant(plantId,breakX,breakY){
    const plant=state.world.plants.get(plantId);
    if(!plant||plant.harvested||handlingHarvest)return false;
    plant.harvested=true;
    handlingHarvest=true;

    clearPlantCells(plant);
    state.world.plants.delete(plant.id);
    const crop=cropById(plant.cropId);

    if(crop){
      if(plant.mature){
        const produce=randomInt(crop.produceMin,crop.produceMax,breakX,breakY,3201+plant.id);
        const seeds=randomInt(crop.seedMin,crop.seedMax,breakY,breakX,3202+plant.id);
        spawnPickup('produce',plant.cropId,breakX,breakY,produce,1.5);
        spawnPickup('seed',plant.cropId,breakX+1,breakY,seeds,1.35);
      }else{
        spawnPickup('seed',plant.cropId,breakX,breakY,1,1);
      }
    }

    handlingHarvest=false;
    return true;
  }

  function handleCellChange(event){
    if(event.oldType===M.GRASS&&event.newType!==M.GRASS){
      spawnPickup('seed',randomCropId(event.x,event.y,3100),event.x,event.y,1,1.2);
    }

    if(event.oldPlantId>0&&event.oldPlantId!==event.newPlantId){
      harvestPlant(event.oldPlantId,event.x,event.y);
    }
  }

  function throwSeeds(cropId,direction){
    const crop=cropById(cropId);
    if(!crop)return false;
    const available=state.inventory.seedCount(cropId);
    if(available<=0)return false;
    const count=Math.min(FARM_CONFIG.seedScatterCount,available);
    state.inventory.removeSeed(cropId,count);

    for(let index=0;index<count;index++){
      const centered=count===1?0:index/(count-1)-.5;
      const jitter=(noise.randomAt(state.frame,index,cropId+3301)-.5)*.18;
      const angle=direction.angle+centered*FARM_CONFIG.seedSpreadRadians+jitter;
      const speed=FARM_CONFIG.seedLaunchSpeedMin+
        noise.randomAt(index,state.frame,cropId+3302)*
        (FARM_CONFIG.seedLaunchSpeedMax-FARM_CONFIG.seedLaunchSpeedMin);
      state.entities.seedParticles.push({
        cropId,
        x:nearestPixel(state.player.x+Math.cos(angle)*2),
        y:nearestPixel(state.player.y-2+Math.sin(angle)*2),
        vx:Math.cos(angle)*speed+state.player.vx*.3,
        vy:Math.sin(angle)*speed+state.player.vy*.15,
        life:FARM_CONFIG.seedLifeFrames,
      });
    }

    if(state.inventory.seedCount(cropId)<=0){
      state.seedMode.active=false;
      state.seedMode.cropId=null;
      hud.showMessage(`${crop.seedName} depleted · empty hand`,900);
    }
    hud.update();
    return true;
  }

  function tryEmbedSeed(seed,nextX,nextY){
    const cellX=Math.floor(nextX);
    const cellY=Math.floor(nextY);
    const target=cells.getCell(cellX,cellY);
    if(!cells.isSolid(target))return false;

    if(SOIL_MATERIALS.has(target)&&cells.getCell(cellX,cellY-1)===M.AIR){
      return Boolean(plantSeed(seed.cropId,cellX,cellY-1,state.frame));
    }
    return false;
  }

  function updateSeedParticles(){
    const particles=state.entities.seedParticles;
    for(let index=particles.length-1;index>=0;index--){
      const seed=particles[index];
      seed.life--;
      if(seed.life<=0){
        particles.splice(index,1);
        continue;
      }

      seed.vy+=FARM_CONFIG.seedGravity;
      seed.vx*=FARM_CONFIG.seedAirDrag;
      let removed=false;

      for(let step=0;step<3&&!removed;step++){
        const nextX=seed.x+seed.vx/3;
        const nextY=seed.y+seed.vy/3;
        if(!chunks.isActiveWorldPosition(nextX,nextY)){
          particles.splice(index,1);
          removed=true;
          break;
        }

        const target=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        if(cells.isSolid(target)){
          if(seed.vy>=0&&tryEmbedSeed(seed,nextX,nextY)){
            particles.splice(index,1);
            removed=true;
            break;
          }
          seed.vy*=-.26;
          seed.vx*=.55;
          if(Math.abs(seed.vy)<.08){
            particles.splice(index,1);
            removed=true;
          }
          break;
        }

        seed.x=nextX;
        seed.y=nextY;
      }
      if(!removed)snapPixelPosition(seed);
    }
  }

  function pickupTouchesHeat(pickup){
    const centerX=nearestPixel(pickup.x);
    const centerY=nearestPixel(pickup.y);
    const radius=FOOD_COOKING_CONFIG.heatRadius;
    for(let offsetY=-radius;offsetY<=radius;offsetY++){
      for(let offsetX=-radius;offsetX<=radius;offsetX++){
        if(Math.abs(offsetX)+Math.abs(offsetY)>radius+1)continue;
        if(COOKING_HEAT_MATERIALS.has(cells.getCell(centerX+offsetX,centerY+offsetY)))return true;
      }
    }
    return false;
  }

  function updateLootCooking(pickup){
    if(pickup.kind!=='loot')return false;
    const raw=lootById(pickup.lootId);
    if(!raw?.cookTo){
      pickup.cookFrames=0;
      return false;
    }
    if(!pickupTouchesHeat(pickup)){
      pickup.cookFrames=0;
      return false;
    }

    pickup.cookFrames=(pickup.cookFrames??0)+1;
    pickup.vx*=.72;
    pickup.vy*=.72;
    if(pickup.cookFrames<FOOD_COOKING_CONFIG.cookFrames)return true;

    const cooked=lootById(raw.cookTo);
    if(!cooked)return false;
    pickup.lootId=cooked.id;
    pickup.cookFrames=0;
    pickup.cookedFlash=30;
    juice?.burst?.(pickup.x,pickup.y,{colors:['rgb(255,248,181)','rgb(255,151,54)','rgb(192,67,35)'],count:14,speedMin:.2,speedMax:1.1,gravity:.04,lifeMin:12,lifeMax:28});
    juice?.worldFlash?.(pickup.x,pickup.y,'rgb(255,236,157)',5,10);
    hud.showMessage(`${raw.name.toUpperCase()} COOKED`,900);
    hud.update();
    return false;
  }

  function collectPickup(pickup){
    juice?.pickup?.(pickup.x,pickup.y,`+${Math.max(1,pickup.amount??1)}`);
    if(pickup.kind==='loot'){
      if(!lootById(pickup.lootId))return;
      state.inventory.addLoot(pickup.lootId,pickup.amount);
      const loot=lootById(pickup.lootId);
      hud.pushPickup?.(loot?.name??'loot',pickup.amount);
      hud.update();
      return;
    }
    const crop=cropById(pickup.cropId);
    if(!crop)return;
    if(pickup.kind==='seed'){
      state.inventory.addSeed(pickup.cropId,pickup.amount);
      hud.pushPickup?.(crop.seedName,pickup.amount);
    }else{
      state.inventory.addProduce(pickup.cropId,pickup.amount);
      hud.pushPickup?.(crop.produceName,pickup.amount);
    }
    hud.update();
  }

  function updatePickups(){
    const pickups=state.entities.pickups;
    for(let index=pickups.length-1;index>=0;index--){
      const pickup=pickups[index];
      pickup.life--;
      pickup.bob+=.08;
      if((pickup.cookedFlash??0)>0)pickup.cookedFlash--;
      if(pickup.life<=0||!chunks.isActiveWorldPosition(pickup.x,pickup.y)){
        pickups.splice(index,1);
        continue;
      }

      const cooking=updateLootCooking(pickup);
      const dx=state.player.x-pickup.x;
      const dy=(state.player.y-2)-pickup.y;
      const distance=Math.hypot(dx,dy)||1;
      if(distance<=FARM_CONFIG.pickupCollectRadius&&!cooking){
        collectPickup(pickup);
        pickups.splice(index,1);
        continue;
      }

      // A raw food item that is actively cooking stays beside its heat source.
      // This prevents pickup attraction or gravity from pulling it away before
      // the one-second exposure requirement has completed.
      if(cooking){
        pickup.vx=0;
        pickup.vy=0;
        snapPixelPosition(pickup);
        continue;
      }

      if(distance<FARM_CONFIG.pickupAttractRadius){
        pickup.vx+=dx/distance*.025;
        pickup.vy+=dy/distance*.025;
      }else{
        pickup.vy+=.035;
      }
      pickup.vx*=.94;
      pickup.vy=Math.min(.8,pickup.vy*.97);

      const nextX=pickup.x+pickup.vx;
      const nextY=pickup.y+pickup.vy;
      if(!cells.isSolid(cells.getCell(Math.floor(nextX),Math.floor(pickup.y))))pickup.x=nextX;
      else pickup.vx*=-.25;
      if(!cells.isSolid(cells.getCell(Math.floor(pickup.x),Math.floor(nextY))))pickup.y=nextY;
      else{
        pickup.vy*=-.22;
        if(Math.abs(pickup.vy)<.04)pickup.vy=0;
      }
      snapPixelPosition(pickup);
    }
  }

  function updatePlants(){
    for(const plant of state.world.plants.values()){
      if((plant.dimension??'earth')!==state.world.dimension)continue;
      if(plant.harvested||!chunks.isActiveWorldPosition(plant.baseX,plant.baseY))continue;
      if(!SOIL_MATERIALS.has(cells.getCell(plant.baseX,plant.baseY+1))){
        harvestPlant(plant.id,plant.baseX,plant.baseY);
        continue;
      }
      const multiplier=weatherSystem?.growthMultiplier?.()??1;
      plant.weatherGrowthCredit=(plant.weatherGrowthCredit??0)+FARM_CONFIG.growthUpdateInterval*(multiplier-1);
      const elapsed=Math.max(0,state.frame-plant.plantedFrame+plant.weatherGrowthCredit);
      const finalStage=FARM_CONFIG.growthStages-1;
      const stage=elapsed>=FARM_CONFIG.growFrames
        ?finalStage
        :Math.min(finalStage-1,Math.floor(elapsed/FARM_CONFIG.growFrames*finalStage));
      if(stage!==plant.stage)applyPlantStage(plant,stage);
    }
  }

  function eatProduce(cropId){
    const crop=cropById(cropId);
    if(!crop||state.inventory.produceCount(cropId)<=0)return false;
    state.inventory.removeProduce(cropId,1);
    const beforeHealth=state.player.hp;
    const beforeHunger=state.player.hunger;
    const nutrition=Math.min(35,8+crop.heal*2);
    state.player.hunger=Math.min(100,state.player.hunger+nutrition);
    state.player.hp=Math.min(100,state.player.hp+Math.max(1,Math.ceil(crop.heal*.35)));
    const hungerGain=Math.round(state.player.hunger-beforeHunger);
    const healthGain=Math.round(state.player.hp-beforeHealth);
    hud.showMessage(`ATE ${crop.produceName}  +${hungerGain} HUNGER${healthGain?`  +${healthGain} HEALTH`:''}`,1200);
    hud.update();
    return true;
  }

  function eatLoot(lootId){
    const loot=lootById(lootId);
    if(!loot?.edible||state.inventory.lootCount(lootId)<=0)return false;
    state.inventory.removeLoot(lootId,1);
    const beforeHealth=state.player.hp;
    const beforeHunger=state.player.hunger;
    state.player.hunger=Math.min(100,state.player.hunger+Math.max(1,loot.hungerRestore??12));
    state.player.hp=Math.min(100,state.player.hp+Math.max(0,loot.healthRestore??0));
    const hungerGain=Math.round(state.player.hunger-beforeHunger);
    const healthGain=Math.round(state.player.hp-beforeHealth);
    hud.showMessage(`ATE ${loot.name}  +${hungerGain} HUNGER${healthGain?`  +${healthGain} HEALTH`:''}`,1200);
    hud.update();
    return true;
  }

  function update(){
    updateSeedParticles();
    updatePickups();
    for(const seed of state.entities.seedParticles)snapPixelPosition(seed);
    for(const pickup of state.entities.pickups)snapPixelPosition(pickup);
    if(state.frame%FARM_CONFIG.growthUpdateInterval===0)updatePlants();
  }

  cells.onChange(handleCellChange);

  return {
    update,
    updatePlants,
    updateSeedParticles,
    updatePickups,
    throwSeeds,
    plantSeed,
    harvestPlant,
    spawnPickup,
    spawnLootPickup,
    eatProduce,
    eatLoot,
    updateLootCooking,
    pickupTouchesHeat,
    randomCropId,
  };
}

Object.assign(exports,{createCropSystem});

};

__modules["src/systems/time-system.js"]=function(exports,__require){
const { DAY_NIGHT_CONFIG } = __require("src/config.js");
function createTimeSystem(state){
  const cycleFrames=DAY_NIGHT_CONFIG.dayFrames+DAY_NIGHT_CONFIG.nightFrames;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const smooth=t=>{
    const x=clamp(t);
    return x*x*(3-2*x);
  };

  function getTime(){
    const cycleFrame=((state.frame%cycleFrames)+cycleFrames)%cycleFrames;
    const dayNumber=Math.floor(state.frame/cycleFrames)+1;
    const isDay=cycleFrame<DAY_NIGHT_CONFIG.dayFrames;
    const phaseFrame=isDay?cycleFrame:cycleFrame-DAY_NIGHT_CONFIG.dayFrames;
    const phaseProgress=phaseFrame/(isDay?DAY_NIGHT_CONFIG.dayFrames:DAY_NIGHT_CONFIG.nightFrames);

    let daylight;
    let dawn=0;
    let dusk=0;
    let nightStrength=0;

    if(isDay){
      const dawnEnd=DAY_NIGHT_CONFIG.dawnFraction;
      const duskStart=1-DAY_NIGHT_CONFIG.duskFraction;
      if(phaseProgress<dawnEnd){
        dawn=1-phaseProgress/dawnEnd;
        daylight=.16+.84*smooth(phaseProgress/dawnEnd);
      }else if(phaseProgress>duskStart){
        dusk=(phaseProgress-duskStart)/(1-duskStart);
        daylight=.16+.84*(1-smooth(dusk));
      }else{
        daylight=1;
      }
    }else{
      const edge=Math.min(phaseProgress,1-phaseProgress)*5;
      nightStrength=.55+.45*smooth(clamp(edge));
      daylight=.08*(1-nightStrength);
    }

    // Daytime maps 06:00–18:00; night maps 18:00–06:00.
    const clockHours=isDay?6+phaseProgress*12:18+phaseProgress*12;
    const normalizedHours=clockHours%24;
    const hours=Math.floor(normalizedHours);
    const minutes=Math.floor((normalizedHours-hours)*60);

    return{
      cycleFrame,
      cycleFrames,
      dayNumber,
      isDay,
      phase:isDay?'day':'night',
      phaseProgress,
      daylight:clamp(daylight),
      nightStrength:clamp(isDay?1-daylight:nightStrength),
      dawn:clamp(dawn),
      dusk:clamp(dusk),
      hours,
      minutes,
      label:`Day ${dayNumber} · ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`,
    };
  }

  return { getTime, cycleFrames };
}

Object.assign(exports,{createTimeSystem});

};

__modules["src/systems/weather-system.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, WEATHER_CONFIG, STEAM_CONFIG } = __require("src/config.js");
const { BIOME_REGION_SIZE } = __require("src/data/biomes.db.js");
const { WeatherType, weatherDefinition } = __require("src/data/weather.db.js");
const { MaterialId, FLAMMABLE_MATERIALS } = __require("src/data/materials.db.js");
const { faunaById } = __require("src/data/fauna.db.js");
const { nearestPixel, snapPixelPosition } = __require("src/pixel-grid.js");
const { dimensionDefinition, isEarthDimension } = __require("src/data/dimensions.db.js");
const W=WeatherType;

function createWeatherSystem(state,cells,chunks,generator,noise,timeSystem,juice=null){
  const M=MaterialId;
  let playerDamage=amount=>{
    if(state.player.invulnerability>0)return false;
    state.player.hp=Math.max(0,state.player.hp-amount);
    state.player.invulnerability=45;
    return true;
  };

  const SURFACE_WEIGHTS=Object.freeze({
    plains:[[W.CLEAR,30],[W.BREEZE,20],[W.RAIN,25],[W.THUNDERSTORM,10],[W.FOG,5],[W.HEATWAVE,10]],
    snow_peaks:[[W.CLEAR,20],[W.BREEZE,10],[W.SNOW,35],[W.BLIZZARD,25],[W.FOG,10]],
    bamboo_grove:[[W.CLEAR,20],[W.BREEZE,15],[W.RAIN,30],[W.THUNDERSTORM,10],[W.FOG,20],[W.HEATWAVE,5]],
    swamp:[[W.CLEAR,10],[W.RAIN,30],[W.THUNDERSTORM,15],[W.FOG,35],[W.HEATWAVE,10]],
    volcano:[[W.CLEAR,15],[W.BREEZE,10],[W.ASHFALL,45],[W.HEATWAVE,30]],
    giant_forest:[[W.CLEAR,20],[W.BREEZE,15],[W.RAIN,30],[W.THUNDERSTORM,15],[W.FOG,20]],
    ocean:[[W.CLEAR,10],[W.BREEZE,15],[W.RAIN,25],[W.OCEAN_STORM,35],[W.FOG,15]],
  });

  function ensureState(){
    if(state.weather)return state.weather;
    state.weather={
      overrideType:null,
      currentType:W.CLEAR,
      previousType:W.CLEAR,
      segment:-1,
      intensity:0,
      windX:0,
      visibility:1,
      nextLightningFrame:0,
      flashes:[],
    };
    return state.weather;
  }

  function cameraOrigin(){
    return{
      x:state.world.camera.chunkX*WORLD_WIDTH,
      y:state.world.camera.chunkY*WORLD_HEIGHT,
    };
  }

  function isUnderground(){
    const surface=generator.surfaceAt(state.player.x);
    return state.player.y>surface.ground+12||state.world.camera.chunkY>0;
  }

  function habitatName(){
    if(!isEarthDimension(state.world.dimension))return `dimension:${state.world.dimension}`;
    if(isUnderground()){
      return generator.undergroundBiomeIdAt(state.player.x,state.player.y-2)===1?'mushroom_caverns':'standard_caves';
    }
    return generator.biomeNameAt(state.player.x,state.player.y-2);
  }

  function chooseWeighted(entries,roll){
    const total=entries.reduce((sum,item)=>sum+item[1],0);
    let cursor=roll*total;
    for(const [type,weight] of entries){
      cursor-=weight;
      if(cursor<=0)return type;
    }
    return entries.at(-1)?.[0]??W.CLEAR;
  }

  function typeForSegment(segment,habitat){
    const weatherState=ensureState();
    if(habitat.startsWith('dimension:')){
      if(weatherState.overrideType)return weatherState.overrideType;
      const dimension=habitat.slice('dimension:'.length);
      const weatherList=dimensionDefinition(dimension).weather??[W.CLEAR];
      return weatherList[Math.floor(noise.randomAt(segment,state.seed+dimension.length,9007)*weatherList.length)%weatherList.length]??W.CLEAR;
    }
    if(weatherState.overrideType)return weatherState.overrideType;
    const region=Math.floor(state.player.x/BIOME_REGION_SIZE);
    const time=timeSystem.getTime();
    const daySalt=time.dayNumber*97+region*313;
    const roll=noise.randomAt(segment,daySalt,state.seed+9001);

    if(habitat==='mushroom_caverns'){
      return chooseWeighted([[W.SPORE_HAZE,58],[W.CAVE_DRIP,27],[W.CLEAR,15]],roll);
    }
    if(habitat==='standard_caves'){
      return chooseWeighted([[W.CAVE_DRIP,58],[W.CLEAR,42]],roll);
    }
    return chooseWeighted(SURFACE_WEIGHTS[habitat]??SURFACE_WEIGHTS.plains,roll);
  }

  function windDirection(segment,habitat){
    if(habitat==='dimension:moon')return 0;
    if(habitat.startsWith('dimension:')){
      const dimension=habitat.slice('dimension:'.length);
      const definition=dimensionDefinition(dimension);
      if((definition.weather??[]).every(type=>type===W.CLEAR))return 0;
      return noise.randomAt(segment,dimension.length,state.seed+9017)<.5?-1:1;
    }
    if(habitat==='standard_caves'||habitat==='mushroom_caverns')return 0;
    const region=Math.floor(state.player.x/BIOME_REGION_SIZE);
    return noise.randomAt(segment,region,state.seed+9011)<.5?-1:1;
  }

  function getWeather(){
    const weatherState=ensureState();
    const habitat=habitatName();
    const segment=Math.floor(state.frame/WEATHER_CONFIG.periodFrames);
    const segmentFrame=((state.frame%WEATHER_CONFIG.periodFrames)+WEATHER_CONFIG.periodFrames)%WEATHER_CONFIG.periodFrames;
    const type=typeForSegment(segment,habitat);
    const definition=weatherDefinition(type);
    const transition=Math.max(1,WEATHER_CONFIG.transitionFrames);
    const rampIn=Math.min(1,segmentFrame/transition);
    const rampOut=Math.min(1,(WEATHER_CONFIG.periodFrames-segmentFrame)/transition);
    const intensity=weatherState.overrideType?1:Math.max(0,Math.min(rampIn,rampOut));
    const direction=windDirection(segment,habitat);
    const windX=direction*definition.wind*intensity;
    const visibility=1-(1-definition.visibility)*intensity;

    if(segment!==weatherState.segment||type!==weatherState.currentType){
      weatherState.previousType=weatherState.currentType;
      weatherState.currentType=type;
      weatherState.segment=segment;
      const min=WEATHER_CONFIG.lightningMinFrames;
      const max=WEATHER_CONFIG.lightningMaxFrames;
      weatherState.nextLightningFrame=state.frame+min+Math.floor(noise.randomAt(segment,state.seed,9021)*(max-min));
    }
    weatherState.intensity=intensity;
    weatherState.windX=windX;
    weatherState.visibility=visibility;

    const windLabel=Math.abs(windX)<.08?'calm':`${windX<0?'←':'→'} ${Math.abs(windX)>.75?'strong':Math.abs(windX)>.35?'steady':'light'}`;
    return{
      type,
      label:definition.label,
      habitat,
      segment,
      segmentFrame,
      intensity,
      windX,
      windLabel,
      visibility,
      precipitation:definition.precipitation,
      lightning:definition.lightning,
      growthMultiplier:1+(definition.growthMultiplier-1)*intensity,
    };
  }

  function findSurfaceY(worldX){
    const {y:originY}=cameraOrigin();
    for(let localY=1;localY<WORLD_HEIGHT-1;localY++){
      const worldY=originY+localY;
      if(cells.getCell(worldX,worldY)!==M.AIR)return worldY;
    }
    return originY+WORLD_HEIGHT-2;
  }

  function randomVisibleX(salt){
    const {x:originX}=cameraOrigin();
    return originX+2+Math.floor(noise.randomAt(state.frame,salt,state.seed+9031)*(WORLD_WIDTH-4));
  }

  function depositAtSurface(material,salt){
    const x=randomVisibleX(salt);
    const y=findSurfaceY(x);
    const target=cells.getCell(x,y);
    const above=cells.getCell(x,y-1);

    if(material===M.WATER){
      if(target===M.FIRE){
        cells.setCell(x,y,M.SMOKE,18,{reason:'rain-extinguish'});
        return{x,y};
      }
      if(target===M.LAVA){
        cells.setCell(x,y-1,M.STEAM,STEAM_CONFIG.lifeFrames,{reason:'rain-lava'});
        return{x,y:y-1};
      }
      if(above===M.AIR||above===M.SMOKE||above===M.STEAM){
        cells.setCell(x,y-1,M.WATER,0,{reason:'rain'});
        return{x,y:y-1};
      }
      return null;
    }

    if(above===M.AIR){
      cells.setCell(x,y-1,material,0,{reason:'weather-deposit'});
      return{x,y:y-1};
    }
    return null;
  }

  function findCaveCeiling(salt){
    const {x:originX,y:originY}=cameraOrigin();
    const x=originX+2+Math.floor(noise.randomAt(state.frame,salt,state.seed+9041)*(WORLD_WIDTH-4));
    for(let localY=2;localY<WORLD_HEIGHT-3;localY++){
      const y=originY+localY;
      if(cells.isSolid(cells.getCell(x,y-1))&&cells.getCell(x,y)===M.AIR)return{x,y};
    }
    return null;
  }

  function applyPrecipitation(weather=getWeather()){
    if(weather.intensity<=.08||!weather.precipitation)return 0;
    const heavy=weather.type===W.THUNDERSTORM||weather.type===W.OCEAN_STORM||weather.type===W.BLIZZARD;
    const count=Math.max(1,Math.min(WEATHER_CONFIG.maxSurfaceDepositsPerTick,heavy?2+Math.round(weather.intensity):1));
    let deposits=0;

    for(let index=0;index<count;index++){
      if(weather.precipitation==='rain'){
        if(depositAtSurface(M.WATER,9100+index))deposits++;
      }else if(weather.precipitation==='snow'){
        if(depositAtSurface(M.SNOW,9200+index))deposits++;
      }else if(weather.precipitation==='ash'){
        if(depositAtSurface(M.ASH,9300+index))deposits++;
      }else if(weather.precipitation==='drip'){
        const point=findCaveCeiling(9400+index);
        if(point&&cells.setCell(point.x,point.y,M.WATER,0,{reason:'cave-drip'}))deposits++;
      }else if(weather.precipitation==='spore'){
        const point=findCaveCeiling(9500+index);
        if(point){
          for(let depth=1;depth<18;depth++){
            const y=point.y+depth;
            const type=cells.getCell(point.x,y);
            if(type===M.DIRT){
              cells.setCell(point.x,y,M.MYCELIUM,0,{reason:'spore-haze'});
              deposits++;
              break;
            }
            if(cells.isSolid(type))break;
          }
        }
      }
    }
    return deposits;
  }

  function applyHeatPulse(weather=getWeather()){
    if(weather.type!==W.HEATWAVE||weather.intensity<.3)return 0;
    let changed=0;
    for(let index=0;index<3;index++){
      const x=randomVisibleX(9600+index);
      const y=findSurfaceY(x);
      const type=cells.getCell(x,y);
      if(type===M.WATER){
        cells.setCell(x,y,M.STEAM,STEAM_CONFIG.lifeFrames,{reason:'heatwave'});
        changed++;
      }else if(type===M.SNOW){
        cells.setCell(x,y,M.WATER,0,{reason:'heatwave'});
        changed++;
      }else if(type===M.FIRE){
        cells.setLife(x,y,Math.min(255,cells.getLife(x,y)+16));
        changed++;
      }
    }
    return changed;
  }

  function damageActorsAt(x,y,radius){
    if(Math.hypot(state.player.x-x,(state.player.y-2)-y)<=radius)playerDamage(WEATHER_CONFIG.lightningDamage);
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(const enemy of chunk.enemies){
        if(Math.hypot(enemy.x-x,enemy.y-y)>radius)continue;
        enemy.hp-=WEATHER_CONFIG.lightningDamage;
        enemy.hit=Math.max(enemy.hit??0,8);
      }
    }
    for(const boss of state.entities.bosses){
      if(Math.hypot(boss.x-x,boss.y-y)>radius+6)continue;
      boss.hp-=WEATHER_CONFIG.lightningDamage;
      boss.hit=Math.max(boss.hit??0,8);
    }
  }

  function triggerLightning(weather=getWeather(),forcedX=null){
    if(!weather.lightning&&forcedX===null)return null;
    const x=nearestPixel(forcedX??randomVisibleX(9701));
    const y=findSurfaceY(x);
    const weatherState=ensureState();
    weatherState.flashes.push({x,y,frames:14,maxFrames:14});
    const strikeType=cells.getCell(x,y);
    if(FLAMMABLE_MATERIALS.has(strikeType))cells.setCell(x,y,M.FIRE,WEATHER_CONFIG.lightningFireLife,{reason:'lightning'});
    else if(cells.getCell(x,y-1)===M.AIR)cells.setCell(x,y-1,M.FIRE,WEATHER_CONFIG.lightningFireLife,{reason:'lightning'});
    state.entities.explosions.push({x,y:y-1,radius:5,frames:10,maxFrames:10,kind:'lightning',color:'rgb(226,239,255)'});
    juice?.screenFlash?.('rgba(235,246,255,.34)',6);
    juice?.shake?.(4.5,22);
    juice?.play?.('explosion',.62);
    damageActorsAt(x,y,4);

    const min=WEATHER_CONFIG.lightningMinFrames;
    const max=WEATHER_CONFIG.lightningMaxFrames;
    weatherState.nextLightningFrame=state.frame+min+Math.floor(noise.randomAt(x,y,state.frame+9702)*(max-min));
    return{x,y};
  }

  function updateFlashes(){
    const flashes=ensureState().flashes;
    for(let index=flashes.length-1;index>=0;index--){
      flashes[index].frames--;
      if(flashes[index].frames<=0)flashes.splice(index,1);
    }
  }

  function applyWind(weather=getWeather()){
    const force=weather.windX*WEATHER_CONFIG.windEntityForce;
    if(Math.abs(force)<.001)return;
    for(const key of ['seedParticles','pickups','napalmShots','bossFireballs','serpentProjectiles','bossProjectiles']){
      for(const entity of state.entities[key]??[]){
        if(entity.kind==='lightning_marker')continue;
        entity.vx=(entity.vx??0)+force;
      }
    }
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(const enemy of chunk.enemies){
        const species=faunaById(enemy.speciesId);
        if(species?.movement==='flying')enemy.vx=(enemy.vx??0)+force*1.8;
      }
    }
  }

  function update(){
    const weather=getWeather();
    updateFlashes();
    applyWind(weather);

    if(weather.precipitation){
      const interval=(weather.type===W.THUNDERSTORM||weather.type===W.OCEAN_STORM||weather.type===W.BLIZZARD)
        ?WEATHER_CONFIG.heavyPrecipitationIntervalFrames
        :WEATHER_CONFIG.precipitationIntervalFrames;
      if(state.frame%interval===0)applyPrecipitation(weather);
    }
    if(state.frame%WEATHER_CONFIG.heatPulseFrames===0)applyHeatPulse(weather);
    if(weather.lightning&&state.frame>=ensureState().nextLightningFrame)triggerLightning(weather);
  }

  function growthMultiplier(){ return getWeather().growthMultiplier; }
  function windX(){ return getWeather().windX; }
  function forceWeather(type=null){
    ensureState().overrideType=type;
    ensureState().segment=-1;
    return getWeather();
  }
  function setPlayerDamage(handler){ if(typeof handler==='function')playerDamage=handler; }

  ensureState();
  return{
    update,
    getWeather,
    growthMultiplier,
    windX,
    forceWeather,
    setPlayerDamage,
    applyPrecipitation,
    applyHeatPulse,
    triggerLightning,
  };
}

Object.assign(exports,{createWeatherSystem});

};

__modules["src/systems/save-system.js"]=function(exports,__require){
const { createDimensionPositionMap, createDimensionEntityMap, DimensionId } = __require("src/data/dimensions.db.js");
const SAVE_VERSION=4;
const SLOT_COUNT=3;
const STORAGE_PREFIX='infinite-pixel-world:save:v1:';
const ACTIVE_SLOT_KEY='infinite-pixel-world:active-slot:v1';
const AUTOSAVE_INTERVAL_FRAMES=60*60*3;

function clampSlot(slot){
  const value=Math.round(Number(slot)||1);
  return Math.max(1,Math.min(SLOT_COUNT,value));
}

function cleanClone(value){
  if(value===undefined)return undefined;
  return JSON.parse(JSON.stringify(value));
}

function storageAvailable(){
  try{
    const storage=globalThis.localStorage;
    if(!storage)return false;
    const key='__pixel_world_storage_test__';
    storage.setItem(key,'1');
    storage.removeItem(key);
    return true;
  }catch{
    return false;
  }
}

function createSaveSystem(state,options){
  const {
    generator,
    chunks,
    cells,
    hud,
    timeSystem,
    resetWorld,
    afterLoad,
    beforeSave,
  }=options;
  const supported=storageAvailable();
  let nextAutosaveFrame=AUTOSAVE_INTERVAL_FRAMES;
  let installed=false;

  const slotKey=slot=>`${STORAGE_PREFIX}${clampSlot(slot)}`;

  function setStatus(text,durationFrames=210){
    state.ui.saveStatus=String(text??'');
    state.ui.saveStatusUntil=state.frame+Math.max(1,durationFrames);
    hud.update();
  }

  function markDirty(){
    state.save.dirty=true;
  }

  function slotMetadata(slot,snapshot=null){
    const data=snapshot??readSnapshot(slot);
    if(!data)return {slot,empty:true};
    const meta=data.meta??{};
    return {
      slot,
      empty:false,
      seed:Number(data.seed)||0,
      frame:Number(data.frame)||0,
      day:Number(meta.day)||1,
      biome:String(meta.biome??'unknown').replaceAll('_',' '),
      savedAt:Number(meta.savedAt)||0,
      hp:Math.max(0,Math.round(data.player?.hp??100)),
      hunger:Math.max(0,Math.round(data.player?.hunger??100)),
    };
  }

  function readSnapshot(slot){
    if(!supported)return null;
    try{
      const raw=globalThis.localStorage.getItem(slotKey(slot));
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(![1,2,3,SAVE_VERSION].includes(parsed?.version))return null;
      return parsed;
    }catch{
      return null;
    }
  }

  function refreshSlots(){
    state.ui.saveSlots=[];
    for(let slot=1;slot<=SLOT_COUNT;slot++)state.ui.saveSlots.push(slotMetadata(slot));
    return state.ui.saveSlots;
  }

  function serializeInventory(){
    return {
      materials:state.inventory.order.map(id=>[id,state.inventory.counts[id]]),
      items:[...state.inventory.itemCounts.entries()],
      loot:[...state.inventory.lootCounts.entries()],
      furniture:[...state.inventory.furnitureCounts.entries()],
    };
  }

  function restoreInventory(data){
    state.inventory.clear();
    for(const [id,count] of data?.materials??[])state.inventory.add(Number(id),Number(count));
    for(const [key,count] of data?.items??[]){
      const [kind,idText]=String(key).split(':');
      state.inventory.addItem(kind,Number(idText),Number(count));
    }
    for(const [id,count] of data?.loot??[])state.inventory.addLoot(String(id),Number(count));
    for(const [id,count] of data?.furniture??[])state.inventory.addFurniture(String(id),Number(count));
  }

  function serializeChunk(chunk){
    const indices=[...(chunk.saveDirtyIndices??[])].sort((a,b)=>a-b);
    const preserveEnemies=Boolean(chunk.saveEnemies)||state.world.activeKeys.has(chunks.key(chunk.x,chunk.y,chunk.dimension??state.world.dimension));
    if(indices.length===0&&!preserveEnemies)return null;
    const changes=[];
    for(const index of indices){
      changes.push(
        index,
        chunk.cells[index],
        chunk.shade[index],
        chunk.life[index],
        chunk.age[index],
        chunk.cropId?.[index]??0,
        chunk.plantId?.[index]??0,
      );
    }
    return {
      x:chunk.x,
      y:chunk.y,
      dimension:chunk.dimension??'earth',
      changes,
      enemies:preserveEnemies?cleanClone(chunk.enemies):undefined,
    };
  }

  function serializeWorld(slot){
    const time=timeSystem.getTime();
    const biome=generator.biomeNameAt(state.player.x,state.player.y-2);
    const chunkData=[];
    for(const chunk of state.world.chunks.values()){
      const serialized=serializeChunk(chunk);
      if(serialized)chunkData.push(serialized);
    }

    return {
      version:SAVE_VERSION,
      meta:{
        slot,
        savedAt:Date.now(),
        day:time.dayNumber,
        biome,
      },
      seed:state.seed,
      frame:state.frame,
      crystals:state.crystals,
      weaponId:state.weaponId,
      cooldown:state.cooldown,
      laser:cleanClone({heat:state.laser.heat,overheated:state.laser.overheated}),
      jumpBuffer:state.jumpBuffer,
      coyoteFrames:state.coyoteFrames,
      swordTimer:state.swordTimer,
      swordAngle:state.swordAngle,
      player:cleanClone({...state.player,locked:state.world.dimensionPortal?.active?false:state.player.locked}),
      magnifier:cleanClone(state.magnifier),
      build:cleanClone(state.build),
      seedMode:cleanClone(state.seedMode),
      weather:cleanClone({
        overrideType:state.weather.overrideType,
        currentType:state.weather.currentType,
        previousType:state.weather.previousType,
        segment:state.weather.segment,
        intensity:state.weather.intensity,
        windX:state.weather.windX,
        visibility:state.weather.visibility,
        nextLightningFrame:state.weather.nextLightningFrame,
      }),
      world:cleanClone({
        firstVolcanoRegionIndex:state.world.firstVolcanoRegionIndex,
        bossSpawned:state.world.bossSpawned,
        bossDefeated:state.world.bossDefeated,
        firstOceanRegionIndex:state.world.firstOceanRegionIndex,
        seaSerpentSpawned:state.world.seaSerpentSpawned,
        seaSerpentDefeated:state.world.seaSerpentDefeated,
        bossEncounters:state.world.bossEncounters,
        defeatedBossCount:state.world.defeatedBossCount,
        bossCooldownUntil:state.world.bossCooldownUntil,
        travelOriginX:state.world.travelOriginX,
        dimension:state.world.dimension??'earth',
        dimensionPositions:state.world.dimensionPositions,
        dimensionEntities:state.world.dimensionEntities,
        moonReached:state.world.moonReached,
        visitedDimensions:state.world.visitedDimensions,
        rocketFlight:state.world.rocketFlight,
        nextPlantId:state.world.nextPlantId,
        nextInvasionFrame:state.world.nextInvasionFrame,
        invasionCount:state.world.invasionCount??0,
        invasionSerial:state.world.invasionSerial,
      }),
      plants:cleanClone([...state.world.plants.entries()]),
      chunks:chunkData,
      inventory:serializeInventory(),
      entities:cleanClone({
        bosses:state.entities.bosses,
        bossFireballs:state.entities.bossFireballs,
        serpentProjectiles:state.entities.serpentProjectiles,
        bossProjectiles:state.entities.bossProjectiles,
        pickups:state.entities.pickups,
        seedParticles:state.entities.seedParticles,
        enemyNests:state.entities.enemyNests,
        invasionPortals:state.entities.invasionPortals,
        furniture:state.entities.furniture,
      }),
    };
  }

  function save(slot=state.save.activeSlot,{silent=false,reason='manual'}={}){
    const safeSlot=clampSlot(slot);
    if(!supported){
      if(!silent)setStatus('SAVING UNAVAILABLE');
      return false;
    }
    try{
      beforeSave?.();
      const snapshot=serializeWorld(safeSlot);
      globalThis.localStorage.setItem(slotKey(safeSlot),JSON.stringify(snapshot));
      globalThis.localStorage.setItem(ACTIVE_SLOT_KEY,String(safeSlot));
      state.save.activeSlot=safeSlot;
      state.save.lastSavedAt=snapshot.meta.savedAt;
      state.save.dirty=false;
      nextAutosaveFrame=state.frame+AUTOSAVE_INTERVAL_FRAMES;
      refreshSlots();
      if(!silent)setStatus(reason==='auto'?`AUTOSAVED SLOT ${safeSlot}`:`SAVED SLOT ${safeSlot}`);
      return true;
    }catch(error){
      if(!silent)setStatus(error?.name==='QuotaExceededError'?'SAVE FULL - DELETE A SLOT':'SAVE FAILED');
      return false;
    }
  }

  function restoreChunk(data){
    const dimension=data.dimension??'earth';
    const chunk=generator.makeChunk(Number(data.x),Number(data.y),dimension);
    chunk.saveDirtyIndices=new Set();
    const changes=data.changes??[];
    for(let offset=0;offset+6<changes.length;offset+=7){
      const index=Number(changes[offset]);
      if(index<0||index>=chunk.cells.length)continue;
      chunk.cells[index]=Number(changes[offset+1])||0;
      chunk.shade[index]=Number(changes[offset+2])||0;
      chunk.life[index]=Number(changes[offset+3])||0;
      chunk.age[index]=Number(changes[offset+4])||0;
      if(chunk.cropId)chunk.cropId[index]=Number(changes[offset+5])||0;
      if(chunk.plantId)chunk.plantId[index]=Number(changes[offset+6])||0;
      chunk.saveDirtyIndices.add(index);
    }
    if(Array.isArray(data.enemies)){
      chunk.enemies=cleanClone(data.enemies);
      chunk.saveEnemies=true;
    }
    chunk.renderAllDirty=true;
    cells.ensureChunkTracking(chunk);
    chunk.activeMaterialInitialized=false;
    state.world.chunks.set(chunks.key(chunk.x,chunk.y,dimension),chunk);
  }

  function restoreEntityArray(target,source){
    target.length=0;
    if(Array.isArray(source))target.push(...cleanClone(source));
  }

  function load(slot=state.save.activeSlot,{silent=false}={}){
    const safeSlot=clampSlot(slot);
    const snapshot=readSnapshot(safeSlot);
    if(!snapshot){
      if(!silent)setStatus(`SLOT ${safeSlot} IS EMPTY`);
      return false;
    }

    try{
      state.seed=Number(snapshot.seed)||1;
      resetWorld();
      state.frame=Math.max(0,Math.round(Number(snapshot.frame)||0));
      state.crystals=Math.max(0,Math.round(Number(snapshot.crystals)||0));
      state.weaponId=Number.isInteger(Number(snapshot.weaponId))?Number(snapshot.weaponId):state.weaponId;
      state.cooldown=Math.max(0,Number(snapshot.cooldown)||0);
      Object.assign(state.laser,snapshot.laser??{});
      state.laser.active=false;
      state.laser.beam=null;
      state.laser.contactHeat=0;
      state.laser.hotPixels=[];
      state.jumpBuffer=Math.max(0,Number(snapshot.jumpBuffer)||0);
      state.coyoteFrames=Math.max(0,Number(snapshot.coyoteFrames)||0);
      state.swordTimer=Math.max(0,Number(snapshot.swordTimer)||0);
      state.swordAngle=Number(snapshot.swordAngle)||0;
      Object.assign(state.player,snapshot.player??{});
      if(!Array.isArray(state.player.attachedParasites))state.player.attachedParasites=[];
      if(!Number.isFinite(state.player.parasiteSlowMultiplier))state.player.parasiteSlowMultiplier=1;
      if(!Number.isFinite(state.player.weaponTheftCooldown))state.player.weaponTheftCooldown=0;
      if(typeof state.player.furnitureMode!=='string')state.player.furnitureMode='';
      if(state.player.furnitureSeatId===undefined)state.player.furnitureSeatId=null;
      Object.assign(state.magnifier,snapshot.magnifier??{});
      Object.assign(state.build,snapshot.build??{});
      if(!('equippedFurnitureId' in state.build))state.build.equippedFurnitureId=null;
      Object.assign(state.seedMode,snapshot.seedMode??{});
      Object.assign(state.weather,snapshot.weather??{});
      Object.assign(state.world,snapshot.world??{});
      state.world.dimension=snapshot.world?.dimension??DimensionId.EARTH;
      state.world.dimensionPositions=Object.assign(createDimensionPositionMap(),snapshot.world?.dimensionPositions??{});
      state.world.dimensionEntities=Object.assign(createDimensionEntityMap(),snapshot.world?.dimensionEntities??{});
      state.world.visitedDimensions=Object.assign({earth:true},snapshot.world?.visitedDimensions??{});
      if(snapshot.version<4){
        state.world.nextInvasionFrame=null;
        state.world.invasionCount=0;
      }else{
        if(!Number.isFinite(state.world.nextInvasionFrame))state.world.nextInvasionFrame=null;
        if(!Number.isFinite(state.world.invasionCount))state.world.invasionCount=0;
      }
      if(!Number.isFinite(state.world.invasionSerial))state.world.invasionSerial=1;
      state.world.dimensionPortal={active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:DimensionId.MOON};
      state.world.moonPortal=state.world.dimensionPortal;
      state.world.bossEncounters=Object.assign(Object.create(null),snapshot.world?.bossEncounters??{});
      state.world.plants.clear();
      for(const [id,plant] of snapshot.plants??[]){
        const restored=cleanClone(plant);
        if(!restored.dimension)restored.dimension='earth';
        state.world.plants.set(Number(id),restored);
      }
      restoreInventory(snapshot.inventory);
      for(const chunkData of snapshot.chunks??[])restoreChunk(chunkData);

      restoreEntityArray(state.entities.bosses,snapshot.entities?.bosses);
      restoreEntityArray(state.entities.bossFireballs,snapshot.entities?.bossFireballs);
      restoreEntityArray(state.entities.serpentProjectiles,snapshot.entities?.serpentProjectiles);
      restoreEntityArray(state.entities.bossProjectiles,snapshot.entities?.bossProjectiles);
      restoreEntityArray(state.entities.pickups,snapshot.entities?.pickups);
      restoreEntityArray(state.entities.seedParticles,snapshot.entities?.seedParticles);
      restoreEntityArray(state.entities.enemyNests,snapshot.entities?.enemyNests);
      restoreEntityArray(state.entities.invasionPortals,snapshot.entities?.invasionPortals);
      restoreEntityArray(state.entities.furniture,snapshot.entities?.furniture);

      state.ui.inventoryOpen=false;
      state.ui.craftingOpen=false;
      state.ui.craftingIndex=0;
      state.ui.worldMenuOpen=false;
      state.ui.inventoryRects.length=0;
      state.paused=false;
      state.save.activeSlot=safeSlot;
      state.save.lastSavedAt=Number(snapshot.meta?.savedAt)||0;
      state.save.dirty=false;
      globalThis.localStorage.setItem(ACTIVE_SLOT_KEY,String(safeSlot));
      chunks.updateActiveNeighborhood();
      afterLoad?.();
      refreshSlots();
      nextAutosaveFrame=state.frame+AUTOSAVE_INTERVAL_FRAMES;
      if(!silent)setStatus(`LOADED SLOT ${safeSlot}`);
      return true;
    }catch{
      if(!silent)setStatus(`SLOT ${safeSlot} COULD NOT LOAD`);
      return false;
    }
  }

  function remove(slot){
    const safeSlot=clampSlot(slot);
    if(!supported)return false;
    try{
      globalThis.localStorage.removeItem(slotKey(safeSlot));
      if(state.save.activeSlot===safeSlot){
        state.save.lastSavedAt=0;
        state.save.dirty=true;
      }
      refreshSlots();
      setStatus(`DELETED SLOT ${safeSlot}`);
      return true;
    }catch{
      setStatus('DELETE FAILED');
      return false;
    }
  }

  function activeSlotFromStorage(){
    if(!supported)return 1;
    const stored=Number(globalThis.localStorage.getItem(ACTIVE_SLOT_KEY));
    return clampSlot(stored||1);
  }

  function loadLastActive(){
    const slot=activeSlotFromStorage();
    state.save.activeSlot=slot;
    return load(slot,{silent:true});
  }

  function autosave(reason='auto'){
    if(!state.save.dirty)return false;
    return save(state.save.activeSlot,{silent:false,reason});
  }

  function update(){
    if(state.frame<nextAutosaveFrame)return;
    autosave('auto');
    nextAutosaveFrame=state.frame+AUTOSAVE_INTERVAL_FRAMES;
  }

  function install(){
    if(installed)return;
    installed=true;
    globalThis.window?.addEventListener?.('beforeunload',()=>{
      if(state.save.dirty)save(state.save.activeSlot,{silent:true,reason:'auto'});
    });
  }

  refreshSlots();
  return {
    supported,
    slotCount:SLOT_COUNT,
    markDirty,
    refreshSlots,
    listSlots:()=>refreshSlots(),
    save,
    load,
    remove,
    loadLastActive,
    autosave,
    update,
    install,
  };
}

Object.assign(exports,{createSaveSystem});

};

__modules["src/systems/juice-system.js"]=function(exports,__require){
const { JUICE_CONFIG } = __require("src/config.js");
const { nearestPixel } = __require("src/pixel-grid.js");
const { MaterialId } = __require("src/data/materials.db.js");
const IMPACT_COLORS=Object.freeze({
  bullet:['rgb(255,247,196)','rgb(255,174,62)','rgb(199,77,36)'],
  blade:['rgb(246,250,255)','rgb(145,205,238)','rgb(72,116,166)'],
  laser:['rgb(255,252,220)','rgb(255,149,48)','rgb(238,54,35)'],
  fire:['rgb(255,236,134)','rgb(255,105,34)','rgb(151,38,29)'],
  crystal:['rgb(245,240,255)','rgb(173,126,246)','rgb(76,63,154)'],
  enemy:['rgb(255,232,213)','rgb(255,106,92)','rgb(136,42,61)'],
  boss:['rgb(255,249,222)','rgb(255,172,75)','rgb(202,54,67)'],
  pickup:['rgb(245,255,212)','rgb(139,239,142)','rgb(73,169,125)'],
  dust:['rgb(218,199,157)','rgb(151,126,92)','rgb(92,75,66)'],
  rainbow:['rgb(255,65,96)','rgb(255,180,55)','rgb(255,239,91)','rgb(74,221,127)','rgb(67,161,244)','rgb(191,93,246)'],
});

function createJuiceSystem(state,noise){
  const juice=state.juice;
  const M=MaterialId;
  let serial=0;
  const healthSnapshots=new WeakMap();
  const hitEffectFrames=new WeakMap();
  const observedExplosions=new WeakSet();
  const projectileSnapshots=new Map();
  let audioContext=null;
  let lastAudioFrame=-999;
  let cellBurstBudget=JUICE_CONFIG.maxCellBurstsPerFrame;

  function random(index,salt=0){
    serial++;
    return noise.randomAt(state.frame+serial,index+salt,state.seed^0x6a09e667);
  }

  function trim(array,max){
    if(array.length>max)array.splice(0,array.length-max);
  }

  function particle(x,y,options={}){
    const life=Math.max(2,Math.round(options.life??18));
    state.entities.juiceParticles.push({
      x:nearestPixel(x),
      y:nearestPixel(y),
      vx:Number(options.vx)||0,
      vy:Number(options.vy)||0,
      carryX:0,
      carryY:0,
      gravity:Number(options.gravity)||0,
      drag:Number.isFinite(options.drag)?options.drag:.95,
      life,
      maxLife:life,
      color:options.color??'rgb(255,255,255)',
      size:Math.max(1,Math.round(options.size??1)),
      kind:options.kind??'pixel',
      twinkle:Number(options.twinkle)||0,
    });
    trim(state.entities.juiceParticles,JUICE_CONFIG.maxParticles);
  }

  function burst(x,y,options={}){
    const colors=options.colors??IMPACT_COLORS.dust;
    const count=Math.max(1,Math.min(64,Math.round(options.count??8)));
    const speedMin=Number(options.speedMin??.35);
    const speedMax=Number(options.speedMax??1.55);
    const baseAngle=Number(options.angle??0);
    const spread=Number(options.spread??Math.PI*2);
    for(let index=0;index<count;index++){
      const t=count<=1?.5:index/(count-1);
      const angle=baseAngle-spread*.5+spread*t+(random(index,31)-.5)*.42;
      const speed=speedMin+(speedMax-speedMin)*random(index,32);
      particle(x,y,{
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed+(options.lift??0),
        gravity:options.gravity??.055,
        drag:options.drag??.95,
        life:(options.lifeMin??10)+Math.floor(random(index,33)*((options.lifeMax??24)-(options.lifeMin??10)+1)),
        color:colors[Math.floor(random(index,34)*colors.length)%colors.length],
        size:random(index,35)>(options.largeChance??.76)?2:1,
        kind:options.kind??'pixel',
        twinkle:options.twinkle??0,
      });
    }
  }

  function shake(amount,frames=14){
    juice.shake=Math.max(juice.shake,Math.max(0,Number(amount)||0));
    juice.shakeFrames=Math.max(juice.shakeFrames,Math.max(1,Math.round(frames)));
  }

  function hitStop(frames=1){
    juice.hitStopFrames=Math.max(juice.hitStopFrames,Math.min(JUICE_CONFIG.maxHitStopFrames,Math.max(0,Math.round(frames))));
  }

  function worldFlash(x,y,color='rgb(255,255,255)',radius=4,life=7){
    state.entities.juiceFlashes.push({x:nearestPixel(x),y:nearestPixel(y),color,radius,life,maxLife:life});
    trim(state.entities.juiceFlashes,JUICE_CONFIG.maxFlashes);
  }

  function screenFlash(color='rgba(255,255,255,.22)',life=4){
    juice.screenFlashColor=color;
    juice.screenFlash=Math.max(juice.screenFlash,Math.max(1,Math.round(life)));
    juice.screenFlashMax=Math.max(juice.screenFlashMax,juice.screenFlash);
  }

  function shockwave(x,y,color='rgb(255,238,180)',radius=12,life=14){
    state.entities.juiceShockwaves.push({
      x:nearestPixel(x),y:nearestPixel(y),color,
      radius:Math.max(2,radius),life,maxLife:life,
    });
    trim(state.entities.juiceShockwaves,JUICE_CONFIG.maxShockwaves);
  }

  function number(x,y,value,color='rgb(255,246,218)',options={}){
    if(value===null||value===undefined)return;
    const numeric=Number(value);
    const text=Number.isFinite(numeric)
      ?`${options.prefix??''}${Math.max(1,Math.round(Math.abs(numeric)))}`
      :String(value);
    state.entities.damageNumbers.push({
      x:nearestPixel(x),y:nearestPixel(y),text,color,
      life:options.life??42,maxLife:options.life??42,
      carryY:0,
      vy:options.vy??-.28,
      big:Boolean(options.big),
    });
    trim(state.entities.damageNumbers,JUICE_CONFIG.maxDamageNumbers);
  }

  function impact(x,y,options={}){
    const kind=options.kind??'enemy';
    const heavy=Boolean(options.heavy);
    const colors=options.colors??IMPACT_COLORS[kind]??IMPACT_COLORS.enemy;
    const angle=Number.isFinite(options.angle)?options.angle:0;
    burst(x,y,{
      colors,
      count:options.count??(heavy?18:7),
      speedMin:heavy?.55:.28,
      speedMax:heavy?2.1:1.25,
      angle:angle+Math.PI,
      spread:heavy?Math.PI*1.75:Math.PI*1.2,
      gravity:kind==='laser'?.035:.065,
      lifeMin:heavy?15:8,
      lifeMax:heavy?32:20,
      largeChance:heavy?.58:.86,
      kind:kind==='blade'?'slash':'pixel',
    });
    worldFlash(x,y,colors[0],heavy?6:3,heavy?9:5);
    if(options.damage)number(x,y-3,options.damage,options.numberColor??colors[0],{big:heavy});
    shake(options.shake??(heavy?3.4:.85),heavy?18:8);
    hitStop(options.hitStop??(heavy?3:1));
    play(kind==='blade'?'slice':'hit',heavy?1:.55);
  }

  function explosion(x,y,radius=8,options={}){
    const kind=options.kind??'fire';
    const colors=options.colors??(kind==='rainbow'?IMPACT_COLORS.rainbow:IMPACT_COLORS[kind]??IMPACT_COLORS.fire);
    const strength=Math.max(1,Math.min(16,radius));
    burst(x,y,{
      colors,
      count:Math.min(48,18+Math.round(strength*1.8)),
      speedMin:.65,
      speedMax:1.8+strength*.13,
      gravity:.05,
      lifeMin:16,
      lifeMax:38,
      largeChance:.46,
      kind:kind==='rainbow'?'star':'pixel',
      twinkle:kind==='rainbow'?3:0,
    });
    shockwave(x,y,colors[0],strength*1.5,18+Math.round(strength*.35));
    worldFlash(x,y,colors[0],Math.max(5,strength*.8),10);
    shake(Math.min(8,1.8+strength*.52),20+Math.round(strength));
    hitStop(Math.min(JUICE_CONFIG.maxHitStopFrames,3+Math.floor(strength/4)));
    screenFlash(kind==='rainbow'?'rgba(255,90,230,.18)':'rgba(255,218,158,.18)',4);
    play('explosion',Math.min(1,0.35+strength/16));
  }

  function weaponFire(kind,x,y,direction={x:1,y:0}){
    const colors=kind==='laser'?IMPACT_COLORS.laser:kind==='nyan'?IMPACT_COLORS.rainbow:['rgb(255,250,210)','rgb(255,190,70)'];
    const count=kind==='sword'?12:kind==='grenade'?7:kind==='nyan'?18:5;
    burst(x,y,{
      colors,count,
      speedMin:.25,speedMax:kind==='nyan'?1.7:1.05,
      angle:Math.atan2(direction.y,direction.x),spread:kind==='sword'?2.4:.8,
      gravity:.025,lifeMin:6,lifeMax:16,largeChance:.9,
      kind:kind==='sword'?'slash':'pixel',twinkle:kind==='nyan'?3:0,
    });
    juice.recoilFrames=Math.max(juice.recoilFrames,kind==='grenade'||kind==='nyan'?8:4);
    juice.recoilX=-Math.sign(direction.x||1)*(kind==='grenade'||kind==='nyan'?2:1);
    shake(kind==='nyan'?2.8:kind==='grenade'?1.6:kind==='gun'?.55:.35,8);
    if(kind==='gun')play('shot',.5);
    else if(kind==='sword')play('slice',.65);
    else if(kind==='nyan')play('nyan',.55);
  }

  function jump(x,y){
    burst(x,y,{colors:IMPACT_COLORS.dust,count:7,speedMin:.2,speedMax:.8,angle:Math.PI*.5,spread:2.4,gravity:.04,lifeMin:9,lifeMax:18});
    juice.playerStretch=Math.max(juice.playerStretch,6);
    play('jump',.35);
  }

  function bunnyHop(x,y,chain=2){
    const level=Math.max(2,Math.round(chain));
    const colors=level>=8
      ?IMPACT_COLORS.rainbow
      :['rgb(112,232,255)','rgb(203,250,255)','rgb(110,156,255)'];
    burst(x,y,{
      colors,
      count:Math.min(26,8+level*2),
      speedMin:.35,
      speedMax:1.05+level*.08,
      angle:-Math.PI*.5,
      spread:Math.PI*.8,
      gravity:.025,
      lifeMin:10,
      lifeMax:24,
      twinkle:level>=6?2:0,
      kind:level>=8?'star':'streak',
    });
    number(x,y-7,`X${level}`,level>=8?'rgb(255,126,238)':'rgb(151,239,255)',{life:28,big:level>=6,vy:-.34});
    worldFlash(x,y,level>=8?'rgb(255,92,225)':'rgb(124,232,255)',Math.min(7,3+Math.floor(level/2)),6);
    if(level>=4)shockwave(x,y,level>=8?'rgb(255,110,234)':'rgb(122,224,255)',4+level*.55,9);
    shake(Math.min(2.4,.25+level*.18),8+Math.floor(level/2));
    juice.playerStretch=Math.max(juice.playerStretch,7+Math.floor(level/3));
    juice.speedIntensity=Math.max(juice.speedIntensity,Math.min(1,.2+level*.08));
    play('jump',Math.min(1,.35+level*.055));
  }

  function land(x,y,speed=1){
    const strength=Math.max(.2,Math.min(3,Number(speed)||.2));
    burst(x,y,{colors:IMPACT_COLORS.dust,count:Math.round(5+strength*5),speedMin:.25,speedMax:.65+strength*.32,angle:-Math.PI*.5,spread:Math.PI*.92,gravity:.055,lifeMin:10,lifeMax:24});
    juice.playerSquash=Math.max(juice.playerSquash,Math.round(5+strength*2));
    if(strength>1){
      shake(strength*.7,9);
      shockwave(x,y,'rgb(205,187,147)',3+strength*2,9);
    }
    play('land',Math.min(.65,strength*.28));
  }

  function pickup(x,y,label='+1'){
    burst(x,y,{colors:IMPACT_COLORS.pickup,count:10,speedMin:.15,speedMax:.8,gravity:-.01,drag:.96,lifeMin:16,lifeMax:30,twinkle:3});
    worldFlash(x,y,'rgb(235,255,205)',4,9);
    number(x,y-3,label,'rgb(222,255,190)',{life:34});
    juice.hudPulse=Math.max(juice.hudPulse,12);
    play('pickup',.35);
  }

  function enemyDeath(x,y,color='rgb(255,120,100)'){
    burst(x,y,{colors:[color,'rgb(255,238,215)','rgb(110,43,58)'],count:20,speedMin:.3,speedMax:1.7,gravity:.07,lifeMin:14,lifeMax:34,largeChance:.55});
    shockwave(x,y,color,7,12);
    hitStop(2);
    shake(1.4,12);
    play('defeat',.45);
  }

  function bossSpawn(x,y,color='rgb(255,220,140)'){
    burst(x,y,{colors:[color,'rgb(255,255,245)','rgb(120,80,190)'],count:42,speedMin:.5,speedMax:2.4,gravity:-.005,drag:.97,lifeMin:22,lifeMax:48,largeChance:.5,twinkle:2});
    shockwave(x,y,color,20,28);
    screenFlash('rgba(255,244,210,.28)',8);
    shake(7,38);
    hitStop(6);
    play('boss',.9);
  }

  function bossDefeat(x,y,color='rgb(255,220,140)'){
    for(let wave=0;wave<3;wave++){
      burst(x,y,{colors:[color,...IMPACT_COLORS.rainbow],count:30,speedMin:.55+wave*.3,speedMax:2.4+wave*.45,gravity:.045,lifeMin:24,lifeMax:58,largeChance:.48,twinkle:3,kind:'star'});
    }
    shockwave(x,y,'rgb(255,255,255)',28,34);
    screenFlash('rgba(255,255,255,.42)',11);
    shake(9,48);
    hitStop(8);
    juice.celebrationFrames=Math.max(juice.celebrationFrames,150);
    play('victory',1);
  }


  function cellChange(event){
    if(!event||cellBurstBudget<=0)return;
    const reason=String(event.reason??'');
    if(reason==='simulation'||reason==='weather'||reason==='plant-growth'||reason==='safe-spawn'||reason==='player-depenetration')return;
    const dramatic=/destruculator|grenade|drone|nyan|laser|boss|explosion|weapon|reality|fire|harvest/.test(reason);
    if(!dramatic)return;
    const oldType=event.oldType;
    const newType=event.newType;
    const colorsByMaterial={
      [M.ROCK]:['rgb(151,153,164)','rgb(91,92,105)'],
      [M.DIRT]:['rgb(170,128,84)','rgb(104,76,55)'],
      [M.GRASS]:['rgb(113,189,88)','rgb(67,124,68)'],
      [M.SAND]:['rgb(231,205,139)','rgb(171,137,80)'],
      [M.WOOD]:['rgb(181,126,73)','rgb(102,69,48)'],
      [M.LEAF]:['rgb(102,186,83)','rgb(54,115,63)'],
      [M.CRYSTAL]:IMPACT_COLORS.crystal,
      [M.SNOW]:['rgb(244,251,255)','rgb(167,211,236)'],
      [M.ASH]:['rgb(139,123,119)','rgb(74,69,72)'],
      [M.MYCELIUM]:['rgb(204,113,188)','rgb(109,72,132)'],
      [M.BAMBOO]:['rgb(177,211,83)','rgb(91,144,65)'],
    };
    if(newType===M.STEAM){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:['rgba(239,250,255,.78)','rgba(154,207,226,.52)'],count:4,speedMin:.1,speedMax:.55,gravity:-.045,drag:.97,lifeMin:12,lifeMax:24});
      return;
    }
    if(newType===M.FIRE||newType===M.LAVA){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:IMPACT_COLORS.fire,count:4,speedMin:.15,speedMax:.75,gravity:-.025,lifeMin:9,lifeMax:19});
      return;
    }
    if(newType===M.AIR&&oldType!==M.AIR){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:colorsByMaterial[oldType]??IMPACT_COLORS.dust,count:3,speedMin:.12,speedMax:.7,gravity:.06,lifeMin:8,lifeMax:18,largeChance:.9});
    }
  }

  function cameraOffset(){
    if(juice.shakeFrames<=0||juice.shake<=.05)return {x:0,y:0};
    const magnitude=Math.max(1,Math.ceil(juice.shake));
    const sx=Math.floor(random(1,1201)*(magnitude*2+1))-magnitude;
    const sy=Math.floor(random(2,1202)*(magnitude*2+1))-magnitude;
    return {x:sx,y:sy};
  }

  function moveInteger(entity){
    entity.carryX=(entity.carryX??0)+entity.vx;
    entity.carryY=(entity.carryY??0)+entity.vy;
    const dx=Math.trunc(entity.carryX);
    const dy=Math.trunc(entity.carryY);
    entity.carryX-=dx;
    entity.carryY-=dy;
    entity.x+=dx;
    entity.y+=dy;
  }

  function updateParticles(){
    const particles=state.entities.juiceParticles;
    for(let index=particles.length-1;index>=0;index--){
      const item=particles[index];
      item.vx*=item.drag;
      item.vy=item.vy*item.drag+item.gravity;
      moveInteger(item);
      item.life--;
      if(item.life<=0)particles.splice(index,1);
    }
    for(let index=state.entities.damageNumbers.length-1;index>=0;index--){
      const item=state.entities.damageNumbers[index];
      item.carryY+=item.vy;
      const dy=Math.trunc(item.carryY);
      item.carryY-=dy;
      item.y+=dy;
      item.vy*=.96;
      item.life--;
      if(item.life<=0)state.entities.damageNumbers.splice(index,1);
    }
    for(let index=state.entities.juiceFlashes.length-1;index>=0;index--){
      const item=state.entities.juiceFlashes[index];
      item.life--;
      if(item.life<=0)state.entities.juiceFlashes.splice(index,1);
    }
    for(let index=state.entities.juiceShockwaves.length-1;index>=0;index--){
      const item=state.entities.juiceShockwaves[index];
      item.life--;
      if(item.life<=0)state.entities.juiceShockwaves.splice(index,1);
    }
  }

  function observeExplosions(){
    for(const effect of state.entities.explosions){
      if(observedExplosions.has(effect))continue;
      observedExplosions.add(effect);
      const kind=effect.kind==='nyan'?'rainbow':effect.kind==='serpent'?'crystal':'fire';
      explosion(effect.x,effect.y,Math.min(16,effect.radius??7),{kind,color:effect.color});
    }
  }

  function observeHealth(){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const previous=healthSnapshots.get(enemy);
        if(Number.isFinite(previous)&&enemy.hp<previous){
          const delta=previous-enemy.hp;
          const last=hitEffectFrames.get(enemy)??-999;
          const interval=delta>=8?0:delta>=2?3:7;
          if(delta>=.35&&state.frame-last>=interval){
            impact(enemy.x,enemy.y-1,{kind:'enemy',damage:delta,shake:delta>25?1.8:.35,hitStop:delta>25?2:0,count:delta>25?12:5});
            hitEffectFrames.set(enemy,state.frame);
          }
        }
        healthSnapshots.set(enemy,enemy.hp);
      }
    }
    for(const boss of state.entities.bosses){
      const previous=healthSnapshots.get(boss);
      if(Number.isFinite(previous)&&boss.hp<previous){
        const delta=previous-boss.hp;
        const last=hitEffectFrames.get(boss)??-999;
        const interval=delta>=10?0:delta>=2?3:7;
        if(delta>=.3&&state.frame-last>=interval){
          impact(boss.x,boss.y,{kind:'boss',damage:delta,heavy:delta>=25,shake:delta>=25?2.8:.55,hitStop:delta>=25?3:0,count:delta>=25?16:6});
          hitEffectFrames.set(boss,state.frame);
        }
      }
      healthSnapshots.set(boss,boss.hp);
    }
  }

  function observeProjectiles(){
    const current=new Set();
    const tracked=[
      ['bullet',state.entities.bullets],
      ['grenade',state.entities.grenades],
      ['glaive',state.entities.glaives],
      ['nyan',state.entities.nyanCats],
    ];
    for(const [kind,array] of tracked){
      for(const entity of array){
        current.add(entity);
        const previous=projectileSnapshots.get(entity);
        if(kind==='glaive'&&previous&&Number(entity.bounces??0)>Number(previous.bounces??0)){
          impact(entity.x,entity.y,{kind:'blade',angle:Math.atan2(entity.vy,entity.vx),count:9,shake:.6,hitStop:1});
        }
        if(kind==='nyan'&&previous&&Number(entity.bounces??0)>Number(previous.bounces??0)){
          burst(entity.x,entity.y,{colors:IMPACT_COLORS.rainbow,count:14,speedMin:.35,speedMax:1.3,gravity:.04,lifeMin:10,lifeMax:24,twinkle:2});
          shake(1.1,8);
          play('bounce',.45);
        }
        projectileSnapshots.set(entity,{x:entity.x,y:entity.y,bounces:entity.bounces??0,kind});
      }
    }
    for(const [entity,previous] of projectileSnapshots){
      if(current.has(entity))continue;
      projectileSnapshots.delete(entity);
      if(previous.kind==='bullet')impact(previous.x,previous.y,{kind:'bullet',count:5,shake:.25,hitStop:0});
    }
  }

  function observeMotion(){
    const speed=Math.hypot(state.player.vx??0,state.player.vy??0);
    juice.speedIntensity=Math.max(0,Math.min(1,(speed-.75)/1.4));
    if(state.player.grounded&&Math.abs(state.player.vx)>.34&&state.frame%7===0){
      particle(state.player.x-Math.sign(state.player.vx||1),state.player.y,{vx:-state.player.vx*.2,vy:-.18,gravity:.04,drag:.9,life:10,color:'rgba(196,178,140,.55)'});
    }
    if(speed>1.15&&state.frame%4===0){
      particle(state.player.x-Math.sign(state.player.vx||1)*2,state.player.y-2,{
        vx:-state.player.vx*.35,vy:-state.player.vy*.18,gravity:0,drag:.9,life:9,
        color:'rgba(180,225,255,.55)',kind:'streak',
      });
    }
  }

  function update(){
    cellBurstBudget=JUICE_CONFIG.maxCellBurstsPerFrame;
    const frozen=juice.hitStopFrames>0;
    if(juice.hitStopFrames>0)juice.hitStopFrames--;
    if(juice.shakeFrames>0){
      juice.shakeFrames--;
      juice.shake*=.86;
    }else juice.shake=0;
    if(juice.screenFlash>0)juice.screenFlash--;
    if(juice.recoilFrames>0)juice.recoilFrames--;
    else juice.recoilX=0;
    if(juice.playerSquash>0)juice.playerSquash--;
    if(juice.playerStretch>0)juice.playerStretch--;
    if(juice.hudPulse>0)juice.hudPulse--;
    if(juice.celebrationFrames>0){
      juice.celebrationFrames--;
      if(state.frame%4===0){
        particle(state.player.x-24+Math.floor(random(3)*48),state.player.y-28,{
          vx:(random(4)-.5)*.8,vy:.25+random(5)*.45,gravity:.01,drag:.99,
          life:28+Math.floor(random(6)*28),color:IMPACT_COLORS.rainbow[Math.floor(random(7)*6)],kind:'star',twinkle:3,
        });
      }
    }
    updateParticles();
    observeMotion();
    return frozen;
  }

  function afterSimulation(){
    observeExplosions();
    observeHealth();
    observeProjectiles();
  }

  function play(kind,intensity=.5){
    if(state.frame-lastAudioFrame<2&&kind!=='explosion'&&kind!=='boss'&&kind!=='victory')return;
    lastAudioFrame=state.frame;
    try{
      const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!AudioContextClass)return;
      audioContext??=new AudioContextClass();
      if(audioContext.state==='suspended')audioContext.resume?.();
      const now=audioContext.currentTime;
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const settings={
        shot:['square',180,70,.055],
        hit:['square',110,55,.04],
        slice:['sawtooth',360,110,.07],
        explosion:['sawtooth',85,28,.18],
        jump:['square',180,280,.08],
        land:['triangle',95,55,.06],
        pickup:['sine',520,820,.1],
        defeat:['square',180,75,.12],
        boss:['sawtooth',72,42,.36],
        victory:['square',260,780,.42],
        bounce:['square',240,145,.055],
        nyan:['square',330,660,.12],
      }[kind]??['square',160,90,.06];
      oscillator.type=settings[0];
      oscillator.frequency.setValueAtTime(settings[1],now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,settings[2]),now+settings[3]);
      gain.gain.setValueAtTime(Math.min(.055,.015+.035*intensity),now);
      gain.gain.exponentialRampToValueAtTime(.0001,now+settings[3]);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now+settings[3]+.01);
    }catch{
      // Audio is optional and may be unavailable before a user gesture.
    }
  }

  return {
    update,afterSimulation,cameraOffset,
    particle,burst,impact,explosion,weaponFire,jump,bunnyHop,land,pickup,
    enemyDeath,bossSpawn,bossDefeat,cellChange,shake,hitStop,worldFlash,screenFlash,shockwave,number,play,
  };
}

Object.assign(exports,{createJuiceSystem});

};

__modules["src/render/palette.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT } = __require("src/config.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { cropById } = __require("src/data/crops.db.js");
const { dimensionDefinition, isEarthDimension } = __require("src/data/dimensions.db.js");
function createPalette(state,generator,timeSystem,weatherSystem=null){
  const M=MaterialId;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const smooth=t=>{
    const x=clamp(t,0,1);
    return x*x*(3-2*x);
  };
  const mixColor=(a,b,t)=>[
    a[0]+(b[0]-a[0])*t,
    a[1]+(b[1]-a[1])*t,
    a[2]+(b[2]-a[2])*t,
  ];

  function cropColor(cropId,part,shade=0){
    const crop=cropById(cropId);
    const base=crop?.[part]??[112,150,78];
    return base.map((channel,index)=>clamp(channel+shade*(index===1?.45:.28),0,255));
  }

  function skyColor(worldX,worldY,surface){
    const sky=generator.skyAt(worldX);
    const altitude=surface.ground-worldY;
    const topBlend=smooth(altitude/92);
    const horizon=mixColor(sky.bottom,[232,220,185],.07);
    let day=mixColor(horizon,sky.top,topBlend);
    const time=timeSystem.getTime();
    const nightTop=[4,7,24];
    const nightBottom=[19,24,48];
    const night=mixColor(nightBottom,nightTop,topBlend);
    day=mixColor(day,night,time.nightStrength*.94);

    if(time.dawn>0){
      const warm=mixColor([240,123,83],[103,73,128],topBlend);
      day=mixColor(day,warm,time.dawn*(1-topBlend*.45)*.5);
    }
    if(time.dusk>0){
      const warm=mixColor([244,112,68],[92,62,122],topBlend);
      day=mixColor(day,warm,time.dusk*(1-topBlend*.38)*.62);
    }

    const weather=weatherSystem?.getWeather?.();
    if(weather&&weather.intensity>.01){
      const strength=weather.intensity;
      if(['rain','thunderstorm','ocean_storm'].includes(weather.type)){
        day=mixColor(day,[52,64,82],strength*(weather.type==='rain'?.3:.52));
      }else if(weather.type==='fog'){
        day=mixColor(day,[166,174,176],strength*.58);
      }else if(['snow','blizzard'].includes(weather.type)){
        day=mixColor(day,[185,202,218],strength*(weather.type==='blizzard'?.44:.24));
      }else if(weather.type==='ashfall'){
        day=mixColor(day,[92,75,72],strength*.52);
      }else if(weather.type==='heatwave'){
        day=mixColor(day,[224,154,94],strength*.22);
      }else if(weather.type==='spore_haze'){
        day=mixColor(day,[112,75,126],strength*.35);
      }
    }
    return day;
  }

  function baseColor(type,shade,x,y,cropId=0){
    const flicker=(state.frame+x*3+y*5)&7;
    if(type===M.ROCK)return[46+shade,42+shade,57+shade/2];
    if(type===M.DIRT)return[106+shade,70+shade/2,38];
    if(type===M.GRASS)return[48+shade/3,136+shade,52+shade/3];
    if(type===M.WATER){
      const camera=state.world.camera;
      const worldX=camera.chunkX*WORLD_WIDTH+x;
      const worldY=camera.chunkY*WORLD_HEIGHT+y;
      const surface=generator.surfaceAt(worldX);
      if(surface.ocean){
        const depth=Math.max(0,worldY-surface.water);
        return[18+shade*.18,88+shade*.55-Math.min(22,depth*.45),164+shade*.65-Math.min(28,depth*.55)];
      }
      return[28,96+shade,174+shade];
    }
    if(type===M.SAND)return[184+shade,145+shade/2,72];
    if(type===M.WOOD)return[112+shade,68+shade/2,34];
    if(type===M.LEAF)return[35+shade/3,108+shade,44+shade/3];
    if(type===M.LAVA)return[240,65+flicker*9,8];
    if(type===M.CRYSTAL)return[50+shade,220+Math.min(30,shade),245];
    if(type===M.FIRE)return[255,105+flicker*18,18+shade];
    if(type===M.NAPALM)return[206+shade*.6,104+flicker*4,20+shade*.2];
    if(type===M.SMOKE)return[68+shade,64+shade,76+shade];
    if(type===M.SNOW)return[230+shade*.3,238+shade*.3,245+shade*.2];
    if(type===M.MUD)return[78+shade,64+shade*.5,42];
    if(type===M.BAMBOO)return[126+shade*.3,188+shade,74+shade*.2];
    if(type===M.ASH)return[92+shade*.6,86+shade*.6,84+shade*.5];
    if(type===M.MYCELIUM)return[91+shade*.45,68+shade*.3,112+shade*.55];
    if(type===M.MUSHROOM_STEM)return[212+shade*.25,198+shade*.2,170+shade*.15];
    if(type===M.MUSHROOM_CAP)return[174+shade*.45,54+shade*.2,118+shade*.5];
    if(type===M.STEAM)return[188+shade*.35,214+shade*.3,225+shade*.25];
    if(type===M.CROP_STEM)return cropColor(cropId,'stem',shade);
    if(type===M.CROP_LEAF)return cropColor(cropId,'leaf',shade);
    if(type===M.CROP_FRUIT)return cropColor(cropId,'fruit',shade);

    const camera=state.world.camera;
    const worldX=camera.chunkX*WORLD_WIDTH+x;
    const worldY=camera.chunkY*WORLD_HEIGHT+y;
    const surface=generator.surfaceAt(worldX);

    if(worldY<surface.ground)return skyColor(worldX,worldY,surface);

    const depth=worldY-surface.ground;
    const caveBlend=smooth(clamp(depth/58,0,1));
    return mixColor([25,27,38],[8,9,17],caveBlend);
  }

  function color(type,shade,x,y,cropId=0){
    const base=baseColor(type,shade,x,y,cropId);
    if(isEarthDimension(state.world.dimension)||type===M.AIR)return base;
    const definition=dimensionDefinition(state.world.dimension);
    let strength=definition.tintStrength??0;
    if(state.world.dimension==='prism')strength+=((state.frame+x+y)%12<4)?.12:0;
    if(state.world.dimension==='static')strength+=((Math.floor(x/3)+Math.floor(y/3)+Math.floor(state.frame/8))%5===0)?.2:0;
    return mixColor(base,definition.materialTint??base,Math.min(.55,strength));
  }

  return { color, cropColor, skyColor };
}

Object.assign(exports,{createPalette});

};

__modules["src/render/renderer.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT, MAGNIFIER_CONFIG, PERFORMANCE_CONFIG, REALITY_ZIPPER_CONFIG } = __require("src/config.js");
const { WeaponId, WEAPON_DB } = __require("src/data/weapons.db.js");
const { MaterialId } = __require("src/data/materials.db.js");
const { targetCornerRects, invalidCrossRects, pointerCrosshairRects } = __require("src/render/reticle.js");
const { playerPixelBounds } = __require("src/player-geometry.js");
const { faunaById, lootById } = __require("src/data/fauna.db.js");
const { WeatherType } = __require("src/data/weather.db.js");
const { dimensionDefinition } = __require("src/data/dimensions.db.js");
const { drawPixelText, pixelTextWidth } = __require("src/render/pixel-font.js");
const { PlayerPixel, rotatedSwimSprite } = __require("src/render/player-sprite.js");
const { FURNITURE_PIXEL_COLORS, SIGN_LABELS, furnitureById, furnitureBounds } = __require("src/data/furniture.db.js");
function createRenderer(state,canvas,chunks,weapons,palette,timeSystem,weatherSystem=null,juiceSystem=null,furnitureSystem=null){
  const context=canvas.getContext('2d',{alpha:false});
  context.imageSmoothingEnabled=false;
  const M=MaterialId;
  const terrainImage=context.createImageData(WORLD_WIDTH,WORLD_HEIGHT);
  const terrainData=terrainImage.data;
  const TERRAIN_FULL_REFRESH_FRAMES=PERFORMANCE_CONFIG.terrainFullRefreshFrames;
  let cachedTerrainChunk=null;
  let lastFullTerrainFrame=-TERRAIN_FULL_REFRESH_FRAMES;
  let lastTerrainPixelsUpdated=0;

  function ensureRenderTracking(chunk){
    if(!chunk.renderDirtyFlags){
      chunk.renderDirtyFlags=new Uint8Array(chunk.cells.length);
      chunk.renderDirtyQueue=[];
      chunk.renderAllDirty=true;
    }
  }

  function writeTerrainPixel(chunk,index){
    const x=index%WORLD_WIDTH;
    const y=Math.floor(index/WORLD_WIDTH);
    const offset=index*4;
    const color=palette.color(chunk.cells[index],chunk.shade[index],x,y,chunk.cropId?.[index]??0);
    terrainData[offset]=color[0];
    terrainData[offset+1]=color[1];
    terrainData[offset+2]=color[2];
    terrainData[offset+3]=255;
  }

  function refreshTerrainCache(chunk){
    ensureRenderTracking(chunk);
    const fullRefresh=chunk!==cachedTerrainChunk
      ||chunk.renderAllDirty
      ||state.frame-lastFullTerrainFrame>=TERRAIN_FULL_REFRESH_FRAMES;

    if(fullRefresh){
      for(let index=0;index<chunk.cells.length;index++)writeTerrainPixel(chunk,index);
      chunk.renderDirtyFlags.fill(0);
      chunk.renderDirtyQueue.length=0;
      chunk.renderAllDirty=false;
      cachedTerrainChunk=chunk;
      lastFullTerrainFrame=state.frame;
      lastTerrainPixelsUpdated=chunk.cells.length;
      return;
    }

    let updated=0;
    for(const index of chunk.renderDirtyQueue){
      if(!chunk.renderDirtyFlags[index])continue;
      writeTerrainPixel(chunk,index);
      chunk.renderDirtyFlags[index]=0;
      updated++;
    }
    chunk.renderDirtyQueue.length=0;
    lastTerrainPixelsUpdated=updated;
  }


  function drawPixelLine(x0,y0,x1,y1,color,thickness=1){
    let ax=Math.round(x0);
    let ay=Math.round(y0);
    const bx=Math.round(x1);
    const by=Math.round(y1);
    const dx=Math.abs(bx-ax);
    const sx=ax<bx?1:-1;
    const dy=-Math.abs(by-ay);
    const sy=ay<by?1:-1;
    let error=dx+dy;
    const half=Math.floor(Math.max(1,thickness)/2);
    context.fillStyle=color;

    while(true){
      context.fillRect(ax-half,ay-half,Math.max(1,thickness),Math.max(1,thickness));
      if(ax===bx&&ay===by)break;
      const twiceError=2*error;
      if(twiceError>=dy){ error+=dy; ax+=sx; }
      if(twiceError<=dx){ error+=dx; ay+=sy; }
    }
  }

  function drawPixelCircle(cx,cy,radius,color,thickness=1){
    const centerX=Math.round(cx);
    const centerY=Math.round(cy);
    const outer=Math.max(1,Math.round(radius));
    const inner=Math.max(0,outer-Math.max(1,Math.round(thickness)));
    const outerSquared=outer*outer;
    const innerSquared=inner*inner;
    context.fillStyle=color;

    for(let y=-outer;y<=outer;y++){
      for(let x=-outer;x<=outer;x++){
        const distanceSquared=x*x+y*y;
        if(distanceSquared>outerSquared||distanceSquared<innerSquared)continue;
        context.fillRect(centerX+x,centerY+y,1,1);
      }
    }
  }

  function drawPixelBox(x,y,width,height,color){
    const left=Math.round(x);
    const top=Math.round(y);
    const right=left+Math.max(1,Math.round(width))-1;
    const bottom=top+Math.max(1,Math.round(height))-1;
    drawPixelLine(left,top,right,top,color);
    drawPixelLine(left,bottom,right,bottom,color);
    drawPixelLine(left,top,left,bottom,color);
    drawPixelLine(right,top,right,bottom,color);
  }

  function hash(value){
    let n=(value|0)^state.seed;
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    return (n^(n>>>16))>>>0;
  }

  function paintSkyPixel(current,x,y,color,alpha=1){
    const px=Math.round(x);
    const py=Math.round(y);
    if(px<0||py<0||px>=WORLD_WIDTH||py>=WORLD_HEIGHT)return;
    if(current.cells[px+py*WORLD_WIDTH]!==M.AIR)return;
    context.fillStyle=`rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha})`;
    context.fillRect(px,py,1,1);
  }

  function drawDisk(current,cx,cy,radius,color,alpha=1){
    for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
      if(ox*ox+oy*oy<=radius*radius)paintSkyPixel(current,cx+ox,cy+oy,color,alpha);
    }
  }

  function drawSkyDetails(current,originX,originY){
    if(originY>0)return;
    const time=timeSystem.getTime();

    if(time.nightStrength>.08){
      for(let index=0;index<72;index++){
        const value=hash(index+state.world.camera.chunkX*977);
        const x=value%WORLD_WIDTH;
        const y=3+((value>>>9)%52);
        const twinkle=.35+(((state.frame>>4)+index)%5)*.12;
        paintSkyPixel(current,x,y,[225,233,255],Math.min(.95,time.nightStrength*twinkle));
      }
    }

    if(time.isDay){
      const x=7+time.phaseProgress*(WORLD_WIDTH-14);
      const y=42-Math.sin(time.phaseProgress*Math.PI)*31;
      drawDisk(current,x,y,4,[255,226,118],Math.max(.35,time.daylight));
      paintSkyPixel(current,x-1,y-1,[255,248,208],time.daylight);
    }else{
      const x=7+time.phaseProgress*(WORLD_WIDTH-14);
      const y=39-Math.sin(time.phaseProgress*Math.PI)*27;
      drawDisk(current,x,y,3,[210,220,238],.85);
      drawDisk(current,x+1,y-1,2,[91,103,139],.55);
    }

    const drift=state.frame*.012;
    const first=Math.floor((originX-drift-100)/66);
    const last=Math.ceil((originX+WORLD_WIDTH-drift+100)/66);
    const cloudColor=time.isDay?[224,230,232]:[76,83,105];
    const cloudAlpha=.46+.34*time.daylight;
    const cloudShape=[
      [-5,1],[-4,0],[-3,0],[-2,-1],[-1,-2],[0,-2],[1,-1],[2,-1],[3,0],[4,0],[5,1],
      [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    ];

    for(let cloudIndex=first;cloudIndex<=last;cloudIndex++){
      const value=hash(cloudIndex*7919+27);
      const worldX=cloudIndex*66+(value%31)+drift;
      const localX=worldX-originX;
      const y=11+((value>>>8)%25);
      const scale=1+((value>>>15)&1);
      for(const [ox,oy] of cloudShape){
        for(let sx=0;sx<scale;sx++)paintSkyPixel(current,localX+ox*scale+sx,y+oy,cloudColor,cloudAlpha);
      }
    }
  }

  function positiveModulo(value,modulus){
    return ((value%modulus)+modulus)%modulus;
  }

  function fillWrappedRect(x,y,width,height){
    const left=positiveModulo(Math.round(x),WORLD_WIDTH);
    const top=Math.max(0,Math.round(y));
    const drawHeight=Math.min(Math.max(1,Math.round(height)),WORLD_HEIGHT-top);
    const drawWidth=Math.min(WORLD_WIDTH,Math.max(1,Math.round(width)));
    if(drawHeight<=0)return;
    const firstWidth=Math.min(drawWidth,WORLD_WIDTH-left);
    context.fillRect(left,top,firstWidth,drawHeight);
    if(firstWidth<drawWidth)context.fillRect(0,top,drawWidth-firstWidth,drawHeight);
  }

  function drawVisibilityHaze(weather,type){
    const hazeStrength=Math.max(0,(1-weather.visibility)*.68);
    if(hazeStrength<=.025)return;

    const colors={
      [WeatherType.FOG]:[194,204,211],
      [WeatherType.BLIZZARD]:[222,232,238],
      [WeatherType.OCEAN_STORM]:[142,164,181],
      [WeatherType.ASHFALL]:[94,82,78],
      [WeatherType.SPORE_HAZE]:[114,78,128],
    };
    const color=colors[type]??colors[WeatherType.FOG];
    const alpha=Math.min(.34,.055+hazeStrength*.48);
    const slowFrame=Math.floor(state.frame/18);
    const windDrift=Math.floor(state.frame*weather.windX*.08);
    const bankCount=8+Math.round(hazeStrength*18);

    // Large, irregular banks replace the old evenly spaced screen-wide
    // stipple. Their silhouettes remain stable and move slowly as whole pixels,
    // preventing the pale checkerboard shimmer visible at high resolution.
    context.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    for(let bank=0;bank<bankCount;bank++){
      const value=hash(bank*3253+weather.segment*1877+41);
      const width=24+((value>>>2)%72);
      const height=2+((value>>>9)%7);
      const direction=bank%3===0?-1:1;
      const baseX=positiveModulo((value%WORLD_WIDTH)+windDrift+slowFrame*direction,WORLD_WIDTH);
      const baseY=3+((value>>>17)%Math.max(1,WORLD_HEIGHT-8));
      const maxInset=Math.max(2,Math.floor(width*.18));
      for(let row=0;row<height;row++){
        const rowValue=hash(value+row*811+97);
        const inset=rowValue%maxInset;
        const rowShift=((rowValue>>>7)%7)-3;
        const rowWidth=Math.max(4,width-inset*2-((rowValue>>>13)%9));
        fillWrappedRect(baseX+inset+rowShift,baseY+row,rowWidth,1);
      }
    }

    const fleckCount=10+Math.round(hazeStrength*36);
    context.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${Math.max(.035,alpha*.52)})`;
    for(let index=0;index<fleckCount;index++){
      const value=hash(index*4937+weather.segment*659+173);
      const x=positiveModulo((value%WORLD_WIDTH)+windDrift+Math.floor(slowFrame/2),WORLD_WIDTH);
      const y=2+((value>>>10)%Math.max(1,WORLD_HEIGHT-4));
      context.fillRect(x,y,(value>>>21)%5===0?2:1,1);
    }
  }

  function drawWeather(originX,originY){
    const weather=weatherSystem?.getWeather?.();
    if(!weather||weather.intensity<=.02)return;
    const intensity=weather.intensity;
    const wind=Math.round(weather.windX*4);
    const type=weather.type;

    if([WeatherType.RAIN,WeatherType.THUNDERSTORM,WeatherType.OCEAN_STORM].includes(type)){
      const count=Math.round((type===WeatherType.RAIN?48:88)*intensity);
      const speed=type===WeatherType.RAIN?3:4;
      for(let index=0;index<count;index++){
        const value=hash(index*1777+weather.segment*991);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.32),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+state.frame*speed+index*7,WORLD_HEIGHT);
        const length=type===WeatherType.RAIN?2:3;
        drawPixelLine(x,y,x+Math.sign(wind),y+length,type===WeatherType.RAIN?'rgba(139,199,235,.8)':'rgba(185,224,248,.9)');
      }
    }else if([WeatherType.SNOW,WeatherType.BLIZZARD].includes(type)){
      const count=Math.round((type===WeatherType.SNOW?55:105)*intensity);
      context.fillStyle=type===WeatherType.SNOW?'rgba(235,244,250,.92)':'rgba(248,252,255,.95)';
      for(let index=0;index<count;index++){
        const value=hash(index*2099+weather.segment*613);
        const sway=Math.round(Math.sin((state.frame+index*11)*.08)*(type===WeatherType.BLIZZARD?3:1));
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.45)+sway,WORLD_WIDTH);
        const y=positiveModulo(((value>>>9)%WORLD_HEIGHT)+Math.floor(state.frame/(type===WeatherType.BLIZZARD?2:3))+index*5,WORLD_HEIGHT);
        context.fillRect(x,y,type===WeatherType.BLIZZARD&&index%5===0?2:1,1);
      }
    }else if(type===WeatherType.ASHFALL){
      const count=Math.round(72*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*2371+weather.segment*701);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.25),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+Math.floor(state.frame/3)+index*3,WORLD_HEIGHT);
        context.fillStyle=index%4===0?'rgba(160,119,91,.9)':'rgba(97,85,82,.86)';
        context.fillRect(x,y,1,1);
      }
    }else if(type===WeatherType.CAVE_DRIP){
      const count=Math.round(20*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*1871+weather.segment*433);
        const x=value%WORLD_WIDTH;
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+state.frame*2+index*13,WORLD_HEIGHT);
        context.fillStyle='rgba(112,181,224,.8)';
        context.fillRect(x,y,1,2);
      }
    }else if(type===WeatherType.SPORE_HAZE){
      const count=Math.round(64*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*2791+weather.segment*557);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.round(Math.sin((state.frame+index*17)*.025)*4),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)-Math.floor(state.frame/5)+index*3,WORLD_HEIGHT);
        context.fillStyle=index%3===0?'rgba(231,148,218,.82)':'rgba(154,93,177,.66)';
        context.fillRect(x,y,1,1);
      }
    }else if(type===WeatherType.BREEZE){
      const count=Math.round(18*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*1597+weather.segment*379);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX),WORLD_WIDTH);
        const y=5+((value>>>8)%(WORLD_HEIGHT-10));
        drawPixelLine(x,y,x+Math.sign(weather.windX)*3,y,'rgba(224,235,238,.32)');
      }
    }

    for(const flash of state.weather?.flashes??[]){
      const targetX=Math.round(flash.x-originX);
      const targetY=Math.round(flash.y-originY);
      let x=targetX;
      let y=0;
      const bright=flash.frames%4<2;
      while(y<targetY){
        const nextY=Math.min(targetY,y+5);
        const nextX=x+((hash(y+flash.x+flash.frames)%3)-1);
        drawPixelLine(x,y,nextX,nextY,bright?'rgb(248,252,255)':'rgb(161,190,235)',bright?2:1);
        x=nextX;
        y=nextY;
      }
    }

    if(type===WeatherType.FOG||type===WeatherType.BLIZZARD||type===WeatherType.OCEAN_STORM||type===WeatherType.ASHFALL||type===WeatherType.SPORE_HAZE){
      drawVisibilityHaze(weather,type);
    }

    if(type===WeatherType.HEATWAVE){
      context.fillStyle='rgba(255,188,102,.12)';
      for(let x=(state.frame>>2)%5;x<WORLD_WIDTH;x+=5){
        const y=8+positiveModulo(hash(x+weather.segment)%83+Math.floor(state.frame/6),83);
        context.fillRect(x,y,1,2);
      }
    }
  }


  const NYAN_RAINBOW=[
    'rgb(255,64,72)',
    'rgb(255,145,46)',
    'rgb(255,224,76)',
    'rgb(83,208,98)',
    'rgb(62,151,238)',
    'rgb(154,91,224)',
  ];

  const REALITY_COLORS=[
    'rgb(255,45,196)',
    'rgb(82,250,244)',
    'rgb(255,238,72)',
    'rgb(118,255,92)',
    'rgb(143,72,255)',
    'rgb(255,103,48)',
    'rgb(235,247,255)',
    'rgb(48,126,255)',
  ];

  function drawNyanCatProjectile(cat,originX,originY){
    const trail=cat.trail??[];
    for(let index=trail.length-2;index>=0;index--){
      const point=trail[index];
      const next=trail[index+1];
      const fade=index/Math.max(1,trail.length-1);
      if(fade>.92)continue;
      for(let band=0;band<NYAN_RAINBOW.length;band++){
        drawPixelLine(
          point.x-originX,
          point.y-originY-3+band,
          next.x-originX,
          next.y-originY-3+band,
          NYAN_RAINBOW[band],
          1,
        );
      }
    }

    const x=Math.round(cat.x-originX);
    const y=Math.round(cat.y-originY);
    if(x<-18||y<-12||x>WORLD_WIDTH+18||y>WORLD_HEIGHT+12)return;
    const facing=Math.sign(cat.vx||1);
    const flap=Math.floor((state.frame+(cat.phase??0)*4)/4)%2;
    const rx=offset=>x+offset*facing;

    context.fillStyle='rgb(92,72,91)';
    context.fillRect(Math.min(rx(-5),rx(4)),y-3,10,7);
    context.fillStyle='rgb(237,181,114)';
    context.fillRect(Math.min(rx(-4),rx(3)),y-2,8,5);
    context.fillStyle='rgb(247,213,151)';
    context.fillRect(Math.min(rx(-3),rx(2)),y-1,6,3);
    context.fillStyle='rgb(241,110,143)';
    context.fillRect(rx(-2),y-1,1,1);
    context.fillRect(rx(1),y+1,1,1);

    context.fillStyle='rgb(126,127,145)';
    context.fillRect(Math.min(rx(4),rx(8)),y-3,5,6);
    context.fillRect(rx(5),y-5,1,2);
    context.fillRect(rx(8),y-5,1,2);
    context.fillStyle='rgb(207,210,220)';
    context.fillRect(rx(5),y-2,1,1);
    context.fillRect(rx(7),y-2,1,1);
    context.fillStyle='rgb(42,43,55)';
    context.fillRect(rx(5),y-1,1,1);
    context.fillRect(rx(7),y-1,1,1);
    context.fillRect(rx(8),y+1,1,1);

    context.fillStyle='rgb(126,127,145)';
    context.fillRect(rx(-6),y-1,2,2);
    context.fillRect(rx(-7),y-2+(flap?1:0),2,1);
    context.fillRect(rx(-3),y+4,2,1);
    context.fillRect(rx(2),y+4+(flap?0:1),2,1);
  }

  function drawProjectiles(originX,originY){
    for(const cat of state.entities.nyanCats??[])drawNyanCatProjectile(cat,originX,originY);

    for(const spark of state.entities.nyanSparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle=NYAN_RAINBOW[(spark.colorIndex??0)%NYAN_RAINBOW.length];
        context.fillRect(x,y,spark.life>25?2:1,1);
      }
    }

    for(const spark of state.entities.realitySparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        context.fillStyle=REALITY_COLORS[(spark.colorIndex??0)%REALITY_COLORS.length];
        const size=spark.life>27&&state.frame%3===0?2:1;
        context.fillRect(x,y,size,size);
        if(spark.life>20&&state.frame%4===0){
          context.fillRect(x-Math.sign(spark.vx||1),y-Math.sign(spark.vy||1),1,1);
        }
      }
    }

    for(const bullet of state.entities.bullets){
      const x=bullet.x-originX;
      const y=bullet.y-originY;
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle='rgb(255,235,145)';
        context.fillRect(Math.round(x),Math.round(y),2,1);
      }
    }

    for(const spark of state.entities.laserSparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle=spark.life>11?'rgb(255,248,204)':spark.life>6?'rgb(255,176,62)':'rgb(235,76,32)';
        context.fillRect(x,y,spark.life>10?2:1,1);
      }
    }

    for(const shot of state.entities.napalmShots){
      const x=shot.x-originX;
      const y=shot.y-originY;
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        // Airborne napalm is shown as an amber liquid droplet before ignition.
        context.fillStyle='rgb(232,132,34)';
        context.fillRect(Math.round(x)-1,Math.round(y)-1,3,2);
        context.fillStyle='rgb(255,190,64)';
        context.fillRect(Math.round(x),Math.round(y),1,1);
      }
    }

    for(const grenade of state.entities.grenades){
      const x=Math.round(grenade.x-originX);
      const y=Math.round(grenade.y-originY);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        context.fillStyle='rgb(42,54,42)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(128,148,82)';
        context.fillRect(x-1,y-1,2,1);
        if(grenade.fuse<24&&state.frame%6<3){
          context.fillStyle='rgb(255,176,55)';
          context.fillRect(x+1,y-2,1,1);
        }
      }
    }

    for(const drone of state.entities.drones){
      const x=Math.round(drone.x-originX);
      const y=Math.round(drone.y-originY+Math.sin(drone.bob)*.45);
      if(x>=-8&&y>=-5&&x<WORLD_WIDTH+8&&y<WORLD_HEIGHT+5){
        context.fillStyle='rgb(72,84,96)';
        context.fillRect(x-3,y-1,7,3);
        context.fillStyle='rgb(148,166,176)';
        context.fillRect(x-1,y-2,3,2);
        context.fillStyle='rgb(32,38,44)';
        context.fillRect(x-5,y-2,3,1);
        context.fillRect(x+3,y-2,3,1);
        context.fillStyle='rgb(108,225,240)';
        context.fillRect(x+(drone.direction>0?3:-3),y,1,1);
        if(!drone.launched){
          context.fillStyle='rgb(94,102,72)';
          context.fillRect(x,y+2,1,2);
        }
      }
    }

    for(const rocket of state.entities.droneRockets){
      const x=Math.round(rocket.x-originX);
      const y=Math.round(rocket.y-originY);
      if(x>=-5&&y>=-7&&x<WORLD_WIDTH+5&&y<WORLD_HEIGHT+7){
        const angle=Math.atan2(rocket.vy,rocket.vx);
        const tailX=Math.round(x-Math.cos(angle)*3);
        const tailY=Math.round(y-Math.sin(angle)*3);
        drawPixelLine(tailX,tailY,x,y,'rgb(226,230,220)',2);
        context.fillStyle='rgb(255,232,126)';
        context.fillRect(tailX-1,tailY-1,2,2);
        context.fillStyle='rgb(255,104,36)';
        context.fillRect(Math.round(tailX-Math.cos(angle)*2),Math.round(tailY-Math.sin(angle)*2),2,2);
      }
    }

    for(const blade of state.entities.glaives){
      const x=Math.round(blade.x-originX);
      const y=Math.round(blade.y-originY);
      if(x>=-5&&y>=-5&&x<WORLD_WIDTH+5&&y<WORLD_HEIGHT+5){
        const angle=blade.spin??0;
        const armLength=3;
        const color='rgb(215,225,240)';
        const edgeColor='rgb(118,205,232)';
        for(let arm=0;arm<4;arm++){
          const armAngle=angle+arm*Math.PI*.5;
          const endX=x+Math.cos(armAngle)*armLength;
          const endY=y+Math.sin(armAngle)*armLength;
          drawPixelLine(x,y,endX,endY,arm%2===0?color:edgeColor);
        }
        context.fillStyle='rgb(250,248,220)';
        context.fillRect(x,y,1,1);
      }
    }

    for(const seed of state.entities.seedParticles){
      const x=Math.round(seed.x-originX);
      const y=Math.round(seed.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        const color=palette.cropColor(seed.cropId,'seed',5);
        context.fillStyle=`rgb(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])})`;
        context.fillRect(x,y,1,1);
      }
    }

    for(const fireball of state.entities.bossFireballs){
      const x=Math.round(fireball.x-originX);
      const y=Math.round(fireball.y-originY);
      if(x>=-4&&y>=-4&&x<WORLD_WIDTH+4&&y<WORLD_HEIGHT+4){
        context.fillStyle='rgb(255,166,46)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(255,238,146)';
        context.fillRect(x,y,1,1);
        context.fillStyle='rgb(196,72,24)';
        context.fillRect(x-2,y,1,1);
        context.fillRect(x+2,y,1,1);
      }
    }

    for(const projectile of state.entities.serpentProjectiles){
      const x=Math.round(projectile.x-originX);
      const y=Math.round(projectile.y-originY);
      if(x>=-4&&y>=-4&&x<WORLD_WIDTH+4&&y<WORLD_HEIGHT+4){
        context.fillStyle='rgb(55,154,224)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(164,231,255)';
        context.fillRect(x,y-1,1,1);
        context.fillRect(x+1,y,1,1);
        context.fillStyle='rgb(26,91,166)';
        context.fillRect(x-2,y,1,1);
      }
    }

    for(const projectile of state.entities.bossProjectiles){
      const x=Math.round(projectile.x-originX);
      const y=Math.round(projectile.y-originY);
      if(projectile.kind==='lightning_marker'){
        const targetX=Math.round((projectile.targetX??projectile.x)-originX);
        const targetY=Math.round((projectile.targetY??projectile.y)-originY);
        const flash=(projectile.delay??0)<12||state.frame%8<4;
        drawDottedBeam(targetX,1,targetX,targetY,flash?'rgb(226,239,255)':'rgb(113,145,204)');
        context.fillStyle=flash?'rgb(245,250,255)':'rgb(135,166,218)';
        context.fillRect(targetX-2,targetY,5,1);
        continue;
      }
      if(x<-5||y<-5||x>WORLD_WIDTH+5||y>WORLD_HEIGHT+5)continue;
      const colors={
        ice_boulder:['rgb(168,223,247)','rgb(238,251,255)'],
        mud_glob:['rgb(112,92,48)','rgb(174,151,81)'],
        spore:['rgb(195,77,185)','rgb(248,181,239)'],
        bamboo_shard:['rgb(111,168,56)','rgb(210,235,123)'],
        branch:['rgb(102,67,40)','rgb(174,121,65)'],
        crystal_shard:['rgb(122,101,230)','rgb(226,219,255)'],
        magma_rock:['rgb(224,70,25)','rgb(255,207,88)'],
        shadow_bolt:['rgb(83,66,153)','rgb(196,181,255)'],
        cannonball:['rgb(48,61,64)','rgb(137,160,162)'],
        electric_orb:['rgb(109,113,225)','rgb(226,235,255)'],
        world_spit:['rgb(137,75,43)','rgb(224,157,91)'],
      };
      const pair=colors[projectile.kind]??['rgb(220,220,220)','rgb(255,255,255)'];
      context.fillStyle=pair[0];
      if(['bamboo_shard','branch','crystal_shard'].includes(projectile.kind)){
        const angle=Math.atan2(projectile.vy,projectile.vx);
        drawPixelLine(x-Math.cos(angle)*3,y-Math.sin(angle)*3,x+Math.cos(angle)*3,y+Math.sin(angle)*3,pair[0]);
        context.fillStyle=pair[1];
        context.fillRect(x,y,1,1);
      }else{
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle=pair[1];
        context.fillRect(x,y-1,1,1);
      }
    }

    for(const pickup of state.entities.pickups){
      const x=Math.round(pickup.x-originX);
      const y=Math.round(pickup.y-originY+Math.sin(pickup.bob)*.25);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        if(pickup.kind==='loot'){
          const loot=lootById(pickup.lootId);
          if(!loot)continue;
          const [r,g,b]=loot.color;
          context.fillStyle=`rgb(${r},${g},${b})`;
          context.fillRect(x-1,y-1,2,2);
          context.fillStyle=(pickup.cookedFlash??0)>0&&state.frame%4<2?'rgb(255,249,190)':'rgb(245,240,220)';
          context.fillRect(x,y-1,1,1);
          if((pickup.cookFrames??0)>0){
            context.fillStyle='rgb(255,151,54)';
            context.fillRect(x-2,y-2,1,1);
            if(pickup.cookFrames>=30)context.fillRect(x+1,y-3,1,1);
          }
        }else{
          const part=pickup.kind==='seed'?'seed':'fruit';
          const color=palette.cropColor(pickup.cropId,part,8);
          context.fillStyle=`rgb(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])})`;
          context.fillRect(x-1,y-1,pickup.kind==='produce'?2:1,pickup.kind==='produce'?2:1);
        }
        if(pickup.amount>1){
          context.fillStyle='rgba(245,248,255,.9)';
          context.fillRect(x+1,y-1,1,1);
        }
      }
    }
  }


  function drawExplosionEffects(originX,originY){
    for(const effect of state.entities.explosions){
      const progress=1-effect.frames/effect.maxFrames;
      const x=effect.x-originX;
      const y=effect.y-originY;
      const radius=Math.max(1,effect.radius*(.28+progress*.72));
      const droneStrike=effect.kind==='drone';
      const serpentSplash=effect.kind==='serpent';
      const nyanBurst=effect.kind==='nyan';
      if(nyanBurst){
        for(let band=0;band<NYAN_RAINBOW.length;band++){
          drawPixelCircle(x,y,Math.max(1,radius-band*.85),NYAN_RAINBOW[band],1);
        }
        if(effect.frames>11){
          context.fillStyle='rgb(255,250,220)';
          context.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);
          context.fillRect(Math.round(x)-5,Math.round(y),11,1);
          context.fillRect(Math.round(x),Math.round(y)-5,1,11);
        }
        continue;
      }
      const outerColor=effect.color??(serpentSplash
        ?(effect.frames>5?'rgb(174,235,248)':'rgb(47,147,216)')
        :droneStrike
          ?(effect.frames>12?'rgb(255,252,220)':'rgb(255,92,30)')
          :(effect.frames>7?'rgb(255,238,150)':'rgb(255,112,38)'));
      const thickness=serpentSplash?2:(droneStrike&&effect.frames>12?3:(effect.frames>7?2:1));
      drawPixelCircle(x,y,radius,outerColor,thickness);

      if(droneStrike){
        drawPixelCircle(x,y,Math.max(1,radius*.62),'rgb(255,178,54)',1);
      }

      if(effect.frames>(droneStrike?14:8)){
        context.fillStyle='rgb(255,245,205)';
        context.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);
      }
    }
  }


  function drawAmbientJuice(current,originX,originY){
    const biome=String(state.ui.hud?.biome??'');
    const underground=originY>0;
    let colors=null;
    let count=0;
    let driftY=0;
    if(biome.includes('swamp')){ colors=['rgba(220,242,112,.72)','rgba(119,203,105,.56)']; count=20; driftY=-1; }
    else if(biome.includes('mushroom')){ colors=['rgba(238,135,225,.65)','rgba(152,103,211,.55)']; count=26; driftY=-1; }
    else if(biome.includes('volcano')){ colors=['rgba(255,122,45,.72)','rgba(255,205,76,.54)']; count=20; driftY=-2; }
    else if(biome.includes('snow')){ colors=['rgba(237,247,255,.46)','rgba(173,213,236,.38)']; count=16; driftY=1; }
    else if(biome==='moon'){ colors=['rgba(225,230,255,.62)','rgba(146,134,220,.42)']; count=24; driftY=0; }
    else if(biome.includes('emberdeep')){ colors=['rgba(255,92,35,.72)','rgba(255,211,77,.52)']; count=28; driftY=-2; }
    else if(biome.includes('frostvoid')){ colors=['rgba(226,248,255,.62)','rgba(104,181,255,.42)']; count=26; driftY=1; }
    else if(biome.includes('prismatica')){ colors=['rgba(255,77,206,.62)','rgba(72,242,255,.56)','rgba(255,236,83,.5)']; count=30; driftY=-1; }
    else if(biome.includes('blacktide')){ colors=['rgba(70,216,224,.38)','rgba(18,95,150,.42)']; count=24; driftY=-1; }
    else if(biome.includes('verdant')){ colors=['rgba(166,255,111,.58)','rgba(51,194,92,.46)']; count=28; driftY=-1; }
    else if(biome.includes('clockwork')){ colors=['rgba(255,207,98,.46)','rgba(174,112,43,.38)']; count=18; driftY=0; }
    else if(biome.includes('lucid')){ colors=['rgba(255,123,226,.66)','rgba(126,101,255,.52)']; count=32; driftY=-1; }
    else if(biome.includes('cloudsea')){ colors=['rgba(255,255,255,.62)','rgba(132,213,255,.44)']; count=24; driftY=0; }
    else if(biome.includes('static')){ colors=['rgba(66,255,205,.62)','rgba(255,53,207,.58)','rgba(255,245,65,.48)']; count=30; driftY=0; }
    else if(underground){ colors=['rgba(163,179,193,.26)','rgba(109,130,151,.22)']; count=12; driftY=-1; }
    if(!colors)return;
    for(let index=0;index<count;index++){
      const value=hash(index*3253+state.world.camera.chunkX*557+state.world.camera.chunkY*911);
      const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*(index%2?-.03:.02)),WORLD_WIDTH);
      const y=positiveModulo(((value>>>9)%WORLD_HEIGHT)+Math.floor(state.frame*driftY/Math.max(1,18+(index%7)*3)),WORLD_HEIGHT);
      if(current.cells[x+y*WORLD_WIDTH]!==M.AIR)continue;
      context.fillStyle=colors[(index+Math.floor(state.frame/18))%colors.length];
      context.fillRect(x,y,(index%9===0&&state.frame%12<6)?2:1,1);
    }
  }

  function drawJuiceWorld(originX,originY){
    for(const wave of state.entities.juiceShockwaves??[]){
      const progress=1-wave.life/Math.max(1,wave.maxLife);
      const radius=Math.max(1,Math.round(wave.radius*progress));
      const x=wave.x-originX;
      const y=wave.y-originY;
      drawPixelCircle(x,y,radius,wave.color,wave.life>wave.maxLife*.5?2:1);
    }

    for(const flash of state.entities.juiceFlashes??[]){
      const ratio=flash.life/Math.max(1,flash.maxLife);
      const radius=Math.max(1,Math.round(flash.radius*ratio));
      const x=Math.round(flash.x-originX);
      const y=Math.round(flash.y-originY);
      context.fillStyle=flash.color;
      context.fillRect(x-radius,y,2*radius+1,1);
      context.fillRect(x,y-radius,1,2*radius+1);
      if(flash.life>flash.maxLife*.55){
        context.fillRect(x-1,y-1,3,3);
      }
    }

    for(const item of state.entities.juiceParticles??[]){
      const x=Math.round(item.x-originX);
      const y=Math.round(item.y-originY);
      if(x<-4||y<-4||x>WORLD_WIDTH+4||y>WORLD_HEIGHT+4)continue;
      if(item.twinkle&&Math.floor(item.life/item.twinkle)%2===0)continue;
      context.fillStyle=item.color;
      const size=item.life>item.maxLife*.66?item.size:1;
      if(item.kind==='star'){
        context.fillRect(x-1,y,3,1);
        context.fillRect(x,y-1,1,3);
      }else if(item.kind==='slash'){
        const horizontal=Math.abs(item.vx)>=Math.abs(item.vy);
        context.fillRect(x-(horizontal?1:0),y-(horizontal?0:1),horizontal?3:1,horizontal?1:3);
      }else if(item.kind==='streak'){
        const length=Math.max(2,Math.min(5,Math.round(Math.hypot(item.vx,item.vy)*3)));
        if(Math.abs(item.vx)>=Math.abs(item.vy))context.fillRect(x-Math.sign(item.vx||1)*length,y,length,1);
        else context.fillRect(x,y-Math.sign(item.vy||1)*length,1,length);
      }else{
        context.fillRect(x,y,size,size);
      }
    }

    for(const number of state.entities.damageNumbers??[]){
      const x=Math.round(number.x-originX);
      const y=Math.round(number.y-originY);
      if(x<-20||y<-10||x>WORLD_WIDTH+20||y>WORLD_HEIGHT+10)continue;
      const scale=number.big&&number.life>number.maxLife*.58?2:1;
      const width=pixelTextWidth(number.text,scale,scale);
      drawPixelText(context,number.text,x-Math.floor(width*.5)+1,y+1,'rgba(12,8,18,.78)',scale,scale);
      drawPixelText(context,number.text,x-Math.floor(width*.5),y,number.color,scale,scale);
    }
  }

  function drawJuiceScreen(){
    const speed=Math.max(0,Math.min(1,state.juice?.speedIntensity??0));
    if(speed>.02){
      const count=Math.round(4+speed*18);
      context.fillStyle='rgba(216,238,255,.28)';
      for(let index=0;index<count;index++){
        const value=hash(index*2017+Math.floor(state.frame/2));
        const x=value%WORLD_WIDTH;
        const y=(value>>>9)%WORLD_HEIGHT;
        const direction=Math.sign(state.player.vx||1);
        const length=2+Math.round(speed*6)+index%3;
        context.fillRect(x-direction*length,y,length,1);
      }
    }

    const hpRatio=Math.max(0,Math.min(1,state.player.hp/100));
    if(hpRatio<.28&&!state.ui.inventoryOpen&&!state.ui.worldMenuOpen){
      const pulse=(Math.sin(state.frame*.18)+1)*.5;
      const thickness=1+Math.round((1-hpRatio)*3+pulse);
      context.fillStyle=`rgba(145,18,34,${.16+pulse*.12})`;
      context.fillRect(0,0,WORLD_WIDTH,thickness);
      context.fillRect(0,WORLD_HEIGHT-thickness,WORLD_WIDTH,thickness);
      context.fillRect(0,0,thickness,WORLD_HEIGHT);
      context.fillRect(WORLD_WIDTH-thickness,0,thickness,WORLD_HEIGHT);
    }

    if((state.juice?.screenFlash??0)>0){
      context.fillStyle=state.juice.screenFlashColor??'rgba(255,255,255,.2)';
      context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    }
  }

  function drawHook(originX,originY){
    const hook=state.entities.hook;
    if(!hook.active)return;

    drawPixelLine(
      state.player.x-originX,
      state.player.y-2-originY,
      hook.x-originX,
      hook.y-originY,
      'rgb(185,190,200)',
    );

    context.fillStyle='rgb(240,205,80)';
    context.fillRect(Math.round(hook.x-originX)-1,Math.round(hook.y-originY)-1,3,3);
  }

  function rgb(color){ return `rgb(${color[0]},${color[1]},${color[2]})`; }

  function drawCreaturePixel(x,y,offsetX,offsetY,facing,color){
    context.fillStyle=color;
    context.fillRect(x+offsetX*facing,y+offsetY,1,1);
  }

  function drawCreatureRect(x,y,offsetX,offsetY,width,height,facing,color){
    context.fillStyle=color;
    const left=facing<0?x-offsetX-width+1:x+offsetX;
    context.fillRect(left,y+offsetY,width,height);
  }

  function drawCreatureSprite(enemy,species,x,y){
    const frame=Math.floor((state.frame+(enemy.animationOffset??0))/Math.max(2,species.animationRate??8))%2;
    const facing=enemy.facing<0?-1:1;
    const moving=Math.abs(enemy.vx??0)>.08||Math.abs(enemy.vy??0)>.08;
    const body=enemy.burning>0&&state.frame%4<2?'rgb(255,145,35)':enemy.hit>0?'rgb(255,235,235)':rgb(species.palette[0]);
    const accent=rgb(species.palette[1]);
    const dark=rgb(species.palette[2]);
    const legA=moving?(frame?0:1):0;
    const legB=moving?(frame?1:0):0;
    const sprite=species.sprite;

    if(sprite==='hare'){
      drawCreatureRect(x,y,-1,-2,3,2,facing,body);
      drawCreaturePixel(x,y,1,-3,facing,body); drawCreaturePixel(x,y,1,-4,facing,body);
      drawCreaturePixel(x,y,0,-4,facing,accent); drawCreaturePixel(x,y,-2,-2,facing,accent);
      drawCreaturePixel(x,y,1,0,facing,dark); drawCreaturePixel(x,y,-1-legA,0,facing,dark);
    }else if(sprite==='mouse'||sprite==='rat'){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,1,-2,facing,accent); drawCreaturePixel(x,y,2,-1,facing,dark);
      drawPixelLine(x-2*facing,y,x-(4+frame)*facing,y+frame,dark);
      drawCreaturePixel(x,y,-1,1,facing,dark); drawCreaturePixel(x,y,1,1,facing,dark);
    }else if(sprite==='deer'||sprite==='goat'||sprite==='yak'){
      const longBody=sprite==='yak'?5:4;
      drawCreatureRect(x,y,-2,-3,longBody,3,facing,body);
      drawCreatureRect(x,y,2,-5,2,3,facing,accent);
      drawCreaturePixel(x,y,3,-5,facing,dark);
      if(sprite==='deer'){
        drawPixelLine(x+2*facing,y-5,x+1*facing,y-7,dark);
        drawPixelLine(x+3*facing,y-5,x+4*facing,y-7,dark);
      }else if(sprite==='goat'){
        drawCreaturePixel(x,y,2,-6,facing,dark); drawCreaturePixel(x,y,3,-6,facing,dark);
      }else{
        drawCreatureRect(x,y,-3,-4,6,1,facing,dark);
        drawCreaturePixel(x,y,3,-5,facing,dark);
      }
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
    }else if(['fox','wolf','badger','boar','panda','quadruped'].includes(sprite)){
      const width=sprite==='panda'?5:4;
      drawCreatureRect(x,y,-2,-3,width,3,facing,body);
      drawCreatureRect(x,y,2,-4,2,2,facing,accent);
      drawCreaturePixel(x,y,3,-4,facing,dark);
      if(sprite==='fox'||sprite==='wolf')drawPixelLine(x-2*facing,y-3,x-(4+frame)*facing,y-4+frame,accent);
      if(sprite==='boar'){ drawCreaturePixel(x,y,4,-3,facing,accent); drawCreaturePixel(x,y,4,-2,facing,dark); }
      if(sprite==='badger')drawCreatureRect(x,y,-1,-3,3,1,facing,accent);
      if(sprite==='panda'){ drawCreaturePixel(x,y,2,-5,facing,dark); drawCreaturePixel(x,y,3,-5,facing,dark); }
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
    }else if(sprite==='squirrel'){
      drawCreatureRect(x,y,-1,-2,3,2,facing,body);
      drawCreatureRect(x,y,1,-4,2,2,facing,accent);
      drawPixelLine(x-1*facing,y-2,x-(3+frame)*facing,y-5+frame,accent,2);
      drawCreaturePixel(x,y,2,-4,facing,dark); drawCreaturePixel(x,y,-1,0,facing,dark);
    }else if(sprite==='hedgehog'){
      drawCreatureRect(x,y,-2,-2,4,2,facing,body);
      for(let i=-2;i<=1;i++)drawCreaturePixel(x,y,i,-3-(Math.abs(i)%2),facing,dark);
      drawCreaturePixel(x,y,2,-1,facing,accent); drawCreaturePixel(x,y,2,-2,facing,dark);
    }else if(['bee','hornet','firefly'].includes(sprite)){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,0,-2-frame,facing,accent); drawCreaturePixel(x,y,-1,-2+(frame?1:0),facing,accent);
      drawCreaturePixel(x,y,1,-1,facing,dark);
      if(sprite==='firefly')drawCreaturePixel(x,y,-1,0,facing,accent);
      else drawCreaturePixel(x,y,-1,-1,facing,dark);
    }else if(sprite==='swarm'){
      for(const [ox,oy] of [[-2,-1],[0,-2],[2,-1],[-1,1],[1,1]])drawCreaturePixel(x,y,ox+(frame&&oy<0?1:0),oy,facing,body);
      drawCreaturePixel(x,y,0,0,facing,accent);
    }else if(['bird','owl','duck'].includes(sprite)){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,2,-1,facing,accent); drawCreaturePixel(x,y,2,-2,facing,dark);
      const wingY=frame?-3:0;
      drawPixelLine(x,y-1,x-2*facing,y+wingY,accent,1);
      if(sprite==='owl'){ drawCreaturePixel(x,y,1,-2,facing,accent); drawCreaturePixel(x,y,0,-2,facing,accent); }
      if(sprite==='duck')drawCreaturePixel(x,y,3,-1,facing,accent);
    }else if(sprite==='penguin'){
      drawCreatureRect(x,y,-1,-4,3,4,facing,dark);
      drawCreatureRect(x,y,0,-3,2,3,facing,accent);
      drawCreaturePixel(x,y,2,-3,facing,species.palette[2]?rgb([232,157,60]):accent);
      drawCreaturePixel(x,y,-1-frame,0,facing,accent); drawCreaturePixel(x,y,1+frame,0,facing,accent);
    }else if(['bat','moth'].includes(sprite)){
      drawCreatureRect(x,y,0,-1,2,3,facing,body);
      const wingHeight=frame?1:3;
      drawPixelLine(x-1*facing,y-1,x-(4+frame)*facing,y-wingHeight,accent,2);
      drawPixelLine(x+1*facing,y-1,x+(4+frame)*facing,y-wingHeight,accent,2);
      drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(sprite==='imp'){
      drawCreatureRect(x,y,-1,-2,3,4,facing,body);
      drawCreaturePixel(x,y,-1,-3,facing,accent); drawCreaturePixel(x,y,1,-3,facing,accent);
      drawPixelLine(x-1*facing,y,x-(3+frame)*facing,y+2,dark);
      drawCreaturePixel(x,y,1,-1,facing,accent);
    }else if(['beetle','mite'].includes(sprite)){
      drawCreatureRect(x,y,-2,-2,4,3,facing,body);
      drawCreatureRect(x,y,-1,-2,2,2,facing,accent);
      drawCreaturePixel(x,y,2,-1,facing,dark);
      for(const side of [-1,1]){
        drawCreaturePixel(x,y,-1+frame,side>0?1:-3,facing,dark);
        drawCreaturePixel(x,y,1-frame,side>0?1:-3,facing,dark);
      }
    }else if(sprite==='mantis'){
      drawCreatureRect(x,y,0,-4,2,4,facing,body);
      drawCreaturePixel(x,y,1,-5,facing,accent);
      drawPixelLine(x,y-3,x+3*facing,y-4+frame,dark);
      drawPixelLine(x,y-2,x-2*facing,y-1-frame,dark);
      drawCreaturePixel(x,y,-1,0,facing,dark); drawCreaturePixel(x,y,1,0,facing,dark);
    }else if(sprite==='spider'){
      drawCreatureRect(x,y,-1,-2,3,3,facing,body);
      drawCreaturePixel(x,y,0,-2,facing,accent);
      for(const side of [-1,1])for(let leg=0;leg<3;leg++)drawPixelLine(x+side,y-1+leg,x+side*(3+frame),y-3+leg*2+(frame?1:0),dark);
    }else if(sprite==='scorpion'){
      drawCreatureRect(x,y,-2,-2,4,3,facing,body);
      drawCreaturePixel(x,y,2,-1,facing,accent);
      drawPixelLine(x-2*facing,y-2,x-4*facing,y-4-frame,dark);
      drawCreaturePixel(x,y,-4,-5-frame,facing,accent);
      drawCreaturePixel(x,y,-1,1,facing,dark); drawCreaturePixel(x,y,1,1,facing,dark);
    }else if(sprite==='crab'){
      drawCreatureRect(x,y,-2,-2,5,3,facing,body);
      drawCreaturePixel(x,y,-3,-2-frame,facing,accent); drawCreaturePixel(x,y,3,-2+(frame?0:-1),facing,accent);
      drawCreaturePixel(x,y,-2,1,facing,dark); drawCreaturePixel(x,y,2,1,facing,dark);
      drawCreaturePixel(x,y,-1,-2,facing,dark); drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(['lizard','gecko','newt','crawler'].includes(sprite)){
      drawCreatureRect(x,y,-2,-2,5,2,facing,body);
      drawCreaturePixel(x,y,2,-3,facing,accent); drawCreaturePixel(x,y,3,-2,facing,dark);
      drawPixelLine(x-2*facing,y-1,x-(5+frame)*facing,y-2+frame,accent);
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
      if(sprite==='crawler')drawCreatureRect(x,y,-1,-3,3,1,facing,dark);
    }else if(sprite==='frog'){
      const crouch=frame&&moving?1:0;
      drawCreatureRect(x,y,-1,-2+crouch,3,2,facing,body);
      drawCreaturePixel(x,y,1,-3+crouch,facing,accent); drawCreaturePixel(x,y,2,-2+crouch,facing,dark);
      drawCreaturePixel(x,y,-2,0,facing,dark); drawCreaturePixel(x,y,2+(frame?1:0),0,facing,dark);
    }else if(['snake','eel','leech','worm','grub'].includes(sprite)){
      const length=species.width??6;
      for(let i=0;i<length;i++)drawCreaturePixel(x,y,2-Math.floor(length/2)+i,(i+frame)%2, facing,i===length-1?accent:body);
      drawCreaturePixel(x,y,Math.ceil(length/2),0,facing,dark);
    }else if(['fish','shark','dolphin'].includes(sprite)){
      const length=sprite==='shark'||sprite==='dolphin'?6:4;
      drawCreatureRect(x,y,-Math.floor(length/2),-1,length,3,facing,body);
      drawCreaturePixel(x,y,Math.ceil(length/2),0,facing,dark);
      drawCreaturePixel(x,y,-Math.ceil(length/2)-1,-1-frame,facing,accent);
      drawCreaturePixel(x,y,-Math.ceil(length/2)-1,1+frame,facing,accent);
      if(sprite==='shark')drawCreaturePixel(x,y,0,-2,facing,accent);
      if(sprite==='dolphin')drawCreaturePixel(x,y,2,-2,facing,accent);
    }else if(sprite==='seahorse'){
      drawCreatureRect(x,y,0,-2,2,4,facing,body);
      drawCreaturePixel(x,y,2,-2,facing,accent); drawCreaturePixel(x,y,2,-3,facing,dark);
      drawPixelLine(x,y+1,x-2*facing,y+3-frame,accent);
    }else if(sprite==='squid'){
      drawCreatureRect(x,y,-1,-3,3,3,facing,body);
      drawCreaturePixel(x,y,0,-4,facing,accent);
      for(let i=-2;i<=2;i+=2)drawPixelLine(x+i,y,x+i+(frame?1:-1),y+3,dark);
      drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(sprite==='jellyfish'){
      drawCreatureRect(x,y,-2,-2,5,2,facing,body);
      drawCreatureRect(x,y,-1,-3,3,1,facing,accent);
      for(let i=-2;i<=2;i+=2)drawPixelLine(x+i,y,x+i+(frame?1:0),y+3,dark);
    }else if(sprite==='turtle'){
      drawCreatureRect(x,y,-2,-2,5,3,facing,body);
      drawCreatureRect(x,y,-1,-2,3,2,facing,accent);
      drawCreaturePixel(x,y,3,-1,facing,dark);
      drawCreaturePixel(x,y,-2-legA,1,facing,dark); drawCreaturePixel(x,y,2+legB,1,facing,dark);
    }else if(sprite==='snail'){
      drawCreatureRect(x,y,-2,-1,5,2,facing,body);
      drawCreatureRect(x,y,-1,-3,3,3,facing,accent);
      drawCreaturePixel(x,y,3,-2,facing,dark); drawCreaturePixel(x,y,3,-3-frame,facing,dark);
    }else if(sprite==='slime'){
      const squish=frame&&moving?1:0;
      drawCreatureRect(x,y,-2,-3+squish,5,3-squish,facing,body);
      drawCreatureRect(x,y,-1,-4+squish,3,1,facing,accent);
      drawCreaturePixel(x,y,1,-2+squish,facing,dark); drawCreaturePixel(x,y,-1,-2+squish,facing,dark);
    }else if(sprite==='sporeling'){
      drawCreatureRect(x,y,-1,-3,3,4,facing,body);
      drawCreatureRect(x,y,-2,-5,5,2,facing,accent);
      drawCreaturePixel(x,y,1,-4,facing,dark);
      drawCreaturePixel(x,y,-1-legA,1,facing,dark); drawCreaturePixel(x,y,1+legB,1,facing,dark);
    }else if(sprite==='mimic'){
      if(enemy.disguised){
        drawCreatureRect(x,y,-2,-4,5,5,facing,body);
        drawCreatureRect(x,y,-1,-3,3,3,facing,dark);
        drawCreaturePixel(x,y,-2,-5,facing,accent); drawCreaturePixel(x,y,0,-5,facing,accent); drawCreaturePixel(x,y,2,-5,facing,accent);
        drawCreaturePixel(x,y,-1,-2,facing,body); drawCreaturePixel(x,y,1,-1,facing,body);
      }else{
        drawCreatureRect(x,y,-2,-4,5,5,facing,body);
        drawCreatureRect(x,y,-1,-3,3,2,facing,dark);
        drawCreaturePixel(x,y,-1,-2,facing,accent); drawCreaturePixel(x,y,1,-2,facing,accent);
        drawCreaturePixel(x,y,-2,1,facing,dark); drawCreaturePixel(x,y,2,1,facing,dark);
      }
    }else{
      drawCreatureRect(x,y,-1,-1,3,3,facing,body);
      drawCreaturePixel(x,y,1,-1,facing,accent);
    }
  }

  function drawEnemyBehaviorWorld(originX,originY){
    for(const nest of state.entities.enemyNests??[]){
      const x=Math.round(nest.x-originX);
      const y=Math.round(nest.y-originY);
      if(x<-8||y<-8||x>WORLD_WIDTH+8||y>WORLD_HEIGHT+8)continue;
      const species=faunaById(nest.speciesId);
      const paletteRows=species?.palette??[[143,104,65],[221,194,137],[69,52,42]];
      const pulse=Math.floor((state.frame+(nest.phase??0)*10)/7)%2;
      context.fillStyle=rgb(paletteRows[2]);
      context.fillRect(x-3,y-2,7,3);
      context.fillRect(x-2,y-4,5,2);
      context.fillStyle=rgb(paletteRows[0]);
      context.fillRect(x-2,y-3,5,3);
      context.fillStyle=rgb(paletteRows[1]);
      context.fillRect(x-1,y-3,1,1);
      context.fillRect(x+1,y-2,1,1);
      if(pulse){
        context.fillStyle='rgb(244,232,185)';
        context.fillRect(x,y-4,1,1);
      }
    }

    for(const portal of state.entities.invasionPortals??[]){
      const x=Math.round(portal.x-originX);
      const y=Math.round(portal.y-originY);
      if(x<-12||y<-14||x>WORLD_WIDTH+12||y>WORLD_HEIGHT+14)continue;
      const colors=dimensionDefinition(portal.sourceDimension).portalColors;
      const opening=Math.min(1,(portal.age??0)/70);
      const radiusX=Math.max(2,Math.round(4*opening));
      const radiusY=Math.max(3,Math.round(7*opening));
      context.fillStyle='rgb(4,2,12)';
      context.fillRect(x-radiusX+1,y-radiusY+1,Math.max(1,radiusX*2-1),Math.max(2,radiusY*2-1));
      for(let step=0;step<24;step++){
        const angle=portal.phase+step/24*Math.PI*2;
        const px=x+Math.round(Math.cos(angle)*radiusX);
        const py=y+Math.round(Math.sin(angle)*radiusY);
        context.fillStyle=colors[(step+Math.floor(state.frame/3))%colors.length];
        context.fillRect(px,py,step%6===0?2:1,step%5===0?2:1);
      }
      if((portal.spawnTimer??99)<12){
        context.fillStyle='rgba(255,255,255,.75)';
        context.fillRect(x-radiusX-2,y,2,1);
        context.fillRect(x+radiusX+1,y,2,1);
      }
    }
  }

  function drawAttachedParasites(originX,originY){
    const attached=state.player.attachedParasites??[];
    if(attached.length===0)return;
    const baseX=Math.round(state.player.x-originX);
    const baseY=Math.round(state.player.y-2-originY);
    for(let index=0;index<attached.length;index++){
      const parasite=attached[index];
      const species=faunaById(parasite.speciesId);
      const color=species?rgb(species.palette[0]):'rgb(255,68,190)';
      const accent=species?rgb(species.palette[1]):'rgb(80,255,216)';
      const angle=(parasite.phase??0)+index*Math.PI*2/Math.max(1,attached.length);
      const x=baseX+Math.round(Math.cos(angle)*2);
      const y=baseY+Math.round(Math.sin(angle)*2);
      context.fillStyle=color;
      context.fillRect(x-1,y,3,1);
      context.fillStyle=accent;
      context.fillRect(x,y-1,1,1);
    }
  }

  function drawEnemies(originX,originY){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const species=faunaById(enemy.speciesId)??{
          sprite:'wisp',animationRate:8,palette:[[195,65,100],[255,170,190],[84,34,60]],width:3,height:3,
        };
        const x=enemy.x-originX;
        const y=enemy.y-originY;
        const margin=Math.max(species.width??3,species.height??3)+4;
        if(x<-margin||y<-margin||x>WORLD_WIDTH+margin||y>WORLD_HEIGHT+margin)continue;
        if(enemy.burrowed){
          const px=Math.round(x),py=Math.round(y);
          context.fillStyle='rgb(108,78,54)';
          context.fillRect(px-2,py-1,5,1);
          context.fillStyle='rgb(174,127,75)';
          context.fillRect(px+(state.frame%5<2?-1:1),py-2,1,1);
          continue;
        }
        drawCreatureSprite(enemy,species,Math.round(x),Math.round(y));
        if(enemy.climbing){
          context.fillStyle=rgb(species.palette[1]);
          context.fillRect(Math.round(x)+enemy.facing*3,Math.round(y)-3,1,1);
          context.fillRect(Math.round(x)+enemy.facing*3,Math.round(y),1,1);
        }
        if(Number.isInteger(enemy.stolenWeaponId)){
          drawWeaponIcon(Math.round(x)-4,Math.round(y)-11,enemy.stolenWeaponId);
          context.fillStyle=state.frame%8<4?'rgb(255,233,116)':'rgb(255,126,64)';
          context.fillRect(Math.round(x),Math.round(y)-7,1,1);
        }
      }
    }
  }


  function drawBossSprite(pixelX,pixelY,boss){
    const flapping=Math.floor((boss.flap??0)/2)%2===0;
    const bodyColor=boss.hit>0?'rgb(255,235,235)':'rgb(76,40,56)';
    const bodyShade='rgb(46,24,36)';
    const lavaColor='rgb(214,86,52)';
    const glowColor='rgb(255,192,88)';
    const wingColor='rgb(114,54,68)';

    context.fillStyle=wingColor;
    if(flapping){
      context.fillRect(pixelX-10,pixelY-5,4,1);
      context.fillRect(pixelX-12,pixelY-4,5,1);
      context.fillRect(pixelX-14,pixelY-3,6,1);
      context.fillRect(pixelX+7,pixelY-5,4,1);
      context.fillRect(pixelX+8,pixelY-4,5,1);
      context.fillRect(pixelX+8,pixelY-3,6,1);
    }else{
      context.fillRect(pixelX-12,pixelY-1,6,1);
      context.fillRect(pixelX-14,pixelY,7,1);
      context.fillRect(pixelX-12,pixelY+1,6,1);
      context.fillRect(pixelX+7,pixelY-1,6,1);
      context.fillRect(pixelX+8,pixelY,7,1);
      context.fillRect(pixelX+7,pixelY+1,6,1);
    }

    context.fillStyle=bodyShade;
    context.fillRect(pixelX-4,pixelY-4,9,2);
    context.fillRect(pixelX-6,pixelY-1,13,5);
    context.fillRect(pixelX-4,pixelY+4,9,2);
    context.fillRect(pixelX-1,pixelY+6,3,1);

    context.fillStyle=bodyColor;
    context.fillRect(pixelX-3,pixelY-5,7,2);
    context.fillRect(pixelX-5,pixelY-2,11,6);
    context.fillRect(pixelX-3,pixelY+4,7,1);

    context.fillStyle=lavaColor;
    context.fillRect(pixelX-2,pixelY-1,5,3);
    context.fillRect(pixelX-1,pixelY+2,3,1);

    context.fillStyle=glowColor;
    context.fillRect(pixelX-1,pixelY,1,1);
    context.fillRect(pixelX+1,pixelY,1,1);
    context.fillRect(pixelX,pixelY+1,1,1);

    context.fillStyle='rgb(245,72,56)';
    context.fillRect(pixelX-2,pixelY-3,1,1);
    context.fillRect(pixelX+2,pixelY-3,1,1);

    context.fillStyle='rgb(225,210,188)';
    context.fillRect(pixelX-4,pixelY-6,1,2);
    context.fillRect(pixelX+3,pixelY-6,1,2);
    context.fillRect(pixelX-3,pixelY+5,1,2);
    context.fillRect(pixelX+2,pixelY+5,1,2);
  }

  function drawSeaSerpentSprite(pixelX,pixelY,boss,originY){
    const waterY=Math.round((boss.waterY??boss.y+10)-originY);
    const hitFlash=boss.hit>0;
    const bodyColor=hitFlash?'rgb(238,250,255)':'rgb(24,110,126)';
    const bodyShade='rgb(14,62,83)';
    const finColor='rgb(38,154,151)';
    const bellyColor='rgb(82,190,174)';
    const eyeColor='rgb(255,220,96)';
    const phase=(boss.flap??0)*.28;

    const segments=Math.max(5,Math.min(11,Math.ceil((waterY-pixelY+18)/3)));
    for(let segment=segments-1;segment>=0;segment--){
      const sy=pixelY+5+segment*3;
      const sx=pixelX+Math.round(Math.sin(phase+segment*.72)*(3+segment*.38));
      const submerged=sy>=waterY;
      context.fillStyle=submerged?'rgb(18,77,109)':bodyShade;
      context.fillRect(sx-3,sy-1,7,3);
      context.fillStyle=submerged?'rgb(24,105,132)':bodyColor;
      context.fillRect(sx-2,sy-1,5,2);
      if(segment%2===0){
        context.fillStyle=submerged?'rgb(28,118,137)':finColor;
        context.fillRect(sx-4,sy,1,2);
        context.fillRect(sx+4,sy,1,2);
      }
    }

    context.fillStyle=bodyShade;
    context.fillRect(pixelX-5,pixelY-5,11,8);
    context.fillRect(pixelX-7,pixelY-2,15,4);
    context.fillRect(pixelX-4,pixelY+3,9,3);
    context.fillStyle=bodyColor;
    context.fillRect(pixelX-4,pixelY-6,9,8);
    context.fillRect(pixelX-6,pixelY-2,13,3);
    context.fillRect(pixelX-3,pixelY+2,7,3);

    context.fillStyle=bellyColor;
    context.fillRect(pixelX-2,pixelY-1,5,5);
    context.fillRect(pixelX-1,pixelY+4,3,1);

    context.fillStyle=finColor;
    context.fillRect(pixelX-7,pixelY-5,2,4);
    context.fillRect(pixelX+6,pixelY-5,2,4);
    context.fillRect(pixelX-9,pixelY-4,2,2);
    context.fillRect(pixelX+8,pixelY-4,2,2);
    context.fillRect(pixelX,pixelY-8,1,3);
    context.fillRect(pixelX-2,pixelY-7,1,2);
    context.fillRect(pixelX+2,pixelY-7,1,2);

    context.fillStyle=eyeColor;
    context.fillRect(pixelX-3,pixelY-4,1,1);
    context.fillRect(pixelX+3,pixelY-4,1,1);
    context.fillStyle='rgb(10,22,31)';
    context.fillRect(pixelX-3,pixelY-3,1,1);
    context.fillRect(pixelX+3,pixelY-3,1,1);

    context.fillStyle='rgb(210,244,244)';
    context.fillRect(pixelX-1,pixelY-6,1,1);
    context.fillRect(pixelX+1,pixelY-5,1,1);

    if(boss.phase==='emerge'||Math.abs(pixelY-waterY)<18){
      context.fillStyle='rgb(164,225,238)';
      const splashPhase=Math.floor((boss.flap??0))%3;
      context.fillRect(pixelX-10-splashPhase,waterY,5,1);
      context.fillRect(pixelX+6+splashPhase,waterY,5,1);
      context.fillRect(pixelX-6,waterY-1,3,1);
      context.fillRect(pixelX+4,waterY-2,3,1);
    }
  }

  function drawFrostColossus(x,y,boss){
    const body=boss.hit>0?'rgb(255,255,255)':'rgb(166,219,240)';
    context.fillStyle='rgb(77,125,160)';
    context.fillRect(x-5,y-6,11,12);
    context.fillRect(x-8,y-2,3,7);
    context.fillRect(x+6,y-2,3,7);
    context.fillRect(x-5,y+6,4,3);
    context.fillRect(x+2,y+6,4,3);
    context.fillStyle=body;
    context.fillRect(x-4,y-7,9,5);
    context.fillRect(x-6,y-2,13,8);
    context.fillRect(x-8,y-1,2,5);
    context.fillRect(x+7,y-1,2,5);
    context.fillStyle='rgb(229,248,255)';
    context.fillRect(x-2,y-5,1,1);
    context.fillRect(x+2,y-5,1,1);
    context.fillRect(x-2,y,5,2);
    context.fillStyle='rgb(87,155,205)';
    context.fillRect(x-1,y+1,3,1);
  }

  function drawBogLeviathan(x,y,boss){
    const body=boss.hit>0?'rgb(235,247,208)':'rgb(84,126,63)';
    context.fillStyle='rgb(55,70,43)';
    context.fillRect(x-9,y-3,19,7);
    context.fillRect(x-7,y-6,15,4);
    context.fillRect(x-6,y+4,4,2);
    context.fillRect(x+3,y+4,4,2);
    context.fillStyle=body;
    context.fillRect(x-8,y-4,17,7);
    context.fillRect(x-6,y-7,13,4);
    context.fillStyle='rgb(167,184,82)';
    context.fillRect(x-4,y-5,2,1);
    context.fillRect(x+3,y-5,2,1);
    context.fillStyle='rgb(37,30,27)';
    context.fillRect(x-4,y,9,2);
    context.fillStyle='rgb(166,71,79)';
    context.fillRect(x-1,y+2,5,1);
    context.fillStyle='rgb(89,67,37)';
    context.fillRect(x-8,y+3,17,2);
  }

  function drawMycelialMonarch(x,y,boss){
    const cap=boss.hit>0?'rgb(255,224,250)':'rgb(191,76,178)';
    context.fillStyle='rgb(68,39,74)';
    context.fillRect(x-10,y-6,21,5);
    context.fillRect(x-7,y-9,15,4);
    context.fillStyle=cap;
    context.fillRect(x-9,y-7,19,5);
    context.fillRect(x-6,y-10,13,4);
    context.fillStyle='rgb(245,178,227)';
    context.fillRect(x-5,y-8,2,2);
    context.fillRect(x+2,y-6,2,2);
    context.fillRect(x+6,y-7,1,1);
    context.fillStyle='rgb(217,190,168)';
    context.fillRect(x-4,y-2,9,10);
    context.fillStyle='rgb(136,103,123)';
    context.fillRect(x-6,y+6,3,2);
    context.fillRect(x+4,y+6,3,2);
    context.fillRect(x-8,y+8,5,1);
    context.fillRect(x+4,y+8,5,1);
    context.fillStyle='rgb(75,35,76)';
    context.fillRect(x-2,y+1,1,1);
    context.fillRect(x+2,y+1,1,1);
  }

  function drawBambooWarMachine(x,y,boss){
    const bamboo=boss.hit>0?'rgb(240,250,188)':'rgb(126,181,67)';
    context.fillStyle='rgb(55,80,42)';
    context.fillRect(x-7,y-5,15,9);
    context.fillRect(x-9,y-2,2,7);
    context.fillRect(x+8,y-2,2,7);
    context.fillRect(x-6,y+4,3,5);
    context.fillRect(x+4,y+4,3,5);
    context.fillStyle=bamboo;
    for(const ox of [-6,-3,0,3,6])context.fillRect(x+ox,y-4,2,8);
    context.fillRect(x-8,y-1,2,5);
    context.fillRect(x+7,y-1,2,5);
    context.fillStyle='rgb(180,214,91)';
    context.fillRect(x-5,y-6,11,2);
    context.fillStyle='rgb(231,74,45)';
    context.fillRect(x-1,y-1,3,3);
  }

  function drawSegmentedWyrm(x,y,boss,colors,segments=8,scale=1){
    const phase=(boss.flap??0)*.35;
    for(let segment=segments-1;segment>=0;segment--){
      const sx=x-segment*3*scale;
      const sy=y+Math.round(Math.sin(phase+segment*.7)*2);
      context.fillStyle=segment%2?colors[0]:colors[1];
      context.fillRect(sx-2*scale,sy-scale,5*scale,3*scale);
    }
    context.fillStyle=boss.hit>0?'rgb(255,255,255)':colors[2];
    context.fillRect(x-5*scale,y-3*scale,9*scale,6*scale);
    context.fillStyle=colors[3];
    context.fillRect(x+2*scale,y-2*scale,3*scale,2*scale);
    context.fillStyle='rgb(245,225,112)';
    context.fillRect(x+2*scale,y-2*scale,1,1);
  }

  function drawCanopyWyrm(x,y,boss){
    drawSegmentedWyrm(x+7,y,boss,['rgb(35,97,56)','rgb(57,132,70)','rgb(81,166,91)','rgb(28,50,34)'],8,1);
    context.fillStyle='rgb(79,146,67)';
    context.fillRect(x-2,y-6,6,2);
    context.fillRect(x+1,y+4,6,2);
    context.fillRect(x-12,y-5,5,1);
  }

  function drawCrystalBurrower(x,y,boss){
    drawSegmentedWyrm(x+9,y,boss,['rgb(57,46,112)','rgb(91,72,174)','rgb(129,104,231)','rgb(37,31,67)'],10,1);
    context.fillStyle='rgb(216,207,255)';
    for(const ox of [-14,-8,-2,4]){
      context.fillRect(x+ox,y-4,1,3);
      context.fillRect(x+ox-1,y-3,3,1);
    }
    context.fillStyle='rgb(235,232,255)';
    context.fillRect(x+11,y-1,2,2);
  }

  function drawMagmaBehemoth(x,y,boss){
    const rock=boss.hit>0?'rgb(255,230,205)':'rgb(83,54,48)';
    context.fillStyle='rgb(45,29,27)';
    context.fillRect(x-8,y-6,17,12);
    context.fillRect(x-10,y-2,3,7);
    context.fillRect(x+8,y-2,3,7);
    context.fillRect(x-6,y+6,5,3);
    context.fillRect(x+2,y+6,5,3);
    context.fillStyle=rock;
    context.fillRect(x-7,y-7,15,12);
    context.fillRect(x-9,y-1,3,6);
    context.fillRect(x+7,y-1,3,6);
    context.fillStyle='rgb(231,69,28)';
    context.fillRect(x-3,y-4,2,7);
    context.fillRect(x+2,y-2,2,7);
    context.fillRect(x-1,y+3,4,2);
    context.fillStyle='rgb(255,200,76)';
    context.fillRect(x-2,y-3,1,2);
    context.fillRect(x+3,y-1,1,2);
  }

  function drawStormRoc(x,y,boss){
    const wingUp=Math.floor(boss.flap??0)%4<2;
    const feather=boss.hit>0?'rgb(245,250,255)':'rgb(79,100,145)';
    context.fillStyle='rgb(42,50,74)';
    if(wingUp){
      context.fillRect(x-13,y-7,9,2);
      context.fillRect(x+5,y-7,9,2);
      context.fillRect(x-11,y-5,7,2);
      context.fillRect(x+5,y-5,7,2);
    }else{
      context.fillRect(x-13,y,9,2);
      context.fillRect(x+5,y,9,2);
      context.fillRect(x-10,y+2,6,2);
      context.fillRect(x+5,y+2,6,2);
    }
    context.fillStyle=feather;
    context.fillRect(x-5,y-4,11,8);
    context.fillRect(x-2,y-6,5,3);
    context.fillStyle='rgb(226,239,255)';
    context.fillRect(x-1,y-4,1,1);
    context.fillRect(x+2,y-4,1,1);
    context.fillStyle='rgb(224,177,68)';
    context.fillRect(x+5,y-2,3,2);
  }

  function drawMoonStalker(x,y,boss){
    const body=boss.hit>0?'rgb(235,229,255)':'rgb(58,48,101)';
    context.fillStyle='rgb(25,23,48)';
    context.fillRect(x-5,y-7,11,13);
    context.fillRect(x-7,y-2,3,7);
    context.fillRect(x+5,y-2,3,7);
    context.fillStyle=body;
    context.fillRect(x-3,y-8,7,5);
    context.fillRect(x-4,y-3,9,9);
    context.fillStyle='rgb(210,202,255)';
    context.fillRect(x-1,y-6,1,1);
    context.fillRect(x+2,y-6,1,1);
    context.fillStyle='rgb(115,91,190)';
    context.fillRect(x+4,y-10,1,4);
    context.fillRect(x+5,y-9,2,1);
  }

  function drawDrownedFleet(x,y,boss){
    const ratio=boss.hp/Math.max(1,boss.maxHp);
    const hull=boss.hit>0?'rgb(225,237,231)':'rgb(74,93,86)';
    context.fillStyle='rgb(37,52,54)';
    context.fillRect(x-14,y,29,6);
    context.fillRect(x-11,y+6,23,3);
    context.fillStyle=hull;
    context.fillRect(x-13,y-1,27,6);
    context.fillRect(x-10,y+5,21,2);
    context.fillStyle='rgb(42,35,31)';
    context.fillRect(x-9,y+1,3,2);
    context.fillRect(x+5,y+1,3,2);
    if(ratio>.33){
      context.fillStyle='rgb(96,78,64)';
      context.fillRect(x,y-10,2,10);
      context.fillStyle='rgb(113,135,124)';
      context.fillRect(x+2,y-9,8,6);
      context.fillRect(x-8,y-8,7,5);
      context.fillStyle='rgb(44,61,62)';
      context.fillRect(x+5,y-7,2,2);
    }
    if(ratio>.66){
      context.fillStyle='rgb(137,160,162)';
      context.fillRect(x-12,y-3,5,2);
      context.fillRect(x+8,y-3,5,2);
    }
  }

  function drawSkyJellyfish(x,y,boss){
    const dome=boss.hit>0?'rgb(245,245,255)':'rgb(142,134,226)';
    context.fillStyle='rgb(70,67,139)';
    context.fillRect(x-9,y-5,19,7);
    context.fillRect(x-7,y-8,15,4);
    context.fillStyle=dome;
    context.fillRect(x-8,y-6,17,7);
    context.fillRect(x-6,y-9,13,4);
    context.fillStyle='rgb(219,224,255)';
    context.fillRect(x-3,y-7,2,2);
    context.fillRect(x+3,y-6,2,2);
    context.fillStyle='rgb(94,85,183)';
    for(let tentacle=-6;tentacle<=6;tentacle+=3){
      const offset=Math.round(Math.sin((boss.flap??0)*.3+tentacle)*2);
      context.fillRect(x+tentacle,y+1,1,8+offset);
      context.fillRect(x+tentacle+1,y+7+offset,2,1);
    }
  }

  function drawWorldEater(x,y,boss){
    drawSegmentedWyrm(x+12,y,boss,['rgb(84,48,35)','rgb(128,69,43)','rgb(180,93,52)','rgb(48,28,24)'],11,1);
    context.fillStyle='rgb(225,194,147)';
    context.fillRect(x+12,y-4,1,3);
    context.fillRect(x+12,y+2,1,3);
    context.fillRect(x+9,y-5,1,3);
    context.fillRect(x+9,y+3,1,3);
    context.fillStyle='rgb(39,23,21)';
    context.fillRect(x+10,y-1,5,3);
    context.fillStyle='rgb(255,178,72)';
    context.fillRect(x+8,y-2,1,1);
  }

  function drawBosses(originX,originY){
    for(const boss of state.entities.bosses){
      const x=Math.round(boss.x-originX);
      const y=Math.round(boss.y-originY);
      if(x<-20||y<-14||x>WORLD_WIDTH+20||y>WORLD_HEIGHT+14)continue;
      switch(boss.kind){
        case 'sea_serpent':drawSeaSerpentSprite(x,y,boss,originY);break;
        case 'frost_colossus':drawFrostColossus(x,y,boss);break;
        case 'bog_leviathan':drawBogLeviathan(x,y,boss);break;
        case 'mycelial_monarch':drawMycelialMonarch(x,y,boss);break;
        case 'bamboo_war_machine':drawBambooWarMachine(x,y,boss);break;
        case 'canopy_wyrm':drawCanopyWyrm(x,y,boss);break;
        case 'crystal_burrower':drawCrystalBurrower(x,y,boss);break;
        case 'magma_behemoth':drawMagmaBehemoth(x,y,boss);break;
        case 'storm_roc':drawStormRoc(x,y,boss);break;
        case 'moon_stalker':drawMoonStalker(x,y,boss);break;
        case 'drowned_fleet':drawDrownedFleet(x,y,boss);break;
        case 'sky_jellyfish':drawSkyJellyfish(x,y,boss);break;
        case 'world_eater':drawWorldEater(x,y,boss);break;
        default:drawBossSprite(x,y,boss);break;
      }
    }
  }

  function drawBossHud(){
    const boss=state.entities.bosses[0];
    if(!boss)return;
    const width=112;
    const left=Math.floor((WORLD_WIDTH-width)*.5);
    const label=String(boss.name??boss.kind??'BOSS').replaceAll('_',' ');
    drawPanel(left,3,width,13,.84);
    const labelWidth=pixelTextWidth(label,1,1);
    drawPixelText(context,label,left+Math.max(3,Math.floor((width-labelWidth)*.5)),5,'rgb(248,242,232)',1,1,width-6);
    const top=11;
    const fill=Math.max(0,Math.min(width-6,Math.round((width-6)*(boss.hp/Math.max(1,boss.maxHp)))));
    context.fillStyle=boss.barBack??'rgb(74,32,40)';
    context.fillRect(left+3,top,width-6,3);
    context.fillStyle=boss.barFill??'rgb(255,96,56)';
    context.fillRect(left+3,top,fill,3);
    context.fillStyle=boss.barHighlight??'rgb(255,214,164)';
    if(fill>0)context.fillRect(left+3,top,Math.max(1,fill-1),1);
    for(let marker=12;marker<width-7;marker+=12){
      context.fillStyle='rgba(12,12,18,.7)';
      context.fillRect(left+3+marker,top,1,3);
    }
    if((boss.hit??0)>0&&state.frame%4<2){
      context.fillStyle='rgba(255,255,255,.88)';
      context.fillRect(left+3,top,width-6,1);
    }
  }


  function drawMoonPortal(originX,originY){
    const portal=state.world.dimensionPortal??state.world.moonPortal;
    if(!portal?.active)return;
    const centerX=Math.round(portal.x-originX);
    const centerY=Math.round(portal.y-originY);
    if(centerX<-12||centerY<-14||centerX>WORLD_WIDTH+12||centerY>WORLD_HEIGHT+14)return;
    const opening=Math.min(1,(portal.timer??0)/10);
    const closing=portal.phase==='closing'||portal.phase==='arrival'?Math.max(0,1-(portal.timer??0)/(portal.phase==='arrival'?28:18)):1;
    const scale=Math.max(.15,opening*closing);
    const radiusX=Math.max(1,Math.round(5*scale));
    const radiusY=Math.max(2,Math.round(9*scale));
    const colors=portal.colors?.length?portal.colors:['rgb(91,229,255)','rgb(130,128,255)','rgb(207,92,255)','rgb(255,103,205)','rgb(244,238,255)'];
    context.fillStyle='rgba(20,9,45,.88)';
    context.fillRect(centerX-radiusX+1,centerY-radiusY+2,Math.max(1,radiusX*2-1),Math.max(2,radiusY*2-3));
    const phase=(state.frame+(portal.timer??0)*2)*.22;
    for(let step=0;step<30;step++){
      const angle=phase+step/30*Math.PI*2;
      const wobble=1+Math.sin(phase*1.7+step*.9)*.12;
      const x=centerX+Math.round(Math.cos(angle)*radiusX*wobble);
      const y=centerY+Math.round(Math.sin(angle)*radiusY);
      context.fillStyle=colors[(step+Math.floor(state.frame/3))%colors.length];
      context.fillRect(x,y,step%5===0?2:1,step%4===0?2:1);
    }
    context.fillStyle=state.frame%6<3?'rgba(215,235,255,.8)':'rgba(255,168,242,.72)';
    for(let i=0;i<5;i++){
      const y=centerY-radiusY+2+((i*4+state.frame)%Math.max(3,radiusY*2-3));
      const x=centerX+Math.round(Math.sin(state.frame*.16+i*1.9)*Math.max(1,radiusX-2));
      context.fillRect(x,y,1,1);
    }
    if(portal.phase==='transit'){
      context.fillStyle='rgba(255,255,255,.46)';
      context.fillRect(centerX-radiusX-2,centerY-1,radiusX*2+5,2);
    }
  }

  function furnitureSprite(entity){
    const definition=furnitureById(entity.furnitureId);
    if(!definition)return null;
    return entity.open&&definition.openSprite?definition.openSprite:definition.sprite;
  }

  function drawFurnitureEntity(entity,originX,originY,{ghost=false,xOverride=null,yOverride=null}={}){
    const definition=furnitureById(entity.furnitureId);
    const sprite=furnitureSprite(entity);
    if(!definition||!sprite)return;
    const useEntity={...entity,x:xOverride??entity.x,y:yOverride??entity.y};
    const bounds=furnitureBounds(useEntity,definition);
    if(!bounds)return;
    const left=bounds.left-originX;
    const top=bounds.top-originY;
    for(let row=0;row<sprite.length;row++){
      const line=sprite[row];
      for(let column=0;column<line.length;column++){
        const pixel=line[column];
        if(pixel===' ')continue;
        let color=FURNITURE_PIXEL_COLORS[pixel]??'rgb(220,220,220)';
        if(pixel==='l'&&entity.on===false)color='rgb(83,76,64)';
        if(ghost)color='rgba(205,238,246,.48)';
        context.fillStyle=color;
        context.fillRect(left+column,top+row,1,1);
      }
    }
    if(entity.furnitureId==='chest'&&(entity.storedTotal??0)>0){
      context.fillStyle='rgb(255,224,111)';
      context.fillRect(left+2,top+1,1,1);
    }
    if(entity.furnitureId==='planter'&&entity.cropId){
      const growth=Math.max(1,Math.min(4,Math.floor((entity.growth??0)/900)+1));
      context.fillStyle=(entity.growth??0)>=3600?'rgb(255,191,75)':'rgb(87,198,93)';
      for(let rise=0;rise<growth;rise++)context.fillRect(left+2,top-rise,1,1);
      if(growth>=3){ context.fillRect(left+1,top-growth+2,1,1); context.fillRect(left+3,top-growth+1,1,1); }
    }
    if(entity.furnitureId==='sign'){
      const label=SIGN_LABELS[entity.labelIndex??0]??'HOME';
      drawPixelText(context,label,left-Math.max(0,Math.floor((pixelTextWidth(label)-definition.w)*.5)),top-6,'rgb(238,225,180)',1,1,38);
    }
    if(entity.furnitureId==='clock'){
      const time=timeSystem.getTime();
      const cx=left+2,cy=top+2;
      context.fillStyle='rgb(43,55,69)';
      context.fillRect(cx,cy,1,1);
      const hourAngle=((time.hours%12)+time.minutes/60)/12*Math.PI*2-Math.PI*.5;
      const minuteAngle=time.minutes/60*Math.PI*2-Math.PI*.5;
      context.fillStyle='rgb(75,55,39)';
      context.fillRect(cx+Math.round(Math.cos(hourAngle)),cy+Math.round(Math.sin(hourAngle)),1,1);
      context.fillStyle='rgb(199,77,66)';
      context.fillRect(cx+Math.round(Math.cos(minuteAngle)*2),cy+Math.round(Math.sin(minuteAngle)*2),1,1);
    }
  }

  function drawFurnitureLights(originX,originY){
    for(const entity of furnitureSystem?.visibleFurniture?.(originX,originY)??[]){
      const definition=furnitureById(entity.furnitureId);
      if(!definition?.lightRadius||entity.on===false)continue;
      const x=Math.round(entity.x-originX);
      const y=Math.round(entity.y-Math.floor(definition.h*.65)-originY);
      const radius=definition.lightRadius;
      for(let ring=radius;ring>=4;ring-=4){
        const alpha=.012+(radius-ring)/radius*.012;
        context.fillStyle=`rgba(255,226,126,${alpha})`;
        context.fillRect(x-ring,y-Math.floor(ring*.65),ring*2+1,Math.floor(ring*1.3)+1);
      }
    }
  }

  function drawFurniture(originX,originY){
    for(const entity of furnitureSystem?.visibleFurniture?.(originX,originY)??[])drawFurnitureEntity(entity,originX,originY);
  }

  function drawPlayer(originX,originY){
    if(state.player.invulnerability>0&&state.frame%4<2)return;
    const bounds=playerPixelBounds(
      state.player.x-originX,
      state.player.y-originY,
      state.player.width,
      state.player.height,
    );
    const recoil=state.juice?.recoilFrames>0?(state.juice.recoilX??0):0;
    const x=bounds.centerX+recoil;
    const y=bounds.baselineY;
    const swimming=Boolean(state.player.status?.swimming);
    const seated=!swimming&&state.player.furnitureMode==='sit';
    const squashed=!swimming&&!seated&&(state.juice?.playerSquash??0)>0;
    const stretched=!swimming&&!squashed&&(state.juice?.playerStretch??0)>0;
    let visualWidth=seated?3:squashed?5:bounds.width;
    let visualHeight=seated?3:squashed?3:stretched?6:bounds.height;
    let visualLeft=x-Math.floor(visualWidth*.5);
    let visualTop=y-visualHeight+1;
    let swimFacing=state.player.facing??1;

    if(swimming){
      if(state.player.vx<-.04)swimFacing=-1;
      else if(state.player.vx>.04)swimFacing=1;
      const sprite=rotatedSwimSprite(swimFacing);
      visualHeight=sprite.length;
      visualWidth=sprite[0].length;
      visualLeft=x-Math.floor(visualWidth*.5);
      const bodyCenterY=bounds.top+Math.floor(bounds.height*.5);
      visualTop=bodyCenterY-Math.floor(visualHeight*.5);
      const colors={
        [PlayerPixel.SKIN]:'rgb(235,210,125)',
        [PlayerPixel.BODY]:'rgb(70,150,220)',
        [PlayerPixel.EYE]:'rgb(28,49,73)',
      };
      for(let py=0;py<sprite.length;py++){
        for(let px=0;px<sprite[py].length;px++){
          const pixel=sprite[py][px];
          if(!pixel)continue;
          context.fillStyle=colors[pixel];
          context.fillRect(visualLeft+px,visualTop+py,1,1);
        }
      }
      // A single trailing kick pixel animates the separated legs without
      // distorting the rotated torso or moving the swimmer out of alignment.
      const kickHigh=Math.floor(state.frame/5)%2===0;
      context.fillStyle='rgb(55,125,202)';
      const kickX=swimFacing>0?visualLeft-1:visualLeft+visualWidth;
      const kickY=visualTop+(kickHigh?0:visualHeight-1);
      context.fillRect(kickX,kickY,1,1);
    }else{
      const headHeight=(squashed||seated)?1:2;
      context.fillStyle='rgb(235,210,125)';
      context.fillRect(visualLeft,visualTop,visualWidth,headHeight);
      context.fillStyle='rgb(70,150,220)';
      context.fillRect(visualLeft,visualTop+headHeight,visualWidth,visualHeight-headHeight);
      if(seated){
        context.fillStyle='rgb(55,125,202)';
        context.fillRect(visualLeft+(state.player.facing>0?2:0),visualTop+2,2,1);
      }
    }
    if((state.juice?.recoilFrames??0)>0){
      context.fillStyle='rgba(184,225,255,.45)';
      context.fillRect(visualLeft-recoil,visualTop+1,1,Math.max(1,visualHeight-2));
    }

    if(state.build.active&&state.build.equippedFurnitureId){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldX=x+facing*3;
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle='rgb(214,184,123)';
      context.fillRect(heldX-(facing<0?2:0),heldY,3,2);
      drawPixelBox(heldX-(facing<0?2:0),heldY,3,2,'rgba(245,248,255,.8)');
    }else if(state.build.active&&Number.isInteger(state.build.equippedMaterial)){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldColor=palette.color(state.build.equippedMaterial,10,x,y);
      const heldX=swimming?x+facing*3-(facing<0?1:0):x+facing*2-(facing<0?1:0);
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle=`rgb(${Math.round(heldColor[0])},${Math.round(heldColor[1])},${Math.round(heldColor[2])})`;
      context.fillRect(heldX,heldY,2,2);
      drawPixelBox(heldX,heldY,2,2,'rgba(245,248,255,.8)');
    }else if(state.seedMode.active&&Number.isInteger(state.seedMode.cropId)){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldColor=palette.cropColor(state.seedMode.cropId,'seed',8);
      const heldX=swimming?x+facing*3:x+facing*2;
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle=`rgb(${Math.round(heldColor[0])},${Math.round(heldColor[1])},${Math.round(heldColor[2])})`;
      context.fillRect(heldX,heldY,1,1);
      context.fillRect(heldX+facing,heldY+1,1,1);
    }
  }

  function drawDottedBeam(startX,startY,endX,endY,color){
    const dx=endX-startX;
    const dy=endY-startY;
    const distance=Math.hypot(dx,dy)||1;
    context.fillStyle=color;
    for(let step=1;step<distance;step+=2){
      const t=step/distance;
      context.fillRect(Math.round(startX+dx*t),Math.round(startY+dy*t),1,1);
    }
  }

  function drawRects(rects,color){
    context.fillStyle=color;
    for(const [x,y,width,height] of rects)context.fillRect(x,y,width,height);
  }

  function drawTargetCorners(x,y,color,size=5){
    drawRects(targetCornerRects(x,y,size),color);
  }

  function drawInvalidCross(x,y,color){
    drawRects(invalidCrossRects(x,y),color);
  }

  function drawPointerCursor(){
    if(!state.input.pointerInside)return;
    const color=state.build.active
      ?'rgba(180,248,255,.98)'
      :state.seedMode.active
        ?'rgba(210,242,150,.98)'
        :state.weaponId===WeaponId.DESTRUCULATOR
          ?'rgba(248,238,255,.98)'
          :state.weaponId===WeaponId.DRONE_STRIKE
            ?'rgba(255,246,220,.98)'
            :state.weaponId===WeaponId.LASER_RIFLE
              ?(state.laser.overheated?'rgba(255,104,92,.98)':'rgba(255,229,170,.98)')
              :state.weaponId===WeaponId.REALITY_ZIPPER
                ?(state.frame%6<3?'rgba(255,77,225,.98)':'rgba(67,244,255,.98)')
                :'rgba(238,244,255,.98)';
    drawRects(pointerCrosshairRects(state.input.pointerX,state.input.pointerY),color);
  }

  function drawDestruculator(originX,originY){
    if(!state.input.pointerInside)return;

    const preview=weapons.getDestruculatorPreview();
    const startX=state.player.x-originX;
    const startY=state.player.y-2-originY;
    const targetX=preview.beamX-originX;
    const targetY=preview.beamY-originY;
    const validColor='rgb(224,105,255)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    drawPixelCircle(startX,startY,preview.range,'rgba(224,105,255,.28)',1);

    drawDottedBeam(startX,startY,targetX,targetY,color);

    const cellX=preview.x-originX;
    const cellY=preview.y-originY;
    if(preview.valid){
      drawTargetCorners(cellX,cellY,color,7);
      context.fillStyle=color;
      if(state.frame%12<6)context.fillRect(Math.round(cellX),Math.round(cellY),1,1);
    }else{
      drawInvalidCross(cellX,cellY,color);
    }

    if(state.toolEffect.frames>0&&state.toolEffect.kind==='destroy'){
      const effectX=state.toolEffect.x-originX;
      const effectY=state.toolEffect.y-originY;
      drawTargetCorners(effectX,effectY,state.toolEffect.valid?'rgb(244,190,255)':invalidColor,9);
    }
  }

  function drawBuildPreview(originX,originY){
    if(!state.input.pointerInside||!state.build.active)return;

    const preview=weapons.getBuildPreview();
    const startX=state.player.x-originX;
    const startY=state.player.y-2-originY;
    const targetX=preview.beamX-originX;
    const targetY=preview.beamY-originY;
    if(preview.isFurniture&&preview.furnitureId){
      drawPixelCircle(startX,startY,preview.range,'rgba(89,225,245,.28)',1);
      drawDottedBeam(startX,startY,targetX,targetY,preview.valid?'rgb(117,232,191)':'rgb(255,104,112)');
      drawFurnitureEntity({furnitureId:preview.furnitureId,x:preview.x,y:preview.y,on:true,open:false},originX,originY,{ghost:true});
      const bounds=preview.bounds;
      if(bounds)drawPixelBox(bounds.left-originX,bounds.top-originY,bounds.w,bounds.h,preview.valid?'rgb(117,232,191)':'rgb(255,104,112)');
      if(!preview.valid)drawInvalidCross(targetX,targetY,'rgb(255,104,112)');
      return;
    }
    const validColor='rgb(89,225,245)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    drawPixelCircle(startX,startY,preview.range,'rgba(89,225,245,.28)',1);
    drawDottedBeam(startX,startY,targetX,targetY,color);

    const cellX=preview.x-originX;
    const cellY=preview.y-originY;
    if(preview.valid){
      const ghost=palette.color(preview.type,8,cellX,cellY);
      context.fillStyle=`rgba(${Math.round(ghost[0])},${Math.round(ghost[1])},${Math.round(ghost[2])},.76)`;
      context.fillRect(Math.round(cellX),Math.round(cellY),1,1);
      drawTargetCorners(cellX,cellY,color,7);
    }else{
      drawInvalidCross(cellX,cellY,color);
    }

    if(state.toolEffect.frames>0&&state.toolEffect.kind==='build'){
      const effectX=state.toolEffect.x-originX;
      const effectY=state.toolEffect.y-originY;
      drawTargetCorners(effectX,effectY,state.toolEffect.valid?'rgb(180,248,255)':invalidColor,9);
    }
  }

  function drawDroneStrikePreview(originX,originY){
    if(!state.input.pointerInside)return;
    const preview=weapons.getDroneStrikePreview();
    const targetX=preview.x-originX;
    const targetY=preview.y-originY;
    const pointerX=(preview.pointerX??preview.x)-originX;
    const pointerY=(preview.pointerY??preview.y)-originY;
    const validColor='rgb(255,178,58)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    if(preview.snapped){
      drawDottedBeam(pointerX,pointerY,targetX,targetY,'rgba(255,214,128,.72)');
    }

    if(preview.valid){
      const entryX=preview.entryX-originX;
      const entryY=preview.entryY-originY;
      drawDottedBeam(entryX,entryY,targetX,entryY,'rgba(132,225,242,.9)');
      drawDottedBeam(targetX,entryY,targetX,targetY,color);

      context.fillStyle='rgb(132,225,242)';
      context.fillRect(Math.round(entryX)-2,Math.round(entryY)-1,5,3);
      context.fillRect(Math.round(entryX)+(preview.flightDirection>0?3:-3),Math.round(entryY),2,1);

      drawPixelCircle(targetX,targetY,15,'rgba(255,178,58,.75)',1);
      drawTargetCorners(targetX,targetY,color,11);
      context.fillStyle=color;
      context.fillRect(Math.round(targetX),Math.round(targetY),1,1);
    }else{
      drawInvalidCross(pointerX,pointerY,color);
      drawPixelCircle(pointerX,pointerY,7,'rgba(255,104,112,.45)',1);
    }
  }

  function drawLaserHeatedPixels(originX,originY){
    for(const pixel of state.laser?.hotPixels??[]){
      const x=Math.round(pixel.x-originX);
      const y=Math.round(pixel.y-originY);
      if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)continue;
      const ratio=Math.max(0,Math.min(1,pixel.heat/112));
      context.fillStyle=ratio>.72?'rgba(255,246,210,.9)':ratio>.34?'rgba(255,142,46,.72)':'rgba(215,57,31,.48)';
      context.fillRect(x,y,1,1);
    }
  }

  function drawLaserRifle(originX,originY){
    const beam=state.laser?.beam;
    if(!state.laser?.active||!beam)return;
    const startX=Math.round(beam.startX-originX);
    const startY=Math.round(beam.startY-originY);
    const endX=Math.round(beam.endX-originX);
    const endY=Math.round(beam.endY-originY);
    drawPixelLine(startX,startY,endX,endY,'rgb(141,26,34)',3);
    drawPixelLine(startX,startY,endX,endY,'rgb(255,82,46)',2);
    drawPixelLine(startX,startY,endX,endY,state.frame%4<2?'rgb(255,250,214)':'rgb(255,208,105)',1);

    const heat=Math.max(0,Math.min(1,(state.laser.contactHeat??0)/112));
    context.fillStyle=heat>.7?'rgb(255,250,224)':heat>.35?'rgb(255,178,62)':'rgb(255,92,42)';
    context.fillRect(endX-1,endY-1,3,3);
    context.fillStyle='rgb(255,248,220)';
    context.fillRect(endX,endY,1,1);
    if(state.frame%3===0){
      context.fillStyle='rgb(255,113,36)';
      context.fillRect(endX-2,endY,1,1);
      context.fillRect(endX+2,endY-1,1,1);
    }
  }


  function drawRealityRifts(originX,originY){
    for(const rift of state.entities.realityRifts??[]){
      const startX=Math.round(rift.startX-originX);
      const startY=Math.round(rift.startY-originY);
      const endX=Math.round(rift.endX-originX);
      const endY=Math.round(rift.endY-originY);
      if(Math.max(startX,endX)<-16||Math.min(startX,endX)>WORLD_WIDTH+16||Math.max(startY,endY)<-16||Math.min(startY,endY)>WORLD_HEIGHT+16)continue;

      const opening=Math.min(1,(rift.age??0)/Math.max(1,REALITY_ZIPPER_CONFIG.openingFrames));
      const closing=rift.phase==='closing'?Math.max(0,(rift.life??0)/Math.max(1,REALITY_ZIPPER_CONFIG.closingFrames)):1;
      const strength=Math.max(.08,opening*closing);
      const wave=Math.sin((rift.pulse??0)+state.frame*.16);
      const spread=Math.max(1,Math.round((REALITY_ZIPPER_CONFIG.splitDistance+1)*strength));
      const normalX=rift.normalX??0;
      const normalY=rift.normalY??1;

      for(let band=-spread;band<=spread;band++){
        if(band===0)continue;
        const wobble=Math.round(Math.sin(state.frame*.21+band*1.7+(rift.age??0)*.09));
        const offset=band+wobble*(Math.abs(band)===spread?1:0);
        const colorIndex=(band+Math.floor(state.frame/3)+(rift.age??0)+REALITY_COLORS.length*4)%REALITY_COLORS.length;
        drawPixelLine(
          startX+normalX*offset,
          startY+normalY*offset,
          endX+normalX*offset,
          endY+normalY*offset,
          REALITY_COLORS[colorIndex],
          Math.abs(band)===1&&state.frame%4<2?2:1,
        );
      }

      drawPixelLine(startX,startY,endX,endY,'rgb(8,3,20)',3);
      drawPixelLine(startX,startY,endX,endY,state.frame%4<2?'rgb(255,255,255)':'rgb(36,10,68)',1);

      const points=rift.points??[];
      const step=Math.max(3,Math.floor(points.length/18));
      for(let index=0;index<points.length;index+=step){
        const point=points[index];
        const localX=Math.round(point.x-originX);
        const localY=Math.round(point.y-originY);
        const oscillation=Math.round(Math.sin(index*.8+state.frame*.28+wave)*2);
        const side=index%2===0?1:-1;
        const ghostX=localX+normalX*(spread+2+oscillation)*side;
        const ghostY=localY+normalY*(spread+2+oscillation)*side;
        context.fillStyle=REALITY_COLORS[(index+Math.floor(state.frame/2))%REALITY_COLORS.length];
        context.fillRect(ghostX-1,ghostY-1,index%3===0?3:2,index%4===0?2:1);
        if(index%4===0){
          context.fillStyle='rgb(255,255,255)';
          context.fillRect(ghostX,ghostY,1,1);
        }
      }

      for(const [x,y] of [[startX,startY],[endX,endY]]){
        const size=3+Math.round(Math.abs(wave)*2);
        for(let ring=0;ring<3;ring++){
          context.fillStyle=REALITY_COLORS[(ring+Math.floor(state.frame/4))%REALITY_COLORS.length];
          context.fillRect(x-size+ring,y-ring,Math.max(1,(size-ring)*2+1),1);
          context.fillRect(x-ring,y-size+ring,1,Math.max(1,(size-ring)*2+1));
        }
        context.fillStyle='rgb(5,1,14)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(255,255,255)';
        context.fillRect(x,y,1,1);
      }
    }
  }

  function drawWeaponEffects(originX,originY){
    drawRealityRifts(originX,originY);
    drawLaserHeatedPixels(originX,originY);
    if(state.swordTimer>0){
      const angle=state.swordAngle-.9+(1-state.swordTimer/12)*1.8;
      drawPixelLine(
        state.player.x-originX,
        state.player.y-3-originY,
        state.player.x+Math.cos(angle)*8-originX,
        state.player.y-3+Math.sin(angle)*8-originY,
        'rgb(235,240,250)',
        2,
      );
    }

    if(state.build.active)drawBuildPreview(originX,originY);
    else if(state.weaponId===WeaponId.DESTRUCULATOR)drawDestruculator(originX,originY);
    else if(state.weaponId===WeaponId.DRONE_STRIKE)drawDroneStrikePreview(originX,originY);
    else if(state.weaponId===WeaponId.LASER_RIFLE)drawLaserRifle(originX,originY);
  }

  function drawMagnifier(){
    if(!state.input.pointerInside||state.magnifier.zoom<=MAGNIFIER_CONFIG.minZoom)return;

    const radius=Math.max(2,Math.round(state.magnifier.radius));
    const centerX=Math.round(state.input.pointerX);
    const centerY=Math.round(state.input.pointerY);
    const frame=context.getImageData(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const source=new Uint8ClampedArray(frame.data);
    const outerSquared=radius*radius;
    const whiteRingSquared=(radius-1)*(radius-1);
    const imageSquared=(radius-2)*(radius-2);

    function writePixel(x,y,r,g,b,a=255){
      if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return;
      const offset=(x+y*WORLD_WIDTH)*4;
      frame.data[offset]=r;
      frame.data[offset+1]=g;
      frame.data[offset+2]=b;
      frame.data[offset+3]=a;
    }

    for(let dy=-radius;dy<=radius;dy++){
      for(let dx=-radius;dx<=radius;dx++){
        const distanceSquared=dx*dx+dy*dy;
        if(distanceSquared>outerSquared)continue;
        const destinationX=centerX+dx;
        const destinationY=centerY+dy;

        if(distanceSquared>whiteRingSquared){
          writePixel(destinationX,destinationY,15,18,26);
          continue;
        }
        if(distanceSquared>imageSquared){
          writePixel(destinationX,destinationY,245,248,255);
          continue;
        }

        const sourceX=Math.max(0,Math.min(WORLD_WIDTH-1,Math.round(state.input.pointerX+dx/state.magnifier.zoom)));
        const sourceY=Math.max(0,Math.min(WORLD_HEIGHT-1,Math.round(state.input.pointerY+dy/state.magnifier.zoom)));
        const sourceOffset=(sourceX+sourceY*WORLD_WIDTH)*4;
        writePixel(
          destinationX,
          destinationY,
          source[sourceOffset],
          source[sourceOffset+1],
          source[sourceOffset+2],
          source[sourceOffset+3],
        );
      }
    }

    context.putImageData(frame,0,0);
  }

  function drawPanel(x,y,width,height,alpha=.78){
    context.fillStyle=`rgba(9,12,18,${alpha})`;
    context.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));
    context.fillStyle='rgba(225,235,248,.34)';
    context.fillRect(Math.round(x),Math.round(y),Math.round(width),1);
    context.fillRect(Math.round(x),Math.round(y),1,Math.round(height));
    context.fillStyle='rgba(0,0,0,.5)';
    context.fillRect(Math.round(x),Math.round(y+height-1),Math.round(width),1);
    context.fillRect(Math.round(x+width-1),Math.round(y),1,Math.round(height));
  }

  function drawSegmentedBar(x,y,width,height,value,maxValue,colors,critical=false){
    const safeWidth=Math.max(1,Math.round(width));
    const safeHeight=Math.max(1,Math.round(height));
    const ratio=Math.max(0,Math.min(1,value/Math.max(1,maxValue)));
    const fill=Math.round((safeWidth-2)*ratio);
    context.fillStyle='rgb(12,15,20)';
    context.fillRect(x,y,safeWidth,safeHeight);
    context.fillStyle='rgb(48,52,62)';
    context.fillRect(x+1,y+1,safeWidth-2,safeHeight-2);
    if(fill>0){
      context.fillStyle=critical&&state.frame%12<6?colors[2]:colors[0];
      context.fillRect(x+1,y+1,fill,safeHeight-2);
      if(safeHeight>=4){
        context.fillStyle=colors[1];
        context.fillRect(x+1,y+1,Math.max(1,fill-1),1);
      }
    }
    for(let marker=5;marker<safeWidth-2;marker+=5){
      context.fillStyle='rgba(8,10,14,.55)';
      context.fillRect(x+1+marker,y+1,1,safeHeight-2);
    }
  }

  function drawHeartIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+1,y,2,1); context.fillRect(x+4,y,2,1);
    context.fillRect(x,y+1,7,2); context.fillRect(x+1,y+3,5,1);
    context.fillRect(x+2,y+4,3,1); context.fillRect(x+3,y+5,1,1);
  }

  function drawFoodIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+1,y+1,5,4);
    context.fillRect(x+2,y,3,1);
    context.fillRect(x+2,y+5,3,1);
    context.fillStyle='rgb(93,58,34)';
    context.fillRect(x+5,y,1,2);
    context.fillStyle='rgb(76,156,72)';
    context.fillRect(x+4,y,1,1);
  }

  function drawBreathIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+2,y,3,1);
    context.fillRect(x+1,y+1,5,1);
    context.fillRect(x,y+2,7,2);
    context.fillRect(x+1,y+4,5,1);
    context.fillRect(x+2,y+5,3,1);
    context.fillStyle='rgb(232,250,255)';
    context.fillRect(x+2,y+1,1,1);
    context.fillRect(x+4,y+2,1,1);
  }

  function drawCrystalIcon(x,y){
    context.fillStyle='rgb(128,104,231)';
    context.fillRect(x+2,y,2,1); context.fillRect(x+1,y+1,4,1);
    context.fillRect(x,y+2,6,2); context.fillRect(x+1,y+4,4,1);
    context.fillRect(x+2,y+5,2,1);
    context.fillStyle='rgb(226,219,255)';
    context.fillRect(x+2,y+1,1,2);
  }

  function drawPackIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+1,y+2,7,5);
    context.fillRect(x+2,y+1,5,1);
    context.fillRect(x+3,y,3,1);
    context.fillStyle='rgb(76,91,112)';
    context.fillRect(x+3,y+4,3,2);
  }

  function drawWeatherIcon(x,y,type,isDay){
    const pale='rgb(226,235,245)';
    const blue='rgb(112,184,229)';
    const yellow='rgb(255,219,96)';
    if(type===WeatherType.CLEAR||type===WeatherType.BREEZE){
      context.fillStyle=isDay?yellow:pale;
      context.fillRect(x+2,y+1,3,3);
      context.fillRect(x+3,y,1,5);
      context.fillRect(x+1,y+2,5,1);
      if(type===WeatherType.BREEZE){
        context.fillStyle=pale;
        context.fillRect(x+7,y+1,5,1); context.fillRect(x+9,y+3,4,1);
      }
      return;
    }
    context.fillStyle='rgb(135,150,166)';
    context.fillRect(x+1,y+1,7,3); context.fillRect(x+3,y,3,1);
    if([WeatherType.RAIN,WeatherType.THUNDERSTORM,WeatherType.OCEAN_STORM].includes(type)){
      context.fillStyle=blue;
      context.fillRect(x+2,y+5,1,2); context.fillRect(x+5,y+4,1,2); context.fillRect(x+8,y+5,1,2);
      if(type!==WeatherType.RAIN){
        context.fillStyle=yellow;
        context.fillRect(x+6,y+3,2,1); context.fillRect(x+5,y+4,2,1); context.fillRect(x+6,y+5,1,2);
      }
    }else if(type===WeatherType.SNOW||type===WeatherType.BLIZZARD){
      context.fillStyle=pale;
      context.fillRect(x+2,y+5,1,1); context.fillRect(x+5,y+4,1,1); context.fillRect(x+8,y+6,1,1);
    }else if(type===WeatherType.HEATWAVE){
      context.fillStyle='rgb(255,142,58)';
      context.fillRect(x+2,y+4,1,3); context.fillRect(x+5,y+4,1,3); context.fillRect(x+8,y+4,1,3);
    }else{
      context.fillStyle=pale;
      context.fillRect(x+1,y+5,8,1); context.fillRect(x+3,y+6,6,1);
    }
  }

  function drawWeaponIcon(x,y,weaponId){
    context.fillStyle='rgb(220,230,240)';
    switch(weaponId){
      case WeaponId.GUN:
        context.fillRect(x,y+2,8,2); context.fillRect(x+2,y+4,2,2); break;
      case WeaponId.NAPALM_SPRAYER:
        context.fillRect(x,y+2,7,2); context.fillRect(x+1,y+4,3,2);
        context.fillStyle='rgb(255,145,42)'; context.fillRect(x+7,y+1,2,3); break;
      case WeaponId.GLAIVE:
        context.fillRect(x+3,y,2,8); context.fillRect(x,y+3,8,2);
        context.fillStyle='rgb(112,205,232)'; context.fillRect(x+1,y+1,1,1); context.fillRect(x+6,y+6,1,1); break;
      case WeaponId.HOOK:
        drawPixelLine(x,y+6,x+6,y,'rgb(190,198,210)'); context.fillRect(x+5,y,3,2); break;
      case WeaponId.SWORD:
        drawPixelLine(x+1,y+6,x+7,y,'rgb(235,240,250)',2); context.fillRect(x,y+6,4,1); break;
      case WeaponId.GRENADE:
        context.fillRect(x+2,y+2,5,5); context.fillStyle='rgb(255,176,55)'; context.fillRect(x+6,y,1,2); break;
      case WeaponId.DESTRUCULATOR:
        context.fillRect(x,y+3,8,2); context.fillStyle='rgb(224,105,255)'; context.fillRect(x+7,y+2,2,4); break;
      case WeaponId.DRONE_STRIKE:
        context.fillRect(x,y+2,9,3); context.fillRect(x+2,y,2,2); context.fillRect(x+5,y,2,2); break;
      case WeaponId.LASER_RIFLE:
        context.fillRect(x,y+2,8,2); context.fillRect(x+1,y+4,3,2);
        context.fillStyle=state.laser.overheated?'rgb(255,74,58)':'rgb(255,220,124)'; context.fillRect(x+7,y+1,2,4); break;
      case WeaponId.NYAN_CAT_LAUNCHER:
        context.fillStyle='rgb(126,127,145)'; context.fillRect(x+4,y+1,4,4);
        context.fillStyle='rgb(237,181,114)'; context.fillRect(x+1,y+2,4,3);
        context.fillStyle='rgb(255,64,72)'; context.fillRect(x,y+6,2,1);
        context.fillStyle='rgb(62,151,238)'; context.fillRect(x+2,y+6,2,1); break;
      case WeaponId.REALITY_ZIPPER:
        context.fillStyle='rgb(255,45,196)'; context.fillRect(x+1,y,2,2); context.fillRect(x+6,y+5,2,2);
        context.fillStyle='rgb(82,250,244)'; context.fillRect(x+3,y+2,2,4);
        context.fillStyle='rgb(255,238,72)'; context.fillRect(x+5,y+1,1,2); context.fillRect(x+1,y+5,2,1);
        context.fillStyle='rgb(8,3,20)'; context.fillRect(x+4,y+3,1,1); break;
      default:context.fillRect(x+2,y+2,4,4);
    }
  }

  function drawSaveIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+1,y,8,8);
    context.fillStyle='rgb(74,88,108)';
    context.fillRect(x+3,y+1,4,2);
    context.fillStyle='rgb(166,205,224)';
    context.fillRect(x+2,y+5,6,2);
    context.fillStyle='rgb(230,239,246)';
    context.fillRect(x+4,y+5,2,2);
  }

  function drawWorldIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+2,y,5,1);
    context.fillRect(x+1,y+1,7,1);
    context.fillRect(x,y+2,9,5);
    context.fillRect(x+1,y+7,7,1);
    context.fillRect(x+2,y+8,5,1);
    context.fillStyle='rgb(70,126,166)';
    context.fillRect(x+2,y+2,2,2);
    context.fillRect(x+5,y+4,3,2);
    context.fillRect(x+2,y+6,2,1);
  }

  function drawStatusIcons(){
    const statuses=[];
    const bunnyChain=state.player.bunnyHop?.chain??0;
    if(bunnyChain>=2){
      const hot=bunnyChain>=8;
      statuses.push([`BHOP X${bunnyChain}`,hot?'rgb(255,126,232)':'rgb(119,226,255)']);
    }
    if(state.player.status.lava)statuses.push(['LAVA','rgb(255,96,34)']);
    else if(state.player.status.fire)statuses.push(['FIRE','rgb(255,150,44)']);
    if(state.player.status.steam)statuses.push(['STEAM','rgb(194,226,238)']);
    if(state.player.status.noOxygen)statuses.push(['NO AIR','rgb(129,216,246)']);
    else if(state.player.status.headSubmerged)statuses.push(['DIVE','rgb(129,216,246)']);
    if((state.player.attachedParasites?.length??0)>0)statuses.push([`PARASITE X${state.player.attachedParasites.length}`,'rgb(255,91,194)']);
    if(Number.isInteger(state.player.stolenWeaponId))statuses.push(['WEAPON STOLEN','rgb(255,184,72)']);
    if((state.entities.invasionPortals?.length??0)>0)statuses.push(['RIFT RAID','rgb(191,112,255)']);
    if(state.player.status.starving)statuses.push(['STARVE','rgb(255,205,78)']);
    if(state.ui.hud?.lowHunger&&!state.player.status.starving)statuses.push(['HUNGRY','rgb(255,205,78)']);
    let x=3;
    const y=WORLD_HEIGHT-36;
    for(const [label,color] of statuses.slice(0,4)){
      const width=Math.min(42,pixelTextWidth(label)+4);
      drawPanel(x,y,width,7,.76);
      drawPixelText(context,label,x+2,y+1,color,1,1,width-4);
      x+=width+2;
    }
  }

  function drawDamageFeedback(){
    if(state.ui.damageFlash<=0)return;
    const bright=state.ui.damageFlash%4<2?'rgba(255,54,54,.8)':'rgba(148,24,32,.6)';
    context.fillStyle=bright;
    context.fillRect(0,0,WORLD_WIDTH,2); context.fillRect(0,WORLD_HEIGHT-2,WORLD_WIDTH,2);
    context.fillRect(0,0,2,WORLD_HEIGHT); context.fillRect(WORLD_WIDTH-2,0,2,WORLD_HEIGHT);
    const direction=state.ui.damageDirection;
    if(direction!==0){
      const x=direction<0?5:WORLD_WIDTH-6;
      const y=Math.floor(WORLD_HEIGHT*.5);
      context.fillRect(x,y-2,2,5);
      context.fillRect(x+(direction<0?-2:2),y-1,2,3);
    }
  }

  function drawBossRitual(){
    const ritual=state.ui.bossRitual;
    if(!ritual||state.entities.bosses.length>0||state.ui.message||state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    const width=180;
    const x=3;
    const y=state.ui.hud?.breathUsing?36:27;
    drawPanel(x,y,width,18,.82);
    drawPixelText(context,ritual.title??'BOSS RITUAL',x+4,y+2,'rgb(244,219,142)',1,1,width-8);
    drawPixelText(context,ritual.hint??'',x+4,y+8,'rgb(199,214,228)',1,1,width-8);
    const ratio=Math.max(0,Math.min(1,(ritual.progress??0)/Math.max(1,ritual.maxProgress??1)));
    context.fillStyle='rgb(40,47,58)';
    context.fillRect(x+4,y+14,width-8,2);
    context.fillStyle=ratio>=1?'rgb(255,223,118)':'rgb(122,190,218)';
    context.fillRect(x+4,y+14,Math.round((width-8)*ratio),2);
  }

  function drawSaveStatus(){
    const text=state.ui.saveStatus;
    if(!text)return;
    const width=Math.min(94,pixelTextWidth(text)+6);
    const x=WORLD_WIDTH-width-3;
    const y=29;
    drawPanel(x,y,width,8,.88);
    drawPixelText(context,text,x+3,y+2,'rgb(178,235,193)',1,1,width-6);
  }

  function drawPickupFeed(){
    let y=41;
    for(const item of state.ui.pickupFeed){
      const width=Math.min(92,pixelTextWidth(item.text)+4);
      const x=WORLD_WIDTH-width-3;
      drawPanel(x,y,width,7,.65);
      drawPixelText(context,item.text,x+2,y+1,'rgb(218,235,207)',1,1,width-4);
      y+=8;
    }
  }

  function drawMessage(){
    if(!state.ui.message)return;
    const text=state.ui.message.replaceAll('·','-');
    const width=Math.min(150,Math.max(42,pixelTextWidth(text)+6));
    const x=Math.floor((WORLD_WIDTH-width)*.5);
    const y=29;
    drawPanel(x,y,width,9,.88);
    drawPixelText(context,text,x+3,y+2,'rgb(244,246,250)',1,1,width-6);
  }

  function drawToolPrompt(){
    if(state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    const text=state.ui.toolStatus||'Q WEAPON  I PACK  K CRAFT  F USE  O WORLDS';
    const width=Math.min(240,pixelTextWidth(text)+6);
    const x=Math.floor((WORLD_WIDTH-width)*.5);
    const y=WORLD_HEIGHT-27;
    drawPanel(x,y,width,7,.7);
    drawPixelText(context,text,x+3,y+1,'rgb(210,224,240)',1,1,width-6);
  }

  function drawOffscreenBossIndicator(originX,originY){
    const boss=state.entities.bosses[0];
    if(!boss)return;
    const localX=boss.x-originX;
    const localY=boss.y-originY;
    if(localX>=0&&localX<WORLD_WIDTH&&localY>=0&&localY<WORLD_HEIGHT)return;
    const x=Math.max(5,Math.min(WORLD_WIDTH-6,Math.round(localX)));
    const y=Math.max(30,Math.min(WORLD_HEIGHT-30,Math.round(localY)));
    context.fillStyle=boss.barHighlight??'rgb(255,214,164)';
    if(localX<0){ context.fillRect(x,y,4,3); context.fillRect(x-2,y+1,2,1); }
    else if(localX>=WORLD_WIDTH){ context.fillRect(x-3,y,4,3); context.fillRect(x+1,y+1,2,1); }
    else if(localY<0){ context.fillRect(x,y,3,4); context.fillRect(x+1,y-2,1,2); }
    else { context.fillRect(x,y-3,3,4); context.fillRect(x+1,y+1,1,2); }
  }

  function drawTopButtons(){
    const buttonW=18;
    const buttonH=10;
    const firstX=WORLD_WIDTH-41;
    const secondX=WORLD_WIDTH-21;
    const topY=3;
    const bottomY=15;
    const buttons=[
      {kind:'save-current',x:firstX,y:topY,w:buttonW,h:buttonH},
      {kind:'world-toggle',x:secondX,y:topY,w:buttonW,h:buttonH},
      {kind:'inventory-toggle',x:firstX,y:bottomY,w:buttonW,h:buttonH},
      {kind:'pause-toggle',x:secondX,y:bottomY,w:buttonW,h:buttonH},
      {kind:'crafting-toggle',x:secondX,y:27,w:buttonW,h:buttonH},
    ];
    state.ui.inventoryRects.push(...buttons);
    for(const button of buttons)drawPanel(button.x,button.y,button.w,button.h,.84);
    drawSaveIcon(firstX+4,topY+1,state.save.dirty?'rgb(255,221,126)':'rgb(194,231,205)');
    drawWorldIcon(secondX+4,topY+1);
    drawPackIcon(firstX+4,bottomY+1);
    context.fillStyle='rgb(226,190,104)';
    context.fillRect(secondX+5,29,7,2);
    context.fillRect(secondX+8,31,2,4);
    context.fillRect(secondX+6,34,6,1);
    const count=state.ui.hud?.inventoryCount??0;
    drawPixelText(context,String(Math.min(99,count)),firstX+13-(count>9?3:0),bottomY+3,'rgb(244,228,157)',1,0,4);
    context.fillStyle='rgb(220,230,240)';
    if(state.paused){
      context.fillRect(secondX+5,bottomY+2,2,6);
      context.fillRect(secondX+8,bottomY+3,2,4);
      context.fillRect(secondX+11,bottomY+4,1,2);
    }else{
      context.fillRect(secondX+5,bottomY+2,2,6);
      context.fillRect(secondX+10,bottomY+2,2,6);
    }
  }

  function drawInventoryOverlay(){
    if(!state.ui.inventoryOpen)return;
    context.fillStyle='rgba(4,7,12,.58)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=45,y=22,w=WORLD_WIDTH-90,h=WORLD_HEIGHT-44;
    drawPanel(x,y,w,h,.96);
    drawPixelText(context,'PACK',x+7,y+5,'rgb(238,242,250)',1,1);
    drawPixelText(context,'UP/DOWN ENTER USE  K CRAFT  I CLOSE',x+40,y+5,'rgb(151,174,201)',1,1,w-58);
    const close={kind:'inventory-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);

    const items=state.ui.hud?.inventory??[];
    if(items.length===0){
      drawPixelText(context,'EMPTY - COLLECT BLOCKS, FOOD, SEEDS OR LOOT',x+10,y+28,'rgb(167,178,194)',1,1,w-20);
      return;
    }

    const visibleRows=Math.max(8,Math.floor((h-30)/8));
    const selected=Math.max(0,Math.min(items.length-1,state.ui.inventoryIndex));
    const start=Math.max(0,Math.min(items.length-visibleRows,selected-Math.floor(visibleRows/2)));
    for(let row=0;row<visibleRows;row++){
      const index=start+row;
      if(index>=items.length)break;
      const item=items[index];
      const rowY=y+16+row*8;
      const rect={kind:'inventory-item',index,x:x+7,y:rowY,w:w-14,h:7};
      state.ui.inventoryRects.push(rect);
      if(index===selected){
        context.fillStyle='rgba(78,139,169,.7)';
        context.fillRect(rect.x,rect.y,rect.w,rect.h);
        context.fillStyle='rgb(174,235,247)';
        context.fillRect(rect.x,rect.y,2,rect.h);
      }else if(item.selected){
        context.fillStyle='rgba(68,111,88,.55)';
        context.fillRect(rect.x,rect.y,rect.w,rect.h);
      }
      const name=String(item.name??item.kind).replaceAll('_',' ');
      drawPixelText(context,name,rect.x+4,rect.y+1,index===selected?'rgb(246,250,255)':'rgb(196,207,221)',1,1,w-92);
      const countText=`X${item.count}`;
      drawPixelText(context,countText,rect.x+w-76,rect.y+1,'rgb(245,218,139)',1,1,26);
      drawPixelText(context,item.action??'',rect.x+w-47,rect.y+1,'rgb(145,171,194)',1,1,40);
    }

    const item=items[selected];
    const footer=item?`${item.kind.toUpperCase()}  ${item.action??''}`:'EMPTY';
    drawPixelText(context,footer,x+9,y+h-9,'rgb(151,174,201)',1,1,w-18);
  }

  function drawCraftingOverlay(){
    if(!state.ui.craftingOpen)return;
    context.fillStyle='rgba(4,7,12,.64)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=35,y=14,w=WORLD_WIDTH-70,h=WORLD_HEIGHT-28;
    drawPanel(x,y,w,h,.97);
    drawPixelText(context,'BASE FURNITURE',x+7,y+5,'rgb(244,239,221)',1,1);
    drawPixelText(context,'UP/DOWN ENTER CRAFT  K CLOSE',x+91,y+5,'rgb(151,174,201)',1,1,w-108);
    const close={kind:'crafting-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);
    const items=state.ui.hud?.crafting??[];
    const selected=Math.max(0,Math.min(items.length-1,state.ui.craftingIndex??0));
    const visibleRows=18;
    const start=Math.max(0,Math.min(Math.max(0,items.length-visibleRows),selected-Math.floor(visibleRows*.5)));
    for(let row=0;row<Math.min(visibleRows,items.length);row++){
      const index=start+row;
      const item=items[index];
      const rect={kind:'crafting-item',index,x:x+7,y:y+16+row*8,w:w-14,h:7};
      state.ui.inventoryRects.push(rect);
      if(index===selected){ context.fillStyle='rgba(92,151,183,.34)'; context.fillRect(rect.x,rect.y,rect.w,rect.h); }
      drawPixelText(context,item.name.toUpperCase(),rect.x+3,rect.y+1,item.affordable?'rgb(236,242,230)':'rgb(150,153,158)',1,1,82);
      drawPixelText(context,item.recipe.toUpperCase(),rect.x+88,rect.y+1,item.affordable?'rgb(224,196,116)':'rgb(128,118,103)',1,1,w-150);
      drawPixelText(context,`OWN ${item.owned}`,rect.x+w-49,rect.y+1,'rgb(151,190,212)',1,1,42);
    }
    const item=items[selected];
    drawPixelText(context,item?`${item.category.toUpperCase()}  ${item.affordable?'READY':'MISSING MATERIALS'}`:'NO RECIPES',x+9,y+h-9,item?.affordable?'rgb(143,224,169)':'rgb(221,133,126)',1,1,w-18);
  }

  function formatSlotTime(timestamp){
    if(!timestamp)return'';
    const date=new Date(timestamp);
    if(!Number.isFinite(date.getTime()))return'';
    return `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }

  function drawWorldMenuOverlay(){
    if(!state.ui.worldMenuOpen)return;
    context.fillStyle='rgba(4,7,12,.7)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=32,y=17,w=WORLD_WIDTH-64,h=WORLD_HEIGHT-34;
    drawPanel(x,y,w,h,.97);
    drawPixelText(context,'WORLD SLOTS',x+8,y+5,'rgb(238,242,250)',1,1);
    drawPixelText(context,'F5 SAVE  F9 LOAD  O CLOSE',x+91,y+5,'rgb(151,174,201)',1,1,w-118);
    const close={kind:'world-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);

    const slots=state.ui.saveSlots.length?state.ui.saveSlots:[1,2,3].map(slot=>({slot,empty:true}));
    const rowH=47;
    for(let index=0;index<3;index++){
      const slot=slots[index]??{slot:index+1,empty:true};
      const rowY=y+17+index*rowH;
      const selected=index===state.ui.worldSlotIndex;
      const rowRect={kind:'world-slot',slot:index+1,x:x+7,y:rowY,w:w-14,h:rowH-4};
      state.ui.inventoryRects.push(rowRect);
      context.fillStyle=selected?'rgba(70,126,166,.36)':'rgba(255,255,255,.035)';
      context.fillRect(rowRect.x,rowRect.y,rowRect.w,rowRect.h);
      if(selected){
        context.fillStyle='rgb(141,211,236)';
        context.fillRect(rowRect.x,rowRect.y,2,rowRect.h);
      }
      const active=state.save.activeSlot===index+1;
      drawPixelText(context,`SLOT ${index+1}${active?' ACTIVE':''}`,rowRect.x+6,rowRect.y+5,active?'rgb(184,235,195)':'rgb(231,236,244)',1,1,92);
      if(slot.empty){
        drawPixelText(context,'EMPTY WORLD SLOT',rowRect.x+6,rowRect.y+16,'rgb(143,158,179)',1,1,126);
      }else{
        drawPixelText(context,`SEED ${slot.seed}  DAY ${slot.day}`,rowRect.x+6,rowRect.y+15,'rgb(197,210,224)',1,1,150);
        drawPixelText(context,`${String(slot.biome).toUpperCase()}  ${formatSlotTime(slot.savedAt)}`,rowRect.x+6,rowRect.y+25,'rgb(143,174,197)',1,1,166);
        drawPixelText(context,`HP ${slot.hp}  FOOD ${slot.hunger}`,rowRect.x+6,rowRect.y+34,'rgb(214,188,137)',1,1,120);
      }

      const buttonY=rowRect.y+6;
      const buttonW=31;
      const buttonH=12;
      const baseX=rowRect.x+rowRect.w-139;
      const actions=slot.empty?['new']:['load','save','new','delete'];
      for(let actionIndex=0;actionIndex<actions.length;actionIndex++){
        const action=actions[actionIndex];
        const bx=slot.empty?rowRect.x+rowRect.w-buttonW-7:baseX+actionIndex*(buttonW+3);
        const button={kind:`world-${action}`,slot:index+1,x:bx,y:buttonY,w:buttonW,h:buttonH};
        state.ui.inventoryRects.push(button);
        const confirming=state.ui.confirmWorldAction===action&&state.ui.confirmWorldSlot===index+1;
        drawPanel(button.x,button.y,button.w,button.h,confirming?.95:.82);
        const label=confirming?'SURE?':action.toUpperCase();
        drawPixelText(context,label,button.x+3,button.y+3,action==='delete'?'rgb(255,134,134)':action==='new'?'rgb(245,210,128)':'rgb(205,229,241)',1,1,button.w-6);
      }
    }
    drawPixelText(context,'NEW AND DELETE REQUIRE A SECOND PRESS',x+8,y+h-10,'rgb(143,158,179)',1,1,w-16);
  }

  function drawPauseOverlay(){
    if(!state.paused||state.ui.worldMenuOpen||state.ui.inventoryOpen||state.ui.craftingOpen)return;
    context.fillStyle='rgba(5,7,12,.72)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const dead=state.player.hp<=0;
    const title=dead?'YOU DIED':'PAUSED';
    const width=pixelTextWidth(title,2,2);
    drawPixelText(context,title,Math.floor((WORLD_WIDTH-width)*.5),75,dead?'rgb(255,100,100)':'rgb(240,244,250)',2,2);
    const hint=dead?'O WORLD SLOTS':'P RESUME  I PACK  O WORLDS  F5 SAVE';
    const hintWidth=pixelTextWidth(hint);
    drawPixelText(context,hint,Math.floor((WORLD_WIDTH-hintWidth)*.5),98,'rgb(176,194,218)',1,1);
    const button={kind:'new-world',x:Math.floor(WORLD_WIDTH*.5)-28,y:112,w:56,h:12};
    state.ui.inventoryRects.push(button);
    drawPanel(button.x,button.y,button.w,button.h,.92);
    drawPixelText(context,'WORLD SLOTS',button.x+5,button.y+3,'rgb(238,242,250)',1,1,button.w-10);
  }

  function drawGameHud(originX,originY){
    const hud=state.ui.hud??{};
    state.ui.inventoryRects.length=0;

    const breathVisible=Boolean(hud.breathUsing);
    drawPanel(3,3,88,breathVisible?29:20,.76);
    drawHeartIcon(6,6,hud.hp<=25&&state.frame%12<6?'rgb(255,230,230)':'rgb(235,73,78)');
    drawPixelText(context,'HP',15,5,'rgb(240,213,216)',1,1,12);
    drawSegmentedBar(28,5,59,7,state.player.hp,100,['rgb(208,54,66)','rgb(255,126,124)','rgb(255,230,230)'],state.player.hp<=25);
    drawFoodIcon(6,14,hud.criticalHunger&&state.frame%12<6?'rgb(255,245,190)':'rgb(231,169,61)');
    drawPixelText(context,'FOOD',15,14,'rgb(240,217,169)',1,1,22);
    drawSegmentedBar(38,14,49,6,state.player.hunger,100,['rgb(216,152,54)','rgb(255,222,115)','rgb(255,246,205)'],hud.criticalHunger);
    if(breathVisible){
      const breathColor=hud.criticalBreath&&state.frame%12<6?'rgb(244,252,255)':'rgb(101,197,235)';
      drawBreathIcon(6,23,breathColor);
      drawPixelText(context,'AIR',15,23,'rgb(184,224,242)',1,1,18);
      drawSegmentedBar(38,23,49,6,state.player.breath,hud.maxBreath??100,['rgb(65,157,211)','rgb(150,225,250)','rgb(244,252,255)'],hud.criticalBreath);
    }

    const infoX=WORLD_WIDTH-121;
    drawPanel(infoX,3,77,22,.72);
    drawWeatherIcon(infoX+4,7,hud.weatherType,hud.timePhase==='day');
    drawPixelText(context,hud.time??'',infoX+18,6,'rgb(231,236,244)',1,1,54);
    drawPixelText(context,hud.weather??'',infoX+18,13,'rgb(170,194,216)',1,1,54);
    drawPixelText(context,`SLOT ${hud.activeSlot??1}`,infoX+4,19,state.save.dirty?'rgb(245,210,128)':'rgb(184,235,195)',1,1,67);
    drawTopButtons();

    const bottomY=WORLD_HEIGHT-17;
    drawPanel(3,bottomY,94,14,.68);
    drawPixelText(context,hud.biome??'',7,bottomY+3,'rgb(211,224,235)',1,1,84);
    drawPixelText(context,`REGION ${hud.region??''}`,7,bottomY+9,'rgb(144,166,188)',1,1,84);

    const weaponW=104;
    const weaponX=Math.floor((WORLD_WIDTH-weaponW)*.5);
    drawPanel(weaponX,bottomY,weaponW,14,.8);
    drawWeaponIcon(weaponX+4,bottomY+2,hud.weaponId);
    drawPixelText(context,hud.weapon??'',weaponX+17,bottomY+3,'rgb(235,239,245)',1,1,78);
    context.fillStyle='rgb(38,43,52)'; context.fillRect(weaponX+17,bottomY+10,78,2);
    if(hud.weaponId===WeaponId.LASER_RIFLE){
      const heatRatio=Math.max(0,Math.min(1,(state.laser?.heat??0)/100));
      context.fillStyle=state.laser?.overheated?'rgb(255,58,52)':heatRatio>.7?'rgb(255,132,48)':'rgb(255,214,95)';
      context.fillRect(weaponX+17,bottomY+10,Math.round(78*heatRatio),2);
      if(state.laser?.overheated)drawPixelText(context,'HOT',weaponX+82,bottomY+3,'rgb(255,112,92)',1,1,14);
    }else{
      const maxCooldown=WEAPON_DB[hud.weaponId]?.cooldown??1;
      const readyRatio=1-Math.max(0,Math.min(1,state.cooldown/Math.max(1,maxCooldown)));
      context.fillStyle=state.cooldown>0?'rgb(113,180,219)':'rgb(116,220,158)';
      context.fillRect(weaponX+17,bottomY+10,Math.round(78*readyRatio),2);
    }

    const resourceW=100;
    const resourceX=WORLD_WIDTH-resourceW-3;
    const resourcePulse=(state.juice?.hudPulse??0)>0&&state.frame%4<2;
    drawPanel(resourceX,bottomY,resourceW,14,resourcePulse?.9:.72);
    drawCrystalIcon(resourceX+4,bottomY+3);
    drawPixelText(context,String(hud.crystals??0),resourceX+13,bottomY+4,'rgb(225,214,255)',1,1,22);
    drawPixelText(context,`PACK ${hud.inventoryCount??0}`,resourceX+39,bottomY+4,'rgb(213,220,232)',1,1,54);
    drawPixelText(context,`ZOOM ${hud.zoom??'OFF'}`,resourceX+39,bottomY+10,'rgb(163,184,208)',1,1,54);

    drawStatusIcons();
    drawBossRitual();
    drawSaveStatus();
    drawPickupFeed();
    drawMessage();
    drawOffscreenBossIndicator(originX,originY);
    drawToolPrompt();
    drawDamageFeedback();
    drawPauseOverlay();
    drawInventoryOverlay();
    drawCraftingOverlay();
    drawWorldMenuOverlay();
  }

  function render(){
    context.imageSmoothingEnabled=false;
    const camera=state.world.camera;
    const current=chunks.getChunk(camera.chunkX,camera.chunkY,true);
    refreshTerrainCache(current);
    const shake=juiceSystem?.cameraOffset?.()??{x:0,y:0};
    context.fillStyle='rgb(5,7,11)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    context.putImageData(terrainImage,shake.x,shake.y);

    const baseOriginX=camera.chunkX*WORLD_WIDTH;
    const baseOriginY=camera.chunkY*WORLD_HEIGHT;
    const originX=baseOriginX-shake.x;
    const originY=baseOriginY-shake.y;
    drawSkyDetails(current,baseOriginX-shake.x,baseOriginY);
    drawAmbientJuice(current,originX,originY);
    drawFurnitureLights(originX,originY);
    drawProjectiles(originX,originY);
    drawExplosionEffects(originX,originY);
    drawHook(originX,originY);
    drawMoonPortal(originX,originY);
    drawFurniture(originX,originY);
    drawEnemyBehaviorWorld(originX,originY);
    drawEnemies(originX,originY);
    drawBosses(originX,originY);
    drawPlayer(originX,originY);
    drawAttachedParasites(originX,originY);
    drawWeaponEffects(originX,originY);
    drawJuiceWorld(originX,originY);
    drawWeather(originX,originY);
    drawMagnifier();
    drawJuiceScreen();
    drawBossHud();
    drawGameHud(originX,originY);
    drawPointerCursor();

    if(canvas.style)canvas.style.cursor='none';
  }

  function invalidateTerrainCache(){
    cachedTerrainChunk=null;
    lastFullTerrainFrame=-TERRAIN_FULL_REFRESH_FRAMES;
  }

  function getPerformanceStats(){
    return{
      terrainPixelsUpdated:lastTerrainPixelsUpdated,
      fullTerrainRefreshFrames:TERRAIN_FULL_REFRESH_FRAMES,
    };
  }

  return { render, context, getPerformanceStats, invalidateTerrainCache };
}

Object.assign(exports,{createRenderer});

};

__modules["src/render/reticle.js"]=function(exports,__require){
function snappedCellCenter(x,y){
  return {x:Math.floor(x),y:Math.floor(y)};
}

function targetCornerRects(x,y,size=5){
  const center=snappedCellCenter(x,y);
  const half=Math.floor(size/2);
  const left=center.x-half;
  const top=center.y-half;
  const right=center.x+half;
  const bottom=center.y+half;
  return [
    [left,top,2,1],
    [left,top,1,2],
    [right-1,top,2,1],
    [right,top,1,2],
    [left,bottom,2,1],
    [left,bottom-1,1,2],
    [right-1,bottom,2,1],
    [right,bottom-1,1,2],
  ];
}

function invalidCrossRects(x,y){
  const center=snappedCellCenter(x,y);
  return [
    [center.x-2,center.y-2,1,1],
    [center.x+2,center.y-2,1,1],
    [center.x-1,center.y-1,1,1],
    [center.x+1,center.y-1,1,1],
    [center.x,center.y,1,1],
    [center.x-1,center.y+1,1,1],
    [center.x+1,center.y+1,1,1],
    [center.x-2,center.y+2,1,1],
    [center.x+2,center.y+2,1,1],
  ];
}

function pointerCrosshairRects(x,y){
  const centerX=Math.round(x);
  const centerY=Math.round(y);
  return [
    [centerX-4,centerY,3,1],
    [centerX+2,centerY,3,1],
    [centerX,centerY-4,1,3],
    [centerX,centerY+2,1,3],
    [centerX,centerY,1,1],
  ];
}

Object.assign(exports,{snappedCellCenter,targetCornerRects,invalidCrossRects,pointerCrosshairRects});

};

__modules["src/render/pixel-font.js"]=function(exports,__require){
const GLYPHS=Object.freeze({
  ' ':[0,0,0,0,0],
  'A':[2,5,7,5,5], 'B':[6,5,6,5,6], 'C':[3,4,4,4,3], 'D':[6,5,5,5,6],
  'E':[7,4,6,4,7], 'F':[7,4,6,4,4], 'G':[3,4,5,5,3], 'H':[5,5,7,5,5],
  'I':[7,2,2,2,7], 'J':[1,1,1,5,2], 'K':[5,5,6,5,5], 'L':[4,4,4,4,7],
  'M':[5,7,7,5,5], 'N':[5,7,7,7,5], 'O':[2,5,5,5,2], 'P':[6,5,6,4,4],
  'Q':[2,5,5,3,1], 'R':[6,5,6,5,5], 'S':[3,4,2,1,6], 'T':[7,2,2,2,2],
  'U':[5,5,5,5,7], 'V':[5,5,5,5,2], 'W':[5,5,7,7,5], 'X':[5,5,2,5,5],
  'Y':[5,5,2,2,2], 'Z':[7,1,2,4,7],
  '0':[7,5,5,5,7], '1':[2,6,2,2,7], '2':[6,1,7,4,7], '3':[6,1,3,1,6],
  '4':[5,5,7,1,1], '5':[7,4,6,1,6], '6':[3,4,7,5,7], '7':[7,1,2,2,2],
  '8':[7,5,7,5,7], '9':[7,5,7,1,6],
  '.':[0,0,0,0,2], ',':[0,0,0,2,4], ':':[0,2,0,2,0], ';':[0,2,0,2,4],
  '!':[2,2,2,0,2], '?':[6,1,2,0,2], '-':[0,0,7,0,0], '+':[0,2,7,2,0],
  '/':[1,1,2,4,4], '\\':[4,4,2,1,1], '(':[1,2,2,2,1], ')':[4,2,2,2,4],
  '[':[3,2,2,2,3], ']':[6,2,2,2,6], '<':[1,2,4,2,1], '>':[4,2,1,2,4],
  '=':[0,7,0,7,0], '_':[0,0,0,0,7], '%':[5,1,2,4,5], '#':[5,7,5,7,5],
  '*':[0,5,2,5,0], "'":[2,2,0,0,0], '"':[5,5,0,0,0], '|':[2,2,2,2,2],
});

function pixelTextWidth(text,scale=1,spacing=1){
  const length=String(text??'').length;
  if(length===0)return 0;
  return length*(3*scale+spacing)-spacing;
}

function drawPixelText(context,text,x,y,color='rgb(255,255,255)',scale=1,spacing=1,maxWidth=Infinity){
  const source=String(text??'').toUpperCase();
  let cursor=Math.round(x);
  const top=Math.round(y);
  const pixelScale=Math.max(1,Math.round(scale));
  const gap=Math.max(0,Math.round(spacing));
  context.fillStyle=color;

  for(const rawCharacter of source){
    const character=rawCharacter==='\n'?' ':rawCharacter;
    if(cursor+3*pixelScale>x+maxWidth)break;
    const rows=GLYPHS[character]??GLYPHS['?'];
    for(let row=0;row<5;row++){
      const bits=rows[row];
      for(let column=0;column<3;column++){
        if(!(bits&(1<<(2-column))))continue;
        context.fillRect(cursor+column*pixelScale,top+row*pixelScale,pixelScale,pixelScale);
      }
    }
    cursor+=3*pixelScale+gap;
  }
  return cursor-Math.round(x);
}

Object.assign(exports,{pixelTextWidth,drawPixelText});

};

__modules["src/render/player-sprite.js"]=function(exports,__require){
const PlayerPixel = Object.freeze({
  SKIN:'skin',
  BODY:'body',
  EYE:'eye',
});

const P=PlayerPixel;

// The canonical upright 3x5 player bitmap. Swimming uses an actual matrix
// rotation of this exact bitmap instead of stretching the bounding box.
const UPRIGHT_PLAYER_SPRITE=Object.freeze([
  Object.freeze([P.SKIN,P.SKIN,P.SKIN]),
  Object.freeze([P.SKIN,P.EYE,P.SKIN]),
  Object.freeze([P.BODY,P.BODY,P.BODY]),
  Object.freeze([P.BODY,P.BODY,P.BODY]),
  Object.freeze([P.BODY,null,P.BODY]),
]);

function rotatedSwimSprite(facing=1){
  const source=UPRIGHT_PLAYER_SPRITE;
  const sourceHeight=source.length;
  const sourceWidth=source[0].length;
  const rotated=Array.from({length:sourceWidth},()=>Array(sourceHeight).fill(null));

  if(facing>=0){
    // Clockwise: the head points right.
    for(let y=0;y<sourceWidth;y++){
      for(let x=0;x<sourceHeight;x++)rotated[y][x]=source[sourceHeight-1-x][y];
    }
  }else{
    // Counter-clockwise: the head points left.
    for(let y=0;y<sourceWidth;y++){
      for(let x=0;x<sourceHeight;x++)rotated[y][x]=source[x][sourceWidth-1-y];
    }
  }

  return rotated;
}

Object.assign(exports,{PlayerPixel,UPRIGHT_PLAYER_SPRITE,rotatedSwimSprite});

};

__modules["src/systems/structure-system.js"]=function(exports,__require){
const { DimensionId, DIMENSION_IDS, dimensionDefinition, createDimensionEntityMap } = __require("src/data/dimensions.db.js");
function createStructureSystem(state,cells,chunks,generator,hud,juice=null){
  const DIMENSION_ENTITY_KEYS=['bosses','bossFireballs','serpentProjectiles','bossProjectiles','pickups','seedParticles','enemyNests','invasionPortals','furniture'];
  const TRANSIENT_ENTITY_KEYS=['bullets','napalmShots','glaives','grenades','drones','droneRockets','nyanCats','nyanSparks','laserSparks','realityRifts','realitySparks','explosions','juiceParticles','damageNumbers','juiceFlashes','juiceShockwaves'];

  function ensureDimensionEntities(){
    if(!state.world.dimensionEntities)state.world.dimensionEntities=createDimensionEntityMap();
    for(const id of DIMENSION_IDS){
      if(!state.world.dimensionEntities[id])state.world.dimensionEntities[id]=Object.create(null);
      if(!state.world.dimensionPositions[id])state.world.dimensionPositions[id]={x:dimensionDefinition(id).spawnX??48,y:45};
    }
    return state.world.dimensionEntities;
  }

  function switchDimension(targetDimension,targetPosition,currentReturnPosition=null){
    const current=state.world.dimension??DimensionId.EARTH;
    if(Number.isInteger(state.player.stolenWeaponId)){
      for(const chunk of state.world.chunks.values()){
        if((chunk.dimension??'earth')!==current)continue;
        for(const enemy of chunk.enemies??[])if(enemy.stolenWeaponId===state.player.stolenWeaponId)enemy.stolenWeaponId=null;
      }
      state.player.stolenWeaponId=null;
      hud.showMessage('Dimensional transit recalled your stolen weapon',900);
    }
    if(current===targetDimension){
      state.player.x=Math.round(targetPosition.x);
      state.player.y=Math.round(targetPosition.y);
      state.player.vx=0;
      state.player.vy=0;
      chunks.updateActiveNeighborhood();
      return;
    }
    const stores=ensureDimensionEntities();
    state.world.dimensionPositions[current]=currentReturnPosition?{x:currentReturnPosition.x,y:currentReturnPosition.y}:{x:state.player.x,y:state.player.y};
    const currentStore=stores[current]??(stores[current]=Object.create(null));
    const targetStore=stores[targetDimension]??(stores[targetDimension]=Object.create(null));
    for(const key of DIMENSION_ENTITY_KEYS){
      const array=state.entities[key];
      if(!Array.isArray(array))continue;
      currentStore[key]=array.splice(0,array.length);
      const incoming=Array.isArray(targetStore[key])?targetStore[key]:[];
      array.push(...incoming);
      targetStore[key]=[];
    }
    for(const key of TRANSIENT_ENTITY_KEYS){
      if(Array.isArray(state.entities[key]))state.entities[key].length=0;
    }
    Object.assign(state.entities.hook,{active:false,stuck:false,x:0,y:0,vx:0,vy:0});
    state.world.dimension=targetDimension;
    state.world.dimensionPositions[targetDimension]={x:targetPosition.x,y:targetPosition.y};
    state.world.visitedDimensions??={earth:true};
    state.world.visitedDimensions[targetDimension]=true;
    state.player.x=Math.round(targetPosition.x);
    state.player.y=Math.round(targetPosition.y);
    state.player.vx=0;
    state.player.vy=0;
    state.world.activeChunks.length=0;
    state.world.activeKeys.clear();
    Object.assign(state.weather,{overrideType:null,currentType:'clear',previousType:'clear',segment:-1,intensity:0,windX:0,visibility:1,nextLightningFrame:0});
    state.weather.flashes.length=0;
    chunks.updateActiveNeighborhood();
  }

  function rectContains(rect,x,y){
    return x>=rect.x&&x<rect.x+rect.w&&y>=rect.y&&y<rect.y+rect.h;
  }

  function portalState(){
    if(!state.world.dimensionPortal){
      state.world.dimensionPortal=state.world.moonPortal??{active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:DimensionId.MOON};
    }
    state.world.moonPortal=state.world.dimensionPortal;
    return state.world.dimensionPortal;
  }

  function portalSpaceOpen(centerX,centerY){
    for(let y=centerY-6;y<=centerY+5;y++)for(let x=centerX-2;x<=centerX+2;x++){
      if(cells.isSolid(cells.getCell(x,y)))return false;
    }
    return true;
  }

  function findPortalPosition(){
    const player=state.player;
    for(const offset of [10,-10,14,-14,7,-7,18,-18]){
      for(const vertical of [0,-4,4,-8,8]){
        const x=Math.round(player.x+offset);
        const y=Math.round(player.y+vertical-2);
        if(portalSpaceOpen(x,y))return {x,y};
      }
    }
    return {x:Math.round(player.x+8),y:Math.round(player.y-2)};
  }

  function openDimensionPortal(targetDimension){
    const definition=dimensionDefinition(targetDimension);
    if(!definition||definition.id!==targetDimension)return false;
    if(state.world.dimension===targetDimension){
      hud.showMessage(`Already in ${definition.name}`,1000);
      return false;
    }
    if(rocketFlightState().active)return false;
    const portal=portalState();
    const position=findPortalPosition();
    Object.assign(portal,{
      active:true,phase:'open',timer:0,life:60*20,x:position.x,y:position.y,
      targetDimension,sourceDimension:state.world.dimension,
      sourceReturnPosition:{x:state.player.x,y:state.player.y},
      colors:[...definition.portalColors],
    });
    const colors=definition.portalColors;
    juice?.screenFlash?.('rgba(182,126,255,.25)',8);
    juice?.shake?.(4,20);
    juice?.shockwave?.(portal.x,portal.y,colors[1]??colors[0],14,22);
    juice?.burst?.(portal.x,portal.y,{colors,count:28,speedMin:.25,speedMax:1.45,spread:Math.PI*2,gravity:0,lifeMin:18,lifeMax:48});
    hud.showMessage(targetDimension===DimensionId.MOON?'A lunar portal tears open':`${definition.name} portal opened`,1400);
    return true;
  }

  function openMoonPortal(){ return openDimensionPortal(DimensionId.MOON); }

  function updatePortal(){
    const portal=portalState();
    if(!portal.active)return false;
    const definition=dimensionDefinition(portal.targetDimension);
    const colors=portal.colors?.length?portal.colors:definition.portalColors;
    portal.timer++;
    if(portal.phase==='open'){
      portal.life--;
      if(portal.timer%6===0){
        juice?.particle?.(portal.x+(portal.timer%5)-2,portal.y-5+(portal.timer%11),{
          vx:0,vy:-.18,gravity:0,life:20,color:colors[portal.timer%colors.length],kind:'spark',
        });
      }
      const closeEnough=Math.abs(state.player.x-portal.x)<=2&&Math.abs(state.player.y-portal.y)<=6;
      if(closeEnough){
        portal.phase='transit';
        portal.timer=0;
        state.player.locked=true;
        state.player.vx=0;
        state.player.vy=0;
        juice?.hitStop?.(4);
        juice?.screenFlash?.('rgba(244,229,255,.4)',10);
        hud.showMessage(`Entering ${definition.name}`,700);
      }else if(portal.life<=0){
        portal.phase='closing';
        portal.timer=0;
      }
    }else if(portal.phase==='transit'){
      state.player.locked=true;
      state.player.x=Math.round(portal.x);
      state.player.y=Math.round(portal.y);
      state.player.vx=0;
      state.player.vy=0;
      if(portal.timer%2===0)juice?.burst?.(portal.x,portal.y,{colors,count:4,speedMin:.2,speedMax:.85,spread:Math.PI*2,gravity:0,lifeMin:8,lifeMax:18});
      if(portal.timer>=24){
        const remembered=state.world.visitedDimensions?.[portal.targetDimension]
          ?state.world.dimensionPositions?.[portal.targetDimension]
          :null;
        const destination=remembered??generator.dimensionSpawnPoint?.(portal.targetDimension)??{x:definition.spawnX??48,y:45};
        switchDimension(portal.targetDimension,destination,portal.sourceReturnPosition);
        state.player.locked=false;
        state.player.invulnerability=120;
        if(portal.targetDimension===DimensionId.MOON)state.world.moonReached=true;
        portal.x=state.player.x;
        portal.y=state.player.y-2;
        portal.phase='arrival';
        portal.timer=0;
        chunks.updateActiveNeighborhood();
        juice?.screenFlash?.('rgba(225,235,255,.44)',12);
        juice?.shockwave?.(state.player.x,state.player.y,colors[1]??colors[0],18,26);
        juice?.explosion?.(state.player.x,state.player.y+1,8,{kind:'spark',colors});
        hud.showMessage(`${definition.name} arrival`,1200);
      }
    }else if(portal.phase==='arrival'){
      if(portal.timer>=28)Object.assign(portal,{active:false,phase:'idle',timer:0,life:0});
    }else if(portal.phase==='closing'){
      if(portal.timer>=18)Object.assign(portal,{active:false,phase:'idle',timer:0,life:0});
    }
    return portal.active;
  }

  function rocketFlightState(){
    if(!state.world.rocketFlight)state.world.rocketFlight={active:false,phase:'idle',timer:0};
    return state.world.rocketFlight;
  }

  function beginLaunch(){
    if(state.world.dimension!==DimensionId.EARTH)return false;
    const rocket=generator.rocketSiloDescriptor?.();
    if(!rocket)return false;
    const flight=rocketFlightState();
    const moon=generator.dimensionSpawnPoint?.(DimensionId.MOON)??{x:48,y:45};
    Object.assign(flight,{active:true,phase:'launch',timer:0,rocketX:rocket.centerX,startY:rocket.launchPadY-1,targetX:moon.x,targetY:moon.y,transferHeight:-84,lunarEntryY:moon.y-42});
    state.player.locked=true;
    state.player.vx=0;
    state.player.vy=0;
    state.jumpBuffer=0;
    state.ui.contextPrompt='';
    juice?.screenFlash?.('rgba(255,245,210,.22)',7);
    juice?.shake?.(5,32);
    juice?.hitStop?.(4);
    juice?.shockwave?.(rocket.centerX,rocket.launchPadY,'rgb(255,218,126)',18,24);
    hud.showMessage('Rocket launch initiated',1200);
    return true;
  }

  function updateFlight(){
    const flight=rocketFlightState();
    if(!flight.active)return false;
    const player=state.player;
    flight.timer++;
    player.locked=true;
    player.vx=0;
    player.vy=0;

    if(flight.phase==='launch'){
      player.x=Math.round(flight.rocketX);
      player.y=Math.round(flight.startY-flight.timer*2);
      state.juice.speedIntensity=1;
      if(flight.timer%2===0)juice?.burst?.(player.x,player.y+4,{colors:['rgb(255,250,210)','rgb(255,161,53)','rgb(223,61,34)'],count:7,speedMin:.25,speedMax:1.15,angle:Math.PI*.5,spread:1.1,gravity:.03,lifeMin:10,lifeMax:24});
      state.ui.contextPrompt='ROCKET ASCENT';
      if(flight.timer===35)hud.showMessage('Leaving atmosphere',900);
      if(flight.timer>=70){ flight.phase='transfer'; flight.timer=0; }
    }else if(flight.phase==='transfer'){
      player.x=Math.round(flight.rocketX);
      player.y=Math.round(flight.transferHeight-flight.timer*3);
      state.juice.speedIntensity=1;
      if(flight.timer%3===0)juice?.particle?.(player.x-10+flight.timer%20,player.y+8,{vx:0,vy:.8,gravity:0,life:16,color:'rgba(210,228,255,.65)',kind:'streak'});
      state.ui.contextPrompt='CRUISING TO THE MOON';
      if(flight.timer>=28){
        flight.phase='landing';
        flight.timer=0;
        switchDimension(DimensionId.MOON,{x:flight.targetX,y:flight.lunarEntryY});
        hud.showMessage('Lunar approach',900);
      }
    }else if(flight.phase==='landing'){
      player.x=Math.round(flight.targetX);
      player.y=Math.min(Math.round(flight.targetY),Math.round(flight.lunarEntryY+flight.timer*2));
      state.ui.contextPrompt='MOON LANDING';
      if(player.y>=Math.round(flight.targetY)){
        player.y=Math.round(flight.targetY);
        player.locked=false;
        player.invulnerability=120;
        state.world.moonReached=true;
        state.world.visitedDimensions??={earth:true};
        state.world.visitedDimensions.moon=true;
        state.ui.contextPrompt='';
        Object.assign(flight,{active:false,phase:'idle',timer:0});
        chunks.updateActiveNeighborhood();
        juice?.explosion?.(player.x,player.y+2,9,{kind:'dust',colors:['rgb(220,214,203)','rgb(151,143,147)','rgb(103,93,128)']});
        hud.showMessage('You have landed on the moon',1600);
      }
    }

    if(chunks.chunkX(player.x)!==state.world.camera.chunkX||chunks.chunkY(player.y)!==state.world.camera.chunkY)chunks.updateActiveNeighborhood();
    return true;
  }

  function updatePrompt(){
    state.ui.contextPrompt='';
    if(state.world.dimension!==DimensionId.EARTH)return;
    const rocket=generator.rocketSiloDescriptor?.();
    if(!rocket)return;
    if(rectContains(rocket.launchZone,state.player.x,state.player.y)){
      state.ui.contextPrompt='UP TO BOARD ROCKET';
      if(state.jumpBuffer>0||state.input.keys.has('w')||state.input.keys.has('arrowup'))beginLaunch();
    }
  }

  function update(){
    if(updateFlight())return;
    const portalActive=updatePortal();
    if(portalActive&&portalState().phase==='transit')return;
    updatePrompt();
  }

  return {
    update,beginLaunch,openMoonPortal,openDimensionPortal,switchDimension,
    flightActive:()=>Boolean(state.world.rocketFlight?.active),
  };
}

Object.assign(exports,{createStructureSystem});

};

__modules["src/systems/furniture-system.js"]=function(exports,__require){
const { WORLD_WIDTH, WORLD_HEIGHT } = __require("src/config.js");
const { MaterialId, materialName } = __require("src/data/materials.db.js");
const { cropById } = __require("src/data/crops.db.js");
const { lootById } = __require("src/data/fauna.db.js");
const { DIMENSION_DB } = __require("src/data/dimensions.db.js");
const { FurnitureId,
  FURNITURE_DB,
  FURNITURE_MAX_PER_DIMENSION,
  SIGN_LABELS,
  furnitureById,
  furnitureBounds,
  furnitureSolidAtEntity, } = __require("src/data/furniture.db.js");
const { playerPixelBounds } = __require("src/player-geometry.js");
const M=MaterialId;
const F=FurnitureId;
const CHEST_RADIUS=13;
const CHEST_CAPACITY=64;
const INTERACT_RADIUS=8;

function createFurnitureSystem(state,cells,chunks,timeSystem,hud,juice=null){
  function activeFurniture(){ return state.entities.furniture; }

  function entityOverlapsRect(entity,left,top,right,bottom){
    const bounds=furnitureBounds(entity);
    return Boolean(bounds&&bounds.left<=right&&bounds.right>=left&&bounds.top<=bottom&&bounds.bottom>=top);
  }

  function solidAt(x,y){
    for(const entity of activeFurniture())if(furnitureSolidAtEntity(entity,x,y))return true;
    return false;
  }

  function furnitureAtPixel(x,y,{solidOnly=false}={}){
    for(let index=activeFurniture().length-1;index>=0;index--){
      const entity=activeFurniture()[index];
      const bounds=furnitureBounds(entity);
      if(!bounds||x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)continue;
      if(solidOnly&&!furnitureSolidAtEntity(entity,x,y))continue;
      return entity;
    }
    return null;
  }

  function hasTerrainSupport(definition,bounds){
    if(definition.placement==='wall'){
      for(let y=bounds.top;y<=bounds.bottom;y++){
        if(cells.isSolid(cells.getCell(bounds.left-1,y))||cells.isSolid(cells.getCell(bounds.right+1,y))||solidAt(bounds.left-1,y)||solidAt(bounds.right+1,y))return true;
      }
      return false;
    }
    for(let x=bounds.left;x<=bounds.right;x++){
      if(cells.isSolid(cells.getCell(x,bounds.bottom+1))||solidAt(x,bounds.bottom+1))return true;
    }
    return false;
  }

  function canPlace(furnitureId,x,y){
    const definition=furnitureById(furnitureId);
    if(!definition)return {valid:false,reason:'unknown furniture'};
    if(activeFurniture().length>=FURNITURE_MAX_PER_DIMENSION)return {valid:false,reason:'dimension furniture limit reached'};
    const entity={furnitureId:definition.id,x:Math.round(x),y:Math.round(y)};
    const bounds=furnitureBounds(entity,definition);
    if(!bounds)return {valid:false,reason:'invalid placement'};
    for(let py=bounds.top;py<=bounds.bottom;py++)for(let px=bounds.left;px<=bounds.right;px++){
      if(cells.getCell(px,py)!==M.AIR)return {valid:false,reason:'space is blocked'};
      const playerBounds=playerPixelBounds(state.player.x,state.player.y,state.player.width,state.player.height);
      if(px>=playerBounds.left&&px<=playerBounds.right&&py>=playerBounds.top&&py<=playerBounds.bottom)return {valid:false,reason:'cannot place inside player'};
    }
    for(const other of activeFurniture())if(entityOverlapsRect(other,bounds.left,bounds.top,bounds.right,bounds.bottom))return {valid:false,reason:'another furnishing is in the way'};
    if(!hasTerrainSupport(definition,bounds))return {valid:false,reason:definition.placement==='wall'?'needs a wall':'needs floor support'};
    return {valid:true,reason:'ready to place',definition,bounds,x:entity.x,y:entity.y};
  }

  function makeEntity(furnitureId,x,y){
    const definition=furnitureById(furnitureId);
    return {
      id:`f${state.frame}_${Math.round(x)}_${Math.round(y)}_${activeFurniture().length}`,
      furnitureId:definition.id,
      x:Math.round(x),y:Math.round(y),dimension:state.world.dimension,
      open:false,on:true,labelIndex:0,storage:Object.create(null),storedTotal:0,
      cropId:null,growth:0,harvests:0,
    };
  }

  function place(furnitureId,x,y){
    const preview=canPlace(furnitureId,x,y);
    if(!preview.valid)return preview;
    const entity=makeEntity(furnitureId,x,y);
    activeFurniture().push(entity);
    juice?.burst?.(entity.x,entity.y-1,{colors:['rgb(240,225,183)','rgb(166,109,57)','rgb(214,233,245)'],count:9,speedMin:.12,speedMax:.7,gravity:.04,lifeMin:8,lifeMax:20});
    juice?.worldFlash?.(entity.x,entity.y-2,'rgb(233,225,190)',4,8);
    return {...preview,entity};
  }

  function remove(entity,{refund=true}={}){
    const index=activeFurniture().indexOf(entity);
    if(index<0)return false;
    activeFurniture().splice(index,1);
    if(refund)state.inventory.addFurniture(entity.furnitureId,1);
    if(state.player.furnitureSeatId===entity.id){
      state.player.furnitureMode='';
      state.player.furnitureSeatId=null;
    }
    juice?.burst?.(entity.x,entity.y-2,{colors:['rgb(204,169,116)','rgb(109,78,48)','rgb(224,229,235)'],count:10,speedMin:.2,speedMax:.85,gravity:.05,lifeMin:10,lifeMax:22});
    return true;
  }

  function recipeAffordable(definition){
    return Boolean(definition&&(definition.recipe??[]).every(cost=>(state.inventory.counts[cost.materialId]??0)>=cost.count));
  }

  function craft(furnitureId){
    const definition=furnitureById(furnitureId);
    if(!definition)return false;
    if(!recipeAffordable(definition)){
      const missing=(definition.recipe??[]).filter(cost=>(state.inventory.counts[cost.materialId]??0)<cost.count).map(cost=>`${cost.count} ${materialName(cost.materialId)}`).join(', ');
      hud.showMessage(`Need ${missing}`,1100);
      return false;
    }
    for(const cost of definition.recipe)state.inventory.remove(cost.materialId,cost.count);
    state.inventory.addFurniture(definition.id,1);
    juice?.pickup?.(state.player.x,state.player.y-2,definition.name.toUpperCase());
    hud.pushPickup?.(definition.name,1);
    hud.showMessage(`${definition.name.toUpperCase()} CRAFTED`,900);
    hud.update();
    return true;
  }

  function rayHit(direction,range){
    const maxDistance=Math.min(range,direction.distance??range);
    let previous='';
    for(let step=1;step<=Math.ceil(maxDistance*4);step++){
      const distance=step/4;
      const x=Math.floor(state.player.x+direction.x*distance);
      const y=Math.floor(state.player.y-2+direction.y*distance);
      const key=`${x},${y}`;
      if(key===previous)continue;
      previous=key;
      const entity=furnitureAtPixel(x,y);
      if(entity)return {entity,x,y,distance};
    }
    return null;
  }

  function nearestFurniture(maxDistance=INTERACT_RADIUS,predicate=null){
    let nearest=null;
    let nearestDistance=maxDistance+.001;
    for(const entity of activeFurniture()){
      if(predicate&&!predicate(entity))continue;
      const distance=Math.hypot(entity.x-state.player.x,(entity.y-2)-(state.player.y-2));
      if(distance<nearestDistance){ nearest=entity; nearestDistance=distance; }
    }
    return nearest;
  }

  function storePickup(chest,pickup){
    const amount=Math.max(1,Math.round(pickup.amount??1));
    if(chest.storedTotal+amount>CHEST_CAPACITY)return false;
    let key='';
    if(pickup.kind==='loot')key=`loot:${pickup.lootId}`;
    else key=`${pickup.kind}:${pickup.cropId}`;
    chest.storage??=Object.create(null);
    chest.storage[key]=(chest.storage[key]??0)+amount;
    chest.storedTotal=(chest.storedTotal??0)+amount;
    return true;
  }

  function emptyChest(chest){
    const entries=Object.entries(chest.storage??{});
    if(entries.length===0){ hud.showMessage('Collector chest is empty',700); return false; }
    let total=0;
    for(const [key,countValue] of entries){
      const count=Math.max(0,Math.round(countValue));
      const [kind,idText]=key.split(':');
      if(kind==='loot'&&lootById(idText))state.inventory.addLoot(idText,count);
      else if(kind==='seed'&&cropById(Number(idText)))state.inventory.addSeed(Number(idText),count);
      else if(kind==='produce'&&cropById(Number(idText)))state.inventory.addProduce(Number(idText),count);
      total+=count;
    }
    chest.storage=Object.create(null);
    chest.storedTotal=0;
    juice?.pickup?.(chest.x,chest.y-2,`+${total}`);
    hud.showMessage(`Collected ${total} stored items`,900);
    hud.update();
    return true;
  }

  function toggleNearby(source){
    let changed=0;
    for(const entity of activeFurniture()){
      if(entity===source||Math.hypot(entity.x-source.x,entity.y-source.y)>18)continue;
      const definition=furnitureById(entity.furnitureId);
      if(definition?.action==='light'){ entity.on=!entity.on; changed++; }
      else if(definition?.action==='toggle'){ entity.open=!entity.open; changed++; }
    }
    hud.showMessage(changed?`Switch toggled ${changed} fixtures`:'No linked fixtures nearby',850);
    juice?.worldFlash?.(source.x,source.y-1,'rgb(255,232,121)',4,8);
    return changed>0;
  }

  function sleepAt(entity){
    const time=timeSystem.getTime();
    state.player.hp=Math.min(100,state.player.hp+(time.isDay?12:35));
    state.player.hunger=Math.min(100,state.player.hunger+(time.isDay?4:12));
    if(!time.isDay){
      state.frame+=Math.max(1,time.cycleFrames-time.cycleFrame);
      hud.showMessage('Slept until dawn',1000);
    }else hud.showMessage('Rested and recovered',900);
    juice?.screenFlash?.('rgba(225,235,255,.32)',18);
    juice?.celebrate?.(entity.x,entity.y-2,{count:20});
    hud.update();
    return true;
  }

  function usePlanter(entity){
    if(entity.cropId){
      if((entity.growth??0)<3600){ hud.showMessage('The planter is still growing',700); return false; }
      state.inventory.addProduce(entity.cropId,2);
      const crop=cropById(entity.cropId);
      entity.growth=0;
      entity.harvests=(entity.harvests??0)+1;
      hud.pushPickup?.(crop?.produceName??'produce',2);
      hud.showMessage(`Harvested ${crop?.produceName??'produce'}`,800);
      juice?.pickup?.(entity.x,entity.y-3,'+2');
      hud.update();
      return true;
    }
    const cropId=state.seedMode.active?state.seedMode.cropId:null;
    if(!Number.isInteger(cropId)||state.inventory.seedCount(cropId)<=0){
      hud.showMessage('Equip seeds, then interact with the planter',900);
      return false;
    }
    state.inventory.removeSeed(cropId,1);
    entity.cropId=cropId;
    entity.growth=0;
    hud.showMessage(`${cropById(cropId)?.name??'Seed'} planted`,750);
    hud.update();
    return true;
  }

  function interactNearest(){
    const entity=nearestFurniture();
    if(!entity){ hud.showMessage('No furniture close enough',600); return false; }
    const definition=furnitureById(entity.furnitureId);
    if(!definition)return false;
    switch(definition.action){
      case 'craft':
        state.ui.craftingOpen=true;
        state.ui.inventoryOpen=false;
        state.ui.worldMenuOpen=false;
        hud.update();
        return true;
      case 'toggle':
        entity.open=!entity.open;
        hud.showMessage(`${definition.name} ${entity.open?'opened':'closed'}`,650);
        juice?.worldFlash?.(entity.x,entity.y-2,entity.open?'rgb(171,225,190)':'rgb(226,182,119)',3,7);
        return true;
      case 'light':
        entity.on=!entity.on;
        hud.showMessage(`${definition.name} ${entity.on?'on':'off'}`,650);
        return true;
      case 'switch': return toggleNearby(entity);
      case 'sit':
        state.player.furnitureMode='sit';
        state.player.furnitureSeatId=entity.id;
        state.player.x=entity.x;
        state.player.y=entity.y+(definition.seatOffsetY??0);
        state.player.vx=0; state.player.vy=0;
        hud.showMessage('Seated · move or jump to stand',800);
        return true;
      case 'sleep': return sleepAt(entity);
      case 'chest': return emptyChest(entity);
      case 'bookshelf':{
        const destination=DIMENSION_DB[(state.frame+Math.abs(entity.x))%DIMENSION_DB.length];
        hud.showMessage(`${destination.name}: type ${destination.code}`,1700);
        return true;
      }
      case 'planter': return usePlanter(entity);
      case 'sign':
        entity.labelIndex=((entity.labelIndex??0)+1)%SIGN_LABELS.length;
        hud.showMessage(`Sign: ${SIGN_LABELS[entity.labelIndex]}`,650);
        return true;
      case 'clock':
        hud.showMessage(timeSystem.getTime().label,1000);
        return true;
      default:
        hud.showMessage(definition.name.toUpperCase(),550);
        return true;
    }
  }

  function updateChest(chest){
    if(state.frame%12!==0||chest.storedTotal>=CHEST_CAPACITY)return;
    for(let index=state.entities.pickups.length-1;index>=0;index--){
      const pickup=state.entities.pickups[index];
      const distance=Math.hypot(pickup.x-chest.x,pickup.y-(chest.y-2));
      if(distance>CHEST_RADIUS)continue;
      if(!storePickup(chest,pickup))continue;
      state.entities.pickups.splice(index,1);
      juice?.particle?.(chest.x,chest.y-2,{vx:0,vy:-.25,gravity:0,life:14,color:'rgb(255,222,117)',kind:'spark'});
      if(chest.storedTotal>=CHEST_CAPACITY)break;
    }
  }

  function updateSeat(){
    if(state.player.furnitureMode!=='sit')return;
    const seat=activeFurniture().find(entity=>entity.id===state.player.furnitureSeatId);
    const movement=state.jumpBuffer>0||['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' '].some(key=>state.input.keys.has(key));
    if(!seat||movement){
      state.player.furnitureMode='';
      state.player.furnitureSeatId=null;
      state.player.y-=1;
      return;
    }
    const definition=furnitureById(seat.furnitureId);
    state.player.x=seat.x;
    state.player.y=seat.y+(definition?.seatOffsetY??0);
    state.player.vx=0;
    state.player.vy=0;
  }

  function update(){
    updateSeat();
    for(const entity of activeFurniture()){
      const definition=furnitureById(entity.furnitureId);
      if(definition?.action==='chest')updateChest(entity);
      if(definition?.action==='planter'&&entity.cropId)entity.growth=Math.min(3600,(entity.growth??0)+1);
    }
  }

  function playerOnLadder(){
    const bounds=playerPixelBounds(state.player.x,state.player.y,state.player.width,state.player.height);
    for(const entity of activeFurniture()){
      if(entity.furnitureId!==F.LADDER)continue;
      if(entityOverlapsRect(entity,bounds.left,bounds.top,bounds.right,bounds.bottom))return entity;
    }
    return null;
  }

  function contextPrompt(){
    const entity=nearestFurniture(6,candidate=>{
      const candidateDefinition=furnitureById(candidate.furnitureId);
      return Boolean(candidateDefinition?.action&&candidateDefinition.action!=='ladder');
    });
    if(!entity)return '';
    const definition=furnitureById(entity.furnitureId);
    const action={craft:'OPEN CRAFTING',toggle:entity.open?'CLOSE':'OPEN',light:entity.on?'TURN OFF':'TURN ON',switch:'TOGGLE FIXTURES',sit:'SIT',sleep:'REST',chest:`COLLECT ${entity.storedTotal??0}`,bookshelf:'READ PORTAL CODE',planter:entity.cropId&&entity.growth>=3600?'HARVEST':'PLANT / CHECK',sign:'CHANGE LABEL',clock:'READ TIME'}[definition.action]??'USE';
    return `F ${action} ${definition.name.toUpperCase()}`;
  }

  function visibleFurniture(originX,originY){
    return activeFurniture().filter(entity=>{
      const bounds=furnitureBounds(entity);
      return bounds&&bounds.right>=originX-4&&bounds.left<originX+WORLD_WIDTH+4&&bounds.bottom>=originY-4&&bounds.top<originY+WORLD_HEIGHT+4;
    });
  }

  return {
    update,solidAt,furnitureAtPixel,canPlace,place,remove,craft,recipeAffordable,rayHit,
    interactNearest,playerOnLadder,contextPrompt,visibleFurniture,nearestFurniture,
    definitions:FURNITURE_DB,
  };
}

Object.assign(exports,{createFurnitureSystem});

};

const __cache=Object.create(null);
function __require(id){
  if(__cache[id])return __cache[id].exports;
  const factory=__modules[id];
  if(!factory)throw new Error('Missing bundled module: '+id);
  const module={exports:{}};
  __cache[id]=module;
  factory(module.exports,__require);
  return module.exports;
}
function showBootError(error){
  console.error(error);
  const status=document.getElementById('boot-status');
  if(status){status.hidden=false;status.classList.add('boot-error');status.textContent='Game failed to start: '+(error?.message||String(error));}
}
try{__require("src/main.js");}catch(error){showBootError(error);}
})();
