export const WeaponId = Object.freeze({
  GUN: 0,
  NAPALM_SPRAYER: 1,
  GLAIVE: 2,
  HOOK: 3,
  SWORD: 4,
  GRENADE: 5,
  DESTRUCULATOR: 6,
  DRONE_STRIKE: 7,
  LASER_RIFLE: 8,
  NYAN_CAT_LAUNCHER: 9,
  REALITY_ZIPPER: 10,
});

const W = WeaponId;

export const WEAPON_DB = Object.freeze([
  { id:W.GUN, name:'gun', cooldown:9, terrainDamage:'negligible' },
  { id:W.NAPALM_SPRAYER, name:'napalm_sprayer', cooldown:2, terrainDamage:'fire only' },
  { id:W.GLAIVE, name:'glaive', cooldown:24, terrainDamage:'none' },
  { id:W.HOOK, name:'hook', cooldown:8, terrainDamage:'none' },
  { id:W.SWORD, name:'sword', cooldown:16, terrainDamage:'none' },
  { id:W.GRENADE, name:'grenade', cooldown:34, terrainDamage:'circular blast' },
  { id:W.DESTRUCULATOR, name:'destruculator', cooldown:4, terrainDamage:'extract only' },
  { id:W.DRONE_STRIKE, name:'drone_strike', cooldown:210, terrainDamage:'large circular strike' },
  { id:W.LASER_RIFLE, name:'laser_rifle', cooldown:1, terrainDamage:'continuous heat' },
  { id:W.NYAN_CAT_LAUNCHER, name:'nyan_cat_launcher', cooldown:150, terrainDamage:'rainbow star burst' },
  { id:W.REALITY_ZIPPER, name:'reality_zipper', cooldown:270, terrainDamage:'temporary psychedelic rift' },
]);

export function weaponName(id){
  return WEAPON_DB[id]?.name ?? 'unknown';
}
