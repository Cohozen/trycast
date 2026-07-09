import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Mes ligues avec leur nombre de membres (la RLS ne laisse passer que
 * celles dont je suis membre, et les membres de mes ligues). */
export function useMyLeagues() {
    return useQuery({
        queryKey: ['leagues'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('leagues')
                .select('*, league_members(count)')
                .order('created_at');
            if (error) throw error;
            return data.map(({ league_members, ...league }) => ({
                ...league,
                member_count: league_members[0]?.count ?? 0,
            }));
        },
    });
}
