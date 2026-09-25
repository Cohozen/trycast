import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toProfileMessageKey } from './errors';

function pgError(code: string, message = ''): PostgrestError {
    return new PostgrestError({ code, message, details: '', hint: '' });
}

describe('toProfileMessageKey', () => {
    it.each([
        ['23505', 'profile:username.taken'],
        ['23514', 'profile:errors.invalid'],
        ['XX000', 'common:errors.generic'],
    ])('mappe %s', (code, expected) => {
        expect(toProfileMessageKey(pgError(code))).toBe(expected);
    });

    it('distingue le filtre des pseudos du check de format', () => {
        const error = pgError(
            '23514',
            'new row for relation "profiles" violates check constraint "profiles_username_clean"',
        );
        expect(toProfileMessageKey(error)).toBe('profile:username.notAllowed');
    });

    it('mappe une erreur non Postgrest sur le message générique', () => {
        expect(toProfileMessageKey(new Error('boom'))).toBe('common:errors.generic');
    });
});
