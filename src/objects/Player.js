/**
 * PLAYER
 *
 * Encapsule le sprite physique du joueur, son déplacement et son aura.
 *
 * API publique :
 *   player.sprite   → Phaser.Physics.Arcade.Sprite  (pour la caméra, collisions…)
 *   player.mana     → ManaCoreSystem                 (pour gainExperience)
 *   player.update(time)                              → à appeler dans GameScene.update()
 *
 * TODO : ajouter des animations (idle, run, cast) via spritesheet.
 * TODO : ajouter des stats (HP, mana pool, vitesse configurable depuis JSON).
 * TODO : connecter les sorts (Étape 2 — currentSpellIndex, cooldowns).
 */

import { Aura }           from './Aura.js';
import { ManaCoreSystem } from '../systems/ManaCoreSystem.js';

const MOVE_SPEED = 160; // px / s

export class Player {

    /**
     * @param {Phaser.Scene} scene
     * @param {number}       x  - Position X de départ
     * @param {number}       y  - Position Y de départ
     */
    constructor(scene, x, y) {
        this.scene = scene;

        // — Sprite physique —
        this.sprite = scene.physics.add.sprite(x, y, 'player')
            .setDepth(10)
            .setCollideWorldBounds(true);

        // — Aura Mana Core (cercles + particules) —
        this.aura = new Aura(scene, this.sprite);

        // — Système de progression du Mana Core —
        this.mana = new ManaCoreSystem(scene);

        // — Contrôles clavier —
        this._keys = this._setupControls();

        // — Texte flottant au level-up —
        scene.events.on('manacore:levelup', this._showLevelUpText, this);
    }

    /**
     * Boucle principale du joueur.
     * @param {number} time - Temps courant en ms (depuis Phaser)
     */
    update(time) {
        this._handleMovement();
        this.aura.update(time);
    }

    destroy() {
        this.aura.destroy();
        this.scene.events.off('manacore:levelup', this._showLevelUpText, this);
    }

    // ----------------------------------------------------------------
    // Contrôles
    // ----------------------------------------------------------------

    /**
     * Enregistre ZQSD (AZERTY) + WASD (QWERTY) + Flèches.
     * TODO : rendre configurable via un fichier JSON de keybindings.
     */
    _setupControls() {
        const kb = this.scene.input.keyboard;
        const KC = Phaser.Input.Keyboard.KeyCodes;
        return {
            up    : kb.addKey(KC.Z),
            left  : kb.addKey(KC.Q),
            down  : kb.addKey(KC.S),
            right : kb.addKey(KC.D),
            upW   : kb.addKey(KC.W),    // QWERTY bonus
            leftA : kb.addKey(KC.A),
            arrows: kb.createCursorKeys(),
        };
    }

    /**
     * Applique la vélocité arcade et gère le flip horizontal.
     * La diagonale est normalisée pour éviter la vitesse × √2.
     */
    _handleMovement() {
        const k = this._keys;
        let vx  = 0;
        let vy  = 0;

        if (k.up.isDown    || k.upW.isDown    || k.arrows.up.isDown)    vy = -MOVE_SPEED;
        if (k.down.isDown  ||                    k.arrows.down.isDown)   vy =  MOVE_SPEED;
        if (k.left.isDown  || k.leftA.isDown  || k.arrows.left.isDown)  vx = -MOVE_SPEED;
        if (k.right.isDown ||                    k.arrows.right.isDown)  vx =  MOVE_SPEED;

        // Normalisation diagonale : √2 / 2 ≈ 0.707
        if (vx !== 0 && vy !== 0) {
            vx *= Math.SQRT1_2;
            vy *= Math.SQRT1_2;
        }

        this.sprite.setVelocity(vx, vy);

        // Flip horizontal selon la direction (le sprite regarde à droite par défaut)
        if (vx < 0)       this.sprite.setFlipX(true);
        else if (vx > 0)  this.sprite.setFlipX(false);
    }

    // ----------------------------------------------------------------
    // Effets visuels
    // ----------------------------------------------------------------

    /**
     * Affiche un texte animé au-dessus du joueur lors d'un level-up.
     * @param {{ name: string, hex: string }} core
     */
    _showLevelUpText(core) {
        const text = this.scene.add.text(
            this.sprite.x,
            this.sprite.y - 40,
            `✦ MANA CORE ${core.name.toUpperCase()} ✦`,
            {
                fontFamily     : 'monospace',
                fontSize       : '16px',
                color          : core.hex,
                stroke         : '#000000',
                strokeThickness: 3,
            }
        ).setDepth(200).setOrigin(0.5);

        this.scene.tweens.add({
            targets   : text,
            y         : this.sprite.y - 110,
            alpha     : 0,
            duration  : 2200,
            ease      : 'Power2',
            onComplete: () => text.destroy(),
        });
    }
}
