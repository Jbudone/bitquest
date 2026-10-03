import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import type { EntityData, PlayerData, Direction, EmoteType, ItemDropData } from '../../../shared/src/types';

export class WorldScene extends Phaser.Scene {
  public localPlayer: Player | null = null;
  public otherPlayers = new Map<string, OtherPlayer>();
  public entityObjects = new Map<string, Phaser.GameObjects.GameObject>();
  public itemObjects = new Map<string, { sprite: Phaser.GameObjects.Sprite; data: ItemDropData }>();
  public playerGlow?: Phaser.GameObjects.Image;

  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private gateBody?: Phaser.Physics.Arcade.Image;
  private playerInvulnerable = false;
  private sporeProjectiles: Array<{ sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; life: number }> = [];
  private coinCombo = 0;
  private lastCoinPickupTime = 0;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    // 2048x1792 (64x56 tiles of 32px)
    this.physics.world.setBounds(0, 0, 2048, 1792);

    // 1. Build the Multi-Zone World Tiles & Environment
    this.buildWorld();

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
  }

  private createCottage(tileX: number, tileY: number, w: number, h: number, label: string) {
    const TILE = 32;
    // Roof
    for (let x = 0; x < w; x++) {
      this.add.image((tileX + x) * TILE + 16, (tileY - 1) * TILE + 16, 'tile_roof_red');
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
    this.localPlayer = new Player(this, x, y, id, name, paletteIndex);
    this.physics.add.collider(this.localPlayer, this.obstacles);
    this.cameras.main.startFollow(this.localPlayer, true, 0.12, 0.12);

    this.playerGlow = this.add.image(x, y, 'light_glow');
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
      sprite.setVisible(!ent.state.destroyed && !ent.state.heldBy);
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
      obj = sprite;
    } else if (ent.type === 'wildlife') {
      let texture = 'wildlife_dog';
      if (ent.subtype === 'duck') texture = 'wildlife_duck';
      obj = this.add.sprite(ent.x, ent.y, texture);
    } else if (ent.type === 'enemy') {
      const tex = ent.subtype === 'sproutling' ? 'enemy_sproutling' : 'enemy_grumble';
      const sprite = this.add.sprite(ent.x, ent.y, tex);
      sprite.setVisible(!ent.state.destroyed);
      obj = sprite;
    } else if (ent.type === 'boss') {
      const sprite = this.add.sprite(ent.x, ent.y, 'boss_baron');
      sprite.setVisible(!ent.state.destroyed);
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
      obj.setVisible(!ent.state.heldBy && !ent.state.destroyed);
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
      if (!ent.state.destroyed) {
        // Smooth lerp to new position
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 300,
          ease: 'Sine.easeOut'
        });
      }
    } else if (ent.type === 'boss') {
      obj.setVisible(!ent.state.destroyed);
      if (!ent.state.destroyed) {
        this.tweens.add({
          targets: obj,
          x: ent.x,
          y: ent.y,
          duration: 350,
          ease: 'Sine.easeOut'
        });
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
      this.cameras.main.shake(200, 0.007);

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
      this.cameras.main.shake(350, 0.012);
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

  private hurtPlayer(dmg = 1) {
    if (!this.localPlayer || this.localPlayer.godMode || this.playerInvulnerable) return;

    this.playerInvulnerable = true;
    sounds.playHit();
    this.cameras.main.shake(120, 0.006);

    network.sendInteract(this.localPlayer.id, 'player_hurt', undefined, undefined, dmg);
    this.showFloatingText(this.localPlayer.x, this.localPlayer.y, `-${dmg} ❤️`, '#ef4444');

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

  public openGate(playJingle = true) {
    const gateSprite = this.entityObjects.get('ancient_gate') as Phaser.GameObjects.Sprite;
    if (gateSprite) {
      gateSprite.setTexture('gate_opened');
    }
    if (this.gateBody) {
      this.gateBody.disableBody(true, true);
    }
    if (playJingle) {
      sounds.playSecretJingle();
      (window as any).BitQuestUI?.showToast('✨ The Ancient Sunken Gate has opened!');
    }
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
    this.cameras.main.shake(70, 0.003);
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
    const pot = this.add.sprite(startX, startY - 16, 'ent_pot');
    sounds.playSlash();

    this.tweens.add({
      targets: pot,
      x: targetX,
      y: targetY,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => {
        pot.destroy();
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

    this.itemObjects.set(item.id, { sprite, data: item });
  }

  public removeItem(itemId: string, collectorId: string, itemType: string, value: number) {
    const itemObj = this.itemObjects.get(itemId);
    if (itemObj) {
      const { sprite } = itemObj;
      this.itemObjects.delete(itemId);

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
          } else {
            this.showFloatingText(sprite.x, sprite.y, `+${value} 🌰`, '#fbbf24');
            this.localPlayer.acorns += value;
          }
        } else if (itemType === 'strawberry') {
          sounds.playStrawberry();
          this.showFloatingText(sprite.x, sprite.y, `+1 ❤️`, '#f43f5e');
          this.localPlayer.health = Math.min(this.localPlayer.maxHealth, this.localPlayer.health + 1);
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

      // 1. Magnetic collection of dropped items (extended 75px vacuum with physics curve)
      for (const [id, { sprite, data }] of this.itemObjects.entries()) {
        const dist = Math.hypot(px - sprite.x, py - sprite.y);
        if (dist < 75) {
          const pullSpeed = 0.10 + (1 - dist / 75) * 0.18;
          sprite.x = Phaser.Math.Linear(sprite.x, px, pullSpeed);
          sprite.y = Phaser.Math.Linear(sprite.y, py, pullSpeed);

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
    }

    for (const other of this.otherPlayers.values()) {
      other.updateInterpolation(delta);
    }
  }
}
