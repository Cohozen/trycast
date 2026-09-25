import { useQuery } from '@tanstack/react-query';

import { blockedPlayersQuery } from '@/features/profile/use-blocked-players';

// Hors du hook : un `select` stable n'est recalculé que si les données changent
function toIdSet(rows: { blocked_id: string }[]): ReadonlySet<string> {
    return new Set(rows.map((row) => row.blocked_id));
}

/** Les ids des joueurs que j'ai bloqués, pour masquer leur pseudo et leur photo. */
export function useBlockedIds() {
    return useQuery({ ...blockedPlayersQuery, select: toIdSet });
}
