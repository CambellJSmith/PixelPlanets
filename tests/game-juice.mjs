import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createJuiceSystem } from '../src/systems/juice-system.js';
import { JUICE_CONFIG } from '../src/config.js';

const state=createGameState();
state.seed=4242442;
const juice=createJuiceSystem(state,createNoise(state));

juice.impact(20,30,{kind:'bullet',damage:22,heavy:true});
if(state.entities.juiceParticles.length===0)throw new Error('Heavy impact did not create particles.');
if(state.entities.damageNumbers.length!==1)throw new Error('Heavy impact did not create a damage number.');
if(state.juice.shake<=0)throw new Error('Heavy impact did not create camera shake.');
if(state.juice.hitStopFrames<=0)throw new Error('Heavy impact did not create hit-stop.');

juice.explosion(24,34,12,{kind:'rainbow'});
if(state.entities.juiceShockwaves.length===0)throw new Error('Explosion did not create a shockwave.');
if(state.juice.screenFlash<=0)throw new Error('Explosion did not create a screen flash.');

for(let index=0;index<JUICE_CONFIG.maxParticles+100;index++){
  juice.particle(index,0,{life:5});
}
if(state.entities.juiceParticles.length>JUICE_CONFIG.maxParticles){
  throw new Error(`Juice particle cap failed: ${state.entities.juiceParticles.length}.`);
}

const frozen=juice.update();
if(!frozen)throw new Error('Hit-stop was not consumed as a frozen simulation frame.');
const offset=juice.cameraOffset();
if(!Number.isInteger(offset.x)||!Number.isInteger(offset.y))throw new Error('Camera shake offset was not integer-pixel aligned.');

juice.pickup(12,12,'+3');
if(state.juice.hudPulse<=0)throw new Error('Pickup did not pulse the resource HUD.');
juice.land(10,10,1.4);
if(state.juice.playerSquash<=0)throw new Error('Landing did not trigger player squash.');
juice.jump(10,10);
if(state.juice.playerStretch<=0)throw new Error('Jump did not trigger player stretch.');

for(let frame=0;frame<100;frame++){
  state.frame++;
  juice.update();
}
if(state.entities.juiceParticles.some(item=>item.life<=0))throw new Error('Expired juice particle was retained.');

console.log('game juice test passed',{
  particleCap:JUICE_CONFIG.maxParticles,
  shakeOffset:[offset.x,offset.y],
});
