import { PLAYER_CONFIG, STEAM_CONFIG, HUNGER_CONFIG, BUNNYHOP_CONFIG, SWIM_CONFIG, BREATH_CONFIG } from '../config.js';
import { MaterialId } from '../data/materials.db.js';
import { playerPixelBounds } from '../player-geometry.js';
import { dimensionHasOxygen } from '../data/dimensions.db.js';

export function createPlayerSystem(state,cells,chunks,generator,weapons,hud,juice=null,furniture=null){
  const M=MaterialId;
  const C=PLAYER_CONFIG;
  const B=BUNNYHOP_CONFIG;
  const S=SWIM_CONFIG;
  const R=BREATH_CONFIG;
  const motionRemainder={x:0,y:0};

  function bunnyHopState(){
    const player=state.player;
    if(!player.bunnyHop){
      player.bunnyHop={chain:0,landingWindow:0,groundFrames:0,lastLandingFrame:-9999,lastJumpFrame:-9999};
    }
    return player.bunnyHop;
  }

  function resetBunnyHop(){
    const bunny=bunnyHopState();
    bunny.chain=0;
    bunny.landingWindow=0;
    bunny.groundFrames=0;
  }

  function bunnyJumpMultiplier(chain=bunnyHopState().chain){
    return Math.min(B.maxJumpMultiplier,1+Math.max(0,chain-1)*B.jumpSpeedBonusPerHop);
  }

  function bunnySpeedMultiplier(chain=bunnyHopState().chain){
    return Math.min(B.maxSpeedMultiplier,1+Math.max(0,chain-1)*B.speedLimitBonusPerHop);
  }

  function performJump(){
    const player=state.player;
    const bunny=bunnyHopState();
    const withinLandingWindow=
      bunny.chain>0&&
      state.frame-bunny.lastLandingFrame<=B.landingWindowFrames;
    bunny.chain=withinLandingWindow
      ?Math.min(B.maxChain,bunny.chain+1)
      :1;
    bunny.landingWindow=0;
    bunny.groundFrames=0;
    bunny.lastJumpFrame=state.frame;

    const direction=state.input.keys.has('a')||state.input.keys.has('arrowleft')
      ?-1
      :state.input.keys.has('d')||state.input.keys.has('arrowright')
        ?1
        :Math.sign(player.vx);
    if(bunny.chain>1&&direction!==0){
      const growth=1+Math.min(4,bunny.chain-2)*B.momentumBoostGrowth;
      player.vx+=direction*B.momentumBoost*growth;
    }
    const parasiteMultiplier=Math.max(.4,Math.min(1,Number(player.parasiteSlowMultiplier)||1));
    const speedLimit=C.maxSpeed*bunnySpeedMultiplier(bunny.chain)*parasiteMultiplier;
    player.vx=Math.max(-speedLimit,Math.min(speedLimit,player.vx));
    player.vy=-C.jumpSpeed*bunnyJumpMultiplier(bunny.chain);
    player.grounded=false;
    juice?.jump?.(player.x,player.y);
    if(bunny.chain>1)juice?.bunnyHop?.(player.x,player.y,bunny.chain);
    player.hunger=Math.max(0,player.hunger-HUNGER_CONFIG.jumpCost);
    motionRemainder.y=0;
    state.coyoteFrames=0;
    state.jumpBuffer=0;
  }

  function scanWaterColumn(px,seedY){
    let top=seedY;
    let upwardSteps=0;
    while(upwardSteps<S.columnScanDepth&&cells.getCell(px,top-1)===M.WATER){
      top--;
      upwardSteps++;
    }

    let cursor=top;
    let liquidDepth=0;
    while(liquidDepth<S.columnScanDepth&&cells.getCell(px,cursor)===M.WATER){
      liquidDepth++;
      cursor++;
    }

    const nextMaterial=cells.getCell(px,cursor);
    return {
      top,
      bottom:cursor-1,
      liquidDepth,
      floorY:cells.isSolid(nextMaterial)?cursor:null,
      scanLimited:liquidDepth>=S.columnScanDepth,
    };
  }

  function waterExposureAt(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    let waterCells=0;
    let headWaterCells=0;
    let liquidColumns=0;
    let nearbyLiquidColumns=0;
    let deepColumns=0;
    let nearbyDeepColumns=0;
    let standableColumns=0;
    const columns=[];
    const surfaceTops=[];

    for(let px=bounds.left;px<=bounds.right;px++){
      let seedY=null;
      let overlapsBody=false;
      for(let py=bounds.top;py<=bounds.bottom;py++){
        if(cells.getCell(px,py)!==M.WATER)continue;
        waterCells++;
        overlapsBody=true;
        if(seedY===null)seedY=py;
        if(py===bounds.top)headWaterCells++;
      }

      // A swimmer can briefly rise until the body no longer overlaps water.
      // Search just beneath the feet as well, so deep water remains valid
      // swimming support instead of toggling the player into walking mid-bob.
      if(seedY===null){
        for(let py=bounds.groundRow;py<=bounds.groundRow+S.surfaceLatchDepth;py++){
          if(cells.getCell(px,py)!==M.WATER)continue;
          seedY=py;
          break;
        }
      }
      if(seedY===null)continue;

      nearbyLiquidColumns++;
      if(overlapsBody)liquidColumns++;
      const column=scanWaterColumn(px,seedY);
      surfaceTops.push(column.top);
      const candidateBaseline=column.floorY;
      const waterIsShallow=column.floorY!==null&&column.liquidDepth<=S.maxWadeDepth;
      const hasStandingRoom=waterIsShallow&&!collides(x,candidateBaseline)&&groundProbeAt(x,candidateBaseline);
      if(hasStandingRoom)standableColumns++;
      else{
        nearbyDeepColumns++;
        if(overlapsBody)deepColumns++;
      }
      columns.push({...column,x:px,standable:hasStandingRoom,overlapsBody});
    }

    const requiredDeepColumns=Math.max(1,Math.ceil(player.width*S.minimumDeepColumnRatio));
    const canStand=standableColumns>0;
    surfaceTops.sort((a,b)=>a-b);
    const medianSurface=surfaceTops.length?surfaceTops[Math.floor(surfaceTops.length*.5)]:null;
    const surfaceBaselineY=medianSurface===null?null:medianSurface+S.surfaceBodyDepth;
    return {
      waterCells,
      liquidColumns,
      nearbyLiquidColumns,
      deepColumns,
      nearbyDeepColumns,
      standableColumns,
      canStand,
      columns,
      surfaceBaselineY,
      swimming:
        waterCells>=S.waterCellThreshold&&
        liquidColumns>=requiredDeepColumns&&
        deepColumns>=requiredDeepColumns&&
        !canStand,
      surfaceSwimming:
        nearbyLiquidColumns>=requiredDeepColumns&&
        nearbyDeepColumns>=requiredDeepColumns&&
        !canStand,
      headSubmerged:headWaterCells>=Math.ceil(player.width*.5),
      bounds,
    };
  }

  function blockedAt(x,y){ return cells.isSolid(cells.getCell(x,y))||Boolean(furniture?.solidAt?.(x,y)); }

  function collides(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    for(let py=bounds.top;py<=bounds.bottom;py++){
      for(let px=bounds.left;px<=bounds.right;px++){
        if(blockedAt(px,py))return true;
      }
    }
    return false;
  }

  function groundProbeAt(x,y){
    const player=state.player;
    const bounds=playerPixelBounds(x,y,player.width,player.height);
    for(let px=bounds.left;px<=bounds.right;px++){
      if(blockedAt(px,bounds.groundRow))return true;
    }
    return false;
  }

  function groundProbe(){
    return groundProbeAt(state.player.x,state.player.y);
  }

  function resetMotionRemainder(){
    motionRemainder.x=0;
    motionRemainder.y=0;
  }

  function wholePixelMotion(axis,velocity){
    const total=motionRemainder[axis]+velocity;
    const pixels=Math.trunc(total);
    motionRemainder[axis]=total-pixels;
    return pixels;
  }

  function tryAutoStep(nextX){
    const player=state.player;
    if(!player.grounded||C.autoStepHeight<=0||player.vx===0)return false;

    const targetX=Math.round(nextX);
    const direction=Math.sign(targetX-player.x);
    if(direction===0)return false;

    const nextBounds=playerPixelBounds(targetX,player.y,player.width,player.height);
    const leadingX=direction>0?nextBounds.right:nextBounds.left;
    const footRow=nextBounds.bottom;

    // Only climb a true one-cell ledge. Walls with another solid cell above it
    // continue to behave as walls.
    if(!blockedAt(leadingX,footRow))return false;
    if(blockedAt(leadingX,footRow-C.autoStepHeight))return false;

    const steppedY=player.y-C.autoStepHeight;
    if(collides(targetX,steppedY))return false;

    player.x=targetX;
    player.y=steppedY;
    player.vy=0;
    motionRemainder.y=0;
    return true;
  }

  function moveHorizontal(pixelCount){
    const player=state.player;
    const direction=Math.sign(pixelCount);
    let steppedUp=false;
    let landed=false;

    for(let step=0;step<Math.abs(pixelCount);step++){
      const nextX=player.x+direction;
      if(!collides(nextX,player.y)){
        player.x=nextX;
        continue;
      }
      if(!steppedUp&&tryAutoStep(nextX)){
        steppedUp=true;
        landed=true;
        continue;
      }
      player.vx=0;
      motionRemainder.x=0;
      resetBunnyHop();
      break;
    }

    return landed;
  }

  function moveVertical(pixelCount){
    const player=state.player;
    const direction=Math.sign(pixelCount);
    let landed=false;

    for(let step=0;step<Math.abs(pixelCount);step++){
      const nextY=player.y+direction;
      if(!collides(player.x,nextY)){
        player.y=nextY;
        continue;
      }
      if(direction>0)landed=true;
      player.vy=0;
      motionRemainder.y=0;
      break;
    }

    return landed;
  }

  function candidateOffsets(radius){
    const offsets=[];
    for(let dy=-radius;dy<=radius;dy++){
      for(let dx=-radius;dx<=radius;dx++){
        const distance=Math.abs(dx)+Math.abs(dy);
        if(distance===0||distance>radius)continue;
        offsets.push({dx,dy,distance});
      }
    }
    offsets.sort((a,b)=>{
      if(a.distance!==b.distance)return a.distance-b.distance;
      const aPriority=a.dy<0?0:a.dy===0?1:2;
      const bPriority=b.dy<0?0:b.dy===0?1:2;
      if(aPriority!==bPriority)return aPriority-bPriority;
      if(Math.abs(a.dx)!==Math.abs(b.dx))return Math.abs(a.dx)-Math.abs(b.dx);
      return a.dx-b.dx;
    });
    return offsets;
  }

  function resolveOverlap(maxRadius=12){
    const player=state.player;
    player.x=Math.round(player.x);
    player.y=Math.round(player.y);
    if(!collides(player.x,player.y))return false;

    for(const offset of candidateOffsets(maxRadius)){
      const candidateX=player.x+offset.dx;
      const candidateY=player.y+offset.dy;
      if(collides(candidateX,candidateY))continue;
      player.x=candidateX;
      player.y=candidateY;
      player.vx=0;
      player.vy=0;
      resetMotionRemainder();
      resetBunnyHop();
      player.grounded=groundProbeAt(candidateX,candidateY);
      return true;
    }

    // Last-resort depenetration: remove only the solid cells currently occupying
    // the visible 3x5 sprite. This prevents an unrecoverable trap if a future
    // simulation feature creates an enclosed solid mass around the player.
    const bounds=playerPixelBounds(player.x,player.y,player.width,player.height);
    for(let y=bounds.top;y<=bounds.bottom;y++){
      for(let x=bounds.left;x<=bounds.right;x++){
        if(cells.isSolid(cells.getCell(x,y))){
          cells.setCell(x,y,M.AIR,0,{reason:'player-depenetration'});
        }
      }
    }
    player.vx=0;
    player.vy=0;
    resetMotionRemainder();
    resetBunnyHop();
    player.grounded=groundProbe();
    return true;
  }

  function damage(amount,sourceX=null){
    if(state.player.invulnerability>0)return;
    state.player.hp-=amount;
    juice?.impact?.(state.player.x,state.player.y-2,{kind:'enemy',damage:amount,heavy:amount>=12,shake:amount>=12?3.2:1.4,hitStop:amount>=12?3:1,count:amount>=12?16:9});
    juice?.screenFlash?.('rgba(255,42,62,.24)',5);
    state.player.invulnerability=24;
    state.ui.damageFlash=12;
    if(Number.isFinite(sourceX))state.ui.damageDirection=Math.sign(sourceX-state.player.x);
  }

  function collectCrystals(){
    const player=state.player;
    let found=false;
    for(let y=player.y-5;y<=player.y+1;y++){
      for(let x=player.x-3;x<=player.x+3;x++){
        if(cells.getCell(x,y)===M.CRYSTAL){
          cells.setCell(x,y,M.AIR);
          found=true;
        }
      }
    }

    if(found){
      state.crystals++;
      hud.showMessage(`Crystal collected · total ${state.crystals}`);
    }
  }

  function update(){
    const player=state.player;
    if(player.locked){
      player.vx=0;
      player.vy=0;
      player.grounded=true;
      return;
    }
    if(player.furnitureMode==='sit'){
      player.vx=0;
      player.vy=0;
      player.grounded=true;
      if(player.invulnerability>0)player.invulnerability--;
      return;
    }
    resolveOverlap();
    const previousSwimming=Boolean(player.status?.swimming);
    const pressingLeft=state.input.keys.has('a')||state.input.keys.has('arrowleft');
    const pressingRight=state.input.keys.has('d')||state.input.keys.has('arrowright');
    if(pressingLeft&&!pressingRight)player.facing=-1;
    else if(pressingRight&&!pressingLeft)player.facing=1;
    else if(player.vx<-.04)player.facing=-1;
    else if(player.vx>.04)player.facing=1;
    const initialWater=waterExposureAt(player.x,player.y);
    const parasiteMultiplier=Math.max(.4,Math.min(1,Number(player.parasiteSlowMultiplier)||1));
    const swimming=(initialWater.swimming||(previousSwimming&&initialWater.surfaceSwimming))&&!player.skySpawn;
    const ladder=furniture?.playerOnLadder?.()??null;
    const climbing=Boolean(ladder&&!swimming&&!player.skySpawn);
    const wasGrounded=player.grounded;
    player.grounded=!swimming&&!climbing&&groundProbe();
    state.coyoteFrames=player.grounded?C.coyoteFrames:Math.max(0,state.coyoteFrames-1);
    state.jumpBuffer=Math.max(0,state.jumpBuffer-1);

    const bunny=bunnyHopState();
    if(climbing){
      resetBunnyHop();
      state.coyoteFrames=0;
      const left=state.input.keys.has('a')||state.input.keys.has('arrowleft');
      const right=state.input.keys.has('d')||state.input.keys.has('arrowright');
      const up=state.input.keys.has('w')||state.input.keys.has('arrowup')||state.input.keys.has(' ');
      const down=state.input.keys.has('s')||state.input.keys.has('arrowdown');
      if(left)player.vx-=.08*parasiteMultiplier;
      if(right)player.vx+=.08*parasiteMultiplier;
      player.vx*=.72;
      player.vx=Math.max(-.75,Math.min(.75,player.vx));
      player.vy=up&&!down?-1.05:down&&!up?1.05:0;
      motionRemainder.y=0;
      state.jumpBuffer=0;
    }else if(swimming){
      resetBunnyHop();
      state.jumpBuffer=0;
      state.coyoteFrames=0;
      const left=state.input.keys.has('a')||state.input.keys.has('arrowleft');
      const right=state.input.keys.has('d')||state.input.keys.has('arrowright');
      const up=state.input.keys.has('w')||state.input.keys.has('arrowup')||state.input.keys.has(' ');
      const down=state.input.keys.has('s')||state.input.keys.has('arrowdown');
      if(left)player.vx-=S.acceleration*parasiteMultiplier;
      if(right)player.vx+=S.acceleration*parasiteMultiplier;
      const atSurface=!initialWater.headSubmerged&&Number.isFinite(initialWater.surfaceBaselineY);
      if(up&&initialWater.headSubmerged)player.vy-=S.verticalAcceleration;
      else if(atSurface){
        const surfaceError=initialWater.surfaceBaselineY-player.y;
        if(surfaceError>0)player.vy+=Math.min(S.surfaceSettleAcceleration,surfaceError*S.surfaceSpring);
        else if(surfaceError<0&&!down)player.vy-=Math.min(S.buoyancy,-surfaceError*S.surfaceSpring);
        // Do not let passive buoyancy or held-up input lift the whole sprite
        // clear of deep water. The swimmer treads at the surface until they
        // move onto standable terrain or leave the liquid horizontally.
        if(!down&&player.y<=initialWater.surfaceBaselineY&&player.vy<0){
          player.vy=0;
          motionRemainder.y=0;
        }
      }else player.vy-=S.buoyancy;
      if(down)player.vy+=S.downwardAcceleration;
      player.vx*=S.drag;
      player.vy*=S.drag;
      player.vx=Math.max(-S.maxHorizontalSpeed*parasiteMultiplier,Math.min(S.maxHorizontalSpeed*parasiteMultiplier,player.vx));
      player.vy=Math.max(-S.maxVerticalSpeed,Math.min(S.maxVerticalSpeed,player.vy));
    }else{
      if(!player.skySpawn&&state.jumpBuffer>0&&state.coyoteFrames>0)performJump();
      const airControlMultiplier=Math.min(
        B.maxAirControlMultiplier,
        1+Math.max(0,bunny.chain-1)*B.airControlBonusPerHop,
      );
      if(!player.skySpawn){
        if(state.input.keys.has('a')||state.input.keys.has('arrowleft'))player.vx-=C.acceleration*airControlMultiplier*parasiteMultiplier;
        if(state.input.keys.has('d')||state.input.keys.has('arrowright'))player.vx+=C.acceleration*airControlMultiplier*parasiteMultiplier;
      }
      const preservingMomentum=player.grounded&&bunny.chain>0&&bunny.landingWindow>0;
      player.vx*=player.grounded?(preservingMomentum?B.groundMomentumDrag:C.groundDrag):C.airDrag;
      const speedLimit=C.maxSpeed*bunnySpeedMultiplier(bunny.chain)*parasiteMultiplier;
      player.vx=Math.max(-speedLimit,Math.min(speedLimit,player.vx));
      const gravityScale=generator.dimensionGravityScale?.()??1;
      player.vy=Math.min(C.maxFallSpeed,player.vy+C.gravity*gravityScale);
    }
    const impactVelocity=player.vy;

    const horizontalPixels=wholePixelMotion('x',player.vx);
    const verticalPixels=wholePixelMotion('y',player.vy);
    const steppedLanded=moveHorizontal(horizontalPixels);
    const verticalLanded=moveVertical(verticalPixels);
    let landed=steppedLanded||verticalLanded;

    const previousChunkX=state.world.camera.chunkX;
    const previousChunkY=state.world.camera.chunkY;
    if(chunks.chunkX(player.x)!==previousChunkX||chunks.chunkY(player.y)!==previousChunkY){
      chunks.updateActiveNeighborhood();
      hud.showMessage(`${generator.biomeNameAt(player.x)} · region ${state.world.camera.chunkX}, ${state.world.camera.chunkY}`);
    }

    const postWater=waterExposureAt(player.x,player.y);
    const nowSwimming=(postWater.swimming||(swimming&&postWater.surfaceSwimming))&&!player.skySpawn;
    const stillClimbing=Boolean(furniture?.playerOnLadder?.()&&!nowSwimming&&!player.skySpawn);
    player.grounded=(nowSwimming||stillClimbing)?false:(landed||groundProbe());
    if(player.grounded)state.coyoteFrames=C.coyoteFrames;
    if(!wasGrounded&&player.grounded){
      bunny.lastLandingFrame=state.frame;
      bunny.landingWindow=B.landingWindowFrames;
      bunny.groundFrames=0;
      if(impactVelocity>.3)juice?.land?.(player.x,player.y,impactVelocity);
    }
    if(player.skySpawn&&player.grounded){
      player.skySpawn=false;
      player.spawnGroundY=0;
      player.invulnerability=Math.max(player.invulnerability,60);
      state.jumpBuffer=0;
      resetBunnyHop();
      juice?.screenFlash?.('rgba(220,244,255,.16)',4);
      juice?.shockwave?.(player.x,player.y,'rgb(205,231,244)',8,12);
      hud.showMessage('Touchdown',900);
    }

    if(!player.skySpawn&&player.grounded&&state.jumpBuffer>0)performJump();

    if(player.grounded){
      bunny.groundFrames++;
      if(bunny.landingWindow>0)bunny.landingWindow--;
      if(bunny.chain>0&&bunny.groundFrames>B.groundResetFrames)resetBunnyHop();
    }else{
      bunny.groundFrames=0;
    }

    if(nowSwimming!==previousSwimming){
      juice?.burst?.(player.x,player.y-1,{
        colors:['rgb(218,247,255)','rgb(104,197,235)','rgb(44,123,185)'],
        count:nowSwimming?10:6,speedMin:.18,speedMax:.9,gravity:-.025,lifeMin:10,lifeMax:24,twinkle:2,
      });
      if(nowSwimming)juice?.worldFlash?.(player.x,player.y-1,'rgb(157,225,250)',3,5);
    }
    if(nowSwimming&&postWater.headSubmerged&&state.frame%12===0){
      juice?.burst?.(player.x,postWater.bounds.top,{
        colors:['rgb(232,251,255)','rgb(140,220,248)'],
        count:2,speedMin:.08,speedMax:.28,angle:-Math.PI*.5,spread:.7,gravity:-.035,drag:.98,lifeMin:18,lifeMax:34,twinkle:3,
      });
    }

    const baseDrain=HUNGER_CONFIG.max/HUNGER_CONFIG.fullDrainFrames;
    const moving=Math.abs(player.vx)>.04||!player.grounded;
    player.hungerRemainder+=(moving?baseDrain*HUNGER_CONFIG.movingMultiplier:baseDrain);
    if(player.hungerRemainder>=.01){
      const drain=Math.floor(player.hungerRemainder*100)/100;
      player.hunger=Math.max(0,player.hunger-drain);
      player.hungerRemainder-=drain;
    }
    player.starvationTimer=player.hunger<=0?player.starvationTimer+1:0;
    if(player.starvationTimer>=HUNGER_CONFIG.starvationIntervalFrames){
      player.starvationTimer=0;
      damage(HUNGER_CONFIG.starvationDamage);
    }

    const bounds=playerPixelBounds(player.x,player.y,player.width,player.height);
    let touchesLava=false;
    let touchesFire=false;
    let touchesSteam=false;
    for(let y=bounds.top;y<=bounds.bottom;y++){
      for(let x=bounds.left;x<=bounds.right;x++){
        const material=cells.getCell(x,y);
        if(material===M.LAVA)touchesLava=true;
        if(material===M.FIRE)touchesFire=true;
        if(material===M.STEAM)touchesSteam=true;
      }
    }
    const hasOxygen=dimensionHasOxygen(state.world.dimension);
    const breathUsing=postWater.headSubmerged||!hasOxygen;
    player.status.lava=touchesLava;
    player.status.fire=touchesFire;
    player.status.steam=touchesSteam;
    player.status.starving=player.hunger<=0;
    player.status.swimming=nowSwimming;
    player.status.climbing=stillClimbing;
    player.status.headSubmerged=postWater.headSubmerged;
    player.status.breathUsing=breathUsing;
    player.status.noOxygen=!hasOxygen;

    if(breathUsing){
      player.breathRemainder+=R.max/R.fullDrainFrames;
      if(player.breathRemainder>=.01){
        const drain=Math.floor(player.breathRemainder*100)/100;
        player.breath=Math.max(0,player.breath-drain);
        player.breathRemainder-=drain;
      }
    }else{
      player.breathRemainder-=R.max/R.fullRecoveryFrames;
      if(player.breathRemainder<=-.01){
        const recovery=Math.floor(-player.breathRemainder*100)/100;
        player.breath=Math.min(R.max,player.breath+recovery);
        player.breathRemainder+=recovery;
      }
    }
    player.drowningTimer=player.breath<=0?player.drowningTimer+1:0;
    if(player.drowningTimer>=R.drowningIntervalFrames){
      player.drowningTimer=0;
      damage(R.drowningDamage);
      juice?.burst?.(player.x,postWater.bounds.top,{
        colors:['rgb(235,251,255)','rgb(105,191,230)'],count:8,speedMin:.18,speedMax:.7,gravity:-.04,lifeMin:14,lifeMax:28,
      });
    }

    if(touchesLava)damage(5);
    if(touchesFire)damage(4);
    if(touchesSteam)damage(STEAM_CONFIG.playerDamage);

    if(player.skySpawn)player.invulnerability=Math.max(player.invulnerability,60);
    if(player.invulnerability>0)player.invulnerability--;
    if(state.cooldown>0)state.cooldown--;
    if(state.swordTimer>0)state.swordTimer--;
    if(state.toolEffect.frames>0)state.toolEffect.frames--;
    if(state.input.pointerDown)weapons.attack();

    collectCrystals();

    if(player.hp<=0){
      player.hp=0;
      state.paused=true;
      hud.showMessage('You died — press R to generate a new world',5000);
    }
  }

  function releaseJump(){
    if(state.player.vy<-.45)state.player.vy*=.55;
  }

  return {
    update,
    releaseJump,
    damage,
    collides,
    groundProbe,
    groundProbeAt,
    tryAutoStep,
    resolveOverlap,
    resetMotionRemainder,
    resetBunnyHop,
    bunnyJumpMultiplier,
    bunnySpeedMultiplier,
    waterExposureAt,
  };
}
