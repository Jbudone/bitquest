import Phaser from 'phaser';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene) {
    this.createTileTextures(scene);
    this.createPlayerTextures(scene);
    this.createInteractiveTextures(scene);
    this.createItemTextures(scene);
    this.createParticleTextures(scene);
    this.createEnemyTextures(scene);
    this.createNPCTextures(scene);
    this.createEmoteTextures(scene);
    this.createPortraitTextures(scene);
  }

  private static createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [canvas, ctx];
  }

  private static createTileTextures(scene: Phaser.Scene) {
    // 1. Lush Cute Grass Tile (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#4f933b'; // Warm lush meadow green
      ctx.fillRect(0, 0, 32, 32);

      // Soft light grass tufts
      ctx.fillStyle = '#73bf48';
      for (let i = 0; i < 32; i += 4) {
        for (let j = 0; j < 32; j += 4) {
          if ((i * 7 + j * 13) % 4 === 0) {
            ctx.fillRect(i, j, 2, 2);
          }
        }
      }

      // Soft deep shade blades
      ctx.fillStyle = '#367125';
      ctx.fillRect(5, 7, 2, 4);
      ctx.fillRect(19, 21, 2, 4);
      ctx.fillRect(27, 5, 2, 4);
      ctx.fillRect(11, 25, 2, 4);

      // Cute Little Flowers (Buttercups & Daisies)
      ctx.fillStyle = '#facc15'; // yellow buttercup
      ctx.fillRect(8, 14, 2, 2);
      ctx.fillRect(24, 23, 2, 2);

      ctx.fillStyle = '#ffffff'; // white daisy petals
      ctx.fillRect(22, 10, 3, 3);
      ctx.fillStyle = '#f59e0b'; // daisy center
      ctx.fillRect(23, 11, 1, 1);

      ctx.fillStyle = '#f472b6'; // pink clover
      ctx.fillRect(6, 27, 2, 2);

      scene.textures.addCanvas('tile_grass', canvas);
    }

    // 2. Cobblestone Plaza (32x32) - Soft rounded flagstones
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#7a8277'; // Sand mortar
      ctx.fillRect(0, 0, 32, 32);

      // Rounded warm flagstone blocks
      ctx.fillStyle = '#9da599';
      // Stone 1
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(1, 1, 14, 14, 2) : ctx.fillRect(1, 1, 14, 14);
      ctx.fill();
      // Stone 2
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(17, 1, 14, 14, 2) : ctx.fillRect(17, 1, 14, 14);
      ctx.fill();
      // Stone 3
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(1, 17, 10, 14, 2) : ctx.fillRect(1, 17, 10, 14);
      ctx.fill();
      // Stone 4
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(13, 17, 18, 14, 2) : ctx.fillRect(13, 17, 18, 14);
      ctx.fill();

      // Soft stone highlights
      ctx.fillStyle = '#b8c0b3';
      ctx.fillRect(3, 2, 8, 2);
      ctx.fillRect(19, 2, 8, 2);
      ctx.fillRect(15, 18, 10, 2);

      scene.textures.addCanvas('tile_cobble', canvas);
    }

    // 3. Dirt Path (32x32) - Warm caramel earth
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#b28b57';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#9e7544';
      ctx.fillRect(4, 6, 4, 3);
      ctx.fillRect(20, 14, 5, 3);
      ctx.fillRect(12, 24, 4, 2);
      ctx.fillStyle = '#cca473'; // soft sand glint
      ctx.fillRect(3, 18, 3, 2);
      ctx.fillRect(25, 4, 3, 2);
      scene.textures.addCanvas('tile_dirt', canvas);
    }

    // 4. Sparkling Water (32x32) - Azure with soft foam
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(3, 7, 12, 4);
      ctx.fillRect(17, 19, 12, 4);
      ctx.fillStyle = '#ffffff'; // sparkle
      ctx.fillRect(6, 8, 5, 2);
      ctx.fillRect(20, 20, 5, 2);
      ctx.fillStyle = '#1d4ed8'; // deep ripples
      ctx.fillRect(0, 14, 32, 2);
      ctx.fillRect(0, 28, 32, 2);
      scene.textures.addCanvas('tile_water', canvas);
    }

    // 5. Cottage Wall (Warm Timber)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#9a5e37';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#6e3c1d';
      ctx.fillRect(0, 7, 32, 2);
      ctx.fillRect(0, 15, 32, 2);
      ctx.fillRect(0, 23, 32, 2);
      ctx.fillRect(0, 31, 32, 1);
      ctx.fillStyle = '#b87547';
      ctx.fillRect(2, 2, 28, 2);
      ctx.fillRect(2, 10, 28, 2);
      ctx.fillRect(2, 18, 28, 2);
      scene.textures.addCanvas('tile_wall_wood', canvas);
    }

    // 6. Cottage Roof (Terracotta Shingles)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#c24134';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#8f2319';
      ctx.fillRect(0, 0, 32, 4);
      ctx.fillRect(0, 16, 32, 4);
      ctx.fillStyle = '#e26a5d';
      ctx.fillRect(0, 4, 32, 2);
      ctx.fillRect(0, 20, 32, 2);
      scene.textures.addCanvas('tile_roof_red', canvas);
    }

    // 7. Stone Ruin Wall
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#475569';
      ctx.strokeRect(0.5, 0.5, 31, 31);
      ctx.strokeRect(0.5, 15.5, 31, 0);
      // Cute soft moss
      ctx.fillStyle = '#73bf48';
      ctx.fillRect(2, 23, 9, 5);
      ctx.fillRect(22, 7, 7, 4);
      scene.textures.addCanvas('tile_wall_stone', canvas);
    }

    // 8. Fungal Hollow Floor (Deep Purple Enchanted Moss)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#241a38';
      ctx.fillRect(0, 0, 32, 32);

      // Deep violet moss patches
      ctx.fillStyle = '#3f255c';
      ctx.fillRect(4, 4, 12, 10);
      ctx.fillRect(18, 16, 10, 12);
      ctx.fillRect(2, 20, 8, 8);

      // Bioluminescent glowing specks
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(6, 8, 2, 2);
      ctx.fillRect(22, 22, 2, 2);
      ctx.fillRect(26, 6, 2, 2);

      // Tiny cyan glow spore
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(14, 18, 2, 2);
      ctx.fillRect(8, 26, 1, 1);

      // Cute mini sprout
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(18, 7, 3, 2);
      ctx.fillRect(19, 9, 1, 2);

      scene.textures.addCanvas('tile_fungal_grass', canvas);
    }

    // 9. Sunken Ruins Ancient Floor (Mossy Carved Stone)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 32, 32);

      // Carved stone slab borders
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, 30, 30);
      ctx.strokeRect(6, 6, 20, 20);

      // Ancient teal moss veins
      ctx.fillStyle = '#10b981';
      ctx.fillRect(3, 14, 6, 2);
      ctx.fillRect(22, 8, 7, 2);
      ctx.fillRect(16, 24, 8, 2);

      // Golden rune glint
      ctx.fillStyle = '#fde047';
      ctx.fillRect(15, 15, 2, 2);

      scene.textures.addCanvas('tile_ruins_floor', canvas);
    }

    // 10. Rustic Wooden Footbridge (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#6b431e';
      ctx.fillRect(0, 0, 32, 32);

      // Planks
      ctx.fillStyle = '#9c663b';
      ctx.fillRect(2, 2, 28, 7);
      ctx.fillRect(2, 10, 28, 7);
      ctx.fillRect(2, 18, 28, 7);
      ctx.fillRect(2, 26, 28, 5);

      // Iron nails
      ctx.fillStyle = '#334155';
      ctx.fillRect(4, 5, 2, 2);
      ctx.fillRect(26, 5, 2, 2);
      ctx.fillRect(4, 13, 2, 2);
      ctx.fillRect(26, 13, 2, 2);
      ctx.fillRect(4, 21, 2, 2);
      ctx.fillRect(26, 21, 2, 2);

      scene.textures.addCanvas('tile_bridge_wood', canvas);
    }

    // 11. Forest Canopy Barrier (Deep Green Foliage)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 32, 32);

      // Rounded leaves cluster
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.arc(24, 8, 7, 0, Math.PI * 2);
      ctx.arc(16, 18, 9, 0, Math.PI * 2);
      ctx.arc(8, 24, 6, 0, Math.PI * 2);
      ctx.arc(24, 24, 6, 0, Math.PI * 2);
      ctx.fill();

      // Bright leaf highlights
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(6, 6, 4, 3);
      ctx.fillRect(22, 6, 4, 3);
      ctx.fillRect(14, 14, 5, 3);

      scene.textures.addCanvas('tile_tree_canopy', canvas);
    }

    // 12. Fungal Canopy Barrier (Dark Violet Mushrooms Canopy)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#1f132e';
      ctx.fillRect(0, 0, 32, 32);

      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(10, 10, 8, 0, Math.PI * 2);
      ctx.arc(22, 12, 9, 0, Math.PI * 2);
      ctx.arc(14, 22, 8, 0, Math.PI * 2);
      ctx.fill();

      // Glowing spots
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(8, 8, 3, 3);
      ctx.fillRect(22, 10, 3, 3);
      ctx.fillRect(13, 21, 3, 3);

      scene.textures.addCanvas('tile_fungal_canopy', canvas);
    }

    // 13. Cozy Interior Wooden Floor Planks (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(0, 0, 32, 32);

      // 4 horizontal oak planks
      for (let i = 0; i < 4; i++) {
        const y = i * 8;
        ctx.fillStyle = i % 2 === 0 ? '#92400e' : '#78350f';
        ctx.fillRect(0, y, 32, 7);
        ctx.fillStyle = '#5c2b09'; // plank groove
        ctx.fillRect(0, y + 7, 32, 1);

        // Staggered vertical seams
        const seamX = (i * 12 + 8) % 32;
        ctx.fillRect(seamX, y, 1, 7);

        // Brass nail accents
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(2, y + 3, 1, 1);
        ctx.fillRect(30, y + 3, 1, 1);
      }

      scene.textures.addCanvas('tile_floor_interior', canvas);
    }

    // 14. Cozy Stone Fireplace (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Stone brick mantle
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, 4, 28, 28);
      ctx.fillStyle = '#334155';
      ctx.fillRect(4, 2, 24, 4);

      // Dark hearth opening
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(16, 22, 9, Math.PI, 0, false);
      ctx.fillRect(7, 22, 18, 10);
      ctx.fill();

      // Burning logs & glowing embers
      ctx.fillStyle = '#78350f';
      ctx.fillRect(9, 27, 14, 4);
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(16, 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(16, 25, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(15, 23, 2, 3);

      scene.textures.addCanvas('prop_fireplace', canvas);
    }

    // 15. Scholarly Bookshelf (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(2, 2, 28, 30);
      ctx.fillStyle = '#270e02'; // backing
      ctx.fillRect(5, 5, 22, 11);
      ctx.fillRect(5, 18, 22, 11);

      // Top shelf books
      const topColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];
      let bx = 6;
      topColors.forEach(c => {
        ctx.fillStyle = c;
        ctx.fillRect(bx, 6, 3, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx + 1, 8, 1, 2);
        bx += 4;
      });

      // Bottom shelf books & parchment scroll
      const btmColors = ['#0891b2', '#ea580c', '#4f46e5', '#ca8a04'];
      let bbx = 6;
      btmColors.forEach(c => {
        ctx.fillStyle = c;
        ctx.fillRect(bbx, 19, 4, 10);
        bbx += 5;
      });

      scene.textures.addCanvas('prop_bookshelf', canvas);
    }

    // 16. Round Cozy Hearth Rug (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.fill();

      // Gold ornamental ring
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.stroke();

      // Inner floral medallion
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(16, 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(15, 15, 2, 2);

      scene.textures.addCanvas('prop_rug_round', canvas);
    }

    // 17. Blue Courier Runner Rug (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(4, 2, 24, 28);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(6, 4, 20, 24);

      // Gold diamond emblems
      ctx.fillStyle = '#facc15';
      for (let y = 8; y <= 24; y += 8) {
        ctx.beginPath();
        ctx.moveTo(16, y - 3);
        ctx.lineTo(19, y);
        ctx.lineTo(16, y + 3);
        ctx.lineTo(13, y);
        ctx.closePath();
        ctx.fill();
      }

      scene.textures.addCanvas('prop_rug_blue', canvas);
    }

    // 18. Wooden Shop & Bakery Counter (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Counter body & paneling
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, 10, 28, 20);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(0, 8, 32, 4);

      // Drawers & knobs
      ctx.fillStyle = '#451a03';
      ctx.fillRect(5, 14, 10, 6);
      ctx.fillRect(17, 14, 10, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(9, 16, 2, 2);
      ctx.fillRect(21, 16, 2, 2);

      // Jars on counter
      ctx.fillStyle = '#dc2626'; // Strawberry jam jar
      ctx.fillRect(6, 2, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 3, 2, 2);
      ctx.fillStyle = '#9333ea'; // Grape / berry jam jar
      ctx.fillRect(18, 2, 6, 6);

      scene.textures.addCanvas('prop_counter_wood', canvas);
    }
  }

  private static createPlayerTextures(scene: Phaser.Scene) {
    const palettes = [
      { name: 'green', tunic: '#2e9939', shadow: '#1c6623', hat: '#2e9939' },
      { name: 'blue', tunic: '#267bd6', shadow: '#164d8a', hat: '#267bd6' },
      { name: 'red', tunic: '#d63429', shadow: '#8c1f17', hat: '#d63429' },
      { name: 'purple', tunic: '#8e3fd1', shadow: '#592187', hat: '#8e3fd1' },
      { name: 'gold', tunic: '#d99e1e', shadow: '#8c630d', hat: '#d99e1e' }
    ];

    palettes.forEach((pal, palIdx) => {
      ['down', 'up', 'left', 'right'].forEach(dir => {
        // Idle frame
        {
          const [canvas, ctx] = this.createCanvas(32, 32);
          this.drawPlayer(ctx, dir, false, 0, pal, false);
          scene.textures.addCanvas(`player_${palIdx}_${dir}_idle`, canvas);
        }
        // Walk frame 1
        {
          const [canvas, ctx] = this.createCanvas(32, 32);
          this.drawPlayer(ctx, dir, true, 1, pal, false);
          scene.textures.addCanvas(`player_${palIdx}_${dir}_walk1`, canvas);
        }
        // Walk frame 2
        {
          const [canvas, ctx] = this.createCanvas(32, 32);
          this.drawPlayer(ctx, dir, true, 2, pal, false);
          scene.textures.addCanvas(`player_${palIdx}_${dir}_walk2`, canvas);
        }
        // Slash frame (sword swing)
        {
          const [canvas, ctx] = this.createCanvas(48, 48);
          this.drawPlayerSlash(ctx, dir, pal);
          scene.textures.addCanvas(`player_${palIdx}_${dir}_slash`, canvas);
        }
        // Carry frame (holding pot above head)
        {
          const [canvas, ctx] = this.createCanvas(32, 40);
          this.drawPlayer(ctx, dir, false, 0, pal, true);
          scene.textures.addCanvas(`player_${palIdx}_${dir}_carry`, canvas);
        }
      });

      // Roll frame (tumbling cute ball)
      {
        const [canvas, ctx] = this.createCanvas(32, 32);
        // Soft shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(16, 26, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tumble ball
        ctx.fillStyle = pal.tunic;
        ctx.beginPath();
        ctx.arc(16, 17, 10, 0, Math.PI * 2);
        ctx.fill();

        // Shadow underside
        ctx.fillStyle = pal.shadow;
        ctx.beginPath();
        ctx.arc(16, 19, 8, 0, Math.PI);
        ctx.fill();

        // Hat / Cap tip rotating
        ctx.fillStyle = pal.hat;
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(2, 6);
        ctx.lineTo(12, 14);
        ctx.fill();

        // Little white motion streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(17, 10, 5, 2);
        ctx.fillRect(19, 14, 4, 2);

        scene.textures.addCanvas(`player_${palIdx}_roll`, canvas);
      }
    });
  }

  private static drawPlayer(
    ctx: CanvasRenderingContext2D,
    dir: string,
    isWalking: boolean,
    step: number,
    pal: { tunic: string; shadow: string; hat: string },
    carrying: boolean
  ) {
    const yOff = carrying ? 8 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(16, 28 + yOff, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots / Feet
    ctx.fillStyle = '#59381c';
    if (!isWalking) {
      ctx.fillRect(11, 24 + yOff, 4, 5);
      ctx.fillRect(17, 24 + yOff, 4, 5);
    } else if (step === 1) {
      ctx.fillRect(10, 22 + yOff, 4, 6);
      ctx.fillRect(18, 25 + yOff, 4, 4);
    } else {
      ctx.fillRect(10, 25 + yOff, 4, 4);
      ctx.fillRect(18, 22 + yOff, 4, 6);
    }

    // Tunic Body
    ctx.fillStyle = pal.tunic;
    ctx.fillRect(10, 14 + yOff, 12, 11);
    ctx.fillStyle = pal.shadow;
    ctx.fillRect(10, 22 + yOff, 12, 3);

    // Belt
    ctx.fillStyle = '#3d2511';
    ctx.fillRect(10, 19 + yOff, 12, 2);
    ctx.fillStyle = '#e6c843'; // gold buckle
    ctx.fillRect(15, 19 + yOff, 2, 2);

    // Hands / Arms
    if (carrying) {
      // Arms raised up to hold pot
      ctx.fillStyle = '#ffd1a4';
      ctx.fillRect(7, 4 + yOff, 4, 8);
      ctx.fillRect(21, 4 + yOff, 4, 8);
    } else {
      ctx.fillStyle = '#ffd1a4';
      ctx.fillRect(7, 15 + yOff, 3, 5);
      ctx.fillRect(22, 15 + yOff, 3, 5);
    }

    // Head / Face
    ctx.fillStyle = '#ffd1a4';
    ctx.fillRect(11, 8 + yOff, 10, 7);

    // Hair / Hat
    ctx.fillStyle = '#6b431e'; // Hair
    ctx.fillRect(10, 7 + yOff, 12, 3);

    ctx.fillStyle = pal.hat; // Hero cap
    ctx.fillRect(10, 4 + yOff, 12, 4);
    ctx.fillRect(12, 2 + yOff, 8, 2);

    // Eyes depending on direction
    ctx.fillStyle = '#222222';
    if (dir === 'down') {
      ctx.fillRect(13, 11 + yOff, 2, 2);
      ctx.fillRect(17, 11 + yOff, 2, 2);
    } else if (dir === 'left') {
      ctx.fillRect(12, 11 + yOff, 2, 2);
    } else if (dir === 'right') {
      ctx.fillRect(18, 11 + yOff, 2, 2);
    } else {
      // Facing up: back of hat
      ctx.fillStyle = pal.hat;
      ctx.fillRect(11, 7 + yOff, 10, 6);
    }
  }

  private static drawPlayerSlash(ctx: CanvasRenderingContext2D, dir: string, pal: any) {
    const cx = 24;
    const cy = 24;

    // Body
    ctx.save();
    ctx.translate(cx - 16, cy - 16);
    this.drawPlayer(ctx, dir, false, 0, pal, false);
    ctx.restore();

    // Sword & Arc
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    if (dir === 'right') {
      ctx.arc(cx + 8, cy, 18, -Math.PI / 3, Math.PI / 3, false);
      ctx.fillStyle = '#cfd9e8';
      ctx.fillRect(cx + 12, cy - 2, 16, 4);
    } else if (dir === 'left') {
      ctx.arc(cx - 8, cy, 18, Math.PI * 2 / 3, Math.PI * 4 / 3, false);
      ctx.fillStyle = '#cfd9e8';
      ctx.fillRect(cx - 28, cy - 2, 16, 4);
    } else if (dir === 'down') {
      ctx.arc(cx, cy + 8, 18, 0, Math.PI, false);
      ctx.fillStyle = '#cfd9e8';
      ctx.fillRect(cx - 2, cy + 12, 4, 16);
    } else {
      ctx.arc(cx, cy - 8, 18, Math.PI, Math.PI * 2, false);
      ctx.fillStyle = '#cfd9e8';
      ctx.fillRect(cx - 2, cy - 28, 4, 16);
    }
    ctx.stroke();
  }

  private static createInteractiveTextures(scene: Phaser.Scene) {
    // 1. Bush (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(16, 26, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bush Body
      ctx.fillStyle = '#2f7a24';
      ctx.beginPath();
      ctx.arc(16, 16, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#429e33';
      ctx.beginPath();
      ctx.arc(14, 13, 9, 0, Math.PI * 2);
      ctx.fill();

      // Red berries
      ctx.fillStyle = '#e63946';
      ctx.fillRect(10, 11, 3, 3);
      ctx.fillRect(20, 15, 3, 3);
      ctx.fillRect(13, 19, 3, 3);

      scene.textures.addCanvas('ent_bush', canvas);
    }

    // 2. Cut Bush Stump / Leaves (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#2f7a24';
      ctx.fillRect(14, 20, 4, 4);
      ctx.fillStyle = '#59381c';
      ctx.fillRect(15, 24, 2, 3);
      scene.textures.addCanvas('ent_bush_cut', canvas);
    }

    // 3. Ceramic Pot (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Terracotta Pot
      ctx.fillStyle = '#c26236';
      ctx.fillRect(6, 8, 12, 11);
      ctx.fillRect(8, 6, 8, 2);
      ctx.fillRect(7, 19, 10, 2);

      // Pot Rim & Highlights
      ctx.fillStyle = '#e07d4f';
      ctx.fillRect(8, 8, 3, 9);
      ctx.fillStyle = '#8f411e';
      ctx.fillRect(15, 8, 3, 9);

      // Ancient painted swirl
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(10, 12, 4, 2);

      scene.textures.addCanvas('ent_pot', canvas);
    }

    // 4. Pot Shard Particle (8x8)
    {
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = '#c26236';
      ctx.fillRect(2, 2, 4, 4);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('particle_shard', canvas);
    }

    // 5. Sun Stone Switch - Inactive (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(4, 4, 24, 24);
      ctx.fillStyle = '#4b5563';
      ctx.strokeRect(4.5, 4.5, 23, 23);
      // Sun carving
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(16, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('switch_up', canvas);
    }

    // 6. Sun Stone Switch - Pressed & Glowing (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(5, 5, 22, 22);
      // Glowing rune
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(16, 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(16, 16, 4, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('switch_down', canvas);
    }

    // 7. Ancient Gate - Closed (64x48)
    {
      const [canvas, ctx] = this.createCanvas(64, 48);
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, 64, 48);
      // Pillars
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, 0, 16, 48);
      ctx.fillRect(48, 0, 16, 48);
      // Heavy iron bars / stone seal
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(16, 8, 32, 40);
      ctx.fillStyle = '#9ca3af';
      for (let x = 20; x < 48; x += 6) {
        ctx.fillRect(x, 10, 2, 38);
      }
      scene.textures.addCanvas('gate_closed', canvas);
    }

    // 8. Ancient Gate - Opened (64x48)
    {
      const [canvas, ctx] = this.createCanvas(64, 48);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, 0, 16, 48);
      ctx.fillRect(48, 0, 16, 48);
      // Open archway leading into mysterious glowing green moss
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(16, 0, 32, 48);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(20, 36, 24, 12);
      scene.textures.addCanvas('gate_opened', canvas);
    }

    // 9. Signpost (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = '#59381c';
      ctx.fillRect(10, 12, 4, 12);
      ctx.fillStyle = '#b08b59';
      ctx.fillRect(3, 4, 18, 10);
      ctx.fillStyle = '#3d2511';
      ctx.fillRect(5, 7, 14, 2);
      ctx.fillRect(5, 10, 10, 2);
      scene.textures.addCanvas('ent_sign', canvas);
    }

    // 10. Ancient Ruin Pillar (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Soft shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 44, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone base & capital
      ctx.fillStyle = '#475569';
      ctx.fillRect(4, 38, 24, 8);
      ctx.fillRect(2, 6, 28, 8);

      // Fluted column shaft
      ctx.fillStyle = '#64748b';
      ctx.fillRect(6, 14, 20, 24);

      // Fluting lines
      ctx.fillStyle = '#334155';
      ctx.fillRect(9, 14, 2, 24);
      ctx.fillRect(15, 14, 2, 24);
      ctx.fillRect(21, 14, 2, 24);

      // Soft creeping ivy & moss
      ctx.fillStyle = '#10b981';
      ctx.fillRect(5, 26, 4, 6);
      ctx.fillRect(7, 24, 3, 3);
      ctx.fillRect(19, 18, 4, 5);
      ctx.fillRect(21, 32, 4, 4);

      scene.textures.addCanvas('ent_pillar', canvas);
    }

    // 11. Giant Bioluminescent Mushroom (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 44, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(12, 24, 8, 20);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(12, 28, 2, 16);

      // Large Glowing Cap
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.arc(16, 22, 15, Math.PI, 0, false);
      ctx.fill();

      // Cap rim glow
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(16, 22, 15, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing polka dots
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(10, 15, 2.5, 0, Math.PI * 2);
      ctx.arc(22, 14, 2.5, 0, Math.PI * 2);
      ctx.arc(16, 10, 3, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('ent_mushroom_giant', canvas);
    }
  }

  private static createItemTextures(scene: Phaser.Scene) {
    // 1. Shiny Coin (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(8, 7, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(7, 6, 3, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('item_coin', canvas);
    }

    // 2. Wild Strawberry (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.bezierCurveTo(3, 10, 8, 13, 8, 13);
      ctx.bezierCurveTo(8, 13, 13, 10, 12, 5);
      ctx.bezierCurveTo(11, 3, 5, 3, 4, 5);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(6, 6, 1, 1);
      ctx.fillRect(9, 7, 1, 1);
      ctx.fillRect(7, 9, 1, 1);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(5, 3, 6, 2);
      ctx.fillRect(7, 2, 2, 2);

      scene.textures.addCanvas('item_strawberry', canvas);
    }

    // 3. Acorn (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(8, 9, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(8, 6, 5.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(7, 3, 2, 2);

      scene.textures.addCanvas('item_acorn', canvas);
    }

    // 4. Jam Jar (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(4, 6, 8, 7);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(5, 7, 2, 5);

      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(3, 4, 10, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 2, 2);
      ctx.fillRect(8, 4, 2, 2);

      scene.textures.addCanvas('item_jam', canvas);
    }

    // 5. Warm Scone (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0.2 * Math.PI, 0.8 * Math.PI, true);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(6, 6, 4, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(4, 9, 8, 2);

      scene.textures.addCanvas('item_scone', canvas);
    }

    // 6. Golden Acorn Crown (16x16) - Legendary Boss Item
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 6, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Gold Crown Base
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(3, 13);
      ctx.lineTo(13, 13);
      ctx.lineTo(14, 6);
      ctx.lineTo(11, 9);
      ctx.lineTo(8, 4);
      ctx.lineTo(5, 9);
      ctx.lineTo(2, 6);
      ctx.closePath();
      ctx.fill();

      // Highlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(4, 11, 8, 2);
      ctx.fillRect(7, 5, 2, 2);

      // Red ruby gem
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(7, 9, 2, 2);

      scene.textures.addCanvas('item_crown', canvas);
    }

    // 7. Lost Postal Letter (16x16) - Quest Item
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Parchment envelope
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(3, 5, 10, 8);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(3.5, 5.5, 9, 7);

      // Flap lines
      ctx.beginPath();
      ctx.moveTo(3, 5);
      ctx.lineTo(8, 10);
      ctx.lineTo(13, 5);
      ctx.stroke();

      // Red wax seal
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(8, 9, 2, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('item_letter', canvas);
    }
  }

  private static createParticleTextures(scene: Phaser.Scene) {
    // 1. Leaf Flake (8x8)
    {
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(4, 4, 3, 2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(2, 4, 4, 1);
      scene.textures.addCanvas('particle_leaf', canvas);
    }

    // 2. Dust Puff (8x8)
    {
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('particle_dust', canvas);
    }

    // 3. Sparkle Star (8x8)
    {
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(3, 0, 2, 8);
      ctx.fillRect(0, 3, 8, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('particle_sparkle', canvas);
    }

    // 4. Soft Directional & Grounding Shadows
    {
      // Default Soft Shadow (24x12)
      const [canvas, ctx] = this.createCanvas(24, 12);
      const gradient = ctx.createRadialGradient(12, 6, 1, 12, 6, 11);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.40)');
      gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.18)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 24, 12);
      scene.textures.addCanvas('shadow_soft', canvas);
    }
    {
      // 45-degree Directional Ground Shadow (26x14) - skewed toward southeast (sun in northwest)
      const [canvas, ctx] = this.createCanvas(26, 14);
      const gradient = ctx.createRadialGradient(15, 8, 1, 14, 7, 12);
      gradient.addColorStop(0, 'rgba(10, 15, 30, 0.46)');
      gradient.addColorStop(0.65, 'rgba(10, 15, 30, 0.22)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(14, 7, 12, 6, 0.12, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('shadow_directional_45', canvas);
    }
    {
      // Small Entity Shadow (16x8) - for wildlife, pots, small drops
      const [canvas, ctx] = this.createCanvas(16, 8);
      const gradient = ctx.createRadialGradient(9, 4.5, 0.5, 8, 4, 7.5);
      gradient.addColorStop(0, 'rgba(10, 15, 30, 0.42)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(8, 4, 7, 3.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('shadow_small', canvas);
    }
    {
      // Boss / Giant Shadow (48x24) - Spore King Baron von Truffle
      const [canvas, ctx] = this.createCanvas(48, 24);
      const gradient = ctx.createRadialGradient(26, 13, 2, 24, 12, 23);
      gradient.addColorStop(0, 'rgba(10, 15, 30, 0.52)');
      gradient.addColorStop(0.7, 'rgba(10, 15, 30, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(24, 12, 22, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('shadow_boss', canvas);
    }

    // 5. Surface Reactive Particles
    {
      // Water Ripple Ring (16x16)
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(8, 8, 6.5, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      scene.textures.addCanvas('particle_ripple', canvas);
    }
    {
      // Dirt Puff (8x8)
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = 'rgba(180, 130, 80, 0.75)';
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(215, 165, 110, 0.5)';
      ctx.fillRect(3, 2, 2, 2);
      scene.textures.addCanvas('particle_dirt', canvas);
    }
    {
      // Stone Chip / Spark (6x6)
      const [canvas, ctx] = this.createCanvas(6, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(2, 2, 2, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(1, 2, 1, 2);
      ctx.fillRect(2, 3, 2, 1);
      scene.textures.addCanvas('particle_stone_spark', canvas);
    }
    {
      // Autumn Flake / Leaf Kick (8x8)
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(4, 4, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('particle_leaf_autumn', canvas);
    }
    {
      // Curved Slash Arc Ribbon (64x64)
      const [canvas, ctx] = this.createCanvas(64, 64);
      ctx.translate(32, 32);
      ctx.beginPath();
      ctx.arc(0, 0, 28, -Math.PI * 0.75, Math.PI * 0.25, false);
      ctx.arc(0, 0, 16, Math.PI * 0.25, -Math.PI * 0.75, true);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 16, 0, 0, 28);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0.85)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28, -Math.PI * 0.5, Math.PI * 0.2, false);
      ctx.stroke();
      scene.textures.addCanvas('slash_arc', canvas);
    }
    {
      // Critical Strike Curved Slash Arc (64x64)
      const [canvas, ctx] = this.createCanvas(64, 64);
      ctx.translate(32, 32);
      ctx.beginPath();
      ctx.arc(0, 0, 30, -Math.PI * 0.8, Math.PI * 0.3, false);
      ctx.arc(0, 0, 14, Math.PI * 0.3, -Math.PI * 0.8, true);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 14, 0, 0, 30);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.8, 'rgba(245, 158, 11, 0.9)');
      grad.addColorStop(1, 'rgba(220, 38, 38, 0.6)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 30, -Math.PI * 0.6, Math.PI * 0.25, false);
      ctx.stroke();
      scene.textures.addCanvas('slash_arc_crit', canvas);
    }
    {
      // Dizzy Spinning Comic Star (16x16)
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(8, 6, 14, 8);
      ctx.quadraticCurveTo(8, 10, 8, 16);
      ctx.quadraticCurveTo(8, 10, 2, 8);
      ctx.quadraticCurveTo(8, 6, 8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.quadraticCurveTo(8, 6, 12, 8);
      ctx.quadraticCurveTo(8, 10, 8, 14);
      ctx.quadraticCurveTo(8, 10, 4, 8);
      ctx.quadraticCurveTo(8, 6, 8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);
      scene.textures.addCanvas('particle_dizzy_star', canvas);
    }
    {
      // Area Threat Telegraph Ring (80x80)
      const [canvas, ctx] = this.createCanvas(80, 80);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.beginPath();
      ctx.arc(40, 40, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(40, 40, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(40, 40, 26, 0, Math.PI * 2);
      ctx.stroke();
      scene.textures.addCanvas('telegraph_ring', canvas);
    }
    {
      // Impact Spark (16x16)
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 1, 2, 14);
      ctx.fillRect(1, 7, 14, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(5, 5, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 4, 4);
      scene.textures.addCanvas('impact_spark', canvas);
    }

    // 6. Light Glow (128x128)
    {
      const [canvas, ctx] = this.createCanvas(128, 128);
      const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      gradient.addColorStop(0.5, 'rgba(250, 204, 21, 0.12)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      scene.textures.addCanvas('light_glow', canvas);
    }
  }

  private static createEnemyTextures(scene: Phaser.Scene) {
    // 1. Sproutling (24x24) - Cute turnip creature
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(12, 21, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(12, 13, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(12, 15, 5, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(9, 11, 2, 3);
      ctx.fillRect(14, 11, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 11, 1, 1);
      ctx.fillRect(14, 11, 1, 1);

      ctx.fillStyle = '#fb7185';
      ctx.fillRect(7, 13, 2, 2);
      ctx.fillRect(16, 13, 2, 2);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(11, 4, 2, 3);
      ctx.beginPath();
      ctx.ellipse(9, 3, 3, 2, -0.4, 0, Math.PI * 2);
      ctx.ellipse(15, 3, 3, 2, 0.4, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('enemy_sproutling', canvas);
    }

    // 2. Grumble Shroom (28x28) - Grumpy toadstool
    {
      const [canvas, ctx] = this.createCanvas(28, 28);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(14, 25, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(10, 16, 8, 8);

      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(14, 14, 11, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, 7, 3, 3);
      ctx.fillRect(17, 8, 3, 3);
      ctx.fillRect(12, 4, 3, 2);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 18, 2, 2);
      ctx.fillRect(16, 18, 2, 2);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(9, 16, 3, 1.5);
      ctx.fillRect(16, 16, 3, 1.5);

      scene.textures.addCanvas('enemy_grumble', canvas);
    }

    // 3. Baron von Truffle (48x48) - The Majestic Truffle King Boss
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      // Soft Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(24, 43, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Royal Purple Velvet Cape
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(10, 24, 28, 16);
      ctx.fillStyle = '#f59e0b'; // Gold trim
      ctx.fillRect(10, 38, 28, 2);

      // Truffle Body / Stalk
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(14, 22, 20, 18);

      // Giant Royal Mushroom Cap
      ctx.fillStyle = '#701a75';
      ctx.beginPath();
      ctx.arc(24, 20, 19, Math.PI, 0, false);
      ctx.fill();

      // Cap rim
      ctx.fillStyle = '#a21caf';
      ctx.beginPath();
      ctx.ellipse(24, 20, 19, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cream Royal Polka Dots
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(14, 12, 3.5, 0, Math.PI * 2);
      ctx.arc(34, 12, 3.5, 0, Math.PI * 2);
      ctx.arc(24, 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Magnificent Golden Acorn Crown atop cap
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(17, 3);
      ctx.lineTo(31, 3);
      ctx.lineTo(33, -3);
      ctx.lineTo(28, 0);
      ctx.lineTo(24, -4);
      ctx.lineTo(20, 0);
      ctx.lineTo(15, -3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444'; // Crown ruby
      ctx.fillRect(23, 0, 2, 2);

      // Pompous Eyes & Eyebrows
      ctx.fillStyle = '#581c87';
      ctx.fillRect(16, 23, 4, 2);
      ctx.fillRect(28, 23, 4, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(17, 26, 3, 3);
      ctx.fillRect(28, 26, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 26, 1, 1);
      ctx.fillRect(29, 26, 1, 1);

      // Magnificent Mossy Mustache
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(20, 33, 6, 3, -0.2, 0, Math.PI * 2);
      ctx.ellipse(28, 33, 6, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('boss_baron', canvas);
    }

    // 4. Baron Hurt Flash (48x48)
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(24, 20, 19, Math.PI, 0, false);
      ctx.fill();
      ctx.fillRect(14, 22, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 26, 3, 3);
      ctx.fillRect(28, 26, 3, 3);
      scene.textures.addCanvas('boss_baron_hurt', canvas);
    }

    // 5. Boss Spore Projectile (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdf4ff';
      ctx.beginPath();
      ctx.arc(7, 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('boss_spore', canvas);
    }

    // 6. Boss Ground Stomp Shockwave Ring (48x48)
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(24, 24, 21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(24, 24, 18, 0, Math.PI * 2);
      ctx.stroke();
      scene.textures.addCanvas('shockwave_ring', canvas);
    }
  }

  private static createNPCTextures(scene: Phaser.Scene) {
    // 1. Barnaby the Pelican (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // White body & blue postal coat
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, 10, 12, 14);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(9, 14, 14, 8); // uniform
      // Leather satchel
      ctx.fillStyle = '#78350f';
      ctx.fillRect(12, 17, 8, 5);

      // Huge yellow beak
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(12, 8, 8, 5);
      ctx.fillRect(14, 13, 4, 3);
      // Eyes & blue postal cap
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(13, 7, 2, 2);
      ctx.fillRect(17, 7, 2, 2);
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(11, 4, 10, 3);

      scene.textures.addCanvas('npc_barnaby', canvas);
    }

    // 2. Grandma Bramble (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lilac dress & white apron with blackberry stain
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(10, 12, 12, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(12, 16, 8, 10);
      ctx.fillStyle = '#581c87'; // blackberry jam stain!
      ctx.fillRect(15, 19, 3, 3);

      // Head & grey hair bun
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(12, 8, 8, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(11, 4, 10, 5);
      ctx.fillRect(13, 2, 6, 3);

      // Round spectacles
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(12.5, 9.5, 3, 3);
      ctx.strokeRect(16.5, 9.5, 3, 3);

      scene.textures.addCanvas('npc_grandma', canvas);
    }

    // 3. Sir Reginald the Rooster (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // White/golden rooster body
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, 8, 8, 10);
      // Red crest & wattle
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(10, 3, 4, 4);
      ctx.fillRect(12, 13, 2, 3);
      // Yellow beak & Monocle
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(14, 9, 3, 2);
      ctx.fillStyle = '#38bdf8'; // monocle shine
      ctx.fillRect(11, 8, 2, 2);
      ctx.strokeStyle = '#eab308'; // gold wire
      ctx.strokeRect(10.5, 7.5, 3, 3);

      scene.textures.addCanvas('npc_rooster', canvas);
    }

    // 4. Buster the Village Pup (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden retriever puppy body
      ctx.fillStyle = '#d97706';
      ctx.fillRect(6, 10, 12, 9);
      // Floppy ears & head
      ctx.fillStyle = '#b45309';
      ctx.fillRect(5, 7, 4, 6);
      ctx.fillRect(15, 7, 4, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 6, 8, 7);
      // Cute black snoot & tongue
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(11, 10, 2, 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(11, 12, 2, 2);

      scene.textures.addCanvas('wildlife_dog', canvas);
    }

    // 5. Duck (20x20)
    {
      const [canvas, ctx] = this.createCanvas(20, 20);
      ctx.fillStyle = '#047857'; // Mallard green head
      ctx.fillRect(6, 4, 6, 5);
      ctx.fillStyle = '#f59e0b'; // beak
      ctx.fillRect(12, 6, 3, 2);
      ctx.fillStyle = '#78350f'; // body
      ctx.fillRect(3, 8, 10, 6);
      scene.textures.addCanvas('wildlife_duck', canvas);
    }
  }

  private static createEmoteTextures(scene: Phaser.Scene) {
    const list: Array<{ name: string; draw: (ctx: CanvasRenderingContext2D) => void }> = [
      {
        name: 'heart',
        draw: (ctx) => {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(10, 5);
          ctx.bezierCurveTo(10, 2, 6, 2, 5, 5);
          ctx.bezierCurveTo(3, 9, 10, 15, 10, 16);
          ctx.bezierCurveTo(10, 15, 17, 9, 15, 5);
          ctx.bezierCurveTo(14, 2, 10, 2, 10, 5);
          ctx.fill();
        }
      },
      {
        name: 'exclamation',
        draw: (ctx) => {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(8, 3, 4, 9);
          ctx.fillRect(8, 14, 4, 3);
        }
      },
      {
        name: 'question',
        draw: (ctx) => {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('?', 5, 15);
        }
      },
      {
        name: 'music',
        draw: (ctx) => {
          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText('♪', 5, 15);
        }
      },
      {
        name: 'sweat',
        draw: (ctx) => {
          ctx.fillStyle = '#67e8f9';
          ctx.beginPath();
          ctx.moveTo(10, 3);
          ctx.lineTo(6, 12);
          ctx.arc(10, 12, 4, Math.PI, 0);
          ctx.fill();
        }
      },
      {
        name: 'wave',
        draw: (ctx) => {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '14px sans-serif';
          ctx.fillText('👋', 2, 15);
        }
      },
      {
        name: 'laugh',
        draw: (ctx) => {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '14px sans-serif';
          ctx.fillText('😄', 2, 15);
        }
      }
    ];

    list.forEach(item => {
      const [canvas, ctx] = this.createCanvas(20, 20);
      item.draw(ctx);
      scene.textures.addCanvas(`emote_${item.name}`, canvas);
    });
  }

  private static createPortraitTextures(scene: Phaser.Scene) {
    const characters = ['pelican', 'grandma', 'rooster', 'dog', 'baron', 'sign', 'default'];
    const moods = ['default', 'happy', 'surprised', 'smug'];

    characters.forEach(p => {
      moods.forEach(mood => {
        const [canvas, ctx] = this.createCanvas(64, 64);
        // Cozy retro dialogue frame border
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#362f2d';
        ctx.fillRect(3, 3, 58, 58);

        if (p === 'pelican') {
          // Body & Coat
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(16, 20, 32, 34);
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(14, 38, 36, 16);
          // Sailor Cap
          ctx.fillStyle = '#1e40af';
          ctx.fillRect(18, mood === 'surprised' ? 9 : 12, 28, 10);
          ctx.fillStyle = '#facc15'; // cap badge
          ctx.fillRect(30, mood === 'surprised' ? 12 : 15, 4, 4);

          // Beak & Expression
          ctx.fillStyle = '#f59e0b';
          if (mood === 'happy') {
            ctx.fillRect(20, 28, 28, 14);
            ctx.fillStyle = '#ea580c'; // open beak slit
            ctx.fillRect(24, 34, 20, 4);
            ctx.fillStyle = '#f43f5e'; // tongue
            ctx.fillRect(28, 36, 6, 2);
            // Joyful curved eye
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(26, 24, 4, Math.PI, 0, false);
            ctx.stroke();
          } else if (mood === 'surprised') {
            ctx.fillRect(20, 30, 26, 16); // agape beak
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(26, 36, 8, 6);
            // Wide startled eye
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(22, 20, 8, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(25, 23, 3, 3);
            // Sweat drop
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(44, 18, 4, 6);
          } else if (mood === 'smug') {
            ctx.fillRect(20, 25, 30, 12);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 23, 6, 2); // squinting confident eye
            // Gleam sparkle
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(46, 22, 2, 6);
            ctx.fillRect(44, 24, 6, 2);
          } else {
            // Default
            ctx.fillRect(20, 26, 28, 14);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 22, 4, 4);
          }
        } else if (p === 'grandma') {
          // Face & Hair Bun
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(20, 20, 24, 26);
          ctx.fillStyle = '#94a3b8'; // hair bun
          ctx.fillRect(16, 10, 32, 14);
          ctx.fillRect(24, 4, 16, 8);
          // Purple Dress
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(14, 44, 36, 16);

          // Glasses
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 2;
          ctx.strokeRect(22, 26, 8, 8);
          ctx.strokeRect(34, 26, 8, 8);
          ctx.fillStyle = '#581c87'; // jam smudge on cheek
          ctx.fillRect(38, 38, 4, 4);

          if (mood === 'happy') {
            // Blushing pink cheeks
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(20, 34, 4, 3);
            ctx.fillRect(40, 34, 4, 3);
            // Sweet smile
            ctx.fillStyle = '#be185d';
            ctx.fillRect(28, 40, 8, 3);
          } else if (mood === 'surprised') {
            // Raised eyebrows
            ctx.fillStyle = '#64748b';
            ctx.fillRect(22, 22, 8, 2);
            ctx.fillRect(34, 22, 8, 2);
            // Little round mouth
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(30, 39, 4, 4);
          } else if (mood === 'smug') {
            // Knowing wink
            ctx.fillStyle = '#475569';
            ctx.fillRect(24, 30, 4, 2);
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(40, 34, 4, 3);
            // Smirk
            ctx.fillStyle = '#7c2d12';
            ctx.fillRect(29, 40, 8, 2);
            ctx.fillRect(35, 38, 2, 2);
          } else {
            // Default mouth
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(29, 40, 6, 2);
          }
        } else if (p === 'rooster') {
          // Feathers & Crest
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(18, 20, 28, 32);
          ctx.fillStyle = '#dc2626'; // crest
          ctx.fillRect(24, mood === 'surprised' ? 4 : 8, 16, mood === 'surprised' ? 18 : 14);

          // Monocle
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2;
          if (mood === 'surprised') {
            // Monocle flew off eye!
            ctx.strokeRect(20, 16, 8, 8);
            ctx.beginPath();
            ctx.moveTo(28, 22);
            ctx.lineTo(34, 28);
            ctx.stroke();
            // Startled wide eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(28, 24, 6, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(30, 26, 2, 2);
          } else {
            ctx.strokeRect(26, 24, 8, 8);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(28, 26, 4, 4);
          }

          // Beak
          ctx.fillStyle = '#ea580c';
          if (mood === 'happy') {
            ctx.fillRect(36, 28, 16, 10);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(40, 34, 8, 3);
          } else if (mood === 'smug') {
            ctx.fillRect(36, 26, 18, 7); // tilted upwards
            ctx.fillStyle = '#ffffff'; // monocle glint
            ctx.fillRect(27, 25, 2, 2);
          } else {
            ctx.fillRect(36, 28, 16, 8);
          }
        } else if (p === 'dog') {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(16, 16, 32, 34);
          ctx.fillStyle = '#b45309'; // floppy ears
          if (mood === 'surprised') {
            // Perked upright ears!
            ctx.fillRect(14, 6, 8, 18);
            ctx.fillRect(42, 6, 8, 18);
          } else {
            ctx.fillRect(10, 18, 8, 20);
            ctx.fillRect(46, 18, 8, 20);
          }

          // Eyes & Nose
          ctx.fillStyle = '#0f172a';
          if (mood === 'happy') {
            // Happy closed eyes
            ctx.fillRect(22, 26, 6, 2);
            ctx.fillRect(36, 26, 6, 2);
            ctx.fillRect(28, 36, 8, 6); // nose
            ctx.fillStyle = '#f43f5e'; // big tongue
            ctx.fillRect(28, 42, 10, 8);
          } else if (mood === 'surprised') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(20, 24, 8, 8);
            ctx.fillRect(36, 24, 8, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(23, 27, 3, 3);
            ctx.fillRect(39, 27, 3, 3);
            ctx.fillRect(28, 36, 8, 6);
          } else if (mood === 'smug') {
            // Cool squint
            ctx.fillRect(22, 26, 6, 3);
            ctx.fillRect(36, 26, 6, 3);
            ctx.fillRect(28, 36, 8, 6);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(34, 41, 4, 4); // cheeky side tongue
          } else {
            ctx.fillRect(22, 26, 4, 4);
            ctx.fillRect(38, 26, 4, 4);
            ctx.fillRect(28, 36, 8, 6);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(30, 42, 6, 6);
          }
        } else if (p === 'baron') {
          // Royal Mushroom Cap
          ctx.fillStyle = '#701a75';
          ctx.beginPath();
          ctx.arc(32, 28, 24, Math.PI, 0, false);
          ctx.fill();
          ctx.fillStyle = '#a21caf';
          ctx.beginPath();
          ctx.ellipse(32, 28, 24, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Acorn Crown
          ctx.fillStyle = '#eab308';
          const crownTilt = mood === 'surprised' ? -4 : 0;
          ctx.beginPath();
          ctx.moveTo(22 + crownTilt, 8);
          ctx.lineTo(42 + crownTilt, 8);
          ctx.lineTo(44 + crownTilt, 1);
          ctx.lineTo(37 + crownTilt, 5);
          ctx.lineTo(32 + crownTilt, 0);
          ctx.lineTo(27 + crownTilt, 5);
          ctx.lineTo(20 + crownTilt, 1);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(31 + crownTilt, 3, 2, 2);

          // Stalk Face
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(20, 32, 24, 22);

          // Eyes
          if (mood === 'happy') {
            // Sinister jolly grin
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 35, 5, 2);
            ctx.fillRect(35, 35, 5, 2);
          } else if (mood === 'surprised') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(22, 34, 7, 7);
            ctx.fillRect(35, 34, 7, 7);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 36, 3, 3);
            ctx.fillRect(37, 36, 3, 3);
          } else if (mood === 'smug') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 36, 5, 2);
            ctx.fillRect(35, 36, 5, 2);
            ctx.fillStyle = '#fbbf24'; // gleaming eye
            ctx.fillRect(25, 35, 2, 2);
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 36, 4, 4);
            ctx.fillRect(36, 36, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(25, 36, 2, 2);
            ctx.fillRect(37, 36, 2, 2);
          }

          // Mossy Mustache
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          const mustacheAngle = mood === 'smug' ? 0.35 : (mood === 'surprised' ? -0.3 : 0.2);
          ctx.ellipse(26, 46, 8, 4, -mustacheAngle, 0, Math.PI * 2);
          ctx.ellipse(38, 46, 8, 4, mustacheAngle, 0, Math.PI * 2);
          ctx.fill();
        } else if (p === 'sign') {
          ctx.fillStyle = '#b08b59';
          ctx.fillRect(12, 12, 40, 40);
          ctx.fillStyle = '#3d2511';
          ctx.fillRect(16, 18, 32, 3);
          ctx.fillRect(16, 26, 26, 3);
          ctx.fillRect(16, 34, 30, 3);
          ctx.fillRect(16, 42, 18, 3);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(20, 20, 24, 24);
        }

        scene.textures.addCanvas(`portrait_${p}_${mood}`, canvas);
        if (mood === 'default') {
          scene.textures.addCanvas(`portrait_${p}`, canvas);
        }
      });
    });
  }
}
