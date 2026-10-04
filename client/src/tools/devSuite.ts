import { DataRegistry } from '../../../shared/src/dataRegistry';
import { TARGET_REGISTRY, drawPlaceholderPreview, generateSampleSheetDataUrl, type TargetMeta } from './placeholderDrawers';
import { AnimatorStudio } from './animatorStudio';
import { VFXStudio } from './vfxStudio';
import { SaveStateInspector } from './saveStateInspector';
import { LevelEditorStudio } from './levelEditorStudio';
import { QuestGraphStudio } from './questGraphStudio';
import { CutsceneStudio } from './cutsceneStudio';
import { NPCScheduleStudio } from './npcScheduleStudio';
import { DungeonStudio } from './dungeonStudio';
import { SoundboardStudio } from './soundboardStudio';
import { AtmosphereStudio } from './atmosphereStudio';
import { GMConsoleStudio } from './gmConsoleStudio';
import { ProfilerStudio } from './profilerStudio';

interface Command {
  name: string;
  execute: () => void;
  undo: () => void;
}

class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  public execute(cmd: Command) {
    cmd.execute();
    this.undoStack.push(cmd);
    this.redoStack = []; // clear redo
    this.updateUI();
  }

  public undo() {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
      this.updateUI();
      showToast(`Undid: ${cmd.name}`);
    }
  }

  public redo() {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
      this.updateUI();
      showToast(`Redid: ${cmd.name}`);
    }
  }

  private updateUI() {
    const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;
    const redoBtn = document.getElementById('btn-redo') as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }
}

const commands = new CommandManager();

function showToast(msg: string) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 1800);
  }
}

// ----------------------------------------------------------------------
// Map Editor Engine
// ----------------------------------------------------------------------
const W = 64;
const H = 56;
const TILE = 32;

// Map tile types & colors
const PALETTE: Record<string, { name: string; color: string }> = {
  grass: { name: 'Lush Grass', color: '#4f933b' },
  dirt: { name: 'Dirt Path', color: '#825633' },
  cobble: { name: 'Town Cobble', color: '#64748b' },
  water: { name: 'River Water', color: '#2563eb' },
  fungal: { name: 'Fungal Grass', color: '#4a2840' },
  ruins: { name: 'Ruins Stone', color: '#475569' },
  wall: { name: 'Stone Wall', color: '#1e293b' },
  camp: { name: 'Campfire', color: '#f97316' }
};

let currentTileType = 'grass';
let selection: { x: number; y: number; w: number; h: number } | null = null;
let isDraggingSelection = false;
let dragStart = { x: 0, y: 0 };

// Initialize grid
const tileGrid: string[][] = Array.from({ length: H }, () => Array(W).fill('grass'));

// Fill default biomes
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (x < 20) tileGrid[y]![x] = 'fungal';
    else if (x >= 20 && x <= 43 && y <= 17) tileGrid[y]![x] = 'ruins';
    else if (x >= 24 && x <= 39 && y >= 24 && y <= 35) tileGrid[y]![x] = 'cobble';
    else if ((x === 52 || x === 53) && !(y === 29 || y === 30)) tileGrid[y]![x] = 'water';
  }
}

function initMapEditor() {
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;

  // Render palette buttons
  const paletteContainer = document.getElementById('palette-grid');
  if (paletteContainer) {
    paletteContainer.innerHTML = '';
    for (const [key, info] of Object.entries(PALETTE)) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
      btn.style.fontSize = '11px';
      btn.innerHTML = `<span style="width: 12px; height: 12px; background: ${info.color}; border-radius: 2px;"></span>${info.name}`;
      btn.onclick = () => {
        currentTileType = key;
        showToast(`Brush: ${info.name}`);
      };
      paletteContainer.appendChild(btn);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render tiles
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const type = tileGrid[y]![x]!;
        ctx.fillStyle = PALETTE[type]?.color || '#4f933b';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

        // Grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // Render Selection Box
    if (selection) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(selection.x * TILE, selection.y * TILE, selection.w * TILE, selection.h * TILE);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.fillRect(selection.x * TILE, selection.y * TILE, selection.w * TILE, selection.h * TILE);
      ctx.setLineDash([]);
    }
  }

  // Mouse interaction for selection
  canvas.onmousedown = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const tx = Math.floor(((e.clientX - rect.left) * scaleX) / TILE);
    const ty = Math.floor(((e.clientY - rect.top) * scaleY) / TILE);

    isDraggingSelection = true;
    dragStart = { x: Math.max(0, Math.min(W - 1, tx)), y: Math.max(0, Math.min(H - 1, ty)) };
    selection = { x: dragStart.x, y: dragStart.y, w: 1, h: 1 };
    updateSelectionUI();
    render();
  };

  canvas.onmousemove = (e) => {
    if (!isDraggingSelection) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const tx = Math.floor(((e.clientX - rect.left) * scaleX) / TILE);
    const ty = Math.floor(((e.clientY - rect.top) * scaleY) / TILE);

    const curX = Math.max(0, Math.min(W - 1, tx));
    const curY = Math.max(0, Math.min(H - 1, ty));

    const minX = Math.min(dragStart.x, curX);
    const minY = Math.min(dragStart.y, curY);
    const maxX = Math.max(dragStart.x, curX);
    const maxY = Math.max(dragStart.y, curY);

    selection = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    updateSelectionUI();
    render();
  };

  window.onmouseup = () => {
    if (isDraggingSelection) {
      isDraggingSelection = false;
      render();
    }
  };

  render();
}

function updateSelectionUI() {
  const info = document.getElementById('selection-info');
  const copilotContext = document.getElementById('copilot-context');

  if (selection && info && copilotContext) {
    info.innerHTML = `
      <strong>Selected Region:</strong><br>
      Position: (${selection.x}, ${selection.y})<br>
      Dimensions: ${selection.w} × ${selection.h} tiles (${selection.w * 32} × ${selection.h * 32}px)<br>
      Area: ${selection.w * selection.h} tiles
    `;
    copilotContext.innerText = `Selection: [${selection.x}, ${selection.y}] ${selection.w}x${selection.h}`;
  }
}

// ----------------------------------------------------------------------
// AI Copilot Generative Execution Engine
// ----------------------------------------------------------------------
function handleCopilotSubmit() {
  const input = document.getElementById('copilot-input') as HTMLInputElement;
  if (!input || !input.value.trim()) return;

  const prompt = input.value.trim().toLowerCase();
  input.value = '';

  const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');

  if (activeTab === 'tab-map') {
    if (!selection) {
      showToast('Please drag a selection on the map first!');
      return;
    }

    const { x, y, w, h } = selection;
    const prevTiles: Array<{ x: number; y: number; tile: string }> = [];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        prevTiles.push({ x: x + dx, y: y + dy, tile: tileGrid[y + dy]![x + dx]! });
      }
    }

    // AI Logic pattern matcher
    if (prompt.includes('camp') || prompt.includes('campsite') || prompt.includes('bandit')) {
      commands.execute({
        name: `AI: Generate Campsite at (${x}, ${y})`,
        execute: () => {
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              tileGrid[y + dy]![x + dx] = 'dirt';
            }
          }
          // Center campfire
          const midX = x + Math.floor(w / 2);
          const midY = y + Math.floor(h / 2);
          tileGrid[midY]![midX] = 'camp';
          initMapEditor();
        },
        undo: () => {
          for (const item of prevTiles) {
            tileGrid[item.y]![item.x] = item.tile;
          }
          initMapEditor();
        }
      });
      showToast('✨ AI Copilot: Generated cozy campsite with central campfire!');
    } else if (prompt.includes('water') || prompt.includes('pond') || prompt.includes('river')) {
      commands.execute({
        name: `AI: Water Basin at (${x}, ${y})`,
        execute: () => {
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              tileGrid[y + dy]![x + dx] = 'water';
            }
          }
          initMapEditor();
        },
        undo: () => {
          for (const item of prevTiles) {
            tileGrid[item.y]![item.x] = item.tile;
          }
          initMapEditor();
        }
      });
      showToast('✨ AI Copilot: Filled area with river water basin!');
    } else if (prompt.includes('clear') || prompt.includes('grass')) {
      commands.execute({
        name: `AI: Clear to Grass at (${x}, ${y})`,
        execute: () => {
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              tileGrid[y + dy]![x + dx] = 'grass';
            }
          }
          initMapEditor();
        },
        undo: () => {
          for (const item of prevTiles) {
            tileGrid[item.y]![item.x] = item.tile;
          }
          initMapEditor();
        }
      });
      showToast('✨ AI Copilot: Cleared area to meadow grass!');
    } else {
      // Default: Fill with current selected brush
      commands.execute({
        name: `Paint ${currentTileType} at (${x}, ${y})`,
        execute: () => {
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              tileGrid[y + dy]![x + dx] = currentTileType;
            }
          }
          initMapEditor();
        },
        undo: () => {
          for (const item of prevTiles) {
            tileGrid[item.y]![item.x] = item.tile;
          }
          initMapEditor();
        }
      });
      showToast(`✨ Painted selection with ${currentTileType}!`);
    }
  } else if (activeTab === 'tab-art') {
    const frameWInput = document.getElementById('art-frame-w') as HTMLInputElement | null;
    const frameHInput = document.getElementById('art-frame-h') as HTMLInputElement | null;
    const fpsSlider = document.getElementById('anim-fps-slider') as HTMLInputElement | null;
    const targetSelect = document.getElementById('art-target-select') as HTMLSelectElement | null;

    if (prompt.includes('16') || prompt.includes('16x16')) {
      if (frameWInput) frameWInput.value = '16';
      if (frameHInput) frameHInput.value = '16';
      frameWInput?.dispatchEvent(new Event('input'));
      frameHInput?.dispatchEvent(new Event('input'));
      showToast('✨ AI Copilot: Sliced grid configured to 16×16 px frames!');
    } else if (prompt.includes('32') || prompt.includes('32x32')) {
      if (frameWInput) frameWInput.value = '32';
      if (frameHInput) frameHInput.value = '32';
      frameWInput?.dispatchEvent(new Event('input'));
      frameHInput?.dispatchEvent(new Event('input'));
      showToast('✨ AI Copilot: Sliced grid configured to 32×32 px frames!');
    } else if (prompt.includes('faster')) {
      if (fpsSlider) {
        fpsSlider.value = String(Math.min(24, (parseInt(fpsSlider.value, 10) || 8) + 4));
        fpsSlider.dispatchEvent(new Event('input'));
      }
      showToast('✨ AI Copilot: Animation playback speed increased!');
    } else if (prompt.includes('slower')) {
      if (fpsSlider) {
        fpsSlider.value = String(Math.max(1, (parseInt(fpsSlider.value, 10) || 8) - 4));
        fpsSlider.dispatchEvent(new Event('input'));
      }
      showToast('✨ AI Copilot: Animation playback speed decreased!');
    } else if (prompt.includes('save') || prompt.includes('swap') || prompt.includes('import')) {
      document.getElementById('btn-save-art')?.click();
    } else {
      let matched = false;
      if (targetSelect) {
        for (let i = 0; i < targetSelect.options.length; i++) {
          const opt = targetSelect.options[i]!;
          if (prompt.includes(opt.value.toLowerCase()) || prompt.includes(opt.text.toLowerCase())) {
            targetSelect.selectedIndex = i;
            showToast(`✨ AI Copilot: Selected target "${opt.text}"`);
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        showToast(`✨ AI Copilot received art directive: "${prompt}"`);
      }
    }
  } else {
    showToast(`✨ AI Copilot processed: "${prompt}"`);
  }
}

// ----------------------------------------------------------------------
// Combat Sandbox Simulation Runner
// ----------------------------------------------------------------------
function initSandbox() {
  const btn = document.getElementById('btn-run-sim');
  const resultsDiv = document.getElementById('sandbox-results');
  if (!btn || !resultsDiv) return;

  btn.onclick = () => {
    resultsDiv.innerHTML = '<span style="color: #6366f1;">Simulating 1,000 battles across all matchups...</span>';

    setTimeout(() => {
      DataRegistry.initialize();
      const enemies = DataRegistry.getAllEnemies();
      let html = '';

      for (const enemy of enemies) {
        // Run simulation
        let wins = 0;
        let totalDmgTaken = 0;
        const runs = 1000;
        for (let i = 0; i < runs; i++) {
          let php = 6;
          let ehp = enemy.maxHealth;
          while (php > 0 && ehp > 0) {
            ehp -= 1; // player attack
            if (Math.random() < 0.45) { // enemy hit chance
              php -= enemy.damage;
              totalDmgTaken += enemy.damage;
            }
          }
          if (php > 0) wins++;
        }

        const winRate = (wins / runs) * 100;
        const avgDmg = (totalDmgTaken / runs).toFixed(1);
        const icon = winRate >= 70 ? '✅' : (winRate >= 30 ? '⚠️' : '❌');

        html += `
          <div style="border-bottom: 1px solid rgba(255,255,255,0.06); padding: 8px 0;">
            ${icon} <strong>Player (Wood Sword) vs ${enemy.name}</strong><br>
            &nbsp;&nbsp;• Win Rate: <strong>${winRate.toFixed(1)}%</strong> | Avg Damage Taken: <strong>${avgDmg} hearts</strong><br>
            &nbsp;&nbsp;• Max HP: ${enemy.maxHealth} | Damage: ${enemy.damage} | Speed: ${enemy.speed} | Archetype: ${enemy.aiArchetype}
          </div>
        `;
      }

      resultsDiv.innerHTML = html;
      showToast('Simulation complete!');
    }, 100);
  };
}

// ----------------------------------------------------------------------
// Quests & Entities Inspector
// ----------------------------------------------------------------------
function initInspectors() {
  DataRegistry.initialize();

  // 1. Quests
  const questContainer = document.getElementById('quest-list');
  if (questContainer) {
    const quests = DataRegistry.getAllQuests();
    questContainer.innerHTML = quests.map(q => `
      <div style="background: #0f172a; border: 1px solid var(--border); border-radius: 6px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #a5b4fc; font-size: 14px;">${q.title}</strong>
          <span style="font-size: 11px; background: rgba(99,102,241,0.2); padding: 2px 6px; border-radius: 4px;">ID: ${q.id}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">${q.description}</p>
        <div style="font-size: 11px;">
          <strong>Stages (${q.stages.length}):</strong>
          <ol style="margin-left: 20px; margin-top: 4px; color: #cbd5e1;">
            ${q.stages.map(s => `<li>${s.journalSummary} [Target: ${s.targetId}]</li>`).join('')}
          </ol>
        </div>
      </div>
    `).join('');
  }

  // 2. Items & Enemies
  const entityContainer = document.getElementById('entity-list');
  if (entityContainer) {
    const items = DataRegistry.getAllItems();
    entityContainer.innerHTML = items.map(item => `
      <div style="background: #0f172a; border: 1px solid var(--border); border-radius: 6px; padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="width: 14px; height: 14px; background: ${item.iconColor}; border-radius: 3px;"></span>
          <strong style="font-size: 13px;">${item.name}</strong>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Category: ${item.category} | Tier: ${item.tier} | Value: ${item.value} 🪙</div>
        <p style="font-size: 11px; color: #cbd5e1;">${item.description}</p>
      </div>
    `).join('');
  }
}

// ----------------------------------------------------------------------
// Art Ingestion & Spritesheet Studio
// ----------------------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  color: string;
}

interface ArtStudioState {
  loadedImage: HTMLImageElement | null;
  dataUrl: string | null;
  fileName: string;
  frameWidth: number;
  frameHeight: number;
  offsetX: number;
  offsetY: number;
  spacing: number;
  direction: number; // 0: Down, 1: Left, 2: Right, 3: Up
  fps: number;
  isPlaying: boolean;
  loopMode: 'pingpong' | 'standard';
  viewMode: 'single' | 'matrix';
  sliceMode: 'grid' | 'drag';
  dragStart: { x: number; y: number } | null;
  dragCurrent: { x: number; y: number } | null;
  isDragging: boolean;
  currentFrameIdx: number;
  pingPongStep: number;
  animTimer: any;
  zoom: number;
  hoverFrame: { col: number; row: number; idx: number } | null;
  currentTargetKey: string;
  customAssets: Set<string>;
  currentCustomImage: HTMLImageElement | null;
  currentPlaceholderFrame: number;
  currentPlaceholderTimer: any;
  activeTint: string;
  testDrive: {
    x: number;
    y: number;
    facing: number;
    moving: boolean;
    step: number;
    stepAccum: number;
    isAttacking: boolean;
    attackTimer: number;
    isRolling: boolean;
    rollTimer: number;
    rollFacing: number;
    keys: Set<string>;
    particles: Particle[];
    floatingTexts: FloatingText[];
    pot: { x: number; y: number; hp: number; maxHp: number; wobble: number };
    animReq: number | null;
  };
}

const artState: ArtStudioState = {
  loadedImage: null,
  dataUrl: null,
  fileName: '',
  frameWidth: 32,
  frameHeight: 32,
  offsetX: 0,
  offsetY: 0,
  spacing: 0,
  direction: 0,
  fps: 8,
  isPlaying: true,
  loopMode: 'pingpong',
  viewMode: 'single',
  sliceMode: 'grid',
  dragStart: null,
  dragCurrent: null,
  isDragging: false,
  currentFrameIdx: 0,
  pingPongStep: 0,
  animTimer: null,
  zoom: 1,
  hoverFrame: null,
  currentTargetKey: 'player_0',
  customAssets: new Set<string>(),
  currentCustomImage: null,
  currentPlaceholderFrame: 0,
  currentPlaceholderTimer: null,
  activeTint: 'none',
  testDrive: {
    x: 90,
    y: 60,
    facing: 0,
    moving: false,
    step: 0,
    stepAccum: 0,
    isAttacking: false,
    attackTimer: 0,
    isRolling: false,
    rollTimer: 0,
    rollFacing: 0,
    keys: new Set<string>(),
    particles: [],
    floatingTexts: [],
    pot: { x: 210, y: 60, hp: 3, maxHp: 3, wobble: 0 },
    animReq: null
  }
};

function initArtStudio() {
  const dropzone = document.getElementById('art-dropzone');
  const fileInput = document.getElementById('art-file-input') as HTMLInputElement | null;
  const categorySelect = document.getElementById('art-category-select') as HTMLSelectElement | null;
  const frameWInput = document.getElementById('art-frame-w') as HTMLInputElement | null;
  const frameHInput = document.getElementById('art-frame-h') as HTMLInputElement | null;
  const frameOxInput = document.getElementById('art-frame-ox') as HTMLInputElement | null;
  const frameOyInput = document.getElementById('art-frame-oy') as HTMLInputElement | null;
  const frameSpacingInput = document.getElementById('art-frame-spacing') as HTMLInputElement | null;
  const targetSelect = document.getElementById('art-target-select') as HTMLSelectElement | null;
  const targetShelf = document.getElementById('art-target-shelf');
  const btnSave = document.getElementById('btn-save-art') as HTMLButtonElement | null;
  const btnRevert = document.getElementById('btn-revert-art') as HTMLButtonElement | null;
  const currentCanvas = document.getElementById('art-current-canvas') as HTMLCanvasElement | null;
  const incomingCanvas = document.getElementById('art-incoming-canvas') as HTMLCanvasElement | null;
  const currentLabel = document.getElementById('art-current-label');
  const currentBadge = document.getElementById('art-current-badge');
  const currentDims = document.getElementById('art-current-dims');
  const incomingLabel = document.getElementById('art-incoming-label');
  const incomingBadge = document.getElementById('art-incoming-badge');
  const incomingDims = document.getElementById('art-incoming-dims');
  const progressStatus = document.getElementById('art-progress-status');
  const emptyNotice = document.getElementById('art-empty-notice');
  const sliceCanvas = document.getElementById('art-slice-canvas') as HTMLCanvasElement | null;
  const sliceViewport = document.getElementById('art-viewport');
  const sliceStatus = document.getElementById('art-slice-status');
  const btnAutoSlice = document.getElementById('btn-auto-slice');
  const btnSliceMode = document.getElementById('btn-slice-mode') as HTMLButtonElement | null;
  const previewCanvas = document.getElementById('art-preview-canvas') as HTMLCanvasElement | null;
  const matrixCanvas = document.getElementById('art-matrix-canvas') as HTMLCanvasElement | null;
  const dirPanel = document.getElementById('art-direction-panel');
  const dirButtons = document.querySelectorAll<HTMLButtonElement>('.anim-dir-btn');
  const fpsSlider = document.getElementById('anim-fps-slider') as HTMLInputElement | null;
  const fpsVal = document.getElementById('anim-fps-val');
  const btnAnimPlay = document.getElementById('btn-anim-play') as HTMLButtonElement | null;
  const btnAnimPrev = document.getElementById('btn-anim-prev') as HTMLButtonElement | null;
  const btnAnimNext = document.getElementById('btn-anim-next') as HTMLButtonElement | null;
  const animCounter = document.getElementById('anim-frame-counter');
  const testDriveCanvas = document.getElementById('art-testdrive-canvas') as HTMLCanvasElement | null;
  const testDriveHint = document.getElementById('testdrive-focus-hint');
  const btnTdAttack = document.getElementById('btn-td-attack');
  const btnTdRoll = document.getElementById('btn-td-roll');
  const btnTdResetPot = document.getElementById('btn-td-reset-pot');
  const zoomInBtn = document.getElementById('btn-zoom-in');
  const zoomOutBtn = document.getElementById('btn-zoom-out');
  const zoomFitBtn = document.getElementById('btn-zoom-fit');
  const zoomVal = document.getElementById('zoom-val');

  if (!sliceCanvas || !previewCanvas || !currentCanvas || !incomingCanvas) return;

  const serverBase = window.location.port === '5174' ? 'http://localhost:3001' : '';

  // --------------------------------------------------------------------
  // 1. Target Catalog & Status Watcher
  // --------------------------------------------------------------------
  let activeFilter = 'all';

  function populateTargetSelect() {
    if (!targetSelect) return;
    targetSelect.innerHTML = Object.values(TARGET_REGISTRY).map(meta => `
      <option value="${meta.key}">${meta.name} (${meta.group})</option>
    `).join('');
  }

  async function checkAssetStatus() {
    try {
      const res = await fetch(`${serverBase}/api/asset-status`);
      if (res.ok) {
        const data = await res.json();
        const customSet = new Set<string>([...(data.customSprites || []), ...(data.customTiles || [])]);
        artState.customAssets = customSet;

        if (progressStatus) {
          const total = Object.keys(TARGET_REGISTRY).length;
          const count = customSet.size;
          progressStatus.className = count > 0 ? 'art-badge-custom' : 'art-badge-procedural';
          progressStatus.innerText = `Custom Art: ${count} / ${total} Replaced`;
        }

        renderTargetShelf();
        updateCurrentTargetDisplay();
      }
    } catch {
      // Non-blocking fallback
    }
  }

  function renderTargetShelf() {
    if (!targetShelf) return;
    const targets = Object.values(TARGET_REGISTRY).filter(meta => {
      if (activeFilter === 'all') return true;
      return meta.group.toLowerCase().includes(activeFilter.toLowerCase());
    });

    targetShelf.innerHTML = '';
    targets.forEach(meta => {
      const isCustom = artState.customAssets.has(meta.key);
      const isSelected = meta.key === artState.currentTargetKey;

      const card = document.createElement('div');
      card.className = `art-target-card ${isSelected ? 'active' : ''}`;
      card.setAttribute('data-target-key', meta.key);

      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 24;
      miniCanvas.height = 24;
      miniCanvas.style.imageRendering = 'pixelated';
      const mctx = miniCanvas.getContext('2d');
      if (mctx) drawPlaceholderPreview(meta.key, mctx, 24, 24, 0, 0);

      const textWrap = document.createElement('div');
      textWrap.style.flex = '1';
      textWrap.style.minWidth = '0';

      const titleLine = document.createElement('div');
      titleLine.style.display = 'flex';
      titleLine.style.justifyContent = 'space-between';
      titleLine.style.alignItems = 'center';

      const titleText = document.createElement('strong');
      titleText.style.fontSize = '11px';
      titleText.style.color = isSelected ? '#a5b4fc' : '#fff';
      titleText.style.whiteSpace = 'nowrap';
      titleText.style.overflow = 'hidden';
      titleText.style.textOverflow = 'ellipsis';
      titleText.innerText = meta.name;

      const badge = document.createElement('span');
      badge.className = isCustom ? 'art-badge-custom' : 'art-badge-procedural';
      badge.innerText = isCustom ? 'Custom' : 'Default';

      titleLine.appendChild(titleText);
      titleLine.appendChild(badge);

      const subText = document.createElement('div');
      subText.style.fontSize = '9px';
      subText.style.color = 'var(--text-muted)';
      subText.innerText = `${meta.width}×${meta.height}px • ${meta.frames} Frames`;

      textWrap.appendChild(titleLine);
      textWrap.appendChild(subText);

      card.appendChild(miniCanvas);
      card.appendChild(textWrap);

      card.addEventListener('click', () => {
        selectTarget(meta.key);
      });

      targetShelf.appendChild(card);
    });
  }

  function selectTarget(key: string) {
    artState.currentTargetKey = key;
    if (targetSelect) targetSelect.value = key;

    // Highlight card in shelf
    document.querySelectorAll('.art-target-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-target-key') === key);
    });

    const meta = TARGET_REGISTRY[key];
    if (meta) {
      if (categorySelect) categorySelect.value = meta.category === 'tile' ? 'tile' : (meta.category === 'prop' ? 'item' : 'character');
      if (frameWInput && !artState.loadedImage) frameWInput.value = String(meta.width);
      if (frameHInput && !artState.loadedImage) frameHInput.value = String(meta.height);
      artState.frameWidth = parseInt(frameWInput?.value || '32', 10);
      artState.frameHeight = parseInt(frameHInput?.value || '32', 10);
    }

    if (artState.customAssets.has(key)) {
      const sub = meta?.category === 'tile' ? 'tiles' : 'sprites';
      const img = new Image();
      img.onload = () => {
        artState.currentCustomImage = img;
        updateCurrentTargetDisplay();
      };
      img.src = `/assets/${sub}/${key}.png?t=${Date.now()}`;
    } else {
      artState.currentCustomImage = null;
      updateCurrentTargetDisplay();
    }
  }

  function updateCurrentTargetDisplay() {
    const meta = TARGET_REGISTRY[artState.currentTargetKey];
    if (!meta) return;

    const isCustom = artState.customAssets.has(artState.currentTargetKey);

    if (currentLabel) currentLabel.innerText = meta.name;
    if (currentBadge) {
      currentBadge.className = isCustom ? 'art-badge-custom' : 'art-badge-procedural';
      currentBadge.innerText = isCustom ? 'Custom Art Active' : 'Procedural Default';
    }
    if (currentDims) {
      currentDims.innerText = `${meta.width}×${meta.height}px • ${meta.frames} Frames`;
    }

    if (btnRevert) {
      btnRevert.disabled = !isCustom;
      btnRevert.style.opacity = isCustom ? '1' : '0.4';
      btnRevert.style.cursor = isCustom ? 'pointer' : 'not-allowed';
    }

    renderCurrentPlaceholderFrame();
  }

  function renderCurrentPlaceholderFrame() {
    if (!currentCanvas) return;
    const ctx = currentCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

    if (artState.currentCustomImage) {
      const img = artState.currentCustomImage;
      const meta = TARGET_REGISTRY[artState.currentTargetKey];
      const fw = meta ? meta.width : 32;
      const fh = meta ? meta.height : 32;
      const cols = Math.max(1, Math.floor(img.width / fw));
      const col = artState.currentPlaceholderFrame % cols;
      const row = 0;

      const scale = Math.max(1, Math.min(Math.floor(64 / fw), Math.floor(64 / fh), 3));
      const dw = fw * scale;
      const dh = fh * scale;
      const dx = Math.floor((currentCanvas.width - dw) / 2);
      const dy = Math.floor((currentCanvas.height - dh) / 2);

      ctx.drawImage(img, col * fw, row * fh, fw, fh, dx, dy, dw, dh);
    } else {
      drawPlaceholderPreview(
        artState.currentTargetKey,
        ctx,
        currentCanvas.width,
        currentCanvas.height,
        0,
        artState.currentPlaceholderFrame
      );
    }
  }

  if (artState.currentPlaceholderTimer) clearInterval(artState.currentPlaceholderTimer);
  artState.currentPlaceholderTimer = setInterval(() => {
    artState.currentPlaceholderFrame = (artState.currentPlaceholderFrame + 1) % 4;
    renderCurrentPlaceholderFrame();
  }, 250);

  // Filter Buttons
  document.querySelectorAll<HTMLButtonElement>('.art-target-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.art-target-filter').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      activeFilter = target.getAttribute('data-filter') || 'all';
      renderTargetShelf();
    });
  });

  // Revert Button
  btnRevert?.addEventListener('click', async () => {
    const key = artState.currentTargetKey;
    const meta = TARGET_REGISTRY[key];
    if (!meta || !artState.customAssets.has(key)) return;

    btnRevert.disabled = true;
    btnRevert.innerText = '↺ Reverting...';

    try {
      const res = await fetch(`${serverBase}/api/revert-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: key, category: meta.category })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`↺ Restored procedural default for "${meta.name}"!`);
        artState.customAssets.delete(key);
        artState.currentCustomImage = null;
        await checkAssetStatus();
      } else {
        showToast(`⚠️ Revert failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      showToast(`⚠️ Network error: ${err.message}`);
    } finally {
      btnRevert.disabled = false;
      btnRevert.innerText = '↺ Revert to Default';
    }
  });

  // --------------------------------------------------------------------
  // 2. Incoming Image & Slicing Canvas
  // --------------------------------------------------------------------
  function updateZoom() {
    if (sliceCanvas) {
      sliceCanvas.style.transform = `scale(${artState.zoom})`;
    }
    if (zoomVal) {
      zoomVal.innerText = `${Math.round(artState.zoom * 100)}%`;
    }
  }

  zoomInBtn?.addEventListener('click', () => {
    artState.zoom = Math.min(4, artState.zoom + 0.25);
    updateZoom();
  });

  zoomOutBtn?.addEventListener('click', () => {
    artState.zoom = Math.max(0.25, artState.zoom - 0.25);
    updateZoom();
  });

  zoomFitBtn?.addEventListener('click', () => {
    if (!sliceCanvas || !sliceViewport) return;
    const pad = 60;
    const vw = sliceViewport.clientWidth - pad;
    const vh = sliceViewport.clientHeight - pad;
    const fitZoom = Math.min(vw / sliceCanvas.width, vh / sliceCanvas.height, 2);
    artState.zoom = Math.max(0.25, Math.min(fitZoom, 3));
    updateZoom();
  });

  // Background switcher
  document.querySelectorAll<HTMLButtonElement>('.bg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      const bg = target.getAttribute('data-bg') || 'dark';
      if (sliceViewport) {
        sliceViewport.className = `bg-grid-${bg}`;
      }
    });
  });

  // Drag-to-Slice Mode Toggle
  btnSliceMode?.addEventListener('click', () => {
    artState.sliceMode = artState.sliceMode === 'grid' ? 'drag' : 'grid';
    if (btnSliceMode) {
      if (artState.sliceMode === 'drag') {
        btnSliceMode.classList.add('btn-primary');
        btnSliceMode.innerText = '📐 Box: Dragging';
        showToast('📐 Drag Marquee Mode: Click and drag on the sheet to define frame size!');
      } else {
        btnSliceMode.classList.remove('btn-primary');
        btnSliceMode.innerText = '📐 Drag Box';
      }
    }
    renderSliceCanvas();
  });

  // Auto-Detect Slices (Alpha Scanner)
  btnAutoSlice?.addEventListener('click', () => {
    if (!artState.loadedImage) {
      showToast('⚠️ Load an image or demo sheet first before auto-detecting slices!');
      return;
    }
    const img = artState.loadedImage;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tctx = tempCanvas.getContext('2d')!;
    tctx.drawImage(img, 0, 0);

    const candidates = [16, 24, 32, 48, 64];
    let bestW = 32;
    let bestH = 32;
    let bestScore = -1;

    for (const c of candidates) {
      if (img.width % c === 0 && img.height % c === 0) {
        const cols = img.width / c;
        const rows = img.height / c;
        let score = 10;
        if (cols === 3 && rows === 4) score += 50; // Standard 4-dir 3-frame sheet
        if (cols === 4 && rows === 4) score += 40;
        if (cols === 8 && rows === 1) score += 30;
        if (score > bestScore) {
          bestScore = score;
          bestW = c;
          bestH = c;
        }
      }
    }

    artState.frameWidth = bestW;
    artState.frameHeight = bestH;
    artState.offsetX = 0;
    artState.offsetY = 0;
    artState.spacing = 0;
    if (frameWInput) frameWInput.value = String(bestW);
    if (frameHInput) frameHInput.value = String(bestH);
    if (frameOxInput) frameOxInput.value = '0';
    if (frameOyInput) frameOyInput.value = '0';
    if (frameSpacingInput) frameSpacingInput.value = '0';

    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
    showToast(`🪄 Auto-Slice detected: ${bestW}×${bestH}px grid (${Math.floor(img.width / bestW)}×${Math.floor(img.height / bestH)} frames)!`);
  });

  function renderSliceCanvas() {
    if (!sliceCanvas || !artState.loadedImage) return;
    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const ox = artState.offsetX;
    const oy = artState.offsetY;
    const sp = artState.spacing;

    sliceCanvas.width = img.width;
    sliceCanvas.height = img.height;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(img, 0, 0);

    const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));
    const rows = Math.max(1, Math.floor((img.height - oy) / (fh + sp)));

    // Highlight active direction row for characters
    const category = categorySelect?.value || 'character';
    if ((category === 'character' || category === 'monster') && artState.direction < rows) {
      const rowY = oy + artState.direction * (fh + sp);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.fillRect(0, rowY, img.width, fh);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, rowY, img.width, fh);
    }

    // Grid cut lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let c = 0; c <= cols; c++) {
      const x = ox + c * (fw + sp);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, img.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = oy + r * (fh + sp);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(img.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Frame badges
    ctx.font = '9px monospace';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const frameIdx = r * cols + c;
        const fx = ox + c * (fw + sp) + 2;
        const fy = oy + r * (fh + sp) + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(fx - 1, fy - 8, 18, 10);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${frameIdx}`, fx + 1, fy);
      }
    }

    // Neon Hover Frame Indicator
    if (artState.hoverFrame && artState.sliceMode === 'grid') {
      const { col, row } = artState.hoverFrame;
      if (col < cols && row < rows) {
        const hx = ox + col * (fw + sp);
        const hy = oy + row * (fh + sp);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, hy, fw, fh);
      }
    }

    // Live Marquee Drag Box
    if (artState.isDragging && artState.dragStart && artState.dragCurrent) {
      const dx = Math.min(artState.dragStart.x, artState.dragCurrent.x);
      const dy = Math.min(artState.dragStart.y, artState.dragCurrent.y);
      const dw = Math.abs(artState.dragCurrent.x - artState.dragStart.x);
      const dh = Math.abs(artState.dragCurrent.y - artState.dragStart.y);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx, dy, dw, dh);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dx, dy - 14, 60, 12);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${Math.round(dw)}×${Math.round(dh)}px`, dx + 3, dy - 5);
    }
  }

  // Interactive mouse handlers on slice canvas
  sliceCanvas.addEventListener('mousedown', (e) => {
    if (!artState.loadedImage) return;
    const rect = sliceCanvas.getBoundingClientRect();
    const scaleX = sliceCanvas.width / rect.width;
    const scaleY = sliceCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (artState.sliceMode === 'drag') {
      artState.isDragging = true;
      artState.dragStart = { x: mx, y: my };
      artState.dragCurrent = { x: mx, y: my };
      renderSliceCanvas();
    }
  });

  window.addEventListener('mouseup', () => {
    if (artState.isDragging && artState.dragStart && artState.dragCurrent) {
      const dw = Math.abs(artState.dragCurrent.x - artState.dragStart.x);
      const dh = Math.abs(artState.dragCurrent.y - artState.dragStart.y);

      if (dw >= 8 && dh >= 8) {
        artState.frameWidth = Math.round(dw);
        artState.frameHeight = Math.round(dh);
        artState.offsetX = Math.round(Math.min(artState.dragStart.x, artState.dragCurrent.x));
        artState.offsetY = Math.round(Math.min(artState.dragStart.y, artState.dragCurrent.y));

        if (frameWInput) frameWInput.value = String(artState.frameWidth);
        if (frameHInput) frameHInput.value = String(artState.frameHeight);
        if (frameOxInput) frameOxInput.value = String(artState.offsetX);
        if (frameOyInput) frameOyInput.value = String(artState.offsetY);

        showToast(`📐 Marquee Box Applied: ${artState.frameWidth}×${artState.frameHeight}px!`);
      }

      artState.isDragging = false;
      artState.dragStart = null;
      artState.dragCurrent = null;
      renderSliceCanvas();
      renderIncomingCard();
      renderPreview();
    }
  });

  sliceCanvas.addEventListener('mousemove', (e) => {
    if (!artState.loadedImage) return;
    const rect = sliceCanvas.getBoundingClientRect();
    const scaleX = sliceCanvas.width / rect.width;
    const scaleY = sliceCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (artState.isDragging && artState.dragStart) {
      artState.dragCurrent = { x: mx, y: my };
      renderSliceCanvas();
      return;
    }

    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const ox = artState.offsetX;
    const oy = artState.offsetY;
    const sp = artState.spacing;

    const col = Math.floor((mx - ox) / (fw + sp));
    const row = Math.floor((my - oy) / (fh + sp));
    const cols = Math.max(1, Math.floor((artState.loadedImage.width - ox) / (fw + sp)));
    const rows = Math.max(1, Math.floor((artState.loadedImage.height - oy) / (fh + sp)));

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      artState.hoverFrame = { col, row, idx };
      if (sliceStatus) {
        sliceStatus.innerText = `Frame #${idx} (Col ${col}, Row ${row}) • ${fw}×${fh}px • Click to preview`;
      }
      renderSliceCanvas();
    }
  });

  sliceCanvas.addEventListener('mouseleave', () => {
    if (!artState.isDragging) {
      artState.hoverFrame = null;
      if (sliceStatus) sliceStatus.innerText = 'Hover a frame to inspect';
      renderSliceCanvas();
    }
  });

  sliceCanvas.addEventListener('click', () => {
    if (artState.hoverFrame && artState.sliceMode === 'grid') {
      artState.direction = Math.min(3, artState.hoverFrame.row);
      artState.currentFrameIdx = artState.hoverFrame.col;
      dirButtons.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-dir') === String(artState.direction));
      });
      renderSliceCanvas();
      renderPreview();
    }
  });

  function renderIncomingCard() {
    if (!incomingCanvas) return;
    const ctx = incomingCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, incomingCanvas.width, incomingCanvas.height);

    if (!artState.loadedImage) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(20, 20, 32, 32);
      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.fillText('📥', 28, 42);
      if (incomingLabel) incomingLabel.innerText = 'None Loaded';
      if (incomingBadge) incomingBadge.innerText = 'Drop image below';
      if (incomingDims) incomingDims.innerText = '-- × --px';
      return;
    }

    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const ox = artState.offsetX;
    const oy = artState.offsetY;
    const sp = artState.spacing;
    const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));
    const rows = Math.max(1, Math.floor((img.height - oy) / (fh + sp)));

    const col = artState.currentFrameIdx % cols;
    const row = Math.min(artState.direction, rows - 1);

    const scale = Math.max(1, Math.min(Math.floor(64 / fw), Math.floor(64 / fh), 3));
    const dw = fw * scale;
    const dh = fh * scale;
    const dx = Math.floor((incomingCanvas.width - dw) / 2);
    const dy = Math.floor((incomingCanvas.height - dh) / 2);

    ctx.drawImage(img, ox + col * (fw + sp), oy + row * (fh + sp), fw, fh, dx, dy, dw, dh);

    if (incomingLabel) incomingLabel.innerText = artState.fileName || 'custom_art.png';
    if (incomingBadge) {
      incomingBadge.className = 'art-badge-custom';
      incomingBadge.innerText = 'Ready to Hot-Swap';
    }
    if (incomingDims) {
      incomingDims.innerText = `${fw}×${fh}px • ${cols * rows} Frames`;
    }
  }

  // Load image helper
  function loadImageFromDataUrl(dataUrl: string, name: string) {
    const img = new Image();
    img.onload = () => {
      artState.loadedImage = img;
      artState.dataUrl = dataUrl;
      artState.fileName = name;

      if (emptyNotice) emptyNotice.style.display = 'none';
      if (sliceCanvas) sliceCanvas.style.display = 'block';

      renderSliceCanvas();
      renderIncomingCard();
      renderPreview();
    };
    img.src = dataUrl;
  }

  // File loading from disk
  function handleFile(file: File) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('⚠️ Please select a valid PNG or JPG image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        artState.loadedImage = img;
        artState.dataUrl = dataUrl;
        artState.fileName = file.name;

        // Auto-dimension detection
        const cat = categorySelect?.value || 'character';
        if (cat === 'character' || cat === 'monster') {
          if (img.width % 3 === 0 && img.height % 4 === 0) {
            artState.frameWidth = Math.floor(img.width / 3);
            artState.frameHeight = Math.floor(img.height / 4);
          } else if (img.width % 32 === 0 && img.height % 32 === 0) {
            artState.frameWidth = 32;
            artState.frameHeight = 32;
          } else if (img.width % 16 === 0 && img.height % 16 === 0) {
            artState.frameWidth = 16;
            artState.frameHeight = 16;
          }
        } else if (cat === 'tile') {
          artState.frameWidth = 16;
          artState.frameHeight = 16;
        } else {
          artState.frameWidth = img.width;
          artState.frameHeight = img.height;
        }

        if (frameWInput) frameWInput.value = String(artState.frameWidth);
        if (frameHInput) frameHInput.value = String(artState.frameHeight);
        if (frameOxInput) frameOxInput.value = '0';
        if (frameOyInput) frameOyInput.value = '0';
        if (frameSpacingInput) frameSpacingInput.value = '0';
        artState.offsetX = 0;
        artState.offsetY = 0;
        artState.spacing = 0;

        if (emptyNotice) emptyNotice.style.display = 'none';
        if (sliceCanvas) sliceCanvas.style.display = 'block';

        renderSliceCanvas();
        renderIncomingCard();
        renderPreview();
        showToast(`Loaded ${file.name} (${img.width}×${img.height}px)`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Quick Demo Buttons
  document.querySelectorAll<HTMLButtonElement>('.art-demo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const demo = (e.currentTarget as HTMLElement).getAttribute('data-demo') as 'hero' | 'slime' | 'tiles' | 'props';
      const sample = generateSampleSheetDataUrl(demo);

      artState.frameWidth = sample.frameW;
      artState.frameHeight = sample.frameH;
      artState.offsetX = 0;
      artState.offsetY = 0;
      artState.spacing = 0;

      if (categorySelect) categorySelect.value = sample.category;
      if (frameWInput) frameWInput.value = String(sample.frameW);
      if (frameHInput) frameHInput.value = String(sample.frameH);
      if (frameOxInput) frameOxInput.value = '0';
      if (frameOyInput) frameOyInput.value = '0';
      if (frameSpacingInput) frameSpacingInput.value = '0';

      loadImageFromDataUrl(sample.dataUrl, sample.name);
      showToast(`⚡ Loaded sample "${demo}" sheet (${sample.frameW}×${sample.frameH}px)!`);
    });
  });

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
      dropzone.style.background = 'rgba(56, 189, 248, 0.1)';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'var(--accent)';
      dropzone.style.background = 'rgba(99, 102, 241, 0.05)';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent)';
      dropzone.style.background = 'rgba(99, 102, 241, 0.05)';
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Presets
  document.querySelectorAll<HTMLButtonElement>('.art-preset-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = (e.currentTarget as HTMLElement).getAttribute('data-preset');
      if (!preset) return;
      const img = artState.loadedImage;
      if (!img) {
        if (preset === 'tile16') {
          artState.frameWidth = 16;
          artState.frameHeight = 16;
        } else {
          artState.frameWidth = 32;
          artState.frameHeight = 32;
        }
      } else {
        if (preset === 'rpg3x4') {
          artState.frameWidth = Math.floor(img.width / 3) || 32;
          artState.frameHeight = Math.floor(img.height / 4) || 32;
        } else if (preset === 'grid4x4') {
          artState.frameWidth = Math.floor(img.width / 4) || 32;
          artState.frameHeight = Math.floor(img.height / 4) || 32;
        } else if (preset === 'strip1x4') {
          artState.frameWidth = Math.floor(img.width / 4) || 32;
          artState.frameHeight = img.height || 32;
        } else if (preset === 'tile16') {
          artState.frameWidth = 16;
          artState.frameHeight = 16;
        } else if (preset === 'tile32') {
          artState.frameWidth = 32;
          artState.frameHeight = 32;
        }
      }

      if (frameWInput) frameWInput.value = String(artState.frameWidth);
      if (frameHInput) frameHInput.value = String(artState.frameHeight);
      renderSliceCanvas();
      renderIncomingCard();
      renderPreview();
      showToast(`Preset "${preset}" applied: ${artState.frameWidth}×${artState.frameHeight}px`);
    });
  });

  // Inputs
  frameWInput?.addEventListener('input', () => {
    artState.frameWidth = Math.max(8, parseInt(frameWInput.value, 10) || 32);
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  frameHInput?.addEventListener('input', () => {
    artState.frameHeight = Math.max(8, parseInt(frameHInput.value, 10) || 32);
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  frameOxInput?.addEventListener('input', () => {
    artState.offsetX = Math.max(0, parseInt(frameOxInput.value, 10) || 0);
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  frameOyInput?.addEventListener('input', () => {
    artState.offsetY = Math.max(0, parseInt(frameOyInput.value, 10) || 0);
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  frameSpacingInput?.addEventListener('input', () => {
    artState.spacing = Math.max(0, parseInt(frameSpacingInput.value, 10) || 0);
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  categorySelect?.addEventListener('change', () => {
    renderSliceCanvas();
    renderIncomingCard();
    renderPreview();
  });

  // --------------------------------------------------------------------
  // 3. Animation Studio (Single View & 4-Way Matrix)
  // --------------------------------------------------------------------
  document.querySelectorAll<HTMLButtonElement>('.anim-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.anim-mode-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      artState.viewMode = (target.getAttribute('data-mode') as 'single' | 'matrix') || 'single';

      if (previewCanvas && matrixCanvas && dirPanel) {
        if (artState.viewMode === 'single') {
          previewCanvas.style.display = 'block';
          matrixCanvas.style.display = 'none';
          dirPanel.style.display = 'block';
        } else {
          previewCanvas.style.display = 'none';
          matrixCanvas.style.display = 'block';
          dirPanel.style.display = 'none';
        }
      }
      renderPreview();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.loop-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.loop-mode-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      artState.loopMode = (target.getAttribute('data-loop') as 'pingpong' | 'standard') || 'pingpong';
    });
  });

  // Palette Tinting
  document.querySelectorAll<HTMLButtonElement>('.art-tint-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.art-tint-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      artState.activeTint = target.getAttribute('data-tint') || 'none';

      const filterMap: Record<string, string> = {
        none: 'none',
        gold: 'sepia(0.6) hue-rotate(15deg) saturate(2)',
        emerald: 'hue-rotate(90deg) saturate(1.5)',
        violet: 'hue-rotate(240deg) saturate(1.4)',
        crimson: 'hue-rotate(320deg) saturate(2)'
      };

      const cssFilter = filterMap[artState.activeTint] || 'none';
      if (previewCanvas) previewCanvas.style.filter = cssFilter;
      if (matrixCanvas) matrixCanvas.style.filter = cssFilter;
    });
  });

  dirButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      dirButtons.forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      artState.direction = parseInt(target.getAttribute('data-dir') || '0', 10);
      renderSliceCanvas();
      renderIncomingCard();
      renderPreview();
    });
  });

  btnAnimPlay?.addEventListener('click', () => {
    artState.isPlaying = !artState.isPlaying;
    if (btnAnimPlay) {
      btnAnimPlay.innerText = artState.isPlaying ? '⏸️' : '▶️';
    }
  });

  btnAnimPrev?.addEventListener('click', () => {
    if (!artState.loadedImage) return;
    const cols = Math.max(1, Math.floor(artState.loadedImage.width / artState.frameWidth));
    artState.currentFrameIdx = (artState.currentFrameIdx - 1 + cols) % cols;
    renderIncomingCard();
    renderPreview();
  });

  btnAnimNext?.addEventListener('click', () => {
    if (!artState.loadedImage) return;
    const cols = Math.max(1, Math.floor(artState.loadedImage.width / artState.frameWidth));
    artState.currentFrameIdx = (artState.currentFrameIdx + 1) % cols;
    renderIncomingCard();
    renderPreview();
  });

  fpsSlider?.addEventListener('input', () => {
    artState.fps = parseInt(fpsSlider.value, 10) || 8;
    if (fpsVal) fpsVal.innerText = `${artState.fps} FPS`;
    startAnimationTimer();
  });

  function renderPreview() {
    if (artState.viewMode === 'single') {
      renderSinglePreview();
    } else {
      renderMatrixPreview();
    }
  }

  function renderSinglePreview() {
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    if (!artState.loadedImage) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(32, 32, 32, 32);
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('🎞️', 38, 55);
      return;
    }

    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const ox = artState.offsetX;
    const oy = artState.offsetY;
    const sp = artState.spacing;
    const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));
    const rows = Math.max(1, Math.floor((img.height - oy) / (fh + sp)));

    const category = categorySelect?.value || 'character';
    const row = (category === 'character' || category === 'monster') 
      ? Math.min(artState.direction, rows - 1) 
      : 0;

    const col = artState.currentFrameIdx % cols;
    const sx = ox + col * (fw + sp);
    const sy = oy + row * (fh + sp);

    const scale = Math.max(1, Math.min(Math.floor(84 / fw), Math.floor(84 / fh), 4));
    const dw = fw * scale;
    const dh = fh * scale;
    const dx = Math.floor((previewCanvas.width - dw) / 2);
    const dy = Math.floor((previewCanvas.height - dh) / 2);

    ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);

    if (animCounter) {
      animCounter.innerText = `Frame ${col + 1}/${cols}`;
    }
  }

  function renderMatrixPreview() {
    if (!matrixCanvas) return;
    const ctx = matrixCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    if (!artState.loadedImage) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Load an image to preview all 4 directions', 10, 70);
      return;
    }

    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const ox = artState.offsetX;
    const oy = artState.offsetY;
    const sp = artState.spacing;
    const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));
    const rows = Math.max(1, Math.floor((img.height - oy) / (fh + sp)));

    const col = artState.currentFrameIdx % cols;
    const dirs = [
      { name: 'DOWN', row: 0, x: 10, y: 5 },
      { name: 'LEFT', row: 1, x: 85, y: 5 },
      { name: 'RIGHT', row: 2, x: 10, y: 70 },
      { name: 'UP', row: 3, x: 85, y: 70 }
    ];

    dirs.forEach(d => {
      const row = Math.min(d.row, rows - 1);
      const sx = ox + col * (fw + sp);
      const sy = oy + row * (fh + sp);

      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(d.x, d.y, 65, 60);

      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(d.name, d.x + 4, d.y + 10);

      const scale = Math.max(1, Math.min(Math.floor(48 / fw), Math.floor(48 / fh), 2));
      const dw = fw * scale;
      const dh = fh * scale;
      const dx = d.x + Math.floor((65 - dw) / 2);
      const dy = d.y + Math.floor((60 - dh) / 2) + 4;

      ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);
    });

    if (animCounter) {
      animCounter.innerText = `Frame ${col + 1}/${cols}`;
    }
  }

  function startAnimationTimer() {
    if (artState.animTimer) clearInterval(artState.animTimer);
    const interval = Math.max(20, Math.floor(1000 / artState.fps));

    artState.animTimer = setInterval(() => {
      if (!artState.isPlaying || !artState.loadedImage) return;

      const img = artState.loadedImage;
      const fw = artState.frameWidth;
      const ox = artState.offsetX;
      const sp = artState.spacing;
      const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));

      if (artState.loopMode === 'pingpong' && cols > 2) {
        const totalSteps = (cols - 1) * 2;
        artState.pingPongStep = (artState.pingPongStep + 1) % totalSteps;
        artState.currentFrameIdx = artState.pingPongStep < cols 
          ? artState.pingPongStep 
          : totalSteps - artState.pingPongStep;
      } else {
        artState.currentFrameIdx = (artState.currentFrameIdx + 1) % cols;
      }

      renderIncomingCard();
      renderPreview();
    }, interval);
  }

  // --------------------------------------------------------------------
  // 4. Interactive Walk & Combat Test Drive Playground
  // --------------------------------------------------------------------
  function triggerSlashAttack() {
    if (artState.testDrive.isAttacking || artState.testDrive.isRolling) return;
    artState.testDrive.isAttacking = true;
    artState.testDrive.attackTimer = 220;

    // Check hit on training pot
    const p = artState.testDrive;
    const pot = p.pot;
    const dist = Math.hypot(p.x - pot.x, p.y - pot.y);

    if (dist < 42 && pot.hp > 0) {
      pot.wobble = 18;
      pot.hp -= 1;

      // Spawn damage text
      p.floatingTexts.push({
        text: '-1 💥',
        x: pot.x,
        y: pot.y - 12,
        vy: -1.2,
        life: 40,
        color: '#f87171'
      });

      // Spawn hit spark particles
      for (let i = 0; i < 6; i++) {
        p.particles.push({
          x: pot.x + (Math.random() * 8 - 4),
          y: pot.y + (Math.random() * 8 - 4),
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 25,
          maxLife: 25,
          color: '#facc15',
          size: 2.5
        });
      }

      if (pot.hp === 0) {
        p.floatingTexts.push({
          text: '+5 🪙',
          x: pot.x,
          y: pot.y - 24,
          vy: -1.5,
          life: 50,
          color: '#fbbf24'
        });
        showToast('🏺 Shattered training pot! +5 Gold Coins!');
      }
    }
  }

  function triggerDodgeRoll() {
    if (artState.testDrive.isRolling || artState.testDrive.isAttacking) return;
    artState.testDrive.isRolling = true;
    artState.testDrive.rollTimer = 260;
    artState.testDrive.rollFacing = artState.testDrive.facing;

    // Spawn dust particles
    for (let i = 0; i < 5; i++) {
      artState.testDrive.particles.push({
        x: artState.testDrive.x + (Math.random() * 8 - 4),
        y: artState.testDrive.y + 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.2,
        life: 20,
        maxLife: 20,
        color: '#e2e8f0',
        size: 3
      });
    }
  }

  function initTestDrive() {
    if (!testDriveCanvas) return;
    const ctx = testDriveCanvas.getContext('2d');
    if (!ctx) return;

    testDriveCanvas.addEventListener('focus', () => {
      if (testDriveHint) {
        testDriveHint.innerText = '🎮 Controlling Avatar — Move: WASD | Slash: Space | Roll: Shift';
        testDriveHint.style.color = '#38bdf8';
      }
    });

    testDriveCanvas.addEventListener('blur', () => {
      if (testDriveHint) {
        testDriveHint.innerText = 'Click canvas • WASD Walk • Space Slash • Shift Roll';
        testDriveHint.style.color = '#a5b4fc';
      }
      artState.testDrive.keys.clear();
      artState.testDrive.moving = false;
    });

    testDriveCanvas.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        artState.testDrive.keys.add(k);
      } else if (e.code === 'Space') {
        e.preventDefault();
        triggerSlashAttack();
      } else if (e.key === 'Shift') {
        e.preventDefault();
        triggerDodgeRoll();
      }
    });

    testDriveCanvas.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      artState.testDrive.keys.delete(k);
    });

    btnTdAttack?.addEventListener('click', () => {
      testDriveCanvas.focus();
      triggerSlashAttack();
    });

    btnTdRoll?.addEventListener('click', () => {
      testDriveCanvas.focus();
      triggerDodgeRoll();
    });

    btnTdResetPot?.addEventListener('click', () => {
      artState.testDrive.pot.hp = 3;
      artState.testDrive.pot.wobble = 10;
      showToast('🏺 Training pot restored!');
    });

    let lastTime = performance.now();

    function loop(now: number) {
      const dt = Math.min(100, now - lastTime);
      lastTime = now;

      // Update attack / roll timers
      const td = artState.testDrive;
      if (td.isAttacking) {
        td.attackTimer -= dt;
        if (td.attackTimer <= 0) td.isAttacking = false;
      }
      if (td.isRolling) {
        td.rollTimer -= dt;
        if (td.rollTimer <= 0) td.isRolling = false;
      }
      if (td.pot.wobble > 0) {
        td.pot.wobble = Math.max(0, td.pot.wobble - dt * 0.05);
      }

      // Update movement
      const keys = td.keys;
      let vx = 0;
      let vy = 0;

      if (td.isRolling) {
        // Roll thrust in rollFacing direction
        const rollSpeed = 3.8 * (dt / 16.6);
        if (td.rollFacing === 0) vy += rollSpeed;
        else if (td.rollFacing === 1) vx -= rollSpeed;
        else if (td.rollFacing === 2) vx += rollSpeed;
        else if (td.rollFacing === 3) vy -= rollSpeed;
      } else if (!td.isAttacking) {
        if (keys.has('w') || keys.has('arrowup')) { vy -= 1; td.facing = 3; }
        if (keys.has('s') || keys.has('arrowdown')) { vy += 1; td.facing = 0; }
        if (keys.has('a') || keys.has('arrowleft')) { vx -= 1; td.facing = 1; }
        if (keys.has('d') || keys.has('arrowright')) { vx += 1; td.facing = 2; }
      }

      const isMoving = vx !== 0 || vy !== 0;
      td.moving = isMoving;

      if (isMoving) {
        const speed = (td.isRolling ? 1 : 2.0) * (dt / 16.6);
        const len = Math.hypot(vx, vy) || 1;
        td.x = Math.max(16, Math.min(testDriveCanvas!.width - 16, td.x + (vx / len) * speed));
        td.y = Math.max(16, Math.min(testDriveCanvas!.height - 16, td.y + (vy / len) * speed));

        td.stepAccum += dt;
        if (td.stepAccum >= 120) {
          td.step = (td.step + 1) % 4;
          td.stepAccum = 0;
        }
      } else {
        td.step = 0;
      }

      // Render terrain
      ctx!.imageSmoothingEnabled = false;
      ctx!.fillStyle = '#4f933b';
      ctx!.fillRect(0, 0, testDriveCanvas!.width, testDriveCanvas!.height);

      // Cobblestone path
      ctx!.fillStyle = '#7a8277';
      ctx!.fillRect(0, 48, testDriveCanvas!.width, 24);
      ctx!.fillStyle = '#9da599';
      for (let x = 4; x < testDriveCanvas!.width; x += 18) {
        ctx!.fillRect(x, 50, 14, 10);
        ctx!.fillRect(x + 8, 62, 12, 8);
      }

      // Flowers
      ctx!.fillStyle = '#facc15';
      ctx!.fillRect(24, 20, 2, 2);
      ctx!.fillRect(80, 100, 2, 2);
      ctx!.fillRect(250, 24, 2, 2);
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(160, 18, 3, 3);
      ctx!.fillRect(40, 95, 3, 3);
      ctx!.fillRect(240, 90, 3, 3);

      // Training Pot Render
      const pot = td.pot;
      ctx!.save();
      const wobbleAngle = Math.sin(performance.now() * 0.03) * (pot.wobble * 0.03);
      ctx!.translate(pot.x, pot.y);
      ctx!.rotate(wobbleAngle);

      if (pot.hp > 0) {
        // Shadow
        ctx!.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx!.beginPath();
        ctx!.ellipse(0, 14, 7, 3, 0, 0, Math.PI * 2);
        ctx!.fill();

        // Terracotta pot
        ctx!.fillStyle = '#d97706';
        ctx!.fillRect(-7, -4, 14, 16);
        ctx!.fillStyle = '#f59e0b';
        ctx!.fillRect(-8, -7, 16, 4);

        // HP bar above pot
        ctx!.fillStyle = 'rgba(0,0,0,0.5)';
        ctx!.fillRect(-10, -14, 20, 4);
        ctx!.fillStyle = '#22c55e';
        ctx!.fillRect(-9, -13, (18 * pot.hp) / pot.maxHp, 2);
      } else {
        // Shattered shards
        ctx!.fillStyle = '#d97706';
        ctx!.fillRect(-8, 8, 5, 4);
        ctx!.fillRect(2, 6, 6, 5);
        ctx!.fillRect(-3, 10, 4, 3);
        ctx!.fillStyle = '#facc15'; // Golden coin
        ctx!.beginPath();
        ctx!.arc(0, 6, 4, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();

      // Shadow under avatar
      const px = Math.round(td.x);
      const py = Math.round(td.y);
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx!.beginPath();
      ctx!.ellipse(px, py + 12, 8, 3.5, 0, 0, Math.PI * 2);
      ctx!.fill();

      // Avatar render: custom art if loaded, otherwise target placeholder
      ctx!.save();
      if (td.isRolling) {
        // Dodge roll rotation
        const rollProgress = (260 - td.rollTimer) / 260;
        ctx!.translate(px, py);
        ctx!.rotate(rollProgress * Math.PI * 2 * (td.rollFacing === 1 ? -1 : 1));
        ctx!.translate(-px, -py);
      }

      if (artState.loadedImage) {
        const img = artState.loadedImage;
        const fw = artState.frameWidth;
        const fh = artState.frameHeight;
        const ox = artState.offsetX;
        const oy = artState.offsetY;
        const sp = artState.spacing;
        const cols = Math.max(1, Math.floor((img.width - ox) / (fw + sp)));
        const rows = Math.max(1, Math.floor((img.height - oy) / (fh + sp)));

        const row = Math.min(td.facing, rows - 1);
        const col = (td.step % 3) % cols;

        ctx!.drawImage(
          img,
          ox + col * (fw + sp),
          oy + row * (fh + sp),
          fw,
          fh,
          px - Math.floor(fw / 2),
          py - Math.floor(fh / 2),
          fw,
          fh
        );
      } else {
        ctx!.translate(px - 16, py - 16);
        drawPlaceholderPreview(
          artState.currentTargetKey,
          ctx!,
          32,
          32,
          td.facing,
          td.step
        );
      }
      ctx!.restore();

      // Draw sword slash arc when attacking
      if (td.isAttacking) {
        ctx!.save();
        ctx!.translate(px, py);
        const rotMap = [Math.PI / 2, Math.PI, 0, -Math.PI / 2];
        ctx!.rotate(rotMap[td.facing] || 0);

        ctx!.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.arc(0, 0, 22, -0.6, 0.6);
        ctx!.stroke();

        ctx!.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(0, 0, 20, -0.7, 0.7);
        ctx!.stroke();
        ctx!.restore();
      }

      // Update & render particles
      for (let i = td.particles.length - 1; i >= 0; i--) {
        const pt = td.particles[i]!;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) {
          td.particles.splice(i, 1);
        } else {
          ctx!.fillStyle = pt.color;
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, (pt.size * pt.life) / pt.maxLife, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Update & render floating text
      for (let i = td.floatingTexts.length - 1; i >= 0; i--) {
        const ft = td.floatingTexts[i]!;
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) {
          td.floatingTexts.splice(i, 1);
        } else {
          ctx!.font = 'bold 11px sans-serif';
          ctx!.fillStyle = ft.color;
          ctx!.fillText(ft.text, ft.x - 10, ft.y);
        }
      }

      td.animReq = requestAnimationFrame(loop);
    }

    if (artState.testDrive.animReq) cancelAnimationFrame(artState.testDrive.animReq);
    artState.testDrive.animReq = requestAnimationFrame(loop);
  }

  // --------------------------------------------------------------------
  // 5. Hot-Swap & Persistence
  // --------------------------------------------------------------------
  btnSave?.addEventListener('click', async () => {
    if (!artState.dataUrl || !artState.loadedImage) {
      showToast('⚠️ Please load an image before saving!');
      return;
    }

    const targetKey = artState.currentTargetKey;
    const meta = TARGET_REGISTRY[targetKey];
    const category = categorySelect?.value || (meta ? meta.category : 'character');

    btnSave.disabled = true;
    btnSave.innerText = '⏳ Slicing & Saving...';

    try {
      const res = await fetch(`${serverBase}/api/import-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetKey,
          category,
          frameWidth: artState.frameWidth,
          frameHeight: artState.frameHeight,
          dataUrl: artState.dataUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✨ Target "${meta?.name || targetKey}" successfully updated with custom art!`);
        artState.customAssets.add(targetKey);
        await checkAssetStatus();
      } else {
        showToast(`⚠️ Import failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      showToast(`⚠️ Network error: ${err.message}`);
    } finally {
      btnSave.disabled = false;
      btnSave.innerText = '✨ Save & Hot-Swap Placeholder';
    }
  });

  // Boot sequence
  populateTargetSelect();
  checkAssetStatus();
  selectTarget('player_0');
  startAnimationTimer();
  initTestDrive();
}

// ----------------------------------------------------------------------
// App Boot & Hotkeys
// ----------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Animator Studio (Issue #29)
  let animatorStudio: AnimatorStudio | null = null;
  if (document.getElementById('animator-studio-container')) {
    animatorStudio = new AnimatorStudio('animator-studio-container');
    (window as any).AnimatorStudio = animatorStudio;
  }

  // Initialize VFX Studio (Issue #30)
  let vfxStudio: VFXStudio | null = null;
  if (document.getElementById('vfx-studio-container')) {
    vfxStudio = new VFXStudio('vfx-studio-container');
    (window as any).VFXStudio = vfxStudio;
  }

  // Initialize Studio-Grade Level Editor (Phase 10)
  let levelEditorStudio: LevelEditorStudio | null = null;
  if (document.getElementById('level-editor-container')) {
    levelEditorStudio = new LevelEditorStudio('level-editor-container');
    (window as any).LevelEditorStudio = levelEditorStudio;
  }

  // Initialize Save-State Inspector & Time Machine (Issue #31)
  let saveStateInspector: SaveStateInspector | null = null;
  if (document.getElementById('save-state-container')) {
    saveStateInspector = new SaveStateInspector('save-state-container');
    (window as any).SaveStateInspector = saveStateInspector;
  }

  // Initialize Visual Quest & Dialogue Graph Studio (Milestone 9.1)
  let questGraphStudio: QuestGraphStudio | null = null;
  if (document.getElementById('quest-graph-container')) {
    questGraphStudio = new QuestGraphStudio('quest-graph-container');
    (window as any).QuestGraphStudio = questGraphStudio;
  }

  // Initialize Cinematic Sequencer & Cutscene Choreographer (Milestone 9.2)
  let cutsceneStudio: CutsceneStudio | null = null;
  if (document.getElementById('cutscene-studio-container')) {
    cutsceneStudio = new CutsceneStudio('cutscene-studio-container');
    (window as any).CutsceneStudio = cutsceneStudio;
  }

  // Initialize NPC Daily Schedule & Behavior Path Router (Milestone 9.3)
  let npcScheduleStudio: NPCScheduleStudio | null = null;
  if (document.getElementById('npc-schedule-container')) {
    npcScheduleStudio = new NPCScheduleStudio('npc-schedule-container');
    (window as any).NPCScheduleStudio = npcScheduleStudio;
  }

  // Initialize Procedural Dungeon & WFC Seed Generator (Milestone 9.4)
  let dungeonStudio: DungeonStudio | null = null;
  if (document.getElementById('dungeon-studio-container')) {
    dungeonStudio = new DungeonStudio('dungeon-studio-container');
    (window as any).DungeonStudio = dungeonStudio;
  }

  // Initialize 8-Bit Retro Chiptune & Foley Soundboard (Milestone 9.5)
  let soundboardStudio: SoundboardStudio | null = null;
  if (document.getElementById('soundboard-studio-container')) {
    soundboardStudio = new SoundboardStudio('soundboard-studio-container');
    (window as any).SoundboardStudio = soundboardStudio;
  }

  // Initialize Dynamic Lighting & Atmosphere Calibration Studio (Milestone 9.6)
  let atmosphereStudio: AtmosphereStudio | null = null;
  if (document.getElementById('atmosphere-studio-container')) {
    atmosphereStudio = new AtmosphereStudio('atmosphere-studio-container');
    (window as any).AtmosphereStudio = atmosphereStudio;
  }

  // Initialize Multiplayer GM God Mode & Spectator Console (Milestone 9.7)
  let gmConsoleStudio: GMConsoleStudio | null = null;
  if (document.getElementById('gm-console-container')) {
    gmConsoleStudio = new GMConsoleStudio('gm-console-container');
    (window as any).GMConsoleStudio = gmConsoleStudio;
  }

  // Initialize Zero-Allocation Heap Watchdog & Micro-Profiler (Milestone 9.8)
  let profilerStudio: ProfilerStudio | null = null;
  if (document.getElementById('profiler-container')) {
    profilerStudio = new ProfilerStudio('profiler-container');
    (window as any).ProfilerStudio = profilerStudio;
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      (e.currentTarget as HTMLElement).classList.add('active');
      document.getElementById(target!)?.classList.add('active');

      const copilotContext = document.getElementById('copilot-context');
      if (copilotContext) {
        if (target === 'tab-map') {
          copilotContext.innerText = 'Context: Map Editor';
          levelEditorStudio?.render();
          levelEditorStudio?.renderMinimap();
        } else if (target === 'tab-sandbox') {
          copilotContext.innerText = 'Context: Combat Sandbox';
        } else if (target === 'tab-quests') {
          copilotContext.innerText = 'Context: Quests & Dialogue';
          questGraphStudio?.onTabActivated();
        } else if (target === 'tab-entities') {
          copilotContext.innerText = 'Context: Enemies & Items';
        } else if (target === 'tab-art') {
          copilotContext.innerText = 'Context: Art Studio';
        } else if (target === 'tab-animator') {
          copilotContext.innerText = 'Context: Keyframe & Hitbox Editor';
          animatorStudio?.render();
        } else if (target === 'tab-vfx') {
          copilotContext.innerText = 'Context: Live VFX Studio';
          vfxStudio?.render();
        } else if (target === 'tab-save-state') {
          copilotContext.innerText = 'Context: Save-State & Time Machine';
          saveStateInspector?.render();
        } else if (target === 'tab-cutscene') {
          copilotContext.innerText = 'Context: Cinematic Sequencer';
          cutsceneStudio?.onTabActivated();
        } else if (target === 'tab-schedules') {
          copilotContext.innerText = 'Context: NPC Schedules';
          npcScheduleStudio?.onTabActivated();
        } else if (target === 'tab-dungeon') {
          copilotContext.innerText = 'Context: Dungeon Generator & WFC';
          dungeonStudio?.onTabActivated();
        } else if (target === 'tab-soundboard') {
          copilotContext.innerText = 'Context: Chiptune & Foley Soundboard';
          soundboardStudio?.onTabActivated();
        } else if (target === 'tab-atmosphere') {
          copilotContext.innerText = 'Context: Lighting & Atmosphere Calibration';
          atmosphereStudio?.onTabActivated();
        } else if (target === 'tab-gm') {
          copilotContext.innerText = 'Context: Multiplayer GM "God Mode" Console';
          gmConsoleStudio?.onTabActivated();
        } else if (target === 'tab-profiler') {
          copilotContext.innerText = 'Context: Zero-Allocation Micro-Profiler';
          profilerStudio?.onTabActivated();
        }
      }
    });
  });

  // URL Hash Auto-Tab Switch (e.g. #tab-animator)
  if (window.location.hash) {
    const hashTab = window.location.hash.replace('#', '');
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${hashTab}"]`) as HTMLElement | null;
    tabBtn?.click();
  }

  // Undo / Redo buttons
  document.getElementById('btn-undo')?.addEventListener('click', () => {
    if (levelEditorStudio) levelEditorStudio.undo();
    else commands.undo();
  });
  document.getElementById('btn-redo')?.addEventListener('click', () => {
    if (levelEditorStudio) levelEditorStudio.redo();
    else commands.redo();
  });

  // Copilot input
  document.getElementById('btn-copilot-submit')?.addEventListener('click', handleCopilotSubmit);
  document.getElementById('copilot-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCopilotSubmit();
  });

  // Global Keyboard shortcuts (<kbd>Ctrl+Z</kbd>, <kbd>Ctrl+Y</kbd>, <kbd>Ctrl+K</kbd>)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (levelEditorStudio) levelEditorStudio.undo();
      else commands.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (levelEditorStudio) levelEditorStudio.redo();
      else commands.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('copilot-input')?.focus();
    }
  });

  // Expose global for inline click handlers
  (window as any).DevSuite = {
    setTool: (tool: string) => {
      if (levelEditorStudio) {
        levelEditorStudio.setTool(tool as any);
      } else {
        showToast(`Selected tool: ${tool}`);
      }
    }
  };

  initMapEditor();
  initSandbox();
  initInspectors();
  initArtStudio();
});
