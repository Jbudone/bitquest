/**
 * BitQuest - Studio-Grade 8-Bit Retro Chiptune & Procedural Foley Soundboard (Milestone 9.5)
 *
 * Provides:
 * 1. Web Audio API modular synthesizer with ADSR envelopes and waveform modeling.
 * 2. Pitch sweeps (linear/exponential), rapid arpeggiator intervals, and biquad filtering.
 * 3. Canonical 8-bit retro preset sound library (jump, slash, coin, hurt, fanfare, explosion, etc.).
 * 4. Dual visualizers: dynamic ADSR Envelope Curve canvas + Real-Time Oscilloscope.
 * 5. Zero-dependency TypeScript/JavaScript code generator for instant engine integration.
 * 6. Procedural sound parameter randomizer and JSON import/export.
 */

import {
  ChiptuneSoundDefSchema,
  type ChiptuneSoundDef,
  type SoundWaveform,
  type SoundFilterType,
  type SoundSweepType
} from '../../../shared/src/schemas';
import chiptunePresetsJson from '../../../shared/data/chiptunePresets.json';

export class SoundboardStudio {
  public root: HTMLElement | null = null;
  public presets: Record<string, ChiptuneSoundDef> = {};
  public currentSound: ChiptuneSoundDef;

  // Web Audio Context & Nodes
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isAudioPlaying = false;
  private animFrameId: number | null = null;

  // Canvas Viewports
  private adsrCanvas!: HTMLCanvasElement;
  private adsrCtx!: CanvasRenderingContext2D;
  private oscCanvas!: HTMLCanvasElement;
  private oscCtx!: CanvasRenderingContext2D;

  // DOM Elements
  private codePreviewEl!: HTMLPreElement;
  private durationBadgeEl!: HTMLElement;

  constructor(containerIdOrElement?: string | HTMLElement | null) {
    if (typeof containerIdOrElement === 'string') {
      this.root = typeof document !== 'undefined' ? document.getElementById(containerIdOrElement) : null;
    } else {
      this.root = containerIdOrElement || null;
    }

    // Load presets library
    this.presets = { ...(chiptunePresetsJson as any) };

    // Default to 'jump_classic' or first preset
    this.currentSound = {
      id: 'jump_classic',
      name: 'Classic 8-Bit Jump',
      category: 'action',
      waveform: 'square',
      startFreq: 150,
      endFreq: 450,
      slideDuration: 0.12,
      sweepType: 'exponential',
      attack: 0.005,
      decay: 0.08,
      sustain: 0.25,
      release: 0.08,
      filterType: 'none',
      filterCutoff: 8000,
      filterEndCutoff: 8000,
      filterQ: 1.0,
      arpeggioNotes: [],
      arpeggioSpeedMs: 50,
      volume: 0.75
    };

    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.resizeCanvases();
      this.render();
      this.updateCodePreview();
    }
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="soundboard-studio-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #080c14; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none;">
        
        <!-- Header Toolbar -->
        <header style="background: #111827; border-bottom: 1px solid #1f2937; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #38bdf8;">🔊 8-Bit Chiptune & Foley Soundboard</span>
            <div style="height: 16px; width: 1px; background: #374151; margin: 0 4px;"></div>
            <button id="sb-btn-play" class="btn btn-primary" style="font-size: 11px; padding: 4px 14px; background: #0284c7; border: 1px solid #38bdf8; font-weight: 600;" title="Shortcut: Spacebar">▶ Play Sound</button>
            <button id="sb-btn-random" class="btn" style="font-size: 11px; padding: 4px 10px; background: #1f2937; border: 1px solid #374151;">🎲 Randomize</button>
            <span id="sb-badge-duration" style="font-size: 10px; background: #1e293b; color: #94a3b8; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155;">Duration: 285ms</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="sb-btn-copy-code" class="btn" style="font-size: 11px; padding: 4px 10px; background: #1e293b; border: 1px solid #334155; color: #38bdf8;">📋 Copy TS Code</button>
            <button id="sb-btn-export-json" class="btn" style="font-size: 11px; padding: 4px 10px; background: #1e293b; border: 1px solid #334155;">💾 Export JSON</button>
            <label for="sb-file-import" class="btn" style="font-size: 11px; padding: 4px 10px; background: #1e293b; border: 1px solid #334155; cursor: pointer;">📂 Import JSON</label>
            <input type="file" id="sb-file-import" accept=".json" style="display: none;" />
          </div>
        </header>

        <!-- Main Body: 3-Column Studio Layout -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Column 1: Preset Soundboard Library (Left, 240px) -->
          <aside style="width: 240px; background: #0f172a; border-right: 1px solid #1f2937; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 10px; border-bottom: 1px solid #1f2937;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 6px 0;">Library Presets</h4>
              <select id="sb-category-filter" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px 6px; border-radius: 4px; font-size: 11px;">
                <option value="all">All Categories</option>
                <option value="action">Action</option>
                <option value="combat">Combat</option>
                <option value="jingle">Jingles & Jingles</option>
                <option value="ambient">Ambient / Foley</option>
              </select>
            </div>

            <div id="sb-preset-list" style="flex: 1; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 4px;">
              <!-- Rendered dynamically -->
            </div>
          </aside>

          <!-- Column 2: Visualizers & Synthesis Parameters (Center, flex: 1) -->
          <main style="flex: 1; background: #0b0f19; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px;">
            
            <!-- Dual Visualizers: ADSR Curve & Real-Time Oscilloscope -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 160px;">
              <!-- ADSR Envelope Visualizer -->
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 8px; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 600; color: #22c55e;">📈 ADSR Gain Envelope</span>
                  <span id="sb-adsr-readout" style="font-size: 9px; color: #94a3b8;">A: 5ms | D: 80ms | S: 25% | R: 80ms</span>
                </div>
                <canvas id="sb-canvas-adsr" style="flex: 1; width: 100%; height: 100%; background: #030712; border-radius: 4px;"></canvas>
              </div>

              <!-- Oscilloscope Waveform Visualizer -->
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 8px; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 600; color: #38bdf8;">🌊 Real-Time Oscilloscope</span>
                  <span id="sb-wave-label" style="font-size: 9px; color: #94a3b8;">Wave: SQUARE</span>
                </div>
                <canvas id="sb-canvas-osc" style="flex: 1; width: 100%; height: 100%; background: #030712; border-radius: 4px;"></canvas>
              </div>
            </div>

            <!-- Synthesizer Parameter Panels -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              
              <!-- Left Parameter Card: Waveform, Pitch & Sweep -->
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #38bdf8; margin: 0;">1. Oscillator & Pitch Sweep</h4>
                
                <div>
                  <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 4px;">Waveform Model:</label>
                  <div style="display: flex; gap: 4px;" id="sb-wave-buttons">
                    <button class="btn sb-wave-btn active" data-wave="square" style="flex: 1; font-size: 10px; padding: 4px;">Square ⎍</button>
                    <button class="btn sb-wave-btn" data-wave="sawtooth" style="flex: 1; font-size: 10px; padding: 4px;">Saw ⩘</button>
                    <button class="btn sb-wave-btn" data-wave="triangle" style="flex: 1; font-size: 10px; padding: 4px;">Tri △</button>
                    <button class="btn sb-wave-btn" data-wave="sine" style="flex: 1; font-size: 10px; padding: 4px;">Sine ∿</button>
                    <button class="btn sb-wave-btn" data-wave="noise" style="flex: 1; font-size: 10px; padding: 4px;">Noise ░</button>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Start Freq: <b id="val-startFreq" style="color: #fff;">150 Hz</b></label>
                    <input type="range" id="param-startFreq" min="40" max="3000" step="5" value="150" style="width: 100%; accent-color: #38bdf8;" />
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">End Freq: <b id="val-endFreq" style="color: #fff;">450 Hz</b></label>
                    <input type="range" id="param-endFreq" min="40" max="3000" step="5" value="450" style="width: 100%; accent-color: #38bdf8;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Slide Duration: <b id="val-slideDuration" style="color: #fff;">0.12s</b></label>
                    <input type="range" id="param-slideDuration" min="0" max="1.0" step="0.01" value="0.12" style="width: 100%; accent-color: #38bdf8;" />
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Sweep Curve:</label>
                    <select id="param-sweepType" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
                      <option value="none">None (Constant)</option>
                      <option value="linear">Linear Ramp</option>
                      <option value="exponential" selected>Exponential (Smooth)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Arpeggio Intervals (Semitones e.g. 0,4,7):</label>
                  <input type="text" id="param-arpeggioNotes" placeholder="e.g. 0, 4, 7 (leave empty for single tone)" value="" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px 6px; border-radius: 4px; font-size: 11px;" />
                </div>
              </div>

              <!-- Right Parameter Card: ADSR Envelopes, Filter & Master Volume -->
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #22c55e; margin: 0;">2. ADSR Envelope & Biquad Filter</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Attack (s): <b id="val-attack" style="color: #22c55e;">0.005s</b></label>
                    <input type="range" id="param-attack" min="0.001" max="0.5" step="0.002" value="0.005" style="width: 100%; accent-color: #22c55e;" />
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Decay (s): <b id="val-decay" style="color: #f59e0b;">0.08s</b></label>
                    <input type="range" id="param-decay" min="0.005" max="0.8" step="0.005" value="0.08" style="width: 100%; accent-color: #f59e0b;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Sustain Level: <b id="val-sustain" style="color: #38bdf8;">0.25</b></label>
                    <input type="range" id="param-sustain" min="0" max="1" step="0.02" value="0.25" style="width: 100%; accent-color: #38bdf8;" />
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Release (s): <b id="val-release" style="color: #a855f7;">0.08s</b></label>
                    <input type="range" id="param-release" min="0.005" max="1.2" step="0.01" value="0.08" style="width: 100%; accent-color: #a855f7;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Filter Type:</label>
                    <select id="param-filterType" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;">
                      <option value="none">None</option>
                      <option value="lowpass">Lowpass</option>
                      <option value="highpass">Highpass</option>
                      <option value="bandpass">Bandpass</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Cutoff (Hz):</label>
                    <input type="number" id="param-filterCutoff" min="100" max="18000" step="100" value="8000" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Resonance (Q):</label>
                    <input type="number" id="param-filterQ" min="0.1" max="20" step="0.5" value="1.0" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px;" />
                  </div>
                </div>

                <div>
                  <label style="font-size: 10px; color: #94a3b8;">Master Volume: <b id="val-volume" style="color: #fff;">75%</b></label>
                  <input type="range" id="param-volume" min="0" max="1" step="0.05" value="0.75" style="width: 100%; accent-color: #06b6d4;" />
                </div>
              </div>
            </div>
          </main>

          <!-- Column 3: Zero-Dependency Code Exporter (Right, 340px) -->
          <aside style="width: 340px; background: #0f172a; border-left: 1px solid #1f2937; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 10px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #38bdf8; margin: 0;">Zero-Dependency Code Export</h4>
              <span style="font-size: 9px; color: #94a3b8; background: #1e293b; padding: 2px 6px; border-radius: 4px;">Web Audio API</span>
            </div>
            
            <div style="flex: 1; padding: 10px; overflow-y: auto;">
              <pre id="sb-code-preview" style="margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 10px; line-height: 1.45; color: #a5f3fc; background: #030712; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; white-space: pre-wrap; word-break: break-all;"></pre>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.adsrCanvas = this.root.querySelector('#sb-canvas-adsr') as HTMLCanvasElement;
    this.adsrCtx = this.adsrCanvas.getContext('2d')!;
    this.oscCanvas = this.root.querySelector('#sb-canvas-osc') as HTMLCanvasElement;
    this.oscCtx = this.oscCanvas.getContext('2d')!;
    this.codePreviewEl = this.root.querySelector('#sb-code-preview') as HTMLPreElement;
    this.durationBadgeEl = this.root.querySelector('#sb-badge-duration') as HTMLElement;

    this.renderPresetList();
  }

  public resizeCanvases() {
    if (!this.adsrCanvas || !this.oscCanvas) return;
    const rectA = this.adsrCanvas.getBoundingClientRect();
    if (rectA.width > 0) {
      this.adsrCanvas.width = rectA.width * (window.devicePixelRatio || 1);
      this.adsrCanvas.height = rectA.height * (window.devicePixelRatio || 1);
    } else {
      this.adsrCanvas.width = 400;
      this.adsrCanvas.height = 140;
    }

    const rectO = this.oscCanvas.getBoundingClientRect();
    if (rectO.width > 0) {
      this.oscCanvas.width = rectO.width * (window.devicePixelRatio || 1);
      this.oscCanvas.height = rectO.height * (window.devicePixelRatio || 1);
    } else {
      this.oscCanvas.width = 400;
      this.oscCanvas.height = 140;
    }
  }

  public onTabActivated() {
    this.resizeCanvases();
    this.render();
  }

  // -------------------------------------------------------------------------
  // Preset List Rendering
  // -------------------------------------------------------------------------
  private renderPresetList(categoryFilter: string = 'all') {
    if (!this.root) return;
    const listEl = this.root.querySelector('#sb-preset-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const entries = Object.values(this.presets);

    for (const preset of entries) {
      if (categoryFilter !== 'all' && preset.category !== categoryFilter) continue;

      const isSelected = preset.id === this.currentSound.id;
      const btn = document.createElement('button');
      btn.className = `btn ${isSelected ? 'btn-primary' : ''}`;
      btn.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        font-size: 11px;
        text-align: left;
        background: ${isSelected ? '#0284c7' : '#1e293b'};
        border: 1px solid ${isSelected ? '#38bdf8' : '#334155'};
        border-radius: 4px;
        color: #f8fafc;
        cursor: pointer;
        width: 100%;
      `;

      let icon = '🔊';
      if (preset.category === 'combat') icon = '⚔️';
      else if (preset.category === 'jingle') icon = '🎺';
      else if (preset.category === 'ambient') icon = '🍃';
      else if (preset.category === 'action') icon = '⚡';

      btn.innerHTML = `
        <span style="font-weight: 500;">${icon} ${preset.name}</span>
        <span style="font-size: 9px; opacity: 0.75; text-transform: uppercase;">${preset.waveform}</span>
      `;

      btn.addEventListener('click', () => {
        this.loadPreset(preset.id);
        this.playSound();
      });

      listEl.appendChild(btn);
    }
  }

  // -------------------------------------------------------------------------
  // Preset Management
  // -------------------------------------------------------------------------
  public loadPreset(id: string) {
    const found = this.presets[id];
    if (found) {
      this.currentSound = JSON.parse(JSON.stringify(found));
      this.syncInputsFromState();
      this.render();
      this.updateCodePreview();
      this.renderPresetList((this.root?.querySelector('#sb-category-filter') as HTMLSelectElement)?.value || 'all');
    }
  }

  public syncInputsFromState() {
    if (!this.root) return;
    const s = this.currentSound;

    // Wave buttons
    this.root.querySelectorAll('.sb-wave-btn').forEach(btn => {
      const w = btn.getAttribute('data-wave');
      if (w === s.waveform) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const setVal = (id: string, val: any) => {
      const el = this.root?.querySelector(`#param-${id}`) as HTMLInputElement | HTMLSelectElement;
      if (el) el.value = val.toString();
      const valEl = this.root?.querySelector(`#val-${id}`);
      if (valEl) valEl.textContent = typeof val === 'number' ? (id.includes('Freq') ? `${val} Hz` : id === 'volume' ? `${Math.round(val * 100)}%` : `${val}s`) : val;
    };

    setVal('startFreq', s.startFreq);
    setVal('endFreq', s.endFreq);
    setVal('slideDuration', s.slideDuration);
    setVal('sweepType', s.sweepType);
    setVal('attack', s.attack);
    setVal('decay', s.decay);
    setVal('sustain', s.sustain);
    setVal('release', s.release);
    setVal('filterType', s.filterType);
    setVal('filterCutoff', s.filterCutoff);
    setVal('filterQ', s.filterQ);
    setVal('volume', s.volume);

    const arpEl = this.root.querySelector('#param-arpeggioNotes') as HTMLInputElement;
    if (arpEl) arpEl.value = s.arpeggioNotes.join(', ');

    const waveLabel = this.root.querySelector('#sb-wave-label');
    if (waveLabel) waveLabel.textContent = `Wave: ${s.waveform.toUpperCase()}`;

    const totalDur = this.calculateTotalDurationMs();
    if (this.durationBadgeEl) this.durationBadgeEl.textContent = `Duration: ${Math.round(totalDur)}ms`;
  }

  public calculateTotalDurationMs(): number {
    const s = this.currentSound;
    const noteHoldTime = Math.max(s.slideDuration, 0.05);
    const totalSec = s.attack + s.decay + noteHoldTime + s.release;
    return totalSec * 1000;
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root) return;

    // Play button
    this.root.querySelector('#sb-btn-play')?.addEventListener('click', () => {
      this.playSound();
    });

    // Spacebar listener for instant playback
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        this.playSound();
      }
    });

    // Randomize button
    this.root.querySelector('#sb-btn-random')?.addEventListener('click', () => {
      this.randomizeSound();
      this.playSound();
    });

    // Category filter
    this.root.querySelector('#sb-category-filter')?.addEventListener('change', (e) => {
      this.renderPresetList((e.target as HTMLSelectElement).value);
    });

    // Waveform buttons
    this.root.querySelectorAll('.sb-wave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wave = (e.currentTarget as HTMLElement).getAttribute('data-wave') as SoundWaveform;
        this.currentSound.waveform = wave;
        this.syncInputsFromState();
        this.render();
        this.updateCodePreview();
        this.playSound();
      });
    });

    // Parameter sliders & inputs
    const bindSlider = (id: string, key: keyof ChiptuneSoundDef, isFloat = true, formatSuffix = 's') => {
      const el = this.root?.querySelector(`#param-${id}`) as HTMLInputElement;
      if (!el) return;
      el.addEventListener('input', () => {
        const val = isFloat ? parseFloat(el.value) : parseInt(el.value, 10);
        (this.currentSound as any)[key] = val;
        const valEl = this.root?.querySelector(`#val-${id}`);
        if (valEl) {
          if (id === 'volume') valEl.textContent = `${Math.round(val * 100)}%`;
          else if (id.includes('Freq')) valEl.textContent = `${val} Hz`;
          else valEl.textContent = `${val}${formatSuffix}`;
        }
        this.render();
        this.updateCodePreview();
      });
    };

    bindSlider('startFreq', 'startFreq', false, ' Hz');
    bindSlider('endFreq', 'endFreq', false, ' Hz');
    bindSlider('slideDuration', 'slideDuration', true, 's');
    bindSlider('attack', 'attack', true, 's');
    bindSlider('decay', 'decay', true, 's');
    bindSlider('sustain', 'sustain', true, '');
    bindSlider('release', 'release', true, 's');
    bindSlider('volume', 'volume', true, '');
    bindSlider('filterCutoff', 'filterCutoff', false, ' Hz');
    bindSlider('filterQ', 'filterQ', true, '');

    // Selects
    this.root.querySelector('#param-sweepType')?.addEventListener('change', (e) => {
      this.currentSound.sweepType = (e.target as HTMLSelectElement).value as SoundSweepType;
      this.updateCodePreview();
    });

    this.root.querySelector('#param-filterType')?.addEventListener('change', (e) => {
      this.currentSound.filterType = (e.target as HTMLSelectElement).value as SoundFilterType;
      this.updateCodePreview();
    });

    // Arpeggio notes text input
    this.root.querySelector('#param-arpeggioNotes')?.addEventListener('change', (e) => {
      const raw = (e.target as HTMLInputElement).value;
      const notes = raw
        .split(',')
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));
      this.currentSound.arpeggioNotes = notes;
      this.updateCodePreview();
    });

    // Copy TS Code
    this.root.querySelector('#sb-btn-copy-code')?.addEventListener('click', () => {
      const code = this.generateZeroDependencyCode();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(code);
        const btn = this.root?.querySelector('#sb-btn-copy-code') as HTMLElement;
        if (btn) {
          const original = btn.textContent;
          btn.textContent = '✅ Copied!';
          setTimeout(() => { btn.textContent = original; }, 1500);
        }
      }
    });

    // Export JSON
    this.root.querySelector('#sb-btn-export-json')?.addEventListener('click', () => {
      this.exportPresetJSON();
    });

    // Import JSON
    const fileInput = this.root.querySelector('#sb-file-import') as HTMLInputElement;
    fileInput?.addEventListener('change', (e) => {
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

  // -------------------------------------------------------------------------
  // Web Audio Synthesizer Runtime
  // -------------------------------------------------------------------------
  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.masterGain && this.audioCtx) {
      this.masterGain = this.audioCtx.createGain();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  public playSound(): boolean {
    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    const s = this.currentSound;
    const now = ctx.currentTime;
    const totalDurationSec = (s.attack + s.decay + Math.max(s.slideDuration, 0.05) + s.release);

    // Gain node for ADSR
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);

    // Attack
    const attackTime = Math.max(0.002, s.attack);
    gainNode.gain.linearRampToValueAtTime(s.volume, now + attackTime);

    // Decay to sustain
    const decayTime = Math.max(0.002, s.decay);
    const sustainLevel = Math.max(0.0001, s.sustain * s.volume);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

    // Hold sustain until release begins
    const holdEnd = now + attackTime + decayTime + Math.max(s.slideDuration, 0.02);
    gainNode.gain.setValueAtTime(sustainLevel, holdEnd);

    // Release
    const releaseTime = Math.max(0.005, s.release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, holdEnd + releaseTime);

    // Optional Filter
    let targetNode: AudioNode = gainNode;
    let filterNode: BiquadFilterNode | null = null;

    if (s.filterType !== 'none') {
      filterNode = ctx.createBiquadFilter();
      filterNode.type = s.filterType;
      filterNode.frequency.setValueAtTime(s.filterCutoff, now);
      if (s.filterEndCutoff && s.filterEndCutoff !== s.filterCutoff) {
        filterNode.frequency.exponentialRampToValueAtTime(
          Math.max(20, s.filterEndCutoff),
          now + totalDurationSec
        );
      }
      filterNode.Q.setValueAtTime(s.filterQ, now);
      gainNode.connect(filterNode);
      targetNode = filterNode;
    }

    targetNode.connect(this.masterGain || ctx.destination);

    // Sound Source Generation
    if (s.waveform === 'noise') {
      // Noise Buffer
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * totalDurationSec);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.connect(gainNode);
      noiseSource.start(now);
      noiseSource.stop(now + totalDurationSec);
    } else {
      // Oscillator Source
      const osc = ctx.createOscillator();
      osc.type = s.waveform;
      osc.frequency.setValueAtTime(s.startFreq, now);

      // Pitch sweep
      if (s.sweepType === 'linear' && s.slideDuration > 0) {
        osc.frequency.linearRampToValueAtTime(s.endFreq, now + s.slideDuration);
      } else if (s.sweepType === 'exponential' && s.slideDuration > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.endFreq), now + s.slideDuration);
      }

      // Arpeggiator note sequencing
      if (s.arpeggioNotes.length > 0) {
        const stepSec = s.arpeggioSpeedMs / 1000;
        let timeOffset = 0;
        let noteIdx = 0;
        while (timeOffset < totalDurationSec) {
          const semitone = s.arpeggioNotes[noteIdx % s.arpeggioNotes.length];
          const freqMultiplier = Math.pow(2, semitone / 12);
          const baseFreq = s.sweepType === 'none' ? s.startFreq : s.startFreq + (s.endFreq - s.startFreq) * (timeOffset / totalDurationSec);
          osc.frequency.setValueAtTime(baseFreq * freqMultiplier, now + timeOffset);
          timeOffset += stepSec;
          noteIdx++;
        }
      }

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + totalDurationSec);
    }

    this.isAudioPlaying = true;
    this.startOscilloscopeAnimation();

    setTimeout(() => {
      this.isAudioPlaying = false;
    }, totalDurationSec * 1000);

    return true;
  }

  // -------------------------------------------------------------------------
  // Visualizers (ADSR Curve & Oscilloscope)
  // -------------------------------------------------------------------------
  public render() {
    this.renderADSRCurve();
    this.renderOscilloscopeStatic();
  }

  private renderADSRCurve() {
    if (!this.adsrCanvas || !this.adsrCtx) return;
    const ctx = this.adsrCtx;
    const W = this.adsrCanvas.width;
    const H = this.adsrCanvas.height;
    const s = this.currentSound;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const padding = 16;
    const plotW = W - padding * 2;
    const plotH = H - padding * 2;

    const totalDur = s.attack + s.decay + 0.15 + s.release;
    const x0 = padding;
    const x1 = padding + (s.attack / totalDur) * plotW;
    const x2 = x1 + (s.decay / totalDur) * plotW;
    const x3 = x2 + (0.15 / totalDur) * plotW;
    const x4 = x3 + (s.release / totalDur) * plotW;

    const yBottom = H - padding;
    const yTop = padding;
    const ySustain = yBottom - (s.sustain * plotH);

    // Gradient fill under curve
    const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');

    ctx.beginPath();
    ctx.moveTo(x0, yBottom);
    ctx.lineTo(x1, yTop);       // Attack
    ctx.lineTo(x2, ySustain);   // Decay
    ctx.lineTo(x3, ySustain);   // Sustain
    ctx.lineTo(x4, yBottom);    // Release
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Attack Line (Green)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, yBottom);
    ctx.lineTo(x1, yTop);
    ctx.stroke();

    // Decay Line (Orange)
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x1, yTop);
    ctx.lineTo(x2, ySustain);
    ctx.stroke();

    // Sustain Line (Sky Blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(x2, ySustain);
    ctx.lineTo(x3, ySustain);
    ctx.stroke();

    // Release Line (Purple)
    ctx.strokeStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(x3, ySustain);
    ctx.lineTo(x4, yBottom);
    ctx.stroke();

    // Segment Markers
    const drawPoint = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawPoint(x1, yTop, '#22c55e');
    drawPoint(x2, ySustain, '#f59e0b');
    drawPoint(x3, ySustain, '#38bdf8');
    drawPoint(x4, yBottom, '#a855f7');

    // Update readout badge
    const readoutEl = this.root?.querySelector('#sb-adsr-readout');
    if (readoutEl) {
      readoutEl.textContent = `A: ${Math.round(s.attack * 1000)}ms | D: ${Math.round(s.decay * 1000)}ms | S: ${Math.round(s.sustain * 100)}% | R: ${Math.round(s.release * 1000)}ms`;
    }
  }

  private renderOscilloscopeStatic() {
    if (!this.oscCanvas || !this.oscCtx) return;
    const ctx = this.oscCtx;
    const W = this.oscCanvas.width;
    const H = this.oscCanvas.height;
    const s = this.currentSound;

    ctx.clearRect(0, 0, W, H);

    // Center guideline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Draw simulated waveform
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const cycles = 5;
    for (let x = 0; x < W; x++) {
      const t = (x / W) * cycles * Math.PI * 2;
      let yNorm = 0;

      if (s.waveform === 'sine') {
        yNorm = Math.sin(t);
      } else if (s.waveform === 'square') {
        yNorm = Math.sin(t) >= 0 ? 0.75 : -0.75;
      } else if (s.waveform === 'sawtooth') {
        yNorm = ((t % (Math.PI * 2)) / Math.PI) - 1;
      } else if (s.waveform === 'triangle') {
        yNorm = 2 * Math.abs(2 * ((t / (Math.PI * 2)) - Math.floor((t / (Math.PI * 2)) + 0.5))) - 1;
      } else if (s.waveform === 'noise') {
        yNorm = (Math.random() * 2 - 1) * 0.7;
      }

      const y = (H / 2) + yNorm * (H / 2.6) * s.volume;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private startOscilloscopeAnimation() {
    if (!this.analyser || !this.oscCanvas || !this.oscCtx) return;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawLive = () => {
      if (!this.isAudioPlaying) {
        this.renderOscilloscopeStatic();
        return;
      }

      this.analyser!.getByteTimeDomainData(dataArray);
      const ctx = this.oscCtx;
      const W = this.oscCanvas.width;
      const H = this.oscCanvas.height;

      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const sliceWidth = W / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * H) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(W, H / 2);
      ctx.stroke();

      this.animFrameId = requestAnimationFrame(drawLive);
    };

    drawLive();
  }

  // -------------------------------------------------------------------------
  // Zero-Dependency Code Generator
  // -------------------------------------------------------------------------
  public generateZeroDependencyCode(): string {
    const s = this.currentSound;
    const funcName = 'play' + s.name.replace(/[^a-zA-Z0-9]/g, '');
    const isNoise = s.waveform === 'noise';

    const hasFilter = s.filterType !== 'none';
    const hasSweep = s.sweepType !== 'none' && s.slideDuration > 0 && !isNoise;
    const hasArp = s.arpeggioNotes.length > 0 && !isNoise;

    return `/**
 * Procedural Retro Sound: "${s.name}"
 * Category: ${s.category.toUpperCase()} | Waveform: ${s.waveform.toUpperCase()}
 * Zero dependencies - pure Web Audio API.
 */
export function ${funcName}(ctx: AudioContext, destination: AudioNode = ctx.destination) {
  const now = ctx.currentTime;
  const attack = ${s.attack};
  const decay = ${s.decay};
  const sustain = ${s.sustain};
  const release = ${s.release};
  const volume = ${s.volume};
  const noteDuration = ${Math.max(s.slideDuration, 0.05)};
  const totalDuration = attack + decay + noteDuration + release;

  // ADSR Gain Envelope
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + Math.max(0.002, attack));
  gainNode.gain.linearRampToValueAtTime(Math.max(0.0001, sustain * volume), now + attack + decay);
  gainNode.gain.setValueAtTime(Math.max(0.0001, sustain * volume), now + attack + decay + noteDuration);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

  ${
    hasFilter
      ? `// Biquad Filter (${s.filterType})
  const filter = ctx.createBiquadFilter();
  filter.type = '${s.filterType}';
  filter.frequency.setValueAtTime(${s.filterCutoff}, now);
  ${s.filterEndCutoff && s.filterEndCutoff !== s.filterCutoff ? `filter.frequency.exponentialRampToValueAtTime(${s.filterEndCutoff}, now + totalDuration);` : ''}
  filter.Q.setValueAtTime(${s.filterQ}, now);
  gainNode.connect(filter);
  filter.connect(destination);`
      : `gainNode.connect(destination);`
  }

  ${
    isNoise
      ? `// Procedural White Noise Buffer
  const bufferSize = Math.floor(ctx.sampleRate * totalDuration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.connect(gainNode);
  noise.start(now);
  noise.stop(now + totalDuration);`
      : `// Oscillator
  const osc = ctx.createOscillator();
  osc.type = '${s.waveform}';
  osc.frequency.setValueAtTime(${s.startFreq}, now);
  ${
    hasSweep
      ? s.sweepType === 'linear'
        ? `osc.frequency.linearRampToValueAtTime(${s.endFreq}, now + ${s.slideDuration});`
        : `osc.frequency.exponentialRampToValueAtTime(${Math.max(20, s.endFreq)}, now + ${s.slideDuration});`
      : ''
  }
  ${
    hasArp
      ? `// Arpeggio note sequence: [${s.arpeggioNotes.join(', ')}]
  const semitones = [${s.arpeggioNotes.join(', ')}];
  const stepSec = ${s.arpeggioSpeedMs / 1000};
  let tOffset = 0, nIdx = 0;
  while (tOffset < totalDuration) {
    const mult = Math.pow(2, semitones[nIdx % semitones.length] / 12);
    osc.frequency.setValueAtTime(${s.startFreq} * mult, now + tOffset);
    tOffset += stepSec;
    nIdx++;
  }`
      : ''
  }

  osc.connect(gainNode);
  osc.start(now);
  osc.stop(now + totalDuration);`
  }
}`;
  }

  public updateCodePreview() {
    if (!this.codePreviewEl) return;
    this.codePreviewEl.textContent = this.generateZeroDependencyCode();
  }

  // -------------------------------------------------------------------------
  // Randomizer & Import/Export
  // -------------------------------------------------------------------------
  public randomizeSound() {
    const waves: SoundWaveform[] = ['square', 'sawtooth', 'triangle', 'noise'];
    const sweepTypes: SoundSweepType[] = ['none', 'linear', 'exponential'];
    const filterTypes: SoundFilterType[] = ['none', 'lowpass', 'bandpass'];

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    this.currentSound.waveform = pick(waves);
    this.currentSound.startFreq = Math.round(rand(100, 1500));
    this.currentSound.endFreq = Math.round(rand(60, 2000));
    this.currentSound.slideDuration = Math.round(rand(0.02, 0.35) * 100) / 100;
    this.currentSound.sweepType = pick(sweepTypes);
    this.currentSound.attack = Math.round(rand(0.002, 0.05) * 1000) / 1000;
    this.currentSound.decay = Math.round(rand(0.04, 0.3) * 100) / 100;
    this.currentSound.sustain = Math.round(rand(0.05, 0.6) * 100) / 100;
    this.currentSound.release = Math.round(rand(0.04, 0.35) * 100) / 100;
    this.currentSound.filterType = pick(filterTypes);
    this.currentSound.filterCutoff = Math.round(rand(800, 12000));
    this.currentSound.filterQ = Math.round(rand(1, 8) * 10) / 10;
    this.currentSound.arpeggioNotes = Math.random() < 0.3 ? [0, 4, 7] : [];

    this.syncInputsFromState();
    this.render();
    this.updateCodePreview();
  }

  public exportPresetJSON(): string {
    const jsonStr = JSON.stringify(this.currentSound, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sfx_${this.currentSound.id || 'preset'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return jsonStr;
  }

  public importPresetJSON(jsonStr: string): boolean {
    try {
      const obj = JSON.parse(jsonStr);
      const parsed = ChiptuneSoundDefSchema.safeParse(obj);
      if (parsed.success) {
        this.currentSound = parsed.data;
        this.presets[this.currentSound.id] = this.currentSound;
        this.syncInputsFromState();
        this.render();
        this.updateCodePreview();
        this.renderPresetList();
        return true;
      } else {
        console.error('Preset validation failed:', parsed.error);
        return false;
      }
    } catch (e) {
      console.error('Invalid JSON file:', e);
      return false;
    }
  }
}
