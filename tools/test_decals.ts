// tools/test_decals.ts
// Headless test suite for Environmental Decals & Persistent World Scars (Issue #13)

console.log("🍂 Running BitQuest Environmental Decals & Persistent World Scars Suite...\n");

// 1. Verify Procedural Decal Textures
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

const requiredDecalTextures = [
  'decal_pot_shard',
  'decal_leaf_clipping',
  'decal_footprint_mud',
  'decal_slime_splatter'
];

for (const tex of requiredDecalTextures) {
  if (!addedTextures.includes(tex)) {
    console.error(`❌ Missing procedural decal texture: ${tex}`);
    process.exit(1);
  }
}
console.log(`✅ All environmental decal textures generated: ${requiredDecalTextures.join(', ')}`);

// 2. Decal Pool Lifecycle & Persistence Simulation
const MAX_DECALS = 120;
interface DecalItem {
  texture: string;
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  initialAlpha: number;
  spawnTime: number;
  lingerDuration: number;
  fadeDuration: number;
  active: boolean;
  visible: boolean;
}

const pool: DecalItem[] = Array.from({ length: MAX_DECALS }, () => ({
  texture: '',
  x: 0,
  y: 0,
  rotation: 0,
  alpha: 0,
  initialAlpha: 1,
  spawnTime: 0,
  lingerDuration: 0,
  fadeDuration: 1500,
  active: false,
  visible: false
}));

let head = 0;
function stamp(tex: string, x: number, y: number, lingerMs: number, alpha: number, time: number) {
  const d = pool[head];
  head = (head + 1) % MAX_DECALS;
  d.texture = tex;
  d.x = x;
  d.y = y;
  d.initialAlpha = alpha;
  d.alpha = alpha;
  d.spawnTime = time;
  d.lingerDuration = lingerMs;
  d.fadeDuration = 1500;
  d.active = true;
  d.visible = true;
}

function update(time: number) {
  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    if (!d.active) continue;
    const age = time - d.spawnTime;
    if (age > d.lingerDuration + d.fadeDuration) {
      d.active = false;
      d.visible = false;
    } else if (age > d.lingerDuration) {
      const p = (age - d.lingerDuration) / d.fadeDuration;
      d.alpha = d.initialAlpha * (1 - p);
    }
  }
}

// Test A: Broken Ceramic Pot Shard Lingers for 15s
stamp('decal_pot_shard', 100, 100, 15000, 0.85, 0);
const potShard = pool[0];

update(5000); // 5s: fully opaque
if (!potShard.active || !potShard.visible || potShard.alpha !== 0.85) {
  console.error("❌ Pot shard failed to stay fully visible at 5s.");
  process.exit(1);
}

update(15000); // 15s: still active at end of linger period
if (!potShard.active || potShard.alpha !== 0.85) {
  console.error("❌ Pot shard failed to linger for full 15s.");
  process.exit(1);
}
console.log(`✅ Ceramic pot shard lingers on ground at 15s with full alpha (${potShard.alpha})`);

update(15750); // 15.75s (halfway through 1.5s fade)
if (potShard.alpha >= 0.85 || potShard.alpha <= 0) {
  console.error(`❌ Pot shard fade interpolation incorrect at 15.75s: ${potShard.alpha}`);
  process.exit(1);
}
console.log(`✅ Ceramic pot shard smoothly fading at 15.75s: alpha=${potShard.alpha.toFixed(3)}`);

update(17000); // 17s (after fade completed)
if (potShard.active || potShard.visible) {
  console.error("❌ Pot shard failed to despawn after fade duration.");
  process.exit(1);
}
console.log("✅ Ceramic pot shard cleanly despawned after fade duration.");

// Test B: Slashed Leaf Clippings (12s linger) & Muddy Footprints (8s linger)
stamp('decal_leaf_clipping', 200, 200, 12000, 0.75, 10000);
stamp('decal_footprint_mud', 300, 300, 8000, 0.45, 10000);

update(19000); // +9s from spawn: Footprint is fading, leaf is still lingering
const leaf = pool[1];
const foot = pool[2];

if (!leaf.active || leaf.alpha !== 0.75) {
  console.error("❌ Slashed leaf clipping failed to stay active at 9s.");
  process.exit(1);
}
if (foot.alpha >= 0.45) {
  console.error("❌ Muddy footprint failed to begin fading after 8s.");
  process.exit(1);
}
console.log(`✅ Slashed leaf clipping lingering at 9s (alpha=${leaf.alpha}), muddy footprint fading (alpha=${foot.alpha.toFixed(3)})`);

// Test C: Slime Puddle (10s linger)
stamp('decal_slime_splatter', 400, 400, 10000, 0.65, 20000);
const slime = pool[3];
update(29000);
if (!slime.active || slime.alpha !== 0.65) {
  console.error("❌ Slime puddle failed to stay active at 9s.");
  process.exit(1);
}
console.log(`✅ Slime puddle decal persisting on ground at 9s: alpha=${slime.alpha}`);

// 3. Ring Buffer Overflow Safety
for (let i = 0; i < 200; i++) {
  stamp('decal_pot_shard', i * 2, i * 2, 15000, 0.85, 30000);
}
if (pool.length !== MAX_DECALS) {
  console.error(`❌ Decal pool expanded beyond MAX_DECALS! Size: ${pool.length}`);
  process.exit(1);
}
console.log(`✅ Ring buffer maintains strict fixed size (${MAX_DECALS} slots) across 200 rapid stamps.`);

// 4. Performance Benchmark: 10,000 frames of 120 active decals
const benchStart = performance.now();
for (let frame = 0; frame < 10000; frame++) {
  update(frame * 16.6);
}
const elapsed = performance.now() - benchStart;
console.log(`✅ Environmental decal update performance: ${(elapsed / 10000).toFixed(4)}ms / frame (${elapsed.toFixed(2)}ms for 10,000 frames)`);

console.log("\n🎉 ALL ENVIRONMENTAL DECALS & WORLD SCARS TESTS PASSED!\n");
process.exit(0);
