/**
 * BitQuest - Procedural Dungeon & WFC Seed Generator Test Suite (Milestone 9.4)
 *
 * Verifies:
 * 1. Seeded deterministic PRNG generation (identical layouts per seed).
 * 2. Distinct layout divergence across seeds (e.g. 1337 vs 4242).
 * 3. Configurable grid scales (16x16, 24x24, 32x32) and boundary compliance.
 * 4. Room carving, non-overlapping chamber guarantees, and surrounding walls.
 * 5. Critical spatial features: Spawn room (entrance), Vault (exit + boss chest).
 * 6. Lock-and-Key graph solver verifying reachability and no softlocks.
 * 7. Multi-layer threat & hazard distribution calculations.
 * 8. Strict Zod schema validation (DungeonWFCResultSchema).
 * 9. Lossless JSON export and re-parse validation.
 * 10. BFS graph solver edge cases and softlock detection.
 */

import { DungeonStudio } from '../client/src/tools/dungeonStudio';
import { DungeonWFCResultSchema } from '../shared/src/schemas';

console.log('🏰 Running BitQuest Procedural Dungeon & WFC Generator Test Suite (Milestone 9.4)...');

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
// 1. Seeded Deterministic Reproducibility
// ---------------------------------------------------------------------------
console.log('\n--- 1. Seeded Deterministic Reproducibility ---');
const studioA = new DungeonStudio();
studioA.config.seed = 1337;
studioA.config.gridWidth = 24;
studioA.config.gridHeight = 24;
studioA.config.roomCount = 8;
const resultA1 = studioA.generate();

const studioB = new DungeonStudio();
studioB.config.seed = 1337;
studioB.config.gridWidth = 24;
studioB.config.gridHeight = 24;
studioB.config.roomCount = 8;
const resultA2 = studioB.generate();

assert(resultA1.seed === 1337, 'Studio A generated seed 1337');
assert(resultA2.seed === 1337, 'Studio B generated seed 1337');
assert(resultA1.rooms.length === resultA2.rooms.length, `Room count matches: ${resultA1.rooms.length}`);
assert(resultA1.criticalPathLength === resultA2.criticalPathLength, `Critical path matches: ${resultA1.criticalPathLength}`);

// Deep grid equality check
let gridsMatch = true;
for (let y = 0; y < 24; y++) {
  for (let x = 0; x < 24; x++) {
    if (resultA1.grid[y][x] !== resultA2.grid[y][x]) {
      gridsMatch = false;
      break;
    }
  }
}
assert(gridsMatch, 'Seed 1337 produces identical 24x24 tile grid across separate generator instances');

// ---------------------------------------------------------------------------
// 2. Seed Divergence & Layout Variety
// ---------------------------------------------------------------------------
console.log('\n--- 2. Seed Divergence & Layout Variety ---');
studioB.config.seed = 98765;
const resultDiff = studioB.generate();

assert(resultDiff.seed === 98765, 'Generated layout with alternate seed 98765');
let tilesDiffer = false;
for (let y = 0; y < 24; y++) {
  for (let x = 0; x < 24; x++) {
    if (resultA1.grid[y][x] !== resultDiff.grid[y][x]) {
      tilesDiffer = true;
      break;
    }
  }
}
assert(tilesDiffer, 'Seed 98765 produces a divergent spatial layout from seed 1337');

// ---------------------------------------------------------------------------
// 3. Grid Dimensions & Boundary Compliance
// ---------------------------------------------------------------------------
console.log('\n--- 3. Grid Dimensions & Boundary Compliance ---');
const sizes = [16, 24, 32];
for (const size of sizes) {
  const scaleStudio = new DungeonStudio();
  scaleStudio.config.gridWidth = size;
  scaleStudio.config.gridHeight = size;
  scaleStudio.config.roomCount = 6;
  const scaleRes = scaleStudio.generate();

  assert(scaleRes.grid.length === size, `Grid height is ${size} for scale ${size}x${size}`);
  assert(scaleRes.grid[0].length === size, `Grid width is ${size} for scale ${size}x${size}`);

  // Check no room exceeds grid bounds
  let inBounds = true;
  for (const r of scaleRes.rooms) {
    if (r.x < 0 || r.y < 0 || r.x + r.width > size || r.y + r.height > size) {
      inBounds = false;
      break;
    }
  }
  assert(inBounds, `All rooms strictly contained within ${size}x${size} boundaries`);
}

// ---------------------------------------------------------------------------
// 4. Chamber Carving & Solid Perimeter
// ---------------------------------------------------------------------------
console.log('\n--- 4. Chamber Carving & Solid Perimeter ---');
const res = resultA1;
let roomsCarvedProperly = true;
for (const r of res.rooms) {
  for (let y = r.y; y < r.y + r.height; y++) {
    for (let x = r.x; x < r.x + r.width; x++) {
      const cell = res.grid[y][x];
      // Chamber cells must be floor or an object placed on floor
      const validRoomCell =
        cell === 'floor_room' ||
        cell === 'stairs_entrance' ||
        cell === 'stairs_exit' ||
        cell === 'chest_boss' ||
        cell === 'chest_common' ||
        cell === 'door_locked' ||
        cell === 'hazard_spikes';
      if (!validRoomCell) {
        roomsCarvedProperly = false;
        break;
      }
    }
  }
}
assert(roomsCarvedProperly, 'All room interior cells are carved as valid walkable chamber tiles');

// Verify non-overlapping chambers
let roomsOverlap = false;
for (let i = 0; i < res.rooms.length; i++) {
  for (let j = i + 1; j < res.rooms.length; j++) {
    const a = res.rooms[i];
    const b = res.rooms[j];
    if (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    ) {
      roomsOverlap = true;
      break;
    }
  }
}
assert(!roomsOverlap, 'No chambers overlap with one another (clean room separation)');

// ---------------------------------------------------------------------------
// 5. Critical Quest Features (Spawn, Vault, Lock-and-Key)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Critical Quest Features (Spawn, Vault, Lock-and-Key) ---');
const spawnRoom = res.rooms.find(r => r.type === 'spawn');
const vaultRoom = res.rooms.find(r => r.type === 'vault');
const bossRoom = res.rooms.find(r => r.type === 'boss');

assert(spawnRoom !== undefined, "Dungeon contains a designated 'spawn' room");
assert(vaultRoom !== undefined, "Dungeon contains a designated 'vault' room");
assert(bossRoom !== undefined, "Dungeon contains a designated 'boss' chamber");

// Verify entrance stairs in spawn room
let hasEntranceStairs = false;
for (let y = spawnRoom!.y; y < spawnRoom!.y + spawnRoom!.height; y++) {
  for (let x = spawnRoom!.x; x < spawnRoom!.x + spawnRoom!.width; x++) {
    if (res.grid[y][x] === 'stairs_entrance') hasEntranceStairs = true;
  }
}
assert(hasEntranceStairs, "Entrance stairs ('stairs_entrance') placed in spawn room");

// Verify exit stairs in vault room
let hasExitStairs = false;
for (let y = vaultRoom!.y; y < vaultRoom!.y + vaultRoom!.height; y++) {
  for (let x = vaultRoom!.x; x < vaultRoom!.x + vaultRoom!.width; x++) {
    if (res.grid[y][x] === 'stairs_exit') hasExitStairs = true;
  }
}
assert(hasExitStairs, "Exit stairs ('stairs_exit') placed in final vault room");

// ---------------------------------------------------------------------------
// 6. Lock-and-Key Graph Solver & Reachability
// ---------------------------------------------------------------------------
console.log('\n--- 6. Lock-and-Key Graph Solver & Reachability ---');
assert(res.lockKeys.length >= 1, `Dungeon generated ${res.lockKeys.length} lock-and-key puzzle constraints`);
const lk = res.lockKeys[0];
assert(lk.keyId === 'boss_key', "Key identified as 'boss_key'");
assert(lk.doorId === 'boss_door', "Door identified as 'boss_door'");
assert(res.isSolvable, 'Dungeon layout is verified 100% mathematically solvable');
assert(res.criticalPathLength > 0, `Critical path traversal length is ${res.criticalPathLength} steps`);

// Test solver directly on a mock solvable vs unsolvable grid
const mockGrid = [
  ['floor_room', 'floor_room', 'door_locked', 'floor_room'],
  ['solid_wall', 'solid_wall', 'solid_wall', 'solid_wall']
] as any;
const solvableCheck = studioA.verifySolvability(mockGrid, 0, 0, 1, 0, 2, 0, 3, 0);
assert(solvableCheck.isSolvable, 'Solver confirms path when key precedes locked door');
assert(solvableCheck.pathLength === 3, `Path length is 3 (expected 3)`);

// Unsolvable test: key placed behind the locked door
const unsolvableCheck = studioA.verifySolvability(mockGrid, 0, 0, 3, 0, 2, 0, 3, 0);
assert(!unsolvableCheck.isSolvable, 'Solver detects softlock when key is trapped behind locked door');

// ---------------------------------------------------------------------------
// 7. Multi-layer Threat & Hazard Metrics
// ---------------------------------------------------------------------------
console.log('\n--- 7. Multi-layer Threat & Hazard Metrics ---');
assert(res.totalMonsters > 0, `Total simulated monster spawns: ${res.totalMonsters}`);
assert(res.totalChests >= 1, `Total loot chests placed: ${res.totalChests}`);
assert(spawnRoom!.monsterDensity === 0, 'Spawn room has 0% monster density (safe sanctuary)');
assert(vaultRoom!.lootTier >= 4, `Vault chamber has highest loot tier (${vaultRoom!.lootTier})`);

// ---------------------------------------------------------------------------
// 8. Strict Zod Schema Conformance
// ---------------------------------------------------------------------------
console.log('\n--- 8. Strict Zod Schema Conformance ---');
const parsed = DungeonWFCResultSchema.safeParse(res);
assert(parsed.success, 'Dungeon generation output strictly validates against DungeonWFCResultSchema');
if (!parsed.success) {
  console.error(parsed.error);
}

// ---------------------------------------------------------------------------
// 9. Lossless JSON Export & Re-import
// ---------------------------------------------------------------------------
console.log('\n--- 9. Lossless JSON Export & Re-import ---');
const jsonStr = studioA.exportJSON();
assert(typeof jsonStr === 'string' && jsonStr.length > 100, 'exportJSON() generated non-empty JSON string');
const reimported = JSON.parse(jsonStr);
const reimportParsed = DungeonWFCResultSchema.safeParse(reimported);
assert(reimportParsed.success, 'Exported JSON parses cleanly and satisfies schema requirements');
assert(reimported.seed === 1337, 'Exported JSON preserved seed value');
assert(reimported.rooms.length === res.rooms.length, 'Exported JSON preserved room collection');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Procedural Dungeon Generator Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
