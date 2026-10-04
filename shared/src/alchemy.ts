// shared/src/alchemy.ts
// BitQuest Herbal Alchemy & Potion Brewing Laboratory
// Milestone 8: Cauldron brewing, herbal catalysts, potion consumables, and zero-allocation active buff manager

export interface AlchemyIngredient {
  itemId: string;
  count: number;
}

export interface PotionBuffEffect {
  instantHp?: number;
  instantMp?: number;
  speedMultiplier?: number;
  defenseBonus?: number;
  attackPowerMultiplier?: number;
  manaRegenMultiplier?: number;
  invulnerableDurationSec?: number;
  durationSec: number;
}

export interface AlchemyRecipe {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  description: string;
  ingredients: readonly AlchemyIngredient[];
  resultItemId: string;
  resultCount: number;
  color: string;
  buff: PotionBuffEffect;
}

export interface ActivePotionBuff {
  recipeId: string;
  effect: PotionBuffEffect;
  expiresAtSec: number;
}

export const ALCHEMY_RECIPES: readonly AlchemyRecipe[] = [
  // 1. Swiftfoot Draft (Speed)
  {
    id: 'brew_swiftfoot',
    name: 'Swiftfoot Draught',
    tier: 1,
    description: 'Brews radiant sunlight and mountain dew into an exhilarating tonic. Grants +35% move speed for 45s.',
    ingredients: [
      { itemId: 'flora_sunbloom_petals', count: 2 },
      { itemId: 'flora_rain_lily_blossom', count: 1 }
    ],
    resultItemId: 'potion_swiftfoot',
    resultCount: 1,
    color: '#fbbf24',
    buff: {
      speedMultiplier: 1.35,
      durationSec: 45
    }
  },

  // 2. Ironbark Tonic (Defense)
  {
    id: 'brew_ironbark',
    name: 'Ironbark Tonic',
    tier: 1,
    description: 'Boils rich oak acorns and silken wool into tough earthen armor. Grants +2 Defense Bonus for 60s.',
    ingredients: [
      { itemId: 'acorn', count: 2 },
      { itemId: 'material_soft_wool', count: 1 }
    ],
    resultItemId: 'potion_ironbark',
    resultCount: 1,
    color: '#78350f',
    buff: {
      defenseBonus: 2,
      durationSec: 60
    }
  },

  // 3. Astral Mana Philter (Mana & Magic)
  {
    id: 'brew_astral_mana',
    name: 'Astral Mana Philter',
    tier: 2,
    description: 'Distills nocturnal moon essence and crisp rain lilies. Instantly restores 35 MP and doubles mana regen for 30s.',
    ingredients: [
      { itemId: 'flora_moon_essence', count: 1 },
      { itemId: 'flora_rain_lily_blossom', count: 1 }
    ],
    resultItemId: 'potion_astral_mana',
    resultCount: 1,
    color: '#38bdf8',
    buff: {
      instantMp: 35,
      manaRegenMultiplier: 2.0,
      durationSec: 30
    }
  },

  // 4. Sunfire Elixir (Attack Power)
  {
    id: 'brew_sunfire',
    name: 'Sunfire Battle Draught',
    tier: 2,
    description: 'Ferments hearty golden turnips and fiery sunbloom petals. Grants +40% melee attack power for 30s.',
    ingredients: [
      { itemId: 'flora_sunbloom_petals', count: 2 },
      { itemId: 'seed_turnip', count: 2 }
    ],
    resultItemId: 'potion_sunfire_draught',
    resultCount: 1,
    color: '#ef4444',
    buff: {
      attackPowerMultiplier: 1.4,
      durationSec: 30
    }
  },

  // 5. Elixir of Celestial Vitality (Master Tier)
  {
    id: 'brew_vitality',
    name: 'Elixir of Celestial Vitality',
    tier: 3,
    description: 'Sacred master brew blending Highland milk, wild strawberries, and moon essence. Full HP/MP restore + 5s divine shield.',
    ingredients: [
      { itemId: 'material_fresh_milk', count: 1 },
      { itemId: 'strawberry', count: 2 },
      { itemId: 'flora_moon_essence', count: 1 }
    ],
    resultItemId: 'potion_elixir_of_vitality',
    resultCount: 1,
    color: '#e879f9',
    buff: {
      instantHp: 20,
      instantMp: 50,
      invulnerableDurationSec: 5,
      durationSec: 5
    }
  }
];

export interface PotionBuffTotals {
  speedMultiplier: number;
  defenseBonus: number;
  attackPowerMultiplier: number;
  manaRegenMultiplier: number;
  isInvulnerable: boolean;
}

export class ActivePotionManager {
  private activeBuffs: ActivePotionBuff[] = [];

  private totalsOut: PotionBuffTotals = {
    speedMultiplier: 1.0,
    defenseBonus: 0,
    attackPowerMultiplier: 1.0,
    manaRegenMultiplier: 1.0,
    isInvulnerable: false
  };

  /**
   * Consumes a potion and activates its alchemical buff.
   */
  public consumePotion(recipe: AlchemyRecipe, currentSec: number): void {
    // Remove previous instance of same potion type if active
    this.activeBuffs = this.activeBuffs.filter(b => b.recipeId !== recipe.id);

    this.activeBuffs.push({
      recipeId: recipe.id,
      effect: recipe.buff,
      expiresAtSec: currentSec + recipe.buff.durationSec
    });
  }

  /**
   * Updates active buffs, purges expired effects, and aggregates totals without heap allocations.
   */
  public update(currentSec: number): PotionBuffTotals {
    // Purge expired in-place
    let writeIdx = 0;
    for (let i = 0; i < this.activeBuffs.length; i++) {
      if (this.activeBuffs[i].expiresAtSec > currentSec) {
        if (writeIdx !== i) {
          this.activeBuffs[writeIdx] = this.activeBuffs[i];
        }
        writeIdx++;
      }
    }
    this.activeBuffs.length = writeIdx;

    // Reset totals
    this.totalsOut.speedMultiplier = 1.0;
    this.totalsOut.defenseBonus = 0;
    this.totalsOut.attackPowerMultiplier = 1.0;
    this.totalsOut.manaRegenMultiplier = 1.0;
    this.totalsOut.isInvulnerable = false;

    // Aggregate
    for (let i = 0; i < this.activeBuffs.length; i++) {
      const b = this.activeBuffs[i].effect;
      if (b.speedMultiplier && b.speedMultiplier > this.totalsOut.speedMultiplier) {
        this.totalsOut.speedMultiplier = b.speedMultiplier;
      }
      if (b.defenseBonus) {
        this.totalsOut.defenseBonus += b.defenseBonus;
      }
      if (b.attackPowerMultiplier && b.attackPowerMultiplier > this.totalsOut.attackPowerMultiplier) {
        this.totalsOut.attackPowerMultiplier = b.attackPowerMultiplier;
      }
      if (b.manaRegenMultiplier && b.manaRegenMultiplier > this.totalsOut.manaRegenMultiplier) {
        this.totalsOut.manaRegenMultiplier = b.manaRegenMultiplier;
      }
      if (b.invulnerableDurationSec && b.invulnerableDurationSec > 0) {
        this.totalsOut.isInvulnerable = true;
      }
    }

    return this.totalsOut;
  }

  public getActiveBuffs(): readonly ActivePotionBuff[] {
    return this.activeBuffs;
  }

  public clear(): void {
    this.activeBuffs.length = 0;
  }
}

export class AlchemyEngine {
  /**
   * Tests whether an inventory has sufficient ingredients for an alchemy recipe.
   */
  public static canBrewRecipe(recipe: AlchemyRecipe, inventory: readonly string[]): boolean {
    const itemCounts = new Map<string, number>();
    for (const item of inventory) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }

    for (const req of recipe.ingredients) {
      const available = itemCounts.get(req.itemId) || 0;
      if (available < req.count) {
        return false;
      }
    }
    return true;
  }

  /**
   * Consumes required ingredients and adds result potions to inventory.
   */
  public static brewRecipe(recipe: AlchemyRecipe, inventory: string[]): boolean {
    if (!this.canBrewRecipe(recipe, inventory)) {
      return false;
    }

    // Consume ingredients
    for (const req of recipe.ingredients) {
      for (let i = 0; i < req.count; i++) {
        const idx = inventory.indexOf(req.itemId);
        if (idx !== -1) {
          inventory.splice(idx, 1);
        }
      }
    }

    // Grant result
    for (let i = 0; i < recipe.resultCount; i++) {
      inventory.push(recipe.resultItemId);
    }

    return true;
  }
}
