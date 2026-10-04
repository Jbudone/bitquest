/**
 * BitQuest - Palette Harmonizer & Contrast Accessibility Auditor (Issue #36)
 * Audits sprite and terrain color palettes, computes color histograms,
 * calculates WCAG 2.1 relative luminance and contrast ratios, simulates
 * Color Vision Deficiency (protanopia, deuteranopia, tritanopia), and
 * auto-generates high-contrast outlines for low-contrast matchups (< 3.5:1).
 */

import { PixelBuffer } from './generate_hitboxes';

// ============================================================================
// 1. Color Math, Luminance & WCAG 2.1 Contrast
// ============================================================================

export type CVDType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses hex color string (#rgb, #rrggbb, #rrggbbaa) to RGBA object.
 */
export function hexToRgba(hex: string): RGBA {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    clean += 'ff';
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: num & 255
  };
}

/**
 * Converts RGBA to standard 6-digit hex string (#rrggbb).
 */
export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts sRGB channel component [0, 255] to linear light.
 */
export function linearizeChannel(val: number): number {
  const s = val / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Calculates WCAG 2.1 Relative Luminance L in range [0.0, 1.0].
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const rLin = linearizeChannel(r);
  const gLin = linearizeChannel(g);
  const bLin = linearizeChannel(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.1 Contrast Ratio between two luminances.
 * Returns value in range [1.0, 21.0].
 */
export function calculateContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Simulates Color Vision Deficiency (CVD) using standard physiological transformation matrices.
 */
export function simulateCVD(r: number, g: number, b: number, type: CVDType): RGBA {
  let simR = r;
  let simG = g;
  let simB = b;

  if (type === 'protanopia') {
    // Red-blind (L-cone deficiency)
    simR = 0.56667 * r + 0.43333 * g + 0.0 * b;
    simG = 0.55833 * r + 0.44167 * g + 0.0 * b;
    simB = 0.0 * r + 0.24167 * g + 0.75833 * b;
  } else if (type === 'deuteranopia') {
    // Green-blind (M-cone deficiency)
    simR = 0.625 * r + 0.375 * g + 0.0 * b;
    simG = 0.70 * r + 0.30 * g + 0.0 * b;
    simB = 0.0 * r + 0.30 * g + 0.70 * b;
  } else if (type === 'tritanopia') {
    // Blue-blind (S-cone deficiency)
    simR = 0.95 * r + 0.05 * g + 0.0 * b;
    simG = 0.0 * r + 0.43333 * g + 0.56667 * b;
    simB = 0.0 * r + 0.475 * g + 0.525 * b;
  }

  return {
    r: Math.max(0, Math.min(255, Math.round(simR))),
    g: Math.max(0, Math.min(255, Math.round(simG))),
    b: Math.max(0, Math.min(255, Math.round(simB))),
    a: 255
  };
}

// ============================================================================
// 2. Color Histogram Extraction
// ============================================================================

export interface ColorHistogramEntry {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percentage: number;
  luminance: number;
}

export interface ColorHistogram {
  totalOpaquePixels: number;
  entries: ColorHistogramEntry[];
  dominantColors: ColorHistogramEntry[];
  weightedLuminance: number;
  minLuminance: number;
  maxLuminance: number;
}

export interface HistogramOptions {
  alphaThreshold?: number; // Minimum alpha to consider opaque (default 32)
  dominantCount?: number;   // Top N dominant colors to extract (default 4)
}

/**
 * Extracts color histogram and weighted luminance from a PixelBuffer.
 */
export function extractColorHistogram(
  buffer: PixelBuffer,
  options: HistogramOptions = {}
): ColorHistogram {
  const alphaThreshold = options.alphaThreshold ?? 32;
  const dominantCount = options.dominantCount ?? 4;

  const colorMap = new Map<string, { r: number; g: number; b: number; count: number; lum: number }>();
  let totalOpaquePixels = 0;

  const total = buffer.width * buffer.height;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const a = buffer.data[idx + 3];
    if (a < alphaThreshold) continue;

    const r = buffer.data[idx];
    const g = buffer.data[idx + 1];
    const b = buffer.data[idx + 2];
    const hex = rgbaToHex(r, g, b);

    totalOpaquePixels++;
    const existing = colorMap.get(hex);
    if (existing) {
      existing.count++;
    } else {
      const lum = calculateLuminance(r, g, b);
      colorMap.set(hex, { r, g, b, count: 1, lum });
    }
  }

  if (totalOpaquePixels === 0) {
    return {
      totalOpaquePixels: 0,
      entries: [],
      dominantColors: [],
      weightedLuminance: 0,
      minLuminance: 0,
      maxLuminance: 0
    };
  }

  const entries: ColorHistogramEntry[] = Array.from(colorMap.entries()).map(([hex, data]) => ({
    hex,
    r: data.r,
    g: data.g,
    b: data.b,
    count: data.count,
    percentage: data.count / totalOpaquePixels,
    luminance: data.lum
  }));

  // Sort descending by count
  entries.sort((a, b) => b.count - a.count);

  let weightedLumSum = 0;
  let minLuminance = 1.0;
  let maxLuminance = 0.0;

  for (const entry of entries) {
    weightedLumSum += entry.luminance * entry.count;
    if (entry.luminance < minLuminance) minLuminance = entry.luminance;
    if (entry.luminance > maxLuminance) maxLuminance = entry.luminance;
  }

  const weightedLuminance = weightedLumSum / totalOpaquePixels;
  const dominantColors = entries.slice(0, dominantCount);

  return {
    totalOpaquePixels,
    entries,
    dominantColors,
    weightedLuminance,
    minLuminance,
    maxLuminance
  };
}

// ============================================================================
// 3. Auto-Outline Recommendation & Generation
// ============================================================================

export interface OutlineRecommendation {
  outlineHex: string;
  outlineLuminance: number;
  contrastAgainstTerrain: number;
  contrastAgainstSprite: number;
  strategy: 'dark_silhouette' | 'bright_halo' | 'golden_accent';
}

/**
 * Recommends optimal outline color that guarantees high contrast (>= 4.5:1) against terrain.
 */
export function recommendOutlineColor(
  terrainLuminance: number,
  spriteLuminance: number
): OutlineRecommendation {
  const candidates: Array<{ hex: string; r: number; g: number; b: number; strategy: 'dark_silhouette' | 'bright_halo' | 'golden_accent' }> = [
    { hex: '#000000', r: 0, g: 0, b: 0, strategy: 'dark_silhouette' },
    { hex: '#0f172a', r: 15, g: 23, b: 42, strategy: 'dark_silhouette' },
    { hex: '#ffffff', r: 255, g: 255, b: 255, strategy: 'bright_halo' },
    { hex: '#fde047', r: 253, g: 224, b: 71, strategy: 'golden_accent' }
  ];

  const evaluated = candidates.map(cand => {
    const lum = calculateLuminance(cand.r, cand.g, cand.b);
    const crTerrain = calculateContrastRatio(lum, terrainLuminance);
    const crSprite = calculateContrastRatio(lum, spriteLuminance);
    return { ...cand, lum, crTerrain, crSprite };
  });

  // Filter candidates that achieve >= 4.5:1 contrast against terrain
  const viable = evaluated.filter(c => c.crTerrain >= 4.5);
  const best = viable.length > 0
    ? viable.sort((a, b) => b.crSprite - a.crSprite)[0]
    : evaluated.sort((a, b) => b.crTerrain - a.crTerrain)[0];

  return {
    outlineHex: best.hex,
    outlineLuminance: best.lum,
    contrastAgainstTerrain: Math.round(best.crTerrain * 100) / 100,
    contrastAgainstSprite: Math.round(best.crSprite * 100) / 100,
    strategy: best.strategy
  };
}

/**
 * Dilates sprite alpha contour by 1 pixel to generate a high-contrast pixel outline buffer.
 */
export function generateSpriteOutline(
  sprite: PixelBuffer,
  outlineHex: string = '#0f172a',
  thickness: number = 1
): PixelBuffer {
  const { r: or, g: og, b: ob, a: oa } = hexToRgba(outlineHex);

  const outW = sprite.width + thickness * 2;
  const outH = sprite.height + thickness * 2;
  const output = new PixelBuffer(outW, outH);

  // Step 1: Detect all pixels that should receive outline
  // An outline pixel is an empty pixel (a < 32) adjacent to an opaque pixel (a >= 32)
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const alpha = sprite.getAlpha(sx, sy);
      if (alpha < 32) continue;

      // Expand into neighborhood in output buffer
      const dx = sx + thickness;
      const dy = sy + thickness;

      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          if (ox === 0 && oy === 0) continue;
          const tx = dx + ox;
          const ty = dy + oy;
          if (tx >= 0 && tx < outW && ty >= 0 && ty < outH) {
            // Place outline if not already marked
            if (output.getAlpha(tx, ty) === 0) {
              output.setPixel(tx, ty, or, og, ob, oa);
            }
          }
        }
      }
    }
  }

  // Step 2: Overlay original sprite pixels over the outline layer
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const idx = (sy * sprite.width + sx) * 4;
      const a = sprite.data[idx + 3];
      if (a >= 32) {
        const dx = sx + thickness;
        const dy = sy + thickness;
        output.setPixel(dx, dy, sprite.data[idx], sprite.data[idx + 1], sprite.data[idx + 2], a);
      }
    }
  }

  return output;
}

// ============================================================================
// 4. Sprite vs Terrain Contrast Audit Engine
// ============================================================================

export interface MatchupAuditResult {
  spriteId: string;
  spriteName: string;
  terrainId: string;
  terrainName: string;
  spriteWeightedLuminance: number;
  terrainWeightedLuminance: number;
  rawContrastRatio: number;
  wcagPass: boolean;
  needsOutline: boolean;
  recommendedOutline?: OutlineRecommendation;
  cvdContrast: {
    protanopia: number;
    deuteranopia: number;
    tritanopia: number;
  };
}

/**
 * Audits contrast between a sprite and terrain, checking the minimum 3.5:1 WCAG requirement.
 */
export function auditSpriteAgainstTerrain(
  spriteBuffer: PixelBuffer,
  terrainBuffer: PixelBuffer,
  spriteId: string,
  spriteName: string,
  terrainId: string,
  terrainName: string,
  minContrastThreshold: number = 3.5
): MatchupAuditResult {
  const spriteHist = extractColorHistogram(spriteBuffer);
  const terrainHist = extractColorHistogram(terrainBuffer);

  const rawCr = calculateContrastRatio(spriteHist.weightedLuminance, terrainHist.weightedLuminance);
  const roundedCr = Math.round(rawCr * 100) / 100;
  const wcagPass = roundedCr >= minContrastThreshold;
  const needsOutline = !wcagPass;

  // Calculate CVD contrast ratios
  const cvdTypes: CVDType[] = ['protanopia', 'deuteranopia', 'tritanopia'];
  const cvdCr: { protanopia: number; deuteranopia: number; tritanopia: number } = {
    protanopia: roundedCr,
    deuteranopia: roundedCr,
    tritanopia: roundedCr
  };

  // Sample primary dominant colors under CVD
  const spriteDom = spriteHist.dominantColors[0] || { r: 128, g: 128, b: 128 };
  const terrainDom = terrainHist.dominantColors[0] || { r: 128, g: 128, b: 128 };

  for (const t of cvdTypes) {
    const sCvd = simulateCVD(spriteDom.r, spriteDom.g, spriteDom.b, t);
    const tCvd = simulateCVD(terrainDom.r, terrainDom.g, terrainDom.b, t);
    const sLum = calculateLuminance(sCvd.r, sCvd.g, sCvd.b);
    const tLum = calculateLuminance(tCvd.r, tCvd.g, tCvd.b);
    cvdCr[t] = Math.round(calculateContrastRatio(sLum, tLum) * 100) / 100;
  }

  let recommendedOutline: OutlineRecommendation | undefined;
  if (needsOutline) {
    recommendedOutline = recommendOutlineColor(
      terrainHist.weightedLuminance,
      spriteHist.weightedLuminance
    );
  }

  return {
    spriteId,
    spriteName,
    terrainId,
    terrainName,
    spriteWeightedLuminance: Math.round(spriteHist.weightedLuminance * 1000) / 1000,
    terrainWeightedLuminance: Math.round(terrainHist.weightedLuminance * 1000) / 1000,
    rawContrastRatio: roundedCr,
    wcagPass,
    needsOutline,
    recommendedOutline,
    cvdContrast: cvdCr
  };
}

// ============================================================================
// 5. Canonical BitQuest Sprite & Terrain Palette Roster
// ============================================================================

export interface PaletteAsset {
  id: string;
  name: string;
  category: 'character' | 'monster' | 'item' | 'terrain';
  render: () => PixelBuffer;
}

export function createTerrainTile(id: string, name: string, baseR: number, baseG: number, baseB: number, detailR: number, detailG: number, detailB: number): PixelBuffer {
  const buf = new PixelBuffer(16, 16);
  buf.fillRect(0, 0, 16, 16, baseR, baseG, baseB);
  // Add procedural pixel texture details
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      if ((x * 3 + y * 7) % 5 === 0) {
        buf.fillRect(x, y, 2, 2, detailR, detailG, detailB);
      }
    }
  }
  return buf;
}

export const CANONICAL_TERRAINS: PaletteAsset[] = [
  {
    id: 'tile_meadow_grass',
    name: 'Lush Meadow Grass',
    category: 'terrain',
    render: () => createTerrainTile('tile_meadow_grass', 'Lush Meadow Grass', 79, 147, 59, 115, 191, 72) // #4f933b & #73bf48
  },
  {
    id: 'tile_fungal_grass',
    name: 'Fungal Hollow Mire',
    category: 'terrain',
    render: () => createTerrainTile('tile_fungal_grass', 'Fungal Hollow Mire', 59, 45, 84, 88, 28, 135) // #3b2d54 & #581c87
  },
  {
    id: 'tile_cobble_plaza',
    name: 'Oakhaven Cobblestone Plaza',
    category: 'terrain',
    render: () => createTerrainTile('tile_cobble_plaza', 'Oakhaven Cobblestone Plaza', 122, 130, 119, 157, 165, 153) // #7a8277 & #9da599
  },
  {
    id: 'tile_dirt_path',
    name: 'Worn Dirt Pathway',
    category: 'terrain',
    render: () => createTerrainTile('tile_dirt_path', 'Worn Dirt Pathway', 140, 103, 71, 160, 120, 85) // #8c6747 & #a07855
  },
  {
    id: 'tile_ruins_floor',
    name: 'Sunken Ruins Slate',
    category: 'terrain',
    render: () => createTerrainTile('tile_ruins_floor', 'Sunken Ruins Slate', 100, 116, 139, 71, 85, 105) // #64748b & #475569
  },
  {
    id: 'tile_water_lake',
    name: 'Crystal Lake Water',
    category: 'terrain',
    render: () => createTerrainTile('tile_water_lake', 'Crystal Lake Water', 37, 99, 235, 59, 130, 246) // #2563eb & #3b82f6
  },
  {
    id: 'tile_beach_sand',
    name: 'River Beach Sand',
    category: 'terrain',
    render: () => createTerrainTile('tile_beach_sand', 'River Beach Sand', 224, 197, 136, 212, 180, 114) // #e0c588 & #d4b472
  },
  {
    id: 'tile_catacombs_floor',
    name: 'Dark Catacombs Stone',
    category: 'terrain',
    render: () => createTerrainTile('tile_catacombs_floor', 'Dark Catacombs Stone', 51, 65, 85, 30, 41, 59) // #334155 & #1e293b
  }
];

export const CANONICAL_SPRITES: PaletteAsset[] = [
  {
    id: 'player_hero',
    name: 'Hero Adventurer',
    category: 'character',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(5, 2, 6, 5, 251, 191, 36);   // Blonde hair #fbbf24
      buf.fillRect(5, 5, 6, 4, 254, 215, 170);  // Skin tone #fed7aa
      buf.fillRect(4, 9, 8, 5, 59, 130, 246);   // Blue tunic #3b82f6
      buf.fillRect(5, 14, 6, 2, 120, 53, 15);   // Brown boots #78350f
      return buf;
    }
  },
  {
    id: 'enemy_slime_green',
    name: 'Meadow Jelly Slime',
    category: 'monster',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(4, 6, 8, 8, 16, 185, 129);   // Green slime #10b981
      buf.fillRect(5, 4, 6, 2, 52, 211, 153);   // Highlight #34d399
      buf.fillRect(6, 8, 1, 2, 255, 255, 255);  // Eye white
      buf.fillRect(9, 8, 1, 2, 255, 255, 255);
      return buf;
    }
  },
  {
    id: 'enemy_slime_red',
    name: 'Fiery Spore Slime',
    category: 'monster',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(4, 6, 8, 8, 239, 68, 68);    // Fiery red #ef4444
      buf.fillRect(5, 4, 6, 2, 248, 113, 113);  // Highlight #f87171
      buf.fillRect(6, 8, 1, 2, 255, 255, 255);
      buf.fillRect(9, 8, 1, 2, 255, 255, 255);
      return buf;
    }
  },
  {
    id: 'enemy_bat_shadow',
    name: 'Cave Shadow Bat',
    category: 'monster',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(2, 6, 12, 6, 30, 41, 59);    // Charcoal body #1e293b
      buf.fillRect(5, 4, 6, 4, 15, 23, 42);     // Deep midnight head #0f172a
      buf.fillRect(6, 6, 1, 1, 239, 68, 68);    // Red glowing eyes
      buf.fillRect(9, 6, 1, 1, 239, 68, 68);
      return buf;
    }
  },
  {
    id: 'enemy_skeleton',
    name: 'Catacombs Skeleton',
    category: 'monster',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(5, 3, 6, 5, 241, 245, 249);  // Bone white #f1f5f9
      buf.fillRect(6, 8, 4, 5, 203, 213, 225);  // Ribs #cbd5e1
      buf.fillRect(5, 13, 6, 3, 148, 163, 184); // Legs #94a3b8
      buf.fillRect(6, 5, 1, 1, 15, 23, 42);     // Eye socket
      buf.fillRect(9, 5, 1, 1, 15, 23, 42);
      return buf;
    }
  },
  {
    id: 'item_gold_coin',
    name: 'Shiny Gold Coin',
    category: 'item',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(5, 5, 6, 6, 241, 196, 15);   // Bright gold #f1c40f
      buf.fillRect(6, 4, 4, 8, 245, 158, 11);   // Amber rim #f59e0b
      buf.fillRect(7, 7, 2, 2, 254, 240, 138);  // Specular glint #fef08a
      return buf;
    }
  },
  {
    id: 'item_mana_potion',
    name: 'Azure Mana Potion',
    category: 'item',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(5, 6, 6, 7, 37, 99, 235);    // Azure liquid #2563eb
      buf.fillRect(7, 3, 2, 3, 180, 83, 9);     // Cork stopper #b45309
      buf.fillRect(6, 7, 1, 3, 147, 197, 253);  // Glass highlight #93c5fd
      return buf;
    }
  },
  {
    id: 'item_health_potion',
    name: 'Ruby Health Potion',
    category: 'item',
    render: () => {
      const buf = new PixelBuffer(16, 16);
      buf.fillRect(5, 6, 6, 7, 239, 68, 68);    // Ruby red liquid #ef4444
      buf.fillRect(7, 3, 2, 3, 180, 83, 9);     // Cork stopper #b45309
      buf.fillRect(6, 7, 1, 3, 252, 165, 165);  // Glass highlight #fca5a5
      return buf;
    }
  }
];

// ============================================================================
// 6. Comprehensive Palette Audit Suite
// ============================================================================

export interface PaletteAuditSummary {
  timestamp: number;
  totalMatchups: number;
  passingMatchups: number;
  lowContrastMatchups: number;
  autoOutlinedMatchups: number;
  passRatePercent: number;
  matchups: MatchupAuditResult[];
  unresolvedFailures: number;
}

/**
 * Runs complete contrast audit across all canonical sprites and terrains.
 */
export function runPaletteAudit(
  sprites: PaletteAsset[] = CANONICAL_SPRITES,
  terrains: PaletteAsset[] = CANONICAL_TERRAINS,
  minContrastThreshold: number = 3.5
): PaletteAuditSummary {
  const matchups: MatchupAuditResult[] = [];
  let passing = 0;
  let lowContrast = 0;
  let autoOutlined = 0;
  let unresolvedFailures = 0;

  for (const sprite of sprites) {
    const sBuf = sprite.render();
    for (const terrain of terrains) {
      const tBuf = terrain.render();
      const result = auditSpriteAgainstTerrain(
        sBuf,
        tBuf,
        sprite.id,
        sprite.name,
        terrain.id,
        terrain.name,
        minContrastThreshold
      );

      matchups.push(result);

      if (result.wcagPass) {
        passing++;
      } else {
        lowContrast++;
        if (result.recommendedOutline) {
          // Verify that applying the recommended outline satisfies the WCAG threshold
          const outlinedBuf = generateSpriteOutline(sBuf, result.recommendedOutline.outlineHex, 1);
          const outlinedAudit = auditSpriteAgainstTerrain(
            outlinedBuf,
            tBuf,
            `${sprite.id}_outlined`,
            `${sprite.name} (Outlined)`,
            terrain.id,
            terrain.name,
            minContrastThreshold
          );

          if (outlinedAudit.wcagPass || result.recommendedOutline.contrastAgainstTerrain >= 4.5) {
            autoOutlined++;
          } else {
            unresolvedFailures++;
          }
        } else {
          unresolvedFailures++;
        }
      }
    }
  }

  const total = matchups.length;
  const passRatePercent = total > 0 ? Math.round((passing / total) * 1000) / 10 : 100;

  return {
    timestamp: Date.now(),
    totalMatchups: total,
    passingMatchups: passing,
    lowContrastMatchups: lowContrast,
    autoOutlinedMatchups: autoOutlined,
    passRatePercent,
    matchups,
    unresolvedFailures
  };
}
