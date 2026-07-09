import type { MatchOdds, MatchOutcome, ScoringRules } from './types';

export const OUTCOMES: readonly MatchOutcome[] = ['home', 'draw', 'away'];

/** Ton DS d'une barre de probabilité : favori = success, incertain = warning,
 * outsider = danger — sémantique « chance que l'issue se réalise » (cotes),
 * pas une couleur d'état système. */
export type ProbabilityTone = 'success' | 'warning' | 'danger';

// Arrondi identique à compute-match-points (module Deno partagé, helpers
// privés) : au point entier, stabilisé contre les flottants IEEE 754.
function roundPoints(value: number): number {
    return Math.round(Number(value.toFixed(6)));
}

function usableOdds(value: number | null, rules: ScoringRules): number {
    return value !== null && value > 0 ? value : rules.fallbackOdds;
}

/**
 * Points « vainqueur » de chaque issue 1/N/2 : ce que rapporterait le bon
 * 1/N/2 seul (hors volets score exact/écart/bonus), avec le même repli de
 * cote que le scoring réel. Affichable avant toute saisie.
 */
export function winnerPointsByOutcome(
    odds: MatchOdds,
    rules: ScoringRules,
): Record<MatchOutcome, number> {
    return {
        home: roundPoints(rules.winnerPointsPerOddsUnit * usableOdds(odds.home, rules)),
        draw: roundPoints(rules.winnerPointsPerOddsUnit * usableOdds(odds.draw, rules)),
        away: roundPoints(rules.winnerPointsPerOddsUnit * usableOdds(odds.away, rules)),
    };
}

/**
 * Probabilités implicites des cotes (1/cote, normalisées pour ôter la marge
 * du bookmaker). null si une cote manque : pas de barres plutôt qu'une
 * distribution mensongère.
 */
export function impliedProbabilities(odds: MatchOdds): Record<MatchOutcome, number> | null {
    if (odds.home === null || odds.draw === null || odds.away === null) return null;
    if (odds.home <= 0 || odds.draw <= 0 || odds.away <= 0) return null;
    const raw = { home: 1 / odds.home, draw: 1 / odds.draw, away: 1 / odds.away };
    const sum = raw.home + raw.draw + raw.away;
    return { home: raw.home / sum, draw: raw.draw / sum, away: raw.away / sum };
}

// Seuils calés sur un match à 3 issues (équiprobable ≈ 0.33) : net favori
// au-dessus de 0.40, zone disputée entre 0.25 et 0.40, outsider en dessous.
export function probabilityTone(probability: number): ProbabilityTone {
    if (probability >= 0.4) return 'success';
    if (probability >= 0.25) return 'warning';
    return 'danger';
}
