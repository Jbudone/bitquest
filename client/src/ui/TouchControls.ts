// client/src/ui/TouchControls.ts
// BitQuest Mobile Touch Controls & Responsive Viewport Engine (Issue #28 / Task 7.10)
// Zero-allocation virtual thumbstick and action button cluster for mobile browsers.
import { saveManager } from '../storage/SaveManager';

export interface TouchState {
  vx: number;
  vy: number;
  active: boolean;
  angle: number;
  power: number;
  isAttackDown: boolean;
  isRollDown: boolean;
  isInteractDown: boolean;
  isAbility1Down: boolean;
  isAbility2Down: boolean;
}

export type TouchMode = 'auto' | 'on' | 'off';

export class TouchControls {
  public state: TouchState = {
    vx: 0,
    vy: 0,
    active: false,
    angle: 0,
    power: 0,
    isAttackDown: false,
    isRollDown: false,
    isInteractDown: false,
    isAbility1Down: false,
    isAbility2Down: false
  };

  private mode: TouchMode = 'auto';
  private isVisible = false;
  private rootEl: HTMLElement | null = null;
  private stickBaseEl: HTMLElement | null = null;
  private stickThumbEl: HTMLElement | null = null;
  private buttonsContainerEl: HTMLElement | null = null;

  // Joystick geometry & touch tracking
  private activeTouchId: number | null = null;
  private baseCenter = { x: 0, y: 0 };
  private readonly maxRadius = 46;
  private readonly deadzone = 0.12;

  // Reference to game scenes/UI
  private sceneGetter: () => any;

  constructor(sceneGetter: () => any) {
    this.sceneGetter = sceneGetter;
    this.initMode();
    this.setupDOM();
    this.evaluateVisibility();
  }

  private initMode() {
    const saved = localStorage.getItem('bitquest_touch_mode');
    const settingsMode = saveManager?.currentSave?.settings?.touchControls;
    if (window.location.search.includes('touch=true')) {
      this.mode = 'on';
    } else if (settingsMode === 'on' || settingsMode === 'off' || settingsMode === 'auto') {
      this.mode = settingsMode;
    } else if (saved === 'on' || saved === 'off' || saved === 'auto') {
      this.mode = saved;
    } else {
      this.mode = 'auto';
    }
  }

  public isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.location.search.includes('touch=true')
    );
  }

  public setMode(mode: TouchMode) {
    this.mode = mode;
    localStorage.setItem('bitquest_touch_mode', mode);
    if (saveManager?.currentSave?.settings?.touchControls !== mode) {
      saveManager.updateSettings({ touchControls: mode });
    }
    this.evaluateVisibility();
  }

  public getMode(): TouchMode {
    return this.mode;
  }

  public evaluateVisibility() {
    const shouldShow = this.mode === 'on' || (this.mode === 'auto' && this.isTouchDevice());
    this.setVisible(shouldShow);
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    if (this.rootEl) {
      this.rootEl.style.display = visible ? 'block' : 'none';
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private setupDOM() {
    let root = document.getElementById('touch-controls-layer');
    if (!root) {
      root = document.createElement('div');
      root.id = 'touch-controls-layer';
      root.className = 'touch-controls-layer';
      root.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 900;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        display: none;
      `;
      document.body.appendChild(root);
    }
    this.rootEl = root;

    root.innerHTML = `
      <!-- Virtual D-Pad / Thumbstick (Bottom-Left) -->
      <div id="touch-joystick-base" class="touch-joystick-base" style="
        position: absolute;
        bottom: max(24px, env(safe-area-inset-bottom, 24px));
        left: max(24px, env(safe-area-inset-left, 24px));
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.88) 100%);
        border: 3px solid rgba(148, 163, 184, 0.45);
        box-shadow: 0 0 16px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(255, 255, 255, 0.08);
        pointer-events: auto;
        touch-action: none;
        display: flex;
        justify-content: center;
        align-items: center;
      ">
        <!-- Directional indicators -->
        <div style="position: absolute; top: 6px; color: rgba(148, 163, 184, 0.7); font-size: 11px;">▲</div>
        <div style="position: absolute; bottom: 6px; color: rgba(148, 163, 184, 0.7); font-size: 11px;">▼</div>
        <div style="position: absolute; left: 8px; color: rgba(148, 163, 184, 0.7); font-size: 11px;">◀</div>
        <div style="position: absolute; right: 8px; color: rgba(148, 163, 184, 0.7); font-size: 11px;">▶</div>

        <!-- Thumbstick Nub -->
        <div id="touch-joystick-thumb" class="touch-joystick-thumb" style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: radial-gradient(circle, #38bdf8 0%, #0284c7 100%);
          border: 2px solid #e0f2fe;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.6);
          position: absolute;
          transform: translate(0px, 0px);
          transition: transform 0.04s ease-out;
          pointer-events: none;
        "></div>
      </div>

      <!-- Virtual Action Buttons Cluster (Bottom-Right) -->
      <div id="touch-action-cluster" class="touch-action-cluster" style="
        position: absolute;
        bottom: max(20px, env(safe-area-inset-bottom, 20px));
        right: max(20px, env(safe-area-inset-right, 20px));
        width: 170px;
        height: 170px;
        pointer-events: auto;
        touch-action: none;
      ">
        <!-- [A] Attack Button (Primary Green) -->
        <button id="touch-btn-attack" class="touch-btn touch-btn-primary" style="
          position: absolute;
          bottom: 12px;
          right: 6px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, #10b981 0%, #047857 100%);
          border: 3px solid #a7f3d0;
          box-shadow: 0 4px 14px rgba(4, 120, 87, 0.65);
          color: #ffffff;
          font-family: 'Press Start 2P', monospace;
          font-size: 13px;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          touch-action: none;
        ">
          <span>A</span>
          <span style="font-size: 7px; opacity: 0.85;">ATK</span>
        </button>

        <!-- [E] Interact Button (Amber Gold) -->
        <button id="touch-btn-interact" class="touch-btn touch-btn-interact" style="
          position: absolute;
          bottom: 74px;
          right: 28px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle, #f59e0b 0%, #b45309 100%);
          border: 2px solid #fde68a;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.6);
          color: #ffffff;
          font-family: 'Press Start 2P', monospace;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          touch-action: none;
        ">
          <span>E</span>
          <span style="font-size: 6px; opacity: 0.85;">USE</span>
        </button>

        <!-- [B] Dodge Roll Button (Azure Blue) -->
        <button id="touch-btn-roll" class="touch-btn touch-btn-roll" style="
          position: absolute;
          bottom: 6px;
          right: 80px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%);
          border: 2px solid #bfdbfe;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.6);
          color: #ffffff;
          font-family: 'Press Start 2P', monospace;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          touch-action: none;
        ">
          <span>B</span>
          <span style="font-size: 6px; opacity: 0.85;">ROLL</span>
        </button>

        <!-- [Z] Class Ability 1 Button (Violet Purple) -->
        <button id="touch-btn-ability-1" class="touch-btn touch-btn-ability" style="
          position: absolute;
          top: 16px;
          left: 14px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%);
          border: 2px solid #ddd6fe;
          box-shadow: 0 3px 10px rgba(109, 40, 217, 0.55);
          color: #ffffff;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          touch-action: none;
        ">
          <span>Z</span>
          <span style="font-size: 5px; opacity: 0.85;">AB1</span>
        </button>

        <!-- [X] Class Ability 2 Button (Fuchsia Pink) -->
        <button id="touch-btn-ability-2" class="touch-btn touch-btn-ability" style="
          position: absolute;
          top: 14px;
          right: 58px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: radial-gradient(circle, #ec4899 0%, #be185d 100%);
          border: 2px solid #fbcfe8;
          box-shadow: 0 3px 10px rgba(190, 24, 93, 0.55);
          color: #ffffff;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          touch-action: none;
        ">
          <span>X</span>
          <span style="font-size: 5px; opacity: 0.85;">AB2</span>
        </button>
      </div>
    `;

    this.stickBaseEl = document.getElementById('touch-joystick-base');
    this.stickThumbEl = document.getElementById('touch-joystick-thumb');
    this.buttonsContainerEl = document.getElementById('touch-action-cluster');

    this.setupJoystickEvents();
    this.setupButtonEvents();
  }

  private setupJoystickEvents() {
    if (!this.stickBaseEl) return;

    const onPointerDown = (e: PointerEvent) => {
      if (this.activeTouchId !== null) return;
      this.activeTouchId = e.pointerId;
      this.stickBaseEl?.setPointerCapture(e.pointerId);

      const rect = this.stickBaseEl!.getBoundingClientRect();
      this.baseCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      this.updateJoystickPosition(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== this.activeTouchId) return;
      this.updateJoystickPosition(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== this.activeTouchId) return;
      this.releaseJoystick();
      e.preventDefault();
      e.stopPropagation();
    };

    this.stickBaseEl.addEventListener('pointerdown', onPointerDown);
    this.stickBaseEl.addEventListener('pointermove', onPointerMove);
    this.stickBaseEl.addEventListener('pointerup', onPointerUp);
    this.stickBaseEl.addEventListener('pointercancel', onPointerUp);
  }

  public setBaseCenter(x: number, y: number) {
    this.baseCenter = { x, y };
  }

  public updateJoystickPosition(clientX: number, clientY: number) {
    const dx = clientX - this.baseCenter.x;
    const dy = clientY - this.baseCenter.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      this.state.vx = 0;
      this.state.vy = 0;
      this.state.active = false;
      this.state.power = 0;
      if (this.stickThumbEl) {
        this.stickThumbEl.style.transform = `translate(0px, 0px)`;
      }
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, this.maxRadius);
    const normalizedPower = clampedDist / this.maxRadius;

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    if (this.stickThumbEl) {
      this.stickThumbEl.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
    }

    if (normalizedPower < this.deadzone) {
      this.state.vx = 0;
      this.state.vy = 0;
      this.state.active = false;
      this.state.power = 0;
    } else {
      this.state.active = true;
      this.state.power = normalizedPower;
      this.state.angle = angle;
      this.state.vx = Math.cos(angle) * normalizedPower;
      this.state.vy = Math.sin(angle) * normalizedPower;
    }
  }

  public releaseJoystick() {
    this.activeTouchId = null;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.active = false;
    this.state.power = 0;
    if (this.stickThumbEl) {
      this.stickThumbEl.style.transform = `translate(0px, 0px)`;
    }
  }

  private setupButtonEvents() {
    this.wireButton('touch-btn-attack', 'isAttackDown', () => {
      const scene = this.sceneGetter();
      if (scene?.isLocalFishing) {
        scene.handleReelInput(true);
      } else {
        scene?.handleActionAttack?.();
      }
    }, () => {
      const scene = this.sceneGetter();
      if (scene?.isLocalFishing) {
        scene.handleReelInput(false);
      }
    });

    this.wireButton('touch-btn-interact', 'isInteractDown', () => {
      const scene = this.sceneGetter();
      scene?.handleActionInteract?.();
    });

    this.wireButton('touch-btn-roll', 'isRollDown', () => {
      const scene = this.sceneGetter();
      scene?.localPlayer?.roll?.();
    });

    this.wireButton('touch-btn-ability-1', 'isAbility1Down', () => {
      const scene = this.sceneGetter();
      scene?.useClassAbility?.(1);
    });

    this.wireButton('touch-btn-ability-2', 'isAbility2Down', () => {
      const scene = this.sceneGetter();
      scene?.useClassAbility?.(2);
    });
  }

  private wireButton(id: string, stateKey: keyof TouchState, action: () => void, upAction?: () => void) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const onDown = (e: Event) => {
      (this.state as any)[stateKey] = true;
      btn.style.transform = 'scale(0.88)';
      btn.style.filter = 'brightness(1.25)';

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate?.(10);
        } catch (_) {}
      }

      action();
      e.preventDefault();
      e.stopPropagation();
    };

    const onUp = (e: Event) => {
      (this.state as any)[stateKey] = false;
      btn.style.transform = 'scale(1)';
      btn.style.filter = 'none';
      if (upAction) {
        upAction();
      }
      e.preventDefault();
      e.stopPropagation();
    };

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
  }

  /**
   * Programmatic joystick vector input for testing or scripts.
   * @param vx -1.0 to 1.0
   * @param vy -1.0 to 1.0
   */
  public simulateJoystick(vx: number, vy: number) {
    const len = Math.hypot(vx, vy);
    if (len === 0) {
      this.releaseJoystick();
      return;
    }
    const clampedLen = Math.min(1.0, len);
    this.state.vx = (vx / len) * clampedLen;
    this.state.vy = (vy / len) * clampedLen;
    this.state.active = true;
    this.state.power = clampedLen;
    this.state.angle = Math.atan2(vy, vx);

    if (this.stickThumbEl) {
      const tx = this.state.vx * this.maxRadius;
      const ty = this.state.vy * this.maxRadius;
      this.stickThumbEl.style.transform = `translate(${tx}px, ${ty}px)`;
    }
  }

  /**
   * Programmatic button trigger for QA testing.
   */
  public simulateButton(btnName: 'attack' | 'interact' | 'roll' | 'ability1' | 'ability2') {
    const scene = this.sceneGetter();
    switch (btnName) {
      case 'attack':
        this.state.isAttackDown = true;
        if (scene?.isLocalFishing) {
          scene.handleReelInput(true);
          setTimeout(() => {
            this.state.isAttackDown = false;
            scene.handleReelInput(false);
          }, 80);
        } else {
          scene?.handleActionAttack?.();
          setTimeout(() => { this.state.isAttackDown = false; }, 80);
        }
        break;
      case 'interact':
        this.state.isInteractDown = true;
        scene?.handleActionInteract?.();
        setTimeout(() => { this.state.isInteractDown = false; }, 80);
        break;
      case 'roll':
        this.state.isRollDown = true;
        scene?.localPlayer?.roll?.();
        setTimeout(() => { this.state.isRollDown = false; }, 80);
        break;
      case 'ability1':
        this.state.isAbility1Down = true;
        scene?.useClassAbility?.(1);
        setTimeout(() => { this.state.isAbility1Down = false; }, 80);
        break;
      case 'ability2':
        this.state.isAbility2Down = true;
        scene?.useClassAbility?.(2);
        setTimeout(() => { this.state.isAbility2Down = false; }, 80);
        break;
    }
  }
}
