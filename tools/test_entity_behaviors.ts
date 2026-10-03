// tools/test_entity_behaviors.ts
// Headless test suite for Modular Entity-Behavior Architecture & Traits (Issue #50)

import { BehaviorRegistry } from '../shared/src/behaviors/registry';
import type { EntityData } from '../shared/src/types';

console.log("🧩 Running BitQuest Modular Entity-Behavior Architecture Suite...\n");

// 1. Verify Composable Trait Lookups
const testBush: EntityData = {
  id: 'bush_test',
  type: 'bush',
  x: 500,
  y: 500,
  interactable: true,
  state: { destroyed: false }
};

const testPot: EntityData = {
  id: 'pot_test',
  type: 'pot',
  x: 505,
  y: 500,
  interactable: true,
  state: { destroyed: false, heldBy: null }
};

const testSproutling: EntityData = {
  id: 'sprout_test',
  type: 'enemy',
  subtype: 'sproutling',
  x: 600,
  y: 600,
  interactable: true,
  state: { hp: 2, maxHp: 2, destroyed: false }
};

const bushInteractable = BehaviorRegistry.getInteractable(testBush);
const potInteractable = BehaviorRegistry.getInteractable(testPot);
const sproutHealth = BehaviorRegistry.getHealthPool(testSproutling);
const sproutHurtbox = BehaviorRegistry.getHurtbox(testSproutling);
const bushLoot = BehaviorRegistry.getLootTable(testBush);

if (!bushInteractable || !potInteractable || !sproutHealth || !sproutHurtbox || !bushLoot) {
  console.error("❌ Failed to resolve composable traits from BehaviorRegistry!");
  process.exit(1);
}
console.log("✅ Composable traits successfully registered and retrieved for all entity archetypes.");

// 2. Unified Spatial Query Pipeline & Interaction Prioritization
// Player at (500, 500): both pot (priority 100) and bush (priority 60) are within 48px
const nearbyEntities = [testBush, testPot];
const prioritized = BehaviorRegistry.getPrioritizedInteraction(500, 500, nearbyEntities, 48);

if (!prioritized || prioritized.entity.id !== 'pot_test') {
  console.error(`❌ Expected pot to take interaction priority over bush, got: ${prioritized?.entity.id}`);
  process.exit(1);
}
console.log(`✅ Interaction prioritization pipeline verified: Pot (priority ${potInteractable.priorityWeight}) won over Bush (priority ${bushInteractable.priorityWeight}).`);

// When pot is held/destroyed, priority naturally falls back to the bush
testPot.state.heldBy = 'player_1';
const fallback = BehaviorRegistry.getPrioritizedInteraction(500, 500, nearbyEntities, 48);

if (!fallback || fallback.entity.id !== 'bush_test') {
  console.error(`❌ Expected fallback to bush when pot is held, got: ${fallback?.entity.id}`);
  process.exit(1);
}
console.log("✅ Dynamic state filtering verified: Bush correctly prioritized when pot is unavailable.");

// 3. Decoupled Interaction Execution (No Hardcoded Switches)
const mockWorld: any = {
  checkPressureSwitchesCalled: false,
  checkPressureSwitches() {
    this.checkPressureSwitchesCalled = true;
  }
};

// Cut Bush interaction
const cutResult = BehaviorRegistry.handleInteraction(testBush, { playerId: 'player_1', action: 'cut' }, mockWorld);
if (!cutResult.handled || !testBush.state.destroyed || !cutResult.spawnItems || cutResult.spawnItems.length === 0) {
  console.error("❌ Cut Bush interaction failed to execute via trait!");
  process.exit(1);
}
console.log(`✅ Decoupled trait interaction: Bush cut successfully, spawned ${cutResult.spawnItems.length} loot drops.`);

// Push Block interaction
const testBlock: EntityData = {
  id: 'block_test',
  type: 'block',
  x: 920,
  y: 600,
  interactable: true,
  state: {}
};
const pushResult = BehaviorRegistry.handleInteraction(testBlock, { playerId: 'player_1', action: 'push_block', x: 960, y: 560 }, mockWorld);
if (!pushResult.handled || testBlock.x !== 960 || testBlock.y !== 560 || !mockWorld.checkPressureSwitchesCalled) {
  console.error("❌ Push Block interaction failed to update coordinates or notify world switches!");
  process.exit(1);
}
console.log("✅ Decoupled trait interaction: Heavy block pushed and pressure switches validated.");

// 4. HealthPool Trait & Stun Critical Damage
const testBoss: EntityData = {
  id: 'boss_test',
  type: 'boss',
  subtype: 'boss_baron',
  x: 1024,
  y: 280,
  interactable: true,
  state: { hp: 12, maxHp: 12, destroyed: false, stunnedUntil: Date.now() + 5000 }
};

const bossHealth = BehaviorRegistry.getHealthPool(testBoss)!;
// Normal damage is 1, but stunned boss receives +1 critical bonus = 2
const hurtResult = bossHealth.onHurt(testBoss, 1);

if (hurtResult.damageDealt !== 2 || testBoss.state.hp !== 10) {
  console.error(`❌ Boss HealthPool trait stun critical damage mismatch: expected 2 dmg, hp 10; got ${hurtResult.damageDealt} dmg, hp ${testBoss.state.hp}`);
  process.exit(1);
}
console.log(`✅ HealthPool trait verified: Stunned boss received critical damage (${hurtResult.damageDealt} dmg, remaining HP: ${testBoss.state.hp}).`);

console.log("\n🎉 ALL MODULAR ENTITY-BEHAVIOR ARCHITECTURE TESTS PASSED!\n");
