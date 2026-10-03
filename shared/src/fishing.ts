// shared/src/fishing.ts
// BitQuest Cozy Bobber Fishing & River Secrets Engine
// Issue #23 / Task 7.5: Mini-game with tension-meter bobbing, water ripples, rare fish species, and river treasure chests

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type WaterBiome = 'meadow' | 'river' | 'lake' | 'catacombs' | 'all';

export interface FishSpecies {
  id: string;
  name: string;
  rarity: FishRarity;
  minSizeCm: number;
  maxSizeCm: number;
  baseValue: number;
  description: string;
  biome: WaterBiome;
  color: string;
  icon: string;
  sweetSpotWidthPct: number; // 0.12 (difficult) to 0.32 (forgiving)
  pullResistance: number;    // rate tension changes
  erraticFrequency: number;  // oscillation frequency of sweet spot (Hz)
  isTreasure?: boolean;
}

export interface FishLogEntry {
  speciesId: string;
  caughtCount: number;
  maxSizeCm: number;
  firstCaughtAt: number;
}

export type PlayerFishLog = Record<string, FishLogEntry>;

export const FISH_SPECIES: Record<string, FishSpecies> = {
  copper_minnow: {
    id: 'copper_minnow',
    name: 'Copper Minnow',
    rarity: 'common',
    minSizeCm: 4.0,
    maxSizeCm: 9.5,
    baseValue: 4,
    description: 'A shimmering bronze minnow that darts through shallow brooks and reeds.',
    biome: 'meadow',
    color: '#d97706',
    icon: '🐟',
    sweetSpotWidthPct: 0.32,
    pullResistance: 0.55,
    erraticFrequency: 0.6
  },
  glowing_perch: {
    id: 'glowing_perch',
    name: 'Glowing Perch',
    rarity: 'common',
    minSizeCm: 9.0,
    maxSizeCm: 18.0,
    baseValue: 7,
    description: 'Bioluminescent fins cast a faint teal glow across shaded riverbanks.',
    biome: 'all',
    color: '#06b6d4',
    icon: '🐠',
    sweetSpotWidthPct: 0.30,
    pullResistance: 0.60,
    erraticFrequency: 0.7
  },
  brook_trout: {
    id: 'brook_trout',
    name: 'Azure Brook Trout',
    rarity: 'common',
    minSizeCm: 14.0,
    maxSizeCm: 28.0,
    baseValue: 10,
    description: 'Speckled with golden vermiculations. A swift, lively freshwater swimmer.',
    biome: 'river',
    color: '#3b82f6',
    icon: '🐟',
    sweetSpotWidthPct: 0.28,
    pullResistance: 0.65,
    erraticFrequency: 0.8
  },
  mossy_bass: {
    id: 'mossy_bass',
    name: 'Mossy Bog Bass',
    rarity: 'uncommon',
    minSizeCm: 20.0,
    maxSizeCm: 38.0,
    baseValue: 18,
    description: 'Draped in velvety lake moss. Strikes lures with sudden, stubborn tenacity.',
    biome: 'lake',
    color: '#10b981',
    icon: '🐡',
    sweetSpotWidthPct: 0.24,
    pullResistance: 0.75,
    erraticFrequency: 1.0
  },
  shimmer_salmon: {
    id: 'shimmer_salmon',
    name: 'Shimmering River Salmon',
    rarity: 'uncommon',
    minSizeCm: 30.0,
    maxSizeCm: 52.0,
    baseValue: 28,
    description: 'Leaps gracefully through churning rapids with iridescent pink scales.',
    biome: 'river',
    color: '#ec4899',
    icon: '🐟',
    sweetSpotWidthPct: 0.22,
    pullResistance: 0.85,
    erraticFrequency: 1.2
  },
  moonlit_catfish: {
    id: 'moonlit_catfish',
    name: 'Moonlit Catfish',
    rarity: 'rare',
    minSizeCm: 40.0,
    maxSizeCm: 70.0,
    baseValue: 55,
    description: 'A whiskered lake dweller revered by anglers. Drifts in deep silent waters.',
    biome: 'lake',
    color: '#8b5cf6',
    icon: '🐋',
    sweetSpotWidthPct: 0.18,
    pullResistance: 1.05,
    erraticFrequency: 1.5
  },
  golden_carp: {
    id: 'golden_carp',
    name: 'Ancient Golden Carp',
    rarity: 'rare',
    minSizeCm: 48.0,
    maxSizeCm: 82.0,
    baseValue: 90,
    description: 'A majestic koi with burnished golden armor plates. Symbol of prosperity.',
    biome: 'all',
    color: '#facc15',
    icon: '✨',
    sweetSpotWidthPct: 0.16,
    pullResistance: 1.20,
    erraticFrequency: 1.8
  },
  spectral_koi: {
    id: 'spectral_koi',
    name: 'Abyssal Spectral Koi',
    rarity: 'legendary',
    minSizeCm: 60.0,
    maxSizeCm: 105.0,
    baseValue: 180,
    description: 'An ethereal phantom fish native to subterranean crypt waters and sacred shrines.',
    biome: 'catacombs',
    color: '#a855f7',
    icon: '🌟',
    sweetSpotWidthPct: 0.13,
    pullResistance: 1.45,
    erraticFrequency: 2.2
  },
  sunken_chest: {
    id: 'sunken_chest',
    name: 'Waterlogged Sunken Lockbox',
    rarity: 'rare',
    minSizeCm: 22.0,
    maxSizeCm: 28.0,
    baseValue: 120,
    description: 'An iron-banded chest retrieved from river silt, overflowing with shiny coins and gems.',
    biome: 'all',
    color: '#ca8a04',
    icon: '📦',
    sweetSpotWidthPct: 0.19,
    pullResistance: 1.10,
    erraticFrequency: 0.5,
    isTreasure: true
  },
  waterlogged_boot: {
    id: 'waterlogged_boot',
    name: 'Old Waterlogged Boot',
    rarity: 'common',
    minSizeCm: 26.0,
    maxSizeCm: 32.0,
    baseValue: 2,
    description: 'A water-soaked leather boot covered in duckweed. Still holds historical charm!',
    biome: 'all',
    color: '#78350f',
    icon: '👢',
    sweetSpotWidthPct: 0.35,
    pullResistance: 0.45,
    erraticFrequency: 0.4,
    isTreasure: true
  }
};

export class FishingEngine {
  public static readonly TILE_SIZE = 32;
  public static readonly MIN_CAST_DISTANCE = 28;
  public static readonly MAX_CAST_DISTANCE = 160;

  // Zero-allocation buffer for position calculations
  private static posBuffer = { x: 0, y: 0 };

  /**
   * Checks whether coordinates match world water tiles.
   */
  public static isWaterTile(tileX: number, tileY: number, floor: string = 'overworld'): boolean {
    if (floor === 'overworld') {
      // 1. Whispering Meadow Azure River (tileX: 52-53, tileY: 1 to 54)
      if ((tileX === 52 || tileX === 53) && tileY >= 1 && tileY <= 54) {
        // Wooden footbridge across river at y: 29-30
        if (tileY === 29 || tileY === 30) return false;
        return true;
      }

      // 2. South Crystal Lake (tileX: 22 to 42, tileY: 41 to 54)
      if (tileX >= 22 && tileX <= 42 && tileY >= 41 && tileY <= 54) {
        // Wooden fishing pier extending into lake
        if ((tileX === 31 || tileX === 32) && tileY <= 44) return false;
        return true;
      }

      // 3. Central Town Fountain pool (tileX: 31-32, tileY: 28-29)
      if ((tileX === 31 || tileX === 32) && (tileY === 28 || tileY === 29)) {
        return true;
      }
    } else if (floor === 'f1' || floor === 'f2') {
      // Catacombs underground water channels & flooded sanctuary pools
      // F1 Chasm abyss water channels: x: 800..1240, y: 3000..3100
      if (tileX >= 25 && tileX <= 38 && tileY >= 94 && tileY <= 97) {
        return true;
      }
      // F2 Sanctuary pool around boss arena
      if (tileX >= 24 && tileX <= 40 && tileY >= 142 && tileY <= 146) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if world pixel coordinates are inside water.
   */
  public static isWaterPixel(px: number, py: number, floor: string = 'overworld'): boolean {
    const tx = Math.floor(px / this.TILE_SIZE);
    const ty = Math.floor(py / this.TILE_SIZE);
    return this.isWaterTile(tx, ty, floor);
  }

  /**
   * Identifies which biome water corresponds to.
   */
  public static getWaterBiome(px: number, py: number, floor: string = 'overworld'): WaterBiome {
    if (floor === 'f1' || floor === 'f2') return 'catacombs';
    const tx = Math.floor(px / this.TILE_SIZE);
    const ty = Math.floor(py / this.TILE_SIZE);

    if (tx === 52 || tx === 53) return 'river';
    if (tx >= 22 && tx <= 42 && ty >= 41 && ty <= 54) return 'lake';
    if (ty < 20) return 'meadow';
    return 'all';
  }

  /**
   * Checks whether a point is near the South Crystal Lake wooden fishing pier.
   */
  public static isPierHotspot(px: number, py: number): boolean {
    const tx = Math.floor(px / this.TILE_SIZE);
    const ty = Math.floor(py / this.TILE_SIZE);
    return (tx >= 29 && tx <= 34 && ty >= 41 && ty <= 46);
  }

  /**
   * Finds nearest valid water tile within casting reach for quick-cast keybind.
   */
  public static findNearestWater(
    playerX: number,
    playerY: number,
    facing: string,
    floor: string = 'overworld',
    out = { x: 0, y: 0 }
  ): { found: boolean; x: number; y: number } {
    let dx = 0;
    let dy = 0;
    if (facing === 'up') dy = -1;
    else if (facing === 'down') dy = 1;
    else if (facing === 'left') dx = -1;
    else if (facing === 'right') dx = 1;

    // Check directly ahead between 48px and 128px
    for (let dist = 48; dist <= 128; dist += 16) {
      const testX = playerX + dx * dist;
      const testY = playerY + dy * dist;
      if (this.isWaterPixel(testX, testY, floor)) {
        out.x = testX;
        out.y = testY;
        return { found: true, x: testX, y: testY };
      }
    }

    // Radial search if facing direction has no water
    for (let radius = 48; radius <= 112; radius += 24) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const testX = playerX + Math.cos(angle) * radius;
        const testY = playerY + Math.sin(angle) * radius;
        if (this.isWaterPixel(testX, testY, floor)) {
          out.x = testX;
          out.y = testY;
          return { found: true, x: testX, y: testY };
        }
      }
    }

    return { found: false, x: 0, y: 0 };
  }

  /**
   * Rolls a fish species matching the biome, with bonus luck for pier hotspots.
   */
  public static rollFish(biome: WaterBiome, isPier = false): FishSpecies {
    const pool = Object.values(FISH_SPECIES).filter(f => f.biome === biome || f.biome === 'all');
    if (pool.length === 0) return FISH_SPECIES.copper_minnow!;

    // Weight rarities: common=60, uncommon=25, rare=12, legendary=3 (Pier: rare & legendary 2x!)
    const rareMult = isPier ? 2.5 : 1.0;
    const weights: Record<FishRarity, number> = {
      common: isPier ? 40 : 60,
      uncommon: 25,
      rare: Math.round(12 * rareMult),
      legendary: Math.round(3 * rareMult)
    };

    let totalWeight = 0;
    const itemWeights = pool.map(item => {
      const w = weights[item.rarity] || 10;
      totalWeight += w;
      return { item, weight: totalWeight };
    });

    const roll = Math.random() * totalWeight;
    const chosen = itemWeights.find(w => roll <= w.weight)?.item;
    return chosen || pool[0]!;
  }

  /**
   * Calculates random catch size in centimeters.
   */
  public static rollFishSize(species: FishSpecies): number {
    const raw = species.minSizeCm + Math.random() * (species.maxSizeCm - species.minSizeCm);
    return Math.round(raw * 10) / 10;
  }

  /**
   * Evaluates one simulation step of the tension reeling minigame.
   * Zero heap allocations.
   */
  public static updateTensionStep(
    elapsedSec: number,
    state: {
      tension: number;
      sweetSpotCenter: number;
      sweetSpotWidth: number;
      reelProgress: number;
      pullResistance: number;
      erraticFrequency: number;
      timeInMinigame: number;
    },
    isHoldingReel: boolean
  ): {
    tension: number;
    sweetSpotCenter: number;
    reelProgress: number;
    inSweetSpot: boolean;
    snapped: boolean;
    escaped: boolean;
    caught: boolean;
  } {
    state.timeInMinigame += elapsedSec;

    // Sweet spot smoothly oscillates using multiple harmonics
    const t = state.timeInMinigame;
    const freq = state.erraticFrequency;
    const osc = Math.sin(t * freq * 2.8) * 0.22 + Math.cos(t * freq * 1.4) * 0.12;
    state.sweetSpotCenter = Math.max(0.20, Math.min(0.80, 0.50 + osc));

    // Player tension physics
    // Holding reel increases tension; releasing lowers tension as fish pulls away
    const pullSpeed = 0.85 * state.pullResistance;
    const slackSpeed = 0.70;

    if (isHoldingReel) {
      state.tension += pullSpeed * elapsedSec;
    } else {
      state.tension -= slackSpeed * elapsedSec;
    }

    const halfWidth = state.sweetSpotWidth / 2;
    const minSweet = state.sweetSpotCenter - halfWidth;
    const maxSweet = state.sweetSpotCenter + halfWidth;

    const inSweetSpot = state.tension >= minSweet && state.tension <= maxSweet;

    // Progress increments when keeping tension in the sweet spot
    if (inSweetSpot) {
      const chargeRate = 0.32; // ~3.1 seconds of steady sweet-spot tracking to catch
      state.reelProgress = Math.min(1.0, state.reelProgress + chargeRate * elapsedSec);
    } else {
      const drainRate = 0.16;
      state.reelProgress = Math.max(0.0, state.reelProgress - drainRate * elapsedSec);
    }

    const snapped = state.tension >= 1.0;
    const escaped = state.tension <= 0.0 && state.timeInMinigame > 0.8;
    const caught = state.reelProgress >= 1.0;

    return {
      tension: Math.max(0, Math.min(1, state.tension)),
      sweetSpotCenter: state.sweetSpotCenter,
      reelProgress: state.reelProgress,
      inSweetSpot,
      snapped,
      escaped,
      caught
    };
  }

  /**
   * Updates player fish logbook with new catch, returning whether it was a personal best.
   */
  public static recordCatchInLog(
    log: PlayerFishLog,
    speciesId: string,
    sizeCm: number,
    timestamp = Date.now()
  ): { isNewSpecies: boolean; isPersonalBest: boolean; entry: FishLogEntry } {
    const existing = log[speciesId];
    if (!existing) {
      const entry: FishLogEntry = {
        speciesId,
        caughtCount: 1,
        maxSizeCm: sizeCm,
        firstCaughtAt: timestamp
      };
      log[speciesId] = entry;
      return { isNewSpecies: true, isPersonalBest: true, entry };
    }

    existing.caughtCount += 1;
    const isPersonalBest = sizeCm > existing.maxSizeCm;
    if (isPersonalBest) {
      existing.maxSizeCm = sizeCm;
    }
    return { isNewSpecies: false, isPersonalBest, entry: existing };
  }
}
