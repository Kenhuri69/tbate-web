/**
 * POINT D'ENTRÉE
 *
 * Dimensions adaptatives selon l'orientation de l'écran :
 *   - Paysage (desktop / mobile horizontal) : 1280 × 720
 *   - Portrait (mobile vertical)            : 720 × 1280
 *
 * Phaser.Scale.RESIZE permet à la scène de se redimensionner dynamiquement
 * quand le joueur fait pivoter son téléphone, sans recharger la page.
 */

/** Retourne { width, height } selon l'orientation courante. */
function getGameDimensions() {
    const sw = window.screen.width  || window.innerWidth;
    const sh = window.screen.height || window.innerHeight;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
        // Portrait : largeur = petite dimension, hauteur = grande dimension
        return { width: Math.min(sw, sh), height: Math.max(sw, sh) };
    }
    // Paysage : 16:9 classique
    return { width: Math.max(sw, sh), height: Math.min(sw, sh) };
}

const dims = getGameDimensions();

const config = {
    type  : Phaser.AUTO,
    width : dims.width,
    height: dims.height,
    scale : {
        mode      : Phaser.Scale.RESIZE,   // s'adapte dynamiquement à l'écran
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