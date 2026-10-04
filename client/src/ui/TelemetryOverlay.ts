/**
 * BitQuest - In-Engine Telemetry, Profiler & Physics Inspector HUD (Issue #37)
 * Toggleable via F3 hotkey or UI button. Displays live engine metrics (FPS, 1% low,
 * draw calls, active particle pool count), network latency ping graph, and controls
 * the wireframe bounding box renderer for colliders, hitboxes, and interaction radii.
 */

import {
  telemetryProfiler,
  type TelemetryMetrics,
  FRAME_HISTORY_SIZE,
  PING_HISTORY_SIZE
} from '../../../shared/src/telemetry';

export class TelemetryOverlay {
  public isVisible = false;
  public isPhysicsInspectorEnabled = true;

  private container: HTMLElement | null = null;
  private frameCanvas: HTMLCanvasElement | null = null;
  private frameCtx: CanvasRenderingContext2D | null = null;
  private pingCanvas: HTMLCanvasElement | null = null;
  private pingCtx: CanvasRenderingContext2D | null = null;

  // Cached DOM value elements for zero-allocation updates
  private elFps: HTMLElement | null = null;
  private elDelta: HTMLElement | null = null;
  private elOnePercentLow: HTMLElement | null = null;
  private elDrawCalls: HTMLElement | null = null;
  private elParticles: HTMLElement | null = null;
  private elEntities: HTMLElement | null = null;
  private elObstacles: HTMLElement | null = null;
  private elPing: HTMLElement | null = null;
  private elPingStats: HTMLElement | null = null;
  private elPhysicsToggle: HTMLInputElement | null = null;

  private lastRenderTimestamp = 0;
  private renderThrottleMs = 60; // Refresh DOM text every 60ms (~16 updates/sec) to eliminate DOM overhead

  constructor() {
    this.createDOM();
    this.setupListeners();
  }

  private createDOM() {
    const parent = document.getElementById('ui-overlay') || document.body;

    const overlay = document.createElement('div');
    overlay.id = 'telemetry-overlay';
    overlay.className = 'telemetry-hud hidden';
    overlay.innerHTML = `
      <div class="telemetry-header">
        <div class="telemetry-title">
          <span class="telemetry-tag">F3</span>
          <span class="telemetry-brand">BITQUEST ENGINE PROFILER</span>
        </div>
        <div class="telemetry-header-actions">
          <label class="telemetry-wireframe-toggle" title="Toggle Wireframe Physics Bounding Boxes">
            <input type="checkbox" id="telemetry-check-physics" checked />
            <span>Wireframes</span>
          </label>
          <button id="telemetry-btn-close" class="telemetry-close" title="Close Overlay [F3]">&times;</button>
        </div>
      </div>

      <div class="telemetry-grid">
        <!-- Column 1: FPS & Frame Timing -->
        <div class="telemetry-card">
          <div class="telemetry-card-title">⏱️ Frame Timing & FPS</div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Current FPS:</span>
            <span id="telemetry-val-fps" class="telemetry-val telemetry-highlight-green">60.0</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Frame Delta:</span>
            <span id="telemetry-val-delta" class="telemetry-val">16.6 ms</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">1% Low (P99):</span>
            <span id="telemetry-val-p99" class="telemetry-val">58.2 FPS (17.2 ms)</span>
          </div>
          <div class="telemetry-graph-box">
            <div class="telemetry-graph-label">Frame Time History (120f)</div>
            <canvas id="telemetry-canvas-frametime" width="160" height="42"></canvas>
          </div>
        </div>

        <!-- Column 2: Rendering & Scene State -->
        <div class="telemetry-card">
          <div class="telemetry-card-title">🎮 Rendering & Scene</div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Draw Calls:</span>
            <span id="telemetry-val-draws" class="telemetry-val">38</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">VFX Particles:</span>
            <span id="telemetry-val-particles" class="telemetry-val">0 / 600</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Active Entities:</span>
            <span id="telemetry-val-entities" class="telemetry-val">12</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Visible Obstacles:</span>
            <span id="telemetry-val-obstacles" class="telemetry-val">48</span>
          </div>
          <div class="telemetry-legend">
            <span class="legend-chip legend-footprint">■ Feet</span>
            <span class="legend-chip legend-hurtbox">■ Hurt</span>
            <span class="legend-chip legend-hitbox">■ Hit</span>
            <span class="legend-chip legend-interact">■ Proximity</span>
          </div>
        </div>

        <!-- Column 3: Network Latency & Ping -->
        <div class="telemetry-card">
          <div class="telemetry-card-title">🌐 Network Latency</div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Server Ping:</span>
            <span id="telemetry-val-ping" class="telemetry-val telemetry-highlight-green">0 ms</span>
          </div>
          <div class="telemetry-stat-row">
            <span class="telemetry-label">Min / Max / Avg:</span>
            <span id="telemetry-val-ping-stats" class="telemetry-val">0 / 0 / 0 ms</span>
          </div>
          <div class="telemetry-graph-box">
            <div class="telemetry-graph-label">Ping Latency History (60 samples)</div>
            <canvas id="telemetry-canvas-ping" width="160" height="42"></canvas>
          </div>
        </div>
      </div>
    `;

    parent.appendChild(overlay);
    this.container = overlay;

    // Cache elements
    this.elFps = document.getElementById('telemetry-val-fps');
    this.elDelta = document.getElementById('telemetry-val-delta');
    this.elOnePercentLow = document.getElementById('telemetry-val-p99');
    this.elDrawCalls = document.getElementById('telemetry-val-draws');
    this.elParticles = document.getElementById('telemetry-val-particles');
    this.elEntities = document.getElementById('telemetry-val-entities');
    this.elObstacles = document.getElementById('telemetry-val-obstacles');
    this.elPing = document.getElementById('telemetry-val-ping');
    this.elPingStats = document.getElementById('telemetry-val-ping-stats');
    this.elPhysicsToggle = document.getElementById('telemetry-check-physics') as HTMLInputElement;

    this.frameCanvas = document.getElementById('telemetry-canvas-frametime') as HTMLCanvasElement;
    if (this.frameCanvas) {
      this.frameCtx = this.frameCanvas.getContext('2d');
    }

    this.pingCanvas = document.getElementById('telemetry-canvas-ping') as HTMLCanvasElement;
    if (this.pingCanvas) {
      this.pingCtx = this.pingCanvas.getContext('2d');
    }
  }

  private setupListeners() {
    // F3 Hotkey Listener (Intercept browser search and toggle overlay)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });

    document.getElementById('telemetry-btn-close')?.addEventListener('click', () => {
      this.hide();
    });

    this.elPhysicsToggle?.addEventListener('change', (e) => {
      this.isPhysicsInspectorEnabled = (e.target as HTMLInputElement).checked;
    });
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.show();
    } else {
      this.hide();
    }
    return this.isVisible;
  }

  public show(): void {
    this.isVisible = true;
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
  }

  /**
   * Called on every game update tick. Updates sparklines and throttled DOM text.
   */
  public update(now: number): void {
    if (!this.isVisible) return;

    const metrics = telemetryProfiler.getMetrics();

    // Render sparklines on canvas (every frame or whenever active)
    this.renderFrameSparkline();
    this.renderPingSparkline();

    // Throttle DOM text node updates to prevent micro-jank
    if (now - this.lastRenderTimestamp >= this.renderThrottleMs) {
      this.lastRenderTimestamp = now;
      this.updateDOMText(metrics);
    }
  }

  private updateDOMText(m: TelemetryMetrics): void {
    if (this.elFps) {
      this.elFps.textContent = m.fps.toFixed(1);
      if (m.fps >= 55) {
        this.elFps.className = 'telemetry-val telemetry-highlight-green';
      } else if (m.fps >= 30) {
        this.elFps.className = 'telemetry-val telemetry-highlight-yellow';
      } else {
        this.elFps.className = 'telemetry-val telemetry-highlight-red';
      }
    }

    if (this.elDelta) {
      this.elDelta.textContent = `${m.deltaMs.toFixed(1)} ms`;
    }

    if (this.elOnePercentLow) {
      this.elOnePercentLow.textContent = `${m.onePercentLowFps.toFixed(1)} FPS (${m.onePercentLowMs.toFixed(1)} ms)`;
    }

    if (this.elDrawCalls) {
      this.elDrawCalls.textContent = `${m.drawCalls}`;
    }

    if (this.elParticles) {
      this.elParticles.textContent = `${m.particleCount} / 600`;
    }

    if (this.elEntities) {
      this.elEntities.textContent = `${m.entityCount}`;
    }

    if (this.elObstacles) {
      this.elObstacles.textContent = `${m.obstacleCount}`;
    }

    if (this.elPing) {
      this.elPing.textContent = `${m.currentPing} ms`;
      if (m.currentPing <= 45) {
        this.elPing.className = 'telemetry-val telemetry-highlight-green';
      } else if (m.currentPing <= 120) {
        this.elPing.className = 'telemetry-val telemetry-highlight-yellow';
      } else {
        this.elPing.className = 'telemetry-val telemetry-highlight-red';
      }
    }

    if (this.elPingStats) {
      this.elPingStats.textContent = `${m.minPing} / ${m.maxPing} / ${m.avgPing} ms`;
    }
  }

  private renderFrameSparkline(): void {
    if (!this.frameCtx || !this.frameCanvas) return;
    const ctx = this.frameCtx;
    const w = this.frameCanvas.width;
    const h = this.frameCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background grid & 16.6ms / 33.3ms guidelines
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const maxScaleMs = 40; // 0 to 40ms scale
    const y60fps = h - (16.6 / maxScaleMs) * h;
    const y30fps = h - (33.3 / maxScaleMs) * h;

    // 60 FPS target line (green)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y60fps);
    ctx.lineTo(w, y60fps);
    ctx.stroke();

    // 30 FPS warning line (yellow)
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, y30fps);
    ctx.lineTo(w, y30fps);
    ctx.stroke();

    // Draw bars for rolling 120 frames
    const barW = w / FRAME_HISTORY_SIZE;
    for (let i = 0; i < FRAME_HISTORY_SIZE; i++) {
      const ms = telemetryProfiler.frameDeltas[i];
      if (ms <= 0) continue;

      const barH = Math.min(h, (ms / maxScaleMs) * h);
      const x = i * barW;
      const y = h - barH;

      if (ms <= 18.0) {
        ctx.fillStyle = '#22c55e'; // Green
      } else if (ms <= 33.3) {
        ctx.fillStyle = '#eab308'; // Yellow
      } else {
        ctx.fillStyle = '#ef4444'; // Red
      }

      ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);
    }
  }

  private renderPingSparkline(): void {
    if (!this.pingCtx || !this.pingCanvas) return;
    const ctx = this.pingCtx;
    const w = this.pingCanvas.width;
    const h = this.pingCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const maxPingScale = 150; // 0 to 150ms scale
    const barW = w / PING_HISTORY_SIZE;

    // Draw ping bars
    for (let i = 0; i < PING_HISTORY_SIZE; i++) {
      const ping = telemetryProfiler.pingHistory[i];
      if (ping < 0) continue;

      const barH = Math.min(h, Math.max(2, (ping / maxPingScale) * h));
      const x = i * barW;
      const y = h - barH;

      if (ping <= 50) {
        ctx.fillStyle = '#06b6d4'; // Cyan
      } else if (ping <= 100) {
        ctx.fillStyle = '#eab308'; // Yellow
      } else {
        ctx.fillStyle = '#ef4444'; // Red
      }

      ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);
    }
  }
}
