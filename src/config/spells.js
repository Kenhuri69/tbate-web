/**
 * SORTS — Configuration JSON des 4 sorts du joueur
 *
 * Pour ajouter un sort : insérer un objet ici.
 * L'id doit être unique (utilisé comme clé de texture : `proj_${id}`).
 *
 * TODO : charger depuis un JSON externe pour le moddage.
 * TODO : ajouter des champs : type ('pierce'|'aoe'|'bounce'), manaCost, range.
 *
 * Exposé en global : SPELLS
 */
const SPELLS = [
    {
        id       : 'mana_blast',
        name     : 'Mana Blast',
        color    : 0xaa55ff,
        hex      : '#aa55ff',
        damage   : 15,
        speed    : 420,
        cooldown : 300,
        size     : 8,
        xpReward : 8,
    },
    {
        id       : 'fireball',
        name     : 'Fireball',
        color    : 0xff4400,
        hex      : '#ff6622',
        damage   : 35,
        speed    : 270,
        cooldown : 900,
        size     : 14,
        xpReward : 20,
    },
    {
        id       : 'frost_lance',
        name     : 'Frost Lance',
        color    : 0x44ddff,
        hex      : '#44ddff',
        damage   : 20,
        speed    : 540,
        cooldown : 500,
        size     : 6,
        xpReward : 12,
    },
    {
        id       : 'lightning',
        name     : 'Lightning',
        color    : 0xffee00,
        hex      : '#ffee00',
        damage   : 28,
        speed    : 680,
        cooldown : 650,
        size     : 5,
        xpReward : 15,
    },
];
