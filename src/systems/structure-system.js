import { DimensionId, DIMENSION_IDS, dimensionDefinition, createDimensionEntityMap } from '../data/dimensions.db.js';

export function createStructureSystem(state,cells,chunks,generator,hud,juice=null){
  const DIMENSION_ENTITY_KEYS=['bosses','bossFireballs','serpentProjectiles','bossProjectiles','pickups','seedParticles','enemyNests','invasionPortals','furniture'];
  const TRANSIENT_ENTITY_KEYS=['bullets','napalmShots','glaives','grenades','drones','droneRockets','nyanCats','nyanSparks','laserSparks','realityRifts','realitySparks','explosions','juiceParticles','damageNumbers','juiceFlashes','juiceShockwaves'];

  function ensureDimensionEntities(){
    if(!state.world.dimensionEntities)state.world.dimensionEntities=createDimensionEntityMap();
    for(const id of DIMENSION_IDS){
      if(!state.world.dimensionEntities[id])state.world.dimensionEntities[id]=Object.create(null);
      if(!state.world.dimensionPositions[id])state.world.dimensionPositions[id]={x:dimensionDefinition(id).spawnX??48,y:45};
    }
    return state.world.dimensionEntities;
  }

  function switchDimension(targetDimension,targetPosition,currentReturnPosition=null){
    const current=state.world.dimension??DimensionId.EARTH;
    if(Number.isInteger(state.player.stolenWeaponId)){
      for(const chunk of state.world.chunks.values()){
        if((chunk.dimension??'earth')!==current)continue;
        for(const enemy of chunk.enemies??[])if(enemy.stolenWeaponId===state.player.stolenWeaponId)enemy.stolenWeaponId=null;
      }
      state.player.stolenWeaponId=null;
      hud.showMessage('Dimensional transit recalled your stolen weapon',900);
    }
    if(current===targetDimension){
      state.player.x=Math.round(targetPosition.x);
      state.player.y=Math.round(targetPosition.y);
      state.player.vx=0;
      state.player.vy=0;
      chunks.updateActiveNeighborhood();
      return;
    }
    const stores=ensureDimensionEntities();
    state.world.dimensionPositions[current]=currentReturnPosition?{x:currentReturnPosition.x,y:currentReturnPosition.y}:{x:state.player.x,y:state.player.y};
    const currentStore=stores[current]??(stores[current]=Object.create(null));
    const targetStore=stores[targetDimension]??(stores[targetDimension]=Object.create(null));
    for(const key of DIMENSION_ENTITY_KEYS){
      const array=state.entities[key];
      if(!Array.isArray(array))continue;
      currentStore[key]=array.splice(0,array.length);
      const incoming=Array.isArray(targetStore[key])?targetStore[key]:[];
      array.push(...incoming);
      targetStore[key]=[];
    }
    for(const key of TRANSIENT_ENTITY_KEYS){
      if(Array.isArray(state.entities[key]))state.entities[key].length=0;
    }
    Object.assign(state.entities.hook,{active:false,stuck:false,x:0,y:0,vx:0,vy:0});
    state.world.dimension=targetDimension;
    state.world.dimensionPositions[targetDimension]={x:targetPosition.x,y:targetPosition.y};
    state.world.visitedDimensions??={earth:true};
    state.world.visitedDimensions[targetDimension]=true;
    state.player.x=Math.round(targetPosition.x);
    state.player.y=Math.round(targetPosition.y);
    state.player.vx=0;
    state.player.vy=0;
    state.world.activeChunks.length=0;
    state.world.activeKeys.clear();
    Object.assign(state.weather,{overrideType:null,currentType:'clear',previousType:'clear',segment:-1,intensity:0,windX:0,visibility:1,nextLightningFrame:0});
    state.weather.flashes.length=0;
    chunks.updateActiveNeighborhood();
  }

  function rectContains(rect,x,y){
    return x>=rect.x&&x<rect.x+rect.w&&y>=rect.y&&y<rect.y+rect.h;
  }

  function portalState(){
    if(!state.world.dimensionPortal){
      state.world.dimensionPortal=state.world.moonPortal??{active:false,phase:'idle',timer:0,life:0,x:0,y:0,targetDimension:DimensionId.MOON};
    }
    state.world.moonPortal=state.world.dimensionPortal;
    return state.world.dimensionPortal;
  }

  function portalSpaceOpen(centerX,centerY){
    for(let y=centerY-6;y<=centerY+5;y++)for(let x=centerX-2;x<=centerX+2;x++){
      if(cells.isSolid(cells.getCell(x,y)))return false;
    }
    return true;
  }

  function findPortalPosition(){
    const player=state.player;
    for(const offset of [10,-10,14,-14,7,-7,18,-18]){
      for(const vertical of [0,-4,4,-8,8]){
        const x=Math.round(player.x+offset);
        const y=Math.round(player.y+vertical-2);
        if(portalSpaceOpen(x,y))return {x,y};
      }
    }
    return {x:Math.round(player.x+8),y:Math.round(player.y-2)};
  }

  function openDimensionPortal(targetDimension){
    const definition=dimensionDefinition(targetDimension);
    if(!definition||definition.id!==targetDimension)return false;
    if(state.world.dimension===targetDimension){
      hud.showMessage(`Already in ${definition.name}`,1000);
      return false;
    }
    if(rocketFlightState().active)return false;
    const portal=portalState();
    const position=findPortalPosition();
    Object.assign(portal,{
      active:true,phase:'open',timer:0,life:60*20,x:position.x,y:position.y,
      targetDimension,sourceDimension:state.world.dimension,
      sourceReturnPosition:{x:state.player.x,y:state.player.y},
      colors:[...definition.portalColors],
    });
    const colors=definition.portalColors;
    juice?.screenFlash?.('rgba(182,126,255,.25)',8);
    juice?.shake?.(4,20);
    juice?.shockwave?.(portal.x,portal.y,colors[1]??colors[0],14,22);
    juice?.burst?.(portal.x,portal.y,{colors,count:28,speedMin:.25,speedMax:1.45,spread:Math.PI*2,gravity:0,lifeMin:18,lifeMax:48});
    hud.showMessage(targetDimension===DimensionId.MOON?'A lunar portal tears open':`${definition.name} portal opened`,1400);
    return true;
  }

  function openMoonPortal(){ return openDimensionPortal(DimensionId.MOON); }

  function updatePortal(){
    const portal=portalState();
    if(!portal.active)return false;
    const definition=dimensionDefinition(portal.targetDimension);
    const colors=portal.colors?.length?portal.colors:definition.portalColors;
    portal.timer++;
    if(portal.phase==='open'){
      portal.life--;
      if(portal.timer%6===0){
        juice?.particle?.(portal.x+(portal.timer%5)-2,portal.y-5+(portal.timer%11),{
          vx:0,vy:-.18,gravity:0,life:20,color:colors[portal.timer%colors.length],kind:'spark',
        });
      }
      const closeEnough=Math.abs(state.player.x-portal.x)<=2&&Math.abs(state.player.y-portal.y)<=6;
      if(closeEnough){
        portal.phase='transit';
        portal.timer=0;
        state.player.locked=true;
        state.player.vx=0;
        state.player.vy=0;
        juice?.hitStop?.(4);
        juice?.screenFlash?.('rgba(244,229,255,.4)',10);
        hud.showMessage(`Entering ${definition.name}`,700);
      }else if(portal.life<=0){
        portal.phase='closing';
        portal.timer=0;
      }
    }else if(portal.phase==='transit'){
      state.player.locked=true;
      state.player.x=Math.round(portal.x);
      state.player.y=Math.round(portal.y);
      state.player.vx=0;
      state.player.vy=0;
      if(portal.timer%2===0)juice?.burst?.(portal.x,portal.y,{colors,count:4,speedMin:.2,speedMax:.85,spread:Math.PI*2,gravity:0,lifeMin:8,lifeMax:18});
      if(portal.timer>=24){
        const remembered=state.world.visitedDimensions?.[portal.targetDimension]
          ?state.world.dimensionPositions?.[portal.targetDimension]
          :null;
        const destination=remembered??generator.dimensionSpawnPoint?.(portal.targetDimension)??{x:definition.spawnX??48,y:45};
        switchDimension(portal.targetDimension,destination,portal.sourceReturnPosition);
        state.player.locked=false;
        state.player.invulnerability=120;
        if(portal.targetDimension===DimensionId.MOON)state.world.moonReached=true;
        portal.x=state.player.x;
        portal.y=state.player.y-2;
        portal.phase='arrival';
        portal.timer=0;
        chunks.updateActiveNeighborhood();
        juice?.screenFlash?.('rgba(225,235,255,.44)',12);
        juice?.shockwave?.(state.player.x,state.player.y,colors[1]??colors[0],18,26);
        juice?.explosion?.(state.player.x,state.player.y+1,8,{kind:'spark',colors});
        hud.showMessage(`${definition.name} arrival`,1200);
      }
    }else if(portal.phase==='arrival'){
      if(portal.timer>=28)Object.assign(portal,{active:false,phase:'idle',timer:0,life:0});
    }else if(portal.phase==='closing'){
      if(portal.timer>=18)Object.assign(portal,{active:false,phase:'idle',timer:0,life:0});
    }
    return portal.active;
  }

  function rocketFlightState(){
    if(!state.world.rocketFlight)state.world.rocketFlight={active:false,phase:'idle',timer:0};
    return state.world.rocketFlight;
  }

  function beginLaunch(){
    if(state.world.dimension!==DimensionId.EARTH)return false;
    const rocket=generator.rocketSiloDescriptor?.();
    if(!rocket)return false;
    const flight=rocketFlightState();
    const moon=generator.dimensionSpawnPoint?.(DimensionId.MOON)??{x:48,y:45};
    Object.assign(flight,{active:true,phase:'launch',timer:0,rocketX:rocket.centerX,startY:rocket.launchPadY-1,targetX:moon.x,targetY:moon.y,transferHeight:-84,lunarEntryY:moon.y-42});
    state.player.locked=true;
    state.player.vx=0;
    state.player.vy=0;
    state.jumpBuffer=0;
    state.ui.contextPrompt='';
    juice?.screenFlash?.('rgba(255,245,210,.22)',7);
    juice?.shake?.(5,32);
    juice?.hitStop?.(4);
    juice?.shockwave?.(rocket.centerX,rocket.launchPadY,'rgb(255,218,126)',18,24);
    hud.showMessage('Rocket launch initiated',1200);
    return true;
  }

  function updateFlight(){
    const flight=rocketFlightState();
    if(!flight.active)return false;
    const player=state.player;
    flight.timer++;
    player.locked=true;
    player.vx=0;
    player.vy=0;

    if(flight.phase==='launch'){
      player.x=Math.round(flight.rocketX);
      player.y=Math.round(flight.startY-flight.timer*2);
      state.juice.speedIntensity=1;
      if(flight.timer%2===0)juice?.burst?.(player.x,player.y+4,{colors:['rgb(255,250,210)','rgb(255,161,53)','rgb(223,61,34)'],count:7,speedMin:.25,speedMax:1.15,angle:Math.PI*.5,spread:1.1,gravity:.03,lifeMin:10,lifeMax:24});
      state.ui.contextPrompt='ROCKET ASCENT';
      if(flight.timer===35)hud.showMessage('Leaving atmosphere',900);
      if(flight.timer>=70){ flight.phase='transfer'; flight.timer=0; }
    }else if(flight.phase==='transfer'){
      player.x=Math.round(flight.rocketX);
      player.y=Math.round(flight.transferHeight-flight.timer*3);
      state.juice.speedIntensity=1;
      if(flight.timer%3===0)juice?.particle?.(player.x-10+flight.timer%20,player.y+8,{vx:0,vy:.8,gravity:0,life:16,color:'rgba(210,228,255,.65)',kind:'streak'});
      state.ui.contextPrompt='CRUISING TO THE MOON';
      if(flight.timer>=28){
        flight.phase='landing';
        flight.timer=0;
        switchDimension(DimensionId.MOON,{x:flight.targetX,y:flight.lunarEntryY});
        hud.showMessage('Lunar approach',900);
      }
    }else if(flight.phase==='landing'){
      player.x=Math.round(flight.targetX);
      player.y=Math.min(Math.round(flight.targetY),Math.round(flight.lunarEntryY+flight.timer*2));
      state.ui.contextPrompt='MOON LANDING';
      if(player.y>=Math.round(flight.targetY)){
        player.y=Math.round(flight.targetY);
        player.locked=false;
        player.invulnerability=120;
        state.world.moonReached=true;
        state.world.visitedDimensions??={earth:true};
        state.world.visitedDimensions.moon=true;
        state.ui.contextPrompt='';
        Object.assign(flight,{active:false,phase:'idle',timer:0});
        chunks.updateActiveNeighborhood();
        juice?.explosion?.(player.x,player.y+2,9,{kind:'dust',colors:['rgb(220,214,203)','rgb(151,143,147)','rgb(103,93,128)']});
        hud.showMessage('You have landed on the moon',1600);
      }
    }

    if(chunks.chunkX(player.x)!==state.world.camera.chunkX||chunks.chunkY(player.y)!==state.world.camera.chunkY)chunks.updateActiveNeighborhood();
    return true;
  }

  function updatePrompt(){
    state.ui.contextPrompt='';
    if(state.world.dimension!==DimensionId.EARTH)return;
    const rocket=generator.rocketSiloDescriptor?.();
    if(!rocket)return;
    if(rectContains(rocket.launchZone,state.player.x,state.player.y)){
      state.ui.contextPrompt='UP TO BOARD ROCKET';
      if(state.jumpBuffer>0||state.input.keys.has('w')||state.input.keys.has('arrowup'))beginLaunch();
    }
  }

  function update(){
    if(updateFlight())return;
    const portalActive=updatePortal();
    if(portalActive&&portalState().phase==='transit')return;
    updatePrompt();
  }

  return {
    update,beginLaunch,openMoonPortal,openDimensionPortal,switchDimension,
    flightActive:()=>Boolean(state.world.rocketFlight?.active),
  };
}
