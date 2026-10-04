/**
 * BitQuest - Live Particle & Spell VFX Studio
 * Issue #30: Interactive particle and shader workbench for designing spell effects,
 * pot dust, slashes, and magic sparks with live preview against dark/meadow/cave backgrounds.
 */

import { ParticleConfigSchema, type ParticleConfig } from '../../../shared/src/schemas';

export const PRESET_PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  fireball_flame: {
    id: 'fireball_flame',
    name: 'Fireball Flame & Embers',
    blendMode: 'additive',
    colorStart: '#f59e0b',
    colorEnd: '#ef4444',
    sizeStart: 6,
    sizeEnd: 1,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    speedMin: 40,
    speedMax: 120,
    angleMin: 240,
    angleMax: 300,
    gravityX: 0,
    gravityY: -50,
    lifeMin: 350,
    lifeMax: 700,
    rate: 45,
    burstCount: 20
  },

  ice_shard: {
    id: 'ice_shard',
    name: 'Frost & Ice Shards',
    blendMode: 'additive',
    colorStart: '#e0f2fe',
    colorEnd: '#0284c7',
    sizeStart: 4,
    sizeEnd: 1,
    alphaStart: 0.9,
    alphaEnd: 0.0,
    speedMin: 60,
    speedMax: 160,
    angleMin: 0,
    angleMax: 360,
    gravityX: 0,
    gravityY: 70,
    lifeMin: 250,
    lifeMax: 500,
    rate: 35,
    burstCount: 25
  },

  pot_dust: {
    id: 'pot_dust',
    name: 'Clay Pot Shatter Dust',
    blendMode: 'normal',
    colorStart: '#d6c7b2',
    colorEnd: '#8c7e6c',
    sizeStart: 5,
    sizeEnd: 2,
    alphaStart: 0.85,
    alphaEnd: 0.0,
    speedMin: 80,
    speedMax: 200,
    angleMin: 0,
    angleMax: 360,
    gravityX: 0,
    gravityY: 120,
    lifeMin: 300,
    lifeMax: 650,
    rate: 0, // burst on impact
    burstCount: 30
  },

  slash_spark: {
    id: 'slash_spark',
    name: 'Sword Slash Impact Sparks',
    blendMode: 'additive',
    colorStart: '#fef08a',
    colorEnd: '#f59e0b',
    sizeStart: 5,
    sizeEnd: 1,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    speedMin: 140,
    speedMax: 320,
    angleMin: 180,
    angleMax: 360,
    gravityX: 0,
    gravityY: 90,
    lifeMin: 150,
    lifeMax: 350,
    rate: 0,
    burstCount: 24
  },

  heal_sparkle: {
    id: 'heal_sparkle',
    name: 'Divine Healing Radiance',
    blendMode: 'additive',
    colorStart: '#6ee7b7',
    colorEnd: '#10b981',
    sizeStart: 4,
    sizeEnd: 1,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    speedMin: 20,
    speedMax: 60,
    angleMin: 250,
    angleMax: 290,
    gravityX: 0,
    gravityY: -70,
    lifeMin: 500,
    lifeMax: 900,
    rate: 25,
    burstCount: 18
  },

  void_decay: {
    id: 'void_decay',
    name: 'Necrotic Void Decay',
    blendMode: 'normal',
    colorStart: '#a855f7',
    colorEnd: '#3b0764',
    sizeStart: 5,
    sizeEnd: 1,
    alphaStart: 0.9,
    alphaEnd: 0.0,
    speedMin: 30,
    speedMax: 90,
    angleMin: 0,
    angleMax: 360,
    gravityX: 0,
    gravityY: -20,
    lifeMin: 400,
    lifeMax: 800,
    rate: 30,
    burstCount: 20
  }
};

interface LiveParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sizeStart: number;
  sizeEnd: number;
  alphaStart: number;
  alphaEnd: number;
  rStart: number;
  gStart: number;
  bStart: number;
  rEnd: number;
  gEnd: number;
  bEnd: number;
}

export class VFXStudio {
  private config: ParticleConfig;
  private background: 'dark' | 'meadow' | 'cave' = 'dark';
  private emitterPos = { x: 200, y: 200 };

  // Particle memory pool (500 max particles)
  private readonly maxParticles = 600;
  private particles: LiveParticle[] = [];
  private activeCount: number = 0;

  // Animation timing
  private isSimulating: boolean = true;
  private animFrameId: any = null;
  private lastTime: number = 0;
  private spawnAccumulator: number = 0;

  // DOM
  private containerEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(containerId: string = 'vfx-studio-container') {
    this.config = JSON.parse(JSON.stringify(PRESET_PARTICLE_CONFIGS.fireball_flame));
    this.initPool();
    this.initDOM(containerId);
  }

  private initPool() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        sizeStart: 4,
        sizeEnd: 1,
        alphaStart: 1,
        alphaEnd: 0,
        rStart: 255,
        gStart: 255,
        bStart: 255,
        rEnd: 255,
        gEnd: 0,
        bEnd: 0
      });
    }
  }

  public initDOM(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.containerEl = container;

    container.innerHTML = `
      <div class="vfx-root" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: -apple-system, sans-serif;">
        <!-- Top Toolbar -->
        <div class="vfx-toolbar" style="background: #1e293b; border-bottom: 1px solid #334155; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: bold; color: #fbbf24; font-size: 13px;">✨ LIVE PARTICLE & SPELL VFX STUDIO</span>
            
            <select id="vfx-preset-select" class="btn" style="background: #0f172a; border: 1px solid #475569; padding: 4px 8px; font-size: 12px;">
              <option value="fireball_flame">🔥 Fireball Flame & Embers</option>
              <option value="ice_shard">❄️ Frost & Ice Shards</option>
              <option value="pot_dust">🏺 Clay Pot Shatter Dust</option>
              <option value="slash_spark">⚔️ Sword Slash Impact</option>
              <option value="heal_sparkle">💚 Divine Healing Radiance</option>
              <option value="void_decay">💀 Necrotic Void Decay</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8;">
              <span>Background:</span>
              <button class="btn btn-bg btn-primary" data-bg="dark">🌑 Dark</button>
              <button class="btn btn-bg" data-bg="meadow">🌿 Meadow</button>
              <button class="btn btn-bg" data-bg="cave">🪨 Cave</button>
            </div>

            <button id="btn-vfx-burst" class="btn btn-primary" style="font-size: 12px;">💥 Trigger Burst (Space)</button>
            <button id="btn-vfx-export" class="btn" style="border: 1px solid #10b981; color: #34d399;">📥 Export JSON</button>
            <button id="btn-vfx-import" class="btn" style="border: 1px solid #38bdf8; color: #38bdf8;">📤 Import JSON</button>
          </div>
        </div>

        <!-- Center Workspace -->
        <div style="display: flex; flex: 1; min-height: 0;">
          <!-- Viewport Canvas Area -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: auto; padding: 20px;">
            <div style="position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.85); border: 2px solid #334155; border-radius: 8px; overflow: hidden;">
              <canvas id="vfx-viewport-canvas" width="480" height="400" style="display: block; cursor: crosshair; image-rendering: pixelated;"></canvas>
            </div>

            <div style="margin-top: 10px; display: flex; gap: 16px; font-size: 11px; color: #94a3b8;">
              <span>Click or drag on canvas to relocate emitter or trigger sparks</span>
              <span>Active Particles: <strong id="label-active-count" style="color: #fbbf24;">0</strong></span>
            </div>
          </div>

          <!-- Parameter Control Sidebar -->
          <aside style="width: 340px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; overflow-y: auto; padding: 16px; gap: 14px;">
            <div>
              <h3 style="font-size: 13px; color: #fbbf24; margin-bottom: 8px;">⚙️ Emitter Parameters</h3>
              
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
                <!-- Blend Mode -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Blend Mode:</span>
                  <select id="input-blend" class="btn" style="font-size: 11px; padding: 2px 6px;">
                    <option value="additive">Additive (Lighter)</option>
                    <option value="normal">Normal (Source-Over)</option>
                    <option value="multiply">Multiply</option>
                  </select>
                </div>

                <!-- Colors -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Color Gradient:</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <input type="color" id="input-color-start" value="${this.config.colorStart}" style="width: 28px; height: 24px; border: none; border-radius: 4px; cursor: pointer;" />
                    <span>➔</span>
                    <input type="color" id="input-color-end" value="${this.config.colorEnd}" style="width: 28px; height: 24px; border: none; border-radius: 4px; cursor: pointer;" />
                  </div>
                </div>

                <!-- Size -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Size (Start ➔ End):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-size-start" value="${this.config.sizeStart}" min="1" max="24" style="width: 44px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>➔</span>
                    <input type="number" id="input-size-end" value="${this.config.sizeEnd}" min="0" max="24" style="width: 44px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Alpha -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Alpha (Start ➔ End):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-alpha-start" value="${this.config.alphaStart}" min="0" max="1" step="0.1" style="width: 44px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>➔</span>
                    <input type="number" id="input-alpha-end" value="${this.config.alphaEnd}" min="0" max="1" step="0.1" style="width: 44px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Lifetime -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Lifetime Min/Max (ms):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-life-min" value="${this.config.lifeMin}" min="50" max="3000" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>-</span>
                    <input type="number" id="input-life-max" value="${this.config.lifeMax}" min="50" max="3000" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Speed -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Speed Min/Max (px/s):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-speed-min" value="${this.config.speedMin}" min="0" max="800" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>-</span>
                    <input type="number" id="input-speed-max" value="${this.config.speedMax}" min="0" max="800" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Spread Angle -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Spread Angle (deg):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-angle-min" value="${this.config.angleMin}" min="0" max="360" style="width: 48px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>-</span>
                    <input type="number" id="input-angle-max" value="${this.config.angleMax}" min="0" max="360" style="width: 48px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Gravity -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Gravity (X / Y):</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="input-grav-x" value="${this.config.gravityX}" min="-400" max="400" style="width: 48px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                    <span>,</span>
                    <input type="number" id="input-grav-y" value="${this.config.gravityY}" min="-400" max="400" style="width: 48px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                  </div>
                </div>

                <!-- Rate & Burst -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Rate (particles/s):</span>
                  <input type="number" id="input-rate" value="${this.config.rate}" min="0" max="200" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Burst Count:</span>
                  <input type="number" id="input-burst" value="${this.config.burstCount}" min="1" max="100" style="width: 52px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 3px;" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.canvasEl = document.getElementById('vfx-viewport-canvas') as HTMLCanvasElement;
    if (this.canvasEl) {
      this.ctx = this.canvasEl.getContext('2d');
    }

    this.setupEvents();
    this.startSimulation();
  }

  private setupEvents() {
    if (!this.containerEl) return;

    // Presets
    const sel = this.containerEl.querySelector('#vfx-preset-select') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => {
      const p = PRESET_PARTICLE_CONFIGS[sel.value];
      if (p) this.loadConfig(p);
    });

    // Background buttons
    this.containerEl.querySelectorAll('.btn-bg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.containerEl?.querySelectorAll('.btn-bg').forEach(b => b.classList.remove('btn-primary'));
        (e.currentTarget as HTMLElement).classList.add('btn-primary');
        const bg = (e.currentTarget as HTMLElement).dataset.bg as 'dark' | 'meadow' | 'cave';
        this.setBackground(bg);
      });
    });

    // Burst trigger
    this.containerEl.querySelector('#btn-vfx-burst')?.addEventListener('click', () => {
      this.triggerBurst();
    });

    // Export & Import
    this.containerEl.querySelector('#btn-vfx-export')?.addEventListener('click', () => {
      this.exportJson();
    });
    this.containerEl.querySelector('#btn-vfx-import')?.addEventListener('click', () => {
      this.importJsonPrompt();
    });

    // Inputs wiring
    const bindInput = (id: string, key: keyof ParticleConfig, isNum = true) => {
      const el = this.containerEl?.querySelector(id) as HTMLInputElement | null;
      el?.addEventListener('change', () => {
        (this.config as any)[key] = isNum ? Number(el.value) : el.value;
      });
    };

    bindInput('#input-blend', 'blendMode', false);
    bindInput('#input-color-start', 'colorStart', false);
    bindInput('#input-color-end', 'colorEnd', false);
    bindInput('#input-size-start', 'sizeStart', true);
    bindInput('#input-size-end', 'sizeEnd', true);
    bindInput('#input-alpha-start', 'alphaStart', true);
    bindInput('#input-alpha-end', 'alphaEnd', true);
    bindInput('#input-life-min', 'lifeMin', true);
    bindInput('#input-life-max', 'lifeMax', true);
    bindInput('#input-speed-min', 'speedMin', true);
    bindInput('#input-speed-max', 'speedMax', true);
    bindInput('#input-angle-min', 'angleMin', true);
    bindInput('#input-angle-max', 'angleMax', true);
    bindInput('#input-grav-x', 'gravityX', true);
    bindInput('#input-grav-y', 'gravityY', true);
    bindInput('#input-rate', 'rate', true);
    bindInput('#input-burst', 'burstCount', true);

    // Canvas click & drag to move emitter
    if (this.canvasEl) {
      const setPos = (e: PointerEvent) => {
        const rect = this.canvasEl!.getBoundingClientRect();
        this.emitterPos = {
          x: Math.max(10, Math.min(this.canvasEl!.width - 10, e.clientX - rect.left)),
          y: Math.max(10, Math.min(this.canvasEl!.height - 10, e.clientY - rect.top))
        };
      };

      this.canvasEl.addEventListener('pointerdown', (e) => {
        setPos(e);
        this.triggerBurst();
      });
      this.canvasEl.addEventListener('pointermove', (e) => {
        if (e.buttons === 1) setPos(e);
      });
    }

    // Space key burst
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        this.triggerBurst();
      }
    });
  }

  public setBackground(bg: 'dark' | 'meadow' | 'cave') {
    this.background = bg;
  }

  public getBackground(): string {
    return this.background;
  }

  public loadConfig(cfg: ParticleConfig) {
    const validated = ParticleConfigSchema.parse(cfg);
    this.config = JSON.parse(JSON.stringify(validated));
    this.updateControlsUI();
  }

  public getConfig(): ParticleConfig {
    return this.config;
  }

  public updateConfig(partial: Partial<ParticleConfig>) {
    Object.assign(this.config, partial);
    this.updateControlsUI();
  }

  private updateControlsUI() {
    if (!this.containerEl) return;
    const setVal = (id: string, val: any) => {
      const el = this.containerEl?.querySelector(id) as HTMLInputElement | null;
      if (el) el.value = String(val);
    };

    setVal('#input-blend', this.config.blendMode);
    setVal('#input-color-start', this.config.colorStart);
    setVal('#input-color-end', this.config.colorEnd);
    setVal('#input-size-start', this.config.sizeStart);
    setVal('#input-size-end', this.config.sizeEnd);
    setVal('#input-alpha-start', this.config.alphaStart);
    setVal('#input-alpha-end', this.config.alphaEnd);
    setVal('#input-life-min', this.config.lifeMin);
    setVal('#input-life-max', this.config.lifeMax);
    setVal('#input-speed-min', this.config.speedMin);
    setVal('#input-speed-max', this.config.speedMax);
    setVal('#input-angle-min', this.config.angleMin);
    setVal('#input-angle-max', this.config.angleMax);
    setVal('#input-grav-x', this.config.gravityX);
    setVal('#input-grav-y', this.config.gravityY);
    setVal('#input-rate', this.config.rate);
    setVal('#input-burst', this.config.burstCount);
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  public spawnParticle(x?: number, y?: number) {
    const p = this.particles.find(pt => !pt.active);
    if (!p) return;

    const startX = x !== undefined ? x : this.emitterPos.x;
    const startY = y !== undefined ? y : this.emitterPos.y;

    // Angle & speed
    const deg = this.config.angleMin + Math.random() * (this.config.angleMax - this.config.angleMin);
    const rad = (deg * Math.PI) / 180;
    const speed = this.config.speedMin + Math.random() * (this.config.speedMax - this.config.speedMin);

    const life = this.config.lifeMin + Math.random() * (this.config.lifeMax - this.config.lifeMin);

    const cStart = this.parseHex(this.config.colorStart);
    const cEnd = this.parseHex(this.config.colorEnd);

    p.active = true;
    p.x = startX;
    p.y = startY;
    p.vx = Math.cos(rad) * speed;
    p.vy = Math.sin(rad) * speed;
    p.life = life;
    p.maxLife = life;
    p.sizeStart = this.config.sizeStart;
    p.sizeEnd = this.config.sizeEnd;
    p.alphaStart = this.config.alphaStart;
    p.alphaEnd = this.config.alphaEnd;
    p.rStart = cStart.r;
    p.gStart = cStart.g;
    p.bStart = cStart.b;
    p.rEnd = cEnd.r;
    p.gEnd = cEnd.g;
    p.bEnd = cEnd.b;
  }

  public triggerBurst(count?: number, x?: number, y?: number) {
    const num = count !== undefined ? count : this.config.burstCount;
    for (let i = 0; i < num; i++) {
      this.spawnParticle(x, y);
    }
  }

  public getActiveParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  // ----------------------------------------------------
  // Simulation Loop
  // ----------------------------------------------------
  public stopSimulation() {
    this.isSimulating = false;
    if (this.animFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private startSimulation() {
    this.isSimulating = true;
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isSimulating) {
        this.update(dt);
        this.render();
      }

      if (this.isSimulating && typeof requestAnimationFrame !== 'undefined') {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(loop);
    }
  }

  public update(dt: number) {
    // Spawn continuous rate
    if (this.config.rate > 0) {
      this.spawnAccumulator += dt * this.config.rate;
      while (this.spawnAccumulator >= 1.0) {
        this.spawnParticle();
        this.spawnAccumulator -= 1.0;
      }
    }

    let active = 0;
    const gx = this.config.gravityX;
    const gy = this.config.gravityY;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt * 1000;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vx += gx * dt;
      p.vy += gy * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      active++;
    }

    this.activeCount = active;
  }

  public render() {
    if (!this.canvasEl || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;

    // 1. Draw Background
    if (this.background === 'dark') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (this.background === 'meadow') {
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#388e3c';
      for (let x = 0; x < w; x += 24) {
        for (let y = 0; y < h; y += 24) {
          if ((x + y) % 48 === 0) ctx.fillRect(x, y, 12, 12);
        }
      }
    } else {
      // Cave
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#292524';
      for (let x = 0; x < w; x += 32) {
        for (let y = 0; y < h; y += 32) {
          if ((x * y) % 64 === 0) ctx.fillRect(x, y, 16, 16);
        }
      }
    }

    // 2. Set Composite Blend Mode
    if (this.config.blendMode === 'additive') {
      ctx.globalCompositeOperation = 'lighter';
    } else if (this.config.blendMode === 'multiply') {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    // 3. Render Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const progress = 1.0 - (p.life / p.maxLife); // 0.0 to 1.0
      const curSize = Math.max(0.5, p.sizeStart + (p.sizeEnd - p.sizeStart) * progress);
      const curAlpha = Math.max(0, Math.min(1, p.alphaStart + (p.alphaEnd - p.alphaStart) * progress));

      const r = Math.round(p.rStart + (p.rEnd - p.rStart) * progress);
      const g = Math.round(p.gStart + (p.gEnd - p.gStart) * progress);
      const b = Math.round(p.bStart + (p.bEnd - p.bStart) * progress);

      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${curAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // 4. Emitter Reticle
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(this.emitterPos.x, this.emitterPos.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Update Counter
    const label = this.containerEl?.querySelector('#label-active-count');
    if (label) label.textContent = String(this.activeCount);
  }

  // ----------------------------------------------------
  // Export & Import
  // ----------------------------------------------------
  public exportJson(skipPrompt: boolean = false): string {
    const json = JSON.stringify(this.config, null, 2);
    try {
      navigator.clipboard?.writeText?.(json).catch(() => {});
    } catch (_) {}
    if (!skipPrompt) {
      try {
        if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
          window.prompt('Particle Config JSON (Copied to Clipboard!):', json);
        }
      } catch (_) {}
    }
    return json;
  }

  public importJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = ParticleConfigSchema.parse(parsed);
      this.loadConfig(validated);
    } catch (e: any) {
      if (typeof window !== 'undefined' && typeof (window as any).alert === 'function') {
        (window as any).alert(`Invalid Particle Config JSON: ${e.message}`);
      }
      throw e;
    }
  }

  public importJsonPrompt() {
    const input = prompt('Paste Particle Config JSON:');
    if (input) this.importJson(input);
  }
}
