/**
 * AUDIO SYSTEM — Synthèse sonore Web Audio API
 *
 * Tous les sons sont générés en temps réel (OscillatorNode + BufferSourceNode).
 * Aucun fichier audio externe — compatible file://, zéro latence de chargement.
 *
 * Architecture des gains :
 *
 *   AudioContext.destination
 *       └── master (GainNode)
 *               ├── music  bus  — drone + arpèges procéduraux
 *               ├── sfx    bus  — sorts, impacts, mort, stingers
 *               └── ambient bus — bruit de fond filtré (grotte)
 *
 * Initialisation :
 *   L'AudioContext est créé au premier clic/tap (politique autoplay navigateur).
 *   Avant cela, tous les appels sont silencieusement ignorés.
 *
 * API publique :
 *   audio.playSpell(spellId)     — son de lancer (branché sur 'spell:cast')
 *   audio.playHit(isCrit)        — impact sur ennemi
 *   audio.playEnemyDeath()       — dissolution du Vide (branché sur 'enemy:died')
 *   audio.playManaCoreUp(level)  — accord résonant + harmoniques
 *   audio.playPlayerLevelUp()    — arpège ascendant
 *   audio.playRoomEnter(type)    — stinger narratif par type de salle
 *   audio.toggleMute()           — [M] au clavier, bouton UI
 *   audio.get muted              — état mute courant
 *
 * Événements écoutés (scene.events) :
 *   'spell:cast'      { spell }  → playSpell(spell.id)
 *   'enemy:died'                 → playEnemyDeath()
 *   'manacore:levelup'{ level }  → playManaCoreUp(level)
 *   'player:levelup'             → playPlayerLevelUp()
 *   'room:entered'    { roomType}→ playRoomEnter + setBossMode si boss
 *   'spell:changed'              → clic UI discret
 *   'shutdown'                   → _destroy()
 *
 * TODO : fade cross-musicale lors du changement d'étage.
 * TODO : réverb convolution pour les grandes salles.
 * TODO : export/import des préférences volume dans localStorage.
 *
 * Dépend de (globals) : AUDIO_CONFIG
 */
class AudioSystem {

    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;

        /** @type {AudioContext|null} */
        this._ctx    = null;
        this._master = null;
        this._buses  = { music: null, sfx: null, ambient: null };

        this._muted    = false;
        this._ready    = false;
        this._bossMode = false;

        // Scheduler de musique
        this._schedTimer = null;
        this._nextBeat   = 0;
        this._step       = 0;

        // Référence au drone pour le vibrato
        this._droneOsc = null;

        this._bindEvents();

        // AudioContext créé au 1er pointeur (règle autoplay navigateur)
        // IMPORTANT : utiliser un handler nommé pour ne pas être supprimé
        // par MobileControls qui fait input.off() global
        // DOM natif — indépendant de Phaser/Scale/MobileControls
        this._domInit   = () => this._initContext();
        this._domResume = () => { if (this._ctx?.state === 'suspended') this._ctx.resume().catch(()=>{}); };

        document.addEventListener('touchstart', this._domInit,   { once: true, passive: true });
        document.addEventListener('mousedown',  this._domInit,   { once: true, passive: true });
        document.addEventListener('touchstart', this._domResume, { passive: true });
        document.addEventListener('mousedown',  this._domResume, { passive: true });

        // Raccourci clavier mute (M) — distinct de la méditation (géré par ManaCoreSystem)
        scene.input.keyboard?.on('keydown-COMMA', () => this.toggleMute());
    }

    // ──────────────────────────────────────────────────────────────
    // API publique
    // ──────────────────────────────────────────────────────────────

    get muted() { return this._muted; }

    toggleMute() {
        this._muted = !this._muted;
        if (this._master) {
            this._master.gain.setTargetAtTime(
                this._muted ? 0 : AUDIO_CONFIG.master,
                this._ctx.currentTime,
                0.08,
            );
        }
    }

    /** Active/désactive l'intensité musicale boss. */
    setBossMode(active) {
        this._bossMode = active;
    }

    // ── Sons de sorts ─────────────────────────────────────────────

    playSpell(spellId) {
        if (!this._ready) return;
        const def = AUDIO_CONFIG.spells[spellId];
        if (!def) return;

        const t   = this._ctx.currentTime;
        const osc = this._ctx.createOscillator();
        const bpf = this._ctx.createBiquadFilter();
        const g   = this._ctx.createGain();

        // Légère variation de pitch pour éviter la monotonie
        const pitchJitter = 1 + (Math.random() - 0.5) * 0.06;
        osc.type = def.waveform;
        osc.frequency.setValueAtTime(def.baseFreq * pitchJitter, t);
        osc.frequency.exponentialRampToValueAtTime(def.baseFreq * pitchJitter * 1.9, t + def.decay);

        bpf.type            = 'bandpass';
        bpf.frequency.value = def.filterFreq;
        bpf.Q.value         = 2.5;

        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(def.gain, t + def.attack);
        g.gain.exponentialRampToValueAtTime(0.001, t + def.attack + def.decay);

        osc.connect(bpf);
        bpf.connect(g);
        g.connect(this._buses.sfx);
        osc.start(t);
        osc.stop(t + def.attack + def.decay + 0.05);
    }

    // ── Impact ────────────────────────────────────────────────────

    /**
     * @param {boolean} [isCrit=false]
     */
    playHit(isCrit = false) {
        if (!this._ready) return;
        const t   = this._ctx.currentTime;
        const dur = isCrit ? 0.16 : 0.07;

        // Bruit blanc filtré (impact physique)
        const rate = this._ctx.sampleRate;
        const buf  = this._ctx.createBuffer(1, Math.ceil(rate * dur), rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++)
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

        const src  = this._ctx.createBufferSource();
        src.buffer = buf;

        const bpf = this._ctx.createBiquadFilter();
        bpf.type            = 'bandpass';
        bpf.frequency.value = isCrit ? 240 : 480;
        bpf.Q.value         = 4;

        const g = this._ctx.createGain();
        g.gain.value = isCrit ? 0.55 : 0.30;

        src.connect(bpf);
        bpf.connect(g);
        g.connect(this._buses.sfx);
        src.start(t);

        // Crit : sting aigu par-dessus
        if (isCrit) {
            this._playTone(this._buses.sfx, 1047, 0.18, 0.10, 'sine', t);
        }
    }

    // ── Mort ennemi ───────────────────────────────────────────────

    playEnemyDeath() {
        if (!this._ready) return;
        const t   = this._ctx.currentTime;
        const osc = this._ctx.createOscillator();
        const g   = this._ctx.createGain();

        // Descente de fréquence + fade → dissolution du Vide
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.5);

        g.gain.setValueAtTime(0.32, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        // Filtre qui se ferme
        const lpf = this._ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(1200, t);
        lpf.frequency.exponentialRampToValueAtTime(80, t + 0.5);

        osc.connect(lpf);
        lpf.connect(g);
        g.connect(this._buses.sfx);
        osc.start(t);
        osc.stop(t + 0.55);
    }

    // ── Progression ──────────────────────────────────────────────

    /**
     * Accord harmonique ascendant — plus riche à chaque niveau.
     * @param {number} newLevel — 0..5
     */
    playManaCoreUp(newLevel) {
        if (!this._ready) return;
        const t    = this._ctx.currentTime;
        const root = 130.81; // C3

        // Harmoniques montants (nombre = niveau + 1)
        for (let i = 0; i <= newLevel; i++) {
            const freq = root * Math.pow(2, i / 4); // chromatique
            this._playTone(this._buses.sfx, freq, 0.22, 1.4, 'sine', t + i * 0.09);
        }
        // Étincelle haute sur la fin
        this._playTone(this._buses.sfx, root * 4, 0.14, 0.5, 'triangle', t + 0.45);
        // Grondement bas pour la sensation de puissance
        this._playTone(this._buses.sfx, 55, 0.30, 0.8, 'sine', t);
    }

    /** Arpège pentatonique ascendant (niveau joueur). */
    playPlayerLevelUp() {
        if (!this._ready) return;
        const t     = this._ctx.currentTime;
        const scale = AUDIO_CONFIG.music.scale;
        scale.forEach((f, i) => {
            this._playTone(this._buses.sfx, f * 2, 0.16, 0.28, 'triangle', t + i * 0.11);
        });
    }

    // ── Stingers de salles ────────────────────────────────────────

    /**
     * @param {'boss'|'treasure'|'story'|'exit'} roomType
     */
    playRoomEnter(roomType) {
        if (!this._ready) return;
        const t = this._ctx.currentTime;

        switch (roomType) {
            case 'boss':
                // Intervalle de triton (dissonant, menaçant) + grondement bas
                this._playTone(this._buses.sfx,  55.0, 0.50, 1.8, 'sawtooth', t);
                this._playTone(this._buses.sfx,  77.8, 0.40, 1.5, 'sawtooth', t + 0.08); // ≈ Eb2
                this._playTone(this._buses.sfx,  36.7, 0.35, 2.0, 'sine',     t + 0.15); // D1 grondement
                break;

            case 'treasure':
                // Tintement cristallin (C6→G6)
                [1047, 1319, 1568, 2093, 2637].forEach((f, i) =>
                    this._playTone(this._buses.sfx, f, 0.13, 0.40, 'sine', t + i * 0.07));
                break;

            case 'story':
                // Accord maj7 suspendu (mystérieux, contemplatif)
                [130.8, 164.8, 196.0, 246.9, 329.6].forEach((f, i) =>   // Cmaj9
                    this._playTone(this._buses.sfx, f, 0.11, 1.2, 'sine', t + i * 0.06));
                break;

            case 'exit':
                // Accord majeur en montée (résolution, espoir)
                [261.6, 329.6, 392.0, 523.3].forEach((f, i) =>
                    this._playTone(this._buses.sfx, f, 0.15, 0.70, 'triangle', t + i * 0.10));
                break;
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Initialisation du contexte (au 1er clic)
    // ──────────────────────────────────────────────────────────────

    _initContext() {
        if (this._ctx) return;

        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('[AudioSystem] AudioContext non supporté', e);
            return;
        }

        // Force resume() immédiat + retry après 200ms si toujours suspended
        const doResume = () => {
            if (this._ctx.state === 'suspended') {
                this._ctx.resume().catch(() => {});
                // Retry après 200ms (certains navigateurs mobiles sont lents)
                setTimeout(() => {
                    if (this._ctx?.state === 'suspended') this._ctx.resume().catch(() => {});
                }, 200);
            }
        };
        doResume();

        // Master gain
        this._master = this._ctx.createGain();
        this._master.gain.value = this._muted ? 0 : AUDIO_CONFIG.master;
        this._master.connect(this._ctx.destination);

        // Buses — gains depuis les clés scalaires dédiées
        // IMPORTANT : AUDIO_CONFIG.music est un objet (config musicale), pas un gain !
        // Les volumes de buses sont des propriétés séparées.
        const busGains = {
            music  : AUDIO_CONFIG.musicVolume  ?? 0.20,
            sfx    : AUDIO_CONFIG.sfxVolume    ?? 0.55,
            ambient: AUDIO_CONFIG.ambientVolume ?? 0.10,
        };
        ['music', 'sfx', 'ambient'].forEach(name => {
            const g = this._ctx.createGain();
            g.gain.value = busGains[name];
            g.connect(this._master);
            this._buses[name] = g;
        });

        this._ready = true;

        this._startAmbient();
        this._startDrone();
        this._startMusicScheduler();
    }

    // ──────────────────────────────────────────────────────────────
    // Ambiance
    // ──────────────────────────────────────────────────────────────

    _startAmbient() {
        const cfg     = AUDIO_CONFIG.ambient;
        const rate    = this._ctx.sampleRate;
        const bufSize = Math.ceil(rate * cfg.noiseBufSec);

        const buf  = this._ctx.createBuffer(1, bufSize, rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.loop   = true;

        const lpf = this._ctx.createBiquadFilter();
        lpf.type            = 'lowpass';
        lpf.frequency.value = cfg.noiseFilterFreq;
        lpf.Q.value         = cfg.noiseFilterQ;

        src.connect(lpf);
        lpf.connect(this._buses.ambient);
        src.start();
        this._ambientSrc = src;
    }

    // ──────────────────────────────────────────────────────────────
    // Drone de fond (A1 + quinte)
    // ──────────────────────────────────────────────────────────────

    _startDrone() {
        const cfg = AUDIO_CONFIG.music;
        const t   = this._ctx.currentTime;

        // Fondamentale
        const osc = this._ctx.createOscillator();
        osc.type            = 'sine';
        osc.frequency.value = cfg.droneFreq;

        // LFO de vibrato très lent
        const lfo  = this._ctx.createOscillator();
        const lfoG = this._ctx.createGain();
        lfo.frequency.value = 0.25;
        lfoG.gain.value     = 0.4;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        lfo.start(t);
        this._droneOsc = osc;

        // Fade in de 3s (évite l'entrée brusque)
        const droneGain = this._ctx.createGain();
        droneGain.gain.setValueAtTime(0, t);
        droneGain.gain.linearRampToValueAtTime(cfg.droneGain, t + 3);

        osc.connect(droneGain);
        droneGain.connect(this._buses.music);
        osc.start(t);

        // Quinte (E2 ≈ 82.4 Hz) — chaleur harmonique
        const fifth = this._ctx.createOscillator();
        fifth.type            = 'triangle';
        fifth.frequency.value = cfg.droneFreq * 1.498; // rapport 3:2
        const fGain = this._ctx.createGain();
        fGain.gain.value = cfg.droneGain * 0.35;
        fifth.connect(fGain);
        fGain.connect(this._buses.music);
        fifth.start(t);
    }

    // ──────────────────────────────────────────────────────────────
    // Scheduler de musique (arpège procédural)
    // ──────────────────────────────────────────────────────────────

    _startMusicScheduler() {
        this._nextBeat = this._ctx.currentTime + 2.5; // délai avant la 1ère note
        this._step     = 0;
        this._tick();
    }

    _tick() {
        const cfg     = AUDIO_CONFIG.music;
        const bpm     = this._bossMode ? cfg.bpmBoss : cfg.bpm;
        const beatLen = 60 / bpm;

        while (this._nextBeat < this._ctx.currentTime + cfg.lookahead) {
            const idx  = cfg.pattern[this._step % cfg.pattern.length];
            const base = cfg.scale[idx];

            // 68% de chance de jouer (silences naturels)
            if (Math.random() < 0.68) {
                // Rarité d'une octave haute (son de cristal de mana)
                const octave = Math.random() < 0.12 ? 4 : 2;
                this._playArpNote(base * octave, this._nextBeat);
            }

            this._step++;
            this._nextBeat += beatLen * 0.5; // croches (2 notes par temps)
        }

        this._schedTimer = setTimeout(() => this._tick(), cfg.tickInterval);
    }

    _playArpNote(freq, startTime) {
        const cfg = AUDIO_CONFIG.music;
        const osc = this._ctx.createOscillator();
        const g   = this._ctx.createGain();
        const dur = 0.14;

        osc.type            = 'triangle';
        osc.frequency.value = freq;

        g.gain.setValueAtTime(cfg.arpGain, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(g);
        g.connect(this._buses.music);
        osc.start(startTime);
        osc.stop(startTime + dur + 0.02);
    }

    // ──────────────────────────────────────────────────────────────
    // Bindings événements Phaser
    // ──────────────────────────────────────────────────────────────

    _bindEvents() {
        const ev = this.scene.events;

        ev.on('spell:cast',       ({ spell })  => this.playSpell(spell.id));
        ev.on('enemy:died',       ()           => this.playEnemyDeath());
        ev.on('manacore:levelup', (core)       => this.playManaCoreUp(core?.level ?? 0));
        ev.on('player:levelup',   ()           => this.playPlayerLevelUp());
        ev.on('room:entered',     ({ roomType }) => {
            this.playRoomEnter(roomType);
            if (roomType === 'boss') this.setBossMode(true);
        });
        ev.on('spell:changed',    ()           => this._playUIClick());

        ev.once('shutdown', () => this._destroy());
    }

    // ──────────────────────────────────────────────────────────────
    // Utilitaires
    // ──────────────────────────────────────────────────────────────

    /** Clic UI discret (changement de sort, navigation menu). */
    _playUIClick() {
        if (!this._ready) return;
        this._playTone(this._buses.sfx, 660, 0.07, 0.05, 'sine');
    }

    /**
     * Note synthétique générique avec enveloppe linéaire → exponentielle.
     *
     * @param {GainNode} bus
     * @param {number}   freq       - Hz
     * @param {number}   gain       - volume crête [0..1]
     * @param {number}   duration   - secondes
     * @param {OscillatorType} type
     * @param {number}   [startTime]- ctx.currentTime si omis
     */
    _playTone(bus, freq, gain, duration, type = 'sine', startTime = null) {
        const t   = startTime ?? this._ctx.currentTime;
        const osc = this._ctx.createOscillator();
        const g   = this._ctx.createGain();

        osc.type            = type;
        osc.frequency.value = freq;

        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(g);
        g.connect(bus);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }

    // ──────────────────────────────────────────────────────────────
    // Nettoyage
    // ──────────────────────────────────────────────────────────────

    _destroy() {
        clearTimeout(this._schedTimer);
        document.removeEventListener('touchstart', this._domInit);
        document.removeEventListener('mousedown',  this._domInit);
        document.removeEventListener('touchstart', this._domResume);
        document.removeEventListener('mousedown',  this._domResume);
        try { this._ambientSrc?.stop(); } catch (_) {}
        try { this._droneOsc?.stop();   } catch (_) {}
        if (this._ctx?.state !== 'closed') this._ctx?.close();
    }
}