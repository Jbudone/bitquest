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

export class WorldScene extends Phaser.Scene {
  public localPlayer: Player | null = null;
  public otherPlayers = new Map<string, OtherPlayer>();
  public entityObjects = new Map<string, Phaser.GameObjects.GameObject>();
  public entityShadows = new Map<string, Phaser.GameObjects.Sprite>();
  public worldEntities = new Map<string, EntityData>();
  public itemObjects = new Map<string, { sprite: Phaser.GameObjects.Sprite; shapeText?: Phaser.GameObjects.Text; data: ItemDropData }>();
  public playerGlow?: Phaser.GameObjects.Image;
  public particles!: ParticlePipeline;

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
    this.playerSilhouette.setTintFill(0x38bdf8);
    this.playerSilhouette.setAlpha(0);
    this.playerSilhouette.setDepth(3500);

    // 1d. Biome Color Grading & Atmospheric Ambient Lighting Overlay
    this.ambientOverlay = this.add.rectangle(1024, 896, 2048, 1792, 0xf59e0b);
    this.ambientOverlay.setDepth(1500);
    this.ambientOverlay.setAlpha(0.06);

    // 1e. Centralized Zero-Allocation VFX & Ambient Particle Pipeline
    this.particles = new ParticlePipeline(this);

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
        X: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
      };

      // Space / J: Attack / Throw
      this.keys.SPACE.on('down', () => this.handleActionAttack());
      this.keys.J.on('down', () => this.handleActionAttack());

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
    this.cameras.main.setZoom(1.75); // Cozy pixel zoom!
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
      const tex = ent.state.opened ? 'chest_opened' : 'chest_closed';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      const shadow = this.add.sprite(ent.x + 1, ent.y + 6, 'shadow_small').setAlpha(0.6).setDepth(ent.y - 1);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'door') {
      obj = this.add.sprite(ent.x, ent.y, ent.state.opened ? 'gate_opened' : 'gate_closed');
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
    } else if (ent.type === 'enemy') {
      const tex = ent.subtype === 'sproutling' ? 'enemy_sproutling' : 'enemy_grumble';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      sprite.setVisible(!ent.state.destroyed);
      const shadow = this.add.sprite(ent.x + 2, ent.y + 8, 'shadow_directional_45').setAlpha(0.6).setDepth(ent.y - 1);
      shadow.setVisible(!ent.state.destroyed);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'boss') {
      const sprite = this.add.sprite(ent.x, ent.y, 'boss_baron');
      sprite.setVisible(!ent.state.destroyed);
      const shadow = this.add.sprite(ent.x + 4, ent.y + 16, 'shadow_boss').setAlpha(0.7).setDepth(ent.y - 1);
      shadow.setVisible(!ent.state.destroyed);
      this.entityShadows.set(ent.id, shadow);
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
    } else {
      obj = this.add.rectangle(ent.x, ent.y, 20, 20, 0xffffff);
    }

    this.entityObjects.set(ent.id, obj);
  }

  private updateEntityVisuals(ent: EntityData) {
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
      obj.setTexture(isOpened ? 'chest_opened' : 'chest_closed');
    } else if (ent.type === 'door') {
      const isOpened = !!ent.state.opened;
      obj.setTexture(isOpened ? 'gate_opened' : 'gate_closed');
    } else if (ent.type === 'wildlife' && ent.subtype === 'dog') {
      if (ent.state.petCount && ent.state.petCount !== (obj as any).lastPetCount) {
        (obj as any).lastPetCount = ent.state.petCount;
        this.emitHeartBurst(ent.x, ent.y);
      }
      const b = ent.state.behavior || 'idle';
      const targetTex = b === 'sniff' ? 'wildlife_dog_sniff' : b === 'nap' ? 'wildlife_dog_nap' : 'wildlife_dog_idle';
      if (obj.texture?.key !== targetTex) {
        obj.setTexture(targetTex);
      }
    } else if (ent.type === 'enemy') {
      const wasVisible = obj.visible;
      obj.setVisible(!ent.state.destroyed);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!ent.state.destroyed);
      if (wasVisible && ent.state.destroyed) {
        this.stampSlimeDecal(ent.x, ent.y);
      }

      // Overhead Question Mark for Confused / Leashing State
      let confIcon = this.enemyConfusedIcons.get(ent.id);
      if (ent.state.aiState === 'confused' && !ent.state.destroyed) {
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

      if (!ent.state.destroyed) {
        // Smooth lerp to new position
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 300,
          ease: 'Sine.easeOut'
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
      obj.setVisible(!ent.state.destroyed);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!ent.state.destroyed);
      if (!ent.state.destroyed) {
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 350,
          ease: 'Sine.easeOut'
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
    }
  }

  private handleBossEvent(event: { action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated'; x?: number; y?: number; targetX?: number; targetY?: number }) {
    const x = event.x ?? 1024;
    const y = event.y ?? 280;
    const bossSprite = this.entityObjects.get('boss_baron') as Phaser.GameObjects.Sprite | undefined;

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

  private triggerCozyDefeat() {
    if (!this.localPlayer) return;
    this.playerInvulnerable = true;
    (window as any).BitQuestUI?.hideBossHp?.();

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
      this.localPlayer.setPosition(cotX, cotY);
      this.localPlayer.health = this.localPlayer.maxHealth;
      (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);

      network.sendMove(cotX, cotY, 'down', 'idle', null);

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

                  sprite.setTintFill(0xffffff);
                  this.time.delayedCall(100, () => sprite.clearTint());

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
        this.animatePotThrow(this.localPlayer.x, this.localPlayer.y, potInfo.x, potInfo.y, potInfo.potId);
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

      // 2. Cleave enemies & boss
      for (const [id, obj] of this.entityObjects.entries()) {
        if (id.startsWith('enemy_') || id.startsWith('boss_')) {
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
                sprite.setTintFill(isCrit ? 0xfef08a : 0xffffff);
                this.time.delayedCall(120, () => sprite.clearTint());

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

    const interaction = BehaviorRegistry.getPrioritizedInteraction(px, py, this.worldEntities.values(), 44, this.localPlayer as any);
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
      network.sendInteract(closestId, 'open');
      sounds.playChestOpen();
    } else if (action === 'talk') {
      network.sendInteract(closestId, 'talk');
    } else if (action === 'pet') {
      network.sendInteract(closestId, 'pet');
      this.emitHeartBurst(interaction.entity.x, interaction.entity.y);
      sounds.playCoin();
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
        sounds.playPotSmash();
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
    beam.quadraticCurveTo(midX, midY, p2Pos.x, p2Pos.y);
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

  update(time: number, delta: number) {
    if (this.localPlayer) {
      this.localPlayer.updateMovement(this.cursors, this.keys, delta);

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
            sil.setTintFill(0xef4444);
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
    }

    for (const other of this.otherPlayers.values()) {
      other.updateInterpolation(delta);
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

    if (airborneTarget) {
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
        48,
        this.localPlayer as any
      );

      if (prioritized) {
        hasTarget = true;
        targetX = prioritized.entity.x;
        targetY = prioritized.entity.y;
        label = prioritized.promptText;
        themeColor = prioritized.trait.priorityWeight > 75 ? 0xf59e0b : 0x38bdf8;
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
}
