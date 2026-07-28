import { createDimensionPositionMap, createDimensionEntityMap } from '../data/dimensions.db.js';

export function createWorldStore(){
  return {
    dimension:'earth',
    dimensionPositions:createDimensionPositionMap(),
    dimensionEntities:createDimensionEntityMap(),
    chunks:new Map(),
    activeChunks:[],
    activeKeys:new Set(),
    camera:{chunkX:0,chunkY:0},
    simulationStamp:1,
    plants:new Map(),
    nextPlantId:1,
    firstVolcanoRegionIndex:null,
    bossSpawned:false,
    bossDefeated:false,
    firstOceanRegionIndex:null,
    seaSerpentSpawned:false,
    seaSerpentDefeated:false,
    bossEncounters:Object.create(null),
    defeatedBossCount:0,
    bossCooldownUntil:0,
    travelOriginX:20,
    moonReached:false,
    visitedDimensions:{earth:true},
    rocketFlight:{active:false,phase:'idle',timer:0},
    dimensionPortal:{active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:'moon'},
    moonPortal:null,
    nextInvasionFrame:null,
    invasionCount:0,
    invasionSerial:1,
  };
}
