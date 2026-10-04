export * from './schemas';
export * from './equipment';
export * from './classes';
export * from './dungeon';
export * from './fishing';
export * from './weather';
export * from './shop';
export * from './pets';
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
import type { CharacterClassId, ClassAbilityId } from './classes';
import type { PlayerFishLog } from './fishing';
import type { WeatherType } from './weather';
import type { ShopItem } from './shop';
import type { OcarinaNote } from './ocarina';

// Network protocol packets
export type ClientPacket =
  | { type: 'join'; name: string; color: string; paletteIndex: number }
  | { type: 'move'; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null; seq?: number; isTeleport?: boolean }
  | { type: 'interact'; targetId: string; action: 'cut' | 'lift' | 'toss' | 'catch' | 'talk' | 'press' | 'pet' | 'hit_enemy' | 'player_hurt' | 'pull_lever' | 'light_torch' | 'enter_dungeon' | 'warp_floor' | 'sit_campfire' | 'browse_shop' | 'mount' | 'dismount' | 'pet_command'; x?: number; y?: number; damage?: number }
  | { type: 'cast_spell'; spellId: SpellId; x: number; y: number; direction: Direction }
  | { type: 'equip_item'; slot: EquipmentSlot; itemId: string | null }
  | { type: 'set_vanity'; slot: VanitySlot; vanityId: string | null }
  | { type: 'set_class'; classId: CharacterClassId }
  | { type: 'use_class_ability'; abilityId: ClassAbilityId; x: number; y: number; direction: Direction }
  | { type: 'shoot_arrow'; x: number; y: number; direction: Direction; damage: number }
  | { type: 'pot_throw'; potId: string; startX: number; startY: number; targetX: number; targetY: number }
  | { type: 'pot_catch'; potId: string }
  | { type: 'fishing_cast'; targetX: number; targetY: number }
  | { type: 'fishing_reel'; isHolding: boolean }
  | { type: 'fishing_cancel' }
  | { type: 'shop_open'; merchantId: string }
  | { type: 'shop_buy'; merchantId: string; itemId: string; quantity: number }
  | { type: 'shop_sell'; merchantId: string; inventoryIndex: number; quantity: number }
  | { type: 'chat'; text: string }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'dialogue_choice'; npcId: string; choiceIndex: number }
  | { type: 'collect_item'; itemId: string }
  | { type: 'ocarina_note'; note: OcarinaNote; x: number; y: number }
  | { type: 'ocarina_song'; songId: string; x: number; y: number }
  | { type: 'admin_command'; action: 'toggle_gate' | 'teleport' | 'heal' | 'spawn_item' | 'set_flag' | 'speed_boost' | 'spawn_enemy' | 'spawn_boss' | 'set_weather' | 'set_time'; payload?: any };

export type ServerPacket =
  | { type: 'init'; yourId: string; players: PlayerData[]; entities: EntityData[]; items: ItemDropData[]; worldFlags: Record<string, boolean>; serverTime: number; weather?: WeatherType; timeOfDaySec?: number }
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
  | { type: 'class_updated'; playerId: string; classId: CharacterClassId; stats: AggregatedEquipmentStats }
  | { type: 'class_ability_triggered'; playerId: string; abilityId: ClassAbilityId; x: number; y: number; direction: Direction; targetId?: string }
  | { type: 'parry_event'; playerId: string; attackerId?: string; x: number; y: number }
  | { type: 'life_siphon_event'; casterId: string; targetId: string; amount: number; casterHp: number }
  | { type: 'minion_spawned'; minionId: string; ownerId: string; x: number; y: number; subtype: string }
  | { type: 'player_stats_updated'; id: string; health: number; maxHealth: number; mana: number; maxMana: number; coins: number; acorns: number; inventory?: string[] }
  | { type: 'boss_event'; action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated' | 'crypt_spike' | 'scythe_cleave' | 'darkness_shroud' | 'soul_barrage'; bossId?: string; x?: number; y?: number; targetX?: number; targetY?: number }
  | { type: 'dungeon_transition'; floorId: 'f1' | 'f2' | 'overworld'; x: number; y: number; title: string; subtitle: string }
  | { type: 'torch_lit_event'; torchId: string; x: number; y: number; roomSolved?: boolean }
  | { type: 'fishing_started'; playerId: string; startX: number; startY: number; targetX: number; targetY: number }
  | { type: 'fishing_bite'; playerId: string; biteTime: number; speciesHint: string; sweetSpotWidth: number; pullResistance: number }
  | { type: 'fishing_tension_sync'; playerId: string; tension: number; sweetSpotCenter: number; reelProgress: number }
  | { type: 'fishing_resolved'; playerId: string; result: 'caught' | 'escaped' | 'snapped' | 'cancelled'; speciesId?: string; sizeCm?: number; value?: number; isPersonalBest?: boolean }
  | { type: 'fish_log_sync'; playerId: string; log: PlayerFishLog }
  | { type: 'weather_sync'; weather: WeatherType; timeOfDaySec: number; transitionProgress: number; windAngle: number; windSpeed: number }
  | { type: 'lightning_strike'; x: number; y: number }
  | { type: 'campfire_rest'; playerId: string; campfireId: string; healedHp: number; restoredMana: number }
  | { type: 'shop_sync'; merchantId: string; merchantName: string; merchantTitle: string; portrait: string; greeting: string; wares: ShopItem[]; playerCoins: number; playerAcorns: number; inventory: string[] }
  | { type: 'shop_transaction_result'; success: boolean; message: string; newCoins: number; newAcorns: number; inventory: string[]; wares?: ShopItem[] }
  | { type: 'mount_toggle'; playerId: string; mountId: string | null; x: number; y: number }
  | { type: 'pet_alert'; petId: string; alertType: 'secret' | 'enemy'; x: number; y: number; text: string }
  | { type: 'ocarina_note_broadcast'; playerId: string; note: OcarinaNote; x: number; y: number }
  | { type: 'ocarina_song_broadcast'; playerId: string; songId: string; songName: string; effectType: string; x: number; y: number }
  | { type: 'ocarina_jam_resonance'; playerIds: string[]; x: number; y: number };



