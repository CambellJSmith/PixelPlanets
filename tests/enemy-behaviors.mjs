import { createGameState } from '../src/state/game-state.js';
import { createNoise } from '../src/world/noise.js';
import { createWorldGenerator } from '../src/world/generator.js';
import { createChunkManager } from '../src/world/chunks.js';
import { createCellAccess } from '../src/world/cells.js';
import { createEnemySystem } from '../src/systems/enemy-system.js';
import { faunaById, faunaBehaviors } from '../src/data/fauna.db.js';
import { MaterialId } from '../src/data/materials.db.js';
import { WeaponId } from '../src/data/weapons.db.js';

const M=MaterialId;

function harness(seed=0x5eeda11){
  const state=createGameState();
  state.seed=seed;
  Object.assign(state.player,{x:25,y:50,hp:100,invulnerability:0,skySpawn:false,locked:false});
  const noise=createNoise(state);
  const generator=createWorldGenerator(state,noise);
  const chunks=createChunkManager(state,generator);
  const cells=createCellAccess(state,chunks,noise);
  chunks.updateActiveNeighborhood();
  const chunk=chunks.getChunk(0,0,true);
  for(const active of state.world.activeChunks)active.enemies.length=0;
  state.entities.pickups.length=0;
  state.entities.enemyNests.length=0;
  state.entities.invasionPortals.length=0;
  state.world.nextInvasionFrame=Number.MAX_SAFE_INTEGER;
  for(let y=25;y<=70;y++)for(let x=5;x<=170;x++)cells.setCell(x,y,y>=51?M.ROCK:M.AIR,0,{silent:true,allowPlayerOverlap:true});
  let damage=0;
  const playerSystem={damage(amount){ damage+=amount; state.player.hp-=amount; }};
  const crops={spawnLootPickup(){ return null; }};
  const messages=[];
  const hud={update(){},showMessage(text){ messages.push(String(text)); }};
  const juice={burst(){},shockwave(){},worldFlash(){},screenFlash(){},impact(){},enemyDeath(){}};
  const enemies=createEnemySystem(state,cells,chunks,playerSystem,noise,crops,hud,juice);
  return{state,noise,generator,chunks,cells,chunk,enemies,messages,get damage(){return damage;}};
}

function creature(speciesId,x,y,extra={}){
  const species=faunaById(speciesId);
  if(!species)throw new Error(`Unknown test species ${speciesId}`);
  return{
    speciesId,x,y,vx:0,vy:0,moveCarryX:0,moveCarryY:0,hp:species.hp,maxHp:species.hp,
    phase:0,animationOffset:x,facing:-1,hit:0,burning:0,attackCooldown:0,hopCooldown:100,
    idleTimer:1,startled:0,nestTimer:99999,burrowCooldown:99999,theftCooldown:0,...extra,
  };
}

for(const [id,role] of [
  ['burrow_worm','burrower'],['cave_spider','wall_climber'],['grey_wolf','pack_hunter'],
  ['stump_mimic','mimic'],['giant_spider','nest_builder'],['swamp_rat','scavenger'],
  ['giant_leech','parasite'],['gear_gremlin','weapon_thief'],
]){
  if(!faunaBehaviors(id).includes(role))throw new Error(`${id} is missing ${role}.`);
}

// Burrowers enter solid ground and advance through it instead of treating it as a wall.
{
  const h=harness(101);
  h.state.player.x=35;
  const worm=creature('burrow_worm',62,50,{burrowCooldown:0});
  h.chunk.enemies.push(worm);
  h.state.frame++;
  h.enemies.update();
  if(!worm.burrowed)throw new Error('Burrower did not enter the ground when stalking from range.');
  const startX=worm.x;
  for(let frame=0;frame<45;frame++){ h.state.frame++; h.enemies.update(); }
  if(worm.x>=startX)throw new Error('Burrower did not travel toward the player through solid terrain.');
  if(!h.cells.isSolid(h.cells.getCell(worm.x,worm.y)))throw new Error('Burrower was not actually inside solid terrain.');
}

// Climbers detect a wall and convert pursuit into vertical movement.
{
  const h=harness(202);
  h.state.player.x=58;
  h.state.player.y=35;
  for(let y=31;y<=51;y++)h.cells.setCell(50,y,M.ROCK,0,{silent:true,allowPlayerOverlap:true});
  const spider=creature('cave_spider',49,50,{facing:1});
  h.chunk.enemies.push(spider);
  const startY=spider.y;
  for(let frame=0;frame<50;frame++){ h.state.frame++; h.enemies.update(); }
  if(!spider.climbing&&spider.y>=startY)throw new Error('Wall climber did not climb the blocking wall.');
  if(spider.y>=startY)throw new Error('Wall climber did not gain vertical height.');
}

// Pack hunters coordinate and receive a bounded group pursuit bonus.
{
  const h=harness(303);
  h.state.player.x=35;
  const wolfA=creature('grey_wolf',60,50,{animationOffset:0});
  const wolfB=creature('grey_wolf',66,50,{animationOffset:1});
  h.chunk.enemies.push(wolfA,wolfB);
  for(let frame=0;frame<15;frame++){ h.state.frame++; h.enemies.update(); }
  if(wolfA.packCount<2||wolfB.packCount<2)throw new Error('Pack hunters did not recognize nearby allies.');
  if(Math.abs(wolfA.vx)<.1||Math.abs(wolfB.vx)<.1)throw new Error('Pack hunters did not pursue as a group.');
}

// Mimics remain disguised and motionless until the player enters ambush range.
{
  const h=harness(404);
  h.state.player.x=20;
  const mimic=creature('stump_mimic',75,50);
  h.chunk.enemies.push(mimic);
  for(let frame=0;frame<10;frame++){ h.state.frame++; h.enemies.update(); }
  if(!mimic.disguised||mimic.mimicAwake)throw new Error('Mimic failed to remain disguised at long range.');
  h.state.player.x=70;
  h.state.frame++;
  h.enemies.update();
  if(!mimic.mimicAwake||mimic.disguised)throw new Error('Mimic did not awaken when approached.');
}

// Nest builders leave persistent nests, and mature nests produce reinforcements.
{
  const h=harness(505);
  h.state.player.x=20;
  const spider=creature('giant_spider',90,50,{nestTimer:0});
  h.chunk.enemies.push(spider);
  h.state.frame++;
  h.enemies.update();
  if(h.state.entities.enemyNests.length!==1)throw new Error('Nest builder did not construct a nest.');
  const nest=h.state.entities.enemyNests[0];
  nest.spawnTimer=0;
  const before=h.chunk.enemies.length;
  h.state.frame++;
  h.enemies.update();
  if(h.chunk.enemies.length<=before)throw new Error('Enemy nest did not spawn a reinforcement.');
}

// Scavengers divert toward loose items, consume them, heal, and grow.
{
  const h=harness(606);
  h.state.player.x=20;
  const rat=creature('swamp_rat',70,50,{hp:2});
  h.chunk.enemies.push(rat);
  h.state.entities.pickups.push({kind:'loot',lootId:'fang',amount:2,x:65,y:50,vx:0,vy:0,life:999,bob:0});
  for(let frame=0;frame<90&&h.state.entities.pickups.length;frame++){ h.state.frame++; h.enemies.update(); }
  if(h.state.entities.pickups.length!==0)throw new Error('Scavenger did not consume the nearby dropped item.');
  if(rat.hp<=2||!rat.fedLevel)throw new Error('Scavenger did not heal and grow after feeding.');
}

// Parasites leave the chunk, attach to the player, inflict a movement penalty,
// then can be shaken loose by sustained movement.
{
  const h=harness(707);
  h.state.player.x=40;
  const leech=creature('giant_leech',41,48);
  h.chunk.enemies.push(leech);
  h.state.frame++;
  h.enemies.update();
  if(h.state.player.attachedParasites.length!==1)throw new Error('Parasite did not attach to the player.');
  if(h.chunk.enemies.includes(leech))throw new Error('Attached parasite remained as a free enemy.');
  h.state.player.vx=4;
  h.state.player.vy=-2;
  for(let frame=0;frame<80&&h.state.player.attachedParasites.length;frame++){ h.state.frame++; h.enemies.update(); }
  if(h.state.player.attachedParasites.length!==0)throw new Error('Player movement did not shake off the parasite.');
}

// Weapon thieves disable the equipped weapon until the carrier is killed.
{
  const h=harness(808);
  h.state.player.x=40;
  h.state.weaponId=WeaponId.LASER_RIFLE;
  const thief=creature('gear_gremlin',41,48);
  h.chunk.enemies.push(thief);
  h.state.frame++;
  h.enemies.update();
  if(h.state.player.stolenWeaponId!==WeaponId.LASER_RIFLE)throw new Error('Weapon thief did not steal the equipped weapon.');
  if(thief.stolenWeaponId!==WeaponId.LASER_RIFLE)throw new Error('Weapon thief did not visibly carry the stolen weapon.');
  thief.hp=0;
  h.state.frame++;
  h.enemies.update();
  if(h.state.player.stolenWeaponId!==null)throw new Error('Killing the thief did not recover the stolen weapon.');
}

// Unstable portals create finite, dimension-themed invasion waves.
{
  const h=harness(909);
  const portal=h.enemies.openInvasionPortal('clockwork',80,45,{waveSize:4});
  if(!portal)throw new Error('Could not open an unstable invasion portal.');
  portal.spawnTimer=0;
  for(let frame=0;frame<220;frame++){ h.state.frame++; h.enemies.update(); }
  const invaders=h.chunk.enemies.filter(enemy=>enemy.invader);
  if(invaders.length<4)throw new Error(`Invasion portal spawned only ${invaders.length} invaders.`);
  if(!invaders.some(enemy=>enemy.speciesId==='gear_gremlin'))throw new Error('Clockwork invasion lacked its weapon-thief archetype.');
  if(portal.spawned!==4)throw new Error('Invasion portal exceeded or missed its configured wave size.');
}

console.log('enemy behavior test passed',{
  roles:9,
  invaders:6,
  maxNests:8,
});
