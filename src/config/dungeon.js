/**
 * DUNGEON CONFIG — Paramètres du générateur BSP
 *
 * Toutes les valeurs numériques du donjon sont ici.
 * Modifier ces valeurs change la taille, la densité et le style des donjons
 * sans toucher à l'algorithme.
 *
 * Exposé en global : DUNGEON_CONFIG, TILE, ROOM_TYPES, ROOM_COLORS
 */

const DUNGEON_CONFIG = {
    mapWidth    : 80,  // tuiles
    mapHeight   : 60,  // tuiles
    tileSize    : 32,  // pixels

    // BSP
    minPartW    : 12,  // largeur min d'une partition (assez grande pour une salle)
    minPartH    : 10,  // hauteur min d'une partition
    maxDepth    : 5,   // profondeur max de récursion (2^5 = 32 feuilles max)

    // Salles
    roomPadding : 2,   // tuiles entre le bord de la partition et la salle
    minRoomW    : 6,
    minRoomH    : 5,

    // Couloirs
    corridorW   : 2,   // largeur en tuiles

    // Contenu
    normalEnemyMin  : 1,
    normalEnemyMax  : 3,
    bossEnemyCount  : 1,
};

/**
 * Types de tuiles (valeurs stockées dans le tableau 2D tiles[][]).
 * VOID = 0 → non rendu (fond noir de la caméra).
 */
const TILE = {
    VOID  : 0,  // néant / hors-donjon
    FLOOR : 1,  // sol praticable
    WALL  : 2,  // mur
};

/**
 * Types de salles et leurs propriétés.
 * color      : teinte Phaser (0xRRGGBB) appliquée en overlay léger
 * spawnEnemy : true = des ennemis y apparaissent
 * storyHook  : true = un hook narratif lui est assigné automatiquement
 */
const ROOM_TYPES = {
    start   : { id: 'start',    label: 'Entrée',   color: 0x00cc44, spawnEnemy: false, storyHook: false },
    normal  : { id: 'normal',   label: 'Normale',  color: 0x000000, spawnEnemy: true,  storyHook: false },
    treasure: { id: 'treasure', label: 'Trésor',   color: 0xddaa00, spawnEnemy: false, storyHook: false },
    story   : { id: 'story',    label: 'Histoire', color: 0x3355ff, spawnEnemy: false, storyHook: true  },
    boss    : { id: 'boss',     label: 'Boss',     color: 0xff2200, spawnEnemy: true,  storyHook: true  },
    exit    : { id: 'exit',     label: 'Sortie',   color: 0x00bbff, spawnEnemy: false, storyHook: true  },
};
