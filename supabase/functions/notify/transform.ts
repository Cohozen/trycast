// Logique pure de l'EF notify : regroupement des cibles par (user, match, ligue) et
// composition des messages Expo. Zéro import Deno : testé sous Vitest.
import type { ExpoPushMessage } from '../_shared/expo-push.ts';
import {
    buildReminderMessage,
    buildResultMessage,
    buildRoundHighlightMessage,
    REMINDER_CATEGORY,
    REMINDER_URL,
    RESULT_CATEGORY,
    RESULT_URL,
    roundHighlightUrl,
} from '../_shared/notification-messages.ts';

// Lignes retournées par les RPC notify_*_targets (une par user × match × token)
export type ReminderTargetRow = {
    match_id: string;
    user_id: string;
    token: string;
    locale: string;
    home_team: string;
    away_team: string;
    home_code: string | null;
    away_code: string | null;
    kickoff_at: string;
};

export type ResultTargetRow = {
    match_id: string;
    user_id: string;
    token: string;
    locale: string;
    home_team: string;
    away_team: string;
    home_code: string | null;
    away_code: string | null;
    home_score: number;
    away_score: number;
    points_awarded: number | null;
};

/**
 * Coup de la journée : une ligne par (membre × ligue × journée × token).
 * `match_id` porte l'ancre (dernier match de la journée), ce qui fait entrer
 * ces cibles dans le même journal que rappels et résultats.
 */
export type RoundHighlightTargetRow = {
    league_id: string;
    league_name: string;
    match_id: string;
    round_key: string;
    user_id: string;
    is_laureate: boolean;
    token: string;
    locale: string;
};

/** Ligne telle que la rend notify_round_highlight_targets (ancre nommée). */
export type RoundHighlightRpcRow = Omit<RoundHighlightTargetRow, 'match_id'> & {
    anchor_match_id: string;
};

export function toRoundHighlightTargets(rows: RoundHighlightRpcRow[]): RoundHighlightTargetRow[] {
    return rows.map(({ anchor_match_id, ...row }) => ({ ...row, match_id: anchor_match_id }));
}

/**
 * Une notification à claimer : un (user, match, ligue) et tous les tokens du
 * user. `leagueId` n'existe que pour le coup de la journée (null sinon), comme
 * dans la clé d'unicité de notification_sends.
 * `row` = première ligne du groupe (locale/équipes/scores identiques partout).
 */
export type TargetGroup<Row> = {
    userId: string;
    matchId: string;
    leagueId: string | null;
    tokens: string[];
    row: Row;
};

/** Clé d'un envoi, alignée sur l'unicité (user, match, type, ligue) du journal. */
export function sendKey(userId: string, matchId: string, leagueId: string | null): string {
    return `${userId}:${matchId}:${leagueId ?? ''}`;
}

export function groupTargets<
    Row extends { user_id: string; match_id: string; token: string; league_id?: string },
>(rows: Row[]): TargetGroup<Row>[] {
    const groups = new Map<string, TargetGroup<Row>>();
    for (const row of rows) {
        const key = sendKey(row.user_id, row.match_id, row.league_id ?? null);
        const group = groups.get(key);
        if (group) {
            group.tokens.push(row.token);
        } else {
            groups.set(key, {
                userId: row.user_id,
                matchId: row.match_id,
                leagueId: row.league_id ?? null,
                tokens: [row.token],
                row,
            });
        }
    }
    return [...groups.values()];
}

/**
 * Contexte propre à une notification, connu seulement après le claim.
 * `sendId` est l'id de la ligne notification_sends : porté par `data.id`, c'est
 * ce qui permet à l'action « Marquer comme lu » de savoir quoi marquer.
 * `badge` est le nombre de non-lues qu'aura le user une fois celle-ci reçue.
 */
export type MessageContext = { sendId: string; badge: number };

/** Un message par token du groupe (tickets alignés 1:1, cf. _shared/expo-push). */
export function reminderMessages(
    group: TargetGroup<ReminderTargetRow>,
    context: MessageContext,
): ExpoPushMessage[] {
    const content = buildReminderMessage(group.row.locale, {
        home: { name: group.row.home_team, code: group.row.home_code },
        away: { name: group.row.away_team, code: group.row.away_code },
    });
    return group.tokens.map((to) => ({
        to,
        ...content,
        data: { url: REMINDER_URL, id: context.sendId },
        categoryId: REMINDER_CATEGORY,
        badge: context.badge,
        channelId: 'default',
        sound: 'default' as const,
    }));
}

export function resultMessages(
    group: TargetGroup<ResultTargetRow>,
    context: MessageContext,
): ExpoPushMessage[] {
    const content = buildResultMessage(group.row.locale, {
        home: { name: group.row.home_team, code: group.row.home_code },
        away: { name: group.row.away_team, code: group.row.away_code },
        homeScore: group.row.home_score,
        awayScore: group.row.away_score,
        points: group.row.points_awarded ?? 0,
    });
    return group.tokens.map((to) => ({
        to,
        ...content,
        data: { url: RESULT_URL, id: context.sendId },
        categoryId: RESULT_CATEGORY,
        badge: context.badge,
        channelId: 'default',
        sound: 'default' as const,
    }));
}

/** Sans catégorie : pas de bouton d'action, le tap ouvre la journée de la ligue. */
export function roundHighlightMessages(
    group: TargetGroup<RoundHighlightTargetRow>,
    context: MessageContext,
): ExpoPushMessage[] {
    const content = buildRoundHighlightMessage(group.row.locale, {
        leagueName: group.row.league_name,
        isLaureate: group.row.is_laureate,
    });
    return group.tokens.map((to) => ({
        to,
        ...content,
        data: {
            url: roundHighlightUrl(group.row.league_id, group.row.round_key),
            id: context.sendId,
        },
        badge: context.badge,
        channelId: 'default',
        sound: 'default' as const,
    }));
}
