/**
 * BitQuest - Studio-Grade Multiplayer GM "God Mode" & Spectator Console (Milestone 9.7)
 *
 * Provides:
 * 1. Live 2048x2048 World Radar & Spectator Map tracking players, enemies, and dropped items.
 * 2. GM God Mode Controls: Instant Teleport, God Invincibility, Speed Boost, Full Heal, Ghost Mode.
 * 3. Matrix Item & Monster Spawner: 1-click batch spawning at player or radar coordinate.
 * 4. World State Overrides: Gate toggle, puzzle switch solve, weather set, and time of day jump.
 * 5. Server WebSocket Health HUD: Live RTT / Ping latency sparkline, packet loss, entity census.
 * 6. Live-Ops Event Log: Timestamped audit trail of GM actions, combat broadcasts, and netcode packets.
 */

import {
  GMLocationBookmarkSchema,
  GMTelemetryReportSchema,
  type GMLocationBookmark,
  type GMTelemetryReport,
  type GMSpawnCommand
} from '../../../shared/src/schemas';
import gmBookmarksJson from '../../../shared/data/gmBookmarks.json';

export interface GMPlayerState {
  id: string;
  name: string;
  className: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ping: number;
  isGodMode: boolean;
  isGhost: boolean;
  speedBoost: boolean;
}

export interface GMEntityMarker {
  id: string;
  type: 'player' | 'enemy' | 'boss' | 'item' | 'npc';
  name: string;
  x: number;
  y: number;
  hp?: number;
  maxHp?: number;
  subType?: string;
}

export interface GMEventLogEntry {
  timestamp: string;
  category: 'gm' | 'netcode' | 'combat' | 'world';
  message: string;
}

export class GMConsoleStudio {
  public root: HTMLElement | null = null;
  public bookmarks: GMLocationBookmark[] = [];
  public players: Map<string, GMPlayerState> = new Map();
  public entities: Map<string, GMEntityMarker> = new Map();
  public selectedPlayerId: string | null = null;
  public targetCoords: { x: number; y: number } = { x: 480, y: 720 };
  public eventLog: GMEventLogEntry[] = [];

  // Telemetry
  public pingHistory: number[] = [18, 22, 19, 21, 24, 20, 19, 18, 23, 21];
  public serverStatus: 'connected' | 'mock_simulator' | 'disconnected' = 'mock_simulator';
  public currentWeather: 'clear' | 'rain' | 'storm' | 'fog' = 'clear';
  public currentHour: number = 12.0;

  // Viewport & Radar
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx!: CanvasRenderingContext2D;
  private pingCanvas!: HTMLCanvasElement;
  private pingCtx!: CanvasRenderingContext2D;
  private radarZoom: number = 1.0;
  private radarPan: { x: number; y: number } = { x: 0, y: 0 };
  private isPanningRadar: boolean = false;
  private lastMouse: { x: number; y: number } = { x: 0, y: 0 };
  private animFrameId: number | null = null;

  // DOM Elements
  private logListEl!: HTMLElement;
  private coordsBadgeEl!: HTMLElement;
  private telemetryEl!: HTMLElement;

  constructor(containerIdOrElement?: string | HTMLElement | null) {
    if (typeof containerIdOrElement === 'string') {
      this.root = typeof document !== 'undefined' ? document.getElementById(containerIdOrElement) : null;
    } else {
      this.root = containerIdOrElement || null;
    }

    this.bookmarks = (gmBookmarksJson as any[]).map(b => GMLocationBookmarkSchema.parse(b));
    this.initMockWorld();

    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.resizeCanvases();
      this.render();
      this.startLoop();
    }
  }

  private initMockWorld() {
    // Populate starter simulated players
    this.players.set('gm_self', {
      id: 'gm_self',
      name: 'GameMaster_Root',
      className: 'mage',
      x: 480,
      y: 720,
      hp: 100,
      maxHp: 100,
      ping: 18,
      isGodMode: true,
      isGhost: false,
      speedBoost: true
    });

    this.players.set('player_2', {
      id: 'player_2',
      name: 'Sir_Barnaby',
      className: 'warrior',
      x: 1024,
      y: 480,
      hp: 85,
      maxHp: 120,
      ping: 24,
      isGodMode: false,
      isGhost: false,
      speedBoost: false
    });

    this.players.set('player_3', {
      id: 'player_3',
      name: 'Lyra_Shadowstep',
      className: 'rogue',
      x: 1472,
      y: 768,
      hp: 60,
      maxHp: 90,
      ping: 32,
      isGodMode: false,
      isGhost: false,
      speedBoost: false
    });

    this.selectedPlayerId = 'gm_self';

    // Populate mock entities
    this.entities.set('boss_baron', {
      id: 'boss_baron',
      type: 'boss',
      name: 'Baron Von Grumble',
      x: 1024,
      y: 280,
      hp: 12,
      maxHp: 12
    });

    this.entities.set('enemy_1', {
      id: 'enemy_1',
      type: 'enemy',
      name: 'Sproutling Scout',
      x: 580,
      y: 620,
      hp: 4,
      maxHp: 4,
      subType: 'sproutling'
    });

    this.entities.set('item_drop_1', {
      id: 'item_drop_1',
      type: 'item',
      name: 'Gold Coins ×50',
      x: 500,
      y: 730,
      subType: 'coin'
    });

    this.logEvent('gm', 'Multiplayer GM God Mode & Spectator Console initialized.');
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="gm-console-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #07090e; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none;">
        
        <!-- Header Toolbar -->
        <header style="background: #0f141f; border-bottom: 1px solid #1e293b; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #e11d48;">⚡ Multiplayer GM "God Mode" Console</span>
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>
            
            <span id="gm-badge-status" style="font-size: 10px; background: #064e3b; color: #34d399; padding: 2px 8px; border-radius: 4px; border: 1px solid #059669;">● WebSocket Live</span>
            
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>
            <span id="gm-coords-badge" style="font-size: 11px; color: #94a3b8; font-family: monospace;">Target: (480, 720)</span>
          </div>

          <!-- Quick Teleport Shortcuts -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <select id="gm-select-bookmark" style="background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;">
              <option value="">-- Jump to Landmark --</option>
              ${this.bookmarks.map(b => `<option value="${b.id}">${b.name} (${b.x}, ${b.y})</option>`).join('')}
            </select>
            <button id="gm-btn-teleport-target" class="btn btn-primary" style="font-size: 11px; padding: 3px 10px; background: #e11d48; border: 1px solid #f43f5e;">⚡ Teleport Me</button>
            <button id="gm-btn-clear-log" class="btn" style="font-size: 11px; padding: 3px 8px; background: #1e293b; border: 1px solid #334155;">🧹 Clear Log</button>
          </div>
        </header>

        <!-- Main Workspace: 3-Column Layout -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Column 1: Connected Players & GM God Mode Toggles (Left, 260px) -->
          <aside style="width: 260px; background: #0b0f19; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden;">
            
            <!-- Connected Players List -->
            <div style="padding: 10px; border-bottom: 1px solid #1e293b; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">Connected Players (<span id="gm-player-count">3</span>)</h4>
                <button id="gm-btn-ping" class="btn" style="font-size: 9px; padding: 2px 6px;">📡 Ping All</button>
              </div>
              <div id="gm-players-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
                <!-- Rendered dynamically -->
              </div>
            </div>

            <!-- God Mode Buffs for Selected Player -->
            <div style="padding: 10px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; flex-direction: column; gap: 6px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #f43f5e; margin: 0;">GM Superpowers</h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button id="gm-toggle-god" class="btn active" style="font-size: 10px; padding: 5px; background: #064e3b; border: 1px solid #10b981; color: #fff;">🛡️ God Mode</button>
                <button id="gm-toggle-speed" class="btn active" style="font-size: 10px; padding: 5px; background: #1e3a8a; border: 1px solid #3b82f6; color: #fff;">⚡ 2.5× Speed</button>
                <button id="gm-btn-heal" class="btn" style="font-size: 10px; padding: 5px; background: #1e293b; border: 1px solid #334155; color: #22c55e;">❤️ Full Heal</button>
                <button id="gm-toggle-ghost" class="btn" style="font-size: 10px; padding: 5px; background: #1e293b; border: 1px solid #334155; color: #cbd5e1;">👻 Ghost Stealth</button>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 2px;">
                <button id="gm-btn-gate" class="btn" style="font-size: 10px; padding: 4px; background: #1e293b; border: 1px solid #334155;">🚪 Toggle Gate</button>
                <button id="gm-btn-switches" class="btn" style="font-size: 10px; padding: 4px; background: #1e293b; border: 1px solid #334155;">☀️ Solve Switches</button>
              </div>
            </div>
          </aside>

          <!-- Column 2: 2048x2048 World Radar & Spectator Canvas (Center, flex: 1) -->
          <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #030509; position: relative;">
            
            <!-- Radar Canvas Viewport -->
            <div id="gm-radar-wrap" style="flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair;">
              <canvas id="gm-radar-canvas" style="display: block; box-shadow: 0 0 40px rgba(0,0,0,0.9); border: 1px solid #1e293b;"></canvas>

              <!-- Floating Radar Toolbar Overlay -->
              <div style="position: absolute; top: 10px; right: 12px; display: flex; gap: 4px; background: rgba(15,23,42,0.85); padding: 4px; border-radius: 6px; border: 1px solid #334155;">
                <button id="gm-zoom-in" class="btn" style="font-size: 10px; padding: 2px 7px;">➕</button>
                <button id="gm-zoom-out" class="btn" style="font-size: 10px; padding: 2px 7px;">➖</button>
                <button id="gm-zoom-reset" class="btn" style="font-size: 10px; padding: 2px 7px;">Reset</button>
              </div>

              <!-- Floating Help Overlay -->
              <div style="position: absolute; bottom: 10px; left: 12px; font-size: 10px; color: #94a3b8; background: rgba(15,23,42,0.85); padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; pointer-events: none;">
                Click on map to set Target Coords • Right-Click + Drag to Pan • Green: Players • Red: Monsters • Yellow: Items
              </div>
            </div>

            <!-- Bottom: Live Audit Event Log (Height: 120px) -->
            <div style="height: 120px; background: #090d16; border-top: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden;">
              <div style="padding: 4px 10px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">📜 Live-Ops Real-Time Server Event Stream</span>
                <span style="font-size: 9px; color: #64748b;">Filtering: ALL EVENTS</span>
              </div>
              <div id="gm-event-log-list" style="flex: 1; overflow-y: auto; padding: 6px 10px; font-family: monospace; font-size: 10px; line-height: 1.5; color: #cbd5e1;">
                <!-- Event log items rendered here -->
              </div>
            </div>
          </main>

          <!-- Column 3: Spawner Matrix & Telemetry HUD (Right, 300px) -->
          <aside style="width: 300px; background: #0b0f19; border-left: 1px solid #1e293b; display: flex; flex-direction: column; overflow-y: auto;">
            
            <!-- Section 1: Server Latency & WebSocket Telemetry -->
            <div style="padding: 10px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 6px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #38bdf8; margin: 0;">WebSocket Telemetry & RTT</h4>
              
              <!-- Ping Sparkline Canvas -->
              <div style="height: 48px; background: #030712; border-radius: 4px; border: 1px solid #1e293b; padding: 2px;">
                <canvas id="gm-ping-canvas" style="width: 100%; height: 100%;"></canvas>
              </div>

              <div id="gm-telemetry-body" style="font-size: 10px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; line-height: 1.4;">
                <div>Avg Ping: <b id="val-avg-ping" style="color: #34d399;">20ms</b></div>
                <div>Min/Max: <b id="val-minmax-ping" style="color: #fff;">18ms / 24ms</b></div>
                <div>Loss: <b style="color: #34d399;">0.0%</b></div>
                <div>Tick Rate: <b style="color: #fff;">20 Hz</b></div>
              </div>
            </div>

            <!-- Section 2: Matrix Item Spawner -->
            <div style="padding: 10px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 8px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #f59e0b; margin: 0;">📦 Matrix Item Spawner</h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Item:</label>
                  <select id="gm-spawn-item-type" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px; border-radius: 4px; font-size: 11px;">
                    <option value="coin">💰 Gold Coins</option>
                    <option value="potion_health">❤️ Health Potion</option>
                    <option value="potion_mana">🧪 Mana Elixir</option>
                    <option value="potion_speed">⚡ Swiftness Potion</option>
                    <option value="seed_sunbloom">🌻 Sunbloom Seed</option>
                    <option value="relic_ancient_key">🔑 Ancient Key</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Amount:</label>
                  <input type="number" id="gm-spawn-item-qty" min="1" max="100" value="25" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px; border-radius: 4px; font-size: 11px;" />
                </div>
              </div>

              <div style="display: flex; gap: 6px;">
                <button id="gm-btn-spawn-item-target" class="btn" style="flex: 1; font-size: 10px; padding: 4px; background: #1e293b; border: 1px solid #334155; color: #facc15;">Spawn at Target</button>
                <button id="gm-btn-spawn-item-me" class="btn" style="flex: 1; font-size: 10px; padding: 4px; background: #1e293b; border: 1px solid #334155; color: #facc15;">Spawn at Me</button>
              </div>
            </div>

            <!-- Section 3: Monster & Boss Spawner -->
            <div style="padding: 10px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 8px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #ef4444; margin: 0;">👾 Monster & Boss Spawner</h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Creature:</label>
                  <select id="gm-spawn-enemy-type" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px; border-radius: 4px; font-size: 11px;">
                    <option value="sproutling">🌱 Sproutling (Lv 1)</option>
                    <option value="grumble">🐗 Grumble Boar (Lv 3)</option>
                    <option value="skeleton_archer">💀 Skeleton Archer (Lv 5)</option>
                    <option value="boss_baron">👑 Baron Von Grumble</option>
                    <option value="arch_lich_vespera">🔮 Arch-Lich Vespera</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Count:</label>
                  <input type="number" id="gm-spawn-enemy-count" min="1" max="10" value="1" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px; border-radius: 4px; font-size: 11px;" />
                </div>
              </div>

              <div style="display: flex; gap: 6px;">
                <button id="gm-btn-spawn-enemy-target" class="btn" style="flex: 1; font-size: 10px; padding: 4px; background: #1e293b; border: 1px solid #334155; color: #ef4444;">Spawn at Target</button>
                <button id="gm-btn-kill-all-mobs" class="btn" style="font-size: 10px; padding: 4px 8px; background: #7f1d1d; border: 1px solid #ef4444; color: #fff;" title="Vanquish all hostile mobs">💀 Clear Mobs</button>
              </div>
            </div>

            <!-- Section 4: Weather & Time Jumps -->
            <div style="padding: 10px; display: flex; flex-direction: column; gap: 6px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #a855f7; margin: 0;">🌤️ Weather & Time Controls</h4>
              
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
                <button class="btn gm-weather-btn" data-weather="clear" style="font-size: 9px; padding: 3px;">☀️ Clear</button>
                <button class="btn gm-weather-btn" data-weather="rain" style="font-size: 9px; padding: 3px;">🌧️ Rain</button>
                <button class="btn gm-weather-btn" data-weather="storm" style="font-size: 9px; padding: 3px;">⚡ Storm</button>
                <button class="btn gm-weather-btn" data-weather="fog" style="font-size: 9px; padding: 3px;">🌫️ Fog</button>
              </div>

              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 4px;">
                <button class="btn gm-time-btn" data-hour="0" style="font-size: 9px; padding: 3px;">🌙 Night</button>
                <button class="btn gm-time-btn" data-hour="6" style="font-size: 9px; padding: 3px;">🌅 Dawn</button>
                <button class="btn gm-time-btn" data-hour="12" style="font-size: 9px; padding: 3px;">☀️ Noon</button>
                <button class="btn gm-time-btn" data-hour="17.5" style="font-size: 9px; padding: 3px;">🌇 Dusk</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.radarCanvas = this.root.querySelector('#gm-radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas.getContext('2d')!;
    this.pingCanvas = this.root.querySelector('#gm-ping-canvas') as HTMLCanvasElement;
    this.pingCtx = this.pingCanvas.getContext('2d')!;
    this.logListEl = this.root.querySelector('#gm-event-log-list') as HTMLElement;
    this.coordsBadgeEl = this.root.querySelector('#gm-coords-badge') as HTMLElement;
    this.telemetryEl = this.root.querySelector('#gm-telemetry-body') as HTMLElement;

    this.renderPlayersList();
    this.renderEventLog();
  }

  public resizeCanvases() {
    if (!this.radarCanvas || !this.pingCanvas) return;
    const wrap = this.root?.querySelector('#gm-radar-wrap') as HTMLElement;
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      this.radarCanvas.width = Math.max(400, Math.floor(rect.width));
      this.radarCanvas.height = Math.max(300, Math.floor(rect.height));
    } else {
      this.radarCanvas.width = 640;
      this.radarCanvas.height = 480;
    }

    const pWrap = this.pingCanvas.parentElement;
    if (pWrap) {
      this.pingCanvas.width = Math.max(100, pWrap.clientWidth);
      this.pingCanvas.height = 48;
    }
  }

  public onTabActivated() {
    this.resizeCanvases();
    this.render();
  }

  // -------------------------------------------------------------------------
  // Event Handlers & Interactions
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root) return;

    // Landmark Dropdown
    const selectBm = this.root.querySelector('#gm-select-bookmark') as HTMLSelectElement;
    selectBm?.addEventListener('change', () => {
      const b = this.bookmarks.find(item => item.id === selectBm.value);
      if (b) {
        this.targetCoords = { x: b.x, y: b.y };
        this.updateTargetBadge();
        this.render();
      }
    });

    // Teleport Button
    this.root.querySelector('#gm-btn-teleport-target')?.addEventListener('click', () => {
      this.teleportSelectedPlayer(this.targetCoords.x, this.targetCoords.y);
    });

    // Clear Log
    this.root.querySelector('#gm-btn-clear-log')?.addEventListener('click', () => {
      this.eventLog = [];
      this.renderEventLog();
    });

    // God Mode Toggle
    this.root.querySelector('#gm-toggle-god')?.addEventListener('click', () => {
      const p = this.getSelectedPlayer();
      if (p) {
        p.isGodMode = !p.isGodMode;
        this.logEvent('gm', `Invincibility ${p.isGodMode ? 'ENABLED' : 'DISABLED'} for ${p.name}`);
        this.syncPlayerToggles();
        this.render();
      }
    });

    // Speed Boost Toggle
    this.root.querySelector('#gm-toggle-speed')?.addEventListener('click', () => {
      const p = this.getSelectedPlayer();
      if (p) {
        p.speedBoost = !p.speedBoost;
        this.logEvent('gm', `2.5× Speed Boost ${p.speedBoost ? 'ACTIVATED' : 'DEACTIVATED'} for ${p.name}`);
        this.syncPlayerToggles();
        this.render();
      }
    });

    // Full Heal
    this.root.querySelector('#gm-btn-heal')?.addEventListener('click', () => {
      const p = this.getSelectedPlayer();
      if (p) {
        p.hp = p.maxHp;
        this.logEvent('gm', `Healed ${p.name} to full 100% HP (${p.maxHp}/${p.maxHp})`);
        this.renderPlayersList();
        this.render();
      }
    });

    // Ghost Mode Toggle
    this.root.querySelector('#gm-toggle-ghost')?.addEventListener('click', () => {
      const p = this.getSelectedPlayer();
      if (p) {
        p.isGhost = !p.isGhost;
        this.logEvent('gm', `Ghost stealth ${p.isGhost ? 'ENABLED' : 'DISABLED'} for ${p.name}`);
        this.syncPlayerToggles();
        this.render();
      }
    });

    // Toggle Ancient Gate
    this.root.querySelector('#gm-btn-gate')?.addEventListener('click', () => {
      this.logEvent('world', 'Admin command dispatched: TOGGLE_GATE');
    });

    // Solve Switches
    this.root.querySelector('#gm-btn-switches')?.addEventListener('click', () => {
      this.logEvent('world', 'Admin command dispatched: SOLVE_SWITCHES (Sun Gate opened)');
    });

    // Spawn Item Buttons
    this.root.querySelector('#gm-btn-spawn-item-target')?.addEventListener('click', () => {
      const type = (this.root?.querySelector('#gm-spawn-item-type') as HTMLSelectElement)?.value || 'coin';
      const qty = parseInt((this.root?.querySelector('#gm-spawn-item-qty') as HTMLInputElement)?.value || '25', 10);
      this.spawnItem(type, this.targetCoords.x, this.targetCoords.y, qty);
    });

    this.root.querySelector('#gm-btn-spawn-item-me')?.addEventListener('click', () => {
      const p = this.getSelectedPlayer();
      if (p) {
        const type = (this.root?.querySelector('#gm-spawn-item-type') as HTMLSelectElement)?.value || 'coin';
        const qty = parseInt((this.root?.querySelector('#gm-spawn-item-qty') as HTMLInputElement)?.value || '25', 10);
        this.spawnItem(type, p.x, p.y + 15, qty);
      }
    });

    // Spawn Monster Buttons
    this.root.querySelector('#gm-btn-spawn-enemy-target')?.addEventListener('click', () => {
      const type = (this.root?.querySelector('#gm-spawn-enemy-type') as HTMLSelectElement)?.value || 'sproutling';
      const count = parseInt((this.root?.querySelector('#gm-spawn-enemy-count') as HTMLInputElement)?.value || '1', 10);
      this.spawnEnemy(type, this.targetCoords.x, this.targetCoords.y, count);
    });

    this.root.querySelector('#gm-btn-kill-all-mobs')?.addEventListener('click', () => {
      let count = 0;
      for (const [id, ent] of this.entities) {
        if (ent.type === 'enemy' || ent.type === 'boss') {
          this.entities.delete(id);
          count++;
        }
      }
      this.logEvent('gm', `Vanquished all ${count} hostile creatures on the map.`);
      this.render();
    });

    // Weather Override buttons
    this.root.querySelectorAll('.gm-weather-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const w = (e.currentTarget as HTMLElement).getAttribute('data-weather') as any;
        this.currentWeather = w;
        this.logEvent('world', `Weather override: SET_WEATHER -> ${w.toUpperCase()}`);
        this.render();
      });
    });

    // Time Jump buttons
    this.root.querySelectorAll('.gm-time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const h = parseFloat((e.currentTarget as HTMLElement).getAttribute('data-hour') || '12');
        this.currentHour = h;
        this.logEvent('world', `Time override: SET_TIME -> ${h.toFixed(1)}h`);
        this.render();
      });
    });

    // Radar Canvas Click & Navigation
    this.radarCanvas?.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left click to select target or inspect player
        this.handleRadarClick(e);
      } else if (e.button === 2) {
        // Right click pan
        this.isPanningRadar = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    this.radarCanvas?.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      if (this.isPanningRadar) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.radarPan.x += dx;
        this.radarPan.y += dy;
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanningRadar = false;
    });

    // Radar Zoom buttons
    this.root.querySelector('#gm-zoom-in')?.addEventListener('click', () => {
      this.radarZoom = Math.min(3.0, this.radarZoom * 1.25);
      this.render();
    });
    this.root.querySelector('#gm-zoom-out')?.addEventListener('click', () => {
      this.radarZoom = Math.max(0.4, this.radarZoom / 1.25);
      this.render();
    });
    this.root.querySelector('#gm-zoom-reset')?.addEventListener('click', () => {
      this.radarZoom = 1.0;
      this.radarPan = { x: 0, y: 0 };
      this.render();
    });
  }

  private handleRadarClick(e: MouseEvent) {
    if (!this.radarCanvas) return;
    const rect = this.radarCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates (0..2048)
    const W = this.radarCanvas.width;
    const H = this.radarCanvas.height;
    const scale = (Math.min(W, H) / 2048) * this.radarZoom;
    const offsetX = (W - 2048 * scale) / 2 + this.radarPan.x;
    const offsetY = (H - 2048 * scale) / 2 + this.radarPan.y;

    const wx = Math.round((mx - offsetX) / scale);
    const wy = Math.round((my - offsetY) / scale);

    if (wx >= 0 && wx <= 2048 && wy >= 0 && wy <= 2048) {
      // Check if clicking near any player to inspect
      let clickedPlayer: GMPlayerState | null = null;
      for (const p of this.players.values()) {
        const dist = Math.hypot(p.x - wx, p.y - wy);
        if (dist < 40) {
          clickedPlayer = p;
          break;
        }
      }

      if (clickedPlayer) {
        this.selectedPlayerId = clickedPlayer.id;
        this.logEvent('gm', `Inspecting player: ${clickedPlayer.name} at (${clickedPlayer.x}, ${clickedPlayer.y})`);
        this.renderPlayersList();
        this.syncPlayerToggles();
      } else {
        this.targetCoords = { x: wx, y: wy };
        this.updateTargetBadge();
      }
      this.render();
    }
  }

  public teleportSelectedPlayer(x: number, y: number) {
    const p = this.getSelectedPlayer();
    if (p) {
      p.x = x;
      p.y = y;
      this.logEvent('gm', `Teleported ${p.name} to coordinates (${x}, ${y})`);
      this.render();
      this.renderPlayersList();
    }
  }

  public spawnItem(type: string, x: number, y: number, value: number) {
    const id = `item_${Date.now()}`;
    this.entities.set(id, {
      id,
      type: 'item',
      name: `${type.toUpperCase()} ×${value}`,
      x,
      y,
      subType: type
    });
    this.logEvent('gm', `Spawned ${value}× ${type} at (${x}, ${y})`);
    this.render();
  }

  public spawnEnemy(type: string, x: number, y: number, count = 1) {
    for (let i = 0; i < count; i++) {
      const id = `enemy_${Date.now()}_${i}`;
      this.entities.set(id, {
        id,
        type: type.includes('boss') ? 'boss' : 'enemy',
        name: type.replace('_', ' ').toUpperCase(),
        x: x + (i * 24),
        y: y + (i * 12),
        hp: 8,
        maxHp: 8,
        subType: type
      });
    }
    this.logEvent('gm', `Spawned ${count}× ${type} at (${x}, ${y})`);
    this.render();
  }

  public getSelectedPlayer(): GMPlayerState | null {
    return this.selectedPlayerId ? this.players.get(this.selectedPlayerId) || null : null;
  }

  public logEvent(category: GMEventLogEntry['category'], message: string) {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.eventLog.unshift({ timestamp: ts, category, message });
    if (this.eventLog.length > 50) this.eventLog.pop();
    this.renderEventLog();
  }

  private updateTargetBadge() {
    if (this.coordsBadgeEl) {
      this.coordsBadgeEl.textContent = `Target: (${this.targetCoords.x}, ${this.targetCoords.y})`;
    }
  }

  private syncPlayerToggles() {
    if (!this.root) return;
    const p = this.getSelectedPlayer();
    if (!p) return;

    const setToggle = (id: string, active: boolean) => {
      const el = this.root?.querySelector(`#${id}`) as HTMLElement;
      if (el) {
        if (active) el.classList.add('active');
        else el.classList.remove('active');
      }
    };

    setToggle('gm-toggle-god', p.isGodMode);
    setToggle('gm-toggle-speed', p.speedBoost);
    setToggle('gm-toggle-ghost', p.isGhost);
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  public render() {
    this.renderWorldRadar();
    this.renderPingSparkline();
  }

  private renderWorldRadar() {
    if (!this.radarCanvas || !this.radarCtx) return;
    const ctx = this.radarCtx;
    const W = this.radarCanvas.width;
    const H = this.radarCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Coordinate Transform
    const scale = (Math.min(W, H) / 2048) * this.radarZoom;
    const offsetX = (W - 2048 * scale) / 2 + this.radarPan.x;
    const offsetY = (H - 2048 * scale) / 2 + this.radarPan.y;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. World Bounds Background (2048x2048)
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 2048, 2048);

    // 2. Biome Contours & Regions
    // Azure River
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(1600, 0, 80, 2048);

    // Crystal Lake
    ctx.beginPath();
    ctx.arc(1100, 1350, 180, 0, Math.PI * 2);
    ctx.fill();

    // Oakridge Village
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(280, 400, 360, 480);

    // Ancient Gate Wall
    ctx.fillStyle = '#475569';
    ctx.fillRect(800, 508, 448, 16);

    // Sunken Catacombs Mountain Zone
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(800, 180, 800, 240);

    // 3. Draw Bookmarked Landmark Pins
    for (const bm of this.bookmarks) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(bm.name, bm.x + 8, bm.y - 8);
    }

    // 4. Draw Entities (Monsters & Items)
    for (const ent of this.entities.values()) {
      if (ent.type === 'boss') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ent.x, ent.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`👑 ${ent.name}`, ent.x + 14, ent.y + 4);
      } else if (ent.type === 'enemy') {
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(ent.x, ent.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'item') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(ent.x, ent.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Draw Players
    for (const p of this.players.values()) {
      const isSelected = p.id === this.selectedPlayerId;

      // Aura if God Mode
      if (p.isGodMode) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Player circle
      ctx.fillStyle = isSelected ? '#38bdf8' : '#22c55e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSelected ? 12 : 9, 0, Math.PI * 2);
      ctx.fill();

      // Name & Class Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${p.name} [${p.className}]`, p.x + 14, p.y + 4);

      // HP Bar above player
      const barW = 32;
      const barH = 4;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(p.x - barW / 2, p.y - 18, barW, barH);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(p.x - barW / 2, p.y - 18, (p.hp / p.maxHp) * barW, barH);
    }

    // 6. Draw Selected Target Crosshair
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.targetCoords.x, this.targetCoords.y, 16, 0, Math.PI * 2);
    ctx.moveTo(this.targetCoords.x - 24, this.targetCoords.y);
    ctx.lineTo(this.targetCoords.x + 24, this.targetCoords.y);
    ctx.moveTo(this.targetCoords.x, this.targetCoords.y - 24);
    ctx.lineTo(this.targetCoords.x, this.targetCoords.y + 24);
    ctx.stroke();

    ctx.restore();
  }

  private renderPingSparkline() {
    if (!this.pingCanvas || !this.pingCtx) return;
    const ctx = this.pingCtx;
    const W = this.pingCanvas.width;
    const H = this.pingCanvas.height;

    ctx.clearRect(0, 0, W, H);

    if (this.pingHistory.length < 2) return;

    const maxPing = 50;
    const step = W / (this.pingHistory.length - 1);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < this.pingHistory.length; i++) {
      const p = this.pingHistory[i];
      const y = H - (p / maxPing) * H;
      const x = i * step;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private renderPlayersList() {
    if (!this.root) return;
    const list = this.root.querySelector('#gm-players-list');
    if (!list) return;

    list.innerHTML = '';
    for (const p of this.players.values()) {
      const isSelected = p.id === this.selectedPlayerId;
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 6px 8px;
        border-radius: 4px;
        background: ${isSelected ? '#1e293b' : '#0f172a'};
        border: 1px solid ${isSelected ? '#38bdf8' : '#334155'};
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
      `;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: ${isSelected ? '#38bdf8' : '#fff'}; font-size: 11px;">${p.name}</strong>
          <span style="font-size: 9px; color: #34d399;">${p.ping}ms</span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
          <span>Class: ${p.className}</span>
          <span>Coords: (${p.x}, ${p.y})</span>
        </div>
        <div style="display: flex; gap: 4px; margin-top: 2px;">
          ${p.isGodMode ? '<span style="font-size: 9px; background: #064e3b; color: #34d399; padding: 1px 4px; border-radius: 2px;">GOD</span>' : ''}
          ${p.speedBoost ? '<span style="font-size: 9px; background: #1e3a8a; color: #60a5fa; padding: 1px 4px; border-radius: 2px;">SPEED</span>' : ''}
          ${p.isGhost ? '<span style="font-size: 9px; background: #374151; color: #cbd5e1; padding: 1px 4px; border-radius: 2px;">GHOST</span>' : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedPlayerId = p.id;
        this.renderPlayersList();
        this.syncPlayerToggles();
        this.render();
      });

      list.appendChild(card);
    }
  }

  private renderEventLog() {
    if (!this.logListEl) return;
    this.logListEl.innerHTML = this.eventLog.map(entry => {
      let color = '#cbd5e1';
      if (entry.category === 'gm') color = '#f43f5e';
      else if (entry.category === 'combat') color = '#ef4444';
      else if (entry.category === 'world') color = '#f59e0b';
      else if (entry.category === 'netcode') color = '#38bdf8';

      return `<div><span style="color: #64748b;">[${entry.timestamp}]</span> <span style="color: ${color};">[${entry.category.toUpperCase()}]</span> ${entry.message}</div>`;
    }).join('');
  }

  // -------------------------------------------------------------------------
  // Main Animation & Ping Tick Loop
  // -------------------------------------------------------------------------
  private startLoop() {
    let tickAcc = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      tickAcc += dt;

      // Simulate ping every 1.5 seconds
      if (tickAcc >= 1.5) {
        tickAcc = 0;
        this.tickLatency();
      }

      this.render();
      this.animFrameId = requestAnimationFrame(frame);
    };

    this.animFrameId = requestAnimationFrame(frame);
  }

  private tickLatency() {
    // Generate simulated realistic network jitter around 18-24ms
    const newPing = Math.round(18 + Math.random() * 8);
    this.pingHistory.push(newPing);
    if (this.pingHistory.length > 25) this.pingHistory.shift();

    const sum = this.pingHistory.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / this.pingHistory.length);
    const min = Math.min(...this.pingHistory);
    const max = Math.max(...this.pingHistory);

    const avgEl = this.root?.querySelector('#val-avg-ping');
    const minMaxEl = this.root?.querySelector('#val-minmax-ping');
    if (avgEl) avgEl.textContent = `${avg}ms`;
    if (minMaxEl) minMaxEl.textContent = `${min}ms / ${max}ms`;

    this.renderPingSparkline();
  }

  // -------------------------------------------------------------------------
  // Telemetry Report Exporter
  // -------------------------------------------------------------------------
  public generateTelemetryReport(): GMTelemetryReport {
    const sum = this.pingHistory.reduce((a, b) => a + b, 0);
    const avg = this.pingHistory.length > 0 ? Math.round(sum / this.pingHistory.length) : 20;
    const min = this.pingHistory.length > 0 ? Math.min(...this.pingHistory) : 20;
    const max = this.pingHistory.length > 0 ? Math.max(...this.pingHistory) : 20;

    const report: GMTelemetryReport = {
      connectedPlayers: this.players.size,
      activeEntities: this.entities.size,
      activeItems: Array.from(this.entities.values()).filter(e => e.type === 'item').length,
      avgPingMs: avg,
      minPingMs: min,
      maxPingMs: max,
      packetLossPercent: 0,
      worldTimeHour: this.currentHour,
      weather: this.currentWeather,
      serverUptimeSec: 14400
    };

    return GMTelemetryReportSchema.parse(report);
  }
}
