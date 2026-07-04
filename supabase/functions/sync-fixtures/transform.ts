// Logique pure de sync-fixtures (Lot 2) : transformation des réponses API-Sports
// en lignes teams/matches. Zéro I/O, zéro global Deno — testé sous Vitest.
import type { TeamMetadata } from '../_shared/team-metadata.ts';
import { findTeamMetadata } from '../_shared/team-metadata.ts';

export type MatchStatus = 'scheduled' | 'in_play' | 'finished' | 'postponed' | 'cancelled';

// Forme minimale d'un match dans la réponse /games (response[])
export type ApiGame = {
    id: number;
    date: string;
    week: string | number | null;
    status: { short: string };
    teams: {
        home: { id: number; name: string } | null;
        away: { id: number; name: string } | null;
    };
};

export type TeamRow = {
    api_team_id: number;
    name: string;
    code: string | null;
    flag_emoji: string | null;
    color: string | null;
};

// Payload d'upsert des matches : STRICTEMENT les colonnes fixtures. Jamais les
// scores, essais ou cotes — l'upsert écrase toutes les colonnes présentes, on
// ne doit pas piétiner la saisie admin ni la capture des cotes.
export type MatchRow = {
    api_game_id: number;
    competition_id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    kickoff_at: string;
    round: string | null;
    status: MatchStatus;
};

const STATUS_BY_API_CODE: Record<string, MatchStatus> = {
    NS: 'scheduled',
    '1H': 'in_play',
    HT: 'in_play',
    '2H': 'in_play',
    ET: 'in_play',
    BT: 'in_play',
    PT: 'in_play',
    FT: 'finished',
    AET: 'finished',
    POST: 'postponed',
    PST: 'postponed',
    CANC: 'cancelled',
};

/** Statut inconnu → 'scheduled' + isUnknown, remonté dans job_runs.detail. */
export function mapApiStatus(short: string): { status: MatchStatus; isUnknown: boolean } {
    const status = STATUS_BY_API_CODE[short];
    return status ? { status, isUnknown: false } : { status: 'scheduled', isUnknown: true };
}

/** Dédoublonne les équipes des matchs et attache le mapping statique par nom. */
export function buildTeamRows(games: ApiGame[]): { rows: TeamRow[]; unmappedTeams: string[] } {
    const byApiId = new Map<number, TeamRow>();
    const unmapped = new Set<string>();
    for (const game of games) {
        for (const team of [game.teams.home, game.teams.away]) {
            if (!team || byApiId.has(team.id)) {
                continue;
            }
            const metadata: TeamMetadata | null = findTeamMetadata(team.name);
            if (!metadata) {
                unmapped.add(team.name);
            }
            byApiId.set(team.id, {
                api_team_id: team.id,
                name: team.name,
                code: metadata?.code ?? null,
                flag_emoji: metadata?.flagEmoji ?? null,
                color: metadata?.color ?? null,
            });
        }
    }
    return { rows: [...byApiId.values()], unmappedTeams: [...unmapped] };
}

export function buildMatchRows(
    games: ApiGame[],
    teamUuidByApiId: Map<number, string>,
    competitionId: string,
): { rows: MatchRow[]; unknownStatuses: string[] } {
    const unknownStatuses = new Set<string>();
    const rows = games.map((game) => {
        const { status, isUnknown } = mapApiStatus(game.status.short);
        if (isUnknown) {
            unknownStatuses.add(game.status.short);
        }
        return {
            api_game_id: game.id,
            competition_id: competitionId,
            home_team_id: game.teams.home
                ? (teamUuidByApiId.get(game.teams.home.id) ?? null)
                : null,
            away_team_id: game.teams.away
                ? (teamUuidByApiId.get(game.teams.away.id) ?? null)
                : null,
            kickoff_at: game.date,
            round: game.week == null ? null : String(game.week),
            status,
        };
    });
    return { rows, unknownStatuses: [...unknownStatuses] };
}

const ODDS_CAPTURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Matchs à venir dans la fenêtre J-7 → kickoff : cibles de la capture des cotes. */
export function selectMatchesForOddsCapture<T extends { kickoff_at: string; status: MatchStatus }>(
    matches: T[],
    now: Date,
): T[] {
    return matches.filter((match) => {
        if (match.status !== 'scheduled') {
            return false;
        }
        const kickoff = new Date(match.kickoff_at).getTime();
        return kickoff > now.getTime() && kickoff <= now.getTime() + ODDS_CAPTURE_WINDOW_MS;
    });
}

// Forme minimale de la réponse /odds?game= (response[])
export type ApiOddsGame = {
    bookmakers: {
        name?: string;
        bets: { name: string; values: { value: string; odd: string }[] }[];
    }[];
};

export type ParsedOdds = { home: number; draw: number; away: number };

/**
 * Premier marché 3 issues (Home/Draw/Away) trouvé chez n'importe quel bookmaker.
 * Repérage par les valeurs plutôt que par le nom du marché (libellés variables).
 */
export function parseOddsResponse(oddsGames: ApiOddsGame[]): ParsedOdds | null {
    for (const oddsGame of oddsGames) {
        for (const bookmaker of oddsGame.bookmakers ?? []) {
            for (const bet of bookmaker.bets ?? []) {
                const byOutcome = new Map(
                    bet.values.map((entry) => [
                        entry.value.trim().toLowerCase(),
                        Number(entry.odd),
                    ]),
                );
                const home = byOutcome.get('home');
                const draw = byOutcome.get('draw');
                const away = byOutcome.get('away');
                if (
                    home !== undefined &&
                    draw !== undefined &&
                    away !== undefined &&
                    Number.isFinite(home) &&
                    Number.isFinite(draw) &&
                    Number.isFinite(away)
                ) {
                    return { home, draw, away };
                }
            }
        }
    }
    return null;
}
