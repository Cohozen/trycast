import { describe, expect, it } from 'vitest';

import { toJokerMessageKey } from '@/features/jokers/errors';

describe('toJokerMessageKey', () => {
    it('distingue les cas d’un même errcode par le message de la RPC', () => {
        expect(toJokerMessageKey({ code: '42501', message: 'match_started' })).toBe(
            'jokers:errors.matchStarted',
        );
        expect(toJokerMessageKey({ code: '42501', message: 'joker_locked' })).toBe(
            'jokers:errors.locked',
        );
        expect(toJokerMessageKey({ code: 'P0002', message: 'no_prediction' })).toBe(
            'jokers:errors.noPrediction',
        );
        expect(toJokerMessageKey({ code: 'P0002', message: 'no_phase' })).toBe(
            'jokers:errors.noPhase',
        );
    });

    it('repli : 42501 inconnu → deadline, le reste → échec générique', () => {
        expect(toJokerMessageKey({ code: '42501', message: 'permission denied' })).toBe(
            'jokers:errors.matchStarted',
        );
        expect(toJokerMessageKey(new Error('offline'))).toBe('jokers:errors.failed');
        expect(toJokerMessageKey(null)).toBe('jokers:errors.failed');
    });
});
