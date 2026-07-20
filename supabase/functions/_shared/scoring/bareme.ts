import type { ScoringRules } from './types.ts';

/**
 * Barème v2 : points vainqueur pondérés par le multiplicateur (facteur 15),
 * jackpot score exact, volets écart non cumulés, bonus défensif sur match
 * serré, bonus offensif indexé sur la cote de victoire de l'équipe (25 % ×
 * facteur × cote) avec malus si la case est cochée mais ratée.
 * Valeurs ajustables pendant la beta. Versionné en DB (scoring_rules) : c'est
 * la table qui fait foi — l'Edge Function ET l'app (useActiveScoringRules) la
 * lisent. Cette constante n'est que le fallback typé du hook et l'ancre du
 * test de parité TS↔DB (doit rester identique au seed de la version active).
 */
export const BAREME_V2: ScoringRules = {
    version: 2,
    winnerPointsPerOddsUnit: 15,
    fallbackOdds: 2.0,
    exactScoreBonus: 50,
    exactGapBonus: 15,
    closeGapBonus: 8,
    closeGapTolerance: 5,
    defensiveBonusPoints: 5,
    defensiveBonusMaxGap: 7,
    offensiveBonusRatio: 0.25,
    offensiveBonusMinTries: 4,
    offensiveMalusPoints: 10,
};
