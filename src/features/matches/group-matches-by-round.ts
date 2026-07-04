export type RoundGroup<T> = { round: string; matches: T[] };

export const FALLBACK_ROUND = 'Autres matchs';

/**
 * Groupe les matchs par journée en préservant l'ordre d'arrivée (tri kickoff
 * fait par la requête). Round absent → « Autres matchs ».
 */
export function groupMatchesByRound<T extends { round: string | null }>(
    matches: T[],
): RoundGroup<T>[] {
    const groups: RoundGroup<T>[] = [];
    const byRound = new Map<string, RoundGroup<T>>();
    for (const match of matches) {
        const round = match.round ?? FALLBACK_ROUND;
        let group = byRound.get(round);
        if (!group) {
            group = { round, matches: [] };
            byRound.set(round, group);
            groups.push(group);
        }
        group.matches.push(match);
    }
    return groups;
}
