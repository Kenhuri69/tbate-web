/**
 * LEVEL 1 SCENE — Maison Leywin
 *
 * Map fixe chargée depuis assets/maps/level1_leywin.json.
 * Progression par seuils d'Essence de méditation.
 *
 * État initial :
 *   - Pas de Mana Core → sorts bloqués, SpellBar cachée, aura masquée
 *   - Arme : épée en bois (attaque mêlée arc 120°, portée 64px)
 *   - Ennemis : rats (interrompent méditation), rat alpha (charge)
 *
 * Débloqué à essence=100 : Black Core → sorts, aura, méditation libre
 */
class Level1Scene extends Phaser.Scene {

    constructor() { super({ key: 'Level1Scene' }); }

    preload() {
        this.load.json('level1map', 'assets/maps/level1_leywin.json');
        // Dialogues
        const dlgs = ['chapter1_start','reynolds_magic','alice_healing',
                      'inner_voice_1','black_core_awakening','alice_idle','reynolds_idle'];
        dlgs.forEach(k => this.load.json('dialogue_' + k, `assets/data/story/${k}.json`));
    }

    create() {
        this._mapData      = this.cache.json.get('level1map');
        this._TS           = this._mapData.meta.tileSize;
        this._tiles        = [];       // grille 2D VOID/FLOOR/WALL
        this._wallGroup    = null;
        this._npcs         = [];
        this._enemies      = [];
        this._enemyGroup   = this.physics.add.group();
        this._spawnedWaves = new Set();
        this._firedDlgs    = new Set();
        this._manaUnlocked = false;
        this._meditating   = false;
        this._essenceTimer = 0;
        this._ESSENCE_TICK = 3000;     // 1 essence / 3s en méditation
        this._contactCooldown = 0;

        playerState.manaEssence   = 0;
        playerState.manaCoreLevel = 0;

        // Textures (réutilise TextureGenerator)
        const texGen = new TextureGenerator(this);
        texGen.createPlayerTexture();
        texGen.createTileTexture();
        texGen.createWallTexture();
        this._createNpcTexture();
        this._createRatTexture();
        this._createRatAlphaTexture();
        this._createSwordFxTexture();

        this.stats = new StatsSystem(this);

        this._buildMap();
        this._spawnPlayer();
        this._spawnNpcs();
        this._setupPhysics();
        this._setupControls();
        this._setupCamera();
        this._setupUI();
        this._setupMobile();

        // Dialogue d'intro (immédiat)
        this.time.delayedCall(800, () => this._fireDialogue('chapter1_start'));
    }

    // ────────────────────────────────────────────────────────────────
    // Textures procédurales
    // ────────────────────────────────────────────────────────────────

    _createNpcTexture() {
        if (this.textures.exists('npc_base')) return;
        const cv = document.createElement('canvas'); cv.width = 24; cv.height = 36;
        const c = cv.getContext('2d');
        c.fillStyle = '#f0d0a0'; c.fillRect(8, 0, 8, 8);
        c.fillStyle = '#c08040'; c.fillRect(6, 8, 12, 16);
        c.fillStyle = '#f0d0a0'; c.fillRect(4, 10, 4, 6); c.fillRect(16, 10, 4, 6);
        c.fillStyle = '#805020'; c.fillRect(8, 24, 4, 10); c.fillRect(12, 24, 4, 10);
        this.textures.addCanvas('npc_base', cv);
    }

    _createRatTexture() {
        if (this.textures.exists('rat')) return;
        const cv = document.createElement('canvas'); cv.width = 28; cv.height = 20;
        const c = cv.getContext('2d');
        c.fillStyle = '#7a5030';
        c.beginPath(); c.ellipse(12, 12, 10, 7, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(22, 10, 6, 0, Math.PI*2); c.fill();
        c.fillStyle = '#ff2222'; c.beginPath(); c.arc(25, 8, 2, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#5a3010'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(2, 12); c.quadraticCurveTo(0, 18, 4, 20); c.stroke();
        this.textures.addCanvas('rat', cv);
    }

    _createRatAlphaTexture() {
        if (this.textures.exists('rat_alpha')) return;
        const cv = document.createElement('canvas'); cv.width = 40; cv.height = 28;
        const c = cv.getContext('2d');
        c.fillStyle = '#4a2810';
        c.beginPath(); c.ellipse(16, 17, 14, 9, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(30, 14, 8, 0, Math.PI*2); c.fill();
        c.fillStyle = '#ff0000'; c.beginPath(); c.arc(35, 11, 3, 0, Math.PI*2); c.fill();
        // Cicatrices
        c.strokeStyle = '#2a1408'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(20, 10); c.lineTo(25, 16); c.stroke();
        c.strokeStyle = '#6a3818'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(2, 17); c.quadraticCurveTo(0, 24, 5, 27); c.stroke();
        this.textures.addCanvas('rat_alpha', cv);
    }

    _createSwordFxTexture() {
        if (this.textures.exists('sword_fx')) return;
        const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
        const c = cv.getContext('2d');
        const g = c.createRadialGradient(24, 24, 0, 24, 24, 24);
        g.addColorStop(0, 'rgba(255,220,100,0.9)');
        g.addColorStop(0.4, 'rgba(220,160,60,0.5)');
        g.addColorStop(1, 'rgba(200,120,20,0)');
        c.fillStyle = g; c.fillRect(0,0,48,48);
        this.textures.addCanvas('sword_fx', cv);
    }

    // ────────────────────────────────────────────────────────────────
    // Construction de la map
    // ────────────────────────────────────────────────────────────────

    _buildMap() {
        const md  = this._mapData;
        const TS  = this._TS;
        const W   = md.meta.width;
        const H   = md.meta.height;

        // Init grille VOID
        this._tiles = Array.from({ length: H }, () => new Array(W).fill(0)); // 0=VOID

        // Peindre les salles (FLOOR=1)
        for (const room of md.rooms) {
            const b = room.bounds;
            for (let r = b.y; r < b.y + b.h; r++)
                for (let col = b.x; col < b.x + b.w; col++)
                    this._tiles[r][col] = 1;
        }

        // Peindre les couloirs (passages de 2 tuiles dans les murs)
        for (const cor of md.corridors) {
            if (cor.axis === 'h') {
                // Passage horizontal : ouvre le mur à wallY
                for (let d = 0; d < cor.width; d++)
                    this._tiles[cor.wallY + d][cor.doorX] = 1;
            } else {
                // Passage vertical : ouvre le mur à wallX
                for (let d = 0; d < cor.width; d++)
                    this._tiles[cor.doorY + d][cor.wallX] = 1;
            }
        }

        // Générer les murs (WALL=2) : toute tuile VOID adjacente à un FLOOR
        for (let r = 0; r < H; r++) {
            for (let col = 0; col < W; col++) {
                if (this._tiles[r][col] !== 0) continue;
                if (this._hasFloor(r, col, W, H)) this._tiles[r][col] = 2;
            }
        }

        // Rendu RenderTexture
        const rt = this.add.renderTexture(0, 0, W * TS, H * TS)
            .setOrigin(0).setDepth(0);

        for (const room of md.rooms) {
            this._paintRoomTiles(rt, room, TS);
        }

        // Murs avec couleur générique
        for (let r = 0; r < H; r++)
            for (let col = 0; col < W; col++)
                if (this._tiles[r][col] === 2)
                    rt.draw('wall', col * TS, r * TS);

        // Overlays colorés par salle
        for (const room of md.rooms) {
            const b = room.bounds;
            const color = parseInt(room.floorColor.replace('#',''), 16);
            this.add.rectangle(b.x*TS, b.y*TS, b.w*TS, b.h*TS, color, 0.15)
                .setOrigin(0).setDepth(1);
            // Label salle
            this.add.text((b.x + b.w/2)*TS, (b.y + 0.5)*TS, room.label, {
                fontFamily:'monospace', fontSize:'8px', color:'#664422', alpha:0.6
            }).setOrigin(0.5, 0).setDepth(2);
        }

        // Spots de méditation
        for (const spot of md.meditationSpots) {
            const gfx = this.add.graphics().setDepth(3);
            gfx.lineStyle(1, 0xaa66ff, 0.5);
            gfx.strokeCircle(spot.tileX * TS + TS/2, spot.tileY * TS + TS/2, 20);
            this.add.text(spot.tileX*TS + TS/2, spot.tileY*TS - 4, spot.label, {
                fontFamily:'monospace', fontSize:'7px', color:'#aa66ff'
            }).setOrigin(0.5, 1).setDepth(3);
        }

        // Corps physiques des murs
        this._wallGroup = this.physics.add.staticGroup();
        for (let r = 0; r < H; r++) {
            let run = 0, startCol = 0;
            for (let col = 0; col <= W; col++) {
                const isWall = col < W && this._tiles[r][col] === 2;
                if (isWall) { if (run === 0) startCol = col; run++; }
                else if (run > 0) {
                    const bw = run * TS;
                    const cx = startCol * TS + bw / 2;
                    const cy = r * TS + TS / 2;
                    const s = this._wallGroup.create(cx, cy, 'wall');
                    s.setVisible(false).setDisplaySize(bw, TS).refreshBody();
                    run = 0;
                }
            }
        }

        this.physics.world.setBounds(0, 0, W * TS, H * TS);
    }

    _paintRoomTiles(rt, room, TS) {
        const b = room.bounds;
        // Créer texture temporaire pour cette salle
        const cv = document.createElement('canvas');
        cv.width = TS; cv.height = TS;
        const c = cv.getContext('2d');
        c.fillStyle = room.floorColor; c.fillRect(0,0,TS,TS);
        c.fillStyle = this._lighten(room.floorColor, 1.3);
        [[1,1],[17,1],[1,17],[17,17]].forEach(([x,y]) => c.fillRect(x,y,14,14));
        c.fillStyle = this._darken(room.floorColor, 0.6);
        c.fillRect(0,15,32,2); c.fillRect(15,0,2,32);
        const key = 'floor_' + room.id;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, cv);
        for (let r = b.y; r < b.y + b.h; r++)
            for (let col = b.x; col < b.x + b.w; col++)
                if (this._tiles[r][col] === 1)
                    rt.draw(key, col * TS, r * TS);
    }

    _hasFloor(r, col, W, H) {
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nr = r+dy, nc = col+dx;
                if (nr>=0 && nr<H && nc>=0 && nc<W && this._tiles[nr][nc] === 1) return true;
            }
        return false;
    }

    _lighten(hex, f) {
        const n = parseInt(hex.replace('#',''),16);
        return `rgb(${Math.min(255,Math.floor(((n>>16)&255)*f))},${Math.min(255,Math.floor(((n>>8)&255)*f))},${Math.min(255,Math.floor((n&255)*f))})`;
    }
    _darken(hex, f) { return this._lighten(hex, f); }

    // ────────────────────────────────────────────────────────────────
    // Joueur
    // ────────────────────────────────────────────────────────────────

    _spawnPlayer() {
        const md = this._mapData;
        const TS = this._TS;
        const spawnRoom = md.rooms.find(r => r.spawnPlayer);
        const b = spawnRoom.bounds;
        const px = (b.x + Math.floor(b.w/2)) * TS;
        const py = (b.y + Math.floor(b.h/2)) * TS;

        this._player = this.physics.add.sprite(px, py, 'player')
            .setDepth(10).setCollideWorldBounds(true);

        this._playerHp     = 50;
        this._playerMaxHp  = 50;
        this._swordCooldown = 0;
        this._facing        = { x: 1, y: 0 };
    }

    // ────────────────────────────────────────────────────────────────
    // PNJ
    // ────────────────────────────────────────────────────────────────

    _spawnNpcs() {
        const TS = this._TS;
        for (const npcDef of this._mapData.npcs) {
            const color = parseInt(npcDef.color);
            const sprite = this.add.sprite(npcDef.tileX * TS + TS/2, npcDef.tileY * TS + TS/2, 'npc_base')
                .setDepth(8).setTint(color);
            // Nom flottant
            this.add.text(npcDef.tileX * TS + TS/2, npcDef.tileY * TS - 4, npcDef.name, {
                fontFamily:'monospace', fontSize:'8px', color:'#ffddaa',
                stroke:'#000', strokeThickness:2
            }).setOrigin(0.5,1).setDepth(9);
            // Zone interactive
            const zone = this.add.zone(npcDef.tileX*TS+TS/2, npcDef.tileY*TS+TS/2, TS*2, TS*2)
                .setInteractive();
            zone.on('pointerdown', () => this._fireDialogue(npcDef.dialogueKey));
            this._npcs.push({ def: npcDef, sprite, zone });
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Ennemis
    // ────────────────────────────────────────────────────────────────

    _spawnWave(wave) {
        const TS = this._TS;
        for (const ed of wave.enemies) {
            const count = ed.count ?? 1;
            for (let i = 0; i < count; i++) {
                const x = ed.tileX * TS + TS/2 + (i * TS);
                const y = ed.tileY * TS + TS/2;
                this._spawnEnemy(ed.type, x, y);
            }
        }
    }

    _spawnEnemy(type, x, y) {
        const isAlpha = type === 'rat_alpha';
        const cfg = {
            hp: isAlpha ? 60 : 20,
            speed: isAlpha ? 40 : 60,
            xpDrop: isAlpha ? 30 : 8,
            damage: isAlpha ? 12 : 5,
        };
        const sprite = this.physics.add.sprite(x, y, type)
            .setDepth(10);
        const hpBar = this.add.graphics().setDepth(11);
        const enemy = {
            sprite, hpBar, type, alive: true,
            hp: cfg.hp, maxHp: cfg.hp,
            speed: cfg.speed, xpDrop: cfg.xpDrop, damage: cfg.damage,
            isAlpha,
            hitTimer: 0,
            // Charge pour rat_alpha
            chargeState: 'idle',   // idle | windup | charging | cooldown
            chargeTimer: 0,
            chargeVx: 0, chargeVy: 0,
            chargeWindupTime: 1200,
            chargeDuration: 400,
            chargeCooldown: 2000,
        };
        sprite._enemyRef = enemy;
        this._enemies.push(enemy);
        this._enemyGroup.add(sprite);
        return enemy;
    }

    _updateEnemies(delta) {
        const px = this._player.x;
        const py = this._player.y;

        for (let i = this._enemies.length - 1; i >= 0; i--) {
            const e = this._enemies[i];
            if (!e.alive || !e.sprite.active) { this._enemies.splice(i, 1); continue; }

            if (e.hitTimer > 0) e.hitTimer -= delta;

            if (e.isAlpha) {
                this._updateRatAlpha(e, delta, px, py);
            } else {
                this._updateRat(e, px, py);
            }
            this._drawEnemyHpBar(e);
        }
    }

    _updateRat(e, px, py) {
        const dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, px, py);
        if (dist < 180) {
            this.physics.moveTo(e.sprite, px, py, e.speed);
        } else {
            e.sprite.setVelocity(0, 0);
        }
    }

    _updateRatAlpha(e, delta, px, py) {
        const dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, px, py);

        switch (e.chargeState) {
            case 'idle':
                // Approche lente
                if (dist < 200) this.physics.moveTo(e.sprite, px, py, e.speed * 0.6);
                else e.sprite.setVelocity(0, 0);
                // Déclenche windup si assez proche
                if (dist < 150) {
                    e.chargeState = 'windup';
                    e.chargeTimer = e.chargeWindupTime;
                    e.sprite.setTint(0xff6600); // orange = windup
                    // Mémoriser direction
                    const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, px, py);
                    e.chargeVx = Math.cos(angle) * 280;
                    e.chargeVy = Math.sin(angle) * 280;
                    e.sprite.setVelocity(0, 0);
                }
                break;

            case 'windup':
                e.chargeTimer -= delta;
                // Vibration visuelle
                e.sprite.x += Math.sin(Date.now() * 0.02) * 0.8;
                if (e.chargeTimer <= 0) {
                    e.chargeState = 'charging';
                    e.chargeTimer = e.chargeDuration;
                    e.sprite.setTint(0xff2200); // rouge = charge
                    e.sprite.setVelocity(e.chargeVx, e.chargeVy);
                }
                break;

            case 'charging':
                e.chargeTimer -= delta;
                if (e.chargeTimer <= 0) {
                    e.chargeState = 'cooldown';
                    e.chargeTimer = e.chargeCooldown;
                    e.sprite.clearTint();
                    e.sprite.setVelocity(0, 0);
                }
                break;

            case 'cooldown':
                e.chargeTimer -= delta;
                e.sprite.setVelocity(0, 0);
                if (e.chargeTimer <= 0) e.chargeState = 'idle';
                break;
        }
    }

    _drawEnemyHpBar(e) {
        const x = e.sprite.x - 16, y = e.sprite.y - e.sprite.height/2 - 6;
        const pct = e.hp / e.maxHp;
        e.hpBar.clear();
        e.hpBar.fillStyle(0x222222, 0.8); e.hpBar.fillRect(x, y, 32, 4);
        const col = pct > 0.5 ? 0x22ee55 : pct > 0.25 ? 0xff9900 : 0xff2222;
        e.hpBar.fillStyle(col, 1); e.hpBar.fillRect(x, y, 32*pct, 4);
    }

    _hitEnemy(enemy, damage) {
        if (enemy.hitTimer > 0 || !enemy.alive) return;
        enemy.hitTimer = 250;
        enemy.hp -= damage;
        enemy.sprite.setTint(0xffffff);
        this.time.delayedCall(80, () => { if (enemy.sprite?.active) enemy.sprite.clearTint(); });
        if (enemy.hp <= 0) this._killEnemy(enemy);
    }

    _killEnemy(enemy) {
        enemy.alive = false;
        enemy.hpBar.destroy();
        enemy.sprite.setVelocity(0,0);
        this.tweens.add({
            targets: enemy.sprite, alpha: 0, scaleX: 1.8, scaleY: 1.8,
            duration: 350, onComplete: () => enemy.sprite?.destroy()
        });
        this.stats.gainPlayerXP(enemy.xpDrop * 2);
        // Petit drop visuel
        const t = this.add.text(enemy.sprite.x, enemy.sprite.y - 20, `+${enemy.xpDrop}xp`, {
            fontFamily:'monospace', fontSize:'10px', color:'#ffdd44',
            stroke:'#000', strokeThickness:2
        }).setDepth(20).setOrigin(0.5);
        this.tweens.add({ targets: t, y: t.y-40, alpha:0, duration:900,
            onComplete: () => t.destroy() });
    }

    // ────────────────────────────────────────────────────────────────
    // Attaque épée en bois
    // ────────────────────────────────────────────────────────────────

    _swordAttack() {
        if (this._swordCooldown > 0) return;
        this._swordCooldown = 600; // ms

        const px = this._player.x, py = this._player.y;
        const RANGE  = 64;
        const ANGLE  = Math.PI * 2 / 3; // arc 120°
        const facing = Math.atan2(this._facing.y, this._facing.x);

        // Flash visuel
        const fx = this.add.image(px + this._facing.x * 32, py + this._facing.y * 32, 'sword_fx')
            .setDepth(15).setAlpha(0.8).setScale(1.2);
        this.tweens.add({ targets: fx, alpha: 0, scaleX: 1.8, scaleY: 1.8,
            duration: 250, onComplete: () => fx.destroy() });

        // Hit detection
        for (const enemy of this._enemies) {
            if (!enemy.alive) continue;
            const dist = Phaser.Math.Distance.Between(px, py, enemy.sprite.x, enemy.sprite.y);
            if (dist > RANGE) continue;
            const angleToEnemy = Phaser.Math.Angle.Between(px, py, enemy.sprite.x, enemy.sprite.y);
            const diff = Phaser.Math.Angle.Wrap(angleToEnemy - facing);
            if (Math.abs(diff) <= ANGLE / 2) {
                this._hitEnemy(enemy, 8 + Math.floor(this.stats.total('str') * 0.5));
            }
        }
        if (this.audio?._ready) this.audio.playHit(false);
    }

    // ────────────────────────────────────────────────────────────────
    // Physique & Contrôles
    // ────────────────────────────────────────────────────────────────

    _setupPhysics() {
        this.physics.add.collider(this._player, this._wallGroup);
        this.physics.add.collider(this._enemyGroup, this._wallGroup);

        // Contact ennemi → joueur
        this.physics.add.overlap(this._player, this._enemyGroup, (pl, enSpr) => {
            const enemy = enSpr._enemyRef;
            if (!enemy?.alive || this._contactCooldown > 0) return;
            this._contactCooldown = 90;
            this._playerHp = Math.max(0, this._playerHp - enemy.damage);
            // Interrompre méditation
            if (this._meditating) this._stopMeditation();
            this._player.setTint(0xff2222);
            this.time.delayedCall(180, () => this._player?.clearTint());
            this._updateHUD();
        });
    }

    _setupControls() {
        const KB = Phaser.Input.Keyboard.KeyCodes;
        this._keys = this.input.keyboard.addKeys({
            up: KB.Z, down: KB.S, left: KB.Q, right: KB.D,
            upArr: KB.UP, downArr: KB.DOWN, leftArr: KB.LEFT, rightArr: KB.RIGHT,
            meditate: KB.M,
        });

        // Clic/tap → attaque épée
        this.input.on('pointerdown', (ptr) => {
            if (ptr.button !== 0) return;
            const mc = this.mobileControls;
            if (mc?.isActive && ptr.id === mc._joyPointerId) return;
            // Orienter vers le clic
            const angle = Phaser.Math.Angle.Between(this._player.x, this._player.y, ptr.worldX, ptr.worldY);
            this._facing = { x: Math.cos(angle), y: Math.sin(angle) };
            this._swordAttack();
        });

        this.input.keyboard.on('keydown-M', () => this._toggleMeditation());

        // Mobile
        this.events.on('mobile:cast',     () => this._swordAttack());
        this.events.on('mobile:meditate', () => this._toggleMeditation());
    }

    _handleMovement() {
        const k    = this._keys;
        const mc   = this.mobileControls;
        const SPEED = this.stats.moveSpeed;
        let vx = 0, vy = 0;

        if (mc?.isActive) {
            vx = mc.vector.x * SPEED; vy = mc.vector.y * SPEED;
        } else {
            if (k.left.isDown  || k.leftArr.isDown)  vx = -SPEED;
            if (k.right.isDown || k.rightArr.isDown)  vx =  SPEED;
            if (k.up.isDown    || k.upArr.isDown)     vy = -SPEED;
            if (k.down.isDown  || k.downArr.isDown)   vy =  SPEED;
            if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
        }

        this._player.setVelocity(vx, vy);
        if (vx !== 0 || vy !== 0) {
            if (this._meditating) this._stopMeditation();
            const len = Math.hypot(vx, vy);
            this._facing = { x: vx/len, y: vy/len };
            if (vx < 0) this._player.setFlipX(true);
            else if (vx > 0) this._player.setFlipX(false);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Méditation
    // ────────────────────────────────────────────────────────────────

    _toggleMeditation() {
        this._meditating ? this._stopMeditation() : this._startMeditation();
    }

    _startMeditation() {
        this._meditating = true;
        this._essenceTimer = 0;
        this._player.setVelocity(0, 0);
        // Anneau de méditation
        if (!this._meditGfx) this._meditGfx = this.add.graphics().setDepth(4);
        this.tweens.add({ targets: this._meditGfx, alpha: { from:0.4, to:1 },
            duration: 800, yoyo: true, repeat: -1, ease:'Sine.easeInOut' });
        this._updateMeditGfx();
        this._updateHUD();
    }

    _stopMeditation() {
        this._meditating = false;
        this._meditGfx?.clear();
        this.tweens.killTweensOf(this._meditGfx);
        this._updateHUD();
    }

    _updateMeditGfx() {
        if (!this._meditGfx) return;
        this._meditGfx.clear();
        this._meditGfx.lineStyle(2, 0xaa66ff, 0.8);
        this._meditGfx.strokeCircle(this._player.x, this._player.y, 28);
        this._meditGfx.lineStyle(1, 0xcc88ff, 0.4);
        this._meditGfx.strokeCircle(this._player.x, this._player.y, 40);
    }

    _tickMeditation(delta) {
        if (!this._meditating) return;
        this._essenceTimer += delta;
        if (this._essenceTimer >= this._ESSENCE_TICK) {
            this._essenceTimer = 0;
            playerState.manaEssence++;
            this._updateMeditGfx();
            this._checkThresholds();
            this._updateHUD();
        }
    }

    _checkThresholds() {
        const essence = playerState.manaEssence;
        const thresholds = this._mapData.essenceThresholds;

        // Dialogues
        for (const th of thresholds) {
            const key = 'dlg_' + th.essence;
            if (essence >= th.essence && !this._firedDlgs.has(key)) {
                this._firedDlgs.add(key);
                this.time.delayedCall(300, () => {
                    this._stopMeditation();
                    this._fireDialogue(th.dialogue, () => {
                        if (th.trigger === 'unlock_mana_core') this._unlockManaCore();
                    });
                });
            }
        }

        // Vagues d'ennemis
        for (const wave of this._mapData.enemyWaves) {
            const key = 'wave_' + wave.atEssence;
            if (essence >= wave.atEssence && !this._spawnedWaves.has(key)) {
                this._spawnedWaves.add(key);
                this._spawnWave(wave);
                this._showNotification('Des nuisibles approchent !', '#ff6644');
            }
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Éveil du Mana Core
    // ────────────────────────────────────────────────────────────────

    _unlockManaCore() {
        this._manaUnlocked = true;
        playerState.manaCoreLevel = 0; // Black Core

        // Flash caméra
        this.cameras.main.flash(500, 60, 0, 120, false);
        this.cameras.main.shake(300, 0.006);

        // Activer SpellBar
        if (this._spellBarEl) {
            this._spellBarEl.setVisible(true);
            this.spellSystem = new SpellSystem(this, this._player);
        }

        // Activer aura
        if (!this._aura) this._aura = new Aura(this, this._player);

        this._showNotification('✦ Noyau Noir éveillé ! Les sorts sont disponibles.', '#aa66ff');
        this.events.emit('manacore:changed', playerState.coreData);
        this._updateHUD();
    }

    // ────────────────────────────────────────────────────────────────
    // UI / HUD
    // ────────────────────────────────────────────────────────────────

    _setupUI() {
        const D = 100;
        const X = 10, Y = 10;
        const W = 260, H = 90;

        this.add.rectangle(X, Y, W, H, 0x000000, 0.75)
            .setOrigin(0).setScrollFactor(0).setDepth(D);

        // HP
        this._hudTxtHp = this.add.text(X+10, Y+10, '', {
            fontFamily:'monospace', fontSize:'11px', color:'#ee4444'
        }).setScrollFactor(0).setDepth(D+1);
        this.add.rectangle(X+10, Y+26, W-20, 7, 0x331111)
            .setOrigin(0).setScrollFactor(0).setDepth(D+1);
        this._hudBarHp = this.add.rectangle(X+10, Y+26, W-20, 7, 0xee2222)
            .setOrigin(0).setScrollFactor(0).setDepth(D+2);

        // Essence / Méditation
        this._hudTxtEss = this.add.text(X+10, Y+40, '', {
            fontFamily:'monospace', fontSize:'10px', color:'#aa66ff'
        }).setScrollFactor(0).setDepth(D+1);
        this.add.rectangle(X+10, Y+56, W-20, 7, 0x1a1133)
            .setOrigin(0).setScrollFactor(0).setDepth(D+1);
        this._hudBarEss = this.add.rectangle(X+10, Y+56, 0, 7, 0x7733cc)
            .setOrigin(0).setScrollFactor(0).setDepth(D+2);

        // Info méditation
        this._hudTxtMed = this.add.text(X+10, Y+70, '[M] Méditer', {
            fontFamily:'monospace', fontSize:'9px', color:'#556677'
        }).setScrollFactor(0).setDepth(D+1);

        // Notification centre
        this._notifTxt = this.add.text(
            this.scale.width/2, this.scale.height * 0.2, '',
            { fontFamily:'monospace', fontSize:'13px', color:'#ffffff',
              stroke:'#000', strokeThickness:3, align:'center' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

        this._updateHUD();
    }

    _updateHUD() {
        const ess     = playerState.manaEssence;
        const maxEss  = 100;
        const essPct  = Math.min(ess / maxEss, 1);
        const hpPct   = this._playerHp / this._playerMaxHp;
        const barW    = 240;

        this._hudTxtHp?.setText(`HP  ${this._playerHp} / ${this._playerMaxHp}`);
        this._hudBarHp?.setSize(Math.max(0, barW * hpPct), 7);
        this._hudTxtEss?.setText(
            this._manaUnlocked
                ? `✦ Black Core éveillé`
                : `Essence ${ess} / ${maxEss}${this._meditating ? '  ◉ Méditation' : ''}`
        );
        this._hudBarEss?.setSize(Math.max(0, barW * essPct), 7);
        this._hudTxtMed?.setText(
            this._meditating ? '⏸ [M] Arrêter' : '[M] Méditer · Clic = Épée'
        );
    }

    _showNotification(msg, color = '#ffffff') {
        if (!this._notifTxt) return;
        this._notifTxt.setText(msg).setStyle({ color }).setVisible(true).setAlpha(1);
        this.tweens.killTweensOf(this._notifTxt);
        this.tweens.add({
            targets: this._notifTxt, alpha: 0, delay: 2500, duration: 600,
            onComplete: () => this._notifTxt.setVisible(false).setAlpha(1)
        });
    }

    _setupMobile() {
        this.mobileControls = new MobileControls(this);
        // Audio — après MobileControls pour ne pas être écrasé par ses listeners
        this.audio = new AudioSystem(this);
    }

    // ────────────────────────────────────────────────────────────────
    // Caméra
    // ────────────────────────────────────────────────────────────────

    _setupCamera() {
        const md  = this._mapData;
        const TS  = this._TS;
        const W   = md.meta.width  * TS;
        const H   = md.meta.height * TS;
        const isPortrait = window.innerHeight > window.innerWidth;
        const zoom = isPortrait ? 1.2 : 1.8; // plus zoomé car map plus petite

        this.cameras.main
            .setBounds(0, 0, W, H)
            .startFollow(this._player, true, 1, 1)
            .setZoom(zoom)
            .setBackgroundColor('#0a0804');
        this.time.delayedCall(16, () => this.cameras.main.setLerp(0.1, 0.1));
    }

    // ────────────────────────────────────────────────────────────────
    // Dialogues
    // ────────────────────────────────────────────────────────────────

    _fireDialogue(key, onComplete) {
        const data = this.cache.json.get('dialogue_' + key);
        if (!data) return onComplete?.();
        this.physics.pause();
        this._player.setVelocity(0, 0);
        this.scene.launch('DialogueScene', {
            conversations: data.conversations ?? data,
            onComplete: () => {
                this.physics.resume();
                onComplete?.();
            }
        });
    }

    // ────────────────────────────────────────────────────────────────
    // Update
    // ────────────────────────────────────────────────────────────────

    update(time, delta) {
        if (this._contactCooldown > 0) this._contactCooldown--;
        if (this._swordCooldown > 0)   this._swordCooldown -= delta;

        this._handleMovement();
        this._tickMeditation(delta);
        this._updateEnemies(delta);
        if (this._meditGfx && this._meditating) this._updateMeditGfx();
        if (this._aura) this._aura.update(time);
    }
}