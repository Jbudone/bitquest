// shared/src/netcode/prediction.ts
// Local Movement Prediction, Server Authoritative Rewind & Input Reconciliation
// Issue #51

export interface PredictedMovement {
  seq: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  timestamp: number;
}

export class ClientPredictionManager {
  private pendingInputs: PredictedMovement[] = [];
  private sequenceCounter = 0;
  private maxHistory = 120; // 2 seconds of 60 FPS input history

  public recordPredictedStep(x: number, y: number, dx: number, dy: number): PredictedMovement {
    const step: PredictedMovement = {
      seq: ++this.sequenceCounter,
      x,
      y,
      dx,
      dy,
      timestamp: Date.now()
    };
    this.pendingInputs.push(step);
    if (this.pendingInputs.length > this.maxHistory) {
      this.pendingInputs.shift();
    }
    return step;
  }

  // Authoritative Reconciliation:
  // When server sends back verified position for seq `ackSeq`,
  // discard acknowledged inputs and re-simulate unacknowledged inputs.
  public reconcile(
    authoritativeX: number,
    authoritativeY: number,
    ackSeq: number,
    reconciliationThreshold = 12 // pixels
  ): { x: number; y: number; corrected: boolean } {
    // 1. Remove all inputs acknowledged by the server
    this.pendingInputs = this.pendingInputs.filter(inp => inp.seq > ackSeq);

    // 2. Measure discrepancy against pre-replay predicted position
    const currentPredicted = this.pendingInputs[this.pendingInputs.length - 1];
    const prevPredX = currentPredicted ? currentPredicted.x : authoritativeX;
    const prevPredY = currentPredicted ? currentPredicted.y : authoritativeY;

    // Replay all unacknowledged pending inputs on top of authoritative baseline
    let replayX = authoritativeX;
    let replayY = authoritativeY;

    for (let i = 0; i < this.pendingInputs.length; i++) {
      const inp = this.pendingInputs[i]!;
      replayX += inp.dx;
      replayY += inp.dy;
      // Update recorded position after rewind replay
      inp.x = replayX;
      inp.y = replayY;
    }

    const discrepancy = Math.hypot(prevPredX - replayX, prevPredY - replayY);
    const corrected = discrepancy > reconciliationThreshold;

    return {
      x: replayX,
      y: replayY,
      corrected
    };
  }

  public get latestSeq(): number {
    return this.sequenceCounter;
  }

  public get pendingCount(): number {
    return this.pendingInputs.length;
  }

  public clear() {
    this.pendingInputs.length = 0;
    this.sequenceCounter = 0;
  }
}

export class ServerMovementValidator {
  public static readonly MAX_PLAYER_SPEED = 720; // px/sec (base 150, roll 260, sprint/boost 375-650)
  public static readonly TOLERANCE = 64; // px buffer for network jitter & frame drops

  // Validates player movement packet against speed limits & physical feasibility
  public static validateMovement(
    currentX: number,
    currentY: number,
    newX: number,
    newY: number,
    dtMs: number,
    isWalkable: (x: number, y: number) => boolean
  ): { valid: boolean; correctedX: number; correctedY: number } {
    const dist = Math.hypot(newX - currentX, newY - currentY);
    const maxAllowedDist = (this.MAX_PLAYER_SPEED * (dtMs / 1000)) + this.TOLERANCE;

    // Speed violation check
    if (dist > maxAllowedDist) {
      return { valid: false, correctedX: currentX, correctedY: currentY };
    }

    // Wall collision penetration check
    if (!isWalkable(newX, newY)) {
      // Check horizontal sliding
      if (isWalkable(newX, currentY)) {
        return { valid: true, correctedX: newX, correctedY: currentY };
      }
      // Check vertical sliding
      if (isWalkable(currentX, newY)) {
        return { valid: true, correctedX: currentX, correctedY: newY };
      }
      // Stuck in obstacle: rewind to last valid position
      return { valid: false, correctedX: currentX, correctedY: currentY };
    }

    return { valid: true, correctedX: newX, correctedY: newY };
  }
}
