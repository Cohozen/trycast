import type { ScoringRules } from './types.ts';

/**
 * Barème v1 (feuille de route §2) : points vainqueur pondérés par le
 * multiplicateur, jackpot score exact, volets écart non cumulés, bonus
 * défensif sur match serré, bonus offensif à 4 essais.
 * Valeurs ajustables pendant la beta. Versionné en DB (scoring_rules, seed v1
 * identique) : l'Edge Function de scoring lit la DB, l'app lit encore cette
 * constante pour l'aperçu — avant de créer une v2 en DB, brancher d'abord
 * l'app sur scoring_rules.
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
