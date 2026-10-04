// tools/test_dungeon_floor3.ts
// Unit tests for Sunken Catacombs Floor 3 (The Abyssal Necropolis) & Arch-Lich Vespera

import {
  CATACOMBS_FLOORS,
  DUNGEON_CONSTANTS,
  VESPERA_SPECS,
  DungeonManager
} from '../shared/src/dungeon';

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

console.log('=== BITQUEST SUNKEN CATACOMBS FLOOR 3 & ARCH-LICH UNIT TESTS ===\n');

// 1. Floor 3 Metadata & Spatial Boundaries
console.log('[1/5] Testing Floor 3 Metadata & Atmospheric Boundaries...');
{
  const f3 = CATACOMBS_FLOORS.f3;
  assert(f3 !== undefined, 'Floor 3 metadata exists in catalog');
  assert(f3.id === 'f3', 'Floor ID is f3');
  assert(f3.subtitle.includes('Abyssal Necropolis'), 'Subtitle is Floor 3: The Abyssal Necropolis');
  assert(f3.ambientAlpha >= 0.90, 'Atmospheric darkness is at least 0.90 alpha');
  assert(f3.spawnY >= 5600, 'Spawn Y is located in Floor 3 zone (>= 5600)');
  assert(f3.cameraBounds.y >= 5600, 'Camera bounds enclose Floor 3 geometry');
}

// 2. Zone & Floor Identification
console.log('\n[2/5] Testing Vertical Dungeon Floor Classification...');
{
  assert(DungeonManager.getFloorFromY(400) === 'overworld', 'Y=400 identifies as Overworld');
  assert(DungeonManager.getFloorFromY(2400) === 'f1', 'Y=2400 identifies as Floor 1 (Forgotten Crypts)');
  assert(DungeonManager.getFloorFromY(4200) === 'f2', 'Y=4200 identifies as Floor 2 (Abyssal Sanctuary)');
  assert(DungeonManager.getFloorFromY(6000) === 'f3', 'Y=6000 identifies as Floor 3 (Abyssal Necropolis)');
  assert(DungeonManager.getFloorFromY(6900) === 'f3', 'Y=6900 identifies as Floor 3 Throne Room');
}

// 3. Void Chasm Hazard & Dual Moving Platforms
console.log('\n[3/5] Testing Floor 3 Void Chasm Hazard & Moving Platform Mechanics...');
{
  const chasm = DUNGEON_CONSTANTS.F3_VOID_CHASM;
  assert(DungeonManager.isInsideVoidChasm(1024, 6270), 'Center of void chasm correctly identified as lethal abyss');
  assert(!DungeonManager.isInsideVoidChasm(1024, 6000), 'North walkway is outside void chasm');
  assert(!DungeonManager.isInsideVoidChasm(1024, 6500), 'South walkway is outside void chasm');
  assert(!DungeonManager.isInsideVoidChasm(600, 6270), 'West solid rock is outside void chasm');

  // Dual Interlocking Platforms
  const platA = DUNGEON_CONSTANTS.F3_PLATFORM_A;
  const platB = DUNGEON_CONSTANTS.F3_PLATFORM_B;
  const posA = DungeonManager.getPlatformPosition(0, undefined, platA.minX, platA.maxX, platA.speed, platA.y);
  const posB = DungeonManager.getPlatformPosition(0, undefined, platB.minX, platB.maxX, platB.speed, platB.y);

  assert(posA.x >= platA.minX && posA.x <= platA.maxX, 'Platform A starts within horizontal bounds');
  assert(posB.x >= platB.minX && posB.x <= platB.maxX, 'Platform B starts within horizontal bounds');
  assert(DungeonManager.isOnMovingPlatform(posA.x, posA.y, posA.x, posA.y), 'Character on platform A is recognized as safe');
}

// 4. Arch-Lich Vespera Encounter Specifications
console.log('\n[4/5] Testing Arch-Lich Vespera Boss Encounter Specifications...');
{
  assert(VESPERA_SPECS.id === 'boss_vespera', 'Boss ID is boss_vespera');
  assert(VESPERA_SPECS.maxHp === 36, 'Arch-Lich has 36 maximum HP (higher than Malakor 24 HP)');
  assert(VESPERA_SPECS.phase1.voidOrbDamage >= 2, 'Phase 1 Void Orbs inflict >= 2 damage');
  assert(VESPERA_SPECS.phase1.teleportIntervalMs >= 5000, 'Phase 1 has tactical teleportation');

  assert(VESPERA_SPECS.phase2.thresholdHp === 18, 'Transitions to Phase 2 at 50% HP (18 HP)');
  assert(VESPERA_SPECS.phase2.pylonCount === 4, 'Phase 2 summons 4 Necrotic Soul Pylons');
  assert(VESPERA_SPECS.phase2.pylonHp === 6, 'Each pylon requires 6 HP damage to shatter');
  assert(VESPERA_SPECS.phase2.stunDurationMs >= 3000, 'Shattering all pylons stuns boss for at least 3 seconds');
  assert(VESPERA_SPECS.phase2.vulnerableDamageBonusPct === 0.50, 'Stunned boss receives +50% damage amplification');
}

// 5. Soul Pylon Coordinates & Royal Vault
console.log('\n[5/5] Testing Throne Room Pylons & Royal Vault Geometry...');
{
  const pylons = DUNGEON_CONSTANTS.F3_PYLONS;
  assert(pylons.length === 4, 'Exactly 4 cardinal necrotic soul pylons defined');
  assert(DUNGEON_CONSTANTS.F3_ROYAL_VAULT.id === 'chest_catacombs_royal_vault', 'Royal vault chest defined');
  assert(DUNGEON_CONSTANTS.F3_ROYAL_VAULT.y > DUNGEON_CONSTANTS.F3_BOSS_SPAWN.y, 'Royal vault sits behind Arch-Lich throne');
}

console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
