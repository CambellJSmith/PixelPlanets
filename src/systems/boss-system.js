import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CALDERA_BOSS_CONFIG,
  SEA_SERPENT_CONFIG,
  STEAM_CONFIG,
  DAY_NIGHT_CONFIG,
} from '../config.js';
import { BIOME_REGION_SIZE, BiomeId } from '../data/biomes.db.js';
import { UndergroundBiomeId } from '../data/underground-biomes.db.js';
import { BossKind, BOSS_KINDS, bossDefinition } from '../data/bosses.db.js';
import { bossRitualDefinition } from '../data/boss-rituals.db.js';
import { WeatherType } from '../data/weather.db.js';
import { MaterialId, FLAMMABLE_MATERIALS } from '../data/materials.db.js';
import { playerPixelBounds } from '../player-geometry.js';
import { nearestPixel, snapPixelPosition, snapStoredCoordinates } from '../pixel-grid.js';
import { isEarthDimension } from '../data/dimensions.db.js';

export function createBossSystem(state,cells,chunks,generator,noise,hud,playerSystem,timeSystem=null,juice=null){
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
