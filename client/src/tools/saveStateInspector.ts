/**
 * BitQuest - Save-State Inspector & World State "Time Machine" Debugger
 * Issue #31: In-engine Save & World State manager for instant state snapshotting,
 * flag manipulation, inventory/currency injection, and preset profiling.
 */

import {
  SaveSnapshotSchema,
  WorldStatePresetSchema,
  type SaveSnapshot,
  type SaveSnapshotPlayer,
  type SaveSnapshotQuest,
  type WorldStatePreset
} from '../../../shared/src/schemas';

// Preset Profiles
export const PRESET_WORLD_STATES: Record<string, WorldStatePreset> = {
  preset_new_player: {
    id: 'preset_new_player',
    title: '🌱 New Player',
    description: 'Fresh adventurer in Oakhaven village with starter wooden stick and intro quest.',
    snapshot: {
      id: 'snap_new_player',
      label: 'Preset: New Player',
      timestamp: 1700000000000,
      player: {
        name: 'Adventurer',
        palette: 0,
        x: 1024,
        y: 928,
        health: 3,
        maxHealth: 3,
        coins: 0,
        acorns: 0,
        inventory: ['wooden_sword']
      },
      quests: {
        quest_grandma_berries: {
          questId: 'quest_grandma_berries',
          currentStageIndex: 0,
          stageProgress: 0,
          completed: false
        },
        quest_moss_gate: {
          questId: 'quest_moss_gate',
          currentStageIndex: 0,
          stageProgress: 0,
          completed: false
        }
      },
      stats: {
        bushesCut: 0,
        potsSmashed: 0,
        rollsExecuted: 0,
        damageDealt: 0,
        damageTaken: 0,
        berriesCollected: 0,
        coinsCollected: 0,
        bossesDefeated: 0,
        questsCompleted: 0
      },
      worldFlags: []
    }
  },

  preset_boss_arena: {
    id: 'preset_boss_arena',
    title: '⚔️ Boss Arena Ready',
    description: 'Fully equipped knight at the arena gates, armed with steel sword, plate armor, and potions.',
    snapshot: {
      id: 'snap_boss_arena',
      label: 'Preset: Boss Arena Ready',
      timestamp: 1700000001000,
      player: {
        name: 'Knight Champion',
        palette: 2,
        x: 1600,
        y: 1200,
        health: 10,
        maxHealth: 10,
        coins: 500,
        acorns: 80,
        inventory: [
          'sword_steel',
          'shield_iron',
          'armor_plate',
          'potion_health',
          'potion_health',
          'potion_speed',
          'relic_heart'
        ]
      },
      quests: {
        quest_grandma_berries: {
          questId: 'quest_grandma_berries',
          currentStageIndex: 2,
          stageProgress: 3,
          completed: true,
          completedAt: 1700000000500
        },
        quest_moss_gate: {
          questId: 'quest_moss_gate',
          currentStageIndex: 1,
          stageProgress: 1,
          completed: true,
          completedAt: 1700000000900
        }
      },
      stats: {
        bushesCut: 20,
        potsSmashed: 15,
        rollsExecuted: 25,
        damageDealt: 350,
        damageTaken: 50,
        berriesCollected: 3,
        coinsCollected: 500,
        bossesDefeated: 0,
        questsCompleted: 2
      },
      worldFlags: ['gate_unsealed', 'grandma_jam_completed', 'boss_arena_unlocked']
    }
  },

  preset_puzzler: {
    id: 'preset_puzzler',
    title: '🧩 Puzzler & Dungeon Delver',
    description: 'Catacombs explorer with ancient relic, ocarina instrument, dungeon key, and high agility.',
    snapshot: {
      id: 'snap_puzzler',
      label: 'Preset: Puzzler',
      timestamp: 1700000002000,
      player: {
        name: 'Riddle Seeker',
        palette: 4,
        x: 450,
        y: 600,
        health: 6,
        maxHealth: 6,
        coins: 250,
        acorns: 45,
        inventory: [
          'relic_feather',
          'fishing_rod_bamboo',
          'key_iron',
          'potion_health',
          'fish_golden_carp',
          'sunken_chest'
        ]
      },
      quests: {
        quest_grandma_berries: {
          questId: 'quest_grandma_berries',
          currentStageIndex: 2,
          stageProgress: 3,
          completed: true
        },
        quest_moss_gate: {
          questId: 'quest_moss_gate',
          currentStageIndex: 1,
          stageProgress: 1,
          completed: true
        }
      },
      stats: {
        bushesCut: 10,
        potsSmashed: 30,
        rollsExecuted: 40,
        damageDealt: 120,
        damageTaken: 20,
        berriesCollected: 3,
        coinsCollected: 250,
        bossesDefeated: 0,
        questsCompleted: 2
      },
      worldFlags: ['gate_unsealed', 'catacombs_unlocked', 'puzzle_pressure_plates_solved']
    }
  }
};

export const AVAILABLE_SPAWN_ITEMS = [
  { id: 'wooden_sword', name: 'Wooden Practice Stick', category: 'weapon' },
  { id: 'sword_iron', name: 'Iron Broadsword', category: 'weapon' },
  { id: 'sword_steel', name: 'Forged Steel Blade', category: 'weapon' },
  { id: 'shield_wood', name: 'Wooden Buckler', category: 'offhand' },
  { id: 'shield_iron', name: 'Iron Heater Shield', category: 'offhand' },
  { id: 'armor_cloth', name: 'Cloth Tunic', category: 'armor' },
  { id: 'armor_leather', name: 'Leather Jerkin', category: 'armor' },
  { id: 'armor_plate', name: 'Knight Plate Armor', category: 'armor' },
  { id: 'armor_robe', name: 'Mystic Robe', category: 'armor' },
  { id: 'potion_health', name: 'Sweet Brew Health Potion', category: 'consumable' },
  { id: 'potion_speed', name: 'Elixir of Swiftness', category: 'consumable' },
  { id: 'relic_heart', name: 'Ancient Heart Relic', category: 'relic' },
  { id: 'relic_feather', name: 'Zephyr Feather Relic', category: 'relic' },
  { id: 'relic_moonstone', name: 'Moonstone Charm', category: 'relic' },
  { id: 'relic_phoenix', name: 'Phoenix Ash Amulet', category: 'relic' },
  { id: 'relic_sun_stone', name: 'Twin Sun Stone', category: 'relic' },
  { id: 'vanity_crown', name: 'Royal Gilded Crown', category: 'vanity' },
  { id: 'vanity_hat_wizard', name: 'Starry Wizard Hat', category: 'vanity' },
  { id: 'vanity_cape_hero', name: 'Heroic Crimson Cape', category: 'vanity' },
  { id: 'fishing_rod_bamboo', name: 'Bamboo Fishing Rod', category: 'tool' },
  { id: 'fish_golden_carp', name: 'Rare Golden Carp', category: 'fish' },
  { id: 'key_iron', name: 'Rusted Iron Key', category: 'key' },
  { id: 'sunken_chest', name: 'Barnacle Sunken Chest', category: 'treasure' }
];

export const AVAILABLE_WORLD_FLAGS = [
  'gate_unsealed',
  'grandma_jam_completed',
  'boss_arena_unlocked',
  'catacombs_unlocked',
  'puzzle_pressure_plates_solved',
  'secret_grove_revealed',
  'campfires_lit',
  'trader_pip_unlocked'
];

export class SaveStateInspector {
  private history: SaveSnapshot[] = [];
  private currentIndex: number = -1;
  private currentSnapshot: SaveSnapshot;
  private containerEl: HTMLElement | null = null;

  constructor(containerId: string = 'save-state-container') {
    // Start with default new player profile
    const initialSnap = JSON.parse(JSON.stringify(PRESET_WORLD_STATES.preset_new_player.snapshot));
    initialSnap.timestamp = Date.now();
    this.history.push(initialSnap);
    this.currentSnapshot = JSON.parse(JSON.stringify(initialSnap));
    this.currentIndex = 0;

    this.initDOM(containerId);
  }

  public initDOM(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.containerEl = container;

    container.innerHTML = `
      <div class="save-state-root" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: -apple-system, sans-serif;">
        <!-- Top Toolbar -->
        <div class="ss-toolbar" style="background: #1e293b; border-bottom: 1px solid #334155; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: bold; color: #38bdf8; font-size: 13px;">💾 SAVE-STATE & TIME MACHINE DEBUGGER</span>
            <span id="ss-conn-badge" class="pill" style="font-size: 10px; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 2px 6px; border-radius: 4px;">● Ready</span>
          </div>

          <!-- Quick Presets -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: #94a3b8; margin-right: 4px;">Presets:</span>
            <button class="btn btn-preset" data-preset="preset_new_player" style="font-size: 11px; padding: 4px 8px;">🌱 New Player</button>
            <button class="btn btn-preset" data-preset="preset_boss_arena" style="font-size: 11px; padding: 4px 8px;">⚔️ Boss Ready</button>
            <button class="btn btn-preset" data-preset="preset_puzzler" style="font-size: 11px; padding: 4px 8px;">🧩 Puzzler</button>
          </div>

          <!-- Time Machine & Export Controls -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="btn-ss-capture" class="btn btn-primary" style="font-size: 11px; padding: 4px 10px;">📸 Capture Snapshot</button>
            <button id="btn-ss-rewind" class="btn" title="Rewind Step (Ctrl+[)" style="font-size: 11px; padding: 4px 8px;">⏮ Rewind</button>
            <button id="btn-ss-forward" class="btn" title="Forward Step (Ctrl+])" style="font-size: 11px; padding: 4px 8px;">Forward ⏭</button>
            <button id="btn-ss-inject" class="btn" style="border: 1px solid #10b981; color: #34d399; font-size: 11px; padding: 4px 8px;">⚡ Inject to Game</button>
            <button id="btn-ss-export" class="btn" style="border: 1px solid #6366f1; color: #818cf8; font-size: 11px; padding: 4px 8px;">📥 Export</button>
            <button id="btn-ss-import" class="btn" style="border: 1px solid #f59e0b; color: #fbbf24; font-size: 11px; padding: 4px 8px;">📤 Import</button>
          </div>
        </div>

        <!-- Time Machine Timeline Bar -->
        <div class="ss-timeline-bar" style="background: #0f172a; border-bottom: 1px solid #334155; padding: 8px 16px; display: flex; align-items: center; gap: 10px; overflow-x: auto;">
          <span style="font-size: 11px; font-weight: bold; color: #94a3b8; white-space: nowrap;">⏳ Timeline:</span>
          <div id="ss-timeline-track" style="display: flex; align-items: center; gap: 8px; flex: 1; overflow-x: auto;">
            <!-- Snapshots pills rendered here -->
          </div>
        </div>

        <!-- 3-Column Inspection / Injection Workspace -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; flex: 1; min-height: 0; overflow-y: auto; gap: 1px; background: #334155;">
          
          <!-- Column 1: Player Attributes & Teleportation -->
          <div style="background: #090d16; padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
              <h3 style="font-size: 13px; font-weight: bold; color: #38bdf8;">🧙 Player Stats & Position</h3>
              <span id="label-player-health-display" style="font-size: 11px; color: #fbbf24;">HP: 3/3</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
              <div>
                <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Player Name:</label>
                <input type="text" id="ss-input-name" class="btn" style="width: 100%; text-align: left; background: #1e293b; border: 1px solid #475569;" value="Adventurer" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Current HP:</label>
                  <input type="number" id="ss-input-hp" min="1" max="20" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="3" />
                </div>
                <div>
                  <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Max HP:</label>
                  <input type="number" id="ss-input-maxhp" min="1" max="20" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="3" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Coins (Gold):</label>
                  <input type="number" id="ss-input-coins" min="0" max="99999" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="0" />
                </div>
                <div>
                  <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Acorns (Forest):</label>
                  <input type="number" id="ss-input-acorns" min="0" max="9999" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="0" />
                </div>
              </div>

              <div style="border-top: 1px solid #1e293b; padding-top: 10px;">
                <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px;">World Coordinates (X / Y):</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                  <input type="number" id="ss-input-x" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="1024" />
                  <input type="number" id="ss-input-y" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569;" value="928" />
                </div>
                <div style="display: flex; gap: 6px;">
                  <button id="btn-tp-village" class="btn" style="font-size: 10px; flex: 1;">🏡 Village (1024, 928)</button>
                  <button id="btn-tp-arena" class="btn" style="font-size: 10px; flex: 1;">👑 Arena (1600, 1200)</button>
                  <button id="btn-tp-catacombs" class="btn" style="font-size: 10px; flex: 1;">🪦 Catacombs (450, 600)</button>
                </div>
              </div>

              <div style="border-top: 1px solid #1e293b; padding-top: 10px;">
                <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Palette Variation:</label>
                <select id="ss-input-palette" class="btn" style="width: 100%; background: #1e293b; border: 1px solid #475569; font-size: 11px;">
                  <option value="0">Classic Green Tunic</option>
                  <option value="1">Crimson Wanderer</option>
                  <option value="2">Royal Knight Azure</option>
                  <option value="3">Shadow Rogue</option>
                  <option value="4">Amethyst Mage</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Column 2: Inventory & Item Spawner -->
          <div style="background: #090d16; padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
              <h3 style="font-size: 13px; font-weight: bold; color: #34d399;">🎒 Inventory & Item Spawner</h3>
              <button id="btn-ss-clear-inv" class="btn" style="font-size: 10px; color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 6px;">Clear All</button>
            </div>

            <!-- Item Spawner Dropdown -->
            <div style="display: flex; gap: 6px;">
              <select id="ss-item-spawner-select" class="btn" style="flex: 1; background: #1e293b; border: 1px solid #475569; font-size: 11px; padding: 4px 6px;">
                ${AVAILABLE_SPAWN_ITEMS.map(it => `<option value="${it.id}">[${it.category}] ${it.name}</option>`).join('')}
              </select>
              <button id="btn-ss-spawn-item" class="btn btn-primary" style="font-size: 11px; padding: 4px 10px;">+ Spawn</button>
            </div>

            <!-- Current Inventory List -->
            <div>
              <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 6px;">Current Items in Bag:</span>
              <div id="ss-inventory-container" style="display: flex; flex-wrap: wrap; gap: 6px; min-height: 120px; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px; align-content: flex-start;">
                <!-- Item tags rendered here -->
              </div>
            </div>
          </div>

          <!-- Column 3: Quest Progression & World Flags Matrix -->
          <div style="background: #090d16; padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
              <h3 style="font-size: 13px; font-weight: bold; color: #fbbf24;">📜 Quests & World Flags</h3>
              <button id="btn-ss-reset-flags" class="btn" style="font-size: 10px; color: #94a3b8; padding: 2px 6px;">Reset</button>
            </div>

            <!-- Quest Stage Matrix -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <span style="font-size: 11px; color: #94a3b8;">Active Quests Progression:</span>
              
              <!-- Quest 1: Grandma's Jam -->
              <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: #f8fafc;">Grandma's Fresh Jam</strong>
                  <label style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4ade80;">
                    <input type="checkbox" id="ss-q-grandma-complete" /> Completed
                  </label>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8;">Stage:</span>
                  <select id="ss-q-grandma-stage" class="btn" style="flex: 1; font-size: 10px; padding: 2px 4px; background: #1e293b;">
                    <option value="0">0: Talk to Grandma</option>
                    <option value="1">1: Collect 3 Strawberries</option>
                    <option value="2">2: Return to Grandma</option>
                  </select>
                </div>
              </div>

              <!-- Quest 2: Ancient Moss Gate -->
              <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: #f8fafc;">Ancient Moss Gate</strong>
                  <label style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4ade80;">
                    <input type="checkbox" id="ss-q-gate-complete" /> Completed
                  </label>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8;">Stage:</span>
                  <select id="ss-q-gate-stage" class="btn" style="flex: 1; font-size: 10px; padding: 2px 4px; background: #1e293b;">
                    <option value="0">0: Examine Twin Pressure Switches</option>
                    <option value="1">1: Place Pots on Switches</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- World Flags Toggles -->
            <div style="border-top: 1px solid #1e293b; padding-top: 10px;">
              <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 6px;">World State & Event Flags:</span>
              <div id="ss-world-flags-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
                ${AVAILABLE_WORLD_FLAGS.map(flag => `
                  <label style="display: flex; align-items: center; gap: 6px; background: #0f172a; border: 1px solid #1e293b; border-radius: 4px; padding: 4px 6px; cursor: pointer;">
                    <input type="checkbox" class="ss-world-flag-checkbox" data-flag="${flag}" />
                    <span style="color: #cbd5e1; font-family: monospace;">${flag}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
    this.render();
  }

  private setupEvents() {
    if (!this.containerEl) return;

    // Presets
    this.containerEl.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = (e.currentTarget as HTMLElement).dataset.preset;
        if (presetId) this.loadPreset(presetId);
      });
    });

    // Time machine controls
    this.containerEl.querySelector('#btn-ss-capture')?.addEventListener('click', () => {
      this.captureSnapshot('Manual Capture');
    });
    this.containerEl.querySelector('#btn-ss-rewind')?.addEventListener('click', () => {
      this.stepRewind();
    });
    this.containerEl.querySelector('#btn-ss-forward')?.addEventListener('click', () => {
      this.stepForward();
    });
    this.containerEl.querySelector('#btn-ss-inject')?.addEventListener('click', () => {
      this.applyToLiveGame();
    });
    this.containerEl.querySelector('#btn-ss-export')?.addEventListener('click', () => {
      this.exportSnapshotsJson();
    });
    this.containerEl.querySelector('#btn-ss-import')?.addEventListener('click', () => {
      this.importSnapshotsPrompt();
    });

    // Inputs binding
    const bindNum = (id: string, key: keyof SaveSnapshotPlayer) => {
      const el = this.containerEl?.querySelector(id) as HTMLInputElement | null;
      el?.addEventListener('change', () => {
        (this.currentSnapshot.player as any)[key] = Number(el.value);
        this.updateHeaderLabels();
      });
    };

    bindNum('#ss-input-hp', 'health');
    bindNum('#ss-input-maxhp', 'maxHealth');
    bindNum('#ss-input-coins', 'coins');
    bindNum('#ss-input-acorns', 'acorns');
    bindNum('#ss-input-x', 'x');
    bindNum('#ss-input-y', 'y');

    const nameInput = this.containerEl.querySelector('#ss-input-name') as HTMLInputElement | null;
    nameInput?.addEventListener('change', () => {
      this.currentSnapshot.player.name = nameInput.value;
    });

    const palSelect = this.containerEl.querySelector('#ss-input-palette') as HTMLSelectElement | null;
    palSelect?.addEventListener('change', () => {
      this.currentSnapshot.player.palette = Number(palSelect.value);
    });

    // Teleport buttons
    this.containerEl.querySelector('#btn-tp-village')?.addEventListener('click', () => {
      this.setPlayerPos(1024, 928);
    });
    this.containerEl.querySelector('#btn-tp-arena')?.addEventListener('click', () => {
      this.setPlayerPos(1600, 1200);
    });
    this.containerEl.querySelector('#btn-tp-catacombs')?.addEventListener('click', () => {
      this.setPlayerPos(450, 600);
    });

    // Item Spawner
    this.containerEl.querySelector('#btn-ss-spawn-item')?.addEventListener('click', () => {
      const sel = this.containerEl?.querySelector('#ss-item-spawner-select') as HTMLSelectElement | null;
      if (sel && sel.value) {
        this.addItem(sel.value);
      }
    });

    this.containerEl.querySelector('#btn-ss-clear-inv')?.addEventListener('click', () => {
      this.clearInventory();
    });

    // Quests
    const qGrandmaStage = this.containerEl.querySelector('#ss-q-grandma-stage') as HTMLSelectElement | null;
    const qGrandmaComp = this.containerEl.querySelector('#ss-q-grandma-complete') as HTMLInputElement | null;
    qGrandmaStage?.addEventListener('change', () => {
      this.setQuestStage('quest_grandma_berries', Number(qGrandmaStage.value), qGrandmaComp?.checked || false);
    });
    qGrandmaComp?.addEventListener('change', () => {
      this.setQuestStage('quest_grandma_berries', Number(qGrandmaStage?.value || 0), qGrandmaComp.checked);
    });

    const qGateStage = this.containerEl.querySelector('#ss-q-gate-stage') as HTMLSelectElement | null;
    const qGateComp = this.containerEl.querySelector('#ss-q-gate-complete') as HTMLInputElement | null;
    qGateStage?.addEventListener('change', () => {
      this.setQuestStage('quest_moss_gate', Number(qGateStage.value), qGateComp?.checked || false);
    });
    qGateComp?.addEventListener('change', () => {
      this.setQuestStage('quest_moss_gate', Number(qGateStage?.value || 0), qGateComp.checked);
    });

    // World flags checkboxes
    this.containerEl.querySelectorAll('.ss-world-flag-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const flag = (e.currentTarget as HTMLElement).dataset.flag;
        if (flag) this.toggleWorldFlag(flag, (e.currentTarget as HTMLInputElement).checked);
      });
    });

    this.containerEl.querySelector('#btn-ss-reset-flags')?.addEventListener('click', () => {
      this.currentSnapshot.worldFlags = [];
      this.render();
    });
  }

  private setPlayerPos(x: number, y: number) {
    this.currentSnapshot.player.x = x;
    this.currentSnapshot.player.y = y;
    const xIn = this.containerEl?.querySelector('#ss-input-x') as HTMLInputElement | null;
    const yIn = this.containerEl?.querySelector('#ss-input-y') as HTMLInputElement | null;
    if (xIn) xIn.value = String(x);
    if (yIn) yIn.value = String(y);
  }

  // -------------------------------------------------------------------------
  // Time Machine & Snapshot History API
  // -------------------------------------------------------------------------

  public captureSnapshot(label: string = 'Snapshot'): SaveSnapshot {
    // Synchronize live data if running in browser
    let p = { ...this.currentSnapshot.player };
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('bitquest_save_profile_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            p.x = parsed.x ?? p.x;
            p.y = parsed.y ?? p.y;
            p.coins = parsed.coins ?? p.coins;
            p.acorns = parsed.acorns ?? p.acorns;
            p.health = parsed.health ?? p.health;
            p.maxHealth = parsed.maxHealth ?? p.maxHealth;
            if (Array.isArray(parsed.inventory)) p.inventory = [...parsed.inventory];
          }
        }
      }
    } catch (_) {}

    const newSnap: SaveSnapshot = {
      id: `snap_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: `${label} #${this.history.length + 1}`,
      timestamp: Date.now(),
      player: p,
      quests: JSON.parse(JSON.stringify(this.currentSnapshot.quests || {})),
      stats: JSON.parse(JSON.stringify(this.currentSnapshot.stats || {})),
      worldFlags: [...(this.currentSnapshot.worldFlags || [])]
    };

    SaveSnapshotSchema.parse(newSnap);

    this.history.push(newSnap);
    if (this.history.length > 50) this.history.shift(); // retain last 50
    this.currentIndex = this.history.length - 1;
    this.currentSnapshot = JSON.parse(JSON.stringify(newSnap));

    this.render();
    return newSnap;
  }

  public restoreSnapshot(index: number): boolean {
    if (index < 0 || index >= this.history.length) return false;
    this.currentIndex = index;
    this.currentSnapshot = JSON.parse(JSON.stringify(this.history[index]));

    this.applyToLiveGame();
    this.render();
    return true;
  }

  public stepRewind(): boolean {
    if (this.currentIndex > 0) {
      return this.restoreSnapshot(this.currentIndex - 1);
    }
    return false;
  }

  public stepForward(): boolean {
    if (this.currentIndex < this.history.length - 1) {
      return this.restoreSnapshot(this.currentIndex + 1);
    }
    return false;
  }

  public loadPreset(presetId: string): SaveSnapshot | null {
    const preset = PRESET_WORLD_STATES[presetId];
    if (!preset) return null;

    const snap = JSON.parse(JSON.stringify(preset.snapshot)) as SaveSnapshot;
    snap.id = `snap_${Date.now()}`;
    snap.timestamp = Date.now();
    snap.label = preset.title;

    this.history.push(JSON.parse(JSON.stringify(snap)));
    this.currentIndex = this.history.length - 1;
    this.currentSnapshot = JSON.parse(JSON.stringify(snap));

    this.applyToLiveGame();
    this.render();
    return snap;
  }

  public getHistory(): SaveSnapshot[] {
    return this.history;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getCurrentSnapshot(): SaveSnapshot {
    return this.currentSnapshot;
  }

  // -------------------------------------------------------------------------
  // State Mutation & Live Injection
  // -------------------------------------------------------------------------

  public setPlayerState(partial: Partial<SaveSnapshotPlayer>) {
    Object.assign(this.currentSnapshot.player, partial);
    this.updateHeaderLabels();
  }

  public addItem(itemType: string) {
    this.currentSnapshot.player.inventory.push(itemType);
    this.renderInventory();
  }

  public removeItem(index: number) {
    if (index >= 0 && index < this.currentSnapshot.player.inventory.length) {
      this.currentSnapshot.player.inventory.splice(index, 1);
      this.renderInventory();
    }
  }

  public clearInventory() {
    this.currentSnapshot.player.inventory = [];
    this.renderInventory();
  }

  public setQuestStage(questId: string, stageIndex: number, completed: boolean = false) {
    if (!this.currentSnapshot.quests) this.currentSnapshot.quests = {};
    this.currentSnapshot.quests[questId] = {
      questId,
      currentStageIndex: stageIndex,
      stageProgress: completed ? 3 : 0,
      completed,
      completedAt: completed ? Date.now() : undefined
    };
  }

  public toggleWorldFlag(flag: string, enable?: boolean) {
    if (!this.currentSnapshot.worldFlags) this.currentSnapshot.worldFlags = [];
    const idx = this.currentSnapshot.worldFlags.indexOf(flag);
    const shouldAdd = enable !== undefined ? enable : idx === -1;

    if (shouldAdd && idx === -1) {
      this.currentSnapshot.worldFlags.push(flag);
    } else if (!shouldAdd && idx !== -1) {
      this.currentSnapshot.worldFlags.splice(idx, 1);
    }
  }

  public applyToLiveGame() {
    // 1. Write to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        // Player Profile
        const rawSave = localStorage.getItem('bitquest_save_profile_v1');
        let parsedSave: any = {};
        if (rawSave) {
          try { parsedSave = JSON.parse(rawSave); } catch (_) {}
        }
        parsedSave = {
          ...parsedSave,
          version: 1,
          name: this.currentSnapshot.player.name,
          palette: this.currentSnapshot.player.palette,
          x: this.currentSnapshot.player.x,
          y: this.currentSnapshot.player.y,
          health: this.currentSnapshot.player.health,
          maxHealth: this.currentSnapshot.player.maxHealth,
          coins: this.currentSnapshot.player.coins,
          acorns: this.currentSnapshot.player.acorns,
          inventory: [...this.currentSnapshot.player.inventory]
        };
        localStorage.setItem('bitquest_save_profile_v1', JSON.stringify(parsedSave));

        // Quests
        localStorage.setItem('bitquest_quest_progress_v1', JSON.stringify(this.currentSnapshot.quests));
      }
    } catch (e) {
      console.warn('Failed to write save to localStorage', e);
    }

    // 2. Push directly into active WorldScene if mounted
    try {
      if (typeof window !== 'undefined') {
        const g = (window as any).BitQuestGame;
        const scene = g?.scene?.getScene('WorldScene');
        if (scene && scene.localPlayer) {
          const lp = scene.localPlayer;
          lp.health = this.currentSnapshot.player.health;
          lp.maxHealth = this.currentSnapshot.player.maxHealth;
          lp.coins = this.currentSnapshot.player.coins;
          lp.acorns = this.currentSnapshot.player.acorns;
          lp.inventory = [...this.currentSnapshot.player.inventory];
          if (lp.sprite && typeof lp.sprite.setPosition === 'function') {
            lp.sprite.setPosition(this.currentSnapshot.player.x, this.currentSnapshot.player.y);
          }
        }
      }
    } catch (_) {}
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  public render() {
    if (!this.containerEl) return;

    this.renderTimeline();
    this.renderPlayerForm();
    this.renderInventory();
    this.renderQuestsAndFlags();
  }

  private renderTimeline() {
    const track = this.containerEl?.querySelector('#ss-timeline-track');
    if (!track) return;

    track.innerHTML = this.history.map((snap, idx) => {
      const isCurrent = idx === this.currentIndex;
      const border = isCurrent ? '#38bdf8' : '#334155';
      const bg = isCurrent ? 'rgba(56, 189, 248, 0.15)' : '#1e293b';
      const color = isCurrent ? '#38bdf8' : '#cbd5e1';
      const timeStr = new Date(snap.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return `
        <button class="btn btn-timeline-pill" data-index="${idx}" style="background: ${bg}; border: 1px solid ${border}; color: ${color}; font-size: 10px; padding: 4px 8px; border-radius: 4px; white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>${isCurrent ? '▶ ' : ''}${snap.label}</span>
          <span style="opacity: 0.6; font-size: 9px;">${timeStr}</span>
        </button>
      `;
    }).join('');

    track.querySelectorAll('.btn-timeline-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.index);
        this.restoreSnapshot(idx);
      });
    });
  }

  private renderPlayerForm() {
    if (!this.containerEl) return;
    const p = this.currentSnapshot.player;

    const setVal = (id: string, val: any) => {
      const el = this.containerEl?.querySelector(id) as HTMLInputElement | null;
      if (el) el.value = String(val);
    };

    setVal('#ss-input-name', p.name);
    setVal('#ss-input-hp', p.health);
    setVal('#ss-input-maxhp', p.maxHealth);
    setVal('#ss-input-coins', p.coins);
    setVal('#ss-input-acorns', p.acorns);
    setVal('#ss-input-x', p.x);
    setVal('#ss-input-y', p.y);
    setVal('#ss-input-palette', p.palette);

    this.updateHeaderLabels();
  }

  private updateHeaderLabels() {
    const lbl = this.containerEl?.querySelector('#label-player-health-display');
    if (lbl) {
      lbl.textContent = `HP: ${this.currentSnapshot.player.health}/${this.currentSnapshot.player.maxHealth}`;
    }
  }

  private renderInventory() {
    const invEl = this.containerEl?.querySelector('#ss-inventory-container');
    if (!invEl) return;

    if (this.currentSnapshot.player.inventory.length === 0) {
      invEl.innerHTML = `<span style="font-size: 11px; color: #64748b; font-style: italic; padding: 8px;">Pouch is currently empty.</span>`;
      return;
    }

    invEl.innerHTML = this.currentSnapshot.player.inventory.map((item, idx) => {
      const match = AVAILABLE_SPAWN_ITEMS.find(i => i.id === item);
      const name = match ? match.name : item;
      return `
        <span style="background: #1e293b; border: 1px solid #475569; border-radius: 4px; padding: 2px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; color: #f8fafc;">
          <span>${name}</span>
          <button class="btn-remove-item" data-index="${idx}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 12px; font-weight: bold;">×</button>
        </span>
      `;
    }).join('');

    invEl.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.index);
        this.removeItem(idx);
      });
    });
  }

  private renderQuestsAndFlags() {
    if (!this.containerEl) return;
    const quests = this.currentSnapshot.quests || {};

    const qG = quests['quest_grandma_berries'];
    const gStage = this.containerEl.querySelector('#ss-q-grandma-stage') as HTMLSelectElement | null;
    const gComp = this.containerEl.querySelector('#ss-q-grandma-complete') as HTMLInputElement | null;
    if (gStage && qG) gStage.value = String(qG.currentStageIndex);
    if (gComp && qG) gComp.checked = !!qG.completed;

    const qM = quests['quest_moss_gate'];
    const mStage = this.containerEl.querySelector('#ss-q-gate-stage') as HTMLSelectElement | null;
    const mComp = this.containerEl.querySelector('#ss-q-gate-complete') as HTMLInputElement | null;
    if (mStage && qM) mStage.value = String(qM.currentStageIndex);
    if (mComp && qM) mComp.checked = !!qM.completed;

    // Checkboxes
    const flags = new Set(this.currentSnapshot.worldFlags || []);
    this.containerEl.querySelectorAll('.ss-world-flag-checkbox').forEach(cb => {
      const flag = (cb as HTMLElement).dataset.flag;
      if (flag) {
        (cb as HTMLInputElement).checked = flags.has(flag);
      }
    });
  }

  // -------------------------------------------------------------------------
  // JSON Export / Import
  // -------------------------------------------------------------------------

  public exportSnapshotsJson(skipPrompt: boolean = false): string {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      currentIndex: this.currentIndex,
      snapshots: this.history
    };
    const json = JSON.stringify(payload, null, 2);

    try {
      navigator.clipboard?.writeText?.(json).catch(() => {});
    } catch (_) {}

    if (!skipPrompt) {
      try {
        if (typeof window !== 'undefined' && typeof (window as any).prompt === 'function') {
          (window as any).prompt('Save States & Time Machine Export (Copied!):', json);
        }
      } catch (_) {}
    }

    return json;
  }

  public importSnapshotsJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.snapshots)) {
        throw new Error('Payload missing snapshots array');
      }

      for (const snap of parsed.snapshots) {
        SaveSnapshotSchema.parse(snap);
      }

      this.history = parsed.snapshots;
      this.currentIndex = typeof parsed.currentIndex === 'number' && parsed.currentIndex < this.history.length
        ? parsed.currentIndex
        : this.history.length - 1;

      this.currentSnapshot = JSON.parse(JSON.stringify(this.history[this.currentIndex]));
      this.applyToLiveGame();
      this.render();
      return true;
    } catch (e: any) {
      if (typeof window !== 'undefined' && typeof (window as any).alert === 'function') {
        (window as any).alert(`Invalid Snapshot JSON: ${e.message}`);
      }
      throw e;
    }
  }

  public importSnapshotsPrompt() {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).prompt === 'function') {
        const input = (window as any).prompt('Paste Save States JSON:');
        if (input) this.importSnapshotsJson(input);
      }
    } catch (_) {}
  }
}
