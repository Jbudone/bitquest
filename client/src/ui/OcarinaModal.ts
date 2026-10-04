// client/src/ui/OcarinaModal.ts
// BitQuest Chiptune Ocarina & Jam Sessions Modal (Issue #27 / Task 7.9)

import { OCARINA_NOTES, OCARINA_SONGS, OcarinaEngine, type OcarinaNote, type NoteEvent, type OcarinaSong } from '../../../shared/src/ocarina';
import { sounds } from '../audio/SoundManager';
import { network } from '../network/NetworkClient';

export class OcarinaModal {
  private modalEl: HTMLElement | null = null;
  private staffEl: HTMLElement | null = null;
  private statusBannerEl: HTMLElement | null = null;
  private noteHistory: NoteEvent[] = [];
  public isModalOpen = false;

  constructor() {
    this.setupDOM();
    this.setupKeyListeners();
  }

  private setupDOM() {
    let modal = document.getElementById('ocarina-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ocarina-modal';
      modal.className = 'pixel-modal hidden';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 660px;
        max-width: 95vw;
        max-height: 88vh;
        background: #0f172a;
        border: 4px solid #a78bfa;
        box-shadow: 0 0 28px rgba(167, 139, 250, 0.4), 0 16px 36px rgba(0, 0, 0, 0.85);
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
    document.getElementById('ocarina-toggle-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }

  private setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;

      // Do not capture if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        this.close();
        e.preventDefault();
        return;
      }

      // 5-Note Hotkey Mappings
      let noteToPlay: OcarinaNote | null = null;
      if (e.key === '1' || e.key === 'ArrowUp') noteToPlay = 'C4';
      else if (e.key === '2' || e.key === 'ArrowLeft') noteToPlay = 'D4';
      else if (e.key === '3' || e.key === 'ArrowRight') noteToPlay = 'E4';
      else if (e.key === '4' || e.key === 'ArrowDown') noteToPlay = 'G4';
      else if (e.key === '5' || e.key === ' ') {
        noteToPlay = 'A4';
        e.preventDefault(); // prevent scroll on space
      }

      if (noteToPlay) {
        this.playNote(noteToPlay);
        e.preventDefault();
      }
    });
  }

  public isOpen(): boolean {
    return this.isModalOpen;
  }

  public open() {
    this.isModalOpen = true;
    sounds.ensureContext();
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
    this.noteHistory = [];
  }

  public toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  public playNote(note: OcarinaNote) {
    sounds.ensureContext();
    sounds.playOcarinaNote(note);

    const now = Date.now();
    this.noteHistory.push({ note, time: now });

    // Keep last 12 notes
    if (this.noteHistory.length > 12) {
      this.noteHistory.shift();
    }

    // Network broadcast & scene particle trigger
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    const px = worldScene?.localPlayer?.x ?? 0;
    const py = worldScene?.localPlayer?.y ?? 0;

    network.sendOcarinaNote(note, px, py);
    worldScene?.emitOcarinaNoteVfx?.(px, py, OCARINA_NOTES[note].color);

    // Visual button press feedback in modal
    const pad = document.getElementById(`ocarina-pad-${note}`);
    if (pad) {
      pad.classList.add('active');
      pad.style.transform = 'scale(0.92)';
      pad.style.boxShadow = `0 0 16px ${OCARINA_NOTES[note].color}`;
      setTimeout(() => {
        pad.classList.remove('active');
        pad.style.transform = 'scale(1)';
        pad.style.boxShadow = 'none';
      }, 140);
    }

    this.renderStaff();

    // Check for magical song match!
    const matchedSong = OcarinaEngine.matchSong(this.noteHistory);
    if (matchedSong) {
      this.handleSongMatched(matchedSong, px, py);
    }
  }

  private handleSongMatched(song: OcarinaSong, px: number, py: number) {
    sounds.playOcarinaSongDiscovery();

    // Broadcast authoritative song completion to server
    network.sendOcarinaSong(song.id, px, py);

    // Scene celebratory effects
    const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
    worldScene?.cameras?.main?.flash?.(450, 255, 235, 120);
    worldScene?.showFloatingText?.(px, py - 32, `🎶 ${song.name}!`, '#fbbf24', true);

    // Show banner inside modal
    if (this.statusBannerEl) {
      this.statusBannerEl.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.2); border: 2px solid #fbbf24; border-radius: 6px; padding: 10px 14px; text-align: center; animation: pulse 1s infinite alternate;">
          <span style="font-size: 14px; color: #fde047;">✨ PLAYED: ${song.name.toUpperCase()}! ✨</span>
          <div style="font-size: 9px; color: #cbd5e1; margin-top: 4px;">${song.description}</div>
        </div>
      `;
      setTimeout(() => {
        if (this.statusBannerEl) this.statusBannerEl.innerHTML = '';
      }, 4500);
    }

    // Reset buffer after successful song
    this.noteHistory = [];
    setTimeout(() => this.renderStaff(), 300);
  }

  public render() {
    if (!this.modalEl) return;

    this.modalEl.innerHTML = `
      <div style="background: #1e1b4b; padding: 12px 18px; border-bottom: 2px solid #a78bfa; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🎶</span>
          <div>
            <div style="color: #c4b5fd; font-size: 12px; font-weight: bold;">CHIPTUNE OCARINA</div>
            <div style="color: #94a3b8; font-size: 8px; margin-top: 2px;">Four-Hole Wooden Whistle & Jam Companion</div>
          </div>
        </div>
        <button id="ocarina-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 4px 8px;">✕</button>
      </div>

      <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;">
        <!-- Status / Song Recognized Banner -->
        <div id="ocarina-status-banner"></div>

        <!-- Melodic Staff Display (Trailing Notes) -->
        <div style="background: #090d16; border: 2px solid #334155; border-radius: 6px; padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 8px; letter-spacing: 0.5px;">NOTE BUFFER (PLAY IN TEMPO):</span>
            <button id="ocarina-clear-staff" style="background: none; border: 1px solid #475569; color: #94a3b8; font-size: 8px; border-radius: 4px; padding: 2px 6px; cursor: pointer;">Clear</button>
          </div>
          <div id="ocarina-staff-notes" style="display: flex; gap: 8px; min-height: 38px; align-items: center; overflow-x: auto; padding: 4px 0;">
            <!-- Rendered by renderStaff() -->
          </div>
        </div>

        <!-- 5-Note Melodic Keypad -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
          ${(['C4', 'D4', 'E4', 'G4', 'A4'] as OcarinaNote[]).map(n => {
            const def = OCARINA_NOTES[n];
            return `
              <button id="ocarina-pad-${n}" class="ocarina-pad-btn ocarina-note-btn" data-note="${n}" style="
                background: #1e293b;
                border: 2px solid ${def.color};
                border-radius: 8px;
                padding: 12px 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                transition: transform 0.08s ease, box-shadow 0.08s ease;
                user-select: none;
              ">
                <span style="font-size: 16px; color: ${def.color};">${def.glyph}</span>
                <span style="font-size: 14px; font-weight: bold; color: #f8fafc;">${def.label}</span>
                <span style="font-size: 8px; color: #94a3b8;">${def.solfege}</span>
                <span style="font-size: 8px; background: #334155; color: ${def.color}; border-radius: 4px; padding: 2px 5px; margin-top: 4px;">[${def.hotkey}]</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Discovered Songbook Section -->
        <div style="background: #090d16; border: 2px solid #334155; border-radius: 6px; padding: 12px 14px;">
          <div style="color: #fbbf24; font-size: 9px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>📖</span>
            <span>SONGBOOK & ANCIENT MELODIES</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${OCARINA_SONGS.map(song => `
              <div class="songbook-entry" style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>${song.icon}</span>
                    <span style="color: #f1f5f9; font-size: 9px; font-weight: bold;">${song.name}</span>
                  </div>
                  <div style="color: #94a3b8; font-size: 8px; margin-top: 2px;">${song.description}</div>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                  ${song.sequence.map(n => `
                    <span style="background: #0f172a; border: 1px solid ${OCARINA_NOTES[n].color}; color: ${OCARINA_NOTES[n].color}; font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 3px;">
                      ${OCARINA_NOTES[n].label}
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.staffEl = document.getElementById('ocarina-staff-notes');
    this.statusBannerEl = document.getElementById('ocarina-status-banner');

    // Wire close & clear buttons
    document.getElementById('ocarina-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('ocarina-clear-staff')?.addEventListener('click', () => {
      this.noteHistory = [];
      this.renderStaff();
    });

    // Wire pad click listeners
    (['C4', 'D4', 'E4', 'G4', 'A4'] as OcarinaNote[]).forEach(n => {
      document.getElementById(`ocarina-pad-${n}`)?.addEventListener('click', () => {
        this.playNote(n);
      });
    });

    this.renderStaff();
  }

  private renderStaff() {
    if (!this.staffEl) return;

    if (this.noteHistory.length === 0) {
      this.staffEl.innerHTML = `
        <span style="color: #475569; font-size: 8px; font-style: italic;">
          Press [1-5], Arrow Keys, or click pads to pipe a tune...
        </span>
      `;
      return;
    }

    this.staffEl.innerHTML = this.noteHistory.map((item, idx) => {
      const def = OCARINA_NOTES[item.note];
      return `
        <div style="
          background: #1e293b;
          border: 1.5px solid ${def.color};
          color: ${def.color};
          border-radius: 6px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: bold;
          font-size: 10px;
          animation: pop 0.12s ease-out;
        ">
          <span>${def.glyph}</span>
          <span>${def.label}</span>
        </div>
      `;
    }).join('');
  }
}
