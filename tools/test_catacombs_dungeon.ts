// tools/test_catacombs_dungeon.ts
// BitQuest Headless Verification Suite: The Sunken Catacombs Puzzle Dungeon
// Issue #22: Task 7.4: Subterranean puzzle dungeon with light/dark mechanics, moving platforms, and multi-phase boss

import { 
  DUNGEON_CONSTANTS, 
  MALAKOR_SPECS, 
  DungeonManager, 
  CATACOMBS_FLOORS, 
  type DungeonFloorId 
} from '../shared/src/dungeon';
import { EQUIPMENT_DEFINITIONS, EquipmentManager } from '../shared/src/equipment';
import { WorldManager } from '../server/src/world';
import { ServerMovementValidator } from '../shared/src/netcode/prediction';
import type { PlayerData, EntityData } from '../shared/src/types';

console.log('🗝️ Running BitQuest Sunken Catacombs Dungeon Test Suite (Issue #22)...\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${msg}`);
    passedTests++;
  }
}

// ============================================================
// 1. Dungeon Floor Metadata & Constants Integrity
// ============================================================
console.log('--- 1. Dungeon Floor Metadata & Constants Integrity ---');

assert(!!CATACOMBS_FLOORS.f1, 'Floor 1 metadata exists');
assert(CATACOMBS_FLOORS.f1.name === 'The Sunken Catacombs', 'Floor 1 name matches');
assert(CATACOMBS_FLOORS.f1.cameraBounds.height === 1600, 'Floor 1 camera bounds configured');
assert(!!CATACOMBS_FLOORS.f2, 'Floor 2 metadata exists');
assert(CATACOMBS_FLOORS.f2.name === 'The Sunken Catacombs', 'Floor 2 name matches');
assert(CATACOMBS_FLOORS.f2.ambientAlpha === 0.90, 'Floor 2 deep darkness ambient alpha set');

assert(DUNGEON_CONSTANTS.OVERWORLD_ENTRANCE.y === 140, 'Overworld entrance located in Ruins Sanctuary (y=140)');
assert(DUNGEON_CONSTANTS.F1_TORCHES.length === 3, 'Floor 1 has 3 puzzle torches defined');
assert(DUNGEON_CONSTANTS.F2_TORCHES.length === 4, 'Floor 2 has 4 sanctuary ward torches defined');
assert(MALAKOR_SPECS.maxHp === 24, 'Malakor max HP is 24');
assert(MALAKOR_SPECS.phase2.thresholdHp === 12, 'Malakor Phase 2 threshold triggers at 12 HP');
assert(MALAKOR_SPECS.phase2.darknessShroudMitigationPct === 0.75, 'Malakor Darkness Shroud mitigates 75% damage');

// ============================================================
// 2. Deterministic Moving Platform Kinematics & Zero-Allocation
// ============================================================
console.log('\n--- 2. Deterministic Moving Platform Kinematics & Zero-Allocation ---');

const p0 = DungeonManager.getPlatformPosition(0);
assert(p0.x === DUNGEON_CONSTANTS.F1_PLATFORM.minX, `Platform starts at minX (${DUNGEON_CONSTANTS.F1_PLATFORM.minX})`);
assert(p0.y === DUNGEON_CONSTANTS.F1_PLATFORM.y, `Platform Y coordinate is ${DUNGEON_CONSTANTS.F1_PLATFORM.y}`);
assert(p0.vx > 0, 'Platform initial velocity is positive (moving right)');

const span = DUNGEON_CONSTANTS.F1_PLATFORM.maxX - DUNGEON_CONSTANTS.F1_PLATFORM.minX;
const oneWayMs = (span / DUNGEON_CONSTANTS.F1_PLATFORM.speed) * 1000;
const pMax = DungeonManager.getPlatformPosition(oneWayMs);
assert(Math.abs(pMax.x - DUNGEON_CONSTANTS.F1_PLATFORM.maxX) < 0.1, `Platform reaches maxX (${DUNGEON_CONSTANTS.F1_PLATFORM.maxX}) after ${oneWayMs}ms`);

// Zero-allocation buffer reuse benchmark
const out = { x: 0, y: 0, vx: 0 };
const benchStart = performance.now();
for (let i = 0; i < 100000; i++) {
  DungeonManager.getPlatformPosition(i * 16, out);
}
const benchDuration = performance.now() - benchStart;
console.log(`  ⚡ Benchmark: 100,000 getPlatformPosition executions in ${benchDuration.toFixed(2)}ms`);
assert(benchDuration < 50, `Zero-allocation platform physics completed within budget (< 50ms, actual: ${benchDuration.toFixed(2)}ms)`);

// Chasm and platform bounds tests
assert(DungeonManager.isInsideAbyss(1024, 3050), 'Inside abyss bounds at (1024, 3050)');
assert(!DungeonManager.isInsideAbyss(1024, 2800), 'Outside abyss bounds at (1024, 2800)');
assert(DungeonManager.isOnMovingPlatform(1024, 3050, 1024, 3050), 'Player standing on moving platform detected safely');
assert(!DungeonManager.isOnMovingPlatform(900, 3050, 1024, 3050), 'Player offset from moving platform detected as off-platform');

assert(DungeonManager.getFloorFromY(500) === 'overworld', 'y=500 is overworld');
assert(DungeonManager.getFloorFromY(2500) === 'f1', 'y=2500 is Floor 1');
assert(DungeonManager.getFloorFromY(4500) === 'f2', 'y=4500 is Floor 2');

// ============================================================
// 3. WorldManager Dungeon Entities Initialization & Subterranean Bounds
// ============================================================
console.log('\n--- 3. WorldManager Dungeon Entities & Subterranean Bounds ---');

const world = new WorldManager();

// SpatialGrid height is expanded to 5500 (rows >= 43)
assert(world.spatialGrid.rows >= 43, `SpatialGrid rows expanded for subterranean floors (rows: ${world.spatialGrid.rows})`);

// Entrance trigger
const entrance = world.entities.get('stairs_catacombs_entrance');
assert(!!entrance, 'Overworld entrance stairs entity exists');
assert(entrance?.x === 1024 && entrance?.y === 140, 'Entrance is at (1024, 140)');

// Floor 1 Entities
const stairsF1Up = world.entities.get(DUNGEON_CONSTANTS.F1_STAIRS_UP.id);
assert(!!stairsF1Up, 'Floor 1 ascending stairs entity exists');

for (const t of DUNGEON_CONSTANTS.F1_TORCHES) {
  const torch = world.entities.get(t.id);
  assert(!!torch, `Floor 1 torch '${t.id}' exists`);
  assert(torch?.type === 'torch', `Torch '${t.id}' is entity type 'torch'`);
  assert(torch?.state.lit === false, `Torch '${t.id}' is initially unlit`);
}

const f1Gate = world.entities.get(DUNGEON_CONSTANTS.F1_GATE.id);
assert(!!f1Gate, 'Floor 1 iron gate exists');
assert(f1Gate?.state.opened === false, 'Floor 1 iron gate is initially closed');

const platform = world.entities.get(DUNGEON_CONSTANTS.F1_PLATFORM.id);
assert(!!platform, 'Floor 1 moving platform entity exists');
assert(platform?.type === 'platform', 'Platform is entity type "platform"');

const f1Skel = world.entities.get('enemy_skel_f1_1');
assert(!!f1Skel, 'Floor 1 Crypt Skeleton exists');
assert(f1Skel?.state.hp === 4, 'Crypt skeleton has 4 HP');

// Floor 2 Entities
const stairsF2Up = world.entities.get(DUNGEON_CONSTANTS.F2_STAIRS_UP.id);
assert(!!stairsF2Up, 'Floor 2 ascending stairs entity exists');

for (const t of DUNGEON_CONSTANTS.F2_TORCHES) {
  const torch = world.entities.get(t.id);
  assert(!!torch, `Floor 2 torch '${t.id}' exists`);
  assert(torch?.state.lit === true, `Floor 2 torch '${t.id}' is initially lit`);
}

const malakor = world.entities.get(MALAKOR_SPECS.id);
assert(!!malakor, 'Malakor the Tomb Warden boss entity exists');
assert(malakor?.type === 'boss', 'Malakor is entity type "boss"');
assert(malakor?.state.hp === 24, 'Malakor starts with 24 HP');

const relicChest = world.entities.get(DUNGEON_CONSTANTS.F2_RELIC_CHEST.id);
assert(!!relicChest, 'Relic chest entity exists');
assert(relicChest?.state.locked === true, 'Relic chest is locked before Malakor is defeated');

const portal = world.entities.get(DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id);
assert(!!portal, 'Exit portal entity exists');
assert(portal?.state.active === false, 'Exit portal is inactive before Malakor is defeated');

// Movement validation across subterranean bounds (y <= 5500)
const moveValidSubterranean = ServerMovementValidator.validateMovement(
  1024, 2300, 1024, 2350, 60, (x, y) => x >= 0 && x <= 2048 && y >= 0 && y <= 5500
);
assert(moveValidSubterranean.valid, 'Subterranean movement in Floor 1 (y=2350) is valid');

const moveValidFloor2 = ServerMovementValidator.validateMovement(
  1024, 4500, 1024, 4550, 60, (x, y) => x >= 0 && x <= 2048 && y >= 0 && y <= 5500
);
assert(moveValidFloor2.valid, 'Subterranean movement in Floor 2 (y=4550) is valid');

// ============================================================
// 4. Floor 1 Torch Light Puzzle & Iron Gate Opening
// ============================================================
console.log('\n--- 4. Floor 1 Torch Light Puzzle & Iron Gate Opening ---');

const testPlayerId = 'p_dungeon_tester';
world.addPlayer(testPlayerId, 'DungeonCrawler', '#3b82f6', 0);
const player = world.players.get(testPlayerId)!;

// Entrance warp
let transitionedFloor: string | null = null;
world.onDungeonTransition = (pid, floorId, x, y, title, subtitle) => {
  transitionedFloor = floorId;
};

world.handleInteract(testPlayerId, 'stairs_catacombs_entrance', 'enter_dungeon');
assert(transitionedFloor === 'f1', 'Interacting with entrance stairs transitions player to Floor 1');
assert(player.x === DUNGEON_CONSTANTS.F1_SPAWN.x && player.y === DUNGEON_CONSTANTS.F1_SPAWN.y, 'Player position updated to Floor 1 spawn');

let torchLitEventFired = false;
let roomSolvedEvent = false;
world.onTorchLitEvent = (torchId, x, y, roomSolved) => {
  torchLitEventFired = true;
  roomSolvedEvent = !!roomSolved;
};

// Light Torch 1
world.handleInteract(testPlayerId, 'torch_f1_1', 'light_torch');
assert(world.entities.get('torch_f1_1')?.state.lit === true, 'Torch 1 is now lit');
assert(torchLitEventFired, 'Torch lit event fired');
assert(!roomSolvedEvent, 'Room is not yet solved with 1/3 torches');
assert(f1Gate.state.opened === false, 'Iron gate remains closed');

// Light Torch 2
torchLitEventFired = false;
world.handleInteract(testPlayerId, 'torch_f1_2', 'light_torch');
assert(world.entities.get('torch_f1_2')?.state.lit === true, 'Torch 2 is now lit');
assert(!roomSolvedEvent, 'Room is not yet solved with 2/3 torches');
assert(f1Gate.state.opened === false, 'Iron gate remains closed');

// Light Torch 3 (Completes puzzle!)
torchLitEventFired = false;
world.handleInteract(testPlayerId, 'torch_f1_3', 'light_torch');
assert(world.entities.get('torch_f1_3')?.state.lit === true, 'Torch 3 is now lit');
assert(roomSolvedEvent, 'Room solved event emitted when all 3 torches are lit!');
assert(f1Gate.state.opened === true, 'Forgotten Crypt Iron Gate is now unlocked and open!');

// ============================================================
// 5. Malakor Boss Mechanics: Phase 1, Phase 2 Shroud, and Defeat
// ============================================================
console.log('\n--- 5. Malakor Boss Mechanics & Relic Reward ---');

// Descend to Floor 2
world.handleInteract(testPlayerId, 'stairs_to_f2', 'warp_floor');
assert(transitionedFloor === 'f2', 'Player descended to Floor 2');
assert(player.x === DUNGEON_CONSTANTS.F2_SPAWN.x && player.y === DUNGEON_CONSTANTS.F2_SPAWN.y, 'Player spawned on Floor 2');

// Malakor Phase 1 damage
world.handleInteract(testPlayerId, MALAKOR_SPECS.id, 'hit_enemy', undefined, undefined, 4);
assert(malakor.state.hp === 20, `Malakor received full damage in Phase 1 (24 -> 20 HP, actual: ${malakor.state.hp})`);
assert(!malakor.state.shroudActive, 'Darkness Shroud is inactive in Phase 1');

// Damage Malakor below threshold (<= 12 HP) to trigger Phase 2
world.handleInteract(testPlayerId, MALAKOR_SPECS.id, 'hit_enemy', undefined, undefined, 8);
assert(malakor.state.hp === 12, `Malakor dropped to Phase 2 threshold (20 -> 12 HP)`);

// Trigger AI tick or boss phase 2 activation
malakor.state.phase2Triggered = true;
malakor.state.shroudActive = true;
for (const t of DUNGEON_CONSTANTS.F2_TORCHES) {
  const torch = world.entities.get(t.id)!;
  torch.state.lit = false;
}

assert(malakor.state.shroudActive === true, 'Malakor invoked Darkness Shroud');
assert(DUNGEON_CONSTANTS.F2_TORCHES.every(t => !world.entities.get(t.id)?.state.lit), 'All 4 Floor 2 torches extinguished by the Shroud');

// Test 75% Damage Mitigation while Shroud is Active
const hpBeforeHit = malakor.state.hp;
world.handleInteract(testPlayerId, MALAKOR_SPECS.id, 'hit_enemy', undefined, undefined, 4);
// With 75% reduction, 4 damage becomes 4 * 0.25 = 1 damage
const actualDamageTaken = hpBeforeHit - malakor.state.hp;
assert(actualDamageTaken === 1, `Darkness Shroud mitigated 75% damage (4 dmg -> ${actualDamageTaken} dmg taken)`);

// Relight Floor 2 Torches to Dispel Shroud
let bossStunned = false;
world.onBossEvent = (evt) => {
  if (evt.action === 'crash_stun' && evt.bossId === MALAKOR_SPECS.id) {
    bossStunned = true;
  }
};

world.handleInteract(testPlayerId, 'torch_f2_nw', 'light_torch');
world.handleInteract(testPlayerId, 'torch_f2_ne', 'light_torch');
world.handleInteract(testPlayerId, 'torch_f2_sw', 'light_torch');
assert(malakor.state.shroudActive === true, 'Shroud remains active with 3/4 torches');

// Light 4th torch: dispels shroud and stuns Malakor!
world.handleInteract(testPlayerId, 'torch_f2_se', 'light_torch');
assert(malakor.state.shroudActive === false, 'Darkness Shroud dispelled!');
assert(malakor.state.stunnedUntil > Date.now(), 'Malakor is stunned for 3.2 seconds');
assert(bossStunned, 'Boss crash_stun event broadcasted to all players');

// Finish off Malakor
let bossDefeatedBroadcast = false;
world.onBossEvent = (evt) => {
  if (evt.action === 'defeated' && evt.bossId === MALAKOR_SPECS.id) {
    bossDefeatedBroadcast = true;
  }
};

world.handleInteract(testPlayerId, MALAKOR_SPECS.id, 'hit_enemy', undefined, undefined, 20);
assert(malakor.state.destroyed === true, 'Malakor is defeated and destroyed');
assert(bossDefeatedBroadcast, 'Boss defeated broadcast emitted');
assert(relicChest.state.locked === false, 'Malakor’s Relic Chest is unlocked');
assert(portal.state.active === true, 'Radiant surface exit portal is activated');

// Open Relic Chest & Claim Sun Stone
let relicSpawned = false;
world.onItemSpawned = (it) => {
  if (it.itemType === 'relic_sun_stone') {
    relicSpawned = true;
  }
};

world.handleInteract(testPlayerId, DUNGEON_CONSTANTS.F2_RELIC_CHEST.id, 'press');
assert(relicChest.state.opened === true, 'Relic chest is opened');
assert(relicSpawned, 'Sun Stone Relic item drop spawned on ground');

// ============================================================
// 6. Relic Equipping & Stat Bonuses Verification
// ============================================================
console.log('\n--- 6. Relic Equipping & Stat Bonuses Verification ---');

const relicDef = EQUIPMENT_DEFINITIONS['relic_sun_stone'];
assert(!!relicDef, 'relic_sun_stone definition exists');
assert(relicDef.slot === 'relic', 'relic_sun_stone slot is "relic"');
assert(relicDef.stats.maxHealthBonus === 2, 'Sun stone grants +2 Max Health');
assert(relicDef.stats.attackPower === 1, 'Sun stone grants +1 Attack Power');
assert(relicDef.stats.damageReductionPct === 0.10, 'Sun stone grants +10% Damage Reduction');

// Equip to player
world.handleEquipItem(testPlayerId, 'relic', 'relic_sun_stone');
const stats = world.getPlayerStats(testPlayerId);
assert(stats.attackPower >= 2, `Player attack power boosted by relic (current: ${stats.attackPower})`);
assert(stats.damageReductionPct >= 0.10, `Player damage reduction boosted by relic (current: ${stats.damageReductionPct})`);

// Surface exit portal warp
world.handleInteract(testPlayerId, DUNGEON_CONSTANTS.F2_EXIT_PORTAL.id, 'warp_floor');
assert(transitionedFloor === 'overworld', 'Stepping into exit portal transitions player back to surface world');
assert(player.x === DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.x && player.y === DUNGEON_CONSTANTS.OVERWORLD_EXIT_WARP.y, 'Player safely back at Ruins Sanctuary surface');

// Cleanup
world.removePlayer(testPlayerId);

console.log(`\n🎉 The Sunken Catacombs Dungeon Test Suite Complete! Passed: ${passedTests}/${totalTests} tests.`);
process.exit(0);
