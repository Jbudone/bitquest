// shared/src/behaviors/traits.ts
// Composable Trait Interfaces for Modular Entity-Behavior Architecture (Issue #50)

import type { EntityData, PlayerData, ItemDropData } from '../types';

export type InteractionActionType =
  | 'cut'
  | 'lift'
  | 'toss'
  | 'pull_lever'
  | 'talk'
  | 'pet'
  | 'push_block'
  | 'open_chest';

export interface InteractionContext {
  playerId: string;
  action: string;
  x?: number;
  y?: number;
  damage?: number;
}

export interface InteractionResult {
  handled: boolean;
  stateChanged?: boolean;
  spawnItems?: ItemDropData[];
}

export interface InteractableTrait {
  action: InteractionActionType;
  promptText: string;
  interactionRadius: number;
  priorityWeight: number; // Higher weight gets prioritized in crowded spaces
  canInteract: (entity: EntityData, player?: PlayerData) => boolean;
  onInteract: (entity: EntityData, context: InteractionContext, world: any) => InteractionResult;
}

export interface HealthPoolTrait {
  maxHp: number;
  invulnerableDurationMs?: number;
  onHurt: (entity: EntityData, damage: number, attackerId?: string) => { damageDealt: number; isDestroyed: boolean };
}

export interface HurtboxTrait {
  radius: number;
  touchDamage: number;
  canDamage: (entity: EntityData) => boolean;
}

export interface LootDropEntry {
  itemType: 'coin' | 'heart' | 'acorn' | 'strawberry' | 'mushroom' | 'crown';
  chance: number; // 0.0 to 1.0
  minCount: number;
  maxCount: number;
  value: number;
}

export interface LootTableTrait {
  entries: LootDropEntry[];
  rollDrops: (entityX: number, entityY: number) => ItemDropData[];
}
