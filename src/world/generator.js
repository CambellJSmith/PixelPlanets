import { WORLD_WIDTH, WORLD_HEIGHT, CHUNK_CELL_COUNT, VOLCANO_CONFIG, OCEAN_CONFIG } from '../config.js';
import { MaterialId } from '../data/materials.db.js';
import {
  BIOME_DB,
  BIOME_REGION_SIZE,
  BIOME_TRANSITION_WIDTH,
  BiomeId,
  biomeName,
} from '../data/biomes.db.js';
import { ENTITY_DB } from '../data/entities.db.js';
import { faunaForSurfaceBiome, faunaForUndergroundBiome } from '../data/fauna.db.js';
import { UndergroundBiomeId, undergroundBiomeName } from '../data/underground-biomes.db.js';
import { structureDescriptorsForChunk, applyStructureToChunk, rocketSiloDescriptor } from './structures.js';
import { DimensionId, dimensionDefinition, dimensionSurfaceProfile, dimensionMaterialAt, dimensionName, isEarthDimension, isMoonDimension } from '../data/dimensions.db.js';

const M=MaterialId;
const B=BiomeId;
const U=UndergroundBiomeId;

export function createWorldGenerator(state,noise){
  const { randomAt, noise1, noise2 }=noise;
  const index=(x,y)=>x+y*WORLD_WIDTH;
  const mixCache=new Map();
  const surfaceCache=new Map();
  let cacheSeed=state.seed;
  let cacheDimension=state.world.dimension??DimensionId.EARTH;

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const smoother=t=>{
    const x=clamp(t,0,1);
    return x*x*x*(x*(x*6-15)+10);
  };

  function ensureCacheSeed(){
    const dimension=state.world.dimension??DimensionId.EARTH;
    if(cacheSeed===state.seed&&cacheDimension===dimension)return;
    cacheSeed=state.seed;
    cacheDimension=dimension;
    mixCache.clear();
    surfaceCache.clear();
  }

  function rawRegionBiome(regionIndex){
    return Math.floor(randomAt(regionIndex,1501,9087)*BIOME_DB.length)%BIOME_DB.length;
  }

  function regionBiomeId(regionIndex){
    // Consecutive identical rolls are allowed to merge into an extra-large biome.
    // When they differ, the transition is handled by biomeMixAt().
    return rawRegionBiome(regionIndex);
  }

  function addWeight(entries,id,weight,regionIndex){
    if(weight<=0)return;
    const existing=entries.find(item=>item.id===id);
    if(existing){
      existing.weight+=weight;
      return;
    }
    entries.push({id,weight,regionIndex});
  }

  function biomeMixAt(x){
    ensureCacheSeed();
    const worldX=Math.floor(x);
    if(mixCache.has(worldX))return mixCache.get(worldX);

    const regionIndex=Math.floor(worldX/BIOME_REGION_SIZE);
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const local=worldX-regionStart;
    const halfTransition=BIOME_TRANSITION_WIDTH*.5;
    const currentId=regionBiomeId(regionIndex);
    const entries=[];

    if(local<halfTransition){
      const previousId=regionBiomeId(regionIndex-1);
      const transition=smoother((local+halfTransition)/BIOME_TRANSITION_WIDTH);
      addWeight(entries,previousId,1-transition,regionIndex-1);
      addWeight(entries,currentId,transition,regionIndex);
    }else if(local>BIOME_REGION_SIZE-halfTransition){
      const nextId=regionBiomeId(regionIndex+1);
      const transition=smoother((local-(BIOME_REGION_SIZE-halfTransition))/BIOME_TRANSITION_WIDTH);
      addWeight(entries,currentId,1-transition,regionIndex);
      addWeight(entries,nextId,transition,regionIndex+1);
    }else{
      addWeight(entries,currentId,1,regionIndex);
    }

    entries.sort((a,b)=>b.weight-a.weight);
    const dominant=entries[0]?.id??B.PLAINS;
    const result={
      dominant,
      regionIndex,
      entries,
      weight(id){
        return entries.find(item=>item.id===id)?.weight??0;
      },
    };
    mixCache.set(worldX,result);
    return result;
  }

  function biomeIdAt(x){
    return biomeMixAt(x).dominant;
  }

  function volcanoDescriptor(regionIndex){
    if(regionBiomeId(regionIndex)!==B.VOLCANO)return null;
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const range=(min,max,salt)=>min+randomAt(regionIndex,salt,1510+salt)*(max-min);
    return{
      regionIndex,
      center:
        regionStart+BIOME_REGION_SIZE*.5+
        (randomAt(regionIndex,77,1509)-.5)*BIOME_REGION_SIZE*.12,
      coneRadius:BIOME_REGION_SIZE*VOLCANO_CONFIG.coneRadiusRatio,
      calderaRadius:range(VOLCANO_CONFIG.calderaRadiusMin,VOLCANO_CONFIG.calderaRadiusMax,1),
      conduitRadius:range(VOLCANO_CONFIG.conduitRadiusMin,VOLCANO_CONFIG.conduitRadiusMax,2),
      chamberDepth:range(VOLCANO_CONFIG.chamberDepthMin,VOLCANO_CONFIG.chamberDepthMax,3),
      chamberRadiusX:range(VOLCANO_CONFIG.chamberRadiusXMin,VOLCANO_CONFIG.chamberRadiusXMax,4),
      chamberRadiusY:range(VOLCANO_CONFIG.chamberRadiusYMin,VOLCANO_CONFIG.chamberRadiusYMax,5),
    };
  }

  function oceanDescriptor(regionIndex){
    if(regionBiomeId(regionIndex)!==B.OCEAN)return null;
    const regionStart=regionIndex*BIOME_REGION_SIZE;
    const range=(min,max,salt)=>min+randomAt(regionIndex,salt,6100+salt)*(max-min);
    return {
      regionIndex,
      center:regionStart+BIOME_REGION_SIZE*.5,
      seaLevel:range(OCEAN_CONFIG.seaLevelMin,OCEAN_CONFIG.seaLevelMax,1),
      floorBase:range(OCEAN_CONFIG.floorMin,OCEAN_CONFIG.floorMax,2),
      trenchDepth:range(OCEAN_CONFIG.trenchDepth*.6,OCEAN_CONFIG.trenchDepth,3),
    };
  }

  function volcanoShape(x,entry){
    if(entry.id!==B.VOLCANO)return{cone:0,crater:0,rim:0};
    const descriptor=volcanoDescriptor(entry.regionIndex);
    if(!descriptor)return{cone:0,crater:0,rim:0};
    const distance=Math.abs(x-descriptor.center);
    const cone=clamp(1-distance/descriptor.coneRadius,0,1);
    const calderaDistance=distance/descriptor.calderaRadius;
    const crater=clamp(1-calderaDistance,0,1);
    const rim=clamp(1-Math.abs(calderaDistance-.88)/.18,0,1);
    return{
      cone:Math.pow(cone,2.35)*entry.weight,
      crater:Math.pow(crater,1.75)*entry.weight,
      rim:Math.pow(rim,2)*entry.weight,
    };
  }

  function surfaceAt(x){
    ensureCacheSeed();
    const worldX=Math.floor(x);
    if(surfaceCache.has(worldX))return surfaceCache.get(worldX);
    if(!isEarthDimension(state.world.dimension)){
      const result=dimensionSurfaceProfile(state.world.dimension,worldX,noise1,randomAt);
      surfaceCache.set(worldX,result);
      return result;
    }

    const mix=biomeMixAt(worldX);
    const broad=(noise1(worldX,270,31)-.5)*13;
    const medium=(noise1(worldX,120,29)-.5)*6.5;
    const detail=(noise1(worldX,38,27)-.5)*1.7;
    const flatField=smoother((noise1(worldX,230,41)-.43)/.36);
    const detailScale=1-flatField*.88;
    let ground=57+broad+medium*detailScale+detail*detailScale;

    const snowWeight=mix.weight(B.SNOW_PEAKS);
    const swampWeight=mix.weight(B.SWAMP);
    const plainsWeight=mix.weight(B.PLAINS);
    const bambooWeight=mix.weight(B.BAMBOO_GROVE);
    const forestWeight=mix.weight(B.GIANT_FOREST);
    const volcanoWeight=mix.weight(B.VOLCANO);
    const oceanWeight=mix.weight(B.OCEAN);

    if(snowWeight>0){
      const ridge=Math.max(0,(noise1(worldX,170,57)-.39)*1.8);
      const peak=Math.max(0,(noise1(worldX,68,58)-.61)/.39);
      ground-=snowWeight*(ridge*17+peak*22);
    }

    if(volcanoWeight>0){
      for(const entry of mix.entries){
        const shape=volcanoShape(worldX,entry);
        ground-=shape.cone*32;
        ground+=shape.crater*VOLCANO_CONFIG.calderaDepth;
        ground-=shape.rim*6;
      }
    }

    ground+=swampWeight*(4+Math.max(0,(noise1(worldX,150,61)-.47)*5));
    ground+=plainsWeight*Math.sin(worldX*.0065)*1.1;
    ground+=bambooWeight*Math.sin(worldX*.012)*1.25;
    ground+=forestWeight*Math.sin(worldX*.008)*1.8;

    let seaLevel=OCEAN_CONFIG.seaLevelMin;
    if(oceanWeight>0){
      let weightedSeaLevel=0;
      let weightedFloor=0;
      let totalOceanWeight=0;
      for(const entry of mix.entries){
        if(entry.id!==B.OCEAN)continue;
        const descriptor=oceanDescriptor(entry.regionIndex);
        if(!descriptor)continue;
        const distance=Math.abs(worldX-descriptor.center)/(BIOME_REGION_SIZE*.5);
        const trench=Math.max(0,1-distance);
        const oceanFloorNoise=(noise1(worldX,150,6201)-.5)*8+(noise1(worldX,47,6202)-.5)*3;
        const floor=descriptor.floorBase+oceanFloorNoise+Math.pow(trench,2)*descriptor.trenchDepth;
        weightedSeaLevel+=descriptor.seaLevel*entry.weight;
        weightedFloor+=floor*entry.weight;
        totalOceanWeight+=entry.weight;
      }
      if(totalOceanWeight>0){
        seaLevel=weightedSeaLevel/totalOceanWeight;
        const oceanFloor=weightedFloor/totalOceanWeight;
        const blend=smoother(oceanWeight);
        ground=ground+(oceanFloor-ground)*blend;
      }
    }

    ground=Math.floor(clamp(ground,24,92));

    const lakeNoise=noise1(worldX,180,71);
    const lakeActivation=.86-swampWeight*.22;
    const lakeStrength=Math.max(0,(lakeNoise-lakeActivation)/(1-lakeActivation))*(1-volcanoWeight*.98)*(1-oceanWeight);
    const lakeDepth=Math.floor(lakeStrength*(7+swampWeight*5));
    const ocean=oceanWeight>OCEAN_CONFIG.beachBlendThreshold&&ground>seaLevel+2;
    const inlandLake=volcanoWeight<.55&&(lakeDepth>=3||swampWeight>.55&&lakeNoise>.7);
    const lake=ocean||inlandLake;
    const dominant=mix.dominant;
    const resolvedGround=ocean?ground:ground+lakeDepth;

    const result={
      biome:dominant,
      mix,
      base:ground,
      ground:resolvedGround,
      water:ocean?Math.floor(seaLevel):ground+(swampWeight>.5?1:3),
      lake,
      ocean,
      oceanWeight,
      lakeDepth:ocean?Math.max(0,resolvedGround-Math.floor(seaLevel)):lakeDepth,
    };
    surfaceCache.set(worldX,result);
    return result;
  }

  function nearbyVolcanoDescriptors(x){
    const baseRegion=Math.floor(x/BIOME_REGION_SIZE);
    const descriptors=[];
    for(let offset=-1;offset<=1;offset++){
      const descriptor=volcanoDescriptor(baseRegion+offset);
      if(descriptor&&Math.abs(x-descriptor.center)<=descriptor.coneRadius+descriptor.chamberRadiusX){
        descriptors.push(descriptor);
      }
    }
    return descriptors;
  }

  function volcanoFeatureAt(x,y,surface=surfaceAt(x)){
    for(const descriptor of nearbyVolcanoDescriptors(x)){
      const dx=x-descriptor.center;
      const absoluteX=Math.abs(dx);
      const centerSurface=surfaceAt(Math.round(descriptor.center));
      const chamberCenterY=centerSurface.ground+descriptor.chamberDepth;
      const chamberX=dx/descriptor.chamberRadiusX;
      const chamberY=(y-chamberCenterY)/descriptor.chamberRadiusY;
      const chamberDistance=chamberX*chamberX+chamberY*chamberY;

      // A large vaulted chamber sits below the volcano. Its upper third is an
      // open cavern and the lower section is a deep lava reservoir.
      if(chamberDistance<=1){
        return y>=chamberCenterY-descriptor.chamberRadiusY*.22?M.LAVA:M.AIR;
      }

      const conduitTop=centerSurface.ground-VOLCANO_CONFIG.lavaPoolDepth;
      const conduitBottom=chamberCenterY-descriptor.chamberRadiusY*.62;
      if(y>=conduitTop&&y<=conduitBottom){
        const wobble=
          Math.sin((y-centerSurface.ground)*.045+descriptor.regionIndex)*2.2+
          Math.sin((y-centerSurface.ground)*.013+descriptor.regionIndex*3)*1.4;
        if(Math.abs(x-(descriptor.center+wobble))<=descriptor.conduitRadius)return M.LAVA;
      }

      // The caldera is a broad open bowl with a visible lava lake rather than
      // a narrow surface crack.
      if(absoluteX<=descriptor.calderaRadius*.72){
        const lavaTop=centerSurface.ground-VOLCANO_CONFIG.lavaPoolDepth;
        if(y>=lavaTop&&y<surface.ground)return M.LAVA;
      }
    }
    return null;
  }

  function skyAt(x){
    if(!isEarthDimension(state.world.dimension)){
      const definition=dimensionDefinition(state.world.dimension);
      return {top:[...definition.skyTop],bottom:[...definition.skyBottom]};
    }
    const mix=biomeMixAt(x);
    const top=[0,0,0];
    const bottom=[0,0,0];

    for(const entry of mix.entries){
      const biome=BIOME_DB[entry.id]??BIOME_DB[B.PLAINS];
      for(let channel=0;channel<3;channel++){
        top[channel]+=biome.skyTop[channel]*entry.weight;
        bottom[channel]+=biome.skyBottom[channel]*entry.weight;
      }
    }

    return{top,bottom};
  }

  function shaftDistance(x,y){
    const section=Math.floor(x/520);
    let best=9999;

    for(let offset=-1;offset<=1;offset++){
      const candidate=section+offset;
      // Fewer surface openings: approximately one viable shaft per 3–4 sections.
      if(randomAt(candidate,1,902)<.82)continue;

      const entranceX=candidate*520+90+Math.floor(randomAt(candidate,0,901)*340);
      const surface=surfaceAt(entranceX);
      if(y<surface.ground-1||y>surface.ground+88)continue;

      const bend=
        Math.sin((y-surface.ground)*.075+candidate)*3+
        Math.sin((y-surface.ground)*.021+candidate*2)*1.7;
      best=Math.min(best,Math.abs(x-entranceX-bend));
    }

    return best;
  }

  function mushroomStrengthAt(x,y){
    const surface=surfaceAt(x);
    const depth=y-surface.ground;
    if(depth<30)return 0;
    const broad=noise2(x,y,430,1801)*.7+noise2(x,y,190,1802)*.3;
    const depthFade=smoother(clamp((depth-30)/55,0,1));
    return smoother((broad-.53)/.2)*depthFade;
  }

  function undergroundBiomeIdAt(x,y){
    return mushroomStrengthAt(x,y)>.48?U.MUSHROOM_CAVERNS:U.STANDARD_CAVES;
  }

  function caveAirAt(x,y,surface=surfaceAt(x)){
    const depth=y-surface.ground;
    if(depth<0)return false;
    if(shaftDistance(x,y)<3.7&&depth<88)return true;

    const cave=noise2(x,y,68,313)*.57+noise2(x,y,31,332)*.27+noise2(x,y,15,356)*.16;
    if(depth>26&&cave>.755)return true;
    if(depth>44&&Math.abs(noise2(x,y,44,777)-.5)<.031)return true;
    return false;
  }

  function generatedMaterial(x,y,cache=null){
    const surface=surfaceAt(x);
    const caveAt=cache?.caveAt??caveAirAt;
    const mushroomAt=cache?.mushroomAt??mushroomStrengthAt;
    if(!isEarthDimension(state.world.dimension)){
      return dimensionMaterialAt(state.world.dimension,x,y,surface,noise2,randomAt);
    }
    const volcanoFeature=volcanoFeatureAt(x,y,surface);
    if(volcanoFeature!==null)return volcanoFeature;
    if(y<surface.ground)return surface.lake&&y>=surface.water?M.WATER:M.AIR;

    const depth=y-surface.ground;
    if(caveAt(x,y,surface))return M.AIR;

    if(depth===0){
      if(surface.ocean)return M.SAND;
      if(surface.lake)return surface.biome===B.SWAMP?M.MUD:M.SAND;
      if(surface.biome===B.SNOW_PEAKS)return M.SNOW;
      if(surface.biome===B.SWAMP)return M.MUD;
      if(surface.biome===B.VOLCANO)return M.ASH;
      return M.GRASS;
    }

    // A deeper topsoil layer makes surface excavation read as soil rather than
    // immediately exposing stone.
    if(depth<11){
      if(surface.ocean)return depth<OCEAN_CONFIG.sandDepth?M.SAND:M.DIRT;
      if(surface.lake)return surface.biome===B.SWAMP?M.MUD:M.SAND;
      if(surface.biome===B.SNOW_PEAKS&&depth<4)return M.SNOW;
      if(surface.biome===B.SWAMP)return M.MUD;
      if(surface.biome===B.VOLCANO&&depth<5)return M.ASH;
      return M.DIRT;
    }

    const mushroomStrength=mushroomAt(x,y);
    const touchesCave=
      caveAt(x,y-1,surfaceAt(x))||
      caveAt(x-1,y,surfaceAt(x-1))||
      caveAt(x+1,y,surfaceAt(x+1));

    if(mushroomStrength>.34&&touchesCave)return M.MYCELIUM;

    // Broad underground soil pockets interrupt the stone with mineable dirt
    // clusters. Mushroom caverns replace the same pockets with mycelium dirt.
    const dirtCluster=noise2(x,y,48,1701)*.72+noise2(x,y,23,1702)*.28;
    if(depth<125&&dirtCluster>.735){
      return mushroomStrength>.42?M.MYCELIUM:M.DIRT;
    }

    if(surface.mix.weight(B.VOLCANO)>.35&&depth>40&&noise2(x,y,34,515)>.81)return M.LAVA;
    if(depth>112&&noise2(x,y,34,516)>.84)return M.LAVA;
    return M.ROCK;
  }

  function putGenerated(chunk,gx,gy,type){
    const x=gx-chunk.x*WORLD_WIDTH;
    const y=gy-chunk.y*WORLD_HEIGHT;
    if(x>=0&&y>=0&&x<WORLD_WIDTH&&y<WORLD_HEIGHT&&chunk.cells[index(x,y)]===M.AIR){
      chunk.cells[index(x,y)]=type;
    }
  }

  function generateVegetation(chunk){
    if(chunk.y!==0)return;

    const first=Math.floor((chunk.x*WORLD_WIDTH-40)/11);
    const last=Math.floor((chunk.x*WORLD_WIDTH+WORLD_WIDTH+40)/11);

    for(let slot=first;slot<=last;slot++){
      const x=slot*11+2+Math.floor(randomAt(slot,10,404)*7);
      const surface=surfaceAt(x);
      if(!isEarthDimension(state.world.dimension))continue;
      if(surface.ocean||surface.lake||Math.abs(surfaceAt(x-3).ground-surfaceAt(x+3).ground)>5)continue;

      const mix=surface.mix;
      const bambooWeight=mix.weight(B.BAMBOO_GROVE);
      const forestWeight=mix.weight(B.GIANT_FOREST);
      const swampWeight=mix.weight(B.SWAMP);
      const volcanoWeight=mix.weight(B.VOLCANO);
      const snowWeight=mix.weight(B.SNOW_PEAKS);

      if(bambooWeight>.42&&randomAt(slot,0,430)<.78*bambooWeight){
        const stems=2+Math.floor(randomAt(slot,1,431)*4);
        for(let stem=0;stem<stems;stem++){
          const gx=x-2+stem*2;
          const base=surfaceAt(gx).ground;
          const height=7+Math.floor(randomAt(gx,stem,433)*9);
          for(let i=1;i<=height;i++)putGenerated(chunk,gx,base-i,M.BAMBOO);
          putGenerated(chunk,gx-1,base-height-1,M.LEAF);
          putGenerated(chunk,gx,base-height-1,M.LEAF);
          putGenerated(chunk,gx+1,base-height-1,M.LEAF);
        }
        continue;
      }

      if(forestWeight>.42&&randomAt(slot,0,440)<.34*forestWeight){
        const height=18+Math.floor(randomAt(slot,2,442)*13);
        const width=2+Math.floor(randomAt(slot,1,441)*2);
        for(let trunkX=0;trunkX<width;trunkX++){
          for(let i=1;i<=height;i++)putGenerated(chunk,x+trunkX,surfaceAt(x+trunkX).ground-i,M.WOOD);
        }
        const top=surface.ground-height;
        for(let oy=-8;oy<=5;oy++){
          for(let ox=-10;ox<=11;ox++){
            if(ox*ox*.48+oy*oy<=42&&randomAt(x+ox,top+oy,443)>.12){
              putGenerated(chunk,x+ox,top+oy,M.LEAF);
            }
          }
        }
        continue;
      }

      if(swampWeight>.42&&randomAt(slot,0,450)<.46*swampWeight){
        const height=6+Math.floor(randomAt(slot,1,451)*6);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
        const top=surface.ground-height;
        for(let oy=-3;oy<=2;oy++){
          for(let ox=-4;ox<=4;ox++){
            if(ox*ox*.85+oy*oy<=11&&randomAt(x+ox,top+oy,452)>.22){
              putGenerated(chunk,x+ox,top+oy,M.LEAF);
            }
          }
        }
        for(let vine=-2;vine<=2;vine+=2){
          const length=2+Math.floor(randomAt(x+vine,0,453)*5);
          for(let i=0;i<length;i++)putGenerated(chunk,x+vine,top+1+i,M.LEAF);
        }
        continue;
      }

      if(volcanoWeight>.5){
        if(randomAt(slot,0,460)<.92)continue;
        const height=3+Math.floor(randomAt(slot,1,461)*4);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
        continue;
      }

      const treeWeight=Math.max(.25,1-bambooWeight*.7-swampWeight*.35-volcanoWeight*.8);
      if(randomAt(slot,0,480)>.44*treeWeight)continue;
      const height=7+Math.floor(randomAt(slot,1,481)*7);
      for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.ground-i,M.WOOD);
      const top=surface.ground-height;

      for(let oy=-4;oy<=3;oy++){
        for(let ox=-5;ox<=5;ox++){
          if(ox*ox*.7+oy*oy<=18&&randomAt(x+ox,top+oy,482)>.18){
            putGenerated(chunk,x+ox,top+oy,M.LEAF);
          }
        }
      }

      if(snowWeight>.45){
        for(let oy=-4;oy<=0;oy++){
          for(let ox=-4;ox<=4;ox++){
            if(ox*ox*.75+oy*oy<=12&&randomAt(x+ox,top+oy,483)>.48){
              putGenerated(chunk,x+ox,top+oy,M.SNOW);
            }
          }
        }
      }
    }
  }

  function generateUndergroundMushrooms(chunk){
    const chunkTop=chunk.y*WORLD_HEIGHT;
    const chunkBottom=chunkTop+WORLD_HEIGHT;
    const first=Math.floor((chunk.x*WORLD_WIDTH-18)/8);
    const last=Math.floor((chunk.x*WORLD_WIDTH+WORLD_WIDTH+18)/8);

    for(let slot=first;slot<=last;slot++){
      const x=slot*8+2+Math.floor(randomAt(slot,12,1810)*5);
      const localX=x-chunk.x*WORLD_WIDTH;
      if(localX<0||localX>=WORLD_WIDTH)continue;

      const surface=surfaceAt(x);
      const scanStart=Math.max(chunkTop+3,surface.ground+28);
      const scanEnd=Math.min(chunkBottom-15,chunkBottom-3);

      for(let worldY=scanStart;worldY<scanEnd;worldY++){
        const localY=worldY-chunkTop;
        if(localY<1||localY>=WORLD_HEIGHT-1)continue;
        if(chunk.cells[index(localX,localY)]!==M.AIR)continue;
        if(chunk.cells[index(localX,localY+1)]!==M.MYCELIUM)continue;

        const strength=mushroomStrengthAt(x,worldY);
        if(strength<.48)continue;
        if(randomAt(x,worldY,1811)>.28*strength)continue;

        const big=randomAt(x,worldY,1812)<.2*strength;
        const height=big?
          8+Math.floor(randomAt(x,worldY,1813)*8):
          2+Math.floor(randomAt(x,worldY,1814)*4);
        const stemWidth=big&&randomAt(x,worldY,1815)>.45?2:1;

        for(let stemX=0;stemX<stemWidth;stemX++){
          for(let rise=0;rise<height;rise++){
            putGenerated(chunk,x+stemX,worldY-rise,M.MUSHROOM_STEM);
          }
        }

        const capY=worldY-height;
        const radius=big?5+Math.floor(randomAt(x,worldY,1816)*3):2;
        const verticalRadius=big?Math.max(2,Math.floor(radius*.55)):1;
        const centerX=x+(stemWidth-1)*.5;

        for(let oy=-verticalRadius;oy<=verticalRadius;oy++){
          for(let ox=-radius;ox<=radius;ox++){
            const normalized=ox*ox/(radius*radius)+oy*oy/(verticalRadius*verticalRadius||1);
            const underside=oy>0&&Math.abs(ox)>radius*.68;
            if(normalized<=1&&!underside&&randomAt(x+ox,capY+oy,1817)>.08){
              putGenerated(chunk,Math.round(centerX+ox),capY+oy,M.MUSHROOM_CAP);
            }
          }
        }

        // Keep mushrooms spaced vertically within the same scan column.
        break;
      }
    }
  }

  function generateBiomeFeatures(chunk){
    if(chunk.y!==0)return;

    const start=chunk.x*WORLD_WIDTH-40;
    const end=chunk.x*WORLD_WIDTH+WORLD_WIDTH+40;

    for(let x=start;x<end;x++){
      if(!isEarthDimension(state.world.dimension))continue;
      const surface=surfaceAt(x);
      const swampWeight=surface.mix.weight(B.SWAMP);
      if(swampWeight>.45&&surface.lake&&randomAt(x,0,610)>.93){
        const height=2+Math.floor(randomAt(x,1,611)*4);
        for(let i=1;i<=height;i++)putGenerated(chunk,x,surface.water-i,M.BAMBOO);
      }
    }
  }

  function openSpot(chunk,salt){
    for(let attempt=0;attempt<220;attempt++){
      const x=6+Math.floor(randomAt(chunk.x*71+attempt,chunk.y*43+salt,701)*(WORLD_WIDTH-12));
      const y=6+Math.floor(randomAt(chunk.x*53+salt,chunk.y*83+attempt,702)*(WORLD_HEIGHT-12));
      if(chunk.cells[index(x,y)]===M.AIR&&chunk.cells[index(x,y+2)]===M.AIR)return{x,y};
    }
    return null;
  }

  function weightedFauna(candidates,a,b,salt){
    if(candidates.length===0)return null;
    let total=0;
    for(const candidate of candidates)total+=candidate.spawnWeight??1;
    let roll=randomAt(a,b,salt)*total;
    for(const candidate of candidates){
      roll-=candidate.spawnWeight??1;
      if(roll<=0)return candidate;
    }
    return candidates[candidates.length-1];
  }

  function creatureAt(species,x,y,salt){
    return{
      speciesId:species.id,
      x:Math.round(x),
      y:Math.round(y),
      vx:0,
      vy:0,
      moveCarryX:0,
      moveCarryY:0,
      hp:species.hp,
      maxHp:species.hp,
      phase:randomAt(x,y,salt)*Math.PI*2,
      animationOffset:Math.floor(randomAt(y,x,salt+1)*240),
      facing:randomAt(x,y,salt+2)<.5?-1:1,
      hit:0,
      burning:0,
      attackCooldown:0,
      hopCooldown:20+Math.floor(randomAt(x,y,salt+3)*90),
      idleTimer:20+Math.floor(randomAt(y,x,salt+4)*120),
      startled:0,
    };
  }

  function surfaceSpawnPosition(chunk,species,slot,salt){
    const minWorldX=chunk.x*WORLD_WIDTH+5;
    const maxWorldX=(chunk.x+1)*WORLD_WIDTH-6;
    for(let attempt=0;attempt<48;attempt++){
      const gx=minWorldX+Math.floor(randomAt(chunk.x*431+slot*17+attempt,salt,7301)*(maxWorldX-minWorldX+1));
      const surface=surfaceAt(gx);
      if(!species.biomes.includes(surface.biome))continue;

      if(species.habitat==='water'){
        if(!surface.lake||surface.ground-surface.water<4)continue;
        const minY=surface.water+1;
        const maxY=surface.ground-2;
        if(maxY<minY)continue;
        const gy=minY+Math.floor(randomAt(gx,attempt,salt+1)*(maxY-minY+1));
        const localX=gx-chunk.x*WORLD_WIDTH;
        const localY=gy-chunk.y*WORLD_HEIGHT;
        if(localX<1||localX>=WORLD_WIDTH-1||localY<1||localY>=WORLD_HEIGHT-1)continue;
        if(chunk.cells[index(localX,localY)]===M.WATER)return{x:gx,y:gy};
        continue;
      }

      if(species.habitat==='air'){
        const ceiling=Math.max(5,(surface.lake?surface.water:surface.ground)-4);
        const gy=Math.max(5,ceiling-3-Math.floor(randomAt(gx,attempt,salt+2)*18));
        const localX=gx-chunk.x*WORLD_WIDTH;
        const localY=gy-chunk.y*WORLD_HEIGHT;
        if(localX<2||localX>=WORLD_WIDTH-2||localY<2||localY>=WORLD_HEIGHT-2)continue;
        if(chunk.cells[index(localX,localY)]===M.AIR&&chunk.cells[index(localX,localY+1)]===M.AIR)return{x:gx,y:gy};
        continue;
      }

      const gy=surface.ground-1;
      const localX=gx-chunk.x*WORLD_WIDTH;
      const localY=gy-chunk.y*WORLD_HEIGHT;
      if(localX<2||localX>=WORLD_WIDTH-2||localY<2||localY>=WORLD_HEIGHT-2)continue;
      const body=chunk.cells[index(localX,localY)];
      const head=chunk.cells[index(localX,localY-1)];
      const support=chunk.cells[index(localX,localY+1)];
      if(body===M.AIR&&head===M.AIR&&support!==M.AIR&&support!==M.WATER&&support!==M.LAVA)return{x:gx,y:gy};
    }
    return null;
  }

  function caveSpawnPosition(chunk,species,slot,salt){
    for(let attempt=0;attempt<120;attempt++){
      const localX=4+Math.floor(randomAt(chunk.x*613+slot*19+attempt,chunk.y*127+salt,7401)*(WORLD_WIDTH-8));
      const localY=4+Math.floor(randomAt(chunk.y*557+slot*23+attempt,chunk.x*109+salt,7402)*(WORLD_HEIGHT-8));
      const gx=chunk.x*WORLD_WIDTH+localX;
      const gy=chunk.y*WORLD_HEIGHT+localY;
      const underground=undergroundBiomeIdAt(gx,gy);
      if(!species.undergroundBiomes.includes(underground))continue;
      if(chunk.cells[index(localX,localY)]!==M.AIR)continue;

      if(species.habitat==='cave_air'){
        if(chunk.cells[index(localX,localY-1)]===M.AIR&&chunk.cells[index(localX,localY+1)]===M.AIR)return{x:gx,y:gy};
      }else{
        const support=chunk.cells[index(localX,localY+1)];
        if(support!==M.AIR&&support!==M.WATER&&support!==M.LAVA)return{x:gx,y:gy};
      }
    }
    return null;
  }

  function generateFauna(chunk){
    if(chunk.y<0)return;
    const centerX=chunk.x*WORLD_WIDTH+Math.floor(WORLD_WIDTH*.5);
    const centerY=chunk.y*WORLD_HEIGHT+Math.floor(WORLD_HEIGHT*.5);
    const surfaceChunk=chunk.y===0;
    const centerSurface=surfaceAt(centerX);
    if(!isEarthDimension(state.world.dimension))return;
    const targetCount=surfaceChunk
      ?5+Math.floor(randomAt(chunk.x,chunk.y,7501)*7)
      :4+Math.floor(randomAt(chunk.x,chunk.y,7502)*6);
    let spawned=0;

    for(let slot=0;slot<targetCount*3&&spawned<targetCount;slot++){
      const sampleX=chunk.x*WORLD_WIDTH+8+Math.floor(randomAt(chunk.x*83+slot,chunk.y,7503)*(WORLD_WIDTH-16));
      const candidates=surfaceChunk
        ?faunaForSurfaceBiome(surfaceAt(sampleX).biome)
        :faunaForUndergroundBiome(undergroundBiomeIdAt(sampleX,centerY));
      const species=weightedFauna(candidates,chunk.x*97+slot,chunk.y*131,7504);
      if(!species)continue;
      const groupSize=Math.max(1,Math.min(species.groupMax??1,
        (species.groupMin??1)+Math.floor(randomAt(slot,chunk.x+chunk.y,7505)*((species.groupMax??1)-(species.groupMin??1)+1))));

      for(let member=0;member<groupSize&&spawned<targetCount;member++){
        const position=surfaceChunk
          ?surfaceSpawnPosition(chunk,species,slot*11+member,7600+member)
          :caveSpawnPosition(chunk,species,slot*11+member,7700+member);
        if(!position)continue;
        if(chunk.enemies.some(enemy=>Math.hypot(enemy.x-position.x,enemy.y-position.y)<3))continue;
        chunk.enemies.push(creatureAt(species,position.x,position.y,7800+slot*17+member));
        spawned++;
      }
    }

    // Keep the old cave threat floor if a pathological cave generated no valid
    // habitat positions for the richer fauna table.
    if(!surfaceChunk&&chunk.enemies.length===0){
      const spot=openSpot(chunk,7991);
      if(spot){
        const gx=chunk.x*WORLD_WIDTH+spot.x;
        const gy=chunk.y*WORLD_HEIGHT+spot.y;
        const fallback=faunaForUndergroundBiome(undergroundBiomeIdAt(gx,gy))[0];
        if(fallback)chunk.enemies.push(creatureAt(fallback,gx,gy,7992));
      }
    }

    // Fully open ocean chunks should still feel alive even when the weighted
    // placement attempts hit a trench edge.
    if(surfaceChunk&&centerSurface.ocean&&chunk.enemies.length===0){
      const oceanSpecies=faunaForSurfaceBiome(B.OCEAN).filter(item=>item.habitat==='water');
      const fallback=weightedFauna(oceanSpecies,chunk.x,chunk.y,7993);
      if(fallback){
        const position=surfaceSpawnPosition(chunk,fallback,0,7994);
        if(position)chunk.enemies.push(creatureAt(fallback,position.x,position.y,7995));
      }
    }
  }


  function setGeneratedCell(chunk,gx,gy,type,{onlyAir=false}={}){
    const x=gx-chunk.x*WORLD_WIDTH;
    const y=gy-chunk.y*WORLD_HEIGHT;
    if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return;
    const i=index(x,y);
    if(onlyAir&&chunk.cells[i]!==M.AIR)return;
    chunk.cells[i]=type;
  }

  function carveGeneratedAir(chunk,gx0,gy0,gx1,gy1){
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++)for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++)setGeneratedCell(chunk,gx,gy,M.AIR);
  }

  function fillGeneratedRect(chunk,gx0,gy0,gx1,gy1,type,{onlyAir=false}={}){
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++)for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++)setGeneratedCell(chunk,gx,gy,type,{onlyAir});
  }

  function frameGeneratedRect(chunk,gx0,gy0,gx1,gy1,type){
    for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++){ setGeneratedCell(chunk,gx,Math.min(gy0,gy1),type); setGeneratedCell(chunk,gx,Math.max(gy0,gy1),type); }
    for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++){ setGeneratedCell(chunk,Math.min(gx0,gx1),gy,type); setGeneratedCell(chunk,Math.max(gx0,gx1),gy,type); }
  }

  function generateAuthoredStructures(chunk){
    const descriptors=structureDescriptorsForChunk(chunk,surfaceAt,biomeIdAt,randomAt,state.world.dimension);
    for(const descriptor of descriptors){
      applyStructureToChunk(chunk,descriptor,{
        surfaceAt,
        setCell:(gx,gy,type)=>setGeneratedCell(chunk,gx,gy,type),
        carveAir:(gx0,gy0,gx1,gy1)=>carveGeneratedAir(chunk,gx0,gy0,gx1,gy1),
        fillRect:(gx0,gy0,gx1,gy1,type)=>fillGeneratedRect(chunk,gx0,gy0,gx1,gy1,type),
        frameRect:(gx0,gy0,gx1,gy1,type)=>frameGeneratedRect(chunk,gx0,gy0,gx1,gy1,type),
      });
    }
  }

  function makeChunkCurrent(x,y){
    const chunk={
      x,
      y,
      dimension:state.world.dimension??DimensionId.EARTH,
      cells:new Uint8Array(CHUNK_CELL_COUNT),
      shade:new Uint8Array(CHUNK_CELL_COUNT),
      life:new Uint8Array(CHUNK_CELL_COUNT),
      moved:new Uint16Array(CHUNK_CELL_COUNT),
      age:new Uint16Array(CHUNK_CELL_COUNT),
      cropId:new Uint8Array(CHUNK_CELL_COUNT),
      plantId:new Uint32Array(CHUNK_CELL_COUNT),
      enemies:[],
    };

    const worldLeft=x*WORLD_WIDTH;
    const worldTop=y*WORLD_HEIGHT;
    const earthDimension=isEarthDimension(state.world.dimension);
    const caveWidth=WORLD_WIDTH+2;
    const caveHeight=WORLD_HEIGHT+1;
    const caveCache=new Uint8Array(caveWidth*caveHeight);
    for(let cacheY=-1;cacheY<WORLD_HEIGHT;cacheY++){
      const gy=worldTop+cacheY;
      for(let cacheX=-1;cacheX<=WORLD_WIDTH;cacheX++){
        const gx=worldLeft+cacheX;
        caveCache[(cacheX+1)+(cacheY+1)*caveWidth]=earthDimension?(caveAirAt(gx,gy,surfaceAt(gx))?1:0):0;
      }
    }
    const mushroomCache=new Float32Array(CHUNK_CELL_COUNT);
    mushroomCache.fill(-1);
    const generationCache={
      caveAt(gx,gy,surface){
        const localX=gx-worldLeft;
        const localY=gy-worldTop;
        if(localX>=-1&&localX<=WORLD_WIDTH&&localY>=-1&&localY<WORLD_HEIGHT){
          return caveCache[(localX+1)+(localY+1)*caveWidth]===1;
        }
        return caveAirAt(gx,gy,surface);
      },
      mushroomAt(gx,gy){
        const localX=gx-worldLeft;
        const localY=gy-worldTop;
        if(localX<0||localX>=WORLD_WIDTH||localY<0||localY>=WORLD_HEIGHT)return mushroomStrengthAt(gx,gy);
        const cacheIndex=index(localX,localY);
        const cached=mushroomCache[cacheIndex];
        if(cached>=0)return cached;
        const value=mushroomStrengthAt(gx,gy);
        mushroomCache[cacheIndex]=value;
        return value;
      },
    };

    for(let py=0;py<WORLD_HEIGHT;py++){
      for(let px=0;px<WORLD_WIDTH;px++){
        const gx=worldLeft+px;
        const gy=worldTop+py;
        const i=index(px,py);
        chunk.cells[i]=generatedMaterial(gx,gy,generationCache);
        chunk.shade[i]=Math.floor(randomAt(gx,gy,1337)*25);
      }
    }

    if(earthDimension){
      generateVegetation(chunk);
      generateBiomeFeatures(chunk);
      generateUndergroundMushrooms(chunk);
    }
    generateAuthoredStructures(chunk);

    if(y>0&&earthDimension){
      for(let i=0;i<5;i++){
        const spot=openSpot(chunk,i+20);
        if(spot&&chunk.cells[index(spot.x,spot.y+3)]===M.ROCK){
          chunk.cells[index(spot.x,spot.y+3)]=M.CRYSTAL;
        }
      }
    }

    if(earthDimension)generateFauna(chunk);

    return chunk;
  }

  function makeChunk(x,y,dimension=state.world.dimension??DimensionId.EARTH){
    const previous=state.world.dimension??DimensionId.EARTH;
    if(previous===dimension)return makeChunkCurrent(x,y);
    state.world.dimension=dimension;
    try{return makeChunkCurrent(x,y);}
    finally{state.world.dimension=previous;}
  }

  function biomeNameAt(x,y=null){
    if(!isEarthDimension(state.world.dimension))return dimensionName(state.world.dimension).toLowerCase().replaceAll(' ','_');
    if(Number.isFinite(y)&&undergroundBiomeIdAt(x,y)===U.MUSHROOM_CAVERNS){
      return undergroundBiomeName(U.MUSHROOM_CAVERNS);
    }
    return biomeName(biomeMixAt(x).dominant);
  }

  return {
    biomeIdAt,
    biomeMixAt,
    skyAt,
    surfaceAt,
    generatedMaterial,
    makeChunk,
    biomeNameAt,
    regionBiomeId,
    mushroomStrengthAt,
    undergroundBiomeIdAt,
    volcanoDescriptor,
    volcanoFeatureAt,
    oceanDescriptor,
    rocketSiloDescriptor:()=>rocketSiloDescriptor(surfaceAt,randomAt),
    dimensionSpawnPoint(dimension){
      const previous=state.world.dimension;
      state.world.dimension=dimension;
      try{
        const x=dimensionDefinition(dimension).spawnX??48;
        const surface=surfaceAt(x);
        return {x,y:surface.ground-1};
      }finally{state.world.dimension=previous;}
    },
    moonSpawnPoint(){ return this.dimensionSpawnPoint(DimensionId.MOON); },
    dimensionGravityScale:()=>dimensionDefinition(state.world.dimension).gravity??1,
    isMoonWorld:()=>isMoonDimension(state.world.dimension),
    isEarthWorld:()=>isEarthDimension(state.world.dimension),
  };
}
