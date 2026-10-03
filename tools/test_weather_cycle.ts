// tools/test_weather_cycle.ts
// BitQuest Headless Verification Suite: Dynamic Day/Night Cycle, Circadian Lighting, Weather & Campfires
// Issue #24: Task 7.6

import { 
  WeatherEngine, 
  CAMPFIRES, 
  type WeatherType, 
  type DayPhase,
  type WeatherState 
} from '../shared/src/weather';
import { WorldManager } from '../server/src/world';
import type { PlayerData } from '../shared/src/types';

console.log('🌅 Running BitQuest Day/Night Cycle, Weather & Campfires Test Suite (Issue #24)...\n');

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
// 1. Circadian Clock & Day Phase Calculations
// ============================================================
console.log('--- 1. Circadian Clock & Day Phase Calculations ---');

assert(WeatherEngine.DAY_CYCLE_DURATION_SEC === 1440, 'Full day cycle duration is 1440 seconds (24 real minutes)');
assert(WeatherEngine.SECONDS_PER_GAME_HOUR === 60, '1 in-game hour corresponds to 60 real seconds');

// Test Midnight (0s)
const midnight = WeatherEngine.getTimeOfDay(0);
assert(midnight.hour === 0, `Midnight hour is 0 (actual: ${midnight.hour})`);
assert(midnight.minute === 0, `Midnight minute is 0 (actual: ${midnight.minute})`);
assert(midnight.phase === 'night', `Midnight phase is 'night' (actual: ${midnight.phase})`);
assert(midnight.icon === '🌙', `Midnight icon is 🌙 (actual: ${midnight.icon})`);
assert(midnight.formattedTime === '12:00 AM', `Midnight formatted time is '12:00 AM' (actual: ${midnight.formattedTime})`);

// Test Early Dawn (330s -> 5.5h = 5:30 AM)
const earlyDawn = WeatherEngine.getTimeOfDay(330);
assert(earlyDawn.hour === 5, `Early dawn hour is 5 (actual: ${earlyDawn.hour})`);
assert(earlyDawn.minute === 30, `Early dawn minute is 30 (actual: ${earlyDawn.minute})`);
assert(earlyDawn.phase === 'early_dawn', `5:30 AM phase is 'early_dawn' (actual: ${earlyDawn.phase})`);
assert(earlyDawn.icon === '🌌', `Early dawn icon is 🌌 (actual: ${earlyDawn.icon})`);
assert(earlyDawn.formattedTime === '05:30 AM', `Early dawn formatted time is '05:30 AM' (actual: ${earlyDawn.formattedTime})`);

// Test Dawn / Sunrise (390s -> 6.5h = 6:30 AM)
const dawn = WeatherEngine.getTimeOfDay(390);
assert(dawn.hour === 6, `Dawn hour is 6 (actual: ${dawn.hour})`);
assert(dawn.phase === 'dawn', `6:30 AM phase is 'dawn' (actual: ${dawn.phase})`);
assert(dawn.icon === '🌅', `Dawn icon is 🌅 (actual: ${dawn.icon})`);

// Test High Noon (720s -> 12h = 12:00 PM)
const noon = WeatherEngine.getTimeOfDay(720);
assert(noon.hour === 12, `High noon hour is 12 (actual: ${noon.hour})`);
assert(noon.minute === 0, `High noon minute is 0 (actual: ${noon.minute})`);
assert(noon.phase === 'day', `12:00 PM phase is 'day' (actual: ${noon.phase})`);
assert(noon.icon === '☀️', `High noon icon is ☀️ (actual: ${noon.icon})`);
assert(noon.formattedTime === '12:00 PM', `High noon formatted time is '12:00 PM' (actual: ${noon.formattedTime})`);

// Test Golden Hour Sunset (1110s -> 18.5h = 6:30 PM)
const sunset = WeatherEngine.getTimeOfDay(1110);
assert(sunset.hour === 18, `Sunset hour is 18 (actual: ${sunset.hour})`);
assert(sunset.phase === 'golden_hour', `6:30 PM phase is 'golden_hour' (actual: ${sunset.phase})`);
assert(sunset.icon === '🌇', `Sunset icon is 🌇 (actual: ${sunset.icon})`);
assert(sunset.formattedTime === '06:30 PM', `Sunset formatted time is '06:30 PM' (actual: ${sunset.formattedTime})`);

// Test Indigo Twilight (1230s -> 20.5h = 8:30 PM)
const twilight = WeatherEngine.getTimeOfDay(1230);
assert(twilight.hour === 20, `Twilight hour is 20 (actual: ${twilight.hour})`);
assert(twilight.phase === 'twilight', `8:30 PM phase is 'twilight' (actual: ${twilight.phase})`);
assert(twilight.icon === '🌆', `Twilight icon is 🌆 (actual: ${twilight.icon})`);

// Test Wraparound and Negative Time Values
const wrapTest = WeatherEngine.getTimeOfDay(1440 + 60); // 1:00 AM next day
assert(wrapTest.hour === 1 && wrapTest.minute === 0, `Wraparound time handled: 1500s -> 01:00 AM`);
const negTest = WeatherEngine.getTimeOfDay(-60); // 11:00 PM previous day
assert(negTest.hour === 23 && negTest.minute === 0, `Negative time handled: -60s -> 11:00 PM`);

// ============================================================
// 2. Ambient Lighting Interpolation & Weather Modulation
// ============================================================
console.log('\n--- 2. Ambient Lighting Interpolation & Weather Modulation ---');

const noonLight = WeatherEngine.getAmbientLighting(720, 'clear');
const clearNoonAlpha = noonLight.alpha;
const clearNoonColor = noonLight.color;
assert(clearNoonAlpha === 0.0, `Noon clear alpha is 0.0 (actual: ${clearNoonAlpha})`);
assert(clearNoonColor === 0xffffff, `Noon clear color is pure white 0xffffff (actual: 0x${clearNoonColor.toString(16)})`);

const midnightLight = WeatherEngine.getAmbientLighting(0, 'clear');
const clearMidnightAlpha = midnightLight.alpha;
assert(clearMidnightAlpha >= 0.60 && clearMidnightAlpha <= 0.65, `Midnight alpha is ~0.62 (actual: ${clearMidnightAlpha})`);
assert(midnightLight.r === 9 && midnightLight.g === 13 && midnightLight.b === 26, `Midnight color is deep night blue (0x090d1a)`);

// Weather modulation checks
const noonRain = WeatherEngine.getAmbientLighting(720, 'rain');
const rainAlpha = noonRain.alpha;
assert(rainAlpha > clearNoonAlpha, `Rain adds darkening alpha at noon (${rainAlpha} > ${clearNoonAlpha})`);
assert(noonRain.b > noonRain.r, `Rain lighting has cool blue/slate cast (b:${noonRain.b} > r:${noonRain.r})`);

const noonStorm = WeatherEngine.getAmbientLighting(720, 'storm');
assert(noonStorm.alpha > rainAlpha, `Storm is darker than gentle rain (${noonStorm.alpha} > ${rainAlpha})`);

const noonFog = WeatherEngine.getAmbientLighting(720, 'fog');
assert(noonFog.alpha > clearNoonAlpha, `Fog adds misty silver alpha (${noonFog.alpha} > ${clearNoonAlpha})`);

// Color lerp utility
const blended = WeatherEngine.lerpColor(0x000000, 0xffffff, 0.5);
assert(blended === 0x808080, `lerpColor 50% between black and white produces middle gray 0x808080 (actual: 0x${blended.toString(16)})`);

// ============================================================
// 3. Zero-Allocation Performance Stress Test
// ============================================================
console.log('\n--- 3. Zero-Allocation Performance Stress Test ---');

const ITERATIONS = 100_000;
const startPerf = performance.now();

let refBufferTime = WeatherEngine.getTimeOfDay(0);
let refBufferLight = WeatherEngine.getAmbientLighting(0);

for (let i = 0; i < ITERATIONS; i++) {
  const t = i % 1440;
  const w: WeatherType = i % 4 === 0 ? 'clear' : i % 4 === 1 ? 'rain' : i % 4 === 2 ? 'storm' : 'fog';
  const timeRes = WeatherEngine.getTimeOfDay(t);
  const lightRes = WeatherEngine.getAmbientLighting(t, w);

  // Assert reference identity: proves static buffer reuse without memory allocation
  if (timeRes !== refBufferTime || lightRes !== refBufferLight) {
    throw new Error('Heap allocation detected! Reusable buffers were re-created.');
  }
}

const elapsedPerf = performance.now() - startPerf;
console.log(`  ⚡ Executed ${ITERATIONS.toLocaleString()} lighting & time evaluations in ${elapsedPerf.toFixed(2)}ms`);
assert(elapsedPerf < 100, `High performance: 100k evaluations finished in < 100ms (took ${elapsedPerf.toFixed(2)}ms)`);

// ============================================================
// 4. Weather State Transitions & Lightning Simulation
// ============================================================
console.log('\n--- 4. Weather State Transitions & Lightning Simulation ---');

const weatherTypes: WeatherType[] = ['clear', 'rain', 'storm', 'fog'];
for (const w of weatherTypes) {
  const next = WeatherEngine.rollNextWeather(w);
  assert(weatherTypes.includes(next), `rollNextWeather from '${w}' yields valid weather type: '${next}'`);
  
  const duration = WeatherEngine.rollWeatherDuration(w);
  assert(duration >= 60_000 && duration <= 1_200_000, `Weather duration for '${w}' is between 1-20 minutes (${Math.round(duration / 1000)}s)`);
}

// Test weather update step
const simState: WeatherState = {
  current: 'clear',
  targetWeather: 'rain',
  transitionProgress: 0.0,
  nextChangeTime: Date.now() + 600000,
  windAngle: 0.7,
  windSpeed: 20,
  timeOfDaySec: 700
};

// Step forward 10 seconds during transition
const step1 = WeatherEngine.updateWeatherStep(10, simState, Date.now());
assert(simState.timeOfDaySec === 710, `Circadian clock advanced by 10s (now ${simState.timeOfDaySec}s)`);
assert(simState.transitionProgress > 0 && simState.transitionProgress < 1.0, `Transition progress smoothly blending (${simState.transitionProgress.toFixed(2)})`);
assert(simState.current === 'clear', `Current weather is still 'clear' while transitioning`);

// Step forward 20 more seconds to finish 15s transition
const step2 = WeatherEngine.updateWeatherStep(20, simState, Date.now());
assert(simState.current === 'rain', `Transition finished and current weather switched to 'rain'`);
assert(step2.weatherChanged === true, `weatherChanged event flagged true on transition completion`);

// Test lightning strike probability during storm vs clear
simState.current = 'clear';
let lightningFiresWhenClear = false;
for (let i = 0; i < 100; i++) {
  const step = WeatherEngine.updateWeatherStep(1.0, simState, Date.now());
  if (step.lightningTriggered) lightningFiresWhenClear = true;
}
assert(!lightningFiresWhenClear, `Lightning never fires when weather is 'clear'`);

simState.current = 'storm';
simState.targetWeather = 'storm';
simState.nextChangeTime = Date.now() + 1_000_000;
let lightningFiredInStorm = false;
for (let i = 0; i < 200; i++) {
  const step = WeatherEngine.updateWeatherStep(1.0, simState, Date.now());
  if (step.lightningTriggered) {
    lightningFiredInStorm = true;
    break;
  }
}
assert(lightningFiredInStorm, `Lightning successfully triggered during thunderstorm simulation`);

// ============================================================
// 5. Campfire Definitions & Restful Warmth Mechanics
// ============================================================
console.log('\n--- 5. Campfire Definitions & Restful Warmth Mechanics ---');

assert(CAMPFIRES.length === 4, `4 cozy campfires defined across world map (actual: ${CAMPFIRES.length})`);

const villageCampfire = CAMPFIRES.find(c => c.id === 'campfire_village')!;
assert(!!villageCampfire, 'Village Outskirts Hearth campfire exists');
assert(villageCampfire.x === 320 && villageCampfire.y === 448, 'Village campfire located at (320, 448)');
assert(villageCampfire.warmthRadius === 56, 'Campfire warmth radius is 56px');
assert(villageCampfire.hpPerTick === 1, 'Campfire heals 1 HP per tick');
assert(villageCampfire.mpPerTick === 5, 'Campfire restores 5 MP per tick');

// Test proximity lookup
const nearestAtFire = WeatherEngine.getNearestCampfire(322, 446, 64);
assert(nearestAtFire?.id === 'campfire_village', `Detected village campfire within proximity (actual: ${nearestAtFire?.id})`);

const nearestFarAway = WeatherEngine.getNearestCampfire(0, 0, 64);
assert(nearestFarAway === null, `No campfire detected when far away at (0, 0)`);

// Test isNearCampfire check
assert(WeatherEngine.isNearCampfire(330, 450, villageCampfire), 'Position (330, 450) is within campfire warmth radius');
assert(!WeatherEngine.isNearCampfire(450, 450, villageCampfire), 'Position (450, 450) is outside campfire warmth radius');

// ============================================================
// 6. Server WorldManager Authoritative Integration
// ============================================================
console.log('\n--- 6. Server WorldManager Authoritative Integration ---');

const world = new WorldManager();

// Verify campfires spawned in world entities
const campfireEntities = Array.from(world.entities.values()).filter(e => e.type === 'campfire');
assert(campfireEntities.length === 4, `WorldManager spawned 4 static campfire entities (actual: ${campfireEntities.length})`);

for (const cf of CAMPFIRES) {
  const spawned = campfireEntities.find(e => e.id === cf.id);
  assert(!!spawned, `World spawned campfire entity '${cf.id}'`);
  assert(spawned?.x === cf.x && spawned?.y === cf.y, `Campfire '${cf.id}' matches definition coords (${cf.x}, ${cf.y})`);
}

// Verify time & weather setters
world.setTimeOfDay(10); // 10:00 AM = 600s
assert(world.getTimeOfDaySec() === 600, `WorldManager setTimeOfDay(10) sets time to 600s (actual: ${world.getTimeOfDaySec()})`);

world.setWeather('storm');
assert(world.getWeather() === 'storm', `WorldManager setWeather('storm') sets weather to 'storm'`);

// Add a test player near village campfire with reduced HP & MP
const testPlayerId = 'test_player_weather';
world.addPlayer(testPlayerId, 'CampfireTraveler', '#0284c7', 0);
const testPlayer = world.players.get(testPlayerId)!;

testPlayer.x = 320;
testPlayer.y = 440; // within 10px of village campfire (320, 448)
testPlayer.health = 10;
testPlayer.maxHealth = 20;
testPlayer.mana = 10;
testPlayer.maxMana = 50;

// Test standing rest tick: +1 HP, +5 MP
let restEventFired = false;
world.onCampfireRest = (playerId, campfireId, hpRestored, mpRestored) => {
  if (playerId === testPlayer.id) {
    restEventFired = true;
    assert(campfireId === 'campfire_village', `Campfire ID matches village hearth`);
    assert(hpRestored === 1, `Standing rest restored 1 HP (actual: ${hpRestored})`);
    assert(mpRestored === 5, `Standing rest restored 5 MP (actual: ${mpRestored})`);
  }
};

// Simulate campfire rest tick
world.tickCampfireResting();
assert(restEventFired, 'world.onCampfireRest event fired for standing player near campfire');
assert(testPlayer.health === 11, `Player health increased from 10 to 11 (actual: ${testPlayer.health})`);
assert(testPlayer.mana === 15, `Player MP increased from 10 to 15 (actual: ${testPlayer.mana})`);

// Now test sitting at campfire: 2x bonus (+2 HP, +10 MP)
world.handleInteract(testPlayer.id, 'campfire_village', 'sit_campfire');
assert(testPlayer.anim === 'sit', 'Player animation is now "sit"');

restEventFired = false;
world.onCampfireRest = (playerId, campfireId, hpRestored, mpRestored) => {
  if (playerId === testPlayer.id) {
    restEventFired = true;
    assert(hpRestored === 2, `Sitting rest restored 2 HP with 2x bonus (actual: ${hpRestored})`);
    assert(mpRestored === 10, `Sitting rest restored 10 MP with 2x bonus (actual: ${mpRestored})`);
  }
};

world.tickCampfireResting();
assert(restEventFired, 'world.onCampfireRest event fired for sitting player');
assert(testPlayer.health === 13, `Player health increased from 11 to 13 (actual: ${testPlayer.health})`);
assert(testPlayer.mana === 25, `Player MP increased from 15 to 25 (actual: ${testPlayer.mana})`);

// Toggle stand up
world.handleInteract(testPlayer.id, 'campfire_village', 'sit_campfire');
assert(testPlayer.anim !== 'sit', 'Player toggled back to standing');

// Move player far away: verify 0 heal
testPlayer.x = 2000;
testPlayer.y = 2000;
restEventFired = false;
world.tickCampfireResting();
assert(!restEventFired, 'Player far away does not receive campfire healing');
assert(testPlayer.health === 13, 'Player health remains unchanged when away from campfire');

console.log(`\n============================================================`);
console.log(`🎉 ALL ${passedTests} / ${totalTests} DAY/NIGHT & WEATHER TESTS PASSED!`);
console.log(`============================================================\n`);

process.exit(0);

