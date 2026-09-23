import { describe, expect, it } from 'vitest';

import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';

import { summarizeRound } from './round-summary';
import type { CompetitionStage } from './types';

function match(id: string, round: string, kickoff: string): MatchWithTeams {
    return { id, round, kickoff_at: kickoff, status: 'finished' } as MatchWithTeams;
}

/** Prono scoré ; `exact` / `good` pilotent le breakdown lu par verdictOf. */
function scored(points: number, verdict: 'exact' | 'good' | 'missed'): PredictionRow {
    return {
        points_awarded: points,
        points_breakdown: {
            exactScorePoints: verdict === 'exact' ? 10 : 0,
            winnerCorrect: verdict !== 'missed',
        },
    } as unknown as PredictionRow;
}

const stages: CompetitionStage[] = [
    {
        id: 's',
        competition_id: 'c',
        key: 'final',
        kind: 'final',
        starts_at: '2027-03-20T00:00:00+00:00',
        ends_at: '2027-03-22T00:00:00+00:00',
        sort: 1,
    },
];

const matches = [
    match('a', '1', '2027-02-01T14:00:00+00:00'),
    match('b', '1', '2027-02-02T14:00:00+00:00'),
    match('c', '2', '2027-02-08T14:00:00+00:00'),
    match('d', '2', '2027-02-09T14:00:00+00:00'),
    match('e', '3', '2027-02-15T14:00:00+00:00'),
    match('f', '3', '2027-02-16T14:00:00+00:00'),
    match('g', '9', '2027-03-21T14:00:00+00:00'),
];

const predictions = new Map([
    ['a', scored(10, 'good')],
    ['b', scored(0, 'missed')],
    ['c', scored(30, 'exact')],
    ['d', scored(12, 'good')],
    ['e', scored(8, 'good')],
    ['f', { points_awarded: null, points_breakdown: null } as PredictionRow],
]);

describe('summarizeRound', () => {
    it('prend la journée du dernier match commencé, avec sa frontière et mes points', () => {
        const summary = summarizeRound(
            matches,
            predictions,
            stages,
            new Date('2027-02-10T00:00:00Z'),
        );
        expect(summary.round).toEqual({
            label: '2',
            stageKind: null,
            firstKickoff: '2027-02-08T14:00:00+00:00',
            points: 42,
        });
    });

    it('la frontière reste le premier match de la journée même si le suivant n’a pas commencé', () => {
        const summary = summarizeRound(
            matches,
            predictions,
            stages,
            new Date('2027-02-15T15:00:00Z'),
        );
        expect(summary.round?.label).toBe('3');
        expect(summary.round?.firstKickoff).toBe('2027-02-15T14:00:00+00:00');
        expect(summary.round?.points).toBe(8);
    });

    it('nomme l’étape à élimination directe plutôt que le round brut', () => {
        const summary = summarizeRound(
            matches,
            predictions,
            stages,
            new Date('2027-03-21T15:00:00Z'),
        );
        expect(summary.round).toMatchObject({ label: null, stageKind: 'final', points: 0 });
    });

    it('n’a pas de journée avant le premier coup d’envoi', () => {
        expect(
            summarizeRound(matches, predictions, stages, new Date('2027-01-01')).round,
        ).toBeNull();
    });

    it('compte les bons pronos et garde la forme des 5 derniers scorés, en attente exclus', () => {
        const summary = summarizeRound(matches, predictions, stages, new Date('2027-04-01'));
        expect(summary.goodCount).toBe(4);
        expect(summary.form).toEqual(['good', 'missed', 'exact', 'good', 'good']);
    });
});
