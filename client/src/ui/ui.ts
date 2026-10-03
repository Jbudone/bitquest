import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { MinimapManager } from './Minimap';
import { QuestJournalManager } from './QuestJournal';
import { SettingsModal } from './SettingsModal';
import { BiomeBannerManager } from './BiomeBanner';
import { EmoteWheelManager } from './EmoteWheel';
import { saveManager } from '../storage/SaveManager';
import type { EmoteType } from '../../../shared/src/types';

export class UIManager {
  public minimap: MinimapManager;
  public quests: QuestJournalManager;
  public settings: SettingsModal;
  public biomes: BiomeBannerManager;
  public emoteWheel: EmoteWheelManager;
  private selectedPalette = 0;
  private currentTypewriterTimer: any = null;

  constructor() {
    this.minimap = new MinimapManager();
    this.quests = new QuestJournalManager((beacon) => {
      this.minimap.questBeacon = beacon;
    });
    this.quests.updateBeacon();
    this.settings = new SettingsModal();
    this.biomes = new BiomeBannerManager();
    this.emoteWheel = new EmoteWheelManager((emote) => {
      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
      worldScene?.triggerEmote(emote);
    });

    this.setupJoinModal();
    this.setupChatAndEmotes();
    this.setupDialogueBox();
    this.setupControlsHelp();
    this.setupAdminPanel();
    this.setupGlobalShortcuts();
  }

  private setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        sounds.ensureContext();
        this.minimap.toggleAtlas();
      }
      if (e.key === 'j' || e.key === 'J') {
        sounds.ensureContext();
        this.quests.toggleJournal();
      }
      if (e.key === 'Escape') {
        if (this.quests.isJournalOpen()) {
          this.quests.closeJournal();
          e.stopPropagation();
          return;
        }
        if (this.minimap.isAtlasActive()) {
          this.minimap.closeAtlas();
          e.stopPropagation();
          return;
        }
        if (this.settings.isSettingsOpen()) {
          this.settings.close();
          e.stopPropagation();
          return;
        }
        const dialogueModal = document.getElementById('dialogue-modal');
        if (dialogueModal && dialogueModal.classList.contains('active')) {
          this.hideDialogue();
          e.stopPropagation();
          return;
        }
        this.settings.toggle();
        e.stopPropagation();
      }
    });
  }

  private setupJoinModal() {
    const swatches = document.querySelectorAll('.palette-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        swatches.forEach(s => s.classList.remove('selected'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('selected');
        this.selectedPalette = Number(target.dataset.palette || 0);
      });
    });

    const startBtn = document.getElementById('start-btn');
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    // Prefill from local save if available
    const saved = saveManager.currentSave;
    if (saved && saved.name && nameInput) {
      nameInput.value = saved.name;
      this.selectedPalette = saved.palette;
      swatches.forEach(s => {
        if (Number((s as HTMLElement).dataset.palette) === saved.palette) {
          s.classList.add('selected');
        } else {
          s.classList.remove('selected');
        }
      });
    }

    // Settings header button hook
    document.getElementById('settings-toggle-btn')?.addEventListener('click', () => {
      this.settings.toggle();
    });

    const joinGame = () => {
      sounds.ensureContext();
      const rawName = nameInput.value.trim();
      const playerName = rawName || `Adventurer_${Math.floor(Math.random() * 899 + 100)}`;
      
      saveManager.updatePlayerSnapshot({
        name: playerName,
        palette: this.selectedPalette
      });

      (window as any).BitQuestUser = {
        name: playerName,
        palette: this.selectedPalette
      };

      const joinBackdrop = document.getElementById('join-modal-backdrop');
      if (joinBackdrop) {
        joinBackdrop.style.display = 'none';
      }

      // If network is already open, join immediately
      if (network.isConnected) {
        network.sendJoin(playerName, '#2e9939', this.selectedPalette);
      }

      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (worldScene?.localPlayer) {
        worldScene.localPlayer.updateProfile(playerName, this.selectedPalette);
      }

      this.showToast(`✨ Welcome to Oakhaven, ${playerName}!`);
    };

    startBtn?.addEventListener('click', joinGame);
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinGame();
    });
  }

  private setupChatAndEmotes() {
    // Emote buttons
    const emoteBtns = document.querySelectorAll('.emote-btn');
    emoteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.ensureContext();
        const emote = (e.currentTarget as HTMLElement).dataset.emote as EmoteType;
        if (emote) {
          const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
          worldScene?.triggerEmote(emote);
        }
      });
    });

    // Chat input
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const sendBtn = document.getElementById('chat-send-btn');

    const handleSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      sounds.ensureContext();
      network.sendChat(text);
      chatInput.value = '';
      chatInput.blur();
    };

    sendBtn?.addEventListener('click', handleSend);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSend();
      }
      e.stopPropagation(); // prevent game controls while typing
    });

    // Press Enter to focus chat
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement !== chatInput) {
        const modal = document.getElementById('join-modal-backdrop');
        if (modal && modal.style.display !== 'none') return;
        chatInput.focus();
        e.preventDefault();
      }
    });
  }

  private setupDialogueBox() {
    const closeBtn = document.getElementById('dialogue-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.hideDialogue();
    });
  }

  private setupControlsHelp() {
    // Network status listener
    network.onConnectionChange = (connected) => {
      const dot = document.querySelector('.status-dot') as HTMLElement;
      const text = document.querySelector('.status-text') as HTMLElement;
      if (dot && text) {
        dot.style.background = connected ? '#10b981' : '#ef4444';
        dot.style.boxShadow = connected ? '0 0 8px #10b981' : '0 0 8px #ef4444';
        text.innerText = connected ? 'Oakhaven Online' : 'Connecting...';
      }
    };
  }

  public showDialogue(data: { npcId: string; speaker: string; portrait: string; text: string; responses?: { text: string; nextKey?: string; action?: string }[] }) {
    const modal = document.getElementById('dialogue-modal');
    const speakerEl = document.getElementById('dialogue-speaker');
    const textEl = document.getElementById('dialogue-text');
    const portraitEl = document.getElementById('dialogue-portrait');
    const choicesEl = document.getElementById('dialogue-responses');

    if (!modal || !speakerEl || !textEl || !choicesEl || !portraitEl) return;

    sounds.ensureContext();
    speakerEl.innerText = data.speaker;
    this.quests.handleEvent({ type: 'talk', targetId: data.npcId });
    choicesEl.innerHTML = '';

    // Render portrait from Phaser texture if available
    const game = (window as any).BitQuestGame;
    const key = `portrait_${data.portrait}`;
    if (game && game.textures.exists(key)) {
      const tex = game.textures.get(key);
      const canvas = tex.getSourceImage() as HTMLCanvasElement;
      portraitEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = canvas.toDataURL();
      portraitEl.appendChild(img);
    } else {
      portraitEl.innerHTML = '💬';
    }

    modal.classList.add('active');

    // Typewriter text effect with retro blip sounds
    if (this.currentTypewriterTimer) {
      clearInterval(this.currentTypewriterTimer);
    }

    textEl.innerText = '';
    let charIdx = 0;
    const fullText = data.text;

    this.currentTypewriterTimer = setInterval(() => {
      if (charIdx < fullText.length) {
        textEl.innerText += fullText[charIdx];
        if (charIdx % 2 === 0 && fullText[charIdx] !== ' ') {
          sounds.playDialogueBlip(data.speaker.toLowerCase());
        }
        charIdx++;
      } else {
        clearInterval(this.currentTypewriterTimer);
        this.currentTypewriterTimer = null;
        this.renderChoices(data.npcId, data.responses || []);
      }
    }, 18);
  }

  private renderChoices(npcId: string, responses: { text: string; nextKey?: string; action?: string }[]) {
    const choicesEl = document.getElementById('dialogue-responses');
    if (!choicesEl) return;
    choicesEl.innerHTML = '';

    if (responses.length === 0) return;

    responses.forEach((resp, idx) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.innerText = `▶ ${resp.text}`;
      btn.addEventListener('click', () => {
        sounds.ensureContext();
        sounds.playDialogueBlip('click');
        network.sendDialogueChoice(npcId, idx);
      });
      choicesEl.appendChild(btn);
    });
  }

  public hideDialogue() {
    const modal = document.getElementById('dialogue-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    if (this.currentTypewriterTimer) {
      clearInterval(this.currentTypewriterTimer);
      this.currentTypewriterTimer = null;
    }
  }

  public showToast(message: string) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  public addChatMessage(chat: { senderName: string; text: string }) {
    // Optionally log in console or toast if wanted
    console.log(`[Chat] <${chat.senderName}> ${chat.text}`);
  }

  public updateHearts(health: number, maxHealth: number) {
    const container = document.getElementById('hearts-container');
    if (!container) return;
    let html = '';
    for (let i = 0; i < maxHealth; i++) {
      if (i < health) {
        html += `<span class="heart-icon full pop">❤️</span>`;
      } else {
        html += `<span class="heart-icon empty" style="opacity: 0.25; filter: grayscale(1);">🖤</span>`;
      }
    }
    container.innerHTML = html;
  }

  public updateCurrency(coins: number, acorns: number) {
    const coinEl = document.getElementById('coin-counter');
    const acornEl = document.getElementById('acorn-counter');
    if (coinEl) coinEl.innerText = coins.toString();
    if (acornEl) acornEl.innerText = acorns.toString();
  }

  public updateBossHp(hp: number, maxHp: number, name?: string) {
    const bossHud = document.getElementById('boss-hud');
    const bossBar = document.getElementById('boss-bar-fill');
    const bossText = document.getElementById('boss-hp-text');
    const bossName = document.getElementById('boss-name');

    if (!bossHud || !bossBar || !bossText) return;

    if (hp <= 0) {
      this.hideBossHp();
      return;
    }

    bossHud.classList.remove('hidden');
    if (name && bossName) bossName.innerText = name;

    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    bossBar.style.width = `${pct}%`;
    bossText.innerText = `${hp} / ${maxHp} HP`;
  }

  public hideBossHp() {
    const bossHud = document.getElementById('boss-hud');
    if (bossHud) {
      bossHud.classList.add('hidden');
    }
  }

  public toggleAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
      panel.classList.toggle('hidden');
    }
  }

  private setupAdminPanel() {
    const toggleBtn = document.getElementById('admin-toggle-btn');
    const closeBtn = document.getElementById('admin-close-btn');
    toggleBtn?.addEventListener('click', () => this.toggleAdminPanel());
    closeBtn?.addEventListener('click', () => this.toggleAdminPanel());

    // Puzzle overrides
    document.getElementById('admin-solve-switches')?.addEventListener('click', () => {
      network.sendAdminCommand('solve_switches');
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      scene?.openGate(true);
      this.showToast('🗝️ Admin: Sun stones activated & gate unlocked!');
    });

    document.getElementById('admin-toggle-gate')?.addEventListener('click', () => {
      network.sendAdminCommand('toggle_gate');
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      const gate = scene?.entityObjects?.get('ancient_gate');
      if (gate) {
        const isOpened = gate.texture.key === 'gate_opened';
        if (isOpened) scene.closeGate();
        else scene.openGate(true);
      }
      this.showToast('🚪 Admin: Toggled Sunken Gate');
    });

    // Player Cheats
    const godBtn = document.getElementById('admin-godmode');
    godBtn?.addEventListener('click', () => {
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (scene?.localPlayer) {
        scene.localPlayer.godMode = !scene.localPlayer.godMode;
        scene.localPlayer.isInvulnerable = scene.localPlayer.godMode;
        godBtn.innerText = `God Mode: ${scene.localPlayer.godMode ? 'ON' : 'OFF'}`;
        godBtn.classList.toggle('active', scene.localPlayer.godMode);
        this.showToast(scene.localPlayer.godMode ? '⚡ God Mode Enabled!' : 'God Mode Disabled');
      }
    });

    const speedBtn = document.getElementById('admin-speed');
    speedBtn?.addEventListener('click', () => {
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (scene?.localPlayer) {
        scene.localPlayer.speedMultiplier = scene.localPlayer.speedMultiplier === 1 ? 2.5 : 1;
        const isFast = scene.localPlayer.speedMultiplier > 1;
        speedBtn.innerText = `2.5x Speed: ${isFast ? 'ON' : 'OFF'}`;
        speedBtn.classList.toggle('active', isFast);
        this.showToast(isFast ? '🏃 Fast Speed Enabled!' : 'Normal Speed Restored');
      }
    });

    document.getElementById('admin-heal')?.addEventListener('click', () => {
      network.sendAdminCommand('heal');
      const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (scene?.localPlayer) {
        scene.localPlayer.health = scene.localPlayer.maxHealth;
        this.updateHearts(scene.localPlayer.health, scene.localPlayer.maxHealth);
        sounds.playStrawberry();
        this.showToast('❤️ Full Health Restored!');
      }
    });

    // Teleport buttons
    document.querySelectorAll('.tp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const x = Number(target.dataset.x);
        const y = Number(target.dataset.y);
        const scene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
        if (scene?.localPlayer) {
          scene.localPlayer.setPosition(x, y);
          network.sendMove(x, y, scene.localPlayer.direction, 'idle', scene.localPlayer.carryingPotId);
          this.showToast(`📍 Teleported to (${x}, ${y})!`);
        }
      });
    });

    // Spawn Boss & Enemies
    document.getElementById('admin-spawn-sprout')?.addEventListener('click', () => {
      network.sendAdminCommand('spawn_enemy', { type: 'sproutling' });
      this.showToast('🥕 Spawned wild Sproutling!');
    });

    document.getElementById('admin-spawn-grumble')?.addEventListener('click', () => {
      network.sendAdminCommand('spawn_enemy', { type: 'grumble' });
      this.showToast('🍄 Spawned grumpy Grumble Shroom!');
    });

    document.getElementById('admin-spawn-boss')?.addEventListener('click', () => {
      network.sendAdminCommand('spawn_boss');
      this.showToast('👑 Baron von Truffle has entered the arena!');
    });

    // Spawn item buttons
    document.querySelectorAll('.spawn-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const itemType = target.dataset.item;
        const val = Number(target.dataset.val);
        network.sendAdminCommand('spawn_item', { itemType, value: val });
        this.showToast(`🎁 Spawned ${itemType}!`);
      });
    });
  }
}
