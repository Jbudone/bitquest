/**
 * BitQuest - Visual Keyframe, Hitbox & Hurtbox Timeline Editor Studio
 * Issue #29: Frame-by-frame animation scrubber, onion-skinning, colored bounding boxes,
 * audio/particle event cues, and Zod-validated JSON metadata export/import.
 */

import { TARGET_REGISTRY, drawPlaceholderPreview } from './placeholderDrawers';
import { sounds } from '../audio/SoundManager';
import {
  AnimationMetadataSchema,
  type AnimationMetadata,
  type AnimationKeyframe,
  type BoundingBox,
  type BoxType,
  type FrameEventAudioCue,
  type FrameEventParticleCue
} from '../../../shared/src/schemas';

export const PRESET_ANIMATIONS: Record<string, AnimationMetadata> = {
  player_slash_down: {
    id: 'player_slash_down',
    targetId: 'player_0',
    action: 'slash',
    direction: 'down',
    fps: 10,
    loop: true,
    frameWidth: 32,
    frameHeight: 32,
    totalFrames: 4,
    frames: [
      {
        frameIndex: 0,
        durationMs: 100,
        boxes: [
          { id: 'b_hurt_0', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_foot_0', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [],
        particleCues: []
      },
      {
        frameIndex: 1,
        durationMs: 100,
        boxes: [
          { id: 'b_hurt_1', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_hit_1', type: 'hitbox', x: 2, y: 18, width: 28, height: 14, damage: 12, knockback: 8 },
          { id: 'b_foot_1', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [{ soundId: 'slash', volume: 0.9 }],
        particleCues: [{ particleType: 'slash_spark', offsetX: 16, offsetY: 24, count: 4 }]
      },
      {
        frameIndex: 2,
        durationMs: 100,
        boxes: [
          { id: 'b_hurt_2', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_hit_2', type: 'hitbox', x: 4, y: 20, width: 24, height: 12, damage: 8, knockback: 4 },
          { id: 'b_foot_2', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [],
        particleCues: []
      },
      {
        frameIndex: 3,
        durationMs: 100,
        boxes: [
          { id: 'b_hurt_3', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_foot_3', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [],
        particleCues: []
      }
    ]
  },

  player_walk_down: {
    id: 'player_walk_down',
    targetId: 'player_0',
    action: 'walk',
    direction: 'down',
    fps: 8,
    loop: true,
    frameWidth: 32,
    frameHeight: 32,
    totalFrames: 4,
    frames: [
      {
        frameIndex: 0,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_0', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_foot_0', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [],
        particleCues: []
      },
      {
        frameIndex: 1,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_1', type: 'hurtbox', x: 8, y: 5, width: 16, height: 21 },
          { id: 'b_foot_1', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [{ soundId: 'step', volume: 0.5 }],
        particleCues: [{ particleType: 'dust_puff', offsetX: 12, offsetY: 28, count: 2 }]
      },
      {
        frameIndex: 2,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_2', type: 'hurtbox', x: 8, y: 6, width: 16, height: 20 },
          { id: 'b_foot_2', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [],
        particleCues: []
      },
      {
        frameIndex: 3,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_3', type: 'hurtbox', x: 8, y: 5, width: 16, height: 21 },
          { id: 'b_foot_3', type: 'footprint', x: 10, y: 22, width: 12, height: 8 }
        ],
        audioCues: [{ soundId: 'step', volume: 0.5 }],
        particleCues: [{ particleType: 'dust_puff', offsetX: 20, offsetY: 28, count: 2 }]
      }
    ]
  },

  slime_jump_attack: {
    id: 'slime_jump_attack',
    targetId: 'enemy_slime_blue',
    action: 'jump_attack',
    direction: 'down',
    fps: 8,
    loop: true,
    frameWidth: 32,
    frameHeight: 32,
    totalFrames: 4,
    frames: [
      {
        frameIndex: 0,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_0', type: 'hurtbox', x: 6, y: 14, width: 20, height: 14 },
          { id: 'b_foot_0', type: 'footprint', x: 8, y: 22, width: 16, height: 6 }
        ],
        audioCues: [],
        particleCues: []
      },
      {
        frameIndex: 1,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_1', type: 'hurtbox', x: 6, y: 6, width: 20, height: 18 },
          { id: 'b_hit_1', type: 'hitbox', x: 4, y: 6, width: 24, height: 20, damage: 6, knockback: 5 },
          { id: 'b_foot_1', type: 'footprint', x: 8, y: 22, width: 16, height: 6 }
        ],
        audioCues: [{ soundId: 'woosh', volume: 0.8 }],
        particleCues: [{ particleType: 'dust_puff', offsetX: 16, offsetY: 26, count: 3 }]
      },
      {
        frameIndex: 2,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_2', type: 'hurtbox', x: 4, y: 12, width: 24, height: 16 },
          { id: 'b_hit_2', type: 'hitbox', x: 2, y: 14, width: 28, height: 14, damage: 8, knockback: 6 },
          { id: 'b_foot_2', type: 'footprint', x: 8, y: 22, width: 16, height: 6 }
        ],
        audioCues: [{ soundId: 'hit', volume: 0.9 }],
        particleCues: [{ particleType: 'sparkle', offsetX: 16, offsetY: 20, count: 4 }]
      },
      {
        frameIndex: 3,
        durationMs: 125,
        boxes: [
          { id: 'b_hurt_3', type: 'hurtbox', x: 6, y: 16, width: 20, height: 12 },
          { id: 'b_foot_3', type: 'footprint', x: 8, y: 22, width: 16, height: 6 }
        ],
        audioCues: [],
        particleCues: []
      }
    ]
  },

  boss_spore_slam: {
    id: 'boss_spore_slam',
    targetId: 'boss_fungor',
    action: 'slam',
    direction: 'down',
    fps: 6,
    loop: true,
    frameWidth: 48,
    frameHeight: 48,
    totalFrames: 4,
    frames: [
      {
        frameIndex: 0,
        durationMs: 160,
        boxes: [
          { id: 'b_hurt_0', type: 'hurtbox', x: 10, y: 8, width: 28, height: 34 },
          { id: 'b_foot_0', type: 'footprint', x: 14, y: 36, width: 20, height: 10 }
        ],
        audioCues: [{ soundId: 'grunt', volume: 0.7 }],
        particleCues: []
      },
      {
        frameIndex: 1,
        durationMs: 160,
        boxes: [
          { id: 'b_hurt_1', type: 'hurtbox', x: 10, y: 4, width: 28, height: 38 },
          { id: 'b_foot_1', type: 'footprint', x: 14, y: 36, width: 20, height: 10 }
        ],
        audioCues: [{ soundId: 'woosh', volume: 1.0 }],
        particleCues: []
      },
      {
        frameIndex: 2,
        durationMs: 160,
        boxes: [
          { id: 'b_hurt_2', type: 'hurtbox', x: 10, y: 10, width: 28, height: 32 },
          { id: 'b_hit_2', type: 'hitbox', x: 2, y: 24, width: 44, height: 22, damage: 20, knockback: 14 },
          { id: 'b_foot_2', type: 'footprint', x: 14, y: 36, width: 20, height: 10 }
        ],
        audioCues: [{ soundId: 'hit', volume: 1.0 }],
        particleCues: [{ particleType: 'slash_spark', offsetX: 24, offsetY: 36, count: 8 }]
      },
      {
        frameIndex: 3,
        durationMs: 160,
        boxes: [
          { id: 'b_hurt_3', type: 'hurtbox', x: 10, y: 12, width: 28, height: 30 },
          { id: 'b_foot_3', type: 'footprint', x: 14, y: 36, width: 20, height: 10 }
        ],
        audioCues: [],
        particleCues: []
      }
    ]
  }
};

export class AnimatorStudio {
  private currentAnimation: AnimationMetadata;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;
  private animTimer: any = null;
  private lastTickTime: number = 0;

  // Viewport & Zoom
  private zoom: number = 8; // 8x pixel zoom (32px -> 256px)
  private showGrid: boolean = true;
  private showOnionSkin: boolean = true;
  private activeBoxType: BoxType = 'hitbox';
  private selectedBoxId: string | null = null;

  // Interaction Drag state
  private isDrawingBox: boolean = false;
  private drawStart: { x: number; y: number } | null = null;
  private currentDragPos: { x: number; y: number } | null = null;

  // DOM Elements
  private containerEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(containerId: string = 'animator-studio-container') {
    this.currentAnimation = JSON.parse(JSON.stringify(PRESET_ANIMATIONS.player_slash_down));
    this.initDOM(containerId);
  }

  public initDOM(containerId: string) {
    let container = document.getElementById(containerId);
    if (!container) return;
    this.containerEl = container;

    container.innerHTML = `
      <div class="animator-root" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #0b0f19; color: #f8fafc; font-family: -apple-system, sans-serif;">
        <!-- Top Toolbar -->
        <div class="animator-toolbar" style="background: #1e293b; border-bottom: 1px solid #334155; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: bold; color: #fbbf24; font-size: 13px;">🎞️ KEYFRAME & HITBOX STUDIO</span>
            
            <select id="anim-preset-select" class="btn" style="background: #0f172a; border: 1px solid #475569; padding: 4px 8px; font-size: 12px;">
              <option value="player_slash_down">Hero Sword Slash (Down)</option>
              <option value="player_walk_down">Hero Walk Cycle (Down)</option>
              <option value="slime_jump_attack">Blue Slime Jump Attack</option>
              <option value="boss_spore_slam">King Fungor Spore Slam</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-onion-skin" class="btn ${this.showOnionSkin ? 'btn-primary' : ''}" title="Toggle Onion Skinning">🧅 Onion Skin (${this.showOnionSkin ? 'ON' : 'OFF'})</button>
            <button id="btn-toggle-grid" class="btn" title="Toggle 1px Pixel Grid">🔲 Grid (${this.showGrid ? 'ON' : 'OFF'})</button>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8;">
              <span>Zoom:</span>
              <button class="btn btn-zoom" data-zoom="4">4x</button>
              <button class="btn btn-zoom btn-primary" data-zoom="8">8x</button>
              <button class="btn btn-zoom" data-zoom="12">12x</button>
            </div>
            <button id="btn-export-json" class="btn" style="border: 1px solid #10b981; color: #34d399;">📥 Export JSON</button>
            <button id="btn-import-json" class="btn" style="border: 1px solid #38bdf8; color: #38bdf8;">📤 Import JSON</button>
          </div>
        </div>

        <!-- Center Workspace -->
        <div style="display: flex; flex: 1; min-height: 0;">
          <!-- Left: Canvas Viewport -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #090d16; position: relative; overflow: auto; padding: 20px;">
            <div style="position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.8); border: 2px solid #334155; border-radius: 8px; background: #111827; padding: 8px;">
              <canvas id="anim-viewport-canvas" width="256" height="256" style="display: block; image-rendering: pixelated; cursor: crosshair;"></canvas>
            </div>

            <div style="margin-top: 12px; display: flex; gap: 16px; font-size: 11px;">
              <span style="color: #34d399; display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #10b981; display: inline-block; border-radius: 2px;"></span> Green: Body Hurtbox</span>
              <span style="color: #f87171; display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #ef4444; display: inline-block; border-radius: 2px;"></span> Red: Attack Hitbox</span>
              <span style="color: #60a5fa; display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #3b82f6; display: inline-block; border-radius: 2px;"></span> Blue: Ground Footprint</span>
            </div>
          </div>

          <!-- Right Sidebar: Properties & Event Cues -->
          <aside style="width: 320px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; overflow-y: auto; padding: 16px; gap: 16px;">
            <!-- Box Authoring Tools -->
            <div>
              <h3 style="font-size: 13px; color: #fbbf24; margin-bottom: 8px;">📦 Active Box Tool</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
                <button class="btn btn-box-type ${this.activeBoxType === 'hurtbox' ? 'btn-primary' : ''}" data-type="hurtbox" style="border-color: #10b981; font-size: 11px;">🟩 Hurtbox</button>
                <button class="btn btn-box-type ${this.activeBoxType === 'hitbox' ? 'btn-primary' : ''}" data-type="hitbox" style="border-color: #ef4444; font-size: 11px;">🟥 Hitbox</button>
                <button class="btn btn-box-type ${this.activeBoxType === 'footprint' ? 'btn-primary' : ''}" data-type="footprint" style="border-color: #3b82f6; font-size: 11px;">🟦 Footprint</button>
              </div>
              <p style="font-size: 10px; color: #94a3b8;">Click & drag on canvas to draw a box, or click an existing box to inspect.</p>
            </div>

            <!-- Bounding Boxes on Current Frame -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-size: 13px; color: #f8fafc;">Bounding Boxes (<span id="box-count">0</span>)</h3>
                <button id="btn-add-quick-box" class="btn" style="font-size: 10px; padding: 2px 6px;">+ Quick Add</button>
              </div>
              <div id="boxes-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;"></div>
            </div>

            <!-- Audio Cues on Current Frame -->
            <div style="border-top: 1px solid #334155; padding-top: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-size: 13px; color: #f8fafc;">🔊 Audio Event Cues</h3>
                <button id="btn-add-audio-cue" class="btn" style="font-size: 10px; padding: 2px 6px;">+ Add Sound</button>
              </div>
              <div id="audio-cues-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <!-- Particle VFX Cues on Current Frame -->
            <div style="border-top: 1px solid #334155; padding-top: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-size: 13px; color: #f8fafc;">✨ Particle VFX Cues</h3>
                <button id="btn-add-particle-cue" class="btn" style="font-size: 10px; padding: 2px 6px;">+ Add Particle</button>
              </div>
              <div id="particle-cues-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>
          </aside>
        </div>

        <!-- Bottom: Playback & Timeline Controls -->
        <div style="background: #1e293b; border-top: 1px solid #334155; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Controls bar -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="btn-step-prev" class="btn" title="Step Back (Left Arrow)">◀</button>
              <button id="btn-play-pause" class="btn btn-primary" style="width: 70px;">▶ Play</button>
              <button id="btn-step-next" class="btn" title="Step Forward (Right Arrow)">▶</button>
              <span id="label-frame-info" style="font-family: monospace; font-size: 12px; margin-left: 8px; color: #facc15;">Frame: 1 / 4</span>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span>FPS:</span>
                <input type="number" id="input-fps" min="1" max="60" value="${this.currentAnimation.fps}" style="width: 48px; background: #0f172a; border: 1px solid #475569; color: #fff; padding: 2px 4px; border-radius: 4px;" />
              </label>

              <button id="btn-add-frame" class="btn" style="font-size: 11px;">+ Add Frame</button>
              <button id="btn-duplicate-frame" class="btn" style="font-size: 11px;">📋 Duplicate</button>
              <button id="btn-delete-frame" class="btn" style="font-size: 11px; border-color: #ef4444; color: #fca5a5;">🗑️ Delete</button>
            </div>
          </div>

          <!-- Timeline Scrubber Track -->
          <div id="timeline-track" style="display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px; align-items: center;"></div>
        </div>
      </div>
    `;

    this.canvasEl = document.getElementById('anim-viewport-canvas') as HTMLCanvasElement;
    if (this.canvasEl) {
      this.ctx = this.canvasEl.getContext('2d');
    }

    this.setupEvents();
    this.render();
  }

  private setupEvents() {
    if (!this.containerEl) return;

    // Preset selector
    const sel = this.containerEl.querySelector('#anim-preset-select') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => {
      const preset = PRESET_ANIMATIONS[sel.value];
      if (preset) {
        this.loadAnimation(preset);
      }
    });

    // Onion skin
    const btnOnion = this.containerEl.querySelector('#btn-onion-skin');
    btnOnion?.addEventListener('click', () => {
      this.showOnionSkin = !this.showOnionSkin;
      btnOnion.textContent = `🧅 Onion Skin (${this.showOnionSkin ? 'ON' : 'OFF'})`;
      btnOnion.classList.toggle('btn-primary', this.showOnionSkin);
      this.render();
    });

    // Grid toggle
    const btnGrid = this.containerEl.querySelector('#btn-toggle-grid');
    btnGrid?.addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      btnGrid.textContent = `🔲 Grid (${this.showGrid ? 'ON' : 'OFF'})`;
      this.render();
    });

    // Zoom buttons
    this.containerEl.querySelectorAll('.btn-zoom').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.containerEl?.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('btn-primary'));
        (e.currentTarget as HTMLElement).classList.add('btn-primary');
        this.zoom = Number((e.currentTarget as HTMLElement).dataset.zoom || '8');
        this.updateCanvasSize();
        this.render();
      });
    });

    // Box type buttons
    this.containerEl.querySelectorAll('.btn-box-type').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.containerEl?.querySelectorAll('.btn-box-type').forEach(b => b.classList.remove('btn-primary'));
        (e.currentTarget as HTMLElement).classList.add('btn-primary');
        this.activeBoxType = (e.currentTarget as HTMLElement).dataset.type as BoxType;
      });
    });

    // Quick Add Box
    this.containerEl.querySelector('#btn-add-quick-box')?.addEventListener('click', () => {
      const f = this.getCurrentKeyframe();
      const newBox: BoundingBox = {
        id: `box_${Date.now()}`,
        type: this.activeBoxType,
        x: 8,
        y: 8,
        width: 16,
        height: 16,
        damage: this.activeBoxType === 'hitbox' ? 10 : undefined,
        knockback: this.activeBoxType === 'hitbox' ? 6 : undefined
      };
      f.boxes.push(newBox);
      this.selectedBoxId = newBox.id;
      this.render();
    });

    // Add Audio Cue
    this.containerEl.querySelector('#btn-add-audio-cue')?.addEventListener('click', () => {
      const f = this.getCurrentKeyframe();
      f.audioCues.push({ soundId: 'slash', volume: 1.0 });
      this.render();
    });

    // Add Particle Cue
    this.containerEl.querySelector('#btn-add-particle-cue')?.addEventListener('click', () => {
      const f = this.getCurrentKeyframe();
      f.particleCues.push({ particleType: 'slash_spark', offsetX: 16, offsetY: 16, count: 4 });
      this.render();
    });

    // Play / Pause
    const btnPlay = this.containerEl.querySelector('#btn-play-pause');
    btnPlay?.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    // Step navigation
    this.containerEl.querySelector('#btn-step-prev')?.addEventListener('click', () => {
      this.stepFrame(-1);
    });
    this.containerEl.querySelector('#btn-step-next')?.addEventListener('click', () => {
      this.stepFrame(1);
    });

    // FPS input
    const fpsInput = this.containerEl.querySelector('#input-fps') as HTMLInputElement | null;
    fpsInput?.addEventListener('change', () => {
      const val = Math.max(1, Math.min(60, Number(fpsInput.value) || 10));
      this.currentAnimation.fps = val;
    });

    // Add Frame
    this.containerEl.querySelector('#btn-add-frame')?.addEventListener('click', () => {
      const newFrame: AnimationKeyframe = {
        frameIndex: this.currentAnimation.frames.length,
        durationMs: Math.round(1000 / this.currentAnimation.fps),
        boxes: [],
        audioCues: [],
        particleCues: []
      };
      this.currentAnimation.frames.push(newFrame);
      this.currentAnimation.totalFrames = this.currentAnimation.frames.length;
      this.setFrame(this.currentAnimation.frames.length - 1);
    });

    // Duplicate Frame
    this.containerEl.querySelector('#btn-duplicate-frame')?.addEventListener('click', () => {
      const cur = this.getCurrentKeyframe();
      const dup: AnimationKeyframe = JSON.parse(JSON.stringify(cur));
      dup.frameIndex = this.currentAnimation.frames.length;
      this.currentAnimation.frames.push(dup);
      this.currentAnimation.totalFrames = this.currentAnimation.frames.length;
      this.setFrame(this.currentAnimation.frames.length - 1);
    });

    // Delete Frame
    this.containerEl.querySelector('#btn-delete-frame')?.addEventListener('click', () => {
      if (this.currentAnimation.frames.length <= 1) return;
      this.currentAnimation.frames.splice(this.currentFrameIndex, 1);
      this.currentAnimation.frames.forEach((f, idx) => f.frameIndex = idx);
      this.currentAnimation.totalFrames = this.currentAnimation.frames.length;
      this.setFrame(Math.max(0, this.currentFrameIndex - 1));
    });

    // Export JSON
    this.containerEl.querySelector('#btn-export-json')?.addEventListener('click', () => {
      this.exportJson();
    });

    // Import JSON
    this.containerEl.querySelector('#btn-import-json')?.addEventListener('click', () => {
      this.importJsonPrompt();
    });

    // Canvas Pointer events for interactive box drawing
    if (this.canvasEl) {
      this.canvasEl.addEventListener('pointerdown', (e) => this.onCanvasPointerDown(e));
      this.canvasEl.addEventListener('pointermove', (e) => this.onCanvasPointerMove(e));
      this.canvasEl.addEventListener('pointerup', (e) => this.onCanvasPointerUp(e));
    }
  }

  private updateCanvasSize() {
    if (!this.canvasEl) return;
    const w = this.currentAnimation.frameWidth * this.zoom;
    const h = this.currentAnimation.frameHeight * this.zoom;
    this.canvasEl.width = w;
    this.canvasEl.height = h;
  }

  public loadAnimation(metadata: AnimationMetadata) {
    const validated = AnimationMetadataSchema.parse(metadata);
    this.currentAnimation = JSON.parse(JSON.stringify(validated));
    this.currentFrameIndex = 0;
    this.updateCanvasSize();
    this.render();
  }

  public getAnimation(): AnimationMetadata {
    return this.currentAnimation;
  }

  public setFrame(index: number) {
    this.currentFrameIndex = Math.max(0, Math.min(this.currentAnimation.frames.length - 1, index));
    this.render();
    this.triggerFrameAudio();
  }

  public getCurrentFrame(): number {
    return this.currentFrameIndex;
  }

  public getCurrentKeyframe(): AnimationKeyframe {
    return this.currentAnimation.frames[this.currentFrameIndex];
  }

  public stepFrame(delta: number) {
    const len = this.currentAnimation.frames.length;
    let next = this.currentFrameIndex + delta;
    if (next >= len) next = 0;
    if (next < 0) next = len - 1;
    this.setFrame(next);
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const btn = this.containerEl?.querySelector('#btn-play-pause');
    if (btn) btn.textContent = '⏸ Pause';

    this.lastTickTime = performance.now();
    const tick = () => {
      if (!this.isPlaying) return;
      const now = performance.now();
      const interval = 1000 / this.currentAnimation.fps;
      if (now - this.lastTickTime >= interval) {
        this.stepFrame(1);
        this.lastTickTime = now;
      }
      this.animTimer = requestAnimationFrame(tick);
    };
    this.animTimer = requestAnimationFrame(tick);
  }

  public pause() {
    this.isPlaying = false;
    if (this.animTimer) {
      cancelAnimationFrame(this.animTimer);
      this.animTimer = null;
    }
    const btn = this.containerEl?.querySelector('#btn-play-pause');
    if (btn) btn.textContent = '▶ Play';
  }

  public toggleOnionSkinning(enable?: boolean) {
    this.showOnionSkin = enable !== undefined ? enable : !this.showOnionSkin;
    this.render();
  }

  private triggerFrameAudio() {
    const f = this.getCurrentKeyframe();
    if (!f || !f.audioCues || f.audioCues.length === 0) return;
    for (const cue of f.audioCues) {
      try {
        sounds.ensureContext();
        if (cue.soundId === 'slash') sounds.playSlash();
        else if (cue.soundId === 'hit') sounds.playHit();
        else if (cue.soundId === 'step') sounds.playStep('grass');
        else sounds.playCustom([1, 0, 300, 0.02, 0.05, 0.1, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.05]);
      } catch (_) {}
    }
  }

  // ----------------------------------------------------
  // Interactive Canvas Drawing & Bounding Box Logic
  // ----------------------------------------------------
  private getCanvasCoords(e: PointerEvent): { x: number; y: number } {
    if (!this.canvasEl) return { x: 0, y: 0 };
    const rect = this.canvasEl.getBoundingClientRect();
    const pixelX = Math.floor((e.clientX - rect.left) / this.zoom);
    const pixelY = Math.floor((e.clientY - rect.top) / this.zoom);
    return {
      x: Math.max(0, Math.min(this.currentAnimation.frameWidth, pixelX)),
      y: Math.max(0, Math.min(this.currentAnimation.frameHeight, pixelY))
    };
  }

  private onCanvasPointerDown(e: PointerEvent) {
    const coords = this.getCanvasCoords(e);
    const f = this.getCurrentKeyframe();

    // Check if clicked an existing box to select it
    const clickedBox = [...f.boxes].reverse().find(b =>
      coords.x >= b.x && coords.x <= b.x + b.width &&
      coords.y >= b.y && coords.y <= b.y + b.height
    );

    if (clickedBox) {
      this.selectedBoxId = clickedBox.id;
      this.render();
      return;
    }

    // Start drawing a new box
    this.isDrawingBox = true;
    this.drawStart = coords;
    this.currentDragPos = coords;
    this.selectedBoxId = null;
  }

  private onCanvasPointerMove(e: PointerEvent) {
    if (!this.isDrawingBox) return;
    this.currentDragPos = this.getCanvasCoords(e);
    this.render();
  }

  private onCanvasPointerUp(e: PointerEvent) {
    if (!this.isDrawingBox || !this.drawStart || !this.currentDragPos) {
      this.isDrawingBox = false;
      return;
    }

    const minX = Math.min(this.drawStart.x, this.currentDragPos.x);
    const minY = Math.min(this.drawStart.y, this.currentDragPos.y);
    const width = Math.max(2, Math.abs(this.currentDragPos.x - this.drawStart.x));
    const height = Math.max(2, Math.abs(this.currentDragPos.y - this.drawStart.y));

    if (width >= 2 && height >= 2) {
      const f = this.getCurrentKeyframe();
      const newBox: BoundingBox = {
        id: `box_${Date.now()}`,
        type: this.activeBoxType,
        x: minX,
        y: minY,
        width,
        height,
        damage: this.activeBoxType === 'hitbox' ? 10 : undefined,
        knockback: this.activeBoxType === 'hitbox' ? 6 : undefined
      };
      f.boxes.push(newBox);
      this.selectedBoxId = newBox.id;
    }

    this.isDrawingBox = false;
    this.drawStart = null;
    this.currentDragPos = null;
    this.render();
  }

  // ----------------------------------------------------
  // Canvas Rendering Loop
  // ----------------------------------------------------
  public render() {
    if (!this.canvasEl || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    const z = this.zoom;
    const fw = this.currentAnimation.frameWidth;
    const fh = this.currentAnimation.frameHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // 1. Onion Skinning (Previous frame in translucent ghost mode)
    if (this.showOnionSkin && this.currentAnimation.frames.length > 1) {
      const prevIdx = (this.currentFrameIndex - 1 + this.currentAnimation.frames.length) % this.currentAnimation.frames.length;
      const ghostCanvas = document.createElement('canvas');
      ghostCanvas.width = fw;
      ghostCanvas.height = fh;
      const ghostCtx = ghostCanvas.getContext('2d');
      if (ghostCtx) {
        drawPlaceholderPreview(this.currentAnimation.targetId, ghostCtx, fw, fh, 0, prevIdx);
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(ghostCanvas as any, 0, 0, fw * z, fh * z);
        ctx.restore();
      }
    }

    // 2. Active Frame Sprite
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = fw;
    frameCanvas.height = fh;
    const frameCtx = frameCanvas.getContext('2d');
    if (frameCtx) {
      drawPlaceholderPreview(this.currentAnimation.targetId, frameCtx, fw, fh, 0, this.currentFrameIndex);
      ctx.drawImage(frameCanvas as any, 0, 0, fw * z, fh * z);
    }

    // 3. Pixel Grid
    if (this.showGrid && z >= 4) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= fw; x++) {
        ctx.beginPath();
        ctx.moveTo(x * z, 0);
        ctx.lineTo(x * z, fh * z);
        ctx.stroke();
      }
      for (let y = 0; y <= fh; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * z);
        ctx.lineTo(fw * z, y * z);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Bounding Boxes on Current Frame
    const f = this.getCurrentKeyframe();
    if (f && f.boxes) {
      for (const box of f.boxes) {
        const isSelected = box.id === this.selectedBoxId;
        ctx.save();

        if (box.type === 'hurtbox') {
          // Green
          ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.2)';
          ctx.strokeStyle = '#10b981';
        } else if (box.type === 'hitbox') {
          // Red
          ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.25)';
          ctx.strokeStyle = '#ef4444';
        } else {
          // Blue Footprint
          ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.2)';
          ctx.strokeStyle = '#3b82f6';
        }

        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.fillRect(box.x * z, box.y * z, box.width * z, box.height * z);
        ctx.strokeRect(box.x * z, box.y * z, box.width * z, box.height * z);

        // Label tag
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        const tag = box.type === 'hitbox' && box.damage ? `ATK (${box.damage})` : box.type.toUpperCase();
        ctx.fillText(tag, box.x * z + 3, box.y * z + 10);

        ctx.restore();
      }
    }

    // 5. Active Drag Box Preview
    if (this.isDrawingBox && this.drawStart && this.currentDragPos) {
      const minX = Math.min(this.drawStart.x, this.currentDragPos.x);
      const minY = Math.min(this.drawStart.y, this.currentDragPos.y);
      const width = Math.abs(this.currentDragPos.x - this.drawStart.x);
      const height = Math.abs(this.currentDragPos.y - this.drawStart.y);

      ctx.save();
      ctx.strokeStyle = this.activeBoxType === 'hurtbox' ? '#10b981' : this.activeBoxType === 'hitbox' ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(minX * z, minY * z, width * z, height * z);
      ctx.strokeRect(minX * z, minY * z, width * z, height * z);
      ctx.restore();
    }

    // Update UI Panels
    this.updateTimelineUI();
    this.updateBoxesUI();
    this.updateAudioCuesUI();
    this.updateParticleCuesUI();
  }

  // ----------------------------------------------------
  // UI Panels Updaters
  // ----------------------------------------------------
  private updateTimelineUI() {
    if (!this.containerEl) return;
    const track = this.containerEl.querySelector('#timeline-track');
    const label = this.containerEl.querySelector('#label-frame-info');
    if (label) {
      label.textContent = `Frame: ${this.currentFrameIndex + 1} / ${this.currentAnimation.frames.length}`;
    }

    if (track) {
      track.innerHTML = '';
      this.currentAnimation.frames.forEach((f, idx) => {
        const isActive = idx === this.currentFrameIndex;
        const card = document.createElement('div');
        card.className = `timeline-frame-card ${isActive ? 'active' : ''}`;
        card.style.cssText = `
          width: 56px;
          height: 64px;
          background: ${isActive ? '#334155' : '#0f172a'};
          border: 2px solid ${isActive ? '#fbbf24' : '#334155'};
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 4px;
          cursor: pointer;
          user-select: none;
          flex-shrink: 0;
          transition: all 0.1s;
        `;

        const hasHit = f.boxes.some(b => b.type === 'hitbox');
        const hasHurt = f.boxes.some(b => b.type === 'hurtbox');
        const hasFoot = f.boxes.some(b => b.type === 'footprint');
        const hasAudio = f.audioCues.length > 0;
        const hasVfx = f.particleCues.length > 0;

        card.innerHTML = `
          <span style="font-size: 10px; font-weight: bold; color: ${isActive ? '#fbbf24' : '#94a3b8'};">F${idx + 1}</span>
          <div style="display: flex; gap: 2px; font-size: 8px;">
            ${hasHit ? '🟥' : ''}${hasHurt ? '🟩' : ''}${hasFoot ? '🟦' : ''}
          </div>
          <div style="display: flex; gap: 3px; font-size: 8px;">
            ${hasAudio ? '🔊' : ''}${hasVfx ? '✨' : ''}
          </div>
        `;

        card.addEventListener('click', () => {
          this.setFrame(idx);
        });

        track.appendChild(card);
      });
    }
  }

  private updateBoxesUI() {
    if (!this.containerEl) return;
    const list = this.containerEl.querySelector('#boxes-list');
    const count = this.containerEl.querySelector('#box-count');
    const f = this.getCurrentKeyframe();
    if (!list) return;

    if (count) count.textContent = String(f.boxes.length);
    list.innerHTML = '';

    if (f.boxes.length === 0) {
      list.innerHTML = `<span style="font-size: 11px; color: #64748b;">No boxes on this frame.</span>`;
      return;
    }

    f.boxes.forEach((box) => {
      const isSelected = box.id === this.selectedBoxId;
      const row = document.createElement('div');
      row.style.cssText = `
        background: ${isSelected ? '#334155' : '#0f172a'};
        border: 1px solid ${isSelected ? '#fbbf24' : '#334155'};
        border-radius: 4px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
      `;

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: ${box.type === 'hitbox' ? '#ef4444' : box.type === 'hurtbox' ? '#10b981' : '#3b82f6'};">
            ${box.type.toUpperCase()}
          </span>
          <button class="btn btn-del-box" style="padding: 1px 4px; font-size: 9px; color: #f87171;">✕</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 10px; color: #94a3b8;">
          <label>X:<input type="number" class="prop-x" value="${box.x}" style="width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
          <label>Y:<input type="number" class="prop-y" value="${box.y}" style="width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
          <label>W:<input type="number" class="prop-w" value="${box.width}" style="width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
          <label>H:<input type="number" class="prop-h" value="${box.height}" style="width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
        </div>
        ${box.type === 'hitbox' ? `
          <div style="display: flex; gap: 8px; font-size: 10px; color: #94a3b8; margin-top: 2px;">
            <label>Dmg:<input type="number" class="prop-dmg" value="${box.damage || 10}" style="width: 44px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
            <label>KB:<input type="number" class="prop-kb" value="${box.knockback || 5}" style="width: 44px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px;" /></label>
          </div>
        ` : ''}
      `;

      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).classList.contains('btn-del-box')) {
          this.selectedBoxId = box.id;
          this.render();
        }
      });

      row.querySelector('.btn-del-box')?.addEventListener('click', (e) => {
        e.stopPropagation();
        f.boxes = f.boxes.filter(b => b.id !== box.id);
        if (this.selectedBoxId === box.id) this.selectedBoxId = null;
        this.render();
      });

      row.querySelector('.prop-x')?.addEventListener('change', (e) => {
        box.x = Number((e.target as HTMLInputElement).value);
        this.render();
      });
      row.querySelector('.prop-y')?.addEventListener('change', (e) => {
        box.y = Number((e.target as HTMLInputElement).value);
        this.render();
      });
      row.querySelector('.prop-w')?.addEventListener('change', (e) => {
        box.width = Math.max(1, Number((e.target as HTMLInputElement).value));
        this.render();
      });
      row.querySelector('.prop-h')?.addEventListener('change', (e) => {
        box.height = Math.max(1, Number((e.target as HTMLInputElement).value));
        this.render();
      });
      if (box.type === 'hitbox') {
        row.querySelector('.prop-dmg')?.addEventListener('change', (e) => {
          box.damage = Number((e.target as HTMLInputElement).value);
          this.render();
        });
        row.querySelector('.prop-kb')?.addEventListener('change', (e) => {
          box.knockback = Number((e.target as HTMLInputElement).value);
          this.render();
        });
      }

      list.appendChild(row);
    });
  }

  private updateAudioCuesUI() {
    if (!this.containerEl) return;
    const list = this.containerEl.querySelector('#audio-cues-list');
    const f = this.getCurrentKeyframe();
    if (!list) return;
    list.innerHTML = '';

    if (f.audioCues.length === 0) {
      list.innerHTML = `<span style="font-size: 11px; color: #64748b;">No sound cues on this frame.</span>`;
      return;
    }

    f.audioCues.forEach((cue, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 4px;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        font-size: 11px;
      `;

      row.innerHTML = `
        <select class="cue-sound" style="background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px; font-size: 10px;">
          <option value="slash" ${cue.soundId === 'slash' ? 'selected' : ''}>slash</option>
          <option value="hit" ${cue.soundId === 'hit' ? 'selected' : ''}>hit</option>
          <option value="step" ${cue.soundId === 'step' ? 'selected' : ''}>step</option>
          <option value="woosh" ${cue.soundId === 'woosh' ? 'selected' : ''}>woosh</option>
          <option value="grunt" ${cue.soundId === 'grunt' ? 'selected' : ''}>grunt</option>
          <option value="secret" ${cue.soundId === 'secret' ? 'selected' : ''}>secret</option>
        </select>
        <button class="btn btn-test-audio" style="font-size: 9px; padding: 2px 4px;">▶</button>
        <button class="btn btn-del-cue" style="font-size: 9px; padding: 1px 4px; color: #f87171;">✕</button>
      `;

      row.querySelector('.cue-sound')?.addEventListener('change', (e) => {
        cue.soundId = (e.target as HTMLSelectElement).value;
        this.render();
      });

      row.querySelector('.btn-test-audio')?.addEventListener('click', () => {
        sounds.ensureContext();
        if (cue.soundId === 'slash') sounds.playSlash();
        else if (cue.soundId === 'hit') sounds.playHit();
        else if (cue.soundId === 'step') sounds.playStep('grass');
        else sounds.playCustom([1, 0, 300, 0.02, 0.05, 0.1, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.05]);
      });

      row.querySelector('.btn-del-cue')?.addEventListener('click', () => {
        f.audioCues.splice(idx, 1);
        this.render();
      });

      list.appendChild(row);
    });
  }

  private updateParticleCuesUI() {
    if (!this.containerEl) return;
    const list = this.containerEl.querySelector('#particle-cues-list');
    const f = this.getCurrentKeyframe();
    if (!list) return;
    list.innerHTML = '';

    if (f.particleCues.length === 0) {
      list.innerHTML = `<span style="font-size: 11px; color: #64748b;">No particle cues on this frame.</span>`;
      return;
    }

    f.particleCues.forEach((cue, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 4px;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        font-size: 11px;
      `;

      row.innerHTML = `
        <select class="cue-particle" style="background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 2px; font-size: 10px;">
          <option value="slash_spark" ${cue.particleType === 'slash_spark' ? 'selected' : ''}>slash_spark</option>
          <option value="dust_puff" ${cue.particleType === 'dust_puff' ? 'selected' : ''}>dust_puff</option>
          <option value="sparkle" ${cue.particleType === 'sparkle' ? 'selected' : ''}>sparkle</option>
          <option value="blood" ${cue.particleType === 'blood' ? 'selected' : ''}>blood</option>
          <option value="leaves" ${cue.particleType === 'leaves' ? 'selected' : ''}>leaves</option>
        </select>
        <span style="font-size: 9px; color: #94a3b8;">X:${cue.offsetX} Y:${cue.offsetY}</span>
        <button class="btn btn-del-vfx" style="font-size: 9px; padding: 1px 4px; color: #f87171;">✕</button>
      `;

      row.querySelector('.cue-particle')?.addEventListener('change', (e) => {
        cue.particleType = (e.target as HTMLSelectElement).value;
        this.render();
      });

      row.querySelector('.btn-del-vfx')?.addEventListener('click', () => {
        f.particleCues.splice(idx, 1);
        this.render();
      });

      list.appendChild(row);
    });
  }

  // ----------------------------------------------------
  // Export & Import Metadata
  // ----------------------------------------------------
  public exportJson(skipPrompt: boolean = false): string {
    const json = JSON.stringify(this.currentAnimation, null, 2);
    try {
      navigator.clipboard?.writeText?.(json).catch(() => {});
    } catch (_) {}
    if (!skipPrompt) {
      try {
        if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
          window.prompt('Animation Metadata JSON (Copied to Clipboard!):', json);
        }
      } catch (_) {}
    }
    return json;
  }

  public importJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = AnimationMetadataSchema.parse(parsed);
      this.loadAnimation(validated);
    } catch (e: any) {
      alert(`Invalid Animation Metadata JSON: ${e.message}`);
    }
  }

  public importJsonPrompt() {
    const input = prompt('Paste Animation Metadata JSON:');
    if (input) {
      this.importJson(input);
    }
  }
}
