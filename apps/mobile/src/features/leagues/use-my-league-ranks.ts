import { useQueries } from '@tanstack/react-query';

import { leagueLeaderboardQuery } from '@/features/leagues/use-league-leaderboard';

/**
 * Mon rang dans chacune de mes ligues (onglet Ligues du profil), indexé par
 * ligue. Relit le classement de chaque ligue par la même requête que l'écran
 * ligue : cache partagé, pas de RPC dédiée. ponytail: une requête par ligue,
 * une RPC groupée si un joueur finit par en compter des dizaines.
 */
export function useMyLeagueRanks(leagueIds: string[], userId: string) {
    return useQueries({
        queries: leagueIds.map((leagueId) => leagueLeaderboardQuery(leagueId)),
        combine: (results) =>
            new Map(
                leagueIds.map((leagueId, index) => [
                    leagueId,
                    results[index].data?.find((entry) => entry.user_id === userId)?.rank ?? null,
                ]),
            ),
    });
}
