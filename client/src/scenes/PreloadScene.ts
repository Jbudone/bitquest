import Phaser from 'phaser';
import { TextureGenerator } from '../art/TextureGenerator';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Generate all procedural 16-bit pixel assets
    TextureGenerator.generateAll(this);
  }

  create() {
    // Register animations for each player palette (5 color styles)
    for (let pal = 0; pal < 5; pal++) {
      ['down', 'up', 'left', 'right'].forEach(dir => {
        // Walk animation
        this.anims.create({
          key: `player_${pal}_walk_${dir}`,
          frames: [
            { key: `player_${pal}_${dir}_walk1` },
            { key: `player_${pal}_${dir}_idle` },
            { key: `player_${pal}_${dir}_walk2` },
            { key: `player_${pal}_${dir}_idle` }
          ],
          frameRate: 8,
          repeat: -1
        });

        // Idle animation
        this.anims.create({
          key: `player_${pal}_idle_${dir}`,
          frames: [{ key: `player_${pal}_${dir}_idle` }],
          frameRate: 1,
          repeat: 0
        });
      });
    }

    // Launch the main world
    this.scene.start('WorldScene');
  }
}
