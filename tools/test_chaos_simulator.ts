/**
 * BitQuest - Multi-Client Network Chaos Simulator Unit Test Suite (Issue #34)
 * Tests NetworkChaosChannel queue, latency/jitter calculation, out-of-order delivery,
 * multi-bot scaling (4 and 8 bots), prediction convergence, and health desync verification.
 */

import {
  NetworkChaosChannel,
  HeadlessBotClient,
  AuthoritativeServerSim,
  runMultiplayerChaosSimulation
} from './network_chaos_simulator';

async function runChaosSimulatorTests() {
  console.log('=== BITQUEST MULTIPLAYER DESYNC & NETWORK CHAOS UNIT TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. NetworkChaosChannel Unit Tests
  // -------------------------------------------------------------------------
  console.log('[1/4] NetworkChaosChannel Latency, Jitter & Out-of-Order Tests');

  const channel = new NetworkChaosChannel({
    baseLatencyMs: 80,
    jitterPercent: 0.15,
    outOfOrderRate: 0.20,
    dropRate: 0.0
  });

  const now = 1000;
  channel.send({ msg: 'packet_1' }, now);
  channel.send({ msg: 'packet_2' }, now + 10);
  channel.send({ msg: 'packet_3' }, now + 20);

  assert(channel.totalPacketsSent === 3, 'Channel tracked 3 sent packets');
  assert(channel.pendingCount === 3, 'All 3 packets are currently in flight');

  // At now + 40ms, no packets should arrive yet (latency is ~80ms)
  const arrivalsEarly = channel.receive(now + 40);
  assert(arrivalsEarly.length === 0, 'No packets delivered prior to minimum latency');

  // At now + 150ms, all packets should have cleared latency + jitter
  const arrivalsLate = channel.receive(now + 150);
  assert(arrivalsLate.length === 3, 'All 3 packets delivered after latency window');
  assert(channel.pendingCount === 0, 'Channel queue is empty after draining');

  // -------------------------------------------------------------------------
  // 2. HeadlessBotClient & Prediction Tests
  // -------------------------------------------------------------------------
  console.log('\n[2/4] HeadlessBotClient Prediction & Movement Tests');

  const bot = new HeadlessBotClient('bot_test', 500, 500, 'circle');
  assert(bot.health === 10, 'Bot initializes with 10 HP');
  assert(bot.pred.pendingCount === 0, 'Bot starts with 0 pending predicted inputs');

  // Generate 4 movement steps
  const step1 = bot.generateStepInput(50, now);
  const step2 = bot.generateStepInput(50, now + 50);
  const step3 = bot.generateStepInput(50, now + 100);
  const step4 = bot.generateStepInput(50, now + 150);

  assert(step4.seq === 4, 'Sequence numbers increment monotonically to 4');
  assert(bot.pred.pendingCount === 4, '4 pending prediction inputs buffered');

  // Reconcile up to step 2 with matching authoritative position
  bot.reconcileServerState(step2.targetX, step2.targetY, 2, 9);
  assert(bot.health === 9, 'Bot health synchronized to authoritative value 9');
  assert(bot.pred.pendingCount === 2, 'Pending inputs trimmed to unacknowledged steps (2 remaining)');

  // -------------------------------------------------------------------------
  // 3. Multi-Client Scaling: 4 Bot Clients Simulation
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Multi-Client Simulation with 4 Bots (Acceptance Criteria Boundary)');

  const res4 = runMultiplayerChaosSimulation({
    botCount: 4,
    durationTicks: 80,
    baseLatencyMs: 80,
    jitterPercent: 0.15,
    outOfOrderRate: 0.15
  });

  assert(res4.botCount === 4, 'Successfully simulated exactly 4 bot clients');
  assert(res4.passed, 'Simulation with 4 bots passed acceptance criteria');
  assert(res4.maxEntityDivergence <= 2.0, `Max entity divergence (${res4.maxEntityDivergence}px) <= 2.0px`);
  assert(res4.healthDesyncs === 0, 'Zero health desyncs detected across 4 bots');
  assert(res4.outOfOrderPackets > 0, 'Out-of-order packet delivery occurred and was handled');

  // -------------------------------------------------------------------------
  // 4. Multi-Client Scaling: 8 Bot Clients Simulation
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Multi-Client Simulation with 8 Bots (Maximum Stress Boundary)');

  const res8 = runMultiplayerChaosSimulation({
    botCount: 8,
    durationTicks: 80,
    baseLatencyMs: 80,
    jitterPercent: 0.15,
    outOfOrderRate: 0.15
  });

  assert(res8.botCount === 8, 'Successfully simulated exactly 8 bot clients');
  assert(res8.passed, 'Simulation with 8 bots passed acceptance criteria');
  assert(res8.maxEntityDivergence <= 2.0, `Max entity divergence (${res8.maxEntityDivergence}px) <= 2.0px`);
  assert(res8.healthDesyncs === 0, 'Zero health desyncs detected across 8 bots');
  assert(res8.totalPacketsDelivered > 1000, `Delivered ${res8.totalPacketsDelivered} packets (> 1000) under chaos`);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runChaosSimulatorTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
