/**
 * POINT D'ENTRÉE
 *
 * Configure Phaser et lance le jeu.
 * activePointers: 3 active le support multi-touch (joystick + boutons simultanés).
 * Scale.FIT : adapte le canvas à l'écran tout en conservant le ratio 16:9.
 *   → Les coordonnées Phaser restent en 1280×720 indépendamment de la taille CSS.
 *   → Les zones interactives (boutons, joystick) sont correctement mappées sur mobile.
 */

const config = {
    type  : Phaser.AUTO,
    width : 1280,
    height: 720,

    // ── Responsive / Mobile ──────────────────────────────────────────
    // FIT  : réduit ou agrandit le canvas pour tenir dans la fenêtre
    //        sans déformer. Phaser corrige automatiquement le mapping
    //        des événements pointeur (touch / mouse) → coordonnées jeu.
    scale : {
        mode      : Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

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
