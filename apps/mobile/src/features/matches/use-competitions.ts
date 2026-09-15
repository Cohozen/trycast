import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Compétitions proposées au sélecteur du Profil : en cours ou passées, la plus
 * récente d'abord. Deux filtres, car la RLS de `competitions` est `using (true)`
 * et laisse tout le tri au client :
 * - `starts_on <= aujourd'hui` : une compétition à venir n'a aucun match, donc
 *   aucune stat à montrer ;
 * - `api_league_id > 0` : les seeds de test du dépôt portent des identifiants
 *   API négatifs (`api_league_id = -1`, `api_game_id` négatifs), convention qui
 *   les rend invisibles de l'app sans dépendre d'un slug.
 */
export function useCompetitions() {
    return useQuery({
        queryKey: ['competitions'],
        queryFn: async () => {
            const today = new Date().toISOString().slice(0, 10);
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .gt('api_league_id', 0)
                .lte('starts_on', today)
                .order('starts_on', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}
