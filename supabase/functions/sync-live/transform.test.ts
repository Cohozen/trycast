import { describe, expect, it } from 'vitest';

import type { ApiMatch } from '../sync-fixtures/transform.ts';
import { buildLiveUpdates, type LiveWindowMatch, parseLiveScore } from './transform.ts';

function apiMatch(id: number, description: string, score?: string | null): ApiMatch {
    return {
        id,
        date: '2026-07-12T15:00:00Z',
        week: null,
        state: { description, score },
        homeTeam: { id: 1, name: 'A' },
        awayTeam: { id: 2, name: 'B' },
    };
}

describe('parseLiveScore', () => {
    it('parse "34 - 32" en home/away', () => {
        expect(parseLiveScore('34 - 32')).toEqual({ home: 34, away: 32 });
    });
    it('rejette null, vide, malformé, négatif', () => {
        expect(parseLiveScore(null)).toBeNull();
        expect(parseLiveScore(undefined)).toBeNull();
        expect(parseLiveScore('')).toBeNull();
        expect(parseLiveScore('34')).toBeNull();
        expect(parseLiveScore('a - b')).toBeNull();
        expect(parseLiveScore('-1 - 2')).toBeNull();
    });
});

describe('buildLiveUpdates', () => {
    const window: LiveWindowMatch[] = [
        { id: 'm1', api_game_id: 101, competition_id: 'c1' },
        { id: 'm2', api_game_id: 102, competition_id: 'c1' },
    ];

    it('retient les matchs in_play au score parsable', () => {
        const updates = buildLiveUpdates(window, [
            apiMatch(101, 'Second Half', '17 - 10'),
            apiMatch(102, 'Not Started', null),
        ]);
        expect(updates).toEqual([
            {
                api_game_id: 101,
                live_home_score: 17,
                live_away_score: 10,
                live_period: 'Second Half',
            },
        ]);
    });

    it('ignore un match finished (score final réservé à sync-results)', () => {
        expect(buildLiveUpdates(window, [apiMatch(101, 'Finished', '20 - 20')])).toEqual([]);
    });

    it('ignore un match in_play sans score parsable (clé FREE)', () => {
        expect(buildLiveUpdates(window, [apiMatch(101, 'First Half', null)])).toEqual([]);
    });

    it('ignore un match absent de la réponse API', () => {
        expect(buildLiveUpdates(window, [])).toEqual([]);
    });
});
