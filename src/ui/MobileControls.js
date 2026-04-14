/**
 * MOBILE CONTROLS - Version corrigée avec support resize/rotation
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
        // Cast button
        this._castBtn = this._makeButton(
            W - 80, H - 100, 52, 0x5533bb, 'Cast',
            (ptr) => { if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:cast'); }
        );

        // Next Spell
        this._makeButton(
            W - 162, H - 58, 32, 0x1a3a66, 'Next',
            (ptr) => { if (ptr.id !== this._joyPointerId) this.scene.events.emit('mobile:nextspell'); }
        );

        // ==================== MENU BUTTON - VERSION ULTRA ROBUSTE ====================
        this._menuBtn = this._makeButton(
            W - 65, 75, 42, 0xff0000, '≡',     // Rouge vif + plus gros
            (ptr) => { 
                if (ptr.id !== this._joyPointerId) {
                    this.scene.events.emit('mobile:menu');
                    console.log('[MobileControls] MENU CLICKED !');
                }
            },
            true
        );

        // Force maximale (après création)
        if (this._menuBtn?.gfx) {
            this._menuBtn.gfx.setDepth(9999);
            this._menuBtn.gfx.setAlpha(1);
        }
        if (this._menuBtn?.zone) {
            this._menuBtn.zone.setDepth(10000);
        }

        // Debug rectangle jaune (temporaire, 4 secondes) pour vérifier la zone
        const debugRect = this.scene.add.rectangle(W - 65, 75, 100, 100, 0xffff00, 0.25)
            .setScrollFactor(0)
            .setDepth(9998);
        this.scene.time.delayedCall(4000, () => { if (debugRect) debugRect.destroy(); });

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

        zone.on('pointerover', () => gfx.setAlpha(1.0));
        zone.on('pointerout',  () => gfx.setAlpha(1.0));
        zone.on('pointerdown', () => gfx.setAlpha(0.65));
        zone.on('pointerup',   () => gfx.setAlpha(1.0));

        return { gfx, zone };
    }

    _registerPointerEvents(W, H) {
        const JOY_RIGHT = W * 0.44;
        const JOY_TOP   = H * 0.48;

        // On enlève les anciens listeners pour éviter les doublons
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerup');

        this.scene.input.on('pointerdown', (ptr) => {
            if (this._joyPointerId !== null) return;
            if (ptr.x > JOY_RIGHT || ptr.y < JOY_TOP) return;

            this._joyPointerId = ptr.id;
            this._joyOrigin = { x: ptr.x, y: ptr.y };
            this._joyBase.setPosition(ptr.x, ptr.y).setAlpha(1);
            this._joyKnob.setPosition(ptr.x, ptr.y).setAlpha(1);
        });

        this.scene.input.on('pointermove', (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._updateJoystick(ptr);
        });

        this.scene.input.on('pointerup', (ptr) => {
            if (ptr.id !== this._joyPointerId) return;
            this._joyPointerId = null;
            this._joyVector = { x: 0, y: 0 };
            this._joyBase.setAlpha(0);
            this._joyKnob.setAlpha(0);
        });
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

    resize(newW, newH) {
        this._W = newW;
        this._H = newH;

        // 1. Destruction de tout ce qui existe
        if (this._castBtn?.zone) this._castBtn.zone.destroy();
        if (this._menuBtn?.zone) this._menuBtn.zone.destroy();
        if (this._joyBase) this._joyBase.destroy();
        if (this._joyKnob) this._joyKnob.destroy();

        // 2. Recréation complète du joystick graphique
        this._buildJoystickGfx();

        // 3. Recréation des boutons
        this._buildButtons(newW, newH);

        // 4. Ré-enregistrement des événements pointer avec les nouvelles dimensions
        this._registerPointerEvents(newW, newH);

        console.log(`[MobileControls] Resize COMPLET appliqué → ${newW} × ${newH}`);
    }

   
}

window.MobileControls = MobileControls; // pour compatibilité avec index.html