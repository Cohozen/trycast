// Synchronisation quotidienne des fixtures + cotes Highlightly (Lot 2).
// Appelée par pg_cron (pas d'utilisateur) : accès protégé par le secret partagé
// x-sync-secret, écritures via la service_role key. Chaque run est tracé dans
// job_runs (statut + budget API — plan Highlightly Pro : 7 500 req/jour).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { fetchAllMatches, fetchOdds } from '../_shared/highlightly.ts';
import {
    buildMatchRows,
    buildTeamRows,
    parseOddsResponse,
    selectMatchesForOddsCapture,
} from './transform.ts';

type CompetitionSummary = {
    slug: string;
    games?: number;
    teams_upserted?: number;
    odds_captured?: number;
    odds_error?: string;
    error?: string;
};

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }
    if (req.headers.get('x-sync-secret') !== Deno.env.get('SYNC_FIXTURES_SECRET')) {
        return json({ error: 'unauthorized' }, 401);
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: run, error: runError } = await admin
        .from('job_runs')
        .insert({ job: 'sync-fixtures' })
        .select('id')
        .single();
    if (runError || !run) {
        console.error('sync-fixtures: job_runs insert failed', runError?.message);
        return json({ error: 'job_run_insert_failed' }, 500);
    }

    const state = {
        apiCalls: 0,
        summaries: [] as CompetitionSummary[],
        unmappedTeams: new Set<string>(),
        unknownStatuses: new Set<string>(),
    };

    try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: competitions, error: competitionsError } = await admin
            .from('competitions')
            .select('id, slug, api_league_id, api_season')
            .eq('is_active', true)
            .gte('ends_on', today);
        if (competitionsError) {
            throw new Error(`select competitions: ${competitionsError.message}`);
        }

        for (const competition of competitions ?? []) {
            // Une compétition en échec ne bloque pas les autres
            try {
                await syncCompetition(admin, competition, state);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`sync-fixtures: ${competition.slug} failed`, message);
                state.summaries.push({ slug: competition.slug, error: message });
            }
        }

        await finishRun(admin, run.id, 'success', state);
        return json({ success: true, api_calls_used: state.apiCalls }, 200);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('sync-fixtures failed', message);
        await finishRun(admin, run.id, 'error', state, message);
        return json({ error: 'sync_failed' }, 500);
    }
});

async function syncCompetition(
    admin: SupabaseClient,
    competition: { id: string; slug: string; api_league_id: number; api_season: number },
    state: {
        apiCalls: number;
        summaries: CompetitionSummary[];
        unmappedTeams: Set<string>;
        unknownStatuses: Set<string>;
    },
): Promise<void> {
    const matches = await fetchAllMatches(competition.api_league_id, competition.api_season, state);

    const { rows: teamRows, unmappedTeams } = buildTeamRows(matches);
    for (const name of unmappedTeams) {
        state.unmappedTeams.add(name);
    }
    if (teamRows.length > 0) {
        const { error } = await admin.from('teams').upsert(teamRows, { onConflict: 'api_team_id' });
        if (error) {
            throw new Error(`upsert teams: ${error.message}`);
        }
    }

    // Map api_team_id → uuid via un select explicite (plus fiable que le retour d'upsert)
    const { data: teams, error: teamsError } = await admin
        .from('teams')
        .select('id, api_team_id')
        .in(
            'api_team_id',
            teamRows.map((team) => team.api_team_id),
        );
    if (teamsError) {
        throw new Error(`select teams: ${teamsError.message}`);
    }
    const teamUuidByApiId = new Map<number, string>(
        (teams ?? []).map((team) => [team.api_team_id, team.id]),
    );

    const { rows: matchRows, unknownStatuses } = buildMatchRows(
        matches,
        teamUuidByApiId,
        competition.id,
    );
    for (const description of unknownStatuses) {
        state.unknownStatuses.add(description);
    }
    if (matchRows.length > 0) {
        const { error } = await admin
            .from('matches')
            .upsert(matchRows, { onConflict: 'api_game_id' });
        if (error) {
            throw new Error(`upsert matches: ${error.message}`);
        }
    }

    // Cotes des matchs à J-7 → kickoff : chaque run réécrit, la dernière capture
    // avant le coup d'envoi fait foi pour le scoring. Best-effort : un échec de
    // cotes ne bloque jamais les fixtures (le scoring a un fallback cote 2.0).
    let oddsCaptured = 0;
    let oddsError: string | undefined;
    for (const match of selectMatchesForOddsCapture(matchRows, new Date())) {
        try {
            const markets = await fetchOdds(match.api_game_id, state);
            const odds = parseOddsResponse(markets);
            if (!odds) {
                continue;
            }
            const { error } = await admin
                .from('matches')
                .update({
                    odds_home: odds.home,
                    odds_draw: odds.draw,
                    odds_away: odds.away,
                    odds_source: 'api',
                    odds_captured_at: new Date().toISOString(),
                })
                .eq('api_game_id', match.api_game_id);
            if (error) {
                throw new Error(`update odds ${match.api_game_id}: ${error.message}`);
            }
            oddsCaptured += 1;
        } catch (error) {
            oddsError = error instanceof Error ? error.message : String(error);
            console.error(`sync-fixtures: odds ${match.api_game_id} failed`, oddsError);
            // 401 = restriction de plan : inutile d'insister sur les autres matchs
            if (oddsError.includes('api_http_401')) {
                break;
            }
        }
    }

    state.summaries.push({
        slug: competition.slug,
        games: matches.length,
        teams_upserted: teamRows.length,
        odds_captured: oddsCaptured,
        ...(oddsError ? { odds_error: oddsError } : {}),
    });
}

async function finishRun(
    admin: SupabaseClient,
    runId: string,
    status: 'success' | 'error',
    state: {
        apiCalls: number;
        summaries: CompetitionSummary[];
        unmappedTeams: Set<string>;
        unknownStatuses: Set<string>;
    },
    errorMessage?: string,
): Promise<void> {
    const { error } = await admin
        .from('job_runs')
        .update({
            status,
            finished_at: new Date().toISOString(),
            api_calls_used: state.apiCalls,
            detail: {
                competitions: state.summaries,
                unmapped_teams: [...state.unmappedTeams],
                unknown_statuses: [...state.unknownStatuses],
                ...(errorMessage ? { error: errorMessage } : {}),
            },
        })
        .eq('id', runId);
    if (error) {
        console.error('sync-fixtures: job_runs update failed', error.message);
    }
}

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
