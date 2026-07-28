export const MaterialId = Object.freeze({
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

export const MATERIAL_DB = Object.freeze([
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

export const MATERIAL_COUNT = MATERIAL_DB.length;
export const SOLID_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.solid).map(item=>item.id));
export const COLLECTABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.collectable).map(item=>item.id));
export const PLACEABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.placeable).map(item=>item.id));
export const FLAMMABLE_MATERIALS = new Set(MATERIAL_DB.filter(item=>item.flammable).map(item=>item.id));
export const POWDER_MATERIALS = new Set([M.SAND,M.SNOW,M.MUD,M.ASH]);
export const LIQUID_MATERIALS = new Set([M.WATER,M.LAVA,M.NAPALM]);
export const GAS_MATERIALS = new Set([M.SMOKE,M.STEAM]);
export const CROP_MATERIALS = new Set([M.CROP_STEM,M.CROP_LEAF,M.CROP_FRUIT]);

export function materialName(id){
  return MATERIAL_DB[id]?.name ?? 'unknown';
}
