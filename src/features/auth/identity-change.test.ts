import { describe, expect, it } from 'vitest';

import { hasIdentityChanged } from '@/features/auth/identity-change';

describe('hasIdentityChanged', () => {
    it('ne vide rien à la première résolution de session', () => {
        expect(hasIdentityChanged(undefined, 'user-1')).toBe(false);
        expect(hasIdentityChanged(undefined, null)).toBe(false);
    });

    it('ne vide rien sur un rafraîchissement de token du même compte', () => {
        expect(hasIdentityChanged('user-1', 'user-1')).toBe(false);
    });

    it('vide au changement de compte', () => {
        expect(hasIdentityChanged('user-1', 'user-2')).toBe(true);
    });

    it('vide à la déconnexion et à la reconnexion', () => {
        expect(hasIdentityChanged('user-1', null)).toBe(true);
        expect(hasIdentityChanged(null, 'user-1')).toBe(true);
    });
});
