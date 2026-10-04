/**
 * BitQuest - Headless Visual Regression & Golden Image Test Suite (Issue #33)
 * Teleports to 10 key camera anchors, captures/evaluates canvas render buffers,
 * computes pixel-diff ratios against golden baseline screenshots,
 * and generates visual diff heatmaps whenever diff > 0.5%.
 */

import fs from 'fs';
import path from 'path';
import {
  CAMERA_ANCHORS,
  comparePixelBuffers,
  renderAnchorScene,
  saveGoldenBaseline,
  loadGoldenBaseline,
  saveDiffHeatmap,
  ensureGoldenDirs,
  type CameraAnchor
} from './visual_diff_engine';

async function runVisualRegressionSuite() {
  console.log('=== BITQUEST HEADLESS VISUAL REGRESSION & GOLDEN IMAGE SUITE ===\n');

  ensureGoldenDirs();
  const isUpdate = process.argv.includes('--update-golden');

  if (isUpdate) {
    console.log('📸 Updating 10 Golden Baselines...\n');
  } else {
    console.log('🔍 Comparing Render State Against Golden Baselines (Threshold: 0.5%)...\n');
  }

  let passed = 0;
  let failed = 0;
  const W = 256;
  const H = 256;

  for (let i = 0; i < CAMERA_ANCHORS.length; i++) {
    const anchor = CAMERA_ANCHORS[i];
    const num = `[${i + 1}/${CAMERA_ANCHORS.length}]`;

    // 1. Render candidate scene at camera anchor
    const candidateBuf = renderAnchorScene(anchor, W, H);

    if (isUpdate) {
      const savedPath = saveGoldenBaseline(anchor.id, W, H, candidateBuf);
      console.log(`  ✓ ${num} Captured Golden Baseline for ${anchor.name} (${anchor.id})`);
      passed++;
      continue;
    }

    // 2. Check if golden baseline exists; if not, initialize it
    let baseline = loadGoldenBaseline(anchor.id);
    if (!baseline.exists || !baseline.data) {
      console.log(`  ℹ️ Baseline missing for ${anchor.id}, generating initial golden baseline...`);
      saveGoldenBaseline(anchor.id, W, H, candidateBuf);
      baseline = loadGoldenBaseline(anchor.id);
    }

    // 3. Compute pixel-diff ratio
    const diff = comparePixelBuffers(baseline.data!, candidateBuf, W, H, {
      tolerance: 10,
      diffThreshold: 0.005 // 0.5%
    });

    if (diff.isMatch) {
      console.log(`  ✓ ${num} ${anchor.name} PASS (Diff: ${diff.diffPercent}%, ${diff.mismatchedPixels}/${diff.totalPixels} px)`);
      passed++;
    } else {
      console.error(`  ✗ ${num} ${anchor.name} REGRESSION DETECTED! (Diff: ${diff.diffPercent}% > 0.5%)`);
      const heatmapPath = saveDiffHeatmap(anchor.id, W, H, diff.diffHeatmap);
      console.error(`    🔥 Visual Diff Heatmap generated: ${heatmapPath}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('     VISUAL REGRESSION TEST SUMMARY     ');
  console.log('========================================');
  console.log(`Total Anchors Tested: ${CAMERA_ANCHORS.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute
if (import.meta.main) {
  runVisualRegressionSuite().catch(err => {
    console.error('Fatal visual regression error:', err);
    process.exit(1);
  });
}
