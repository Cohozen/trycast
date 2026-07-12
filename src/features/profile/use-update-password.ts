import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Changement de mot de passe (maquette Réglages). Pur client : pas de
 * confirmation e-mail (contrairement au changement d'adresse). L'ancien mot
 * de passe n'est pas redemandé — la session authentifiée suffit à Supabase ;
 * `same_password`/`weak_password` remontent en erreur, mappées par
 * `toAuthMessageKey`.
 */
export function useUpdatePassword() {
    return useMutation({
        mutationFn: async (password: string) => {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
        },
    });
}
