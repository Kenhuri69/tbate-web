/**
 * GAME SCENE — Scène principale
 *
 * Orchestration :
 *   StatsSystem → DungeonGenerator → DungeonRenderer → Player → Enemies →
 *   SpellSystem → TriggerZones → MobileControls → HUD + SpellBar + StatsPanel → Caméra
 *
 * Flux de dégâts :
 *   Projectile touche ennemi
 *   → stats.spellDamage(base)  (bonus MAG + crit)
 *   → enemy.takeDamage(value)
 *   → player.mana.gainExperience(xpReward)  (Mana Core XP)
 *   → stats.gainPlayerXP(xpReward × 2)      (niveau joueur)
 *   → si crit : affiche texte jaune "CRIT!"
 *
 * Flux narratif :
 *   Joueur entre dans une zone → physics overlap
 *   → zone._fired = true  (oneShot)
 *   → scene.events.emit('room:entered', { roomId, hookId, roomType })
 *   → futur StorySystem écoute et déclenche dialogues / cutscenes TBATE
 *
 * TODO : séparer en BootScene + PreloadScene + GameScene.
 * TODO : ajouter UIScene en overlay (caméra fixe indépendante).
 * TODO : connecter StorySystem à 'room:entered' pour les dialogues/cutscenes.
 * TODO : murs physiques tile-par-tile (Phaser Tilemap).
 *
 * Dépend de (globals) : tous les modules chargés via index.html
 */
class GameScene extends Phaser.Scene {

    constructor() { super({ key: 'GameScene' }); }

    preload() {}

    create() {
        // 1. Textures (générées via Canvas, aucun asset externe)
        const texGen = new TextureGenerator(this);
        texGen.createTileTexture();
        texGen.createWallTexture();
        texGen.createPlayerTexture();
        texGen.createEnemyTexture();
        texGen.createProjectileTextures(SPELLS);

        // 2. Système de stats (avant Player — Player lit stats.moveSpeed)
        this.stats = new StatsSystem(this);

        // 3. Génération BSP du donjon (pure data, sans Phaser)
        const generator    = new DungeonGenerator();
        this.dungeonMap    = generator.generate();

        // 4. Rendu du donjon : tuiles → RenderTexture, overlays, marqueurs, zones
        this.dungeonRenderer = new DungeonRenderer(this, this.dungeonMap);
        this.dungeonRenderer.render();

        // 5. Bornes du monde physique
        this.physics.world.setBounds(
            0, 0,
            this.dungeonRenderer.mapPixelWidth,
            this.dungeonRenderer.mapPixelHeight,
        );

        // 6. Joueur — centré sur la salle de départ
        const { x: sx, y: sy } = this.dungeonMap.startPos;
        this.player = new Player(this, sx, sy, this.stats);
        this.stats.currentHP = this.stats.maxHP;

        // 7. Ennemis — spawn depuis les points calculés par DungeonRenderer
        this.enemies    = [];
        this.enemyGroup = this.physics.add.group();
        this._spawnEnemiesFromDungeon();

        // 8. Système de sorts
        this.spellSystem = new SpellSystem(this, this.player.sprite);

        // 9. Collision : projectiles ↔ ennemis
        this.physics.add.overlap(
            this.spellSystem.physicsGroup,
            this.enemyGroup,
            this._onProjectileHitEnemy,
            null,
            this,
        );

        // 10. Zones narratives (hooks TBATE : boss, exit, story…)
        this._setupTriggerZones();

        // 11. Contrôles mobiles (exposé sur la scène pour que Player y accède)
        this.mobileControls = new MobileControls(this);

        // 12. UI
        this.hud        = new HUD(this, this.stats);
        this.spellBar   = new SpellBar(this, this.spellSystem);
        this.statsPanel = new StatsPanel(this, this.stats);

        // 13. XP à la mort d'un ennemi
        this.events.on('enemy:died', ({ xpDrop }) => {
            this.player.mana.gainExperience(xpDrop);
            this.stats.gainPlayerXP(xpDrop * 2);
        });

        // 14. Caméra
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
    // Spawn ennemis
    // ----------------------------------------------------------------

    /**
     * Crée les ennemis à partir des points de spawn calculés par DungeonRenderer.
     * HP / vitesse / XP sont mis à l'échelle du multiplicateur de la salle.
     */
    _spawnEnemiesFromDungeon() {
        for (const spawn of this.dungeonRenderer.getEnemySpawns()) {
            const mult  = spawn.xpMultiplier;
            const hp    = Math.round(50 * mult);
            const speed = spawn.roomType === 'boss' ? 35 : 55;
            const xpDrop = Math.round(30 * mult);

            const e = new Enemy(this, spawn.x, spawn.y, { hp, speed, xpDrop });
            this.enemies.push(e);
            this.enemyGroup.add(e.sprite);
        }
    }

    // ----------------------------------------------------------------
    // Zones narratives (hooks histoire TBATE)
    // ----------------------------------------------------------------

    /**
     * Connecte le joueur aux zones de déclenchement du donjon.
     * Chaque zone ne se déclenche qu'une fois (zone._fired).
     * Émet 'room:entered' pour le futur StorySystem.
     */
    _setupTriggerZones() {
        const zones = this.dungeonRenderer.getTriggerZones();
        if (!zones.length) return;

        this.physics.add.overlap(
            this.player.sprite,
            zones,
            (playerSprite, zone) => {
                if (zone._fired) return;
                zone._fired = true;

                this.events.emit('room:entered', {
                    roomId  : zone.roomId,
                    hookId  : zone.hookId,
                    roomType: zone.roomType,
                });

                // Placeholder visuel jusqu'à l'implémentation du StorySystem
                console.log(
                    `[TBATE] room:entered — hookId="${zone.hookId}"  type="${zone.roomType}"`,
                );
            },
        );
    }

    // ----------------------------------------------------------------
    // Combat
    // ----------------------------------------------------------------

    _onProjectileHitEnemy(projSprite, enemySprite) {
        const proj  = projSprite.projRef;
        const enemy = enemySprite.enemyRef;
        if (!proj?.alive || !enemy?.alive) return;

        const { value: dmg, crit } = this.stats.spellDamage(proj.spell.damage);
        enemy.takeDamage(dmg);

        this.player.mana.gainExperience(proj.spell.xpReward);
        this.stats.gainPlayerXP(proj.spell.xpReward * 2);

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

    // ----------------------------------------------------------------
    // Caméra
    // ----------------------------------------------------------------

    _setupCamera() {
        this.cameras.main
            .setBounds(
                0, 0,
                this.dungeonRenderer.mapPixelWidth,
                this.dungeonRenderer.mapPixelHeight,
            )
            .startFollow(this.player.sprite, true, 0.1, 0.1)
            .setZoom(1.5)
            .setBackgroundColor('#000000');
    }
}
