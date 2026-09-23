import { describe, expect, it } from 'vitest';
import { formatKickoffTime, statusLabel } from './format-match';

describe('formatKickoffTime', () => {
    // timeZone figée : le résultat ne dépend pas de la machine (CI vs local)
    it('écrit l’heure à la française, sans zéro devant l’heure', () => {
        expect(formatKickoffTime('2026-08-08T07:05:00Z', { timeZone: 'Europe/Paris' })).toBe(
            '9h05',
        );
        expect(
            formatKickoffTime('2026-08-08T19:45:00Z', { locale: 'fr', timeZone: 'Europe/Paris' }),
        ).toBe('21h45');
    });

    it('garde AM/PM en anglais', () => {
        const label = formatKickoffTime('2026-08-08T19:45:00Z', {
            locale: 'en',
            timeZone: 'Europe/Paris',
        });
        expect(label).toMatch(/^9:45\sPM$/);
    });

    it('respecte le fuseau demandé', () => {
        expect(formatKickoffTime('2026-08-08T07:05:00Z', { timeZone: 'Australia/Sydney' })).toBe(
            '17h05',
        );
    });
});

describe('statusLabel', () => {
    it('renvoie null pour scheduled (on affiche l’heure du match)', () => {
        expect(statusLabel('scheduled')).toBeNull();
    });

    it.each([
        ['in_play', 'matches:status.inPlay'],
        ['finished', 'matches:status.finished'],
        ['postponed', 'matches:status.postponed'],
        ['cancelled', 'matches:status.cancelled'],
    ] as const)('mappe %s → %s', (status, expected) => {
        expect(statusLabel(status)).toBe(expected);
    });
});
