/**
 * BitQuest - Tile Bleed, Seam & UV Artifact Detector Unit Test Suite (Issue #35)
 * Tests tile extrusion math, 1-pixel gutter padding verification,
 * fractional camera zoom pans, edge-contrast bleed detection, and failure triggering.
 */

import { PixelBuffer } from './generate_hitboxes';
import {
  extrudeTileset,
  verifyTileExtrusion,
  testCameraPanAtZoom,
  sampleEdgeContrastAcrossSeams
} from './tile_artifact_detector';

async function runTileDetectorTests() {
  console.log('=== BITQUEST TILE ARTIFACT DETECTOR UNIT TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Extrusion & Gutter Padding Tests
  // -------------------------------------------------------------------------
  console.log('[1/4] Tileset Extrusion & 1-Pixel Gutter Padding Tests');

  // Create a 2x2 raw tileset of 16x16 tiles (32x32 total raw buffer)
  const rawBuf = new PixelBuffer(32, 32);
  rawBuf.fillRect(0, 0, 16, 16, 255, 0, 0);   // Tile (0,0): Red
  rawBuf.fillRect(16, 0, 16, 16, 0, 255, 0);  // Tile (1,0): Green
  rawBuf.fillRect(0, 16, 16, 16, 0, 0, 255);  // Tile (0,1): Blue
  rawBuf.fillRect(16, 16, 16, 16, 255, 255, 0); // Tile (1,1): Yellow

  // Extrude tileset: each cell is 18x18, atlas is 36x36
  const atlas = extrudeTileset(rawBuf, 16, 16, 2, 2);
  assert(atlas.width === 36 && atlas.height === 36, 'Extruded atlas has 36x36 dimensions (18x18 per cell)');

  const verifyPass = verifyTileExtrusion(atlas, 16, 16, 2, 2);
  assert(verifyPass.passed, 'verifyTileExtrusion approves properly extruded atlas');
  assert(verifyPass.totalTilesChecked === 4, 'Checked all 4 tiles');
  assert(verifyPass.invalidTiles.length === 0, 'Zero invalid tiles on clean atlas');

  // Corrupt a gutter pixel to verify failure detection
  // Tile (0, 0) top gutter is at y=0. Alter pixel (5, 0) to black (0, 0, 0)
  atlas.setPixel(5, 0, 0, 0, 0, 255);
  const verifyFail = verifyTileExtrusion(atlas, 16, 16, 2, 2);
  assert(!verifyFail.passed, 'verifyTileExtrusion detects corrupted gutter pixel');
  assert(verifyFail.invalidTiles.length > 0, 'Identifies invalid tile cell');
  assert(verifyFail.invalidTiles[0].col === 0 && verifyFail.invalidTiles[0].row === 0, 'Accurately located tile (0, 0)');

  // -------------------------------------------------------------------------
  // 2. Headless Camera Pans at Fractional Zooms (1.25x, 1.5x, 2.0x)
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Camera Pans at Fractional Zooms (1.25x, 1.5x, 2.0x) Tests');

  const tileA = new PixelBuffer(16, 16);
  tileA.fillRect(0, 0, 16, 16, 40, 120, 40);
  const tileB = new PixelBuffer(16, 16);
  tileB.fillRect(0, 0, 16, 16, 120, 120, 120);

  const grid = [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1]
  ];

  // Test 1.25x zoom with sub-pixel offset (0.33, 0.67)
  const pan125 = testCameraPanAtZoom([tileA, tileB], grid, 16, 16, 1.25, { x: 0.33, y: 0.67 }, 100, 100);
  assert(pan125.passed, 'Camera pan at 1.25x zoom produces 0 seam gaps');
  assert(pan125.seamGapsDetected === 0, 'Zero void gap pixels detected at 1.25x');

  // Test 1.50x zoom with sub-pixel offset (0.5, 0.5)
  const pan150 = testCameraPanAtZoom([tileA, tileB], grid, 16, 16, 1.50, { x: 0.5, y: 0.5 }, 120, 120);
  assert(pan150.passed, 'Camera pan at 1.50x zoom produces 0 seam gaps');

  // Test 2.00x integer scaling
  const pan200 = testCameraPanAtZoom([tileA, tileB], grid, 16, 16, 2.00, { x: 0.25, y: 0.75 }, 140, 140);
  assert(pan200.passed, 'Camera pan at 2.00x zoom produces 0 seam gaps');

  // -------------------------------------------------------------------------
  // 3. Edge-Contrast Color Bleed Detection Tests
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Edge-Contrast Sampling Across Seams Tests');

  // Clean uniform tile grid (3x3 grid of identical 16x16 green tiles)
  const cleanGrid = new PixelBuffer(48, 48);
  cleanGrid.fillRect(0, 0, 48, 48, 50, 150, 50);

  const cleanBleed = sampleEdgeContrastAcrossSeams(cleanGrid, 16, 16, 3, 3, 40);
  assert(cleanBleed.passed, 'Clean grid has 0 bleeding junctions');
  assert(cleanBleed.maxContrastSpike === 0, 'Max contrast delta is 0 across uniform tiles');

  // Deliberately inject a high-contrast magenta bleed line along seam x=16
  for (let y = 0; y < 48; y++) {
    cleanGrid.setPixel(16, y, 255, 0, 255); // Magenta artifact
  }

  const detectedBleed = sampleEdgeContrastAcrossSeams(cleanGrid, 16, 16, 3, 3, 40);
  assert(!detectedBleed.passed, 'Detected deliberate color bleed line on seam');
  assert(detectedBleed.bleedingJunctions > 0, `Identified ${detectedBleed.bleedingJunctions} bleeding pixel pairs`);
  assert(detectedBleed.bleedReports[0].x === 16, 'Accurately located seam at x = 16');
  assert(detectedBleed.maxContrastSpike > 100, `High contrast spike measured (${detectedBleed.maxContrastSpike})`);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTileDetectorTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
