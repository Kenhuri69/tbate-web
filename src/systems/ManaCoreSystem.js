/**
 * MANA CORE SYSTEM
 *
 * Règles :
 *   - Le Mana Core monte UNIQUEMENT par méditation (plus via combat).
 *   - La méditation s'active avec [M] / bouton mobile.
 *   - Elle est interrompue si le joueur reçoit un coup.
 *   - Des ressources consommables ajoutent de l'Essence instantanément.
 *   - Chaque rang exige un niveau joueur minimum (playerLevelRequired).
 *
 * API publique :
 *   mana.startMeditation()          — démarre si conditions remplies
 *   mana.stopMeditation(byDamage)   — arrête (byDamage=true → message)
 *   mana.useResource(resourceId)    — consomme une ressource de l'inventaire
 *   mana.isMeditating               — état courant
 *   mana.essenceProgress            — [0..1] vers le prochain rang
 *
 * Événements émis :
 *   'manacore:changed'              → HUD rafraîchi
 *   'manacore:levelup' (core)       → Player affiche le texte + flash
 *   'manacore:meditation:start'     → HUD affiche l'état
 *   'manacore:meditation:stop'      → HUD masque l'état
 *   'manacore:resource:used' (res)  → HUD feedback
 *   'manacore:blocked' (reason)     → HUD message d'erreur
 *
 * Dépend de (globals) : MANA_CORE_LEVELS, MANA_RESOURCES, playerState
 */
class ManaCoreSystem {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;

        this._meditating    = false;
        this._essenceTimer  = 0;          // ms accumulées depuis dernière essence
        this._ESSENCE_TICK  = 3000;       // 1 essence toutes les 3s en méditation

        // Touche M (desktop)
        this._keyM = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this._keyM.on('down', () => this.toggleMeditation(scene), this);

        // Bouton mobile
        scene.events.on('mobile:meditate', () => this.toggleMeditation(scene), this);
    }

    // ----------------------------------------------------------------
    // Accesseurs
    // ----------------------------------------------------------------

    get isMeditating() { return this._meditating; }

    get essenceProgress() {
        const next = playerState.nextCore;
        if (!next) return 1;
        const cur  = playerState.coreData;
        const span = next.essenceRequired - cur.essenceRequired;
        const done = playerState.manaEssence - cur.essenceRequired;
        return Math.min(Math.max(done / Math.max(span, 1), 0), 1);
    }

    // ----------------------------------------------------------------
    // Méditation
    // ----------------------------------------------------------------

    toggleMeditation(scene) {
        if (this._meditating) {
            this.stopMeditation(false);
        } else {
            this.startMeditation(scene);
        }
    }

    /**
     * Démarre la méditation si les conditions sont remplies.
     * @param {Phaser.Scene} scene — pour lire le niveau joueur
     */
    startMeditation(scene) {
        const next = playerState.nextCore;

        // Déjà au max
        if (!next) {
            this.scene.events.emit('manacore:blocked', 'Mana Core au maximum !');
            return;
        }

        // Niveau joueur insuffisant
        const playerLevel = scene.stats?.playerLevel ?? 1;
        if (playerLevel < next.playerLevelRequired) {
            this.scene.events.emit('manacore:blocked',
                `Niveau ${next.playerLevelRequired} requis pour ${next.name} Core`);
            return;
        }

        this._meditating   = true;
        this._essenceTimer = 0;
        this.scene.events.emit('manacore:meditation:start');
    }

    /** @param {boolean} byDamage — true si interrompue par un coup */
    stopMeditation(byDamage = false) {
        if (!this._meditating) return;
        this._meditating = false;
        this.scene.events.emit('manacore:meditation:stop', byDamage);
    }

    /**
     * Appelé dans GameScene.update() chaque frame.
     * @param {number} delta — ms depuis le dernier frame
     */
    update(delta) {
        if (!this._meditating) return;

        this._essenceTimer += delta;
        if (this._essenceTimer >= this._ESSENCE_TICK) {
            this._essenceTimer -= this._ESSENCE_TICK;
            this._addEssence(1);
        }
    }

    // ----------------------------------------------------------------
    // Ressources consommables
    // ----------------------------------------------------------------

    /**
     * Utilise une ressource de l'inventaire pour ajouter de l'Essence.
     * @param {string} resourceId
     * @param {Phaser.Scene} scene
     */
    useResource(resourceId, scene) {
        const res = MANA_RESOURCES.find(r => r.id === resourceId);
        if (!res) return;

        if ((playerState.inventory[resourceId] ?? 0) <= 0) {
            this.scene.events.emit('manacore:blocked', 'Aucune ressource disponible.');
            return;
        }

        playerState.inventory[resourceId]--;
        this._addEssence(res.essence);
        this.scene.events.emit('manacore:resource:used', res);
    }

    /**
     * Ajoute une ressource à l'inventaire (appelé par GameScene au drop ennemi).
     * @param {string} resourceId
     * @param {number} [qty=1]
     */
    addResource(resourceId, qty = 1) {
        if (!(resourceId in playerState.inventory)) return;
        playerState.inventory[resourceId] += qty;
        this.scene.events.emit('manacore:changed', playerState.coreData);
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    _addEssence(amount) {
        if (playerState.manaCoreLevel >= MANA_CORE_LEVELS.length - 1) return;

        playerState.manaEssence += amount;
        this._checkLevelUp();
        this.scene.events.emit('manacore:changed', playerState.coreData);
    }

    _checkLevelUp() {
        const next = playerState.nextCore;
        if (!next) return;
        if (playerState.manaEssence >= next.essenceRequired) {
            playerState.manaCoreLevel++;
            this._meditating = false;
            this.scene.events.emit('manacore:meditation:stop', false);
            this._onLevelUp(playerState.coreData);
            // Vérifier cascade
            this._checkLevelUp();
        }
    }

    _onLevelUp(core) {
        const r = (core.color >> 16) & 0xff;
        const g = (core.color >>  8) & 0xff;
        const b =  core.color        & 0xff;
        this.scene.cameras.main.flash(500, r, g, b, false);
        this.scene.events.emit('manacore:levelup', core);
    }
}