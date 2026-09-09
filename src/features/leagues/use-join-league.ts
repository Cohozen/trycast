import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/**
 * Variables de la mutation. `via` n'a aucun effet métier : il ne sert qu'à
 * mesurer ce que le partage par lien apporte, et il est porté par l'appel
 * plutôt que par le hook parce que l'origine peut changer au cours d'une même
 * session d'écran (arriver par lien, puis effacer et saisir un autre code).
 */
export type JoinLeagueVariables = { code: string; via: 'code' | 'link' };

/**
 * Rejoint une ligue par code d'invitation via la RPC join_league (seul moyen
 * de résoudre un code — pas d'énumération par select). Idempotente : re-join
 * renvoie la même ligue sans doublon.
 */
export function useJoinLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ code }: JoinLeagueVariables) => {
            const { data, error } = await supabase.rpc('join_league', { p_code: code });
            if (error) throw error;
            return data;
        },
        onSuccess: (_data, { via }) => {
            trackEvent({ name: 'league_joined', props: { via } });
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}
