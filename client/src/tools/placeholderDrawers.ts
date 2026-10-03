/**
 * Procedural In-Game Placeholder Drawing Engine for Dev Suite
 * Renders authentic pixel art previews for every target in the game.
 */

export interface TargetMeta {
  key: string;
  name: string;
  category: 'character' | 'monster' | 'npc' | 'prop' | 'tile';
  group: 'Heroes' | 'Enemies' | 'NPCs & Props' | 'Tiles';
  width: number;
  height: number;
  frames: number;
  description: string;
}

export const TARGET_REGISTRY: Record<string, TargetMeta> = {
  player_0: {
    key: 'player_0',
    name: 'Hero (Azure)',
    category: 'character',
    group: 'Heroes',
    width: 32,
    height: 32,
    frames: 12,
    description: 'Default brave traveler in azure tunic and golden cap.'
  },
  player_1: {
    key: 'player_1',
    name: 'Hero (Rose Pink)',
    category: 'character',
    group: 'Heroes',
    width: 32,
    height: 32,
    frames: 12,
    description: 'Charming hero with rose pink tunic and spun-gold hair.'
  },
  player_2: {
    key: 'player_2',
    name: 'Hero (Golden Knight)',
    category: 'character',
    group: 'Heroes',
    width: 32,
    height: 32,
    frames: 12,
    description: 'Stalwart champion in gilded armor with crimson mantle.'
  },
  enemy_slime_blue: {
    key: 'enemy_slime_blue',
    name: 'Bouncy Meadow Slime',
    category: 'monster',
    group: 'Enemies',
    width: 32,
    height: 32,
    frames: 12,
    description: 'Gentle, jelly-like critter bounding along the sunny paths.'
  },
  enemy_slime_red: {
    key: 'enemy_slime_red',
    name: 'Fiery Spore Slime',
    category: 'monster',
    group: 'Enemies',
    width: 32,
    height: 32,
    frames: 12,
    description: 'Combustible crimson slime infused with volatile fungal heat.'
  },
  boss_fungor: {
    key: 'boss_fungor',
    name: 'Spore King Fungor',
    category: 'monster',
    group: 'Enemies',
    width: 48,
    height: 48,
    frames: 12,
    description: 'The ancient fungal monarch wearing an acorn crown.'
  },
  npc_grandma: {
    key: 'npc_grandma',
    name: 'Grandma Bramble',
    category: 'npc',
    group: 'NPCs & Props',
    width: 32,
    height: 32,
    frames: 4,
    description: 'Wise village matriarch famed for her strawberry jam.'
  },
  npc_barnaby: {
    key: 'npc_barnaby',
    name: 'Barnaby the Pelican',
    category: 'npc',
    group: 'NPCs & Props',
    width: 32,
    height: 32,
    frames: 4,
    description: 'Flustered aerial courier whose mail was scattered by the wind.'
  },
  prop_pot: {
    key: 'prop_pot',
    name: 'Clay Pot',
    category: 'prop',
    group: 'NPCs & Props',
    width: 24,
    height: 24,
    frames: 1,
    description: 'Liftable earthenware jar hiding coins or sweet berries.'
  },
  prop_chest: {
    key: 'prop_chest',
    name: 'Treasure Chest',
    category: 'prop',
    group: 'NPCs & Props',
    width: 32,
    height: 24,
    frames: 2,
    description: 'Stout banded chest sealed with an antique brass lock.'
  },
  tile_grass: {
    key: 'tile_grass',
    name: 'Meadow Grass',
    category: 'tile',
    group: 'Tiles',
    width: 32,
    height: 32,
    frames: 1,
    description: 'Lush field ground with wild daisies and golden buttercups.'
  },
  tile_cobble: {
    key: 'tile_cobble',
    name: 'Town Cobblestone',
    category: 'tile',
    group: 'Tiles',
    width: 32,
    height: 32,
    frames: 1,
    description: 'Hand-carved rounded flagstones of the central village plaza.'
  },
  tile_water: {
    key: 'tile_water',
    name: 'River Water',
    category: 'tile',
    group: 'Tiles',
    width: 32,
    height: 32,
    frames: 4,
    description: 'Gentle winding stream with shimmering sunlight caustics.'
  }
};

/**
 * Renders a pixel-perfect procedural preview of any target asset
 */
export function drawPlaceholderPreview(
  targetKey: string,
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  dir: number = 0,
  frame: number = 0
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, viewW, viewH);

  const meta = TARGET_REGISTRY[targetKey] || {
    key: targetKey,
    name: targetKey,
    category: 'character',
    group: 'Heroes',
    width: 32,
    height: 32,
    frames: 12,
    description: ''
  };

  // Center coordinate math
  const scale = Math.max(1, Math.min(Math.floor(viewW / meta.width), Math.floor(viewH / meta.height)));
  const ox = Math.floor((viewW - meta.width * scale) / 2);
  const oy = Math.floor((viewH - meta.height * scale) / 2);

  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  const step = frame % 3;
  const isWalking = step !== 0;

  switch (targetKey) {
    case 'player_0':
    case 'player_1':
    case 'player_2': {
      const palettes = {
        player_0: { tunic: '#3b82f6', shadow: '#1d4ed8', hat: '#fbbf24', hair: '#6b431e' },
        player_1: { tunic: '#ec4899', shadow: '#be185d', hat: '#fde047', hair: '#fef08a' },
        player_2: { tunic: '#eab308', shadow: '#ca8a04', hat: '#ef4444', hair: '#dc2626' }
      };
      const pal = palettes[targetKey as keyof typeof palettes] || palettes.player_0;

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots
      ctx.fillStyle = '#59381c';
      if (!isWalking) {
        ctx.fillRect(11, 24, 4, 5);
        ctx.fillRect(17, 24, 4, 5);
      } else if (step === 1) {
        ctx.fillRect(10, 22, 4, 6);
        ctx.fillRect(18, 25, 4, 4);
      } else {
        ctx.fillRect(10, 25, 4, 4);
        ctx.fillRect(18, 22, 4, 6);
      }

      // Tunic
      ctx.fillStyle = pal.tunic;
      ctx.fillRect(10, 14, 12, 11);
      ctx.fillStyle = pal.shadow;
      ctx.fillRect(10, 22, 12, 3);

      // Belt
      ctx.fillStyle = '#3d2511';
      ctx.fillRect(10, 19, 12, 2);
      ctx.fillStyle = '#e6c843'; // Buckle
      ctx.fillRect(15, 19, 2, 2);

      // Arms
      ctx.fillStyle = '#ffd1a4';
      ctx.fillRect(7, 15, 3, 5);
      ctx.fillRect(22, 15, 3, 5);

      // Head
      ctx.fillStyle = '#ffd1a4';
      ctx.fillRect(11, 8, 10, 7);

      // Hair
      ctx.fillStyle = pal.hair;
      ctx.fillRect(10, 7, 12, 3);

      // Cap
      ctx.fillStyle = pal.hat;
      ctx.fillRect(10, 4, 12, 4);

      // Directional Eyes
      ctx.fillStyle = '#0f172a';
      if (dir === 0) { // Down
        ctx.fillRect(13, 11, 2, 3);
        ctx.fillRect(17, 11, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(13, 11, 1, 1);
        ctx.fillRect(17, 11, 1, 1);
      } else if (dir === 1) { // Left
        ctx.fillRect(11, 11, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 11, 1, 1);
      } else if (dir === 2) { // Right
        ctx.fillRect(19, 11, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 11, 1, 1);
      }
      break;
    }

    case 'enemy_slime_blue':
    case 'enemy_slime_red': {
      const isRed = targetKey === 'enemy_slime_red';
      const bodyColor = isRed ? '#ef4444' : '#38bdf8';
      const shadowColor = isRed ? '#991b1b' : '#0284c7';
      const bob = Math.sin(frame * Math.PI) * 2;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(16, 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slime Body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(8, 12 + bob, 16, 14 - bob, [8, 8, 4, 4]) : ctx.fillRect(8, 12 + bob, 16, 14);
      ctx.fill();

      // Shading rim
      ctx.fillStyle = shadowColor;
      ctx.fillRect(9, 23, 14, 2);

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(10, 14 + bob, 4, 3);

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 17 + bob, 3, 4);
      ctx.fillRect(18, 17 + bob, 3, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(12, 18 + bob, 2, 2);
      ctx.fillRect(19, 18 + bob, 2, 2);

      if (isRed) {
        // Fiery spore core
        ctx.fillStyle = '#facc15';
        ctx.fillRect(15, 14 + bob, 2, 2);
      }
      break;
    }

    case 'boss_fungor': {
      // Mushroom King Baron Fungor
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(24, 43, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(10, 24, 28, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(10, 38, 28, 2);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(14, 22, 20, 18);

      // Purple Cap
      ctx.fillStyle = '#701a75';
      ctx.beginPath();
      ctx.arc(24, 20, 19, Math.PI, 0, false);
      ctx.fill();

      // Cap Rim
      ctx.fillStyle = '#a21caf';
      ctx.beginPath();
      ctx.ellipse(24, 20, 19, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Acorn Crown
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
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(23, 0, 2, 2);

      // Eyes
      ctx.fillStyle = '#581c87';
      ctx.fillRect(16, 23, 4, 2);
      ctx.fillRect(28, 23, 4, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(17, 26, 3, 3);
      ctx.fillRect(28, 26, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 26, 1, 1);
      ctx.fillRect(29, 26, 1, 1);

      // Mossy Mustache
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(20, 33, 6, 3, -0.2, 0, Math.PI * 2);
      ctx.ellipse(28, 33, 6, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'npc_grandma': {
      // Grandma Bramble
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lavender Dress & White Apron
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(10, 12, 12, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(12, 16, 8, 10);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(15, 19, 3, 3);

      // Face & Silver Hair
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(12, 8, 8, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(11, 4, 10, 5);
      ctx.fillRect(13, 2, 6, 3);

      // Spectacles
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(12.5, 9.5, 3, 3);
      ctx.strokeRect(16.5, 9.5, 3, 3);
      break;
    }

    case 'npc_barnaby': {
      // Barnaby Pelican
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 28, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Body
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, 10, 12, 14);

      // Navy Blue Vest & Messenger Bag
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(9, 14, 14, 8);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(12, 17, 8, 5);

      // Beak
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(12, 8, 8, 5);
      ctx.fillRect(14, 13, 4, 3);

      // Cap
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(11, 4, 10, 3);

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(13, 7, 2, 2);
      ctx.fillRect(17, 7, 2, 2);
      break;
    }

    case 'prop_pot': {
      // Terracotta Pot
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(6, 7, 12, 12, 3) : ctx.fillRect(6, 7, 12, 12);
      ctx.fill();

      // Rim
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(5, 5, 14, 3);

      // Geometric band
      ctx.fillStyle = '#78350f';
      ctx.fillRect(7, 11, 10, 2);
      break;
    }

    case 'prop_chest': {
      // Treasure Chest
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(16, 21, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Oak wood
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, 6, 22, 14);

      // Brass bands
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(5, 5, 22, 3);
      ctx.fillRect(8, 6, 2, 14);
      ctx.fillRect(22, 6, 2, 14);

      // Keyhole
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(15, 12, 2, 3);
      break;
    }

    case 'tile_grass': {
      // Lush Meadow Grass
      ctx.fillStyle = '#4f933b';
      ctx.fillRect(0, 0, 32, 32);

      // Blades
      ctx.fillStyle = '#73bf48';
      for (let i = 0; i < 32; i += 8) {
        for (let j = 0; j < 32; j += 8) {
          ctx.fillRect(i + 2, j + 2, 2, 2);
        }
      }

      // Daisies & Buttercups
      ctx.fillStyle = '#facc15';
      ctx.fillRect(8, 14, 2, 2);
      ctx.fillRect(24, 22, 2, 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, 10, 3, 3);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(23, 11, 1, 1);

      ctx.fillStyle = '#f472b6';
      ctx.fillRect(6, 26, 2, 2);
      break;
    }

    case 'tile_cobble': {
      // Cobblestone Plaza
      ctx.fillStyle = '#7a8277';
      ctx.fillRect(0, 0, 32, 32);

      ctx.fillStyle = '#9da599';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(1, 1, 14, 14, 2) : ctx.fillRect(1, 1, 14, 14);
      ctx.roundRect ? ctx.roundRect(17, 1, 14, 14, 2) : ctx.fillRect(17, 1, 14, 14);
      ctx.roundRect ? ctx.roundRect(1, 17, 12, 14, 2) : ctx.fillRect(1, 17, 12, 14);
      ctx.roundRect ? ctx.roundRect(15, 17, 16, 14, 2) : ctx.fillRect(15, 17, 16, 14);
      ctx.fill();

      ctx.fillStyle = '#b8c0b3';
      ctx.fillRect(3, 2, 8, 2);
      ctx.fillRect(19, 2, 8, 2);
      ctx.fillRect(17, 18, 8, 2);
      break;
    }

    case 'tile_water': {
      // River Water with Animated Wave Shimmer
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 32, 32);

      const waveShift = (frame * 3) % 16;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4 + waveShift, 8, 6, 2);
      ctx.fillRect(18 - waveShift, 18, 7, 2);
      ctx.fillRect(8 + waveShift, 26, 5, 2);

      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(6 + waveShift, 9, 2, 1);
      ctx.fillRect(20 - waveShift, 19, 2, 1);
      break;
    }

    default: {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(4, 4, meta.width - 8, meta.height - 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(targetKey.slice(0, 4), 6, meta.height / 2);
      break;
    }
  }

  ctx.restore();
}

/**
 * Generates ready-to-test sample spritesheets directly in the browser
 */
export function generateSampleSheetDataUrl(type: 'hero' | 'slime' | 'tiles' | 'props'): {
  dataUrl: string;
  name: string;
  frameW: number;
  frameH: number;
  category: string;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (type === 'hero') {
    canvas.width = 96;
    canvas.height = 128;
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        ctx.save();
        ctx.translate(f * 32, d * 32);
        drawPlaceholderPreview('player_0', ctx, 32, 32, d, f);
        ctx.restore();
      }
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      name: 'sample_hero_adventurer.png',
      frameW: 32,
      frameH: 32,
      category: 'character'
    };
  }

  if (type === 'slime') {
    canvas.width = 96;
    canvas.height = 128;
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        ctx.save();
        ctx.translate(f * 32, d * 32);
        drawPlaceholderPreview('enemy_slime_blue', ctx, 32, 32, d, f);
        ctx.restore();
      }
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      name: 'sample_meadow_slime.png',
      frameW: 32,
      frameH: 32,
      category: 'monster'
    };
  }

  if (type === 'tiles') {
    canvas.width = 96;
    canvas.height = 64;
    const tiles = ['tile_grass', 'tile_cobble', 'tile_water'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.save();
        ctx.translate(c * 16, r * 16);
        const t = tiles[(r + c) % tiles.length]!;
        drawPlaceholderPreview(t, ctx, 16, 16, 0, (r * 6 + c) % 4);
        ctx.restore();
      }
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      name: 'sample_meadow_tileset.png',
      frameW: 16,
      frameH: 16,
      category: 'tile'
    };
  }

  // props
  canvas.width = 64;
  canvas.height = 64;
  const props = ['prop_pot', 'prop_chest', 'prop_pot', 'prop_chest'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.save();
      ctx.translate(c * 32, r * 32);
      const p = props[r * 2 + c]!;
      drawPlaceholderPreview(p, ctx, 32, 32, 0, 0);
      ctx.restore();
    }
  }
  return {
    dataUrl: canvas.toDataURL('image/png'),
    name: 'sample_dungeon_props.png',
    frameW: 32,
    frameH: 32,
    category: 'item'
  };
}
