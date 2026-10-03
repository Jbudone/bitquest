// client/src/ui/EquipmentSheet.ts
// BitQuest Character Equipment, Class Archetypes & Vanity Wardrobe Sheet
// Issue #20 (Task 7.2) & Issue #21 (Task 7.3)

import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { 
  EQUIPMENT_DEFINITIONS, 
  VANITY_DEFINITIONS,
  EquipmentManager, 
  type EquipmentSlot, 
  type VanitySlot,
  type PlayerEquipment,
  type PlayerVanity,
  type AggregatedEquipmentStats
} from '../../../shared/src/equipment';
import { 
  ClassManager, 
  CLASS_DEFINITIONS, 
  type CharacterClassId 
} from '../../../shared/src/classes';

export class EquipmentSheetManager {
  private modal: HTMLElement | null = null;
  public isOpen = false;
  private selectedSlot: EquipmentSlot = 'weapon';
  public currentClass: CharacterClassId = 'warrior';

  constructor() {
    this.setupDOM();
  }

  private setupDOM() {
    this.modal = document.createElement('div');
    this.modal.id = 'equipment-sheet-modal';
    this.modal.className = 'equipment-modal hidden';
    this.modal.innerHTML = `
      <div class="equipment-backdrop"></div>
      <div class="equipment-window">
        <div class="equipment-header">
          <div class="equipment-title-block">
            <h2>🛡️ Character Sheet & Class Archetypes</h2>
            <span class="equipment-hint">Press <strong>[C]</strong> or <strong>[ESC]</strong> to close</span>
          </div>
          <button id="equipment-close-btn" class="equipment-close-btn">&times;</button>
        </div>

        <!-- Class Archetype Selection Header -->
        <div class="class-archetype-bar">
          <div class="class-picker-title">Class Archetype:</div>
          <div class="class-chips-row">
            <button class="class-chip-btn active" data-class="warrior">🛡️ Warrior</button>
            <button class="class-chip-btn" data-class="mage">🔮 Mage</button>
            <button class="class-chip-btn" data-class="bard">🎵 Bard</button>
            <button class="class-chip-btn" data-class="necromancer">💀 Necromancer</button>
            <button class="class-chip-btn" data-class="archer">🏹 Archer</button>
          </div>
        </div>

        <div class="class-perk-summary-box">
          <div class="class-title-row">
            <span id="class-display-title" class="class-display-title">Warrior — Iron Vanguard</span>
            <span id="class-primary-attr" class="class-primary-attr">Strength & Poise</span>
          </div>
          <div class="class-details-row">
            <div class="class-perk-card">
              <span class="perk-label">Passive Perk:</span>
              <span id="class-passive-desc" class="perk-desc">🛡️ High Poise: Immune to knockback, +2 Max Health, +20% damage reduction.</span>
            </div>
            <div class="class-abilities-card">
              <span class="perk-label">Active Abilities:</span>
              <div id="class-abilities-list" class="abilities-chip-list">
                <span class="ability-pill"><strong>[Z]</strong> 🛡️ Shield Parry (10 MP)</span>
                <span class="ability-pill"><strong>[X]</strong> ⚔️ Stagger Cleave (15 MP)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="equipment-body">
          <!-- Left Column: Equipment Slots & Paper Doll -->
          <div class="equipment-doll-column">
            <div class="paper-doll-frame">
              <div id="doll-preview-sprite" class="doll-preview-sprite">🧙</div>
              <div id="doll-player-name" class="doll-player-name">Adventurer</div>
              <div id="doll-archetype-badge" class="doll-archetype-badge">🗡️ Sword</div>
            </div>

            <!-- 4 Core Slots -->
            <div class="equipment-slots-grid">
              <div class="gear-slot-card active" data-slot="weapon">
                <span class="slot-icon">🗡️</span>
                <div class="slot-info">
                  <span class="slot-label">Weapon</span>
                  <span id="slot-name-weapon" class="slot-item-name">Practice Sword</span>
                </div>
                <button class="slot-unequip-btn" data-slot="weapon" title="Unequip">&times;</button>
              </div>

              <div class="gear-slot-card" data-slot="offhand">
                <span class="slot-icon">🛡️</span>
                <div class="slot-info">
                  <span class="slot-label">Off-Hand</span>
                  <span id="slot-name-offhand" class="slot-item-name">Empty</span>
                </div>
                <button class="slot-unequip-btn" data-slot="offhand" title="Unequip">&times;</button>
              </div>

              <div class="gear-slot-card" data-slot="armor">
                <span class="slot-icon">🥋</span>
                <div class="slot-info">
                  <span class="slot-label">Armor</span>
                  <span id="slot-name-armor" class="slot-item-name">Empty</span>
                </div>
                <button class="slot-unequip-btn" data-slot="armor" title="Unequip">&times;</button>
              </div>

              <div class="gear-slot-card" data-slot="relic">
                <span class="slot-icon">📿</span>
                <div class="slot-info">
                  <span class="slot-label">Relic</span>
                  <span id="slot-name-relic" class="slot-item-name">Empty</span>
                </div>
                <button class="slot-unequip-btn" data-slot="relic" title="Unequip">&times;</button>
              </div>
            </div>
          </div>

          <!-- Middle Column: Live Aggregated Combat Stats -->
          <div class="equipment-stats-column">
            <h3 class="column-heading">⚡ Combat Attributes</h3>
            <div class="stats-overview-grid">
              <div class="stat-badge">
                <span class="stat-title">⚔️ Attack Power</span>
                <span id="stat-atk-power" class="stat-value">1</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">⚡ Attack Speed</span>
                <span id="stat-atk-speed" class="stat-value">180ms</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">🎯 Crit Strike</span>
                <span id="stat-crit-chance" class="stat-value">15%</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">🛡️ Damage Reduction</span>
                <span id="stat-dmg-reduct" class="stat-value">0%</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">🏃 Movement Speed</span>
                <span id="stat-move-speed" class="stat-value">100%</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">❤️ Max Health</span>
                <span id="stat-max-hp" class="stat-value">3 Hearts</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">💧 Max Mana</span>
                <span id="stat-max-mp" class="stat-value">50 MP</span>
              </div>
              <div class="stat-badge">
                <span class="stat-title">🪄 Mana Discount</span>
                <span id="stat-mana-discount" class="stat-value">0%</span>
              </div>
            </div>

            <!-- Vanity Wardrobe Section -->
            <h3 class="column-heading" style="margin-top: 16px;">👑 Vanity Wardrobe</h3>
            <div class="vanity-controls-row">
              <div class="vanity-select-group">
                <label>Headgear:</label>
                <select id="vanity-head-select" class="vanity-select">
                  <option value="">None (Standard Cap)</option>
                  <option value="vanity_crown">👑 Royal Golden Crown</option>
                  <option value="vanity_hat_wizard">🧙 Starlight Wizard Hat</option>
                  <option value="vanity_hood_ranger">🧝 Woodland Ranger Hood</option>
                </select>
              </div>

              <div class="vanity-select-group">
                <label>Cosmetic Cape:</label>
                <select id="vanity-armor-select" class="vanity-select">
                  <option value="">None (Adventurer Tunic)</option>
                  <option value="vanity_cape_hero">🧣 Scarlet Hero Cape</option>
                  <option value="vanity_armor_knight">🛡️ Knight Paladin Pauldrons</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Right Column: Click-to-Equip Inventory Picker -->
          <div class="equipment-picker-column">
            <h3 id="picker-column-title" class="column-heading">🎒 Available Equipment</h3>
            <div id="picker-items-container" class="picker-items-container">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')?.appendChild(this.modal);

    // Close button
    document.getElementById('equipment-close-btn')?.addEventListener('click', () => this.close());
    this.modal.querySelector('.equipment-backdrop')?.addEventListener('click', () => this.close());

    // Class selection chips
    const classChips = this.modal.querySelectorAll('.class-chip-btn');
    classChips.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const classId = target.dataset.class as CharacterClassId;
        if (classId) {
          this.currentClass = classId;
          sounds.ensureContext();
          sounds.playClick();
          network.sendSetClass(classId);
          const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
          if (scene?.localPlayer) {
            scene.localPlayer.classId = classId;
          }
          (window as any).BitQuestUI?.showToast(`✨ Chosen Class: ${ClassManager.getClass(classId).name}!`);
          this.updateSheet();
        }
      });
    });

    // Slot click selection
    const slotCards = this.modal.querySelectorAll('.gear-slot-card');
    slotCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.slot-unequip-btn')) return;
        slotCards.forEach(c => c.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.selectedSlot = target.dataset.slot as EquipmentSlot;
        this.renderItemPicker();
      });
    });

    // Unequip buttons
    const unequipBtns = this.modal.querySelectorAll('.slot-unequip-btn');
    unequipBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = (e.currentTarget as HTMLElement).dataset.slot as EquipmentSlot;
        this.unequipSlot(slot);
      });
    });

    // Vanity Selectors
    document.getElementById('vanity-head-select')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value || null;
      network.sendSetVanity('head', val);
      sounds.playEmoteSound();
    });

    document.getElementById('vanity-armor-select')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value || null;
      network.sendSetVanity('armor', val);
      sounds.playEmoteSound();
    });
  }

  public toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  public open() {
    this.isOpen = true;
    sounds.ensureContext();
    sounds.playEmoteSound();
    this.modal?.classList.remove('hidden');
    this.updateSheet();
  }

  public close() {
    this.isOpen = false;
    this.modal?.classList.add('hidden');
  }

  public updateSheet() {
    const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
    if (!scene || !scene.localPlayer) return;

    const player = scene.localPlayer;
    if (player.classId) {
      this.currentClass = player.classId;
    }
    const eq: PlayerEquipment = player.equipment || EquipmentManager.getDefaultEquipment();
    const vn: PlayerVanity = player.vanity || EquipmentManager.getDefaultVanity();
    const stats: AggregatedEquipmentStats = player.equipmentStats || EquipmentManager.createDefaultStats();

    // Update Class Archetype Info
    const cls = ClassManager.getClass(this.currentClass);
    const titleEl = document.getElementById('class-display-title');
    if (titleEl) titleEl.innerText = `${cls.name} — ${cls.title}`;
    const attrEl = document.getElementById('class-primary-attr');
    if (attrEl) attrEl.innerText = cls.primaryAttribute;
    const passiveDesc = document.getElementById('class-passive-desc');
    if (passiveDesc) passiveDesc.innerText = `${cls.passivePerk.icon} ${cls.passivePerk.name}: ${cls.passivePerk.description}`;

    // Active abilities list
    const abilitiesContainer = document.getElementById('class-abilities-list');
    if (abilitiesContainer) {
      abilitiesContainer.innerHTML = `
        <span class="ability-pill" title="${cls.abilities[0].description}"><strong>[Z]</strong> ${cls.abilities[0].icon} ${cls.abilities[0].name} (${cls.abilities[0].manaCost} MP)</span>
        <span class="ability-pill" title="${cls.abilities[1].description}"><strong>[X]</strong> ${cls.abilities[1].icon} ${cls.abilities[1].name} (${cls.abilities[1].manaCost} MP)</span>
      `;
    }

    // Active class chip button highlight
    this.modal?.querySelectorAll('.class-chip-btn').forEach(btn => {
      if ((btn as HTMLElement).dataset.class === this.currentClass) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Name & Doll preview
    const nameEl = document.getElementById('doll-player-name');
    if (nameEl) nameEl.innerText = player.playerName;

    const archetypeEl = document.getElementById('doll-archetype-badge');
    if (archetypeEl) {
      const arch = stats.weaponArchetype || 'sword';
      const badgeMap: Record<string, string> = {
        sword: '⚔️ Balanced Sword',
        dagger: '🗡️ Swift Dagger',
        broadsword: '⚔️ Heavy Cleave Claymore',
        staff: '🪄 Arcane Staff',
        bow: '🏹 Ranged Longbow'
      };
      archetypeEl.innerText = badgeMap[arch] || '⚔️ Sword';
    }

    // Slots Text
    const setSlotName = (slot: EquipmentSlot) => {
      const el = document.getElementById(`slot-name-${slot}`);
      if (!el) return;
      const itemId = eq[slot];
      if (itemId && EQUIPMENT_DEFINITIONS[itemId]) {
        el.innerText = EQUIPMENT_DEFINITIONS[itemId]!.name;
        el.classList.add('equipped');
      } else {
        el.innerText = 'Empty (None)';
        el.classList.remove('equipped');
      }
    };

    setSlotName('weapon');
    setSlotName('offhand');
    setSlotName('armor');
    setSlotName('relic');

    // Stats Overview
    const setStat = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setStat('stat-atk-power', stats.attackPower.toString());
    setStat('stat-atk-speed', `${stats.attackSpeedMs}ms`);
    setStat('stat-crit-chance', `${Math.round(stats.critChance * 100)}%`);
    setStat('stat-dmg-reduct', `${Math.round(stats.damageReductionPct * 100)}%`);
    setStat('stat-move-speed', `${Math.round(stats.moveSpeedMultiplier * 100)}%`);
    setStat('stat-max-hp', `${player.maxHealth} Hearts`);
    setStat('stat-max-mp', `${player.maxMana} MP`);
    setStat('stat-mana-discount', `${Math.round(stats.manaCostReductionPct * 100)}%`);

    // Vanity Select Values
    const headSelect = document.getElementById('vanity-head-select') as HTMLSelectElement;
    if (headSelect) headSelect.value = vn.head || '';

    const armorSelect = document.getElementById('vanity-armor-select') as HTMLSelectElement;
    if (armorSelect) armorSelect.value = vn.armor || '';

    this.renderItemPicker();
  }

  private renderItemPicker() {
    const container = document.getElementById('picker-items-container');
    const titleEl = document.getElementById('picker-column-title');
    if (!container) return;

    const titles: Record<EquipmentSlot, string> = {
      weapon: '🎒 Available Weapons',
      offhand: '🎒 Available Off-Hands',
      armor: '🎒 Available Armor',
      relic: '🎒 Available Relics'
    };
    if (titleEl) titleEl.innerText = titles[this.selectedSlot] || '🎒 Available Equipment';

    container.innerHTML = '';

    const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
    const player = scene?.localPlayer;
    const currentEqId = player?.equipment?.[this.selectedSlot];

    // Find all items matching selected slot
    const matching = Object.values(EQUIPMENT_DEFINITIONS).filter(item => item.slot === this.selectedSlot);

    if (matching.length === 0) {
      container.innerHTML = `<div class="empty-picker-notice">No items available for this slot.</div>`;
      return;
    }

    matching.forEach(item => {
      const isEquipped = currentEqId === item.id;
      const card = document.createElement('div');
      card.className = `picker-item-card ${isEquipped ? 'is-equipped' : ''}`;
      
      let statSummary = '';
      if (item.stats.attackPower) statSummary += `⚔️ +${item.stats.attackPower} Atk  `;
      if (item.stats.attackSpeedMs) statSummary += `⚡ ${item.stats.attackSpeedMs}ms  `;
      if (item.stats.critChance) statSummary += `🎯 ${Math.round(item.stats.critChance * 100)}% Crit  `;
      if (item.stats.damageReductionPct) statSummary += `🛡️ +${Math.round(item.stats.damageReductionPct * 100)}% Res  `;
      if (item.stats.maxHealthBonus) statSummary += `❤️ +${item.stats.maxHealthBonus} HP  `;
      if (item.stats.maxManaBonus) statSummary += `💧 +${item.stats.maxManaBonus} MP  `;
      if (item.stats.moveSpeedBonus) statSummary += `🏃 +${Math.round(item.stats.moveSpeedBonus * 100)}% Spd  `;
      if (item.stats.manaCostReduction) statSummary += `🪄 -${Math.round(item.stats.manaCostReduction * 100)}% MP Cost  `;
      if (item.stats.isRanged) statSummary += `🏹 Ranged Arrow  `;

      card.innerHTML = `
        <div class="picker-item-left">
          <span class="picker-item-icon">${item.icon}</span>
          <div class="picker-item-meta">
            <span class="picker-item-name">${item.name}</span>
            <span class="picker-item-desc">${item.description}</span>
            <span class="picker-item-stats">${statSummary}</span>
          </div>
        </div>
        <button class="picker-equip-btn ${isEquipped ? 'equipped' : ''}">
          ${isEquipped ? 'Equipped ✓' : 'Equip ▶'}
        </button>
      `;

      card.querySelector('.picker-equip-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isEquipped) {
          this.unequipSlot(this.selectedSlot);
        } else {
          this.equipItem(this.selectedSlot, item.id);
        }
      });

      container.appendChild(card);
    });
  }

  private equipItem(slot: EquipmentSlot, itemId: string) {
    sounds.ensureContext();
    sounds.playStrawberry();
    network.sendEquipItem(slot, itemId);
    (window as any).BitQuestUI?.showToast(`⚔️ Equipped ${EQUIPMENT_DEFINITIONS[itemId]?.name || itemId}!`);
  }

  private unequipSlot(slot: EquipmentSlot) {
    sounds.ensureContext();
    sounds.playEmoteSound();
    network.sendEquipItem(slot, null);
    (window as any).BitQuestUI?.showToast(`Unequipped ${slot}.`);
  }
}
