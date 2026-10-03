import { $ } from 'bun';

interface TaskIssue {
  title: string;
  body: string;
  labels: string[];
  close?: boolean; // if already built
}

const missingTasks: TaskIssue[] = [
  // --- Dedicated Developer Tools & Editors ---
  {
    title: 'Tool: Visual Keyframe, Hitbox & Hurtbox Timeline Editor (/tools/animator)',
    body: '## Overview\nIn-browser frame-by-frame animation scrubber and hitbox/hurtbox authoring tool.\n\n### Acceptance Criteria\n- Scrub sprite frames with onion-skinning\n- Visual colored bounding boxes: Green (body hurtbox), Red (attack hitbox), Blue (ground footprint)\n- Frame event cues for audio triggers and particle spawns\n- Export to JSON metadata',
    labels: ['tooling', 'combat-feel']
  },
  {
    title: 'Tool: Live Particle & Spell VFX Studio (/tools/vfx)',
    body: '## Overview\nInteractive particle and shader workbench for designing spell effects, pot dust, and slashes.\n\n### Acceptance Criteria\n- Live particle emitter preview against dark, meadow, and cave backgrounds\n- Visual curves for velocity, gravity, spread angle, lifetime, and alpha gradients\n- One-click export to particle config registry',
    labels: ['tooling', 'audio-visual']
  },
  {
    title: 'Tool: Save-State Inspector & World State "Time Machine" Debugger (/tools/save-state)',
    body: '## Overview\nIn-engine Save & World State manager for instant state snapshotting and flag manipulation.\n\n### Acceptance Criteria\n- Instant snapshot capture and restore of player inventory, quest flags, and health\n- State injection dashboard to toggle quest flags, spawn items, or set currencies\n- Preset mock profiles ("New Player", "Boss Arena Ready", "Puzzler")',
    labels: ['tooling', 'ai-automation']
  },
  {
    title: 'Tool: Sprite Alpha Contour & Hitbox Auto-Generator (bun run generate:hitboxes)',
    body: '## Overview\nHeadless CLI script analyzing sprite alpha contours to automatically compute tight bounding boxes.\n\n### Acceptance Criteria\n- Analyzes alpha transparency contours of all animation frames\n- Auto-computes footprint collider (bottom 20%), body hurtbox, and weapon active frames\n- Writes pixel coordinates into entity metadata JSON',
    labels: ['tooling', 'ai-automation']
  },
  {
    title: 'Tool: Headless Visual Regression & Golden Image Test Suite',
    body: '## Overview\nPlaywright/Puppeteer script capturing deterministic camera anchors to detect rendering regressions.\n\n### Acceptance Criteria\n- Boots client, teleports to 10 key camera anchors, snaps PNG frames\n- Computes pixel-diff ratio against golden baseline screenshots\n- Generates visual diff heatmap if diff > 0.5%',
    labels: ['tooling', 'ai-automation']
  },
  {
    title: 'Tool: Headless Multiplayer Desync & Network Chaos Simulator (bun run test:netcode)',
    body: '## Overview\nSpins up simulated multi-client lobby in Bun with synthetic network chaos to stress-test netcode.\n\n### Acceptance Criteria\n- Spawns 4 to 8 headless bot clients\n- Injects 80ms latency, 15% packet jitter, out-of-order delivery\n- Flags entity divergence > 2px or health desyncs',
    labels: ['tooling', 'multiplayer', 'ai-automation']
  },
  {
    title: 'Tool: Tile Bleed, Seam & UV Artifact Detector (bun run check:tiles)',
    body: '## Overview\nInspects tilesets and tests camera pans at fractional zooms to eliminate 1-pixel tile seams.\n\n### Acceptance Criteria\n- Verifies 1-pixel extruded border (gutter padding) on all 16x16 tiles\n- Headless camera pans across all zoom levels (1.25x, 1.5x, 2.0x)\n- Edge-contrast sampling detects color bleed across grid lines',
    labels: ['tooling', 'audio-visual', 'ai-automation']
  },
  {
    title: 'Tool: Palette Harmonizer & Contrast Accessibility Auditor (bun run check:palette)',
    body: '## Overview\nAudits color histograms to ensure characters and loot stand out from terrain with high contrast.\n\n### Acceptance Criteria\n- Extracts color histograms from sprites and compares against underlying terrain\n- Computes WCAG contrast ratio (verifies minimum 3.5:1 luminosity contrast)\n- Flags low-contrast matchups for auto-outline generation',
    labels: ['tooling', 'accessibility', 'ai-automation']
  },
  {
    title: 'Tool: In-Engine Telemetry, Profiler & Physics Inspector (F3 / Dev Panel)',
    body: '## Overview\nToggleable developer HUD displaying live engine metrics, physics bounding boxes, and ping.\n\n### Acceptance Criteria\n- F3 hotkey toggles telemetry overlay\n- Displays real-time FPS, 1% low frame times, draw calls, particle count\n- Wireframe bounding box renderer for colliders, hitboxes, and interaction radii\n- Network latency ping graph',
    labels: ['tooling', 'ai-automation']
  },

  // --- Atmospheric Polish & Core Game Experience Systems ---
  {
    title: 'System: Scene Staging, Biome Title Cards & Cozy Defeat/Respawn Flow',
    body: '## Overview\nCozy presentation transitions: biome title cards on entry, and waking up in Grandma\'s cot upon defeat.\n\n### Acceptance Criteria\n- Biome banner slides in when crossing territory boundaries\n- Defeat sequence: soft fade to black, waking up tucked into bed with Grandma offering warm tea\n- Non-punitive cozy recovery respecting inventory',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Dynamic Camera Director & Cinematic Framing',
    body: '## Overview\nVelocity look-ahead, contextual biome framing, and event camera pans.\n\n### Acceptance Criteria\n- Camera gently leads ahead in the direction of player movement\n- Smooth zoom-out when entering vast meadows or boss arena\n- Cinematic pan to activated switches or opening gates',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Surface-Reactive Footstep Audio & Tile Particle Physics',
    body: '## Overview\nMaterial-specific footstep audio synthesis and trailing particles per terrain type.\n\n### Acceptance Criteria\n- Synthesized footsteps: soft rustle on grass, click-clack on cobble, slosh on shallow water\n- Trailing dust puffs on dirt, water wake ripples on shallows, autumn leaf kicks\n- Responsive to walk vs sprint vs roll states',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: World Memory, Player Chronicles & Lifetime Stats Tracking',
    body: '## Overview\nPersistent stats tracking player journey: weeds trimmed, pots smashed, steps rolled, titles unlocked.\n\n### Acceptance Criteria\n- Tracks lifetime stats in localStorage / server database\n- In-game chronicle window reviewing stats and milestones\n- Fun cosmetic titles ("Pot Shatterer", "Meadow Botanist")',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'System: Biome Color Grading & Atmospheric Ambient Lighting',
    body: '## Overview\nFull-screen canvas blend modes, tint gradients, and warm point light sources.\n\n### Acceptance Criteria\n- Warm golden amber tint in Oakhaven Town Plaza\n- Mysterious violet-cyan grading in Fungal Hollow\n- Glowing radial light masks for lanterns, torches, and glowing mushrooms',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Expressive Dialogue & Typography Engine',
    body: '## Overview\nText formatting tags ({shake}, {wave}, {rainbow}), vocal speech pacing, and animated portraits.\n\n### Acceptance Criteria\n- Inline tag parser supporting character wiggle, wave, and emphasis colors\n- Subtle pitch-varied chiptune vocal blips during typewriter text reveal\n- Character portrait expression shifts (happy, surprised, smug)',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Adaptive Chiptune Music Director & Ambient Soundscape',
    body: '## Overview\nMulti-track procedural procedural BGM with smooth crossfades between village, meadow, and ruins.\n\n### Acceptance Criteria\n- Gentle acoustic chiptune melody in Town Plaza\n- Mysterious plucked harp tones in Fungal Hollow\n- Seamless crossfade transitions between biome soundscapes',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Deep Combat Feel & Kinetic Juice',
    body: '## Overview\nMicro-freeze hitstop, dynamic sword swing arcs, and impact particle decals.\n\n### Acceptance Criteria\n- 40ms micro-pause (hitstop) on landing heavy hits or critical strikes\n- Curved slash trail following weapon swing\n- Directional knockback impulse on enemies',
    labels: ['combat-feel', 'enhancement']
  },
  {
    title: 'System: Enemy Threat Telegraphing & Combat Choreography',
    body: '## Overview\nAnticipation wind-ups, ground target threat rings, and dizzy stars.\n\n### Acceptance Criteria\n- Red pulsating ground rings before heavy area attacks\n- Enemy recoil squash-and-stretch during anticipation\n- Dizzy spinning stars when charger enemies crash into walls',
    labels: ['combat-feel', 'enhancement']
  },
  {
    title: 'System: Seamless Building Interiors & Roof-Lift Architecture',
    body: '## Overview\nWalk into cottages and buildings without scene transitions; roof slides or fades away smoothly.\n\n### Acceptance Criteria\n- Step through cottage doors into furnished interiors seamlessly\n- Overhead roof tile layer smoothly fades to 25% opacity when inside\n- Cozy interior props (rugs, fireplace, book shelves)',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Multiplayer Social Synergy & Co-Op Interactivity',
    body: '## Overview\nMid-air pot catching, high-five emote resonance, and cooperative puzzle mechanics.\n\n### Acceptance Criteria\n- Players can throw clay pots to each other and catch them mid-air\n- Emoting simultaneous high-fives triggers sparkle resonance and cheerful chime\n- Cooperative weight puzzles and duo door levers',
    labels: ['multiplayer', 'enhancement']
  },
  {
    title: 'System: Centralized Zero-Allocation VFX & Ambient Particle Pipeline',
    body: '## Overview\nHigh-performance pooled particle system for floating dandelion seeds, spores, and pollen.\n\n### Acceptance Criteria\n- Pre-allocated particle pool supporting 500+ ambient particles at 60 FPS\n- Dandelion seeds floating across Whispering Meadow\n- Glowing spore motes in Fungal Hollow\n- Zero garbage-collection allocations per frame',
    labels: ['audio-visual', 'enhancement']
  },
  {
    title: 'System: Modular Entity-Behavior Architecture',
    body: '## Overview\nDecouple monolithic entity classes into reusable traits (Interactable, HealthPool, Hurtbox, LootTable).\n\n### Acceptance Criteria\n- Composable component interfaces for entities\n- Unified spatial query pipeline for interaction prioritization\n- Eliminates hardcoded switch statements in world updates',
    labels: ['tooling', 'enhancement']
  },
  {
    title: 'System: Authoritative Multiplayer Netcode & Prediction Smoothing',
    body: '## Overview\nHermite interpolation, input rewind reconciliation, and delta state synchronization.\n\n### Acceptance Criteria\n- Local movement prediction with server authoritative rewind validation\n- Hermite spline velocity extrapolation for remote players\n- Compact binary or delta JSON state broadcasts over WebSockets',
    labels: ['multiplayer', 'enhancement']
  }
];

console.log(`🚀 Creating ${missingTasks.length} additional missing GitHub Issues on Jbudone/bitquest...`);

for (let i = 0; i < missingTasks.length; i++) {
  const task = missingTasks[i]!;
  console.log(`[${i + 1}/${missingTasks.length}] Creating: ${task.title}...`);
  try {
    const labelArgs = task.labels.flatMap(l => ['--label', l]);
    await $`gh issue create --title ${task.title} --body ${task.body} ${labelArgs}`.quiet();
  } catch (err: any) {
    console.error(`Failed to create issue "${task.title}":`, err.message);
  }
}

console.log('✨ All additional issues successfully created!');
