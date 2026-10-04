// tools/test_npc_schedules.ts
// Unit tests for BitQuest Village NPC Daily Schedules & Organic Life Cycles

import { NPCScheduleEngine, NPC_SCHEDULES, type NPCScheduleKeyframe } from '../shared/src/npcSchedules';
import { WeatherEngine } from '../shared/src/weather';

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

console.log('=== BITQUEST VILLAGE NPC DAILY SCHEDULES UNIT TESTS ===\n');

// 1. NPC Schedule Registry & Completeness
console.log('[1/4] Testing NPC Schedule Definitions & Structure...');
{
  const npcIds = NPCScheduleEngine.getAllScheduledNPCIds();
  assert(npcIds.length >= 5, `Registered ${npcIds.length} village NPC schedules (expected >= 5)`);
  assert(npcIds.includes('npc_grandma'), 'Contains Grandma Bramble schedule');
  assert(npcIds.includes('npc_barnaby'), 'Contains Barnaby blacksmith schedule');
  assert(npcIds.includes('npc_reinald'), 'Contains Sir Reginald sentinel schedule');
  assert(npcIds.includes('npc_finn'), 'Contains Finn angler schedule');
  assert(npcIds.includes('merchant_pip'), 'Contains Pip merchant schedule');

  for (const id of npcIds) {
    const def = NPC_SCHEDULES[id];
    assert(def.keyframes.length >= 3, `NPC ${id} has at least 3 schedule keyframes (${def.keyframes.length})`);
    for (const kf of def.keyframes) {
      assert(kf.x >= 100 && kf.x <= 1900, `NPC ${id} waypoint X (${kf.x}) is within map bounds`);
      assert(kf.y >= 100 && kf.y <= 1900, `NPC ${id} waypoint Y (${kf.y}) is within map bounds`);
      assert(kf.greeting.length > 10, `NPC ${id} has descriptive contextual greeting`);
    }
  }
}

// 2. 24-Hour Coverage Without Gaps
console.log('\n[2/4] Testing 24-Hour Continuous Coverage Across Every NPC...');
{
  const npcIds = NPCScheduleEngine.getAllScheduledNPCIds();
  const SECONDS_PER_HOUR = WeatherEngine.SECONDS_PER_GAME_HOUR;

  for (const id of npcIds) {
    let allCovered = true;
    // Sample every 15 minutes of the game day (96 sample points)
    for (let h = 0; h < 24; h += 0.25) {
      const timeSec = h * SECONDS_PER_HOUR;
      const kf = NPCScheduleEngine.getScheduleKeyframe(id, timeSec);
      if (!kf) {
        allCovered = false;
        console.error(`Gap found for ${id} at hour ${h}`);
        break;
      }
    }
    assert(allCovered, `NPC ${id} has seamless 24-hour schedule without time gaps`);
  }
}

// 3. Circadian Activity & Location Transitions
console.log('\n[3/4] Testing Circadian Activities (Dawn, Midday, Dusk, Night)...');
{
  const SECONDS_PER_HOUR = WeatherEngine.SECONDS_PER_GAME_HOUR;

  // Grandma Bramble
  // Dawn: Tending garden at 6 AM
  const grandmaDawn = NPCScheduleEngine.getScheduleKeyframe('npc_grandma', 6 * SECONDS_PER_HOUR)!;
  assert(grandmaDawn.activity === 'tending_garden', 'Grandma Bramble tends garden at 6:00 AM');
  assert(grandmaDawn.x === 1420 && grandmaDawn.y === 880, 'Grandma Bramble is at garden plot coordinates');

  // Midday: Baking at 12 PM
  const grandmaDay = NPCScheduleEngine.getScheduleKeyframe('npc_grandma', 12 * SECONDS_PER_HOUR)!;
  assert(grandmaDay.activity === 'baking', 'Grandma Bramble bakes in bakery at 12:00 PM');
  assert(grandmaDay.x === 1248 && grandmaDay.y === 870, 'Grandma Bramble is at bakery hearth');

  // Dusk: Campfire gathering at 19 PM
  const grandmaDusk = NPCScheduleEngine.getScheduleKeyframe('npc_grandma', 19 * SECONDS_PER_HOUR)!;
  assert(grandmaDusk.activity === 'gathering', 'Grandma Bramble gathers at campfire at 7:00 PM');
  assert(grandmaDusk.x === 670 && grandmaDusk.y === 720, 'Grandma Bramble is at campsite');

  // Night: Resting at 1 AM (midnight wrap test)
  const grandmaNight = NPCScheduleEngine.getScheduleKeyframe('npc_grandma', 1 * SECONDS_PER_HOUR)!;
  assert(grandmaNight.activity === 'resting', 'Grandma Bramble rests in cottage at 1:00 AM');
  assert(grandmaNight.ambientEmote === 'sleep', 'Grandma Bramble has sleep ambient emote at night');

  // Finn the Otter
  // Dawn: Fishing at 7 AM
  const finnDawn = NPCScheduleEngine.getScheduleKeyframe('npc_finn', 7 * SECONDS_PER_HOUR)!;
  assert(finnDawn.activity === 'fishing', 'Finn fishes at dock at 7:00 AM');
  assert(finnDawn.x === 520 && finnDawn.y === 960, 'Finn is at Whispering Brook dock');
}

// 4. Contextual Dialogue & Zero-Allocation Positioning
console.log('\n[4/4] Testing Contextual Greetings & Zero-Allocation Positioning...');
{
  const SECONDS_PER_HOUR = WeatherEngine.SECONDS_PER_GAME_HOUR;

  // Contextual Greetings
  const dawnGreeting = NPCScheduleEngine.getContextualGreeting('npc_reinald', 5.5 * SECONDS_PER_HOUR);
  assert(dawnGreeting.includes('COCK-A-DOODLE-DOO'), 'Sir Reginald crows during sunrise patrol');

  const nightGreeting = NPCScheduleEngine.getContextualGreeting('merchant_pip', 23 * SECONDS_PER_HOUR);
  assert(nightGreeting.includes('Zzz'), 'Pip has sleepy dialogue at night');

  // Zero-Allocation Position Retrieval
  const scratchPos = { x: 0, y: 0 };
  const ok = NPCScheduleEngine.getTargetPosition('npc_barnaby', 14 * SECONDS_PER_HOUR, scratchPos);
  assert(ok, 'Successfully retrieved target position');
  assert(scratchPos.x === 770 && scratchPos.y === 860, 'Barnaby target position matches anvil coords');

  // Non-existent NPC
  const missingOk = NPCScheduleEngine.getTargetPosition('non_existent', 12 * SECONDS_PER_HOUR, scratchPos);
  assert(!missingOk, 'Safely returns false for unregistered NPC');
}

console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
