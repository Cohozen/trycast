import { describe, expect, it } from 'vitest';
import {
    type ApiMatch,
    type ApiOddsMarket,
    buildMatchRows,
    buildTeamRows,
    mapApiStatus,
    parseOddsResponse,
    selectMatchesForOddsCapture,
} from './transform';

function match(overrides: Partial<ApiMatch> = {}): ApiMatch {
    return {
        id: 36224450,
        date: '2026-08-08T07:05:00.000Z',
        week: '1',
        state: { description: 'Not started' },
        homeTeam: { id: 384001, name: 'New Zealand' },
        awayTeam: { id: 384002, name: 'Australia' },
        ...overrides,
    };
}

describe('mapApiStatus', () => {
    it.each([
        ['Not started', 'scheduled'],
        ['To be announced', 'scheduled'],
        ['First half', 'in_play'],
        ['Half time', 'in_play'],
        ['Second half', 'in_play'],
        ['Extra time', 'in_play'],
        ['Interrupted', 'in_play'],
        ['Finished', 'finished'],
        ['Finished after extra time', 'finished'],
        ['Awarded', 'finished'],
        ['Postponed', 'postponed'],
        ['Cancelled', 'cancelled'],
        ['Abandoned', 'cancelled'],
    ] as const)('mappe « %s » → %s', (description, expected) => {
        expect(mapApiStatus(description)).toEqual({ status: expected, isUnknown: false });
    });

    it('est insensible à la casse', () => {
        expect(mapApiStatus('FINISHED')).toEqual({ status: 'finished', isUnknown: false });
    });

    it('signale un état inconnu et retombe sur scheduled', () => {
        expect(mapApiStatus('Alien invasion')).toEqual({ status: 'scheduled', isUnknown: true });
    });
});

describe('buildTeamRows', () => {
    it('dédoublonne les équipes et attache le mapping statique', () => {
        const matches = [
            match(),
            match({
                id: 36224451,
                homeTeam: { id: 384002, name: 'Australia' },
                awayTeam: { id: 384003, name: 'South Africa' },
            }),
        ];
        const { rows, unmappedTeams } = buildTeamRows(matches);
        expect(rows).toHaveLength(3);
        expect(rows.find((r) => r.api_team_id === 384001)).toMatchObject({
            name: 'New Zealand',
            code: 'NZL',
            flag_emoji: '🇳🇿',
        });
        expect(unmappedTeams).toEqual([]);
    });

    it('accepte une équipe hors mapping (métadonnées null) et la signale', () => {
        const matches = [match({ homeTeam: { id: 384099, name: 'Barbarians' } })];
        const { rows, unmappedTeams } = buildTeamRows(matches);
        expect(rows.find((r) => r.api_team_id === 384099)).toMatchObject({
            name: 'Barbarians',
            code: null,
            flag_emoji: null,
            color: null,
        });
        expect(unmappedTeams).toEqual(['Barbarians']);
    });

    it('ignore les équipes TBD (null)', () => {
        const matches = [match({ homeTeam: null })];
        expect(buildTeamRows(matches).rows).toHaveLength(1);
    });
});

describe('buildMatchRows', () => {
    const uuids = new Map([
        [384001, 'uuid-nzl'],
        [384002, 'uuid-aus'],
    ]);

    it('construit un payload strictement fixtures', () => {
        const { rows, unknownStatuses } = buildMatchRows([match()], uuids, 'comp-1');
        expect(rows).toEqual([
            {
                api_game_id: 36224450,
                competition_id: 'comp-1',
                home_team_id: 'uuid-nzl',
                away_team_id: 'uuid-aus',
                kickoff_at: '2026-08-08T07:05:00.000Z',
                round: '1',
                status: 'scheduled',
            },
        ]);
        expect(unknownStatuses).toEqual([]);
    });

    it('gère les équipes TBD (null) et les rounds numériques', () => {
        const { rows } = buildMatchRows([match({ week: 3, homeTeam: null })], uuids, 'comp-1');
        expect(rows[0]).toMatchObject({ home_team_id: null, away_team_id: 'uuid-aus', round: '3' });
    });

    it('remonte les états inconnus', () => {
        const { rows, unknownStatuses } = buildMatchRows(
            [match({ state: { description: 'Warming up' } })],
            uuids,
            'comp-1',
        );
        expect(rows[0]?.status).toBe('scheduled');
        expect(unknownStatuses).toEqual(['Warming up']);
    });
});

describe('selectMatchesForOddsCapture', () => {
    const now = new Date('2026-08-01T00:00:00Z');
    const entry = (kickoff_at: string, status: 'scheduled' | 'finished' = 'scheduled') => ({
        kickoff_at,
        status,
    });

    it('retient tous les matchs à venir, même lointains, triés du plus proche au plus lointain', () => {
        const soon = entry('2026-08-05T15:00:00Z');
        const far = entry('2027-02-20T15:00:00Z');
        const veryFar = entry('2027-09-01T15:00:00Z');
        // Ordre d'entrée volontairement mélangé pour vérifier le tri
        expect(selectMatchesForOddsCapture([far, veryFar, soon], now)).toEqual([
            soon,
            far,
            veryFar,
        ]);
    });

    it('écarte les matchs passés (kickoff <= now) et non scheduled', () => {
        const past = entry('2026-07-31T15:00:00Z');
        const atNow = entry('2026-08-01T00:00:00Z');
        const finished = entry('2026-08-05T15:00:00Z', 'finished');
        expect(selectMatchesForOddsCapture([past, atNow, finished], now)).toEqual([]);
    });
});

describe('parseOddsResponse', () => {
    it('extrait le premier marché 3 issues Home/Draw/Away (odd numérique)', () => {
        const markets: ApiOddsMarket[] = [
            {
                market: 'Over/Under 58.5',
                values: [
                    { value: 'Over', odd: 1.85 },
                    { value: 'Under', odd: 1.95 },
                ],
            },
            {
                bookmakerName: 'Bets10',
                type: 'prematch',
                market: 'Full Time Result',
                values: [
                    { value: 'Home', odd: 1.3 },
                    { value: 'Draw', odd: 18 },
                    { value: 'Away', odd: 3.4 },
                ],
            },
        ];
        expect(parseOddsResponse(markets)).toEqual({ home: 1.3, draw: 18, away: 3.4 });
    });

    it('tolère les cotes en chaîne de caractères', () => {
        const markets: ApiOddsMarket[] = [
            {
                market: 'Full Time Result',
                values: [
                    { value: 'Home', odd: '1.92' },
                    { value: 'Draw', odd: '21.00' },
                    { value: 'Away', odd: '2.10' },
                ],
            },
        ];
        expect(parseOddsResponse(markets)).toEqual({ home: 1.92, draw: 21, away: 2.1 });
    });

    it('renvoie null sans marché 3 issues complet', () => {
        const markets: ApiOddsMarket[] = [
            {
                market: 'Home/Away',
                values: [
                    { value: 'Home', odd: 1.25 },
                    { value: 'Away', odd: 3.8 },
                ],
            },
        ];
        expect(parseOddsResponse(markets)).toBeNull();
    });

    it('renvoie null sur une réponse vide', () => {
        expect(parseOddsResponse([])).toBeNull();
    });
});
