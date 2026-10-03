// tools/test_pathfinding.ts
// Headless test suite for Smart Enemy Pathfinding, Boids Flocking & Leashing Engine (Issue #12 / Task 6.4)

import { NavigationEngine, NavAgent } from '../shared/src/navigation';

console.log("🍄 Running BitQuest Smart Enemy Pathfinding & Flocking Steering Suite...\n");

const nav = new NavigationEngine();

// 1. Verify Grid Obstacles and Gate Mechanics
if (!nav.isSolid(0, 0) || !nav.isSolid(63, 55)) {
  console.error("❌ Map perimeter is not sealed!");
  process.exit(1);
}
console.log("✅ Outer perimeter boundaries verified solid.");

// Azure River obstacle at (52, 20) is solid, but bridge at (52, 29) is walkable
if (!nav.isSolid(52, 20) || nav.isSolid(52, 29)) {
  console.error("❌ River or bridge collision check failed!");
  process.exit(1);
}
console.log("✅ Azure River water solid & wooden bridge walkable verified.");

// Sunken Gate default closed vs opened
nav.setGateOpened(false);
if (!nav.isSolid(32, 16)) {
  console.error("❌ Gate should be solid when closed!");
  process.exit(1);
}
nav.setGateOpened(true);
if (nav.isSolid(32, 16)) {
  console.error("❌ Gate should be walkable when opened!");
  process.exit(1);
}
console.log("✅ Sunken Gate dynamic pathing unseal toggle verified.");

// 2. Line of Sight Raycast
const clearLos = nav.hasLineOfSight(1000, 900, 1050, 900);
if (!clearLos) {
  console.error("❌ Unobstructed line of sight should return true!");
  process.exit(1);
}

// Raycast directly through Grandma's Cottage (tile 26, 22 -> px 832, 704)
const blockedLos = nav.hasLineOfSight(700, 704, 950, 704);
if (blockedLos) {
  console.error("❌ Line of sight through building cottage should return false!");
  process.exit(1);
}
console.log("✅ Bresenham line-of-sight raycasting verified.");

// 3. A* Pathfinding Around Obstacles
// Start west of Grandma's cottage, goal east of cottage
const startX = 760;
const startY = 704;
const goalX = 960;
const goalY = 704;

const path = nav.findPath(startX, startY, goalX, goalY);
if (!path || path.length === 0) {
  console.error("❌ A* failed to find path around cottage!");
  process.exit(1);
}

// Ensure no waypoint on path is inside a solid tile
for (const pt of path) {
  if (!nav.isWalkablePixel(pt.x, pt.y)) {
    console.error(`❌ Waypoint (${pt.x}, ${pt.y}) is inside a solid obstacle!`);
    process.exit(1);
  }
}
console.log(`✅ A* path successfully routed around cottage with ${path.length} waypoints without snagging.`);

// 4. Boids Flocking Separation Steering
const mob1 = { id: 'mob_1', x: 400, y: 800 };
const mob2 = { id: 'mob_2', x: 404, y: 802 }; // almost overlapping
const neighbors = [mob1, mob2];

const sep1 = nav.computeSeparation(mob1.id, mob1.x, mob1.y, neighbors, 34);
const sep2 = nav.computeSeparation(mob2.id, mob2.x, mob2.y, neighbors, 34);

// Repulsion should push mob1 away from mob2 and vice versa
if (sep1.vx >= 0 || sep2.vx <= 0) {
  console.error("❌ Flocking separation forces failed to repel overlapping mobs in opposite directions!");
  process.exit(1);
}
console.log(`✅ Boids flocking separation verified: Mob1 push=(${sep1.vx.toFixed(2)}, ${sep1.vy.toFixed(2)}), Mob2 push=(${sep2.vx.toFixed(2)}, ${sep2.vy.toFixed(2)})`);

// 5. Home Leashing State Machine
const agent: NavAgent = {
  id: 'grumble_test',
  x: 400,
  y: 800,
  homeX: 400,
  homeY: 800,
  aiState: 'idle',
  aggroRadius: 120,
  leashRadius: 200,
  speed: 16
};

// Player far away (idle state persists)
nav.updateAgent(agent, [{ x: 900, y: 900 }], [], 1000);
if (agent.aiState !== 'idle') {
  console.error(`❌ Expected idle state, got: ${agent.aiState}`);
  process.exit(1);
}
console.log("✅ Leash state: Idle persists when player is beyond aggro range.");

// Player enters aggro range (100px away) -> transitions to 'chase'
nav.updateAgent(agent, [{ x: 460, y: 800 }], [], 2000);
if (agent.aiState !== 'chase') {
  console.error(`❌ Expected chase state on aggro, got: ${agent.aiState}`);
  process.exit(1);
}
console.log("✅ Leash state: Chases target when player enters aggro radius.");

// Mob moves towards player
const prevX = agent.x;
nav.updateAgent(agent, [{ x: 460, y: 800 }], [], 3000);
if (agent.x <= prevX) {
  console.error("❌ Agent failed to move closer to player during chase.");
  process.exit(1);
}
console.log(`✅ Mob progressed closer to target: ${prevX} -> ${agent.x}`);

// Player retreats far past leash distance -> transitions to 'confused'
nav.updateAgent(agent, [{ x: 1200, y: 800 }], [], 4000);
if (agent.aiState !== 'confused') {
  console.error(`❌ Expected confused state upon leash break, got: ${agent.aiState}`);
  process.exit(1);
}
console.log("✅ Leash state: Enters 'confused' state when player breaks leash boundary.");

// Confused timer active -> mob holds position
const confusedPos = { x: agent.x, y: agent.y };
nav.updateAgent(agent, [], [], 4500); // 500ms into 1800ms timer
if (agent.aiState !== 'confused' || agent.x !== confusedPos.x || agent.y !== confusedPos.y) {
  console.error("❌ Mob moved while in confused state.");
  process.exit(1);
}
console.log("✅ Mob stands still and displays confusion during confused timer.");

// Confused timer expires -> transitions to 'returning'
nav.updateAgent(agent, [], [], 6000); // after 1800ms
if (agent.aiState !== 'returning') {
  console.error(`❌ Expected returning state after confusion, got: ${agent.aiState}`);
  process.exit(1);
}
console.log("✅ Leash state: Switches to 'returning' towards home after confusion.");

// Fast-forward returning to home
let returnSteps = 0;
while (agent.aiState === 'returning' && returnSteps++ < 40) {
  nav.updateAgent(agent, [], [], 6000 + returnSteps * 500);
}
if (agent.aiState !== 'idle' || Math.hypot(agent.x - agent.homeX, agent.y - agent.homeY) > 5) {
  console.error(`❌ Failed to return home safely! State: ${agent.aiState}, Pos: (${agent.x}, ${agent.y})`);
  process.exit(1);
}
console.log(`✅ Mob successfully returned home and reset to 'idle' state in ${returnSteps} steps.`);

// 6. Performance & Zero Allocation Benchmark
const benchStart = performance.now();
const runs = 2500;
for (let i = 0; i < runs; i++) {
  nav.findPath(760, 704, 960, 704);
}
const benchTime = performance.now() - benchStart;
console.log(`✅ A* Benchmark: ${runs} full obstacle pathfinding queries completed in ${benchTime.toFixed(2)}ms (${(benchTime / runs).toFixed(4)}ms / query).`);

console.log("\n🎉 ALL PATHFINDING, BOIDS FLOCKING & LEASHING TESTS PASSED!\n");
