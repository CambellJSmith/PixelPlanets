import { MATERIAL_COUNT, PLACEABLE_MATERIALS } from '../data/materials.db.js';
import { cropById } from '../data/crops.db.js';
import { lootById } from '../data/fauna.db.js';
import { furnitureById } from '../data/furniture.db.js';

export function createInventoryStore(){
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
