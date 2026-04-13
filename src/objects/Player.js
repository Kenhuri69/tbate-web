/**
 * PLAYER
 *
 * Encapsule le sprite physique, l'aura et le système de progression.
 *
 * API publique :
 *   player.sprite   → Phaser.Physics.Arcade.Sprite
 *   player.mana     → ManaCoreSystem  (gainExperience)
 *   player.update(time)
 *
 * TODO : ajouter des animations (idle, run, cast) via spritesheet.
 * TODO : ajouter HP, barre de vie, invincibilité temporaire.
 * TODO : brancher les sorts (SpellSystem) en Étape 3.
 *
 * Dépend de (globals) : Aura, ManaCoreSystem, Phaser
 */
class Player {

    /**
     * @param {Phaser.Scene} scene
     * @param {number}       x
     * @param {number}       y
     */
    constructor(scene, x, y) {
        this.scene = scene;

        this.sprite = scene.physics.add.sprite(x, y, 'player')
            .setDepth(10)
            .setCollideWorldBounds(true);

        this.aura = new Aura(scene, this.sprite);
        this.mana = new ManaCoreSystem(scene);
        this._keys = this._setupControls();

        scene.events.on('manacore:levelup', this._showLevelUpText, this);
    }

    /** @param {number} time - ms depuis Phaser */
    update(time) {
        this._handleMovement();
        this.aura.update(time);
    }

    destroy() {
        this.aura.destroy();
        this.scene.events.off('manacore:levelup', this._showLevelUpText, this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    /** ZQSD (AZERTY) + WASD (QWERTY) + Flèches. */
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

    /** Déplacement avec normalisation diagonale. */
    _handleMovement() {
        const SPEED = 160;
        const k = this._keys;
        let vx = 0, vy = 0;

        if (k.up.isDown    || k.upW.isDown    || k.arrows.up.isDown)    vy = -SPEED;
        if (k.down.isDown  ||                    k.arrows.down.isDown)   vy =  SPEED;
        if (k.left.isDown  || k.leftA.isDown  || k.arrows.left.isDown)  vx = -SPEED;
        if (k.right.isDown ||                    k.arrows.right.isDown)  vx =  SPEED;

        if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }

        this.sprite.setVelocity(vx, vy);
        if (vx < 0)      this.sprite.setFlipX(true);
        else if (vx > 0) this.sprite.setFlipX(false);
    }

    /** Texte animé au level-up Mana Core. */
    _showLevelUpText(core) {
        const text = this.scene.add.text(
            this.sprite.x, this.sprite.y - 40,
            `✦ MANA CORE ${core.name.toUpperCase()} ✦`,
            { fontFamily: 'monospace', fontSize: '16px', color: core.hex,
              stroke: '#000000', strokeThickness: 3 },
        ).setDepth(200).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text, y: this.sprite.y - 110, alpha: 0,
            duration: 2200, ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }
}
