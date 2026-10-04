/**
 * BitQuest - Cozy Farming & Crop Cultivation System (Expansion Milestone 1)
 * High-performance, zero-allocation crop lifecycle management:
 * - Soil tilling on grassy and dirt terrain patches
 * - Seed planting across 5 crop species with distinct growth stages
 * - Hydration & watering mechanics (accelerated by rainfall!)
 * - Harvest yields with golden / giant crop mutation chances
 */

export type CropSpeciesId = 'turnip' | 'strawberry' | 'corn' | 'glowshroom' | 'golden_acorn';

export type CropStage = 0 | 1 | 2 | 3; // 0: Planted Seed, 1: Sprout, 2: Growing Foliage, 3: Mature & Harvestable

export interface CropDefinition {
  id: CropSpeciesId;
  name: string;
  seedItemId: string;
  harvestItemId: string;
  goldenItemId: string;
  growthDurationSec: number;
  waterRequiredForGrowth: boolean;
  minYield: number;
  maxYield: number;
  goldenChance: number; // 0.0 to 1.0 (default ~0.10)
  regrowsAfterHarvest: boolean;
  regrowthStage?: CropStage;
  primaryColor: string;
  accentColor: string;
}

export interface TilledPlotState {
  x: number; // Tile coordinates (grid x)
  y: number; // Tile coordinates (grid y)
  worldX: number; // Pixel center X
  worldY: number; // Pixel center Y
  tilledAt: number;
  isWatered: boolean;
  wateredAt: number;
  cropSpecies?: CropSpeciesId;
  growthProgress: number; // 0.0 to 1.0
  stage: CropStage;
  isGolden: boolean;
}

export const CROP_DEFINITIONS: Record<CropSpeciesId, CropDefinition> = {
  turnip: {
    id: 'turnip',
    name: 'Meadow White Turnip',
    seedItemId: 'seed_turnip',
    harvestItemId: 'crop_turnip',
    goldenItemId: 'crop_golden_turnip',
    growthDurationSec: 30, // 30 seconds for quick cozy loop
    waterRequiredForGrowth: true,
    minYield: 1,
    maxYield: 2,
    goldenChance: 0.12,
    regrowsAfterHarvest: false,
    primaryColor: '#f1f5f9',
    accentColor: '#84cc16'
  },
  strawberry: {
    id: 'strawberry',
    name: 'Sweet Wild Strawberry',
    seedItemId: 'seed_strawberry',
    harvestItemId: 'strawberry',
    goldenItemId: 'crop_strawberry_giant',
    growthDurationSec: 45,
    waterRequiredForGrowth: true,
    minYield: 2,
    maxYield: 4,
    goldenChance: 0.15,
    regrowsAfterHarvest: true,
    regrowthStage: 1, // Regrows from sprout stage!
    primaryColor: '#ef4444',
    accentColor: '#22c55e'
  },
  corn: {
    id: 'corn',
    name: 'Golden Cob Corn',
    seedItemId: 'seed_corn',
    harvestItemId: 'crop_corn',
    goldenItemId: 'crop_corn_golden',
    growthDurationSec: 60,
    waterRequiredForGrowth: true,
    minYield: 2,
    maxYield: 3,
    goldenChance: 0.10,
    regrowsAfterHarvest: false,
    primaryColor: '#facc15',
    accentColor: '#15803d'
  },
  glowshroom: {
    id: 'glowshroom',
    name: 'Luminescent Sporecap',
    seedItemId: 'seed_glowshroom',
    harvestItemId: 'crop_glowshroom',
    goldenItemId: 'crop_glowshroom_radiant',
    growthDurationSec: 50,
    waterRequiredForGrowth: false, // Thrives in fungal dampness
    minYield: 1,
    maxYield: 3,
    goldenChance: 0.18,
    regrowsAfterHarvest: true,
    regrowthStage: 2,
    primaryColor: '#a855f7',
    accentColor: '#38bdf8'
  },
  golden_acorn: {
    id: 'golden_acorn',
    name: 'Ancient Oak Sapling',
    seedItemId: 'seed_acorn',
    harvestItemId: 'acorn',
    goldenItemId: 'item_relic_sun_stone',
    growthDurationSec: 90,
    waterRequiredForGrowth: true,
    minYield: 3,
    maxYield: 6,
    goldenChance: 0.08,
    regrowsAfterHarvest: true,
    regrowthStage: 2,
    primaryColor: '#d97706',
    accentColor: '#fbbf24'
  }
};

export class FarmingManager {
  public static readonly TILE_SIZE = 32;
  private plots = new Map<string, TilledPlotState>();

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public getPlot(tileX: number, tileY: number): TilledPlotState | undefined {
    return this.plots.get(this.getKey(tileX, tileY));
  }

  public getAllPlots(): TilledPlotState[] {
    return Array.from(this.plots.values());
  }

  /**
   * Tills a tile into farmable soil.
   */
  public tillPlot(tileX: number, tileY: number): TilledPlotState {
    const key = this.getKey(tileX, tileY);
    let plot = this.plots.get(key);
    if (!plot) {
      plot = {
        x: tileX,
        y: tileY,
        worldX: tileX * FarmingManager.TILE_SIZE + FarmingManager.TILE_SIZE / 2,
        worldY: tileY * FarmingManager.TILE_SIZE + FarmingManager.TILE_SIZE / 2,
        tilledAt: Date.now(),
        isWatered: false,
        wateredAt: 0,
        growthProgress: 0,
        stage: 0,
        isGolden: false
      };
      this.plots.set(key, plot);
    } else {
      plot.tilledAt = Date.now();
    }
    return plot;
  }

  /**
   * Plants a seed in a tilled plot.
   */
  public plantCrop(tileX: number, tileY: number, seedItemId: string): { success: boolean; message: string; plot?: TilledPlotState } {
    const plot = this.getPlot(tileX, tileY);
    if (!plot) {
      return { success: false, message: 'Soil must be tilled first!' };
    }
    if (plot.cropSpecies) {
      return { success: false, message: 'A crop is already growing here!' };
    }

    // Find matching definition for seed
    const def = Object.values(CROP_DEFINITIONS).find(c => c.seedItemId === seedItemId);
    if (!def) {
      return { success: false, message: 'Invalid seed item!' };
    }

    plot.cropSpecies = def.id;
    plot.growthProgress = 0.0;
    plot.stage = 0;
    plot.isGolden = Math.random() < def.goldenChance;

    return {
      success: true,
      message: `Planted ${def.name}!`,
      plot
    };
  }

  /**
   * Waters a plot. Wet soil accelerates growth.
   */
  public waterPlot(tileX: number, tileY: number): { success: boolean; plot?: TilledPlotState } {
    const plot = this.getPlot(tileX, tileY);
    if (!plot) return { success: false };

    plot.isWatered = true;
    plot.wateredAt = Date.now();
    return { success: true, plot };
  }

  /**
   * Updates all crops over time.
   * If isRaining is true, all outdoor dry plots are automatically watered!
   */
  public update(deltaSec: number, isRaining: boolean = false): void {
    if (deltaSec <= 0) return;

    for (const plot of this.plots.values()) {
      if (isRaining && !plot.isWatered) {
        plot.isWatered = true;
        plot.wateredAt = Date.now();
      }

      if (!plot.cropSpecies) continue;
      if (plot.stage === 3) continue; // Already fully mature

      const def = CROP_DEFINITIONS[plot.cropSpecies];
      if (!def) continue;

      // Unwatered crops that require water grow at 25% speed (drought penalty)
      const growthRate = (!def.waterRequiredForGrowth || plot.isWatered) ? 1.0 : 0.25;
      const progressDelta = (deltaSec / def.growthDurationSec) * growthRate;

      plot.growthProgress = Math.min(1.0, plot.growthProgress + progressDelta);

      // Determine stage from progress:
      // Stage 0: [0.00, 0.25) Planted
      // Stage 1: [0.25, 0.60) Sprout
      // Stage 2: [0.60, 0.99) Growing
      // Stage 3: [1.00] Mature
      if (plot.growthProgress >= 1.0) {
        plot.stage = 3;
      } else if (plot.growthProgress >= 0.6) {
        plot.stage = 2;
      } else if (plot.growthProgress >= 0.25) {
        plot.stage = 1;
      } else {
        plot.stage = 0;
      }

      // Soil dries out after growing for 60 seconds unless it is raining
      if (plot.isWatered && !isRaining && Date.now() - plot.wateredAt > 60000) {
        plot.isWatered = false;
      }
    }
  }

  /**
   * Harvests a mature crop. Returns item IDs, yield quantities, and whether it was golden.
   */
  public harvestPlot(tileX: number, tileY: number): {
    success: boolean;
    message: string;
    itemId?: string;
    quantity?: number;
    isGolden?: boolean;
    xp?: number;
  } {
    const plot = this.getPlot(tileX, tileY);
    if (!plot || !plot.cropSpecies) {
      return { success: false, message: 'Nothing planted here!' };
    }
    if (plot.stage < 3) {
      return { success: false, message: 'Crop is not mature yet!' };
    }

    const def = CROP_DEFINITIONS[plot.cropSpecies];
    const isGolden = !!plot.isGolden;
    const itemId = isGolden ? def.goldenItemId : def.harvestItemId;
    const qty = Math.floor(Math.random() * (def.maxYield - def.minYield + 1)) + def.minYield;
    const xp = isGolden ? 25 : 10;

    if (def.regrowsAfterHarvest) {
      // Regrowing crop stays planted at intermediate stage!
      plot.stage = def.regrowthStage ?? 1;
      plot.growthProgress = plot.stage === 2 ? 0.6 : 0.25;
      plot.isGolden = Math.random() < def.goldenChance;
    } else {
      // Remove crop, leave tilled plot
      plot.cropSpecies = undefined;
      plot.growthProgress = 0;
      plot.stage = 0;
      plot.isGolden = false;
    }

    return {
      success: true,
      message: `Harvested ${qty}x ${isGolden ? 'Golden ' : ''}${def.name}!`,
      itemId,
      quantity: qty,
      isGolden,
      xp
    };
  }

  /**
   * Serializes all farm plots for save files.
   */
  public serialize(): Record<string, TilledPlotState> {
    const out: Record<string, TilledPlotState> = {};
    for (const [k, v] of this.plots.entries()) {
      out[k] = { ...v };
    }
    return out;
  }

  /**
   * Deserializes farm plots from saved profile.
   */
  public deserialize(data: Record<string, TilledPlotState>): void {
    this.plots.clear();
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      this.plots.set(k, { ...v });
    }
  }

  public clear(): void {
    this.plots.clear();
  }
}

export const farmingManager = new FarmingManager();
