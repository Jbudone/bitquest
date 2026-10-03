import Phaser from 'phaser';
import type { Direction, PlayerAnimState } from '../../../shared/src/types';
import { sounds } from '../audio/SoundManager';
import { network } from '../network/NetworkClient';
import { chronicles } from '../storage/ChroniclesManager';

export class Player extends Phaser.GameObjects.Container {
  public id: string;
  public playerName: string;
  public paletteIndex: number;
  public direction: Direction = 'down';
  public isAttacking = false;
  public isRolling = false;
  public isInvulnerable = false;
  public rollCooldown = 0;
  public carryingPotId: string | null = null;
  public speed = 150;
  public speedMultiplier = 1;
  public godMode = false;
  public health = 3;
  public maxHealth = 3;
  public coins = 0;
  public acorns = 0;

  // Input buffering
  public bufferedAction: 'attack' | 'roll' | null = null;
  public bufferedActionExpiresAt = 0;
  private bufferedHitScan?: (x: number, y: number, dir: Direction) => void;

  private sprite: Phaser.GameObjects.Sprite;
  private carriedPotSprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private emoteSprite: Phaser.GameObjects.Sprite | null = null;
  private chatBubbleContainer: Phaser.GameObjects.Container | null = null;
  private chatTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, paletteIndex: number) {
    super(scene, x, y);
    this.id = id;
    this.playerName = name;
    this.paletteIndex = paletteIndex;

    // Sprite
    this.sprite = scene.add.sprite(0, 0, `player_${paletteIndex}_down_idle`);
    this.sprite.setOrigin(0.5, 0.7);
    this.add(this.sprite);

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

  public updateMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys, keys: Record<string, Phaser.Input.Keyboard.Key>) {
    if (this.isAttacking || this.isRolling) return;

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

    const currentSpeed = this.speed * this.speedMultiplier;
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

    // Broadcast movement to network
    network.sendMove(this.x, this.y, this.direction, animState, this.carryingPotId);
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
      body.setVelocity(0, 0);

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

    if (this.isAttacking || this.isRolling) {
      this.bufferedAction = 'attack';
      this.bufferedActionExpiresAt = this.scene.time.now + 180;
      this.bufferedHitScan = onHitScan;
      return;
    }

    this.isAttacking = true;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Root-motion tactical forward step (clean weight without ice skating)
    const stepSpeed = 50 * this.speedMultiplier;
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

    // Calculate hit point in front of player
    let hitX = this.x;
    let hitY = this.y;
    const reach = 28;
    if (this.direction === 'down') hitY += reach;
    if (this.direction === 'up') hitY -= reach;
    if (this.direction === 'left') hitX -= reach;
    if (this.direction === 'right') hitX += reach;

    onHitScan(hitX, hitY, this.direction);

    // End slash after 180ms with friction decay
    this.scene.time.delayedCall(180, () => {
      this.isAttacking = false;
      body.setVelocity(0, 0);
      this.sprite.setTexture(`player_${this.paletteIndex}_${this.direction}_idle`);

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
    sounds.playEmoteSound();

    if (this.emoteSprite) {
      this.emoteSprite.destroy();
    }

    this.emoteSprite = this.scene.add.sprite(0, this.carryingPotId ? -54 : -42, `emote_${emote}`);
    this.emoteSprite.setScale(0);
    this.add(this.emoteSprite);

    this.scene.tweens.add({
      targets: this.emoteSprite,
      scale: 1.2,
      duration: 180,
      yoyo: true,
      repeat: 0,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.emoteSprite) this.emoteSprite.setScale(1.0);
      }
    });

    this.scene.time.delayedCall(3000, () => {
      if (this.emoteSprite) {
        this.emoteSprite.destroy();
        this.emoteSprite = null;
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
