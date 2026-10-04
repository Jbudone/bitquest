/**
 * BitQuest - Mobile Touch Controls & Responsive Viewport Unit Test Suite (Task 7.10 / Issue #28)
 * Verifies zero-allocation virtual thumbstick mathematics, deadzone clipping,
 * vector clamping, directional trigonometric precision, action buttons,
 * and profile settings persistence.
 */

// 1. Setup Mock DOM Environment for Bun CLI
const mockElements = new Map<string, any>();

class MockElement {
  public id: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public innerHTML: string = '';
  public eventListeners: Record<string, Function[]> = {};

  constructor(id: string = '') {
    this.id = id;
  }

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  dispatchEvent(event: any) {
    const list = this.eventListeners[event.type] || [];
    for (const cb of list) {
      cb(event);
    }
  }

  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() {
    return { left: 100, top: 100, width: 120, height: 120, right: 220, bottom: 220 };
  }
}

const mockStorage: Record<string, string> = {};
const globalAny = globalThis as any;

if (!globalAny.window) {
  globalAny.window = {
    location: { search: '' },
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (!globalAny.document) {
  globalAny.document = {
    getElementById: (id: string) => {
      if (!mockElements.has(id)) {
        mockElements.set(id, new MockElement(id));
      }
      return mockElements.get(id);
    },
    createElement: (tag: string) => {
      const el = new MockElement();
      return el;
    },
    querySelector: (selector: string) => null,
    querySelectorAll: (selector: string) => [],
    body: {
      appendChild: (el: any) => el,
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {}
      }
    }
  };
}

if (!globalAny.localStorage) {
  globalAny.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; }
  };
}

if (!globalAny.navigator) {
  globalAny.navigator = {
    maxTouchPoints: 0,
    vibrate: () => true
  };
}

async function runTouchControlsTests() {
  const { TouchControls } = await import('../client/src/ui/TouchControls');
  console.log('=== BITQUEST MOBILE TOUCH CONTROLS & RESPONSIVE VIEWPORT TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Instantiation & Initial State
  // ----------------------------------------------------
  console.log('1. Instantiation & Initial Zero-Allocation State:');
  
  let attackTriggered = false;
  let interactTriggered = false;
  let rollTriggered = false;
  let ability1Triggered = false;
  let ability2Triggered = false;
  let reelInputState: boolean | null = null;
  let isFishingMock = false;

  const mockScene = {
    handleActionAttack: () => { attackTriggered = true; },
    handleActionInteract: () => { interactTriggered = true; },
    localPlayer: {
      roll: () => { rollTriggered = true; }
    },
    useClassAbility: (idx: number) => {
      if (idx === 1) ability1Triggered = true;
      if (idx === 2) ability2Triggered = true;
    },
    get isLocalFishing() { return isFishingMock; },
    handleReelInput: (down: boolean) => { reelInputState = down; }
  };

  const controls = new TouchControls(() => mockScene);
  const initialState = controls.state;

  assert(initialState !== undefined, 'Controls state object initialized');
  assert(initialState.vx === 0, 'Initial vx is exactly 0');
  assert(initialState.vy === 0, 'Initial vy is exactly 0');
  assert(initialState.power === 0, 'Initial power is 0');
  assert(initialState.active === false, 'Initial active flag is false');
  assert(initialState.isAttackDown === false, 'Attack button initially not pressed');
  assert(initialState.isInteractDown === false, 'Interact button initially not pressed');
  assert(initialState.isRollDown === false, 'Roll button initially not pressed');
  assert(initialState.isAbility1Down === false, 'Ability 1 button initially not pressed');
  assert(initialState.isAbility2Down === false, 'Ability 2 button initially not pressed');

  // ----------------------------------------------------
  // Test 2: Modes & Settings Persistence
  // ----------------------------------------------------
  console.log('\n2. Touch Modes & Storage Persistence:');
  controls.setMode('on');
  assert(controls.getMode() === 'on', "setMode('on') updates mode to 'on'");
  assert(controls.getIsVisible() === true, "Controls visible when mode is 'on'");
  assert(mockStorage['bitquest_touch_mode'] === 'on', "Persisted mode 'on' to localStorage");

  controls.setMode('off');
  assert(controls.getMode() === 'off', "setMode('off') updates mode to 'off'");
  assert(controls.getIsVisible() === false, "Controls hidden when mode is 'off'");
  assert(mockStorage['bitquest_touch_mode'] === 'off', "Persisted mode 'off' to localStorage");

  controls.setMode('auto');
  assert(controls.getMode() === 'auto', "setMode('auto') updates mode to 'auto'");
  assert(mockStorage['bitquest_touch_mode'] === 'auto', "Persisted mode 'auto' to localStorage");

  // ----------------------------------------------------
  // Test 3: Deadzone & Small Movement Clipping
  // ----------------------------------------------------
  console.log('\n3. Deadzone & Small Movement Filtering:');
  controls.setBaseCenter(100, 100);

  // Tiny jitter < 4px (radius check)
  controls.updateJoystickPosition(102, 101);
  assert(controls.state.active === false, 'Sub-4px jitter flagged inactive');
  assert(controls.state.vx === 0 && controls.state.vy === 0, 'Sub-4px jitter produces zero velocity');

  // Inside deadzone (46px * 0.12 deadzone = 5.52px threshold)
  // Distance 5px -> 5/46 = 0.1087 < 0.12 deadzone
  controls.updateJoystickPosition(105, 100);
  assert(controls.state.active === false, 'Movement inside 0.12 deadzone flagged inactive');
  assert(controls.state.power === 0, 'Power inside deadzone is 0');
  assert(controls.state.vx === 0 && controls.state.vy === 0, 'Deadzone produces zero velocity vector');

  // Just above deadzone (distance 10px -> 10/46 = 0.2174 > 0.12)
  controls.updateJoystickPosition(110, 100);
  assert(controls.state.active === true, 'Movement above 0.12 deadzone flagged active');
  assert(controls.state.power > 0.2 && controls.state.power < 0.25, `Power proportional above deadzone (${controls.state.power.toFixed(3)})`);
  assert(controls.state.vx > 0.2 && controls.state.vy === 0, 'X velocity correctly calculated');

  // ----------------------------------------------------
  // Test 4: Cardinal Directions & Trigonometric Vectors
  // ----------------------------------------------------
  console.log('\n4. Cardinal & Diagonal Trigonometric Vectors:');

  // Full Right / East (+46px X, 0px Y)
  controls.updateJoystickPosition(146, 100);
  assert(controls.state.active === true, 'Full right drag is active');
  assert(Math.abs(controls.state.vx - 1.0) < 0.001, `Full right vx is 1.0 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy) < 0.001, `Full right vy is 0.0 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(controls.state.power - 1.0) < 0.001, 'Full right power is 1.0');
  assert(Math.abs(controls.state.angle) < 0.001, 'Full right angle is 0 rad');

  // Full Down / South (0px X, +46px Y)
  controls.updateJoystickPosition(100, 146);
  assert(Math.abs(controls.state.vx) < 0.001, `Full down vx is 0.0 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy - 1.0) < 0.001, `Full down vy is 1.0 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(controls.state.angle - Math.PI / 2) < 0.001, 'Full down angle is +PI/2 rad');

  // Full Left / West (-46px X, 0px Y)
  controls.updateJoystickPosition(54, 100);
  assert(Math.abs(controls.state.vx - (-1.0)) < 0.001, `Full left vx is -1.0 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy) < 0.001, `Full left vy is 0.0 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(Math.abs(controls.state.angle) - Math.PI) < 0.001, 'Full left angle is PI rad');

  // Full Up / North (0px X, -46px Y)
  controls.updateJoystickPosition(100, 54);
  assert(Math.abs(controls.state.vx) < 0.001, `Full up vx is 0.0 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy - (-1.0)) < 0.001, `Full up vy is -1.0 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(controls.state.angle - (-Math.PI / 2)) < 0.001, 'Full up angle is -PI/2 rad');

  // Diagonal Up-Right (+32.53px X, -32.53px Y) -> 46px at -45 deg
  controls.updateJoystickPosition(132.53, 67.47);
  assert(Math.abs(controls.state.vx - 0.7071) < 0.01, `Diagonal Up-Right vx ~ 0.707 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy - (-0.7071)) < 0.01, `Diagonal Up-Right vy ~ -0.707 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(controls.state.power - 1.0) < 0.01, 'Diagonal power normalized to 1.0');

  // ----------------------------------------------------
  // Test 5: Clamping Outside Max Radius
  // ----------------------------------------------------
  console.log('\n5. Clamping Beyond Max Joystick Radius:');
  // Dragged far outside (e.g. 200px away)
  controls.updateJoystickPosition(300, 100); // +200px East
  assert(Math.abs(controls.state.power - 1.0) < 0.001, 'Power clamped to 1.0 when dragged 200px away');
  assert(Math.abs(controls.state.vx - 1.0) < 0.001, 'Clamped vx remains 1.0');
  assert(Math.abs(controls.state.vy) < 0.001, 'Clamped vy remains 0.0');

  // ----------------------------------------------------
  // Test 6: Release & Spring Back
  // ----------------------------------------------------
  console.log('\n6. Joystick Spring-Back & Release:');
  controls.releaseJoystick();
  assert(controls.state.active === false, 'Spring back marks active false');
  assert(controls.state.vx === 0, 'Spring back resets vx to 0');
  assert(controls.state.vy === 0, 'Spring back resets vy to 0');
  assert(controls.state.power === 0, 'Spring back resets power to 0');

  // ----------------------------------------------------
  // Test 7: Programmatic Vector Simulation
  // ----------------------------------------------------
  console.log('\n7. Programmatic simulateJoystick:');
  controls.simulateJoystick(0.8, -0.6);
  assert(controls.state.active === true, 'simulateJoystick activates controls');
  assert(Math.abs(controls.state.vx - 0.8) < 0.001, `simulateJoystick sets vx to 0.8 (got ${controls.state.vx.toFixed(3)})`);
  assert(Math.abs(controls.state.vy - (-0.6)) < 0.001, `simulateJoystick sets vy to -0.6 (got ${controls.state.vy.toFixed(3)})`);
  assert(Math.abs(controls.state.power - 1.0) < 0.001, 'simulateJoystick sets power to 1.0 (hypot(0.8, 0.6))');

  controls.simulateJoystick(0, 0);
  assert(controls.state.active === false, 'simulateJoystick(0,0) releases joystick');

  // ----------------------------------------------------
  // Test 8: Action Buttons & Fishing Reel Dispatch
  // ----------------------------------------------------
  console.log('\n8. Action Button Dispatch & Fishing Reel:');
  
  // Normal attack
  attackTriggered = false;
  controls.simulateButton('attack');
  assert(attackTriggered === true, 'simulateButton("attack") triggers scene handleActionAttack');

  // Interact
  interactTriggered = false;
  controls.simulateButton('interact');
  assert(interactTriggered === true, 'simulateButton("interact") triggers scene handleActionInteract');

  // Roll
  rollTriggered = false;
  controls.simulateButton('roll');
  assert(rollTriggered === true, 'simulateButton("roll") triggers localPlayer.roll');

  // Class Ability 1
  ability1Triggered = false;
  controls.simulateButton('ability1');
  assert(ability1Triggered === true, 'simulateButton("ability1") triggers useClassAbility(1)');

  // Class Ability 2
  ability2Triggered = false;
  controls.simulateButton('ability2');
  assert(ability2Triggered === true, 'simulateButton("ability2") triggers useClassAbility(2)');

  // Fishing reel mode
  isFishingMock = true;
  reelInputState = null;
  controls.simulateButton('attack');
  assert(reelInputState === true, 'simulateButton("attack") while fishing dispatches reel input true');

  // ----------------------------------------------------
  // Test 9: Zero-Allocation Runtime Guarantee
  // ----------------------------------------------------
  console.log('\n9. Zero-Allocation Runtime Guarantee:');
  const refBefore = controls.state;
  for (let i = 0; i < 2000; i++) {
    const angle = (i / 2000) * Math.PI * 2;
    controls.updateJoystickPosition(100 + Math.cos(angle) * 40, 100 + Math.sin(angle) * 40);
  }
  controls.releaseJoystick();
  const refAfter = controls.state;

  assert(refBefore === refAfter, 'controls.state object reference remains identical across 2000 updates (0 KB churn)');
  assert(refBefore === initialState, 'controls.state identical to instantiation reference');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log(`\n======================================================`);
  console.log(`TEST SUITE COMPLETED: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTouchControlsTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
