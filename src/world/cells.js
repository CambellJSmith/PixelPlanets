import { MATERIAL_DB, MaterialId } from '../data/materials.db.js';
import { playerOccupiesPixel } from '../player-geometry.js';

export function createCellAccess(state,chunks,noise){
  const M=MaterialId;
  const changeListeners=new Set();
  const trackedMaterialTypes=new Set(MATERIAL_DB.filter(item=>item.dynamic).map(item=>item.id));
  trackedMaterialTypes.add(M.DIRT);

  function ensureChunkTracking(chunk){
    if(!chunk.activeMaterialFlags){
      chunk.activeMaterialFlags=new Uint8Array(chunk.cells.length);
      chunk.activeMaterialQueued=new Uint8Array(chunk.cells.length);
      chunk.activeMaterialQueue=[];
      chunk.activeMaterialCount=0;
      chunk.activeMaterialInitialized=false;
    }
    if(!chunk.renderDirtyFlags){
      chunk.renderDirtyFlags=new Uint8Array(chunk.cells.length);
      chunk.renderDirtyQueue=[];
      chunk.renderAllDirty=true;
    }
    if(!chunk.saveDirtyIndices)chunk.saveDirtyIndices=new Set();
    return chunk;
  }

  function initializeChunkTracking(chunk){
    ensureChunkTracking(chunk);
    if(chunk.activeMaterialInitialized)return chunk;
    chunk.activeMaterialQueue.length=0;
    chunk.activeMaterialFlags.fill(0);
    chunk.activeMaterialQueued.fill(0);
    chunk.activeMaterialCount=0;
    for(let index=0;index<chunk.cells.length;index++){
      if(!trackedMaterialTypes.has(chunk.cells[index]))continue;
      chunk.activeMaterialFlags[index]=1;
      chunk.activeMaterialQueued[index]=1;
      chunk.activeMaterialQueue.push(index);
      chunk.activeMaterialCount++;
    }
    chunk.activeMaterialInitialized=true;
    return chunk;
  }

  function refreshMaterialTracking(chunk,index){
    initializeChunkTracking(chunk);
    const shouldTrack=trackedMaterialTypes.has(chunk.cells[index]);
    const tracked=chunk.activeMaterialFlags[index]===1;
    if(shouldTrack===tracked)return;
    chunk.activeMaterialFlags[index]=shouldTrack?1:0;
    chunk.activeMaterialCount+=shouldTrack?1:-1;
    if(shouldTrack&&!chunk.activeMaterialQueued[index]){
      chunk.activeMaterialQueued[index]=1;
      chunk.activeMaterialQueue.push(index);
    }
  }

  function markSaveDirty(chunk,index){
    ensureChunkTracking(chunk);
    chunk.saveDirtyIndices.add(index);
  }

  function markRenderDirty(chunk,index){
    ensureChunkTracking(chunk);
    if(chunk.renderDirtyFlags[index])return;
    chunk.renderDirtyFlags[index]=1;
    chunk.renderDirtyQueue.push(index);
  }

  function playerOccupiesCell(x,y){
    const player=state.player;
    if(!player)return false;
    return playerOccupiesPixel(
      Math.floor(x),
      Math.floor(y),
      player.x,
      player.y,
      player.width,
      player.height,
    );
  }

  function cellRef(x,y){
    const chunkX=chunks.chunkX(x);
    const chunkY=chunks.chunkY(y);
    const chunk=chunks.getChunk(chunkX,chunkY,false);
    if(!chunk||!state.world.activeKeys.has(chunks.key(chunkX,chunkY)))return null;
    return {
      chunk,
      index:chunks.index(chunks.localX(x),chunks.localY(y)),
    };
  }

  function getCell(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.cells[ref.index]:M.ROCK;
  }

  function getLife(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.life[ref.index]:0;
  }

  function getCropId(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.cropId?.[ref.index]??0:0;
  }

  function getPlantId(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.plantId?.[ref.index]??0:0;
  }

  function emitChange(event){
    if(event.silent)return;
    for(const listener of changeListeners)listener(event);
  }

  function setCell(x,y,type,life=0,metadata=null){
    const ref=cellRef(x,y);
    if(!ref)return false;

    const options=metadata&&typeof metadata==='object'?metadata:{};
    const oldType=ref.chunk.cells[ref.index];
    const oldCropId=ref.chunk.cropId?.[ref.index]??0;
    const oldPlantId=ref.chunk.plantId?.[ref.index]??0;
    const newCropId=options.cropId??0;
    const newPlantId=options.plantId??0;

    // No simulation or construction system may introduce a new solid pixel
    // inside the visible player footprint. This covers growing crops, falling
    // powder, boss-created terrain, lava cooling, and future cell writers.
    const introducesSolid=(MATERIAL_DB[type]?.solid??true)&&!(MATERIAL_DB[oldType]?.solid??true);
    if(introducesSolid&&playerOccupiesCell(x,y)&&!options.allowPlayerOverlap)return false;

    ref.chunk.cells[ref.index]=type;
    ref.chunk.life[ref.index]=life;
    ref.chunk.age[ref.index]=0;
    if(ref.chunk.cropId)ref.chunk.cropId[ref.index]=newCropId;
    if(ref.chunk.plantId)ref.chunk.plantId[ref.index]=newPlantId;
    ref.chunk.shade[ref.index]=Math.floor(noise.randomAt(x,y,state.frame+97)*25);
    refreshMaterialTracking(ref.chunk,ref.index);
    markRenderDirty(ref.chunk,ref.index);
    markSaveDirty(ref.chunk,ref.index);

    if(oldType!==type||oldCropId!==newCropId||oldPlantId!==newPlantId){
      emitChange({
        x,
        y,
        oldType,
        newType:type,
        oldCropId,
        newCropId,
        oldPlantId,
        newPlantId,
        reason:options.reason??'simulation',
        silent:Boolean(options.silent),
      });
    }
    return true;
  }

  function setPlantCell(x,y,type,cropId,plantId,options=null){
    return setCell(x,y,type,0,{
      cropId,
      plantId,
      silent:Boolean(options?.silent),
      reason:options?.reason??'plant-growth',
    });
  }

  function getAge(x,y){
    const ref=cellRef(x,y);
    return ref?ref.chunk.age[ref.index]:0;
  }

  function setAge(x,y,age){
    const ref=cellRef(x,y);
    if(!ref)return false;
    ref.chunk.age[ref.index]=Math.max(0,Math.min(65535,age));
    markSaveDirty(ref.chunk,ref.index);
    return true;
  }

  function setLife(x,y,life){
    const ref=cellRef(x,y);
    if(!ref)return false;
    ref.chunk.life[ref.index]=life;
    markRenderDirty(ref.chunk,ref.index);
    markSaveDirty(ref.chunk,ref.index);
    return true;
  }

  function swapCells(ax,ay,bx,by){
    const a=cellRef(ax,ay);
    const b=cellRef(bx,by);
    if(!a||!b)return false;

    const type=a.chunk.cells[a.index];
    const shade=a.chunk.shade[a.index];
    const life=a.chunk.life[a.index];
    const age=a.chunk.age[a.index];
    const cropId=a.chunk.cropId?.[a.index]??0;
    const plantId=a.chunk.plantId?.[a.index]??0;
    const otherType=b.chunk.cells[b.index];

    // Dynamic solids cannot swap into the player's sprite. Non-solid liquids
    // and gases may still move through those cells normally.
    if((MATERIAL_DB[type]?.solid??true)&&playerOccupiesCell(bx,by))return false;
    if((MATERIAL_DB[otherType]?.solid??true)&&playerOccupiesCell(ax,ay))return false;

    a.chunk.cells[a.index]=otherType;
    a.chunk.shade[a.index]=b.chunk.shade[b.index];
    a.chunk.life[a.index]=b.chunk.life[b.index];
    a.chunk.age[a.index]=b.chunk.age[b.index];
    if(a.chunk.cropId)a.chunk.cropId[a.index]=b.chunk.cropId?.[b.index]??0;
    if(a.chunk.plantId)a.chunk.plantId[a.index]=b.chunk.plantId?.[b.index]??0;

    b.chunk.cells[b.index]=type;
    b.chunk.shade[b.index]=shade;
    b.chunk.life[b.index]=life;
    b.chunk.age[b.index]=age;
    if(b.chunk.cropId)b.chunk.cropId[b.index]=cropId;
    if(b.chunk.plantId)b.chunk.plantId[b.index]=plantId;
    b.chunk.moved[b.index]=state.world.simulationStamp;
    refreshMaterialTracking(a.chunk,a.index);
    refreshMaterialTracking(b.chunk,b.index);
    markRenderDirty(a.chunk,a.index);
    markRenderDirty(b.chunk,b.index);
    markSaveDirty(a.chunk,a.index);
    markSaveDirty(b.chunk,b.index);
    return true;
  }

  function isSolid(type){
    return MATERIAL_DB[type]?.solid??true;
  }

  function isAir(x,y){
    return getCell(x,y)===M.AIR;
  }

  function onChange(listener){
    changeListeners.add(listener);
    return()=>changeListeners.delete(listener);
  }

  return {
    cellRef,
    getCell,
    getLife,
    getCropId,
    getPlantId,
    getAge,
    setAge,
    setCell,
    setPlantCell,
    setLife,
    swapCells,
    isSolid,
    isAir,
    onChange,
    ensureChunkTracking,
    initializeChunkTracking,
    refreshMaterialTracking,
    markRenderDirty,
    markSaveDirty,
  };
}
