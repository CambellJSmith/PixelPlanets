import { ACTIVE_CHUNK_COUNT, MAGNIFIER_CONFIG, HUNGER_CONFIG, BREATH_CONFIG } from '../config.js';
import { materialName } from '../data/materials.db.js';
import { cropById } from '../data/crops.db.js';
import { WeaponId, weaponName } from '../data/weapons.db.js';
import { lootById } from '../data/fauna.db.js';
import { dimensionDefinition } from '../data/dimensions.db.js';
import { FURNITURE_DB, furnitureById, furnitureRecipeText } from '../data/furniture.db.js';

export function createHud(state,generator,timeSystem,weatherSystem=null){
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
