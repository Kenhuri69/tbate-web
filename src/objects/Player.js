/**
 * PLAYER
 *
 * Encapsule le sprite physique, l'aura, la progression Mana Core et les stats.
 *
 * API publique :
 *   player.sprite         → Phaser.Physics.Arcade.Sprite
 *   player.mana           → ManaCoreSystem
 *   player.lastMoveAngle  → angle de déplacement courant (pour cast mobile)
 *   player.update(time)
 *
 * Mouvement :
 *   - Clavier ZQSD / WASD / Flèches (desktop)
 *   - Joystick virtuel via scene.mobileControls (mobile)
 *   - Vitesse calculée depuis stats.moveSpeed (AGI influence)
 *
 * TODO : ajouter des animations (idle, run, cast) via spritesheet.
 * TODO : connecter stats.takeDamage() aux attaques ennemies.
 *
 * Dépend de (globals) : Aura, ManaCoreSystem, Phaser
 */
class Player {

    /**
     * @param {Phaser.Scene}  scene
     * @param {number}        x
     * @param {number}        y
     * @param {StatsSystem}   stats
     */
    constructor(scene, x, y, stats) {
        this.scene = scene;
        this.stats = stats;

        /** Dernier angle de déplacement en radians (utilisé pour le cast mobile). */
        this.lastMoveAngle = 0;

        this.sprite = scene.physics.add.sprite(x, y, 'player')
            .setDepth(10)
            .setCollideWorldBounds(true);

        this.aura = new Aura(scene, this.sprite);
        this.mana = new ManaCoreSystem(scene);
        this._keys = this._setupControls();

        scene.events.on('manacore:levelup', this._showLevelUpText,   this);
        scene.events.on('player:levelup',   this._showPlayerLevelUp, this);
    }

    /** @param {number} time */
    update(time) {
        this._handleMovement();
        this.aura.update(time);
    }

    destroy() {
        this.aura.destroy();
        this.scene.events.off('manacore:levelup', this._showLevelUpText,   this);
        this.scene.events.off('player:levelup',   this._showPlayerLevelUp, this);
    }

    // ----------------------------------------------------------------
    // Contrôles
    // ----------------------------------------------------------------

    _setupControls() {
        const kb = this.scene.input.keyboard;
        const KC = Phaser.Input.Keyboard.KeyCodes;
        return {
            up    : kb.addKey(KC.Z),
            left  : kb.addKey(KC.Q),
            down  : kb.addKey(KC.S),
            right : kb.addKey(KC.D),
            upW   : kb.addKey(KC.W),
            leftA : kb.addKey(KC.A),
            arrows: kb.createCursorKeys(),
        };
    }

    _handleMovement() {
        const SPEED = this.stats ? this.stats.moveSpeed : 160;
        const k     = this._keys;
        const mc    = this.scene.mobileControls;
        let vx      = 0;
        let vy      = 0;

        // — Joystick mobile (prioritaire si actif) —
        if (mc?.isActive) {
            vx = mc.vector.x * SPEED;
            vy = mc.vector.y * SPEED;
        } else {
            // — Clavier —
            if (k.up.isDown    || k.upW.isDown    || k.arrows.up.isDown)    vy = -SPEED;
            if (k.down.isDown  ||                    k.arrows.down.isDown)   vy =  SPEED;
            if (k.left.isDown  || k.leftA.isDown  || k.arrows.left.isDown)  vx = -SPEED;
            if (k.right.isDown ||                    k.arrows.right.isDown)  vx =  SPEED;

            // Normalisation diagonale uniquement pour le clavier
            if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
        }

        this.sprite.setVelocity(vx, vy);

        // Mémorise la direction pour le cast mobile
        if (vx !== 0 || vy !== 0) this.lastMoveAngle = Math.atan2(vy, vx);

        if (vx < 0)      this.sprite.setFlipX(true);
        else if (vx > 0) this.sprite.setFlipX(false);
    }

    // ----------------------------------------------------------------
    // Effets visuels
    // ----------------------------------------------------------------

    _showLevelUpText(core) {
        this._floatText(
            `✦ MANA CORE ${core.name.toUpperCase()} ✦`,
            core.hex, 16,
        );
    }

    _showPlayerLevelUp(level) {
        this._floatText(`▲ Niveau ${level} !`, '#ffdd44', 14);
    }

    _floatText(msg, color, size) {
        const t = this.scene.add.text(
            this.sprite.x, this.sprite.y - 40, msg,
            { fontFamily: 'monospace', fontSize: `${size}px`,
              color, stroke: '#000000', strokeThickness: 3 },
        ).setDepth(200).setOrigin(0.5);

        this.scene.tweens.add({
            targets: t, y: t.y - 70, alpha: 0, duration: 2200, ease: 'Power2',
            onComplete: () => t.destroy(),
        });
    }
}
