/**
 * BitQuest - Background Periodic Test Runner Daemon (Non-Blocking)
 * Runs regression test suites quietly in the background without blocking
 * active development, writes execution results to background_tests.log,
 * and tracks health metrics over time.
 *
 * Usage:
 *   bun run tools/run_background_tests.ts [--interval-minutes 20] [--once]
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'background_tests.log');
const args = process.argv.slice(2);
const isOnce = args.includes('--once');
const intervalArgIdx = args.indexOf('--interval-minutes');
const intervalMinutes = intervalArgIdx !== -1 && args[intervalArgIdx + 1]
  ? parseInt(args[intervalArgIdx + 1], 10)
  : 20;

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

async function runCommand(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string; durationMs: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr,
        durationMs: Date.now() - start
      });
    });
  });
}

async function executeCycle() {
  log(`--- Starting Background Test Cycle ---`);
  
  // Fast Targeted Verification Suite
  const fastTests = [
    { name: 'Tiles & Seams', cmd: 'bun run test:tiles && bun run check:tiles' },
    { name: 'Palette & Contrast', cmd: 'bun run test:palette && bun run check:palette' },
    { name: 'In-Engine Telemetry & Profiler', cmd: 'bun run test:telemetry' },
    { name: 'Network Chaos Simulator', cmd: 'bun run test:chaos' },
    { name: 'Hitbox Auto-Generator', cmd: 'bun run test:hitboxes' },
    { name: 'Visual Regression Engine', cmd: 'bun run test:visual_diff' },
    { name: 'Zero-Allocation Perf Profiler', cmd: 'bun run test:perf' },
    { name: 'Map Geometry Linter', cmd: 'bun run check:map' }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of fastTests) {
    const res = await runCommand(t.cmd, []);
    if (res.code === 0) {
      passed++;
      log(`  ✓ [${res.durationMs}ms] ${t.name} passed`);
    } else {
      failed++;
      log(`  ✗ [FAIL] ${t.name} exited with code ${res.code}`);
      if (res.stderr) log(`    Error details: ${res.stderr.trim().slice(0, 300)}`);
    }
  }

  log(`--- Background Test Cycle Completed: ${passed} passed, ${failed} failed ---\n`);
}

async function main() {
  log(`BitQuest Background Test Daemon started (Interval: ${intervalMinutes} min, Mode: ${isOnce ? 'Once' : 'Periodic'})`);

  if (isOnce) {
    await executeCycle();
    process.exit(0);
  }

  // Periodic loop
  while (true) {
    try {
      await executeCycle();
    } catch (e: any) {
      log(`Exception in background test cycle: ${e.message}`);
    }
    log(`Next background test cycle in ${intervalMinutes} minutes. Resuming idle state...`);
    await new Promise(r => setTimeout(r, intervalMinutes * 60 * 1000));
  }
}

main();
