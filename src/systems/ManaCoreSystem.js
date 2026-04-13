/**
 * MANA CORE SYSTEM
 *
 * Gère la progression du Mana Core du joueur (XP + level-up).
 *
 * Découplage par événements Phaser :
 *   - 'manacore:changed' → HUD écoute pour se rafraîchir
 *   - 'manacore:levelup' → Player écoute pour le texte flottant
 *
 * Usage :
 *   this.mana = new ManaCoreSystem(scene);
 *   this.mana.gainExperience(50);
 *
 * TODO : connecter gainExperience() aux dégâts de combat (déjà fait en Étape 2).
 * TODO : ajouter des bonus de stats selon le niveau (vitesse, dégâts…).
 *
 * Dépend de (globals) : MANA_CORE_LEVELS, playerState
 */
class ManaCoreSystem {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Ajoute de l'XP et déclenche les level-ups en cascade si besoin.
     * @param {number} amount
     */
    gainExperience(amount) {
        if (playerState.manaCoreLevel >= MANA_CORE_LEVELS.length - 1) return;

        playerState.manaXP += amount;

        while (playerState.manaCoreLevel < MANA_CORE_LEVELS.length - 1) {
            const next = MANA_CORE_LEVELS[playerState.manaCoreLevel + 1];
            if (playerState.manaXP >= next.xpRequired) {
                playerState.manaCoreLevel++;
                this._onLevelUp(playerState.coreData);
            } else {
                break;
            }
        }

        this.scene.events.emit('manacore:changed', playerState.coreData);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _onLevelUp(core) {
        console.log(`[ManaCoreSystem] ✦ Level Up → ${core.name} (Niv. ${core.level})`);

        // Flash caméra dans la couleur du nouveau palier
        const r = (core.color >> 16) & 0xff;
        const g = (core.color >>  8) & 0xff;
        const b =  core.color        & 0xff;
        this.scene.cameras.main.flash(350, r, g, b, false);

        this.scene.events.emit('manacore:levelup', core);
    }
}
