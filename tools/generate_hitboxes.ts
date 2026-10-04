/**
 * BitQuest - Sprite Alpha Contour & Hitbox Auto-Generator (Issue #32)
 * Headless CLI script analyzing sprite alpha transparency contours across all animation frames
 * to compute tight footprint colliders (bottom 20%), body hurtboxes, and weapon active hitboxes.
 * Outputs validated metadata to shared/data/generated_hitboxes.json conforming to AnimationMetadataSchema.
 */

import fs from 'fs';
import path from 'path';
import {
  AnimationMetadataSchema,
  BoundingBoxSchema,
  type AnimationMetadata,
  type BoundingBox
} from '../shared/src/schemas';

// ============================================================================
// 1. Headless PixelBuffer (Zero-Dependency RGBA Buffer for Bun CLI)
// ============================================================================
export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly data: Uint8ClampedArray; // RGBA bytes

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  public setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  public getAlpha(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[(y * this.width + x) * 4 + 3];
  }

  public fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number = 255) {
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(this.width, Math.floor(x + w));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(this.height, Math.floor(y + h));

    for (let cy = startY; cy < endY; cy++) {
      for (let cx = startX; cx < endX; cx++) {
        this.setPixel(cx, cy, r, g, b, a);
      }
    }
  }

  public fillCircle(centerX: number, centerY: number, radius: number, r: number, g: number, b: number, a: number = 255) {
    const r2 = radius * radius;
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(this.width, Math.ceil(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(this.height, Math.ceil(centerY + radius));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= r2) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }
}

// ============================================================================
// 2. Alpha Contour Analyzer & Bounding Box Extractor
// ============================================================================

export interface ContourAnalysisOptions {
  frameId: string;
  alphaThreshold?: number;         // Minimum alpha considered solid (default 16)
  footprintPercent?: number;       // Percent of total height for footprint collider (default 0.20)
  isAttackFrame?: boolean;         // True if frame has active weapon swing
  attackDirection?: 'down' | 'up' | 'side';
  damage?: number;                 // Damage assigned to active weapon hitbox
  knockback?: number;              // Knockback assigned to active weapon hitbox
  weaponReach?: number;            // Extra pixel protrusion for weapon hitbox
}

export interface ContourAnalysisResult {
  hasContent: boolean;
  solidPixelCount: number;
  totalBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  footprint: BoundingBox;
  hurtbox: BoundingBox;
  hitbox?: BoundingBox;
  boxes: BoundingBox[];
}

export function analyzeAlphaContour(
  buffer: PixelBuffer,
  options: ContourAnalysisOptions
): ContourAnalysisResult {
  const threshold = options.alphaThreshold ?? 16;
  const W = buffer.width;
  const H = buffer.height;

  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;
  let solidCount = 0;

  // 1. Scan full grid for non-transparent pixels
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const alpha = buffer.getAlpha(x, y);
      if (alpha >= threshold) {
        solidCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Handle empty frame edge case
  if (solidCount === 0) {
    const defaultBox: BoundingBox = {
      id: `${options.frameId}_footprint`,
      type: 'footprint',
      x: 0,
      y: 0,
      width: W,
      height: Math.max(2, Math.round(H * 0.2))
    };
    return {
      hasContent: false,
      solidPixelCount: 0,
      totalBounds: { minX: 0, minY: 0, maxX: W - 1, maxY: H - 1, width: W, height: H },
      footprint: defaultBox,
      hurtbox: { id: `${options.frameId}_hurtbox`, type: 'hurtbox', x: 0, y: 0, width: W, height: H },
      boxes: [defaultBox]
    };
  }

  const charW = maxX - minX + 1;
  const charH = maxY - minY + 1;

  // 2. Compute Footprint Collider (Bottom 20% of character silhouette)
  const fpPercent = options.footprintPercent ?? 0.20;
  const footH = Math.max(2, Math.round(charH * fpPercent));
  const footY = maxY - footH + 1;

  // Scan only the bottom 20% slice to get the precise grounded width
  let footMinX = W;
  let footMaxX = -1;
  for (let y = footY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (buffer.getAlpha(x, y) >= threshold) {
        if (x < footMinX) footMinX = x;
        if (x > footMaxX) footMaxX = x;
      }
    }
  }

  if (footMinX > footMaxX) {
    footMinX = minX;
    footMaxX = maxX;
  }
  const footW = footMaxX - footMinX + 1;

  const footprintBox: BoundingBox = {
    id: `${options.frameId}_footprint`,
    type: 'footprint',
    x: footMinX,
    y: footY,
    width: footW,
    height: footH
  };

  // 3. Compute Body Hurtbox (Main Torso / Vulnerable Area)
  // For attack frames with outward weapon swings, calculate hurtbox without excessive swing wings
  let hurtX = minX;
  let hurtY = minY;
  let hurtW = charW;
  let hurtH = charH;

  if (options.isAttackFrame) {
    const dir = options.attackDirection ?? 'down';
    if (dir === 'down') {
      // Weapon extends down; hurtbox is top 75%
      hurtH = Math.max(4, Math.round(charH * 0.75));
    } else if (dir === 'up') {
      // Weapon extends up; hurtbox is bottom 75%
      const cut = Math.round(charH * 0.25);
      hurtY += cut;
      hurtH = Math.max(4, charH - cut);
    } else if (dir === 'side') {
      // Weapon extends side; hurtbox is opposite 75% width
      hurtW = Math.max(4, Math.round(charW * 0.75));
    }
  }

  const hurtboxBox: BoundingBox = {
    id: `${options.frameId}_hurtbox`,
    type: 'hurtbox',
    x: hurtX,
    y: hurtY,
    width: hurtW,
    height: hurtH
  };

  const boxes: BoundingBox[] = [hurtboxBox, footprintBox];

  // 4. Compute Weapon Active Hitbox (For Attack Frames)
  let hitboxBox: BoundingBox | undefined = undefined;
  if (options.isAttackFrame) {
    const dir = options.attackDirection ?? 'down';
    const reach = options.weaponReach ?? 8;
    const dmg = options.damage ?? 12;
    const kb = options.knockback ?? 8;

    let hitX = minX;
    let hitY = maxY - 4;
    let hitW = charW;
    let hitH = reach;

    if (dir === 'down') {
      hitX = Math.max(0, minX - 2);
      hitY = maxY - 4;
      hitW = Math.min(W - hitX, charW + 4);
      hitH = reach;
    } else if (dir === 'up') {
      hitX = Math.max(0, minX - 2);
      hitY = Math.max(0, minY - reach + 4);
      hitW = Math.min(W - hitX, charW + 4);
      hitH = reach;
    } else if (dir === 'side') {
      hitX = maxX - 4;
      hitY = Math.max(0, minY + 2);
      hitW = reach;
      hitH = Math.max(4, charH - 4);
    }

    hitboxBox = {
      id: `${options.frameId}_hitbox`,
      type: 'hitbox',
      x: hitX,
      y: hitY,
      width: hitW,
      height: hitH,
      damage: dmg,
      knockback: kb
    };

    boxes.unshift(hitboxBox); // Put hitbox first in order
  }

  // Validate all generated bounding boxes against Zod schema
  for (const b of boxes) {
    BoundingBoxSchema.parse(b);
  }

  return {
    hasContent: true,
    solidPixelCount: solidCount,
    totalBounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: charW,
      height: charH
    },
    footprint: footprintBox,
    hurtbox: hurtboxBox,
    hitbox: hitboxBox,
    boxes
  };
}

// ============================================================================
// 3. Procedural Frame Renderers (Generates Canonical Pixel Data)
// ============================================================================

export function renderPlayerWalkFrame(frameIndex: number): PixelBuffer {
  const buf = new PixelBuffer(32, 32);
  const bob = (frameIndex % 2 === 1) ? 1 : 0;

  // Head (center 16, y=6)
  buf.fillCircle(16, 8 + bob, 5, 255, 220, 180); // peach face
  buf.fillRect(11, 4 + bob, 10, 4, 34, 197, 94);  // green cap
  buf.fillRect(13, 2 + bob, 6, 2, 34, 197, 94);   // cap top

  // Torso / Tunic
  buf.fillRect(12, 13 + bob, 8, 9, 56, 189, 248); // azure tunic
  buf.fillRect(11, 16 + bob, 10, 2, 245, 158, 11); // gold belt

  // Legs / Boots
  const legOffset = (frameIndex === 1) ? -2 : (frameIndex === 3) ? 2 : 0;
  buf.fillRect(12 + legOffset, 22, 3, 5, 139, 92, 246); // left leg
  buf.fillRect(17 - legOffset, 22, 3, 5, 139, 92, 246); // right leg
  buf.fillRect(11 + legOffset, 26, 4, 2, 120, 53, 15);   // left boot
  buf.fillRect(17 - legOffset, 26, 4, 2, 120, 53, 15);   // right boot

  return buf;
}

export function renderPlayerSlashFrame(frameIndex: number): PixelBuffer {
  const buf = new PixelBuffer(32, 32);

  // Body
  buf.fillCircle(16, 9, 5, 255, 220, 180);
  buf.fillRect(11, 5, 10, 4, 34, 197, 94);
  buf.fillRect(12, 14, 8, 9, 56, 189, 248);
  buf.fillRect(11, 17, 10, 2, 245, 158, 11);
  buf.fillRect(12, 23, 3, 4, 139, 92, 246);
  buf.fillRect(17, 23, 3, 4, 139, 92, 246);
  buf.fillRect(11, 26, 4, 2, 120, 53, 15);
  buf.fillRect(17, 26, 4, 2, 120, 53, 15);

  // Sword Swing
  if (frameIndex === 0) {
    // Windup sword held high
    buf.fillRect(20, 4, 3, 10, 226, 232, 240); // silver blade
    buf.fillRect(19, 14, 5, 2, 245, 158, 11);  // golden hilt
  } else if (frameIndex === 1 || frameIndex === 2) {
    // Active slash arc downward
    buf.fillRect(6, 21, 20, 4, 248, 250, 252);  // bright steel arc
    buf.fillRect(8, 24, 16, 3, 56, 189, 248);   // magic blue trail
    buf.fillRect(22, 16, 4, 4, 245, 158, 11);   // sword pommel
  } else {
    // Recovery
    buf.fillRect(8, 22, 5, 3, 203, 213, 225);
  }

  return buf;
}

export function renderSlimeFrame(frameIndex: number): PixelBuffer {
  const buf = new PixelBuffer(32, 32);
  const squish = frameIndex === 1 ? 2 : 0;

  // Slime Dome
  buf.fillRect(10 - squish, 18 + squish, 12 + squish * 2, 8 - squish, 56, 189, 248); // blue body
  buf.fillRect(12 - squish, 15 + squish, 8 + squish * 2, 4, 96, 165, 250);
  buf.fillRect(14, 13 + squish, 4, 3, 147, 197, 253); // top point

  // Cute eyes
  buf.fillRect(13 - squish, 18 + squish, 2, 3, 255, 255, 255);
  buf.fillRect(17 + squish, 18 + squish, 2, 3, 255, 255, 255);
  buf.fillRect(14 - squish, 19 + squish, 1, 2, 30, 41, 59);
  buf.fillRect(18 + squish, 19 + squish, 1, 2, 30, 41, 59);

  return buf;
}

export function renderBossGolemFrame(frameIndex: number): PixelBuffer {
  const buf = new PixelBuffer(48, 48);
  const slam = (frameIndex === 2) ? 4 : 0;

  // Huge Spore Mushroom Cap
  buf.fillRect(8, 6 + slam, 32, 14, 239, 68, 68); // Red mushroom cap
  buf.fillRect(12, 4 + slam, 24, 3, 248, 113, 113);
  buf.fillRect(14, 9 + slam, 4, 4, 255, 255, 255); // White spore dots
  buf.fillRect(24, 8 + slam, 5, 5, 255, 255, 255);
  buf.fillRect(32, 11 + slam, 3, 3, 255, 255, 255);

  // Golem Trunk Body
  buf.fillRect(16, 20 + slam, 16, 18, 120, 53, 15); // Bark torso
  buf.fillRect(18, 24 + slam, 3, 3, 250, 204, 21);  // Glowing amber eyes
  buf.fillRect(27, 24 + slam, 3, 3, 250, 204, 21);

  // Massive Stone Fists
  if (frameIndex === 2) {
    // Shockwave ground slam
    buf.fillRect(6, 38, 10, 8, 100, 116, 139);
    buf.fillRect(32, 38, 10, 8, 100, 116, 139);
    buf.fillRect(2, 42, 44, 4, 251, 191, 36); // shockwave sparks
  } else {
    buf.fillRect(10, 26, 6, 8, 100, 116, 139);
    buf.fillRect(32, 26, 6, 8, 100, 116, 139);
  }

  // Stumpy legs
  buf.fillRect(18, 38, 4, 6, 80, 40, 10);
  buf.fillRect(26, 38, 4, 6, 80, 40, 10);

  return buf;
}

export function renderPotFrame(): PixelBuffer {
  const buf = new PixelBuffer(16, 16);
  // Clay Pot
  buf.fillRect(4, 5, 8, 8, 217, 119, 6);   // Warm terracotta clay
  buf.fillRect(5, 3, 6, 2, 245, 158, 11);  // Rim
  buf.fillRect(3, 7, 10, 5, 180, 83, 9);   // Belly bulge
  buf.fillRect(5, 13, 6, 2, 146, 64, 14);  // Base
  return buf;
}

// ============================================================================
// 4. Batch Pipeline Execution
// ============================================================================

export interface GeneratedMetadataCatalog {
  generatedAt: number;
  totalAnimations: number;
  totalFrames: number;
  animations: Record<string, AnimationMetadata>;
}

export function runHitboxAutoGeneration(): GeneratedMetadataCatalog {
  console.log('--- Scanning sprite alpha contours and computing bounding boxes ---');

  const catalog: Record<string, AnimationMetadata> = {};

  // 1. Player Walk Down
  {
    const animId = 'player_walk_down';
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buffer = renderPlayerWalkFrame(f);
      const res = analyzeAlphaContour(buffer, {
        frameId: `${animId}_f${f}`,
        footprintPercent: 0.20
      });
      frames.push({
        frameIndex: f,
        durationMs: 150,
        boxes: res.boxes,
        audioCues: f === 1 || f === 3 ? [{ soundId: 'step', volume: 0.8 }] : [],
        particleCues: []
      });
    }
    const meta: AnimationMetadata = {
      id: animId,
      targetId: 'player',
      action: 'walk',
      direction: 'down',
      fps: 8,
      loop: true,
      frameWidth: 32,
      frameHeight: 32,
      totalFrames: 4,
      frames
    };
    AnimationMetadataSchema.parse(meta);
    catalog[animId] = meta;
  }

  // 2. Player Slash Down (Attack)
  {
    const animId = 'player_slash_down';
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const isAttack = (f === 1 || f === 2);
      const buffer = renderPlayerSlashFrame(f);
      const res = analyzeAlphaContour(buffer, {
        frameId: `${animId}_f${f}`,
        isAttackFrame: isAttack,
        attackDirection: 'down',
        damage: 15,
        knockback: 10,
        weaponReach: 10
      });
      frames.push({
        frameIndex: f,
        durationMs: 80,
        boxes: res.boxes,
        audioCues: f === 1 ? [{ soundId: 'slash', volume: 1.0 }] : [],
        particleCues: f === 1 ? [{ particleType: 'slash_spark', count: 5 }] : []
      });
    }
    const meta: AnimationMetadata = {
      id: animId,
      targetId: 'player',
      action: 'slash',
      direction: 'down',
      fps: 10,
      loop: false,
      frameWidth: 32,
      frameHeight: 32,
      totalFrames: 4,
      frames
    };
    AnimationMetadataSchema.parse(meta);
    catalog[animId] = meta;
  }

  // 3. Enemy Slime Jump
  {
    const animId = 'slime_jump_attack';
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const isAttack = (f === 2);
      const buffer = renderSlimeFrame(f);
      const res = analyzeAlphaContour(buffer, {
        frameId: `${animId}_f${f}`,
        isAttackFrame: isAttack,
        attackDirection: 'down',
        damage: 6,
        knockback: 6,
        footprintPercent: 0.25
      });
      frames.push({
        frameIndex: f,
        durationMs: 120,
        boxes: res.boxes,
        audioCues: f === 2 ? [{ soundId: 'hit', volume: 0.9 }] : [],
        particleCues: []
      });
    }
    const meta: AnimationMetadata = {
      id: animId,
      targetId: 'enemy_slime',
      action: 'jump_attack',
      direction: 'down',
      fps: 8,
      loop: false,
      frameWidth: 32,
      frameHeight: 32,
      totalFrames: 4,
      frames
    };
    AnimationMetadataSchema.parse(meta);
    catalog[animId] = meta;
  }

  // 4. Boss Spore Golem Slam
  {
    const animId = 'boss_spore_slam';
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const isAttack = (f === 2);
      const buffer = renderBossGolemFrame(f);
      const res = analyzeAlphaContour(buffer, {
        frameId: `${animId}_f${f}`,
        isAttackFrame: isAttack,
        attackDirection: 'down',
        damage: 30,
        knockback: 18,
        weaponReach: 12,
        footprintPercent: 0.18
      });
      frames.push({
        frameIndex: f,
        durationMs: 200,
        boxes: res.boxes,
        audioCues: f === 2 ? [{ soundId: 'boss_stomp', volume: 1.0 }] : [],
        particleCues: f === 2 ? [{ particleType: 'pot_dust', count: 12 }] : []
      });
    }
    const meta: AnimationMetadata = {
      id: animId,
      targetId: 'boss_golem',
      action: 'spore_slam',
      direction: 'down',
      fps: 6,
      loop: false,
      frameWidth: 48,
      frameHeight: 48,
      totalFrames: 4,
      frames
    };
    AnimationMetadataSchema.parse(meta);
    catalog[animId] = meta;
  }

  // 5. Prop Clay Pot
  {
    const animId = 'prop_pot_idle';
    const buffer = renderPotFrame();
    const res = analyzeAlphaContour(buffer, {
      frameId: `${animId}_f0`,
      footprintPercent: 0.25
    });
    const meta: AnimationMetadata = {
      id: animId,
      targetId: 'prop_pot',
      action: 'idle',
      direction: 'down',
      fps: 1,
      loop: true,
      frameWidth: 16,
      frameHeight: 16,
      totalFrames: 1,
      frames: [{
        frameIndex: 0,
        durationMs: 1000,
        boxes: res.boxes,
        audioCues: [],
        particleCues: []
      }]
    };
    AnimationMetadataSchema.parse(meta);
    catalog[animId] = meta;
  }

  const animList = Object.keys(catalog);
  let totalFrames = 0;
  for (const k of animList) {
    totalFrames += catalog[k].totalFrames;
  }

  const outPayload: GeneratedMetadataCatalog = {
    generatedAt: Date.now(),
    totalAnimations: animList.length,
    totalFrames,
    animations: catalog
  };

  // Write to shared/data/generated_hitboxes.json
  const outPath = path.resolve(import.meta.dir, '../shared/data/generated_hitboxes.json');
  fs.writeFileSync(outPath, JSON.stringify(outPayload, null, 2), 'utf-8');
  console.log(`✓ Wrote ${animList.length} animation metadata definitions (${totalFrames} frames) to ${outPath}`);

  return outPayload;
}

// Execute when invoked directly
if (import.meta.main) {
  try {
    const result = runHitboxAutoGeneration();
    console.log(`\nHitbox Auto-Generation Completed Successfully!`);
    console.log(`Total Animations: ${result.totalAnimations}`);
    console.log(`Total Frames: ${result.totalFrames}`);
  } catch (err) {
    console.error('Hitbox generation failed:', err);
    process.exit(1);
  }
}
