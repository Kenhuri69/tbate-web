export class StoryManager {
    constructor(scene) {
        this.scene = scene;
        this.currentArc = 1;
        this.currentChapter = 1;
        this.flags = new Set(); // Pour stocker les événements accomplis (ex: "S_MET_SYLVIE")
    }

    // Méthode pour générer le nom selon ta règle de nommage
    getFileName() {
        const arc = String(this.currentArc).padStart(2, '0');
        const chap = String(this.currentChapter).padStart(2, '0');
        return `arc_${arc}_chapter_${chap}`;
    }

    // Logique de chargement dynamique
    loadChapterData(callback) {
        const fileName = this.getFileName();
        const fileKey = `story_${fileName}`;

        if (this.scene.cache.json.has(fileKey)) {
            callback(this.scene.cache.json.get(fileKey));
            return;
        }

        this.scene.load.json(fileKey, `assets/data/story/${fileName}.json`);
        this.scene.load.once('complete', () => {
            callback(this.scene.cache.json.get(fileKey));
        });
        this.scene.load.start();
    }
}
