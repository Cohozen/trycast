import type {
    MatchOdds,
    MatchOutcome,
    MatchPoints,
    MatchResultInput,
    OffensiveSideBreakdown,
    PointsBreakdown,
    PredictionInput,
    ScoringRules,
} from './types.ts';

function outcomeOf(homeScore: number, awayScore: number): MatchOutcome {
    if (homeScore === awayScore) return 'draw';
    return homeScore > awayScore ? 'home' : 'away';
}

function oddsFor(outcome: MatchOutcome, odds: MatchOdds): number | null {
    const value = odds[outcome];
    return value !== null && value > 0 ? value : null;
}

// Arrondi au point entier, stabilisé contre les flottants (10 × 1.15 vaut
// 11.499999… en IEEE 754 et doit donner 12, pas 11)
function roundPoints(value: number): number {
    return Math.round(Number(value.toFixed(6)));
}

/**
 * Bonus offensif d'un côté (équipe) : indexé sur la cote de VICTOIRE de cette
 * équipe (pas celle du vainqueur prédit) — une attaque d'un outsider rapporte
 * plus. Case cochée mais essais < seuil ⇒ malus. Essais non saisis ⇒ en
 * attente (passe 2). `evaluate` (= bon vainqueur) porte le couplage : sans lui,
 * ni bonus ni malus, le volet reste neutre.
 */
function offensiveSide(
    checked: boolean,
    sideOdds: number | null,
    tries: number | null,
    rules: ScoringRules,
    evaluate: boolean,
): OffensiveSideBreakdown {
    const side: OffensiveSideBreakdown = {
        checked,
        oddsUsed: sideOdds ?? rules.fallbackOdds,
        oddsFallback: sideOdds === null,
        tries,
        pending: false,
        points: 0,
    };
    if (!checked || !evaluate) {
        return side;
    }
    if (tries === null) {
        side.pending = true;
    } else if (tries >= rules.offensiveBonusMinTries) {
        side.points = roundPoints(
            rules.offensiveBonusRatio * rules.winnerPointsPerOddsUnit * side.oddsUsed,
        );
    } else {
        side.points = -rules.offensiveMalusPoints;
    }
    return side;
}

/**
 * Calcule les points d'un prono contre le résultat d'un match, selon le barème.
 * Fonction pure (zéro I/O) : partagée entre l'aperçu dans l'app et, au Lot 4,
 * l'Edge Function de scoring. Mauvais vainqueur ⇒ 0 partout — les volets
 * écart/bonus ne rattrapent pas un mauvais 1/N/2.
 */
export function computeMatchPoints(
    prediction: PredictionInput,
    result: MatchResultInput,
    odds: MatchOdds,
    rules: ScoringRules,
): MatchPoints {
    const predictedOutcome = outcomeOf(prediction.homeScore, prediction.awayScore);
    const actualOutcome = outcomeOf(result.homeScore, result.awayScore);
    const winnerCorrect = predictedOutcome === actualOutcome;

    const rawOdds = oddsFor(predictedOutcome, odds);
    const oddsUsed = rawOdds ?? rules.fallbackOdds;

    // Bonus offensif par côté : indexé sur la cote de victoire de l'équipe
    // (odds.home / odds.away), couplé au bon vainqueur via winnerCorrect.
    const offensiveHome = offensiveSide(
        prediction.bonusOffHome,
        oddsFor('home', odds),
        result.homeTries,
        rules,
        winnerCorrect,
    );
    const offensiveAway = offensiveSide(
        prediction.bonusOffAway,
        oddsFor('away', odds),
        result.awayTries,
        rules,
        winnerCorrect,
    );

    const breakdown: PointsBreakdown = {
        predictedOutcome,
        winnerCorrect,
        oddsUsed,
        oddsFallback: rawOdds === null,
        winnerPoints: 0,
        exactScorePoints: 0,
        gapPoints: 0,
        defensiveBonusPoints: 0,
        offensiveHome,
        offensiveAway,
        offensiveBonusPending: offensiveHome.pending || offensiveAway.pending,
    };

    if (!winnerCorrect) {
        return { total: 0, breakdown };
    }

    breakdown.winnerPoints = roundPoints(rules.winnerPointsPerOddsUnit * oddsUsed);

    const exactScore =
        prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;
    const predictedGap = prediction.homeScore - prediction.awayScore;
    const actualGap = result.homeScore - result.awayScore;

    // Volets exclusifs : score exact > écart exact > écart proche
    if (exactScore) {
        breakdown.exactScorePoints = rules.exactScoreBonus;
    } else if (predictedGap === actualGap) {
        breakdown.gapPoints = rules.exactGapBonus;
    } else if (Math.abs(predictedGap - actualGap) <= rules.closeGapTolerance) {
        breakdown.gapPoints = rules.closeGapBonus;
    }

    // Bonus défensif : match serré prédit ET défaite réelle ≤ 7 — un nul n'a pas de vaincu
    if (
        actualOutcome !== 'draw' &&
        Math.abs(predictedGap) <= rules.defensiveBonusMaxGap &&
        Math.abs(actualGap) <= rules.defensiveBonusMaxGap
    ) {
        breakdown.defensiveBonusPoints = rules.defensiveBonusPoints;
    }

    // Total plafonné à 0 : le malus offensif ne rend jamais un match négatif.
    const total = Math.max(
        0,
        breakdown.winnerPoints +
            breakdown.exactScorePoints +
            breakdown.gapPoints +
            breakdown.defensiveBonusPoints +
            breakdown.offensiveHome.points +
            breakdown.offensiveAway.points,
    );

    return { total, breakdown };
}

/**
 * Aperçu « peut rapporter N pts » : les points si le prono se réalise
 * exactement (score prédit = score final, cases bonus validées).
 */
export function computePotentialPoints(
    prediction: PredictionInput,
    odds: MatchOdds,
    rules: ScoringRules,
): MatchPoints {
    return computeMatchPoints(
        prediction,
        {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            homeTries: prediction.bonusOffHome ? rules.offensiveBonusMinTries : 0,
            awayTries: prediction.bonusOffAway ? rules.offensiveBonusMinTries : 0,
        },
        odds,
        rules,
    );
}
