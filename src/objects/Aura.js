/**
 * AURA
 *
 * Représentation visuelle du Mana Core autour du joueur :
 *   - Halo diffus   : cercles concentriques qui simulent un dégradé radial
 *   - Anneau central : pulsation sinusoïdale synchronisée au niveau
 *   - Particules    : pixels en orbite qui clignotent aléatoirement
 *
 * Se met à jour en réaction à 'manacore:changed' (pas de polling).
 *
 * TODO : remplacer les Graphics par un shader GLSL pour de meilleures perfs.
 * TODO : ajouter un burst visuel (explosion de particules) au level-up.
 * TODO : varier le rayon d'orbite en fonction du niveau du core.
 */

import { playerState } from '../config/manaCore.js';

// — Constantes de l'aura (à ajuster pour l'équilibrage visuel) —
const HALO_LAYERS      = 5;   // nombre de cercles concentriques
const HALO_BASE_RADIUS = 18;  // rayon du cercle le plus interne
const HALO_STEP        = 9;   // px entre chaque couche
const RING_RADIUS      = 24;  // rayon de l'anneau brillant
const RING_PULSE_AMP   = 2;   // amplitude de pulsation de l'anneau (px)
const PULSE_SPEED      = 2.5; // rad/s de la pulsation
const CORE_RADIUS      = 10;  // rayon du noyau central
const CORE_GLOW_RADIUS = 5;   // rayon de l'éclat blanc intérieur

const PARTICLE_COUNT    = 14;
const ORBIT_RADIUS_MIN  = 28;
const ORBIT_RADIUS_MAX  = 44;

export class Aura {

    /**
     * @param {Phaser.Scene}                     scene
     * @param {Phaser.GameObjects.Sprite}        target  - Sprite suivi
     */
    constructor(scene, target) {
        this.scene  = scene;
        this.target = target;

        // Graphics principal pour les cercles
        this.gfx = scene.add.graphics().setDepth(9);

        // Particules orbitales
        this.particles = this._buildParticles();

        // Mise à jour visuelle dès qu'un changement de core est signalé
        scene.events.on('manacore:changed', this._onCoreChanged, this);
    }

    /**
     * Appelé chaque frame depuis Player.update().
     * @param {number} time - Temps courant en ms (fourni par Phaser)
     */
    update(time) {
        const t = time * 0.001; // convertit en secondes pour les sinusoïdes
        this._drawHalo(t);
        this._tickParticles(t);
    }

    destroy() {
        this.gfx.destroy();
        this.particles.forEach(p => p.gfx.destroy());
        this.scene.events.off('manacore:changed', this._onCoreChanged, this);
    }

    // ----------------------------------------------------------------
    // Dessin du halo (cercles + anneau + noyau)
    // ----------------------------------------------------------------

    _drawHalo(t) {
        const core  = playerState.coreData;
        const pulse = 0.85 + 0.15 * Math.sin(t * PULSE_SPEED); // [0.70 .. 1.00]
        const alpha = core.auraAlpha * pulse;
        const px    = this.target.x;
        const py    = this.target.y;

        this.gfx.clear();

        // — Halo diffus (du plus grand au plus petit pour l'alpha correct) —
        for (let i = HALO_LAYERS; i >= 1; i--) {
            const r = HALO_BASE_RADIUS + i * HALO_STEP;
            const a = alpha * 0.11 / i;              // s'atténue avec la distance
            this.gfx.fillStyle(core.color, a);
            this.gfx.fillCircle(px, py, r);
        }

        // — Anneau brillant (rayon pulsant) —
        const ringR = RING_RADIUS + RING_PULSE_AMP * Math.sin(t * PULSE_SPEED * 1.3);
        this.gfx.lineStyle(2, core.color, alpha * 0.80);
        this.gfx.strokeCircle(px, py, ringR);

        // — Noyau lumineux central —
        this.gfx.fillStyle(core.color, alpha * 0.55);
        this.gfx.fillCircle(px, py, CORE_RADIUS);

        // — Éclat blanc (pic de brillance) —
        this.gfx.fillStyle(0xffffff, alpha * 0.22);
        this.gfx.fillCircle(px, py, CORE_GLOW_RADIUS);
    }

    // ----------------------------------------------------------------
    // Particules en orbite
    // ----------------------------------------------------------------

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

    /** Initialise les données des particules orbitales. */
    _buildParticles() {
        return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            gfx        : this.scene.add.graphics().setDepth(8),
            angle      : (Math.PI * 2 / PARTICLE_COUNT) * i,
            radius     : ORBIT_RADIUS_MIN + Math.random() * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN),
            speed      : 0.25 + Math.random() * 0.55,
            size       : 1.5 + Math.random() * 2,
            flickerRate: 0.4  + Math.random() * 1.8,
        }));
    }

    _onCoreChanged() {
        // Actuellement, _drawHalo lit playerState directement à chaque frame.
        // TODO : déclencher un burst de particules ici lors d'un level-up.
    }
}
