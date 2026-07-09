import type { MatchStatus } from '@/features/matches/types';

type FormatKickoffOptions = {
    locale?: string;
    timeZone?: string;
};

/** Coup d'envoi en date/heure locale, ex. « sam. 8 août, 09:05 ». */
export function formatKickoff(iso: string, options: FormatKickoffOptions = {}): string {
    return new Intl.DateTimeFormat(options.locale ?? 'fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    }).format(new Date(iso));
}

/** Heure locale du coup d'envoi, ex. « 09:05 » (bande de jours déjà datée). */
export function formatKickoffTime(iso: string, options: FormatKickoffOptions = {}): string {
    return new Intl.DateTimeFormat(options.locale ?? 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    }).format(new Date(iso));
}

/** Clé i18n d'un statut de match, à passer à t() côté écran. */
export type MatchStatusKey =
    | 'matches:status.inPlay'
    | 'matches:status.finished'
    | 'matches:status.postponed'
    | 'matches:status.cancelled';

const STATUS_KEYS: Record<Exclude<MatchStatus, 'scheduled'>, MatchStatusKey> = {
    in_play: 'matches:status.inPlay',
    finished: 'matches:status.finished',
    postponed: 'matches:status.postponed',
    cancelled: 'matches:status.cancelled',
};

/** Clé du statut à afficher en badge. Null pour scheduled (on montre l'heure). */
export function statusLabel(status: MatchStatus): MatchStatusKey | null {
    return status === 'scheduled' ? null : STATUS_KEYS[status];
}
