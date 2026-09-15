import { describe, expect, it } from 'vitest';

import { livePeriodKey } from './live-period';

describe('livePeriodKey', () => {
    it('mappe les phases connues (insensible à la casse/espaces)', () => {
        expect(livePeriodKey('First Half')).toBe('matches:live.periods.firstHalf');
        expect(livePeriodKey(' second half ')).toBe('matches:live.periods.secondHalf');
        expect(livePeriodKey('PENALTIES')).toBe('matches:live.periods.penalties');
    });

    it('retourne null pour un libellé absent ou non affichable', () => {
        expect(livePeriodKey(null)).toBeNull();
        expect(livePeriodKey(undefined)).toBeNull();
        expect(livePeriodKey('')).toBeNull();
        expect(livePeriodKey('Interrupted')).toBeNull();
    });
});
