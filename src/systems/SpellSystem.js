/**
 * SPELL SYSTEM
 *
 * Gère le lancer de sorts : sélection, cooldowns, création de projectiles.
 *
 * Sources de cast :
 *   - Clic souris → angle calculé vers le curseur (desktop)
 *   - 'mobile:cast' → angle = player.lastMoveAngle (mobile)
 *
 * Changement de sort :
 *   - Touches 1-2-3-4 (clavier)
 *   - 'mobile:nextspell' → cycle vers le sort suivant (mobile)
 *
 * Événements émis :
 *   'spell:changed' (index)          → SpellBar met à jour la sélection
 *   'spell:cast'   ({ spell, index }) → pour effets sonores futurs
 *
 * API publique :
 *   spellSystem.currentSpell        → SpellConfig actif
 *   spellSystem.getCooldownRatio(i) → [0..1] pour SpellBar
 *   spellSystem.physicsGroup        → Phaser.Physics.Arcade.Group (overlap)
 *   spellSystem.update()            → appeler dans GameScene.update()
 *
 * TODO : ajouter des types de sorts (zone, perforant) via spell.type.
 * TODO : ajouter un coût en mana + barre de mana dans le HUD.
 *
 * Dépend de (globals) : SPELLS, Projectile, Phaser
 */
class SpellSystem {

    /**
     * @param {Phaser.Scene}               scene
     * @param {Phaser.GameObjects.Sprite}  playerSprite
     */
    constructor(scene, playerSprite) {
        this.scene        = scene;
        this.playerSprite = playerSprite;

        /** Index du sort actif [0..SPELLS.length-1]. */
        this.currentIndex = 0;

        /** Timestamp (ms) du dernier cast par sort. */
        this.lastCastTime = new Array(SPELLS.length).fill(0);

        /** Groupe Phaser pour les collisions arcade. */
        this.physicsGroup = scene.physics.add.group();

        /** Instances Projectile vivantes. */
        this._projectiles = [];

        this._setupKeys();
        scene.input.on('pointerdown',      this._onPointerDown, this);
        scene.events.on('mobile:cast',     this._onMobileCast,  this);
        scene.events.on('mobile:nextspell',this._cycleSpell,    this);
    }

    get currentSpell() { return SPELLS[this.currentIndex]; }

    /**
     * Cooldown normalisé [0 = prêt … 1 = en recharge].
     * @param {number} i
     */
    getCooldownRatio(i) {
        const elapsed = this.scene.time.now - this.lastCastTime[i];
        return Math.max(0, 1 - elapsed / SPELLS[i].cooldown);
    }

    /** Nettoyage des projectiles hors-limites ou détruits. */
    update() {
        const b = this.scene.physics.world.bounds;
        this._projectiles = this._projectiles.filter(p => {
            if (!p.alive) return false;
            if (p.isOutOfBounds(b.width, b.height)) { p.destroy(); return false; }
            return true;
        });
    }

    destroy() {
        this._projectiles.forEach(p => p.destroy());
        this.scene.input.off('pointerdown',       this._onPointerDown, this);
        this.scene.events.off('mobile:cast',      this._onMobileCast,  this);
        this.scene.events.off('mobile:nextspell', this._cycleSpell,    this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _setupKeys() {
        const kb = this.scene.input.keyboard;
        const KC = Phaser.Input.Keyboard.KeyCodes;
        [KC.ONE, KC.TWO, KC.THREE, KC.FOUR].forEach((code, i) => {
            if (i < SPELLS.length) {
                kb.addKey(code).on('down', () => {
                    this.currentIndex = i;
                    this.scene.events.emit('spell:changed', i);
                });
            }
        });
    }

    /** Cast souris : angle calculé vers le curseur monde. */
    _onPointerDown(pointer) {
        if (pointer.button !== 0) return;
        // Ignore le pointeur joystick mobile
        const mc = this.scene.mobileControls;
        if (mc && pointer.id === mc._joyPointerId) return;

        this._castAtAngle(Math.atan2(
            pointer.worldY - this.playerSprite.y,
            pointer.worldX - this.playerSprite.x,
        ));
    }

    /** Cast mobile : angle = dernière direction de déplacement. */
    _onMobileCast() {
        const angle = this.playerSprite.scene
            ? this.scene.player?.lastMoveAngle ?? 0
            : 0;
        this._castAtAngle(angle);
    }

    /** Cycle vers le sort suivant (bouton mobile). */
    _cycleSpell() {
        this.currentIndex = (this.currentIndex + 1) % SPELLS.length;
        this.scene.events.emit('spell:changed', this.currentIndex);
    }

    /**
     * Crée et lance un projectile dans la direction donnée.
     * @param {number} angle - radians
     */
    _castAtAngle(angle) {
        const spell = this.currentSpell;
        const now   = this.scene.time.now;
        if (now - this.lastCastTime[this.currentIndex] < spell.cooldown) return;
        this.lastCastTime[this.currentIndex] = now;

        const proj = new Projectile(
            this.scene,
            this.playerSprite.x,
            this.playerSprite.y,
            spell,
        );
        proj.launch(angle);
        this.physicsGroup.add(proj.sprite);
        this._projectiles.push(proj);
        this.scene.events.emit('spell:cast', { spell, index: this.currentIndex });
    }
}
