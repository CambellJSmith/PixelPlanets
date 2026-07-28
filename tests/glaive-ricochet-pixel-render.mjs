import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MaterialId } from '../src/data/materials.db.js';
import { WeaponId } from '../src/data/weapons.db.js';
import { GLAIVE_CONFIG, WORLD_WIDTH } from '../src/config.js';
import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createWeaponSystem } from '../src/systems/weapon-system.js';
import { createProjectileSystem } from '../src/systems/projectile-system.js';

const M=MaterialId;
const state=createGameState();
state.seed=991948530;
const noise=createNoise(state);
const generator=createWorldGenerator(state,noise);
const chunks=createChunkManager(state,generator);
const cells=createCellAccess(state,chunks,noise);
const hud={update(){},showMessage(){}};
const weapons=createWeaponSystem(state,cells,chunks,noise,hud);
const projectiles=createProjectileSystem(state,cells,chunks,noise);

Object.assign(state.player,{x:30,y:32,vx:0,vy:0,hp:100});
chunks.updateActiveNeighborhood();
for(let y=18;y<=45;y++)for(let x=24;x<=44;x++)cells.setCell(x,y,M.AIR);
for(let y=18;y<=45;y++)cells.setCell(38,y,M.ROCK);

state.weaponId=WeaponId.GLAIVE;
state.input.pointerX=44-state.world.camera.chunkX*WORLD_WIDTH;
state.input.pointerY=30-state.world.camera.chunkY*105;
weapons.attack();

const blade=state.entities.glaives[0];
if(!blade)throw new Error('Glaive attack did not create a projectile.');
if(!Number.isFinite(blade.spin)||!Number.isFinite(blade.spinSpeed))throw new Error('Glaive did not initialize spin state.');
if(Math.abs(Math.hypot(blade.vx,blade.vy)-GLAIVE_CONFIG.launchSpeed)>.01)throw new Error('Glaive launch speed ignored its configuration.');

const initialSpin=blade.spin;
let ricocheted=false;
for(let tick=0;tick<20;tick++){
  state.frame++;
  projectiles.update();
  if(blade.bounces>0){ ricocheted=true; break; }
}

if(blade.spin===initialSpin)throw new Error('Glaive did not spin while in flight.');
if(!ricocheted)throw new Error('Glaive did not ricochet from a solid wall.');
if(blade.vx>=0)throw new Error('Horizontal wall ricochet did not reverse horizontal velocity.');
if(cells.isSolid(cells.getCell(Math.floor(blade.x),Math.floor(blade.y))))throw new Error('Glaive became embedded in terrain after ricochet.');

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=fs.readFileSync(path.join(root,'src/render/renderer.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const forbidden=[
  /beginPath\s*\(/,
  /\.arc\s*\(/,
  /\.stroke\s*\(/,
  /strokeRect\s*\(/,
  /\.moveTo\s*\(/,
  /\.lineTo\s*\(/,
  /\.clip\s*\(/,
  /drawImage\s*\(/,
];
for(const pattern of forbidden){
  if(pattern.test(renderer))throw new Error(`Renderer still contains an antialiased vector operation: ${pattern}`);
}
if(!/imageSmoothingEnabled\s*=\s*false/.test(renderer))throw new Error('Canvas smoothing is not explicitly disabled.');
if(!/image-rendering:\s*pixelated/.test(styles)||!/image-rendering:\s*crisp-edges/.test(styles)){
  throw new Error('Canvas CSS does not enforce nearest-neighbor scaling.');
}

console.log('glaive ricochet and pixel-only rendering test passed',{bounces:blade.bounces,spin:blade.spin.toFixed(2)});
