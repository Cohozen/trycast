import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionsByMatch } from '@/features/predictions/types';
import { verdictOf } from '@/features/predictions/verdict';

import type { CelebrationItem } from './types';

/**
 * Récap des pronos à célébrer : matchs scorés (`scored_at != null`, comme
 * result-card), prono ayant rapporté des points (`points_awarded > 0`), et
 * pas encore célébrés. L'ordre suit celui des matchs (déjà triés par kickoff).
 */
export function buildCelebrationItems(
    predictionsByMatch: PredictionsByMatch,
    matches: MatchWithTeams[],
    celebratedIds: ReadonlySet<string>,
): CelebrationItem[] {
    const items: CelebrationItem[] = [];
    for (const match of matches) {
        if (match.scored_at === null || celebratedIds.has(match.id)) {
            continue;
        }
        const prediction = predictionsByMatch.get(match.id);
        if (
            prediction === undefined ||
            prediction.points_awarded === null ||
            prediction.points_awarded <= 0
        ) {
            continue;
        }
        items.push({
            matchId: match.id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            points: prediction.points_awarded,
            verdict: verdictOf(prediction),
        });
    }
    return items;
}
