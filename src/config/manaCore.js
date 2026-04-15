/**
 * MANA CORE — Configuration
 *
 * Règles de progression :
 *   - Monte UNIQUEMENT par méditation (Essence accumulée)
 *   - Chaque rang exige un niveau joueur minimum (playerLevelRequired)
 *   - Des ressources consommables ajoutent de l'Essence instantanément
 *
 * Exposé en global : MANA_CORE_LEVELS, MANA_RESOURCES, playerState
 */
const MANA_CORE_LEVELS = [
    { level: 0, name: 'Black',   color: 0x3a2a5e, hex: '#9a7aee', auraAlpha: 0.30,
      essenceRequired: 0,    playerLevelRequired: 1  },
    { level: 1, name: 'Red',     color: 0xff2020, hex: '#ff2020', auraAlpha: 0.45,
      essenceRequired: 150,  playerLevelRequired: 3  },
    { level: 2, name: 'Orange',  color: 0xff8000, hex: '#ff8000', auraAlpha: 0.60,
      essenceRequired: 400,  playerLevelRequired: 8  },
    { level: 3, name: 'Yellow',  color: 0xffdd00, hex: '#ffdd00', auraAlpha: 0.75,
      essenceRequired: 900,  playerLevelRequired: 15 },
    { level: 4, name: 'Silver',  color: 0xc0c0ff, hex: '#c0c0ff', auraAlpha: 0.88,
      essenceRequired: 2000, playerLevelRequired: 25 },
    { level: 5, name: 'White',   color: 0xffffff, hex: '#ffffff', auraAlpha: 1.00,
      essenceRequired: 4000, playerLevelRequired: 40 },
];

/**
 * Ressources consommables qui ajoutent de l'Essence au Mana Core.
 * Droppées par les ennemis ou trouvées dans les salles.
 */
const MANA_RESOURCES = [
    { id: 'mana_dust',    name: 'Poussière de Mana',  essence: 10,  dropRate: 0.30, color: '#9a7aee', icon: '·'  },
    { id: 'mana_shard',   name: 'Éclat de Mana',      essence: 35,  dropRate: 0.12, color: '#cc44ff', icon: '◆'  },
    { id: 'mana_crystal', name: 'Cristal de Mana',    essence: 80,  dropRate: 0.04, color: '#00eeff', icon: '✦'  },
    { id: 'void_core',    name: 'Noyau du Vide',       essence: 200, dropRate: 0.01, color: '#ff44aa', icon: '★'  },
];

/**
 * État global du joueur.
 * manaEssence : accumulée UNIQUEMENT par méditation et ressources.
 * inventory   : ressources en stock.
 */
const playerState = {
    manaCoreLevel : 0,
    manaEssence   : 0,   // remplace manaXP — ne monte plus via combat
    inventory     : { mana_dust: 0, mana_shard: 0, mana_crystal: 0, void_core: 0 },
    get coreData() { return MANA_CORE_LEVELS[this.manaCoreLevel]; },
    get nextCore()  {
        const next = this.manaCoreLevel + 1;
        return next < MANA_CORE_LEVELS.length ? MANA_CORE_LEVELS[next] : null;
    },
};