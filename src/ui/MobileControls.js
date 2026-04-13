/**
 * MOBILE CONTROLS
 *
 * Joystick virtuel flottant (bas gauche) + boutons d'action (bas droite).
 *
 * Joystick :
 *   - Apparaît là où le pouce touche (floating joystick)
 *   - Zone de déclenchement : moitié gauche × moitié basse de l'écran
 *   - Dead zone 15% pour éviter les micro-déplacements
 *   - Expose vector { x, y } normalisé [-1..1]
 *
 * Boutons (bas droite) :
 *   ⚡ Cast    → émet 'mobile:cast'
 *   ↻ Sort    → émet 'mobile:nextspell'
 *
 * Bouton Menu (haut droite) :
 *   ≡          → émet 'mobile:menu'
 *
 * Lecture du joystick dans Player._handleMovement() via scene.mobileControls.
 *
 * TODO : ajouter un bouton de sprint (double-tap joystick ?)
 * TODO : détecter automatiquement le device et masquer sur desktop si souhaité.
 *
 * Dépend de (globals) : Phaser
 */

const JOY_MAX_RADIUS  = 58;   // px — rayon maximal du joystick
const JOY_KNOB_RADIUS = 22;   // px — rayon du knob
const JOY_DEAD_ZONE   = 0.15; // fraction [0..1] de zone morte

class MobileControls {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;

        // — État du joystick —
        this._joyPointerId = null;         // ID du pointeur qui contrôle le joystick
        this._joyOrigin    = { x: 0, y: 0 };
        this._joyVector    = { x: 0, y: 0 }; // normalisé [-1..1]

        const W = scene.scale.width;
        const H = scene.scale.height;

        this._W = W;
        this._H = H;

        this._buildJoystickGfx();
        this._buildButtons(W, H);
        this._registerPointerEvents(W, H);
    }

    // ----------------------------------------------------------------
    // API publique (lue par Player._handleMovement)
    // ----------------------------------------------------------------

    /** True si un doigt contrôle le joystick. */
    get isActive() { return this._joyPointerId !== null; }

    /** Vecteur de direction normalisé {x, y} en [-1..1]. */
    get vector() { return this._joyVector; }

    // ----------------------------------------------------------------
    // Construction
    // ----------------------------------------------------------------

    _buildJoystickGfx() {
        // Base (dessinée en (0,0), repositionnée lors du touch)
        this._joyBase = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(210).setAlpha(0);
        this._joyBase.lineStyle(2, 0xffffff, 0.55);
        this._joyBase.strokeCircle(0, 0, JOY_MAX_RADIUS);
        this._joyBase.fillStyle(0xffffff, 0.07);
        this._joyBase.fillCircle(0, 0, JOY_MAX_RADIUS);

        // Knob
        this._joyKnob = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(211).setAlpha(0);
        this._joyKnob.fillStyle(0xffffff, 0.55);
        this._joyKnob.fillCircle(0, 0, JOY_KNOB_RADIUS);
        this._joyKnob.lineStyle(1, 0xffffff, 0.8);
        this._joyKnob.strokeCircle(0, 0, JOY_KNOB_RADIUS);
    }

    _buildButtons(W, H) {
        // ⚡ Cast — grand bouton bas droite
        this._castBtn = this._makeButton(
            W - 80, H - 100, 52, 0x5533aa, '⚡',
            (ptr) => {
                if (ptr.id === this._joyPointerId) return;
                this.scene.events.emit('mobile:cast');
            },
        );

        // ↻ Sort suivant
        this._makeButton(
            W - 162, H - 58, 32, 0x1a2a44, '↻',
            (ptr) => {
                if (ptr.id === this._joyPointerId) return;
                this.scene.events.emit('mobile:nextspell');
            },
        );

        // ≡ Menu / Stats (haut droite)
        this._makeButton(
            W - 44, 44, 26, 0x111122, '≡',
            (ptr) => {
                if (ptr.id === this._joyPointerId) return;
                this.scene.events.emit('mobile:menu');
            },
        );
    }

    /**
     * Crée un bouton circulaire interactif.
     * @returns {{ gfx, zone }}
     */
    _makeButton(x, y, r, color, icon, onDown) {
        const gfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(210);
        gfx.fillStyle(color, 0.82);
        gfx.fillCircle(x, y, r);
        gfx.lineStyle(1.5, 0xffffff, 0.28);
        gfx.strokeCircle(x, y, r);

        this.scene.add.text(x, y, icon, {
            fontFamily: 'monospace',
            fontSize  : `${Math.round(r * 0.78)}px`,
            color     : '#ffffff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(211);

        const zone = this.scene.add.zone(x, y, r * 2, r * 2)
            .setScrollFactor(0).setDepth(212).setInteractive();
        zone.on('pointerdown', onDown);

        return { gfx, zone };
    }

    // ----------------------------------------------------------------
    // Gestion des pointeurs (multi-touch)
    // ----------------------------------------------------------------

    _registerPointerEvents(W, H) {
        const JOY_RIGHT = W * 0.44;
        const JOY_TOP   = H * 0.48;

        // Nouveau touch
        this.scene.input.on('pointerdown', (ptr) => {
            if (this._joyPointerId !== null) return;          // joystick déjà actif
            if (ptr.x > JOY_RIGHT || ptr.y < JOY_TOP) return; // hors zone gauche-basse

            this._joyPointerId = ptr.id;
            this._joyOrigin    = { x: ptr.x, y: ptr.y };

            this._joyBase.setPosition(ptr.x, ptr.y).setAlpha(1);
            this._joyKnob.setPosition(ptr.x, ptr.y).setAlpha(1);
        });

        // Déplacement
        this.scene.input.on('pointermove', (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._updateJoystick(ptr);
        });

        // Relâchement
        this.scene.input.on('pointerup', (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._joyPointerId = null;
            this._joyVector    = { x: 0, y: 0 };
            this._joyBase.setAlpha(0);
            this._joyKnob.setAlpha(0);
        });
    }

    _updateJoystick(ptr) {
        const ox   = this._joyOrigin.x;
        const oy   = this._joyOrigin.y;
        const dx   = ptr.x - ox;
        const dy   = ptr.y - oy;
        const dist = Math.hypot(dx, dy);
        const R    = JOY_MAX_RADIUS;

        // Clamp du knob dans le rayon max
        const clamped = Math.min(dist, R);
        const angle   = Math.atan2(dy, dx);

        this._joyKnob.setPosition(
            ox + Math.cos(angle) * clamped,
            oy + Math.sin(angle) * clamped,
        );

        // Vecteur normalisé avec dead zone
        const norm = clamped / R;
        if (norm < JOY_DEAD_ZONE) {
            this._joyVector = { x: 0, y: 0 };
        } else {
            this._joyVector = {
                x: Math.cos(angle) * norm,
                y: Math.sin(angle) * norm,
            };
        }
    }
}
