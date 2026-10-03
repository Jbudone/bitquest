export * from './schemas';
import type { 
  Direction, 
  PlayerAnimState, 
  PlayerData, 
  EntityData, 
  ItemDropData, 
  ChatMessage, 
  EmoteType, 
  EmoteEvent,
  DialogueNode 
} from './schemas';

// Network protocol packets
export type ClientPacket =
  | { type: 'join'; name: string; color: string; paletteIndex: number }
  | { type: 'move'; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null }
  | { type: 'interact'; targetId: string; action: 'cut' | 'lift' | 'toss' | 'talk' | 'press' | 'pet' | 'hit_enemy' | 'player_hurt'; x?: number; y?: number; damage?: number }
  | { type: 'chat'; text: string }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'dialogue_choice'; npcId: string; choiceIndex: number }
  | { type: 'collect_item'; itemId: string }
  | { type: 'admin_command'; action: 'toggle_gate' | 'teleport' | 'heal' | 'spawn_item' | 'set_flag' | 'speed_boost' | 'spawn_enemy' | 'spawn_boss'; payload?: any };

export type ServerPacket =
  | { type: 'init'; yourId: string; players: PlayerData[]; entities: EntityData[]; items: ItemDropData[]; worldFlags: Record<string, boolean>; serverTime: number }
  | { type: 'player_joined'; player: PlayerData }
  | { type: 'player_left'; id: string }
  | { type: 'world_tick'; players: Array<{ id: string; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null }>; serverTime: number }
  | { type: 'entity_updated'; entity: EntityData }
  | { type: 'item_spawned'; item: ItemDropData }
  | { type: 'item_collected'; itemId: string; collectorId: string; itemType: string; value: number }
  | { type: 'chat_broadcast'; chat: ChatMessage }
  | { type: 'emote_broadcast'; emote: EmoteEvent }
  | { type: 'world_flag_updated'; key: string; value: boolean }
  | { type: 'dialogue_event'; npcId: string; speaker: string; portrait: string; text: string; responses?: { text: string; nextKey?: string; action?: string }[] }
  | { type: 'player_stats_updated'; id: string; health: number; maxHealth: number; coins: number; acorns: number }
  | { type: 'boss_event'; action: 'spawn' | 'stomp' | 'spore' | 'defeated'; x?: number; y?: number };
