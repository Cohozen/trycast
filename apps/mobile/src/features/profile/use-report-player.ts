import { useMutation } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-context';
import type { ReportReason } from '@/features/profile/types';
import { supabase } from '@/lib/supabase';

/**
 * Signale le pseudo ou la photo d'un joueur. Une ligne en base, qui déclenche
 * côté serveur un e-mail à contact@ ; le traitement est manuel. Le client ne
 * peut pas relire ses signalements (aucun droit de lecture).
 */
export function useReportPlayer() {
    const { session } = useSession();
    return useMutation({
        mutationFn: async ({
            reportedId,
            reason,
        }: {
            reportedId: string;
            reason: ReportReason;
        }) => {
            const { error } = await supabase.from('user_reports').insert({
                reporter_id: session?.user.id as string,
                reported_id: reportedId,
                reason,
            });
            // Déjà signalé pour ce motif : le signalement est en attente, c'est un succès
            if (error && error.code !== '23505') throw error;
        },
    });
}
