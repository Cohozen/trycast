import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toFrenchLeagueMessage } from './errors';

function pgError(code: string): PostgrestError {
    return new PostgrestError({ code, message: '', details: '', hint: '' });
}

describe('toFrenchLeagueMessage', () => {
    it.each([
        ['P0002', 'Code d’invitation invalide.'],
        ['23514', 'Nom de ligue invalide (3 à 40 caractères).'],
        ['42501', 'Action non autorisée.'],
        ['XX000', 'Impossible de contacter le serveur. Réessaie dans un instant.'],
    ])('traduit %s', (code, expected) => {
        expect(toFrenchLeagueMessage(pgError(code))).toBe(expected);
    });
});
