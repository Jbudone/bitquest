// client/src/ui/AlchemyModal.ts
// BitQuest Herbal Alchemy & Cauldron Brewing Modal
// Milestone 8: Cauldron brewing, herbal catalysts, potion consumables, and active buff HUD

import {
  ALCHEMY_RECIPES,
  AlchemyEngine,
  type AlchemyRecipe
} from '../../../shared/src/alchemy';
import { sounds } from '../audio/SoundManager';

export class AlchemyModal {
  private modalEl: HTMLElement | null = null;
  public isModalOpen = false;

  constructor() {
    this.setupDOM();
    this.setupKeyListeners();
  }

  private setupDOM() {
    let modal = document.getElementById('alchemy-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'alchemy-modal';
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
        border: 4px solid #10b981;
        box-shadow: 0 0 32px rgba(16, 185, 129, 0.45), 0 16px 40px rgba(0, 0, 0, 0.9);
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
      if (e.key === 'Escape' && this.isModalOpen) {
        this.close();
      }
    });
  }

  public open() {
    this.isModalOpen = true;
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this.render();
    }
    sounds.playPickup?.();
  }

  public close() {
    this.isModalOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  private getPlayerInventory(): string[] {
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    return worldScene?.playerInventory || [];
  }

  public render() {
    if (!this.modalEl) return;

    const inventory = this.getPlayerInventory();
    const invCounts = new Map<string, number>();
    for (const item of inventory) {
      invCounts.set(item, (invCounts.get(item) || 0) + 1);
    }

    const recipesHtml = ALCHEMY_RECIPES.map((recipe) => {
      const canBrew = AlchemyEngine.canBrewRecipe(recipe, inventory);
      const tierBadge = `<span style="background:${recipe.color}; color:#0f172a; padding:2px 6px; border-radius:3px; font-size:9px; font-weight:bold;">TIER ${recipe.tier}</span>`;

      const ingredientsList = recipe.ingredients
        .map((ing) => {
          const have = invCounts.get(ing.itemId) || 0;
          const hasEnough = have >= ing.count;
          const cleanName = ing.itemId.replace('flora_', '').replace('crop_', '').replace('seed_', '').replace('material_', '').replace(/_/g, ' ');
          return `
            <div style="display:flex; justify-content:space-between; color:${hasEnough ? '#4ade80' : '#f87171'}; font-size:9px;">
              <span>• ${cleanName.toUpperCase()}</span>
              <span>${have}/${ing.count}</span>
            </div>
          `;
        })
        .join('');

      return `
        <div style="background:#1e293b; border:2px solid ${recipe.color}; border-radius:6px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <span style="color:${recipe.color}; font-size:11px; font-weight:bold;">${recipe.name}</span>
              ${tierBadge}
            </div>
            <div style="color:#94a3b8; font-size:8.5px; line-height:1.4; margin-bottom:10px;">${recipe.description}</div>
            <div style="background:#0f172a; padding:8px; border-radius:4px; margin-bottom:8px;">
              <div style="color:#cbd5e1; font-size:8.5px; font-weight:bold; margin-bottom:4px;">CATALYST INGREDIENTS:</div>
              ${ingredientsList}
            </div>
          </div>
          <button
            class="alchemy-brew-btn"
            data-recipe-id="${recipe.id}"
            ${canBrew ? '' : 'disabled'}
            style="
              background:${canBrew ? recipe.color : '#334155'};
              color:${canBrew ? '#0f172a' : '#64748b'};
              border:none;
              border-radius:4px;
              padding:8px;
              font-family:inherit;
              font-size:10px;
              font-weight:bold;
              cursor:${canBrew ? 'pointer' : 'not-allowed'};
              transition:transform 0.1s;
            "
          >
            ${canBrew ? '⚗️ BREW POTION' : 'MISSING INGREDIENTS'}
          </button>
        </div>
      `;
    }).join('');

    this.modalEl.innerHTML = `
      <div style="background:#022c22; padding:14px 18px; border-bottom:3px solid #10b981; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">⚗️</span>
          <div>
            <div style="color:#6ee7b7; font-size:13px; font-weight:bold;">APOTHECARY ALCHEMY CAULDRON</div>
            <div style="color:#a7f3d0; font-size:8.5px; margin-top:3px;">Brew restorative draughts, battle tonics, and celestial elixirs</div>
          </div>
        </div>
        <button id="alchemy-close-btn" style="background:#dc2626; color:#fff; border:none; border-radius:4px; padding:6px 10px; font-family:inherit; font-size:10px; cursor:pointer;">✕ CLOSE</button>
      </div>

      <div style="padding:16px; overflow-y:auto; flex:1; display:grid; grid-template-columns:repeat(auto-fill, minmax(310px, 1fr)); gap:14px;">
        ${recipesHtml}
      </div>

      <div style="background:#0f172a; border-top:2px solid #1e293b; padding:10px 18px; display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8;">
        <span>Press <kbd style="background:#334155; color:#fff; padding:2px 5px; border-radius:3px;">ESC</kbd> to exit cauldron</span>
        <span style="color:#6ee7b7;">Harvest wild flora, crops, and milk for brewing</span>
      </div>
    `;

    document.getElementById('alchemy-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.modalEl.querySelectorAll('.alchemy-brew-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const recipeId = target.getAttribute('data-recipe-id');
        const recipe = ALCHEMY_RECIPES.find((r) => r.id === recipeId);
        if (recipe) {
          this.brew(recipe);
        }
      });
    });
  }

  private brew(recipe: AlchemyRecipe) {
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    if (!worldScene) return;

    const ok = AlchemyEngine.brewRecipe(recipe, worldScene.playerInventory);
    if (ok) {
      sounds.playLevelUp?.();
      worldScene.showFloatingText?.(
        worldScene.localPlayer?.x || 520,
        (worldScene.localPlayer?.y || 840) - 24,
        `⚗️ Brewed ${recipe.name}!`,
        recipe.color
      );
      this.render();
    }
  }
}
