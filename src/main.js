/**
 * POINT D'ENTRÉE
 *
 * Configure Phaser et lance le jeu.
 * activePointers: 3 active le support multi-touch (joystick + boutons simultanés).
 *
 * TODO : ajouter Scale.Manager pour le responsive (resize / fullscreen).
 * TODO : ajouter BootScene + PreloadScene avant GameScene.
 */

const config = {
    type  : Phaser.AUTO,
    width : 1280,
    height: 720,
    input : {
        activePointers: 3, // multi-touch : joystick + 2 boutons simultanés
    },
    physics: {
        default: 'arcade',
        arcade : {
            gravity: { y: 0 },
            debug  : false,
        },
    },
    scene: [GameScene],
};

new Phaser.Game(config);
