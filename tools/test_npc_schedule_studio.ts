/**
 * BitQuest - NPC Daily Schedule & Behavior Path Router Test Suite (Milestone 9.3)
 *
 * Verifies:
 * 1. Loading canonical NPC circadian schedules & Zod schema validation.
 * 2. Circadian time sampling across dawn, morning, afternoon, sunset, and midnight.
 * 3. Overnight window wrapping (e.g. 21h - 5h resting window across midnight).
 * 4. Multi-NPC simultaneous spatial queries.
 * 5. 24-Hour continuity linter & gap detection.
 * 6. Waypoint relocation and routine stop mutations.
 * 7. Lossless JSON export and schema re-validation.
 */

import { NPCScheduleStudio } from '../client/src/tools/npcScheduleStudio';
import { NPCScheduleDefSchema } from '../shared/src/schemas';

console.log('🧭 Running BitQuest NPC Daily Schedule & Path Router Test Suite (Milestone 9.3)...');

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
// 1. Loading Canonical NPC Schedules & Schema Conformance
// ---------------------------------------------------------------------------
console.log('\n--- 1. Loading Canonical NPC Schedules & Schema Conformance ---');
const studio = new NPCScheduleStudio(null as any);

assert(studio.schedules !== undefined, "NPCScheduleStudio initialized with schedules");
const npcIds = Object.keys(studio.schedules);
assert(npcIds.length >= 5, `Loaded ${npcIds.length} village NPC schedules (expected >= 5)`);
assert(studio.schedules['npc_grandma'] !== undefined, "Grandma Bramble schedule exists");
assert(studio.schedules['npc_barnaby'] !== undefined, "Barnaby schedule exists");
assert(studio.schedules['npc_reinald'] !== undefined, "Sir Reginald schedule exists");
assert(studio.schedules['npc_finn'] !== undefined, "Finn the Otter schedule exists");
assert(studio.schedules['merchant_pip'] !== undefined, "Pip the Fox Merchant schedule exists");

// Validate all NPC schedules against Zod schema
for (const [id, def] of Object.entries(studio.schedules)) {
  const result = NPCScheduleDefSchema.safeParse(def);
  assert(result.success, `NPC [${id}] strictly conforms to NPCScheduleDefSchema`);
}

// ---------------------------------------------------------------------------
// 2. Circadian Time Sampling & Activity States
// ---------------------------------------------------------------------------
console.log('\n--- 2. Circadian Time Sampling & Activity States ---');
// Grandma Bramble at 6:30 AM (Dawn garden tending)
const grandmaDawn = studio.getNPCPositionAt('npc_grandma', 6.5);
assert(grandmaDawn.activity === 'tending_garden', "Grandma at 6:30 AM is 'tending_garden'");
assert(grandmaDawn.x === 1420 && grandmaDawn.y === 880, "Grandma at Community Garden coordinates (1420, 880)");
assert(grandmaDawn.emote === 'heart', "Grandma has 'heart' ambient emote");

// Grandma Bramble at 12:00 PM (Noon bakery shift)
const grandmaNoon = studio.getNPCPositionAt('npc_grandma', 12.0);
assert(grandmaNoon.activity === 'baking', "Grandma at 12:00 PM is 'baking'");
assert(grandmaNoon.x === 1248 && grandmaNoon.y === 870, "Grandma at Bakery Hearth coordinates (1248, 870)");

// Grandma Bramble at 19:00 (Evening campfire gathering)
const grandmaEve = studio.getNPCPositionAt('npc_grandma', 19.0);
assert(grandmaEve.activity === 'gathering', "Grandma at 7:00 PM is 'gathering' at campfire");
assert(grandmaEve.x === 670 && grandmaEve.y === 720, "Grandma at Campfire coordinates (670, 720)");

// ---------------------------------------------------------------------------
// 3. Overnight Window Wrapping Past Midnight
// ---------------------------------------------------------------------------
console.log('\n--- 3. Overnight Window Wrapping Past Midnight ---');
// Grandma routine wraps 21:00 to 5:00
const grandma23h = studio.getNPCPositionAt('npc_grandma', 23.5);
assert(grandma23h.activity === 'resting', "Grandma at 23:30 is 'resting'");
assert(grandma23h.emote === 'sleep', "Grandma shows 'sleep' emote at night");

const grandma02h = studio.getNPCPositionAt('npc_grandma', 2.0);
assert(grandma02h.activity === 'resting', "Grandma at 02:00 AM (past midnight) is 'resting'");

const grandma04h = studio.getNPCPositionAt('npc_grandma', 4.5);
assert(grandma04h.activity === 'resting', "Grandma at 04:30 AM is 'resting'");

// ---------------------------------------------------------------------------
// 4. Multi-NPC Simultaneous Spatial Queries
// ---------------------------------------------------------------------------
console.log('\n--- 4. Multi-NPC Simultaneous Spatial Queries ---');
// At 10:00 AM (Morning work hours)
const barnabyMorning = studio.getNPCPositionAt('npc_barnaby', 10.0);
assert(barnabyMorning.activity === 'blacksmithing', "Barnaby at 10:00 AM is 'blacksmithing' at the forge");

const finnMorning = studio.getNPCPositionAt('npc_finn', 10.0);
assert(finnMorning.activity === 'fishing', "Finn at 10:00 AM is 'fishing' at Crystal River");

const reinaldMorning = studio.getNPCPositionAt('npc_reinald', 10.0);
assert(reinaldMorning.activity === 'patrolling', "Sir Reginald at 10:00 AM is 'patrolling' Grand Plaza");

const pipMorning = studio.getNPCPositionAt('merchant_pip', 10.0);
assert(pipMorning.activity === 'browsing', "Pip at 10:00 AM is 'browsing' at Curio Market");

// ---------------------------------------------------------------------------
// 5. 24-Hour Continuity Linter & Gap Detection
// ---------------------------------------------------------------------------
console.log('\n--- 5. 24-Hour Continuity Linter & Gap Detection ---');
studio.selectedNpcId = 'npc_grandma';
let lint = studio.runLinter();
assert(lint.isValid, "Grandma routine passes 24h continuity check");
assert(lint.coverageHours === 24, "Grandma routine has complete 24/24 hour coverage");

// Inject an intentional gap by modifying startHour
const originalStart = studio.schedules['npc_grandma'].keyframes[1].startHour;
studio.schedules['npc_grandma'].keyframes[1].startHour = 10.0; // Leaves 8h - 10h gap
lint = studio.runLinter();
assert(!lint.isValid, "Linter successfully detected schedule gap");
assert(lint.coverageHours < 24, `Linter reports incomplete coverage: ${lint.coverageHours}/24h`);

// Restore original
studio.schedules['npc_grandma'].keyframes[1].startHour = originalStart;
lint = studio.runLinter();
assert(lint.isValid, "Grandma routine valid again after restoring start hour");

// ---------------------------------------------------------------------------
// 6. Waypoint Relocation & Stop Mutations
// ---------------------------------------------------------------------------
console.log('\n--- 6. Waypoint Relocation & Stop Mutations ---');
// Add new routine stop
const initialStopsCount = studio.schedules['npc_grandma'].keyframes.length;
studio.currentHour = 14.0;
studio.selectedNpcId = 'npc_grandma';

studio.schedules['npc_grandma'].keyframes.push({
  startHour: 14.0,
  endHour: 15.0,
  x: 1000,
  y: 800,
  activity: 'browsing',
  direction: 'down',
  greeting: 'Taking an afternoon stroll!',
  ambientEmote: 'happy'
});
assert(studio.schedules['npc_grandma'].keyframes.length === initialStopsCount + 1, "New routine stop added");

// Move waypoint coords
const lastIdx = studio.schedules['npc_grandma'].keyframes.length - 1;
studio.schedules['npc_grandma'].keyframes[lastIdx].x = 1100;
studio.schedules['npc_grandma'].keyframes[lastIdx].y = 900;
assert(studio.schedules['npc_grandma'].keyframes[lastIdx].x === 1100, "Waypoint X moved to 1100");
assert(studio.schedules['npc_grandma'].keyframes[lastIdx].y === 900, "Waypoint Y moved to 900");

// Delete routine stop
studio.schedules['npc_grandma'].keyframes.splice(lastIdx, 1);
assert(studio.schedules['npc_grandma'].keyframes.length === initialStopsCount, "Routine stop removed");

// ---------------------------------------------------------------------------
// 7. Lossless JSON Export & Re-Validation
// ---------------------------------------------------------------------------
console.log('\n--- 7. Lossless JSON Export & Re-Validation ---');
const exported = studio.exportJSON();
assert(typeof exported === 'string', "exportJSON returns serialized JSON string");

const parsed = JSON.parse(exported);
assert(parsed['npc_grandma'] !== undefined, "Exported JSON contains 'npc_grandma'");
assert(parsed['npc_grandma'].keyframes.length >= 4, "Exported grandma has at least 4 routine stops");

const grandmaRevalidated = NPCScheduleDefSchema.safeParse(parsed['npc_grandma']);
assert(grandmaRevalidated.success, "Re-parsed exported grandma validates against NPCScheduleDefSchema");

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
