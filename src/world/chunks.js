import { WORLD_WIDTH, WORLD_HEIGHT, ACTIVE_RADIUS } from '../config.js';

export function createChunkManager(state,generator){
  const store=state.world;

  const key=(x,y,dimension=store.dimension??'earth')=>`${dimension}:${x},${y}`;
  const chunkX=x=>Math.floor(x/WORLD_WIDTH);
  const chunkY=y=>Math.floor(y/WORLD_HEIGHT);
  const localX=x=>((Math.floor(x)%WORLD_WIDTH)+WORLD_WIDTH)%WORLD_WIDTH;
  const localY=y=>((Math.floor(y)%WORLD_HEIGHT)+WORLD_HEIGHT)%WORLD_HEIGHT;
  const index=(x,y)=>x+y*WORLD_WIDTH;

  function getChunk(x,y,create=true,dimension=store.dimension??'earth'){
    const chunkKey=key(x,y,dimension);
    if(!store.chunks.has(chunkKey)&&create){
      store.chunks.set(chunkKey,generator.makeChunk(x,y,dimension));
    }
    return store.chunks.get(chunkKey)??null;
  }

  function updateActiveNeighborhood(){
    store.camera.chunkX=chunkX(state.player.x);
    store.camera.chunkY=chunkY(state.player.y);
    store.activeChunks.length=0;
    store.activeKeys.clear();

    for(let offsetY=-ACTIVE_RADIUS;offsetY<=ACTIVE_RADIUS;offsetY++){
      for(let offsetX=-ACTIVE_RADIUS;offsetX<=ACTIVE_RADIUS;offsetX++){
        const chunk=getChunk(store.camera.chunkX+offsetX,store.camera.chunkY+offsetY,true,store.dimension);
        store.activeChunks.push(chunk);
        store.activeKeys.add(key(chunk.x,chunk.y,store.dimension));
      }
    }
  }

  function isActiveWorldPosition(x,y){
    return store.activeKeys.has(key(chunkX(x),chunkY(y),store.dimension));
  }

  return {
    key,
    chunkX,
    chunkY,
    localX,
    localY,
    index,
    getChunk,
    updateActiveNeighborhood,
    isActiveWorldPosition,
  };
}
