import { FARM_CONFIG, FOOD_COOKING_CONFIG } from '../config.js';
import { MaterialId, CROP_MATERIALS } from '../data/materials.db.js';
import { CROP_IDS, cropById } from '../data/crops.db.js';
import { lootById } from '../data/fauna.db.js';
import { nearestPixel, snapPixelPosition } from '../pixel-grid.js';

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

export function createCropSystem(state,cells,chunks,noise,hud,weatherSystem=null,juice=null){
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
