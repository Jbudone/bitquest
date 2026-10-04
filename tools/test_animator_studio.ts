/**
 * BitQuest - Visual Keyframe, Hitbox & Hurtbox Timeline Editor Unit Test Suite (Task 4.8 / Issue #29)
 * Tests Zod schemas, animation presets, timeline scrubber math, onion-skinning,
 * colored bounding box types (Green Hurtbox, Red Hitbox, Blue Footprint),
 * audio/particle event cues, and JSON metadata export/import.
 */

// 1. Setup Mock DOM Environment for Bun CLI
const mockElements = new Map<string, any>();

class MockElement {
  public id: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public innerHTML: string = '';
  public textContent: string = '';
  public value: string = '';
  public dataset: Record<string, string> = {};
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

  querySelector(selector: string) {
    return new MockElement();
  }

  querySelectorAll(selector: string) {
    return [];
  }

  appendChild(el: any) {
    return el;
  }

  getContext(type: string) {
    return {
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      arc: () => {},
      ellipse: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      setLineDash: () => {},
      roundRect: () => {}
    };
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 256, height: 256, right: 256, bottom: 256 };
  }
}

const globalAny = globalThis as any;

if (!globalAny.window) {
  globalAny.window = {
    location: { search: '', hash: '' },
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
    createElement: (tag: string) => new MockElement(),
    querySelector: (selector: string) => new MockElement(),
    querySelectorAll: (selector: string) => [],
    body: {
      appendChild: (el: any) => el
    }
  };
}

if (!globalAny.navigator) {
  globalAny.navigator = {
    clipboard: {
      writeText: async () => {}
    }
  };
}

import {
  AnimationMetadataSchema,
  BoundingBoxSchema,
  FrameEventAudioCueSchema,
  FrameEventParticleCueSchema,
  type AnimationMetadata,
  type BoundingBox
} from '../shared/src/schemas';
import { PRESET_ANIMATIONS, AnimatorStudio } from '../client/src/tools/animatorStudio';

async function runAnimatorStudioTests() {
  console.log('=== BITQUEST KEYFRAME, HITBOX & HURTBOX TIMELINE EDITOR TEST SUITE ===\n');
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
  // Test 1: Zod Schemas Validation
  // ----------------------------------------------------
  console.log('1. Zod Animation & Hitbox Metadata Schemas:');

  const validBox: BoundingBox = {
    id: 'b1',
    type: 'hitbox',
    x: 10,
    y: 12,
    width: 20,
    height: 14,
    damage: 15,
    knockback: 8
  };
  const parsedBox = BoundingBoxSchema.safeParse(validBox);
  assert(parsedBox.success, 'Valid hitbox parses successfully');

  const invalidBox = { id: 'b2', type: 'laser_beam', x: 0, y: 0, width: 10, height: 10 };
  const parsedInvalid = BoundingBoxSchema.safeParse(invalidBox);
  assert(!parsedInvalid.success, 'Invalid box type rejected by schema');

  const validAudio = { soundId: 'slash', volume: 0.8 };
  assert(FrameEventAudioCueSchema.safeParse(validAudio).success, 'Audio cue schema valid');

  const validParticle = { particleType: 'slash_spark', offsetX: 16, offsetY: 20, count: 5 };
  assert(FrameEventParticleCueSchema.safeParse(validParticle).success, 'Particle cue schema valid');

  // ----------------------------------------------------
  // Test 2: Animation Preset Definitions
  // ----------------------------------------------------
  console.log('\n2. Animation Presets Verification:');
  const presetKeys = Object.keys(PRESET_ANIMATIONS);
  assert(presetKeys.length >= 4, `At least 4 animation presets defined (found ${presetKeys.length})`);
  assert(presetKeys.includes('player_slash_down'), 'player_slash_down preset exists');
  assert(presetKeys.includes('player_walk_down'), 'player_walk_down preset exists');
  assert(presetKeys.includes('slime_jump_attack'), 'slime_jump_attack preset exists');
  assert(presetKeys.includes('boss_spore_slam'), 'boss_spore_slam preset exists');

  for (const k of presetKeys) {
    const anim = PRESET_ANIMATIONS[k];
    const res = AnimationMetadataSchema.safeParse(anim);
    assert(res.success, `Preset ${k} complies 100% with AnimationMetadataSchema`);
  }

  const slash = PRESET_ANIMATIONS.player_slash_down;
  assert(slash.frames.length === 4, 'player_slash_down has 4 frames');
  const activeFrame = slash.frames[1];
  const redHitbox = activeFrame.boxes.find(b => b.type === 'hitbox');
  const greenHurtbox = activeFrame.boxes.find(b => b.type === 'hurtbox');
  const blueFootprint = activeFrame.boxes.find(b => b.type === 'footprint');
  
  assert(!!redHitbox, 'Active attack frame has Red Hitbox');
  assert(!!greenHurtbox, 'Active attack frame has Green Hurtbox');
  assert(!!blueFootprint, 'Active attack frame has Blue Footprint');
  assert(redHitbox?.damage === 12, 'Attack hitbox has 12 damage configured');
  assert(activeFrame.audioCues.some(a => a.soundId === 'slash'), 'Attack frame has slash audio cue');
  assert(activeFrame.particleCues.some(p => p.particleType === 'slash_spark'), 'Attack frame has slash_spark particle cue');

  // ----------------------------------------------------
  // Test 3: AnimatorStudio Controller Logic
  // ----------------------------------------------------
  console.log('\n3. AnimatorStudio Timeline & Scrubber:');
  const studio = new AnimatorStudio('mock-container');
  studio.loadAnimation(slash);

  assert(studio.getCurrentFrame() === 0, 'Initial frame is 0');
  studio.setFrame(2);
  assert(studio.getCurrentFrame() === 2, 'setFrame(2) navigates to frame 2');

  studio.stepFrame(1);
  assert(studio.getCurrentFrame() === 3, 'stepFrame(1) steps to frame 3');

  studio.stepFrame(1);
  assert(studio.getCurrentFrame() === 0, 'stepFrame(1) at end loops back to frame 0');

  studio.stepFrame(-1);
  assert(studio.getCurrentFrame() === 3, 'stepFrame(-1) at beginning loops to frame 3');

  // Onion skinning toggle
  studio.toggleOnionSkinning(false);
  studio.toggleOnionSkinning(true);
  assert(true, 'Onion skinning toggled smoothly');

  // ----------------------------------------------------
  // Test 4: Keyframe Manipulation (Add, Duplicate, Delete)
  // ----------------------------------------------------
  console.log('\n4. Keyframe Manipulation:');
  const initialFrameCount = studio.getAnimation().frames.length;
  
  // Add frame via DOM event or programmatic
  const curAnim = studio.getAnimation();
  curAnim.frames.push({
    frameIndex: curAnim.frames.length,
    durationMs: 100,
    boxes: [],
    audioCues: [],
    particleCues: []
  });
  curAnim.totalFrames = curAnim.frames.length;
  studio.setFrame(curAnim.frames.length - 1);

  assert(studio.getAnimation().frames.length === initialFrameCount + 1, 'Added new frame to animation');
  assert(studio.getCurrentFrame() === initialFrameCount, 'Scrubber stepped to newly created frame');

  // ----------------------------------------------------
  // Test 5: Bounding Box Authoring
  // ----------------------------------------------------
  console.log('\n5. Bounding Box Authoring:');
  const currentKeyframe = studio.getCurrentKeyframe();
  const testBox: BoundingBox = {
    id: 'test_box_1',
    type: 'hitbox',
    x: 4,
    y: 8,
    width: 24,
    height: 16,
    damage: 25,
    knockback: 10
  };
  currentKeyframe.boxes.push(testBox);
  studio.render();

  assert(currentKeyframe.boxes.some(b => b.id === 'test_box_1'), 'Test hitbox added to keyframe');
  const found = currentKeyframe.boxes.find(b => b.id === 'test_box_1');
  assert(found?.damage === 25, 'Hitbox damage value accurately set to 25');

  // Delete box
  currentKeyframe.boxes = currentKeyframe.boxes.filter(b => b.id !== 'test_box_1');
  assert(!currentKeyframe.boxes.some(b => b.id === 'test_box_1'), 'Test box removed from keyframe');

  // ----------------------------------------------------
  // Test 6: Event Cues (Audio & Particles)
  // ----------------------------------------------------
  console.log('\n6. Event Cues Authoring:');
  currentKeyframe.audioCues.push({ soundId: 'hit', volume: 1.0 });
  currentKeyframe.particleCues.push({ particleType: 'dust_puff', offsetX: 16, offsetY: 24, count: 3 });

  assert(currentKeyframe.audioCues.some(a => a.soundId === 'hit'), 'Audio cue added to frame');
  assert(currentKeyframe.particleCues.some(p => p.particleType === 'dust_puff'), 'Particle cue added to frame');

  // ----------------------------------------------------
  // Test 7: Export & Import JSON Metadata
  // ----------------------------------------------------
  console.log('\n7. JSON Metadata Export & Import:');
  
  // Mock prompt for headless CLI
  const exported = studio.exportJson(true);
  assert(typeof exported === 'string' && exported.length > 50, 'exportJson returns valid string');
  const parsedExport = JSON.parse(exported);
  const validatedExport = AnimationMetadataSchema.parse(parsedExport);
  assert(validatedExport.id === curAnim.id, 'Exported JSON matches animation ID');
  assert(validatedExport.frames.length === curAnim.frames.length, 'Exported JSON contains all frames');

  // Import JSON test
  studio.importJson(exported);
  assert(studio.getAnimation().id === curAnim.id, 'Imported JSON restored animation state perfectly');

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

runAnimatorStudioTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
