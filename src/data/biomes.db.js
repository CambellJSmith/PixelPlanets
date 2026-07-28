export const BiomeId = Object.freeze({
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
export const BIOME_REGION_SIZE = 960;
export const BIOME_TRANSITION_WIDTH = 280;

export const BIOME_DB = Object.freeze([
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

export function biomeName(id){
  return BIOME_DB[id]?.name ?? 'unknown';
}
