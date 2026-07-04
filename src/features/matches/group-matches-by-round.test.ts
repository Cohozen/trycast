import { describe, expect, it } from 'vitest';
import { FALLBACK_ROUND, groupMatchesByRound } from './group-matches-by-round';

describe('groupMatchesByRound', () => {
    it('groupe par journée en préservant l’ordre kickoff', () => {
        const matches = [
            { id: 'a', round: 'Round 1' },
            { id: 'b', round: 'Round 1' },
            { id: 'c', round: 'Round 2' },
        ];
        expect(groupMatchesByRound(matches)).toEqual([
            { round: 'Round 1', matches: [matches[0], matches[1]] },
            { round: 'Round 2', matches: [matches[2]] },
        ]);
    });

    it('range les matchs sans journée dans « Autres matchs »', () => {
        const matches = [{ id: 'a', round: null }];
        expect(groupMatchesByRound(matches)).toEqual([
            { round: FALLBACK_ROUND, matches: [matches[0]] },
        ]);
    });

    it('renvoie une liste vide sans matchs', () => {
        expect(groupMatchesByRound([])).toEqual([]);
    });
});
