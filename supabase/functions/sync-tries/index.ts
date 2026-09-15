// Import des essais depuis Wikipedia. Appelée par pg_cron toutes les 30 minutes :
// early-exit sans appel HTTP si aucun match terminé n'attend ses essais. Accès
// protégé par x-sync-secret, écriture par la RPC admin_set_match_tries (mêmes
// garde-fous que la saisie manuelle), calcul et contrôles en TS pur (transform.ts).
//
// La passe 2 du scoring n'est pas ici : sync-results reprend d'elle-même tout
// match dont les essais arrivent (sélection C), au tick suivant.
//
// Mode audit (body {"mode":"audit"}) : vise les matchs dont les essais sont DÉJÀ
// saisis, n'écrit rien et renvoie la comparaison Wikipedia / base. Sert à mesurer
// la fiabilité de la source avant de brancher une nouvelle compétition.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
    extractRugbyboxes,
    resolveTries,
    type SourcedBox,
    type TriesCandidate,
} from './transform.ts';

type Competition = { id: string; slug: string; wikipedia_pages: string[] };

type MatchRow = {
    api_game_id: number;
    kickoff_at: string;
    home_score: number | null;
    away_score: number | null;
    home_tries: number | null;
    away_tries: number | null;
    competition_id: string;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
};

// Au-delà, le match reste à la saisie admin : sans borne, un encadré jamais
// rempli ferait appeler Wikipedia toutes les 30 minutes pour toujours.
const LOOKBACK_DAYS = 14;
// Garde-fou d'emballement (régime de croisière : 1 à 3 pages par run)
const MAX_PAGES_PER_RUN = 20;

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
// Politique Wikimedia : User-Agent descriptif avec un contact, sinon blocage
const USER_AGENT = 'TryCast/1.0 (https://www.trycast.fr; contact@trycast.fr)';

const MATCH_COLUMNS =
    'api_game_id, kickoff_at, home_score, away_score, home_tries, away_tries, competition_id, ' +
    'home_team:teams!matches_home_team_id_fkey(code), away_team:teams!matches_away_team_id_fkey(code)';

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }
    if (req.headers.get('x-sync-secret') !== Deno.env.get('SYNC_TRIES_SECRET')) {
        return json({ error: 'unauthorized' }, 401);
    }
    const body = await req.json().catch(() => ({}));
    const audit = body?.mode === 'audit';

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    // Compétitions actives, y compris celles terminées depuis moins de 14 jours :
    // les essais d'une finale arrivent après ends_on.
    const { data: competitions, error: competitionsError } = await admin
        .from('competitions')
        .select('id, slug, wikipedia_pages')
        .eq('is_active', true)
        .gte('ends_on', since.toISOString().slice(0, 10))
        .neq('wikipedia_pages', '{}');
    if (competitionsError) {
        console.error('sync-tries: select competitions', competitionsError.message);
        return json({ error: 'select_competitions_failed' }, 500);
    }
    if (!competitions || competitions.length === 0) {
        return json({ skipped: true }, 200);
    }

    let candidates: MatchRow[];
    try {
        candidates = await selectCandidates(
            admin,
            competitions.map((competition) => competition.id),
            audit,
            since,
        );
    } catch (error) {
        console.error('sync-tries: select matches', errorMessage(error));
        return json({ error: 'select_matches_failed' }, 500);
    }
    if (candidates.length === 0) {
        return json({ skipped: true }, 200);
    }

    const pages = new Map<string, SourcedBox[]>();
    const pageErrors: string[] = [];
    const written: { api_game_id: number; home: number; away: number; revid: number }[] = [];
    const rejected: { api_game_id: number; reason: string }[] = [];
    const disagreements: {
        api_game_id: number;
        base: [number | null, number | null];
        wikipedia: [number, number];
    }[] = [];
    let agreements = 0;

    for (const competition of competitions as Competition[]) {
        const group = candidates.filter((match) => match.competition_id === competition.id);
        if (group.length === 0) {
            continue;
        }

        const boxes: SourcedBox[] = [];
        for (const title of competition.wikipedia_pages) {
            if (!pages.has(title)) {
                if (pages.size >= MAX_PAGES_PER_RUN) {
                    pageErrors.push(`${title}: plafond de ${MAX_PAGES_PER_RUN} pages atteint`);
                    continue;
                }
                try {
                    pages.set(title, await fetchPageBoxes(title));
                } catch (error) {
                    // Une page en échec ne bloque pas les autres
                    pageErrors.push(`${title}: ${errorMessage(error)}`);
                    pages.set(title, []);
                }
            }
            boxes.push(...(pages.get(title) ?? []));
        }

        const resolutions = resolveTries(boxes, group.map(toCandidate));
        for (const resolution of resolutions) {
            if (!resolution.ok) {
                rejected.push({ api_game_id: resolution.api_game_id, reason: resolution.reason });
                continue;
            }
            if (audit) {
                const row = group.find((match) => match.api_game_id === resolution.api_game_id);
                if (
                    row?.home_tries === resolution.home_tries &&
                    row?.away_tries === resolution.away_tries
                ) {
                    agreements += 1;
                } else {
                    disagreements.push({
                        api_game_id: resolution.api_game_id,
                        base: [row?.home_tries ?? null, row?.away_tries ?? null],
                        wikipedia: [resolution.home_tries, resolution.away_tries],
                    });
                }
                continue;
            }
            const { error } = await admin.rpc('admin_set_match_tries', {
                p_api_game_id: resolution.api_game_id,
                p_home_tries: resolution.home_tries,
                p_away_tries: resolution.away_tries,
            });
            if (error) {
                // Un match en échec ne bloque pas les autres (retenté au tick suivant)
                console.error(`sync-tries: écriture ${resolution.api_game_id}`, error.message);
                rejected.push({
                    api_game_id: resolution.api_game_id,
                    reason: `rpc: ${error.message}`,
                });
                continue;
            }
            written.push({
                api_game_id: resolution.api_game_id,
                home: resolution.home_tries,
                away: resolution.away_tries,
                revid: resolution.revid,
            });
        }
    }

    if (audit) {
        return json(
            {
                mode: 'audit',
                matches: candidates.length,
                agreements,
                disagreements,
                rejected,
                page_errors: pageErrors,
            },
            200,
        );
    }

    // job_runs ne trace que les runs utiles : un encadré pas encore rempli
    // (not_found) se retente en silence, le reste mérite une ligne.
    const noteworthy =
        written.length > 0 ||
        pageErrors.length > 0 ||
        rejected.some((entry) => entry.reason !== 'not_found');
    if (noteworthy) {
        const { error } = await admin.from('job_runs').insert({
            job: 'sync-tries',
            status: pageErrors.length === 0 ? 'success' : 'error',
            finished_at: new Date().toISOString(),
            api_calls_used: pages.size,
            detail: {
                written,
                rejected,
                ...(pageErrors.length > 0 ? { errors: pageErrors } : {}),
            },
        });
        if (error) {
            console.error('sync-tries: job_runs insert failed', error.message);
        }
    }

    return json({ success: true, written: written.length, rejected: rejected.length }, 200);
});

/** Matchs terminés en attente d'essais (ou, en audit, déjà pourvus). */
async function selectCandidates(
    admin: SupabaseClient,
    competitionIds: string[],
    audit: boolean,
    since: Date,
): Promise<MatchRow[]> {
    let query = admin
        .from('matches')
        .select(MATCH_COLUMNS)
        .in('competition_id', competitionIds)
        .eq('status', 'finished')
        .eq('needs_review', false)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);
    query = audit
        ? query.not('home_tries', 'is', null).not('away_tries', 'is', null)
        : query.eq('tries_missing', true).gte('kickoff_at', since.toISOString());
    const { data, error } = await query;
    if (error) {
        throw new Error(error.message);
    }
    return (data ?? []) as unknown as MatchRow[];
}

function toCandidate(match: MatchRow): TriesCandidate {
    return {
        api_game_id: match.api_game_id,
        kickoff_at: match.kickoff_at,
        home_code: match.home_team?.code ?? null,
        away_code: match.away_team?.code ?? null,
        home_score: match.home_score ?? 0,
        away_score: match.away_score ?? 0,
    };
}

/** Wikitext d'une page par l'API MediaWiki, découpé en encadrés. */
async function fetchPageBoxes(title: string): Promise<SourcedBox[]> {
    const params = new URLSearchParams({
        action: 'parse',
        page: title,
        prop: 'wikitext|revid',
        redirects: '1',
        format: 'json',
        formatversion: '2',
        maxlag: '5',
    });
    const response = await fetch(`${WIKIPEDIA_API}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
        throw new Error(`http_${response.status}`);
    }
    const payload = (await response.json()) as {
        parse?: { wikitext?: string; revid?: number };
        error?: { code?: string };
    };
    if (payload.error || !payload.parse?.wikitext) {
        throw new Error(`api_${payload.error?.code ?? 'empty'}`);
    }
    const revid = payload.parse.revid ?? 0;
    return extractRugbyboxes(payload.parse.wikitext).map((box) => ({ box, revid }));
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
