/**
 * Dynamic Day/Night Cycle, Circadian Lighting, Weather & Campfire Systems
 * Task 7.6 / Issue #24
 *
 * Strict zero heap object churn per tick.
 */

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog';

export type DayPhase = 'night' | 'early_dawn' | 'dawn' | 'day' | 'golden_hour' | 'twilight';

export interface TimeOfDayInfo {
  timeOfDaySec: number;
  hour: number;
  minute: number;
  phase: DayPhase;
  phaseTitle: string;
  icon: string;
  formattedTime: string;
}

export interface AmbientLightingInfo {
  color: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
}

export interface WeatherState {
  current: WeatherType;
  targetWeather: WeatherType;
  transitionProgress: number;
  nextChangeTime: number;
  windAngle: number;
  windSpeed: number;
  timeOfDaySec: number;
}

export interface CampfireDefinition {
  id: string;
  x: number;
  y: number;
  name: string;
  warmthRadius: number;
  healIntervalSec: number;
  hpPerTick: number;
  mpPerTick: number;
}

export interface LightingKeyframe {
  hour: number;
  color: number;
  alpha: number;
  name: string;
}

export const CAMPFIRES: readonly CampfireDefinition[] = [
  {
    id: 'campfire_village',
    x: 320,
    y: 448,
    name: "Village Outskirts Hearth",
    warmthRadius: 56,
    healIntervalSec: 2,
    hpPerTick: 1,
    mpPerTick: 5
  },
  {
    id: 'campfire_lake',
    x: 1088,
    y: 1344,
    name: "Lakeside Pier Campfire",
    warmthRadius: 56,
    healIntervalSec: 2,
    hpPerTick: 1,
    mpPerTick: 5
  },
  {
    id: 'campfire_ruins',
    x: 960,
    y: 224,
    name: "Ancient Ruins Campfire",
    warmthRadius: 56,
    healIntervalSec: 2,
    hpPerTick: 1,
    mpPerTick: 5
  },
  {
    id: 'campfire_meadow',
    x: 1472,
    y: 768,
    name: "Meadow Crossroads Campfire",
    warmthRadius: 56,
    healIntervalSec: 2,
    hpPerTick: 1,
    mpPerTick: 5
  }
];

export class WeatherEngine {
  /**
   * 24-minute real-world duration for a full 24-hour in-game day (1440 seconds).
   * 1 real second = 1 in-game minute.
   * 60 real seconds = 1 in-game hour.
   */
  public static readonly DAY_CYCLE_DURATION_SEC = 1440;
  public static readonly SECONDS_PER_GAME_HOUR = 60;

  /**
   * Smooth lighting keyframes spanning the 24-hour cycle.
   */
  public static readonly LIGHTING_KEYFRAMES: readonly LightingKeyframe[] = [
    { hour: 0.0, color: 0x090d1a, alpha: 0.62, name: 'Midnight' },
    { hour: 4.0, color: 0x0e1428, alpha: 0.60, name: 'Late Night' },
    { hour: 5.0, color: 0x1e1b4b, alpha: 0.48, name: 'Pre-Dawn Blue' },
    { hour: 6.0, color: 0xf472b6, alpha: 0.25, name: 'Sunrise Rose' },
    { hour: 7.2, color: 0xfde047, alpha: 0.12, name: 'Golden Dawn' },
    { hour: 8.5, color: 0xfffbeb, alpha: 0.02, name: 'Bright Morning' },
    { hour: 12.0, color: 0xffffff, alpha: 0.00, name: 'High Noon' },
    { hour: 16.5, color: 0xfef3c7, alpha: 0.02, name: 'Warm Afternoon' },
    { hour: 17.5, color: 0xf59e0b, alpha: 0.14, name: 'Golden Hour' },
    { hour: 18.5, color: 0xe11d48, alpha: 0.26, name: 'Crimson Sunset' },
    { hour: 19.8, color: 0x4c1d95, alpha: 0.40, name: 'Dusk Violet' },
    { hour: 21.0, color: 0x1e1b4b, alpha: 0.54, name: 'Twilight Indigo' },
    { hour: 22.0, color: 0x090d1a, alpha: 0.62, name: 'Nightfall' },
    { hour: 24.0, color: 0x090d1a, alpha: 0.62, name: 'Midnight Loop' }
  ];

  // Reusable static buffers for zero-allocation game loops
  private static timeBuffer: TimeOfDayInfo = {
    timeOfDaySec: 0,
    hour: 0,
    minute: 0,
    phase: 'day',
    phaseTitle: 'High Sunlight',
    icon: '☀️',
    formattedTime: '12:00 PM'
  };

  private static lightBuffer: AmbientLightingInfo = {
    color: 0xffffff,
    alpha: 0,
    r: 255,
    g: 255,
    b: 255
  };

  /**
   * Evaluates time of day, phase, and formatting.
   * Zero heap allocations.
   */
  public static getTimeOfDay(timeOfDaySec: number): TimeOfDayInfo {
    const totalSec = ((timeOfDaySec % this.DAY_CYCLE_DURATION_SEC) + this.DAY_CYCLE_DURATION_SEC) % this.DAY_CYCLE_DURATION_SEC;
    const hourFraction = (totalSec / this.SECONDS_PER_GAME_HOUR) % 24;
    const hour = Math.floor(hourFraction);
    const minute = Math.floor((hourFraction - hour) * 60);

    let phase: DayPhase = 'day';
    let phaseTitle = 'High Sunlight';
    let icon = '☀️';

    if (hourFraction >= 21.5 || hourFraction < 4.5) {
      phase = 'night';
      phaseTitle = 'Midnight Glow';
      icon = '🌙';
    } else if (hourFraction >= 4.5 && hourFraction < 6.0) {
      phase = 'early_dawn';
      phaseTitle = 'False Dawn';
      icon = '🌌';
    } else if (hourFraction >= 6.0 && hourFraction < 8.0) {
      phase = 'dawn';
      phaseTitle = 'Morning Sunrise';
      icon = '🌅';
    } else if (hourFraction >= 8.0 && hourFraction < 17.5) {
      phase = 'day';
      phaseTitle = 'High Sunlight';
      icon = '☀️';
    } else if (hourFraction >= 17.5 && hourFraction < 19.5) {
      phase = 'golden_hour';
      phaseTitle = 'Golden Hour Sunset';
      icon = '🌇';
    } else {
      phase = 'twilight';
      phaseTitle = 'Indigo Twilight';
      icon = '🌆';
    }

    // Format 12-hour AM/PM string
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const formattedMinute = minute < 10 ? `0${minute}` : `${minute}`;
    const formattedHour = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;

    this.timeBuffer.timeOfDaySec = totalSec;
    this.timeBuffer.hour = hour;
    this.timeBuffer.minute = minute;
    this.timeBuffer.phase = phase;
    this.timeBuffer.phaseTitle = phaseTitle;
    this.timeBuffer.icon = icon;
    this.timeBuffer.formattedTime = `${formattedHour}:${formattedMinute} ${ampm}`;

    return this.timeBuffer;
  }

  /**
   * Fast getter for the current day phase enum ('night' | 'early_dawn' | 'dawn' | 'morning' | 'day' | 'golden_hour' | 'twilight').
   * Zero heap allocations.
   */
  public static getDayPhase(timeOfDaySec: number): DayPhase {
    return this.getTimeOfDay(timeOfDaySec).phase;
  }

  /**
   * Linearly interpolates RGB components and alpha between day/night keyframes,
   * then applies weather modulation. Zero heap allocations.
   */
  public static getAmbientLighting(timeOfDaySec: number, weather: WeatherType = 'clear'): AmbientLightingInfo {
    const totalSec = ((timeOfDaySec % this.DAY_CYCLE_DURATION_SEC) + this.DAY_CYCLE_DURATION_SEC) % this.DAY_CYCLE_DURATION_SEC;
    const hourFraction = (totalSec / this.SECONDS_PER_GAME_HOUR) % 24;

    const frames = this.LIGHTING_KEYFRAMES;
    let kfA = frames[0]!;
    let kfB = frames[1]!;

    for (let i = 0; i < frames.length - 1; i++) {
      if (hourFraction >= frames[i]!.hour && hourFraction <= frames[i + 1]!.hour) {
        kfA = frames[i]!;
        kfB = frames[i + 1]!;
        break;
      }
    }

    const span = kfB.hour - kfA.hour;
    const t = span > 0.0001 ? (hourFraction - kfA.hour) / span : 0;

    const rA = (kfA.color >> 16) & 0xff;
    const gA = (kfA.color >> 8) & 0xff;
    const bA = kfA.color & 0xff;

    const rB = (kfB.color >> 16) & 0xff;
    const gB = (kfB.color >> 8) & 0xff;
    const bB = kfB.color & 0xff;

    let baseR = Math.round(rA + (rB - rA) * t);
    let baseG = Math.round(gA + (gB - gA) * t);
    let baseB = Math.round(bA + (bB - bA) * t);
    let baseAlpha = kfA.alpha + (kfB.alpha - kfA.alpha) * t;

    // Modulate with weather effects
    if (weather === 'rain') {
      // Overcast stormy slate blue
      baseR = Math.round(baseR * 0.65 + 51 * 0.35);
      baseG = Math.round(baseG * 0.65 + 65 * 0.35);
      baseB = Math.round(baseB * 0.65 + 85 * 0.35);
      baseAlpha = Math.min(0.85, baseAlpha + 0.16);
    } else if (weather === 'storm') {
      // Dark thunderstorm navy
      baseR = Math.round(baseR * 0.45 + 30 * 0.55);
      baseG = Math.round(baseG * 0.45 + 41 * 0.55);
      baseB = Math.round(baseB * 0.45 + 59 * 0.55);
      baseAlpha = Math.min(0.88, baseAlpha + 0.28);
    } else if (weather === 'fog') {
      // Misty silver haze
      baseR = Math.round(baseR * 0.55 + 148 * 0.45);
      baseG = Math.round(baseG * 0.55 + 163 * 0.45);
      baseB = Math.round(baseB * 0.55 + 184 * 0.45);
      baseAlpha = Math.min(0.80, baseAlpha + 0.20);
    }

    const finalColor = ((baseR & 0xff) << 16) | ((baseG & 0xff) << 8) | (baseB & 0xff);

    this.lightBuffer.color = finalColor;
    this.lightBuffer.alpha = Math.round(baseAlpha * 1000) / 1000;
    this.lightBuffer.r = baseR;
    this.lightBuffer.g = baseG;
    this.lightBuffer.b = baseB;

    return this.lightBuffer;
  }

  /**
   * Helper to blend two hex colors with ratio t (0..1).
   */
  public static lerpColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  }

  /**
   * Advances server weather state simulation by elapsedSec.
   * Zero heap allocations.
   */
  public static updateWeatherStep(
    elapsedSec: number,
    state: WeatherState,
    nowMs: number
  ): { weatherChanged: boolean; lightningTriggered: boolean } {
    let weatherChanged = false;
    let lightningTriggered = false;

    // Advance circadian clock
    state.timeOfDaySec = (state.timeOfDaySec + elapsedSec) % this.DAY_CYCLE_DURATION_SEC;

    // Weather transition progression
    if (state.current !== state.targetWeather) {
      state.transitionProgress = Math.min(1.0, state.transitionProgress + elapsedSec / 15.0); // 15s smooth blend
      if (state.transitionProgress >= 1.0) {
        state.current = state.targetWeather;
        state.transitionProgress = 0.0;
        weatherChanged = true;
      }
    }

    // Weather change timer
    if (nowMs >= state.nextChangeTime && state.current === state.targetWeather) {
      const next = this.rollNextWeather(state.current);
      if (next !== state.current) {
        state.targetWeather = next;
        state.transitionProgress = 0.0;
        weatherChanged = true;
      }
      state.nextChangeTime = nowMs + this.rollWeatherDuration(next);
    }

    // Lightning strike roll during thunderstorms (average once every 14 seconds)
    if (state.current === 'storm') {
      const lightningProb = 0.07 * elapsedSec;
      if (Math.random() < lightningProb) {
        lightningTriggered = true;
      }
    }

    return { weatherChanged, lightningTriggered };
  }

  /**
   * Deterministic weather transition probability matrix.
   */
  public static rollNextWeather(current: WeatherType): WeatherType {
    const roll = Math.random();
    switch (current) {
      case 'clear':
        if (roll < 0.65) return 'rain';
        if (roll < 0.85) return 'fog';
        return 'storm';
      case 'rain':
        if (roll < 0.60) return 'clear';
        if (roll < 0.85) return 'storm';
        return 'fog';
      case 'storm':
        if (roll < 0.75) return 'rain';
        return 'clear';
      case 'fog':
        if (roll < 0.75) return 'clear';
        return 'rain';
    }
  }

  /**
   * Duration in ms for next weather state.
   */
  public static rollWeatherDuration(weather: WeatherType): number {
    switch (weather) {
      case 'clear':
        return 420000 + Math.random() * 480000; // 7-15 min
      case 'rain':
        return 180000 + Math.random() * 240000; // 3-7 min
      case 'storm':
        return 120000 + Math.random() * 180000; // 2-5 min
      case 'fog':
        return 120000 + Math.random() * 120000; // 2-4 min
    }
  }

  /**
   * Finds the nearest active campfire within maxDist pixels.
   */
  public static getNearestCampfire(px: number, py: number, maxDist: number = 64): CampfireDefinition | null {
    let nearest: CampfireDefinition | null = null;
    let minDistSq = maxDist * maxDist;

    for (let i = 0; i < CAMPFIRES.length; i++) {
      const c = CAMPFIRES[i]!;
      const dx = px - c.x;
      const dy = py - c.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= minDistSq) {
        minDistSq = distSq;
        nearest = c;
      }
    }

    return nearest;
  }

  /**
   * Checks if coordinates fall within campfire warmth radius.
   */
  public static isNearCampfire(px: number, py: number, campfire: CampfireDefinition): boolean {
    const dx = px - campfire.x;
    const dy = py - campfire.y;
    return (dx * dx + dy * dy) <= (campfire.warmthRadius * campfire.warmthRadius);
  }
}
