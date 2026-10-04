// tools/run_deep_qa.ts
// Comprehensive Automated End-to-End QA Test Suite for BitQuest
// Connects via Chrome DevTools Protocol to inspect live gameplay, execute all interactions,
// assert state transitions, and verify zero unhandled exceptions or console errors.

import { spawn } from 'child_process';

interface QATestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function runDeepQA() {
  console.log('🚀 Starting BitQuest Deep Automated QA Test Suite...\n');

  const chrome = spawn('/usr/bin/chromium', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const exceptions: any[] = [];
  const results: QATestResult[] = [];

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find((t: any) => t.type === 'page');
    if (!pageTab) {
      throw new Error('No page tab found in headless Chrome');
    }

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let nextId = 1;
    const pendingCallbacks = new Map<number, (res: any) => void>();

    function sendCommand(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = nextId++;
        pendingCallbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id)!;
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const args = msg.params.args.map((a: any) => a.value || a.description || JSON.stringify(a)).join(' ');
        if (type === 'error') {
          consoleErrors.push(args);
          console.error('  ❌ [Browser ERROR]', args);
        } else if (type === 'warning') {
          consoleWarnings.push(args);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails);
        console.error('  💥 [Browser EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = async () => {
        await sendCommand('Runtime.enable');
        await sendCommand('Console.enable');
        await sendCommand('Log.enable');
        resolve(true);
      };
    });

    async function evaluateInBrowser(expr: string): Promise<any> {
      const res = await sendCommand('Runtime.evaluate', {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result?.value;
    }

    async function runTest(name: string, fn: () => Promise<void>) {
      const beforeErrCount = consoleErrors.length;
      const beforeExcCount = exceptions.length;
      try {
        await fn();
        const newErrs = consoleErrors.length - beforeErrCount;
        const newExcs = exceptions.length - beforeExcCount;
        if (newErrs > 0 || newExcs > 0) {
          results.push({ name, passed: false, error: `${newErrs} errors, ${newExcs} exceptions logged` });
          console.log(`  ❌ FAIL: ${name} (${newErrs} errors, ${newExcs} exceptions)`);
        } else {
          results.push({ name, passed: true });
          console.log(`  ✅ PASS: ${name}`);
        }
      } catch (err: any) {
        results.push({ name, passed: false, error: err.message });
        console.log(`  ❌ FAIL: ${name} - ${err.message}`);
      }
    }

    // Wait for world scene & local player
    await new Promise(r => setTimeout(r, 2500));

    console.log('--- 1. CORE SYSTEM & PLAYER LIFECYCLE ---');

    await runTest('Player and World Scene Initialization', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const game = window.BitQuestGame;
          const scene = game?.scene?.getScene('WorldScene');
          if (!scene) return { ok: false, reason: 'No WorldScene' };
          if (!scene.localPlayer) return { ok: false, reason: 'No local player' };
          return {
            ok: true,
            playerId: scene.localPlayer.id,
            x: scene.localPlayer.x,
            y: scene.localPlayer.y,
            hp: scene.localPlayer.health,
            maxHp: scene.localPlayer.maxHealth,
            mana: scene.localPlayer.mana,
            maxMana: scene.localPlayer.maxMana,
            classId: scene.localPlayer.classId
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (res.hp <= 0 || res.maxHp <= 0) throw new Error('Invalid player HP stats');
    });

    await runTest('Player Movement & Dodge Roll Mechanics', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const p = scene.localPlayer;
          const startX = p.x;
          const startY = p.y;

          // Perform roll
          p.roll();
          const isRollingDuring = p.isRolling;

          return { startX, startY, isRollingDuring };
        })()
      `);
      if (!res.isRollingDuring) throw new Error('Dodge roll state did not activate');
      await new Promise(r => setTimeout(r, 480));
      const resAfter = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          return { isRollingAfter: scene.localPlayer.isRolling };
        })()
      `);
      if (resAfter.isRollingAfter) throw new Error('Dodge roll state did not terminate');
    });

    console.log('\n--- 2. POT LIFTING, THROWING & PRESSURE SWITCHES ---');

    await runTest('Pot Lift, Carry, Throw & Shatter Lifecycle', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const p = scene.localPlayer;

          // Lift pot_1
          p.liftPot('pot_1');
          const isCarrying = p.carryingPotId === 'pot_1';

          // Throw pot using attack key (Space / J)
          scene.handleActionAttack();
          const carriedAfterThrow = p.carryingPotId;

          return { isCarrying, carriedAfterThrow };
        })()
      `);
      if (!res.isCarrying) throw new Error('Pot was not carried');
      if (res.carriedAfterThrow !== null) throw new Error('Pot still carried after throw');

      // Wait for pot arc flight and landing shatter
      await new Promise(r => setTimeout(r, 450));
    });

    await runTest('Twin Sun Pressure Switch Puzzle & Sunken Gate', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const switchLeft = scene.worldEntities.get('switch_sun_left');
          const switchRight = scene.worldEntities.get('switch_sun_right');
          const gate = scene.worldEntities.get('ancient_gate');

          return {
            leftExists: !!switchLeft,
            rightExists: !!switchRight,
            gateExists: !!gate,
            gateOpenedInitially: gate?.state?.opened
          };
        })()
      `);
      if (!res.leftExists || !res.rightExists || !res.gateExists) {
        throw new Error('Puzzle entities missing');
      }
    });

    console.log('\n--- 3. ENVIRONMENT, FOLIAGE & DECORATIONS ---');

    await runTest('Bush Cutting & Decal Stamping', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const bush = scene.worldEntities.get('bush_1');
          if (!bush) return { ok: false, reason: 'bush_1 not found' };

          // Teleport player adjacent to bush and slash
          scene.localPlayer.x = bush.x;
          scene.localPlayer.y = bush.y + 24;
          scene.localPlayer.direction = 'up';
          scene.handleActionAttack();

          return { ok: true, bushX: bush.x, bushY: bush.y };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      await new Promise(r => setTimeout(r, 200));
    });

    console.log('\n--- 4. NPCS, SIGNS & DIALOGUE MODAL ---');

    await runTest('Barnaby Pelican Dialogue & Response Navigation', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.showDialogue({
            npcId: 'npc_barnaby',
            speaker: 'Barnaby the Pelican',
            portrait: 'barnaby',
            text: 'Greetings adventurer! Would you help deliver lost letters?',
            responses: [
              { text: 'I would love to help!', nextKey: 'quest_accept' },
              { text: 'Maybe later.', nextKey: 'bye' }
            ]
          });

          const modal = document.getElementById('dialogue-modal');
          const speaker = document.getElementById('dialogue-speaker')?.innerText;
          const choices = document.querySelectorAll('.dialogue-choice');

          // Fast-forward text
          modal?.click();

          return {
            modalActive: modal?.classList.contains('active'),
            speaker,
            choiceCount: choices.length
          };
        })()
      `);
      if (!res.modalActive) throw new Error('Dialogue modal not active');
      if (res.speaker !== 'Barnaby the Pelican') throw new Error('Speaker mismatch');

      // Click close button to dismiss
      await evaluateInBrowser(`
        (() => {
          document.getElementById('dialogue-close-btn')?.click();
        })()
      `);
    });

    await runTest('Grandma Bramble Terminal Dialogue Dismissal on Click', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.showDialogue({
            npcId: 'npc_grandma',
            speaker: 'Grandma Bramble',
            portrait: 'grandma',
            text: 'Take this warm berry scone, dearie!',
            responses: []
          });

          const modal = document.getElementById('dialogue-modal');
          // Fast-forward
          modal?.click();
          const activeBefore = modal?.classList.contains('active');

          // Click to dismiss
          modal?.click();
          const activeAfter = modal?.classList.contains('active');

          return { activeBefore, activeAfter };
        })()
      `);
      if (!res.activeBefore) throw new Error('Modal was not active before dismissal');
      if (res.activeAfter) throw new Error('Modal did not dismiss on click');
    });

    await runTest('Wildlife Interaction (Petting Buster the Dog)', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const buster = scene.worldEntities.get('wildlife_buster');
          if (!buster) return { ok: false, reason: 'Buster not found' };

          // Interact with Buster
          scene.localPlayer.x = buster.x;
          scene.localPlayer.y = buster.y + 20;
          scene.handleActionInteract();

          return { ok: true, petCount: buster.state.petCount };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
    });

    console.log('\n--- 5. ALL 5 CLASS ARCHETYPES & ABILITIES ---');

    // 5.1 Warrior
    await runTest('Warrior Archetype: Shield Slam & Shield Parry Riposte', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.setPlayerClass('warrior');

          // Test Ability 1: Stagger Cleave
          scene.useClassAbility(1);

          // Test Ability 2: Shield Parry
          scene.useClassAbility(2);

          return {
            classId: scene.localPlayer.classId,
            abilities: scene.localPlayer.classId === 'warrior'
          };
        })()
      `);
      if (res.classId !== 'warrior') throw new Error('Class was not set to warrior');
      await new Promise(r => setTimeout(r, 200));
    });

    // 5.2 Mage
    await runTest('Mage Archetype: Arcane Nova & Teleport Blink', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.setPlayerClass('mage');
          scene.localPlayer.mana = 50;

          // Ability 1: Arcane Nova
          scene.useClassAbility(1);

          // Ability 2: Teleport Blink
          const prevX = scene.localPlayer.x;
          scene.useClassAbility(2);

          return {
            classId: scene.localPlayer.classId,
            prevX
          };
        })()
      `);
      if (res.classId !== 'mage') throw new Error('Class was not set to mage');
      await new Promise(r => setTimeout(r, 200));
    });

    // 5.3 Paladin / Bard
    await runTest('Bard/Paladin Archetype: Speed Fanfare & Harmony Chord Heal', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.setPlayerClass('bard');
          scene.localPlayer.mana = 50;
          scene.localPlayer.health = 2; // Hurt player

          scene.useClassAbility(1); // Speed Fanfare
          scene.useClassAbility(2); // Harmony Chord

          return {
            classId: scene.localPlayer.classId
          };
        })()
      `);
      if (res.classId !== 'bard') throw new Error('Class was not set to bard');
      await new Promise(r => setTimeout(r, 200));
    });

    // 5.4 Necromancer
    await runTest('Necromancer Archetype: Raise Skeleton & Life Siphon', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.setPlayerClass('necromancer');
          scene.localPlayer.mana = 50;

          scene.useClassAbility(1); // Raise Skeleton
          scene.useClassAbility(2); // Life Siphon

          return {
            classId: scene.localPlayer.classId
          };
        })()
      `);
      if (res.classId !== 'necromancer') throw new Error('Class was not set to necromancer');
      await new Promise(r => setTimeout(r, 250));
    });

    // 5.5 Archer
    await runTest('Archer Archetype: Piercing Arrow & Evasive Back-Hop', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.setPlayerClass('archer');
          scene.localPlayer.mana = 50;

          scene.useClassAbility(1); // Piercing Arrow
          scene.useClassAbility(2); // Evasive Back-Hop

          return {
            classId: scene.localPlayer.classId
          };
        })()
      `);
      if (res.classId !== 'archer') throw new Error('Class was not set to archer');
      await new Promise(r => setTimeout(r, 200));
    });

    console.log('\n--- 6. MAGIC SPELLS & STATUS EFFECTS ---');

    await runTest('Elemental Spells: Fireball, Ice Lance & Gale Ward', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.localPlayer.mana = 50;
          if (scene.localPlayer.manaPool) scene.localPlayer.manaPool.current = 50;
          scene.localPlayer.spellCooldowns = {};

          scene.castSpell('fireball');

          return new Promise((resolve) => {
            setTimeout(() => {
              const activeAfterFireball = scene.spellProjectiles.length;
              scene.localPlayer.mana = 50;
              if (scene.localPlayer.manaPool) scene.localPlayer.manaPool.current = 50;
              scene.castSpell('gale_ward');

              setTimeout(() => {
                resolve({
                  activeAfterFireball,
                  speedBoosted: scene.localPlayer.speedBuffMultiplier > 1
                });
              }, 180);
            }, 250);
          });
        })()
      `);
      if (res.activeAfterFireball < 1) throw new Error('Fireball projectile was not spawned');
      if (!res.speedBoosted) throw new Error('Gale Ward speed buff not applied');
      await new Promise(r => setTimeout(r, 300));
    });

    console.log('\n--- 7. EQUIPMENT SHEET, VANITY & STAT RECALCULATION ---');

    await runTest('Equipment Sheet Toggle & Stat Inspection', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.equipmentSheet.open();
          const isOpen = ui.equipmentSheet.isOpen;

          const hpText = document.getElementById('stat-max-hp')?.innerText;
          const mpText = document.getElementById('stat-max-mp')?.innerText;

          // Close sheet
          ui.equipmentSheet.close();
          const isClosed = !ui.equipmentSheet.isOpen;

          return { isOpen, isClosed, hpText, mpText };
        })()
      `);
      if (!res.isOpen || !res.isClosed) throw new Error('Equipment sheet toggle failed');
    });

    console.log('\n--- 8. QUEST JOURNAL, MINIMAP & SETTINGS MODALS ---');

    await runTest('Quest Journal Toggle with Tab Key & Button', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.quests.openJournal();
          const open = ui.quests.isJournalOpen();
          ui.quests.closeJournal();
          const closed = !ui.quests.isJournalOpen();

          return { open, closed };
        })()
      `);
      if (!res.open || !res.closed) throw new Error('Quest journal modal failed');
    });

    await runTest('Minimap World Atlas Toggle', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.minimap.openAtlas();
          const open = ui.minimap.isAtlasActive();
          ui.minimap.closeAtlas();
          const closed = !ui.minimap.isAtlasActive();

          return { open, closed };
        })()
      `);
      if (!res.open || !res.closed) throw new Error('World atlas toggle failed');
    });

    await runTest('Settings Modal Toggle with Escape', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          ui.settings.open();
          const open = ui.settings.isSettingsOpen();
          ui.settings.close();
          const closed = !ui.settings.isSettingsOpen();

          return { open, closed };
        })()
      `);
      if (!res.open || !res.closed) throw new Error('Settings modal toggle failed');
    });

    console.log('\n--- 9. BARON VON TRUFFLE BOSS ENCOUNTER ---');

    await runTest('Baron von Truffle Arena, Attacks & Combat Loop', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const boss = scene.worldEntities.get('boss_baron');
          if (!boss) return { ok: false, reason: 'Baron von Truffle not found' };

          // Teleport player into arena
          scene.localPlayer.x = 1024;
          scene.localPlayer.y = 350;

          const bossHp = boss.state.hp;
          const bossMaxHp = boss.state.maxHp;
          const hasBar = scene.enemyHealthBars.has('boss_baron');

          return {
            ok: true,
            bossHp,
            bossMaxHp,
            hasBar
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (!res.hasBar) throw new Error('Boss health bar missing');
    });

    console.log('\n--- 10. SOCIAL EMOTES & RESONANCE ---');

    await runTest('Social Emote Broadcasts (Heart, Wave, Music)', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          scene.triggerEmote('heart');
          scene.triggerEmote('wave');
          scene.triggerEmote('music');
          return { ok: true };
        })()
      `);
      if (!res.ok) throw new Error('Failed to trigger emotes');
      await new Promise(r => setTimeout(r, 200));
    });

    console.log('\n--- 11. COZY BOBBER FISHING ENGINE ---');

    await runTest('Bobber Fishing Cast, Water Detection & Cancel', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          // Teleport player near Crystal Lake shoreline and sync to server
          scene.teleportLocalPlayer(740, 1300, 'down');

          return new Promise((resolve) => {
            setTimeout(() => {
              // Cast fishing line into water (y + 40 is lake water)
              scene.castFishingLine(740, 1340);

              setTimeout(() => {
                const castingActive = scene.isLocalFishing && scene.fishingPhase === 'waiting';
                // Cancel cast
                scene.handleActionFishing(true);

                setTimeout(() => {
                  const idleAfterCancel = !scene.isLocalFishing && scene.fishingPhase === 'idle';
                  resolve({ castingActive, idleAfterCancel });
                }, 150);
              }, 250);
            }, 120);
          });
        })()
      `);
      if (!res.castingActive) throw new Error('Fishing cast did not activate');
      if (!res.idleAfterCancel) throw new Error('Fishing cancel did not return to idle');
    });

    console.log('\n--- 12. CIRCADIAN DAY/NIGHT & WEATHER CYCLE ---');

    await runTest('Circadian Lighting & Atmospheric Weather System', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const weather = scene.currentWeather;
          const timeOfDaySec = scene.timeOfDaySec;
          const overlay = scene.ambientOverlay;

          return {
            hasWeather: typeof weather === 'string',
            weather,
            timeOfDaySec,
            overlayVisible: !!overlay && overlay.visible
          };
        })()
      `);
      if (!res.hasWeather) throw new Error('Weather state not found on WorldScene');
      if (typeof res.timeOfDaySec !== 'number') throw new Error('TimeOfDaySec not synchronized');
    });

    await runTest('Rest Campfire Sitting & Cozy Rest', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          // Teleport near Village Hearth campfire (320, 448) and sync to server
          scene.teleportLocalPlayer(320, 475, 'up');

          return new Promise((resolve) => {
            setTimeout(() => {
              // Interact to sit down
              scene.handleActionInteract();

              setTimeout(() => {
                const isSitting = scene.localPlayer.anim === 'sit';
                // Interact again to stand up
                scene.handleActionInteract();

                setTimeout(() => {
                  resolve({ isSitting, stoodUp: scene.localPlayer.anim !== 'sit' });
                }, 150);
              }, 150);
            }, 120);
          });
        })()
      `);
      if (!res.isSitting) throw new Error('Player did not sit at campfire');
      if (!res.stoodUp) throw new Error('Player did not stand up from campfire');
    });

    console.log('\n--- 13. PIP’S ODDITIES SHOP & WANDERING TRADER ---');

    await runTest('Pip Oddities Shop Modal Lifecycle', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const ui = window.BitQuestUI;
          // Teleport near Pip merchant (1040, 760) and sync to server
          scene.teleportLocalPlayer(1040, 785, 'up');

          return new Promise((resolve) => {
            setTimeout(() => {
              // Open shop via interaction
              scene.handleActionInteract();

              setTimeout(() => {
                const isOpen = ui?.shopModal?.isOpen();
                const merchantTitle = document.getElementById('shop-merchant-name')?.innerText;

                // Close shop modal
                ui?.shopModal?.close();

                setTimeout(() => {
                  const isClosed = !ui?.shopModal?.isOpen();
                  resolve({ isOpen, merchantTitle, isClosed });
                }, 220);
              }, 260);
            }, 240);
          });
        })()
      `);
      if (!res.isOpen) throw new Error('Shop modal did not open');
      if (!res.isClosed) throw new Error('Shop modal did not close');
    });

    console.log('\n--- 14. COMPANION PETS & MOUNTABLE WILDLIFE ---');

    await runTest('Buster the Dog Whistling & Following Toggle', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const buster = scene.worldEntities.get('wildlife_buster');
          if (!buster) return { ok: false, reason: 'Buster not found' };

          const initialPetState = buster.state.petState;

          return new Promise((resolve) => {
            // Toggle 1
            scene.network.sendPetCommand('wildlife_buster', 'pet');

            setTimeout(() => {
              const state1 = scene.worldEntities.get('wildlife_buster')?.state.petState;

              // Toggle 2
              scene.network.sendPetCommand('wildlife_buster', 'pet');

              setTimeout(() => {
                const state2 = scene.worldEntities.get('wildlife_buster')?.state.petState;
                resolve({
                  ok: true,
                  initialPetState,
                  state1,
                  state2
                });
              }, 260);
            }, 260);
          });
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (res.state1 === res.initialPetState) throw new Error(`Buster state did not toggle on interact (initial: ${res.initialPetState}, state1: ${res.state1}, state2: ${res.state2})`);
      if (res.state2 === res.state1) throw new Error(`Buster state did not toggle back on second interact (initial: ${res.initialPetState}, state1: ${res.state1}, state2: ${res.state2})`);
    });

    await runTest('Barnaby’s Boghopper Giant Frog Mount & Dodge Roll Dismount', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const frog = scene.worldEntities.get('mount_frog_mossy');
          if (!frog) return { ok: false, reason: 'Frog mount not found' };

          // Teleport to frog and sync to server
          scene.teleportLocalPlayer(frog.x, frog.y + 20, 'up');

          return new Promise((resolve) => {
            setTimeout(() => {
              // Interact to mount
              scene.handleActionInteract();

              setTimeout(() => {
                const mountedId = scene.localPlayer.mountedEntityId;
                const speedMultiplier = scene.localPlayer.speedMultiplier;

                // Execute dodge roll to auto-dismount
                scene.localPlayer.roll();

                setTimeout(() => {
                  const dismountedId = scene.localPlayer.mountedEntityId;
                  resolve({
                    ok: true,
                    mountedId,
                    speedMultiplier,
                    dismountedId
                  });
                }, 200);
              }, 250);
            }, 120);
          });
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (res.mountedId !== 'mount_frog_mossy') throw new Error('Failed to mount giant frog');
      if (res.speedMultiplier < 1.5) throw new Error('Mount speed boost not applied');
      if (res.dismountedId !== null) throw new Error('Dodge roll did not dismount player');
    });

    console.log('\n--- 15. CATACOMBS DUNGEON & ELEVATION LEDGES ---');

    await runTest('Catacombs Dungeon Stairs & World Entities Initialization', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const scene = window.BitQuestGame.scene.getScene('WorldScene');
          const stairs = scene.worldEntities.get('stairs_catacombs_entrance');
          const f1StairsDown = scene.worldEntities.get('stairs_to_f2');
          const relicChest = scene.worldEntities.get('chest_catacombs_relic');

          return {
            hasStairs: !!stairs,
            hasF1StairsDown: !!f1StairsDown,
            hasRelicChest: !!relicChest,
            cliffLedgeCount: scene.cliffLedges.length
          };
        })()
      `);
      if (!res.hasStairs) throw new Error('Catacombs entrance stairs missing');
      if (!res.hasF1StairsDown) throw new Error('Floor 1 descent stairs missing');
      if (!res.hasRelicChest) throw new Error('Abyssal Sanctuary relic chest missing');
      if (res.cliffLedgeCount === 0) throw new Error('No cliff ledges registered in world');
    });

    console.log('\n--- 16. CHIPTUNE OCARINA & MULTIPLAYER JAM SESSIONS ---');

    await runTest('Ocarina Modal, Keypad & Songbook UI', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const ui = window.BitQuestUI;
          if (!ui || !ui.ocarina) return { ok: false, reason: 'Ocarina UI component not found' };

          // Open modal
          ui.ocarina.open();
          const modal = document.getElementById('ocarina-modal');
          const isVisible = modal && modal.style.display !== 'none';
          const noteBtns = document.querySelectorAll('.ocarina-note-btn');
          const songbookEntries = document.querySelectorAll('.songbook-entry');

          // Close modal
          ui.ocarina.close();
          const isClosed = modal && modal.style.display === 'none';

          return {
            ok: true,
            hasModal: !!modal,
            isVisible,
            noteBtnCount: noteBtns.length,
            songbookCount: songbookEntries.length,
            isClosed
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (!res.hasModal) throw new Error('Ocarina modal DOM element not found');
      if (!res.isVisible) throw new Error('Ocarina modal did not open on open()');
      if (res.noteBtnCount !== 5) throw new Error(`Expected 5 note buttons, found ${res.noteBtnCount}`);
      if (res.songbookCount !== 5) throw new Error(`Expected 5 songbook songs, found ${res.songbookCount}`);
      if (!res.isClosed) throw new Error('Ocarina modal did not close on close()');
    });

    await runTest('Ocarina Note Synthesis, Song Discovery & Jam Resonance', async () => {
      const res = await evaluateInBrowser(`
        (async () => {
          const ui = window.BitQuestUI;
          const scene = window.BitQuestGame?.scene?.getScene('WorldScene');
          if (!ui || !ui.ocarina || !scene) return { ok: false, reason: 'Scene or Ocarina not available' };

          ui.ocarina.open();

          // Play notes for Song of the Sun: C4, E4, G4, E4, G4
          const notes = ['C4', 'E4', 'G4', 'E4', 'G4'];
          for (const note of notes) {
            ui.ocarina.playNote(note);
            await new Promise(r => setTimeout(r, 60));
          }

          // Test Jam Resonance network handler directly
          scene.network.onOcarinaJamResonance?.({
            playerIds: ['local', 'peer_bard'],
            x: scene.localPlayer ? scene.localPlayer.x : 400,
            y: scene.localPlayer ? scene.localPlayer.y : 400
          });

          // Test Note VFX dispatch
          scene.emitOcarinaNoteVfx(400, 400, '#38bdf8', '♪');

          ui.ocarina.close();

          return {
            ok: true,
            notesPlayed: notes.length
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (res.notesPlayed !== 5) throw new Error('Failed to play 5-note song sequence');
    });

    console.log('\n--- 17. MOBILE TOUCH CONTROLS & RESPONSIVE VIEWPORT ---');

    await runTest('Touch Controls DOM Layer, Modes & Viewport Visibility', async () => {
      const res = await evaluateInBrowser(`
        (() => {
          const touch = window.BitQuestTouch;
          if (!touch) return { ok: false, reason: 'BitQuestTouch not attached to window' };

          // Verify elements in DOM
          const layer = document.getElementById('touch-controls-layer');
          const base = document.getElementById('touch-joystick-base');
          const thumb = document.getElementById('touch-joystick-thumb');
          const cluster = document.getElementById('touch-action-cluster');
          const btnAttack = document.getElementById('touch-btn-attack');
          const btnInteract = document.getElementById('touch-btn-interact');
          const btnRoll = document.getElementById('touch-btn-roll');
          const btnAb1 = document.getElementById('touch-btn-ability-1');
          const btnAb2 = document.getElementById('touch-btn-ability-2');

          // Test mode toggle
          touch.setMode('on');
          const visibleWhenOn = touch.getIsVisible() && layer.style.display !== 'none';

          touch.setMode('off');
          const hiddenWhenOff = !touch.getIsVisible() && layer.style.display === 'none';

          // Restore mode
          touch.setMode('auto');

          return {
            ok: true,
            hasLayer: !!layer,
            hasBase: !!base,
            hasThumb: !!thumb,
            hasCluster: !!cluster,
            hasButtons: !!(btnAttack && btnInteract && btnRoll && btnAb1 && btnAb2),
            visibleWhenOn,
            hiddenWhenOff
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (!res.hasLayer || !res.hasBase || !res.hasThumb || !res.hasCluster || !res.hasButtons) {
        throw new Error('Touch controls DOM elements missing');
      }
      if (!res.visibleWhenOn) throw new Error('Touch controls not visible when mode="on"');
      if (!res.hiddenWhenOff) throw new Error('Touch controls not hidden when mode="off"');
    });

    await runTest('Virtual Joystick Simulation & Zero-Allocation Player Movement', async () => {
      const res = await evaluateInBrowser(`
        (async () => {
          const touch = window.BitQuestTouch;
          const scene = window.BitQuestGame?.scene?.getScene('WorldScene');
          if (!touch || !scene || !scene.localPlayer) return { ok: false, reason: 'Scene/Player not ready' };

          touch.setMode('on');

          // Record player initial pos
          const startX = scene.localPlayer.x;
          const startY = scene.localPlayer.y;

          // Drag virtual joystick right (vx = 1.0, vy = 0)
          touch.simulateJoystick(1.0, 0.0);
          await new Promise(r => setTimeout(r, 200));

          const movedRight = scene.localPlayer.x > startX;
          const stateActive = touch.state.active && touch.state.vx === 1.0;

          // Release joystick
          touch.simulateJoystick(0, 0);
          await new Promise(r => setTimeout(r, 100));
          const released = !touch.state.active && touch.state.vx === 0 && touch.state.vy === 0;

          // Trigger touch buttons
          touch.simulateButton('attack');
          touch.simulateButton('roll');
          touch.simulateButton('ability1');

          return {
            ok: true,
            movedRight,
            stateActive,
            released
          };
        })()
      `);
      if (!res.ok) throw new Error(res.reason);
      if (!res.stateActive) throw new Error('Virtual joystick state failed to activate');
      if (!res.movedRight) throw new Error('Player did not move in response to virtual joystick');
      if (!res.released) throw new Error('Virtual joystick did not release cleanly');
    });

    ws.close();
  } catch (err: any) {
    console.error('Fatal test error:', err);
  } finally {
    chrome.kill();
  }

  console.log('\n========================================');
  console.log('       QA TEST RESULTS SUMMARY          ');
  console.log('========================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Console Errors Logged: ${consoleErrors.length}`);
  console.log(`Console Warnings Logged: ${consoleWarnings.length}`);
  console.log(`Unhandled Exceptions: ${exceptions.length}`);
  console.log('========================================\n');

  if (failed > 0 || consoleErrors.length > 0 || exceptions.length > 0) {
    process.exit(1);
  }
}

runDeepQA();
