/**
 * HUD — Heads-Up Display
 *
 * Affiche :
 *   - Mana Core : nom, barre Essence, cap niveau joueur
 *   - HP joueur
 *   - Niveau joueur + XP
 *   - État méditation (indicateur pulsant)
 *   - Inventaire ressources Mana
 *   - Message d'erreur temporaire (blocked)
 *
 * Dépend de (globals) : MANA_CORE_LEVELS, MANA_RESOURCES, playerState
 */
class HUD {

    constructor(scene, stats) {
        this.scene = scene;
        this.stats = stats;

        this._build();

        scene.events.on('manacore:changed',          this._refreshMana,       this);
        scene.events.on('stats:changed',             this._refreshStats,      this);
        scene.events.on('player:levelup',            this._refreshStats,      this);
        scene.events.on('manacore:meditation:start', this._showMeditation,    this);
        scene.events.on('manacore:meditation:stop',  this._hideMeditation,    this);
        scene.events.on('manacore:resource:used',    this._onResourceUsed,    this);
        scene.events.on('manacore:blocked',          this._showBlocked,       this);
    }

    destroy() {
        this.scene.events.off('manacore:changed',          this._refreshMana,    this);
        this.scene.events.off('stats:changed',             this._refreshStats,   this);
        this.scene.events.off('player:levelup',            this._refreshStats,   this);
        this.scene.events.off('manacore:meditation:start', this._showMeditation, this);
        this.scene.events.off('manacore:meditation:stop',  this._hideMeditation, this);
        this.scene.events.off('manacore:resource:used',    this._onResourceUsed, this);
        this.scene.events.off('manacore:blocked',          this._showBlocked,    this);
    }

    _build() {
        const X = 10, Y = 10;
        const W = 300, H = 162;
        const D = 100;

        this.scene.add.rectangle(X, Y, W, H, 0x000000, 0.75)
            .setOrigin(0).setScrollFactor(0).setDepth(D);

        // — Mana Core titre —
        this._txtCore = this.scene.add.text(X + 12, Y + 10, '', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        }).setScrollFactor(0).setDepth(D + 1);

        // — Barre Essence —
        this.scene.add.rectangle(X + 12, Y + 28, W - 24, 7, 0x222233)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1);
        this._barEssence = this.scene.add.rectangle(X + 12, Y + 28, 0, 7, 0x5533aa)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 2);
        this._barEssenceW = W - 24;

        // — Texte essence + cap niveau —
        this._txtEssence = this.scene.add.text(X + 12, Y + 38, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#8877cc',
        }).setScrollFactor(0).setDepth(D + 1);

        // — HP —
        this._txtHP = this.scene.add.text(X + 12, Y + 54, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#dd4444',
        }).setScrollFactor(0).setDepth(D + 1);
        this.scene.add.rectangle(X + 12, Y + 68, W - 24, 7, 0x331111)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1);
        this._barHP  = this.scene.add.rectangle(X + 12, Y + 68, 0, 7, 0xee2222)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 2);
        this._barHPW = W - 24;

        // — Niveau joueur —
        this._txtLevel = this.scene.add.text(X + 12, Y + 82, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#aabbcc',
        }).setScrollFactor(0).setDepth(D + 1);

        // — Inventaire ressources —
        this._txtInventory = this.scene.add.text(X + 12, Y + 98, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#7766aa',
        }).setScrollFactor(0).setDepth(D + 1);

        // — Indicateur méditation —
        this._txtMeditation = this.scene.add.text(X + 12, Y + 114, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#aa66ff',
        }).setScrollFactor(0).setDepth(D + 1).setVisible(false);

        // — Message erreur —
        this._txtBlocked = this.scene.add.text(X + 12, Y + 130, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#ff4444',
        }).setScrollFactor(0).setDepth(D + 1).setVisible(false);

        // — Étage courant —
        const env = DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor] ?? DUNGEON_ENVIRONMENTS[3];
        this.scene.add.text(X + 12, Y + H - 28, `⬡ ${env.label}`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#664422',
        }).setScrollFactor(0).setDepth(D + 1);

        // — Contrôles —
        this.scene.add.text(X + 12, Y + H - 12, 'ZQSD · Clic=sort · M=méditer · P=stats', {
            fontFamily: 'monospace', fontSize: '8px', color: '#334455',
        }).setScrollFactor(0).setDepth(D + 1);

        this._refreshMana();
        this._refreshStats();
        this._refreshInventory();
    }

    _refreshMana() {
        const core    = playerState.coreData;
        const next    = playerState.nextCore;
        const maxLvl  = !next;

        this._txtCore
            .setText(`✦ ${core.name.toUpperCase()} CORE`)
            .setStyle({ color: core.hex });

        const essence = playerState.manaEssence;
        if (maxLvl) {
            this._barEssence.setSize(this._barEssenceW, 7).setFillStyle(core.color);
            this._txtEssence.setText('Mana Core MAX');
        } else {
            const ratio = Math.min(
                (essence - core.essenceRequired) /
                Math.max(next.essenceRequired - core.essenceRequired, 1), 1);
            this._barEssence.setSize(Math.max(0, this._barEssenceW * ratio), 7)
                .setFillStyle(core.color);
            this._txtEssence.setText(
                `Essence ${essence} / ${next.essenceRequired}  ` +
                `· Niveau ${next.playerLevelRequired} requis`
            );
        }
        this._refreshInventory();
    }

    _refreshStats() {
        if (!this.stats) return;
        const hp    = this.stats.currentHP;
        const maxHP = this.stats.maxHP;
        const ratio = maxHP > 0 ? hp / maxHP : 0;
        const hpColor = ratio > 0.5 ? 0x22cc55 : ratio > 0.25 ? 0xff9900 : 0xee2222;
        this._txtHP.setText(`HP  ${hp} / ${maxHP}`);
        this._barHP.setSize(Math.max(0, this._barHPW * ratio), 7).setFillStyle(hpColor);

        const xpNeeded = Math.floor(100 * Math.pow(1.15, this.stats.playerLevel - 1));
        this._txtLevel.setText(
            `Joueur Niv.${this.stats.playerLevel}  XP:${this.stats.playerXP}/${xpNeeded}` +
            (this.stats.freePoints > 0 ? `  ✦${this.stats.freePoints}pts` : '')
        );
    }

    _refreshInventory() {
        const parts = MANA_RESOURCES.map(r => {
            const qty = playerState.inventory[r.id] ?? 0;
            return `${r.icon}${qty}`;
        });
        this._txtInventory.setText('Ressources: ' + parts.join('  '));
    }

    _showMeditation() {
        this._txtMeditation.setText('◉ MÉDITATION EN COURS...').setVisible(true);
        // Pulsation
        this.scene.tweens.add({
            targets: this._txtMeditation, alpha: 0.3,
            duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    _hideMeditation(byDamage) {
        this._txtMeditation.setVisible(false);
        this.scene.tweens.killTweensOf(this._txtMeditation);
        this._txtMeditation.setAlpha(1);
        if (byDamage) {
            this._showBlocked('Méditation interrompue !');
        }
    }

    _onResourceUsed(res) {
        this._refreshInventory();
        this._showBlockedColor(`+${res.essence} Essence (${res.name})`, '#aa66ff');
    }

    _showBlocked(msg) {
        this._showBlockedColor(msg, '#ff4444');
    }

    _showBlockedColor(msg, color) {
        this._txtBlocked.setText(msg).setStyle({ color }).setVisible(true);
        this.scene.tweens.killTweensOf(this._txtBlocked);
        this.scene.tweens.add({
            targets: this._txtBlocked, alpha: 0,
            delay: 2000, duration: 500,
            onComplete: () => {
                this._txtBlocked.setVisible(false).setAlpha(1);
            },
        });
    }
}