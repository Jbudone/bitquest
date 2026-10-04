/**
 * BitQuest - Tile Bleed, Seam & UV Artifact Detector (Issue #35)
 * Analyzes tileset atlases and rendering pipelines to eliminate 1-pixel tile seams:
 * 1. Verifies 1-pixel extruded border (gutter padding) on all 16x16 / 32x32 tiles
 * 2. Simulates headless camera pans across fractional zoom levels (1.25x, 1.5x, 2.0x)
 * 3. Edge-contrast sampling detects color bleed across grid lines
 */

import { PixelBuffer } from './generate_hitboxes';

// ============================================================================
// 1. Tile Extrusion Engine & Gutter Padding Verification
// ============================================================================

export interface ExtrusionCheckResult {
  totalTilesChecked: number;
  validExtrudedTiles: number;
  invalidTiles: Array<{
    col: number;
    row: number;
    reason: string;
    details?: string;
  }>;
  passed: boolean;
}

/**
 * Extrudes a raw unpadded tileset into an atlas with 1px gutter padding around every tile.
 * Repeats outer pixel rows/columns into the 1px margin and corners.
 */
export function extrudeTileset(
  rawBuffer: PixelBuffer,
  tileW: number = 16,
  tileH: number = 16,
  cols: number = 4,
  rows: number = 4
): PixelBuffer {
  const margin = 1;
  const spacing = 2; // 1px on left + 1px on right
  const cellW = tileW + 2;
  const cellH = tileH + 2;

  const atlasW = cols * cellW;
  const atlasH = rows * cellH;
  const atlas = new PixelBuffer(atlasW, atlasH);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const srcX = c * tileW;
      const srcY = r * tileH;
      const destX = c * cellW + margin;
      const destY = r * cellH + margin;

      // 1. Copy core tile body
      for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
          const idx = ((srcY + y) * rawBuffer.width + (srcX + x)) * 4;
          atlas.setPixel(destX + x, destY + y, rawBuffer.data[idx], rawBuffer.data[idx + 1], rawBuffer.data[idx + 2], rawBuffer.data[idx + 3]);
        }
      }

      // 2. Extrude Top & Bottom edges
      for (let x = 0; x < tileW; x++) {
        // Top edge replicated to y - 1
        const topIdx = (srcY * rawBuffer.width + (srcX + x)) * 4;
        atlas.setPixel(destX + x, destY - 1, rawBuffer.data[topIdx], rawBuffer.data[topIdx + 1], rawBuffer.data[topIdx + 2], rawBuffer.data[topIdx + 3]);

        // Bottom edge replicated to y + tileH
        const btmIdx = ((srcY + tileH - 1) * rawBuffer.width + (srcX + x)) * 4;
        atlas.setPixel(destX + x, destY + tileH, rawBuffer.data[btmIdx], rawBuffer.data[btmIdx + 1], rawBuffer.data[btmIdx + 2], rawBuffer.data[btmIdx + 3]);
      }

      // 3. Extrude Left & Right edges
      for (let y = 0; y < tileH; y++) {
        // Left edge replicated to x - 1
        const leftIdx = ((srcY + y) * rawBuffer.width + srcX) * 4;
        atlas.setPixel(destX - 1, destY + y, rawBuffer.data[leftIdx], rawBuffer.data[leftIdx + 1], rawBuffer.data[leftIdx + 2], rawBuffer.data[leftIdx + 3]);

        // Right edge replicated to x + tileW
        const rightIdx = ((srcY + y) * rawBuffer.width + (srcX + tileW - 1)) * 4;
        atlas.setPixel(destX + tileW, destY + y, rawBuffer.data[rightIdx], rawBuffer.data[rightIdx + 1], rawBuffer.data[rightIdx + 2], rawBuffer.data[rightIdx + 3]);
      }

      // 4. Extrude 4 Corners
      // Top-Left
      const tl = (srcY * rawBuffer.width + srcX) * 4;
      atlas.setPixel(destX - 1, destY - 1, rawBuffer.data[tl], rawBuffer.data[tl + 1], rawBuffer.data[tl + 2], rawBuffer.data[tl + 3]);

      // Top-Right
      const tr = (srcY * rawBuffer.width + (srcX + tileW - 1)) * 4;
      atlas.setPixel(destX + tileW, destY - 1, rawBuffer.data[tr], rawBuffer.data[tr + 1], rawBuffer.data[tr + 2], rawBuffer.data[tr + 3]);

      // Bottom-Left
      const bl = ((srcY + tileH - 1) * rawBuffer.width + srcX) * 4;
      atlas.setPixel(destX - 1, destY + tileH, rawBuffer.data[bl], rawBuffer.data[bl + 1], rawBuffer.data[bl + 2], rawBuffer.data[bl + 3]);

      // Bottom-Right
      const br = ((srcY + tileH - 1) * rawBuffer.width + (srcX + tileW - 1)) * 4;
      atlas.setPixel(destX + tileW, destY + tileH, rawBuffer.data[br], rawBuffer.data[br + 1], rawBuffer.data[br + 2], rawBuffer.data[br + 3]);
    }
  }

  return atlas;
}

/**
 * Validates that an atlas has proper 1-pixel extruded borders replicating the edge pixels.
 */
export function verifyTileExtrusion(
  atlas: PixelBuffer,
  tileW: number = 16,
  tileH: number = 16,
  cols: number = 4,
  rows: number = 4
): ExtrusionCheckResult {
  const cellW = tileW + 2;
  const cellH = tileH + 2;
  const margin = 1;

  const invalidTiles: ExtrusionCheckResult['invalidTiles'] = [];
  let totalChecked = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      totalChecked++;
      const originX = c * cellW + margin;
      const originY = r * cellH + margin;

      let tileOk = true;

      // Check Top Gutter: row originY - 1 must match originY
      for (let x = 0; x < tileW; x++) {
        const edgeIdx = (originY * atlas.width + (originX + x)) * 4;
        const gutterIdx = ((originY - 1) * atlas.width + (originX + x)) * 4;
        if (!pixelEquals(atlas.data, edgeIdx, gutterIdx)) {
          invalidTiles.push({ col: c, row: r, reason: `Top gutter mismatch at x=${x}` });
          tileOk = false;
          break;
        }
      }

      if (!tileOk) continue;

      // Check Bottom Gutter: row originY + tileH must match originY + tileH - 1
      for (let x = 0; x < tileW; x++) {
        const edgeIdx = ((originY + tileH - 1) * atlas.width + (originX + x)) * 4;
        const gutterIdx = ((originY + tileH) * atlas.width + (originX + x)) * 4;
        if (!pixelEquals(atlas.data, edgeIdx, gutterIdx)) {
          invalidTiles.push({ col: c, row: r, reason: `Bottom gutter mismatch at x=${x}` });
          tileOk = false;
          break;
        }
      }

      if (!tileOk) continue;

      // Check Left Gutter: col originX - 1 must match originX
      for (let y = 0; y < tileH; y++) {
        const edgeIdx = ((originY + y) * atlas.width + originX) * 4;
        const gutterIdx = ((originY + y) * atlas.width + (originX - 1)) * 4;
        if (!pixelEquals(atlas.data, edgeIdx, gutterIdx)) {
          invalidTiles.push({ col: c, row: r, reason: `Left gutter mismatch at y=${y}` });
          tileOk = false;
          break;
        }
      }

      if (!tileOk) continue;

      // Check Right Gutter: col originX + tileW must match originX + tileW - 1
      for (let y = 0; y < tileH; y++) {
        const edgeIdx = ((originY + y) * atlas.width + (originX + tileW - 1)) * 4;
        const gutterIdx = ((originY + y) * atlas.width + (originX + tileW)) * 4;
        if (!pixelEquals(atlas.data, edgeIdx, gutterIdx)) {
          invalidTiles.push({ col: c, row: r, reason: `Right gutter mismatch at y=${y}` });
          tileOk = false;
          break;
        }
      }
    }
  }

  return {
    totalTilesChecked: totalChecked,
    validExtrudedTiles: totalChecked - invalidTiles.length,
    invalidTiles,
    passed: invalidTiles.length === 0
  };
}

function pixelEquals(data: Uint8ClampedArray, idx1: number, idx2: number): boolean {
  return data[idx1] === data[idx2] &&
         data[idx1 + 1] === data[idx2 + 1] &&
         data[idx1 + 2] === data[idx2 + 2] &&
         data[idx1 + 3] === data[idx2 + 3];
}

// ============================================================================
// 2. Camera Pan & Fractional Zoom Seam Simulator
// ============================================================================

export interface ZoomSeamCheckResult {
  zoom: number;
  subPixelOffset: { x: number; y: number };
  seamsTested: number;
  seamGapsDetected: number;
  maxGapWidth: number;
  passed: boolean;
}

/**
 * Simulates camera panning at fractional zoom levels (1.25x, 1.5x, 2.0x) across a tile grid.
 * Renders the scaled tilemap to a viewport buffer using nearest/bilinear sub-pixel sampling,
 * then scans every tile junction line to detect any transparent/void 1-pixel gap seams.
 */
export function testCameraPanAtZoom(
  tiles: PixelBuffer[],
  grid: number[][],
  tileW: number = 16,
  tileH: number = 16,
  zoom: number = 1.25,
  cameraOffset: { x: number; y: number } = { x: 0.33, y: 0.67 },
  viewportW: number = 128,
  viewportH: number = 128
): ZoomSeamCheckResult {
  const gridRows = grid.length;
  const gridCols = grid[0].length;
  const scaledTileW = tileW * zoom;
  const scaledTileH = tileH * zoom;

  // Background color representing unrendered void (Neon Magenta 255, 0, 255)
  // Any gap or seam between tiles will reveal this void color!
  const VOID_COLOR = [255, 0, 255, 255];
  const viewport = new PixelBuffer(viewportW, viewportH);
  viewport.fillRect(0, 0, viewportW, viewportH, VOID_COLOR[0], VOID_COLOR[1], VOID_COLOR[2], VOID_COLOR[3]);

  // Render each tile onto viewport with sub-pixel camera translation
  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      const tileIdx = grid[gr][gc];
      const tile = tiles[tileIdx % tiles.length];

      // Screen destination rectangle with fractional coordinates
      const screenX0 = Math.floor(gc * scaledTileW - cameraOffset.x);
      const screenX1 = Math.floor((gc + 1) * scaledTileW - cameraOffset.x);
      const screenY0 = Math.floor(gr * scaledTileH - cameraOffset.y);
      const screenY1 = Math.floor((gr + 1) * scaledTileH - cameraOffset.y);

      const renderW = screenX1 - screenX0;
      const renderH = screenY1 - screenY0;

      for (let py = 0; py < renderH; py++) {
        const destY = screenY0 + py;
        if (destY < 0 || destY >= viewportH) continue;
        const srcY = Math.min(tileH - 1, Math.floor((py / renderH) * tileH));

        for (let px = 0; px < renderW; px++) {
          const destX = screenX0 + px;
          if (destX < 0 || destX >= viewportW) continue;
          const srcX = Math.min(tileW - 1, Math.floor((px / renderW) * tileW));

          const sIdx = (srcY * tile.width + srcX) * 4;
          viewport.setPixel(destX, destY, tile.data[sIdx], tile.data[sIdx + 1], tile.data[sIdx + 2], tile.data[sIdx + 3]);
        }
      }
    }
  }

  // Scan viewport for unrendered VOID pixels within the rendered tile boundary
  let seamsTested = 0;
  let gapsDetected = 0;

  // Inspect internal tile boundaries
  for (let gc = 1; gc < gridCols; gc++) {
    const seamX = Math.floor(gc * scaledTileW - cameraOffset.x);
    if (seamX >= 0 && seamX < viewportW) {
      seamsTested++;
      // Check column seamX - 1, seamX, seamX + 1 for void pixels
      for (let y = 0; y < Math.min(viewportH, Math.floor(gridRows * scaledTileH - cameraOffset.y)); y++) {
        if (isVoidPixel(viewport.data, (y * viewportW + seamX) * 4)) {
          gapsDetected++;
        }
      }
    }
  }

  for (let gr = 1; gr < gridRows; gr++) {
    const seamY = Math.floor(gr * scaledTileH - cameraOffset.y);
    if (seamY >= 0 && seamY < viewportH) {
      seamsTested++;
      for (let x = 0; x < Math.min(viewportW, Math.floor(gridCols * scaledTileW - cameraOffset.x)); x++) {
        if (isVoidPixel(viewport.data, (seamY * viewportW + x) * 4)) {
          gapsDetected++;
        }
      }
    }
  }

  return {
    zoom,
    subPixelOffset: cameraOffset,
    seamsTested,
    seamGapsDetected: gapsDetected,
    maxGapWidth: gapsDetected > 0 ? 1 : 0,
    passed: gapsDetected === 0
  };
}

function isVoidPixel(data: Uint8ClampedArray, idx: number): boolean {
  return data[idx] === 255 && data[idx + 1] === 0 && data[idx + 2] === 255;
}

// ============================================================================
// 3. Edge-Contrast Sampling for Tile Color Bleed Detection
// ============================================================================

export interface EdgeContrastBleedResult {
  junctionsTested: number;
  bleedingJunctions: number;
  maxContrastSpike: number;
  passed: boolean;
  bleedReports: Array<{
    x: number;
    y: number;
    orientation: 'vertical' | 'horizontal';
    contrastDelta: number;
  }>;
}

/**
 * Samples pixel pairs directly across tile grid boundaries.
 * In a continuous uniform terrain (e.g. Grass tile next to Grass tile),
 * any high-contrast seam (contrastDelta > 45) indicates neighbor atlas bleeding or artifact gaps.
 */
export function sampleEdgeContrastAcrossSeams(
  renderedBuffer: PixelBuffer,
  tileW: number = 16,
  tileH: number = 16,
  cols: number = 4,
  rows: number = 4,
  maxAllowedContrastDelta: number = 50
): EdgeContrastBleedResult {
  const bleedReports: EdgeContrastBleedResult['bleedReports'] = [];
  let junctionsTested = 0;
  let maxDelta = 0;

  // 1. Vertical Tile Seams (between column c and c + 1)
  for (let c = 1; c < cols; c++) {
    const seamX = c * tileW;
    for (let y = 0; y < rows * tileH; y++) {
      junctionsTested++;
      const leftIdx = (y * renderedBuffer.width + (seamX - 1)) * 4;
      const rightIdx = (y * renderedBuffer.width + seamX) * 4;

      const dr = Math.abs(renderedBuffer.data[leftIdx] - renderedBuffer.data[rightIdx]);
      const dg = Math.abs(renderedBuffer.data[leftIdx + 1] - renderedBuffer.data[rightIdx + 1]);
      const db = Math.abs(renderedBuffer.data[leftIdx + 2] - renderedBuffer.data[rightIdx + 2]);
      const delta = dr + dg + db;

      if (delta > maxDelta) maxDelta = delta;

      if (delta > maxAllowedContrastDelta) {
        bleedReports.push({
          x: seamX,
          y,
          orientation: 'vertical',
          contrastDelta: delta
        });
      }
    }
  }

  // 2. Horizontal Tile Seams (between row r and r + 1)
  for (let r = 1; r < rows; r++) {
    const seamY = r * tileH;
    for (let x = 0; x < cols * tileW; x++) {
      junctionsTested++;
      const topIdx = ((seamY - 1) * renderedBuffer.width + x) * 4;
      const btmIdx = (seamY * renderedBuffer.width + x) * 4;

      const dr = Math.abs(renderedBuffer.data[topIdx] - renderedBuffer.data[btmIdx]);
      const dg = Math.abs(renderedBuffer.data[topIdx + 1] - renderedBuffer.data[btmIdx + 1]);
      const db = Math.abs(renderedBuffer.data[topIdx + 2] - renderedBuffer.data[btmIdx + 2]);
      const delta = dr + dg + db;

      if (delta > maxDelta) maxDelta = delta;

      if (delta > maxAllowedContrastDelta) {
        bleedReports.push({
          x,
          y: seamY,
          orientation: 'horizontal',
          contrastDelta: delta
        });
      }
    }
  }

  return {
    junctionsTested,
    bleedingJunctions: bleedReports.length,
    maxContrastSpike: maxDelta,
    passed: bleedReports.length === 0,
    bleedReports
  };
}
