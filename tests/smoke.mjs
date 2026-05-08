/**
 * Smoke test headless — TBATE web.
 *
 * - Lance un serveur static depuis la racine du repo.
 * - Charge index.html dans Chromium headless via Playwright.
 * - Capture toutes les erreurs console / pageerror / requestfailed.
 * - Vérifie que Phaser monte un canvas et démarre une scène.
 * - Tente quelques interactions basiques (clavier).
 *
 * Lancer : node tests/smoke.mjs
 * Sortie  : code 0 si aucune erreur fatale, 1 sinon.
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
    '.png' : 'image/png',
    '.svg' : 'image/svg+xml',
    '.css' : 'text/css; charset=utf-8',
};

function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const urlPath = decodeURIComponent(req.url.split('?')[0]);
            const safe = normalize(urlPath).replace(/^\/+/, '');
            let filePath = join(ROOT, safe);
            const st = await stat(filePath).catch(() => null);
            if (!st) {
                res.writeHead(404); res.end('not found'); return;
            }
            if (st.isDirectory()) filePath = join(filePath, 'index.html');
            const ext  = extname(filePath).toLowerCase();
            const data = await readFile(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
            res.end(data);
        } catch (e) {
            res.writeHead(500); res.end(String(e));
        }
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, url: `http://127.0.0.1:${port}` });
        });
    });
}

async function run() {
    const { server, url } = await startServer();
    const browser = await chromium.launch({
        headless: true,
        args: ['--ignore-certificate-errors', '--allow-insecure-localhost'],
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    });

    // Hook : capture toutes les instances de Phaser.Game sans modifier le code
    // source. Le setter s'arme avant le script CDN, puis patche `Phaser.Game`
    // dès qu'il devient disponible.
    await context.addInitScript(() => {
        window.__games__ = [];
        let _phaser;
        const PATCH_FLAG = Symbol.for('__game_patched__');
        Object.defineProperty(window, 'Phaser', {
            configurable: true,
            get() { return _phaser; },
            set(v) {
                _phaser = v;
                if (v && v.Game && !v.Game[PATCH_FLAG]) {
                    const Orig = v.Game;
                    function Patched(config, ...rest) {
                        if (config && typeof config === 'object') config.type = 1; // CANVAS (sandbox WebGL est instable)
                        const inst = new Orig(config, ...rest);
                        window.__games__.push(inst);
                        return inst;
                    }
                    Patched.prototype = Orig.prototype;
                    Patched[PATCH_FLAG] = true;
                    Object.defineProperty(v, 'Game', {
                        configurable: true, writable: true, value: Patched,
                    });
                }
            },
        });
    });

    const page    = await context.newPage();

    const consoleErrors = [];
    const consoleWarns  = [];
    const pageErrors    = [];
    const failedReqs    = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error')   consoleErrors.push(msg.text());
        if (msg.type() === 'warning') consoleWarns.push(msg.text());
    });
    page.on('pageerror',      (err) => pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ''}`));
    page.on('requestfailed',  (req) => failedReqs.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`));

    // Sandbox-friendly : route le CDN Phaser vers la copie locale (test only).
    await page.route('**/cdn.jsdelivr.net/**/phaser.min.js', async (route) => {
        const body = await readFile(join(ROOT, 'tests/vendor/phaser.min.js'));
        route.fulfill({ status: 200, contentType: 'application/javascript', body });
    });

    console.log(`[smoke] loading ${url}/index.html`);
    await page.goto(`${url}/index.html`, { waitUntil: 'load' });

    // Laisse Phaser tourner ~2s pour produire d'éventuelles erreurs runtime
    await page.waitForTimeout(2000);

    // Petit délai supplémentaire pour laisser Phaser passer scenes en `active`.
    await page.waitForTimeout(500);

    const diag = await page.evaluate(() => {
        const out = {};
        out.hasPhaser   = typeof Phaser !== 'undefined';
        const canvases  = document.querySelectorAll('canvas');
        out.canvasCount = canvases.length;
        const c         = canvases[0];
        out.canvasSize  = c ? { w: c.width, h: c.height } : null;
        out.scenesActive = [];
        out.scenesAll    = [];
        try {
            const games = window.__games__ || [];
            out.gamesCount = games.length;
            for (const g of games) {
                if (!g || !g.scene) continue;
                for (const sc of g.scene.scenes) {
                    out.scenesAll.push({
                        key   : sc.sys.settings.key,
                        active: sc.sys.settings.active,
                        status: sc.sys.settings.status,
                        visible: sc.sys.settings.visible,
                    });
                    if (sc.sys.settings.active) out.scenesActive.push(sc.sys.settings.key);
                }
            }
        } catch (e) { out.sceneIntrospectionError = String(e); }

        // Les class top-level d'un <script> classique sont dans le scope global
        // mais PAS sur window. On les vérifie via eval direct.
        const expected = ['SPELLS','MANA_CORE_LEVELS','playerState','TILE','ROOM_TYPES',
            'DUNGEON_CONFIG','AUDIO_CONFIG','STAT_KEYS','STORY_CONTENT','ROOM_TEMPLATES',
            'TextureGenerator','DungeonGenerator','DungeonRenderer',
            'StatsSystem','ManaCoreSystem','SpellSystem','AudioSystem',
            'Aura','Projectile','Enemy','Player',
            'HUD','SpellBar','MobileControls','StatsPanel','StoryManager',
            'Level1Scene','DialogueScene','GameScene'];
        out.missingGlobals = expected.filter((k) => {
            try { return new Function(`return typeof ${k} === 'undefined'`)(); }
            catch { return true; }
        });
        return out;
    });

    // Smoke: appuyer sur une touche pour valider que keydown ne crashe pas
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);

    const finalDiag = await page.evaluate(() => ({
        scenesActive: (window.__games__ ?? [])
            .flatMap((g) => g.scene.scenes)
            .filter((sc) => sc.sys.settings.active)
            .map((sc) => sc.sys.settings.key),
    }));

    await browser.close();
    server.close();

    const report = {
        url,
        diag,
        finalDiag,
        consoleErrors,
        consoleWarns,
        pageErrors,
        failedReqs,
    };

    console.log('\n=== SMOKE REPORT ===');
    console.log(JSON.stringify(report, null, 2));

    const fatal = pageErrors.length > 0
        || consoleErrors.length > 0
        || diag.canvasCount === 0
        || (diag.canvasSize && (diag.canvasSize.w === 0 || diag.canvasSize.h === 0))
        || diag.missingGlobals.length > 0
        || diag.scenesActive.length === 0
        || failedReqs.length > 0;

    if (fatal) {
        console.error('\n[smoke] FAIL');
        process.exit(1);
    } else {
        console.log('\n[smoke] OK');
        process.exit(0);
    }
}

run().catch((e) => { console.error(e); process.exit(2); });
