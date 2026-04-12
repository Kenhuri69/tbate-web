/**
 * TEXTURE GENERATOR
 *
 * Génère toutes les textures pixel-art via Canvas HTML5.
 * Chaque méthode est idempotente : un second appel ne recrée pas la texture.
 *
 * TODO : remplacer par de vraies spritesheets une fois les assets disponibles.
 * TODO : ajouter des variantes (wall_cracked, tile_lit, enemy_elite, boss…).
 */
export class TextureGenerator {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
    }

    // ----------------------------------------------------------------
    // Joueur : Mage TBATE (cape, capuche, bâton avec orbe, yeux de mana)
    // TODO : animer via spritesheet (idle, run, cast)
    // ----------------------------------------------------------------
    createPlayerTexture() {
        const KEY = 'player';
        if (this.scene.textures.exists(KEY)) return KEY;

        const cv = this._canvas(32, 48);
        const c  = cv.getContext('2d');

        // — Cape arrière-plan —
        c.fillStyle = '#2a1a4e';
        c.beginPath();
        c.moveTo(6, 20); c.lineTo(26, 20); c.lineTo(30, 48); c.lineTo(2, 48);
        c.closePath(); c.fill();

        // Reflet de cape
        c.fillStyle = '#3d2878';
        c.beginPath();
        c.moveTo(10, 22); c.lineTo(16, 22); c.lineTo(14, 46); c.lineTo(8, 46);
        c.closePath(); c.fill();

        // — Robe / torse —
        c.fillStyle = '#2d1a6e';
        c.fillRect(8, 20, 16, 12);

        // Runes sur la robe
        c.fillStyle = '#5533aa';
        c.fillRect(13, 22, 2, 8);
        c.fillRect(11, 25, 6, 2);

        // — Visage —
        c.fillStyle = '#f0d0a0';
        c.fillRect(11, 8, 10, 10);

        // Yeux lumineux (mana bleu)
        c.fillStyle = '#00aaff';
        c.fillRect(12, 11, 2, 2);
        c.fillRect(17, 11, 2, 2);

        // — Capuche —
        c.fillStyle = '#1a0a3e';
        c.beginPath(); c.arc(16, 10, 8, Math.PI, 0); c.fill();
        c.fillRect(9, 8, 14, 6);

        // Bordure capuche (reflet violet)
        c.strokeStyle = '#5533aa'; c.lineWidth = 1;
        c.beginPath(); c.arc(16, 10, 8, Math.PI, 0); c.stroke();

        // — Mains —
        c.fillStyle = '#f0d0a0';
        c.fillRect(6, 22, 4, 4);
        c.fillRect(22, 22, 4, 4);

        // — Bâton magique —
        c.strokeStyle = '#8855cc'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(28, 44); c.lineTo(24, 14); c.stroke();

        // Orbe du bâton
        c.fillStyle = '#aa55ff';
        c.beginPath(); c.arc(24, 12, 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(23, 11, 1.5, 0, Math.PI * 2); c.fill();

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Sol de donjon (dallage sombre, micro-reflets pixel-art)
    // TODO : variantes (fissuré, illuminé par torche, mouillé)
    // ----------------------------------------------------------------
    createTileTexture() {
        const KEY = 'tile';
        if (this.scene.textures.exists(KEY)) return KEY;

        const cv = this._canvas(32, 32);
        const c  = cv.getContext('2d');

        // Base
        c.fillStyle = '#0d0d1a'; c.fillRect(0, 0, 32, 32);

        // Quatre pavés
        c.fillStyle = '#111122';
        [[1, 1], [17, 1], [1, 17], [17, 17]].forEach(([x, y]) => c.fillRect(x, y, 14, 14));

        // Joints
        c.fillStyle = '#08080f';
        c.fillRect(0, 15, 32, 2);
        c.fillRect(15, 0, 2, 32);

        // Micro-reflets
        c.fillStyle = '#1a1a33';
        [[2, 2], [18, 2], [2, 18], [18, 18]].forEach(([x, y]) => c.fillRect(x, y, 3, 1));

        // Ombres internes
        c.fillStyle = '#0a0a18';
        [[8, 8], [24, 8], [8, 24], [24, 24]].forEach(([x, y]) => c.fillRect(x, y, 4, 4));

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Mur de donjon (blocs de pierre avec relief et fissures)
    // TODO : variante avec torche murale émettant de la lumière
    // ----------------------------------------------------------------
    createWallTexture() {
        const KEY = 'wall';
        if (this.scene.textures.exists(KEY)) return KEY;

        const cv = this._canvas(32, 32);
        const c  = cv.getContext('2d');

        // Base pierre
        c.fillStyle = '#1a1a2e'; c.fillRect(0, 0, 32, 32);

        // Blocs de pierre
        c.fillStyle = '#222240';
        c.fillRect(1, 1, 28, 12);
        c.fillRect(1, 15, 12, 16);
        c.fillRect(15, 15, 16, 16);

        // Mortier
        c.fillStyle = '#0d0d1a';
        c.fillRect(0, 13, 32, 2);
        c.fillRect(13, 13, 2, 19);

        // Reflets de surface
        c.fillStyle = '#2a2a48';
        [[2, 2, 5, 1], [2, 16, 4, 1], [16, 16, 5, 1]].forEach(([x, y, w, h]) =>
            c.fillRect(x, y, w, h));

        // Fissures
        c.strokeStyle = '#0a0a18'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(8, 4);  c.lineTo(12, 10); c.stroke();
        c.beginPath(); c.moveTo(22, 18); c.lineTo(25, 28); c.stroke();

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Ennemi : Void Beast (masse du vide, yeux rouges en fente)
    // TODO : variantes (mini-boss, élite avec aura différente)
    // ----------------------------------------------------------------
    createEnemyTexture() {
        const KEY = 'enemy';
        if (this.scene.textures.exists(KEY)) return KEY;

        const cv = this._canvas(32, 32);
        const c  = cv.getContext('2d');

        // Corps informe
        c.fillStyle = '#0a0010';
        c.beginPath(); c.arc(16, 18, 12, 0, Math.PI * 2); c.fill();

        // Texture interne du vide
        c.fillStyle = '#050008';
        c.beginPath(); c.arc(13, 16, 5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(20, 20, 4, 0, Math.PI * 2); c.fill();

        // Halo violet externe
        const g = c.createRadialGradient(16, 18, 8, 16, 18, 14);
        g.addColorStop(0, 'rgba(80,0,120,0)');
        g.addColorStop(1, 'rgba(80,0,120,0.55)');
        c.fillStyle = g;
        c.beginPath(); c.arc(16, 18, 14, 0, Math.PI * 2); c.fill();

        // Yeux rouges
        c.fillStyle = '#ff0000';
        c.beginPath(); c.arc(12, 16, 3, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(21, 16, 3, 0, Math.PI * 2); c.fill();

        // Pupilles en fente verticale
        c.fillStyle = '#300000';
        c.fillRect(11, 14, 2, 4);
        c.fillRect(20, 14, 2, 4);

        // Reflets des yeux
        c.fillStyle = '#ff6666';
        c.fillRect(11, 14, 1, 1);
        c.fillRect(20, 14, 1, 1);

        // Appendices / griffes
        c.strokeStyle = '#2d0050'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(4, 24);  c.lineTo(10, 20); c.stroke();
        c.beginPath(); c.moveTo(28, 24); c.lineTo(22, 20); c.stroke();
        c.beginPath(); c.moveTo(16, 30); c.lineTo(16, 22); c.stroke();

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Utilitaire interne
    // ----------------------------------------------------------------

    /** Crée un canvas HTML5 aux dimensions données. */
    _canvas(w, h) {
        const cv  = document.createElement('canvas');
        cv.width  = w;
        cv.height = h;
        return cv;
    }
}
