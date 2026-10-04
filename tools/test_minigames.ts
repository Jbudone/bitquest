// tools/test_minigames.ts
// Unit tests for BitQuest Archery Range & Boat Slalom Minigames

import {
  MinigameEngine,
  ARCHERY_CONFIG,
  SLALOM_CONFIG,
  type ArcheryTarget
} from '../shared/src/minigames';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== BITQUEST ARCHERY RANGE & BOAT SLALOM MINIGAME TESTS ===\n');

// 1. Archery Range Configuration & Targets
console.log('[1/4] Testing Archery Range Setup & Target Roster...');
{
  assert(ARCHERY_CONFIG.DURATION_SEC === 30, 'Archery range runs for 30 seconds');
  assert(ARCHERY_CONFIG.TARGETS.length >= 6, `Catalog specifies ${ARCHERY_CONFIG.TARGETS.length} targets (expected >= 6)`);

  for (const t of ARCHERY_CONFIG.TARGETS) {
    assert(t.points > 0, `Target ${t.id} awards points (${t.points})`);
    assert(t.radius >= 8, `Target ${t.id} has valid collision radius (${t.radius}px)`);
  }
}

// 2. Archery Hit Detection & Combo Progression
console.log('\n[2/4] Testing Arrow Hit Collision & Combo Multipliers...');
{
  const session = MinigameEngine.createArcherySession();
  assert(session.score === 0, 'Session starts with score 0');
  assert(session.combo === 0, 'Session starts with combo 0');

  // Direct hit test
  const hit = MinigameEngine.testArrowHit(100, 100, 105, 100, 10);
  assert(hit, 'Arrow within radius is registered as a hit');

  const miss = MinigameEngine.testArrowHit(100, 100, 125, 100, 10);
  assert(!miss, 'Arrow outside radius is registered as a miss');

  const mockTarget: ArcheryTarget = {
    id: 'test',
    x: 100,
    y: 100,
    baseX: 100,
    baseY: 100,
    range: 'medium',
    points: 20,
    radius: 15,
    moveSpeed: 0,
    moveAmplitude: 0,
    phaseOffset: 0,
    active: true
  };

  // Consecutive hits test combo multipliers:
  // Hit 1 & 2: 1.0x (20 pts)
  let r = MinigameEngine.registerArcheryShot(session, mockTarget);
  assert(r.pointsAwarded === 20 && session.combo === 1, 'Hit 1: 1.0x multiplier awards 20 pts');

  r = MinigameEngine.registerArcheryShot(session, mockTarget);
  assert(r.pointsAwarded === 20 && session.combo === 2, 'Hit 2: 1.0x multiplier awards 20 pts');

  // Hit 3: 1.5x (30 pts)
  r = MinigameEngine.registerArcheryShot(session, mockTarget);
  assert(r.pointsAwarded === 30 && session.combo === 3, 'Hit 3: 1.5x multiplier awards 30 pts');

  // Advance to combo 6: 2.0x (40 pts)
  MinigameEngine.registerArcheryShot(session, mockTarget); // 4
  MinigameEngine.registerArcheryShot(session, mockTarget); // 5
  r = MinigameEngine.registerArcheryShot(session, mockTarget); // 6
  assert(r.pointsAwarded === 40 && session.combo === 6, 'Hit 6: 2.0x multiplier awards 40 pts');

  // Advance to combo 10: 3.0x (60 pts)
  MinigameEngine.registerArcheryShot(session, mockTarget); // 7
  MinigameEngine.registerArcheryShot(session, mockTarget); // 8
  MinigameEngine.registerArcheryShot(session, mockTarget); // 9
  r = MinigameEngine.registerArcheryShot(session, mockTarget); // 10
  assert(r.pointsAwarded === 60 && session.combo === 10, 'Hit 10: 3.0x multiplier awards 60 pts');

  // Miss resets combo
  r = MinigameEngine.registerArcheryShot(session, null);
  assert(r.pointsAwarded === 0 && session.combo === 0, 'Miss resets combo to 0');
  assert(session.maxCombo === 10, 'Max combo preserved across misses');
}

// 3. Archery Rank Evaluation
console.log('\n[3/4] Testing Archery Rank Medals...');
{
  assert(MinigameEngine.evaluateArcheryRank(50) === 'none', 'Score 50 is unranked');
  assert(MinigameEngine.evaluateArcheryRank(160) === 'bronze', 'Score 160 achieves Bronze');
  assert(MinigameEngine.evaluateArcheryRank(350) === 'silver', 'Score 350 achieves Silver');
  assert(MinigameEngine.evaluateArcheryRank(600) === 'gold', 'Score 600 achieves Gold');
  assert(MinigameEngine.evaluateArcheryRank(900) === 'master', 'Score 900 achieves Master Ranger');
}

// 4. Crystal Lake Boat Slalom Navigation & Timing
console.log('\n[4/4] Testing Boat Slalom Race Progression & Checkpoints...');
{
  const session = MinigameEngine.createBoatSlalomSession();
  assert(session.totalCheckpoints === 7, 'Slalom consists of 7 sequential buoy checkpoints');
  session.active = true;

  // Clear checkpoints 0 through 6 sequentially
  for (let i = 0; i < SLALOM_CONFIG.CHECKPOINTS.length; i++) {
    const cp = SLALOM_CONFIG.CHECKPOINTS[i];
    session.elapsedTimeSec += 2.5; // Simulate 2.5s per leg
    const cleared = MinigameEngine.testCheckpointCollision(cp.x, cp.y, session);
    assert(cleared, `Cleared checkpoint ${i}`);
  }

  assert(session.finished, 'Race marked as finished after final checkpoint');
  assert(session.finalTimeSec === 17.5, 'Final time accurately summed (17.5s)');
  assert(session.rank === 'master', '17.5s earns Master rank (< 18.0s)');

  // Rank thresholds
  assert(MinigameEngine.evaluateSlalomRank(22.0) === 'gold', '22.0s earns Gold');
  assert(MinigameEngine.evaluateSlalomRank(29.0) === 'silver', '29.0s earns Silver');
  assert(MinigameEngine.evaluateSlalomRank(38.0) === 'bronze', '38.0s earns Bronze');
  assert(MinigameEngine.evaluateSlalomRank(50.0) === 'none', '50.0s is unranked');
}

console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
