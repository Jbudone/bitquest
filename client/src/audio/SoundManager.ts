export class SoundManager {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private envFilter: BiquadFilterNode | null = null;
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

  public playDialogueBlip(speaker: string) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    let baseFreq = 380;
    if (speaker.includes('pelican') || speaker.includes('rooster')) baseFreq = 540;
    if (speaker.includes('grandma')) baseFreq = 320;
    if (speaker.includes('dog')) baseFreq = 620;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const pitch = baseFreq + (Math.random() * 60 - 30);
    osc.frequency.setValueAtTime(pitch, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playEmoteSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now); // C5
    osc.frequency.setValueAtTime(784, now + 0.06); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.2);
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

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.soundDestination);

    osc.start(now);
    osc.stop(now + 0.08);
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

