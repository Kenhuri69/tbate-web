/**
 * GAME SCENE — Scène principale
 *
 * Dépend de (globals) : tous les modules chargés via index.html
 */
class GameScene extends Phaser.Scene {

    constructor() { super({ key: 'GameScene' }); }

    preload() {
        // Précharger les JSONs de dialogue (hookIds connus du donjon BSP)
        StoryManager.preloadDialogues(this, [
            'floor_1_boss',
            'floor_1_exit',
            'floor_1_story_1',
            'floor_1_story_2',
            'start_zone',
        ]);
    }

    create() {
        // 1. Textures
        const texGen = new TextureGenerator(this);
        texGen.createTileTexture();
        texGen.createWallTexture();
        texGen.createPlayerTexture();
        texGen.createEnemyTexture();
        texGen.createProjectileTextures(SPELLS);

        // 2. Stats
        this.stats = new StatsSystem(this);

        // 3. Donjon
        const generator    = new DungeonGenerator();
        this.dungeonMap    = generator.generate();
        this.dungeonRenderer = new DungeonRenderer(this, this.dungeonMap);
        this.dungeonRenderer.render();

        // 4. Bornes physiques
        this.physics.world.setBounds(
            0, 0,
            this.dungeonRenderer.mapPixelWidth,
            this.dungeonRenderer.mapPixelHeight,
        );

        // 5. Joueur
        const { x: sx, y: sy } = this.dungeonMap.startPos;
        this.player = new Player(this, sx, sy, this.stats);
        this.stats.currentHP = this.stats.maxHP;

        // 6. Ennemis
        this.enemies    = [];
        this.enemyGroup = this.physics.add.group();
        this._spawnEnemiesFromDungeon();

        // 7. Collisions murs
        const wallGroup = this.dungeonRenderer.getWallGroup();
        this.physics.add.collider(this.player.sprite, wallGroup);
        this.physics.add.collider(this.enemyGroup,    wallGroup);

        // 8. Audio + Sorts
        this.audio       = new AudioSystem(this);
        this.spellSystem = new SpellSystem(this, this.player.sprite);

        this.physics.add.overlap(
            this.spellSystem.physicsGroup, this.enemyGroup,
            this._onProjectileHitEnemy, null, this,
        );
        this.physics.add.collider(
            this.spellSystem.physicsGroup, wallGroup,
            (projSprite) => { projSprite.projRef?.destroy(); },
        );

        // 9. Dégâts de contact ennemi→joueur
        this._contactCooldown = 0;
        this.physics.add.overlap(
            this.player.sprite, this.enemyGroup,
            this._onEnemyContactPlayer, null, this,
        );

        // 10. Trigger zones
        this._setupTriggerZones();

        // === STORY MANAGER GÉNÉRIQUE ===
        this.storyManager = new StoryManager(this);

        // 11. Contrôles mobiles
        this.mobileControls = new MobileControls(this);
        this.scale.on('resize', (gs) => {
            if (this.mobileControls?.resize) this.mobileControls.resize(gs.width, gs.height);
        }, this);

        // 12. UI
        this.hud        = new HUD(this, this.stats);
        this.spellBar   = new SpellBar(this, this.spellSystem);
        this.statsPanel = new StatsPanel(this, this.stats);

        // 13. XP combat → niveau joueur UNIQUEMENT (plus de Mana Core XP ici)
        this.events.on('enemy:died', ({ xpDrop, x, y, resourceDrop }) => {
            this.stats.gainPlayerXP(xpDrop * 2);
            // Drop de ressource Mana
            if (resourceDrop) {
                this.player.mana.addResource(resourceDrop);
                this._spawnResourceFx(resourceDrop, x, y);
            }
        });

        // 14. Interruption méditation par dégâts
        this.events.on('stats:changed', () => {
            if (this.player.mana.isMeditating) {
                this.player.mana.stopMeditation(true);
            }
        });

        // 15. Caméra
        this._setupCamera();
    }

    update(time, delta) {
        if (this._contactCooldown > 0) this._contactCooldown--;

        this.player.update(time);
        this.player.mana.update(delta);   // tick méditation
        this.spellSystem.update();
        this.spellBar.update();

        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        this.enemies.forEach(e => e.update(px, py));
        this.enemies = this.enemies.filter(e => e.alive || (e.sprite && e.sprite.active));
    }

    // ----------------------------------------------------------------

    _spawnEnemiesFromDungeon() {
        for (const spawn of this.dungeonRenderer.getEnemySpawns()) {
            const mult   = spawn.xpMultiplier;
            const hp     = Math.round(50 * mult);
            const speed  = spawn.roomType === 'boss' ? 35 : 55;
            const xpDrop = Math.round(30 * mult);

            // Calcul du drop de ressource selon les taux de MANA_RESOURCES
            const roll = Math.random();
            let cumul  = 0;
            let resourceDrop = null;
            for (const res of [...MANA_RESOURCES].reverse()) {
                cumul += res.dropRate;
                if (roll < cumul) { resourceDrop = res.id; break; }
            }

            const e = new Enemy(this, spawn.x, spawn.y, { hp, speed, xpDrop, resourceDrop });
            this.enemies.push(e);
            this.enemyGroup.add(e.sprite);
        }
    }

    _spawnResourceFx(resourceId, x, y) {
        const res = MANA_RESOURCES.find(r => r.id === resourceId);
        if (!res) return;
        const t = this.add.text(x, y - 20, `${res.icon} +${res.essence} Essence`, {
            fontFamily: 'monospace', fontSize: '11px',
            color: res.color, stroke: '#000000', strokeThickness: 2,
        }).setDepth(20).setOrigin(0.5);
        this.tweens.add({
            targets: t, y: y - 60, alpha: 0, duration: 1200, ease: 'Power2',
            onComplete: () => t.destroy(),
        });
    }

    _setupTriggerZones() {
        const zones = this.dungeonRenderer.getTriggerZones();
        if (!zones.length) return;
        this.physics.add.overlap(
            this.player.sprite, zones,
            (playerSprite, zone) => {
                if (zone._fired) return;
                zone._fired = true;
                this.events.emit('room:entered', {
                    roomId: zone.roomId, hookId: zone.hookId, roomType: zone.roomType,
                });
            },
        );
    }

    _onEnemyContactPlayer(playerSprite, enemySprite) {
        const enemy = enemySprite.enemyRef;
        if (!enemy?.alive || this._contactCooldown > 0) return;
        this._contactCooldown = 90;
        this.stats.takeDamage(8);  // déclenche stats:changed → interrompt méditation
        this.player.sprite.setTint(0xff2222);
        this.time.delayedCall(180, () => {
            if (this.player.sprite?.active) this.player.sprite.clearTint();
        });
    }

    _onProjectileHitEnemy(projSprite, enemySprite) {
        const proj  = projSprite.projRef;
        const enemy = enemySprite.enemyRef;
        if (!proj?.alive || !enemy?.alive) return;

        const { value: dmg, crit } = this.stats.spellDamage(proj.spell.damage);
        enemy.takeDamage(dmg);
        this.stats.gainPlayerXP(proj.spell.xpReward * 2);

        this.audio.playHit(crit);
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
        const cam  = this.cameras.main;
        const zoom = window.innerWidth < 900 ? 1.0 : 1.5;
        const env  = DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor] ?? DUNGEON_ENVIRONMENTS[3];

        // Couleur de fond adaptée à l'environnement
        const bgColor = env.floorColor ?? '#000000';

        cam.setBounds(0, 0, this.dungeonRenderer.mapPixelWidth, this.dungeonRenderer.mapPixelHeight)
           .startFollow(this.player.sprite, true, 1, 1)
           .setZoom(zoom)
           .setBackgroundColor(bgColor);
        this.time.delayedCall(16, () => cam.setLerp(0.10, 0.10));
    }
}