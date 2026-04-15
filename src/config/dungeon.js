/**
 * DUNGEON CONFIG — Paramètres du générateur BSP
 *
 * ENVIRONNEMENTS : chaque étage a un thème visuel distinct.
 *   floor 1 : Maison Leywin / Village d'Ashber  (chaud, bois, pierre claire)
 *   floor 2 : Forêt de Elenoir                   (vert sombre, mousse, racines)
 *   floor 3 : Donjon souterrain                  (pierre noire, couloirs étroits)
 *
 * Exposé en global : DUNGEON_CONFIG, DUNGEON_ENVIRONMENTS, TILE, ROOM_TYPES
 */

const DUNGEON_CONFIG = {
    mapWidth    : 80,
    mapHeight   : 60,
    tileSize    : 32,

    minPartW    : 12,
    minPartH    : 10,
    maxDepth    : 5,

    roomPadding : 2,
    minRoomW    : 6,
    minRoomH    : 5,

    corridorW   : 2,

    normalEnemyMin  : 1,
    normalEnemyMax  : 3,
    bossEnemyCount  : 1,

    /** Étage actuel (1-indexé). Changer pour switcher d'environnement. */
    currentFloor : 1,
};

/**
 * Environnements visuels par étage.
 * floorColor  : couleur de fond des tuiles sol
 * wallColor   : couleur des murs
 * ambientTint : teinte overlay appliquée à toute la map
 * roomColors  : couleurs de surbrillance par type de salle
 * label       : nom affiché dans le HUD
 */
const DUNGEON_ENVIRONMENTS = {
    1: {
        label       : 'Village d\'Ashber',
        floorColor  : '#1a1208',   // bois sombre
        floorDetail : '#2a1e0e',
        wallColor   : '#3d2a14',   // pierre chaude / bois
        wallDetail  : '#2a1a08',
        ambientTint : 0x3d2a14,
        lightColor  : 0xffcc88,    // lumière bougie chaude
        roomColors  : {
            start   : 0x44aa44,
            exit    : 0x44aaff,
            boss    : 0xff3300,
            story   : 0xffaa00,
            treasure: 0xddaa00,
        },
    },
    2: {
        label       : 'Forêt d\'Elenoir',
        floorColor  : '#0a1a08',   // terre forestière
        floorDetail : '#0d2208',
        wallColor   : '#0a2206',   // troncs/rochers couverts de mousse
        wallDetail  : '#062208',
        ambientTint : 0x0a2206,
        lightColor  : 0x88ff88,    // lueur verte de la forêt
        roomColors  : {
            start   : 0x22cc44,
            exit    : 0x22ddaa,
            boss    : 0xcc2200,
            story   : 0x44cc88,
            treasure: 0xaacc00,
        },
    },
    3: {
        label       : 'Donjon Souterrain',
        floorColor  : '#0d0d14',   // pierre noire
        floorDetail : '#111122',
        wallColor   : '#1a1a2e',
        wallDetail  : '#0a0818',
        ambientTint : 0x110011,
        lightColor  : 0x5533aa,    // lueur de mana violet
        roomColors  : {
            start   : 0x22cc44,
            exit    : 0x44ddff,
            boss    : 0xff2200,
            story   : 0x3355ff,
            treasure: 0xddaa00,
        },
    },
};

const TILE = {
    VOID  : 0,
    FLOOR : 1,
    WALL  : 2,
};

const ROOM_TYPES = {
    start   : { id: 'start',    label: 'Entrée',   color: 0x00cc44, spawnEnemy: false, storyHook: true  },
    normal  : { id: 'normal',   label: 'Normale',  color: 0x000000, spawnEnemy: true,  storyHook: false },
    treasure: { id: 'treasure', label: 'Trésor',   color: 0xddaa00, spawnEnemy: false, storyHook: false },
    story   : { id: 'story',    label: 'Histoire', color: 0x3355ff, spawnEnemy: false, storyHook: true  },
    boss    : { id: 'boss',     label: 'Boss',     color: 0xff2200, spawnEnemy: true,  storyHook: true  },
    exit    : { id: 'exit',     label: 'Sortie',   color: 0x00bbff, spawnEnemy: false, storyHook: true  },
};