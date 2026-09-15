import { describe, expect, it } from 'vitest';

import { parseOAuthCallback } from '@/features/auth/parse-oauth-callback';

describe('parseOAuthCallback', () => {
    it('lit les jetons du fragment (flux implicite)', () => {
        const result = parseOAuthCallback(
            'trycast://auth/callback#access_token=abc.def&expires_in=3600&refresh_token=xyz&token_type=bearer',
        );

        expect(result).toEqual({ type: 'session', accessToken: 'abc.def', refreshToken: 'xyz' });
    });

    it('décode les valeurs échappées', () => {
        const result = parseOAuthCallback(
            'trycast://auth/callback#access_token=a%2Fb&refresh_token=c%2Bd',
        );

        expect(result).toEqual({ type: 'session', accessToken: 'a/b', refreshToken: 'c+d' });
    });

    it('remonte une erreur décrite dans le fragment', () => {
        const result = parseOAuthCallback(
            'trycast://auth/callback#error=access_denied&error_description=User+cancelled',
        );

        expect(result).toEqual({ type: 'error', description: 'User cancelled' });
    });

    it('remonte une erreur décrite dans la query', () => {
        const result = parseOAuthCallback('trycast://auth/callback?error=server_error');

        expect(result).toEqual({ type: 'error', description: 'server_error' });
    });

    it('traite une URL sans jeton comme une erreur plutôt que comme un succès', () => {
        expect(parseOAuthCallback('trycast://auth/callback').type).toBe('error');
        expect(parseOAuthCallback('trycast://auth/callback#access_token=seul').type).toBe('error');
    });

    it('donne le dernier mot au fragment quand la query porte aussi des paramètres', () => {
        const result = parseOAuthCallback(
            'trycast://auth/callback?access_token=ancien&refresh_token=ancien#access_token=neuf&refresh_token=neuf',
        );

        expect(result).toEqual({ type: 'session', accessToken: 'neuf', refreshToken: 'neuf' });
    });
});
