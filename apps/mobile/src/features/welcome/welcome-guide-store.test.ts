import { describe, expect, it } from 'vitest';

import { parseWelcomeGuideSeen } from './welcome-guide-store';

describe('parseWelcomeGuideSeen', () => {
    it('montre le guide quand rien n’est stocké', () => {
        expect(parseWelcomeGuideSeen(null)).toBe(false);
        expect(parseWelcomeGuideSeen(undefined)).toBe(false);
    });

    it('ne le montre plus une fois le flag posé', () => {
        expect(parseWelcomeGuideSeen('true')).toBe(true);
    });

    it('repli sur « à montrer » pour toute valeur inattendue', () => {
        expect(parseWelcomeGuideSeen('')).toBe(false);
        expect(parseWelcomeGuideSeen('false')).toBe(false);
        expect(parseWelcomeGuideSeen('1')).toBe(false);
    });
});
