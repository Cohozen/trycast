import type { LeagueRoundPointsRow, StageKind } from './types';

/**
 * Le typegen Supabase ne connaît pas la nullabilité des colonnes d'un
 * RETURNS TABLE (tout sort `string`) : round, stage_key, stage_kind et
 * avatar_url sont pourtant nullables en base. On élargit ici —
 * LeagueRoundPointsRow y reste assignable.
 */
export type RoundPointsInputRow = Omit<
    LeagueRoundPointsRow,
    'round' | 'stage_key' | 'stage_kind' | 'avatar_url'
> & {
    round: string | null;
    stage_key?: string | null;
    stage_kind?: string | null;
    avatar_url: string | null;
};

/** Une journée (ou étape à élimination directe) entamée : ses membres classés. */
export type LeagueRound = {
    /** Clé du groupe, partagée avec la bande (roundGroupKey). */
    key: string;
    /** Libellé brut du round (`matches.round`), null si non renseigné ou étape. */
    round: string | null;
    /** Nature de l'étape, null pour une journée de poule. */
    stageKind: StageKind | null;
    /** Premier kickoff du groupe (ordre chronologique, ISO). */
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
 * Clé d'un groupe de matchs de l'onglet Résultats : l'étape à élimination
 * directe si le match en relève (competition_stages), sinon le round brut.
 */
export function roundGroupKey(round: string | null, stageKey?: string | null): string {
    if (stageKey) return `stage:${stageKey}`;
    return round ?? 'sans-round';
}

/**
 * Regroupe les lignes plates de get_league_round_points en journées/étapes
 * classées, dans l'ordre chronologique (first_kickoff — jamais alphabétique :
 * « 10 » < « 2 »). Le rang réplique la logique des leaderboards : points desc
 * puis scores exacts desc, égalité complète = même rang.
 */
export function groupRoundPoints(rows: readonly RoundPointsInputRow[]): LeagueRound[] {
    const byKey = new Map<string, LeagueRound>();

    for (const row of rows) {
        const key = roundGroupKey(row.round, row.stage_key);
        let round = byKey.get(key);
        if (!round) {
            round = {
                key,
                round: row.stage_key ? null : row.round,
                stageKind: row.stage_key ? ((row.stage_kind as StageKind | null) ?? null) : null,
                firstKickoff: row.first_kickoff,
                entries: [],
            };
            byKey.set(key, round);
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

    const rounds = [...byKey.values()].sort((a, b) => a.firstKickoff.localeCompare(b.firstKickoff));
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
