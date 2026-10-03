// shared/src/spatialGrid.ts
// 16x16 Spatial Hash Grid, Viewport Frustum Culling & Entity Sleep Engine
// Issue #18 / Task 6.10

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
}

export class SpatialGrid<T extends SpatialItem = SpatialItem> {
  public readonly cellSize: number;
  public readonly cols: number;
  public readonly rows: number;
  public readonly totalCells: number;

  // Discrete spatial buckets
  private cells: Array<Set<T>>;
  private itemCellMap: Map<string, number> = new Map();

  // Reusable query buffer to avoid allocation during queries
  private queryBuffer: T[] = [];

  constructor(worldWidth = 2048, worldHeight = 1792, cellSize = 128) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize); // 16 columns
    this.rows = Math.ceil(worldHeight / cellSize); // 14 rows
    this.totalCells = this.cols * this.rows;

    this.cells = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = new Set<T>();
    }
  }

  public getCellCoords(x: number, y: number): { cx: number; cy: number } {
    const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
    return { cx, cy };
  }

  public getCellIndex(x: number, y: number): number {
    const { cx, cy } = this.getCellCoords(x, y);
    return cy * this.cols + cx;
  }

  public insert(item: T) {
    const idx = this.getCellIndex(item.x, item.y);
    this.cells[idx]!.add(item);
    this.itemCellMap.set(item.id, idx);
  }

  public update(item: T) {
    const oldIdx = this.itemCellMap.get(item.id);
    const newIdx = this.getCellIndex(item.x, item.y);

    if (oldIdx !== newIdx) {
      if (oldIdx !== undefined) {
        this.cells[oldIdx]?.delete(item);
      }
      this.cells[newIdx]!.add(item);
      this.itemCellMap.set(item.id, newIdx);
    }
  }

  public remove(id: string) {
    const idx = this.itemCellMap.get(id);
    if (idx !== undefined) {
      const cell = this.cells[idx];
      if (cell) {
        for (const item of cell) {
          if (item.id === id) {
            cell.delete(item);
            break;
          }
        }
      }
      this.itemCellMap.delete(id);
    }
  }

  public clear() {
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i]!.clear();
    }
    this.itemCellMap.clear();
  }

  // Query all items within rectangular bounds (e.g. camera frustum or area of interest)
  public queryRect(minX: number, minY: number, maxX: number, maxY: number, outArray: T[] = this.queryBuffer): T[] {
    outArray.length = 0;
    const startCx = Math.max(0, Math.floor(minX / this.cellSize));
    const startCy = Math.max(0, Math.floor(minY / this.cellSize));
    const endCx = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize));
    const endCy = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize));

    for (let cy = startCy; cy <= endCy; cy++) {
      for (let cx = startCx; cx <= endCx; cx++) {
        const cell = this.cells[cy * this.cols + cx]!;
        for (const item of cell) {
          outArray.push(item);
        }
      }
    }
    return outArray;
  }

  // Fast check: determines if point/entity is within distance of any player
  public isNearAnyPlayer(itemX: number, itemY: number, players: Array<{ x: number; y: number }>, maxDistance = 480): boolean {
    const maxDistSq = maxDistance * maxDistance;
    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      const dx = itemX - p.x;
      const dy = itemY - p.y;
      if (dx * dx + dy * dy <= maxDistSq) {
        return true;
      }
    }
    return false;
  }

  // Frustum culling helper: returns true if coordinate is inside or within margin of viewport
  public static isInFrustum(
    x: number,
    y: number,
    camX: number,
    camY: number,
    camWidth: number,
    camHeight: number,
    margin = 48
  ): boolean {
    return (
      x >= camX - margin &&
      x <= camX + camWidth + margin &&
      y >= camY - margin &&
      y <= camY + camHeight + margin
    );
  }
}
