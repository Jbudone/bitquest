// shared/src/cooking.ts
// BitQuest Cozy Campfire & Bakery Cooking Engine
// Issue #38 / Milestone 2: Culinary crafting, campfire roasting, bakery oven feasts, and stat-boosting food buffs

export type BuffType = 'speed' | 'defense' | 'max_hp' | 'mana_regen' | 'fishing_luck' | 'attack_power';

export type CookingStation = 'campfire' | 'bakery_oven' | 'any';

export interface RecipeIngredient {
  itemId: string;
  name: string;
  count: number;
}

export interface CookingBuff {
  type: BuffType;
  durationSeconds: number;
  value: number; // Multiplier (e.g. 1.25 for +25%) or additive (e.g. 4 for +4 max HP)
  label: string;
  description: string;
  icon: string;
}

export interface CookingRecipe {
  id: string;
  name: string;
  station: CookingStation;
  ingredients: RecipeIngredient[];
  resultItemId: string;
  resultName: string;
  resultCount: number;
  healAmount: number;
  cookingTimeMs: number;
  description: string;
  buff?: CookingBuff;
  icon: string;
}

export interface ActiveBuff {
  type: BuffType;
  value: number;
  expiresAt: number; // Timestamp in ms
  label: string;
  description: string;
  icon: string;
  sourceRecipeId: string;
}

export interface BuffTotals {
  speedMultiplier: number;
  defenseReduction: number;
  bonusMaxHp: number;
  manaRegenMultiplier: number;
  fishingSweetSpotBonus: number;
  attackPowerMultiplier: number;
}

export const COOKING_RECIPES: Record<string, CookingRecipe> = {
  recipe_roasted_minnow: {
    id: 'recipe_roasted_minnow',
    name: 'Crispy Skewered Minnow',
    station: 'campfire',
    ingredients: [
      { itemId: 'fish_copper_minnow', name: 'Copper Minnow', count: 1 }
    ],
    resultItemId: 'dish_roasted_minnow',
    resultName: 'Crispy Skewered Minnow',
    resultCount: 1,
    healAmount: 3,
    cookingTimeMs: 1200,
    description: 'Fresh river minnow seasoned with wild herbs and toasted over embers. Crisp, salty, and energizing.',
    buff: {
      type: 'speed',
      durationSeconds: 60,
      value: 1.15,
      label: 'Agile Stride',
      description: '+15% Move Speed for 60s',
      icon: '⚡'
    },
    icon: '🐟'
  },
  recipe_turnip_stew: {
    id: 'recipe_turnip_stew',
    name: 'Meadow Turnip Stew',
    station: 'campfire',
    ingredients: [
      { itemId: 'crop_turnip', name: 'Meadow Turnip', count: 2 },
      { itemId: 'acorn', name: 'Golden Acorn', count: 1 }
    ],
    resultItemId: 'dish_turnip_stew',
    resultName: 'Meadow Turnip Stew',
    resultCount: 1,
    healAmount: 5,
    cookingTimeMs: 2000,
    description: 'Hearty root vegetable broth simmered slowly in a cast iron pot. Fortifies the body against harm.',
    buff: {
      type: 'defense',
      durationSeconds: 90,
      value: 0.20,
      label: 'Barkskin Bulwark',
      description: '+20% Damage Reduction for 90s',
      icon: '🛡️'
    },
    icon: '🍲'
  },
  recipe_hearty_chowder: {
    id: 'recipe_hearty_chowder',
    name: 'Cob & Trout Chowder',
    station: 'campfire',
    ingredients: [
      { itemId: 'crop_corn', name: 'Sweet Cob Corn', count: 2 },
      { itemId: 'fish_brook_trout', name: 'Azure Brook Trout', count: 1 }
    ],
    resultItemId: 'dish_hearty_chowder',
    resultName: 'Cob & Trout Chowder',
    resultCount: 1,
    healAmount: 7,
    cookingTimeMs: 2500,
    description: 'Thick, creamy chowder made with freshly shucked sweet corn and azure brook trout. Heightens angler intuition.',
    buff: {
      type: 'fishing_luck',
      durationSeconds: 120,
      value: 0.25,
      label: "Angler's Eye",
      description: '+25% Fishing Sweet Spot for 2m',
      icon: '🎣'
    },
    icon: '🥣'
  },
  recipe_berry_tart: {
    id: 'recipe_berry_tart',
    name: 'Golden Berry Galette',
    station: 'bakery_oven',
    ingredients: [
      { itemId: 'strawberry', name: 'Wild Strawberry', count: 3 },
      { itemId: 'acorn', name: 'Golden Acorn', count: 2 }
    ],
    resultItemId: 'dish_berry_tart',
    resultName: 'Golden Berry Galette',
    resultCount: 1,
    healAmount: 6,
    cookingTimeMs: 3000,
    description: 'Buttery flaky pastry loaded with caramelizing meadow berries. Provides an exhilarating burst of swiftness.',
    buff: {
      type: 'speed',
      durationSeconds: 120,
      value: 1.25,
      label: 'Sugar Rush',
      description: '+25% Move Speed for 2m',
      icon: '🍓'
    },
    icon: '🥧'
  },
  recipe_glowshroom_soup: {
    id: 'recipe_glowshroom_soup',
    name: 'Astral Sporecap Potage',
    station: 'any',
    ingredients: [
      { itemId: 'crop_glowshroom', name: 'Bioluminescent Sporecap', count: 2 },
      { itemId: 'crop_turnip', name: 'Meadow Turnip', count: 1 }
    ],
    resultItemId: 'dish_glowshroom_soup',
    resultName: 'Astral Sporecap Potage',
    resultCount: 1,
    healAmount: 6,
    cookingTimeMs: 2500,
    description: 'Gleams with ethereal violet luminescence. Channels mystical energies to rejuvenate mana reserves.',
    buff: {
      type: 'mana_regen',
      durationSeconds: 150,
      value: 2.0,
      label: 'Astral Resonance',
      description: '+100% Mana Regeneration for 2.5m',
      icon: '✨'
    },
    icon: '🥣'
  },
  recipe_bramble_pie: {
    id: 'recipe_bramble_pie',
    name: "Grandma Bramble's Harvest Pie",
    station: 'bakery_oven',
    ingredients: [
      { itemId: 'strawberry', name: 'Wild Strawberry', count: 2 },
      { itemId: 'crop_corn', name: 'Sweet Cob Corn', count: 2 },
      { itemId: 'crop_golden_turnip', name: 'Sun-kissed Golden Turnip', count: 1 }
    ],
    resultItemId: 'dish_bramble_pie',
    resultName: "Grandma Bramble's Harvest Pie",
    resultCount: 1,
    healAmount: 12,
    cookingTimeMs: 3500,
    description: "Grandma Bramble's secret recipe, baked to golden brown perfection. Fills you with supreme vigor and longevity.",
    buff: {
      type: 'max_hp',
      durationSeconds: 180,
      value: 4,
      label: 'Vitality Blessing',
      description: '+4 Max Health for 3m',
      icon: '❤️'
    },
    icon: '🥧'
  },
  recipe_golden_feast: {
    id: 'recipe_golden_feast',
    name: "Sunfire Emperor's Banquet",
    station: 'bakery_oven',
    ingredients: [
      { itemId: 'crop_corn_golden', name: 'Sunfire Amber Corn', count: 1 },
      { itemId: 'crop_glowshroom_radiant', name: 'Radiant Starlight Shroom', count: 1 },
      { itemId: 'crop_golden_turnip', name: 'Sun-kissed Golden Turnip', count: 1 }
    ],
    resultItemId: 'dish_golden_feast',
    resultName: "Sunfire Emperor's Banquet",
    resultCount: 1,
    healAmount: 20,
    cookingTimeMs: 4000,
    description: 'A legendary banquet prepared exclusively with mythical golden produce. Imbues attacks with blazing sunfire strength.',
    buff: {
      type: 'attack_power',
      durationSeconds: 240,
      value: 1.35,
      label: 'Sunfire Might',
      description: '+35% Attack Power for 4m',
      icon: '⚔️'
    },
    icon: '🍖'
  }
};

export class CookingEngine {
  /**
   * Helper to count item instances in an inventory array.
   */
  public static countItem(inventory: string[], itemId: string): number {
    let count = 0;
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] === itemId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Checks if the player has the required ingredients and station for a given recipe.
   */
  public static canCook(recipeId: string, inventory: string[], currentStation: CookingStation): boolean {
    const recipe = COOKING_RECIPES[recipeId];
    if (!recipe) return false;

    // Check station compatibility
    if (recipe.station !== 'any' && currentStation !== 'any' && recipe.station !== currentStation) {
      return false;
    }

    // Check ingredients
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      if (this.countItem(inventory, ing.itemId) < ing.count) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns list of missing ingredients with needed and have counts.
   */
  public static getMissingIngredients(recipeId: string, inventory: string[]): { itemId: string; name: string; needed: number; have: number }[] {
    const recipe = COOKING_RECIPES[recipeId];
    if (!recipe) return [];

    const missing: { itemId: string; name: string; needed: number; have: number }[] = [];
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      const have = this.countItem(inventory, ing.itemId);
      if (have < ing.count) {
        missing.push({
          itemId: ing.itemId,
          name: ing.name,
          needed: ing.count,
          have
        });
      }
    }
    return missing;
  }

  /**
   * Consumes recipe ingredients from inventory and returns result dish & buff.
   */
  public static cookRecipe(
    recipeId: string,
    inventory: string[],
    currentStation: CookingStation
  ): { success: boolean; error?: string; resultItemId?: string; resultCount?: number; buff?: CookingBuff; remainingInventory: string[] } {
    const recipe = COOKING_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, error: 'Unknown recipe', remainingInventory: inventory };
    }

    if (recipe.station !== 'any' && currentStation !== 'any' && recipe.station !== currentStation) {
      return { success: false, error: `Must cook at ${recipe.station}`, remainingInventory: inventory };
    }

    // Check all ingredients exist
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      if (this.countItem(inventory, ing.itemId) < ing.count) {
        return { success: false, error: `Missing ingredient: ${ing.name}`, remainingInventory: inventory };
      }
    }

    // Clone inventory to remove used items
    const remaining = [...inventory];
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      let removed = 0;
      for (let j = remaining.length - 1; j >= 0; j--) {
        if (remaining[j] === ing.itemId) {
          remaining.splice(j, 1);
          removed++;
          if (removed >= ing.count) break;
        }
      }
    }

    // Add result items
    for (let i = 0; i < recipe.resultCount; i++) {
      remaining.push(recipe.resultItemId);
    }

    return {
      success: true,
      resultItemId: recipe.resultItemId,
      resultCount: recipe.resultCount,
      buff: recipe.buff,
      remainingInventory: remaining
    };
  }

  /**
   * Applies or refreshes a cooking buff into the active buffs list.
   * If a buff of the same type already exists, replaces it if newer or higher duration.
   */
  public static applyBuff(activeBuffs: ActiveBuff[], buff: CookingBuff, sourceRecipeId: string, currentTimeMs: number): ActiveBuff[] {
    const expiresAt = currentTimeMs + buff.durationSeconds * 1000;
    const existingIndex = activeBuffs.findIndex(b => b.type === buff.type);

    const newBuff: ActiveBuff = {
      type: buff.type,
      value: buff.value,
      expiresAt,
      label: buff.label,
      description: buff.description,
      icon: buff.icon,
      sourceRecipeId
    };

    if (existingIndex >= 0) {
      // Refresh duration and value
      activeBuffs[existingIndex] = newBuff;
    } else {
      activeBuffs.push(newBuff);
    }

    return activeBuffs;
  }

  /**
   * Prunes expired buffs in-place and calculates the aggregate stat multipliers.
   * Zero allocation in the aggregate calculations.
   */
  public static updateAndCalculateBuffs(
    activeBuffs: ActiveBuff[],
    currentTimeMs: number,
    outTotals?: BuffTotals
  ): { activeBuffs: ActiveBuff[]; totals: BuffTotals } {
    // Filter expired buffs
    let writeIdx = 0;
    for (let i = 0; i < activeBuffs.length; i++) {
      if (activeBuffs[i].expiresAt > currentTimeMs) {
        if (writeIdx !== i) {
          activeBuffs[writeIdx] = activeBuffs[i];
        }
        writeIdx++;
      }
    }
    activeBuffs.length = writeIdx;

    const totals: BuffTotals = outTotals || {
      speedMultiplier: 1.0,
      defenseReduction: 0.0,
      bonusMaxHp: 0,
      manaRegenMultiplier: 1.0,
      fishingSweetSpotBonus: 0.0,
      attackPowerMultiplier: 1.0
    };

    // Reset default values
    totals.speedMultiplier = 1.0;
    totals.defenseReduction = 0.0;
    totals.bonusMaxHp = 0;
    totals.manaRegenMultiplier = 1.0;
    totals.fishingSweetSpotBonus = 0.0;
    totals.attackPowerMultiplier = 1.0;

    for (let i = 0; i < activeBuffs.length; i++) {
      const b = activeBuffs[i];
      switch (b.type) {
        case 'speed':
          // Multipliers stack or take highest
          totals.speedMultiplier = Math.max(totals.speedMultiplier, b.value);
          break;
        case 'defense':
          totals.defenseReduction = Math.min(0.75, totals.defenseReduction + b.value);
          break;
        case 'max_hp':
          totals.bonusMaxHp += Math.round(b.value);
          break;
        case 'mana_regen':
          totals.manaRegenMultiplier = Math.max(totals.manaRegenMultiplier, b.value);
          break;
        case 'fishing_luck':
          totals.fishingSweetSpotBonus += b.value;
          break;
        case 'attack_power':
          totals.attackPowerMultiplier = Math.max(totals.attackPowerMultiplier, b.value);
          break;
      }
    }

    return { activeBuffs, totals };
  }
}
