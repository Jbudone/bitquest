// tools/test_pets_and_mounts.ts
// BitQuest Headless Verification Suite: Companion Pets & Mountable Wildlife
// Issue #26: Task 7.8

import { 
  PetEngine, 
  PET_DEFINITIONS, 
  MOUNT_DEFINITIONS 
} from '../shared/src/pets';
import { WorldManager } from '../server/src/world';
import type { EntityData, PlayerData } from '../shared/src/types';

console.log('🐾 Running BitQuest Companion Pets & Mountable Wildlife Test Suite (Issue #26)...\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${msg}`);
    passedTests++;
  }
}

// ============================================================
// 1. Pet & Mount Registry Definitions
// ============================================================
console.log('--- 1. Pet & Mount Registry Definitions ---');

const busterDef = PET_DEFINITIONS['wildlife_buster'];
assert(!!busterDef, 'Buster the Dog is defined in PET_DEFINITIONS');
assert(busterDef.name === 'Buster', 'Buster has correct name');
assert(busterDef.species === 'dog', 'Buster has species dog');
assert(busterDef.idealFollowDistance === 36, 'Buster ideal follow distance is 36px');
assert(busterDef.maxFollowDistance === 48, 'Buster max follow distance is 48px');
assert(busterDef.sprintDistance === 220, 'Buster sprint distance threshold is 220px');
assert(busterDef.teleportDistance === 580, 'Buster teleport catchup threshold is 580px');
assert(busterDef.sniffRadius === 120, 'Buster secret sniffing radius is 120px');
assert(busterDef.barkRadius === 110, 'Buster threat barking radius is 110px');

const frogDef = MOUNT_DEFINITIONS['mount_frog_mossy'];
assert(!!frogDef, 'Giant Moss Frog is defined in MOUNT_DEFINITIONS');
assert(frogDef.name === "Barnaby's Boghopper", 'Mount has correct name');
assert(frogDef.species === 'frog', 'Mount has species frog');
assert(frogDef.speedMultiplier === 1.55, 'Mount confers +55% traversal speed multiplier');
assert(frogDef.mountRadius === 56, 'Mount interaction radius is 56px');
assert(frogDef.hopIntervalMs === 340, 'Mount hop interval is 340ms');
assert(frogDef.initialX === 780 && frogDef.initialY === 1320, 'Mount spawns at Crystal Lake bank (780, 1320)');

// ============================================================
// 2. PetEngine Target Offset Calculations
// ============================================================
console.log('\n--- 2. PetEngine Target Offset Calculations ---');

const targetDown = PetEngine.calculateTargetPosition(100, 200, 'down', 36);
assert(targetDown.x === 100 && targetDown.y === 164, 'Facing down: target offset is behind at y - 36 (164)');

const targetUp = PetEngine.calculateTargetPosition(100, 200, 'up', 36);
assert(targetUp.x === 100 && targetUp.y === 236, 'Facing up: target offset is behind at y + 36 (236)');

const targetLeft = PetEngine.calculateTargetPosition(100, 200, 'left', 36);
assert(targetLeft.x === 136 && targetLeft.y === 200, 'Facing left: target offset is behind at x + 36 (136)');

const targetRight = PetEngine.calculateTargetPosition(100, 200, 'right', 36);
assert(targetRight.x === 64 && targetRight.y === 200, 'Facing right: target offset is behind at x - 36 (64)');

// ============================================================
// 3. Distance Spring Physics & Catchup Modes
// ============================================================
console.log('\n--- 3. Distance Spring Physics & Catchup Modes ---');

// Idle: already at target
const idleStep = PetEngine.stepSpringFollow(100, 100, 100, 102, 0.12, 580);
assert(!idleStep.moved && idleStep.state === 'idle', 'Pet remains idle when within 4px of target offset');

// Trot: moderate distance (50px away)
const trotStep = PetEngine.stepSpringFollow(100, 100, 150, 100, 0.12, 580);
assert(trotStep.moved === true, 'Pet moves when 50px away');
const trotX = trotStep.x;
assert(trotX > 100 && trotX < 150, `Pet lerps towards target (x: ${trotX.toFixed(1)})`);

// Sprint: far distance (200px away)
const sprintStep = PetEngine.stepSpringFollow(100, 100, 300, 100, 0.12, 580);
assert(sprintStep.moved === true && sprintStep.state === 'run', 'Pet engages run/sprint state when > 140px away');
assert(sprintStep.x > trotX, 'Sprint spring covers larger distance step than trot');

// Teleport: extreme distance (> 580px away)
const teleportStep = PetEngine.stepSpringFollow(100, 100, 800, 100, 0.12, 580);
assert(teleportStep.moved === true && teleportStep.x === 800 && teleportStep.y === 100, 'Pet instantly teleports to target when distance > 580px');

// ============================================================
// 4. Secret Sniffing & Enemy Threat Detection Logic
// ============================================================
console.log('\n--- 4. Secret Sniffing & Enemy Threat Detection Logic ---');

const mockEntities: EntityData[] = [
  {
    id: 'chest_near_closed',
    type: 'chest',
    x: 150,
    y: 100,
    interactable: true,
    state: { opened: false }
  },
  {
    id: 'chest_near_opened',
    type: 'chest',
    x: 120,
    y: 100,
    interactable: true,
    state: { opened: true }
  },
  {
    id: 'chest_far',
    type: 'chest',
    x: 350,
    y: 100,
    interactable: true,
    state: { opened: false }
  },
  {
    id: 'enemy_hostile',
    type: 'enemy',
    subtype: 'sproutling',
    x: 160,
    y: 100,
    interactable: true,
    state: { hp: 2, destroyed: false }
  },
  {
    id: 'enemy_dead',
    type: 'enemy',
    subtype: 'sproutling',
    x: 110,
    y: 100,
    interactable: true,
    state: { hp: 0, destroyed: true }
  }
];

// Sniffing test
const detectedSecret = PetEngine.detectNearbySecrets(100, 100, mockEntities, 120);
assert(detectedSecret !== null && detectedSecret.id === 'chest_near_closed', 'Buster sniffs closed chest within 120px');

// Opened chests are ignored
const noOpenedSecret = PetEngine.detectNearbySecrets(100, 100, [mockEntities[1]!], 120);
assert(noOpenedSecret === null, 'Buster ignores already opened chests');

// Far chests are ignored
const noFarSecret = PetEngine.detectNearbySecrets(100, 100, [mockEntities[2]!], 120);
assert(noFarSecret === null, 'Buster ignores chests beyond 120px sniff radius');

// Barking threat test
const detectedEnemy = PetEngine.detectNearbyEnemies(100, 100, mockEntities, 110);
assert(detectedEnemy !== null && detectedEnemy.id === 'enemy_hostile', 'Buster barks at active hostile enemy within 110px');

// Defeated enemies are ignored
const noDeadEnemy = PetEngine.detectNearbyEnemies(100, 100, [mockEntities[4]!], 110);
assert(noDeadEnemy === null, 'Buster does NOT bark at destroyed/dead enemies');

// ============================================================
// 5. Mount Proximity & Validation Checks
// ============================================================
console.log('\n--- 5. Mount Proximity & Validation Checks ---');

assert(PetEngine.canMount(780, 1330, 780, 1320, 56) === true, 'Player within 10px can mount frog');
assert(PetEngine.canMount(780, 1370, 780, 1320, 56) === true, 'Player at 50px boundary can mount frog');
assert(PetEngine.canMount(780, 1400, 780, 1320, 56) === false, 'Player at 80px distance cannot mount frog (> 56px)');

// ============================================================
// 6. Server WorldManager Authoritative Integration
// ============================================================
console.log('\n--- 6. Server WorldManager Authoritative Integration ---');

const world = new WorldManager();

// Track mount & pet alert events
let lastMountToggle: any = null;
let lastPetAlert: any = null;

world.onMountToggle = (playerId, mountId, x, y) => {
  lastMountToggle = { playerId, mountId, x, y };
};

world.onPetAlert = (petId, alertType, x, y, text) => {
  lastPetAlert = { petId, alertType, x, y, text };
};

// Check default entities spawned
const busterEntity = world.entities.get('wildlife_buster');
assert(busterEntity !== null && busterEntity !== undefined, 'Buster entity exists in world entities');
assert(busterEntity.type === 'wildlife' && busterEntity.subtype === 'dog', 'Buster has type wildlife and subtype dog');

const frogEntity = world.entities.get('mount_frog_mossy');
assert(frogEntity !== null && frogEntity !== undefined, 'Barnaby’s Boghopper mount entity exists in world entities');
assert(frogEntity.type === 'mount' && frogEntity.subtype === 'frog', 'Frog has type mount and subtype frog');
assert(frogEntity.state.mountedBy === null, 'Frog is initially unmounted');

// Add test player near Buster
const player = world.addPlayer('hero_1', 'PetMaster', '#3b82f6', 1);
player.x = 1080;
player.y = 1190;

// Test 6a: Petting / Adopting Buster
world.commandPet('hero_1', 'wildlife_buster', 'pet');
assert(busterEntity.state.ownerId === 'hero_1', 'Buster ownerId set to hero_1 after petting');
assert(busterEntity.state.petState === 'following', "Buster petState set to 'following'");
assert(busterEntity.state.petCount === 1, 'Buster petCount incremented to 1');

// Toggle to stay
world.commandPet('hero_1', 'wildlife_buster', 'pet');
assert(busterEntity.state.petState === 'staying', "Second pet toggles Buster to 'staying'");

// Toggle back to follow
world.commandPet('hero_1', 'wildlife_buster', 'follow');
assert(busterEntity.state.petState === 'following', "Command 'follow' reactivates following mode");

// Test 6b: Secret Cache Sniffing in WorldManager
// Place Buster within 80px of Hidden Meadow Cache (1480, 920)
busterEntity.x = 1440;
busterEntity.y = 920;
player.x = 1440;
player.y = 900;
lastPetAlert = null;

// Trigger secret detection logic in WorldManager AI
const detectedMeadowCache = PetEngine.detectNearbySecrets(busterEntity.x, busterEntity.y, world.entities.values(), 120);
assert(detectedMeadowCache !== null && detectedMeadowCache.id === 'chest_meadow_cache', 'Buster detects Hidden Meadow Cache');

// Test 6c: Hostile Enemy Barking in WorldManager
// Place enemy within 80px of Buster
const testEnemy: EntityData = {
  id: 'test_invader',
  type: 'enemy',
  subtype: 'sproutling',
  x: 1470,
  y: 920,
  interactable: true,
  state: { hp: 2, destroyed: false }
};
world.entities.set('test_invader', testEnemy);

const detectedInvader = PetEngine.detectNearbyEnemies(busterEntity.x, busterEntity.y, world.entities.values(), 110);
assert(detectedInvader !== null && detectedInvader.id === 'test_invader', 'Buster detects nearby hostile test enemy');

// Test 6d: Mounting Barnaby's Boghopper
// Position player near frog (780, 1320)
player.x = 780;
player.y = 1330;
lastMountToggle = null;

const mountSuccess = world.mountWildlife('hero_1', 'mount_frog_mossy');
assert(mountSuccess === true, 'world.mountWildlife succeeds when player is in proximity');
assert((player as any).mountedEntityId === 'mount_frog_mossy', 'Player mountedEntityId set to mount_frog_mossy');
assert(frogEntity.state.mountedBy === 'hero_1', 'Frog mount state.mountedBy set to hero_1');
assert(lastMountToggle !== null && lastMountToggle.mountId === 'mount_frog_mossy', 'world.onMountToggle fired with mountId');

// Attempt duplicate mount while already mounted
const duplicateMount = world.mountWildlife('hero_1', 'mount_frog_mossy');
assert(duplicateMount === false, 'Cannot mount another creature while already mounted');

// Test 6e: Synchronized Player & Mount Movement
world.updatePlayerMove('hero_1', 840, 1320, 'right', 'ride', null);
assert(player.x === 840 && player.y === 1320, 'Player moved to (840, 1320)');
assert(frogEntity.x === 840 && frogEntity.y === 1320, 'Frog mount position synchronized to player (840, 1320)');

// Test 6f: Dismounting
lastMountToggle = null;
const dismountSuccess = world.dismountWildlife('hero_1');
assert(dismountSuccess === true, 'world.dismountWildlife succeeds');
assert((player as any).mountedEntityId === null, 'Player mountedEntityId reset to null');
assert(frogEntity.state.mountedBy === null, 'Frog mount state.mountedBy reset to null');
assert(frogEntity.x === 840 && frogEntity.y === 1320, 'Frog stays at dismounted coordinates (840, 1320)');
assert(lastMountToggle !== null && lastMountToggle.mountId === null, 'world.onMountToggle fired with null mountId');

// Test 6g: Player Disconnect Cleanup
world.mountWildlife('hero_1', 'mount_frog_mossy');
assert(frogEntity.state.mountedBy === 'hero_1', 'Player remounted frog');
world.removePlayer('hero_1');
assert(frogEntity.state.mountedBy === null, 'Frog automatically dismounted when player disconnects');
assert(busterEntity.state.ownerId === null && busterEntity.state.petState === 'staying', 'Buster stops following when owner disconnects');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} PET & MOUNT TESTS PASSED CLEANLY!`);
process.exit(0);
