/**
 * STATS SYSTEM
 *
 * Gère l'intégralité des statistiques du joueur :
 *   - Points alloués manuellement (base)
 *   - Bonus passifs du Mana Core (non allouables)
 *   - Niveau du joueur et XP associée
 *   - Stats dérivées (HP max, vitesse, critiques…)
 *
 * Événements émis :
 *   'stats:changed'        → HUD + StatsPanel se rafraîchissent
 *   'player:levelup' (lvl) → texte flottant + 3 points bonus
 *
 * Événements écoutés :
 *   'manacore:levelup'     → applique les bonus passifs du nouveau tier
 *
 * Usage :
 *   this.stats = new StatsSystem(scene);
 *   this.stats.allocate('mag');
 *   this.stats.gainPlayerXP(50);
 *
 * TODO : ajouter la régénération de HP (VIT × 0.5 HP/s).
 * TODO : ajouter des malus (poison, debuff) comme stat temporaire.
 *
 * Dépend de (globals) : STAT_KEYS, STAT_TIERS, CORE_PASSIVES, playerState
 */
class StatsSystem {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;

        // — Points alloués par le joueur (via StatsPanel) —
        this.base = { str: 1, agi: 1, vit: 1, dex: 1, mag: 1, lck: 1 };

        // — Bonus passifs du Mana Core (non modifiables par le joueur) —
        this.passive = { str: 0, agi: 0, vit: 0, dex: 0, mag: 0, lck: 0 };

        // — Multiplicateur de dégâts de sorts (progressif avec le Mana Core) —
        this.magMultiplier = 1.0;

        // — Points libres à allouer (3 par niveau joueur) —
        this.freePoints = 5; // starter

        // — Niveau et XP du joueur (distinct du Mana Core) —
        this.playerLevel = 1;
        this.playerXP    = 0;

        // HP courant (initialisé après la construction)
        this.currentHP = this.maxHP;

        scene.events.on('manacore:levelup', this._onCoreUp, this);
    }

    // ----------------------------------------------------------------
    // Accesseurs
    // ----------------------------------------------------------------

    /** Valeur totale d'une stat (base + passif Mana Core). */
    total(key) {
        return this.base[key] + this.passive[key];
    }

    /** Cap absolu de la stat selon le tier Mana Core actuel. */
    cap(key) {
        const tier = STAT_TIERS[playerState.manaCoreLevel];
        return key === 'mag' ? tier.magCap : tier.generalCap;
    }

    /** Retourne true si on peut allouer 1 point sur cette stat. */
    canAllocate(key) {
        return this.freePoints > 0 && this.base[key] < this.cap(key);
    }

    // ----------------------------------------------------------------
    // Stats dérivées
    // ----------------------------------------------------------------

    get maxHP()     { return this.total('vit') * 12 + this.playerLevel * 5; }
    get moveSpeed() { return 160 + this.total('agi') * 1.2; }
    get critChance(){ return this.total('dex') * 0.004 + this.total('lck') * 0.0025; }
    get critMult()  { return 1.5 + this.total('str') * 0.005; }
    get xpBonus()   { return 1 + this.total('lck') * 0.003; }

    // ----------------------------------------------------------------
    // Actions
    // ----------------------------------------------------------------

    /**
     * Alloue 1 point sur une stat. Retourne true si réussi.
     * @param {string} key
     */
    allocate(key) {
        if (!this.canAllocate(key)) return false;
        this.base[key]++;
        this.freePoints--;
        // Si VIT augmente, restaure les HP proportionnellement
        if (key === 'vit') this.currentHP = Math.min(this.currentHP + 12, this.maxHP);
        this.scene.events.emit('stats:changed');
        return true;
    }

    /**
     * Calcule les dégâts d'un sort avec bonus MAG + critique éventuel.
     * @param {number} baseDmg
     * @returns {{ value: number, crit: boolean }}
     */
    spellDamage(baseDmg) {
        const raw    = Math.floor(baseDmg * (1 + this.total('mag') * 0.02) * this.magMultiplier);
        const isCrit = Math.random() < this.critChance;
        return {
            value: isCrit ? Math.floor(raw * this.critMult) : raw,
            crit : isCrit,
        };
    }

    /**
     * Inflige des dégâts au joueur.
     * @param {number} amount
     */
    takeDamage(amount) {
        this.currentHP = Math.max(0, this.currentHP - amount);
        this.scene.events.emit('stats:changed');
        if (this.currentHP <= 0) this.scene.events.emit('player:died');
    }

    /**
     * Gagne de l'XP joueur (bonus LCK appliqué automatiquement).
     * Déclenche player:levelup si seuil atteint.
     * @param {number} amount
     */
    gainPlayerXP(amount) {
        if (this.playerLevel >= 100) return;
        this.playerXP += Math.floor(amount * this.xpBonus);

        while (this.playerXP >= this._xpToNext(this.playerLevel) && this.playerLevel < 100) {
            this.playerXP    -= this._xpToNext(this.playerLevel);
            this.playerLevel += 1;
            this.freePoints  += 3;
            // HP remis à jour au nouveau max
            this.currentHP = this.maxHP;
            this.scene.events.emit('player:levelup', this.playerLevel);
        }

        this.scene.events.emit('stats:changed');
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    /** XP nécessaire pour passer du niveau `lvl` au suivant. */
    _xpToNext(lvl) {
        return Math.floor(100 * Math.pow(1.15, lvl - 1));
    }

    /** Applique les bonus passifs lors d'un level-up du Mana Core. */
    _onCoreUp(core) {
        const p = CORE_PASSIVES[core.level - 1];
        if (!p) return;

        STAT_KEYS.forEach(k => { this.passive[k] += p.allBonus; });
        this.passive.mag   += p.magBonus;      // bonus MAG supplémentaire
        this.magMultiplier  = p.magMultiplier; // nouveau multiplicateur

        // HP max augmente → restaure à plein
        this.currentHP = this.maxHP;

        this.scene.events.emit('stats:changed');
    }
}
