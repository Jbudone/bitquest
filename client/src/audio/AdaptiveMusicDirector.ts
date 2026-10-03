/**
 * BitQuest Adaptive Chiptune Music Director
 * Sample-accurate Web Audio procedural multi-track BGM engine.
 * Generates acoustic chiptune melodies, plucked harp tones, and atmospheric soundscapes
 * with seamless equal-power crossfades between biomes.
 */

export type BiomeMusicType = 'oakhaven_town' | 'fungal_hollow' | 'whispering_meadow' | 'ancient_ruins' | 'crystal_lake';

interface NoteEvent {
  note: number; // frequency in Hz
  duration: number; // in seconds
  gain?: number;
  type?: OscillatorType;
  plucked?: boolean;
}

export class AdaptiveMusicDirector {
  private ctx: AudioContext;
  private masterOutput: GainNode;
  private currentBiome: BiomeMusicType | null = null;
  private isRunning = false;
  private schedulerTimer: any = null;

  // Biome track gains for crossfading
  private biomeGains = new Map<BiomeMusicType, GainNode>();
  private activeBiomes = new Set<BiomeMusicType>();

  // Clock tracking per biome
  private nextNoteTimes = new Map<BiomeMusicType, number>();
  private stepIndices = new Map<BiomeMusicType, number>();

  constructor(ctx: AudioContext, destination: GainNode) {
    this.ctx = ctx;
    this.masterOutput = destination;

    const biomes: BiomeMusicType[] = [
      'oakhaven_town',
      'fungal_hollow',
      'whispering_meadow',
      'ancient_ruins',
      'crystal_lake'
    ];

    biomes.forEach(b => {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.connect(this.masterOutput);
      this.biomeGains.set(b, g);
      this.nextNoteTimes.set(b, 0);
      this.stepIndices.set(b, 0);
    });
  }

  public transition(targetBiome: string, crossfadeSec = 2.0) {
    let normalized: BiomeMusicType = 'whispering_meadow';
    if (targetBiome.includes('town') || targetBiome.includes('oakhaven')) normalized = 'oakhaven_town';
    else if (targetBiome.includes('fungal') || targetBiome.includes('hollow')) normalized = 'fungal_hollow';
    else if (targetBiome.includes('ruin') || targetBiome.includes('ancient') || targetBiome.includes('sanctuary')) normalized = 'ancient_ruins';
    else if (targetBiome.includes('lake') || targetBiome.includes('water') || targetBiome.includes('pier')) normalized = 'crystal_lake';
    else normalized = 'whispering_meadow';

    if (this.currentBiome === normalized && this.isRunning) return;

    const prevBiome = this.currentBiome;
    this.currentBiome = normalized;

    if (!this.isRunning) {
      this.start();
    }

    const now = this.ctx.currentTime;

    // Fade out previous biome
    if (prevBiome && prevBiome !== normalized) {
      const prevGain = this.biomeGains.get(prevBiome);
      if (prevGain) {
        prevGain.gain.cancelScheduledValues(now);
        prevGain.gain.setValueAtTime(Math.max(0.0001, prevGain.gain.value), now);
        prevGain.gain.exponentialRampToValueAtTime(0.0001, now + crossfadeSec);
        setTimeout(() => {
          if (this.currentBiome !== prevBiome) {
            this.activeBiomes.delete(prevBiome);
          }
        }, crossfadeSec * 1000 + 100);
      }
    }

    // Fade in new biome
    const targetGain = this.biomeGains.get(normalized);
    if (targetGain) {
      this.activeBiomes.add(normalized);
      this.nextNoteTimes.set(normalized, now + 0.1);
      targetGain.gain.cancelScheduledValues(now);
      targetGain.gain.setValueAtTime(Math.max(0.0001, targetGain.gain.value), now);
      targetGain.gain.exponentialRampToValueAtTime(0.18, now + crossfadeSec);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.schedulerTimer = setInterval(() => this.schedule(), 40);
  }

  public stop() {
    this.isRunning = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    const now = this.ctx.currentTime;
    for (const g of this.biomeGains.values()) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(0.0001, now);
    }
    this.activeBiomes.clear();
  }

  private schedule() {
    const lookAheadSec = 0.15;
    const now = this.ctx.currentTime;

    for (const biome of this.activeBiomes) {
      let nextTime = this.nextNoteTimes.get(biome) || now;
      while (nextTime < now + lookAheadSec) {
        const step = this.stepIndices.get(biome) || 0;
        const duration = this.playBiomeStep(biome, step, nextTime);
        nextTime += duration;
        this.stepIndices.set(biome, step + 1);
        this.nextNoteTimes.set(biome, nextTime);
      }
    }
  }

  private playBiomeStep(biome: BiomeMusicType, step: number, time: number): number {
    const output = this.biomeGains.get(biome);
    if (!output) return 0.25;

    switch (biome) {
      case 'oakhaven_town':
        return this.playTownStep(output, step, time);
      case 'fungal_hollow':
        return this.playFungalStep(output, step, time);
      case 'whispering_meadow':
        return this.playMeadowStep(output, step, time);
      case 'ancient_ruins':
        return this.playRuinsStep(output, step, time);
      case 'crystal_lake':
        return this.playLakeStep(output, step, time);
    }
  }

  // 1. Oakhaven Town Plaza: Gentle acoustic village melody in C Major (106 BPM)
  private playTownStep(out: GainNode, step: number, time: number): number {
    const stepDuration = 0.28; // ~107 BPM 8th notes
    const melodyPattern = [
      523.25, 659.25, 783.99, 1046.5,  // C5, E5, G5, C6
      880.0, 783.99, 659.25, 523.25,   // A5, G5, E5, C5
      587.33, 659.25, 783.99, 880.0,   // D5, E5, G5, A5
      783.99, 659.25, 587.33, 523.25,  // G5, E5, D5, C5
      659.25, 783.99, 880.0, 1046.5,   // E5, G5, A5, C6
      987.77, 880.0, 783.99, 659.25,   // B5, A5, G5, E5
      698.46, 783.99, 880.0, 987.77,   // F5, G5, A5, B5
      1046.5, 0, 783.99, 523.25         // C6, rest, G5, C5
    ];

    const bassPattern = [
      130.81, 0, 196.0, 0, // C3, rest, G3, rest
      220.0, 0, 174.61, 0, // A3, rest, F3, rest
      146.83, 0, 196.0, 0, // D3, rest, G3, rest
      196.0, 0, 130.81, 0  // G3, rest, C3, rest
    ];

    const mIdx = step % melodyPattern.length;
    const bIdx = step % bassPattern.length;

    const melFreq = melodyPattern[mIdx]!;
    if (melFreq > 0) {
      // Warm acoustic triangle flute lead
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melFreq, time);
      // Gentle vibrato on longer notes
      if (mIdx % 4 === 3) {
        osc.frequency.linearRampToValueAtTime(melFreq * 1.01, time + stepDuration * 0.7);
      }
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.14, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.95);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + stepDuration);
    }

    // Walking acoustic bass
    const bassFreq = bassPattern[bIdx]!;
    if (bassFreq > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bassFreq, time);
      bGain.gain.setValueAtTime(0.18, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.4);
      bOsc.connect(bGain);
      bGain.connect(out);
      bOsc.start(time);
      bOsc.stop(time + stepDuration * 1.4);
    }

    return stepDuration;
  }

  // 2. Fungal Hollow: Mysterious plucked harp tones in A minor / Dorian mode
  private playFungalStep(out: GainNode, step: number, time: number): number {
    const stepDuration = 0.38; // ~79 BPM, spacious and enchanting
    const harpNotes = [
      440.0, 523.25, 659.25, 880.0,  // A4, C5, E5, A5
      493.88, 587.33, 739.99, 987.77, // B4, D5, F#5, B5 (Dorian shimmer)
      523.25, 659.25, 783.99, 1046.5, // C5, E5, G5, C6
      440.0, 659.25, 523.25, 329.63   // A4, E5, C5, E4
    ];

    const idx = step % harpNotes.length;
    const freq = harpNotes[idx]!;

    // Plucked harp physical model approximation (sine + high decaying harmonic)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.995, time + stepDuration);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.2);

    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + stepDuration * 1.2);

    // Ethereal crystal ping on downbeats
    if (idx === 0 || idx === 8) {
      const ping = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(1318.5, time); // E6
      pGain.gain.setValueAtTime(0.08, time);
      pGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 2);
      ping.connect(pGain);
      pGain.connect(out);
      ping.start(time);
      ping.stop(time + stepDuration * 2);
    }

    return stepDuration;
  }

  // 3. Whispering Meadow: Breezy pastoral adventure in F Major
  private playMeadowStep(out: GainNode, step: number, time: number): number {
    const stepDuration = 0.26; // ~115 BPM
    const meadowMelody = [
      349.23, 440.0, 523.25, 587.33,  // F4, A4, C5, D5
      523.25, 440.0, 392.0, 349.23,   // C5, A4, G4, F4
      440.0, 523.25, 587.33, 698.46,  // A4, C5, D5, F5
      659.25, 587.33, 523.25, 440.0   // E5, D5, C5, A4
    ];

    const idx = step % meadowMelody.length;
    const freq = meadowMelody[idx]!;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);

    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + stepDuration);

    // Warm rounded acoustic root on measure beats
    if (idx % 4 === 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(freq / 2, time);
      bGain.gain.setValueAtTime(0.16, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 2);
      bOsc.connect(bGain);
      bGain.connect(out);
      bOsc.start(time);
      bOsc.stop(time + stepDuration * 2);
    }

    return stepDuration;
  }

  // 4. Ancient Sunken Ruins: Solemn organ drone & echoing catacomb bells
  private playRuinsStep(out: GainNode, step: number, time: number): number {
    const stepDuration = 0.44; // ~68 BPM, slow & atmospheric
    const notes = [
      146.83, 220.0, 293.66, 349.23, // D3, A3, D4, F4
      293.66, 220.0, 174.61, 146.83, // D4, A3, F3, D3
      130.81, 196.0, 261.63, 311.13  // C3, G3, C4, Eb4
    ];

    const idx = step % notes.length;
    const freq = notes[idx]!;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.5);

    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + stepDuration * 1.5);

    return stepDuration;
  }

  // 5. Crystal Lake & Pier: Shimmering water drops & pentatonic glass harp
  private playLakeStep(out: GainNode, step: number, time: number): number {
    const stepDuration = 0.32; // ~94 BPM
    const pentatonic = [
      329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0
    ];
    // Gentle floating arpeggios
    const idx = (step * 3) % pentatonic.length;
    const freq = pentatonic[idx]!;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.1);

    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + stepDuration * 1.1);

    return stepDuration;
  }
}
