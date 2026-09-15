/**
 * Ancienneté d'une notification : relative jusqu'à une semaine, date absolue
 * au-delà — passé ce délai, « il y a 12 jours » n'aide plus personne.
 *
 * Fonction de domaine : elle rend une clé i18n et sa valeur, la traduction se
 * fait dans le composant. ⚠️ Ne pas la « simplifier » en Intl.RelativeTimeFormat :
 * Hermes ne l'implémente pas et l'écran plante (vécu le 25/07/2026 sur
 * simulateur). Intl.DateTimeFormat, lui, est bien disponible.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export type NotificationTime =
    /** À traduire : t(key, { value }) */
    | { kind: 'relative'; key: 'time.minutes' | 'time.hours' | 'time.days'; value: number }
    /** À formater : Intl.DateTimeFormat avec i18n.language */
    | { kind: 'absolute'; date: Date };

export function notificationTime(iso: string, now = Date.now()): NotificationTime {
    const date = new Date(iso);
    const elapsed = now - date.getTime();

    if (elapsed >= WEEK) {
        return { kind: 'absolute', date };
    }
    if (elapsed >= DAY) {
        return { kind: 'relative', key: 'time.days', value: Math.floor(elapsed / DAY) };
    }
    if (elapsed >= HOUR) {
        return { kind: 'relative', key: 'time.hours', value: Math.floor(elapsed / HOUR) };
    }
    // Plancher à 1 minute : « il y a 0 min » n'a pas de sens, et une
    // notification tout juste reçue se lit très bien en « il y a 1 min ».
    return {
        kind: 'relative',
        key: 'time.minutes',
        value: Math.max(1, Math.floor(elapsed / MINUTE)),
    };
}
