import { PlayerData, EntityData, Direction, PlayerAnimState, EmoteType, ChatMessage, EmoteEvent, ItemDropData, ServerPacket } from '../../shared/src/types';
import { WorldDatabase } from './db';
import { STARTER_DIALOGUES } from '../../content/dialogues';

export class WorldManager {
  public db: WorldDatabase;
  public players = new Map<string, PlayerData>();
  public entities = new Map<string, EntityData>();
  public items = new Map<string, ItemDropData>();
  private nextEntityId = 1000;
  private bossCycle = 0;

  public onItemSpawned?: (item: ItemDropData) => void;
  public onItemCollected?: (itemId: string, collectorId: string, itemType: string, value: number) => void;
  public onPlayerStatsUpdated?: (player: PlayerData) => void;
  public onEntityStateChanged?: (entity: EntityData) => void;
  public onWorldFlagChanged?: (key: string, value: boolean) => void;
  public onBossEvent?: (event: ServerPacket) => void;
  public onSocialResonance?: (player1Id: string, player2Id: string, emote: EmoteType, x: number, y: number) => void;
  public onPotThrown?: (potId: string, throwerId: string, startX: number, startY: number, targetX: number, targetY: number, duration: number) => void;
  public onPotCaught?: (potId: string, catcherId: string, x: number, y: number) => void;

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
    this.initDefaultEntities();
    this.startRespawnLoop();
    this.startAiLoop();
    this.startProjectileLoop();
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

    // 6. Cute Wildlife in South Lake & Plaza
    this.entities.set('wildlife_buster', {
      id: 'wildlife_buster',
      type: 'wildlife',
      subtype: 'dog',
      name: 'Buster',
      x: 1080,
      y: 1180,
      interactable: true,
      state: { dialogueKey: 'dog_buster', direction: 'down', petCount: 0 }
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

  public handleLeverPull(playerId: string, targetId: string) {
    if (targetId !== 'lever_duo_left' && targetId !== 'lever_duo_right') return;
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
      // 1. Sproutlings hop slightly around their home
      for (const entity of this.entities.values()) {
        if (entity.type === 'enemy' && entity.subtype === 'sproutling' && !entity.state.destroyed) {
          const homeX = entity.state.homeX || entity.x;
          const homeY = entity.state.homeY || entity.y;
          const dx = (Math.random() - 0.5) * 28;
          const dy = (Math.random() - 0.5) * 28;
          entity.x = Math.max(homeX - 48, Math.min(homeX + 48, entity.x + dx));
          entity.y = Math.max(homeY - 48, Math.min(homeY + 48, entity.y + dy));
          this.onEntityStateChanged?.(entity);
        }

        // 2. Grumble Shrooms chase nearby player (<100px)
        if (entity.type === 'enemy' && entity.subtype === 'grumble' && !entity.state.destroyed) {
          let closestDist = 110;
          let targetX: number | null = null;
          let targetY: number | null = null;

          for (const player of this.players.values()) {
            const dist = Math.hypot(player.x - entity.x, player.y - entity.y);
            if (dist < closestDist) {
              closestDist = dist;
              targetX = player.x;
              targetY = player.y;
            }
          }

          if (targetX !== null && targetY !== null) {
            // Step towards player with grumpy charge
            const angle = Math.atan2(targetY - entity.y, targetX - entity.x);
            entity.x += Math.cos(angle) * 14;
            entity.y += Math.sin(angle) * 14;
            this.onEntityStateChanged?.(entity);
          }
        }

        // 2b. Crystal Lake Ducks gentle paddling wander
        if (entity.type === 'wildlife' && entity.subtype === 'duck') {
          const dx = (Math.random() - 0.5) * 14;
          const dy = (Math.random() - 0.5) * 10;
          entity.x = Math.max(760, Math.min(1300, entity.x + dx));
          entity.y = Math.max(1320, Math.min(1680, entity.y + dy));
          this.onEntityStateChanged?.(entity);
        }
      }

      // 3. Baron von Truffle Boss Patterns
      const boss = this.entities.get('boss_baron');
      if (boss && !boss.state.destroyed) {
        // Check if any player is in the Sanctuary arena
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
          // If boss is currently stunned, skip action cycle
          if (boss.state.stunnedUntil && Date.now() < boss.state.stunnedUntil) {
            return;
          }

          this.bossCycle = (this.bossCycle + 1) % 4;

          if (this.bossCycle === 1) {
            // Ground Stomp!
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'stomp',
              x: boss.x,
              y: boss.y
            });
          } else if (this.bossCycle === 2) {
            // Spore Barrage!
            this.onBossEvent?.({
              type: 'boss_event',
              action: 'spore',
              x: boss.x,
              y: boss.y
            });
          } else if (this.bossCycle === 3) {
            // Charge towards player!
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

            // Check if charge hits pillars (pillars at x: 920, 1128, y: 240) or arena boundaries
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
    }, 1400);
  }

  public addPlayer(id: string, name: string, color: string, paletteIndex: number): PlayerData {
    const player: PlayerData = {
      id,
      name,
      color,
      paletteIndex,
      x: 1024 + (Math.random() * 40 - 20),
      y: 950 + (Math.random() * 40 - 20),
      direction: 'down',
      anim: 'idle',
      carryingItem: null,
      health: 3,
      maxHealth: 3,
      coins: 0,
      acorns: 0
    };
    this.players.set(id, player);
    this.db.savePlayer(id, name, color, paletteIndex);
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
      this.onEntityStateChanged?.(gate);
      this.onWorldFlagChanged?.('ancient_gate_opened', shouldOpen);
    }
  }

  public handleInteract(playerId: string, targetId: string, action: string, x?: number, y?: number, damage?: number) {
    const entity = this.entities.get(targetId);
    if (!entity) return;

    if (action === 'pull_lever' || targetId.startsWith('lever_')) {
      this.handleLeverPull(playerId, targetId);
      return;
    }

    if (entity.type === 'chest' && !entity.state.locked && !entity.state.opened) {
      entity.state.opened = true;
      this.onEntityStateChanged?.(entity);
      // Spawn treasure reward
      for (let i = 0; i < 5; i++) {
        const item: ItemDropData = {
          id: `item_chest_${Date.now()}_${i}`,
          itemType: i === 0 ? 'strawberry' : (i === 1 ? 'acorn' : 'coin'),
          x: entity.x + (i - 2) * 14,
          y: entity.y + 16,
          value: i === 0 ? 1 : (i === 1 ? 2 : 5)
        };
        this.items.set(item.id, item);
        this.onItemSpawned?.(item);
      }
      return;
    }

    if (action === 'cut' && entity.type === 'bush' && !entity.state.destroyed) {
      entity.state.destroyed = true;
      entity.state.respawnAt = Date.now() + 25000;
      this.onEntityStateChanged?.(entity);

      const types: Array<'coin' | 'strawberry' | 'acorn'> = ['coin', 'coin', 'coin', 'strawberry', 'acorn'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const item: ItemDropData = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemType: chosen,
        x: entity.x + (Math.random() * 12 - 6),
        y: entity.y + (Math.random() * 12 - 6),
        value: chosen === 'coin' ? (Math.random() > 0.4 ? 5 : 1) : 1
      };
      this.items.set(item.id, item);
      this.onItemSpawned?.(item);
    } else if (action === 'lift' && entity.type === 'pot' && !entity.state.destroyed && !entity.state.heldBy) {
      entity.state.heldBy = playerId;
      this.onEntityStateChanged?.(entity);
    } else if (action === 'toss' && entity.type === 'pot' && entity.state.heldBy === playerId) {
      entity.state.heldBy = null;
      if (typeof x === 'number' && typeof y === 'number') {
        entity.x = x;
        entity.y = y;
      }
      entity.state.destroyed = true;
      entity.state.respawnAt = Date.now() + 20000;
      this.onEntityStateChanged?.(entity);
      this.checkPressureSwitches();

      if (Math.random() < 0.6) {
        const item: ItemDropData = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          itemType: Math.random() < 0.3 ? 'strawberry' : 'coin',
          x: entity.x,
          y: entity.y,
          value: 1
        };
        this.items.set(item.id, item);
        this.onItemSpawned?.(item);
      }
    } else if (action === 'pet' && entity.type === 'wildlife') {
      entity.state.petCount = (entity.state.petCount || 0) + 1;
      this.onEntityStateChanged?.(entity);
    } else if (action === 'hit_enemy') {
      // Sword or Pot strike on Enemy / Boss
      let dmg = damage || 1;
      if (entity.type === 'boss' && entity.state.stunnedUntil && Date.now() < entity.state.stunnedUntil) {
        dmg += 1; // Bonus critical strike damage on stunned boss
      }
      entity.state.hp = Math.max(0, (entity.state.hp || 1) - dmg);

      if (entity.state.hp <= 0) {
        entity.state.destroyed = true;
        entity.state.respawnAt = Date.now() + (entity.type === 'boss' ? 60000 : 25000);

        if (entity.type === 'boss') {
          // Boss defeated!
          this.onBossEvent?.({
            type: 'boss_event',
            action: 'defeated',
            x: entity.x,
            y: entity.y
          });

          // Drop the legendary Golden Acorn Crown!
          const crownItem: ItemDropData = {
            id: `item_crown_${Date.now()}`,
            itemType: 'crown',
            x: entity.x,
            y: entity.y + 10,
            value: 100
          };
          this.items.set(crownItem.id, crownItem);
          this.onItemSpawned?.(crownItem);

          // Massive coin & strawberry fountain
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
        } else if (entity.subtype === 'sproutling') {
          // Drops strawberry or acorn
          const dropType = Math.random() < 0.6 ? 'strawberry' : 'acorn';
          const drop: ItemDropData = {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            itemType: dropType,
            x: entity.x,
            y: entity.y,
            value: 1
          };
          this.items.set(drop.id, drop);
          this.onItemSpawned?.(drop);
        } else if (entity.subtype === 'grumble') {
          // Drops coin, acorn, or rare sweet jam!
          const roll = Math.random();
          const dropType = roll < 0.5 ? 'coin' : roll < 0.85 ? 'acorn' : 'jam';
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
    } else if (action === 'player_hurt') {
      const player = this.players.get(playerId);
      if (player && player.health > 0) {
        player.health = Math.max(0, player.health - (damage || 1));
        this.onPlayerStatsUpdated?.(player);
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
