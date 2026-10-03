import { saveManager, type GameSettings } from '../storage/SaveManager';
import { sounds } from '../audio/SoundManager';

export class SettingsModal {
  private isOpen = false;
  private listeningAction: string | null = null;

  constructor() {
    this.setupDOM();
  }

  private setupDOM() {
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'settings-modal hidden';
    modal.innerHTML = `
      <div class="settings-backdrop"></div>
      <div class="settings-window">
        <div class="settings-header">
          <div class="settings-title-group">
            <h2>⚙️ Game Settings</h2>
            <span class="settings-sub">Customize Audio, Controls & Display</span>
          </div>
          <button id="settings-close-btn" class="settings-close-btn" title="Close [ESC]">&times;</button>
        </div>

        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="audio">🔊 Audio</button>
          <button class="settings-tab" data-tab="controls">🎮 Controls</button>
          <button class="settings-tab" data-tab="display">🖥️ Display & Feel</button>
          <button class="settings-tab" data-tab="save">💾 Save Profile</button>
        </div>

        <div class="settings-body">
          <!-- Audio Tab -->
          <div id="tab-pane-audio" class="settings-pane active">
            <div class="settings-group">
              <label class="settings-label">
                <span>Master Volume</span>
                <span id="label-master-vol" class="vol-value">80%</span>
              </label>
              <input type="range" id="slider-master-vol" min="0" max="100" value="80" class="settings-slider" />
            </div>

            <div class="settings-group">
              <label class="settings-label">
                <span>Sound Effects (SFX)</span>
                <span id="label-sfx-vol" class="vol-value">80%</span>
              </label>
              <input type="range" id="slider-sfx-vol" min="0" max="100" value="80" class="settings-slider" />
            </div>

            <div class="settings-group">
              <label class="settings-label">
                <span>Music (BGM)</span>
                <span id="label-bgm-vol" class="vol-value">60%</span>
              </label>
              <input type="range" id="slider-bgm-vol" min="0" max="100" value="60" class="settings-slider" />
            </div>

            <div style="margin-top: 10px;">
              <button id="btn-test-audio" class="btn" style="font-size: 11px;">🎵 Play Test Sound</button>
            </div>
          </div>

          <!-- Controls Tab -->
          <div id="tab-pane-controls" class="settings-pane">
            <div class="preset-row">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Layout Presets:</span>
              <button class="btn btn-preset" data-preset="qwerty">WASD (QWERTY)</button>
              <button class="btn btn-preset" data-preset="azerty">ZQSD (AZERTY)</button>
              <button class="btn btn-preset" data-preset="arrows">Arrow Keys</button>
              <button class="btn btn-preset" data-preset="reset" style="margin-left: auto; border-color: #ef4444; color: #fca5a5;">Reset Defaults</button>
            </div>

            <div class="keybinds-grid" id="keybinds-container"></div>
            <div id="rebind-prompt" class="rebind-prompt hidden">Press any key to rebind action... (or ESC to cancel)</div>
          </div>

          <!-- Display & Feel Tab -->
          <div id="tab-pane-display" class="settings-pane">
            <div class="settings-group toggle-row">
              <div>
                <div class="toggle-title">Screen Shake</div>
                <div class="toggle-desc">Camera tremors when striking enemies or explosions occur.</div>
              </div>
              <input type="checkbox" id="check-screenshake" checked class="settings-toggle" />
            </div>

            <div class="settings-group">
              <label class="settings-label">
                <span>Screen Shake Intensity</span>
                <span id="label-shake-int" class="vol-value">100%</span>
              </label>
              <input type="range" id="slider-shake-int" min="20" max="200" value="100" class="settings-slider" />
            </div>

            <div class="settings-group toggle-row">
              <div>
                <div class="toggle-title">High-Contrast Font</div>
                <div class="toggle-desc">Switches pixel font to clean sans-serif for improved legibility.</div>
              </div>
              <input type="checkbox" id="check-highcontrast" class="settings-toggle" />
            </div>

            <div class="settings-group toggle-row">
              <div>
                <div class="toggle-title">Pixel-Perfect Integer Scaling</div>
                <div class="toggle-desc">Locks canvas scaling to crisp integer multiples to prevent sub-pixel shimmering.</div>
              </div>
              <input type="checkbox" id="check-integerscale" class="settings-toggle" />
            </div>
          </div>

          <!-- Save Profile Tab -->
          <div id="tab-pane-save" class="settings-pane">
            <div id="save-profile-summary" class="profile-summary-box"></div>

            <div class="save-actions-grid">
              <button id="btn-export-save" class="btn btn-primary" style="padding: 10px;">
                📥 Export Save File (.json)
              </button>

              <label class="btn" style="padding: 10px; cursor: pointer; text-align: center;">
                📤 Import Save File (.json)
                <input type="file" id="input-import-save" accept=".json" style="display: none;" />
              </label>
            </div>

            <div style="margin-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;">
              <button id="btn-reset-data" class="btn" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fca5a5; font-size: 11px;">
                ⚠️ Clear All Local Progress & Restart
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')?.appendChild(modal);

    // Header close & backdrop
    document.getElementById('settings-close-btn')?.addEventListener('click', () => this.close());
    modal.querySelector('.settings-backdrop')?.addEventListener('click', () => this.close());

    this.setupTabs(modal);
    this.setupAudioControls(modal);
    this.setupDisplayControls(modal);
    this.setupControlsRebinding(modal);
    this.setupSaveControls(modal);
  }

  private setupTabs(modal: HTMLElement) {
    const tabs = modal.querySelectorAll('.settings-tab');
    const panes = modal.querySelectorAll('.settings-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const tabKey = target.dataset.tab;
        const pane = document.getElementById(`tab-pane-${tabKey}`);
        if (pane) pane.classList.add('active');

        if (tabKey === 'save') {
          this.renderSaveProfileSummary();
        }
      });
    });
  }

  private setupAudioControls(modal: HTMLElement) {
    const sMaster = modal.querySelector('#slider-master-vol') as HTMLInputElement;
    const lMaster = modal.querySelector('#label-master-vol') as HTMLElement;
    const sSfx = modal.querySelector('#slider-sfx-vol') as HTMLInputElement;
    const lSfx = modal.querySelector('#label-sfx-vol') as HTMLElement;
    const sBgm = modal.querySelector('#slider-bgm-vol') as HTMLInputElement;
    const lBgm = modal.querySelector('#label-bgm-vol') as HTMLElement;

    // Load initial values
    const cfg = saveManager.currentSave.settings;
    sMaster.value = String(Math.round(cfg.masterVolume * 100));
    lMaster.textContent = `${sMaster.value}%`;
    sSfx.value = String(Math.round(cfg.sfxVolume * 100));
    lSfx.textContent = `${sSfx.value}%`;
    sBgm.value = String(Math.round(cfg.bgmVolume * 100));
    lBgm.textContent = `${sBgm.value}%`;

    sMaster.addEventListener('input', () => {
      lMaster.textContent = `${sMaster.value}%`;
      saveManager.updateSettings({ masterVolume: Number(sMaster.value) / 100 });
    });

    sSfx.addEventListener('input', () => {
      lSfx.textContent = `${sSfx.value}%`;
      saveManager.updateSettings({ sfxVolume: Number(sSfx.value) / 100 });
    });

    sBgm.addEventListener('input', () => {
      lBgm.textContent = `${sBgm.value}%`;
      saveManager.updateSettings({ bgmVolume: Number(sBgm.value) / 100 });
    });

    modal.querySelector('#btn-test-audio')?.addEventListener('click', () => {
      sounds.ensureContext();
      sounds.playSecretJingle();
    });
  }

  private setupDisplayControls(modal: HTMLElement) {
    const cShake = modal.querySelector('#check-screenshake') as HTMLInputElement;
    const sShake = modal.querySelector('#slider-shake-int') as HTMLInputElement;
    const lShake = modal.querySelector('#label-shake-int') as HTMLElement;
    const cFont = modal.querySelector('#check-highcontrast') as HTMLInputElement;
    const cPixel = modal.querySelector('#check-integerscale') as HTMLInputElement;

    const cfg = saveManager.currentSave.settings;
    cShake.checked = cfg.screenShake;
    sShake.value = String(Math.round(cfg.shakeIntensity * 100));
    lShake.textContent = `${sShake.value}%`;
    cFont.checked = cfg.highContrastFont;
    cPixel.checked = cfg.integerScaling;

    cShake.addEventListener('change', () => {
      saveManager.updateSettings({ screenShake: cShake.checked });
    });

    sShake.addEventListener('input', () => {
      lShake.textContent = `${sShake.value}%`;
      saveManager.updateSettings({ shakeIntensity: Number(sShake.value) / 100 });
    });

    cFont.addEventListener('change', () => {
      saveManager.updateSettings({ highContrastFont: cFont.checked });
    });

    cPixel.addEventListener('change', () => {
      saveManager.updateSettings({ integerScaling: cPixel.checked });
    });
  }

  private setupControlsRebinding(modal: HTMLElement) {
    this.renderKeybindsGrid();

    // Preset buttons
    modal.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = (e.currentTarget as HTMLElement).dataset.preset;
        if (p === 'qwerty') {
          saveManager.updateSettings({
            keybindings: {
              moveUp: 'KeyW',
              moveDown: 'KeyS',
              moveLeft: 'KeyA',
              moveRight: 'KeyD',
              attack: 'Space',
              roll: 'ShiftLeft',
              interact: 'KeyE',
              journal: 'KeyJ',
              map: 'KeyM'
            }
          });
        } else if (p === 'azerty') {
          saveManager.updateSettings({
            keybindings: {
              moveUp: 'KeyZ',
              moveDown: 'KeyS',
              moveLeft: 'KeyQ',
              moveRight: 'KeyD',
              attack: 'Space',
              roll: 'ShiftLeft',
              interact: 'KeyE',
              journal: 'KeyJ',
              map: 'KeyM'
            }
          });
        } else if (p === 'arrows') {
          saveManager.updateSettings({
            keybindings: {
              moveUp: 'ArrowUp',
              moveDown: 'ArrowDown',
              moveLeft: 'ArrowLeft',
              moveRight: 'ArrowRight',
              attack: 'KeyZ',
              roll: 'KeyX',
              interact: 'KeyC',
              journal: 'KeyJ',
              map: 'KeyM'
            }
          });
        } else if (p === 'reset') {
          saveManager.updateSettings({
            keybindings: {
              moveUp: 'KeyW',
              moveDown: 'KeyS',
              moveLeft: 'KeyA',
              moveRight: 'KeyD',
              attack: 'Space',
              roll: 'ShiftLeft',
              interact: 'KeyE',
              journal: 'KeyJ',
              map: 'KeyM'
            }
          });
        }
        this.renderKeybindsGrid();
        sounds.ensureContext();
        sounds.playSwitchClick();
      });
    });

    // Keydown listener when re-binding
    window.addEventListener('keydown', (e) => {
      if (!this.listeningAction) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        this.stopListening();
        return;
      }

      const binds = { ...saveManager.currentSave.settings.keybindings };
      (binds as any)[this.listeningAction] = e.code;
      saveManager.updateSettings({ keybindings: binds });

      sounds.ensureContext();
      sounds.playSwitchClick();
      this.stopListening();
      this.renderKeybindsGrid();
    });
  }

  private stopListening() {
    this.listeningAction = null;
    document.getElementById('rebind-prompt')?.classList.add('hidden');
    document.querySelectorAll('.keybind-card').forEach(c => c.classList.remove('listening'));
  }

  private renderKeybindsGrid() {
    const grid = document.getElementById('keybinds-container');
    if (!grid) return;

    const actionLabels: Record<string, string> = {
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      attack: 'Attack / Slash',
      roll: 'Dodge Roll',
      interact: 'Lift / Talk / Interact',
      journal: 'Quest Journal',
      map: 'World Map'
    };

    const binds = saveManager.currentSave.settings.keybindings;

    grid.innerHTML = Object.entries(actionLabels).map(([action, label]) => {
      const code = (binds as any)[action] || 'None';
      const cleanKey = code.replace('Key', '').replace('Left', '').replace('Right', '');

      return `
        <div class="keybind-card" data-action="${action}">
          <span class="keybind-label">${label}</span>
          <button class="keybind-btn" data-action="${action}">
            ${cleanKey}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.keybind-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action!;
        this.listeningAction = action;
        const prompt = document.getElementById('rebind-prompt');
        if (prompt) prompt.classList.remove('hidden');

        grid.querySelectorAll('.keybind-card').forEach(c => {
          c.classList.toggle('listening', (c as HTMLElement).dataset.action === action);
        });
      });
    });
  }

  private setupSaveControls(modal: HTMLElement) {
    modal.querySelector('#btn-export-save')?.addEventListener('click', () => {
      saveManager.exportSaveFile();
      (window as any).BitQuestUI?.showToast('📥 Save profile exported successfully!');
    });

    const fileInput = modal.querySelector('#input-import-save') as HTMLInputElement;
    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files[0]) {
        const ok = await saveManager.importSaveFile(fileInput.files[0]);
        if (ok) {
          (window as any).BitQuestUI?.showToast('✨ Save profile loaded! Refreshing...');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          alert('Failed to load save file. Please make sure it is a valid BitQuest save JSON.');
        }
      }
    });

    modal.querySelector('#btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your local save and progress? This cannot be undone.')) {
        saveManager.resetAllData();
      }
    });
  }

  private renderSaveProfileSummary() {
    const box = document.getElementById('save-profile-summary');
    if (!box) return;

    const save = saveManager.currentSave;
    const dateStr = new Date(save.timestamp).toLocaleString();

    box.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: var(--font-retro); font-size: 11px; color: #facc15;">Adventurer Profile</span>
        <span style="font-size: 10px; color: var(--text-muted);">Auto-saved: ${dateStr}</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11px;">
        <div><strong>Name:</strong> ${save.name || 'Anonymous Hero'}</div>
        <div><strong>Coins:</strong> 🪙 ${save.coins}</div>
        <div><strong>Acorns:</strong> 🌰 ${save.acorns}</div>
        <div><strong>Health:</strong> ❤️ ${save.health}/${save.maxHealth}</div>
        <div><strong>Position:</strong> ${save.x}, ${save.y}</div>
        <div><strong>Inventory:</strong> ${save.inventory.length} items</div>
      </div>
    `;
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open() {
    sounds.ensureContext();
    sounds.playEmoteSound();
    this.isOpen = true;
    document.getElementById('settings-modal')?.classList.remove('hidden');
    this.renderSaveProfileSummary();
  }

  public close() {
    this.stopListening();
    this.isOpen = false;
    document.getElementById('settings-modal')?.classList.add('hidden');
  }

  public isSettingsOpen(): boolean {
    return this.isOpen;
  }
}
