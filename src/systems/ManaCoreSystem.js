/**
 * MANA CORE SYSTEM
 *
 * Gère la progression du Mana Core du joueur (XP + level-up).
 *
 * Découplage par événements Phaser :
 *   - 'manacore:changed' → émis à chaque gain d'XP (HUD écoute)
 *   - 'manacore:levelup' → émis à chaque montée de niveau (Aura, textes)
 *
 * Usage :
 *   this.mana = new ManaCoreSystem(scene);
 *   this.mana.gainExperience(50);
 *
 * TODO : connecter gainExperience() aux mécaniques de combat (Étape 2).
 * TODO : ajouter des bonus de stats selon le niveau (vitesse, dégâts…).
 */

import { MANA_CORE_LEVELS, playerState } from '../config/manaCore.js';

export class ManaCoreSystem {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Ajoute de l'XP et déclenche les level-ups en cascade si besoin.
     * @param {number} amount - Quantité d'XP brute à ajouter
     */
    gainExperience(amount) {
        if (playerState.manaCoreLevel >= MANA_CORE_LEVELS.length - 1) return;

        playerState.manaXP += amount;

        // Boucle pour absorber les passages de plusieurs niveaux d'un seul coup
        while (playerState.manaCoreLevel < MANA_CORE_LEVELS.length - 1) {
            const next = MANA_CORE_LEVELS[playerState.manaCoreLevel + 1];
            if (playerState.manaXP >= next.xpRequired) {
                playerState.manaCoreLevel++;
                this._onLevelUp(playerState.coreData);
            } else {
                break;
            }
        }

        // Notifie HUD + Aura d'une mise à jour (même sans level-up)
        this.scene.events.emit('manacore:changed', playerState.coreData);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    /**
     * Effets de level-up : flash caméra + événement dédié.
     * @param {import('../config/manaCore.js').ManaCoreLevel} core
     */
    _onLevelUp(core) {
        console.log(`[ManaCoreSystem] ✦ Level Up → ${core.name} (Niv. ${core.level})`);

        // Flash caméra dans la couleur du nouveau palier
        const r = (core.color >> 16) & 0xff;
        const g = (core.color >>  8) & 0xff;
        const b =  core.color        & 0xff;
        this.scene.cameras.main.flash(350, r, g, b, false);

        // Événement distinct pour les effets visuels (texte flottant, son…)
        this.scene.events.emit('manacore:levelup', core);
    }
}
