import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Mes ligues (la RLS ne laisse passer que celles dont je suis membre). */
export function useMyLeagues() {
    return useQuery({
        queryKey: ['leagues'],
        queryFn: async () => {
            const { data, error } = await supabase.from('leagues').select('*').order('created_at');
            if (error) throw error;
            return data;
        },
    });
}
