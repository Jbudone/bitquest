// tools/test_cooking_system.ts
// Unit tests for BitQuest Cozy Campfire & Bakery Cooking Engine

import { CookingEngine, COOKING_RECIPES, type ActiveBuff } from '../shared/src/cooking';

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

console.log('=== BITQUEST COZY CAMPFIRE & BAKERY COOKING ENGINE UNIT TESTS ===\n');

// 1. Recipe Catalog Integrity
console.log('[1/5] Testing Recipe Catalog & Configuration...');
{
  const recipeKeys = Object.keys(COOKING_RECIPES);
  assert(recipeKeys.length >= 7, `Catalog contains ${recipeKeys.length} culinary recipes (expected >= 7)`);

  for (const [id, recipe] of Object.entries(COOKING_RECIPES)) {
    assert(recipe.id === id, `Recipe ID matches key: ${id}`);
    assert(recipe.ingredients.length > 0, `Recipe ${id} specifies ingredients`);
    assert(recipe.resultItemId.startsWith('dish_'), `Recipe ${id} yields valid dish item: ${recipe.resultItemId}`);
    assert(recipe.healAmount > 0, `Recipe ${id} restores health (${recipe.healAmount} HP)`);
    assert(recipe.cookingTimeMs >= 1000, `Recipe ${id} has cozy cooking duration (${recipe.cookingTimeMs}ms)`);
    if (recipe.buff) {
      assert(recipe.buff.durationSeconds >= 60, `Recipe ${id} buff lasts at least 60s (${recipe.buff.durationSeconds}s)`);
      assert(recipe.buff.value > 0, `Recipe ${id} buff has positive effect value (${recipe.buff.value})`);
    }
  }
}

// 2. Station & Ingredient Requirement Validation
console.log('\n[2/5] Testing Station Requirements & Ingredient Checks...');
{
  const inventory = ['fish_copper_minnow', 'crop_turnip', 'crop_turnip', 'acorn'];

  // Roasted minnow requires campfire
  assert(CookingEngine.canCook('recipe_roasted_minnow', inventory, 'campfire'), 'Can cook roasted minnow at campfire');
  assert(!CookingEngine.canCook('recipe_roasted_minnow', inventory, 'bakery_oven'), 'Cannot cook roasted minnow at bakery oven');
  assert(CookingEngine.canCook('recipe_roasted_minnow', inventory, 'any'), 'Can cook roasted minnow at generic station');

  // Turnip stew requires 2 turnips and 1 acorn
  assert(CookingEngine.canCook('recipe_turnip_stew', inventory, 'campfire'), 'Can cook turnip stew with exact ingredients');

  // Missing ingredients
  const partialInv = ['crop_turnip', 'acorn'];
  assert(!CookingEngine.canCook('recipe_turnip_stew', partialInv, 'campfire'), 'Rejects cooking turnip stew when missing 1 turnip');

  const missing = CookingEngine.getMissingIngredients('recipe_turnip_stew', partialInv);
  assert(missing.length === 1, 'Correctly reports 1 missing ingredient type');
  assert(missing[0].itemId === 'crop_turnip', 'Identifies missing crop_turnip');
  assert(missing[0].needed === 2 && missing[0].have === 1, 'Reports needed: 2, have: 1');
}

// 3. Ingredient Consumption & Crafting Execution
console.log('\n[3/5] Testing Cooking Crafting & Inventory Consumption...');
{
  const inventory = ['crop_turnip', 'sword_wood', 'crop_turnip', 'acorn', 'fish_copper_minnow'];
  const result = CookingEngine.cookRecipe('recipe_turnip_stew', inventory, 'campfire');

  assert(result.success, 'Successfully crafted Meadow Turnip Stew');
  assert(result.resultItemId === 'dish_turnip_stew', 'Result dish item ID is dish_turnip_stew');
  assert(result.resultCount === 1, 'Yielded 1 dish item');
  assert(result.remainingInventory.length === 3, 'Inventory decreased by 2 ingredients (5 -> 3 items)');
  assert(!result.remainingInventory.includes('crop_turnip'), 'Both turnips were consumed');
  assert(!result.remainingInventory.includes('acorn'), 'Acorn was consumed');
  assert(result.remainingInventory.includes('sword_wood'), 'Preserved unrelated weapon');
  assert(result.remainingInventory.includes('fish_copper_minnow'), 'Preserved unrelated fish');
  assert(result.remainingInventory.includes('dish_turnip_stew'), 'Result stew was added to inventory');
  assert(result.buff !== undefined && result.buff.type === 'defense', 'Returned defense buff metadata');
}

// 4. Active Buff Application & Refreshing
console.log('\n[4/5] Testing Active Buff Application & Overwriting...');
{
  let activeBuffs: ActiveBuff[] = [];
  const baseTime = 100000;

  const minnowRecipe = COOKING_RECIPES['recipe_roasted_minnow'];
  activeBuffs = CookingEngine.applyBuff(activeBuffs, minnowRecipe.buff!, minnowRecipe.id, baseTime);

  assert(activeBuffs.length === 1, 'Applied first buff (Speed)');
  assert(activeBuffs[0].type === 'speed', 'Active buff is speed type');
  assert(activeBuffs[0].expiresAt === baseTime + 60000, 'Expiration matches duration (base + 60s)');

  // Refresh speed buff with higher tier Berry Tart (1.25x speed, 120s)
  const tartRecipe = COOKING_RECIPES['recipe_berry_tart'];
  activeBuffs = CookingEngine.applyBuff(activeBuffs, tartRecipe.buff!, tartRecipe.id, baseTime + 10000);

  assert(activeBuffs.length === 1, 'Overwrote existing speed buff without duplicating entry');
  assert(activeBuffs[0].value === 1.25, 'Updated to higher speed buff multiplier (1.25x)');
  assert(activeBuffs[0].expiresAt === baseTime + 10000 + 120000, 'Updated expiration timestamp');

  // Add defense buff
  const stewRecipe = COOKING_RECIPES['recipe_turnip_stew'];
  activeBuffs = CookingEngine.applyBuff(activeBuffs, stewRecipe.buff!, stewRecipe.id, baseTime + 10000);
  assert(activeBuffs.length === 2, 'Different buff types stack (Speed + Defense)');
}

// 5. Stat Multipliers & Expiration Calculation
console.log('\n[5/5] Testing Aggregate Multipliers & Buff Expiration...');
{
  let activeBuffs: ActiveBuff[] = [];
  const baseTime = 200000;

  // Add Speed (1.25x, 10s duration)
  CookingEngine.applyBuff(activeBuffs, {
    type: 'speed',
    durationSeconds: 10,
    value: 1.25,
    label: 'Sprint',
    description: 'Swift',
    icon: '⚡'
  }, 'mock', baseTime);

  // Add Max HP (+4, 20s duration)
  CookingEngine.applyBuff(activeBuffs, {
    type: 'max_hp',
    durationSeconds: 20,
    value: 4,
    label: 'Vitality',
    description: 'Vitality',
    icon: '❤️'
  }, 'mock', baseTime);

  // Add Fishing Luck (+0.30 sweet spot, 30s duration)
  CookingEngine.applyBuff(activeBuffs, {
    type: 'fishing_luck',
    durationSeconds: 30,
    value: 0.30,
    label: 'Luck',
    description: 'Luck',
    icon: '🎣'
  }, 'mock', baseTime);

  // Initial calculation at baseTime + 5s (all buffs active)
  let calc = CookingEngine.updateAndCalculateBuffs(activeBuffs, baseTime + 5000);
  assert(calc.activeBuffs.length === 3, 'All 3 buffs active at +5s');
  assert(calc.totals.speedMultiplier === 1.25, 'Speed multiplier is 1.25x');
  assert(calc.totals.bonusMaxHp === 4, 'Bonus max HP is +4');
  assert(calc.totals.fishingSweetSpotBonus === 0.30, 'Fishing sweet spot bonus is +0.30');

  // Advance time past 10s (speed expires, max_hp and fishing luck remain)
  calc = CookingEngine.updateAndCalculateBuffs(activeBuffs, baseTime + 15000);
  assert(calc.activeBuffs.length === 2, 'Speed buff expired at +15s (2 remaining)');
  assert(calc.totals.speedMultiplier === 1.0, 'Speed reset to baseline 1.0x');
  assert(calc.totals.bonusMaxHp === 4, 'Bonus max HP remains +4');

  // Advance time past 35s (all expired)
  calc = CookingEngine.updateAndCalculateBuffs(activeBuffs, baseTime + 35000);
  assert(calc.activeBuffs.length === 0, 'All buffs expired at +35s');
  assert(calc.totals.speedMultiplier === 1.0, 'Baseline speed 1.0x');
  assert(calc.totals.bonusMaxHp === 0, 'Baseline bonus max HP 0');
  assert(calc.totals.fishingSweetSpotBonus === 0.0, 'Baseline fishing bonus 0.0');
}

console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
