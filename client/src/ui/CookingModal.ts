// client/src/ui/CookingModal.ts
// BitQuest Cozy Campfire & Bakery Cooking Modal UI
// Issue #38 / Milestone 2: Culinary Crafting & Food Buff HUD

import {
  COOKING_RECIPES,
  CookingEngine,
  type CookingRecipe,
  type CookingStation,
  type ActiveBuff
} from '../../../shared/src/cooking';
import { sounds } from '../audio/SoundManager';
import { saveManager } from '../storage/SaveManager';

export class CookingModal {
  private modalEl: HTMLElement | null = null;
  private currentStation: CookingStation = 'any';
  private selectedFilter: 'all' | 'campfire' | 'bakery_oven' = 'all';
  public isModalOpen = false;
  public activeBuffs: ActiveBuff[] = [];
  private buffUpdateTimer: any = null;

  constructor() {
    this.setupDOM();
    this.setupKeyListeners();
    this.startBuffTicker();
  }

  private setupDOM() {
    let modal = document.getElementById('cooking-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cooking-modal';
      modal.className = 'pixel-modal hidden';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 720px;
        max-width: 95vw;
        max-height: 88vh;
        background: #0f172a;
        border: 4px solid #f59e0b;
        box-shadow: 0 0 32px rgba(245, 158, 11, 0.4), 0 16px 40px rgba(0, 0, 0, 0.9);
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
  }

  private setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        this.close();
        e.preventDefault();
      }
    });
  }

  public isOpen(): boolean {
    return this.isModalOpen;
  }

  public open(station: CookingStation = 'any') {
    this.currentStation = station;
    this.isModalOpen = true;
    sounds.ensureContext();
    sounds.playPickup();

    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this.render();
    }
  }

  public close() {
    this.isModalOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  public toggle(station: CookingStation = 'any') {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(station);
    }
  }

  private getPlayerInventory(): string[] {
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    if (worldScene && Array.isArray(worldScene.playerInventory)) {
      return worldScene.playerInventory;
    }
    return saveManager.currentSave.inventory || [];
  }

  private setPlayerInventory(newInv: string[]) {
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    if (worldScene) {
      worldScene.playerInventory = newInv;
    }
    saveManager.updatePlayerSnapshot({ inventory: newInv });
  }

  private startBuffTicker() {
    if (this.buffUpdateTimer) clearInterval(this.buffUpdateTimer);
    this.buffUpdateTimer = setInterval(() => {
      const now = Date.now();
      const prevCount = this.activeBuffs.length;
      const res = CookingEngine.updateAndCalculateBuffs(this.activeBuffs, now);
      this.activeBuffs = res.activeBuffs;

      if (this.isOpen()) {
        this.updateBuffBar();
      }

      // Propagate buff totals to world scene
      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
      if (worldScene) {
        worldScene.buffTotals = res.totals;
      }
    }, 1000);
  }

  public cookRecipe(recipeId: string) {
    const inv = this.getPlayerInventory();
    const result = CookingEngine.cookRecipe(recipeId, inv, this.currentStation);

    if (!result.success) {
      sounds.playError?.();
      this.showStatus(result.error || 'Failed to cook', '#ef4444');
      return;
    }

    // Success! Update inventory
    this.setPlayerInventory(result.remainingInventory);
    sounds.playLevelUp();

    const recipe = COOKING_RECIPES[recipeId];
    if (result.buff) {
      this.activeBuffs = CookingEngine.applyBuff(this.activeBuffs, result.buff, recipeId, Date.now());
      const res = CookingEngine.updateAndCalculateBuffs(this.activeBuffs, Date.now());
      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
      if (worldScene) {
        worldScene.buffTotals = res.totals;
        worldScene.showFloatingText?.(
          worldScene.localPlayer?.x ?? 0,
          (worldScene.localPlayer?.y ?? 0) - 24,
          `+ ${recipe.name}!`,
          0xfacc15
        );
      }
    }

    this.showStatus(`Sizzling perfection! Prepared ${recipe.name}!`, '#22c55e');
    this.render();
  }

  private showStatus(msg: string, color: string) {
    const statusEl = document.getElementById('cooking-status-banner');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      statusEl.style.opacity = '1';
      setTimeout(() => {
        if (statusEl) statusEl.style.opacity = '0.85';
      }, 2500);
    }
  }

  public render() {
    if (!this.modalEl) return;

    const stationTitle =
      this.currentStation === 'bakery_oven'
        ? "Grandma Bramble's Bakery Oven"
        : this.currentStation === 'campfire'
        ? "Campfire Hearth & Roasting Spit"
        : "Culinary Hearth & Cookware";

    const stationSubtitle =
      this.currentStation === 'bakery_oven'
        ? "Fresh sourdough, golden berry galettes, and steaming harvest pies"
        : this.currentStation === 'campfire'
        ? "Crackling wood embers, seasoned skewers, and fortifying root stews"
        : "Prepare nutrient-rich meals to empower speed, defense, health, and magic";

    const inventory = this.getPlayerInventory();

    const recipes = Object.values(COOKING_RECIPES).filter(r => {
      if (this.selectedFilter === 'all') return true;
      if (this.selectedFilter === 'campfire') return r.station === 'campfire' || r.station === 'any';
      if (this.selectedFilter === 'bakery_oven') return r.station === 'bakery_oven' || r.station === 'any';
      return true;
    });

    let recipeCardsHtml = '';
    for (const recipe of recipes) {
      const canCook = CookingEngine.canCook(recipe.id, inventory, this.currentStation);
      const missing = CookingEngine.getMissingIngredients(recipe.id, inventory);

      let ingredientsHtml = '';
      for (const ing of recipe.ingredients) {
        const have = CookingEngine.countItem(inventory, ing.itemId);
        const ok = have >= ing.count;
        ingredientsHtml += `
          <span style="display: inline-block; margin-right: 8px; margin-bottom: 4px; padding: 2px 6px; background: ${ok ? '#14532d' : '#450a0a'}; border: 1px solid ${ok ? '#22c55e' : '#ef4444'}; border-radius: 4px; font-size: 9px; color: ${ok ? '#86efac' : '#fca5a5'};">
            ${ing.name}: ${have}/${ing.count}
          </span>
        `;
      }

      const buffHtml = recipe.buff
        ? `<div style="color: #fde047; font-size: 9px; margin-top: 4px;">${recipe.buff.icon} ${recipe.buff.label} (${recipe.buff.description})</div>`
        : '';

      const stationBadge =
        recipe.station === 'campfire'
          ? `<span style="background: #ea580c; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 8px;">CAMPFIRE</span>`
          : recipe.station === 'bakery_oven'
          ? `<span style="background: #991b1b; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 8px;">BAKERY OVEN</span>`
          : `<span style="background: #0284c7; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 8px;">ANY HEARTH</span>`;

      recipeCardsHtml += `
        <div class="recipe-card" style="display: flex; align-items: center; justify-content: space-between; background: #1e293b; border: 2px solid ${canCook ? '#f59e0b' : '#334155'}; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; gap: 12px;">
          <div style="font-size: 26px; min-width: 36px; text-align: center;">${recipe.icon}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="color: #f8fafc; font-weight: bold; font-size: 11px;">${recipe.name}</span>
              ${stationBadge}
              <span style="color: #4ade80; font-size: 9px;">+${recipe.healAmount} HP</span>
            </div>
            <div style="color: #94a3b8; font-size: 9px; margin-bottom: 6px; line-height: 1.3;">${recipe.description}</div>
            <div>${ingredientsHtml}</div>
            ${buffHtml}
          </div>
          <div>
            <button class="cook-action-btn" data-recipe-id="${recipe.id}" ${canCook ? '' : 'disabled'} style="
              background: ${canCook ? '#f59e0b' : '#475569'};
              color: ${canCook ? '#000' : '#94a3b8'};
              border: 2px solid ${canCook ? '#fbbf24' : '#64748b'};
              border-radius: 4px;
              padding: 8px 14px;
              font-family: inherit;
              font-size: 10px;
              cursor: ${canCook ? 'pointer' : 'not-allowed'};
              font-weight: bold;
              box-shadow: ${canCook ? '0 2px 6px rgba(245, 158, 11, 0.4)' : 'none'};
            ">
              ${canCook ? '🍳 COOK' : 'LOCKED'}
            </button>
          </div>
        </div>
      `;
    }

    this.modalEl.innerHTML = `
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #1e293b; border-bottom: 2px solid #334155;">
        <div>
          <div style="color: #fbbf24; font-size: 14px; font-weight: bold; margin-bottom: 4px;">🍳 ${stationTitle}</div>
          <div style="color: #94a3b8; font-size: 9px;">${stationSubtitle}</div>
        </div>
        <button id="cooking-close-btn" style="background: #334155; border: 1px solid #475569; color: #f8fafc; font-size: 14px; cursor: pointer; padding: 4px 8px; border-radius: 4px;" title="Close [ESC]">✖</button>
      </div>

      <!-- Filters & Active Station -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 18px; background: #0f172a; border-bottom: 1px solid #334155;">
        <div style="display: flex; gap: 8px;">
          <button class="cooking-filter-btn ${this.selectedFilter === 'all' ? 'active' : ''}" data-filter="all" style="background: ${this.selectedFilter === 'all' ? '#d97706' : '#1e293b'}; color: #fff; border: 1px solid #d97706; border-radius: 4px; padding: 4px 8px; font-size: 9px; cursor: pointer;">All Recipes</button>
          <button class="cooking-filter-btn ${this.selectedFilter === 'campfire' ? 'active' : ''}" data-filter="campfire" style="background: ${this.selectedFilter === 'campfire' ? '#ea580c' : '#1e293b'}; color: #fff; border: 1px solid #ea580c; border-radius: 4px; padding: 4px 8px; font-size: 9px; cursor: pointer;">🔥 Campfire</button>
          <button class="cooking-filter-btn ${this.selectedFilter === 'bakery_oven' ? 'active' : ''}" data-filter="bakery_oven" style="background: ${this.selectedFilter === 'bakery_oven' ? '#991b1b' : '#1e293b'}; color: #fff; border: 1px solid #991b1b; border-radius: 4px; padding: 4px 8px; font-size: 9px; cursor: pointer;">🍞 Bakery Oven</button>
        </div>
        <div id="cooking-status-banner" style="font-size: 9px; color: #94a3b8; transition: opacity 0.3s;">Select a recipe to prepare</div>
      </div>

      <!-- Recipe Body List -->
      <div style="flex: 1; overflow-y: auto; padding: 14px 18px; max-height: 52vh;">
        ${recipeCardsHtml}
      </div>

      <!-- Active Buffs Bar Footer -->
      <div id="cooking-buff-bar" style="padding: 10px 18px; background: #1e293b; border-top: 2px solid #334155; min-height: 40px; display: flex; align-items: center; justify-content: space-between;">
        <!-- Dynamically updated -->
      </div>
    `;

    this.updateBuffBar();
    this.attachEvents();
  }

  private updateBuffBar() {
    const buffBar = document.getElementById('cooking-buff-bar');
    if (!buffBar) return;

    if (this.activeBuffs.length === 0) {
      buffBar.innerHTML = `
        <div style="color: #64748b; font-size: 9px; font-style: italic;">No food buffs currently active. Eat cooked dishes for temporary empowerment!</div>
      `;
      return;
    }

    const now = Date.now();
    let buffsHtml = '';
    for (const b of this.activeBuffs) {
      const remainingSec = Math.max(0, Math.ceil((b.expiresAt - now) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      buffsHtml += `
        <span style="display: inline-flex; align-items: center; gap: 4px; background: #0f172a; border: 1px solid #f59e0b; border-radius: 4px; padding: 3px 8px; font-size: 9px; color: #fde047; margin-right: 8px;">
          <span>${b.icon}</span>
          <span style="font-weight: bold;">${b.label}</span>
          <span style="color: #94a3b8;">(${timeStr})</span>
        </span>
      `;
    }

    buffBar.innerHTML = `
      <div style="display: flex; align-items: center; flex-wrap: wrap;">
        <span style="color: #94a3b8; font-size: 9px; margin-right: 8px;">Active Nourishment:</span>
        ${buffsHtml}
      </div>
    `;
  }

  private attachEvents() {
    document.getElementById('cooking-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    const filterBtns = this.modalEl?.querySelectorAll('.cooking-filter-btn');
    filterBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).getAttribute('data-filter') as any;
        if (filter) {
          this.selectedFilter = filter;
          this.render();
        }
      });
    });

    const cookBtns = this.modalEl?.querySelectorAll('.cook-action-btn');
    cookBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-recipe-id');
        if (id) {
          this.cookRecipe(id);
        }
      });
    });
  }
}
