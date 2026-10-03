import { 
  PlayerData, 
  EntityData, 
  Direction, 
  PlayerAnimState, 
  EmoteType, 
  ChatMessage, 
  EmoteEvent, 
  ItemDropData, 
  ServerPacket, 
  SpellId, 
  StatusEffectType,
  EquipmentSlot,
  VanitySlot,
  PlayerEquipment,
  PlayerVanity,
  AggregatedEquipmentStats,
  CharacterClassId,
  ClassAbilityId
} from '../../shared/src/types';
import { WorldDatabase } from './db';
import { STARTER_DIALOGUES } from '../../content/dialogues';
import { NavigationEngine, NavAgent } from '../../shared/src/navigation';
import { SpatialGrid } from '../../shared/src/spatialGrid';
import { BehaviorRegistry } from '../../shared/src/behaviors/registry';
import { SPELL_DEFINITIONS, StatusEffectManager } from '../../shared/src/magic';
import { EquipmentManager } from '../../shared/src/equipment';
import { ClassManager } from '../../shared/src/classes';
import { DUNGEON_CONSTANTS, MALAKOR_SPECS, DungeonManager, CATACOMBS_FLOORS, type DungeonFloorId } from '../../shared/src/dungeon';
import { FishingEngine, FISH_SPECIES, type FishSpecies, type PlayerFishLog } from '../../shared/src/fishing';
import { WeatherEngine, CAMPFIRES, type WeatherType, type WeatherState, type DayPhase, type CampfireDefinition } from '../../shared/src/weather';
import { ShopEngine, MERCHANTS, SHOP_ITEMS, type ShopItem, type MerchantDefinition, type CurrencyType } from '../../shared/src/shop';

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export class WorldManager {
  public db: WorldDatabase;
  public navEngine = new NavigationEngine();
  public spatialGrid = new SpatialGrid<EntityData>(2048, 5500, 128);
  public players = new Map<string, PlayerData>();
  public entities = new Map<string, EntityData>();
  public items = new Map<string, ItemDropData>();
  private nextEntityId = 1000;
  private bossCycle = 0;
  private malakorCycle = 0;
  private malakorTeleportTimer = 0;

  public onItemSpawned?: (item: ItemDropData) => void;
  public onItemCollected?: (itemId: string, collectorId: string, itemType: string, value: number) => void;
  public onPlayerStatsUpdated?: (player: PlayerData) => void;
  public onEntityStateChanged?: (entity: EntityData) => void;
  public onWorldFlagChanged?: (key: string, value: boolean) => void;
  public onBossEvent?: (event: ServerPacket) => void;
  public onSocialResonance?: (player1Id: string, player2Id: string, emote: EmoteType, x: number, y: number) => void;
  public onPotThrown?: (potId: string, throwerId: string, startX: number, startY: number, targetX: number, targetY: number, duration: number) => void;
  public onPotCaught?: (potId: string, catcherId: string, x: number, y: number) => void;
  public onSpellCast?: (casterId: string, spellId: SpellId, x: number, y: number, direction: Direction) => void;
  public onEquipmentUpdated?: (playerId: string, equipment: PlayerEquipment, vanity: PlayerVanity, stats: AggregatedEquipmentStats) => void;
  public onArrowShot?: (shooterId: string, x: number, y: number, direction: Direction, speed: number, range: number, damage: number) => void;
  public onClassUpdated?: (playerId: string, classId: CharacterClassId, stats: AggregatedEquipmentStats) => void;
  public onClassAbilityTriggered?: (playerId: string, abilityId: ClassAbilityId, x: number, y: number, direction: Direction, targetId?: string) => void;
  public onParryEvent?: (playerId: string, attackerId?: string, x?: number, y?: number) => void;
  public onLifeSiphonEvent?: (casterId: string, targetId: string, amount: number, casterHp: number) => void;
  public onMinionSpawned?: (minionId: string, ownerId: string, x: number, y: number, subtype: string) => void;
  public onDungeonTransition?: (playerId: string, floorId: 'f1' | 'f2' | 'overworld', x: number, y: number, title: string, subtitle: string) => void;
  public onTorchLitEvent?: (torchId: string, x: number, y: number, roomSolved?: boolean) => void;
  public onFishingStarted?: (playerId: string, startX: number, startY: number, targetX: number, targetY: number) => void;
  public onFishingBite?: (playerId: string, biteTime: number, speciesHint: string, sweetSpotWidth: number, pullResistance: number) => void;
  public onFishingTensionSync?: (playerId: string, tension: number, sweetSpotCenter: number, reelProgress: number) => void;
  public onFishingResolved?: (playerId: string, result: 'caught' | 'escaped' | 'snapped' | 'cancelled', speciesId?: string, sizeCm?: number, value?: number, isPersonalBest?: boolean) => void;
  public onFishLogSync?: (playerId: string, log: PlayerFishLog) => void;
  public onWeatherSync?: (weather: WeatherType, timeOfDaySec: number, transitionProgress: number, windAngle: number, windSpeed: number) => void;
  public onLightningStrike?: (x: number, y: number) => void;
  public onCampfireRest?: (playerId: string, campfireId: string, healedHp: number, restoredMana: number) => void;
  public onShopSync?: (playerId: string, merchantId: string, merchantName: string, merchantTitle: string, portrait: string, greeting: string, wares: ShopItem[], playerCoins: number, playerAcorns: number, inventory: string[]) => void;
  public onShopTransactionResult?: (playerId: string, success: boolean, message: string, newCoins: number, newAcorns: number, inventory: string[], wares?: ShopItem[]) => void;

  public weatherState: WeatherState = {
    current: 'clear',
    targetWeather: 'clear',
    transitionProgress: 0,
    nextChangeTime: Date.now() + 600000,
    windAngle: 0.785,
    windSpeed: 1.0,
    timeOfDaySec: 480 // 8:00 AM bright morning
  };
  private weatherSyncTimer = 0;

  public activeFishingSessions = new Map<string, {
    playerId: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    floor: string;
    species: FishSpecies;
    sizeCm: number;
    state: 'waiting' | 'bite' | 'reeling';
    castAt: number;
    biteAt: number;
    biteExpiresAt: number;
    tension: number;
    sweetSpotCenter: number;
    sweetSpotWidth: number;
    reelProgress: number;
    isHoldingReel: boolean;
    timeInMinigame: number;
  }>();

  public flyingPots = new Map<string, {
    potId: string;
    throwerId: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    startTime: number;
    duration: number;
  }>();

  constructor() {
    this.db = new WorldDatabase();
    this.navEngine.setGateOpened(this.db.getFlag('ancient_gate_opened'));
    this.initDefaultEntities();
    this.startRespawnLoop();
    this.startAiLoop();
    this.startProjectileLoop();
    this.startFishingLoop();
    this.startWeatherAndCircadianLoop();
  }

  private initDefaultEntities() {
    // 1. Cozy Town Square & Whispering Meadow Bushes (cuttable)
    const bushPositions = [
      // Town Square garden patches
      { x: 920, y: 880 }, { x: 952, y: 880 }, { x: 920, y: 912 }, { x: 952, y: 912 },
      { x: 1096, y: 880 }, { x: 1128, y: 880 }, { x: 1096, y: 912 }, { x: 1128, y: 912 },
      // Meadow strawberry patches (East)
      { x: 1480, y: 760 }, { x: 1512, y: 760 }, { x: 1544, y: 760 },
      { x: 1650, y: 860 }, { x: 1682, y: 860 }, { x: 1714, y: 860 },
      { x: 1560, y: 1020 }, { x: 1592, y: 1020 },
      // Fungal Hollow blackberry bushes (West)
      { x: 340, y: 820 }, { x: 372, y: 820 }, { x: 480, y: 960 }, { x: 512, y: 960 }
    ];
    bushPositions.forEach((pos, idx) => {
      const id = `bush_${idx + 1}`;
      this.entities.set(id, {
        id,
        type: 'bush',
        x: pos.x,
        y: pos.y,
        interactable: true,
        state: { destroyed: false }
      });
    });

    // 2. Liftable & Tossable Clay Pots (Zelda style!)
    const potPositions = [
      // Town Square near cottages
      { x: 830, y: 850 }, { x: 855, y: 850 },
      { x: 1195, y: 850 }, { x: 1220, y: 850 },
      { x: 1000, y: 970 }, { x: 1048, y: 970 },
      // Near Sunken Gate (for solo puzzle solving!)
      { x: 930, y: 600 }, { x: 1118, y: 600 },
      // In Fungal Hollow & Ruins
      { x: 380, y: 890 }, { x: 440, y: 940 },
      { x: 960, y: 340 }, { x: 1088, y: 340 }
    ];
    potPositions.forEach((pos, idx) => {
      const id = `pot_${idx + 1}`;
      this.entities.set(id, {
        id,
        type: 'pot',
        x: pos.x,
        y: pos.y,
        interactable: true,
        state: { destroyed: false, heldBy: null }
      });
    });

    // 3. Co-op Puzzle: Twin Sun Stones & Ancient Moss Gate
    this.entities.set('switch_sun_left', {
      id: 'switch_sun_left',
      type: 'switch',
      x: 960,
      y: 560,
      name: 'Left Sun Stone',
      interactable: true,
      state: { activated: false }
    });

    this.entities.set('switch_sun_right', {
      id: 'switch_sun_right',
      type: 'switch',
      x: 1088,
      y: 560,
      name: 'Right Sun Stone',
      interactable: true,
      state: { activated: false }
    });

    this.entities.set('ancient_gate', {
      id: 'ancient_gate',
      type: 'door',
      x: 1024,
      y: 512,
      name: 'Sunken Gate',
      interactable: false,
      state: { opened: this.db.getFlag('ancient_gate_opened') }
    });

    // 3b. Heavy Pushable Ancient Stone Blocks
    this.entities.set('block_ruins_1', {
      id: 'block_ruins_1',
      type: 'block',
      name: 'Sun-Carved Rune Block',
      x: 920,
      y: 600,
      interactable: true,
      state: {}
    });

    this.entities.set('block_ruins_2', {
      id: 'block_ruins_2',
      type: 'block',
      name: 'Moon-Carved Rune Block',
      x: 1128,
      y: 600,
      interactable: true,
      state: {}
    });

    // 3b. Co-Op Ancient Duo Levers & Ruined Vault Chest
    const duoUnlocked = this.db.getFlag('duo_vault_unlocked') || false;
    this.entities.set('lever_duo_left', {
      id: 'lever_duo_left',
      type: 'switch',
      x: 880,
      y: 440,
      name: 'Ancient Duo Lever (West)',
      interactable: true,
      state: { activated: false, solved: duoUnlocked }
    });

    this.entities.set('lever_duo_right', {
      id: 'lever_duo_right',
      type: 'switch',
      x: 1168,
      y: 440,
      name: 'Ancient Duo Lever (East)',
      interactable: true,
      state: { activated: false, solved: duoUnlocked }
    });

    this.entities.set('chest_duo_vault', {
      id: 'chest_duo_vault',
      type: 'chest',
      x: 1024,
      y: 430,
      name: 'Co-Op Ruin Vault Chest',
      interactable: duoUnlocked,
      state: { opened: false, locked: !duoUnlocked }
    });

    // 4. Notice Boards & Signs
    this.entities.set('sign_square', {
      id: 'sign_square',
      type: 'sign',
      x: 1024,
      y: 870,
      name: 'Town Notice Board',
      interactable: true,
      state: { dialogueKey: 'sign_square' }
    });

    this.entities.set('sign_ruins', {
      id: 'sign_ruins',
      type: 'sign',
      x: 1024,
      y: 600,
      name: 'Ancient Inscription',
      interactable: true,
      state: { dialogueKey: 'sign_ruins' }
    });

    // 5. Living NPCs in Town Square
    this.entities.set('npc_barnaby', {
      id: 'npc_barnaby',
      type: 'npc',
      subtype: 'barnaby',
      name: 'Barnaby the Pelican',
      x: 800,
      y: 870,
      interactable: true,
      state: { dialogueKey: 'barnaby', direction: 'down' }
    });

    this.entities.set('npc_grandma', {
      id: 'npc_grandma',
      type: 'npc',
      subtype: 'grandma',
      name: 'Grandma Bramble',
      x: 1248,
      y: 870,
      interactable: true,
      state: { dialogueKey: 'grandma', direction: 'left' }
    });

    this.entities.set('npc_reinald', {
      id: 'npc_reinald',
      type: 'npc',
      subtype: 'rooster',
      name: 'Sir Reginald',
      x: 1024,
      y: 1030,
      interactable: true,
      state: { dialogueKey: 'sir_reginald', direction: 'right' }
    });

    // 5b. Merchants & Wandering Traders (Task 7.7)
    const pipDef = MERCHANTS.merchant_pip!;
    this.entities.set(pipDef.id, {
      id: pipDef.id,
      type: 'merchant',
      subtype: 'pip',
      name: pipDef.name,
      x: pipDef.x,
      y: pipDef.y,
      interactable: true,
      state: { merchantId: pipDef.id, direction: 'down' }
    });

    const corvusDef = MERCHANTS.merchant_corvus!;
    const corvusPos = ShopEngine.getWanderingTraderPosition(this.weatherState.timeOfDaySec);
    this.entities.set(corvusDef.id, {
      id: corvusDef.id,
      type: 'merchant',
      subtype: 'corvus',
      name: corvusDef.name,
      x: corvusPos.x,
      y: corvusPos.y,
      interactable: true,
      state: { merchantId: corvusDef.id, direction: 'down', campfireId: corvusPos.campfireId }
    });

    // 6. Cute Wildlife in South Lake & Plaza
    this.entities.set('wildlife_buster', {
      id: 'wildlife_buster',
      type: 'wildlife',
      subtype: 'dog',
      name: 'Buster',
      x: 1080,
      y: 1180,
      interactable: true,
      state: { dialogueKey: 'dog_buster', direction: 'down', petCount: 0, behavior: 'idle', behaviorTimer: 0 }
    });

    this.entities.set('wildlife_duck_1', {
      id: 'wildlife_duck_1',
      type: 'wildlife',
      subtype: 'duck',
      name: 'Puddle Duck',
      x: 980,
      y: 1320,
      interactable: true,
      state: { direction: 'down' }
    });

    this.entities.set('wildlife_duck_2', {
      id: 'wildlife_duck_2',
      type: 'wildlife',
      subtype: 'duck',
      name: 'Quackers',
      x: 1060,
      y: 1360,
      interactable: true,
      state: { direction: 'left' }
    });

    // 7. Ancient Sanctuary Pillars (North Ruins)
    const pillars = [
      { id: 'pillar_1', x: 928, y: 220 },
      { id: 'pillar_2', x: 1120, y: 220 },
      { id: 'pillar_3', x: 928, y: 380 },
      { id: 'pillar_4', x: 1120, y: 380 }
    ];
    pillars.forEach(p => {
      this.entities.set(p.id, {
        id: p.id,
        type: 'switch', // static obstacle/prop
        subtype: 'pillar',
        x: p.x,
        y: p.y,
        interactable: false,
        state: {}
      });
    });

    // 8. Giant Bioluminescent Mushrooms (Fungal Hollow)
    const mushrooms = [
      { id: 'giant_mush_1', x: 240, y: 740 },
      { id: 'giant_mush_2', x: 540, y: 720 },
      { id: 'giant_mush_3', x: 260, y: 1120 },
      { id: 'giant_mush_4', x: 520, y: 1160 }
    ];
    mushrooms.forEach(m => {
      this.entities.set(m.id, {
        id: m.id,
        type: 'switch',
        subtype: 'mushroom_giant',
        x: m.x,
        y: m.y,
        interactable: false,
        state: {}
      });
    });

    // 9. Cute Enemies: Sproutlings (Whispering Meadow)
    const sproutlings = [
      { id: 'enemy_sprout_1', x: 1480, y: 740 },
      { id: 'enemy_sprout_2', x: 1620, y: 820 },
      { id: 'enemy_sprout_3', x: 1540, y: 960 },
      { id: 'enemy_sprout_4', x: 1720, y: 1040 }
    ];
    sproutlings.forEach(s => {
      this.entities.set(s.id, {
        id: s.id,
        type: 'enemy',
        subtype: 'sproutling',
        name: 'Sproutling',
        x: s.x,
        y: s.y,
        interactable: true,
        state: { hp: 2, maxHp: 2, homeX: s.x, homeY: s.y, destroyed: false }
      });
    });

    // 10. Cute Enemies: Grumble Shrooms (Fungal Hollow)
    const grumbles = [
      { id: 'enemy_grumble_1', x: 340, y: 780 },
      { id: 'enemy_grumble_2', x: 480, y: 860 },
      { id: 'enemy_grumble_3', x: 280, y: 980 },
      { id: 'enemy_grumble_4', x: 420, y: 1100 }
    ];
    grumbles.forEach(g => {
      this.entities.set(g.id, {
        id: g.id,
        type: 'enemy',
        subtype: 'grumble',
        name: 'Grumble Shroom',
        x: g.x,
        y: g.y,
        interactable: true,
        state: { hp: 3, maxHp: 3, homeX: g.x, homeY: g.y, destroyed: false }
      });
    });

    // 11. Boss: Baron von Truffle 👑 (Sunken Ruins Sanctuary)
    this.entities.set('boss_baron', {
      id: 'boss_baron',
      type: 'boss',
      subtype: 'boss_baron',
      name: 'Baron von Truffle',
      x: 1024,
      y: 280,
      interactable: true,
      state: { hp: 12, maxHp: 12, state: 'idle', homeX: 1024, homeY: 280, destroyed: false, dialogueKey: 'baron_truffle' }
    });

    // 12. Barnaby's Lost Postal Letters (Quest Drops)
    const lostLetters = [
      { id: 'letter_meadow', x: 1720, y: 840 },
      { id: 'letter_hollow', x: 320, y: 920 },
      { id: 'letter_lake', x: 880, y: 1300 }
    ];
    lostLetters.forEach(l => {
      this.items.set(l.id, {
        id: l.id,
        itemType: 'letter',
        x: l.x,
        y: l.y,
        value: 1
      });
    });

    // 13. The Sunken Catacombs Subterranean Dungeon (Issue #22: Task 7.4)
    // 13a. Overworld Entrance in Ruins Sanctuary
    this.entities.set('stairs_catacombs_entrance', {
      id: 'stairs_catacombs_entrance',
      type: 'trigger',
      subtype: 'stairs_down',
      name: 'Catacombs Crypt Entrance',
      x: DUNGEON_CONSTANTS.OVERWORLD_ENTRANCE.x,
      y: DUNGEON_CONSTANTS.OVERWORLD_ENTRANCE.y,
      interactable: true,
      state: { targetFloor: 'f1' }
    });

    // 13b. Floor 1: The Forgotten Crypts
    this.entities.set('stairs_f1_to_overworld', {
      id: 'stairs_f1_to_overworld',
      type: 'trigger',
      subtype: 'stairs_up',
      name: 'Ascending Crypt Stairs',
      x: DUNGEON_CONSTANTS.F1_STAIRS_UP.x,
      y: DUNGEON_CONSTANTS.F1_STAIRS_UP.y,
      interactable: true,
      state: { targetFloor: 'overworld' }
    });

    DUNGEON_CONSTANTS.F1_TORCHES.forEach(t => {
      this.entities.set(t.id, {
        id: t.id,
        type: 'torch',
        subtype: 'crypt_torch',
        name: 'Crypt Sconce Torch',
        x: t.x,
        y: t.y,
        interactable: true,
        state: { lit: false }
      });
    });

    this.entities.set(DUNGEON_CONSTANTS.F1_GATE.id, {
      id: DUNGEON_CONSTANTS.F1_GATE.id,
      type: 'door',
      subtype: 'iron_gate',
      name: 'Forgotten Crypt Iron Gate',
      x: DUNGEON_CONSTANTS.F1_GATE.x,
      y: DUNGEON_CONSTANTS.F1_GATE.y,
      interactable: false,
      state: { opened: false }
    });

    this.entities.set(DUNGEON_CONSTANTS.F1_PLATFORM.id, {
      id: DUNGEON_CONSTANTS.F1_PLATFORM.id,
      type: 'platform',
      subtype: 'stone_platform',
      name: 'Abyssal Chasm Platform',
      x: DUNGEON_CONSTANTS.F1_PLATFORM.minX,
      y: DUNGEON_CONSTANTS.F1_PLATFORM.y,
      interactable: false,
      state: { moving: true }
    });

    const f1Skeletons = [
      { id: 'enemy_skel_f1_1', x: 960, y: 2500 },
      { id: 'enemy_skel_f1_2', x: 1088, y: 2500 },
      { id: 'enemy_skel_f1_3', x: 1024, y: 3260 }
    ];
    f1Skeletons.forEach(s => {
      this.entities.set(s.id, {
        id: s.id,
        type: 'enemy',
        subtype: 'skeleton',
        name: 'Crypt Skeleton',
        x: s.x,
        y: s.y,
        interactable: true,
        state: { hp: 4, maxHp: 4, homeX: s.x, homeY: s.y, destroyed: false }
      });
    });

    this.entities.set(DUNGEON_CONSTANTS.F1_STAIRS_DOWN.id, {
      id: DUNGEON_CONSTANTS.F1_STAIRS_DOWN.id,
      type: 'trigger',
      subtype: 'stairs_down',
      name: 'Abyssal Descent Stairs',
      x: DUNGEON_CONSTANTS.F1_STAIRS_DOWN.x,
      y: DUNGEON_CONSTANTS.F1_STAIRS_DOWN.y,
      interactable: true,
      state: { targetFloor: 'f2' }
    });

    // 13c. Floor 2: The Abyssal Sanctuary
    this.entities.set(DUNGEON_CONSTANTS.F2_STAIRS_UP.id, {
      id: DUNGEON_CONSTANTS.F2_STAIRS_UP.id,
      type: 'trigger',
      subtype: 'stairs_up',
      name: 'Crypt Ascent Stairs',
      x: DUNGEON_CONSTANTS.F2_STAIRS_UP.x,
      y: DUNGEON_CONSTANTS.F2_STAIRS_UP.y,
      interactable: true,
      state: { targetFloor: 'f1' }
    });

    DUNGEON_CONSTANTS.F2_TORCHES.forEach(t => {
      this.entities.set(t.id, {
        id: t.id,
        type: 'torch',
        subtype: 'crypt_torch',
        name: 'Sanctuary Ward Torch',
        x: t.x,
        y: t.y,
        interactable: true,
        state: { lit: true }
      });
    });

    this.entities.set(MALAKOR_SPECS.id, {
      id: MALAKOR_SPECS.id,
      type: 'boss',
      subtype: 'boss_malakor',
      name: MALAKOR_SPECS.name,
      x: DUNGEON_CONSTANTS.F2_BOSS_SPAWN.x,
      y: DUNGEON_CONSTANTS.F2_BOSS_SPAWN.y,
      interactable: true,
      state: {
        hp: MALAKOR_SPECS.maxHp,
        maxHp: MALAKOR_SPECS.maxHp,
        phase: 1,
        shroudActive: false,
        phase2Triggered: false,
        homeX: DUNGEON_CONSTANTS.F2_BOSS_SPAWN.x,
        homeY: DUNGEON_CONSTANTS.F2_BOSS_SPAWN.y,
        destroyed: false
      }
    });

    this.entities.set(DUNGEON_CONSTANTS.F2_RELIC_CHEST.id, {
      id: DUNGEON_CONSTANTS.F2_RELIC_CHEST.id,
      type: 'chest',
      subtype: 'relic_chest',
      name: 'Malakor’s Relic Chest',
      x: DUNGEON_CONSTANTS.F2_RELIC_CHEST.x,
      y: DUNGEON_CONSTANTS.F2_RELIC_CHEST.y,
      interactable: false,
      state: { opened: false, locked: true, active: false }
    });

    this.entities.set(DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id, {
      id: DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id,
      type: 'trigger',
      subtype: 'portal',
      name: 'Radiant Sanctuary Portal',
      x: DUNGEON_CONSTANTS.F2_EXIT_PORTAL.x,
      y: DUNGEON_CONSTANTS.F2_EXIT_PORTAL.y,
      interactable: false,
      state: { active: false, targetFloor: 'overworld' }
    });

    // 14. Cozy Restful Campfires (Task 7.6 / Issue #24)
    CAMPFIRES.forEach(c => {
      this.entities.set(c.id, {
        id: c.id,
        type: 'campfire',
        subtype: 'wood_campfire',
        name: c.name,
        x: c.x,
        y: c.y,
        interactable: true,
        state: { lit: true, warmthRadius: c.warmthRadius }
      });
    });

    // Index all world entities into the spatial partitioning grid
    for (const ent of this.entities.values()) {
      this.spatialGrid.insert(ent);
    }
  }

  private startProjectileLoop() {
    setInterval(() => {
      const now = Date.now();
      // 1. Process airborne pots
      for (const [potId, fp] of this.flyingPots.entries()) {
        const p = (now - fp.startTime) / fp.duration;
        if (p >= 1) {
          this.flyingPots.delete(potId);
          this.impactPot(potId, fp.targetX, fp.targetY);
        }
      }

      // 2. Process duo lever timers
      for (const leverId of ['lever_duo_left', 'lever_duo_right']) {
        const lever = this.entities.get(leverId);
        if (lever && lever.state.activated && !lever.state.solved && lever.state.timerExpires && now > lever.state.timerExpires) {
          lever.state.activated = false;
          this.onEntityStateChanged?.(lever);
        }
      }
    }, 40);
  }

  public throwPot(playerId: string, potId: string, startX: number, startY: number, targetX: number, targetY: number) {
    const pot = this.entities.get(potId);
    if (!pot) return;
    const player = this.players.get(playerId);
    if (player) {
      player.carryingItem = null;
    }
    pot.state.heldBy = null;
    const duration = 380;
    this.flyingPots.set(potId, {
      potId,
      throwerId: playerId,
      startX,
      startY,
      targetX,
      targetY,
      startTime: Date.now(),
      duration
    });
    this.onPotThrown?.(potId, playerId, startX, startY, targetX, targetY, duration);
  }

  public catchPot(playerId: string, potId: string): boolean {
    const fp = this.flyingPots.get(potId);
    if (!fp) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    // Check catch proximity
    const now = Date.now();
    const p = Math.min(1, (now - fp.startTime) / fp.duration);
    const currX = fp.startX + (fp.targetX - fp.startX) * p;
    const currY = fp.startY + (fp.targetY - fp.startY) * p;
    const dist = Math.hypot(player.x - currX, player.y - currY);

    if (dist > 56) return false;

    this.flyingPots.delete(potId);
    const pot = this.entities.get(potId);
    if (pot) {
      pot.state.heldBy = playerId;
      pot.state.destroyed = false;
      pot.x = player.x;
      pot.y = player.y;
      this.onEntityStateChanged?.(pot);
    }
    player.carryingItem = potId;
    this.onPotCaught?.(potId, playerId, player.x, player.y);
    return true;
  }

  public impactPot(potId: string, targetX: number, targetY: number) {
    const pot = this.entities.get(potId);
    if (!pot) return;
    pot.state.heldBy = null;
    pot.state.destroyed = true;
    pot.state.respawnAt = Date.now() + 20000;
    pot.x = targetX;
    pot.y = targetY;
    this.onEntityStateChanged?.(pot);
    this.checkPressureSwitches();

    // Check if pot hit an enemy or boss (deals 2 damage)
    for (const entity of this.entities.values()) {
      if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
        const dist = Math.hypot(targetX - entity.x, targetY - entity.y);
        if (dist < 36) {
          this.handleInteract('system', entity.id, 'hit_enemy', undefined, undefined, 2);
        }
      }
    }

    if (Math.random() < 0.6) {
      const item: ItemDropData = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemType: Math.random() < 0.3 ? 'strawberry' : 'coin',
        x: targetX,
        y: targetY,
        value: 1
      };
      this.items.set(item.id, item);
      this.onItemSpawned?.(item);
    }
  }

  // ==========================================
  // Cozy Bobber Fishing Engine (Issue #23)
  // ==========================================
  private startFishingLoop() {
    let lastTick = Date.now();
    setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;

      for (const [playerId, session] of this.activeFishingSessions.entries()) {
        const player = this.players.get(playerId);
        if (!player || player.health <= 0) {
          this.cancelFishing(playerId, 'cancelled');
          continue;
        }

        if (session.state === 'waiting') {
          if (now >= session.biteAt) {
            session.state = 'bite';
            session.biteExpiresAt = now + 1800; // 1.8s bite reaction window
            this.onFishingBite?.(
              playerId,
              session.biteAt,
              session.species.name,
              session.species.sweetSpotWidthPct,
              session.species.pullResistance
            );
          }
        } else if (session.state === 'bite') {
          if (now >= session.biteExpiresAt) {
            // Fish got away
            this.cancelFishing(playerId, 'escaped');
          }
        } else if (session.state === 'reeling') {
          const res = FishingEngine.updateTensionStep(dt, session, session.isHoldingReel);
          this.onFishingTensionSync?.(playerId, res.tension, res.sweetSpotCenter, res.reelProgress);

          if (res.snapped) {
            this.cancelFishing(playerId, 'snapped');
          } else if (res.escaped) {
            this.cancelFishing(playerId, 'escaped');
          } else if (res.caught) {
            this.resolveFishingCatch(playerId, session);
          }
        }
      }
    }, 50); // 20Hz loop
  }

  public startFishing(playerId: string, targetX: number, targetY: number): boolean {
    const player = this.players.get(playerId);
    if (!player || player.health <= 0) return false;

    // Check distance between player and target water (28px to 160px)
    const dist = Math.hypot(targetX - player.x, targetY - player.y);
    if (dist < FishingEngine.MIN_CAST_DISTANCE || dist > FishingEngine.MAX_CAST_DISTANCE) {
      return false;
    }

    const floor = DungeonManager.getFloorFromY(player.y);
    if (!FishingEngine.isWaterPixel(targetX, targetY, floor)) {
      return false;
    }

    const biome = FishingEngine.getWaterBiome(targetX, targetY, floor);
    const isPier = FishingEngine.isPierHotspot(targetX, targetY);
    const species = FishingEngine.rollFish(biome, isPier);
    const sizeCm = FishingEngine.rollFishSize(species);

    const now = Date.now();
    const biteDelayMs = 2000 + Math.floor(Math.random() * 2500);

    const session = {
      playerId,
      startX: player.x,
      startY: player.y,
      targetX,
      targetY,
      floor,
      species,
      sizeCm,
      state: 'waiting' as const,
      castAt: now,
      biteAt: now + biteDelayMs,
      biteExpiresAt: 0,
      tension: 0.50,
      sweetSpotCenter: 0.50,
      sweetSpotWidth: species.sweetSpotWidthPct,
      reelProgress: 0.15,
      isHoldingReel: false,
      timeInMinigame: 0
    };

    this.activeFishingSessions.set(playerId, session);
    player.anim = 'fishing_cast';
    this.onFishingStarted?.(playerId, player.x, player.y, targetX, targetY);
    return true;
  }

  public reelFishing(playerId: string, isHolding: boolean) {
    const session = this.activeFishingSessions.get(playerId);
    if (!session) return;
    const player = this.players.get(playerId);

    if (session.state === 'bite') {
      // Hook the bite!
      session.state = 'reeling';
      session.isHoldingReel = isHolding;
      session.timeInMinigame = 0;
      session.tension = 0.50;
      if (player) player.anim = 'fishing_reel';
    } else if (session.state === 'reeling') {
      session.isHoldingReel = isHolding;
    }
  }

  public cancelFishing(playerId: string, reason: 'caught' | 'escaped' | 'snapped' | 'cancelled' = 'cancelled') {
    const session = this.activeFishingSessions.get(playerId);
    if (!session) return;
    this.activeFishingSessions.delete(playerId);
    const player = this.players.get(playerId);
    if (player) {
      player.anim = 'idle';
    }
    this.onFishingResolved?.(playerId, reason);
  }

  private resolveFishingCatch(playerId: string, session: any) {
    this.activeFishingSessions.delete(playerId);
    const player = this.players.get(playerId);
    if (!player) return;

    player.anim = 'idle';

    if (session.species.isTreasure && session.species.id === 'sunken_chest') {
      // Sunken treasure chest: awards coins and spawns loot
      const coinReward = 60 + Math.floor(Math.random() * 40);
      player.coins = (player.coins || 0) + coinReward;
      for (let i = 0; i < 4; i++) {
        const item: ItemDropData = {
          id: `item_sunken_${Date.now()}_${i}`,
          itemType: i === 0 ? 'acorn' : 'coin',
          x: player.x + (i - 1.5) * 16,
          y: player.y + 16,
          value: i === 0 ? 5 : 10
        };
        this.items.set(item.id, item);
        this.onItemSpawned?.(item);
      }
      this.onFishingResolved?.(playerId, 'caught', session.species.id, session.sizeCm, coinReward, true);
    } else {
      // Normal fish or boot catch
      const value = session.species.baseValue;
      player.coins = (player.coins || 0) + value;

      if (!player.fishLog) player.fishLog = {};
      const { isPersonalBest } = FishingEngine.recordCatchInLog(player.fishLog, session.species.id, session.sizeCm);
      this.db.saveFishLog(playerId, player.fishLog);

      const dropType = session.species.id === 'waterlogged_boot' ? 'waterlogged_boot' : `fish_${session.species.id}`;
      const item: ItemDropData = {
        id: `item_catch_${Date.now()}`,
        itemType: dropType,
        x: player.x,
        y: player.y + 12,
        value
      };
      this.items.set(item.id, item);
      this.onItemSpawned?.(item);

      this.onFishingResolved?.(playerId, 'caught', session.species.id, session.sizeCm, value, isPersonalBest);
      this.onFishLogSync?.(playerId, player.fishLog);
    }

    this.onPlayerStatsUpdated?.(player);
  }

  // ==========================================
  // Dynamic Day/Night Cycle, Weather & Campfires (Task 7.6 / Issue #24)
  // ==========================================
  private startWeatherAndCircadianLoop() {
    let lastTick = Date.now();
    setInterval(() => {
      const now = Date.now();
      const dt = Math.min(2.0, (now - lastTick) / 1000);
      lastTick = now;

      // 1. Advance weather & circadian simulation
      const { weatherChanged, lightningTriggered } = WeatherEngine.updateWeatherStep(
        dt,
        this.weatherState,
        now
      );

      // 2. Broadcast lightning strike if triggered during thunderstorms
      if (lightningTriggered) {
        const players = Array.from(this.players.values());
        let strikeX = 1024 + (Math.random() * 400 - 200);
        let strikeY = 896 + (Math.random() * 400 - 200);
        if (players.length > 0) {
          const p = players[Math.floor(Math.random() * players.length)]!;
          strikeX = p.x + (Math.random() * 240 - 120);
          strikeY = p.y + (Math.random() * 240 - 120);
        }
        this.onLightningStrike?.(strikeX, strikeY);
      }

      // 3. Campfire Restful Warmth & Healing Loop
      this.tickCampfireResting();

      // 4. Update Wandering Trader campsite position
      const corvusEnt = this.entities.get('merchant_corvus');
      if (corvusEnt) {
        const nextPos = ShopEngine.getWanderingTraderPosition(this.weatherState.timeOfDaySec);
        if (corvusEnt.x !== nextPos.x || corvusEnt.y !== nextPos.y) {
          corvusEnt.x = nextPos.x;
          corvusEnt.y = nextPos.y;
          corvusEnt.state.campfireId = nextPos.campfireId;
          this.spatialGrid.update(corvusEnt);
          this.onEntityStateChanged?.(corvusEnt);
        }
      }

      // 5. Periodic Weather Sync (every 3 seconds or immediately on weather change)
      this.weatherSyncTimer += dt;
      if (weatherChanged || this.weatherSyncTimer >= 3.0) {
        this.weatherSyncTimer = 0;
        this.onWeatherSync?.(
          this.weatherState.current,
          this.weatherState.timeOfDaySec,
          this.weatherState.transitionProgress,
          this.weatherState.windAngle,
          this.weatherState.windSpeed
        );
      }
    }, 1000);
  }

  public setWeather(weather: WeatherType) {
    this.weatherState.current = weather;
    this.weatherState.targetWeather = weather;
    this.weatherState.transitionProgress = 0.0;
    this.weatherState.nextChangeTime = Date.now() + WeatherEngine.rollWeatherDuration(weather);
    this.onWeatherSync?.(
      this.weatherState.current,
      this.weatherState.timeOfDaySec,
      this.weatherState.transitionProgress,
      this.weatherState.windAngle,
      this.weatherState.windSpeed
    );
  }

  public setTimeOfDay(hour: number) {
    const normalizedHour = ((hour % 24) + 24) % 24;
    this.weatherState.timeOfDaySec = normalizedHour * WeatherEngine.SECONDS_PER_GAME_HOUR;
    
    // Reposition wandering trader immediately on time override
    const corvusEnt = this.entities.get('merchant_corvus');
    if (corvusEnt) {
      const nextPos = ShopEngine.getWanderingTraderPosition(this.weatherState.timeOfDaySec);
      if (corvusEnt.x !== nextPos.x || corvusEnt.y !== nextPos.y) {
        corvusEnt.x = nextPos.x;
        corvusEnt.y = nextPos.y;
        corvusEnt.state.campfireId = nextPos.campfireId;
        this.spatialGrid.update(corvusEnt);
        this.onEntityStateChanged?.(corvusEnt);
      }
    }

    this.onWeatherSync?.(
      this.weatherState.current,
      this.weatherState.timeOfDaySec,
      this.weatherState.transitionProgress,
      this.weatherState.windAngle,
      this.weatherState.windSpeed
    );
  }

  public getWeather(): WeatherType {
    return this.weatherState.current;
  }

  public getTimeOfDaySec(): number {
    return this.weatherState.timeOfDaySec;
  }

  public tickCampfireResting() {
    for (const player of this.players.values()) {
      if (player.health >= player.maxHealth && player.mana >= player.maxMana) continue;
      const campfire = WeatherEngine.getNearestCampfire(player.x, player.y, 56);
      if (campfire) {
        const ent = this.entities.get(campfire.id);
        if (!ent || ent.state.lit === false) continue;

        const isSitting = player.anim === 'sit';
        const healHp = isSitting ? campfire.hpPerTick * 2 : campfire.hpPerTick;
        const restoreMp = isSitting ? campfire.mpPerTick * 2 : campfire.mpPerTick;

        const oldHp = player.health;
        const oldMp = player.mana;
        player.health = Math.min(player.maxHealth, player.health + healHp);
        player.mana = Math.min(player.maxMana, player.mana + restoreMp);

        if (player.health !== oldHp || player.mana !== oldMp) {
          const actualHeal = player.health - oldHp;
          const actualMp = player.mana - oldMp;
          this.onCampfireRest?.(player.id, campfire.id, actualHeal, actualMp);
          this.onPlayerStatsUpdated?.(player);
        }
      }
    }
  }

  public openShop(playerId: string, merchantId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    const merchant = MERCHANTS[merchantId];
    if (!merchant) return;

    // Proximity check (<= 120px)
    const ent = this.entities.get(merchantId);
    if (ent) {
      const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
      if (dist > 120) return;
    }

    const wares = ShopEngine.getActiveMerchantWares(merchantId, this.weatherState.timeOfDaySec);
    const inventory = (player as any).inventory || ['Wooden Practice Stick'];
    this.onShopSync?.(
      playerId,
      merchant.id,
      merchant.name,
      merchant.title,
      merchant.portrait,
      merchant.greeting,
      wares,
      player.coins || 0,
      player.acorns || 0,
      inventory
    );
  }

  public buyShopItem(playerId: string, merchantId: string, itemId: string, quantity: number = 1) {
    const player = this.players.get(playerId);
    if (!player) return;
    const merchant = MERCHANTS[merchantId];
    if (!merchant) return;

    // Validate distance
    const ent = this.entities.get(merchantId);
    if (ent) {
      const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
      if (dist > 120) {
        this.onShopTransactionResult?.(
          playerId,
          false,
          'Too far from merchant',
          player.coins || 0,
          player.acorns || 0,
          (player as any).inventory || []
        );
        return;
      }
    }

    const validation = ShopEngine.validateBuy(player, merchantId, itemId, quantity, this.weatherState.timeOfDaySec);
    if (!validation.valid || !validation.item || validation.totalCost === undefined) {
      this.onShopTransactionResult?.(
        playerId,
        false,
        validation.reason || 'Transaction could not be completed',
        player.coins || 0,
        player.acorns || 0,
        (player as any).inventory || []
      );
      return;
    }

    const item = validation.item;
    const totalCost = validation.totalCost;

    // Deduct cost
    if (item.currency === 'acorn') {
      player.acorns = Math.max(0, (player.acorns || 0) - totalCost);
    } else {
      player.coins = Math.max(0, (player.coins || 0) - totalCost);
    }

    // Add purchased items to player inventory
    if (!(player as any).inventory) {
      (player as any).inventory = ['Wooden Practice Stick'];
    }
    for (let i = 0; i < quantity; i++) {
      (player as any).inventory.push(item.name);
    }

    // If consumable item with immediate healing/mana, can be consumed
    if (item.consumableEffect) {
      if (item.consumableEffect.healHp) {
        player.health = Math.min(player.maxHealth, player.health + item.consumableEffect.healHp);
      }
      if (item.consumableEffect.restoreMp) {
        player.mana = Math.min(player.maxMana, player.mana + item.consumableEffect.restoreMp);
      }
    }

    const wares = ShopEngine.getActiveMerchantWares(merchantId, this.weatherState.timeOfDaySec);
    this.onPlayerStatsUpdated?.(player);
    this.onShopTransactionResult?.(
      playerId,
      true,
      `Purchased ${quantity > 1 ? `${quantity}x ` : ''}${item.name}!`,
      player.coins || 0,
      player.acorns || 0,
      (player as any).inventory,
      wares
    );
  }

  public sellShopItem(playerId: string, merchantId: string, inventoryIndex: number, quantity: number = 1) {
    const player = this.players.get(playerId);
    if (!player) return;
    const merchant = MERCHANTS[merchantId];
    if (!merchant) return;

    // Validate distance
    const ent = this.entities.get(merchantId);
    if (ent) {
      const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
      if (dist > 120) {
        this.onShopTransactionResult?.(
          playerId,
          false,
          'Too far from merchant',
          player.coins || 0,
          player.acorns || 0,
          (player as any).inventory || []
        );
        return;
      }
    }

    const validation = ShopEngine.validateSell(player, inventoryIndex, quantity);
    if (!validation.valid || validation.totalGain === undefined || !validation.currency) {
      this.onShopTransactionResult?.(
        playerId,
        false,
        validation.reason || 'Could not sell this item',
        player.coins || 0,
        player.acorns || 0,
        (player as any).inventory || []
      );
      return;
    }

    // Remove item from inventory
    const inventory = (player as any).inventory as string[];
    const removedItem = inventory.splice(inventoryIndex, 1)[0];

    // Award currency
    if (validation.currency === 'acorn') {
      player.acorns = (player.acorns || 0) + validation.totalGain;
    } else {
      player.coins = (player.coins || 0) + validation.totalGain;
    }

    const wares = ShopEngine.getActiveMerchantWares(merchantId, this.weatherState.timeOfDaySec);
    this.onPlayerStatsUpdated?.(player);
    this.onShopTransactionResult?.(
      playerId,
      true,
      `Sold ${removedItem} for +${validation.totalGain} ${validation.currency === 'acorn' ? 'acorns' : 'coins'}!`,
      player.coins || 0,
      player.acorns || 0,
      inventory,
      wares
    );
  }

  public handleLeverPull(playerId: string, targetId: string) {
    const lever = this.entities.get(targetId);
    if (!lever || lever.state.solved) return;

    const now = Date.now();
    lever.state.activated = true;
    lever.state.timerExpires = now + 4500;
    this.onEntityStateChanged?.(lever);

    const otherId = targetId === 'lever_duo_left' ? 'lever_duo_right' : 'lever_duo_left';
    const other = this.entities.get(otherId);

    if (other && other.state.activated && !other.state.solved && other.state.timerExpires && other.state.timerExpires > now) {
      // Both levers activated within time window!
      lever.state.solved = true;
      lever.state.activated = true;
      other.state.solved = true;
      other.state.activated = true;
      this.onEntityStateChanged?.(lever);
      this.onEntityStateChanged?.(other);

      const chest = this.entities.get('chest_duo_vault');
      if (chest) {
        chest.interactable = true;
        chest.state.locked = false;
        this.onEntityStateChanged?.(chest);
      }

      this.db.setFlag('duo_vault_unlocked', true);
      this.onWorldFlagChanged?.('duo_vault_unlocked', true);

      // Spawn celebratory treasure items
      for (let i = 0; i < 5; i++) {
        const item: ItemDropData = {
          id: `item_vault_${Date.now()}_${i}`,
          itemType: i === 0 ? 'strawberry' : 'coin',
          x: 1024 + (i - 2) * 16,
          y: 446 + (Math.random() * 8 - 4),
          value: i === 0 ? 1 : 5
        };
        this.items.set(item.id, item);
        this.onItemSpawned?.(item);
      }
    }
  }

  private startRespawnLoop() {
    setInterval(() => {
      const now = Date.now();
      for (const entity of this.entities.values()) {
        if (entity.state.respawnAt && now >= entity.state.respawnAt) {
          entity.state.destroyed = false;
          entity.state.heldBy = null;
          if (entity.state.maxHp) {
            entity.state.hp = entity.state.maxHp;
          }
          if (entity.state.homeX && entity.state.homeY) {
            entity.x = entity.state.homeX;
            entity.y = entity.state.homeY;
          }
          delete entity.state.respawnAt;
          this.onEntityStateChanged?.(entity);
        }
      }
    }, 2000);
  }

  private startAiLoop() {
    // 1Hz gentle creature wandering & boss combat tick
    setInterval(() => {
      // 1 & 2. Smart Enemy Pathfinding (A*), Boids Flocking Separation & Leashing
      const activeEnemies = Array.from(this.entities.values()).filter(
        e => e.type === 'enemy' && !e.state.destroyed
      );
      const playerList = Array.from(this.players.values()).map(p => ({ x: p.x, y: p.y }));
      const now = Date.now();

      for (const enemy of activeEnemies) {
        // Faraway low-frequency sleep/dormancy mode
        const isNearPlayer = this.spatialGrid.isNearAnyPlayer(enemy.x, enemy.y, playerList, 480);
        if (!isNearPlayer && (enemy.state.aiState === 'idle' || !enemy.state.aiState)) {
          enemy.state.isDormant = true;
          continue;
        } else if (enemy.state.isDormant) {
          enemy.state.isDormant = false;
        }

        // Process elemental status effects (burn tick damage, freeze slow, stun)
        const status = StatusEffectManager.updateEffects(enemy.state, now, (dmg) => {
          this.handleInteract('system', enemy.id, 'hit_enemy', undefined, undefined, dmg);
        });

        if (status.isStunned) {
          // Stunned: cannot steer or move
          continue;
        }

        const isSproutling = enemy.subtype === 'sproutling';
        const aggroRadius = isSproutling ? 110 : 140;
        const leashRadius = isSproutling ? 180 : 230;
        const speed = (isSproutling ? 16 : 20) * status.speedMultiplier;

        const agent: NavAgent = {
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          homeX: enemy.state.homeX ?? enemy.x,
          homeY: enemy.state.homeY ?? enemy.y,
          aiState: enemy.state.aiState || 'idle',
          confusedUntil: enemy.state.confusedUntil,
          aggroRadius,
          leashRadius,
          speed
        };

        const otherEnemies = activeEnemies
          .filter(o => o.id !== enemy.id)
          .map(o => ({ id: o.id, x: o.x, y: o.y }));

        const { changed } = this.navEngine.updateAgent(agent, playerList, otherEnemies, now);

        if (changed) {
          enemy.x = agent.x;
          enemy.y = agent.y;
          enemy.state.aiState = agent.aiState;
          enemy.state.confusedUntil = agent.confusedUntil;
          this.spatialGrid.update(enemy);
          this.onEntityStateChanged?.(enemy);
        }
      }

      // 2b & 2c. Wildlife Ambient AI
      for (const entity of this.entities.values()) {
        // Crystal Lake Ducks gentle paddling wander
        if (entity.type === 'wildlife' && entity.subtype === 'duck') {
          const dx = (Math.random() - 0.5) * 14;
          const dy = (Math.random() - 0.5) * 10;
          entity.x = Math.max(760, Math.min(1300, entity.x + dx));
          entity.y = Math.max(1320, Math.min(1680, entity.y + dy));
          this.onEntityStateChanged?.(entity);
        }

        // 2c. Buster the Dog organic ambient micro-behaviors (sniffing, napping, idle wagging)
        if (entity.id === 'wildlife_buster') {
          let playerNear = false;
          for (const player of this.players.values()) {
            if (Math.hypot(player.x - entity.x, player.y - entity.y) < 64) {
              playerNear = true;
              break;
            }
          }

          const now = Date.now();
          if (playerNear) {
            if (entity.state.behavior !== 'idle') {
              entity.state.behavior = 'idle';
              entity.state.behaviorTimer = now + 4000;
              this.onEntityStateChanged?.(entity);
            }
          } else {
            if (!entity.state.behaviorTimer || now > entity.state.behaviorTimer) {
              const roll = Math.random();
              if (roll < 0.40) {
                entity.state.behavior = 'sniff';
                entity.state.behaviorTimer = now + 4000 + Math.random() * 2000;
              } else if (roll < 0.75) {
                entity.state.behavior = 'nap';
                entity.state.behaviorTimer = now + 6000 + Math.random() * 4000;
              } else {
                entity.state.behavior = 'idle';
                entity.state.behaviorTimer = now + 3500 + Math.random() * 2000;
              }
              this.onEntityStateChanged?.(entity);
            }
          }
        }

        // 2d. Bone Minion AI (Summoned by Necromancer)
        if (entity.type === 'minion' && entity.subtype === 'skeleton' && !entity.state.destroyed) {
          const now = Date.now();
          if (entity.state.expiresAt && now > entity.state.expiresAt) {
            entity.state.destroyed = true;
            this.onEntityStateChanged?.(entity);
            continue;
          }

          // Hunt closest enemy or boss within 160px
          let target: EntityData | null = null;
          let minDist = 160;
          for (const other of this.entities.values()) {
            if ((other.type === 'enemy' || other.type === 'boss') && !other.state.destroyed) {
              const d = Math.hypot(other.x - entity.x, other.y - entity.y);
              if (d < minDist) {
                minDist = d;
                target = other;
              }
            }
          }

          if (target) {
            const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
            if (minDist > 26) {
              entity.x += Math.cos(angle) * 22;
              entity.y += Math.sin(angle) * 22;
              this.spatialGrid.update(entity);
              this.onEntityStateChanged?.(entity);
            } else {
              const ownerId = entity.state.ownerId || 'system';
              this.handleInteract(ownerId, target.id, 'hit_enemy', undefined, undefined, 1);
            }
          } else {
            const owner = entity.state.ownerId ? this.players.get(entity.state.ownerId) : null;
            if (owner) {
              const ownerDist = Math.hypot(owner.x - entity.x, owner.y - entity.y);
              if (ownerDist > 40) {
                const angle = Math.atan2(owner.y - entity.y, owner.x - entity.x);
                entity.x += Math.cos(angle) * 24;
                entity.y += Math.sin(angle) * 24;
                this.spatialGrid.update(entity);
                this.onEntityStateChanged?.(entity);
              }
            }
          }
        }
      }

      // 3. Baron von Truffle Boss Patterns
      const boss = this.entities.get('boss_baron');
      if (boss && !boss.state.destroyed) {
        let playerInArena = false;
        let targetPlayer: PlayerData | null = null;

        for (const player of this.players.values()) {
          if (player.y < 460 && player.x > 800 && player.x < 1250) {
            playerInArena = true;
            targetPlayer = player;
            break;
          }
        }

        if (playerInArena && targetPlayer) {
          if (boss.state.stunnedUntil && Date.now() < boss.state.stunnedUntil) {
            return;
          }

          this.bossCycle = (this.bossCycle + 1) % 4;

          if (this.bossCycle === 1) {
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'stomp',
              x: boss.x,
              y: boss.y
            });
          } else if (this.bossCycle === 2) {
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'spore',
              x: boss.x,
              y: boss.y
            });
          } else if (this.bossCycle === 3) {
            const angle = Math.atan2(targetPlayer.y - boss.y, targetPlayer.x - boss.x);
            const nextX = boss.x + Math.cos(angle) * 44;
            const nextY = boss.y + Math.sin(angle) * 44;

            this.onBossEvent?.({
              type: 'boss_event',
              action: 'charge',
              x: boss.x,
              y: boss.y,
              targetX: targetPlayer.x,
              targetY: targetPlayer.y
            });

            const nearLeftPillar = Math.hypot(nextX - 920, nextY - 240) < 36;
            const nearRightPillar = Math.hypot(nextX - 1128, nextY - 240) < 36;
            const hitWall = nextX < 850 || nextX > 1200 || nextY < 180 || nextY > 440;

            if (nearLeftPillar || nearRightPillar || hitWall) {
              boss.state.stunnedUntil = Date.now() + 2800;
              this.onBossEvent?.({
                type: 'boss_event',
                action: 'crash_stun',
                x: boss.x,
                y: boss.y
              });
            } else {
              boss.x = nextX;
              boss.y = nextY;
            }
            this.onEntityStateChanged?.(boss);
          }
        }
      }

      // 4. Floor 1 Abyssal Chasm Hazard & Moving Platform Check
      for (const player of this.players.values()) {
        if (player.y >= 2150 && player.y <= 3600) {
          if (DungeonManager.isInsideAbyss(player.x, player.y)) {
            const platformPos = DungeonManager.getPlatformPosition(now);
            if (!DungeonManager.isOnMovingPlatform(player.x, player.y, platformPos.x, platformPos.y)) {
              // Fallen into the abyss! Take 1 damage and respawn on the ledge
              player.health = Math.max(1, player.health - 1);
              player.x = DUNGEON_CONSTANTS.F1_PLATFORM_RESPAWN.x;
              player.y = DUNGEON_CONSTANTS.F1_PLATFORM_RESPAWN.y;
              this.onPlayerStatsUpdated?.(player);
            }
          }
        }
      }

      // 5. Malakor the Tomb Warden Boss Patterns (Sunken Catacombs Floor 2)
      const malakor = this.entities.get(MALAKOR_SPECS.id);
      if (malakor && !malakor.state.destroyed) {
        let playerInArena = false;
        let targetPlayer: PlayerData | null = null;

        for (const player of this.players.values()) {
          if (player.y >= 4350 && player.y <= 5100 && player.x >= 750 && player.x <= 1300) {
            playerInArena = true;
            targetPlayer = player;
            break;
          }
        }

        if (playerInArena && targetPlayer) {
          if (malakor.state.stunnedUntil && now < malakor.state.stunnedUntil) {
            // Malakor is stunned from torch dispelling!
          } else {
            // Check Phase 2 transition trigger (HP <= 12)
            if (malakor.state.hp <= MALAKOR_SPECS.phase2.thresholdHp && !malakor.state.phase2Triggered) {
              malakor.state.phase2Triggered = true;
              malakor.state.shroudActive = true;
              // Extinguish all 4 Floor 2 arena torches
              for (const t of DUNGEON_CONSTANTS.F2_TORCHES) {
                const torch = this.entities.get(t.id);
                if (torch) {
                  torch.state.lit = false;
                  this.onEntityStateChanged?.(torch);
                }
              }
              this.onBossEvent?.({
                type: 'boss_event',
                action: 'darkness_shroud',
                bossId: MALAKOR_SPECS.id,
                x: malakor.x,
                y: malakor.y
              });
              this.onEntityStateChanged?.(malakor);
            }

            this.malakorCycle = (this.malakorCycle + 1) % 4;

            // Phase 2: Darkness Shroud & Seeking Soul Orbs
            if (malakor.state.shroudActive) {
              this.onBossEvent?.({
                type: 'boss_event',
                action: 'soul_barrage',
                bossId: MALAKOR_SPECS.id,
                x: malakor.x,
                y: malakor.y,
                targetX: targetPlayer.x,
                targetY: targetPlayer.y
              });
            } else {
              // Phase 1 / Unshrouded Attacks
              if (this.malakorCycle === 1 || this.malakorCycle === 3) {
                // Crypt Spike attack targeted at player
                this.onBossEvent?.({
                  type: 'boss_event',
                  action: 'crypt_spike',
                  bossId: MALAKOR_SPECS.id,
                  x: malakor.x,
                  y: malakor.y,
                  targetX: targetPlayer.x,
                  targetY: targetPlayer.y
                });
              } else if (this.malakorCycle === 2) {
                // Scythe Cleave swipe if player close
                const dist = Math.hypot(targetPlayer.x - malakor.x, targetPlayer.y - malakor.y);
                this.onBossEvent?.({
                  type: 'boss_event',
                  action: 'scythe_cleave',
                  bossId: MALAKOR_SPECS.id,
                  x: malakor.x,
                  y: malakor.y,
                  targetX: targetPlayer.x,
                  targetY: targetPlayer.y
                });
                if (dist <= MALAKOR_SPECS.phase1.scytheCleaveRange) {
                  targetPlayer.health = Math.max(0, targetPlayer.health - MALAKOR_SPECS.phase1.scytheCleaveDamage);
                  this.onPlayerStatsUpdated?.(targetPlayer);
                }
              }
            }

            // Periodic teleportation to arena cardinal points
            if (!this.malakorTeleportTimer || now >= this.malakorTeleportTimer) {
              this.malakorTeleportTimer = now + MALAKOR_SPECS.phase1.teleportIntervalMs;
              const cardinalWards = [
                { x: 920, y: 4600 },
                { x: 1128, y: 4600 },
                { x: 920, y: 4800 },
                { x: 1128, y: 4800 },
                { x: 1024, y: 4700 }
              ];
              const randPos = cardinalWards[Math.floor(Math.random() * cardinalWards.length)];
              malakor.x = randPos.x;
              malakor.y = randPos.y;
              this.spatialGrid.update(malakor);
              this.onEntityStateChanged?.(malakor);
            }
          }
        }
      }

      // Natural Player Mana Regeneration (scaled by class multiplier)
      for (const p of this.players.values()) {
        if (p.mana === undefined) p.mana = 50;
        if (p.maxMana === undefined) p.maxMana = 50;
        if (p.mana < p.maxMana) {
          const classDef = ClassManager.getClass(p.classId || 'warrior');
          const regen = Math.max(2, Math.round(5 * classDef.statModifiers.manaRegenMultiplier));
          p.mana = Math.min(p.maxMana, p.mana + regen);
          this.onPlayerStatsUpdated?.(p);
        }
      }
    }, 1400);
  }

  public getPlayerStats(playerId: string): AggregatedEquipmentStats {
    const player = this.players.get(playerId);
    if (!player || !player.equipment) {
      return EquipmentManager.createDefaultStats();
    }
    const equipStats = EquipmentManager.calculateStats(player.equipment, EquipmentManager.createDefaultStats());
    const classId = player.classId || 'warrior';
    return ClassManager.applyClassModifiers(classId, equipStats, equipStats);
  }

  public handleEquipItem(playerId: string, slot: EquipmentSlot, itemId: string | null) {
    const player = this.players.get(playerId);
    if (!player) return;

    if (itemId) {
      if (!EquipmentManager.canEquip(slot, itemId)) return;
    }

    if (!player.equipment) {
      player.equipment = EquipmentManager.getDefaultEquipment();
    }

    player.equipment[slot] = itemId;

    // Recalculate stats & adjust max HP/MP
    const stats = this.getPlayerStats(playerId);
    const oldMaxHealth = player.maxHealth || 3;
    const oldMaxMana = player.maxMana || 50;

    const newMaxHealth = 3 + stats.maxHealthBonus;
    const newMaxMana = 50 + stats.maxManaBonus;

    player.maxHealth = newMaxHealth;
    player.maxMana = newMaxMana;

    const hpDelta = newMaxHealth - oldMaxHealth;
    const mpDelta = newMaxMana - oldMaxMana;

    player.health = Math.max(1, Math.min(player.maxHealth, player.health + hpDelta));
    player.mana = Math.max(0, Math.min(player.maxMana, (player.mana ?? 50) + mpDelta));

    this.db.savePlayer(playerId, player.name, player.color, player.paletteIndex, player.equipment, player.vanity);
    this.onPlayerStatsUpdated?.(player);
    this.onEquipmentUpdated?.(playerId, player.equipment, player.vanity || EquipmentManager.getDefaultVanity(), stats);
  }

  public handleSetVanity(playerId: string, slot: VanitySlot, vanityId: string | null) {
    const player = this.players.get(playerId);
    if (!player) return;

    if (!player.vanity) {
      player.vanity = EquipmentManager.getDefaultVanity();
    }

    player.vanity[slot] = vanityId;
    this.db.savePlayer(playerId, player.name, player.color, player.paletteIndex, player.equipment, player.vanity);
    const stats = this.getPlayerStats(playerId);
    this.onEquipmentUpdated?.(playerId, player.equipment, player.vanity, stats);
  }

  public handleShootArrow(playerId: string, x: number, y: number, direction: Direction, damage?: number) {
    const stats = this.getPlayerStats(playerId);
    const speed = stats.arrowSpeed > 0 ? stats.arrowSpeed : 340;
    const range = stats.arrowRange > 0 ? stats.arrowRange : 260;
    const actualDamage = damage || stats.attackPower || 2;
    this.onArrowShot?.(playerId, x, y, direction, speed, range, actualDamage);
  }

  public handleCastSpell(playerId: string, spellId: SpellId, x: number, y: number, direction: Direction) {
    const player = this.players.get(playerId);
    if (!player) return;

    const spell = SPELL_DEFINITIONS[spellId];
    if (!spell) return;

    if (player.mana === undefined) player.mana = 50;
    if (player.maxMana === undefined) player.maxMana = 50;

    const stats = this.getPlayerStats(playerId);
    const actualCost = Math.max(1, Math.round(spell.manaCost * (1 - stats.manaCostReductionPct)));

    if (player.mana < actualCost) return;

    // Deduct mana
    player.mana -= actualCost;
    this.onPlayerStatsUpdated?.(player);
    this.onSpellCast?.(playerId, spellId, x, y, direction);

    // If instant AOE (Gale Ward), apply radial hit & stun immediately
    if (spell.id === 'gale_ward') {
      const now = Date.now();
      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          const dist = Math.hypot(entity.x - x, entity.y - y);
          if (dist <= spell.aoeRadius) {
            // Apply Stun
            StatusEffectManager.applyEffect(entity.state, 'stun', 1200, now);
            // Pushback
            const angle = Math.atan2(entity.y - y, entity.x - x);
            entity.x += Math.cos(angle) * spell.pushForce;
            entity.y += Math.sin(angle) * spell.pushForce;
            this.spatialGrid.update(entity);
            this.onEntityStateChanged?.(entity);

            // Deal damage
            this.handleInteract(playerId, entity.id, 'hit_enemy', undefined, undefined, spell.baseDamage);
          }
        }
      }
    }
  }

  public handleSetClass(playerId: string, classId: CharacterClassId) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.classId = classId;

    const stats = this.getPlayerStats(playerId);
    const oldMaxHealth = player.maxHealth || 3;
    const oldMaxMana = player.maxMana || 50;

    const newMaxHealth = 3 + stats.maxHealthBonus;
    const newMaxMana = 50 + stats.maxManaBonus;

    player.maxHealth = newMaxHealth;
    player.maxMana = newMaxMana;

    const hpDelta = newMaxHealth - oldMaxHealth;
    const mpDelta = newMaxMana - oldMaxMana;

    player.health = Math.max(1, Math.min(player.maxHealth, player.health + hpDelta));
    player.mana = Math.max(0, Math.min(player.maxMana, (player.mana ?? 50) + mpDelta));

    this.db.savePlayer(playerId, player.name, player.color, player.paletteIndex, player.equipment, player.vanity, player.classId);
    this.onPlayerStatsUpdated?.(player);
    this.onClassUpdated?.(playerId, player.classId, stats);
  }

  public handleUseClassAbility(playerId: string, abilityId: ClassAbilityId, x: number, y: number, direction: Direction) {
    const player = this.players.get(playerId);
    if (!player) return;

    const ability = ClassManager.getAbility(abilityId);
    if (!ability) return;

    // Verify ability matches player class
    if (ability.classId !== player.classId) return;

    const stats = this.getPlayerStats(playerId);
    const actualCost = Math.max(1, Math.round(ability.manaCost * (1 - stats.manaCostReductionPct)));

    if ((player.mana ?? 50) < actualCost) return;

    // Deduct mana
    player.mana = (player.mana ?? 50) - actualCost;
    this.onPlayerStatsUpdated?.(player);

    const now = Date.now();

    // 1. Warrior
    if (abilityId === 'shield_parry') {
      (player as any).parryUntil = now + 1200;
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    } else if (abilityId === 'stagger_cleave') {
      const radius = 52;
      const cleaveDamage = 3 + stats.attackPower;
      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          const dist = Math.hypot(entity.x - x, entity.y - y);
          if (dist <= radius) {
            StatusEffectManager.applyEffect(entity.state, 'stun', 1500, now);
            const angle = Math.atan2(entity.y - y, entity.x - x);
            entity.x += Math.cos(angle) * 45;
            entity.y += Math.sin(angle) * 45;
            this.spatialGrid.update(entity);
            this.onEntityStateChanged?.(entity);
            this.handleInteract(playerId, entity.id, 'hit_enemy', undefined, undefined, cleaveDamage);
          }
        }
      }
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    }

    // 2. Mage
    else if (abilityId === 'teleport_blink') {
      const dist = 96;
      const dx = direction === 'right' ? dist : direction === 'left' ? -dist : 0;
      const dy = direction === 'down' ? dist : direction === 'up' ? -dist : 0;
      player.x = Math.max(64, Math.min(1984, player.x + dx));
      player.y = Math.max(64, Math.min(1728, player.y + dy));
      (player as any).invulnerableUntil = now + 300;
      this.onClassAbilityTriggered?.(playerId, abilityId, player.x, player.y, direction);
    } else if (abilityId === 'arcane_nova') {
      const radius = 72;
      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          const dist = Math.hypot(entity.x - x, entity.y - y);
          if (dist <= radius) {
            StatusEffectManager.applyEffect(entity.state, 'freeze', 2500, now);
            const angle = Math.atan2(entity.y - y, entity.x - x);
            entity.x += Math.cos(angle) * 38;
            entity.y += Math.sin(angle) * 38;
            this.spatialGrid.update(entity);
            this.onEntityStateChanged?.(entity);
            this.handleInteract(playerId, entity.id, 'hit_enemy', undefined, undefined, 3);
          }
        }
      }
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    }

    // 3. Bard
    else if (abilityId === 'speed_fanfare') {
      (player as any).speedBoostUntil = now + 6000;
      for (const other of this.players.values()) {
        if (other.id !== playerId && Math.hypot(other.x - x, other.y - y) <= 128) {
          (other as any).speedBoostUntil = now + 6000;
        }
      }
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    } else if (abilityId === 'harmony_chord') {
      player.health = Math.min(player.maxHealth, player.health + 2);
      this.onPlayerStatsUpdated?.(player);
      for (const other of this.players.values()) {
        if (other.id !== playerId && Math.hypot(other.x - x, other.y - y) <= 96) {
          other.health = Math.min(other.maxHealth, other.health + 2);
          this.onPlayerStatsUpdated?.(other);
        }
      }
      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          if (Math.hypot(entity.x - x, entity.y - y) <= 96) {
            StatusEffectManager.applyEffect(entity.state, 'freeze', 3500, now);
            this.handleInteract(playerId, entity.id, 'hit_enemy', undefined, undefined, 1);
          }
        }
      }
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    }

    // 4. Necromancer
    else if (abilityId === 'raise_skeleton') {
      const minionId = `minion_skel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const minion: EntityData = {
        id: minionId,
        type: 'minion',
        subtype: 'skeleton',
        name: 'Bone Minion',
        x: x + (direction === 'left' ? -20 : 20),
        y: y,
        interactable: true,
        state: {
          hp: 5,
          maxHp: 5,
          ownerId: playerId,
          expiresAt: now + 25000,
          destroyed: false
        }
      };
      this.entities.set(minionId, minion);
      this.spatialGrid.insert(minion);
      this.onEntityStateChanged?.(minion);
      this.onMinionSpawned?.(minionId, playerId, minion.x, minion.y, 'skeleton');
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    } else if (abilityId === 'life_siphon') {
      let closest: EntityData | null = null;
      let closestDist = 130;
      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          const d = Math.hypot(entity.x - x, entity.y - y);
          if (d < closestDist) {
            closestDist = d;
            closest = entity;
          }
        }
      }
      if (closest) {
        this.handleInteract(playerId, closest.id, 'hit_enemy', undefined, undefined, 2);
        player.health = Math.min(player.maxHealth, player.health + 2);
        this.onPlayerStatsUpdated?.(player);
        this.onLifeSiphonEvent?.(playerId, closest.id, 2, player.health);
        this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction, closest.id);
      }
    }

    // 5. Archer
    else if (abilityId === 'piercing_arrow') {
      const range = 340;
      const angle = direction === 'right' ? 0 : direction === 'left' ? Math.PI : direction === 'down' ? Math.PI / 2 : -Math.PI / 2;
      const endX = x + Math.cos(angle) * range;
      const endY = y + Math.sin(angle) * range;

      for (const entity of this.entities.values()) {
        if ((entity.type === 'enemy' || entity.type === 'boss') && !entity.state.destroyed) {
          const distToLine = pointToSegmentDistance(entity.x, entity.y, x, y, endX, endY);
          if (distToLine <= 28) {
            this.handleInteract(playerId, entity.id, 'hit_enemy', undefined, undefined, 3);
            StatusEffectManager.applyEffect(entity.state, 'freeze', 1500, now);
          }
        }
      }
      this.onArrowShot?.(playerId, x, y, direction, 440, 340, 3);
      this.onClassAbilityTriggered?.(playerId, abilityId, x, y, direction);
    } else if (abilityId === 'evasive_backhop') {
      const hopDist = 76;
      const dx = direction === 'right' ? -hopDist : direction === 'left' ? hopDist : 0;
      const dy = direction === 'down' ? -hopDist : direction === 'up' ? hopDist : 0;
      player.x = Math.max(64, Math.min(1984, player.x + dx));
      player.y = Math.max(64, Math.min(1728, player.y + dy));
      (player as any).invulnerableUntil = now + 350;
      this.onClassAbilityTriggered?.(playerId, abilityId, player.x, player.y, direction);
    }
  }

  public addPlayer(id: string, name: string, color: string, paletteIndex: number): PlayerData {
    const saved = this.db.getPlayerData(id);
    const classId = saved?.classId || 'warrior';
    const equipment = saved?.equipment || {
      weapon: 'sword_wood',
      offhand: null,
      armor: null,
      relic: null
    };
    const vanity = saved?.vanity || {
      head: null,
      armor: null,
      weapon: null
    };
    let stats = EquipmentManager.calculateStats(equipment, EquipmentManager.createDefaultStats());
    stats = ClassManager.applyClassModifiers(classId, stats, stats);
    const baseHealth = 3 + stats.maxHealthBonus;
    const baseMana = 50 + stats.maxManaBonus;

    const player: PlayerData = {
      id,
      name,
      color,
      paletteIndex,
      classId,
      x: 1024 + (Math.random() * 40 - 20),
      y: 950 + (Math.random() * 40 - 20),
      direction: 'down',
      anim: 'idle',
      carryingItem: null,
      health: baseHealth,
      maxHealth: baseHealth,
      mana: baseMana,
      maxMana: baseMana,
      coins: saved?.coins ?? 0,
      acorns: 0,
      equipment,
      vanity,
      fishLog: saved?.fishLog || {}
    };
    this.players.set(id, player);
    this.db.savePlayer(id, name, color, paletteIndex, equipment, vanity, classId);
    return player;
  }

  public removePlayer(id: string): void {
    for (const entity of this.entities.values()) {
      if (entity.state.heldBy === id) {
        entity.state.heldBy = null;
        entity.state.destroyed = true;
        entity.state.respawnAt = Date.now() + 15000;
        this.onEntityStateChanged?.(entity);
      }
    }
    this.players.delete(id);
  }

  public updatePlayerMove(id: string, x: number, y: number, direction: Direction, anim: PlayerAnimState, carryingItem: string | null) {
    const p = this.players.get(id);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.direction = direction;
    p.anim = anim;
    p.carryingItem = carryingItem;

    this.checkPressureSwitches();
  }

  public checkPressureSwitches() {
    const switchLeft = this.entities.get('switch_sun_left');
    const switchRight = this.entities.get('switch_sun_right');
    const gate = this.entities.get('ancient_gate');
    if (!switchLeft || !switchRight || !gate) return;

    let leftOccupied = false;
    let rightOccupied = false;

    // Check players
    for (const player of this.players.values()) {
      const distL = Math.hypot(player.x - switchLeft.x, player.y - switchLeft.y);
      const distR = Math.hypot(player.x - switchRight.x, player.y - switchRight.y);
      if (distL < 28) leftOccupied = true;
      if (distR < 28) rightOccupied = true;
    }

    // Check pots placed on switches
    for (const entity of this.entities.values()) {
      if (entity.type === 'pot' && !entity.state.heldBy && !entity.state.destroyed) {
        const distL = Math.hypot(entity.x - switchLeft.x, entity.y - switchLeft.y);
        const distR = Math.hypot(entity.x - switchRight.x, entity.y - switchRight.y);
        if (distL < 24) leftOccupied = true;
        if (distR < 24) rightOccupied = true;
      }

      // Check heavy blocks pushed onto switches
      if (entity.type === 'block') {
        const distL = Math.hypot(entity.x - switchLeft.x, entity.y - switchLeft.y);
        const distR = Math.hypot(entity.x - switchRight.x, entity.y - switchRight.y);
        if (distL < 28) leftOccupied = true;
        if (distR < 28) rightOccupied = true;
      }
    }

    if (switchLeft.state.activated !== leftOccupied) {
      switchLeft.state.activated = leftOccupied;
      this.onEntityStateChanged?.(switchLeft);
    }
    if (switchRight.state.activated !== rightOccupied) {
      switchRight.state.activated = rightOccupied;
      this.onEntityStateChanged?.(switchRight);
    }

    const shouldOpen = leftOccupied && rightOccupied;
    if (gate.state.opened !== shouldOpen) {
      gate.state.opened = shouldOpen;
      this.db.setFlag('ancient_gate_opened', shouldOpen);
      this.navEngine.setGateOpened(shouldOpen);
      this.onEntityStateChanged?.(gate);
      this.onWorldFlagChanged?.('ancient_gate_opened', shouldOpen);
    }
  }

  public handleInteract(playerId: string, targetId: string, action: string, x?: number, y?: number, damage?: number) {
    if (action === 'player_hurt') {
      const player = this.players.get(playerId);
      if (player && player.health > 0) {
        const now = Date.now();
        // Check invulnerability frames (e.g. from evasive back-hop or teleport blink)
        if ((player as any).invulnerableUntil && now < (player as any).invulnerableUntil) {
          return;
        }

        // Check Warrior Shield Parry!
        if ((player as any).parryUntil && now < (player as any).parryUntil) {
          (player as any).parryUntil = 0;
          this.onParryEvent?.(playerId, targetId, player.x, player.y);
          // Riposte counter-strike against attacker
          const attacker = this.entities.get(targetId);
          if (attacker) {
            StatusEffectManager.applyEffect(attacker.state, 'stun', 1800, now);
            this.handleInteract(playerId, targetId, 'hit_enemy', undefined, undefined, 2);
          }
          return; // 100% incoming damage blocked!
        }

        const stats = this.getPlayerStats(playerId);
        const incoming = damage || 1;
        const reduced = Math.max(1, Math.round(incoming * (1 - stats.damageReductionPct)));
        player.health = Math.max(0, player.health - reduced);
        this.onPlayerStatsUpdated?.(player);
      }
      return;
    }

    const entity = this.entities.get(targetId);
    if (!entity) return;

    // Torch Lighting interaction (via light_torch, cut, or hit)
    if ((action === 'light_torch' || action === 'cut' || action === 'hit_enemy') && entity.type === 'torch') {
      if (!entity.state.lit) {
        entity.state.lit = true;
        this.onEntityStateChanged?.(entity);

        // Check Floor 1 puzzle completion vs Floor 2 boss room shroud dispelling
        const isF1Torch = DUNGEON_CONSTANTS.F1_TORCHES.some(t => t.id === entity.id);
        if (isF1Torch) {
          const f1Solved = DUNGEON_CONSTANTS.F1_TORCHES.every(t => this.entities.get(t.id)?.state.lit);
          if (f1Solved) {
            const gate = this.entities.get(DUNGEON_CONSTANTS.F1_GATE.id);
            if (gate && !gate.state.opened) {
              gate.state.opened = true;
              this.onEntityStateChanged?.(gate);
            }
            this.onTorchLitEvent?.(entity.id, entity.x, entity.y, true);
          } else {
            this.onTorchLitEvent?.(entity.id, entity.x, entity.y, false);
          }
        } else {
          // Check Floor 2 boss room shroud dispelling (all 4 torches)
          const f2TorchesLit = DUNGEON_CONSTANTS.F2_TORCHES.every(t => this.entities.get(t.id)?.state.lit);
          const malakor = this.entities.get(MALAKOR_SPECS.id);
          if (f2TorchesLit && malakor && !malakor.state.destroyed && malakor.state.shroudActive) {
            malakor.state.shroudActive = false;
            malakor.state.stunnedUntil = Date.now() + MALAKOR_SPECS.phase2.stunDurationMs;
            this.onEntityStateChanged?.(malakor);
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'crash_stun',
              bossId: MALAKOR_SPECS.id,
              x: malakor.x,
              y: malakor.y
            });
            this.onTorchLitEvent?.(entity.id, entity.x, entity.y, true);
          } else {
            this.onTorchLitEvent?.(entity.id, entity.x, entity.y, false);
          }
        }
      }
      return;
    }

    // Dungeon entrance, stairs, portal and relic chest interactions
    if (action === 'enter_dungeon' || action === 'warp_floor' || action === 'press' || action === 'talk') {
      if (entity.id === 'stairs_catacombs_entrance') {
        const player = this.players.get(playerId);
        if (player) {
          player.x = DUNGEON_CONSTANTS.F1_SPAWN.x;
          player.y = DUNGEON_CONSTANTS.F1_SPAWN.y;
        }
        this.onDungeonTransition?.(playerId, 'f1', DUNGEON_CONSTANTS.F1_SPAWN.x, DUNGEON_CONSTANTS.F1_SPAWN.y, CATACOMBS_FLOORS.f1.name, CATACOMBS_FLOORS.f1.subtitle);
        return;
      }
      if (entity.id === DUNGEON_CONSTANTS.F1_STAIRS_UP.id) {
        const player = this.players.get(playerId);
        if (player) {
          player.x = DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.x;
          player.y = DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.y;
        }
        this.onDungeonTransition?.(playerId, 'overworld', DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.x, DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.y, 'Ruins Sanctuary', 'Surface World');
        return;
      }
      if (entity.id === DUNGEON_CONSTANTS.F1_STAIRS_DOWN.id) {
        const player = this.players.get(playerId);
        if (player) {
          player.x = DUNGEON_CONSTANTS.F2_SPAWN.x;
          player.y = DUNGEON_CONSTANTS.F2_SPAWN.y;
        }
        this.onDungeonTransition?.(playerId, 'f2', DUNGEON_CONSTANTS.F2_SPAWN.x, DUNGEON_CONSTANTS.F2_SPAWN.y, CATACOMBS_FLOORS.f2.name, CATACOMBS_FLOORS.f2.subtitle);
        return;
      }
      if (entity.id === DUNGEON_CONSTANTS.F2_STAIRS_UP.id) {
        const player = this.players.get(playerId);
        if (player) {
          player.x = 1024;
          player.y = 3420;
        }
        this.onDungeonTransition?.(playerId, 'f1', 1024, 3420, CATACOMBS_FLOORS.f1.name, CATACOMBS_FLOORS.f1.subtitle);
        return;
      }
      if (entity.id === DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id && entity.state.active) {
        const player = this.players.get(playerId);
        if (player) {
          player.x = DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.x;
          player.y = DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.y;
        }
        this.onDungeonTransition?.(playerId, 'overworld', DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.x, DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.y, 'Ruins Sanctuary', 'Surface World');
        return;
      }
      if (entity.id === DUNGEON_CONSTANTS.F2_RELIC_CHEST.id && !entity.state.locked && !entity.state.opened) {
        entity.state.opened = true;
        this.onEntityStateChanged?.(entity);
        const relicDrop: ItemDropData = {
          id: `item_relic_sun_stone_${Date.now()}`,
          itemType: 'relic_sun_stone',
          x: entity.x,
          y: entity.y + 16,
          value: 150
        };
        this.items.set(relicDrop.id, relicDrop);
        this.onItemSpawned?.(relicDrop);
        return;
      }
    }

    if (action === 'hit_enemy') {
      if (entity.state.destroyed) return;
      const healthPool = BehaviorRegistry.getHealthPool(entity);
      if (healthPool) {
        let dmg = damage || 1;

        // Malakor Phase 2 Darkness Shroud 75% Damage Mitigation
        if (entity.id === MALAKOR_SPECS.id && entity.state.shroudActive) {
          dmg = Math.max(1, Math.round(dmg * (1 - MALAKOR_SPECS.phase2.darknessShroudMitigationPct)));
        }

        const res = healthPool.onHurt(entity, dmg);
        if (res.isDestroyed) {
          // Necromancer Soul Harvest Passive Perk: restores 2 HP and 10 MP!
          const killer = this.players.get(playerId);
          if (killer && killer.classId === 'necromancer') {
            killer.health = Math.min(killer.maxHealth, killer.health + 2);
            killer.mana = Math.min(killer.maxMana, (killer.mana ?? 50) + 10);
            this.onPlayerStatsUpdated?.(killer);
          }

          if (entity.type === 'boss') {
            const isMalakor = entity.id === MALAKOR_SPECS.id;
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'defeated',
              bossId: isMalakor ? MALAKOR_SPECS.id : undefined,
              x: entity.x,
              y: entity.y
            });

            if (isMalakor) {
              // Unlock Relic Chest & Activate Exit Portal
              const chest = this.entities.get(DUNGEON_CONSTANTS.F2_RELIC_CHEST.id);
              if (chest) {
                chest.interactable = true;
                chest.state.locked = false;
                chest.state.active = true;
                this.onEntityStateChanged?.(chest);
              }
              const portal = this.entities.get(DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id);
              if (portal) {
                portal.interactable = true;
                portal.state.active = true;
                this.onEntityStateChanged?.(portal);
              }
            }
            const crownItem: ItemDropData = {
              id: `item_crown_${Date.now()}`,
              itemType: 'crown',
              x: entity.x,
              y: entity.y + 10,
              value: 100
            };
            this.items.set(crownItem.id, crownItem);
            this.onItemSpawned?.(crownItem);
            for (let i = 0; i < 6; i++) {
              const coinItem: ItemDropData = {
                id: `item_loot_coin_${Date.now()}_${i}`,
                itemType: 'coin',
                x: entity.x + (Math.random() * 60 - 30),
                y: entity.y + (Math.random() * 60 - 30),
                value: 10
              };
              this.items.set(coinItem.id, coinItem);
              this.onItemSpawned?.(coinItem);
            }
            for (let i = 0; i < 3; i++) {
              const berryItem: ItemDropData = {
                id: `item_loot_berry_${Date.now()}_${i}`,
                itemType: 'strawberry',
                x: entity.x + (Math.random() * 50 - 25),
                y: entity.y + (Math.random() * 50 - 25),
                value: 1
              };
              this.items.set(berryItem.id, berryItem);
              this.onItemSpawned?.(berryItem);
            }
          } else {
            const dropType = entity.subtype === 'sproutling' ? (Math.random() < 0.6 ? 'strawberry' : 'acorn') : (Math.random() < 0.5 ? 'coin' : 'acorn');
            const drop: ItemDropData = {
              id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              itemType: dropType,
              x: entity.x,
              y: entity.y,
              value: dropType === 'coin' ? 5 : 1
            };
            this.items.set(drop.id, drop);
            this.onItemSpawned?.(drop);
          }
        }
        this.onEntityStateChanged?.(entity);
      }
      return;
    }

    if (action === 'sit_campfire' || entity.type === 'campfire') {
      const player = this.players.get(playerId);
      if (player) {
        player.anim = player.anim === 'sit' ? 'idle' : 'sit';
        this.updatePlayerMove(playerId, player.x, player.y, player.direction, player.anim, player.carryingItem);
      }
      return;
    }

    if (action === 'browse_shop' || entity.type === 'merchant') {
      const merchantId = entity.state.merchantId || entity.id;
      this.openShop(playerId, merchantId);
      return;
    }

    const result = BehaviorRegistry.handleInteraction(entity, { playerId, action, x, y, damage }, this);
    if (result.handled) {
      if (result.stateChanged) {
        this.spatialGrid.update(entity);
        this.onEntityStateChanged?.(entity);
      }
      if (result.spawnItems) {
        for (const item of result.spawnItems) {
          this.items.set(item.id, item);
          this.onItemSpawned?.(item);
        }
      }
    }
  }

  public collectItem(playerId: string, itemId: string) {
    const item = this.items.get(itemId);
    if (!item) return;
    this.items.delete(itemId);
    const player = this.players.get(playerId);
    if (player) {
      if (item.itemType === 'coin') player.coins = (player.coins || 0) + item.value;
      else if (item.itemType === 'acorn') player.acorns = (player.acorns || 0) + item.value;
      else if (item.itemType === 'strawberry') player.health = Math.min(player.maxHealth, player.health + 1);
      else if (item.itemType === 'scone') player.health = player.maxHealth;
      else if (item.itemType === 'crown') {
        player.coins = (player.coins || 0) + 100;
        this.db.setFlag('crown_reclaimed', true);
        this.onWorldFlagChanged?.('crown_reclaimed', true);
      } else if (item.itemType === 'letter') {
        player.coins = (player.coins || 0) + 15;
      }
      this.onPlayerStatsUpdated?.(player);
    }
    this.onItemCollected?.(itemId, playerId, item.itemType, item.value);
  }

  public handleAdminCommand(playerId: string, action: string, payload?: any) {
    const player = this.players.get(playerId);
    if (action === 'toggle_gate') {
      const gate = this.entities.get('ancient_gate');
      if (gate) {
        const next = !gate.state.opened;
        gate.state.opened = next;
        this.db.setFlag('ancient_gate_opened', next);
        this.navEngine.setGateOpened(next);
        this.onEntityStateChanged?.(gate);
        this.onWorldFlagChanged?.('ancient_gate_opened', next);
      }
    } else if (action === 'heal') {
      if (player) {
        player.health = player.maxHealth;
        this.onPlayerStatsUpdated?.(player);
      }
    } else if (action === 'spawn_item') {
      const itemType = payload?.itemType || 'coin';
      const item: ItemDropData = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemType,
        x: player ? player.x : 1024,
        y: player ? player.y + 20 : 950,
        value: payload?.value || (itemType === 'coin' ? 10 : 1)
      };
      this.items.set(item.id, item);
      this.onItemSpawned?.(item);
    } else if (action === 'solve_switches') {
      const switchLeft = this.entities.get('switch_sun_left');
      const switchRight = this.entities.get('switch_sun_right');
      const gate = this.entities.get('ancient_gate');
      if (switchLeft && switchRight && gate) {
        switchLeft.state.activated = true;
        switchRight.state.activated = true;
        gate.state.opened = true;
        this.db.setFlag('ancient_gate_opened', true);
        this.navEngine.setGateOpened(true);
        this.onEntityStateChanged?.(switchLeft);
        this.onEntityStateChanged?.(switchRight);
        this.onEntityStateChanged?.(gate);
        this.onWorldFlagChanged?.('ancient_gate_opened', true);
      }
    } else if (action === 'teleport') {
      if (player && typeof payload?.x === 'number' && typeof payload?.y === 'number') {
        player.x = payload.x;
        player.y = payload.y;
      }
    } else if (action === 'spawn_boss') {
      const boss = this.entities.get('boss_baron');
      if (boss) {
        boss.x = 1024;
        boss.y = 280;
        boss.state.destroyed = false;
        boss.state.hp = 12;
        delete boss.state.respawnAt;
        this.onEntityStateChanged?.(boss);
        this.onBossEvent?.({
          type: 'boss_event',
          action: 'spawn',
          x: 1024,
          y: 280
        });
      }
    } else if (action === 'spawn_enemy') {
      const type = payload?.type || 'sproutling';
      const id = `enemy_spawned_${Date.now()}`;
      const enemy: EntityData = {
        id,
        type: 'enemy',
        subtype: type,
        name: type === 'sproutling' ? 'Sproutling' : 'Grumble Shroom',
        x: (player ? player.x : 1024) + 32,
        y: (player ? player.y : 950),
        interactable: true,
        state: { hp: type === 'sproutling' ? 2 : 3, maxHp: type === 'sproutling' ? 2 : 3, destroyed: false }
      };
      this.entities.set(id, enemy);
      this.onEntityStateChanged?.(enemy);
    } else if (action === 'set_weather') {
      if (payload && payload.weather) {
        this.setWeather(payload.weather);
      }
    } else if (action === 'set_time') {
      if (payload && typeof payload.hour === 'number') {
        this.setTimeOfDay(payload.hour);
      }
    }
  }

  public setPlayerEmote(playerId: string, emote: EmoteType): EmoteEvent {
    const player = this.players.get(playerId);
    const now = Date.now();
    if (player) {
      player.activeEmote = emote;
      player.emoteExpiresAt = now + 3500;

      // Check social resonance with nearby players (<= 84px)
      for (const other of this.players.values()) {
        if (other.id !== playerId && other.activeEmote && other.emoteExpiresAt && other.emoteExpiresAt > now) {
          const dist = Math.hypot(player.x - other.x, player.y - other.y);
          if (dist <= 84) {
            // Social resonance!
            this.onSocialResonance?.(playerId, other.id, emote, (player.x + other.x) / 2, (player.y + other.y) / 2);
            break;
          }
        }
      }
    }
    return {
      senderId: playerId,
      emote,
      timestamp: now
    };
  }

  public createChatMessage(playerId: string, text: string): ChatMessage {
    const player = this.players.get(playerId);
    return {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: playerId,
      senderName: player?.name || 'Adventurer',
      text: text.slice(0, 140),
      timestamp: Date.now()
    };
  }
}
