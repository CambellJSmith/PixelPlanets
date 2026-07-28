import { WORLD_WIDTH, WORLD_HEIGHT, PERFORMANCE_CONFIG } from './config.js';
import { WeaponId } from './data/weapons.db.js';
import { MaterialId } from './data/materials.db.js';
import { playerPixelBounds } from './player-geometry.js';
import { snapGamePositions } from './pixel-grid.js';
import { createGameState } from './state/game-state.js';
import { createNoise } from './world/noise.js';
import { createWorldGenerator } from './world/generator.js';
import { createChunkManager } from './world/chunks.js';
import { createCellAccess } from './world/cells.js';
import { createHud } from './ui/hud.js';
import { createWeaponSystem } from './systems/weapon-system.js';
import { createPlayerSystem } from './systems/player-system.js';
import { createProjectileSystem } from './systems/projectile-system.js';
import { createEnemySystem } from './systems/enemy-system.js';
import { createBossSystem } from './systems/boss-system.js';
import { createMaterialSystem } from './systems/material-system.js';
import { createInputSystem } from './systems/input-system.js';
import { createCropSystem } from './systems/crop-system.js';
import { createTimeSystem } from './systems/time-system.js';
import { createWeatherSystem } from './systems/weather-system.js';
import { createSaveSystem } from './systems/save-system.js';
import { createJuiceSystem } from './systems/juice-system.js';
import { createPalette } from './render/palette.js';
import { createRenderer } from './render/renderer.js';
import { createStructureSystem } from './systems/structure-system.js';
import { createFurnitureSystem } from './systems/furniture-system.js';
import { createDimensionPositionMap, createDimensionEntityMap, DimensionId } from './data/dimensions.db.js';

export function createGame(canvas){
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
