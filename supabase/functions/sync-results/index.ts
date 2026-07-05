// Récupération des résultats + scoring en 2 passes (Lot 4). Appelée par
// pg_cron toutes les 10 minutes : early-exit sans écriture ni appel API si
// aucun match actionnable (la santé du cron se lit dans cron.job_run_details,
// job_runs ne trace que les runs utiles). Accès protégé par x-sync-secret,
// écritures via la service_role key, calcul des points en TS pur
// (_shared/scoring) et écriture atomique via la RPC apply_match_scores.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { fetchAllMatches } from '../_shared/highlightly.ts';
import type { ScoringRules } from '../_shared/scoring/types.ts';
import {
    buildResultUpdates,
    buildScoringPayload,
    parseScoringRules,
    partitionActionableMatches,
    type ActionableMatch,
} from './transform.ts';

type Competition = { id: string; slug: string; api_league_id: number; api_season: number };

type RunState = {
    apiCalls: number;
    resultsUpdated: number;
    needsReviewFlagged: number;
    scoredPass1: number;
    scoredPass2: number;
    unknownStatuses: string[];
    errors: string[];
};

// Colonnes de la sélection A (matchs en attente de résultat)
const ACTIONABLE_COLUMNS = 'id, api_game_id, kickoff_at, status, home_tries, competition_id';

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }
    if (req.headers.get('x-sync-secret') !== Deno.env.get('SYNC_RESULTS_SECRET')) {
        return json({ error: 'unauthorized' }, 401);
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Compétitions actives : tout le reste (sélections A/B/C incluses) est
    // restreint à leurs matchs — les compétitions inactives (dont le seed E2E)
    // sont invisibles du cron.
    const today = new Date().toISOString().slice(0, 10);
    const { data: competitions, error: competitionsError } = await admin
        .from('competitions')
        .select('id, slug, api_league_id, api_season')
        .eq('is_active', true)
        .gte('ends_on', today);
    if (competitionsError) {
        console.error('sync-results: select competitions', competitionsError.message);
        return json({ error: 'select_competitions_failed' }, 500);
    }
    const competitionIds = (competitions ?? []).map((competition) => competition.id);
    if (competitionIds.length === 0) {
        return json({ skipped: true }, 200);
    }

    const [actionable, pass1Ids, pass2Ids] = await Promise.all([
        selectActionableMatches(admin, competitionIds),
        selectPass1MatchIds(admin, competitionIds),
        selectPass2MatchIds(admin, competitionIds),
    ]);
    if (actionable.length === 0 && pass1Ids.length === 0 && pass2Ids.length === 0) {
        return json({ skipped: true }, 200);
    }

    const { data: run, error: runError } = await admin
        .from('job_runs')
        .insert({ job: 'sync-results' })
        .select('id')
        .single();
    if (runError || !run) {
        console.error('sync-results: job_runs insert failed', runError?.message);
        return json({ error: 'job_run_insert_failed' }, 500);
    }

    const state: RunState = {
        apiCalls: 0,
        resultsUpdated: 0,
        needsReviewFlagged: 0,
        scoredPass1: 0,
        scoredPass2: 0,
        unknownStatuses: [],
        errors: [],
    };

    try {
        await syncResults(admin, competitions ?? [], actionable, state);

        // Barème actif : indispensable pour scorer, chargé une fois par run
        const { data: activeRule, error: ruleError } = await admin
            .from('scoring_rules')
            .select('version, rules')
            .eq('is_active', true)
            .single();
        if (ruleError || !activeRule) {
            throw new Error(`select scoring_rules: ${ruleError?.message ?? 'aucun barème actif'}`);
        }
        const rules = parseScoringRules(activeRule.rules);

        // Passe 1 re-sélectionnée : les scores viennent d'être écrits
        const freshPass1Ids = await selectPass1MatchIds(admin, competitionIds);
        for (const matchId of freshPass1Ids) {
            await scoreMatch(admin, matchId, rules, state, 'pass1');
        }
        for (const matchId of pass2Ids) {
            await scoreMatch(admin, matchId, rules, state, 'pass2');
        }

        await finishRun(admin, run.id, state.errors.length === 0 ? 'success' : 'error', state);
        return json({ success: true, api_calls_used: state.apiCalls }, 200);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('sync-results failed', message);
        state.errors.push(message);
        await finishRun(admin, run.id, 'error', state);
        return json({ error: 'sync_failed' }, 500);
    }
});

/** Sélection A : matchs des compétitions actives en attente de résultat. */
async function selectActionableMatches(
    admin: SupabaseClient,
    competitionIds: string[],
): Promise<(ActionableMatch & { id: string; competition_id: string })[]> {
    // Inclut les matchs déjà 'finished' sans score : sync-fixtures écrit les
    // statuts mais jamais les scores, ils doivent être rattrapés ici.
    const { data, error } = await admin
        .from('matches')
        .select(ACTIONABLE_COLUMNS)
        .in('competition_id', competitionIds)
        .lte('kickoff_at', new Date().toISOString())
        .or('status.in.(scheduled,in_play),and(status.eq.finished,home_score.is.null)')
        .eq('needs_review', false);
    if (error) {
        throw new Error(`select matchs actionnables: ${error.message}`);
    }
    return data ?? [];
}

/** Sélection B : matchs finis avec score, jamais scorés. */
async function selectPass1MatchIds(
    admin: SupabaseClient,
    competitionIds: string[],
): Promise<string[]> {
    const { data, error } = await admin
        .from('matches')
        .select('id')
        .in('competition_id', competitionIds)
        .eq('status', 'finished')
        .not('home_score', 'is', null)
        .is('scored_at', null)
        .eq('needs_review', false);
    if (error) {
        throw new Error(`select passe 1: ${error.message}`);
    }
    return (data ?? []).map((row) => row.id);
}

/**
 * Sélection C : matchs scorés dont les essais sont arrivés depuis (saisie
 * admin) et où au moins un prono attend son bonus offensif. Auto-extincteur :
 * le re-scoring éteint offensiveBonusPending.
 */
async function selectPass2MatchIds(
    admin: SupabaseClient,
    competitionIds: string[],
): Promise<string[]> {
    const { data, error } = await admin
        .from('predictions')
        .select('match_id, matches!inner(id)')
        .eq('points_breakdown->>offensiveBonusPending', 'true')
        .in('matches.competition_id', competitionIds)
        .eq('matches.status', 'finished')
        .eq('matches.needs_review', false)
        .not('matches.scored_at', 'is', null)
        .not('matches.home_tries', 'is', null)
        .not('matches.away_tries', 'is', null);
    if (error) {
        throw new Error(`select passe 2: ${error.message}`);
    }
    return [...new Set((data ?? []).map((row) => row.match_id))];
}

/** Récupère les résultats API des matchs actionnables et met la table à jour. */
async function syncResults(
    admin: SupabaseClient,
    competitions: Competition[],
    actionable: (ActionableMatch & { id: string; competition_id: string })[],
    state: RunState,
): Promise<void> {
    const { fresh, stale } = partitionActionableMatches(actionable, new Date());

    // Hors fenêtre de 48 h sans résultat : anomalie → revue admin, plus
    // d'appel API pour ces matchs (déblocage manuel : needs_review = false)
    if (stale.length > 0) {
        const { error } = await admin
            .from('matches')
            .update({ needs_review: true })
            .in(
                'id',
                stale.map((match) => match.id),
            );
        if (error) {
            throw new Error(`update needs_review: ${error.message}`);
        }
        state.needsReviewFlagged = stale.length;
    }

    const byCompetition = new Map<string, typeof fresh>();
    for (const match of fresh) {
        const group = byCompetition.get(match.competition_id) ?? [];
        group.push(match);
        byCompetition.set(match.competition_id, group);
    }

    for (const competition of competitions) {
        const group = byCompetition.get(competition.id);
        if (!group || group.length === 0) {
            continue;
        }
        // Une compétition en échec ne bloque pas les autres
        try {
            const apiMatches = await fetchAllMatches(
                competition.api_league_id,
                competition.api_season,
                state,
            );
            const { updates, unknownStatuses } = buildResultUpdates(
                group,
                apiMatches,
                state.unknownStatuses,
            );
            state.unknownStatuses = unknownStatuses;
            for (const update of updates) {
                const { api_game_id, ...columns } = update;
                const { error } = await admin
                    .from('matches')
                    .update(columns)
                    .eq('api_game_id', api_game_id);
                if (error) {
                    throw new Error(`update match ${api_game_id}: ${error.message}`);
                }
                state.resultsUpdated += 1;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`sync-results: ${competition.slug} failed`, message);
            state.errors.push(`${competition.slug}: ${message}`);
        }
    }
}

/** Calcule et écrit les points de tous les pronos d'un match (passe 1 ou 2). */
async function scoreMatch(
    admin: SupabaseClient,
    matchId: string,
    rules: ScoringRules,
    state: RunState,
    pass: 'pass1' | 'pass2',
): Promise<void> {
    // Un match en échec ne bloque pas les autres (retenté au tick suivant)
    try {
        const { data: match, error: matchError } = await admin
            .from('matches')
            .select(
                'home_score, away_score, home_tries, away_tries, odds_home, odds_draw, odds_away',
            )
            .eq('id', matchId)
            .single();
        if (matchError || !match) {
            throw new Error(`select match: ${matchError?.message ?? 'introuvable'}`);
        }
        if (match.home_score === null || match.away_score === null) {
            throw new Error('score final manquant');
        }

        const { data: predictions, error: predictionsError } = await admin
            .from('predictions')
            .select(
                'id, predicted_home_score, predicted_away_score, predicted_bonus_off_home, predicted_bonus_off_away',
            )
            .eq('match_id', matchId);
        if (predictionsError) {
            throw new Error(`select predictions: ${predictionsError.message}`);
        }

        const payload = buildScoringPayload(
            { ...match, home_score: match.home_score, away_score: match.away_score },
            predictions ?? [],
            rules,
        );
        const { error: rpcError } = await admin.rpc('apply_match_scores', {
            p_match_id: matchId,
            p_rule_version: rules.version,
            p_predictions: payload,
        });
        if (rpcError) {
            throw new Error(`apply_match_scores: ${rpcError.message}`);
        }
        if (pass === 'pass1') {
            state.scoredPass1 += 1;
        } else {
            state.scoredPass2 += 1;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`sync-results: scoring ${matchId} (${pass}) failed`, message);
        state.errors.push(`scoring ${matchId} (${pass}): ${message}`);
    }
}

async function finishRun(
    admin: SupabaseClient,
    runId: string,
    status: 'success' | 'error',
    state: RunState,
): Promise<void> {
    const { error } = await admin
        .from('job_runs')
        .update({
            status,
            finished_at: new Date().toISOString(),
            api_calls_used: state.apiCalls,
            detail: {
                results_updated: state.resultsUpdated,
                needs_review_flagged: state.needsReviewFlagged,
                matches_scored_pass1: state.scoredPass1,
                matches_scored_pass2: state.scoredPass2,
                unknown_statuses: state.unknownStatuses,
                ...(state.errors.length > 0 ? { errors: state.errors } : {}),
            },
        })
        .eq('id', runId);
    if (error) {
        console.error('sync-results: job_runs update failed', error.message);
    }
}

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
