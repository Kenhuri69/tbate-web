/**
 * DUNGEON RENDERER
 *
 * Traduit un DungeonMap (données pures) en objets Phaser visibles.
 *
 * Responsabilités :
 *   - Afficher les tuiles sol / mur (RenderTexture = 1 seul draw-call)
 *   - Overlays colorés par type de salle
 *   - Marqueurs visuels (icône entrée, portail sortie)
 *   - Étiquettes de debug des salles (désactivables)
 *   - Zones physiques de déclenchement pour les hooks narratifs
 *
 * API publique :
 *   renderer.render()            → construit les objets Phaser
 *   renderer.getEnemySpawns()    → [{x,y,roomType,count}]
 *   renderer.getTriggerZones()   → Phaser.Zone[] avec .hookId et .roomId
 *   renderer.getWallGroup()      → Phaser.Physics.Arcade.StaticGroup (murs physiques)
 *   renderer.mapPixelWidth       → pour la caméra / physics.world.setBounds
 *   renderer.mapPixelHeight
 *
 * Événements émis (via scene.events) :
 *   'room:entered' { roomId, hookId, roomType } → GameScene / futur StorySystem
 *
 * TODO : minimap — générer une RenderTexture basse résolution.
 * TODO : FOG OF WAR — masquer les salles non visitées.
 *
 * Dépend de (globals) : TILE, ROOM_TYPES, DUNGEON_CONFIG
 */
class DungeonRenderer {

    /**
     * @param {Phaser.Scene} scene
     * @param {DungeonMap}   map   - produit par DungeonGenerator.generate()
     * @param {boolean}      [debug=false]
     */
    constructor(scene, map, debug = false) {
        this.scene = scene;
        this.map   = map;
        this.debug = debug;

        this.mapPixelWidth  = map.width  * map.tileSize;
        this.mapPixelHeight = map.height * map.tileSize;

        this._triggerZones  = [];   // zones physiques narratives
        this._spawnPoints   = [];   // positions de spawn ennemis
        this._wallGroup     = null; // StaticGroup pour les collisions murs
    }

    // ──────────────────────────────────────────────────────────────
    // Rendu principal
    // ──────────────────────────────────────────────────────────────

    /**
     * Construit tous les objets Phaser.
     * Doit être appelé une seule fois dans create().
     */
    render() {
        this._renderTiles();
        this._renderRoomOverlays();
        this._renderMarkers();
        this._buildWallBodies();
        this._renderTiles();
        this._buildTriggerZones();
        this._buildSpawnPoints();
        
        if (this.debug) this._renderDebugLabels();
    }

    // ──────────────────────────────────────────────────────────────
    // Tuiles — RenderTexture (1 draw-call pour tout le donjon)
    // ──────────────────────────────────────────────────────────────

    _renderTiles() {
        const { tiles, width: W, height: H, tileSize: TS } = this.map;

        // Une seule RenderTexture pour tout le sol + murs → perf maximale
        const rt = this.scene.add
            .renderTexture(0, 0, W * TS, H * TS)
            .setDepth(0);

        for (let row = 0; row < H; row++) {
            for (let col = 0; col < W; col++) {
                const t = tiles[row][col];
                if (t === TILE.VOID) continue;
                rt.draw(t === TILE.FLOOR ? 'tile' : 'wall', col * TS, row * TS);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Overlays colorés par type de salle
    // ──────────────────────────────────────────────────────────────

    _renderRoomOverlays() {
        const TS  = this.map.tileSize;
        const env = DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor] ?? DUNGEON_ENVIRONMENTS[3];

        for (const room of this.map.rooms) {
            const def = ROOM_TYPES[room.type];
            if (!def || room.type === 'normal') continue;

            // Couleur de la salle selon l'environnement ou la définition par défaut
            const roomColor = env.roomColors?.[room.type] ?? def.color;

            this.scene.add.rectangle(
                room.bounds.x * TS,
                room.bounds.y * TS,
                room.bounds.w * TS,
                room.bounds.h * TS,
                roomColor,
                0.14,
            ).setOrigin(0).setDepth(1);

            const gfx = this.scene.add.graphics().setDepth(2);
            gfx.lineStyle(1, roomColor, 0.50);
            gfx.strokeRect(
                room.bounds.x * TS,
                room.bounds.y * TS,
                room.bounds.w * TS,
                room.bounds.h * TS,
            );
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Marqueurs visuels (entrée, sortie, trésor, boss)
    // ──────────────────────────────────────────────────────────────

    _renderMarkers() {
        const TS = this.map.tileSize;

        for (const room of this.map.rooms) {
            const cx = room.center.x * TS;
            const cy = room.center.y * TS;

            switch (room.type) {
                case 'start':
                    this._markerEntrance(cx, cy);
                    break;

                case 'exit':
                    this._markerExit(cx, cy);
                    break;

                case 'boss':
                    this._markerBoss(cx, cy);
                    break;

                case 'treasure':
                    this._markerTreasure(cx, cy);
                    break;

                case 'story':
                    this._markerStory(cx, cy);
                    break;
            }
        }
    }

    /** Rune verte d'entrée — tourne lentement. */
    _markerEntrance(cx, cy) {
        const gfx = this.scene.add.graphics().setDepth(3);
        gfx.lineStyle(2, 0x22ff66, 0.9);
        gfx.strokeCircle(cx, cy, 16);
        gfx.lineStyle(1, 0x22ff66, 0.5);
        gfx.strokeCircle(cx, cy, 10);

        this._pulseGraphic(gfx, 0.6, 1.0, 1800);

        this.scene.add.text(cx, cy - 24, '⬇  ENTRÉE', {
            fontFamily: 'monospace', fontSize: '9px', color: '#44ff88',
        }).setOrigin(0.5, 1).setDepth(3);
    }

    /** Portail bleu de sortie — pulse rapidement. */
    _markerExit(cx, cy) {
        const gfx = this.scene.add.graphics().setDepth(3);
        gfx.lineStyle(2, 0x44ddff, 0.9);
        gfx.strokeCircle(cx, cy, 18);

        const inner = this.scene.add.graphics().setDepth(3);
        inner.fillStyle(0x44ddff, 0.2);
        inner.fillCircle(cx, cy, 14);

        this._pulseGraphic(inner, 0.1, 0.5, 900);

        this.scene.add.text(cx, cy - 26, '⬆  SORTIE', {
            fontFamily: 'monospace', fontSize: '9px', color: '#44ddff',
        }).setOrigin(0.5, 1).setDepth(3);
    }

    /** Crâne rouge pour la salle de boss. */
    _markerBoss(cx, cy) {
        const gfx = this.scene.add.graphics().setDepth(3);
        gfx.lineStyle(2, 0xff2200, 0.8);
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI / 2) * i;
            gfx.lineBetween(
                cx + Math.cos(a) * 10, cy + Math.sin(a) * 10,
                cx + Math.cos(a) * 20, cy + Math.sin(a) * 20,
            );
        }
        gfx.strokeCircle(cx, cy, 8);
        this._pulseGraphic(gfx, 0.3, 1.0, 700);
    }

    /** Étoile dorée pour le trésor. */
    _markerTreasure(cx, cy) {
        const gfx = this.scene.add.graphics().setDepth(3);
        gfx.fillStyle(0xddaa00, 0.9);
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const x = cx + Math.cos(a) * 12;
            const y = cy + Math.sin(a) * 12;
            gfx.fillRect(x - 2, y - 2, 4, 4);
        }
    }

    /** Glyphe bleu pour les salles d'histoire. */
    _markerStory(cx, cy) {
        const gfx = this.scene.add.graphics().setDepth(3);
        gfx.lineStyle(1, 0x6688ff, 0.7);
        gfx.strokeCircle(cx, cy, 12);
        gfx.fillStyle(0x6688ff, 0.25);
        gfx.fillCircle(cx, cy, 12);

        this.scene.add.text(cx, cy, '!', {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#aabbff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
    }

    /** Anime l'opacité d'un Graphics en boucle. */
    _pulseGraphic(gfx, alphaFrom, alphaTo, duration) {
        this.scene.tweens.add({
            targets  : gfx,
            alpha    : { from: alphaFrom, to: alphaTo },
            duration,
            yoyo     : true,
            repeat   : -1,
            ease     : 'Sine.easeInOut',
        });
    }

    // ──────────────────────────────────────────────────────────────
    // Zones physiques de déclenchement (hooks narratifs)
    // ──────────────────────────────────────────────────────────────

    /**
     * Crée une zone Phaser statique sur chaque salle avec un hookId.
     * GameScene connecte ensuite le joueur à ces zones.
     *
     * Événement : scene.events.emit('room:entered', { roomId, hookId, roomType })
     */
    _buildTriggerZones() {
        const TS = this.map.tileSize;

        for (const room of this.map.rooms) {
            if (!room.hookId) continue;

            const zone = this.scene.add.zone(
                (room.bounds.x + room.bounds.w * 0.5) * TS,
                (room.bounds.y + room.bounds.h * 0.5) * TS,
                room.bounds.w * TS,
                room.bounds.h * TS,
            );

            // Overlap arcade : la Zone a besoin d'un corps physique MAIS
            // on le met en isSensor pour qu'il ne bloque PAS le joueur.
            this.scene.physics.add.existing(zone, true);
            zone.body.isSensor = true; // traverse sans bloquer

            zone.roomId   = room.id;
            zone.hookId   = room.hookId;
            zone.roomType = room.type;
            zone._fired   = false;

            this._triggerZones.push(zone);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Spawn des ennemis
    // ──────────────────────────────────────────────────────────────

    /**
     * Calcule les points de spawn ennemis selon le template de chaque salle.
     * Ne crée PAS les ennemis — GameScene s'en charge.
     *
     * @returns {{ x, y, type, roomType, xpMultiplier }[]}
     */
    _buildSpawnPoints() {
        const TS  = this.map.tileSize;
        const cfg = DUNGEON_CONFIG;

        for (const room of this.map.rooms) {
            const tpl = room.content;
            if (!tpl || !tpl.spawnTable.length) continue;

            const count = tpl.enemyCount.min +
                Math.floor(Math.random() * (tpl.enemyCount.max - tpl.enemyCount.min + 1));

            for (let i = 0; i < count; i++) {
                // Position aléatoire à l'intérieur de la salle (avec marge)
                const margin = 1.5;
                const ex = (room.bounds.x + margin + Math.random() * (room.bounds.w - margin * 2)) * TS;
                const ey = (room.bounds.y + margin + Math.random() * (room.bounds.h - margin * 2)) * TS;

                // Sélection du type via table de poids
                const type = this._weightedPick(tpl.spawnTable);

                this._spawnPoints.push({
                    x           : ex,
                    y           : ey,
                    type,
                    roomType    : room.type,
                    xpMultiplier: tpl.xpMultiplier,
                });
            }
        }
    }

    _weightedPick(table) {
        const total  = table.reduce((s, e) => s + e.weight, 0);
        let   thresh = Math.random() * total;
        for (const entry of table) {
            thresh -= entry.weight;
            if (thresh <= 0) return entry.type;
        }
        return table[table.length - 1].type;
    }

    // ──────────────────────────────────────────────────────────────
    // Corps physiques des murs (collisions joueur / ennemis / projectiles)
    // ──────────────────────────────────────────────────────────────

    /**
     * Crée un StaticGroup Arcade avec un corps par tuile WALL.
     * Fusionne les tuiles consécutives sur chaque ligne en un seul rectangle
     * pour réduire le nombre de corps physiques (~80 % moins que tile par tile).
     *
     * Les sprites sont invisibles : le RenderTexture gère déjà le visuel.
     */

_buildWallBodies() {
        const { tiles, width: W, height: H, tileSize: TS } = this.map;
        this._wallGroup = this.scene.physics.add.staticGroup();

        // Fusion par ligne : tuiles WALL consécutives → 1 seul corps physique.
        // Résultat : corps physique parfaitement aligné sur le visuel RenderTexture.
        // La RenderTexture dessine col*TS, row*TS (coin haut-gauche).
        // Le body correspondant est centré à col*TS + bw/2, row*TS + TS/2.
        for (let row = 0; row < H; row++) {
            let run = 0, startCol = 0;
            for (let col = 0; col <= W; col++) {
                const isWall = col < W && tiles[row][col] === TILE.WALL;
                if (isWall) {
                    if (run === 0) startCol = col;
                    run++;
                } else if (run > 0) {
                    const bw = run * TS;
                    const cx = startCol * TS + bw / 2;
                    const cy = row * TS + TS / 2;
                    const s = this._wallGroup.create(cx, cy, 'wall');
                    s.setVisible(false)
                     .setDisplaySize(bw, TS)
                     .refreshBody();
                    run = 0;
                }
            }
        }
    }
    
                    
     
    
                     
    // ──────────────────────────────────────────────────────────────
    // Debug
    // ──────────────────────────────────────────────────────────────

    _renderDebugLabels() {
        const TS = this.map.tileSize;
        for (const room of this.map.rooms) {
            const cx = room.center.x * TS;
            const cy = room.center.y * TS;
            this.scene.add.text(cx, cy + 14,
                `${room.id}\n[${ROOM_TYPES[room.type]?.label ?? room.type}]`,
                { fontFamily: 'monospace', fontSize: '8px', color: '#556677', align: 'center' },
            ).setOrigin(0.5, 0).setDepth(4);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // API publique
    // ──────────────────────────────────────────────────────────────

    /** @returns {{ x, y, type, roomType, xpMultiplier }[]} */
    getEnemySpawns() { return this._spawnPoints; }

    /** @returns {Phaser.GameObjects.Zone[]} */
    getTriggerZones() { return this._triggerZones; }

    /** @returns {Phaser.Physics.Arcade.StaticGroup} */
    getWallGroup() { return this._wallGroup; }
}