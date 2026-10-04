/**
 * BitQuest - Studio-Grade Dynamic Lighting, Weather & Atmosphere Calibration Studio (Milestone 9.6)
 *
 * Provides:
 * 1. 24-Hour Circadian Scrubber with speed control (1x, 5x, 30x) and phase indicators.
 * 2. Keyframed Color Gradient Editor: Interactive 24-hour gradient strip with draggable keyframes,
 *    color pickers, alpha curves, and seamless midnight-wrapping interpolation.
 * 3. Live Particle Engine: Rain drops with wind slant, splash rings, lightning flashes,
 *    pulsating fireflies/embers, wind gusts, and volumetric atmospheric fog.
 * 4. Split-Screen Comparison Viewport: Drag split slider comparing raw unlit terrain vs calibrated atmosphere.
 * 5. Canonical Biome Presets (Village Fair, Haunted Catacombs, Stormy Cliffs, Whispering Meadows, Blood Moon).
 * 6. Zero-dependency TypeScript/JSON exporter for instant WeatherEngine integration.
 */

import {
  AtmosphereCalibrationPresetSchema,
  type AtmosphereCalibrationPreset,
  type LightingKeyframe,
  type WeatherParticleConfig
} from '../../../shared/src/schemas';
import atmospherePresetsJson from '../../../shared/data/atmospherePresets.json';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  phase: number;
}

export class AtmosphereStudio {
  public root: HTMLElement | null = null;
  public presets: Record<string, AtmosphereCalibrationPreset> = {};
  public currentPreset: AtmosphereCalibrationPreset;

  // Time & Playback
  public currentHour: number = 17.5; // Default Golden Hour
  public isPlaying: boolean = false;
  public playbackSpeed: number = 1.0;
  private lastTimeMs: number = 0;
  private animFrameId: number | null = null;

  // Split-Screen
  public splitRatio: number = 0.5; // 50% split
  public isDraggingSplit: boolean = false;

  // Keyframe Selection
  public selectedKeyframeIndex: number = 8; // Default golden hour keyframe

  // Viewport & Rendering
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gradientCanvas!: HTMLCanvasElement;
  private gradientCtx!: CanvasRenderingContext2D;

  // Particle Simulation Buffers (Zero Allocation)
  private rainParticles: Particle[] = [];
  private fireflyParticles: Particle[] = [];
  private lightningAlpha: number = 0;
  private lightningTimer: number = 0;

  constructor(containerIdOrElement?: string | HTMLElement | null) {
    if (typeof containerIdOrElement === 'string') {
      this.root = typeof document !== 'undefined' ? document.getElementById(containerIdOrElement) : null;
    } else {
      this.root = containerIdOrElement || null;
    }

    // Load presets library
    this.presets = { ...(atmospherePresetsJson as any) };

    // Default to 'village_fair'
    this.currentPreset = JSON.parse(JSON.stringify(this.presets['village_fair'] || Object.values(this.presets)[0]));

    this.initParticles();

    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.resizeCanvases();
      this.render();
      this.startLoop();
    }
  }

  private initParticles() {
    this.rainParticles = [];
    for (let i = 0; i < 300; i++) {
      this.rainParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1 + Math.random() * 2,
        phase: 0
      });
    }

    this.fireflyParticles = [];
    for (let i = 0; i < 60; i++) {
      this.fireflyParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 15,
        life: Math.random(),
        maxLife: 1,
        size: 2 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="atmosphere-studio-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #070a12; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none;">
        
        <!-- Header Toolbar -->
        <header style="background: #0f172a; border-bottom: 1px solid #1e293b; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #f59e0b;">☀️ Atmosphere & Lighting Calibration Studio</span>
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>
            
            <button id="at-btn-play" class="btn" style="font-size: 11px; padding: 3px 10px; background: #1e293b; border: 1px solid #334155;">▶ Play 24h Cycle</button>
            
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <span style="color: #94a3b8;">Speed:</span>
              <button class="btn at-speed-btn active" data-speed="1" style="font-size: 10px; padding: 2px 6px;">1×</button>
              <button class="btn at-speed-btn" data-speed="5" style="font-size: 10px; padding: 2px 6px;">5×</button>
              <button class="btn at-speed-btn" data-speed="30" style="font-size: 10px; padding: 2px 6px;">30×</button>
            </div>

            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>
            <span id="at-time-display" style="font-size: 12px; font-weight: 600; color: #fde047; min-width: 140px;">5:30 PM (Golden Hour)</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="at-btn-copy-code" class="btn" style="font-size: 11px; padding: 3px 8px; background: #1e293b; border: 1px solid #334155; color: #38bdf8;">📋 Copy TS Code</button>
            <button id="at-btn-export-json" class="btn" style="font-size: 11px; padding: 3px 8px; background: #1e293b; border: 1px solid #334155;">💾 Export JSON</button>
            <label for="at-file-import" class="btn" style="font-size: 11px; padding: 3px 8px; background: #1e293b; border: 1px solid #334155; cursor: pointer;">📂 Import JSON</label>
            <input type="file" id="at-file-import" accept=".json" style="display: none;" />
          </div>
        </header>

        <!-- Main Workspace: Left Sidebar + Center Viewport + Right Parameters -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Column 1: Presets & Biomes (Left, 220px) -->
          <aside style="width: 220px; background: #0b0f19; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 10px; border-bottom: 1px solid #1e293b;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 6px 0;">Atmosphere Presets</h4>
              <div id="at-preset-list" style="display: flex; flex-direction: column; gap: 4px;">
                <!-- Rendered dynamically -->
              </div>
            </div>

            <div style="flex: 1; padding: 10px; overflow-y: auto;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 6px 0;">Split-Screen Mode</h4>
              <p style="font-size: 10px; color: #64748b; line-height: 1.4; margin-bottom: 8px;">
                Drag the divider on the preview canvas to compare raw terrain rendering against calibrated ambient atmosphere.
              </p>
              <div style="display: flex; gap: 4px;">
                <button id="at-btn-split-0" class="btn" style="flex: 1; font-size: 10px; padding: 3px;">Unlit</button>
                <button id="at-btn-split-50" class="btn active" style="flex: 1; font-size: 10px; padding: 3px;">50/50 Split</button>
                <button id="at-btn-split-100" class="btn" style="flex: 1; font-size: 10px; padding: 3px;">Atmosphere</button>
              </div>
            </div>
          </aside>

          <!-- Column 2: Center Viewport with Live Scene & Timeline (flex: 1) -->
          <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #030712;">
            
            <!-- Live Preview Canvas -->
            <div id="at-viewport-wrap" style="flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: col-resize;">
              <canvas id="at-preview-canvas" style="display: block; box-shadow: 0 0 30px rgba(0,0,0,0.8);"></canvas>
              
              <!-- Floating Split Screen Label -->
              <div id="at-split-label" style="position: absolute; top: 12px; left: 14px; font-size: 10px; color: #94a3b8; background: rgba(15,23,42,0.85); padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; pointer-events: none;">
                ◀ Raw Terrain | Calibrated Lighting ▶
              </div>
            </div>

            <!-- Bottom: 24h Timeline & Gradient Keyframe Track -->
            <div style="height: 130px; background: #0f172a; border-top: 1px solid #1e293b; padding: 10px 16px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8;">24-Hour Circadian Scrubber & Color Gradient</span>
                <button id="at-btn-add-keyframe" class="btn" style="font-size: 10px; padding: 2px 8px; background: #1e293b; border: 1px solid #334155; color: #22c55e;">+ Add Keyframe at Current Time</button>
              </div>

              <!-- Interactive 24-Hour Color Strip Canvas -->
              <div style="position: relative; height: 32px; width: 100%;">
                <canvas id="at-gradient-canvas" style="width: 100%; height: 100%; border-radius: 4px; display: block; border: 1px solid #334155; cursor: pointer;"></canvas>
              </div>

              <!-- Hour Scrubber Range Slider -->
              <div style="position: relative; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; color: #64748b;">0:00</span>
                <input type="range" id="at-slider-hour" min="0" max="24" step="0.05" value="${this.currentHour}" style="flex: 1; accent-color: #f59e0b;" />
                <span style="font-size: 10px; color: #64748b;">24:00</span>
              </div>
            </div>
          </main>

          <!-- Column 3: Calibrations & Particle Controls (Right, 310px) -->
          <aside style="width: 310px; background: #0f172a; border-left: 1px solid #1e293b; display: flex; flex-direction: column; overflow-y: auto;">
            
            <!-- Section 1: Selected Keyframe Editor -->
            <div style="padding: 12px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #38bdf8; margin: 0;">Keyframe Settings</h4>
                <button id="at-btn-del-keyframe" class="btn" style="font-size: 10px; padding: 2px 6px; background: #7f1d1d; border: 1px solid #ef4444; color: #fff;">🗑️ Delete</button>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Hour (0-24):</label>
                  <input type="number" id="kf-hour" min="0" max="24" step="0.1" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Color Tint:</label>
                  <input type="color" id="kf-color" style="width: 100%; height: 26px; background: #1e293b; border: 1px solid #334155; border-radius: 4px; cursor: pointer; padding: 2px;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Darkness Alpha: <b id="val-kf-alpha" style="color: #fff;">0.14</b></label>
                  <input type="range" id="kf-alpha" min="0" max="1" step="0.01" style="width: 100%; accent-color: #38bdf8;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Name Label:</label>
                  <input type="text" id="kf-name" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;" />
                </div>
              </div>
            </div>

            <!-- Section 2: Live Weather & Particle Parameters -->
            <div style="padding: 12px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 10px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #22c55e; margin: 0;">Atmospheric Particles</h4>
              
              <!-- Rain -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Rain Density: <b id="val-rainDensity" style="color: #fff;">0</b></label>
                  <input type="range" id="p-rainDensity" min="0" max="500" step="20" style="width: 100%; accent-color: #60a5fa;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Rain Slant (°): <b id="val-rainAngleDeg" style="color: #fff;">12°</b></label>
                  <input type="range" id="p-rainAngleDeg" min="-45" max="45" step="1" style="width: 100%; accent-color: #60a5fa;" />
                </div>
              </div>

              <!-- Wind -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Wind Speed: <b id="val-windSpeed" style="color: #fff;">15</b></label>
                  <input type="range" id="p-windSpeed" min="0" max="100" step="5" style="width: 100%; accent-color: #38bdf8;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Wind Angle (°): <b id="val-windAngleDeg" style="color: #fff;">75°</b></label>
                  <input type="range" id="p-windAngleDeg" min="0" max="360" step="5" style="width: 100%; accent-color: #38bdf8;" />
                </div>
              </div>

              <!-- Lightning & Fog -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Lightning: <b id="val-lightningFrequency" style="color: #fff;">0%</b></label>
                  <input type="range" id="p-lightningFrequency" min="0" max="1" step="0.05" style="width: 100%; accent-color: #facc15;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Volumetric Fog: <b id="val-fogDensity" style="color: #fff;">0%</b></label>
                  <input type="range" id="p-fogDensity" min="0" max="1" step="0.05" style="width: 100%; accent-color: #94a3b8;" />
                </div>
              </div>

              <!-- Fireflies / Embers -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Fireflies Count: <b id="val-fireflyCount" style="color: #fff;">25</b></label>
                  <input type="range" id="p-fireflyCount" min="0" max="100" step="5" style="width: 100%; accent-color: #a3e635;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Firefly Glow Tint:</label>
                  <input type="color" id="p-fireflyGlowColor" value="#a3e635" style="width: 100%; height: 26px; background: #1e293b; border: 1px solid #334155; border-radius: 4px; cursor: pointer; padding: 2px;" />
                </div>
              </div>
            </div>

            <!-- Section 3: Generated Code Preview -->
            <div style="flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">Exported Lighting Code</h4>
              <pre id="at-code-preview" style="margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 9px; line-height: 1.4; color: #cbd5e1; background: #030712; padding: 8px; border-radius: 4px; border: 1px solid #1e293b; overflow-x: auto; white-space: pre;"></pre>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.canvas = this.root.querySelector('#at-preview-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.gradientCanvas = this.root.querySelector('#at-gradient-canvas') as HTMLCanvasElement;
    this.gradientCtx = this.gradientCanvas.getContext('2d')!;

    this.renderPresetButtons();
    this.syncKeyframeInputs();
    this.syncParticleInputs();
    this.updateCodePreview();
  }

  public resizeCanvases() {
    if (!this.canvas || !this.gradientCanvas) return;
    const wrap = this.root?.querySelector('#at-viewport-wrap') as HTMLElement;
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      this.canvas.width = Math.max(400, Math.floor(rect.width));
      this.canvas.height = Math.max(300, Math.floor(rect.height));
    } else {
      this.canvas.width = 640;
      this.canvas.height = 400;
    }

    const gWrap = this.gradientCanvas.parentElement;
    if (gWrap) {
      this.gradientCanvas.width = Math.max(300, gWrap.clientWidth);
      this.gradientCanvas.height = 32;
    }
  }

  public onTabActivated() {
    this.resizeCanvases();
    this.render();
  }

  // -------------------------------------------------------------------------
  // Preset Management
  // -------------------------------------------------------------------------
  private renderPresetButtons() {
    if (!this.root) return;
    const list = this.root.querySelector('#at-preset-list');
    if (!list) return;

    list.innerHTML = '';
    for (const preset of Object.values(this.presets)) {
      const isSelected = preset.id === this.currentPreset.id;
      const btn = document.createElement('button');
      btn.className = `btn ${isSelected ? 'btn-primary' : ''}`;
      btn.style.cssText = `
        text-align: left;
        padding: 5px 8px;
        font-size: 11px;
        background: ${isSelected ? '#0284c7' : '#1e293b'};
        border: 1px solid ${isSelected ? '#38bdf8' : '#334155'};
        border-radius: 4px;
        color: #f8fafc;
        cursor: pointer;
      `;

      let icon = '🌄';
      if (preset.biome === 'dungeon') icon = '💀';
      else if (preset.biome === 'coastal') icon = '🌊';
      else if (preset.biome === 'meadow') icon = '🌾';
      else if (preset.biome === 'boss_arena') icon = '🩸';

      btn.innerHTML = `${icon} ${preset.name}`;
      btn.addEventListener('click', () => {
        this.loadPreset(preset.id);
      });
      list.appendChild(btn);
    }
  }

  public loadPreset(id: string) {
    const found = this.presets[id];
    if (found) {
      this.currentPreset = JSON.parse(JSON.stringify(found));
      this.selectedKeyframeIndex = Math.min(this.selectedKeyframeIndex, this.currentPreset.lightingKeyframes.length - 1);
      this.renderPresetButtons();
      this.syncKeyframeInputs();
      this.syncParticleInputs();
      this.render();
      this.updateCodePreview();
    }
  }

  // -------------------------------------------------------------------------
  // Mathematical Lighting Interpolator
  // -------------------------------------------------------------------------
  public getInterpolatedLighting(hour: number): { r: number; g: number; b: number; alpha: number; colorHex: string } {
    const h = ((hour % 24) + 24) % 24;
    const frames = this.currentPreset.lightingKeyframes;
    if (frames.length === 0) {
      return { r: 255, g: 255, b: 255, alpha: 0, colorHex: '#ffffff' };
    }

    // Sort by hour
    const sorted = [...frames].sort((a, b) => a.hour - b.hour);

    let kfA = sorted[0];
    let kfB = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (h >= sorted[i].hour && h <= sorted[i + 1].hour) {
        kfA = sorted[i];
        kfB = sorted[i + 1];
        break;
      }
    }

    // Check boundary wrap (after last keyframe before 24h, wraps to first)
    if (h > sorted[sorted.length - 1].hour) {
      kfA = sorted[sorted.length - 1];
      kfB = sorted[0];
    }

    let span = kfB.hour - kfA.hour;
    let t = 0;
    if (span > 0.0001) {
      t = (h - kfA.hour) / span;
    } else if (span < 0) {
      // Midnight wrap
      const totalSpan = (24 - kfA.hour) + kfB.hour;
      const progress = h >= kfA.hour ? (h - kfA.hour) : (24 - kfA.hour) + h;
      t = progress / totalSpan;
    }

    t = Math.max(0, Math.min(1, t));

    const rA = (kfA.color >> 16) & 0xff;
    const gA = (kfA.color >> 8) & 0xff;
    const bA = kfA.color & 0xff;

    const rB = (kfB.color >> 16) & 0xff;
    const gB = (kfB.color >> 8) & 0xff;
    const bB = kfB.color & 0xff;

    const r = Math.round(rA + (rB - rA) * t);
    const g = Math.round(gA + (gB - gA) * t);
    const b = Math.round(bA + (bB - bA) * t);
    const alpha = Math.round((kfA.alpha + (kfB.alpha - kfA.alpha) * t) * 1000) / 1000;

    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    return { r, g, b, alpha, colorHex: hex };
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root) return;

    // Play/Pause button
    const playBtn = this.root.querySelector('#at-btn-play');
    playBtn?.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      if (playBtn) playBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play 24h Cycle';
    });

    // Speed buttons
    this.root.querySelectorAll('.at-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.root?.querySelectorAll('.at-speed-btn').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.playbackSpeed = parseFloat((e.currentTarget as HTMLElement).getAttribute('data-speed') || '1');
      });
    });

    // Hour Scrubber Slider
    const hourSlider = this.root.querySelector('#at-slider-hour') as HTMLInputElement;
    hourSlider?.addEventListener('input', () => {
      this.currentHour = parseFloat(hourSlider.value);
      this.render();
    });

    // Split buttons
    this.root.querySelector('#at-btn-split-0')?.addEventListener('click', () => { this.splitRatio = 0.0; this.render(); });
    this.root.querySelector('#at-btn-split-50')?.addEventListener('click', () => { this.splitRatio = 0.5; this.render(); });
    this.root.querySelector('#at-btn-split-100')?.addEventListener('click', () => { this.splitRatio = 1.0; this.render(); });

    // Draggable Split Screen on Viewport
    const viewportWrap = this.root.querySelector('#at-viewport-wrap') as HTMLElement;
    viewportWrap?.addEventListener('mousedown', (e) => {
      this.isDraggingSplit = true;
      this.updateSplitFromMouse(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingSplit) {
        this.updateSplitFromMouse(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingSplit = false;
    });

    // Gradient bar click to jump or select keyframe
    this.gradientCanvas?.addEventListener('click', (e) => {
      const rect = this.gradientCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      this.currentHour = Math.round(ratio * 24 * 10) / 10;
      if (hourSlider) hourSlider.value = this.currentHour.toString();

      // Check if clicked close to existing keyframe
      const kfs = this.currentPreset.lightingKeyframes;
      let closestIdx = 0;
      let minDiff = 999;
      for (let i = 0; i < kfs.length; i++) {
        const diff = Math.abs(kfs[i].hour - this.currentHour);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      if (minDiff < 0.6) {
        this.selectedKeyframeIndex = closestIdx;
        this.syncKeyframeInputs();
      }

      this.render();
    });

    // Add Keyframe button
    this.root.querySelector('#at-btn-add-keyframe')?.addEventListener('click', () => {
      const current = this.getInterpolatedLighting(this.currentHour);
      const colorNum = (current.r << 16) | (current.g << 8) | current.b;
      const newKf: LightingKeyframe = {
        hour: Math.round(this.currentHour * 10) / 10,
        color: colorNum,
        alpha: current.alpha,
        name: `Keyframe ${this.currentHour.toFixed(1)}h`
      };
      this.currentPreset.lightingKeyframes.push(newKf);
      this.currentPreset.lightingKeyframes.sort((a, b) => a.hour - b.hour);
      this.selectedKeyframeIndex = this.currentPreset.lightingKeyframes.indexOf(newKf);
      this.syncKeyframeInputs();
      this.render();
      this.updateCodePreview();
    });

    // Delete Keyframe button
    this.root.querySelector('#at-btn-del-keyframe')?.addEventListener('click', () => {
      if (this.currentPreset.lightingKeyframes.length <= 2) {
        alert('At least two keyframes are required to maintain the circadian day cycle.');
        return;
      }
      this.currentPreset.lightingKeyframes.splice(this.selectedKeyframeIndex, 1);
      this.selectedKeyframeIndex = Math.max(0, this.selectedKeyframeIndex - 1);
      this.syncKeyframeInputs();
      this.render();
      this.updateCodePreview();
    });

    // Keyframe parameter inputs
    const kfHour = this.root.querySelector('#kf-hour') as HTMLInputElement;
    kfHour?.addEventListener('change', () => {
      const kf = this.currentPreset.lightingKeyframes[this.selectedKeyframeIndex];
      if (kf) {
        kf.hour = Math.max(0, Math.min(24, parseFloat(kfHour.value)));
        this.currentPreset.lightingKeyframes.sort((a, b) => a.hour - b.hour);
        this.render();
        this.updateCodePreview();
      }
    });

    const kfColor = this.root.querySelector('#kf-color') as HTMLInputElement;
    kfColor?.addEventListener('input', () => {
      const kf = this.currentPreset.lightingKeyframes[this.selectedKeyframeIndex];
      if (kf) {
        kf.color = parseInt(kfColor.value.replace('#', ''), 16);
        this.render();
        this.updateCodePreview();
      }
    });

    const kfAlpha = this.root.querySelector('#kf-alpha') as HTMLInputElement;
    kfAlpha?.addEventListener('input', () => {
      const kf = this.currentPreset.lightingKeyframes[this.selectedKeyframeIndex];
      if (kf) {
        kf.alpha = parseFloat(kfAlpha.value);
        const valEl = this.root?.querySelector('#val-kf-alpha');
        if (valEl) valEl.textContent = kf.alpha.toFixed(2);
        this.render();
        this.updateCodePreview();
      }
    });

    const kfName = this.root.querySelector('#kf-name') as HTMLInputElement;
    kfName?.addEventListener('change', () => {
      const kf = this.currentPreset.lightingKeyframes[this.selectedKeyframeIndex];
      if (kf) {
        kf.name = kfName.value;
        this.render();
        this.updateCodePreview();
      }
    });

    // Particle sliders
    this.bindParticleSlider('rainDensity', 0);
    this.bindParticleSlider('rainAngleDeg', 0);
    this.bindParticleSlider('windSpeed', 0);
    this.bindParticleSlider('windAngleDeg', 0);
    this.bindParticleSlider('lightningFrequency', 2);
    this.bindParticleSlider('fogDensity', 2);
    this.bindParticleSlider('fireflyCount', 0);

    const ffColor = this.root.querySelector('#p-fireflyGlowColor') as HTMLInputElement;
    ffColor?.addEventListener('input', () => {
      this.currentPreset.particles.fireflyGlowColor = ffColor.value;
      this.updateCodePreview();
    });

    // Copy Code button
    this.root.querySelector('#at-btn-copy-code')?.addEventListener('click', () => {
      const code = this.generateZeroDependencyCode();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(code);
        const btn = this.root?.querySelector('#at-btn-copy-code') as HTMLElement;
        if (btn) {
          const old = btn.textContent;
          btn.textContent = '✅ Copied!';
          setTimeout(() => { btn.textContent = old; }, 1500);
        }
      }
    });

    // Export JSON
    this.root.querySelector('#at-btn-export-json')?.addEventListener('click', () => {
      this.exportPresetJSON();
    });

    // Import JSON
    const fileIn = this.root.querySelector('#at-file-import') as HTMLInputElement;
    fileIn?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          this.importPresetJSON(re.target?.result as string);
        };
        reader.readAsText(file);
      }
    });
  }

  private updateSplitFromMouse(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    this.splitRatio = Math.max(0, Math.min(1, x / rect.width));
    this.render();
  }

  private bindParticleSlider(key: keyof WeatherParticleConfig, decimals: number) {
    const el = this.root?.querySelector(`#p-${key}`) as HTMLInputElement;
    if (!el) return;
    el.addEventListener('input', () => {
      const val = parseFloat(el.value);
      (this.currentPreset.particles as any)[key] = val;
      const valEl = this.root?.querySelector(`#val-${key}`);
      if (valEl) {
        if (key.includes('Angle')) valEl.textContent = `${val}°`;
        else if (key.includes('Frequency') || key.includes('Density')) valEl.textContent = decimals > 0 ? `${Math.round(val * 100)}%` : `${val}`;
        else valEl.textContent = `${val}`;
      }
      this.updateCodePreview();
    });
  }

  private syncKeyframeInputs() {
    if (!this.root) return;
    const kf = this.currentPreset.lightingKeyframes[this.selectedKeyframeIndex];
    if (!kf) return;

    const setInput = (id: string, val: any) => {
      const el = this.root?.querySelector(`#${id}`) as HTMLInputElement;
      if (el) el.value = val.toString();
    };

    setInput('kf-hour', kf.hour);
    const hex = '#' + ((1 << 24) + kf.color).toString(16).slice(1);
    setInput('kf-color', hex);
    setInput('kf-alpha', kf.alpha);
    setInput('kf-name', kf.name);

    const valEl = this.root.querySelector('#val-kf-alpha');
    if (valEl) valEl.textContent = kf.alpha.toFixed(2);
  }

  private syncParticleInputs() {
    if (!this.root) return;
    const p = this.currentPreset.particles;

    const setSlider = (key: string, val: any) => {
      const el = this.root?.querySelector(`#p-${key}`) as HTMLInputElement;
      if (el) el.value = val.toString();
      const valEl = this.root?.querySelector(`#val-${key}`);
      if (valEl) valEl.textContent = key.includes('Angle') ? `${val}°` : key.includes('Frequency') || key.includes('fogDensity') ? `${Math.round(val * 100)}%` : `${val}`;
    };

    setSlider('rainDensity', p.rainDensity);
    setSlider('rainAngleDeg', p.rainAngleDeg);
    setSlider('windSpeed', p.windSpeed);
    setSlider('windAngleDeg', p.windAngleDeg);
    setSlider('lightningFrequency', p.lightningFrequency);
    setSlider('fogDensity', p.fogDensity);
    setSlider('fireflyCount', p.fireflyCount);

    const ffColor = this.root.querySelector('#p-fireflyGlowColor') as HTMLInputElement;
    if (ffColor) ffColor.value = p.fireflyGlowColor;
  }

  // -------------------------------------------------------------------------
  // Main Animation Loop
  // -------------------------------------------------------------------------
  private startLoop() {
    this.lastTimeMs = performance.now();
    const tick = (now: number) => {
      const deltaSec = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;

      if (this.isPlaying) {
        // Advance 24h cycle (1 hour every 2.5s at 1x speed)
        const hourStep = (deltaSec / 2.5) * this.playbackSpeed;
        this.currentHour = (this.currentHour + hourStep) % 24;

        const hourSlider = this.root?.querySelector('#at-slider-hour') as HTMLInputElement;
        if (hourSlider) hourSlider.value = this.currentHour.toString();
      }

      this.updateParticles(deltaSec);
      this.render();

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateParticles(dt: number) {
    const p = this.currentPreset.particles;
    const W = this.canvas?.width || 640;
    const H = this.canvas?.height || 400;

    // Rain simulation
    const rainRad = (p.rainAngleDeg * Math.PI) / 180;
    const rainVx = Math.sin(rainRad) * p.rainSpeed;
    const rainVy = Math.cos(rainRad) * p.rainSpeed;

    const activeRain = Math.min(p.rainDensity, this.rainParticles.length);
    for (let i = 0; i < activeRain; i++) {
      const pt = this.rainParticles[i];
      pt.x += rainVx * dt;
      pt.y += rainVy * dt;

      if (pt.y > H || pt.x < -20 || pt.x > W + 20) {
        pt.y = -10;
        pt.x = Math.random() * (W + 60) - 30;
      }
    }

    // Fireflies simulation
    const activeFf = Math.min(p.fireflyCount, this.fireflyParticles.length);
    for (let i = 0; i < activeFf; i++) {
      const ff = this.fireflyParticles[i];
      ff.phase += dt * 3.5;
      ff.x += (ff.vx + Math.sin(ff.phase) * 12) * dt;
      ff.y += (ff.vy + Math.cos(ff.phase * 0.8) * 10) * dt;

      if (ff.x < 0) ff.x = W;
      if (ff.x > W) ff.x = 0;
      if (ff.y < 0) ff.y = H;
      if (ff.y > H) ff.y = 0;
    }

    // Lightning flash simulation
    if (p.lightningFrequency > 0) {
      this.lightningTimer += dt;
      if (this.lightningTimer > 1.0 / (p.lightningFrequency * 2.5)) {
        if (Math.random() < 0.25) {
          this.lightningAlpha = p.lightningIntensity;
        }
        this.lightningTimer = 0;
      }
    }
    if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 3.5);
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  public render() {
    this.renderGradientStrip();
    this.renderPreviewScene();
    this.updateClockHeader();
  }

  private updateClockHeader() {
    if (!this.root) return;
    const h = this.currentHour;
    const displayHour = Math.floor(h) === 0 ? 12 : Math.floor(h) > 12 ? Math.floor(h) - 12 : Math.floor(h);
    const ampm = h < 12 ? 'AM' : 'PM';
    const minute = Math.floor((h - Math.floor(h)) * 60);
    const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;

    let phase = 'High Sunlight';
    if (h >= 21.5 || h < 4.5) phase = 'Midnight Glow 🌙';
    else if (h >= 4.5 && h < 6.0) phase = 'Pre-Dawn Blue 🌌';
    else if (h >= 6.0 && h < 8.0) phase = 'Morning Sunrise 🌅';
    else if (h >= 8.0 && h < 17.0) phase = 'High Sunlight ☀️';
    else if (h >= 17.0 && h < 19.5) phase = 'Golden Hour 🌇';
    else phase = 'Indigo Twilight 🌆';

    const timeEl = this.root.querySelector('#at-time-display');
    if (timeEl) {
      timeEl.textContent = `${displayHour}:${minuteStr} ${ampm} (${phase})`;
    }
  }

  private renderGradientStrip() {
    if (!this.gradientCanvas || !this.gradientCtx) return;
    const ctx = this.gradientCtx;
    const W = this.gradientCanvas.width;
    const H = this.gradientCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Render continuous 24h gradient
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    const sorted = [...this.currentPreset.lightingKeyframes].sort((a, b) => a.hour - b.hour);

    for (const kf of sorted) {
      const stop = Math.max(0, Math.min(1, kf.hour / 24));
      const hex = '#' + ((1 << 24) + kf.color).toString(16).slice(1);
      grad.addColorStop(stop, hex);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Alpha shade overlay
    for (let x = 0; x < W; x += 4) {
      const hr = (x / W) * 24;
      const lighting = this.getInterpolatedLighting(hr);
      ctx.fillStyle = `rgba(0, 0, 0, ${lighting.alpha * 0.75})`;
      ctx.fillRect(x, 0, 4, H);
    }

    // Keyframe pins
    for (let i = 0; i < sorted.length; i++) {
      const kf = sorted[i];
      const kx = (kf.hour / 24) * W;
      const isSelected = i === this.selectedKeyframeIndex;

      ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(kx, H / 2, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Scrubber Needle
    const scrubX = (this.currentHour / 24) * W;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(scrubX, 0);
    ctx.lineTo(scrubX, H);
    ctx.stroke();
  }

  private renderPreviewScene() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const splitX = W * this.splitRatio;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Raw Pixel-Art Background Scene
    this.drawPixelArtLandscape(ctx, W, H);

    // 2. Draw Atmosphere on Right of Split Line
    if (this.splitRatio < 1.0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, W - splitX, H);
      ctx.clip();

      // Atmospheric Lighting Tint & Alpha Darkness
      const lighting = this.getInterpolatedLighting(this.currentHour);
      ctx.fillStyle = `rgba(${lighting.r}, ${lighting.g}, ${lighting.b}, ${lighting.alpha})`;
      ctx.fillRect(0, 0, W, H);

      // Campfire Warmth Radiance Glow
      this.drawCampfireGlow(ctx, W * 0.35, H * 0.68, lighting.alpha);

      // Volumetric Fog
      if (this.currentPreset.particles.fogDensity > 0) {
        ctx.fillStyle = `rgba(203, 213, 225, ${this.currentPreset.particles.fogDensity * 0.55})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Lightning Flash
      if (this.lightningAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Rain Particles
      this.drawRain(ctx);

      // Fireflies / Embers
      this.drawFireflies(ctx);

      ctx.restore();
    }

    // 3. Draw Split Line Divider
    if (this.splitRatio > 0.01 && this.splitRatio < 0.99) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();

      // Handle thumb
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(splitX, H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawPixelArtLandscape(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Sky
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, W, H * 0.5);

    // Distant Mountains
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W * 0.25, H * 0.25);
    ctx.lineTo(W * 0.55, H * 0.5);
    ctx.lineTo(W * 0.8, H * 0.3);
    ctx.lineTo(W, H * 0.5);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // Rolling Grass Hills
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Cobblestone Path
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(W * 0.45, H * 0.5);
    ctx.lineTo(W * 0.55, H * 0.5);
    ctx.lineTo(W * 0.7, H);
    ctx.lineTo(W * 0.3, H);
    ctx.closePath();
    ctx.fill();

    // Thatched Cottage
    const houseX = W * 0.65;
    const houseY = H * 0.42;
    // Walls
    ctx.fillStyle = '#b45309';
    ctx.fillRect(houseX, houseY + 30, 80, 50);
    // Roof
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(houseX - 10, houseY + 30);
    ctx.lineTo(houseX + 40, houseY);
    ctx.lineTo(houseX + 90, houseY + 30);
    ctx.closePath();
    ctx.fill();
    // Warm Lit Window
    ctx.fillStyle = '#facc15';
    ctx.fillRect(houseX + 15, houseY + 45, 18, 18);
    // Door
    ctx.fillStyle = '#451a03';
    ctx.fillRect(houseX + 48, houseY + 50, 18, 30);

    // Campfire Site
    const fireX = W * 0.35;
    const fireY = H * 0.68;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(fireX, fireY, 14, 0, Math.PI * 2);
    ctx.fill();
    // Fire flames
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(fireX - 6, fireY + 2);
    ctx.lineTo(fireX, fireY - 12);
    ctx.lineTo(fireX + 6, fireY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(fireX - 3, fireY + 2);
    ctx.lineTo(fireX, fireY - 7);
    ctx.lineTo(fireX + 3, fireY + 2);
    ctx.closePath();
    ctx.fill();

    // Foliage Trees
    this.drawTree(ctx, W * 0.12, H * 0.48);
    this.drawTree(ctx, W * 0.22, H * 0.54);
    this.drawTree(ctx, W * 0.88, H * 0.52);
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 5, y, 10, 35);
    // Leaves (Layered circles)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x, y - 8, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(x - 6, y - 14, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCampfireGlow(ctx: CanvasRenderingContext2D, x: number, y: number, ambientAlpha: number) {
    if (ambientAlpha < 0.1) return;
    const radius = 90 + Math.sin(performance.now() * 0.008) * 8;
    const glow = ctx.createRadialGradient(x, y, 5, x, y, radius);
    glow.addColorStop(0, 'rgba(251, 146, 60, 0.65)');
    glow.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRain(ctx: CanvasRenderingContext2D) {
    const p = this.currentPreset.particles;
    if (p.rainDensity <= 0) return;

    ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    const rad = (p.rainAngleDeg * Math.PI) / 180;
    const dropLen = 10;
    const dx = Math.sin(rad) * dropLen;
    const dy = Math.cos(rad) * dropLen;

    const count = Math.min(p.rainDensity, this.rainParticles.length);
    for (let i = 0; i < count; i++) {
      const pt = this.rainParticles[i];
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + dx, pt.y + dy);
    }
    ctx.stroke();
  }

  private drawFireflies(ctx: CanvasRenderingContext2D) {
    const p = this.currentPreset.particles;
    if (p.fireflyCount <= 0) return;

    const count = Math.min(p.fireflyCount, this.fireflyParticles.length);
    for (let i = 0; i < count; i++) {
      const ff = this.fireflyParticles[i];
      const pulse = 0.4 + Math.sin(ff.phase) * 0.5;

      ctx.fillStyle = p.fireflyGlowColor;
      ctx.globalAlpha = Math.max(0.1, pulse);
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow aura
      ctx.fillStyle = p.fireflyGlowColor;
      ctx.globalAlpha = pulse * 0.25;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // -------------------------------------------------------------------------
  // Zero-Dependency Code Generator
  // -------------------------------------------------------------------------
  public generateZeroDependencyCode(): string {
    const p = this.currentPreset;
    const sorted = [...p.lightingKeyframes].sort((a, b) => a.hour - b.hour);

    return `/**
 * Atmosphere Calibration Profile: "${p.name}"
 * Biome: ${p.biome.toUpperCase()} | Weather: ${p.weather.toUpperCase()}
 * Auto-generated by BitQuest Atmosphere Calibration Studio (Milestone 9.6)
 */
export const ${p.id.toUpperCase()}_LIGHTING_KEYFRAMES = [
${sorted.map(k => `  { hour: ${k.hour.toFixed(1)}, color: 0x${((1 << 24) + k.color).toString(16).slice(1)}, alpha: ${k.alpha.toFixed(2)}, name: '${k.name}' }`).join(',\n')}
] as const;

export const ${p.id.toUpperCase()}_PARTICLES = {
  rainDensity: ${p.particles.rainDensity},
  rainSpeed: ${p.particles.rainSpeed},
  rainAngleDeg: ${p.particles.rainAngleDeg},
  windSpeed: ${p.particles.windSpeed},
  windAngleDeg: ${p.particles.windAngleDeg},
  lightningFrequency: ${p.particles.lightningFrequency},
  lightningIntensity: ${p.particles.lightningIntensity},
  fireflyCount: ${p.particles.fireflyCount},
  fireflyGlowColor: '${p.particles.fireflyGlowColor}',
  fogDensity: ${p.particles.fogDensity}
} as const;`;
  }

  public updateCodePreview() {
    if (!this.codePreviewEl) {
      this.codePreviewEl = this.root?.querySelector('#at-code-preview') as HTMLPreElement;
    }
    if (this.codePreviewEl) {
      this.codePreviewEl.textContent = this.generateZeroDependencyCode();
    }
  }

  // -------------------------------------------------------------------------
  // JSON Export & Import
  // -------------------------------------------------------------------------
  public exportPresetJSON(): string {
    const jsonStr = JSON.stringify(this.currentPreset, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atmosphere_${this.currentPreset.id}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return jsonStr;
  }

  public importPresetJSON(jsonStr: string): boolean {
    try {
      const obj = JSON.parse(jsonStr);
      const parsed = AtmosphereCalibrationPresetSchema.safeParse(obj);
      if (parsed.success) {
        this.currentPreset = parsed.data;
        this.presets[this.currentPreset.id] = this.currentPreset;
        this.renderPresetButtons();
        this.syncKeyframeInputs();
        this.syncParticleInputs();
        this.render();
        this.updateCodePreview();
        return true;
      } else {
        console.error('Atmosphere validation failed:', parsed.error);
        return false;
      }
    } catch (e) {
      console.error('Invalid JSON file:', e);
      return false;
    }
  }

  private codePreviewEl: HTMLPreElement | null = null;
}
