import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Compétition active affichée par l'app (null si aucune — hors saison). */
export function useActiveCompetition() {
    return useQuery({
        queryKey: ['competition', 'active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .eq('is_active', true)
                .order('starts_on')
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });
}
