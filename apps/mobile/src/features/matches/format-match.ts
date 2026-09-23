import type { MatchStatus, TeamRow } from '@/features/matches/types';

type FormatKickoffOptions = {
    locale?: string;
    timeZone?: string;
};

/**
 * Heure locale du coup d'envoi : « 9h05 », « 21h45 » en français, l'usage
 * de la locale ailleurs (« 9:05 AM » en anglais). Intl ne connaît pas le
 * « h » français : on le reconstruit à partir des parts.
 */
export function formatKickoffTime(iso: string, options: FormatKickoffOptions = {}): string {
    const locale = options.locale ?? 'fr-FR';
    const formatter = new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    });
    const date = new Date(iso);
    if (!locale.startsWith('fr')) return formatter.format(date);
    const parts = formatter.formatToParts(date);
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
    return `${hour}h${minute}`;
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
