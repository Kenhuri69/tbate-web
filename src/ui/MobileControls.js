/**
 * MOBILE CONTROLS - Version stable avec rotation écran
 */

const JOY_MAX_RADIUS  = 58;
const JOY_KNOB_RADIUS = 22;
const JOY_DEAD_ZONE   = 0.15;

class MobileControls {

    constructor(scene) {
        this.scene = scene;
        this._joyPointerId = null;
        this._joyOrigin    = { x: 0, y: 0 };
        this._joyVector    = { x: 0, y: 0 };

        const W = scene.scale.width;
        const H = scene.scale.height;

        this._W = W;
        this._H = H;

        this._buildJoystickGfx();
        this._buildButtons(W, H);
        this._registerPointerEvents(W, H);

        console.log('[MobileControls] Initialisé avec dimensions', W, '×', H);
    }

    get isActive() { return this._joyPointerId !== null; }
    get vector()   { return this._joyVector; }

    _buildJoystickGfx() {
        this._joyBase = this.scene.add.graphics().setScrollFactor(0).setDepth(210).setAlpha(0);
        this._joyBase.lineStyle(2, 0xffffff, 0.55);
        this._joyBase.strokeCircle(0, 0, JOY_MAX_RADIUS);
        this._joyBase.fillStyle(0xffffff, 0.07);
        this._joyBase.fillCircle(0, 0, JOY_MAX_RADIUS);

        this._joyKnob = this.scene.add.graphics().setScrollFactor(0).setDepth(211).setAlpha(0);
        this._joyKnob.fillStyle(0xffffff, 0.55);
        this._joyKnob.fillCircle(0, 0, JOY_KNOB_RADIUS);
        this._joyKnob.lineStyle(1, 0xffffff, 0.8);
        this._joyKnob.strokeCircle(0, 0, JOY_KNOB_RADIUS);
    }

    _buildButtons(W, H) {
        const isPortrait = H > W;

        // Positions adaptées selon l'orientation
        // Portrait  : boutons en bas à droite, menu en haut à droite
        // Paysage   : même disposition, légèrement différent
        const castX   = W - 80;
        const castY   = H - (isPortrait ? 120 : 100);
        const nextX   = W - (isPortrait ? 80 : 162);
        const nextY   = H - (isPortrait ? 200 : 58);
        const meditX  = W - (isPortrait ? 160 : 162);
        const meditY  = H - (isPortrait ? 200 : 120);
        const menuX   = W - 65;
        const menuY   = isPortrait ? 90 : 75;

        // Cast
        this._castBtn = this._makeButton(
            castX, castY, 52, 0x5533bb, '⚡',
            (ptr) => { if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:cast'); }
        );

        // Sort suivant
        this._makeButton(
            nextX, nextY, 30, 0x1a3a66, '↻',
            (ptr) => { if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:nextspell'); }
        );

        // Méditation
        this._makeButton(
            meditX, meditY, 30, 0x330066, '🧘',
            (ptr) => { if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:meditate'); }
        );

        // Menu ≡
        this._menuBtn = this._makeButton(
            menuX, menuY, 38, 0x220033, '≡',
            (ptr) => {
                if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:menu');
            },
            true
        );
        if (this._menuBtn?.gfx) this._menuBtn.gfx.setDepth(9999).setAlpha(1);
        if (this._menuBtn?.zone) this._menuBtn.zone.setDepth(10000);
    }

    _makeButton(x, y, r, color, icon, onDown, stopProp = false) {
        const gfx = this.scene.add.graphics().setScrollFactor(0).setDepth(210);
        gfx.fillStyle(color, 0.82);
        gfx.fillCircle(x, y, r);
        gfx.lineStyle(1.5, 0xffffff, 0.28);
        gfx.strokeCircle(x, y, r);

        this.scene.add.text(x, y, icon, {
            fontFamily: 'monospace',
            fontSize: `${Math.round(r * 0.78)}px`,
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(211);

        const zone = this.scene.add.zone(x, y, r*2.4, r*2.4)
            .setScrollFactor(0).setDepth(215)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerdown', (ptr, lx, ly, event) => {
            if (stopProp) event.stopPropagation();
            onDown(ptr);
        });

        return { gfx, zone };
    }

    _registerPointerEvents(W, H) {
        // En portrait, la zone joystick descend plus bas (ratio différent)
        const isPortrait = H > W;
        const JOY_RIGHT  = W * (isPortrait ? 0.50 : 0.44);
        const JOY_TOP    = H * (isPortrait ? 0.55 : 0.48);

        // Retirer UNIQUEMENT les anciens listeners du joystick (pas ceux des autres systèmes)
        if (this._onDown)  this.scene.input.off('pointerdown', this._onDown,  this);
        if (this._onMove)  this.scene.input.off('pointermove', this._onMove,  this);
        if (this._onUp)    this.scene.input.off('pointerup',   this._onUp,    this);

        this._onDown = (ptr) => {
            if (this._joyPointerId !== null) return;
            if (ptr.x > JOY_RIGHT || ptr.y < JOY_TOP) return;
            this._joyPointerId = ptr.id;
            this._joyOrigin = { x: ptr.x, y: ptr.y };
            this._joyBase.setPosition(ptr.x, ptr.y).setAlpha(1);
            this._joyKnob.setPosition(ptr.x, ptr.y).setAlpha(1);
        };

        this._onMove = (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._updateJoystick(ptr);
        };

        this._onUp = (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._joyPointerId = null;
            this._joyVector = { x: 0, y: 0 };
            this._joyBase.setAlpha(0);
            this._joyKnob.setAlpha(0);
        };

        this.scene.input.on('pointerdown', this._onDown,  this);
        this.scene.input.on('pointermove', this._onMove,  this);
        this.scene.input.on('pointerup',   this._onUp,    this);
    }

    _updateJoystick(ptr) {
        const dx = ptr.x - this._joyOrigin.x;
        const dy = ptr.y - this._joyOrigin.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < JOY_MAX_RADIUS * JOY_DEAD_ZONE) {
            this._joyVector = { x: 0, y: 0 };
            this._joyKnob.setPosition(this._joyOrigin.x, this._joyOrigin.y);
            return;
        }

        const angle = Math.atan2(dy, dx);
        const maxDist = Math.min(dist, JOY_MAX_RADIUS);
        const knobX = this._joyOrigin.x + Math.cos(angle) * maxDist;
        const knobY = this._joyOrigin.y + Math.sin(angle) * maxDist;

        this._joyKnob.setPosition(knobX, knobY);

        const norm = maxDist / JOY_MAX_RADIUS;
        this._joyVector = {
            x: Math.cos(angle) * norm,
            y: Math.sin(angle) * norm
        };
    }

    /** Resize appelé à chaque rotation */
    resize(newW, newH) {
        this._W = newW;
        this._H = newH;

        // Destruction complète
        if (this._castBtn?.zone) this._castBtn.zone.destroy();
        if (this._menuBtn?.zone) this._menuBtn.zone.destroy();
        if (this._joyBase) this._joyBase.destroy();
        if (this._joyKnob) this._joyKnob.destroy();

        // Recréation complète
        this._buildJoystickGfx();
        this._buildButtons(newW, newH);
        this._registerPointerEvents(newW, newH);

        console.log(`[MobileControls] Resize COMPLET → ${newW} × ${newH}`);
    }
}

window.MobileControls = MobileControls;