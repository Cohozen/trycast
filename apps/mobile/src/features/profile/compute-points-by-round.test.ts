import { describe, expect, it } from 'vitest';

import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { computePointsByRound } from './compute-points-by-round';

function match(
    id: string,
    round: string | null,
    kickoff: string,
    status: MatchWithTeams['status'] = 'finished',
): Pick<MatchWithTeams, 'id' | 'round' | 'kickoff_at' | 'status'> {
    return { id, round, kickoff_at: kickoff, status };
}

function predictions(points: Record<string, number | null>): Map<string, PredictionRow> {
    return new Map(
        Object.entries(points).map(([id, awarded]) => [
            id,
            { points_awarded: awarded } as unknown as PredictionRow,
        ]),
    );
}

describe('computePointsByRound', () => {
    it('somme les points par journée et cumule, dans l’ordre chronologique', () => {
        const matches = [
            match('m3', '2', '2026-07-11T14:00:00Z'),
            match('m1', '1', '2026-07-04T14:00:00Z'),
            match('m2', '1', '2026-07-04T18:00:00Z'),
        ];
        expect(computePointsByRound(predictions({ m1: 10, m2: 55, m3: 20 }), matches)).toEqual([
            { round: '1', points: 65, cumulative: 65 },
            { round: '2', points: 20, cumulative: 85 },
        ]);
    });

    it('trie par kickoff, pas par libellé de round (« 10 » après « 2 »)', () => {
        const matches = [
            match('m10', '10', '2026-11-21T14:00:00Z'),
            match('m2', '2', '2026-07-11T14:00:00Z'),
        ];
        const rounds = computePointsByRound(predictions({ m10: 5, m2: 7 }), matches).map(
            (entry) => entry.round,
        );
        expect(rounds).toEqual(['2', '10']);
    });

    it('exclut les journées sans match terminé, compte 0 pour les pronos non scorés ou absents', () => {
        const matches = [
            match('joué', '1', '2026-07-04T14:00:00Z'),
            match('oublié', '1', '2026-07-04T16:00:00Z'), // sans prono
            match('pas-scoré', '1', '2026-07-04T18:00:00Z'),
            match('à-venir', '2', '2026-07-18T14:00:00Z', 'scheduled'),
        ];
        expect(computePointsByRound(predictions({ joué: 12, 'pas-scoré': null }), matches)).toEqual(
            [{ round: '1', points: 12, cumulative: 12 }],
        );
    });

    it('regroupe les rounds null ensemble et gère la liste vide', () => {
        const matches = [
            match('a', null, '2026-07-04T14:00:00Z'),
            match('b', null, '2026-07-05T14:00:00Z'),
        ];
        expect(computePointsByRound(predictions({ a: 3, b: 4 }), matches)).toEqual([
            { round: null, points: 7, cumulative: 7 },
        ]);
        expect(computePointsByRound(new Map(), [])).toEqual([]);
    });
});
