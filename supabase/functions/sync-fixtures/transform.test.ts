import { describe, expect, it } from 'vitest';
import {
    type ApiGame,
    type ApiOddsGame,
    buildMatchRows,
    buildTeamRows,
    mapApiStatus,
    parseOddsResponse,
    selectMatchesForOddsCapture,
} from './transform';

function game(overrides: Partial<ApiGame> = {}): ApiGame {
    return {
        id: 100,
        date: '2026-08-08T07:05:00+00:00',
        week: 'Round 1',
        status: { short: 'NS' },
        teams: {
            home: { id: 10, name: 'New Zealand' },
            away: { id: 11, name: 'Australia' },
        },
        ...overrides,
    };
}

describe('mapApiStatus', () => {
    it.each([
        ['NS', 'scheduled'],
        ['1H', 'in_play'],
        ['HT', 'in_play'],
        ['2H', 'in_play'],
        ['FT', 'finished'],
        ['AET', 'finished'],
        ['POST', 'postponed'],
        ['CANC', 'cancelled'],
    ] as const)('mappe %s → %s', (short, expected) => {
        expect(mapApiStatus(short)).toEqual({ status: expected, isUnknown: false });
    });

    it('signale un statut inconnu et retombe sur scheduled', () => {
        expect(mapApiStatus('WTF')).toEqual({ status: 'scheduled', isUnknown: true });
    });
});

describe('buildTeamRows', () => {
    it('dédoublonne les équipes et attache le mapping statique', () => {
        const games = [
            game(),
            game({
                id: 101,
                teams: {
                    home: { id: 11, name: 'Australia' },
                    away: { id: 12, name: 'South Africa' },
                },
            }),
        ];
        const { rows, unmappedTeams } = buildTeamRows(games);
        expect(rows).toHaveLength(3);
        expect(rows.find((r) => r.api_team_id === 10)).toMatchObject({
            name: 'New Zealand',
            code: 'NZL',
            flag_emoji: '🇳🇿',
        });
        expect(unmappedTeams).toEqual([]);
    });

    it('accepte une équipe hors mapping (métadonnées null) et la signale', () => {
        const games = [
            game({
                teams: {
                    home: { id: 99, name: 'Barbarians' },
                    away: { id: 11, name: 'Australia' },
                },
            }),
        ];
        const { rows, unmappedTeams } = buildTeamRows(games);
        expect(rows.find((r) => r.api_team_id === 99)).toMatchObject({
            name: 'Barbarians',
            code: null,
            flag_emoji: null,
            color: null,
        });
        expect(unmappedTeams).toEqual(['Barbarians']);
    });

    it('ignore les équipes TBD (null)', () => {
        const games = [game({ teams: { home: null, away: { id: 11, name: 'Australia' } } })];
        expect(buildTeamRows(games).rows).toHaveLength(1);
    });
});

describe('buildMatchRows', () => {
    const uuids = new Map([
        [10, 'uuid-nzl'],
        [11, 'uuid-aus'],
    ]);

    it('construit un payload strictement fixtures', () => {
        const { rows, unknownStatuses } = buildMatchRows([game()], uuids, 'comp-1');
        expect(rows).toEqual([
            {
                api_game_id: 100,
                competition_id: 'comp-1',
                home_team_id: 'uuid-nzl',
                away_team_id: 'uuid-aus',
                kickoff_at: '2026-08-08T07:05:00+00:00',
                round: 'Round 1',
                status: 'scheduled',
            },
        ]);
        expect(unknownStatuses).toEqual([]);
    });

    it('gère les équipes TBD (null) et les rounds numériques', () => {
        const { rows } = buildMatchRows(
            [game({ week: 3, teams: { home: null, away: { id: 11, name: 'Australia' } } })],
            uuids,
            'comp-1',
        );
        expect(rows[0]).toMatchObject({ home_team_id: null, away_team_id: 'uuid-aus', round: '3' });
    });

    it('remonte les statuts inconnus', () => {
        const { rows, unknownStatuses } = buildMatchRows(
            [game({ status: { short: 'ABD' } })],
            uuids,
            'comp-1',
        );
        expect(rows[0]?.status).toBe('scheduled');
        expect(unknownStatuses).toEqual(['ABD']);
    });
});

describe('selectMatchesForOddsCapture', () => {
    const now = new Date('2026-08-01T00:00:00Z');
    const match = (kickoff_at: string, status: 'scheduled' | 'finished' = 'scheduled') => ({
        kickoff_at,
        status,
    });

    it('retient les matchs entre maintenant (exclus) et J+7 (inclus)', () => {
        const inWindow = match('2026-08-05T15:00:00Z');
        const atBoundary = match('2026-08-08T00:00:00Z');
        const selected = selectMatchesForOddsCapture([inWindow, atBoundary], now);
        expect(selected).toEqual([inWindow, atBoundary]);
    });

    it('écarte les matchs passés, trop lointains ou non scheduled', () => {
        const past = match('2026-07-31T15:00:00Z');
        const tooFar = match('2026-08-08T00:00:01Z');
        const finished = match('2026-08-05T15:00:00Z', 'finished');
        expect(selectMatchesForOddsCapture([past, tooFar, finished], now)).toEqual([]);
    });
});

describe('parseOddsResponse', () => {
    const oddsGame = (bets: ApiOddsGame['bookmakers'][number]['bets']): ApiOddsGame[] => [
        { bookmakers: [{ name: 'Bookie', bets }] },
    ];

    it('extrait le premier marché 3 issues Home/Draw/Away', () => {
        const odds = parseOddsResponse(
            oddsGame([
                { name: 'Handicap', values: [{ value: '-5.5', odd: '1.80' }] },
                {
                    name: '3Way Result',
                    values: [
                        { value: 'Home', odd: '1.30' },
                        { value: 'Draw', odd: '18.00' },
                        { value: 'Away', odd: '3.40' },
                    ],
                },
            ]),
        );
        expect(odds).toEqual({ home: 1.3, draw: 18, away: 3.4 });
    });

    it('renvoie null sans marché 3 issues complet', () => {
        const odds = parseOddsResponse(
            oddsGame([
                {
                    name: 'Home/Away',
                    values: [
                        { value: 'Home', odd: '1.25' },
                        { value: 'Away', odd: '3.80' },
                    ],
                },
            ]),
        );
        expect(odds).toBeNull();
    });

    it('renvoie null sur une réponse vide', () => {
        expect(parseOddsResponse([])).toBeNull();
    });
});
