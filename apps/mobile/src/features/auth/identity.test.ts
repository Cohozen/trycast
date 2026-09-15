import { describe, expect, it } from 'vitest';

import { hasPasswordIdentity, signInMethods } from '@/features/auth/identity';

describe('signInMethods', () => {
    it('lit les identités liées', () => {
        expect(signInMethods({ identities: [{ provider: 'email' }] })).toEqual(['email']);
        expect(
            signInMethods({ identities: [{ provider: 'email' }, { provider: 'google' }] }),
        ).toEqual(['email', 'google']);
    });

    it('retombe sur app_metadata quand identities est absent', () => {
        expect(signInMethods({ app_metadata: { providers: ['google'] } })).toEqual(['google']);
        expect(signInMethods({ app_metadata: { provider: 'email' } })).toEqual(['email']);
    });

    it('ignore un fournisseur que l’app ne sait pas nommer', () => {
        expect(signInMethods({ identities: [{ provider: 'github' }] })).toEqual([]);
    });

    it('déduplique', () => {
        expect(
            signInMethods({ identities: [{ provider: 'google' }, { provider: 'google' }] }),
        ).toEqual(['google']);
    });

    it('tolère l’absence d’utilisateur', () => {
        expect(signInMethods(null)).toEqual([]);
        expect(signInMethods({})).toEqual([]);
    });
});

describe('hasPasswordIdentity', () => {
    it('est vrai dès qu’une identité e-mail existe', () => {
        expect(hasPasswordIdentity({ identities: [{ provider: 'email' }] })).toBe(true);
        expect(
            hasPasswordIdentity({ identities: [{ provider: 'google' }, { provider: 'email' }] }),
        ).toBe(true);
    });

    it('est faux pour un compte créé uniquement via un fournisseur', () => {
        expect(hasPasswordIdentity({ identities: [{ provider: 'google' }] })).toBe(false);
    });
});
