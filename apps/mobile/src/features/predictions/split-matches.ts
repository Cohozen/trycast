import type { MatchWithTeams } from '@/features/matches/types';

export type SplitMatches = {
    /** Matchs à venir (page Matchs), du plus proche au plus lointain. */
    upcoming: MatchWithTeams[];
    /** Matchs passés ou en cours (page Résultats), du plus récent au plus ancien. */
    results: MatchWithTeams[];
};

/**
 * Partage les matchs entre la page Matchs (saisie des pronos) et la page
 * Résultats. Un match bascule côté Résultats dès le kickoff passé ou dès
 * qu'il quitte l'état scheduled — l'affichage n'est qu'une UX, la deadline
 * réelle est portée par la RLS.
 */
export function splitMatches(matches: MatchWithTeams[], now: Date): SplitMatches {
    const upcoming: MatchWithTeams[] = [];
    const results: MatchWithTeams[] = [];

    for (const match of matches) {
        const kickoffFuture = new Date(match.kickoff_at).getTime() > now.getTime();
        if (match.status === 'scheduled' && kickoffFuture) {
            upcoming.push(match);
        } else {
            // Reportés/annulés inclus : la page Résultats affiche leur statut
            results.push(match);
        }
    }

    upcoming.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    results.sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
    return { upcoming, results };
}
