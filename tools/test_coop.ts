import { WorldManager } from '../server/src/world';

console.log('🤝 Running BitQuest Multiplayer Social Synergy & Co-Op Interactivity Test...');

const world = new WorldManager();

// 1. Connect two simulated players
const p1 = world.addPlayer('p_alice', 'Alice', '#38bdf8', 0);
p1.x = 900;
p1.y = 900;

const p2 = world.addPlayer('p_bob', 'Bob', '#f43f5e', 1);
p2.x = 940;
p2.y = 900;

// Test 1: Social Resonance
let resonanceTriggered = false;
world.onSocialResonance = (p1Id, p2Id, emote, x, y) => {
  resonanceTriggered = true;
  console.log(`✅ 1. Social Resonance Triggered between ${p1Id} and ${p2Id} with emote "${emote}" at (${x}, ${y})!`);
};

world.setPlayerEmote('p_alice', 'wave');
world.setPlayerEmote('p_bob', 'cheer');

if (!resonanceTriggered) {
  console.error('❌ Social resonance did not fire!');
  process.exit(1);
}

// Test 2: Mid-Air Pot Catching
let potThrown = false;
let potCaught = false;

world.onPotThrown = (potId, throwerId, sx, sy, tx, ty, duration) => {
  potThrown = true;
  console.log(`✅ 2a. Pot "${potId}" thrown by ${throwerId} towards (${tx}, ${ty})`);
};

world.onPotCaught = (potId, catcherId, x, y) => {
  potCaught = true;
  console.log(`✅ 2b. Pot "${potId}" caught mid-air by ${catcherId} at (${x}, ${y})!`);
};

// Alice lifts pot_1
world.handleInteract('p_alice', 'pot_1', 'lift');
const pot1 = world.entities.get('pot_1');
if (pot1?.state.heldBy !== 'p_alice') {
  console.error('❌ Alice failed to lift pot_1');
  process.exit(1);
}

// Alice throws pot_1 towards Bob (Bob is at x: 940, y: 900)
world.throwPot('p_alice', 'pot_1', 900, 900, 940, 900);

if (!potThrown || !world.flyingPots.has('pot_1')) {
  console.error('❌ Pot throw failed');
  process.exit(1);
}

// Bob catches pot mid-air
const caught = world.catchPot('p_bob', 'pot_1');
if (!caught || !potCaught || pot1.state.heldBy !== 'p_bob') {
  console.error('❌ Bob failed to catch pot_1');
  process.exit(1);
}

// Test 3: Duo Ruined Vault Levers
p1.x = 880;
p1.y = 440;
p2.x = 1168;
p2.y = 440;

let vaultUnlocked = false;
world.onWorldFlagChanged = (key, val) => {
  if (key === 'duo_vault_unlocked' && val) {
    vaultUnlocked = true;
    console.log('✅ 3. Duo Levers pulled synchronously: Ancient Ruin Vault Chest UNLOCKED!');
  }
};

// Alice pulls left lever
world.handleLeverPull('p_alice', 'lever_duo_left');
const leverL = world.entities.get('lever_duo_left');
if (!leverL?.state.activated) {
  console.error('❌ Left lever failed to activate');
  process.exit(1);
}

// Bob pulls right lever within time window
world.handleLeverPull('p_bob', 'lever_duo_right');
const leverR = world.entities.get('lever_duo_right');
const chest = world.entities.get('chest_duo_vault');

if (!vaultUnlocked || !leverL.state.solved || !leverR.state.solved || chest?.state.locked) {
  console.error('❌ Duo lever co-op unlock failed');
  process.exit(1);
}

console.log('✨ All multiplayer social synergy and co-op systems 100% verified!');
process.exit(0);
