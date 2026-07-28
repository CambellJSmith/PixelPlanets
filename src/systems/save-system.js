import { createDimensionPositionMap, createDimensionEntityMap, DimensionId } from '../data/dimensions.db.js';
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

export function createSaveSystem(state,options){
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
