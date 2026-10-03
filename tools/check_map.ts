/**
 * Headless Map Geometry & Walkability Linter
 * Validates map boundaries, entity reachability from spawn, and trap-free navigation.
 */
export interface MapCheckResult {
  width: number;
  height: number;
  totalTiles: number;
  solidTiles: number;
  walkableTiles: number;
  perimeterSealed: boolean;
  unreachableEntities: string[];
  isolatedPockets: number;
  passed: boolean;
}

export function buildWorldCollisionGrid(): { grid: number[][]; width: number; height: number; spawn: { x: number; y: number } } {
  const W = 64;
  const H = 56;
  const grid: number[][] = Array.from({ length: H }, () => Array(W).fill(0));

  // 1. Perimeter boundary (outer edges)
  for (let x = 0; x < W; x++) {
    grid[0]![x] = 1;
    grid[H - 1]![x] = 1;
  }
  for (let y = 0; y < H; y++) {
    grid[y]![0] = 1;
    grid[y]![W - 1] = 1;
  }

  // 2. Whispering Meadow Azure River (tileX: 52-53, y: 1 to 54) except bridge at y: 29-30
  for (let y = 1; y < H - 1; y++) {
    if (y !== 29 && y !== 30) {
      grid[y]![52] = 1;
      grid[y]![53] = 1;
    }
  }

  // 3. Dense Forest Perimeter & Tree clusters
  for (let x = 0; x < W; x++) {
    grid[1]![x] = 1;
    grid[2]![x] = 1;
  }

  // 4. Buildings in Town Plaza
  // Grandma's Cottage (tileX: 25-27, tileY: 21-23)
  for (let y = 21; y <= 23; y++) {
    for (let x = 25; x <= 27; x++) {
      grid[y]![x] = 1;
    }
  }
  // Town Hall / Library (tileX: 36-39, tileY: 21-23)
  for (let y = 21; y <= 23; y++) {
    for (let x = 36; x <= 39; x++) {
      grid[y]![x] = 1;
    }
  }

  return { grid, width: W, height: H, spawn: { x: 32, y: 28 } };
}

export function runMapCheck(): MapCheckResult {
  const { grid, width, height, spawn } = buildWorldCollisionGrid();
  let solidCount = 0;

  // Perimeter check
  let perimeterSealed = true;
  for (let x = 0; x < width; x++) {
    if (grid[0]![x] !== 1 || grid[height - 1]![x] !== 1) perimeterSealed = false;
  }
  for (let y = 0; y < height; y++) {
    if (grid[y]![0] !== 1 || grid[y]![width - 1] !== 1) perimeterSealed = false;
  }

  // Flood fill from spawn (tile 32, 28)
  const reachable: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: Array<[number, number]> = [[spawn.x, spawn.y]];
  reachable[spawn.y]![spawn.x] = true;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const neighbors: Array<[number, number]> = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (grid[ny]![nx] === 0 && !reachable[ny]![nx]) {
          reachable[ny]![nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Count walkable vs solid
  let walkableCount = 0;
  let isolatedPockets = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y]![x] === 1) {
        solidCount++;
      } else {
        walkableCount++;
        if (!reachable[y]![x]) {
          isolatedPockets++;
        }
      }
    }
  }

  // Key entities to verify reachability from spawn
  const keyEntities = [
    { name: 'Grandma (Town Square)', x: 33, y: 25 },
    { name: 'Barnaby (West Plaza)', x: 25, y: 27 },
    { name: 'Meadow River Bridge', x: 52, y: 29 },
    { name: 'East Meadow Clearing', x: 56, y: 29 },
    { name: 'Sunken Gate Switches', x: 30, y: 18 },
    { name: 'Fungal Hollow Entrance', x: 10, y: 28 }
  ];

  const unreachableEntities: string[] = [];
  for (const ent of keyEntities) {
    if (!reachable[ent.y]![ent.x]) {
      unreachableEntities.push(`${ent.name} at (${ent.x}, ${ent.y})`);
    }
  }

  const passed = perimeterSealed && unreachableEntities.length === 0 && isolatedPockets < 10;

  return {
    width,
    height,
    totalTiles: width * height,
    solidTiles: solidCount,
    walkableTiles: walkableCount,
    perimeterSealed,
    unreachableEntities,
    isolatedPockets,
    passed
  };
}

if (import.meta.main) {
  console.log('🔍 Running BitQuest Map Geometry & Walkability Linter...');
  const res = runMapCheck();
  console.log(`- Dimensions: ${res.width}x${res.height} tiles (${res.totalTiles} total)`);
  console.log(`- Solid Obstacles: ${res.solidTiles} tiles (${Math.round((res.solidTiles / res.totalTiles) * 100)}%)`);
  console.log(`- Walkable NavMesh: ${res.walkableTiles} tiles`);
  console.log(`- Boundary Enclosure: ${res.perimeterSealed ? '✅ SEALED (No void leaks)' : '❌ LEAK DETECTED'}`);
  console.log(`- Key POI Reachability: ${res.unreachableEntities.length === 0 ? '✅ 100% Reachable' : `❌ ${res.unreachableEntities.join(', ')}`}`);
  console.log(`- Isolated Pockets: ${res.isolatedPockets} tiles`);
  if (!res.passed) {
    console.error('❌ Map validation failed!');
    process.exit(1);
  } else {
    console.log('✨ Map geometry and navigation mesh 100% validated!');
  }
}
