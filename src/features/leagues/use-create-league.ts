import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

import type { LeagueColor } from './colors';

/**
 * Crée une ligue sur la compétition active via la RPC create_league :
 * code d'invitation généré côté serveur, membership owner incluse (atomique),
 * couleur d'identité choisie dans la palette fermée (check serveur).
 */
export function useCreateLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, color }: { name: string; color: LeagueColor }) => {
            const { data, error } = await supabase.rpc('create_league', {
                p_name: name,
                p_color: color,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            trackEvent({ name: 'league_created' });
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
        },
    });
}
