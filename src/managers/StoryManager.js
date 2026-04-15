/**
 * STORY MANAGER - Version ultra-générique
 * Le nom du dialogue est déduit directement du hookId de la zone
 * Exemple : hookId = "start_zone" → charge "assets/dialogues/start_zone.json"
 */

class StoryManager {

    constructor(scene) {
        this.scene = scene;
        this.triggered = new Set(); // Évite de relancer plusieurs fois le même dialogue

        this._setupListeners();
    }

    _setupListeners() {
        this.scene.events.on('room:entered', (data) => {
            const hookId = data.hookId;

            if (!hookId || this.triggered.has(hookId)) return;

            // On marque comme déclenché (surtout pour les dialogues "once")
            this.triggered.add(hookId);

            console.log(`[StoryManager] Zone détectée → hookId: "${hookId}"`);

            this._loadAndLaunchDialogue(hookId);
        });
    }

    _loadAndLaunchDialogue(hookId) {
        const jsonKey = `dialogue_${hookId}`;
        const jsonPath = `assets/data/story/${hookId}.json`;

        // Chargement du JSON
        this.scene.load.json(jsonKey, jsonPath);

        this.scene.load.once('complete', () => {
            const dialogueData = this.scene.cache.json.get(jsonKey);

            if (!dialogueData) {
                console.warn(`[StoryManager] Fichier dialogue introuvable : ${jsonPath}`);
                return;
            }

            console.log(`[StoryManager] Lancement du dialogue : ${jsonPath}`);

            // Lancement de la scène DialogueScene en overlay
            this.scene.scene.launch('DialogueScene', {
                conversations: dialogueData.conversations || dialogueData,
                onComplete: () => {
                    console.log(`[StoryManager] Dialogue "${hookId}" terminé`);
                    // Tu peux ajouter ici des actions après le dialogue si besoin
                }
            });
        });

        this.scene.load.start();
    }
}

window.StoryManager = StoryManager;