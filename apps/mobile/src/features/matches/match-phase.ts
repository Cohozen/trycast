import type { MatchRow } from '@/features/matches/types';

/**
 * Phase d'affichage de la page de détail. Distincte du status serveur :
 * un match encore `scheduled` mais dont le kickoff est passé (lag du cron
 * sync-results) est déjà « verrouillé » — prono read-only, pronos de ligue
 * visibles. Même bascule que splitMatches ; l'affichage n'est qu'une UX,
 * la deadline réelle est portée par la RLS.
 */
export type MatchPhase = 'upcoming' | 'locked' | 'live' | 'finished';

export function matchPhase(match: Pick<MatchRow, 'status' | 'kickoff_at'>, now: Date): MatchPhase {
    if (match.status === 'in_play') return 'live';
    if (match.status === 'scheduled') {
        const kickoffFuture = new Date(match.kickoff_at).getTime() > now.getTime();
        return kickoffFuture ? 'upcoming' : 'locked';
    }
    // finished, postponed, cancelled : le chip affiche le statut exact
    return 'finished';
}
