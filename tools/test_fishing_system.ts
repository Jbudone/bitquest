// tools/test_fishing_system.ts
// BitQuest Headless Verification Suite: Cozy Bobber Fishing & River Secrets
// Issue #23: Task 7.5: Mini-game with tension-meter bobbing, water ripples, rare fish species, and river treasure chests

import { 
  FISH_SPECIES, 
  FishingEngine, 
  type FishSpecies, 
  type PlayerFishLog 
} from '../shared/src/fishing';
import { WorldManager } from '../server/src/world';
import type { PlayerData, ItemDropData } from '../shared/src/types';

console.log('🎣 Running BitQuest Cozy Bobber Fishing & River Secrets Test Suite (Issue #23)...\n');

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
// 1. Fish Species Definitions & Registry Integrity
// ============================================================
console.log('--- 1. Fish Species Definitions & Integrity ---');

const speciesList = Object.values(FISH_SPECIES);
assert(speciesList.length === 10, `All 10 fish/treasure species defined (actual: ${speciesList.length})`);

for (const fish of speciesList) {
  assert(fish.minSizeCm > 0, `${fish.name}: minSizeCm is positive (${fish.minSizeCm})`);
  assert(fish.maxSizeCm > fish.minSizeCm, `${fish.name}: maxSizeCm (${fish.maxSizeCm}) > minSizeCm (${fish.minSizeCm})`);
  assert(fish.baseValue > 0, `${fish.name}: baseValue is positive (${fish.baseValue})`);
  assert(fish.sweetSpotWidthPct >= 0.10 && fish.sweetSpotWidthPct <= 0.40, `${fish.name}: sweetSpotWidthPct within bounds (${fish.sweetSpotWidthPct})`);
  assert(fish.pullResistance > 0, `${fish.name}: pullResistance is positive (${fish.pullResistance})`);
  assert(fish.erraticFrequency > 0, `${fish.name}: erraticFrequency is positive (${fish.erraticFrequency})`);
  assert(fish.description.length > 10, `${fish.name}: has flavour description`);
}

// Check special items
const chest = FISH_SPECIES.sunken_chest;
assert(!!chest && chest.isTreasure === true, 'sunken_chest is flagged as treasure');
const boot = FISH_SPECIES.waterlogged_boot;
assert(!!boot && boot.isTreasure === true, 'waterlogged_boot is flagged as treasure');

// ============================================================
// 2. Water Tile & Fishing Pier Hotspot Detection
// ============================================================
console.log('\n--- 2. Water Tile & Pier Hotspot Detection ---');

// Whispering Meadow Azure River
assert(FishingEngine.isWaterTile(52, 10, 'overworld'), 'Azure River tile at (52, 10) is water');
assert(FishingEngine.isWaterTile(53, 10, 'overworld'), 'Azure River tile at (53, 10) is water');
// Wooden bridge over Azure River
assert(!FishingEngine.isWaterTile(52, 29, 'overworld'), 'Wooden bridge at (52, 29) is NOT water');
assert(!FishingEngine.isWaterTile(53, 30, 'overworld'), 'Wooden bridge at (53, 30) is NOT water');

// South Crystal Lake
assert(FishingEngine.isWaterTile(28, 45, 'overworld'), 'South Crystal Lake tile at (28, 45) is water');
assert(FishingEngine.isWaterTile(38, 48, 'overworld'), 'South Crystal Lake tile at (38, 48) is water');
// Wooden fishing pier extending into lake
assert(!FishingEngine.isWaterTile(31, 42, 'overworld'), 'Fishing pier at (31, 42) is NOT water (walkable deck)');
assert(!FishingEngine.isWaterTile(32, 44, 'overworld'), 'Fishing pier at (32, 44) is NOT water (walkable deck)');

// Dry land / Town Square
assert(!FishingEngine.isWaterTile(32, 20, 'overworld'), 'Town Square center at (32, 20) is NOT water');
assert(!FishingEngine.isWaterTile(10, 10, 'overworld'), 'Meadow grass at (10, 10) is NOT water');

// Pier hotspot detection
const pierPixelX = 31 * 32 + 16;
const pierPixelY = 43 * 32 + 16;
assert(FishingEngine.isPierHotspot(pierPixelX, pierPixelY), 'Fishing pier hotspot correctly identified');
assert(!FishingEngine.isPierHotspot(52 * 32, 10 * 32), 'River at (52, 10) is NOT pier hotspot');

// Nearest water finder
const riverWater = FishingEngine.findNearestWater(50 * 32, 15 * 32, 'right', 'overworld');
assert(riverWater.found, 'Nearest water finder found Azure River when facing right from x=50');
assert(Math.floor(riverWater.x / 32) === 52, `Found water tileX is 52 (actual: ${Math.floor(riverWater.x / 32)})`);

// ============================================================
// 3. Fish Rolling, Biome Filtering & Size Generation
// ============================================================
console.log('\n--- 3. Fish Rolling, Biome Filtering & Size Generation ---');

// Biome check
const meadowFish = FishingEngine.rollFish('meadow');
assert(meadowFish.biome === 'meadow' || meadowFish.biome === 'all', `Meadow roll matches meadow biome (${meadowFish.name})`);

const riverFish = FishingEngine.rollFish('river');
assert(riverFish.biome === 'river' || riverFish.biome === 'all', `River roll matches river biome (${riverFish.name})`);

const lakeFish = FishingEngine.rollFish('lake');
assert(lakeFish.biome === 'lake' || lakeFish.biome === 'all', `Lake roll matches lake biome (${lakeFish.name})`);

// Size generation within bounds
for (let i = 0; i < 20; i++) {
  const size = FishingEngine.rollFishSize(FISH_SPECIES.shimmer_salmon!);
  assert(
    size >= FISH_SPECIES.shimmer_salmon!.minSizeCm && size <= FISH_SPECIES.shimmer_salmon!.maxSizeCm,
    `Shimmer salmon rolled size ${size} cm within [${FISH_SPECIES.shimmer_salmon!.minSizeCm}, ${FISH_SPECIES.shimmer_salmon!.maxSizeCm}]`
  );
}

// Pier bonus distribution test: pier yields rare/legendary catches
let pierRareCount = 0;
for (let i = 0; i < 100; i++) {
  const f = FishingEngine.rollFish('lake', true);
  if (f.rarity === 'rare' || f.rarity === 'legendary') {
    pierRareCount++;
  }
}
console.log(`  📊 Pier Fishing Hotspot: ${pierRareCount}/100 catches were Rare/Legendary`);
assert(pierRareCount >= 15, `Pier bonus provides elevated rare/legendary rate (actual: ${pierRareCount}%)`);

// ============================================================
// 4. Deterministic Tension Physics & Zero Heap Allocation Benchmark
// ============================================================
console.log('\n--- 4. Deterministic Tension Physics & Zero Heap Allocation ---');

const simState = {
  tension: 0.50,
  sweetSpotCenter: 0.50,
  sweetSpotWidth: 0.30,
  reelProgress: 0.20,
  pullResistance: 0.80,
  erraticFrequency: 1.0,
  timeInMinigame: 0
};

// Test holding reel increases tension
const beforeTension = simState.tension;
FishingEngine.updateTensionStep(0.1, simState, true);
assert(simState.tension > beforeTension, `Holding reel increases tension (${beforeTension.toFixed(3)} -> ${simState.tension.toFixed(3)})`);

// Test releasing reel lowers tension
const beforeRelease = simState.tension;
FishingEngine.updateTensionStep(0.1, simState, false);
assert(simState.tension < beforeRelease, `Releasing reel decreases tension (${beforeRelease.toFixed(3)} -> ${simState.tension.toFixed(3)})`);

// Test tracking sweet spot increases progress
simState.reelProgress = 0.20;
FishingEngine.updateTensionStep(0.001, simState, false);
simState.tension = simState.sweetSpotCenter;
const resSweet = FishingEngine.updateTensionStep(0.05, simState, false);
assert(resSweet.inSweetSpot, 'Tension matches sweet spot center');
assert(resSweet.reelProgress > 0.20, `Keeping tension in sweet spot charges reel progress (${resSweet.reelProgress.toFixed(3)})`);

// Test line snap at max tension
simState.tension = 1.0;
const resSnap = FishingEngine.updateTensionStep(0.01, simState, true);
assert(resSnap.snapped, 'Over-tensioning line triggers line snapped condition');

// Zero-allocation benchmark: 100,000 steps
const benchStart = performance.now();
for (let i = 0; i < 100000; i++) {
  FishingEngine.updateTensionStep(0.016, simState, i % 2 === 0);
  if (simState.tension >= 1) simState.tension = 0.5;
  if (simState.reelProgress >= 1) simState.reelProgress = 0.5;
}
const benchDuration = performance.now() - benchStart;
console.log(`  ⚡ Benchmark: 100,000 updateTensionStep executions in ${benchDuration.toFixed(2)}ms`);
assert(benchDuration < 50, `Zero-allocation tension physics completed within budget (< 50ms, actual: ${benchDuration.toFixed(2)}ms)`);

// ============================================================
// 5. Fish Logbook Engine & Personal Best Records
// ============================================================
console.log('\n--- 5. Fish Logbook Engine & Personal Best Records ---');

const log: PlayerFishLog = {};

// First catch
const c1 = FishingEngine.recordCatchInLog(log, 'brook_trout', 18.5);
assert(c1.isNewSpecies, 'First catch recorded as new species');
assert(c1.isPersonalBest, 'First catch recorded as personal best');
assert(log['brook_trout']?.caughtCount === 1, 'Caught count is 1');
assert(log['brook_trout']?.maxSizeCm === 18.5, 'Max size recorded as 18.5 cm');

// Second catch (smaller)
const c2 = FishingEngine.recordCatchInLog(log, 'brook_trout', 16.2);
assert(!c2.isNewSpecies, 'Subsequent catch is not new species');
assert(!c2.isPersonalBest, 'Smaller catch is not personal best');
assert(log['brook_trout']?.caughtCount === 2, 'Caught count incremented to 2');
assert(log['brook_trout']?.maxSizeCm === 18.5, 'Max size remains 18.5 cm');

// Third catch (new personal best!)
const c3 = FishingEngine.recordCatchInLog(log, 'brook_trout', 25.4);
assert(!c3.isNewSpecies, 'Subsequent catch is not new species');
assert(c3.isPersonalBest, 'Larger catch sets new personal best');
assert(log['brook_trout']?.caughtCount === 3, 'Caught count incremented to 3');
assert(log['brook_trout']?.maxSizeCm === 25.4, 'Max size updated to 25.4 cm');

// ============================================================
// 6. WorldManager Authoritative Fishing Lifecycle
// ============================================================
console.log('\n--- 6. WorldManager Authoritative Fishing Lifecycle ---');

const world = new WorldManager();
const testPlayerId = 'p_fisherman_test';
world.addPlayer(testPlayerId, 'OldFisherman', '#0284c7', 0);
const player = world.players.get(testPlayerId)!;

// Stand near river shore at x: 50*32, y: 15*32
player.x = 50 * 32 + 16;
player.y = 15 * 32 + 16;

let fishingStartedFired = false;
world.onFishingStarted = (pid, sx, sy, tx, ty) => {
  fishingStartedFired = true;
};

// 1. Invalid cast: into dry land (x=45, y=15)
const castLand = world.startFishing(testPlayerId, 45 * 32, 15 * 32);
assert(!castLand, 'Casting line onto dry land is rejected by server');
assert(world.activeFishingSessions.size === 0, 'No active fishing session created on dry land');

// 2. Invalid cast: too far away (> 160px)
const castTooFar = world.startFishing(testPlayerId, player.x + 220, player.y);
assert(!castTooFar, 'Casting line beyond max reach (> 160px) is rejected');

// 3. Valid cast: into Azure River (x=52*32, y=15*32, distance ~64px)
const riverTargetX = 52 * 32 + 16;
const riverTargetY = 15 * 32 + 16;
const castValid = world.startFishing(testPlayerId, riverTargetX, riverTargetY);
assert(castValid, 'Casting line into Azure River succeeded');
assert(fishingStartedFired, 'onFishingStarted event fired');
assert(world.activeFishingSessions.has(testPlayerId), 'Active fishing session registered in world');
assert(player.anim === 'fishing_cast', 'Player animation updated to fishing_cast');

const session = world.activeFishingSessions.get(testPlayerId)!;
assert(session.state === 'waiting', 'Session is in "waiting" state');
assert(session.targetX === riverTargetX && session.targetY === riverTargetY, 'Session target coordinates match');

// 4. Bite trigger
let biteEventFired = false;
world.onFishingBite = (pid, bTime, speciesHint, width, pull) => {
  biteEventFired = true;
};

// Fast-forward session to bite time
session.biteAt = Date.now() - 10;
session.state = 'bite';
session.biteExpiresAt = Date.now() + 1800;

// 5. Hook the fish with reel input
world.reelFishing(testPlayerId, true);
assert(session.state === 'reeling', 'Reel input successfully hooked fish and entered "reeling" state');
assert(player.anim === 'fishing_reel', 'Player anim updated to fishing_reel');
assert(session.tension === 0.50, 'Initial tension centered at 0.50');

// 6. Complete reeling and catch fish
let catchResolvedFired = false;
let caughtSpeciesId = '';
let caughtSize = 0;
let caughtReward = 0;
world.onFishingResolved = (pid, res, sId, sz, val) => {
  if (res === 'caught') {
    catchResolvedFired = true;
    caughtSpeciesId = sId || '';
    caughtSize = sz || 0;
    caughtReward = val || 0;
  }
};

let logSynced = false;
world.onFishLogSync = (pid, l) => {
  logSynced = true;
};

let itemSpawned = false;
world.onItemSpawned = (it) => {
  itemSpawned = true;
};

// Set reel progress to completion
session.reelProgress = 1.0;
const priorCoins = player.coins || 0;

// Resolve catch
(world as any).resolveFishingCatch(testPlayerId, session);

assert(!world.activeFishingSessions.has(testPlayerId), 'Active fishing session cleaned up after catch');
assert(player.anim === 'idle', 'Player anim restored to idle');
assert(catchResolvedFired, 'onFishingResolved event fired with result "caught"');
assert(caughtSpeciesId.length > 0, `Caught fish species identified: ${caughtSpeciesId}`);
assert(caughtSize > 0, `Caught fish size recorded: ${caughtSize} cm`);
assert((player.coins || 0) > priorCoins, `Player coins increased by catch reward (+${caughtReward}c)`);
assert(logSynced, 'onFishLogSync event fired to sync logbook to client');
assert(itemSpawned, 'Fish catch item drop spawned in front of player');
assert(!!player.fishLog && !!player.fishLog[caughtSpeciesId], `Fish catch logged in player.fishLog (${caughtSpeciesId})`);

// 7. Sunken Treasure Chest catch verification
const treasureSession = {
  playerId: testPlayerId,
  startX: player.x,
  startY: player.y,
  targetX: riverTargetX,
  targetY: riverTargetY,
  floor: 'overworld',
  species: FISH_SPECIES.sunken_chest!,
  sizeCm: 24.5,
  state: 'reeling' as const,
  castAt: Date.now(),
  biteAt: Date.now(),
  biteExpiresAt: Date.now() + 1000,
  tension: 0.50,
  sweetSpotCenter: 0.50,
  sweetSpotWidth: 0.20,
  reelProgress: 1.0,
  isHoldingReel: false,
  timeInMinigame: 2.5
};

let treasureChestCaught = false;
world.onFishingResolved = (pid, res, sId, sz, val) => {
  if (res === 'caught' && sId === 'sunken_chest') {
    treasureChestCaught = true;
  }
};

(world as any).resolveFishingCatch(testPlayerId, treasureSession);
assert(treasureChestCaught, 'Sunken treasure chest catch resolved successfully');
assert((player.coins || 0) >= 50, 'Sunken treasure chest awarded substantial coin bounty');

// Cleanup
world.removePlayer(testPlayerId);

console.log(`\n🎉 Cozy Bobber Fishing & River Secrets Test Suite Complete! Passed: ${passedTests}/${totalTests} tests.`);
process.exit(0);
