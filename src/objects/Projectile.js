/**
 * PROJECTILE
 *
 * Cycle de vie :
 *   1. Créé par SpellSystem
 *   2. Propulsé via launch(angle)
 *   3. Détruit par collision (GameScene) ou hors-limites (SpellSystem.update)
 *
 * `sprite.projRef = this` permet au callback de collision d'accéder
 * à l'instance depuis le sprite Phaser.
 *
 * TODO : ajouter des types (perforant, zone) via spell.type.
 * TODO : ajouter une traînée visuelle (ParticleEmitter).
 *
 * Dépend de (globals) : Phaser
 */
class Projectile {

    /**
     * @param {Phaser.Scene} scene
     * @param {number}       x
     * @param {number}       y
     * @param {object}       spell - depuis SPELLS[]
     */
    constructor(scene, x, y, spell) {
        this.scene = scene;
        this.spell = spell;
        this.alive = true;

        this.sprite = scene.physics.add.image(x, y, `proj_${spell.id}`)
            .setDepth(15);

        // Référence inverse pour les callbacks de collision
        this.sprite.projRef = this;
    }

    /**
     * Propulse le projectile dans la direction donnée.
     * @param {number} angle - radians
     */
    launch(angle) {
        this.sprite.setVelocity(
            Math.cos(angle) * this.spell.speed,
            Math.sin(angle) * this.spell.speed,
        );
        this.sprite.setRotation(angle);
    }

    /**
     * @param {number} worldW
     * @param {number} worldH
     * @returns {boolean}
     */
    isOutOfBounds(worldW, worldH) {
        const { x, y } = this.sprite;
        const M = 64;
        return x < -M || x > worldW + M || y < -M || y > worldH + M;
    }

    /** Détruit le projectile. Idempotent. */
    destroy() {
        if (!this.alive) return;
        this.alive = false;
        if (this.sprite?.scene) this.sprite.destroy();
    }
}
