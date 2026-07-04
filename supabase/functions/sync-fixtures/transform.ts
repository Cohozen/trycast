// Logique pure de sync-fixtures (Lot 2) : transformation des réponses Highlightly
// en lignes teams/matches. Zéro I/O, zéro global Deno — testé sous Vitest.
// Source : API rugby Highlightly (rugby.highlightly.net) — bascule depuis
// API-Sports le 2026-07-04 (free tier limité aux saisons 2022-2024).
import type { TeamMetadata } from '../_shared/team-metadata.ts';
import { findTeamMetadata } from '../_shared/team-metadata.ts';

export type MatchStatus = 'scheduled' | 'in_play' | 'finished' | 'postponed' | 'cancelled';

// Forme minimale d'un match dans la réponse GET /matches (data[])
export type ApiMatch = {
    id: number;
    date: string;
    week: string | number | null;
    state: { description: string };
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
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

// Highlightly décrit l'état par un libellé (state.description), pas un code
const STATUS_BY_STATE_DESCRIPTION: Record<string, MatchStatus> = {
    'not started': 'scheduled',
    'to be announced': 'scheduled',
    'first half': 'in_play',
    'half time': 'in_play',
    'second half': 'in_play',
    'extra time': 'in_play',
    'break time': 'in_play',
    penalties: 'in_play',
    interrupted: 'in_play',
    suspended: 'in_play',
    finished: 'finished',
    'finished after extra time': 'finished',
    awarded: 'finished',
    postponed: 'postponed',
    cancelled: 'cancelled',
    abandoned: 'cancelled',
};

/** État inconnu → 'scheduled' + isUnknown, remonté dans job_runs.detail. */
export function mapApiStatus(stateDescription: string): {
    status: MatchStatus;
    isUnknown: boolean;
} {
    const status = STATUS_BY_STATE_DESCRIPTION[stateDescription.trim().toLowerCase()];
    return status ? { status, isUnknown: false } : { status: 'scheduled', isUnknown: true };
}

/** Dédoublonne les équipes des matchs et attache le mapping statique par nom. */
export function buildTeamRows(matches: ApiMatch[]): { rows: TeamRow[]; unmappedTeams: string[] } {
    const byApiId = new Map<number, TeamRow>();
    const unmapped = new Set<string>();
    for (const match of matches) {
        for (const team of [match.homeTeam, match.awayTeam]) {
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
    matches: ApiMatch[],
    teamUuidByApiId: Map<number, string>,
    competitionId: string,
): { rows: MatchRow[]; unknownStatuses: string[] } {
    const unknownStatuses = new Set<string>();
    const rows = matches.map((match) => {
        const { status, isUnknown } = mapApiStatus(match.state.description);
        if (isUnknown) {
            unknownStatuses.add(match.state.description);
        }
        return {
            api_game_id: match.id,
            competition_id: competitionId,
            home_team_id: match.homeTeam ? (teamUuidByApiId.get(match.homeTeam.id) ?? null) : null,
            away_team_id: match.awayTeam ? (teamUuidByApiId.get(match.awayTeam.id) ?? null) : null,
            kickoff_at: match.date,
            round: match.week == null ? null : String(match.week),
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

// Forme minimale de la réponse GET /odds?matchId= : marchés à plat, tous
// bookmakers confondus (champ `odds` de l'objet réponse)
export type ApiOddsMarket = {
    bookmakerName?: string;
    type?: string;
    market: string;
    values: { value: string; odd: number | string }[];
};

export type ParsedOdds = { home: number; draw: number; away: number };

/**
 * Premier marché 3 issues complet (Home/Draw/Away) — nominalement
 * « Full Time Result ». Repérage par les valeurs plutôt que par le libellé du
 * marché, pour tolérer ses variations.
 */
export function parseOddsResponse(markets: ApiOddsMarket[]): ParsedOdds | null {
    for (const market of markets) {
        const byOutcome = new Map(
            market.values.map((entry) => [entry.value.trim().toLowerCase(), Number(entry.odd)]),
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
    return null;
}
