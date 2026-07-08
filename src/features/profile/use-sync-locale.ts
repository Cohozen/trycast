import { useEffect } from 'react';

import { i18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * Aligne profiles.locale sur la langue résolue de l'app, une fois par
 * session ouverte. Best-effort : un échec (hors ligne…) est silencieux,
 * la prochaine ouverture retentera. Consommée par les notifications
 * localisées du Lot 6 (notify-deadline / notify-results).
 */
export function useSyncLocale(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return;
        supabase
            .from('profiles')
            .update({ locale: i18n.language })
            .eq('id', userId)
            .then(({ error }) => {
                if (error && __DEV__) {
                    console.warn('Synchronisation de profiles.locale échouée :', error.message);
                }
            });
    }, [userId]);
}
