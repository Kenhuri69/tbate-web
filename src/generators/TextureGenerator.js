/**
 * TEXTURE GENERATOR
 *
 * Génère toutes les textures via Canvas HTML5.
 * Adapte les couleurs à DUNGEON_ENVIRONMENTS[currentFloor].
 *
 * Tuile FLOOR : sol praticable (chemin visible)
 * Tuile WALL  : mur (bloque le joueur, aspect épais et sombre)
 * Tuile VOID  : néant — NON dessiné (fond caméra noir)
 *
 * Distinction visuelle claire :
 *   FLOOR → couleur chaude/claire, lignes de dallage ou motif naturel
 *   WALL  → couleur sombre et dense, relief marqué, plus foncé que le sol
 */
class TextureGenerator {

    constructor(scene) {
        this.scene = scene;
        this._env  = DUNGEON_ENVIRONMENTS[DUNGEON_CONFIG.currentFloor]
                  ?? DUNGEON_ENVIRONMENTS[3];
    }

    // ----------------------------------------------------------------
    // Joueur : Mage TBATE
    // ----------------------------------------------------------------
    createPlayerTexture() {
        const KEY = 'player';
        if (this.scene.textures.exists(KEY)) return KEY;
        const cv = this._canvas(32, 48);
        const c  = cv.getContext('2d');

        // Cape
        c.fillStyle = '#2a1a4e';
        c.beginPath(); c.moveTo(6,20); c.lineTo(26,20); c.lineTo(30,48); c.lineTo(2,48); c.closePath(); c.fill();
        c.fillStyle = '#3d2878';
        c.beginPath(); c.moveTo(10,22); c.lineTo(16,22); c.lineTo(14,46); c.lineTo(8,46); c.closePath(); c.fill();
        // Torse
        c.fillStyle = '#2d1a6e'; c.fillRect(8,20,16,12);
        c.fillStyle = '#5533aa'; c.fillRect(13,22,2,8); c.fillRect(11,25,6,2);
        // Visage
        c.fillStyle = '#f0d0a0'; c.fillRect(11,8,10,10);
        c.fillStyle = '#00aaff'; c.fillRect(12,11,2,2); c.fillRect(17,11,2,2);
        // Capuche
        c.fillStyle = '#1a0a3e';
        c.beginPath(); c.arc(16,10,8,Math.PI,0); c.fill(); c.fillRect(9,8,14,6);
        c.strokeStyle = '#5533aa'; c.lineWidth = 1;
        c.beginPath(); c.arc(16,10,8,Math.PI,0); c.stroke();
        // Mains
        c.fillStyle = '#f0d0a0'; c.fillRect(6,22,4,4); c.fillRect(22,22,4,4);
        // Bâton
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
    // Sol (FLOOR) — chemin praticable, plus clair que les murs
    // ----------------------------------------------------------------
    createTileTexture() {
        const KEY = 'tile';
        if (this.scene.textures.exists(KEY)) return KEY;
        const env = this._env;
        const cv  = this._canvas(32, 32);
        const c   = cv.getContext('2d');
        const f   = DUNGEON_CONFIG.currentFloor;

        if (f === 1) {
            // ── Village Ashber : parquet/pierre chaude ──
            c.fillStyle = '#3a2810'; c.fillRect(0,0,32,32);
            // Dalles
            c.fillStyle = '#4a3418';
            [[1,1,14,14],[17,1,14,14],[1,17,14,14],[17,17,14,14]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Joints foncés
            c.fillStyle = '#2a1a08';
            c.fillRect(0,15,32,2); c.fillRect(15,0,2,32);
            // Veines de bois claires
            c.strokeStyle = '#5a4022'; c.lineWidth = 0.8;
            c.beginPath(); c.moveTo(2,5); c.lineTo(13,4); c.stroke();
            c.beginPath(); c.moveTo(18,20); c.lineTo(29,19); c.stroke();
            c.beginPath(); c.moveTo(3,22); c.lineTo(13,24); c.stroke();
            // Reflets lumineux (lumière bougie)
            c.fillStyle = 'rgba(255,180,80,0.08)';
            c.fillRect(1,1,14,14);

        } else if (f === 2) {
            // ── Forêt Elenoir : terre + mousse ──
            c.fillStyle = '#162410'; c.fillRect(0,0,32,32);
            // Patches de terre
            c.fillStyle = '#1e3014';
            c.beginPath(); c.ellipse(8,8,7,6,0.3,0,Math.PI*2); c.fill();
            c.beginPath(); c.ellipse(24,22,8,6,-0.2,0,Math.PI*2); c.fill();
            // Mousse
            c.fillStyle = '#0e2808';
            [[3,3],[20,5],[6,20],[22,18],[14,12]].forEach(([x,y]) => {
                c.beginPath(); c.arc(x,y,2.5,0,Math.PI*2); c.fill();
            });
            // Herbes/brins
            c.strokeStyle = '#2a4a18'; c.lineWidth = 0.7;
            c.beginPath(); c.moveTo(10,14); c.lineTo(9,10); c.stroke();
            c.beginPath(); c.moveTo(22,8);  c.lineTo(23,5);  c.stroke();
            // Lueur verte subtile
            c.fillStyle = 'rgba(40,120,20,0.07)';
            c.fillRect(0,0,32,32);

        } else {
            // ── Donjon souterrain : dallage de pierre ──
            c.fillStyle = '#18161e'; c.fillRect(0,0,32,32);
            // Dalles
            c.fillStyle = '#1e1c26';
            [[1,1,14,14],[17,1,14,14],[1,17,14,14],[17,17,14,14]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Joints
            c.fillStyle = '#0e0c14';
            c.fillRect(0,15,32,2); c.fillRect(15,0,2,32);
            // Micro-détails
            c.fillStyle = '#24223a';
            [[2,2,3,1],[18,2,3,1],[2,18,3,1],[18,18,3,1]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Lueur mana subtile
            c.fillStyle = 'rgba(80,40,160,0.06)';
            c.fillRect(0,0,32,32);
        }

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Mur (WALL) — obstacle solide, nettement plus sombre que le sol
    // Le mur doit être immédiatement reconnaissable : dense, sombre, relief
    // ----------------------------------------------------------------
    createWallTexture() {
        const KEY = 'wall';
        if (this.scene.textures.exists(KEY)) return KEY;
        const env = this._env;
        const cv  = this._canvas(32, 32);
        const c   = cv.getContext('2d');
        const f   = DUNGEON_CONFIG.currentFloor;

        if (f === 1) {
            // ── Village Ashber : mur de pierre/bois épais ──
            // Base sombre pour bien contraster avec le sol
            c.fillStyle = '#1a1006'; c.fillRect(0,0,32,32);
            // Blocs de pierre
            c.fillStyle = '#2e1e0a';
            c.fillRect(1,1,28,11); c.fillRect(1,14,13,17); c.fillRect(16,14,15,17);
            // Joints très sombres
            c.fillStyle = '#100a02';
            c.fillRect(0,12,32,2); c.fillRect(14,12,2,20);
            // Relief : coins clairs
            c.fillStyle = '#3e2a0e';
            [[2,2,4,1],[17,2,4,1],[2,15,4,1],[17,15,4,1]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Ombre portée (bord bas + droite plus sombre)
            const sh = c.createLinearGradient(0,22,0,32);
            sh.addColorStop(0,'rgba(0,0,0,0)'); sh.addColorStop(1,'rgba(0,0,0,0.4)');
            c.fillStyle = sh; c.fillRect(0,22,32,10);
            // Liseré de mortier
            c.strokeStyle = '#100a02'; c.lineWidth = 1;
            c.strokeRect(0.5,0.5,31,31);

        } else if (f === 2) {
            // ── Forêt Elenoir : troncs/rochers + mousse dense ──
            c.fillStyle = '#0a1206'; c.fillRect(0,0,32,32);
            // Tronc central
            c.fillStyle = '#1a2a0a';
            c.beginPath(); c.roundRect(8,0,16,32,4); c.fill();
            // Ecorce — stries verticales
            c.strokeStyle = '#0e1a06'; c.lineWidth = 1.5;
            for (let x = 10; x < 24; x += 3) {
                c.beginPath(); c.moveTo(x,0); c.lineTo(x+1,32); c.stroke();
            }
            // Mousse épaisse sur les côtés
            c.fillStyle = '#0a2006';
            [[0,0,8,32],[24,0,8,32]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Petites plantes
            c.fillStyle = '#163a0c';
            [[1,4],[2,20],[25,10],[26,26]].forEach(([x,y]) => {
                c.beginPath(); c.arc(x+2,y+2,3,0,Math.PI*2); c.fill();
            });
            // Ombre bas
            const sg = c.createLinearGradient(0,20,0,32);
            sg.addColorStop(0,'rgba(0,0,0,0)'); sg.addColorStop(1,'rgba(0,0,0,0.5)');
            c.fillStyle = sg; c.fillRect(0,20,32,12);

        } else {
            // ── Donjon souterrain : blocs de pierre noire ──
            c.fillStyle = '#0a0810'; c.fillRect(0,0,32,32);
            // Blocs
            c.fillStyle = '#14122a';
            c.fillRect(1,1,28,11); c.fillRect(1,14,12,17); c.fillRect(15,14,16,17);
            // Joints profonds
            c.fillStyle = '#060410';
            c.fillRect(0,12,32,2); c.fillRect(13,12,2,20);
            // Reflets de cristaux de mana intégrés dans la pierre
            c.fillStyle = 'rgba(100,60,200,0.35)';
            [[5,3,2,2],[22,16,2,2],[8,18,1,3]].forEach(([x,y,w,h]) => c.fillRect(x,y,w,h));
            // Fissures
            c.strokeStyle = '#201e36'; c.lineWidth = 0.8;
            c.beginPath(); c.moveTo(6,2); c.lineTo(10,8); c.stroke();
            c.beginPath(); c.moveTo(20,15); c.lineTo(24,22); c.stroke();
            // Ombre
            const ds = c.createLinearGradient(0,24,0,32);
            ds.addColorStop(0,'rgba(0,0,0,0)'); ds.addColorStop(1,'rgba(0,0,0,0.6)');
            c.fillStyle = ds; c.fillRect(0,24,32,8);
        }

        this.scene.textures.addCanvas(KEY, cv);
        return KEY;
    }

    // ----------------------------------------------------------------
    // Ennemi
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
        g.addColorStop(0,'rgba(80,0,120,0)');
        g.addColorStop(1,'rgba(80,0,120,0.55)');
        c.fillStyle = g;
        c.beginPath(); c.arc(16,18,14,0,Math.PI*2); c.fill();
        c.fillStyle = '#ff0000';
        c.beginPath(); c.arc(12,16,3,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(21,16,3,0,Math.PI*2); c.fill();
        c.fillStyle = '#300000';
        c.fillRect(11,14,2,4); c.fillRect(20,14,2,4);
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
            const d  = spell.size * 4;
            const cv = this._canvas(d, d);
            const c  = cv.getContext('2d');
            const cx = d / 2;
            const hex = '#' + spell.color.toString(16).padStart(6,'0');
            const glow = c.createRadialGradient(cx,cx,0,cx,cx,cx);
            glow.addColorStop(0, hex+'ff');
            glow.addColorStop(0.45, hex+'cc');
            glow.addColorStop(1, hex+'00');
            c.fillStyle = glow; c.fillRect(0,0,d,d);
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
}