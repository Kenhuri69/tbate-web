/**
 * STATS — Configuration du système de statistiques
 *
 * Données statiques : clés, labels, icônes, caps par tier Mana Core,
 * et bonus passifs accordés à chaque montée de Mana Core.
 *
 * Pour modifier l'équilibrage : changer les valeurs dans STAT_TIERS
 * et CORE_PASSIVES uniquement — aucun autre fichier à toucher.
 *
 * Exposé en global : STAT_KEYS, STAT_LABELS, STAT_ICONS, STAT_TIERS, CORE_PASSIVES
 */

/** Ordre canonique des stats (utilisé pour les boucles) */
const STAT_KEYS = ['str', 'agi', 'vit', 'dex', 'mag', 'lck'];

const STAT_LABELS = {
    str : 'Force',
    agi : 'Agilité',
    vit : 'Vitalité',
    dex : 'Dextérité',
    mag : 'Magie',
    lck : 'Chance',
};

const STAT_ICONS = {
    str : '⚔',
    agi : '💨',
    vit : '❤',
    dex : '🎯',
    mag : '✦',
    lck : '★',
};

/**
 * Caps de statistiques par tier (= niveau du Mana Core).
 * generalCap : toutes les stats sauf MAG
 * magCap     : cap spécifique pour la Magie (plus élevé)
 *
 * TODO : ajouter un softCap (rendements décroissants au-delà).
 */
const STAT_TIERS = [
    { tier: 0, generalCap:  10, magCap:  10 },   // Black
    { tier: 1, generalCap:  25, magCap:  32 },   // Red
    { tier: 2, generalCap:  50, magCap:  65 },   // Orange
    { tier: 3, generalCap:  75, magCap: 100 },   // Yellow
    { tier: 4, generalCap:  99, magCap: 140 },   // Silver
    { tier: 5, generalCap: 200, magCap: 200 },   // White (soft cap)
];

/**
 * Bonus passifs accordés à chaque montée de Mana Core.
 * Index 0 = Black→Red, index 4 = Silver→White.
 *
 * allBonus       : points passifs ajoutés sur TOUTES les stats
 * magBonus       : points passifs supplémentaires sur MAG uniquement
 * magMultiplier  : multiplicateur global des dégâts de sorts
 */
const CORE_PASSIVES = [
    { allBonus: 1, magBonus: 2, magMultiplier: 1.00 }, // Black  → Red
    { allBonus: 1, magBonus: 3, magMultiplier: 1.15 }, // Red    → Orange
    { allBonus: 2, magBonus: 4, magMultiplier: 1.35 }, // Orange → Yellow
    { allBonus: 2, magBonus: 5, magMultiplier: 1.60 }, // Yellow → Silver
    { allBonus: 3, magBonus: 8, magMultiplier: 2.00 }, // Silver → White
];
