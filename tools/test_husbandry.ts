// tools/test_husbandry.ts
// BitQuest Cozy Animal Husbandry & Pet Sanctuary Unit Tests
// Milestone 7: Sanctuary pasture, affection hearts, favorite crop feeding, and animal produce

import {
  HusbandryEngine,
  SANCTUARY_ANIMALS,
  SANCTUARY_CONFIG,
  type SanctuaryAnimalDef,
  type SanctuaryAnimalState
} from '../shared/src/husbandry';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${msg}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

console.log('=== BITQUEST ANIMAL HUSBANDRY & PET SANCTUARY TESTS ===\n');

// 1. Sanctuary Roster & Pasture Configuration
console.log('[1/4] Testing Sanctuary Roster & Pasture Configuration...');
assert(SANCTUARY_ANIMALS.length === 4, `Sanctuary has 4 registered animals`);
assert(SANCTUARY_CONFIG.PASTURE.maxX > SANCTUARY_CONFIG.PASTURE.minX, `Pasture width is valid`);
assert(SANCTUARY_CONFIG.PASTURE.maxY > SANCTUARY_CONFIG.PASTURE.minY, `Pasture height is valid`);

for (const animal of SANCTUARY_ANIMALS) {
  assert(animal.favoriteFood.length > 0, `${animal.name} has a designated favorite food (${animal.favoriteFood})`);
  assert(
    animal.initialX >= SANCTUARY_CONFIG.PASTURE.minX && animal.initialX <= SANCTUARY_CONFIG.PASTURE.maxX,
    `${animal.name} starts inside pasture X bounds`
  );
  assert(
    animal.initialY >= SANCTUARY_CONFIG.PASTURE.minY && animal.initialY <= SANCTUARY_CONFIG.PASTURE.maxY,
    `${animal.name} starts inside pasture Y bounds`
  );
}

// 2. Affection Meter & Petting Mechanics
console.log('\n[2/4] Testing Affection Meter & Petting Mechanics...');
const sheepDef = SANCTUARY_ANIMALS.find(a => a.species === 'sheep')!;
const sheepState = HusbandryEngine.createInitialState(sheepDef);

assert(sheepState.affection === 25, 'Animal starts with 25 affection (1 heart)');
assert(HusbandryEngine.getAffectionHearts(sheepState.affection) === 1, '25 affection corresponds to 1 heart');

// First pet succeeds
const pet1 = HusbandryEngine.petAnimal(sheepState, 100);
assert(pet1.success, 'First pet succeeds');
assert(sheepState.affection === 30, 'Petting grants +5 affection (now 30)');

// Second pet within cooldown fails
const pet2 = HusbandryEngine.petAnimal(sheepState, 105);
assert(!pet2.success, 'Petting within 10s cooldown fails');
assert(sheepState.affection === 30, 'Affection unchanged during cooldown');

// Pet after cooldown succeeds
const pet3 = HusbandryEngine.petAnimal(sheepState, 112);
assert(pet3.success, 'Petting after 12s cooldown succeeds');
assert(sheepState.affection === 35, 'Affection increased to 35');

// 3. Crop Feeding & Favorite Foods
console.log('\n[3/4] Testing Crop Feeding & Favorite Foods...');
const cowDef = SANCTUARY_ANIMALS.find(a => a.species === 'cow')!;
const cowState = HusbandryEngine.createInitialState(cowDef);

// Feeding invalid food fails
const feedBad = HusbandryEngine.feedAnimal(cowDef, cowState, 'stone', 100);
assert(!feedBad.success, 'Feeding non-food item is rejected');

// Feeding secondary food
const prevAff = cowState.affection;
const feedSec = HusbandryEngine.feedAnimal(cowDef, cowState, 'crop_turnip', 100);
assert(feedSec.success && !feedSec.isFavorite, 'Feeding secondary food succeeds');
assert(cowState.affection === prevAff + SANCTUARY_CONFIG.FEED_NORMAL_AFFECTION, 'Secondary food awards normal affection (+6)');
assert(cowState.isEating, 'Animal enters eating state');

// Feeding favorite food
const feedFav = HusbandryEngine.feedAnimal(cowDef, cowState, 'crop_corn', 100);
assert(feedFav.success && feedFav.isFavorite, 'Feeding favorite food succeeds');
assert(cowState.produceReady, 'Favorite food instantly readies produce');

// 4. Produce Harvesting & Wandering
console.log('\n[4/4] Testing Produce Harvesting & Pasture Wandering...');
// Produce harvest from readied cow
const milkHarvest = HusbandryEngine.harvestAnimalProduce(cowDef, cowState, 100);
assert(milkHarvest !== null, 'Milk harvested successfully');
assert(milkHarvest?.itemId === 'material_fresh_milk', 'Produced item is highland cream milk');
assert(milkHarvest?.amount === 1, 'Base produce amount is 1');

// Immediate re-harvest fails
const milkHarvest2 = HusbandryEngine.harvestAnimalProduce(cowDef, cowState, 105);
assert(milkHarvest2 === null, 'Cannot re-harvest before produce interval');

// High affection bonus yield
sheepState.affection = 85; // 4 hearts
sheepState.produceReady = true;
const woolHarvest = HusbandryEngine.harvestAnimalProduce(sheepDef, sheepState, 200);
assert(woolHarvest?.amount === 2, 'High affection (>= 4 hearts) grants +1 bonus produce yield (2x)');

// Wander inside bounds
for (let i = 0; i < 50; i++) {
  HusbandryEngine.updateAnimalWander(sheepState, SANCTUARY_CONFIG.PASTURE, 0.1);
  assert(
    sheepState.x >= SANCTUARY_CONFIG.PASTURE.minX && sheepState.x <= SANCTUARY_CONFIG.PASTURE.maxX,
    `Wander position X (${sheepState.x.toFixed(1)}) strictly inside pasture bounds`
  );
  assert(
    sheepState.y >= SANCTUARY_CONFIG.PASTURE.minY && sheepState.y <= SANCTUARY_CONFIG.PASTURE.maxY,
    `Wander position Y (${sheepState.y.toFixed(1)}) strictly inside pasture bounds`
  );
}

console.log('\n========================================');
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('========================================');

if (failCount > 0) {
  process.exit(1);
}
