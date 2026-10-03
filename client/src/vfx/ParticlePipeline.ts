import type Phaser from 'phaser';

export const POOL_SIZE = 600;

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

export enum ParticleKind {
  CUSTOM = 0,
  DANDELION = 1,
  SPORE = 2,
  POLLEN = 3,
  RUINS_MOTE = 4,
  SHARD = 5,
  LEAF = 6,
  SPARKLE = 7
}

export class ParticlePipeline {
  private scene: Phaser.Scene;
  private images: Phaser.GameObjects.Image[] = [];

  // Typed Arrays for zero-allocation state tracking
  public posX = new Float32Array(POOL_SIZE);
  public posY = new Float32Array(POOL_SIZE);
  public velX = new Float32Array(POOL_SIZE);
  public velY = new Float32Array(POOL_SIZE);
  public life = new Float32Array(POOL_SIZE);
  public maxLife = new Float32Array(POOL_SIZE);
  public baseScale = new Float32Array(POOL_SIZE);
  public baseAlpha = new Float32Array(POOL_SIZE);
  public rot = new Float32Array(POOL_SIZE);
  public rotSpeed = new Float32Array(POOL_SIZE);
  public swayAmp = new Float32Array(POOL_SIZE);
  public swayFreq = new Float32Array(POOL_SIZE);
  public swayPhase = new Float32Array(POOL_SIZE);
  public kind = new Uint8Array(POOL_SIZE);

  // Free list and active list for O(1) alloc/free without GC
  private freeList = new Int16Array(POOL_SIZE);
  private freeCount = POOL_SIZE;
  private activeIndices = new Int16Array(POOL_SIZE);
  private activeCount = 0;

  // Ambient spawn timer
  private ambientAccumulator = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Pre-allocate all 600 images once at scene startup
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, 'particle_dust');
      img.setVisible(false);
      img.setActive(false);
      img.setDepth(1500); // Above ground tiles and shadows, beneath UI
      this.images[i] = img;
      this.freeList[i] = i;
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public spawn(
    kind: ParticleKind,
    textureKey: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    lifeMs: number,
    scale = 1.0,
    alpha = 1.0,
    rotSpeed = 0,
    swayAmp = 0,
    swayFreq = 0
  ): number {
    if (this.freeCount <= 0) return -1;

    // Pop from free list
    this.freeCount--;
    const idx = this.freeList[this.freeCount];

    this.posX[idx] = x;
    this.posY[idx] = y;
    this.velX[idx] = vx;
    this.velY[idx] = vy;
    this.life[idx] = lifeMs;
    this.maxLife[idx] = lifeMs;
    this.baseScale[idx] = scale;
    this.baseAlpha[idx] = alpha;
    this.rot[idx] = Math.random() * Math.PI * 2;
    this.rotSpeed[idx] = rotSpeed;
    this.swayAmp[idx] = swayAmp;
    this.swayFreq[idx] = swayFreq;
    this.swayPhase[idx] = Math.random() * Math.PI * 2;
    this.kind[idx] = kind;

    const img = this.images[idx];
    img.setTexture(textureKey);
    img.setPosition(x, y);
    img.setScale(scale);
    img.setAlpha(alpha);
    img.setRotation(this.rot[idx]);
    img.setVisible(true);
    img.setActive(true);

    // Push into active list
    this.activeIndices[this.activeCount] = idx;
    this.activeCount++;

    return idx;
  }

  public update(delta: number, camera: Phaser.Cameras.Scene2D.Camera, currentBiome: string) {
    const dt = delta / 1000;
    const nowSec = this.scene.time.now / 1000;

    // 1. Update all active particles in-place
    let i = 0;
    while (i < this.activeCount) {
      const idx = this.activeIndices[i];
      this.life[idx] -= delta;

      if (this.life[idx] <= 0) {
        // Despawn and recycle into free list
        this.despawnAt(i, idx);
        continue;
      }

      const progress = this.life[idx] / this.maxLife[idx]; // 1.0 -> 0.0

      // Calculate sway & velocity
      let sway = 0;
      if (this.swayAmp[idx] > 0) {
        sway = Math.sin(nowSec * this.swayFreq[idx] + this.swayPhase[idx]) * this.swayAmp[idx];
      }

      this.posX[idx] += (this.velX[idx] + sway) * dt;
      this.posY[idx] += this.velY[idx] * dt;
      this.rot[idx] += this.rotSpeed[idx] * dt;

      // Gentle fade & scale dynamics based on particle kind
      let currentAlpha = this.baseAlpha[idx];
      let currentScale = this.baseScale[idx];

      if (this.kind[idx] === ParticleKind.DANDELION) {
        // Soft floating fade
        currentAlpha = this.baseAlpha[idx] * Math.min(1, progress * 1.5);
      } else if (this.kind[idx] === ParticleKind.SPORE) {
        // Bioluminescent pulsing glow
        const pulse = 0.7 + Math.sin(nowSec * 4 + this.swayPhase[idx]) * 0.3;
        currentAlpha = this.baseAlpha[idx] * progress * pulse;
      } else if (this.kind[idx] === ParticleKind.POLLEN || this.kind[idx] === ParticleKind.RUINS_MOTE) {
        currentAlpha = this.baseAlpha[idx] * Math.sin(progress * Math.PI);
      } else {
        // Burst shards / leaves / sparks
        currentAlpha = this.baseAlpha[idx] * progress;
        currentScale = this.baseScale[idx] * (0.4 + progress * 0.6);
      }

      const img = this.images[idx];
      img.setPosition(this.posX[idx], this.posY[idx]);
      img.setRotation(this.rot[idx]);
      img.setScale(currentScale);
      img.setAlpha(currentAlpha);

      i++;
    }

    // 2. Ambient Biome Particle Spawner
    this.ambientAccumulator += delta;
    if (this.ambientAccumulator >= 120) {
      this.ambientAccumulator = 0;
      this.spawnAmbientBiomeParticles(camera, currentBiome);
    }
  }

  private despawnAt(activeIndex: number, poolIndex: number) {
    // Hide image
    const img = this.images[poolIndex];
    img.setVisible(false);
    img.setActive(false);

    // Return to free list
    this.freeList[this.freeCount] = poolIndex;
    this.freeCount++;

    // Swap-and-pop active index
    this.activeCount--;
    if (activeIndex < this.activeCount) {
      this.activeIndices[activeIndex] = this.activeIndices[this.activeCount];
    }
  }

  private spawnAmbientBiomeParticles(camera: Phaser.Cameras.Scene2D.Camera, biome: string) {
    if (this.freeCount < 50) return; // Reserve pool for bursts

    const view = camera.worldView;
    const margin = 48;
    const minX = view.x - margin;
    const maxX = view.x + view.width + margin;
    const minY = view.y - margin;
    const maxY = view.y + view.height + margin;

    // Whispering Meadow: Dandelion seeds drifting on gentle wind
    if (biome === 'whispering_meadow') {
      const rx = randInt(minX, maxX);
      const ry = randInt(minY, minY + 60);
      this.spawn(
        ParticleKind.DANDELION,
        'particle_dandelion',
        rx,
        ry,
        randFloat(-26, -16), // Westward breeze
        randFloat(8, 18),    // Gentle downward descent
        randInt(4500, 7500),
        randFloat(0.7, 1.1),
        0.85,
        randFloat(-0.5, 0.5),
        randFloat(12, 22),   // Sinusoidal sway
        randFloat(1.5, 2.5)
      );
    }

    // Fungal Hollow: Glowing bioluminescent spores floating upwards
    else if (biome === 'fungal_hollow') {
      const rx = randInt(minX, maxX);
      const ry = randInt(maxY - 60, maxY);
      this.spawn(
        ParticleKind.SPORE,
        'particle_spore_mote',
        rx,
        ry,
        randFloat(-6, 6),
        randFloat(-22, -12), // Rising spores
        randInt(4000, 6500),
        randFloat(0.8, 1.3),
        0.9,
        0,
        randFloat(8, 16),
        randFloat(2.0, 3.5)
      );
    }

    // Oakhaven Town: Sunny pollen motes
    else if (biome === 'oakhaven_town') {
      const rx = randInt(minX, maxX);
      const ry = randInt(minY, maxY);
      this.spawn(
        ParticleKind.POLLEN,
        'particle_pollen',
        rx,
        ry,
        randFloat(-8, 8),
        randFloat(-4, 6),
        randInt(3000, 5000),
        randFloat(0.7, 1.1),
        0.75,
        0,
        randFloat(6, 12),
        randFloat(1.2, 2.0)
      );
    }

    // Ancient Ruins: Ethereal lavender sanctuary motes
    else if (biome === 'ancient_ruins') {
      const rx = randInt(minX, maxX);
      const ry = randInt(minY, maxY);
      this.spawn(
        ParticleKind.RUINS_MOTE,
        'particle_ruins_mote',
        rx,
        ry,
        randFloat(-5, 5),
        randFloat(-8, 8),
        randInt(3500, 6000),
        randFloat(0.8, 1.2),
        0.8,
        randFloat(-0.8, 0.8),
        randFloat(8, 14),
        randFloat(1.0, 2.0)
      );
    }
  }

  // Zero-Allocation Event Burst Emitters
  public emitPotShards(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = randFloat(40, 110);
      this.spawn(
        ParticleKind.SHARD,
        'particle_shard',
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        randInt(260, 420),
        randFloat(0.7, 1.2),
        0.95,
        randFloat(-6, 6)
      );
    }
  }

  public emitLeaves(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = randFloat(30, 85);
      const tex = Math.random() < 0.5 ? 'particle_leaf' : 'particle_leaf_autumn';
      this.spawn(
        ParticleKind.LEAF,
        tex,
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 20, // initial upward lift
        randInt(350, 550),
        randFloat(0.7, 1.1),
        0.9,
        randFloat(-4, 4),
        randFloat(6, 12),
        2.5
      );
    }
  }

  public emitSparks(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = randFloat(45, 120);
      this.spawn(
        ParticleKind.CUSTOM,
        'impact_spark',
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        randInt(180, 320),
        randFloat(0.6, 1.0),
        1.0
      );
    }
  }

  public emitSparkles(x: number, y: number, count = 8, texture = 'particle_sparkle_gold') {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const spd = randFloat(35, 75);
      this.spawn(
        ParticleKind.SPARKLE,
        texture,
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        randInt(320, 520),
        randFloat(0.6, 1.0),
        0.95
      );
    }
  }
}
