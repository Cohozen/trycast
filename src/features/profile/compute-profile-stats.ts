import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { verdictOf } from '@/features/predictions/verdict';

export type ProfileStats = {
    /** Pronos posés (scorés ou non). */
    played: number;
    /** Pronos passés au scoring. */
    scored: number;
    /** Bons 1/N/2 (les scores exacts en font partie). */
    good: number;
    /** Scores exacts. */
    exact: number;
    /** Pronos scorés au mauvais 1/N/2. */
    missed: number;
    /** Matchs terminés sans prono posé (occasions manquées). */
    notPredicted: number;
    /** % de bons pronos parmi scorés + non pronostiqués (null tant qu'il n'y a rien à compter). */
    precisionPct: number | null;
};

/**
 * Stats de l'onglet Stats du Profil : mes pronos (verdictOf) + les matchs
 * terminés sans prono, qui pèsent dans la précision comme occasions manquées.
 */
export function computeProfileStats(
    predictionsByMatchId: ReadonlyMap<string, PredictionRow>,
    matches: readonly Pick<MatchWithTeams, 'id' | 'status'>[],
): ProfileStats {
    let scored = 0;
    let good = 0;
    let exact = 0;
    for (const prediction of predictionsByMatchId.values()) {
        const verdict = verdictOf(prediction);
        if (verdict === 'pending') continue;
        scored += 1;
        if (verdict === 'exact') {
            exact += 1;
            good += 1;
        } else if (verdict === 'good') {
            good += 1;
        }
    }
    let notPredicted = 0;
    for (const match of matches) {
        if (match.status === 'finished' && !predictionsByMatchId.has(match.id)) {
            notPredicted += 1;
        }
    }
    const denominator = scored + notPredicted;
    return {
        played: predictionsByMatchId.size,
        scored,
        good,
        exact,
        missed: scored - good,
        notPredicted,
        precisionPct: denominator > 0 ? Math.round((100 * good) / denominator) : null,
    };
}
