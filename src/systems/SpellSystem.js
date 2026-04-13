/**
 * SPELL SYSTEM
 *
 * Gère le lancer de sorts : sélection (touches 1-2-3-4), cooldowns, création
 * de projectiles au clic gauche, nettoyage hors-limites.
 *
 * Événements émis :
 *   - 'spell:changed' (index)          → SpellBar met à jour la sélection
 *   - 'spell:cast'   ({ spell, index }) → pour effets sonores futurs
 *
 * API publique :
 *   spellSystem.currentSpell          → SpellConfig du sort actif
 *   spellSystem.getCooldownRatio(i)   → [0..1] pour l'affichage SpellBar
 *   spellSystem.physicsGroup          → Phaser.Physics.Arcade.Group (pour overlap)
 *   spellSystem.update()              → appeler dans GameScene.update()
 *
 * TODO : ajouter des types de sorts (zone, perforant, rebond) via spell.type.
 * TODO : ajouter un coût en mana + barre de mana dans le HUD.
 *
 * Dépend de (globals) : SPELLS, Projectile, Phaser
 */
class SpellSystem {

    /**
     * @param {Phaser.Scene}                    scene
     * @param {Phaser.GameObjects.Sprite}       playerSprite
     */
    constructor(scene, playerSprite) {
        this.scene        = scene;
        this.playerSprite = playerSprite;

        /** Index du sort actif (0 = Mana Blast … 3 = Lightning). */
        this.currentIndex = 0;

        /**
         * Timestamp (ms) du dernier lancer pour chaque sort.
         * Sert à calculer le cooldown restant.
         */
        this.lastCastTime = new Array(SPELLS.length).fill(0);

        /** Groupe Phaser pour les collisions arcade. */
        this.physicsGroup = scene.physics.add.group();

        /** Instances Projectile vivantes. */
        this._projectiles = [];

        this._setupSwitchKeys();
        scene.input.on('pointerdown', this._onPointerDown, this);
    }

    /** Sort actuellement sélectionné. */
    get currentSpell() {
        return SPELLS[this.currentIndex];
    }

    /**
     * Cooldown restant normalisé [0 = prêt … 1 = en recharge].
     * @param {number} index
     */
    getCooldownRatio(index) {
        const spell   = SPELLS[index];
        const elapsed = this.scene.time.now - this.lastCastTime[index];
        return Math.max(0, 1 - elapsed / spell.cooldown);
    }

    /**
     * Nettoyage des projectiles hors-limites ou détruits.
     * À appeler dans GameScene.update().
     */
    update() {
        const b = this.scene.physics.world.bounds;
        this._projectiles = this._projectiles.filter(p => {
            if (!p.alive) return false;
            if (p.isOutOfBounds(b.width, b.height)) {
                p.destroy();
                return false;
            }
            return true;
        });
    }

    destroy() {
        this._projectiles.forEach(p => p.destroy());
        this.scene.input.off('pointerdown', this._onPointerDown, this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    /** Touches 1-2-3-4 pour changer de sort actif. */
    _setupSwitchKeys() {
        const kb = this.scene.input.keyboard;
        const KC = Phaser.Input.Keyboard.KeyCodes;

        [KC.ONE, KC.TWO, KC.THREE, KC.FOUR].forEach((keyCode, i) => {
            if (i < SPELLS.length) {
                kb.addKey(keyCode).on('down', () => {
                    this.currentIndex = i;
                    this.scene.events.emit('spell:changed', i);
                });
            }
        });
    }

    /** Clic gauche → lancer le sort actif vers le curseur (coordonnées monde). */
    _onPointerDown(pointer) {
        if (pointer.button !== 0) return;

        const spell = this.currentSpell;
        const now   = this.scene.time.now;

        if (now - this.lastCastTime[this.currentIndex] < spell.cooldown) return;
        this.lastCastTime[this.currentIndex] = now;

        // Crée le projectile à la position du joueur
        const proj = new Projectile(
            this.scene,
            this.playerSprite.x,
            this.playerSprite.y,
            spell,
        );

        // Direction : joueur → curseur en coordonnées monde
        const angle = Math.atan2(
            pointer.worldY - this.playerSprite.y,
            pointer.worldX - this.playerSprite.x,
        );
        proj.launch(angle);

        this.physicsGroup.add(proj.sprite);
        this._projectiles.push(proj);

        this.scene.events.emit('spell:cast', { spell, index: this.currentIndex });
    }
}
