// shared/src/foliageDynamics.ts
// BitQuest Weather-Driven Flora & Ambient Foliage Dynamics Engine
// Milestone 6: Reactive flora blossoms, wind-induced branch sway, circadian luminescence, and botanical foraging

import type { WeatherType, DayPhase } from './weather';

export type FloraSpeciesId =
  | 'wildflower_sunbloom'
  | 'wildflower_rain_lily'
  | 'wildflower_moon_blossom'
  | 'shroom_glowcap'
  | 'foliage_weeping_willow'
  | 'foliage_meadow_grass';

export type FloraBloomState = 'dormant' | 'blooming' | 'radiant';

export interface FloraDefinition {
  id: string;
  species: FloraSpeciesId;
  name: string;
  x: number;
  y: number;
  preferredWeather: readonly WeatherType[];
  preferredPhases: readonly DayPhase[];
  baseFlexibility: number; // High = sways easily in breeze
  harvestItemId: string;
  harvestYield: number;
  cooldownSec: number;
}

export interface FloraEvaluationResult {
  state: FloraBloomState;
  glowAlpha: number;
  glowRadius: number;
  bonusForageYield: number;
}

export interface SwayVector {
  x: number;
  y: number;
  angleRad: number;
}

export const WORLD_FLORA: readonly FloraDefinition[] = [
  // Whispering Meadow Sunblooms (blooms in clear sunny day)
  {
    id: 'flora_sunbloom_1',
    species: 'wildflower_sunbloom',
    name: 'Meadow Sunbloom',
    x: 580,
    y: 640,
    preferredWeather: ['clear'],
    preferredPhases: ['day', 'golden_hour'],
    baseFlexibility: 0.14,
    harvestItemId: 'flora_sunbloom_petals',
    harvestYield: 2,
    cooldownSec: 45
  },
  {
    id: 'flora_sunbloom_2',
    species: 'wildflower_sunbloom',
    name: 'Meadow Sunbloom',
    x: 720,
    y: 590,
    preferredWeather: ['clear'],
    preferredPhases: ['day', 'golden_hour'],
    baseFlexibility: 0.16,
    harvestItemId: 'flora_sunbloom_petals',
    harvestYield: 2,
    cooldownSec: 45
  },
  {
    id: 'flora_sunbloom_3',
    species: 'wildflower_sunbloom',
    name: 'Meadow Sunbloom',
    x: 1450,
    y: 720,
    preferredWeather: ['clear'],
    preferredPhases: ['day', 'golden_hour'],
    baseFlexibility: 0.15,
    harvestItemId: 'flora_sunbloom_petals',
    harvestYield: 3,
    cooldownSec: 45
  },

  // Crystal Lake Rain Lilies (blooms in rain, storm, and morning mist)
  {
    id: 'flora_rain_lily_1',
    species: 'wildflower_rain_lily',
    name: 'Cerulean Rain Lily',
    x: 940,
    y: 1420,
    preferredWeather: ['rain', 'storm', 'fog'],
    preferredPhases: ['day', 'dawn', 'golden_hour', 'twilight'],
    baseFlexibility: 0.12,
    harvestItemId: 'flora_rain_lily_blossom',
    harvestYield: 1,
    cooldownSec: 60
  },
  {
    id: 'flora_rain_lily_2',
    species: 'wildflower_rain_lily',
    name: 'Cerulean Rain Lily',
    x: 1150,
    y: 1460,
    preferredWeather: ['rain', 'storm', 'fog'],
    preferredPhases: ['day', 'dawn', 'golden_hour', 'twilight'],
    baseFlexibility: 0.12,
    harvestItemId: 'flora_rain_lily_blossom',
    harvestYield: 1,
    cooldownSec: 60
  },
  {
    id: 'flora_rain_lily_3',
    species: 'wildflower_rain_lily',
    name: 'Cerulean Rain Lily',
    x: 1040,
    y: 1720,
    preferredWeather: ['rain', 'storm'],
    preferredPhases: ['day', 'dawn', 'golden_hour', 'twilight'],
    baseFlexibility: 0.14,
    harvestItemId: 'flora_rain_lily_blossom',
    harvestYield: 2,
    cooldownSec: 60
  },

  // Nocturnal Moon Blossoms (blooms in night and twilight with bioluminescence)
  {
    id: 'flora_moon_1',
    species: 'wildflower_moon_blossom',
    name: 'Silver Moon Blossom',
    x: 420,
    y: 880,
    preferredWeather: ['clear', 'fog'],
    preferredPhases: ['night', 'twilight'],
    baseFlexibility: 0.08,
    harvestItemId: 'flora_moon_essence',
    harvestYield: 1,
    cooldownSec: 90
  },
  {
    id: 'flora_moon_2',
    species: 'wildflower_moon_blossom',
    name: 'Silver Moon Blossom',
    x: 1320,
    y: 480,
    preferredWeather: ['clear', 'fog'],
    preferredPhases: ['night', 'twilight'],
    baseFlexibility: 0.09,
    harvestItemId: 'flora_moon_essence',
    harvestYield: 1,
    cooldownSec: 90
  },

  // Fungal Hollow Glowcaps (phosphorescent pulsing in dark/foggy caves)
  {
    id: 'flora_glowcap_1',
    species: 'shroom_glowcap',
    name: 'Phosphor Spore Glowcap',
    x: 1720,
    y: 1100,
    preferredWeather: ['clear', 'rain', 'storm', 'fog'],
    preferredPhases: ['night', 'twilight', 'dawn'],
    baseFlexibility: 0.05,
    harvestItemId: 'flora_moon_essence',
    harvestYield: 1,
    cooldownSec: 75
  },
  {
    id: 'flora_glowcap_2',
    species: 'shroom_glowcap',
    name: 'Phosphor Spore Glowcap',
    x: 1840,
    y: 1180,
    preferredWeather: ['clear', 'rain', 'storm', 'fog'],
    preferredPhases: ['night', 'twilight', 'dawn'],
    baseFlexibility: 0.05,
    harvestItemId: 'flora_moon_essence',
    harvestYield: 2,
    cooldownSec: 75
  }
];

export class FoliageDynamicsEngine {
  private static readonly scratchEval: FloraEvaluationResult = {
    state: 'dormant',
    glowAlpha: 0,
    glowRadius: 0,
    bonusForageYield: 0
  };

  private static readonly scratchSway: SwayVector = {
    x: 0,
    y: 0,
    angleRad: 0
  };

  /**
   * Evaluates flora blossom state and luminescence without heap allocation.
   */
  public static evaluateFloraBloom(
    def: FloraDefinition,
    weather: WeatherType,
    phase: DayPhase,
    out?: FloraEvaluationResult
  ): FloraEvaluationResult {
    const result = out || this.scratchEval;
    result.state = 'dormant';
    result.glowAlpha = 0;
    result.glowRadius = 0;
    result.bonusForageYield = 0;

    const weatherMatches = def.preferredWeather.includes(weather);
    const phaseMatches = def.preferredPhases.includes(phase);

    if (weatherMatches && phaseMatches) {
      // Perfect conditions -> Radiant Bloom
      result.state = 'radiant';
      result.bonusForageYield = 1;

      if (def.species === 'wildflower_moon_blossom') {
        result.glowAlpha = phase === 'night' ? 0.75 : 0.45;
        result.glowRadius = 32;
      } else if (def.species === 'shroom_glowcap') {
        result.glowAlpha = 0.85;
        result.glowRadius = 36;
      } else if (def.species === 'wildflower_sunbloom') {
        result.glowAlpha = 0.35;
        result.glowRadius = 24;
      } else if (def.species === 'wildflower_rain_lily') {
        result.glowAlpha = 0.4;
        result.glowRadius = 26;
      }
    } else if (weatherMatches || phaseMatches) {
      // Partial conditions -> Blooming
      result.state = 'blooming';
      result.bonusForageYield = 0;

      if (def.species === 'wildflower_moon_blossom' || def.species === 'shroom_glowcap') {
        result.glowAlpha = 0.3;
        result.glowRadius = 20;
      }
    } else {
      // Unfavorable conditions -> Dormant
      result.state = 'dormant';
      result.glowAlpha = 0;
      result.glowRadius = 0;
    }

    return result;
  }

  /**
   * Computes wind sway vector and angular deflection in-place (0 heap allocations).
   */
  public static computeWindSway(
    elapsedSec: number,
    windAngle: number,
    windSpeed: number,
    flexibility: number,
    phaseOffset = 0,
    out?: SwayVector
  ): SwayVector {
    const sway = out || this.scratchSway;
    const clampedSpeed = Math.max(0.2, windSpeed);
    const oscillationFreq = 2.2 * Math.sqrt(clampedSpeed);
    const amplitude = flexibility * clampedSpeed * 14;

    // Harmonic sinusoidal wave
    const wave = Math.sin(elapsedSec * oscillationFreq + phaseOffset);
    sway.angleRad = wave * (flexibility * clampedSpeed * 0.45);

    // Lateral displacement along wind direction vector
    const lateralAmp = amplitude * wave;
    sway.x = Math.cos(windAngle) * lateralAmp;
    sway.y = Math.sin(windAngle) * lateralAmp;

    return sway;
  }

  /**
   * Evaluates if flora instance is ready for botanical harvest.
   */
  public static canHarvest(
    def: FloraDefinition,
    lastHarvestSec: number,
    currentSec: number,
    state: FloraBloomState
  ): boolean {
    if (state === 'dormant') return false;
    return currentSec - lastHarvestSec >= def.cooldownSec;
  }

  /**
   * Calculates botanical forage yields with bloom bonuses.
   */
  public static calculateHarvestYield(def: FloraDefinition, state: FloraBloomState): number {
    let yieldAmount = def.harvestYield;
    if (state === 'radiant') {
      yieldAmount += 1;
    }
    return Math.max(1, yieldAmount);
  }
}
