import Phaser from 'phaser';

export type PlaceholderCategory = 'character' | 'monster' | 'item' | 'prop' | 'tile';
export type ItemShape = 'sword' | 'dagger' | 'shield' | 'potion' | 'key' | 'gem' | 'scroll' | 'relic' | 'generic';
export type MonsterShape = 'slime' | 'brute' | 'skitterer' | 'boss';

export interface PlaceholderConfig {
  key: string;
  category: PlaceholderCategory;
  primaryColor?: string;
  accentColor?: string;
  itemShape?: ItemShape;
  monsterShape?: MonsterShape;
  width?: number;
  height?: number;
}

export class PlaceholderArtGenerator {
  private static createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [canvas, ctx];
  }

  /**
   * Generates a 4-direction animated character or monster spritesheet on the fly.
   * Frame size: 32x32 (or custom). 4 directions x 3 frames = 12 frames.
   */
  public static createCharacter(
    scene: Phaser.Scene,
    key: string,
    primaryColor: string = '#6366f1',
    accentColor: string = '#fbbf24',
    type: 'hero' | 'monster' | 'npc' = 'hero'
  ): string {
    if (scene.textures.exists(key)) return key;

    const fw = 32;
    const fh = 32;
    const totalFrames = 12; // 4 rows x 3 cols or 1 row of 12
    const [canvas, ctx] = this.createCanvas(fw * 3, fh * 4);

    const directions = ['down', 'left', 'right', 'up'];

    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        const ox = f * fw;
        const oy = d * fh;
        const bob = (f === 1) ? -2 : 0;

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(ox + 16, oy + 28, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'monster') {
          // Bouncy cute jelly monster
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.roundRect(ox + 8, oy + 12 + bob, 16, 14, [8, 8, 4, 4]);
          ctx.fill();

          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(ox + 10, oy + 14 + bob, 4, 3);

          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + 11, oy + 18 + bob, 3, 4);
          ctx.fillRect(ox + 18, oy + 18 + bob, 3, 4);
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(ox + 12, oy + 19 + bob, 2, 2);
          ctx.fillRect(ox + 19, oy + 19 + bob, 2, 2);
        } else {
          // Chibi humanoid character (hero or NPC)
          // Body
          ctx.fillStyle = primaryColor;
          ctx.fillRect(ox + 11, oy + 18 + bob, 10, 8);

          // Feet / Legs
          ctx.fillStyle = '#1e293b';
          if (f === 1) {
            ctx.fillRect(ox + 10, oy + 26, 4, 3);
            ctx.fillRect(ox + 18, oy + 24, 4, 3);
          } else if (f === 2) {
            ctx.fillRect(ox + 10, oy + 24, 4, 3);
            ctx.fillRect(ox + 18, oy + 26, 4, 3);
          } else {
            ctx.fillRect(ox + 11, oy + 26, 4, 3);
            ctx.fillRect(ox + 17, oy + 26, 4, 3);
          }

          // Head
          ctx.fillStyle = '#fed7aa'; // Skin tone
          ctx.fillRect(ox + 10, oy + 8 + bob, 12, 10);

          // Hair / Cap (accentColor)
          ctx.fillStyle = accentColor;
          ctx.fillRect(ox + 9, oy + 6 + bob, 14, 5);
          ctx.fillRect(ox + 8, oy + 8 + bob, 3, 7);

          // Eyes (Directional)
          ctx.fillStyle = '#1e293b';
          if (d === 0) { // down
            ctx.fillRect(ox + 12, oy + 12 + bob, 2, 3);
            ctx.fillRect(ox + 18, oy + 12 + bob, 2, 3);
          } else if (d === 1) { // left
            ctx.fillRect(ox + 10, oy + 12 + bob, 2, 3);
          } else if (d === 2) { // right
            ctx.fillRect(ox + 20, oy + 12 + bob, 2, 3);
          } // up has no eyes (shows back of hair)
        }
      }
    }

    scene.textures.addSpriteSheet(key, canvas, { frameWidth: fw, frameHeight: fh });
    return key;
  }

  /**
   * Generates a crisp 16x16 or 24x24 item icon on the fly.
   */
  public static createItemIcon(
    scene: Phaser.Scene,
    key: string,
    shape: ItemShape = 'generic',
    primaryColor: string = '#f59e0b',
    size: number = 24
  ): string {
    if (scene.textures.exists(key)) return key;

    const [canvas, ctx] = this.createCanvas(size, size);
    const mid = size / 2;

    switch (shape) {
      case 'sword':
        // Blade
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(mid - 1, 4, 3, size - 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mid - 1, 4, 1, size - 12);
        // Crossguard
        ctx.fillStyle = primaryColor;
        ctx.fillRect(mid - 4, size - 8, 9, 2);
        // Hilt
        ctx.fillStyle = '#78350f';
        ctx.fillRect(mid - 1, size - 6, 3, 4);
        break;

      case 'dagger':
        // Shorter, curved blade
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(mid, 6, 2, 8);
        ctx.fillStyle = primaryColor;
        ctx.fillRect(mid - 2, 14, 6, 2);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(mid - 1, 16, 3, 4);
        break;

      case 'shield':
        // Shield body
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(mid - 6, 5);
        ctx.lineTo(mid + 6, 5);
        ctx.lineTo(mid + 6, 13);
        ctx.lineTo(mid, 19);
        ctx.lineTo(mid - 6, 13);
        ctx.closePath();
        ctx.fill();
        // Inner rim
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case 'potion':
        // Cork
        ctx.fillStyle = '#92400e';
        ctx.fillRect(mid - 2, 4, 4, 2);
        // Glass Bottle
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(mid, 13, 6, 0, Math.PI * 2);
        ctx.fill();
        // Liquid
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(mid, 14, 5, 0, Math.PI * 2);
        ctx.fill();
        // Bubble highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mid - 2, 11, 2, 2);
        break;

      case 'key':
        ctx.fillStyle = primaryColor;
        // Ring
        ctx.beginPath();
        ctx.arc(mid, 7, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(mid, 7, 2, 0, Math.PI * 2);
        ctx.fill();
        // Shaft
        ctx.fillStyle = primaryColor;
        ctx.fillRect(mid - 1, 11, 2, 8);
        ctx.fillRect(mid + 1, 15, 3, 2);
        ctx.fillRect(mid + 1, 18, 2, 2);
        break;

      case 'gem':
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(mid, 4);
        ctx.lineTo(mid + 7, 9);
        ctx.lineTo(mid, 19);
        ctx.lineTo(mid - 7, 9);
        ctx.closePath();
        ctx.fill();
        // Facet reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(mid, 4);
        ctx.lineTo(mid + 3, 9);
        ctx.lineTo(mid, 12);
        ctx.lineTo(mid - 3, 9);
        ctx.closePath();
        ctx.fill();
        break;

      default:
        // Generic glowing orb / token
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(mid, mid, mid - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mid - 3, mid - 3, 3, 3);
        break;
    }

    scene.textures.addCanvas(key, canvas);
    return key;
  }

  /**
   * Universal Fallback Watchdog:
   * Guarantees that if any code requests a texture key that does not exist,
   * a cute placeholder is created dynamically instead of throwing an error or rendering black.
   */
  public static ensureTextureExists(scene: Phaser.Scene, key: string, category: PlaceholderCategory = 'item'): string {
    if (scene.textures.exists(key)) return key;

    if (category === 'character' || category === 'monster') {
      return this.createCharacter(scene, key, '#ec4899', '#fde047', category === 'monster' ? 'monster' : 'hero');
    } else {
      return this.createItemIcon(scene, key, 'generic', '#38bdf8');
    }
  }
}
