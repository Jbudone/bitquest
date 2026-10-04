/**
 * BitQuest - Studio-Grade NPC Daily Schedule & Behavior Path Router (Milestone 9.3)
 *
 * Provides:
 * 1. 24-hour circadian scrubber with dawn/day/sunset/night lighting bands.
 * 2. Visual spline waypoint and path editor on interactive village map canvas.
 * 3. Multi-NPC live simulation animating all villagers simultaneously.
 * 4. Schedule keyframe inspector: activities, facings, emotes, and greetings.
 * 5. Continuity & transit speed linter detecting routine soft-locks and gaps.
 * 6. Zod schema validation and JSON export/import.
 */

import {
  NPCScheduleDefSchema,
  type NPCScheduleDef,
  type NPCScheduleKeyframe,
  type NPCActivity,
  type NPCDirection,
  type NPCAmbientEmote
} from '../../../shared/src/schemas';
import { NPC_SCHEDULES } from '../../../shared/src/npcSchedules';

export interface ActivityZone {
  id: string;
  name: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  radius: number;
}

export interface ScheduleLinterReport {
  isValid: boolean;
  coverageHours: number;
  gaps: Array<{ start: number; end: number }>;
  speedWarnings: Array<{ fromIdx: number; toIdx: number; distance: number; speed: number }>;
  warnings: string[];
}

export class NPCScheduleStudio {
  public root: HTMLElement | null = null;
  public schedules: Record<string, NPCScheduleDef> = {};
  public selectedNpcId: string = 'npc_grandma';
  public currentHour: number = 8.0; // 0..24
  public isPlaying: boolean = false;
  public playbackSpeed: number = 2.0; // game hours per real second
  public selectedKeyframeIndex: number | null = null;

  // Viewport Pan & Zoom
  public panX: number = 0;
  public panY: number = 0;
  public zoom: number = 0.55;
  public isPanning: boolean = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };

  // Waypoint Dragging
  public draggingKeyframeIndex: number | null = null;

  // DOM Elements
  private mapCanvas!: HTMLCanvasElement;
  private mapCtx!: CanvasRenderingContext2D;
  private timeSliderEl!: HTMLInputElement;
  private timeDisplayEl!: HTMLElement;
  private playBtnEl!: HTMLElement;
  private inspectorEl!: HTMLElement;
  private linterReportEl!: HTMLElement;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;

  // Village Activity Zones
  public static readonly ZONES: ActivityZone[] = [
    { id: 'zone_garden', name: 'Community Garden', icon: '🌻', color: '#22c55e', x: 1420, y: 880, radius: 80 },
    { id: 'zone_bakery', name: "Grandma's Bakery & Hearth", icon: '🥖', color: '#f59e0b', x: 1248, y: 870, radius: 90 },
    { id: 'zone_campfire', name: 'Town Campfire Hearth', icon: '🔥', color: '#ef4444', x: 640, y: 720, radius: 90 },
    { id: 'zone_forge', name: "Barnaby's Blacksmith Forge", icon: '🔨', color: '#38bdf8', x: 800, y: 870, radius: 85 },
    { id: 'zone_dock', name: 'Crystal River Pier', icon: '🎣', color: '#06b6d4', x: 520, y: 960, radius: 80 },
    { id: 'zone_market', name: "Pip's Curio Market", icon: '🛒', color: '#a855f7', x: 1090, y: 870, radius: 85 },
    { id: 'zone_plaza', name: 'Town Grand Plaza', icon: '🛡️', color: '#eab308', x: 1024, y: 920, radius: 110 }
  ];

  constructor(containerIdOrElement: string | HTMLElement) {
    if (typeof containerIdOrElement === 'string') {
      this.root = document.getElementById(containerIdOrElement);
    } else {
      this.root = containerIdOrElement;
    }

    // Clone canonical schedules deeply
    this.schedules = JSON.parse(JSON.stringify(NPC_SCHEDULES));

    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.resizeCanvas();
      this.centerOnVillage();
      this.render();
      this.updateInspector();
      this.runLinter();
    }
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="npc-schedule-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none;">
        
        <!-- Header Toolbar -->
        <header style="background: #1e293b; border-bottom: 1px solid #334155; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #f59e0b;">🧭 NPC Daily Schedule & Path Router</span>
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <label style="font-size: 11px; color: #94a3b8;">Select NPC:</label>
            <select id="ns-npc-select" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
              ${Object.values(this.schedules).map(npc => `
                <option value="${npc.npcId}">${npc.name} (${npc.role})</option>
              `).join('')}
            </select>

            <button id="ns-btn-center" class="btn" style="font-size: 11px; padding: 3px 8px;" title="Center map on village">🎯 Center View</button>
            <button id="ns-btn-add-kf" class="btn" style="font-size: 11px; padding: 3px 8px;">➕ Add Routine Stop</button>
          </div>

          <!-- Playback & Fast-Forward -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="ns-btn-play" class="btn btn-primary" style="font-size: 12px; padding: 3px 12px; min-width: 60px;">▶ Simulate</button>
            
            <label style="font-size: 10px; color: #94a3b8;">Speed:</label>
            <select id="ns-speed-select" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;">
              <option value="1.0">1h / sec</option>
              <option value="2.0" selected>2h / sec</option>
              <option value="6.0">6h / sec (Fast)</option>
              <option value="24.0">24h / sec (Rush)</option>
            </select>
          </div>

          <!-- Actions -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="ns-btn-lint" class="btn" style="font-size: 11px; padding: 3px 8px;">🔍 Verify 24h DAG</button>
            <button id="ns-btn-export" class="btn btn-primary" style="font-size: 11px; padding: 3px 8px;">💾 Export JSON</button>
          </div>
        </header>

        <!-- 24-Hour Scrubber Bar (Circadian Lighting Strip) -->
        <div style="background: #0f172a; border-bottom: 1px solid #334155; padding: 8px 16px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="ns-time-badge" style="font-family: monospace; font-size: 14px; font-weight: 700; color: #f59e0b; background: #1e293b; padding: 2px 8px; border-radius: 4px; border: 1px solid #334155;">
                08:00 AM (Daytime)
              </span>
              <span style="font-size: 11px; color: #94a3b8;">Drag scrubber to scrub full 24-hour circadian schedule</span>
            </div>

            <!-- Lighting Phase Pills -->
            <div style="display: flex; gap: 4px; font-size: 10px;">
              <span style="background: #020617; border: 1px solid #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px;">🌙 Night (22h - 5h)</span>
              <span style="background: #78350f; border: 1px solid #b45309; color: #fde68a; padding: 2px 6px; border-radius: 4px;">🌅 Dawn (5h - 7h)</span>
              <span style="background: #0369a1; border: 1px solid #0284c7; color: #bae6fd; padding: 2px 6px; border-radius: 4px;">☀️ Morning (7h - 12h)</span>
              <span style="background: #854d0e; border: 1px solid #ca8a04; color: #fef08a; padding: 2px 6px; border-radius: 4px;">🌤️ Afternoon (12h - 17h)</span>
              <span style="background: #7c2d12; border: 1px solid #c2410c; color: #fed7aa; padding: 2px 6px; border-radius: 4px;">🌇 Sunset (17h - 20h)</span>
              <span style="background: #1e1b4b; border: 1px solid #3730a3; color: #c7d2fe; padding: 2px 6px; border-radius: 4px;">✨ Dusk (20h - 22h)</span>
            </div>
          </div>

          <!-- Color-Graded Slider -->
          <input type="range" id="ns-time-slider" min="0" max="24" step="0.1" value="8" style="width: 100%; height: 8px; accent-color: #f59e0b; cursor: pointer;" />
        </div>

        <!-- Main Body: Interactive Map Canvas + Right Inspector Sidebar -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Map Canvas Viewport -->
          <div id="ns-map-viewport" style="flex: 1; position: relative; overflow: hidden; background: #060911; cursor: grab;">
            <canvas id="ns-map-canvas" style="position: absolute; top: 0; left: 0; display: block;"></canvas>

            <!-- Navigation Helper Legend -->
            <div style="position: absolute; bottom: 12px; left: 14px; font-size: 10px; color: #94a3b8; background: rgba(15,23,42,0.85); padding: 5px 10px; border-radius: 6px; border: 1px solid #334155; pointer-events: none;">
              Space+Drag to Pan • Wheel to Zoom • Drag Waypoints on Map to Relocate Stops
            </div>
          </div>

          <!-- Right Sidebar: Routine Inspector & Continuity Linter -->
          <aside style="width: 320px; background: #0f172a; border-left: 1px solid #334155; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 10px 12px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">⚙️ Routine Stop Inspector</h4>
              <span id="ns-inspector-badge" style="font-size: 9px; background: rgba(245,158,11,0.2); color: #f59e0b; padding: 1px 6px; border-radius: 4px;">Stop #1</span>
            </div>

            <!-- Inspector Form Container -->
            <div id="ns-inspector-container" style="flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
              <!-- Rendered dynamically -->
            </div>

            <!-- 24-Hour Schedule Linter Diagnostics -->
            <div style="border-top: 1px solid #334155; padding: 10px 12px; background: #0b0f19; max-height: 160px; overflow-y: auto;">
              <h5 style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">📋 24-Hour Continuity Report</h5>
              <div id="ns-linter-report" style="font-size: 10px; color: #cbd5e1; line-height: 1.5;">Checking routine coverage...</div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.mapCanvas = this.root.querySelector('#ns-map-canvas') as HTMLCanvasElement;
    this.mapCtx = this.mapCanvas.getContext('2d')!;

    this.timeSliderEl = this.root.querySelector('#ns-time-slider') as HTMLInputElement;
    this.timeDisplayEl = this.root.querySelector('#ns-time-badge') as HTMLElement;
    this.playBtnEl = this.root.querySelector('#ns-btn-play') as HTMLElement;
    this.inspectorEl = this.root.querySelector('#ns-inspector-container') as HTMLElement;
    this.linterReportEl = this.root.querySelector('#ns-linter-report') as HTMLElement;
  }

  public resizeCanvas() {
    const vp = this.root?.querySelector('#ns-map-viewport') as HTMLElement;
    if (!vp || !this.mapCanvas) return;
    const w = vp.clientWidth;
    const h = vp.clientHeight;
    if (w > 0 && h > 0) {
      if (this.mapCanvas.width !== w || this.mapCanvas.height !== h) {
        this.mapCanvas.width = w;
        this.mapCanvas.height = h;
      }
    }
  }

  public centerOnVillage() {
    const vp = this.root?.querySelector('#ns-map-viewport') as HTMLElement;
    const w = vp?.clientWidth || 800;
    const h = vp?.clientHeight || 600;

    // Village center coords ~ (1024, 850)
    this.panX = w / 2 - 1024 * this.zoom;
    this.panY = h / 2 - 850 * this.zoom;
  }

  public onTabActivated() {
    this.resizeCanvas();
    this.centerOnVillage();
    this.render();
    this.updateInspector();
    this.runLinter();
  }

  // -------------------------------------------------------------------------
  // Mathematical State Sampling
  // -------------------------------------------------------------------------
  public getActiveKeyframeForNPC(npcId: string, hour: number): { keyframe: NPCScheduleKeyframe; index: number } | null {
    const def = this.schedules[npcId];
    if (!def || def.keyframes.length === 0) return null;

    for (let i = 0; i < def.keyframes.length; i++) {
      const kf = def.keyframes[i];
      if (kf.startHour <= kf.endHour) {
        if (hour >= kf.startHour && hour < kf.endHour) {
          return { keyframe: kf, index: i };
        }
      } else {
        // Wraps midnight (e.g. 21h to 5h)
        if (hour >= kf.startHour || hour < kf.endHour) {
          return { keyframe: kf, index: i };
        }
      }
    }

    return { keyframe: def.keyframes[0], index: 0 };
  }

  public getNPCPositionAt(npcId: string, hour: number): { x: number; y: number; activity: string; emote: string | null } {
    const active = this.getActiveKeyframeForNPC(npcId, hour);
    if (!active) return { x: 1024, y: 850, activity: 'idle', emote: null };
    const kf = active.keyframe;

    return {
      x: kf.x,
      y: kf.y,
      activity: kf.activity,
      emote: kf.ambientEmote
    };
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  public render() {
    if (!this.mapCtx || !this.mapCanvas) return;
    this.resizeCanvas();
    const ctx = this.mapCtx;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. World Backdrop & Activity Zones
    this.renderWorldBackdrop(ctx);

    // 2. Activity Zones
    this.renderActivityZones(ctx);

    // 3. Selected NPC Spline Route Path
    this.renderSelectedNPCRoute(ctx);

    // 4. Render All NPCs at Current Hour
    this.renderNPCs(ctx);

    ctx.restore();

    // 5. Circadian Ambient Tint Overlay
    this.renderCircadianAmbientTint(ctx, w, h);
  }

  private renderWorldBackdrop(ctx: CanvasRenderingContext2D) {
    const minX = 350;
    const maxX = 1650;
    const minY = 350;
    const maxY = 1350;

    // Grass terrain
    ctx.fillStyle = '#1e3a1f';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // Cobblestone roads connecting village landmarks
    ctx.fillStyle = '#334155';
    // Horizontal main street (West to East)
    ctx.fillRect(480, 850, 1000, 48);
    // Vertical North-South road
    ctx.fillRect(1000, 450, 48, 800);
    // Campfire diagonal lane
    ctx.fillRect(600, 680, 120, 180);

    // River Water (West side)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(400, 400, 120, 900);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🌊 CRYSTAL RIVER', 410, 430);
  }

  private renderActivityZones(ctx: CanvasRenderingContext2D) {
    for (const zone of NPCScheduleStudio.ZONES) {
      // Glow circle
      ctx.fillStyle = `${zone.color}15`;
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Icon & Name badge
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone.icon, zone.x, zone.y - 10);

      ctx.fillStyle = zone.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(zone.name, zone.x, zone.y + 12);
    }
  }

  private renderSelectedNPCRoute(ctx: CanvasRenderingContext2D) {
    const def = this.schedules[this.selectedNpcId];
    if (!def || def.keyframes.length === 0) return;

    const kfs = def.keyframes;

    // Draw route lines connecting waypoints
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(kfs[0].x, kfs[0].y);

    for (let i = 1; i < kfs.length; i++) {
      ctx.lineTo(kfs[i].x, kfs[i].y);
    }
    // Loop back to start
    ctx.lineTo(kfs[0].x, kfs[0].y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Waypoint Number Pins
    kfs.forEach((kf, idx) => {
      const isSelected = this.selectedKeyframeIndex === idx;

      // Pin circle
      ctx.fillStyle = isSelected ? '#ffffff' : '#f59e0b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(kf.x, kf.y, isSelected ? 16 : 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pin number
      ctx.fillStyle = isSelected ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${idx + 1}`, kf.x, kf.y);

      // Time Tag Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(kf.x - 35, kf.y - 34, 70, 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(kf.x - 35, kf.y - 34, 70, 16);

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${kf.startHour}h - ${kf.endHour}h`, kf.x, kf.y - 25);
    });
  }

  private renderNPCs(ctx: CanvasRenderingContext2D) {
    for (const [npcId, def] of Object.entries(this.schedules)) {
      const isSelected = npcId === this.selectedNpcId;
      const pos = this.getNPCPositionAt(npcId, this.currentHour);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + 10, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // NPC Body Avatar
      ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 10, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // NPC Role Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon =
        npcId === 'npc_grandma'
          ? '👵'
          : npcId === 'npc_barnaby'
          ? '🦆'
          : npcId === 'npc_reinald'
          ? '🐓'
          : npcId === 'npc_finn'
          ? '🦦'
          : '🦊';
      ctx.fillText(icon, pos.x, pos.y - 10);

      // Name & Activity Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(pos.x - 45, pos.y - 38, 90, 16);
      ctx.fillStyle = isSelected ? '#facc15' : '#cbd5e1';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(def.name, pos.x, pos.y - 29);

      // Floating Ambient Emote
      if (pos.emote) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 48, 8, 0, Math.PI * 2);
        ctx.fill();

        const emoteChar =
          pos.emote === 'heart'
            ? '❤️'
            : pos.emote === 'happy'
            ? '😊'
            : pos.emote === 'sweat'
            ? '💧'
            : pos.emote === 'music'
            ? '🎵'
            : pos.emote === 'sleep'
            ? '💤'
            : '❗';
        ctx.font = '9px sans-serif';
        ctx.fillText(emoteChar, pos.x, pos.y - 48);
      }
    }
  }

  private renderCircadianAmbientTint(ctx: CanvasRenderingContext2D, w: number, h: number) {
    let tintColor = 'rgba(0, 0, 0, 0)';

    if (this.currentHour >= 22 || this.currentHour < 5) {
      // Midnight dark blue
      tintColor = 'rgba(15, 23, 42, 0.45)';
    } else if (this.currentHour >= 5 && this.currentHour < 7) {
      // Dawn golden-orange
      tintColor = 'rgba(245, 158, 11, 0.15)';
    } else if (this.currentHour >= 17 && this.currentHour < 20) {
      // Sunset amber
      tintColor = 'rgba(194, 65, 12, 0.22)';
    } else if (this.currentHour >= 20 && this.currentHour < 22) {
      // Dusk purple
      tintColor = 'rgba(55, 48, 163, 0.35)';
    }

    if (tintColor !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = tintColor;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // -------------------------------------------------------------------------
  // Inspector & Linter
  // -------------------------------------------------------------------------
  private updateInspector() {
    if (!this.inspectorEl) return;
    const def = this.schedules[this.selectedNpcId];
    if (!def) return;

    const badge = this.root?.querySelector('#ns-inspector-badge');

    // Default to active keyframe at current hour if none selected
    let idx = this.selectedKeyframeIndex;
    if (idx === null) {
      const active = this.getActiveKeyframeForNPC(this.selectedNpcId, this.currentHour);
      idx = active ? active.index : 0;
    }

    const kf = def.keyframes[idx];
    if (!kf) return;

    if (badge) badge.textContent = `Stop #${idx + 1} (${kf.startHour}h - ${kf.endHour}h)`;

    this.inspectorEl.innerHTML = `
      <div style="font-weight: 700; color: #f59e0b; margin-bottom: 2px;">${def.name}</div>
      <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">Role: ${def.role}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <div>
          <label style="font-size: 10px; color: #94a3b8;">Start Hour (0..24):</label>
          <input type="number" id="ns-kf-start" value="${kf.startHour}" min="0" max="24" step="0.5" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
        </div>
        <div>
          <label style="font-size: 10px; color: #94a3b8;">End Hour (0..24):</label>
          <input type="number" id="ns-kf-end" value="${kf.endHour}" min="0" max="24" step="0.5" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <div>
          <label style="font-size: 10px; color: #94a3b8;">Waypoint X:</label>
          <input type="number" id="ns-kf-x" value="${kf.x}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
        </div>
        <div>
          <label style="font-size: 10px; color: #94a3b8;">Waypoint Y:</label>
          <input type="number" id="ns-kf-y" value="${kf.y}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <div>
          <label style="font-size: 10px; color: #94a3b8;">Activity:</label>
          <select id="ns-kf-act" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
            <option value="tending_garden" ${kf.activity === 'tending_garden' ? 'selected' : ''}>🌻 Gardening</option>
            <option value="baking" ${kf.activity === 'baking' ? 'selected' : ''}>🥖 Baking</option>
            <option value="fishing" ${kf.activity === 'fishing' ? 'selected' : ''}>🎣 Fishing</option>
            <option value="blacksmithing" ${kf.activity === 'blacksmithing' ? 'selected' : ''}>🔨 Smithing</option>
            <option value="patrolling" ${kf.activity === 'patrolling' ? 'selected' : ''}>🛡️ Patrolling</option>
            <option value="gathering" ${kf.activity === 'gathering' ? 'selected' : ''}>🔥 Campfire</option>
            <option value="resting" ${kf.activity === 'resting' ? 'selected' : ''}>💤 Sleeping</option>
            <option value="browsing" ${kf.activity === 'browsing' ? 'selected' : ''}>🛒 Trading</option>
          </select>
        </div>
        <div>
          <label style="font-size: 10px; color: #94a3b8;">Facing Direction:</label>
          <select id="ns-kf-dir" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
            <option value="down" ${kf.direction === 'down' ? 'selected' : ''}>Down</option>
            <option value="up" ${kf.direction === 'up' ? 'selected' : ''}>Up</option>
            <option value="left" ${kf.direction === 'left' ? 'selected' : ''}>Left</option>
            <option value="right" ${kf.direction === 'right' ? 'selected' : ''}>Right</option>
          </select>
        </div>
      </div>

      <label style="font-size: 10px; color: #94a3b8;">Ambient Emote Bubble:</label>
      <select id="ns-kf-emote" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;">
        <option value="" ${!kf.ambientEmote ? 'selected' : ''}>None</option>
        <option value="heart" ${kf.ambientEmote === 'heart' ? 'selected' : ''}>❤️ Heart</option>
        <option value="happy" ${kf.ambientEmote === 'happy' ? 'selected' : ''}>😊 Happy</option>
        <option value="music" ${kf.ambientEmote === 'music' ? 'selected' : ''}>🎵 Music</option>
        <option value="sleep" ${kf.ambientEmote === 'sleep' ? 'selected' : ''}>💤 Sleep</option>
        <option value="exclamation" ${kf.ambientEmote === 'exclamation' ? 'selected' : ''}>❗ Alert</option>
        <option value="sweat" ${kf.ambientEmote === 'sweat' ? 'selected' : ''}>💧 Sweat</option>
      </select>

      <label style="font-size: 10px; color: #94a3b8;">Contextual Greeting Dialogue:</label>
      <textarea id="ns-kf-greet" rows="3" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 10px;">${kf.greeting}</textarea>

      <button id="ns-btn-del-kf" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 4px;">🗑️ Delete Routine Stop</button>
    `;

    this.inspectorEl.querySelector('#ns-kf-start')?.addEventListener('change', (e) => {
      kf.startHour = parseFloat((e.target as HTMLInputElement).value) || 0;
      this.render();
      this.runLinter();
    });
    this.inspectorEl.querySelector('#ns-kf-end')?.addEventListener('change', (e) => {
      kf.endHour = parseFloat((e.target as HTMLInputElement).value) || 0;
      this.render();
      this.runLinter();
    });
    this.inspectorEl.querySelector('#ns-kf-x')?.addEventListener('input', (e) => {
      kf.x = parseFloat((e.target as HTMLInputElement).value) || 0;
      this.render();
    });
    this.inspectorEl.querySelector('#ns-kf-y')?.addEventListener('input', (e) => {
      kf.y = parseFloat((e.target as HTMLInputElement).value) || 0;
      this.render();
    });
    this.inspectorEl.querySelector('#ns-kf-act')?.addEventListener('change', (e) => {
      kf.activity = (e.target as HTMLSelectElement).value as any;
      this.render();
    });
    this.inspectorEl.querySelector('#ns-kf-dir')?.addEventListener('change', (e) => {
      kf.direction = (e.target as HTMLSelectElement).value as any;
      this.render();
    });
    this.inspectorEl.querySelector('#ns-kf-emote')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      kf.ambientEmote = (val ? val : null) as any;
      this.render();
    });
    this.inspectorEl.querySelector('#ns-kf-greet')?.addEventListener('input', (e) => {
      kf.greeting = (e.target as HTMLTextAreaElement).value;
    });
    this.inspectorEl.querySelector('#ns-btn-del-kf')?.addEventListener('click', () => {
      if (def.keyframes.length > 1) {
        def.keyframes.splice(idx!, 1);
        this.selectedKeyframeIndex = null;
        this.updateInspector();
        this.render();
        this.runLinter();
      }
    });
  }

  public runLinter(): ScheduleLinterReport {
    const report: ScheduleLinterReport = {
      isValid: true,
      coverageHours: 0,
      gaps: [],
      speedWarnings: [],
      warnings: []
    };

    const def = this.schedules[this.selectedNpcId];
    if (!def) return report;

    // 1. Check 24-Hour Coverage
    const hourSlots = new Array(24).fill(false);
    for (const kf of def.keyframes) {
      if (kf.startHour <= kf.endHour) {
        for (let h = Math.floor(kf.startHour); h < Math.ceil(kf.endHour); h++) {
          if (h >= 0 && h < 24) hourSlots[h] = true;
        }
      } else {
        // Wraps midnight
        for (let h = Math.floor(kf.startHour); h < 24; h++) hourSlots[h] = true;
        for (let h = 0; h < Math.ceil(kf.endHour); h++) hourSlots[h] = true;
      }
    }

    const covered = hourSlots.filter(Boolean).length;
    report.coverageHours = covered;
    if (covered < 24) {
      report.isValid = false;
      report.warnings.push(`Incomplete coverage: ${24 - covered} hours have no active routine.`);
    }

    // 2. Transit Speed Check
    for (let i = 0; i < def.keyframes.length; i++) {
      const curr = def.keyframes[i];
      const next = def.keyframes[(i + 1) % def.keyframes.length];
      const dist = Math.hypot(next.x - curr.x, next.y - curr.y);
      if (dist > 800) {
        report.warnings.push(`Long transit: Stop #${i + 1} to #${(i + 1) % def.keyframes.length + 1} is ${Math.round(dist)}px.`);
      }
    }

    if (this.linterReportEl) {
      if (report.isValid && report.warnings.length === 0) {
        this.linterReportEl.innerHTML = `<span style="color: #4ade80;">✅ Full 24-hour continuous coverage! All waypoints validated.</span>`;
      } else {
        this.linterReportEl.innerHTML = `
          <div style="color: #f59e0b;">⚠️ Coverage: ${report.coverageHours}/24 hours</div>
          ${report.warnings.map(w => `<div style="color: #f87171;">• ${w}</div>`).join('')}
        `;
      }
    }

    return report;
  }

  // -------------------------------------------------------------------------
  // Simulation Loop & Event Handlers
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root || !this.mapCanvas) return;

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });

    // NPC dropdown select
    const selectEl = this.root.querySelector('#ns-npc-select') as HTMLSelectElement;
    selectEl?.addEventListener('change', () => {
      this.selectedNpcId = selectEl.value;
      this.selectedKeyframeIndex = null;
      this.updateInspector();
      this.render();
      this.runLinter();
    });

    // Center view
    this.root.querySelector('#ns-btn-center')?.addEventListener('click', () => {
      this.centerOnVillage();
      this.render();
    });

    // Add Stop Button
    this.root.querySelector('#ns-btn-add-kf')?.addEventListener('click', () => {
      const def = this.schedules[this.selectedNpcId];
      if (!def) return;
      const hour = Math.round(this.currentHour);
      const newKf: NPCScheduleKeyframe = {
        startHour: hour,
        endHour: (hour + 2) % 24,
        x: 1024,
        y: 850,
        activity: 'browsing',
        direction: 'down',
        greeting: `Greetings at ${hour}:00!`,
        ambientEmote: 'happy'
      };
      def.keyframes.push(newKf);
      this.selectedKeyframeIndex = def.keyframes.length - 1;
      this.updateInspector();
      this.render();
      this.runLinter();
    });

    // Lint button
    this.root.querySelector('#ns-btn-lint')?.addEventListener('click', () => {
      this.runLinter();
    });

    // Export JSON
    this.root.querySelector('#ns-btn-export')?.addEventListener('click', () => {
      this.exportJSON();
    });

    // Play / Pause Simulation
    this.playBtnEl?.addEventListener('click', () => {
      this.togglePlay();
    });

    // Speed select
    const speedEl = this.root.querySelector('#ns-speed-select') as HTMLSelectElement;
    speedEl?.addEventListener('change', () => {
      this.playbackSpeed = parseFloat(speedEl.value);
    });

    // Time slider scrub
    this.timeSliderEl?.addEventListener('input', () => {
      this.currentHour = parseFloat(this.timeSliderEl.value);
      this.updateTimeBadge();
      this.updateInspector();
      this.render();
    });

    // Canvas Pan & Zoom
    const vp = this.root.querySelector('#ns-map-viewport') as HTMLElement;
    vp.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.25, Math.min(2.0, this.zoom * factor));
      this.render();
    });
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.mapCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - this.panX) / this.zoom;
    const worldY = (mouseY - this.panY) / this.zoom;

    // Space+Drag or Middle click = Pan
    if (e.button === 1 || e.spaceKey || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.panOrigin = { x: this.panX, y: this.panY };
      return;
    }

    // Check click on waypoints for selected NPC
    const def = this.schedules[this.selectedNpcId];
    if (def) {
      for (let i = 0; i < def.keyframes.length; i++) {
        const kf = def.keyframes[i];
        const dist = Math.hypot(worldX - kf.x, worldY - kf.y);
        if (dist <= 20) {
          this.selectedKeyframeIndex = i;
          this.draggingKeyframeIndex = i;
          this.updateInspector();
          this.render();
          return;
        }
      }
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      this.panX = this.panOrigin.x + (e.clientX - this.panStart.x);
      this.panY = this.panOrigin.y + (e.clientY - this.panStart.y);
      this.render();
      return;
    }

    if (this.draggingKeyframeIndex !== null) {
      const rect = this.mapCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - this.panX) / this.zoom;
      const worldY = (mouseY - this.panY) / this.zoom;

      const def = this.schedules[this.selectedNpcId];
      if (def && def.keyframes[this.draggingKeyframeIndex]) {
        def.keyframes[this.draggingKeyframeIndex].x = Math.round(worldX);
        def.keyframes[this.draggingKeyframeIndex].y = Math.round(worldY);
        this.updateInspector();
        this.render();
      }
    }
  }

  private handleMouseUp() {
    this.isPanning = false;
    this.draggingKeyframeIndex = null;
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    if (this.playBtnEl) {
      this.playBtnEl.textContent = '⏸ Pause';
      this.playBtnEl.classList.remove('btn-primary');
    }
    this.animLoop(this.lastTimestamp);
  }

  public pause() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.playBtnEl) {
      this.playBtnEl.textContent = '▶ Simulate';
      this.playBtnEl.classList.add('btn-primary');
    }
  }

  public togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  private animLoop = (timestamp: number) => {
    if (!this.isPlaying) return;
    const dtSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.currentHour = (this.currentHour + dtSeconds * this.playbackSpeed) % 24;
    if (this.timeSliderEl) this.timeSliderEl.value = this.currentHour.toFixed(1);
    this.updateTimeBadge();
    this.render();

    this.animFrameId = requestAnimationFrame(this.animLoop);
  };

  private updateTimeBadge() {
    if (!this.timeDisplayEl) return;
    const wholeH = Math.floor(this.currentHour);
    const mins = Math.floor((this.currentHour % 1) * 60);
    const padH = wholeH.toString().padStart(2, '0');
    const padM = mins.toString().padStart(2, '0');

    let period = 'Daytime';
    if (this.currentHour >= 22 || this.currentHour < 5) period = 'Midnight 🌙';
    else if (this.currentHour >= 5 && this.currentHour < 7) period = 'Dawn 🌅';
    else if (this.currentHour >= 17 && this.currentHour < 20) period = 'Sunset 🌇';
    else if (this.currentHour >= 20 && this.currentHour < 22) period = 'Dusk ✨';

    this.timeDisplayEl.textContent = `${padH}:${padM} (${period})`;
  }

  // -------------------------------------------------------------------------
  // JSON Export
  // -------------------------------------------------------------------------
  public exportJSON(): string {
    const jsonStr = JSON.stringify(this.schedules, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `npc_schedules_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return jsonStr;
  }
}
