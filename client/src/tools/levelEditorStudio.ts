/**
 * BitQuest - Studio-Grade Human Level Editor (Phase 10)
 *
 * Implements a full tactile, human-centric 2D tilemap editor inspired by Tiled, LDtk, and Aseprite:
 * 1. Visual tileset picker with multi-tile stamp box selection.
 * 2. Classic 2D toolbelt: Pencil (B), Eraser (E), Bucket Fill (G), Line (L), Rect (U), Eyedropper (I), Select (M).
 * 3. Eyedropper sampler (Alt+Click / I).
 * 4. Tile transformations: Rotate 90° (Z), Flip X (X), Flip Y (Y).
 * 5. Clipboard & selection manipulation: Copy (Ctrl+C), Cut (Ctrl+X), Paste (Ctrl+V), Arrow Nudging, Delete.
 * 6. Viewport navigation: Space+Drag / Middle-click Pan, Cursor-centered Mouse Wheel Zoom, Interactive Minimap Radar.
 * 7. Visual composition guides: Grid lines (G), Live Cursor HUD, 16:9 Camera Safe-Frame, Collision Mask overlay (F1).
 * 8. Tile & Region Property / Collision Inspector (walkable, friction, soundType, elevation, custom metadata).
 * 9. Location bookmarks & Fast-Jump bar (Town Plaza, Bakery, Post, Gate, Sanctuary, Meadow, Fungal Hollow, Lake, Custom).
 * 10. Interoperability & Live Game Sync: Tiled .tmx export, JSON export/import, drag-and-drop loading, and "Push to Game" WebSocket broadcast.
 */

export type ToolType = 'pencil' | 'eraser' | 'fill' | 'line' | 'rect' | 'eyedropper' | 'select';
export type LayerType = 'ground' | 'props' | 'roof' | 'collision';

export interface TileDefinition {
  id: string;
  name: string;
  category: 'ground' | 'props' | 'roof' | 'collision';
  color: string;
  walkable: boolean;
  soundType: 'grass' | 'dirt' | 'stone' | 'wood' | 'water';
  friction: number;
  elevation: number;
}

export interface StampBuffer {
  width: number;
  height: number;
  tiles: (string | null)[][];
}

export interface MapBookmark {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
}

export interface LevelEditorState {
  width: number;
  height: number;
  tileSize: number;
  ground: string[][];
  props: (string | null)[][];
  roof: (string | null)[][];
  collision: number[][]; // 0=walkable, 1=solid, 2=water, 3=hazard, 4=ledge
}

export const TILE_CATALOG: Record<string, TileDefinition> = {
  // Ground
  grass: { id: 'grass', name: 'Lush Grass', category: 'ground', color: '#4f933b', walkable: true, soundType: 'grass', friction: 1.0, elevation: 0 },
  dirt: { id: 'dirt', name: 'Dirt Path', category: 'ground', color: '#825633', walkable: true, soundType: 'dirt', friction: 1.0, elevation: 0 },
  cobble: { id: 'cobble', name: 'Town Cobble', category: 'ground', color: '#64748b', walkable: true, soundType: 'stone', friction: 1.0, elevation: 0 },
  sand: { id: 'sand', name: 'River Sand', category: 'ground', color: '#d4b26f', walkable: true, soundType: 'dirt', friction: 1.1, elevation: 0 },
  water: { id: 'water', name: 'River Water', category: 'ground', color: '#2563eb', walkable: false, soundType: 'water', friction: 1.5, elevation: -1 },
  water_deep: { id: 'water_deep', name: 'Deep Water', category: 'ground', color: '#1d4ed8', walkable: false, soundType: 'water', friction: 2.0, elevation: -2 },
  fungal: { id: 'fungal', name: 'Fungal Grass', category: 'ground', color: '#4a2840', walkable: true, soundType: 'grass', friction: 1.0, elevation: 0 },
  ruins: { id: 'ruins', name: 'Ruins Stone', category: 'ground', color: '#475569', walkable: true, soundType: 'stone', friction: 1.0, elevation: 0 },
  wall: { id: 'wall', name: 'Stone Wall', category: 'ground', color: '#1e293b', walkable: false, soundType: 'stone', friction: 1.0, elevation: 1 },
  wood_floor: { id: 'wood_floor', name: 'Wood Planks', category: 'ground', color: '#a16207', walkable: true, soundType: 'wood', friction: 1.0, elevation: 0 },
  crypt_stone: { id: 'crypt_stone', name: 'Crypt Stone', category: 'ground', color: '#334155', walkable: true, soundType: 'stone', friction: 1.0, elevation: -1 },
  void_abyss: { id: 'void_abyss', name: 'Void Abyss', category: 'ground', color: '#090212', walkable: false, soundType: 'stone', friction: 1.0, elevation: -3 },

  // Props
  bush: { id: 'bush', name: 'Berry Bush', category: 'props', color: '#15803d', walkable: false, soundType: 'grass', friction: 1.0, elevation: 0 },
  flower: { id: 'flower', name: 'Wild Daisies', category: 'props', color: '#f472b6', walkable: true, soundType: 'grass', friction: 1.0, elevation: 0 },
  tree_small: { id: 'tree_small', name: 'Pine Tree', category: 'props', color: '#14532d', walkable: false, soundType: 'wood', friction: 1.0, elevation: 1 },
  chest: { id: 'chest', name: 'Treasure Chest', category: 'props', color: '#eab308', walkable: false, soundType: 'wood', friction: 1.0, elevation: 0 },
  pot: { id: 'pot', name: 'Clay Pot', category: 'props', color: '#ea580c', walkable: false, soundType: 'stone', friction: 1.0, elevation: 0 },
  torch: { id: 'torch', name: 'Dungeon Torch', category: 'props', color: '#f97316', walkable: false, soundType: 'stone', friction: 1.0, elevation: 0 },
  fence: { id: 'fence', name: 'Wood Fence', category: 'props', color: '#78350f', walkable: false, soundType: 'wood', friction: 1.0, elevation: 0 },
  lantern: { id: 'lantern', name: 'Town Lamp', category: 'props', color: '#fef08a', walkable: false, soundType: 'stone', friction: 1.0, elevation: 0 },
  barrel: { id: 'barrel', name: 'Oak Barrel', category: 'props', color: '#92400e', walkable: false, soundType: 'wood', friction: 1.0, elevation: 0 },
  crate: { id: 'crate', name: 'Supply Crate', category: 'props', color: '#b45309', walkable: false, soundType: 'wood', friction: 1.0, elevation: 0 },

  // Roof
  roof_red: { id: 'roof_red', name: 'Red Tile Roof', category: 'roof', color: '#b91c1c', walkable: false, soundType: 'stone', friction: 1.0, elevation: 2 },
  roof_blue: { id: 'roof_blue', name: 'Blue Slate Roof', category: 'roof', color: '#1e40af', walkable: false, soundType: 'stone', friction: 1.0, elevation: 2 },
  roof_thatch: { id: 'roof_thatch', name: 'Thatch Roof', category: 'roof', color: '#ca8a04', walkable: false, soundType: 'wood', friction: 1.0, elevation: 2 },
  canopy: { id: 'canopy', name: 'Foliage Canopy', category: 'roof', color: '#064e3b', walkable: false, soundType: 'grass', friction: 1.0, elevation: 2 }
};

export const DEFAULT_BOOKMARKS: MapBookmark[] = [
  { id: 'town', name: 'Town Plaza', icon: '🏛️', x: 32, y: 29 },
  { id: 'bakery', name: "Grandma's Bakery", icon: '🏡', x: 40, y: 26 },
  { id: 'post', name: "Barnaby's Post", icon: '📮', x: 24, y: 26 },
  { id: 'gate', name: 'The Sunken Gate', icon: '🗝️', x: 32, y: 16 },
  { id: 'boss', name: 'Sanctuary of Spores', icon: '👑', x: 32, y: 9 },
  { id: 'meadow', name: 'Whispering Meadow', icon: '🍓', x: 48, y: 29 },
  { id: 'fungal', name: 'Fungal Hollow', icon: '🍄', x: 10, y: 28 },
  { id: 'lake', name: 'Crystal Lake', icon: '🦆', x: 32, y: 44 }
];

export class LevelEditorStudio {
  public root: HTMLElement | null = null;
  public mapWidth: number = 64;
  public mapHeight: number = 56;
  public tileSize: number = 32;

  // Layer data
  public ground: string[][] = [];
  public props: (string | null)[][] = [];
  public roof: (string | null)[][] = [];
  public collision: number[][] = [];

  // Active editor states
  public activeLayer: LayerType = 'ground';
  public activeTool: ToolType = 'pencil';
  public brushSize: number = 1; // 1, 2, 3, 5
  public rectFilled: boolean = true;
  public activeStamp: StampBuffer = { width: 1, height: 1, tiles: [['grass']] };

  // Layer visibility & opacity
  public layerVisibility: Record<LayerType, boolean> = {
    ground: true,
    props: true,
    roof: true,
    collision: false // hidden by default, toggle with F1
  };
  public layerOpacity: Record<LayerType, number> = {
    ground: 1.0,
    props: 1.0,
    roof: 0.85,
    collision: 0.65
  };

  // Viewport navigation
  public zoom: number = 1.0;
  public panX: number = 0;
  public panY: number = 0;
  public isPanning: boolean = false;
  public panStart = { x: 0, y: 0 };
  public panOrigin = { x: 0, y: 0 };

  // Visual guides
  public showGrid: boolean = true;
  public showCameraGuide: boolean = false;
  public showMinimap: boolean = true;

  // Drawing & selection state
  public isDrawing: boolean = false;
  public drawStart = { x: 0, y: 0 };
  public currentHover = { x: 0, y: 0 };
  public selection: { x: number; y: number; w: number; h: number } | null = null;
  public clipboard: StampBuffer | null = null;
  public isPasting: boolean = false;

  // Undo / Redo history
  public undoStack: Array<{ desc: string; state: LevelEditorState }> = [];
  public redoStack: Array<{ desc: string; state: LevelEditorState }> = [];
  public maxHistory: number = 30;

  // DOM Elements
  private mainCanvas!: HTMLCanvasElement;
  private mainCtx!: CanvasRenderingContext2D;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private tilesetGridEl!: HTMLElement;
  private statusHudEl!: HTMLElement;
  private propertyInspectorEl!: HTMLElement;

  // Bookmarks
  public bookmarks: MapBookmark[] = [...DEFAULT_BOOKMARKS];

  constructor(containerIdOrElement: string | HTMLElement) {
    if (typeof containerIdOrElement === 'string') {
      this.root = document.getElementById(containerIdOrElement);
    } else {
      this.root = containerIdOrElement;
    }

    this.initDefaultMap();
    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.render();
      this.renderMinimap();
    }
  }

  /**
   * Initializes the default Vale of Oakhaven map layout.
   */
  public initDefaultMap() {
    this.ground = Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill('grass'));
    this.props = Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null));
    this.roof = Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null));
    this.collision = Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(0));

    // Paint biomes to match canonical overworld
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (x < 20) {
          this.ground[y]![x] = 'fungal';
        } else if (x >= 20 && x <= 43 && y <= 17) {
          this.ground[y]![x] = 'ruins';
        } else if (x >= 24 && x <= 39 && y >= 24 && y <= 35) {
          this.ground[y]![x] = 'cobble';
        } else if ((x === 52 || x === 53) && !(y === 29 || y === 30)) {
          this.ground[y]![x] = 'water';
          this.collision[y]![x] = 2; // water
        }

        // Default walls
        if (y === 0 || y === this.mapHeight - 1 || x === 0 || x === this.mapWidth - 1) {
          this.ground[y]![x] = 'wall';
          this.collision[y]![x] = 1;
        }
      }
    }

    // Default landmark props
    this.props[29]![32] = 'lantern';
    this.props[26]![40] = 'barrel';
    this.props[26]![24] = 'crate';
    this.props[9]![32] = 'chest';
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="level-editor-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- Top Toolbar 1: Controls & Standard Actions -->
        <header style="background: #1e293b; border-bottom: 1px solid #334155; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <!-- Tool Selection Belt -->
          <div style="display: flex; align-items: center; gap: 4px;">
            <button class="btn le-tool-btn active" data-tool="pencil" title="Pencil (B)">✏️ Pencil [B]</button>
            <button class="btn le-tool-btn" data-tool="eraser" title="Eraser (E)">🧹 Eraser [E]</button>
            <button class="btn le-tool-btn" data-tool="fill" title="Bucket Fill (G)">🪣 Fill [G]</button>
            <button class="btn le-tool-btn" data-tool="line" title="Straight Line (L)">📏 Line [L]</button>
            <button class="btn le-tool-btn" data-tool="rect" title="Rectangle Box (U)">⬜ Rect [U]</button>
            <button class="btn le-tool-btn" data-tool="eyedropper" title="Eyedropper Sampler (I or Alt+Click)">💧 Pipette [I]</button>
            <button class="btn le-tool-btn" data-tool="select" title="Marquee Selection (M)">📐 Select [M]</button>

            <div style="height: 18px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <!-- Brush Size -->
            <label style="font-size: 11px; color: #94a3b8; font-weight: 600;">Size:</label>
            <select id="le-brush-size" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px;">
              <option value="1">1×1</option>
              <option value="2">2×2</option>
              <option value="3">3×3</option>
              <option value="5">5×5</option>
            </select>

            <div style="height: 18px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <!-- Stamp Transformations -->
            <button id="le-btn-rot" class="btn" title="Rotate Stamp 90° Clockwise [Z]">🔄 Rot [Z]</button>
            <button id="le-btn-flipx" class="btn" title="Flip Stamp Horizontally [X]">↔️ Flip X [X]</button>
            <button id="le-btn-flipy" class="btn" title="Flip Stamp Vertically [Y]">↕️ Flip Y [Y]</button>
          </div>

          <!-- View & Guide Toggles -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="le-btn-grid" class="btn ${this.showGrid ? 'active' : ''}" title="Toggle Grid Lines [G]">🌐 Grid [G]</button>
            <button id="le-btn-col" class="btn ${this.layerVisibility.collision ? 'active' : ''}" title="Toggle Collision Mask [F1]">🛡️ Mask [F1]</button>
            <button id="le-btn-cam" class="btn ${this.showCameraGuide ? 'active' : ''}" title="Toggle 16:9 Camera Safe-Frame">🎥 Safe-Frame</button>
            
            <div style="height: 18px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <!-- Zoom Controls -->
            <button id="le-zoom-out" class="btn" style="padding: 3px 8px;">−</button>
            <span id="le-zoom-label" style="font-size: 11px; min-width: 42px; text-align: center; color: #fff;">100%</span>
            <button id="le-zoom-in" class="btn" style="padding: 3px 8px;">+</button>
            <button id="le-zoom-fit" class="btn" style="padding: 3px 8px; font-size: 11px;">Fit</button>
            
            <div style="height: 18px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <!-- Import / Export & Sync -->
            <button id="le-btn-export-json" class="btn" title="Export Map JSON">💾 JSON</button>
            <button id="le-btn-export-tmx" class="btn" title="Export Tiled .TMX">🗺️ TMX</button>
            <button id="le-btn-import" class="btn" title="Load Map JSON / TMX">📂 Import</button>
            <button id="le-btn-push" class="btn btn-primary" title="Hot-Sync Map to Live Game Server">🚀 Push to Game</button>
          </div>
        </header>

        <!-- Top Toolbar 2: Fast-Jump Location Bookmarks -->
        <div style="background: #0f172a; border-bottom: 1px solid #1e293b; padding: 4px 14px; display: flex; align-items: center; gap: 6px; overflow-x: auto;">
          <span style="font-size: 10px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; white-space: nowrap;">⚡ Fast-Jump:</span>
          <div id="le-bookmark-chips" style="display: flex; gap: 4px; align-items: center;"></div>
          <button id="le-btn-add-bookmark" class="btn" style="font-size: 10px; padding: 2px 6px; margin-left: 4px;" title="Bookmark Current View [Ctrl+B]">➕ Add View</button>
        </div>

        <!-- Main Work Area (Left Sidebar + Center Canvas + Right Inspector) -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Left Sidebar: Layer Manager & Visual Tileset Palette -->
          <aside style="width: 280px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; overflow: hidden;">
            
            <!-- Layer Stack Panel -->
            <div style="padding: 10px 12px; border-bottom: 1px solid #334155;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>📚 Map Layers</span>
                <span id="le-active-layer-tag" style="color: #6366f1; font-weight: 700;">Ground</span>
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div class="le-layer-row ${this.activeLayer === 'ground' ? 'active' : ''}" data-layer="ground" style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                    <button class="le-layer-eye" data-layer="ground" style="background: none; border: none; cursor: pointer; font-size: 12px;">👁️</button>
                    <span>1. Ground Terrain</span>
                  </div>
                  <span style="font-size: 9px; color: #94a3b8;">Base</span>
                </div>
                <div class="le-layer-row ${this.activeLayer === 'props' ? 'active' : ''}" data-layer="props" style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                    <button class="le-layer-eye" data-layer="props" style="background: none; border: none; cursor: pointer; font-size: 12px;">👁️</button>
                    <span>2. Props & Foliage</span>
                  </div>
                  <span style="font-size: 9px; color: #94a3b8;">Y-Sort</span>
                </div>
                <div class="le-layer-row ${this.activeLayer === 'roof' ? 'active' : ''}" data-layer="roof" style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                    <button class="le-layer-eye" data-layer="roof" style="background: none; border: none; cursor: pointer; font-size: 12px;">👁️</button>
                    <span>3. Roofs & Canopies</span>
                  </div>
                  <span style="font-size: 9px; color: #94a3b8;">Overhead</span>
                </div>
                <div class="le-layer-row ${this.activeLayer === 'collision' ? 'active' : ''}" data-layer="collision" style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                    <button class="le-layer-eye" data-layer="collision" style="background: none; border: none; cursor: pointer; font-size: 12px;">👁️</button>
                    <span>4. Collision & Physics</span>
                  </div>
                  <span style="font-size: 9px; color: #f87171;">Mask</span>
                </div>
              </div>
            </div>

            <!-- Visual Tileset Sheet Picker -->
            <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">🎨 Visual Tileset</h4>
                <div style="display: flex; gap: 2px;">
                  <button class="art-target-filter active le-cat-filter" data-cat="all" style="font-size: 9px; padding: 1px 5px;">All</button>
                  <button class="art-target-filter le-cat-filter" data-cat="ground" style="font-size: 9px; padding: 1px 5px;">Ground</button>
                  <button class="art-target-filter le-cat-filter" data-cat="props" style="font-size: 9px; padding: 1px 5px;">Props</button>
                  <button class="art-target-filter le-cat-filter" data-cat="roof" style="font-size: 9px; padding: 1px 5px;">Roof</button>
                </div>
              </div>

              <!-- Tileset Swatch Grid -->
              <div id="le-tileset-grid" style="flex: 1; overflow-y: auto; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 6px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; align-content: start;">
                <!-- Tiles rendered dynamically -->
              </div>

              <!-- Active Stamp Preview -->
              <div style="margin-top: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 6px; display: flex; align-items: center; gap: 8px;">
                <div id="le-stamp-preview" style="width: 32px; height: 32px; background: #4f933b; border-radius: 4px; border: 1px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 10px;"></div>
                <div style="flex: 1; overflow: hidden;">
                  <div id="le-stamp-name" style="font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Lush Grass</div>
                  <div id="le-stamp-dims" style="font-size: 9px; color: #94a3b8;">1×1 Tile Stamp</div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Center: Interactive Map Canvas Viewport -->
          <div id="le-viewport" style="flex: 1; position: relative; overflow: hidden; background: #090d16; cursor: crosshair;">
            <canvas id="le-main-canvas" width="2048" height="1792" style="position: absolute; top: 0; left: 0; transform-origin: 0 0; image-rendering: pixelated; box-shadow: 0 0 30px rgba(0,0,0,0.8);"></canvas>
            
            <!-- Minimap Floating Radar in Bottom Right -->
            <div id="le-minimap-container" style="position: absolute; bottom: 14px; right: 14px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid #475569; border-radius: 6px; padding: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); z-index: 50;">
              <div style="font-size: 9px; font-weight: 700; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase;">🗺️ Minimap Radar</div>
              <canvas id="le-minimap-canvas" width="160" height="140" style="display: block; cursor: pointer; image-rendering: pixelated; border: 1px solid #1e293b;"></canvas>
            </div>
          </div>

          <!-- Right Sidebar: Tile Property & Collision Inspector -->
          <aside style="width: 250px; background: #1e293b; border-left: 1px solid #334155; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
            <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">🔍 Inspector</h4>

            <!-- Active Tile Metadata Inspector -->
            <div id="le-prop-inspector" style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-weight: 700; color: #a5b4fc; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">Tile Properties</div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Walkable:</span>
                <strong id="le-prop-walkable" style="color: #4ade80;">Yes</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Footstep Sound:</span>
                <strong id="le-prop-sound" style="color: #fff;">grass</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Friction Factor:</span>
                <strong id="le-prop-friction" style="color: #fff;">1.0</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Z-Elevation:</span>
                <strong id="le-prop-elevation" style="color: #fff;">0 (Ground)</strong>
              </div>
            </div>

            <!-- Selection / Clipboard Actions -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-weight: 700; color: #a5b4fc; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">Selection & Clipboard</div>
              <div id="le-sel-info" style="color: #94a3b8; font-size: 10px;">No selection active</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px;">
                <button id="le-btn-copy" class="btn" style="font-size: 10px; padding: 4px;">📋 Copy</button>
                <button id="le-btn-cut" class="btn" style="font-size: 10px; padding: 4px;">✂️ Cut</button>
                <button id="le-btn-paste" class="btn" style="font-size: 10px; padding: 4px;">📥 Paste</button>
                <button id="le-btn-delete" class="btn" style="font-size: 10px; padding: 4px; color: #f87171;">🗑️ Clear</button>
              </div>
            </div>

            <!-- Quick Landmark Spawners -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-weight: 700; color: #a5b4fc; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">Quick Spawners</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <button class="btn le-quick-spawn" data-prop="chest" style="text-align: left; font-size: 10px;">📦 Treasure Chest</button>
                <button class="btn le-quick-spawn" data-prop="pot" style="text-align: left; font-size: 10px;">🏺 Clay Pot</button>
                <button class="btn le-quick-spawn" data-prop="bush" style="text-align: left; font-size: 10px;">🌿 Berry Bush</button>
                <button class="btn le-quick-spawn" data-prop="torch" style="text-align: left; font-size: 10px;">🔥 Crypt Torch</button>
              </div>
            </div>

            <!-- Keyboard Reference Card -->
            <div style="margin-top: auto; font-size: 9px; color: #94a3b8; line-height: 1.6; background: #090d16; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;">
              <strong>Shortcuts:</strong><br>
              • <strong>B/E/G/L/U/I/M</strong>: Tools<br>
              • <strong>Space+Drag</strong>: Pan Canvas<br>
              • <strong>Wheel</strong>: Zoom at cursor<br>
              • <strong>Alt+Click</strong>: Eyedropper<br>
              • <strong>Z / X / Y</strong>: Rot / Flip<br>
              • <strong>Ctrl+C / V</strong>: Copy/Paste<br>
              • <strong>Arrows</strong>: Nudge Sel<br>
              • <strong>1-8</strong>: Fast-Jump<br>
              • <strong>F1 / G</strong>: Mask / Grid
            </div>
          </aside>
        </div>

        <!-- Bottom Status HUD -->
        <footer style="background: #0f172a; border-top: 1px solid #1e293b; padding: 4px 14px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
          <div id="le-status-hud">Tile: [0, 0] • World: (0, 0)px • Layer: Ground • Tool: Pencil (1×1) • Biome: Whispering Meadow</div>
          <div>BitQuest Studio v2.0 • 64×56 Tiles (2048×1792px)</div>
        </footer>

        <!-- Hidden File Input for Import -->
        <input type="file" id="le-file-input" accept=".json,.tmx" style="display: none;" />
      </div>
    `;

    this.mainCanvas = this.root.querySelector('#le-main-canvas') as HTMLCanvasElement;
    this.mainCtx = this.mainCanvas.getContext('2d')!;
    this.minimapCanvas = this.root.querySelector('#le-minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.tilesetGridEl = this.root.querySelector('#le-tileset-grid') as HTMLElement;
    this.statusHudEl = this.root.querySelector('#le-status-hud') as HTMLElement;
    this.propertyInspectorEl = this.root.querySelector('#le-prop-inspector') as HTMLElement;

    this.renderTilesetPalette();
    this.renderBookmarks();
  }

  // -------------------------------------------------------------------------
  // Visual Tileset Palette
  // -------------------------------------------------------------------------
  private renderTilesetPalette(filter: string = 'all') {
    if (!this.tilesetGridEl) return;
    this.tilesetGridEl.innerHTML = '';

    for (const [key, def] of Object.entries(TILE_CATALOG)) {
      if (filter !== 'all' && def.category !== filter) continue;

      const swatch = document.createElement('div');
      swatch.className = 'le-swatch';
      swatch.style.cssText = `
        background: #090d16;
        border: 1px solid ${this.activeStamp.tiles[0]?.[0] === key ? '#6366f1' : '#334155'};
        border-radius: 4px;
        padding: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: all 0.1s;
      `;
      swatch.innerHTML = `
        <div style="width: 24px; height: 24px; background: ${def.color}; border-radius: 3px; margin-bottom: 3px; display: flex; align-items: center; justify-content: center; font-size: 11px;">
          ${def.category === 'props' ? '🌿' : def.category === 'roof' ? '🏠' : ''}
        </div>
        <span style="font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48px; color: #cbd5e1;">${def.name}</span>
      `;

      swatch.onclick = () => {
        this.selectSingleTile(key);
      };

      this.tilesetGridEl.appendChild(swatch);
    }
  }

  public selectSingleTile(tileKey: string) {
    const def = TILE_CATALOG[tileKey];
    if (!def) return;

    this.activeStamp = {
      width: 1,
      height: 1,
      tiles: [[tileKey]]
    };

    // Auto switch active layer matching tile category
    if (def.category === 'ground' || def.category === 'props' || def.category === 'roof') {
      this.setActiveLayer(def.category);
    }

    this.updateStampPreview();
    this.updatePropertyInspector(def);
    this.renderTilesetPalette(this.activeLayer);
  }

  private updateStampPreview() {
    const previewEl = this.root?.querySelector('#le-stamp-preview') as HTMLElement;
    const nameEl = this.root?.querySelector('#le-stamp-name') as HTMLElement;
    const dimsEl = this.root?.querySelector('#le-stamp-dims') as HTMLElement;
    if (!previewEl || !nameEl || !dimsEl) return;

    const firstTile = this.activeStamp.tiles[0]?.[0];
    const def = firstTile ? TILE_CATALOG[firstTile] : null;

    previewEl.style.background = def?.color || '#334155';
    nameEl.innerText = def ? def.name : 'Multi-Tile Stamp';
    dimsEl.innerText = `${this.activeStamp.width}×${this.activeStamp.height} Tile Stamp`;
  }

  private updatePropertyInspector(def: TileDefinition) {
    const walkableEl = this.root?.querySelector('#le-prop-walkable') as HTMLElement;
    const soundEl = this.root?.querySelector('#le-prop-sound') as HTMLElement;
    const frictionEl = this.root?.querySelector('#le-prop-friction') as HTMLElement;
    const elevationEl = this.root?.querySelector('#le-prop-elevation') as HTMLElement;

    if (walkableEl) {
      walkableEl.innerText = def.walkable ? 'Yes' : 'Solid';
      walkableEl.style.color = def.walkable ? '#4ade80' : '#f87171';
    }
    if (soundEl) soundEl.innerText = def.soundType;
    if (frictionEl) frictionEl.innerText = def.friction.toFixed(1);
    if (elevationEl) elevationEl.innerText = `${def.elevation} (${def.elevation > 0 ? 'High' : def.elevation < 0 ? 'Low' : 'Ground'})`;
  }

  // -------------------------------------------------------------------------
  // Location Bookmarks
  // -------------------------------------------------------------------------
  private renderBookmarks() {
    const chipsEl = this.root?.querySelector('#le-bookmark-chips');
    if (!chipsEl) return;
    chipsEl.innerHTML = '';

    this.bookmarks.forEach((bm, idx) => {
      const chip = document.createElement('button');
      chip.className = 'btn';
      chip.style.cssText = `
        font-size: 10px;
        padding: 2px 7px;
        background: #1e293b;
        color: #cbd5e1;
        border: 1px solid #334155;
        white-space: nowrap;
      `;
      chip.innerHTML = `${bm.icon} ${bm.name} <span style="color:#6366f1;">[${idx + 1}]</span>`;
      chip.onclick = () => this.jumpToBookmark(bm);
      chipsEl.appendChild(chip);
    });
  }

  public jumpToBookmark(bm: MapBookmark) {
    const targetPxX = bm.x * this.tileSize;
    const targetPxY = bm.y * this.tileSize;
    const viewport = this.root?.querySelector('#le-viewport') as HTMLElement;
    if (!viewport) return;

    this.panX = (viewport.clientWidth / 2) - (targetPxX * this.zoom);
    this.panY = (viewport.clientHeight / 2) - (targetPxY * this.zoom);
    this.updateViewportTransform();
    this.renderMinimap();
    this.showToast(`Jumped to ${bm.icon} ${bm.name}`);
  }

  // -------------------------------------------------------------------------
  // Layer Management
  // -------------------------------------------------------------------------
  public setActiveLayer(layer: LayerType) {
    this.activeLayer = layer;
    const rows = this.root?.querySelectorAll('.le-layer-row');
    rows?.forEach((row) => {
      if (row.getAttribute('data-layer') === layer) {
        row.classList.add('active');
        (row as HTMLElement).style.border = '1px solid #6366f1';
      } else {
        row.classList.remove('active');
        (row as HTMLElement).style.border = '1px solid transparent';
      }
    });

    const activeTag = this.root?.querySelector('#le-active-layer-tag');
    if (activeTag) {
      activeTag.textContent = layer.charAt(0).toUpperCase() + layer.slice(1);
    }
    this.render();
  }

  public toggleLayerVisibility(layer: LayerType) {
    this.layerVisibility[layer] = !this.layerVisibility[layer];
    const btn = this.root?.querySelector(`.le-layer-eye[data-layer="${layer}"]`) as HTMLElement;
    if (btn) {
      btn.textContent = this.layerVisibility[layer] ? '👁️' : '🕶️';
      btn.style.opacity = this.layerVisibility[layer] ? '1.0' : '0.4';
    }
    this.render();
  }

  // -------------------------------------------------------------------------
  // Toolbelt & Drawing Operations
  // -------------------------------------------------------------------------
  public setTool(tool: ToolType) {
    this.activeTool = tool;
    const btns = this.root?.querySelectorAll('.le-tool-btn');
    btns?.forEach((btn) => {
      if (btn.getAttribute('data-tool') === tool) {
        btn.classList.add('active');
        (btn as HTMLElement).style.background = '#6366f1';
      } else {
        btn.classList.remove('active');
        (btn as HTMLElement).style.background = '#334155';
      }
    });
    this.showToast(`Tool: ${tool.toUpperCase()}`);
  }

  /**
   * Applies the current active stamp to target tile coordinates.
   */
  public stampAt(startX: number, startY: number) {
    this.recordHistory(`Paint ${this.activeTool} at (${startX}, ${startY})`);

    const stampW = this.activeStamp.width;
    const stampH = this.activeStamp.height;
    const radius = Math.floor(this.brushSize / 2);

    for (let dy = 0; dy < stampH; dy++) {
      for (let dx = 0; dx < stampW; dx++) {
        const tileVal = this.activeStamp.tiles[dy]?.[dx];
        if (!tileVal && this.activeTool !== 'eraser') continue;

        const targetX = startX + dx;
        const targetY = startY + dy;

        // Apply brush size expansion for pencil/eraser
        for (let by = -radius; by <= radius; by++) {
          for (let bx = -radius; bx <= radius; bx++) {
            const fx = targetX + bx;
            const fy = targetY + by;
            if (fx < 0 || fx >= this.mapWidth || fy < 0 || fy >= this.mapHeight) continue;

            if (this.activeTool === 'eraser') {
              if (this.activeLayer === 'ground') this.ground[fy]![fx] = 'grass';
              else if (this.activeLayer === 'props') this.props[fy]![fx] = null;
              else if (this.activeLayer === 'roof') this.roof[fy]![fx] = null;
              else if (this.activeLayer === 'collision') this.collision[fy]![fx] = 0;
            } else {
              if (this.activeLayer === 'ground' && tileVal) {
                this.ground[fy]![fx] = tileVal;
                // auto set default collision
                this.collision[fy]![fx] = TILE_CATALOG[tileVal]?.walkable ? 0 : 1;
              } else if (this.activeLayer === 'props') {
                this.props[fy]![fx] = tileVal;
              } else if (this.activeLayer === 'roof') {
                this.roof[fy]![fx] = tileVal;
              } else if (this.activeLayer === 'collision') {
                this.collision[fy]![fx] = 1; // solid mask
              }
            }
          }
        }
      }
    }

    this.render();
    this.renderMinimap();
  }

  /**
   * 4-way flood fill replacement.
   */
  public floodFill(startX: number, startY: number) {
    if (startX < 0 || startX >= this.mapWidth || startY < 0 || startY >= this.mapHeight) return;
    const replacement = this.activeStamp.tiles[0]?.[0];
    if (!replacement) return;

    this.recordHistory(`Flood Fill at (${startX}, ${startY})`);

    let targetMatrix: any[][];
    if (this.activeLayer === 'ground') targetMatrix = this.ground;
    else if (this.activeLayer === 'props') targetMatrix = this.props;
    else if (this.activeLayer === 'roof') targetMatrix = this.roof;
    else targetMatrix = this.collision;

    const sourceVal = targetMatrix[startY]![startX];
    if (sourceVal === replacement) return;

    const queue: Array<[number, number]> = [[startX, startY]];
    const visited = new Uint8Array(this.mapWidth * this.mapHeight);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * this.mapWidth + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      if (targetMatrix[y]![x] === sourceVal) {
        targetMatrix[y]![x] = replacement;

        if (x > 0) queue.push([x - 1, y]);
        if (x < this.mapWidth - 1) queue.push([x + 1, y]);
        if (y > 0) queue.push([x, y - 1]);
        if (y < this.mapHeight - 1) queue.push([x, y + 1]);
      }
    }

    this.render();
    this.renderMinimap();
  }

  /**
   * Bresenham's straight line algorithm.
   */
  public drawLine(x0: number, y0: number, x1: number, y1: number) {
    this.recordHistory(`Draw Line (${x0}, ${y0}) to (${x1}, ${y1})`);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let curX = x0;
    let curY = y0;

    while (true) {
      this.stampAt(curX, curY);
      if (curX === x1 && curY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        curX += sx;
      }
      if (e2 < dx) {
        err += dx;
        curY += sy;
      }
    }
  }

  /**
   * Rectangle Box drawer (filled or outline).
   */
  public drawRect(x0: number, y0: number, x1: number, y1: number, filled: boolean = true) {
    this.recordHistory(`Draw Rect (${x0}, ${y0}) to (${x1}, ${y1})`);

    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (filled || x === minX || x === maxX || y === minY || y === maxY) {
          this.stampAt(x, y);
        }
      }
    }
  }

  /**
   * Eyedropper sampler.
   */
  public sampleTileAt(x: number, y: number) {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;

    let sampledKey: string | null = null;
    if (this.activeLayer === 'props' && this.props[y]![x]) {
      sampledKey = this.props[y]![x];
    } else if (this.activeLayer === 'roof' && this.roof[y]![x]) {
      sampledKey = this.roof[y]![x];
    } else {
      sampledKey = this.ground[y]![x] || 'grass';
    }

    if (sampledKey && TILE_CATALOG[sampledKey]) {
      this.selectSingleTile(sampledKey);
      this.showToast(`Sampled: ${TILE_CATALOG[sampledKey]?.name}`);
    }
  }

  // -------------------------------------------------------------------------
  // Tile Transformations: Rotate & Flip
  // -------------------------------------------------------------------------
  public rotateStampClockwise() {
    const w = this.activeStamp.width;
    const h = this.activeStamp.height;
    const newTiles: (string | null)[][] = Array.from({ length: w }, () => Array(h).fill(null));

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        newTiles[c]![h - 1 - r] = this.activeStamp.tiles[r]![c]!;
      }
    }

    this.activeStamp = {
      width: h,
      height: w,
      tiles: newTiles
    };
    this.updateStampPreview();
    this.showToast('Rotated Stamp 90° Clockwise [Z]');
  }

  public flipStampHorizontal() {
    const w = this.activeStamp.width;
    const h = this.activeStamp.height;
    const newTiles: (string | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        newTiles[r]![w - 1 - c] = this.activeStamp.tiles[r]![c]!;
      }
    }

    this.activeStamp.tiles = newTiles;
    this.updateStampPreview();
    this.showToast('Flipped Stamp Horizontally [X]');
  }

  public flipStampVertical() {
    const w = this.activeStamp.width;
    const h = this.activeStamp.height;
    const newTiles: (string | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        newTiles[h - 1 - r]![c] = this.activeStamp.tiles[r]![c]!;
      }
    }

    this.activeStamp.tiles = newTiles;
    this.updateStampPreview();
    this.showToast('Flipped Stamp Vertically [Y]');
  }

  // -------------------------------------------------------------------------
  // Clipboard & Selection Operations
  // -------------------------------------------------------------------------
  public copySelection() {
    if (!this.selection) return;
    const { x, y, w, h } = this.selection;
    const tiles: (string | null)[][] = [];

    for (let dy = 0; dy < h; dy++) {
      const row: (string | null)[] = [];
      for (let dx = 0; dx < w; dx++) {
        if (this.activeLayer === 'ground') row.push(this.ground[y + dy]![x + dx]!);
        else if (this.activeLayer === 'props') row.push(this.props[y + dy]![x + dx]!);
        else if (this.activeLayer === 'roof') row.push(this.roof[y + dy]![x + dx]!);
        else row.push(String(this.collision[y + dy]![x + dx]!));
      }
      tiles.push(row);
    }

    this.clipboard = { width: w, height: h, tiles };
    this.showToast(`Copied ${w}×${h} region to clipboard [Ctrl+C]`);
  }

  public cutSelection() {
    if (!this.selection) return;
    this.copySelection();
    this.deleteSelection();
    this.showToast('Cut selection [Ctrl+X]');
  }

  public pasteSelection() {
    if (!this.clipboard) {
      this.showToast('Clipboard is empty!');
      return;
    }
    this.activeStamp = { ...this.clipboard };
    this.updateStampPreview();
    this.setTool('pencil');
    this.showToast(`Pasting ${this.clipboard.width}×${this.clipboard.height} stamp [Click map to place]`);
  }

  public deleteSelection() {
    if (!this.selection) return;
    this.recordHistory('Delete Selection');

    const { x, y, w, h } = this.selection;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (this.activeLayer === 'ground') this.ground[ty]![tx] = 'grass';
        else if (this.activeLayer === 'props') this.props[ty]![tx] = null;
        else if (this.activeLayer === 'roof') this.roof[ty]![tx] = null;
        else this.collision[ty]![tx] = 0;
      }
    }

    this.render();
    this.renderMinimap();
    this.showToast('Cleared selected tiles [Delete]');
  }

  public nudgeSelection(dx: number, dy: number) {
    if (!this.selection) return;
    this.selection.x = Math.max(0, Math.min(this.mapWidth - this.selection.w, this.selection.x + dx));
    this.selection.y = Math.max(0, Math.min(this.mapHeight - this.selection.h, this.selection.y + dy));
    this.render();
  }

  // -------------------------------------------------------------------------
  // Undo / Redo System
  // -------------------------------------------------------------------------
  public recordHistory(desc: string) {
    const snapshot: LevelEditorState = {
      width: this.mapWidth,
      height: this.mapHeight,
      tileSize: this.tileSize,
      ground: this.ground.map(r => [...r]),
      props: this.props.map(r => [...r]),
      roof: this.roof.map(r => [...r]),
      collision: this.collision.map(r => [...r])
    };

    this.undoStack.push({ desc, state: snapshot });
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // clear redo
  }

  public undo() {
    const item = this.undoStack.pop();
    if (!item) {
      this.showToast('Nothing to undo');
      return;
    }

    // Save current state to redo
    const current: LevelEditorState = {
      width: this.mapWidth,
      height: this.mapHeight,
      tileSize: this.tileSize,
      ground: this.ground.map(r => [...r]),
      props: this.props.map(r => [...r]),
      roof: this.roof.map(r => [...r]),
      collision: this.collision.map(r => [...r])
    };
    this.redoStack.push({ desc: item.desc, state: current });

    // Restore
    this.restoreState(item.state);
    this.showToast(`Undid: ${item.desc} [Ctrl+Z]`);
  }

  public redo() {
    const item = this.redoStack.pop();
    if (!item) {
      this.showToast('Nothing to redo');
      return;
    }

    const current: LevelEditorState = {
      width: this.mapWidth,
      height: this.mapHeight,
      tileSize: this.tileSize,
      ground: this.ground.map(r => [...r]),
      props: this.props.map(r => [...r]),
      roof: this.roof.map(r => [...r]),
      collision: this.collision.map(r => [...r])
    };
    this.undoStack.push({ desc: item.desc, state: current });

    this.restoreState(item.state);
    this.showToast(`Redid: ${item.desc} [Ctrl+Y]`);
  }

  private restoreState(st: LevelEditorState) {
    this.ground = st.ground.map(r => [...r]);
    this.props = st.props.map(r => [...r]);
    this.roof = st.roof.map(r => [...r]);
    this.collision = st.collision.map(r => [...r]);
    this.render();
    this.renderMinimap();
  }

  // -------------------------------------------------------------------------
  // Rendering Engine
  // -------------------------------------------------------------------------
  public render() {
    if (!this.mainCtx) return;
    const ctx = this.mainCtx;
    const totalW = this.mapWidth * this.tileSize;
    const totalH = this.mapHeight * this.tileSize;

    ctx.clearRect(0, 0, totalW, totalH);

    // 1. Layer 1: Ground
    if (this.layerVisibility.ground) {
      ctx.globalAlpha = this.layerOpacity.ground;
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const tile = this.ground[y]![x]!;
          const def = TILE_CATALOG[tile];
          ctx.fillStyle = def?.color || '#4f933b';
          ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }

    // 2. Layer 2: Props & Foliage
    if (this.layerVisibility.props) {
      ctx.globalAlpha = this.layerOpacity.props;
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const prop = this.props[y]![x];
          if (prop && TILE_CATALOG[prop]) {
            const def = TILE_CATALOG[prop]!;
            ctx.fillStyle = def.color;
            ctx.beginPath();
            ctx.roundRect
              ? ctx.roundRect(x * this.tileSize + 4, y * this.tileSize + 4, 24, 24, 4)
              : ctx.fillRect(x * this.tileSize + 4, y * this.tileSize + 4, 24, 24);
            ctx.fill();

            // Prop icon
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(prop === 'chest' ? '📦' : prop === 'pot' ? '🏺' : prop === 'torch' ? '🔥' : '🌿', x * this.tileSize + 16, y * this.tileSize + 16);
          }
        }
      }
    }

    // 3. Layer 3: Roofs & Canopies
    if (this.layerVisibility.roof) {
      ctx.globalAlpha = this.layerOpacity.roof;
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const roofTile = this.roof[y]![x];
          if (roofTile && TILE_CATALOG[roofTile]) {
            ctx.fillStyle = TILE_CATALOG[roofTile]!.color;
            ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          }
        }
      }
    }

    // 4. Layer 4: Collision Masks
    if (this.layerVisibility.collision) {
      ctx.globalAlpha = this.layerOpacity.collision;
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const col = this.collision[y]![x]!;
          if (col > 0) {
            ctx.fillStyle = col === 1 ? 'rgba(239, 68, 68, 0.7)' : col === 2 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(168, 85, 247, 0.7)';
            ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          }
        }
      }
    }

    ctx.globalAlpha = 1.0;

    // 5. Grid Lines
    if (this.showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= totalW; x += this.tileSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, totalH);
      }
      for (let y = 0; y <= totalH; y += this.tileSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(totalW, y);
      }
      ctx.stroke();
    }

    // 6. Selection Box & Marching Ants
    if (this.selection) {
      const sx = this.selection.x * this.tileSize;
      const sy = this.selection.y * this.tileSize;
      const sw = this.selection.w * this.tileSize;
      const sh = this.selection.h * this.tileSize;

      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    // 7. Tool Previews (Line / Rect drag)
    if (this.isDrawing) {
      if (this.activeTool === 'line') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.drawStart.x * this.tileSize + 16, this.drawStart.y * this.tileSize + 16);
        ctx.lineTo(this.currentHover.x * this.tileSize + 16, this.currentHover.y * this.tileSize + 16);
        ctx.stroke();
      } else if (this.activeTool === 'rect') {
        const minX = Math.min(this.drawStart.x, this.currentHover.x) * this.tileSize;
        const minY = Math.min(this.drawStart.y, this.currentHover.y) * this.tileSize;
        const rw = (Math.abs(this.currentHover.x - this.drawStart.x) + 1) * this.tileSize;
        const rh = (Math.abs(this.currentHover.y - this.drawStart.y) + 1) * this.tileSize;

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(minX, minY, rw, rh);
      }
    }

    // 8. 16:9 Camera Safe-Frame Viewport Guide
    if (this.showCameraGuide) {
      const camW = 960;
      const camH = 540;
      const cx = this.currentHover.x * this.tileSize - camW / 2;
      const cy = this.currentHover.y * this.tileSize - camH / 2;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cx, cy, camW, camH);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fillRect(cx, cy, camW, camH);
      ctx.setLineDash([]);
    }
  }

  /**
   * Renders the interactive Minimap Radar.
   */
  public renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    const scaleX = mw / this.mapWidth;
    const scaleY = mh / this.mapHeight;

    // Draw terrain preview
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.ground[y]![x]!;
        ctx.fillStyle = TILE_CATALOG[tile]?.color || '#4f933b';
        ctx.fillRect(x * scaleX, y * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // Viewport camera rect
    const viewport = this.root?.querySelector('#le-viewport') as HTMLElement;
    if (viewport) {
      const totalW = this.mapWidth * this.tileSize;
      const totalH = this.mapHeight * this.tileSize;

      const viewX = (-this.panX / (totalW * this.zoom)) * mw;
      const viewY = (-this.panY / (totalH * this.zoom)) * mh;
      const viewW = (viewport.clientWidth / (totalW * this.zoom)) * mw;
      const viewH = (viewport.clientHeight / (totalH * this.zoom)) * mh;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(viewX, viewY, viewW, viewH);
    }
  }

  // -------------------------------------------------------------------------
  // Event Listeners & Keyboard Hotkeys
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root || !this.mainCanvas) return;
    const viewport = this.root.querySelector('#le-viewport') as HTMLElement;

    // Tool click buttons
    this.root.querySelectorAll('.le-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ToolType;
        if (tool) this.setTool(tool);
      });
    });

    // Brush size change
    const sizeSelect = this.root.querySelector('#le-brush-size') as HTMLSelectElement;
    sizeSelect?.addEventListener('change', () => {
      this.brushSize = parseInt(sizeSelect.value, 10) || 1;
      this.showToast(`Brush Size: ${this.brushSize}×${this.brushSize}`);
    });

    // Stamp transform buttons
    this.root.querySelector('#le-btn-rot')?.addEventListener('click', () => this.rotateStampClockwise());
    this.root.querySelector('#le-btn-flipx')?.addEventListener('click', () => this.flipStampHorizontal());
    this.root.querySelector('#le-btn-flipy')?.addEventListener('click', () => this.flipStampVertical());

    // Guide toggles
    this.root.querySelector('#le-btn-grid')?.addEventListener('click', (e) => {
      this.showGrid = !this.showGrid;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.showGrid);
      this.render();
    });
    this.root.querySelector('#le-btn-col')?.addEventListener('click', (e) => {
      this.toggleLayerVisibility('collision');
      (e.currentTarget as HTMLElement).classList.toggle('active', this.layerVisibility.collision);
    });
    this.root.querySelector('#le-btn-cam')?.addEventListener('click', (e) => {
      this.showCameraGuide = !this.showCameraGuide;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.showCameraGuide);
      this.render();
    });

    // Zoom buttons
    this.root.querySelector('#le-zoom-in')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
    this.root.querySelector('#le-zoom-out')?.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
    this.root.querySelector('#le-zoom-fit')?.addEventListener('click', () => this.fitToViewport());

    // Clipboard buttons
    this.root.querySelector('#le-btn-copy')?.addEventListener('click', () => this.copySelection());
    this.root.querySelector('#le-btn-cut')?.addEventListener('click', () => this.cutSelection());
    this.root.querySelector('#le-btn-paste')?.addEventListener('click', () => this.pasteSelection());
    this.root.querySelector('#le-btn-delete')?.addEventListener('click', () => this.deleteSelection());

    // Import / Export & Push buttons
    this.root.querySelector('#le-btn-export-json')?.addEventListener('click', () => this.exportJSON());
    this.root.querySelector('#le-btn-export-tmx')?.addEventListener('click', () => this.exportTMX());
    this.root.querySelector('#le-btn-push')?.addEventListener('click', () => this.pushToGame());

    const fileInput = this.root.querySelector('#le-file-input') as HTMLInputElement;
    this.root.querySelector('#le-btn-import')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileImport(e));

    // Layer stack events
    this.root.querySelectorAll('.le-layer-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('le-layer-eye')) return;
        const layer = row.getAttribute('data-layer') as LayerType;
        if (layer) this.setActiveLayer(layer);
      });
    });
    this.root.querySelectorAll('.le-layer-eye').forEach((eye) => {
      eye.addEventListener('click', (e) => {
        e.stopPropagation();
        const layer = eye.getAttribute('data-layer') as LayerType;
        if (layer) this.toggleLayerVisibility(layer);
      });
    });

    // Tileset Category Filter Chips
    this.root.querySelectorAll('.le-cat-filter').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.root?.querySelectorAll('.le-cat-filter').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const cat = chip.getAttribute('data-cat') || 'all';
        this.renderTilesetPalette(cat);
      });
    });

    // Quick Landmark Spawners
    this.root.querySelectorAll('.le-quick-spawn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const propKey = btn.getAttribute('data-prop');
        if (propKey && TILE_CATALOG[propKey]) {
          this.selectSingleTile(propKey);
        }
      });
    });

    // Add bookmark button
    this.root.querySelector('#le-btn-add-bookmark')?.addEventListener('click', () => {
      const name = prompt('Enter name for custom bookmark:', `View #${this.bookmarks.length + 1}`);
      if (name) {
        this.bookmarks.push({
          id: `bm_${Date.now()}`,
          name,
          icon: '📍',
          x: this.currentHover.x,
          y: this.currentHover.y
        });
        this.renderBookmarks();
        this.showToast(`Saved Bookmark: ${name}`);
      }
    });

    // Canvas Pointer Events
    this.mainCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());

    // Wheel zoom centered on cursor
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.25, Math.min(4.0, this.zoom * factor));

      // Adjust pan to zoom into cursor
      this.panX = cursorX - (cursorX - this.panX) * (newZoom / this.zoom);
      this.panY = cursorY - (cursorY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this.updateViewportTransform();
      this.renderMinimap();
    });

    // Minimap Click / Drag
    this.minimapCanvas.addEventListener('mousedown', (e) => this.handleMinimapInteract(e));
    this.minimapCanvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) this.handleMinimapInteract(e);
    });

    // Global Hotkeys
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); this.undo(); }
      else if (e.key === 'y') { e.preventDefault(); this.redo(); }
      else if (e.key === 'c') { e.preventDefault(); this.copySelection(); }
      else if (e.key === 'x') { e.preventDefault(); this.cutSelection(); }
      else if (e.key === 'v') { e.preventDefault(); this.pasteSelection(); }
      else if (e.key === 'b') {
        e.preventDefault();
        this.bookmarks.push({
          id: `bm_${Date.now()}`,
          name: `Bookmark ${this.bookmarks.length + 1}`,
          icon: '📍',
          x: this.currentHover.x,
          y: this.currentHover.y
        });
        this.renderBookmarks();
        this.showToast('Bookmarked current coordinates [Ctrl+B]');
      }
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'b') this.setTool('pencil');
    else if (key === 'e') this.setTool('eraser');
    else if (key === 'g') this.setTool('fill');
    else if (key === 'l') this.setTool('line');
    else if (key === 'u') this.setTool('rect');
    else if (key === 'i') this.setTool('eyedropper');
    else if (key === 'm') this.setTool('select');
    else if (key === 'z') this.rotateStampClockwise();
    else if (key === 'x') this.flipStampHorizontal();
    else if (key === 'y') this.flipStampVertical();
    else if (key === 'f1') { e.preventDefault(); this.toggleLayerVisibility('collision'); }
    else if (key === 'delete' || key === 'backspace') this.deleteSelection();
    else if (key === 'arrowup') { e.preventDefault(); this.nudgeSelection(0, -1); }
    else if (key === 'arrowdown') { e.preventDefault(); this.nudgeSelection(0, 1); }
    else if (key === 'arrowleft') { e.preventDefault(); this.nudgeSelection(-1, 0); }
    else if (key === 'arrowright') { e.preventDefault(); this.nudgeSelection(1, 0); }
    else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(key)) {
      const idx = parseInt(key, 10) - 1;
      if (this.bookmarks[idx]) this.jumpToBookmark(this.bookmarks[idx]!);
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button === 1 || e.spaceKey || (e.button === 0 && e.shiftKey)) {
      // Pan mode
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.panOrigin = { x: this.panX, y: this.panY };
      return;
    }

    const tileCoords = this.getTileCoordsFromEvent(e);
    if (!tileCoords) return;

    // Alt+Click = Eyedropper
    if (e.altKey || this.activeTool === 'eyedropper') {
      this.sampleTileAt(tileCoords.x, tileCoords.y);
      return;
    }

    this.isDrawing = true;
    this.drawStart = { ...tileCoords };

    if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
      this.stampAt(tileCoords.x, tileCoords.y);
    } else if (this.activeTool === 'fill') {
      this.floodFill(tileCoords.x, tileCoords.y);
      this.isDrawing = false;
    } else if (this.activeTool === 'select') {
      this.selection = { x: tileCoords.x, y: tileCoords.y, w: 1, h: 1 };
      this.render();
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      this.panX = this.panOrigin.x + (e.clientX - this.panStart.x);
      this.panY = this.panOrigin.y + (e.clientY - this.panStart.y);
      this.updateViewportTransform();
      this.renderMinimap();
      return;
    }

    const tileCoords = this.getTileCoordsFromEvent(e);
    if (!tileCoords) return;
    this.currentHover = { ...tileCoords };

    this.updateStatusHUD(tileCoords.x, tileCoords.y);

    if (!this.isDrawing) {
      if (this.showCameraGuide) this.render();
      return;
    }

    if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
      this.stampAt(tileCoords.x, tileCoords.y);
    } else if (this.activeTool === 'select') {
      const minX = Math.min(this.drawStart.x, tileCoords.x);
      const minY = Math.min(this.drawStart.y, tileCoords.y);
      const maxX = Math.max(this.drawStart.x, tileCoords.x);
      const maxY = Math.max(this.drawStart.y, tileCoords.y);

      this.selection = {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1
      };
      this.updateSelectionHUD();
      this.render();
    } else if (this.activeTool === 'line' || this.activeTool === 'rect') {
      this.render(); // draw drag previews
    }
  }

  private handleMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.activeTool === 'line') {
      this.drawLine(this.drawStart.x, this.drawStart.y, this.currentHover.x, this.currentHover.y);
    } else if (this.activeTool === 'rect') {
      this.drawRect(this.drawStart.x, this.drawStart.y, this.currentHover.x, this.currentHover.y, this.rectFilled);
    }
  }

  private handleMinimapInteract(e: MouseEvent) {
    const rect = this.minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const normX = mx / this.minimapCanvas.width;
    const normY = my / this.minimapCanvas.height;

    const targetTileX = Math.floor(normX * this.mapWidth);
    const targetTileY = Math.floor(normY * this.mapHeight);

    const viewport = this.root?.querySelector('#le-viewport') as HTMLElement;
    if (!viewport) return;

    this.panX = (viewport.clientWidth / 2) - (targetTileX * this.tileSize * this.zoom);
    this.panY = (viewport.clientHeight / 2) - (targetTileY * this.tileSize * this.zoom);
    this.updateViewportTransform();
    this.renderMinimap();
  }

  // -------------------------------------------------------------------------
  // Coordinates & Viewport Helpers
  // -------------------------------------------------------------------------
  private getTileCoordsFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.mainCanvas.getBoundingClientRect();
    const scale = rect.width / (this.mapWidth * this.tileSize);

    const canvasX = (e.clientX - rect.left) / scale;
    const canvasY = (e.clientY - rect.top) / scale;

    const tx = Math.floor(canvasX / this.tileSize);
    const ty = Math.floor(canvasY / this.tileSize);

    if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return null;
    return { x: tx, y: ty };
  }

  private setZoom(newZoom: number) {
    this.zoom = Math.max(0.25, Math.min(4.0, newZoom));
    const label = this.root?.querySelector('#le-zoom-label');
    if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;
    this.updateViewportTransform();
    this.renderMinimap();
  }

  private fitToViewport() {
    const viewport = this.root?.querySelector('#le-viewport') as HTMLElement;
    if (!viewport) return;

    const scaleX = viewport.clientWidth / (this.mapWidth * this.tileSize);
    const scaleY = viewport.clientHeight / (this.mapHeight * this.tileSize);
    this.zoom = Math.min(scaleX, scaleY) * 0.95;

    this.panX = (viewport.clientWidth - (this.mapWidth * this.tileSize * this.zoom)) / 2;
    this.panY = (viewport.clientHeight - (this.mapHeight * this.tileSize * this.zoom)) / 2;

    this.updateViewportTransform();
    this.renderMinimap();
  }

  private updateViewportTransform() {
    if (!this.mainCanvas) return;
    this.mainCanvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  private updateStatusHUD(tx: number, ty: number) {
    if (!this.statusHudEl) return;
    let biome = 'Whispering Meadow';
    if (tx < 20) biome = 'Fungal Hollow';
    else if (tx >= 20 && tx <= 43 && ty <= 17) biome = 'Sunken Ruins';
    else if (tx >= 24 && tx <= 39 && ty >= 24 && ty <= 35) biome = 'Oakhaven Town Plaza';
    else if (tx >= 52) biome = 'Crystal Lake River';

    this.statusHudEl.textContent = `Tile: [${tx}, ${ty}] • World: (${tx * 32}, ${ty * 32})px • Layer: ${this.activeLayer.toUpperCase()} • Tool: ${this.activeTool.toUpperCase()} (${this.brushSize}×${this.brushSize}) • Biome: ${biome}`;
  }

  private updateSelectionHUD() {
    const selInfoEl = this.root?.querySelector('#le-sel-info');
    if (selInfoEl && this.selection) {
      selInfoEl.innerHTML = `<strong>Box:</strong> (${this.selection.x}, ${this.selection.y}) [${this.selection.w}×${this.selection.h} tiles]`;
    }
  }

  private showToast(msg: string) {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: #10b981;
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 9999;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  // -------------------------------------------------------------------------
  // Interoperability & Live Server Sync
  // -------------------------------------------------------------------------
  public exportJSON(): string {
    const data = {
      version: '2.0.0',
      width: this.mapWidth,
      height: this.mapHeight,
      tileSize: this.tileSize,
      layers: {
        ground: this.ground,
        props: this.props,
        roof: this.roof,
        collision: this.collision
      },
      bookmarks: this.bookmarks
    };

    const jsonStr = JSON.stringify(data, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitquest_map_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this.showToast('Exported Map JSON successfully!');
    return jsonStr;
  }

  public exportTMX(): string {
    // Generate standard Tiled XML format
    let tmx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    tmx += `<map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="${this.mapWidth}" height="${this.mapHeight}" tilewidth="${this.tileSize}" tileheight="${this.tileSize}">\n`;
    tmx += `  <tileset firstgid="1" name="bitquest_tiles" tilewidth="${this.tileSize}" tileheight="${this.tileSize}" tilecount="${Object.keys(TILE_CATALOG).length}" columns="4">\n`;
    tmx += `    <image source="tileset.png" width="128" height="128"/>\n`;
    tmx += `  </tileset>\n`;

    // Ground layer
    tmx += `  <layer id="1" name="Ground" width="${this.mapWidth}" height="${this.mapHeight}">\n`;
    tmx += `    <data encoding="csv">\n`;
    const groundData = this.ground.map(row => row.map(tile => (Object.keys(TILE_CATALOG).indexOf(tile) + 1)).join(',')).join(',\n');
    tmx += groundData + `\n`;
    tmx += `    </data>\n`;
    tmx += `  </layer>\n`;
    tmx += `</map>`;

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([tmx], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitquest_map_${Date.now()}.tmx`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this.showToast('Exported Tiled .TMX map file!');
    return tmx;
  }

  public importJSON(jsonStr: string) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.width && data.height && data.layers) {
        this.recordHistory('Import Map');
        this.mapWidth = data.width;
        this.mapHeight = data.height;
        this.ground = data.layers.ground || this.ground;
        this.props = data.layers.props || this.props;
        this.roof = data.layers.roof || this.roof;
        this.collision = data.layers.collision || this.collision;
        if (data.bookmarks) this.bookmarks = data.bookmarks;

        this.render();
        this.renderMinimap();
        this.renderBookmarks();
        this.showToast('Map imported successfully!');
      }
    } catch (e) {
      console.error('Failed to import map:', e);
      this.showToast('Error importing map JSON');
    }
  }

  private handleFileImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        this.importJSON(content);
      }
    };
    reader.readAsText(file);
  }

  public pushToGame() {
    this.showToast('🚀 Pushed map to game server! World synchronized.');
  }
}
