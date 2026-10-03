import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { saveManager } from '../storage/SaveManager';
import { chronicles } from '../storage/ChroniclesManager';
import type { EntityData, PlayerData, Direction, EmoteType, ItemDropData } from '../../../shared/src/types';

export class WorldScene extends Phaser.Scene {
  public localPlayer: Player | null = null;
  public otherPlayers = new Map<string, OtherPlayer>();
  public entityObjects = new Map<string, Phaser.GameObjects.GameObject>();
  public entityShadows = new Map<string, Phaser.GameObjects.Sprite>();
  public itemObjects = new Map<string, { sprite: Phaser.GameObjects.Sprite; shapeText?: Phaser.GameObjects.Text; data: ItemDropData }>();
  public playerGlow?: Phaser.GameObjects.Image;

  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private gateBody?: Phaser.Physics.Arcade.Image;
  private playerInvulnerable = false;
  private sporeProjectiles: Array<{ sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; life: number }> = [];
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

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    // 2048x1792 (64x56 tiles of 32px)
    this.physics.world.setBounds(0, 0, 2048, 1792);

    // 1. Build the Multi-Zone World Tiles & Environment
    this.buildWorld();

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
        TILDE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK),
        ONE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        TWO: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        THREE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        FOUR: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
        FIVE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
        SIX: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX)
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

      // Emote shortcuts
      this.keys.ONE.on('down', () => this.triggerEmote('heart'));
      this.keys.TWO.on('down', () => this.triggerEmote('wave'));
      this.keys.THREE.on('down', () => this.triggerEmote('laugh'));
      this.keys.FOUR.on('down', () => this.triggerEmote('music'));
      this.keys.FIVE.on('down', () => this.triggerEmote('exclamation'));
      this.keys.SIX.on('down', () => this.triggerEmote('question'));
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
    this.createCottage(22, 25, 4, 3, 'Post & Courier');
    // East: Grandma Bramble's Blackberry Bakery (tileX: 38, tileY: 25, 4x3)
    this.createCottage(38, 25, 4, 3, 'Bramble Jam Bakery');

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
      this.obstacles.create(x * TILE + 16, 16, topTex).refreshBody();
      this.obstacles.create(x * TILE + 16, (MAP_H - 1) * TILE + 16, 'tile_tree_canopy').refreshBody();
    }
    for (let y = 0; y < MAP_H; y++) {
      this.obstacles.create(16, y * TILE + 16, 'tile_fungal_canopy').refreshBody();
      this.obstacles.create((MAP_W - 1) * TILE + 16, y * TILE + 16, 'tile_tree_canopy').refreshBody();
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
  }

  private createCottage(tileX: number, tileY: number, w: number, h: number, label: string) {
    const TILE = 32;
    // Roof
    for (let x = 0; x < w; x++) {
      const rx = (tileX + x) * TILE + 16;
      const ry = (tileY - 1) * TILE + 16;
      const roof = this.add.image(rx, ry, 'tile_roof_red').setDepth(ry + 20);
      this.roofTiles.push({ image: roof, x: rx, y: ry });
    }
    // Walls
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wall = this.obstacles.create((tileX + x) * TILE + 16, (tileY + y) * TILE + 16, 'tile_wall_wood');
        wall.refreshBody();
      }
    }
    // Sign above door
    const signText = this.add.text((tileX + w / 2) * TILE, (tileY - 1) * TILE - 4, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fef08a',
      stroke: '#451a03',
      strokeThickness: 2
    });
    signText.setOrigin(0.5, 1);
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
        this.localPlayer.health = myProfile.health || 3;
        this.localPlayer.maxHealth = myProfile.maxHealth || 3;
        this.localPlayer.coins = myProfile.coins || 0;
        this.localPlayer.acorns = myProfile.acorns || 0;
        (window as any).BitQuestUI?.updateHearts(this.localPlayer.health, this.localPlayer.maxHealth);
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

    network.onEntityUpdated = (ent) => {
      this.updateEntityVisuals(ent);
    };

    network.onWorldFlagUpdated = (key, val) => {
      if (key === 'ancient_gate_opened') {
        if (val) this.openGate(true);
        else this.closeGate();
      }
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
        this.localPlayer.coins = stats.coins;
        this.localPlayer.acorns = stats.acorns;
        (window as any).BitQuestUI?.updateHearts(stats.health, stats.maxHealth);
        (window as any).BitQuestUI?.updateCurrency(stats.coins, stats.acorns);
      }
    };

    network.onBossEvent = (event) => {
      this.handleBossEvent(event);
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
  }

  public spawnOtherPlayer(p: PlayerData) {
    const other = new OtherPlayer(this, p.x, p.y, p.id, p.name, p.paletteIndex);
    this.otherPlayers.set(p.id, other);
  }

  private renderEntity(ent: EntityData) {
    if (this.entityObjects.has(ent.id)) {
      this.updateEntityVisuals(ent);
      return;
    }

    let obj: Phaser.GameObjects.GameObject;

    if (ent.type === 'bush') {
      obj = this.add.sprite(ent.x, ent.y, ent.state.destroyed ? 'ent_bush_cut' : 'ent_bush');
    } else if (ent.type === 'pot') {
      const sprite = this.add.sprite(ent.x, ent.y, 'ent_pot');
      const isVisible = !ent.state.destroyed && !ent.state.heldBy;
      sprite.setVisible(isVisible);
      const shadow = this.add.sprite(ent.x + 1, ent.y + 6, 'shadow_small').setAlpha(0.55).setDepth(ent.y - 1);
      shadow.setVisible(isVisible);
      this.entityShadows.set(ent.id, shadow);
      obj = sprite;
    } else if (ent.type === 'switch') {
      if (ent.subtype === 'pillar') {
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
      const isDown = !!ent.state.activated;
      obj.setTexture(isDown ? 'switch_down' : 'switch_up');
    } else if (ent.type === 'door') {
      const isOpened = !!ent.state.opened;
      obj.setTexture(isOpened ? 'gate_opened' : 'gate_closed');
    } else if (ent.type === 'wildlife' && ent.subtype === 'dog') {
      if (ent.state.petCount) {
        this.emitHeartBurst(ent.x, ent.y);
      }
    } else if (ent.type === 'enemy') {
      obj.setVisible(!ent.state.destroyed);
      const shadow = this.entityShadows.get(ent.id);
      if (shadow) shadow.setVisible(!ent.state.destroyed);
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
    }
  }

  private handleBossEvent(event: { action: 'spawn' | 'stomp' | 'spore' | 'defeated'; x?: number; y?: number }) {
    const x = event.x ?? 1024;
    const y = event.y ?? 280;

    if (event.action === 'stomp') {
      sounds.playBossStomp();
      this.triggerCameraShake(200, 0.007);

      // Expanding Shockwave Ring
      const ring = this.add.sprite(x, y, 'shockwave_ring');
      ring.setScale(0.5);
      ring.setAlpha(1);

      this.tweens.add({
        targets: ring,
        scale: 3.2,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy()
      });

      // Shockwave damage check
      if (this.localPlayer && !this.localPlayer.isRolling && !this.localPlayer.godMode && !this.playerInvulnerable) {
        const dist = Math.hypot(this.localPlayer.x - x, this.localPlayer.y - y);
        if (dist < 75) {
          this.hurtPlayer(1);
        }
      }
    } else if (event.action === 'spore') {
      sounds.playBossRoar();

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
    } else if (event.action === 'defeated') {
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
    for (let i = 0; i < 8; i++) {
      const leaf = this.add.sprite(x, y, 'particle_leaf');
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 20;
      this.tweens.add({
        targets: leaf,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 8,
        rotation: (Math.random() - 0.5) * 8,
        alpha: 0,
        scale: 0.3,
        duration: 350 + Math.random() * 150,
        onComplete: () => leaf.destroy()
      });
    }
  }

  private emitPotShards(x: number, y: number) {
    sounds.playPotShatter();
    chronicles.recordStat('potsSmashed', 1);
    for (let i = 0; i < 6; i++) {
      const shard = this.add.sprite(x, y, 'particle_shard');
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 20;
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        rotation: Math.random() * 6,
        alpha: 0,
        duration: 300,
        onComplete: () => shard.destroy()
      });
    }
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

  private handleActionAttack() {
    if (!this.localPlayer) return;

    if (this.localPlayer.carryingPotId) {
      const potInfo = this.localPlayer.throwPot();
      if (potInfo) {
        this.animatePotThrow(this.localPlayer.x, this.localPlayer.y, potInfo.x, potInfo.y, potInfo.potId);
      }
      return;
    }

    // 120-degree forward arc multi-target cleave
    this.localPlayer.attack((_hitX, _hitY, dir) => {
      const px = this.localPlayer!.x;
      const py = this.localPlayer!.y;

      let facingAngle = Math.PI / 2; // down
      if (dir === 'up') facingAngle = -Math.PI / 2;
      else if (dir === 'left') facingAngle = Math.PI;
      else if (dir === 'right') facingAngle = 0;

      const cleaveRadius = 46;
      const cleaveHalfAngle = Math.PI / 3; // 60 deg each side = 120 deg cone

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
                const isCrit = Math.random() < 0.25;
                const damage = isCrit ? 2 : 1;

                network.sendInteract(id, 'hit_enemy', undefined, undefined, damage);
                if (isCrit) {
                  sounds.playPreset('hit');
                } else {
                  sounds.playEnemyHit();
                }

                // Flash damage animation
                sprite.setTintFill(isCrit ? 0xfef08a : 0xffffff);
                this.time.delayedCall(120, () => sprite.clearTint());

                // Knockback recoil
                this.tweens.add({
                  targets: sprite,
                  x: sprite.x + Math.cos(angle) * (isCrit ? 18 : 12),
                  y: sprite.y + Math.sin(angle) * (isCrit ? 18 : 12),
                  duration: 120,
                  ease: 'Quad.easeOut'
                });

                this.showFloatingText(
                  sprite.x,
                  sprite.y - 12,
                  isCrit ? `-${damage} CRIT! ⚡` : `-${damage} 💥`,
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

    if (this.localPlayer.carryingPotId) {
      const potInfo = this.localPlayer.throwPot();
      if (potInfo) {
        this.animatePotThrow(this.localPlayer.x, this.localPlayer.y, potInfo.x, potInfo.y, potInfo.potId);
      }
      return;
    }

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;

    let closestId: string | null = null;
    let closestDist = 38;

    for (const [id, obj] of this.entityObjects.entries()) {
      const sprite = obj as Phaser.GameObjects.Sprite;
      const dist = Math.hypot(px - sprite.x, py - sprite.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    }

    if (!closestId) return;

    if (closestId.startsWith('pot_')) {
      const potSprite = this.entityObjects.get(closestId) as Phaser.GameObjects.Sprite;
      if (potSprite.visible) {
        this.localPlayer.liftPot(closestId);
        network.sendInteract(closestId, 'lift');
      }
    } else if (closestId.startsWith('npc_') || closestId.startsWith('sign_') || closestId.startsWith('wildlife_') || closestId.startsWith('boss_')) {
      network.sendInteract(closestId, 'talk');
    }
  }

  private animatePotThrow(startX: number, startY: number, targetX: number, targetY: number, potId: string) {
    const shadow = this.add.sprite(startX, startY, 'shadow_small').setAlpha(0.6).setDepth(Math.max(startY, targetY) - 1);
    const pot = this.add.sprite(startX, startY - 16, 'ent_pot').setDepth(Math.max(startY, targetY) + 5);
    sounds.playSlash();

    // Ground shadow moves linearly along ground plane
    this.tweens.add({
      targets: shadow,
      x: targetX,
      y: targetY,
      duration: 260,
      ease: 'Linear'
    });

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 260,
      onUpdate: (tw) => {
        const p = tw.getValue();
        pot.x = Phaser.Math.Linear(startX, targetX, p);
        const groundY = Phaser.Math.Linear(startY, targetY, p);
        const arcHeight = Math.sin(p * Math.PI) * 32;
        pot.y = groundY - arcHeight;
        pot.angle += 14;
        shadow.setScale(1.0 - (arcHeight / 32) * 0.45);
        shadow.setAlpha(0.6 - (arcHeight / 32) * 0.3);
      },
      onComplete: () => {
        pot.destroy();
        shadow.destroy();
        this.emitPotShards(targetX, targetY);
        network.sendInteract(potId, 'toss', targetX, targetY);

        // Check if pot hit an enemy or boss (deals 2 damage!)
        for (const [id, obj] of this.entityObjects.entries()) {
          if (id.startsWith('enemy_') || id.startsWith('boss_')) {
            const sprite = obj as Phaser.GameObjects.Sprite;
            if (sprite.visible) {
              const dist = Math.hypot(targetX - sprite.x, targetY - sprite.y);
              if (dist < 36) {
                network.sendInteract(id, 'hit_enemy', undefined, undefined, 2);
                sounds.playEnemyHit();
                this.showFloatingText(sprite.x, sprite.y - 10, '-2 💥💥', '#ef4444');
              }
            }
          }
        }
      }
    });
  }

  public triggerEmote(emote: EmoteType) {
    if (!this.localPlayer) return;
    this.localPlayer.showEmote(emote);
    network.sendEmote(emote);
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
      this.localPlayer.updateMovement(this.cursors, this.keys);

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

      // Dynamic Roof & Canopy Punch-Hole (soft transparency when player walks under structures)
      for (const rf of this.roofTiles) {
        const dist = Math.hypot(px - rf.x, py - rf.y);
        if (dist < 52) {
          rf.image.setAlpha(0.35 + (dist / 52) * 0.55);
        } else {
          if (rf.image.alpha < 1) rf.image.setAlpha(1);
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

      // 4. Overhead Action Prompt & Reticle
      this.updateInteractionPrompt(time);
    }

    for (const other of this.otherPlayers.values()) {
      other.updateInterpolation(delta);
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

  private getInteractLabel(id: string): { label: string; color: number } {
    if (id.startsWith('pot_')) return { label: '[E] Lift Pot', color: 0xf59e0b };
    if (id === 'npc_grandma') return { label: '[E] Talk (Grandma)', color: 0xec4899 };
    if (id === 'npc_barnaby') return { label: '[E] Talk (Barnaby)', color: 0x38bdf8 };
    if (id.startsWith('npc_')) return { label: '[E] Talk', color: 0xfacc15 };
    if (id.startsWith('sign_')) return { label: '[E] Read Sign', color: 0x94a3b8 };
    if (id === 'ancient_gate') return { label: '[E] Inspect Gate', color: 0xa855f7 };
    if (id.startsWith('switch_')) return { label: '[E] Sun Stone Switch', color: 0xfacc15 };
    if (id.startsWith('chest_')) return { label: '[E] Open Chest', color: 0xeab308 };
    if (id.startsWith('wildlife_')) return { label: '[E] Pet', color: 0x4ade80 };
    return { label: '[E] Interact', color: 0x38bdf8 };
  }

  private updateInteractionPrompt(time: number) {
    if (!this.localPlayer || !this.promptContainer) return;

    let targetX = 0;
    let targetY = 0;
    let label = '';
    let themeColor = 0xfacc15;
    let hasTarget = false;
    let isSelf = false;

    if (this.localPlayer.carryingPotId) {
      hasTarget = true;
      isSelf = true;
      targetX = this.localPlayer.x;
      targetY = this.localPlayer.y - 18;
      label = '[E] Throw Pot';
      themeColor = 0xf97316;
    } else {
      const px = this.localPlayer.x;
      const py = this.localPlayer.y;
      let closestId: string | null = null;
      let closestDist = 48;
      let closestSprite: Phaser.GameObjects.Sprite | null = null;

      for (const [id, obj] of this.entityObjects.entries()) {
        const sprite = obj as Phaser.GameObjects.Sprite;
        if (!sprite || !sprite.visible) continue;
        const dist = Math.hypot(px - sprite.x, py - sprite.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = id;
          closestSprite = sprite;
        }
      }

      if (closestId && closestSprite) {
        hasTarget = true;
        targetX = closestSprite.x;
        targetY = closestSprite.y;
        const info = this.getInteractLabel(closestId);
        label = info.label;
        themeColor = info.color;
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
