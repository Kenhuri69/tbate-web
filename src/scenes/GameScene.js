/**
 * GAME SCENE — Scène principale
 *
 * Orchestre : map, joueur, ennemis, sorts, collisions, caméra.
 *
 * Flux create() :
 *   textures → map → joueur → ennemis → SpellSystem →
 *   overlap → HUD + SpellBar → caméra
 *
 * TODO : séparer en BootScene + PreloadScene + GameScene.
 * TODO : ajouter UIScene en overlay (caméra fixe indépendante).
 * TODO : remplacer la map par un générateur de donjon BSP.
 *
 * Dépend de (globals) : TextureGenerator, Player, Enemy, SpellSystem,
 *                       HUD, SpellBar, SPELLS
 */

const MAP_COLS  = 50;
const MAP_ROWS  = 30;
const TILE_SIZE = 32;

// Positions de spawn des ennemis (fractions relatives de la map)
// TODO : générer depuis un niveau JSON
const ENEMY_SPAWN = [
    { rx: 0.25, ry: 0.30, hp: 50,  speed: 55, xpDrop: 30 },
    { rx: 0.75, ry: 0.30, hp: 80,  speed: 38, xpDrop: 50 },
    { rx: 0.50, ry: 0.75, hp: 65,  speed: 68, xpDrop: 40 },
];

class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Rien à précharger — tout est généré procéduralement.
    }

    create() {
        // 1. Textures procédurales
        const texGen = new TextureGenerator(this);
        texGen.createTileTexture();
        texGen.createWallTexture();
        texGen.createPlayerTexture();
        texGen.createEnemyTexture();
        texGen.createProjectileTextures(SPELLS);

        // 2. Tilemap
        this._buildMap();

        // 3. Joueur (centre de la map)
        const cx = (MAP_COLS * TILE_SIZE) / 2;
        const cy = (MAP_ROWS * TILE_SIZE) / 2;
        this.player = new Player(this, cx, cy);

        // 4. Ennemis
        this.enemies    = [];
        this.enemyGroup = this.physics.add.group();
        this._spawnEnemies();

        // 5. Système de sorts
        this.spellSystem = new SpellSystem(this, this.player.sprite);

        // 6. Collision : projectiles ↔ ennemis
        this.physics.add.overlap(
            this.spellSystem.physicsGroup,
            this.enemyGroup,
            this._onProjectileHitEnemy,
            null,
            this,
        );

        // 7. UI
        this.hud      = new HUD(this);
        this.spellBar = new SpellBar(this, this.spellSystem);

        // 8. XP à la mort d'un ennemi
        this.events.on('enemy:died', ({ xpDrop }) => {
            this.player.mana.gainExperience(xpDrop);
        });

        // 9. Caméra
        this._setupCamera();
    }

    update(time) {
        this.player.update(time);
        this.spellSystem.update();
        this.spellBar.update();

        // IA des ennemis
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        this.enemies.forEach(e => e.update(px, py));

        // Nettoyage des ennemis dont l'animation de mort est terminée
        this.enemies = this.enemies.filter(e => e.alive || (e.sprite && e.sprite.active));
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

    /**
     * Tilemap : murs sur le périmètre, sol à l'intérieur.
     * TODO : générateur BSP / WFC pour des donjons vrais.
     */
    _buildMap() {
        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLS; col++) {
                const isWall = (
                    row === 0 || row === MAP_ROWS - 1 ||
                    col === 0 || col === MAP_COLS - 1
                );
                this.add.image(
                    col * TILE_SIZE + TILE_SIZE / 2,
                    row * TILE_SIZE + TILE_SIZE / 2,
                    isWall ? 'wall' : 'tile',
                ).setDepth(0);
            }
        }
        this.physics.world.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    }

    _spawnEnemies() {
        const mapW = MAP_COLS * TILE_SIZE;
        const mapH = MAP_ROWS * TILE_SIZE;
        ENEMY_SPAWN.forEach(cfg => {
            const enemy = new Enemy(this, mapW * cfg.rx, mapH * cfg.ry, cfg);
            this.enemies.push(enemy);
            this.enemyGroup.add(enemy.sprite);
        });
    }

    /**
     * Callback Phaser Arcade : projectile touche un ennemi.
     * Les deux sprites sont passés automatiquement.
     */
    _onProjectileHitEnemy(projSprite, enemySprite) {
        const proj  = projSprite.projRef;
        const enemy = enemySprite.enemyRef;

        // Guards : double-collision dans le même frame
        if (!proj?.alive || !enemy?.alive) return;

        enemy.takeDamage(proj.spell.damage);
        this.player.mana.gainExperience(proj.spell.xpReward);
        this._spawnImpactFx(proj.spell, projSprite.x, projSprite.y);
        proj.destroy();
    }

    /** Éclat graphique au point d'impact. */
    _spawnImpactFx(spell, x, y) {
        const gfx = this.add.graphics().setDepth(16);
        gfx.fillStyle(spell.color, 0.85);
        gfx.fillCircle(x, y, spell.size * 2.5);
        gfx.fillStyle(0xffffff, 0.50);
        gfx.fillCircle(x, y, spell.size);

        this.tweens.add({
            targets   : gfx,
            alpha     : 0,
            scaleX    : 2.5,
            scaleY    : 2.5,
            duration  : 220,
            ease      : 'Power2',
            onComplete: () => gfx.destroy(),
        });
    }

    /**
     * Caméra avec lerp doux et zoom pixel-art 1.5×.
     * TODO : screen shake sur dégâts reçus (camera.shake).
     */
    _setupCamera() {
        this.cameras.main
            .setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE)
            .startFollow(this.player.sprite, true, 0.1, 0.1)
            .setZoom(1.5)
            .setBackgroundColor('#000000');
    }
}
