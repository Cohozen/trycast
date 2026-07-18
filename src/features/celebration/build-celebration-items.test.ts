import { describe, expect, it } from 'vitest';

import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';

import { buildCelebrationItems } from './build-celebration-items';

function match(id: string, scored: boolean): MatchWithTeams {
    return {
        id,
        scored_at: scored ? '2026-07-18T14:00:00Z' : null,
        home_team: { code: 'FRA', name: 'France' },
        away_team: { code: 'IRL', name: 'Irlande' },
    } as unknown as MatchWithTeams;
}

function prediction(points: number | null, exact = false): PredictionRow {
    return {
        points_awarded: points,
        points_breakdown:
            points === null ? null : { exactScorePoints: exact ? 50 : 0, winnerCorrect: true },
    } as unknown as PredictionRow;
}

function predictions(entries: Record<string, PredictionRow>): Map<string, PredictionRow> {
    return new Map(Object.entries(entries));
}

describe('buildCelebrationItems', () => {
    it('ne garde que les pronos gagnés de matchs scorés, non déjà célébrés', () => {
        const matches = [match('won', true), match('zero', true), match('missing', true)];
        const items = buildCelebrationItems(
            predictions({ won: prediction(20), zero: prediction(0) }),
            matches,
            new Set(),
        );
        expect(items).toEqual([
            {
                matchId: 'won',
                homeTeam: { code: 'FRA', name: 'France' },
                awayTeam: { code: 'IRL', name: 'Irlande' },
                points: 20,
                verdict: 'good',
            },
        ]);
    });

    it('exclut les matchs déjà célébrés', () => {
        const matches = [match('a', true), match('b', true)];
        const items = buildCelebrationItems(
            predictions({ a: prediction(10), b: prediction(15) }),
            matches,
            new Set(['a']),
        );
        expect(items.map((item) => item.matchId)).toEqual(['b']);
    });

    it('ignore un match non scoré même si le prono porte des points', () => {
        const items = buildCelebrationItems(
            predictions({ x: prediction(30) }),
            [match('x', false)],
            new Set(),
        );
        expect(items).toEqual([]);
    });

    it('reflète le verdict exact et somme rien (liste vide si aucun gagné)', () => {
        const exactItems = buildCelebrationItems(
            predictions({ x: prediction(55, true) }),
            [match('x', true)],
            new Set(),
        );
        expect(exactItems[0]?.verdict).toBe('exact');

        expect(
            buildCelebrationItems(
                predictions({ x: prediction(null) }),
                [match('x', true)],
                new Set(),
            ),
        ).toEqual([]);
    });
});
