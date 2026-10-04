/**
 * BitQuest - Sprite Alpha Contour & Hitbox Auto-Generator Unit Test Suite (Issue #32)
 * Tests PixelBuffer operations, alpha contour scanning, footprint calculation (bottom 20%),
 * hurtbox bounds, attack frame hitbox generation, directional reach, and JSON metadata generation.
 */

import fs from 'fs';
import path from 'path';
import {
  AnimationMetadataSchema,
  BoundingBoxSchema
} from '../shared/src/schemas';
import {
  PixelBuffer,
  analyzeAlphaContour,
  renderPlayerWalkFrame,
  renderPlayerSlashFrame,
  renderSlimeFrame,
  renderBossGolemFrame,
  renderPotFrame,
  runHitboxAutoGeneration
} from './generate_hitboxes';

async function runHitboxGeneratorTests() {
  console.log('=== BITQUEST SPRITE ALPHA CONTOUR & HITBOX GENERATOR TEST SUITE ===\n');
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
  // 1. PixelBuffer Operations
  // -------------------------------------------------------------------------
  console.log('[1/4] PixelBuffer Primitive Operations Tests');

  const buf = new PixelBuffer(16, 16);
  assert(buf.width === 16 && buf.height === 16, 'PixelBuffer initializes with correct dimensions');
  assert(buf.getAlpha(0, 0) === 0, 'Initial alpha of buffer is 0 (transparent)');

  buf.setPixel(5, 5, 255, 0, 0, 200);
  assert(buf.getAlpha(5, 5) === 200, 'setPixel / getAlpha sets and retrieves alpha channel');

  // Out of bounds safety
  buf.setPixel(-1, 5, 255, 0, 0);
  buf.setPixel(5, 20, 255, 0, 0);
  assert(buf.getAlpha(-1, 5) === 0, 'getAlpha(-1, 5) safely returns 0');

  // fillRect
  buf.fillRect(2, 2, 4, 4, 0, 255, 0, 255);
  let filledAll = true;
  for (let y = 2; y < 6; y++) {
    for (let x = 2; x < 6; x++) {
      if (buf.getAlpha(x, y) !== 255) filledAll = false;
    }
  }
  assert(filledAll, 'fillRect(2, 2, 4, 4) correctly marks 16 solid pixels');

  // -------------------------------------------------------------------------
  // 2. Alpha Contour Scanning & Bounding Box Logic
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Alpha Contour Scanning & Bounding Box Extraction Tests');

  // Empty buffer edge case
  const emptyBuf = new PixelBuffer(32, 32);
  const emptyRes = analyzeAlphaContour(emptyBuf, { frameId: 'test_empty' });
  assert(!emptyRes.hasContent, 'Empty buffer correctly flagged as hasContent = false');
  assert(emptyRes.footprint !== undefined, 'Empty buffer yields default footprint');

  // Geometric Box Test
  // Create a 10 wide, 20 high character silhouette in center of 32x32:
  // x: 10 to 19 (width 10), y: 6 to 25 (height 20)
  const testCharBuf = new PixelBuffer(32, 32);
  testCharBuf.fillRect(10, 6, 10, 20, 100, 150, 200, 255);

  const charRes = analyzeAlphaContour(testCharBuf, {
    frameId: 'test_char_idle',
    footprintPercent: 0.20
  });

  assert(charRes.hasContent, 'Detected non-transparent character silhouette');
  assert(charRes.solidPixelCount === 200, 'Solid pixel count exactly matches 10x20 = 200 pixels');
  assert(charRes.totalBounds.minX === 10 && charRes.totalBounds.maxX === 19, 'Accurately detected horizontal span [10, 19]');
  assert(charRes.totalBounds.minY === 6 && charRes.totalBounds.maxY === 25, 'Accurately detected vertical span [6, 25]');
  assert(charRes.totalBounds.width === 10 && charRes.totalBounds.height === 20, 'Computed total bounds 10x20');

  // Footprint collider: bottom 20% of 20px is 4px.
  // Base at y=25, so footY = 25 - 4 + 1 = 22.
  assert(charRes.footprint.height === 4, 'Footprint height is 4px (20% of 20px height)');
  assert(charRes.footprint.y === 22, 'Footprint starts at y = 22 (ground level)');
  assert(charRes.footprint.width === 10, 'Footprint spans the base width 10px');
  assert(charRes.footprint.type === 'footprint', 'Footprint type is "footprint"');

  // Body hurtbox
  assert(charRes.hurtbox.type === 'hurtbox', 'Hurtbox type is "hurtbox"');
  assert(charRes.hurtbox.x === 10 && charRes.hurtbox.width === 10, 'Hurtbox horizontally wraps character');

  // Attack frame with weapon hitbox
  const attackResDown = analyzeAlphaContour(testCharBuf, {
    frameId: 'test_attack_down',
    isAttackFrame: true,
    attackDirection: 'down',
    damage: 18,
    knockback: 12,
    weaponReach: 8
  });

  assert(attackResDown.hitbox !== undefined, 'Attack frame generates an active hitbox');
  if (attackResDown.hitbox) {
    assert(attackResDown.hitbox.type === 'hitbox', 'Hitbox type is "hitbox"');
    assert(attackResDown.hitbox.damage === 18, 'Hitbox damage is 18');
    assert(attackResDown.hitbox.knockback === 12, 'Hitbox knockback is 12');
    assert(attackResDown.hitbox.y >= 21, 'Down attack hitbox extends forward/downward');
  }

  // Attack frame up direction
  const attackResUp = analyzeAlphaContour(testCharBuf, {
    frameId: 'test_attack_up',
    isAttackFrame: true,
    attackDirection: 'up',
    damage: 15,
    knockback: 10,
    weaponReach: 8
  });
  assert(attackResUp.hitbox !== undefined && attackResUp.hitbox.y <= 6, 'Up attack hitbox placed above character silhouette');

  // Attack frame side direction
  const attackResSide = analyzeAlphaContour(testCharBuf, {
    frameId: 'test_attack_side',
    isAttackFrame: true,
    attackDirection: 'side',
    damage: 15,
    knockback: 10,
    weaponReach: 8
  });
  assert(attackResSide.hitbox !== undefined && attackResSide.hitbox.x >= 15, 'Side attack hitbox extends to the side');

  // Schema validation of individual boxes
  assert(BoundingBoxSchema.safeParse(charRes.footprint).success, 'Footprint satisfies BoundingBoxSchema');
  assert(BoundingBoxSchema.safeParse(charRes.hurtbox).success, 'Hurtbox satisfies BoundingBoxSchema');
  assert(attackResDown.hitbox && BoundingBoxSchema.safeParse(attackResDown.hitbox).success, 'Hitbox satisfies BoundingBoxSchema');

  // -------------------------------------------------------------------------
  // 3. Procedural Sprite Frame Renderers
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Procedural Sprite Frame Renderers Tests');

  const pWalk = renderPlayerWalkFrame(0);
  assert(pWalk.width === 32 && pWalk.height === 32, 'Player walk frame has 32x32 dimensions');
  const pWalkAnalysis = analyzeAlphaContour(pWalk, { frameId: 'p_walk_0' });
  assert(pWalkAnalysis.hasContent && pWalkAnalysis.solidPixelCount > 50, 'Player walk frame contains solid character pixels');

  const pSlash = renderPlayerSlashFrame(1);
  const pSlashAnalysis = analyzeAlphaContour(pSlash, { frameId: 'p_slash_1', isAttackFrame: true });
  assert(pSlashAnalysis.hitbox !== undefined, 'Player slash frame 1 generates active hitbox');

  const slimeBuf = renderSlimeFrame(0);
  const slimeAnalysis = analyzeAlphaContour(slimeBuf, { frameId: 'slime_0' });
  assert(slimeAnalysis.hasContent, 'Slime frame renders solid pixels');

  const golemBuf = renderBossGolemFrame(2);
  assert(golemBuf.width === 48 && golemBuf.height === 48, 'Boss golem frame has 48x48 dimensions');
  const golemAnalysis = analyzeAlphaContour(golemBuf, { frameId: 'golem_slam', isAttackFrame: true });
  assert(golemAnalysis.hitbox !== undefined, 'Golem slam frame generates shockwave attack hitbox');

  const potBuf = renderPotFrame();
  assert(potBuf.width === 16 && potBuf.height === 16, 'Pot frame has 16x16 dimensions');
  const potAnalysis = analyzeAlphaContour(potBuf, { frameId: 'pot_0' });
  assert(potAnalysis.hasContent, 'Pot frame renders solid clay pixels');

  // -------------------------------------------------------------------------
  // 4. Batch Pipeline Execution & Output File Validation
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Batch Pipeline Execution & Output Validation Tests');

  const catalog = runHitboxAutoGeneration();
  assert(catalog.totalAnimations >= 5, `Generated at least 5 animations (found ${catalog.totalAnimations})`);
  assert(catalog.totalFrames >= 17, `Generated at least 17 frames (found ${catalog.totalFrames})`);

  // Verify file on disk
  const outPath = path.resolve(import.meta.dir, '../shared/data/generated_hitboxes.json');
  assert(fs.existsSync(outPath), 'shared/data/generated_hitboxes.json exists on disk');

  const fileContent = fs.readFileSync(outPath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  assert(parsed.animations !== undefined, 'JSON file contains animations dictionary');

  for (const animKey of Object.keys(parsed.animations)) {
    const meta = parsed.animations[animKey];
    const validation = AnimationMetadataSchema.safeParse(meta);
    assert(validation.success, `Animation '${animKey}' fully conforms to AnimationMetadataSchema`);
    assert(meta.frames.length === meta.totalFrames, `Animation '${animKey}' frames count matches totalFrames`);
    for (const frame of meta.frames) {
      assert(frame.boxes.length >= 2, `Frame ${frame.frameIndex} of '${animKey}' has at least 2 boxes (hurtbox + footprint)`);
    }
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runHitboxGeneratorTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
