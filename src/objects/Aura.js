/**
 * AURA
 *
 * Représentation visuelle du Mana Core autour du joueur :
 *   - Halo diffus   : cercles concentriques simulant un dégradé radial
 *   - Anneau central : pulsation sinusoïdale
 *   - Particules    : pixels en orbite qui clignotent
 *
 * Se met à jour automatiquement sur l'événement 'manacore:changed'.
 *
 * TODO : remplacer les Graphics par un shader GLSL.
 * TODO : ajouter un burst de particules au level-up.
 *
 * Dépend de (globals) : playerState
 */
class Aura {

    /**
     * @param {Phaser.Scene}              scene
     * @param {Phaser.GameObjects.Sprite} target
     */
    constructor(scene, target) {
        this.scene  = scene;
        this.target = target;

        this.gfx       = scene.add.graphics().setDepth(9);
        this.particles = this._buildParticles();

        scene.events.on('manacore:changed', this._onCoreChanged, this);
    }

    /** @param {number} time - ms depuis Phaser */
    update(time) {
        const t = time * 0.001;
        this._drawHalo(t);
        this._tickParticles(t);
    }

    destroy() {
        this.gfx.destroy();
        this.particles.forEach(p => p.gfx.destroy());
        this.scene.events.off('manacore:changed', this._onCoreChanged, this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _drawHalo(t) {
        const core  = playerState.coreData;
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
        const alpha = core.auraAlpha * pulse;
        const px    = this.target.x;
        const py    = this.target.y;

        this.gfx.clear();

        // Halo diffus (5 couches)
        for (let i = 5; i >= 1; i--) {
            this.gfx.fillStyle(core.color, alpha * 0.11 / i);
            this.gfx.fillCircle(px, py, 18 + i * 9);
        }

        // Anneau pulsant
        const ringR = 24 + 2 * Math.sin(t * 3.25);
        this.gfx.lineStyle(2, core.color, alpha * 0.80);
        this.gfx.strokeCircle(px, py, ringR);

        // Noyau
        this.gfx.fillStyle(core.color, alpha * 0.55);
        this.gfx.fillCircle(px, py, 10);

        // Éclat blanc
        this.gfx.fillStyle(0xffffff, alpha * 0.22);
        this.gfx.fillCircle(px, py, 5);
    }

    _tickParticles(t) {
        const core = playerState.coreData;
        for (const p of this.particles) {
            p.angle += p.speed * 0.02;
            const px      = this.target.x + Math.cos(p.angle) * p.radius;
            const py      = this.target.y + Math.sin(p.angle) * p.radius;
            const flicker = Math.abs(Math.sin(t * p.flickerRate * Math.PI));

            p.gfx.clear();
            if (flicker > 0.25) {
                p.gfx.fillStyle(core.color, core.auraAlpha * flicker * 0.9);
                p.gfx.fillRect(px - p.size * 0.5, py - p.size * 0.5, p.size, p.size);
            }
        }
    }

    _buildParticles() {
        const COUNT = 14;
        return Array.from({ length: COUNT }, (_, i) => ({
            gfx        : this.scene.add.graphics().setDepth(8),
            angle      : (Math.PI * 2 / COUNT) * i,
            radius     : 28 + Math.random() * 16,
            speed      : 0.25 + Math.random() * 0.55,
            size       : 1.5 + Math.random() * 2,
            flickerRate: 0.4  + Math.random() * 1.8,
        }));
    }

    _onCoreChanged() {
        // TODO : déclencher un burst de particules ici.
    }
}
