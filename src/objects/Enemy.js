/**
 * ENEMY — Void Beast
 *
 * IA de poursuite simple : se déplace vers le joueur à vitesse constante,
 * s'arrête à STOP_DIST px pour éviter l'oscillation.
 *
 * `sprite.enemyRef = this` permet au callback de collision d'accéder
 * à l'instance depuis le sprite Phaser.
 *
 * Événements émis :
 *   - 'enemy:died' ({ x, y, xpDrop }) → GameScene attribue l'XP
 *
 * TODO : ajouter des types via config JSON (boss, ranged, charger).
 * TODO : ajouter une attaque de contact (dégâts au joueur).
 * TODO : ajouter un pathfinding quand la map aura des obstacles.
 *
 * Dépend de (globals) : Phaser
 */
class Enemy {

    /**
     * @param {Phaser.Scene} scene
     * @param {number}       x
     * @param {number}       y
     * @param {object}       [config={}]
     */
    constructor(scene, x, y, config = {}) {
        this.scene  = scene;
        this.maxHp  = config.hp      ?? 50;
        this.hp     = this.maxHp;
        this.speed  = config.speed   ?? 55;
        this.xpDrop = config.xpDrop  ?? 30;
        this.alive  = true;

        this.sprite = scene.physics.add.sprite(x, y, 'enemy').setDepth(10);
        this.sprite.enemyRef = this; // référence inverse pour les collisions

        this.hpBar = scene.add.graphics().setDepth(11);
    }

    /**
     * @param {number} targetX - X du joueur
     * @param {number} targetY - Y du joueur
     */
    update(targetX, targetY) {
        if (!this.alive) return;
        this._pursue(targetX, targetY);
        this._drawHPBar();
    }

    /** @param {number} amount */
    takeDamage(amount) {
        if (!this.alive) return;
        this.hp = Math.max(0, this.hp - amount);

        // Flash rouge
        this.sprite.setTint(0xff2222);
        this.scene.time.delayedCall(110, () => {
            if (this.sprite?.active) this.sprite.clearTint();
        });

        if (this.hp <= 0) this._die();
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _pursue(tx, ty) {
        const dx   = tx - this.sprite.x;
        const dy   = ty - this.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 20) {
            this.sprite.setVelocity(0, 0);
            return;
        }
        const norm = this.speed / dist;
        this.sprite.setVelocity(dx * norm, dy * norm);
    }

    _drawHPBar() {
        const x     = this.sprite.x - 16;
        const y     = this.sprite.y - 22;
        const ratio = this.hp / this.maxHp;

        const fillColor = ratio > 0.50 ? 0x22ee55
                        : ratio > 0.25 ? 0xff9900
                        :                0xff2222;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x222222, 0.85);
        this.hpBar.fillRect(x, y, 32, 4);
        this.hpBar.fillStyle(fillColor, 1);
        this.hpBar.fillRect(x, y, 32 * ratio, 4);
    }

    _die() {
        this.alive = false;
        this.hpBar.destroy();
        this.sprite.setVelocity(0, 0);
        this.sprite.body.enable = false; // plus de physique → plus de collisions

        this.scene.tweens.add({
            targets   : this.sprite,
            alpha     : 0,
            scaleX    : 1.9,
            scaleY    : 1.9,
            duration  : 380,
            ease      : 'Power2',
            onComplete: () => { if (this.sprite) this.sprite.destroy(); },
        });

        this.scene.events.emit('enemy:died', {
            x      : this.sprite.x,
            y      : this.sprite.y,
            xpDrop : this.xpDrop,
        });
    }
}
