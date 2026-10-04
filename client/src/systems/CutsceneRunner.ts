/**
 * BitQuest - Runtime Cutscene Execution Engine (Milestone 9.2)
 *
 * Orchestrates:
 * 1. Camera interpolation and multi-point cinematic panning.
 * 2. Actor movement, facing, animation changes, and overhead emote bubbles.
 * 3. In-game dialogue and subtitle banner presentation.
 * 4. Audio triggers (SFX, secret jingles, ambient stings).
 * 5. Screen transitions (Letterbox cinema bars, fades, flashes).
 * 6. Player input locking and graceful skip support (Esc / Action key).
 */

import type { WorldScene } from '../scenes/WorldScene';
import { sounds } from '../audio/SoundManager';
import type {
  CutsceneSequence,
  CameraKeyframe,
  ActorTrack,
  DialogueKeyframe,
  AudioKeyframe,
  ScreenEffectKeyframe
} from '../../../shared/src/schemas';

export class CutsceneRunner {
  private scene: WorldScene;
  private currentSequence: CutsceneSequence | null = null;
  private isRunning: boolean = false;
  private timerEvents: Phaser.Time.TimerEvent[] = [];
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private onCompleteCallback?: () => void;
  private letterboxTop?: Phaser.GameObjects.Rectangle;
  private letterboxBottom?: Phaser.GameObjects.Rectangle;
  private screenFadeOverlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: WorldScene) {
    this.scene = scene;
  }

  public isCutsceneRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentSequence(): CutsceneSequence | null {
    return this.currentSequence;
  }

  /**
   * Plays a CutsceneSequence definition inside the live Phaser game.
   */
  public play(sequence: CutsceneSequence, onComplete?: () => void): void {
    if (this.isRunning) {
      this.skip();
    }

    this.isRunning = true;
    this.currentSequence = sequence;
    this.onCompleteCallback = onComplete;
    this.timerEvents = [];
    this.activeTweens = [];

    // 1. Lock player movement input
    if ((this.scene as any).localPlayer) {
      (this.scene as any).isCinematicPanning = true;
    }

    // 2. Stop camera follow
    if (this.scene.cameras?.main) {
      this.scene.cameras.main.stopFollow();
    }

    // 3. Schedule Camera Keyframes
    this.scheduleCameraTrack(sequence.cameraTrack);

    // 4. Schedule Actor Tracks
    this.scheduleActorTracks(sequence.actors);

    // 5. Schedule Audio Cues
    this.scheduleAudioTrack(sequence.audioTrack);

    // 6. Schedule Dialogue Cues
    this.scheduleDialogueTrack(sequence.dialogueTrack);

    // 7. Schedule Screen Effects (Letterbox & Fades)
    this.scheduleScreenEffects(sequence.screenTrack);

    // 8. Schedule End of Sequence
    if (this.scene.time?.delayedCall) {
      const endEvent = this.scene.time.delayedCall(sequence.durationMs, () => {
        this.finish();
      });
      this.timerEvents.push(endEvent);
    }
  }

  /**
   * Skips the currently running cutscene, jumping directly to the finished state.
   */
  public skip(): void {
    if (!this.isRunning) return;
    this.finish();
  }

  private finish(): void {
    this.isRunning = false;

    // Clear all pending timers
    this.timerEvents.forEach(t => t.remove(false));
    this.timerEvents = [];

    // Stop active tweens
    this.activeTweens.forEach(tw => tw.stop());
    this.activeTweens = [];

    // Clean up screen overlays
    this.letterboxTop?.destroy();
    this.letterboxTop = undefined;
    this.letterboxBottom?.destroy();
    this.letterboxBottom = undefined;
    this.screenFadeOverlay?.destroy();
    this.screenFadeOverlay = undefined;

    // Restore camera follow to player
    const localPlayer = (this.scene as any).localPlayer;
    if (this.scene.cameras?.main && localPlayer) {
      this.scene.cameras.main.startFollow(
        localPlayer,
        true,
        0.12,
        0.12,
        -(this.scene as any).camOffsetX || 0,
        -(this.scene as any).camOffsetY || 0
      );
      this.scene.cameras.main.setZoom(1.0);
    }

    // Unlock player input
    if (localPlayer) {
      (this.scene as any).isCinematicPanning = false;
    }

    const cb = this.onCompleteCallback;
    this.onCompleteCallback = undefined;
    this.currentSequence = null;
    cb?.();
  }

  // -------------------------------------------------------------------------
  // Track Schedulers
  // -------------------------------------------------------------------------
  private scheduleCameraTrack(keyframes: CameraKeyframe[]): void {
    if (!keyframes || keyframes.length === 0 || !this.scene.cameras?.main || !this.scene.tweens) return;
    const cam = this.scene.cameras.main;

    for (let i = 0; i < keyframes.length - 1; i++) {
      const curr = keyframes[i];
      const next = keyframes[i + 1];
      const duration = next.timeMs - curr.timeMs;
      if (duration <= 0) continue;

      const timer = this.scene.time.delayedCall(curr.timeMs, () => {
        const camWidth = cam.width / (next.zoom || 1);
        const camHeight = cam.height / (next.zoom || 1);

        const tw = this.scene.tweens.add({
          targets: cam,
          scrollX: next.x - camWidth / 2,
          scrollY: next.y - camHeight / 2,
          zoom: next.zoom || 1,
          duration,
          ease: next.ease === 'linear' ? 'Linear' : 'Quad.easeInOut',
          onStart: () => {
            if (next.shakeIntensity && next.shakeIntensity > 0) {
              (this.scene as any).triggerCameraShake?.(duration, next.shakeIntensity);
            }
          }
        });
        this.activeTweens.push(tw);
      });
      this.timerEvents.push(timer);
    }
  }

  private scheduleActorTracks(actors: ActorTrack[]): void {
    if (!actors || !this.scene.tweens) return;

    for (const actor of actors) {
      // Find actor entity sprite in scene
      let sprite: any = null;
      if (actor.actorId === 'hero') {
        sprite = (this.scene as any).localPlayer;
      } else {
        sprite = (this.scene as any).entityObjects?.get(actor.actorId) ||
                 (this.scene as any).npcObjects?.get(actor.actorId);
      }

      if (!sprite) continue;

      for (let i = 0; i < actor.keyframes.length - 1; i++) {
        const curr = actor.keyframes[i];
        const next = actor.keyframes[i + 1];
        const duration = next.timeMs - curr.timeMs;
        if (duration <= 0) continue;

        const timer = this.scene.time.delayedCall(curr.timeMs, () => {
          // Trigger emote if specified
          if (curr.emote && curr.emote !== 'none') {
            (this.scene as any).showOverheadEmote?.(sprite, curr.emote);
          }

          const tw = this.scene.tweens.add({
            targets: sprite,
            x: next.x,
            y: next.y,
            alpha: next.alpha !== undefined ? next.alpha : 1,
            duration,
            ease: 'Linear'
          });
          this.activeTweens.push(tw);
        });
        this.timerEvents.push(timer);
      }
    }
  }

  private scheduleAudioTrack(audioKeys: AudioKeyframe[]): void {
    if (!audioKeys || !this.scene.time) return;

    for (const audio of audioKeys) {
      const timer = this.scene.time.delayedCall(audio.timeMs, () => {
        if (audio.soundKey === 'secret_jingle') {
          sounds.playSecretJingle();
        } else if (audio.soundKey === 'stone_rumble' || audio.soundKey === 'shadow_roar') {
          sounds.playCustom(110, 0.4, 0.05, 0.3, 'sawtooth');
        } else if (audio.soundKey === 'wing_flutter') {
          sounds.playCustom(440, 0.15, 0.02, 0.1, 'sine');
        } else if (audio.soundKey === 'pelican_squawk') {
          sounds.playCustom(320, 0.2, 0.04, 0.15, 'triangle');
        }
      });
      this.timerEvents.push(timer);
    }
  }

  private scheduleDialogueTrack(dialogueKeys: DialogueKeyframe[]): void {
    if (!dialogueKeys || !this.scene.time) return;

    for (const d of dialogueKeys) {
      const timer = this.scene.time.delayedCall(d.timeMs, () => {
        // Render subtitle dialogue overlay in-game
        if ((this.scene as any).uiManager?.showSubtitle) {
          (this.scene as any).uiManager.showSubtitle(d.speaker, d.text, d.durationMs);
        }
      });
      this.timerEvents.push(timer);
    }
  }

  private scheduleScreenEffects(effects: ScreenEffectKeyframe[]): void {
    if (!effects || !this.scene.time || !this.scene.add) return;

    for (const fx of effects) {
      const timer = this.scene.time.delayedCall(fx.timeMs, () => {
        if (fx.effect === 'letterbox_in') {
          this.createLetterbox(fx.durationMs, true);
        } else if (fx.effect === 'letterbox_out') {
          this.createLetterbox(fx.durationMs, false);
        } else if (fx.effect === 'flash') {
          this.scene.cameras.main?.flash(fx.durationMs, 250, 204, 21);
        } else if (fx.effect === 'fade_in') {
          this.scene.cameras.main?.fadeIn(fx.durationMs);
        } else if (fx.effect === 'fade_out') {
          this.scene.cameras.main?.fadeOut(fx.durationMs);
        }
      });
      this.timerEvents.push(timer);
    }
  }

  private createLetterbox(duration: number, isIn: boolean): void {
    const cam = this.scene.cameras.main;
    if (!cam) return;

    const barHeight = cam.height * 0.12;

    if (!this.letterboxTop) {
      this.letterboxTop = this.scene.add.rectangle(cam.width / 2, -barHeight / 2, cam.width, barHeight, 0x000000);
      this.letterboxTop.setScrollFactor(0);
      this.letterboxTop.setDepth(9999);

      this.letterboxBottom = this.scene.add.rectangle(
        cam.width / 2,
        cam.height + barHeight / 2,
        cam.width,
        barHeight,
        0x000000
      );
      this.letterboxBottom.setScrollFactor(0);
      this.letterboxBottom.setDepth(9999);
    }

    const targetTopY = isIn ? barHeight / 2 : -barHeight / 2;
    const targetBottomY = isIn ? cam.height - barHeight / 2 : cam.height + barHeight / 2;

    this.scene.tweens.add({
      targets: this.letterboxTop,
      y: targetTopY,
      duration,
      ease: 'Quad.easeInOut'
    });

    this.scene.tweens.add({
      targets: this.letterboxBottom,
      y: targetBottomY,
      duration,
      ease: 'Quad.easeInOut'
    });
  }
}
