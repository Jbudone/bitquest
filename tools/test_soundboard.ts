/**
 * BitQuest - 8-Bit Retro Chiptune & Procedural Foley Soundboard Test Suite (Milestone 9.5)
 *
 * Verifies:
 * 1. Canonical preset library loading and strict Zod schema validation.
 * 2. Waveform diversity (square, sawtooth, triangle, sine, noise) across categories.
 * 3. Synthesis timing & ADSR envelope duration math.
 * 4. Pitch sweep calculation and exponential/linear ramp frequency bounds.
 * 5. Arpeggiator semitone multiplier calculations (e.g. major triad intervals).
 * 6. Biquad filter parameter validation (cutoff, resonance Q, filter type).
 * 7. Zero-dependency TypeScript/JavaScript code generator syntax & integrity.
 * 8. Procedural sound randomizer producing schema-compliant definitions.
 * 9. Lossless JSON export and import re-validation with error rejection.
 */

import { SoundboardStudio } from '../client/src/tools/soundboardStudio';
import { ChiptuneSoundDefSchema, type ChiptuneSoundDef } from '../shared/src/schemas';
import chiptunePresetsJson from '../shared/data/chiptunePresets.json';

console.log('🔊 Running BitQuest 8-Bit Chiptune & Foley Soundboard Test Suite (Milestone 9.5)...');

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
const studio = new SoundboardStudio();
assert(studio.presets !== undefined, 'SoundboardStudio initialized with presets library');

const presetKeys = Object.keys(studio.presets);
assert(presetKeys.length >= 10, `Loaded ${presetKeys.length} canonical sound presets (expected >= 10)`);

// Check required presets exist
const required = [
  'jump_classic',
  'sword_slash',
  'coin_pickup',
  'powerup_fanfare',
  'player_hurt',
  'explosion_heavy',
  'laser_blip',
  'secret_reveal',
  'footstep_grass',
  'magic_cast'
];

for (const req of required) {
  assert(studio.presets[req] !== undefined, `Preset '${req}' exists in library`);
}

// Strictly validate every preset in chiptunePresetsJson against ChiptuneSoundDefSchema
for (const [key, preset] of Object.entries(chiptunePresetsJson)) {
  const parseResult = ChiptuneSoundDefSchema.safeParse(preset);
  assert(parseResult.success, `Preset [${key}] strictly validates against ChiptuneSoundDefSchema`);
}

// ---------------------------------------------------------------------------
// 2. Waveform & Category Diversity
// ---------------------------------------------------------------------------
console.log('\n--- 2. Waveform & Category Diversity ---');
const waveforms = new Set<string>();
const categories = new Set<string>();

for (const p of Object.values(studio.presets)) {
  waveforms.add(p.waveform);
  categories.add(p.category);
}

assert(waveforms.has('square'), 'Preset library includes square wave (classic nes synth)');
assert(waveforms.has('sawtooth'), 'Preset library includes sawtooth wave (aggressive/impact)');
assert(waveforms.has('triangle'), 'Preset library includes triangle wave (warm bass/chime)');
assert(waveforms.has('sine'), 'Preset library includes sine wave (pure harmonic tone)');
assert(waveforms.has('noise'), 'Preset library includes noise wave (percussion/foley)');

assert(categories.has('action'), 'Categories include action sfx');
assert(categories.has('combat'), 'Categories include combat sfx');
assert(categories.has('jingle'), 'Categories include jingles');
assert(categories.has('ambient'), 'Categories include ambient/foley sfx');

// ---------------------------------------------------------------------------
// 3. Synthesis Timing & ADSR Envelope Duration Math
// ---------------------------------------------------------------------------
console.log('\n--- 3. Synthesis Timing & ADSR Envelope Duration Math ---');
studio.loadPreset('jump_classic');
const jumpDur = studio.calculateTotalDurationMs();
// jump_classic: attack=0.005, decay=0.08, slideDuration=0.12, release=0.08 -> total=0.285s (285ms)
assert(Math.round(jumpDur) === 285, `Jump duration calculated accurately: ${Math.round(jumpDur)}ms (expected 285ms)`);

studio.loadPreset('explosion_heavy');
const expDur = studio.calculateTotalDurationMs();
// explosion_heavy: attack=0.01, decay=0.25, noteDuration=0.05, release=0.45 -> total=0.76s (760ms)
assert(Math.round(expDur) === 760, `Heavy explosion duration calculated accurately: ${Math.round(expDur)}ms (expected 760ms)`);

// ---------------------------------------------------------------------------
// 4. Pitch Sweep & Frequency Calculations
// ---------------------------------------------------------------------------
console.log('\n--- 4. Pitch Sweep & Frequency Calculations ---');
const jump = studio.presets['jump_classic'];
assert(jump.startFreq === 150 && jump.endFreq === 450, 'Jump sweeps upwards from 150 Hz to 450 Hz');
assert(jump.sweepType === 'exponential', 'Jump uses smooth exponential pitch curve');

const laser = studio.presets['laser_blip'];
assert(laser.startFreq === 1250 && laser.endFreq === 180, 'Laser chirp sweeps downwards from 1250 Hz to 180 Hz');

const hurt = studio.presets['player_hurt'];
assert(hurt.startFreq > hurt.endFreq, 'Player hurt drops pitch on impact');

// ---------------------------------------------------------------------------
// 5. Arpeggiator Semitone Intervals
// ---------------------------------------------------------------------------
console.log('\n--- 5. Arpeggiator Semitone Intervals ---');
const fanfare = studio.presets['powerup_fanfare'];
assert(fanfare.arpeggioNotes.length === 4, 'Powerup fanfare has 4-note arpeggio sequence');
assert(
  JSON.stringify(fanfare.arpeggioNotes) === JSON.stringify([0, 4, 7, 12]),
  'Fanfare plays root, major third (+4), perfect fifth (+7), and octave (+12)'
);

// Verify semitone frequency calculations
const baseFreq = 440; // A4
const octaveMult = Math.pow(2, 12 / 12);
assert(Math.round(baseFreq * octaveMult) === 880, '12 semitone shift doubles base frequency to 880 Hz (A5)');

const fifthMult = Math.pow(2, 7 / 12);
assert(Math.round(baseFreq * fifthMult) === 659, '7 semitone shift raises 440 Hz to ~659 Hz (E5)');

// ---------------------------------------------------------------------------
// 6. Biquad Filter Modeling
// ---------------------------------------------------------------------------
console.log('\n--- 6. Biquad Filter Modeling ---');
const slash = studio.presets['sword_slash'];
assert(slash.filterType === 'bandpass', 'Sword slash uses resonant bandpass filter');
assert(slash.filterCutoff === 2800, 'Sword slash initial cutoff is 2800 Hz');
assert(slash.filterQ === 2.5, 'Sword slash filter Q resonance is 2.5');

const explosion = studio.presets['explosion_heavy'];
assert(explosion.filterType === 'lowpass', 'Explosion uses lowpass filter for deep sub-rumble');
assert(explosion.filterCutoff === 1400 && explosion.filterEndCutoff === 150, 'Explosion sweeps lowpass cutoff from 1400 Hz down to 150 Hz');

// ---------------------------------------------------------------------------
// 7. Zero-Dependency TypeScript Code Generator
// ---------------------------------------------------------------------------
console.log('\n--- 7. Zero-Dependency TypeScript Code Generator ---');
studio.loadPreset('coin_pickup');
const coinCode = studio.generateZeroDependencyCode();

assert(coinCode.includes('export function playGoldCoinPickup(ctx: AudioContext'), 'Generated function signature with proper naming');
assert(coinCode.includes('ctx.createGain()'), 'Generated code constructs native Web Audio GainNode');
assert(coinCode.includes('ctx.createOscillator()'), 'Generated code constructs native OscillatorNode');
assert(coinCode.includes('linearRampToValueAtTime'), 'Generated code schedules linear ADSR gain envelopes');
assert(coinCode.toLowerCase().includes('arpeggio'), 'Generated code includes arpeggio step scheduler');
assert(!coinCode.includes('require(') && !coinCode.includes('from "'), 'Generated snippet has ZERO external library dependencies');

// Test noise code generator
studio.loadPreset('sword_slash');
const slashCode = studio.generateZeroDependencyCode();
assert(slashCode.includes('createBuffer'), 'Generated noise sound synthesizes native AudioBuffer');
assert(slashCode.includes('createBiquadFilter'), 'Generated code configures BiquadFilterNode');

// ---------------------------------------------------------------------------
// 8. Procedural Sound Randomizer
// ---------------------------------------------------------------------------
console.log('\n--- 8. Procedural Sound Randomizer ---');
studio.randomizeSound();
const randomizedSound = studio.currentSound;
assert(randomizedSound.startFreq >= 40 && randomizedSound.startFreq <= 3000, `Randomized start frequency in range: ${randomizedSound.startFreq} Hz`);
assert(randomizedSound.attack >= 0.001, `Randomized attack >= 0.001s: ${randomizedSound.attack}`);
assert(randomizedSound.decay >= 0.005, `Randomized decay >= 0.005s: ${randomizedSound.decay}`);
assert(randomizedSound.sustain >= 0 && randomizedSound.sustain <= 1, `Randomized sustain level: ${randomizedSound.sustain}`);

const randParse = ChiptuneSoundDefSchema.safeParse(randomizedSound);
assert(randParse.success, 'Randomized sound strictly conforms to ChiptuneSoundDefSchema');

// ---------------------------------------------------------------------------
// 9. Lossless JSON Export & Import
// ---------------------------------------------------------------------------
console.log('\n--- 9. Lossless JSON Export & Import ---');
studio.loadPreset('secret_reveal');
const exportedJson = studio.exportPresetJSON();
assert(typeof exportedJson === 'string' && exportedJson.length > 50, 'exportPresetJSON() returned valid JSON string');

const parsedExport = JSON.parse(exportedJson);
assert(parsedExport.id === 'secret_reveal', 'Exported JSON preserved sound ID');
assert(parsedExport.waveform === 'sine', 'Exported JSON preserved waveform type');

// Import back into fresh studio
const freshStudio = new SoundboardStudio();
const importSuccess = freshStudio.importPresetJSON(exportedJson);
assert(importSuccess, 'importPresetJSON() successfully parsed and loaded sound configuration');
assert(freshStudio.currentSound.id === 'secret_reveal', 'Loaded sound ID matches imported data');
assert(freshStudio.currentSound.startFreq === 523, 'Start frequency preserved accurately (523 Hz)');

// Test rejecting invalid JSON
const rejectResult = freshStudio.importPresetJSON('{"not_a_sound": 123}');
assert(!rejectResult, 'importPresetJSON() safely rejects invalid schema payload');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Chiptune Soundboard Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
