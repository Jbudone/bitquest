import { AdaptiveMusicDirector } from './AdaptiveMusicDirector';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private envFilter: BiquadFilterNode | null = null;
  private musicDirector: AdaptiveMusicDirector | null = null;
  private masterVol = 0.8;
  private sfxVol = 0.8;
  private bgmVol = 0.6;
  private heartbeatActive = false;
  private heartbeatInterval: any = null;
  private lastWaterLapTime = 0;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Environmental Low-Pass Biquad Filter (cavern acoustics)
      this.envFilter = this.ctx.createBiquadFilter();
      this.envFilter.type = 'lowpass';
      this.envFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.envFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
      this.envFilter.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.envFilter);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
      this.bgmGain.connect(this.envFilter);

      this.musicDirector = new AdaptiveMusicDirector(this.ctx, this.bgmGain);
    }
    this.initialized = true;
  }

  public ensureContext() {
    if (!this.initialized) {
      this.init();
    }
  }

  public get soundDestination(): AudioNode {
    return this.sfxGain || this.ctx!.destination;
  }

  public setMasterVolume(v: number) {
    this.masterVol = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(v: number) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  public setBgmVolume(v: number) {
    this.bgmVol = Math.max(0, Math.min(1, v));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number { return this.masterVol; }
  public getSfxVolume(): number { return this.sfxVol; }
  public getBgmVolume(): number { return this.bgmVol; }

  public setEnvironmentalLowPass(cutoffHz: number, rampMs = 350) {
    if (!this.envFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(300, Math.min(20000, cutoffHz));
    this.envFilter.frequency.cancelScheduledValues(now);
    this.envFilter.frequency.exponentialRampToValueAtTime(clamped, now + rampMs / 1000);
  }

  public duckBgm(duckAmountDb = -5, durationMs = 450) {
    if (!this.bgmGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const current = this.bgmVol;
    const ducked = current * Math.pow(10, duckAmountDb / 20);

    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(ducked, now);
    this.bgmGain.gain.exponentialRampToValueAtTime(Math.max(0.001, current), now + durationMs / 1000);
  }

  public transitionBgm(biomeId: string, crossfadeSec = 2.0) {
    this.ensureContext();
    if (this.musicDirector) {
      this.musicDirector.transition(biomeId, crossfadeSec);
    }
  }

  public stopBgm() {
    this.musicDirector?.stop();
  }

  public updateHealthHeartbeat(currentHp: number, maxHp: number) {
    const isCritical = currentHp <= 1 && currentHp > 0;
    if (isCritical && !this.heartbeatActive) {
      this.heartbeatActive = true;
      this.playHeartbeatThud();
      this.heartbeatInterval = setInterval(() => {
        if (this.heartbeatActive) this.playHeartbeatThud();
      }, 880);
    } else if (!isCritical && this.heartbeatActive) {
      this.heartbeatActive = false;
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public playHeartbeatThud() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass sine thud 1 (lub)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(65, now);
    osc1.frequency.exponentialRampToValueAtTime(35, now + 0.14);
    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(this.soundDestination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Sub-bass sine thud 2 (dub) after 160ms
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(55, now + 0.16);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.32);
    gain2.gain.setValueAtTime(0.35, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(this.soundDestination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.32);
  }

  public updateAmbientRiver(listenerX: number, listenerY: number) {
    // Azure river is around X = 1680 (tileX: 52)
    const now = Date.now();
    if (now - this.lastWaterLapTime < 2400) return;

    const riverX = 1680;
    const riverY = listenerY; // river flows north-south across entire height
    const dist = Math.abs(listenerX - riverX);

    if (dist < 420) {
      this.lastWaterLapTime = now;
      this.playSpatialWaterLap(riverX, riverY, listenerX, listenerY, 420);
    }
  }

  public playSpatialWaterLap(emitterX: number, emitterY: number, listenerX: number, listenerY: number, maxDist = 420) {
    this.ensureContext();
    if (!this.ctx) return;

    const dx = emitterX - listenerX;
    const dist = Math.hypot(dx, emitterY - listenerY);
    const falloff = Math.max(0, 1 - dist / maxDist);
    const pan = Math.max(-1, Math.min(1, dx / 220));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(falloff * 0.18, this.ctx.currentTime);

    if ((this.ctx as any).createStereoPanner) {
      const panner = (this.ctx as any).createStereoPanner();
      panner.pan.setValueAtTime(pan, this.ctx.currentTime);
      gain.connect(panner);
      panner.connect(this.soundDestination);
    } else {
      gain.connect(this.soundDestination);
    }

    // Gentle filtered water splash
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.4);
    filter.Q.value = 4.0;

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
  }

  /**
   * Surface-Reactive Footstep Audio:
   * Dynamic procedural synthesis for 5 distinct terrain types with organic pitch micro-jitter.
   */
  public playFootstep(surface: 'grass' | 'dirt' | 'stone' | 'wood' | 'water' = 'grass') {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    if (surface === 'grass') {
      // Soft rustle (filtered pink/white noise with quick soft decay)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520 * pitchJitter, now);
      filter.Q.value = 3.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.soundDestination);
      noise.start(now);
    } else if (surface === 'dirt') {
      // Earthy muffled thud + granular scrape
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

      gain.gain.setValueAtTime(0.12 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (surface === 'stone') {
      // Crisp click-clack with high transient
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(980 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

      gain.gain.setValueAtTime(0.09 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (surface === 'wood') {
      // Warm hollow tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

      gain.gain.setValueAtTime(0.11 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (surface === 'water') {
      // Wet slosh / squelch chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480 * pitchJitter, now);
      osc.frequency.linearRampToValueAtTime(780 * pitchJitter, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);

      gain.gain.setValueAtTime(0.12 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  }

  public playBiomeChime() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 987.77];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.001, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.12 * this.sfxVol, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.65);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.65);
    });
  }

  public playLullabyWake() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chords = [261.63, 329.63, 392.00, 523.25];
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      gain.gain.setValueAtTime(0.001, now + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.14 * this.sfxVol, now + idx * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.85);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.85);
    });
  }

  public playSlash() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // White noise swoosh with bandpass filter
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.soundDestination);

    whiteNoise.start(now);
  }

  public playBushCut() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPotLift() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPotShatter() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Crunch noise + low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSwitchClick() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.setValueAtTime(480, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSecretJingle() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Classic 8-note rising discovery fanfare
    const notes = [784, 740, 622, 440, 415, 659, 831, 1046];
    const duration = 0.11;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const startTime = now + idx * duration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(this.soundDestination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  public playDialogueBlip(speaker: string, mood?: string, pitchModifier: number = 1.0) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const lower = speaker.toLowerCase();

    let oscType: OscillatorType = 'sine';
    let baseFreq = 380;
    let duration = 0.042;
    let gainVal = 0.11 * this.sfxVol;
    let pitchGlide = false;

    if (lower.includes('grandma') || lower.includes('bramble')) {
      oscType = 'triangle';
      baseFreq = 320;
      duration = 0.048;
      gainVal = 0.10 * this.sfxVol;
    } else if (lower.includes('rooster') || lower.includes('reginald') || lower.includes('cluck')) {
      oscType = 'square';
      baseFreq = 660;
      duration = 0.034;
      gainVal = 0.07 * this.sfxVol;
    } else if (lower.includes('pelican') || lower.includes('barnaby')) {
      oscType = 'sawtooth';
      baseFreq = 215;
      duration = 0.045;
      gainVal = 0.09 * this.sfxVol;
    } else if (lower.includes('baron') || lower.includes('truffle')) {
      oscType = 'sawtooth';
      baseFreq = 138;
      duration = 0.052;
      gainVal = 0.12 * this.sfxVol;
    } else if (lower.includes('dog') || lower.includes('buster') || lower.includes('pup')) {
      oscType = 'sine';
      baseFreq = 620;
      pitchGlide = true;
      duration = 0.038;
      gainVal = 0.11 * this.sfxVol;
    } else if (lower.includes('sign') || lower.includes('slab') || lower.includes('board')) {
      oscType = 'triangle';
      baseFreq = 220;
      duration = 0.028;
      gainVal = 0.08 * this.sfxVol;
    }

    let moodMult = 1.0;
    if (mood === 'surprised') moodMult = 1.28;
    else if (mood === 'happy') moodMult = 1.14;
    else if (mood === 'smug') moodMult = 0.90;

    const jitter = (Math.random() * 24 - 12);
    const finalFreq = Math.max(80, (baseFreq * moodMult * pitchModifier) + jitter);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(finalFreq, now);
    if (pitchGlide) {
      osc.frequency.exponentialRampToValueAtTime(finalFreq * 1.25, now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + duration);
  }

  public playMechanicalClunk() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Stage 1: Deep stone plate floor thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.09);
    gain1.gain.setValueAtTime(0.25 * this.sfxVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(this.soundDestination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Stage 2: Heavy iron latch lock clunk
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(420, now + 0.025);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.075);
    gain2.gain.setValueAtTime(0.18 * this.sfxVol, now + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc2.connect(gain2);
    gain2.connect(this.soundDestination);
    osc2.start(now + 0.025);
    osc2.stop(now + 0.075);
  }

  public playStoneScrape() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Noise buffer grating friction
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.20 * this.sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.soundDestination);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  public playEmoteSound(emote?: string) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (emote === 'heart') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.14 * this.sfxVol, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(this.soundDestination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.35);
      });
    } else if (emote === 'laugh') {
      const notes = [659.25, 783.99, 880.00];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.12 * this.sfxVol, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
        osc.connect(gain);
        gain.connect(this.soundDestination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.12);
      });
    } else if (emote === 'question') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.14 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (emote === 'exclamation') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, now); // C6 ping
      gain.gain.setValueAtTime(0.18 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Default / Wave / Music buoyant double chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.06); // A5
      gain.gain.setValueAtTime(0.15 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  public playCoin() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playStrawberry() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(554.37, now + 0.06); // C#5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playRoll() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.soundDestination);

    src.start(now);
  }

  public playHit() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playEnemyHit() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.25 * this.sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playCritStrike() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heavy punchy bass thump + crisp metallic harmonic crack
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(140, now);
    bass.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    bassGain.gain.setValueAtTime(0.4 * this.sfxVol, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    bass.connect(bassGain);
    bassGain.connect(this.soundDestination);
    bass.start(now);
    bass.stop(now + 0.18);

    const crack = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(880, now);
    crack.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    crackGain.gain.setValueAtTime(0.3 * this.sfxVol, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    crack.connect(crackGain);
    crackGain.connect(this.soundDestination);
    crack.start(now);
    crack.stop(now + 0.12);
  }

  public playStunBonk() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Woody hollow bonk + twang
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    osc.frequency.linearRampToValueAtTime(150, now + 0.16);
    gain.gain.setValueAtTime(0.35 * this.sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.soundDestination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playTelegraphHum() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.45);
    gain.gain.setValueAtTime(0.08 * this.sfxVol, now);
    gain.gain.linearRampToValueAtTime(0.18 * this.sfxVol, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.soundDestination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playBossStomp() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playBossRoar() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playVictory() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Grand heroic 5-chord fanfare: C4, G4, C5, E5, G5
    const notes = [261.63, 392.00, 523.25, 659.25, 783.99];
    const delays = [0, 0.12, 0.24, 0.36, 0.52];
    const durations = [0.11, 0.11, 0.11, 0.15, 0.6];

    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const t = now + delays[i];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + durations[i]);

      osc.connect(gain);
      gain.connect(this.soundDestination);

      osc.start(t);
      osc.stop(t + durations[i]);
    });
  }

  /**
   * Procedural Sound Synthesizer:
   * Generates micro-chiptune sounds on demand with customizable wave type, frequency slide, and envelope.
   */
  public playCustom(spec: {
    frequency?: number;
    targetFrequency?: number;
    duration?: number;
    type?: OscillatorType | 'noise';
    volume?: number;
    attack?: number;
  }) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const freq = spec.frequency ?? 440;
    const targetFreq = spec.targetFrequency ?? freq;
    const dur = spec.duration ?? 0.15;
    const vol = spec.volume ?? 0.25;
    const waveType = spec.type ?? 'square';
    const attack = spec.attack ?? 0.01;

    if (waveType === 'noise') {
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(50, targetFreq), now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.soundDestination);
      source.start(now);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, now);
    if (targetFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq), now + dur);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + dur);
  }

  public playPotCatch() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
    gain.gain.setValueAtTime(0.3 * this.sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.soundDestination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playSocialResonance() {
    this.ensureContext();
    if (!this.ctx) return;
    const freqs = [659.25, 830.61, 987.77, 1318.51];
    freqs.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + 0.55);
    });
  }

  public playLever() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Quick metallic click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);
    gain.gain.setValueAtTime(0.25 * this.sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.soundDestination);
    osc.start(now);
    osc.stop(now + 0.08);

    // Spring latch thud
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(340, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain2.gain.setValueAtTime(0.2 * this.sfxVol, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc2.connect(gain2);
    gain2.connect(this.soundDestination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.14);
  }

  public playDuoSolveFanfare() {
    this.ensureContext();
    if (!this.ctx) return;
    const notes = [
      { freq: 523.25, time: 0, dur: 0.12 },     // C5
      { freq: 659.25, time: 0.11, dur: 0.12 },  // E5
      { freq: 783.99, time: 0.22, dur: 0.12 },  // G5
      { freq: 1046.50, time: 0.33, dur: 0.45 }  // C6
    ];
    notes.forEach(n => {
      const now = this.ctx!.currentTime + n.time;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now);
      gain.gain.setValueAtTime(0.25 * this.sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.dur);
      osc.connect(gain);
      gain.connect(this.soundDestination);
      osc.start(now);
      osc.stop(now + n.dur);
    });
  }

  /**
   * Sound Preset Trigger:
   * Instant trigger for common chiptune sound archetypes.
   */
  public playPreset(key: string) {
    switch (key) {
      case 'slash':
        this.playSlash();
        break;
      case 'coin':
      case 'pickup':
        this.playCoin();
        break;
      case 'hit':
        this.playEnemyHurt();
        break;
      case 'hurt':
        this.playPlayerHurt();
        break;
      case 'chest':
        this.playChestOpen();
        break;
      case 'victory':
      case 'fanfare':
        this.playVictory();
        break;
      case 'jump':
      case 'roll':
        this.playRoll();
        break;
      case 'blip':
      case 'click':
        this.playCustom({ frequency: 800, targetFrequency: 1200, duration: 0.05, type: 'triangle', volume: 0.15 });
        break;
      case 'magic':
        this.playCustom({ frequency: 600, targetFrequency: 1800, duration: 0.35, type: 'sine', volume: 0.2 });
        break;
      case 'explosion':
        this.playCustom({ frequency: 300, targetFrequency: 40, duration: 0.4, type: 'noise', volume: 0.35 });
        break;
      default:
        this.playCustom({ frequency: 440, targetFrequency: 880, duration: 0.1, type: 'triangle', volume: 0.15 });
        break;
    }
  }
}

export const sounds = new SoundManager();

