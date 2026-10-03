import Phaser from 'phaser';
import type { Direction, PlayerAnimState, CharacterClassId } from '../../../shared/src/types';
import { sounds } from '../audio/SoundManager';
import { network } from '../network/NetworkClient';
import { chronicles } from '../storage/ChroniclesManager';
import { ClientPredictionManager } from '../../../shared/src/netcode/prediction';
import { ManaPool, SPELL_DEFINITIONS, type SpellDefinition, type SpellId } from '../../../shared/src/magic';
import { EquipmentManager, type PlayerEquipment, type PlayerVanity, type AggregatedEquipmentStats } from '../../../shared/src/equipment';

export class Player extends Phaser.GameObjects.Container {
  public id: string;
  public playerName: string;
  public paletteIndex: number;
  public direction: Direction = 'down';
  public prediction = new ClientPredictionManager();
  private lastX: number;
  private lastY: number;
  public isAttacking = false;
  public isRolling = false;
  public isInvulnerable = false;
  public rollCooldown = 0;
  public carryingPotId: string | null = null;
  public speed = 150;
  public speedMultiplier = 1;
  public speedBuffMultiplier = 1;
  public speedBuffExpiresAt = 0;
  public godMode = false;
  public health = 3;
  public maxHealth = 3;
  public mana = 50;
  public maxMana = 50;
  public manaPool = new ManaPool(50, 50, 5);
  public isCasting = false;
  public spellCooldowns: Record<SpellId, number> = { fireball: 0, ice_lance: 0, gale_ward: 0 };
  public classId: CharacterClassId = 'warrior';
  public coins = 0;
  public acorns = 0;

  // Equipment & Vanity Gear
  public equipment: PlayerEquipment = { weapon: 'sword_wood', offhand: null, armor: null, relic: null };
  public vanity: PlayerVanity = { head: null, armor: null, weapon: null };
  public equipmentStats: AggregatedEquipmentStats = EquipmentManager.createDefaultStats();

  // Input buffering
  public bufferedAction: 'attack' | 'roll' | null = null;
  public bufferedActionExpiresAt = 0;
  private bufferedHitScan?: (x: number, y: number, dir: Direction) => void;

  public sprite: Phaser.GameObjects.Sprite;
  public shadowSprite: Phaser.GameObjects.Sprite;
  public vanityArmorSprite: Phaser.GameObjects.Sprite;
  public vanityHeadSprite: Phaser.GameObjects.Sprite;
  public weaponSprite: Phaser.GameObjects.Sprite;
  private footstepTimer = 0;
  private carriedPotSprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private emoteSprite: Phaser.GameObjects.Sprite | null = null;
  private chatBubbleContainer: Phaser.GameObjects.Container | null = null;
  private chatTimer: Phaser.Time.TimerEvent | null = null;
  private idleStartTime = 0;
  private idleZzzTimer = 0;
  public isJumpingLedge = false;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, paletteIndex: number) {
    super(scene, x, y);
    this.id = id;
    this.playerName = name;
    this.paletteIndex = paletteIndex;
    this.lastX = x;
    this.lastY = y;

    // Grounding Directional Drop Shadow (45 deg southeast skew)
    this.shadowSprite = scene.add.sprite(2, 4, 'shadow_directional_45');
    this.shadowSprite.setOrigin(0.5, 0.5);
    this.shadowSprite.setAlpha(0.65);
    this.add(this.shadowSprite);

    // Vanity Armor / Cape (behind body)
    this.vanityArmorSprite = scene.add.sprite(0, -4, 'vanity_cape_hero');
    this.vanityArmorSprite.setOrigin(0.5, 0.7);
    this.vanityArmorSprite.setVisible(false);
    this.add(this.vanityArmorSprite);

    // Main Player Sprite
    this.sprite = scene.add.sprite(0, 0, `player_${paletteIndex}_down_idle`);
    this.sprite.setOrigin(0.5, 0.7);
    this.add(this.sprite);

    // Vanity Headgear (above player head)
    this.vanityHeadSprite = scene.add.sprite(0, -18, 'vanity_crown_gold');
    this.vanityHeadSprite.setOrigin(0.5, 0.7);
    this.vanityHeadSprite.setVisible(false);
    this.add(this.vanityHeadSprite);

    // Weapon In Hand
    this.weaponSprite = scene.add.sprite(7, -1, 'weapon_sword');
    this.weaponSprite.setOrigin(0.5, 0.5);
    this.weaponSprite.setVisible(true);
    this.add(this.weaponSprite);

    // Carried Pot Sprite (above head)
    this.carriedPotSprite = scene.add.sprite(0, -26, 'ent_pot');
    this.carriedPotSprite.setVisible(false);
    this.add(this.carriedPotSprite);

    // Player Name Tag
    this.nameText = scene.add.text(0, -28, name, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#111827',
      strokeThickness: 3
    });
    this.nameText.setOrigin(0.5, 1);
    this.add(this.nameText);

    // Cosmetic Title Tag
    this.titleText = scene.add.text(0, -40, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#facc15',
      stroke: '#0f172a',
      strokeThickness: 2
    });
    this.titleText.setOrigin(0.5, 1);
    this.add(this.titleText);

    scene.add.existing(this);

    // Enable Arcade physics on container with tuned 16x10 sub-tile foot collider
    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 10);
    body.setOffset(-8, 2);
    body.setCollideWorldBounds(true);
  }

  public updateProfile(name: string, paletteIndex: number) {
    this.playerName = name;
    this.paletteIndex = paletteIndex;
    this.nameText.setText(name);
    this.sprite.setTexture(`player_${paletteIndex}_${this.direction}_idle`);
  }

  public setTitle(title: string) {
    this.titleText.setText(title);
  }

  public updateEquipment(
    equipment: PlayerEquipment,
    vanity: PlayerVanity,
    stats?: AggregatedEquipmentStats
  ) {
    this.equipment = equipment;
    this.vanity = vanity;
    if (stats) {
      this.equipmentStats = stats;
    } else {
      EquipmentManager.calculateStats(this.equipment, this.equipmentStats);
    }

    // Apply stat bonuses
    this.maxHealth = 3 + this.equipmentStats.maxHealthBonus;
    this.health = Math.min(this.health, this.maxHealth);

    this.maxMana = 50 + this.equipmentStats.maxManaBonus;
    this.mana = Math.min(this.mana, this.maxMana);
    this.manaPool.setMaxMana(this.maxMana);

    this.speedMultiplier = this.equipmentStats.moveSpeedMultiplier;

    this.updateGearVisuals();
  }

  public updateGearVisuals() {
    // 1. Headgear
    const headId = this.vanity.head;
    if (headId === 'vanity_crown') {
      this.vanityHeadSprite.setTexture('vanity_crown_gold');
      this.vanityHeadSprite.setPosition(0, -18);
      this.vanityHeadSprite.setVisible(!this.isRolling);
    } else if (headId === 'vanity_hat_wizard') {
      this.vanityHeadSprite.setTexture('vanity_hat_wizard');
      this.vanityHeadSprite.setPosition(0, -22);
      this.vanityHeadSprite.setVisible(!this.isRolling);
    } else if (headId === 'vanity_hood_ranger') {
      this.vanityHeadSprite.setTexture('vanity_hood_ranger');
      this.vanityHeadSprite.setPosition(0, -16);
      this.vanityHeadSprite.setVisible(!this.isRolling);
    } else {
      this.vanityHeadSprite.setVisible(false);
    }

    // 2. Armor / Cloak
    const armorId = this.vanity.armor;
    if (armorId === 'vanity_cape_hero') {
      this.vanityArmorSprite.setTexture('vanity_cape_hero');
      this.vanityArmorSprite.setPosition(0, -4);
      this.vanityArmorSprite.setVisible(!this.isRolling);
    } else if (armorId === 'vanity_armor_knight') {
      this.vanityArmorSprite.setTexture('vanity_armor_knight');
      this.vanityArmorSprite.setPosition(0, -6);
      this.vanityArmorSprite.setVisible(!this.isRolling);
    } else {
      this.vanityArmorSprite.setVisible(false);
    }

    // 3. Weapon in hand
    if (this.isRolling || this.carryingPotId) {
      this.weaponSprite.setVisible(false);
      return;
    }

    const wepId = this.equipment.weapon;
    let wepKey = 'weapon_sword';
    if (wepId === 'dagger_shadow') wepKey = 'weapon_dagger';
    else if (wepId === 'sword_claymore') wepKey = 'weapon_broadsword';
    else if (wepId === 'staff_oak') wepKey = 'weapon_staff';
    else if (wepId === 'bow_recurve') wepKey = 'weapon_bow';

    this.weaponSprite.setTexture(wepKey);
    this.weaponSprite.setVisible(true);

    if (this.isAttacking) {
      if (this.direction === 'down') {
        this.weaponSprite.setPosition(6, 6);
        this.weaponSprite.setRotation(1.57);
      } else if (this.direction === 'up') {
        this.weaponSprite.setPosition(-6, -14);
        this.weaponSprite.setRotation(-1.57);
      } else if (this.direction === 'left') {
        this.weaponSprite.setPosition(-12, 0);
        this.weaponSprite.setRotation(-1.8);
      } else {
        this.weaponSprite.setPosition(12, 0);
        this.weaponSprite.setRotation(1.8);
      }
    } else {
      if (this.direction === 'down') {
        this.weaponSprite.setPosition(7, -1);
        this.weaponSprite.setRotation(0.35);
      } else if (this.direction === 'up') {
        this.weaponSprite.setPosition(-7, -7);
        this.weaponSprite.setRotation(-0.35);
      } else if (this.direction === 'left') {
        this.weaponSprite.setPosition(-8, -2);
        this.weaponSprite.setRotation(-0.55);
      } else {
        this.weaponSprite.setPosition(8, -2);
        this.weaponSprite.setRotation(0.55);
      }
    }
  }

  public updateMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys, keys: Record<string, Phaser.Input.Keyboard.Key>, delta = 16.67) {
    const now = this.scene.time.now;

    // Natural Mana Regeneration
    const regen = this.manaPool.updateRegen(delta, now);
    if (regen.changed) {
      this.mana = regen.current;
      (window as any).BitQuestUI?.updateMana(this.mana, this.maxMana);
    }

    // Check Gale Ward speed buff
    if (now >= this.speedBuffExpiresAt) {
      this.speedBuffMultiplier = 1;
    }

    if (this.isAttacking || this.isRolling || this.isJumpingLedge || this.isCasting) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    const left = cursors.left.isDown || keys.A?.isDown;
    const right = cursors.right.isDown || keys.D?.isDown;
    const up = cursors.up.isDown || keys.W?.isDown;
    const down = cursors.down.isDown || keys.S?.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    const currentSpeed = this.speed * this.speedMultiplier * this.speedBuffMultiplier;
    body.setVelocity(vx * currentSpeed, vy * currentSpeed);

    // Update Facing Direction & Animation
    let animState: PlayerAnimState = 'idle';
    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.direction = vx > 0 ? 'right' : 'left';
      } else {
        this.direction = vy > 0 ? 'down' : 'up';
      }

      animState = this.carryingPotId ? 'carry_walk' : 'walk';

      if (this.carryingPotId) {
        this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_carry`);
      } else {
        this.sprite.play(`player_${this.paletteIndex}_walk_${this.direction}`, true);
      }
    } else {
      animState = this.carryingPotId ? 'carry_idle' : 'idle';
      if (this.carryingPotId) {
        this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_carry`);
      } else {
        this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_idle`);
      }
    }

    // Springy pot bobbing & name positioning
    if (this.carryingPotId) {
      this.carriedPotSprite.setVisible(true);
      const bob = Math.sin(this.scene.time.now / 110) * 2.5;
      this.carriedPotSprite.setY(-26 + bob);
      this.nameText.setY(-38 + bob);
      this.titleText.setY(-49 + bob);
    } else {
      this.carriedPotSprite.setVisible(false);
      this.nameText.setY(-28);
      this.titleText.setY(-39);
    }

    this.updateGearVisuals();

    // Surface-Reactive Footstep Cadence & Organic Layered Idle Progression
    const isMoving = vx !== 0 || vy !== 0;

    if (isMoving && !this.isRolling && !this.isAttacking) {
      if (now - this.footstepTimer > 280) {
        this.footstepTimer = now;
        this.emitFootstep();
      }
    }

    if (isMoving || this.isRolling || this.isAttacking || this.carryingPotId) {
      this.idleStartTime = now;
      this.sprite.setY(0);
      this.sprite.setScale(1.0, 1.0);
      this.sprite.setRotation(0);
    } else {
      // Layered Idle Progression for Player
      const idleDuration = now - this.idleStartTime;

      if (idleDuration > 14000) {
        // Layer 3: Cozy Sitting / Napping Pose (> 14s)
        this.sprite.setY(3);
        const cozyBreath = Math.sin(now * 0.0022) * 0.025;
        this.sprite.setScale(1.12, 0.84 + cozyBreath);
        this.sprite.setRotation(0);

        if (now - this.idleZzzTimer > 2400) {
          this.idleZzzTimer = now;
          (this.scene as any).emitSleepyZzz?.(this.x, this.y - 18);
        }
      } else if (idleDuration > 7000) {
        // Layer 2: Looking Around & Periodic Wiping Brow (> 7s)
        this.sprite.setY(0);
        const lookAround = Math.sin(now * 0.0018) * 0.07;
        this.sprite.setRotation(lookAround);
        const breath = Math.sin(now * 0.0035) * 0.035;
        this.sprite.setScale(1.0 - breath * 0.5, 1.0 + breath);
      } else if (idleDuration > 2500) {
        // Layer 1: Cozy Breathing & Micro-Stretch (> 2.5s)
        this.sprite.setY(0);
        this.sprite.setRotation(0);
        const breath = Math.sin(now * 0.0035) * 0.035;
        this.sprite.setScale(1.0 - breath * 0.5, 1.0 + breath);
      } else {
        this.sprite.setY(0);
        this.sprite.setScale(1.0, 1.0);
        this.sprite.setRotation(0);
      }
    }

    // Record predicted movement step and send sequence-tagged packet
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    this.lastX = this.x;
    this.lastY = this.y;

    const step = this.prediction.recordPredictedStep(this.x, this.y, dx, dy);
    network.sendMove(this.x, this.y, this.direction, animState, this.carryingPotId, step.seq);
  }

  public reconcilePosition(ackSeq: number, authoritativeX: number, authoritativeY: number) {
    const result = this.prediction.reconcile(authoritativeX, authoritativeY, ackSeq);
    if (result.corrected) {
      this.setPosition(result.x, result.y);
      this.lastX = result.x;
      this.lastY = result.y;
    }
  }

  public castSpell(spellId: SpellId, onSpawnProjectile: (spell: SpellDefinition, x: number, y: number, dir: Direction) => void) {
    if (this.isAttacking || this.isRolling || this.isJumpingLedge || this.isCasting) return;
    if (this.carryingPotId) return;

    const now = this.scene.time.now;
    const spell = SPELL_DEFINITIONS[spellId];
    if (!spell) return;

    if (now < (this.spellCooldowns[spellId] || 0)) {
      return;
    }

    const discount = this.equipmentStats.manaCostReductionPct || 0;
    const actualCost = Math.max(1, Math.round(spell.manaCost * (1 - discount)));

    if (this.manaPool.current < actualCost) {
      sounds.playOutOfMana();
      (this.scene as any).showFloatingText?.(this.x, this.y - 20, "Out of Mana!", "#60a5fa");
      return;
    }

    this.manaPool.consumeMana(actualCost, now);
    this.mana = this.manaPool.current;
    (window as any).BitQuestUI?.updateMana(this.mana, this.maxMana);
    this.spellCooldowns[spellId] = now + spell.cooldownMs;

    this.isCasting = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Cast windup pose
    this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_slash`);
    this.sprite.setScale(1.15, 0.9);

    if (spellId === 'fireball') {
      sounds.playFireballCast();
      (this.scene as any).particlePipeline?.emitFireBurst(this.x, this.y, 6);
    } else if (spellId === 'ice_lance') {
      sounds.playIceCast();
      (this.scene as any).particlePipeline?.emitIceShatter(this.x, this.y, 6);
    } else if (spellId === 'gale_ward') {
      sounds.playGaleWard();
      (this.scene as any).particlePipeline?.emitGaleVortex(this.x, this.y, 16);
      if (spell.selfBuff) {
        this.speedBuffMultiplier = spell.selfBuff.speedMultiplier;
        this.speedBuffExpiresAt = now + spell.selfBuff.durationMs;
        (this.scene as any).showFloatingText?.(this.x, this.y - 24, "⚡ GALE BOOST!", "#34d399");
      }
    }

    network.sendCastSpell(spellId, this.x, this.y, this.direction);

    this.scene.time.delayedCall(120, () => {
      this.isCasting = false;
      this.sprite.setScale(1.0, 1.0);
      this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_idle`);
      onSpawnProjectile(spell, this.x, this.y, this.direction);
    });
  }

  public enterPushStance(dir: Direction) {
    this.direction = dir;
    this.idleStartTime = this.scene.time.now;
    this.sprite.setTexture(`player_${this.paletteIndex}_${dir}_slash`);
    this.sprite.setScale(1.12, 0.92);
    this.scene.time.delayedCall(240, () => {
      this.sprite.setScale(1.0, 1.0);
      this.sprite.setTexture(`player_${this.paletteIndex}_${dir}_idle`);
    });
  }

  public jumpLedge(targetY: number, duration = 340, onComplete?: () => void) {
    if (this.isJumpingLedge) return;
    this.isJumpingLedge = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    const startY = this.y;
    this.direction = 'down';
    this.sprite.setTexture(`player_${this.paletteIndex}_down_slash`);
    this.shadowSprite.setScale(0.65).setAlpha(0.35);

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      onUpdate: (tw) => {
        const p = tw.getValue();
        this.y = Phaser.Math.Linear(startY, targetY, p);
        const arc = Math.sin(p * Math.PI) * 26;
        this.sprite.setY(-arc);
        this.shadowSprite.setScale(1.0 - (arc / 26) * 0.45);
      },
      onComplete: () => {
        this.sprite.setY(0);
        this.sprite.setTexture(`player_${this.paletteIndex}_down_idle`);
        this.shadowSprite.setScale(1.0).setAlpha(0.65);
        this.isJumpingLedge = false;
        onComplete?.();
      }
    });
  }

  public fallIntoPit(safeX: number, safeY: number, onRespawn?: () => void) {
    if (this.isJumpingLedge) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.isJumpingLedge = true;

    this.scene.tweens.add({
      targets: [this.sprite, this.shadowSprite],
      scaleX: 0,
      scaleY: 0,
      angle: 360,
      duration: 450,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.setPosition(safeX, safeY);
        this.sprite.setScale(1.0, 1.0);
        this.sprite.setAngle(0);
        this.shadowSprite.setScale(1.0).setAlpha(0.65);
        this.isJumpingLedge = false;
        onRespawn?.();
      }
    });
  }

  private emitFootstep() {
    const surface = (this.scene as any).getSurfaceAt?.(this.x, this.y + 4) || 'grass';
    sounds.playFootstep(surface);

    // Particle effect based on terrain
    const px = this.x + (Math.random() * 6 - 3);
    const py = this.y + 4 + (Math.random() * 4 - 2);

    if (surface === 'water') {
      const rip = this.scene.add.image(px, py, 'particle_ripple');
      rip.setScale(0.5);
      rip.setAlpha(0.85);
      this.scene.tweens.add({
        targets: rip,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => rip.destroy()
      });
    } else if (surface === 'dirt') {
      (this.scene as any).stampFootprintDecal?.(this.x, this.y + 4, this.direction);
      const dust = this.scene.add.image(px, py, 'particle_dirt');
      dust.setScale(0.8);
      dust.setAlpha(0.7);
      this.scene.tweens.add({
        targets: dust,
        alpha: 0,
        y: py - 4,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 240,
        ease: 'Cubic.easeOut',
        onComplete: () => dust.destroy()
      });
    } else if (surface === 'stone') {
      const spark = this.scene.add.image(px, py, 'particle_stone_spark');
      spark.setScale(0.7);
      spark.setAlpha(0.8);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        y: py - 5,
        duration: 180,
        ease: 'Linear',
        onComplete: () => spark.destroy()
      });
    } else if (surface === 'wood') {
      const dust = this.scene.add.image(px, py, 'particle_dirt');
      dust.setScale(0.5);
      dust.setAlpha(0.5);
      this.scene.tweens.add({
        targets: dust,
        alpha: 0,
        y: py - 3,
        duration: 200,
        onComplete: () => dust.destroy()
      });
    } else {
      // Grass - subtle leaf kick
      const leaf = this.scene.add.image(px, py, Math.random() < 0.5 ? 'particle_leaf' : 'particle_leaf_autumn');
      leaf.setScale(0.7);
      leaf.setAlpha(0.75);
      const angle = (Math.random() - 0.5) * 1.5;
      this.scene.tweens.add({
        targets: leaf,
        alpha: 0,
        x: px + Math.sin(angle) * 8,
        y: py - 6,
        rotation: 0.5,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => leaf.destroy()
      });
    }
  }

  public roll() {
    if (this.carryingPotId) return;

    if (this.isRolling || this.isAttacking) {
      this.bufferedAction = 'roll';
      this.bufferedActionExpiresAt = this.scene.time.now + 180;
      return;
    }
    if (this.scene.time.now < this.rollCooldown) return;

    this.isRolling = true;
    this.isInvulnerable = true;
    this.rollCooldown = this.scene.time.now + 420;

    sounds.playRoll();
    chronicles.recordStat('rollsExecuted', 1);

    let vx = 0;
    let vy = 0;
    if (this.direction === 'left') vx = -1;
    else if (this.direction === 'right') vx = 1;
    else if (this.direction === 'up') vy = -1;
    else vy = 1;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const rollSpeed = 260 * this.speedMultiplier;
    body.setVelocity(vx * rollSpeed, vy * rollSpeed);

    this.sprite.setTexture(`player_${this.paletteIndex}_roll`);
    this.sprite.setAngle(vx < 0 ? -25 : (vx > 0 ? 25 : 0));
    this.updateGearVisuals();

    // Elevation Hop & Ground Shadow Detachment
    this.scene.tweens.add({
      targets: this.sprite,
      y: -12,
      duration: 130,
      yoyo: true,
      ease: 'Sine.easeOut'
    });

    this.scene.tweens.add({
      targets: this.shadowSprite,
      scaleX: 0.65,
      scaleY: 0.65,
      alpha: 0.35,
      duration: 130,
      yoyo: true,
      ease: 'Sine.easeOut'
    });

    // Dust particles
    for (let i = 0; i < 3; i++) {
      const dust = this.scene.add.image(this.x + (Math.random() * 8 - 4), this.y + 6 + (Math.random() * 4), 'particle_dust');
      dust.setScale(0.8);
      dust.setAlpha(0.7);
      this.scene.tweens.add({
        targets: dust,
        alpha: 0,
        scaleX: 1.4,
        scaleY: 1.4,
        y: dust.y - 6,
        duration: 250,
        onComplete: () => dust.destroy()
      });
    }

    this.scene.time.delayedCall(260, () => {
      this.isRolling = false;
      if (!this.godMode) {
        this.isInvulnerable = false;
      }
      this.sprite.setAngle(0);
      this.sprite.y = 0;
      this.shadowSprite.setScale(1.0).setAlpha(0.65);
      body.setVelocity(0, 0);
      this.updateGearVisuals();

      // Impact landing on ground: audio step + landing dust puff
      this.emitFootstep();
      for (let i = 0; i < 4; i++) {
        const p = this.scene.add.image(this.x + (Math.random() * 12 - 6), this.y + 6, 'particle_dust');
        p.setScale(0.6);
        p.setAlpha(0.6);
        this.scene.tweens.add({
          targets: p,
          alpha: 0,
          scaleX: 1.2,
          y: p.y - 4,
          duration: 200,
          onComplete: () => p.destroy()
        });
      }

      // Check input buffer
      this.checkActionBuffer();
    });

    network.sendMove(this.x, this.y, this.direction, 'roll', null);
  }

  public attack(onHitScan: (x: number, y: number, dir: Direction) => void) {
    // If carrying a pot, attack action throws the pot instead!
    if (this.carryingPotId) {
      this.throwPot();
      return;
    }

    const duration = this.equipmentStats.attackSpeedMs || 180;

    if (this.isAttacking || this.isRolling) {
      this.bufferedAction = 'attack';
      this.bufferedActionExpiresAt = this.scene.time.now + duration;
      this.bufferedHitScan = onHitScan;
      return;
    }

    this.isAttacking = true;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Root-motion tactical forward step (clean weight without ice skating)
    const isDagger = this.equipmentStats.weaponArchetype === 'dagger';
    const stepSpeed = (isDagger ? 75 : 50) * this.speedMultiplier;
    let svx = 0;
    let svy = 0;
    if (this.direction === 'down') svy = stepSpeed;
    else if (this.direction === 'up') svy = -stepSpeed;
    else if (this.direction === 'left') svx = -stepSpeed;
    else if (this.direction === 'right') svx = stepSpeed;
    body.setVelocity(svx, svy);

    sounds.playSlash();

    // Show slash sprite
    this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_slash`);
    this.updateGearVisuals();

    // Calculate hit point in front of player
    let hitX = this.x;
    let hitY = this.y;
    const reach = this.equipmentStats.cleaveRadius > 0 ? Math.round(this.equipmentStats.cleaveRadius * 0.6) : 28;
    if (this.direction === 'down') hitY += reach;
    if (this.direction === 'up') hitY -= reach;
    if (this.direction === 'left') hitX -= reach;
    if (this.direction === 'right') hitX += reach;

    onHitScan(hitX, hitY, this.direction);

    // End slash after duration with friction decay
    this.scene.time.delayedCall(duration, () => {
      this.isAttacking = false;
      body.setVelocity(0, 0);
      this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_idle`);
      this.updateGearVisuals();

      // Check input buffer
      this.checkActionBuffer();
    });
  }

  private checkActionBuffer() {
    if (this.bufferedAction && this.scene.time.now < this.bufferedActionExpiresAt) {
      const act = this.bufferedAction;
      const hitScan = this.bufferedHitScan;
      this.bufferedAction = null;
      this.bufferedHitScan = undefined;
      if (act === 'roll') {
        this.roll();
      } else if (act === 'attack' && hitScan) {
        this.attack(hitScan);
      }
    }
  }

  public liftPot(potId: string) {
    this.carryingPotId = potId;
    sounds.playPotLift();
    this.carriedPotSprite.setVisible(true);
    this.nameText.setY(-38);
    this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_carry`);
  }

  public throwPot(): { x: number; y: number; potId: string } | null {
    if (!this.carryingPotId) return null;

    const potId = this.carryingPotId;
    this.carryingPotId = null;
    this.carriedPotSprite.setVisible(false);
    this.nameText.setY(-28);
    this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_idle`);

    // Target landing spot in front of player
    let targetX = this.x;
    let targetY = this.y;
    const throwDist = 48;
    if (this.direction === 'down') targetY += throwDist;
    if (this.direction === 'up') targetY -= throwDist;
    if (this.direction === 'left') targetX -= throwDist;
    if (this.direction === 'right') targetX += throwDist;

    return { x: targetX, y: targetY, potId };
  }

  public showEmote(emote: string) {
    sounds.playEmoteSound(emote);

    if (this.emoteSprite) {
      this.emoteSprite.destroy();
      this.emoteSprite = null;
    }

    const baseY = this.carryingPotId ? -54 : -42;
    const spr = this.scene.add.sprite(0, baseY, `emote_${emote}`);
    spr.setScale(0.2, 0.2);
    this.add(spr);
    this.emoteSprite = spr;

    // Spring squash & stretch thought bubble animation
    this.scene.tweens.add({
      targets: spr,
      scaleX: 1.35,
      scaleY: 0.75,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: spr,
          scaleX: 0.85,
          scaleY: 1.25,
          duration: 110,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: spr,
              scaleX: 1.0,
              scaleY: 1.0,
              duration: 100,
              ease: 'Back.easeOut',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: spr,
                  y: baseY - 4,
                  duration: 600,
                  yoyo: true,
                  repeat: 3,
                  ease: 'Sine.easeInOut'
                });
              }
            });
          }
        });
      }
    });

    this.scene.time.delayedCall(3000, () => {
      if (this.emoteSprite === spr) {
        this.scene.tweens.add({
          targets: spr,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 180,
          ease: 'Back.easeIn',
          onComplete: () => {
            spr.destroy();
            if (this.emoteSprite === spr) this.emoteSprite = null;
          }
        });
      }
    });
  }

  public showChatBubble(text: string) {
    if (this.chatBubbleContainer) {
      this.chatBubbleContainer.destroy();
      this.chatBubbleContainer = null;
    }
    if (this.chatTimer) {
      this.chatTimer.remove();
    }

    const container = this.scene.add.container(0, this.carryingPotId ? -54 : -44);
    
    // Bubble text
    const bubbleText = this.scene.add.text(0, 0, text, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#1f2937',
      align: 'center',
      wordWrap: { width: 140 }
    });
    bubbleText.setOrigin(0.5, 0.5);

    const bounds = bubbleText.getBounds();
    const pad = 6;
    const bg = this.scene.add.rectangle(0, 0, bounds.width + pad * 2, bounds.height + pad * 2, 0xffffff);
    bg.setStrokeStyle(1.5, 0x1f2937);

    container.add([bg, bubbleText]);
    this.add(container);
    this.chatBubbleContainer = container;

    // Auto dismiss after 4.5 seconds
    this.chatTimer = this.scene.time.delayedCall(4500, () => {
      if (this.chatBubbleContainer) {
        this.chatBubbleContainer.destroy();
        this.chatBubbleContainer = null;
      }
    });
  }
}
