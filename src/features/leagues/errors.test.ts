import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toLeagueMessageKey } from './errors';

function pgError(code: string): PostgrestError {
    return new PostgrestError({ code, message: '', details: '', hint: '' });
}

describe('toLeagueMessageKey', () => {
    it.each([
        ['P0002', 'leagues:errors.invalidCode'],
        ['23514', 'leagues:errors.invalidName'],
        ['42501', 'leagues:errors.notAllowed'],
        ['XX000', 'leagues:errors.server'],
    ])('mappe %s', (code, expected) => {
        expect(toLeagueMessageKey(pgError(code))).toBe(expected);
    });
});
