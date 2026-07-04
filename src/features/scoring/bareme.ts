import type { ScoringRules } from './types';

/**
 * Barème v1 (feuille de route §2) : points vainqueur pondérés par le
 * multiplicateur, jackpot score exact, volets écart non cumulés, bonus
 * défensif sur match serré, bonus offensif à 4 essais.
 * Valeurs ajustables pendant la beta ; le Lot 4 versionnera ce barème en DB
 * (scoring_rules) avec ces mêmes valeurs.
 */
export const BAREME_V1: ScoringRules = {
    version: 1,
    winnerPointsPerOddsUnit: 10,
    fallbackOdds: 2.0,
    exactScoreBonus: 50,
    exactGapBonus: 15,
    closeGapBonus: 8,
    closeGapTolerance: 5,
    defensiveBonusPoints: 5,
    defensiveBonusMaxGap: 7,
    offensiveBonusRatio: 0.25,
    offensiveBonusMinTries: 4,
};
