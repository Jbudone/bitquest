// tools/test_alchemy_system.ts
// BitQuest Herbal Alchemy & Potion Brewing Laboratory Unit Tests
// Milestone 8: Cauldron brewing, herbal catalysts, potion consumables, and zero-allocation active buff manager

import {
  AlchemyEngine,
  ActivePotionManager,
  ALCHEMY_RECIPES,
  type AlchemyRecipe
} from '../shared/src/alchemy';

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

console.log('=== BITQUEST ALCHEMY & POTION BREWING TESTS ===\n');

// 1. Recipe Catalog Integrity
console.log('[1/4] Testing Recipe Catalog Integrity...');
assert(ALCHEMY_RECIPES.length === 5, `Registered 5 core alchemy recipes`);
for (const recipe of ALCHEMY_RECIPES) {
  assert(recipe.ingredients.length >= 2, `${recipe.name} requires at least 2 ingredients`);
  assert(recipe.resultItemId.startsWith('potion_'), `${recipe.name} results in a potion item (${recipe.resultItemId})`);
  assert(recipe.buff.durationSec > 0, `${recipe.name} specifies positive buff duration (${recipe.buff.durationSec}s)`);
}

// 2. Brewing Requirements & Ingredient Consumption
console.log('\n[2/4] Testing Brewing Requirements & Ingredient Consumption...');
const swiftRecipe = ALCHEMY_RECIPES.find(r => r.id === 'brew_swiftfoot')!;

// Empty inventory cannot brew
assert(!AlchemyEngine.canBrewRecipe(swiftRecipe, []), 'Empty inventory cannot brew Swiftfoot Draught');

// Partial inventory cannot brew
assert(!AlchemyEngine.canBrewRecipe(swiftRecipe, ['flora_sunbloom_petals']), 'Partial inventory (1/2 petals) cannot brew');

// Sufficient inventory can brew
const inv = ['flora_sunbloom_petals', 'flora_sunbloom_petals', 'flora_rain_lily_blossom', 'coin', 'coin'];
assert(AlchemyEngine.canBrewRecipe(swiftRecipe, inv), 'Inventory with all ingredients can brew');

const brewOk = AlchemyEngine.brewRecipe(swiftRecipe, inv);
assert(brewOk, 'Brewing execution succeeds');
assert(inv.includes('potion_swiftfoot'), 'Resulting potion is added to inventory');
assert(inv.filter(i => i === 'flora_sunbloom_petals').length === 0, 'Consumed 2x sunbloom petals');
assert(inv.filter(i => i === 'flora_rain_lily_blossom').length === 0, 'Consumed 1x rain lily');
assert(inv.filter(i => i === 'coin').length === 2, 'Unrelated items (coins) remain intact');

// 3. Active Potion Buffs & Aggregation
console.log('\n[3/4] Testing Active Potion Buffs & Aggregation...');
const potionMgr = new ActivePotionManager();

// Initial state
let totals = potionMgr.update(100);
assert(totals.speedMultiplier === 1.0, 'Initial speed multiplier is 1.0');
assert(totals.defenseBonus === 0, 'Initial defense bonus is 0');
assert(!totals.isInvulnerable, 'Initial state is not invulnerable');

// Consume Swiftfoot (+35% speed for 45s)
potionMgr.consumePotion(swiftRecipe, 100);
totals = potionMgr.update(100);
assert(totals.speedMultiplier === 1.35, 'Speed multiplier becomes 1.35 after Swiftfoot');

// Consume Ironbark (+2 defense for 60s)
const ironRecipe = ALCHEMY_RECIPES.find(r => r.id === 'brew_ironbark')!;
potionMgr.consumePotion(ironRecipe, 100);
totals = potionMgr.update(100);
assert(totals.speedMultiplier === 1.35, 'Speed multiplier preserved');
assert(totals.defenseBonus === 2, 'Defense bonus becomes 2 after Ironbark');

// Consume Vitality (+5s invulnerability)
const vitalRecipe = ALCHEMY_RECIPES.find(r => r.id === 'brew_vitality')!;
potionMgr.consumePotion(vitalRecipe, 100);
totals = potionMgr.update(100);
assert(totals.isInvulnerable, 'Invulnerable status active under Vitality Elixir');

// 4. Buff Expiration & Duration Refresh
console.log('\n[4/4] Testing Buff Expiration & Duration Refresh...');
// Advance past Vitality (at t=106, 6s elapsed)
totals = potionMgr.update(106);
assert(!totals.isInvulnerable, 'Invulnerability expired after 5s');
assert(totals.speedMultiplier === 1.35, 'Speed still active at 6s');
assert(totals.defenseBonus === 2, 'Defense still active at 6s');

// Advance past Swiftfoot (at t=146, 46s elapsed)
totals = potionMgr.update(146);
assert(totals.speedMultiplier === 1.0, 'Speed buff expired at 46s (> 45s)');
assert(totals.defenseBonus === 2, 'Defense still active at 46s (< 60s)');

// Re-consume Ironbark at t=150 to refresh duration to 150+60 = 210s
potionMgr.consumePotion(ironRecipe, 150);
assert(potionMgr.getActiveBuffs().length === 1, 'Re-consuming same potion replaces old instance');

// Advance to t=170 (would have expired if not refreshed)
totals = potionMgr.update(170);
assert(totals.defenseBonus === 2, 'Defense persists due to duration refresh');

// Advance to t=215 (expired)
totals = potionMgr.update(215);
assert(totals.defenseBonus === 0, 'Defense expired at t=215');
assert(potionMgr.getActiveBuffs().length === 0, 'Active buffs list is empty');

console.log('\n========================================');
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('========================================');

if (failCount > 0) {
  process.exit(1);
}
