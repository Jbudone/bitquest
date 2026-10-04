// client/src/ui/MinigameHUD.ts
// BitQuest Minigame Heads-Up Display & Victory Leaderboard Modal
// Milestone 5: Whispering Meadow Archery Range & Crystal Lake Boat Slalom

import {
  type ArcherySession,
  type BoatSlalomSession,
  type MinigameRank,
  ARCHERY_CONFIG,
  SLALOM_CONFIG
} from '../../../shared/src/minigames';
import { sounds } from '../audio/SoundManager';

export class MinigameHUDManager {
  private hudEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  public isActive = false;
  private currentMode: 'archery' | 'slalom' | null = null;

  public onAbort: (() => void) | null = null;
  public onRetry: (() => void) | null = null;

  constructor() {
    this.setupDOM();
  }

  private setupDOM() {
    // Top-center live in-game HUD bar
    let hud = document.getElementById('minigame-hud-bar');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'minigame-hud-bar';
      hud.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92);
        border: 3px solid #38bdf8;
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.4), 0 8px 24px rgba(0, 0, 0, 0.8);
        border-radius: 10px;
        padding: 8px 18px;
        display: none;
        align-items: center;
        gap: 20px;
        color: #f8fafc;
        font-family: 'Press Start 2P', monospace, sans-serif;
        font-size: 11px;
        z-index: 9500;
        pointer-events: auto;
        user-select: none;
      `;
      document.body.appendChild(hud);
    }
    this.hudEl = hud;

    // Victory / Game-over results modal
    let modal = document.getElementById('minigame-results-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'minigame-results-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 440px;
        max-width: 90vw;
        background: #0f172a;
        border: 4px solid #f59e0b;
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.45), 0 20px 40px rgba(0, 0, 0, 0.9);
        border-radius: 12px;
        padding: 24px;
        display: none;
        flex-direction: column;
        align-items: center;
        text-align: center;
        color: #f8fafc;
        font-family: 'Press Start 2P', monospace, sans-serif;
        font-size: 11px;
        line-height: 1.6;
        z-index: 9999;
      `;
      document.body.appendChild(modal);
    }
    this.modalEl = modal;
  }

  public startArchery() {
    this.currentMode = 'archery';
    this.isActive = true;
    if (this.hudEl) {
      this.hudEl.style.display = 'flex';
      this.hudEl.style.borderColor = '#fbbf24';
      this.hudEl.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.4), 0 8px 24px rgba(0,0,0,0.8)';
    }
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  public startSlalom() {
    this.currentMode = 'slalom';
    this.isActive = true;
    if (this.hudEl) {
      this.hudEl.style.display = 'flex';
      this.hudEl.style.borderColor = '#38bdf8';
      this.hudEl.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.4), 0 8px 24px rgba(0,0,0,0.8)';
    }
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  public updateArchery(session: ArcherySession) {
    if (!this.hudEl || !this.isActive || this.currentMode !== 'archery') return;

    const rankColor = this.getRankColor(session.rank);
    const rankTitle = session.rank !== 'none' ? session.rank.toUpperCase() : 'NO RANK';
    const comboBadge = session.combo >= 3 ? `<span style="color: #f43f5e; text-shadow: 0 0 8px #f43f5e;">x${this.getMultiplierText(session.combo)} (🔥 ${session.combo})</span>` : `x1.0`;

    this.hudEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:14px;">🎯</span>
        <span style="color:#fde047; font-weight:bold;">ARCHERY</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">TIME</span>
        <span style="color:${session.timeLeftSec <= 5 ? '#ef4444' : '#38bdf8'}; font-size:13px; font-weight:bold;">${Math.max(0, session.timeLeftSec).toFixed(1)}s</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">SCORE</span>
        <span style="color:#fbbf24; font-size:13px; font-weight:bold;">${session.score}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">COMBO</span>
        <span style="font-size:11px;">${comboBadge}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">MEDAL</span>
        <span style="color:${rankColor}; font-size:10px; font-weight:bold;">${rankTitle}</span>
      </div>
      <button id="minigame-abort-btn" style="background:#dc2626; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-family:inherit; font-size:9px; cursor:pointer;">✕ ABORT</button>
    `;

    document.getElementById('minigame-abort-btn')?.addEventListener('click', () => {
      this.abort();
    });
  }

  public updateSlalom(session: BoatSlalomSession) {
    if (!this.hudEl || !this.isActive || this.currentMode !== 'slalom') return;

    const rankColor = this.getRankColor(session.rank);
    const cpText = `${session.currentCheckpointIndex} / ${session.totalCheckpoints}`;

    this.hudEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:14px;">⛵</span>
        <span style="color:#38bdf8; font-weight:bold;">LAKE SLALOM</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">STOPWATCH</span>
        <span style="color:#4ade80; font-size:13px; font-weight:bold;">${session.elapsedTimeSec.toFixed(2)}s</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">CHECKPOINT</span>
        <span style="color:#fde047; font-size:12px; font-weight:bold;">${cpText}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <span style="font-size:8px; color:#94a3b8;">TARGET TIME</span>
        <span style="color:${rankColor}; font-size:10px; font-weight:bold;">${session.rank !== 'none' ? session.rank.toUpperCase() : '< 42.0s'}</span>
      </div>
      <button id="minigame-abort-btn" style="background:#dc2626; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-family:inherit; font-size:9px; cursor:pointer;">✕ ABORT</button>
    `;

    document.getElementById('minigame-abort-btn')?.addEventListener('click', () => {
      this.abort();
    });
  }

  public showArcheryResults(session: ArcherySession) {
    this.isActive = false;
    if (this.hudEl) this.hudEl.style.display = 'none';
    if (!this.modalEl) return;

    sounds.playLevelUp?.();
    const rankColor = this.getRankColor(session.rank);
    const rankBadge = this.getRankBadge(session.rank);
    const accuracy = session.shotsFired > 0 ? Math.round((session.shotsHit / session.shotsFired) * 100) : 0;

    this.modalEl.innerHTML = `
      <h2 style="color:#fbbf24; margin:0 0 16px 0; font-size:14px; text-shadow:0 0 10px rgba(251,191,36,0.6);">🏹 ARCHERY CHALLENGE COMPLETE!</h2>
      <div style="font-size:36px; margin:8px 0;">${rankBadge}</div>
      <div style="color:${rankColor}; font-size:15px; font-weight:bold; margin-bottom:18px;">${session.rank.toUpperCase()} MEDAL</div>
      
      <div style="background:rgba(30,41,59,0.7); border:2px solid #334155; border-radius:8px; padding:14px; width:100%; box-sizing:border-box; margin-bottom:20px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">FINAL SCORE:</span>
          <span style="color:#fde047; font-weight:bold;">${session.score} PTS</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">MAX COMBO:</span>
          <span style="color:#f43f5e; font-weight:bold;">🔥 ${session.maxCombo} HITS</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">ACCURACY:</span>
          <span style="color:#38bdf8; font-weight:bold;">${accuracy}% (${session.shotsHit}/${session.shotsFired})</span>
        </div>
      </div>

      <div style="display:flex; gap:12px; width:100%;">
        <button id="minigame-retry-btn" style="flex:1; background:#0284c7; color:#fff; border:2px solid #38bdf8; border-radius:6px; padding:10px; font-family:inherit; font-size:10px; cursor:pointer;">TRY AGAIN</button>
        <button id="minigame-close-btn" style="flex:1; background:#475569; color:#fff; border:2px solid #64748b; border-radius:6px; padding:10px; font-family:inherit; font-size:10px; cursor:pointer;">CLOSE</button>
      </div>
    `;

    this.modalEl.style.display = 'flex';

    document.getElementById('minigame-retry-btn')?.addEventListener('click', () => {
      this.modalEl!.style.display = 'none';
      this.onRetry?.();
    });

    document.getElementById('minigame-close-btn')?.addEventListener('click', () => {
      this.modalEl!.style.display = 'none';
      this.onAbort?.();
    });
  }

  public showSlalomResults(session: BoatSlalomSession) {
    this.isActive = false;
    if (this.hudEl) this.hudEl.style.display = 'none';
    if (!this.modalEl) return;

    sounds.playLevelUp?.();
    const rankColor = this.getRankColor(session.rank);
    const rankBadge = this.getRankBadge(session.rank);

    this.modalEl.innerHTML = `
      <h2 style="color:#38bdf8; margin:0 0 16px 0; font-size:14px; text-shadow:0 0 10px rgba(56,189,248,0.6);">⛵ CRYSTAL LAKE SLALOM FINISH!</h2>
      <div style="font-size:36px; margin:8px 0;">${rankBadge}</div>
      <div style="color:${rankColor}; font-size:15px; font-weight:bold; margin-bottom:18px;">${session.rank.toUpperCase()} MEDAL</div>
      
      <div style="background:rgba(30,41,59,0.7); border:2px solid #334155; border-radius:8px; padding:14px; width:100%; box-sizing:border-box; margin-bottom:20px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">OFFICIAL TIME:</span>
          <span style="color:#4ade80; font-weight:bold;">${session.finalTimeSec.toFixed(2)}s</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">BUOYS CLEARED:</span>
          <span style="color:#fde047; font-weight:bold;">${session.totalCheckpoints} / ${session.totalCheckpoints}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">MASTER RECORD:</span>
          <span style="color:#f59e0b; font-weight:bold;">&lt; ${SLALOM_CONFIG.RANKS.MASTER}s</span>
        </div>
      </div>

      <div style="display:flex; gap:12px; width:100%;">
        <button id="minigame-retry-btn" style="flex:1; background:#0284c7; color:#fff; border:2px solid #38bdf8; border-radius:6px; padding:10px; font-family:inherit; font-size:10px; cursor:pointer;">RACE AGAIN</button>
        <button id="minigame-close-btn" style="flex:1; background:#475569; color:#fff; border:2px solid #64748b; border-radius:6px; padding:10px; font-family:inherit; font-size:10px; cursor:pointer;">LEAVE LAKE</button>
      </div>
    `;

    this.modalEl.style.display = 'flex';

    document.getElementById('minigame-retry-btn')?.addEventListener('click', () => {
      this.modalEl!.style.display = 'none';
      this.onRetry?.();
    });

    document.getElementById('minigame-close-btn')?.addEventListener('click', () => {
      this.modalEl!.style.display = 'none';
      this.onAbort?.();
    });
  }

  public abort() {
    this.isActive = false;
    this.currentMode = null;
    if (this.hudEl) this.hudEl.style.display = 'none';
    if (this.modalEl) this.modalEl.style.display = 'none';
    this.onAbort?.();
  }

  public hide() {
    this.isActive = false;
    this.currentMode = null;
    if (this.hudEl) this.hudEl.style.display = 'none';
    if (this.modalEl) this.modalEl.style.display = 'none';
  }

  private getRankColor(rank: MinigameRank): string {
    switch (rank) {
      case 'master': return '#e879f9'; // Vivid Amethyst / Radiant Pink
      case 'gold': return '#fbbf24';   // Pure Gold
      case 'silver': return '#94a3b8'; // Bright Silver
      case 'bronze': return '#d97706'; // Bronze
      default: return '#64748b';
    }
  }

  private getRankBadge(rank: MinigameRank): string {
    switch (rank) {
      case 'master': return '👑';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '🏅';
    }
  }

  private getMultiplierText(combo: number): string {
    if (combo >= 10) return '3.0';
    if (combo >= 6) return '2.0';
    if (combo >= 3) return '1.5';
    return '1.0';
  }
}
