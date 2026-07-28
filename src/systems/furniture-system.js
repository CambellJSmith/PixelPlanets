import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';
import { MaterialId, materialName } from '../data/materials.db.js';
import { cropById } from '../data/crops.db.js';
import { lootById } from '../data/fauna.db.js';
import { DIMENSION_DB } from '../data/dimensions.db.js';
import {
  FurnitureId,
  FURNITURE_DB,
  FURNITURE_MAX_PER_DIMENSION,
  SIGN_LABELS,
  furnitureById,
  furnitureBounds,
  furnitureSolidAtEntity,
} from '../data/furniture.db.js';
import { playerPixelBounds } from '../player-geometry.js';

const M=MaterialId;
const F=FurnitureId;
const CHEST_RADIUS=13;
const CHEST_CAPACITY=64;
const INTERACT_RADIUS=8;

export function createFurnitureSystem(state,cells,chunks,timeSystem,hud,juice=null){
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
