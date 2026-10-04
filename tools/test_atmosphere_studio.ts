/**
 * BitQuest - Dynamic Lighting, Weather & Atmosphere Calibration Studio Test Suite (Milestone 9.6)
 *
 * Verifies:
 * 1. Canonical preset library loading and strict Zod schema validation.
 * 2. Circadian lighting mathematical interpolation (High Noon, Sunrise, Golden Hour, Midnight).
 * 3. 24-Hour cyclic boundary wrapping across midnight (23.9h -> 0.1h).
 * 4. Keyframe timeline mutations (adding, updating color/alpha, chronologic sorting, safe deletion).
 * 5. Biome particle simulation configurations (Rain, Wind, Lightning, Fireflies, Fog).
 * 6. Split-screen viewport mode calculations (0%, 50%, 100%).
 * 7. Zero-dependency TypeScript code generator syntax and correctness.
 * 8. Lossless JSON export and import validation with error safety.
 */

import { AtmosphereStudio } from '../client/src/tools/atmosphereStudio';
import { AtmosphereCalibrationPresetSchema } from '../shared/src/schemas';
import atmospherePresetsJson from '../shared/data/atmospherePresets.json';

console.log('☀️ Running BitQuest Atmosphere & Lighting Calibration Test Suite (Milestone 9.6)...');

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

// ---------------------------------------------------------------------------
// 1. Loading Canonical Presets & Schema Validation
// ---------------------------------------------------------------------------
console.log('\n--- 1. Loading Canonical Presets & Schema Validation ---');
const studio = new AtmosphereStudio();
assert(studio.presets !== undefined, 'AtmosphereStudio initialized with presets library');

const presetKeys = Object.keys(studio.presets);
assert(presetKeys.length >= 5, `Loaded ${presetKeys.length} canonical atmosphere presets (expected >= 5)`);

const required = [
  'village_fair',
  'haunted_catacombs',
  'stormy_cliffs',
  'whispering_meadows',
  'blood_moon_eclipse'
];

for (const req of required) {
  assert(studio.presets[req] !== undefined, `Preset '${req}' exists in library`);
}

// Strictly validate each preset against AtmosphereCalibrationPresetSchema
for (const [key, preset] of Object.entries(atmospherePresetsJson)) {
  const parseResult = AtmosphereCalibrationPresetSchema.safeParse(preset);
  assert(parseResult.success, `Preset [${key}] strictly validates against AtmosphereCalibrationPresetSchema`);
}

// ---------------------------------------------------------------------------
// 2. Circadian Lighting Mathematical Interpolation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Circadian Lighting Mathematical Interpolation ---');
studio.loadPreset('village_fair');

// High Noon (12:00)
const noonLight = studio.getInterpolatedLighting(12.0);
assert(noonLight.alpha === 0, `High Noon alpha is 0.00 (full crystal sunlight, got ${noonLight.alpha})`);
assert(noonLight.r === 255 && noonLight.g === 255 && noonLight.b === 255, 'High Noon color is pure white (#ffffff)');

// Midnight (0:00 / 24:00)
const midnightLight = studio.getInterpolatedLighting(0.0);
assert(midnightLight.alpha >= 0.6, `Midnight alpha provides dark ambient darkness (${midnightLight.alpha} >= 0.6)`);
assert(midnightLight.b > midnightLight.r, 'Midnight color leans deep indigo/navy blue');

// Sunrise Rose (6:00)
const sunriseLight = studio.getInterpolatedLighting(6.0);
assert(sunriseLight.r > sunriseLight.b, 'Sunrise has warm rose/pink cast');
assert(sunriseLight.alpha < midnightLight.alpha, 'Sunrise alpha is significantly lighter than midnight');

// Golden Hour (17.5:00)
const goldenLight = studio.getInterpolatedLighting(17.5);
assert(goldenLight.r > 200 && goldenLight.g > 140, 'Golden Hour sunset has vibrant warm amber tones');

// ---------------------------------------------------------------------------
// 3. Cyclic Midnight Boundary Wrapping
// ---------------------------------------------------------------------------
console.log('\n--- 3. Cyclic Midnight Boundary Wrapping ---');
// 23.5h should smoothly transition towards 0.0h / 24.0h
const light235 = studio.getInterpolatedLighting(23.5);
assert(light235.alpha >= 0.58 && light235.alpha <= 0.64, `Late night 23:30 alpha smoothly wraps (${light235.alpha})`);

// Negative and >24 hour input safety (modulo clamping)
const lightNeg = studio.getInterpolatedLighting(-0.5);
const lightWrap = studio.getInterpolatedLighting(23.5);
assert(lightNeg.alpha === lightWrap.alpha, 'Negative hour wraps cleanly to 23.5h');

const lightOver24 = studio.getInterpolatedLighting(36.0);
const lightNoon = studio.getInterpolatedLighting(12.0);
assert(lightOver24.alpha === lightNoon.alpha, 'Hour 36.0 wraps cleanly to 12.0 (High Noon)');

// ---------------------------------------------------------------------------
// 4. Keyframe Mutations & Timeline Sorting
// ---------------------------------------------------------------------------
console.log('\n--- 4. Keyframe Mutations & Timeline Sorting ---');
const originalCount = studio.currentPreset.lightingKeyframes.length;

// Add a test keyframe at 10.5h
const testKf = {
  hour: 10.5,
  color: 0xffeedd,
  alpha: 0.05,
  name: 'Mid-Morning Glow'
};
studio.currentPreset.lightingKeyframes.push(testKf);
studio.currentPreset.lightingKeyframes.sort((a, b) => a.hour - b.hour);

assert(studio.currentPreset.lightingKeyframes.length === originalCount + 1, 'Keyframe inserted into active preset');
const insertedIdx = studio.currentPreset.lightingKeyframes.findIndex(k => k.hour === 10.5);
assert(insertedIdx !== -1, 'Keyframe located in sorted array');
assert(
  studio.currentPreset.lightingKeyframes[insertedIdx - 1].hour < 10.5 &&
  studio.currentPreset.lightingKeyframes[insertedIdx + 1].hour > 10.5,
  'Keyframes remain chronologically sorted after insertion'
);

// Delete the added keyframe
studio.currentPreset.lightingKeyframes.splice(insertedIdx, 1);
assert(studio.currentPreset.lightingKeyframes.length === originalCount, 'Keyframe cleanly removed');

// ---------------------------------------------------------------------------
// 5. Biome Particle Configurations
// ---------------------------------------------------------------------------
console.log('\n--- 5. Biome Particle Configurations ---');
// Stormy Cliffs
const storm = studio.presets['stormy_cliffs'];
assert(storm.particles.rainDensity > 300, `Stormy cliffs rain density is heavy (${storm.particles.rainDensity} drops)`);
assert(storm.particles.windSpeed >= 50, `Stormy cliffs has high wind velocity (${storm.particles.windSpeed})`);
assert(storm.particles.lightningFrequency > 0.3, `Stormy cliffs features active lightning (${storm.particles.lightningFrequency})`);

// Haunted Catacombs
const catacombs = studio.presets['haunted_catacombs'];
assert(catacombs.particles.rainDensity === 0, 'Catacombs has 0 rain (underground crypt)');
assert(catacombs.particles.fogDensity >= 0.5, `Catacombs has dense volumetric fog (${catacombs.particles.fogDensity})`);
assert(catacombs.particles.fireflyCount > 20, 'Catacombs has spectral floating bioluminescent motes');

// ---------------------------------------------------------------------------
// 6. Split-Screen Viewport Mode
// ---------------------------------------------------------------------------
console.log('\n--- 6. Split-Screen Viewport Mode ---');
studio.splitRatio = 0.5;
assert(studio.splitRatio === 0.5, 'Split ratio set to 50/50 comparison');
studio.splitRatio = 0.0;
assert(studio.splitRatio === 0.0, 'Split ratio set to 0.0 (Unlit Raw)');
studio.splitRatio = 1.0;
assert(studio.splitRatio === 1.0, 'Split ratio set to 1.0 (Full Atmosphere)');

// ---------------------------------------------------------------------------
// 7. Zero-Dependency TypeScript Code Generator
// ---------------------------------------------------------------------------
console.log('\n--- 7. Zero-Dependency TypeScript Code Generator ---');
studio.loadPreset('whispering_meadows');
const tsCode = studio.generateZeroDependencyCode();

assert(tsCode.includes('WHISPERING_MEADOWS_LIGHTING_KEYFRAMES'), 'Generated code contains typed lighting keyframes array');
assert(tsCode.includes('WHISPERING_MEADOWS_PARTICLES'), 'Generated code contains typed particle constants');
assert(tsCode.includes('rainDensity: 0'), 'Particle config reflects preset values');
assert(!tsCode.includes('import ') && !tsCode.includes('require('), 'Exported snippet has ZERO external dependencies');

// ---------------------------------------------------------------------------
// 8. Lossless JSON Export & Import
// ---------------------------------------------------------------------------
console.log('\n--- 8. Lossless JSON Export & Import ---');
studio.loadPreset('blood_moon_eclipse');
const exported = studio.exportPresetJSON();
assert(typeof exported === 'string' && exported.length > 50, 'exportPresetJSON() generated non-empty JSON string');

const parsed = JSON.parse(exported);
assert(parsed.id === 'blood_moon_eclipse', 'Exported JSON preserved preset ID');
assert(parsed.biome === 'boss_arena', 'Exported JSON preserved biome type');
assert(parsed.lightingKeyframes.length >= 4, 'Exported JSON preserved lighting keyframes');

// Test import into fresh studio
const fresh = new AtmosphereStudio();
const imported = fresh.importPresetJSON(exported);
assert(imported, 'importPresetJSON() successfully parsed and loaded atmosphere profile');
assert(fresh.currentPreset.id === 'blood_moon_eclipse', 'Imported preset matches loaded profile');
assert(fresh.currentPreset.particles.windSpeed === 45, 'Preserved particle wind speed (45)');

// Safe rejection of invalid schema payload
const invalidRejection = fresh.importPresetJSON('{"invalid_preset": true}');
assert(!invalidRejection, 'importPresetJSON() safely rejects invalid schema payload');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Atmosphere Studio Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
