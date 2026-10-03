import { sounds } from '../audio/SoundManager';

export interface LifetimeStats {
  bushesCut: number;
  potsSmashed: number;
  rollsExecuted: number;
  damageDealt: number;
  damageTaken: number;
  berriesCollected: number;
  coinsCollected: number;
  bossesDefeated: number;
  questsCompleted: number;
  stepsWalked: number;
}

export interface PlayerTitle {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (stats: LifetimeStats) => boolean;
}

export const TITLES_CATALOG: PlayerTitle[] = [
  {
    id: 'forager',
    name: 'Meadow Forager',
    description: 'Trim 5 wild bushes in the forest or meadow.',
    icon: '🌿',
    requirement: (s) => s.bushesCut >= 5
  },
  {
    id: 'pot_shatterer',
    name: 'Pot Shatterer',
    description: 'Shatter 3 clay pots across the realm.',
    icon: '🏺',
    requirement: (s) => s.potsSmashed >= 3
  },
  {
    id: 'acrobat',
    name: 'Acrobatic Tumbler',
    description: 'Perform 12 tactical dodge-rolls.',
    icon: '💨',
    requirement: (s) => s.rollsExecuted >= 12
  },
  {
    id: 'berry_lover',
    name: 'Berry Connoisseur',
    description: 'Harvest 3 sweet strawberries for Grandma.',
    icon: '🍓',
    requirement: (s) => s.berriesCollected >= 3
  },
  {
    id: 'slayer',
    name: 'Slayer of Spores',
    description: 'Vanquish the Spore King Baron von Truffle.',
    icon: '👑',
    requirement: (s) => s.bossesDefeated >= 1
  },
  {
    id: 'tycoon',
    name: 'Oakhaven Tycoon',
    description: 'Amass 50 silver coins in your pouch.',
    icon: '🪙',
    requirement: (s) => s.coinsCollected >= 50
  }
];

export class ChroniclesManager {
  private static STORAGE_KEY = 'bitquest_chronicles_v1';
  public stats: LifetimeStats;
  public equippedTitleId: string | null = null;
  public unlockedTitles: Set<string> = new Set();

  constructor() {
    this.stats = this.loadStats();
    this.checkUnlocks(false);
  }

  private loadStats(): LifetimeStats {
    try {
      const raw = localStorage.getItem(ChroniclesManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.stats === 'object') {
          this.equippedTitleId = parsed.equippedTitleId || null;
          return {
            bushesCut: parsed.stats.bushesCut || 0,
            potsSmashed: parsed.stats.potsSmashed || 0,
            rollsExecuted: parsed.stats.rollsExecuted || 0,
            damageDealt: parsed.stats.damageDealt || 0,
            damageTaken: parsed.stats.damageTaken || 0,
            berriesCollected: parsed.stats.berriesCollected || 0,
            coinsCollected: parsed.stats.coinsCollected || 0,
            bossesDefeated: parsed.stats.bossesDefeated || 0,
            questsCompleted: parsed.stats.questsCompleted || 0,
            stepsWalked: parsed.stats.stepsWalked || 0
          };
        }
      }
    } catch {
      // Ignore
    }

    return {
      bushesCut: 0,
      potsSmashed: 0,
      rollsExecuted: 0,
      damageDealt: 0,
      damageTaken: 0,
      berriesCollected: 0,
      coinsCollected: 0,
      bossesDefeated: 0,
      questsCompleted: 0,
      stepsWalked: 0
    };
  }

  public save() {
    try {
      localStorage.setItem(ChroniclesManager.STORAGE_KEY, JSON.stringify({
        stats: this.stats,
        equippedTitleId: this.equippedTitleId
      }));
    } catch {
      // Ignore
    }
  }

  public recordStat(key: keyof LifetimeStats, amount = 1) {
    this.stats[key] += amount;
    this.save();
    this.checkUnlocks(true);
  }

  public equipTitle(titleId: string | null) {
    if (titleId === null || this.unlockedTitles.has(titleId)) {
      this.equippedTitleId = titleId;
      this.save();
      sounds.ensureContext();
      sounds.playSecretJingle();

      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (scene?.localPlayer) {
        scene.localPlayer.setTitle(this.getEquippedTitleName());
      }
    }
  }

  public getEquippedTitleName(): string {
    if (!this.equippedTitleId) return '';
    const t = TITLES_CATALOG.find(x => x.id === this.equippedTitleId);
    return t ? `[${t.name}]` : '';
  }

  private checkUnlocks(notify = true) {
    TITLES_CATALOG.forEach(title => {
      if (!this.unlockedTitles.has(title.id)) {
        if (title.requirement(this.stats)) {
          this.unlockedTitles.add(title.id);
          if (notify) {
            this.showTitleUnlockedNotification(title);
          }
        }
      }
    });
  }

  private showTitleUnlockedNotification(title: PlayerTitle) {
    sounds.ensureContext();
    sounds.playVictory();

    const toast = document.createElement('div');
    toast.className = 'title-unlocked-banner';
    toast.innerHTML = `
      <span style="font-size: 20px;">${title.icon}</span>
      <div>
        <div style="font-family: var(--font-retro); font-size: 9px; color: #facc15;">TITLE UNLOCKED!</div>
        <div style="font-size: 11px; font-weight: 700; color: #ffffff;">${title.name}</div>
        <div style="font-size: 10px; color: #cbd5e1;">${title.description}</div>
      </div>
    `;

    document.getElementById('ui-overlay')?.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }
}

export const chronicles = new ChroniclesManager();
