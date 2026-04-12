/**
 * GAME SCENE
 *
 * Scène principale : orchestre la map, le joueur et le HUD.
 *
 * Responsabilités :
 *   1. Générer les textures procédurales (TextureGenerator)
 *   2. Construire la tilemap de donjon
 *   3. Instancier Player et HUD
 *   4. Configurer la caméra
 *   5. Déléguer la boucle à player.update()
 *
 * TODO : séparer en BootScene (assets) + PreloadScene + GameScene (gameplay).
 * TODO : remplacer la tilemap par un générateur BSP ou Wave Function Collapse.
 * TODO : retirer le timer de demo XP — le connecter aux combats (Étape 2).
 */

import { TextureGenerator } from '../generators/TextureGenerator.js';
import { Player }           from '../objects/Player.js';
import { HUD }              from '../ui/HUD.js';

// — Dimensions de la map en tuiles et en pixels —
const MAP_COLS  = 50;
const MAP_ROWS  = 30;
const TILE_SIZE = 32;

export class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
    }

    // ----------------------------------------------------------------
    // Phaser lifecycle
    // ----------------------------------------------------------------

    preload() {
        // Rien à charger : toutes les textures sont générées dans create().
    }

    create() {
        // 1. Textures procédurales
        const texGen = new TextureGenerator(this);
        texGen.createTileTexture();
        texGen.createWallTexture();
        texGen.createPlayerTexture();
        texGen.createEnemyTexture();

        // 2. Tilemap
        this._buildMap();

        // 3. Joueur (centré sur la map)
        const startX = (MAP_COLS * TILE_SIZE) / 2;
        const startY = (MAP_ROWS * TILE_SIZE) / 2;
        this.player = new Player(this, startX, startY);

        // 4. HUD
        this.hud = new HUD(this);

        // 5. Caméra
        this._setupCamera();

        // 6. [DEMO] Gain d'XP automatique toutes les 3 s pour tester l'aura
        //    TODO : SUPPRIMER — connecter aux mécaniques de combat (Étape 2)
        this.time.addEvent({
            delay   : 3000,
            callback: () => this.player.mana.gainExperience(50),
            loop    : true,
        });
    }

    update(time) {
        this.player.update(time);
    }

    // ----------------------------------------------------------------
    // Construction de la map
    // ----------------------------------------------------------------

    /**
     * Remplit la grille : murs sur le périmètre, sol à l'intérieur.
     * Les limites physiques du monde correspondent exactement à la map.
     */
    _buildMap() {
        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLS; col++) {
                const isWall = (
                    row === 0 || row === MAP_ROWS - 1 ||
                    col === 0 || col === MAP_COLS - 1
                );
                this.add.image(
                    col * TILE_SIZE + TILE_SIZE / 2,
                    row * TILE_SIZE + TILE_SIZE / 2,
                    isWall ? 'wall' : 'tile'
                ).setDepth(0);
            }
        }

        // Limites physiques = limites de la map (empêche le joueur de sortir)
        this.physics.world.setBounds(
            0, 0,
            MAP_COLS * TILE_SIZE,
            MAP_ROWS * TILE_SIZE
        );
    }

    // ----------------------------------------------------------------
    // Caméra
    // ----------------------------------------------------------------

    /**
     * Caméra qui suit le joueur avec un lerp doux, zoom pixel-art 1.5×.
     * TODO : ajouter screen shake sur dégâts (camera.shake).
     * TODO : ajouter lerp adaptatif selon la vitesse du joueur.
     */
    _setupCamera() {
        this.cameras.main
            .setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE)
            .startFollow(this.player.sprite, true, 0.1, 0.1)
            .setZoom(1.5)
            .setBackgroundColor('#000000');
    }
}
