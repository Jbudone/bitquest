// shared/src/netcode/deltaSync.ts
// Delta State Synchronization Engine for High-Efficiency Broadcasts
// Issue #51

import type { Direction, PlayerAnimState } from '../types';

export interface PlayerTickSnapshot {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  anim: PlayerAnimState;
  carryingItem: string | null;
}

export class DeltaSyncEngine {
  private previousSnapshots = new Map<string, PlayerTickSnapshot>();

  // Computes only the players whose position, direction, anim or carried item changed
  public computeDelta(currentPlayers: PlayerTickSnapshot[], fullSyncIntervalTicks = 50): {
    delta: PlayerTickSnapshot[];
    isFullSync: boolean;
  } {
    const delta: PlayerTickSnapshot[] = [];
    const isFullSync = false;

    for (let i = 0; i < currentPlayers.length; i++) {
      const curr = currentPlayers[i]!;
      const prev = this.previousSnapshots.get(curr.id);

      if (!prev) {
        // New player: always include
        delta.push(curr);
        this.previousSnapshots.set(curr.id, { ...curr });
        continue;
      }

      // Check if state delta exceeds threshold
      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);
      const moved = dx >= 0.5 || dy >= 0.5;
      const stateChanged =
        curr.direction !== prev.direction ||
        curr.anim !== prev.anim ||
        curr.carryingItem !== prev.carryingItem;

      if (moved || stateChanged) {
        delta.push(curr);
        this.previousSnapshots.set(curr.id, { ...curr });
      }
    }

    return { delta, isFullSync };
  }

  public removePlayer(playerId: string) {
    this.previousSnapshots.delete(playerId);
  }

  public clear() {
    this.previousSnapshots.clear();
  }
}
