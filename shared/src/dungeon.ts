// shared/src/dungeon.ts
// BitQuest The Sunken Catacombs Dungeon Engine
// Issue #22: Task 7.4: Subterranean puzzle dungeon with light/dark mechanics, moving platforms, and multi-phase boss

export type DungeonFloorId = 'f1' | 'f2' | 'f3';

export interface DungeonFloorMetadata {
  id: DungeonFloorId;
  name: string;
  subtitle: string;
  icon: string;
  spawnX: number;
  spawnY: number;
  cameraBounds: { x: number; y: number; width: number; height: number };
  ambientColor: number;
  ambientAlpha: number;
}

export const CATACOMBS_FLOORS: Record<DungeonFloorId, DungeonFloorMetadata> = {
  f1: {
    id: 'f1',
    name: 'The Sunken Catacombs',
    subtitle: 'Floor 1: The Forgotten Crypts',
    icon: '🗝️',
    spawnX: 1024,
    spawnY: 2320,
    cameraBounds: { x: 0, y: 2150, width: 2048, height: 1600 },
    ambientColor: 0x05040a,
    ambientAlpha: 0.85
  },
  f2: {
    id: 'f2',
    name: 'The Sunken Catacombs',
    subtitle: 'Floor 2: The Abyssal Sanctuary',
    icon: '💀',
    spawnX: 1024,
    spawnY: 4120,
    cameraBounds: { x: 0, y: 3950, width: 2048, height: 1600 },
    ambientColor: 0x07020d,
    ambientAlpha: 0.90
  },
  f3: {
    id: 'f3',
    name: 'The Sunken Catacombs',
    subtitle: 'Floor 3: The Abyssal Necropolis',
    icon: '👑',
    spawnX: 1024,
    spawnY: 5920,
    cameraBounds: { x: 0, y: 5750, width: 2048, height: 1600 },
    ambientColor: 0x030712,
    ambientAlpha: 0.94
  }
};

export const DUNGEON_CONSTANTS = {
  // Overworld entrance in Ruins Sanctuary behind Baron
  OVERWORLD_ENTRANCE: { x: 1024, y: 140 },
  OVERWORLD_EXIT_WARP: { x: 1024, y: 240 },

  // Floor 1 coordinates
  F1_SPAWN: { x: 1024, y: 2320 },
  F1_TORCHES: [
    { id: 'torch_f1_1', x: 920, y: 2660 },
    { id: 'torch_f1_2', x: 1024, y: 2620 },
    { id: 'torch_f1_3', x: 1128, y: 2660 }
  ],
  F1_GATE: { id: 'gate_f1_hall', x: 1024, y: 2760 },
  F1_CHASM: { minX: 760, maxX: 1288, minY: 2980, maxY: 3120 },
  F1_PLATFORM: { id: 'platform_f1', minX: 840, maxX: 1208, y: 3050, speed: 55 },
  F1_PLATFORM_RESPAWN: { x: 1024, y: 2920 },
  F1_STAIRS_DOWN: { id: 'stairs_to_f2', x: 1024, y: 3480 },
  F1_STAIRS_UP: { id: 'stairs_f1_to_overworld', x: 1024, y: 2260 },

  // Floor 2 coordinates
  F2_SPAWN: { x: 1024, y: 4120 },
  F2_STAIRS_UP: { id: 'stairs_f2_to_f1', x: 1024, y: 4060 },
  F2_TORCHES: [
    { id: 'torch_f2_nw', x: 840, y: 4520 },
    { id: 'torch_f2_ne', x: 1208, y: 4520 },
    { id: 'torch_f2_sw', x: 840, y: 4880 },
    { id: 'torch_f2_se', x: 1208, y: 4880 }
  ],
  F2_BOSS_SPAWN: { x: 1024, y: 4700 },
  // Floor 2 descent to Floor 3
  F2_STAIRS_DOWN: { id: 'stairs_f2_to_f3', x: 1024, y: 5080 },

  // Floor 3 coordinates (The Abyssal Necropolis)
  F3_SPAWN: { x: 1024, y: 5920 },
  F3_STAIRS_UP: { id: 'stairs_f3_to_f2', x: 1024, y: 5860 },
  F3_VOID_CHASM: { minX: 740, maxX: 1308, minY: 6180, maxY: 6360 },
  F3_PLATFORM_A: { id: 'platform_f3_a', minX: 800, maxX: 1010, y: 6270, speed: 60 },
  F3_PLATFORM_B: { id: 'platform_f3_b', minX: 1038, maxX: 1248, y: 6270, speed: 60 },
  F3_PLATFORM_RESPAWN: { x: 1024, y: 6120 },
  F3_PYLONS: [
    { id: 'pylon_f3_nw', x: 880, y: 6580 },
    { id: 'pylon_f3_ne', x: 1168, y: 6580 },
    { id: 'pylon_f3_sw', x: 880, y: 6860 },
    { id: 'pylon_f3_se', x: 1168, y: 6860 }
  ],
  F3_BOSS_SPAWN: { x: 1024, y: 6720 },
  F3_EXIT_PORTAL: { id: 'portal_f3_exit', x: 1024, y: 6540 },
  F3_ROYAL_VAULT: { id: 'chest_catacombs_royal_vault', x: 1024, y: 6920 }
};

export const MALAKOR_SPECS = {
  id: 'boss_malakor',
  name: 'Malakor the Tomb Warden',
  maxHp: 24,
  phase1: {
    cryptSpikeIntervalMs: 3800,
    cryptSpikeDamage: 2,
    cryptSpikeRadius: 40,
    cryptSpikeTelegraphMs: 650,
    scytheCleaveRange: 50,
    scytheCleaveDamage: 2,
    teleportIntervalMs: 8000
  },
  phase2: {
    thresholdHp: 12,
    darknessShroudMitigationPct: 0.75,
    soulBarrageIntervalMs: 4200,
    soulBarrageDamage: 2,
    soulBarrageCount: 3,
    requiredTorchesToStun: 4,
    stunDurationMs: 3200
  }
};

export const VESPERA_SPECS = {
  id: 'boss_vespera',
  name: 'Arch-Lich Vespera, Queen of the Void',
  maxHp: 36,
  phase1: {
    voidOrbIntervalMs: 3400,
    voidOrbDamage: 2,
    voidOrbSpeed: 95,
    necroticCleaveRange: 55,
    necroticCleaveDamage: 3,
    teleportIntervalMs: 6500
  },
  phase2: {
    thresholdHp: 18,
    pylonCount: 4,
    pylonHp: 6,
    voidNovaIntervalMs: 4000,
    voidNovaDamage: 3,
    voidNovaRadius: 90,
    voidNovaTelegraphMs: 800,
    stunDurationMs: 4000,
    vulnerableDamageBonusPct: 0.50
  }
};

export class DungeonManager {
  /**
   * Deterministic, zero-allocation moving platform position calculation.
   * Ping-pongs linearly between minX and maxX without GC allocations.
   */
  public static getPlatformPosition(
    timeMs: number,
    out?: { x: number; y: number; vx: number },
    minX = DUNGEON_CONSTANTS.F1_PLATFORM.minX,
    maxX = DUNGEON_CONSTANTS.F1_PLATFORM.maxX,
    speed = DUNGEON_CONSTANTS.F1_PLATFORM.speed,
    fixedY = DUNGEON_CONSTANTS.F1_PLATFORM.y
  ): { x: number; y: number; vx: number } {
    const span = maxX - minX;
    const durationOneWayMs = (span / speed) * 1000;
    const cycleMs = durationOneWayMs * 2;
    const modTime = timeMs % cycleMs;
    const res = out || { x: 0, y: 0, vx: 0 };

    if (modTime < durationOneWayMs) {
      const progress = modTime / durationOneWayMs;
      res.x = minX + span * progress;
      res.y = fixedY;
      res.vx = speed;
    } else {
      const progress = (modTime - durationOneWayMs) / durationOneWayMs;
      res.x = maxX - span * progress;
      res.y = fixedY;
      res.vx = -speed;
    }
    return res;
  }

  /**
   * Checks whether coordinates fall inside the bottomless abyssal chasm on Floor 1.
   */
  public static isInsideAbyss(x: number, y: number): boolean {
    const chasm = DUNGEON_CONSTANTS.F1_CHASM;
    return x >= chasm.minX && x <= chasm.maxX && y >= chasm.minY && y <= chasm.maxY;
  }

  /**
   * Checks whether coordinates fall inside the void chasm on Floor 3.
   */
  public static isInsideVoidChasm(x: number, y: number): boolean {
    const chasm = DUNGEON_CONSTANTS.F3_VOID_CHASM;
    return x >= chasm.minX && x <= chasm.maxX && y >= chasm.minY && y <= chasm.maxY;
  }

  /**
   * Checks whether a character is safely standing atop a moving stone platform.
   */
  public static isOnMovingPlatform(
    playerX: number,
    playerY: number,
    platformX: number,
    platformY: number
  ): boolean {
    const halfWidth = 36;
    const halfHeight = 22;
    return (
      Math.abs(playerX - platformX) <= halfWidth &&
      Math.abs(playerY - platformY) <= halfHeight
    );
  }

  /**
   * Identifies which dungeon floor or overworld zone a coordinate belongs to.
   */
  public static getFloorFromY(y: number): 'overworld' | 'f1' | 'f2' | 'f3' {
    if (y < 2000) return 'overworld';
    if (y >= 2000 && y < 3800) return 'f1';
    if (y >= 3800 && y < 5600) return 'f2';
    return 'f3';
  }
}
