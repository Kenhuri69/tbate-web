/**
 * MANA CORE — Configuration des niveaux
 *
 * Inspiré de TBATE : chaque palier correspond à une couleur d'aura distincte.
 * Pour ajouter un niveau : insérer un objet ici, rien d'autre à toucher.
 *
 * TODO : charger depuis un JSON externe (fetch) pour permettre le moddage.
 *
 * Exposé en global : MANA_CORE_LEVELS, playerState
 */
const MANA_CORE_LEVELS = [
    { level: 0, name: 'Black',  color: 0x3a2a5e, hex: '#9a7aee', auraAlpha: 0.30, xpRequired: 0    },
    { level: 1, name: 'Red',    color: 0xff2020, hex: '#ff2020', auraAlpha: 0.45, xpRequired: 100  },
    { level: 2, name: 'Orange', color: 0xff8000, hex: '#ff8000', auraAlpha: 0.60, xpRequired: 300  },
    { level: 3, name: 'Yellow', color: 0xffdd00, hex: '#ffdd00', auraAlpha: 0.75, xpRequired: 600  },
    { level: 4, name: 'Silver', color: 0xc0c0ff, hex: '#c0c0ff', auraAlpha: 0.88, xpRequired: 1000 },
    { level: 5, name: 'White',  color: 0xffffff, hex: '#ffffff', auraAlpha: 1.00, xpRequired: 2000 },
];

/**
 * État mutable global du Mana Core du joueur.
 * TODO : remplacer par un système de sauvegarde (localStorage).
 */
const playerState = {
    manaCoreLevel : 0,
    manaXP        : 0,
    get coreData() { return MANA_CORE_LEVELS[this.manaCoreLevel]; },
};
