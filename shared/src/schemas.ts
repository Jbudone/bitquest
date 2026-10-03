import { z } from 'zod';

// ==========================================
// 1. Core Direction & Movement Schemas
// ==========================================
export const DirectionSchema = z.enum(['up', 'down', 'left', 'right']);
export type Direction = z.infer<typeof DirectionSchema>;

export const PlayerAnimStateSchema = z.enum([
  'idle',
  'walk',
  'slash',
  'roll',
  'lift',
  'carry_idle',
  'carry_walk',
  'toss',
  'sit',
  'hurt',
  'stun'
]);
export type PlayerAnimState = z.infer<typeof PlayerAnimStateSchema>;

// ==========================================
// 2. Player Data Schema
// ==========================================
export const PlayerDataSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(32),
  color: z.string(),
  paletteIndex: z.number().int().nonnegative().default(0),
  x: z.number(),
  y: z.number(),
  direction: DirectionSchema,
  anim: PlayerAnimStateSchema,
  carryingItem: z.string().nullable().default(null),
  health: z.number().int().default(6),
  maxHealth: z.number().int().default(6),
  coins: z.number().int().nonnegative().default(0),
  acorns: z.number().int().nonnegative().default(0),
  activeEmote: z.string().nullable().optional(),
  emoteExpiresAt: z.number().optional()
});
export type PlayerData = z.infer<typeof PlayerDataSchema>;

// ==========================================
// 3. Entity & World Object Schemas
// ==========================================
export const EntityTypeSchema = z.enum([
  'bush',
  'pot',
  'chest',
  'switch',
  'door',
  'sign',
  'npc',
  'wildlife',
  'enemy',
  'boss',
  'trigger',
  'prop'
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EntityStateSchema = z.object({
  destroyed: z.boolean().optional(),
  opened: z.boolean().optional(),
  activated: z.boolean().optional(),
  heldBy: z.string().nullable().optional(),
  direction: DirectionSchema.optional(),
  dialogueKey: z.string().optional(),
  health: z.number().optional(),
  maxHealth: z.number().optional(),
  isTelegraphing: z.boolean().optional(),
  respawnTime: z.number().optional()
}).catchall(z.any());
export type EntityState = z.infer<typeof EntityStateSchema>;

export const EntityDataSchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  x: z.number(),
  y: z.number(),
  subtype: z.string().optional(),
  name: z.string().optional(),
  interactable: z.boolean().default(true),
  state: EntityStateSchema.default({})
});
export type EntityData = z.infer<typeof EntityDataSchema>;

// ==========================================
// 4. Items & Drops Schemas
// ==========================================
export const ItemTypeSchema = z.enum([
  'coin',
  'strawberry',
  'acorn',
  'jam',
  'scone',
  'crown',
  'letter',
  'key_bronze',
  'key_silver',
  'key_boss',
  'potion_health',
  'sword_wood',
  'sword_iron',
  'shield_wood',
  'relic_heart'
]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

export const ItemCategorySchema = z.enum([
  'currency',
  'consumable',
  'quest',
  'key',
  'weapon',
  'armor',
  'relic'
]);
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ItemDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ItemCategorySchema,
  tier: z.number().int().min(1).max(5).default(1),
  description: z.string().default(''),
  iconColor: z.string().default('#f1c40f'),
  soundKey: z.string().default('coin'),
  value: z.number().int().nonnegative().default(1),
  stackable: z.boolean().default(true),
  maxStack: z.number().int().positive().default(99),
  stats: z.object({
    damage: z.number().optional(),
    defense: z.number().optional(),
    healAmount: z.number().optional(),
    speedBoost: z.number().optional(),
    durationMs: z.number().optional()
  }).default({})
});
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;

export const ItemDropDataSchema = z.object({
  id: z.string(),
  itemType: z.string(),
  x: z.number(),
  y: z.number(),
  value: z.number().default(1)
});
export type ItemDropData = z.infer<typeof ItemDropDataSchema>;

// ==========================================
// 5. Loot Tables
// ==========================================
export const LootDropRuleSchema = z.object({
  itemType: z.string(),
  chance: z.number().min(0).max(1), // 0.0 to 1.0 (e.g. 0.75 = 75%)
  minCount: z.number().int().positive().default(1),
  maxCount: z.number().int().positive().default(1)
});
export type LootDropRule = z.infer<typeof LootDropRuleSchema>;

export const LootTableSchema = z.object({
  id: z.string(),
  guaranteedDrops: z.array(LootDropRuleSchema).default([]),
  weightedPool: z.array(LootDropRuleSchema).default([])
});
export type LootTable = z.infer<typeof LootTableSchema>;

// ==========================================
// 6. Dialogue Trees & Nodes
// ==========================================
export const DialogueResponseSchema = z.object({
  text: z.string(),
  nextDialogueKey: z.string().optional(),
  action: z.string().optional(),
  questTrigger: z.string().optional(),
  requiredFlag: z.string().optional(),
  cost: z.object({
    itemType: z.string(),
    count: z.number().int().positive()
  }).optional()
});
export type DialogueResponse = z.infer<typeof DialogueResponseSchema>;

export const DialogueNodeSchema = z.object({
  speaker: z.string(),
  portrait: z.string().optional(),
  text: z.string(),
  mood: z.enum(['neutral', 'happy', 'sad', 'angry', 'surprised', 'smug', 'mysterious']).default('neutral'),
  responses: z.array(DialogueResponseSchema).optional()
});
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

export const DialogueTreeSchema = z.record(z.string(), DialogueNodeSchema);
export type DialogueTree = z.infer<typeof DialogueTreeSchema>;

// ==========================================
// 7. Quest System Schemas
// ==========================================
export const QuestStageSchema = z.object({
  stageIndex: z.number().int().nonnegative(),
  journalSummary: z.string(),
  objectiveType: z.enum(['talk', 'defeat', 'collect', 'interact', 'reach_area']),
  targetId: z.string(),
  targetCount: z.number().int().positive().default(1),
  currentCount: z.number().int().nonnegative().default(0),
  markerCoordinate: z.object({ x: z.number(), y: z.number() }).optional()
});
export type QuestStage = z.infer<typeof QuestStageSchema>;

export const QuestDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  giverNpcId: z.string(),
  stages: z.array(QuestStageSchema).min(1),
  prerequisiteQuests: z.array(z.string()).default([]),
  rewards: z.object({
    coins: z.number().int().nonnegative().default(0),
    acorns: z.number().int().nonnegative().default(0),
    items: z.array(z.object({ itemType: z.string(), count: z.number().int().positive().default(1) })).default([]),
    unlockedWorldFlags: z.array(z.string()).default([])
  })
});
export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;

// ==========================================
// 8. Map & Level Data Schemas
// ==========================================
export const SpawnPointSchema = z.object({
  id: z.string(),
  type: z.enum(['player', 'npc', 'enemy', 'boss', 'item', 'portal']),
  subtype: z.string().optional(),
  x: z.number(),
  y: z.number(),
  direction: DirectionSchema.optional().default('down'),
  properties: z.record(z.string(), z.any()).default({})
});
export type SpawnPoint = z.infer<typeof SpawnPointSchema>;

export const POILandmarkSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  icon: z.enum(['home', 'shop', 'dungeon', 'puzzle', 'hazard', 'boss', 'poi']).default('poi'),
  discoveryRadius: z.number().default(48)
});
export type POILandmark = z.infer<typeof POILandmarkSchema>;

export const MapLayerSchema = z.object({
  name: z.string(),
  zIndex: z.number().int(),
  visible: z.boolean().default(true),
  data: z.array(z.number().int()) // 1D flat array matching width * height
});
export type MapLayer = z.infer<typeof MapLayerSchema>;

export const MapDataSchema = z.object({
  version: z.number().int().default(1),
  name: z.string(),
  width: z.number().int().positive(), // in tiles
  height: z.number().int().positive(), // in tiles
  tileSize: z.number().int().positive().default(16),
  layers: z.array(MapLayerSchema),
  collisionGrid: z.array(z.number().int().min(0).max(1)), // 0 = walkable, 1 = solid
  spawnPoints: z.array(SpawnPointSchema).default([]),
  pois: z.array(POILandmarkSchema).default([])
});
export type MapData = z.infer<typeof MapDataSchema>;

// ==========================================
// 9. Emotes & Chat
// ==========================================
export const EmoteTypeSchema = z.enum([
  'heart',
  'exclamation',
  'question',
  'sweat',
  'wave',
  'music',
  'laugh',
  'sleep'
]);
export type EmoteType = z.infer<typeof EmoteTypeSchema>;

export const EmoteEventSchema = z.object({
  senderId: z.string(),
  emote: EmoteTypeSchema,
  timestamp: z.number()
});
export type EmoteEvent = z.infer<typeof EmoteEventSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  text: z.string().max(256),
  timestamp: z.number()
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
