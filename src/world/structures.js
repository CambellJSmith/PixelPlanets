import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';
import { MaterialId } from '../data/materials.db.js';
import { BiomeId } from '../data/biomes.db.js';
import { DimensionId, dimensionDefinition, isMoonDimension, isEarthDimension } from '../data/dimensions.db.js';

const M=MaterialId;
const B=BiomeId;

export const MOON_LANDING_X=48;
export const STRUCTURE_SPACING=280;
export const UNDERGROUND_STRUCTURE_SPACING=360;


export function moonSurfaceProfile(x,randomAt,noise1){
  const worldX=Math.floor(x);
  const basin=(noise1(worldX,280,9101)-.5)*10;
  const crater=(noise1(worldX,74,9102)-.5)*8;
  const micro=(noise1(worldX,19,9103)-.5)*2;
  const base=58+basin+crater+micro;
  const craterCenter=Math.floor(worldX/58)*58+29;
  const craterDistance=Math.abs(worldX-craterCenter);
  const craterDepth=Math.max(0,1-craterDistance/16)*6;
  const ridge=Math.max(0,1-Math.abs(craterDistance-15)/6)*2;
  const ground=Math.max(34,Math.min(88,Math.floor(base+craterDepth-ridge)));
  return {
    ground,
    water:ground,
    lake:false,
    ocean:false,
    oceanWeight:0,
    lakeDepth:0,
    biome:'moon',
    mix:{
      dominant:B.PLAINS,
      entries:[{id:B.PLAINS,weight:1,regionIndex:0}],
      weight(){ return 0; },
    },
  };
}

export function rocketSiloDescriptor(surfaceAt,randomAt){
  const region=0;
  const center=220+Math.floor(randomAt(region,0,9601)*90);
  const surface=surfaceAt(center);
  const chamberTop=surface.ground+18;
  const chamberBottom=surface.ground+40;
  return {
    id:'rocket_silo',
    unique:true,
    centerX:center,
    surfaceY:surface.ground,
    shaftTop:surface.ground-2,
    shaftBottom:chamberTop,
    chamberTop,
    chamberBottom,
    launchPadY:chamberBottom-4,
    launchZone:{x:center,y:chamberBottom-5,w:5,h:6},
  };
}

function chunkIntersects(chunk,gx0,gy0,gx1,gy1){
  const left=chunk.x*WORLD_WIDTH;
  const top=chunk.y*WORLD_HEIGHT;
  const right=left+WORLD_WIDTH-1;
  const bottom=top+WORLD_HEIGHT-1;
  return !(gx1<left||gx0>right||gy1<top||gy0>bottom);
}

function slotCenter(slot,randomAt){
  return slot*STRUCTURE_SPACING+80+Math.floor(randomAt(slot,0,9201)*120);
}

function undergroundSlotCenter(slot,randomAt){
  return slot*UNDERGROUND_STRUCTURE_SPACING+120+Math.floor(randomAt(slot,0,9202)*100);
}

export function structureDescriptorsForChunk(chunk,surfaceAt,biomeIdAt,randomAt,dimension=DimensionId.EARTH){
  const results=[];
  const chunkLeft=chunk.x*WORLD_WIDTH;
  const chunkRight=chunkLeft+WORLD_WIDTH-1;
  const chunkTop=chunk.y*WORLD_HEIGHT;
  const chunkBottom=chunkTop+WORLD_HEIGHT-1;

  if(isMoonDimension(dimension)){
    if(chunk.y===0){
      const landingBase={id:'moon_outpost',centerX:140,surfaceY:surfaceAt(140).ground};
      if(chunkIntersects(chunk,landingBase.centerX-22,landingBase.surfaceY-18,landingBase.centerX+22,landingBase.surfaceY+4))results.push(landingBase);
      const firstSlot=Math.floor((chunkLeft-120)/720);
      const lastSlot=Math.floor((chunkRight+120)/720);
      for(let slot=firstSlot;slot<=lastSlot;slot++){
        if(slot===0)continue;
        const centerX=slot*720+180+Math.floor(randomAt(slot,9,9291)*300);
        const surfaceY=surfaceAt(centerX).ground;
        if(randomAt(slot,10,9292)>.55)results.push({id:'moon_outpost',centerX,surfaceY});
        else results.push({id:'lunar_monolith',centerX,surfaceY});
      }
    }
    return results;
  }

  if(!isEarthDimension(dimension)){
    if(chunk.y===0){
      const definition=dimensionDefinition(dimension);
      const spacing=560;
      const firstSlot=Math.floor((chunkLeft-120)/spacing);
      const lastSlot=Math.floor((chunkRight+120)/spacing);
      for(let slot=firstSlot;slot<=lastSlot;slot++){
        const centerX=slot*spacing+120+Math.floor(randomAt(slot,dimension.length,9298)*260);
        const surfaceY=surfaceAt(centerX).ground;
        if(slot===0||randomAt(slot,11,9299)>.48){
          results.push({id:definition.structure,centerX,surfaceY,dimension});
        }
      }
    }
    return results;
  }

  const rocket=rocketSiloDescriptor(surfaceAt,randomAt);
  if(chunkIntersects(chunk,rocket.centerX-18,rocket.surfaceY-10,rocket.centerX+18,rocket.chamberBottom+4))results.push(rocket);

  if(chunk.y===0){
    const firstSlot=Math.floor((chunkLeft-100)/STRUCTURE_SPACING);
    const lastSlot=Math.floor((chunkRight+100)/STRUCTURE_SPACING);
    for(let slot=firstSlot;slot<=lastSlot;slot++){
      const centerX=slotCenter(slot,randomAt);
      const surface=surfaceAt(centerX);
      if(surface.ocean||surface.lake&&surface.ground-surface.water>8){
        if(surface.ocean&&randomAt(slot,1,9203)>.52){
          results.push({id:'lighthouse',centerX,surfaceY:surface.ground,biome:biomeIdAt(centerX)});
        }
        continue;
      }
      if(Math.abs(surfaceAt(centerX-8).ground-surfaceAt(centerX+8).ground)>6)continue;
      if(randomAt(slot,2,9204)<.38)continue;
      const biome=biomeIdAt(centerX);
      const id=(function(){
        switch(biome){
          case B.PLAINS:return randomAt(slot,3,9205)<.5?'ruined_well':'stone_arch';
          case B.SNOW_PEAKS:return 'snow_temple';
          case B.BAMBOO_GROVE:return 'bamboo_shrine';
          case B.SWAMP:return 'swamp_hut';
          case B.VOLCANO:return 'ash_forge';
          case B.GIANT_FOREST:return randomAt(slot,4,9206)<.5?'tree_house':'forest_tower';
          case B.OCEAN:return 'lighthouse';
          default:return 'stone_arch';
        }
      }());
      results.push({id,centerX,surfaceY:surface.ground,biome});
    }
  }

  if(chunk.y>=1){
    const firstSlot=Math.floor((chunkLeft-120)/UNDERGROUND_STRUCTURE_SPACING);
    const lastSlot=Math.floor((chunkRight+120)/UNDERGROUND_STRUCTURE_SPACING);
    for(let slot=firstSlot;slot<=lastSlot;slot++){
      const centerX=undergroundSlotCenter(slot,randomAt);
      const centerY=chunkTop+Math.floor(WORLD_HEIGHT*.5);
      const surface=surfaceAt(centerX);
      const depth=centerY-surface.ground;
      if(depth<18)continue;
      if(randomAt(slot,chunk.y,9210)<.55)continue;
      let id='mine_shaft';
      if(depth>54&&randomAt(slot,chunk.y,9211)<.35)id='crystal_vault';
      else if(depth>34&&randomAt(slot,chunk.y,9212)<.33)id='mushroom_hamlet';
      else if(depth>26&&randomAt(slot,chunk.y,9213)<.28)id='buried_library';
      results.push({id,centerX,centerY,depth});
    }
  }

  return results;
}

export function applyStructureToChunk(chunk,descriptor,helpers){
  const { surfaceAt, setCell, carveAir, fillRect, frameRect }=helpers;
  const cx=Math.round(descriptor.centerX);

  if(descriptor.id==='rocket_silo'){
    const top=descriptor.shaftTop;
    const shaftBottom=descriptor.chamberTop;
    frameRect(cx-3,top-3,cx+3,top,M.ROCK);
    carveAir(cx-2,top-2,cx+2,top-1);
    fillRect(cx-2,top,cx+2,descriptor.launchPadY+1,M.AIR);
    frameRect(cx-3,top,cx+3,descriptor.launchPadY+1,M.ROCK);
    fillRect(cx-9,descriptor.chamberTop,cx+9,descriptor.chamberBottom,M.AIR);
    frameRect(cx-10,descriptor.chamberTop-1,cx+10,descriptor.chamberBottom+1,M.ROCK);
    fillRect(cx-6,descriptor.launchPadY+1,cx+6,descriptor.chamberBottom+1,M.ROCK);
    carveAir(cx-5,descriptor.launchPadY-7,cx+5,descriptor.launchPadY);
    fillRect(cx-1,descriptor.launchPadY-6,cx+1,descriptor.launchPadY-1,M.WOOD);
    fillRect(cx-2,descriptor.launchPadY-7,cx+2,descriptor.launchPadY-7,M.CRYSTAL);
    fillRect(cx-3,descriptor.launchPadY+1,cx+3,descriptor.launchPadY+1,M.CRYSTAL);
    return;
  }

  if(descriptor.id==='moon_outpost'){
    const y=descriptor.surfaceY;
    fillRect(cx-18,y-1,cx+18,y+1,M.CRYSTAL);
    frameRect(cx-11,y-12,cx+11,y-1,M.ROCK);
    carveAir(cx-10,y-11,cx+10,y-2);
    fillRect(cx-3,y-9,cx+3,y-4,M.CRYSTAL);
    fillRect(cx-7,y-3,cx-4,y-2,M.CRYSTAL);
    fillRect(cx+4,y-3,cx+7,y-2,M.CRYSTAL);
    return;
  }

  if(descriptor.id==='lunar_monolith'){
    const y=descriptor.surfaceY;
    fillRect(cx-2,y-17,cx+2,y,M.ROCK);
    fillRect(cx-1,y-15,cx+1,y-2,M.CRYSTAL);
    fillRect(cx-7,y-1,cx+7,y+1,M.SAND);
    return;
  }

  const specialY=descriptor.surfaceY;
  if(descriptor.id==='ember_fortress'){
    frameRect(cx-13,specialY-12,cx+13,specialY,M.ROCK);
    carveAir(cx-11,specialY-10,cx+11,specialY-1);
    fillRect(cx-7,specialY-2,cx+7,specialY-1,M.LAVA);
    fillRect(cx-2,specialY-16,cx+2,specialY-11,M.ASH);
    return;
  }
  if(descriptor.id==='ice_cathedral'){
    frameRect(cx-14,specialY-13,cx+14,specialY,M.CRYSTAL);
    carveAir(cx-12,specialY-11,cx+12,specialY-1);
    fillRect(cx-4,specialY-18,cx+4,specialY-13,M.SNOW);
    fillRect(cx-10,specialY-4,cx-7,specialY-1,M.SNOW);
    fillRect(cx+7,specialY-4,cx+10,specialY-1,M.SNOW);
    return;
  }
  if(descriptor.id==='prism_spire'){
    for(let layer=0;layer<20;layer++)fillRect(cx-Math.max(1,5-Math.floor(layer/4)),specialY-layer,cx+Math.max(1,5-Math.floor(layer/4)),specialY-layer,M.CRYSTAL);
    fillRect(cx-9,specialY-1,cx+9,specialY+1,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='drowned_dome'){
    frameRect(cx-14,specialY-12,cx+14,specialY,M.CRYSTAL);
    carveAir(cx-12,specialY-10,cx+12,specialY-1);
    fillRect(cx-5,specialY-3,cx+5,specialY-1,M.WOOD);
    return;
  }
  if(descriptor.id==='living_temple'){
    fillRect(cx-12,specialY-9,cx-9,specialY,M.WOOD);
    fillRect(cx+9,specialY-9,cx+12,specialY,M.WOOD);
    fillRect(cx-12,specialY-12,cx+12,specialY-9,M.LEAF);
    carveAir(cx-8,specialY-8,cx+8,specialY-1);
    fillRect(cx-2,specialY-6,cx+2,specialY-1,M.MYCELIUM);
    return;
  }
  if(descriptor.id==='gear_tower'){
    frameRect(cx-10,specialY-16,cx+10,specialY,M.ROCK);
    carveAir(cx-8,specialY-14,cx+8,specialY-1);
    for(let y=specialY-13;y<specialY;y+=4)fillRect(cx-7,y,cx+7,y,M.CRYSTAL);
    fillRect(cx-2,specialY-21,cx+2,specialY-16,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='impossible_house'){
    frameRect(cx-12,specialY-9,cx+8,specialY,M.MUSHROOM_CAP);
    carveAir(cx-10,specialY-7,cx+6,specialY-1);
    frameRect(cx-5,specialY-16,cx+13,specialY-8,M.MYCELIUM);
    carveAir(cx-3,specialY-14,cx+11,specialY-9);
    fillRect(cx-1,specialY-5,cx+2,specialY-1,M.CRYSTAL);
    return;
  }
  if(descriptor.id==='cloud_shrine'){
    fillRect(cx-15,specialY-1,cx+15,specialY+1,M.SNOW);
    fillRect(cx-8,specialY-8,cx-6,specialY-2,M.CRYSTAL);
    fillRect(cx+6,specialY-8,cx+8,specialY-2,M.CRYSTAL);
    fillRect(cx-8,specialY-10,cx+8,specialY-8,M.SNOW);
    carveAir(cx-5,specialY-7,cx+5,specialY-2);
    return;
  }
  if(descriptor.id==='glitch_obelisk'){
    for(let y=0;y<19;y++){
      const offset=(y%4===0)?2:0;
      fillRect(cx-3+offset,specialY-y,cx+3+offset,specialY-y,y%3===0?M.CRYSTAL:M.MYCELIUM);
    }
    fillRect(cx-10,specialY-1,cx+10,specialY+1,M.ASH);
    return;
  }

  const surfaceY=descriptor.surfaceY;
  switch(descriptor.id){
    case 'ruined_well':
      frameRect(cx-5,surfaceY-6,cx+5,surfaceY,M.ROCK);
      carveAir(cx-4,surfaceY-5,cx+4,surfaceY-1);
      fillRect(cx-2,surfaceY-1,cx+2,surfaceY+2,M.WATER);
      fillRect(cx-6,surfaceY,cx-4,surfaceY,M.ROCK);
      fillRect(cx+4,surfaceY,cx+6,surfaceY,M.ROCK);
      break;
    case 'stone_arch':
      fillRect(cx-8,surfaceY-7,cx-6,surfaceY,M.ROCK);
      fillRect(cx+6,surfaceY-7,cx+8,surfaceY,M.ROCK);
      fillRect(cx-8,surfaceY-9,cx+8,surfaceY-7,M.ROCK);
      carveAir(cx-5,surfaceY-6,cx+5,surfaceY-1);
      break;
    case 'snow_temple':
      frameRect(cx-9,surfaceY-10,cx+9,surfaceY,M.CRYSTAL);
      carveAir(cx-8,surfaceY-9,cx+8,surfaceY-1);
      fillRect(cx-10,surfaceY,cx+10,surfaceY+1,M.SNOW);
      fillRect(cx-2,surfaceY-4,cx+2,surfaceY-1,M.CRYSTAL);
      break;
    case 'bamboo_shrine':
      fillRect(cx-8,surfaceY-1,cx+8,surfaceY,M.BAMBOO);
      fillRect(cx-7,surfaceY-8,cx-6,surfaceY-2,M.BAMBOO);
      fillRect(cx+6,surfaceY-8,cx+7,surfaceY-2,M.BAMBOO);
      fillRect(cx-8,surfaceY-9,cx+8,surfaceY-8,M.BAMBOO);
      fillRect(cx-5,surfaceY-6,cx+5,surfaceY-5,M.LEAF);
      carveAir(cx-4,surfaceY-4,cx+4,surfaceY-1);
      break;
    case 'swamp_hut':
      fillRect(cx-7,surfaceY-4,cx+7,surfaceY-1,M.WOOD);
      fillRect(cx-9,surfaceY-1,cx-8,surfaceY+3,M.WOOD);
      fillRect(cx+8,surfaceY-1,cx+9,surfaceY+3,M.WOOD);
      fillRect(cx-7,surfaceY-7,cx+7,surfaceY-5,M.LEAF);
      carveAir(cx-5,surfaceY-3,cx+5,surfaceY-2);
      break;
    case 'ash_forge':
      frameRect(cx-9,surfaceY-7,cx+9,surfaceY,M.ROCK);
      carveAir(cx-8,surfaceY-6,cx+8,surfaceY-1);
      fillRect(cx-4,surfaceY-2,cx+4,surfaceY-1,M.LAVA);
      fillRect(cx-10,surfaceY,cx+10,surfaceY+1,M.ASH);
      break;
    case 'tree_house':
      fillRect(cx-1,surfaceY-18,cx+1,surfaceY,M.WOOD);
      fillRect(cx-6,surfaceY-15,cx+6,surfaceY-10,M.WOOD);
      carveAir(cx-5,surfaceY-14,cx+5,surfaceY-11);
      fillRect(cx-8,surfaceY-18,cx+8,surfaceY-16,M.LEAF);
      break;
    case 'forest_tower':
      fillRect(cx-2,surfaceY-16,cx+2,surfaceY,M.WOOD);
      fillRect(cx-7,surfaceY-16,cx+7,surfaceY-14,M.WOOD);
      fillRect(cx-7,surfaceY-9,cx+7,surfaceY-7,M.WOOD);
      carveAir(cx-6,surfaceY-15,cx+6,surfaceY-8);
      break;
    case 'lighthouse':
      fillRect(cx-3,surfaceY-17,cx+3,surfaceY,M.ROCK);
      fillRect(cx-5,surfaceY-19,cx+5,surfaceY-17,M.WOOD);
      carveAir(cx-2,surfaceY-16,cx+2,surfaceY-1);
      fillRect(cx-2,surfaceY-18,cx+2,surfaceY-18,M.CRYSTAL);
      break;
    default:
      break;
  }

  if(descriptor.id==='mine_shaft' || descriptor.id==='crystal_vault' || descriptor.id==='mushroom_hamlet' || descriptor.id==='buried_library'){
    const cy=Math.round(descriptor.centerY);
    if(descriptor.id==='mine_shaft'){
      fillRect(cx-10,cy-5,cx+10,cy+5,M.AIR);
      frameRect(cx-11,cy-6,cx+11,cy+6,M.WOOD);
      fillRect(cx-7,cy,cx+7,cy+1,M.ROCK);
    }else if(descriptor.id==='crystal_vault'){
      fillRect(cx-12,cy-6,cx+12,cy+6,M.AIR);
      frameRect(cx-13,cy-7,cx+13,cy+7,M.ROCK);
      fillRect(cx-5,cy-2,cx+5,cy+2,M.CRYSTAL);
      fillRect(cx-9,cy+4,cx-7,cy+5,M.CRYSTAL);
      fillRect(cx+7,cy-5,cx+9,cy-4,M.CRYSTAL);
    }else if(descriptor.id==='mushroom_hamlet'){
      fillRect(cx-14,cy-6,cx+14,cy+6,M.AIR);
      frameRect(cx-15,cy-7,cx+15,cy+7,M.MYCELIUM);
      fillRect(cx-10,cy+1,cx-4,cy+5,M.MUSHROOM_STEM);
      fillRect(cx-12,cy-1,cx-2,cy+1,M.MUSHROOM_CAP);
      fillRect(cx+4,cy+1,cx+10,cy+5,M.MUSHROOM_STEM);
      fillRect(cx+2,cy-1,cx+12,cy+1,M.MUSHROOM_CAP);
    }else if(descriptor.id==='buried_library'){
      fillRect(cx-13,cy-5,cx+13,cy+5,M.AIR);
      frameRect(cx-14,cy-6,cx+14,cy+6,M.ROCK);
      fillRect(cx-11,cy-4,cx-9,cy+3,M.WOOD);
      fillRect(cx+9,cy-4,cx+11,cy+3,M.WOOD);
      fillRect(cx-7,cy+2,cx+7,cy+3,M.WOOD);
      fillRect(cx-2,cy-2,cx+2,cy+1,M.CRYSTAL);
    }
  }
}
