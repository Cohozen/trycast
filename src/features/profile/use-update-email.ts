import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { EMAIL_CHANGE_URL } from '@/lib/urls';

/**
 * Changement d'adresse e-mail (maquette Réglages). Contrairement au mot de
 * passe, l'effet n'est pas immédiat : Supabase envoie un lien de confirmation
 * (double confirmation active côté projet → ancienne ET nouvelle adresse). La
 * session ne change qu'une fois les deux liens validés ; le lien redirige vers
 * la page d'atterrissage du site. Erreurs (`email_exists`,
 * `over_email_send_rate_limit`…) mappées par `toAuthMessageKey`.
 */
export function useUpdateEmail() {
    return useMutation({
        mutationFn: async (email: string) => {
            const { error } = await supabase.auth.updateUser(
                { email },
                { emailRedirectTo: EMAIL_CHANGE_URL },
            );
            if (error) throw error;
        },
    });
}
