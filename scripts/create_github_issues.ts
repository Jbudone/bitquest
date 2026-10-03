import { $ } from 'bun';

interface TaskIssue {
  title: string;
  body: string;
  labels: string[];
}

const tasks: TaskIssue[] = [
  // Phase 5
  {
    title: 'Task 5.1: In-Game Mini-Map, Compass Radar & Exploration Fog',
    body: '## Overview\nCorner radar showing POI landmarks, live player/co-op pins, active quest beacon pings, and soft discovery fog.\n\n### Acceptance Criteria\n- Circular or rounded corner HUD minimap displaying live positions\n- Landmark pins for cottages, bridge, ruins, and active quest markers\n- Soft discovery fog that clears as player traverses the world\n- Toggleable with `M` key',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.2: Multi-Quest Journal & HUD Objective Tracker',
    body: '## Overview\nCollapsible `J` journal, step-by-step quest markers, and audio-visual completion banners.\n\n### Acceptance Criteria\n- Collapsible journal showing active quests, step objectives, and rewards\n- Mini-HUD quest tracker pinned to top-right with active objective\n- Fanfare banner when a quest is completed',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.3: Context-Sensitive Overhead Action Prompts & Reticle',
    body: '## Overview\nDynamic pill indicators (`[E] Talk`, `[E] Lift`, `[E] Open`, `[E] Read`) prioritizing the nearest interactable entity.\n\n### Acceptance Criteria\n- Subtle floating pill indicator over interactable targets within range\n- Dynamic action label updates based on target type (NPC vs Pot vs Sign vs Chest)\n- Smooth fade-in/fade-out transitions',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.4: Local-First Auto-Save & Seamless Session Recovery',
    body: '## Overview\nLocalStorage + server sync saving player position, inventory, and world flags; instant resume without re-entering name.\n\n### Acceptance Criteria\n- Automatically saves player state, coins, acorns, and inventory locally\n- Seamless session resume on page reload\n- Export/import save profile option in settings',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.5: In-Game Settings Menu (ESC) & Rebindable Keymaps',
    body: '## Overview\nVolume sliders, camera shake toggles, fully rebindable keyboard keys with dynamic in-game glyph updates.\n\n### Acceptance Criteria\n- Pressing `ESC` opens clean settings modal\n- Master, SFX, and BGM volume faders\n- Screen shake toggle / intensity slider\n- Key remapping matrix supporting AZERTY / custom layouts',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.6: Spatial 2D Audio Bus & Procedural DSP Filters',
    body: '## Overview\nWeb Audio distance attenuation, cavern low-pass muffling, sidechain audio ducking during combat/dialogue, and low-health heartbeat pulse.\n\n### Acceptance Criteria\n- Stereo panning and distance falloff for river water and roaring boss\n- Low-pass biquad muffling when near stone walls or cavern entrances\n- Ducking background music by -4dB when high-priority sound effects fire\n- Low-health pulsing heartbeat thud when below 25% HP',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },
  {
    title: 'Task 5.7: Universal Accessibility & High-Contrast Suite',
    body: '## Overview\nRetro vs. clean vector font toggle, high-contrast text backdrops, and shape-coded loot indicators for colorblind accessibility.\n\n### Acceptance Criteria\n- One-click font toggle between pixel font and vector/OpenDyslexic font\n- High-contrast text backdrops ensuring 100% legibility\n- Shape-coded loot indicators (diamonds, circles, stars) for colorblind clarity',
    labels: ['phase-5: UX & Navigation', 'accessibility']
  },
  {
    title: 'Task 5.8: Pixel-Perfect Integer Scaling & Viewport Engine',
    body: '## Overview\nSharp nearest-neighbor scaling with ornamental letterbox borders and adaptive HUD anchoring.\n\n### Acceptance Criteria\n- Eliminates sub-pixel shimmering with crisp integer zoom steps\n- Retro ornamental border framing on ultrawide monitors\n- Responsive HUD anchors to screen edges cleanly',
    labels: ['phase-5: UX & Navigation', 'enhancement']
  },

  // Phase 6
  {
    title: 'Task 6.1: Dynamic Directional Pixel Shadows & Grounding Occlusion',
    body: '## Overview\nDirectional skewed drop shadows for entities and structures; elevation detachment when jumping or rolling.\n\n### Acceptance Criteria\n- Soft translucent 45° angled drop shadows grounded under entities\n- Shadow scales down and detaches during rolls/hops\n- Radial shadows from indoor point lights and braziers',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.2: Occlusion Silhouettes & X-Ray Vision Engine',
    body: '## Overview\nColored glowing silhouettes when entities or chests are obscured behind high walls or tree canopies.\n\n### Acceptance Criteria\n- Blue/white player silhouette rendered when walking behind high structures\n- Amber/red silhouette for obscured enemies\n- Soft circular dither punch-hole around character',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.3: Elevation Ledge Mechanics & Z-Axis Jump Physics',
    body: '## Overview\nOne-way cliff hops, vertical combat advantage, and pitfall recovery.\n\n### Acceptance Criteria\n- Walking to cliff ledges triggers arched spring jump downward\n- Elevation height prevents lower enemies from walking up\n- Falling into pits plays splash/dust puff with safe checkpoint return',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.4: Smart Enemy Pathfinding & Flocking Steering',
    body: '## Overview\nSparse grid A* navigation avoiding obstacles, combined with boids flocking separation so mobs encircle the player naturally.\n\n### Acceptance Criteria\n- A* pathfinding around fences, water, and trees without snagging\n- Boids separation radius preventing enemies from overlapping into one sprite\n- Home leashing boundaries with confused return state',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.5: Environmental Decals & Persistent World Scars',
    body: '## Overview\nStamped decal layer: ceramic pot shards, sliced grass clippings, muddy footprints, and slime puddles that fade over time.\n\n### Acceptance Criteria\n- Broken pots leave ceramic fragments that linger for 15s\n- Slashed weeds leave grass leaves on pavers\n- Temporary footprint tracks on sand/mud riverbanks',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.6: Tactile Block Manipulation & Mechanical Switches',
    body: '## Overview\nPush/pull heavy stone blocks with grinding friction audio and satisfying mechanical pressure plates.\n\n### Acceptance Criteria\n- Grabbing blocks with `E` enters deliberate pushing stance\n- Grating stone particle friction and scraping audio\n- Heavy floor pressure plates depress with tactile mechanical clunk',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.7: Secondary Foliage Motion & Wind Simulation',
    body: '## Overview\nGlobal wind waves rustling tree canopies; grass bending and parting as characters walk through.\n\n### Acceptance Criteria\n- Ambient sinusoidal wind sway across tree crowns and flowers\n- Interactive foliage displacement parting around moving characters\n- Water wake ripples trailing behind swimming ducks',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.8: Living World Ambient AI & Organic Idle Micro-Behaviors',
    body: '## Overview\nIdle stretches, looking around, critters flocking, and NPC gaze tracking nearby players.\n\n### Acceptance Criteria\n- Layered idle progression (stretching, wiping brow, sitting down)\n- NPCs and critters subtly turn heads to track nearby players\n- Buster dog sniffing and napping behaviors',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.9: Radial Emote Wheel & Overhead Chat Bubbles',
    body: '## Overview\nQuick-select gesture wheel (`Q` / `Tab`) with bouncy pixel thought bubbles and spatial multiplayer broadcast.\n\n### Acceptance Criteria\n- Radial menu selector for Wave, Heart, Question, Laugh, Celebrate, Ping\n- Thought bubbles pop overhead with spring squash-and-stretch\n- Spatial audio chime and multiplayer synchronization',
    labels: ['phase-6: World Ecology', 'enhancement']
  },
  {
    title: 'Task 6.10: Spatial Partitioning & Viewport Culling Engine',
    body: '## Overview\n16×16 spatial hash grid culling offscreen draw calls and offloading faraway entity update ticks.\n\n### Acceptance Criteria\n- Spatial hash buckets indexing all world tiles and entities\n- Frustum culling skips rendering offscreen objects\n- Faraway enemies enter low-frequency update sleep mode',
    labels: ['phase-6: World Ecology', 'enhancement']
  },

  // Phase 7
  {
    title: 'Task 7.1: Skills & Active Magic System',
    body: '## Overview\nMana pool, elemental spells (fireball, ice lance, gale ward), casting windups, and status effects.\n\n### Acceptance Criteria\n- Mana resource bar with natural regeneration\n- Castable spells with windup poses and impact VFX\n- Elemental status effects (burn tick, freeze slow, stun)',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.2: Equipment, Relics & Vanity Gear System',
    body: '## Overview\nWeapon archetypes (Daggers, Broadswords, Staves, Bows), wearable armor, and passive trinkets.\n\n### Acceptance Criteria\n- Equipment inventory slots (Weapon, Off-hand, Armor, Relic)\n- Stat modifiers (attack power, move speed, damage reduction)\n- Vanity cosmetic gear altering player sprite appearance',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.3: Class Archetypes',
    body: '## Overview\nDistinct playstyle kits: Warrior, Mage, Bard, Necromancer, Archer.\n\n### Acceptance Criteria\n- Warrior: Stagger cleaves, shield parry, high poise\n- Mage: Ranged elemental projectiles, teleport blink\n- Bard: Buff aura songs, speed boost fanfares\n- Necromancer: Bone minions, life siphon\n- Archer: Piercing arrows, evasive back-hop',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.4: The Sunken Catacombs Puzzle Dungeon',
    body: '## Overview\nMulti-floor subterranean dungeon with light/dark mechanics, moving platform puzzles, and multi-phase boss encounter.\n\n### Acceptance Criteria\n- Dungeon entrance warp with transition card\n- Torch lighting mechanics and moving stone platforms\n- Multi-phase dungeon boss with unique attack patterns',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.5: Cozy Bobber Fishing & River Secrets',
    body: '## Overview\nMini-game with tension-meter bobbing, water ripples, rare fish species, and river treasure chests.\n\n### Acceptance Criteria\n- Cast fishing line into rivers and lakes\n- Bite tension minigame with retro audio pops\n- Fish logbook and water treasure drops',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.6: Dynamic Day/Night Cycle, Weather & Campfires',
    body: '## Overview\nCircadian lighting clock, rain showers with puddle reflections, fireflies, and restful campfires.\n\n### Acceptance Criteria\n- Smooth 24-minute daylight cycle with golden hour sunset\n- Rain showers with puddles and lightning flashes\n- Glowing campfires that heal standing players',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.7: Pip\'s Oddities Shop & Wandering Traders',
    body: '## Overview\nInteractive shop interface with rotating wares, rare vanity items, and buy/sell economy.\n\n### Acceptance Criteria\n- Merchant shop window with buy/sell tabs\n- Stock rotation on day/night transitions\n- Coin/acorn currency transactions',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.8: Companion Pets & Mountable Wildlife',
    body: '## Overview\nLoyal animal followers (Buster sniffing hidden secrets, mountable giant frogs).\n\n### Acceptance Criteria\n- Pet follower entity following player with distance spring\n- Pet reactivity (sniffing hidden chests, barking at enemies)\n- Mountable wildlife with increased traversal speed',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.9: Chiptune Ocarina & Jam Sessions',
    body: '## Overview\nInteractive musical instrument playing magical song melodies that unlock secrets and trigger world events.\n\n### Acceptance Criteria\n- 5-note melodic keypad (C, D, E, G, A)\n- Melodic pattern detector (plays Zelda-style secret fanfare)\n- Synchronized multiplayer jam audio',
    labels: ['phase-7: RPG Expansions', 'enhancement']
  },
  {
    title: 'Task 7.10: Mobile Touch Controls & Responsive Viewport (Low Priority / Testing)',
    body: '## Overview\nVirtual floating D-pad / thumbstick for movement, responsive on-screen action buttons (Attack, Roll, Interact), touch-friendly modal UI, and dynamic mobile canvas scaling.\n\n### Acceptance Criteria\n- Virtual analog thumbstick in bottom-left corner with deadzone calibration\n- Attack, Roll, and Interact touch buttons in bottom-right\n- Auto-hides on desktop; auto-detects touch events\n- Viewport scales seamlessly on mobile phones and tablets',
    labels: ['phase-7: RPG Expansions', 'low-priority']
  }
];

console.log(`🚀 Creating ${tasks.length} GitHub Issues on Jbudone/bitquest...`);

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]!;
  console.log(`[${i + 1}/${tasks.length}] Creating: ${task.title}...`);
  try {
    const labelArgs = task.labels.flatMap(l => ['--label', l]);
    await $`gh issue create --title ${task.title} --body ${task.body} ${labelArgs}`.quiet();
  } catch (err: any) {
    console.error(`Failed to create issue "${task.title}":`, err.message);
  }
}

console.log('✨ All 28 tasks successfully created as GitHub Issues!');
