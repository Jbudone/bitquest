import Phaser from 'phaser';
import type { Direction, PlayerAnimState, PlayerEquipment, PlayerVanity } from '../../../shared/src/types';
import { HermiteInterpolator } from '../../../shared/src/netcode/hermite';

export class OtherPlayer extends Phaser.GameObjects.Container {
  public id: string;
  public playerName: string;
  public paletteIndex: number;
  public targetX: number;
  public targetY: number;
  public direction: Direction = 'down';
  public animState: PlayerAnimState = 'idle';
  private hermite: HermiteInterpolator;

  // Equipment & Vanity
  public equipment: PlayerEquipment = { weapon: 'sword_wood', offhand: null, armor: null, relic: null };
  public vanity: PlayerVanity = { head: null, armor: null, weapon: null };

  public sprite: Phaser.GameObjects.Sprite;
  public shadowSprite: Phaser.GameObjects.Sprite;
  public vanityArmorSprite: Phaser.GameObjects.Sprite;
  public vanityHeadSprite: Phaser.GameObjects.Sprite;
  public weaponSprite: Phaser.GameObjects.Sprite;
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
    this.hermite = new HermiteInterpolator(x, y);

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

    // Main Sprite
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

  public updateEquipment(equipment: PlayerEquipment, vanity: PlayerVanity) {
    this.equipment = equipment;
    this.vanity = vanity;
    this.updateGearVisuals();
  }

  public updateGearVisuals() {
    // 1. Headgear
    const headId = this.vanity.head;
    if (headId === 'vanity_crown') {
      this.vanityHeadSprite.setTexture('vanity_crown_gold');
      this.vanityHeadSprite.setPosition(0, -18);
      this.vanityHeadSprite.setVisible(this.animState !== 'roll');
    } else if (headId === 'vanity_hat_wizard') {
      this.vanityHeadSprite.setTexture('vanity_hat_wizard');
      this.vanityHeadSprite.setPosition(0, -22);
      this.vanityHeadSprite.setVisible(this.animState !== 'roll');
    } else if (headId === 'vanity_hood_ranger') {
      this.vanityHeadSprite.setTexture('vanity_hood_ranger');
      this.vanityHeadSprite.setPosition(0, -16);
      this.vanityHeadSprite.setVisible(this.animState !== 'roll');
    } else {
      this.vanityHeadSprite.setVisible(false);
    }

    // 2. Armor / Cloak
    const armorId = this.vanity.armor;
    if (armorId === 'vanity_cape_hero') {
      this.vanityArmorSprite.setTexture('vanity_cape_hero');
      this.vanityArmorSprite.setPosition(0, -4);
      this.vanityArmorSprite.setVisible(this.animState !== 'roll');
    } else if (armorId === 'vanity_armor_knight') {
      this.vanityArmorSprite.setTexture('vanity_armor_knight');
      this.vanityArmorSprite.setPosition(0, -6);
      this.vanityArmorSprite.setVisible(this.animState !== 'roll');
    } else {
      this.vanityArmorSprite.setVisible(false);
    }

    // 3. Weapon in hand
    if (this.animState === 'roll' || this.carriedPotSprite.visible) {
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

    if (this.animState === 'slash') {
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

  public setTargetState(x: number, y: number, direction: Direction, anim: PlayerAnimState, carryingItem: string | null) {
    this.targetX = x;
    this.targetY = y;
    this.direction = direction;
    this.animState = anim;
    this.hermite.pushTarget(x, y);

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

    this.updateGearVisuals();
  }

  public updateInterpolation(delta: number) {
    // Cubic Hermite spline velocity extrapolation & smoothing
    const interpolated = this.hermite.update(delta);
    this.x = interpolated.x;
    this.y = interpolated.y;

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
