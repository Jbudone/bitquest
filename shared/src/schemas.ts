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
  'stun',
  'cast',
  'fishing_cast',
  'fishing_wait',
  'fishing_reel',
  'ride'
]);
export type PlayerAnimState = z.infer<typeof PlayerAnimStateSchema>;

// ==========================================
// 1b. Spell & Magic Schemas
// ==========================================
export const SpellIdSchema = z.enum(['fireball', 'ice_lance', 'gale_ward']);
export type SpellId = z.infer<typeof SpellIdSchema>;

export const StatusEffectTypeSchema = z.enum(['burn', 'freeze', 'stun']);
export type StatusEffectType = z.infer<typeof StatusEffectTypeSchema>;

export const StatusEffectDataSchema = z.object({
  type: StatusEffectTypeSchema,
  expiresAt: z.number(),
  tickInterval: z.number().optional(),
  nextTickAt: z.number().optional(),
  damagePerTick: z.number().optional(),
  speedMultiplier: z.number().optional()
});
export type StatusEffectData = z.infer<typeof StatusEffectDataSchema>;

// ==========================================
// 1c. Equipment & Vanity Schemas
// ==========================================
export const EquipmentSlotSchema = z.enum(['weapon', 'offhand', 'armor', 'relic']);
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;

export const VanitySlotSchema = z.enum(['head', 'armor', 'weapon']);
export type VanitySlot = z.infer<typeof VanitySlotSchema>;

export const WeaponArchetypeSchema = z.enum(['sword', 'dagger', 'broadsword', 'staff', 'bow']);
export type WeaponArchetype = z.infer<typeof WeaponArchetypeSchema>;

// ==========================================
// 1d. Class Archetypes Schemas
// ==========================================
export const CharacterClassSchema = z.enum(['warrior', 'mage', 'bard', 'necromancer', 'archer']);
export type CharacterClass = z.infer<typeof CharacterClassSchema>;

export const ClassAbilitySchema = z.enum([
  'shield_parry',
  'stagger_cleave',
  'teleport_blink',
  'arcane_nova',
  'speed_fanfare',
  'harmony_chord',
  'raise_skeleton',
  'life_siphon',
  'piercing_arrow',
  'evasive_backhop'
]);
export type ClassAbility = z.infer<typeof ClassAbilitySchema>;

// ==========================================
// 2. Player Data Schema
// ==========================================
export const PlayerDataSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(32),
  color: z.string(),
  paletteIndex: z.number().int().nonnegative().default(0),
  classId: CharacterClassSchema.default('warrior'),
  x: z.number(),
  y: z.number(),
  direction: DirectionSchema,
  anim: PlayerAnimStateSchema,
  carryingItem: z.string().nullable().default(null),
  health: z.number().int().default(6),
  maxHealth: z.number().int().default(6),
  mana: z.number().int().default(50),
  maxMana: z.number().int().default(50),
  coins: z.number().int().nonnegative().default(0),
  acorns: z.number().int().nonnegative().default(0),
  activeEmote: z.string().nullable().optional(),
  emoteExpiresAt: z.number().optional(),
  equipment: z.object({
    weapon: z.string().nullable().default('sword_wood'),
    offhand: z.string().nullable().default(null),
    armor: z.string().nullable().default(null),
    relic: z.string().nullable().default(null)
  }).default({
    weapon: 'sword_wood',
    offhand: null,
    armor: null,
    relic: null
  }),
  vanity: z.object({
    head: z.string().nullable().default(null),
    armor: z.string().nullable().default(null),
    weapon: z.string().nullable().default(null)
  }).default({
    head: null,
    armor: null,
    weapon: null
  }),
  fishLog: z.record(z.string(), z.object({
    speciesId: z.string(),
    caughtCount: z.number().int(),
    maxSizeCm: z.number(),
    firstCaughtAt: z.number()
  })).default({}),
  inventory: z.array(z.string()).default(['Wooden Practice Stick']),
  mountedEntityId: z.string().nullable().default(null),
  petId: z.string().nullable().default(null)
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
  'minion',
  'trigger',
  'prop',
  'torch',
  'platform',
  'campfire',
  'merchant',
  'mount'
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
  'dagger_shadow',
  'sword_claymore',
  'staff_oak',
  'bow_recurve',
  'shield_wood',
  'shield_iron',
  'tome_arcane',
  'quiver_ranger',
  'armor_leather',
  'armor_plate',
  'armor_robe',
  'relic_heart',
  'relic_feather',
  'relic_moonstone',
  'relic_phoenix',
  'relic_sun_stone',
  'vanity_crown',
  'vanity_hat_wizard',
  'vanity_hood_ranger',
  'vanity_cape_hero',
  'vanity_armor_knight',
  'proj_arrow',
  'fishing_rod_bamboo',
  'fish_copper_minnow',
  'fish_glowing_perch',
  'fish_brook_trout',
  'fish_mossy_bass',
  'fish_shimmer_salmon',
  'fish_moonlit_catfish',
  'fish_golden_carp',
  'fish_spectral_koi',
  'sunken_chest',
  'waterlogged_boot'
]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

export const ItemCategorySchema = z.enum([
  'currency',
  'consumable',
  'quest',
  'key',
  'weapon',
  'offhand',
  'armor',
  'relic',
  'vanity',
  'tool',
  'fish',
  'treasure'
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
    durationMs: z.number().optional(),
    archetype: WeaponArchetypeSchema.optional(),
    slot: EquipmentSlotSchema.optional(),
    attackPower: z.number().optional(),
    attackSpeedMs: z.number().optional(),
    cleaveRadius: z.number().optional(),
    cleaveAngle: z.number().optional(),
    critChance: z.number().optional(),
    knockback: z.number().optional(),
    moveSpeedBonus: z.number().optional(),
    damageReductionPct: z.number().optional(),
    maxHealthBonus: z.number().optional(),
    maxManaBonus: z.number().optional(),
    manaCostReduction: z.number().optional(),
    isRanged: z.boolean().optional(),
    arrowSpeed: z.number().optional(),
    arrowRange: z.number().optional()
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

// ==========================================
// 10. Animation Keyframe & Hitbox/Hurtbox Schemas (Issue #29)
// ==========================================
export const BoxTypeSchema = z.enum(['hurtbox', 'hitbox', 'footprint']);
export type BoxType = z.infer<typeof BoxTypeSchema>;

export const BoundingBoxSchema = z.object({
  id: z.string(),
  type: BoxTypeSchema, // 'hurtbox' (green), 'hitbox' (red), 'footprint' (blue)
  x: z.number(), // relative to sprite top-left
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  damage: z.number().nonnegative().optional(), // for hitboxes
  knockback: z.number().nonnegative().optional() // for hitboxes
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const FrameEventAudioCueSchema = z.object({
  soundId: z.string(), // e.g. 'slash', 'hit', 'step', 'woosh', 'grunt'
  volume: z.number().min(0).max(1).default(1)
});
export type FrameEventAudioCue = z.infer<typeof FrameEventAudioCueSchema>;

export const FrameEventParticleCueSchema = z.object({
  particleType: z.string(), // e.g. 'slash_spark', 'dust_puff', 'sparkle', 'blood'
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  count: z.number().int().positive().default(1)
});
export type FrameEventParticleCue = z.infer<typeof FrameEventParticleCueSchema>;

export const AnimationKeyframeSchema = z.object({
  frameIndex: z.number().int().nonnegative(),
  durationMs: z.number().positive().default(100),
  boxes: z.array(BoundingBoxSchema).default([]),
  audioCues: z.array(FrameEventAudioCueSchema).default([]),
  particleCues: z.array(FrameEventParticleCueSchema).default([])
});
export type AnimationKeyframe = z.infer<typeof AnimationKeyframeSchema>;

export const AnimationMetadataSchema = z.object({
  id: z.string(), // e.g. 'player_slash_down', 'slime_bounce'
  targetId: z.string(), // e.g. 'player', 'slime'
  action: z.string(), // e.g. 'slash', 'walk', 'idle'
  direction: DirectionSchema.optional(),
  fps: z.number().positive().default(10),
  loop: z.boolean().default(true),
  frameWidth: z.number().positive().default(16),
  frameHeight: z.number().positive().default(16),
  totalFrames: z.number().int().positive().default(4),
  frames: z.array(AnimationKeyframeSchema)
});
export type AnimationMetadata = z.infer<typeof AnimationMetadataSchema>;

// ==========================================
// 11. Particle & Spell VFX Config Schemas (Issue #30)
// ==========================================
export const ParticleConfigSchema = z.object({
  id: z.string(), // e.g. 'fireball_flame', 'pot_dust'
  name: z.string(),
  blendMode: z.enum(['normal', 'additive', 'multiply']).default('additive'),
  colorStart: z.string(), // Hex color e.g. #f59e0b
  colorEnd: z.string(),   // Hex color e.g. #ef4444
  sizeStart: z.number().positive().default(4),
  sizeEnd: z.number().nonnegative().default(1),
  alphaStart: z.number().min(0).max(1).default(1),
  alphaEnd: z.number().min(0).max(1).default(0),
  speedMin: z.number().nonnegative().default(40),
  speedMax: z.number().nonnegative().default(120),
  angleMin: z.number().default(0), // degrees e.g. 0 to 360
  angleMax: z.number().default(360),
  gravityX: z.number().default(0),
  gravityY: z.number().default(80),
  lifeMin: z.number().positive().default(300), // ms
  lifeMax: z.number().positive().default(600),
  rate: z.number().nonnegative().default(30), // particles per sec (0 for burst only)
  burstCount: z.number().int().positive().default(15)
});
export type ParticleConfig = z.infer<typeof ParticleConfigSchema>;

// ==========================================
// 12. Save State & World State Schemas (Issue #31)
// ==========================================
export const SaveSnapshotPlayerSchema = z.object({
  name: z.string().default('Adventurer'),
  palette: z.number().int().default(0),
  x: z.number().default(1024),
  y: z.number().default(928),
  health: z.number().positive().default(3),
  maxHealth: z.number().positive().default(3),
  coins: z.number().nonnegative().default(0),
  acorns: z.number().nonnegative().default(0),
  inventory: z.array(z.string()).default([])
});
export type SaveSnapshotPlayer = z.infer<typeof SaveSnapshotPlayerSchema>;

export const SaveSnapshotQuestSchema = z.object({
  questId: z.string(),
  currentStageIndex: z.number().int().nonnegative().default(0),
  stageProgress: z.number().int().nonnegative().default(0),
  completed: z.boolean().default(false),
  completedAt: z.number().optional()
});
export type SaveSnapshotQuest = z.infer<typeof SaveSnapshotQuestSchema>;

export const SaveSnapshotSchema = z.object({
  id: z.string(),
  label: z.string(),
  timestamp: z.number(),
  player: SaveSnapshotPlayerSchema,
  quests: z.record(z.string(), SaveSnapshotQuestSchema).default({}),
  stats: z.record(z.string(), z.number()).default({}),
  worldFlags: z.array(z.string()).default([])
});
export type SaveSnapshot = z.infer<typeof SaveSnapshotSchema>;

export const WorldStatePresetSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  snapshot: SaveSnapshotSchema
});
export type WorldStatePreset = z.infer<typeof WorldStatePresetSchema>;


