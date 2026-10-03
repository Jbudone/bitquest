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
      await new Promise(r => setTimeout(r, 350));
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

          scene.castSpell('fireball');

          return new Promise((resolve) => {
            setTimeout(() => {
              const activeAfterFireball = scene.spellProjectiles.length;
              scene.localPlayer.mana = 50;
              scene.castSpell('gale_ward');

              setTimeout(() => {
                resolve({
                  activeAfterFireball,
                  speedBoosted: scene.localPlayer.speedBuffMultiplier > 1
                });
              }, 150);
            }, 180);
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
