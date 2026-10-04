// shared/src/minigames.ts
// BitQuest Whispering Meadow Archery Range & Crystal Lake Boat Slalom Minigames Engine
// Issue #40 / Milestone 5: Arcade scoring, moving targets, boat physics, and leaderboard ranks

export type MinigameType = 'archery_range' | 'boat_slalom';

export type MinigameRank = 'none' | 'bronze' | 'silver' | 'gold' | 'master';

export interface ArcheryTarget {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  range: 'short' | 'medium' | 'long' | 'bonus';
  points: number;
  radius: number;
  moveSpeed: number; // Pixels per second
  moveAmplitude: number; // Horizontal oscillation span
  phaseOffset: number;
  active: boolean;
}

export interface ArcherySession {
  active: boolean;
  timeLeftSec: number;
  totalTimeSec: number;
  score: number;
  combo: number;
  maxCombo: number;
  shotsFired: number;
  shotsHit: number;
  rank: MinigameRank;
}

export interface SlalomCheckpoint {
  index: number;
  x: number;
  y: number;
  radius: number;
  cleared: boolean;
}

export interface BoatSlalomSession {
  active: boolean;
  elapsedTimeSec: number;
  currentCheckpointIndex: number;
  totalCheckpoints: number;
  penaltySeconds: number;
  finished: boolean;
  finalTimeSec: number;
  rank: MinigameRank;
}

export const ARCHERY_CONFIG = {
  DURATION_SEC: 30,
  RANGE_CENTER: { x: 1600, y: 550 },
  TARGETS: [
    // Short range (close, stationary or slow)
    { id: 'target_s1', range: 'short', x: 1560, y: 460, points: 10, radius: 18, moveSpeed: 0, moveAmplitude: 0, phaseOffset: 0 },
    { id: 'target_s2', range: 'short', x: 1640, y: 460, points: 10, radius: 18, moveSpeed: 0, moveAmplitude: 0, phaseOffset: 0 },
    // Medium range (moderate distance, swaying)
    { id: 'target_m1', range: 'medium', x: 1540, y: 390, points: 25, radius: 15, moveSpeed: 45, moveAmplitude: 60, phaseOffset: 0 },
    { id: 'target_m2', range: 'medium', x: 1660, y: 390, points: 25, radius: 15, moveSpeed: 50, moveAmplitude: 70, phaseOffset: Math.PI },
    // Long range (far back, rapid traverse)
    { id: 'target_l1', range: 'long', x: 1600, y: 320, points: 50, radius: 12, moveSpeed: 80, moveAmplitude: 110, phaseOffset: Math.PI / 2 },
    // Golden bonus target (tiny, high speed)
    { id: 'target_bonus', range: 'bonus', x: 1600, y: 260, points: 100, radius: 9, moveSpeed: 120, moveAmplitude: 140, phaseOffset: Math.PI / 4 }
  ],
  RANKS: {
    BRONZE: 150,
    SILVER: 320,
    GOLD: 550,
    MASTER: 850
  }
};

export const SLALOM_CONFIG = {
  DOCK_START: { x: 1024, y: 1380 },
  CHECKPOINTS: [
    { index: 0, x: 1024, y: 1460, radius: 36 },
    { index: 1, x: 920, y: 1540, radius: 36 },
    { index: 2, x: 840, y: 1660, radius: 36 },
    { index: 3, x: 1024, y: 1740, radius: 36 },
    { index: 4, x: 1200, y: 1660, radius: 36 },
    { index: 5, x: 1120, y: 1540, radius: 36 },
    { index: 6, x: 1024, y: 1420, radius: 40 } // Finish Line
  ],
  RANKS: {
    MASTER: 18.0,
    GOLD: 24.0,
    SILVER: 32.0,
    BRONZE: 42.0
  }
};

export class MinigameEngine {
  /**
   * Initializes a fresh Archery Range session.
   */
  public static createArcherySession(): ArcherySession {
    return {
      active: false,
      timeLeftSec: ARCHERY_CONFIG.DURATION_SEC,
      totalTimeSec: ARCHERY_CONFIG.DURATION_SEC,
      score: 0,
      combo: 0,
      maxCombo: 0,
      shotsFired: 0,
      shotsHit: 0,
      rank: 'none'
    };
  }

  /**
   * Evaluates archery targets positions dynamically over time without GC allocations.
   */
  public static getTargetPosition(target: ArcheryTarget, elapsedSec: number): { x: number; y: number } {
    if (target.moveAmplitude === 0) {
      return { x: target.baseX, y: target.baseY };
    }
    const offset = Math.sin(elapsedSec * (target.moveSpeed / target.moveAmplitude) + target.phaseOffset) * target.moveAmplitude;
    return { x: target.baseX + offset, y: target.baseY };
  }

  /**
   * Tests if an arrow trajectory hits an archery target.
   */
  public static testArrowHit(
    arrowX: number,
    arrowY: number,
    targetX: number,
    targetY: number,
    radius: number
  ): boolean {
    const dist = Math.hypot(arrowX - targetX, arrowY - targetY);
    return dist <= radius;
  }

  /**
   * Registers an arrow hit or miss and computes score with combo multipliers.
   */
  public static registerArcheryShot(
    session: ArcherySession,
    hitTarget: ArcheryTarget | null
  ): { pointsAwarded: number; newCombo: number } {
    session.shotsFired++;

    if (!hitTarget) {
      // Miss breaks combo
      session.combo = 0;
      return { pointsAwarded: 0, newCombo: 0 };
    }

    session.shotsHit++;
    session.combo++;
    if (session.combo > session.maxCombo) {
      session.maxCombo = session.combo;
    }

    // Combo multiplier: 1.0x (1-2), 1.5x (3-5), 2.0x (6-9), 3.0x (10+)
    let multiplier = 1.0;
    if (session.combo >= 10) multiplier = 3.0;
    else if (session.combo >= 6) multiplier = 2.0;
    else if (session.combo >= 3) multiplier = 1.5;

    const pointsAwarded = Math.round(hitTarget.points * multiplier);
    session.score += pointsAwarded;
    session.rank = this.evaluateArcheryRank(session.score);

    return { pointsAwarded, newCombo: session.combo };
  }

  /**
   * Evaluates final rank medal for archery score.
   */
  public static evaluateArcheryRank(score: number): MinigameRank {
    if (score >= ARCHERY_CONFIG.RANKS.MASTER) return 'master';
    if (score >= ARCHERY_CONFIG.RANKS.GOLD) return 'gold';
    if (score >= ARCHERY_CONFIG.RANKS.SILVER) return 'silver';
    if (score >= ARCHERY_CONFIG.RANKS.BRONZE) return 'bronze';
    return 'none';
  }

  /**
   * Initializes a fresh Crystal Lake Boat Slalom session.
   */
  public static createBoatSlalomSession(): BoatSlalomSession {
    return {
      active: false,
      elapsedTimeSec: 0,
      currentCheckpointIndex: 0,
      totalCheckpoints: SLALOM_CONFIG.CHECKPOINTS.length,
      penaltySeconds: 0,
      finished: false,
      finalTimeSec: 0,
      rank: 'none'
    };
  }

  /**
   * Tests whether boat has entered the active checkpoint's radius.
   */
  public static testCheckpointCollision(
    boatX: number,
    boatY: number,
    session: BoatSlalomSession
  ): boolean {
    if (!session.active || session.finished) return false;

    const targetCp = SLALOM_CONFIG.CHECKPOINTS[session.currentCheckpointIndex];
    if (!targetCp) return false;

    const dist = Math.hypot(boatX - targetCp.x, boatY - targetCp.y);
    if (dist <= targetCp.radius) {
      session.currentCheckpointIndex++;
      if (session.currentCheckpointIndex >= session.totalCheckpoints) {
        // Finished race!
        session.finished = true;
        session.active = false;
        session.finalTimeSec = Math.round((session.elapsedTimeSec + session.penaltySeconds) * 100) / 100;
        session.rank = this.evaluateSlalomRank(session.finalTimeSec);
      }
      return true;
    }
    return false;
  }

  /**
   * Evaluates rank medal for Boat Slalom completion time in seconds.
   */
  public static evaluateSlalomRank(totalTimeSec: number): MinigameRank {
    if (totalTimeSec <= SLALOM_CONFIG.RANKS.MASTER) return 'master';
    if (totalTimeSec <= SLALOM_CONFIG.RANKS.GOLD) return 'gold';
    if (totalTimeSec <= SLALOM_CONFIG.RANKS.SILVER) return 'silver';
    if (totalTimeSec <= SLALOM_CONFIG.RANKS.BRONZE) return 'bronze';
    return 'none';
  }
}
