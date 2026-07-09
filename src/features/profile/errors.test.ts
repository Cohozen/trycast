import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toProfileMessageKey } from './errors';

function pgError(code: string): PostgrestError {
    return new PostgrestError({ code, message: '', details: '', hint: '' });
}

describe('toProfileMessageKey', () => {
    it.each([
        ['23505', 'profile:username.taken'],
        ['23514', 'profile:errors.invalid'],
        ['XX000', 'common:errors.generic'],
    ])('mappe %s', (code, expected) => {
        expect(toProfileMessageKey(pgError(code))).toBe(expected);
    });

    it('mappe une erreur non Postgrest sur le message générique', () => {
        expect(toProfileMessageKey(new Error('boom'))).toBe('common:errors.generic');
    });
});
