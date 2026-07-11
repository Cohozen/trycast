import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';

export type RoundPoints = {
    /** Libellé brut du round (`matches.round`), null si non renseigné. */
    round: string | null;
    /** Points gagnés sur la journée (0 si aucun prono scoré). */
    points: number;
    /** Total cumulé jusqu'à cette journée incluse. */
    cumulative: number;
};

/**
 * Série « Points par journée » de l'onglet Stats du Profil : somme de mes
 * `points_awarded` par round, sur les seules journées déjà entamées (au moins
 * un match terminé). `round` est un libellé texte : l'ordre chronologique
 * vient du kickoff le plus ancien de chaque journée, jamais d'un tri
 * alphabétique (« 10 » < « 2 »).
 */
export function computePointsByRound(
    predictionsByMatchId: ReadonlyMap<string, PredictionRow>,
    matches: readonly Pick<MatchWithTeams, 'id' | 'round' | 'kickoff_at' | 'status'>[],
): RoundPoints[] {
    type RoundBucket = {
        round: string | null;
        points: number;
        firstKickoff: string;
        started: boolean;
    };
    const buckets = new Map<string | null, RoundBucket>();

    for (const match of matches) {
        let bucket = buckets.get(match.round);
        if (!bucket) {
            bucket = {
                round: match.round,
                points: 0,
                firstKickoff: match.kickoff_at,
                started: false,
            };
            buckets.set(match.round, bucket);
        }
        if (match.kickoff_at < bucket.firstKickoff) bucket.firstKickoff = match.kickoff_at;
        if (match.status === 'finished') bucket.started = true;
        bucket.points += predictionsByMatchId.get(match.id)?.points_awarded ?? 0;
    }

    const rounds = [...buckets.values()]
        .filter((bucket) => bucket.started)
        .sort((a, b) => a.firstKickoff.localeCompare(b.firstKickoff));

    let cumulative = 0;
    return rounds.map((bucket) => {
        cumulative += bucket.points;
        return { round: bucket.round, points: bucket.points, cumulative };
    });
}
