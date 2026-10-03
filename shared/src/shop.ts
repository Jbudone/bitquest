/**
 * Pip's Oddities Shop & Wandering Traders System
 * Task 7.7 / Issue #25
 *
 * Authoritative merchant registries, stock rotation on circadian day/night phases,
 * dual coin/acorn currency economics, and zero-allocation gameplay validation.
 */

import type { PlayerData } from './schemas';
import { EQUIPMENT_DEFINITIONS, VANITY_DEFINITIONS } from './equipment';
import { FISH_SPECIES } from './fishing';
import { CAMPFIRES } from './weather';

export type CurrencyType = 'coin' | 'acorn';
export type ShopItemCategory = 'consumable' | 'gear' | 'vanity' | 'oddity';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopItemCategory;
  description: string;
  icon: string;
  currency: CurrencyType;
  buyPrice: number;
  sellPrice: number;
  equipmentId?: string;
  vanityId?: string;
  consumableEffect?: {
    healHp?: number;
    restoreMp?: number;
    buffType?: string;
  };
}

export interface MerchantDefinition {
  id: string;
  name: string;
  title: string;
  portrait: string;
  x: number;
  y: number;
  greeting: string;
  baseWares: readonly ShopItem[];
  dayRotatingWares: readonly ShopItem[];
  nightRotatingWares: readonly ShopItem[];
  isWandering?: boolean;
}

// ============================================================
// Shop Items Catalog
// ============================================================
export const SHOP_ITEMS: Record<string, ShopItem> = {
  // Consumables
  consumable_strawberry_tart: {
    id: 'consumable_strawberry_tart',
    name: 'Wild Strawberry Tart',
    category: 'consumable',
    description: 'A warm, crumbly pastry packed with fresh forest berries. Restores 3 Health Hearts.',
    icon: '🥧',
    currency: 'coin',
    buyPrice: 6,
    sellPrice: 3,
    consumableEffect: { healHp: 3 }
  },
  consumable_mana_potion: {
    id: 'consumable_mana_potion',
    name: 'Sparkling Mana Flask',
    category: 'consumable',
    description: 'An effervescent cobalt draught steeped in morning dew. Restores 25 Mana.',
    icon: '🧪',
    currency: 'coin',
    buyPrice: 15,
    sellPrice: 7,
    consumableEffect: { restoreMp: 25 }
  },
  consumable_scone_vitality: {
    id: 'consumable_scone_vitality',
    name: "Grandma's Fresh Scone",
    category: 'consumable',
    description: 'Grandma Bramble’s secret recipe baked fresh this morning. Fully restores Health.',
    icon: '🥮',
    currency: 'coin',
    buyPrice: 20,
    sellPrice: 10,
    consumableEffect: { healHp: 999 }
  },
  consumable_shadow_draught: {
    id: 'consumable_shadow_draught',
    name: 'Nocturnal Swiftness Brew',
    category: 'consumable',
    description: 'A dark smoky elixir brewed under starlight. Grants a quickening boost to footsteps.',
    icon: '☕',
    currency: 'acorn',
    buyPrice: 8,
    sellPrice: 4,
    consumableEffect: { buffType: 'speed_boost' }
  },

  // Equipment & Gear
  sword_iron: {
    id: 'sword_iron',
    name: "Knight's Steel Blade",
    category: 'gear',
    description: 'Forged iron sword with a honed edge. +2 Attack Power, 15% Critical Strike chance.',
    icon: '⚔️',
    currency: 'coin',
    buyPrice: 45,
    sellPrice: 22,
    equipmentId: 'sword_iron'
  },
  shield_wood: {
    id: 'shield_wood',
    name: 'Oak Round Shield',
    category: 'gear',
    description: 'Light sturdy oak buckler. Absorbs 15% of incoming enemy physical damage.',
    icon: '🛡️',
    currency: 'coin',
    buyPrice: 25,
    sellPrice: 12,
    equipmentId: 'shield_wood'
  },
  bow_recurve: {
    id: 'bow_recurve',
    name: 'Nimble Recurve Bow',
    category: 'gear',
    description: 'Flexible yew longbow for piercing enemy defenses at range.',
    icon: '🏹',
    currency: 'coin',
    buyPrice: 50,
    sellPrice: 25,
    equipmentId: 'bow_recurve'
  },
  armor_leather: {
    id: 'armor_leather',
    name: "Ranger's Leather Tunic",
    category: 'gear',
    description: 'Supple boiled leather armor. Enhances movement speed (+10%) and +1 Max Health.',
    icon: '🥋',
    currency: 'coin',
    buyPrice: 40,
    sellPrice: 20,
    equipmentId: 'armor_leather'
  },
  sword_broad_iron: {
    id: 'sword_broad_iron',
    name: 'Iron Cleaver Greatsword',
    category: 'gear',
    description: 'Heavy two-handed broadsword. Tremendous cleave arc (+3 AP) with staggering knockback.',
    icon: '🗡️',
    currency: 'coin',
    buyPrice: 70,
    sellPrice: 35,
    equipmentId: 'sword_broad_iron'
  },
  shield_iron: {
    id: 'shield_iron',
    name: 'Iron Aegis',
    category: 'gear',
    description: 'Heavy reinforced steel shield. Absorbs 30% damage and fortifies health by +1 Heart.',
    icon: '🛡️',
    currency: 'coin',
    buyPrice: 80,
    sellPrice: 40,
    equipmentId: 'shield_iron'
  },
  tome_arcane: {
    id: 'tome_arcane',
    name: 'Arcane Grimoire',
    category: 'gear',
    description: 'Leather-bound book of forgotten sigils. +25 Max Mana and 15% cheaper spell casts.',
    icon: '📖',
    currency: 'coin',
    buyPrice: 85,
    sellPrice: 40,
    equipmentId: 'tome_arcane'
  },
  quiver_ranger: {
    id: 'quiver_ranger',
    name: 'Quiver of the Wind',
    category: 'gear',
    description: 'Fletched arrows enchanted with breeze charms. Quickens bow reload speed and damage.',
    icon: '🎒',
    currency: 'coin',
    buyPrice: 70,
    sellPrice: 35,
    equipmentId: 'quiver_ranger'
  },
  relic_moonstone: {
    id: 'relic_moonstone',
    name: 'Luminescent Moonstone',
    category: 'gear',
    description: 'A luminous celestial gem glowing in moonlight. Expands mana capacity by +25 MP.',
    icon: '💎',
    currency: 'coin',
    buyPrice: 75,
    sellPrice: 35,
    equipmentId: 'relic_moonstone'
  },
  relic_phoenix: {
    id: 'relic_phoenix',
    name: 'Phoenix Talisman',
    category: 'gear',
    description: 'A warm cinder preserved in a golden cage. Fortifies endurance and warding aura.',
    icon: '🔥',
    currency: 'coin',
    buyPrice: 110,
    sellPrice: 50,
    equipmentId: 'relic_phoenix'
  },
  relic_sun_stone: {
    id: 'relic_sun_stone',
    name: 'Sun Stone of the Catacombs',
    category: 'gear',
    description: 'Radiant ancient lodestone. Grants +2 Max Health, +1 Attack Power, and +10% Damage Reduction.',
    icon: '☀️',
    currency: 'coin',
    buyPrice: 130,
    sellPrice: 65,
    equipmentId: 'relic_sun_stone'
  },

  // Vanity & Cosmetic
  vanity_feather_cap: {
    id: 'vanity_feather_cap',
    name: "Merchant's Feathered Cap",
    category: 'vanity',
    description: 'A flamboyant velvet cap adorned with an iridescent pheasant feather.',
    icon: '👒',
    currency: 'coin',
    buyPrice: 35,
    sellPrice: 15,
    vanityId: 'vanity_feather_cap'
  },
  vanity_cape_hero: {
    id: 'vanity_cape_hero',
    name: "Hero's Crimson Cape",
    category: 'vanity',
    description: 'A majestic crimson cloak that billows heroically in the autumn breeze.',
    icon: '🧣',
    currency: 'coin',
    buyPrice: 60,
    sellPrice: 30,
    vanityId: 'vanity_cape_hero'
  },
  vanity_hat_wizard: {
    id: 'vanity_hat_wizard',
    name: 'Starlight Wizard Hat',
    category: 'vanity',
    description: 'Pointed midnight-blue hat stitched with glowing celestial gold constellations.',
    icon: '🧙',
    currency: 'coin',
    buyPrice: 55,
    sellPrice: 25,
    vanityId: 'vanity_hat_wizard'
  },
  vanity_hood_ranger: {
    id: 'vanity_hood_ranger',
    name: 'Woodland Ranger Hood',
    category: 'vanity',
    description: 'A stealthy dark green cowl blending seamlessly into forest shadows.',
    icon: '🧝',
    currency: 'acorn',
    buyPrice: 20,
    sellPrice: 10,
    vanityId: 'vanity_hood_ranger'
  },
  vanity_midnight_cowl: {
    id: 'vanity_midnight_cowl',
    name: 'Shadow Nomad Cowl',
    category: 'vanity',
    description: 'Woven from raven plumage. Conceals the wearer in mysterious dusk silhouettes.',
    icon: '🥷',
    currency: 'acorn',
    buyPrice: 18,
    sellPrice: 9,
    vanityId: 'vanity_midnight_cowl'
  },

  // Oddities & Curios
  oddity_sunken_key: {
    id: 'oddity_sunken_key',
    name: 'Tarnished Brass Key',
    category: 'oddity',
    description: 'A verdigris-crusted brass skeleton key fished from the depths of Azure River.',
    icon: '🗝️',
    currency: 'acorn',
    buyPrice: 10,
    sellPrice: 5
  },
  oddity_ancient_compass: {
    id: 'oddity_ancient_compass',
    name: 'Lodestone Wayfinder',
    category: 'oddity',
    description: 'A mystical brass compass whose needle hums towards forgotten subterranean ruins.',
    icon: '🧭',
    currency: 'acorn',
    buyPrice: 20,
    sellPrice: 10
  },
  oddity_ocarina: {
    id: 'oddity_ocarina',
    name: 'Carved Wood Ocarina',
    category: 'oddity',
    description: 'A hand-carved four-hole musical instrument capable of piping warm chiptune melodies.',
    icon: '🎶',
    currency: 'acorn',
    buyPrice: 15,
    sellPrice: 7
  },
  fish_angler_lure: {
    id: 'fish_angler_lure',
    name: 'Bioluminescent Angler Lure',
    category: 'oddity',
    description: 'Tied with shimmering firefly thread. Allures rare aquatic species to the bobber.',
    icon: '🪝',
    currency: 'acorn',
    buyPrice: 10,
    sellPrice: 5
  }
};

// ============================================================
// Merchant Registry
// ============================================================
export const MERCHANTS: Record<string, MerchantDefinition> = {
  merchant_pip: {
    id: 'merchant_pip',
    name: 'Pip the Badger',
    title: "Pip's Oddities & Curios",
    portrait: 'npc_pip',
    x: 1040,
    y: 760,
    greeting: "Welcome to Pip's Oddities! Fresh wares from all corners of Oakhaven. Looking to buy, or got fine loot to sell?",
    baseWares: [
      SHOP_ITEMS.consumable_strawberry_tart!,
      SHOP_ITEMS.consumable_mana_potion!,
      SHOP_ITEMS.consumable_scone_vitality!,
      SHOP_ITEMS.sword_iron!,
      SHOP_ITEMS.shield_wood!,
      SHOP_ITEMS.bow_recurve!,
      SHOP_ITEMS.armor_leather!,
      SHOP_ITEMS.vanity_feather_cap!,
      SHOP_ITEMS.vanity_cape_hero!,
      SHOP_ITEMS.oddity_sunken_key!,
      SHOP_ITEMS.oddity_ancient_compass!
    ],
    dayRotatingWares: [
      SHOP_ITEMS.vanity_hat_wizard!,
      SHOP_ITEMS.relic_moonstone!,
      SHOP_ITEMS.tome_arcane!
    ],
    nightRotatingWares: [
      SHOP_ITEMS.relic_phoenix!,
      SHOP_ITEMS.sword_broad_iron!,
      SHOP_ITEMS.shield_iron!
    ]
  },
  merchant_corvus: {
    id: 'merchant_corvus',
    name: 'Corvus the Nomad',
    title: 'Corvus the Wandering Nomad',
    portrait: 'npc_corvus',
    x: 352,
    y: 448, // starts near village outskirts campfire
    greeting: "Greetings, traveler of the dusk. The highways grow quiet, but my knapsack holds treasures from the shadows.",
    isWandering: true,
    baseWares: [
      SHOP_ITEMS.consumable_shadow_draught!,
      SHOP_ITEMS.vanity_midnight_cowl!,
      SHOP_ITEMS.oddity_ocarina!,
      SHOP_ITEMS.fish_angler_lure!,
      SHOP_ITEMS.relic_sun_stone!
    ],
    dayRotatingWares: [
      SHOP_ITEMS.vanity_hood_ranger!,
      SHOP_ITEMS.quiver_ranger!
    ],
    nightRotatingWares: [
      SHOP_ITEMS.vanity_midnight_cowl!,
      SHOP_ITEMS.relic_phoenix!
    ]
  }
};

// ============================================================
// Shop Engine & Economy Logic
// ============================================================
export class ShopEngine {
  /**
   * Returns authoritative stock for a merchant based on the in-game circadian time.
   * Day: 6:00 (360s) to 18:00 (1080s)
   * Night / Twilight: 18:00 to 6:00
   */
  public static getActiveMerchantWares(merchantId: string, timeOfDaySec: number): ShopItem[] {
    const merchant = MERCHANTS[merchantId];
    if (!merchant) return [];

    const normSec = ((timeOfDaySec % 1440) + 1440) % 1440;
    const isDay = normSec >= 360 && normSec < 1080;

    const rotating = isDay ? merchant.dayRotatingWares : merchant.nightRotatingWares;
    return [...merchant.baseWares, ...rotating];
  }

  /**
   * Deterministically calculates wandering trader Corvus's current campfire campsite.
   */
  public static getWanderingTraderPosition(timeOfDaySec: number): { campfireId: string; x: number; y: number } {
    const normSec = ((timeOfDaySec % 1440) + 1440) % 1440;
    const hour = normSec / 60;

    // Schedule:
    // 21:00 - 05:00 (Night): Village Outskirts Hearth (320, 448)
    // 05:00 - 09:00 (Dawn/Morning): Lakeside Pier (1088, 1344)
    // 09:00 - 17:00 (Day): Meadow Crossroads (1472, 768)
    // 17:00 - 21:00 (Dusk): Ancient Ruins (960, 224)
    if (hour >= 21.0 || hour < 5.0) {
      return { campfireId: 'campfire_village', x: 352, y: 448 };
    } else if (hour >= 5.0 && hour < 9.0) {
      return { campfireId: 'campfire_lake', x: 1056, y: 1344 };
    } else if (hour >= 9.0 && hour < 17.0) {
      return { campfireId: 'campfire_meadow', x: 1440, y: 768 };
    } else {
      return { campfireId: 'campfire_ruins', x: 928, y: 224 };
    }
  }

  /**
   * Checks if player has sufficient funds to purchase quantity of item.
   */
  public static canAfford(player: PlayerData, item: ShopItem, quantity: number = 1): boolean {
    const totalCost = item.buyPrice * quantity;
    if (item.currency === 'acorn') {
      return (player.acorns || 0) >= totalCost;
    }
    return (player.coins || 0) >= totalCost;
  }

  /**
   * Authoritative validation of purchase request.
   */
  public static validateBuy(
    player: PlayerData,
    merchantId: string,
    itemId: string,
    quantity: number,
    timeOfDaySec: number
  ): { valid: boolean; reason?: string; item?: ShopItem; totalCost?: number } {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { valid: false, reason: 'Invalid purchase quantity' };
    }

    const wares = this.getActiveMerchantWares(merchantId, timeOfDaySec);
    const item = wares.find(w => w.id === itemId);
    if (!item) {
      return { valid: false, reason: 'Item is not in current stock' };
    }

    const totalCost = item.buyPrice * quantity;
    if (!this.canAfford(player, item, quantity)) {
      const currName = item.currency === 'acorn' ? 'acorns' : 'coins';
      return { valid: false, reason: `Insufficient ${currName}! Needs ${totalCost}`, item, totalCost };
    }

    return { valid: true, item, totalCost };
  }

  /**
   * Computes sell value and currency for an inventory item, fish, or equipment.
   */
  public static getItemSellValue(itemIdOrName: string): { currency: CurrencyType; amount: number; name: string } {
    // 1. Direct Shop Item Match
    if (SHOP_ITEMS[itemIdOrName]) {
      const item = SHOP_ITEMS[itemIdOrName]!;
      return { currency: item.currency, amount: item.sellPrice, name: item.name };
    }

    // 2. Equipment registry match
    if (EQUIPMENT_DEFINITIONS[itemIdOrName]) {
      const eq = EQUIPMENT_DEFINITIONS[itemIdOrName]!;
      return { currency: 'coin', amount: Math.max(1, Math.floor(eq.value * 0.5)), name: eq.name };
    }

    // 3. Vanity registry match
    if (VANITY_DEFINITIONS[itemIdOrName]) {
      const van = VANITY_DEFINITIONS[itemIdOrName]!;
      return { currency: 'coin', amount: 20, name: van.name };
    }

    // 4. Fish species match
    if (FISH_SPECIES[itemIdOrName]) {
      const fish = FISH_SPECIES[itemIdOrName]!;
      return { currency: 'coin', amount: fish.baseValue, name: fish.name };
    }

    // 5. Common world materials and items by name
    const lower = itemIdOrName.toLowerCase();
    if (lower.includes('strawberry')) {
      return { currency: 'coin', amount: 2, name: 'Wild Strawberry' };
    }
    if (lower.includes('scone')) {
      return { currency: 'coin', amount: 10, name: "Grandma's Scone" };
    }
    if (lower.includes('acorn')) {
      return { currency: 'coin', amount: 1, name: 'Forest Acorn' };
    }
    if (lower.includes('stick') || lower.includes('practice')) {
      return { currency: 'coin', amount: 2, name: 'Wooden Practice Stick' };
    }
    if (lower.includes('key')) {
      return { currency: 'acorn', amount: 5, name: 'Brass Key' };
    }
    if (lower.includes('chest') || lower.includes('treasure')) {
      return { currency: 'coin', amount: 50, name: 'Sunken Lockbox' };
    }
    if (lower.includes('boot')) {
      return { currency: 'coin', amount: 2, name: 'Waterlogged Boot' };
    }

    // Default salvage value
    return { currency: 'coin', amount: 3, name: itemIdOrName };
  }

  /**
   * Authoritative validation of sell request.
   */
  public static validateSell(
    player: PlayerData,
    inventoryIndex: number,
    quantity: number = 1
  ): { valid: boolean; reason?: string; currency?: CurrencyType; totalGain?: number; itemName?: string } {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { valid: false, reason: 'Invalid sell quantity' };
    }

    const inventory = (player as any).inventory as string[] | undefined;
    if (!inventory || inventoryIndex < 0 || inventoryIndex >= inventory.length) {
      return { valid: false, reason: 'Item not found in player inventory' };
    }

    const itemRaw = inventory[inventoryIndex]!;
    const sellInfo = this.getItemSellValue(itemRaw);
    const totalGain = sellInfo.amount * quantity;

    return {
      valid: true,
      currency: sellInfo.currency,
      totalGain,
      itemName: sellInfo.name
    };
  }
}
