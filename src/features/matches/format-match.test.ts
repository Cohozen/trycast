import { describe, expect, it } from 'vitest';
import { formatKickoff, statusLabel } from './format-match';

describe('formatKickoff', () => {
    // timeZone figée : le résultat ne dépend pas de la machine (CI vs local)
    it('formate le coup d’envoi en date/heure locale française', () => {
        const label = formatKickoff('2026-08-08T07:05:00+00:00', { timeZone: 'Europe/Paris' });
        expect(label).toContain('8');
        expect(label).toContain('août');
        expect(label).toContain('09:05');
    });

    it('respecte le fuseau demandé', () => {
        const paris = formatKickoff('2026-08-08T07:05:00Z', { timeZone: 'Europe/Paris' });
        const sydney = formatKickoff('2026-08-08T07:05:00Z', { timeZone: 'Australia/Sydney' });
        expect(paris).toContain('09:05');
        expect(sydney).toContain('17:05');
    });
});

describe('statusLabel', () => {
    it('renvoie null pour scheduled (on affiche l’heure du match)', () => {
        expect(statusLabel('scheduled')).toBeNull();
    });

    it.each([
        ['in_play', 'En cours'],
        ['finished', 'Terminé'],
        ['postponed', 'Reporté'],
        ['cancelled', 'Annulé'],
    ] as const)('libelle %s → %s', (status, expected) => {
        expect(statusLabel(status)).toBe(expected);
    });
});
