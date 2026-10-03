import Phaser from 'phaser';
import type { Direction, PlayerAnimState } from '../../../shared/src/types';

export class OtherPlayer extends Phaser.GameObjects.Container {
  public id: string;
  public playerName: string;
  public paletteIndex: number;
  public targetX: number;
  public targetY: number;
  public direction: Direction = 'down';
  public animState: PlayerAnimState = 'idle';

  public sprite: Phaser.GameObjects.Sprite;
  public shadowSprite: Phaser.GameObjects.Sprite;
  private carriedPotSprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private emoteSprite: Phaser.GameObjects.Sprite | null = null;
  private chatBubbleContainer: Phaser.GameObjects.Container | null = null;
  private chatTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, paletteIndex: number) {
    super(scene, x, y);
    this.id = id;
    this.playerName = name;
    this.paletteIndex = paletteIndex;
    this.targetX = x;
    this.targetY = y;

    // Grounding Directional Drop Shadow (45 deg southeast skew)
    this.shadowSprite = scene.add.sprite(2, 4, 'shadow_directional_45');
    this.shadowSprite.setOrigin(0.5, 0.5);
    this.shadowSprite.setAlpha(0.65);
    this.add(this.shadowSprite);

    // Sprite
    this.sprite = scene.add.sprite(0, 0, `player_${paletteIndex}_down_idle`);
    this.sprite.setOrigin(0.5, 0.7);
    this.add(this.sprite);

    // Carried Pot Sprite
    this.carriedPotSprite = scene.add.sprite(0, -26, 'ent_pot');
    this.carriedPotSprite.setVisible(false);
    this.add(this.carriedPotSprite);

    // Player Name Tag
    this.nameText = scene.add.text(0, -28, name, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#e2e8f0',
      stroke: '#0f172a',
      strokeThickness: 3
    });
    this.nameText.setOrigin(0.5, 1);
    this.add(this.nameText);

    scene.add.existing(this);
  }

  public setTargetState(x: number, y: number, direction: Direction, anim: PlayerAnimState, carryingItem: string | null) {
    this.targetX = x;
    this.targetY = y;
    this.direction = direction;
    this.animState = anim;

    const isCarrying = !!carryingItem;
    this.carriedPotSprite.setVisible(isCarrying);
    this.nameText.setY(isCarrying ? -38 : -28);

    if (anim === 'roll') {
      this.sprite.setTexture(`player_${this.paletteIndex}_roll`);
      this.sprite.setY(-10);
      this.shadowSprite.setScale(0.65).setAlpha(0.35);
    } else {
      this.sprite.setY(0);
      this.shadowSprite.setScale(1.0).setAlpha(0.65);
      if (anim === 'walk') {
        this.sprite.play(`player_${this.paletteIndex}_walk_${direction}`, true);
      } else if (anim === 'carry_walk' || anim === 'carry_idle') {
        this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_carry`);
      } else if (anim === 'slash') {
        this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_slash`);
      } else {
        this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_idle`);
      }
    }
  }

  public updateInterpolation(delta: number) {
    // Smooth lerp towards target server position
    const lerpFactor = Math.min(1, (delta / 1000) * 15);
    this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
    this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);

    // Organic idle breathing micro-motion
    if (this.animState === 'idle') {
      const breath = Math.sin(this.scene.time.now * 0.0035 + this.x) * 0.03;
      this.sprite.setScale(1.0 - breath * 0.5, 1.0 + breath);
    } else {
      this.sprite.setScale(1.0, 1.0);
    }
  }

  public showEmote(emote: string) {
    const worldScene = this.scene as any;
    const lp = worldScene.localPlayer;
    if (lp) {
      const dist = Math.hypot(this.x - lp.x, this.y - lp.y);
      if (dist < 400) {
        sounds.playEmoteSound(emote);
      }
    }

    if (this.emoteSprite) {
      this.emoteSprite.destroy();
      this.emoteSprite = null;
    }

    const baseY = this.carriedPotSprite.visible ? -54 : -42;
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

    const container = this.scene.add.container(0, this.carriedPotSprite.visible ? -54 : -44);

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

    this.chatTimer = this.scene.time.delayedCall(4500, () => {
      if (this.chatBubbleContainer) {
        this.chatBubbleContainer.destroy();
        this.chatBubbleContainer = null;
      }
    });
  }
}
