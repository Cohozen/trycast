import { AuthError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toAuthMessageKey } from './errors';

describe('toAuthMessageKey', () => {
    it('mappe les codes d’erreur auth connus sur leur clé i18n', () => {
        expect(toAuthMessageKey(new AuthError('Invalid login', 400, 'invalid_credentials'))).toBe(
            'auth:errors.invalidCredentials',
        );
        expect(toAuthMessageKey(new AuthError('Exists', 422, 'user_already_exists'))).toBe(
            'auth:errors.emailExists',
        );
    });

    it('retombe sur la clé rate-limit pour un statut 429 sans code connu', () => {
        expect(toAuthMessageKey(new AuthError('Slow down', 429, 'unknown_code'))).toBe(
            'auth:errors.rateLimited',
        );
    });

    it('détecte les erreurs réseau de fetch', () => {
        expect(toAuthMessageKey(new TypeError('Network request failed'))).toBe(
            'common:errors.network',
        );
    });

    it('a une clé générique pour tout le reste', () => {
        expect(toAuthMessageKey(new Error('boom'))).toBe('common:errors.generic');
        expect(toAuthMessageKey(undefined)).toBe('common:errors.generic');
        expect(toAuthMessageKey(new AuthError('Unknown', 400, 'not_a_known_code'))).toBe(
            'common:errors.generic',
        );
    });
});
