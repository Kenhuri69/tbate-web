/**
 * Scénarios étendus — exerce chaque scène pour exposer les bugs runtime.
 *
 * Couvre :
 *   - Boot Level1Scene + chargement des dialogues
 *   - Démarrage GameScene (BSP dungeon) avec arrêt de Level1Scene
 *   - Lancement DialogueScene en overlay
 *   - Méditation Mana Core (M)
 *   - Cast spell (clic souris)
 *   - Allocation de stat (clavier dans StatsPanel)
 *
 * Sortie : code 0 si tous les checks passent, 1 sinon.
 */
import playwright from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = playwright;
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js'  : 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
};

function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const safe = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '');
            let p = join(ROOT, safe);
            const st = await stat(p).catch(() => null);
            if (!st) { res.writeHead(404); res.end('not found'); return; }
            if (st.isDirectory()) p = join(p, 'index.html');
            const data = await readFile(p);
            res.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
            res.end(data);
        } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }

async function main() {
    const { server, url } = await startServer();
    const browser = await chromium.launch({
        headless: true,
        args: ['--ignore-certificate-errors', '--allow-insecure-localhost'],
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    });

    await context.addInitScript(() => {
        window.__games__ = [];
        let _phaser;
        const FLAG = Symbol.for('__game_patched__');
        Object.defineProperty(window, 'Phaser', {
            configurable: true,
            get() { return _phaser; },
            set(v) {
                _phaser = v;
                if (v && v.Game && !v.Game[FLAG]) {
                    const Orig = v.Game;
                    function Patched(config, ...rest) {
                        // Forcer le rendu Canvas en headless : software WebGL
                        // est instable dans le sandbox et fait stall le boot
                        // de scènes complexes (BSP dungeon).
                        if (config && typeof config === 'object') config.type = 1; // Phaser.CANVAS
                        const inst = new Orig(config, ...rest);
                        window.__games__.push(inst);
                        return inst;
                    }
                    Patched.prototype = Orig.prototype;
                    Patched[FLAG] = true;
                    Object.defineProperty(v, 'Game', { configurable: true, writable: true, value: Patched });
                }
            },
        });
    });

    const page = await context.newPage();
    const errs = { console: [], page: [], req: [] };
    page.on('console', (m) => { if (m.type() === 'error') errs.console.push(m.text()); });
    page.on('pageerror', (e) => errs.page.push(`${e.name}: ${e.message}\n${e.stack ?? ''}`));
    page.on('requestfailed', (r) => {
        if (!r.url().includes('cdn.jsdelivr.net')) errs.req.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`);
    });

    await page.route('**/cdn.jsdelivr.net/**/phaser.min.js', async (route) => {
        const body = await readFile(join(ROOT, 'tests/vendor/phaser.min.js'));
        route.fulfill({ status: 200, contentType: 'application/javascript', body });
    });

    await page.goto(`${url}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // ============================================================
    // CHECK 1 : Level1Scene a démarré et a chargé sa map JSON
    // ============================================================
    check('level1: scene active + map JSON cached', async () => {
        return page.evaluate(() => {
            const game = window.__games__[0];
            const sc   = game.scene.getScene('Level1Scene');
            return {
                ok: sc && sc.sys.settings.active && !!sc.cache.json.get('level1map'),
                detail: { active: sc?.sys.settings.active, hasMap: !!sc?.cache.json.get('level1map') },
            };
        });
    });

    // ============================================================
    // CHECK 2 : Tous les dialogues précisés dans Level1Scene.preload sont chargés
    // ============================================================
    check('level1: tous les dialogues JSON sont en cache', async () => {
        return page.evaluate(() => {
            const sc   = window.__games__[0].scene.getScene('Level1Scene');
            const keys = ['chapter1_start','reynolds_magic','alice_healing','inner_voice_1','black_core_awakening','alice_idle','reynolds_idle'];
            const missing = keys.filter((k) => !sc.cache.json.get('dialogue_' + k));
            return { ok: missing.length === 0, detail: { missing } };
        });
    });

    // ============================================================
    // CHECK 3 : Dialogue d'intro (chapter1_start) se déclenche après ~1s
    // ============================================================
    check('level1: dialogue chapter1_start lance DialogueScene', async () => {
        // Polling jusqu'à 6s : delayedCall(800) peut traîner en software WebGL
        let active = false; let lastDiag = null;
        for (let i = 0; i < 30 && !active; i++) {
            await page.waitForTimeout(200);
            lastDiag = await page.evaluate(() => {
                const g = window.__games__[0];
                return {
                    dlgActive: g.scene.getScene('DialogueScene').sys.settings.active,
                    lvlActive: g.scene.getScene('Level1Scene').sys.settings.active,
                };
            });
            active = lastDiag.dlgActive;
        }
        return { ok: active, detail: lastDiag };
    });

    // ============================================================
    // CHECK 4 : Avancer le dialogue et le fermer ne crash pas
    // ============================================================
    check('level1: fermer le dialogue (Enter x N) sans erreur', async () => {
        for (let i = 0; i < 30; i++) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(80);
        }
        return page.evaluate(() => {
            const game = window.__games__[0];
            const dlg  = game.scene.getScene('DialogueScene');
            const lvl  = game.scene.getScene('Level1Scene');
            return {
                ok: !dlg.sys.settings.active && lvl.sys.settings.active,
                detail: { dlgActive: dlg.sys.settings.active, lvlActive: lvl.sys.settings.active },
            };
        });
    });

    // ============================================================
    // CHECK 5 : Démarrer GameScene (BSP dungeon) ne crash pas
    // ============================================================
    check('GameScene : start sans erreur', async () => {
        const errCountBefore = errs.page.length + errs.console.length;
        await page.evaluate(() => {
            const game = window.__games__[0];
            game.scene.stop('Level1Scene');
            game.scene.start('GameScene');
        });
        await page.waitForTimeout(1500);
        const errCountAfter = errs.page.length + errs.console.length;
        const newErrs = errs.page.slice(errCountBefore).concat(errs.console.slice(errCountBefore));
        const diag = await page.evaluate(() => {
            const g  = window.__games__[0];
            const sc = g.scene.getScene('GameScene');
            return {
                active: sc?.sys.settings.active,
                hasPlayer: !!sc?.player?.sprite,
                roomCount: sc?.dungeonMap?.rooms?.length ?? 0,
                enemyCount: sc?.enemies?.length ?? 0,
            };
        });
        return {
            ok: errCountAfter === errCountBefore && diag.active && diag.hasPlayer && diag.roomCount > 0,
            detail: { ...diag, newErrors: newErrs },
        };
    });

    // ============================================================
    // CHECK 6 : Cycler les sorts (1, 2, 3, 4) dans GameScene
    // ============================================================
    check('GameScene : changer de sort via clavier 1..4', async () => {
        const idxBefore = await page.evaluate(() => window.__games__[0].scene.getScene('GameScene').spellSystem.currentIndex);
        await page.keyboard.press('Digit3');
        await page.waitForTimeout(150);
        const idxAfter = await page.evaluate(() => window.__games__[0].scene.getScene('GameScene').spellSystem.currentIndex);
        return { ok: idxAfter === 2, detail: { idxBefore, idxAfter } };
    });

    // ============================================================
    // CHECK 7 : Méditation (M) émet l'event manacore:meditation:start ou :blocked
    // ============================================================
    check('GameScene : touche M déclenche méditation', async () => {
        await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            window.__events = [];
            sc.events.on('manacore:meditation:start', () => window.__events.push('start'));
            sc.events.on('manacore:blocked', (m) => window.__events.push('blocked:' + m));
        });
        await page.keyboard.press('KeyM');
        await page.waitForTimeout(200);
        const fired = await page.evaluate(() => window.__events);
        return { ok: fired.length > 0, detail: { fired } };
    });

    // ============================================================
    // CHECK 8 : Cast d'un sort (clic) crée un projectile
    // ============================================================
    check('GameScene : clic crée un projectile', async () => {
        await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            // Sort actif = mana_blast (cooldown 300ms), reset du timer
            sc.spellSystem.lastCastTime[0] = 0;
            sc.spellSystem.currentIndex = 0;
        });
        await page.mouse.click(600, 360);
        await page.waitForTimeout(100);
        const n = await page.evaluate(() => {
            return window.__games__[0].scene.getScene('GameScene').spellSystem._projectiles.length;
        });
        return { ok: n >= 1, detail: { projectileCount: n } };
    });

    // ============================================================
    // CHECK 9 : Allouer un point de stat ne crash pas
    // ============================================================
    check('GameScene : stats.allocate("mag") ajoute 1 point', async () => {
        return page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            const before = sc.stats.base.mag;
            sc.stats.freePoints = Math.max(sc.stats.freePoints, 1);
            const ok = sc.stats.allocate('mag');
            return { ok: ok && sc.stats.base.mag === before + 1, detail: { before, after: sc.stats.base.mag } };
        });
    });

    // ============================================================
    // CHECK 10 : Story trigger room → DialogueScene depuis BSP dungeon
    // ============================================================
    check('GameScene : émettre room:entered avec hookId connu lance DialogueScene', async () => {
        await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            // Récupérer un hookId encore non déclenché
            sc.storyManager.triggered.clear();
            sc.events.emit('room:entered', { hookId: 'start_zone', roomType: 'start' });
        });
        await page.waitForTimeout(300);
        const active = await page.evaluate(() => window.__games__[0].scene.getScene('DialogueScene').sys.settings.active);
        return { ok: active, detail: { dialogueActive: active } };
    });

    // ============================================================
    // Bug A : Enemy doit transmettre resourceDrop dans enemy:died
    // ============================================================
    check('Enemy : config.resourceDrop est transmis dans enemy:died', async () => {
        const errBefore = errs.page.length;
        const detail = await page.evaluate(async () => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            const fixedDrop = 'mana_crystal';
            const e = new Enemy(sc, 100, 100, { hp: 1, xpDrop: 1, resourceDrop: fixedDrop });
            return await new Promise((resolve) => {
                const handler = (data) => {
                    sc.events.off('enemy:died', handler);
                    resolve({ payload: data });
                };
                sc.events.on('enemy:died', handler);
                e.takeDamage(999);
                setTimeout(() => resolve({ payload: null, timedOut: true }), 500);
            });
        });
        return {
            ok: detail.payload?.resourceDrop === 'mana_crystal' && errs.page.length === errBefore,
            detail,
        };
    });

    // ============================================================
    // Bug B : DialogueScene avec text vide ne doit pas boucler
    // ============================================================
    check('DialogueScene : ligne avec text vide ne boucle pas (finit en <1.5s)', async () => {
        const detail = await page.evaluate(async () => {
            const game  = window.__games__[0];
            const owner = game.scene.getScene('GameScene');  // un Phaser.Scene avec ScenePlugin
            const dlg   = game.scene.getScene('DialogueScene');
            if (dlg.sys.settings.active) game.scene.stop('DialogueScene');
            return await new Promise((resolve) => {
                let finished = false;
                owner.scene.launch('DialogueScene', {
                    conversations: [{ name: 'X', text: '' }],
                    onComplete: () => { finished = true; resolve({ finished: true }); },
                });
                setTimeout(() => {
                    if (!finished) {
                        const dlg2 = game.scene.getScene('DialogueScene');
                        const txt = dlg2._txtContent?.text ?? '';
                        resolve({ finished: false, contentLen: txt.length, sample: txt.slice(0, 60) });
                    }
                }, 1500);
            });
        });
        await page.evaluate(() => {
            const dlg = window.__games__[0].scene.getScene('DialogueScene');
            if (dlg.sys.settings.active) window.__games__[0].scene.stop('DialogueScene');
        });
        // Avant fix : le bug remplissait le textbox de "undefined..." (boucle infinie).
        // Après fix : soit finished=true, soit contentLen=0 (rien écrit, attend l'input).
        const noUndefinedLoop = !(detail.sample ?? '').includes('undefined');
        const stable          = detail.finished === true || (detail.contentLen ?? 0) === 0;
        return { ok: noUndefinedLoop && stable, detail };
    });

    // ============================================================
    // Bug C : MobileControls.resize ne doit pas accumuler des fantômes
    // ============================================================
    check('MobileControls : resize n\'accumule pas de doublons', async () => {
        const detail = await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            const mc = sc.mobileControls;
            const before = sc.children.length;
            // 3 rotations consécutives (paysage → portrait → paysage → portrait)
            mc.resize(720, 1280);
            mc.resize(1280, 720);
            mc.resize(720, 1280);
            const after = sc.children.length;
            return { before, after, delta: after - before };
        });
        // Tolérance : chaque resize devrait recréer le même nombre d'enfants
        // qu'il en détruit. Avant fix, chaque resize ajoutait ~10 enfants
        // sans en détruire → delta ≥ 30 sur 3 rotations. Après fix, delta ≈ 0.
        return { ok: detail.delta <= 5, detail };
    });

    // ============================================================
    // Game Over : GameScene → stats.takeDamage(maxHP) lance GameOverScene
    // ============================================================
    check('GameScene : HP=0 lance GameOverScene', async () => {
        await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            sc.stats.currentHP = sc.stats.maxHP;        // au cas où il a déjà mangé
            sc.stats.takeDamage(sc.stats.maxHP + 1);    // déclenche player:died
        });
        await page.waitForTimeout(200);
        const detail = await page.evaluate(() => {
            const g = window.__games__[0];
            return {
                gameOverActive: g.scene.getScene('GameOverScene').sys.settings.active,
                gameSceneActive: g.scene.getScene('GameScene').sys.settings.active,
            };
        });
        return { ok: detail.gameOverActive, detail };
    });

    // ============================================================
    // Game Over : touche R reset playerState et restart la scène source
    // ============================================================
    check('GameOverScene : R reset playerState et restart la source', async () => {
        // Salir l'état pour observer le reset
        await page.evaluate(() => {
            playerState.manaCoreLevel = 3;
            playerState.manaEssence   = 999;
            playerState.inventory.mana_dust = 5;
        });
        await page.keyboard.press('KeyR');
        await page.waitForTimeout(800);
        const detail = await page.evaluate(() => ({
            manaCoreLevel: playerState.manaCoreLevel,
            manaEssence  : playerState.manaEssence,
            inventory    : { ...playerState.inventory },
            gameOverActive: window.__games__[0].scene.getScene('GameOverScene').sys.settings.active,
            gameSceneActive: window.__games__[0].scene.getScene('GameScene').sys.settings.active,
        }));
        return {
            ok: detail.manaCoreLevel === 0
                && detail.manaEssence === 0
                && detail.inventory.mana_dust === 0
                && !detail.gameOverActive
                && detail.gameSceneActive,
            detail,
        };
    });

    check('GameScene : enemy.takeDamage(999) émet enemy:died sans crash', async () => {
        const errBefore = errs.page.length;
        const detail = await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('GameScene');
            window.__diedEvents = [];
            sc.events.on('enemy:died', (d) => window.__diedEvents.push(d));
            const e = sc.enemies[0];
            if (!e) return { noEnemy: true };
            e.takeDamage(99999);
            return { hp: e.hp, alive: e.alive };
        });
        await page.waitForTimeout(200);
        const fired = await page.evaluate(() => window.__diedEvents.length);
        return { ok: errs.page.length === errBefore && (detail.noEnemy || fired > 0), detail: { ...detail, firedCount: fired, newPageErrors: errs.page.slice(errBefore) } };
    });

    // ============================================================
    // Game Over : Level1Scene émet player:died → GameOverScene
    // (placé en dernier car switch sur Level1Scene)
    // ============================================================
    check('Level1Scene : player:died lance GameOverScene', async () => {
        await page.evaluate(() => {
            const game = window.__games__[0];
            for (const k of ['GameScene', 'DialogueScene', 'GameOverScene']) {
                const s = game.scene.getScene(k);
                if (s.sys.settings.active) game.scene.stop(k);
            }
            game.scene.start('Level1Scene');
        });
        await page.waitForTimeout(800);
        await page.evaluate(() => {
            const sc = window.__games__[0].scene.getScene('Level1Scene');
            sc.events.emit('player:died');
        });
        await page.waitForTimeout(300);
        const detail = await page.evaluate(() => ({
            gameOverActive: window.__games__[0].scene.getScene('GameOverScene').sys.settings.active,
        }));
        return { ok: detail.gameOverActive, detail };
    });

    // ============================================================
    // EXEC
    // ============================================================
    let pass = 0, fail = 0;
    const failed = [];
    for (const c of checks) {
        try {
            process.stdout.write('  … ' + c.name + '\n');
            const r = await Promise.race([
                c.fn(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 8s')), 8000)),
            ]);
            if (r.ok) { pass++; process.stdout.write('  ✓ ' + c.name + '\n'); }
            else      { fail++; failed.push({ name: c.name, ...r }); process.stdout.write('  ✗ ' + c.name + ' — ' + JSON.stringify(r.detail) + '\n'); }
        } catch (e) {
            fail++; failed.push({ name: c.name, error: e.stack ?? String(e) });
            console.log('  ✗ ' + c.name + ' — THROW ' + e.message);
        }
    }

    console.log(`\n[${pass}/${pass+fail}] passed`);
    if (errs.page.length || errs.console.length || errs.req.length) {
        console.log('\n--- Erreurs collectées ---');
        console.log(JSON.stringify(errs, null, 2));
    }
    if (failed.length) {
        console.log('\n--- Détails des échecs ---');
        console.log(JSON.stringify(failed, null, 2));
    }

    await browser.close();
    server.close();
    process.exit(fail === 0 && errs.page.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
