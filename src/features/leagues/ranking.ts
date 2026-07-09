/** Colonnes de standings qui départagent le classement. */
export type StandingScore = {
    total_points: number;
    exact_scores: number;
    predictions_scored: number;
};

/**
 * Filtre PostgREST `or()` des lignes de standings strictement meilleures
 * qu'un score donné, avec les tie-breakers exacts de la RPC
 * get_global_leaderboard (total desc > scores exacts desc > moins de
 * pronos) : rang = count(meilleurs) + 1.
 */
export function betterThanFilter(score: StandingScore): string {
    const { total_points: total, exact_scores: exact, predictions_scored: scored } = score;
    return [
        `total_points.gt.${total}`,
        `and(total_points.eq.${total},exact_scores.gt.${exact})`,
        `and(total_points.eq.${total},exact_scores.eq.${exact},predictions_scored.lt.${scored})`,
    ].join(',');
}
