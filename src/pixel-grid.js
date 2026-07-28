const motionCarry=new WeakMap();

export const POSITION_KEYS=Object.freeze(['x','y']);
export const STORED_COORDINATE_KEYS=Object.freeze([
  'x','y',
  'targetX','targetY',
  'homeX','homeY',
  'groundY','waterY',
  'entryX','entryY','exitX','exitY',
  'pointerX','pointerY',
  'beamX','beamY',
  'impactX','impactY',
  'sourceX','sourceY',
  'anchorX','anchorY',
  'baseX','baseY',
]);

export function nearestPixel(value){
  const number=Number(value);
  return Number.isFinite(number)?Math.round(number):0;
}

export function placeOnPixel(object,x=object?.x??0,y=object?.y??0){
  if(!object||typeof object!=='object')return object;
  object.x=nearestPixel(x);
  object.y=nearestPixel(y);
  motionCarry.delete(object);
  return object;
}

export function snapPixelPosition(object){
  if(!object||typeof object!=='object')return object;
  const previous=motionCarry.get(object)??{x:0,y:0};
  const rawX=Number.isFinite(Number(object.x))?Number(object.x):0;
  const rawY=Number.isFinite(Number(object.y))?Number(object.y):0;
  const combinedX=rawX+previous.x;
  const combinedY=rawY+previous.y;
  const snappedX=Math.round(combinedX);
  const snappedY=Math.round(combinedY);
  motionCarry.set(object,{
    x:combinedX-snappedX,
    y:combinedY-snappedY,
  });
  object.x=snappedX;
  object.y=snappedY;
  return object;
}

export function snapStoredCoordinates(object,keys=STORED_COORDINATE_KEYS){
  if(!object||typeof object!=='object')return object;
  for(const key of keys){
    if(Number.isFinite(Number(object[key])))object[key]=nearestPixel(object[key]);
  }
  return object;
}

function snapPositionArray(array){
  if(!Array.isArray(array))return;
  for(const item of array){
    snapPixelPosition(item);
    snapStoredCoordinates(item,STORED_COORDINATE_KEYS.filter(key=>key!=='x'&&key!=='y'));
  }
}

export function snapGamePositions(state){
  if(!state)return;
  snapPixelPosition(state.player);
  snapStoredCoordinates(state.input,['pointerX','pointerY']);
  snapStoredCoordinates(state.toolEffect,['x','y']);

  const entities=state.entities??{};
  snapPixelPosition(entities.hook);
  for(const key of [
    'bullets',
    'napalmShots',
    'glaives',
    'grenades',
    'drones',
    'droneRockets',
    'bosses',
    'bossFireballs',
    'serpentProjectiles',
    'bossProjectiles',
    'explosions',
    'seedParticles',
    'pickups',
    'laserSparks',
    'nyanCats',
    'nyanSparks',
    'realitySparks',
    'enemyNests',
    'invasionPortals',
    'furniture',
    'juiceParticles',
    'damageNumbers',
    'juiceFlashes',
    'juiceShockwaves',
  ])snapPositionArray(entities[key]);

  for(const chunk of state.world?.activeChunks??[]){
    snapPositionArray(chunk.enemies);
  }

  snapPositionArray(state.weather?.flashes);
}

function objectHasFractionalCoordinate(object,keys=STORED_COORDINATE_KEYS){
  if(!object||typeof object!=='object')return false;
  return keys.some(key=>Number.isFinite(Number(object[key]))&&!Number.isInteger(Number(object[key])));
}

export function listFractionalPositions(state){
  const failures=[];
  const inspect=(label,object,keys=STORED_COORDINATE_KEYS)=>{
    if(!object||typeof object!=='object')return;
    for(const key of keys){
      const value=Number(object[key]);
      if(Number.isFinite(value)&&!Number.isInteger(value))failures.push(`${label}.${key}=${value}`);
    }
  };

  inspect('player',state?.player);
  inspect('input',state?.input,['pointerX','pointerY']);
  inspect('toolEffect',state?.toolEffect,['x','y']);
  const entities=state?.entities??{};
  inspect('hook',entities.hook);
  for(const key of [
    'bullets','napalmShots','glaives','grenades','drones','droneRockets',
    'bosses','bossFireballs','serpentProjectiles','bossProjectiles','explosions',
    'seedParticles','pickups','laserSparks','nyanCats','nyanSparks','realitySparks',
    'enemyNests','invasionPortals','furniture','juiceParticles','damageNumbers','juiceFlashes','juiceShockwaves',
  ]){
    for(let index=0;index<(entities[key]?.length??0);index++)inspect(`${key}[${index}]`,entities[key][index]);
  }
  for(let index=0;index<(state?.weather?.flashes?.length??0);index++)inspect(`weather.flashes[${index}]`,state.weather.flashes[index]);
  for(const [chunkKey,chunk] of state?.world?.chunks?.entries?.()??[]){
    for(let index=0;index<(chunk.enemies?.length??0);index++)inspect(`chunk(${chunkKey}).enemies[${index}]`,chunk.enemies[index]);
  }
  for(const [plantId,plant] of state?.world?.plants?.entries?.()??[]){
    inspect(`plant(${plantId})`,plant,['baseX','baseY']);
    for(let index=0;index<(plant.cells?.length??0);index++)inspect(`plant(${plantId}).cells[${index}]`,plant.cells[index],['x','y']);
  }
  return failures;
}

export function positionsAreInteger(state){
  return listFractionalPositions(state).length===0;
}
