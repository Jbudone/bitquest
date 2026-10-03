// shared/src/netcode/hermite.ts
// Cubic Hermite Spline Velocity Extrapolation & Interpolator
// Issue #51

export interface HermiteSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
}

export function evaluateHermiteSpline(
  p0: HermiteSnapshot,
  p1: HermiteSnapshot,
  t: number // Normalized progression 0.0 to 1.0
): { x: number; y: number; vx: number; vy: number } {
  // Clamp t to [0, 1]
  const clampedT = Math.max(0, Math.min(1, t));
  const t2 = clampedT * clampedT;
  const t3 = t2 * clampedT;

  // Cubic Hermite basis polynomials
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + clampedT;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  // Scale velocities by duration interval in seconds
  const dt = Math.max(0.016, (p1.time - p0.time) / 1000);
  const m0x = p0.vx * dt;
  const m0y = p0.vy * dt;
  const m1x = p1.vx * dt;
  const m1y = p1.vy * dt;

  const x = h00 * p0.x + h10 * m0x + h01 * p1.x + h11 * m1x;
  const y = h00 * p0.y + h10 * m0y + h01 * p1.y + h11 * m1y;

  // 1st derivative for smooth velocity vector continuity
  const dh00 = 6 * t2 - 6 * clampedT;
  const dh10 = 3 * t2 - 4 * clampedT + 1;
  const dh01 = -6 * t2 + 6 * clampedT;
  const dh11 = 3 * t2 - 2 * clampedT;

  const vx = (dh00 * p0.x + dh10 * m0x + dh01 * p1.x + dh11 * m1x) / dt;
  const vy = (dh00 * p0.y + dh10 * m0y + dh01 * p1.y + dh11 * m1y) / dt;

  return { x, y, vx, vy };
}

export class HermiteInterpolator {
  private p0: HermiteSnapshot;
  private p1: HermiteSnapshot;
  private elapsed = 0;
  private duration = 40; // 25Hz server tick default = 40ms

  constructor(initialX: number, initialY: number, now = Date.now()) {
    this.p0 = { x: initialX, y: initialY, vx: 0, vy: 0, time: now - 40 };
    this.p1 = { x: initialX, y: initialY, vx: 0, vy: 0, time: now };
  }

  public pushTarget(targetX: number, targetY: number, now = Date.now()) {
    const dt = Math.max(16, now - this.p1.time);
    const vx = ((targetX - this.p1.x) / dt) * 1000;
    const vy = ((targetY - this.p1.y) / dt) * 1000;

    this.p0 = { ...this.p1 };
    this.p1 = { x: targetX, y: targetY, vx, vy, time: now };
    this.duration = dt;
    this.elapsed = 0;
  }

  public update(deltaMs: number): { x: number; y: number; vx: number; vy: number } {
    this.elapsed += deltaMs;
    const t = this.duration > 0 ? this.elapsed / this.duration : 1;
    return evaluateHermiteSpline(this.p0, this.p1, t);
  }

  public get currentX(): number {
    return this.p1.x;
  }

  public get currentY(): number {
    return this.p1.y;
  }
}
