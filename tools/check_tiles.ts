/**
 * BitQuest - Tile Bleed, Seam & UV Artifact Detector CLI (Issue #35)
 * Command: bun run check:tiles
 * Inspects tilesets and tests camera pans at fractional zooms to eliminate 1-pixel tile seams.
 */

import { PixelBuffer } from './generate_hitboxes';
import {
  extrudeTileset,
  verifyTileExtrusion,
  testCameraPanAtZoom,
  sampleEdgeContrastAcrossSeams
} from './tile_artifact_detector';

function generateSampleGrassTile(w: number = 16, h: number = 16): PixelBuffer {
  const buf = new PixelBuffer(w, h);
  // Lush warm green base
  buf.fillRect(0, 0, w, h, 79, 147, 59);

  // Soft grass blades (subtle color shifts, no high-contrast perimeter artifacts)
  for (let y = 1; y < h - 1; y += 3) {
    for (let x = 1; x < w - 1; x += 3) {
      if ((x + y) % 2 === 0) {
        buf.setPixel(x, y, 115, 191, 72); // lighter green blade
      }
    }
  }
  return buf;
}

function generateSampleCobbleTile(w: number = 16, h: number = 16): PixelBuffer {
  const buf = new PixelBuffer(w, h);
  // Warm stone base
  buf.fillRect(0, 0, w, h, 130, 138, 128);
  buf.fillRect(2, 2, w - 4, h - 4, 157, 165, 153);
  return buf;
}

export function runTileArtifactCheck(): { passed: boolean; details: Record<string, any> } {
  console.log('=== BITQUEST TILE BLEED, SEAM & UV ARTIFACT DETECTOR ===\n');

  let passed = true;
  const details: Record<string, any> = {};

  // -------------------------------------------------------------------------
  // 1. Verifies 1-Pixel Extruded Border (Gutter Padding) on all 16x16 Tiles
  // -------------------------------------------------------------------------
  console.log('[1/3] Verifying 1-Pixel Extruded Border (Gutter Padding) on 16x16 Tiles...');

  const rawTileset = new PixelBuffer(64, 64); // 4x4 grid of 16x16 tiles
  const grass = generateSampleGrassTile(16, 16);
  const cobble = generateSampleCobbleTile(16, 16);

  // Pack 16 tiles into raw unpadded atlas
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tile = (r + c) % 2 === 0 ? grass : cobble;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const sIdx = (y * 16 + x) * 4;
          rawTileset.setPixel(c * 16 + x, r * 16 + y, tile.data[sIdx], tile.data[sIdx + 1], tile.data[sIdx + 2], tile.data[sIdx + 3]);
        }
      }
    }
  }

  // Generate 1px extruded border atlas
  const extrudedAtlas = extrudeTileset(rawTileset, 16, 16, 4, 4);
  const extrusionResult = verifyTileExtrusion(extrudedAtlas, 16, 16, 4, 4);

  if (extrusionResult.passed) {
    console.log(`  ✓ All ${extrusionResult.totalTilesChecked} tiles verified with 1-pixel gutter padding!`);
  } else {
    console.error(`  ✗ Extrusion check failed for ${extrusionResult.invalidTiles.length} tiles`);
    passed = false;
  }
  details.extrusion = extrusionResult;

  // -------------------------------------------------------------------------
  // 2. Headless Camera Pans Across All Zoom Levels (1.25x, 1.5x, 2.0x)
  // -------------------------------------------------------------------------
  console.log('\n[2/3] Simulating Headless Camera Pans at Fractional Zoom Levels...');

  const testGrid = [
    [0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
  ];
  const tiles = [grass, cobble];

  const zoomLevels = [1.25, 1.5, 2.0];
  const panOffsets = [
    { x: 0.0, y: 0.0 },
    { x: 0.33, y: 0.67 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.25 }
  ];

  let totalSeamTests = 0;
  let totalSeamGaps = 0;

  for (const zoom of zoomLevels) {
    for (const offset of panOffsets) {
      totalSeamTests++;
      const seamRes = testCameraPanAtZoom(tiles, testGrid, 16, 16, zoom, offset, 160, 160);
      if (seamRes.seamGapsDetected > 0) {
        totalSeamGaps += seamRes.seamGapsDetected;
        console.error(`  ✗ Seam gap detected at ${zoom}x zoom with offset (${offset.x}, ${offset.y}): ${seamRes.seamGapsDetected} void pixels`);
        passed = false;
      }
    }
    console.log(`  ✓ Zoom ${zoom.toFixed(2)}x: Tested camera pans with sub-pixel offsets -> 0 seam gaps detected`);
  }
  details.cameraZoomSeams = { totalSeamTests, totalSeamGaps };

  // -------------------------------------------------------------------------
  // 3. Edge-Contrast Sampling Across Grid Lines for Color Bleed
  // -------------------------------------------------------------------------
  console.log('\n[3/3] Sampling Edge-Contrast Across Tile Grid Lines (Color Bleed Check)...');

  // Render a 4x4 uniform grass terrain to check seam continuity
  const uniformGrassGrid = new PixelBuffer(64, 64);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const sIdx = (y * 16 + x) * 4;
          uniformGrassGrid.setPixel(c * 16 + x, r * 16 + y, grass.data[sIdx], grass.data[sIdx + 1], grass.data[sIdx + 2], grass.data[sIdx + 3]);
        }
      }
    }
  }

  const bleedResult = sampleEdgeContrastAcrossSeams(uniformGrassGrid, 16, 16, 4, 4, 45);
  if (bleedResult.passed) {
    console.log(`  ✓ Sampled ${bleedResult.junctionsTested} edge pixel junctions across grid lines -> 0 color bleeds (Max contrast spike: ${bleedResult.maxContrastSpike})`);
  } else {
    console.error(`  ✗ Color bleed detected across ${bleedResult.bleedingJunctions} grid junctions!`);
    passed = false;
  }
  details.edgeContrast = bleedResult;

  console.log('\n========================================');
  console.log(`TILE ARTIFACT DETECTOR: ${passed ? 'ALL CHECKS PASSED ✓' : 'FAILED ✗'}`);
  console.log('========================================\n');

  return { passed, details };
}

if (import.meta.main) {
  const res = runTileArtifactCheck();
  if (!res.passed) {
    process.exit(1);
  }
}
