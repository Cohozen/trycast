import type { Href } from 'expo-router';

/**
 * Allowlist des deep links portés par `data.url` des push (émis par l'EF
 * notify, cf. supabase/functions/_shared/notification-messages.ts) et recopiés
 * dans `notification_sends.url` pour l'historique. Le payload n'est pas fiable
 * par principe : toute URL hors de cette table ou du motif ci-dessous est
 * ignorée — jamais de navigation arbitraire. Les valeurs sont les routes
 * typées équivalentes, groupes élidés.
 */
const ROUTE_BY_URL: Record<string, Href> = {
    '/(app)/(tabs)/': '/',
    '/(app)/(tabs)/results': '/results',
};

/**
 * Coup de la journée : `/league/<uuid>?tab=results&round=<clé encodée>`
 * (roundHighlightUrl côté serveur). Seul l'onglet Résultats est accepté, et la
 * clé de journée reste bornée : un round inconnu retombe sur la dernière
 * journée jouée, sans autre effet.
 */
const ROUND_HIGHLIGHT_URL =
    /^\/league\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?tab=results&round=([^&]{1,120})$/;

export function notificationHref(url: string | null | undefined): Href | undefined {
    if (typeof url !== 'string') return undefined;
    const fixed = ROUTE_BY_URL[url];
    if (fixed) return fixed;

    const match = ROUND_HIGHLIGHT_URL.exec(url);
    if (!match) return undefined;
    let round: string;
    try {
        round = decodeURIComponent(match[2]);
    } catch {
        return undefined;
    }
    return { pathname: '/league/[id]', params: { id: match[1], tab: 'results', round } };
}
