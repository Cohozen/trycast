/**
 * Horodatage relatif d'une notification (« il y a 20 min », « il y a 3 j »),
 * puis date absolue au-delà d'une semaine — passé ce délai, « il y a 12 jours »
 * n'aide plus personne. Tout passe par Intl avec la langue courante : aucune
 * chaîne en dur, donc aucune clé i18n non plus.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatNotificationTime(iso: string, locale: string, now = Date.now()): string {
    const elapsed = now - new Date(iso).getTime();

    if (elapsed >= WEEK) {
        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
            new Date(iso),
        );
    }

    // style 'short' : « il y a 20 min » plutôt que « il y a 20 minutes » (long,
    // trop bavard sur une ligne de liste) ou « -20 min » (narrow, illisible).
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    if (elapsed >= DAY) {
        return relative.format(-Math.floor(elapsed / DAY), 'day');
    }
    if (elapsed >= HOUR) {
        return relative.format(-Math.floor(elapsed / HOUR), 'hour');
    }
    // Plancher à 1 minute : « il y a 0 minute » n'a pas de sens, et une
    // notification tout juste reçue se lit très bien en « il y a 1 min ».
    return relative.format(-Math.max(1, Math.floor(elapsed / MINUTE)), 'minute');
}
