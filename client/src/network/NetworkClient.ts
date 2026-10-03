import type {
  ClientPacket,
  ServerPacket,
  PlayerData,
  EntityData,
  ChatMessage,
  EmoteEvent,
  Direction,
  PlayerAnimState,
  EmoteType,
  ItemDropData
} from '../../../shared/src/types';

export class NetworkClient {
  private ws: WebSocket | null = null;
  public isConnected = false;
  public yourId: string | null = null;

  public onInit?: (data: { yourId: string; players: PlayerData[]; entities: EntityData[]; items: ItemDropData[]; worldFlags: Record<string, boolean> }) => void;
  public onPlayerJoined?: (player: PlayerData) => void;
  public onPlayerLeft?: (id: string) => void;
  public onWorldTick?: (players: Array<{ id: string; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null }>) => void;
  public onEntityUpdated?: (entity: EntityData) => void;
  public onItemSpawned?: (item: ItemDropData) => void;
  public onItemCollected?: (data: { itemId: string; collectorId: string; itemType: string; value: number }) => void;
  public onPlayerStatsUpdated?: (data: { id: string; health: number; maxHealth: number; coins: number; acorns: number }) => void;
  public onChatBroadcast?: (chat: ChatMessage) => void;
  public onEmoteBroadcast?: (emote: EmoteEvent) => void;
  public onWorldFlagUpdated?: (key: string, value: boolean) => void;
  public onDialogueEvent?: (data: { npcId: string; speaker: string; portrait: string; text: string; responses?: { text: string; nextKey?: string; action?: string }[] }) => void;
  public onBossEvent?: (event: { action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated'; x?: number; y?: number; targetX?: number; targetY?: number }) => void;
  public onSocialResonance?: (data: { player1Id: string; player2Id: string; emote: EmoteType; x: number; y: number }) => void;
  public onPotThrown?: (data: { potId: string; throwerId: string; startX: number; startY: number; targetX: number; targetY: number; duration: number }) => void;
  public onPotCaught?: (data: { potId: string; catcherId: string; x: number; y: number }) => void;
  public onConnectionChange?: (connected: boolean) => void;

  public connect(url?: string) {
    let wsHost: string;
    if (window.location.port === '5173' || window.location.port === '5174' || window.location.port === '5175') {
      wsHost = `${window.location.hostname}:3001`;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      wsHost = `${window.location.hostname}:3001`;
    } else {
      wsHost = window.location.host;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = url || `${protocol}${wsHost}`;

    console.log(`[NetworkClient] Connecting to ${wsUrl}...`);
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[NetworkClient] Connected to server!');
        this.isConnected = true;
        this.onConnectionChange?.(true);
      };

      this.ws.onclose = () => {
        console.log('[NetworkClient] Disconnected from server');
        this.isConnected = false;
        this.onConnectionChange?.(false);
        // Auto-reconnect after 2 seconds
        setTimeout(() => this.connect(wsUrl), 2000);
      };

      this.ws.onerror = (err) => {
        console.warn('[NetworkClient] WebSocket error:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: ServerPacket = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (e) {
          console.error('[NetworkClient] Failed to parse packet:', e);
        }
      };
    } catch (e) {
      console.error('[NetworkClient] Could not initialize WebSocket:', e);
    }
  }

  private handlePacket(packet: ServerPacket) {
    switch (packet.type) {
      case 'init':
        this.yourId = packet.yourId;
        this.onInit?.(packet);
        break;
      case 'player_joined':
        this.onPlayerJoined?.(packet.player);
        break;
      case 'player_left':
        this.onPlayerLeft?.(packet.id);
        break;
      case 'world_tick':
        this.onWorldTick?.(packet.players);
        break;
      case 'entity_updated':
        this.onEntityUpdated?.(packet.entity);
        break;
      case 'chat_broadcast':
        this.onChatBroadcast?.(packet.chat);
        break;
      case 'emote_broadcast':
        this.onEmoteBroadcast?.(packet.emote);
        break;
      case 'world_flag_updated':
        this.onWorldFlagUpdated?.(packet.key, packet.value);
        break;
      case 'dialogue_event':
        this.onDialogueEvent?.(packet);
        break;
      case 'item_spawned':
        this.onItemSpawned?.(packet.item);
        break;
      case 'item_collected':
        this.onItemCollected?.(packet);
        break;
      case 'player_stats_updated':
        this.onPlayerStatsUpdated?.(packet);
        break;
      case 'boss_event':
        this.onBossEvent?.(packet);
        break;
      case 'social_resonance':
        this.onSocialResonance?.(packet);
        break;
      case 'pot_thrown':
        this.onPotThrown?.(packet);
        break;
      case 'pot_caught':
        this.onPotCaught?.(packet);
        break;
    }
  }

  public send(packet: ClientPacket) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(packet));
  }

  public sendJoin(name: string, color: string, paletteIndex: number) {
    this.send({ type: 'join', name, color, paletteIndex });
  }

  public sendMove(x: number, y: number, direction: Direction, anim: PlayerAnimState, carryingItem: string | null) {
    this.send({ type: 'move', x, y, direction, anim, carryingItem });
  }

  public sendInteract(targetId: string, action: 'cut' | 'lift' | 'toss' | 'catch' | 'talk' | 'press' | 'pet' | 'hit_enemy' | 'player_hurt' | 'pull_lever', x?: number, y?: number, damage?: number) {
    this.send({ type: 'interact', targetId, action, x, y, damage });
  }

  public sendPotThrow(potId: string, startX: number, startY: number, targetX: number, targetY: number) {
    this.send({ type: 'pot_throw', potId, startX, startY, targetX, targetY });
  }

  public sendPotCatch(potId: string) {
    this.send({ type: 'pot_catch', potId });
  }

  public sendChat(text: string) {
    this.send({ type: 'chat', text });
  }

  public sendEmote(emote: EmoteType) {
    this.send({ type: 'emote', emote });
  }

  public sendDialogueChoice(npcId: string, choiceIndex: number) {
    this.send({ type: 'dialogue_choice', npcId, choiceIndex });
  }

  public sendCollectItem(itemId: string) {
    this.send({ type: 'collect_item', itemId });
  }

  public sendAdminCommand(action: 'toggle_gate' | 'teleport' | 'heal' | 'spawn_item' | 'set_flag' | 'speed_boost' | 'spawn_enemy' | 'spawn_boss', payload?: any) {
    this.send({ type: 'admin_command', action, payload });
  }
}

export const network = new NetworkClient();
