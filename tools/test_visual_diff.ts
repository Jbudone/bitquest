/**
 * BitQuest - Visual Diff Engine Unit Test Suite (Issue #33)
 * Tests pure TypeScript PNG encoder, sub-pixel comparison with tolerance thresholds,
 * automatic heatmap generation when diff > 0.5%, and camera anchors catalog integrity.
 */

import fs from 'fs';
import path from 'path';
import {
  CAMERA_ANCHORS,
  encodePNG,
  comparePixelBuffers,
  renderAnchorScene,
  saveGoldenBaseline,
  loadGoldenBaseline,
  saveDiffHeatmap
} from './visual_diff_engine';

async function runVisualDiffTests() {
  console.log('=== BITQUEST VISUAL DIFF ENGINE UNIT TEST SUITE ===\n');
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
  // 1. Pure TypeScript PNG Encoder Tests
  // -------------------------------------------------------------------------
  console.log('[1/4] Pure TypeScript PNG Encoder Tests');

  const testRgba = new Uint8ClampedArray(4 * 4 * 4); // 4x4 RGBA image
  testRgba.fill(255); // Solid white

  const pngBuf = encodePNG(4, 4, testRgba);
  assert(Buffer.isBuffer(pngBuf), 'encodePNG returns a Node/Bun Buffer');
  assert(pngBuf.length > 50, 'PNG buffer has non-trivial file size (> 50 bytes)');

  // Verify PNG 8-byte signature: \x89PNG\r\n\x1a\n
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  let sigMatches = true;
  for (let i = 0; i < 8; i++) {
    if (pngBuf[i] !== signature[i]) sigMatches = false;
  }
  assert(sigMatches, 'PNG buffer starts with standard 8-byte PNG signature');

  // Verify chunk headers exist
  const str = pngBuf.toString('binary');
  assert(str.includes('IHDR'), 'PNG buffer contains IHDR chunk');
  assert(str.includes('IDAT'), 'PNG buffer contains IDAT chunk');
  assert(str.includes('IEND'), 'PNG buffer contains IEND chunk');

  // -------------------------------------------------------------------------
  // 2. Sub-Pixel Buffer Comparison & Heatmap Tests
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Sub-Pixel Buffer Comparison & Heatmap Trigger Tests');

  const W = 100;
  const H = 100;
  const totalPixels = W * H; // 10,000 pixels

  const baseBuf = new Uint8ClampedArray(totalPixels * 4);
  const candBuf = new Uint8ClampedArray(totalPixels * 4);

  // Fill with identical blue color: (0, 100, 200, 255)
  for (let i = 0; i < totalPixels * 4; i += 4) {
    baseBuf[i] = 0; baseBuf[i + 1] = 100; baseBuf[i + 2] = 200; baseBuf[i + 3] = 255;
    candBuf[i] = 0; candBuf[i + 1] = 100; candBuf[i + 2] = 200; candBuf[i + 3] = 255;
  }

  // 2.1 Identical Buffers
  const resIdentical = comparePixelBuffers(baseBuf, candBuf, W, H);
  assert(resIdentical.isMatch, 'Identical buffers match (isMatch = true)');
  assert(resIdentical.mismatchedPixels === 0, 'Zero mismatched pixels');
  assert(resIdentical.diffRatio === 0, 'Diff ratio is 0.0');
  assert(!resIdentical.hasHeatmap, 'No heatmap generated when buffers match');

  // 2.2 Tolerance Delta Threshold
  // Modifying by delta = 8 (below default tolerance 10)
  for (let i = 0; i < 100 * 4; i += 4) {
    candBuf[i + 1] = 108; // delta = 8
  }
  const resTolerance = comparePixelBuffers(baseBuf, candBuf, W, H, { tolerance: 10 });
  assert(resTolerance.isMatch && resTolerance.mismatchedPixels === 0, 'Sub-tolerance color shifts (<10 delta) are accepted');

  // 2.3 Acceptable Minor Diff (< 0.5%)
  // Modify 20 pixels out of 10,000 (0.2% diff < 0.5% threshold)
  for (let i = 0; i < 20; i++) {
    candBuf[i * 4] = 255; // drastic red shift
  }
  const resMinor = comparePixelBuffers(baseBuf, candBuf, W, H, { tolerance: 10, diffThreshold: 0.005 });
  assert(resMinor.isMatch, 'Minor 0.2% diff is within <= 0.5% threshold');
  assert(resMinor.mismatchedPixels === 20, 'Accurately detected exactly 20 mismatched pixels');
  assert(!resMinor.hasHeatmap, 'hasHeatmap is false for sub-threshold diffs');

  // 2.4 Regression Failure (> 0.5%) & Heatmap Generation
  // Modify 100 pixels out of 10,000 (1.0% diff > 0.5% threshold)
  for (let i = 0; i < 100; i++) {
    candBuf[i * 4] = 255; // drastic shift
  }
  const resRegression = comparePixelBuffers(baseBuf, candBuf, W, H, { tolerance: 10, diffThreshold: 0.005 });
  assert(!resRegression.isMatch, 'Regression detected when diff > 0.5% (isMatch = false)');
  assert(resRegression.hasHeatmap, 'hasHeatmap is true when regression exceeds 0.5%');
  assert(resRegression.mismatchedPixels === 100, 'Accurately counted 100 mismatched pixels (1.0%)');

  // Verify Heatmap Color Highlight: Neon Magenta (255, 0, 128, 255)
  assert(resRegression.diffHeatmap[0] === 255 && resRegression.diffHeatmap[1] === 0 && resRegression.diffHeatmap[2] === 128,
    'Heatmap highlights differing pixel in neon magenta [255, 0, 128]');

  // -------------------------------------------------------------------------
  // 3. Camera Anchors Catalog Integrity
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Camera Anchors Catalog Integrity Tests');

  assert(CAMERA_ANCHORS.length === 10, 'Exactly 10 camera anchors defined in catalog');

  const anchorIds = new Set<string>();
  for (let i = 0; i < CAMERA_ANCHORS.length; i++) {
    const a = CAMERA_ANCHORS[i];
    assert(!anchorIds.has(a.id), `Anchor ID '${a.id}' is unique`);
    anchorIds.add(a.id);
    assert(a.name.length > 0, `Anchor '${a.id}' has non-empty name`);
    assert(typeof a.x === 'number' && a.x > 0, `Anchor '${a.id}' has positive x coordinate (${a.x})`);
    assert(typeof a.y === 'number' && a.y > 0, `Anchor '${a.id}' has positive y coordinate (${a.y})`);
    assert(['up', 'down', 'left', 'right'].includes(a.facing), `Anchor '${a.id}' has valid facing direction (${a.facing})`);
  }

  // -------------------------------------------------------------------------
  // 4. File I/O & Procedural Rendering Tests
  // -------------------------------------------------------------------------
  console.log('\n[4/4] File I/O & Procedural Rendering Tests');

  const villageAnchor = CAMERA_ANCHORS[0];
  const renderedVillage = renderAnchorScene(villageAnchor, 64, 64);
  assert(renderedVillage.length === 64 * 64 * 4, 'renderAnchorScene generates 64x64 RGBA buffer');

  const testAnchorId = 'test_qa_anchor';
  const savedPngPath = saveGoldenBaseline(testAnchorId, 64, 64, renderedVillage);
  assert(fs.existsSync(savedPngPath), 'saveGoldenBaseline creates PNG file on disk');

  const loaded = loadGoldenBaseline(testAnchorId);
  assert(loaded.exists, 'loadGoldenBaseline successfully detects saved baseline');
  assert(loaded.data !== undefined && loaded.data.length === 64 * 64 * 4, 'Loaded baseline matches buffer dimensions');

  const heatmapPath = saveDiffHeatmap(testAnchorId, 64, 64, renderedVillage);
  assert(fs.existsSync(heatmapPath), 'saveDiffHeatmap creates diff PNG on disk');

  // Cleanup test artifacts
  try {
    fs.unlinkSync(savedPngPath);
    fs.unlinkSync(path.join(path.dirname(savedPngPath), `${testAnchorId}.raw`));
    fs.unlinkSync(heatmapPath);
  } catch (_) {}

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVisualDiffTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
