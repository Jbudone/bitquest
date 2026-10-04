import { network } from '../network/NetworkClient';
import { sounds } from '../audio/SoundManager';
import { MinimapManager } from './Minimap';
import { QuestJournalManager } from './QuestJournal';
import { SettingsModal } from './SettingsModal';
import { BiomeBannerManager } from './BiomeBanner';
import { EmoteWheelManager } from './EmoteWheel';
import { DialogueParser } from './DialogueParser';
import { EquipmentSheetManager } from './EquipmentSheet';
import { FishLogbookManager } from './FishLogbook';
import { ShopModal } from './ShopModal';
import { OcarinaModal } from './OcarinaModal';
import { TouchControls } from './TouchControls';
import { saveManager } from '../storage/SaveManager';
import type { EmoteType, CharacterClassId, WeatherType } from '../../../shared/src/types';
import { ClassManager } from '../../../shared/src/classes';
import { WeatherEngine } from '../../../shared/src/weather';

export class UIManager {
  public minimap: MinimapManager;
  public quests: QuestJournalManager;
  public settings: SettingsModal;
  public biomes: BiomeBannerManager;
  public emoteWheel: EmoteWheelManager;
  public equipmentSheet: EquipmentSheetManager;
  public fishLogbook: FishLogbookManager;
  public shopModal: ShopModal;
  public ocarina: OcarinaModal;
  public touchControls: TouchControls;
  private selectedPalette = 0;
  public selectedClass: CharacterClassId = 'warrior';
  private currentTypewriterTimer: any = null;
  private fastForwardDialogue: (() => void) | null = null;

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
    this.equipmentSheet = new EquipmentSheetManager();
    this.fishLogbook = new FishLogbookManager();
    this.shopModal = new ShopModal();
    this.ocarina = new OcarinaModal();
    this.touchControls = new TouchControls(() => (window as any).BitQuestGame?.scene?.getScene('WorldScene'));
    (window as any).BitQuestTouch = this.touchControls;

    window.addEventListener('resize', () => {
      this.touchControls.evaluateVisibility();
    });

    document.getElementById('gear-toggle-btn')?.addEventListener('click', () => {
      this.equipmentSheet.toggle();
    });

    document.getElementById('ocarina-toggle-btn')?.addEventListener('click', () => {
      this.ocarina.toggle();
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
      if (e.key === 'Tab') {
        e.preventDefault();
        sounds.ensureContext();
        this.quests.toggleJournal();
      }
      if (e.key === 'c' || e.key === 'C') {
        sounds.ensureContext();
        this.equipmentSheet.toggle();
      }
      if (e.key === 'b' || e.key === 'B') {
        sounds.ensureContext();
        this.fishLogbook.toggle();
      }
      if (e.key === 'o' || e.key === 'O') {
        sounds.ensureContext();
        this.ocarina.toggle();
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E' || e.key === 'k' || e.key === 'K') {
        const dialogueModal = document.getElementById('dialogue-modal');
        if (dialogueModal && dialogueModal.classList.contains('active')) {
          if (this.fastForwardDialogue) {
            this.fastForwardDialogue();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          const choicesEl = document.getElementById('dialogue-responses');
          if (choicesEl && choicesEl.querySelectorAll('.dialogue-choice').length === 0) {
            this.hideDialogue();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }
      if (e.key === 'Escape') {
        if (this.ocarina.isOpen()) {
          this.ocarina.close();
          e.stopPropagation();
          return;
        }
        if (this.fishLogbook.isOpen) {
          this.fishLogbook.close();
          e.stopPropagation();
          return;
        }
        if (this.equipmentSheet.isOpen) {
          this.equipmentSheet.close();
          e.stopPropagation();
          return;
        }
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

    // Class archetype picker
    const classCards = document.querySelectorAll('.class-card');
    classCards.forEach(card => {
      card.addEventListener('click', (e) => {
        classCards.forEach(c => c.classList.remove('selected'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('selected');
        this.selectedClass = (target.dataset.class as CharacterClassId) || 'warrior';
        sounds.ensureContext();
        sounds.playClick();
      });
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
        palette: this.selectedPalette,
        classId: this.selectedClass
      };

      const joinBackdrop = document.getElementById('join-modal-backdrop');
      if (joinBackdrop) {
        joinBackdrop.style.display = 'none';
      }

      // If network is already open, join immediately
      if (network.isConnected) {
        network.sendJoin(playerName, '#2e9939', this.selectedPalette);
        network.sendSetClass(this.selectedClass);
      }

      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene') as any;
      if (worldScene?.localPlayer) {
        worldScene.localPlayer.updateProfile(playerName, this.selectedPalette);
        worldScene.localPlayer.classId = this.selectedClass;
      }
      this.updateClassAbilityHUD(this.selectedClass);

      this.showToast(`✨ Welcome to Oakhaven, ${playerName} the ${ClassManager.getClass(this.selectedClass).name}!`);
    };

    startBtn?.addEventListener('click', joinGame);
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinGame();
    });
  }

  private setupChatAndEmotes() {
    // Class ability hotbar buttons
    document.getElementById('ability-btn-1')?.addEventListener('click', () => {
      sounds.ensureContext();
      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
      worldScene?.useClassAbility(1);
    });

    document.getElementById('ability-btn-2')?.addEventListener('click', () => {
      sounds.ensureContext();
      const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
      worldScene?.useClassAbility(2);
    });

    // Spell hotbar buttons
    const spellBtns = document.querySelectorAll('.spell-slot-btn');
    spellBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.ensureContext();
        const spell = (e.currentTarget as HTMLElement).dataset.spell;
        if (spell) {
          const worldScene = (window as any).BitQuestGame?.scene?.getScene('WorldScene');
          worldScene?.castSpell(spell);
        }
      });
    });

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
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideDialogue();
    });

    const modal = document.getElementById('dialogue-modal');
    modal?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.dialogue-choice') || (e.target as HTMLElement).closest('.dialogue-close-btn')) {
        return;
      }
      if (this.fastForwardDialogue) {
        this.fastForwardDialogue();
      } else {
        const choicesEl = document.getElementById('dialogue-responses');
        if (choicesEl && choicesEl.querySelectorAll('.dialogue-choice').length === 0) {
          this.hideDialogue();
        }
      }
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

    const renderPortrait = (mood: string = 'default') => {
      const game = (window as any).BitQuestGame;
      const keyWithMood = `portrait_${data.portrait}_${mood}`;
      const fallbackKey = `portrait_${data.portrait}`;
      let texKey = fallbackKey;
      if (game && game.textures.exists(keyWithMood)) {
        texKey = keyWithMood;
      } else if (game && !game.textures.exists(fallbackKey)) {
        texKey = 'portrait_default';
      }

      if (game && game.textures.exists(texKey)) {
        const tex = game.textures.get(texKey);
        const canvas = tex.getSourceImage() as HTMLCanvasElement;
        portraitEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = canvas.toDataURL();
        portraitEl.appendChild(img);
      } else {
        portraitEl.innerHTML = '💬';
      }

      portraitEl.classList.remove('pop');
      void portraitEl.offsetWidth; // trigger reflow for pop animation
      portraitEl.classList.add('pop');
    };

    renderPortrait('default');
    modal.classList.add('active');

    if (this.currentTypewriterTimer) {
      clearTimeout(this.currentTypewriterTimer);
      this.currentTypewriterTimer = null;
    }

    textEl.innerHTML = '';
    const parsed = DialogueParser.parse(data.text);
    const tokens = parsed.tokens;
    let tokenIdx = 0;
    let currentMood = 'default';
    let currentSpeed = 18;

    const appendCharSpan = (tok: { char: string; styles: string[]; charIndex: number }) => {
      const span = document.createElement('span');
      span.textContent = tok.char;
      if (tok.styles.length > 0) {
        span.className = tok.styles.join(' ');
      }
      span.style.setProperty('--char-i', tok.charIndex.toString());
      textEl.appendChild(span);
    };

    const finishTypewriter = () => {
      if (this.currentTypewriterTimer) {
        clearTimeout(this.currentTypewriterTimer);
        this.currentTypewriterTimer = null;
      }
      this.fastForwardDialogue = null;

      while (tokenIdx < tokens.length) {
        const tok = tokens[tokenIdx]!;
        if (tok.type === 'mood') {
          currentMood = tok.mood;
          renderPortrait(currentMood);
        } else if (tok.type === 'char') {
          appendCharSpan(tok);
        }
        tokenIdx++;
      }
      this.renderChoices(data.npcId, data.responses || []);
    };

    this.fastForwardDialogue = finishTypewriter;

    const step = () => {
      while (tokenIdx < tokens.length) {
        const tok = tokens[tokenIdx]!;
        if (tok.type === 'mood') {
          currentMood = tok.mood;
          renderPortrait(currentMood);
          sounds.playDialogueBlip(data.speaker, currentMood, 1.25);
          tokenIdx++;
          continue;
        }
        if (tok.type === 'speed') {
          currentSpeed = tok.speed;
          tokenIdx++;
          continue;
        }
        if (tok.type === 'pause') {
          tokenIdx++;
          this.currentTypewriterTimer = setTimeout(step, tok.duration);
          return;
        }
        if (tok.type === 'char') {
          appendCharSpan(tok);
          tokenIdx++;
          if (tok.char !== ' ' && tok.char !== '\n') {
            sounds.playDialogueBlip(data.speaker, currentMood);
          }

          let delay = currentSpeed;
          if (tok.char === ',' || tok.char === ';') {
            delay += 110;
          } else if (tok.char === '.' || tok.char === '!' || tok.char === '?') {
            delay += 230;
          }

          this.currentTypewriterTimer = setTimeout(step, delay);
          return;
        }
      }

      finishTypewriter();
    };

    step();
  }

  private renderChoices(npcId: string, responses: { text: string; nextKey?: string; action?: string }[]) {
    const choicesEl = document.getElementById('dialogue-responses');
    if (!choicesEl) return;
    choicesEl.innerHTML = '';

    if (responses.length === 0) {
      const prompt = document.createElement('div');
      prompt.className = 'dialogue-prompt-continue';
      prompt.innerText = '▼ Click to continue...';
      prompt.style.cursor = 'pointer';
      prompt.addEventListener('click', (e) => {
        e.stopPropagation();
        sounds.ensureContext();
        sounds.playDialogueBlip('click');
        this.hideDialogue();
      });
      choicesEl.appendChild(prompt);
      return;
    }

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
      clearTimeout(this.currentTypewriterTimer);
      this.currentTypewriterTimer = null;
    }
    this.fastForwardDialogue = null;
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

  public updateMana(mana: number, maxMana: number) {
    const fill = document.getElementById('mana-bar-fill');
    const counter = document.getElementById('mana-counter');
    const container = document.getElementById('mana-bar-container');
    if (fill) {
      const pct = Math.max(0, Math.min(100, Math.round((mana / maxMana) * 100)));
      fill.style.width = `${pct}%`;
    }
    if (counter) {
      counter.innerText = `${mana} / ${maxMana}`;
    }
    if (container) {
      container.title = `Player Mana (${mana}/${maxMana} MP)`;
    }

    // Update spell hotbar affordability state
    const fireballBtn = document.getElementById('spell-btn-fireball');
    const iceBtn = document.getElementById('spell-btn-ice-lance');
    const galeBtn = document.getElementById('spell-btn-gale-ward');
    if (fireballBtn) fireballBtn.classList.toggle('on-cooldown', mana < 15);
    if (iceBtn) iceBtn.classList.toggle('on-cooldown', mana < 12);
    if (galeBtn) galeBtn.classList.toggle('on-cooldown', mana < 20);
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

    // Circadian time controls (Task 7.6 / Issue #24)
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const hour = Number(target.dataset.hour);
        network.sendAdminSetTime(hour);
        this.showToast(`☀️ World Time set to ${hour}:00!`);
      });
    });

    // Dynamic weather overrides (Task 7.6 / Issue #24)
    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const weather = target.dataset.weather as WeatherType;
        if (weather) {
          network.sendAdminSetWeather(weather);
          this.showToast(`🌧️ Weather changed to ${weather.toUpperCase()}!`);
        }
      });
    });
  }

  public updateClockAndWeather(timeOfDaySec: number, weather: WeatherType) {
    const info = WeatherEngine.getTimeOfDay(timeOfDaySec);
    const clockIcon = document.getElementById('hud-clock-icon');
    const clockTime = document.getElementById('hud-clock-time');
    const weatherBadge = document.getElementById('hud-weather-badge');

    if (clockIcon) clockIcon.textContent = info.icon;
    if (clockTime) clockTime.textContent = info.formattedTime;
    if (weatherBadge) {
      let weatherText = 'Clear';
      let weatherColor = '#38bdf8';
      if (weather === 'rain') {
        weatherText = 'Rain';
        weatherColor = '#60a5fa';
      } else if (weather === 'storm') {
        weatherText = 'Storm';
        weatherColor = '#facc15';
      } else if (weather === 'fog') {
        weatherText = 'Fog';
        weatherColor = '#cbd5e1';
      } else {
        weatherText = info.phaseTitle.split(' ')[0]!;
        weatherColor = info.phase === 'golden_hour' ? '#fb923c' : info.phase === 'night' ? '#818cf8' : '#38bdf8';
      }
      weatherBadge.textContent = weatherText;
      weatherBadge.style.color = weatherColor;
    }
  }

  public updateClassAbilityHUD(classId: CharacterClassId, currentMana?: number) {
    const cls = ClassManager.getClass(classId);
    const ab1 = cls.abilities[0];
    const ab2 = cls.abilities[1];

    const icon1 = document.getElementById('ability-1-icon');
    const name1 = document.getElementById('ability-1-name');
    const cost1 = document.getElementById('ability-1-cost');
    const btn1 = document.getElementById('ability-btn-1');

    if (icon1) icon1.innerText = ab1.icon;
    if (name1) name1.innerText = ab1.name.split(' ')[0];
    if (cost1) cost1.innerText = `${ab1.manaCost} MP`;
    if (btn1) {
      btn1.title = `${ab1.name} [Z] (${ab1.manaCost} MP) - ${ab1.description}`;
      if (currentMana !== undefined) {
        btn1.style.opacity = currentMana < ab1.manaCost ? '0.5' : '1';
      }
    }

    const icon2 = document.getElementById('ability-2-icon');
    const name2 = document.getElementById('ability-2-name');
    const cost2 = document.getElementById('ability-2-cost');
    const btn2 = document.getElementById('ability-btn-2');

    if (icon2) icon2.innerText = ab2.icon;
    if (name2) name2.innerText = ab2.name.split(' ')[0];
    if (cost2) cost2.innerText = `${ab2.manaCost} MP`;
    if (btn2) {
      btn2.title = `${ab2.name} [X] (${ab2.manaCost} MP) - ${ab2.description}`;
      if (currentMana !== undefined) {
        btn2.style.opacity = currentMana < ab2.manaCost ? '0.5' : '1';
      }
    }
  }
}
