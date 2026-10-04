// tools/test_foliage_dynamics.ts
// BitQuest Weather-Driven Flora & Foliage Dynamics Unit Tests
// Milestone 6: Flora state machine, wind sway vectors, circadian luminescence, and zero-allocation math

import {
  FoliageDynamicsEngine,
  WORLD_FLORA,
  type FloraDefinition,
  type FloraBloomState,
  type SwayVector,
  type FloraEvaluationResult
} from '../shared/src/foliageDynamics';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${msg}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

console.log('=== BITQUEST WEATHER-DRIVEN FLORA & FOLIAGE TESTS ===\n');

// 1. Flora Catalog & World Placements
console.log('[1/4] Testing World Flora Catalog & Attributes...');
assert(WORLD_FLORA.length >= 8, `World flora catalog has ${WORLD_FLORA.length} entries (expected >= 8)`);
for (const flora of WORLD_FLORA) {
  assert(flora.x > 0 && flora.y > 0, `Flora ${flora.id} has positive coordinates (${flora.x}, ${flora.y})`);
  assert(flora.baseFlexibility > 0 && flora.baseFlexibility <= 0.3, `Flora ${flora.id} has valid flexibility (${flora.baseFlexibility})`);
  assert(flora.harvestYield >= 1, `Flora ${flora.id} has base harvest yield >= 1`);
  assert(flora.cooldownSec >= 30, `Flora ${flora.id} has cooldown >= 30s (${flora.cooldownSec}s)`);
}

// 2. Weather & Circadian Bloom Logic
console.log('\n[2/4] Testing Weather & Circadian Bloom Evaluations...');
const sunbloom = WORLD_FLORA.find(f => f.species === 'wildflower_sunbloom')!;
const rainLily = WORLD_FLORA.find(f => f.species === 'wildflower_rain_lily')!;
const moonBlossom = WORLD_FLORA.find(f => f.species === 'wildflower_moon_blossom')!;
const glowcap = WORLD_FLORA.find(f => f.species === 'shroom_glowcap')!;

// Sunbloom tests
const sunSunny = FoliageDynamicsEngine.evaluateFloraBloom(sunbloom, 'clear', 'day');
assert(sunSunny.state === 'radiant', 'Sunbloom is radiant during clear daylight');
assert(sunSunny.bonusForageYield === 1, 'Radiant Sunbloom awards +1 bonus yield');

const sunRainy = FoliageDynamicsEngine.evaluateFloraBloom(sunbloom, 'rain', 'night');
assert(sunRainy.state === 'dormant', 'Sunbloom is dormant during rainy night');

// Rain lily tests
const lilyRainy = FoliageDynamicsEngine.evaluateFloraBloom(rainLily, 'rain', 'day');
assert(lilyRainy.state === 'radiant', 'Rain Lily is radiant during daytime rain');

const lilyClearDay = FoliageDynamicsEngine.evaluateFloraBloom(rainLily, 'clear', 'day');
assert(lilyClearDay.state === 'blooming', 'Rain Lily is blooming during daytime clear (partial condition)');

const lilyClearNight = FoliageDynamicsEngine.evaluateFloraBloom(rainLily, 'clear', 'night');
assert(lilyClearNight.state === 'dormant', 'Rain Lily is dormant during clear night');

// Moon blossom tests
const moonNight = FoliageDynamicsEngine.evaluateFloraBloom(moonBlossom, 'clear', 'night');
assert(moonNight.state === 'radiant', 'Moon Blossom is radiant at night');
assert(moonNight.glowAlpha > 0.5, 'Moon Blossom has strong bioluminescent glow at night');
assert(moonNight.glowRadius >= 30, 'Moon Blossom illuminates surrounding area');

const moonDay = FoliageDynamicsEngine.evaluateFloraBloom(moonBlossom, 'clear', 'day');
assert(moonDay.state === 'blooming', 'Moon Blossom partially blooms in clear weather during day');

// Glowcap tests
const glowcapStorm = FoliageDynamicsEngine.evaluateFloraBloom(glowcap, 'storm', 'night');
assert(glowcapStorm.state === 'radiant', 'Glowcap is radiant during nocturnal storm');
assert(glowcapStorm.glowAlpha >= 0.8, 'Glowcap emits strong phosphorescence in dark storm');

// 3. Wind Sway Kinematics & Zero-Allocation Math
console.log('\n[3/4] Testing Wind Sway Kinematics & Zero-Allocation Vector Math...');
const swayOut: SwayVector = { x: 0, y: 0, angleRad: 0 };
const retSway = FoliageDynamicsEngine.computeWindSway(1.0, 0, 1.0, 0.15, 0, swayOut);

assert(retSway === swayOut, 'computeWindSway mutates and returns the passed out object (0 allocation)');

// Wind along +X (windAngle = 0)
const swayEast = FoliageDynamicsEngine.computeWindSway(0.5, 0, 2.0, 0.15, 0, swayOut);
assert(Math.abs(swayEast.y) < 1e-6, 'Wind blowing East (angle=0) results in zero Y displacement');

// High wind speed vs low wind speed
const swayCalm: SwayVector = { x: 0, y: 0, angleRad: 0 };
const swayGale: SwayVector = { x: 0, y: 0, angleRad: 0 };
FoliageDynamicsEngine.computeWindSway(1.2, 0.5, 0.5, 0.2, 0, swayCalm);
FoliageDynamicsEngine.computeWindSway(1.2, 0.5, 3.0, 0.2, 0, swayGale);

assert(
  Math.abs(swayGale.angleRad) > Math.abs(swayCalm.angleRad),
  `Gale wind (${Math.abs(swayGale.angleRad).toFixed(3)} rad) produces greater sway than calm wind (${Math.abs(swayCalm.angleRad).toFixed(3)} rad)`
);

// 4. Botanical Foraging & Yield Calculations
console.log('\n[4/4] Testing Botanical Foraging Rules & Cooldowns...');
assert(
  !FoliageDynamicsEngine.canHarvest(sunbloom, 100, 120, 'dormant'),
  'Dormant flora cannot be harvested'
);
assert(
  !FoliageDynamicsEngine.canHarvest(sunbloom, 100, 120, 'blooming'),
  'Flora still on cooldown cannot be harvested (elapsed 20s < 45s cooldown)'
);
assert(
  FoliageDynamicsEngine.canHarvest(sunbloom, 100, 150, 'blooming'),
  'Flora off cooldown can be harvested (elapsed 50s >= 45s cooldown)'
);

const baseYield = FoliageDynamicsEngine.calculateHarvestYield(sunbloom, 'blooming');
const radiantYield = FoliageDynamicsEngine.calculateHarvestYield(sunbloom, 'radiant');
assert(baseYield === sunbloom.harvestYield, `Blooming yield matches base (${baseYield})`);
assert(radiantYield === sunbloom.harvestYield + 1, `Radiant yield awards +1 bonus (${radiantYield})`);

console.log('\n========================================');
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('========================================');

if (failCount > 0) {
  process.exit(1);
}
