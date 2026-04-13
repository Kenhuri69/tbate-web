/**
 * ROOM CONTENT — Hooks narratifs et contenu de salles
 *
 * ════════════════════════════════════════════════════════════════════
 *  CE FICHIER EST LE POINT D'ENTRÉE DU CONTENU HISTOIRE TBATE.
 *
 *  Architecture :
 *   - STORY_CONTENT  : dictionnaire hookId → données narratives
 *   - ROOM_TEMPLATES : comportement par type de salle (spawns, loot)
 *
 *  Comment ajouter du contenu narratif :
 *   1. Remplir STORY_CONTENT avec les dialogues / cutscenes / items
 *   2. Le GameScene émet 'room:entered' avec le hookId quand le joueur entre
 *   3. Le futur StorySystem écoute cet événement et déclenche le contenu
 *
 *  Format d'un hook narratif :
 *  ─────────────────────────────────────────────
 *  'hook_id': {
 *    chapter   : 1,                // chapitre TBATE
 *    type      : 'dialogue',       // 'dialogue' | 'cutscene' | 'item' | 'combat'
 *    trigger   : 'on_enter',       // 'on_enter' | 'on_clear' | 'on_interact'
 *    oneShot   : true,             // ne se déclenche qu'une fois par run
 *    condition : null,             // fn(playerState) → bool, ou null = toujours
 *    data: {
 *      // Pour type 'dialogue' :
 *      speakerId : 'arthur_leywin',
 *      lines     : [ { text: '...', emotion: 'serious' }, ... ],
 *
 *      // Pour type 'item' :
 *      items     : [ { id: 'mana_crystal', count: 1 } ],
 *
 *      // Pour type 'combat' :
 *      wave      : [ { type: 'void_beast_elite', count: 1 } ],
 *    }
 *  }
 *  ─────────────────────────────────────────────
 * ════════════════════════════════════════════════════════════════════
 *
 * TODO : remplir avec le contenu narratif TBATE (chapitres 1-N).
 * TODO : ajouter un système de conditions (flags de quête, niveau joueur...).
 * TODO : charger depuis un JSON externe pour le moddage.
 *
 * Exposé en global : STORY_CONTENT, ROOM_TEMPLATES
 */

// ----------------------------------------------------------------
// Contenu narratif (vide — sera enrichi avec l'histoire TBATE)
// ----------------------------------------------------------------
const STORY_CONTENT = {

    // ── Étage 1 ──────────────────────────────────────────────────

    /* floor_1_intro: {
        chapter : 1,
        type    : 'dialogue',
        trigger : 'on_enter',
        oneShot : true,
        data    : {
            speakerId : 'arthur_leywin',
            lines     : [
                { text: "... Où suis-je ?", emotion: 'confused' },
            ],
        },
    }, */

    /* floor_1_boss: {
        chapter : 1,
        type    : 'combat',
        trigger : 'on_enter',
        oneShot : true,
        data    : {
            wave : [ { type: 'void_beast_alpha', count: 1 } ],
        },
    }, */

    /* floor_1_exit: {
        chapter : 1,
        type    : 'dialogue',
        trigger : 'on_enter',
        oneShot : true,
        data    : {
            speakerId : 'narrator',
            lines     : [
                { text: "Une lumière étrange filtre à travers la brèche...", emotion: 'neutral' },
            ],
        },
    }, */
};

// ----------------------------------------------------------------
// Templates de contenu par type de salle
// (indépendants de l'histoire, définissent le gameplay de base)
// ----------------------------------------------------------------
const ROOM_TEMPLATES = {

    normal: {
        /** Table de spawn des ennemis (poids relatifs). */
        spawnTable: [
            { type: 'void_beast', weight: 100 },
            // TODO : ajouter shadow_wisp, bone_archer, etc.
        ],
        enemyCount : { min: 1, max: 3 },
        xpMultiplier: 1.0,
        /** Loot possible (vide pour l'instant). */
        lootTable  : [],
    },

    boss: {
        spawnTable: [
            { type: 'void_beast', weight: 100 }, // TODO : void_beast_alpha
        ],
        enemyCount : { min: 1, max: 1 },
        xpMultiplier: 5.0,
        lootTable  : [
            // { itemId: 'mana_crystal_rare', chance: 1.0 }, // TODO : implémenter items
        ],
    },

    treasure: {
        spawnTable : [],
        enemyCount : { min: 0, max: 0 },
        xpMultiplier: 0,
        lootTable  : [
            // { itemId: 'health_orb', chance: 1.0 },
            // { itemId: 'mana_stone', chance: 0.5 },
        ],
    },

    story: {
        spawnTable : [],
        enemyCount : { min: 0, max: 0 },
        xpMultiplier: 0,
        lootTable  : [],
    },

    start: {
        spawnTable : [],
        enemyCount : { min: 0, max: 0 },
        xpMultiplier: 0,
        lootTable  : [],
    },

    exit: {
        spawnTable : [],
        enemyCount : { min: 0, max: 0 },
        xpMultiplier: 0,
        lootTable  : [],
    },
};
