import { sounds } from '../audio/SoundManager';

export interface BiomeMeta {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
}

export class BiomeBannerManager {
  private container: HTMLElement;
  private currentBiomeId: string | null = null;
  private hideTimer: any = null;
  private defeatOverlay: HTMLElement | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'biome-banner-container';
    this.container.className = 'biome-banner-container';
    document.body.appendChild(this.container);
  }

  public showBiome(biome: BiomeMeta) {
    if (this.currentBiomeId === biome.id) return;
    this.currentBiomeId = biome.id;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    sounds.playBiomeChime();

    this.container.innerHTML = `
      <div class="biome-banner-card animate-slide-in">
        <div class="biome-banner-ornament">✦ ─── ❖ ─── ✦</div>
        <div class="biome-banner-title">
          <span class="biome-banner-icon">${biome.icon}</span>
          <span>${biome.name}</span>
        </div>
        <div class="biome-banner-subtitle">${biome.subtitle}</div>
        <div class="biome-banner-divider"></div>
      </div>
    `;

    this.container.classList.add('visible');

    this.hideTimer = setTimeout(() => {
      this.container.classList.remove('visible');
      const card = this.container.querySelector('.biome-banner-card');
      if (card) {
        card.classList.add('animate-slide-out');
        setTimeout(() => {
          this.container.innerHTML = '';
        }, 600);
      }
    }, 2800);
  }

  public showCozyDefeat(onWakeUp: () => void) {
    if (this.defeatOverlay) return;

    sounds.duckBgm(-12, 4000);

    const overlay = document.createElement('div');
    overlay.id = 'cozy-defeat-overlay';
    overlay.className = 'cozy-defeat-overlay animate-fade-in';
    overlay.innerHTML = `
      <div class="cozy-defeat-card">
        <div class="cozy-defeat-icon">☕</div>
        <h2 class="cozy-defeat-title">Drifted Into Slumber...</h2>
        <p class="cozy-defeat-desc">
          You collapsed from exhaustion out in the wilds.<br/>
          Grandma Bramble found you resting by the roadside and brought you safely back to her bakery cot with a warm mug of spiced berry tea.
        </p>
        <div class="cozy-defeat-subtext">✨ All coins, acorns, and inventory remain safe.</div>
        <button id="btn-cozy-wake" class="cozy-wake-btn">☀️ Wake Up Refreshed</button>
      </div>
    `;

    document.body.appendChild(overlay);
    this.defeatOverlay = overlay;

    const wakeUp = () => {
      if (!this.defeatOverlay) return;
      sounds.playLullabyWake();
      sounds.duckBgm(0, 1000);

      this.defeatOverlay.classList.remove('animate-fade-in');
      this.defeatOverlay.classList.add('animate-fade-out');

      setTimeout(() => {
        if (this.defeatOverlay) {
          this.defeatOverlay.remove();
          this.defeatOverlay = null;
        }
        onWakeUp();
      }, 700);
    };

    const wakeBtn = overlay.querySelector('#btn-cozy-wake');
    if (wakeBtn) {
      wakeBtn.addEventListener('click', wakeUp);
    }

    // Auto wake-up after 5.5s
    setTimeout(() => {
      if (this.defeatOverlay) wakeUp();
    }, 5500);
  }
}
