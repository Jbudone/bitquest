/**
 * Companion Pets & Mountable Wildlife Engine
 * Task 7.8 / Issue #26
 *
 * Zero-allocation algorithms for loyal animal companions (distance spring following,
 * secret sniffing, enemy threat barking) and mountable wildlife (giant frogs with
 * springy hops and +55% traversal speed).
 */

import type { Direction, EntityData, PlayerData } from './types';

export interface PetDefinition {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird';
  dialogueKey: string;
  idealFollowDistance: number;
  maxFollowDistance: number;
  sprintDistance: number;
  teleportDistance: number;
  springStrength: number;
  sniffRadius: number;
  barkRadius: number;
  initialX: number;
  initialY: number;
}

export interface MountDefinition {
  id: string;
  name: string;
  species: 'frog' | 'stag' | 'boar';
  speedMultiplier: number;
  mountRadius: number;
  hopIntervalMs: number;
  hopElevation: number;
  initialX: number;
  initialY: number;
}

// ============================================================
// Registry of Pets and Mounts
// ============================================================
export const PET_DEFINITIONS: Record<string, PetDefinition> = {
  wildlife_buster: {
    id: 'wildlife_buster',
    name: 'Buster',
    species: 'dog',
    dialogueKey: 'dog_buster',
    idealFollowDistance: 36,
    maxFollowDistance: 48,
    sprintDistance: 220,
    teleportDistance: 580,
    springStrength: 0.12,
    sniffRadius: 120,
    barkRadius: 110,
    initialX: 1080,
    initialY: 1180
  }
};

export const MOUNT_DEFINITIONS: Record<string, MountDefinition> = {
  mount_frog_mossy: {
    id: 'mount_frog_mossy',
    name: "Barnaby's Boghopper",
    species: 'frog',
    speedMultiplier: 1.55,
    mountRadius: 56,
    hopIntervalMs: 340,
    hopElevation: 10,
    initialX: 780,
    initialY: 1320
  }
};

// ============================================================
// Zero-Allocation Vector Buffer for Pet Calculations
// ============================================================
class PetCalculationBuffer {
  public x: number = 0;
  public y: number = 0;
  public dist: number = 0;
  public moved: boolean = false;
  public state: 'idle' | 'sniff' | 'bark' | 'run' | 'nap' = 'idle';
}

const BUFFER = new PetCalculationBuffer();

export class PetEngine {
  public static readonly FOLLOW_BUFFER = BUFFER;

  /**
   * Computes the target offset position behind the player based on their facing direction.
   */
  public static calculateTargetPosition(
    ownerX: number,
    ownerY: number,
    ownerDirection: Direction,
    distance: number = 36
  ): { x: number; y: number } {
    BUFFER.x = ownerX;
    BUFFER.y = ownerY;

    switch (ownerDirection) {
      case 'down':
        BUFFER.y -= distance;
        break;
      case 'up':
        BUFFER.y += distance;
        break;
      case 'left':
        BUFFER.x += distance;
        break;
      case 'right':
        BUFFER.x -= distance;
        break;
    }

    return BUFFER;
  }

  /**
   * Performs distance spring physics calculation from current pet position to target.
   * Modifies BUFFER in place to maintain zero allocations.
   */
  public static stepSpringFollow(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
    springStrength: number = 0.12,
    teleportThreshold: number = 580
  ): PetCalculationBuffer {
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const dist = Math.hypot(dx, dy);

    BUFFER.dist = dist;

    // 1. Extreme distance: Instant catch-up teleport
    if (dist > teleportThreshold) {
      BUFFER.x = targetX;
      BUFFER.y = targetY;
      BUFFER.moved = true;
      BUFFER.state = 'idle';
      return BUFFER;
    }

    // 2. Close enough: stay idle / wag
    if (dist < 4.0) {
      BUFFER.x = currentX;
      BUFFER.y = currentY;
      BUFFER.moved = false;
      BUFFER.state = 'idle';
      return BUFFER;
    }

    // 3. Sprint vs Trot spring calculation
    let effectiveStrength = springStrength;
    if (dist > 140) {
      effectiveStrength = Math.min(0.25, springStrength * 1.8);
      BUFFER.state = 'run';
    } else {
      BUFFER.state = 'run';
    }

    BUFFER.x = currentX + dx * effectiveStrength;
    BUFFER.y = currentY + dy * effectiveStrength;
    BUFFER.moved = true;
    return BUFFER;
  }

  /**
   * Evaluates if any unopened secret chests or hidden caches are within sniffing radius.
   */
  public static detectNearbySecrets(
    petX: number,
    petY: number,
    entities: Iterable<EntityData>,
    radius: number = 120
  ): EntityData | null {
    let closest: EntityData | null = null;
    let minDist = radius;

    for (const ent of entities) {
      if (ent.type === 'chest' && !ent.state?.opened) {
        const d = Math.hypot(ent.x - petX, ent.y - petY);
        if (d < minDist) {
          minDist = d;
          closest = ent;
        }
      }
    }

    return closest;
  }

  /**
   * Evaluates if any hostile non-destroyed enemies or bosses are within barking radius.
   */
  public static detectNearbyEnemies(
    petX: number,
    petY: number,
    entities: Iterable<EntityData>,
    radius: number = 110
  ): EntityData | null {
    let closest: EntityData | null = null;
    let minDist = radius;

    for (const ent of entities) {
      if ((ent.type === 'enemy' || ent.type === 'boss') && !ent.state?.destroyed) {
        const d = Math.hypot(ent.x - petX, ent.y - petY);
        if (d < minDist) {
          minDist = d;
          closest = ent;
        }
      }
    }

    return closest;
  }

  /**
   * Checks if a player is in proximity to mount an available wildlife mount.
   */
  public static canMount(
    playerX: number,
    playerY: number,
    mountX: number,
    mountY: number,
    radius: number = 56
  ): boolean {
    return Math.hypot(playerX - mountX, playerY - mountY) <= radius;
  }
}
