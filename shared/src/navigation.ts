// shared/src/navigation.ts
// High-performance Sparse Grid A* Navigation, Boids Flocking Separation & Leashing Engine
// Issue #12 / Task 6.4

export interface NavPoint {
  x: number;
  y: number;
}

export type EnemyAiState = 'idle' | 'chase' | 'confused' | 'returning';

export interface NavAgent {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  aiState: EnemyAiState;
  confusedUntil?: number;
  aggroRadius: number;
  leashRadius: number;
  speed: number;
}

export class NavigationEngine {
  public static readonly MAP_WIDTH = 64;
  public static readonly MAP_HEIGHT = 56;
  public static readonly TILE_SIZE = 32;

  private totalTiles: number;
  public collisionGrid: Uint8Array; // 1 = solid, 0 = walkable

  // Zero-allocation reusable buffers for A* search
  private runId = 1;
  private visited: Uint32Array;
  private gScore: Float32Array;
  private fScore: Float32Array;
  private cameFrom: Int16Array;
  private openHeap: Int16Array;
  private heapSize = 0;

  constructor() {
    this.totalTiles = NavigationEngine.MAP_WIDTH * NavigationEngine.MAP_HEIGHT;
    this.collisionGrid = new Uint8Array(this.totalTiles);
    this.visited = new Uint32Array(this.totalTiles);
    this.gScore = new Float32Array(this.totalTiles);
    this.fScore = new Float32Array(this.totalTiles);
    this.cameFrom = new Int16Array(this.totalTiles);
    this.openHeap = new Int16Array(this.totalTiles);

    this.buildBaseGrid();
  }

  private getIndex(tx: number, ty: number): number {
    return ty * NavigationEngine.MAP_WIDTH + tx;
  }

  public setSolid(tx: number, ty: number, solid: boolean) {
    if (tx >= 0 && tx < NavigationEngine.MAP_WIDTH && ty >= 0 && ty < NavigationEngine.MAP_HEIGHT) {
      this.collisionGrid[this.getIndex(tx, ty)] = solid ? 1 : 0;
    }
  }

  public isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= NavigationEngine.MAP_WIDTH || ty < 0 || ty >= NavigationEngine.MAP_HEIGHT) {
      return true;
    }
    return this.collisionGrid[this.getIndex(tx, ty)] === 1;
  }

  public isWalkablePixel(px: number, py: number): boolean {
    const tx = Math.floor(px / NavigationEngine.TILE_SIZE);
    const ty = Math.floor(py / NavigationEngine.TILE_SIZE);
    return !this.isSolid(tx, ty);
  }

  public setGateOpened(opened: boolean) {
    // Gate archway at tileX: 32, tileY: 16 (and 31, 16)
    this.setSolid(31, 16, !opened);
    this.setSolid(32, 16, !opened);
  }

  private buildBaseGrid() {
    const W = NavigationEngine.MAP_WIDTH;
    const H = NavigationEngine.MAP_HEIGHT;

    // 1. Perimeter boundary
    for (let x = 0; x < W; x++) {
      this.setSolid(x, 0, true);
      this.setSolid(x, 1, true); // Tree line
      this.setSolid(x, H - 1, true);
    }
    for (let y = 0; y < H; y++) {
      this.setSolid(0, y, true);
      this.setSolid(W - 1, y, true);
    }

    // 2. Whispering Meadow Azure River (tileX: 52-53, y: 1 to 54) except wooden bridge at y: 29-30
    for (let y = 1; y < H - 1; y++) {
      if (y !== 29 && y !== 30) {
        this.setSolid(52, y, true);
        this.setSolid(53, y, true);
      }
    }

    // 3. Crystal Lake (Water body at south plaza: x: 24..39, y: 41..52 except pier/bridge at x: 31..32, y: 41..45)
    for (let y = 41; y <= 52; y++) {
      for (let x = 24; x <= 39; x++) {
        // Wooden fishing pier / bridge
        if ((x === 31 || x === 32) && y <= 45) {
          continue;
        }
        this.setSolid(x, y, true);
      }
    }

    // 4. Sunken Ruins Sanctuary Outer Stone Walls
    // North wall
    for (let x = 20; x <= 43; x++) {
      this.setSolid(x, 2, true);
    }
    // South wall (with Sunken Gate at x: 31..32, y: 16)
    for (let x = 20; x <= 43; x++) {
      this.setSolid(x, 16, true);
    }
    // West & East walls
    for (let y = 2; y <= 16; y++) {
      this.setSolid(20, y, true);
      this.setSolid(43, y, true);
    }

    // 5. Town Plaza Cottages
    // Grandma's Courier Cottage (tileX: 25-27, tileY: 21-23)
    for (let y = 21; y <= 23; y++) {
      for (let x = 25; x <= 27; x++) {
        this.setSolid(x, y, true);
      }
    }
    // Grandma Bramble's Bakery (tileX: 36-39, tileY: 21-23)
    for (let y = 21; y <= 23; y++) {
      for (let x = 36; x <= 39; x++) {
        this.setSolid(x, y, true);
      }
    }

    // 6. Ruins Pillars
    const pillars = [
      { x: 28, y: 7 }, { x: 35, y: 7 },
      { x: 28, y: 13 }, { x: 35, y: 13 }
    ];
    for (const p of pillars) {
      this.setSolid(p.x, p.y, true);
    }

    // 7. Fungal Giant Mushrooms
    const mushrooms = [
      { x: 10, y: 22 }, { x: 13, y: 31 }, { x: 6, y: 26 }
    ];
    for (const m of mushrooms) {
      this.setSolid(m.x, m.y, true);
    }

    // 8. Meadow Cliff Ledges (tileX: 45..50, tileY: 22)
    for (let x = 45; x <= 50; x++) {
      this.setSolid(x, 22, true);
    }

    // 9. Bottomless Pitfall chasms
    this.setSolid(25, 10, true);
    this.setSolid(38, 10, true);
  }

  // Fast Bresenham raycast line-of-sight check
  public hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    let tx0 = Math.floor(x0 / NavigationEngine.TILE_SIZE);
    let ty0 = Math.floor(y0 / NavigationEngine.TILE_SIZE);
    const tx1 = Math.floor(x1 / NavigationEngine.TILE_SIZE);
    const ty1 = Math.floor(y1 / NavigationEngine.TILE_SIZE);

    const dx = Math.abs(tx1 - tx0);
    const dy = Math.abs(ty1 - ty0);
    const sx = tx0 < tx1 ? 1 : -1;
    const sy = ty0 < ty1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (this.isSolid(tx0, ty0)) return false;
      if (tx0 === tx1 && ty0 === ty1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        tx0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        ty0 += sy;
      }
    }
    return true;
  }

  // Binary min-heap operations for A*
  private heapPush(idx: number) {
    let i = this.heapSize++;
    this.openHeap[i] = idx;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const pIdx = this.openHeap[parent]!;
      if (this.fScore[idx]! < this.fScore[pIdx]!) {
        this.openHeap[i] = pIdx;
        this.openHeap[parent] = idx;
        i = parent;
      } else {
        break;
      }
    }
  }

  private heapPop(): number {
    const top = this.openHeap[0]!;
    this.heapSize--;
    if (this.heapSize > 0) {
      const last = this.openHeap[this.heapSize]!;
      this.openHeap[0] = last;
      let i = 0;
      while (true) {
        const left = (i << 1) + 1;
        const right = left + 1;
        if (left >= this.heapSize) break;
        let smallest = left;
        if (right < this.heapSize && this.fScore[this.openHeap[right]!]! < this.fScore[this.openHeap[left]!]!) {
          smallest = right;
        }
        const sIdx = this.openHeap[smallest]!;
        if (this.fScore[sIdx]! < this.fScore[last]!) {
          this.openHeap[i] = sIdx;
          this.openHeap[smallest] = last;
          i = smallest;
        } else {
          break;
        }
      }
    }
    return top;
  }

  // Zero-allocation A* pathfinding returning waypoints
  public findPath(startX: number, startY: number, goalX: number, goalY: number, maxSteps = 40): NavPoint[] {
    // 1. Direct line of sight optimization: if no obstacles in path, move straight!
    if (this.hasLineOfSight(startX, startY, goalX, goalY)) {
      return [{ x: goalX, y: goalY }];
    }

    const startTx = Math.max(0, Math.min(NavigationEngine.MAP_WIDTH - 1, Math.floor(startX / NavigationEngine.TILE_SIZE)));
    const startTy = Math.max(0, Math.min(NavigationEngine.MAP_HEIGHT - 1, Math.floor(startY / NavigationEngine.TILE_SIZE)));
    let goalTx = Math.max(0, Math.min(NavigationEngine.MAP_WIDTH - 1, Math.floor(goalX / NavigationEngine.TILE_SIZE)));
    let goalTy = Math.max(0, Math.min(NavigationEngine.MAP_HEIGHT - 1, Math.floor(goalY / NavigationEngine.TILE_SIZE)));

    // If goal tile is solid (e.g. player standing right next to wall/water), pick nearest walkable neighbor
    if (this.isSolid(goalTx, goalTy)) {
      const neighbors = [
        [goalTx + 1, goalTy], [goalTx - 1, goalTy],
        [goalTx, goalTy + 1], [goalTx, goalTy - 1]
      ];
      let bestDist = Infinity;
      let altGoal = { tx: goalTx, ty: goalTy };
      for (const [nx, ny] of neighbors) {
        if (!this.isSolid(nx!, ny!)) {
          const d = Math.hypot(nx! - startTx, ny! - startTy);
          if (d < bestDist) {
            bestDist = d;
            altGoal = { tx: nx!, ty: ny! };
          }
        }
      }
      goalTx = altGoal.tx;
      goalTy = altGoal.ty;
    }

    const startIdx = this.getIndex(startTx, startTy);
    const goalIdx = this.getIndex(goalTx, goalTy);

    if (startIdx === goalIdx) {
      return [{ x: goalX, y: goalY }];
    }

    // New run token to avoid clearing entire arrays
    const currentRun = ++this.runId;
    this.heapSize = 0;

    this.gScore[startIdx] = 0;
    const h0 = Math.abs(goalTx - startTx) + Math.abs(goalTy - startTy);
    this.fScore[startIdx] = h0;
    this.cameFrom[startIdx] = -1;
    this.visited[startIdx] = currentRun;
    this.heapPush(startIdx);

    let found = false;
    let steps = 0;

    // 8-directional offsets with diagonal corner-cutting checks
    const dxs = [0, 0, 1, -1, 1, -1, 1, -1];
    const dys = [-1, 1, 0, 0, -1, -1, 1, 1];
    const costs = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414];

    while (this.heapSize > 0 && steps++ < maxSteps * 8) {
      const currentIdx = this.heapPop();
      if (currentIdx === goalIdx) {
        found = true;
        break;
      }

      const cx = currentIdx % NavigationEngine.MAP_WIDTH;
      const cy = Math.floor(currentIdx / NavigationEngine.MAP_WIDTH);
      const currentG = this.gScore[currentIdx]!;

      for (let dir = 0; dir < 8; dir++) {
        const nx = cx + dxs[dir]!;
        const ny = cy + dys[dir]!;

        if (nx < 0 || nx >= NavigationEngine.MAP_WIDTH || ny < 0 || ny >= NavigationEngine.MAP_HEIGHT) {
          continue;
        }

        if (this.isSolid(nx, ny)) continue;

        // Prevent cutting corners through adjacent solid diagonal blocks
        if (dir >= 4) {
          if (this.isSolid(cx, ny) || this.isSolid(nx, cy)) {
            continue;
          }
        }

        const nIdx = this.getIndex(nx, ny);
        const tentativeG = currentG + costs[dir]!;

        if (this.visited[nIdx] !== currentRun || tentativeG < this.gScore[nIdx]!) {
          this.cameFrom[nIdx] = currentIdx;
          this.gScore[nIdx] = tentativeG;
          const h = Math.abs(goalTx - nx) + Math.abs(goalTy - ny);
          this.fScore[nIdx] = tentativeG + h;

          if (this.visited[nIdx] !== currentRun) {
            this.visited[nIdx] = currentRun;
            this.heapPush(nIdx);
          }
        }
      }
    }

    if (!found) {
      // Fallback: move towards goal if direct ray is clear enough
      return [{ x: goalX, y: goalY }];
    }

    // Reconstruct path
    const path: NavPoint[] = [];
    let curr = goalIdx;
    while (curr !== -1 && curr !== startIdx) {
      const px = (curr % NavigationEngine.MAP_WIDTH) * NavigationEngine.TILE_SIZE + 16;
      const py = Math.floor(curr / NavigationEngine.MAP_WIDTH) * NavigationEngine.TILE_SIZE + 16;
      path.unshift({ x: px, y: py });
      curr = this.cameFrom[curr]!;
    }

    // Append the fine-grained goal coordinate at the end
    if (path.length > 0) {
      path[path.length - 1] = { x: goalX, y: goalY };
    } else {
      path.push({ x: goalX, y: goalY });
    }

    return path;
  }

  // Boids Flocking Separation: calculates repulsive force from nearby mob sprites
  public computeSeparation(
    agentId: string,
    x: number,
    y: number,
    neighbors: Array<{ id: string; x: number; y: number }>,
    radius = 34
  ): { vx: number; vy: number } {
    let repelX = 0;
    let repelY = 0;
    let count = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const other = neighbors[i]!;
      if (other.id === agentId) continue;

      const dx = x - other.x;
      const dy = y - other.y;
      const dist = Math.hypot(dx, dy);

      if (dist < radius && dist > 0.0001) {
        const force = (1.0 - dist / radius);
        repelX += (dx / dist) * force;
        repelY += (dy / dist) * force;
        count++;
      } else if (dist <= 0.0001) {
        // Exactly on top: apply deterministic pseudo-random separation push
        const hash = (agentId.charCodeAt(agentId.length - 1) * 31) % 8;
        const angle = (hash / 8) * Math.PI * 2;
        repelX += Math.cos(angle);
        repelY += Math.sin(angle);
        count++;
      }
    }

    if (count > 0) {
      const len = Math.hypot(repelX, repelY);
      if (len > 0.001) {
        repelX /= len;
        repelY /= len;
      }
    }

    return { vx: repelX, vy: repelY };
  }

  // Blended Steering: Combines A* navigation with Boids separation
  public computeSteeringStep(
    agent: NavAgent,
    targetX: number,
    targetY: number,
    neighbors: Array<{ id: string; x: number; y: number }>,
    stepSpeed: number,
    separationRadius = 34
  ): { x: number; y: number } {
    const path = this.findPath(agent.x, agent.y, targetX, targetY);
    const nextWaypoint = path[0] || { x: targetX, y: targetY };

    // Waypoint direction vector
    const toWpX = nextWaypoint.x - agent.x;
    const toWpY = nextWaypoint.y - agent.y;
    const distToWp = Math.hypot(toWpX, toWpY);

    let chaseVx = 0;
    let chaseVy = 0;
    if (distToWp > 0.001) {
      chaseVx = toWpX / distToWp;
      chaseVy = toWpY / distToWp;
    }

    // Separation vector from flock members
    const sep = this.computeSeparation(agent.id, agent.x, agent.y, neighbors, separationRadius);

    // Blend: 70% path direction, 40% separation repulsion
    let combinedVx = chaseVx * 0.70 + sep.vx * 0.40;
    let combinedVy = chaseVy * 0.70 + sep.vy * 0.40;
    const len = Math.hypot(combinedVx, combinedVy);
    if (len > 0.001) {
      combinedVx = (combinedVx / len) * stepSpeed;
      combinedVy = (combinedVy / len) * stepSpeed;
    }

    // Desired destination
    let candidateX = agent.x + combinedVx;
    let candidateY = agent.y + combinedVy;

    // Wall & Obstacle Collision Sliding
    if (this.isWalkablePixel(candidateX, candidateY)) {
      return { x: candidateX, y: candidateY };
    } else if (this.isWalkablePixel(candidateX, agent.y)) {
      return { x: candidateX, y: agent.y };
    } else if (this.isWalkablePixel(agent.x, candidateY)) {
      return { x: agent.x, y: candidateY };
    }

    return { x: agent.x, y: agent.y };
  }

  // Complete Leashing State Machine & Tick for Mob AI
  public updateAgent(
    agent: NavAgent,
    players: Array<{ x: number; y: number }>,
    otherAgents: Array<{ id: string; x: number; y: number }>,
    now: number
  ): { changed: boolean; moved: boolean } {
    const distFromHome = Math.hypot(agent.x - agent.homeX, agent.y - agent.homeY);

    // Find nearest player
    let closestPlayer: { x: number; y: number } | null = null;
    let closestDist = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.x - agent.x, p.y - agent.y);
      if (d < closestDist) {
        closestDist = d;
        closestPlayer = p;
      }
    }

    let changed = false;
    let moved = false;

    switch (agent.aiState) {
      case 'idle': {
        // Check for player aggro within aggroRadius
        if (closestPlayer && closestDist <= agent.aggroRadius && distFromHome < agent.leashRadius) {
          agent.aiState = 'chase';
          changed = true;
        } else {
          // Gentle ambient hop within 36px of home
          if (Math.random() < 0.35) {
            const hx = agent.homeX + (Math.random() - 0.5) * 48;
            const hy = agent.homeY + (Math.random() - 0.5) * 48;
            if (this.isWalkablePixel(hx, hy)) {
              agent.x = Math.round(agent.x * 0.7 + hx * 0.3);
              agent.y = Math.round(agent.y * 0.7 + hy * 0.3);
              moved = true;
              changed = true;
            }
          }
        }
        break;
      }

      case 'chase': {
        // Check leash distance or lost target
        if (!closestPlayer || distFromHome >= agent.leashRadius || closestDist > agent.leashRadius * 1.1) {
          // Player broke leash boundary! Enter confused state!
          agent.aiState = 'confused';
          agent.confusedUntil = now + 1800; // 1.8 seconds confused pause
          changed = true;
          break;
        }

        // Steer towards player using A* obstacle avoidance + flocking separation
        const nextPos = this.computeSteeringStep(
          agent,
          closestPlayer.x,
          closestPlayer.y,
          otherAgents,
          agent.speed,
          34
        );

        if (Math.hypot(nextPos.x - agent.x, nextPos.y - agent.y) > 0.1) {
          agent.x = Math.round(nextPos.x * 10) / 10;
          agent.y = Math.round(nextPos.y * 10) / 10;
          moved = true;
          changed = true;
        }
        break;
      }

      case 'confused': {
        // Paused in place with overhead question mark
        if (agent.confusedUntil && now >= agent.confusedUntil) {
          agent.aiState = 'returning';
          changed = true;
        }
        break;
      }

      case 'returning': {
        // Navigate via A* back towards home coordinates
        if (distFromHome <= 20) {
          agent.x = agent.homeX;
          agent.y = agent.homeY;
          agent.aiState = 'idle';
          moved = true;
          changed = true;
        } else {
          const nextPos = this.computeSteeringStep(
            agent,
            agent.homeX,
            agent.homeY,
            otherAgents,
            agent.speed * 0.9,
            34
          );
          if (Math.hypot(nextPos.x - agent.x, nextPos.y - agent.y) > 0.1) {
            agent.x = Math.round(nextPos.x * 10) / 10;
            agent.y = Math.round(nextPos.y * 10) / 10;
            moved = true;
            changed = true;
          }
        }
        break;
      }
    }

    return { changed, moved };
  }
}
