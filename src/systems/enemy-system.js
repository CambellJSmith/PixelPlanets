import { MaterialId } from '../data/materials.db.js';
import { STEAM_CONFIG, ENEMY_BEHAVIOR_CONFIG } from '../config.js';
import { faunaById, faunaBehaviors, INVADER_SPECIES_BY_DIMENSION } from '../data/fauna.db.js';
import { WEAPON_DB } from '../data/weapons.db.js';
import { DIMENSION_IDS, dimensionDefinition } from '../data/dimensions.db.js';
import { nearestPixel } from '../pixel-grid.js';
import { furnitureSolidAt } from '../data/furniture.db.js';

const VOLCANIC_FAUNA=new Set([
  'ember_lizard','ash_beetle','magma_moth','cinder_imp','fire_bat',
  'lava_crab','ash_crawler','obsidian_scarab','ember_raider',
]);

export function createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud,juice=null){
  const M=MaterialId;
  const C=ENEMY_BEHAVIOR_CONFIG;

  function legacySpecies(enemy){
    return{
      id:'legacy_wisp',name:'cave wisp',temperament:'hostile',movement:'flying',habitat:'cave_air',
      hp:enemy.maxHp??30,contactDamage:5,speed:.35,aggroRange:48,fleeRange:0,
      width:3,height:3,hitRadius:2,animationRate:8,sprite:'wisp',palette:[[195,65,100],[255,170,190],[84,34,60]],loot:[],behaviors:[],
    };
  }

  function speciesOf(enemy){ return faunaById(enemy.speciesId)??legacySpecies(enemy); }
  function behaviorsOf(species){ return faunaBehaviors(species); }
  function hasBehavior(species,name){ return behaviorsOf(species).includes(name); }

  function randomAt(x,y,salt){
    const sampled=noise?.randomAt?.(x,y,salt);
    if(Number.isFinite(sampled))return sampled;
    const raw=Math.sin((Number(x)||0)*12.9898+(Number(y)||0)*78.233+(Number(salt)||0)*37.719)*43758.5453;
    return raw-Math.floor(raw);
  }

  function randomInt(min,max,x,y,salt){
    return min+Math.floor(randomAt(x,y,salt)*(max-min+1));
  }

  function creatureAt(species,x,y,salt=state.frame,extra={}){
    return{
      speciesId:species.id,x:nearestPixel(x),y:nearestPixel(y),vx:0,vy:0,moveCarryX:0,moveCarryY:0,
      hp:species.hp,maxHp:species.hp,phase:randomAt(x,y,salt)*Math.PI*2,
      animationOffset:Math.floor(randomAt(y,x,salt+1)*240),facing:randomAt(x,y,salt+2)<.5?-1:1,
      hit:0,burning:0,attackCooldown:0,hopCooldown:20+Math.floor(randomAt(x,y,salt+3)*90),
      idleTimer:20+Math.floor(randomAt(y,x,salt+4)*120),startled:0,
      nestTimer:randomInt(Math.floor(C.nestBuildFrames*.65),C.nestBuildFrames,x,y,salt+5),
      burrowCooldown:randomInt(30,C.burrowCooldownFrames,x,y,salt+6),
      theftCooldown:0,
      ...extra,
    };
  }

  function spawnCreature(speciesId,x,y,extra={}){
    const species=faunaById(speciesId);
    if(!species)return null;
    const chunk=chunks.getChunk(chunks.chunkX(x),chunks.chunkY(y),true);
    const enemy=creatureAt(species,x,y,state.frame+chunk.enemies.length*17,extra);
    chunk.enemies.push(enemy);
    chunk.saveEnemies=true;
    return enemy;
  }

  function dropLoot(enemy,species){
    let dropped=0;
    for(let index=0;index<(species.loot?.length??0);index++){
      const [lootId,min,max,chance]=species.loot[index];
      if(randomAt(enemy.x+index,enemy.y,state.frame+8101+index)>(chance??1))continue;
      const amount=randomInt(min,max,enemy.y,enemy.x,state.frame+8201+index);
      if(amount<=0)continue;
      crops.spawnLootPickup(lootId,enemy.x+(index%3)-1,enemy.y,amount,1.35);
      dropped+=amount;
    }
    if(dropped>0&&(species.spawnWeight??1)<.32)hud.showMessage(`${species.name} dropped rare loot`,850);
  }

  function isWater(type){ return type===M.WATER; }
  function blockedAt(x,y){ return cells.isSolid(cells.getCell(x,y))||furnitureSolidAt(state.entities.furniture,x,y,state.world.dimension); }

  function canOccupy(enemy,species,x,y){
    if(!chunks.isActiveWorldPosition(x,y))return false;
    const type=cells.getCell(x,y);
    if(enemy.burrowed)return cells.isSolid(type)&&type!==M.LAVA;
    if(species.movement==='swimming')return isWater(type);
    if(species.movement==='flying')return !blockedAt(x,y)&&type!==M.WATER&&type!==M.LAVA;
    return !blockedAt(x,y)&&type!==M.LAVA;
  }

  function onGround(enemy){ return blockedAt(enemy.x,enemy.y+1); }

  function moveHorizontal(enemy,species,pixels){
    const direction=Math.sign(pixels);
    let collided=false;
    for(let step=0;step<Math.abs(pixels);step++){
      const nextX=enemy.x+direction;
      if(canOccupy(enemy,species,nextX,enemy.y)){
        enemy.x=nextX;
        continue;
      }
      if(enemy.burrowed){
        for(const offset of [1,-1,2,-2]){
          if(canOccupy(enemy,species,nextX,enemy.y+offset)){
            enemy.x=nextX;
            enemy.y+=offset;
            break;
          }
        }
        if(enemy.x===nextX)continue;
      }
      if(!['flying','swimming'].includes(species.movement)&&canOccupy(enemy,species,nextX,enemy.y-1)&&!blockedAt(nextX,enemy.y)){
        enemy.x=nextX;
        enemy.y--;
        continue;
      }
      collided=true;
      enemy.wallDirection=direction;
      enemy.vx*=-.45;
      enemy.moveCarryX=0;
      if(!hasBehavior(species,'wall_climber'))enemy.facing*=-1;
      break;
    }
    return collided;
  }

  function moveVertical(enemy,species,pixels){
    const direction=Math.sign(pixels);
    let collided=false;
    for(let step=0;step<Math.abs(pixels);step++){
      const nextY=enemy.y+direction;
      if(canOccupy(enemy,species,enemy.x,nextY)){
        enemy.y=nextY;
        continue;
      }
      collided=true;
      enemy.vy*=-(['flying','swimming'].includes(species.movement)?.6:.2);
      enemy.moveCarryY=0;
      break;
    }
    return collided;
  }

  function consumeMotion(enemy,species){
    enemy.moveCarryX=(enemy.moveCarryX??0)+enemy.vx;
    enemy.moveCarryY=(enemy.moveCarryY??0)+enemy.vy;
    const pixelsX=Math.trunc(enemy.moveCarryX);
    const pixelsY=Math.trunc(enemy.moveCarryY);
    enemy.moveCarryX-=pixelsX;
    enemy.moveCarryY-=pixelsY;
    const wallHit=moveHorizontal(enemy,species,pixelsX);
    const verticalHit=moveVertical(enemy,species,pixelsY);
    enemy.x=nearestPixel(enemy.x);
    enemy.y=nearestPixel(enemy.y);
    return{wallHit,verticalHit};
  }

  function wanderDirection(enemy){
    if((enemy.idleTimer??0)>0){ enemy.idleTimer--; return enemy.wanderDirection??enemy.facing??1; }
    enemy.idleTimer=35+Math.floor(randomAt(enemy.x,enemy.y,state.frame+8301)*130);
    enemy.wanderDirection=randomAt(enemy.y,enemy.x,state.frame+8302)<.5?-1:1;
    return enemy.wanderDirection;
  }

  function packContext(enemy,species,enemies){
    if(!hasBehavior(species,'pack_hunter'))return{count:1,centerX:enemy.x,centerY:enemy.y,speedMultiplier:1,flankOffset:0};
    let count=0;
    let centerX=0;
    let centerY=0;
    for(const ally of enemies){
      if(ally===enemy||ally.speciesId!==enemy.speciesId||ally.hp<=0)continue;
      if(Math.hypot(ally.x-enemy.x,ally.y-enemy.y)>C.packRadius)continue;
      count++;
      centerX+=ally.x;
      centerY+=ally.y;
    }
    count++;
    centerX=(centerX+enemy.x)/count;
    centerY=(centerY+enemy.y)/count;
    const bonus=Math.min(C.packMaxSpeedBonus,Math.max(0,count-1)*C.packSpeedBonusPerAlly);
    const side=((enemy.animationOffset??0)%2===0?1:-1);
    enemy.packCount=count;
    return{count,centerX,centerY,speedMultiplier:1+bonus,flankOffset:side*C.packFlankDistance};
  }

  function nearestPickup(enemy){
    let best=null;
    let bestDistance=C.scavengerSenseRadius;
    for(const pickup of state.entities.pickups){
      if((pickup.life??1)<=0)continue;
      const distance=Math.hypot(pickup.x-enemy.x,pickup.y-enemy.y);
      if(distance<bestDistance){ best=pickup; bestDistance=distance; }
    }
    return best?{pickup:best,distance:bestDistance}:null;
  }

  function consumePickup(enemy,species,pickup){
    const index=state.entities.pickups.indexOf(pickup);
    if(index<0)return false;
    state.entities.pickups.splice(index,1);
    const amount=Math.max(1,pickup.amount??1);
    enemy.hp=Math.min(enemy.maxHp,enemy.hp+C.scavengerHealPerItem*amount);
    enemy.fedLevel=Math.min(6,(enemy.fedLevel??0)+1);
    enemy.maxHp+=enemy.fedLevel%2===0?1:0;
    juice?.burst?.(enemy.x,enemy.y-1,{colors:['rgb(245,220,126)','rgb(255,255,228)'],count:6,speedMin:.1,speedMax:.45,gravity:-.02,lifeMin:8,lifeMax:18});
    if(Math.hypot(state.player.x-enemy.x,state.player.y-enemy.y)<28)hud.showMessage(`${species.name} ate a dropped item`,650);
    return true;
  }

  function updateGround(enemy,species,dx,dy,distance,enemies){
    const grounded=onGround(enemy);
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let direction=wanderDirection(enemy);
    let targetSpeed=species.speed*.42;

    const scavenging=hasBehavior(species,'scavenger')?nearestPickup(enemy):null;
    if(scavenging&&(!hostile||distance>11)){
      const pickupDx=scavenging.pickup.x-enemy.x;
      direction=Math.sign(pickupDx)||direction;
      targetSpeed=species.speed*.82;
      enemy.scavenging=true;
      if(scavenging.distance<2.3)consumePickup(enemy,species,scavenging.pickup);
    }else{
      enemy.scavenging=false;
      if(hostile&&distance<species.aggroRange){
        const targetX=state.player.x+(pack.count>1&&distance<18?pack.flankOffset:0);
        direction=Math.sign(targetX-enemy.x)||enemy.facing;
        targetSpeed=species.speed*pack.speedMultiplier;
      }else if(!hostile&&distance<species.fleeRange){
        direction=-Math.sign(dx)||enemy.facing;
        targetSpeed=species.speed*1.15;
        enemy.startled=30;
      }
    }

    if(species.movement==='charger'&&hostile&&distance<18){
      enemy.chargeTimer=(enemy.chargeTimer??0)-1;
      if(enemy.chargeTimer<=0){
        enemy.chargeTimer=70;
        enemy.vx=direction*species.speed*2.2;
      }
    }

    enemy.facing=direction||enemy.facing||1;
    enemy.vx+=(direction*targetSpeed-enemy.vx)*.18;
    enemy.vx*=grounded?.82:.95;

    const hopper=species.movement==='hopper';
    enemy.hopCooldown=(enemy.hopCooldown??0)-1;
    if(grounded&&enemy.hopCooldown<=0&&hopper){
      enemy.vy=-.82;
      enemy.hopCooldown=35+Math.floor(randomAt(enemy.x,enemy.y,state.frame+8401)*75);
    }

    if(hasBehavior(species,'wall_climber')){
      const wallDirection=Math.sign(direction)||enemy.facing||1;
      const wallSolid=blockedAt(enemy.x+wallDirection,enemy.y);
      const verticalDirection=Math.sign(dy)||-1;
      if(wallSolid&&!blockedAt(enemy.x,enemy.y+verticalDirection)){
        enemy.climbing=true;
        enemy.facing=wallDirection;
        enemy.vx=wallDirection*.06;
        enemy.vy+=(verticalDirection*species.speed*.9-enemy.vy)*.35;
      }else if(enemy.climbing&&blockedAt(enemy.x+enemy.facing,enemy.y)){
        enemy.vx=enemy.facing*.05;
        enemy.vy+=(verticalDirection*species.speed*.8-enemy.vy)*.28;
      }else enemy.climbing=false;
    }

    if(!enemy.climbing)enemy.vy=Math.min(1.2,(enemy.vy??0)+.09);
  }

  function updateFlying(enemy,species,dx,dy,distance,enemies){
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let directionX=Math.sin(enemy.phase*.73);
    let directionY=Math.cos(enemy.phase*1.17)*.55;
    let speed=species.speed*.55;

    if(hostile&&distance<species.aggroRange){
      const targetX=state.player.x+(pack.count>1?pack.flankOffset:0);
      directionX=(targetX-enemy.x)/Math.max(1,distance);
      directionY=dy/distance;
      speed=species.speed*pack.speedMultiplier;
    }else if(!hostile&&distance<species.fleeRange){
      directionX=-dx/distance;
      directionY=-dy/distance;
      speed=species.speed*1.1;
      enemy.startled=30;
    }

    enemy.facing=Math.sign(directionX)||enemy.facing||1;
    enemy.vx+=(directionX*speed-enemy.vx)*.12;
    enemy.vy+=(directionY*speed-enemy.vy)*.12;
    enemy.vx*=.94;
    enemy.vy*=.94;
  }

  function updateSwimming(enemy,species,dx,dy,distance,enemies){
    const hostile=species.temperament==='hostile';
    const pack=packContext(enemy,species,enemies);
    let directionX=Math.sin(enemy.phase*.61);
    let directionY=Math.cos(enemy.phase*.83)*.45;
    let speed=species.speed*.55;

    if(hostile&&distance<species.aggroRange){
      directionX=dx/distance;
      directionY=dy/distance;
      speed=species.speed*pack.speedMultiplier;
    }else if(!hostile&&distance<species.fleeRange){
      directionX=-dx/distance;
      directionY=-dy/distance;
      speed=species.speed*1.15;
      enemy.startled=30;
    }

    enemy.facing=Math.sign(directionX)||enemy.facing||1;
    enemy.vx+=(directionX*speed-enemy.vx)*.16;
    enemy.vy+=(directionY*speed-enemy.vy)*.16;
    enemy.vx*=.92;
    enemy.vy*=.92;
  }

  function findBurrowCell(enemy){
    for(let depth=1;depth<=4;depth++){
      const y=enemy.y+depth;
      const type=cells.getCell(enemy.x,y);
      if(cells.isSolid(type)&&type!==M.LAVA)return y;
    }
    return null;
  }

  function emergeBurrower(enemy){
    for(let rise=1;rise<=10;rise++){
      const candidateY=enemy.y-rise;
      if(cells.isSolid(cells.getCell(enemy.x,candidateY)))continue;
      if(cells.isSolid(cells.getCell(enemy.x,candidateY+1))){
        enemy.y=candidateY;
        enemy.burrowed=false;
        enemy.hidden=false;
        enemy.vy=-.55;
        enemy.burrowCooldown=C.burrowCooldownFrames;
        juice?.burst?.(enemy.x,enemy.y,{colors:['rgb(128,91,57)','rgb(190,147,91)','rgb(72,59,49)'],count:12,speedMin:.18,speedMax:.8,gravity:.08,lifeMin:10,lifeMax:26});
        return true;
      }
    }
    return false;
  }

  function updateBurrower(enemy,species,dx,distance){
    enemy.burrowCooldown=Math.max(0,(enemy.burrowCooldown??0)-1);
    if(enemy.burrowed){
      enemy.hidden=true;
      enemy.burrowTimer--;
      enemy.facing=Math.sign(dx)||enemy.facing||1;
      enemy.vx+=(enemy.facing*species.speed*1.18-enemy.vx)*.22;
      enemy.vy*=.3;
      if(distance<=C.burrowEmergeDistance||enemy.burrowTimer<=0)emergeBurrower(enemy);
      return true;
    }
    if(distance<species.aggroRange&&distance>C.burrowEmergeDistance+2&&enemy.burrowCooldown<=0&&onGround(enemy)){
      const burrowY=findBurrowCell(enemy);
      if(burrowY!==null){
        enemy.y=burrowY;
        enemy.burrowed=true;
        enemy.hidden=true;
        enemy.burrowTimer=randomInt(C.burrowDurationMin,C.burrowDurationMax,enemy.x,enemy.y,state.frame+8411);
        enemy.vy=0;
        juice?.burst?.(enemy.x,enemy.y-1,{colors:['rgb(128,91,57)','rgb(190,147,91)'],count:8,speedMin:.15,speedMax:.65,gravity:.08,lifeMin:9,lifeMax:20});
        return true;
      }
    }
    return false;
  }

  function updateMimic(enemy,species,distance){
    if(!hasBehavior(species,'mimic'))return false;
    if(enemy.mimicAwake===undefined)enemy.mimicAwake=false;
    if(!enemy.mimicAwake){
      enemy.hidden=true;
      enemy.disguised=true;
      enemy.vx=0;
      enemy.vy=0;
      if(distance<9||enemy.hit>0||enemy.burning>0){
        enemy.mimicAwake=true;
        enemy.hidden=false;
        enemy.disguised=false;
        enemy.vy=-.62;
        juice?.shockwave?.(enemy.x,enemy.y,'rgb(197,116,72)',8,10);
        juice?.burst?.(enemy.x,enemy.y-2,{colors:['rgb(123,79,43)','rgb(219,155,78)','rgb(245,228,170)'],count:16,speedMin:.2,speedMax:.95,gravity:.06,lifeMin:12,lifeMax:28});
        hud.showMessage(`${species.name} awakened`,750);
      }
      return !enemy.mimicAwake;
    }
    enemy.hidden=false;
    enemy.disguised=false;
    return false;
  }

  function buildNest(enemy,species,distance){
    if(!hasBehavior(species,'nest_builder'))return;
    enemy.nestTimer=(enemy.nestTimer??C.nestBuildFrames)-1;
    if(enemy.nestTimer>0||distance<22||!onGround(enemy)||state.entities.enemyNests.length>=C.maxNests)return;
    if(state.entities.enemyNests.some(nest=>Math.hypot(nest.x-enemy.x,nest.y-enemy.y)<18)){
      enemy.nestTimer=Math.floor(C.nestBuildFrames*.6);
      return;
    }
    state.entities.enemyNests.push({
      id:`nest-${state.world.dimension}-${state.frame}-${enemy.animationOffset??0}`,
      x:nearestPixel(enemy.x),y:nearestPixel(enemy.y),speciesId:species.id,
      hp:34,maxHp:34,life:C.nestLifeFrames,spawnTimer:C.nestSpawnFrames,
      phase:randomAt(enemy.x,enemy.y,state.frame+8501)*Math.PI*2,
    });
    enemy.nestTimer=C.nestBuildFrames;
    juice?.burst?.(enemy.x,enemy.y,{colors:['rgb(161,126,82)','rgb(221,199,145)','rgb(91,69,50)'],count:10,speedMin:.1,speedMax:.55,gravity:.06,lifeMin:12,lifeMax:26});
  }

  function validSpawnNear(x,y,species){
    for(let radius=1;radius<=C.nestSpawnRadius;radius++){
      for(const direction of [-1,1]){
        const px=nearestPixel(x+radius*direction);
        for(let py=nearestPixel(y-5);py<=nearestPixel(y+3);py++){
          if(!chunks.isActiveWorldPosition(px,py))continue;
          if(species.movement==='flying'){
            if(!cells.isSolid(cells.getCell(px,py))&&cells.getCell(px,py)!==M.WATER)return{x:px,y:py};
          }else if(species.movement==='swimming'){
            if(cells.getCell(px,py)===M.WATER)return{x:px,y:py};
          }else if(!cells.isSolid(cells.getCell(px,py))&&cells.isSolid(cells.getCell(px,py+1))){
            return{x:px,y:py};
          }
        }
      }
    }
    return null;
  }

  function activeEnemyCount(){
    let count=0;
    for(const chunk of state.world.activeChunks)count+=chunk.enemies.length;
    return count;
  }

  function updateNests(){
    const nests=state.entities.enemyNests;
    for(let i=nests.length-1;i>=0;i--){
      const nest=nests[i];
      if(!chunks.isActiveWorldPosition(nest.x,nest.y))continue;
      nest.life--;
      nest.phase=(nest.phase??0)+.025;
      if(nest.life<=0||nest.hp<=0||!cells.isSolid(cells.getCell(nest.x,nest.y+1))){
        if(nest.hp<=0)juice?.enemyDeath?.(nest.x,nest.y,'rgb(177,132,83)');
        nests.splice(i,1);
        continue;
      }
      nest.spawnTimer--;
      if(nest.spawnTimer>0||activeEnemyCount()>=C.nestEnemyCap)continue;
      const species=faunaById(nest.speciesId);
      if(!species){ nests.splice(i,1); continue; }
      const position=validSpawnNear(nest.x,nest.y,species);
      if(position){
        spawnCreature(species.id,position.x,position.y,{fromNest:true,nestTimer:C.nestBuildFrames});
        juice?.burst?.(position.x,position.y,{colors:['rgb(225,202,153)','rgb(145,104,70)'],count:8,speedMin:.12,speedMax:.45,gravity:.03,lifeMin:10,lifeMax:20});
      }
      nest.spawnTimer=C.nestSpawnFrames+randomInt(-120,180,nest.x,nest.y,state.frame+8511);
    }
  }

  function returnStolenWeapon(enemy,quiet=false){
    if(!Number.isInteger(enemy?.stolenWeaponId))return false;
    if(state.player.stolenWeaponId===enemy.stolenWeaponId)state.player.stolenWeaponId=null;
    if(!quiet)hud.showMessage('Stolen weapon recovered',900);
    enemy.stolenWeaponId=null;
    return true;
  }

  function nextAvailableWeapon(current){
    const count=WEAPON_DB.length;
    for(let offset=1;offset<=count;offset++){
      const candidate=(current+offset)%count;
      if(candidate!==state.player.stolenWeaponId)return candidate;
    }
    return 0;
  }

  function stealWeapon(enemy,species){
    if(!hasBehavior(species,'weapon_thief'))return false;
    if(Number.isInteger(state.player.stolenWeaponId)||state.player.weaponTheftCooldown>0||Number.isInteger(enemy.stolenWeaponId))return false;
    enemy.stolenWeaponId=state.weaponId;
    state.player.stolenWeaponId=state.weaponId;
    state.player.weaponTheftCooldown=C.weaponTheftCooldown;
    state.weaponId=nextAvailableWeapon(state.weaponId);
    enemy.fleeingWithWeapon=true;
    enemy.startled=180;
    juice?.worldFlash?.(enemy.x,enemy.y-2,'rgb(255,220,91)',6,7);
    hud.showMessage(`${species.name} stole your weapon!`,1200);
    hud.update();
    return true;
  }

  function attachParasite(enemy,species,chunk,index){
    if(!hasBehavior(species,'parasite')||(enemy.attachCooldown??0)>0)return false;
    const attached=state.player.attachedParasites??(state.player.attachedParasites=[]);
    if(attached.length>=C.parasiteMaxAttached)return false;
    attached.push({speciesId:species.id,life:C.parasiteLifeFrames,phase:enemy.phase??0,damageTimer:C.parasiteDamageInterval,shake:0});
    chunk.enemies.splice(index,1);
    chunk.saveEnemies=true;
    juice?.burst?.(state.player.x,state.player.y-2,{colors:['rgb(255,70,190)','rgb(95,255,214)'],count:8,speedMin:.12,speedMax:.52,gravity:-.01,lifeMin:10,lifeMax:20});
    hud.showMessage(`${species.name} latched on — move and jump to shake it off`,1100);
    return true;
  }

  function updateAttachedParasites(){
    const attached=state.player.attachedParasites??(state.player.attachedParasites=[]);
    state.player.weaponTheftCooldown=Math.max(0,(state.player.weaponTheftCooldown??0)-1);
    for(let i=attached.length-1;i>=0;i--){
      const parasite=attached[i];
      parasite.life--;
      parasite.phase=(parasite.phase??0)+.18;
      parasite.damageTimer=(parasite.damageTimer??C.parasiteDamageInterval)-1;
      parasite.shake=(parasite.shake??0)+Math.abs(state.player.vx)*.28+Math.abs(state.player.vy)*.18;
      if(parasite.damageTimer<=0){
        playerSystem.damage(C.parasiteDamage);
        parasite.damageTimer=C.parasiteDamageInterval;
        juice?.impact?.(state.player.x,state.player.y-2,{kind:'parasite',damage:C.parasiteDamage,color:'rgb(255,72,190)'});
      }
      if(parasite.life<=0||parasite.shake>=42){
        const species=faunaById(parasite.speciesId);
        attached.splice(i,1);
        if(species){
          spawnCreature(species.id,state.player.x-state.player.facing*4,state.player.y-3,{hp:Math.max(1,Math.floor(species.hp*.45)),startled:120,vx:-state.player.facing*.8,attachCooldown:180});
        }
        juice?.burst?.(state.player.x,state.player.y-2,{colors:['rgb(255,87,191)','rgb(91,250,218)'],count:10,speedMin:.18,speedMax:.8,gravity:.03,lifeMin:10,lifeMax:24});
        hud.showMessage('Parasite shaken off',700);
      }
    }
    state.player.parasiteSlowMultiplier=Math.max(C.parasiteMinimumSpeedMultiplier,1-attached.length*C.parasiteSlowPerAttachment);
  }

  function invasionPosition(x,y){
    for(let radius=0;radius<=10;radius++){
      for(const direction of [1,-1]){
        const px=nearestPixel(x+radius*direction);
        for(let py=nearestPixel(y-8);py<=nearestPixel(y+6);py++){
          if(!chunks.isActiveWorldPosition(px,py))continue;
          if(!cells.isSolid(cells.getCell(px,py))&&!cells.isSolid(cells.getCell(px,py-1)))return{x:px,y:py};
        }
      }
    }
    return{x:nearestPixel(x),y:nearestPixel(y)};
  }

  function openInvasionPortal(sourceDimension,x=state.player.x+32,y=state.player.y-4,{waveSize=null}={}){
    if(state.entities.invasionPortals.length>=C.maxInvasionPortals)return null;
    const position=invasionPosition(x,y);
    const definition=dimensionDefinition(sourceDimension);
    const portal={
      id:`invasion-${state.world.invasionSerial??1}`,
      x:position.x,y:position.y,sourceDimension:definition.id,age:0,
      life:C.invasionPortalLifeFrames,spawnTimer:C.invasionPortalOpenFrames,
      waveSize:waveSize??randomInt(C.invasionPortalWaveMin,C.invasionPortalWaveMax,position.x,position.y,state.frame+8601),
      spawned:0,phase:randomAt(position.x,position.y,state.frame+8602)*Math.PI*2,
    };
    state.world.invasionSerial=(state.world.invasionSerial??1)+1;
    state.entities.invasionPortals.push(portal);
    juice?.shockwave?.(portal.x,portal.y,definition.portalColors?.[1]??'rgb(190,90,255)',13,18);
    juice?.screenFlash?.('rgba(180,70,255,.13)',5);
    hud.showMessage(`Unstable ${definition.name} rift detected`,1200);
    return portal;
  }

  function scheduleNextInvasion({initial=false}={}){
    const minFrames=initial?C.invasionPortalInitialMinFrames:C.invasionPortalMinFrames;
    const maxFrames=initial?C.invasionPortalInitialMaxFrames:C.invasionPortalMaxFrames;
    state.world.nextInvasionFrame=state.frame+randomInt(minFrames,maxFrames,state.player.x,state.player.y,state.frame+8611);
  }

  function maybeOpenInvasion(){
    if(!Number.isFinite(state.world.nextInvasionFrame))scheduleNextInvasion({initial:(state.world.invasionCount??0)===0});
    if(state.frame<state.world.nextInvasionFrame||state.entities.invasionPortals.length>=C.maxInvasionPortals||state.player.skySpawn||state.player.locked)return;
    const current=state.world.dimension??'earth';
    const choices=DIMENSION_IDS.filter(id=>id!==current);
    const source=choices[Math.floor(randomAt(state.player.x,state.player.y,state.frame+8621)*choices.length)]??'static';
    const side=randomAt(state.player.y,state.player.x,state.frame+8622)<.5?-1:1;
    const portal=openInvasionPortal(source,state.player.x+side*randomInt(25,42,state.player.x,state.player.y,state.frame+8623),state.player.y-3);
    if(portal)state.world.invasionCount=(state.world.invasionCount??0)+1;
    scheduleNextInvasion();
  }

  function updateInvasionPortals(){
    maybeOpenInvasion();
    for(let i=state.entities.invasionPortals.length-1;i>=0;i--){
      const portal=state.entities.invasionPortals[i];
      portal.age++;
      portal.life--;
      portal.phase+=.08;
      portal.spawnTimer--;
      if(portal.spawnTimer<=0&&portal.spawned<Math.min(portal.waveSize,C.maxInvadersPerPortal)){
        const choices=INVADER_SPECIES_BY_DIMENSION[portal.sourceDimension]??INVADER_SPECIES_BY_DIMENSION.static;
        const speciesId=choices[portal.spawned%choices.length];
        const species=faunaById(speciesId);
        if(species){
          const position=validSpawnNear(portal.x,portal.y,species)??{x:portal.x,y:portal.y};
          spawnCreature(speciesId,position.x,position.y,{invader:true,sourceDimension:portal.sourceDimension,startled:45});
          juice?.burst?.(position.x,position.y,{colors:dimensionDefinition(portal.sourceDimension).portalColors,count:12,speedMin:.16,speedMax:.82,gravity:.01,lifeMin:12,lifeMax:26});
        }
        portal.spawned++;
        portal.spawnTimer=C.invasionPortalSpawnInterval;
      }
      if(portal.life<=0||(portal.spawned>=portal.waveSize&&portal.age>C.invasionPortalOpenFrames+portal.waveSize*C.invasionPortalSpawnInterval+90)){
        juice?.shockwave?.(portal.x,portal.y,dimensionDefinition(portal.sourceDimension).portalColors?.[0]??'rgb(190,90,255)',8,10);
        state.entities.invasionPortals.splice(i,1);
      }
    }
  }

  function updateEnvironment(enemy,species){
    const material=cells.getCell(enemy.x,enemy.y);
    const volcanic=VOLCANIC_FAUNA.has(species.id);
    if(material===M.LAVA&&!volcanic)enemy.hp-=.45;
    if(material===M.FIRE&&!volcanic){
      enemy.hp-=.24;
      enemy.burning=Math.max(enemy.burning,100);
    }
    if(material===M.STEAM)enemy.hp-=STEAM_CONFIG.enemyDamagePerFrame;
    if(species.movement==='swimming'&&!isWater(material))enemy.hp-=.06;
  }

  function update(){
    updateAttachedParasites();
    updateNests();
    updateInvasionPortals();
    const transfers=[];
    const camera=state.world.camera;
    for(const chunk of state.world.activeChunks){
      if(chunk.x!==camera.chunkX||chunk.y!==camera.chunkY)continue;
      for(let i=chunk.enemies.length-1;i>=0;i--){
        const enemy=chunk.enemies[i];
        const species=speciesOf(enemy);

        if(enemy.hp<=0){
          returnStolenWeapon(enemy);
          const color=species.palette?.[0]??[255,120,100];
          juice?.enemyDeath?.(enemy.x,enemy.y,`rgb(${color[0]},${color[1]},${color[2]})`);
          dropLoot(enemy,species);
          chunk.enemies.splice(i,1);
          chunk.saveEnemies=true;
          continue;
        }

        enemy.phase=(enemy.phase??0)+.04;
        enemy.age=(enemy.age??0)+1;
        if(enemy.hit>0)enemy.hit--;
        if(enemy.startled>0)enemy.startled--;
        if(enemy.attackCooldown>0)enemy.attackCooldown--;
        if(enemy.theftCooldown>0)enemy.theftCooldown--;
        if(enemy.attachCooldown>0)enemy.attachCooldown--;

        if(enemy.burning>0){
          enemy.burning--;
          if(!VOLCANIC_FAUNA.has(species.id))enemy.hp-=.16;
          if(state.frame%9===0&&cells.getCell(enemy.x,enemy.y)===M.AIR)cells.setCell(enemy.x,enemy.y,M.FIRE,30);
        }

        const dx=state.player.x-enemy.x;
        const dy=state.player.y-2-enemy.y;
        const distance=Math.hypot(dx,dy)||1;

        if(updateMimic(enemy,species,distance))continue;
        const burrowing=hasBehavior(species,'burrower')&&updateBurrower(enemy,species,dx,distance);
        if(!burrowing){
          if(species.movement==='flying')updateFlying(enemy,species,dx,dy,distance,chunk.enemies);
          else if(species.movement==='swimming')updateSwimming(enemy,species,dx,dy,distance,chunk.enemies);
          else updateGround(enemy,species,dx,dy,distance,chunk.enemies);
        }

        if(enemy.fleeingWithWeapon){
          enemy.facing=-Math.sign(dx)||enemy.facing||1;
          enemy.vx+=(enemy.facing*species.speed*1.35-enemy.vx)*.25;
          if(distance>50)enemy.fleeingWithWeapon=false;
        }

        consumeMotion(enemy,species);
        updateEnvironment(enemy,species);
        buildNest(enemy,species,distance);

        const contactRadius=(species.hitRadius??2)+1.4;
        if(!enemy.burrowed&&species.temperament==='hostile'&&distance<contactRadius&&enemy.attackCooldown<=0){
          if(attachParasite(enemy,species,chunk,i))continue;
          if(!stealWeapon(enemy,species))playerSystem.damage(species.contactDamage);
          enemy.attackCooldown=28;
        }

        const targetChunkX=chunks.chunkX(enemy.x);
        const targetChunkY=chunks.chunkY(enemy.y);
        if(targetChunkX!==chunk.x||targetChunkY!==chunk.y){
          const target=chunks.getChunk(targetChunkX,targetChunkY,false);
          if(target&&state.world.activeKeys.has(chunks.key(targetChunkX,targetChunkY))){
            chunk.enemies.splice(i,1);
            chunk.saveEnemies=true;
            target.saveEnemies=true;
            transfers.push([enemy,target]);
          }else{
            enemy.vx*=-.7;
            enemy.vy*=-.7;
          }
        }
      }
    }
    for(const [enemy,target] of transfers)target.enemies.push(enemy);
  }

  function recallStolenWeapon(){
    if(!Number.isInteger(state.player.stolenWeaponId))return false;
    for(const chunk of state.world.activeChunks)for(const enemy of chunk.enemies)if(enemy.stolenWeaponId===state.player.stolenWeaponId)enemy.stolenWeaponId=null;
    state.player.stolenWeaponId=null;
    hud.showMessage('Dimensional transit recalled your stolen weapon',900);
    return true;
  }

  return { update, speciesOf, behaviorsOf, spawnCreature, openInvasionPortal, recallStolenWeapon, updateNests, updateInvasionPortals };
}
