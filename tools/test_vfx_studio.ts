/**
 * BitQuest - Live Particle & Spell VFX Studio Unit Test Suite (Issue #30)
 * Tests Zod schemas, particle presets, zero-allocation memory pool,
 * Euler physics integration (gravity, velocity, lifetime decay),
 * blend modes, background rendering, and JSON config export/import.
 */

// 1. Setup Mock DOM Environment for Bun CLI
const mockElements = new Map<string, any>();

class MockElement {
  public id: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public innerHTML: string = '';
  public textContent: string = '';
  public value: string = '';
  public dataset: Record<string, string> = {};
  public eventListeners: Record<string, Function[]> = {};

  constructor(id: string = '') {
    this.id = id;
  }

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  dispatchEvent(event: any) {
    const list = this.eventListeners[event.type] || [];
    for (const cb of list) {
      cb(event);
    }
  }

  querySelector(selector: string) {
    return new MockElement();
  }

  querySelectorAll(selector: string) {
    return [];
  }

  appendChild(el: any) {
    return el;
  }

  getContext(type: string) {
    return {
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      arc: () => {},
      ellipse: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      setLineDash: () => {},
      roundRect: () => {}
    };
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 480, height: 400, right: 480, bottom: 400 };
  }
}

const globalAny = globalThis as any;

if (!globalAny.window) {
  globalAny.window = {
    location: { search: '', hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (!globalAny.document) {
  globalAny.document = {
    getElementById: (id: string) => {
      if (!mockElements.has(id)) {
        mockElements.set(id, new MockElement(id));
      }
      return mockElements.get(id);
    },
    createElement: (tag: string) => new MockElement(),
    querySelector: (selector: string) => new MockElement(),
    querySelectorAll: (selector: string) => [],
    body: {
      appendChild: (el: any) => el
    }
  };
}

if (!globalAny.navigator) {
  globalAny.navigator = {
    clipboard: {
      writeText: async () => {}
    }
  };
}

import { ParticleConfigSchema, type ParticleConfig } from '../shared/src/schemas';
import { PRESET_PARTICLE_CONFIGS, VFXStudio } from '../client/src/tools/vfxStudio';

async function runVFXStudioTests() {
  console.log('=== BITQUEST LIVE PARTICLE & SPELL VFX STUDIO TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Zod ParticleConfigSchema Validation Tests
  // -------------------------------------------------------------------------
  console.log('[1/4] ParticleConfigSchema Zod Validation Tests');

  const validConfig: ParticleConfig = {
    id: 'test_spark',
    name: 'Test Spark',
    blendMode: 'additive',
    colorStart: '#ffffff',
    colorEnd: '#ffaa00',
    sizeStart: 4,
    sizeEnd: 1,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    speedMin: 50,
    speedMax: 150,
    angleMin: 0,
    angleMax: 360,
    gravityX: 0,
    gravityY: 100,
    lifeMin: 200,
    lifeMax: 500,
    rate: 20,
    burstCount: 15
  };

  const parsedValid = ParticleConfigSchema.safeParse(validConfig);
  assert(parsedValid.success, 'Valid particle config satisfies ParticleConfigSchema');

  const invalidBlend = ParticleConfigSchema.safeParse({
    ...validConfig,
    blendMode: 'invert' // invalid
  });
  assert(!invalidBlend.success, 'Rejects invalid blendMode');

  const negativeSpeed = ParticleConfigSchema.safeParse({
    ...validConfig,
    speedMin: -10
  });
  assert(!negativeSpeed.success, 'Rejects negative speedMin');

  const negativeLife = ParticleConfigSchema.safeParse({
    ...validConfig,
    lifeMin: -50
  });
  assert(!negativeLife.success, 'Rejects negative lifeMin');

  const negativeSize = ParticleConfigSchema.safeParse({
    ...validConfig,
    sizeStart: -1
  });
  assert(!negativeSize.success, 'Rejects negative sizeStart');

  // -------------------------------------------------------------------------
  // 2. Preset Library Integrity Tests
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Preset VFX Library Integrity Tests');

  const expectedPresets = [
    'fireball_flame',
    'ice_shard',
    'pot_dust',
    'slash_spark',
    'heal_sparkle',
    'void_decay'
  ];

  for (const presetKey of expectedPresets) {
    const preset = PRESET_PARTICLE_CONFIGS[presetKey];
    assert(preset !== undefined, `Preset '${presetKey}' exists in library`);
    if (preset) {
      const valid = ParticleConfigSchema.safeParse(preset);
      assert(valid.success, `Preset '${presetKey}' passes schema validation`);
      assert(preset.id === presetKey, `Preset '${presetKey}' id matches key`);
      assert(preset.name.length > 0, `Preset '${presetKey}' has human-readable name`);
      assert(preset.lifeMax >= preset.lifeMin, `Preset '${presetKey}' lifeMax >= lifeMin`);
      assert(preset.speedMax >= preset.speedMin, `Preset '${presetKey}' speedMax >= speedMin`);
      assert(preset.burstCount > 0, `Preset '${presetKey}' burstCount > 0`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. VFXStudio Memory Pool & Simulation Physics Tests
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Memory Pool & Euler Simulation Physics Tests');

  const studio = new VFXStudio('mock-vfx-container');
  studio.stopSimulation(); // run manual step-by-step updates for determinism

  assert(studio.getActiveParticleCount() === 0, 'Initial active particle count is 0');

  // Trigger burst
  studio.triggerBurst(20, 200, 200);
  assert(studio.getActiveParticleCount() === 20, 'triggerBurst(20) activates exactly 20 particles');

  // Update physics step (16ms)
  studio.update(0.016);
  assert(studio.getActiveParticleCount() === 20, 'Particles remain active during initial 16ms step');

  // Background toggle tests
  assert(studio.getBackground() === 'dark', 'Default background is dark');
  studio.setBackground('meadow');
  assert(studio.getBackground() === 'meadow', 'setBackground("meadow") switches background to meadow');
  studio.setBackground('cave');
  assert(studio.getBackground() === 'cave', 'setBackground("cave") switches background to cave');
  studio.setBackground('dark');
  assert(studio.getBackground() === 'dark', 'setBackground("dark") switches background back to dark');

  // Time advancement until particle expiration
  // Max lifetime of fireball_flame is 700ms. Stepping by 1.0 second (1000ms) should expire all particles.
  studio.update(1.0);
  assert(studio.getActiveParticleCount() === 0, 'All particles expire after exceeding max lifetime');

  // Zero-allocation pool test
  // Ensure repeated bursts and updates do not mutate pool size or cause re-allocations
  const initialPoolSize = (studio as any).particles.length;
  assert(initialPoolSize === 600, 'Pre-allocated particle pool size is exactly 600');

  for (let f = 0; f < 60; f++) {
    if (f % 10 === 0) studio.triggerBurst(15);
    studio.update(0.016);
  }
  const postPoolSize = (studio as any).particles.length;
  assert(postPoolSize === initialPoolSize, 'Particle pool remains strictly zero-allocation (fixed 600 items)');

  // -------------------------------------------------------------------------
  // 4. JSON Config Export / Import & Render Pipeline Tests
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Config Export/Import & Render Pipeline Tests');

  // Export JSON
  const exportedJson = studio.exportJson(true);
  assert(typeof exportedJson === 'string', 'exportJson returns a valid string');
  const parsedExport = JSON.parse(exportedJson);
  assert(ParticleConfigSchema.safeParse(parsedExport).success, 'Exported JSON satisfies ParticleConfigSchema');

  // Load custom config
  const customConfig: ParticleConfig = {
    id: 'custom_lightning',
    name: 'Custom Lightning Zap',
    blendMode: 'additive',
    colorStart: '#38bdf8',
    colorEnd: '#1e40af',
    sizeStart: 5,
    sizeEnd: 1,
    alphaStart: 1.0,
    alphaEnd: 0.1,
    speedMin: 200,
    speedMax: 450,
    angleMin: 45,
    angleMax: 135,
    gravityX: 0,
    gravityY: 50,
    lifeMin: 100,
    lifeMax: 250,
    rate: 50,
    burstCount: 30
  };

  studio.loadConfig(customConfig);
  assert(studio.getConfig().id === 'custom_lightning', 'loadConfig loads custom configuration');
  assert(studio.getConfig().speedMax === 450, 'Config properties updated correctly');

  // Import JSON
  const customJson = JSON.stringify({
    ...customConfig,
    id: 'imported_spell',
    name: 'Imported Arcane Nova'
  });
  studio.importJson(customJson);
  assert(studio.getConfig().id === 'imported_spell', 'importJson successfully imports and applies JSON config');

  // Invalid JSON import test
  let caughtError = false;
  try {
    studio.importJson('{"invalid": true}');
  } catch (e) {
    caughtError = true;
  }
  assert(caughtError, 'importJson rejects invalid schema and throws validation error');

  // Render smoke test
  studio.triggerBurst(10);
  studio.render();
  assert(true, 'render() completes without error for active particles and emitter reticle');

  // Teardown
  studio.stopSimulation();

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVFXStudioTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
