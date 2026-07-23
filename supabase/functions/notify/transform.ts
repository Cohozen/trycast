// Logique pure de l'EF notify : regroupement des cibles par (user, match) et
// composition des messages Expo. Zéro import Deno : testé sous Vitest.
import type { ExpoPushMessage } from '../_shared/expo-push.ts';
import {
    buildReminderMessage,
    buildResultMessage,
    REMINDER_URL,
    RESULT_URL,
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
 * Une notification à claimer : un (user, match) et tous les tokens du user.
 * `row` = première ligne du groupe (locale/équipes/scores identiques partout).
 */
export type TargetGroup<Row> = {
    userId: string;
    matchId: string;
    tokens: string[];
    row: Row;
};

export function groupTargets<Row extends { user_id: string; match_id: string; token: string }>(
    rows: Row[],
): TargetGroup<Row>[] {
    const groups = new Map<string, TargetGroup<Row>>();
    for (const row of rows) {
        const key = `${row.user_id}:${row.match_id}`;
        const group = groups.get(key);
        if (group) {
            group.tokens.push(row.token);
        } else {
            groups.set(key, {
                userId: row.user_id,
                matchId: row.match_id,
                tokens: [row.token],
                row,
            });
        }
    }
    return [...groups.values()];
}

/** Un message par token du groupe (tickets alignés 1:1, cf. _shared/expo-push). */
export function reminderMessages(group: TargetGroup<ReminderTargetRow>): ExpoPushMessage[] {
    const content = buildReminderMessage(group.row.locale, {
        home: { name: group.row.home_team, code: group.row.home_code },
        away: { name: group.row.away_team, code: group.row.away_code },
    });
    return group.tokens.map((to) => ({
        to,
        ...content,
        data: { url: REMINDER_URL },
        channelId: 'default',
        sound: 'default' as const,
    }));
}

export function resultMessages(group: TargetGroup<ResultTargetRow>): ExpoPushMessage[] {
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
        data: { url: RESULT_URL },
        channelId: 'default',
        sound: 'default' as const,
    }));
}
