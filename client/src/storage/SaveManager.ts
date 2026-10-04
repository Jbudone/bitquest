import { sounds } from '../audio/SoundManager';

export interface GameSettings {
  masterVolume: number; // 0.0 to 1.0
  sfxVolume: number;    // 0.0 to 1.0
  bgmVolume: number;    // 0.0 to 1.0
  screenShake: boolean;
  shakeIntensity: number; // 0.2 to 2.0
  highContrastFont: boolean;
  integerScaling: boolean;
  touchControls: 'auto' | 'on' | 'off';
  keybindings: {
    moveUp: string;
    moveDown: string;
    moveLeft: string;
    moveRight: string;
    attack: string;
    roll: string;
    interact: string;
    journal: string;
    map: string;
  };
}

export interface PlayerProfileSave {
  version: 1;
  timestamp: number;
  name: string;
  palette: number;
  x: number;
  y: number;
  coins: number;
  acorns: number;
  health: number;
  maxHealth: number;
  inventory: string[];
  settings: GameSettings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  bgmVolume: 0.6,
  screenShake: true,
  shakeIntensity: 1.0,
  highContrastFont: false,
  integerScaling: false,
  touchControls: 'auto',
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
};

export class SaveManager {
  private static STORAGE_KEY = 'bitquest_save_profile_v1';
  public currentSave: PlayerProfileSave;
  private autoSaveTimer: any = null;

  constructor() {
    this.currentSave = this.loadSave();
    this.applySettings(this.currentSave.settings);
    this.startAutoSave();
  }

  private loadSave(): PlayerProfileSave {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SaveManager.STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) {
          return {
            ...parsed,
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings, keybindings: { ...DEFAULT_SETTINGS.keybindings, ...parsed.settings?.keybindings } }
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load local save, using defaults', e);
    }

    return {
      version: 1,
      timestamp: Date.now(),
      name: '',
      palette: 0,
      x: 1024,
      y: 928,
      coins: 0,
      acorns: 0,
      health: 3,
      maxHealth: 3,
      inventory: ['Wooden Practice Stick'],
      settings: { ...DEFAULT_SETTINGS }
    };
  }

  public save() {
    try {
      this.currentSave.timestamp = Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(this.currentSave));
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public updatePlayerSnapshot(data: Partial<PlayerProfileSave>) {
    Object.assign(this.currentSave, data);
    this.save();
  }

  public updateSettings(settings: Partial<GameSettings>) {
    Object.assign(this.currentSave.settings, settings);
    this.applySettings(this.currentSave.settings);
    this.save();
  }

  public applySettings(settings: GameSettings) {
    // 1. Audio
    sounds.setMasterVolume(settings.masterVolume);
    sounds.setSfxVolume(settings.sfxVolume);
    sounds.setBgmVolume(settings.bgmVolume);

    // 2. High Contrast Font
    if (typeof document !== 'undefined') {
      document.body?.classList?.toggle('high-contrast-font', settings.highContrastFont);
    }

    // 3. Integer scaling / pixel crispness
    if (typeof document !== 'undefined') {
      const gameCanvas = document.querySelector?.('#game-container canvas') as HTMLCanvasElement | null;
      if (gameCanvas) {
        if (settings.integerScaling) {
          gameCanvas.style.imageRendering = 'pixelated';
          gameCanvas.classList.add('integer-scaled');
        } else {
          gameCanvas.classList.remove('integer-scaled');
        }
      }
    }

    // 4. Mobile touch controls
    if (settings.touchControls && (window as any).BitQuestTouch) {
      (window as any).BitQuestTouch.setMode(settings.touchControls);
    }
  }

  private startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (scene?.localPlayer) {
        const lp = scene.localPlayer;
        this.updatePlayerSnapshot({
          x: Math.round(lp.x),
          y: Math.round(lp.y),
          coins: lp.coins,
          acorns: lp.acorns,
          health: lp.health,
          maxHealth: lp.maxHealth
        });
      }
    }, 4000);
  }

  public exportSaveFile() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.currentSave, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `bitquest_save_${this.currentSave.name || 'adventurer'}_${dateStr}.json`;
    dlAnchor.setAttribute('download', fileName);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  public importSaveFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed && parsed.version === 1 && typeof parsed.name === 'string') {
            this.currentSave = {
              ...parsed,
              settings: { ...DEFAULT_SETTINGS, ...parsed.settings, keybindings: { ...DEFAULT_SETTINGS.keybindings, ...parsed.settings?.keybindings } }
            };
            this.save();
            this.applySettings(this.currentSave.settings);
            resolve(true);
            return;
          }
        } catch (err) {
          console.error('Invalid save file format', err);
        }
        resolve(false);
      };
      reader.readAsText(file);
    });
  }

  public resetAllData() {
    localStorage.removeItem(SaveManager.STORAGE_KEY);
    localStorage.removeItem('bitquest_fog_v1');
    localStorage.removeItem('bitquest_quest_progress_v1');
    window.location.reload();
  }
}

export const saveManager = new SaveManager();
