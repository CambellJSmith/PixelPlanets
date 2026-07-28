import { MaterialId, POWDER_MATERIALS, FLAMMABLE_MATERIALS, GAS_MATERIALS } from '../data/materials.db.js';
import { WORLD_WIDTH, WORLD_HEIGHT, DIRT_GRASS_CONFIG, STEAM_CONFIG, NAPALM_CONFIG, WEATHER_CONFIG } from '../config.js';

export function createMaterialSystem(state,cells,noise,weatherSystem=null){
  const M=MaterialId;
  const STUCK_NAPALM_LIFE=1;

  function driftGasWithWind(x,y){
    const wind=weatherSystem?.windX?.()??0;
    if(Math.abs(wind)<.12)return false;
    const direction=Math.sign(wind);
    const chance=Math.min(.92,Math.abs(wind)*WEATHER_CONFIG.windGasChance);
    if(noise.randomAt(x,y,state.frame+699)>chance)return false;
    const target=cells.getCell(x+direction,y);
    if(target===M.AIR){
      cells.swapCells(x,y,x+direction,y);
      return true;
    }
    return false;
  }

  function touchesHeat(x,y){
    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const type=cells.getCell(x+offsetX,y+offsetY);
      if(type===M.FIRE||type===M.LAVA)return true;
    }
    return false;
  }

  function touchesSolid(x,y){
    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(cells.isSolid(cells.getCell(x+offsetX,y+offsetY)))return true;
    }
    return false;
  }

  function updateFire(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,noise.randomAt(x,y,state.frame+700)<.72?M.SMOKE:M.AIR,25);
      return;
    }

    cells.setLife(x,y,life-1);

    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nextX=x+offsetX;
      const nextY=y+offsetY;
      const type=cells.getCell(nextX,nextY);

      if(type===M.SNOW){
        cells.setCell(nextX,nextY,M.WATER);
      }else if(type===M.WATER){
        cells.setCell(nextX,nextY,M.STEAM,STEAM_CONFIG.lifeFrames);
      }else if(type===M.NAPALM){
        cells.setCell(nextX,nextY,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      }else if(FLAMMABLE_MATERIALS.has(type)&&noise.randomAt(nextX,nextY,state.frame)<.07){
        cells.setCell(nextX,nextY,M.FIRE,type===M.LEAF?55:80);
      }
    }

    if(cells.getCell(x,y-1)===M.AIR&&noise.randomAt(x,y,state.frame+4)<.58){
      cells.swapCells(x,y,x,y-1);
      return;
    }

    const direction=noise.randomAt(x,y,state.frame+5)<.5?-1:1;
    if(cells.getCell(x+direction,y-1)===M.AIR&&noise.randomAt(x,y,state.frame+6)<.45){
      cells.swapCells(x,y,x+direction,y-1);
    }
  }

  function updateSmoke(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,M.AIR);
      return;
    }

    cells.setLife(x,y,life-1);
    if(driftGasWithWind(x,y))return;
    const direction=noise.randomAt(x,y,state.frame+720)<.5?-1:1;

    if(cells.getCell(x,y-1)===M.AIR)cells.swapCells(x,y,x,y-1);
    else if(cells.getCell(x+direction,y-1)===M.AIR)cells.swapCells(x,y,x+direction,y-1);
    else if(cells.getCell(x+direction,y)===M.AIR&&noise.randomAt(x,y,state.frame+721)<.22){
      cells.swapCells(x,y,x+direction,y);
    }
  }

  function updateSteam(x,y){
    const life=cells.getLife(x,y);
    if(life<=1){
      cells.setCell(x,y,M.AIR);
      return;
    }

    cells.setLife(x,y,life-1);
    if(driftGasWithWind(x,y))return;
    const direction=noise.randomAt(x,y,state.frame+760)<.5?-1:1;
    const destinations=[
      [x,y-1],
      [x+direction,y-1],
      [x-direction,y-1],
      [x+direction,y],
    ];

    for(const [nextX,nextY] of destinations){
      const type=cells.getCell(nextX,nextY);
      if(type===M.AIR||type===M.SMOKE){
        cells.swapCells(x,y,nextX,nextY);
        return;
      }
    }
  }

  function updateNapalm(x,y){
    // Fire and lava override the timer: touching either ignites this pixel now.
    if(touchesHeat(x,y)){
      cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }

    const age=cells.getAge(x,y)+NAPALM_CONFIG.simulationStepFrames;
    if(age>=NAPALM_CONFIG.ignitionFrames){
      cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }

    cells.setAge(x,y,age);

    // A napalm pixel adheres as soon as it touches any solid surface. The life
    // channel is otherwise unused by napalm, so it acts as a compact stuck flag.
    if(cells.getLife(x,y)===STUCK_NAPALM_LIFE||touchesSolid(x,y)){
      cells.setLife(x,y,STUCK_NAPALM_LIFE);
      return;
    }

    const position=updateLiquid(x,y,M.NAPALM);
    if(touchesHeat(position.x,position.y)){
      cells.setCell(position.x,position.y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      return;
    }
    if(touchesSolid(position.x,position.y))cells.setLife(position.x,position.y,STUCK_NAPALM_LIFE);
  }

  function updatePowder(x,y,type){
    const below=cells.getCell(x,y+1);
    if(below===M.AIR||below===M.WATER||below===M.NAPALM){
      cells.swapCells(x,y,x,y+1);
      return;
    }

    const direction=noise.randomAt(x,y,state.frame)<.5?-1:1;
    const diagonal=cells.getCell(x+direction,y+1);
    if(diagonal===M.AIR||diagonal===M.WATER||diagonal===M.NAPALM){
      cells.swapCells(x,y,x+direction,y+1);
      return;
    }

    if(type===M.MUD&&state.frame%4===0&&cells.getCell(x+direction,y)===M.AIR){
      cells.swapCells(x,y,x+direction,y);
    }
  }

  function updateDirt(x,y){
    if(cells.getCell(x,y-1)!==M.AIR){
      if(cells.getAge(x,y)!==0)cells.setAge(x,y,0);
      return;
    }

    const age=cells.getAge(x,y)+DIRT_GRASS_CONFIG.updateStepFrames;
    if(age>=DIRT_GRASS_CONFIG.exposedFrames){
      cells.setCell(x,y,M.GRASS);
      return;
    }
    cells.setAge(x,y,age);
  }

  function moveLiquidInto(x,y,targetX,targetY){
    const targetType=cells.getCell(targetX,targetY);

    if(targetType===M.AIR){
      cells.swapCells(x,y,targetX,targetY);
      return {x:targetX,y:targetY};
    }

    if(!GAS_MATERIALS.has(targetType))return null;

    // Liquids never treat smoke or steam as a wall. Prefer pushing the gas
    // one cell farther down; if that space is occupied, swap positions so
    // the liquid still displaces it instead of being blocked.
    if(cells.getCell(targetX,targetY+1)===M.AIR){
      cells.swapCells(targetX,targetY,targetX,targetY+1);
      cells.swapCells(x,y,targetX,targetY);
    }else{
      cells.swapCells(x,y,targetX,targetY);
    }

    return {x:targetX,y:targetY};
  }

  function updateLiquid(x,y,type){
    let position=moveLiquidInto(x,y,x,y+1);

    if(!position){
      const direction=noise.randomAt(x,y,state.frame+44)<.5?-1:1;
      position=moveLiquidInto(x,y,x+direction,y)
        ||moveLiquidInto(x,y,x-direction,y)
        ||{x,y};
    }

    if(type!==M.LAVA)return position;

    for(const [offsetX,offsetY] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nextX=position.x+offsetX;
      const nextY=position.y+offsetY;
      const neighbor=cells.getCell(nextX,nextY);

      if(neighbor===M.WATER){
        cells.setCell(position.x,position.y,M.ROCK);
        cells.setCell(nextX,nextY,M.STEAM,STEAM_CONFIG.lifeFrames);
        break;
      }

      if(neighbor===M.NAPALM){
        cells.setCell(nextX,nextY,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
      }else if(FLAMMABLE_MATERIALS.has(neighbor)){
        cells.setCell(nextX,nextY,M.FIRE,65);
      }
    }

    return position;
  }

  let lastProcessedCount=0;

  function compactActiveQueue(chunk){
    const next=[];
    chunk.activeMaterialQueued.fill(0);
    for(const index of chunk.activeMaterialQueue){
      if(!chunk.activeMaterialFlags[index]||chunk.activeMaterialQueued[index])continue;
      chunk.activeMaterialQueued[index]=1;
      next.push(index);
    }
    chunk.activeMaterialQueue=next;
  }

  function update(){
    state.world.simulationStamp++;
    if(state.world.simulationStamp>=65535){
      state.world.simulationStamp=1;
      for(const chunk of state.world.activeChunks)chunk.moved.fill(0);
    }

    const stamp=state.world.simulationStamp;
    const camera=state.world.camera;
    const chunk=state.world.activeChunks.find(item=>item.x===camera.chunkX&&item.y===camera.chunkY)??null;
    if(!chunk){ lastProcessedCount=0; return; }
    cells.initializeChunkTracking(chunk);

    // Only the visible chunk is simulated. The 3x3 neighborhood remains loaded
    // for collision, generation, and seamless crossing, but off-screen liquids
    // and powders sleep until their chunk becomes visible.
    const queue=chunk.activeMaterialQueue;
    const initialLength=queue.length;
    const reverse=state.frame%4>=2;
    let processed=0;

    for(let pass=0;pass<initialLength;pass++){
      const queueIndex=reverse?initialLength-1-pass:pass;
      const index=queue[queueIndex];
      if(!chunk.activeMaterialFlags[index]||chunk.moved[index]===stamp)continue;

      const x=index%WORLD_WIDTH;
      const y=Math.floor(index/WORLD_WIDTH);
      const type=chunk.cells[index];
      const worldX=chunk.x*WORLD_WIDTH+x;
      const worldY=chunk.y*WORLD_HEIGHT+y;
      processed++;

      if(type===M.DIRT)updateDirt(worldX,worldY);
      else if(type===M.FIRE)updateFire(worldX,worldY);
      else if(type===M.SMOKE)updateSmoke(worldX,worldY);
      else if(type===M.STEAM)updateSteam(worldX,worldY);
      else if(type===M.NAPALM)updateNapalm(worldX,worldY);
      else if(POWDER_MATERIALS.has(type))updatePowder(worldX,worldY,type);
      else if(type===M.WATER||type===M.LAVA)updateLiquid(worldX,worldY,type);
    }

    lastProcessedCount=processed;
    if(state.frame%240===0||queue.length>Math.max(2048,chunk.activeMaterialCount*2+512)){
      compactActiveQueue(chunk);
    }
  }

  function getLastProcessedCount(){ return lastProcessedCount; }

  return { update, updateDirt, updateFire, updateSteam, getLastProcessedCount };
}
