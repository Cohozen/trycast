import type {
    MatchOdds,
    MatchOutcome,
    MatchPoints,
    MatchResultInput,
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

    const breakdown: PointsBreakdown = {
        predictedOutcome,
        winnerCorrect,
        oddsUsed,
        oddsFallback: rawOdds === null,
        winnerPoints: 0,
        exactScorePoints: 0,
        gapPoints: 0,
        defensiveBonusPoints: 0,
        offensiveBonusPoints: 0,
        offensiveBonusPending: false,
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

    // Bonus offensif par équipe cochée : validé à N essais, en attente si essais non saisis
    for (const side of ['home', 'away'] as const) {
        const checked = side === 'home' ? prediction.bonusOffHome : prediction.bonusOffAway;
        if (!checked) continue;
        const tries = side === 'home' ? result.homeTries : result.awayTries;
        if (tries === null) {
            breakdown.offensiveBonusPending = true;
        } else if (tries >= rules.offensiveBonusMinTries) {
            breakdown.offensiveBonusPoints += roundPoints(
                rules.offensiveBonusRatio * breakdown.winnerPoints,
            );
        }
    }

    const total =
        breakdown.winnerPoints +
        breakdown.exactScorePoints +
        breakdown.gapPoints +
        breakdown.defensiveBonusPoints +
        breakdown.offensiveBonusPoints;

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
