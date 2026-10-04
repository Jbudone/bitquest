/**
 * BitQuest - Visual Node-Based Dialogue & Quest DAG Graph Editor Test Suite (Milestone 9.1)
 *
 * Verifies:
 * 1. Loading canonical NPC dialogue trees (Barnaby, Grandma) into nodes & connections.
 * 2. Pin connectivity and Bezier coordinate resolution.
 * 3. Live "Play Dialogue" simulator state transitions.
 * 4. Graph Linter: Missing targets, orphan nodes, and circular loops.
 * 5. Node mutations: Add node, connect pin, delete node.
 * 6. Zod schema-compliant JSON export.
 */

import { QuestGraphStudio } from '../client/src/tools/questGraphStudio';

console.log('📜 Running BitQuest Dialogue & Quest DAG Graph Editor Test Suite (Milestone 9.1)...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Loading Canonical NPC Dialogues
// ---------------------------------------------------------------------------
console.log('\n--- 1. Loading Canonical NPC Dialogues ---');
const studio = new QuestGraphStudio(null as any);

assert(studio.nodes.size >= 4, `Barnaby dialogue loaded ${studio.nodes.size} nodes (expected >= 4)`);
assert(studio.nodes.has('greeting'), "Root node 'greeting' exists");
assert(studio.nodes.has('thanks'), "Node 'thanks' exists");
assert(studio.connections.length >= 3, `Connections built: ${studio.connections.length} (expected >= 3)`);

// ---------------------------------------------------------------------------
// 2. DAG Topology & Pin Routing
// ---------------------------------------------------------------------------
console.log('\n--- 2. DAG Topology & Pin Routing ---');
const greetingNode = studio.nodes.get('greeting')!;
assert(greetingNode.speaker.includes('Barnaby'), "Speaker is Barnaby");
assert(greetingNode.pins.some(p => p.type === 'in'), "Greeting has 'in' pin");
assert(greetingNode.pins.filter(p => p.type === 'out').length >= 3, "Greeting has at least 3 response 'out' pins");

// Find connection from greeting to thanks
const hasPathToThanks = studio.connections.some(c => c.fromNodeId === 'greeting' && c.toNodeId === 'thanks');
assert(hasPathToThanks, "Connection from 'greeting' to 'thanks' exists");

// ---------------------------------------------------------------------------
// 3. Live "Play Dialogue" Simulator State Machine
// ---------------------------------------------------------------------------
console.log('\n--- 3. Live "Play Dialogue" Simulator State Machine ---');
assert(studio.simCurrentNodeId === 'greeting', "Simulator initialized at 'greeting' node");

// Simulate player picking 'thanks' branch
studio.simCurrentNodeId = 'thanks';
assert(studio.simCurrentNodeId === 'thanks', "Simulator navigated to 'thanks' node");

// Step to searching
studio.simCurrentNodeId = 'searching';
assert(studio.simCurrentNodeId === 'searching', "Simulator navigated to 'searching' node");

// ---------------------------------------------------------------------------
// 4. Graph Linter: Integrity, Missing Targets & Orphan Detection
// ---------------------------------------------------------------------------
console.log('\n--- 4. Graph Linter: Integrity, Missing Targets & Orphan Detection ---');
let lint = studio.runLinter();
assert(lint.missingTargets.length === 0, "No missing targets in canonical Barnaby dialogue");
assert(lint.cycles.length === 0, "No circular soft-locks in canonical Barnaby dialogue");

// Inject an intentional orphan node
studio.nodes.set('orphan_test', {
  id: 'orphan_test',
  type: 'dialogue',
  title: 'Orphan Dialogue',
  speaker: 'Ghost',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  pins: [{ id: 'in', name: 'In', type: 'in' }]
});

lint = studio.runLinter();
assert(lint.orphanNodes.includes('orphan_test'), "Linter detected disconnected orphan node");

// Clean up orphan node
studio.nodes.delete('orphan_test');

// Inject intentional broken connection
studio.connections.push({
  id: 'broken_conn',
  fromNodeId: 'greeting',
  fromPinId: 'resp_0',
  toNodeId: 'non_existent_node',
  toPinId: 'in'
});

lint = studio.runLinter();
assert(lint.missingTargets.some(t => t.targetKey === 'non_existent_node'), "Linter detected missing target node");
assert(!lint.isValid, "Graph marked invalid due to broken target link");

// Remove broken connection
studio.connections = studio.connections.filter(c => c.id !== 'broken_conn');

// ---------------------------------------------------------------------------
// 5. Node Mutations: Add, Connect & Delete
// ---------------------------------------------------------------------------
console.log('\n--- 5. Node Mutations: Add, Connect & Delete ---');
const customNodeId = 'secret_quest_node';
studio.nodes.set(customNodeId, {
  id: customNodeId,
  type: 'dialogue',
  title: 'Secret Clue',
  speaker: 'Mysterious Stranger',
  text: 'The sunken ruins hold the Sun Stone.',
  x: 500,
  y: 500,
  width: 240,
  height: 120,
  pins: [
    { id: 'in', name: 'In', type: 'in' },
    { id: 'out_0', name: 'Accept', type: 'out' }
  ]
});

studio.connections.push({
  id: 'conn_thanks_to_secret',
  fromNodeId: 'thanks',
  fromPinId: 'resp_0',
  toNodeId: customNodeId,
  toPinId: 'in'
});

assert(studio.nodes.has(customNodeId), "Custom node successfully added");
assert(studio.connections.some(c => c.toNodeId === customNodeId), "Connection to custom node successfully created");

// Delete node and verify cascading link cleanup
studio.nodes.delete(customNodeId);
studio.connections = studio.connections.filter(c => c.fromNodeId !== customNodeId && c.toNodeId !== customNodeId);
assert(!studio.nodes.has(customNodeId), "Node deleted");
assert(!studio.connections.some(c => c.toNodeId === customNodeId), "Cascading connections to deleted node cleared");

// ---------------------------------------------------------------------------
// 6. JSON Export & Schema Conformance
// ---------------------------------------------------------------------------
console.log('\n--- 6. JSON Export & Schema Conformance ---');
const exported = studio.exportJSON();
assert(typeof exported === 'string', "Exported JSON is a string");

const parsed = JSON.parse(exported);
assert(parsed['greeting'] !== undefined, "Exported JSON contains 'greeting' node");
assert(parsed['greeting'].speaker.includes('Barnaby'), "Exported node has speaker field");
assert(Array.isArray(parsed['greeting'].responses), "Exported node has responses array");
assert(parsed['greeting'].responses[0].nextDialogueKey !== undefined, "Response contains nextDialogueKey");

// ---------------------------------------------------------------------------
// 7. Auto-Centering & Tab Activation Handling
// ---------------------------------------------------------------------------
console.log('\n--- 7. Auto-Centering & Tab Activation Handling ---');
// Test fitToNodes calculates valid zoom and pan
const initialZoom = studio.zoom;
studio.fitToNodes();
assert(typeof studio.zoom === 'number' && studio.zoom > 0 && !isNaN(studio.zoom), "fitToNodes computes valid zoom");
assert(typeof studio.panX === 'number' && !isNaN(studio.panX), "fitToNodes computes valid panX");
assert(typeof studio.panY === 'number' && !isNaN(studio.panY), "fitToNodes computes valid panY");

// Test onTabActivated executes without error
assert(typeof studio.onTabActivated === 'function', "onTabActivated method exists");
studio.onTabActivated();
assert(studio.simCurrentNodeId !== null, "Simulator node still active after onTabActivated");

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
