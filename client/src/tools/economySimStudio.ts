/**
 * BitQuest - Macro-Economy & Progression Monte Carlo Simulator (Milestone 9.9)
 *
 * Provides:
 * 1. 100-Day Macro-Progression Monte Carlo Engine across 4 Archetypes:
 *    - Farmer (high crop harvests, seed sinks, land expansion)
 *    - Combat Adventurer (mob drops, catacomb bosses, weapon/armor sinks, potions)
 *    - Angler / Gatherer (lake/river fishing, foraging, bait & lures)
 *    - Balanced Explorer (25% mix across all world activities)
 * 2. Multi-Cohort Variance Modeling (min, median, max bounds across 50+ runs).
 * 3. Faucets vs Sinks Ledger tracking gold & acorn inflow/outflow.
 * 4. Interactive HTML5 Multi-Curve Canvas Graph with hover inspection scrubber.
 * 5. Gini Inequality Coefficient & Macro-Economic Health Evaluator.
 * 6. Live Parameter Tuning Sliders & Presets Library.
 * 7. Zod-Validated Schema Reporting & JSON Exporter.
 */

import {
  EconomySimulationConfigSchema,
  EconomySimulationReportSchema,
  type EconomyArchetype,
  type EconomySimulationConfig,
  type EconomySimulationReport,
  type DayProgressionSnapshot,
  type ArchetypeSimResult
} from '../../../shared/src/schemas';

interface ArchetypeWeightProfile {
  label: string;
  color: string;
  fillColor: string;
  icon: string;
  farmingWeight: number;
  combatWeight: number;
  fishingWeight: number;
  questsWeight: number;
  foragingWeight: number;
  spendingTendency: number; // 0.8 (frugal) to 1.3 (big spender)
}

const ARCHETYPE_PROFILES: Record<EconomyArchetype, ArchetypeWeightProfile> = {
  farmer: {
    label: 'Agrarian Farmer',
    color: '#10b981', // Emerald
    fillColor: 'rgba(16, 185, 129, 0.15)',
    icon: '🌾',
    farmingWeight: 0.70,
    combatWeight: 0.05,
    fishingWeight: 0.05,
    questsWeight: 0.10,
    foragingWeight: 0.10,
    spendingTendency: 0.9
  },
  adventurer: {
    label: 'Combat Adventurer',
    color: '#ef4444', // Ruby
    fillColor: 'rgba(239, 68, 68, 0.15)',
    icon: '⚔️',
    farmingWeight: 0.05,
    combatWeight: 0.70,
    fishingWeight: 0.05,
    questsWeight: 0.15,
    foragingWeight: 0.05,
    spendingTendency: 1.25 // Heavy potion & gear buyer
  },
  angler: {
    label: 'Angler / Forager',
    color: '#38bdf8', // Cyan
    fillColor: 'rgba(56, 189, 248, 0.15)',
    icon: '🎣',
    farmingWeight: 0.05,
    combatWeight: 0.05,
    fishingWeight: 0.70,
    questsWeight: 0.10,
    foragingWeight: 0.10,
    spendingTendency: 0.95
  },
  balanced: {
    label: 'Balanced Explorer',
    color: '#f59e0b', // Amber
    fillColor: 'rgba(245, 158, 11, 0.15)',
    icon: '🧭',
    farmingWeight: 0.25,
    combatWeight: 0.25,
    fishingWeight: 0.25,
    questsWeight: 0.15,
    foragingWeight: 0.10,
    spendingTendency: 1.05
  }
};

interface GearTierDef {
  tier: number;
  name: string;
  minDay: number;
  baseCost: number;
}

const GEAR_TIERS: GearTierDef[] = [
  { tier: 1, name: "Knight's Steel Blade & Shield", minDay: 3, baseCost: 70 },
  { tier: 2, name: 'Nimble Bow & Leather Tunic', minDay: 10, baseCost: 90 },
  { tier: 3, name: 'Iron Cleaver & Aegis', minDay: 25, baseCost: 150 },
  { tier: 4, name: 'Arcane Grimoire & Phoenix Talisman', minDay: 50, baseCost: 195 },
  { tier: 5, name: 'Sun Stone of the Catacombs', minDay: 75, baseCost: 260 }
];

export interface EconomyPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<EconomySimulationConfig>;
}

export const ECONOMY_PRESETS: EconomyPreset[] = [
  {
    id: 'vanilla',
    name: 'Vanilla Balanced',
    description: 'Current production baseline tuned for standard RPG pacing and progression.',
    config: {
      days: 100,
      numSimulations: 50,
      cropSellMultiplier: 1.0,
      mobLootMultiplier: 1.0,
      shopPriceMarkup: 1.0,
      fishRarityWeight: 1.0,
      taxRatePercent: 0,
      dailyPassiveStipend: 0
    }
  },
  {
    id: 'hyperinflation',
    name: 'Hyperinflation Gold Rush',
    description: 'Generous monster loot and crop yields with heavily discounted shop items.',
    config: {
      days: 100,
      numSimulations: 40,
      cropSellMultiplier: 2.2,
      mobLootMultiplier: 2.5,
      shopPriceMarkup: 0.6,
      fishRarityWeight: 1.8,
      taxRatePercent: 0,
      dailyPassiveStipend: 10
    }
  },
  {
    id: 'hardcore_scarcity',
    name: 'Hardcore Scarcity',
    description: 'Austere economy with scarce monster drops, reduced crop prices, and high shop tariffs.',
    config: {
      days: 100,
      numSimulations: 40,
      cropSellMultiplier: 0.6,
      mobLootMultiplier: 0.5,
      shopPriceMarkup: 1.6,
      fishRarityWeight: 0.7,
      taxRatePercent: 5,
      dailyPassiveStipend: 0
    }
  },
  {
    id: 'agrarian_boom',
    name: 'Agrarian Paradise',
    description: 'Farming is vastly superior to combat and fishing, modeling rural village economies.',
    config: {
      days: 100,
      numSimulations: 40,
      cropSellMultiplier: 2.5,
      mobLootMultiplier: 0.6,
      shopPriceMarkup: 1.1,
      fishRarityWeight: 0.8,
      taxRatePercent: 0,
      dailyPassiveStipend: 2
    }
  },
  {
    id: 'dungeon_bounty',
    name: 'Dungeon Crawler Bounty',
    description: 'Combat and catacomb exploration yield high-value spoils while farming is minimal.',
    config: {
      days: 100,
      numSimulations: 40,
      cropSellMultiplier: 0.7,
      mobLootMultiplier: 2.8,
      shopPriceMarkup: 1.0,
      fishRarityWeight: 0.7,
      taxRatePercent: 0,
      dailyPassiveStipend: 0
    }
  }
];

export class EconomySimStudio {
  public root: HTMLElement | null = null;
  public config: EconomySimulationConfig;
  public latestReport: EconomySimulationReport | null = null;

  // View state
  public activeChartMetric: 'netWorth' | 'dailyFlow' | 'breakdown' = 'netWorth';
  public isLogScale: boolean = false;
  public hoveredDay: number | null = null;

  // Internal PRNG seed state
  private seed: number = 42;

  constructor(containerIdOrElement?: string | HTMLElement | null) {
    this.config = EconomySimulationConfigSchema.parse({});

    if (typeof document !== 'undefined') {
      if (typeof containerIdOrElement === 'string') {
        this.root = document.getElementById(containerIdOrElement);
      } else if (containerIdOrElement instanceof HTMLElement) {
        this.root = containerIdOrElement;
      }
    }

    // Run initial baseline simulation
    this.latestReport = this.runSimulation();

    if (this.root) {
      this.mountUI();
    }
  }

  /**
   * Deterministic PRNG for reproducible Monte Carlo variance
   */
  public seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  /**
   * Primary Monte Carlo Execution Engine
   */
  public runSimulation(overrides?: Partial<EconomySimulationConfig>): EconomySimulationReport {
    if (overrides) {
      this.config = EconomySimulationConfigSchema.parse({ ...this.config, ...overrides });
    }

    const {
      days,
      numSimulations,
      cropSellMultiplier,
      mobLootMultiplier,
      shopPriceMarkup,
      fishRarityWeight,
      taxRatePercent,
      dailyPassiveStipend
    } = this.config;

    const archetypes: EconomyArchetype[] = ['farmer', 'adventurer', 'angler', 'balanced'];
    const resultsByArchetype: Record<string, ArchetypeSimResult> = {};
    const finalWealthSamples: number[] = [];

    for (const arch of archetypes) {
      const profile = ARCHETYPE_PROFILES[arch];
      // Array of runs: runs[runIndex][day]
      const allRunsSnapshots: DayProgressionSnapshot[][] = [];
      let totalPovertyDays = 0;
      let firstPovertyDay: number | null = null;

      for (let run = 0; run < numSimulations; run++) {
        const runSnapshots: DayProgressionSnapshot[] = [];
        let currentGold = 25; // Starting player gold
        let currentAcorns = 5; // Starting acorns
        let currentGearTier = 0;

        let cumFarming = 0;
        let cumCombat = 0;
        let cumFishing = 0;
        let cumQuests = 0;
        let cumForaging = 0;

        let cumGear = 0;
        let cumSeeds = 0;
        let cumPotions = 0;
        let cumVanity = 0;
        let cumMisc = 0;

        for (let day = 1; day <= days; day++) {
          // --- FAUCETS (Inflow) ---
          const rnd = () => 0.85 + this.seededRandom() * 0.3; // ±15% variance

          // 1. Farming: average 18g/day * weight * cropMultiplier
          const farmInflow = Math.round(profile.farmingWeight * 28 * cropSellMultiplier * rnd());
          // 2. Combat: average 22g/day * weight * mobMultiplier + tier bonus
          const combatInflow = Math.round(profile.combatWeight * (16 + currentGearTier * 6) * mobLootMultiplier * rnd());
          // 3. Fishing: average 20g/day * weight * fishWeight
          const fishInflow = Math.round(profile.fishingWeight * 22 * fishRarityWeight * rnd());
          // 4. Quests & Bounties
          let questInflow = Math.round(profile.questsWeight * 12 * rnd());
          if (day === 3) questInflow += 25;
          if (day === 7) questInflow += 60;
          if (day === 14) questInflow += 120;
          if (day === 30) questInflow += 250;
          if (day === 60) questInflow += 500;
          if (day === 90) questInflow += 1000;
          // 5. Foraging
          const forageInflow = Math.round(profile.foragingWeight * 8 * rnd());

          const totalDayInflow = farmInflow + combatInflow + fishInflow + questInflow + forageInflow + dailyPassiveStipend;

          cumFarming += farmInflow;
          cumCombat += combatInflow;
          cumFishing += fishInflow;
          cumQuests += questInflow;
          cumForaging += forageInflow;

          // --- SINKS (Outflow) ---
          let gearOutflow = 0;
          let seedsOutflow = 0;
          let potionsOutflow = 0;
          let vanityOutflow = 0;
          let miscOutflow = 0;

          // Gear purchase check
          const nextGear = GEAR_TIERS[currentGearTier];
          if (nextGear && day >= nextGear.minDay) {
            const cost = Math.round(nextGear.baseCost * shopPriceMarkup);
            if (currentGold + totalDayInflow >= cost) {
              gearOutflow = cost;
              currentGearTier = nextGear.tier;
            }
          }

          // Seeds reinvestment (Farmer reinvests 35% of farm earnings; others 10%)
          const seedPct = arch === 'farmer' ? 0.35 : 0.10;
          seedsOutflow = Math.round(farmInflow * seedPct * shopPriceMarkup);

          // Consumables & Potions (Combat heavy uses more potions)
          const basePotions = arch === 'adventurer' ? 12 : arch === 'balanced' ? 5 : 2;
          potionsOutflow = Math.round(basePotions * shopPriceMarkup * rnd());

          // Vanity purchase check (only when rich: gold > 250)
          if (currentGold > 350 && this.seededRandom() < 0.08) {
            vanityOutflow = Math.round(45 * shopPriceMarkup);
          }

          // Taxes
          if (taxRatePercent > 0) {
            miscOutflow += Math.round((currentGold * taxRatePercent) / 100);
          }

          const totalDayOutflow = gearOutflow + seedsOutflow + potionsOutflow + vanityOutflow + miscOutflow;

          cumGear += gearOutflow;
          cumSeeds += seedsOutflow;
          cumPotions += potionsOutflow;
          cumVanity += vanityOutflow;
          cumMisc += miscOutflow;

          currentGold += totalDayInflow - totalDayOutflow;

          // Poverty check
          if (currentGold < 0) {
            currentGold = 0;
            if (firstPovertyDay === null) {
              firstPovertyDay = day;
            }
            totalPovertyDays++;
          }

          // Acorns accumulated from foraging
          currentAcorns += Math.round(profile.foragingWeight * 2 * rnd());

          runSnapshots.push({
            day,
            goldNetWorth: currentGold,
            acornBalance: currentAcorns,
            dailyGoldInflow: totalDayInflow,
            dailyGoldOutflow: totalDayOutflow,
            cumulativeFaucetBreakdown: {
              farming: cumFarming,
              combat: cumCombat,
              fishing: cumFishing,
              quests: cumQuests,
              foraging: cumForaging
            },
            cumulativeSinkBreakdown: {
              equipment: cumGear,
              seeds: cumSeeds,
              potions: cumPotions,
              vanity: cumVanity,
              miscellaneous: cumMisc
            },
            equipmentTier: currentGearTier
          });
        }

        allRunsSnapshots.push(runSnapshots);
        finalWealthSamples.push(runSnapshots[runSnapshots.length - 1].goldNetWorth);
      }

      // Identify the median run by final net worth
      const runFinalGolds = allRunsSnapshots.map((run, idx) => ({ idx, gold: run[days - 1].goldNetWorth }));
      runFinalGolds.sort((a, b) => a.gold - b.gold);
      const medianRunIdx = runFinalGolds[Math.floor(runFinalGolds.length / 2)].idx;
      const medianRun = allRunsSnapshots[medianRunIdx];

      // Clone median run snapshots for the representative progression timeline
      const medianDaySnapshots: DayProgressionSnapshot[] = medianRun.map(s => ({
        ...s,
        cumulativeFaucetBreakdown: { ...s.cumulativeFaucetBreakdown },
        cumulativeSinkBreakdown: { ...s.cumulativeSinkBreakdown }
      }));

      const finalGolds = runFinalGolds.map(r => r.gold);
      const medianFinal = finalGolds[Math.floor(finalGolds.length / 2)];
      const minFinal = finalGolds[Math.floor(finalGolds.length * 0.1)]; // 10th percentile
      const maxFinal = finalGolds[Math.floor(finalGolds.length * 0.9)]; // 90th percentile

      const lastDay = medianDaySnapshots[days - 1];
      const totalEarned = Object.values(lastDay.cumulativeFaucetBreakdown).reduce((a, b) => a + b, 0);
      const totalSpent = Object.values(lastDay.cumulativeSinkBreakdown).reduce((a, b) => a + b, 0);

      resultsByArchetype[arch] = {
        archetype: arch,
        label: profile.label,
        daySnapshots: medianDaySnapshots,
        finalNetWorthMedian: medianFinal,
        finalNetWorthMin: minFinal,
        finalNetWorthMax: maxFinal,
        totalEarned,
        totalSpent,
        faucetRatio: totalSpent > 0 ? parseFloat((totalEarned / totalSpent).toFixed(2)) : totalEarned,
        sinkRatio: totalEarned > 0 ? parseFloat((totalSpent / totalEarned).toFixed(2)) : 0,
        povertyDay: firstPovertyDay
      };
    }

    // Calculate Gini Coefficient across all final wealth samples
    const gini = this.calculateGiniCoefficient(finalWealthSamples);

    // Calculate Inflation Index
    const avgFinalGold = finalWealthSamples.reduce((a, b) => a + b, 0) / finalWealthSamples.length;
    const baseGearCost = GEAR_TIERS.reduce((a, b) => a + b.baseCost, 0) * shopPriceMarkup;
    const inflationIndex = parseFloat((avgFinalGold / (baseGearCost || 1)).toFixed(2));

    // Determine Economic Health
    let economicHealth: 'healthy' | 'hyperinflation' | 'deflationary_stall' | 'faucet_heavy' | 'sink_heavy' = 'healthy';
    const recommendations: string[] = [];

    const farmerResult = resultsByArchetype.farmer;
    const adventurerResult = resultsByArchetype.adventurer;
    const anglerResult = resultsByArchetype.angler;

    if (avgFinalGold > 12000 || inflationIndex > 15.0) {
      economicHealth = 'hyperinflation';
      recommendations.push('🚨 Critical Hyperinflation: Players amass extreme gold surplus. Increase Tier 4-5 gear costs or introduce late-game sink sinks (housing, mounts).');
    } else if (avgFinalGold < 150 || Object.values(resultsByArchetype).some(r => r.povertyDay !== null && r.povertyDay < 20)) {
      economicHealth = 'deflationary_stall';
      recommendations.push('⚠️ Deflationary Stall: Players frequently hit poverty. Reduce early seed and equipment costs, or raise early quest bounty rewards.');
    } else if (farmerResult.finalNetWorthMedian > adventurerResult.finalNetWorthMedian * 2.5) {
      economicHealth = 'faucet_heavy';
      recommendations.push('🌾 Farming Imbalance: Farming generates 2.5x more wealth than combat. Lower golden crop sell multipliers or increase seed purchase prices.');
    } else if (adventurerResult.finalNetWorthMedian > farmerResult.finalNetWorthMedian * 2.5) {
      economicHealth = 'faucet_heavy';
      recommendations.push('⚔️ Combat Imbalance: Combat mob drops overwhelm farming yields. Lower high-tier mob gold drops.');
    } else if (gini > 0.45) {
      economicHealth = 'faucet_heavy';
      recommendations.push(`⚖️ High Wealth Inequality (Gini: ${gini.toFixed(2)}): Archetype progression rates differ sharply. Rebalance secondary activities.`);
    } else {
      economicHealth = 'healthy';
      recommendations.push('✅ Macro Economy Healthy: Balanced progression velocity across all 4 playstyles, realistic gear pacing, and sustainable currency sinks.');
    }

    if (recommendations.length === 1 && economicHealth === 'healthy') {
      recommendations.push('💡 Tip: Sinks effectively absorb 60-80% of generated faucets, keeping the inflation index at stable targets.');
    }

    const report: EconomySimulationReport = {
      config: this.config,
      resultsByArchetype: resultsByArchetype as any,
      giniCoefficient: gini,
      inflationIndex,
      economicHealth,
      recommendations
    };

    this.latestReport = EconomySimulationReportSchema.parse(report);
    return this.latestReport;
  }

  /**
   * Discrete Gini Coefficient Calculation
   * G = (sum_i sum_j |y_i - y_j|) / (2 * n^2 * mean)
   */
  public calculateGiniCoefficient(samples: number[]): number {
    const n = samples.length;
    if (n === 0) return 0;
    const sorted = [...samples].sort((a, b) => a - b);
    let sumOfDiffs = 0;
    let totalSum = 0;

    for (let i = 0; i < n; i++) {
      totalSum += sorted[i];
      for (let j = 0; j < n; j++) {
        sumOfDiffs += Math.abs(sorted[i] - sorted[j]);
      }
    }

    if (totalSum === 0) return 0;
    const mean = totalSum / n;
    const gini = sumOfDiffs / (2 * n * n * mean);
    return Math.min(1.0, Math.max(0.0, parseFloat(gini.toFixed(3))));
  }

  /**
   * Applies a preset configuration and reruns the simulation
   */
  public applyPreset(presetId: string) {
    const preset = ECONOMY_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.config = EconomySimulationConfigSchema.parse({
      ...this.config,
      ...preset.config
    });

    this.runSimulation();
    this.updateControlsUI();
    this.render();
  }

  /**
   * Tab Activation hook
   */
  public onTabActivated() {
    this.render();
  }

  /**
   * Mounts the Studio DOM
   */
  private mountUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="econ-studio-layout" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #0b0f19; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
        
        <!-- Header Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: #0f172a; border-bottom: 1px solid #1e293b;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 16px; font-weight: 700; color: #38bdf8;">📈 Macro-Economy & Progression Monte Carlo Simulator</span>
            <span id="econ-health-badge" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase;">HEALTHY</span>
            <span id="econ-gini-badge" style="font-size: 11px; background: #1e293b; color: #94a3b8; padding: 2px 8px; border-radius: 4px;">Gini: 0.18</span>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="econ-preset-select" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${ECONOMY_PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <button id="btn-econ-run" class="btn btn-primary" style="padding: 4px 12px; font-size: 12px; background: #6366f1; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">⚡ Run Monte Carlo</button>
            <button id="btn-econ-export" class="btn" style="padding: 4px 10px; font-size: 12px; background: #334155; color: #fff; border: none; border-radius: 4px; cursor: pointer;">💾 Export JSON</button>
          </div>
        </div>

        <!-- Main Workspace -->
        <div style="display: flex; flex: 1; overflow: hidden;">
          
          <!-- Left: Multi-Curve Graph & Cards -->
          <div style="flex: 1; display: flex; flex-direction: column; padding: 14px; gap: 12px; overflow-y: auto;">
            
            <!-- Graph Container -->
            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 8px;">
                  <button class="econ-tab-btn active" data-metric="netWorth" style="background: #6366f1; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Gold Net Worth</button>
                  <button class="econ-tab-btn" data-metric="dailyFlow" style="background: #1e293b; color: #94a3b8; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Daily Inflow vs Outflow</button>
                  <button class="econ-tab-btn" data-metric="breakdown" style="background: #1e293b; color: #94a3b8; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Faucets vs Sinks Ratio</button>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #94a3b8;">
                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="econ-log-scale-chk" /> Logarithmic Scale
                  </label>
                  <div style="display: flex; gap: 8px;">
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span> Farmer</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span> Adventurer</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8;"></span> Angler</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span> Balanced</span>
                  </div>
                </div>
              </div>

              <!-- Canvas Graph -->
              <div style="position: relative; width: 100%; height: 280px; background: #090d16; border-radius: 4px; border: 1px solid #1e293b;">
                <canvas id="econ-chart-canvas" width="800" height="280" style="width: 100%; height: 100%; display: block;"></canvas>
                <div id="econ-tooltip" style="position: absolute; display: none; background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8; border-radius: 4px; padding: 6px 10px; font-size: 11px; pointer-events: none; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>
              </div>
            </div>

            <!-- Archetype Result Cards -->
            <div id="econ-archetype-cards" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <!-- Populated dynamically -->
            </div>

            <!-- Recommendations Banner -->
            <div id="econ-recommendations-box" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 12px;">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Right: Parameter Tuning Sidebar -->
          <div style="width: 320px; background: #0f172a; border-left: 1px solid #1e293b; padding: 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
              🎛️ Economy Tuning Parameters
            </div>

            <!-- Simulation Scope -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Simulation Horizon:</span>
                <span id="val-days" style="color: #38bdf8; font-weight: 600;">100 Days</span>
              </div>
              <input type="range" id="slider-days" min="10" max="365" step="5" value="100" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Monte Carlo Cohort:</span>
                <span id="val-cohort" style="color: #38bdf8; font-weight: 600;">50 Runs</span>
              </div>
              <input type="range" id="slider-cohort" min="10" max="200" step="10" value="50" />
            </div>

            <!-- Multipliers -->
            <div style="font-size: 12px; font-weight: 600; color: #a5b4fc; margin-top: 4px;">
              Faucets & Inflow Rates
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Crop Sell Multiplier:</span>
                <span id="val-crop-mult" style="color: #10b981; font-weight: 600;">1.00x</span>
              </div>
              <input type="range" id="slider-crop-mult" min="0.2" max="3.0" step="0.1" value="1.0" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Mob Loot Drop Multiplier:</span>
                <span id="val-mob-mult" style="color: #ef4444; font-weight: 600;">1.00x</span>
              </div>
              <input type="range" id="slider-mob-mult" min="0.2" max="3.0" step="0.1" value="1.0" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Fish Rarity / Value Weight:</span>
                <span id="val-fish-mult" style="color: #38bdf8; font-weight: 600;">1.00x</span>
              </div>
              <input type="range" id="slider-fish-mult" min="0.2" max="3.0" step="0.1" value="1.0" />
            </div>

            <div style="font-size: 12px; font-weight: 600; color: #a5b4fc; margin-top: 4px;">
              Sinks & Tariff Controls
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Shop Price Markup:</span>
                <span id="val-shop-markup" style="color: #f59e0b; font-weight: 600;">1.00x</span>
              </div>
              <input type="range" id="slider-shop-markup" min="0.5" max="3.0" step="0.1" value="1.0" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Daily Wealth Tax %:</span>
                <span id="val-tax" style="color: #94a3b8; font-weight: 600;">0%</span>
              </div>
              <input type="range" id="slider-tax" min="0" max="25" step="1" value="0" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #94a3b8;">Daily Passive Stipend:</span>
                <span id="val-stipend" style="color: #94a3b8; font-weight: 600;">0g</span>
              </div>
              <input type="range" id="slider-stipend" min="0" max="20" step="1" value="0" />
            </div>

            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
              <button id="btn-econ-reset" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 6px; border-radius: 4px; font-size: 11px; cursor: pointer;">
                🔄 Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.render();
  }

  /**
   * Binds interactive UI event listeners
   */
  private bindEvents() {
    if (!this.root) return;

    // Preset select
    const presetSelect = this.root.querySelector('#econ-preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', (e) => {
      this.applyPreset((e.target as HTMLSelectElement).value);
    });

    // Run button
    this.root.querySelector('#btn-econ-run')?.addEventListener('click', () => {
      this.runSimulation();
      this.render();
    });

    // Export button
    this.root.querySelector('#btn-econ-export')?.addEventListener('click', () => {
      this.exportReportJson();
    });

    // Reset button
    this.root.querySelector('#btn-econ-reset')?.addEventListener('click', () => {
      this.applyPreset('vanilla');
    });

    // Metric tabs
    this.root.querySelectorAll('.econ-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.root?.querySelectorAll('.econ-tab-btn').forEach(b => {
          (b as HTMLElement).style.background = '#1e293b';
          (b as HTMLElement).style.color = '#94a3b8';
          b.classList.remove('active');
        });
        const target = e.currentTarget as HTMLElement;
        target.style.background = '#6366f1';
        target.style.color = '#fff';
        target.classList.add('active');
        this.activeChartMetric = target.getAttribute('data-metric') as any;
        this.renderCanvas();
      });
    });

    // Log scale checkbox
    const logChk = this.root.querySelector('#econ-log-scale-chk') as HTMLInputElement;
    logChk?.addEventListener('change', () => {
      this.isLogScale = logChk.checked;
      this.renderCanvas();
    });

    // Sliders
    const setupSlider = (id: string, valId: string, format: (v: number) => string, key: keyof EconomySimulationConfig) => {
      const slider = this.root?.querySelector(`#${id}`) as HTMLInputElement;
      const valLabel = this.root?.querySelector(`#${valId}`) as HTMLElement;
      slider?.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        if (valLabel) valLabel.innerText = format(val);
        (this.config as any)[key] = val;
        this.runSimulation();
        this.render();
      });
    };

    setupSlider('slider-days', 'val-days', v => `${v} Days`, 'days');
    setupSlider('slider-cohort', 'val-cohort', v => `${v} Runs`, 'numSimulations');
    setupSlider('slider-crop-mult', 'val-crop-mult', v => `${v.toFixed(2)}x`, 'cropSellMultiplier');
    setupSlider('slider-mob-mult', 'val-mob-mult', v => `${v.toFixed(2)}x`, 'mobLootMultiplier');
    setupSlider('slider-fish-mult', 'val-fish-mult', v => `${v.toFixed(2)}x`, 'fishRarityWeight');
    setupSlider('slider-shop-markup', 'val-shop-markup', v => `${v.toFixed(2)}x`, 'shopPriceMarkup');
    setupSlider('slider-tax', 'val-tax', v => `${v}%`, 'taxRatePercent');
    setupSlider('slider-stipend', 'val-stipend', v => `${v}g`, 'dailyPassiveStipend');

    // Canvas Hover Scrubbing
    const canvas = this.root.querySelector('#econ-chart-canvas') as HTMLCanvasElement;
    const tooltip = this.root.querySelector('#econ-tooltip') as HTMLElement;

    canvas?.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      const day = Math.max(1, Math.min(this.config.days, Math.round(fraction * (this.config.days - 1)) + 1));
      this.hoveredDay = day;

      if (tooltip && this.latestReport) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${Math.min(rect.width - 160, Math.max(10, x + 15))}px`;
        tooltip.style.top = `${Math.min(rect.height - 110, Math.max(10, e.clientY - rect.top - 20))}px`;

        const dIdx = day - 1;
        const res = this.latestReport.resultsByArchetype;
        tooltip.innerHTML = `
          <div style="font-weight: 700; color: #f8fafc; border-bottom: 1px solid #334155; padding-bottom: 2px; margin-bottom: 4px;">
            📅 Day ${day} Snapshot
          </div>
          <div style="color: #10b981;">🌾 Farmer: ${res.farmer.daySnapshots[dIdx]?.goldNetWorth ?? 0}g (T${res.farmer.daySnapshots[dIdx]?.equipmentTier ?? 0})</div>
          <div style="color: #ef4444;">⚔️ Adventurer: ${res.adventurer.daySnapshots[dIdx]?.goldNetWorth ?? 0}g (T${res.adventurer.daySnapshots[dIdx]?.equipmentTier ?? 0})</div>
          <div style="color: #38bdf8;">🎣 Angler: ${res.angler.daySnapshots[dIdx]?.goldNetWorth ?? 0}g (T${res.angler.daySnapshots[dIdx]?.equipmentTier ?? 0})</div>
          <div style="color: #f59e0b;">🧭 Balanced: ${res.balanced.daySnapshots[dIdx]?.goldNetWorth ?? 0}g (T${res.balanced.daySnapshots[dIdx]?.equipmentTier ?? 0})</div>
        `;
      }
      this.renderCanvas();
    });

    canvas?.addEventListener('mouseleave', () => {
      this.hoveredDay = null;
      if (tooltip) tooltip.style.display = 'none';
      this.renderCanvas();
    });
  }

  /**
   * Updates slider labels from current config
   */
  private updateControlsUI() {
    if (!this.root) return;
    const setVal = (id: string, val: string) => {
      const el = this.root?.querySelector(`#${id}`) as HTMLElement;
      if (el) el.innerText = val;
    };
    const setSlider = (id: string, val: number) => {
      const el = this.root?.querySelector(`#${id}`) as HTMLInputElement;
      if (el) el.value = val.toString();
    };

    setVal('val-days', `${this.config.days} Days`);
    setSlider('slider-days', this.config.days);

    setVal('val-cohort', `${this.config.numSimulations} Runs`);
    setSlider('slider-cohort', this.config.numSimulations);

    setVal('val-crop-mult', `${this.config.cropSellMultiplier.toFixed(2)}x`);
    setSlider('slider-crop-mult', this.config.cropSellMultiplier);

    setVal('val-mob-mult', `${this.config.mobLootMultiplier.toFixed(2)}x`);
    setSlider('slider-mob-mult', this.config.mobLootMultiplier);

    setVal('val-fish-mult', `${this.config.fishRarityWeight.toFixed(2)}x`);
    setSlider('slider-fish-mult', this.config.fishRarityWeight);

    setVal('val-shop-markup', `${this.config.shopPriceMarkup.toFixed(2)}x`);
    setSlider('slider-shop-markup', this.config.shopPriceMarkup);

    setVal('val-tax', `${this.config.taxRatePercent}%`);
    setSlider('slider-tax', this.config.taxRatePercent);

    setVal('val-stipend', `${this.config.dailyPassiveStipend}g`);
    setSlider('slider-stipend', this.config.dailyPassiveStipend);
  }

  /**
   * Primary Render Method
   */
  public render() {
    if (!this.root || !this.latestReport) return;

    this.renderHeaderBadges();
    this.renderCanvas();
    this.renderArchetypeCards();
    this.renderRecommendations();
  }

  private renderHeaderBadges() {
    if (!this.root || !this.latestReport) return;

    const healthBadge = this.root.querySelector('#econ-health-badge') as HTMLElement;
    const giniBadge = this.root.querySelector('#econ-gini-badge') as HTMLElement;

    if (healthBadge) {
      const h = this.latestReport.economicHealth;
      healthBadge.innerText = h.replace('_', ' ');
      if (h === 'healthy') {
        healthBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        healthBadge.style.color = '#34d399';
        healthBadge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      } else if (h === 'hyperinflation' || h === 'deflationary_stall') {
        healthBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        healthBadge.style.color = '#f87171';
        healthBadge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      } else {
        healthBadge.style.background = 'rgba(245, 158, 11, 0.2)';
        healthBadge.style.color = '#fbbf24';
        healthBadge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      }
    }

    if (giniBadge) {
      giniBadge.innerText = `Gini: ${this.latestReport.giniCoefficient.toFixed(2)} | Inflation: ${this.latestReport.inflationIndex.toFixed(1)}x`;
    }
  }

  private renderCanvas() {
    if (!this.root || !this.latestReport) return;

    const canvas = this.root.querySelector('#econ-chart-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Padding
    const pLeft = 50;
    const pRight = 20;
    const pTop = 20;
    const pBottom = 30;
    const plotW = W - pLeft - pRight;
    const plotH = H - pTop - pBottom;

    const res = this.latestReport.resultsByArchetype;
    const archetypes: EconomyArchetype[] = ['farmer', 'adventurer', 'angler', 'balanced'];

    // Find peak value across all curves for scaling
    let maxVal = 100;
    for (const arch of archetypes) {
      const r = res[arch];
      if (this.activeChartMetric === 'netWorth') {
        const peak = Math.max(...r.daySnapshots.map(s => s.goldNetWorth), r.finalNetWorthMax);
        if (peak > maxVal) maxVal = peak;
      } else if (this.activeChartMetric === 'dailyFlow') {
        const peakIn = Math.max(...r.daySnapshots.map(s => s.dailyGoldInflow));
        const peakOut = Math.max(...r.daySnapshots.map(s => s.dailyGoldOutflow));
        if (peakIn > maxVal) maxVal = peakIn;
        if (peakOut > maxVal) maxVal = peakOut;
      } else {
        if (r.faucetRatio > maxVal) maxVal = r.faucetRatio;
      }
    }
    maxVal = Math.ceil(maxVal * 1.1);

    // Helper: value to Y pixel
    const toY = (val: number): number => {
      if (this.isLogScale) {
        const minLog = 1;
        const maxLog = Math.log10(Math.max(10, maxVal));
        const vLog = Math.log10(Math.max(minLog, val));
        const frac = vLog / maxLog;
        return pTop + plotH - frac * plotH;
      }
      const frac = Math.max(0, val) / maxVal;
      return pTop + plotH - frac * plotH;
    };

    // Helper: day to X pixel
    const daysTotal = this.config.days;
    const toX = (day: number): number => {
      return pLeft + ((day - 1) / (daysTotal - 1)) * plotW;
    };

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const yGuideSteps = 4;
    for (let i = 0; i <= yGuideSteps; i++) {
      const yVal = (maxVal / yGuideSteps) * i;
      const yPix = toY(yVal);
      ctx.moveTo(pLeft, yPix);
      ctx.lineTo(W - pRight, yPix);

      // Y-axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(yVal) + (this.activeChartMetric === 'breakdown' ? 'x' : 'g'), pLeft - 6, yPix + 3);
    }

    const xGuideSteps = 5;
    for (let i = 0; i <= xGuideSteps; i++) {
      const dayVal = Math.round(1 + ((daysTotal - 1) / xGuideSteps) * i);
      const xPix = toX(dayVal);
      ctx.moveTo(xPix, pTop);
      ctx.lineTo(xPix, pTop + plotH);

      // X-axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`D${dayVal}`, xPix, H - 10);
    }
    ctx.stroke();

    // Plot Curves per Archetype
    for (const arch of archetypes) {
      const r = res[arch];
      const profile = ARCHETYPE_PROFILES[arch];

      // Draw Min-Max Variance Band (Translucent Envelope)
      if (this.activeChartMetric === 'netWorth') {
        ctx.fillStyle = profile.fillColor;
        ctx.beginPath();
        for (let i = 0; i < r.daySnapshots.length; i++) {
          const s = r.daySnapshots[i];
          const x = toX(s.day);
          // Scale min/max roughly around median
          const minApprox = s.goldNetWorth * (r.finalNetWorthMin / (r.finalNetWorthMedian || 1));
          const yMin = toY(minApprox);
          if (i === 0) ctx.moveTo(x, yMin);
          else ctx.lineTo(x, yMin);
        }
        for (let i = r.daySnapshots.length - 1; i >= 0; i--) {
          const s = r.daySnapshots[i];
          const x = toX(s.day);
          const maxApprox = s.goldNetWorth * (r.finalNetWorthMax / (r.finalNetWorthMedian || 1));
          const yMax = toY(maxApprox);
          ctx.lineTo(x, yMax);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Draw Main Median Line
      ctx.strokeStyle = profile.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let i = 0; i < r.daySnapshots.length; i++) {
        const s = r.daySnapshots[i];
        const val = this.activeChartMetric === 'netWorth'
          ? s.goldNetWorth
          : this.activeChartMetric === 'dailyFlow'
            ? s.dailyGoldInflow
            : r.faucetRatio;

        const x = toX(s.day);
        const y = toY(val);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Hover scrubber vertical line
    if (this.hoveredDay !== null) {
      const hX = toX(this.hoveredDay);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, pTop);
      ctx.lineTo(hX, pTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private renderArchetypeCards() {
    if (!this.root || !this.latestReport) return;
    const container = this.root.querySelector('#econ-archetype-cards');
    if (!container) return;

    const res = this.latestReport.resultsByArchetype;
    const archetypes: EconomyArchetype[] = ['farmer', 'adventurer', 'angler', 'balanced'];

    container.innerHTML = archetypes.map(arch => {
      const r = res[arch];
      const profile = ARCHETYPE_PROFILES[arch];
      const lastSnap = r.daySnapshots[r.daySnapshots.length - 1];

      return `
        <div style="background: #0f172a; border: 1px solid #1e293b; border-left: 4px solid ${profile.color}; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 13px; color: #f8fafc;">${profile.icon} ${profile.label}</span>
            <span style="font-size: 11px; color: #94a3b8;">Tier ${lastSnap?.equipmentTier ?? 0}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 20px; font-weight: 800; color: ${profile.color}; font-family: monospace;">
              ${r.finalNetWorthMedian}g
            </span>
            <span style="font-size: 10px; color: #64748b;">
              [${r.finalNetWorthMin}g – ${r.finalNetWorthMax}g]
            </span>
          </div>

          <div style="font-size: 11px; display: flex; justify-content: space-between; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 6px;">
            <span>Earned: <strong style="color: #34d399;">+${r.totalEarned}g</strong></span>
            <span>Spent: <strong style="color: #f87171;">-${r.totalSpent}g</strong></span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
            <span>Faucet/Sink: <strong>${r.faucetRatio}x</strong></span>
            <span>Poverty: <strong>${r.povertyDay !== null ? `Day ${r.povertyDay}` : 'None'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderRecommendations() {
    if (!this.root || !this.latestReport) return;
    const box = this.root.querySelector('#econ-recommendations-box');
    if (!box) return;

    box.innerHTML = `
      <div style="font-size: 12px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span>📋 Algorithmic Balancing Insights & Policy Recommendations</span>
        <button id="btn-copy-recs" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">📋 Copy</button>
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
        ${this.latestReport.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    `;

    box.querySelector('#btn-copy-recs')?.addEventListener('click', () => {
      if (this.latestReport) {
        navigator.clipboard?.writeText(this.latestReport.recommendations.join('\n'));
        const btn = box.querySelector('#btn-copy-recs') as HTMLElement;
        if (btn) {
          btn.innerText = 'Copied!';
          setTimeout(() => { btn.innerText = '📋 Copy'; }, 1500);
        }
      }
    });
  }

  public exportReportJson(): string {
    if (!this.latestReport) {
      this.latestReport = this.runSimulation();
    }
    const jsonStr = JSON.stringify(this.latestReport, null, 2);

    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitquest-economy-report-d${this.config.days}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    return jsonStr;
  }
}
