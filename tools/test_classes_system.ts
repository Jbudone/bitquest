// tools/test_classes_system.ts
// BitQuest Headless Verification Suite: Class Archetypes System
// Issue #21: Task 7.3: Distinct playstyle kits: Warrior, Mage, Bard, Necromancer, Archer

import { 
  CLASS_DEFINITIONS, 
  ClassManager, 
  type CharacterClassId, 
  type ClassAbilityId 
} from '../shared/src/classes';
import { EquipmentManager, type AggregatedEquipmentStats } from '../shared/src/equipment';
import { StatusEffectManager } from '../shared/src/magic';
import { WorldManager } from '../server/src/world';
import { WorldDatabase } from '../server/src/db';
import type { PlayerData, EntityData } from '../shared/src/types';

console.log('⚔️ Running BitQuest Class Archetypes Test Suite (Issue #21)...\n');

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
// 1. Archetype Catalog & Definitions Integrity
// ============================================================
console.log('--- 1. Archetype Catalog & Definitions Integrity ---');

const expectedClasses: CharacterClassId[] = ['warrior', 'mage', 'bard', 'necromancer', 'archer'];
assert(Object.keys(CLASS_DEFINITIONS).length === 5, 'All 5 class archetypes are defined');

for (const classId of expectedClasses) {
  const def = CLASS_DEFINITIONS[classId];
  assert(!!def, `Class definition exists for '${classId}'`);
  assert(def.id === classId, `Class id matches key '${classId}'`);
  assert(typeof def.name === 'string' && def.name.length > 0, `${classId} has valid name: '${def.name}'`);
  assert(typeof def.title === 'string' && def.title.length > 0, `${classId} has valid title: '${def.title}'`);
  assert(typeof def.crestColor === 'string' && def.crestColor.startsWith('#'), `${classId} has valid crest color: '${def.crestColor}'`);
  assert(!!def.passivePerk && typeof def.passivePerk.name === 'string', `${classId} has valid passive perk: '${def.passivePerk?.name}'`);
  assert(!!def.abilities[0] && def.abilities[0].slot === 1, `${classId} has primary ability slot 1: '${def.abilities[0]?.name}'`);
  assert(!!def.abilities[1] && def.abilities[1].slot === 2, `${classId} has secondary ability slot 2: '${def.abilities[1]?.name}'`);
  assert(def.abilities[0].manaCost >= 0, `${classId} ability1 has valid mana cost ${def.abilities[0].manaCost}`);
  assert(def.abilities[1].manaCost >= 0, `${classId} ability2 has valid mana cost ${def.abilities[1].manaCost}`);
}

// ============================================================
// 2. Class Modifier In-Place Aggregation (Zero-Allocation)
// ============================================================
console.log('\n--- 2. Class Modifier Aggregation & Zero-Allocation ---');

// Fresh stats baseline
const inStats: AggregatedEquipmentStats = EquipmentManager.createDefaultStats();
const outStats: AggregatedEquipmentStats = EquipmentManager.createDefaultStats();

// Apply Warrior modifiers
ClassManager.applyClassModifiers('warrior', inStats, outStats);
assert(outStats.maxHealthBonus === 2, 'Warrior grants +2 maxHealthBonus');
assert(outStats.damageReductionPct === 0.20, 'Warrior grants 20% damageReductionPct');
assert(outStats.moveSpeedMultiplier === 0.95, 'Warrior has slight movement weight');

// Apply Mage modifiers
ClassManager.applyClassModifiers('mage', inStats, outStats);
assert(outStats.maxManaBonus === 30, 'Mage grants +30 maxManaBonus');
assert(outStats.manaCostReductionPct === 0.25, 'Mage grants 25% manaCostReductionPct');

// Apply Bard modifiers
ClassManager.applyClassModifiers('bard', inStats, outStats);
assert(outStats.moveSpeedMultiplier === 1.10, 'Bard grants +10% moveSpeedMultiplier');
assert(outStats.maxManaBonus === 10, 'Bard grants +10 maxManaBonus');

// Apply Necromancer modifiers
ClassManager.applyClassModifiers('necromancer', inStats, outStats);
assert(outStats.maxManaBonus === 20, 'Necromancer grants +20 maxManaBonus');
assert(outStats.damageReductionPct === 0.05, 'Necromancer grants +5% damageReductionPct');

// Apply Archer modifiers
ClassManager.applyClassModifiers('archer', inStats, outStats);
assert(outStats.critChance === 0.40, 'Archer grants +25% critChance (0.15 + 0.25 = 0.40)');
assert(outStats.moveSpeedMultiplier === 1.10, 'Archer grants +10% moveSpeedMultiplier');
assert(outStats.arrowSpeed === 440, 'Archer grants baseline 440 arrowSpeed');

// Benchmark zero-allocation loop (100,000 iterations without GC spike)
const startPerf = performance.now();
for (let i = 0; i < 100_000; i++) {
  ClassManager.applyClassModifiers('warrior', inStats, outStats);
}
const elapsed = performance.now() - startPerf;
console.log(`  ⚡ Benchmark: 100,000 ClassManager.applyClassModifiers executions in ${elapsed.toFixed(2)}ms`);
assert(elapsed < 200, `Benchmark completed within budget (< 200ms, actual: ${elapsed.toFixed(2)}ms)`);

// ============================================================
// 3. Database Persistence & World Setup
// ============================================================
console.log('\n--- 3. Database Persistence & Player Class Setup ---');

const db = new WorldDatabase();
const world = new WorldManager();

const testPlayerId = 'p_tester_classes_' + Date.now();
world.addPlayer(testPlayerId, 'Aiden', '#ffffff', 0);
let player = world.players.get(testPlayerId)!;
player.x = 500;
player.y = 500;
assert(!!player, 'Player successfully added to WorldManager');
assert(player.classId === 'warrior', 'Default player class is warrior');

// Switch class to Mage
world.handleSetClass(testPlayerId, 'mage');
player = world.players.get(testPlayerId)!;
assert(player.classId === 'mage', 'handleSetClass successfully switched player class to mage');

// Verify DB persistence
const dbRecord = world.db.getPlayerData(testPlayerId);
assert(dbRecord?.classId === 'mage', 'Player classId is persisted in Database');

// ============================================================
// 4. Class Ability Execution & Combat Mechanics
// ============================================================
console.log('\n--- 4. Class Ability Mechanics Verification ---');

// --- 4.1 Warrior Mechanics ---
console.log('-> Testing Warrior: shield_parry and stagger_cleave');
world.handleSetClass(testPlayerId, 'warrior');
player = world.players.get(testPlayerId)!;
player.mana = 50;

// Test shield_parry
let parryBroadcastReceived = false;
world.onParryEvent = (pId, tId, px, py) => {
  parryBroadcastReceived = true;
};
world.handleUseClassAbility(testPlayerId, 'shield_parry', player.x, player.y, 'right');
assert((player as any).parryUntil > Date.now(), 'shield_parry active: parryUntil timestamp set');
assert(player.mana === 40, 'shield_parry consumed 10 mana (50 -> 40)');

// Incoming hit while parrying
const enemyDummy: EntityData = {
  id: 'enemy_grunt_1',
  type: 'enemy',
  subtype: 'sproutling',
  x: player.x + 10,
  y: player.y,
  interactable: true,
  state: { hp: 4, maxHp: 4, destroyed: false }
};
world.entities.set(enemyDummy.id, enemyDummy);
world.spatialGrid.insert(enemyDummy);

const hpBeforeHurt = player.health;
world.handleInteract(testPlayerId, enemyDummy.id, 'player_hurt', undefined, undefined, 2);
assert(player.health === hpBeforeHurt, 'Warrior parry stance nullified incoming damage!');
assert(parryBroadcastReceived, 'Parry riposte event broadcast emitted');
assert(StatusEffectManager.updateEffects(enemyDummy.state).isStunned, 'Attacker was stunned by the riposte!');

// Test stagger_cleave
player.mana = 50;
enemyDummy.x = player.x + 20;
enemyDummy.y = player.y;
world.spatialGrid.update(enemyDummy);

world.handleUseClassAbility(testPlayerId, 'stagger_cleave', player.x, player.y, 'right');
assert(StatusEffectManager.updateEffects(enemyDummy.state).isStunned, 'stagger_cleave stunned the target enemy');
assert(enemyDummy.state.hp < 4, 'stagger_cleave damaged the enemy');
assert(player.mana === 35, 'stagger_cleave consumed 15 mana (50 -> 35)');

// --- 4.2 Mage Mechanics ---
console.log('\n-> Testing Mage: teleport_blink and arcane_nova');
world.handleSetClass(testPlayerId, 'mage');
player = world.players.get(testPlayerId)!;
player.x = 500;
player.y = 500;
player.mana = 50;

// Test teleport_blink
world.handleUseClassAbility(testPlayerId, 'teleport_blink', player.x, player.y, 'right');
assert(player.x === 596, `teleport_blink displaced player horizontally to right (500 -> ${player.x})`);
assert((player as any).invulnerableUntil > Date.now(), 'teleport_blink granted invulnerability frames');
assert(player.mana === 38, 'teleport_blink consumed 12 mana with 25% discount (50 -> 38)');

// Test arcane_nova
player.mana = 50;
enemyDummy.state.destroyed = false;
enemyDummy.state.hp = 6;
enemyDummy.x = player.x + 25;
enemyDummy.y = player.y + 10;
world.spatialGrid.update(enemyDummy);

world.handleUseClassAbility(testPlayerId, 'arcane_nova', player.x, player.y, 'right');
assert(enemyDummy.state.statusEffects?.freeze !== undefined, 'arcane_nova applied freeze status effect');
assert(player.mana === 32, 'arcane_nova consumed 18 mana with 25% discount (50 -> 32)');

// --- 4.3 Bard Mechanics ---
console.log('\n-> Testing Bard: speed_fanfare and harmony_chord');
world.handleSetClass(testPlayerId, 'bard');
player = world.players.get(testPlayerId)!;
player.mana = 50;

// Add a teammate player nearby
const teammateId = 'p_teammate_' + Date.now();
world.addPlayer(teammateId, 'Chloe', '#ffffff', 1);
const teammate = world.players.get(teammateId)!;
teammate.x = player.x + 30;
teammate.y = player.y + 20;
teammate.health = 2;
teammate.maxHealth = 5;

// Test speed_fanfare
world.handleUseClassAbility(testPlayerId, 'speed_fanfare', player.x, player.y, 'right');
assert((player as any).speedBoostUntil > Date.now(), 'speed_fanfare boosted caster speed');
assert((teammate as any).speedBoostUntil > Date.now(), 'speed_fanfare boosted nearby party member speed');
assert(player.mana === 38, 'speed_fanfare consumed 12 mana (50 -> 38)');

// Test harmony_chord
player.health = 2;
player.maxHealth = 4;
player.mana = 50;
teammate.health = 2;

world.handleUseClassAbility(testPlayerId, 'harmony_chord', player.x, player.y, 'right');
assert(player.health === 4, 'harmony_chord healed caster for +2 HP (2 -> 4)');
assert(teammate.health === 4, 'harmony_chord healed nearby teammate for +2 HP (2 -> 4)');
assert(player.mana === 30, 'harmony_chord consumed 20 mana (50 -> 30)');

// --- 4.4 Necromancer Mechanics ---
console.log('\n-> Testing Necromancer: raise_skeleton, life_siphon and Soul Harvest');
world.handleSetClass(testPlayerId, 'necromancer');
player = world.players.get(testPlayerId)!;
player.mana = 50;
player.health = 1;
player.maxHealth = 4;

let spawnedMinionId = '';
world.onMinionSpawned = (id, ownerId, mx, my, subtype) => {
  spawnedMinionId = id;
};

// Test raise_skeleton
world.handleUseClassAbility(testPlayerId, 'raise_skeleton', player.x, player.y, 'right');
assert(player.mana === 25, 'raise_skeleton consumed 25 mana (50 -> 25)');
assert(spawnedMinionId.length > 0, `Minion spawned with id '${spawnedMinionId}'`);

const minion = world.entities.get(spawnedMinionId);
assert(!!minion, 'Minion entity registered in world.entities');
assert(minion?.type === 'minion', "Minion has entity type 'minion'");
assert(minion?.state.ownerId === testPlayerId, 'Minion belongs to necromancer player');
assert(minion?.state.hp === 5, 'Minion has 5 HP');

// Test life_siphon
player.mana = 50;
enemyDummy.state.destroyed = false;
enemyDummy.state.hp = 6;
enemyDummy.x = player.x + 30;
enemyDummy.y = player.y;
world.spatialGrid.update(enemyDummy);

let siphonEventReceived = false;
world.onLifeSiphonEvent = (casterId, targetId, amt, hp) => {
  siphonEventReceived = true;
};

world.handleUseClassAbility(testPlayerId, 'life_siphon', player.x, player.y, 'right');
assert(siphonEventReceived, 'life_siphon broadcast event emitted');
assert(player.health === 3, 'life_siphon drained enemy and healed necromancer (1 -> 3 HP)');
assert(player.mana === 35, 'life_siphon consumed 15 mana (50 -> 35)');

// Test Soul Harvest perk (+2 HP, +10 MP on kill)
player.health = 2;
player.mana = 30;
enemyDummy.state.hp = 1;
world.handleInteract(testPlayerId, enemyDummy.id, 'hit_enemy', undefined, undefined, 5);
assert(enemyDummy.state.destroyed === true, 'Enemy destroyed by hit');
assert(player.health === 4, 'Soul Harvest passive restored +2 HP on kill (2 -> 4)');
assert(player.mana === 40, 'Soul Harvest passive restored +10 MP on kill (30 -> 40)');

// --- 4.5 Archer Mechanics ---
console.log('\n-> Testing Archer: piercing_arrow and evasive_backhop');
world.handleSetClass(testPlayerId, 'archer');
player = world.players.get(testPlayerId)!;
player.x = 500;
player.y = 500;
player.mana = 50;

// Setup 2 aligned enemies along shot path
const enemyLine1: EntityData = {
  id: 'enemy_line_1',
  type: 'enemy',
  subtype: 'sproutling',
  x: 550,
  y: 500,
  interactable: true,
  state: { hp: 5, maxHp: 5, destroyed: false }
};
const enemyLine2: EntityData = {
  id: 'enemy_line_2',
  type: 'enemy',
  subtype: 'sproutling',
  x: 620,
  y: 500,
  interactable: true,
  state: { hp: 5, maxHp: 5, destroyed: false }
};
world.entities.set(enemyLine1.id, enemyLine1);
world.entities.set(enemyLine2.id, enemyLine2);
world.spatialGrid.insert(enemyLine1);
world.spatialGrid.insert(enemyLine2);

// Test piercing_arrow
world.handleUseClassAbility(testPlayerId, 'piercing_arrow', player.x, player.y, 'right');
assert(enemyLine1.state.hp < 5, 'piercing_arrow damaged 1st aligned enemy');
assert(enemyLine2.state.hp < 5, 'piercing_arrow pierced through and damaged 2nd aligned enemy');
assert(enemyLine1.state.statusEffects?.freeze !== undefined, 'piercing_arrow chilled 1st enemy');
assert(enemyLine2.state.statusEffects?.freeze !== undefined, 'piercing_arrow chilled 2nd enemy');
assert(player.mana === 40, 'piercing_arrow consumed 10 mana (50 -> 40)');

// Test evasive_backhop
player.mana = 50;
player.x = 500;
player.y = 500;
world.handleUseClassAbility(testPlayerId, 'evasive_backhop', player.x, player.y, 'right');
assert(player.x === 424, `evasive_backhop hopped player backwards from 500 to ${player.x}`);
assert((player as any).invulnerableUntil > Date.now(), 'evasive_backhop granted evasive invulnerability');
assert(player.mana === 42, 'evasive_backhop consumed 8 mana (50 -> 42)');

// Cleanup test players and entities
world.removePlayer(testPlayerId);
world.removePlayer(teammateId);
world.entities.delete(enemyDummy.id);
world.entities.delete(enemyLine1.id);
world.entities.delete(enemyLine2.id);
if (spawnedMinionId) world.entities.delete(spawnedMinionId);

console.log(`\n🎉 Class Archetypes Test Suite Complete! Passed: ${passedTests}/${totalTests} tests.`);
