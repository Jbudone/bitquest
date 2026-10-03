/**
 * Pip's Oddities Shop & Wandering Traders UI Controller
 * Task 7.7 / Issue #25
 *
 * Interactive merchant shop window with buy/sell tabs, category filtering,
 * stock rotation display, and dual coin/acorn currency economics.
 */

import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { ShopEngine, type ShopItem, type CurrencyType } from '../../../shared/src/shop';

export class ShopModal {
  private modalEl: HTMLElement | null = null;
  private portraitEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private speechEl: HTMLElement | null = null;
  private coinsEl: HTMLElement | null = null;
  private acornsEl: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;

  private tabBuyBtn: HTMLElement | null = null;
  private tabSellBtn: HTMLElement | null = null;
  private categoryFiltersEl: HTMLElement | null = null;

  private panelBuyEl: HTMLElement | null = null;
  private panelSellEl: HTMLElement | null = null;
  private waresGridEl: HTMLElement | null = null;
  private sellGridEl: HTMLElement | null = null;
  private statusMsgEl: HTMLElement | null = null;

  private currentMerchantId: string = '';
  private currentWares: ShopItem[] = [];
  private playerCoins: number = 0;
  private playerAcorns: number = 0;
  private playerInventory: string[] = [];

  private activeTab: 'buy' | 'sell' = 'buy';
  private activeCategory: string = 'all';

  constructor() {
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.modalEl = document.getElementById('shop-modal');
    this.portraitEl = document.getElementById('shop-merchant-portrait');
    this.titleEl = document.getElementById('shop-merchant-title');
    this.speechEl = document.getElementById('shop-merchant-speech');
    this.coinsEl = document.getElementById('shop-wallet-coins');
    this.acornsEl = document.getElementById('shop-wallet-acorns');
    this.closeBtn = document.getElementById('shop-close-btn');

    this.tabBuyBtn = document.getElementById('shop-tab-buy');
    this.tabSellBtn = document.getElementById('shop-tab-sell');
    this.categoryFiltersEl = document.getElementById('shop-category-filters');

    this.panelBuyEl = document.getElementById('shop-panel-buy');
    this.panelSellEl = document.getElementById('shop-panel-sell');
    this.waresGridEl = document.getElementById('shop-wares-grid');
    this.sellGridEl = document.getElementById('shop-sell-grid');
    this.statusMsgEl = document.getElementById('shop-status-msg');
  }

  private initEvents() {
    this.closeBtn?.addEventListener('click', () => this.closeShop());

    this.tabBuyBtn?.addEventListener('click', () => this.setTab('buy'));
    this.tabSellBtn?.addEventListener('click', () => this.setTab('sell'));

    // Category filter chips
    if (this.categoryFiltersEl) {
      this.categoryFiltersEl.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.shop-filter-chip');
        if (target) {
          const cat = target.getAttribute('data-category') || 'all';
          this.setCategory(cat);
        }
      });
    }

    // Keyboard ESC to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.closeShop();
      }
    });
  }

  public isOpen(): boolean {
    return !!this.modalEl && this.modalEl.style.display !== 'none';
  }

  public openShop(data: {
    merchantId: string;
    merchantName: string;
    merchantTitle: string;
    portrait: string;
    greeting: string;
    wares: ShopItem[];
    playerCoins: number;
    playerAcorns: number;
    inventory: string[];
  }) {
    this.currentMerchantId = data.merchantId;
    this.currentWares = data.wares;
    this.playerCoins = data.playerCoins;
    this.playerAcorns = data.playerAcorns;
    this.playerInventory = data.inventory || [];

    if (this.titleEl) this.titleEl.textContent = data.merchantTitle;
    if (this.speechEl) this.speechEl.textContent = `"${data.greeting}"`;
    if (this.coinsEl) this.coinsEl.textContent = String(this.playerCoins);
    if (this.acornsEl) this.acornsEl.textContent = String(this.playerAcorns);

    // Set merchant portrait
    if (this.portraitEl) {
      this.portraitEl.textContent = data.merchantId === 'merchant_corvus' ? '🥷' : '🦡';
      this.portraitEl.style.fontSize = '26px';
      this.portraitEl.style.display = 'flex';
      this.portraitEl.style.alignItems = 'center';
      this.portraitEl.style.justifyContent = 'center';
    }

    this.setTab('buy');
    this.clearStatus();

    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
    }
    sounds.playShopOpen();
  }

  public closeShop() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  public close() {
    this.closeShop();
  }

  public setTab(tab: 'buy' | 'sell') {
    this.activeTab = tab;
    if (this.tabBuyBtn) this.tabBuyBtn.classList.toggle('active', tab === 'buy');
    if (this.tabSellBtn) this.tabSellBtn.classList.toggle('active', tab === 'sell');

    if (this.panelBuyEl) this.panelBuyEl.style.display = tab === 'buy' ? 'block' : 'none';
    if (this.panelSellEl) this.panelSellEl.style.display = tab === 'sell' ? 'block' : 'none';
    if (this.categoryFiltersEl) this.categoryFiltersEl.style.display = tab === 'buy' ? 'flex' : 'none';

    if (tab === 'buy') {
      this.renderWares();
    } else {
      this.renderSellItems();
    }
  }

  public setCategory(category: string) {
    this.activeCategory = category;
    const chips = this.categoryFiltersEl?.querySelectorAll('.shop-filter-chip');
    chips?.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-category') === category);
    });
    this.renderWares();
  }

  private renderWares() {
    if (!this.waresGridEl) return;
    this.waresGridEl.innerHTML = '';

    const filtered = this.activeCategory === 'all'
      ? this.currentWares
      : this.currentWares.filter(w => w.category === this.activeCategory);

    if (filtered.length === 0) {
      this.waresGridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 32px; font-style: italic;">No items currently available in this category.</div>`;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      const canAfford = item.currency === 'acorn'
        ? this.playerAcorns >= item.buyPrice
        : this.playerCoins >= item.buyPrice;

      const currIcon = item.currency === 'acorn' ? '🌰' : '🪙';
      const categoryBadge = item.category.toUpperCase();

      card.innerHTML = `
        <div class="shop-item-icon-box">${item.icon}</div>
        <div class="shop-item-details">
          <div class="shop-item-header">
            <span class="shop-item-name">${item.name}</span>
            <span class="shop-item-badge">${categoryBadge}</span>
          </div>
          <div class="shop-item-desc">${item.description}</div>
          <div class="shop-item-action-row">
            <div class="shop-price-tag">
              <span>${currIcon}</span>
              <span>${item.buyPrice}</span>
            </div>
            <button class="shop-buy-btn ${canAfford ? '' : 'disabled'}" data-item-id="${item.id}" title="${canAfford ? 'Purchase' : 'Insufficient funds'}">
              Buy ${currIcon} ${item.buyPrice}
            </button>
          </div>
        </div>
      `;

      const buyBtn = card.querySelector('.shop-buy-btn') as HTMLButtonElement;
      buyBtn?.addEventListener('click', () => {
        if (!canAfford) {
          sounds.playShopError();
          this.showStatus(`Not enough ${item.currency === 'acorn' ? 'acorns' : 'coins'}!`, false);
          return;
        }
        this.handleBuy(item.id);
      });

      this.waresGridEl!.appendChild(card);
    });
  }

  private renderSellItems() {
    if (!this.sellGridEl) return;
    this.sellGridEl.innerHTML = '';

    if (this.playerInventory.length === 0) {
      this.sellGridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 32px; font-style: italic;">Your inventory is empty. Collect items across the realm to sell!</div>`;
      return;
    }

    this.playerInventory.forEach((itemName, index) => {
      const sellInfo = ShopEngine.getItemSellValue(itemName);
      const currIcon = sellInfo.currency === 'acorn' ? '🌰' : '🪙';

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      card.innerHTML = `
        <div class="shop-item-icon-box">📦</div>
        <div class="shop-item-details">
          <div class="shop-item-header">
            <span class="shop-item-name">${sellInfo.name}</span>
            <span class="shop-item-badge">GOODS</span>
          </div>
          <div class="shop-item-desc">Sell this item from your backpack.</div>
          <div class="shop-item-action-row">
            <div class="shop-price-tag">
              <span>+${sellInfo.amount}</span>
              <span>${currIcon}</span>
            </div>
            <button class="shop-sell-btn" data-slot="${index}">
              Sell +${sellInfo.amount} ${currIcon}
            </button>
          </div>
        </div>
      `;

      const sellBtn = card.querySelector('.shop-sell-btn') as HTMLButtonElement;
      sellBtn?.addEventListener('click', () => {
        this.handleSell(index);
      });

      this.sellGridEl!.appendChild(card);
    });
  }

  private handleBuy(itemId: string) {
    network.sendShopBuy(this.currentMerchantId, itemId, 1);
  }

  private handleSell(inventoryIndex: number) {
    network.sendShopSell(this.currentMerchantId, inventoryIndex, 1);
  }

  public handleTransactionResult(result: {
    success: boolean;
    message: string;
    newCoins: number;
    newAcorns: number;
    inventory: string[];
    wares?: ShopItem[];
  }) {
    this.playerCoins = result.newCoins;
    this.playerAcorns = result.newAcorns;
    this.playerInventory = result.inventory;
    if (result.wares) {
      this.currentWares = result.wares;
    }

    if (this.coinsEl) this.coinsEl.textContent = String(this.playerCoins);
    if (this.acornsEl) this.acornsEl.textContent = String(this.playerAcorns);

    this.showStatus(result.message, result.success);

    if (result.success) {
      if (this.activeTab === 'buy') {
        sounds.playShopBuy();
        this.renderWares();
      } else {
        sounds.playShopSell();
        this.renderSellItems();
      }
    } else {
      sounds.playShopError();
    }
  }

  private showStatus(msg: string, success: boolean) {
    if (!this.statusMsgEl) return;
    this.statusMsgEl.textContent = msg;
    this.statusMsgEl.className = `shop-status-msg ${success ? 'success' : 'error'}`;
    setTimeout(() => {
      if (this.statusMsgEl && this.statusMsgEl.textContent === msg) {
        this.clearStatus();
      }
    }, 3500);
  }

  private clearStatus() {
    if (!this.statusMsgEl) return;
    this.statusMsgEl.textContent = '';
    this.statusMsgEl.className = 'shop-status-msg';
  }
}
