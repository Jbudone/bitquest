// shared/src/behaviors/registry.ts
// Behavior Registry & Unified Spatial Query Pipeline for Modular Entities (Issue #50)

import type { EntityData, PlayerData, ItemDropData } from '../types';
import type { 
  InteractableTrait, 
  HealthPoolTrait, 
  HurtboxTrait, 
  LootTableTrait, 
  InteractionContext, 
  InteractionResult 
} from './traits';

export interface PrioritizedInteraction {
  entity: EntityData;
  trait: InteractableTrait;
  distance: number;
  promptText: string;
}

export class BehaviorRegistry {
  private static interactables = new Map<string, InteractableTrait>();
  private static healthPools = new Map<string, HealthPoolTrait>();
  private static hurtboxes = new Map<string, HurtboxTrait>();
  private static lootTables = new Map<string, LootTableTrait>();

  static {
    this.registerTraits();
  }

  private static registerTraits() {
    // 1. Clay Pot (Zelda-style lift & toss)
    this.interactables.set('pot', {
      action: 'lift',
      promptText: '[E] Lift Pot',
      interactionRadius: 40,
      priorityWeight: 100,
      canInteract: (ent, player) => !ent.state.destroyed && !ent.state.heldBy && !player?.carryingItem,
      onInteract: (ent, ctx, world) => {
        if (ctx.action === 'lift') {
          ent.state.heldBy = ctx.playerId;
          return { handled: true, stateChanged: true };
        } else if (ctx.action === 'toss') {
          ent.state.heldBy = null;
          if (typeof ctx.x === 'number' && typeof ctx.y === 'number') {
            ent.x = ctx.x;
            ent.y = ctx.y;
          }
          ent.state.destroyed = true;
          ent.state.respawnAt = Date.now() + 20000;
          world.checkPressureSwitches?.();

          // Roll pot drops
          const drops = BehaviorRegistry.getLootTable(ent)?.rollDrops(ent.x, ent.y) || [];
          return { handled: true, stateChanged: true, spawnItems: drops };
        }
        return { handled: false };
      }
    });

    this.lootTables.set('pot', {
      entries: [
        { itemType: 'heart', chance: 0.35, minCount: 1, maxCount: 1, value: 1 },
        { itemType: 'coin', chance: 0.50, minCount: 1, maxCount: 2, value: 1 }
      ],
      rollDrops: (x, y) => {
        const drops: ItemDropData[] = [];
        if (Math.random() < 0.6) {
          const type = Math.random() < 0.3 ? 'heart' : 'coin';
          drops.push({
            id: `item_drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            itemType: type,
            x: x + (Math.random() * 8 - 4),
            y: y + (Math.random() * 8 - 4),
            value: 1
          });
        }
        return drops;
      }
    });

    // 2. Cuttable Bushes
    this.interactables.set('bush', {
      action: 'cut',
      promptText: '[Space] Cut Bush',
      interactionRadius: 36,
      priorityWeight: 60,
      canInteract: (ent) => !ent.state.destroyed,
      onInteract: (ent, _ctx, world) => {
        ent.state.destroyed = true;
        ent.state.respawnAt = Date.now() + 25000;
        const drops = BehaviorRegistry.getLootTable(ent)?.rollDrops(ent.x, ent.y) || [];
        return { handled: true, stateChanged: true, spawnItems: drops };
      }
    });

    this.lootTables.set('bush', {
      entries: [
        { itemType: 'coin', chance: 0.60, minCount: 1, maxCount: 1, value: 1 },
        { itemType: 'strawberry', chance: 0.40, minCount: 1, maxCount: 1, value: 1 }
      ],
      rollDrops: (x, y) => {
        const types: Array<'coin' | 'strawberry' | 'acorn'> = ['coin', 'coin', 'coin', 'strawberry', 'acorn'];
        const chosen = types[Math.floor(Math.random() * types.length)]!;
        return [{
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          itemType: chosen,
          x: x + (Math.random() * 12 - 6),
          y: y + (Math.random() * 12 - 6),
          value: chosen === 'coin' ? (Math.random() > 0.4 ? 5 : 1) : 1
        }];
      }
    });

    // 3. Levers (Co-op & Vault Mechanics)
    this.interactables.set('lever', {
      action: 'pull_lever',
      promptText: '[E] Pull Lever',
      interactionRadius: 44,
      priorityWeight: 90,
      canInteract: () => true,
      onInteract: (_ent, ctx, world) => {
        world.handleLeverPull?.(ctx.playerId, _ent.id);
        return { handled: true };
      }
    });

    // 4. Heavy Carved Rune Blocks (Pushable)
    this.interactables.set('block', {
      action: 'push_block',
      promptText: '[E] Push Block',
      interactionRadius: 40,
      priorityWeight: 70,
      canInteract: () => true,
      onInteract: (ent, ctx, world) => {
        if (typeof ctx.x === 'number' && typeof ctx.y === 'number') {
          ent.x = ctx.x;
          ent.y = ctx.y;
          world.checkPressureSwitches?.();
          return { handled: true, stateChanged: true };
        }
        return { handled: false };
      }
    });

    // 5. Treasure Chests
    this.interactables.set('chest', {
      action: 'open_chest',
      promptText: '[E] Open Chest',
      interactionRadius: 42,
      priorityWeight: 85,
      canInteract: (ent) => !ent.state.locked && !ent.state.opened,
      onInteract: (ent, _ctx, _world) => {
        ent.state.opened = true;
        const drops: ItemDropData[] = [];
        for (let i = 0; i < 5; i++) {
          drops.push({
            id: `item_chest_${Date.now()}_${i}`,
            itemType: i === 0 ? 'strawberry' : (i === 1 ? 'acorn' : 'coin'),
            x: ent.x + (i - 2) * 14,
            y: ent.y + 16,
            value: i === 0 ? 1 : (i === 1 ? 2 : 5)
          });
        }
        return { handled: true, stateChanged: true, spawnItems: drops };
      }
    });

    // 6. Friendly NPCs
    this.interactables.set('npc', {
      action: 'talk',
      promptText: '[E] Talk',
      interactionRadius: 48,
      priorityWeight: 80,
      canInteract: () => true,
      onInteract: (ent, ctx, world) => {
        world.handleNpcTalk?.(ctx.playerId, ent.id);
        return { handled: true };
      }
    });

    // 7. Wildlife (e.g. Buster the Dog)
    this.interactables.set('wildlife', {
      action: 'pet',
      promptText: '[E] Pet',
      interactionRadius: 44,
      priorityWeight: 50,
      canInteract: () => true,
      onInteract: (ent) => {
        ent.state.petCount = (ent.state.petCount || 0) + 1;
        return { handled: true, stateChanged: true };
      }
    });

    // 8. Sproutlings (Whispering Meadow Enemy)
    this.healthPools.set('enemy_sproutling', {
      maxHp: 2,
      onHurt: (ent, damage) => {
        ent.state.hp = Math.max(0, (ent.state.hp ?? 2) - damage);
        const isDestroyed = ent.state.hp <= 0;
        if (isDestroyed) {
          ent.state.destroyed = true;
          ent.state.respawnAt = Date.now() + 25000;
        }
        return { damageDealt: damage, isDestroyed };
      }
    });

    this.hurtboxes.set('enemy_sproutling', {
      radius: 14,
      touchDamage: 1,
      canDamage: (ent) => !ent.state.destroyed
    });

    // 9. Grumble Shrooms (Fungal Hollow Enemy)
    this.healthPools.set('enemy_grumble', {
      maxHp: 3,
      onHurt: (ent, damage) => {
        ent.state.hp = Math.max(0, (ent.state.hp ?? 3) - damage);
        const isDestroyed = ent.state.hp <= 0;
        if (isDestroyed) {
          ent.state.destroyed = true;
          ent.state.respawnAt = Date.now() + 25000;
        }
        return { damageDealt: damage, isDestroyed };
      }
    });

    this.hurtboxes.set('enemy_grumble', {
      radius: 16,
      touchDamage: 1,
      canDamage: (ent) => !ent.state.destroyed
    });

    // 10. Boss: Baron von Truffle
    this.healthPools.set('boss_baron', {
      maxHp: 12,
      onHurt: (ent, damage) => {
        let finalDamage = damage;
        if (ent.state.stunnedUntil && Date.now() < ent.state.stunnedUntil) {
          finalDamage += 1; // Stun critical bonus
        }
        ent.state.hp = Math.max(0, (ent.state.hp ?? 12) - finalDamage);
        const isDestroyed = ent.state.hp <= 0;
        if (isDestroyed) {
          ent.state.destroyed = true;
          ent.state.respawnAt = Date.now() + 60000;
        }
        return { damageDealt: finalDamage, isDestroyed };
      }
    });

    this.hurtboxes.set('boss_baron', {
      radius: 28,
      touchDamage: 2,
      canDamage: (ent) => !ent.state.destroyed
    });
  }

  public static getInteractable(entity: EntityData): InteractableTrait | null {
    return (entity.subtype ? this.interactables.get(entity.subtype) : null) ||
           this.interactables.get(entity.type) ||
           null;
  }

  public static getHealthPool(entity: EntityData): HealthPoolTrait | null {
    const key = entity.subtype ? `${entity.type}_${entity.subtype}` : entity.type;
    return (entity.subtype ? this.healthPools.get(entity.subtype) : null) ||
           this.healthPools.get(key) ||
           this.healthPools.get(entity.type) ||
           null;
  }

  public static getHurtbox(entity: EntityData): HurtboxTrait | null {
    const key = entity.subtype ? `${entity.type}_${entity.subtype}` : entity.type;
    return (entity.subtype ? this.hurtboxes.get(entity.subtype) : null) ||
           this.hurtboxes.get(key) ||
           this.hurtboxes.get(entity.type) ||
           null;
  }

  public static getLootTable(entity: EntityData): LootTableTrait | null {
    return (entity.subtype ? this.lootTables.get(entity.subtype) : null) ||
           this.lootTables.get(entity.type) ||
           null;
  }

  // Unified Spatial Query Pipeline for Interaction Prioritization
  public static getPrioritizedInteraction(
    playerX: number,
    playerY: number,
    entities: Iterable<EntityData>,
    maxRadius = 48,
    player?: PlayerData
  ): PrioritizedInteraction | null {
    let bestInteraction: PrioritizedInteraction | null = null;
    let highestScore = -Infinity;

    for (const ent of entities) {
      const trait = this.getInteractable(ent);
      if (!trait) continue;

      const dist = Math.hypot(ent.x - playerX, ent.y - playerY);
      const effectiveRadius = Math.min(maxRadius, trait.interactionRadius);

      if (dist <= effectiveRadius && trait.canInteract(ent, player)) {
        // Score = PriorityWeight * 10 - Distance (higher priority wins; closer distance breaks ties)
        const score = trait.priorityWeight * 10 - dist;
        if (score > highestScore) {
          highestScore = score;
          bestInteraction = {
            entity: ent,
            trait,
            distance: dist,
            promptText: trait.promptText
          };
        }
      }
    }

    return bestInteraction;
  }

  // Unified Dispatcher eliminating monolithic switch statements
  public static handleInteraction(
    entity: EntityData,
    context: InteractionContext,
    world: any
  ): InteractionResult {
    const trait = this.getInteractable(entity);
    if (!trait) {
      return { handled: false };
    }
    return trait.onInteract(entity, context, world);
  }
}
