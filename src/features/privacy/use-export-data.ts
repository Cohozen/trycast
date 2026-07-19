import { useMutation } from '@tanstack/react-query';
import { Share } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Export RGPD des données personnelles : l'Edge Function `export-data`
 * (service_role côté serveur) renvoie un JSON agrégé, que l'on remet à
 * l'utilisateur via la feuille de partage native (Share). Aucun envoi
 * d'e-mail — pas de brique SMTP applicative.
 */
export function useExportData() {
    return useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('export-data', {
                method: 'POST',
            });
            if (error) throw error;
            const json = JSON.stringify(data, null, 2);
            await Share.share({ message: json });
        },
    });
}
