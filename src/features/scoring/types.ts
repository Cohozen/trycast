/** Barème de scoring (v1 hardcodé dans bareme.ts, versionné en DB au Lot 4). */
export type ScoringRules = {
    version: number;
    /** Points vainqueur = ce facteur × le multiplicateur (cote) du résultat prédit. */
    winnerPointsPerOddsUnit: number;
    /** Multiplicateur appliqué quand la cote du résultat est absente. */
    fallbackOdds: number;
    exactScoreBonus: number;
    exactGapBonus: number;
    closeGapBonus: number;
    /** Tolérance (en points de match) du volet « écart proche ». */
    closeGapTolerance: number;
    defensiveBonusPoints: number;
    /** Écart max (prédit ET réel) pour le bonus défensif. */
    defensiveBonusMaxGap: number;
    /** Part des points vainqueur gagnée par case bonus offensif validée. */
    offensiveBonusRatio: number;
    /** Nombre d'essais requis pour valider un bonus offensif. */
    offensiveBonusMinTries: number;
};

export type PredictionInput = {
    homeScore: number;
    awayScore: number;
    bonusOffHome: boolean;
    bonusOffAway: boolean;
};

export type MatchResultInput = {
    homeScore: number;
    awayScore: number;
    /** null = essais pas encore saisis (passe 1 du scoring en 2 temps). */
    homeTries: number | null;
    awayTries: number | null;
};

export type MatchOdds = {
    home: number | null;
    draw: number | null;
    away: number | null;
};

export type MatchOutcome = 'home' | 'draw' | 'away';

/** Détail des points par volet — persisté en jsonb (predictions.points_breakdown) au Lot 4. */
export type PointsBreakdown = {
    predictedOutcome: MatchOutcome;
    winnerCorrect: boolean;
    /** Multiplicateur effectivement utilisé pour les points vainqueur. */
    oddsUsed: number;
    oddsFallback: boolean;
    winnerPoints: number;
    exactScorePoints: number;
    gapPoints: number;
    defensiveBonusPoints: number;
    offensiveBonusPoints: number;
    /** true = bonus offensif coché mais essais non saisis : volet en attente de la passe 2. */
    offensiveBonusPending: boolean;
};

export type MatchPoints = {
    total: number;
    breakdown: PointsBreakdown;
};
