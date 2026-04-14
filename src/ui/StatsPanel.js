/**
 * STATS PANEL — Overlay d'allocation des statistiques
 *
 * Panel centré sur l'écran, visible sur demande.
 * Affiche :
 *   - Niveau joueur + barre XP
 *   - Points libres à allouer
 *   - 6 stats avec : passif (Mana Core) | base alloué | cap | [+]
 *   - Stats dérivées calculées en temps réel
 *
 * Ouverture / fermeture :
 *   - Touche  [P]  (clavier)
 *   - Bouton  ≡   (mobile, émet 'mobile:menu')
 *   - Bouton  [Fermer] dans le panel
 *
 * Mise à jour automatique sur 'stats:changed' et 'player:levelup'.
 *
 * TODO : ajouter un onglet "Équipement" et un onglet "Sorts".
 * TODO : ajouter des tooltips au survol des stats (description + effets).
 *
 * Dépend de (globals) : STAT_KEYS, STAT_LABELS, STAT_ICONS, playerState
 */

const PANEL_W     = 390;
const PANEL_H     = 480;
const PANEL_DEPTH = 300;

class StatsPanel {

    /**
     * @param {Phaser.Scene}  scene
     * @param {StatsSystem}   stats
     */
    constructor(scene, stats) {
        this.scene   = scene;
        this.stats   = stats;
        this._open   = false;

        // Éléments créés dans _build()
        this._elements     = [];  // tout ce qui doit être show/hide
        this._interactive  = [];  // éléments avec interactivité à activer/désactiver
        this._statRows     = [];  // { key, txtTotal, txtBase, txtPassive, txtCap, btn }
        this._dynamicTexts = [];  // { obj, fn } — mis à jour à chaque refresh

        this._build();
        this.hide(); // fermé par défaut

        // Écoute
        scene.events.on('stats:changed',  this._refresh, this);
        scene.events.on('player:levelup', this._refresh, this);
        scene.events.on('mobile:menu',    this.toggle,   this);

        // Touche P
        this._keyP = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this._keyP.on('down', this.toggle, this);
    }

    toggle() { this._open ? this.hide() : this.show(); }

    show() {
        this._open = true;
        this._elements.forEach(e => e.setVisible(true));
        this._interactive.forEach(e => e.setInteractive());
        this._refresh();
    }

    hide() {
        this._open = false;
        this._elements.forEach(e => e.setVisible(false));
        this._interactive.forEach(e => e.disableInteractive());
    }

    destroy() {
        scene.events.off('stats:changed',  this._refresh, this);
        scene.events.off('player:levelup', this._refresh, this);
        scene.events.off('mobile:menu',    this.toggle,   this);
    }

    // ----------------------------------------------------------------
    // Construction du panel (appelé une seule fois)
    // ----------------------------------------------------------------

    _build() {
        const W  = this.scene.scale.width;
        const H  = this.scene.scale.height;
        const px = Math.floor((W - PANEL_W) / 2);
        const py = Math.floor((H - PANEL_H) / 2);

        // — Fond semi-transparent plein écran (bloque les clics derrière) —
        const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.65)
            .setOrigin(0).setScrollFactor(0).setDepth(PANEL_DEPTH).setInteractive();
        this._elements.push(overlay);
        this._interactive.push(overlay); // ← doit être dans _interactive pour que hide() le désactive

        // — Corps du panel —
        const bg = this.scene.add.rectangle(px, py, PANEL_W, PANEL_H, 0x0a0a1a, 0.97)
            .setOrigin(0).setScrollFactor(0).setDepth(PANEL_DEPTH + 1);
        const border = this.scene.add.rectangle(px, py, PANEL_W, PANEL_H)
            .setOrigin(0).setScrollFactor(0).setDepth(PANEL_DEPTH + 1)
            .setStrokeStyle(1, 0x334466, 1).setFillStyle(0x000000, 0);
        this._elements.push(bg, border); // ← border manquait → restait visible après hide()

        let y = py + 14;

        // — Titre —
        this._push(this._txt(px + PANEL_W / 2, y, 'STATISTIQUES', {
            fontSize: '18px', color: '#c0c0ff',
        }).setOrigin(0.5, 0));
        y += 30;

        // — Séparateur —
        this._push(this._sep(px + 10, y, PANEL_W - 20));
        y += 12;

        // — Niveau joueur —
        this._addDynamic(
            this._push(this._txt(px + 14, y, '', { fontSize: '13px', color: '#aabbdd' })),
            () => `Joueur  Niv. ${this.stats.playerLevel}   |   Points libres : ${this.stats.freePoints > 0 ? this.stats.freePoints + ' ✦' : '0'}`,
        );
        y += 20;

        // — Barre XP joueur —
        const xpBg = this.scene.add.rectangle(px + 14, y, PANEL_W - 28, 8, 0x222233)
            .setOrigin(0).setScrollFactor(0).setDepth(PANEL_DEPTH + 2);
        this._xpBar = this.scene.add.rectangle(px + 14, y, 0, 8, 0x4455aa)
            .setOrigin(0).setScrollFactor(0).setDepth(PANEL_DEPTH + 3);
        this._xpBarMaxW = PANEL_W - 28;
        this._xpBarPx   = px + 14;
        this._elements.push(xpBg, this._xpBar);
        y += 16;

        // — Séparateur —
        this._push(this._sep(px + 10, y, PANEL_W - 20));
        y += 12;

        // — En-tête colonnes —
        this._push(this._txt(px + 14,        y, 'Stat',     { fontSize: '10px', color: '#445566' }));
        this._push(this._txt(px + 170,       y, 'Alloué',   { fontSize: '10px', color: '#445566' }));
        this._push(this._txt(px + 220,       y, 'Passif',   { fontSize: '10px', color: '#445566' }));
        this._push(this._txt(px + 274,       y, 'Total/Cap',{ fontSize: '10px', color: '#445566' }));
        y += 16;

        // — Lignes de stats —
        STAT_KEYS.forEach(key => {
            this._buildStatRow(key, px, y);
            y += 34;
        });

        // — Séparateur —
        this._push(this._sep(px + 10, y, PANEL_W - 20));
        y += 12;

        // — Stats dérivées (2 colonnes) —
        const derived = [
            { label: 'HP max',    fn: () => `${this.stats.maxHP}` },
            { label: 'Vitesse',   fn: () => `${Math.round(this.stats.moveSpeed)}` },
            { label: 'Critique',  fn: () => `${(this.stats.critChance * 100).toFixed(1)}%` },
            { label: 'Crit ×',    fn: () => `×${this.stats.critMult.toFixed(2)}` },
            { label: 'Bonus XP',  fn: () => `+${((this.stats.xpBonus - 1) * 100).toFixed(1)}%` },
            { label: 'MAG ×',     fn: () => `×${this.stats.magMultiplier.toFixed(2)}` },
        ];

        for (let i = 0; i < derived.length; i += 2) {
            const d1 = derived[i];
            const d2 = derived[i + 1];
            const colX1 = px + 14;
            const colX2 = px + PANEL_W / 2 + 10;
            const rowY  = y;

            this._push(this._txt(colX1, rowY, d1.label + ' :', { fontSize: '11px', color: '#556677' }));
            this._addDynamic(
                this._push(this._txt(colX1 + 78, rowY, '', { fontSize: '11px', color: '#99bbdd' })),
                d1.fn,
            );

            if (d2) {
                this._push(this._txt(colX2, rowY, d2.label + ' :', { fontSize: '11px', color: '#556677' }));
                this._addDynamic(
                    this._push(this._txt(colX2 + 78, rowY, '', { fontSize: '11px', color: '#99bbdd' })),
                    d2.fn,
                );
            }
            y += 18;
        }

        // — Bouton Fermer —
        y += 4;
        const closeBtn = this.scene.add.text(
            px + PANEL_W / 2, y + 12,
            '[ Fermer  P ]',
            { fontFamily: 'monospace', fontSize: '13px', color: '#8899aa',
              backgroundColor: '#111122', padding: { x: 12, y: 6 } },
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(PANEL_DEPTH + 2).setInteractive();

        closeBtn.on('pointerdown', () => this.hide());
        closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
        closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#8899aa' }));
        this._elements.push(closeBtn);
        this._interactive.push(closeBtn);
    }

    _buildStatRow(key, px, y) {
        const D = PANEL_DEPTH + 2;
        const col = { icon: px + 14, label: px + 32, alloc: px + 172, pass: px + 222, total: px + 276, btn: px + 340 };

        // Icône + label
        this._push(this._txt(col.icon,  y + 8, STAT_ICONS[key],  { fontSize: '14px' }).setOrigin(0, 0.5));
        this._push(this._txt(col.label, y + 8, STAT_LABELS[key], { fontSize: '12px', color: '#ccddee' }).setOrigin(0, 0.5));

        // Valeur allouée
        const txtBase = this._push(this._txt(col.alloc, y + 8, '', { fontSize: '13px', color: '#ffffff' }).setOrigin(0, 0.5));

        // Passif (Mana Core, vert pâle)
        const txtPass = this._push(this._txt(col.pass, y + 8, '', { fontSize: '11px', color: '#44cc88' }).setOrigin(0, 0.5));

        // Total / Cap
        const txtTot = this._push(this._txt(col.total, y + 8, '', { fontSize: '11px', color: '#778899' }).setOrigin(0, 0.5));

        // Bouton [+]
        const btn = this.scene.add.text(col.btn, y + 8, ' + ', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
            backgroundColor: '#223355', padding: { x: 5, y: 3 },
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D).setInteractive();

        btn.on('pointerdown', () => { if (this.stats.allocate(key)) this._refresh(); });
        btn.on('pointerover', () => btn.setStyle({ color: '#ffff88' }));
        btn.on('pointerout',  () => this._refreshBtnStyle(btn, key));

        this._elements.push(btn);
        this._interactive.push(btn);
        this._statRows.push({ key, txtBase, txtPass, txtTot, btn });
    }

    // ----------------------------------------------------------------
    // Refresh (mis à jour à chaque événement stats:changed)
    // ----------------------------------------------------------------

    _refresh() {
        if (!this._open) return;

        // XP bar joueur
        const xpNeeded = Math.floor(100 * Math.pow(1.15, this.stats.playerLevel - 1));
        const ratio    = Math.min(this.stats.playerXP / xpNeeded, 1);
        this._xpBar.setSize(Math.max(0, this._xpBarMaxW * ratio), 8);

        // Textes dynamiques
        this._dynamicTexts.forEach(({ obj, fn }) => obj.setText(fn()));

        // Lignes de stats
        this._statRows.forEach(row => {
            const { key, txtBase, txtPass, txtTot, btn } = row;
            txtBase.setText(`${this.stats.base[key]}`);
            txtPass.setText(`+${this.stats.passive[key]}`);
            txtTot.setText(`${this.stats.total(key)} / ${this.stats.cap(key)}`);
            this._refreshBtnStyle(btn, key);
        });
    }

    _refreshBtnStyle(btn, key) {
        const can = this.stats.canAllocate(key);
        btn.setStyle({
            color          : can ? '#ffffff' : '#444455',
            backgroundColor: can ? '#223355' : '#0d0d1a',
        });
    }

    // ----------------------------------------------------------------
    // Utilitaires internes
    // ----------------------------------------------------------------

    /** Crée un texte, l'ajoute à _elements et le retourne. */
    _push(obj) {
        this._elements.push(obj);
        return obj;
    }

    /** Enregistre un texte dynamique mis à jour au refresh. */
    _addDynamic(obj, fn) {
        this._dynamicTexts.push({ obj, fn });
        return obj;
    }

    _txt(x, y, text, style = {}) {
        return this.scene.add.text(x, y, text, {
            fontFamily: 'monospace',
            fontSize  : '12px',
            color     : '#ffffff',
            ...style,
        }).setScrollFactor(0).setDepth(PANEL_DEPTH + 2);
    }

    _sep(x, y, width) {
        const gfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(PANEL_DEPTH + 2);
        gfx.lineStyle(1, 0x334466, 0.7);
        gfx.lineBetween(x, y, x + width, y);
        return gfx;
    }
}
