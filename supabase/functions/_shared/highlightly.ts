// Client Highlightly partagé entre les Edge Functions (I/O : fetch + env Deno).
// Le budget d'appels est porté par l'appelant (state.apiCalls, tracé dans
// job_runs) : garde-fou par run, bien au-delà du régime de croisière — protège
// d'un emballement (boucle de pagination, etc.).
import type { ApiMatch, ApiOddsMarket } from '../sync-fixtures/transform.ts';

const API_BASE = 'https://rugby.highlightly.net';
const PAGE_SIZE = 100;
export const MAX_API_CALLS_PER_RUN = 20;

export type ApiBudget = { apiCalls: number };

export async function fetchApi<T>(path: string, state: ApiBudget): Promise<T> {
    if (state.apiCalls >= MAX_API_CALLS_PER_RUN) {
        throw new Error(`api_budget_exceeded (${MAX_API_CALLS_PER_RUN} appels/run)`);
    }
    state.apiCalls += 1;

    const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'x-rapidapi-key': Deno.env.get('HIGHLIGHTLY_API_KEY')! },
    });
    if (!response.ok) {
        const detail = (await response.text()).slice(0, 200);
        throw new Error(`api_http_${response.status} on ${path}: ${detail}`);
    }
    return (await response.json()) as T;
}

/** GET /matches paginé (offset/limit) : toutes les pages de la ligue × saison. */
export async function fetchAllMatches(
    leagueId: number,
    season: number,
    state: ApiBudget,
): Promise<ApiMatch[]> {
    const all: ApiMatch[] = [];
    let offset = 0;
    while (true) {
        const body = await fetchApi<{
            data?: ApiMatch[];
            pagination?: { totalCount?: number };
        }>(
            `/matches?leagueId=${leagueId}&season=${season}&limit=${PAGE_SIZE}&offset=${offset}`,
            state,
        );
        const page = body.data ?? [];
        all.push(...page);
        const totalCount = body.pagination?.totalCount ?? all.length;
        offset += PAGE_SIZE;
        if (page.length < PAGE_SIZE || all.length >= totalCount) {
            return all;
        }
    }
}

/** GET /odds?matchId= : marchés prematch à plat (tous bookmakers). */
export async function fetchOdds(matchId: number, state: ApiBudget): Promise<ApiOddsMarket[]> {
    const body = await fetchApi<{
        odds?: ApiOddsMarket[];
        data?: { odds?: ApiOddsMarket[] }[];
    }>(`/odds?matchId=${matchId}&oddsType=prematch`, state);
    if (Array.isArray(body.odds)) {
        return body.odds;
    }
    // Tolère une réponse enveloppée en liste (un objet par match)
    return (body.data ?? []).flatMap((entry) => entry.odds ?? []);
}
