import { DataRegistry, type EnemyDefinition } from '../shared/src/dataRegistry';

export interface CombatSimulationResult {
  matchup: string;
  runs: number;
  playerWinRate: number; // 0.0 to 1.0
  avgTtkSeconds: number;
  avgPlayerDamageTaken: number;
  status: 'balanced' | 'too_hard' | 'too_easy' | 'spongy';
}

export function simulateEncounter(
  playerDmg: number,
  playerHp: number,
  enemy: EnemyDefinition,
  iterations = 1000
): CombatSimulationResult {
  let playerWins = 0;
  let totalDurationMs = 0;
  let totalDmgTaken = 0;

  for (let i = 0; i < iterations; i++) {
    let curPlayerHp = playerHp;
    let curEnemyHp = enemy.maxHealth;
    let timeMs = 0;

    let nextPlayerAttackTime = 0;
    let nextEnemyAttackTime = enemy.telegraphMs + 400; // windup + reaction

    while (curPlayerHp > 0 && curEnemyHp > 0 && timeMs < 120000) {
      timeMs += 100; // 100ms simulation step

      // Player attacks
      if (timeMs >= nextPlayerAttackTime) {
        curEnemyHp -= playerDmg;
        nextPlayerAttackTime = timeMs + 350; // swing cooldown
      }

      // Enemy attacks (with dodge probability for player)
      if (timeMs >= nextEnemyAttackTime) {
        // Player has 50% dodge chance during telegraphs via roll
        const dodged = Math.random() < 0.50;
        if (!dodged) {
          curPlayerHp -= enemy.damage;
          totalDmgTaken += enemy.damage;
        }
        nextEnemyAttackTime = timeMs + enemy.attackCooldownMs + enemy.telegraphMs;
      }
    }

    if (curPlayerHp > 0 && curEnemyHp <= 0) {
      playerWins++;
    }
    totalDurationMs += timeMs;
  }

  const winRate = playerWins / iterations;
  const avgTtk = (totalDurationMs / iterations) / 1000;
  const avgDmg = totalDmgTaken / iterations;

  let status: 'balanced' | 'too_hard' | 'too_easy' | 'spongy' = 'balanced';
  if (enemy.aiArchetype === 'boss') {
    if (winRate < 0.40) status = 'too_hard';
    else if (avgTtk > 60) status = 'spongy';
    else if (winRate > 0.95 && avgTtk < 15) status = 'too_easy';
  } else {
    if (winRate < 0.70) status = 'too_hard';
    else if (avgTtk > 10) status = 'spongy';
    else if (avgTtk < 0.8) status = 'too_easy';
  }

  return {
    matchup: `Player (Dmg ${playerDmg}) vs ${enemy.name}`,
    runs: iterations,
    playerWinRate: winRate,
    avgTtkSeconds: parseFloat(avgTtk.toFixed(2)),
    avgPlayerDamageTaken: parseFloat(avgDmg.toFixed(1)),
    status
  };
}

export function runCombatBalanceSuite(): CombatSimulationResult[] {
  DataRegistry.initialize();
  const enemies = DataRegistry.getAllEnemies();
  const results: CombatSimulationResult[] = [];

  // Matchup 1: Tier 1 Wood Sword (Dmg: 1) against mobs
  for (const enemy of enemies) {
    results.push(simulateEncounter(1, 6, enemy, 1000));
  }

  // Matchup 2: Tier 2 Iron Sword (Dmg: 2) against Boss and Red Slime
  const redSlime = enemies.find(e => e.id === 'enemy_slime_red');
  const boss = enemies.find(e => e.id === 'boss_fungal_overlord');

  if (redSlime) results.push(simulateEncounter(2, 6, redSlime, 1000));
  if (boss) results.push(simulateEncounter(2, 6, boss, 1000));

  return results;
}

if (import.meta.main) {
  console.log('⚔️ Running BitQuest Headless Combat Simulator & Balance Matrix...');
  const results = runCombatBalanceSuite();

  for (const res of results) {
    const statusIcon = res.status === 'balanced' ? '✅' : '⚠️';
    console.log(`${statusIcon} ${res.matchup}:`);
    console.log(`   - Win Rate: ${(res.playerWinRate * 100).toFixed(1)}%`);
    console.log(`   - Avg TTK: ${res.avgTtkSeconds}s`);
    console.log(`   - Avg Dmg Taken: ${res.avgPlayerDamageTaken} hearts`);
    console.log(`   - Balance Verdict: [${res.status.toUpperCase()}]`);
  }

  const allBalanced = results.every(r => r.status === 'balanced');
  if (allBalanced) {
    console.log('✨ All combat encounters and TTK curves are within healthy ARPG boundaries!');
  } else {
    console.log('💡 Note: Some matchups flagged for tuning in enemies.json');
  }
}
