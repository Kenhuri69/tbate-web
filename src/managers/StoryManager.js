/**
 * STORY MANAGER
 *
 * Écoute 'room:entered' → charge le JSON du dialogue correspondant au hookId
 * → lance DialogueScene en overlay.
 *
 * Chargement synchrone : les JSONs sont préchargés dans GameScene.preload()
 * via StoryManager.preloadAll() pour éviter les problèmes de chargement
 * après create().
 *
 * Structure JSON attendue :
 *   { "conversations": [ {name, text, side}, ... ] }
 *
 * Fichiers : assets/data/story/<hookId>.json
 */
class StoryManager {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene     = scene;
        this.triggered = new Set();
        scene.events.on('room:entered', (data) => this._onRoomEntered(data), this);
    }

    /**
     * À appeler dans GameScene.preload() pour précharger tous les JSONs connus.
     * @param {Phaser.Scene} scene
     * @param {string[]} hookIds
     */
    static preloadDialogues(scene, hookIds) {
        for (const id of hookIds) {
            scene.load.json(`dialogue_${id}`, `assets/data/story/${id}.json`);
        }
    }

    _onRoomEntered({ hookId }) {
        if (!hookId || this.triggered.has(hookId)) return;
        this.triggered.add(hookId);

        const key  = `dialogue_${hookId}`;
        const data = this.scene.cache.json.get(key);

        if (!data) {
            // Pas de dialogue pour cette zone — silencieux
            return;
        }

        const conversations = data.conversations ?? [];
        if (!conversations.length) return;

        // Pause du gameplay pendant le dialogue
        this.scene.physics.pause();
        this.scene.player?.sprite.setVelocity(0, 0);

        this.scene.scene.launch('DialogueScene', {
            conversations,
            onComplete: () => {
                this.scene.physics.resume();
            },
        });
    }
}