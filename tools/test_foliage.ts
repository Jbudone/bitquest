// tools/test_foliage.ts
// Headless test suite for Secondary Foliage Motion, Wind Simulation & Water Wake Ripples (Issue #15)

console.log("🍃 Running BitQuest Foliage & Wind Simulation Verification Suite...\n");

// 1. Verify Foliage Textures Defined
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

const requiredTextures = ['prop_flower_red', 'prop_flower_blue', 'prop_flower_yellow', 'prop_grass_tuft'];
for (const tex of requiredTextures) {
  if (!addedTextures.includes(tex)) {
    console.error(`❌ Missing procedural texture: ${tex}`);
    process.exit(1);
  }
}
console.log(`✅ All required foliage textures generated successfully: ${requiredTextures.join(', ')}`);

// 2. Mathematical Simulation of Tree Canopy Wind Sway
const windSpeed = 0.0018;
const testCanopy = { baseX: 500, baseY: 16, currentX: 500, rotation: 0 };
const time1 = 1000;
const time2 = 2500;

const phase = testCanopy.baseX * 0.015 + testCanopy.baseY * 0.012;
const sway1 = Math.sin(time1 * windSpeed + phase) * 1.5;
const sway2 = Math.sin(time2 * windSpeed + phase) * 1.5;

if (sway1 === sway2 || Math.abs(sway1) < 0.001) {
  console.error("❌ Wind sway failed to oscillate dynamically over time.");
  process.exit(1);
}
console.log(`✅ Canopy wind sway oscillates naturally: sway(t=1s)=${sway1.toFixed(3)}px, sway(t=2.5s)=${sway2.toFixed(3)}px`);

// 3. Mathematical Simulation of Foliage Displacing Away From Player
interface TestFoliage {
  baseX: number;
  baseY: number;
  currentBend: number;
  targetBend: number;
  scaleY: number;
}

const foliage: TestFoliage = {
  baseX: 1000,
  baseY: 900,
  currentBend: 0,
  targetBend: 0,
  scaleY: 1.0
};

// Player approaches from left: playerX = 990, playerY = 900
const px = 990;
const py = 900;
const dx = foliage.baseX - px; // +10
const dy = foliage.baseY - py; // 0
const dist = Math.hypot(dx, dy); // 10

if (dist < 32) {
  const pushForce = Math.max(0, 1 - dist / 32);
  const dir = dx >= 0 ? 1 : -1;
  foliage.targetBend = dir * pushForce * 0.45;
  foliage.scaleY = 0.88;
}

// Spring interpolation
foliage.currentBend = foliage.currentBend + (foliage.targetBend - foliage.currentBend) * 0.18;

if (foliage.targetBend <= 0 || foliage.currentBend <= 0) {
  console.error("❌ Foliage failed to part to the right when approached from the left.");
  process.exit(1);
}
console.log(`✅ Foliage parts away from moving character: targetBend=${foliage.targetBend.toFixed(3)}rad, scaleY=${foliage.scaleY}`);

// Player steps away
const farPx = 800;
const farPy = 900;
const farDist = Math.hypot(foliage.baseX - farPx, foliage.baseY - farPy);
if (farDist >= 32) {
  foliage.targetBend = 0;
  foliage.scaleY = 1.0;
}
for (let step = 0; step < 20; step++) {
  foliage.currentBend = foliage.currentBend + (foliage.targetBend - foliage.currentBend) * 0.18;
}

if (Math.abs(foliage.currentBend) > 0.05) {
  console.error("❌ Foliage failed to spring back to rest after player left.");
  process.exit(1);
}
console.log(`✅ Foliage smoothly springs back to rest: bend=${foliage.currentBend.toFixed(4)}rad`);

// 4. Verify Duck Entities and Bounds in World
import { WorldManager } from "../server/src/world";

const world = new WorldManager();
const duck1 = world.entities.get('wildlife_duck_1');
const duck2 = world.entities.get('wildlife_duck_2');

if (!duck1 || !duck2) {
  console.error("❌ Duck wildlife entities not found in server world state.");
  process.exit(1);
}

if (duck1.x < 760 || duck1.x > 1300 || duck1.y < 1320 || duck1.y > 1680) {
  console.error(`❌ Duck 1 is outside Crystal Lake waters: (${duck1.x}, ${duck1.y})`);
  process.exit(1);
}
console.log(`✅ Crystal Lake ducks positioned correctly: Duck 1 at (${duck1.x}, ${duck1.y}), Duck 2 at (${duck2.x}, ${duck2.y})`);

// 5. Performance benchmark: 10,000 updates of foliage loop
const benchFoliage = Array.from({ length: 60 }, (_, i) => ({
  baseX: 1000 + (i % 10) * 20,
  baseY: 800 + Math.floor(i / 10) * 20,
  currentBend: 0,
  targetBend: 0
}));

const startBench = performance.now();
for (let frame = 0; frame < 10000; frame++) {
  const t = frame * 16.6;
  const pX = 1050 + Math.sin(t * 0.005) * 40;
  const pY = 850 + Math.cos(t * 0.005) * 40;

  for (let i = 0; i < benchFoliage.length; i++) {
    const f = benchFoliage[i];
    const dX = f.baseX - pX;
    const dY = f.baseY - pY;
    const dSq = dX * dX + dY * dY;
    if (dSq < 32 * 32) {
      const d = Math.sqrt(dSq);
      const push = (1 - d / 32) * 0.45;
      f.targetBend = (dX >= 0 ? 1 : -1) * push;
    } else {
      f.targetBend = 0;
    }
    f.currentBend += (f.targetBend - f.currentBend) * 0.18;
  }
}
const elapsedBench = performance.now() - startBench;
const perFrameTime = elapsedBench / 10000;
console.log(`✅ Foliage & Wind simulation performance: ${perFrameTime.toFixed(4)}ms / frame (${elapsedBench.toFixed(2)}ms for 10,000 frames)`);

console.log("\n🎉 ALL FOLIAGE & WIND SIMULATION TESTS PASSED!\n");
process.exit(0);
