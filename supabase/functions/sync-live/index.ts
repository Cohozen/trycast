// Score en direct (carte LIVE de l'accueil Matchs). Cron dédié, plus fréquent
// que sync-results : early-exit sans appel API si aucun match dans la fenêtre
// live (kickoff → +3 h, non terminé). N'écrit QUE les colonnes live_* — jamais
// status/home_score, réservés à sync-results (déclencheurs du scoring). Accès
// protégé par x-sync-secret, écritures via la service_role key.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { fetchAllMatches } from '../_shared/highlightly.ts';
import { buildLiveUpdates, type LiveWindowMatch } from './transform.ts';

type Competition = { id: string; slug: string; api_league_id: number; api_season: number };

// Un match reste dans la fenêtre live 3 h après le coup d'envoi (rugby ~100 min
// + prolongations/arrêts) ; au-delà, sync-results a écrit le résultat final.
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }
    if (req.headers.get('x-sync-secret') !== Deno.env.get('SYNC_LIVE_SECRET')) {
        return json({ error: 'unauthorized' }, 401);
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const today = new Date().toISOString().slice(0, 10);
    const { data: competitions, error: competitionsError } = await admin
        .from('competitions')
        .select('id, slug, api_league_id, api_season')
        .eq('is_active', true)
        .gte('ends_on', today);
    if (competitionsError) {
        console.error('sync-live: select competitions', competitionsError.message);
        return json({ error: 'select_competitions_failed' }, 500);
    }
    const competitionIds = (competitions ?? []).map((competition) => competition.id);
    if (competitionIds.length === 0) {
        return json({ skipped: true }, 200);
    }

    const now = Date.now();
    const { data: windowMatches, error: windowError } = await admin
        .from('matches')
        .select('id, api_game_id, competition_id')
        .in('competition_id', competitionIds)
        .in('status', ['scheduled', 'in_play'])
        .gte('kickoff_at', new Date(now - LIVE_WINDOW_MS).toISOString())
        .lte('kickoff_at', new Date(now).toISOString())
        .eq('needs_review', false);
    if (windowError) {
        console.error('sync-live: select window matches', windowError.message);
        return json({ error: 'select_window_failed' }, 500);
    }
    if (!windowMatches || windowMatches.length === 0) {
        return json({ skipped: true }, 200);
    }

    const { data: run, error: runError } = await admin
        .from('job_runs')
        .insert({ job: 'sync-live' })
        .select('id')
        .single();
    if (runError || !run) {
        console.error('sync-live: job_runs insert failed', runError?.message);
        return json({ error: 'job_run_insert_failed' }, 500);
    }

    const state = { apiCalls: 0 };
    const errors: string[] = [];
    let liveUpdated = 0;

    const byCompetition = new Map<string, LiveWindowMatch[]>();
    for (const match of windowMatches) {
        const group = byCompetition.get(match.competition_id) ?? [];
        group.push(match);
        byCompetition.set(match.competition_id, group);
    }

    for (const competition of competitions ?? []) {
        const group = byCompetition.get(competition.id);
        if (!group || group.length === 0) {
            continue;
        }
        // Une compétition en échec ne bloque pas les autres.
        try {
            const apiMatches = await fetchAllMatches(
                competition.api_league_id,
                competition.api_season,
                state,
            );
            const updates = buildLiveUpdates(group, apiMatches);
            const stamp = new Date().toISOString();
            for (const update of updates) {
                const { api_game_id, ...columns } = update;
                const { error } = await admin
                    .from('matches')
                    .update({ ...columns, live_updated_at: stamp })
                    .eq('api_game_id', api_game_id);
                if (error) {
                    throw new Error(`update live match ${api_game_id}: ${error.message}`);
                }
                liveUpdated += 1;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`sync-live: ${competition.slug} failed`, message);
            errors.push(`${competition.slug}: ${message}`);
        }
    }

    await finishRun(admin, run.id, errors.length === 0 ? 'success' : 'error', {
        apiCalls: state.apiCalls,
        liveUpdated,
        errors,
    });
    return json({ success: true, live_updated: liveUpdated, api_calls_used: state.apiCalls }, 200);
});

async function finishRun(
    admin: SupabaseClient,
    runId: string,
    status: 'success' | 'error',
    detail: { apiCalls: number; liveUpdated: number; errors: string[] },
): Promise<void> {
    const { error } = await admin
        .from('job_runs')
        .update({
            status,
            finished_at: new Date().toISOString(),
            api_calls_used: detail.apiCalls,
            detail: {
                live_updated: detail.liveUpdated,
                ...(detail.errors.length > 0 ? { errors: detail.errors } : {}),
            },
        })
        .eq('id', runId);
    if (error) {
        console.error('sync-live: job_runs update failed', error.message);
    }
}

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
