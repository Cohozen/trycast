import type { MatchStatus, TeamRow } from '@/features/matches/types';

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

/** Clé i18n du nom d'une nation, keyée par le tricode `teams.code`. */
export type MatchTeamKey =
    | 'matches:teams.FRA'
    | 'matches:teams.IRL'
    | 'matches:teams.ITA'
    | 'matches:teams.ARG'
    | 'matches:teams.JPN'
    | 'matches:teams.ENG'
    | 'matches:teams.SCO'
    | 'matches:teams.WAL'
    | 'matches:teams.NZL'
    | 'matches:teams.AUS'
    | 'matches:teams.RSA'
    | 'matches:teams.FIJ';

const TEAM_NAME_KEYS: Record<string, MatchTeamKey> = {
    FRA: 'matches:teams.FRA',
    IRL: 'matches:teams.IRL',
    ITA: 'matches:teams.ITA',
    ARG: 'matches:teams.ARG',
    JPN: 'matches:teams.JPN',
    ENG: 'matches:teams.ENG',
    SCO: 'matches:teams.SCO',
    WAL: 'matches:teams.WAL',
    NZL: 'matches:teams.NZL',
    AUS: 'matches:teams.AUS',
    RSA: 'matches:teams.RSA',
    FIJ: 'matches:teams.FIJ',
};

/**
 * Nom d'affichage d'une équipe : nom FR traduit pour les nations connues (keyé
 * par le tricode, cf. FLAG_DEFS), sinon le nom brut de la base (équipe hors
 * Nations Championship, ou données API dans une autre langue). La traduction se
 * fait ici via le `t` de l'écran (cf. groupByDate) — le repli TBD reste à
 * l'appelant quand `team` est null.
 */
export function teamName(team: TeamRow, t: (key: MatchTeamKey) => string): string {
    const key = team.code ? TEAM_NAME_KEYS[team.code] : undefined;
    return key ? t(key) : team.name;
}
