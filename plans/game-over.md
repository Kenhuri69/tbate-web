# Plan — Game Over

## Goal
Quand le HP du joueur tombe à zéro (Level1Scene ou GameScene), afficher un overlay « Game Over » qui fige le gameplay et permet de relancer la scène avec un état remis à zéro.

## Choix de design
- **Overlay scene** (`GameOverScene`) sur le modèle de `DialogueScene` (overlay launch + scene parente).
- Restart : touche `R`, clic ou tap.
- Au restart : `playerState.manaCoreLevel = 0`, `playerState.manaEssence = 0`, inventaire vidé. La scène parente est `stop`-puis-`start`. `StatsSystem` est recréé dans `create()` donc XP/level joueur sont remis à 0 automatiquement.
- L'event canonique est `player:died` (déjà émis par `StatsSystem.takeDamage`). Level1Scene utilise un `_playerHp` local sans passer par `StatsSystem` → on l'émet manuellement après le hit.

## Success criteria
- Test rouge avant fix : émettre `player:died` n'a aucun effet observable (DialogueScene/GameOverScene inactifs, gameplay continue).
- Test vert après fix :
  - GameScene : `stats.takeDamage(maxHP)` lance GameOverScene.
  - Level1Scene : forcer `_playerHp = 0` puis simuler un hit lance GameOverScene.
  - Touche R / clic depuis GameOverScene : restart la scène source, `playerState.manaCoreLevel === 0`, `playerState.manaEssence === 0`.
- Smoke et scenarios existants restent verts (non-régression).

## Steps
1. Créer `src/scenes/GameOverScene.js` (overlay) → verify : fichier syntaxiquement valide.
2. Ajouter `<script>` dans `index.html` au tier 5c (avec DialogueScene) → verify : `GameOverScene` global défini après load.
3. Ajouter `GameOverScene` au tableau `scene` de `src/main.js` → verify : la scène est connue du SceneManager.
4. `Level1Scene._setupPhysics` : après le hit qui réduit `_playerHp`, si HP ≤ 0 émettre `player:died` une seule fois → verify : event observable.
5. `Level1Scene` + `GameScene.create()` : `events.on('player:died', ...)` → pause physics + `scene.launch('GameOverScene', { sourceKey })` → verify tests.
6. Ajouter 3 tests dans `tests/scenarios.mjs` (red puis green) → verify : `[N/N] passed`.
7. Re-run smoke + scenarios → verify : tout vert.

## Out of scope
- Animation du game over (fade in, ralenti, etc.).
- Sauvegarde de score / high-score.
- Retry « cheap » qui garde le Mana Core actuel (ce serait un choix de gameplay).
- Game over pour DialogueScene (n'a pas de gameplay).
- Refonte du système HP de Level1Scene pour passer par `StatsSystem` (refactor hors-bug).

## Journal
1. ✅ `GameOverScene` créée à `src/scenes/GameOverScene.js`, ajoutée au tier 5d d'`index.html` et au tableau `scene` de `main.js`.
2. ✅ `Level1Scene._setupPhysics` émet `player:died` quand `_playerHp <= 0`, et `events.once('player:died', ...)` lance `GameOverScene`.
3. ✅ `GameScene.create` listener `events.once('player:died', ...)` qui pause physics et lance `GameOverScene`.
4. ✅ Tests rouge → vert :
   - `GameScene : HP=0 lance GameOverScene`
   - `GameOverScene : R reset playerState et restart la source`
   - `Level1Scene : player:died lance GameOverScene`
5. ⚠️ Bug latent révélé par les tests : après `restart` de la scène, l'ancienne instance `HUD` reste abonnée à `scene.events` (Phaser ne nettoie pas auto les listeners custom au shutdown). Quand la nouvelle scène émet `stats:changed`, le HUD zombie tente `setSize` sur des sprites détruits → crash. **Corrigé** dans `HUD._refreshStats`/`_refreshMana` par un guard `if (!this._barHP?.scene) return`.
6. ⚠️ Diagnostic d'environnement : le sandbox de test fait planter le software WebGL en boucle infinie sur certaines scènes complexes. **Solution test-only** : `addInitScript` qui patche `Phaser.Game` pour forcer `config.type = Phaser.CANVAS` (1) au runtime. Aucun impact sur le jeu en production — la config `Phaser.AUTO` reste dans `src/main.js`.
7. ✅ Final : `[17/17] passed` sur scenarios, `[smoke] OK` sur smoke.
