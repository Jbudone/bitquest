// shared/src/husbandry.ts
// BitQuest Cozy Animal Husbandry & Village Pet Sanctuary Engine
// Milestone 7: Sanctuary pasture, affection hearts, favorite crop feeding, and animal produce

export type SanctuaryAnimalSpecies = 'sheep' | 'cow' | 'bunny' | 'duck';

export interface SanctuaryAnimalDef {
  id: string;
  species: SanctuaryAnimalSpecies;
  name: string;
  favoriteFood: string;
  secondaryFoods: readonly string[];
  produceItem: string | null;
  produceIntervalSec: number;
  initialX: number;
  initialY: number;
  greetingText: string;
}

export interface SanctuaryAnimalState {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  isEating: boolean;
  eatTimerSec: number;
  affection: number; // 0 to 100
  lastPetSec: number;
  lastProduceSec: number;
  produceReady: boolean;
}

export const SANCTUARY_CONFIG = {
  PASTURE: {
    minX: 660,
    maxX: 780,
    minY: 340,
    maxY: 420
  },
  MAX_AFFECTION: 100,
  HEART_STEP: 20, // 5 hearts total
  PET_COOLDOWN_SEC: 10,
  PET_AFFECTION: 5,
  FEED_FAVORITE_AFFECTION: 15,
  FEED_NORMAL_AFFECTION: 6
};

export const SANCTUARY_ANIMALS: readonly SanctuaryAnimalDef[] = [
  {
    id: 'husbandry_sheep_bella',
    species: 'sheep',
    name: 'Bella the Cloud Sheep',
    favoriteFood: 'crop_turnip',
    secondaryFoods: ['seed_turnip', 'seed_corn', 'crop_corn'],
    produceItem: 'material_soft_wool',
    produceIntervalSec: 60,
    initialX: 690,
    initialY: 370,
    greetingText: 'Baaa! Bella nudges you happily.'
  },
  {
    id: 'husbandry_cow_clover',
    species: 'cow',
    name: 'Clover the Highland Cow',
    favoriteFood: 'crop_corn',
    secondaryFoods: ['crop_turnip', 'seed_corn'],
    produceItem: 'material_fresh_milk',
    produceIntervalSec: 60,
    initialX: 750,
    initialY: 360,
    greetingText: 'Mooo! Clover gently swishes her tail.'
  },
  {
    id: 'husbandry_bunny_pip',
    species: 'bunny',
    name: 'Pip the Meadow Bunny',
    favoriteFood: 'crop_strawberry',
    secondaryFoods: ['seed_strawberry', 'crop_turnip'],
    produceItem: null,
    produceIntervalSec: 0,
    initialX: 720,
    initialY: 395,
    greetingText: '*Sniff sniff* Pip wiggles his cute nose.'
  },
  {
    id: 'husbandry_duck_quigley',
    species: 'duck',
    name: 'Quigley the Pond Duckling',
    favoriteFood: 'seed_corn',
    secondaryFoods: ['seed_turnip', 'acorn'],
    produceItem: null,
    produceIntervalSec: 0,
    initialX: 700,
    initialY: 410,
    greetingText: 'Quack quack! Quigley flaps his little wings.'
  }
];

export class HusbandryEngine {
  /**
   * Initializes state for a sanctuary animal.
   */
  public static createInitialState(def: SanctuaryAnimalDef): SanctuaryAnimalState {
    return {
      id: def.id,
      x: def.initialX,
      y: def.initialY,
      targetX: def.initialX,
      targetY: def.initialY,
      vx: 0,
      vy: 0,
      facing: 'right',
      isEating: false,
      eatTimerSec: 0,
      affection: 25, // Start with 1 heart friendliness
      lastPetSec: -999,
      lastProduceSec: -999,
      produceReady: def.produceItem !== null
    };
  }

  /**
   * Calculates current heart tier (0 to 5 hearts).
   */
  public static getAffectionHearts(affection: number): number {
    return Math.min(5, Math.floor(affection / SANCTUARY_CONFIG.HEART_STEP));
  }

  /**
   * Pets an animal to raise affection.
   */
  public static petAnimal(
    state: SanctuaryAnimalState,
    nowSec: number
  ): { success: boolean; affectionGained: number; totalAffection: number; hearts: number } {
    if (nowSec - state.lastPetSec < SANCTUARY_CONFIG.PET_COOLDOWN_SEC) {
      return {
        success: false,
        affectionGained: 0,
        totalAffection: state.affection,
        hearts: this.getAffectionHearts(state.affection)
      };
    }

    state.lastPetSec = nowSec;
    const gain = SANCTUARY_CONFIG.PET_AFFECTION;
    state.affection = Math.min(SANCTUARY_CONFIG.MAX_AFFECTION, state.affection + gain);

    return {
      success: true,
      affectionGained: gain,
      totalAffection: state.affection,
      hearts: this.getAffectionHearts(state.affection)
    };
  }

  /**
   * Feeds an animal with harvested crops or seeds.
   */
  public static feedAnimal(
    def: SanctuaryAnimalDef,
    state: SanctuaryAnimalState,
    foodItemId: string,
    nowSec: number
  ): { success: boolean; isFavorite: boolean; affectionGained: number; hearts: number } {
    const isFav = def.favoriteFood === foodItemId;
    const isSec = def.secondaryFoods.includes(foodItemId);

    if (!isFav && !isSec) {
      return {
        success: false,
        isFavorite: false,
        affectionGained: 0,
        hearts: this.getAffectionHearts(state.affection)
      };
    }

    const gain = isFav ? SANCTUARY_CONFIG.FEED_FAVORITE_AFFECTION : SANCTUARY_CONFIG.FEED_NORMAL_AFFECTION;
    state.affection = Math.min(SANCTUARY_CONFIG.MAX_AFFECTION, state.affection + gain);
    state.isEating = true;
    state.eatTimerSec = 2.5;

    // Favorite food resets produce cooldown instantly!
    if (isFav && def.produceItem) {
      state.produceReady = true;
    }

    return {
      success: true,
      isFavorite: isFav,
      affectionGained: gain,
      hearts: this.getAffectionHearts(state.affection)
    };
  }

  /**
   * Harvests wool or milk from animal when ready.
   */
  public static harvestAnimalProduce(
    def: SanctuaryAnimalDef,
    state: SanctuaryAnimalState,
    nowSec: number
  ): { itemId: string; amount: number } | null {
    if (!def.produceItem) return null;

    const cooldownPassed = nowSec - state.lastProduceSec >= def.produceIntervalSec;
    if (!state.produceReady && !cooldownPassed) {
      return null;
    }

    state.lastProduceSec = nowSec;
    state.produceReady = false;

    // High affection (>= 4 hearts) grants +1 bonus produce yield!
    const hearts = this.getAffectionHearts(state.affection);
    const amount = hearts >= 4 ? 2 : 1;

    return {
      itemId: def.produceItem,
      amount
    };
  }

  /**
   * Updates animal wandering kinematics inside pasture bounds without heap allocations.
   */
  public static updateAnimalWander(
    state: SanctuaryAnimalState,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    deltaSec: number
  ) {
    if (state.isEating) {
      state.eatTimerSec -= deltaSec;
      if (state.eatTimerSec <= 0) {
        state.isEating = false;
      }
      return;
    }

    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      // Arrived at target point, pick new target occasionally
      if (Math.random() < deltaSec * 0.4) {
        state.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        state.targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      }
      state.vx = 0;
      state.vy = 0;
    } else {
      // Move gently toward target
      const speed = 18; // Slow cozy amble
      state.vx = (dx / dist) * speed;
      state.vy = (dy / dist) * speed;

      state.x += state.vx * deltaSec;
      state.y += state.vy * deltaSec;

      if (Math.abs(state.vx) > 1) {
        state.facing = state.vx > 0 ? 'right' : 'left';
      }
    }

    // Clamp inside bounds
    state.x = Math.max(bounds.minX, Math.min(bounds.maxX, state.x));
    state.y = Math.max(bounds.minY, Math.min(bounds.maxY, state.y));
  }
}
