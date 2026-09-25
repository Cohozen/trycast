import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { maskBlocked } from '@/features/profile/block';
import { useBlockedIds } from '@/features/profile/use-blocked-ids';

const NONE: ReadonlySet<string> = new Set();

/**
 * Fonction à passer en `select` aux requêtes qui montrent des joueurs
 * (classements, pronos d'un match, coup de la journée) : les joueurs bloqués y
 * deviennent « Joueur masqué », sans photo. Tant que les blocages ne sont pas
 * chargés, rien n'est masqué.
 */
export function useMaskBlocked() {
    const { t } = useTranslation(['common']);
    const { data: blockedIds } = useBlockedIds();
    const label = t('common:blockedPlayer');
    return useCallback(
        <T extends { user_id: string | null; username: string | null; avatar_url: string | null }>(
            rows: T[],
        ) => maskBlocked(rows, blockedIds ?? NONE, label),
        [blockedIds, label],
    );
}
