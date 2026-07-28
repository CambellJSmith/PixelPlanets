import { createGameState } from '../src/state/game-state.js';
import { createPlayerSystem } from '../src/systems/player-system.js';
import { createHud } from '../src/ui/hud.js';
import { MaterialId, SOLID_MATERIALS } from '../src/data/materials.db.js';
import { BREATH_CONFIG } from '../src/config.js';

const M=MaterialId;
const grid=new Map();
const key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
const cells={
  getCell(x,y){ return grid.get(key(x,y))??M.AIR; },
  setCell(x,y,type){ grid.set(key(x,y),type); return true; },
  isSolid(type){ return SOLID_MATERIALS.has(type); },
};
const state=createGameState();
Object.assign(state.player,{x:5,y:10,vx:0,vy:0,grounded:false,invulnerability:0});
const noop=()=>{};
const generator={
  biomeNameAt:()=>state.world.dimension==='earth'?'ocean':'clockwork',
  dimensionGravityScale:()=>1,
};
const timeSystem={getTime:()=>({label:'Day 1 · 12:00',isDay:true})};
const hud=createHud(state,generator,timeSystem,{getWeather:()=>({label:'Clear',windLabel:'calm',type:'clear'})});
const system=createPlayerSystem(
  state,cells,
  {chunkX:()=>0,chunkY:()=>0,updateActiveNeighborhood:noop},
  generator,{attack:noop},hud,
  {burst:noop,worldFlash:noop,impact:noop,screenFlash:noop,land:noop,jump:noop,bunnyHop:noop},
);

// Submerge the full 3x5 player footprint.
for(let y=-20;y<=25;y++)for(let x=-20;x<=40;x++)cells.setCell(x,y,M.WATER);
state.input.keys.add('d');
state.input.keys.add('w');
const breathBefore=state.player.breath;
for(let frame=0;frame<40;frame++){
  state.frame++;
  system.update();
}
if(!state.player.status.swimming)throw new Error('Player did not enter swimming state in water.');
if(!state.player.status.headSubmerged)throw new Error('Submerged head was not detected.');
if(!(state.player.breath<breathBefore))throw new Error('Breath did not drain underwater.');
if(!(state.player.vy<0))throw new Error('Up input did not propel the swimmer upward.');
hud.update();
if(!state.ui.hud.breathUsing)throw new Error('Breath HUD did not become visible while breath was used.');

// Clear the water and verify breathable Earth air restores breath and hides the bar.
grid.clear();
state.input.keys.clear();
const lowBreath=state.player.breath;
for(let frame=0;frame<60;frame++){
  state.frame++;
  system.update();
}
if(state.player.status.breathUsing)throw new Error('Breath remained in use after leaving water on Earth.');
if(!(state.player.breath>lowBreath))throw new Error('Breath did not recover in oxygenated air.');
hud.update();
if(state.ui.hud.breathUsing)throw new Error('Breath HUD remained visible when breath was not being used.');

// Clockwork has no oxygen, so breath must drain even in open air.
state.world.dimension='clockwork';
state.player.breath=100;
state.player.breathRemainder=0;
for(let frame=0;frame<60;frame++){
  state.frame++;
  system.update();
}
if(!state.player.status.noOxygen||!state.player.status.breathUsing)throw new Error('No-oxygen atmosphere was not applied.');
if(!(state.player.breath<100))throw new Error('Breath did not drain in a no-oxygen dimension.');

// Zero breath causes periodic drowning/asphyxiation damage.
state.player.breath=0;
state.player.hp=100;
state.player.invulnerability=0;
for(let frame=0;frame<BREATH_CONFIG.drowningIntervalFrames+2;frame++){
  state.frame++;
  system.update();
}
if(!(state.player.hp<100))throw new Error('Zero breath did not damage the player.');

console.log('swimming, breath, and atmosphere test passed',{
  breath:state.player.breath.toFixed(2),
  hp:state.player.hp,
  dimension:state.world.dimension,
});
