/**
 * BitQuest - Visual Regression & Golden Image Diff Engine (Issue #33)
 * Provides deterministic camera anchors, pure TypeScript PNG encoding,
 * sub-pixel RGBA buffer comparisons, and heatmap generation if diff > 0.5%.
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// 1. 10 Deterministic Camera Anchors
// ============================================================================

export interface CameraAnchor {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  description: string;
}

export const CAMERA_ANCHORS: CameraAnchor[] = [
  {
    id: 'anchor_01_village_green',
    name: 'Village Green / Town Square',
    x: 1024,
    y: 928,
    facing: 'down',
    description: 'Central village cobblestone plaza, fountain, and flowerbeds.'
  },
  {
    id: 'anchor_02_grandma_cottage',
    name: "Grandma's Cottage Porch",
    x: 1050,
    y: 800,
    facing: 'up',
    description: 'Cozy wooden cabin with strawberry planter boxes and thatched roof.'
  },
  {
    id: 'anchor_03_whispering_meadow',
    name: 'Whispering Meadow Berry Patch',
    x: 1550,
    y: 850,
    facing: 'right',
    description: 'Lush green fields with wild strawberry bushes and wind-swayed grass.'
  },
  {
    id: 'anchor_04_ancient_moss_gate',
    name: 'Ancient Moss Gate Archway',
    x: 1024,
    y: 520,
    facing: 'up',
    description: 'Carved stone arches, pressure plate switches, and overgrown vines.'
  },
  {
    id: 'anchor_05_crystal_lake_pier',
    name: 'Crystal Lake Shoreline & Pier',
    x: 740,
    y: 1340,
    facing: 'down',
    description: 'Water bobbing reflections, wooden fishing dock, and lily pads.'
  },
  {
    id: 'anchor_06_catacombs_entrance',
    name: 'Catacombs Sunken Dungeon Arch',
    x: 450,
    y: 600,
    facing: 'left',
    description: 'Dark cobblestone dungeon stairwell descending into the catacombs.'
  },
  {
    id: 'anchor_07_spore_king_arena',
    name: 'Spore King Truffle Boss Arena',
    x: 1600,
    y: 1200,
    facing: 'down',
    description: 'Circular fungal clearing with giant red mushroom pillars.'
  },
  {
    id: 'anchor_08_north_sanctuary',
    name: 'North Sanctuary Ancient Ruins',
    x: 1024,
    y: 300,
    facing: 'up',
    description: 'Ruined marble columns and glowing sun stone sanctuary.'
  },
  {
    id: 'anchor_09_pips_trading_post',
    name: "Pip's Oddities Trading Post",
    x: 1200,
    y: 950,
    facing: 'right',
    description: 'Colorful wagon shop adorned with lantern posts and trinkets.'
  },
  {
    id: 'anchor_10_dark_forest_canopy',
    name: 'Deep Dark Forest Shaded Grove',
    x: 300,
    y: 1100,
    facing: 'left',
    description: 'Dense dark pine canopy, twilight shadows, and glowing mushrooms.'
  }
];

// ============================================================================
// 2. Pure TypeScript PNG Encoder (Zero-Dependency using Bun.deflateSync)
// ============================================================================

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function calculateCrc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = new Uint8Array(4 + 4 + len + 4);
  const view = new DataView(chunk.buffer);

  // Length (big-endian)
  view.setUint32(0, len, false);
  // Type
  chunk.set(typeBytes, 4);
  // Data
  chunk.set(data, 8);

  // CRC over Type + Data
  const crcPayload = new Uint8Array(4 + len);
  crcPayload.set(typeBytes, 0);
  crcPayload.set(data, 4);
  const crc = calculateCrc32(crcPayload);
  view.setUint32(8 + len, crc, false);

  return chunk;
}

export function encodePNG(width: number, height: number, rgbaData: Uint8ClampedArray | Uint8Array): Buffer {
  // 1. Signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk (13 bytes)
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // 3. Raw Scanlines with Filter Byte 0 (None)
  const rowBytes = width * 4;
  const rawScanlines = new Uint8Array(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowBytes);
    rawScanlines[rawOffset] = 0; // filter None
    const srcOffset = y * rowBytes;
    rawScanlines.set(rgbaData.subarray(srcOffset, srcOffset + rowBytes), rawOffset + 1);
  }

  // 4. Compress Scanlines via Bun.deflateSync
  const compressed = Bun.deflateSync(Buffer.from(rawScanlines));
  const idatChunk = createChunk('IDAT', compressed);

  // 5. IEND Chunk
  const iendChunk = createChunk('IEND', new Uint8Array(0));

  // Combine
  const totalLength = signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const result = Buffer.alloc(totalLength);
  let pos = 0;

  result.set(signature, pos); pos += signature.length;
  result.set(ihdrChunk, pos); pos += ihdrChunk.length;
  result.set(idatChunk, pos); pos += idatChunk.length;
  result.set(iendChunk, pos);

  return result;
}

// ============================================================================
// 3. Sub-Pixel Buffer Comparison & Heatmap Generator
// ============================================================================

export interface DiffOptions {
  tolerance?: number;         // Max channel delta before counting as mismatched (default 10)
  diffThreshold?: number;     // Fraction of mismatched pixels to trigger failure (default 0.005 = 0.5%)
  highlightColor?: [number, number, number, number]; // RGBA color for heatmap diffs
}

export interface DiffResult {
  isMatch: boolean;
  totalPixels: number;
  mismatchedPixels: number;
  diffRatio: number;
  diffPercent: number;
  hasHeatmap: boolean;
  diffHeatmap: Uint8ClampedArray;
}

export function comparePixelBuffers(
  baseline: Uint8ClampedArray | Uint8Array,
  candidate: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: DiffOptions = {}
): DiffResult {
  const tolerance = options.tolerance ?? 10;
  const diffThreshold = options.diffThreshold ?? 0.005; // 0.5%
  const highlight = options.highlightColor ?? [255, 0, 128, 255]; // Neon Magenta

  const totalPixels = width * height;
  let mismatchedPixels = 0;

  const heatmap = new Uint8ClampedArray(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r1 = baseline[idx];
    const g1 = baseline[idx + 1];
    const b1 = baseline[idx + 2];
    const a1 = baseline[idx + 3];

    const r2 = candidate[idx];
    const g2 = candidate[idx + 1];
    const b2 = candidate[idx + 2];
    const a2 = candidate[idx + 3];

    const dr = Math.abs(r1 - r2);
    const dg = Math.abs(g1 - g2);
    const db = Math.abs(b1 - b2);
    const da = Math.abs(a1 - a2);

    const isDiff = dr > tolerance || dg > tolerance || db > tolerance || da > tolerance;

    if (isDiff) {
      mismatchedPixels++;
      // Bright Heatmap Color
      heatmap[idx] = highlight[0];
      heatmap[idx + 1] = highlight[1];
      heatmap[idx + 2] = highlight[2];
      heatmap[idx + 3] = highlight[3];
    } else {
      // Dimmed grayscale background of candidate for clear visual context
      const gray = Math.round((r2 * 0.299 + g2 * 0.587 + b2 * 0.114) * 0.35);
      heatmap[idx] = gray;
      heatmap[idx + 1] = gray;
      heatmap[idx + 2] = gray;
      heatmap[idx + 3] = 255;
    }
  }

  const diffRatio = mismatchedPixels / totalPixels;
  const diffPercent = Number((diffRatio * 100).toFixed(4));
  const isMatch = diffRatio <= diffThreshold;
  const hasHeatmap = !isMatch; // Heatmap generated if diff > 0.5%

  return {
    isMatch,
    totalPixels,
    mismatchedPixels,
    diffRatio,
    diffPercent,
    hasHeatmap,
    diffHeatmap: heatmap
  };
}

// ============================================================================
// 4. Deterministic Procedural Scene Renderer for Headless Golden Baselines
// ============================================================================

export function renderAnchorScene(
  anchor: CameraAnchor,
  width: number = 256,
  height: number = 256
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);

  const setPx = (x: number, y: number, r: number, g: number, b: number, a: number = 255) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
  };

  const fillR = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        setPx(cx, cy, r, g, b);
      }
    }
  };

  // Base background depending on biome
  let baseColor: [number, number, number] = [79, 147, 59]; // Grass green
  if (anchor.id.includes('catacombs')) baseColor = [30, 27, 24]; // Dark stone
  else if (anchor.id.includes('lake')) baseColor = [2, 132, 199]; // Blue water
  else if (anchor.id.includes('arena')) baseColor = [120, 53, 15]; // Fungal dirt
  else if (anchor.id.includes('sanctuary')) baseColor = [203, 213, 225]; // Marble ruins
  else if (anchor.id.includes('dark_forest')) baseColor = [22, 101, 52]; // Dark canopy

  // Fill terrain base
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Deterministic terrain noise variation based on anchor coordinates
      const noise = Math.sin((x + anchor.x) * 0.05) * Math.cos((y + anchor.y) * 0.05);
      const r = Math.max(0, Math.min(255, Math.round(baseColor[0] + noise * 16)));
      const g = Math.max(0, Math.min(255, Math.round(baseColor[1] + noise * 16)));
      const b = Math.max(0, Math.min(255, Math.round(baseColor[2] + noise * 16)));
      setPx(x, y, r, g, b);
    }
  }

  // Anchor features
  if (anchor.id.includes('village')) {
    // Cobblestone town square path
    fillR(48, 48, 160, 160, 148, 163, 184); // Gray stone
    fillR(112, 112, 32, 32, 56, 189, 248);  // Fountain pool
  } else if (anchor.id.includes('cottage')) {
    // Cabin roof & walls
    fillR(64, 40, 128, 96, 180, 83, 9);    // Log cabin
    fillR(56, 30, 144, 40, 217, 119, 6);   // Thatched roof
    fillR(70, 140, 40, 20, 239, 68, 68);   // Strawberry planters
  } else if (anchor.id.includes('lake')) {
    // Wooden pier
    fillR(100, 40, 56, 140, 146, 64, 14);  // Pier planks
    fillR(60, 200, 30, 30, 34, 197, 94);   // Lily pads
  } else if (anchor.id.includes('gate')) {
    // Twin moss stone gate pillars
    fillR(40, 30, 48, 120, 100, 116, 139);
    fillR(168, 30, 48, 120, 100, 116, 139);
    fillR(90, 160, 30, 30, 251, 191, 36);  // Sun switches
    fillR(136, 160, 30, 30, 251, 191, 36);
  } else if (anchor.id.includes('arena')) {
    // Fungal circle
    fillR(32, 32, 192, 192, 146, 64, 14);
    fillR(96, 96, 64, 64, 239, 68, 68);    // Spore King throne
  }

  // Draw Player Avatar at camera center (128, 128)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  fillR(cx - 5, cy - 10, 10, 8, 255, 220, 180); // Face
  fillR(cx - 6, cy - 14, 12, 5, 34, 197, 94);   // Cap
  fillR(cx - 5, cy - 2, 10, 10, 56, 189, 248);  // Tunic
  fillR(cx - 4, cy + 8, 3, 4, 120, 53, 15);     // Boots
  fillR(cx + 1, cy + 8, 3, 4, 120, 53, 15);

  return buf;
}

// ============================================================================
// 5. File System Golden Baselines & Diff Manager
// ============================================================================

const BASELINES_DIR = path.resolve(import.meta.dir, '../tests/golden/baselines');
const DIFFS_DIR = path.resolve(import.meta.dir, '../tests/golden/diffs');

export function ensureGoldenDirs() {
  if (!fs.existsSync(BASELINES_DIR)) fs.mkdirSync(BASELINES_DIR, { recursive: true });
  if (!fs.existsSync(DIFFS_DIR)) fs.mkdirSync(DIFFS_DIR, { recursive: true });
}

export function saveGoldenBaseline(
  anchorId: string,
  width: number,
  height: number,
  rgbaData: Uint8ClampedArray | Uint8Array
): string {
  ensureGoldenDirs();
  const pngBuf = encodePNG(width, height, rgbaData);
  const pngPath = path.join(BASELINES_DIR, `${anchorId}.png`);
  const rawPath = path.join(BASELINES_DIR, `${anchorId}.raw`);

  fs.writeFileSync(pngPath, pngBuf);
  fs.writeFileSync(rawPath, Buffer.from(rgbaData));
  return pngPath;
}

export function loadGoldenBaseline(anchorId: string): { exists: boolean; width: number; height: number; data?: Uint8ClampedArray } {
  ensureGoldenDirs();
  const rawPath = path.join(BASELINES_DIR, `${anchorId}.raw`);
  if (!fs.existsSync(rawPath)) {
    return { exists: false, width: 256, height: 256 };
  }
  const buf = fs.readFileSync(rawPath);
  return {
    exists: true,
    width: 256,
    height: 256,
    data: new Uint8ClampedArray(buf)
  };
}

export function saveDiffHeatmap(
  anchorId: string,
  width: number,
  height: number,
  heatmapData: Uint8ClampedArray | Uint8Array
): string {
  ensureGoldenDirs();
  const pngBuf = encodePNG(width, height, heatmapData);
  const diffPath = path.join(DIFFS_DIR, `${anchorId}_diff.png`);
  fs.writeFileSync(diffPath, pngBuf);
  return diffPath;
}
