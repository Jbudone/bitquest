// tools/test_spatial_culling.ts
// Headless test suite for Spatial Partitioning, Viewport Culling & Entity Sleep Engine (Issue #18 / Task 6.10)

import { SpatialGrid, SpatialItem } from '../shared/src/spatialGrid';

console.log("📐 Running BitQuest Spatial Partitioning & Viewport Culling Suite...\n");

// 1. Grid Dimension and Bucket Layout
const grid = new SpatialGrid<SpatialItem>(2048, 1792, 128);

if (grid.cols !== 16 || grid.rows !== 14 || grid.totalCells !== 224) {
  console.error(`❌ SpatialGrid dimensions mismatch: cols=${grid.cols}, rows=${grid.rows}, totalCells=${grid.totalCells}`);
  process.exit(1);
}
console.log(`✅ 16x14 spatial hash grid successfully created (${grid.totalCells} discrete 128x128px cells).`);

// 2. Insert, Update and Query
const pot1: SpatialItem = { id: 'pot_town_1', x: 830, y: 850 };
const pot2: SpatialItem = { id: 'pot_ruins_1', x: 960, y: 340 };
const enemy1: SpatialItem = { id: 'enemy_grumble_1', x: 340, y: 780 };

grid.insert(pot1);
grid.insert(pot2);
grid.insert(enemy1);

// Query around town square (700..900, 700..900)
const townResults = grid.queryRect(700, 700, 900, 900);
const foundPot1 = townResults.some(item => item.id === 'pot_town_1');
const foundRuinsPot = townResults.some(item => item.id === 'pot_ruins_1');

if (!foundPot1 || foundRuinsPot) {
  console.error("❌ Spatial queryRect returned unexpected results!");
  process.exit(1);
}
console.log(`✅ Spatial queryRect filtered town entities accurately (${townResults.length} items found, off-screen ruins items excluded).`);

// Test item position update across cells
const oldCellIdx = grid.getCellIndex(pot1.x, pot1.y);
pot1.x = 100;
pot1.y = 100;
grid.update(pot1);
const newCellIdx = grid.getCellIndex(pot1.x, pot1.y);

if (oldCellIdx === newCellIdx) {
  console.error("❌ Moving item to (100, 100) did not change cell index!");
  process.exit(1);
}

const cornerResults = grid.queryRect(0, 0, 200, 200);
if (!cornerResults.some(item => item.id === 'pot_town_1')) {
  console.error("❌ Updated item not found in new cell bucket!");
  process.exit(1);
}
console.log(`✅ Dynamic entity cell migration verified: Cell ${oldCellIdx} -> Cell ${newCellIdx}`);

// 3. Frustum Culling Logic
// Camera centered at town plaza (viewport: 800..1200, 700..1000)
const camX = 800;
const camY = 700;
const camW = 400;
const camH = 300;

// On-screen entity inside viewport
const entityOnScreen = SpatialGrid.isInFrustum(950, 850, camX, camY, camW, camH, 48);
// Entity slightly outside but within 48px margin buffer
const entityInMargin = SpatialGrid.isInFrustum(780, 850, camX, camY, camW, camH, 48);
// Far off-screen entity (Fungal Hollow)
const entityOffScreen = SpatialGrid.isInFrustum(300, 800, camX, camY, camW, camH, 48);

if (!entityOnScreen || !entityInMargin || entityOffScreen) {
  console.error(`❌ Frustum culling check failed: onScreen=${entityOnScreen}, inMargin=${entityInMargin}, offScreen=${entityOffScreen}`);
  process.exit(1);
}
console.log("✅ Viewport frustum culling with safety margin buffer verified.");

// 4. Faraway Sleep Dormancy Mode
const playerPos = [{ x: 1000, y: 900 }];

// Close entity (< 480px away)
const closeEnemy = { x: 1100, y: 920 }; // ~102px away
const closeAwake = grid.isNearAnyPlayer(closeEnemy.x, closeEnemy.y, playerPos, 480);

// Faraway entity (> 480px away)
const farEnemy = { x: 300, y: 800 }; // ~707px away
const farAwake = grid.isNearAnyPlayer(farEnemy.x, farEnemy.y, playerPos, 480);

if (!closeAwake || farAwake) {
  console.error(`❌ Sleep dormancy check failed: closeAwake=${closeAwake}, farAwake=${farAwake}`);
  process.exit(1);
}
console.log("✅ Faraway entity dormancy sleep mode verified (active within 480px, asleep outside).");

// 5. Zero-Allocation Benchmark
const benchStart = performance.now();
const runs = 20000;
const reusableOut: SpatialItem[] = [];

for (let i = 0; i < runs; i++) {
  grid.queryRect(800, 700, 1200, 1000, reusableOut);
}

const benchDuration = performance.now() - benchStart;
console.log(`✅ Spatial Benchmark: ${runs} frustum queries executed in ${benchDuration.toFixed(2)}ms (${(benchDuration / runs).toFixed(5)}ms / query).`);

console.log("\n🎉 ALL SPATIAL PARTITIONING & VIEWPORT CULLING TESTS PASSED!\n");
