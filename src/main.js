/**
 * POINT D'ENTRÉE
 *
 * Configure Phaser et lance le jeu.
 * activePointers: 3 active le support multi-touch (joystick + boutons simultanés).
 * Scale.ENVELOP : remplit tout l'écran mobile, Phaser corrige le mapping touch.
 */

const config = {
    type  : Phaser.AUTO,
    width : 1280,
    height: 720,
    scale : {
        mode      : Phaser.Scale.FIT,   // remplit l'écran, rogne si nécessaire
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input : {
        activePointers: 3,
    },
    physics: {
        default: 'arcade',
        arcade : {
            gravity: { y: 0 },
            debug  : false,
        },
    },
    scene: [GameScene, DialogueScene],
};

new Phaser.Game(config);