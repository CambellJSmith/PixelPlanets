import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  GRENADE_CONFIG,
  DRONE_STRIKE_CONFIG,
  BUILD_CONFIG,
  GLAIVE_CONFIG,
  LASER_RIFLE_CONFIG,
  NYAN_CAT_CONFIG,
  REALITY_ZIPPER_CONFIG,
} from '../config.js';
import {
  MaterialId,
  COLLECTABLE_MATERIALS,
  PLACEABLE_MATERIALS,
  CROP_MATERIALS,
  LIQUID_MATERIALS,
  FLAMMABLE_MATERIALS,
  materialName,
} from '../data/materials.db.js';
import { WeaponId, WEAPON_DB } from '../data/weapons.db.js';
import { cropById } from '../data/crops.db.js';
import { faunaById } from '../data/fauna.db.js';
import { playerOccupiesPixel } from '../player-geometry.js';
import { nearestPixel, snapPixelPosition } from '../pixel-grid.js';

const DESTRUCULATOR_RANGE=18;


export function createWeaponSystem(state,cells,chunks,noise,hud,crops,juice=null,furniture=null){
  const M=MaterialId;
  const W=WeaponId;
  const laserCellHeat=new Map();

  function damageBossesAt(x,y,radius,damage,impulseX=0,impulseY=0){
    let hit=false;
    for(const boss of state.entities.bosses){
      const halfWidth=(boss.width??17)*.5;
      const halfHeight=(boss.height??11)*.5;
      if(Math.abs(boss.x-x)>halfWidth+radius||Math.abs(boss.y-y)>halfHeight+radius)continue;
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,8);
      boss.vx=(boss.vx??0)+impulseX;
      boss.vy=(boss.vy??0)+impulseY;
      hit=true;
    }
    return hit;
  }

  function damageBossesInSwordArc(direction,damage){
    for(const boss of state.entities.bosses){
      const dx=boss.x-state.player.x;
      const dy=boss.y-(state.player.y-2);
      const distance=Math.hypot(dx,dy);
      let difference=Math.atan2(dy,dx)-direction.angle;
      while(difference>Math.PI)difference-=Math.PI*2;
      while(difference<-Math.PI)difference+=Math.PI*2;

      if(distance<15&&Math.abs(difference)<1.1){
        boss.hp-=damage;
        boss.hit=Math.max(boss.hit??0,8);
        boss.vx=(boss.vx??0)+Math.cos(direction.angle)*.55;
        boss.vy=(boss.vy??0)+Math.sin(direction.angle)*.55;
      }
    }
  }

  function aim(){
    const camera=state.world.camera;
    const targetX=camera.chunkX*WORLD_WIDTH+state.input.pointerX;
    const targetY=camera.chunkY*WORLD_HEIGHT+state.input.pointerY;
    const dx=targetX-state.player.x;
    const dy=targetY-(state.player.y-2);
    const distance=Math.hypot(dx,dy)||1;
    return {
      x:dx/distance,
      y:dy/distance,
      angle:Math.atan2(dy,dx),
      distance,
      targetX,
      targetY,
    };
  }

  function exitBuildMode(showMessage=false){
    const hadHand=state.build.active||state.seedMode.active||
      Number.isInteger(state.build.equippedMaterial)||Boolean(state.build.equippedFurnitureId)||Number.isInteger(state.seedMode.cropId);
    if(!hadHand)return;
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.cooldown=0;
    if(showMessage)hud.showMessage('Hand emptied',800);
    hud.update();
  }

  function weaponIsStolen(weaponId){ return Number.isInteger(state.player.stolenWeaponId)&&state.player.stolenWeaponId===weaponId; }

  function cycleWeapon(){
    if(state.build.active||state.seedMode.active)exitBuildMode(false);
    for(let offset=1;offset<=WEAPON_DB.length;offset++){
      const candidate=(state.weaponId+offset)%WEAPON_DB.length;
      if(!weaponIsStolen(candidate)){ state.weaponId=candidate; break; }
    }
    state.entities.hook.active=false;
    state.laser.active=false;
    state.laser.beam=null;
    state.cooldown=0;
    hud.update();
  }

  function equipMaterial(materialId){
    const id=Number(materialId);
    if(!Number.isInteger(id)||!PLACEABLE_MATERIALS.has(id)){
      hud.showMessage('That inventory item is not a placeable block');
      return false;
    }
    if(state.inventory.counts[id]<=0){
      hud.showMessage(`${materialName(id)} is empty`);
      return false;
    }

    state.entities.hook.active=false;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.build.active=true;
    state.build.equippedMaterial=id;
    state.build.equippedFurnitureId=null;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${materialName(id)} equipped · build mode`,900);
    return true;
  }

  function equipFurniture(furnitureId){
    const id=String(furnitureId??'');
    const definition=furniture?.definitions?.find(item=>item.id===id);
    if(!definition){ hud.showMessage('Unknown furnishing'); return false; }
    if(state.inventory.furnitureCount(id)<=0){ hud.showMessage(`${definition.name} is empty`); return false; }
    state.entities.hook.active=false;
    state.seedMode.active=false;
    state.seedMode.cropId=null;
    state.build.active=true;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=id;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${definition.name} equipped · place mode`,900);
    return true;
  }

  function equipSeed(cropId){
    const id=Number(cropId);
    const crop=cropById(id);
    if(!crop){
      hud.showMessage('Unknown seed type');
      return false;
    }
    if(state.inventory.seedCount(id)<=0){
      hud.showMessage(`${crop.seedName} are empty`);
      return false;
    }

    state.entities.hook.active=false;
    state.build.active=false;
    state.build.equippedMaterial=null;
    state.build.equippedFurnitureId=null;
    state.seedMode.active=true;
    state.seedMode.cropId=id;
    state.cooldown=0;
    hud.update();
    hud.showMessage(`${crop.seedName} equipped · click to scatter`,900);
    return true;
  }

  function cycleStoredMaterial(){
    const placeable=state.inventory.order.filter(id=>
      state.inventory.counts[id]>0&&PLACEABLE_MATERIALS.has(id)
    );
    if(placeable.length===0){
      hud.showMessage('No placeable blocks in inventory');
      return;
    }

    const current=state.build.equippedMaterial;
    const currentIndex=placeable.indexOf(current);
    const next=placeable[(currentIndex+1+placeable.length)%placeable.length];
    equipMaterial(next);
  }

  function traceRay(direction,range,{ignoreTypes=null}={}){
    const distance=Math.min(range,direction.distance);
    const endpoint={
      x:Math.floor(state.player.x+direction.x*distance),
      y:Math.floor(state.player.y-2+direction.y*distance),
    };
    let lastAir=null;
    let previousKey='';

    for(let step=1;step<=Math.ceil(distance*4);step++){
      const beamDistance=step/4;
      const x=Math.floor(state.player.x+direction.x*beamDistance);
      const y=Math.floor(state.player.y-2+direction.y*beamDistance);
      const cellKey=`${x},${y}`;
      if(cellKey===previousKey)continue;
      previousKey=cellKey;

      const type=cells.getCell(x,y);
      if(type===M.AIR||ignoreTypes?.has(type)){
        if(type===M.AIR)lastAir={x,y};
        continue;
      }
      return{hit:{x,y,type},lastAir,endpoint,distance};
    }

    return{hit:null,lastAir,endpoint,distance};
  }

  function playerOccupiesCell(x,y){
    return playerOccupiesPixel(
      x,
      y,
      state.player.x,
      state.player.y,
      state.player.width,
      state.player.height,
    );
  }

  function getDestruculatorPreview(){
    const direction=aim();
    const hoverX=nearestPixel(direction.targetX);
    const hoverY=nearestPixel(direction.targetY);
    const hoverType=cells.getCell(hoverX,hoverY);
    const hoverDistance=Math.hypot(hoverX-state.player.x,hoverY-(state.player.y-2));

    // Liquids never intercept the automatic beam. They can only be selected by
    // placing the cursor directly over the exact liquid pixel.
    const explicitLiquid=hoverDistance<=DESTRUCULATOR_RANGE&&LIQUID_MATERIALS.has(hoverType);
    const trace=explicitLiquid
      ?{hit:{x:hoverX,y:hoverY,type:hoverType},endpoint:{x:hoverX,y:hoverY},distance:hoverDistance}
      :traceRay(direction,DESTRUCULATOR_RANGE,{ignoreTypes:LIQUID_MATERIALS});
    const furnitureHit=furniture?.rayHit?.(direction,DESTRUCULATOR_RANGE)??null;
    const terrainDistance=trace.hit?Math.hypot(trace.hit.x-state.player.x,trace.hit.y-(state.player.y-2)):Infinity;
    if(furnitureHit&&furnitureHit.distance<=terrainDistance){
      return{
        valid:true,x:furnitureHit.x,y:furnitureHit.y,type:M.AIR,
        beamX:furnitureHit.x,beamY:furnitureHit.y,explicitlyHoveredLiquid:false,
        isFurniture:true,furnitureEntity:furnitureHit.entity,reason:'dismantle and collect furniture',range:DESTRUCULATOR_RANGE,
      };
    }
    const target=trace.hit??trace.endpoint;
    const valid=Boolean(trace.hit&&(COLLECTABLE_MATERIALS.has(trace.hit.type)||CROP_MATERIALS.has(trace.hit.type)));
    return{
      valid,
      x:target.x,
      y:target.y,
      type:trace.hit?.type??M.AIR,
      beamX:target.x,
      beamY:target.y,
      explicitlyHoveredLiquid:explicitLiquid,
      reason:trace.hit?(valid?'destroy and collect':'material cannot be collected'):'no block in range',
      range:DESTRUCULATOR_RANGE,
    };
  }

  function getBuildPreview(){
    const direction=aim();
    const trace=traceRay(direction,BUILD_CONFIG.range);
    const candidate=trace.hit?trace.lastAir:trace.endpoint;
    const target=candidate??trace.hit??trace.endpoint;
    const furnitureId=state.build.equippedFurnitureId;
    if(furnitureId){
      const count=state.inventory.furnitureCount(furnitureId);
      const placement=candidate?furniture?.canPlace?.(furnitureId,candidate.x,candidate.y):{valid:false,reason:'no open placement cell'};
      return{
        valid:Boolean(state.build.active&&count>0&&placement?.valid),
        x:target.x,y:target.y,type:M.AIR,beamX:target.x,beamY:target.y,
        reason:count<=0?'equipped furniture is empty':placement?.reason??'invalid placement',
        range:BUILD_CONFIG.range,snappedToSurface:Boolean(trace.hit&&candidate),
        furnitureId,isFurniture:true,definition:placement?.definition,bounds:placement?.bounds,
      };
    }
    const selected=state.build.equippedMaterial;
    const candidateType=candidate?cells.getCell(candidate.x,candidate.y):M.ROCK;
    const hasMaterial=Number.isInteger(selected)&&state.inventory.counts[selected]>0;
    const placeable=Number.isInteger(selected)&&PLACEABLE_MATERIALS.has(selected);
    const clear=Boolean(candidate&&candidateType===M.AIR);
    const outsidePlayer=Boolean(candidate&&!playerOccupiesCell(candidate.x,candidate.y));
    const valid=state.build.active&&hasMaterial&&placeable&&clear&&outsidePlayer;

    let reason='ready to build';
    if(!state.build.active)reason='build mode is off';
    else if(!placeable)reason='equipped item is not placeable';
    else if(!hasMaterial)reason='equipped block is empty';
    else if(!candidate)reason='no open placement cell';
    else if(!clear)reason='placement cell is blocked';
    else if(!outsidePlayer)reason='cannot place inside player';

    return{
      valid,x:target.x,y:target.y,type:selected??M.AIR,beamX:target.x,beamY:target.y,
      reason,range:BUILD_CONFIG.range,snappedToSurface:Boolean(trace.hit&&candidate),
    };
  }

  function useDestruculator(){
    const preview=getDestruculatorPreview();
    Object.assign(state.toolEffect,{
      x:preview.x,
      y:preview.y,
      kind:'destroy',
      valid:preview.valid,
      frames:preview.valid?8:5,
    });

    if(!preview.valid){
      state.cooldown=5;
      return;
    }

    if(preview.isFurniture){
      furniture?.remove?.(preview.furnitureEntity,{refund:true});
      juice?.impact?.(preview.x,preview.y,{kind:'dust',count:12,shake:.6,hitStop:1});
    }else{
      if(!CROP_MATERIALS.has(preview.type))state.inventory.add(preview.type,1);
      juice?.impact?.(preview.x,preview.y,{kind:preview.type===M.CRYSTAL?'crystal':'dust',count:10,shake:.45,hitStop:1});
      cells.setCell(preview.x,preview.y,M.AIR,0,{reason:'destruculator'});
    }
    state.cooldown=4;
    hud.update();
  }

  function useBuildMode(){
    const preview=getBuildPreview();
    Object.assign(state.toolEffect,{
      x:preview.x,
      y:preview.y,
      kind:'build',
      valid:preview.valid,
      frames:preview.valid?7:5,
    });

    if(!preview.valid){
      state.cooldown=4;
      return;
    }

    if(preview.isFurniture){
      const furnitureId=preview.furnitureId;
      furniture?.place?.(furnitureId,preview.x,preview.y);
      state.inventory.removeFurniture(furnitureId,1);
      state.cooldown=8;
      if(state.inventory.furnitureCount(furnitureId)===0){
        state.build.active=false;
        state.build.equippedFurnitureId=null;
        hud.showMessage('Furniture stack depleted · build mode closed',1000);
      }
      hud.update();
      return;
    }
    const selected=state.build.equippedMaterial;
    cells.setCell(preview.x,preview.y,selected);
    juice?.burst?.(preview.x,preview.y,{colors:['rgb(220,244,255)','rgb(116,183,216)'],count:6,speedMin:.15,speedMax:.7,gravity:.04,lifeMin:7,lifeMax:16});
    state.inventory.remove(selected,1);
    state.cooldown=4;

    if(state.inventory.counts[selected]===0){
      state.build.active=false;
      state.build.equippedMaterial=null;
      hud.showMessage(`${materialName(selected)} depleted · build mode closed`,1000);
    }
    hud.update();
  }

  function findDroneGroundTarget(direction){
    const camera=state.world.camera;
    const originX=camera.chunkX*WORLD_WIDTH;
    const originY=camera.chunkY*WORLD_HEIGHT;
    const x=Math.max(originX+2,Math.min(originX+WORLD_WIDTH-3,Math.floor(direction.targetX)));
    const pointerY=Math.max(originY+1,Math.min(originY+WORLD_HEIGHT-2,Math.floor(direction.targetY)));
    const firstVisibleY=originY+1;
    const lastVisibleY=originY+WORLD_HEIGHT-2;

    // A drone rocket arrives from above, so a target beneath any solid cell is
    // unreachable. Resolve the selected column to its highest visible solid
    // pixel regardless of the cursor's vertical position.
    for(let y=firstVisibleY;y<=lastVisibleY;y++){
      if(!cells.isSolid(cells.getCell(x,y)))continue;
      return{
        x,
        y,
        snapped:y!==pointerY,
        pointerX:x,
        pointerY,
      };
    }
    return null;
  }

  function droneCorridorIsAir(fromX,toX,y){
    const step=fromX<=toX?1:-1;
    const halfHeight=DRONE_STRIKE_CONFIG.corridorHalfHeight;
    for(let x=fromX;step>0?x<=toX:x>=toX;x+=step){
      for(let offsetY=-halfHeight;offsetY<=halfHeight;offsetY++){
        if(cells.getCell(x,y+offsetY)!==M.AIR)return false;
      }
    }
    return true;
  }

  function getDroneStrikePreview(){
    const direction=aim();
    const camera=state.world.camera;
    const originX=camera.chunkX*WORLD_WIDTH;
    const originY=camera.chunkY*WORLD_HEIGHT;
    const fallbackX=Math.max(originX+2,Math.min(originX+WORLD_WIDTH-3,Math.floor(direction.targetX)));
    const fallbackY=Math.max(originY+1,Math.min(originY+WORLD_HEIGHT-2,Math.floor(direction.targetY)));
    const target=findDroneGroundTarget(direction);

    if(!target){
      return{
        valid:false,
        x:fallbackX,
        y:fallbackY,
        entryX:null,
        entryY:null,
        exitX:null,
        flightDirection:0,
        pointerX:fallbackX,
        pointerY:fallbackY,
        snapped:false,
        reason:'no solid pixel exists in the selected visible column',
      };
    }

    const topStart=originY+DRONE_STRIKE_CONFIG.entryTopMargin;
    const topEnd=originY+Math.floor(WORLD_HEIGHT*DRONE_STRIKE_CONFIG.topHalfRatio)-DRONE_STRIKE_CONFIG.entryTopMargin;
    const rowCount=Math.max(0,topEnd-topStart+1);
    if(rowCount===0){
      return{
        valid:false,
        x:target.x,
        y:target.y,
        entryX:null,
        entryY:null,
        exitX:null,
        flightDirection:0,
        pointerX:target.pointerX,
        pointerY:target.pointerY,
        snapped:target.snapped,
        reason:'the visible upper half is too obstructed for a drone',
      };
    }

    const leftEntry=originX-DRONE_STRIKE_CONFIG.entryOutsideOffset;
    const rightEntry=originX+WORLD_WIDTH-1+DRONE_STRIKE_CONFIG.entryOutsideOffset;
    const sideRoll=noise.randomAt(target.x,target.y,2241);
    const sides=sideRoll<.5
      ?[
        {entryX:leftEntry,exitX:rightEntry,direction:1,side:'left'},
        {entryX:rightEntry,exitX:leftEntry,direction:-1,side:'right'},
      ]
      :[
        {entryX:rightEntry,exitX:leftEntry,direction:-1,side:'right'},
        {entryX:leftEntry,exitX:rightEntry,direction:1,side:'left'},
      ];
    const rowOffset=Math.floor(noise.randomAt(target.x,target.y,2242)*rowCount);

    for(let index=0;index<rowCount;index++){
      const y=topStart+(rowOffset+index)%rowCount;
      for(const side of sides){
        if(!droneCorridorIsAir(side.entryX,target.x,y))continue;
        return{
          valid:true,
          x:target.x,
          y:target.y,
          entryX:side.entryX,
          entryY:y,
          exitX:side.exitX,
          flightDirection:side.direction,
          side:side.side,
          pointerX:target.pointerX,
          pointerY:target.pointerY,
          snapped:target.snapped,
          reason:`clear ${side.side}-side air approach`,
        };
      }
    }

    return{
      valid:false,
      x:target.x,
      y:target.y,
      entryX:null,
      entryY:null,
      exitX:null,
      flightDirection:0,
      pointerX:target.pointerX,
      pointerY:target.pointerY,
      snapped:target.snapped,
      reason:'no all-air flight corridor exists in the visible upper half',
    };
  }

  function summonDroneStrike(){
    const preview=getDroneStrikePreview();
    if(!preview.valid){
      state.cooldown=12;
      hud.showMessage(`Drone strike unavailable · ${preview.reason}`,1300);
      return false;
    }

    state.entities.drones.push({
      x:nearestPixel(preview.entryX),
      y:nearestPixel(preview.entryY),
      targetX:nearestPixel(preview.x),
      targetY:nearestPixel(preview.y),
      exitX:nearestPixel(preview.exitX),
      direction:preview.flightDirection,
      phase:'approach',
      bob:noise.randomAt(preview.x,preview.y,2243)*Math.PI*2,
      launched:false,
    });
    state.cooldown=DRONE_STRIKE_CONFIG.cooldown;
    juice?.screenFlash?.('rgba(120,220,255,.16)',4);
    juice?.play?.('shot',.5);
    hud.showMessage('Drone inbound · large rocket authorized',1100);
    return true;
  }

  function sprayNapalm(direction){
    const angle=direction.angle+(noise.randomAt(state.frame,state.player.x|0,510)-.5)*.16;
    const speed=1.65+noise.randomAt(state.frame,state.player.y|0,511)*.65;
    state.entities.napalmShots.push({
      x:nearestPixel(state.player.x+Math.cos(angle)*2.2),
      y:nearestPixel(state.player.y-2+Math.sin(angle)*2.2),
      vx:Math.cos(angle)*speed+state.player.vx*.2,
      vy:Math.sin(angle)*speed+state.player.vy*.12,
      life:45,
    });
    state.cooldown=2;
  }

  function laserTerrainTrace(direction){
    return traceRay(direction,LASER_RIFLE_CONFIG.range,{ignoreTypes:new Set([M.SMOKE,M.STEAM,M.FIRE])});
  }

  function closestLaserEntity(direction,maxDistance){
    const startX=state.player.x;
    const startY=state.player.y-2;
    let closest=null;
    let closestDistance=maxDistance+1;

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(enemy.hp<=0)continue;
        const dx=enemy.x-startX;
        const dy=enemy.y-startY;
        const projected=dx*direction.x+dy*direction.y;
        if(projected<=0||projected>=closestDistance||projected>maxDistance)continue;
        const perpendicular=Math.abs(dx*direction.y-dy*direction.x);
        const radius=(faunaById(enemy.speciesId)?.hitRadius??2)+.65;
        if(perpendicular>radius)continue;
        closest={kind:'enemy',entity:enemy,distance:projected};
        closestDistance=projected;
      }
    }

    for(const boss of state.entities.bosses){
      if(boss.hp<=0)continue;
      const dx=boss.x-startX;
      const dy=boss.y-startY;
      const projected=dx*direction.x+dy*direction.y;
      if(projected<=0||projected>=closestDistance||projected>maxDistance)continue;
      const perpendicular=Math.abs(dx*direction.y-dy*direction.x);
      const radius=Math.max(3,Math.min((boss.width??12)*.42,(boss.height??10)*.55));
      if(perpendicular>radius)continue;
      closest={kind:'boss',entity:boss,distance:projected};
      closestDistance=projected;
    }
    return closest;
  }

  function laserHeatKey(x,y){ return `${x},${y}`; }

  function reactHeatedPixel(x,y,type,heat){
    if(type===M.WATER&&heat>=LASER_RIFLE_CONFIG.waterSteamHeat){
      cells.setCell(x,y,M.STEAM,90,{reason:'laser-heating'});
      return true;
    }
    if(type===M.SNOW&&heat>=LASER_RIFLE_CONFIG.snowMeltHeat){
      cells.setCell(x,y,M.WATER,0,{reason:'laser-heating'});
      return true;
    }
    if(type===M.NAPALM&&heat>=LASER_RIFLE_CONFIG.ignitionHeat*.45){
      cells.setCell(x,y,M.FIRE,105,{reason:'laser-heating'});
      return true;
    }
    if(FLAMMABLE_MATERIALS.has(type)&&heat>=LASER_RIFLE_CONFIG.ignitionHeat){
      cells.setCell(x,y,M.FIRE,105,{reason:'laser-heating'});
      return true;
    }
    if(type===M.SAND&&heat>=LASER_RIFLE_CONFIG.sandMeltHeat){
      cells.setCell(x,y,M.LAVA,0,{reason:'laser-heating'});
      return true;
    }
    if([M.ROCK,M.DIRT,M.CRYSTAL].includes(type)&&heat>=LASER_RIFLE_CONFIG.stoneMeltHeat){
      cells.setCell(x,y,M.LAVA,0,{reason:'laser-heating'});
      return true;
    }
    return false;
  }

  function addPixelHeat(x,y,amount){
    const type=cells.getCell(x,y);
    if(type===M.AIR||type===M.SMOKE||type===M.STEAM||type===M.FIRE||type===M.LAVA)return 0;
    const key=laserHeatKey(x,y);
    const heat=Math.min(140,(laserCellHeat.get(key)??0)+amount);
    laserCellHeat.set(key,heat);
    reactHeatedPixel(x,y,type,heat);
    return heat;
  }

  function heatImpactPixels(x,y){
    const main=addPixelHeat(x,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame);
    if(state.frame%3===0){
      addPixelHeat(x-1,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x+1,y,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x,y-1,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
      addPixelHeat(x,y+1,LASER_RIFLE_CONFIG.pixelHeatPerFrame*.22);
    }
    state.laser.contactHeat=main;
  }

  function spawnLaserSparks(x,y,direction){
    for(let index=0;index<LASER_RIFLE_CONFIG.sparkCountPerFrame;index++){
      const spread=(noise.randomAt(state.frame,index,x+y*13+8801)-.5)*2.4;
      const speed=.45+noise.randomAt(index,state.frame,8802)*1.05;
      const angle=Math.atan2(-direction.y,-direction.x)+spread;
      state.entities.laserSparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-.18,
        life:8+Math.floor(noise.randomAt(x+index,y,state.frame+8803)*11),
      });
    }
    if(state.entities.laserSparks.length>LASER_RIFLE_CONFIG.maxSparks){
      state.entities.laserSparks.splice(0,state.entities.laserSparks.length-LASER_RIFLE_CONFIG.maxSparks);
    }
  }

  function updateLaserSparks(){
    for(let index=state.entities.laserSparks.length-1;index>=0;index--){
      const spark=state.entities.laserSparks[index];
      spark.x+=spark.vx;
      spark.y+=spark.vy;
      spark.vx*=.94;
      spark.vy+=.075;
      spark.life--;
      if(spark.life<=0)state.entities.laserSparks.splice(index,1);
    }
  }

  function decayLaserPixelHeat(){
    for(const [key,value] of laserCellHeat){
      const next=value-LASER_RIFLE_CONFIG.pixelHeatDecay;
      if(next<=0)laserCellHeat.delete(key);
      else laserCellHeat.set(key,next);
    }
    if(laserCellHeat.size>96){
      const entries=[...laserCellHeat.entries()].sort((a,b)=>a[1]-b[1]);
      for(let index=0;index<entries.length-96;index++)laserCellHeat.delete(entries[index][0]);
    }
  }

  function syncLaserHotPixels(){
    state.laser.hotPixels=[];
    for(const [key,heat] of laserCellHeat){
      const comma=key.indexOf(',');
      state.laser.hotPixels.push({
        x:Number(key.slice(0,comma)),
        y:Number(key.slice(comma+1)),
        heat,
      });
    }
  }

  function fireLaserFrame(){
    const direction=aim();
    const terrain=laserTerrainTrace(direction);
    const startX=state.player.x;
    const startY=state.player.y-2;
    const terrainTarget=terrain.hit??terrain.endpoint;
    const terrainDistance=Math.hypot(terrainTarget.x-startX,terrainTarget.y-startY);
    const entityHit=closestLaserEntity(direction,terrainDistance);
    let impactX=terrainTarget.x;
    let impactY=terrainTarget.y;
    let contactKind=terrain.hit?'terrain':'air';

    if(entityHit){
      impactX=nearestPixel(startX+direction.x*entityHit.distance);
      impactY=nearestPixel(startY+direction.y*entityHit.distance);
      contactKind=entityHit.kind;
      if(entityHit.kind==='enemy'){
        entityHit.entity.hp-=LASER_RIFLE_CONFIG.enemyDamagePerFrame;
        entityHit.entity.hit=Math.max(entityHit.entity.hit??0,3);
      }else{
        entityHit.entity.hp-=LASER_RIFLE_CONFIG.bossDamagePerFrame;
        entityHit.entity.hit=Math.max(entityHit.entity.hit??0,3);
      }
    }else if(terrain.hit){
      heatImpactPixels(impactX,impactY);
    }else{
      state.laser.contactHeat=0;
    }

    state.laser.active=true;
    state.laser.beam={
      startX:nearestPixel(startX),startY:nearestPixel(startY),
      endX:nearestPixel(impactX),endY:nearestPixel(impactY),
      impactX:nearestPixel(impactX),impactY:nearestPixel(impactY),
      contactKind,
    };
    spawnLaserSparks(impactX,impactY,direction);
    if(state.frame%7===0)juice?.impact?.(impactX,impactY,{kind:'laser',count:5,shake:.18,hitStop:0});
    state.laser.heat=Math.min(100,state.laser.heat+LASER_RIFLE_CONFIG.weaponHeatPerFrame);
    if(state.laser.heat>=100){
      state.laser.heat=100;
      state.laser.overheated=true;
      state.laser.active=false;
      state.laser.beam=null;
      juice?.screenFlash?.('rgba(255,78,42,.24)',6);
      juice?.shake?.(2.5,18);
      hud.showMessage('Laser rifle overheated',900);
    }
  }

  function updateContinuous(){
    updateLaserSparks();
    decayLaserPixelHeat();
    const firing=state.weaponId===W.LASER_RIFLE&&state.input.pointerDown&&!state.build.active&&!state.seedMode.active&&state.player.hp>0;
    if(firing&&!state.laser.overheated){
      fireLaserFrame();
      syncLaserHotPixels();
      return;
    }

    state.laser.active=false;
    state.laser.beam=null;
    state.laser.contactHeat=0;
    state.laser.heat=Math.max(0,state.laser.heat-LASER_RIFLE_CONFIG.weaponCoolPerFrame);
    syncLaserHotPixels();
    if(state.laser.overheated&&state.laser.heat<=LASER_RIFLE_CONFIG.overheatRelease){
      state.laser.overheated=false;
      hud.showMessage('Laser rifle cooled',700);
    }
  }


  function fireRealityZipper(direction){
    if(state.entities.realityRifts.length>=REALITY_ZIPPER_CONFIG.maxRifts){
      hud.showMessage('Reality is already unzipped',700);
      state.cooldown=12;
      return false;
    }
    const distance=Math.max(14,Math.min(REALITY_ZIPPER_CONFIG.range,direction.distance));
    const startDistance=Math.min(7,Math.max(4,distance*.14));
    const startX=nearestPixel(state.player.x+direction.x*startDistance);
    const startY=nearestPixel(state.player.y-2+direction.y*startDistance);
    const endX=nearestPixel(state.player.x+direction.x*distance);
    const endY=nearestPixel(state.player.y-2+direction.y*distance);
    const horizontal=Math.abs(endX-startX)>=Math.abs(endY-startY);
    const normalX=horizontal?0:1;
    const normalY=horizontal?1:0;
    state.entities.realityRifts.push({
      id:`rift-${state.frame}-${startX}-${startY}`,
      startX,startY,endX,endY,
      normalX,normalY,
      age:0,
      life:REALITY_ZIPPER_CONFIG.lifeFrames,
      phase:'opening',
      applied:false,
      restored:false,
      snapshot:[],
      points:[],
      splitCount:0,
      pulse:0,
    });
    juice?.screenFlash?.('rgba(255,40,220,.22)',7);
    juice?.shockwave?.(startX,startY,'rgb(255,75,230)',14,20);
    juice?.shockwave?.(endX,endY,'rgb(70,245,255)',14,20);
    juice?.shake?.(4.5,28);
    juice?.hitStop?.(4);
    state.realityZipper.active=true;
    state.realityZipper.phase='opening';
    state.cooldown=REALITY_ZIPPER_CONFIG.cooldown;
    hud.showMessage('REALITY UNZIPPED',900);
    return true;
  }

  function attack(){
    if(state.player.hp<=0)return;
    if(weaponIsStolen(state.weaponId)){
      hud.showMessage('That weapon was stolen — hunt down the thief',800);
      cycleWeapon();
      return;
    }
    const direction=aim();

    if(state.seedMode.active&&Number.isInteger(state.seedMode.cropId)){
      if(state.cooldown>0)return;
      if(crops.throwSeeds(state.seedMode.cropId,direction))state.cooldown=14;
      return;
    }

    if(state.build.active){
      if(state.cooldown>0)return;
      useBuildMode();
      return;
    }

    if(state.weaponId===W.LASER_RIFLE){
      if(!state.laser.overheated){
        juice?.weaponFire?.('laser',state.player.x,state.player.y-2,direction);
        fireLaserFrame();
      }
      return;
    }

    if(state.cooldown>0)return;

    if(state.weaponId===W.REALITY_ZIPPER){
      fireRealityZipper(direction);
      return;
    }

    if(state.weaponId===W.NYAN_CAT_LAUNCHER){
      if(state.entities.nyanCats.length){
        hud.showMessage('Nyan Cat is still airborne',650);
        state.cooldown=12;
        return;
      }
      state.entities.nyanCats.push({
        x:nearestPixel(state.player.x+direction.x*5),
        y:nearestPixel(state.player.y-2+direction.y*3),
        vx:direction.x*NYAN_CAT_CONFIG.speed+state.player.vx*.18,
        vy:direction.y*NYAN_CAT_CONFIG.speed+state.player.vy*.1,
        life:NYAN_CAT_CONFIG.lifeFrames,
        pierce:NYAN_CAT_CONFIG.pierce,
        bounces:0,
        phase:noise.randomAt(state.frame,state.player.x|0,9901)*Math.PI*2,
        trail:[],
        hits:new Set(),
      });
      state.player.vx-=direction.x*.55;
      state.player.vy-=direction.y*.18;
      juice?.weaponFire?.('nyan',state.player.x+direction.x*3,state.player.y-2+direction.y*2,direction);
      state.cooldown=NYAN_CAT_CONFIG.cooldown;
      hud.showMessage('NYAN CAT LAUNCHED',700);
      return;
    }

    if(state.weaponId===W.GUN){
      state.entities.bullets.push({
        x:nearestPixel(state.player.x+direction.x*2),
        y:nearestPixel(state.player.y-2+direction.y*2),
        vx:direction.x*3.6,
        vy:direction.y*3.6,
        life:72,
        pierce:2,
      });
      state.player.vx-=direction.x*.08;
      juice?.weaponFire?.('gun',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      state.cooldown=9;
      return;
    }

    if(state.weaponId===W.NAPALM_SPRAYER){
      juice?.weaponFire?.('fire',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      sprayNapalm(direction);
      return;
    }

    if(state.weaponId===W.GLAIVE){
      if(state.entities.glaives.length)return;
      state.entities.glaives.push({
        x:state.player.x,
        y:state.player.y-2,
        vx:direction.x*GLAIVE_CONFIG.launchSpeed,
        vy:direction.y*GLAIVE_CONFIG.launchSpeed,
        age:0,
        returning:false,
        spin:direction.angle,
        spinSpeed:GLAIVE_CONFIG.spinSpeed,
        bounces:0,
        hits:new Map(),
      });
      juice?.weaponFire?.('blade',state.player.x,state.player.y-2,direction);
      state.cooldown=24;
      return;
    }

    if(state.weaponId===W.HOOK){
      const hook=state.entities.hook;
      if(hook.active)return;
      Object.assign(hook,{
        active:true,
        stuck:false,
        x:state.player.x,
        y:state.player.y-2,
        vx:direction.x*3.1,
        vy:direction.y*3.1,
      });
      juice?.weaponFire?.('hook',state.player.x,state.player.y-2,direction);
      state.cooldown=8;
      return;
    }

    if(state.weaponId===W.SWORD){
      state.swordTimer=12;
      state.swordAngle=direction.angle;
      state.cooldown=16;
      juice?.weaponFire?.('sword',state.player.x,state.player.y-2,direction);

      for(const chunk of state.world.activeChunks){
        for(const enemy of chunk.enemies){
          const dx=enemy.x-state.player.x;
          const dy=enemy.y-(state.player.y-2);
          const distance=Math.hypot(dx,dy);
          let difference=Math.atan2(dy,dx)-direction.angle;
          while(difference>Math.PI)difference-=Math.PI*2;
          while(difference<-Math.PI)difference+=Math.PI*2;

          const hitRadius=faunaById(enemy.speciesId)?.hitRadius??2;
          if(distance<8+hitRadius&&Math.abs(difference)<1.05){
            enemy.hp-=35;
            enemy.hit=8;
            enemy.vx+=Math.cos(direction.angle)*.5;
            enemy.vy+=Math.sin(direction.angle)*.5;
          }
        }
      }
      damageBossesInSwordArc(direction,35);
      return;
    }

    if(state.weaponId===W.GRENADE){
      const speed=GRENADE_CONFIG.launchSpeed;
      state.entities.grenades.push({
        x:nearestPixel(state.player.x+direction.x*2),
        y:nearestPixel(state.player.y-2+direction.y*2),
        vx:direction.x*speed+state.player.vx*.35,
        vy:direction.y*speed+state.player.vy*.18,
        fuse:GRENADE_CONFIG.fuseFrames,
        rotation:0,
      });
      state.player.vx-=direction.x*.22;
      juice?.weaponFire?.('grenade',state.player.x+direction.x*2,state.player.y-2+direction.y*2,direction);
      state.cooldown=GRENADE_CONFIG.cooldown;
      return;
    }

    if(state.weaponId===W.DRONE_STRIKE){
      summonDroneStrike();
      return;
    }

    useDestruculator();
  }

  function updateHook(){
    const hook=state.entities.hook;
    if(!hook.active)return;

    if(!hook.stuck){
      for(let i=0;i<3;i++){
        hook.x+=hook.vx/3;
        hook.y+=hook.vy/3;

        if(Math.hypot(hook.x-state.player.x,hook.y-state.player.y)>58){
          hook.active=false;
          return;
        }

        if(cells.isSolid(cells.getCell(Math.floor(hook.x),Math.floor(hook.y)))){
          hook.stuck=true;
          break;
        }
      }
      snapPixelPosition(hook);
      return;
    }

    if(state.input.pointerDown&&state.weaponId===W.HOOK&&!state.build.active){
      const dx=hook.x-state.player.x;
      const dy=hook.y-(state.player.y-2);
      const distance=Math.hypot(dx,dy)||1;
      state.player.vx+=dx/distance*.14;
      state.player.vy+=dy/distance*.14;
    }else{
      hook.active=false;
    }
    snapPixelPosition(hook);
  }

  return {
    aim,
    attack,
    updateHook,
    updateContinuous,
    cycleWeapon,
    cycleStoredMaterial,
    equipMaterial,
    equipFurniture,
    equipSeed,
    exitBuildMode,
    getDestruculatorPreview,
    getBuildPreview,
    getDroneStrikePreview,
    summonDroneStrike,
  };
}
