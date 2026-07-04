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

const STATUS_LABELS: Record<Exclude<MatchStatus, 'scheduled'>, string> = {
    in_play: 'En cours',
    finished: 'Terminé',
    postponed: 'Reporté',
    cancelled: 'Annulé',
};

/** Libellé de statut à afficher en badge. Null pour scheduled (on montre l'heure). */
export function statusLabel(status: MatchStatus): string | null {
    return status === 'scheduled' ? null : STATUS_LABELS[status];
}
