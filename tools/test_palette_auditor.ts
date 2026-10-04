/**
 * BitQuest - Palette Harmonizer & Contrast Accessibility Auditor Unit Tests (Issue #36)
 * Command: bun run tools/test_palette_auditor.ts
 */

import { PixelBuffer } from './generate_hitboxes';
import {
  hexToRgba,
  rgbaToHex,
  calculateLuminance,
  calculateContrastRatio,
  simulateCVD,
  extractColorHistogram,
  recommendOutlineColor,
  generateSpriteOutline,
  auditSpriteAgainstTerrain,
  runPaletteAudit,
  CANONICAL_SPRITES,
  CANONICAL_TERRAINS
} from './palette_auditor';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== BITQUEST PALETTE HARMONIZER & CONTRAST AUDITOR UNIT TESTS ===\n');

// ----------------------------------------------------------------------------
// 1. Color Math, Luminance & WCAG Contrast
// ----------------------------------------------------------------------------
console.log('[1/5] Testing Color Math, Luminance & WCAG Contrast Calculation...');

const blackLum = calculateLuminance(0, 0, 0);
assert(blackLum === 0.0, 'Pure black (0, 0, 0) has luminance exactly 0.0');

const whiteLum = calculateLuminance(255, 255, 255);
assert(Math.abs(whiteLum - 1.0) < 0.001, 'Pure white (255, 255, 255) has luminance ~1.0');

const hexBlack = hexToRgba('#000000');
assert(hexBlack.r === 0 && hexBlack.g === 0 && hexBlack.b === 0 && hexBlack.a === 255, 'Parses #000000 to RGBA(0, 0, 0, 255)');

const hexWhite3 = hexToRgba('#fff');
assert(hexWhite3.r === 255 && hexWhite3.g === 255 && hexWhite3.b === 255, 'Parses 3-digit #fff to RGBA(255, 255, 255, 255)');

const hexFormatted = rgbaToHex(15, 23, 42);
assert(hexFormatted.toLowerCase() === '#0f172a', 'Converts RGBA(15, 23, 42) to hex #0f172a');

const maxCr = calculateContrastRatio(whiteLum, blackLum);
assert(Math.abs(maxCr - 21.0) < 0.01, 'White vs Black contrast ratio is 21:1');

const minCr = calculateContrastRatio(whiteLum, whiteLum);
assert(Math.abs(minCr - 1.0) < 0.001, 'Identical color contrast ratio is 1:1');

const symmetryCr1 = calculateContrastRatio(0.2, 0.8);
const symmetryCr2 = calculateContrastRatio(0.8, 0.2);
assert(symmetryCr1 === symmetryCr2, 'Contrast ratio calculation is commutative / symmetric');

// ----------------------------------------------------------------------------
// 2. Color Vision Deficiency (CVD) Simulation
// ----------------------------------------------------------------------------
console.log('\n[2/5] Testing Color Vision Deficiency (CVD) Simulation...');

const pureRedSimProtan = simulateCVD(255, 0, 0, 'protanopia');
assert(pureRedSimProtan.r > 100 && pureRedSimProtan.g > 100, 'Protanopia simulates red loss with shifted olive tones');
assert(pureRedSimProtan.r <= 255 && pureRedSimProtan.g <= 255 && pureRedSimProtan.b <= 255, 'Simulated RGB values remain in [0, 255]');

const pureGreenSimDeuter = simulateCVD(0, 255, 0, 'deuteranopia');
assert(pureGreenSimDeuter.r > 80 && pureGreenSimDeuter.g > 60, 'Deuteranopia simulates green loss with shifted yellowish tones');

const pureBlueSimTritan = simulateCVD(0, 0, 255, 'tritanopia');
assert(pureBlueSimTritan.g > 100 && pureBlueSimTritan.b > 100, 'Tritanopia simulates blue loss with shifted teal/cyan tones');

// ----------------------------------------------------------------------------
// 3. Color Histogram Extraction
// ----------------------------------------------------------------------------
console.log('\n[3/5] Testing Color Histogram Extraction...');

const testBuffer = new PixelBuffer(10, 10);
// 40 pixels of red (#ef4444)
testBuffer.fillRect(0, 0, 10, 4, 239, 68, 68);
// 60 pixels of transparent
const hist = extractColorHistogram(testBuffer);
assert(hist.totalOpaquePixels === 40, 'Accurately counts 40 visible pixels');
assert(hist.entries.length === 1, 'Identifies single unique color');
assert(hist.dominantColors[0].hex.toLowerCase() === '#ef4444', 'Dominant color matches #ef4444');
assert(hist.weightedLuminance > 0.15 && hist.weightedLuminance < 0.25, 'Weighted luminance calculated accurately for red');

const emptyBuffer = new PixelBuffer(8, 8);
const emptyHist = extractColorHistogram(emptyBuffer);
assert(emptyHist.totalOpaquePixels === 0, 'Handles fully transparent buffer with 0 total pixels');
assert(emptyHist.entries.length === 0, 'Empty buffer produces 0 histogram entries');

// ----------------------------------------------------------------------------
// 4. Auto-Outline Recommendation & Generation
// ----------------------------------------------------------------------------
console.log('\n[4/5] Testing Auto-Outline Recommendation & Pixel Dilation...');

const darkTerrainLum = 0.05; // Dark catacombs
const darkSpriteLum = 0.04;  // Shadow bat
const outlineRecForDark = recommendOutlineColor(darkTerrainLum, darkSpriteLum);
assert(
  outlineRecForDark.strategy === 'bright_halo' || outlineRecForDark.strategy === 'golden_accent',
  'Recommends bright halo / golden accent outline on dark terrain'
);
assert(outlineRecForDark.contrastAgainstTerrain >= 4.5, 'Outline achieves >= 4.5:1 contrast against dark terrain');

const brightTerrainLum = 0.6; // Beach sand
const brightSpriteLum = 0.55;
const outlineRecForBright = recommendOutlineColor(brightTerrainLum, brightSpriteLum);
assert(
  outlineRecForBright.strategy === 'dark_silhouette',
  'Recommends dark silhouette outline on bright terrain'
);
assert(outlineRecForBright.contrastAgainstTerrain >= 4.5, 'Outline achieves >= 4.5:1 contrast against bright terrain');

// Test 1-pixel dilation outline buffer
const smallSprite = new PixelBuffer(8, 8);
smallSprite.fillRect(2, 2, 4, 4, 255, 0, 0); // 4x4 red square in center
const outlinedSprite = generateSpriteOutline(smallSprite, '#0f172a', 1);

assert(outlinedSprite.width === 10 && outlinedSprite.height === 10, 'Outlined sprite buffer expands by 2 * thickness');
// Center pixels should still be red
const centerIdx = (3 * 10 + 3) * 4;
assert(
  outlinedSprite.data[centerIdx] === 255 && outlinedSprite.data[centerIdx + 1] === 0,
  'Original sprite pixels preserved in center'
);
// Adjacent border pixel (2, 1) should be dark outline color #0f172a (15, 23, 42)
const borderIdx = (2 * 10 + 2) * 4;
assert(
  outlinedSprite.data[borderIdx] === 15 && outlinedSprite.data[borderIdx + 1] === 23,
  'Border pixels populated with outline color (15, 23, 42)'
);

// ----------------------------------------------------------------------------
// 5. Sprite vs Terrain Contrast Auditing & Full Matrix
// ----------------------------------------------------------------------------
console.log('\n[5/5] Testing Sprite vs Terrain Auditing & Matrix Execution...');

const greenSlime = CANONICAL_SPRITES.find(s => s.id === 'enemy_slime_green')!;
const meadowGrass = CANONICAL_TERRAINS.find(t => t.id === 'tile_meadow_grass')!;
const slimeGrassAudit = auditSpriteAgainstTerrain(
  greenSlime.render(),
  meadowGrass.render(),
  greenSlime.id,
  greenSlime.name,
  meadowGrass.id,
  meadowGrass.name,
  3.5
);
assert(slimeGrassAudit.wcagPass === false, 'Green slime on green grass detected as low contrast (< 3.5:1)');
assert(slimeGrassAudit.needsOutline === true, 'Flags needsOutline for low-contrast matchup');
assert(slimeGrassAudit.recommendedOutline !== undefined, 'Provides auto-outline recommendation');

const skeleton = CANONICAL_SPRITES.find(s => s.id === 'enemy_skeleton')!;
const catacombs = CANONICAL_TERRAINS.find(t => t.id === 'tile_catacombs_floor')!;
const skeletonAudit = auditSpriteAgainstTerrain(
  skeleton.render(),
  catacombs.render(),
  skeleton.id,
  skeleton.name,
  catacombs.id,
  catacombs.name,
  3.5
);
assert(skeletonAudit.wcagPass === true, 'Bone white skeleton on dark catacombs passes high contrast (>= 3.5:1)');
assert(skeletonAudit.rawContrastRatio >= 3.5, `Contrast ratio ${skeletonAudit.rawContrastRatio}:1 exceeds 3.5:1`);

// Full audit across all canonical assets
const fullAudit = runPaletteAudit(CANONICAL_SPRITES, CANONICAL_TERRAINS, 3.5);
assert(fullAudit.totalMatchups === 64, `Audits all 64 matchups (8 sprites × 8 terrains, got ${fullAudit.totalMatchups})`);
assert(fullAudit.lowContrastMatchups > 0, `Identified low-contrast matchups (${fullAudit.lowContrastMatchups})`);
assert(fullAudit.autoOutlinedMatchups === fullAudit.lowContrastMatchups, '100% of low-contrast matchups resolved via auto-outlines');
assert(fullAudit.unresolvedFailures === 0, 'Zero unresolved contrast failures');

console.log('\n========================================');
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('========================================');

if (failedCount > 0) {
  process.exit(1);
}
process.exit(0);
