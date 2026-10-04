/**
 * BitQuest - Headless Multiplayer Desync & Network Chaos Simulator (Issue #34)
 * Simulates 4 to 8 headless bot clients interacting over synthetic network chaos:
 * - 80ms base latency
 * - 15% packet jitter (+/- 12ms)
 * - Out-of-order packet delivery
 * Reconciles client prediction and asserts entity divergence <= 2px and zero health desyncs.
 */

import { ClientPredictionManager, ServerMovementValidator } from '../shared/src/netcode/prediction';

// ============================================================================
// 1. Synthetic Network Chaos Channel
// ============================================================================

export interface ChaosPacket<T = any> {
  id: number;
  payload: T;
  sendTimeMs: number;
  deliveryTimeMs: number;
  isDelayedOutOfOrder: boolean;
}

export interface ChaosChannelConfig {
  baseLatencyMs: number;     // e.g. 80ms
  jitterPercent: number;     // e.g. 0.15 (15% = +/- 12ms)
  outOfOrderRate: number;    // e.g. 0.12 (12% chance of packet being delayed behind newer packets)
  dropRate?: number;         // e.g. 0.0 (packet drop)
}

export class NetworkChaosChannel<T = any> {
  private queue: ChaosPacket<T>[] = [];
  private packetCounter = 0;
  public outOfOrderCount = 0;
  public totalPacketsSent = 0;
  public totalPacketsDelivered = 0;

  constructor(public readonly config: ChaosChannelConfig = {
    baseLatencyMs: 80,
    jitterPercent: 0.15,
    outOfOrderRate: 0.12,
    dropRate: 0.0
  }) {}

  public send(payload: T, currentTimeMs: number) {
    this.totalPacketsSent++;

    // Optional packet drop simulation
    if (this.config.dropRate && Math.random() < this.config.dropRate) {
      return;
    }

    const id = ++this.packetCounter;

    // Calculate jitter (+/- jitterPercent)
    const jitterRange = this.config.baseLatencyMs * this.config.jitterPercent;
    const jitterMs = (Math.random() * 2 - 1) * jitterRange;

    // Out-of-order delay perturbation
    let extraDelayMs = 0;
    let isOutOfOrder = false;
    if (Math.random() < this.config.outOfOrderRate) {
      extraDelayMs = Math.random() * 35 + 15; // Delay by extra 15-50ms
      isOutOfOrder = true;
      this.outOfOrderCount++;
    }

    const deliveryTimeMs = currentTimeMs + this.config.baseLatencyMs + jitterMs + extraDelayMs;

    this.queue.push({
      id,
      payload,
      sendTimeMs: currentTimeMs,
      deliveryTimeMs,
      isDelayedOutOfOrder: isOutOfOrder
    });
  }

  public receive(currentTimeMs: number): T[] {
    const readyIndices: number[] = [];
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].deliveryTimeMs <= currentTimeMs) {
        readyIndices.push(i);
      }
    }

    if (readyIndices.length === 0) return [];

    // Extract ready packets
    const readyPackets: ChaosPacket<T>[] = [];
    for (const idx of readyIndices.reverse()) {
      readyPackets.push(this.queue.splice(idx, 1)[0]);
    }

    // Sort ready packets by arrival time to simulate actual network reception order
    readyPackets.sort((a, b) => a.deliveryTimeMs - b.deliveryTimeMs);

    this.totalPacketsDelivered += readyPackets.length;
    return readyPackets.map(p => p.payload);
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}

// ============================================================================
// 2. Simulated Headless Bot Client
// ============================================================================

export type BotMovementPattern = 'circle' | 'patrol_x' | 'patrol_y' | 'zigzag' | 'diagonal';

export class HeadlessBotClient {
  public x: number;
  public y: number;
  public health: number = 10;
  public maxHealth: number = 10;
  public readonly pred = new ClientPredictionManager();
  public angle: number = 0;
  public correctionsCount = 0;

  constructor(
    public readonly id: string,
    initialX: number,
    initialY: number,
    public readonly pattern: BotMovementPattern
  ) {
    this.x = initialX;
    this.y = initialY;
    this.angle = Math.random() * Math.PI * 2;
  }

  public generateStepInput(dtMs: number, nowMs: number): { seq: number; dx: number; dy: number; targetX: number; targetY: number } {
    const speed = 120; // px/sec
    const dist = (speed * dtMs) / 1000; // ~6px at 50ms tick

    let dx = 0;
    let dy = 0;

    if (this.pattern === 'circle') {
      this.angle += 0.15;
      dx = Math.cos(this.angle) * dist;
      dy = Math.sin(this.angle) * dist;
    } else if (this.pattern === 'patrol_x') {
      if (this.x > 1200) this.angle = Math.PI;
      else if (this.x < 900) this.angle = 0;
      dx = Math.cos(this.angle) * dist;
    } else if (this.pattern === 'patrol_y') {
      if (this.y > 1100) this.angle = -Math.PI / 2;
      else if (this.y < 800) this.angle = Math.PI / 2;
      dy = Math.sin(this.angle) * dist;
    } else if (this.pattern === 'zigzag') {
      this.angle += (Math.random() - 0.5) * 0.4;
      dx = Math.cos(this.angle) * dist;
      dy = Math.sin(this.angle) * dist;
    } else {
      // diagonal
      dx = dist * 0.707;
      dy = dist * 0.707;
    }

    this.x += dx;
    this.y += dy;

    const step = this.pred.recordPredictedStep(this.x, this.y, dx, dy);
    return {
      seq: step.seq,
      dx,
      dy,
      targetX: this.x,
      targetY: this.y
    };
  }

  public reconcileServerState(authX: number, authY: number, ackSeq: number, authHealth: number) {
    // 1. Reconcile movement prediction
    const res = this.pred.reconcile(authX, authY, ackSeq, 2.0);
    this.x = res.x;
    this.y = res.y;
    if (res.corrected) {
      this.correctionsCount++;
    }

    // 2. Authoritative health synchronization
    this.health = authHealth;
  }
}

// ============================================================================
// 3. Authoritative Server Simulation
// ============================================================================

export interface ServerBotState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  lastAckSeq: number;
}

export class AuthoritativeServerSim {
  public entities = new Map<string, ServerBotState>();

  public registerBot(botId: string, x: number, y: number) {
    this.entities.set(botId, {
      x,
      y,
      health: 10,
      maxHealth: 10,
      lastAckSeq: 0
    });
  }

  public processMovementInput(
    botId: string,
    seq: number,
    targetX: number,
    targetY: number,
    dtMs: number
  ) {
    const state = this.entities.get(botId);
    if (!state) return;

    // Ignore older out-of-order packets if seq has already been superseded
    if (seq <= state.lastAckSeq) {
      return;
    }

    const validation = ServerMovementValidator.validateMovement(
      state.x,
      state.y,
      targetX,
      targetY,
      dtMs,
      () => true // Walkable open field
    );

    state.x = validation.correctedX;
    state.y = validation.correctedY;
    state.lastAckSeq = seq;
  }

  public applyDamage(botId: string, amount: number) {
    const state = this.entities.get(botId);
    if (state) {
      state.health = Math.max(0, state.health - amount);
    }
  }
}

// ============================================================================
// 4. Multi-Client Network Chaos Simulation Runner
// ============================================================================

export interface ChaosSimulationResult {
  botCount: number;
  totalTicks: number;
  baseLatencyMs: number;
  jitterPercent: number;
  outOfOrderPackets: number;
  totalPacketsDelivered: number;
  maxEntityDivergence: number;
  healthDesyncs: number;
  passed: boolean;
  botSummaries: Array<{
    botId: string;
    divergence: number;
    clientHealth: number;
    serverHealth: number;
    corrections: number;
  }>;
}

export function runMultiplayerChaosSimulation(options: {
  botCount?: number;          // 4 to 8 headless bot clients
  durationTicks?: number;     // e.g. 100 ticks = 5 seconds at 50ms tick
  baseLatencyMs?: number;     // e.g. 80ms
  jitterPercent?: number;     // e.g. 0.15 (15%)
  outOfOrderRate?: number;    // e.g. 0.15 (15%)
} = {}): ChaosSimulationResult {
  const botCount = Math.max(4, Math.min(8, options.botCount ?? 6));
  const totalTicks = options.durationTicks ?? 100;
  const baseLatencyMs = options.baseLatencyMs ?? 80;
  const jitterPercent = options.jitterPercent ?? 0.15;
  const outOfOrderRate = options.outOfOrderRate ?? 0.15;

  console.log(`🌐 Spinning up Network Chaos Simulation: ${botCount} Bot Clients, ${baseLatencyMs}ms Latency, ${(jitterPercent * 100).toFixed(0)}% Jitter...`);

  const server = new AuthoritativeServerSim();
  const bots: HeadlessBotClient[] = [];
  const clientToServerPipes: Map<string, NetworkChaosChannel> = new Map();
  const serverToClientPipes: Map<string, NetworkChaosChannel> = new Map();

  const patterns: BotMovementPattern[] = ['circle', 'patrol_x', 'patrol_y', 'zigzag', 'diagonal', 'circle', 'zigzag', 'patrol_x'];

  // Initialize Bots & Network Channels
  for (let i = 0; i < botCount; i++) {
    const id = `bot_${i + 1}`;
    const startX = 1000 + (i % 3) * 60;
    const startY = 900 + Math.floor(i / 3) * 60;

    server.registerBot(id, startX, startY);
    const bot = new HeadlessBotClient(id, startX, startY, patterns[i % patterns.length]);
    bots.push(bot);

    clientToServerPipes.set(id, new NetworkChaosChannel({
      baseLatencyMs,
      jitterPercent,
      outOfOrderRate
    }));

    serverToClientPipes.set(id, new NetworkChaosChannel({
      baseLatencyMs,
      jitterPercent,
      outOfOrderRate
    }));
  }

  const dtMs = 50; // 20 Hz tick
  let simTime = 10000; // virtual start timestamp

  // Execution Loop
  for (let tick = 0; tick < totalTicks; tick++) {
    simTime += dtMs;

    // 1. Client Bots generate inputs & send across Chaos Pipe
    for (const bot of bots) {
      const input = bot.generateStepInput(dtMs, simTime);
      const pipe = clientToServerPipes.get(bot.id)!;
      pipe.send({
        botId: bot.id,
        seq: input.seq,
        dx: input.dx,
        dy: input.dy,
        targetX: input.targetX,
        targetY: input.targetY,
        dtMs
      }, simTime);
    }

    // 2. Server receives packets that have cleared latency & jitter
    for (const bot of bots) {
      const pipe = clientToServerPipes.get(bot.id)!;
      const arrivals = pipe.receive(simTime);
      for (const packet of arrivals) {
        server.processMovementInput(
          packet.botId,
          packet.seq,
          packet.targetX,
          packet.targetY,
          packet.dtMs
        );
      }
    }

    // 3. Environmental Server Hazard: Apply trap damage at tick 40 to bot_2 and tick 60 to bot_4
    if (tick === 40 && bots.length >= 2) {
      server.applyDamage(bots[1].id, 2);
    }
    if (tick === 60 && bots.length >= 4) {
      server.applyDamage(bots[3].id, 3);
    }

    // 4. Server broadcasts authoritative snapshots back over Chaos Pipe
    for (const bot of bots) {
      const serverState = server.entities.get(bot.id)!;
      const pipe = serverToClientPipes.get(bot.id)!;
      pipe.send({
        botId: bot.id,
        ackSeq: serverState.lastAckSeq,
        authX: serverState.x,
        authY: serverState.y,
        authHealth: serverState.health
      }, simTime);
    }

    // 5. Clients receive authoritative updates & reconcile predictions
    for (const bot of bots) {
      const pipe = serverToClientPipes.get(bot.id)!;
      const updates = pipe.receive(simTime);
      for (const update of updates) {
        bot.reconcileServerState(update.authX, update.authY, update.ackSeq, update.authHealth);
      }
    }
  }

  // Allow in-flight packets to clear (settle window: 300ms)
  for (let settle = 0; settle < 6; settle++) {
    simTime += dtMs;
    for (const bot of bots) {
      const c2s = clientToServerPipes.get(bot.id)!;
      const arrivals = c2s.receive(simTime);
      for (const p of arrivals) {
        server.processMovementInput(p.botId, p.seq, p.targetX, p.targetY, p.dtMs);
      }

      const serverState = server.entities.get(bot.id)!;
      const s2c = serverToClientPipes.get(bot.id)!;
      s2c.send({
        botId: bot.id,
        ackSeq: serverState.lastAckSeq,
        authX: serverState.x,
        authY: serverState.y,
        authHealth: serverState.health
      }, simTime);

      const updates = s2c.receive(simTime);
      for (const u of updates) {
        bot.reconcileServerState(u.authX, u.authY, u.ackSeq, u.authHealth);
      }
    }
  }

  // Verification & Desync Analysis
  let maxEntityDivergence = 0;
  let healthDesyncs = 0;
  let totalOutOfOrder = 0;
  let totalDelivered = 0;

  const botSummaries = [];

  for (const bot of bots) {
    const sState = server.entities.get(bot.id)!;
    const divergence = Math.hypot(bot.x - sState.x, bot.y - sState.y);
    if (divergence > maxEntityDivergence) {
      maxEntityDivergence = divergence;
    }

    const healthMatch = (bot.health === sState.health);
    if (!healthMatch) {
      healthDesyncs++;
    }

    const c2s = clientToServerPipes.get(bot.id)!;
    const s2c = serverToClientPipes.get(bot.id)!;
    totalOutOfOrder += c2s.outOfOrderCount + s2c.outOfOrderCount;
    totalDelivered += c2s.totalPacketsDelivered + s2c.totalPacketsDelivered;

    botSummaries.push({
      botId: bot.id,
      divergence: Number(divergence.toFixed(3)),
      clientHealth: bot.health,
      serverHealth: sState.health,
      corrections: bot.correctionsCount
    });
  }

  // Acceptance Criteria:
  // - Max divergence <= 2.0px
  // - 0 health desyncs
  const passed = maxEntityDivergence <= 2.0 && healthDesyncs === 0;

  return {
    botCount,
    totalTicks,
    baseLatencyMs,
    jitterPercent,
    outOfOrderPackets: totalOutOfOrder,
    totalPacketsDelivered: totalDelivered,
    maxEntityDivergence: Number(maxEntityDivergence.toFixed(3)),
    healthDesyncs,
    passed,
    botSummaries
  };
}
