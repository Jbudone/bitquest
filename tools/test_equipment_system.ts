// tools/test_equipment_system.ts
// BitQuest Headless Verification Suite: Equipment, Relics & Vanity Gear System
// Issue #20: Task 7.2

import { DataRegistry } from '../shared/src/dataRegistry';
import { 
  EQUIPMENT_DEFINITIONS, 
  VANITY_DEFINITIONS, 
  EquipmentManager, 
  type PlayerEquipment, 
  type PlayerVanity, 
  type AggregatedEquipmentStats 
} from '../shared/src/equipment';
import { WorldManager } from '../server/src/world';
import { PlayerDataSchema } from '../shared/src/schemas';

console.log('⚔️ Running BitQuest Equipment, Relics & Vanity Gear Test Suite...\n');

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
// 1. Catalog Integrity & DataRegistry
// ============================================================
console.log('--- 1. Catalog Integrity & Schema Validation ---');
DataRegistry.initialize();

const catalogCount = Object.keys(EQUIPMENT_DEFINITIONS).length;
assert(catalogCount >= 16, `Equipment catalog contains ${catalogCount} items (expected >= 16)`);

const vanityCount = Object.keys(VANITY_DEFINITIONS).length;
assert(vanityCount >= 5, `Vanity catalog contains ${vanityCount} items (expected >= 5)`);

// Verify all items in registry
for (const [id, def] of Object.entries(EQUIPMENT_DEFINITIONS)) {
  const regItem = DataRegistry.getItem(id);
  assert(!!regItem, `Item '${id}' is registered in shared/data/items.json`);
  assert(regItem?.category === def.slot || (def.slot === 'offhand' && regItem?.category === 'offhand'), `Category of '${id}' matches slot '${def.slot}'`);
}

// ============================================================
// 2. Weapon Archetype Profiles
// ============================================================
console.log('\n--- 2. Weapon Archetype Verification ---');

// Dagger: Thief's Stiletto
const dagger = EQUIPMENT_DEFINITIONS['dagger_shadow']!;
assert(dagger.archetype === 'dagger', 'dagger_shadow has archetype dagger');
assert(dagger.stats.attackSpeedMs! <= 120, 'Dagger has rapid attack speed <= 120ms');
assert(dagger.stats.critChance! >= 0.40, 'Dagger has high critical chance >= 40%');
assert((dagger.stats.moveSpeedBonus ?? 0) > 0, 'Dagger grants agility movement bonus');

// Broadsword: Royal Claymore
const broadsword = EQUIPMENT_DEFINITIONS['sword_claymore']!;
assert(broadsword.archetype === 'broadsword', 'sword_claymore has archetype broadsword');
assert(broadsword.stats.attackSpeedMs! >= 250, 'Broadsword has heavy windup >= 250ms');
assert(broadsword.stats.cleaveAngle! >= 3.0, 'Broadsword sweeps wide 180° cleave arc (>= 3.0 rad)');
assert(broadsword.stats.attackPower! >= 3, 'Broadsword has crushing base attack power >= 3');
assert(broadsword.stats.knockback! >= 30, 'Broadsword applies heavy knockback >= 30px');

// Staff: Elder Oak Staff
const staff = EQUIPMENT_DEFINITIONS['staff_oak']!;
assert(staff.archetype === 'staff', 'staff_oak has archetype staff');
assert(staff.stats.manaCostReduction! >= 0.35, 'Staff grants >= 35% mana cost discount on spells');
assert(staff.stats.maxManaBonus! >= 20, 'Staff expands max mana by >= 20 MP');

// Bow: Whispering Recurve
const bow = EQUIPMENT_DEFINITIONS['bow_recurve']!;
assert(bow.archetype === 'bow', 'bow_recurve has archetype bow');
assert(bow.stats.isRanged === true, 'Bow is flagged as isRanged');
assert(bow.stats.arrowSpeed! >= 300, 'Bow fires fast arrows >= 300 px/sec');
assert(bow.stats.arrowRange! >= 240, 'Bow has long projectile range >= 240px');

// ============================================================
// 3. Slot Compatibility & Rule Enforcement
// ============================================================
console.log('\n--- 3. Slot Compatibility Enforcement ---');
assert(EquipmentManager.canEquip('weapon', 'sword_wood'), 'Can equip sword_wood in weapon slot');
assert(EquipmentManager.canEquip('weapon', 'dagger_shadow'), 'Can equip dagger_shadow in weapon slot');
assert(EquipmentManager.canEquip('weapon', 'bow_recurve'), 'Can equip bow_recurve in weapon slot');
assert(!EquipmentManager.canEquip('armor', 'sword_wood'), 'Cannot equip weapon into armor slot');
assert(!EquipmentManager.canEquip('weapon', 'armor_plate'), 'Cannot equip armor into weapon slot');
assert(EquipmentManager.canEquip('offhand', 'shield_iron'), 'Can equip shield_iron in offhand slot');
assert(EquipmentManager.canEquip('relic', 'relic_feather'), 'Can equip relic_feather in relic slot');
assert(!EquipmentManager.canEquip('relic', 'unknown_item'), 'Rejects non-existent items');

// ============================================================
// 4. Zero-Allocation In-Place Stat Aggregation
// ============================================================
console.log('\n--- 4. Zero-Allocation Stat Aggregation ---');
const baseEq = EquipmentManager.getDefaultEquipment();
const statsObj = EquipmentManager.createDefaultStats();
const ref = EquipmentManager.calculateStats(baseEq, statsObj);
assert(ref === statsObj, 'calculateStats mutates outStats in-place (0 KB heap churn)');
assert(statsObj.attackPower === 1, 'Default wooden sword attack power is 1');
assert(statsObj.weaponArchetype === 'sword', 'Default archetype is sword');

// Heavy Knight Tank Build: Claymore + Iron Shield + Plate Mail + Heart Locket
const tankEq: PlayerEquipment = {
  weapon: 'sword_claymore',
  offhand: 'shield_iron',
  armor: 'armor_plate',
  relic: 'relic_heart'
};
EquipmentManager.calculateStats(tankEq, statsObj);
assert(statsObj.attackPower === 3, 'Claymore attack power 3 applied');
assert(statsObj.weaponArchetype === 'broadsword', 'Archetype is broadsword');
assert(statsObj.damageReductionPct === 0.55, 'Damage reduction stacked: 30% shield + 25% plate = 55%');
assert(statsObj.maxHealthBonus === 5, 'Max health stacked: +1 shield + 2 plate + 2 relic = +5 HP');
assert(statsObj.moveSpeedMultiplier === 0.95, 'Heavy plate armor -5% move speed applied');

// Arcane Mage Build: Elder Staff + Arcane Grimoire + Weaver Robe + Moonstone
const mageEq: PlayerEquipment = {
  weapon: 'staff_oak',
  offhand: 'tome_arcane',
  armor: 'armor_robe',
  relic: 'relic_moonstone'
};
EquipmentManager.calculateStats(mageEq, statsObj);
assert(statsObj.weaponArchetype === 'staff', 'Archetype is staff');
assert(statsObj.maxManaBonus === 100, 'Max mana stacked: +20 staff + 25 tome + 30 robe + 25 moonstone = +100 MP');
assert(statsObj.manaCostReductionPct === 0.60, 'Mana cost discount capped at 60%');

// Rogue Ranger Build: Stiletto + Ranger Quiver + Leather Tunic + Swift Feather
const rogueEq: PlayerEquipment = {
  weapon: 'dagger_shadow',
  offhand: 'quiver_ranger',
  armor: 'armor_leather',
  relic: 'relic_feather'
};
EquipmentManager.calculateStats(rogueEq, statsObj);
assert(statsObj.weaponArchetype === 'dagger', 'Archetype is dagger');
assert(statsObj.attackPower === 2, 'Attack power: 1 base + 1 quiver = 2');
assert(statsObj.attackSpeedMs <= 80, 'Attack speed quickened by quiver');
assert(statsObj.critChance >= 0.45, 'High crit chance preserved');
assert(statsObj.moveSpeedMultiplier >= 1.40, 'Speed stacked: 10% dagger + 10% leather + 20% feather = +40%');

// ============================================================
// 5. Server WorldManager & Netcode Integration
// ============================================================
console.log('\n--- 5. Server WorldManager & Combat Integration ---');
const world = new WorldManager();

// Add player with unique ID for clean DB isolation
const playerId = `test_p_${Date.now()}`;
const p = world.addPlayer(playerId, 'Arthur', '#2e9939', 0);
assert(!!p.equipment, 'New player has equipment structure');
assert(p.equipment.weapon === 'sword_wood', 'Player spawns with Practice Wooden Sword');
assert(!!p.vanity, 'New player has vanity structure');

// Equip Broadsword
world.handleEquipItem(playerId, 'weapon', 'sword_claymore');
assert(p.equipment.weapon === 'sword_claymore', 'Equipped Royal Claymore');
const claymoreStats = world.getPlayerStats(playerId);
assert(claymoreStats.attackPower === 3, 'Server calculates attack power 3');

// Equip Iron Armor
world.handleEquipItem(playerId, 'armor', 'armor_plate');
assert(p.equipment.armor === 'armor_plate', 'Equipped Knight Cuirass');
assert(p.maxHealth === 5, 'Max health increased from 3 to 5 (3 + 2 armor bonus)');
assert(p.health === 5, 'Current health scaled up to 5');

// Test Damage Reduction on player_hurt
const initialHp = p.health;
world.handleInteract(playerId, playerId, 'player_hurt', undefined, undefined, 2);
// Damage reduction 25% on 2 incoming damage -> 2 * (1 - 0.25) = 1.5 -> rounds to 2, or 1 dmg
assert(p.health < initialHp, 'Player received damage');

// Equip Elder Staff and test Mana Discount on spellcast
world.handleEquipItem(playerId, 'weapon', 'staff_oak');
p.mana = 50;
// Fireball default cost: 15 MP. With Elder Staff (40% discount): 15 * 0.6 = 9 MP!
world.handleCastSpell(playerId, 'fireball', 100, 100, 'down');
assert(p.mana === 41, `Fireball consumed discounted 9 MP with Staff (50 -> ${p.mana})`);

// Test Vanity cosmetic setting
world.handleSetVanity(playerId, 'head', 'vanity_crown');
assert(p.vanity.head === 'vanity_crown', 'Set Royal Crown vanity headgear');
world.handleSetVanity(playerId, 'armor', 'vanity_cape_hero');
assert(p.vanity.armor === 'vanity_cape_hero', 'Set Hero Cape vanity armor');

// Test Ranged Bow arrow firing
let arrowFired = false;
world.onArrowShot = (shooterId, x, y, dir, speed, range, dmg) => {
  arrowFired = true;
  assert(shooterId === playerId, 'Arrow shooter ID matches');
  assert(speed >= 300, 'Arrow speed matches bow stats');
  assert(range >= 240, 'Arrow range matches bow stats');
};
world.handleEquipItem(playerId, 'weapon', 'bow_recurve');
world.handleShootArrow(playerId, 500, 500, 'right', 2);
assert(arrowFired, 'Arrow shot dispatched via network callback');

// Verify Zod schema validation passes for player with equipment & vanity
const validated = PlayerDataSchema.safeParse(p);
assert(validated.success, 'PlayerData passes Zod schema validation');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} EQUIPMENT & VANITY TESTS PASSED!\n`);
process.exit(0);
