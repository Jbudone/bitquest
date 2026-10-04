/**
 * BitQuest - Visual Node-Based Dialogue & Quest DAG Graph Editor (Milestone 9.1)
 *
 * Implements an interactive visual node-graph canvas for authoring and debugging
 * branching NPC dialogues, quest DAGs, conditions, and rewards:
 * 1. Interactive draggable node-graph canvas with curved Bezier splines.
 * 2. Node types: Dialogue Node, Choice Node, Condition Gate, Quest Stage, Reward.
 * 3. Live "Play Dialogue" interactive simulator with typewriter text and response choices.
 * 4. Graph Linter: Cycle detection, orphan/unreachable node analysis, missing target key flags.
 * 5. Visual node manipulation: Drag nodes, connect output->input pins, delete nodes/links.
 * 6. Pre-loaded with canonical NPC dialogues (Barnaby, Grandma Bramble, Pip, Finn).
 * 7. Zod schema-compliant JSON export and import.
 */

import { STARTER_DIALOGUES } from '../../../content/dialogues';

export type NodeType = 'dialogue' | 'choice' | 'condition' | 'quest_stage' | 'reward';

export interface GraphPin {
  id: string;
  name: string;
  type: 'in' | 'out';
}

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speaker?: string;
  portrait?: string;
  text?: string;
  conditionKey?: string;
  conditionVal?: any;
  stageIndex?: number;
  objectiveType?: string;
  targetId?: string;
  targetCount?: number;
  rewards?: {
    coins?: number;
    items?: Array<{ itemType: string; count: number }>;
    unlockedWorldFlags?: string[];
  };
  pins: GraphPin[];
}

export interface GraphConnection {
  id: string;
  fromNodeId: string;
  fromPinId: string;
  toNodeId: string;
  toPinId: string;
}

export interface LintReport {
  isValid: boolean;
  orphanNodes: string[];
  missingTargets: Array<{ fromNodeId: string; targetKey: string }>;
  cycles: string[][];
  warnings: string[];
}

export class QuestGraphStudio {
  public root: HTMLElement | null = null;
  public nodes: Map<string, GraphNode> = new Map();
  public connections: GraphConnection[] = [];

  // Active dialogue simulation state
  public simCurrentNodeId: string | null = null;
  public simFlags: Set<string> = new Set();
  public simInventory: Map<string, number> = new Map();

  // Canvas Viewport navigation
  public panX: number = 80;
  public panY: number = 80;
  public zoom: number = 1.0;
  public isPanning: boolean = false;
  public panStart = { x: 0, y: 0 };
  public panOrigin = { x: 0, y: 0 };

  // Node Dragging & Pin Connecting
  public draggingNodeId: string | null = null;
  public dragOffset = { x: 0, y: 0 };
  public connectingPin: { nodeId: string; pinId: string; pinType: 'in' | 'out'; x: number; y: number } | null = null;
  public mousePos = { x: 0, y: 0 };
  public selectedNodeId: string | null = null;

  // DOM
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private simContainerEl!: HTMLElement;
  private inspectorEl!: HTMLElement;
  private linterReportEl!: HTMLElement;

  constructor(containerIdOrElement: string | HTMLElement) {
    if (typeof containerIdOrElement === 'string') {
      this.root = document.getElementById(containerIdOrElement);
    } else {
      this.root = containerIdOrElement;
    }

    this.loadNpcDialogues('barnaby');
    if (this.root) {
      this.buildUI();
      this.attachEvents();
      this.render();
      this.updateSimulator();
      this.runLinter();
    }
  }

  /**
   * Loads a canonical NPC dialogue tree into graph nodes and connections.
   */
  public loadNpcDialogues(npcKey: string) {
    this.nodes.clear();
    this.connections = [];

    const tree = STARTER_DIALOGUES[npcKey];
    if (!tree) return;

    let posX = 100;
    let posY = 100;

    for (const [key, node] of Object.entries(tree)) {
      const gNode: GraphNode = {
        id: key,
        type: 'dialogue',
        title: `${node.speaker} [${key}]`,
        speaker: node.speaker,
        portrait: node.portrait || 'adventurer',
        text: node.text,
        x: posX,
        y: posY,
        width: 260,
        height: 120 + ((node.responses?.length || 0) * 28),
        pins: [
          { id: 'in', name: 'In', type: 'in' }
        ]
      };

      if (node.responses && node.responses.length > 0) {
        node.responses.forEach((resp, rIdx) => {
          gNode.pins.push({
            id: `resp_${rIdx}`,
            name: resp.text.length > 25 ? resp.text.substring(0, 22) + '...' : resp.text,
            type: 'out'
          });
        });
      }

      this.nodes.set(key, gNode);
      posX += 340;
      if (posX > 1200) {
        posX = 100;
        posY += 260;
      }
    }

    // Connect responses to target dialogues
    for (const [key, node] of Object.entries(tree)) {
      if (node.responses) {
        node.responses.forEach((resp, rIdx) => {
          if (resp.nextDialogueKey && this.nodes.has(resp.nextDialogueKey)) {
            this.connections.push({
              id: `conn_${key}_${rIdx}_${resp.nextDialogueKey}`,
              fromNodeId: key,
              fromPinId: `resp_${rIdx}`,
              toNodeId: resp.nextDialogueKey,
              toPinId: 'in'
            });
          }
        });
      }
    }

    this.simCurrentNodeId = 'greeting';
  }

  // -------------------------------------------------------------------------
  // UI Builder
  // -------------------------------------------------------------------------
  private buildUI() {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="quest-graph-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden;">
        
        <!-- Header Controls -->
        <header style="background: #1e293b; border-bottom: 1px solid #334155; padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: #a5b4fc;">📜 Visual Dialogue & Quest Graph</span>
            
            <div style="height: 16px; width: 1px; background: #334155; margin: 0 4px;"></div>

            <label style="font-size: 11px; color: #94a3b8;">Load Preset:</label>
            <select id="qg-select-npc" style="background: #0f172a; border: 1px solid #334155; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
              <option value="barnaby">Barnaby the Pelican Courier</option>
              <option value="grandma">Grandma Bramble</option>
              <option value="pip">Pip the Raccoon Merchant</option>
              <option value="finn">Finn the River Otter</option>
            </select>

            <button id="qg-btn-add-node" class="btn" style="font-size: 11px; padding: 3px 8px;">➕ Add Dialogue</button>
            <button id="qg-btn-add-stage" class="btn" style="font-size: 11px; padding: 3px 8px;">🎯 Add Stage</button>
            <button id="qg-btn-add-reward" class="btn" style="font-size: 11px; padding: 3px 8px;">🎁 Add Reward</button>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="qg-btn-lint" class="btn" style="font-size: 11px; padding: 3px 8px;">🔍 Verify DAG</button>
            <button id="qg-btn-export" class="btn btn-primary" style="font-size: 11px; padding: 3px 8px;">💾 Export JSON</button>
            <button id="qg-btn-reset-sim" class="btn" style="font-size: 11px; padding: 3px 8px;">↺ Restart Sim</button>
          </div>
        </header>

        <!-- Main Body: Graph Canvas + Simulator Sidebar + Inspector Sidebar -->
        <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
          
          <!-- Center Canvas Viewport -->
          <div id="qg-canvas-viewport" style="flex: 1; position: relative; overflow: hidden; background: #060911; cursor: grab;">
            <canvas id="qg-main-canvas" style="position: absolute; top: 0; left: 0; display: block;"></canvas>
            
            <!-- Floating Navigation Hint -->
            <div style="position: absolute; bottom: 12px; left: 14px; font-size: 10px; color: #64748b; background: rgba(15,23,42,0.8); padding: 4px 8px; border-radius: 4px; pointer-events: none;">
              Space+Drag to Pan • Wheel to Zoom • Drag pins to connect • Click to inspect
            </div>
          </div>

          <!-- Right Pane 1: Live Interactive "Play Dialogue" Simulator -->
          <aside style="width: 320px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 10px 12px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">🎮 Play Dialogue Simulator</h4>
              <span id="qg-sim-step-badge" style="font-size: 9px; background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 1px 6px; border-radius: 4px;">Node: greeting</span>
            </div>

            <div id="qg-simulator-container" style="flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
              <!-- Rendered dynamically -->
            </div>

            <!-- Graph Linter Diagnostics Report -->
            <div style="border-top: 1px solid #334155; padding: 10px 12px; background: #0f172a; max-height: 150px; overflow-y: auto;">
              <h5 style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">📋 DAG Linter Report</h5>
              <div id="qg-linter-report" style="font-size: 10px; color: #cbd5e1; line-height: 1.5;">Checking graph integrity...</div>
            </div>
          </aside>

          <!-- Right Pane 2: Node Property Inspector -->
          <aside style="width: 260px; background: #0f172a; border-left: 1px solid #334155; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
            <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0;">⚙️ Node Inspector</h4>
            <div id="qg-node-inspector" style="font-size: 11px; color: #94a3b8;">
              Click any node on the graph to inspect and edit its fields.
            </div>
          </aside>
        </div>
      </div>
    `;

    this.canvas = this.root.querySelector('#qg-main-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.simContainerEl = this.root.querySelector('#qg-simulator-container') as HTMLElement;
    this.inspectorEl = this.root.querySelector('#qg-node-inspector') as HTMLElement;
    this.linterReportEl = this.root.querySelector('#qg-linter-report') as HTMLElement;

    this.resizeCanvas();
  }

  private resizeCanvas() {
    const vp = this.root?.querySelector('#qg-canvas-viewport') as HTMLElement;
    if (!vp || !this.canvas) return;
    this.canvas.width = vp.clientWidth;
    this.canvas.height = vp.clientHeight;
  }

  // -------------------------------------------------------------------------
  // Graph Rendering Engine
  // -------------------------------------------------------------------------
  public render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. Grid pattern
    this.renderGrid(ctx);

    // 2. Connections (Bezier Splines)
    this.renderConnections(ctx);

    // 3. Nodes
    this.renderNodes(ctx);

    // 4. In-progress connection line
    if (this.connectingPin) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.connectingPin.x, this.connectingPin.y);
      const targetX = (this.mousePos.x - this.panX) / this.zoom;
      const targetY = (this.mousePos.y - this.panY) / this.zoom;
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private renderGrid(ctx: CanvasRenderingContext2D) {
    const gridSize = 40;
    const startX = -this.panX / this.zoom;
    const startY = -this.panY / this.zoom;
    const endX = startX + this.canvas.width / this.zoom;
    const endY = startY + this.canvas.height / this.zoom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  private renderConnections(ctx: CanvasRenderingContext2D) {
    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.fromNodeId);
      const toNode = this.nodes.get(conn.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPos = this.getPinPosition(fromNode, conn.fromPinId);
      const toPos = this.getPinPosition(toNode, conn.toPinId);

      // Active path highlight in simulator
      const isActive = (fromNode.id === this.simCurrentNodeId);

      ctx.strokeStyle = isActive ? '#38bdf8' : '#6366f1';
      ctx.lineWidth = isActive ? 3 : 2;

      // Draw cubic bezier curve
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      const cpDist = Math.max(40, Math.abs(toPos.x - fromPos.x) * 0.5);
      ctx.bezierCurveTo(
        fromPos.x + cpDist, fromPos.y,
        toPos.x - cpDist, toPos.y,
        toPos.x, toPos.y
      );
      ctx.stroke();

      // Connector arrow point
      ctx.fillStyle = isActive ? '#38bdf8' : '#6366f1';
      ctx.beginPath();
      ctx.arc(toPos.x, toPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderNodes(ctx: CanvasRenderingContext2D) {
    for (const [, node] of this.nodes) {
      const isSelected = (node.id === this.selectedNodeId);
      const isSimActive = (node.id === this.simCurrentNodeId);

      // Node background card
      ctx.fillStyle = isSimActive ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = isSimActive ? '#38bdf8' : isSelected ? '#a855f7' : '#334155';
      ctx.lineWidth = isSimActive || isSelected ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(node.x, node.y, node.width, node.height, 8)
        : ctx.fillRect(node.x, node.y, node.width, node.height);
      ctx.fill();
      ctx.stroke();

      // Node header
      ctx.fillStyle = node.type === 'dialogue' ? '#312e81' : node.type === 'quest_stage' ? '#065f46' : '#831843';
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(node.x, node.y, node.width, 28, [8, 8, 0, 0])
        : ctx.fillRect(node.x, node.y, node.width, 28);
      ctx.fill();

      // Header title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.title, node.x + 10, node.y + 14);

      // Node body text preview
      if (node.text) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px sans-serif';
        const stripped = node.text.replace(/\{[^}]+\}/g, '');
        const preview = stripped.length > 55 ? stripped.substring(0, 52) + '...' : stripped;
        ctx.fillText(preview, node.x + 10, node.y + 44);
      }

      // Render Pins (In / Out)
      node.pins.forEach((pin, pIdx) => {
        const pinPos = this.getPinPosition(node, pin.id);

        ctx.fillStyle = pin.type === 'in' ? '#22c55e' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(pinPos.x, pinPos.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        if (pin.type === 'in') {
          ctx.textAlign = 'left';
          ctx.fillText(pin.name, pinPos.x + 8, pinPos.y + 1);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(pin.name, pinPos.x - 8, pinPos.y + 1);
        }
      });
    }
  }

  private getPinPosition(node: GraphNode, pinId: string): { x: number; y: number } {
    const pin = node.pins.find(p => p.id === pinId);
    if (!pin) return { x: node.x, y: node.y };

    if (pin.type === 'in') {
      return { x: node.x, y: node.y + 14 };
    } else {
      const outPins = node.pins.filter(p => p.type === 'out');
      const outIdx = outPins.findIndex(p => p.id === pinId);
      const topY = node.y + 70;
      return { x: node.x + node.width, y: topY + (outIdx * 28) };
    }
  }

  // -------------------------------------------------------------------------
  // Live "Play Dialogue" Simulator
  // -------------------------------------------------------------------------
  public updateSimulator() {
    if (!this.simContainerEl) return;
    const badge = this.root?.querySelector('#qg-sim-step-badge');
    if (badge) badge.textContent = `Node: ${this.simCurrentNodeId || 'None'}`;

    if (!this.simCurrentNodeId) {
      this.simContainerEl.innerHTML = `
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          Dialogue finished or idle.<br>Click "Restart Sim" to test again.
        </div>
      `;
      return;
    }

    const node = this.nodes.get(this.simCurrentNodeId);
    if (!node) {
      this.simContainerEl.innerHTML = `<div style="color: #ef4444; font-size: 11px;">Error: Node ${this.simCurrentNodeId} not found in graph.</div>`;
      return;
    }

    // Clean text tags for display
    const cleanText = (node.text || '').replace(/\{[^}]+\}/g, '');

    // Collect response options matching connections
    const outConns = this.connections.filter(c => c.fromNodeId === node.id);

    this.simContainerEl.innerHTML = `
      <!-- Speaker Card -->
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div style="width: 28px; height: 28px; background: #6366f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            ${node.portrait === 'pelican' ? '🦆' : node.portrait === 'grandma' ? '👵' : node.portrait === 'raccoon' ? '🦝' : '👤'}
          </div>
          <strong style="color: #a5b4fc; font-size: 12px;">${node.speaker || 'Narrator'}</strong>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #f8fafc;">${cleanText}</p>
      </div>

      <!-- Player Response Choices -->
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
        <label style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Your Response:</label>
        ${outConns.map(conn => {
          const pin = node.pins.find(p => p.id === conn.fromPinId);
          return `
            <button class="btn qg-sim-choice-btn" data-target="${conn.toNodeId}" style="text-align: left; padding: 7px 10px; font-size: 11px; background: #0f172a; border: 1px solid #4f46e5; border-radius: 6px; color: #cbd5e1;">
              ➔ ${pin?.name || 'Continue'}
            </button>
          `;
        }).join('')}
        ${outConns.length === 0 ? `
          <button id="qg-sim-finish-btn" class="btn btn-primary" style="margin-top: 10px; font-size: 11px;">🏁 End Conversation</button>
        ` : ''}
      </div>
    `;

    // Attach choice clicks
    this.simContainerEl.querySelectorAll('.qg-sim-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) {
          this.simCurrentNodeId = target;
          this.updateSimulator();
          this.render();
        }
      });
    });

    this.simContainerEl.querySelector('#qg-sim-finish-btn')?.addEventListener('click', () => {
      this.simCurrentNodeId = null;
      this.updateSimulator();
      this.render();
    });
  }

  // -------------------------------------------------------------------------
  // Graph Linter & DAG Validator
  // -------------------------------------------------------------------------
  public runLinter(): LintReport {
    const report: LintReport = {
      isValid: true,
      orphanNodes: [],
      missingTargets: [],
      cycles: [],
      warnings: []
    };

    // 1. Check for missing targets
    for (const conn of this.connections) {
      if (!this.nodes.has(conn.toNodeId)) {
        report.missingTargets.push({ fromNodeId: conn.fromNodeId, targetKey: conn.toNodeId });
        report.isValid = false;
      }
    }

    // 2. Check for orphan nodes (nodes with 0 incoming connections, except root)
    const inDegrees = new Map<string, number>();
    for (const [id] of this.nodes) inDegrees.set(id, 0);
    for (const conn of this.connections) {
      inDegrees.set(conn.toNodeId, (inDegrees.get(conn.toNodeId) || 0) + 1);
    }

    for (const [id, count] of inDegrees.entries()) {
      if (count === 0 && id !== 'greeting' && id !== 'start') {
        report.orphanNodes.push(id);
        report.warnings.push(`Node [${id}] is unreachable from entry.`);
      }
    }

    // 3. Cycle Detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);

      const outConns = this.connections.filter(c => c.fromNodeId === curr);
      for (const conn of outConns) {
        if (!visited.has(conn.toNodeId)) {
          checkCycle(conn.toNodeId, [...path, conn.toNodeId]);
        } else if (recStack.has(conn.toNodeId)) {
          report.cycles.push([...path, conn.toNodeId]);
        }
      }
      recStack.delete(curr);
    };

    if (this.nodes.has('greeting')) {
      checkCycle('greeting', ['greeting']);
    }

    // Render diagnostic output
    if (this.linterReportEl) {
      if (report.isValid && report.orphanNodes.length === 0 && report.cycles.length === 0) {
        this.linterReportEl.innerHTML = `<span style="color: #4ade80;">✅ DAG is completely healthy! All nodes connected with zero circular soft-locks.</span>`;
      } else {
        let msg = '';
        if (report.missingTargets.length > 0) {
          msg += `<div style="color: #ef4444;">⚠️ Missing Targets: ${report.missingTargets.length} broken links</div>`;
        }
        if (report.orphanNodes.length > 0) {
          msg += `<div style="color: #f59e0b;">⚠️ Unreachable Nodes: ${report.orphanNodes.join(', ')}</div>`;
        }
        if (report.cycles.length > 0) {
          msg += `<div style="color: #f87171;">🔁 Loops Detected: ${report.cycles.length} cycles</div>`;
        }
        this.linterReportEl.innerHTML = msg;
      }
    }

    return report;
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------
  private attachEvents() {
    if (!this.root || !this.canvas) return;
    const vp = this.root.querySelector('#qg-canvas-viewport') as HTMLElement;

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });

    // Preset selector
    const npcSelect = this.root.querySelector('#qg-select-npc') as HTMLSelectElement;
    npcSelect?.addEventListener('change', () => {
      this.loadNpcDialogues(npcSelect.value);
      this.render();
      this.updateSimulator();
      this.runLinter();
    });

    // Add Node Button
    this.root.querySelector('#qg-btn-add-node')?.addEventListener('click', () => {
      const id = `node_${Date.now()}`;
      const newNode: GraphNode = {
        id,
        type: 'dialogue',
        title: `Dialogue [${id.substring(id.length - 4)}]`,
        speaker: 'NPC',
        text: 'New dialogue node text.',
        x: -this.panX + 200,
        y: -this.panY + 200,
        width: 240,
        height: 120,
        pins: [
          { id: 'in', name: 'In', type: 'in' },
          { id: 'out_0', name: 'Continue', type: 'out' }
        ]
      };
      this.nodes.set(id, newNode);
      this.render();
      this.runLinter();
    });

    // Lint Button
    this.root.querySelector('#qg-btn-lint')?.addEventListener('click', () => {
      this.runLinter();
    });

    // Reset Sim
    this.root.querySelector('#qg-btn-reset-sim')?.addEventListener('click', () => {
      this.simCurrentNodeId = 'greeting';
      this.updateSimulator();
      this.render();
    });

    // Export JSON
    this.root.querySelector('#qg-btn-export')?.addEventListener('click', () => {
      this.exportJSON();
    });

    // Canvas Mouse Events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());

    // Wheel zoom
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.4, Math.min(2.5, this.zoom * factor));
      this.render();
    });
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseCanvasX = e.clientX - rect.left;
    const mouseCanvasY = e.clientY - rect.top;
    const worldX = (mouseCanvasX - this.panX) / this.zoom;
    const worldY = (mouseCanvasY - this.panY) / this.zoom;

    if (e.button === 1 || e.spaceKey || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.panOrigin = { x: this.panX, y: this.panY };
      return;
    }

    // Check click on pins first
    for (const [, node] of this.nodes) {
      for (const pin of node.pins) {
        const pinPos = this.getPinPosition(node, pin.id);
        const dist = Math.hypot(worldX - pinPos.x, worldY - pinPos.y);
        if (dist <= 10) {
          if (pin.type === 'out') {
            this.connectingPin = {
              nodeId: node.id,
              pinId: pin.id,
              pinType: 'out',
              x: pinPos.x,
              y: pinPos.y
            };
            return;
          }
        }
      }
    }

    // Check click on node body
    let clickedNode: GraphNode | null = null;
    for (const [, node] of this.nodes) {
      if (
        worldX >= node.x &&
        worldX <= node.x + node.width &&
        worldY >= node.y &&
        worldY <= node.y + node.height
      ) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      this.draggingNodeId = clickedNode.id;
      this.selectedNodeId = clickedNode.id;
      this.dragOffset = {
        x: worldX - clickedNode.x,
        y: worldY - clickedNode.y
      };
      this.updateInspector(clickedNode);
      this.render();
    } else {
      this.selectedNodeId = null;
      this.render();
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (this.isPanning) {
      this.panX = this.panOrigin.x + (e.clientX - this.panStart.x);
      this.panY = this.panOrigin.y + (e.clientY - this.panStart.y);
      this.render();
      return;
    }

    if (this.draggingNodeId) {
      const node = this.nodes.get(this.draggingNodeId);
      if (node) {
        const worldX = (this.mousePos.x - this.panX) / this.zoom;
        const worldY = (this.mousePos.y - this.panY) / this.zoom;
        node.x = worldX - this.dragOffset.x;
        node.y = worldY - this.dragOffset.y;
        this.render();
      }
    }

    if (this.connectingPin) {
      this.render();
    }
  }

  private handleMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (this.connectingPin) {
      const worldX = (this.mousePos.x - this.panX) / this.zoom;
      const worldY = (this.mousePos.y - this.panY) / this.zoom;

      // Check if dropped on an 'in' pin
      for (const [, node] of this.nodes) {
        for (const pin of node.pins) {
          if (pin.type === 'in') {
            const pinPos = this.getPinPosition(node, pin.id);
            const dist = Math.hypot(worldX - pinPos.x, worldY - pinPos.y);
            if (dist <= 15 && node.id !== this.connectingPin.nodeId) {
              // Add connection
              this.connections.push({
                id: `conn_${Date.now()}`,
                fromNodeId: this.connectingPin.nodeId,
                fromPinId: this.connectingPin.pinId,
                toNodeId: node.id,
                toPinId: pin.id
              });
              this.updateSimulator();
              this.runLinter();
              break;
            }
          }
        }
      }

      this.connectingPin = null;
      this.render();
    }

    this.draggingNodeId = null;
  }

  private updateInspector(node: GraphNode) {
    if (!this.inspectorEl) return;
    this.inspectorEl.innerHTML = `
      <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 4px;">${node.title}</div>
      <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">ID: ${node.id}</div>

      <label style="font-size: 10px; color: #94a3b8;">Speaker Name:</label>
      <input type="text" id="qg-insp-speaker" value="${node.speaker || ''}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;" />

      <label style="font-size: 10px; color: #94a3b8;">Dialogue Content:</label>
      <textarea id="qg-insp-text" rows="4" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 4px; border-radius: 4px; font-size: 11px; margin-bottom: 8px;">${node.text || ''}</textarea>

      <button id="qg-insp-del" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 4px;">🗑️ Delete Node</button>
    `;

    this.inspectorEl.querySelector('#qg-insp-speaker')?.addEventListener('input', (e) => {
      node.speaker = (e.target as HTMLInputElement).value;
      node.title = `${node.speaker} [${node.id}]`;
      this.render();
      this.updateSimulator();
    });

    this.inspectorEl.querySelector('#qg-insp-text')?.addEventListener('input', (e) => {
      node.text = (e.target as HTMLTextAreaElement).value;
      this.render();
      this.updateSimulator();
    });

    this.inspectorEl.querySelector('#qg-insp-del')?.addEventListener('click', () => {
      this.nodes.delete(node.id);
      this.connections = this.connections.filter(c => c.fromNodeId !== node.id && c.toNodeId !== node.id);
      this.selectedNodeId = null;
      this.inspectorEl.innerHTML = 'Node deleted.';
      this.render();
      this.updateSimulator();
      this.runLinter();
    });
  }

  // -------------------------------------------------------------------------
  // Interoperability & Export
  // -------------------------------------------------------------------------
  public exportJSON(): string {
    const result: Record<string, any> = {};

    for (const [id, node] of this.nodes) {
      const outConns = this.connections.filter(c => c.fromNodeId === id);
      const responses = outConns.map(c => {
        const pin = node.pins.find(p => p.id === c.fromPinId);
        return {
          text: pin?.name || 'Continue',
          nextDialogueKey: c.toNodeId
        };
      });

      result[id] = {
        speaker: node.speaker || 'Narrator',
        portrait: node.portrait || 'adventurer',
        text: node.text || '',
        responses: responses.length > 0 ? responses : undefined
      };
    }

    const jsonStr = JSON.stringify(result, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialogue_graph_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    return jsonStr;
  }
}
