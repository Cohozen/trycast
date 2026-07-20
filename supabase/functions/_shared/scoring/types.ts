/** Barème de scoring, versionné en DB (table scoring_rules). L'app lit la
 * version active via useActiveScoringRules ; bareme.ts en garde une copie
 * typée (fallback + ancre du test de parité TS↔DB). */
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
    /** Part des points d'équipe (cote de victoire × facteur) gagnée par case bonus offensif validée. */
    offensiveBonusRatio: number;
    /** Nombre d'essais requis pour valider un bonus offensif. */
    offensiveBonusMinTries: number;
    /** Malus (points retirés) par case bonus offensif cochée mais non atteinte. */
    offensiveMalusPoints: number;
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

/** Détail du bonus offensif d'un côté (équipe), persisté dans le breakdown. */
export type OffensiveSideBreakdown = {
    /** La case bonus offensif de ce côté a-t-elle été cochée par le joueur. */
    checked: boolean;
    /** Cote de victoire de cette équipe, effectivement utilisée pour le bonus. */
    oddsUsed: number;
    oddsFallback: boolean;
    /** Essais réels de l'équipe (null = pas encore saisis, passe 1). */
    tries: number | null;
    /** true = coché mais essais non saisis : volet en attente de la passe 2. */
    pending: boolean;
    /** Points de ce côté : + bonus, − malus, ou 0 (non coché / en attente). */
    points: number;
};

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
    offensiveHome: OffensiveSideBreakdown;
    offensiveAway: OffensiveSideBreakdown;
    /** = offensiveHome.pending || offensiveAway.pending. Conservé à la racine :
     * lu tel quel en SQL par le SELECT de la passe 2 (sync-results). */
    offensiveBonusPending: boolean;
};

export type MatchPoints = {
    total: number;
    breakdown: PointsBreakdown;
};
