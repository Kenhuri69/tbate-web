/**
 * HUD (Heads-Up Display)
 *
 * Affiche les informations Mana Core : niveau, XP, barre de progression.
 * Tous les éléments ont setScrollFactor(0) — ils sont fixes à l'écran.
 *
 * Se rafraîchit automatiquement sur l'événement 'manacore:changed'.
 *
 * TODO : extraire dans une UIScene dédiée (caméra overlay indépendante).
 * TODO : ajouter barre de vie, icônes de sorts actifs, mini-map (Étape 2+).
 */

import { MANA_CORE_LEVELS, playerState } from '../config/manaCore.js';

// — Constantes de layout —
const PANEL_X = 10;
const PANEL_Y = 10;
const PANEL_W = 280;
const PANEL_H = 100;
const BAR_W   = 248;
const BAR_H   = 10;
const DEPTH   = 100;

export class HUD {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
        this._build();

        // Rafraîchissement automatique sur tout changement de Mana Core
        scene.events.on('manacore:changed', this.refresh, this);
    }

    /** Met à jour l'affichage (niveau, XP, barre). */
    refresh() {
        const core   = playerState.coreData;
        const maxLvl = MANA_CORE_LEVELS.length - 1;
        const next   = MANA_CORE_LEVELS[Math.min(playerState.manaCoreLevel + 1, maxLvl)];

        // — Titre du niveau —
        this._txtLevel
            .setText(`Mana Core : [${core.name.toUpperCase()}]  Niv. ${core.level}`)
            .setStyle({ color: core.hex });

        // — Compteur XP —
        const suffix = playerState.manaCoreLevel >= maxLvl ? '  ✦ MAX ✦' : '';
        this._txtXP.setText(`XP : ${playerState.manaXP} / ${next.xpRequired}${suffix}`);

        // — Barre de progression —
        const xpInLevel = playerState.manaXP   - core.xpRequired;
        const xpSpan    = next.xpRequired       - core.xpRequired;
        const ratio     = playerState.manaCoreLevel >= maxLvl
            ? 1
            : Math.min(xpInLevel / Math.max(xpSpan, 1), 1);

        this._barFill
            .setSize(Math.max(0, BAR_W * ratio), BAR_H)
            .setFillStyle(core.color);
    }

    destroy() {
        this.scene.events.off('manacore:changed', this.refresh, this);
    }

    // ----------------------------------------------------------------
    // Construction initiale
    // ----------------------------------------------------------------

    _build() {
        // Fond semi-transparent
        this.scene.add
            .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.72)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH);

        // Texte : niveau du Mana Core
        this._txtLevel = this.scene.add.text(
            PANEL_X + 12, PANEL_Y + 12, '',
            { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }
        ).setScrollFactor(0).setDepth(DEPTH + 1);

        // Texte : compteur XP
        this._txtXP = this.scene.add.text(
            PANEL_X + 12, PANEL_Y + 34, '',
            { fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa' }
        ).setScrollFactor(0).setDepth(DEPTH + 1);

        // Fond barre XP
        this.scene.add
            .rectangle(PANEL_X + 12, PANEL_Y + 56, BAR_W, BAR_H, 0x333333)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 1);

        // Remplissage barre XP
        this._barFill = this.scene.add
            .rectangle(PANEL_X + 12, PANEL_Y + 56, 0, BAR_H, 0x5533aa)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 2);

        // Rappel des contrôles
        this.scene.add.text(
            PANEL_X + 12, PANEL_Y + 76, 'ZQSD / Flèches : se déplacer',
            { fontFamily: 'monospace', fontSize: '10px', color: '#445566' }
        ).setScrollFactor(0).setDepth(DEPTH + 1);

        // Premier rendu
        this.refresh();
    }
}
