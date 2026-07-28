export const UndergroundBiomeId = Object.freeze({
  STANDARD_CAVES: 0,
  MUSHROOM_CAVERNS: 1,
});

const U=UndergroundBiomeId;

export const UNDERGROUND_BIOME_DB = Object.freeze([
  { id:U.STANDARD_CAVES, name:'caves' },
  { id:U.MUSHROOM_CAVERNS, name:'mushroom_caverns' },
]);

export function undergroundBiomeName(id){
  return UNDERGROUND_BIOME_DB[id]?.name??'caves';
}
