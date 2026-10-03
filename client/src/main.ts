import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { UIManager } from './ui/ui';

import { network } from './network/NetworkClient';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640,
  height: 440,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  backgroundColor: '#1e293b',
  scene: [PreloadScene, WorldScene]
};

const game = new Phaser.Game(config);
const ui = new UIManager();

(window as any).BitQuestGame = game;
(window as any).BitQuestUI = ui;
(window as any).BitQuestNetwork = network;

console.log('🌲 BitQuest Client initialized!');
