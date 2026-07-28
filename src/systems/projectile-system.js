import { GRENADE_CONFIG, DRONE_STRIKE_CONFIG, NAPALM_CONFIG, GLAIVE_CONFIG, NYAN_CAT_CONFIG, REALITY_ZIPPER_CONFIG } from '../config.js';
import { MaterialId, FLAMMABLE_MATERIALS } from '../data/materials.db.js';
import { nearestPixel, placeOnPixel, snapPixelPosition, snapStoredCoordinates } from '../pixel-grid.js';
import { faunaById } from '../data/fauna.db.js';

export function createProjectileSystem(state,cells,chunks,noise,juice=null){
  const M=MaterialId;

  function forEachBossInRadius(x,y,radius,callback){
    for(const boss of state.entities.bosses){
      const halfWidth=(boss.width??17)*.5;
      const halfHeight=(boss.height??11)*.5;
      if(Math.abs(boss.x-x)>halfWidth+radius||Math.abs(boss.y-y)>halfHeight+radius)continue;
      callback(boss);
    }
  }

  function damageBossesAt(x,y,radius,damage,impulseX=0,impulseY=0){
    let hit=false;
    forEachBossInRadius(x,y,radius,boss=>{
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,6);
      boss.vx=(boss.vx??0)+impulseX;
      boss.vy=(boss.vy??0)+impulseY;
      hit=true;
    });
    return hit;
  }

  function damageBossesInRadius(x,y,radius,damage){
    let hit=false;
    forEachBossInRadius(x,y,radius,boss=>{
      boss.hp-=damage;
      boss.hit=Math.max(boss.hit??0,8);
      hit=true;
    });
    return hit;
  }

  function updateNapalmShots(){
    const shots=state.entities.napalmShots;
    const STUCK_NAPALM_LIFE=1;

    function touchesSolid(x,y){
      return [[1,0],[-1,0],[0,1],[0,-1]].some(([offsetX,offsetY])=>{
        return cells.isSolid(cells.getCell(x+offsetX,y+offsetY));
      });
    }

    function touchesHeat(x,y){
      return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([offsetX,offsetY])=>{
        const type=cells.getCell(x+offsetX,y+offsetY);
        return type===M.FIRE||type===M.LAVA;
      });
    }

    function canReceiveNapalm(x,y){
      const type=cells.getCell(x,y);
      return type===M.AIR||type===M.SMOKE||type===M.STEAM;
    }

    function depositNapalm(preferredX,preferredY,impactX,impactY){
      const candidates=[[preferredX,preferredY]];
      for(let radius=0;radius<3;radius++){
        for(let offsetY=-radius;offsetY<=radius;offsetY++){
          for(let offsetX=-radius;offsetX<=radius;offsetX++){
            candidates.push([impactX+offsetX,impactY+offsetY]);
          }
        }
      }

      const seen=new Set();
      for(const [x,y] of candidates){
        const candidateKey=x+','+y;
        if(seen.has(candidateKey))continue;
        seen.add(candidateKey);
        if(!canReceiveNapalm(x,y))continue;

        if(touchesHeat(x,y)){
          cells.setCell(x,y,M.FIRE,NAPALM_CONFIG.fireLifeFrames);
        }else{
          cells.setCell(x,y,M.NAPALM,touchesSolid(x,y)?STUCK_NAPALM_LIFE:0);
        }
        return true;
      }
      return false;
    }

    for(let i=shots.length-1;i>=0;i--){
      const shot=shots[i];
      shot.life--;
      shot.vy+=.035;
      shot.vx*=.992;
      let hit=shot.life<=0;
      let lastOpenX=Math.floor(shot.x);
      let lastOpenY=Math.floor(shot.y);
      let impactX=lastOpenX;
      let impactY=lastOpenY;

      for(let step=0;step<3&&!hit;step++){
        const previousX=shot.x;
        const previousY=shot.y;
        shot.x+=shot.vx/3;
        shot.y+=shot.vy/3;

        if(!chunks.isActiveWorldPosition(shot.x,shot.y)){
          hit=true;
          break;
        }

        const pixelX=Math.floor(shot.x);
        const pixelY=Math.floor(shot.y);
        const type=cells.getCell(pixelX,pixelY);
        impactX=pixelX;
        impactY=pixelY;

        if(cells.isSolid(type)||type===M.WATER||type===M.LAVA||type===M.FIRE){
          hit=true;
          // Keep the deposit on the open side of the impacted material.
          shot.x=previousX;
          shot.y=previousY;
          break;
        }

        lastOpenX=pixelX;
        lastOpenY=pixelY;

        // Raw napalm has no contact damage. Hitting an enemy or boss only stops the
        // droplet so it can coat the nearby world; fire is what causes harm.
        if(damageBossesAt(shot.x,shot.y,1.6,0)){
          hit=true;
          break;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            const radius=faunaById(enemy.speciesId)?.hitRadius??2;
            if(Math.hypot(enemy.x-shot.x,enemy.y-shot.y)<radius+1.2){
              hit=true;
              break;
            }
          }
          if(hit)break;
        }
      }

      if(!hit)continue;

      depositNapalm(lastOpenX,lastOpenY,impactX,impactY);
      shots.splice(i,1);
    }
  }

  function updateBullets(){
    const bullets=state.entities.bullets;

    for(let i=bullets.length-1;i>=0;i--){
      const bullet=bullets[i];
      bullet.life--;
      let dead=bullet.life<=0;

      for(let step=0;step<4&&!dead;step++){
        bullet.x+=bullet.vx/4;
        bullet.y+=bullet.vy/4;

        if(!chunks.isActiveWorldPosition(bullet.x,bullet.y)){
          dead=true;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(bullet.x),Math.floor(bullet.y)))){
          dead=true;
          break;
        }

        if(damageBossesAt(bullet.x,bullet.y,1.5,22,bullet.vx*.02,bullet.vy*.02)){
          bullet.pierce--;
          if(bullet.pierce<=0)dead=true;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            const radius=faunaById(enemy.speciesId)?.hitRadius??2;
            if(Math.hypot(enemy.x-bullet.x,enemy.y-bullet.y)<radius+1){
              enemy.hp-=22;
              enemy.hit=6;
              bullet.pierce--;
              if(bullet.pierce<=0)dead=true;
              break;
            }
          }
          if(dead)break;
        }
      }

      if(dead)bullets.splice(i,1);
    }
  }

  function updateGlaives(){
    const glaives=state.entities.glaives;

    function blockedAt(x,y){
      if(!chunks.isActiveWorldPosition(x,y))return true;
      return cells.isSolid(cells.getCell(Math.floor(x),Math.floor(y)));
    }

    function recordRicochet(blade){
      blade.bounces=(blade.bounces??0)+1;
      blade.spinSpeed=-(blade.spinSpeed||GLAIVE_CONFIG.spinSpeed)*1.04;
      if(blade.bounces>=GLAIVE_CONFIG.maxBounces)blade.returning=true;
    }

    function moveWithRicochet(blade){
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(blade.vx),Math.abs(blade.vy))*3));
      for(let step=0;step<steps;step++){
        const stepX=blade.vx/steps;
        const stepY=blade.vy/steps;
        const nextX=blade.x+stepX;
        const nextY=blade.y+stepY;
        const blockedX=blockedAt(nextX,blade.y);
        const blockedY=blockedAt(blade.x,nextY);
        const blockedDiagonal=blockedAt(nextX,nextY);

        if(!blockedX&&!blockedY&&!blockedDiagonal){
          blade.x=nextX;
          blade.y=nextY;
          continue;
        }

        let bounceX=blockedX;
        let bounceY=blockedY;
        if(!bounceX&&!bounceY&&blockedDiagonal){
          bounceX=true;
          bounceY=true;
        }

        if(bounceX)blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
        if(bounceY)blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
        if(!bounceX&&!bounceY){
          blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
          blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
        }

        recordRicochet(blade);

        // Keep the blade outside the collided cell so it cannot become embedded.
        const nudgeX=Math.sign(blade.vx)*.12;
        const nudgeY=Math.sign(blade.vy)*.12;
        if(!blockedAt(blade.x+nudgeX,blade.y))blade.x+=nudgeX;
        if(!blockedAt(blade.x,blade.y+nudgeY))blade.y+=nudgeY;
        break;
      }
    }

    function ricochetFromEnemy(blade,enemy){
      let nx=blade.x-enemy.x;
      let ny=blade.y-enemy.y;
      const length=Math.hypot(nx,ny)||1;
      nx/=length;
      ny/=length;
      const dot=blade.vx*nx+blade.vy*ny;
      if(dot<0){
        blade.vx=(blade.vx-2*dot*nx)*GLAIVE_CONFIG.ricochetRetention;
        blade.vy=(blade.vy-2*dot*ny)*GLAIVE_CONFIG.ricochetRetention;
      }else{
        blade.vx=-blade.vx*GLAIVE_CONFIG.ricochetRetention;
        blade.vy=-blade.vy*GLAIVE_CONFIG.ricochetRetention;
      }
      recordRicochet(blade);
    }

    for(let i=glaives.length-1;i>=0;i--){
      const blade=glaives[i];
      blade.age++;
      blade.spin=(blade.spin??0)+(blade.spinSpeed??GLAIVE_CONFIG.spinSpeed);
      if(blade.age>GLAIVE_CONFIG.returnAfterFrames)blade.returning=true;
      if(blade.age>GLAIVE_CONFIG.maxLifeFrames){
        glaives.splice(i,1);
        continue;
      }

      if(blade.returning){
        const dx=state.player.x-blade.x;
        const dy=state.player.y-2-blade.y;
        const distance=Math.hypot(dx,dy)||1;
        blade.vx=(blade.vx+dx/distance*.14)*.96;
        blade.vy=(blade.vy+dy/distance*.14)*.96;

        if(distance<3){
          glaives.splice(i,1);
          continue;
        }
      }

      moveWithRicochet(blade);

      forEachBossInRadius(blade.x,blade.y,3,boss=>{
        const key='boss:'+boss.regionIndex;
        const nextAllowed=blade.hits.get(key)||0;
        if(nextAllowed>state.frame)return;
        boss.hp-=28;
        boss.hit=Math.max(boss.hit??0,6);
        blade.hits.set(key,state.frame+GLAIVE_CONFIG.enemyHitCooldown);
        ricochetFromEnemy(blade,boss);
      });

      for(const chunk of state.world.activeChunks){
        for(const enemy of chunk.enemies){
          const nextAllowed=blade.hits.get(enemy)||0;
          if(nextAllowed>state.frame)continue;

          const radius=faunaById(enemy.speciesId)?.hitRadius??2;
          if(Math.hypot(enemy.x-blade.x,enemy.y-blade.y)<radius+2){
            enemy.hp-=28;
            enemy.hit=4;
            blade.hits.set(enemy,state.frame+GLAIVE_CONFIG.enemyHitCooldown);
            ricochetFromEnemy(blade,enemy);
          }
        }
      }
    }
  }

  function fireLifeAt(x,y,salt){
    const span=GRENADE_CONFIG.fireLifeMax-GRENADE_CONFIG.fireLifeMin;
    return GRENADE_CONFIG.fireLifeMin+Math.floor(noise.randomAt(x,y,salt)*span);
  }

  function placeExplosionFire(x,y,life){
    const type=cells.getCell(x,y);
    if(type===M.AIR||type===M.SMOKE){
      cells.setCell(x,y,M.FIRE,life);
      return true;
    }
    if(type!==M.NAPALM&&FLAMMABLE_MATERIALS.has(type)){
      cells.setCell(x,y,M.FIRE,life);
      return true;
    }
    return false;
  }

  function igniteEntityPositions(centerX,centerY,radius,fireLife){
    const playerDistance=Math.hypot(state.player.x-centerX,state.player.y-2-centerY);
    if(playerDistance<=radius){
      const x=Math.floor(state.player.x);
      const y=Math.floor(state.player.y-2);
      placeExplosionFire(x,y,fireLife);
    }

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(Math.hypot(enemy.x-centerX,enemy.y-centerY)>radius)continue;
        placeExplosionFire(
          Math.floor(enemy.x),
          Math.floor(enemy.y),
          fireLife,
        );
      }
    }
  }

  function explodeGrenade(grenade){
    const centerX=Math.floor(grenade.x);
    const centerY=Math.floor(grenade.y);
    const blastRadius=GRENADE_CONFIG.blastRadius;
    const fireRadius=GRENADE_CONFIG.fireRadius;

    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:fireRadius,
      frames:12,
      maxFrames:12,
    });

    for(let y=centerY-blastRadius;y<=centerY+blastRadius;y++){
      for(let x=centerX-blastRadius;x<=centerX+blastRadius;x++){
        const distanceSquared=(x-centerX)**2+(y-centerY)**2;
        if(distanceSquared>blastRadius*blastRadius)continue;
        const type=cells.getCell(x,y);
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
      }
    }

    for(let y=centerY-fireRadius;y<=centerY+fireRadius;y++){
      for(let x=centerX-fireRadius;x<=centerX+fireRadius;x++){
        const distance=Math.hypot(x-centerX,y-centerY);
        if(distance>fireRadius)continue;

        const innerStrength=1-distance/fireRadius;
        const chance=.16+innerStrength*.55;
        if(noise.randomAt(x,y,state.frame+930)>chance)continue;
        placeExplosionFire(x,y,fireLifeAt(x,y,state.frame+931));
      }
    }

    // Guarantee a hot core and ensure nearby actors are hurt by generated fire,
    // never by hidden direct explosion damage.
    placeExplosionFire(centerX,centerY,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX,centerY-1,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX-1,centerY,GRENADE_CONFIG.fireLifeMax);
    placeExplosionFire(centerX+1,centerY,GRENADE_CONFIG.fireLifeMax);
    igniteEntityPositions(
      centerX,
      centerY,
      GRENADE_CONFIG.fireRadius,
      GRENADE_CONFIG.fireLifeMax,
    );
    damageBossesInRadius(centerX,centerY,GRENADE_CONFIG.fireRadius,22);
  }

  function updateGrenades(){
    const grenades=state.entities.grenades;

    for(let i=grenades.length-1;i>=0;i--){
      const grenade=grenades[i];
      grenade.fuse--;

      if(grenade.fuse<=0){
        explodeGrenade(grenade);
        grenades.splice(i,1);
        continue;
      }

      grenade.vy+=GRENADE_CONFIG.gravity;
      grenade.vx*=GRENADE_CONFIG.airDrag;
      grenade.rotation+=grenade.vx*.22;
      let active=true;

      for(let step=0;step<4&&active;step++){
        const nextX=grenade.x+grenade.vx/4;
        if(!chunks.isActiveWorldPosition(nextX,grenade.y)){
          grenades.splice(i,1);
          active=false;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(nextX),Math.floor(grenade.y)))){
          if(Math.abs(grenade.vx)>.35)juice?.impact?.(grenade.x,grenade.y,{kind:'dust',count:5,shake:.18,hitStop:0});
          grenade.vx*=-GRENADE_CONFIG.bounce;
          grenade.bounces=(grenade.bounces??0)+1;
        }else{
          grenade.x=nextX;
        }

        const nextY=grenade.y+grenade.vy/4;
        if(!chunks.isActiveWorldPosition(grenade.x,nextY)){
          grenades.splice(i,1);
          active=false;
          break;
        }

        if(cells.isSolid(cells.getCell(Math.floor(grenade.x),Math.floor(nextY)))){
          if(Math.abs(grenade.vy)>.35)juice?.impact?.(grenade.x,grenade.y,{kind:'dust',count:5,shake:.18,hitStop:0});
          grenade.vy*=-GRENADE_CONFIG.bounce;
          grenade.bounces=(grenade.bounces??0)+1;
          grenade.vx*=GRENADE_CONFIG.groundFriction;
          if(Math.abs(grenade.vy)<.08)grenade.vy=0;
        }else{
          grenade.y=nextY;
        }
      }

      if(!active)continue;
      const material=cells.getCell(Math.floor(grenade.x),Math.floor(grenade.y));
      if(material===M.FIRE||material===M.LAVA)grenade.fuse=Math.min(grenade.fuse,4);
    }
  }

  function droneFireLifeAt(x,y,salt){
    const span=DRONE_STRIKE_CONFIG.fireLifeMax-DRONE_STRIKE_CONFIG.fireLifeMin;
    return DRONE_STRIKE_CONFIG.fireLifeMin+Math.floor(noise.randomAt(x,y,salt)*span);
  }

  function explodeDroneRocket(rocket){
    const centerX=Math.floor(rocket.targetX??rocket.x);
    const centerY=Math.floor(rocket.targetY??rocket.y);
    const blastRadius=DRONE_STRIKE_CONFIG.blastRadius;
    const fireRadius=DRONE_STRIKE_CONFIG.fireRadius;

    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:fireRadius,
      frames:DRONE_STRIKE_CONFIG.explosionFrames,
      maxFrames:DRONE_STRIKE_CONFIG.explosionFrames,
      kind:'drone',
    });

    for(let y=centerY-blastRadius;y<=centerY+blastRadius;y++){
      for(let x=centerX-blastRadius;x<=centerX+blastRadius;x++){
        if((x-centerX)**2+(y-centerY)**2>blastRadius*blastRadius)continue;
        const type=cells.getCell(x,y);
        if(cells.isSolid(type))cells.setCell(x,y,M.AIR);
      }
    }

    for(let y=centerY-fireRadius;y<=centerY+fireRadius;y++){
      for(let x=centerX-fireRadius;x<=centerX+fireRadius;x++){
        const distance=Math.hypot(x-centerX,y-centerY);
        if(distance>fireRadius)continue;
        const strength=1-distance/fireRadius;
        const guaranteed=distance<=5;
        const chance=.28+strength*.66;
        if(!guaranteed&&noise.randomAt(x,y,state.frame+2520)>chance)continue;
        placeExplosionFire(x,y,droneFireLifeAt(x,y,state.frame+2521));
      }
    }

    for(let offset=-7;offset<=7;offset++){
      placeExplosionFire(
        centerX+offset,
        centerY-1-Math.floor(Math.abs(offset)*.18),
        DRONE_STRIKE_CONFIG.fireLifeMax,
      );
    }

    igniteEntityPositions(
      centerX,
      centerY,
      fireRadius,
      DRONE_STRIKE_CONFIG.fireLifeMax,
    );
    damageBossesInRadius(centerX,centerY,fireRadius,46);
  }

  function launchDroneRocket(drone){
    const dx=drone.targetX-drone.x;
    const dy=drone.targetY-drone.y;
    const distance=Math.hypot(dx,dy)||1;
    state.entities.droneRockets.push({
      x:drone.x,
      y:nearestPixel(drone.y+1.5),
      vx:dx/distance*.55,
      vy:Math.max(.65,dy/distance*.85),
      targetX:drone.targetX,
      targetY:drone.targetY,
      age:0,
    });
  }

  function updateDrones(){
    const drones=state.entities.drones;
    for(let i=drones.length-1;i>=0;i--){
      const drone=drones[i];
      drone.bob+=.16;
      drone.x+=drone.direction*DRONE_STRIKE_CONFIG.droneSpeed;

      if(!chunks.isActiveWorldPosition(drone.x,drone.y)){
        drones.splice(i,1);
        continue;
      }

      if(cells.getCell(Math.floor(drone.x),Math.floor(drone.y))!==M.AIR){
        drones.splice(i,1);
        continue;
      }

      if(drone.phase==='approach'){
        const reachedTarget=drone.direction>0
          ?drone.x>=drone.targetX
          :drone.x<=drone.targetX;
        if(reachedTarget){
          launchDroneRocket(drone);
          drone.phase='exit';
          drone.launched=true;
        }
      }

      if(drone.phase==='exit'){
        const leftMap=drone.direction>0
          ?drone.x>=drone.exitX
          :drone.x<=drone.exitX;
        if(leftMap)drones.splice(i,1);
      }
    }
  }

  function updateDroneRockets(){
    const rockets=state.entities.droneRockets;
    for(let i=rockets.length-1;i>=0;i--){
      const rocket=rockets[i];
      rocket.age++;

      const dx=rocket.targetX-rocket.x;
      const dy=rocket.targetY-rocket.y;
      const distance=Math.hypot(dx,dy)||1;
      const desiredVx=dx/distance*DRONE_STRIKE_CONFIG.rocketSpeed;
      const desiredVy=dy/distance*DRONE_STRIKE_CONFIG.rocketSpeed;
      rocket.vx+=(desiredVx-rocket.vx)*DRONE_STRIKE_CONFIG.rocketHoming;
      rocket.vy+=(desiredVy-rocket.vy)*DRONE_STRIKE_CONFIG.rocketHoming;
      rocket.vy+=DRONE_STRIKE_CONFIG.rocketGravity;

      let detonated=false;
      for(let step=0;step<5&&!detonated;step++){
        const nextX=rocket.x+rocket.vx/5;
        const nextY=rocket.y+rocket.vy/5;

        if(!chunks.isActiveWorldPosition(nextX,nextY)){
          rockets.splice(i,1);
          detonated=true;
          break;
        }

        const type=cells.getCell(Math.floor(nextX),Math.floor(nextY));
        if(cells.isSolid(type)){
          if(FLAMMABLE_MATERIALS.has(type)){
            cells.setCell(Math.floor(nextX),Math.floor(nextY),M.FIRE,DRONE_STRIKE_CONFIG.fireLifeMax);
            rocket.x=nextX;
            rocket.y=nextY;
            continue;
          }
          explodeDroneRocket(rocket);
          rockets.splice(i,1);
          detonated=true;
          break;
        }

        rocket.x=nextX;
        rocket.y=nextY;
        if(Math.hypot(rocket.targetX-rocket.x,rocket.targetY-rocket.y)<1.35||rocket.y>=rocket.targetY){
          explodeDroneRocket(rocket);
          rockets.splice(i,1);
          detonated=true;
        }
      }
    }
  }


  function spawnNyanSparks(x,y,count=NYAN_CAT_CONFIG.sparkCount){
    const colors=6;
    for(let index=0;index<count;index++){
      const angle=noise.randomAt(x+index,y,state.frame+9920)*Math.PI*2;
      const speed=.45+noise.randomAt(index,x+y,state.frame+9921)*2.25;
      state.entities.nyanSparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-.15,
        life:18+Math.floor(noise.randomAt(y,index,state.frame+9922)*30),
        colorIndex:index%colors,
      });
    }
    if(state.entities.nyanSparks.length>NYAN_CAT_CONFIG.maxSparks){
      state.entities.nyanSparks.splice(0,state.entities.nyanSparks.length-NYAN_CAT_CONFIG.maxSparks);
    }
  }

  function damageEnemiesInNyanBlast(x,y,radius){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const dx=enemy.x-x;
        const dy=enemy.y-y;
        const distance=Math.hypot(dx,dy);
        if(distance>radius)continue;
        const force=Math.max(.1,1-distance/radius);
        enemy.hp-=NYAN_CAT_CONFIG.blastDamage;
        enemy.hit=Math.max(enemy.hit??0,10);
        const length=distance||1;
        enemy.vx=(enemy.vx??0)+dx/length*1.2*force;
        enemy.vy=(enemy.vy??0)+dy/length*1.2*force-.25;
      }
    }
  }

  function explodeNyanCat(cat){
    const centerX=Math.round(cat.x);
    const centerY=Math.round(cat.y);
    state.entities.explosions.push({
      x:centerX,
      y:centerY,
      radius:NYAN_CAT_CONFIG.blastRadius,
      frames:22,
      maxFrames:22,
      kind:'nyan',
    });

    const terrainRadius=NYAN_CAT_CONFIG.terrainRadius;
    for(let y=centerY-terrainRadius;y<=centerY+terrainRadius;y++){
      for(let x=centerX-terrainRadius;x<=centerX+terrainRadius;x++){
        const dx=x-centerX;
        const dy=y-centerY;
        const distance=Math.hypot(dx,dy);
        const angle=Math.atan2(dy,dx);
        const starRadius=terrainRadius*(.7+.3*Math.abs(Math.cos(angle*5)));
        if(distance>starRadius)continue;
        const type=cells.getCell(x,y);
        if(!cells.isSolid(type))continue;
        const edge=distance>starRadius-1.4;
        if(edge&&noise.randomAt(x,y,state.frame+9931)<.28){
          cells.setCell(x,y,M.CRYSTAL,0,{reason:'nyan-cat-impact'});
        }else{
          cells.setCell(x,y,M.AIR,0,{reason:'nyan-cat-impact'});
        }
      }
    }

    damageBossesInRadius(centerX,centerY,NYAN_CAT_CONFIG.blastRadius,NYAN_CAT_CONFIG.bossDamage);
    damageEnemiesInNyanBlast(centerX,centerY,NYAN_CAT_CONFIG.blastRadius);
    spawnNyanSparks(centerX,centerY);
  }

  function updateNyanSparks(){
    for(let index=state.entities.nyanSparks.length-1;index>=0;index--){
      const spark=state.entities.nyanSparks[index];
      spark.x+=spark.vx;
      spark.y+=spark.vy;
      spark.vx*=.975;
      spark.vy+=.055;
      spark.life--;
      if(spark.life<=0)state.entities.nyanSparks.splice(index,1);
    }
  }

  function preserveNyanMomentum(cat){
    const speed=Math.hypot(cat.vx,cat.vy);
    if(speed<=0||speed>=NYAN_CAT_CONFIG.minimumMomentum)return;
    const scale=NYAN_CAT_CONFIG.minimumMomentum/speed;
    cat.vx*=scale;
    cat.vy*=scale;
  }

  function nyanHitsTerrainAt(cat,x,y,axis){
    if(axis==='x'){
      const facing=Math.sign(cat.vx||1);
      const probeX=Math.round(x+facing*6);
      const centerY=Math.round(y);
      for(let offsetY=-2;offsetY<=2;offsetY++){
        if(cells.isSolid(cells.getCell(probeX,centerY+offsetY)))return true;
      }
      return false;
    }

    const vertical=Math.sign(cat.vy||1);
    const probeY=Math.round(y+vertical*3);
    const centerX=Math.round(x);
    for(let offsetX=-5;offsetX<=5;offsetX+=2){
      if(cells.isSolid(cells.getCell(centerX+offsetX,probeY)))return true;
    }
    return false;
  }

  function bounceNyanCat(cat,axis){
    if(axis==='x')cat.vx*=-NYAN_CAT_CONFIG.bounceRetention;
    else cat.vy*=-NYAN_CAT_CONFIG.bounceRetention;
    cat.bounces=(cat.bounces??0)+1;
    preserveNyanMomentum(cat);
    spawnNyanSparks(cat.x,cat.y,NYAN_CAT_CONFIG.bounceSparkCount);
  }

  function updateNyanCats(){
    const cats=state.entities.nyanCats;
    for(let index=cats.length-1;index>=0;index--){
      const cat=cats[index];
      cat.life--;
      cat.phase=(cat.phase??0)+.35;
      cat.bounces??=0;
      cat.trail??=[];
      cat.hits??=new Set();
      cat.trail.unshift({x:Math.round(cat.x),y:Math.round(cat.y)});
      if(cat.trail.length>NYAN_CAT_CONFIG.trailLength)cat.trail.length=NYAN_CAT_CONFIG.trailLength;

      cat.vy+=NYAN_CAT_CONFIG.gravity;
      cat.vx*=NYAN_CAT_CONFIG.airDrag;
      cat.vy*=NYAN_CAT_CONFIG.airDrag;
      preserveNyanMomentum(cat);

      let detonate=cat.life<=0||cat.bounces>=NYAN_CAT_CONFIG.maxBounces;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(cat.vx),Math.abs(cat.vy))*2));

      for(let step=0;step<steps&&!detonate;step++){
        const nextX=cat.x+cat.vx/steps;
        if(!chunks.isActiveWorldPosition(nextX,cat.y)){
          detonate=true;
          break;
        }
        if(nyanHitsTerrainAt(cat,nextX,cat.y,'x')){
          bounceNyanCat(cat,'x');
          if(cat.bounces>=NYAN_CAT_CONFIG.maxBounces){detonate=true;break;}
        }else{
          cat.x=nextX;
        }

        const nextY=cat.y+cat.vy/steps;
        if(!chunks.isActiveWorldPosition(cat.x,nextY)){
          detonate=true;
          break;
        }
        if(nyanHitsTerrainAt(cat,cat.x,nextY,'y')){
          bounceNyanCat(cat,'y');
          if(cat.bounces>=NYAN_CAT_CONFIG.maxBounces){detonate=true;break;}
        }else{
          cat.y=nextY;
        }

        if(damageBossesAt(cat.x,cat.y,4,NYAN_CAT_CONFIG.contactDamage,cat.vx*.08,cat.vy*.08)){
          detonate=true;
          break;
        }

        for(const chunk of state.world.activeChunks){
          for(const enemy of chunk.enemies){
            if(enemy.hp<=0||cat.hits.has(enemy))continue;
            const radius=(faunaById(enemy.speciesId)?.hitRadius??2)+3;
            if(Math.hypot(enemy.x-cat.x,enemy.y-cat.y)>radius)continue;
            enemy.hp-=NYAN_CAT_CONFIG.contactDamage;
            enemy.hit=Math.max(enemy.hit??0,8);
            enemy.vx=(enemy.vx??0)+Math.sign(cat.vx||1)*1.1;
            enemy.vy=(enemy.vy??0)-.45;
            cat.hits.add(enemy);
            cat.pierce--;
            spawnNyanSparks(enemy.x,enemy.y,8);
            if(cat.pierce<=0){detonate=true;break;}
          }
          if(detonate)break;
        }
      }

      if(detonate){
        explodeNyanCat(cat);
        cats.splice(index,1);
      }
    }
  }


  function realityLinePoints(x0,y0,x1,y1){
    const points=[];
    let ax=Math.round(x0);
    let ay=Math.round(y0);
    const bx=Math.round(x1);
    const by=Math.round(y1);
    const dx=Math.abs(bx-ax);
    const sx=ax<bx?1:-1;
    const dy=-Math.abs(by-ay);
    const sy=ay<by?1:-1;
    let error=dx+dy;
    for(;;){
      points.push({x:ax,y:ay});
      if(ax===bx&&ay===by)break;
      const doubled=2*error;
      if(doubled>=dy){error+=dy;ax+=sx;}
      if(doubled<=dx){error+=dx;ay+=sy;}
    }
    return points;
  }

  function realityCellState(x,y){
    return {
      x,y,
      type:cells.getCell(x,y),
      life:cells.getLife(x,y),
      cropId:cells.getCropId(x,y),
      plantId:cells.getPlantId(x,y),
      age:cells.getAge(x,y),
    };
  }

  function spawnRealitySparks(x,y,count=REALITY_ZIPPER_CONFIG.pulseSparkCount,normalX=0,normalY=1){
    for(let index=0;index<count;index++){
      const polarity=index%2===0?1:-1;
      const tangentX=-normalY;
      const tangentY=normalX;
      const tangent=(noise.randomAt(index,state.frame,x+y+10101)-.5)*1.9;
      const normal=.35+noise.randomAt(state.frame,index,x-y+10102)*1.45;
      state.entities.realitySparks.push({
        x:nearestPixel(x),
        y:nearestPixel(y),
        vx:tangentX*tangent+normalX*normal*polarity,
        vy:tangentY*tangent+normalY*normal*polarity,
        life:15+Math.floor(noise.randomAt(x+index,y,state.frame+10103)*26),
        colorIndex:(index+Math.floor(state.frame/3))%8,
        phase:noise.randomAt(y,index,state.frame+10104)*Math.PI*2,
      });
    }
    if(state.entities.realitySparks.length>REALITY_ZIPPER_CONFIG.maxSparks){
      state.entities.realitySparks.splice(0,state.entities.realitySparks.length-REALITY_ZIPPER_CONFIG.maxSparks);
    }
  }

  function openRealityRift(rift){
    rift.points=realityLinePoints(rift.startX,rift.startY,rift.endX,rift.endY);
    const snapshot=new Map();
    const reach=REALITY_ZIPPER_CONFIG.splitDistance+REALITY_ZIPPER_CONFIG.halfWidth+1;
    for(const point of rift.points){
      for(let offset=-reach;offset<=reach;offset++){
        const x=point.x+rift.normalX*offset;
        const y=point.y+rift.normalY*offset;
        const key=`${x},${y}`;
        if(!snapshot.has(key))snapshot.set(key,realityCellState(x,y));
      }
    }
    rift.snapshot=[...snapshot.values()];

    const processed=new Set();
    for(const point of rift.points){
      for(const side of [-1,1]){
        for(let offset=REALITY_ZIPPER_CONFIG.halfWidth;offset>=0;offset--){
          const sourceX=point.x+rift.normalX*side*offset;
          const sourceY=point.y+rift.normalY*side*offset;
          const sourceKey=`${sourceX},${sourceY}`;
          if(processed.has(sourceKey))continue;
          processed.add(sourceKey);
          const source=realityCellState(sourceX,sourceY);
          const destinationX=point.x+rift.normalX*side*(offset+REALITY_ZIPPER_CONFIG.splitDistance);
          const destinationY=point.y+rift.normalY*side*(offset+REALITY_ZIPPER_CONFIG.splitDistance);
          if(source.type!==M.AIR){
            cells.setCell(destinationX,destinationY,source.type,source.life,{
              cropId:source.cropId,
              plantId:source.plantId,
              reason:'reality-zipper-open',
            });
            cells.setAge(destinationX,destinationY,source.age);
          }
          cells.setCell(sourceX,sourceY,M.AIR,0,{reason:'reality-zipper-open'});
        }
      }
    }
    rift.applied=true;
    const sampleStep=Math.max(1,Math.floor(rift.points.length/12));
    for(let index=0;index<rift.points.length;index+=sampleStep){
      const point=rift.points[index];
      spawnRealitySparks(point.x,point.y,6,rift.normalX,rift.normalY);
    }
  }

  function restoreRealityRift(rift){
    if(rift.restored)return;
    for(const cell of rift.snapshot??[]){
      const restored=cells.setCell(cell.x,cell.y,cell.type,cell.life,{
        cropId:cell.cropId,
        plantId:cell.plantId,
        reason:'reality-zipper-restore',
      });
      if(restored)cells.setAge(cell.x,cell.y,cell.age);
    }
    rift.restored=true;
    const midpointX=Math.round((rift.startX+rift.endX)*.5);
    const midpointY=Math.round((rift.startY+rift.endY)*.5);
    spawnRealitySparks(midpointX,midpointY,REALITY_ZIPPER_CONFIG.sparkCount,rift.normalX,rift.normalY);
  }

  function distanceToRealityRift(rift,x,y){
    const ax=rift.startX;
    const ay=rift.startY;
    const bx=rift.endX;
    const by=rift.endY;
    const abX=bx-ax;
    const abY=by-ay;
    const lengthSquared=abX*abX+abY*abY||1;
    const projection=Math.max(0,Math.min(1,((x-ax)*abX+(y-ay)*abY)/lengthSquared));
    const px=ax+abX*projection;
    const py=ay+abY*projection;
    return Math.hypot(x-px,y-py);
  }

  function rotateRealityVelocity(entity,angle){
    const vx=Number(entity.vx)||0;
    const vy=Number(entity.vy)||0;
    const cosine=Math.cos(angle);
    const sine=Math.sin(angle);
    entity.vx=vx*cosine-vy*sine;
    entity.vy=vx*sine+vy*cosine;
  }

  function splitProjectilesAtRift(rift){
    if(rift.splitCount>=REALITY_ZIPPER_CONFIG.projectileSplitLimit)return;
    const arrays=[
      state.entities.bullets,
      state.entities.napalmShots,
      state.entities.bossFireballs,
      state.entities.serpentProjectiles,
      state.entities.bossProjectiles,
    ];
    for(const array of arrays){
      const initialLength=array.length;
      for(let index=0;index<initialLength&&rift.splitCount<REALITY_ZIPPER_CONFIG.projectileSplitLimit;index++){
        const projectile=array[index];
        if(!Number.isFinite(projectile?.x)||!Number.isFinite(projectile?.y)||!Number.isFinite(projectile?.vx)||!Number.isFinite(projectile?.vy))continue;
        if(projectile.realitySplitId===rift.id)continue;
        if(distanceToRealityRift(rift,projectile.x,projectile.y)>2.2)continue;
        const clone={...projectile};
        projectile.realitySplitId=rift.id;
        clone.realitySplitId=rift.id;
        rotateRealityVelocity(projectile,REALITY_ZIPPER_CONFIG.splitAngle);
        rotateRealityVelocity(clone,-REALITY_ZIPPER_CONFIG.splitAngle);
        clone.x=nearestPixel(clone.x+rift.normalX*2);
        clone.y=nearestPixel(clone.y+rift.normalY*2);
        array.push(clone);
        rift.splitCount++;
        spawnRealitySparks(projectile.x,projectile.y,10,rift.normalX,rift.normalY);
      }
    }
  }

  function pulseRealityField(rift){
    const polarity=Math.floor(rift.age/REALITY_ZIPPER_CONFIG.pulseInterval)%2===0?1:-1;
    const radius=REALITY_ZIPPER_CONFIG.fieldRadius;
    const force=REALITY_ZIPPER_CONFIG.gravityForce*polarity;

    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        if(enemy.hp<=0||distanceToRealityRift(rift,enemy.x,enemy.y)>radius)continue;
        enemy.hp-=REALITY_ZIPPER_CONFIG.enemyDamagePerPulse;
        enemy.hit=Math.max(enemy.hit??0,5);
        enemy.vx=(enemy.vx??0)+rift.normalX*force;
        enemy.vy=(enemy.vy??0)-force*1.4+rift.normalY*force*.4;
      }
    }
    for(const boss of state.entities.bosses){
      if(boss.hp<=0||distanceToRealityRift(rift,boss.x,boss.y)>radius+4)continue;
      boss.hp-=REALITY_ZIPPER_CONFIG.bossDamagePerPulse;
      boss.hit=Math.max(boss.hit??0,4);
      boss.vx=(boss.vx??0)+rift.normalX*force*.45;
      boss.vy=(boss.vy??0)-force*.55;
    }

    if(!state.player.locked&&distanceToRealityRift(rift,state.player.x,state.player.y-2)<radius*.62){
      state.player.vx+=rift.normalX*force*.45;
      state.player.vy-=force*.8;
    }

    const affectedArrays=[
      state.entities.bullets,state.entities.napalmShots,state.entities.glaives,state.entities.grenades,
      state.entities.nyanCats,state.entities.seedParticles,state.entities.pickups,
      state.entities.bossFireballs,state.entities.serpentProjectiles,state.entities.bossProjectiles,
    ];
    for(const array of affectedArrays){
      for(const entity of array){
        if(!Number.isFinite(entity?.x)||!Number.isFinite(entity?.y)||distanceToRealityRift(rift,entity.x,entity.y)>radius)continue;
        entity.vx=(entity.vx??0)+rift.normalX*force*.75;
        entity.vy=(entity.vy??0)-force;
      }
    }

    const point=rift.points?.[(Math.floor(rift.age/REALITY_ZIPPER_CONFIG.pulseInterval)*7)%(rift.points?.length||1)]??{x:rift.startX,y:rift.startY};
    spawnRealitySparks(point.x,point.y,REALITY_ZIPPER_CONFIG.pulseSparkCount,rift.normalX,rift.normalY);
  }

  function updateRealitySparks(){
    for(let index=state.entities.realitySparks.length-1;index>=0;index--){
      const spark=state.entities.realitySparks[index];
      spark.phase=(spark.phase??0)+.42;
      spark.x+=spark.vx+Math.sin(spark.phase)*.08;
      spark.y+=spark.vy+Math.cos(spark.phase*.77)*.08;
      spark.vx*=.965;
      spark.vy*=.965;
      spark.life--;
      if(spark.life<=0)state.entities.realitySparks.splice(index,1);
    }
  }

  function closeRealityRifts(){
    for(const rift of state.entities.realityRifts)restoreRealityRift(rift);
    state.entities.realityRifts.length=0;
    state.realityZipper.active=false;
    state.realityZipper.phase='idle';
  }

  function updateRealityRifts(){
    const rifts=state.entities.realityRifts;
    for(let index=rifts.length-1;index>=0;index--){
      const rift=rifts[index];
      rift.age++;
      rift.life--;
      if(!rift.applied)openRealityRift(rift);
      if(rift.age>=REALITY_ZIPPER_CONFIG.openingFrames&&rift.life>REALITY_ZIPPER_CONFIG.closingFrames){
        rift.phase='open';
      }
      if(rift.life<=REALITY_ZIPPER_CONFIG.closingFrames){
        rift.phase='closing';
        restoreRealityRift(rift);
      }
      if(rift.phase!=='closing'){
        splitProjectilesAtRift(rift);
        if(rift.age%REALITY_ZIPPER_CONFIG.pulseInterval===0)pulseRealityField(rift);
      }
      rift.pulse=(rift.pulse??0)+.18;
      if(rift.life<=0){
        restoreRealityRift(rift);
        rifts.splice(index,1);
      }
    }
    state.realityZipper.active=rifts.length>0;
    state.realityZipper.phase=rifts[0]?.phase??'idle';
    updateRealitySparks();
  }

  function updateExplosionEffects(){
    const effects=state.entities.explosions;
    for(let i=effects.length-1;i>=0;i--){
      effects[i].frames--;
      if(effects[i].frames<=0)effects.splice(i,1);
    }
  }

  function ensureGlaiveIsClear(blade){
    if(!cells.isSolid(cells.getCell(blade.x,blade.y)))return;
    const awayX=-Math.sign(blade.vx||1);
    const awayY=-Math.sign(blade.vy||0);
    const candidates=[
      [blade.x+awayX,blade.y],
      [blade.x,blade.y+awayY],
      [blade.x+awayX,blade.y+awayY],
      [blade.x-awayX,blade.y],
      [blade.x,blade.y-awayY],
      [blade.x-1,blade.y],[blade.x+1,blade.y],[blade.x,blade.y-1],[blade.x,blade.y+1],
    ];
    for(const [x,y] of candidates){
      if(!chunks.isActiveWorldPosition(x,y)||cells.isSolid(cells.getCell(x,y)))continue;
      placeOnPixel(blade,x,y);
      return;
    }
  }

  function snapProjectilePositions(){
    for(const key of ['napalmShots','bullets','glaives','grenades','drones','droneRockets','nyanCats','nyanSparks','realitySparks','explosions']){
      for(const entity of state.entities[key]){
        snapPixelPosition(entity);
        snapStoredCoordinates(entity,['targetX','targetY','entryX','entryY','exitX','exitY']);
        if(key==='glaives')ensureGlaiveIsClear(entity);
      }
    }
  }

  function update(){
    updateNapalmShots();
    updateBullets();
    updateGlaives();
    updateGrenades();
    updateDrones();
    updateDroneRockets();
    updateNyanCats();
    updateNyanSparks();
    updateRealityRifts();
    updateExplosionEffects();
    snapProjectilePositions();
  }

  return { update, explodeGrenade, explodeDroneRocket, explodeNyanCat, updateRealityRifts, closeRealityRifts };
}
