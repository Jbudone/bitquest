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
  ItemDropData,
  SpellId,
  EquipmentSlot,
  VanitySlot,
  PlayerEquipment,
  PlayerVanity,
  AggregatedEquipmentStats,
  CharacterClassId,
  ClassAbilityId,
  WeatherType
} from '../../../shared/src/types';

export class NetworkClient {
  private ws: WebSocket | null = null;
  public isConnected = false;
  public yourId: string | null = null;

  public onInit?: (data: { yourId: string; players: PlayerData[]; entities: EntityData[]; items: ItemDropData[]; worldFlags: Record<string, boolean>; weather?: WeatherType; timeOfDaySec?: number }) => void;
  public onPlayerJoined?: (player: PlayerData) => void;
  public onPlayerLeft?: (id: string) => void;
  public onWorldTick?: (players: Array<{ id: string; x: number; y: number; direction: Direction; anim: PlayerAnimState; carryingItem: string | null }>) => void;
  public onEntityUpdated?: (entity: EntityData) => void;
  public onItemSpawned?: (item: ItemDropData) => void;
  public onItemCollected?: (data: { itemId: string; collectorId: string; itemType: string; value: number }) => void;
  public onPlayerStatsUpdated?: (data: { id: string; health: number; maxHealth: number; mana: number; maxMana: number; coins: number; acorns: number }) => void;
  public onSpellCast?: (data: { casterId: string; spellId: SpellId; x: number; y: number; direction: Direction }) => void;
  public onEquipmentUpdated?: (data: { playerId: string; equipment: PlayerEquipment; vanity: PlayerVanity; stats: AggregatedEquipmentStats }) => void;
  public onArrowShot?: (data: { shooterId: string; x: number; y: number; direction: Direction; speed: number; range: number; damage: number }) => void;
  public onClassUpdated?: (data: { playerId: string; classId: CharacterClassId; stats: AggregatedEquipmentStats }) => void;
  public onClassAbilityTriggered?: (data: { playerId: string; abilityId: ClassAbilityId; x: number; y: number; direction: Direction; targetId?: string }) => void;
  public onParryEvent?: (data: { playerId: string; attackerId?: string; x: number; y: number }) => void;
  public onLifeSiphonEvent?: (data: { casterId: string; targetId: string; amount: number; casterHp: number }) => void;
  public onMinionSpawned?: (data: { minionId: string; ownerId: string; x: number; y: number; subtype: string }) => void;
  public onChatBroadcast?: (chat: ChatMessage) => void;
  public onEmoteBroadcast?: (emote: EmoteEvent) => void;
  public onWorldFlagUpdated?: (key: string, value: boolean) => void;
  public onDialogueEvent?: (data: { npcId: string; speaker: string; portrait: string; text: string; responses?: { text: string; nextKey?: string; action?: string }[] }) => void;
  public onBossEvent?: (event: { action: 'spawn' | 'stomp' | 'spore' | 'charge' | 'crash_stun' | 'defeated' | 'crypt_spike' | 'scythe_cleave' | 'darkness_shroud' | 'soul_barrage'; bossId?: string; x?: number; y?: number; targetX?: number; targetY?: number }) => void;
  public onSocialResonance?: (data: { player1Id: string; player2Id: string; emote: EmoteType; x: number; y: number }) => void;
  public onPotThrown?: (data: { potId: string; throwerId: string; startX: number; startY: number; targetX: number; targetY: number; duration: number }) => void;
  public onPotCaught?: (data: { potId: string; catcherId: string; x: number; y: number }) => void;
  public onDungeonTransition?: (data: { floorId: 'f1' | 'f2' | 'overworld'; x: number; y: number; title: string; subtitle: string }) => void;
  public onTorchLitEvent?: (data: { torchId: string; x: number; y: number; roomSolved?: boolean }) => void;
  public onFishingStarted?: (data: { playerId: string; startX: number; startY: number; targetX: number; targetY: number }) => void;
  public onFishingBite?: (data: { playerId: string; biteTime: number; speciesHint: string; sweetSpotWidth: number; pullResistance: number }) => void;
  public onFishingTensionSync?: (data: { playerId: string; tension: number; sweetSpotCenter: number; reelProgress: number }) => void;
  public onFishingResolved?: (data: { playerId: string; result: 'caught' | 'escaped' | 'snapped' | 'cancelled'; speciesId?: string; sizeCm?: number; value?: number; isPersonalBest?: boolean }) => void;
  public onFishLogSync?: (data: { playerId: string; log: any }) => void;
  public onWeatherSync?: (data: { weather: WeatherType; timeOfDaySec: number; transitionProgress: number; windAngle: number; windSpeed: number }) => void;
  public onLightningStrike?: (data: { x: number; y: number }) => void;
  public onCampfireRest?: (data: { playerId: string; campfireId: string; healedHp: number; restoredMana: number }) => void;
  public onShopSync?: (data: { merchantId: string; merchantName: string; merchantTitle: string; portrait: string; greeting: string; wares: any[]; playerCoins: number; playerAcorns: number; inventory: string[] }) => void;
  public onShopTransactionResult?: (data: { success: boolean; message: string; newCoins: number; newAcorns: number; inventory: string[]; wares?: any[] }) => void;
  public onMountToggle?: (data: { playerId: string; mountId: string | null; x: number; y: number }) => void;
  public onPetAlert?: (data: { petId: string; alertType: 'secret' | 'enemy'; x: number; y: number; text: string }) => void;
  public onReconcile?: (ackSeq: number, x: number, y: number) => void;
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
      case 'spell_cast':
        this.onSpellCast?.(packet);
        break;
      case 'equipment_updated':
        this.onEquipmentUpdated?.(packet);
        break;
      case 'arrow_shot':
        this.onArrowShot?.(packet);
        break;
      case 'class_updated':
        this.onClassUpdated?.(packet);
        break;
      case 'class_ability_triggered':
        this.onClassAbilityTriggered?.(packet);
        break;
      case 'parry_event':
        this.onParryEvent?.(packet);
        break;
      case 'life_siphon_event':
        this.onLifeSiphonEvent?.(packet);
        break;
      case 'minion_spawned':
        this.onMinionSpawned?.(packet);
        break;
      case 'dungeon_transition':
        this.onDungeonTransition?.(packet);
        break;
      case 'torch_lit_event':
        this.onTorchLitEvent?.(packet);
        break;
      case 'fishing_started':
        this.onFishingStarted?.(packet);
        break;
      case 'fishing_bite':
        this.onFishingBite?.(packet);
        break;
      case 'fishing_tension_sync':
        this.onFishingTensionSync?.(packet);
        break;
      case 'fishing_resolved':
        this.onFishingResolved?.(packet);
        break;
      case 'fish_log_sync':
        this.onFishLogSync?.(packet);
        break;
      case 'weather_sync':
        this.onWeatherSync?.({
          weather: packet.weather,
          timeOfDaySec: packet.timeOfDaySec,
          transitionProgress: packet.transitionProgress,
          windAngle: packet.windAngle,
          windSpeed: packet.windSpeed
        });
        break;
      case 'lightning_strike':
        this.onLightningStrike?.({
          x: packet.x,
          y: packet.y
        });
        break;
      case 'campfire_rest':
        this.onCampfireRest?.({
          playerId: packet.playerId,
          campfireId: packet.campfireId,
          healedHp: packet.healedHp,
          restoredMana: packet.restoredMana
        });
        break;
      case 'shop_sync':
        this.onShopSync?.(packet);
        break;
      case 'shop_transaction_result':
        this.onShopTransactionResult?.(packet);
        break;
      case 'mount_toggle':
        this.onMountToggle?.(packet);
        break;
      case 'pet_alert':
        this.onPetAlert?.(packet);
        break;
      case 'reconcile':
        this.onReconcile?.(packet.ackSeq, packet.x, packet.y);
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

  public sendMove(x: number, y: number, direction: Direction, anim: PlayerAnimState, carryingItem: string | null, seq?: number, isTeleport?: boolean) {
    this.send({ type: 'move', x, y, direction, anim, carryingItem, seq, isTeleport });
  }

  public sendCastSpell(spellId: SpellId, x: number, y: number, direction: Direction) {
    this.send({ type: 'cast_spell', spellId, x, y, direction });
  }

  public sendEquipItem(slot: EquipmentSlot, itemId: string | null) {
    this.send({ type: 'equip_item', slot, itemId });
  }

  public sendSetVanity(slot: VanitySlot, vanityId: string | null) {
    this.send({ type: 'set_vanity', slot, vanityId });
  }

  public sendSetClass(classId: CharacterClassId) {
    this.send({ type: 'set_class', classId });
  }

  public sendUseClassAbility(abilityId: ClassAbilityId, x: number, y: number, direction: Direction) {
    this.send({ type: 'use_class_ability', abilityId, x, y, direction });
  }

  public sendShootArrow(x: number, y: number, direction: Direction, damage: number) {
    this.send({ type: 'shoot_arrow', x, y, direction, damage });
  }

  public sendInteract(targetId: string, action: 'cut' | 'lift' | 'toss' | 'catch' | 'talk' | 'press' | 'pet' | 'hit_enemy' | 'player_hurt' | 'pull_lever' | 'light_torch' | 'enter_dungeon' | 'warp_floor' | 'sit_campfire', x?: number, y?: number, damage?: number) {
    this.send({ type: 'interact', targetId, action, x, y, damage });
  }

  public sendSitCampfire(campfireId: string) {
    this.send({ type: 'interact', targetId: campfireId, action: 'sit_campfire' });
  }

  public sendPotThrow(potId: string, startX: number, startY: number, targetX: number, targetY: number) {
    this.send({ type: 'pot_throw', potId, startX, startY, targetX, targetY });
  }

  public sendPotCatch(potId: string) {
    this.send({ type: 'pot_catch', potId });
  }

  public sendFishingCast(targetX: number, targetY: number) {
    this.send({ type: 'fishing_cast', targetX, targetY });
  }

  public sendFishingReel(isHolding: boolean) {
    this.send({ type: 'fishing_reel', isHolding });
  }

  public sendFishingCancel() {
    this.send({ type: 'fishing_cancel' });
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

  public sendAdminCommand(action: 'toggle_gate' | 'teleport' | 'heal' | 'spawn_item' | 'set_flag' | 'speed_boost' | 'spawn_enemy' | 'spawn_boss' | 'set_weather' | 'set_time', payload?: any) {
    this.send({ type: 'admin_command', action, payload });
  }

  public sendAdminSetWeather(weather: WeatherType) {
    this.sendAdminCommand('set_weather', { weather });
  }

  public sendAdminSetTime(hour: number) {
    this.sendAdminCommand('set_time', { hour });
  }

  public sendShopOpen(merchantId: string) {
    this.send({ type: 'shop_open', merchantId });
  }

  public sendShopBuy(merchantId: string, itemId: string, quantity: number = 1) {
    this.send({ type: 'shop_buy', merchantId, itemId, quantity });
  }

  public sendShopSell(merchantId: string, inventoryIndex: number, quantity: number = 1) {
    this.send({ type: 'shop_sell', merchantId, inventoryIndex, quantity });
  }

  public sendMountToggle(mountId: string | null) {
    this.send({
      type: 'interact',
      targetId: mountId || 'mount_frog_mossy',
      action: mountId ? 'mount' : 'dismount'
    });
  }

  public sendPetCommand(petId: string, action: 'follow' | 'stay' | 'pet') {
    this.send({
      type: 'interact',
      targetId: petId,
      action: 'pet_command'
    });
  }
}

export const network = new NetworkClient();
