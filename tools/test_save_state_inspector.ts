/**
 * BitQuest - Save-State Inspector & World State "Time Machine" Debugger Unit Test Suite (Issue #31)
 * Tests Zod schemas, world state presets, Time Machine timeline rewind/forward,
 * inventory spawner/clearer, quest flag injection, localStorage persistence,
 * and JSON state export/import.
 */

// 1. Setup Mock DOM Environment & LocalStorage for Bun CLI
const mockStorage = new Map<string, string>();
const mockElements = new Map<string, any>();

class MockElement {
  public id: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public innerHTML: string = '';
  public textContent: string = '';
  public value: string = '';
  public checked: boolean = false;
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
}

const globalAny = globalThis as any;

if (!globalAny.localStorage) {
  globalAny.localStorage = {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  };
}

if (!globalAny.window) {
  globalAny.window = {
    location: { search: '', hash: '' },
    localStorage: globalAny.localStorage,
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

import {
  SaveSnapshotSchema,
  WorldStatePresetSchema,
  type SaveSnapshot
} from '../shared/src/schemas';
import {
  PRESET_WORLD_STATES,
  AVAILABLE_SPAWN_ITEMS,
  AVAILABLE_WORLD_FLAGS,
  SaveStateInspector
} from '../client/src/tools/saveStateInspector';

async function runSaveStateInspectorTests() {
  console.log('=== BITQUEST SAVE-STATE INSPECTOR & TIME MACHINE TEST SUITE ===\n');
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
  // 1. Zod SaveSnapshotSchema & WorldStatePresetSchema Tests
  // -------------------------------------------------------------------------
  console.log('[1/4] Zod Schemas Validation Tests');

  const validSnapshot: SaveSnapshot = {
    id: 'snap_test_1',
    label: 'Test Snapshot',
    timestamp: 1700000000000,
    player: {
      name: 'Tester',
      palette: 1,
      x: 1000,
      y: 900,
      health: 5,
      maxHealth: 5,
      coins: 100,
      acorns: 20,
      inventory: ['wooden_sword', 'potion_health']
    },
    quests: {
      quest_grandma_berries: {
        questId: 'quest_grandma_berries',
        currentStageIndex: 1,
        stageProgress: 2,
        completed: false
      }
    },
    stats: {
      bushesCut: 5,
      damageDealt: 50
    },
    worldFlags: ['gate_unsealed']
  };

  const parsedValid = SaveSnapshotSchema.safeParse(validSnapshot);
  assert(parsedValid.success, 'Valid snapshot satisfies SaveSnapshotSchema');

  const invalidHealth = SaveSnapshotSchema.safeParse({
    ...validSnapshot,
    player: { ...validSnapshot.player, health: -1 }
  });
  assert(!invalidHealth.success, 'Rejects negative player health');

  const invalidCoins = SaveSnapshotSchema.safeParse({
    ...validSnapshot,
    player: { ...validSnapshot.player, coins: -5 }
  });
  assert(!invalidCoins.success, 'Rejects negative player coins');

  // -------------------------------------------------------------------------
  // 2. Preset Mock Profiles Integrity Tests
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Preset Mock Profiles Integrity Tests');

  const expectedPresets = ['preset_new_player', 'preset_boss_arena', 'preset_puzzler'];

  for (const presetKey of expectedPresets) {
    const preset = PRESET_WORLD_STATES[presetKey];
    assert(preset !== undefined, `Preset '${presetKey}' exists in catalog`);
    if (preset) {
      const valid = WorldStatePresetSchema.safeParse(preset);
      assert(valid.success, `Preset '${presetKey}' satisfies WorldStatePresetSchema`);
      assert(preset.snapshot.player.health > 0, `Preset '${presetKey}' has positive health`);
      assert(preset.snapshot.player.inventory.length > 0, `Preset '${presetKey}' has starting inventory`);
    }
  }

  // Profile-specific assertions
  const newPlayer = PRESET_WORLD_STATES.preset_new_player.snapshot;
  assert(newPlayer.player.health === 3 && newPlayer.player.coins === 0, 'New Player has 3 HP and 0 coins');
  assert(newPlayer.worldFlags.length === 0, 'New Player has 0 unlocked world flags');

  const bossReady = PRESET_WORLD_STATES.preset_boss_arena.snapshot;
  assert(bossReady.player.health === 10 && bossReady.player.coins === 500, 'Boss Ready has 10 HP and 500 coins');
  assert(bossReady.player.inventory.includes('sword_steel'), 'Boss Ready has forged steel sword');
  assert(bossReady.player.inventory.includes('armor_plate'), 'Boss Ready has knight plate armor');
  assert(bossReady.worldFlags.includes('boss_arena_unlocked'), 'Boss Ready has boss_arena_unlocked flag');

  const puzzler = PRESET_WORLD_STATES.preset_puzzler.snapshot;
  assert(puzzler.player.inventory.includes('relic_feather'), 'Puzzler has relic_feather');
  assert(puzzler.worldFlags.includes('catacombs_unlocked'), 'Puzzler has catacombs_unlocked flag');

  // Catalogs
  assert(AVAILABLE_SPAWN_ITEMS.length >= 20, `Spawn item catalog has ${AVAILABLE_SPAWN_ITEMS.length} items (>= 20)`);
  assert(AVAILABLE_WORLD_FLAGS.length >= 6, `World flag catalog has ${AVAILABLE_WORLD_FLAGS.length} flags (>= 6)`);

  // -------------------------------------------------------------------------
  // 3. SaveStateInspector Time Machine & History Navigation Tests
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Time Machine Timeline & History Navigation Tests');

  mockStorage.clear();
  const inspector = new SaveStateInspector('mock-save-state-container');

  assert(inspector.getHistory().length === 1, 'Initial history contains 1 initial snapshot');
  assert(inspector.getCurrentIndex() === 0, 'Initial currentIndex is 0');

  // Capture Checkpoint 1
  inspector.setPlayerState({ health: 4, coins: 50 });
  const snap1 = inspector.captureSnapshot('Checkpoint Alpha');
  assert(inspector.getHistory().length === 2, 'History length is 2 after capturing Alpha');
  assert(inspector.getCurrentIndex() === 1, 'CurrentIndex advanced to 1');
  assert(snap1.player.health === 4 && snap1.player.coins === 50, 'Snapshot Alpha recorded modified player state');

  // Capture Checkpoint 2
  inspector.setPlayerState({ health: 8, coins: 200, x: 1500, y: 1100 });
  inspector.addItem('potion_speed');
  const snap2 = inspector.captureSnapshot('Checkpoint Beta');
  assert(inspector.getHistory().length === 3, 'History length is 3 after capturing Beta');
  assert(inspector.getCurrentIndex() === 2, 'CurrentIndex advanced to 2');
  assert(inspector.getCurrentSnapshot().player.inventory.includes('potion_speed'), 'Beta has potion_speed');

  // Rewind Step 1 (Beta -> Alpha)
  const rewound1 = inspector.stepRewind();
  assert(rewound1, 'stepRewind() succeeded from Beta to Alpha');
  assert(inspector.getCurrentIndex() === 1, 'CurrentIndex is 1 (Alpha)');
  assert(inspector.getCurrentSnapshot().player.health === 4, 'Restored Alpha player health (4 HP)');

  // Rewind Step 2 (Alpha -> Initial)
  const rewound2 = inspector.stepRewind();
  assert(rewound2, 'stepRewind() succeeded from Alpha to Initial');
  assert(inspector.getCurrentIndex() === 0, 'CurrentIndex is 0 (Initial)');
  assert(inspector.getCurrentSnapshot().player.health === 3, 'Restored Initial player health (3 HP)');

  // Rewind at boundary
  const rewound3 = inspector.stepRewind();
  assert(!rewound3, 'stepRewind() at index 0 returns false (cannot rewind further)');

  // Forward Step 1 (Initial -> Alpha)
  const forward1 = inspector.stepForward();
  assert(forward1, 'stepForward() succeeded from Initial to Alpha');
  assert(inspector.getCurrentIndex() === 1, 'CurrentIndex is 1');

  // Forward Step 2 (Alpha -> Beta)
  const forward2 = inspector.stepForward();
  assert(forward2, 'stepForward() succeeded from Alpha to Beta');
  assert(inspector.getCurrentIndex() === 2, 'CurrentIndex is 2 (Beta)');

  // Forward at boundary
  const forward3 = inspector.stepForward();
  assert(!forward3, 'stepForward() at last index returns false (cannot forward further)');

  // Direct Jump to Index 0
  const jumpRes = inspector.restoreSnapshot(0);
  assert(jumpRes, 'restoreSnapshot(0) succeeded');
  assert(inspector.getCurrentIndex() === 0, 'CurrentIndex jumped directly to 0');

  // -------------------------------------------------------------------------
  // 4. State Injection, Inventory, Quests & LocalStorage Tests
  // -------------------------------------------------------------------------
  console.log('\n[4/4] State Injection, Inventory, Quests & Persistence Tests');

  // Inventory manipulation
  inspector.clearInventory();
  assert(inspector.getCurrentSnapshot().player.inventory.length === 0, 'clearInventory() emptied the inventory');
  inspector.addItem('sword_steel');
  inspector.addItem('shield_iron');
  inspector.addItem('relic_heart');
  assert(inspector.getCurrentSnapshot().player.inventory.length === 3, 'addItem() added 3 items');
  inspector.removeItem(1); // remove shield_iron
  assert(inspector.getCurrentSnapshot().player.inventory.length === 2, 'removeItem(1) removed 1 item');
  assert(!inspector.getCurrentSnapshot().player.inventory.includes('shield_iron'), 'shield_iron was removed');
  assert(inspector.getCurrentSnapshot().player.inventory.includes('sword_steel'), 'sword_steel remains');

  // Quest manipulation
  inspector.setQuestStage('quest_grandma_berries', 2, true);
  const qState = inspector.getCurrentSnapshot().quests['quest_grandma_berries'];
  assert(qState !== undefined, 'quest_grandma_berries exists in quests map');
  assert(qState.currentStageIndex === 2 && qState.completed === true, 'Quest stage and completed status updated');

  // World flag manipulation
  inspector.toggleWorldFlag('campfires_lit', true);
  assert(inspector.getCurrentSnapshot().worldFlags.includes('campfires_lit'), 'toggleWorldFlag added campfires_lit');
  inspector.toggleWorldFlag('campfires_lit', false);
  assert(!inspector.getCurrentSnapshot().worldFlags.includes('campfires_lit'), 'toggleWorldFlag removed campfires_lit');

  // LocalStorage persistence injection
  inspector.setPlayerState({ health: 9, coins: 777, x: 1234, y: 5678 });
  inspector.applyToLiveGame();

  const storedProfileRaw = mockStorage.get('bitquest_save_profile_v1');
  assert(storedProfileRaw !== undefined, 'bitquest_save_profile_v1 was written to localStorage');
  if (storedProfileRaw) {
    const stored = JSON.parse(storedProfileRaw);
    assert(stored.health === 9, 'Stored profile has health 9');
    assert(stored.coins === 777, 'Stored profile has coins 777');
    assert(stored.x === 1234 && stored.y === 5678, 'Stored profile has coordinates (1234, 5678)');
  }

  // Load Preset
  const loadedPreset = inspector.loadPreset('preset_boss_arena');
  assert(loadedPreset !== null, 'loadPreset("preset_boss_arena") succeeded');
  assert(inspector.getCurrentSnapshot().player.name === 'Knight Champion', 'Active player name updated to Knight Champion');
  assert(inspector.getCurrentSnapshot().player.health === 10, 'Active player health set to 10');

  // JSON Export & Import
  const exported = inspector.exportSnapshotsJson(true);
  assert(typeof exported === 'string', 'exportSnapshotsJson returns JSON string');
  const parsedExport = JSON.parse(exported);
  assert(parsedExport.version === 1 && Array.isArray(parsedExport.snapshots), 'Export format has version and snapshots');

  // Import into new inspector
  const newInspector = new SaveStateInspector('another-mock-container');
  const importResult = newInspector.importSnapshotsJson(exported);
  assert(importResult === true, 'importSnapshotsJson successfully parsed and imported snapshots');
  assert(newInspector.getHistory().length === inspector.getHistory().length, 'Imported history count matches exported count');
  assert(newInspector.getCurrentSnapshot().player.name === 'Knight Champion', 'Imported active state preserved Knight Champion');

  // Invalid JSON import test
  let caughtImportError = false;
  try {
    newInspector.importSnapshotsJson('{"invalid": true}');
  } catch (_) {
    caughtImportError = true;
  }
  assert(caughtImportError, 'importSnapshotsJson rejects invalid schema');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSaveStateInspectorTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
