import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Toutes les compétitions (sélecteur du Profil), la plus récente d'abord. */
export function useCompetitions() {
    return useQuery({
        queryKey: ['competitions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .order('starts_on', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}
