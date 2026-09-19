/**
 * Dernière erreur envoyée à Sentry, pour relier un signalement au plantage
 * qui vient de le motiver (`associatedEventId`). Module pur : `diagnostics.ts`
 * l'alimente depuis `beforeSend`, qui ne voit passer que les erreurs
 * réellement envoyées — une erreur filtrée par l'interrupteur des diagnostics
 * n'existe pas côté Sentry, il n'y aurait rien à relier.
 *
 * Passé la fenêtre, le lien serait trompeur : une erreur d'il y a une heure
 * n'a probablement rien à voir avec ce que le testeur décrit.
 */
export const RECENT_ERROR_WINDOW_MS = 10 * 60 * 1000;

let last: { id: string; at: number } | null = null;

export function noteErrorEvent(id: string | undefined, now = Date.now()): void {
    if (id) last = { id, at: now };
}

export function recentErrorEventId(now = Date.now()): string | undefined {
    if (!last || now - last.at > RECENT_ERROR_WINDOW_MS) return undefined;
    return last.id;
}
