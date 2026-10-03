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

  private sprite: Phaser.GameObjects.Sprite;
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

    if (anim === 'walk') {
      this.sprite.play(`player_${this.paletteIndex}_walk_${direction}`, true);
    } else if (anim === 'carry_walk' || anim === 'carry_idle') {
      this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_carry`);
    } else if (anim === 'slash') {
      this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_slash`);
    } else if (anim === 'roll') {
      this.sprite.setTexture(`player_${this.paletteIndex}_roll`);
    } else {
      this.sprite.setTexture(`player_${this.paletteIndex}_${direction}_idle`);
    }
  }

  public updateInterpolation(delta: number) {
    // Smooth lerp towards target server position
    const lerpFactor = Math.min(1, (delta / 1000) * 15);
    this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
    this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);
  }

  public showEmote(emote: string) {
    if (this.emoteSprite) {
      this.emoteSprite.destroy();
    }

    this.emoteSprite = this.scene.add.sprite(0, this.carriedPotSprite.visible ? -54 : -42, `emote_${emote}`);
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
