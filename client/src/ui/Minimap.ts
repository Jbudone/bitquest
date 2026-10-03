export interface MinimapPOI {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  worldX: number;
  worldY: number;
  icon: string;
  color: string;
}

export const WORLD_POIS: MinimapPOI[] = [
  { id: 'town', name: 'Oakhaven Town Plaza', tileX: 32, tileY: 29, worldX: 1024, worldY: 928, icon: '🏛️', color: '#f59e0b' },
  { id: 'bakery', name: "Grandma Bramble's Bakery", tileX: 40, tileY: 26, worldX: 1280, worldY: 832, icon: '🏡', color: '#ec4899' },
  { id: 'post', name: "Barnaby's Post & Courier", tileX: 24, tileY: 26, worldX: 768, worldY: 832, icon: '📮', color: '#38bdf8' },
  { id: 'gate', name: 'The Sunken Gate', tileX: 32, tileY: 16, worldX: 1024, worldY: 512, icon: '🗝️', color: '#a855f7' },
  { id: 'boss', name: 'Sanctuary of Spores (Boss)', tileX: 32, tileY: 9, worldX: 1024, worldY: 288, icon: '👑', color: '#ef4444' },
  { id: 'meadow', name: 'Whispering Meadow', tileX: 48, tileY: 29, worldX: 1536, worldY: 928, icon: '🍓', color: '#10b981' },
  { id: 'fungal', name: 'Fungal Hollow', tileX: 10, tileY: 28, worldX: 320, worldY: 896, icon: '🍄', color: '#8b5cf6' },
  { id: 'lake', name: 'Crystal Lake', tileX: 32, tileY: 44, worldX: 1024, worldY: 1408, icon: '🦆', color: '#06b6d4' }
];

export class MinimapManager {
  private static FOG_STORAGE_KEY = 'bitquest_fog_v1';
  public readonly mapWidth = 64;
  public readonly mapHeight = 56;
  public readonly tileSize = 32;

  // Fog matrix: 64x56, 1 = discovered, 0 = unexplored
  private fog: Uint8Array;
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;

  private hudCanvas!: HTMLCanvasElement;
  private hudCtx!: CanvasRenderingContext2D;

  private atlasCanvas!: HTMLCanvasElement;
  private atlasCtx!: CanvasRenderingContext2D;

  private isAtlasOpen = false;
  private hudVisible = true;
  private dirtyFog = true;
  private exploredCount = 0;
  private lastSaveTime = 0;

  // Quest target beacon position (if any)
  public questBeacon: { x: number; y: number; label: string } | null = null;

  constructor() {
    this.fog = new Uint8Array(this.mapWidth * this.mapHeight);
    this.loadFog();

    // Pre-render static base terrain
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = this.mapWidth;
    this.baseCanvas.height = this.mapHeight;
    this.baseCtx = this.baseCanvas.getContext('2d')!;
    this.renderBaseTerrain();

    this.setupDOM();
  }

  private loadFog() {
    try {
      const saved = localStorage.getItem(MinimapManager.FOG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === this.fog.length) {
          for (let i = 0; i < parsed.length; i++) {
            this.fog[i] = parsed[i];
            if (parsed[i] === 1) this.exploredCount++;
          }
          return;
        }
      }
    } catch {
      // Fallback to fresh fog
    }

    // Default reveal around town center (x: 28-36, y: 25-33)
    for (let y = 25; y <= 33; y++) {
      for (let x = 28; x <= 36; x++) {
        this.setExplored(x, y);
      }
    }
  }

  public saveFog(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSaveTime < 5000) return; // Debounce save every 5s
    this.lastSaveTime = now;
    try {
      localStorage.setItem(MinimapManager.FOG_STORAGE_KEY, JSON.stringify(Array.from(this.fog)));
    } catch {
      // Ignore quota errors
    }
  }

  public clearFog() {
    this.fog.fill(0);
    this.exploredCount = 0;
    this.dirtyFog = true;
    for (let y = 25; y <= 33; y++) {
      for (let x = 28; x <= 36; x++) {
        this.setExplored(x, y);
      }
    }
    this.saveFog(true);
  }

  public revealAllFog() {
    this.fog.fill(1);
    this.exploredCount = this.fog.length;
    this.dirtyFog = true;
    this.saveFog(true);
  }

  private setExplored(tileX: number, tileY: number) {
    if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) return;
    const idx = tileY * this.mapWidth + tileX;
    if (this.fog[idx] === 0) {
      this.fog[idx] = 1;
      this.exploredCount++;
      this.dirtyFog = true;
    }
  }

  public exploreAtWorld(worldX: number, worldY: number, radiusTiles = 5) {
    const centerTileX = Math.floor(worldX / this.tileSize);
    const centerTileY = Math.floor(worldY / this.tileSize);

    const r2 = radiusTiles * radiusTiles;
    for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        if (dx * dx + dy * dy <= r2) {
          this.setExplored(centerTileX + dx, centerTileY + dy);
        }
      }
    }
  }

  public getDiscoveryPercentage(): number {
    return Math.min(100, Math.round((this.exploredCount / (this.mapWidth * this.mapHeight)) * 100));
  }

  private renderBaseTerrain() {
    const ctx = this.baseCtx;
    const W = this.mapWidth;
    const H = this.mapHeight;

    // 1. Fill base biomes
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x < 20) {
          ctx.fillStyle = '#2e1065'; // Fungal Hollow purple
        } else if (x >= 20 && x <= 43 && y <= 17) {
          ctx.fillStyle = '#475569'; // Ruins stone floor
        } else if (x >= 24 && x <= 39 && y >= 24 && y <= 35) {
          ctx.fillStyle = '#94a3b8'; // Cobblestone plaza
        } else {
          ctx.fillStyle = '#15803d'; // Lush green meadow
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 2. Pathways (Dirt trails)
    ctx.fillStyle = '#b45309';
    // North path
    ctx.fillRect(31, 17, 2, 7);
    // East path
    ctx.fillRect(40, 29, 13, 2);
    // West path
    ctx.fillRect(12, 29, 12, 2);
    // South path
    ctx.fillRect(31, 36, 2, 5);

    // 3. Water (River & Lake)
    ctx.fillStyle = '#0284c7';
    // Meadow River
    for (let y = 1; y <= 54; y++) {
      if (y !== 29 && y !== 30) {
        ctx.fillRect(52, y, 2, 1);
      } else {
        ctx.fillStyle = '#78350f'; // Bridge
        ctx.fillRect(52, y, 2, 1);
        ctx.fillStyle = '#0284c7';
      }
    }
    // Crystal Lake
    for (let y = 41; y <= 54; y++) {
      for (let x = 22; x <= 42; x++) {
        if ((x === 31 || x === 32) && y <= 44) {
          ctx.fillStyle = '#78350f'; // Pier
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = '#0284c7';
        } else {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // 4. Buildings & Ruins walls
    ctx.fillStyle = '#e11d48'; // Red cottage roofs
    ctx.fillRect(22, 24, 4, 3); // Post Office
    ctx.fillRect(38, 24, 4, 3); // Bakery

    ctx.fillStyle = '#334155'; // Stone ruins walls
    ctx.strokeRect(20.5, 2.5, 23, 14);

    // 5. World Borders
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, 2);
    ctx.fillRect(0, H - 2, W, 2);
    ctx.fillRect(0, 0, 2, H);
    ctx.fillRect(W - 2, 0, 2, H);
  }

  private setupDOM() {
    // 1. Corner HUD Container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'minimap-hud-container';
    hudContainer.className = 'minimap-hud';
    hudContainer.innerHTML = `
      <div class="minimap-header">
        <span class="minimap-title">🗺️ OAKHAVEN</span>
        <span id="minimap-disc-pct" class="minimap-pct">24%</span>
      </div>
      <div class="minimap-radar-frame" title="Click or press [M] to open World Atlas">
        <canvas id="minimap-radar-canvas" width="140" height="140"></canvas>
        <div class="minimap-compass-needle">N</div>
        <div id="minimap-quest-pointer" class="minimap-quest-pointer hidden"></div>
      </div>
      <div class="minimap-hint">Press <strong>[M]</strong> for Atlas</div>
    `;

    document.getElementById('ui-overlay')?.appendChild(hudContainer);

    this.hudCanvas = document.getElementById('minimap-radar-canvas') as HTMLCanvasElement;
    this.hudCtx = this.hudCanvas.getContext('2d')!;

    // Click radar to open atlas
    hudContainer.querySelector('.minimap-radar-frame')?.addEventListener('click', () => {
      this.toggleAtlas();
    });

    // 2. Fullscreen World Atlas Modal
    const atlasModal = document.createElement('div');
    atlasModal.id = 'minimap-atlas-modal';
    atlasModal.className = 'minimap-atlas-modal hidden';
    atlasModal.innerHTML = `
      <div class="atlas-backdrop"></div>
      <div class="atlas-window">
        <div class="atlas-header">
          <div class="atlas-title-block">
            <h2>📜 Chronicles of Oakhaven: World Atlas</h2>
            <span id="atlas-discovery-badge" class="atlas-badge">Exploration: 0%</span>
          </div>
          <button id="atlas-close-btn" class="atlas-close-btn" title="Close [M / ESC]">&times;</button>
        </div>

        <div class="atlas-content">
          <div class="atlas-map-wrapper">
            <canvas id="atlas-map-canvas" width="640" height="560"></canvas>
          </div>

          <aside class="atlas-sidebar">
            <h3>📍 Key Landmarks</h3>
            <div id="atlas-poi-list" class="atlas-poi-list"></div>

            <div class="atlas-legend">
              <span class="legend-item"><span class="legend-dot player"></span> You</span>
              <span class="legend-item"><span class="legend-dot coop"></span> Adventurers</span>
              <span class="legend-item"><span class="legend-dot npc"></span> Friendly NPC</span>
              <span class="legend-item"><span class="legend-dot boss"></span> Boss Lair</span>
              <span class="legend-item"><span class="legend-dot quest"></span> Quest Beacon</span>
            </div>

            <div class="atlas-actions">
              <button id="atlas-clear-fog-btn" class="btn" style="font-size: 10px;">Reset Fog</button>
              <button id="atlas-reveal-btn" class="btn btn-primary" style="font-size: 10px;">Dev: Reveal All</button>
            </div>
          </aside>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')?.appendChild(atlasModal);

    this.atlasCanvas = document.getElementById('atlas-map-canvas') as HTMLCanvasElement;
    this.atlasCtx = this.atlasCanvas.getContext('2d')!;

    document.getElementById('atlas-close-btn')?.addEventListener('click', () => this.closeAtlas());
    atlasModal.querySelector('.atlas-backdrop')?.addEventListener('click', () => this.closeAtlas());

    document.getElementById('atlas-clear-fog-btn')?.addEventListener('click', () => {
      this.clearFog();
      (window as any).BitQuestUI?.showToast('🌫️ Exploration fog has been reset!');
    });

    document.getElementById('atlas-reveal-btn')?.addEventListener('click', () => {
      this.revealAllFog();
      (window as any).BitQuestUI?.showToast('👁️ All of Oakhaven has been revealed!');
    });

    this.renderPOIList();
  }

  private renderPOIList() {
    const listEl = document.getElementById('atlas-poi-list');
    if (!listEl) return;

    listEl.innerHTML = WORLD_POIS.map(poi => `
      <div class="atlas-poi-card" data-x="${poi.worldX}" data-y="${poi.worldY}">
        <span class="poi-icon">${poi.icon}</span>
        <div class="poi-info">
          <div class="poi-name">${poi.name}</div>
          <div class="poi-coords">${poi.worldX}, ${poi.worldY}</div>
        </div>
      </div>
    `).join('');

    // Clicking POI teleports if admin or highlights
    listEl.querySelectorAll('.atlas-poi-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const x = Number((e.currentTarget as HTMLElement).dataset.x);
        const y = Number((e.currentTarget as HTMLElement).dataset.y);
        const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
        if (scene?.localPlayer) {
          scene.localPlayer.sprite.setPosition(x, y);
          (window as any).BitQuestUI?.showToast(`📍 Traveled to ${(e.currentTarget as HTMLElement).querySelector('.poi-name')?.textContent}`);
        }
      });
    });
  }

  public toggleAtlas() {
    if (this.isAtlasOpen) {
      this.closeAtlas();
    } else {
      this.openAtlas();
    }
  }

  public openAtlas() {
    this.isAtlasOpen = true;
    document.getElementById('minimap-atlas-modal')?.classList.remove('hidden');
    const badge = document.getElementById('atlas-discovery-badge');
    if (badge) {
      badge.textContent = `Exploration: ${this.getDiscoveryPercentage()}% Discovered`;
    }
  }

  public closeAtlas() {
    this.isAtlasOpen = false;
    document.getElementById('minimap-atlas-modal')?.classList.add('hidden');
  }

  public isAtlasActive(): boolean {
    return this.isAtlasOpen;
  }

  public toggleHud(visible?: boolean) {
    this.hudVisible = visible !== undefined ? visible : !this.hudVisible;
    const hud = document.getElementById('minimap-hud-container');
    if (hud) hud.style.display = this.hudVisible ? 'flex' : 'none';
  }

  /**
   * Main render update called each frame from WorldScene
   */
  public update(playerData: { x: number; y: number; facing: number }, otherPlayers: Array<{ x: number; y: number; color?: string }>, entities: Array<{ id: string; x: number; y: number; type: string }>) {
    // 1. Mark player exploration fog
    this.exploreAtWorld(playerData.x, playerData.y, 6);
    this.saveFog(false);

    // Update percentage badge
    const pct = this.getDiscoveryPercentage();
    const pctEl = document.getElementById('minimap-disc-pct');
    if (pctEl) pctEl.innerText = `${pct}%`;

    // 2. Render Corner Radar HUD
    if (this.hudVisible) {
      this.renderRadarHUD(playerData, otherPlayers, entities);
    }

    // 3. Render Atlas if open
    if (this.isAtlasOpen) {
      this.renderFullAtlas(playerData, otherPlayers, entities);
    }
  }

  private renderRadarHUD(
    player: { x: number; y: number; facing: number },
    otherPlayers: Array<{ x: number; y: number; color?: string }>,
    entities: Array<{ id: string; x: number; y: number; type: string }>
  ) {
    const ctx = this.hudCtx;
    const w = this.hudCanvas.width;
    const h = this.hudCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 64;

    ctx.clearRect(0, 0, w, h);

    // Circular clip path for the radar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Radar background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Camera scale on radar: 1 tile in world = ~3 pixels on radar
    const zoom = 2.8;
    const playerTileX = player.x / this.tileSize;
    const playerTileY = player.y / this.tileSize;

    // Draw base map translated so player is in center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-playerTileX, -playerTileY);

    // Draw base terrain image
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.baseCanvas, 0, 0);

    // Draw Fog of War overlay
    const minTx = Math.max(0, Math.floor(playerTileX - radius / zoom - 2));
    const maxTx = Math.min(this.mapWidth - 1, Math.ceil(playerTileX + radius / zoom + 2));
    const minTy = Math.max(0, Math.floor(playerTileY - radius / zoom - 2));
    const maxTy = Math.min(this.mapHeight - 1, Math.ceil(playerTileY + radius / zoom + 2));

    ctx.fillStyle = 'rgba(8, 11, 20, 0.94)';
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const idx = ty * this.mapWidth + tx;
        if (this.fog[idx] === 0) {
          ctx.fillRect(tx, ty, 1, 1);
        }
      }
    }

    // Draw POIs if revealed
    WORLD_POIS.forEach(poi => {
      const idx = poi.tileY * this.mapWidth + poi.tileX;
      if (this.fog[idx] === 1) {
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(poi.tileX + 0.5, poi.tileY + 0.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Other Players
    otherPlayers.forEach(p => {
      const tx = p.x / this.tileSize;
      const ty = p.y / this.tileSize;
      ctx.fillStyle = p.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(tx, ty, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Entities (Boss / NPCs)
    entities.forEach(ent => {
      const tx = ent.x / this.tileSize;
      const ty = ent.y / this.tileSize;
      if (ent.type === 'boss') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tx, ty, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'npc') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(tx, ty, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Active Quest Beacon
    if (this.questBeacon) {
      const tx = this.questBeacon.x / this.tileSize;
      const ty = this.questBeacon.y / this.tileSize;
      const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 1.2 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore(); // restore transform

    // Subtle radar sweep line
    const sweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
    ctx.stroke();

    // Radar distance rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Local Player Pin at Center (cx, cy)
    ctx.save();
    ctx.translate(cx, cy);

    // Player Direction Arrow
    let rot = 0;
    if (player.facing === 0) rot = Math.PI / 2; // Down
    else if (player.facing === 1) rot = -Math.PI / 2; // Up
    else if (player.facing === 2) rot = Math.PI; // Left
    else if (player.facing === 3) rot = 0; // Right

    ctx.rotate(rot);
    ctx.fillStyle = '#4ade80'; // Emerald player dot
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.restore(); // restore clip

    // Outer decorative radar border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderFullAtlas(
    player: { x: number; y: number; facing: number },
    otherPlayers: Array<{ x: number; y: number; color?: string }>,
    entities: Array<{ id: string; x: number; y: number; type: string }>
  ) {
    const ctx = this.atlasCtx;
    const w = this.atlasCanvas.width;
    const h = this.atlasCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const scaleX = w / this.mapWidth;
    const scaleY = h / this.mapHeight;

    // 1. Draw base map
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.baseCanvas, 0, 0, w, h);

    // 2. Draw Fog
    ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
    for (let ty = 0; ty < this.mapHeight; ty++) {
      for (let tx = 0; tx < this.mapWidth; tx++) {
        const idx = ty * this.mapWidth + tx;
        if (this.fog[idx] === 0) {
          ctx.fillRect(tx * scaleX, ty * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
      }
    }

    // 3. Grid coordinates overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 10 * scaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 10 * scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 4. Landmarks / POIs
    WORLD_POIS.forEach(poi => {
      const idx = poi.tileY * this.mapWidth + poi.tileX;
      const px = poi.tileX * scaleX;
      const py = poi.tileY * scaleY;

      if (this.fog[idx] === 1) {
        // Discovered landmark
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(poi.icon, px, py - 8);
        ctx.fillText(poi.name, px, py + 14);
      } else {
        // Undiscovered mysterious marker
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', px, py + 4);
      }
    });

    // 5. Entities
    entities.forEach(ent => {
      const tx = (ent.x / this.tileSize) * scaleX;
      const ty = (ent.y / this.tileSize) * scaleY;
      if (ent.type === 'boss') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tx, ty, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('👑', tx, ty - 10);
      }
    });

    // 6. Other Players
    otherPlayers.forEach(p => {
      const px = (p.x / this.tileSize) * scaleX;
      const py = (p.y / this.tileSize) * scaleY;
      ctx.fillStyle = p.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. Local Player
    const lx = (player.x / this.tileSize) * scaleX;
    const ly = (player.y / this.tileSize) * scaleY;
    const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.2;

    ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.beginPath();
    ctx.arc(lx, ly, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', lx, ly - 10);
  }
}
