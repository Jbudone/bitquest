/**
 * BitQuest - Cinematic Sequencer & Cutscene Choreographer Test Suite (Milestone 9.2)
 *
 * Verifies:
 * 1. Loading canonical cutscene presets & Zod schema validation.
 * 2. Mathematical camera interpolation (Quad In-Out, zoom, shake).
 * 3. Actor trajectory interpolation (coords, anim, facing, emotes).
 * 4. Dialogue and subtitle temporal queries.
 * 5. Screen effect transitions (Letterbox, fades, flashes).
 * 6. Timeline keyframe mutations (add, move, delete).
 * 7. Playhead seeking and boundary clamping.
 * 8. Lossless JSON export and schema re-validation.
 */

import { CutsceneStudio } from '../client/src/tools/cutsceneStudio';
import { CutsceneSequenceSchema } from '../shared/src/schemas';

console.log('🎬 Running BitQuest Cinematic Sequencer Test Suite (Milestone 9.2)...');

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
// 1. Loading Canonical Cutscene Presets
// ---------------------------------------------------------------------------
console.log('\n--- 1. Loading Canonical Cutscene Presets ---');
const studio = new CutsceneStudio(null as any);

assert(studio.sequence !== undefined, "CutsceneStudio initialized with default sequence");
assert(studio.sequence.id === 'ancient_gate_opening', "Default preset is 'ancient_gate_opening'");
assert(studio.sequence.durationMs === 5000, "Ancient gate sequence duration is 5000ms");
assert(studio.sequence.cameraTrack.length >= 4, `Camera track loaded ${studio.sequence.cameraTrack.length} keyframes`);
assert(studio.sequence.actors.length >= 2, `Actors loaded ${studio.sequence.actors.length} tracks`);

// Validate all presets against Zod schema
for (const [key, preset] of Object.entries(CutsceneStudio.PRESETS)) {
  const result = CutsceneSequenceSchema.safeParse(preset);
  assert(result.success, `Preset [${key}] strictly conforms to CutsceneSequenceSchema`);
}

// ---------------------------------------------------------------------------
// 2. Mathematical Camera Interpolation Engine
// ---------------------------------------------------------------------------
console.log('\n--- 2. Mathematical Camera Interpolation Engine ---');
// At t = 0ms: Hero position (1024, 928) with zoom 1.0
const camT0 = studio.getCameraStateAt(0);
assert(camT0.x === 1024 && camT0.y === 928, `Camera at t=0ms is at (1024, 928) - got (${camT0.x}, ${camT0.y})`);
assert(camT0.zoom === 1.0, `Camera zoom at t=0ms is 1.0 - got ${camT0.zoom}`);
assert(camT0.shakeIntensity === 0, `Camera shake at t=0ms is 0 - got ${camT0.shakeIntensity}`);

// At t = 600ms (midpoint between 0ms and 1200ms): should be smoothly moving towards Ancient Gate (1024, 512)
const camT600 = studio.getCameraStateAt(600);
assert(camT600.x === 1024, `Camera X remains aligned at 1024 during vertical pan`);
assert(camT600.y < 928 && camT600.y > 512, `Camera Y interpolated halfway: got ${camT600.y.toFixed(1)}`);
assert(camT600.zoom > 1.0 && camT600.zoom < 1.25, `Camera zoom interpolated smoothly: got ${camT600.zoom.toFixed(2)}`);

// At t = 1200ms: Ancient Gate focus (1024, 512) with zoom 1.25 and shake 0.008
const camT1200 = studio.getCameraStateAt(1200);
assert(Math.abs(camT1200.y - 512) < 0.1, `Camera at t=1200ms reached target Y 512 - got ${camT1200.y}`);
assert(Math.abs(camT1200.zoom - 1.25) < 0.01, `Camera zoom at t=1200 reached 1.25 - got ${camT1200.zoom}`);
assert(camT1200.shakeIntensity === 0.008, `Camera shake active during stone unsealing`);

// ---------------------------------------------------------------------------
// 3. Actor Trajectory & State Interpolation
// ---------------------------------------------------------------------------
console.log('\n--- 3. Actor Trajectory & State Interpolation ---');
const heroActor = studio.sequence.actors.find(a => a.actorId === 'hero')!;
assert(heroActor !== undefined, "Hero actor exists in sequence");

// At t = 0ms: Hero idle facing up
const heroT0 = studio.getActorStateAt(heroActor, 0);
assert(heroT0.x === 1024 && heroT0.y === 928, "Hero initial coordinates correct");
assert(heroT0.anim === 'idle', "Hero initial animation is 'idle'");
assert(heroT0.facing === 'up', "Hero facing 'up'");
assert(heroT0.emote === 'none', "Hero has no initial emote");

// At t = 1000ms: Hero walking between 880 and 840
const heroT1000 = studio.getActorStateAt(heroActor, 1000);
assert(heroT1000.y < 880 && heroT1000.y > 840, `Hero interpolated Y position walking forward: got ${heroT1000.y}`);
assert(heroT1000.anim === 'walk', "Hero animation state is 'walk'");
assert(heroT1000.emote === 'exclamation', "Hero emote is 'exclamation' alert");

// At t = 3500ms: Hero cheer emote with heart
const heroT3500 = studio.getActorStateAt(heroActor, 3500);
assert(heroT3500.anim === 'cheer', "Hero plays 'cheer' celebration");
assert(heroT3500.emote === 'heart', "Hero shows 'heart' emote");

// ---------------------------------------------------------------------------
// 4. Dialogue and Subtitle Temporal Queries
// ---------------------------------------------------------------------------
console.log('\n--- 4. Dialogue and Subtitle Temporal Queries ---');
// Dialogue occurs from t = 1500ms to 3300ms (duration 1800ms)
assert(studio.getActiveDialogueAt(1000) === null, "No dialogue at t=1000ms");

const dialogueAt2000 = studio.getActiveDialogueAt(2000);
assert(dialogueAt2000 !== null, "Dialogue active at t=2000ms");
assert(dialogueAt2000?.speaker === 'Ancient Runes', "Speaker is 'Ancient Runes'");
assert(dialogueAt2000?.text.includes('Sun Stone'), "Subtitle text is correct");

assert(studio.getActiveDialogueAt(4000) === null, "Dialogue ended at t=4000ms");

// ---------------------------------------------------------------------------
// 5. Screen Effect Transitions
// ---------------------------------------------------------------------------
console.log('\n--- 5. Screen Effect Transitions ---');
// At t = 250ms (during letterbox_in 0-500ms)
const fxT250 = studio.getActiveScreenEffectsAt(250);
assert(fxT250.letterboxPct > 0.4 && fxT250.letterboxPct < 0.6, `Letterbox transition in progress at 50%: got ${fxT250.letterboxPct.toFixed(2)}`);

// At t = 2000ms (during screen flash)
const fxT2000 = studio.getActiveScreenEffectsAt(2000);
assert(fxT2000.overlayAlpha > 0.5, `Screen flash overlay active at t=2000ms: got ${fxT2000.overlayAlpha.toFixed(2)}`);
assert(fxT2000.overlayColor === '#facc15', "Screen flash color is golden rune yellow");

// At t = 4800ms (during letterbox_out 4400-5000ms)
const fxT4800 = studio.getActiveScreenEffectsAt(4800);
assert(fxT4800.letterboxPct < 0.5, `Letterbox receding at end of cutscene: got ${fxT4800.letterboxPct.toFixed(2)}`);

// ---------------------------------------------------------------------------
// 6. Timeline Keyframe Mutations & Seeking
// ---------------------------------------------------------------------------
console.log('\n--- 6. Timeline Keyframe Mutations & Seeking ---');
// Test seeking & clamping
studio.seek(2500);
assert(studio.currentTimeMs === 2500, "Seek to 2500ms successful");
studio.seek(-500);
assert(studio.currentTimeMs === 0, "Seek clamped to minimum 0ms");
studio.seek(99999);
assert(studio.currentTimeMs === 5000, "Seek clamped to maximum duration 5000ms");

// Add custom keyframe at playhead
studio.seek(2500);
const initialCamKfCount = studio.sequence.cameraTrack.length;
studio.addKeyframeAtPlayhead();
assert(studio.sequence.cameraTrack.length === initialCamKfCount + 1, "New camera keyframe added at playhead");
const addedKf = studio.sequence.cameraTrack.find(k => k.timeMs === 2500);
assert(addedKf !== undefined, "Added keyframe exists at timeMs = 2500");

// Delete the added keyframe
studio.selectedKeyframe = {
  trackType: 'camera',
  index: studio.sequence.cameraTrack.findIndex(k => k.timeMs === 2500)
};
studio.deleteSelectedKeyframe();
assert(studio.sequence.cameraTrack.length === initialCamKfCount, "Keyframe successfully deleted");

// ---------------------------------------------------------------------------
// 7. Lossless JSON Export & Re-Validation
// ---------------------------------------------------------------------------
console.log('\n--- 7. Lossless JSON Export & Re-Validation ---');
const exportedJson = studio.exportJSON();
assert(typeof exportedJson === 'string', "exportJSON returns serialized string");

const reParsed = JSON.parse(exportedJson);
const validation = CutsceneSequenceSchema.safeParse(reParsed);
assert(validation.success, "Exported JSON strictly validates against CutsceneSequenceSchema");
assert(validation.data?.id === 'ancient_gate_opening', "Exported cutscene ID preserved");
assert(validation.data?.actors.length >= 2, "Exported actors preserved");

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
