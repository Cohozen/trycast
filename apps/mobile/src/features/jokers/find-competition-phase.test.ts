import { describe, expect, it } from 'vitest';

import { findCompetitionPhase, jokerCardState } from '@/features/jokers/find-competition-phase';
import type { CompetitionPhase, JokersByPhase } from '@/features/jokers/types';

function phase(id: string, startsAt: string, endsAt: string): CompetitionPhase {
    return {
        id,
        competition_id: 'c1',
        key: id,
        name: id,
        starts_at: startsAt,
        ends_at: endsAt,
        sort: 0,
    };
}

const phases = [
    phase('july', '2026-06-01T00:00:00Z', '2026-08-15T00:00:00Z'),
    phase('november', '2026-10-15T00:00:00Z', '2026-11-25T00:00:00Z'),
    phase('finals', '2026-11-25T00:00:00Z', '2026-12-20T00:00:00Z'),
];

describe('findCompetitionPhase', () => {
    it('trouve la fenêtre qui contient le coup d’envoi', () => {
        expect(findCompetitionPhase(phases, '2026-11-07T15:40:00Z')?.id).toBe('november');
    });

    it('borne de fin exclue : un kickoff pile sur la frontière est dans la phase suivante', () => {
        expect(findCompetitionPhase(phases, '2026-11-25T00:00:00Z')?.id).toBe('finals');
    });

    it('hors de toute fenêtre : null (pas de joker)', () => {
        expect(findCompetitionPhase(phases, '2026-09-01T12:00:00Z')).toBeNull();
    });
});

describe('jokerCardState', () => {
    const november = phases[1];
    const now = Date.parse('2026-11-07T14:00:00Z');
    const jokers = (matchId: string, kickoffAt: string): JokersByPhase =>
        new Map([['november', { phaseId: 'november', matchId, kickoffAt }]]);

    it('sans phase : none', () => {
        expect(jokerCardState('m1', null, new Map(), now)).toBe('none');
    });

    it('aucun joker dans la phase : available', () => {
        expect(jokerCardState('m1', november, new Map(), now)).toBe('available');
    });

    it('joker posé sur ce match : on', () => {
        expect(jokerCardState('m1', november, jokers('m1', '2026-11-07T15:40:00Z'), now)).toBe(
            'on',
        );
    });

    it('posé ailleurs, match à venir : movable', () => {
        expect(jokerCardState('m1', november, jokers('m2', '2026-11-08T15:10:00Z'), now)).toBe(
            'movable',
        );
    });

    it('posé ailleurs, match commencé : spent (consommé)', () => {
        expect(jokerCardState('m1', november, jokers('m2', '2026-11-07T13:40:00Z'), now)).toBe(
            'spent',
        );
    });
});
