// tools/test_shop_system.ts
// BitQuest Headless Verification Suite: Pip's Oddities Shop, Wandering Traders & Economy
// Issue #25: Task 7.7

import { 
  ShopEngine, 
  SHOP_ITEMS, 
  MERCHANTS, 
  type ShopItem 
} from '../shared/src/shop';
import { WorldManager } from '../server/src/world';
import type { PlayerData } from '../shared/src/types';

console.log("🛍️ Running BitQuest Pip's Oddities Shop & Wandering Traders Test Suite (Issue #25)...\n");

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
// 1. Merchant Definitions & Catalogs
// ============================================================
console.log('--- 1. Merchant Definitions & Catalogs ---');

assert(!!MERCHANTS['merchant_pip'], 'Pip the Badger Merchant exists in registry');
assert(MERCHANTS['merchant_pip'].title === "Pip's Oddities & Curios", 'Pip has correct shop title');
assert(MERCHANTS['merchant_pip'].x === 1040 && MERCHANTS['merchant_pip'].y === 760, 'Pip is situated at Town Square (1040, 760)');
assert(MERCHANTS['merchant_pip'].baseWares.length > 5, `Pip has substantial base wares catalog (${MERCHANTS['merchant_pip'].baseWares.length} items)`);

assert(!!MERCHANTS['merchant_corvus'], 'Corvus the Nomad Merchant exists in registry');
assert(MERCHANTS['merchant_corvus'].title === 'Corvus the Wandering Nomad', 'Corvus has correct wanderer title');
assert(MERCHANTS['merchant_corvus'].isWandering === true, 'Corvus is marked as a wandering trader');
assert(MERCHANTS['merchant_corvus'].baseWares.length > 0, 'Corvus has specialized nomadic wares catalog');

// Verify categorized items in catalog
const categories = new Set(Object.values(SHOP_ITEMS).map(i => i.category));
assert(categories.has('consumable'), "Catalog includes 'consumable' category");
assert(categories.has('gear'), "Catalog includes 'gear' category");
assert(categories.has('vanity'), "Catalog includes 'vanity' category");
assert(categories.has('oddity'), "Catalog includes 'oddity' category");

// ============================================================
// 2. Circadian Stock Rotation (Day vs Night)
// ============================================================
console.log('\n--- 2. Circadian Stock Rotation (Day vs Night) ---');

// Noon (Daytime, 720s)
const dayWaresPip = ShopEngine.getActiveMerchantWares('merchant_pip', 720);
const dayIds = dayWaresPip.map(w => w.id);
assert(dayIds.includes('vanity_hat_wizard'), 'Pip sells Starlight Wizard Hat during daytime');
assert(dayIds.includes('relic_moonstone'), 'Pip sells Luminescent Moonstone during daytime');
assert(dayIds.includes('tome_arcane'), 'Pip sells Arcane Grimoire during daytime');
assert(!dayIds.includes('sword_broad_iron'), 'Pip does NOT sell Iron Cleaver Greatsword during daytime');
assert(!dayIds.includes('shield_iron'), 'Pip does NOT sell Iron Aegis during daytime');

// Midnight (Nighttime, 0s)
const nightWaresPip = ShopEngine.getActiveMerchantWares('merchant_pip', 0);
const nightIds = nightWaresPip.map(w => w.id);
assert(nightIds.includes('sword_broad_iron'), 'Pip sells Iron Cleaver Greatsword at night');
assert(nightIds.includes('shield_iron'), 'Pip sells Iron Aegis at night');
assert(nightIds.includes('relic_phoenix'), 'Pip sells Phoenix Talisman at night');
assert(!nightIds.includes('vanity_hat_wizard'), 'Pip does NOT sell Starlight Wizard Hat at night');
assert(!nightIds.includes('tome_arcane'), 'Pip does NOT sell Arcane Grimoire at night');

// Corvus day/night rotation
const corvusDay = ShopEngine.getActiveMerchantWares('merchant_corvus', 720).map(w => w.id);
const corvusNight = ShopEngine.getActiveMerchantWares('merchant_corvus', 0).map(w => w.id);
assert(corvusDay.includes('vanity_hood_ranger'), 'Corvus sells Woodland Ranger Hood during daytime');
assert(corvusDay.includes('quiver_ranger'), 'Corvus sells Quiver of the Wind during daytime');
assert(corvusNight.includes('vanity_midnight_cowl'), 'Corvus sells Shadow Nomad Cowl at night');
assert(corvusNight.includes('relic_phoenix'), 'Corvus sells Phoenix Talisman at night');

// ============================================================
// 3. Wandering Nomad Campsite Progression
// ============================================================
console.log('\n--- 3. Wandering Nomad Campsite Progression ---');

// Midnight / Night: 21:00 - 05:00 -> campfire_village (352, 448)
const midnightPos = ShopEngine.getWanderingTraderPosition(0);
assert(midnightPos.campfireId === 'campfire_village' && midnightPos.x === 352 && midnightPos.y === 448, 'Corvus camps at Village Hearth at midnight');

const nightPos = ShopEngine.getWanderingTraderPosition(1380); // 23:00 (1380s)
assert(nightPos.campfireId === 'campfire_village', 'Corvus camps at Village Hearth at 23:00');

// Dawn / Early Morning: 05:00 - 09:00 -> campfire_lake (1056, 1344)
const dawnPos = ShopEngine.getWanderingTraderPosition(360); // 6:00 (360s)
assert(dawnPos.campfireId === 'campfire_lake' && dawnPos.x === 1056 && dawnPos.y === 1344, 'Corvus wanders to Lakeside Pier at 06:00 AM');

// Midday: 09:00 - 17:00 -> campfire_meadow (1440, 768)
const middayPos = ShopEngine.getWanderingTraderPosition(720); // 12:00 PM (720s)
assert(middayPos.campfireId === 'campfire_meadow' && middayPos.x === 1440 && middayPos.y === 768, 'Corvus wanders to Meadow Crossroads at 12:00 PM');

// Dusk: 17:00 - 21:00 -> campfire_ruins (928, 224)
const duskPos = ShopEngine.getWanderingTraderPosition(1140); // 19:00 / 7:00 PM (1140s)
assert(duskPos.campfireId === 'campfire_ruins' && duskPos.x === 928 && duskPos.y === 224, 'Corvus wanders to Ancient Ruins at 07:00 PM');

// ============================================================
// 4. Affordability & Economics
// ============================================================
console.log('\n--- 4. Affordability & Economics ---');

const mockPlayer: PlayerData = {
  id: 'test_player',
  name: 'Alden',
  color: '#ffffff',
  palette: 0,
  x: 1024,
  y: 950,
  direction: 'down',
  anim: 'idle',
  health: 3,
  maxHealth: 3,
  mana: 50,
  maxMana: 50,
  coins: 20,
  acorns: 5,
  equipment: { weapon: null, shield: null, armor: null, accessory: null },
  vanity: { head: null, body: null },
  inventory: ['Wooden Practice Stick', 'Wild Strawberry Tart']
};

assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.consumable_strawberry_tart!, 1) === true, 'Player with 20 coins can afford 6 coin strawberry tart');
assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.consumable_strawberry_tart!, 3) === true, 'Player with 20 coins can afford 3 strawberry tarts (18 coins)');
assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.consumable_strawberry_tart!, 4) === false, 'Player with 20 coins cannot afford 4 strawberry tarts (24 coins)');
assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.sword_iron!, 1) === false, 'Player with 20 coins cannot afford 45 coin Knight Blade');

// Acorns currency check
assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.oddity_sunken_key!, 1) === false, 'Player with 5 acorns cannot afford 10 acorn sunken brass key');
mockPlayer.acorns = 15;
assert(ShopEngine.canAfford(mockPlayer, SHOP_ITEMS.oddity_sunken_key!, 1) === true, 'Player with 15 acorns can afford 10 acorn sunken brass key');

// ============================================================
// 5. Item Valuation & Sell Price Calculations
// ============================================================
console.log('\n--- 5. Item Valuation & Sell Price Calculations ---');

// Shop item direct match
const tartVal = ShopEngine.getItemSellValue('consumable_strawberry_tart');
assert(tartVal.currency === 'coin' && tartVal.amount === 3, 'Wild Strawberry Tart sells for 3 coins');

// Equipment match (50% value floor)
const ironSwordVal = ShopEngine.getItemSellValue('sword_iron');
assert(ironSwordVal.currency === 'coin' && ironSwordVal.amount === 22, `Knight Blade sells for 50% value (22 coins)`);

// Vanity match
const capeVal = ShopEngine.getItemSellValue('vanity_cape_hero');
assert(capeVal.currency === 'coin' && capeVal.amount === 30, 'Crimson Cape sells for 30 coins');

// Fish species match
const troutVal = ShopEngine.getItemSellValue('brook_trout');
assert(troutVal.currency === 'coin' && troutVal.amount === 10, 'Azure Brook Trout sells for fish base value (10 coins)');

// World resource / salvage match
const stickVal = ShopEngine.getItemSellValue('Wooden Practice Stick');
assert(stickVal.currency === 'coin' && stickVal.amount === 2, 'Wooden Practice Stick sells for 2 coins');

// ============================================================
// 6. Buy and Sell Authoritative Validation Logic
// ============================================================
console.log('\n--- 6. Buy and Sell Authoritative Validation Logic ---');

// Invalid quantity
const invalidQty = ShopEngine.validateBuy(mockPlayer, 'merchant_pip', 'consumable_strawberry_tart', -1, 720);
assert(!invalidQty.valid && invalidQty.reason === 'Invalid purchase quantity', 'Reject negative purchase quantity');

const floatQty = ShopEngine.validateBuy(mockPlayer, 'merchant_pip', 'consumable_strawberry_tart', 1.5, 720);
assert(!floatQty.valid && floatQty.reason === 'Invalid purchase quantity', 'Reject fractional purchase quantity');

// Out of stock ware (e.g. night ware requested during daytime)
const notInStock = ShopEngine.validateBuy(mockPlayer, 'merchant_pip', 'sword_broad_iron', 1, 720);
assert(!notInStock.valid && notInStock.reason === 'Item is not in current stock', 'Reject buy for item not in active circadian stock');

// In stock, but insufficient funds
mockPlayer.coins = 5;
const cannotAffordBuy = ShopEngine.validateBuy(mockPlayer, 'merchant_pip', 'consumable_strawberry_tart', 1, 720);
assert(!cannotAffordBuy.valid && cannotAffordBuy.reason?.includes('Insufficient coins'), 'Reject buy when player has insufficient coins');

// Valid buy
mockPlayer.coins = 50;
const validBuy = ShopEngine.validateBuy(mockPlayer, 'merchant_pip', 'consumable_strawberry_tart', 1, 720);
assert(validBuy.valid && validBuy.totalCost === 6, 'Approve valid buy with correct totalCost');

// Sell validation
const invalidSellIdx = ShopEngine.validateSell(mockPlayer, 99, 1);
assert(!invalidSellIdx.valid && invalidSellIdx.reason === 'Item not found in player inventory', 'Reject sell for out-of-range inventory index');

const validSell = ShopEngine.validateSell(mockPlayer, 0, 1);
assert(validSell.valid && validSell.currency === 'coin' && validSell.totalGain === 2, 'Approve sell of Wooden Practice Stick with 2 coins gain');

// ============================================================
// 7. Server WorldManager Authoritative Shop Integration
// ============================================================
console.log('\n--- 7. Server WorldManager Authoritative Shop Integration ---');

const world = new WorldManager();

// Track shop callbacks
let lastShopSync: any = null;
let lastTxResult: any = null;

world.onShopSync = (recipientId, merchantId, merchantName, merchantTitle, portrait, greeting, wares, playerCoins, playerAcorns, inventory) => {
  lastShopSync = { recipientId, merchantId, merchantName, merchantTitle, portrait, greeting, wares, playerCoins, playerAcorns, inventory };
};

world.onShopTransactionResult = (recipientId, success, message, newCoins, newAcorns, inventory, wares) => {
  lastTxResult = { recipientId, success, message, newCoins, newAcorns, inventory, wares };
};

// Add test player
const player = world.addPlayer('hero_1', 'BrambleHero', '#3b82f6', 1);
player.coins = 60;
player.acorns = 25;
player.inventory = ['Wooden Practice Stick'];

// Verify distance rejection when far away (> 120px)
player.x = 100;
player.y = 100;
world.openShop('hero_1', 'merchant_pip');
assert(lastShopSync === null, 'Reject openShop when player is out of interaction range (> 120px)');

// Position player in proximity to Pip (1040, 760)
player.x = 1040;
player.y = 780;

// Test 1: Open Pip's Shop
world.openShop('hero_1', 'merchant_pip');
assert(lastShopSync !== null, 'WorldManager dispatched shop sync packet');
assert(lastShopSync.recipientId === 'hero_1', 'Shop sync targeted correct recipient');
assert(lastShopSync.merchantId === 'merchant_pip', "Shop sync contains merchant_pip");
assert(lastShopSync.playerCoins === 60, 'Shop sync includes accurate player coins (60)');
assert(lastShopSync.playerAcorns === 25, 'Shop sync includes accurate player acorns (25)');
assert(lastShopSync.inventory.length === 1, 'Shop sync includes player inventory');
assert(lastShopSync.wares.length > 0, 'Shop sync includes populated wares');

// Test 2: Successful purchase with coins
lastTxResult = null;
world.buyShopItem('hero_1', 'merchant_pip', 'consumable_strawberry_tart', 2);
assert(lastTxResult !== null && lastTxResult.success === true, 'Successful purchase of 2 strawberry tarts');
assert(player.coins === 48, `Player coins deducted by 12 (60 - 12 = 48, actual: ${player.coins})`);
assert(player.inventory.includes('Wild Strawberry Tart'), 'Purchased item added to player inventory');
assert(player.inventory.length === 3, 'Inventory now holds 3 items (stick + 2 tarts)');

// Test 3: Insufficient funds purchase rejection
lastTxResult = null;
world.buyShopItem('hero_1', 'merchant_pip', 'relic_moonstone', 1); // costs 75 coins, player has 48
assert(lastTxResult !== null && lastTxResult.success === false, 'Rejected buy due to insufficient coins');
assert(player.coins === 48, 'Player coins unchanged after failed transaction');
assert(lastTxResult.message.includes('Insufficient coins'), 'Error message informs player of shortfall');

// Test 4: Selling an item
lastTxResult = null;
// Player inventory: ['Wooden Practice Stick', 'Wild Strawberry Tart', 'Wild Strawberry Tart']
world.sellShopItem('hero_1', 'merchant_pip', 0, 1);
assert(lastTxResult !== null && lastTxResult.success === true, 'Successfully sold Wooden Practice Stick');
assert(player.coins === 50, `Coins increased by 2 (48 + 2 = 50, actual: ${player.coins})`);
assert(!player.inventory.includes('Wooden Practice Stick'), 'Sold item removed from inventory');
assert(player.inventory.length === 2, 'Inventory reduced to 2 items');

// Test 5: Open Corvus Wandering Trader Shop & Buy with Acorns
// Corvus initial position is at (352, 448)
const corvusEntity = world.entities.get('merchant_corvus');
assert(corvusEntity !== null && corvusEntity !== undefined, 'Corvus entity exists in world manager');
player.x = corvusEntity.x;
player.y = corvusEntity.y + 20;

lastShopSync = null;
world.openShop('hero_1', 'merchant_corvus');
assert(lastShopSync !== null && lastShopSync.merchantId === 'merchant_corvus', 'Successfully opened Corvus wandering shop');

lastTxResult = null;
// Buy Nocturnal Swiftness Brew (costs 8 acorns)
world.buyShopItem('hero_1', 'merchant_corvus', 'consumable_shadow_draught', 1);
assert(lastTxResult !== null && lastTxResult.success === true, 'Successfully bought shadow draught with acorns');
assert(player.acorns === 17, `Acorns deducted by 8 (25 - 8 = 17, actual: ${player.acorns})`);
assert(player.inventory.includes('Nocturnal Swiftness Brew'), 'Nocturnal Swiftness Brew added to inventory');

// Test 6: Wandering Corvus movement update on circadian time shift
world.setTimeOfDay(0); // Midnight
const corvusEnt = world.entities.get('merchant_corvus');
assert(corvusEnt !== null && corvusEnt !== undefined, 'Corvus entity exists in world manager');
assert(corvusEnt.x === 352 && corvusEnt.y === 448, `Corvus moved to Village Hearth at midnight (actual: ${corvusEnt?.x}, ${corvusEnt?.y})`);

world.setTimeOfDay(12); // Midday (12:00 PM, hour 12)
assert(corvusEnt.x === 1440 && corvusEnt.y === 768, `Corvus moved to Meadow Crossroads at midday (actual: ${corvusEnt?.x}, ${corvusEnt?.y})`);

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
process.exit(0);
