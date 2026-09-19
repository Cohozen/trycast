import { describe, expect, it } from 'vitest';

import { toReactionMessageKey } from '@/features/reactions/errors';

describe('toReactionMessageKey', () => {
    it('lit le message-identifiant de la RPC', () => {
        expect(toReactionMessageKey({ code: '42501', message: 'not_started' })).toBe(
            'reactions:errors.notStarted',
        );
        expect(toReactionMessageKey({ code: 'P0002', message: 'no_prediction' })).toBe(
            'reactions:errors.noPrediction',
        );
        expect(toReactionMessageKey({ code: 'P0002', message: 'not_member' })).toBe(
            'reactions:errors.notMember',
        );
    });

    it('repli sur l’échec générique', () => {
        expect(toReactionMessageKey({ code: '22023', message: 'self_reaction' })).toBe(
            'reactions:errors.failed',
        );
        expect(toReactionMessageKey(new Error('offline'))).toBe('reactions:errors.failed');
        expect(toReactionMessageKey(null)).toBe('reactions:errors.failed');
    });
});
