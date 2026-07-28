import { JUICE_CONFIG } from '../config.js';
import { nearestPixel } from '../pixel-grid.js';
import { MaterialId } from '../data/materials.db.js';

const IMPACT_COLORS=Object.freeze({
  bullet:['rgb(255,247,196)','rgb(255,174,62)','rgb(199,77,36)'],
  blade:['rgb(246,250,255)','rgb(145,205,238)','rgb(72,116,166)'],
  laser:['rgb(255,252,220)','rgb(255,149,48)','rgb(238,54,35)'],
  fire:['rgb(255,236,134)','rgb(255,105,34)','rgb(151,38,29)'],
  crystal:['rgb(245,240,255)','rgb(173,126,246)','rgb(76,63,154)'],
  enemy:['rgb(255,232,213)','rgb(255,106,92)','rgb(136,42,61)'],
  boss:['rgb(255,249,222)','rgb(255,172,75)','rgb(202,54,67)'],
  pickup:['rgb(245,255,212)','rgb(139,239,142)','rgb(73,169,125)'],
  dust:['rgb(218,199,157)','rgb(151,126,92)','rgb(92,75,66)'],
  rainbow:['rgb(255,65,96)','rgb(255,180,55)','rgb(255,239,91)','rgb(74,221,127)','rgb(67,161,244)','rgb(191,93,246)'],
});

export function createJuiceSystem(state,noise){
  const juice=state.juice;
  const M=MaterialId;
  let serial=0;
  const healthSnapshots=new WeakMap();
  const hitEffectFrames=new WeakMap();
  const observedExplosions=new WeakSet();
  const projectileSnapshots=new Map();
  let audioContext=null;
  let lastAudioFrame=-999;
  let cellBurstBudget=JUICE_CONFIG.maxCellBurstsPerFrame;

  function random(index,salt=0){
    serial++;
    return noise.randomAt(state.frame+serial,index+salt,state.seed^0x6a09e667);
  }

  function trim(array,max){
    if(array.length>max)array.splice(0,array.length-max);
  }

  function particle(x,y,options={}){
    const life=Math.max(2,Math.round(options.life??18));
    state.entities.juiceParticles.push({
      x:nearestPixel(x),
      y:nearestPixel(y),
      vx:Number(options.vx)||0,
      vy:Number(options.vy)||0,
      carryX:0,
      carryY:0,
      gravity:Number(options.gravity)||0,
      drag:Number.isFinite(options.drag)?options.drag:.95,
      life,
      maxLife:life,
      color:options.color??'rgb(255,255,255)',
      size:Math.max(1,Math.round(options.size??1)),
      kind:options.kind??'pixel',
      twinkle:Number(options.twinkle)||0,
    });
    trim(state.entities.juiceParticles,JUICE_CONFIG.maxParticles);
  }

  function burst(x,y,options={}){
    const colors=options.colors??IMPACT_COLORS.dust;
    const count=Math.max(1,Math.min(64,Math.round(options.count??8)));
    const speedMin=Number(options.speedMin??.35);
    const speedMax=Number(options.speedMax??1.55);
    const baseAngle=Number(options.angle??0);
    const spread=Number(options.spread??Math.PI*2);
    for(let index=0;index<count;index++){
      const t=count<=1?.5:index/(count-1);
      const angle=baseAngle-spread*.5+spread*t+(random(index,31)-.5)*.42;
      const speed=speedMin+(speedMax-speedMin)*random(index,32);
      particle(x,y,{
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed+(options.lift??0),
        gravity:options.gravity??.055,
        drag:options.drag??.95,
        life:(options.lifeMin??10)+Math.floor(random(index,33)*((options.lifeMax??24)-(options.lifeMin??10)+1)),
        color:colors[Math.floor(random(index,34)*colors.length)%colors.length],
        size:random(index,35)>(options.largeChance??.76)?2:1,
        kind:options.kind??'pixel',
        twinkle:options.twinkle??0,
      });
    }
  }

  function shake(amount,frames=14){
    juice.shake=Math.max(juice.shake,Math.max(0,Number(amount)||0));
    juice.shakeFrames=Math.max(juice.shakeFrames,Math.max(1,Math.round(frames)));
  }

  function hitStop(frames=1){
    juice.hitStopFrames=Math.max(juice.hitStopFrames,Math.min(JUICE_CONFIG.maxHitStopFrames,Math.max(0,Math.round(frames))));
  }

  function worldFlash(x,y,color='rgb(255,255,255)',radius=4,life=7){
    state.entities.juiceFlashes.push({x:nearestPixel(x),y:nearestPixel(y),color,radius,life,maxLife:life});
    trim(state.entities.juiceFlashes,JUICE_CONFIG.maxFlashes);
  }

  function screenFlash(color='rgba(255,255,255,.22)',life=4){
    juice.screenFlashColor=color;
    juice.screenFlash=Math.max(juice.screenFlash,Math.max(1,Math.round(life)));
    juice.screenFlashMax=Math.max(juice.screenFlashMax,juice.screenFlash);
  }

  function shockwave(x,y,color='rgb(255,238,180)',radius=12,life=14){
    state.entities.juiceShockwaves.push({
      x:nearestPixel(x),y:nearestPixel(y),color,
      radius:Math.max(2,radius),life,maxLife:life,
    });
    trim(state.entities.juiceShockwaves,JUICE_CONFIG.maxShockwaves);
  }

  function number(x,y,value,color='rgb(255,246,218)',options={}){
    if(value===null||value===undefined)return;
    const numeric=Number(value);
    const text=Number.isFinite(numeric)
      ?`${options.prefix??''}${Math.max(1,Math.round(Math.abs(numeric)))}`
      :String(value);
    state.entities.damageNumbers.push({
      x:nearestPixel(x),y:nearestPixel(y),text,color,
      life:options.life??42,maxLife:options.life??42,
      carryY:0,
      vy:options.vy??-.28,
      big:Boolean(options.big),
    });
    trim(state.entities.damageNumbers,JUICE_CONFIG.maxDamageNumbers);
  }

  function impact(x,y,options={}){
    const kind=options.kind??'enemy';
    const heavy=Boolean(options.heavy);
    const colors=options.colors??IMPACT_COLORS[kind]??IMPACT_COLORS.enemy;
    const angle=Number.isFinite(options.angle)?options.angle:0;
    burst(x,y,{
      colors,
      count:options.count??(heavy?18:7),
      speedMin:heavy?.55:.28,
      speedMax:heavy?2.1:1.25,
      angle:angle+Math.PI,
      spread:heavy?Math.PI*1.75:Math.PI*1.2,
      gravity:kind==='laser'?.035:.065,
      lifeMin:heavy?15:8,
      lifeMax:heavy?32:20,
      largeChance:heavy?.58:.86,
      kind:kind==='blade'?'slash':'pixel',
    });
    worldFlash(x,y,colors[0],heavy?6:3,heavy?9:5);
    if(options.damage)number(x,y-3,options.damage,options.numberColor??colors[0],{big:heavy});
    shake(options.shake??(heavy?3.4:.85),heavy?18:8);
    hitStop(options.hitStop??(heavy?3:1));
    play(kind==='blade'?'slice':'hit',heavy?1:.55);
  }

  function explosion(x,y,radius=8,options={}){
    const kind=options.kind??'fire';
    const colors=options.colors??(kind==='rainbow'?IMPACT_COLORS.rainbow:IMPACT_COLORS[kind]??IMPACT_COLORS.fire);
    const strength=Math.max(1,Math.min(16,radius));
    burst(x,y,{
      colors,
      count:Math.min(48,18+Math.round(strength*1.8)),
      speedMin:.65,
      speedMax:1.8+strength*.13,
      gravity:.05,
      lifeMin:16,
      lifeMax:38,
      largeChance:.46,
      kind:kind==='rainbow'?'star':'pixel',
      twinkle:kind==='rainbow'?3:0,
    });
    shockwave(x,y,colors[0],strength*1.5,18+Math.round(strength*.35));
    worldFlash(x,y,colors[0],Math.max(5,strength*.8),10);
    shake(Math.min(8,1.8+strength*.52),20+Math.round(strength));
    hitStop(Math.min(JUICE_CONFIG.maxHitStopFrames,3+Math.floor(strength/4)));
    screenFlash(kind==='rainbow'?'rgba(255,90,230,.18)':'rgba(255,218,158,.18)',4);
    play('explosion',Math.min(1,0.35+strength/16));
  }

  function weaponFire(kind,x,y,direction={x:1,y:0}){
    const colors=kind==='laser'?IMPACT_COLORS.laser:kind==='nyan'?IMPACT_COLORS.rainbow:['rgb(255,250,210)','rgb(255,190,70)'];
    const count=kind==='sword'?12:kind==='grenade'?7:kind==='nyan'?18:5;
    burst(x,y,{
      colors,count,
      speedMin:.25,speedMax:kind==='nyan'?1.7:1.05,
      angle:Math.atan2(direction.y,direction.x),spread:kind==='sword'?2.4:.8,
      gravity:.025,lifeMin:6,lifeMax:16,largeChance:.9,
      kind:kind==='sword'?'slash':'pixel',twinkle:kind==='nyan'?3:0,
    });
    juice.recoilFrames=Math.max(juice.recoilFrames,kind==='grenade'||kind==='nyan'?8:4);
    juice.recoilX=-Math.sign(direction.x||1)*(kind==='grenade'||kind==='nyan'?2:1);
    shake(kind==='nyan'?2.8:kind==='grenade'?1.6:kind==='gun'?.55:.35,8);
    if(kind==='gun')play('shot',.5);
    else if(kind==='sword')play('slice',.65);
    else if(kind==='nyan')play('nyan',.55);
  }

  function jump(x,y){
    burst(x,y,{colors:IMPACT_COLORS.dust,count:7,speedMin:.2,speedMax:.8,angle:Math.PI*.5,spread:2.4,gravity:.04,lifeMin:9,lifeMax:18});
    juice.playerStretch=Math.max(juice.playerStretch,6);
    play('jump',.35);
  }

  function bunnyHop(x,y,chain=2){
    const level=Math.max(2,Math.round(chain));
    const colors=level>=8
      ?IMPACT_COLORS.rainbow
      :['rgb(112,232,255)','rgb(203,250,255)','rgb(110,156,255)'];
    burst(x,y,{
      colors,
      count:Math.min(26,8+level*2),
      speedMin:.35,
      speedMax:1.05+level*.08,
      angle:-Math.PI*.5,
      spread:Math.PI*.8,
      gravity:.025,
      lifeMin:10,
      lifeMax:24,
      twinkle:level>=6?2:0,
      kind:level>=8?'star':'streak',
    });
    number(x,y-7,`X${level}`,level>=8?'rgb(255,126,238)':'rgb(151,239,255)',{life:28,big:level>=6,vy:-.34});
    worldFlash(x,y,level>=8?'rgb(255,92,225)':'rgb(124,232,255)',Math.min(7,3+Math.floor(level/2)),6);
    if(level>=4)shockwave(x,y,level>=8?'rgb(255,110,234)':'rgb(122,224,255)',4+level*.55,9);
    shake(Math.min(2.4,.25+level*.18),8+Math.floor(level/2));
    juice.playerStretch=Math.max(juice.playerStretch,7+Math.floor(level/3));
    juice.speedIntensity=Math.max(juice.speedIntensity,Math.min(1,.2+level*.08));
    play('jump',Math.min(1,.35+level*.055));
  }

  function land(x,y,speed=1){
    const strength=Math.max(.2,Math.min(3,Number(speed)||.2));
    burst(x,y,{colors:IMPACT_COLORS.dust,count:Math.round(5+strength*5),speedMin:.25,speedMax:.65+strength*.32,angle:-Math.PI*.5,spread:Math.PI*.92,gravity:.055,lifeMin:10,lifeMax:24});
    juice.playerSquash=Math.max(juice.playerSquash,Math.round(5+strength*2));
    if(strength>1){
      shake(strength*.7,9);
      shockwave(x,y,'rgb(205,187,147)',3+strength*2,9);
    }
    play('land',Math.min(.65,strength*.28));
  }

  function pickup(x,y,label='+1'){
    burst(x,y,{colors:IMPACT_COLORS.pickup,count:10,speedMin:.15,speedMax:.8,gravity:-.01,drag:.96,lifeMin:16,lifeMax:30,twinkle:3});
    worldFlash(x,y,'rgb(235,255,205)',4,9);
    number(x,y-3,label,'rgb(222,255,190)',{life:34});
    juice.hudPulse=Math.max(juice.hudPulse,12);
    play('pickup',.35);
  }

  function enemyDeath(x,y,color='rgb(255,120,100)'){
    burst(x,y,{colors:[color,'rgb(255,238,215)','rgb(110,43,58)'],count:20,speedMin:.3,speedMax:1.7,gravity:.07,lifeMin:14,lifeMax:34,largeChance:.55});
    shockwave(x,y,color,7,12);
    hitStop(2);
    shake(1.4,12);
    play('defeat',.45);
  }

  function bossSpawn(x,y,color='rgb(255,220,140)'){
    burst(x,y,{colors:[color,'rgb(255,255,245)','rgb(120,80,190)'],count:42,speedMin:.5,speedMax:2.4,gravity:-.005,drag:.97,lifeMin:22,lifeMax:48,largeChance:.5,twinkle:2});
    shockwave(x,y,color,20,28);
    screenFlash('rgba(255,244,210,.28)',8);
    shake(7,38);
    hitStop(6);
    play('boss',.9);
  }

  function bossDefeat(x,y,color='rgb(255,220,140)'){
    for(let wave=0;wave<3;wave++){
      burst(x,y,{colors:[color,...IMPACT_COLORS.rainbow],count:30,speedMin:.55+wave*.3,speedMax:2.4+wave*.45,gravity:.045,lifeMin:24,lifeMax:58,largeChance:.48,twinkle:3,kind:'star'});
    }
    shockwave(x,y,'rgb(255,255,255)',28,34);
    screenFlash('rgba(255,255,255,.42)',11);
    shake(9,48);
    hitStop(8);
    juice.celebrationFrames=Math.max(juice.celebrationFrames,150);
    play('victory',1);
  }


  function cellChange(event){
    if(!event||cellBurstBudget<=0)return;
    const reason=String(event.reason??'');
    if(reason==='simulation'||reason==='weather'||reason==='plant-growth'||reason==='safe-spawn'||reason==='player-depenetration')return;
    const dramatic=/destruculator|grenade|drone|nyan|laser|boss|explosion|weapon|reality|fire|harvest/.test(reason);
    if(!dramatic)return;
    const oldType=event.oldType;
    const newType=event.newType;
    const colorsByMaterial={
      [M.ROCK]:['rgb(151,153,164)','rgb(91,92,105)'],
      [M.DIRT]:['rgb(170,128,84)','rgb(104,76,55)'],
      [M.GRASS]:['rgb(113,189,88)','rgb(67,124,68)'],
      [M.SAND]:['rgb(231,205,139)','rgb(171,137,80)'],
      [M.WOOD]:['rgb(181,126,73)','rgb(102,69,48)'],
      [M.LEAF]:['rgb(102,186,83)','rgb(54,115,63)'],
      [M.CRYSTAL]:IMPACT_COLORS.crystal,
      [M.SNOW]:['rgb(244,251,255)','rgb(167,211,236)'],
      [M.ASH]:['rgb(139,123,119)','rgb(74,69,72)'],
      [M.MYCELIUM]:['rgb(204,113,188)','rgb(109,72,132)'],
      [M.BAMBOO]:['rgb(177,211,83)','rgb(91,144,65)'],
    };
    if(newType===M.STEAM){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:['rgba(239,250,255,.78)','rgba(154,207,226,.52)'],count:4,speedMin:.1,speedMax:.55,gravity:-.045,drag:.97,lifeMin:12,lifeMax:24});
      return;
    }
    if(newType===M.FIRE||newType===M.LAVA){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:IMPACT_COLORS.fire,count:4,speedMin:.15,speedMax:.75,gravity:-.025,lifeMin:9,lifeMax:19});
      return;
    }
    if(newType===M.AIR&&oldType!==M.AIR){
      cellBurstBudget--;
      burst(event.x,event.y,{colors:colorsByMaterial[oldType]??IMPACT_COLORS.dust,count:3,speedMin:.12,speedMax:.7,gravity:.06,lifeMin:8,lifeMax:18,largeChance:.9});
    }
  }

  function cameraOffset(){
    if(juice.shakeFrames<=0||juice.shake<=.05)return {x:0,y:0};
    const magnitude=Math.max(1,Math.ceil(juice.shake));
    const sx=Math.floor(random(1,1201)*(magnitude*2+1))-magnitude;
    const sy=Math.floor(random(2,1202)*(magnitude*2+1))-magnitude;
    return {x:sx,y:sy};
  }

  function moveInteger(entity){
    entity.carryX=(entity.carryX??0)+entity.vx;
    entity.carryY=(entity.carryY??0)+entity.vy;
    const dx=Math.trunc(entity.carryX);
    const dy=Math.trunc(entity.carryY);
    entity.carryX-=dx;
    entity.carryY-=dy;
    entity.x+=dx;
    entity.y+=dy;
  }

  function updateParticles(){
    const particles=state.entities.juiceParticles;
    for(let index=particles.length-1;index>=0;index--){
      const item=particles[index];
      item.vx*=item.drag;
      item.vy=item.vy*item.drag+item.gravity;
      moveInteger(item);
      item.life--;
      if(item.life<=0)particles.splice(index,1);
    }
    for(let index=state.entities.damageNumbers.length-1;index>=0;index--){
      const item=state.entities.damageNumbers[index];
      item.carryY+=item.vy;
      const dy=Math.trunc(item.carryY);
      item.carryY-=dy;
      item.y+=dy;
      item.vy*=.96;
      item.life--;
      if(item.life<=0)state.entities.damageNumbers.splice(index,1);
    }
    for(let index=state.entities.juiceFlashes.length-1;index>=0;index--){
      const item=state.entities.juiceFlashes[index];
      item.life--;
      if(item.life<=0)state.entities.juiceFlashes.splice(index,1);
    }
    for(let index=state.entities.juiceShockwaves.length-1;index>=0;index--){
      const item=state.entities.juiceShockwaves[index];
      item.life--;
      if(item.life<=0)state.entities.juiceShockwaves.splice(index,1);
    }
  }

  function observeExplosions(){
    for(const effect of state.entities.explosions){
      if(observedExplosions.has(effect))continue;
      observedExplosions.add(effect);
      const kind=effect.kind==='nyan'?'rainbow':effect.kind==='serpent'?'crystal':'fire';
      explosion(effect.x,effect.y,Math.min(16,effect.radius??7),{kind,color:effect.color});
    }
  }

  function observeHealth(){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const previous=healthSnapshots.get(enemy);
        if(Number.isFinite(previous)&&enemy.hp<previous){
          const delta=previous-enemy.hp;
          const last=hitEffectFrames.get(enemy)??-999;
          const interval=delta>=8?0:delta>=2?3:7;
          if(delta>=.35&&state.frame-last>=interval){
            impact(enemy.x,enemy.y-1,{kind:'enemy',damage:delta,shake:delta>25?1.8:.35,hitStop:delta>25?2:0,count:delta>25?12:5});
            hitEffectFrames.set(enemy,state.frame);
          }
        }
        healthSnapshots.set(enemy,enemy.hp);
      }
    }
    for(const boss of state.entities.bosses){
      const previous=healthSnapshots.get(boss);
      if(Number.isFinite(previous)&&boss.hp<previous){
        const delta=previous-boss.hp;
        const last=hitEffectFrames.get(boss)??-999;
        const interval=delta>=10?0:delta>=2?3:7;
        if(delta>=.3&&state.frame-last>=interval){
          impact(boss.x,boss.y,{kind:'boss',damage:delta,heavy:delta>=25,shake:delta>=25?2.8:.55,hitStop:delta>=25?3:0,count:delta>=25?16:6});
          hitEffectFrames.set(boss,state.frame);
        }
      }
      healthSnapshots.set(boss,boss.hp);
    }
  }

  function observeProjectiles(){
    const current=new Set();
    const tracked=[
      ['bullet',state.entities.bullets],
      ['grenade',state.entities.grenades],
      ['glaive',state.entities.glaives],
      ['nyan',state.entities.nyanCats],
    ];
    for(const [kind,array] of tracked){
      for(const entity of array){
        current.add(entity);
        const previous=projectileSnapshots.get(entity);
        if(kind==='glaive'&&previous&&Number(entity.bounces??0)>Number(previous.bounces??0)){
          impact(entity.x,entity.y,{kind:'blade',angle:Math.atan2(entity.vy,entity.vx),count:9,shake:.6,hitStop:1});
        }
        if(kind==='nyan'&&previous&&Number(entity.bounces??0)>Number(previous.bounces??0)){
          burst(entity.x,entity.y,{colors:IMPACT_COLORS.rainbow,count:14,speedMin:.35,speedMax:1.3,gravity:.04,lifeMin:10,lifeMax:24,twinkle:2});
          shake(1.1,8);
          play('bounce',.45);
        }
        projectileSnapshots.set(entity,{x:entity.x,y:entity.y,bounces:entity.bounces??0,kind});
      }
    }
    for(const [entity,previous] of projectileSnapshots){
      if(current.has(entity))continue;
      projectileSnapshots.delete(entity);
      if(previous.kind==='bullet')impact(previous.x,previous.y,{kind:'bullet',count:5,shake:.25,hitStop:0});
    }
  }

  function observeMotion(){
    const speed=Math.hypot(state.player.vx??0,state.player.vy??0);
    juice.speedIntensity=Math.max(0,Math.min(1,(speed-.75)/1.4));
    if(state.player.grounded&&Math.abs(state.player.vx)>.34&&state.frame%7===0){
      particle(state.player.x-Math.sign(state.player.vx||1),state.player.y,{vx:-state.player.vx*.2,vy:-.18,gravity:.04,drag:.9,life:10,color:'rgba(196,178,140,.55)'});
    }
    if(speed>1.15&&state.frame%4===0){
      particle(state.player.x-Math.sign(state.player.vx||1)*2,state.player.y-2,{
        vx:-state.player.vx*.35,vy:-state.player.vy*.18,gravity:0,drag:.9,life:9,
        color:'rgba(180,225,255,.55)',kind:'streak',
      });
    }
  }

  function update(){
    cellBurstBudget=JUICE_CONFIG.maxCellBurstsPerFrame;
    const frozen=juice.hitStopFrames>0;
    if(juice.hitStopFrames>0)juice.hitStopFrames--;
    if(juice.shakeFrames>0){
      juice.shakeFrames--;
      juice.shake*=.86;
    }else juice.shake=0;
    if(juice.screenFlash>0)juice.screenFlash--;
    if(juice.recoilFrames>0)juice.recoilFrames--;
    else juice.recoilX=0;
    if(juice.playerSquash>0)juice.playerSquash--;
    if(juice.playerStretch>0)juice.playerStretch--;
    if(juice.hudPulse>0)juice.hudPulse--;
    if(juice.celebrationFrames>0){
      juice.celebrationFrames--;
      if(state.frame%4===0){
        particle(state.player.x-24+Math.floor(random(3)*48),state.player.y-28,{
          vx:(random(4)-.5)*.8,vy:.25+random(5)*.45,gravity:.01,drag:.99,
          life:28+Math.floor(random(6)*28),color:IMPACT_COLORS.rainbow[Math.floor(random(7)*6)],kind:'star',twinkle:3,
        });
      }
    }
    updateParticles();
    observeMotion();
    return frozen;
  }

  function afterSimulation(){
    observeExplosions();
    observeHealth();
    observeProjectiles();
  }

  function play(kind,intensity=.5){
    if(state.frame-lastAudioFrame<2&&kind!=='explosion'&&kind!=='boss'&&kind!=='victory')return;
    lastAudioFrame=state.frame;
    try{
      const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!AudioContextClass)return;
      audioContext??=new AudioContextClass();
      if(audioContext.state==='suspended')audioContext.resume?.();
      const now=audioContext.currentTime;
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const settings={
        shot:['square',180,70,.055],
        hit:['square',110,55,.04],
        slice:['sawtooth',360,110,.07],
        explosion:['sawtooth',85,28,.18],
        jump:['square',180,280,.08],
        land:['triangle',95,55,.06],
        pickup:['sine',520,820,.1],
        defeat:['square',180,75,.12],
        boss:['sawtooth',72,42,.36],
        victory:['square',260,780,.42],
        bounce:['square',240,145,.055],
        nyan:['square',330,660,.12],
      }[kind]??['square',160,90,.06];
      oscillator.type=settings[0];
      oscillator.frequency.setValueAtTime(settings[1],now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,settings[2]),now+settings[3]);
      gain.gain.setValueAtTime(Math.min(.055,.015+.035*intensity),now);
      gain.gain.exponentialRampToValueAtTime(.0001,now+settings[3]);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now+settings[3]+.01);
    }catch{
      // Audio is optional and may be unavailable before a user gesture.
    }
  }

  return {
    update,afterSimulation,cameraOffset,
    particle,burst,impact,explosion,weaponFire,jump,bunnyHop,land,pickup,
    enemyDeath,bossSpawn,bossDefeat,cellChange,shake,hitStop,worldFlash,screenFlash,shockwave,number,play,
  };
}
