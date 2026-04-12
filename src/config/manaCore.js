/**
 * MANA CORE — Configuration des niveaux
 *
 * Inspiré de TBATE : chaque palier correspond à une couleur d'aura distincte.
 * Pour ajouter un niveau, il suffit d'insérer un objet dans le tableau.
 *
 * TODO (futur) : charger depuis un JSON externe pour éviter toute recompilation.
 *
 * @typedef  {object} ManaCoreLevel
 * @property {number} level       - Indice du palier (0 = Black … 5 = White)
 * @property {string} name        - Nom affiché dans le HUD
 * @property {number} color       - Couleur Phaser (0xRRGGBB)
 * @property {string} hex         - Couleur CSS pour les textes
 * @property {number} auraAlpha   - Opacité maximale de l'aura [0..1]
 * @property {number} xpRequired  - XP total cumulé nécessaire pour ce palier
 */
export const MANA_CORE_LEVELS = [
    { level: 0, name: 'Black',  color: 0x3a2a5e, hex: '#9a7aee', auraAlpha: 0.30, xpRequired: 0    },
    { level: 1, name: 'Red',    color: 0xff2020, hex: '#ff2020', auraAlpha: 0.45, xpRequired: 100  },
    { level: 2, name: 'Orange', color: 0xff8000, hex: '#ff8000', auraAlpha: 0.60, xpRequired: 300  },
    { level: 3, name: 'Yellow', color: 0xffdd00, hex: '#ffdd00', auraAlpha: 0.75, xpRequired: 600  },
    { level: 4, name: 'Silver', color: 0xc0c0ff, hex: '#c0c0ff', auraAlpha: 0.88, xpRequired: 1000 },
    { level: 5, name: 'White',  color: 0xffffff, hex: '#ffffff', auraAlpha: 1.00, xpRequired: 2000 },
];

/**
 * État mutable global du Mana Core du joueur.
 *
 * TODO : encapsuler dans un vrai système de sauvegarde (localStorage / API).
 */
export const playerState = {
    manaCoreLevel : 0,
    manaXP        : 0,

    /** Raccourci vers les données du palier courant. */
    get coreData() {
        return MANA_CORE_LEVELS[this.manaCoreLevel];
    },
};
