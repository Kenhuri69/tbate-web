/**
 * DUNGEON GENERATOR — Algorithme BSP pur
 *
 * Produit un objet DungeonMap sans aucune dépendance à Phaser.
 * Le rendu est délégué à DungeonRenderer.
 *
 * Algorithme :
 *   1. Partitionnement BSP récursif de la grille
 *   2. Placement d'une salle dans chaque feuille
 *   3. Connexion des salles sœurs par des couloirs en L
 *   4. Génération du tableau 2D de tuiles (FLOOR / WALL / VOID)
 *   5. Attribution des types de salles
 *   6. Attribution des hooks narratifs
 *
 * Sortie :
 *   {
 *     width, height, tileSize,
 *     tiles    : TILE[][]      — tableau [row][col]
 *     rooms    : Room[]        — données de chaque salle
 *     startPos : {x,y}         — position pixel du joueur au départ
 *     seed     : number|null
 *   }
 *
 * TODO : ajouter pathfinding A* entre salles pour la mini-map.
 * TODO : ajouter un générateur de seed lisible (mots) pour le partage.
 * TODO : permettre plusieurs étages (paramètre floor: 1..N).
 *
 * Dépend de (globals) : DUNGEON_CONFIG, TILE, ROOM_TYPES
 */

// ────────────────────────────────────────────────────────────────
// Nœud BSP interne
// ────────────────────────────────────────────────────────────────
class BSPNode {

    /**
     * @param {number} x      - colonne de départ (tuiles)
     * @param {number} y      - ligne de départ (tuiles)
     * @param {number} w      - largeur (tuiles)
     * @param {number} h      - hauteur (tuiles)
     * @param {number} depth  - profondeur dans l'arbre
     */
    constructor(x, y, w, h, depth = 0) {
        this.x     = x; this.y = y;
        this.w     = w; this.h = h;
        this.depth = depth;
        this.left  = null;   // BSPNode
        this.right = null;   // BSPNode
        this.room  = null;   // Room (feuilles seulement)
    }

    get isLeaf()     { return !this.left && !this.right; }

    /** Feuille aléatoire dans ce sous-arbre. */
    get randomLeaf() {
        if (this.isLeaf) return this;
        return Math.random() < 0.5 ? this.left.randomLeaf : this.right.randomLeaf;
    }

    /** Toutes les feuilles. */
    get leaves() {
        if (this.isLeaf) return [this];
        return [...this.left.leaves, ...this.right.leaves];
    }

    /**
     * Tente de diviser ce nœud.
     * @param {number} minPartW
     * @param {number} minPartH
     * @param {function} rng - () => [0..1]
     * @returns {boolean}
     */
    trySplit(minPartW, minPartH, rng) {
        if (!this.isLeaf) return false;

        const canH = this.h >= minPartH * 2;
        const canV = this.w >= minPartW * 2;
        if (!canH && !canV) return false;

        // Préférer couper dans la dimension la plus longue
        const splitHoriz = canH && canV
            ? this.h > this.w * 1.2
            : canH;

        if (splitHoriz) {
            const min = minPartH;
            const max = this.h - minPartH;
            const at  = min + Math.floor(rng() * (max - min));
            this.left  = new BSPNode(this.x,      this.y,      this.w, at,           this.depth + 1);
            this.right = new BSPNode(this.x,      this.y + at, this.w, this.h - at,  this.depth + 1);
        } else {
            const min = minPartW;
            const max = this.w - minPartW;
            const at  = min + Math.floor(rng() * (max - min));
            this.left  = new BSPNode(this.x,      this.y, at,           this.h, this.depth + 1);
            this.right = new BSPNode(this.x + at, this.y, this.w - at,  this.h, this.depth + 1);
        }
        return true;
    }
}

// ────────────────────────────────────────────────────────────────
// Générateur principal
// ────────────────────────────────────────────────────────────────
class DungeonGenerator {

    /** @param {object} [overrides] - surcharge partielle de DUNGEON_CONFIG */
    constructor(overrides = {}) {
        this._cfg = { ...DUNGEON_CONFIG, ...overrides };
    }

    /**
     * Génère un donjon complet.
     * @param {number|null} seed - graine pour la reproductibilité (null = aléatoire)
     * @returns {DungeonMap}
     */
    generate(seed = null) {
        const cfg = this._cfg;

        // RNG (reproductible si seed fourni)
        this._rng = seed !== null ? this._seededRNG(seed) : Math.random.bind(Math);

        // 1. Grille vide
        const tiles = this._grid(cfg.mapWidth, cfg.mapHeight, TILE.VOID);

        // 2. Arbre BSP
        const root = new BSPNode(1, 1, cfg.mapWidth - 2, cfg.mapHeight - 2, 0);
        this._splitRecursive(root, 0);

        // 3. Salle dans chaque feuille
        const roomList = [];
        this._placeRooms(root, roomList);

        // 4. Peinture des salles sur la grille
        roomList.forEach(r => this._paintRoom(r, tiles));

        // 5. Couloirs (connexion récursive des sœurs BSP)
        this._connectSiblings(root, tiles);

        // 6. Génération des murs
        this._generateWalls(tiles, cfg.mapWidth, cfg.mapHeight);

        // 7. Attribution des types + hooks
        this._assignTypes(roomList);

        return {
            width   : cfg.mapWidth,
            height  : cfg.mapHeight,
            tileSize: cfg.tileSize,
            tiles,
            rooms   : roomList,
            startPos: this._startPixelPos(roomList, cfg.tileSize),
            seed,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Étapes de génération
    // ──────────────────────────────────────────────────────────────

    /** Divise récursivement jusqu'à maxDepth ou impossibilité. */
    _splitRecursive(node, depth) {
        const cfg = this._cfg;
        if (depth >= cfg.maxDepth) return;
        if (!node.trySplit(cfg.minPartW, cfg.minPartH, this._rng)) return;
        this._splitRecursive(node.left,  depth + 1);
        this._splitRecursive(node.right, depth + 1);
    }

    /** Crée une salle dans chaque feuille, l'ajoute à roomList. */
    _placeRooms(node, roomList) {
        if (!node.isLeaf) {
            this._placeRooms(node.left,  roomList);
            this._placeRooms(node.right, roomList);
            return;
        }

        const cfg     = this._cfg;
        const pad     = cfg.roomPadding;
        const maxRW   = node.w - pad * 2;
        const maxRH   = node.h - pad * 2;

        if (maxRW < cfg.minRoomW || maxRH < cfg.minRoomH) return; // partition trop petite

        const rw = cfg.minRoomW + Math.floor(this._rng() * (maxRW - cfg.minRoomW + 1));
        const rh = cfg.minRoomH + Math.floor(this._rng() * (maxRH - cfg.minRoomH + 1));
        const rx = node.x + pad + Math.floor(this._rng() * (maxRW - rw + 1));
        const ry = node.y + pad + Math.floor(this._rng() * (maxRH - rh + 1));

        const room = {
            id      : `room_${roomList.length}`,
            bounds  : { x: rx, y: ry, w: rw, h: rh },
            center  : { x: Math.floor(rx + rw / 2), y: Math.floor(ry + rh / 2) },
            type    : null,           // assigné dans _assignTypes
            depth   : node.depth,
            hookId  : null,           // hook narratif (pour l'histoire)
            content : null,           // données de contenu (roomContent.js)
        };

        node.room = room;
        roomList.push(room);
    }

    /** Peint les tuiles de sol d'une salle. */
    _paintRoom(room, tiles) {
        const { x, y, w, h } = room.bounds;
        for (let row = y; row < y + h; row++)
            for (let col = x; col < x + w; col++)
                tiles[row][col] = TILE.FLOOR;
    }

    /**
     * Connecte récursivement les salles sœurs par un couloir en L.
     * Remonte l'arbre BSP pour garantir que toutes les salles sont accessibles.
     */
    _connectSiblings(node, tiles) {
        if (node.isLeaf) return;

        const leafA = node.left.randomLeaf;
        const leafB = node.right.randomLeaf;

        if (leafA.room && leafB.room) {
            this._drawCorridor(
                leafA.room.center,
                leafB.room.center,
                tiles,
            );
        }

        this._connectSiblings(node.left,  tiles);
        this._connectSiblings(node.right, tiles);
    }

    /**
     * Couloir en L entre deux centres.
     * Alterne aléatoirement H→V ou V→H.
     */
    _drawCorridor(a, b, tiles) {
        const w = this._cfg.corridorW;

        if (this._rng() < 0.5) {
            this._hLine(tiles, a.x, b.x, a.y, w);
            this._vLine(tiles, a.y, b.y, b.x, w);
        } else {
            this._vLine(tiles, a.y, b.y, a.x, w);
            this._hLine(tiles, a.x, b.x, b.y, w);
        }
    }

    _hLine(tiles, x1, x2, y, width) {
        const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1];
        const off = Math.floor(width / 2);
        for (let x = lo; x <= hi; x++)
            for (let dy = -off; dy < width - off; dy++)
                this._setFloor(tiles, x, y + dy);
    }

    _vLine(tiles, y1, y2, x, width) {
        const [lo, hi] = y1 < y2 ? [y1, y2] : [y2, y1];
        const off = Math.floor(width / 2);
        for (let y = lo; y <= hi; y++)
            for (let dx = -off; dx < width - off; dx++)
                this._setFloor(tiles, x + dx, y);
    }

    _setFloor(tiles, col, row) {
        const { mapWidth: W, mapHeight: H } = this._cfg;
        if (col > 0 && col < W - 1 && row > 0 && row < H - 1)
            tiles[row][col] = TILE.FLOOR;
    }

    /**
     * Génère les murs : toute tuile VOID adjacente (8-dir) à un FLOOR devient WALL.
     */
    _generateWalls(tiles, W, H) {
        for (let row = 0; row < H; row++) {
            for (let col = 0; col < W; col++) {
                if (tiles[row][col] !== TILE.VOID) continue;
                if (this._hasFloorNeighbor(tiles, col, row, W, H))
                    tiles[row][col] = TILE.WALL;
            }
        }
    }

    _hasFloorNeighbor(tiles, col, row, W, H) {
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = col + dx, ny = row + dy;
                if (nx >= 0 && nx < W && ny >= 0 && ny < H && tiles[ny][nx] === TILE.FLOOR)
                    return true;
            }
        return false;
    }

    // ──────────────────────────────────────────────────────────────
    // Attribution des types et hooks
    // ──────────────────────────────────────────────────────────────

    /**
     * Attribue un type à chaque salle et un hookId aux salles spéciales.
     *
     * Logique :
     *   start    = salle la plus "haute-gauche" (premier point d'entrée)
     *   exit     = salle la plus éloignée du start
     *   boss     = 2ème plus éloignée
     *   story    = 1-2 salles intermédiaires
     *   treasure = 1 salle aléatoire
     *   normal   = toutes les autres
     */
    _assignTypes(rooms) {
        if (rooms.length === 0) return;

        // Trier par distance euclidienne depuis la première salle
        const anchor = rooms[0];
        const sorted = [...rooms].sort((a, b) =>
            Math.hypot(a.center.x - anchor.center.x, a.center.y - anchor.center.y) -
            Math.hypot(b.center.x - anchor.center.x, b.center.y - anchor.center.y)
        );

        const n = sorted.length;

        sorted[0].type = 'start';
        sorted[n - 1].type = 'exit';
        if (n > 2) sorted[n - 2].type = 'boss';

        // Story rooms (1 ou 2 selon la taille du donjon)
        const storyCount = n > 6 ? 2 : 1;
        let storyAssigned = 0;
        for (let i = Math.floor(n * 0.35); i < Math.floor(n * 0.65) && storyAssigned < storyCount; i++) {
            if (!sorted[i].type) {
                sorted[i].type = 'story';
                storyAssigned++;
            }
        }

        // Treasure room
        for (let i = 1; i < n - 1; i++) {
            if (!sorted[i].type) {
                sorted[i].type = 'treasure';
                break;
            }
        }

        // Normal : toutes les salles non assignées
        rooms.forEach(r => { if (!r.type) r.type = 'normal'; });

        // Attribution des hookIds narratifs
        this._assignHooks(rooms);

        // Lier le template de contenu
        rooms.forEach(r => {
            r.content = ROOM_TEMPLATES[r.type] ?? ROOM_TEMPLATES.normal;
        });
    }

    /**
     * Attribue les identifiants de hooks narratifs.
     * Format : 'floor_1_<type>[_N]'
     *
     * Ces IDs sont la clé dans STORY_CONTENT (roomContent.js).
     * Quand l'histoire est fournie, on peuple STORY_CONTENT sans rien changer ici.
     */
    _assignHooks(rooms) {
        let storyIdx = 1;
        rooms.forEach(r => {
            const def = ROOM_TYPES[r.type];
            if (!def?.storyHook) return;

            switch (r.type) {
                case 'boss' : r.hookId = 'floor_1_boss';            break;
                case 'exit' : r.hookId = 'floor_1_exit';            break;
                case 'story': r.hookId = `floor_1_story_${storyIdx++}`; break;
            }
        });
    }

    // ──────────────────────────────────────────────────────────────
    // Utilitaires
    // ──────────────────────────────────────────────────────────────

    /** Grille 2D initialisée à une valeur. */
    _grid(w, h, val) {
        return Array.from({ length: h }, () => new Array(w).fill(val));
    }

    /** Position pixel du centre de la salle de départ. */
    _startPixelPos(rooms, tileSize) {
        const start = rooms.find(r => r.type === 'start') ?? rooms[0];
        return {
            x: start.center.x * tileSize,
            y: start.center.y * tileSize,
        };
    }

    /**
     * LCG rapide pour RNG reproductible.
     * https://en.wikipedia.org/wiki/Linear_congruential_generator
     */
    _seededRNG(seed) {
        let s = seed | 0;
        return () => {
            s = (Math.imul(1664525, s) + 1013904223) | 0;
            return (s >>> 0) / 0x100000000;
        };
    }
}
