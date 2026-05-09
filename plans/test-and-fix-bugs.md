# Plan — Tester le jeu et corriger les bugs

## Goal
Identifier et corriger les bugs détectables au runtime dans le jeu TBATE web (chargement, scènes, événements, contrôles).

## Success criteria
- `tests/smoke.mjs` (Playwright headless) charge `index.html` et valide :
  - Zéro erreur console / unhandled promise rejection.
  - Canvas Phaser monté avec dimensions > 0.
  - Au moins une scène active.
  - Le HUD existe (texte rendu).
- Tous les bugs identifiés sont corrigés ou explicitement listés comme hors scope.
- Le test passe avant ET après les corrections (le test « rouge » qui démontre le bug est versionné).

## Steps
1. Écrire `tests/smoke.mjs` avec Playwright + un static-server local → verify : `node tests/smoke.mjs` produit un rapport listant erreurs console / état des scènes.
2. Exécuter le smoke test une première fois pour collecter les bugs réels → verify : sortie capturée dans `tests/baseline.log`.
3. Lister les bugs détectés dans ce plan, classer par criticité.
4. Pour chaque bug : correction chirurgicale + re-run du smoke test → verify : l'erreur disparaît du log.
5. Re-run final propre → verify : exit code 0, aucun bug listé non résolu.

## Out of scope
- Refonte d'architecture, ajout de fonctionnalités.
- Suppression des fichiers stale listés dans CLAUDE.md (`SpellBar.js`, `path/to/*`, doublons `StoryManager`) — à mentionner mais ne pas toucher sans demande explicite.
- Équilibrage gameplay, balance des stats/spells.
- Tests visuels (pixel-diff, animations).

## Bugs détectés et corrigés

### Bug A — `Enemy` ignore `config.resourceDrop` (CRITIQUE)
- **Fichier** : `src/objects/Enemy.js`
- **Symptôme** : `GameScene._spawnEnemiesFromDungeon` calcule un `resourceDrop` selon les drop rates de `MANA_RESOURCES` et le passe au constructeur, mais `Enemy` ne le stocke ni ne le transmet dans l'event `enemy:died`. Conséquence : aucun ennemi du donjon BSP ne lâche de ressource Mana, donc l'inventaire reste vide et la méditation seule fait progresser le Mana Core.
- **Test rouge** → vert : `Enemy : config.resourceDrop est transmis dans enemy:died`
- **Correction** : stocker `this.resourceDrop = config.resourceDrop ?? null` et l'inclure dans le payload de `enemy:died`.

### Bug B — `DialogueScene._typeText` boucle infinie sur texte vide
- **Fichier** : `src/scenes/DialogueScene.js`
- **Symptôme** : `addEvent({ repeat: text.length - 1, ... })` avec `text === ""` donne `repeat: -1` qui en Phaser signifie « répéter à l'infini ». Le callback concatène `text[0] = undefined`, donc la zone de dialogue se remplit de "undefined" et bloque le jeu. Reproduit dans le test : 495 caractères "undefined…" en 1.5 s.
- **Test rouge** → vert : `DialogueScene : ligne avec text vide ne boucle pas (finit en <1.5s)`
- **Correction** : guard early-return si `text.length === 0`.

### Bug C — `MobileControls.resize` accumule des fantômes (fuite + doublons d'input)
- **Fichier** : `src/ui/MobileControls.js`
- **Symptôme** : `resize()` ne détruisait que `_castBtn.zone`, `_menuBtn.zone` et le joystick. Les boutons « next » et « medit », tous les `gfx` de cercle et toutes les `text` (icônes ⚡↻🧘≡) restaient à l'écran et **interactifs** après chaque rotation. Mesuré : +10 enfants Phaser par rotation. Conséquence : à chaque rotation un tap déclenche plusieurs handlers (`mobile:cast`, `mobile:nextspell`, …).
- **Test rouge** → vert : `MobileControls : resize n'accumule pas de doublons` (delta passe de 30 à 0 sur 3 rotations).
- **Correction** : registre `_buttons[]` rempli par `_makeButton` (qui retourne aussi le `text`), `_destroyButtons()` détruit zone/text/gfx pour chaque bouton, appelé en début de `resize()`.

## Bugs identifiés mais hors scope (non corrigés)
- `Level1Scene` : pas de game-over quand `_playerHp <= 0`. Demande l'ajout d'une feature, pas une correction de bug existant.
- `assets/data/story/arc_01_chapter_01.json` : structure `{chapter_info, sequences}` non utilisée par le `StoryManager` actuel ; lié au fichier `src/systems/StoryManager.js` (stale, voir CLAUDE.md). Pas chargé donc inerte.
- `Aura` toujours visible même au tier Black/level 0 : choix de design (alpha 0.30 voulu).

## Journal d'exécution
1. ✅ `tests/smoke.mjs` créé. Premier run : Phaser CDN bloqué dans le sandbox → vendoré localement à `tests/vendor/phaser.min.js` (test only) et routé via `page.route`.
2. ✅ Faux positifs corrigés : (a) classes ES6 top-level ne sont pas sur `window` → check via `eval` dans le scope de la page ; (b) `Phaser.GAMES` n'expose pas l'instance dans 3.60 → `addInitScript` qui patche `Phaser.Game` quand la prop est définie, idempotent via `Symbol.for`.
3. ✅ `tests/scenarios.mjs` couvre Level1Scene, GameScene, DialogueScene, méditation, sorts, allocation stats, story trigger, mort d'ennemi.
4. ✅ Bugs A, B, C reproduits en rouge avant correction.
5. ✅ Corrections chirurgicales appliquées (3 fichiers source touchés au minimum).
6. ✅ Re-run final : `[14/14] passed` sur scenarios, `[smoke] OK` sur smoke. Aucune régression.
