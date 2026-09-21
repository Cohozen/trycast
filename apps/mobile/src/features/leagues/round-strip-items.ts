import type { MatchWithTeams } from '@/features/matches/types';

import { roundGroupKey } from './round-points';
import type { CompetitionStage, RoundStripItem, StageKind } from './types';

/**
 * Étape qui contient un coup d'envoi — miroir client du regroupement de
 * get_league_round_points (SQL), qui reste la référence : bornes
 * [starts_at, ends_at).
 */
export function findCompetitionStage(
    stages: readonly CompetitionStage[],
    kickoffAt: string,
): CompetitionStage | null {
    const kickoff = Date.parse(kickoffAt);
    return (
        stages.find(
            (stage) =>
                kickoff >= Date.parse(stage.starts_at) && kickoff < Date.parse(stage.ends_at),
        ) ?? null
    );
}

/**
 * Pilules de la bande Journées & phases finales, dans l'ordre chronologique
 * (premier kickoff) : une par journée de poule, une par étape à élimination
 * directe. `lastPlayed` = dernier groupe dont un match est terminé.
 */
export function buildRoundStrip(
    matches: readonly MatchWithTeams[],
    stages: readonly CompetitionStage[],
): { items: RoundStripItem[]; lastPlayed: RoundStripItem | null } {
    const buckets = new Map<string, RoundStripItem>();
    for (const match of matches) {
        const stage = findCompetitionStage(stages, match.kickoff_at);
        const key = roundGroupKey(match.round, stage?.key);
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                key,
                kind: stage ? (stage.kind as StageKind) : 'round',
                label: stage ? '' : (match.round ?? '—'),
                played: false,
                emphasized: false,
                firstKickoff: match.kickoff_at,
                matchCount: 0,
            };
            buckets.set(key, bucket);
        }
        bucket.matchCount += 1;
        if (match.kickoff_at < bucket.firstKickoff) bucket.firstKickoff = match.kickoff_at;
        if (match.status === 'finished') bucket.played = true;
    }
    const items = [...buckets.values()].sort((a, b) =>
        a.firstKickoff.localeCompare(b.firstKickoff),
    );
    const played = items.filter((item) => item.played);
    const lastPlayed = played[played.length - 1] ?? null;
    if (lastPlayed) lastPlayed.emphasized = true;
    return { items, lastPlayed };
}
