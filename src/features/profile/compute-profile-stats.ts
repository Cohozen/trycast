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
    /** % de bons pronos parmi les scorés (null tant que rien n'est scoré). */
    precisionPct: number | null;
};

/** Stats de l'onglet Stats du Profil, dérivées de mes pronos (verdictOf). */
export function computeProfileStats(predictions: readonly PredictionRow[]): ProfileStats {
    let scored = 0;
    let good = 0;
    let exact = 0;
    for (const prediction of predictions) {
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
    return {
        played: predictions.length,
        scored,
        good,
        exact,
        missed: scored - good,
        precisionPct: scored > 0 ? Math.round((100 * good) / scored) : null,
    };
}
