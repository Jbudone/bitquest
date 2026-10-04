/**
 * BitQuest - Studio-Grade Cinematic Sequencer & Cutscene Choreographer (Milestone 9.2)
 *
 * Provides:
 * 1. Multi-track visual timeline: Camera, Actors, Dialogue, Audio, and Screen FX.
 * 2. Real-time playhead scrubbing and smooth keyframe interpolation (Cubic / Quad / Linear).
 * 3. Interactive 2D Stage Preview with camera frustum, actor sprites, emotes, letterbox, and subtitles.
 * 4. Keyframe inspector for adjusting timing, easing, coords, dialogue lines, and audio cues.
 * 5. Zod schema validation, preset library, and JSON export/import.
 */

import {
  CutsceneSequenceSchema,
  type CutsceneSequence,
  type CameraKeyframe,
  type ActorKeyframe,
  type ActorTrack,
  type DialogueKeyframe,
  type AudioKeyframe,
  type ScreenEffectKeyframe
} from '../../../shared/src/schemas';
import cutscenePresetsJson from '../../../shared/data/cutscenes.json';

export interface SelectedKeyframeRef {
  trackType: 'camera' | 'actor' | 'dialogue' | 'audio' | 'screen';
  actorId?: string;
  index: number;
}

export class CutsceneStudio {
  public root: HTMLElement | null = null;
  public sequence!: CutsceneSequence;
  public currentTimeMs: number = 0;
  public isPlaying: boolean = false;
  public playbackSpeed: number = 1.0;
  public isLooping: boolean = true;
  public selectedKeyframe: SelectedKeyframeRef | null = null;

  // Timeline Navigation & Layout
  public zoomPxPerMs: number = 0.16; // 1 second = 160px
  public timelineScrollX: number = 0;
  public isScrubbingTimeline: boolean = false;
  public draggingKeyframe: SelectedKeyframeRef | null = null;
  private dragStartX: number = 0;
  private dragStartKeyframeTime: number = 0;

  // DOM Elements
  private stageCanvas!: HTMLCanvasElement;
  private stageCtx!: CanvasRenderingContext2D;
  private timelineCanvas!: HTMLCanvasElement;
  private timelineCtx!: CanvasRenderingContext2D;
  private inspectorEl!: HTMLElement;
  private timeDisplayEl!: HTMLElement;
  private playBtnEl!: HTMLElement;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;

  // Track Layout Constants
  private readonly TRACK_HEIGHT = 38;
  private readonly HEADER_HEIGHT = 28;
  private readonly TRACK_LABEL_WIDTH = 140;

  // Preset library
  public static readonly PRESETS: Record<string, CutsceneSequence> = cutscenePresetsJson as any;

  constructor(containerIdOrElement: string | HTMLElement) {
    if (typeof containerIdOrElement === 'string') {
      this.root = document.getElementById(containerIdOrElement);
    } else {
      this.root = containerIdOrElement;
    }

    // Load default preset
    this.loadPreset('ancient_gate_opening');

    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.resizeCanvases();
      this.render();
    }
  }

  // -------------------------------------------------------------------------
  // Preset Management
  // -------------------------------------------------------------------------
  public loadPreset(presetKey: string) {
    const raw = CutsceneStudio.PRESETS[presetKey] || CutsceneStudio.PRESETS['ancient_gate_opening'];
    const parsed = CutsceneSequenceSchema.safeParse(raw);
    if (parsed.success) {
      this.sequence = JSON.parse(JSON.stringify(parsed.data));
    } else {
      console.error('Failed to parse cutscene preset:', parsed.error);
      this.sequence = {
        id: 'new_sequence',
        title: 'New Cutscene',
        description: '',
        durationMs: 5000,
        cameraTrack: [{ timeMs: 0, x: 1024, y: 512, zoom: 1.0, shakeIntensity: 0, ease: 'quadInOut' }],
        actors: [],
        dialogueTrack: [],
        audioTrack: [],
        screenTrack: []
      };
    }
    this.currentTimeMs = 0;
    this.selectedKeyframe = null;
  }

  public loadSequence(sequence: CutsceneSequence) {
    const parsed = CutsceneSequenceSchema.safeParse(sequence);
    if (parsed.success) {
      this.sequence = JSON.parse(JSON.stringify(parsed.data));
      this.currentTimeMs = 0;
      this.selectedKeyframe = null;
      this.updateInspector();
      this.render();
    } else {
      console.error('Invalid CutsceneSequence:', parsed.error);
    }
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="cutscene-studio-wrap" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none;">
        
        <!-- Header Toolbar -->
        <header style="background: #1e293b; border-bottom: 1px solid #334155; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #38bdf8;">🎬 Cutscene & Cinematic Sequencer</span>
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <label style="font-size: 11px; color: #94a3b8;">Preset:</label>
            <select id="cs-preset-select" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
              <option value="ancient_gate_opening">The Ancient Gate Awakens (5s)</option>
              <option value="boss_vespera_intro">Arch-Lich Vespera Descends (6s)</option>
              <option value="barnaby_express_delivery">Barnaby's Express Delivery (4.5s)</option>
            </select>

            <button id="cs-btn-add-actor" class="btn" style="font-size: 11px; padding: 3px 8px;">➕ Add Actor</button>
            <button id="cs-btn-add-kf" class="btn" style="font-size: 11px; padding: 3px 8px;">💎 Add Keyframe</button>
          </div>

          <!-- Playback Controls -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="cs-btn-rewind" class="btn" style="font-size: 12px; padding: 3px 8px;" title="Rewind to start (Home)">⏮️</button>
            <button id="cs-btn-step-back" class="btn" style="font-size: 12px; padding: 3px 8px;" title="Step Back 100ms">◀</button>
            <button id="cs-btn-play" class="btn btn-primary" style="font-size: 12px; padding: 3px 12px; min-width: 60px;" title="Play / Pause (Space)">▶ Play</button>
            <button id="cs-btn-step-fwd" class="btn" style="font-size: 12px; padding: 3px 8px;" title="Step Forward 100ms">▶</button>
            <button id="cs-btn-loop" class="btn active" style="font-size: 11px; padding: 3px 8px;" title="Toggle Looping">🔁 Loop</button>

            <span id="cs-time-display" style="font-family: monospace; font-size: 12px; background: #0f172a; border: 1px solid #334155; padding: 3px 8px; border-radius: 4px; color: #38bdf8; min-width: 95px; text-align: center;">0.00s / 5.00s</span>

            <select id="cs-speed-select" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;">
              <option value="0.5">0.5x</option>
              <option value="1.0" selected>1.0x</option>
              <option value="2.0">2.0x</option>
            </select>
          </div>

          <!-- Actions -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="cs-btn-export" class="btn btn-primary" style="font-size: 11px; padding: 3px 8px;">💾 Export JSON</button>
            <button id="cs-btn-import" class="btn" style="font-size: 11px; padding: 3px 8px;">📂 Import JSON</button>
            <input type="file" id="cs-file-input" accept="application/json" style="display: none;" />
          </div>
        </header>

        <!-- Main Body: Top Stage Viewport + Right Inspector Sidebar -->
        <div style="flex: 1; display: flex; min-height: 0; position: relative;">
          
          <!-- Stage Viewport (Center) -->
          <div id="cs-stage-container" style="flex: 1; position: relative; overflow: hidden; background: #060911; display: flex; align-items: center; justify-content: center;">
            <canvas id="cs-stage-canvas" style="display: block; width: 100%; height: 100%;"></canvas>
            
            <!-- Stage Overlay Badges -->
            <div style="position: absolute; top: 10px; left: 12px; font-size: 10px; color: #94a3b8; background: rgba(15,23,42,0.85); padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; pointer-events: none;">
              🎥 Camera Frustum Preview • 16:9 Cinematic Stage
            </div>
          </div>

          <!-- Right Sidebar: Keyframe Property Inspector -->
          <aside style="width: 280px; background: #0f172a; border-left: 1px solid #334155; display: flex; flex-direction: column; overflow-y: auto;">
            <div style="padding: 10px 12px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">⚙️ Keyframe Inspector</h4>
              <span id="cs-inspector-badge" style="font-size: 9px; background: rgba(56,189,248,0.2); color: #38bdf8; padding: 1px 6px; border-radius: 4px;">None</span>
            </div>

            <div id="cs-inspector-body" style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
                Select a keyframe diamond or duration block on the timeline to inspect and edit its properties.
              </div>
            </div>
          </aside>
        </div>

        <!-- Bottom Timeline Editor -->
        <div style="height: 230px; background: #0f172a; border-top: 1px solid #334155; display: flex; flex-direction: column;">
          
          <!-- Timeline Sub-Bar -->
          <div style="background: #1e293b; padding: 4px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: #cbd5e1;">Tracks</span>
              <span style="color: #64748b;">(Click to scrub • Drag diamonds to shift timing)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="color: #94a3b8; font-size: 10px;">Zoom:</label>
              <button id="cs-zoom-out" class="btn" style="padding: 1px 6px; font-size: 10px;">−</button>
              <button id="cs-zoom-in" class="btn" style="padding: 1px 6px; font-size: 10px;">+</button>
              <button id="cs-zoom-fit" class="btn" style="padding: 1px 6px; font-size: 10px;">Fit</button>
            </div>
          </div>

          <!-- Timeline Canvas Viewport -->
          <div id="cs-timeline-container" style="flex: 1; position: relative; overflow: hidden; background: #0b0f19;">
            <canvas id="cs-timeline-canvas" style="display: block; width: 100%; height: 100%; cursor: pointer;"></canvas>
          </div>
        </div>
      </div>
    `;

    this.stageCanvas = this.root.querySelector('#cs-stage-canvas') as HTMLCanvasElement;
    this.stageCtx = this.stageCanvas.getContext('2d')!;

    this.timelineCanvas = this.root.querySelector('#cs-timeline-canvas') as HTMLCanvasElement;
    this.timelineCtx = this.timelineCanvas.getContext('2d')!;

    this.inspectorEl = this.root.querySelector('#cs-inspector-body') as HTMLElement;
    this.timeDisplayEl = this.root.querySelector('#cs-time-display') as HTMLElement;
    this.playBtnEl = this.root.querySelector('#cs-btn-play') as HTMLElement;
  }

  public resizeCanvases() {
    if (!this.stageCanvas || !this.timelineCanvas) return;
    const sContainer = this.root?.querySelector('#cs-stage-container') as HTMLElement;
    if (sContainer && sContainer.clientWidth > 0 && sContainer.clientHeight > 0) {
      if (this.stageCanvas.width !== sContainer.clientWidth || this.stageCanvas.height !== sContainer.clientHeight) {
        this.stageCanvas.width = sContainer.clientWidth;
        this.stageCanvas.height = sContainer.clientHeight;
      }
    }

    const tContainer = this.root?.querySelector('#cs-timeline-container') as HTMLElement;
    if (tContainer && tContainer.clientWidth > 0 && tContainer.clientHeight > 0) {
      if (this.timelineCanvas.width !== tContainer.clientWidth || this.timelineCanvas.height !== tContainer.clientHeight) {
        this.timelineCanvas.width = tContainer.clientWidth;
        this.timelineCanvas.height = tContainer.clientHeight;
      }
    }
  }

  public onTabActivated() {
    this.resizeCanvases();
    this.fitTimeline();
    this.render();
  }

  public fitTimeline() {
    if (!this.timelineCanvas) return;
    const availableWidth = this.timelineCanvas.width - this.TRACK_LABEL_WIDTH - 40;
    if (availableWidth > 100 && this.sequence.durationMs > 0) {
      this.zoomPxPerMs = availableWidth / this.sequence.durationMs;
      this.timelineScrollX = 0;
    }
  }

  // -------------------------------------------------------------------------
  // Interpolation Engine (Mathematical State Sampling)
  // -------------------------------------------------------------------------
  private easeValue(t: number, easeType: string = 'quadInOut'): number {
    const clamped = Math.max(0, Math.min(1, t));
    switch (easeType) {
      case 'linear':
        return clamped;
      case 'quadIn':
        return clamped * clamped;
      case 'quadOut':
        return 1 - (1 - clamped) * (1 - clamped);
      case 'quadInOut':
      default:
        return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    }
  }

  public getCameraStateAt(timeMs: number): { x: number; y: number; zoom: number; shakeIntensity: number } {
    const kfs = this.sequence.cameraTrack;
    if (!kfs || kfs.length === 0) {
      return { x: 1024, y: 512, zoom: 1.0, shakeIntensity: 0 };
    }
    if (kfs.length === 1 || timeMs <= kfs[0].timeMs) {
      return { x: kfs[0].x, y: kfs[0].y, zoom: kfs[0].zoom, shakeIntensity: kfs[0].shakeIntensity };
    }
    if (timeMs >= kfs[kfs.length - 1].timeMs) {
      const last = kfs[kfs.length - 1];
      return { x: last.x, y: last.y, zoom: last.zoom, shakeIntensity: last.shakeIntensity };
    }

    // Find segment
    let prev = kfs[0];
    let next = kfs[1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (timeMs >= kfs[i].timeMs && timeMs <= kfs[i + 1].timeMs) {
        prev = kfs[i];
        next = kfs[i + 1];
        break;
      }
    }

    const duration = next.timeMs - prev.timeMs;
    const progress = duration > 0 ? (timeMs - prev.timeMs) / duration : 0;
    const eased = this.easeValue(progress, next.ease || 'quadInOut');

    return {
      x: prev.x + (next.x - prev.x) * eased,
      y: prev.y + (next.y - prev.y) * eased,
      zoom: prev.zoom + (next.zoom - prev.zoom) * eased,
      shakeIntensity: prev.shakeIntensity + (next.shakeIntensity - prev.shakeIntensity) * eased
    };
  }

  public getActorStateAt(actor: ActorTrack, timeMs: number): {
    x: number;
    y: number;
    anim: string;
    facing: string;
    emote: string;
    alpha: number;
  } {
    const kfs = actor.keyframes;
    if (!kfs || kfs.length === 0) {
      return { x: 1024, y: 512, anim: 'idle', facing: 'down', emote: 'none', alpha: 1 };
    }
    if (kfs.length === 1 || timeMs <= kfs[0].timeMs) {
      return {
        x: kfs[0].x,
        y: kfs[0].y,
        anim: kfs[0].anim,
        facing: kfs[0].facing,
        emote: kfs[0].emote,
        alpha: kfs[0].alpha
      };
    }
    if (timeMs >= kfs[kfs.length - 1].timeMs) {
      const last = kfs[kfs.length - 1];
      return {
        x: last.x,
        y: last.y,
        anim: last.anim,
        facing: last.facing,
        emote: last.emote,
        alpha: last.alpha
      };
    }

    let prev = kfs[0];
    let next = kfs[1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (timeMs >= kfs[i].timeMs && timeMs <= kfs[i + 1].timeMs) {
        prev = kfs[i];
        next = kfs[i + 1];
        break;
      }
    }

    const duration = next.timeMs - prev.timeMs;
    const progress = duration > 0 ? (timeMs - prev.timeMs) / duration : 0;
    const eased = this.easeValue(progress, 'linear');

    return {
      x: prev.x + (next.x - prev.x) * eased,
      y: prev.y + (next.y - prev.y) * eased,
      anim: prev.anim,
      facing: prev.facing,
      emote: prev.emote,
      alpha: prev.alpha + (next.alpha - prev.alpha) * eased
    };
  }

  public getActiveDialogueAt(timeMs: number): DialogueKeyframe | null {
    if (!this.sequence.dialogueTrack) return null;
    return this.sequence.dialogueTrack.find(d => timeMs >= d.timeMs && timeMs <= d.timeMs + d.durationMs) || null;
  }

  public getActiveScreenEffectsAt(timeMs: number): {
    letterboxPct: number;
    overlayColor: string;
    overlayAlpha: number;
    shake: number;
  } {
    let letterboxPct = 0;
    let overlayColor = '#000000';
    let overlayAlpha = 0;
    let shake = 0;

    if (this.sequence.screenTrack) {
      for (const fx of this.sequence.screenTrack) {
        const start = fx.timeMs;
        const end = fx.timeMs + fx.durationMs;
        if (timeMs >= start && timeMs <= end) {
          const progress = (timeMs - start) / fx.durationMs;
          if (fx.effect === 'letterbox_in') {
            letterboxPct = Math.max(letterboxPct, progress);
          } else if (fx.effect === 'letterbox_out') {
            letterboxPct = Math.max(letterboxPct, 1 - progress);
          } else if (fx.effect === 'fade_in') {
            overlayColor = fx.color || '#000000';
            overlayAlpha = Math.max(overlayAlpha, 1 - progress);
          } else if (fx.effect === 'fade_out') {
            overlayColor = fx.color || '#000000';
            overlayAlpha = Math.max(overlayAlpha, progress);
          } else if (fx.effect === 'flash') {
            overlayColor = fx.color || '#ffffff';
            overlayAlpha = Math.max(overlayAlpha, (1 - progress) * 0.85);
          }
        } else if (timeMs > end && fx.effect === 'letterbox_in') {
          // Stay letterboxed until letterbox_out starts
          const hasOutStarted = this.sequence.screenTrack.some(
            o => o.effect === 'letterbox_out' && o.timeMs > fx.timeMs && timeMs >= o.timeMs
          );
          if (!hasOutStarted) letterboxPct = Math.max(letterboxPct, 1);
        }
      }
    }

    return { letterboxPct, overlayColor, overlayAlpha, shake };
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  public render() {
    this.resizeCanvases();
    this.renderStage();
    this.renderTimeline();
    this.updateTimeDisplay();
  }

  private renderStage() {
    if (!this.stageCtx || !this.stageCanvas) return;
    const ctx = this.stageCtx;
    const w = this.stageCanvas.width;
    const h = this.stageCanvas.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Camera transform
    const cam = this.getCameraStateAt(this.currentTimeMs);
    const fx = this.getActiveScreenEffectsAt(this.currentTimeMs);

    // Apply camera shake if any
    let shakeX = 0;
    let shakeY = 0;
    if (cam.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * cam.shakeIntensity * 300;
      shakeY = (Math.random() - 0.5) * cam.shakeIntensity * 300;
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

    // 2. Stage backdrop (Retro map tile simulation)
    this.renderStageBackdrop(ctx);

    // 3. Actors
    for (const actor of this.sequence.actors) {
      const aState = this.getActorStateAt(actor, this.currentTimeMs);
      this.renderActor(ctx, actor, aState);
    }

    // 4. Camera framing helper (Frustum box)
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    const frameW = 640;
    const frameH = 360;
    ctx.strokeRect(cam.x - frameW / 2, cam.y - frameH / 2, frameW, frameH);
    ctx.setLineDash([]);

    ctx.restore();

    // 5. Letterbox cinema bars
    if (fx.letterboxPct > 0) {
      const barH = (h * 0.12) * fx.letterboxPct;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
    }

    // 6. Screen fade / flash overlay
    if (fx.overlayAlpha > 0) {
      ctx.save();
      ctx.fillStyle = fx.overlayColor;
      ctx.globalAlpha = Math.min(1, Math.max(0, fx.overlayAlpha));
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 7. Subtitles / Dialogue Balloon
    const activeDialogue = this.getActiveDialogueAt(this.currentTimeMs);
    if (activeDialogue) {
      this.renderDialogueOverlay(ctx, activeDialogue, w, h);
    }
  }

  private renderStageBackdrop(ctx: CanvasRenderingContext2D) {
    const minX = 700;
    const maxX = 1350;
    const minY = 150;
    const maxY = 1050;
    const tileSize = 32;

    // Meadow ground tiles
    ctx.fillStyle = '#1e3a1f';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = minX; x <= maxX; x += tileSize) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = minY; y <= maxY; y += tileSize) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
    ctx.stroke();

    // Stone pathway to Ancient Gate
    ctx.fillStyle = '#334155';
    ctx.fillRect(992, 450, 64, 550);

    // Ancient Gate structure indicator
    ctx.fillStyle = '#475569';
    ctx.fillRect(960, 420, 128, 60);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ ANCIENT GATE', 1024, 455);
  }

  private renderActor(
    ctx: CanvasRenderingContext2D,
    actor: ActorTrack,
    state: { x: number; y: number; anim: string; facing: string; emote: string; alpha: number }
  ) {
    if (state.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = state.alpha;

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(state.x, state.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Actor Body Silhouette
    const isHero = actor.actorId === 'hero';
    const isBoss = actor.actorId.includes('vespera') || actor.actorId.includes('boss');
    const isBird = actor.actorId.includes('pelican') || actor.actorId.includes('barnaby');

    ctx.fillStyle = isHero ? '#3b82f6' : isBoss ? '#9333ea' : isBird ? '#f59e0b' : '#10b981';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    // Bobbing / Walk bounce
    const bob = state.anim === 'walk' ? Math.sin(this.currentTimeMs * 0.015) * 3 : 0;
    const radius = isBoss ? 20 : 12;

    ctx.beginPath();
    ctx.arc(state.x, state.y - 12 + bob, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Emoji icon representation
    ctx.fillStyle = '#ffffff';
    ctx.font = `${isBoss ? 18 : 13}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = isHero ? '🧙' : isBoss ? '💀' : isBird ? '🦆' : '👤';
    ctx.fillText(icon, state.x, state.y - 12 + bob);

    // Actor Nameplate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(state.x - 36, state.y - 38 + bob, 72, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(actor.name, state.x, state.y - 29 + bob);

    // Floating Emote Bubble
    if (state.emote && state.emote !== 'none') {
      const emoteY = state.y - 48 + bob;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(state.x, emoteY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      const emoteChar =
        state.emote === 'exclamation'
          ? '❗'
          : state.emote === 'question'
          ? '❓'
          : state.emote === 'heart'
          ? '❤️'
          : state.emote === 'sweat'
          ? '💧'
          : state.emote === 'music'
          ? '🎵'
          : '💢';

      ctx.font = '11px sans-serif';
      ctx.fillText(emoteChar, state.x, emoteY + 1);
    }

    ctx.restore();
  }

  private renderDialogueOverlay(ctx: CanvasRenderingContext2D, dialogue: DialogueKeyframe, w: number, h: number) {
    const boxW = Math.min(680, w - 40);
    const boxH = 68;
    const boxX = (w - boxW) / 2;
    const boxY = h - boxH - 24;

    // Subtitle background card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, 8) : ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Speaker portrait icon
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(boxX + 10, boxY + 10, 48, 48, 6) : ctx.fillRect(boxX + 10, boxY + 10, 48, 48);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const portraitIcon =
      dialogue.portrait === 'vespera'
        ? '💀'
        : dialogue.portrait === 'pelican'
        ? '🦆'
        : dialogue.portrait === 'gate'
        ? '🏛️'
        : '👤';
    ctx.fillText(portraitIcon, boxX + 34, boxY + 34);

    // Speaker Name
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dialogue.speaker, boxX + 68, boxY + 22);

    // Subtitle Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px sans-serif';
    ctx.fillText(dialogue.text, boxX + 68, boxY + 44);
  }

  // -------------------------------------------------------------------------
  // Timeline Canvas Rendering
  // -------------------------------------------------------------------------
  private renderTimeline() {
    if (!this.timelineCtx || !this.timelineCanvas) return;
    const ctx = this.timelineCtx;
    const w = this.timelineCanvas.width;
    const h = this.timelineCanvas.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    const trackList = this.getTimelineTracks();
    const startX = this.TRACK_LABEL_WIDTH;

    // 1. Time Ruler (Header)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, this.HEADER_HEIGHT);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, this.HEADER_HEIGHT);
    ctx.lineTo(w, this.HEADER_HEIGHT);
    ctx.stroke();

    // Ruler ticks every 500ms
    const totalMs = Math.max(this.sequence.durationMs, 2000);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    for (let ms = 0; ms <= totalMs; ms += 500) {
      const tickX = startX + ms * this.zoomPxPerMs - this.timelineScrollX;
      if (tickX < startX || tickX > w) continue;

      const isSec = ms % 1000 === 0;
      ctx.strokeStyle = isSec ? '#64748b' : '#334155';
      ctx.beginPath();
      ctx.moveTo(tickX, isSec ? 10 : 18);
      ctx.lineTo(tickX, this.HEADER_HEIGHT);
      ctx.stroke();

      if (isSec) {
        ctx.fillText(`${(ms / 1000).toFixed(1)}s`, tickX, 10);
      }
    }

    // 2. Track Rows
    trackList.forEach((track, idx) => {
      const rowY = this.HEADER_HEIGHT + idx * this.TRACK_HEIGHT;

      // Row background
      ctx.fillStyle = idx % 2 === 0 ? '#0f172a' : '#0b0f19';
      ctx.fillRect(0, rowY, w, this.TRACK_HEIGHT);

      // Track border
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, rowY + this.TRACK_HEIGHT);
      ctx.lineTo(w, rowY + this.TRACK_HEIGHT);
      ctx.stroke();

      // Track Label Sidebar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, rowY, startX, this.TRACK_HEIGHT);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0, rowY, startX, this.TRACK_HEIGHT);

      ctx.fillStyle = track.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${track.icon} ${track.label}`, 8, rowY + 23);

      // Render track keyframes
      this.renderTrackKeyframes(ctx, track, rowY, startX);
    });

    // 3. Current Playhead Line (Red needle)
    const playheadX = startX + this.currentTimeMs * this.zoomPxPerMs - this.timelineScrollX;
    if (playheadX >= startX && playheadX <= w) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      // Playhead handle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 10);
      ctx.closePath();
      ctx.fill();
    }
  }

  private getTimelineTracks(): Array<{
    type: 'camera' | 'actor' | 'dialogue' | 'audio' | 'screen';
    actorId?: string;
    label: string;
    icon: string;
    color: string;
  }> {
    const list: any[] = [
      { type: 'camera', label: 'Camera Pan/Zoom', icon: '🎥', color: '#38bdf8' }
    ];

    for (const actor of this.sequence.actors) {
      list.push({
        type: 'actor',
        actorId: actor.actorId,
        label: actor.name,
        icon: '🎭',
        color: '#10b981'
      });
    }

    list.push(
      { type: 'dialogue', label: 'Dialogue / Subs', icon: '💬', color: '#a855f7' },
      { type: 'audio', label: 'Audio & Music', icon: '🎵', color: '#f59e0b' },
      { type: 'screen', label: 'Screen FX', icon: '🎬', color: '#f43f5e' }
    );

    return list;
  }

  private renderTrackKeyframes(
    ctx: CanvasRenderingContext2D,
    track: { type: string; actorId?: string },
    rowY: number,
    startX: number
  ) {
    const centerY = rowY + this.TRACK_HEIGHT / 2;

    if (track.type === 'camera') {
      this.sequence.cameraTrack.forEach((kf, idx) => {
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const isSelected =
          this.selectedKeyframe?.trackType === 'camera' && this.selectedKeyframe.index === idx;
        this.drawDiamondKeyframe(ctx, kfX, centerY, '#38bdf8', isSelected);
      });
    } else if (track.type === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === track.actorId);
      if (actor) {
        actor.keyframes.forEach((kf, idx) => {
          const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
          const isSelected =
            this.selectedKeyframe?.trackType === 'actor' &&
            this.selectedKeyframe.actorId === track.actorId &&
            this.selectedKeyframe.index === idx;
          this.drawDiamondKeyframe(ctx, kfX, centerY, '#10b981', isSelected);
        });
      }
    } else if (track.type === 'dialogue') {
      this.sequence.dialogueTrack.forEach((kf, idx) => {
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const kfW = kf.durationMs * this.zoomPxPerMs;
        const isSelected =
          this.selectedKeyframe?.trackType === 'dialogue' && this.selectedKeyframe.index === idx;

        ctx.fillStyle = isSelected ? '#c084fc' : '#9333ea';
        ctx.strokeStyle = isSelected ? '#ffffff' : '#581c87';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.fillRect(kfX, rowY + 6, Math.max(kfW, 8), this.TRACK_HEIGHT - 12);
        ctx.strokeRect(kfX, rowY + 6, Math.max(kfW, 8), this.TRACK_HEIGHT - 12);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(kf.speaker, kfX + 4, rowY + 22);
      });
    } else if (track.type === 'audio') {
      this.sequence.audioTrack.forEach((kf, idx) => {
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const isSelected =
          this.selectedKeyframe?.trackType === 'audio' && this.selectedKeyframe.index === idx;
        this.drawDiamondKeyframe(ctx, kfX, centerY, '#f59e0b', isSelected);
      });
    } else if (track.type === 'screen') {
      this.sequence.screenTrack.forEach((kf, idx) => {
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const kfW = kf.durationMs * this.zoomPxPerMs;
        const isSelected =
          this.selectedKeyframe?.trackType === 'screen' && this.selectedKeyframe.index === idx;

        ctx.fillStyle = isSelected ? '#fb7185' : '#e11d48';
        ctx.strokeStyle = isSelected ? '#ffffff' : '#881337';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.fillRect(kfX, rowY + 6, Math.max(kfW, 8), this.TRACK_HEIGHT - 12);
        ctx.strokeRect(kfX, rowY + 6, Math.max(kfW, 8), this.TRACK_HEIGHT - 12);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(kf.effect, kfX + 4, rowY + 22);
      });
    }
  }

  private drawDiamondKeyframe(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    isSelected: boolean
  ) {
    const size = isSelected ? 8 : 6;
    ctx.save();
    ctx.fillStyle = isSelected ? '#ffffff' : color;
    ctx.strokeStyle = isSelected ? color : '#0f172a';
    ctx.lineWidth = isSelected ? 2 : 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private updateTimeDisplay() {
    if (!this.timeDisplayEl) return;
    const curSec = (this.currentTimeMs / 1000).toFixed(2);
    const totSec = (this.sequence.durationMs / 1000).toFixed(2);
    this.timeDisplayEl.textContent = `${curSec}s / ${totSec}s`;
  }

  // -------------------------------------------------------------------------
  // Playback Control
  // -------------------------------------------------------------------------
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
      this.playBtnEl.textContent = '▶ Play';
      this.playBtnEl.classList.add('btn-primary');
    }
  }

  public togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public seek(timeMs: number) {
    this.currentTimeMs = Math.max(0, Math.min(this.sequence.durationMs, timeMs));
    this.render();
  }

  private animLoop = (timestamp: number) => {
    if (!this.isPlaying) return;
    const dt = (timestamp - this.lastTimestamp) * this.playbackSpeed;
    this.lastTimestamp = timestamp;

    this.currentTimeMs += dt;
    if (this.currentTimeMs >= this.sequence.durationMs) {
      if (this.isLooping) {
        this.currentTimeMs = 0;
      } else {
        this.currentTimeMs = this.sequence.durationMs;
        this.pause();
      }
    }

    this.render();
    this.animFrameId = requestAnimationFrame(this.animLoop);
  };

  // -------------------------------------------------------------------------
  // Event Handlers & Timeline Interaction
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root || !this.timelineCanvas) return;

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeCanvases();
      this.render();
    });

    // Preset selector
    const presetSelect = this.root.querySelector('#cs-preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      this.loadPreset(presetSelect.value);
      this.fitTimeline();
      this.updateInspector();
      this.render();
    });

    // Playback buttons
    this.playBtnEl?.addEventListener('click', () => this.togglePlay());

    this.root.querySelector('#cs-btn-rewind')?.addEventListener('click', () => {
      this.seek(0);
    });

    this.root.querySelector('#cs-btn-step-back')?.addEventListener('click', () => {
      this.seek(this.currentTimeMs - 100);
    });

    this.root.querySelector('#cs-btn-step-fwd')?.addEventListener('click', () => {
      this.seek(this.currentTimeMs + 100);
    });

    // Loop button
    const loopBtn = this.root.querySelector('#cs-btn-loop');
    loopBtn?.addEventListener('click', () => {
      this.isLooping = !this.isLooping;
      loopBtn.classList.toggle('active', this.isLooping);
    });

    // Speed select
    const speedSelect = this.root.querySelector('#cs-speed-select') as HTMLSelectElement;
    speedSelect?.addEventListener('change', () => {
      this.playbackSpeed = parseFloat(speedSelect.value);
    });

    // Zoom buttons
    this.root.querySelector('#cs-zoom-in')?.addEventListener('click', () => {
      this.zoomPxPerMs = Math.min(0.5, this.zoomPxPerMs * 1.25);
      this.renderTimeline();
    });

    this.root.querySelector('#cs-zoom-out')?.addEventListener('click', () => {
      this.zoomPxPerMs = Math.max(0.04, this.zoomPxPerMs * 0.8);
      this.renderTimeline();
    });

    this.root.querySelector('#cs-zoom-fit')?.addEventListener('click', () => {
      this.fitTimeline();
      this.renderTimeline();
    });

    // Add Actor
    this.root.querySelector('#cs-btn-add-actor')?.addEventListener('click', () => {
      const id = `actor_${Date.now()}`;
      const newActor: ActorTrack = {
        actorId: id,
        name: `Actor ${this.sequence.actors.length + 1}`,
        spriteKey: 'adventurer',
        keyframes: [
          { timeMs: this.currentTimeMs, x: 1024, y: 512, anim: 'idle', facing: 'down', emote: 'none', alpha: 1 }
        ]
      };
      this.sequence.actors.push(newActor);
      this.selectedKeyframe = { trackType: 'actor', actorId: id, index: 0 };
      this.updateInspector();
      this.render();
    });

    // Add Keyframe at Playhead
    this.root.querySelector('#cs-btn-add-kf')?.addEventListener('click', () => {
      this.addKeyframeAtPlayhead();
    });

    // Export JSON
    this.root.querySelector('#cs-btn-export')?.addEventListener('click', () => {
      this.exportJSON();
    });

    // Import JSON
    const fileInput = this.root.querySelector('#cs-file-input') as HTMLInputElement;
    this.root.querySelector('#cs-btn-import')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          this.loadSequence(parsed);
        } catch (err) {
          alert('Invalid cutscene JSON file.');
        }
      };
      reader.readAsText(file);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'Home') {
        e.preventDefault();
        this.seek(0);
      } else if (e.code === 'Delete') {
        if (this.selectedKeyframe) {
          this.deleteSelectedKeyframe();
        }
      }
    });

    // Timeline Mouse Interaction
    this.timelineCanvas.addEventListener('mousedown', (e) => this.handleTimelineMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleTimelineMouseMove(e));
    window.addEventListener('mouseup', () => this.handleTimelineMouseUp());
  }

  private handleTimelineMouseDown(e: MouseEvent) {
    const rect = this.timelineCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Header click: Scrub Playhead
    if (mouseY <= this.HEADER_HEIGHT) {
      this.isScrubbingTimeline = true;
      const targetMs = Math.max(0, (mouseX - this.TRACK_LABEL_WIDTH + this.timelineScrollX) / this.zoomPxPerMs);
      this.seek(targetMs);
      return;
    }

    // Check click on keyframes
    const trackList = this.getTimelineTracks();
    const clickedTrackIndex = Math.floor((mouseY - this.HEADER_HEIGHT) / this.TRACK_HEIGHT);

    if (clickedTrackIndex >= 0 && clickedTrackIndex < trackList.length) {
      const track = trackList[clickedTrackIndex];
      const found = this.findKeyframeAt(track, mouseX);

      if (found) {
        this.selectedKeyframe = found;
        this.draggingKeyframe = found;
        this.dragStartX = mouseX;
        this.dragStartKeyframeTime = this.getKeyframeTime(found);
        this.updateInspector();
        this.renderTimeline();
        return;
      }
    }

    // Clicking empty space in track: scrub playhead to mouse position
    this.isScrubbingTimeline = true;
    const targetMs = Math.max(0, (mouseX - this.TRACK_LABEL_WIDTH + this.timelineScrollX) / this.zoomPxPerMs);
    this.seek(targetMs);
  }

  private handleTimelineMouseMove(e: MouseEvent) {
    const rect = this.timelineCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (this.isScrubbingTimeline) {
      const targetMs = Math.max(0, (mouseX - this.TRACK_LABEL_WIDTH + this.timelineScrollX) / this.zoomPxPerMs);
      this.seek(targetMs);
      return;
    }

    if (this.draggingKeyframe) {
      const deltaX = mouseX - this.dragStartX;
      const deltaMs = deltaX / this.zoomPxPerMs;
      const rawNewTime = Math.max(0, Math.min(this.sequence.durationMs, this.dragStartKeyframeTime + deltaMs));
      // Snap to 50ms grid
      const snappedTime = Math.round(rawNewTime / 50) * 50;

      this.setKeyframeTime(this.draggingKeyframe, snappedTime);
      this.seek(snappedTime);
      this.updateInspector();
      this.render();
    }
  }

  private handleTimelineMouseUp() {
    this.isScrubbingTimeline = false;
    this.draggingKeyframe = null;
  }

  private findKeyframeAt(
    track: { type: string; actorId?: string },
    mouseX: number
  ): SelectedKeyframeRef | null {
    const startX = this.TRACK_LABEL_WIDTH;

    if (track.type === 'camera') {
      for (let i = 0; i < this.sequence.cameraTrack.length; i++) {
        const kf = this.sequence.cameraTrack[i];
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        if (Math.abs(mouseX - kfX) <= 10) {
          return { trackType: 'camera', index: i };
        }
      }
    } else if (track.type === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === track.actorId);
      if (actor) {
        for (let i = 0; i < actor.keyframes.length; i++) {
          const kf = actor.keyframes[i];
          const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
          if (Math.abs(mouseX - kfX) <= 10) {
            return { trackType: 'actor', actorId: track.actorId, index: i };
          }
        }
      }
    } else if (track.type === 'dialogue') {
      for (let i = 0; i < this.sequence.dialogueTrack.length; i++) {
        const kf = this.sequence.dialogueTrack[i];
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const kfW = kf.durationMs * this.zoomPxPerMs;
        if (mouseX >= kfX && mouseX <= kfX + kfW) {
          return { trackType: 'dialogue', index: i };
        }
      }
    } else if (track.type === 'audio') {
      for (let i = 0; i < this.sequence.audioTrack.length; i++) {
        const kf = this.sequence.audioTrack[i];
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        if (Math.abs(mouseX - kfX) <= 10) {
          return { trackType: 'audio', index: i };
        }
      }
    } else if (track.type === 'screen') {
      for (let i = 0; i < this.sequence.screenTrack.length; i++) {
        const kf = this.sequence.screenTrack[i];
        const kfX = startX + kf.timeMs * this.zoomPxPerMs - this.timelineScrollX;
        const kfW = kf.durationMs * this.zoomPxPerMs;
        if (mouseX >= kfX && mouseX <= kfX + kfW) {
          return { trackType: 'screen', index: i };
        }
      }
    }

    return null;
  }

  private getKeyframeTime(ref: SelectedKeyframeRef): number {
    if (ref.trackType === 'camera') return this.sequence.cameraTrack[ref.index]?.timeMs || 0;
    if (ref.trackType === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === ref.actorId);
      return actor?.keyframes[ref.index]?.timeMs || 0;
    }
    if (ref.trackType === 'dialogue') return this.sequence.dialogueTrack[ref.index]?.timeMs || 0;
    if (ref.trackType === 'audio') return this.sequence.audioTrack[ref.index]?.timeMs || 0;
    if (ref.trackType === 'screen') return this.sequence.screenTrack[ref.index]?.timeMs || 0;
    return 0;
  }

  private setKeyframeTime(ref: SelectedKeyframeRef, newTime: number) {
    if (ref.trackType === 'camera') {
      if (this.sequence.cameraTrack[ref.index]) {
        this.sequence.cameraTrack[ref.index].timeMs = newTime;
        this.sequence.cameraTrack.sort((a, b) => a.timeMs - b.timeMs);
      }
    } else if (ref.trackType === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === ref.actorId);
      if (actor && actor.keyframes[ref.index]) {
        actor.keyframes[ref.index].timeMs = newTime;
        actor.keyframes.sort((a, b) => a.timeMs - b.timeMs);
      }
    } else if (ref.trackType === 'dialogue') {
      if (this.sequence.dialogueTrack[ref.index]) {
        this.sequence.dialogueTrack[ref.index].timeMs = newTime;
        this.sequence.dialogueTrack.sort((a, b) => a.timeMs - b.timeMs);
      }
    } else if (ref.trackType === 'audio') {
      if (this.sequence.audioTrack[ref.index]) {
        this.sequence.audioTrack[ref.index].timeMs = newTime;
        this.sequence.audioTrack.sort((a, b) => a.timeMs - b.timeMs);
      }
    } else if (ref.trackType === 'screen') {
      if (this.sequence.screenTrack[ref.index]) {
        this.sequence.screenTrack[ref.index].timeMs = newTime;
        this.sequence.screenTrack.sort((a, b) => a.timeMs - b.timeMs);
      }
    }
  }

  public addKeyframeAtPlayhead() {
    const curTime = Math.round(this.currentTimeMs);

    // If an actor is selected, add actor keyframe
    if (this.selectedKeyframe?.trackType === 'actor' && this.selectedKeyframe.actorId) {
      const actor = this.sequence.actors.find(a => a.actorId === this.selectedKeyframe!.actorId);
      if (actor) {
        const state = this.getActorStateAt(actor, curTime);
        actor.keyframes.push({
          timeMs: curTime,
          x: Math.round(state.x),
          y: Math.round(state.y),
          anim: state.anim as any,
          facing: state.facing as any,
          emote: state.emote as any,
          alpha: state.alpha
        });
        actor.keyframes.sort((a, b) => a.timeMs - b.timeMs);
        this.render();
        return;
      }
    }

    // Default: Add Camera keyframe
    const cam = this.getCameraStateAt(curTime);
    this.sequence.cameraTrack.push({
      timeMs: curTime,
      x: Math.round(cam.x),
      y: Math.round(cam.y),
      zoom: cam.zoom,
      shakeIntensity: cam.shakeIntensity,
      ease: 'quadInOut'
    });
    this.sequence.cameraTrack.sort((a, b) => a.timeMs - b.timeMs);
    this.render();
  }

  public deleteSelectedKeyframe() {
    if (!this.selectedKeyframe) return;
    const ref = this.selectedKeyframe;

    if (ref.trackType === 'camera') {
      if (this.sequence.cameraTrack.length > 1) {
        this.sequence.cameraTrack.splice(ref.index, 1);
      }
    } else if (ref.trackType === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === ref.actorId);
      if (actor && actor.keyframes.length > 1) {
        actor.keyframes.splice(ref.index, 1);
      }
    } else if (ref.trackType === 'dialogue') {
      this.sequence.dialogueTrack.splice(ref.index, 1);
    } else if (ref.trackType === 'audio') {
      this.sequence.audioTrack.splice(ref.index, 1);
    } else if (ref.trackType === 'screen') {
      this.sequence.screenTrack.splice(ref.index, 1);
    }

    this.selectedKeyframe = null;
    this.updateInspector();
    this.render();
  }

  // -------------------------------------------------------------------------
  // Inspector
  // -------------------------------------------------------------------------
  private updateInspector() {
    if (!this.inspectorEl) return;
    const badge = this.root?.querySelector('#cs-inspector-badge');

    if (!this.selectedKeyframe) {
      if (badge) badge.textContent = 'None';
      this.inspectorEl.innerHTML = `
        <div style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
          Select a keyframe diamond or duration block on the timeline to inspect and edit its properties.
        </div>
      `;
      return;
    }

    const ref = this.selectedKeyframe;
    if (badge) badge.textContent = `${ref.trackType.toUpperCase()} #${ref.index}`;

    if (ref.trackType === 'camera') {
      const kf = this.sequence.cameraTrack[ref.index];
      if (!kf) return;

      this.inspectorEl.innerHTML = `
        <label style="font-size: 10px; color: #94a3b8;">Time (ms):</label>
        <input type="number" id="cs-kf-time" value="${kf.timeMs}" step="50" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Target X:</label>
            <input type="number" id="cs-cam-x" value="${kf.x}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Target Y:</label>
            <input type="number" id="cs-cam-y" value="${kf.y}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Zoom (0.5 - 2.5):</label>
            <input type="number" id="cs-cam-zoom" value="${kf.zoom}" step="0.05" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Shake (0 - 0.05):</label>
            <input type="number" id="cs-cam-shake" value="${kf.shakeIntensity}" step="0.002" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
        </div>

        <label style="font-size: 10px; color: #94a3b8;">Easing Curve:</label>
        <select id="cs-cam-ease" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 12px;">
          <option value="quadInOut" ${kf.ease === 'quadInOut' ? 'selected' : ''}>Quad In-Out (Smooth)</option>
          <option value="linear" ${kf.ease === 'linear' ? 'selected' : ''}>Linear (Constant)</option>
          <option value="quadIn" ${kf.ease === 'quadIn' ? 'selected' : ''}>Quad In (Accelerate)</option>
          <option value="quadOut" ${kf.ease === 'quadOut' ? 'selected' : ''}>Quad Out (Decelerate)</option>
        </select>

        <button id="cs-btn-del-kf" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 4px;">🗑️ Delete Keyframe</button>
      `;

      this.inspectorEl.querySelector('#cs-kf-time')?.addEventListener('change', (e) => {
        kf.timeMs = parseInt((e.target as HTMLInputElement).value, 10);
        this.render();
      });
      this.inspectorEl.querySelector('#cs-cam-x')?.addEventListener('input', (e) => {
        kf.x = parseFloat((e.target as HTMLInputElement).value) || 0;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-cam-y')?.addEventListener('input', (e) => {
        kf.y = parseFloat((e.target as HTMLInputElement).value) || 0;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-cam-zoom')?.addEventListener('input', (e) => {
        kf.zoom = parseFloat((e.target as HTMLInputElement).value) || 1;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-cam-shake')?.addEventListener('input', (e) => {
        kf.shakeIntensity = parseFloat((e.target as HTMLInputElement).value) || 0;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-cam-ease')?.addEventListener('change', (e) => {
        kf.ease = (e.target as HTMLSelectElement).value as any;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-btn-del-kf')?.addEventListener('click', () => {
        this.deleteSelectedKeyframe();
      });
    } else if (ref.trackType === 'actor') {
      const actor = this.sequence.actors.find(a => a.actorId === ref.actorId);
      const kf = actor?.keyframes[ref.index];
      if (!kf) return;

      this.inspectorEl.innerHTML = `
        <div style="font-weight: 700; color: #10b981; margin-bottom: 4px;">Actor: ${actor?.name}</div>

        <label style="font-size: 10px; color: #94a3b8;">Time (ms):</label>
        <input type="number" id="cs-kf-time" value="${kf.timeMs}" step="50" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Coord X:</label>
            <input type="number" id="cs-act-x" value="${kf.x}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Coord Y:</label>
            <input type="number" id="cs-act-y" value="${kf.y}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Animation:</label>
            <select id="cs-act-anim" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
              <option value="idle" ${kf.anim === 'idle' ? 'selected' : ''}>Idle</option>
              <option value="walk" ${kf.anim === 'walk' ? 'selected' : ''}>Walk</option>
              <option value="attack" ${kf.anim === 'attack' ? 'selected' : ''}>Attack</option>
              <option value="cheer" ${kf.anim === 'cheer' ? 'selected' : ''}>Cheer</option>
              <option value="hurt" ${kf.anim === 'hurt' ? 'selected' : ''}>Hurt</option>
            </select>
          </div>
          <div>
            <label style="font-size: 10px; color: #94a3b8;">Facing:</label>
            <select id="cs-act-facing" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
              <option value="down" ${kf.facing === 'down' ? 'selected' : ''}>Down</option>
              <option value="up" ${kf.facing === 'up' ? 'selected' : ''}>Up</option>
              <option value="left" ${kf.facing === 'left' ? 'selected' : ''}>Left</option>
              <option value="right" ${kf.facing === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </div>
        </div>

        <label style="font-size: 10px; color: #94a3b8;">Floating Emote Bubble:</label>
        <select id="cs-act-emote" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 12px;">
          <option value="none" ${kf.emote === 'none' ? 'selected' : ''}>None</option>
          <option value="exclamation" ${kf.emote === 'exclamation' ? 'selected' : ''}>❗ Exclamation</option>
          <option value="question" ${kf.emote === 'question' ? 'selected' : ''}>❓ Question</option>
          <option value="heart" ${kf.emote === 'heart' ? 'selected' : ''}>❤️ Heart</option>
          <option value="sweat" ${kf.emote === 'sweat' ? 'selected' : ''}>💧 Sweat</option>
          <option value="music" ${kf.emote === 'music' ? 'selected' : ''}>🎵 Music</option>
          <option value="angry" ${kf.emote === 'angry' ? 'selected' : ''}>💢 Angry</option>
        </select>

        <button id="cs-btn-del-kf" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 4px;">🗑️ Delete Keyframe</button>
      `;

      this.inspectorEl.querySelector('#cs-kf-time')?.addEventListener('change', (e) => {
        kf.timeMs = parseInt((e.target as HTMLInputElement).value, 10);
        this.render();
      });
      this.inspectorEl.querySelector('#cs-act-x')?.addEventListener('input', (e) => {
        kf.x = parseFloat((e.target as HTMLInputElement).value) || 0;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-act-y')?.addEventListener('input', (e) => {
        kf.y = parseFloat((e.target as HTMLInputElement).value) || 0;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-act-anim')?.addEventListener('change', (e) => {
        kf.anim = (e.target as HTMLSelectElement).value as any;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-act-facing')?.addEventListener('change', (e) => {
        kf.facing = (e.target as HTMLSelectElement).value as any;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-act-emote')?.addEventListener('change', (e) => {
        kf.emote = (e.target as HTMLSelectElement).value as any;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-btn-del-kf')?.addEventListener('click', () => {
        this.deleteSelectedKeyframe();
      });
    } else if (ref.trackType === 'dialogue') {
      const kf = this.sequence.dialogueTrack[ref.index];
      if (!kf) return;

      this.inspectorEl.innerHTML = `
        <label style="font-size: 10px; color: #94a3b8;">Start Time (ms):</label>
        <input type="number" id="cs-dia-time" value="${kf.timeMs}" step="50" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

        <label style="font-size: 10px; color: #94a3b8;">Duration (ms):</label>
        <input type="number" id="cs-dia-dur" value="${kf.durationMs}" step="100" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

        <label style="font-size: 10px; color: #94a3b8;">Speaker Name:</label>
        <input type="text" id="cs-dia-speaker" value="${kf.speaker}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

        <label style="font-size: 10px; color: #94a3b8;">Subtitle Text:</label>
        <textarea id="cs-dia-text" rows="3" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 12px;">${kf.text}</textarea>

        <button id="cs-btn-del-kf" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 4px;">🗑️ Delete Keyframe</button>
      `;

      this.inspectorEl.querySelector('#cs-dia-time')?.addEventListener('change', (e) => {
        kf.timeMs = parseInt((e.target as HTMLInputElement).value, 10);
        this.render();
      });
      this.inspectorEl.querySelector('#cs-dia-dur')?.addEventListener('change', (e) => {
        kf.durationMs = parseInt((e.target as HTMLInputElement).value, 10);
        this.render();
      });
      this.inspectorEl.querySelector('#cs-dia-speaker')?.addEventListener('input', (e) => {
        kf.speaker = (e.target as HTMLInputElement).value;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-dia-text')?.addEventListener('input', (e) => {
        kf.text = (e.target as HTMLTextAreaElement).value;
        this.render();
      });
      this.inspectorEl.querySelector('#cs-btn-del-kf')?.addEventListener('click', () => {
        this.deleteSelectedKeyframe();
      });
    }
  }

  // -------------------------------------------------------------------------
  // JSON Export & Import
  // -------------------------------------------------------------------------
  public exportJSON(): string {
    const jsonStr = JSON.stringify(this.sequence, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cutscene_${this.sequence.id || 'sequence'}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return jsonStr;
  }
}
