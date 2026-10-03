// shared/src/magic.ts
// BitQuest Magic, Spellcasting & Elemental Status Effect Engine
// Issue #19: Task 7.1

import type { SpellId, StatusEffectType, StatusEffectData } from './schemas';

export interface SpellDefinition {
  id: SpellId;
  name: string;
  manaCost: number;
  cooldownMs: number;
  range: number;
  projectileSpeed: number; // px/sec, 0 = instant radial
  baseDamage: number;
  aoeRadius: number; // 0 = single target
  pushForce: number; // knockback in pixels
  statusEffect?: {
    type: StatusEffectType;
    durationMs: number;
    tickIntervalMs?: number;
    damagePerTick?: number;
    speedMultiplier?: number;
  };
  selfBuff?: {
    speedMultiplier: number;
    durationMs: number;
  };
  description: string;
  icon: string;
  color: string;
}

export const SPELL_DEFINITIONS: Record<SpellId, SpellDefinition> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    manaCost: 15,
    cooldownMs: 400,
    range: 260,
    projectileSpeed: 340,
    baseDamage: 2,
    aoeRadius: 32,
    pushForce: 16,
    statusEffect: {
      type: 'burn',
      durationMs: 3200,
      tickIntervalMs: 800,
      damagePerTick: 1
    },
    description: 'Launches an explosive fire orb that ignites and burns enemies over time.',
    icon: '🔥',
    color: '#f97316'
  },
  ice_lance: {
    id: 'ice_lance',
    name: 'Ice Lance',
    manaCost: 12,
    cooldownMs: 350,
    range: 320,
    projectileSpeed: 440,
    baseDamage: 1,
    aoeRadius: 18,
    pushForce: 12,
    statusEffect: {
      type: 'freeze',
      durationMs: 3500,
      speedMultiplier: 0.4
    },
    description: 'Fires a piercing frost icicle that chills and slows enemy movement by 60%.',
    icon: '❄️',
    color: '#38bdf8'
  },
  gale_ward: {
    id: 'gale_ward',
    name: 'Gale Ward',
    manaCost: 20,
    cooldownMs: 800,
    range: 0, // instant radial around caster
    projectileSpeed: 0,
    baseDamage: 1,
    aoeRadius: 56,
    pushForce: 42,
    statusEffect: {
      type: 'stun',
      durationMs: 1200
    },
    selfBuff: {
      speedMultiplier: 1.35,
      durationMs: 3000
    },
    description: 'Unleashes a swirling autumn gale pushing back and stunning enemies while boosting speed.',
    icon: '🌪️',
    color: '#34d399'
  }
};

export class ManaPool {
  public current: number;
  public max: number;
  public regenRatePerSec: number;
  private pauseRegenUntil = 0;
  private fractionalMana = 0;

  constructor(maxMana = 50, initialMana = 50, regenRatePerSec = 5) {
    this.max = maxMana;
    this.current = Math.min(initialMana, maxMana);
    this.regenRatePerSec = regenRatePerSec;
    this.fractionalMana = this.current;
  }

  public canCast(spellId: SpellId): boolean {
    const spell = SPELL_DEFINITIONS[spellId];
    return spell ? this.current >= spell.manaCost : false;
  }

  public consumeMana(amount: number, now = Date.now()): boolean {
    if (this.current < amount) return false;
    this.current -= amount;
    this.fractionalMana = this.current;
    // Brief pause on natural regen after spellcast (1.0s)
    this.pauseRegenUntil = now + 1000;
    return true;
  }

  public restoreMana(amount: number) {
    this.current = Math.min(this.max, this.current + amount);
    this.fractionalMana = this.current;
  }

  public updateRegen(deltaMs: number, now = Date.now()): { changed: boolean; current: number } {
    if (this.current >= this.max || now < this.pauseRegenUntil) {
      return { changed: false, current: this.current };
    }

    const prevInt = this.current;
    const regenDelta = (this.regenRatePerSec * deltaMs) / 1000;
    this.fractionalMana = Math.min(this.max, this.fractionalMana + regenDelta);
    this.current = Math.floor(this.fractionalMana);

    return {
      changed: this.current !== prevInt,
      current: this.current
    };
  }

  public setMaxMana(newMax: number) {
    this.max = newMax;
    if (this.current > newMax) {
      this.current = newMax;
      this.fractionalMana = newMax;
    }
  }
}

export class StatusEffectManager {
  // Applies or refreshes a status effect on an entity's state object
  public static applyEffect(
    entityState: any,
    effectType: StatusEffectType,
    durationMs: number,
    now = Date.now(),
    opts: { tickIntervalMs?: number; damagePerTick?: number; speedMultiplier?: number } = {}
  ): StatusEffectData {
    if (!entityState.statusEffects) {
      entityState.statusEffects = {};
    }

    const data: StatusEffectData = {
      type: effectType,
      expiresAt: now + durationMs,
      tickInterval: opts.tickIntervalMs,
      nextTickAt: opts.tickIntervalMs ? now + opts.tickIntervalMs : undefined,
      damagePerTick: opts.damagePerTick,
      speedMultiplier: opts.speedMultiplier
    };

    entityState.statusEffects[effectType] = data;
    return data;
  }

  // Ticks status effects: executes damage intervals, expires old ones, and calculates movement multipliers
  public static updateEffects(
    entityState: any,
    now = Date.now(),
    onDamage?: (dmg: number, effectType: StatusEffectType) => void
  ): { isStunned: boolean; speedMultiplier: number; activeCount: number } {
    if (!entityState.statusEffects) {
      return { isStunned: false, speedMultiplier: 1.0, activeCount: 0 };
    }

    let isStunned = false;
    let netSpeedMultiplier = 1.0;
    let activeCount = 0;

    const effects = entityState.statusEffects as Record<string, StatusEffectData>;

    for (const key of Object.keys(effects)) {
      const effect = effects[key];
      if (!effect) continue;

      // Check expiration
      if (now >= effect.expiresAt) {
        delete effects[key];
        continue;
      }

      activeCount++;

      // Handle Stun
      if (effect.type === 'stun') {
        isStunned = true;
        netSpeedMultiplier = 0.0;
      }

      // Handle Freeze slow
      if (effect.type === 'freeze') {
        const sm = effect.speedMultiplier ?? 0.4;
        if (sm < netSpeedMultiplier) {
          netSpeedMultiplier = sm;
        }
      }

      // Handle Burn tick damage
      if (effect.type === 'burn' && effect.nextTickAt && effect.damagePerTick) {
        if (now >= effect.nextTickAt) {
          onDamage?.(effect.damagePerTick, 'burn');
          effect.nextTickAt = now + (effect.tickInterval ?? 800);
        }
      }
    }

    return {
      isStunned,
      speedMultiplier: isStunned ? 0.0 : netSpeedMultiplier,
      activeCount
    };
  }

  public static hasEffect(entityState: any, effectType: StatusEffectType, now = Date.now()): boolean {
    if (!entityState?.statusEffects) return false;
    const eff = entityState.statusEffects[effectType] as StatusEffectData | undefined;
    return eff ? eff.expiresAt > now : false;
  }

  public static clearAll(entityState: any) {
    if (entityState?.statusEffects) {
      entityState.statusEffects = {};
    }
  }
}
