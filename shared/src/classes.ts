// shared/src/classes.ts
// BitQuest Class Archetypes Engine
// Issue #21: Task 7.3: Distinct playstyle kits: Warrior, Mage, Bard, Necromancer, Archer

import type { Direction, StatusEffectType } from './schemas';
import type { AggregatedEquipmentStats } from './equipment';

export type CharacterClassId = 'warrior' | 'mage' | 'bard' | 'necromancer' | 'archer';

export type ClassAbilityId =
  | 'shield_parry'
  | 'stagger_cleave'
  | 'teleport_blink'
  | 'arcane_nova'
  | 'speed_fanfare'
  | 'harmony_chord'
  | 'raise_skeleton'
  | 'life_siphon'
  | 'piercing_arrow'
  | 'evasive_backhop';

export interface ClassPassivePerk {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ClassAbilityDefinition {
  id: ClassAbilityId;
  name: string;
  classId: CharacterClassId;
  slot: 1 | 2; // Primary or Secondary class ability
  manaCost: number;
  cooldownMs: number;
  range: number;
  aoeRadius: number;
  baseDamage: number;
  pushForce: number;
  description: string;
  icon: string;
  color: string;
  statusEffect?: {
    type: StatusEffectType;
    durationMs: number;
    speedMultiplier?: number;
  };
}

export interface ClassDefinition {
  id: CharacterClassId;
  name: string;
  title: string;
  description: string;
  icon: string;
  crestColor: string;
  primaryAttribute: string;
  passivePerk: ClassPassivePerk;
  statModifiers: {
    maxHealthBonus: number;
    maxManaBonus: number;
    moveSpeedBonus: number;
    damageReductionBonus: number;
    critBonus: number;
    poiseBonus: number;
    manaRegenMultiplier: number;
  };
  abilities: [ClassAbilityDefinition, ClassAbilityDefinition];
}

export const CLASS_DEFINITIONS: Record<CharacterClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    title: 'Iron Vanguard',
    description: 'A fortified juggernaut of immense poise, sweeping cleaves, and defensive counters.',
    icon: '🛡️',
    crestColor: '#f59e0b',
    primaryAttribute: 'Strength & Poise',
    passivePerk: {
      id: 'high_poise',
      name: 'High Poise',
      icon: '🛡️',
      description: 'Immune to combat knockback, +2 Max Health, and +20% inherent damage reduction.'
    },
    statModifiers: {
      maxHealthBonus: 2,
      maxManaBonus: 0,
      moveSpeedBonus: -0.05,
      damageReductionBonus: 0.20,
      critBonus: 0.0,
      poiseBonus: 1.0,
      manaRegenMultiplier: 0.8
    },
    abilities: [
      {
        id: 'shield_parry',
        name: 'Shield Parry',
        classId: 'warrior',
        slot: 1,
        manaCost: 10,
        cooldownMs: 3500,
        range: 48,
        aoeRadius: 40,
        baseDamage: 2,
        pushForce: 36,
        description: 'Enters a focused defensive stance. Parries incoming attacks for 1.2s, completely absorbing damage and stunning the attacker for 1.8s.',
        icon: '🛡️',
        color: '#fbbf24',
        statusEffect: {
          type: 'stun',
          durationMs: 1800
        }
      },
      {
        id: 'stagger_cleave',
        name: 'Stagger Cleave',
        classId: 'warrior',
        slot: 2,
        manaCost: 15,
        cooldownMs: 2200,
        range: 52,
        aoeRadius: 52,
        baseDamage: 3,
        pushForce: 45,
        description: 'Unleashes a devastating 360° sweeping cleave dealing heavy damage, knocking back foes, and staggering them with a 1.5s stun.',
        icon: '⚔️',
        color: '#f97316',
        statusEffect: {
          type: 'stun',
          durationMs: 1500
        }
      }
    ]
  },

  mage: {
    id: 'mage',
    name: 'Mage',
    title: 'Arcane Elementalist',
    description: 'A master of the mystic arts wielding spatial blinks, arcane shockwaves, and vast mana pools.',
    icon: '🔮',
    crestColor: '#3b82f6',
    primaryAttribute: 'Intelligence & Arcana',
    passivePerk: {
      id: 'arcane_attunement',
      name: 'Arcane Attunement',
      icon: '✨',
      description: '+30 Max Mana, 2x natural mana regeneration, and -25% spell mana costs.'
    },
    statModifiers: {
      maxHealthBonus: -1,
      maxManaBonus: 30,
      moveSpeedBonus: 0.0,
      damageReductionBonus: 0.0,
      critBonus: 0.05,
      poiseBonus: 0.0,
      manaRegenMultiplier: 2.0
    },
    abilities: [
      {
        id: 'teleport_blink',
        name: 'Teleport Blink',
        classId: 'mage',
        slot: 1,
        manaCost: 16,
        cooldownMs: 2500,
        range: 96,
        aoeRadius: 28,
        baseDamage: 0,
        pushForce: 10,
        description: 'Instantly dematerializes and blinks 96px forward through space with brief invulnerability frames, scattering arcane sparks.',
        icon: '🌀',
        color: '#60a5fa'
      },
      {
        id: 'arcane_nova',
        name: 'Arcane Nova',
        classId: 'mage',
        slot: 2,
        manaCost: 24,
        cooldownMs: 3800,
        range: 72,
        aoeRadius: 72,
        baseDamage: 3,
        pushForce: 38,
        description: 'Detonates a violent radial sphere of pure mystic energy, devastating all surrounding foes and slowing them by 40%.',
        icon: '💥',
        color: '#818cf8',
        statusEffect: {
          type: 'freeze',
          durationMs: 2500,
          speedMultiplier: 0.6
        }
      }
    ]
  },

  bard: {
    id: 'bard',
    name: 'Bard',
    title: 'Melodic Minstrel',
    description: 'An inspirational troubadour whose acoustic chords heal party members and haste marches.',
    icon: '🎵',
    crestColor: '#ec4899',
    primaryAttribute: 'Charisma & Melody',
    passivePerk: {
      id: 'melodic_resonance',
      name: 'Melodic Resonance',
      icon: '🎶',
      description: '+10% Movement Speed, +50% Social Resonance radius, and all ability cooldowns reduced by 15%.'
    },
    statModifiers: {
      maxHealthBonus: 0,
      maxManaBonus: 10,
      moveSpeedBonus: 0.10,
      damageReductionBonus: 0.05,
      critBonus: 0.05,
      poiseBonus: 0.1,
      manaRegenMultiplier: 1.2
    },
    abilities: [
      {
        id: 'speed_fanfare',
        name: 'Speed Fanfare',
        classId: 'bard',
        slot: 1,
        manaCost: 12,
        cooldownMs: 4500,
        range: 128,
        aoeRadius: 128,
        baseDamage: 0,
        pushForce: 0,
        description: 'Sounds an uplifting brass march granting the bard and all allies within 128px a swift +40% movement speed aura for 6 seconds.',
        icon: '🎺',
        color: '#f43f5e'
      },
      {
        id: 'harmony_chord',
        name: 'Harmony Chord',
        classId: 'bard',
        slot: 2,
        manaCost: 20,
        cooldownMs: 5500,
        range: 96,
        aoeRadius: 96,
        baseDamage: 1,
        pushForce: 20,
        description: 'Strums a resonant harmonic hymn that restores 2 Health to the bard and nearby allies while pacifying surrounding foes with a 50% slow.',
        icon: '🪕',
        color: '#d946ef',
        statusEffect: {
          type: 'freeze',
          durationMs: 3500,
          speedMultiplier: 0.5
        }
      }
    ]
  },

  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    title: 'Bone Harvester',
    description: 'A shadowy occultist commanding skeletal minions and leeching vital essence from living foes.',
    icon: '💀',
    crestColor: '#a855f7',
    primaryAttribute: 'Dark Essence',
    passivePerk: {
      id: 'soul_harvest',
      name: 'Soul Harvest',
      icon: '🔮',
      description: 'Defeating enemies immediately harvests their soul essence, restoring +2 Health and +10 Mana.'
    },
    statModifiers: {
      maxHealthBonus: 0,
      maxManaBonus: 20,
      moveSpeedBonus: 0.0,
      damageReductionBonus: 0.05,
      critBonus: 0.0,
      poiseBonus: 0.2,
      manaRegenMultiplier: 1.1
    },
    abilities: [
      {
        id: 'raise_skeleton',
        name: 'Raise Bone Minion',
        classId: 'necromancer',
        slot: 1,
        manaCost: 25,
        cooldownMs: 8000,
        range: 64,
        aoeRadius: 32,
        baseDamage: 1,
        pushForce: 15,
        description: 'Renders bone dust into a loyal Skeletal Minion that follows the necromancer, hunts hostile monsters, and fights for 25 seconds.',
        icon: '☠️',
        color: '#9333ea'
      },
      {
        id: 'life_siphon',
        name: 'Life Siphon',
        classId: 'necromancer',
        slot: 2,
        manaCost: 15,
        cooldownMs: 3200,
        range: 130,
        aoeRadius: 24,
        baseDamage: 2,
        pushForce: 8,
        description: 'Tethers an ethereal crimson siphon to the nearest foe within 130px, dealing 2 damage and immediately transferring 2 Health to the necromancer.',
        icon: '🩸',
        color: '#c084fc',
        statusEffect: {
          type: 'freeze',
          durationMs: 2000,
          speedMultiplier: 0.7
        }
      }
    ]
  },

  archer: {
    id: 'archer',
    name: 'Archer',
    title: 'Windstrider Deadeye',
    description: 'A nimble sharpshooter delivering piercing arrow volleys and evasive backward leaps.',
    icon: '🏹',
    crestColor: '#10b981',
    primaryAttribute: 'Agility & Precision',
    passivePerk: {
      id: 'eagle_eye',
      name: 'Eagle Eye',
      icon: '🎯',
      description: '+25% Critical Strike Chance, +30% Arrow Velocity, +40px Arrow Range, and +10% Movement Speed.'
    },
    statModifiers: {
      maxHealthBonus: 0,
      maxManaBonus: 0,
      moveSpeedBonus: 0.10,
      damageReductionBonus: 0.0,
      critBonus: 0.25,
      poiseBonus: 0.0,
      manaRegenMultiplier: 1.0
    },
    abilities: [
      {
        id: 'piercing_arrow',
        name: 'Piercing Arrow',
        classId: 'archer',
        slot: 1,
        manaCost: 10,
        cooldownMs: 1800,
        range: 340,
        aoeRadius: 20,
        baseDamage: 3,
        pushForce: 28,
        description: 'Fires an aerodynamic piercing arrow that passes through all enemies in its flight path, dealing 3 damage with pierce trails.',
        icon: '🏹',
        color: '#34d399'
      },
      {
        id: 'evasive_backhop',
        name: 'Evasive Back-Hop',
        classId: 'archer',
        slot: 2,
        manaCost: 8,
        cooldownMs: 2200,
        range: 76,
        aoeRadius: 36,
        baseDamage: 1,
        pushForce: 18,
        description: 'Performs an agile backward leap 76px away from facing direction with 350ms of invulnerability frames while scattering caltrops.',
        icon: '💨',
        color: '#6ee7b7',
        statusEffect: {
          type: 'freeze',
          durationMs: 2200,
          speedMultiplier: 0.5
        }
      }
    ]
  }
};

export class ClassManager {
  /**
   * Retrieves definition for given character class ID.
   */
  public static getClass(classId: CharacterClassId): ClassDefinition {
    return CLASS_DEFINITIONS[classId] || CLASS_DEFINITIONS.warrior;
  }

  /**
   * Retrieves all registered character class archetypes.
   */
  public static getAllClasses(): ClassDefinition[] {
    return Object.values(CLASS_DEFINITIONS);
  }

  /**
   * Retrieves class ability definition by its ID.
   */
  public static getAbility(abilityId: ClassAbilityId): ClassAbilityDefinition | undefined {
    for (const cls of Object.values(CLASS_DEFINITIONS)) {
      for (const ability of cls.abilities) {
        if (ability.id === abilityId) return ability;
      }
    }
    return undefined;
  }

  /**
   * Zero-allocation in-place stat combination.
   * Merges equipment base stats with class modifiers.
   */
  public static applyClassModifiers(
    classId: CharacterClassId,
    equipmentStats: AggregatedEquipmentStats,
    outStats: AggregatedEquipmentStats
  ): AggregatedEquipmentStats {
    const cls = ClassManager.getClass(classId);
    const mod = cls.statModifiers;

    outStats.attackPower = equipmentStats.attackPower;
    outStats.attackSpeedMs = equipmentStats.attackSpeedMs;
    outStats.cleaveRadius = equipmentStats.cleaveRadius;
    outStats.cleaveAngle = equipmentStats.cleaveAngle;
    outStats.knockback = equipmentStats.knockback;
    outStats.weaponArchetype = equipmentStats.weaponArchetype;
    outStats.isRanged = equipmentStats.isRanged;

    // Apply class modifiers to Max HP & MP
    outStats.maxHealthBonus = equipmentStats.maxHealthBonus + mod.maxHealthBonus;
    outStats.maxManaBonus = equipmentStats.maxManaBonus + mod.maxManaBonus;

    // Apply damage reduction (clamped 0 to 80%)
    outStats.damageReductionPct = Math.min(0.80, equipmentStats.damageReductionPct + mod.damageReductionBonus);

    // Apply movement speed bonus (clamped minimum 0.5x)
    outStats.moveSpeedMultiplier = Math.max(0.50, equipmentStats.moveSpeedMultiplier + mod.moveSpeedBonus);

    // Apply critical chance bonus (clamped 0 to 90%)
    outStats.critChance = Math.min(0.90, equipmentStats.critChance + mod.critBonus);

    // Mana discount
    let manaDiscount = equipmentStats.manaCostReductionPct;
    if (classId === 'mage') {
      manaDiscount = Math.min(0.65, manaDiscount + 0.25);
    }
    outStats.manaCostReductionPct = manaDiscount;

    // Archer projectile bonuses
    if (classId === 'archer') {
      outStats.arrowSpeed = equipmentStats.arrowSpeed > 0 ? equipmentStats.arrowSpeed * 1.3 : 440;
      outStats.arrowRange = equipmentStats.arrowRange > 0 ? equipmentStats.arrowRange + 40 : 300;
    } else {
      outStats.arrowSpeed = equipmentStats.arrowSpeed;
      outStats.arrowRange = equipmentStats.arrowRange;
    }

    return outStats;
  }
}
