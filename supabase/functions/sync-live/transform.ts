// Logique pure de sync-live : croisement des matchs de la fenêtre live avec la
// réponse Highlightly. Zéro I/O, zéro global Deno — testé sous Vitest.
import type { ApiMatch } from '../sync-fixtures/transform.ts';
import { mapApiStatus } from '../sync-fixtures/transform.ts';

/** Colonnes lues sur un match de la fenêtre live (kickoff → +3 h, non terminé). */
export type LiveWindowMatch = {
    id: string;
    api_game_id: number;
    competition_id: string;
};

/** Update des seules colonnes live_* (jamais status/home_score). */
export type LiveUpdate = {
    api_game_id: number;
    live_home_score: number;
    live_away_score: number;
    live_period: string;
};

/**
 * Score in-play depuis state.score ("34 - 32", home - away). null si absent ou
 * malformé (clé FREE renvoyait null : pas d'écriture, retenté au tick suivant).
 */
export function parseLiveScore(
    raw: string | null | undefined,
): { home: number; away: number } | null {
    if (typeof raw !== 'string') {
        return null;
    }
    const parts = raw.split('-');
    if (parts.length !== 2) {
        return null;
    }
    const home = Number(parts[0].trim());
    const away = Number(parts[1].trim());
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        return null;
    }
    return { home, away };
}

/**
 * Ne retient que les matchs réellement in_play (state.description mappé) au
 * score parsable. Un match passé finished est ignoré ici : c'est sync-results
 * qui écrit le score final (home_score, déclencheur du scoring) — sync-live ne
 * touche jamais à ces colonnes.
 */
export function buildLiveUpdates(
    windowMatches: LiveWindowMatch[],
    apiMatches: ApiMatch[],
): LiveUpdate[] {
    const apiById = new Map(apiMatches.map((match) => [match.id, match]));
    const updates: LiveUpdate[] = [];
    for (const match of windowMatches) {
        const apiMatch = apiById.get(match.api_game_id);
        if (!apiMatch) {
            continue;
        }
        const { status } = mapApiStatus(apiMatch.state.description);
        if (status !== 'in_play') {
            continue;
        }
        const score = parseLiveScore(apiMatch.state.score);
        if (!score) {
            continue;
        }
        updates.push({
            api_game_id: match.api_game_id,
            live_home_score: score.home,
            live_away_score: score.away,
            live_period: apiMatch.state.description,
        });
    }
    return updates;
}
