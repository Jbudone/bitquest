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
    this.createDecalTextures(scene);
    this.createSpellTextures(scene);
    this.createEquipmentAndVanityTextures(scene);
    this.createCatacombsTextures(scene);
    this.createFarmingTextures(scene);
    this.createCookingTextures(scene);
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

    // 12. Wildflowers & Tall Grass Tufts (16x16)
    {
      // Red Wildflower
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(7, 8, 2, 7);
      ctx.fillRect(5, 11, 2, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(6, 4, 4, 4);
      ctx.fillRect(4, 5, 2, 2);
      ctx.fillRect(10, 5, 2, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(7, 5, 2, 2);
      scene.textures.addCanvas('prop_flower_red', canvas);
    }
    {
      // Blue Bellflower
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(7, 8, 2, 7);
      ctx.fillRect(9, 10, 2, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(6, 4, 4, 4);
      ctx.fillRect(5, 3, 2, 2);
      ctx.fillRect(9, 3, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 5, 2, 2);
      scene.textures.addCanvas('prop_flower_blue', canvas);
    }
    {
      // Golden Marigold
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(7, 8, 2, 7);
      ctx.fillRect(5, 11, 2, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 4, 6, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(7, 5, 2, 2);
      scene.textures.addCanvas('prop_flower_yellow', canvas);
    }
    {
      // Tall Grass Tuft
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(7, 5, 2, 10);
      ctx.fillRect(8, 3, 1, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(4, 8, 2, 7);
      ctx.fillRect(3, 6, 2, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(10, 7, 2, 8);
      ctx.fillRect(11, 5, 2, 3);
      scene.textures.addCanvas('prop_grass_tuft', canvas);
    }

    // 13. Cliff Ledge Elevation Lip (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Top upper grass elevation
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, 32, 14);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, 32, 6);
      // Grassy fringe overhang blades
      ctx.fillStyle = '#16a34a';
      for (let x = 0; x < 32; x += 4) {
        ctx.fillRect(x, 12, 2, 4);
      }
      // Exposed rocky cliff face strata
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 16, 32, 16);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 22, 32, 10);
      // Crisp stone ledge lip highlight
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 15, 32, 2);
      // Dark bottom ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 29, 32, 3);
      scene.textures.addCanvas('tile_cliff_ledge', canvas);
    }

    // 14. Bottomless Pit / Void Chasm (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Dark deep bottomless void
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, 32, 32);
      // Cracked abyss rim
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 2, 28, 4);
      ctx.fillRect(2, 2, 4, 28);
      // Faint ethereal depth glow in center
      const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 14);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#050508');
      ctx.fillStyle = grad;
      ctx.fillRect(4, 4, 24, 24);
      scene.textures.addCanvas('tile_pit_void', canvas);
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

    // 6b. Heavy Pushable Ancient Stone Block (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Dark border & base shadow
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1, 1, 30, 30);
      // Main ancient carved stone body
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, 2, 28, 28);
      // Top bevel highlight
      ctx.fillStyle = '#64748b';
      ctx.fillRect(2, 2, 28, 4);
      ctx.fillRect(2, 2, 4, 28);
      // Bottom bevel shadow
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, 26, 28, 4);
      ctx.fillRect(26, 2, 4, 28);
      // Inner ancient geometric carved glyph (diamond & sun cross)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(14, 10, 4, 12);
      ctx.fillRect(10, 14, 12, 4);
      ctx.fillStyle = '#fde047'; // ancient golden inlaid gem in center
      ctx.fillRect(14, 14, 4, 4);
      scene.textures.addCanvas('ent_block_stone', canvas);
    }

    // 6c. Mechanical Pull-Lever - Up (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Stone/Iron Mount Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 20, 16, 9);
      ctx.fillStyle = '#475569';
      ctx.fillRect(9, 21, 14, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(9, 28, 14, 1);

      // Pivot Bracket Hub
      ctx.fillStyle = '#92400e';
      ctx.fillRect(13, 19, 6, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(14, 20, 4, 3);

      // Angled Brass Shaft (Up-Left)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(15, 20);
      ctx.lineTo(9, 8);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, 20);
      ctx.lineTo(9, 8);
      ctx.stroke();

      // Ruby Spherical Knob
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(8, 7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(7, 6, 2, 0, Math.PI * 2);
      ctx.fill();

      // Unlit indicator diode
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(15, 24, 2, 2);

      scene.textures.addCanvas('prop_lever_up', canvas);
    }

    // 6c. Mechanical Pull-Lever - Down (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Stone/Iron Mount Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 20, 16, 9);
      ctx.fillStyle = '#475569';
      ctx.fillRect(9, 21, 14, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(9, 28, 14, 1);

      // Pivot Bracket Hub
      ctx.fillStyle = '#92400e';
      ctx.fillRect(13, 19, 6, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(14, 20, 4, 3);

      // Angled Brass Shaft (Down-Right)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(15, 20);
      ctx.lineTo(23, 23);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, 20);
      ctx.lineTo(23, 23);
      ctx.stroke();

      // Ruby Spherical Knob
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(24, 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(23, 23, 2, 0, Math.PI * 2);
      ctx.fill();

      // Lit Green Glowing Indicator Diode
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(14, 24, 4, 3);
      ctx.fillStyle = '#bbf7d0';
      ctx.fillRect(15, 25, 2, 1);

      scene.textures.addCanvas('prop_lever_down', canvas);
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
    {
      // Particle Heart (14x14) - For cozy social resonance
      const [canvas, ctx] = this.createCanvas(14, 14);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(7, 12);
      ctx.bezierCurveTo(2, 8, 1, 4, 3, 2);
      ctx.bezierCurveTo(5, 0, 7, 3, 7, 3);
      ctx.bezierCurveTo(7, 3, 9, 0, 11, 2);
      ctx.bezierCurveTo(13, 4, 12, 8, 7, 12);
      ctx.fill();
      // Highlight shine
      ctx.fillStyle = '#ffe4e6';
      ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('particle_heart', canvas);
    }
    {
      // Particle Sparkle Gold (16x16) - 4-pointed radiant star
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(8, 8, 16, 8);
      ctx.quadraticCurveTo(8, 8, 8, 16);
      ctx.quadraticCurveTo(8, 8, 0, 8);
      ctx.quadraticCurveTo(8, 8, 8, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 4, 4);
      scene.textures.addCanvas('particle_sparkle_gold', canvas);
    }
    {
      // Dandelion Seed (12x12) - Drifts in Whispering Meadow
      const [canvas, ctx] = this.createCanvas(12, 12);
      // Feathery white plume
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(2, 2);
      ctx.moveTo(6, 6);
      ctx.lineTo(6, 1);
      ctx.moveTo(6, 6);
      ctx.lineTo(10, 2);
      ctx.moveTo(6, 6);
      ctx.lineTo(6, 9);
      ctx.stroke();
      // Fluff dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(2, 1, 2, 2);
      ctx.fillRect(5, 0, 2, 2);
      ctx.fillRect(9, 1, 2, 2);
      // Tiny brown seed pod
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, 9, 2, 3);
      scene.textures.addCanvas('particle_dandelion', canvas);
    }
    {
      // Glowing Spore Mote (10x10) - Drifts in Fungal Hollow
      const [canvas, ctx] = this.createCanvas(10, 10);
      const gradient = ctx.createRadialGradient(5, 5, 1, 5, 5, 5);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#38bdf8');
      gradient.addColorStop(0.7, '#a855f7');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 10, 10);
      scene.textures.addCanvas('particle_spore_mote', canvas);
    }
    {
      // Golden Pollen Mote (6x6) - Drifts in Town & Gardens
      const [canvas, ctx] = this.createCanvas(6, 6);
      const gradient = ctx.createRadialGradient(3, 3, 0.5, 3, 3, 3);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#fde047');
      gradient.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 6, 6);
      scene.textures.addCanvas('particle_pollen', canvas);
    }
    {
      // Ancient Ruins Mote (8x8) - Drifts in Ruins Sanctuary
      const [canvas, ctx] = this.createCanvas(8, 8);
      const gradient = ctx.createRadialGradient(4, 4, 1, 4, 4, 4);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#c084fc');
      gradient.addColorStop(1, 'rgba(129, 140, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 8, 8);
      scene.textures.addCanvas('particle_ruins_mote', canvas);
    }
    {
      // Sleepy Zzz Particle (12x12)
      const [canvas, ctx] = this.createCanvas(12, 12);
      ctx.fillStyle = '#93c5fd';
      // Draw crisp pixel Z
      ctx.fillRect(3, 2, 6, 2);
      ctx.fillRect(7, 4, 2, 2);
      ctx.fillRect(5, 6, 2, 2);
      ctx.fillRect(3, 8, 6, 2);
      scene.textures.addCanvas('particle_zzz', canvas);
    }

    // 5b. Confused Question Mark Particle (14x14)
    {
      const [canvas, ctx] = this.createCanvas(14, 14);
      // Dark outline / shadow
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(3, 1, 8, 4);
      ctx.fillRect(8, 4, 4, 3);
      ctx.fillRect(5, 6, 4, 3);
      ctx.fillRect(5, 10, 4, 3);
      // Crisp pixel art question mark
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(4, 2, 6, 2);
      ctx.fillRect(8, 3, 3, 3);
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(6, 10, 2, 2);
      scene.textures.addCanvas('particle_question', canvas);
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

    // 3b. Finn the Otter Angler (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Sleek warm brown otter body
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 8, 8, 11);
      // Cream belly & throat patch
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(10, 10, 4, 7);
      // Head & snout
      ctx.fillStyle = '#92400e';
      ctx.fillRect(9, 6, 6, 5);
      // Black nose & eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(11, 8, 2, 2);
      ctx.fillRect(9, 7, 1, 1);
      ctx.fillRect(14, 7, 1, 1);
      // Blue fisherman's knit beanie cap
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, 3, 8, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(11, 1, 2, 2); // pom-pom
      // Bamboo fishing rod held in paw
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(17, 16);
      ctx.lineTo(21, 2);
      ctx.stroke();

      scene.textures.addCanvas('npc_otter', canvas);
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
      scene.textures.addCanvas('wildlife_dog_idle', canvas);
    }
    {
      // Buster Sniffing the Ground (24x24)
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body tilted forward
      ctx.fillStyle = '#d97706';
      ctx.fillRect(4, 11, 12, 8);
      // Head lowered to ground sniffing
      ctx.fillStyle = '#b45309';
      ctx.fillRect(15, 12, 4, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(14, 13, 7, 6);
      // Black nose right against the ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 17, 2, 2);
      // Happy wagging tail pointed up
      ctx.fillStyle = '#b45309';
      ctx.fillRect(3, 7, 3, 5);

      scene.textures.addCanvas('wildlife_dog_sniff', canvas);
    }
    {
      // Buster Napping Curled Up (24x24)
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 19, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curled round resting body
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(12, 14, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Floppy ear folded over
      ctx.fillStyle = '#b45309';
      ctx.fillRect(7, 11, 4, 5);
      // Peaceful closed eyes (^_^)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(12, 13, 2, 1);
      ctx.fillRect(15, 13, 2, 1);
      // Curled tail tucked in
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(4, 13, 3, 3);

      scene.textures.addCanvas('wildlife_dog_nap', canvas);
    }
    {
      // Buster Alert Barking (24x24)
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body upright and braced
      ctx.fillStyle = '#d97706';
      ctx.fillRect(5, 10, 11, 8);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(11, 10, 5, 6);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(6, 17, 3, 4);
      ctx.fillRect(13, 17, 3, 4);
      // Head raised high barking
      ctx.fillStyle = '#d97706';
      ctx.fillRect(11, 3, 9, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(12, 4, 7, 6);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(12, 1, 3, 4);
      ctx.fillRect(16, 1, 3, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(14, 5, 2, 2);
      // Open barking mouth with pink tongue
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(18, 7, 4, 3);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(19, 8, 2, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(3, 5, 3, 6);

      scene.textures.addCanvas('wildlife_dog_alert', canvas);
      scene.textures.addCanvas('wildlife_dog_bark', canvas);
    }
    {
      // Barnaby's Boghopper Giant Moss Frog - Idle (28x24)
      const [canvas, ctx] = this.createCanvas(28, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(14, 21, 11, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Muscular folded hind legs
      ctx.fillStyle = '#14532d';
      ctx.fillRect(3, 13, 6, 8);
      ctx.fillRect(19, 13, 6, 8);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(4, 14, 4, 6);
      ctx.fillRect(20, 14, 4, 6);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(2, 20, 4, 2);
      ctx.fillRect(22, 20, 4, 2);

      // Main plump frog body
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(14, 14, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Creamy pale throat
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.ellipse(14, 16, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Camouflage spots
      ctx.fillStyle = '#14532d';
      ctx.fillRect(9, 10, 2, 2);
      ctx.fillRect(17, 11, 2, 2);
      ctx.fillRect(12, 8, 3, 2);

      // Golden eyes with horizontal pupils
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(8, 6, 4, 0, Math.PI * 2);
      ctx.arc(20, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(8, 6, 2.5, 0, Math.PI * 2);
      ctx.arc(20, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 6, 4, 1.5);
      ctx.fillRect(18, 6, 4, 1.5);

      // Stitched leather riding saddle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, 10, 8, 6);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(11, 11, 6, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(13, 12, 2, 2);

      // Front hands
      ctx.fillStyle = '#15803d';
      ctx.fillRect(8, 19, 3, 3);
      ctx.fillRect(17, 19, 3, 3);

      scene.textures.addCanvas('mount_frog_mossy', canvas);
      scene.textures.addCanvas('mount_frog_mossy_idle', canvas);
    }
    {
      // Barnaby's Boghopper Giant Moss Frog - Leaping Hop (28x28)
      const [canvas, ctx] = this.createCanvas(28, 28);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(14, 26, 7, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Extended hind legs
      ctx.fillStyle = '#14532d';
      ctx.fillRect(6, 15, 3, 9);
      ctx.fillRect(19, 15, 3, 9);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(7, 16, 2, 8);
      ctx.fillRect(19, 16, 2, 8);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(5, 23, 4, 3);
      ctx.fillRect(19, 23, 4, 3);

      // Torso
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(14, 11, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Throat
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.ellipse(14, 12, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front limbs
      ctx.fillStyle = '#15803d';
      ctx.fillRect(6, 7, 3, 5);
      ctx.fillRect(19, 7, 3, 5);

      // Eyes
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(9, 4, 2.5, 0, Math.PI * 2);
      ctx.arc(19, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(7, 4, 4, 1.5);
      ctx.fillRect(17, 4, 4, 1.5);

      // Saddle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, 8, 8, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(13, 10, 2, 2);

      scene.textures.addCanvas('mount_frog_mossy_hop', canvas);
    }
    {
      // Scent Sparkle (12x12)
      const [canvas, ctx] = this.createCanvas(12, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 1, 2, 10);
      ctx.fillRect(1, 5, 10, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(4, 4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 5, 2, 2);

      scene.textures.addCanvas('prop_scent_sparkle', canvas);
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

    // 6. Pip the Badger Merchant (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Soft Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Badger Body & Fur (charcoal & slate grey)
      ctx.fillStyle = '#334155';
      ctx.fillRect(10, 14, 12, 13);
      // Paws
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(9, 25, 4, 3);
      ctx.fillRect(19, 25, 4, 3);

      // Emerald Green Merchant Vest & White Shirt
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(12, 14, 8, 11);
      ctx.fillStyle = '#059669'; // Emerald vest panels
      ctx.fillRect(10, 15, 3, 10);
      ctx.fillRect(19, 15, 3, 10);
      // Brass buttons
      ctx.fillStyle = '#facc15';
      ctx.fillRect(15, 17, 2, 2);
      ctx.fillRect(15, 21, 2, 2);

      // Leather Coin Pouch Belt
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, 23, 12, 2);
      ctx.fillStyle = '#b45309'; // pouch
      ctx.fillRect(18, 22, 4, 4);
      ctx.fillStyle = '#fde047'; // gleaming gold coin in pouch
      ctx.fillRect(19, 23, 2, 2);

      // Badger Head & Iconic Facial Stripes (black/white)
      ctx.fillStyle = '#f8fafc'; // White base head
      ctx.fillRect(10, 6, 12, 8);
      ctx.fillStyle = '#0f172a'; // Bold lateral black stripes
      ctx.fillRect(10, 7, 3, 7);
      ctx.fillRect(19, 7, 3, 7);
      ctx.fillRect(12, 6, 8, 2); // Forehead stripe
      // Cute Badger Snout & Nose
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(14, 10, 4, 4);
      ctx.fillStyle = '#0f172a'; // black nose
      ctx.fillRect(15, 12, 2, 2);
      // Sparking eyes
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(12, 9, 2, 2);
      ctx.fillRect(18, 9, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 9, 1, 1);
      ctx.fillRect(18, 9, 1, 1);

      // Flamboyant Merchant's Feather Cap
      ctx.fillStyle = '#047857';
      ctx.fillRect(9, 4, 14, 3);
      ctx.fillRect(11, 2, 10, 2);
      // Iridescent red-gold pheasant feather
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(20, 0, 2, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(21, 1, 2, 3);

      scene.textures.addCanvas('npc_pip', canvas);
    }

    // 7. Corvus the Wandering Nomad (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Soft Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Midnight Dusky Cloak & Cowl
      ctx.fillStyle = '#1e1b4b'; // Deep indigo cloak
      ctx.fillRect(10, 12, 12, 15);
      ctx.fillStyle = '#312e81'; // Cloak folds
      ctx.fillRect(12, 14, 8, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(9, 24, 4, 4);
      ctx.fillRect(19, 24, 4, 4);

      // Traveler's Heavy Backpack
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, 12, 4, 11);
      ctx.fillStyle = '#b45309'; // Rolled bedroll on top
      ctx.fillRect(5, 9, 6, 3);
      // Straps
      ctx.fillStyle = '#a16207';
      ctx.fillRect(10, 14, 2, 7);

      // Nomad Cowl & Raven Mask
      ctx.fillStyle = '#1e1b4b'; // Hood
      ctx.fillRect(10, 4, 12, 9);
      ctx.fillStyle = '#0f172a'; // Shaded face cavity
      ctx.fillRect(12, 6, 8, 6);
      // Raven Beak
      ctx.fillStyle = '#334155';
      ctx.fillRect(14, 9, 4, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(15, 12, 2, 2);

      // Glowing Amber Eyes under cowl
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(13, 7, 2, 2);
      ctx.fillRect(17, 7, 2, 2);

      // Hanging Brass Travel Lantern
      ctx.fillStyle = '#78350f'; // cord
      ctx.fillRect(22, 16, 1, 4);
      ctx.fillStyle = '#854d0e'; // lantern cap
      ctx.fillRect(21, 20, 3, 1);
      ctx.fillStyle = '#fde047'; // glowing glass
      ctx.fillRect(21, 21, 3, 4);
      ctx.fillStyle = '#854d0e'; // base
      ctx.fillRect(21, 25, 3, 1);

      scene.textures.addCanvas('npc_corvus', canvas);
    }

    // 8. Cozy Merchant Stall / Cart Prop (48x36)
    {
      const [canvas, ctx] = this.createCanvas(48, 36);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(24, 32, 20, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Cart Base
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 16, 32, 12);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(10, 18, 28, 8);

      // Wooden Spoke Wheels
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(12, 28, 6, 0, Math.PI * 2);
      ctx.arc(36, 28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(12, 28, 3, 0, Math.PI * 2);
      ctx.arc(36, 28, 3, 0, Math.PI * 2);
      ctx.fill();

      // Display Bottles & Curios on Counter
      ctx.fillStyle = '#ef4444'; // Red potion
      ctx.fillRect(12, 12, 4, 5);
      ctx.fillStyle = '#3b82f6'; // Blue mana flask
      ctx.fillRect(18, 11, 4, 6);
      ctx.fillStyle = '#10b981'; // Green elixir
      ctx.fillRect(24, 13, 3, 4);
      ctx.fillStyle = '#f59e0b'; // Gold lockbox
      ctx.fillRect(29, 12, 7, 5);

      // Canopy Posts
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 2, 2, 14);
      ctx.fillRect(38, 2, 2, 14);

      // Striped Red & Cream Awning Canopy
      const stripeWidth = 6;
      for (let x = 6; x < 42; x += stripeWidth) {
        ctx.fillStyle = (Math.floor(x / stripeWidth) % 2 === 0) ? '#dc2626' : '#f8fafc';
        ctx.fillRect(x, 2, stripeWidth, 8);
        // Scalloped bottom edge
        ctx.beginPath();
        ctx.arc(x + stripeWidth / 2, 10, stripeWidth / 2, 0, Math.PI);
        ctx.fill();
      }

      scene.textures.addCanvas('prop_merchant_cart', canvas);
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

  private static createDecalTextures(scene: Phaser.Scene) {
    // 1. Ceramic Pot Shard Decal (12x12)
    {
      const [canvas, ctx] = this.createCanvas(12, 12);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(2, 4, 8, 5);
      ctx.fillRect(4, 2, 4, 8);
      // Highlights & cracked edge
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(3, 4, 3, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(7, 6, 2, 2);
      scene.textures.addCanvas('decal_pot_shard', canvas);
    }

    // 2. Leaf Clipping Decal (12x12)
    {
      const [canvas, ctx] = this.createCanvas(12, 12);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(2, 5, 4, 3);
      ctx.fillRect(5, 3, 3, 4);
      ctx.fillRect(7, 6, 3, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(3, 5, 2, 1);
      ctx.fillRect(6, 4, 1, 2);
      scene.textures.addCanvas('decal_leaf_clipping', canvas);
    }

    // 3. Muddy Footprint Track (10x10)
    {
      const [canvas, ctx] = this.createCanvas(10, 10);
      ctx.fillStyle = 'rgba(67, 40, 24, 0.45)';
      ctx.beginPath();
      ctx.ellipse(5, 4, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, 8, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('decal_footprint_mud', canvas);
    }

    // 4. Slime Splatter Decal (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(2, 6, 2, 2);
      ctx.fillRect(12, 5, 2, 2);
      ctx.fillRect(7, 13, 2, 2);
      ctx.fillRect(5, 2, 2, 2);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(6, 6, 3, 2);
      scene.textures.addCanvas('decal_slime_splatter', canvas);
    }
  }

  private static createSpellTextures(scene: Phaser.Scene) {
    // 1. Fireball Projectile (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      // Fiery outer glow
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      // Mid fire mantle
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      // Hot yellow core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(7, 7, 3, 0, Math.PI * 2);
      ctx.fill();
      // Center white speck
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 2, 2);
      scene.textures.addCanvas('proj_fireball', canvas);
    }

    // 2. Ice Lance Projectile (16x16, pointing right)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      // Sharp crystalline diamond dart
      ctx.fillStyle = '#0284c7'; // dark frost border
      ctx.beginPath();
      ctx.moveTo(15, 8);
      ctx.lineTo(6, 3);
      ctx.lineTo(1, 8);
      ctx.lineTo(6, 13);
      ctx.closePath();
      ctx.fill();

      // Gleaming cyan body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(14, 8);
      ctx.lineTo(7, 4);
      ctx.lineTo(3, 8);
      ctx.lineTo(7, 12);
      ctx.closePath();
      ctx.fill();

      // Sharp white highlight ridge
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.moveTo(13, 8);
      ctx.lineTo(7, 6);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();
      scene.textures.addCanvas('proj_ice_lance', canvas);
    }

    // 3. Gale Ward Vortex VFX (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.lineWidth = 2.5;
      // Outer wind arc
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.beginPath();
      ctx.arc(16, 16, 13, 0.2, Math.PI * 1.3);
      ctx.stroke();

      // Inner wind arc
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.85)';
      ctx.beginPath();
      ctx.arc(16, 16, 8, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();

      // Autumn leaf swirl motes
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 6, 3, 2);
      ctx.fillRect(23, 20, 2, 3);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(22, 9, 3, 2);
      ctx.fillRect(7, 22, 2, 3);
      scene.textures.addCanvas('vfx_gale_ward', canvas);
    }

    // 4. Burning Flame Status Overlay (10x10)
    {
      const [canvas, ctx] = this.createCanvas(10, 10);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(3, 4, 4, 5);
      ctx.fillRect(4, 2, 2, 3);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(3, 5, 4, 3);
      ctx.fillRect(4, 3, 2, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(4, 6, 2, 2);
      scene.textures.addCanvas('vfx_burn_flame', canvas);
    }

    // 5. Ice Shard Freeze Status Overlay (10x10)
    {
      const [canvas, ctx] = this.createCanvas(10, 10);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(4, 1, 2, 8);
      ctx.fillRect(1, 4, 8, 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(3, 3, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 2, 2);
      scene.textures.addCanvas('vfx_ice_shard', canvas);
    }

    // 6. Stun Dizzy Star Overlay (12x12)
    {
      const [canvas, ctx] = this.createCanvas(12, 12);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(5, 0, 2, 12);
      ctx.fillRect(0, 5, 12, 2);
      ctx.fillRect(3, 3, 6, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 1, 2, 10);
      ctx.fillRect(1, 5, 10, 2);
      ctx.fillRect(4, 4, 4, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(5, 5, 2, 2);
      scene.textures.addCanvas('vfx_stun_star', canvas);
    }
  }

  private static createEquipmentAndVanityTextures(scene: Phaser.Scene) {
    // ----------------------------------------------------
    // 1. Vanity Headgear (Worn Overlays)
    // ----------------------------------------------------
    // Crown
    {
      const [canvas, ctx] = this.createCanvas(20, 16);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(2, 6, 16, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(3, 7, 14, 6);
      // Crown peaks
      ctx.beginPath();
      ctx.moveTo(3, 6); ctx.lineTo(5, 1); ctx.lineTo(7, 6);
      ctx.moveTo(8, 6); ctx.lineTo(10, 0); ctx.lineTo(12, 6);
      ctx.moveTo(13, 6); ctx.lineTo(15, 1); ctx.lineTo(17, 6);
      ctx.fill();
      // Peak gold shine
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(9, 2, 2, 4);
      ctx.fillRect(4, 3, 2, 3);
      ctx.fillRect(14, 3, 2, 3);
      // Ruby Jewels
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(5, 9, 2, 2);
      ctx.fillRect(9, 8, 2, 3);
      ctx.fillRect(13, 9, 2, 2);
      scene.textures.addCanvas('vanity_crown_gold', canvas);
    }

    // Wizard Hat
    {
      const [canvas, ctx] = this.createCanvas(24, 20);
      // Wide brim
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(12, 16, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.ellipse(12, 15, 9, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Conical hat body
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(5, 15);
      ctx.quadraticCurveTo(10, 8, 14, 2);
      ctx.quadraticCurveTo(13, 8, 19, 15);
      ctx.closePath();
      ctx.fill();
      // Golden star ornament
      ctx.fillStyle = '#facc15';
      ctx.fillRect(11, 7, 2, 2);
      ctx.fillRect(10, 8, 4, 1);
      scene.textures.addCanvas('vanity_hat_wizard', canvas);
    }

    // Ranger Hood
    {
      const [canvas, ctx] = this.createCanvas(20, 18);
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(10, 9, 8, Math.PI, 0);
      ctx.lineTo(18, 16);
      ctx.lineTo(2, 16);
      ctx.closePath();
      ctx.fill();
      // Inner shadow/face cutout
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(10, 10, 6, Math.PI, 0);
      ctx.lineTo(15, 14);
      ctx.lineTo(5, 14);
      ctx.closePath();
      ctx.fill();
      // Cowl edge trim
      ctx.fillStyle = '#15803d';
      ctx.fillRect(3, 14, 14, 3);
      scene.textures.addCanvas('vanity_hood_ranger', canvas);
    }

    // ----------------------------------------------------
    // 2. Vanity Body & Cloaks (Worn Overlays)
    // ----------------------------------------------------
    // Hero's Crimson Cape
    {
      const [canvas, ctx] = this.createCanvas(20, 22);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(3, 4, 14, 16);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(4, 5, 12, 14);
      // Gold neck clasps
      ctx.fillStyle = '#facc15';
      ctx.fillRect(3, 2, 3, 3);
      ctx.fillRect(14, 2, 3, 3);
      // Folds
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(6, 6, 2, 12);
      ctx.fillRect(12, 6, 2, 12);
      scene.textures.addCanvas('vanity_cape_hero', canvas);
    }

    // Knight's Steel Pauldrons
    {
      const [canvas, ctx] = this.createCanvas(24, 16);
      // Left and right shoulder guards
      ctx.fillStyle = '#475569';
      ctx.fillRect(1, 4, 6, 8);
      ctx.fillRect(17, 4, 6, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(2, 5, 4, 6);
      ctx.fillRect(18, 5, 4, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(3, 5, 2, 2);
      ctx.fillRect(19, 5, 2, 2);
      scene.textures.addCanvas('vanity_armor_knight', canvas);
    }

    // ----------------------------------------------------
    // 3. Arrow Projectile
    // ----------------------------------------------------
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      // Wooden shaft
      ctx.fillStyle = '#92400e';
      ctx.fillRect(3, 7, 9, 2);
      // Steel arrowhead (pointing right)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(15, 8);
      ctx.lineTo(11, 4);
      ctx.lineTo(11, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(11, 7, 2, 2);
      // Feather fletching (left)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(1, 4); ctx.lineTo(4, 7); ctx.lineTo(1, 7); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1, 12); ctx.lineTo(4, 9); ctx.lineTo(1, 9); ctx.fill();
      scene.textures.addCanvas('proj_arrow', canvas);
    }

    // ----------------------------------------------------
    // 4. Weapon Hand Overlays
    // ----------------------------------------------------
    // Sword
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6, 2, 4, 9);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(7, 2, 2, 8);
      ctx.fillStyle = '#b45309'; // crossguard
      ctx.fillRect(3, 10, 10, 2);
      ctx.fillStyle = '#78350f'; // grip
      ctx.fillRect(7, 12, 2, 3);
      scene.textures.addCanvas('weapon_sword', canvas);
    }

    // Dagger
    {
      const [canvas, ctx] = this.createCanvas(14, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(5, 2, 3, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6, 2, 1, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(3, 7, 7, 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(5, 9, 2, 3);
      scene.textures.addCanvas('weapon_dagger', canvas);
    }

    // Broadsword
    {
      const [canvas, ctx] = this.createCanvas(20, 20);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(7, 1, 6, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(8, 2, 4, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(9, 2, 2, 9);
      // Heavy crossguard
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(3, 12, 14, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 15, 3, 4);
      scene.textures.addCanvas('weapon_broadsword', canvas);
    }

    // Staff
    {
      const [canvas, ctx] = this.createCanvas(20, 20);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(9, 4, 3, 15);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(10, 4, 1, 14);
      // Arcane head & jewel
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(10, 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(9, 3, 2, 2);
      scene.textures.addCanvas('weapon_staff', canvas);
    }

    // Bow
    {
      const [canvas, ctx] = this.createCanvas(18, 18);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(6, 9, 7, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Bowstring
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 2);
      ctx.lineTo(6, 16);
      ctx.stroke();
      scene.textures.addCanvas('weapon_bow', canvas);
    }

    // ----------------------------------------------------
    // 5. Equipment & Vanity Inventory Icons (20x20)
    // ----------------------------------------------------
    const createItemIcon = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const [canvas, ctx] = this.createCanvas(20, 20);
      // Subtle item background slot
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, 20, 20);
      drawFn(ctx);
      scene.textures.addCanvas(key, canvas);
    };

    createItemIcon('item_dagger_shadow', (ctx) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 3, 3, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(9, 3, 1, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(6, 11, 7, 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 13, 2, 4);
    });

    createItemIcon('item_sword_claymore', (ctx) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, 2, 4, 11);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(9, 2, 2, 10);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(4, 12, 12, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 14, 2, 4);
    });

    createItemIcon('item_staff_oak', (ctx) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(9, 5, 2, 13);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(10, 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.fillRect(9, 3, 2, 2);
    });

    createItemIcon('item_bow_recurve', (ctx) => {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(7, 10, 7, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(7, 3);
      ctx.lineTo(7, 17);
      ctx.stroke();
    });

    createItemIcon('item_shield_wood', (ctx) => {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(10, 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(10, 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(9, 5, 2, 10);
    });

    createItemIcon('item_shield_iron', (ctx) => {
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(10, 3);
      ctx.lineTo(16, 6);
      ctx.lineTo(14, 15);
      ctx.lineTo(10, 18);
      ctx.lineTo(6, 15);
      ctx.lineTo(4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, 7, 4, 7);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(9, 8, 2, 5);
    });

    createItemIcon('item_tome_arcane', (ctx) => {
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(5, 3, 10, 14);
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(6, 4, 8, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(8, 8, 4, 4);
    });

    createItemIcon('item_quiver_ranger', (ctx) => {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(6, 6, 7, 11);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(7, 2, 2, 5);
      ctx.fillRect(10, 3, 2, 4);
    });

    createItemIcon('item_armor_leather', (ctx) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, 4, 10, 12);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(6, 6, 8, 9);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(7, 8, 6, 2);
    });

    createItemIcon('item_armor_plate', (ctx) => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(4, 4, 12, 13);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6, 5, 8, 10);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(7, 6, 2, 4);
    });

    createItemIcon('item_armor_robe', (ctx) => {
      ctx.fillStyle = '#581c87';
      ctx.fillRect(5, 3, 10, 14);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(6, 5, 8, 11);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(9, 4, 2, 12);
    });

    createItemIcon('item_relic_heart', (ctx) => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(8, 8, 3, 0, Math.PI * 2);
      ctx.arc(12, 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, 9);
      ctx.lineTo(10, 15);
      ctx.lineTo(15, 9);
      ctx.closePath();
      ctx.fill();
    });

    createItemIcon('item_relic_feather', (ctx) => {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(10, 10, 4, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f0f9ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(7, 16);
      ctx.lineTo(13, 4);
      ctx.stroke();
    });

    createItemIcon('item_relic_moonstone', (ctx) => {
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(10, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(11, 9, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    createItemIcon('item_relic_phoenix', (ctx) => {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(10, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, 7, 4, 6);
    });

    createItemIcon('item_vanity_crown', (ctx) => {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(4, 9, 12, 5);
      ctx.beginPath();
      ctx.moveTo(4, 9); ctx.lineTo(6, 4); ctx.lineTo(8, 9);
      ctx.moveTo(9, 9); ctx.lineTo(10, 3); ctx.lineTo(11, 9);
      ctx.moveTo(12, 9); ctx.lineTo(14, 4); ctx.lineTo(16, 9);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(9, 10, 2, 2);
    });

    createItemIcon('item_vanity_hat_wizard', (ctx) => {
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(10, 15, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(5, 14); ctx.lineTo(10, 3); ctx.lineTo(15, 14); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(9, 8, 2, 2);
    });

    createItemIcon('item_vanity_hood_ranger', (ctx) => {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(10, 9, 6, Math.PI, 0);
      ctx.lineTo(16, 15); ctx.lineTo(4, 15); ctx.fill();
    });

    createItemIcon('item_vanity_cape_hero', (ctx) => {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(5, 4, 10, 13);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 3, 3, 2);
      ctx.fillRect(12, 3, 3, 2);
    });

    createItemIcon('item_vanity_armor_knight', (ctx) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(2, 6, 5, 8);
      ctx.fillRect(13, 6, 5, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(3, 7, 3, 3);
      ctx.fillRect(14, 7, 3, 3);
    });

    // ==========================================
    // Class Archetypes Art & VFX Assets (Task 7.3)
    // ==========================================

    // 1. Skeletal Bone Minion (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Skull
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(7, 3, 10, 8);
      // Jaw
      ctx.fillRect(9, 11, 6, 3);
      // Eye sockets & teeth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, 6, 3, 3);
      ctx.fillRect(13, 6, 3, 3);
      ctx.fillRect(10, 11, 1, 2);
      ctx.fillRect(13, 11, 1, 2);
      // Glowing red pupil dots
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(9, 7, 1, 1);
      ctx.fillRect(14, 7, 1, 1);
      // Spine & Ribs
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(11, 14, 2, 6);
      ctx.fillRect(8, 15, 8, 1);
      ctx.fillRect(9, 17, 6, 1);
      // Legs
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(9, 20, 2, 4);
      ctx.fillRect(13, 20, 2, 4);
      // Arms & Bone Blade
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(6, 14, 2, 4);
      ctx.fillRect(16, 14, 2, 4);
      // Bone dagger
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(18, 11, 2, 7);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(18, 9, 2, 2);

      scene.textures.addCanvas('entity_minion_skeleton', canvas);
    }

    // 2. Piercing Arrow Projectile (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      // Luminous jade shaft
      ctx.fillStyle = '#10b981';
      ctx.fillRect(2, 7, 11, 2);
      // Glowing emerald arrowhead
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.moveTo(15, 8);
      ctx.lineTo(11, 5);
      ctx.lineTo(11, 11);
      ctx.fill();
      // Aerodynamic fletching
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(1, 5, 3, 2);
      ctx.fillRect(1, 9, 3, 2);

      scene.textures.addCanvas('proj_arrow_pierce', canvas);
    }

    // 3. Parry Aegis Shield Flare VFX (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.beginPath();
      ctx.arc(12, 12, 11, 0, Math.PI * 2);
      ctx.fill();
      // Golden shield crest
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(12, 3);
      ctx.lineTo(20, 6);
      ctx.lineTo(18, 16);
      ctx.lineTo(12, 21);
      ctx.lineTo(6, 16);
      ctx.lineTo(4, 6);
      ctx.closePath();
      ctx.fill();
      // White reflection core
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(10, 8, 4, 8);

      scene.textures.addCanvas('fx_shield_parry', canvas);
    }

    // 4. Arcane Nova Shockwave VFX (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      const grad = ctx.createRadialGradient(16, 16, 4, 16, 16, 15);
      grad.addColorStop(0, 'rgba(167, 139, 250, 0.9)');
      grad.addColorStop(0.5, 'rgba(129, 140, 248, 0.6)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, Math.PI * 2);
      ctx.fill();
      // Mystic sparks
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(15, 6, 2, 2);
      ctx.fillRect(15, 24, 2, 2);
      ctx.fillRect(6, 15, 2, 2);
      ctx.fillRect(24, 15, 2, 2);

      scene.textures.addCanvas('fx_arcane_nova', canvas);
    }

    // 5. Musical Note Particle VFX (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#ec4899';
      // Eighth note head
      ctx.beginPath();
      ctx.ellipse(6, 12, 3, 2.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Note stem
      ctx.fillRect(8, 4, 2, 8);
      // Note flag
      ctx.beginPath();
      ctx.moveTo(10, 4);
      ctx.bezierCurveTo(13, 5, 14, 8, 11, 10);
      ctx.lineTo(10, 9);
      ctx.fill();

      scene.textures.addCanvas('fx_music_note', canvas);
    }

    // 6. Life Siphon Soul Bead (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      const grad = ctx.createRadialGradient(8, 8, 2, 8, 8, 7);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#ec4899');
      grad.addColorStop(0.8, '#a855f7');
      grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('fx_siphon_orb', canvas);
    }

    // 7. Class Crest Badges (24x24)
    {
      // Warrior: Gold heater shield & sword
      const [cWar, ctxWar] = this.createCanvas(24, 24);
      ctxWar.fillStyle = '#b45309';
      ctxWar.fillRect(2, 2, 20, 20);
      ctxWar.fillStyle = '#f59e0b';
      ctxWar.fillRect(4, 4, 16, 16);
      ctxWar.fillStyle = '#ffffff';
      ctxWar.fillRect(11, 6, 2, 12);
      ctxWar.fillRect(8, 9, 8, 2);
      scene.textures.addCanvas('class_icon_warrior', cWar);

      // Mage: Mystic blue diamond & arcane star
      const [cMage, ctxMage] = this.createCanvas(24, 24);
      ctxMage.fillStyle = '#1e3a8a';
      ctxMage.fillRect(2, 2, 20, 20);
      ctxMage.fillStyle = '#3b82f6';
      ctxMage.fillRect(4, 4, 16, 16);
      ctxMage.fillStyle = '#93c5fd';
      ctxMage.beginPath();
      ctxMage.arc(12, 12, 5, 0, Math.PI * 2);
      ctxMage.fill();
      ctxMage.fillStyle = '#ffffff';
      ctxMage.fillRect(11, 11, 2, 2);
      scene.textures.addCanvas('class_icon_mage', cMage);

      // Bard: Magenta fanfare horn / lute
      const [cBard, ctxBard] = this.createCanvas(24, 24);
      ctxBard.fillStyle = '#9d174d';
      ctxBard.fillRect(2, 2, 20, 20);
      ctxBard.fillStyle = '#ec4899';
      ctxBard.fillRect(4, 4, 16, 16);
      ctxBard.fillStyle = '#fdf2f8';
      ctxBard.beginPath();
      ctxBard.ellipse(10, 14, 4, 3, 0, 0, Math.PI * 2);
      ctxBard.fill();
      ctxBard.fillRect(13, 6, 2, 8);
      ctxBard.fillRect(15, 6, 4, 2);
      scene.textures.addCanvas('class_icon_bard', cBard);

      // Necromancer: Violet horned skull
      const [cNecro, ctxNecro] = this.createCanvas(24, 24);
      ctxNecro.fillStyle = '#581c87';
      ctxNecro.fillRect(2, 2, 20, 20);
      ctxNecro.fillStyle = '#a855f7';
      ctxNecro.fillRect(4, 4, 16, 16);
      ctxNecro.fillStyle = '#f3e8ff';
      ctxNecro.fillRect(8, 7, 8, 6);
      ctxNecro.fillRect(9, 13, 6, 3);
      ctxNecro.fillStyle = '#581c87';
      ctxNecro.fillRect(9, 9, 2, 2);
      ctxNecro.fillRect(13, 9, 2, 2);
      scene.textures.addCanvas('class_icon_necromancer', cNecro);

      // Archer: Emerald bow & wind arrow
      const [cArch, ctxArch] = this.createCanvas(24, 24);
      ctxArch.fillStyle = '#065f46';
      ctxArch.fillRect(2, 2, 20, 20);
      ctxArch.fillStyle = '#10b981';
      ctxArch.fillRect(4, 4, 16, 16);
      ctxArch.strokeStyle = '#d1fae5';
      ctxArch.lineWidth = 2;
      ctxArch.beginPath();
      ctxArch.arc(9, 12, 6, -Math.PI / 2, Math.PI / 2);
      ctxArch.stroke();
      ctxArch.fillStyle = '#ffffff';
      ctxArch.fillRect(8, 11, 10, 2);
      ctxArch.fillRect(16, 9, 2, 6);
      scene.textures.addCanvas('class_icon_archer', cArch);
    }
  }

  private static createCatacombsTextures(scene: Phaser.Scene) {
    // 1. Dark Crypt Slate Floor Tile (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#181524'; // Deep crypt mortar
      ctx.fillRect(0, 0, 32, 32);

      // Slate flagstones
      ctx.fillStyle = '#262238';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillRect(17, 1, 14, 14);
      ctx.fillRect(1, 17, 14, 14);
      ctx.fillRect(17, 17, 14, 14);

      // Soft stone highlights & moss
      ctx.fillStyle = '#38334f';
      ctx.fillRect(2, 2, 12, 2);
      ctx.fillRect(18, 2, 12, 2);
      ctx.fillRect(2, 18, 12, 2);
      ctx.fillRect(18, 18, 12, 2);

      // Ancient glowing blue rune specks
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(22, 22, 2, 2);
      scene.textures.addCanvas('tile_catacombs_floor', canvas);
    }

    // 2. Crypt Masonry Wall Tile (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#100d1c';
      ctx.fillRect(0, 0, 32, 32);

      // Heavy carved crypt blocks
      ctx.fillStyle = '#2e2844';
      ctx.fillRect(1, 1, 30, 14);
      ctx.fillRect(1, 17, 14, 14);
      ctx.fillRect(17, 17, 14, 14);

      // Stone bevel highlights
      ctx.fillStyle = '#453d61';
      ctx.fillRect(2, 2, 28, 2);
      ctx.fillRect(2, 18, 12, 2);
      ctx.fillRect(18, 18, 12, 2);

      // Carved deep fissures
      ctx.fillStyle = '#0a0712';
      ctx.fillRect(10, 6, 2, 6);
      ctx.fillRect(12, 10, 4, 2);
      scene.textures.addCanvas('tile_catacombs_wall', canvas);
    }

    // 3. Abyssal Chasm Void Tile (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, 32, 32);

      // Distant eerie void specks
      ctx.fillStyle = '#1e1035';
      ctx.fillRect(4, 12, 2, 2);
      ctx.fillRect(20, 6, 2, 2);
      ctx.fillRect(14, 24, 2, 2);
      scene.textures.addCanvas('tile_catacombs_abyss', canvas);
    }

    // 4. Descending Crypt Stairs (48x48)
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      ctx.fillStyle = '#120f21';
      ctx.fillRect(0, 0, 48, 48);

      // 4 tiered stone steps descending downward into dark void
      for (let s = 0; s < 4; s++) {
        const y = s * 11 + 2;
        const color = s === 0 ? '#433c5e' : s === 1 ? '#342e4a' : s === 2 ? '#241f36' : '#141121';
        ctx.fillStyle = color;
        ctx.fillRect(4, y, 40, 10);
        ctx.fillStyle = '#5c547d';
        ctx.fillRect(4, y, 40, 2);
      }
      scene.textures.addCanvas('prop_crypt_stairs_down', canvas);
    }

    // 5. Ascending Crypt Stairs (48x48)
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      ctx.fillStyle = '#141121';
      ctx.fillRect(0, 0, 48, 48);

      for (let s = 0; s < 4; s++) {
        const y = 48 - (s + 1) * 11 - 2;
        const color = s === 3 ? '#625985' : s === 2 ? '#4e466c' : s === 1 ? '#3a3454' : '#26223b';
        ctx.fillStyle = color;
        ctx.fillRect(4, y, 40, 10);
        ctx.fillStyle = '#8379ab';
        ctx.fillRect(4, y, 40, 2);
      }
      scene.textures.addCanvas('prop_crypt_stairs_up', canvas);
    }

    // 6. Crypt Torch Sconce (Unlit) (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Wall plate & bracket
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 14, 8, 20);
      ctx.fillStyle = '#475569';
      ctx.fillRect(14, 16, 4, 16);
      // Bowl & charcoal wick
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 10, 16, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(12, 6, 8, 6);
      scene.textures.addCanvas('prop_crypt_torch_unlit', canvas);
    }

    // 7. Crypt Torch Sconce (Lit) (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Bracket
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 14, 8, 20);
      ctx.fillStyle = '#475569';
      ctx.fillRect(14, 16, 4, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 10, 16, 6);
      // Roaring golden flame
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(16, 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(16, 7, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(16, 5, 3, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('prop_crypt_torch_lit', canvas);
    }

    // 8. Crypt Iron Gate (Closed) (64x64)
    {
      const [canvas, ctx] = this.createCanvas(64, 64);
      // Stone arch frame
      ctx.fillStyle = '#262238';
      ctx.fillRect(0, 0, 12, 64);
      ctx.fillRect(52, 0, 12, 64);
      ctx.fillRect(0, 0, 64, 12);
      ctx.fillStyle = '#3f385c';
      ctx.fillRect(2, 2, 60, 4);

      // Heavy vertical iron bars & spikes
      ctx.fillStyle = '#475569';
      for (let x = 16; x <= 48; x += 8) {
        ctx.fillRect(x, 12, 4, 46);
        // Spiked bottom
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 1, 56, 2, 6);
        ctx.fillStyle = '#475569';
      }
      // Horizontal lock bars
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 24, 40, 5);
      ctx.fillRect(12, 42, 40, 5);
      // Ancient glowing lock rune
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(30, 31, 4, 4);
      scene.textures.addCanvas('prop_crypt_gate_closed', canvas);
    }

    // 9. Crypt Iron Gate (Opened) (64x64)
    {
      const [canvas, ctx] = this.createCanvas(64, 64);
      // Stone arch frame
      ctx.fillStyle = '#262238';
      ctx.fillRect(0, 0, 12, 64);
      ctx.fillRect(52, 0, 12, 64);
      ctx.fillRect(0, 0, 64, 12);
      ctx.fillStyle = '#3f385c';
      ctx.fillRect(2, 2, 60, 4);

      // Bars pulled up into archway ceiling
      ctx.fillStyle = '#475569';
      for (let x = 16; x <= 48; x += 8) {
        ctx.fillRect(x, 12, 4, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 1, 22, 2, 4);
        ctx.fillStyle = '#475569';
      }
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(30, 8, 4, 4);
      scene.textures.addCanvas('prop_crypt_gate_opened', canvas);
    }

    // 10. Moving Stone Platform (72x44)
    {
      const [canvas, ctx] = this.createCanvas(72, 44);
      // Floating runic stone slab
      ctx.fillStyle = '#1e1a2f';
      ctx.fillRect(2, 8, 68, 30);
      ctx.fillStyle = '#342e4e';
      ctx.fillRect(4, 4, 64, 28);
      ctx.fillStyle = '#4e4672';
      ctx.fillRect(6, 6, 60, 6);

      // Glowing rune inlays (cyan)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(12, 16, 12, 3);
      ctx.fillRect(30, 16, 12, 3);
      ctx.fillRect(48, 16, 12, 3);
      ctx.fillRect(18, 14, 3, 7);
      ctx.fillRect(36, 14, 3, 7);
      ctx.fillRect(54, 14, 3, 7);
      scene.textures.addCanvas('prop_moving_platform', canvas);
    }

    // 11. Crypt Spikes Hazard (48x48)
    {
      const [canvas, ctx] = this.createCanvas(48, 48);
      // Ground fissure
      ctx.fillStyle = '#1e1111';
      ctx.fillRect(6, 32, 36, 10);
      // 3 sharp bone/obsidian spikes
      const spikeX = [12, 24, 36];
      spikeX.forEach(sx => {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(sx - 5, 36);
        ctx.lineTo(sx, 6);
        ctx.lineTo(sx + 5, 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7f1d1d'; // Crimson blood edge
        ctx.fillRect(sx - 1, 8, 2, 8);
      });
      scene.textures.addCanvas('prop_crypt_spikes', canvas);
    }

    // 12. Boss: Malakor the Tomb Warden (64x72)
    {
      const [canvas, ctx] = this.createCanvas(64, 72);
      // Dark flowing spectral robes
      ctx.fillStyle = '#130c24';
      ctx.beginPath();
      ctx.moveTo(32, 14);
      ctx.lineTo(10, 64);
      ctx.lineTo(54, 64);
      ctx.closePath();
      ctx.fill();

      // Violet inner shroud
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(20, 24, 24, 38);

      // Hood & shadow face
      ctx.fillStyle = '#1a0b36';
      ctx.beginPath();
      ctx.arc(32, 20, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#05020a';
      ctx.fillRect(24, 16, 16, 10);

      // Glowing spectral eyes (magenta/cyan)
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(26, 19, 3, 3);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(35, 19, 3, 3);

      // Bone Crown
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(24, 8, 16, 4);
      ctx.fillRect(24, 4, 3, 4);
      ctx.fillRect(30, 2, 4, 6);
      ctx.fillRect(37, 4, 3, 4);

      // Curved Soul Scythe in right hand
      ctx.fillStyle = '#475569';
      ctx.fillRect(50, 10, 4, 54);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(52, 14, 16, Math.PI, Math.PI * 1.75);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#c084fc';
      ctx.stroke();
      scene.textures.addCanvas('boss_malakor', canvas);
    }

    // 13. Relic Chest (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Rich gilded chest
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, 10, 24, 18);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(4, 6, 24, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(2, 12, 28, 3);
      ctx.fillRect(14, 12, 4, 6);
      // Radiant Sun Gem on chest lid
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(16, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(15, 7, 2, 2);
      scene.textures.addCanvas('prop_relic_chest', canvas);
    }

    // 14. Radiant Exit Portal (48x64)
    {
      const [canvas, ctx] = this.createCanvas(48, 64);
      // Swirling portal vortex
      const grad = ctx.createRadialGradient(24, 32, 4, 24, 32, 22);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(0.7, '#6366f1');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(24, 32, 20, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('prop_catacombs_portal', canvas);
    }

    // 15. Sun Stone Relic Item (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(12, 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 10, 3, 3);
      // Sun rays
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(11, 1, 2, 3);
      ctx.fillRect(11, 20, 2, 3);
      ctx.fillRect(1, 11, 3, 2);
      ctx.fillRect(20, 11, 3, 2);
      scene.textures.addCanvas('item_relic_sun_stone', canvas);
    }

    // ==========================================
    // Floor 3: Abyssal Necropolis Textures (Milestone 4)
    // ==========================================

    // 15b. Void Stone Floor Tile (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#090714'; // Midnight obsidian
      ctx.fillRect(0, 0, 32, 32);

      // Faint purple rune hairline fissures
      ctx.fillStyle = '#1e1136';
      ctx.fillRect(0, 0, 32, 1);
      ctx.fillRect(0, 0, 1, 32);
      ctx.fillRect(15, 0, 1, 32);
      ctx.fillRect(0, 15, 32, 1);

      // Glimmering astral starlight specks
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(5, 7, 2, 2);
      ctx.fillRect(21, 23, 2, 2);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(10, 20, 1, 1);
      ctx.fillRect(26, 6, 1, 1);

      scene.textures.addCanvas('tile_catacombs_void', canvas);
    }

    // 15c. Necrotic Soul Pylon (Active) (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Dark stone base
      ctx.fillStyle = '#1e1b2e';
      ctx.fillRect(6, 40, 20, 8);
      ctx.fillStyle = '#2e284a';
      ctx.fillRect(8, 38, 16, 4);

      // Tapered obsidian spire
      ctx.fillStyle = '#181124';
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(24, 38);
      ctx.lineTo(8, 38);
      ctx.closePath();
      ctx.fill();

      // Glowing necrotic violet rune core
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.ellipse(16, 22, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.ellipse(16, 22, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Electric arc crackles
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 15);
      ctx.lineTo(13, 22);
      ctx.lineTo(19, 26);
      ctx.lineTo(16, 32);
      ctx.stroke();

      scene.textures.addCanvas('prop_void_pylon_active', canvas);
    }

    // 15d. Necrotic Soul Pylon (Destroyed) (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Crumbled stone base
      ctx.fillStyle = '#1e1b2e';
      ctx.fillRect(6, 40, 20, 8);
      // Shattered jagged stump
      ctx.fillStyle = '#181124';
      ctx.beginPath();
      ctx.moveTo(8, 40);
      ctx.lineTo(11, 26);
      ctx.lineTo(16, 32);
      ctx.lineTo(21, 24);
      ctx.lineTo(24, 40);
      ctx.closePath();
      ctx.fill();
      // Gray dead stone highlights
      ctx.fillStyle = '#475569';
      ctx.fillRect(10, 36, 4, 3);
      ctx.fillRect(18, 34, 3, 4);

      scene.textures.addCanvas('prop_void_pylon_destroyed', canvas);
    }

    // 15e. Crypt Wraith (Floating Phantom) (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Spectral midnight tattered cloak
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(26, 26);
      ctx.lineTo(20, 22);
      ctx.lineTo(16, 28);
      ctx.lineTo(12, 22);
      ctx.lineTo(6, 26);
      ctx.closePath();
      ctx.fill();

      // Shadow hood interior
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.ellipse(16, 11, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cold piercing cyan eyes
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(13, 10, 2, 2);
      ctx.fillRect(17, 10, 2, 2);

      // Frost aura wisps
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(8, 14, 2, 8);
      ctx.fillRect(22, 14, 2, 8);

      scene.textures.addCanvas('enemy_crypt_wraith', canvas);
    }

    // 15f. Boss: Arch-Lich Vespera (48x56)
    {
      const [canvas, ctx] = this.createCanvas(48, 56);
      // Flowing regal dark velvet robe with train
      ctx.fillStyle = '#1e1035';
      ctx.beginPath();
      ctx.moveTo(24, 12);
      ctx.lineTo(40, 52);
      ctx.lineTo(8, 52);
      ctx.closePath();
      ctx.fill();

      // Golden ornate embroidery trims
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(24, 16);
      ctx.lineTo(24, 52);
      ctx.stroke();

      // Deep violet cowl & astral collar
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(24, 16, 12, 0, Math.PI * 2);
      ctx.fill();

      // Void face & glowing red lich eyes
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(24, 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(21, 14, 2, 2);
      ctx.fillRect(25, 14, 2, 2);

      // Obsidian Spired Crown of the Void
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(16, 6, 16, 3);
      ctx.fillRect(16, 2, 3, 5);
      ctx.fillRect(22, 0, 4, 7);
      ctx.fillRect(29, 2, 3, 5);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(23, 2, 2, 2); // Crown jewel

      // Glowing purple void orb hovered between skeletal hands
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(24, 32, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(24, 32, 2, 0, Math.PI * 2);
      ctx.fill();

      scene.textures.addCanvas('boss_vespera', canvas);
    }

    // ==========================================
    // Cozy Bobber Fishing Textures (Issue #23)
    // ==========================================

    // 16. Fishing Bobber (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      // Subtle oval water shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top antenna stem
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(7, 1, 2, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(7, 0, 2, 2);

      // Top red dome
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(8, 8, 5, Math.PI, 0);
      ctx.fill();
      // Red highlight
      ctx.fillStyle = '#f87171';
      ctx.fillRect(6, 5, 2, 2);

      // Middle dark band
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(3, 8, 10, 1);

      // Bottom white hemisphere
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(5, 11, 6, 2);

      scene.textures.addCanvas('prop_bobber', canvas);
    }

    // 17. Bamboo Fishing Rod (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Diagonal bamboo cane
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#a3e635';
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.lineTo(21, 3);
      ctx.stroke();

      // Bamboo ring nodes
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(7, 16, 3, 2);
      ctx.fillRect(12, 11, 3, 2);
      ctx.fillRect(17, 6, 3, 2);

      // Brass reel at handle
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(6, 18, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.fillRect(5, 17, 2, 2);

      scene.textures.addCanvas('item_fishing_rod_bamboo', canvas);
    }

    // 18. Fish Species Icons (24x24 pixel art)
    const drawFishBase = (
      key: string,
      bodyColor: string,
      finColor: string,
      bellyColor: string,
      decorFn?: (ctx: CanvasRenderingContext2D) => void
    ) => {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Tail fin
      ctx.fillStyle = finColor;
      ctx.beginPath();
      ctx.moveTo(3, 8);
      ctx.lineTo(8, 12);
      ctx.lineTo(3, 16);
      ctx.closePath();
      ctx.fill();

      // Dorsal fin
      ctx.beginPath();
      ctx.moveTo(11, 7);
      ctx.lineTo(15, 4);
      ctx.lineTo(17, 7);
      ctx.closePath();
      ctx.fill();

      // Main streamlined body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(14, 12, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft light belly
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.ellipse(14, 14, 5, 2.5, 0, 0, Math.PI);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 10, 2, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(18, 10, 1, 1);

      if (decorFn) decorFn(ctx);

      scene.textures.addCanvas(key, canvas);
    };

    // Copper Minnow
    drawFishBase('fish_copper_minnow', '#d97706', '#b45309', '#fed7aa', (ctx) => {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(12, 11, 2, 2);
    });

    // Glowing Perch
    drawFishBase('fish_glowing_perch', '#0891b2', '#06b6d4', '#cffafe', (ctx) => {
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(10, 10, 2, 2);
      ctx.fillRect(14, 11, 2, 2);
    });

    // Azure Brook Trout
    drawFishBase('fish_brook_trout', '#2563eb', '#1d4ed8', '#bfdbfe', (ctx) => {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(11, 10, 1, 1);
      ctx.fillRect(13, 12, 1, 1);
      ctx.fillRect(15, 11, 1, 1);
    });

    // Mossy Bog Bass
    drawFishBase('fish_mossy_bass', '#15803d', '#166534', '#bbf7d0', (ctx) => {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(11, 8, 2, 7);
      ctx.fillRect(14, 8, 2, 7);
    });

    // Shimmering River Salmon
    drawFishBase('fish_shimmer_salmon', '#db2777', '#be185d', '#fbcfe8', (ctx) => {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(10, 11, 6, 2);
    });

    // Moonlit Catfish
    drawFishBase('fish_moonlit_catfish', '#7c3aed', '#6d28d9', '#ddd6fe', (ctx) => {
      // Long whisker barbel
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(19, 13);
      ctx.lineTo(23, 16);
      ctx.stroke();
    });

    // Ancient Golden Carp
    drawFishBase('fish_golden_carp', '#eab308', '#ca8a04', '#fef08a', (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 10, 2, 2);
      ctx.fillRect(14, 12, 2, 2);
      // Golden crown crest
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(13, 5, 3, 2);
    });

    // Abyssal Spectral Koi
    drawFishBase('fish_spectral_koi', '#9333ea', '#a855f7', '#f3e8ff', (ctx) => {
      // Wispy translucent glow halo
      ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
      ctx.beginPath();
      ctx.arc(14, 12, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // 19. Waterlogged Sunken Lockbox (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Dark waterlogged wood
      ctx.fillStyle = '#451a03';
      ctx.fillRect(3, 7, 18, 14);
      // Tarnished brass iron bands
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, 7, 3, 14);
      ctx.fillRect(16, 7, 3, 14);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(10, 12, 4, 5);
      // Clinging green waterweed
      ctx.fillStyle = '#15803d';
      ctx.fillRect(2, 17, 4, 3);
      ctx.fillRect(18, 15, 3, 4);
      scene.textures.addCanvas('sunken_chest', canvas);
      scene.textures.addCanvas('item_sunken_chest', canvas);
    }

    // 20. Old Waterlogged Boot (24x24)
    {
      const [canvas, ctx] = this.createCanvas(24, 24);
      // Muddy worn boot
      ctx.fillStyle = '#3f2212';
      ctx.fillRect(7, 4, 7, 12);
      ctx.fillRect(7, 13, 14, 6);
      // Rubber heel and sole
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(6, 17, 15, 3);
      // Hanging pond weed
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(15, 12, 3, 4);
      ctx.fillRect(18, 14, 2, 5);
      scene.textures.addCanvas('waterlogged_boot', canvas);
      scene.textures.addCanvas('item_waterlogged_boot', canvas);
    }

    // 21. Silver Fish Hook UI Icon (16x16)
    {
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(8, 9, 5, 0, Math.PI);
      ctx.lineTo(3, 6);
      ctx.stroke();
      // Hook point barb
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(3, 6);
      ctx.lineTo(5, 8);
      ctx.lineTo(2, 8);
      ctx.closePath();
      ctx.fill();
      // Eyelet loop
      ctx.strokeRect(12, 3, 2, 4);
      scene.textures.addCanvas('ui_fish_icon_hook', canvas);
    }

    // 22. Cozy Restful Campfires (32x32 pixel art) - Unlit & 3 Animated Flame Frames (Issue #24)
    {
      const drawCampfireBase = (ctx: CanvasRenderingContext2D) => {
        // Outer stone circle hearth (8 stones placed in a circle)
        const stones = [
          { x: 16, y: 25, r: 4 }, { x: 23, y: 23, r: 3.5 }, { x: 27, y: 18, r: 4 },
          { x: 25, y: 13, r: 3.5 }, { x: 16, y: 11, r: 4 }, { x: 7, y: 13, r: 3.5 },
          { x: 5, y: 18, r: 4 }, { x: 9, y: 23, r: 3.5 }
        ];
        stones.forEach((s, idx) => {
          ctx.fillStyle = idx % 2 === 0 ? '#475569' : '#334155';
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
        });

        // Inner ash pit
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(16, 18, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crossed charred logs
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        // Log 1: top-left to bottom-right
        ctx.beginPath();
        ctx.moveTo(9, 13);
        ctx.lineTo(23, 23);
        ctx.stroke();
        // Log 2: top-right to bottom-left
        ctx.beginPath();
        ctx.moveTo(23, 13);
        ctx.lineTo(9, 23);
        ctx.stroke();
        // Dark bark detail
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(11, 14);
        ctx.lineTo(21, 21);
        ctx.moveTo(21, 14);
        ctx.lineTo(11, 21);
        ctx.stroke();
      };

      // Unlit campfire
      {
        const [canvas, ctx] = this.createCanvas(32, 32);
        drawCampfireBase(ctx);
        // Charred grey kindling
        ctx.fillStyle = '#57534e';
        ctx.fillRect(14, 16, 4, 3);
        scene.textures.addCanvas('prop_campfire_unlit', canvas);
      }

      // Lit frame 1
      {
        const [canvas, ctx] = this.createCanvas(32, 32);
        drawCampfireBase(ctx);
        // Glowing red/orange ember core
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(16, 18, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main flame (tall left-leaning)
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(11, 20);
        ctx.quadraticCurveTo(10, 11, 14, 6);
        ctx.quadraticCurveTo(18, 12, 21, 20);
        ctx.closePath();
        ctx.fill();
        // Inner golden flame tongue
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(13, 19);
        ctx.quadraticCurveTo(13, 13, 15, 8);
        ctx.quadraticCurveTo(17, 13, 19, 19);
        ctx.closePath();
        ctx.fill();
        // White-hot core
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(15, 14, 2, 4);
        // Ember spark
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(13, 4, 2, 2);
        scene.textures.addCanvas('prop_campfire_lit_1', canvas);
      }

      // Lit frame 2
      {
        const [canvas, ctx] = this.createCanvas(32, 32);
        drawCampfireBase(ctx);
        // Glowing core
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(16, 18, 7, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main flame (centered high burst)
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.quadraticCurveTo(13, 9, 16, 4);
        ctx.quadraticCurveTo(19, 9, 22, 20);
        ctx.closePath();
        ctx.fill();
        // Inner golden tongue
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(12, 19);
        ctx.quadraticCurveTo(14, 11, 16, 7);
        ctx.quadraticCurveTo(18, 11, 20, 19);
        ctx.closePath();
        ctx.fill();
        // White-hot core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 13, 2, 5);
        // Ember sparks
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(17, 3, 2, 2);
        ctx.fillRect(11, 6, 1.5, 1.5);
        scene.textures.addCanvas('prop_campfire_lit_2', canvas);
      }

      // Lit frame 3
      {
        const [canvas, ctx] = this.createCanvas(32, 32);
        drawCampfireBase(ctx);
        // Glowing core
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(16, 18, 6.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main flame (right-leaning dynamic flicker)
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(11, 20);
        ctx.quadraticCurveTo(14, 11, 18, 5);
        ctx.quadraticCurveTo(21, 13, 22, 20);
        ctx.closePath();
        ctx.fill();
        // Inner golden tongue
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(13, 19);
        ctx.quadraticCurveTo(15, 12, 17, 8);
        ctx.quadraticCurveTo(19, 14, 20, 19);
        ctx.closePath();
        ctx.fill();
        // White-hot core
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(16, 15, 2, 3);
        // Ember sparks
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(19, 4, 2, 2);
        scene.textures.addCanvas('prop_campfire_lit_3', canvas);
      }
    }

    // 23. Rain Puddles (24x14 & 36x20 transparent oval puddle sprites)
    {
      const [canvas, ctx] = this.createCanvas(24, 14);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.ellipse(12, 7, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Highlight ripple
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(10, 6, 4, Math.PI * 0.7, Math.PI * 1.4);
      ctx.stroke();
      scene.textures.addCanvas('prop_rain_puddle_small', canvas);
    }
    {
      const [canvas, ctx] = this.createCanvas(36, 20);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
      ctx.beginPath();
      ctx.ellipse(18, 10, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.60)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Ripple rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(16, 9, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      scene.textures.addCanvas('prop_rain_puddle_med', canvas);
    }

    // 24. Firefly Glow Particle (6x6)
    {
      const [canvas, ctx] = this.createCanvas(6, 6);
      ctx.fillStyle = 'rgba(163, 230, 53, 0.45)';
      ctx.beginPath();
      ctx.arc(3, 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(2, 2, 2, 2);
      scene.textures.addCanvas('particle_firefly', canvas);
    }

    // 25. Rain Splash Particle (8x8)
    {
      const [canvas, ctx] = this.createCanvas(8, 8);
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.stroke();
      scene.textures.addCanvas('particle_rain_splash', canvas);
    }

    // 26. UI Clock & Weather Icons (16x16)
    {
      // Sun
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(8, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(8 + Math.cos(ang) * 5.5, 8 + Math.sin(ang) * 5.5);
        ctx.lineTo(8 + Math.cos(ang) * 7.5, 8 + Math.sin(ang) * 7.5);
        ctx.stroke();
      }
      scene.textures.addCanvas('ui_clock_sun', canvas);
    }
    {
      // Moon
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(6, 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      scene.textures.addCanvas('ui_clock_moon', canvas);
    }
    {
      // Rain Cloud
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(6, 6, 3.5, 0, Math.PI * 2);
      ctx.arc(10, 5, 4, 0, Math.PI * 2);
      ctx.arc(13, 7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(4, 7, 9, 3);
      // Drops
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, 11);
      ctx.lineTo(5, 14);
      ctx.moveTo(10, 11);
      ctx.lineTo(9, 14);
      ctx.stroke();
      scene.textures.addCanvas('ui_weather_rain', canvas);
    }
    {
      // Storm Cloud with Lightning
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(6, 5, 3.5, 0, Math.PI * 2);
      ctx.arc(10, 4, 4, 0, Math.PI * 2);
      ctx.arc(13, 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(4, 6, 9, 3);
      // Lightning bolt
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(9, 9);
      ctx.lineTo(6, 12);
      ctx.lineTo(8, 12);
      ctx.lineTo(7, 15);
      ctx.lineTo(11, 11);
      ctx.lineTo(9, 11);
      ctx.closePath();
      ctx.fill();
      scene.textures.addCanvas('ui_weather_storm', canvas);
    }
    {
      // Fog Mist
      const [canvas, ctx] = this.createCanvas(16, 16);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, 5);
      ctx.lineTo(13, 5);
      ctx.moveTo(2, 9);
      ctx.lineTo(14, 9);
      ctx.moveTo(4, 13);
      ctx.lineTo(12, 13);
      ctx.stroke();
      scene.textures.addCanvas('ui_weather_fog', canvas);
    }
  }

  private static createFarmingTextures(scene: Phaser.Scene) {
    // 1. Dry Tilled Soil (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#654321'; // Deep earth
      ctx.fillRect(0, 0, 32, 32);

      // Tilled furrow ridges
      ctx.fillStyle = '#7a5229';
      for (let y = 3; y < 32; y += 7) {
        ctx.fillRect(1, y, 30, 3);
      }
      ctx.fillStyle = '#4d3319'; // Furrow shadows
      for (let y = 6; y < 32; y += 7) {
        ctx.fillRect(1, y, 30, 2);
      }
      // Fine soil crumb specks
      ctx.fillStyle = '#8f6233';
      ctx.fillRect(5, 4, 2, 2);
      ctx.fillRect(18, 11, 2, 2);
      ctx.fillRect(26, 18, 2, 2);
      ctx.fillRect(12, 25, 2, 2);

      scene.textures.addCanvas('tile_soil_tilled_dry', canvas);
    }

    // 2. Wet Tilled Soil (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      ctx.fillStyle = '#3d2614'; // Dark saturated mud
      ctx.fillRect(0, 0, 32, 32);

      // Saturated furrow ridges
      ctx.fillStyle = '#4d3019';
      for (let y = 3; y < 32; y += 7) {
        ctx.fillRect(1, y, 30, 3);
      }
      ctx.fillStyle = '#26180c';
      for (let y = 6; y < 32; y += 7) {
        ctx.fillRect(1, y, 30, 2);
      }
      // Water glint specular sheen
      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.fillRect(7, 4, 3, 1);
      ctx.fillRect(20, 11, 4, 1);
      ctx.fillRect(14, 25, 3, 1);

      scene.textures.addCanvas('tile_soil_tilled_wet', canvas);
    }

    // 3. Crop Stage 0: Planted Seed Mound (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Small earthen mound
      ctx.fillStyle = '#4a2f13';
      ctx.beginPath();
      ctx.ellipse(16, 22, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tiny green seed tip
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(15, 18, 2, 3);
      scene.textures.addCanvas('crop_stage_0', canvas);
    }

    // 4. Crop Stage 1: Young Sprout (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Stem
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(15, 16, 2, 8);
      // Left leaf
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(12, 16, 4, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Right leaf
      ctx.fillStyle = '#a3e635';
      ctx.beginPath();
      ctx.ellipse(20, 15, 4, 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('crop_stage_1', canvas);
    }

    // 5. Crop Stage 2: Growing Bush Foliage (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Lush green cluster
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.ellipse(16, 18, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(13, 16, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(19, 15, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('crop_stage_2', canvas);
    }

    // 6. Mature White Turnip (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Turnip bulb peeking from soil
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(16, 20, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Purple top blush
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.ellipse(16, 17, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crisp leafy greens
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(14, 8, 4, 8);
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(11, 10, 6, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(21, 9, 6, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      scene.textures.addCanvas('crop_turnip_3', canvas);
    }

    // 7. Mature Wild Strawberry Bush (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Foliage base
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(16, 18, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(14, 15, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Plump ruby strawberries
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(11, 19, 4, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(21, 18, 4, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(16, 22, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yellow seeds
      ctx.fillStyle = '#facc15';
      ctx.fillRect(10, 19, 1, 1);
      ctx.fillRect(20, 18, 1, 1);
      ctx.fillRect(15, 22, 1, 1);
      scene.textures.addCanvas('crop_strawberry_3', canvas);
    }

    // 8. Mature Golden Corn Stalk (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Tall central stalk
      ctx.fillStyle = '#15803d';
      ctx.fillRect(15, 4, 3, 24);
      // Broad corn leaves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(10, 14, 8, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(22, 12, 8, 3, 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Golden cobs
      ctx.fillStyle = '#facc15';
      ctx.fillRect(11, 16, 5, 8);
      ctx.fillRect(17, 18, 5, 8);
      // Silk tassels
      ctx.fillStyle = '#d97706';
      ctx.fillRect(12, 14, 3, 2);
      ctx.fillRect(18, 16, 3, 2);
      scene.textures.addCanvas('crop_corn_3', canvas);
    }

    // 9. Mature Bioluminescent Glowshroom (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Soft purple bioluminescent stem
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(14, 16, 4, 10);
      // Broad dome cap
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(16, 14, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glowing cyan spots
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(11, 11, 3, 3);
      ctx.fillRect(18, 10, 3, 3);
      ctx.fillRect(14, 16, 2, 2);
      ctx.fillRect(22, 15, 2, 2);
      scene.textures.addCanvas('crop_glowshroom_3', canvas);
    }

    // 10. Mature Golden Oak Sapling (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Woody trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(14, 17, 4, 10);
      // Golden shimmering canopy
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(16, 12, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(15, 10, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Polished golden acorns
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(10, 13, 3, 3);
      ctx.fillRect(19, 11, 3, 3);
      ctx.fillRect(15, 15, 3, 3);
      scene.textures.addCanvas('crop_golden_acorn_3', canvas);
    }
  }

  private static createCookingTextures(scene: Phaser.Scene) {
    // 1. Campfire Prop (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Cobblestone hearth ring
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(16, 18, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dark inner ash pit
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(16, 18, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stone highlights
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6, 14, 3, 3);
      ctx.fillRect(23, 14, 3, 3);
      ctx.fillRect(14, 24, 4, 3);
      // Crossed wooden logs
      ctx.fillStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(9, 21);
      ctx.lineTo(23, 15);
      ctx.moveTo(9, 15);
      ctx.lineTo(23, 21);
      ctx.stroke();
      // Fiery glowing embers
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(16, 17, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Leaping inner flame core
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(16, 5);
      ctx.lineTo(19, 16);
      ctx.lineTo(13, 16);
      ctx.closePath();
      ctx.fill();
      // Spark specks
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(14, 8, 2, 2);
      ctx.fillRect(17, 11, 2, 2);

      scene.textures.addCanvas('prop_campfire', canvas);
    }

    // 2. Bakery Oven Prop (32x48)
    {
      const [canvas, ctx] = this.createCanvas(32, 48);
      // Red brick chimney stack
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(10, 2, 12, 14);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(9, 0, 14, 3);
      // Brick texture lines on chimney
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(11, 5, 4, 2);
      ctx.fillRect(17, 9, 4, 2);

      // Main oven body (terracotta dome)
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(16, 26, 15, Math.PI, 0);
      ctx.lineTo(31, 46);
      ctx.lineTo(1, 46);
      ctx.closePath();
      ctx.fill();

      // Stone base foundation
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 42, 32, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(2, 43, 6, 4);
      ctx.fillRect(13, 43, 7, 4);
      ctx.fillRect(24, 43, 6, 4);

      // Arched oven opening
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(16, 32, 9, Math.PI, 0);
      ctx.lineTo(25, 42);
      ctx.lineTo(7, 42);
      ctx.closePath();
      ctx.fill();

      // Glowing hearth fire inside oven
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(16, 36, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(16, 37, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden bread loaves on cooling rack ledge
      ctx.fillStyle = '#d97706';
      ctx.fillRect(10, 39, 5, 2);
      ctx.fillRect(17, 39, 5, 2);

      scene.textures.addCanvas('prop_bakery_oven', canvas);
    }

    // 3. Dish: Crispy Skewered Minnow (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Wooden skewer stick
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, 27);
      ctx.lineTo(27, 5);
      ctx.stroke();
      // Roasted fish body
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(16, 16, 10, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      // Char marks
      ctx.fillStyle = '#78350f';
      ctx.fillRect(13, 14, 2, 3);
      ctx.fillRect(17, 18, 2, 3);
      ctx.fillRect(19, 12, 2, 2);
      // Herb flecks
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(14, 17, 2, 2);
      ctx.fillRect(17, 13, 2, 2);

      scene.textures.addCanvas('dish_roasted_minnow', canvas);
    }

    // 4. Dish: Meadow Turnip Stew (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Cast iron Dutch pot
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(16, 18, 12, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(3, 14, 26, 4);
      // Pot rim
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 13, 24, 2);
      // Stew broth
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(16, 17, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Turnip cubes floating
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(10, 16, 3, 3);
      ctx.fillRect(16, 15, 4, 3);
      ctx.fillRect(20, 17, 3, 3);
      // Green parsley garnish
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(13, 15, 2, 2);
      ctx.fillRect(18, 18, 2, 2);

      scene.textures.addCanvas('dish_turnip_stew', canvas);
    }

    // 5. Dish: Cob & Trout Chowder (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Ceramic chowder bowl
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(16, 18, 12, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // Blue stoneware rim
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, 14, 24, 3);
      // Cream chowder surface
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.ellipse(16, 17, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sweet corn kernels
      ctx.fillStyle = '#eab308';
      ctx.fillRect(11, 16, 3, 2);
      ctx.fillRect(15, 17, 3, 2);
      ctx.fillRect(19, 16, 3, 2);
      // Trout flaked pieces
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(13, 15, 4, 2);
      ctx.fillRect(17, 18, 3, 2);

      scene.textures.addCanvas('dish_hearty_chowder', canvas);
    }

    // 6. Dish: Golden Berry Galette (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Fluted golden pastry crust
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(16, 16, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(16, 16, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glossy wild strawberry center
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.ellipse(16, 16, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glaze highlights & powdered sugar
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(13, 13, 3, 2);
      ctx.fillRect(18, 16, 3, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 15, 2, 2);
      ctx.fillRect(20, 13, 2, 2);

      scene.textures.addCanvas('dish_berry_tart', canvas);
    }

    // 7. Dish: Astral Sporecap Potage (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Carved wooden trencher bowl
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(16, 18, 12, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(4, 14, 24, 3);
      // Luminescent purple soup broth
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(16, 17, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glowing cyan spores & swirl
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(11, 16, 3, 2);
      ctx.fillRect(17, 16, 3, 2);
      ctx.fillRect(14, 18, 2, 2);
      // Astral starlight glints
      ctx.fillStyle = '#f0abfc';
      ctx.fillRect(13, 14, 2, 2);
      ctx.fillRect(19, 17, 2, 2);

      scene.textures.addCanvas('dish_glowshroom_soup', canvas);
    }

    // 8. Dish: Grandma Bramble's Harvest Pie (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Fluted tin pie dish
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(16, 18, 13, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(3, 14, 26, 3);
      // Golden pie crust
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(16, 16, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pie lattice crust strips
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 14, 16, 2);
      ctx.fillRect(9, 18, 14, 2);
      ctx.fillRect(13, 11, 2, 10);
      ctx.fillRect(17, 11, 2, 10);
      // Bubbling berry filling in openings
      ctx.fillStyle = '#be123c';
      ctx.fillRect(11, 13, 2, 2);
      ctx.fillRect(15, 16, 2, 2);
      ctx.fillRect(19, 13, 2, 2);

      scene.textures.addCanvas('dish_bramble_pie', canvas);
    }

    // 9. Dish: Sunfire Emperor's Banquet (32x32)
    {
      const [canvas, ctx] = this.createCanvas(32, 32);
      // Silver presentation platter
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(16, 18, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(16, 18, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Golden roast centerpiece
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(16, 15, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Amber corn ears & glowing garnish
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(9, 15, 4, 3);
      ctx.fillRect(19, 15, 4, 3);
      // Radiant sparkles
      ctx.fillStyle = '#fde047';
      ctx.fillRect(14, 11, 3, 3);
      ctx.fillRect(8, 12, 2, 2);
      ctx.fillRect(22, 12, 2, 2);

      scene.textures.addCanvas('dish_golden_feast', canvas);
    }
  }
}

