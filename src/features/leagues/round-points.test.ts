import { describe, expect, it } from 'vitest';

import { groupRoundPoints, type RoundPointsInputRow } from './round-points';

function row(partial: Partial<RoundPointsInputRow>): RoundPointsInputRow {
    return {
        round: 'J1',
        first_kickoff: '2027-02-01T14:00:00+00:00',
        user_id: 'u1',
        username: 'lea',
        avatar_url: null,
        points: 0,
        exact_scores: 0,
        ...partial,
    };
}

describe('groupRoundPoints', () => {
    it('regroupe par journée dans l’ordre des premiers kickoffs, pas alphabétique', () => {
        const rounds = groupRoundPoints([
            row({ round: 'J10', first_kickoff: '2027-04-10T14:00:00+00:00' }),
            row({ round: 'J2', first_kickoff: '2027-02-08T14:00:00+00:00' }),
            row({ round: 'J1', first_kickoff: '2027-02-01T14:00:00+00:00' }),
        ]);
        expect(rounds.map((r) => r.round)).toEqual(['J1', 'J2', 'J10']);
    });

    it('classe une journée aux points puis aux scores exacts', () => {
        const [round] = groupRoundPoints([
            row({ user_id: 'a', username: 'anna', points: 40, exact_scores: 1 }),
            row({ user_id: 'b', username: 'bob', points: 52, exact_scores: 2 }),
            row({ user_id: 'c', username: 'chloe', points: 40, exact_scores: 2 }),
        ]);
        expect(round.entries.map((e) => e.userId)).toEqual(['b', 'c', 'a']);
        expect(round.entries.map((e) => e.rank)).toEqual([1, 2, 3]);
    });

    it('donne le même rang aux ex æquo et saute le suivant (rank, pas dense)', () => {
        const [round] = groupRoundPoints([
            row({ user_id: 'a', username: 'anna', points: 40, exact_scores: 1 }),
            row({ user_id: 'b', username: 'bob', points: 40, exact_scores: 1 }),
            row({ user_id: 'c', username: 'chloe', points: 12, exact_scores: 0 }),
        ]);
        expect(round.entries.map((e) => e.rank)).toEqual([1, 1, 3]);
    });

    it('départage l’affichage des ex æquo par pseudo, insensible à la casse', () => {
        const [round] = groupRoundPoints([
            row({ user_id: 'b', username: 'Zoe', points: 10 }),
            row({ user_id: 'a', username: 'anna', points: 10 }),
        ]);
        expect(round.entries.map((e) => e.username)).toEqual(['anna', 'Zoe']);
    });

    it('supporte un round null (matches.round non renseigné)', () => {
        const rounds = groupRoundPoints([row({ round: null })]);
        expect(rounds).toHaveLength(1);
        expect(rounds[0].round).toBeNull();
    });

    it('rend une liste vide sans données', () => {
        expect(groupRoundPoints([])).toEqual([]);
    });
});
