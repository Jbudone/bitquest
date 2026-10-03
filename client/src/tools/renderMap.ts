import { TextureGenerator } from '../art/TextureGenerator';

export function renderFullMap(): HTMLCanvasElement {
  const textures = new Map<string, HTMLCanvasElement>();

  // Mock scene to capture generated canvases
  const mockScene = {
    textures: {
      addCanvas: (key: string, canvas: HTMLCanvasElement) => {
        textures.set(key, canvas);
      }
    }
  };

  TextureGenerator.generateAll(mockScene as any);

  const canvas = (document.getElementById('map-canvas') as HTMLCanvasElement) || document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1792;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const TILE = 32;
  const MAP_W = 64; // 2048px
  const MAP_H = 56; // 1792px

  const drawTile = (key: string, x: number, y: number) => {
    const t = textures.get(key);
    if (t) {
      ctx.drawImage(t, x, y);
    }
  };

  // 1. Base Terrain
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let tileKey = 'tile_grass';

      // Fungal Hollow (Full West side, x < 20)
      if (x < 20) {
        tileKey = 'tile_fungal_grass';
      }
      // Sunken Ruins (North, x: 20 to 43, y: 2 to 17)
      else if (x >= 20 && x <= 43 && y <= 17) {
        tileKey = 'tile_ruins_floor';
      }
      // Oakhaven Town Plaza (Center, x: 24 to 39, y: 24 to 35)
      else if (x >= 24 && x <= 39 && y >= 24 && y <= 35) {
        tileKey = 'tile_cobble';
      }

      drawTile(tileKey, x * TILE, y * TILE);
    }
  }

  // 2. Dirt Connecting Pathways
  // North path towards Sunken Gate (x: 31-32, y: 17 to 23)
  for (let y = 17; y < 24; y++) {
    drawTile('tile_dirt', 31 * TILE, y * TILE);
    drawTile('tile_dirt', 32 * TILE, y * TILE);
  }
  // East path to Whispering Meadow (x: 40 to 52, y: 29-30)
  for (let x = 40; x <= 52; x++) {
    drawTile('tile_dirt', x * TILE, 29 * TILE);
    drawTile('tile_dirt', x * TILE, 30 * TILE);
  }
  // West path to Fungal Hollow (x: 12 to 23, y: 29-30)
  for (let x = 12; x <= 23; x++) {
    drawTile('tile_dirt', x * TILE, 29 * TILE);
    drawTile('tile_dirt', x * TILE, 30 * TILE);
  }
  // South path towards Crystal Lake (x: 31-32, y: 36 to 40)
  for (let y = 36; y <= 40; y++) {
    drawTile('tile_dirt', 31 * TILE, y * TILE);
    drawTile('tile_dirt', 32 * TILE, y * TILE);
  }

  // 3. Whispering Meadow Azure River (x: 52-53, y: 1 to 54)
  for (let y = 1; y <= 54; y++) {
    for (let x = 52; x <= 53; x++) {
      if (y === 29 || y === 30) {
        drawTile('tile_bridge_wood', x * TILE, y * TILE);
      } else {
        drawTile('tile_water', x * TILE, y * TILE);
      }
    }
  }

  // 4. South Crystal Lake (tileX: 22 to 42, tileY: 41 to 54)
  for (let y = 41; y <= 54; y++) {
    for (let x = 22; x <= 42; x++) {
      if ((x === 31 || x === 32) && y <= 44) {
        drawTile('tile_bridge_wood', x * TILE, y * TILE);
      } else {
        drawTile('tile_water', x * TILE, y * TILE);
      }
    }
  }

  // 5. Town Square Cottages
  const drawCottage = (tileX: number, tileY: number, w: number, h: number, label: string) => {
    // Roof
    for (let x = 0; x < w; x++) {
      drawTile('tile_roof_red', (tileX + x) * TILE, (tileY - 1) * TILE);
    }
    // Walls
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        drawTile('tile_wall_wood', (tileX + x) * TILE, (tileY + y) * TILE);
      }
    }
    // Sign above door
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    const signX = (tileX + w / 2) * TILE;
    const signY = (tileY - 1) * TILE - 4;
    ctx.strokeText(label, signX, signY);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(label, signX, signY);
    ctx.restore();
  };

  // West: Post Office (tileX: 22, tileY: 25, 4x3)
  drawCottage(22, 25, 4, 3, 'Post & Courier');
  // East: Grandma Bramble's Blackberry Bakery (tileX: 38, tileY: 25, 4x3)
  drawCottage(38, 25, 4, 3, 'Bramble Jam Bakery');

  // 6. Ancient Ruins Perimeter Walls (North, x: 20 to 43, y: 16)
  for (let x = 20; x <= 43; x++) {
    if (x !== 31 && x !== 32) {
      drawTile('tile_wall_stone', x * TILE, 16 * TILE);
    }
  }
  for (let x = 20; x <= 43; x++) {
    drawTile('tile_wall_stone', x * TILE, 2 * TILE);
  }
  for (let y = 2; y <= 16; y++) {
    drawTile('tile_wall_stone', 20 * TILE, y * TILE);
    drawTile('tile_wall_stone', 43 * TILE, y * TILE);
  }

  // 7. Outer World Borders (Dense Tree / Fungal Canopies)
  for (let x = 0; x < MAP_W; x++) {
    const topTex = (x < 20) ? 'tile_fungal_canopy' : 'tile_tree_canopy';
    drawTile(topTex, x * TILE, 0);
    drawTile('tile_tree_canopy', x * TILE, (MAP_H - 1) * TILE);
  }
  for (let y = 0; y < MAP_H; y++) {
    drawTile('tile_fungal_canopy', 0, y * TILE);
    drawTile('tile_tree_canopy', (MAP_W - 1) * TILE, y * TILE);
  }

  // 8. Ancient Gate (closed) at (1024, 512) -> size: 64x48
  const gateCanvas = textures.get('gate_closed');
  if (gateCanvas) {
    ctx.drawImage(gateCanvas, 1024 - 32, 512 - 24);
  }

  // 9. Sun Stone Switches at (960, 560) and (1088, 560) -> 32x32
  const switchCanvas = textures.get('switch_up');
  if (switchCanvas) {
    ctx.drawImage(switchCanvas, 960 - 16, 560 - 16);
    ctx.drawImage(switchCanvas, 1088 - 16, 560 - 16);
  }

  // 10. Notice Boards & Inscriptions -> 24x24
  const signCanvas = textures.get('ent_sign');
  if (signCanvas) {
    ctx.drawImage(signCanvas, 1024 - 12, 870 - 12);
    ctx.drawImage(signCanvas, 1024 - 12, 600 - 12);
  }

  // 11. Ancient Pillars (North Ruins) -> 32x48
  const pillarCanvas = textures.get('ent_pillar');
  if (pillarCanvas) {
    const pillars = [
      { x: 928, y: 220 },
      { x: 1120, y: 220 },
      { x: 928, y: 380 },
      { x: 1120, y: 380 }
    ];
    pillars.forEach(p => {
      ctx.drawImage(pillarCanvas, p.x - 16, p.y - 24);
    });
  }

  // 12. Giant Bioluminescent Mushrooms (Fungal Hollow) -> 32x48
  const mushCanvas = textures.get('ent_mushroom_giant');
  if (mushCanvas) {
    const mushrooms = [
      { x: 240, y: 740 },
      { x: 540, y: 720 },
      { x: 260, y: 1120 },
      { x: 520, y: 1160 }
    ];
    mushrooms.forEach(m => {
      ctx.drawImage(mushCanvas, m.x - 16, m.y - 24);
    });
  }

  // 13. Bushes -> 32x32
  const bushCanvas = textures.get('ent_bush');
  if (bushCanvas) {
    const bushes = [
      { x: 920, y: 880 }, { x: 952, y: 880 }, { x: 920, y: 912 }, { x: 952, y: 912 },
      { x: 1096, y: 880 }, { x: 1128, y: 880 }, { x: 1096, y: 912 }, { x: 1128, y: 912 },
      { x: 1480, y: 760 }, { x: 1512, y: 760 }, { x: 1544, y: 760 },
      { x: 1650, y: 860 }, { x: 1682, y: 860 }, { x: 1714, y: 860 },
      { x: 1560, y: 1020 }, { x: 1592, y: 1020 },
      { x: 340, y: 820 }, { x: 372, y: 820 }, { x: 480, y: 960 }, { x: 512, y: 960 }
    ];
    bushes.forEach(b => {
      ctx.drawImage(bushCanvas, b.x - 16, b.y - 16);
    });
  }

  // 14. Pots -> 24x24
  const potCanvas = textures.get('ent_pot');
  if (potCanvas) {
    const pots = [
      { x: 830, y: 850 }, { x: 855, y: 850 },
      { x: 1195, y: 850 }, { x: 1220, y: 850 },
      { x: 1000, y: 970 }, { x: 1048, y: 970 },
      { x: 930, y: 600 }, { x: 1118, y: 600 },
      { x: 380, y: 890 }, { x: 440, y: 940 },
      { x: 960, y: 340 }, { x: 1088, y: 340 }
    ];
    pots.forEach(p => {
      ctx.drawImage(potCanvas, p.x - 12, p.y - 12);
    });
  }

  // 15. Quest Items (Letters) -> 16x16
  const letterCanvas = textures.get('item_letter');
  if (letterCanvas) {
    const letters = [
      { x: 1720, y: 840 },
      { x: 320, y: 920 },
      { x: 880, y: 1300 }
    ];
    letters.forEach(l => {
      ctx.drawImage(letterCanvas, l.x - 8, l.y - 8);
    });
  }

  return canvas;
}

// Auto-run when in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = renderFullMap();
    console.log('Map rendered at 2048x1792');

    // Notify or post to exporter endpoint if running
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await fetch('http://localhost:3002/save', {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: blob
        });
        console.log('[renderMap] Successfully exported map PNG to receiver!');
      } catch (e) {
        // receiver may not be active yet
      }
    }, 'image/png');
  });
}
