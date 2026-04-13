/**
 * HUD — Heads-Up Display
 *
 * Affiche en haut à gauche :
 *   - Mana Core : niveau + couleur
 *   - Barre XP Mana Core
 *   - HP du joueur (barre + valeur numérique)
 *   - Niveau joueur
 *   - Rappel des contrôles
 *
 * Se rafraîchit sur :
 *   'manacore:changed', 'stats:changed', 'player:levelup'
 *
 * TODO : extraire dans une UIScene dédiée (caméra overlay indépendante).
 * TODO : ajouter mini-map, barre de mana actif (Étape 3+).
 *
 * Dépend de (globals) : MANA_CORE_LEVELS, playerState
 */
class HUD {

    /**
     * @param {Phaser.Scene}  scene
     * @param {StatsSystem}   stats
     */
    constructor(scene, stats) {
        this.scene = scene;
        this.stats = stats;

        this._build();

        scene.events.on('manacore:changed', this._refreshMana,  this);
        scene.events.on('stats:changed',    this._refreshStats,  this);
        scene.events.on('player:levelup',   this._refreshStats,  this);
    }

    destroy() {
        this.scene.events.off('manacore:changed', this._refreshMana,  this);
        this.scene.events.off('stats:changed',    this._refreshStats,  this);
        this.scene.events.off('player:levelup',   this._refreshStats,  this);
    }

    // ----------------------------------------------------------------
    // Construction
    // ----------------------------------------------------------------

    _build() {
        const X = 10, Y = 10;
        const W = 284, H = 120;

        // Fond
        this.scene.add.rectangle(X, Y, W, H, 0x000000, 0.72)
            .setOrigin(0).setScrollFactor(0).setDepth(100);

        // — Mana Core —
        this._txtCore = this.scene.add.text(X + 12, Y + 10, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
        }).setScrollFactor(0).setDepth(101);

        // Fond barre XP Mana Core
        this.scene.add.rectangle(X + 12, Y + 30, W - 24, 8, 0x222233)
            .setOrigin(0).setScrollFactor(0).setDepth(101);
        this._barMana = this.scene.add.rectangle(X + 12, Y + 30, 0, 8, 0x5533aa)
            .setOrigin(0).setScrollFactor(0).setDepth(102);
        this._barManaW = W - 24;

        // — HP joueur —
        this._txtHP = this.scene.add.text(X + 12, Y + 46, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#dd4444',
        }).setScrollFactor(0).setDepth(101);

        // Fond barre HP
        this.scene.add.rectangle(X + 12, Y + 62, W - 24, 8, 0x331111)
            .setOrigin(0).setScrollFactor(0).setDepth(101);
        this._barHP = this.scene.add.rectangle(X + 12, Y + 62, 0, 8, 0xee2222)
            .setOrigin(0).setScrollFactor(0).setDepth(102);
        this._barHPW = W - 24;

        // — Niveau joueur —
        this._txtLevel = this.scene.add.text(X + 12, Y + 78, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#aabbcc',
        }).setScrollFactor(0).setDepth(101);

        // — Contrôles —
        this.scene.add.text(X + 12, Y + 98, 'ZQSD/↑↓←→ · Clic/⚡ sort · [P] stats', {
            fontFamily: 'monospace', fontSize: '9px', color: '#334455',
        }).setScrollFactor(0).setDepth(101);

        this._refreshMana();
        this._refreshStats();
    }

    // ----------------------------------------------------------------
    // Rafraîchissement
    // ----------------------------------------------------------------

    _refreshMana() {
        const core   = playerState.coreData;
        const maxLvl = MANA_CORE_LEVELS.length - 1;
        const next   = MANA_CORE_LEVELS[Math.min(playerState.manaCoreLevel + 1, maxLvl)];
        const suffix = playerState.manaCoreLevel >= maxLvl ? ' ✦ MAX' : '';

        this._txtCore
            .setText(`Mana Core [${core.name.toUpperCase()}] Niv.${core.level}  XP:${playerState.manaXP}/${next.xpRequired}${suffix}`)
            .setStyle({ color: core.hex });

        const xpInLvl = playerState.manaXP - core.xpRequired;
        const xpSpan  = next.xpRequired    - core.xpRequired;
        const ratio   = playerState.manaCoreLevel >= maxLvl
            ? 1 : Math.min(xpInLvl / Math.max(xpSpan, 1), 1);
        this._barMana.setSize(Math.max(0, this._barManaW * ratio), 8).setFillStyle(core.color);
    }

    _refreshStats() {
        if (!this.stats) return;
        const hp    = this.stats.currentHP;
        const maxHP = this.stats.maxHP;
        const ratio = maxHP > 0 ? hp / maxHP : 0;

        // Couleur HP : vert → orange → rouge
        const hpColor = ratio > 0.5 ? 0x22cc55 : ratio > 0.25 ? 0xff9900 : 0xee2222;

        this._txtHP.setText(`HP  ${hp} / ${maxHP}`);
        this._barHP.setSize(Math.max(0, this._barHPW * ratio), 8).setFillStyle(hpColor);

        const xpNeeded = Math.floor(100 * Math.pow(1.15, this.stats.playerLevel - 1));
        this._txtLevel.setText(
            `Joueur  Niv.${this.stats.playerLevel}  ` +
            `XP:${this.stats.playerXP}/${xpNeeded}  ` +
            (this.stats.freePoints > 0 ? `✦ ${this.stats.freePoints} pts libres` : ''),
        );
    }
}
