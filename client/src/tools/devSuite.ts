import { DataRegistry } from '../../../shared/src/dataRegistry';

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
interface ArtStudioState {
  loadedImage: HTMLImageElement | null;
  dataUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  direction: number; // 0: Down, 1: Left, 2: Right, 3: Up
  fps: number;
  currentFrame: number;
  animTimer: any;
}

const artState: ArtStudioState = {
  loadedImage: null,
  dataUrl: null,
  frameWidth: 32,
  frameHeight: 32,
  direction: 0,
  fps: 8,
  currentFrame: 0,
  animTimer: null
};

function initArtStudio() {
  const dropzone = document.getElementById('art-dropzone');
  const fileInput = document.getElementById('art-file-input') as HTMLInputElement | null;
  const categorySelect = document.getElementById('art-category-select') as HTMLSelectElement | null;
  const frameWInput = document.getElementById('art-frame-w') as HTMLInputElement | null;
  const frameHInput = document.getElementById('art-frame-h') as HTMLInputElement | null;
  const targetSelect = document.getElementById('art-target-select') as HTMLSelectElement | null;
  const btnSave = document.getElementById('btn-save-art') as HTMLButtonElement | null;
  const emptyNotice = document.getElementById('art-empty-notice');
  const sliceCanvas = document.getElementById('art-slice-canvas') as HTMLCanvasElement | null;
  const previewCanvas = document.getElementById('art-preview-canvas') as HTMLCanvasElement | null;
  const dirButtons = document.querySelectorAll<HTMLButtonElement>('.anim-dir-btn');
  const fpsSlider = document.getElementById('anim-fps-slider') as HTMLInputElement | null;
  const fpsVal = document.getElementById('anim-fps-val');

  if (!sliceCanvas || !previewCanvas) return;

  function renderSliceCanvas() {
    if (!sliceCanvas || !artState.loadedImage) return;
    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;

    sliceCanvas.width = img.width;
    sliceCanvas.height = img.height;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(img, 0, 0);

    const cols = Math.max(1, Math.floor(img.width / fw));
    const rows = Math.max(1, Math.floor(img.height / fh));

    // Highlight selected row for character/monsters
    if (artState.direction < rows) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.fillRect(0, artState.direction * fh, img.width, fh);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, artState.direction * fh, img.width, fh);
    }

    // Grid cut lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * fw, 0);
      ctx.lineTo(c * fw, img.height);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * fh);
      ctx.lineTo(img.width, r * fh);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Frame coordinate badges
    ctx.font = '9px monospace';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const frameIdx = r * cols + c;
        const bx = c * fw + 2;
        const by = r * fh + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(bx - 1, by - 8, 18, 10);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${frameIdx}`, bx + 1, by);
      }
    }
  }

  function renderPreviewFrame() {
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    if (!artState.loadedImage) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(32, 32, 32, 32);
      return;
    }

    const img = artState.loadedImage;
    const fw = artState.frameWidth;
    const fh = artState.frameHeight;
    const cols = Math.max(1, Math.floor(img.width / fw));
    const rows = Math.max(1, Math.floor(img.height / fh));

    const category = categorySelect?.value || 'character';
    const row = (category === 'character' || category === 'monster') 
      ? Math.min(artState.direction, rows - 1) 
      : 0;

    const col = artState.currentFrame % cols;
    const sx = col * fw;
    const sy = row * fh;

    // Scale up frame centered in 96x96 canvas
    const scale = Math.max(1, Math.min(Math.floor(80 / fw), Math.floor(80 / fh), 4));
    const dw = fw * scale;
    const dh = fh * scale;
    const dx = Math.floor((previewCanvas.width - dw) / 2);
    const dy = Math.floor((previewCanvas.height - dh) / 2);

    ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);
  }

  function startAnimationLoop() {
    if (artState.animTimer) clearInterval(artState.animTimer);
    const interval = Math.max(20, Math.floor(1000 / artState.fps));
    artState.animTimer = setInterval(() => {
      if (!artState.loadedImage) return;
      const cols = Math.max(1, Math.floor(artState.loadedImage.width / artState.frameWidth));
      artState.currentFrame = (artState.currentFrame + 1) % cols;
      renderPreviewFrame();
    }, interval);
  }

  function handleFile(file: File) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('⚠️ Please select a valid image file (PNG or JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        artState.loadedImage = img;
        artState.dataUrl = dataUrl;

        // Auto-detect frame dimensions
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

        if (emptyNotice) emptyNotice.style.display = 'none';
        if (sliceCanvas) sliceCanvas.style.display = 'block';

        renderSliceCanvas();
        startAnimationLoop();
        showToast(`Loaded ${file.name} (${img.width}×${img.height}px)`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Setup Drag & Drop and File Input
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
      }
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

  // Frame dimension listeners
  frameWInput?.addEventListener('input', () => {
    artState.frameWidth = Math.max(8, parseInt(frameWInput.value, 10) || 32);
    renderSliceCanvas();
    renderPreviewFrame();
  });

  frameHInput?.addEventListener('input', () => {
    artState.frameHeight = Math.max(8, parseInt(frameHInput.value, 10) || 32);
    renderSliceCanvas();
    renderPreviewFrame();
  });

  categorySelect?.addEventListener('change', () => {
    if (artState.loadedImage) {
      renderSliceCanvas();
      renderPreviewFrame();
    }
  });

  // Direction buttons
  dirButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      dirButtons.forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      artState.direction = parseInt(target.getAttribute('data-dir') || '0', 10);
      renderSliceCanvas();
      renderPreviewFrame();
    });
  });

  // FPS slider
  fpsSlider?.addEventListener('input', () => {
    artState.fps = parseInt(fpsSlider.value, 10) || 8;
    if (fpsVal) fpsVal.innerText = `${artState.fps} FPS`;
    startAnimationLoop();
  });

  // Save & Hot-Swap Placeholder button
  btnSave?.addEventListener('click', async () => {
    if (!artState.dataUrl || !artState.loadedImage) {
      showToast('⚠️ Please load an image before saving!');
      return;
    }

    const targetKey = targetSelect?.value || 'player_0';
    const category = categorySelect?.value || 'character';
    btnSave.disabled = true;
    btnSave.innerText = '⏳ Saving & Slicing...';

    try {
      const serverUrl = window.location.port === '5174' ? 'http://localhost:3001/api/import-asset' : '/api/import-asset';
      const res = await fetch(serverUrl, {
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
        showToast(`✨ Target "${targetKey}" updated with custom art!`);
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

  startAnimationLoop();
}

// ----------------------------------------------------------------------
// App Boot & Hotkeys
// ----------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
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
        if (target === 'tab-map') copilotContext.innerText = 'Context: Map Editor';
        else if (target === 'tab-sandbox') copilotContext.innerText = 'Context: Combat Sandbox';
        else if (target === 'tab-quests') copilotContext.innerText = 'Context: Quests & Dialogue';
        else if (target === 'tab-entities') copilotContext.innerText = 'Context: Enemies & Items';
        else if (target === 'tab-art') copilotContext.innerText = 'Context: Art Studio';
      }
    });
  });

  // Undo / Redo buttons
  document.getElementById('btn-undo')?.addEventListener('click', () => commands.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => commands.redo());

  // Copilot input
  document.getElementById('btn-copilot-submit')?.addEventListener('click', handleCopilotSubmit);
  document.getElementById('copilot-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCopilotSubmit();
  });

  // Global Keyboard shortcuts (<kbd>Ctrl+Z</kbd>, <kbd>Ctrl+Y</kbd>, <kbd>Ctrl+K</kbd>)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      commands.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      commands.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('copilot-input')?.focus();
    }
  });

  // Expose global for inline click handlers
  (window as any).DevSuite = {
    setTool: (tool: string) => {
      showToast(`Selected tool: ${tool}`);
    }
  };

  initMapEditor();
  initSandbox();
  initInspectors();
  initArtStudio();
});
