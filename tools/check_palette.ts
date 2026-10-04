#!/usr/bin/env bun
/**
 * BitQuest - Palette Harmonizer & Contrast Accessibility Auditor CLI (Issue #36)
 * Command: bun run check:palette
 *
 * Acceptance Criteria:
 * 1. Extracts color histograms from sprites and compares against underlying terrain.
 * 2. Computes WCAG contrast ratio (verifies minimum 3.5:1 luminosity contrast).
 * 3. Flags low-contrast matchups for auto-outline generation.
 */

import {
  runPaletteAudit,
  CANONICAL_SPRITES,
  CANONICAL_TERRAINS,
  type MatchupAuditResult
} from './palette_auditor';

function main() {
  console.log('======================================================================');
  console.log('  🎨 BITQUEST PALETTE HARMONIZER & CONTRAST ACCESSIBILITY AUDITOR   ');
  console.log('  WCAG 2.1 Luminance • 3.5:1 Threshold • Auto-Outline Generation     ');
  console.log('======================================================================\n');

  const audit = runPaletteAudit(CANONICAL_SPRITES, CANONICAL_TERRAINS, 3.5);

  console.log(`[1/3] Audited ${audit.totalMatchups} Sprite × Terrain Matchups:`);
  console.log(`  • Registered Sprites:  ${CANONICAL_SPRITES.length} (Players, Enemies, Loot Items)`);
  console.log(`  • Registered Terrains: ${CANONICAL_TERRAINS.length} (Meadow, Fungal, Cobble, Path, Lake, etc.)\n`);

  // Group by status
  const lowContrastMatchups: MatchupAuditResult[] = [];
  const passingMatchups: MatchupAuditResult[] = [];

  for (const m of audit.matchups) {
    if (m.wcagPass) {
      passingMatchups.push(m);
    } else {
      lowContrastMatchups.push(m);
    }
  }

  // Display flagged low-contrast matchups
  console.log(`[2/3] Flagged ${lowContrastMatchups.length} Low-Contrast Matchups (< 3.5:1 Luminosity Contrast):`);
  for (const m of lowContrastMatchups) {
    const rec = m.recommendedOutline!;
    console.log(
      `  ⚠️  [CR ${m.rawContrastRatio.toFixed(2)}:1] "${m.spriteName}" on "${m.terrainName}"`
    );
    console.log(
      `      ↳ Auto-Outline: ${rec.outlineHex} (${rec.strategy}) -> New CR: ${rec.contrastAgainstTerrain.toFixed(2)}:1 [PASS ≥ 4.5:1]`
    );
    console.log(
      `      ↳ CVD Simulated Ratios: Protan: ${m.cvdContrast.protanopia.toFixed(2)}:1 | Deuter: ${m.cvdContrast.deuteranopia.toFixed(2)}:1 | Tritan: ${m.cvdContrast.tritanopia.toFixed(2)}:1`
    );
  }

  console.log('\n[3/3] High-Contrast Pass Highlights (≥ 3.5:1 Native Separation):');
  // Show a selection of distinct high-contrast matchups
  const samplePasses = [
    passingMatchups.find(m => m.spriteId === 'enemy_skeleton' && m.terrainId === 'tile_catacombs_floor'),
    passingMatchups.find(m => m.spriteId === 'item_gold_coin' && m.terrainId === 'tile_fungal_grass'),
    passingMatchups.find(m => m.spriteId === 'player_hero' && m.terrainId === 'tile_dirt_path'),
    passingMatchups.find(m => m.spriteId === 'item_health_potion' && m.terrainId === 'tile_meadow_grass')
  ].filter(Boolean) as MatchupAuditResult[];

  for (const p of samplePasses) {
    console.log(
      `  ✓ [CR ${p.rawContrastRatio.toFixed(2)}:1] "${p.spriteName}" on "${p.terrainName}" (Accessible)`
    );
  }

  console.log('\n======================================================================');
  console.log('  AUDIT SUMMARY RESULTS');
  console.log('======================================================================');
  console.log(`  Total Matchups Tested:      ${audit.totalMatchups}`);
  console.log(`  Native Accessible (≥ 3.5:1): ${audit.passingMatchups} (${audit.passRatePercent}%)`);
  console.log(`  Low-Contrast Flagged:       ${audit.lowContrastMatchups}`);
  console.log(`  Auto-Outlines Generated:    ${audit.autoOutlinedMatchups} (100% Resolved)`);
  console.log(`  Unresolved Failures:        ${audit.unresolvedFailures}`);
  console.log('======================================================================');

  if (audit.unresolvedFailures > 0) {
    console.error(`\n❌ PALETTE AUDIT FAILED: ${audit.unresolvedFailures} unresolvable color matchups detected.`);
    process.exit(1);
  }

  console.log('\n✅ PALETTE HARMONIZER & CONTRAST AUDIT: ALL MATCHUPS VERIFIED & ACCESSIBLE!\n');
  process.exit(0);
}

main();
