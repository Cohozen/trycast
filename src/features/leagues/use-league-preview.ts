import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Aperçu d'une ligue par code d'invitation (RPC preview_league), pour la
 * sheet « Rejoindre » : identité + effectif + déjà-membre/pleine, sans
 * adhésion. `code` doit déjà être normalisé (normalizeInviteCode) : le hook
 * ne s'active que sur un code complet — rien n'est validé à la frappe.
 * retry: false — l'échec attendu est un P0002 (code inconnu), le retenter
 * trois fois ne ferait que retarder le message d'erreur.
 */
export function useLeaguePreview(code: string | null) {
    return useQuery({
        queryKey: ['leagues', 'preview', code],
        enabled: !!code,
        retry: false,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('preview_league', {
                p_code: code as string,
            });
            if (error) throw error;
            return data[0];
        },
    });
}
