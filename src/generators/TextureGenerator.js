/**
 * TEXTURE GENERATOR
 *
 * Génère toutes les textures via Canvas HTML5.
 * Utilise DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor] pour
 * adapter les couleurs à l'environnement de l'étage courant.
 *
 * Exposé en global : TextureGenerator
 */
class TextureGenerator {

    constructor(scene) {
        this.scene = scene;
        this._env  = DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor] ?? DUNGEON_ENVIRONMENTS[3];
    }

    // ----------------------------------------------------------------
    // Joueur : Mage TBATE
    // ----------------------------------------------------------------
    createPlayerTexture() {
        const KEY = 'player';
        if (this.scene.textures.exists(KEY)) return KEY;
        const cv = this._canvas(32, 48);
        const c  = cv.getContext('2d');

        c.fillStyle = '#2a1a4e';
        c.beginPath(); c.moveTo(6,20); c.lineTo(26,20); c.lineTo(30,48); c.lineTo(2,48); c.closePath(); c.fill();
        c.fillStyle = '#3d2878';
        c.beginPath(); c.moveTo(10,22); c.lineTo(16,22); c.lineTo(14,46); c.lineTo(8,46); c.closePath(); c.fill();
        c.fillStyle = '#2d1a6e'; c.fillRect(8,20,16,12);
        c.fillStyle = '#5533aa'; c.fillRect(13,22,2,8); c.fillRect(11,25,6,2);
        c.fillStyle = '#f0d0a0'; c.fillRect(11,8,10,10);
        c.fillStyle = '#00aaff'; c.fillRect(12,11,2,2); c.fillRect(17,11,2,2);
        c.fillStyle = '#1a0a3e';
        c.beginPath(); c.arc(16,10,8,Math.PI,0); c.fill();
        c.fillRect(9,8,14,6);
        c.strokeStyle = '#5533aa'; c.lineWidth = 1;
        c.beginPath(); c.arc(16,10,8,Math.PI,0); c.stroke();
        c.fillStyle = '#f0d0a0'; c.fillRect(6,22,4,4); c.fillRect(22,22,4,4);
        c.strokeStyle = '#8855cc'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(28,44); c.lineTo(24,14); c.stroke();
        c.fillStyle = '#aa55ff';
        c.beginPath(); c.arc(24,12,4,0,Math.PI*2); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(23,11,1.5,0,Math.PI*2); c.fill();

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Sol — adapté à l'environnement
    // ----------------------------------------------------------------
    createTileTexture() {
        const KEY = 'tile';
        if (this.scene.textures.exists(KEY)) return KEY;
        const env = this._env;
        const cv  = this._canvas(32, 32);
        const c   = cv.getContext('2d');

        c.fillStyle = env.floorColor; c.fillRect(0,0,32,32);
        c.fillStyle = env.floorDetail;
        [[1,1],[17,1],[1,17],[17,17]].forEach(([x,y]) => c.fillRect(x,y,14,14));

        // Joints
        c.fillStyle = this._darken(env.floorColor, 0.6);
        c.fillRect(0,15,32,2); c.fillRect(15,0,2,32);

        // Détails spécifiques à l'environnement
        if (DUNGEON_CONFIG.currentFloor === 1) {
            // Veines de bois
            c.strokeStyle = this._lighten(env.floorColor, 1.3); c.lineWidth = 0.5;
            c.beginPath(); c.moveTo(2,8); c.lineTo(12,6); c.stroke();
            c.beginPath(); c.moveTo(18,22); c.lineTo(28,20); c.stroke();
        } else if (DUNGEON_CONFIG.currentFloor === 2) {
            // Taches de mousse
            c.fillStyle = '#0a2a08';
            [[3,3],[20,5],[6,20],[22,18]].forEach(([x,y]) => { c.beginPath(); c.arc(x,y,2,0,Math.PI*2); c.fill(); });
        } else {
            // Micro-reflets donjon
            c.fillStyle = '#1a1a33';
            [[2,2],[18,2],[2,18],[18,18]].forEach(([x,y]) => c.fillRect(x,y,3,1));
        }

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Mur — adapté à l'environnement
    // ----------------------------------------------------------------
    createWallTexture() {
        const KEY = 'wall';
        if (this.scene.textures.exists(KEY)) return KEY;
        const env = this._env;
        const cv  = this._canvas(32, 32);
        const c   = cv.getContext('2d');

        c.fillStyle = env.wallColor; c.fillRect(0,0,32,32);
        c.fillStyle = this._lighten(env.wallColor, 1.4);
        c.fillRect(1,1,28,12); c.fillRect(1,15,12,16); c.fillRect(15,15,16,16);
        c.fillStyle = env.wallDetail;
        c.fillRect(0,13,32,2); c.fillRect(13,13,2,19);

        if (DUNGEON_CONFIG.currentFloor === 1) {
            // Planches de bois horizontales
            c.strokeStyle = this._lighten(env.wallColor, 1.6); c.lineWidth = 0.8;
            for (let y = 5; y < 32; y += 8) { c.beginPath(); c.moveTo(0,y); c.lineTo(32,y); c.stroke(); }
        } else if (DUNGEON_CONFIG.currentFloor === 2) {
            // Racines et mousse
            c.strokeStyle = '#2a4a10'; c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(4,0); c.quadraticCurveTo(8,14,4,28); c.stroke();
            c.beginPath(); c.moveTo(24,0); c.quadraticCurveTo(20,16,26,32); c.stroke();
            c.fillStyle = '#0a3308';
            [[2,2,5,2],[16,16,6,2],[20,4,4,2]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
        } else {
            // Fissures de donjon
            c.fillStyle = this._lighten(env.wallColor, 1.3);
            [[2,2,5,1],[2,16,4,1],[16,16,5,1]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            c.strokeStyle = env.wallDetail; c.lineWidth = 1;
            c.beginPath(); c.moveTo(8,4); c.lineTo(12,10); c.stroke();
            c.beginPath(); c.moveTo(22,18); c.lineTo(25,28); c.stroke();
        }

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Ennemi — Void Beast
    // ----------------------------------------------------------------
    createEnemyTexture() {
        const KEY = 'enemy';
        if (this.scene.textures.exists(KEY)) return KEY;
        const cv = this._canvas(32,32);
        const c  = cv.getContext('2d');

        c.fillStyle = '#0a0010';
        c.beginPath(); c.arc(16,18,12,0,Math.PI*2); c.fill();
        c.fillStyle = '#050008';
        c.beginPath(); c.arc(13,16,5,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(20,20,4,0,Math.PI*2); c.fill();
        const g = c.createRadialGradient(16,18,8,16,18,14);
        g.addColorStop(0,'rgba(80,0,120,0)'); g.addColorStop(1,'rgba(80,0,120,0.55)');
        c.fillStyle = g;
        c.beginPath(); c.arc(16,18,14,0,Math.PI*2); c.fill();
        c.fillStyle = '#ff0000';
        c.beginPath(); c.arc(12,16,3,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(21,16,3,0,Math.PI*2); c.fill();
        c.fillStyle = '#300000';
        c.fillRect(11,14,2,4); c.fillRect(20,14,2,4);
        c.fillStyle = '#ff6666'; c.fillRect(11,14,1,1); c.fillRect(20,14,1,1);
        c.strokeStyle = '#2d0050'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(4,24); c.lineTo(10,20); c.stroke();
        c.beginPath(); c.moveTo(28,24); c.lineTo(22,20); c.stroke();
        c.beginPath(); c.moveTo(16,30); c.lineTo(16,22); c.stroke();

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Projectiles
    // ----------------------------------------------------------------
    createProjectileTextures(spells) {
        for (const spell of spells) {
            const KEY = `proj_${spell.id}`;
            if (this.scene.textures.exists(KEY)) continue;
            const diameter = spell.size * 4;
            const cv = this._canvas(diameter, diameter);
            const c  = cv.getContext('2d');
            const cx = diameter / 2;
            const hexColor = '#' + spell.color.toString(16).padStart(6,'0');
            const glow = c.createRadialGradient(cx,cx,0,cx,cx,cx);
            glow.addColorStop(0, hexColor+'ff');
            glow.addColorStop(0.45, hexColor+'cc');
            glow.addColorStop(1, hexColor+'00');
            c.fillStyle = glow; c.fillRect(0,0,diameter,diameter);
            c.fillStyle = '#ffffff';
            c.beginPath(); c.arc(cx,cx,spell.size*0.45,0,Math.PI*2); c.fill();
            this.scene.textures.addCanvas(KEY, cv);
        }
    }

    // ----------------------------------------------------------------
    // Utilitaires
    // ----------------------------------------------------------------
    _canvas(w, h) {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        return cv;
    }

    _darken(hex, factor) {
        const n = parseInt(hex.replace('#',''), 16);
        const r = Math.floor(((n>>16)&255) * factor);
        const g = Math.floor(((n>>8)&255)  * factor);
        const b = Math.floor((n&255)       * factor);
        return `rgb(${r},${g},${b})`;
    }

    _lighten(hex, factor) {
        const n = parseInt(hex.replace('#',''), 16);
        const r = Math.min(255, Math.floor(((n>>16)&255) * factor));
        const g = Math.min(255, Math.floor(((n>>8)&255)  * factor));
        const b = Math.min(255, Math.floor((n&255)       * factor));
        return `rgb(${r},${g},${b})`;
    }
}