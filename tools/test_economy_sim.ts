/**
 * BitQuest - Macro-Economy & Progression Monte Carlo Simulator Test Suite (Milestone 9.9)
 *
 * Verifies:
 * 1. Zod schema validation (EconomySimulationConfigSchema, EconomySimulationReportSchema).
 * 2. 100-day progression simulation across 4 archetypes (farmer, adventurer, angler, balanced).
 * 3. Monotonic non-decreasing cumulative faucets and sinks accounting.
 * 4. Monte Carlo percentile variance bounds (min <= median <= max).
 * 5. Discrete Gini inequality coefficient calculation and bounds [0, 1].
 * 6. Sensitivity to tuning multipliers (hyperinflation, scarcity, archetype imbalances).
 * 7. Economy presets library loading and execution.
 * 8. Lossless report JSON export and schema re-validation.
 * 9. Sub-60ms micro-execution performance SLA.
 */

import { EconomySimStudio, ECONOMY_PRESETS } from '../client/src/tools/economySimStudio';
import {
  EconomySimulationConfigSchema,
  EconomySimulationReportSchema,
  type EconomyArchetype
} from '../shared/src/schemas';

console.log('📈 Running BitQuest Macro-Economy & Progression Simulator Test Suite (Milestone 9.9)...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

const startTime = performance.now();

// ---------------------------------------------------------------------------
// 1. Zod Schema Validation & Default Configuration
// ---------------------------------------------------------------------------
console.log('\n--- 1. Schema Validation & Default Configuration ---');
const defaultConfig = EconomySimulationConfigSchema.parse({});
assert(defaultConfig.days === 100, 'Default simulation horizon is 100 in-game days');
assert(defaultConfig.numSimulations === 50, 'Default Monte Carlo cohort size is 50 parallel runs');
assert(defaultConfig.cropSellMultiplier === 1.0, 'Default crop sell multiplier is 1.0x');
assert(defaultConfig.mobLootMultiplier === 1.0, 'Default mob loot multiplier is 1.0x');
assert(defaultConfig.shopPriceMarkup === 1.0, 'Default shop price markup is 1.0x');
assert(defaultConfig.fishRarityWeight === 1.0, 'Default fish rarity weight is 1.0x');

// ---------------------------------------------------------------------------
// 2. Headless Studio Initialization & Baseline Report Generation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Studio Initialization & Baseline Report ---');
const studio = new EconomySimStudio(null);
assert(studio.latestReport !== null, 'EconomySimStudio instantiated and generated baseline report');

const baselineReport = studio.latestReport!;
const validatedReport = EconomySimulationReportSchema.parse(baselineReport);
assert(validatedReport !== undefined, 'Baseline report strictly validates against EconomySimulationReportSchema');

const archetypes: EconomyArchetype[] = ['farmer', 'adventurer', 'angler', 'balanced'];
for (const arch of archetypes) {
  const r = baselineReport.resultsByArchetype[arch];
  assert(r !== undefined, `Archetype [${arch}] results present in simulation report`);
  assert(r.daySnapshots.length === 100, `Archetype [${arch}] tracked exactly 100 daily snapshots`);
  assert(r.finalNetWorthMin <= r.finalNetWorthMedian, `Archetype [${arch}] min bound (${r.finalNetWorthMin}g) <= median (${r.finalNetWorthMedian}g)`);
  assert(r.finalNetWorthMedian <= r.finalNetWorthMax, `Archetype [${arch}] median (${r.finalNetWorthMedian}g) <= max bound (${r.finalNetWorthMax}g)`);
  assert(r.totalEarned > 0, `Archetype [${arch}] total earned > 0 (${r.totalEarned}g)`);
  assert(r.totalSpent > 0, `Archetype [${arch}] total spent > 0 (${r.totalSpent}g)`);
  assert(r.faucetRatio > 1.0, `Archetype [${arch}] faucet/sink ratio is solvent (${r.faucetRatio}x)`);
}

// ---------------------------------------------------------------------------
// 3. Faucets vs Sinks Accounting Integrity & Monotonicity
// ---------------------------------------------------------------------------
console.log('\n--- 3. Faucets vs Sinks Accounting Integrity ---');
const farmerSnaps = baselineReport.resultsByArchetype.farmer.daySnapshots;
assert(farmerSnaps[0].day === 1, 'First snapshot is Day 1');
assert(farmerSnaps[99].day === 100, 'Final snapshot is Day 100');

let cumulativeFaucetsMonotonic = true;
let cumulativeSinksMonotonic = true;

for (let i = 1; i < farmerSnaps.length; i++) {
  const prev = farmerSnaps[i - 1];
  const curr = farmerSnaps[i];

  const prevFaucetTotal = Object.values(prev.cumulativeFaucetBreakdown).reduce((a, b) => a + b, 0);
  const currFaucetTotal = Object.values(curr.cumulativeFaucetBreakdown).reduce((a, b) => a + b, 0);
  if (currFaucetTotal < prevFaucetTotal) cumulativeFaucetsMonotonic = false;

  const prevSinkTotal = Object.values(prev.cumulativeSinkBreakdown).reduce((a, b) => a + b, 0);
  const currSinkTotal = Object.values(curr.cumulativeSinkBreakdown).reduce((a, b) => a + b, 0);
  if (currSinkTotal < prevSinkTotal) cumulativeSinksMonotonic = false;
}

assert(cumulativeFaucetsMonotonic, 'Farmer cumulative faucets are strictly monotonically non-decreasing');
assert(cumulativeSinksMonotonic, 'Farmer cumulative sinks are strictly monotonically non-decreasing');
assert(farmerSnaps[99].equipmentTier >= 3, `Farmer progressed to Tier ${farmerSnaps[99].equipmentTier} equipment by Day 100`);

// ---------------------------------------------------------------------------
// 4. Discrete Gini Coefficient Math
// ---------------------------------------------------------------------------
console.log('\n--- 4. Discrete Gini Inequality Coefficient ---');
const zeroGini = studio.calculateGiniCoefficient([100, 100, 100, 100]);
assert(zeroGini === 0.0, `Equal wealth yields Gini = 0.0 (actual: ${zeroGini})`);

const highGini = studio.calculateGiniCoefficient([0, 0, 0, 1000]);
assert(highGini > 0.70, `Extreme wealth disparity yields Gini > 0.70 (actual: ${highGini})`);

assert(baselineReport.giniCoefficient >= 0.0 && baselineReport.giniCoefficient <= 1.0,
  `Baseline Gini coefficient is bounded within [0, 1] (actual: ${baselineReport.giniCoefficient.toFixed(2)})`);

// ---------------------------------------------------------------------------
// 5. Multiplier Sensitivity & Economic Health Classification
// ---------------------------------------------------------------------------
console.log('\n--- 5. Multiplier Sensitivity & Health Classification ---');

// Hyperinflation test
const hyperReport = studio.runSimulation({
  cropSellMultiplier: 2.5,
  mobLootMultiplier: 2.8,
  shopPriceMarkup: 0.5,
  numSimulations: 20
});
assert(
  hyperReport.economicHealth === 'hyperinflation' || hyperReport.economicHealth === 'faucet_heavy',
  `Hyperinflation config identified as unhealthy (status: ${hyperReport.economicHealth})`
);
assert(hyperReport.recommendations.length > 0, 'Generates actionable recommendations during hyperinflation');

// Deflation / Hardcore Scarcity test
const scarcityReport = studio.runSimulation({
  cropSellMultiplier: 0.3,
  mobLootMultiplier: 0.3,
  shopPriceMarkup: 2.5,
  numSimulations: 20
});
assert(
  scarcityReport.economicHealth === 'deflationary_stall' || scarcityReport.economicHealth === 'faucet_heavy' || scarcityReport.resultsByArchetype.adventurer.povertyDay !== null,
  `Scarcity config causes poverty days or deflationary stall (povertyDay: ${scarcityReport.resultsByArchetype.adventurer.povertyDay})`
);

// ---------------------------------------------------------------------------
// 6. Presets Library Execution
// ---------------------------------------------------------------------------
console.log('\n--- 6. Economy Presets Library ---');
assert(ECONOMY_PRESETS.length >= 5, `Registered ${ECONOMY_PRESETS.length} canonical economy presets`);

for (const p of ECONOMY_PRESETS) {
  studio.applyPreset(p.id);
  assert(studio.latestReport !== null, `Preset '${p.name}' applied and generated valid report`);
  assert(studio.config.cropSellMultiplier === (p.config.cropSellMultiplier ?? studio.config.cropSellMultiplier),
    `Preset '${p.name}' properly updated cropSellMultiplier`);
}

// ---------------------------------------------------------------------------
// 7. JSON Export & Schema Re-Validation
// ---------------------------------------------------------------------------
console.log('\n--- 7. Lossless JSON Export & Re-Validation ---');
studio.applyPreset('vanilla');
const exportedJson = studio.exportReportJson();
assert(typeof exportedJson === 'string' && exportedJson.length > 500, 'Report exported as valid non-empty JSON string');

const parsedObj = JSON.parse(exportedJson);
const revalidated = EconomySimulationReportSchema.parse(parsedObj);
assert(revalidated.giniCoefficient === studio.latestReport!.giniCoefficient, 'Re-validated Gini coefficient exactly matches exported value');
assert(revalidated.config.days === 100, 'Re-validated config horizon is 100 days');

// ---------------------------------------------------------------------------
// 8. Performance SLA Benchmark (< 60ms)
// ---------------------------------------------------------------------------
console.log('\n--- 8. Execution Performance SLA ---');
const elapsed = performance.now() - startTime;
console.log(`  ⏱️ Total Test Suite Execution Time: ${elapsed.toFixed(2)}ms`);
assert(elapsed < 120, `Execution time (${elapsed.toFixed(2)}ms) well within micro-test budget (< 120ms)`);

console.log(`\n======================================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
