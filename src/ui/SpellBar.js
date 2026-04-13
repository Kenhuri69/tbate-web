/**
 * SPELL BAR
 *
 * Barre de 4 sorts en bas d'écran.
 * Chaque slot affiche : icône colorée, nom, numéro de touche,
 * overlay de cooldown (remplit de haut en bas), bordure de sélection.
 *
 * Réagit à 'spell:changed' pour mettre en valeur le sort actif.
 * Lit spellSystem.getCooldownRatio() chaque frame.
 *
 * TODO : ajouter un tooltip au survol (description + stats du sort).
 * TODO : permettre le drag-and-drop pour réorganiser les sorts.
 *
 * Dépend de (globals) : SPELLS
 */
class SpellBar {

    /**
     * @param {Phaser.Scene} scene
     * @param {SpellSystem}  spellSystem
     */
    constructor(scene, spellSystem) {
        this.scene       = scene;
        this.spellSystem = spellSystem;
        this._slots      = [];

        this._build();
        scene.events.on('spell:changed', this._onSpellChanged, this);
    }

    /** Mettre à jour les overlays de cooldown — appeler dans GameScene.update(). */
    update() {
        SPELLS.forEach((_, i) => {
            this._updateCooldown(i, this.spellSystem.getCooldownRatio(i));
        });
    }

    destroy() {
        this.scene.events.off('spell:changed', this._onSpellChanged, this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _build() {
        const SLOT  = 56;
        const GAP   = 6;
        const gameW = this.scene.scale.width;
        const gameH = this.scene.scale.height;
        const totalW = SPELLS.length * SLOT + (SPELLS.length - 1) * GAP;
        const startX = Math.floor((gameW - totalW) / 2);
        const slotY  = gameH - SLOT - 14;

        this._slotSize = SLOT;

        SPELLS.forEach((spell, i) => {
            const x  = startX + i * (SLOT + GAP);
            const cx = x + SLOT / 2;
            const cy = y => y + SLOT / 2 - 7; // centre vertical de l'icône

            // — Fond —
            const bg = this.scene.add.rectangle(x, slotY, SLOT, SLOT, 0x0d0d1a, 0.88)
                .setOrigin(0).setScrollFactor(0).setDepth(100);

            // — Icône (halo + noyau + éclat) —
            const icon = this.scene.add.graphics().setScrollFactor(0).setDepth(101);
            icon.fillStyle(spell.color, 0.20);
            icon.fillCircle(cx, cy(slotY), spell.size * 2.4);
            icon.fillStyle(spell.color, 1);
            icon.fillCircle(cx, cy(slotY), spell.size * 1.4);
            icon.fillStyle(0xffffff, 0.40);
            icon.fillCircle(cx - spell.size * 0.3, cy(slotY) - spell.size * 0.3, spell.size * 0.5);

            // — Nom du sort —
            this.scene.add.text(cx, slotY + SLOT - 13, spell.name, {
                fontFamily: 'monospace', fontSize: '7px', color: '#8899bb',
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

            // — Numéro de touche —
            this.scene.add.text(x + 4, slotY + 4, `${i + 1}`, {
                fontFamily: 'monospace', fontSize: '10px', color: '#ccccdd',
            }).setScrollFactor(0).setDepth(101);

            // — Overlay de cooldown —
            const cooldownGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(102);

            // — Bordure de sélection —
            const borderGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(103);

            this._slots.push({ bg, icon, cooldownGfx, borderGfx, x, y: slotY, spell, size: SLOT });
        });

        // Affiche la sélection initiale
        this._onSpellChanged(0);
    }

    _onSpellChanged(newIndex) {
        this._slots.forEach((slot, i) => {
            const active = (i === newIndex);

            slot.bg.setFillStyle(active ? 0x2a1a4e : 0x0d0d1a, active ? 0.95 : 0.88);

            slot.borderGfx.clear();
            if (active) {
                slot.borderGfx.lineStyle(2, slot.spell.color, 1);
                slot.borderGfx.strokeRect(slot.x, slot.y, slot.size, slot.size);
            }
        });
    }

    _updateCooldown(index, ratio) {
        const slot = this._slots[index];
        if (!slot) return;

        slot.cooldownGfx.clear();
        if (ratio > 0.02) {
            slot.cooldownGfx.fillStyle(0x000000, 0.60);
            slot.cooldownGfx.fillRect(slot.x, slot.y, slot.size, slot.size * ratio);
        }
    }
}
