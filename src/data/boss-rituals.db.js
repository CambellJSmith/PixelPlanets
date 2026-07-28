import { BossKind } from './bosses.db.js';

const K=BossKind;

export const BOSS_RITUAL_DB=Object.freeze({
  [K.CALDERA_TYRANT]:Object.freeze({
    title:'WAKE THE CALDERA',
    hint:'STAND ABOVE THE CRATER HEAT',
    progressFrames:180,
  }),
  [K.SEA_SERPENT]:Object.freeze({
    title:'BAIT THE ABYSS',
    hint:'CARRY FISH INTO DEEP WATER',
    progressFrames:180,
  }),
  [K.FROST_COLOSSUS]:Object.freeze({
    title:'BUILD A SNOW IDOL',
    hint:'12 SNOW DURING SNOWFALL',
    progressFrames:180,
  }),
  [K.BOG_LEVIATHAN]:Object.freeze({
    title:'VENOM OFFERING',
    hint:'3 VENOM SACS IN SWAMP MIRE',
    progressFrames:180,
  }),
  [K.MYCELIAL_MONARCH]:Object.freeze({
    title:'BURN THE DEEP ROOTS',
    hint:'KEEP 3 FIRES AMONG MYCELIUM',
    progressFrames:180,
  }),
  [K.BAMBOO_WAR_MACHINE]:Object.freeze({
    title:'LIGHT THE SIGNAL GROVE',
    hint:'BURN BAMBOO WITH 8 IN PACK',
    progressFrames:180,
  }),
  [K.CANOPY_WYRM]:Object.freeze({
    title:'CALL FROM THE CANOPY',
    hint:'CLIMB HIGH WITH 2 BRIGHT FEATHERS',
    progressFrames:180,
  }),
  [K.CRYSTAL_BURROWER]:Object.freeze({
    title:'RESONATE THE VEIN',
    hint:'5 CRYSTAL FRAGMENTS BY DEEP CRYSTAL',
    progressFrames:180,
  }),
  [K.MAGMA_BEHEMOTH]:Object.freeze({
    title:'QUENCH THE MAGMA HEART',
    hint:'MAKE STEAM BESIDE DEEP LAVA',
    progressFrames:180,
  }),
  [K.STORM_ROC]:Object.freeze({
    title:'CHALLENGE THE STORM',
    hint:'STAND UNCOVERED IN PLAINS THUNDER',
    progressFrames:240,
  }),
  [K.MOON_STALKER]:Object.freeze({
    title:'WAIT IN TRUE DARKNESS',
    hint:'STAND STILL AT NIGHT WITHOUT FIRE',
    progressFrames:240,
  }),
  [K.DROWNED_FLEET]:Object.freeze({
    title:'PAY THE DROWNED',
    hint:'3 PEARLS DURING AN OCEAN STORM',
    progressFrames:180,
  }),
  [K.SKY_JELLYFISH]:Object.freeze({
    title:'CHARGE THE SKY',
    hint:'2 ELECTRIC GLANDS IN A HIGH STORM',
    progressFrames:180,
  }),
  [K.WORLD_EATER]:Object.freeze({
    title:'DRAW THE WORLD EATER',
    hint:'GO DEEP AFTER 5 BOSS VICTORIES',
    progressFrames:180,
  }),
});

export function bossRitualDefinition(kind){
  return BOSS_RITUAL_DB[kind]??null;
}
