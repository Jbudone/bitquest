import { sounds } from '../audio/SoundManager';
import type { EmoteType } from '../../../shared/src/types';

export interface EmoteWheelOption {
  id: EmoteType;
  label: string;
  icon: string;
  angleDeg: number;
}

export class EmoteWheelManager {
  private container: HTMLElement;
  private isOpen = false;
  private selectedIndex = -1;
  private centerX = 0;
  private centerY = 0;
  private onSelectEmote: (emote: EmoteType) => void;

  private options: EmoteWheelOption[] = [
    { id: 'wave', label: 'Wave', icon: '👋', angleDeg: -90 },
    { id: 'heart', label: 'Heart', icon: '💖', angleDeg: -30 },
    { id: 'exclamation', label: 'Alert / Ping', icon: '❗', angleDeg: 30 },
    { id: 'music', label: 'Celebrate', icon: '🎉', angleDeg: 90 },
    { id: 'laugh', label: 'Laugh', icon: '😂', angleDeg: 150 },
    { id: 'question', label: 'Question', icon: '❓', angleDeg: -150 }
  ];

  constructor(onSelectEmote: (emote: EmoteType) => void) {
    this.onSelectEmote = onSelectEmote;

    this.container = document.createElement('div');
    this.container.id = 'emote-wheel-container';
    this.container.className = 'emote-wheel-container';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    this.render();
    this.setupListeners();
  }

  private render() {
    this.container.innerHTML = `
      <div class="emote-wheel-backdrop"></div>
      <div class="emote-wheel-dialog">
        <div class="emote-wheel-center">
          <div class="emote-wheel-center-icon">💬</div>
          <div class="emote-wheel-center-label" id="emote-wheel-center-label">Hold Q</div>
        </div>
        <div class="emote-wheel-sectors" id="emote-wheel-sectors">
          ${this.options.map((opt, i) => {
            const rad = (opt.angleDeg * Math.PI) / 180;
            const radius = 95; // px from center
            const x = Math.round(Math.cos(rad) * radius);
            const y = Math.round(Math.sin(rad) * radius);
            return `
              <div class="emote-wheel-sector" data-index="${i}" style="transform: translate(${x}px, ${y}px);">
                <div class="emote-wheel-icon">${opt.icon}</div>
                <div class="emote-wheel-label">${opt.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.key === 'q' || e.key === 'Q' || e.key === 'Tab') && !this.isOpen && !e.repeat) {
        e.preventDefault();
        this.open();
      }
    });

    window.addEventListener('keyup', (e) => {
      if ((e.key === 'q' || e.key === 'Q' || e.key === 'Tab') && this.isOpen) {
        e.preventDefault();
        this.confirmSelection();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isOpen) return;
      this.handleMouseMove(e.clientX, e.clientY);
    });

    this.container.addEventListener('click', (e) => {
      const sector = (e.target as HTMLElement).closest('.emote-wheel-sector') as HTMLElement;
      if (sector) {
        const idx = parseInt(sector.dataset.index || '-1', 10);
        if (idx >= 0) {
          this.selectedIndex = idx;
          this.confirmSelection();
        }
      } else {
        this.close();
      }
    });
  }

  public open() {
    sounds.ensureContext();
    sounds.playCustom({ frequency: 540, targetFrequency: 720, duration: 0.08, type: 'triangle', volume: 0.12 });

    this.isOpen = true;
    this.selectedIndex = -1;
    this.container.style.display = 'flex';
    this.container.classList.add('active');

    const dialog = this.container.querySelector('.emote-wheel-dialog') as HTMLElement;
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
    }

    this.updateHighlight();
  }

  public close() {
    this.isOpen = false;
    this.container.classList.remove('active');
    setTimeout(() => {
      if (!this.isOpen) {
        this.container.style.display = 'none';
      }
    }, 180);
  }

  private handleMouseMove(x: number, y: number) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 28) {
      if (this.selectedIndex !== -1) {
        this.selectedIndex = -1;
        this.updateHighlight();
      }
      return;
    }

    const mouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Find sector with smallest angular distance
    let bestIdx = 0;
    let minDiff = 360;

    for (let i = 0; i < this.options.length; i++) {
      let diff = Math.abs(mouseAngle - this.options[i].angleDeg);
      if (diff > 180) diff = 360 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }

    if (bestIdx !== this.selectedIndex) {
      this.selectedIndex = bestIdx;
      sounds.playCustom({ frequency: 800 + bestIdx * 50, duration: 0.03, type: 'sine', volume: 0.06 });
      this.updateHighlight();
    }
  }

  private updateHighlight() {
    const sectors = this.container.querySelectorAll('.emote-wheel-sector');
    const labelEl = this.container.querySelector('#emote-wheel-center-label');

    sectors.forEach((sec, idx) => {
      if (idx === this.selectedIndex) {
        sec.classList.add('selected');
      } else {
        sec.classList.remove('selected');
      }
    });

    if (labelEl) {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
        const opt = this.options[this.selectedIndex];
        labelEl.textContent = `${opt.icon} ${opt.label}`;
      } else {
        labelEl.textContent = 'Select Emote';
      }
    }
  }

  private confirmSelection() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
      const emote = this.options[this.selectedIndex].id;
      this.onSelectEmote(emote);
    }
    this.close();
  }
}
