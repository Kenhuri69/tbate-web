/**
 * GAME SCENE — Scène principale
 *
 * Orchestration :
 *   StatsSystem → Map → Player → Enemies → SpellSystem →
 *   Overlaps → MobileControls → HUD + SpellBar + StatsPanel → Caméra
 *
 * Flux de dégâts :
 *   Projectile touche ennemi
 *   → stats.spellDamage(base)  (bonus MAG + crit)
 *   → enemy.takeDamage(value)
 *   → player.mana.gainExperience(xpReward)  (Mana Core XP)
 *   → stats.gainPlayerXP(xpReward × 2)      (niveau joueur)
 *   → si crit : affiche texte rouge "CRITIQUE"
 *
 * TODO : séparer en BootScene + PreloadScene + GameScene.
 * TODO : ajouter UIScene en overlay (caméra fixe indépendante).
 * TODO : remplacer la tilemap par un générateur de donjon BSP.
 *
 * Dépend de (globals) : tous les modules chargés via index.html
 */

const MAP_COLS  = 50;
const MAP_ROWS  = 30;
const TILE_SIZE = 32;

const ENEMY_SPAWN = [
    { rx: 0.25, ry: 0.30, hp:  50, speed: 55, xpDrop: 30 },
    { rx: 0.75, ry: 0.30, hp:  80, speed: 38, xpDrop: 50 },
    { rx: 0.50, ry: 0.75, hp:  65, speed: 68, xpDrop: 40 },
];

class GameScene extends Phaser.Scene {

    constructor() { super({ key: 'GameScene' }); }

    preload() {}

    create() {
        // 1. Textures
        const texGen = new TextureGenerator(this);
        texGen.createTileTexture();
        texGen.createWallTexture();
        texGen.createPlayerTexture();
        texGen.createEnemyTexture();
        texGen.createProjectileTextures(SPELLS);

        // 2. Système de stats (doit être créé avant Player)
        this.stats = new StatsSystem(this);

        // 3. Map
        this._buildMap();

        // 4. Joueur
        const cx = (MAP_COLS * TILE_SIZE) / 2;
        const cy = (MAP_ROWS * TILE_SIZE) / 2;
        this.player = new Player(this, cx, cy, this.stats);
        this.stats.currentHP = this.stats.maxHP; // init HP après création

        // 5. Ennemis
        this.enemies    = [];
        this.enemyGroup = this.physics.add.group();
        this._spawnEnemies();

        // 6. Système de sorts
        this.spellSystem = new SpellSystem(this, this.player.sprite);

        // 7. Collision : projectiles ↔ ennemis
        this.physics.add.overlap(
            this.spellSystem.physicsGroup,
            this.enemyGroup,
            this._onProjectileHitEnemy,
            null,
            this,
        );

        // 8. Contrôles mobiles (exposé sur la scène pour que Player y accède)
        this.mobileControls = new MobileControls(this);

        // 9. UI
        this.hud        = new HUD(this, this.stats);
        this.spellBar   = new SpellBar(this, this.spellSystem);
        this.statsPanel = new StatsPanel(this, this.stats);

        // 10. XP à la mort d'un ennemi
        this.events.on('enemy:died', ({ xpDrop }) => {
            this.player.mana.gainExperience(xpDrop);
            this.stats.gainPlayerXP(xpDrop * 2);
        });

        // 11. Caméra
        this._setupCamera();
    }

    update(time) {
        this.player.update(time);
        this.spellSystem.update();
        this.spellBar.update();

        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        this.enemies.forEach(e => e.update(px, py));
        this.enemies = this.enemies.filter(e => e.alive || (e.sprite && e.sprite.active));
    }

    // ----------------------------------------------------------------
    // Privé
    // ----------------------------------------------------------------

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
        const W = MAP_COLS * TILE_SIZE;
        const H = MAP_ROWS * TILE_SIZE;
        ENEMY_SPAWN.forEach(cfg => {
            const e = new Enemy(this, W * cfg.rx, H * cfg.ry, cfg);
            this.enemies.push(e);
            this.enemyGroup.add(e.sprite);
        });
    }

    /**
     * Callback d'overlap : projectile touche un ennemi.
     * Applique le bonus MAG + critique depuis StatsSystem.
     */
    _onProjectileHitEnemy(projSprite, enemySprite) {
        const proj  = projSprite.projRef;
        const enemy = enemySprite.enemyRef;
        if (!proj?.alive || !enemy?.alive) return;

        // Dégâts avec stats
        const { value: dmg, crit } = this.stats.spellDamage(proj.spell.damage);
        enemy.takeDamage(dmg);

        // XP Mana Core + XP joueur par hit
        this.player.mana.gainExperience(proj.spell.xpReward);
        this.stats.gainPlayerXP(proj.spell.xpReward * 2);

        // Effets visuels
        this._spawnImpactFx(proj.spell, projSprite.x, projSprite.y);
        if (crit) this._spawnCritText(projSprite.x, projSprite.y);

        proj.destroy();
    }

    _spawnImpactFx(spell, x, y) {
        const gfx = this.add.graphics().setDepth(16);
        gfx.fillStyle(spell.color, 0.85);
        gfx.fillCircle(x, y, spell.size * 2.5);
        gfx.fillStyle(0xffffff, 0.50);
        gfx.fillCircle(x, y, spell.size);
        this.tweens.add({
            targets: gfx, alpha: 0, scaleX: 2.5, scaleY: 2.5,
            duration: 220, ease: 'Power2', onComplete: () => gfx.destroy(),
        });
    }

    _spawnCritText(x, y) {
        const t = this.add.text(x, y - 10, 'CRIT!', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 3,
        }).setDepth(20).setOrigin(0.5);
        this.tweens.add({
            targets: t, y: y - 50, alpha: 0, duration: 700, ease: 'Power2',
            onComplete: () => t.destroy(),
        });
    }

    _setupCamera() {
        this.cameras.main
            .setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE)
            .startFollow(this.player.sprite, true, 0.1, 0.1)
            .setZoom(1.5)
            .setBackgroundColor('#000000');
    }
}
