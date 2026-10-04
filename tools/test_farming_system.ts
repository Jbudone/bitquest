/**
 * BitQuest - Cozy Farming & Crop Cultivation System Unit Tests
 * Command: bun run tools/test_farming_system.ts
 */

import {
  FarmingManager,
  CROP_DEFINITIONS,
  type CropSpeciesId
} from '../shared/src/farming';

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

console.log('=== BITQUEST COZY FARMING & CROP CULTIVATION UNIT TESTS ===\n');

// ----------------------------------------------------------------------------
// 1. Soil Tilling & Coordinate Mapping
// ----------------------------------------------------------------------------
console.log('[1/5] Testing Soil Tilling & Plot Creation...');

const fm = new FarmingManager();
const plot1 = fm.tillPlot(10, 15);
assert(plot1.x === 10 && plot1.y === 15, 'Tilled plot retains correct tile coordinates');
assert(plot1.worldX === 10 * 32 + 16, 'World coordinate X centered on 32px tile');
assert(plot1.worldY === 15 * 32 + 16, 'World coordinate Y centered on 32px tile');
assert(!plot1.isWatered, 'Freshly tilled plot starts dry');
assert(plot1.cropSpecies === undefined, 'Freshly tilled plot starts without crop');

const allPlots = fm.getAllPlots();
assert(allPlots.length === 1, 'Plot catalog contains exactly 1 plot');

// ----------------------------------------------------------------------------
// 2. Seed Planting & Validation
// ----------------------------------------------------------------------------
console.log('\n[2/5] Testing Seed Planting & Crop Initialization...');

// Attempt planting on untilled plot
const failUntil = fm.plantCrop(20, 20, 'seed_turnip');
assert(!failUntil.success, 'Rejects planting seed on untilled plot');

// Attempt planting invalid seed
const failSeed = fm.plantCrop(10, 15, 'iron_sword');
assert(!failSeed.success, 'Rejects planting non-seed item');

// Successfully plant turnip
const plantRes = fm.plantCrop(10, 15, 'seed_turnip');
assert(plantRes.success, 'Successfully planted Meadow Turnip');
assert(plot1.cropSpecies === 'turnip', 'Plot species assigned as turnip');
assert(plot1.stage === 0, 'Planted crop starts at Stage 0 (Planted)');
assert(plot1.growthProgress === 0.0, 'Growth progress starts at 0.0');

// Attempt double-planting
const doublePlant = fm.plantCrop(10, 15, 'seed_strawberry');
assert(!doublePlant.success, 'Prevents double-planting on occupied plot');

// ----------------------------------------------------------------------------
// 3. Hydration, Rain Auto-Watering & Growth Dynamics
// ----------------------------------------------------------------------------
console.log('\n[3/5] Testing Hydration, Growth Acceleration & Rain Auto-Watering...');

// Dry growth test
fm.update(5, false); // 5 seconds dry
assert(plot1.growthProgress > 0, 'Dry crop makes initial progress');
const dryProgress = plot1.growthProgress;

// Water plot
const waterRes = fm.waterPlot(10, 15);
assert(waterRes.success && plot1.isWatered, 'Watering can hydrates plot');

// Watered growth should proceed faster than dry growth rate
fm.update(5, false);
const wetProgressGain = plot1.growthProgress - dryProgress;
assert(wetProgressGain > dryProgress, 'Watered soil accelerates crop growth rate');

// Test rain auto-watering
const plotRain = fm.tillPlot(12, 18);
assert(!plotRain.isWatered, 'New plot starts dry before rain');
fm.update(1, true); // Raining!
assert(plotRain.isWatered, 'Rainfall automatically hydrates outdoor tilled plots');

// ----------------------------------------------------------------------------
// 4. Growth Stage Transitions & Maturation
// ----------------------------------------------------------------------------
console.log('\n[4/5] Testing Growth Stages & Maturation...');

const turnipDef = CROP_DEFINITIONS['turnip'];
// Advance enough time to reach 100% maturity
fm.update(turnipDef.growthDurationSec + 10, true);
assert(plot1.growthProgress >= 1.0, 'Turnip reaches 100% growth progress');
assert(plot1.stage === 3, 'Turnip advances to Stage 3 (Mature & Harvestable)');

// ----------------------------------------------------------------------------
// 5. Harvesting, Yields, Golden Mutations & Regrowth Loops
// ----------------------------------------------------------------------------
console.log('\n[5/5] Testing Harvesting, Yields, Golden Mutation & Regrowth...');

// Harvest mature turnip
const harvestTurnip = fm.harvestPlot(10, 15);
assert(harvestTurnip.success, 'Successfully harvested mature turnip');
assert(harvestTurnip.quantity! >= 1 && harvestTurnip.quantity! <= 2, 'Harvest yield falls within defined bounds [1, 2]');
assert(harvestTurnip.itemId === (harvestTurnip.isGolden ? 'crop_golden_turnip' : 'crop_turnip'), 'Produces valid crop item ID');
assert(plot1.cropSpecies === undefined, 'Single-harvest turnip clears plot for next replanting');

// Test regrowing crop (Strawberry)
const plotBerry = fm.tillPlot(14, 14);
fm.plantCrop(14, 14, 'seed_strawberry');
const berryDef = CROP_DEFINITIONS['strawberry'];
fm.update(berryDef.growthDurationSec + 10, true); // Reach maturity
assert(plotBerry.stage === 3, 'Strawberry reaches mature stage 3');

const harvestBerry = fm.harvestPlot(14, 14);
assert(harvestBerry.success, 'Harvested strawberry yield');
assert(harvestBerry.quantity! >= 2 && harvestBerry.quantity! <= 4, 'Strawberry yield within [2, 4]');
assert(plotBerry.cropSpecies === 'strawberry', 'Regrowing strawberry remains planted after harvest');
assert(plotBerry.stage === 1, 'Strawberry resets to regrowth sprout stage 1 for continuous harvesting');

// Serialization & round-trip persistence
const serialized = fm.serialize();
const newFm = new FarmingManager();
newFm.deserialize(serialized);
const restoredBerry = newFm.getPlot(14, 14);
assert(restoredBerry !== undefined, 'Restores saved plot from serialization');
assert(restoredBerry?.cropSpecies === 'strawberry', 'Preserves crop species in restored state');
assert(restoredBerry?.stage === 1, 'Preserves stage in restored state');

console.log('\n========================================');
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('========================================');

if (failedCount > 0) {
  process.exit(1);
}
process.exit(0);
