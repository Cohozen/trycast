import { describe, expect, it } from 'vitest';

import type { MatchWithTeams } from '@/features/matches/types';

import { buildRoundStrip, findCompetitionStage } from './round-strip-items';
import type { CompetitionStage } from './types';

function match(partial: Partial<MatchWithTeams>): MatchWithTeams {
    return {
        id: 'm',
        round: '1',
        kickoff_at: '2027-02-01T14:00:00+00:00',
        status: 'scheduled',
        ...partial,
    } as MatchWithTeams;
}

function stage(partial: Partial<CompetitionStage>): CompetitionStage {
    return {
        id: 's',
        competition_id: 'c',
        key: 'qf',
        kind: 'qf',
        starts_at: '2027-03-25T00:00:00+00:00',
        ends_at: '2027-03-30T00:00:00+00:00',
        sort: 1,
        ...partial,
    };
}

const stages = [
    stage({ key: 'qf', kind: 'qf' }),
    stage({
        key: 'final',
        kind: 'final',
        starts_at: '2027-04-08T00:00:00+00:00',
        ends_at: '2027-04-13T00:00:00+00:00',
        sort: 2,
    }),
];

describe('findCompetitionStage', () => {
    it('applique des bornes [début, fin)', () => {
        expect(findCompetitionStage(stages, '2027-03-25T00:00:00+00:00')?.key).toBe('qf');
        expect(findCompetitionStage(stages, '2027-03-30T00:00:00+00:00')).toBeNull();
    });
});

describe('buildRoundStrip', () => {
    it('range journées puis étapes dans l’ordre chronologique, étape au lieu du round', () => {
        const { items, lastPlayed } = buildRoundStrip(
            [
                match({ id: 'a', round: '2', kickoff_at: '2027-02-08T14:00:00+00:00' }),
                match({ id: 'b', round: '1', status: 'finished' }),
                // Le round brut d'un match d'étape (week Highlightly) est ignoré
                match({ id: 'c', round: '6', kickoff_at: '2027-03-28T14:00:00+00:00' }),
                match({ id: 'd', round: '6', kickoff_at: '2027-03-29T14:00:00+00:00' }),
                match({ id: 'e', round: '7', kickoff_at: '2027-04-11T14:00:00+00:00' }),
            ],
            stages,
        );
        expect(items.map((i) => [i.key, i.kind, i.matchCount])).toEqual([
            ['1', 'round', 1],
            ['2', 'round', 1],
            ['stage:qf', 'qf', 2],
            ['stage:final', 'final', 1],
        ]);
        expect(lastPlayed?.key).toBe('1');
        expect(items.filter((i) => i.emphasized).map((i) => i.key)).toEqual(['1']);
    });

    it('sans étape, se comporte comme une bande de journées', () => {
        const { items, lastPlayed } = buildRoundStrip(
            [match({ round: null, status: 'finished' })],
            [],
        );
        expect(items[0]).toMatchObject({ key: 'sans-round', kind: 'round', label: '—' });
        expect(lastPlayed?.key).toBe('sans-round');
    });
});
