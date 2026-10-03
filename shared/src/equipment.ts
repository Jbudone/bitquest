// shared/src/equipment.ts
// BitQuest Equipment, Relics & Vanity Gear System
// Issue #20: Task 7.2

import type { Direction } from './schemas';

export type EquipmentSlot = 'weapon' | 'offhand' | 'armor' | 'relic';
export type VanitySlot = 'head' | 'armor' | 'weapon';
export type WeaponArchetype = 'sword' | 'dagger' | 'broadsword' | 'staff' | 'bow';

export interface EquipmentStats {
  attackPower?: number;
  attackSpeedMs?: number; // lower is faster
  cleaveRadius?: number;  // melee reach in px
  cleaveAngle?: number;   // arc in radians
  critChance?: number;    // 0.0 to 1.0
  knockback?: number;     // knockback force in px
  moveSpeedBonus?: number; // 0.10 = +10%
  damageReductionPct?: number; // 0.15 = 15% reduction
  maxHealthBonus?: number; // bonus hearts
  maxManaBonus?: number;   // bonus MP
  manaCostReduction?: number; // 0.30 = 30% cheaper spell casts
  isRanged?: boolean;
  arrowSpeed?: number;
  arrowRange?: number;
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  archetype?: WeaponArchetype;
  description: string;
  icon: string;
  color: string;
  value: number;
  stats: EquipmentStats;
}

export interface VanityDefinition {
  id: string;
  name: string;
  slot: VanitySlot;
  description: string;
  icon: string;
  color: string;
}

export interface PlayerEquipment {
  weapon: string | null;
  offhand: string | null;
  armor: string | null;
  relic: string | null;
}

export interface PlayerVanity {
  head: string | null;
  armor: string | null;
  weapon: string | null;
}

export interface AggregatedEquipmentStats {
  attackPower: number;
  attackSpeedMs: number;
  cleaveRadius: number;
  cleaveAngle: number;
  critChance: number;
  knockback: number;
  moveSpeedMultiplier: number;
  damageReductionPct: number;
  maxHealthBonus: number;
  maxManaBonus: number;
  manaCostReductionPct: number;
  isRanged: boolean;
  arrowSpeed: number;
  arrowRange: number;
  weaponArchetype: WeaponArchetype;
}

export const EQUIPMENT_DEFINITIONS: Record<string, EquipmentDefinition> = {
  // Weapons
  sword_wood: {
    id: 'sword_wood',
    name: 'Practice Wooden Sword',
    slot: 'weapon',
    archetype: 'sword',
    description: 'A carved wooden practice sword. Reliable and well-balanced for training.',
    icon: '🗡️',
    color: '#92400e',
    value: 10,
    stats: {
      attackPower: 1,
      attackSpeedMs: 180,
      cleaveRadius: 46,
      cleaveAngle: (2 * Math.PI) / 3, // 120 deg
      critChance: 0.15,
      knockback: 12
    }
  },
  sword_iron: {
    id: 'sword_iron',
    name: 'Town Guard Shortsword',
    slot: 'weapon',
    archetype: 'sword',
    description: 'Forged steel shortsword carried by Oakhaven sentries. Sharp and sturdy.',
    icon: '⚔️',
    color: '#94a3b8',
    value: 50,
    stats: {
      attackPower: 2,
      attackSpeedMs: 175,
      cleaveRadius: 48,
      cleaveAngle: (2 * Math.PI) / 3,
      critChance: 0.20,
      knockback: 16
    }
  },
  dagger_shadow: {
    id: 'dagger_shadow',
    name: "Thief's Stiletto",
    slot: 'weapon',
    archetype: 'dagger',
    description: 'A razor-sharp obsidian dagger. Rapid attacks with extreme critical hit lethality.',
    icon: '🗡️',
    color: '#334155',
    value: 75,
    stats: {
      attackPower: 1,
      attackSpeedMs: 110, // Very rapid cadence
      cleaveRadius: 32,
      cleaveAngle: Math.PI / 3, // 60 deg focused stab
      critChance: 0.45, // High crit chance
      knockback: 8,
      moveSpeedBonus: 0.10 // Agility boost
    }
  },
  sword_claymore: {
    id: 'sword_claymore',
    name: 'Royal Claymore',
    slot: 'weapon',
    archetype: 'broadsword',
    description: 'A massive two-handed greatsword. Sweeps a wide 180° cleave arc with crushing knockback.',
    icon: '⚔️',
    color: '#e2e8f0',
    value: 120,
    stats: {
      attackPower: 3,
      attackSpeedMs: 270, // Heavy deliberate windup
      cleaveRadius: 64,   // Long sweeping reach
      cleaveAngle: Math.PI, // 180 deg wide cleave
      critChance: 0.15,
      knockback: 36 // Massive knockback push
    }
  },
  staff_oak: {
    id: 'staff_oak',
    name: 'Elder Oak Staff',
    slot: 'weapon',
    archetype: 'staff',
    description: 'Ancient staff carved from Heartwood. Channels arcane flow, reducing spell mana costs.',
    icon: '🪄',
    color: '#a855f7',
    value: 100,
    stats: {
      attackPower: 1,
      attackSpeedMs: 200,
      cleaveRadius: 42,
      cleaveAngle: Math.PI / 2,
      critChance: 0.10,
      knockback: 14,
      maxManaBonus: 20,
      manaCostReduction: 0.40 // 40% mana discount on spells!
    }
  },
  bow_recurve: {
    id: 'bow_recurve',
    name: 'Whispering Recurve Bow',
    slot: 'weapon',
    archetype: 'bow',
    description: 'A flexible yew longbow. Fires physical arrows at long range in your facing direction.',
    icon: '🏹',
    color: '#15803d',
    value: 90,
    stats: {
      attackPower: 2,
      attackSpeedMs: 220,
      cleaveRadius: 0,
      cleaveAngle: 0,
      critChance: 0.25,
      isRanged: true,
      arrowSpeed: 340, // px/sec
      arrowRange: 260  // px range
    }
  },

  // Off-hand Items
  shield_wood: {
    id: 'shield_wood',
    name: 'Oak Buckler',
    slot: 'offhand',
    description: 'Light wooden round shield. Absorbs 15% of incoming enemy damage.',
    icon: '🛡️',
    color: '#b45309',
    value: 25,
    stats: {
      damageReductionPct: 0.15
    }
  },
  shield_iron: {
    id: 'shield_iron',
    name: 'Iron Aegis',
    slot: 'offhand',
    description: 'Heavy reinforced steel shield. Absorbs 30% damage and fortifies health.',
    icon: '🛡️',
    color: '#64748b',
    value: 80,
    stats: {
      damageReductionPct: 0.30,
      maxHealthBonus: 1
    }
  },
  tome_arcane: {
    id: 'tome_arcane',
    name: 'Arcane Grimoire',
    slot: 'offhand',
    description: 'A leather-bound book of forgotten sigils. Grants extra mana and spell efficiency.',
    icon: '📖',
    color: '#6366f1',
    value: 85,
    stats: {
      maxManaBonus: 25,
      manaCostReduction: 0.15
    }
  },
  quiver_ranger: {
    id: 'quiver_ranger',
    name: 'Quiver of the Wind',
    slot: 'offhand',
    description: 'Fletched arrows enchanted with breeze charms. Quickens bow reload speed and damage.',
    icon: '🎒',
    color: '#059669',
    value: 70,
    stats: {
      attackSpeedMs: -35,
      attackPower: 1
    }
  },

  // Body Armor
  armor_leather: {
    id: 'armor_leather',
    name: "Ranger's Leather Tunic",
    slot: 'armor',
    description: 'Supple boiled leather armor. Enhances movement speed and survivability.',
    icon: '🥋',
    color: '#78350f',
    value: 45,
    stats: {
      moveSpeedBonus: 0.10,
      maxHealthBonus: 1,
      damageReductionPct: 0.05
    }
  },
  armor_plate: {
    id: 'armor_plate',
    name: "Knight's Iron Cuirass",
    slot: 'armor',
    description: 'Solid plate mail armor. Exceptional damage reduction and maximum health fortitude.',
    icon: '🦺',
    color: '#475569',
    value: 110,
    stats: {
      damageReductionPct: 0.25,
      maxHealthBonus: 2,
      moveSpeedBonus: -0.05 // Slight heavy armor penalty
    }
  },
  armor_robe: {
    id: 'armor_robe',
    name: "Arcane Weaver's Robe",
    slot: 'armor',
    description: 'Silk vestments imbued with astral threads. Vastly expands the wearer’s mana reserves.',
    icon: '👘',
    color: '#7c3aed',
    value: 95,
    stats: {
      maxManaBonus: 30,
      manaCostReduction: 0.10
    }
  },

  // Relics & Trinkets
  relic_heart: {
    id: 'relic_heart',
    name: 'Heart Locket',
    slot: 'relic',
    description: 'An enchanted silver amulet pulsing with warm vitality. Adds +2 maximum health.',
    icon: '📿',
    color: '#ef4444',
    value: 60,
    stats: {
      maxHealthBonus: 2
    }
  },
  relic_feather: {
    id: 'relic_feather',
    name: 'Swift Falcon Feather',
    slot: 'relic',
    description: 'A feather blessed by the mountain falcons. Increases player movement speed by 20%.',
    icon: '🪶',
    color: '#38bdf8',
    value: 65,
    stats: {
      moveSpeedBonus: 0.20
    }
  },
  relic_moonstone: {
    id: 'relic_moonstone',
    name: 'Moonstone Charm',
    slot: 'relic',
    description: 'A luminous celestial gem glowing in moonlight. Expands mana capacity by +25 MP.',
    icon: '💎',
    color: '#c084fc',
    value: 75,
    stats: {
      maxManaBonus: 25
    }
  },
  relic_phoenix: {
    id: 'relic_phoenix',
    name: 'Phoenix Talisman',
    slot: 'relic',
    description: 'A warm cinder preserved in a golden cage. Fortifies endurance and warding aura.',
    icon: '🔥',
    color: '#f97316',
    value: 120,
    stats: {
      maxHealthBonus: 1,
      damageReductionPct: 0.10
    }
  },
  relic_sun_stone: {
    id: 'relic_sun_stone',
    name: 'Sun Stone of the Catacombs',
    slot: 'relic',
    description: "An ancient radiant lodestone recovered from Malakor's crypt. Grants +2 Max Health, +1 Attack Power, and +10% Damage Reduction.",
    icon: '☀️',
    color: '#f59e0b',
    value: 150,
    stats: {
      maxHealthBonus: 2,
      attackPower: 1,
      damageReductionPct: 0.10
    }
  }
};

export const VANITY_DEFINITIONS: Record<string, VanityDefinition> = {
  // Headgear
  vanity_crown: {
    id: 'vanity_crown',
    name: 'Royal Golden Crown',
    slot: 'head',
    description: 'A regal diadem crowned with crimson rubies, worthy of Oakhaven royalty.',
    icon: '👑',
    color: '#eab308'
  },
  vanity_hat_wizard: {
    id: 'vanity_hat_wizard',
    name: 'Starlight Wizard Hat',
    slot: 'head',
    description: 'A pointed midnight-blue hat stitched with glowing celestial gold constellations.',
    icon: '🧙',
    color: '#3b82f6'
  },
  vanity_hood_ranger: {
    id: 'vanity_hood_ranger',
    name: 'Woodland Ranger Hood',
    slot: 'head',
    description: 'A stealthy dark green cowl blending seamlessly into forest shadows.',
    icon: '🧝',
    color: '#16a34a'
  },

  // Armor / Capes
  vanity_cape_hero: {
    id: 'vanity_cape_hero',
    name: "Hero's Crimson Cape",
    slot: 'armor',
    description: 'A majestic crimson cloak that billows heroically in the autumn wind.',
    icon: '🦸',
    color: '#dc2626'
  },
  vanity_armor_knight: {
    id: 'vanity_armor_knight',
    name: "Knight's Steel Pauldrons",
    slot: 'armor',
    description: 'Polished silver shoulder plates stamped with the gallant lion sigil.',
    icon: '🛡️',
    color: '#94a3b8'
  }
};

export class EquipmentManager {
  /**
   * Returns a clean, default equipment configuration.
   */
  public static getDefaultEquipment(): PlayerEquipment {
    return {
      weapon: 'sword_wood',
      offhand: null,
      armor: null,
      relic: null
    };
  }

  /**
   * Returns a clean, default vanity configuration.
   */
  public static getDefaultVanity(): PlayerVanity {
    return {
      head: null,
      armor: null,
      weapon: null
    };
  }

  /**
   * Creates an empty stats structure for allocation-free updates.
   */
  public static createDefaultStats(): AggregatedEquipmentStats {
    return {
      attackPower: 1,
      attackSpeedMs: 180,
      cleaveRadius: 46,
      cleaveAngle: (2 * Math.PI) / 3,
      critChance: 0.15,
      knockback: 12,
      moveSpeedMultiplier: 1.0,
      damageReductionPct: 0,
      maxHealthBonus: 0,
      maxManaBonus: 0,
      manaCostReductionPct: 0,
      isRanged: false,
      arrowSpeed: 0,
      arrowRange: 0,
      weaponArchetype: 'sword'
    };
  }

  /**
   * Aggregates stats from all equipped items in-place (0 KB heap allocations).
   */
  public static calculateStats(
    equipment: PlayerEquipment,
    outStats: AggregatedEquipmentStats
  ): AggregatedEquipmentStats {
    // 1. Reset to base unarmed/default values
    outStats.attackPower = 1;
    outStats.attackSpeedMs = 180;
    outStats.cleaveRadius = 46;
    outStats.cleaveAngle = (2 * Math.PI) / 3;
    outStats.critChance = 0.15;
    outStats.knockback = 12;
    outStats.moveSpeedMultiplier = 1.0;
    outStats.damageReductionPct = 0;
    outStats.maxHealthBonus = 0;
    outStats.maxManaBonus = 0;
    outStats.manaCostReductionPct = 0;
    outStats.isRanged = false;
    outStats.arrowSpeed = 0;
    outStats.arrowRange = 0;
    outStats.weaponArchetype = 'sword';

    // 2. Weapon Slot determines base combat archetype
    if (equipment.weapon && EQUIPMENT_DEFINITIONS[equipment.weapon]) {
      const wep = EQUIPMENT_DEFINITIONS[equipment.weapon]!;
      outStats.attackPower = wep.stats.attackPower ?? 1;
      outStats.attackSpeedMs = wep.stats.attackSpeedMs ?? 180;
      outStats.cleaveRadius = wep.stats.cleaveRadius ?? 46;
      outStats.cleaveAngle = wep.stats.cleaveAngle ?? (2 * Math.PI) / 3;
      outStats.critChance = wep.stats.critChance ?? 0.15;
      outStats.knockback = wep.stats.knockback ?? 12;
      outStats.weaponArchetype = wep.archetype ?? 'sword';
      outStats.isRanged = !!wep.stats.isRanged;
      outStats.arrowSpeed = wep.stats.arrowSpeed ?? 0;
      outStats.arrowRange = wep.stats.arrowRange ?? 0;
      if (wep.stats.moveSpeedBonus) outStats.moveSpeedMultiplier += wep.stats.moveSpeedBonus;
      if (wep.stats.manaCostReduction) outStats.manaCostReductionPct += wep.stats.manaCostReduction;
      if (wep.stats.maxManaBonus) outStats.maxManaBonus += wep.stats.maxManaBonus;
      if (wep.stats.maxHealthBonus) outStats.maxHealthBonus += wep.stats.maxHealthBonus;
    }

    // 3. Off-hand Slot modifiers
    if (equipment.offhand && EQUIPMENT_DEFINITIONS[equipment.offhand]) {
      const off = EQUIPMENT_DEFINITIONS[equipment.offhand]!;
      if (off.stats.attackPower) outStats.attackPower += off.stats.attackPower;
      if (off.stats.attackSpeedMs) outStats.attackSpeedMs = Math.max(80, outStats.attackSpeedMs + off.stats.attackSpeedMs);
      if (off.stats.damageReductionPct) outStats.damageReductionPct += off.stats.damageReductionPct;
      if (off.stats.maxHealthBonus) outStats.maxHealthBonus += off.stats.maxHealthBonus;
      if (off.stats.maxManaBonus) outStats.maxManaBonus += off.stats.maxManaBonus;
      if (off.stats.manaCostReduction) outStats.manaCostReductionPct += off.stats.manaCostReduction;
    }

    // 4. Armor Slot modifiers
    if (equipment.armor && EQUIPMENT_DEFINITIONS[equipment.armor]) {
      const arm = EQUIPMENT_DEFINITIONS[equipment.armor]!;
      if (arm.stats.damageReductionPct) outStats.damageReductionPct += arm.stats.damageReductionPct;
      if (arm.stats.maxHealthBonus) outStats.maxHealthBonus += arm.stats.maxHealthBonus;
      if (arm.stats.maxManaBonus) outStats.maxManaBonus += arm.stats.maxManaBonus;
      if (arm.stats.moveSpeedBonus) outStats.moveSpeedMultiplier += arm.stats.moveSpeedBonus;
      if (arm.stats.manaCostReduction) outStats.manaCostReductionPct += arm.stats.manaCostReduction;
    }

    // 5. Relic Slot modifiers
    if (equipment.relic && EQUIPMENT_DEFINITIONS[equipment.relic]) {
      const rel = EQUIPMENT_DEFINITIONS[equipment.relic]!;
      if (rel.stats.attackPower) outStats.attackPower += rel.stats.attackPower;
      if (rel.stats.attackSpeedMs) outStats.attackSpeedMs = Math.max(80, outStats.attackSpeedMs + rel.stats.attackSpeedMs);
      if (rel.stats.maxHealthBonus) outStats.maxHealthBonus += rel.stats.maxHealthBonus;
      if (rel.stats.maxManaBonus) outStats.maxManaBonus += rel.stats.maxManaBonus;
      if (rel.stats.moveSpeedBonus) outStats.moveSpeedMultiplier += rel.stats.moveSpeedBonus;
      if (rel.stats.damageReductionPct) outStats.damageReductionPct += rel.stats.damageReductionPct;
      if (rel.stats.critChance) outStats.critChance += rel.stats.critChance;
      if (rel.stats.manaCostReduction) outStats.manaCostReductionPct += rel.stats.manaCostReduction;
    }

    // 6. Clamp values for balanced gamefeel
    outStats.moveSpeedMultiplier = Math.max(0.7, Math.min(2.0, outStats.moveSpeedMultiplier));
    outStats.damageReductionPct = Math.max(0, Math.min(0.65, outStats.damageReductionPct));
    outStats.manaCostReductionPct = Math.max(0, Math.min(0.60, outStats.manaCostReductionPct));
    outStats.critChance = Math.max(0.05, Math.min(0.85, outStats.critChance));
    outStats.attackSpeedMs = Math.max(80, Math.min(450, outStats.attackSpeedMs));

    return outStats;
  }

  /**
   * Validates if an item can be equipped into a designated slot.
   */
  public static canEquip(slot: EquipmentSlot, itemId: string): boolean {
    const def = EQUIPMENT_DEFINITIONS[itemId];
    if (!def) return false;
    return def.slot === slot;
  }

  /**
   * Returns definition or undefined.
   */
  public static getDefinition(itemId: string): EquipmentDefinition | undefined {
    return EQUIPMENT_DEFINITIONS[itemId];
  }

  /**
   * Returns vanity definition or undefined.
   */
  public static getVanityDefinition(vanityId: string): VanityDefinition | undefined {
    return VANITY_DEFINITIONS[vanityId];
  }
}
