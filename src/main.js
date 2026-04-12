/**
 * POINT D'ENTRÉE
 *
 * Configure Phaser et lance le jeu.
 * Phaser est disponible en global (chargé via CDN dans index.html).
 *
 * TODO : ajouter Scale.Manager pour le responsive (resize / fullscreen).
 * TODO : ajouter BootScene + PreloadScene avant GameScene.
 */

import { GameScene } from './scenes/GameScene.js';

const config = {
    type  : Phaser.AUTO,
    width : 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade : {
            gravity: { y: 0 }, // Vue top-down : aucune gravité
            debug  : false,     // Passer à true pour visualiser les hitboxes
        },
    },
    scene: [GameScene],
};

new Phaser.Game(config);
