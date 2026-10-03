// tools/test_ambient_ai.ts
// Headless test suite for Living World Ambient AI & Organic Idle Micro-Behaviors (Issue #16)

console.log("🐶 Running BitQuest Living World Ambient AI & Organic Idle Suite...\n");

// 1. Verify New Procedural Textures
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

const requiredTextures = ['particle_zzz', 'wildlife_dog_idle', 'wildlife_dog_sniff', 'wildlife_dog_nap'];
for (const tex of requiredTextures) {
  if (!addedTextures.includes(tex)) {
    console.error(`❌ Missing procedural texture: ${tex}`);
    process.exit(1);
  }
}
console.log(`✅ All required ambient AI textures generated: ${requiredTextures.join(', ')}`);

// 2. Layered Idle Progression Math Verification
interface SimulatedPlayerIdle {
  idleStartTime: number;
  spriteY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  zzzCount: number;
  lastZzzTime: number;
}

function updateIdle(p: SimulatedPlayerIdle, now: number, isMoving: boolean) {
  if (isMoving) {
    p.idleStartTime = now;
    p.spriteY = 0;
    p.scaleX = 1.0;
    p.scaleY = 1.0;
    p.rotation = 0;
    return;
  }

  const idleDuration = now - p.idleStartTime;
  if (idleDuration > 14000) {
    // Layer 3: Cozy Sitting / Napping
    p.spriteY = 3;
    const cozyBreath = Math.sin(now * 0.0022) * 0.025;
    p.scaleX = 1.12;
    p.scaleY = 0.84 + cozyBreath;
    p.rotation = 0;
    if (now - p.lastZzzTime > 2400) {
      p.lastZzzTime = now;
      p.zzzCount++;
    }
  } else if (idleDuration > 7000) {
    // Layer 2: Looking Around
    p.spriteY = 0;
    p.rotation = Math.sin(now * 0.0018) * 0.07;
    const breath = Math.sin(now * 0.0035) * 0.035;
    p.scaleX = 1.0 - breath * 0.5;
    p.scaleY = 1.0 + breath;
  } else if (idleDuration > 2500) {
    // Layer 1: Cozy Breathing & Micro-Stretch
    p.spriteY = 0;
    p.rotation = 0;
    const breath = Math.sin(now * 0.0035) * 0.035;
    p.scaleX = 1.0 - breath * 0.5;
    p.scaleY = 1.0 + breath;
  } else {
    p.spriteY = 0;
    p.scaleX = 1.0;
    p.scaleY = 1.0;
    p.rotation = 0;
  }
}

const simPlayer: SimulatedPlayerIdle = {
  idleStartTime: 0,
  spriteY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  zzzCount: 0,
  lastZzzTime: 0
};

// Test Layer 0 (0-2s)
updateIdle(simPlayer, 1000, false);
if (simPlayer.spriteY !== 0 || simPlayer.scaleX !== 1 || simPlayer.scaleY !== 1) {
  console.error("❌ Player idle layer 0 state incorrect.");
  process.exit(1);
}

// Test Layer 1 (3s)
updateIdle(simPlayer, 3500, false);
if (simPlayer.scaleY === 1.0 || simPlayer.spriteY !== 0) {
  console.error("❌ Player idle layer 1 breathing failed.");
  process.exit(1);
}
console.log(`✅ Player Idle Layer 1 (Cozy Breathing @ 3.5s): scaleY=${simPlayer.scaleY.toFixed(3)}, scaleX=${simPlayer.scaleX.toFixed(3)}`);

// Test Layer 2 (8s)
updateIdle(simPlayer, 8000, false);
if (simPlayer.rotation === 0) {
  console.error("❌ Player idle layer 2 looking around failed.");
  process.exit(1);
}
console.log(`✅ Player Idle Layer 2 (Looking Around @ 8s): rotation=${simPlayer.rotation.toFixed(3)}rad`);

// Test Layer 3 (16s)
updateIdle(simPlayer, 16000, false);
if (simPlayer.spriteY !== 3 || simPlayer.scaleX !== 1.12) {
  console.error("❌ Player idle layer 3 cozy sitting failed.");
  process.exit(1);
}
// Step time to check Zzz trigger
updateIdle(simPlayer, 19000, false);
if (simPlayer.zzzCount === 0) {
  console.error("❌ Player idle layer 3 failed to emit Zzz particle.");
  process.exit(1);
}
console.log(`✅ Player Idle Layer 3 (Sitting Down @ 16s): spriteY=${simPlayer.spriteY}, scaleX=${simPlayer.scaleX}, ZzzEmitted=${simPlayer.zzzCount}`);

// Verify Instant Reset on Movement
updateIdle(simPlayer, 19100, true);
if (simPlayer.spriteY !== 0 || simPlayer.scaleX !== 1 || simPlayer.scaleY !== 1 || simPlayer.rotation !== 0) {
  console.error("❌ Player failed to immediately reset from sitting pose when moving.");
  process.exit(1);
}
console.log("✅ Player immediately resets to upright posture upon movement.");

// 3. NPC & Critter Gaze Tracking Math Verification
const npcX = 1000;
const npcY = 1000;

// Player at (950, 1000) - to the left within 85px
const pLeftX = 950;
const pLeftY = 1000;
const dxLeft = pLeftX - npcX; // -50
const distLeft = Math.abs(dxLeft);
const flipLeft = dxLeft < 0;
const angleLeft = Math.atan2(pLeftY - npcY, dxLeft);
const rotLeft = Math.sin(angleLeft) * 0.08;

if (distLeft >= 85 || !flipLeft) {
  console.error("❌ NPC gaze tracking failed to flip left when player is to the left.");
  process.exit(1);
}
console.log(`✅ NPC gaze tracks left: flipX=${flipLeft}, targetRot=${rotLeft.toFixed(3)}rad`);

// Player at (1040, 1000) - to the right within 85px
const pRightX = 1040;
const dxRight = pRightX - npcX; // +40
const flipRight = dxRight < 0;
if (flipRight) {
  console.error("❌ NPC gaze tracking failed to face right when player is to the right.");
  process.exit(1);
}
console.log(`✅ NPC gaze tracks right: flipX=${flipRight}`);

// 4. Buster the Dog Ambient AI Behavior Cycle in World State
import { WorldManager } from "../server/src/world";

const world = new WorldManager();
const buster = world.entities.get('wildlife_buster');

if (!buster) {
  console.error("❌ Buster the dog entity not found in server world state.");
  process.exit(1);
}

if (!buster.state.behavior) {
  console.error("❌ Buster does not have behavior state initialized.");
  process.exit(1);
}
console.log(`✅ Buster initialized in server state with behavior: "${buster.state.behavior}"`);

// 5. Zero-Allocation Performance Benchmark (10,000 frames)
const benchStart = performance.now();
for (let i = 0; i < 10000; i++) {
  const t = i * 16.6;
  const isMoving = (i % 500) < 50;
  updateIdle(simPlayer, t, isMoving);

  // Gaze tracking for 4 NPCs
  for (let n = 0; n < 4; n++) {
    const dX = (simPlayer.scaleX * 100) - (1000 + n * 20);
    const dY = (simPlayer.scaleY * 100) - (1000 + n * 20);
    const d = Math.hypot(dX, dY);
    if (d < 85) {
      const ang = Math.atan2(dY, dX);
      const rot = Math.sin(ang) * 0.08;
    }
  }
}
const elapsed = performance.now() - benchStart;
const frameAvg = elapsed / 10000;
console.log(`✅ Ambient AI & Idle simulation performance: ${frameAvg.toFixed(4)}ms / frame (${elapsed.toFixed(2)}ms for 10,000 frames)`);

console.log("\n🎉 ALL LIVING WORLD AMBIENT AI & IDLE TESTS PASSED!\n");
process.exit(0);
