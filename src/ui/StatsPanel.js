/**
 * STATS PANEL — Deux onglets : STATS et INVENTAIRE
 *
 * Onglet STATS :
 *   - Niveau joueur + barre XP + points libres
 *   - 6 stats allouables avec cap Mana Core
 *   - Stats dérivées
 *
 * Onglet INVENTAIRE :
 *   - Mana Core actuel + barre Essence + niveau requis suivant
 *   - Ressources en stock avec bouton [Utiliser]
 *   - Méditation : bouton démarrer/arrêter
 *
 * Ouverture : [P] clavier ou bouton ≡ mobile
 *
 * Dépend de (globals) : STAT_KEYS, STAT_LABELS, STAT_ICONS,
 *                       MANA_CORE_LEVELS, MANA_RESOURCES, playerState
 */

const PANEL_W     = 400;
const PANEL_H     = 520;
const PANEL_DEPTH = 300;
const TAB_STATS    = 'stats';
const TAB_INV      = 'inventory';
const TAB_SETTINGS = 'settings';

class StatsPanel {

    constructor(scene, stats) {
        this.scene  = scene;
        this.stats  = stats;
        this._open  = false;
        this._tab   = TAB_STATS;

        this._elements    = [];
        this._interactive = [];
        this._statRows    = [];
        this._dynamicTexts= [];

        // Éléments spécifiques à chaque onglet
        this._tabStatsEls    = [];
        this._tabInvEls      = [];
        this._tabSettingsEls = [];

        this._build();
        this.hide();

        scene.events.on('stats:changed',      this._refresh,      this);
        scene.events.on('player:levelup',     this._refresh,      this);
        scene.events.on('manacore:changed',   this._refreshInv,   this);
        scene.events.on('mobile:menu',        this.toggle,        this);
        scene.events.on('manacore:meditation:start', this._refreshInv, this);
        scene.events.on('manacore:meditation:stop',  this._refreshInv, this);

        this._keyP = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this._keyP.on('down', this.toggle, this);
    }

    toggle() { this._open ? this.hide() : this.show(); }

    show() {
        this._open = true;
        this._elements.forEach(e => e.setVisible(true));
        this._interactive.forEach(e => e.setInteractive());
        this._switchTab(this._tab);
        this._refresh();
        this._refreshInv();
        this._refreshSettings();
    }

    hide() {
        this._open = false;
        this._elements.forEach(e => e.setVisible(false));
        this._interactive.forEach(e => e.disableInteractive());
    }

    // ----------------------------------------------------------------
    // Construction
    // ----------------------------------------------------------------

    _build() {
        const W  = this.scene.scale.width;
        const H  = this.scene.scale.height;
        const px = Math.floor((W - PANEL_W) / 2);
        const py = Math.floor((H - PANEL_H) / 2);
        const D  = PANEL_DEPTH;

        // Overlay
        const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.70)
            .setOrigin(0).setScrollFactor(0).setDepth(D).setInteractive();
        this._elements.push(overlay);
        this._interactive.push(overlay);

        // Fond + bordure
        const bg = this.scene.add.rectangle(px, py, PANEL_W, PANEL_H, 0x080814, 0.98)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1);
        const border = this.scene.add.rectangle(px, py, PANEL_W, PANEL_H)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1)
            .setStrokeStyle(1, 0x334466, 1).setFillStyle(0, 0);
        this._elements.push(bg, border);

        // ── Onglets ──
        const tabY   = py + 8;
        const tabW   = 120;
        const tabH   = 28;

        this._tabStatsBtn = this._makeTabButton(
            px + 10, tabY, tabW, tabH, '⚔ STATS',
            () => this._switchTab(TAB_STATS)
        );
        this._tabInvBtn = this._makeTabButton(
            px + 10 + tabW + 8, tabY, tabW, tabH, '◆ INVENTAIRE',
            () => this._switchTab(TAB_INV)
        );
        this._tabSettingsBtn = this._makeTabButton(
            px + 10 + (tabW + 8) * 2, tabY, tabW, tabH, '⚙ RÉGLAGES',
            () => this._switchTab(TAB_SETTINGS)
        );

        this._push(this._sep(px + 10, tabY + tabH + 6, PANEL_W - 20));

        const contentY = tabY + tabH + 16;

        // ── Contenu onglet STATS ──
        this._buildTabStats(px, contentY);

        // ── Contenu onglet INVENTAIRE ──
        this._buildTabInventory(px, contentY);

        // ── Contenu onglet SETTINGS ──
        this._buildTabSettings(px, contentY);

        // ── Bouton Fermer ──
        const closeY = py + PANEL_H - 36;
        const closeBtn = this.scene.add.text(
            px + PANEL_W / 2, closeY,
            '[ Fermer  P ]',
            { fontFamily: 'monospace', fontSize: '12px', color: '#8899aa',
              backgroundColor: '#111122', padding: { x: 12, y: 5 } },
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 2).setInteractive();
        closeBtn.on('pointerdown', () => this.hide());
        closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
        closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#8899aa' }));
        this._elements.push(closeBtn);
        this._interactive.push(closeBtn);
    }

    _makeTabButton(x, y, w, h, label, onClick) {
        const D = PANEL_DEPTH + 2;
        const bg = this.scene.add.rectangle(x, y, w, h, 0x1a1a33, 0.9)
            .setOrigin(0).setScrollFactor(0).setDepth(D);
        const txt = this.scene.add.text(x + w / 2, y + h / 2, label, {
            fontFamily: 'monospace', fontSize: '11px', color: '#8899aa',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1);
        const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h)
            .setScrollFactor(0).setDepth(D + 2).setInteractive();
        zone.on('pointerdown', onClick);
        zone.on('pointerover', () => txt.setStyle({ color: '#ffffff' }));
        zone.on('pointerout',  () => {/* style mis par _switchTab */});
        this._elements.push(bg, txt, zone);
        this._interactive.push(zone);
        return { bg, txt };
    }

    _switchTab(tab) {
        this._tab = tab;
        const D = PANEL_DEPTH + 2;

        // Style onglets
        const activeColor   = '#ffffff';
        const inactiveColor = '#556677';
        const activeBg      = 0x2a1a55;
        const inactiveBg    = 0x111122;

        if (this._tabStatsBtn) {
            const on = tab === TAB_STATS;
            this._tabStatsBtn.txt.setStyle({ color: on ? activeColor : inactiveColor });
            this._tabStatsBtn.bg.setFillStyle(on ? activeBg : inactiveBg, 0.9);
        }
        if (this._tabInvBtn) {
            const on = tab === TAB_INV;
            this._tabInvBtn.txt.setStyle({ color: on ? activeColor : inactiveColor });
            this._tabInvBtn.bg.setFillStyle(on ? activeBg : inactiveBg, 0.9);
        }
        if (this._tabSettingsBtn) {
            const on = tab === TAB_SETTINGS;
            this._tabSettingsBtn.txt.setStyle({ color: on ? activeColor : inactiveColor });
            this._tabSettingsBtn.bg.setFillStyle(on ? activeBg : inactiveBg, 0.9);
        }

        // Afficher/masquer les contenus
        this._tabStatsEls.forEach(e    => e.setVisible(tab === TAB_STATS));
        this._tabInvEls.forEach(e      => e.setVisible(tab === TAB_INV));
        this._tabSettingsEls.forEach(e => e.setVisible(tab === TAB_SETTINGS));

        if (tab === TAB_STATS)    this._refresh();
        else if (tab === TAB_INV) this._refreshInv();
        else                      this._refreshSettings();
    }

    // ──────────────────────────────────────────────────────────────
    // Onglet STATS
    // ──────────────────────────────────────────────────────────────

    _buildTabStats(px, startY) {
        const push = (o) => { this._tabStatsEls.push(o); this._elements.push(o); return o; };
        const D = PANEL_DEPTH + 2;
        let y = startY;

        // Niveau + points libres
        const txtLvl = push(this._txt(px + 14, y, '', { fontSize: '12px', color: '#aabbdd' }));
        this._addDynamic(txtLvl, () =>
            `Niv. ${this.stats.playerLevel}   Points libres : ${this.stats.freePoints > 0 ? this.stats.freePoints + ' ✦' : '0'}`
        );
        y += 18;

        // Barre XP
        const xpBg = push(this.scene.add.rectangle(px + 14, y, PANEL_W - 28, 6, 0x222233)
            .setOrigin(0).setScrollFactor(0).setDepth(D));
        this._xpBar = push(this.scene.add.rectangle(px + 14, y, 0, 6, 0x4455aa)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1));
        this._xpBarMaxW = PANEL_W - 28;
        y += 14;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 10;

        // En-têtes
        push(this._txt(px + 14,  y, 'Stat',      { fontSize: '10px', color: '#445566' }));
        push(this._txt(px + 175, y, 'Alloué',    { fontSize: '10px', color: '#445566' }));
        push(this._txt(px + 225, y, 'Passif',    { fontSize: '10px', color: '#445566' }));
        push(this._txt(px + 278, y, 'Total/Cap', { fontSize: '10px', color: '#445566' }));
        y += 15;

        // Lignes stats
        STAT_KEYS.forEach(key => {
            this._buildStatRow(key, px, y, push);
            y += 32;
        });

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 10;

        // Stats dérivées
        const derived = [
            { label: 'HP max',   fn: () => `${this.stats.maxHP}` },
            { label: 'Vitesse',  fn: () => `${Math.round(this.stats.moveSpeed)}` },
            { label: 'Crit %',   fn: () => `${(this.stats.critChance * 100).toFixed(1)}%` },
            { label: 'Crit ×',   fn: () => `×${this.stats.critMult.toFixed(2)}` },
            { label: 'XP bonus', fn: () => `+${((this.stats.xpBonus - 1) * 100).toFixed(1)}%` },
            { label: 'MAG ×',    fn: () => `×${this.stats.magMultiplier.toFixed(2)}` },
        ];
        for (let i = 0; i < derived.length; i += 2) {
            const c1 = px + 14, c2 = px + PANEL_W / 2 + 10;
            push(this._txt(c1, y, derived[i].label + ' :', { fontSize: '10px', color: '#556677' }));
            this._addDynamic(push(this._txt(c1 + 72, y, '', { fontSize: '10px', color: '#99bbdd' })), derived[i].fn);
            if (derived[i + 1]) {
                push(this._txt(c2, y, derived[i + 1].label + ' :', { fontSize: '10px', color: '#556677' }));
                this._addDynamic(push(this._txt(c2 + 72, y, '', { fontSize: '10px', color: '#99bbdd' })), derived[i + 1].fn);
            }
            y += 16;
        }
    }

    _buildStatRow(key, px, y, push) {
        const D   = PANEL_DEPTH + 2;
        const col = { icon: px + 14, label: px + 32, alloc: px + 178, pass: px + 228, total: px + 280, btn: px + 344 };

        push(this._txt(col.icon,  y + 7, STAT_ICONS[key],  { fontSize: '13px' }).setOrigin(0, 0.5));
        push(this._txt(col.label, y + 7, STAT_LABELS[key], { fontSize: '11px', color: '#ccddee' }).setOrigin(0, 0.5));

        const txtBase = push(this._txt(col.alloc, y + 7, '', { fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0.5));
        const txtPass = push(this._txt(col.pass,  y + 7, '', { fontSize: '10px', color: '#44cc88' }).setOrigin(0, 0.5));
        const txtTot  = push(this._txt(col.total, y + 7, '', { fontSize: '10px', color: '#778899' }).setOrigin(0, 0.5));

        const btn = this.scene.add.text(col.btn, y + 7, ' + ', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
            backgroundColor: '#223355', padding: { x: 4, y: 2 },
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D).setInteractive();

        btn.on('pointerdown', () => { if (this.stats.allocate(key)) this._refresh(); });
        btn.on('pointerover', () => btn.setStyle({ color: '#ffff88' }));
        btn.on('pointerout',  () => this._refreshBtnStyle(btn, key));

        push(btn);
        this._elements.push(btn);
        this._interactive.push(btn);
        this._statRows.push({ key, txtBase, txtPass, txtTot, btn });
    }

    // ──────────────────────────────────────────────────────────────
    // Onglet INVENTAIRE
    // ──────────────────────────────────────────────────────────────

    _buildTabInventory(px, startY) {
        const push = (o) => { this._tabInvEls.push(o); this._elements.push(o); return o; };
        const D = PANEL_DEPTH + 2;
        let y = startY;

        // Mana Core actuel
        this._invTxtCore = push(this._txt(px + 14, y, '', { fontSize: '13px', color: '#aa88ff' }));
        y += 18;

        // Barre Essence
        push(this.scene.add.rectangle(px + 14, y, PANEL_W - 28, 8, 0x1a1a33)
            .setOrigin(0).setScrollFactor(0).setDepth(D));
        this._invBarEssence = push(this.scene.add.rectangle(px + 14, y, 0, 8, 0x5533aa)
            .setOrigin(0).setScrollFactor(0).setDepth(D + 1));
        this._invBarEssenceW = PANEL_W - 28;
        y += 12;

        this._invTxtEssence = push(this._txt(px + 14, y, '', { fontSize: '10px', color: '#7766aa' }));
        y += 14;

        // Niveau requis suivant
        this._invTxtNextReq = push(this._txt(px + 14, y, '', { fontSize: '10px', color: '#cc9944' }));
        y += 16;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 10;

        // Bouton méditation
        this._invBtnMedit = this.scene.add.text(
            px + PANEL_W / 2, y, '[ 🧘 DÉMARRER MÉDITATION  M ]',
            { fontFamily: 'monospace', fontSize: '12px', color: '#aa66ff',
              backgroundColor: '#1a0a33', padding: { x: 10, y: 6 } },
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D).setInteractive();
        this._invBtnMedit.on('pointerdown', () => {
            const mana = this.scene.player?.mana;
            if (!mana) return;
            mana.toggleMeditation(this.scene);
            this._refreshInv();
        });
        this._invBtnMedit.on('pointerover', () => this._invBtnMedit.setStyle({ color: '#ffffff' }));
        this._invBtnMedit.on('pointerout',  () => this._invBtnMedit.setStyle({ color: '#aa66ff' }));
        push(this._invBtnMedit);
        this._elements.push(this._invBtnMedit);
        this._interactive.push(this._invBtnMedit);
        y += 36;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 10;

        // Titre ressources
        push(this._txt(px + 14, y, 'RESSOURCES DE MANA', { fontSize: '11px', color: '#556677' }));
        y += 18;

        // Lignes ressources (une par type)
        this._invResourceRows = [];
        for (const res of MANA_RESOURCES) {
            const row = this._buildResourceRow(res, px, y, push);
            this._invResourceRows.push(row);
            y += 38;
        }
    }

    _buildResourceRow(res, px, y, push) {
        const D = PANEL_DEPTH + 2;

        // Fond de ligne
        const rowBg = push(this.scene.add.rectangle(px + 10, y, PANEL_W - 20, 32, 0x0d0d22, 0.7)
            .setOrigin(0).setScrollFactor(0).setDepth(D));

        // Icône + nom
        push(this._txt(px + 18, y + 9, res.icon, { fontSize: '16px', color: res.color }).setOrigin(0, 0.5));
        push(this._txt(px + 38, y + 7,  res.name,   { fontSize: '11px', color: '#ccddee' }).setOrigin(0, 0.5));
        push(this._txt(px + 38, y + 19, `+${res.essence} Essence`, { fontSize: '9px', color: '#7766aa' }).setOrigin(0, 0.5));

        // Quantité
        const txtQty = push(this._txt(px + 248, y + 9, '', { fontSize: '13px', color: '#ffffff' }).setOrigin(0, 0.5));

        // Bouton Utiliser
        const btn = this.scene.add.text(px + 300, y + 9, '[ UTILISER ]', {
            fontFamily: 'monospace', fontSize: '10px', color: '#aa66ff',
            backgroundColor: '#1a0a33', padding: { x: 6, y: 3 },
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D).setInteractive();

        btn.on('pointerdown', () => {
            this.scene.player?.mana.useResource(res.id, this.scene);
            this._refreshInv();
        });
        btn.on('pointerover', () => btn.setStyle({ color: '#ffffff' }));
        btn.on('pointerout',  () => btn.setStyle({ color: '#aa66ff' }));

        push(btn);
        this._elements.push(btn);
        this._interactive.push(btn);

        return { res, txtQty, btn };
    }

    // ──────────────────────────────────────────────────────────────
    // Refresh
    // ──────────────────────────────────────────────────────────────

    _refresh() {
        if (!this._open || this._tab !== TAB_STATS) return;

        const xpNeeded = Math.floor(100 * Math.pow(1.15, this.stats.playerLevel - 1));
        const ratio    = Math.min(this.stats.playerXP / xpNeeded, 1);
        this._xpBar?.setSize(Math.max(0, this._xpBarMaxW * ratio), 6);

        this._dynamicTexts.forEach(({ obj, fn }) => obj.setText(fn()));

        this._statRows.forEach(({ key, txtBase, txtPass, txtTot, btn }) => {
            txtBase.setText(`${this.stats.base[key]}`);
            txtPass.setText(`+${this.stats.passive[key]}`);
            txtTot.setText(`${this.stats.total(key)} / ${this.stats.cap(key)}`);
            this._refreshBtnStyle(btn, key);
        });
    }

    _refreshInv() {
        if (!this._open || this._tab !== TAB_INV) return;

        const core    = playerState.coreData;
        const next    = playerState.nextCore;
        const essence = playerState.manaEssence;

        this._invTxtCore?.setText(`✦ ${core.name.toUpperCase()} CORE  (Niv. ${core.level})`)
            .setStyle({ color: core.hex });

        if (next) {
            const span  = next.essenceRequired - core.essenceRequired;
            const done  = essence - core.essenceRequired;
            const ratio = Math.min(Math.max(done / Math.max(span, 1), 0), 1);
            this._invBarEssence?.setSize(Math.max(0, this._invBarEssenceW * ratio), 8).setFillStyle(core.color);
            this._invTxtEssence?.setText(`Essence : ${essence} / ${next.essenceRequired}`);
            this._invTxtNextReq?.setText(`Prochain rang (${next.name}) · Niveau joueur requis : ${next.playerLevelRequired}`);
        } else {
            this._invBarEssence?.setSize(this._invBarEssenceW, 8).setFillStyle(core.color);
            this._invTxtEssence?.setText(`Essence : ${essence}  ✦ MAX`);
            this._invTxtNextReq?.setText('');
        }

        // État méditation
        const isMedit = this.scene.player?.mana?.isMeditating ?? false;
        this._invBtnMedit?.setText(isMedit ? '[ ⏹ ARRÊTER MÉDITATION  M ]' : '[ 🧘 DÉMARRER MÉDITATION  M ]')
            .setStyle({ color: isMedit ? '#ff6644' : '#aa66ff',
                        backgroundColor: isMedit ? '#330000' : '#1a0a33' });

        // Ressources
        this._invResourceRows?.forEach(({ res, txtQty, btn }) => {
            const qty = playerState.inventory[res.id] ?? 0;
            txtQty.setText(`×${qty}`).setStyle({ color: qty > 0 ? '#ffffff' : '#444455' });
            btn.setStyle({
                color          : qty > 0 ? '#aa66ff' : '#333344',
                backgroundColor: qty > 0 ? '#1a0a33' : '#0d0d1a',
            });
        });
    }

    _refreshBtnStyle(btn, key) {
        const can = this.stats.canAllocate(key);
        btn.setStyle({ color: can ? '#ffffff' : '#444455', backgroundColor: can ? '#223355' : '#0d0d1a' });
    }

    // ──────────────────────────────────────────────────────────────
    // Utilitaires
    // ──────────────────────────────────────────────────────────────


    // ──────────────────────────────────────────────────────────────
    // Onglet RÉGLAGES — Audio + diagnostics
    // ──────────────────────────────────────────────────────────────

    _buildTabSettings(px, startY) {
        const push = (o) => { this._tabSettingsEls.push(o); this._elements.push(o); return o; };
        const D = PANEL_DEPTH + 2;
        let y = startY;

        // Titre section
        push(this._txt(px + 14, y, '🔊  AUDIO', { fontSize: '13px', color: '#aabbff' }));
        y += 24;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 12;

        // Statut AudioContext
        this._settingsTxtStatus = push(this._txt(px + 14, y, '', { fontSize: '11px', color: '#778899' }));
        y += 18;

        // Bouton Activer/Désactiver son
        this._settingsBtnToggle = this.scene.add.text(
            px + PANEL_W / 2, y, '[ 🔊  SON ACTIVÉ ]',
            { fontFamily: 'monospace', fontSize: '13px', color: '#44cc88',
              backgroundColor: '#0a2a1a', padding: { x: 12, y: 7 } }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D).setInteractive();

        this._settingsBtnToggle.on('pointerdown', () => this._toggleAudio());
        this._settingsBtnToggle.on('pointerover',  () => this._settingsBtnToggle.setAlpha(0.7));
        this._settingsBtnToggle.on('pointerout',   () => this._settingsBtnToggle.setAlpha(1));
        push(this._settingsBtnToggle);
        this._elements.push(this._settingsBtnToggle);
        this._interactive.push(this._settingsBtnToggle);
        y += 40;

        // Bouton Test son (crée son propre AudioContext indépendant)
        const btnTest = this.scene.add.text(
            px + PANEL_W / 2, y, '[ ▶  TESTER LE SON ]',
            { fontFamily: 'monospace', fontSize: '13px', color: '#ffcc44',
              backgroundColor: '#2a1a00', padding: { x: 12, y: 7 } }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D).setInteractive();

        btnTest.on('pointerdown', () => this._playSoundTest());
        btnTest.on('pointerover',  () => btnTest.setAlpha(0.7));
        btnTest.on('pointerout',   () => btnTest.setAlpha(1));
        push(btnTest);
        this._elements.push(btnTest);
        this._interactive.push(btnTest);
        y += 40;

        // Résultat du test
        this._settingsTxtResult = push(this._txt(px + PANEL_W / 2, y, '',
            { fontSize: '10px', color: '#778899' }).setOrigin(0.5, 0));
        y += 24;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 12;

        // Volume master (slider textuel)
        push(this._txt(px + 14, y, 'Volume master :', { fontSize: '11px', color: '#8899aa' }));
        y += 18;

        const volBtns = [
            { label: '25%', val: 0.25 }, { label: '50%', val: 0.50 },
            { label: '75%', val: 0.75 }, { label: '100%', val: 1.00 },
        ];
        this._volBtns = [];
        volBtns.forEach((vb, i) => {
            const bx = px + 14 + i * 88;
            const btn = this.scene.add.text(bx, y, `[ ${vb.label} ]`, {
                fontFamily: 'monospace', fontSize: '11px', color: '#8899aa',
                backgroundColor: '#111122', padding: { x: 6, y: 4 },
            }).setScrollFactor(0).setDepth(D).setInteractive();
            btn.on('pointerdown', () => this._setVolume(vb.val));
            btn.on('pointerover',  () => btn.setAlpha(0.7));
            btn.on('pointerout',   () => btn.setAlpha(1));
            push(btn);
            this._elements.push(btn);
            this._interactive.push(btn);
            this._volBtns.push({ btn, val: vb.val });
        });
        y += 36;

        push(this._sep(px + 10, y, PANEL_W - 20)); y += 12;

        // Info debug
        push(this._txt(px + 14, y, 'Debug audio :', { fontSize: '10px', color: '#445566' }));
        y += 16;
        this._settingsTxtDebug = push(this._txt(px + 14, y, '', { fontSize: '9px', color: '#334455' }));
    }

    _refreshSettings() {
        if (!this._open || this._tab !== TAB_SETTINGS) return;

        const audio = this.scene.audio;
        const ctx   = audio?._ctx;

        // Statut AudioContext
        let statusMsg, statusColor;
        if (!ctx) {
            statusMsg   = '⚠ AudioContext non initialisé — touchez l\'écran';
            statusColor = '#ff9944';
        } else if (ctx.state === 'running') {
            statusMsg   = '✓ AudioContext actif (' + ctx.state + ')';
            statusColor = '#44cc88';
        } else {
            statusMsg   = '⚠ AudioContext : ' + ctx.state;
            statusColor = '#ff6644';
        }
        this._settingsTxtStatus?.setText(statusMsg).setStyle({ color: statusColor });

        // Bouton toggle son
        const muted = audio?.muted ?? false;
        this._settingsBtnToggle?.setText(muted ? '[ 🔇  SON DÉSACTIVÉ ]' : '[ 🔊  SON ACTIVÉ ]')
            .setStyle({ color: muted ? '#ff6644' : '#44cc88',
                        backgroundColor: muted ? '#2a0a0a' : '#0a2a1a' });

        // Volume courant
        const vol = audio?._master?.gain.value ?? AUDIO_CONFIG?.master ?? 0.72;
        this._volBtns?.forEach(({ btn, val }) => {
            const active = Math.abs(val - vol) < 0.01;
            btn.setStyle({ color: active ? '#ffffff' : '#8899aa',
                           backgroundColor: active ? '#223355' : '#111122' });
        });

        // Debug info
        if (ctx) {
            this._settingsTxtDebug?.setText(
                `sampleRate: ${ctx.sampleRate}Hz  latency: ${(ctx.baseLatency * 1000).toFixed(1)}ms\n` +
                `state: ${ctx.state}  ready: ${audio._ready}  muted: ${audio.muted}`
            );
        } else {
            this._settingsTxtDebug?.setText('Pas de contexte audio actif.');
        }
    }

    _toggleAudio() {
        const audio = this.scene.audio;
        if (!audio) return;

        if (!audio._ctx) {
            // Forcer init depuis le panel
            audio._initContext();
            this.scene.time.delayedCall(300, () => this._refreshSettings());
            return;
        }
        audio.toggleMute();
        this._refreshSettings();
    }

    _playSoundTest() {
        this._settingsTxtResult?.setText('Initialisation...').setStyle({ color: '#ffcc44' });

        // Créer un AudioContext indépendant pour le test — pas de dépendance à AudioSystem
        const playTest = (ctx) => {
            try {
                const t    = ctx.currentTime;
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type            = 'sine';
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.65);

                // 2ème note pour confirmer
                const osc2 = ctx.createOscillator();
                const g2   = ctx.createGain();
                osc2.type            = 'sine';
                osc2.frequency.value = 554; // C#
                g2.gain.setValueAtTime(0.3, t + 0.2);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
                osc2.connect(g2);
                g2.connect(ctx.destination);
                osc2.start(t + 0.2);
                osc2.stop(t + 0.85);

                this._settingsTxtResult?.setText('✓ Son envoyé — tu dois entendre 2 bips').setStyle({ color: '#44cc88' });

                // Si AudioSystem n'est pas encore init, l'initialiser maintenant
                if (!this.scene.audio?._ctx) {
                    this.scene.audio?._initContext();
                }

                this._refreshSettings();
            } catch(e) {
                this._settingsTxtResult?.setText('✗ Erreur: ' + e.message).setStyle({ color: '#ff4444' });
            }
        };

        // Utiliser le contexte AudioSystem existant OU en créer un temporaire
        const audio = this.scene.audio;
        if (audio?._ctx?.state === 'running') {
            playTest(audio._ctx);
        } else {
            try {
                const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
                const doPlay = () => {
                    if (tmpCtx.state === 'running') {
                        playTest(tmpCtx);
                    } else {
                        tmpCtx.resume().then(() => playTest(tmpCtx)).catch(e => {
                            this._settingsTxtResult?.setText('✗ AudioContext bloqué: ' + e.message)
                                .setStyle({ color: '#ff4444' });
                        });
                    }
                };
                doPlay();
            } catch(e) {
                this._settingsTxtResult?.setText('✗ ' + e.message).setStyle({ color: '#ff4444' });
            }
        }
    }

    _setVolume(val) {
        const audio = this.scene.audio;
        if (!audio?._master) {
            this._settingsTxtResult?.setText('Son pas encore initialisé — testez d\'abord le son')
                .setStyle({ color: '#ff9944' });
            return;
        }
        audio._master.gain.setTargetAtTime(val, audio._ctx.currentTime, 0.05);
        AUDIO_CONFIG.master = val;
        this._refreshSettings();
    }


    _push(obj) { this._elements.push(obj); return obj; }
    _addDynamic(obj, fn) { this._dynamicTexts.push({ obj, fn }); return obj; }

    _txt(x, y, text, style = {}) {
        return this.scene.add.text(x, y, text, {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', ...style,
        }).setScrollFactor(0).setDepth(PANEL_DEPTH + 2);
    }

    _sep(x, y, width) {
        const gfx = this.scene.add.graphics().setScrollFactor(0).setDepth(PANEL_DEPTH + 2);
        gfx.lineStyle(1, 0x334466, 0.7);
        gfx.lineBetween(x, y, x + width, y);
        return gfx;
    }
}