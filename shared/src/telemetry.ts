/**
 * BitQuest - Zero-Allocation Telemetry, Profiler & Physics Inspector Engine (Issue #37)
 * High-frequency metrics tracking (FPS, 1% low frame times, draw calls, particle counts,
 * network ping latency, wireframe bounding box geometry calculation) with 0 KB heap churn.
 */

export const FRAME_HISTORY_SIZE = 120;
export const PING_HISTORY_SIZE = 60;

export interface TelemetryMetrics {
  fps: number;
  deltaMs: number;
  avgFps: number;
  onePercentLowFps: number;
  onePercentLowMs: number;
  drawCalls: number;
  particleCount: number;
  entityCount: number;
  obstacleCount: number;
  currentPing: number;
  minPing: number;
  maxPing: number;
  avgPing: number;
}

export type WireframeKind =
  | 'footprint'     // Green: obstacle ground collider
  | 'hurtbox'       // Blue/Red: damage receiving body
  | 'hitbox'        // Red: active weapon slash / arrow
  | 'interaction'   // Gold: proximity interact trigger radius (56px)
  | 'magnet'        // Cyan: smart vacuum loot radius (75px)
  | 'obstacle';     // Olive: solid static map obstacle

export interface WireframeBox {
  kind: WireframeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  arcStart: number;
  arcEnd: number;
  color: number;
  alpha: number;
  fillAlpha: number;
}

export class TelemetryProfiler {
  // Pre-allocated TypedArrays for 0 KB GC allocation during frame updates
  public readonly frameDeltas = new Float32Array(FRAME_HISTORY_SIZE);
  public readonly scratchDeltas = new Float32Array(FRAME_HISTORY_SIZE);
  private deltaIndex = 0;
  private deltaCount = 0;

  public readonly pingHistory = new Float32Array(PING_HISTORY_SIZE);
  private pingIndex = 0;
  private pingCount = 0;

  // Single pre-allocated metrics object reused on every getMetrics() call (0 heap churn)
  private readonly cachedMetrics: TelemetryMetrics = {
    fps: 60.0,
    deltaMs: 16.6,
    avgFps: 60.0,
    onePercentLowFps: 60.0,
    onePercentLowMs: 16.6,
    drawCalls: 0,
    particleCount: 0,
    entityCount: 0,
    obstacleCount: 0,
    currentPing: 0,
    minPing: 0,
    maxPing: 0,
    avgPing: 0
  };

  // Pre-allocated wireframe box pool for physics inspector
  public static readonly MAX_WIREFRAMES = 256;
  public readonly wireframePool: WireframeBox[] = [];
  public wireframeCount = 0;

  constructor() {
    for (let i = 0; i < TelemetryProfiler.MAX_WIREFRAMES; i++) {
      this.wireframePool.push({
        kind: 'footprint',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        radius: 0,
        arcStart: 0,
        arcEnd: 0,
        color: 0x22c55e,
        alpha: 1.0,
        fillAlpha: 0.0
      });
    }
  }

  /**
   * Records a frame interval and engine metrics without any heap allocation.
   */
  public recordFrame(
    deltaMs: number,
    drawCalls: number = 0,
    particleCount: number = 0,
    entityCount: number = 0,
    obstacleCount: number = 0
  ): void {
    const clampedDelta = deltaMs <= 0 ? 16.6 : deltaMs;
    this.frameDeltas[this.deltaIndex] = clampedDelta;
    this.deltaIndex = (this.deltaIndex + 1) % FRAME_HISTORY_SIZE;
    if (this.deltaCount < FRAME_HISTORY_SIZE) {
      this.deltaCount++;
    }

    // Update cached metrics
    this.cachedMetrics.deltaMs = clampedDelta;
    this.cachedMetrics.fps = Math.round((1000 / clampedDelta) * 10) / 10;
    this.cachedMetrics.drawCalls = drawCalls;
    this.cachedMetrics.particleCount = particleCount;
    this.cachedMetrics.entityCount = entityCount;
    this.cachedMetrics.obstacleCount = obstacleCount;

    // Rolling average FPS
    let sumDeltas = 0;
    for (let i = 0; i < this.deltaCount; i++) {
      sumDeltas += this.frameDeltas[i];
    }
    const avgDelta = sumDeltas / (this.deltaCount || 1);
    this.cachedMetrics.avgFps = Math.round((1000 / avgDelta) * 10) / 10;

    // 1% Low computation (99th percentile slowest frame)
    this.update1PercentLow();
  }

  /**
   * Computes the 1% low frame time and corresponding FPS.
   * Copies active frames into scratch array and sorts in-place (0 allocations).
   */
  private update1PercentLow(): void {
    const count = this.deltaCount;
    if (count === 0) return;

    // In-place copy to scratch buffer
    for (let i = 0; i < count; i++) {
      this.scratchDeltas[i] = this.frameDeltas[i];
    }

    // TypedArray subarray sort in-place (no new array created)
    const activeSubarray = this.scratchDeltas.subarray(0, count);
    activeSubarray.sort();

    // 99th percentile slowest frame is near the end
    const p99Index = Math.min(count - 1, Math.floor(count * 0.99));
    const p99DurationMs = activeSubarray[p99Index];

    this.cachedMetrics.onePercentLowMs = Math.round(p99DurationMs * 10) / 10;
    this.cachedMetrics.onePercentLowFps = p99DurationMs > 0
      ? Math.round((1000 / p99DurationMs) * 10) / 10
      : 60.0;
  }

  /**
   * Records a round-trip ping time in milliseconds.
   */
  public recordPing(pingMs: number): void {
    const val = Math.max(0, Math.round(pingMs));
    this.pingHistory[this.pingIndex] = val;
    this.pingIndex = (this.pingIndex + 1) % PING_HISTORY_SIZE;
    if (this.pingCount < PING_HISTORY_SIZE) {
      this.pingCount++;
    }

    this.cachedMetrics.currentPing = val;

    let min = 999999;
    let max = 0;
    let sum = 0;
    for (let i = 0; i < this.pingCount; i++) {
      const p = this.pingHistory[i];
      if (p < min) min = p;
      if (p > max) max = p;
      sum += p;
    }

    this.cachedMetrics.minPing = min === 999999 ? val : min;
    this.cachedMetrics.maxPing = max;
    this.cachedMetrics.avgPing = Math.round(sum / (this.pingCount || 1));
  }

  /**
   * Returns a reference to the pre-allocated cached metrics object (0 GC overhead).
   */
  public getMetrics(): TelemetryMetrics {
    return this.cachedMetrics;
  }

  /**
   * Resets the wireframe pool counter before recalculating bounding boxes.
   */
  public resetWireframes(): void {
    this.wireframeCount = 0;
  }

  /**
   * Allocates a wireframe from the pre-allocated pool (0 GC).
   */
  private allocWireframe(
    kind: WireframeKind,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    arcStart: number,
    arcEnd: number,
    color: number,
    alpha: number = 1.0,
    fillAlpha: number = 0.0
  ): WireframeBox | null {
    if (this.wireframeCount >= TelemetryProfiler.MAX_WIREFRAMES) return null;
    const box = this.wireframePool[this.wireframeCount++];
    box.kind = kind;
    box.x = x;
    box.y = y;
    box.width = width;
    box.height = height;
    box.radius = radius;
    box.arcStart = arcStart;
    box.arcEnd = arcEnd;
    box.color = color;
    box.alpha = alpha;
    box.fillAlpha = fillAlpha;
    return box;
  }

  /**
   * Computes wireframes for the player:
   * 1. Ground Footprint Collider (16x10 green)
   * 2. Body Hurtbox (20x26 blue)
   * 3. Loot Magnet Proximity (75px cyan circle)
   * 4. Active Melee Weapon Cleave Arc (red conical sweep) if attacking
   */
  public addPlayerWireframes(
    px: number,
    py: number,
    direction: string = 'down',
    isAttacking: boolean = false,
    cleaveRadius: number = 46,
    cleaveAngle: number = (2 * Math.PI) / 3
  ): void {
    // 1. Footprint ground collider: 16x10 rect at bottom of feet (offset: x - 8, y + 2)
    this.allocWireframe('footprint', px - 8, py + 2, 16, 10, 0, 0, 0, 0x22c55e, 0.9, 0.15);

    // 2. Body Hurtbox: 20x26 rect covering torso and head
    this.allocWireframe('hurtbox', px - 10, py - 24, 20, 26, 0, 0, 0, 0x3b82f6, 0.85, 0.08);

    // 3. Loot Magnet vacuum radius: 75px radius circle
    this.allocWireframe('magnet', px, py, 0, 0, 75, 0, Math.PI * 2, 0x06b6d4, 0.45, 0.03);

    // 4. Melee Weapon Cleave Arc
    if (isAttacking) {
      let facingAngle = Math.PI / 2; // down
      if (direction === 'up') facingAngle = -Math.PI / 2;
      else if (direction === 'left') facingAngle = Math.PI;
      else if (direction === 'right') facingAngle = 0;

      const halfAngle = cleaveAngle / 2;
      const arcStart = facingAngle - halfAngle;
      const arcEnd = facingAngle + halfAngle;

      this.allocWireframe('hitbox', px, py, 0, 0, cleaveRadius, arcStart, arcEnd, 0xef4444, 0.95, 0.25);
    }
  }

  /**
   * Computes wireframes for entities (monsters, NPCs, chests, items):
   * 1. Entity Hurtbox
   * 2. Foot Collider
   * 3. Interaction Radius (56px gold circle) if interactable
   */
  public addEntityWireframes(
    ex: number,
    ey: number,
    type: string,
    isInteractable: boolean = false,
    radius: number = 56
  ): void {
    if (type === 'monster' || type === 'enemy' || type === 'boss') {
      // Monster hurtbox: red wireframe
      this.allocWireframe('hurtbox', ex - 12, ey - 20, 24, 24, 0, 0, 0, 0xef4444, 0.85, 0.15);
      // Feet collider: 14x8
      this.allocWireframe('footprint', ex - 7, ey + 4, 14, 8, 0, 0, 0, 0x22c55e, 0.8, 0.1);
    } else if (type === 'npc' || type === 'wildlife') {
      // Friendly NPC hurtbox: cyan
      this.allocWireframe('hurtbox', ex - 10, ey - 20, 20, 24, 0, 0, 0, 0x38bdf8, 0.85, 0.1);
      // Feet collider
      this.allocWireframe('footprint', ex - 6, ey + 4, 12, 8, 0, 0, 0, 0x22c55e, 0.8, 0.1);
    } else if (type === 'item') {
      // Dropped loot item box: yellow
      this.allocWireframe('hitbox', ex - 6, ey - 6, 12, 12, 0, 0, 0, 0xfacc15, 0.85, 0.2);
    }

    // Interaction Proximity Radius (56px)
    if (isInteractable) {
      this.allocWireframe('interaction', ex, ey, 0, 0, radius, 0, Math.PI * 2, 0xeab308, 0.6, 0.05);
    }
  }

  /**
   * Computes wireframe for solid static obstacle (tree trunk, wall, rock).
   */
  public addObstacleWireframe(ox: number, oy: number, ow: number, oh: number): void {
    this.allocWireframe('obstacle', ox, oy, ow, oh, 0, 0, 0, 0x84cc16, 0.75, 0.1);
  }
}

export const telemetryProfiler = new TelemetryProfiler();
