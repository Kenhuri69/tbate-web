/**
 * AUDIO CONFIG — Paramètres du système sonore
 *
 * Toutes les valeurs de fréquence, enveloppe et volume sont ici.
 * Le moteur (AudioSystem) ne contient aucune constante numérique.
 *
 * Théorie musicale :
 *   - Pentatonique mineure de La (A minor pentatonic) : A C D E G
 *   - Drone sur A1 (55 Hz) → couleur sombre / monde du Vide (TBATE)
 *   - Stingers de salles : accords évocateurs par type
 *
 * Exposé en global : AUDIO_CONFIG
 */
const AUDIO_CONFIG = {

    // ── Volumes globaux [0..1] ────────────────────────────────────
    master : 0.72,
    music  : 0.20,
    sfx    : 0.55,
    ambient: 0.10,

    // ── Sorts : couleur sonore par spell.id ───────────────────────
    // Clés = spell.id exact défini dans spells.js
    // waveform : 'sine' | 'triangle' | 'sawtooth' | 'square'
    // attack   : secondes
    // decay    : secondes (durée totale après l'attaque)
    spells: {
        mana_blast:  { baseFreq: 523, waveform: 'sine',     filterFreq: 2400, attack: 0.010, decay: 0.16, gain: 0.32 }, // cristallin
        fireball:    { baseFreq: 185, waveform: 'sawtooth', filterFreq:  700, attack: 0.018, decay: 0.24, gain: 0.30 }, // grave tranchant
        frost_lance: { baseFreq: 880, waveform: 'square',   filterFreq: 1800, attack: 0.006, decay: 0.12, gain: 0.24 }, // sifflant froid
        lightning:   { baseFreq:  98, waveform: 'triangle', filterFreq:  380, attack: 0.030, decay: 0.34, gain: 0.40 }, // profond sourd
    },

    // ── Musique procédurale ───────────────────────────────────────
    music: {
        // A minor pentatonic : A2 C3 D3 E3 G3
        scale       : [110.00, 130.81, 146.83, 164.81, 196.00],
        droneFreq   : 55.00,    // A1 — bourdon de fond
        droneGain   : 0.10,
        arpGain     : 0.065,

        bpm         : 68,       // exploration lente
        bpmBoss     : 108,      // combat boss
        lookahead   : 0.18,     // secondes à pré-calculer
        tickInterval: 50,       // ms entre les passes du scheduler

        // Pattern d'arpège (indices dans scale, longueur libre)
        pattern     : [0, 2, 4, 2, 1, 3, 4, 3, 0, 4, 2, 1],
    },

    // ── Ambiance donjon ───────────────────────────────────────────
    ambient: {
        noiseFilterFreq: 160,   // Hz — filtre passe-bas du bruit de fond
        noiseFilterQ   : 1.8,
        noiseBufSec    : 3,     // durée du buffer de bruit (répété en boucle)
    },
};
