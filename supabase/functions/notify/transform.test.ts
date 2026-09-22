import { describe, expect, it } from 'vitest';
import {
    groupTargets,
    type ReminderTargetRow,
    reminderMessages,
    type ResultTargetRow,
    resultMessages,
    roundHighlightMessages,
    toRoundHighlightTargets,
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
        const messages = reminderMessages(group, { sendId: 'send-1', badge: 3 });
        expect(messages).toHaveLength(2);
        expect(messages.map((message) => message.to)).toEqual(['tok-1', 'tok-2']);
        expect(messages[0].title).toBe('Rappel de prono');
        // Nom API en base (« Italy »), nom français dans la notification
        expect(messages[0].body).toContain('France – Italie');
        expect(messages[0].data).toEqual({ url: '/(app)/(tabs)/', id: 'send-1' });
        expect(messages[0].channelId).toBe('default');
    });

    it('porte la catégorie d’actions et le badge sur chaque message', () => {
        const [group] = groupTargets([
            reminderRow({ token: 'tok-1' }),
            reminderRow({ token: 'tok-2' }),
        ]);
        const messages = reminderMessages(group, { sendId: 'send-1', badge: 3 });
        expect(messages.map((message) => message.categoryId)).toEqual(['reminder', 'reminder']);
        expect(messages.map((message) => message.badge)).toEqual([3, 3]);
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
        const messages = resultMessages(group, { sendId: 'send-2', badge: 1 });
        expect(messages).toHaveLength(1);
        expect(messages[0].title).toBe('Résultats & points');
        expect(messages[0].body).toBe('France 28 – 10 Italie : tu marques 27 pts.');
        expect(messages[0].data).toEqual({ url: '/(app)/(tabs)/results', id: 'send-2' });
        expect(messages[0].categoryId).toBe('result');
        expect(messages[0].badge).toBe(1);
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
        expect(resultMessages(group, { sendId: 'send-3', badge: 1 })[0].body).toContain(
            'tu marques 0 pt.',
        );
    });
});

describe('coup de la journée', () => {
    const rpcRow = {
        league_id: 'league-1',
        league_name: 'Les Potes',
        anchor_match_id: 'match-9',
        round_key: 'stage:final',
        user_id: 'user-1',
        is_laureate: false,
        token: 'tok-1',
        locale: 'fr',
    };

    it('sépare deux ligues sur la même ancre et regroupe les tokens', () => {
        const groups = groupTargets(
            toRoundHighlightTargets([
                rpcRow,
                { ...rpcRow, token: 'tok-2' },
                { ...rpcRow, league_id: 'league-2' },
            ]),
        );
        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({
            matchId: 'match-9',
            leagueId: 'league-1',
            tokens: ['tok-1', 'tok-2'],
        });
        expect(groups[1]).toMatchObject({ leagueId: 'league-2' });
    });

    it('rappels et résultats gardent une ligue nulle', () => {
        const [group] = groupTargets([reminderRow({})]);
        expect(group.leagueId).toBeNull();
    });

    it('ouvre la journée de la ligue, sans catégorie d’actions', () => {
        const [group] = groupTargets(toRoundHighlightTargets([rpcRow]));
        const [message] = roundHighlightMessages(group, { sendId: 'send-1', badge: 2 });
        expect(message).toMatchObject({
            to: 'tok-1',
            title: 'Coup de la journée',
            body: 'Le coup de la journée dans Les Potes.',
            data: { url: '/league/league-1?tab=results&round=stage%3Afinal', id: 'send-1' },
            badge: 2,
        });
        expect(message.categoryId).toBeUndefined();
    });

    it('interpelle le lauréat', () => {
        const [group] = groupTargets(
            toRoundHighlightTargets([{ ...rpcRow, is_laureate: true, locale: 'en' }]),
        );
        const [message] = roundHighlightMessages(group, { sendId: 'send-1', badge: 1 });
        expect(message.body).toBe('You made the call of the round in Les Potes!');
    });
});
