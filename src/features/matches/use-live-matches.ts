import { useQuery } from '@tanstack/react-query';

import type { MatchWithTeams } from '@/features/matches/types';
import { supabase } from '@/lib/supabase';

// Mêmes embeds équipes que useMatches (hints FK obligatoires).
const MATCH_WITH_TEAMS = `*,
    home_team:teams!matches_home_team_id_fkey(*),
    away_team:teams!matches_away_team_id_fkey(*)`;

/**
 * Matchs en cours d'une compétition avec un score live écrit par l'EF
 * sync-live. Query dédiée (isolée de useMatches) rafraîchie toutes les 60 s
 * tant que la page est montée — le cron sync-live écrit toutes les ~5 min, on
 * lisse le décalage côté client. Tant que sync-live n'est pas activé, la
 * requête renvoie une liste vide et la carte LIVE ne s'affiche pas.
 */
export function useLiveMatches(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['matches', 'live', competitionId],
        enabled: !!competitionId,
        refetchInterval: 60_000,
        queryFn: async (): Promise<MatchWithTeams[]> => {
            const { data, error } = await supabase
                .from('matches')
                .select(MATCH_WITH_TEAMS)
                .eq('competition_id', competitionId as string)
                .eq('status', 'in_play')
                .not('live_home_score', 'is', null)
                .order('kickoff_at');
            if (error) throw error;
            return data;
        },
    });
}
