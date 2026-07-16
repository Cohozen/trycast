import type { LeagueRoundPointsRow } from './types';

/**
 * Le typegen Supabase ne connaît pas la nullabilité des colonnes d'un
 * RETURNS TABLE (tout sort `string`) : round et avatar_url sont pourtant
 * nullables en base. On élargit ici — LeagueRoundPointsRow y reste assignable.
 */
export type RoundPointsInputRow = Omit<LeagueRoundPointsRow, 'round' | 'avatar_url'> & {
    round: string | null;
    avatar_url: string | null;
};

/** Une journée entamée : ses membres classés (points > exacts, ex æquo). */
export type LeagueRound = {
    /** Libellé brut du round (`matches.round`), null si non renseigné. */
    round: string | null;
    /** Premier kickoff de la journée (ordre chronologique, ISO). */
    firstKickoff: string;
    entries: LeagueRoundEntry[];
};

export type LeagueRoundEntry = {
    /** Rang dans la journée — les ex æquo partagent leur rang (rank(), pas dense). */
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    points: number;
    exactScores: number;
};

/**
 * Regroupe les lignes plates de get_league_round_points en journées classées,
 * dans l'ordre chronologique (first_kickoff — jamais alphabétique : « 10 » <
 * « 2 »). Le rang réplique la logique des leaderboards : points desc puis
 * scores exacts desc, égalité complète = même rang.
 */
export function groupRoundPoints(rows: readonly RoundPointsInputRow[]): LeagueRound[] {
    const byRound = new Map<string | null, LeagueRound>();

    for (const row of rows) {
        let round = byRound.get(row.round);
        if (!round) {
            round = { round: row.round, firstKickoff: row.first_kickoff, entries: [] };
            byRound.set(row.round, round);
        }
        round.entries.push({
            rank: 0,
            userId: row.user_id,
            username: row.username,
            avatarUrl: row.avatar_url,
            points: row.points,
            exactScores: row.exact_scores,
        });
    }

    const rounds = [...byRound.values()].sort((a, b) =>
        a.firstKickoff.localeCompare(b.firstKickoff),
    );
    for (const round of rounds) {
        round.entries.sort(
            (a, b) =>
                b.points - a.points ||
                b.exactScores - a.exactScores ||
                a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
        );
        round.entries.forEach((entry, i) => {
            const prev = round.entries[i - 1];
            entry.rank =
                prev && prev.points === entry.points && prev.exactScores === entry.exactScores
                    ? prev.rank
                    : i + 1;
        });
    }
    return rounds;
}
