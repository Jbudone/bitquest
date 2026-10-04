import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { saveManager } from '../storage/SaveManager';
import { chronicles } from '../storage/ChroniclesManager';
import { ParticlePipeline } from '../vfx/ParticlePipeline';
import type { EntityData, PlayerData, Direction, EmoteType, ItemDropData } from '../../../shared/src/types';
import { SpatialGrid } from '../../../shared/src/spatialGrid';
import { BehaviorRegistry } from '../../../shared/src/behaviors/registry';
import { SPELL_DEFINITIONS, type SpellDefinition, type SpellId, StatusEffectManager } from '../../../shared/src/magic';
import { ClassManager, CLASS_DEFINITIONS, type CharacterClassId, type ClassAbilityId } from '../../../shared/src/classes';
import { DUNGEON_CONSTANTS, MALAKOR_SPECS, DungeonManager, CATACOMBS_FLOORS, type DungeonFloorId } from '../../../shared/src/dungeon';
import { FishingEngine, FISH_SPECIES } from '../../../shared/src/fishing';
import { WeatherEngine, CAMPFIRES, type WeatherType, type WeatherState, type DayPhase, type CampfireDefinition } from '../../../shared/src/weather';
import { OCARINA_NOTES, type OcarinaNote } from '../../../shared/src/ocarina';
import { telemetryProfiler } from '../../../shared/src/telemetry';
import { farmingManager } from '../../../shared/src/farming';
import type { BuffTotals } from '../../../shared/src/cooking';

export class WorldScene extends Phaser.Scene {
  public localPlayer: Player | null = null;
  public network = network;
  public otherPlayers = new Map<string, OtherPlayer>();
  public entityObjects = new Map<string, Phaser.GameObjects.GameObject>();
  public entityShadows = new Map<string, Phaser.GameObjects.Sprite>();
  public worldEntities = new Map<string, EntityData>();
  public itemObjects = new Map<string, { sprite: Phaser.GameObjects.Sprite; shapeText?: Phaser.GameObjects.Text; data: ItemDropData }>();
  public playerGlow?: Phaser.GameObjects.Image;
  public particles!: ParticlePipeline;
  public physicsDebugGraphics!: Phaser.GameObjects.Graphics;

  // Cozy Farming & Crop Cultivation (Expansion Milestone 1)
  private farmSoilSprites = new Map<string, Phaser.GameObjects.Image>();
  private farmCropSprites = new Map<string, Phaser.GameObjects.Sprite>();

  // Cozy Cooking & Hearth Engine (Expansion Milestone 2)
  public buffTotals: BuffTotals = {
    speedMultiplier: 1.0,
    defenseReduction: 0.0,
    bonusMaxHp: 0,
    manaRegenMultiplier: 1.0,
    fishingSweetSpotBonus: 0.0,
    attackPowerMultiplier: 1.0
  };
  public playerInventory: string[] = ['tool_hoe', 'tool_watering_can', 'seed_turnip', 'seed_strawberry', 'seed_corn', 'acorn', 'acorn'];
  private campfireCookingProp?: Phaser.GameObjects.Sprite;
  private bakeryOvenProp?: Phaser.GameObjects.Sprite;

  // Cozy Bobber Fishing (Task 7.5 / Issue #23)
  public isLocalFishing = false;
  public fishingPhase: 'idle' | 'waiting' | 'bite' | 'reeling' = 'idle';
  private activeFishingBobber: Phaser.GameObjects.Sprite | null = null;
  private fishingLineGfx: Phaser.GameObjects.Graphics | null = null;
  private fishingTargetPos = { x: 0, y: 0 };
  private remoteBobbers = new Map<string, { sprite: Phaser.GameObjects.Sprite; lineGfx: Phaser.GameObjects.Graphics; targetX: number; targetY: number }>();
  private waterRipples: Array<{ circle: Phaser.GameObjects.Arc; radius: number; maxRadius: number; alpha: number }> = [];
  private tensionHudContainer: Phaser.GameObjects.Container | null = null;
  private tensionNeedle: Phaser.GameObjects.Rectangle | null = null;
  private tensionSweetZone: Phaser.GameObjects.Rectangle | null = null;
  private tensionProgressBar: Phaser.GameObjects.Rectangle | null = null;
  private tensionHintText: Phaser.GameObjects.Text | null = null;
  private biteAlertText: Phaser.GameObjects.Text | null = null;

  // Dynamic Day/Night Cycle, Weather & Campfires (Task 7.6 / Issue #24)
  public currentWeather: WeatherType = 'clear';
  public timeOfDaySec: number = 480; // 8:00 AM bright morning
  public windAngle: number = 0.785; // 45 degrees
  public windSpeed: number = 1.0;
  private dayNightDarknessOverlay?: Phaser.GameObjects.Graphics;
  private lightningFlashOverlay?: Phaser.GameObjects.Rectangle;
  private rainGraphics?: Phaser.GameObjects.Graphics;
  private fireflyGraphics?: Phaser.GameObjects.Graphics;
  private rainDrops: Array<{ x: number; y: number; length: number; speed: number; alpha: number }> = [];
  private fireflies: Array<{ baseX: number; baseY: number; x: number; y: number; phase: number; speed: number }> = [];
  private campfireAnimTimer: number = 0;
  private campfireAnimFrame: number = 1;
  private rainPuddleSprites: Phaser.GameObjects.Sprite[] = [];
  private clockUiTimer: number = 0;
  private lastCampfireAudioCheck: number = 0;

  // The Sunken Catacombs Dungeon (Task 7.4)
  public activeFloor: 'overworld' | 'f1' | 'f2' = 'overworld';
  private platformPosOut = { x: 0, y: 0, vx: 0 };
  private dungeonLightingOverlay?: Phaser.GameObjects.Graphics;
  private malakorAuraGraphic?: Phaser.GameObjects.Graphics;

  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private gateBody?: Phaser.Physics.Arcade.Image;
  private playerInvulnerable = false;
  private sporeProjectiles: Array<{ sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; life: number }> = [];
  private spellProjectiles: Array<{
    sprite: Phaser.GameObjects.Sprite;
    spell: SpellDefinition;
    dir: Direction;
    vx: number;
    vy: number;
    rangeRemaining: number;
    trailTimer: number;
    active: boolean;
  }> = [];
  private lastStatusEffectTickTime = 0;
  private coinCombo = 0;
  private lastCoinPickupTime = 0;

  // Dynamic Camera Director & Look-Ahead
  private camOffsetX = 0;
  private camOffsetY = 0;
  private isCinematicPanning = false;

  // Biome Color Grading & Atmospheric Ambient Lighting
  private ambientOverlay!: Phaser.GameObjects.Rectangle;
  private currentBiome: string | null = null;

  // X-Ray Occlusion Silhouettes & Punch-Hole
  private playerSilhouette!: Phaser.GameObjects.Sprite;
  private enemySilhouettes = new Map<string, Phaser.GameObjects.Sprite>();
  private roofTiles: Array<{ image: Phaser.GameObjects.Image; x: number; y: number }> = [];
  private pointLights: Array<{ x: number; y: number; glow: Phaser.GameObjects.Image }> = [];

  // Interaction prompt & target reticle
  private promptContainer!: Phaser.GameObjects.Container;
  private promptBg!: Phaser.GameObjects.Graphics;
  private promptReticle!: Phaser.GameObjects.Graphics;
  private promptActionText!: Phaser.GameObjects.Text;
  private promptAlpha = 0;

  // Combat feel & telegraphing
  private hitstopTimer: any = null;
  public bossStunnedUntil = 0;
  private bossDizzyStars: Phaser.GameObjects.Sprite[] = [];
  private enemyHealthBars = new Map<string, { bg: Phaser.GameObjects.Graphics; fg: Phaser.GameObjects.Graphics }>();

  // Seamless Building Interiors & Roof-Lift
  private cottages: Array<{
    id: string;
    label: string;
    bounds: Phaser.Geom.Rectangle;
    roofTiles: Phaser.GameObjects.Image[];
    isInside: boolean;
  }> = [];

  // Multiplayer Social Synergy & Co-Op
  private airbornePots = new Map<string, {
    pot: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Sprite;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    startTime: number;
    duration: number;
    tween: Phaser.Tweens.Tween;
  }>();

  // Secondary Foliage Motion & Wind Simulation
  private treeCanopies: Array<{
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    baseX: number;
    baseY: number;
  }> = [];

  private interactiveFoliage: Array<{
    sprite: Phaser.GameObjects.Sprite;
    baseX: number;
    baseY: number;
    currentBend: number;
    targetBend: number;
  }> = [];

  private lastDuckRippleTime = 0;
  private lastBusterZzzTime = 0;

  // Environmental Decals & Persistent World Scars
  private static readonly MAX_DECALS = 120;
  private decalPool: Array<{
    image: Phaser.GameObjects.Image;
    spawnTime: number;
    lingerDuration: number;
    fadeDuration: number;
    initialAlpha: number;
    active: boolean;
  }> = [];
  private decalIndex = 0;

  // Elevation Ledge Mechanics & Pitfalls
  private cliffLedges: Array<{
    bounds: Phaser.Geom.Rectangle;
    landingY: number;
  }> = [];

  private pitfalls: Array<{
    x: number;
    y: number;
    safeX: number;
    safeY: number;
    radius: number;
  }> = [];

  private enemyConfusedIcons = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    // 2048x1792 (64x56 tiles of 32px)
    this.physics.world.setBounds(0, 0, 2048, 1792);

    // 1. Build the Multi-Zone World Tiles & Environment
    this.buildWorld();

    // 1a. Pre-Allocated Environmental Decal Pool
    this.setupDecalPool();

    // 1b. Interaction Prompt & Reticle
    this.setupInteractionPrompt();

    // 1c. Occlusion X-Ray Silhouette for player (depth 3500, bright cyan #38bdf8)
    this.playerSilhouette = this.add.sprite(0, 0, 'player_0_down_idle');
    this.applyTintFill(this.playerSilhouette, 0x38bdf8);
    this.playerSilhouette.setAlpha(0);
    this.playerSilhouette.setDepth(3500);

    // 1d. Biome Color Grading & Atmospheric Ambient Lighting Overlay
    this.ambientOverlay = this.add.rectangle(1024, 896, 2048, 1792, 0xf59e0b);
    this.ambientOverlay.setDepth(1500);
    this.ambientOverlay.setAlpha(0.06);

    // 1e. Centralized Zero-Allocation VFX & Ambient Particle Pipeline
    this.particles = new ParticlePipeline(this);

    // 1f. Physics Inspector & Bounding Box Wireframe Renderer (depth 99999)
    this.physicsDebugGraphics = this.add.graphics();
    this.physicsDebugGraphics.setDepth(99999);

    // 2. Setup Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        J: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
        K: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
        SHIFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        L: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
        Q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        R: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
        TILDE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK),
        ONE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        TWO: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        THREE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        FOUR: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
        FIVE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
        SIX: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
        Z: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        X: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
        F3: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3)
      };

      // F3: In-Engine Telemetry & Profiler (Issue #37)
      this.keys.F3.on('down', () => (window as any).BitQuestTelemetry?.toggle());

      // F: Fishing Cast & Reel
      this.keys.F.on('down', () => this.handleActionFishing(true));
      this.keys.F.on('up', () => this.handleActionFishing(false));

      // Pointer / Click / Touch to Cast and Reel
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isLocalFishing) {
          this.handleReelInput(true);
          return;
        }
        if (this.localPlayer) {
          const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const dist = Math.hypot(worldPoint.x - this.localPlayer.x, worldPoint.y - this.localPlayer.y);
          if (dist >= FishingEngine.MIN_CAST_DISTANCE && dist <= FishingEngine.MAX_CAST_DISTANCE) {
            if (FishingEngine.isWaterPixel(worldPoint.x, worldPoint.y, this.activeFloor)) {
              this.castFishingLine(worldPoint.x, worldPoint.y);
            }
          }
        }
      });
      this.input.on('pointerup', () => {
        if (this.isLocalFishing) {
          this.handleReelInput(false);
        }
      });

      // Space / J: Attack / Throw (or Reel during fishing!)
      this.keys.SPACE.on('down', () => {
        if (this.isLocalFishing) {
          this.handleReelInput(true);
        } else {
          this.handleActionAttack();
        }
      });
      this.keys.SPACE.on('up', () => {
        if (this.isLocalFishing) {
          this.handleReelInput(false);
        }
      });
      this.keys.J.on('down', () => {
        if (this.isLocalFishing) {
          this.handleReelInput(true);
        } else {
          this.handleActionAttack();
        }
      });
      this.keys.J.on('up', () => {
        if (this.isLocalFishing) {
          this.handleReelInput(false);
        }
      });

      // Shift / L: Dodge Roll
      this.keys.SHIFT.on('down', () => this.localPlayer?.roll());
      this.keys.L.on('down', () => this.localPlayer?.roll());

      // Backtick / Tilde: Toggle Admin Panel
      this.keys.TILDE.on('down', () => (window as any).BitQuestUI?.toggleAdminPanel());

      // E / K: Interact / Lift / Talk
      this.keys.E.on('down', () => this.handleActionInteract());
      this.keys.K.on('down', () => this.handleActionInteract());

      // Class Abilities: Z (Ability 1), X (Ability 2)
      this.keys.Z.on('down', () => this.useClassAbility(1));
      this.keys.X.on('down', () => this.useClassAbility(2));

      // Magic Spells: 1 / Q (Fireball), 2 (Ice Lance), 3 / R (Gale Ward)
      this.keys.ONE.on('down', () => this.castSpell('fireball'));
      this.keys.Q.on('down', () => this.castSpell('fireball'));
      this.keys.TWO.on('down', () => this.castSpell('ice_lance'));
      this.keys.THREE.on('down', () => this.castSpell('gale_ward'));
      this.keys.R.on('down', () => this.castSpell('gale_ward'));

      // Emote shortcuts
      this.keys.FOUR.on('down', () => this.triggerEmote('heart'));
      this.keys.FIVE.on('down', () => this.triggerEmote('wave'));
      this.keys.SIX.on('down', () => this.triggerEmote('music'));
    }

    // 3. Connect to Multiplayer Network
    this.setupNetwork();

    // 4. Camera bounds
    this.cameras.main.setBounds(0, 0, 2048, 1792);
    this.cameras.main.setZoom(1.35); // Cozy pixel zoom (expanded FOV)

    // 5. Dungeon Subterranean Lighting Overlay
    this.dungeonLightingOverlay = this.add.graphics();
    this.dungeonLightingOverlay.setDepth(3400);
    this.dungeonLightingOverlay.setVisible(false);

    // 6. Dynamic Day/Night Cycle, Weather & Campfire Systems (Issue #24)
    this.dayNightDarknessOverlay = this.add.graphics();
    this.dayNightDarknessOverlay.setDepth(2900);
    this.dayNightDarknessOverlay.setVisible(true);

    this.lightningFlashOverlay = this.add.rectangle(0, 0, 4000, 4000, 0xffffff);
    this.lightningFlashOverlay.setDepth(3800);
    this.lightningFlashOverlay.setAlpha(0);
    this.lightningFlashOverlay.setScrollFactor(0);

    this.rainGraphics = this.add.graphics();
    this.rainGraphics.setDepth(3100);

    this.fireflyGraphics = this.add.graphics();
    this.fireflyGraphics.setDepth(2800);

    // Initialize 140 pre-allocated rain drops
    for (let i = 0; i < 140; i++) {
      this.rainDrops.push({
        x: Math.random() * 2048,
        y: Math.random() * 1792,
        length: 12 + Math.random() * 10,
        speed: 550 + Math.random() * 200,
        alpha: 0.35 + Math.random() * 0.4
      });
    }

    // Initialize 24 pre-allocated fireflies across meadow, lake shoreline and town outskirts
    const fireflyOrigins = [
      { x: 1400, y: 750 }, { x: 1520, y: 800 }, { x: 1650, y: 880 }, { x: 1580, y: 1020 },
      { x: 1440, y: 920 }, { x: 1680, y: 720 }, { x: 1720, y: 960 }, { x: 1500, y: 1100 },
      { x: 750, y: 1350 }, { x: 880, y: 1380 }, { x: 1050, y: 1420 }, { x: 1250, y: 1380 },
      { x: 1380, y: 1350 }, { x: 680, y: 1400 }, { x: 820, y: 950 }, { x: 1220, y: 950 },
      { x: 380, y: 750 }, { x: 440, y: 920 }, { x: 520, y: 820 }, { x: 600, y: 1050 },
      { x: 920, y: 680 }, { x: 1120, y: 680 }, { x: 1480, y: 650 }, { x: 1620, y: 620 }
    ];
    fireflyOrigins.forEach(o => {
      this.fireflies.push({
        baseX: o.x,
        baseY: o.y,
        x: o.x,
        y: o.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.6
      });
    });

    // Initialize pre-placed dynamic rain puddles
    const puddleLocations = [
      { x: 1024, y: 780, tex: 'prop_rain_puddle_med' },
      { x: 950, y: 840, tex: 'prop_rain_puddle_small' },
      { x: 1100, y: 840, tex: 'prop_rain_puddle_small' },
      { x: 1024, y: 1080, tex: 'prop_rain_puddle_med' },
      { x: 860, y: 920, tex: 'prop_rain_puddle_small' },
      { x: 1180, y: 920, tex: 'prop_rain_puddle_small' },
      { x: 1460, y: 820, tex: 'prop_rain_puddle_med' },
      { x: 1580, y: 940, tex: 'prop_rain_puddle_small' },
      { x: 1024, y: 1240, tex: 'prop_rain_puddle_med' },
      { x: 450, y: 860, tex: 'prop_rain_puddle_small' },
      { x: 960, y: 380, tex: 'prop_rain_puddle_small' },
      { x: 1088, y: 380, tex: 'prop_rain_puddle_small' }
    ];
    puddleLocations.forEach(loc => {
      const spr = this.add.sprite(loc.x, loc.y, loc.tex);
      spr.setDepth(loc.y - 10);
      spr.setAlpha(0);
      this.rainPuddleSprites.push(spr);
    });
  }

  private buildWorld() {
    const TILE = 32;
    const MAP_W = 64; // 2048px
    const MAP_H = 56; // 1792px

    this.obstacles = this.physics.add.staticGroup();

    // 1. Biome Base Terrain
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        let tileKey = 'tile_grass';

        // Biome: Fungal Hollow (Full West side, x < 20)
        if (x < 20) {
          tileKey = 'tile_fungal_grass';
        }
        // Biome: Sunken Ruins & Sanctuary (North, x: 20 to 43, y: 2 to 17)
        else if (x >= 20 && x <= 43 && y <= 17) {
          tileKey = 'tile_ruins_floor';
        }
        // Biome: Oakhaven Town Plaza (Center, x: 24 to 39, y: 24 to 35)
        else if (x >= 24 && x <= 39 && y >= 24 && y <= 35) {
          tileKey = 'tile_cobble';
        }

        this.add.image(x * TILE + 16, y * TILE + 16, tileKey);
      }
    }

    // 2. Dirt Connecting Pathways
    // North path towards Sunken Gate (x: 31-32, y: 17 to 24)
    for (let y = 17; y < 24; y++) {
      this.add.image(31 * TILE + 16, y * TILE + 16, 'tile_dirt');
      this.add.image(32 * TILE + 16, y * TILE + 16, 'tile_dirt');
    }
    // East path to Whispering Meadow (x: 40 to 52, y: 29-30)
    for (let x = 40; x <= 52; x++) {
      this.add.image(x * TILE + 16, 29 * TILE + 16, 'tile_dirt');
      this.add.image(x * TILE + 16, 30 * TILE + 16, 'tile_dirt');
    }
    // West path to Fungal Hollow (x: 12 to 23, y: 29-30)
    for (let x = 12; x <= 23; x++) {
      this.add.image(x * TILE + 16, 29 * TILE + 16, 'tile_dirt');
      this.add.image(x * TILE + 16, 30 * TILE + 16, 'tile_dirt');
    }
    // South path towards Crystal Lake (x: 31-32, y: 36 to 40)
    for (let y = 36; y <= 40; y++) {
      this.add.image(31 * TILE + 16, y * TILE + 16, 'tile_dirt');
      this.add.image(32 * TILE + 16, y * TILE + 16, 'tile_dirt');
    }

    // 3. Whispering Meadow Azure River (tileX: 52-53, tileY: 1 to 54)
    for (let y = 1; y <= 54; y++) {
      for (let x = 52; x <= 53; x++) {
        // Wooden footbridge across the river at y: 29-30
        if (y === 29 || y === 30) {
          this.add.image(x * TILE + 16, y * TILE + 16, 'tile_bridge_wood');
        } else {
          this.add.image(x * TILE + 16, y * TILE + 16, 'tile_water');
          const col = this.obstacles.create(x * TILE + 16, y * TILE + 16, undefined);
          col.setVisible(false);
          col.body.setSize(32, 32);
        }
      }
    }

    // 4. South Crystal Lake (tileX: 22 to 42, tileY: 41 to 54)
    for (let y = 41; y <= 54; y++) {
      for (let x = 22; x <= 42; x++) {
        // Wooden dock extending into the lake
        if ((x === 31 || x === 32) && y <= 44) {
          this.add.image(x * TILE + 16, y * TILE + 16, 'tile_bridge_wood');
        } else {
          this.add.image(x * TILE + 16, y * TILE + 16, 'tile_water');
          const col = this.obstacles.create(x * TILE + 16, y * TILE + 16, undefined);
          col.setVisible(false);
          col.body.setSize(32, 32);
        }
      }
    }

    // 5. Town Square Cottages
    // West: Post Office / Barnaby's Roost (tileX: 22, tileY: 25, 4x3)
    this.createCottage(22, 25, 4, 3, 'Post & Courier', 'courier');
    // East: Grandma Bramble's Blackberry Bakery (tileX: 38, tileY: 25, 4x3)
    this.createCottage(38, 25, 4, 3, 'Bramble Jam Bakery', 'bakery');

    // 6. Ancient Ruins Perimeter Walls (North, x: 20 to 43, y: 16)
    for (let x = 20; x <= 43; x++) {
      if (x !== 31 && x !== 32) {
        const wall = this.obstacles.create(x * TILE + 16, 16 * TILE + 16, 'tile_wall_stone');
        wall.refreshBody();
      }
    }
    // North wall of Ruins (y: 2)
    for (let x = 20; x <= 43; x++) {
      this.obstacles.create(x * TILE + 16, 2 * TILE + 16, 'tile_wall_stone').refreshBody();
    }
    // East & West walls of Ruins
    for (let y = 2; y <= 16; y++) {
      this.obstacles.create(20 * TILE + 16, y * TILE + 16, 'tile_wall_stone').refreshBody();
      this.obstacles.create(43 * TILE + 16, y * TILE + 16, 'tile_wall_stone').refreshBody();
    }

    // Gate collision body at (1024, 512)
    this.gateBody = this.obstacles.create(1024, 512, undefined);
    this.gateBody.setVisible(false);
    this.gateBody.body.setSize(64, 40);

    // 7. Outer World Borders (Dense Tree / Fungal Canopies)
    for (let x = 0; x < MAP_W; x++) {
      const topTex = (x < 20) ? 'tile_fungal_canopy' : 'tile_tree_canopy';
      const topTree = this.obstacles.create(x * TILE + 16, 16, topTex);
      topTree.refreshBody();
      this.treeCanopies.push({ sprite: topTree, baseX: x * TILE + 16, baseY: 16 });

      const botTree = this.obstacles.create(x * TILE + 16, (MAP_H - 1) * TILE + 16, 'tile_tree_canopy');
      botTree.refreshBody();
      this.treeCanopies.push({ sprite: botTree, baseX: x * TILE + 16, baseY: (MAP_H - 1) * TILE + 16 });
    }
    for (let y = 0; y < MAP_H; y++) {
      const leftTree = this.obstacles.create(16, y * TILE + 16, 'tile_fungal_canopy');
      leftTree.refreshBody();
      this.treeCanopies.push({ sprite: leftTree, baseX: 16, baseY: y * TILE + 16 });

      const rightTree = this.obstacles.create((MAP_W - 1) * TILE + 16, y * TILE + 16, 'tile_tree_canopy');
      rightTree.refreshBody();
      this.treeCanopies.push({ sprite: rightTree, baseX: (MAP_W - 1) * TILE + 16, baseY: y * TILE + 16 });
    }

    // 7b. Interactive Wildflowers & Tall Grass Tufts
    const foliageSpots = [
      // Whispering Meadow (East & South-East)
      { x: 1450, y: 800, tex: 'prop_flower_red' },
      { x: 1520, y: 760, tex: 'prop_flower_yellow' },
      { x: 1600, y: 850, tex: 'prop_flower_blue' },
      { x: 1480, y: 920, tex: 'prop_grass_tuft' },
      { x: 1580, y: 980, tex: 'prop_grass_tuft' },
      { x: 1650, y: 720, tex: 'prop_flower_yellow' },
      { x: 1720, y: 820, tex: 'prop_grass_tuft' },
      { x: 1420, y: 1050, tex: 'prop_flower_blue' },
      { x: 1530, y: 1120, tex: 'prop_flower_red' },
      { x: 1680, y: 1100, tex: 'prop_grass_tuft' },
      // Town Square edges
      { x: 740, y: 880, tex: 'prop_flower_yellow' },
      { x: 760, y: 940, tex: 'prop_grass_tuft' },
      { x: 1280, y: 880, tex: 'prop_flower_red' },
      { x: 1300, y: 940, tex: 'prop_grass_tuft' },
      { x: 920, y: 750, tex: 'prop_flower_blue' },
      { x: 1120, y: 750, tex: 'prop_flower_yellow' },
      // Crystal Lake shoreline
      { x: 720, y: 1320, tex: 'prop_grass_tuft' },
      { x: 800, y: 1350, tex: 'prop_flower_blue' },
      { x: 1350, y: 1320, tex: 'prop_grass_tuft' },
      { x: 1400, y: 1360, tex: 'prop_flower_yellow' }
    ];

    for (const spot of foliageSpots) {
      const sprite = this.add.sprite(spot.x, spot.y, spot.tex);
      sprite.setDepth(spot.y);
      sprite.setOrigin(0.5, 0.9);
      this.interactiveFoliage.push({
        sprite,
        baseX: spot.x,
        baseY: spot.y,
        currentBend: 0,
        targetBend: 0
      });
    }

    // 8. Braziers & Point Lights (Sunken Gate, Cavern Sanctuary, Town Center)
    const lightPositions = [
      { x: 992, y: 512 },   // Left Gate Brazier
      { x: 1056, y: 512 },  // Right Gate Brazier
      { x: 800, y: 300 },   // West Sanctuary Torch
      { x: 1248, y: 300 },  // East Sanctuary Torch
      { x: 1024, y: 928 }   // Town Square Lantern
    ];

    for (const pos of lightPositions) {
      const glow = this.add.image(pos.x, pos.y, 'light_glow');
      glow.setDepth(pos.y - 2);
      glow.setScale(1.2);
      glow.setAlpha(0.45);

      this.tweens.add({
        targets: glow,
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0.60,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.pointLights.push({ x: pos.x, y: pos.y, glow });
    }

    // 9. Whispering Meadow Elevation Cliff Ledges (tileX: 45 to 50, tileY: 22)
    for (let x = 45; x <= 50; x++) {
      const ledgeImg = this.add.image(x * TILE + 16, 22 * TILE + 16, 'tile_cliff_ledge');
      ledgeImg.setDepth(22 * TILE + 16);

      // Solid obstacle body on lower half preventing lower enemies / players from walking UP
      const col = this.obstacles.create(x * TILE + 16, 22 * TILE + 24, undefined);
      col.setVisible(false);
      col.body.setSize(32, 16);
      col.body.immovable = true;

      // Trigger bounds on upper lip for spring jumping down
      this.cliffLedges.push({
        bounds: new Phaser.Geom.Rectangle(x * TILE, 22 * TILE, 32, 14),
        landingY: 22 * TILE + 50
      });
    }

    // 10. Bottomless Pitfall Chasm Holes (North Sanctuary Terrace & Ruins)
    const pitPositions = [
      { tileX: 25, tileY: 10, safeX: 25 * TILE + 16, safeY: 12 * TILE },
      { tileX: 38, tileY: 10, safeX: 38 * TILE + 16, safeY: 12 * TILE }
    ];

    for (const pit of pitPositions) {
      const pitImg = this.add.image(pit.tileX * TILE + 16, pit.tileY * TILE + 16, 'tile_pit_void');
      pitImg.setDepth(1);
      this.pitfalls.push({
        x: pit.tileX * TILE + 16,
        y: pit.tileY * TILE + 16,
        safeX: pit.safeX,
        safeY: pit.safeY,
        radius: 14
      });
    }

    // 11. Subterranean World: The Sunken Catacombs (Floor 1 & Floor 2)
    this.buildCatacombsDungeon();

    // 12. Cozy Community Farm & Garden Plots (Expansion Milestone 1)
    this.setupGardenPlots();

    // 13. Cozy Hearth & Bakery Oven Cooking Stations (Expansion Milestone 2)
    this.setupCookingStations();
  }

  private setupCookingStations() {
    // 1. Whispering Meadow River Campfire
    this.campfireCookingProp = this.add.sprite(640, 720, 'prop_campfire');
    this.campfireCookingProp.setDepth(20 + 720);

    // 2. Grandma Bramble's Bakery Oven (near garden & bakery)
    this.bakeryOvenProp = this.add.sprite(1410, 840, 'prop_bakery_oven');
    this.bakeryOvenProp.setDepth(20 + 840);
  }

  private setupGardenPlots() {
    const TILE = 32;
    // Grandma Bramble's Community Garden (tileX: 43 to 46, tileY: 26 to 28)
    const initialCrops: Array<{ x: number; y: number; seed: string }> = [
      { x: 43, y: 26, seed: 'seed_turnip' },
      { x: 44, y: 26, seed: 'seed_turnip' },
      { x: 45, y: 26, seed: 'seed_strawberry' },
      { x: 46, y: 26, seed: 'seed_strawberry' },
      { x: 43, y: 27, seed: 'seed_corn' },
      { x: 44, y: 27, seed: 'seed_corn' },
      { x: 45, y: 27, seed: 'seed_glowshroom' },
      { x: 46, y: 27, seed: 'seed_acorn' },
      { x: 43, y: 28, seed: 'seed_turnip' },
      { x: 44, y: 28, seed: 'seed_strawberry' },
      { x: 45, y: 28, seed: 'seed_corn' },
      { x: 46, y: 28, seed: 'seed_turnip' }
    ];

    for (const plotInfo of initialCrops) {
      farmingManager.tillPlot(plotInfo.x, plotInfo.y);
      farmingManager.plantCrop(plotInfo.x, plotInfo.y, plotInfo.seed);
      farmingManager.waterPlot(plotInfo.x, plotInfo.y);

      const px = plotInfo.x * TILE + 16;
      const py = plotInfo.y * TILE + 16;
      const key = `${plotInfo.x},${plotInfo.y}`;

      // Soil tile image (depth 5, above base grass, beneath entities)
      const soilImg = this.add.image(px, py, 'tile_soil_tilled_wet');
      soilImg.setDepth(5);
      this.farmSoilSprites.set(key, soilImg);

      // Crop sprite (depth 20 + py for proper Y-sorting)
      const cropSpr = this.add.sprite(px, py, 'crop_stage_1');
      cropSpr.setDepth(20 + py);
      this.farmCropSprites.set(key, cropSpr);
    }
  }

  private updateFarming(delta: number) {
    const isRaining = this.currentWeather === 'rain' || this.currentWeather === 'storm';
    farmingManager.update(delta / 1000, isRaining);

    const plots = farmingManager.getAllPlots();
    for (const plot of plots) {
      const key = `${plot.x},${plot.y}`;
      const soilImg = this.farmSoilSprites.get(key);
      if (soilImg) {
        soilImg.setTexture(plot.isWatered ? 'tile_soil_tilled_wet' : 'tile_soil_tilled_dry');
      }

      const cropSpr = this.farmCropSprites.get(key);
      if (cropSpr) {
        if (!plot.cropSpecies) {
          cropSpr.setVisible(false);
        } else {
          cropSpr.setVisible(true);
          let tex = 'crop_stage_0';
          if (plot.stage === 0) {
            tex = 'crop_stage_0';
          } else if (plot.stage === 1) {
            tex = 'crop_stage_1';
          } else if (plot.stage === 2) {
            tex = 'crop_stage_2';
          } else {
            // Stage 3 mature texture
            tex = `crop_${plot.cropSpecies}_3`;
          }
          if (cropSpr.texture.key !== tex && this.textures.exists(tex)) {
            cropSpr.setTexture(tex);
          }
        }
      }
    }
  }

  private updateCookingBuffs() {
    if (!this.localPlayer || !this.buffTotals) return;
    this.localPlayer.foodSpeedMultiplier = this.buffTotals.speedMultiplier;
    this.localPlayer.foodBonusMaxHp = this.buffTotals.bonusMaxHp;
    this.localPlayer.foodAttackMultiplier = this.buffTotals.attackPowerMultiplier;
    this.localPlayer.foodDefenseReduction = this.buffTotals.defenseReduction;
  }

  private buildCatacombsDungeon() {
    const TILE = 32;

    // Floor 1: The Forgotten Crypts (y: 2150..3600, tileY: 67..112)
    for (let ty = 67; ty <= 112; ty++) {
      for (let tx = 20; tx <= 44; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_wall');
      }
    }

    // Floor 1 Walkable Corridors & Chambers (Crypt Slate Floor)
    for (let ty = 69; ty <= 88; ty++) {
      for (let tx = 26; tx <= 38; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_floor');
      }
    }

    // Floor 1 Abyssal Chasm (tileY: 93..98, tileX: 24..40)
    for (let ty = 93; ty <= 98; ty++) {
      for (let tx = 24; tx <= 40; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_abyss');
      }
    }

    // Floor 1 Descent Hall to Floor 2 (tileY: 99..110, tileX: 28..36)
    for (let ty = 99; ty <= 110; ty++) {
      for (let tx = 28; tx <= 36; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_floor');
      }
    }

    // Floor 2: The Abyssal Sanctuary (y: 3950..5400, tileY: 124..168)
    for (let ty = 124; ty <= 168; ty++) {
      for (let tx = 20; tx <= 44; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_wall');
      }
    }

    // Floor 2 Grand Boss Arena (tileY: 130..162, tileX: 24..40)
    for (let ty = 130; ty <= 162; ty++) {
      for (let tx = 24; tx <= 40; tx++) {
        this.add.image(tx * TILE + 16, ty * TILE + 16, 'tile_catacombs_floor');
      }
    }
  }

  private createCottage(tileX: number, tileY: number, w: number, h: number, label: string, theme: 'courier' | 'bakery') {
    const TILE = 32;
    const roofTiles: Phaser.GameObjects.Image[] = [];

    // 1. Interior Wooden Floor Planks (Warm parquet oak)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const floor = this.add.image((tileX + x) * TILE + 16, (tileY + y) * TILE + 16, 'tile_floor_interior');
        floor.setDepth(2);
      }
    }

    // 2. Outer Walls with Open Doorway (x = 1 and 2 on south wall)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isNorth = (y === 0);
        const isSouth = (y === h - 1);
        const isWest = (x === 0);
        const isEast = (x === w - 1);
        const isDoorway = isSouth && (x === 1 || x === 2);

        if ((isNorth || isSouth || isWest || isEast) && !isDoorway) {
          const wall = this.obstacles.create((tileX + x) * TILE + 16, (tileY + y) * TILE + 16, 'tile_wall_wood');
          wall.setDepth((tileY + y) * TILE + 16);
          wall.refreshBody();
        }
      }
    }

    // 3. Cozy Furnishings & Interior Props
    if (theme === 'bakery') {
      // Fireplace with glowing embers against north wall
      const fp = this.add.sprite((tileX + 1) * TILE + 16, (tileY) * TILE + 18, 'prop_fireplace');
      fp.setDepth((tileY + 1) * TILE);

      // Bakery shop counter with jam jars
      const counter = this.add.sprite((tileX + 3) * TILE + 8, (tileY + 1) * TILE + 16, 'prop_counter_wood');
      counter.setDepth((tileY + 1) * TILE + 10);
      const col = this.obstacles.create((tileX + 3) * TILE + 8, (tileY + 1) * TILE + 16, undefined);
      col.setVisible(false);
      col.body.setSize(24, 18);

      // Round berry hearth rug
      const rug = this.add.image((tileX + 1.5) * TILE + 16, (tileY + 1.2) * TILE + 16, 'prop_rug_round');
      rug.setDepth(3);
    } else if (theme === 'courier') {
      // Scholarly bookshelf with books & rolled parchment
      const shelf = this.add.sprite((tileX + 1) * TILE + 16, (tileY) * TILE + 18, 'prop_bookshelf');
      shelf.setDepth((tileY + 1) * TILE);

      // Courier dispatch desk
      const counter = this.add.sprite((tileX + 3) * TILE + 8, (tileY + 1) * TILE + 16, 'prop_counter_wood');
      counter.setDepth((tileY + 1) * TILE + 10);
      const col = this.obstacles.create((tileX + 3) * TILE + 8, (tileY + 1) * TILE + 16, undefined);
      col.setVisible(false);
      col.body.setSize(24, 18);

      // Blue sapphire runner rug
      const rug = this.add.image((tileX + 1.5) * TILE + 16, (tileY + 1.2) * TILE + 16, 'prop_rug_blue');
      rug.setDepth(3);
    }

    // 4. Overhead Roof Layer (Depth higher than interior, smoothly fades on entry)
    const roofDepth = (tileY + h) * TILE + 35;
    for (let ry = tileY - 1; ry <= tileY + h - 2; ry++) {
      for (let rx = tileX; rx < tileX + w; rx++) {
        const roof = this.add.image(rx * TILE + 16, ry * TILE + 16, 'tile_roof_red');
        roof.setDepth(roofDepth);
        roofTiles.push(roof);
        this.roofTiles.push({ image: roof, x: rx * TILE + 16, y: ry * TILE + 16 });
      }
    }

    // 5. Sign above door
    const signText = this.add.text((tileX + w / 2) * TILE, (tileY - 1) * TILE - 4, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fef08a',
      stroke: '#451a03',
      strokeThickness: 2
    });
    signText.setOrigin(0.5, 1);
    signText.setDepth(roofDepth + 1);

    // 6. Register Cottage Building for Roof-Lift Manager
    const minX = tileX * TILE;
    const minY = (tileY - 0.5) * TILE;
    const widthPx = w * TILE;
    const heightPx = (h + 0.5) * TILE;

    this.cottages.push({
      id: `cottage_${tileX}_${tileY}`,
      label,
      bounds: new Phaser.Geom.Rectangle(minX, minY, widthPx, heightPx),
      roofTiles,
      isInside: false
    });
  }

  private setupNetwork() {
    network.onInit = (data) => {
      console.log('[WorldScene] Received Init from server. Spawning world...');

      data.entities.forEach(ent => this.renderEntity(ent));

      if (data.items) {
        data.items.forEach(it => this.renderItem(it));
      }

      if (data.worldFlags['ancient_gate_opened']) {
        this.openGate(false);
      }

      const myProfile = data.players.find(p => p.id === data.yourId);
      const name = (window as any).BitQuestUser?.name || 'Hero';
      const palette = (window as any).BitQuestUser?.palette ?? 0;

      if (!this.localPlayer) {
        this.spawnLocalPlayer(data.yourId, myProfile?.x || 1024, myProfile?.y || 950, name, palette);
      }

      if (myProfile && this.localPlayer) {
        if (myProfile.equipment && myProfile.vanity) {
          this.localPlayer.updateEquipment(myProfile.equipment, myProfile.vanity);
        }
        this.localPlayer.health = myProfile.health || 3;
        this.localPlayer.maxHealth = myProfile.maxHealth || 3;
        this.localPlayer.mana = myProfile.mana || 50;
        this.localPlayer.maxMana = myProfile.maxMana || 50;
        this.localPlayer.coins = myProfile.coins || 0;
        this.localPlayer.acorns = myProfile.acorns || 0;
        (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);
        (window as any).BitQuestUI?.updateMana(this.localPlayer.mana, this.localPlayer.maxMana);
        (window as any).BitQuestUI?.updateCurrency(this.localPlayer.coins, this.localPlayer.acorns);
      }

      if (data.weather) {
        this.currentWeather = data.weather;
        this.updateWeatherAudio(this.currentWeather);
      }
      if (data.timeOfDaySec !== undefined) {
        this.timeOfDaySec = data.timeOfDaySec;
      }
      (window as any).BitQuestUI?.updateClockAndWeather?.(this.timeOfDaySec, this.currentWeather);

      data.players.forEach(p => {
        if (p.id !== data.yourId) {
          this.spawnOtherPlayer(p);
        }
      });
    };

    network.onPlayerJoined = (player) => {
      if (player.id !== network.yourId && !this.otherPlayers.has(player.id)) {
        this.spawnOtherPlayer(player);
      }
    };

    network.onPlayerLeft = (id) => {
      const other = this.otherPlayers.get(id);
      if (other) {
        other.destroy();
        this.otherPlayers.delete(id);
      }
    };

    network.onWorldTick = (players) => {
      players.forEach(p => {
        if (p.id !== network.yourId) {
          const other = this.otherPlayers.get(p.id);
          if (other) {
            other.setTargetState(p.x, p.y, p.direction, p.anim, p.carryingItem);
          }
        }
      });
    };

    network.onReconcile = (ackSeq, x, y) => {
      this.localPlayer?.reconcilePosition(ackSeq, x, y);
    };

    network.onEntityUpdated = (ent) => {
      this.worldEntities.set(ent.id, ent);
      this.updateEntityVisuals(ent);
    };

    network.onWorldFlagUpdated = (key, val) => {
      if (key === 'ancient_gate_opened') {
        if (val) this.openGate(true);
        else this.closeGate();
      } else if (key === 'duo_vault_unlocked' && val) {
        sounds.playDuoSolveFanfare();
        this.showFloatingText(1024, 410, "✨ DUO VAULT UNLOCKED! ✨", "#facc15");
      }
    };

    network.onSocialResonance = (data) => {
      this.handleSocialResonance(data);
    };

    network.onPotThrown = (data) => {
      this.handleAirbornePotThrown(data);
    };

    network.onPotCaught = (data) => {
      this.handlePotCaught(data);
    };

    network.onChatBroadcast = (chat) => {
      if (chat.senderId === network.yourId && this.localPlayer) {
        this.localPlayer.showChatBubble(chat.text);
      } else {
        const other = this.otherPlayers.get(chat.senderId);
        if (other) other.showChatBubble(chat.text);
      }
      (window as any).BitQuestUI?.addChatMessage(chat);
    };

    network.onEmoteBroadcast = (emote) => {
      if (emote.senderId === network.yourId && this.localPlayer) {
        this.localPlayer.showEmote(emote.emote);
      } else {
        const other = this.otherPlayers.get(emote.senderId);
        if (other) other.showEmote(emote.emote);
      }
    };

    network.onDialogueEvent = (diag) => {
      (window as any).BitQuestUI?.showDialogue(diag);
    };

    network.onItemSpawned = (item) => {
      this.renderItem(item);
    };

    network.onItemCollected = (data) => {
      this.removeItem(data.itemId, data.collectorId, data.itemType, data.value);
    };

    network.onPlayerStatsUpdated = (stats) => {
      if (stats.id === network.yourId && this.localPlayer) {
        this.localPlayer.health = stats.health;
        this.localPlayer.maxHealth = stats.maxHealth;
        this.localPlayer.mana = stats.mana ?? 50;
        this.localPlayer.maxMana = stats.maxMana ?? 50;
        this.localPlayer.manaPool.current = this.localPlayer.mana;
        this.localPlayer.manaPool.max = this.localPlayer.maxMana;
        this.localPlayer.coins = stats.coins;
        this.localPlayer.acorns = stats.acorns;
        (window as any).BitQuestUI?.updateHearts(stats.health, stats.maxHealth);
        (window as any).BitQuestUI?.updateMana(this.localPlayer.mana, this.localPlayer.maxMana);
        (window as any).BitQuestUI?.updateCurrency(stats.coins, stats.acorns);
      }
    };

    network.onSpellCast = (data) => {
      if (data.casterId !== network.yourId) {
        const other = this.otherPlayers.get(data.casterId);
        if (other) {
          other.sprite.setTexture(`player_${other.paletteIndex}_${data.direction}_slash`);
          this.time.delayedCall(140, () => {
            other.sprite.setTexture(`player_${other.paletteIndex}_${data.direction}_idle`);
          });
        }
        const spell = SPELL_DEFINITIONS[data.spellId];
        if (spell) {
          this.spawnSpellProjectile(spell, data.x, data.y, data.direction);
        }
      }
    };

    network.onBossEvent = (event) => {
      this.handleBossEvent(event);
    };

    network.onEquipmentUpdated = (data) => {
      if (data.playerId === this.localPlayer?.id) {
        this.localPlayer.updateEquipment(data.equipment, data.vanity, data.stats);
        (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);
        (window as any).BitQuestUI?.updateMana(this.localPlayer.mana, this.localPlayer.maxMana);
        (window as any).BitQuestUI?.equipmentSheet?.updateSheet();
      } else {
        const other = this.otherPlayers.get(data.playerId);
        if (other) {
          other.updateEquipment(data.equipment, data.vanity);
        }
      }
    };

    network.onArrowShot = (data) => {
      if (data.shooterId !== this.localPlayer?.id) {
        this.shootArrow(data.x, data.y, data.direction, true, data.damage);
      }
    };

    network.onClassUpdated = (data) => {
      if (data.playerId === this.localPlayer?.id && this.localPlayer) {
        this.localPlayer.classId = data.classId;
        (window as any).BitQuestUI?.updateClassAbilityHUD(data.classId, this.localPlayer.mana);
        (window as any).BitQuestUI?.equipmentSheet?.updateSheet();
      } else {
        const other = this.otherPlayers.get(data.playerId);
        if (other) {
          other.classId = data.classId;
        }
      }
    };

    network.onClassAbilityTriggered = (data) => {
      this.handleClassAbilityVFX(data);
    };

    network.onParryEvent = (data) => {
      this.handleParryVFX(data.x, data.y);
    };

    network.onLifeSiphonEvent = (data) => {
      this.handleLifeSiphonVFX(data.casterId, data.targetId, data.amount);
    };

    network.onDungeonTransition = (data) => {
      sounds.playDungeonStairs();
      if (this.localPlayer) {
        this.localPlayer.x = data.x;
        this.localPlayer.y = data.y;
      }
      this.activeFloor = data.floorId;
      if (data.floorId === 'f1') {
        this.cameras.main.setBounds(0, 2150, 2048, 1600);
      } else if (data.floorId === 'f2') {
        this.cameras.main.setBounds(0, 3950, 2048, 1600);
      } else {
        this.cameras.main.setBounds(0, 0, 2048, 1792);
      }
      if ((window as any).BitQuestUI?.biomeBanner) {
        (window as any).BitQuestUI.biomeBanner.show(data.title, data.subtitle);
      }
    };

    network.onTorchLitEvent = (data) => {
      sounds.playTorchIgnite();
      this.emitTorchLitBurst(data.x, data.y);
      if (data.roomSolved) {
        sounds.playGateRumble();
        this.triggerCameraShake(200, 0.005);
        this.showFloatingText(data.x, data.y - 25, "✨ PUZZLE SOLVED!", "#22c55e", true);
      }
    };

    // Fishing Network Event Handlers (Issue #23)
    network.onFishingStarted = (data) => {
      sounds.playCastLine();
      this.spawnFishingBobber(data.playerId, data.startX, data.startY, data.targetX, data.targetY);
      if (this.localPlayer && data.playerId === network.yourId) {
        this.isLocalFishing = true;
        this.fishingPhase = 'waiting';
        this.fishingTargetPos.x = data.targetX;
        this.fishingTargetPos.y = data.targetY;
        this.showFloatingText(data.targetX, data.targetY - 14, "🎣 Line Cast...", "#38bdf8", false);
      }
    };

    network.onFishingBite = (data) => {
      if (this.localPlayer && data.playerId === network.yourId) {
        this.fishingPhase = 'bite';
        sounds.playBobberBite();
        this.emitWaterRipple(this.fishingTargetPos.x, this.fishingTargetPos.y, 28);
        this.showBiteAlert(this.fishingTargetPos.x, this.fishingTargetPos.y - 20);
        this.createTensionHud();
      }
    };

    network.onFishingTensionSync = (data) => {
      if (this.localPlayer && data.playerId === network.yourId) {
        this.fishingPhase = 'reeling';
        sounds.playReelTick();
        this.updateTensionHud(data.tension, data.sweetSpotCenter, data.reelProgress);
      }
    };

    network.onFishingResolved = (data) => {
      this.cleanupFishingSession(data.playerId);
      if (this.localPlayer && data.playerId === network.yourId) {
        this.isLocalFishing = false;
        this.fishingPhase = 'idle';
        this.destroyTensionHud();

        if (data.result === 'caught') {
          sounds.playFishCatch();
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 30, "✨ CAUGHT!", "#facc15", true);
          this.emitGoldSparkles(this.localPlayer.x, this.localPlayer.y);
          if (data.speciesId && data.sizeCm) {
            (window as any).BitQuestUI?.fishLogbook?.showCatchBanner(data.speciesId, data.sizeCm, !!data.isPersonalBest);
          }
        } else if (data.result === 'snapped') {
          sounds.playLineSnap();
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 25, "❌ LINE SNAPPED!", "#ef4444", true);
        } else if (data.result === 'escaped') {
          sounds.playBushCut();
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 25, "💨 FISH GOT AWAY!", "#94a3b8", false);
        }
      }
    };

    network.onFishLogSync = (data) => {
      if (this.localPlayer && data.playerId === network.yourId) {
        (window as any).BitQuestUI?.fishLogbook?.updateLog(data.log);
      }
    };

    network.onWeatherSync = (data) => {
      this.currentWeather = data.weather;
      this.timeOfDaySec = data.timeOfDaySec;
      this.windAngle = data.windAngle;
      this.windSpeed = data.windSpeed;
      this.updateWeatherAudio(this.currentWeather);
      (window as any).BitQuestUI?.updateClockAndWeather?.(this.timeOfDaySec, this.currentWeather);
    };

    network.onLightningStrike = (data) => {
      this.triggerLightningStrike(data.x, data.y);
    };

    network.onCampfireRest = (data) => {
      if (data.playerId === network.yourId && this.localPlayer) {
        sounds.playCampfireRestHeal();
        this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 28, `+${data.healedHp} HP  +${data.restoredMana} MP`, "#4ade80", true);
        this.emitWarmthSparks(this.localPlayer.x, this.localPlayer.y);
      }
    };

    // Pip's Oddities Shop & Wandering Traders (Issue #25)
    network.onShopSync = (data) => {
      (window as any).BitQuestUI?.shopModal?.openShop(data);
    };

    network.onShopTransactionResult = (data) => {
      (window as any).BitQuestUI?.shopModal?.handleTransactionResult(data);
    };

    // Companion Pets & Mountable Wildlife (Issue #26 / Task 7.8)
    network.onMountToggle = (data) => {
      if (data.playerId === this.localPlayer?.id) {
        this.localPlayer.setMounted(data.mountId);
        if (data.mountId) {
          sounds.playMountUp();
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 28, "🐸 MOUNTED BOGHOPPER!", "#22c55e", true);
        } else {
          sounds.playDismount();
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 20, "Dismounted", "#94a3b8");
        }
      } else {
        const other = this.otherPlayers.get(data.playerId);
        if (other) {
          other.setMounted(data.mountId);
        }
      }
      const mountEnt = this.worldEntities.get(data.mountId || 'mount_frog_mossy');
      if (mountEnt) {
        mountEnt.state.mountedBy = data.mountId ? data.playerId : null;
        this.updateEntityVisuals(mountEnt);
      }
    };

    network.onPetAlert = (data) => {
      sounds.playDogBark();
      if (data.alertType === 'secret') {
        this.showFloatingText(data.x, data.y - 22, data.text, "#facc15", true);
        this.emitGoldSparkles(data.x, data.y);
      } else {
        this.showFloatingText(data.x, data.y - 22, data.text, "#ef4444", true);
      }
    };

    network.onOcarinaNote = (data) => {
      let pan = 0;
      let vol = 0.85;
      if (this.localPlayer) {
        const dx = data.x - this.localPlayer.sprite.x;
        const dy = data.y - this.localPlayer.sprite.y;
        const dist = Math.hypot(dx, dy);
        pan = Math.max(-1, Math.min(1, dx / 300));
        vol = Math.max(0.1, 1 - (dist / 800)) * 0.85;
      }
      sounds.playOcarinaNote(data.note, vol, pan);
      const noteDef = OCARINA_NOTES[data.note];
      this.emitOcarinaNoteVfx(data.x, data.y, noteDef ? noteDef.color : '#38bdf8', noteDef ? noteDef.glyph : '♪');
    };

    network.onOcarinaSong = (data) => {
      sounds.playOcarinaSongDiscovery();
      this.cameras.main.flash(400, 255, 240, 180);
      this.showFloatingText(data.x, data.y - 28, `♪ ${data.songName}! ♪`, '#fde047', true);
      this.emitGoldSparkles(data.x, data.y);
    };

    network.onOcarinaJamResonance = (data) => {
      sounds.playJamResonance();
      this.showFloatingText(data.x, data.y - 36, `✨ HARMONIC JAM RESONANCE! ✨`, '#c084fc', true);
      this.emitGoldSparkles(data.x, data.y);
    };

    network.connect();

    const tryJoin = () => {
      if (network.isConnected) {
        const name = (window as any).BitQuestUser?.name || 'Adventurer';
        const pal = (window as any).BitQuestUser?.palette ?? 0;
        network.sendJoin(name, '#2e9939', pal);
      } else {
        setTimeout(tryJoin, 300);
      }
    };
    tryJoin();
  }

  public spawnLocalPlayer(id: string, x: number, y: number, name: string, paletteIndex: number) {
    const saved = saveManager.currentSave;
    const spawnX = (saved && saved.name === name && saved.x > 50 && saved.x < 1950) ? saved.x : x;
    const spawnY = (saved && saved.name === name && saved.y > 50 && saved.y < 1700) ? saved.y : y;

    this.localPlayer = new Player(this, spawnX, spawnY, id, name, paletteIndex);
    if (chronicles.equippedTitleId) {
      this.localPlayer.setTitle(chronicles.getEquippedTitleName());
    }
    this.physics.add.collider(this.localPlayer, this.obstacles);
    this.cameras.main.startFollow(this.localPlayer, true, 0.12, 0.12);

    if (saved && saved.name === name) {
      if (saved.coins > 0) this.localPlayer.coins = saved.coins;
      if (saved.acorns > 0) this.localPlayer.acorns = saved.acorns;
      if (saved.health > 0) this.localPlayer.health = saved.health;
      (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);
      (window as any).BitQuestUI?.updateCurrency(this.localPlayer.coins, this.localPlayer.acorns);
    }

    this.playerGlow = this.add.image(spawnX, spawnY, 'light_glow');
    this.playerGlow.setDepth(1);
    this.playerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.playerGlow.setScale(1.4);
    this.playerGlow.setAlpha(0.65);

    // Initialize procedural ambient BGM
    const initBiome = (spawnY < 540) ? 'ancient_ruins' : ((spawnY >= 1280) ? 'crystal_lake' : ((spawnX < 640) ? 'fungal_hollow' : ((spawnX >= 640 && spawnX <= 1408 && spawnY >= 640 && spawnY < 1280) ? 'oakhaven_town' : 'whispering_meadow')));
    this.currentBiome = initBiome;
    this.updateBiomeColorGrading(initBiome);
    sounds.transitionBgm(initBiome, 1.5);
  }

  public spawnOtherPlayer(p: PlayerData) {
    const other = new OtherPlayer(this, p.x, p.y, p.id, p.name, p.paletteIndex);
    if (p.equipment && p.vanity) {
      other.updateEquipment(p.equipment, p.vanity);
    }
    this.otherPlayers.set(p.id, other);
  }

  private renderEntity(ent: EntityData) {
    this.worldEntities.set(ent.id, ent);
    if (this.entityObjects.has(ent.id)) {
      this.updateEntityVisuals(ent);
      return;
    }

    let obj: Phaser.GameObjects.GameObject;

    if (ent.type === 'bush') {
      const sprite = this.add.sprite(ent.x, ent.y, ent.state.destroyed ? 'ent_bush_cut' : 'ent_bush');
      sprite.setOrigin(0.5, 0.9);
      this.interactiveFoliage.push({
        sprite,
        baseX: ent.x,
        baseY: ent.y,
        currentBend: 0,
        targetBend: 0
      });
      obj = sprite;
    } else if (ent.type === 'pot') {
      const sprite = this.add.sprite(ent.x, ent.y, 'ent_pot');
      const isVisible = !ent.state.destroyed && !ent.state.heldBy;
      sprite.setVisible(isVisible);
      const shadow = this.add.sprite(ent.x + 1, ent.y + 6, 'shadow_small').setAlpha(0.55).setDepth(ent.y - 1);
      shadow.setVisible(isVisible);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'switch') {
      if (ent.id.startsWith('lever_')) {
        obj = this.add.sprite(ent.x, ent.y, ent.state.activated ? 'prop_lever_down' : 'prop_lever_up');
      } else if (ent.subtype === 'pillar') {
        const sprite = this.obstacles.create(ent.x, ent.y, 'ent_pillar');
        sprite.body.setSize(24, 20);
        sprite.body.setOffset(4, 28);
        sprite.setDepth(ent.y);
        obj = sprite;
      } else if (ent.subtype === 'mushroom_giant') {
        const sprite = this.obstacles.create(ent.x, ent.y, 'ent_mushroom_giant');
        sprite.body.setSize(22, 16);
        sprite.body.setOffset(5, 30);
        sprite.setDepth(ent.y);
        obj = sprite;
      } else {
        obj = this.add.sprite(ent.x, ent.y, ent.state.activated ? 'switch_down' : 'switch_up');
      }
    } else if (ent.type === 'chest') {
      const tex = ent.subtype === 'relic_chest' ? (ent.state.opened ? 'chest_opened' : 'prop_relic_chest') : (ent.state.opened ? 'chest_opened' : 'chest_closed');
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      if (ent.subtype === 'relic_chest') {
        sprite.setVisible(!!ent.state.active);
      }
      const shadow = this.add.sprite(ent.x + 1, ent.y + 6, 'shadow_small').setAlpha(0.6).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'door') {
      const tex = ent.subtype === 'iron_gate' ? (ent.state.opened ? 'prop_crypt_gate_opened' : 'prop_crypt_gate_closed') : (ent.state.opened ? 'gate_opened' : 'gate_closed');
      obj = this.add.sprite(ent.x, ent.y, tex);
    } else if (ent.type === 'torch') {
      const tex = ent.state.lit ? 'prop_crypt_torch_lit' : 'prop_crypt_torch_unlit';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      sprite.setDepth(ent.y);
      obj = sprite;
    } else if (ent.type === 'platform') {
      const sprite = this.add.sprite(ent.x, ent.y, 'prop_moving_platform');
      sprite.setDepth(ent.y - 2);
      obj = sprite;
    } else if (ent.type === 'trigger') {
      let tex = 'prop_crypt_stairs_down';
      if (ent.subtype === 'stairs_up') tex = 'prop_crypt_stairs_up';
      else if (ent.subtype === 'portal') tex = 'prop_catacombs_portal';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      sprite.setDepth(ent.y - 10);
      if (ent.subtype === 'portal') {
        sprite.setVisible(!!ent.state.active);
        this.tweens.add({
          targets: sprite,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      obj = sprite;
    } else if (ent.type === 'sign') {
      obj = this.add.sprite(ent.x, ent.y, 'ent_sign');
    } else if (ent.type === 'npc') {
      let texture = 'npc_barnaby';
      if (ent.subtype === 'grandma') texture = 'npc_grandma';
      if (ent.subtype === 'rooster') texture = 'npc_rooster';

      const sprite = this.add.sprite(ent.x, ent.y, texture);
      this.add.text(ent.x, ent.y - 20, ent.name || 'NPC', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fde047',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5, 1);

      const shadow = this.add.sprite(ent.x + 2, ent.y + 8, 'shadow_directional_45').setAlpha(0.6).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'wildlife') {
      let texture = 'wildlife_dog';
      if (ent.subtype === 'duck') texture = 'wildlife_duck';
      const sprite = this.add.sprite(ent.x, ent.y, texture);
      const shadow = this.add.sprite(ent.x + 1, ent.y + 4, 'shadow_small').setAlpha(0.55).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'mount') {
      const sprite = this.add.sprite(ent.x, ent.y, 'mount_frog_mossy_idle');
      const isMounted = !!ent.state.mountedBy;
      sprite.setVisible(!isMounted);
      const shadow = this.add.sprite(ent.x + 2, ent.y + 6, 'shadow_directional_45').setAlpha(0.6).setDepth(ent.y - 1);
      shadow.setVisible(!isMounted);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'enemy') {
      const tex = ent.subtype === 'skeleton' ? 'entity_minion_skeleton' : (ent.subtype === 'sproutling' ? 'enemy_sproutling' : 'enemy_grumble');
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      const isDead = !!ent.state.destroyed;
      sprite.setVisible(!isDead);
      const shadow = this.add.sprite(ent.x + 2, ent.y + 8, 'shadow_directional_45').setAlpha(0.6).setDepth(ent.y - 1);
      shadow.setVisible(!isDead);
      this.entityShadows.set(ent.id, shadow);
      if (!isDead && ent.state.hp !== undefined && ent.state.maxHp !== undefined) {
        this.updateEnemyHealthBar(ent.id, ent.x, ent.y, ent.state.hp, ent.state.maxHp, false);
      }
      obj = sprite;
    } else if (ent.type === 'boss') {
      const tex = ent.subtype === 'boss_malakor' ? 'boss_malakor' : 'boss_baron';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      const isDead = !!ent.state.destroyed;
      sprite.setVisible(!isDead);
      const shadow = this.add.sprite(ent.x + 4, ent.y + 16, 'shadow_boss').setAlpha(0.7).setDepth(ent.y - 1);
      shadow.setVisible(!isDead);
      this.entityShadows.set(ent.id, shadow);
      if (!isDead && ent.state.hp !== undefined && ent.state.maxHp !== undefined) {
        this.updateEnemyHealthBar(ent.id, ent.x, ent.y, ent.state.hp, ent.state.maxHp, true);
      }
      obj = sprite;
    } else if (ent.type === 'minion') {
      const sprite = this.add.sprite(ent.x, ent.y, 'entity_minion_skeleton');
      sprite.setVisible(!ent.state.destroyed);
      const shadow = this.add.sprite(ent.x + 1, ent.y + 6, 'shadow_small').setAlpha(0.6).setDepth(ent.y - 1);
      shadow.setVisible(!ent.state.destroyed);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'block') {
      const sprite = this.obstacles.create(ent.x, ent.y, 'ent_block_stone');
      sprite.body.setSize(28, 28);
      sprite.setDepth(ent.y);
      const shadow = this.add.sprite(ent.x + 2, ent.y + 12, 'shadow_directional_45').setAlpha(0.65).setDepth(ent.y - 2);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'campfire') {
      const tex = ent.state.lit !== false ? 'prop_campfire_lit_1' : 'prop_campfire_unlit';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      sprite.setDepth(ent.y);
      const shadow = this.add.sprite(ent.x, ent.y + 10, 'shadow_medium').setAlpha(0.6).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'merchant') {
      let texture = 'npc_pip';
      if (ent.subtype === 'corvus') texture = 'npc_corvus';

      if (ent.subtype === 'pip') {
        const cart = this.add.image(ent.x - 22, ent.y - 6, 'prop_merchant_cart');
        cart.setDepth(ent.y - 5);
      }

      const sprite = this.add.sprite(ent.x, ent.y, texture);
      this.add.text(ent.x, ent.y - 20, ent.name || 'Merchant', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#34d399',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5, 1);

      const shadow = this.add.sprite(ent.x + 2, ent.y + 8, 'shadow_directional_45').setAlpha(0.6).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else {
      obj = this.add.rectangle(ent.x, ent.y, 20, 20, 0xffffff);
    }

    this.entityObjects.set(ent.id, obj);
  }

  private updateEntityVisuals(ent: EntityData) {
    const existing = this.worldEntities.get(ent.id);
    if (existing) {
      existing.x = ent.x;
      existing.y = ent.y;
      existing.interactable = ent.interactable;
      if (ent.state) {
        Object.assign(existing.state, ent.state);
      }
    } else {
      this.worldEntities.set(ent.id, ent);
    }
    let obj = this.entityObjects.get(ent.id) as any;
    if (!obj) {
      this.renderEntity(ent);
      return;
    }

    if (ent.type === 'bush') {
      if (ent.state.destroyed) {
        if (obj.texture.key !== 'ent_bush_cut') {
          obj.setTexture('ent_bush_cut');
          this.emitLeafBurst(ent.x, ent.y);
          sounds.playBushCut();
        }
      } else {
        if (obj.texture.key !== 'ent_bush') {
          obj.setTexture('ent_bush');
          obj.setScale(0);
          this.tweens.add({ targets: obj, scale: 1, duration: 250, ease: 'Back.easeOut' });
        }
      }
    } else if (ent.type === 'pot') {
      obj.setPosition(ent.x, ent.y);
      const isVisible = !ent.state.heldBy && !ent.state.destroyed;
      obj.setVisible(isVisible);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) {
        shadow.setPosition(ent.x + 1, ent.y + 6);
        shadow.setVisible(isVisible);
      }
    } else if (ent.type === 'switch' && !ent.subtype) {
      if (ent.id.startsWith('lever_')) {
        const isDown = !!ent.state.activated;
        const newTex = isDown ? 'prop_lever_down' : 'prop_lever_up';
        if (obj.texture?.key !== newTex) {
          obj.setTexture(newTex);
          sounds.playLever();
          if (ent.state.solved) {
            this.emitSparkleBurst(ent.x, ent.y);
          }
        }
      } else {
        const isDown = !!ent.state.activated;
        const newTex = isDown ? 'switch_down' : 'switch_up';
        if (obj.texture?.key !== newTex) {
          obj.setTexture(newTex);
          if (isDown) {
            sounds.playMechanicalClunk();
            this.triggerCameraShake(80, 0.003);
            this.emitSparkleBurst(ent.x, ent.y);
          }
        }
      }
    } else if (ent.type === 'block') {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (Math.abs(sprite.x - ent.x) > 1 || Math.abs(sprite.y - ent.y) > 1) {
        sounds.playStoneScrape();
        for (let i = 0; i < 4; i++) {
          const spark = this.add.image(ent.x + (Math.random() * 20 - 10), ent.y + 10, 'particle_stone_spark');
          spark.setDepth(ent.y + 5);
          this.tweens.add({
            targets: spark,
            x: spark.x + (Math.random() * 16 - 8),
            y: spark.y + (Math.random() * 8 - 4),
            alpha: 0,
            duration: 250,
            onComplete: () => spark.destroy()
          });
        }
        this.tweens.add({
          targets: sprite,
          x: ent.x,
          y: ent.y,
          duration: 180,
          ease: 'Linear',
          onUpdate: () => {
            sprite.setDepth(sprite.y);
            const shadow = this.entityShadows.get(ent.id);
            if (shadow) shadow.setPosition(sprite.x + 2, sprite.y + 12);
          }
        });
      }
    } else if (ent.type === 'chest') {
      const isOpened = !!ent.state.opened;
      if (ent.subtype === 'relic_chest') {
        obj.setVisible(!!ent.state.active);
        obj.setTexture(isOpened ? 'chest_opened' : 'prop_relic_chest');
      } else {
        obj.setTexture(isOpened ? 'chest_opened' : 'chest_closed');
      }
    } else if (ent.type === 'door') {
      const isOpened = !!ent.state.opened;
      const targetTex = ent.subtype === 'iron_gate' ? (isOpened ? 'prop_crypt_gate_opened' : 'prop_crypt_gate_closed') : (isOpened ? 'gate_opened' : 'gate_closed');
      obj.setTexture(targetTex);
    } else if (ent.type === 'torch') {
      const targetTex = ent.state.lit ? 'prop_crypt_torch_lit' : 'prop_crypt_torch_unlit';
      if (obj.texture?.key !== targetTex) {
        obj.setTexture(targetTex);
      }
    } else if (ent.type === 'campfire') {
      const targetTex = ent.state.lit !== false ? `prop_campfire_lit_${this.campfireAnimFrame}` : 'prop_campfire_unlit';
      if (obj.texture?.key !== targetTex) {
        obj.setTexture(targetTex);
      }
    } else if (ent.type === 'trigger') {
      if (ent.subtype === 'portal') {
        obj.setVisible(!!ent.state.active);
      }
    } else if (ent.type === 'wildlife' && ent.subtype === 'dog') {
      if (ent.state.petCount && ent.state.petCount !== (obj as any).lastPetCount) {
        (obj as any).lastPetCount = ent.state.petCount;
        this.emitHeartBurst(ent.x, ent.y);
      }
      const b = ent.state.behavior || 'idle';
      const targetTex = (b === 'bark' || b === 'alert') ? 'wildlife_dog_alert' : b === 'sniff' ? 'wildlife_dog_sniff' : b === 'nap' ? 'wildlife_dog_nap' : 'wildlife_dog_idle';
      if (obj.texture?.key !== targetTex) {
        obj.setTexture(targetTex);
      }
      obj.setPosition(ent.x, ent.y);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setPosition(ent.x + 1, ent.y + 4);
    } else if (ent.type === 'mount') {
      const isMounted = !!ent.state.mountedBy;
      obj.setVisible(!isMounted);
      obj.setPosition(ent.x, ent.y);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) {
        shadow.setVisible(!isMounted);
        shadow.setPosition(ent.x + 2, ent.y + 6);
      }
    } else if (ent.type === 'enemy') {
      const wasVisible = obj.visible;
      const isDead = !!ent.state.destroyed;

      if (wasVisible && isDead) {
        this.stampSlimeDecal(ent.x, ent.y);
        sounds.playEnemyDefeat();
        this.showFloatingText(ent.x, ent.y - 20, "💀 DEFEATED!", "#facc15", true);
        this.emitEnemyDefeatBurst(ent.x, ent.y, ent.subtype === 'sproutling' ? 0xa3e635 : 0xec4899);
        this.removeEnemyHealthBar(ent.id);
        obj.setVisible(false);
      } else if (!isDead) {
        obj.setVisible(true);
        if (ent.state.hp !== undefined && ent.state.maxHp !== undefined) {
          this.updateEnemyHealthBar(ent.id, ent.x, ent.y, ent.state.hp, ent.state.maxHp, false);
        }
      } else {
        obj.setVisible(false);
        this.removeEnemyHealthBar(ent.id);
      }

      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!isDead);

      // Overhead Question Mark for Confused / Leashing State
      let confIcon = this.enemyConfusedIcons.get(ent.id);
      if (ent.state.aiState === 'confused' && !isDead) {
        if (!confIcon) {
          confIcon = this.add.image(ent.x, ent.y - 18, 'particle_question');
          confIcon.setDepth(ent.y + 100);
          this.tweens.add({
            targets: confIcon,
            y: ent.y - 23,
            duration: 380,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
          this.enemyConfusedIcons.set(ent.id, confIcon);
        } else {
          confIcon.setVisible(true);
        }
      } else {
        if (confIcon) confIcon.setVisible(false);
      }

      if (!isDead) {
        // Smooth lerp to new position
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 300,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            if (ent.state.hp !== undefined && ent.state.maxHp !== undefined && !ent.state.destroyed) {
              this.updateEnemyHealthBar(ent.id, obj.x, obj.y, ent.state.hp, ent.state.maxHp, false);
            }
          }
        });
        if (shadow) {
          this.tweens.add({
            targets: shadow,
            x: ent.x + 2,
            y: ent.y + 8,
            duration: 300,
            ease: 'Sine.easeOut'
          });
        }
        if (confIcon && confIcon.visible) {
          this.tweens.add({
            targets: confIcon,
            x: ent.x,
            duration: 300,
            ease: 'Sine.easeOut'
          });
        }
      }
    } else if (ent.type === 'boss') {
      const wasVisible = obj.visible;
      const isDead = !!ent.state.destroyed;
      obj.setVisible(!isDead);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!isDead);

      if (wasVisible && isDead) {
        sounds.playEnemyDefeat();
        this.showFloatingText(ent.x, ent.y - 30, "👑 BARON DEFEATED!", "#facc15", true);
        this.emitEnemyDefeatBurst(ent.x, ent.y, 0xf59e0b);
        this.removeEnemyHealthBar(ent.id);
      } else if (!isDead && ent.state.hp !== undefined && ent.state.maxHp !== undefined) {
        this.updateEnemyHealthBar(ent.id, ent.x, ent.y, ent.state.hp, ent.state.maxHp, true);
      } else if (isDead) {
        this.removeEnemyHealthBar(ent.id);
      }

      if (!isDead) {
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 350,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            if (ent.state.hp !== undefined && ent.state.maxHp !== undefined && !ent.state.destroyed) {
              this.updateEnemyHealthBar(ent.id, obj.x, obj.y, ent.state.hp, ent.state.maxHp, true);
            }
          }
        });
        if (shadow) {
          this.tweens.add({
            targets: shadow,
            x: ent.x + 4,
            y: ent.y + 16,
            duration: 350,
            ease: 'Sine.easeOut'
          });
        }
        (window as any).BitQuestUI?.updateBossHp(ent.state.hp || 0, ent.state.maxHp || 12);
      } else {
        (window as any).BitQuestUI?.hideBossHp();
      }
    } else if (ent.type === 'minion') {
      obj.setVisible(!ent.state.destroyed);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!ent.state.destroyed);
      if (!ent.state.destroyed) {
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 250,
          ease: 'Sine.easeOut'
        });
        if (shadow) {
          this.tweens.add({
            targets: shadow,
            x: ent.x + 1,
            y: ent.y + 6,
            duration: 250,
            ease: 'Sine.easeOut'
          });
        }
      }
    } else if (ent.type === 'merchant') {
      obj.setPosition(ent.x, ent.y);
      obj.setDepth(ent.y);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) {
        shadow.setPosition(ent.x + 2, ent.y + 8);
        shadow.setDepth(ent.y - 1);
      }
    }
  }

  private handleBossEvent(event: { action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated' | 'crypt_spike' | 'scythe_cleave' | 'darkness_shroud' | 'soul_barrage'; bossId?: string; x?: number; y?: number; targetX?: number; targetY?: number }) {
    const x = event.x ?? 1024;
    const y = event.y ?? 280;
    const bossSprite = this.entityObjects.get('boss_baron') as Phaser.GameObjects.Sprite | undefined;

    if (event.action === 'crypt_spike') {
      const targetX = event.targetX ?? x;
      const targetY = event.targetY ?? y;
      sounds.playTelegraphHum();
      const fissure = this.add.sprite(targetX, targetY + 6, 'telegraph_ring');
      fissure.setDepth(targetY - 1).setScale(0.4).setAlpha(0.6).setTint(0xef4444);
      this.tweens.add({
        targets: fissure,
        scale: 1.1,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          fissure.destroy();
          sounds.playCryptSpike();
          this.triggerCameraShake(180, 0.007);
          const spikes = this.add.sprite(targetX, targetY, 'prop_crypt_spikes');
          spikes.setDepth(targetY + 10).setScale(0.4);
          this.tweens.add({
            targets: spikes,
            scale: 1.2,
            duration: 120,
            yoyo: true,
            hold: 350,
            ease: 'Back.easeOut',
            onComplete: () => spikes.destroy()
          });
          if (this.localPlayer && !this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
            if (Math.hypot(this.localPlayer.x - targetX, this.localPlayer.y - targetY) < 42) {
              this.hurtPlayer(MALAKOR_SPECS.phase1.cryptSpikeDamage);
            }
          }
        }
      });
      return;
    }

    if (event.action === 'scythe_cleave') {
      sounds.playSlash();
      const malakorSpr = this.entityObjects.get(MALAKOR_SPECS.id) as Phaser.GameObjects.Sprite | undefined;
      if (malakorSpr) {
        this.renderSlashTrail(malakorSpr.x, malakorSpr.y, 'down', true);
      }
      return;
    }

    if (event.action === 'darkness_shroud') {
      sounds.playBossStun();
      this.triggerCameraShake(250, 0.008);
      this.showFloatingText(x, y - 36, "🌑 DARKNESS SHROUD! (Light 4 Torches!)", "#a855f7", true);
      const malakorSpr = this.entityObjects.get(MALAKOR_SPECS.id) as Phaser.GameObjects.Sprite | undefined;
      if (malakorSpr) {
        malakorSpr.setTint(0x9333ea);
      }
      return;
    }

    if (event.action === 'soul_barrage') {
      sounds.playSoulBarrage();
      const targetX = event.targetX ?? this.localPlayer?.x ?? x;
      const targetY = event.targetY ?? this.localPlayer?.y ?? y;
      for (let i = 0; i < 3; i++) {
        const orb = this.add.sprite(x + (i - 1) * 16, y - 10, 'fx_siphon_orb');
        orb.setDepth(y + 20).setTint(0xc084fc);
        this.tweens.add({
          targets: orb,
          x: targetX + (Math.random() * 20 - 10),
          y: targetY + (Math.random() * 20 - 10),
          duration: 450 + i * 100,
          ease: 'Sine.easeIn',
          onComplete: () => {
            orb.destroy();
            if (this.localPlayer && !this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
              if (Math.hypot(this.localPlayer.x - targetX, this.localPlayer.y - targetY) < 36) {
                this.hurtPlayer(MALAKOR_SPECS.phase2.soulBarrageDamage);
              }
            }
          }
        });
      }
      return;
    }

    if (event.action === 'crash_stun' && event.bossId === MALAKOR_SPECS.id) {
      sounds.playBossStun();
      this.showFloatingText(x, y - 36, "✨ SHROUD BROKEN! MALAKOR IS STUNNED! ✨", "#facc15", true);
      const malakorSpr = this.entityObjects.get(MALAKOR_SPECS.id) as Phaser.GameObjects.Sprite | undefined;
      if (malakorSpr) {
        malakorSpr.clearTint();
        this.tweens.add({
          targets: malakorSpr,
          angle: 15,
          duration: 100,
          yoyo: true,
          repeat: 4
        });
      }
      return;
    }

    if (event.action === 'defeated' && event.bossId === MALAKOR_SPECS.id) {
      sounds.playVictory();
      this.triggerCameraShake(400, 0.015);
      chronicles.recordStat('bossesDefeated', 1);
      this.showFloatingText(x, y - 36, "🏆 MALAKOR VANQUISHED! SUN STONE RELIC UNLOCKED! ☀️", "#fbbf24", true);
      (window as any).BitQuestUI?.showToast('🎉 Malakor the Tomb Warden has fallen! Claim the Sun Stone from the relic chest!');
      return;
    }

    if (event.action === 'stomp') {
      // 1. Anticipation squash & threat telegraph ring
      if (bossSprite) {
        this.tweens.add({
          targets: bossSprite,
          scaleX: 1.35,
          scaleY: 0.65,
          duration: 200,
          yoyo: true,
          repeat: 1,
          ease: 'Quad.easeInOut'
        });
      }

      sounds.playTelegraphHum();

      // Threat Telegraph Ground Ring (pulsating hazard ring for 600ms)
      const telegraph = this.add.sprite(x, y + 10, 'telegraph_ring');
      telegraph.setDepth(y - 1);
      telegraph.setScale(0.5);
      telegraph.setAlpha(0.35);

      this.tweens.add({
        targets: telegraph,
        scale: 1.9,
        alpha: 0.9,
        duration: 550,
        ease: 'Quad.easeOut',
        onComplete: () => {
          telegraph.destroy();

          // 2. Heavy Ground Stomp execution!
          sounds.playBossStomp();
          this.triggerCameraShake(220, 0.009);

          // Expanding Shockwave Ring
          const ring = this.add.sprite(x, y, 'shockwave_ring');
          ring.setScale(0.5);
          ring.setAlpha(1);

          this.tweens.add({
            targets: ring,
            scale: 3.4,
            alpha: 0,
            duration: 450,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
          });

          // Shockwave damage check
          if (this.localPlayer && !this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
            const dist = Math.hypot(this.localPlayer.x - x, this.localPlayer.y - y);
            if (dist < 80) {
              this.hurtPlayer(1);
            }
          }
        }
      });
    } else if (event.action === 'spore') {
      if (bossSprite) {
        this.tweens.add({
          targets: bossSprite,
          scaleX: 0.75,
          scaleY: 1.25,
          duration: 180,
          yoyo: true,
          ease: 'Quad.easeInOut'
        });
      }
      sounds.playBossRoar();

      this.time.delayedCall(280, () => {
        // Launch 3 Spore projectiles
        const angles = [-0.5, 0, 0.5];
        angles.forEach(angOffset => {
          const spore = this.add.sprite(x, y, 'boss_spore');
          const targetAng = Math.PI / 2 + angOffset; // towards south/player
          const speed = 140;
          this.sporeProjectiles.push({
            sprite: spore,
            vx: Math.cos(targetAng) * speed,
            vy: Math.sin(targetAng) * speed,
            life: 2500
          });
        });
      });
    } else if (event.action === 'charge') {
      if (bossSprite) {
        // Recoil anticipation wind-up
        this.tweens.add({
          targets: bossSprite,
          scaleX: 0.8,
          scaleY: 1.3,
          duration: 180,
          yoyo: true,
          ease: 'Quad.easeInOut'
        });
      }
    } else if (event.action === 'crash_stun') {
      // Charger crashed into obstacle!
      sounds.playStunBonk();
      this.triggerCameraShake(260, 0.012);
      this.bossStunnedUntil = this.time.now + 2800;

      if (bossSprite) {
        // Impact rebound bounce
        this.tweens.add({
          targets: bossSprite,
          scaleX: 1.45,
          scaleY: 0.6,
          duration: 140,
          yoyo: true,
          ease: 'Quad.easeInOut'
        });

        // Impact spark burst
        for (let i = 0; i < 8; i++) {
          const spark = this.add.sprite(bossSprite.x, bossSprite.y, 'particle_stone_spark');
          const spAng = Math.random() * Math.PI * 2;
          const spDist = 20 + Math.random() * 20;
          this.tweens.add({
            targets: spark,
            x: bossSprite.x + Math.cos(spAng) * spDist,
            y: bossSprite.y + Math.sin(spAng) * spDist,
            alpha: 0,
            scale: 0.2,
            duration: 200 + Math.random() * 100,
            onComplete: () => spark.destroy()
          });
        }

        // Clean up previous dizzy stars if any
        this.bossDizzyStars.forEach(s => s.destroy());
        this.bossDizzyStars = [];

        // 3 Spinning Dizzy Stars orbiting boss cap
        for (let i = 0; i < 3; i++) {
          const star = this.add.sprite(bossSprite.x, bossSprite.y - 28, 'particle_dizzy_star');
          star.setDepth(bossSprite.depth + 10);
          this.bossDizzyStars.push(star);
        }

        this.showFloatingText(bossSprite.x, bossSprite.y - 36, '💫 STUNNED! 💫', '#facc15', true);
      }
    } else if (event.action === 'defeated') {
      this.bossDizzyStars.forEach(s => s.destroy());
      this.bossDizzyStars = [];

      sounds.playVictory();
      this.triggerCameraShake(350, 0.012);
      chronicles.recordStat('bossesDefeated', 1);
      (window as any).BitQuestUI?.hideBossHp();
      (window as any).BitQuestUI?.showToast('🎉 Baron von Truffle is DEFEATED! The Golden Crown is reclaimed!');

      // Giant Confetti Burst
      for (let i = 0; i < 20; i++) {
        const p = this.add.image(x, y, 'particle_sparkle');
        const ang = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 50;
        this.tweens.add({
          targets: p,
          x: x + Math.cos(ang) * d,
          y: y + Math.sin(ang) * d,
          alpha: 0,
          scale: 0.2,
          duration: 600 + Math.random() * 300,
          onComplete: () => p.destroy()
        });
      }
    } else if (event.action === 'spawn') {
      sounds.playBossRoar();
      (window as any).BitQuestUI?.showToast('👑 Baron von Truffle has entered the arena!');
      (window as any).BitQuestUI?.updateBossHp(12, 12);
    }
  }

  public triggerCameraShake(duration: number, intensity: number) {
    const cfg = saveManager.currentSave.settings;
    if (cfg.screenShake) {
      this.cameras.main.shake(duration, intensity * cfg.shakeIntensity);
    }
  }

  private hurtPlayer(dmg = 1) {
    if (!this.localPlayer || this.localPlayer.godMode || this.playerInvulnerable) return;

    this.playerInvulnerable = true;
    sounds.playHit();
    sounds.duckBgm(-5, 450);
    this.triggerCameraShake(120, 0.006);
    chronicles.recordStat('damageTaken', dmg);

    this.localPlayer.health = Math.max(0, this.localPlayer.health - dmg);
    (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);

    network.sendInteract(this.localPlayer.id, 'player_hurt', undefined, undefined, dmg);
    this.showFloatingText(this.localPlayer.x, this.localPlayer.y, `-${dmg} ❤️`, '#ef4444');

    if (this.localPlayer.health <= 0) {
      this.triggerCozyDefeat();
      return;
    }

    this.tweens.add({
      targets: this.localPlayer,
      alpha: 0.25,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        if (this.localPlayer) this.localPlayer.setAlpha(1);
        this.playerInvulnerable = false;
      }
    });
  }

  public teleportLocalPlayer(x: number, y: number, direction: Direction = 'down') {
    if (!this.localPlayer) return;
    this.localPlayer.setPosition(x, y);
    (this.localPlayer.body as Phaser.Physics.Arcade.Body)?.reset(x, y);
    this.localPlayer.direction = direction;
    (this.localPlayer as any).prediction?.clear();
    network.sendMove(x, y, direction, 'idle', null, undefined, true);
  }

  private triggerCozyDefeat() {
    if (!this.localPlayer) return;
    this.playerInvulnerable = true;
    (window as any).BitQuestUI?.hideBossHp?.();

    // Clean up mounted, fishing, and carried pot states on defeat
    if (this.localPlayer.mountedEntityId) {
      this.localPlayer.setMounted(null);
      network.sendMountToggle(null);
    }
    if (this.isLocalFishing) {
      this.cleanupFishingSession(this.localPlayer.id);
      this.isLocalFishing = false;
      this.fishingPhase = 'idle';
      this.destroyTensionHud();
      network.sendFishingCancel();
    }
    if (this.localPlayer.carryingPotId) {
      this.localPlayer.carryingPotId = null;
      (this.localPlayer as any).carriedPotSprite?.setVisible(false);
      (this.localPlayer as any).nameText?.setY(-28);
    }

    const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);

    // Warm soft vignette fade out
    this.cameras.main.fade(700, 20, 15, 20);

    // Show Cozy Defeat Transition modal
    (window as any).BitQuestUI?.biomes?.showCozyDefeat(() => {
      if (!this.localPlayer) return;

      // Respawn player in Grandma Bramble's Bakery Cot in Oakhaven Town Plaza
      const cotX = 1240;
      const cotY = 840;
      this.teleportLocalPlayer(cotX, cotY, 'down');
      this.localPlayer.health = this.localPlayer.maxHealth;
      (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);

      // Smooth camera fade in
      this.cameras.main.fadeIn(700, 20, 15, 20);

      // Steaming berry tea recovery icon & hearts
      this.showFloatingText(cotX, cotY - 16, '☕ WARM BERRY TEA +3 ❤️', '#fbbf24');
      for (let i = 0; i < 6; i++) {
        const heart = this.add.text(cotX + (Math.random() * 20 - 10), cotY + (Math.random() * 10 - 5), '❤️', { fontSize: '10px' });
        this.tweens.add({
          targets: heart,
          y: heart.y - 28,
          alpha: 0,
          scale: 1.4,
          duration: 900 + Math.random() * 300,
          ease: 'Cubic.easeOut',
          onComplete: () => heart.destroy()
        });
      }

      this.playerInvulnerable = false;
    });
  }

  public cinematicPanTo(targetX: number, targetY: number, holdDuration = 1200, onHold?: () => void) {
    if (this.isCinematicPanning || !this.localPlayer) return;
    this.isCinematicPanning = true;

    this.cameras.main.stopFollow();

    const camWidth = this.cameras.main.width / this.cameras.main.zoom;
    const camHeight = this.cameras.main.height / this.cameras.main.zoom;

    const destScrollX = targetX - camWidth / 2;
    const destScrollY = targetY - camHeight / 2;

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: destScrollX,
      scrollY: destScrollY,
      duration: 550,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        onHold?.();

        this.time.delayedCall(holdDuration, () => {
          if (!this.localPlayer) return;
          const returnScrollX = this.localPlayer.x - camWidth / 2;
          const returnScrollY = this.localPlayer.y - camHeight / 2;

          this.tweens.add({
            targets: this.cameras.main,
            scrollX: returnScrollX,
            scrollY: returnScrollY,
            duration: 550,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              if (this.localPlayer) {
                this.cameras.main.startFollow(this.localPlayer, true, 0.12, 0.12, -this.camOffsetX, -this.camOffsetY);
              }
              this.isCinematicPanning = false;
            }
          });
        });
      }
    });
  }

  public openGate(playJingle = true) {
    const gateSprite = this.entityObjects.get('ancient_gate') as Phaser.GameObjects.Sprite;

    if (playJingle && this.localPlayer) {
      this.cinematicPanTo(1024, 512, 1400, () => {
        if (gateSprite) gateSprite.setTexture('gate_opened');
        if (this.gateBody) this.gateBody.disableBody(true, true);
        sounds.playSecretJingle();
        this.triggerCameraShake(250, 0.008);

        // Stone gate opening dust burst
        for (let i = 0; i < 8; i++) {
          const dust = this.add.image(1024 + (Math.random() * 40 - 20), 512 + (Math.random() * 20 - 10), 'particle_dust');
          dust.setScale(0.9);
          this.tweens.add({
            targets: dust,
            y: dust.y - 14,
            alpha: 0,
            duration: 600,
            onComplete: () => dust.destroy()
          });
        }

        (window as any).BitQuestUI?.showToast('✨ The Ancient Sunken Gate has unsealed!');
      });
    } else {
      if (gateSprite) gateSprite.setTexture('gate_opened');
      if (this.gateBody) this.gateBody.disableBody(true, true);
    }
    (window as any).BitQuestUI?.quests?.handleEvent({ type: 'interact', targetId: 'moss_gate' });
  }

  public closeGate() {
    const gateSprite = this.entityObjects.get('ancient_gate') as Phaser.GameObjects.Sprite;
    if (gateSprite) {
      gateSprite.setTexture('gate_closed');
    }
    if (this.gateBody) {
      this.gateBody.enableBody(false, 1024, 512, true, true);
    }
  }

  private emitLeafBurst(x: number, y: number) {
    this.triggerCameraShake(70, 0.003);
    chronicles.recordStat('bushesCut', 1);
    this.particles?.emitLeaves(x, y, 8);
    this.stampFoliageDecals(x, y);
  }

  private emitPotShards(x: number, y: number) {
    sounds.playPotShatter();
    chronicles.recordStat('potsSmashed', 1);
    this.particles?.emitPotShards(x, y, 8);
    this.stampPotShardDecals(x, y);
  }

  private emitSparkleBurst(x: number, y: number) {
    this.particles?.emitSparkles(x, y, 8);
  }

  private emitHeartBurst(x: number, y: number) {
    sounds.playEmoteSound();
    for (let i = 0; i < 3; i++) {
      const heart = this.add.sprite(x + (Math.random() * 16 - 8), y - 10, 'emote_heart');
      this.tweens.add({
        targets: heart,
        y: heart.y - 25,
        alpha: 0,
        scale: 1.3,
        duration: 600,
        delay: i * 120,
        onComplete: () => heart.destroy()
      });
    }
  }

  public triggerHitstop(durationMs = 40, isCrit = false) {
    if (this.hitstopTimer) {
      clearTimeout(this.hitstopTimer);
    }
    const originalTimeScale = this.time.timeScale;
    this.time.timeScale = 0.04;
    this.triggerCameraShake(isCrit ? 120 : 70, isCrit ? 0.008 : 0.004);

    this.hitstopTimer = setTimeout(() => {
      this.time.timeScale = originalTimeScale;
      this.hitstopTimer = null;
    }, durationMs);
  }

  public renderSlashTrail(x: number, y: number, dir: Direction, isCrit = false) {
    let facingAngle = Math.PI / 2; // down
    let ox = 0;
    let oy = 14;
    if (dir === 'up') {
      facingAngle = -Math.PI / 2;
      oy = -14;
    } else if (dir === 'left') {
      facingAngle = Math.PI;
      ox = -14;
      oy = 0;
    } else if (dir === 'right') {
      facingAngle = 0;
      ox = 14;
      oy = 0;
    }

    const slash = this.add.sprite(x + ox, y + oy, isCrit ? 'slash_arc_crit' : 'slash_arc');
    slash.setRotation(facingAngle);
    slash.setDepth(this.localPlayer ? this.localPlayer.depth + 2 : 2000);
    slash.setScale(0.7);
    slash.setAlpha(0.95);

    this.tweens.add({
      targets: slash,
      scaleX: 1.35,
      scaleY: 1.35,
      rotation: facingAngle + (dir === 'left' ? -0.35 : 0.35),
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy()
    });

    // Outward spark particles along perimeter
    for (let i = 0; i < 4; i++) {
      const spAng = facingAngle - 0.65 + (i / 3) * 1.3;
      const spDist = 32 + Math.random() * 12;
      const spark = this.add.sprite(x + ox + Math.cos(spAng) * 12, y + oy + Math.sin(spAng) * 12, 'particle_stone_spark');
      spark.setDepth(slash.depth + 1);
      this.tweens.add({
        targets: spark,
        x: x + ox + Math.cos(spAng) * spDist,
        y: y + oy + Math.sin(spAng) * spDist,
        alpha: 0,
        scale: 0.25,
        duration: 120 + Math.random() * 60,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  public shootArrow(originX?: number, originY?: number, dir?: Direction, isRemote = false, damage?: number) {
    const px = originX !== undefined ? originX : this.localPlayer!.x;
    const py = originY !== undefined ? originY : this.localPlayer!.y;
    const facing = dir || this.localPlayer?.direction || 'down';

    let facingAngle = Math.PI / 2; // down
    let vx = 0;
    let vy = 1;
    if (facing === 'up') {
      facingAngle = -Math.PI / 2;
      vx = 0; vy = -1;
    } else if (facing === 'left') {
      facingAngle = Math.PI;
      vx = -1; vy = 0;
    } else if (facing === 'right') {
      facingAngle = 0;
      vx = 1; vy = 0;
    }

    const speed = this.localPlayer?.equipmentStats.arrowSpeed || 340;
    const range = this.localPlayer?.equipmentStats.arrowRange || 260;
    const arrowDmg = damage !== undefined ? damage : (this.localPlayer?.equipmentStats.attackPower || 2);

    sounds.playSlash();

    const arrow = this.add.sprite(px + vx * 12, py + vy * 12, 'proj_arrow');
    arrow.setRotation(facingAngle);
    arrow.setDepth(this.localPlayer ? this.localPlayer.depth + 1 : 2000);

    if (!isRemote) {
      network.sendShootArrow(px, py, facing, arrowDmg);
    }

    const duration = (range / speed) * 1000;
    const targetX = px + vx * range;
    const targetY = py + vy * range;

    let hasHit = false;

    this.tweens.add({
      targets: arrow,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        if (hasHit || !arrow.active) return;

        // Check bush hits
        for (const [id, obj] of this.entityObjects.entries()) {
          if (id.startsWith('bush_')) {
            const sprite = obj as Phaser.GameObjects.Sprite;
            if (sprite.texture.key === 'ent_bush') {
              if (Math.hypot(sprite.x - arrow.x, sprite.y - arrow.y) < 18) {
                if (!isRemote) network.sendInteract(id, 'cut');
                hasHit = true;
                arrow.destroy();
                return;
              }
            }
          }
        }

        // Check enemy / boss hits (only client authoritatively checks if not remote)
        if (!isRemote) {
          for (const [id, obj] of this.entityObjects.entries()) {
            if (id.startsWith('enemy_') || id.startsWith('boss_')) {
              const entData = this.worldEntities.get(id);
              if (entData && entData.state.destroyed) continue;
              const sprite = obj as Phaser.GameObjects.Sprite;
              if (sprite.visible) {
                const hitRadius = id.startsWith('boss_') ? 34 : 18;
                if (Math.hypot(sprite.x - arrow.x, sprite.y - arrow.y) < hitRadius) {
                  hasHit = true;
                  const isCrit = Math.random() < (this.localPlayer?.equipmentStats.critChance || 0.25);
                  const finalDmg = isCrit ? arrowDmg + 1 : arrowDmg;
                  network.sendInteract(id, 'hit_enemy', undefined, undefined, finalDmg);

                  if (isCrit) sounds.playCritStrike();
                  else sounds.playEnemyHit();
                  this.triggerHitstop(isCrit ? 50 : 30, isCrit);

                  const spark = this.add.sprite(arrow.x, arrow.y, 'impact_spark');
                  spark.setScale(1.2);
                  spark.setDepth(3500);
                  this.tweens.add({
                    targets: spark,
                    scale: 0.1,
                    alpha: 0,
                    duration: 120,
                    onComplete: () => spark.destroy()
                  });

                  this.applyTintFill(sprite, 0xffffff);
                  this.time.delayedCall(100, () => this.clearTintFill(sprite));

                  arrow.destroy();
                  return;
                }
              }
            }
          }
        }
      },
      onComplete: () => {
        if (!hasHit && arrow.active) {
          arrow.destroy();
        }
      }
    });
  }

  private handleActionAttack() {
    if (!this.localPlayer) return;

    if (this.localPlayer.carryingPotId) {
      const potInfo = this.localPlayer.throwPot();
      if (potInfo) {
        network.sendPotThrow(potInfo.potId, this.localPlayer.x, this.localPlayer.y, potInfo.x, potInfo.y);
      }
      return;
    }

    // If Ranged Bow equipped, fire physical arrow
    if (this.localPlayer.equipmentStats.isRanged) {
      this.shootArrow();
      return;
    }

    // Dynamic forward arc multi-target cleave tuned by weapon archetype
    const stats = this.localPlayer.equipmentStats;
    const cleaveRadius = stats.cleaveRadius || 46;
    const cleaveHalfAngle = (stats.cleaveAngle || ((2 * Math.PI) / 3)) / 2;
    const critChance = stats.critChance || 0.15;
    const baseDamage = stats.attackPower || 1;
    const baseKnock = stats.knockback || 12;

    this.localPlayer.attack((_hitX, _hitY, dir) => {
      const px = this.localPlayer!.x;
      const py = this.localPlayer!.y;

      let facingAngle = Math.PI / 2; // down
      if (dir === 'up') facingAngle = -Math.PI / 2;
      else if (dir === 'left') facingAngle = Math.PI;
      else if (dir === 'right') facingAngle = 0;

      // Visual: Curved slash ribbon trail and arc sparks
      this.renderSlashTrail(px, py, dir, false);

      // 1. Cleave bushes
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('bush_')) {
          const sprite = obj as Phaser.GameObjects.Sprite;
          if (sprite.texture.key === 'ent_bush') {
            const dist = Math.hypot(sprite.x - px, sprite.y - py);
            if (dist < cleaveRadius) {
              const angle = Math.atan2(sprite.y - py, sprite.x - px);
              const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - facingAngle));
              if (diff <= cleaveHalfAngle) {
                network.sendInteract(id, 'cut');
              }
            }
          }
        }
      }

      // 1b. Light unlit crypt torches with attack swing!
      for (const ent of this.worldEntities.values()) {
        if (ent.type === 'torch' && !ent.state.lit) {
          const dist = Math.hypot(ent.x - px, ent.y - py);
          if (dist < cleaveRadius + 14) {
            network.sendInteract(ent.id, 'light_torch');
            sounds.playTorchIgnite();
          }
        }
      }

      // 2. Cleave enemies & boss
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('enemy_') || id.startsWith('boss_')) {
          const entData = this.worldEntities.get(id);
          if (entData && entData.state.destroyed) continue;
          const sprite = obj as Phaser.GameObjects.Sprite;
          if (sprite.visible) {
            const range = id.startsWith('boss_') ? 56 : cleaveRadius;
            const dist = Math.hypot(sprite.x - px, sprite.y - py);
            if (dist < range) {
              const angle = Math.atan2(sprite.y - py, sprite.x - px);
              const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - facingAngle));
              if (diff <= cleaveHalfAngle) {
                const isStunnedBoss = id.startsWith('boss_') && this.bossStunnedUntil > this.time.now;
                const isCrit = isStunnedBoss || Math.random() < critChance;
                const damage = isCrit ? (baseDamage + 2) : baseDamage;

                network.sendInteract(id, 'hit_enemy', undefined, undefined, damage);

                // Deep Combat Audio & Hitstop Micro-Pause
                if (isCrit) {
                  sounds.playCritStrike();
                } else {
                  sounds.playEnemyHit();
                }
                this.triggerHitstop(isCrit ? 55 : 35, isCrit);

                // Cross impact spark flash
                const spark = this.add.sprite((px + sprite.x) / 2, (py + sprite.y) / 2, 'impact_spark');
                spark.setScale(isCrit ? 1.6 : 1.1);
                spark.setDepth(3500);
                this.tweens.add({
                  targets: spark,
                  scale: 0.1,
                  alpha: 0,
                  rotation: Math.PI / 4,
                  duration: 120,
                  ease: 'Quad.easeOut',
                  onComplete: () => spark.destroy()
                });

                // Flash damage tint animation
                this.applyTintFill(sprite, isCrit ? 0xfef08a : 0xffffff);
                this.time.delayedCall(120, () => this.clearTintFill(sprite));

                // Directional knockback impulse with map boundary safety
                const knockDist = isCrit ? (baseKnock * 1.6) : baseKnock;
                const targetX = Phaser.Math.Clamp(sprite.x + Math.cos(angle) * knockDist, 40, 2000);
                const targetY = Phaser.Math.Clamp(sprite.y + Math.sin(angle) * knockDist, 40, 1750);
                this.tweens.add({
                  targets: sprite,
                  x: targetX,
                  y: targetY,
                  duration: 130,
                  ease: 'Quad.easeOut'
                });

                // Kinetic squash-and-stretch
                sprite.setScale(isCrit ? 1.4 : 1.25, isCrit ? 0.65 : 0.8);
                this.tweens.add({
                  targets: sprite,
                  scaleX: 1.0,
                  scaleY: 1.0,
                  duration: 180,
                  ease: 'Back.easeOut'
                });

                const critLabel = isStunnedBoss ? `-${damage} STUN CRIT! ⚡` : `-${damage} CRIT! ⚡`;
                this.showFloatingText(
                  sprite.x,
                  sprite.y - 14,
                  isCrit ? critLabel : `-${damage} 💥`,
                  isCrit ? '#f59e0b' : '#fbbf24',
                  isCrit
                );
              }
            }
          }
        }
      }
    });
  }

  private handleActionInteract() {
    if (!this.localPlayer) return;

    // 0. Dismount if currently riding a wildlife mount
    if (this.localPlayer.mountedEntityId) {
      network.sendMountToggle(null);
      return;
    }

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;

    // 1. Mid-Air Pot Catching: Check if an airborne pot is flying nearby!
    for (const [potId, airborne] of this.airbornePots.entries()) {
      const dist = Math.hypot(px - airborne.pot.x, py - airborne.pot.y);
      if (dist < 50) {
        network.sendPotCatch(potId);
        return;
      }
    }

    // 2. If holding a pot, throw it across the network!
    if (this.localPlayer.carryingPotId) {
      const potInfo = this.localPlayer.throwPot();
      if (potInfo) {
        network.sendPotThrow(potInfo.potId, this.localPlayer.x, this.localPlayer.y, potInfo.x, potInfo.y);
      }
      return;
    }

    // 2b. Cozy Crop Harvesting & Tending Check (Expansion Milestone 1)
    for (const plot of farmingManager.getAllPlots()) {
      const dist = Math.hypot(px - plot.worldX, py - plot.worldY);
      if (dist <= 40) {
        if (plot.cropSpecies && plot.stage === 3) {
          const res = farmingManager.harvestPlot(plot.x, plot.y);
          if (res.success && res.itemId) {
            sounds.playPickup();
            this.showFloatingText(plot.worldX, plot.worldY - 16, res.message, res.isGolden ? '#facc15' : '#4ade80');
            this.emitHeartBurst(plot.worldX, plot.worldY);
            return;
          }
        } else if (!plot.isWatered) {
          farmingManager.waterPlot(plot.x, plot.y);
          sounds.playWaterSplash();
          this.showFloatingText(plot.worldX, plot.worldY - 16, '💧 Watered Soil', '#38bdf8');
          return;
        } else if (!plot.cropSpecies) {
          farmingManager.plantCrop(plot.x, plot.y, 'seed_turnip');
          sounds.playPickup();
          this.showFloatingText(plot.worldX, plot.worldY - 16, '🌱 Planted Turnip!', '#a3e635');
          return;
        }
      }
    }

    // 2c. Cozy Culinary Hearth & Bakery Oven Cooking (Expansion Milestone 2)
    const distCampfire = Math.hypot(px - 640, py - 720);
    if (distCampfire <= 52) {
      (window as any).BitQuestUI?.cookingModal?.open('campfire');
      sounds.playCampfireCrackle();
      return;
    }

    const distBakeryOven = Math.hypot(px - 1410, py - 840);
    if (distBakeryOven <= 56) {
      (window as any).BitQuestUI?.cookingModal?.open('bakery_oven');
      sounds.playPickup();
      return;
    }

    // 3. Unified Prioritized Interaction Pipeline
    const interaction = BehaviorRegistry.getPrioritizedInteraction(px, py, this.worldEntities.values(), 56, this.localPlayer as any);
    if (!interaction) return;

    const closestId = interaction.entity.id;
    const action = interaction.trait.action;

    if (action === 'lift') {
      const potSprite = this.entityObjects.get(closestId) as Phaser.GameObjects.Sprite;
      if (potSprite && potSprite.visible) {
        this.localPlayer.liftPot(closestId);
        network.sendInteract(closestId, 'lift');
      }
    } else if (action === 'pull_lever') {
      network.sendInteract(closestId, 'pull_lever');
      sounds.playLever();
    } else if (action === 'push_block') {
      const block = this.entityObjects.get(closestId) as Phaser.GameObjects.Sprite;
      const dx = block.x - px;
      const dy = block.y - py;
      let pushDir: Direction = 'right';
      let targetX = block.x;
      let targetY = block.y;
      const PUSH_DIST = 32;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          pushDir = 'right';
          targetX += PUSH_DIST;
        } else {
          pushDir = 'left';
          targetX -= PUSH_DIST;
        }
      } else {
        if (dy > 0) {
          pushDir = 'down';
          targetY += PUSH_DIST;
        } else {
          pushDir = 'up';
          targetY -= PUSH_DIST;
        }
      }

      // Restrict within Ruins courtyard area
      targetX = Phaser.Math.Clamp(targetX, 840, 1200);
      targetY = Phaser.Math.Clamp(targetY, 500, 680);

      this.localPlayer.enterPushStance(pushDir);
      sounds.playStoneScrape();
      this.triggerCameraShake(80, 0.002);
      network.sendInteract(closestId, 'push_block', targetX, targetY);
    } else if (action === 'open_chest') {
      if (interaction.entity.subtype === 'relic_chest') {
        network.sendInteract(closestId, 'press');
      } else {
        network.sendInteract(closestId, 'open');
      }
      sounds.playChestOpen();
    } else if (action === 'browse_shop') {
      network.sendShopOpen(interaction.entity.state.merchantId || closestId);
      sounds.playShopOpen();
    } else if (action === 'talk') {
      network.sendInteract(closestId, 'talk');
    } else if (action === 'pet') {
      if (closestId === 'wildlife_buster') {
        network.sendPetCommand(closestId, 'pet');
      } else {
        network.sendInteract(closestId, 'pet');
      }
      this.emitHeartBurst(interaction.entity.x, interaction.entity.y);
      sounds.playCoin();
    } else if (action === 'mount') {
      network.sendMountToggle(closestId);
    } else if (action === 'light_torch') {
      network.sendInteract(closestId, 'light_torch');
      sounds.playTorchIgnite();
    } else if (action === 'sit_campfire') {
      if (this.localPlayer) {
        this.localPlayer.anim = this.localPlayer.anim === 'sit' ? 'idle' : 'sit';
        if (this.localPlayer.anim === 'sit') {
          this.localPlayer.sprite.setScale(1.0, 0.8);
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 20, "🔥 Resting...", "#fbbf24");
        } else {
          this.localPlayer.sprite.setScale(1.0, 1.0);
        }
      }
      network.sendSitCampfire(closestId);
      sounds.playCampfireCrackle();
    } else if (action === 'enter_dungeon') {
      network.sendInteract(closestId, 'enter_dungeon');
    }
  }

  private handleAirbornePotThrown(data: { potId: string; throwerId: string; startX: number; startY: number; targetX: number; targetY: number; duration: number }) {
    if (this.localPlayer && this.localPlayer.carryingPotId === data.potId) {
      this.localPlayer.carryingPotId = null;
      (this.localPlayer as any).carriedPotSprite?.setVisible(false);
      (this.localPlayer as any).nameText?.setY(-28);
    }

    const existing = this.entityObjects.get(data.potId) as Phaser.GameObjects.Sprite;
    if (existing) existing.setVisible(false);
    const existingShadow = this.entityShadows.get(data.potId);
    if (existingShadow) existingShadow.setVisible(false);

    const maxZ = Math.max(data.startY, data.targetY) + 6;
    const shadow = this.add.sprite(data.startX, data.startY, 'shadow_small').setAlpha(0.6).setDepth(maxZ - 2);
    const pot = this.add.sprite(data.startX, data.startY - 16, 'ent_pot').setDepth(maxZ);
    sounds.playSlash();

    const tween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: data.duration,
      onUpdate: (tw) => {
        const p = tw.getValue();
        const currX = Phaser.Math.Linear(data.startX, data.targetX, p);
        const groundY = Phaser.Math.Linear(data.startY, data.targetY, p);
        const arcHeight = Math.sin(p * Math.PI) * 36;
        pot.x = currX;
        pot.y = groundY - arcHeight;
        pot.angle += 14;

        shadow.x = currX;
        shadow.y = groundY;
        shadow.setScale(1.0 - (arcHeight / 36) * 0.45);
        shadow.setAlpha(0.6 - (arcHeight / 36) * 0.3);
      },
      onComplete: () => {
        this.airbornePots.delete(data.potId);
        pot.destroy();
        shadow.destroy();
        this.emitPotShards(data.targetX, data.targetY);
        sounds.playPotShatter();
        chronicles.recordStat('potsSmashed', 1);
      }
    });

    this.airbornePots.set(data.potId, {
      pot,
      shadow,
      startX: data.startX,
      startY: data.startY,
      targetX: data.targetX,
      targetY: data.targetY,
      startTime: this.time.now,
      duration: data.duration,
      tween
    });
  }

  private handlePotCaught(data: { potId: string; catcherId: string; x: number; y: number }) {
    const airborne = this.airbornePots.get(data.potId);
    if (airborne) {
      airborne.tween.stop();
      airborne.pot.destroy();
      airborne.shadow.destroy();
      this.airbornePots.delete(data.potId);
    }

    sounds.playPotCatch();
    this.emitSparkleBurst(data.x, data.y);

    if (this.localPlayer && data.catcherId === network.yourId) {
      this.localPlayer.liftPot(data.potId);
      this.showFloatingText(data.x, data.y - 24, "✨ NICE CATCH! ✨", "#facc15");
      chronicles.recordStat('potsCaught', 1);
    } else {
      const other = this.otherPlayers.get(data.catcherId);
      if (other) {
        other.setTargetState(other.x, other.y, other.direction, 'carry_idle', data.potId);
      }
      this.showFloatingText(data.x, data.y - 24, "✨ CATCH! ✨", "#facc15");
    }
  }

  private handleSocialResonance(data: { player1Id: string; player2Id: string; emote: EmoteType; x: number; y: number }) {
    sounds.playSocialResonance();
    this.emitSocialResonanceBurst(data.x, data.y);
    this.showFloatingText(data.x, data.y - 26, "✨ HIGH FIVE RESONANCE! ✨", "#facc15");

    let p1Pos = { x: data.x - 20, y: data.y };
    let p2Pos = { x: data.x + 20, y: data.y };

    if (this.localPlayer && (data.player1Id === network.yourId || data.player2Id === network.yourId)) {
      chronicles.recordStat('socialResonances', 1);
      this.localPlayer.speedMultiplier = 1.35;
      this.time.delayedCall(4000, () => {
        if (this.localPlayer) this.localPlayer.speedMultiplier = 1.0;
      });
    }

    if (data.player1Id === network.yourId && this.localPlayer) {
      p1Pos = { x: this.localPlayer.x, y: this.localPlayer.y - 16 };
    } else if (this.otherPlayers.has(data.player1Id)) {
      const o = this.otherPlayers.get(data.player1Id)!;
      p1Pos = { x: o.x, y: o.y - 16 };
    }

    if (data.player2Id === network.yourId && this.localPlayer) {
      p2Pos = { x: this.localPlayer.x, y: this.localPlayer.y - 16 };
    } else if (this.otherPlayers.has(data.player2Id)) {
      const o = this.otherPlayers.get(data.player2Id)!;
      p2Pos = { x: o.x, y: o.y - 16 };
    }

    const beam = this.add.graphics();
    beam.setDepth(Math.max(p1Pos.y, p2Pos.y) + 15);
    beam.lineStyle(3, 0xfacc15, 0.85);
    beam.beginPath();
    beam.moveTo(p1Pos.x, p1Pos.y);
    const midX = (p1Pos.x + p2Pos.x) / 2;
    const midY = Math.min(p1Pos.y, p2Pos.y) - 18;
    beam.lineTo(midX, midY);
    beam.lineTo(p2Pos.x, p2Pos.y);
    beam.strokePath();

    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => beam.destroy()
    });
  }

  private emitSocialResonanceBurst(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const isHeart = i % 2 === 0;
      const p = this.add.sprite(x, y - 10, isHeart ? 'particle_heart' : 'particle_sparkle_gold');
      p.setDepth(y + 20);
      const angle = (i / 12) * Math.PI * 2;
      const speed = 28 + Math.random() * 24;
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y - 10 + Math.sin(angle) * speed - 12;

      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.5,
        duration: 750,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  public triggerEmote(emote: EmoteType) {
    if (!this.localPlayer) return;
    this.localPlayer.showEmote(emote);
    network.sendEmote(emote);
  }

  public setPlayerClass(classId: CharacterClassId) {
    if (this.localPlayer) {
      this.localPlayer.classId = classId;
    }
    network.sendSetClass(classId);
  }

  public useClassAbility(slot: 1 | 2) {
    if (!this.localPlayer) return;
    const classId = this.localPlayer.classId || 'warrior';
    const def = CLASS_DEFINITIONS[classId];
    if (!def) return;
    const ability = slot === 1 ? def.abilities[0] : def.abilities[1];
    if (!ability) return;

    if (this.localPlayer.mana < ability.manaCost) {
      sounds.playOutOfMana();
      this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 20, "NO MANA!", "#ef4444");
      return;
    }

    network.sendUseClassAbility(ability.id, this.localPlayer.x, this.localPlayer.y, this.localPlayer.direction);
  }

  private handleClassAbilityVFX(data: { playerId: string; classId: CharacterClassId; abilityId: ClassAbilityId; x: number; y: number; direction: Direction; targetId?: string }) {
    const isLocal = data.playerId === this.localPlayer?.id;
    const playerSpr = isLocal ? this.localPlayer : this.otherPlayers.get(data.playerId)?.sprite;

    switch (data.abilityId) {
      case 'shield_parry': {
        sounds.playShieldParry();
        this.cameras.main.shake(80, 0.003);
        const ring = this.add.sprite(data.x, data.y, 'fx_shield_parry');
        ring.setDepth(1500).setScale(0.6).setAlpha(1);
        this.tweens.add({
          targets: ring,
          scale: 1.4,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => ring.destroy()
        });
        this.showFloatingText(data.x, data.y - 24, "🛡️ PARRY STANCE", "#38bdf8");
        break;
      }
      case 'stagger_cleave': {
        sounds.playSlash();
        this.cameras.main.shake(120, 0.005);
        this.particles?.emitSparks(data.x, data.y, 8);
        this.showFloatingText(data.x, data.y - 24, "💥 STAGGER CLEAVE", "#f59e0b");
        break;
      }
      case 'teleport_blink': {
        sounds.playBlink();
        this.particles?.emitSparkles(data.x, data.y, 8);
        this.cameras.main.shake(60, 0.002);
        if (isLocal && this.localPlayer) {
          this.localPlayer.x = data.x;
          this.localPlayer.y = data.y;
        } else if (playerSpr) {
          playerSpr.x = data.x;
          playerSpr.y = data.y;
        }
        this.showFloatingText(data.x, data.y - 24, "✨ BLINK", "#a855f7");
        break;
      }
      case 'arcane_nova': {
        sounds.playIceShatter();
        this.cameras.main.shake(140, 0.006);
        const nova = this.add.sprite(data.x, data.y, 'fx_arcane_nova');
        nova.setDepth(1500).setScale(0.4).setAlpha(0.9);
        this.tweens.add({
          targets: nova,
          scale: 1.8,
          alpha: 0,
          duration: 450,
          ease: 'Cubic.easeOut',
          onComplete: () => nova.destroy()
        });
        this.showFloatingText(data.x, data.y - 24, "🔮 ARCANE NOVA", "#c084fc");
        break;
      }
      case 'speed_fanfare': {
        sounds.playSongFanfare();
        for (let i = 0; i < 5; i++) {
          const note = this.add.sprite(data.x + (Math.random() * 30 - 15), data.y + (Math.random() * 20 - 10), 'fx_music_note');
          note.setDepth(1500).setScale(0.8);
          this.tweens.add({
            targets: note,
            y: note.y - 32 - Math.random() * 16,
            alpha: 0,
            duration: 600 + Math.random() * 200,
            ease: 'Sine.easeOut',
            onComplete: () => note.destroy()
          });
        }
        this.showFloatingText(data.x, data.y - 24, "🎵 SPEED FANFARE", "#fbbf24");
        break;
      }
      case 'harmony_chord': {
        sounds.playSongFanfare();
        this.emitHeartBurst(data.x, data.y);
        this.showFloatingText(data.x, data.y - 24, "💚 HARMONY CHORD +2 HP", "#4ade80");
        break;
      }
      case 'raise_skeleton': {
        sounds.playSummonMinion();
        this.cameras.main.shake(70, 0.003);
        this.showFloatingText(data.x, data.y - 24, "💀 BONE MINION", "#94a3b8");
        break;
      }
      case 'life_siphon': {
        sounds.playLifeSiphon();
        if (data.targetId) {
          this.handleLifeSiphonVFX(data.playerId, data.targetId, 2);
        }
        break;
      }
      case 'piercing_arrow': {
        sounds.playPiercingShot();
        this.showFloatingText(data.x, data.y - 24, "🏹 PIERCING ARROW", "#38bdf8");
        break;
      }
      case 'evasive_backhop': {
        sounds.playRoll();
        if (isLocal && this.localPlayer) {
          this.localPlayer.x = data.x;
          this.localPlayer.y = data.y;
        } else if (playerSpr) {
          playerSpr.x = data.x;
          playerSpr.y = data.y;
        }
        this.showFloatingText(data.x, data.y - 24, "💨 EVASIVE HOP", "#e2e8f0");
        break;
      }
    }
  }

  private handleParryVFX(x: number, y: number) {
    sounds.playShieldParry();
    this.cameras.main.shake(120, 0.007);
    const parrySprite = this.add.sprite(x, y, 'fx_shield_parry');
    parrySprite.setDepth(1500).setScale(0.8);
    this.tweens.add({
      targets: parrySprite,
      scale: 1.6,
      alpha: 0,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => parrySprite.destroy()
    });
    this.showFloatingText(x, y - 24, "✨ PERFECT PARRY! ✨", "#facc15");
  }

  private handleLifeSiphonVFX(casterId: string, targetId: string, amount: number) {
    sounds.playLifeSiphon();
    const isLocal = casterId === this.localPlayer?.id;
    const casterSpr = isLocal ? this.localPlayer : this.otherPlayers.get(casterId)?.sprite;
    const targetObj = this.entityObjects.get(targetId) as Phaser.GameObjects.Sprite | undefined;

    if (targetObj) {
      this.showFloatingText(targetObj.x, targetObj.y - 18, `-${amount} 🩸 SIPHON`, "#ef4444");

      if (casterSpr) {
        for (let i = 0; i < 3; i++) {
          const orb = this.add.sprite(targetObj.x + (Math.random() * 12 - 6), targetObj.y + (Math.random() * 12 - 6), 'fx_siphon_orb');
          orb.setDepth(1500).setScale(0.8);
          this.tweens.add({
            targets: orb,
            x: casterSpr.x,
            y: casterSpr.y,
            duration: 350 + i * 80,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              orb.destroy();
              if (i === 0) {
                this.showFloatingText(casterSpr.x, casterSpr.y - 20, `+${amount} 💚`, "#4ade80");
              }
            }
          });
        }
      }
    }
  }

  public castSpell(spellId: string) {
    if (!this.localPlayer) return;
    this.localPlayer.castSpell(spellId as SpellId, (spell, x, y, dir) => {
      this.spawnSpellProjectile(spell, x, y, dir);
    });
  }

  public spawnSpellProjectile(spell: SpellDefinition, x: number, y: number, dir: Direction) {
    if (spell.id === 'gale_ward') {
      this.particles?.emitGaleVortex(x, y, 20);
      sounds.playGaleWard();
      this.cameras.main.shake(120, 0.004);

      // Radial pushback & stun on nearby enemies
      for (const [id, obj] of this.entityObjects.entries()) {
        if ((id.startsWith('enemy_') || id.startsWith('boss_')) && (obj as Phaser.GameObjects.Sprite).visible) {
          const sprite = obj as Phaser.GameObjects.Sprite;
          const dist = Math.hypot(sprite.x - x, sprite.y - y);
          if (dist <= spell.aoeRadius) {
            const angle = Math.atan2(sprite.y - y, sprite.x - x);
            sprite.x += Math.cos(angle) * spell.pushForce;
            sprite.y += Math.sin(angle) * spell.pushForce;

            const ent = this.worldEntities.get(id);
            if (ent) {
              StatusEffectManager.applyEffect(ent.state, 'stun', 1200, this.time.now);
            }
            this.particles?.emitStunStars(sprite.x, sprite.y, 4);
            sounds.playStunBonk();
            this.showFloatingText(sprite.x, sprite.y - 20, "💫 STUNNED!", "#facc15");
            network.sendInteract(id, 'hit_enemy', undefined, undefined, spell.baseDamage);
          }
        }
      }
      return;
    }

    // Directional linear projectile (Fireball or Ice Lance)
    const textureKey = spell.id === 'fireball' ? 'proj_fireball' : 'proj_ice_lance';
    const projSprite = this.add.sprite(x, y, textureKey);
    projSprite.setDepth(1400);

    let vx = 0;
    let vy = 0;
    if (dir === 'left') {
      vx = -spell.projectileSpeed;
      projSprite.setAngle(180);
    } else if (dir === 'right') {
      vx = spell.projectileSpeed;
      projSprite.setAngle(0);
    } else if (dir === 'up') {
      vy = -spell.projectileSpeed;
      projSprite.setAngle(-90);
    } else {
      vy = spell.projectileSpeed;
      projSprite.setAngle(90);
    }

    this.spellProjectiles.push({
      sprite: projSprite,
      spell,
      dir,
      vx,
      vy,
      rangeRemaining: spell.range,
      trailTimer: 0,
      active: true
    });
  }

  private handleSpellHit(p: any, targetId: string, targetSprite: Phaser.GameObjects.Sprite) {
    p.active = false;
    p.sprite.destroy();

    const ent = this.worldEntities.get(targetId);

    if (p.spell.id === 'fireball') {
      sounds.playFireballExplosion();
      this.particles?.emitFireBurst(targetSprite.x, targetSprite.y, 14);
      this.cameras.main.shake(120, 0.004);

      // AOE explosion hitting all nearby enemies
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('enemy_') || id.startsWith('boss_')) {
          const otherSpr = obj as Phaser.GameObjects.Sprite;
          const d = Math.hypot(otherSpr.x - targetSprite.x, otherSpr.y - targetSprite.y);
          if (d <= p.spell.aoeRadius) {
            const otherEnt = this.worldEntities.get(id);
            if (otherEnt) {
              StatusEffectManager.applyEffect(otherEnt.state, 'burn', p.spell.statusEffect.durationMs, this.time.now, {
                tickIntervalMs: 800,
                damagePerTick: 1
              });
            }
            network.sendInteract(id, 'hit_enemy', undefined, undefined, p.spell.baseDamage);
            this.showFloatingText(otherSpr.x, otherSpr.y - 18, `-${p.spell.baseDamage} 🔥`, "#f97316");
          }
        }
      }
    } else if (p.spell.id === 'ice_lance') {
      sounds.playIceShatter();
      this.particles?.emitIceShatter(targetSprite.x, targetSprite.y, 14);

      if (ent) {
        StatusEffectManager.applyEffect(ent.state, 'freeze', p.spell.statusEffect.durationMs, this.time.now, {
          speedMultiplier: 0.4
        });
      }
      network.sendInteract(targetId, 'hit_enemy', undefined, undefined, p.spell.baseDamage);
      this.showFloatingText(targetSprite.x, targetSprite.y - 18, `-${p.spell.baseDamage} ❄️ CHILL`, "#38bdf8");
    }
  }

  private explodeSpellProjectile(p: any) {
    p.active = false;
    if (p.spell.id === 'fireball') {
      sounds.playFireballExplosion();
      this.particles?.emitFireBurst(p.sprite.x, p.sprite.y, 10);
    } else {
      sounds.playIceShatter();
      this.particles?.emitIceShatter(p.sprite.x, p.sprite.y, 10);
    }
    p.sprite.destroy();
  }

  public renderItem(item: ItemDropData) {
    if (this.itemObjects.has(item.id)) return;

    const sprite = this.add.sprite(item.x, item.y, `item_${item.itemType}`);
    sprite.setScale(0);

    this.tweens.add({
      targets: sprite,
      scale: 1,
      y: item.y - 12,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          y: item.y,
          duration: 150,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: sprite,
              y: item.y - 3,
              duration: 800 + Math.random() * 300,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        });
      }
    });

    const shape = this.getLootShapeIndicator(item.itemType);
    const shapeText = this.add.text(item.x, item.y + 10, shape.glyph, {
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      color: shape.color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    this.itemObjects.set(item.id, { sprite, shapeText, data: item });
  }

  public removeItem(itemId: string, collectorId: string, itemType: string, value: number) {
    const itemObj = this.itemObjects.get(itemId);
    if (itemObj) {
      const { sprite, shapeText } = itemObj;
      this.itemObjects.delete(itemId);
      if (shapeText) shapeText.destroy();

      for (let i = 0; i < 5; i++) {
        const p = this.add.image(sprite.x, sprite.y, 'particle_sparkle');
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 12;
        this.tweens.add({
          targets: p,
          x: sprite.x + Math.cos(angle) * dist,
          y: sprite.y + Math.sin(angle) * dist - 8,
          alpha: 0,
          scale: 0.2,
          duration: 250,
          onComplete: () => p.destroy()
        });
      }

      if (collectorId === network.yourId && this.localPlayer) {
        if (itemType === 'coin' || itemType === 'acorn') {
          const now = this.time.now;
          if (now - this.lastCoinPickupTime < 450) {
            this.coinCombo = Math.min(8, this.coinCombo + 1);
          } else {
            this.coinCombo = 0;
          }
          this.lastCoinPickupTime = now;
          const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1567.98];
          const freq = pentatonic[this.coinCombo] || 523.25;
          sounds.playCustom({ frequency: freq, targetFrequency: freq * 1.04, duration: 0.09, type: 'triangle', volume: 0.22 });

          if (itemType === 'coin') {
            this.showFloatingText(sprite.x, sprite.y, `+${value} 🪙`, '#fde047');
            this.localPlayer.coins += value;
            chronicles.recordStat('coinsCollected', value);
          } else {
            this.showFloatingText(sprite.x, sprite.y, `+${value} 🌰`, '#fbbf24');
            this.localPlayer.acorns += value;
          }
        } else if (itemType === 'strawberry') {
          sounds.playStrawberry();
          this.showFloatingText(sprite.x, sprite.y, `+1 ❤️`, '#f43f5e');
          this.localPlayer.health = Math.min(this.localPlayer.maxHealth, this.localPlayer.health + 1);
          (window as any).BitQuestUI?.quests?.handleEvent({ type: 'collect', targetId: 'strawberry', amount: value });
          chronicles.recordStat('berriesCollected', 1);
        } else if (itemType === 'jam') {
          sounds.playStrawberry();
          this.showFloatingText(sprite.x, sprite.y, `SWEET JAM! 🍯`, '#c084fc');
        } else if (itemType === 'scone') {
          sounds.playStrawberry();
          this.showFloatingText(sprite.x, sprite.y, `+MAX HP 🥐`, '#facc15');
          this.localPlayer.health = this.localPlayer.maxHealth;
        } else if (itemType === 'crown') {
          sounds.playVictory();
          this.showFloatingText(sprite.x, sprite.y, `👑 GOLDEN CROWN! +100 🪙`, '#eab308', true);
          this.localPlayer.coins += 100;
          (window as any).BitQuestUI?.showToast('👑 Reclaimed the Sacred Golden Acorn Crown!');
        } else if (itemType === 'letter') {
          sounds.playCoin();
          this.showFloatingText(sprite.x, sprite.y, `📜 LOST LETTER FOUND! +15 🪙`, '#38bdf8');
          this.localPlayer.coins += 15;
          (window as any).BitQuestUI?.showToast('📜 Recovered one of Barnaby\'s Lost Letters!');
        }
        (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);
        (window as any).BitQuestUI?.updateCurrency(this.localPlayer.coins, this.localPlayer.acorns);
      }

      sprite.destroy();
    }
  }

  private getLootShapeIndicator(type: string): { glyph: string; color: string } {
    switch (type) {
      case 'coin': return { glyph: '●', color: '#facc15' };
      case 'strawberry': return { glyph: '◆', color: '#f43f5e' };
      case 'acorn': return { glyph: '▲', color: '#fbbf24' };
      case 'jam': return { glyph: '♥', color: '#c084fc' };
      case 'crown': return { glyph: '★', color: '#eab308' };
      case 'letter': return { glyph: '■', color: '#38bdf8' };
      default: return { glyph: '○', color: '#ffffff' };
    }
  }

  public showFloatingText(x: number, y: number, text: string, color = '#fef08a', isCrit = false) {
    const txt = this.add.text(x, y - 8, text, {
      fontFamily: 'monospace',
      fontSize: isCrit ? '13px' : '11px',
      fontStyle: isCrit ? 'bold' : 'normal',
      color: color,
      stroke: '#000000',
      strokeThickness: isCrit ? 4 : 3
    }).setOrigin(0.5);

    txt.setScale(0.6);
    const spreadX = Phaser.Math.Between(-14, 14);

    this.tweens.add({
      targets: txt,
      x: x + spreadX,
      y: y - 24,
      scaleX: isCrit ? 1.25 : 1.0,
      scaleY: isCrit ? 1.25 : 1.0,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          y: y - 38,
          alpha: 0,
          duration: 450,
          ease: 'Quad.easeIn',
          onComplete: () => txt.destroy()
        });
      }
    });
  }

  private applyTintFill(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, color: number) {
    sprite.setTint(color);
    if ((sprite as any).setTintMode) {
      (sprite as any).setTintMode((Phaser as any).TintModes?.FILL ?? 1);
    }
  }

  private clearTintFill(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    sprite.clearTint();
    if ((sprite as any).setTintMode) {
      (sprite as any).setTintMode((Phaser as any).TintModes?.MULTIPLY ?? 0);
    }
  }

  private updateEnemyHealthBar(id: string, x: number, y: number, currentHp: number, maxHp: number, isBoss = false) {
    let bar = this.enemyHealthBars.get(id);
    if (currentHp <= 0) {
      if (bar) {
        bar.bg.destroy();
        bar.fg.destroy();
        this.enemyHealthBars.delete(id);
      }
      return;
    }

    const width = isBoss ? 50 : 26;
    const height = isBoss ? 5 : 3;
    const offsetY = isBoss ? -30 : -20;

    if (!bar) {
      const bg = this.add.graphics();
      const fg = this.add.graphics();
      bg.setDepth(y + 120);
      fg.setDepth(y + 121);
      bar = { bg, fg };
      this.enemyHealthBars.set(id, bar);
    }

    const pct = Math.max(0, Math.min(1, currentHp / maxHp));
    const barX = Math.round(x - width / 2);
    const barY = Math.round(y + offsetY);

    bar.bg.clear();
    bar.bg.fillStyle(0x0f172a, 0.85);
    bar.bg.fillRoundedRect(barX - 1, barY - 1, width + 2, height + 2, 2);
    bar.bg.fillStyle(0x334155, 0.9);
    bar.bg.fillRoundedRect(barX, barY, width, height, 1);
    bar.bg.setDepth(y + 120);

    const fillColor = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xeab308 : 0xef4444;
    bar.fg.clear();
    bar.fg.fillStyle(fillColor, 1);
    bar.fg.fillRoundedRect(barX, barY, Math.max(2, Math.round(width * pct)), height, 1);
    bar.fg.setDepth(y + 121);
  }

  private removeEnemyHealthBar(id: string) {
    const bar = this.enemyHealthBars.get(id);
    if (bar) {
      bar.bg.destroy();
      bar.fg.destroy();
      this.enemyHealthBars.delete(id);
    }
  }

  private emitEnemyDefeatBurst(x: number, y: number, color = 0xa3e635) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = 25 + Math.random() * 20;
      const p = this.add.circle(x, y, Math.random() < 0.5 ? 3 : 2, color);
      p.setDepth(3500);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scale: 0.1,
        alpha: 0,
        duration: 350 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private emitTorchLitBurst(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y - 10, Math.random() < 0.5 ? 3 : 2, 0xf59e0b);
      p.setDepth(3500);
      const angle = (i / 8) * Math.PI * 2;
      const dist = 16 + Math.random() * 14;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y - 10 + Math.sin(angle) * dist - 8,
        scale: 0.2,
        alpha: 0,
        duration: 350 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  update(time: number, delta: number) {
    if (this.localPlayer) {
      this.localPlayer.updateMovement(this.cursors, this.keys, delta);
      this.updateFishing(time, delta);

      // Update moving stone platform position and riding kinematics
      const platformSprite = this.entityObjects.get(DUNGEON_CONSTANTS.F1_PLATFORM.id) as Phaser.GameObjects.Sprite | undefined;
      const platformPos = DungeonManager.getPlatformPosition(Date.now(), this.platformPosOut);
      if (platformSprite) {
        platformSprite.x = platformPos.x;
        platformSprite.y = platformPos.y;
      }

      // If local player is standing on the moving platform in the chasm, ride it!
      if (DungeonManager.isInsideAbyss(this.localPlayer.x, this.localPlayer.y)) {
        if (DungeonManager.isOnMovingPlatform(this.localPlayer.x, this.localPlayer.y, platformPos.x, platformPos.y)) {
          this.localPlayer.x += (platformPos.vx * delta) / 1000;
        }
      }

      // Dynamic Camera Clamping & Subterranean Bounds
      const currentFloor = DungeonManager.getFloorFromY(this.localPlayer.y);
      if (currentFloor !== this.activeFloor) {
        this.activeFloor = currentFloor;
        if (currentFloor === 'f1') {
          this.cameras.main.setBounds(0, 2150, 2048, 1600);
        } else if (currentFloor === 'f2') {
          this.cameras.main.setBounds(0, 3950, 2048, 1600);
        } else {
          this.cameras.main.setBounds(0, 0, 2048, 1792);
        }
      }

      // Subterranean Dungeon Lighting & Torch Illumination Cutouts
      if (this.dungeonLightingOverlay) {
        if (this.localPlayer.y >= 2000) {
          this.dungeonLightingOverlay.setVisible(true);
          this.dungeonLightingOverlay.clear();
          const cam = this.cameras.main;
          const left = cam.worldView.x - 20;
          const top = cam.worldView.y - 20;
          const width = cam.worldView.width + 40;
          const height = cam.worldView.height + 40;

          // Translucent subterranean darkness
          this.dungeonLightingOverlay.fillStyle(0x06030b, 0.82);
          this.dungeonLightingOverlay.fillRect(left, top, width, height);

          // Player torchlight / aura
          this.dungeonLightingOverlay.fillStyle(0xfde047, 0.08);
          this.dungeonLightingOverlay.fillCircle(this.localPlayer.x, this.localPlayer.y, 110);
          this.dungeonLightingOverlay.fillStyle(0xffffff, 0.12);
          this.dungeonLightingOverlay.fillCircle(this.localPlayer.x, this.localPlayer.y, 70);

          // Torches illumination cutouts
          for (const ent of this.worldEntities.values()) {
            if (ent.type === 'torch' && ent.state.lit) {
              if (cam.worldView.contains(ent.x, ent.y)) {
                this.dungeonLightingOverlay.fillStyle(0xf59e0b, 0.16);
                this.dungeonLightingOverlay.fillCircle(ent.x, ent.y, 85);
                this.dungeonLightingOverlay.fillStyle(0xfef08a, 0.24);
                this.dungeonLightingOverlay.fillCircle(ent.x, ent.y, 50);
              }
            }
          }
        } else {
          this.dungeonLightingOverlay.setVisible(false);
        }
      }

      // Cozy Animated Campfires & Audio Proximity Check (Task 7.6 / Issue #24)
      this.campfireAnimTimer += delta;
      if (this.campfireAnimTimer >= 150) {
        this.campfireAnimTimer = 0;
        this.campfireAnimFrame = (this.campfireAnimFrame % 3) + 1;
        const frameKey = `prop_campfire_lit_${this.campfireAnimFrame}`;
        for (const ent of this.worldEntities.values()) {
          if (ent.type === 'campfire' && ent.state.lit !== false) {
            const spr = this.entityObjects.get(ent.id) as Phaser.GameObjects.Sprite | undefined;
            if (spr && spr.active) {
              spr.setTexture(frameKey);
            }
          }
        }
      }

      if (time - this.lastCampfireAudioCheck > 800) {
        this.lastCampfireAudioCheck = time;
        const nearCampfire = WeatherEngine.getNearestCampfire(this.localPlayer.x, this.localPlayer.y, 70);
        if (nearCampfire) {
          sounds.playCampfireCrackle();
        }
      }

      // Overworld Circadian Lighting, Weather & Dynamic Ambient Atmosphere
      if (this.localPlayer.y < 2000) {
        // Advance client clock interpolation
        this.timeOfDaySec = (this.timeOfDaySec + delta / 1000) % WeatherEngine.DAY_CYCLE_DURATION_SEC;
        this.clockUiTimer += delta;
        if (this.clockUiTimer >= 500) {
          this.clockUiTimer = 0;
          (window as any).BitQuestUI?.updateClockAndWeather?.(this.timeOfDaySec, this.currentWeather);
        }

        const lighting = WeatherEngine.getAmbientLighting(this.timeOfDaySec, this.currentWeather);
        const cam = this.cameras.main;
        const left = cam.worldView.x - 20;
        const top = cam.worldView.y - 20;
        const width = cam.worldView.width + 40;
        const height = cam.worldView.height + 40;

        if (this.dayNightDarknessOverlay) {
          if (lighting.alpha > 0.03) {
            this.dayNightDarknessOverlay.setVisible(true);
            this.dayNightDarknessOverlay.clear();

            // Ambient darkness / golden hour / dusk fill
            this.dayNightDarknessOverlay.fillStyle(lighting.color, lighting.alpha);
            this.dayNightDarknessOverlay.fillRect(left, top, width, height);

            // If darkness is significant (> 0.16), carve warm light halos around player and campfires
            if (lighting.alpha > 0.16) {
              // Player personal light aura
              this.dayNightDarknessOverlay.fillStyle(0xfde047, 0.07);
              this.dayNightDarknessOverlay.fillCircle(this.localPlayer.x, this.localPlayer.y, 80);
              this.dayNightDarknessOverlay.fillStyle(0xffffff, 0.10);
              this.dayNightDarknessOverlay.fillCircle(this.localPlayer.x, this.localPlayer.y, 48);

              // Campfire warm glowing light
              for (const ent of this.worldEntities.values()) {
                if (ent.type === 'campfire' && ent.state.lit !== false) {
                  if (cam.worldView.contains(ent.x, ent.y)) {
                    const pulse = 1.0 + Math.sin(time * 0.006) * 0.08;
                    this.dayNightDarknessOverlay.fillStyle(0xf97316, 0.20);
                    this.dayNightDarknessOverlay.fillCircle(ent.x, ent.y, 110 * pulse);
                    this.dayNightDarknessOverlay.fillStyle(0xfde047, 0.25);
                    this.dayNightDarknessOverlay.fillCircle(ent.x, ent.y, 65 * pulse);
                    this.dayNightDarknessOverlay.fillStyle(0xffffff, 0.18);
                    this.dayNightDarknessOverlay.fillCircle(ent.x, ent.y, 30);
                  }
                }
              }
            }
          } else {
            this.dayNightDarknessOverlay.clear();
            this.dayNightDarknessOverlay.setVisible(false);
          }
        }

        // Update rain particles
        this.updateRainParticles(delta);

        // Update fireflies
        this.updateFireflies(delta, time);

        // Update puddle reflections
        const isRaining = this.currentWeather === 'rain' || this.currentWeather === 'storm';
        const targetPuddleAlpha = isRaining ? 0.70 : 0.0;
        for (const puddle of this.rainPuddleSprites) {
          puddle.setAlpha(Phaser.Math.Linear(puddle.alpha, targetPuddleAlpha, 0.04));
        }
      } else {
        if (this.dayNightDarknessOverlay) {
          this.dayNightDarknessOverlay.setVisible(false);
        }
        if (this.rainGraphics) {
          this.rainGraphics.clear();
        }
        if (this.fireflyGraphics) {
          this.fireflyGraphics.clear();
        }
      }

      // Update active spell projectiles
      for (let i = this.spellProjectiles.length - 1; i >= 0; i--) {
        const p = this.spellProjectiles[i]!;
        if (!p.active) {
          this.spellProjectiles.splice(i, 1);
          continue;
        }
        const dt = delta / 1000;
        p.sprite.x += p.vx * dt;
        p.sprite.y += p.vy * dt;
        p.rangeRemaining -= Math.hypot(p.vx * dt, p.vy * dt);

        p.trailTimer += delta;
        if (p.trailTimer > 35) {
          p.trailTimer = 0;
          if (p.spell.id === 'fireball') {
            this.particles?.emitBurnFlames(p.sprite.x, p.sprite.y, 1);
          } else {
            this.particles?.emitFrostGleam(p.sprite.x, p.sprite.y, 1);
          }
        }

        // Check map boundary
        if (p.sprite.x < 32 || p.sprite.x > 2016 || p.sprite.y < 32 || p.sprite.y > 1760) {
          this.explodeSpellProjectile(p);
          this.spellProjectiles.splice(i, 1);
          continue;
        }

        // Check collision with enemies / bosses
        let hit = false;
        for (const [id, obj] of this.entityObjects.entries()) {
          if ((id.startsWith('enemy_') || id.startsWith('boss_')) && (obj as Phaser.GameObjects.Sprite).visible) {
            const targetSprite = obj as Phaser.GameObjects.Sprite;
            const hitRadius = id.startsWith('boss_') ? 34 : 18;
            if (Math.hypot(targetSprite.x - p.sprite.x, targetSprite.y - p.sprite.y) < hitRadius) {
              this.handleSpellHit(p, id, targetSprite);
              hit = true;
              break;
            }
          }
        }

        if (hit || p.rangeRemaining <= 0) {
          if (!hit) this.explodeSpellProjectile(p);
          this.spellProjectiles.splice(i, 1);
        }
      }

      // Tick elemental status effects on enemies & render visual indicators
      if (time - this.lastStatusEffectTickTime > 120) {
        this.lastStatusEffectTickTime = time;
        for (const [id, obj] of this.entityObjects.entries()) {
          if (id.startsWith('enemy_') || id.startsWith('boss_')) {
            const sprite = obj as Phaser.GameObjects.Sprite;
            if (!sprite.visible) continue;
            const ent = this.worldEntities.get(id);
            if (ent && ent.state) {
              const statusRes = StatusEffectManager.updateEffects(ent.state, time, (dmg, effectType) => {
                if (effectType === 'burn') {
                  this.particles?.emitBurnFlames(sprite.x, sprite.y, 3);
                  this.showFloatingText(sprite.x, sprite.y - 14, `-${dmg}`, "#f97316");
                  sounds.playEnemyHit();
                }
              });

              if (statusRes.isStunned) {
                this.particles?.emitStunStars(sprite.x, sprite.y, 1);
                sprite.setTint(0xfde047);
              } else if (StatusEffectManager.hasEffect(ent.state, 'freeze', time)) {
                this.particles?.emitFrostGleam(sprite.x, sprite.y, 1);
                sprite.setTint(0x7dd3fc);
              } else if (StatusEffectManager.hasEffect(ent.state, 'burn', time)) {
                this.particles?.emitBurnFlames(sprite.x, sprite.y, 1);
                sprite.setTint(0xf97316);
              } else {
                sprite.clearTint();
              }
            }
          }
        }
      }

      if (this.playerGlow) {
        this.playerGlow.setPosition(this.localPlayer.x, this.localPlayer.y);
      }

      const px = this.localPlayer.x;
      const py = this.localPlayer.y;

      // Dynamic Camera Director: Velocity Look-Ahead & Contextual Biome Framing
      if (!this.isCinematicPanning) {
        const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
        if (body) {
          const targetOffX = (body.velocity.x / 150) * 36;
          const targetOffY = (body.velocity.y / 150) * 28;
          this.camOffsetX = Phaser.Math.Linear(this.camOffsetX, targetOffX, 0.05);
          this.camOffsetY = Phaser.Math.Linear(this.camOffsetY, targetOffY, 0.05);
          this.cameras.main.setFollowOffset(-this.camOffsetX, -this.camOffsetY);
        }

        // Contextual Biome Framing Zoom
        let targetZoom = 1.75;
        if (py < 500) {
          targetZoom = 1.45; // Wide arena framing for Boss / Sunken Caverns
        } else if (px > 1400) {
          targetZoom = 1.60; // Expansive meadow framing
        } else if (py >= 650 && py <= 1200 && px >= 650 && px <= 1400) {
          targetZoom = 1.85; // Cozy intimate framing in Town Plaza
        }

        if (Math.abs(this.cameras.main.zoom - targetZoom) > 0.005) {
          this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.02);
        }
      }

      // Biome Boundary Detection & Title Card Trigger
      let biomeId = 'whispering_meadow';
      let biomeName = 'Whispering Meadow';
      let biomeSub = 'Home of the Great Acorns and Ancient Paths';
      let biomeIcon = '🍃';

      if (py < 540) {
        biomeId = 'ancient_ruins';
        biomeName = 'Ancient Sunken Ruins';
        biomeSub = 'Sacred moss-carved halls of the elder spore kings';
        biomeIcon = '🏛️';
      } else if (py >= 1280) {
        biomeId = 'crystal_lake';
        biomeName = 'Crystal Lake & Pier';
        biomeSub = 'Shimmering waters where ancient ripples tell forgotten tales';
        biomeIcon = '🌊';
      } else if (px < 640 && py >= 540 && py < 1280) {
        biomeId = 'fungal_hollow';
        biomeName = 'Fungal Hollow';
        biomeSub = 'Enchanted groves of glowing spore caps and wandering grumbles';
        biomeIcon = '🍄';
      } else if (px >= 640 && px <= 1408 && py >= 640 && py < 1280) {
        biomeId = 'oakhaven_town';
        biomeName = 'Oakhaven Town Plaza';
        biomeSub = 'A safe, cozy haven for weary wanderers and bakers';
        biomeIcon = '🏘️';
      }

      if (this.currentBiome !== biomeId) {
        this.currentBiome = biomeId;
        (window as any).BitQuestUI?.biomes?.showBiome({
          id: biomeId,
          name: biomeName,
          subtitle: biomeSub,
          icon: biomeIcon
        });
        this.updateBiomeColorGrading(biomeId);
        sounds.playBiomeChime();
        sounds.transitionBgm(biomeId, 2.2);
      }

      // Spatial 2D Audio, DSP Low-Pass & Heartbeat Pass
      sounds.setEnvironmentalLowPass(py < 550 ? 1100 : 20000);
      sounds.updateHealthHeartbeat(this.localPlayer.health, this.localPlayer.maxHealth);
      sounds.updateAmbientRiver(px, py);

      // Dynamic Y-Sorting Depth Pass
      this.localPlayer.setDepth(this.localPlayer.y);
      for (const other of this.otherPlayers.values()) {
        other.setDepth(other.y);
      }
      for (const obj of this.entityObjects.values()) {
        const sprite = obj as Phaser.GameObjects.Sprite;
        if (sprite && sprite.y !== undefined) {
          sprite.setDepth(sprite.y + (sprite.height ? sprite.height / 3 : 0));
        }
      }

      // Sync Ground Shadows
      for (const [id, shadow] of this.entityShadows.entries()) {
        const obj = this.entityObjects.get(id) as Phaser.GameObjects.Sprite;
        if (!obj || !obj.visible) {
          shadow.setVisible(false);
        } else {
          shadow.setVisible(true);
          shadow.setPosition(obj.x + 2, obj.y + (id.startsWith('boss_') ? 16 : 8));
          shadow.setDepth(obj.y - 1);
        }
      }

      // Point Light Radial Shadows (indoor braziers and lanterns)
      let nearestLight: { x: number; y: number } | null = null;
      let minLightDist = 140;
      for (const lt of this.pointLights) {
        const d = Math.hypot(px - lt.x, py - lt.y);
        if (d < minLightDist) {
          minLightDist = d;
          nearestLight = lt;
        }
      }

      if (nearestLight && this.localPlayer.shadowSprite) {
        const angle = Math.atan2(py - nearestLight.y, px - nearestLight.x);
        this.localPlayer.shadowSprite.setRotation(angle - Math.PI / 4);
      } else if (this.localPlayer.shadowSprite) {
        this.localPlayer.shadowSprite.setRotation(0);
      }

      // Dynamic Building Interior Roof-Lift & Canopy Punch-Hole
      for (const cottage of this.cottages) {
        const isInside = cottage.bounds.contains(px, py);
        if (isInside !== cottage.isInside) {
          cottage.isInside = isInside;
          const targetAlpha = isInside ? 0.20 : 1.0;
          this.tweens.add({
            targets: cottage.roofTiles,
            alpha: targetAlpha,
            duration: 220,
            ease: 'Sine.easeInOut'
          });
          if (isInside) {
            sounds.playFootstep('wood');
          }
        }
      }

      if (!this.cottages.some(c => c.isInside)) {
        for (const rf of this.roofTiles) {
          const dist = Math.hypot(px - rf.x, py - rf.y);
          if (dist < 52) {
            rf.image.setAlpha(0.35 + (dist / 52) * 0.55);
          } else {
            if (rf.image.alpha < 1) rf.image.setAlpha(1);
          }
        }
      }

      // Player X-Ray Silhouette behind high structures (Electric Cyan #38bdf8 glow at depth 3500)
      const behindCottage = (px >= 688 && px <= 848 && py >= 740 && py <= 800) ||
                            (px >= 1200 && px <= 1360 && py >= 740 && py <= 800);
      const behindWall = (px >= 640 && px <= 1408 && ((py >= 48 && py <= 104) || (py >= 490 && py <= 548)));
      const behindTopCanopy = py <= 48;
      const isPlayerOccluded = behindCottage || behindWall || behindTopCanopy;

      if (isPlayerOccluded) {
        this.playerSilhouette.setPosition(px, py + this.localPlayer.sprite.y);
        this.playerSilhouette.setTexture(this.localPlayer.sprite.texture.key, this.localPlayer.sprite.frame.name);
        this.playerSilhouette.setAngle(this.localPlayer.sprite.angle);
        this.playerSilhouette.setOrigin(0.5, 0.7);
        this.playerSilhouette.setAlpha(0.85);
      } else {
        if (this.playerSilhouette.alpha > 0) this.playerSilhouette.setAlpha(0);
      }

      // Enemy X-Ray Silhouettes behind structures (Vibrant Amber/Red #ef4444 glow)
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('enemy_') || id.startsWith('boss_')) {
          const sprite = obj as Phaser.GameObjects.Sprite;
          let sil = this.enemySilhouettes.get(id);
          if (!sil) {
            sil = this.add.sprite(sprite.x, sprite.y, sprite.texture.key);
            this.applyTintFill(sil, 0xef4444);
            sil.setDepth(3499);
            sil.setAlpha(0);
            this.enemySilhouettes.set(id, sil);
          }

          if (!sprite.visible) {
            if (sil.alpha > 0) sil.setAlpha(0);
            continue;
          }

          const ex = sprite.x;
          const ey = sprite.y;
          const enemyBehind = (ex >= 640 && ex <= 1408 && ((ey >= 48 && ey <= 104) || (ey >= 490 && ey <= 548))) || ey <= 48;

          if (enemyBehind) {
            sil.setPosition(ex, ey);
            sil.setTexture(sprite.texture.key, sprite.frame.name);
            sil.setAngle(sprite.angle);
            sil.setOrigin(sprite.originX, sprite.originY);
            sil.setAlpha(0.8);
          } else {
            if (sil.alpha > 0) sil.setAlpha(0);
          }
        }
      }

      // Minimap & Exploration Fog Pass
      const dirMap: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
      const facingIdx = dirMap[this.localPlayer.direction] ?? 0;

      const otherList: Array<{ x: number; y: number; color?: string }> = [];
      for (const other of this.otherPlayers.values()) {
        otherList.push({ x: other.x, y: other.y, color: other.color });
      }

      const entList: Array<{ id: string; x: number; y: number; type: string }> = [];
      for (const [id, obj] of this.entityObjects.entries()) {
        const spr = obj as Phaser.GameObjects.Sprite;
        if (spr && spr.visible) {
          entList.push({
            id,
            x: spr.x,
            y: spr.y,
            type: id.startsWith('boss_') ? 'boss' : id.startsWith('npc_') ? 'npc' : 'prop'
          });
        }
      }

      (window as any).BitQuestUI?.minimap?.update(
        { x: px, y: py, facing: facingIdx },
        otherList,
        entList
      );

      // 1. Magnetic collection of dropped items (extended 75px vacuum with physics curve)
      for (const [id, { sprite, shapeText, data }] of this.itemObjects.entries()) {
        const dist = Math.hypot(px - sprite.x, py - sprite.y);
        if (dist < 75) {
          const pullSpeed = 0.10 + (1 - dist / 75) * 0.18;
          sprite.x = Phaser.Math.Linear(sprite.x, px, pullSpeed);
          sprite.y = Phaser.Math.Linear(sprite.y, py, pullSpeed);

          if (shapeText) {
            shapeText.x = sprite.x;
            shapeText.y = sprite.y + 10;
          }

          if (dist < 20) {
            network.sendCollectItem(id);
            this.removeItem(id, network.yourId || '', data.itemType, data.value);
          }
        }
      }

      // 2. Touch Damage from alive enemies & boss
      if (!this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
        for (const [id, obj] of this.entityObjects.entries()) {
          if (id.startsWith('enemy_') || id.startsWith('boss_')) {
            const sprite = obj as Phaser.GameObjects.Sprite;
            if (sprite.visible) {
              const triggerDist = id.startsWith('boss_') ? 38 : 22;
              const dist = Math.hypot(px - sprite.x, py - sprite.y);
              if (dist < triggerDist) {
                this.hurtPlayer(1);
                break;
              }
            }
          }
        }
      }

      // 3. Spore projectiles flight & collision
      for (let i = this.sporeProjectiles.length - 1; i >= 0; i--) {
        const sp = this.sporeProjectiles[i];
        sp.sprite.x += (sp.vx * delta) / 1000;
        sp.sprite.y += (sp.vy * delta) / 1000;
        sp.life -= delta;

        // Check collision with local player
        if (!this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
          const dist = Math.hypot(px - sp.sprite.x, py - sp.sprite.y);
          if (dist < 20) {
            this.hurtPlayer(1);
            sp.sprite.destroy();
            this.sporeProjectiles.splice(i, 1);
            continue;
          }
        }

        if (sp.life <= 0) {
          sp.sprite.destroy();
          this.sporeProjectiles.splice(i, 1);
        }
      }

      // 3b. Orbiting Dizzy Stars above Stunned Boss
      if (this.bossDizzyStars.length > 0) {
        if (this.time.now < this.bossStunnedUntil) {
          const boss = this.entityObjects.get('boss_baron') as Phaser.GameObjects.Sprite | undefined;
          if (boss) {
            const t = this.time.now * 0.005;
            this.bossDizzyStars.forEach((star, idx) => {
              const ang = t + (idx / 3) * Math.PI * 2;
              star.setPosition(boss.x + Math.cos(ang) * 20, boss.y - 28 + Math.sin(ang) * 7);
              star.setDepth(boss.depth + 10);
            });
          }
        } else {
          this.bossDizzyStars.forEach(s => s.destroy());
          this.bossDizzyStars = [];
        }
      }

      // 4. Overhead Action Prompt & Reticle
      this.updateInteractionPrompt(time);

      // 5. Zero-Allocation Ambient Biome Particles & VFX Pipeline
      this.particles?.update(delta, this.cameras.main, this.currentBiome);

      // 6. Secondary Foliage Motion, Wind Simulation & Water Wake Ripples
      this.updateWindAndFoliage(time, delta);

      // 7. Living World Ambient AI, Gaze Tracking & Micro-Behaviors
      this.updateAmbientMicroBehaviors(time, delta);

      // 8. Environmental Decals & Persistent World Scars
      this.updateDecals(time);

      // 9. Cliff Ledge Elevation Jump Triggers
      const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
      if (body && body.velocity.y > 0 && !this.localPlayer.isJumpingLedge) {
        for (let i = 0; i < this.cliffLedges.length; i++) {
          const ledge = this.cliffLedges[i];
          if (Phaser.Geom.Rectangle.Contains(ledge.bounds, px, py)) {
            this.triggerLedgeJump(ledge);
            break;
          }
        }
      }

      // 10. Pitfall Chasm Hazard Checks
      if (!this.localPlayer.isJumpingLedge && !this.localPlayer.isRolling && !this.playerInvulnerable) {
        for (let i = 0; i < this.pitfalls.length; i++) {
          const pit = this.pitfalls[i];
          if (Math.hypot(px - pit.x, py - pit.y) < pit.radius) {
            this.triggerPitfall(pit);
            break;
          }
        }
      }

      // 11. Spatial Partitioning & Viewport Frustum Culling
      this.updateViewportCulling();

      // 12. Cozy Farming & Crop Cultivation (Expansion Milestone 1)
      this.updateFarming(delta);

      // 13. Cozy Hearth & Bakery Cooking Buffs (Expansion Milestone 2)
      this.updateCookingBuffs();
    }

    for (const other of this.otherPlayers.values()) {
      other.updateInterpolation(delta);
    }

    // 12. In-Engine Telemetry, Profiler & Physics Inspector (Issue #37)
    const drawCalls = (this.renderer as any)?.drawCount ?? (this.renderer as any)?.currentDrawCalls ?? 0;
    const particleCount = this.particles?.getActiveCount() ?? 0;
    const entityCount = this.entityObjects.size + this.otherPlayers.size + (this.localPlayer ? 1 : 0);
    const obstacleCount = this.obstacles?.children?.size ?? 0;
    telemetryProfiler.recordFrame(delta, drawCalls, particleCount, entityCount, obstacleCount);
    telemetryProfiler.recordPing(network.pingMs);

    const telemetryOverlay = (window as any).BitQuestTelemetry;
    if (telemetryOverlay) {
      telemetryOverlay.update(time);
      this.renderPhysicsInspector(telemetryOverlay);
    }
  }

  private renderPhysicsInspector(overlay: any) {
    if (!this.physicsDebugGraphics) return;

    if (!overlay.isVisible || !overlay.isPhysicsInspectorEnabled) {
      this.physicsDebugGraphics.clear();
      return;
    }

    this.physicsDebugGraphics.clear();
    telemetryProfiler.resetWireframes();

    // 1. Local Player Wireframes
    if (this.localPlayer) {
      telemetryProfiler.addPlayerWireframes(
        this.localPlayer.x,
        this.localPlayer.y,
        this.localPlayer.direction,
        this.localPlayer.isAttacking,
        this.localPlayer.equipmentStats?.cleaveRadius || 46,
        this.localPlayer.equipmentStats?.cleaveAngle || ((2 * Math.PI) / 3)
      );
    }

    // 2. Other Players
    for (const other of this.otherPlayers.values()) {
      telemetryProfiler.addPlayerWireframes(other.x, other.y, other.direction, false);
    }

    // 3. Visible Entities
    const cam = this.cameras.main;
    const viewL = cam.worldView.x - 48;
    const viewR = cam.worldView.right + 48;
    const viewT = cam.worldView.y - 48;
    const viewB = cam.worldView.bottom + 48;

    for (const [id, obj] of this.entityObjects.entries()) {
      const ent = obj as Phaser.GameObjects.Sprite;
      if (ent.x < viewL || ent.x > viewR || ent.y < viewT || ent.y > viewB) continue;
      const data = this.worldEntities.get(id);
      const type = data?.type || (id.startsWith('enemy_') ? 'monster' : 'npc');
      const isInteractable = !!(data?.state?.dialogueKey || id.startsWith('chest_') || id.startsWith('pot_') || id.startsWith('merchant_'));
      telemetryProfiler.addEntityWireframes(ent.x, ent.y, type, isInteractable);
    }

    // 4. Render Wireframes from Pool (zero-allocation WebGL draw commands)
    for (let i = 0; i < telemetryProfiler.wireframeCount; i++) {
      const box = telemetryProfiler.wireframePool[i];
      if (box.radius > 0) {
        if (box.arcEnd - box.arcStart < Math.PI * 1.9) {
          // Conical sweep slice
          if (box.fillAlpha > 0) {
            this.physicsDebugGraphics.fillStyle(box.color, box.fillAlpha);
            this.physicsDebugGraphics.slice(box.x, box.y, box.radius, box.arcStart, box.arcEnd, false);
            this.physicsDebugGraphics.fillPath();
          }
          this.physicsDebugGraphics.lineStyle(2, box.color, box.alpha);
          this.physicsDebugGraphics.slice(box.x, box.y, box.radius, box.arcStart, box.arcEnd, false);
          this.physicsDebugGraphics.strokePath();
        } else {
          // Full circle
          if (box.fillAlpha > 0) {
            this.physicsDebugGraphics.fillStyle(box.color, box.fillAlpha);
            this.physicsDebugGraphics.fillCircle(box.x, box.y, box.radius);
          }
          this.physicsDebugGraphics.lineStyle(1.5, box.color, box.alpha);
          this.physicsDebugGraphics.strokeCircle(box.x, box.y, box.radius);
        }
      } else {
        // Bounding box rectangle
        if (box.fillAlpha > 0) {
          this.physicsDebugGraphics.fillStyle(box.color, box.fillAlpha);
          this.physicsDebugGraphics.fillRect(box.x, box.y, box.width, box.height);
        }
        this.physicsDebugGraphics.lineStyle(1.5, box.color, box.alpha);
        this.physicsDebugGraphics.strokeRect(box.x, box.y, box.width, box.height);
      }
    }
  }

  private updateWindAndFoliage(time: number, delta: number) {
    const cam = this.cameras.main;
    const camX = cam.worldView.x;
    const camY = cam.worldView.y;
    const camW = cam.worldView.width;
    const camH = cam.worldView.height;

    // 1. Ambient Sinusoidal Wind Sway on Tree Canopies (culled offscreen)
    const windSpeed = 0.0018;
    for (let i = 0; i < this.treeCanopies.length; i++) {
      const canopy = this.treeCanopies[i];
      if (!SpatialGrid.isInFrustum(canopy.baseX, canopy.baseY, camX, camY, camW, camH, 64)) {
        continue;
      }
      const phase = canopy.baseX * 0.015 + canopy.baseY * 0.012;
      const swayOffset = Math.sin(time * windSpeed + phase) * 1.5;
      canopy.sprite.x = canopy.baseX + swayOffset;
      canopy.sprite.rotation = Math.sin(time * windSpeed * 0.8 + phase) * 0.02;
    }

    // 2. Interactive Foliage Displacement Parting & Wind Sway (culled offscreen)
    const px = this.localPlayer ? this.localPlayer.x : -9999;
    const py = this.localPlayer ? this.localPlayer.y : -9999;

    for (let i = 0; i < this.interactiveFoliage.length; i++) {
      const foliage = this.interactiveFoliage[i];
      if (!foliage.sprite.active) continue;
      if (!SpatialGrid.isInFrustum(foliage.baseX, foliage.baseY, camX, camY, camW, camH, 48)) {
        continue;
      }

      const phase = foliage.baseX * 0.04 + foliage.baseY * 0.03;
      const ambientSway = Math.sin(time * 0.0028 + phase) * 0.08;

      // Distance to local player
      const dx = foliage.baseX - px;
      const dy = foliage.baseY - py;
      const distSq = dx * dx + dy * dy;

      let minDisplace = 0;
      let isUnderfoot = false;

      if (distSq < 32 * 32) {
        isUnderfoot = true;
        const dist = Math.sqrt(distSq);
        const pushForce = Math.max(0, 1 - dist / 32);
        const dir = dx >= 0 ? 1 : -1;
        minDisplace = dir * pushForce * 0.45;
      }

      for (const other of this.otherPlayers.values()) {
        const odx = foliage.baseX - other.x;
        const ody = foliage.baseY - other.y;
        const oDistSq = odx * odx + ody * ody;
        if (oDistSq < 32 * 32) {
          const odist = Math.sqrt(oDistSq);
          const pushForce = Math.max(0, 1 - odist / 32);
          const dir = odx >= 0 ? 1 : -1;
          const otherDisplace = dir * pushForce * 0.45;
          if (Math.abs(otherDisplace) > Math.abs(minDisplace)) {
            minDisplace = otherDisplace;
            isUnderfoot = true;
          }
        }
      }

      if (isUnderfoot) {
        foliage.targetBend = minDisplace;
        foliage.sprite.scaleY = Phaser.Math.Linear(foliage.sprite.scaleY, 0.88, 0.2);
      } else {
        foliage.targetBend = 0;
        foliage.sprite.scaleY = Phaser.Math.Linear(foliage.sprite.scaleY, 1.0, 0.15);
      }

      // Smooth spring recovery
      foliage.currentBend = Phaser.Math.Linear(foliage.currentBend, foliage.targetBend, 0.18);
      foliage.sprite.rotation = foliage.currentBend + ambientSway;
    }

    // 3. Water Wake Ripples behind Swimming Ducks
    if (time - this.lastDuckRippleTime > 550) {
      this.lastDuckRippleTime = time;
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('wildlife_duck_') && obj instanceof Phaser.GameObjects.Sprite) {
          this.spawnWaterWakeRipple(obj.x, obj.y);
        }
      }
    }
  }

  private spawnWaterWakeRipple(x: number, y: number) {
    const ripple = this.add.ellipse(x, y + 4, 14, 7);
    ripple.setStrokeStyle(1.5, 0x93c5fd, 0.65);
    ripple.setDepth(y - 1);
    this.tweens.add({
      targets: ripple,
      scaleX: 2.3,
      scaleY: 2.3,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => ripple.destroy()
    });
  }

  private updateAmbientMicroBehaviors(time: number, delta: number) {
    if (!this.localPlayer) return;

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;

    // 1. Organic NPC & Critter Gaze Tracking
    const livingEntities = ['npc_barnaby', 'npc_grandma', 'npc_rooster', 'wildlife_buster'];
    for (const entId of livingEntities) {
      const obj = this.entityObjects.get(entId);
      if (!obj || !(obj instanceof Phaser.GameObjects.Sprite)) continue;

      const dx = px - obj.x;
      const dy = py - obj.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 85) {
        // Subtle gaze head-turn: flip towards player
        if (Math.abs(dx) > 8) {
          obj.setFlipX(dx < 0);
        }
        const angle = Math.atan2(dy, dx);
        const targetRot = Math.sin(angle) * 0.08;
        obj.rotation = Phaser.Math.Linear(obj.rotation, targetRot, 0.12);
      } else {
        // Return to resting idle
        if (entId === 'npc_rooster') {
          // Sir Reginald pecks the ground rhythmically when alone
          const peck = Math.sin(time * 0.005) * 0.08;
          obj.rotation = Phaser.Math.Linear(obj.rotation, peck, 0.1);
        } else {
          obj.rotation = Phaser.Math.Linear(obj.rotation, 0, 0.1);
        }
      }
    }

    // 2. Buster Napping Sleepy Zzz Emitter
    const busterObj = this.entityObjects.get('wildlife_buster');
    if (busterObj && busterObj instanceof Phaser.GameObjects.Sprite) {
      if (busterObj.texture.key === 'wildlife_dog_nap') {
        if (time - this.lastBusterZzzTime > 1800) {
          this.lastBusterZzzTime = time;
          this.emitSleepyZzz(busterObj.x + 6, busterObj.y - 12);
        }
      }
    }
  }

  public emitSleepyZzz(x: number, y: number) {
    const zzz = this.add.image(x + (Math.random() * 4 - 2), y, 'particle_zzz');
    zzz.setDepth(y + 60);
    zzz.setScale(0.7);
    zzz.setAlpha(0.9);
    this.tweens.add({
      targets: zzz,
      x: zzz.x + 8,
      y: zzz.y - 20,
      alpha: 0,
      scale: 1.25,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => zzz.destroy()
    });
  }

  private setupDecalPool() {
    for (let i = 0; i < WorldScene.MAX_DECALS; i++) {
      const img = this.add.image(0, 0, 'decal_pot_shard');
      img.setDepth(2);
      img.setVisible(false);
      this.decalPool.push({
        image: img,
        spawnTime: 0,
        lingerDuration: 0,
        fadeDuration: 1500,
        initialAlpha: 1.0,
        active: false
      });
    }
  }

  public stampDecal(key: string, x: number, y: number, lingerMs: number, alpha = 0.85, rotation = 0) {
    if (this.decalPool.length === 0) return;
    const decal = this.decalPool[this.decalIndex];
    this.decalIndex = (this.decalIndex + 1) % WorldScene.MAX_DECALS;

    decal.image.setTexture(key);
    decal.image.setPosition(x, y);
    decal.image.setRotation(rotation);
    decal.image.setAlpha(alpha);
    decal.image.setVisible(true);
    decal.spawnTime = this.time.now;
    decal.lingerDuration = lingerMs;
    decal.fadeDuration = 1500;
    decal.initialAlpha = alpha;
    decal.active = true;
  }

  public stampPotShardDecals(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const ox = x + (Math.random() * 18 - 9);
      const oy = y + (Math.random() * 12 - 6);
      this.stampDecal('decal_pot_shard', ox, oy, 15000, 0.85, Math.random() * Math.PI * 2);
    }
  }

  public stampFoliageDecals(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const ox = x + (Math.random() * 16 - 8);
      const oy = y + (Math.random() * 12 - 6);
      this.stampDecal('decal_leaf_clipping', ox, oy, 12000, 0.75, Math.random() * Math.PI * 2);
    }
  }

  public stampFootprintDecal(x: number, y: number, dir: Direction) {
    let rot = 0;
    if (dir === 'up') rot = 0;
    else if (dir === 'down') rot = Math.PI;
    else if (dir === 'left') rot = -Math.PI / 2;
    else if (dir === 'right') rot = Math.PI / 2;
    this.stampDecal('decal_footprint_mud', x, y, 8000, 0.45, rot);
  }

  public stampSlimeDecal(x: number, y: number) {
    this.stampDecal('decal_slime_splatter', x, y, 10000, 0.65, Math.random() * Math.PI * 2);
  }

  private updateDecals(time: number) {
    for (let i = 0; i < this.decalPool.length; i++) {
      const d = this.decalPool[i];
      if (!d.active) continue;

      const age = time - d.spawnTime;
      if (age > d.lingerDuration + d.fadeDuration) {
        d.active = false;
        d.image.setVisible(false);
      } else if (age > d.lingerDuration) {
        const p = (age - d.lingerDuration) / d.fadeDuration;
        d.image.setAlpha(d.initialAlpha * (1 - p));
      }
    }
  }

  private triggerLedgeJump(ledge: { bounds: Phaser.Geom.Rectangle; landingY: number }) {
    if (!this.localPlayer || this.localPlayer.isJumpingLedge) return;
    sounds.playLedgeHop();
    this.localPlayer.jumpLedge(ledge.landingY, 340, () => {
      sounds.playFootstep('dirt');
      this.stampFootprintDecal(this.localPlayer.x, this.localPlayer.y, 'down');
    });
  }

  private triggerPitfall(pit: { x: number; y: number; safeX: number; safeY: number; radius: number }) {
    if (!this.localPlayer || this.localPlayer.isJumpingLedge) return;
    sounds.playPitfall();
    this.triggerCameraShake(200, 0.008);
    this.localPlayer.fallIntoPit(pit.safeX, pit.safeY, () => {
      this.hurtPlayer(1);
    });
  }

  private lastCullCheck = 0;
  private updateViewportCulling() {
    const now = this.time.now;
    if (now - this.lastCullCheck < 100) return; // 10Hz check
    this.lastCullCheck = now;

    const cam = this.cameras.main;
    const camX = cam.worldView.x;
    const camY = cam.worldView.y;
    const camW = cam.worldView.width;
    const camH = cam.worldView.height;
    const MARGIN = 80;

    // Cull offscreen entity sprites and shadows
    for (const [id, obj] of this.entityObjects.entries()) {
      if (id.startsWith('boss_')) continue;
      if (!obj || typeof (obj as any).x !== 'number') continue;

      const sp = obj as Phaser.GameObjects.Sprite;
      const inFrustum = SpatialGrid.isInFrustum(sp.x, sp.y, camX, camY, camW, camH, MARGIN);
      const shadow = this.entityShadows.get(id);

      if (!inFrustum) {
        if (sp.visible) sp.setVisible(false);
        if (shadow && shadow.visible) shadow.setVisible(false);
      } else {
        const isDestroyed = (sp as any).destroyedState === true;
        if (!isDestroyed && !sp.visible) sp.setVisible(true);
        if (!isDestroyed && shadow && !shadow.visible) shadow.setVisible(true);
      }
    }
  }

  private setupInteractionPrompt() {
    this.promptContainer = this.add.container(0, 0);
    this.promptContainer.setDepth(10000); // Always above entities
    this.promptContainer.setAlpha(0);

    // Subtle corner brackets reticle
    this.promptReticle = this.add.graphics();
    this.promptContainer.add(this.promptReticle);

    // Pill background
    this.promptBg = this.add.graphics();
    this.promptContainer.add(this.promptBg);

    // Action Text
    this.promptActionText = this.add.text(0, -28, '[E] Talk', {
      fontFamily: 'monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#f8fafc',
      align: 'center'
    }).setOrigin(0.5, 0.5);
    this.promptContainer.add(this.promptActionText);
  }

  private updateInteractionPrompt(time: number) {
    if (!this.localPlayer || !this.promptContainer) return;

    let targetX = 0;
    let targetY = 0;
    let label = '';
    let themeColor = 0xfacc15;
    let hasTarget = false;
    let isSelf = false;

    // 0. Airborne Pot Catching Prompt
    let airborneTarget: { x: number; y: number } | null = null;
    for (const [potId, airborne] of this.airbornePots.entries()) {
      const dist = Math.hypot(this.localPlayer.x - airborne.pot.x, this.localPlayer.y - airborne.pot.y);
      if (dist < 52) {
        airborneTarget = { x: airborne.pot.x, y: airborne.pot.y };
        break;
      }
    }

    // 0a. Mounted Wildlife Dismount Prompt
    if (this.localPlayer.mountedEntityId) {
      hasTarget = true;
      isSelf = true;
      targetX = this.localPlayer.x;
      targetY = this.localPlayer.y - 18;
      label = '[E] Dismount';
      themeColor = 0x22c55e;
    } else if (airborneTarget) {
      hasTarget = true;
      targetX = airborneTarget.x;
      targetY = airborneTarget.y - 12;
      label = '[E] Catch Pot!';
      themeColor = 0xfacc15;
    } else if (this.localPlayer.carryingPotId) {
      hasTarget = true;
      isSelf = true;
      targetX = this.localPlayer.x;
      targetY = this.localPlayer.y - 18;
      label = '[E] Throw Pot';
      themeColor = 0xf97316;
    } else {
      const px = this.localPlayer.x;
      const py = this.localPlayer.y;

      const prioritized = BehaviorRegistry.getPrioritizedInteraction(
        px,
        py,
        this.worldEntities.values(),
        56,
        this.localPlayer as any
      );

      if (prioritized) {
        hasTarget = true;
        targetX = prioritized.entity.x;
        targetY = prioritized.entity.y;
        label = prioritized.promptText;

        if (prioritized.entity.type === 'mount') {
          themeColor = 0x22c55e;
        } else if (prioritized.entity.type === 'campfire') {
          targetY = prioritized.entity.y - 18;
          themeColor = 0xf97316;
        } else if (prioritized.entity.id === 'wildlife_buster') {
          themeColor = 0xf59e0b;
        } else if (prioritized.entity.type === 'torch') {
          themeColor = 0xf59e0b;
        } else {
          themeColor = prioritized.trait.priorityWeight > 75 ? 0xf59e0b : 0x38bdf8;
        }
      }
    }

    if (hasTarget) {
      this.promptAlpha = Phaser.Math.Linear(this.promptAlpha, 1.0, 0.25);
    } else {
      this.promptAlpha = Phaser.Math.Linear(this.promptAlpha, 0, 0.25);
    }

    this.promptContainer.setAlpha(this.promptAlpha);
    if (this.promptAlpha < 0.02) {
      this.promptContainer.setVisible(false);
      return;
    }

    this.promptContainer.setVisible(true);
    const bob = Math.sin(time * 0.007) * 2;
    this.promptContainer.setPosition(targetX, targetY);

    // Update Action Text
    if (this.promptActionText.text !== label) {
      this.promptActionText.setText(label);
    }
    const textY = isSelf ? -34 + bob : -26 + bob;
    this.promptActionText.setPosition(0, textY);

    // Draw Pill Background
    const textW = this.promptActionText.width + 12;
    const textH = 16;
    this.promptBg.clear();
    this.promptBg.fillStyle(0x0f172a, 0.92);
    this.promptBg.fillRoundedRect(-textW / 2, textY - textH / 2, textW, textH, 6);
    this.promptBg.lineStyle(1.5, themeColor, 0.9);
    this.promptBg.strokeRoundedRect(-textW / 2, textY - textH / 2, textW, textH, 6);

    // Draw Corner Brackets Reticle around target
    this.promptReticle.clear();
    if (!isSelf) {
      const pulse = 1 + Math.sin(time * 0.009) * 0.08;
      const bw = 16 * pulse;
      const bh = 16 * pulse;
      const arm = 5;

      this.promptReticle.lineStyle(2, themeColor, 0.85);

      // Top-Left
      this.promptReticle.beginPath();
      this.promptReticle.moveTo(-bw, -bh + arm);
      this.promptReticle.lineTo(-bw, -bh);
      this.promptReticle.lineTo(-bw + arm, -bh);
      this.promptReticle.stroke();

      // Top-Right
      this.promptReticle.beginPath();
      this.promptReticle.moveTo(bw - arm, -bh);
      this.promptReticle.lineTo(bw, -bh);
      this.promptReticle.lineTo(bw, -bh + arm);
      this.promptReticle.stroke();

      // Bottom-Left
      this.promptReticle.beginPath();
      this.promptReticle.moveTo(-bw, bh - arm);
      this.promptReticle.lineTo(-bw, bh);
      this.promptReticle.lineTo(-bw + arm, bh);
      this.promptReticle.stroke();

      // Bottom-Right
      this.promptReticle.beginPath();
      this.promptReticle.moveTo(bw - arm, bh);
      this.promptReticle.lineTo(bw, bh);
      this.promptReticle.lineTo(bw, bh - arm);
      this.promptReticle.stroke();
    }
  }

  public getSurfaceAt(worldX: number, worldY: number): 'grass' | 'dirt' | 'stone' | 'wood' | 'water' {
    const tx = Math.floor(worldX / 32);
    const ty = Math.floor(worldY / 32);

    // River footbridge
    if ((tx === 52 || tx === 53) && (ty === 29 || ty === 30)) return 'wood';
    // Lake pier / dock
    if ((tx === 31 || tx === 32) && (ty >= 41 && ty <= 44)) return 'wood';
    // River & Lake water bodies
    if (tx === 52 || tx === 53) return 'water';
    if (tx >= 22 && tx <= 42 && ty >= 41 && ty <= 54) return 'water';
    // Sunken Ruins stone courtyard & perimeter
    if (tx >= 20 && tx <= 43 && ty >= 2 && ty <= 16) return 'stone';
    // Cobblestone / dirt path intersections
    if (ty === 28 || (tx === 32 && ty >= 16 && ty <= 40)) return 'dirt';
    // Cottage shop approaches
    if ((tx >= 21 && tx <= 26 && ty >= 24 && ty <= 28) || (tx >= 37 && tx <= 42 && ty >= 24 && ty <= 28)) return 'dirt';

    return 'grass';
  }

  private updateBiomeColorGrading(biomeId: string) {
    if (!this.ambientOverlay) return;
    let targetColor = 0xf59e0b;
    let targetAlpha = 0.07;

    if (biomeId === 'ancient_ruins') {
      targetColor = 0x6366f1;
      targetAlpha = 0.16;
    } else if (biomeId === 'crystal_lake') {
      targetColor = 0x0ea5e9;
      targetAlpha = 0.08;
    } else if (biomeId === 'whispering_meadow') {
      targetColor = 0x10b981;
      targetAlpha = 0.05;
    } else if (biomeId === 'fungal_hollow') {
      targetColor = 0xa855f7; // Mystical violet spore ambient
      targetAlpha = 0.10;
    } else if (biomeId === 'oakhaven_town') {
      targetColor = 0xf59e0b;
      targetAlpha = 0.08;
    }

    this.tweens.add({
      targets: this.ambientOverlay,
      alpha: targetAlpha,
      duration: 900,
      ease: 'Sine.easeInOut',
      onStart: () => {
        this.ambientOverlay.setFillStyle(targetColor);
      }
    });
  }

  // ==========================================
  // Cozy Bobber Fishing Engine (Task 7.5 / Issue #23)
  // ==========================================

  public handleActionFishing(isDown: boolean) {
    if (!this.localPlayer) return;
    if (isDown) {
      if (this.isLocalFishing) {
        if (this.fishingPhase === 'bite' || this.fishingPhase === 'reeling') {
          this.handleReelInput(true);
        } else if (this.fishingPhase === 'waiting') {
          // Cancel cast
          network.sendFishingCancel();
        }
      } else {
        // Not fishing: try to find nearest water in facing direction
        const found = FishingEngine.findNearestWater(
          this.localPlayer.x,
          this.localPlayer.y,
          this.localPlayer.direction,
          this.activeFloor
        );
        if (found.found) {
          this.castFishingLine(found.x, found.y);
        } else {
          this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 22, "Stand near water to fish! 🌊", "#38bdf8", false);
        }
      }
    } else {
      if (this.isLocalFishing) {
        this.handleReelInput(false);
      }
    }
  }

  public handleReelInput(isHolding: boolean) {
    if (!this.isLocalFishing) return;
    network.sendFishingReel(isHolding);
  }

  public castFishingLine(targetX: number, targetY: number) {
    if (!this.localPlayer) return;
    sounds.ensureContext();
    network.sendFishingCast(targetX, targetY);
  }

  private spawnFishingBobber(playerId: string, startX: number, startY: number, targetX: number, targetY: number) {
    const isLocal = this.localPlayer && playerId === network.yourId;

    // Line Graphics
    const lineGfx = this.add.graphics();
    lineGfx.setDepth(940);

    // Animated Bobber Sprite
    const bobber = this.add.sprite(startX, startY, 'prop_bobber');
    bobber.setDepth(950);

    // Parabolic cast trajectory tween
    this.tweens.add({
      targets: bobber,
      x: targetX,
      y: targetY,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => {
        sounds.playBobberPlop();
        this.emitWaterRipple(targetX, targetY, 24);
      }
    });

    if (isLocal) {
      if (this.activeFishingBobber) this.activeFishingBobber.destroy();
      if (this.fishingLineGfx) this.fishingLineGfx.destroy();
      this.activeFishingBobber = bobber;
      this.fishingLineGfx = lineGfx;
      this.fishingTargetPos.x = targetX;
      this.fishingTargetPos.y = targetY;
    } else {
      this.remoteBobbers.set(playerId, {
        sprite: bobber,
        lineGfx,
        targetX,
        targetY
      });
    }
  }

  private cleanupFishingSession(playerId: string) {
    const isLocal = this.localPlayer && playerId === network.yourId;
    if (isLocal) {
      if (this.activeFishingBobber) {
        this.activeFishingBobber.destroy();
        this.activeFishingBobber = null;
      }
      if (this.fishingLineGfx) {
        this.fishingLineGfx.destroy();
        this.fishingLineGfx = null;
      }
      if (this.biteAlertText) {
        this.biteAlertText.destroy();
        this.biteAlertText = null;
      }
    } else {
      const remote = this.remoteBobbers.get(playerId);
      if (remote) {
        remote.sprite.destroy();
        remote.lineGfx.destroy();
        this.remoteBobbers.delete(playerId);
      }
    }
  }

  private showBiteAlert(x: number, y: number) {
    if (this.biteAlertText) this.biteAlertText.destroy();
    this.biteAlertText = this.add.text(x, y, '!', {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: '20px',
      color: '#facc15',
      stroke: '#0f172a',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: this.biteAlertText,
      y: y - 10,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 180,
      yoyo: true,
      repeat: 3
    });
  }

  private createTensionHud() {
    if (this.tensionHudContainer) this.destroyTensionHud();
    if (!this.localPlayer) return;

    this.tensionHudContainer = this.add.container(this.localPlayer.x, this.localPlayer.y - 48);
    this.tensionHudContainer.setDepth(3000);

    // Dark backdrop
    const bg = this.add.graphics();
    bg.fillStyle(0x090d16, 0.90);
    bg.fillRoundedRect(-36, -14, 72, 28, 4);
    bg.lineStyle(1.5, 0x38bdf8, 1);
    bg.strokeRoundedRect(-36, -14, 72, 28, 4);

    // Tension Track (56px wide)
    const track = this.add.graphics();
    track.fillStyle(0x1e293b, 1);
    track.fillRect(-28, -6, 56, 8);

    // Sweet Spot Zone (green)
    this.tensionSweetZone = this.add.rectangle(-28, -2, 16, 8, 0x22c55e, 0.85);

    // Tension Needle (yellow indicator line)
    this.tensionNeedle = this.add.rectangle(0, -2, 3, 12, 0xfacc15, 1);

    // Reel Progress Track (thin bar underneath)
    const progTrack = this.add.graphics();
    progTrack.fillStyle(0x334155, 1);
    progTrack.fillRect(-28, 6, 56, 4);

    // Reel Progress Fill (cyan)
    this.tensionProgressBar = this.add.rectangle(-28, 8, 2, 4, 0x06b6d4, 1).setOrigin(0, 0.5);

    // Text label
    this.tensionHintText = this.add.text(0, -18, 'REEL! [F]/[SPACE]', {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: '7px',
      color: '#facc15',
      stroke: '#0f172a',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tensionHudContainer.add([
      bg,
      track,
      this.tensionSweetZone,
      this.tensionNeedle,
      progTrack,
      this.tensionProgressBar,
      this.tensionHintText
    ]);
  }

  private updateTensionHud(tension: number, sweetSpotCenter: number, reelProgress: number) {
    if (!this.tensionHudContainer || !this.localPlayer) return;

    // Position container above player
    this.tensionHudContainer.setPosition(this.localPlayer.x, this.localPlayer.y - 48);

    // Update needle (-28 to +28)
    if (this.tensionNeedle) {
      const nx = -28 + Math.max(0, Math.min(1, tension)) * 56;
      this.tensionNeedle.x = nx;
    }

    // Update sweet spot zone
    if (this.tensionSweetZone) {
      const zx = -28 + Math.max(0, Math.min(1, sweetSpotCenter)) * 56;
      this.tensionSweetZone.x = zx;
    }

    // Update progress bar width
    if (this.tensionProgressBar) {
      const pw = Math.max(2, Math.min(56, reelProgress * 56));
      this.tensionProgressBar.width = pw;
    }
  }

  private destroyTensionHud() {
    if (this.tensionHudContainer) {
      this.tensionHudContainer.destroy();
      this.tensionHudContainer = null;
      this.tensionNeedle = null;
      this.tensionSweetZone = null;
      this.tensionProgressBar = null;
      this.tensionHintText = null;
    }
    if (this.biteAlertText) {
      this.biteAlertText.destroy();
      this.biteAlertText = null;
    }
  }

  public emitWaterRipple(x: number, y: number, maxRadius = 24) {
    const circle = this.add.arc(x, y, 4, 0, 360, false, undefined, 0);
    circle.setStrokeStyle(1.5, 0x67e8f9, 0.85);
    circle.setDepth(930);
    this.waterRipples.push({
      circle,
      radius: 4,
      maxRadius,
      alpha: 0.85
    });
  }

  public emitGoldSparkles(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 25 + Math.random() * 30;
      const p = this.add.circle(x, y, Math.random() < 0.5 ? 3 : 2, 0xfacc15);
      p.setDepth(3500);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 15,
        alpha: 0,
        scale: 0.2,
        duration: 450 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  public emitOcarinaNoteVfx(x: number, y: number, color: string = '#38bdf8', glyph: string = '♪') {
    const noteText = this.add.text(x + (Math.random() * 16 - 8), y - 10, glyph, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(3600);

    const endX = noteText.x + (Math.random() * 24 - 12);
    const endY = noteText.y - 32 - Math.random() * 16;

    this.tweens.add({
      targets: noteText,
      x: endX,
      y: endY,
      alpha: 0,
      scale: 1.35,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        noteText.destroy();
      }
    });

    // Mini harmonic sparkles
    for (let i = 0; i < 4; i++) {
      const p = this.add.circle(x + (Math.random() * 12 - 6), y - 6, 2, Phaser.Display.Color.HexStringToColor(color).color);
      p.setDepth(3550);
      this.tweens.add({
        targets: p,
        x: p.x + (Math.random() * 20 - 10),
        y: p.y - 15 - Math.random() * 15,
        alpha: 0,
        scale: 0.2,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private updateFishing(time: number, delta: number) {
    const dt = delta / 1000;

    // 1. Water ripples expansion & decay
    for (let i = this.waterRipples.length - 1; i >= 0; i--) {
      const r = this.waterRipples[i];
      r.radius += 18 * dt;
      r.alpha -= 0.65 * dt;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        r.circle.destroy();
        this.waterRipples.splice(i, 1);
      } else {
        r.circle.setRadius(r.radius);
        r.circle.setStrokeStyle(1.5, 0x67e8f9, r.alpha);
      }
    }

    // 2. Local player fishing line & bobber
    if (this.isLocalFishing && this.activeFishingBobber && this.fishingLineGfx && this.localPlayer) {
      // Bobber floating motion
      const bobY = this.fishingPhase === 'bite'
        ? this.fishingTargetPos.y + 4
        : this.fishingTargetPos.y + Math.sin(time * 0.005) * 2;
      this.activeFishingBobber.y = bobY;

      // Draw fishing line
      this.fishingLineGfx.clear();
      const tipX = this.localPlayer.x + (this.localPlayer.direction === 'left' ? -12 : (this.localPlayer.direction === 'right' ? 12 : 0));
      const tipY = this.localPlayer.y - 10;
      const midX = (tipX + this.activeFishingBobber.x) / 2;
      const midY = Math.max(tipY, this.activeFishingBobber.y) - 6 + Math.sin(time * 0.004) * 2;

      this.fishingLineGfx.lineStyle(1.5, 0x475569, 0.85);
      this.fishingLineGfx.beginPath();
      this.fishingLineGfx.moveTo(tipX, tipY);
      this.fishingLineGfx.lineTo(midX, midY);
      this.fishingLineGfx.lineTo(this.activeFishingBobber.x, this.activeFishingBobber.y);
      this.fishingLineGfx.strokePath();

      // Gentle water ripple emission
      if (Math.random() < 0.02) {
        this.emitWaterRipple(this.activeFishingBobber.x, this.activeFishingBobber.y + 2, 16);
      }
    }

    // 3. Remote other players fishing lines
    for (const [playerId, r] of this.remoteBobbers.entries()) {
      const other = this.otherPlayers.get(playerId);
      if (other && r.lineGfx && r.sprite) {
        r.sprite.y = r.targetY + Math.sin(time * 0.005) * 2;
        r.lineGfx.clear();
        const tipX = other.x;
        const tipY = other.y - 10;
        const midX = (tipX + r.sprite.x) / 2;
        const midY = Math.max(tipY, r.sprite.y) - 6;

        r.lineGfx.lineStyle(1.5, 0x475569, 0.75);
        r.lineGfx.beginPath();
        r.lineGfx.moveTo(tipX, tipY);
        r.lineGfx.lineTo(midX, midY);
        r.lineGfx.lineTo(r.sprite.x, r.sprite.y);
        r.lineGfx.strokePath();
      }
    }
  }

  // ==========================================
  // Weather, Rain, Lightning & Fireflies Helpers (Task 7.6 / Issue #24)
  // ==========================================

  private updateRainParticles(delta: number) {
    if (!this.rainGraphics) return;
    this.rainGraphics.clear();

    const isRaining = this.currentWeather === 'rain' || this.currentWeather === 'storm';
    if (!isRaining) return;

    const cam = this.cameras.main;
    const isStorm = this.currentWeather === 'storm';
    const count = isStorm ? this.rainDrops.length : Math.floor(this.rainDrops.length * 0.65);
    const speedMult = isStorm ? 1.4 : 1.0;
    const cosA = Math.cos(this.windAngle);
    const sinA = Math.sin(this.windAngle);
    const dt = delta / 1000;

    for (let i = 0; i < count; i++) {
      const drop = this.rainDrops[i]!;
      drop.x += cosA * drop.speed * speedMult * dt;
      drop.y += sinA * drop.speed * speedMult * dt;

      // Wrap around camera viewport
      if (drop.x > cam.worldView.right + 40) drop.x = cam.worldView.left - 40;
      if (drop.x < cam.worldView.left - 40) drop.x = cam.worldView.right + 40;
      if (drop.y > cam.worldView.bottom + 40) drop.y = cam.worldView.top - 40;
      if (drop.y < cam.worldView.top - 40) drop.y = cam.worldView.bottom + 40;

      // Render rain streak
      const x2 = drop.x + cosA * drop.length;
      const y2 = drop.y + sinA * drop.length;
      this.rainGraphics.lineStyle(isStorm ? 1.5 : 1.0, 0x93c5fd, drop.alpha);
      this.rainGraphics.lineBetween(drop.x, drop.y, x2, y2);
    }
  }

  private updateFireflies(delta: number, time: number) {
    if (!this.fireflyGraphics) return;
    this.fireflyGraphics.clear();

    const info = WeatherEngine.getTimeOfDay(this.timeOfDaySec);
    const isNightTime = info.phase === 'twilight' || info.phase === 'night' || info.phase === 'early_dawn';
    if (!isNightTime) return;

    const cam = this.cameras.main;
    const dt = delta / 1000;

    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i]!;
      f.phase += f.speed * dt;
      f.x = f.baseX + Math.sin(f.phase) * 16 + Math.cos(f.phase * 0.4) * 8;
      f.y = f.baseY + Math.cos(f.phase * 0.8) * 12 + Math.sin(f.phase * 0.3) * 6;

      if (cam.worldView.contains(f.x, f.y)) {
        const pulse = 0.35 + 0.55 * Math.sin(f.phase * 2.5);
        // Soft outer glow
        this.fireflyGraphics.fillStyle(0xa3e635, pulse * 0.35);
        this.fireflyGraphics.fillCircle(f.x, f.y, 4.5);
        // Bright core
        this.fireflyGraphics.fillStyle(0xfef08a, pulse * 0.85);
        this.fireflyGraphics.fillCircle(f.x, f.y, 1.8);
      }
    }
  }

  public triggerLightningStrike(x: number, y: number) {
    if (this.localPlayer && this.localPlayer.y >= 2000) return;

    if (this.lightningFlashOverlay) {
      this.lightningFlashOverlay.setAlpha(0.95);
      this.tweens.add({
        targets: this.lightningFlashOverlay,
        alpha: 0.15,
        duration: 50,
        yoyo: true,
        hold: 25,
        onComplete: () => {
          this.tweens.add({
            targets: this.lightningFlashOverlay,
            alpha: 0,
            duration: 180,
            ease: 'Cubic.easeOut'
          });
        }
      });
    }

    this.triggerCameraShake(180, 0.007);
    sounds.playThunder();
  }

  public emitWarmthSparks(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(x + (Math.random() * 20 - 10), y + (Math.random() * 10 - 5), 2.5, 0x4ade80);
      p.setDepth(y + 20);
      this.tweens.add({
        targets: p,
        y: p.y - 25 - Math.random() * 15,
        alpha: 0,
        scale: 0.2,
        duration: 600 + Math.random() * 300,
        onComplete: () => p.destroy()
      });
    }
  }

  public updateWeatherAudio(weather: WeatherType) {
    if (this.localPlayer && this.localPlayer.y >= 2000) {
      sounds.setRainAmbient(false);
      return;
    }
    if (weather === 'rain') {
      sounds.setRainAmbient(true, 0.5);
    } else if (weather === 'storm') {
      sounds.setRainAmbient(true, 1.0);
    } else {
      sounds.setRainAmbient(false);
    }
  }
}
