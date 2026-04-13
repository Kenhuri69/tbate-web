/**
 * HUD — Heads-Up Display
 *
 * Affiche le niveau Mana Core, l'XP et la barre de progression.
 * Se rafraîchit automatiquement sur 'manacore:changed'.
 *
 * TODO : extraire dans une UIScene dédiée (caméra overlay indépendante).
 * TODO : ajouter barre de vie, mini-map (Étape 3+).
 *
 * Dépend de (globals) : MANA_CORE_LEVELS, playerState
 */
class HUD {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
        this._build();
        scene.events.on('manacore:changed', this.refresh, this);
    }

    refresh() {
        const core   = playerState.coreData;
        const maxLvl = MANA_CORE_LEVELS.length - 1;
        const next   = MANA_CORE_LEVELS[Math.min(playerState.manaCoreLevel + 1, maxLvl)];

        this._txtLevel
            .setText(`Mana Core : [${core.name.toUpperCase()}]  Niv. ${core.level}`)
            .setStyle({ color: core.hex });

        const suffix = playerState.manaCoreLevel >= maxLvl ? '  ✦ MAX ✦' : '';
        this._txtXP.setText(`XP : ${playerState.manaXP} / ${next.xpRequired}${suffix}`);

        const xpInLevel = playerState.manaXP - core.xpRequired;
        const xpSpan    = next.xpRequired    - core.xpRequired;
        const ratio     = playerState.manaCoreLevel >= maxLvl
            ? 1 : Math.min(xpInLevel / Math.max(xpSpan, 1), 1);

        this._barFill.setSize(Math.max(0, 248 * ratio), 10).setFillStyle(core.color);
    }

    destroy() {
        this.scene.events.off('manacore:changed', this.refresh, this);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _build() {
        const X = 10, Y = 10;

        this.scene.add.rectangle(X, Y, 280, 100, 0x000000, 0.72)
            .setOrigin(0).setScrollFactor(0).setDepth(100);

        this._txtLevel = this.scene.add.text(X + 12, Y + 12, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        }).setScrollFactor(0).setDepth(101);

        this._txtXP = this.scene.add.text(X + 12, Y + 34, '', {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
        }).setScrollFactor(0).setDepth(101);

        // Fond barre XP
        this.scene.add.rectangle(X + 12, Y + 56, 248, 10, 0x333333)
            .setOrigin(0).setScrollFactor(0).setDepth(101);

        this._barFill = this.scene.add.rectangle(X + 12, Y + 56, 0, 10, 0x5533aa)
            .setOrigin(0).setScrollFactor(0).setDepth(102);

        this.scene.add.text(X + 12, Y + 76, 'ZQSD/Flèches : déplacer  |  Clic : lancer  |  1-4 : sort', {
            fontFamily: 'monospace', fontSize: '9px', color: '#445566',
        }).setScrollFactor(0).setDepth(101);

        this.refresh();
    }
}
