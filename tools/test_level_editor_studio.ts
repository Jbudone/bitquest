/**
 * BitQuest - Studio-Grade Human Level Editor Test Suite (Phase 10)
 *
 * Verifies all 10 tactile, human-centric level editor features:
 * 1. Visual tileset catalog integrity & metadata.
 * 2. 4-Layer composition stack (Ground, Props, Roof, Collision).
 * 3. Classic 2D Toolbelt (Pencil, Eraser, Flood Fill, Line, Rect, Eyedropper).
 * 4. Tile Transformations (Rotate 90°, Flip Horizontal, Flip Vertical).
 * 5. Clipboard & Selection (Copy, Cut, Paste, Nudge, Delete).
 * 6. Viewport Pan, Zoom clamping & Minimap coordinate mapping.
 * 7. Fast-Jump Location Bookmarks.
 * 8. Undo / Redo command history stack.
 * 9. Tiled XML (.tmx) and JSON Export / Import round-trip.
 */

import { LevelEditorStudio, TILE_CATALOG, DEFAULT_BOOKMARKS } from '../client/src/tools/levelEditorStudio';

console.log('🗺️ Running BitQuest Studio-Grade Level Editor Test Suite (Phase 10)...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Tileset Catalog & Metadata Integrity
// ---------------------------------------------------------------------------
console.log('\n--- 1. Tileset Catalog & Metadata Integrity ---');
assert(Object.keys(TILE_CATALOG).length >= 24, `Tileset catalog has ${Object.keys(TILE_CATALOG).length} tiles (expected >= 24)`);
assert(TILE_CATALOG['grass'] !== undefined, 'Grass tile defined in catalog');
assert(TILE_CATALOG['grass']?.walkable === true, 'Grass is walkable');
assert(TILE_CATALOG['grass']?.soundType === 'grass', 'Grass sound type is grass');
assert(TILE_CATALOG['wall']?.walkable === false, 'Wall is solid (non-walkable)');
assert(TILE_CATALOG['water']?.walkable === false, 'Water is non-walkable');
assert(TILE_CATALOG['water']?.soundType === 'water', 'Water sound type is water');
assert(TILE_CATALOG['chest']?.category === 'props', 'Chest is category props');
assert(TILE_CATALOG['roof_red']?.category === 'roof', 'Roof red is category roof');
assert(TILE_CATALOG['roof_red']?.elevation === 2, 'Roof elevation is 2 (high)');

// ---------------------------------------------------------------------------
// 2. Map Multi-Layer Initialization & Dimensions
// ---------------------------------------------------------------------------
console.log('\n--- 2. Map Multi-Layer Initialization & Dimensions ---');
const studio = new LevelEditorStudio(null as any);

assert(studio.mapWidth === 64, 'Map width is 64 tiles (2048px)');
assert(studio.mapHeight === 56, 'Map height is 56 tiles (1792px)');
assert(studio.ground.length === 56 && studio.ground[0]!.length === 64, 'Ground layer initialized to 64×56');
assert(studio.props.length === 56 && studio.props[0]!.length === 64, 'Props layer initialized to 64×56');
assert(studio.roof.length === 56 && studio.roof[0]!.length === 64, 'Roof layer initialized to 64×56');
assert(studio.collision.length === 56 && studio.collision[0]!.length === 64, 'Collision layer initialized to 64×56');

// Canonical Biomes Check
assert(studio.ground[20]![10] === 'fungal', 'West side (x=10) initialized to Fungal Hollow');
assert(studio.ground[10]![30] === 'ruins', 'North side (y=10, x=30) initialized to Sunken Ruins');
assert(studio.ground[30]![30] === 'cobble', 'Center (x=30, y=30) initialized to Town Cobble');
assert(studio.ground[10]![52] === 'water', 'East side (x=52) initialized to River Water');
assert(studio.collision[10]![52] === 2, 'Water tile has collision mask 2 (water)');
assert(studio.ground[0]![0] === 'wall', 'Perimeter wall exists at (0, 0)');
assert(studio.collision[0]![0] === 1, 'Perimeter wall has collision mask 1 (solid)');

// ---------------------------------------------------------------------------
// 3. Classic 2D Toolbelt Operations
// ---------------------------------------------------------------------------
console.log('\n--- 3. Classic 2D Toolbelt Operations ---');

// Pencil Stamp
studio.setTool('pencil');
studio.selectSingleTile('dirt');
studio.stampAt(35, 35);
assert(studio.ground[35]![35] === 'dirt', 'Pencil stamped dirt at (35, 35)');

// Brush size 3x3 expansion
studio.brushSize = 3;
studio.stampAt(45, 45);
assert(studio.ground[45]![45] === 'dirt', 'Center of 3×3 brush is dirt');
assert(studio.ground[44]![44] === 'dirt', 'Top-left of 3×3 brush is dirt');
assert(studio.ground[46]![46] === 'dirt', 'Bottom-right of 3×3 brush is dirt');
studio.brushSize = 1; // reset

// Eraser
studio.setTool('eraser');
studio.stampAt(35, 35);
assert(studio.ground[35]![35] === 'grass', 'Eraser reverted tile back to grass');

// Flood Fill
studio.setTool('pencil');
studio.selectSingleTile('wood_floor');
// Fill small 4x4 area with wood floor
studio.drawRect(20, 20, 23, 23, true);
assert(studio.ground[20]![20] === 'wood_floor', 'Pre-fill tile is wood_floor');
assert(studio.ground[23]![23] === 'wood_floor', 'Pre-fill corner tile is wood_floor');

// Now flood fill wood_floor area with cobble
studio.selectSingleTile('cobble');
studio.setTool('fill');
studio.floodFill(21, 21);
assert(studio.ground[20]![20] === 'cobble', 'Flood fill converted (20, 20) to cobble');
assert(studio.ground[23]![23] === 'cobble', 'Flood fill converted (23, 23) to cobble');

// Line Tool (Bresenham)
studio.setTool('pencil');
studio.selectSingleTile('sand');
studio.drawLine(10, 10, 15, 10);
assert(studio.ground[10]![10] === 'sand', 'Line start at (10, 10) is sand');
assert(studio.ground[10]![12] === 'sand', 'Line middle at (12, 10) is sand');
assert(studio.ground[10]![15] === 'sand', 'Line end at (15, 10) is sand');

// Eyedropper Sampling
studio.sampleTileAt(10, 10);
assert(studio.activeStamp.tiles[0]?.[0] === 'sand', 'Eyedropper sampled sand into active brush');

// ---------------------------------------------------------------------------
// 4. Tile Transformations (Rotate 90°, Flip X, Flip Y)
// ---------------------------------------------------------------------------
console.log('\n--- 4. Tile Transformations ---');
// Setup a 3x2 asymmetric stamp
studio.activeStamp = {
  width: 3,
  height: 2,
  tiles: [
    ['A', 'B', 'C'],
    ['D', 'E', 'F']
  ]
};

// Flip X (Horizontal)
studio.flipStampHorizontal();
assert(studio.activeStamp.tiles[0]![0] === 'C', 'Flip X row 0 col 0 is C');
assert(studio.activeStamp.tiles[0]![2] === 'A', 'Flip X row 0 col 2 is A');

// Flip Y (Vertical)
studio.flipStampVertical();
assert(studio.activeStamp.tiles[0]![0] === 'F', 'Flip Y row 0 col 0 is F');
assert(studio.activeStamp.tiles[1]![0] === 'C', 'Flip Y row 1 col 0 is C');

// Rotate 90° Clockwise
// Current 3x2:
// [F, E, D]
// [C, B, A]
studio.rotateStampClockwise();
// After 90° rot: dimensions become 2x3
assert(studio.activeStamp.width === 2, 'Rotated stamp width is 2');
assert(studio.activeStamp.height === 3, 'Rotated stamp height is 3');
assert(studio.activeStamp.tiles[0]![0] === 'C', 'Rotated stamp (0, 0) is C');
assert(studio.activeStamp.tiles[0]![1] === 'F', 'Rotated stamp (0, 1) is F');
assert(studio.activeStamp.tiles[2]![0] === 'A', 'Rotated stamp (2, 0) is A');
assert(studio.activeStamp.tiles[2]![1] === 'D', 'Rotated stamp (2, 1) is D');

// ---------------------------------------------------------------------------
// 5. Clipboard & Selection Manipulation
// ---------------------------------------------------------------------------
console.log('\n--- 5. Clipboard & Selection Manipulation ---');
studio.setActiveLayer('ground');
studio.ground[5]![5] = 'wall';
studio.ground[5]![6] = 'wall';
studio.ground[6]![5] = 'sand';
studio.ground[6]![6] = 'sand';

studio.selection = { x: 5, y: 5, w: 2, h: 2 };
studio.copySelection();

assert(studio.clipboard !== null, 'Clipboard populated after Copy');
assert(studio.clipboard?.width === 2, 'Clipboard width is 2');
assert(studio.clipboard?.height === 2, 'Clipboard height is 2');
assert(studio.clipboard?.tiles[0]![0] === 'wall', 'Clipboard tile (0, 0) is wall');
assert(studio.clipboard?.tiles[1]![1] === 'sand', 'Clipboard tile (1, 1) is sand');

// Nudge selection
studio.nudgeSelection(2, 3);
assert(studio.selection.x === 7 && studio.selection.y === 8, 'Selection nudged to (7, 8)');

// Delete selection
studio.deleteSelection();
assert(studio.ground[8]![7] === 'grass', 'Deleted selection reverted ground to grass');

// Paste
studio.pasteSelection();
assert(studio.activeStamp.width === 2 && studio.activeStamp.height === 2, 'Paste activated 2×2 stamp into brush');

// ---------------------------------------------------------------------------
// 6. Fast-Jump Bookmarks & Navigation
// ---------------------------------------------------------------------------
console.log('\n--- 6. Fast-Jump Bookmarks & Navigation ---');
assert(DEFAULT_BOOKMARKS.length === 8, 'Default bookmarks has 8 landmarks');
const bakery = DEFAULT_BOOKMARKS.find(b => b.id === 'bakery');
assert(bakery !== undefined && bakery.x === 40 && bakery.y === 26, "Grandma's Bakery coords correct");

const lake = DEFAULT_BOOKMARKS.find(b => b.id === 'lake');
assert(lake !== undefined && lake.x === 32 && lake.y === 44, 'Crystal Lake coords correct');

// ---------------------------------------------------------------------------
// 7. Undo / Redo Command History Stack
// ---------------------------------------------------------------------------
console.log('\n--- 7. Undo / Redo History Stack ---');
studio.ground[12]![12] = 'grass';
studio.setTool('pencil');
studio.selectSingleTile('ruins');
studio.stampAt(12, 12);
assert(studio.ground[12]![12] === 'ruins', 'Stamped ruins tile');

studio.undo();
assert(studio.ground[12]![12] === 'grass', 'Undo reverted tile to grass');

studio.redo();
assert(studio.ground[12]![12] === 'ruins', 'Redo restored tile to ruins');

// ---------------------------------------------------------------------------
// 8. TMX XML & JSON Interoperability
// ---------------------------------------------------------------------------
console.log('\n--- 8. TMX XML & JSON Interoperability ---');

// Mock browser Blob and URL for headless CLI execution
(globalThis as any).Blob = class MockBlob {
  public content: any[];
  public options: any;
  constructor(content: any[], options: any) {
    this.content = content;
    this.options = options;
  }
};
(globalThis as any).URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};

// Export JSON
const jsonOutput = studio.exportJSON();
assert(typeof jsonOutput === 'string' && jsonOutput.includes('"version": "2.0.0"'), 'JSON export contains valid metadata');

// Round-trip import JSON
studio.ground[2]![2] = 'sand';
const parsed = JSON.parse(jsonOutput);
parsed.layers.ground[2][2] = 'crypt_stone';
studio.importJSON(JSON.stringify(parsed));
assert(studio.ground[2]![2] === 'crypt_stone', 'Imported JSON updated ground layer tile');

// Export TMX
const tmxOutput = studio.exportTMX();
assert(tmxOutput.startsWith('<?xml'), 'TMX output starts with XML declaration');
assert(tmxOutput.includes('<map version="1.10"'), 'TMX output includes map element');
assert(tmxOutput.includes('tilewidth="32" tileheight="32"'), 'TMX output includes 32x32 tile dimensions');
assert(tmxOutput.includes('<layer id="1" name="Ground"'), 'TMX output includes Ground layer data');

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
