import { describe, expect, it } from 'vitest';
import {
    groupTargets,
    type ReminderTargetRow,
    reminderMessages,
    type ResultTargetRow,
    resultMessages,
} from './transform.ts';

function reminderRow(overrides: Partial<ReminderTargetRow>): ReminderTargetRow {
    return {
        match_id: 'match-1',
        user_id: 'user-1',
        token: 'tok-1',
        locale: 'fr',
        home_team: 'France',
        away_team: 'Italy',
        home_code: 'FRA',
        away_code: 'ITA',
        kickoff_at: '2026-07-11T20:00:00Z',
        ...overrides,
    };
}

describe('groupTargets', () => {
    it('regroupe les tokens d’un même (user, match) et sépare le reste', () => {
        const groups = groupTargets([
            reminderRow({ token: 'tok-1' }),
            reminderRow({ token: 'tok-2' }),
            reminderRow({ user_id: 'user-2', token: 'tok-3' }),
            reminderRow({ match_id: 'match-2', token: 'tok-1' }),
        ]);
        expect(groups).toHaveLength(3);
        expect(groups[0]).toMatchObject({
            userId: 'user-1',
            matchId: 'match-1',
            tokens: ['tok-1', 'tok-2'],
        });
        expect(groups[1]).toMatchObject({ userId: 'user-2', tokens: ['tok-3'] });
        expect(groups[2]).toMatchObject({ matchId: 'match-2', tokens: ['tok-1'] });
    });

    it('retourne une liste vide sans cible', () => {
        expect(groupTargets([])).toEqual([]);
    });
});

describe('reminderMessages', () => {
    it('compose un message par token, avec le deep link Matchs', () => {
        const [group] = groupTargets([
            reminderRow({ token: 'tok-1' }),
            reminderRow({ token: 'tok-2' }),
        ]);
        const messages = reminderMessages(group);
        expect(messages).toHaveLength(2);
        expect(messages.map((message) => message.to)).toEqual(['tok-1', 'tok-2']);
        expect(messages[0].title).toBe('Rappel de prono');
        // Nom API en base (« Italy »), nom français dans la notification
        expect(messages[0].body).toContain('France – Italie');
        expect(messages[0].data).toEqual({ url: '/(app)/(tabs)/' });
        expect(messages[0].channelId).toBe('default');
    });
});

describe('resultMessages', () => {
    it('compose le message de résultat avec le deep link Résultats', () => {
        const row: ResultTargetRow = {
            match_id: 'match-1',
            user_id: 'user-1',
            token: 'tok-1',
            locale: 'fr',
            home_team: 'France',
            away_team: 'Italy',
            home_code: 'FRA',
            away_code: 'ITA',
            home_score: 28,
            away_score: 10,
            points_awarded: 27,
        };
        const [group] = groupTargets([row]);
        const messages = resultMessages(group);
        expect(messages).toHaveLength(1);
        expect(messages[0].title).toBe('Résultats & points');
        expect(messages[0].body).toBe('France 28 – 10 Italie : tu marques 27 pts.');
        expect(messages[0].data).toEqual({ url: '/(app)/(tabs)/results' });
    });

    it('replie des points absents sur 0', () => {
        const row: ResultTargetRow = {
            match_id: 'match-1',
            user_id: 'user-1',
            token: 'tok-1',
            locale: 'fr',
            home_team: 'A',
            away_team: 'B',
            home_code: null,
            away_code: null,
            home_score: 3,
            away_score: 6,
            points_awarded: null,
        };
        const [group] = groupTargets([row]);
        expect(resultMessages(group)[0].body).toContain('tu marques 0 pt.');
    });
});
