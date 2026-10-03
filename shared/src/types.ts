export * from './schemas';
export * from './equipment';
import type { 
  Direction, 
  PlayerAnimState, 
  PlayerData, 
  EntityData, 
  ItemDropData, 
  ChatMessage, 
  EmoteType, 
  EmoteEvent,
  DialogueNode,
  SpellId,
  StatusEffectType,
  EquipmentSlot,
  VanitySlot
} from './schemas';
import type { PlayerEquipment, PlayerVanity, AggregatedEquipmentStats } from './equipment';

// Network protocol packets
export type ClientPacket =
  | { type: 'join'; name: string; color: string; paletteIndex: number }
  | { type: 'move'; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null; seq?: number }
  | { type: 'interact'; targetId: string; action: 'cut' | 'lift' | 'toss' | 'catch' | 'talk' | 'press' | 'pet' | 'hit_enemy' | 'player_hurt' | 'pull_lever'; x?: number; y?: number; damage?: number }
  | { type: 'cast_spell'; spellId: SpellId; x: number; y: number; direction: Direction }
  | { type: 'equip_item'; slot: EquipmentSlot; itemId: string | null }
  | { type: 'set_vanity'; slot: VanitySlot; vanityId: string | null }
  | { type: 'shoot_arrow'; x: number; y: number; direction: Direction; damage: number }
  | { type: 'pot_throw'; potId: string; startX: number; startY: number; targetX: number; targetY: number }
  | { type: 'pot_catch'; potId: string }
  | { type: 'chat'; text: string }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'dialogue_choice'; npcId: string; choiceIndex: number }
  | { type: 'collect_item'; itemId: string }
  | { type: 'admin_command'; action: 'toggle_gate' | 'teleport' | 'heal' | 'spawn_item' | 'set_flag' | 'speed_boost' | 'spawn_enemy' | 'spawn_boss'; payload?: any };

export type ServerPacket =
  | { type: 'init'; yourId: string; players: PlayerData[]; entities: EntityData[]; items: ItemDropData[]; worldFlags: Record<string, boolean>; serverTime: number }
  | { type: 'player_joined'; player: PlayerData }
  | { type: 'player_left'; id: string }
  | { type: 'world_tick'; players: Array<{ id: string; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null }>; serverTime: number; ackSeq?: number }
  | { type: 'reconcile'; ackSeq: number; x: number; y: number }
  | { type: 'entity_updated'; entity: EntityData }
  | { type: 'item_spawned'; item: ItemDropData }
  | { type: 'item_collected'; itemId: string; collectorId: string; itemType: string; value: number }
  | { type: 'chat_broadcast'; chat: ChatMessage }
  | { type: 'emote_broadcast'; emote: EmoteEvent }
  | { type: 'social_resonance'; player1Id: string; player2Id: string; emote: EmoteType; x: number; y: number }
  | { type: 'pot_thrown'; potId: string; throwerId: string; startX: number; startY: number; targetX: number; targetY: number; duration: number }
  | { type: 'pot_caught'; potId: string; catcherId: string; x: number; y: number }
  | { type: 'world_flag_updated'; key: string; value: boolean }
  | { type: 'dialogue_event'; npcId: string; speaker: string; portrait: string; text: string; responses?: { text: string; nextKey?: string; action?: string }[] }
  | { type: 'spell_cast'; casterId: string; spellId: SpellId; x: number; y: number; direction: Direction }
  | { type: 'arrow_shot'; shooterId: string; x: number; y: number; direction: Direction; speed: number; range: number; damage: number }
  | { type: 'equipment_updated'; playerId: string; equipment: PlayerEquipment; vanity: PlayerVanity; stats: AggregatedEquipmentStats }
  | { type: 'player_stats_updated'; id: string; health: number; maxHealth: number; mana: number; maxMana: number; coins: number; acorns: number }
  | { type: 'boss_event'; action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated'; x?: number; y?: number; targetX?: number; targetY?: number };

