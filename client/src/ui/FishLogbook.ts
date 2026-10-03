// client/src/ui/FishLogbook.ts
// BitQuest Fish Logbook & Angler's Companion Modal (Issue #23 / Task 7.5)

import { FISH_SPECIES, type FishSpecies, type PlayerFishLog } from '../../../shared/src/fishing';
import { sounds } from '../audio/SoundManager';

export class FishLogbookManager {
  private log: PlayerFishLog = {};
  public isOpen = false;
  private modalEl: HTMLElement | null = null;
  private activeFilter: 'all' | 'common' | 'uncommon' | 'rare' = 'all';

  constructor() {
    this.setupDOM();
  }

  private setupDOM() {
    let modal = document.getElementById('fishlog-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fishlog-modal';
      modal.className = 'pixel-modal hidden';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 680px;
        max-width: 94vw;
        max-height: 85vh;
        background: #0f172a;
        border: 4px solid #38bdf8;
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.35), 0 16px 32px rgba(0, 0, 0, 0.85);
        color: #f8fafc;
        font-family: 'Press Start 2P', monospace, sans-serif;
        font-size: 11px;
        line-height: 1.5;
        z-index: 9999;
        display: none;
        flex-direction: column;
        border-radius: 8px;
        overflow: hidden;
      `;
      document.body.appendChild(modal);
    }
    this.modalEl = modal;

    // Hook toggle button if present
    document.getElementById('fishlog-toggle-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }

  public updateLog(newLog: PlayerFishLog) {
    this.log = { ...newLog };
    if (this.isOpen) {
      this.render();
    }
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open() {
    this.isOpen = true;
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this.modalEl.classList.remove('hidden');
    }
    sounds.playBookOpen?.();
    this.render();
  }

  public close() {
    this.isOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.modalEl.classList.add('hidden');
    }
    sounds.playBookClose?.();
  }

  private render() {
    if (!this.modalEl) return;

    const allSpecies = Object.values(FISH_SPECIES);
    const discoveredCount = allSpecies.filter(s => !!this.log[s.id]).length;
    let totalCatches = 0;
    Object.values(this.log).forEach(e => {
      totalCatches += e.caughtCount;
    });

    const filteredSpecies = allSpecies.filter(s => {
      if (this.activeFilter === 'all') return true;
      if (this.activeFilter === 'common') return s.rarity === 'common';
      if (this.activeFilter === 'uncommon') return s.rarity === 'uncommon';
      if (this.activeFilter === 'rare') return s.rarity === 'rare' || s.rarity === 'legendary';
      return true;
    });

    this.modalEl.innerHTML = `
      <div style="background: #1e293b; padding: 14px 18px; border-bottom: 2px solid #334155; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🎣</span>
          <span style="color: #38bdf8; font-weight: bold; font-size: 13px;">The Angler's Companion</span>
        </div>
        <button id="fishlog-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px;">&times;</button>
      </div>

      <div style="background: #090d16; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b;">
        <div style="color: #cbd5e1; font-size: 10px;">
          Discovered: <span style="color: #facc15; font-weight: bold;">${discoveredCount} / ${allSpecies.length}</span> species &bull; Total Catches: <span style="color: #38bdf8; font-weight: bold;">${totalCatches}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          ${this.renderFilterBtn('all', 'All')}
          ${this.renderFilterBtn('common', 'Common')}
          ${this.renderFilterBtn('uncommon', 'Uncommon')}
          ${this.renderFilterBtn('rare', 'Rare+')}
        </div>
      </div>

      <div style="padding: 16px; overflow-y: auto; flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; max-height: calc(85vh - 120px);">
        ${filteredSpecies.map(s => this.renderFishCard(s)).join('')}
      </div>
    `;

    document.getElementById('fishlog-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.modalEl.querySelectorAll('.filter-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).getAttribute('data-filter') as any;
        if (filter) {
          this.activeFilter = filter;
          sounds.playUIClick?.();
          this.render();
        }
      });
    });
  }

  private renderFilterBtn(key: string, label: string): string {
    const active = this.activeFilter === key;
    return `
      <button class="filter-pill-btn" data-filter="${key}" style="
        background: ${active ? '#0284c7' : '#1e293b'};
        color: ${active ? '#ffffff' : '#94a3b8'};
        border: 1px solid ${active ? '#38bdf8' : '#334155'};
        border-radius: 4px;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 9px;
        cursor: pointer;
      ">${label}</button>
    `;
  }

  private renderFishCard(species: FishSpecies): string {
    const entry = this.log[species.id];
    const caught = !!entry;

    const rarityColors: Record<string, string> = {
      common: '#94a3b8',
      uncommon: '#10b981',
      rare: '#8b5cf6',
      legendary: '#f59e0b'
    };
    const rColor = rarityColors[species.rarity] || '#94a3b8';

    if (caught) {
      return `
        <div style="
          background: #1e293b;
          border: 2px solid ${species.color};
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">${species.icon}</span>
              <div>
                <div style="color: #f8fafc; font-weight: bold; font-size: 11px;">${species.name}</div>
                <div style="display: flex; gap: 6px; margin-top: 2px;">
                  <span style="color: ${rColor}; font-size: 9px; text-transform: uppercase;">[${species.rarity}]</span>
                  <span style="color: #64748b; font-size: 9px;">Biome: ${species.biome}</span>
                </div>
              </div>
            </div>
            <span style="color: #facc15; font-size: 10px;">💰 ${species.baseValue}c</span>
          </div>

          <div style="color: #94a3b8; font-size: 9px; line-height: 1.4; font-style: italic;">
            "${species.description}"
          </div>

          <div style="
            background: #0f172a;
            padding: 6px 10px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #cbd5e1;
            border: 1px solid #334155;
          ">
            <span>Caught: <strong style="color: #38bdf8;">${entry.caughtCount}x</strong></span>
            <span>Record: <strong style="color: #a855f7;">${entry.maxSizeCm} cm</strong></span>
          </div>
        </div>
      `;
    } else {
      const biomeHintMap: Record<string, string> = {
        meadow: 'Swims through the Whispering Meadow stream...',
        river: 'Leaps through the azure river currents...',
        lake: 'Hides among reeds in South Crystal Lake...',
        catacombs: 'Whispers echo in sunken subterranean crypt waters...',
        all: 'Can be hooked in fresh rivers and tranquil lakes...'
      };
      const hint = biomeHintMap[species.biome] || 'Dwells in uncharted waters...';

      return `
        <div style="
          background: #090d16;
          border: 2px dashed #334155;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          opacity: 0.75;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px; filter: grayscale(100%);">❓</span>
              <div>
                <div style="color: #64748b; font-weight: bold; font-size: 11px;">??? (Undiscovered)</div>
                <div style="color: ${rColor}; font-size: 9px; text-transform: uppercase;">[${species.rarity}]</div>
              </div>
            </div>
          </div>

          <div style="color: #475569; font-size: 9px; line-height: 1.4; font-style: italic;">
            "${hint}"
          </div>

          <div style="
            background: #030712;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 9px;
            color: #64748b;
            text-align: center;
          ">
            Cast a line to discover this species!
          </div>
        </div>
      `;
    }
  }

  public showCatchBanner(speciesId: string, sizeCm: number, isPersonalBest: boolean) {
    const species = FISH_SPECIES[speciesId];
    if (!species) return;

    let banner = document.getElementById('fish-catch-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'fish-catch-banner';
      banner.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(15, 23, 42, 0.95);
        border: 3px solid #facc15;
        box-shadow: 0 0 20px rgba(250, 204, 21, 0.4);
        padding: 12px 24px;
        border-radius: 8px;
        color: #ffffff;
        font-family: 'Press Start 2P', monospace, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease-out;
      `;
      document.body.appendChild(banner);
    }

    const pbTag = isPersonalBest ? '<span style="color: #a855f7; font-weight: bold; margin-left: 6px;">[NEW RECORD!]</span>' : '';
    banner.innerHTML = `
      <span style="font-size: 24px;">${species.icon}</span>
      <div>
        <div style="color: #facc15; font-size: 13px;">CAUGHT: ${species.name}!</div>
        <div style="color: #e2e8f0; font-size: 10px; margin-top: 4px;">Length: <strong style="color: #38bdf8;">${sizeCm} cm</strong> ${pbTag}</div>
      </div>
    `;

    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(20px)';
      }
    }, 3500);
  }
}
