export const ENTITY_DB = Object.freeze({
  player: {
    maxHealth: 100,
    width: 3,
    height: 5,
  },
  surfaceEnemy: {
    maxHealth: 30,
    contactDamage: 5,
    aggroRange: 48,
  },
  caveEnemy: {
    maxHealth: 45,
    contactDamage: 5,
    aggroRange: 48,
  },
  calderaBoss: {
    maxHealth: 320,
    width: 17,
    height: 11,
    contactDamage: 8,
  },
  seaSerpent: {
    maxHealth: 380,
    width: 15,
    height: 14,
    contactDamage: 9,
  },
  grenade: {
    fuseFrames: 78,
    blastRadius: 7,
    fireRadius: 9,
    directDamage: 0,
  },
});
