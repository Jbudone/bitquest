import type { QuestDefinition, QuestStage } from '../../../shared/src/schemas';
import questsRaw from '../../../shared/data/quests.json';
import { sounds } from '../audio/SoundManager';
import { chronicles, TITLES_CATALOG } from '../storage/ChroniclesManager';

export interface QuestProgress {
  questId: string;
  currentStageIndex: number;
  stageProgress: number; // e.g. strawberries collected
  completed: boolean;
  completedAt?: number;
}

export class QuestJournalManager {
  private static STORAGE_KEY = 'bitquest_quest_progress_v1';
  private quests: Map<string, QuestDefinition> = new Map();
  private progress: Map<string, QuestProgress> = new Map();
  private activeQuestId: string = 'quest_grandma_berries';
  private isOpen = false;
  private onBeaconUpdate?: (beacon: { x: number; y: number; label: string } | null) => void;

  constructor(onBeaconUpdate?: (beacon: { x: number; y: number; label: string } | null) => void) {
    this.onBeaconUpdate = onBeaconUpdate;

    // Load definitions
    (questsRaw as QuestDefinition[]).forEach(q => {
      this.quests.set(q.id, q);
    });

    this.loadProgress();
    this.setupDOM();
    this.updateHUD();
  }

  private loadProgress() {
    try {
      const saved = localStorage.getItem(QuestJournalManager.STORAGE_KEY);
      if (saved) {
        const parsed: Record<string, QuestProgress> = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          this.progress.set(k, v);
        });
      }
    } catch {
      // Ignore
    }

    // Default ensure all quests exist in progress map
    for (const q of this.quests.values()) {
      if (!this.progress.has(q.id)) {
        this.progress.set(q.id, {
          questId: q.id,
          currentStageIndex: 0,
          stageProgress: 0,
          completed: false
        });
      }
    }
  }

  public saveProgress() {
    try {
      const obj: Record<string, QuestProgress> = {};
      this.progress.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(QuestJournalManager.STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore
    }
  }

  public getActiveQuest(): QuestDefinition | undefined {
    return this.quests.get(this.activeQuestId);
  }

  public getActiveProgress(): QuestProgress | undefined {
    return this.progress.get(this.activeQuestId);
  }

  public setActiveQuest(questId: string) {
    if (this.quests.has(questId)) {
      this.activeQuestId = questId;
      this.updateHUD();
      this.updateBeacon();
      this.renderJournalCards();
      sounds.ensureContext();
      sounds.playEmoteSound();
    }
  }

  public updateBeacon() {
    const q = this.getActiveQuest();
    const prog = this.getActiveProgress();
    if (!q || !prog || prog.completed) {
      this.onBeaconUpdate?.(null);
      return;
    }

    const stage = q.stages[prog.currentStageIndex];
    if (stage?.markerCoordinate) {
      this.onBeaconUpdate?.({
        x: stage.markerCoordinate.x,
        y: stage.markerCoordinate.y,
        label: stage.journalSummary
      });
    } else {
      this.onBeaconUpdate?.(null);
    }
  }

  /**
   * Updates quest objective progress for events (collecting strawberries, opening gates, talking to NPCs)
   */
  public handleEvent(event: { type: 'talk' | 'collect' | 'interact' | 'reach_area'; targetId: string; amount?: number }) {
    let stateChanged = false;

    for (const quest of this.quests.values()) {
      const prog = this.progress.get(quest.id);
      if (!prog || prog.completed) continue;

      const stage = quest.stages[prog.currentStageIndex];
      if (!stage) continue;

      if (stage.objectiveType === event.type && stage.targetId === event.targetId) {
        const amt = event.amount ?? 1;
        prog.stageProgress += amt;

        if (prog.stageProgress >= stage.targetCount) {
          // Advance to next stage or complete
          if (prog.currentStageIndex + 1 < quest.stages.length) {
            prog.currentStageIndex++;
            prog.stageProgress = 0;
            this.showStageAdvancementBanner(quest, quest.stages[prog.currentStageIndex]!);
          } else {
            prog.completed = true;
            prog.completedAt = Date.now();
            this.showQuestCompletedFanfare(quest);
          }
        }
        stateChanged = true;
      }
    }

    if (stateChanged) {
      this.saveProgress();
      this.updateHUD();
      this.updateBeacon();
      if (this.isOpen) {
        this.renderJournalCards();
      }
    }
  }

  private showStageAdvancementBanner(quest: QuestDefinition, newStage: QuestStage) {
    sounds.ensureContext();
    sounds.playSecretJingle();

    const banner = document.getElementById('quest-toast-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="quest-fanfare-inner advance">
          <span class="fanfare-icon">📜</span>
          <div class="fanfare-text">
            <div class="fanfare-title">Objective Updated: ${quest.title}</div>
            <div class="fanfare-desc">${newStage.journalSummary}</div>
          </div>
        </div>
      `;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 4500);
    }
  }

  private showQuestCompletedFanfare(quest: QuestDefinition) {
    sounds.ensureContext();
    sounds.playVictory();

    const banner = document.getElementById('quest-toast-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="quest-fanfare-inner complete">
          <span class="fanfare-icon">👑</span>
          <div class="fanfare-text">
            <div class="fanfare-title">QUEST COMPLETED!</div>
            <div class="fanfare-desc">${quest.title} &mdash; Rewards Claimed!</div>
          </div>
        </div>
      `;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 5500);
    }

    // Trigger visual confetti
    this.createConfetti();
  }

  private createConfetti() {
    const container = document.getElementById('ui-overlay');
    if (!container) return;

    for (let i = 0; i < 35; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.backgroundColor = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#a855f7'][i % 5]!;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    }
  }

  public updateHUD() {
    const bannerEl = document.querySelector('.quest-banner');
    if (!bannerEl) return;

    const quest = this.getActiveQuest();
    const prog = this.getActiveProgress();

    if (!quest || !prog) {
      bannerEl.innerHTML = `<span>🗝️</span><span>No Active Quest</span>`;
      return;
    }

    if (prog.completed) {
      bannerEl.innerHTML = `
        <span>🎉</span>
        <span><strong class="quest-highlight">${quest.title}:</strong> Completed! Press [J] for journal.</span>
      `;
      return;
    }

    const stage = quest.stages[prog.currentStageIndex];
    if (!stage) return;

    const countStr = stage.targetCount > 1 ? ` (${prog.stageProgress}/${stage.targetCount})` : '';

    bannerEl.innerHTML = `
      <span class="quest-badge-icon">📜</span>
      <span>
        <strong class="quest-highlight">${quest.title}:</strong>
        ${stage.journalSummary}${countStr}
      </span>
      <span class="quest-journal-prompt">[J]</span>
    `;
  }

  private setupDOM() {
    // 1. Hook up top banner click
    const bannerEl = document.querySelector('.quest-banner');
    if (bannerEl) {
      bannerEl.setAttribute('title', 'Click or press [J] to open Quest Journal');
      (bannerEl as HTMLElement).style.cursor = 'pointer';
      bannerEl.addEventListener('click', () => this.toggleJournal());
    }

    // 2. Quest Fanfare Toast Banner
    const toastBanner = document.createElement('div');
    toastBanner.id = 'quest-toast-banner';
    toastBanner.className = 'quest-toast-banner hidden';
    document.getElementById('ui-overlay')?.appendChild(toastBanner);

    // 3. Quest Journal Modal
    const modal = document.createElement('div');
    modal.id = 'quest-journal-modal';
    modal.className = 'quest-journal-modal hidden';
    modal.innerHTML = `
      <div class="journal-backdrop"></div>
      <div class="journal-window">
        <div class="journal-header">
          <div class="journal-title-block">
            <h2>📖 Adventurer's Quest Journal</h2>
            <span class="journal-hint">Press <strong>[J]</strong> or <strong>[ESC]</strong> to close</span>
          </div>
          <button id="journal-close-btn" class="journal-close-btn">&times;</button>
        </div>

        <div class="journal-tabs">
          <button class="journal-tab active" data-tab="active">Active Quests</button>
          <button class="journal-tab" data-tab="completed">Completed</button>
          <button class="journal-tab" data-tab="chronicles">🏆 Feats & Titles</button>
        </div>

        <div class="journal-content">
          <div id="journal-cards-container" class="journal-cards-container"></div>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')?.appendChild(modal);

    // Event listeners
    document.getElementById('journal-close-btn')?.addEventListener('click', () => this.closeJournal());
    modal.querySelector('.journal-backdrop')?.addEventListener('click', () => this.closeJournal());

    // Tabs
    const tabBtns = modal.querySelectorAll('.journal-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        if (target.dataset.tab === 'chronicles') {
          this.renderChronicles();
        } else {
          this.renderJournalCards(target.dataset.tab === 'completed');
        }
      });
    });

    this.renderJournalCards();
  }

  public renderChronicles() {
    const container = document.getElementById('journal-cards-container');
    if (!container) return;

    const s = chronicles.stats;

    container.innerHTML = `
      <div class="chronicles-stats-grid">
        <div class="chronicle-stat-card">
          <span class="stat-icon">🌿</span>
          <div class="stat-num">${s.bushesCut}</div>
          <div class="stat-name">Bushes Trimmed</div>
        </div>
        <div class="chronicle-stat-card">
          <span class="stat-icon">🏺</span>
          <div class="stat-num">${s.potsSmashed}</div>
          <div class="stat-name">Pots Shattered</div>
        </div>
        <div class="chronicle-stat-card">
          <span class="stat-icon">💨</span>
          <div class="stat-num">${s.rollsExecuted}</div>
          <div class="stat-name">Dodge Rolls</div>
        </div>
        <div class="chronicle-stat-card">
          <span class="stat-icon">⚔️</span>
          <div class="stat-num">${s.damageDealt}</div>
          <div class="stat-name">Damage Dealt</div>
        </div>
        <div class="chronicle-stat-card">
          <span class="stat-icon">🍓</span>
          <div class="stat-num">${s.berriesCollected}</div>
          <div class="stat-name">Strawberries</div>
        </div>
        <div class="chronicle-stat-card">
          <span class="stat-icon">👑</span>
          <div class="stat-num">${s.bossesDefeated}</div>
          <div class="stat-name">Bosses Vanquished</div>
        </div>
      </div>

      <div style="margin-top: 14px;">
        <h3 style="font-family: var(--font-retro); font-size: 11px; color: #facc15; margin-bottom: 8px;">
          🎖️ Cosmetic Titles & Badges
        </h3>
        <div class="chronicle-titles-list">
          ${TITLES_CATALOG.map(title => {
            const unlocked = chronicles.unlockedTitles.has(title.id);
            const isEquipped = chronicles.equippedTitleId === title.id;

            return `
              <div class="title-card ${unlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}">
                <span class="title-card-icon">${title.icon}</span>
                <div class="title-card-info">
                  <div class="title-card-name">${title.name} ${isEquipped ? '<span class="equipped-tag">ACTIVE</span>' : ''}</div>
                  <div class="title-card-desc">${title.description}</div>
                </div>
                <div class="title-card-action">
                  ${unlocked ? `
                    <button class="btn btn-equip-title ${isEquipped ? 'btn-primary' : ''}" data-title-id="${title.id}">
                      ${isEquipped ? '✓ Equipped' : 'Equip'}
                    </button>
                  ` : '<span class="locked-badge">🔒 Locked</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-equip-title').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.titleId!;
        if (chronicles.equippedTitleId === id) {
          chronicles.equipTitle(null);
        } else {
          chronicles.equipTitle(id);
        }
        this.renderChronicles();
      });
    });
  }

  public renderJournalCards(showCompleted = false) {
    const container = document.getElementById('journal-cards-container');
    if (!container) return;

    const list: QuestDefinition[] = [];
    for (const q of this.quests.values()) {
      const prog = this.progress.get(q.id);
      if (showCompleted && prog?.completed) {
        list.push(q);
      } else if (!showCompleted && !prog?.completed) {
        list.push(q);
      }
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="journal-empty-state">
          <span>${showCompleted ? '📭 No completed quests yet.' : '🌟 All active quests completed! Speak with villagers in Oakhaven for rumors.'}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(q => {
      const prog = this.progress.get(q.id) || { currentStageIndex: 0, stageProgress: 0, completed: false, questId: q.id };
      const isPinned = this.activeQuestId === q.id && !prog.completed;

      return `
        <div class="journal-card ${isPinned ? 'pinned' : ''}">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-quest-icon">${prog.completed ? '✅' : '📜'}</span>
              <div>
                <h3 class="card-title">${q.title}</h3>
                <span class="card-giver">Given by: ${q.giverNpcId.replace('npc_', '').toUpperCase()}</span>
              </div>
            </div>
            ${!prog.completed ? `
              <button class="btn btn-pin ${isPinned ? 'is-pinned' : ''}" data-pin-id="${q.id}">
                ${isPinned ? '📌 Active Quest' : 'Set as Active'}
              </button>
            ` : '<span class="completed-badge">COMPLETED</span>'}
          </div>

          <p class="card-desc">${q.description}</p>

          <div class="card-stages-list">
            <h4>Objectives:</h4>
            ${q.stages.map((st, idx) => {
              const isPast = prog.completed || idx < prog.currentStageIndex;
              const isCurrent = !prog.completed && idx === prog.currentStageIndex;
              const countStr = st.targetCount > 1 ? ` (${isCurrent ? prog.stageProgress : (isPast ? st.targetCount : 0)}/${st.targetCount})` : '';

              return `
                <div class="stage-item ${isPast ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                  <span class="stage-checkbox">${isPast ? '✓' : (isCurrent ? '▶' : '○')}</span>
                  <span class="stage-text">${st.journalSummary}${countStr}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="card-footer">
            <div class="card-rewards">
              <span class="reward-pill">🪙 +${q.rewards.coins} Coins</span>
              <span class="reward-pill">🌰 +${q.rewards.acorns} Acorns</span>
              ${q.rewards.items.map(it => `<span class="reward-pill">🎁 ${it.itemType} x${it.count}</span>`).join('')}
            </div>

            ${!prog.completed ? `
              <button class="btn btn-track-map" data-track-id="${q.id}" style="font-size: 10px; padding: 4px 8px;">
                🗺️ Show on Map
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Hook pin buttons
    container.querySelectorAll('.btn-pin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.pinId;
        if (id) this.setActiveQuest(id);
      });
    });

    // Hook track on map buttons
    container.querySelectorAll('.btn-track-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.trackId;
        if (id) {
          this.setActiveQuest(id);
          this.closeJournal();
          (window as any).BitQuestUI?.minimap?.openAtlas();
        }
      });
    });
  }

  public toggleJournal() {
    if (this.isOpen) {
      this.closeJournal();
    } else {
      this.openJournal();
    }
  }

  public openJournal() {
    sounds.ensureContext();
    sounds.playEmoteSound();
    this.isOpen = true;
    document.getElementById('quest-journal-modal')?.classList.remove('hidden');
    this.renderJournalCards();
  }

  public closeJournal() {
    this.isOpen = false;
    document.getElementById('quest-journal-modal')?.classList.add('hidden');
  }

  public isJournalOpen(): boolean {
    return this.isOpen;
  }
}
