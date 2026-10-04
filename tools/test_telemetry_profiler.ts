/**
 * BitQuest - In-Engine Telemetry, Profiler & Physics Inspector Unit Tests (Issue #37)
 * Command: bun run tools/test_telemetry_profiler.ts
 */

import {
  TelemetryProfiler,
  telemetryProfiler,
  FRAME_HISTORY_SIZE,
  PING_HISTORY_SIZE
} from '../shared/src/telemetry';

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

console.log('=== BITQUEST IN-ENGINE TELEMETRY & PROFILER UNIT TESTS ===\n');

// ----------------------------------------------------------------------------
// 1. Frame Ring Buffer & Basic FPS Tracking
// ----------------------------------------------------------------------------
console.log('[1/5] Testing Frame Ring Buffer & FPS Statistics...');

const profiler = new TelemetryProfiler();

// Record 60 frames at smooth 60 FPS (16.66ms)
for (let i = 0; i < 60; i++) {
  profiler.recordFrame(16.66, 32, 100, 15, 40);
}

const m1 = profiler.getMetrics();
assert(Math.abs(m1.fps - 60.0) < 0.5, `Instant FPS matches ~60.0 (got ${m1.fps})`);
assert(Math.abs(m1.avgFps - 60.0) < 0.5, `Average FPS matches ~60.0 (got ${m1.avgFps})`);
assert(m1.drawCalls === 32, 'Tracks draw calls accurately');
assert(m1.particleCount === 100, 'Tracks active particle count');
assert(m1.entityCount === 15, 'Tracks active entity count');
assert(m1.obstacleCount === 40, 'Tracks visible obstacle count');

// Buffer wrap-around test: record 150 frames to overflow 120-size buffer
for (let i = 0; i < 150; i++) {
  profiler.recordFrame(16.66);
}
assert(profiler.frameDeltas.length === FRAME_HISTORY_SIZE, `Ring buffer stays fixed size of ${FRAME_HISTORY_SIZE}`);

// ----------------------------------------------------------------------------
// 2. 1% Low Frame Times (P99 Percentile) Calculation
// ----------------------------------------------------------------------------
console.log('\n[2/5] Testing 1% Low Frame Time (P99 Percentile) Calculation...');

const p99Profiler = new TelemetryProfiler();

// Record 118 frames at 16.6ms (60 FPS) and 2 slow spike frames at 33.3ms (30 FPS)
for (let i = 0; i < 118; i++) {
  p99Profiler.recordFrame(16.66);
}
p99Profiler.recordFrame(33.33); // Spike 1
p99Profiler.recordFrame(33.33); // Spike 2

const mP99 = p99Profiler.getMetrics();
assert(
  Math.abs(mP99.onePercentLowMs - 33.3) < 0.5,
  `1% Low frame duration correctly captures spike (~33.3ms, got ${mP99.onePercentLowMs}ms)`
);
assert(
  Math.abs(mP99.onePercentLowFps - 30.0) < 1.0,
  `1% Low FPS reflects 30 FPS floor (got ${mP99.onePercentLowFps} FPS)`
);
assert(mP99.avgFps > 58.0, `Average FPS remains near ~59 FPS despite 1% spike (got ${mP99.avgFps} FPS)`);

// ----------------------------------------------------------------------------
// 3. Network Latency & Ping Telemetry
// ----------------------------------------------------------------------------
console.log('\n[3/5] Testing Network Latency & Ping Tracking...');

const pingProfiler = new TelemetryProfiler();

const mockPings = [20, 22, 18, 55, 25, 21, 19, 60, 24, 20];
for (const p of mockPings) {
  pingProfiler.recordPing(p);
}

const mPing = pingProfiler.getMetrics();
assert(mPing.currentPing === 20, `Current ping recorded as ${mPing.currentPing}ms`);
assert(mPing.minPing === 18, `Min ping accurately identified as 18ms (got ${mPing.minPing}ms)`);
assert(mPing.maxPing === 60, `Max ping accurately identified as 60ms (got ${mPing.maxPing}ms)`);
assert(mPing.avgPing >= 25 && mPing.avgPing <= 30, `Average ping computed accurately (got ${mPing.avgPing}ms)`);

// Ping buffer wrap-around
for (let i = 0; i < 100; i++) {
  pingProfiler.recordPing(15);
}
assert(pingProfiler.pingHistory.length === PING_HISTORY_SIZE, `Ping history fixed at ${PING_HISTORY_SIZE} samples`);

// ----------------------------------------------------------------------------
// 4. Zero-Allocation In-Place Verification
// ----------------------------------------------------------------------------
console.log('\n[4/5] Testing Zero-Allocation In-Place Guarantee...');

const zeroAllocProfiler = new TelemetryProfiler();

// Call getMetrics() multiple times and verify it returns identical object reference (0 allocations)
const ref1 = zeroAllocProfiler.getMetrics();
const ref2 = zeroAllocProfiler.getMetrics();
assert(ref1 === ref2, 'getMetrics() returns single reused cached metrics instance');

// Measure memory stability across 2,000 updates
const memBefore = process.memoryUsage().heapUsed;
for (let i = 0; i < 2000; i++) {
  zeroAllocProfiler.recordFrame(16.66, 40, 150, 20, 50);
  zeroAllocProfiler.recordPing(25);
}
const memAfter = process.memoryUsage().heapUsed;
const heapDeltaKb = Math.max(0, (memAfter - memBefore) / 1024);
assert(heapDeltaKb < 150, `2,000 telemetry updates execute with ~0 KB GC churn (Delta: ${heapDeltaKb.toFixed(2)} KB)`);

// ----------------------------------------------------------------------------
// 5. Physics Inspector Wireframe Geometry Calculator
// ----------------------------------------------------------------------------
console.log('\n[5/5] Testing Physics Inspector Wireframe Geometry Calculation...');

const physProfiler = new TelemetryProfiler();

// Player idle wireframes
physProfiler.resetWireframes();
physProfiler.addPlayerWireframes(100, 200, 'down', false);
assert(physProfiler.wireframeCount === 3, 'Player creates 3 wireframes (footprint, hurtbox, loot magnet)');

const feetBox = physProfiler.wireframePool[0];
assert(feetBox.kind === 'footprint', 'Box 0 is ground footprint collider');
assert(feetBox.x === 92 && feetBox.y === 202 && feetBox.width === 16 && feetBox.height === 10, 'Footprint has 16x10 size with (-8, +2) offset');
assert(feetBox.color === 0x22c55e, 'Footprint collider has green color');

const hurtBox = physProfiler.wireframePool[1];
assert(hurtBox.kind === 'hurtbox', 'Box 1 is body hurtbox');
assert(hurtBox.x === 90 && hurtBox.y === 176 && hurtBox.width === 20 && hurtBox.height === 26, 'Hurtbox has 20x26 size with (-10, -24) offset');
assert(hurtBox.color === 0x3b82f6, 'Hurtbox has blue color');

const magnetBox = physProfiler.wireframePool[2];
assert(magnetBox.kind === 'magnet', 'Box 2 is loot magnet radius');
assert(magnetBox.radius === 75, 'Loot magnet has 75px radius');

// Player attack cleave wireframe
physProfiler.resetWireframes();
physProfiler.addPlayerWireframes(100, 200, 'right', true, 46, Math.PI / 2);
assert(physProfiler.wireframeCount === 4, 'Player attacking creates 4 wireframes including active cleave arc');
const cleaveBox = physProfiler.wireframePool[3];
assert(cleaveBox.kind === 'hitbox', 'Box 3 is active attack cleave hitbox');
assert(cleaveBox.color === 0xef4444, 'Cleave hitbox has red color');
assert(cleaveBox.radius === 46, 'Cleave hitbox has 46px radius');

// Monster entity wireframes
physProfiler.resetWireframes();
physProfiler.addEntityWireframes(300, 400, 'monster', false);
assert(physProfiler.wireframeCount === 2, 'Monster generates 2 wireframes (hurtbox and feet)');
const monsterHurt = physProfiler.wireframePool[0];
assert(monsterHurt.color === 0xef4444, 'Monster hurtbox has red color');

// Interactive NPC wireframes
physProfiler.resetWireframes();
physProfiler.addEntityWireframes(500, 600, 'npc', true, 56);
assert(physProfiler.wireframeCount === 3, 'Interactable NPC generates 3 wireframes (hurtbox, feet, interaction radius)');
const npcInteract = physProfiler.wireframePool[2];
assert(npcInteract.kind === 'interaction', 'Proximity interaction trigger box created');
assert(npcInteract.radius === 56, 'Interaction radius has 56px radius');
assert(npcInteract.color === 0xeab308, 'Interaction radius has gold color');

// Obstacle wireframe
physProfiler.resetWireframes();
physProfiler.addObstacleWireframe(200, 300, 32, 48);
assert(physProfiler.wireframeCount === 1, 'Obstacle wireframe created');
const obsBox = physProfiler.wireframePool[0];
assert(obsBox.kind === 'obstacle', 'Kind is obstacle');
assert(obsBox.width === 32 && obsBox.height === 48, 'Obstacle has 32x48 bounds');

console.log('\n========================================');
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('========================================');

if (failedCount > 0) {
  process.exit(1);
}
process.exit(0);
