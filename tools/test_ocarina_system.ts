/**
 * BitQuest - Chiptune Ocarina & Jam Sessions Unit Test Suite (Task 7.9 / Issue #27)
 * Tests pentatonic scales, Zelda-style melody matcher, gap timeouts,
 * co-op jam resonance, and server world authoritative song execution.
 */

import {
  OCARINA_NOTES,
  OCARINA_SONGS,
  OcarinaEngine,
  type OcarinaNote,
  type NoteEvent
} from '../shared/src/ocarina';
import { WorldManager } from '../server/src/world';
import { WorldDatabase } from '../server/src/db';

async function runOcarinaTests() {
  console.log('=== BITQUEST CHIPTUNE OCARINA & JAM SESSION TEST SUITE ===\n');
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
  // Test 1: Pentatonic Note Scale & Specifications
  // ----------------------------------------------------
  console.log('1. Pentatonic Scale Specifications & Glyphs:');
  const expectedNotes: OcarinaNote[] = ['C4', 'D4', 'E4', 'G4', 'A4'];
  assert(Object.keys(OCARINA_NOTES).length === 5, 'Exactly 5 pentatonic notes registered');
  
  for (const n of expectedNotes) {
    const def = OCARINA_NOTES[n];
    assert(!!def, `Note ${n} exists in definitions`);
    assert(def.freq > 200 && def.freq < 500, `Note ${n} frequency is within audio range (${def.freq} Hz)`);
    assert(typeof def.solfege === 'string' && def.solfege.length > 0, `Note ${n} has valid solfège (${def.solfege})`);
    assert(typeof def.glyph === 'string' && def.glyph.length > 0, `Note ${n} has retro visual glyph (${def.glyph})`);
    assert(def.color.startsWith('#'), `Note ${n} has valid hex color (${def.color})`);
    assert(OcarinaEngine.isValidNote(n), `isValidNote('${n}') returns true`);
  }
  assert(!OcarinaEngine.isValidNote('B4'), "isValidNote('B4') returns false");
  assert(!OcarinaEngine.isValidNote('C5'), "isValidNote('C5') returns false");

  // ----------------------------------------------------
  // Test 2: Song Definitions & Sequences
  // ----------------------------------------------------
  console.log('\n2. Magical Songs & Sequences:');
  assert(OCARINA_SONGS.length === 5, 'Exactly 5 magical Zelda-style songs defined');
  const songIds = OCARINA_SONGS.map(s => s.id);
  assert(songIds.includes('song_of_sun'), 'Song of the Sun registered');
  assert(songIds.includes('song_of_storms'), 'Song of Storms registered');
  assert(songIds.includes('song_of_woodlands'), "Bramble's Woodland Jig registered");
  assert(songIds.includes('lullaby_hearth'), 'Lullaby of the Hearth registered');
  assert(songIds.includes('song_of_revelation'), 'Minuet of Mysteries registered');

  for (const s of OCARINA_SONGS) {
    assert(s.sequence.length === 5, `Song ${s.name} sequence length is 5 notes`);
    const allValid = s.sequence.every(n => OcarinaEngine.isValidNote(n));
    assert(allValid, `All notes in ${s.name} are valid pentatonic notes`);
  }

  // ----------------------------------------------------
  // Test 3: Pattern Matcher Engine
  // ----------------------------------------------------
  console.log('\n3. Melody Pattern Recognition Engine:');
  const now = 1000000;

  // Exact Sun Song: C4 -> E4 -> G4 -> E4 -> G4
  const sunHistory: NoteEvent[] = [
    { note: 'C4', time: now - 1600 },
    { note: 'E4', time: now - 1200 },
    { note: 'G4', time: now - 800 },
    { note: 'E4', time: now - 400 },
    { note: 'G4', time: now }
  ];
  const matchedSun = OcarinaEngine.matchSong(sunHistory, 2800, now);
  assert(matchedSun?.id === 'song_of_sun', 'Sun song detected on exact 5-note match');

  // Trailing match with prefix noise: D4 -> A4 -> C4 -> E4 -> G4 -> E4 -> G4
  const noisySunHistory: NoteEvent[] = [
    { note: 'D4', time: now - 2400 },
    { note: 'A4', time: now - 2000 },
    { note: 'C4', time: now - 1600 },
    { note: 'E4', time: now - 1200 },
    { note: 'G4', time: now - 800 },
    { note: 'E4', time: now - 400 },
    { note: 'G4', time: now }
  ];
  const matchedNoisySun = OcarinaEngine.matchSong(noisySunHistory, 2800, now);
  assert(matchedNoisySun?.id === 'song_of_sun', 'Sun song recognized with trailing buffer after random notes');

  // Storm Song: D4, G4, D4, G4, A4
  const stormHistory: NoteEvent[] = [
    { note: 'D4', time: now - 1600 },
    { note: 'G4', time: now - 1200 },
    { note: 'D4', time: now - 800 },
    { note: 'G4', time: now - 400 },
    { note: 'A4', time: now }
  ];
  const matchedStorm = OcarinaEngine.matchSong(stormHistory, 2800, now);
  assert(matchedStorm?.id === 'song_of_storms', 'Storm song detected accurately');

  // Incomplete / Partial Sequence (4 notes of 5)
  const partialHistory: NoteEvent[] = [
    { note: 'D4', time: now - 1200 },
    { note: 'G4', time: now - 800 },
    { note: 'D4', time: now - 400 },
    { note: 'G4', time: now }
  ];
  assert(OcarinaEngine.matchSong(partialHistory, 2800, now) === null, 'Partial song does not trigger false positive');

  // Gap Timeout exceeded (> 2800ms between notes)
  const expiredGapHistory: NoteEvent[] = [
    { note: 'C4', time: now - 5000 },
    { note: 'E4', time: now - 1200 },
    { note: 'G4', time: now - 800 },
    { note: 'E4', time: now - 400 },
    { note: 'G4', time: now }
  ];
  assert(OcarinaEngine.matchSong(expiredGapHistory, 2800, now) === null, 'Gap timeout between note 1 and 2 clears sequence');

  // ----------------------------------------------------
  // Test 4: Co-Op Jam Session Resonance
  // ----------------------------------------------------
  console.log('\n4. Multiplayer Jam Session Resonance:');
  const soloNotes: NoteEvent[] = [
    { note: 'C4', time: now - 1000, playerId: 'player_1' },
    { note: 'E4', time: now - 500, playerId: 'player_1' },
    { note: 'G4', time: now, playerId: 'player_1' }
  ];
  const soloJam = OcarinaEngine.checkJamResonance(soloNotes, 'player_1', now, 3500);
  assert(!soloJam.isJam, 'Single player solo notes do NOT trigger jam resonance');

  const duoNotes: NoteEvent[] = [
    { note: 'C4', time: now - 1200, playerId: 'player_1' },
    { note: 'E4', time: now - 400, playerId: 'player_2' },
    { note: 'G4', time: now, playerId: 'player_1' }
  ];
  const duoJam = OcarinaEngine.checkJamResonance(duoNotes, 'player_1', now, 3500);
  assert(duoJam.isJam, 'Multiple distinct players playing within 3.5s window triggers Jam Resonance');
  assert(duoJam.participantIds.length === 2, 'Resonance participant count is 2');
  assert(duoJam.participantIds.includes('player_1') && duoJam.participantIds.includes('player_2'), 'Both player IDs recorded in jam session');

  const staleDuoNotes: NoteEvent[] = [
    { note: 'C4', time: now - 6000, playerId: 'player_2' }, // beyond 3.5s
    { note: 'G4', time: now, playerId: 'player_1' }
  ];
  const staleJam = OcarinaEngine.checkJamResonance(staleDuoNotes, 'player_1', now, 3500);
  assert(!staleJam.isJam, 'Stale peer notes beyond 3.5s window do NOT trigger jam resonance');

  // ----------------------------------------------------
  // Test 5: Server WorldManager Authoritative Execution
  // ----------------------------------------------------
  console.log('\n5. Server WorldManager Authoritative Song Execution:');
  const db = new WorldDatabase(':memory:');
  const world = new WorldManager(db);

  // Mock player
  world.players.set('test_bard', {
    id: 'test_bard',
    name: 'Minstrel',
    x: 400,
    y: 500,
    color: '#3b82f6',
    paletteIndex: 0,
    direction: 'down',
    health: 2,
    maxHealth: 5,
    mana: 20,
    maxMana: 30,
    coins: 50,
    acorns: 10,
    anim: 'idle',
    carryingItem: null
  });

  // Track event broadcasts
  let noteBroadcastCount = 0;
  let songBroadcastData: any = null;
  let jamResonanceFired = false;
  let lightningFired = false;

  world.onOcarinaNote = (_pid, _note, _x, _y) => {
    noteBroadcastCount++;
  };
  world.onOcarinaSong = (_pid, songId, songName, effectType, _x, _y) => {
    songBroadcastData = { songId, songName, effectType };
  };
  world.onOcarinaJamResonance = (_pids, _x, _y) => {
    jamResonanceFired = true;
  };
  world.onLightningStrike = (_x, _y) => {
    lightningFired = true;
  };

  // Test Note Dispatch
  world.playOcarinaNote('test_bard', 'C4', 400, 500);
  assert(noteBroadcastCount === 1, 'playOcarinaNote broadcasted event');
  assert(world.recentOcarinaNotes.length === 1, 'recentOcarinaNotes recorded entry');

  // Test Jam Resonance on Server
  world.playOcarinaNote('peer_flutist', 'G4', 420, 500);
  assert(noteBroadcastCount === 2, 'Peer flutist note broadcasted');
  assert(jamResonanceFired, 'Jam resonance callback fired automatically on server when peer played');

  // Test Song of the Sun (clear weather & 7 AM morning)
  world.setWeather('rain');
  assert(world.getWeather() === 'rain', 'Weather preset to rain before Sun song');
  world.playOcarinaSong('test_bard', 'song_of_sun', 400, 500);
  assert(songBroadcastData?.songId === 'song_of_sun', 'Sun song broadcasted');
  assert(world.getWeather() === 'clear', 'Song of the Sun dissipated rain clouds to clear weather');
  assert(world.weatherState.timeOfDaySec === 7 * 60, 'Song of the Sun fast-forwarded time to 7 AM sunrise');

  // Clear cooldown to test Song of Storms
  world.playerSongCooldowns.clear();
  world.playOcarinaSong('test_bard', 'song_of_storms', 400, 500);
  assert(songBroadcastData?.songId === 'song_of_storms', 'Storms song broadcasted');
  assert(world.getWeather() === 'rain', 'Song of Storms called forth rain');
  assert(lightningFired, 'Song of Storms struck atmospheric lightning');

  // Clear cooldown to test Bramble's Woodland Jig (strawberry drops)
  world.playerSongCooldowns.clear();
  const initialItemsCount = world.items.size;
  world.playOcarinaSong('test_bard', 'song_of_woodlands', 400, 500);
  assert(world.items.size === initialItemsCount + 2, 'Song of Woodlands sprouted 2 wild strawberry drops');
  const berries = Array.from(world.items.values()).filter(i => i.itemType === 'strawberry');
  assert(berries.length >= 2, 'Wild strawberry item drops verified in world items table');

  // Clear cooldown to test Lullaby of the Hearth (healing)
  world.playerSongCooldowns.clear();
  const playerBefore = world.players.get('test_bard')!;
  const hpBefore = playerBefore.health;
  world.playOcarinaSong('test_bard', 'lullaby_hearth', 400, 500);
  assert(playerBefore.health === hpBefore + 1, 'Lullaby of the Hearth healed player for +1 HP');

  // Cooldown rate limiting test
  songBroadcastData = null;
  world.playOcarinaSong('test_bard', 'lullaby_hearth', 400, 500);
  assert(songBroadcastData === null, 'Song spam rejected within cooldown window (< 2000ms)');

  console.log('\n========================================');
  console.log(`TOTAL OCARINA TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runOcarinaTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
