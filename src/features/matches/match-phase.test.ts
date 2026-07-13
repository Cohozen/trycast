import { describe, expect, it } from 'vitest';
import { matchPhase } from './match-phase';

const NOW = new Date('2026-07-10T12:00:00Z');

describe('matchPhase', () => {
    it('scheduled + kickoff futur → upcoming (prono éditable)', () => {
        expect(matchPhase({ status: 'scheduled', kickoff_at: '2026-07-12T14:00:00Z' }, NOW)).toBe(
            'upcoming',
        );
    });

    it('scheduled + kickoff passé (lag du sync) → locked (prono read-only)', () => {
        expect(matchPhase({ status: 'scheduled', kickoff_at: '2026-07-10T11:55:00Z' }, NOW)).toBe(
            'locked',
        );
    });

    it('in_play → live', () => {
        expect(matchPhase({ status: 'in_play', kickoff_at: '2026-07-10T11:00:00Z' }, NOW)).toBe(
            'live',
        );
    });

    it('finished, postponed et cancelled → finished (réconciliation)', () => {
        for (const status of ['finished', 'postponed', 'cancelled'] as const) {
            expect(matchPhase({ status, kickoff_at: '2026-07-09T14:00:00Z' }, NOW)).toBe(
                'finished',
            );
        }
    });
});
