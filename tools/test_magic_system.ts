// tools/test_magic_system.ts
// Test suite for Issue #19 (Task 7.1: Skills & Active Magic System)

import { ManaPool, SPELL_DEFINITIONS, StatusEffectManager } from '../shared/src/magic';
import { WorldManager } from '../server/src/world';
import { PlayerData } from '../shared/src/types';

console.log("🔮 Running BitQuest Skills & Active Magic System Verification Suite...\n");

// 1. Mana Pool & Natural Regeneration Test
console.log("1. Testing Mana Pool & Natural Regeneration...");
const pool = new ManaPool(50, 50, 5); // 50 Max, 50 Current, 5 MP/sec

if (pool.current !== 50 || pool.max !== 50) {
  console.error(`❌ ManaPool initial state mismatch: current=${pool.current}, max=${pool.max}`);
  process.exit(1);
}

// Can cast fireball (cost 15)?
if (!pool.canCast('fireball')) {
  console.error("❌ ManaPool reported cannot cast fireball with 50 MP!");
  process.exit(1);
}

// Consume 15 MP at time t=1000
const baseTime = 1000;
const consumed = pool.consumeMana(15, baseTime);
if (!consumed || pool.current !== 35) {
  console.error(`❌ Mana consumption failed: consumed=${consumed}, current=${pool.current}`);
  process.exit(1);
}

// Attempt to regenerate at t=1500 (within 1000ms pause window after cast)
const pausedRegen = pool.updateRegen(500, baseTime + 500);
if (pausedRegen.changed || pool.current !== 35) {
  console.error(`❌ Mana regenerated during post-cast pause window! current=${pool.current}`);
  process.exit(1);
}

// Advance past pause window to t=2500 (1500ms later -> 1.5s * 5 MP/s = 7.5 MP -> total 42 MP)
const activeRegen = pool.updateRegen(1500, baseTime + 1500);
if (!activeRegen.changed || pool.current < 40) {
  console.error(`❌ Natural mana regeneration failed to advance: current=${pool.current}`);
  process.exit(1);
}

// Drain remaining mana
pool.consumeMana(pool.current, baseTime + 2000);
if (pool.canCast('fireball') || pool.canCast('ice_lance') || pool.canCast('gale_ward')) {
  console.error("❌ ManaPool allowed casting with 0 MP!");
  process.exit(1);
}

console.log(`✅ ManaPool capacity, consumption, post-cast pause, and natural regeneration verified (Current MP: ${pool.current}/${pool.max}).`);

// 2. Spell Definitions & Elemental Specs
console.log("\n2. Testing Spell Definitions & Elemental Specs...");
const fireball = SPELL_DEFINITIONS.fireball;
const iceLance = SPELL_DEFINITIONS.ice_lance;
const galeWard = SPELL_DEFINITIONS.gale_ward;

if (!fireball || fireball.manaCost !== 15 || fireball.baseDamage !== 2 || fireball.statusEffect?.type !== 'burn') {
  console.error("❌ Fireball spell definition mismatch!");
  process.exit(1);
}

if (!iceLance || iceLance.manaCost !== 12 || iceLance.baseDamage !== 1 || iceLance.statusEffect?.type !== 'freeze') {
  console.error("❌ Ice Lance spell definition mismatch!");
  process.exit(1);
}

if (!galeWard || galeWard.manaCost !== 20 || galeWard.aoeRadius !== 56 || galeWard.statusEffect?.type !== 'stun') {
  console.error("❌ Gale Ward spell definition mismatch!");
  process.exit(1);
}

console.log("✅ All 3 elemental spell definitions verified (Fireball, Ice Lance, Gale Ward).");

// 3. Status Effect Manager (Burn, Freeze, Stun)
console.log("\n3. Testing Elemental Status Effects...");
const mockEntityState: any = {};
const statusNow = 5000;

// Apply Freeze (60% slow for 3500ms)
StatusEffectManager.applyEffect(mockEntityState, 'freeze', 3500, statusNow, { speedMultiplier: 0.4 });
const freezeRes = StatusEffectManager.updateEffects(mockEntityState, statusNow);
if (freezeRes.isStunned || Math.abs(freezeRes.speedMultiplier - 0.4) > 0.01) {
  console.error(`❌ Freeze status calculation error: isStunned=${freezeRes.isStunned}, speedMultiplier=${freezeRes.speedMultiplier}`);
  process.exit(1);
}

// Apply Burn (1 dmg every 800ms for 3200ms)
StatusEffectManager.applyEffect(mockEntityState, 'burn', 3200, statusNow, { tickIntervalMs: 800, damagePerTick: 1 });
let burnDamageAccum = 0;
StatusEffectManager.updateEffects(mockEntityState, statusNow + 850, (dmg) => {
  burnDamageAccum += dmg;
});
if (burnDamageAccum !== 1) {
  console.error(`❌ Burn tick damage failed to fire: damage=${burnDamageAccum}`);
  process.exit(1);
}

// Apply Stun (incapacitate for 1200ms)
StatusEffectManager.applyEffect(mockEntityState, 'stun', 1200, statusNow);
const stunRes = StatusEffectManager.updateEffects(mockEntityState, statusNow + 100);
if (!stunRes.isStunned || stunRes.speedMultiplier !== 0.0) {
  console.error(`❌ Stun status failed to incapacitate entity: isStunned=${stunRes.isStunned}, speedMultiplier=${stunRes.speedMultiplier}`);
  process.exit(1);
}

// Advance time past stun expiration (statusNow + 1300ms)
const postStunRes = StatusEffectManager.updateEffects(mockEntityState, statusNow + 1300);
if (postStunRes.isStunned) {
  console.error("❌ Stun status did not expire after duration!");
  process.exit(1);
}
// Should still retain freeze slow until statusNow + 3500
if (Math.abs(postStunRes.speedMultiplier - 0.4) > 0.01) {
  console.error(`❌ Freeze slow did not persist after stun ended: speedMultiplier=${postStunRes.speedMultiplier}`);
  process.exit(1);
}

// Advance past all expirations (statusNow + 4000ms)
const clearRes = StatusEffectManager.updateEffects(mockEntityState, statusNow + 4000);
if (clearRes.activeCount !== 0 || clearRes.speedMultiplier !== 1.0) {
  console.error(`❌ Status effects did not cleanly expire: activeCount=${clearRes.activeCount}`);
  process.exit(1);
}
console.log("✅ Elemental status effects (Burn DOT, Freeze Slow, Stun Incapacitation & Expirations) verified.");

// 4. Server World Integration & Gale Ward Radial AOE
console.log("\n4. Testing Server Magic Integration & Gale Ward AOE...");
const world = new WorldManager();
const player = world.addPlayer('test_mage', 'Mage', '#38bdf8', 1);

let spellBroadcasted = false;
world.onSpellCast = (casterId, spellId) => {
  if (casterId === 'test_mage' && spellId === 'gale_ward') {
    spellBroadcasted = true;
  }
};

let statsUpdated = false;
world.onPlayerStatsUpdated = (p) => {
  if (p.id === 'test_mage' && p.mana === 30) {
    statsUpdated = true;
  }
};

// Spawn a nearby test enemy at (player.x + 30, player.y)
const enemyId = 'enemy_test_sprout';
world.entities.set(enemyId, {
  id: enemyId,
  type: 'enemy',
  subtype: 'sproutling',
  name: 'Sproutling',
  x: player.x + 30,
  y: player.y,
  interactable: true,
  state: { hp: 2, maxHp: 2, destroyed: false }
});

// Cast Gale Ward (costs 20 MP, radius 56px)
world.handleCastSpell('test_mage', 'gale_ward', player.x, player.y, 'right');

if (!spellBroadcasted) {
  console.error("❌ Server failed to broadcast spell_cast event!");
  process.exit(1);
}

if (!statsUpdated || player.mana !== 30) {
  console.error(`❌ Server failed to deduct mana: player.mana=${player.mana}`);
  process.exit(1);
}

const hitEnemy = world.entities.get(enemyId);
if (!hitEnemy || !StatusEffectManager.hasEffect(hitEnemy.state, 'stun')) {
  console.error("❌ Gale Ward radial AOE failed to stun nearby enemy!");
  process.exit(1);
}

// Enemy was pushed back
if (hitEnemy.x <= player.x + 30) {
  console.error(`❌ Gale Ward failed to push back enemy! hitEnemy.x=${hitEnemy.x}`);
  process.exit(1);
}
console.log(`✅ Server spell execution, mana deduction (50 -> 30 MP), and Gale Ward AOE pushback/stun verified.`);

console.log("\n✨ All Skills & Active Magic System tests passed flawlessly!\n");
process.exit(0);
