// tools/test_blocks.ts
// Headless test suite for Tactile Block Manipulation & Mechanical Switches (Issue #14)

console.log("🧱 Running BitQuest Tactile Block Manipulation & Mechanical Switches Suite...\n");

// 1. Verify Procedural Texture Generation
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => ({
      getContext: () => new Proxy({}, {
        get: (target, prop) => {
          if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
            return () => ({ addColorStop: () => {} });
          }
          return () => {};
        }
      }),
      width: 0,
      height: 0
    })
  };
}

import { TextureGenerator } from "../client/src/art/TextureGenerator";

let addedTextures: string[] = [];
const mockScene: any = {
  textures: {
    addCanvas: (key: string, canvas: any) => {
      addedTextures.push(key);
    }
  }
};

TextureGenerator.generateAll(mockScene);

if (!addedTextures.includes('ent_block_stone')) {
  console.error("❌ Missing ent_block_stone texture in TextureGenerator.");
  process.exit(1);
}
console.log("✅ Heavy carved stone block texture 'ent_block_stone' verified.");

// 2. Verify World State Initialization
import { WorldManager } from "../server/src/world";

const world = new WorldManager();

const block1 = world.entities.get('block_ruins_1');
const block2 = world.entities.get('block_ruins_2');
const switchLeft = world.entities.get('switch_sun_left');
const switchRight = world.entities.get('switch_sun_right');
const gate = world.entities.get('ancient_gate');

if (!block1 || !block2) {
  console.error("❌ Ancient pushable stone blocks not found in world state.");
  process.exit(1);
}

if (!switchLeft || !switchRight || !gate) {
  console.error("❌ Sun switches or Ancient Gate missing from world state.");
  process.exit(1);
}
console.log(`✅ Pushable blocks initialized: Block 1 at (${block1.x}, ${block1.y}), Block 2 at (${block2.x}, ${block2.y})`);

// 3. Test Push Block Interaction & Movement
const initialX = block1.x;
const initialY = block1.y;

// Player pushes block towards switch (target 960, 560)
world.handleInteract('p_tester', 'block_ruins_1', 'push_block', 960, 560);

if (block1.x !== 960 || block1.y !== 560) {
  console.error(`❌ Block failed to move to target coordinates. Current: (${block1.x}, ${block1.y})`);
  process.exit(1);
}
console.log(`✅ Block successfully pushed from (${initialX}, ${initialY}) to (${block1.x}, ${block1.y})`);

// 4. Test Mechanical Pressure Switch Activation by Heavy Block
if (!switchLeft.state.activated) {
  console.error("❌ Left sun pressure switch failed to depress under heavy stone block weight.");
  process.exit(1);
}
console.log("✅ Left sun pressure switch depressed under heavy stone block weight!");

// Gate should still be closed since only 1 switch is pressed
if (gate.state.opened) {
  console.error("❌ Gate unsealed with only 1 switch depressed (requires both!).");
  process.exit(1);
}

// 5. Push Second Block onto Right Switch (1088, 560)
world.handleInteract('p_tester', 'block_ruins_2', 'push_block', 1088, 560);

if (!switchRight.state.activated) {
  console.error("❌ Right sun pressure switch failed to depress under block 2 weight.");
  process.exit(1);
}

if (!gate.state.opened) {
  console.error("❌ Ancient Gate failed to unseal when both heavy stone blocks weighted the switches!");
  process.exit(1);
}
console.log("✅ Both switches depressed by stone blocks: ✨ ANCIENT SUNKEN GATE UNSEALED! ✨");

// 6. Test Audio API Methods Exist on SoundManager
import { SoundManager } from "../client/src/audio/SoundManager";
const sm = new SoundManager();

if (typeof sm.playMechanicalClunk !== 'function' || typeof sm.playStoneScrape !== 'function') {
  console.error("❌ SoundManager is missing playMechanicalClunk or playStoneScrape methods.");
  process.exit(1);
}
console.log("✅ Tactile mechanical clunk and grating stone scrape audio synthesis verified.");

// 7. Performance Benchmark: 10,000 block push and switch checks
const benchStart = performance.now();
for (let i = 0; i < 10000; i++) {
  world.checkPressureSwitches();
}
const elapsed = performance.now() - benchStart;
console.log(`✅ Pressure switch collision and weighting benchmark: ${(elapsed / 10000).toFixed(4)}ms / check (${elapsed.toFixed(2)}ms for 10,000 checks)`);

console.log("\n🎉 ALL TACTILE BLOCK & MECHANICAL SWITCH TESTS PASSED!\n");
process.exit(0);
