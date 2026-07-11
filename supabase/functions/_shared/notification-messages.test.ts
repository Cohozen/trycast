import { describe, expect, it } from 'vitest';
import { buildReminderMessage, buildResultMessage } from './notification-messages.ts';

describe('buildReminderMessage', () => {
    it('compose le rappel en français', () => {
        const message = buildReminderMessage('fr', {
            homeTeam: 'France',
            awayTeam: 'Nouvelle-Zélande',
        });
        expect(message.title).toBe('Rappel de prono');
        expect(message.body).toBe(
            "France – Nouvelle-Zélande : coup d'envoi dans moins d'une heure. Fais ton prono !",
        );
    });

    it('replie toute locale inconnue ou absente sur le français', () => {
        const fromUnknown = buildReminderMessage('eo', { homeTeam: 'A', awayTeam: 'B' });
        const fromNull = buildReminderMessage(null, { homeTeam: 'A', awayTeam: 'B' });
        expect(fromUnknown.title).toBe('Rappel de prono');
        expect(fromNull.body).toContain('A – B');
    });

    it('résout la langue de base d’une locale régionale (fr-FR)', () => {
        const message = buildReminderMessage('fr-FR', { homeTeam: 'A', awayTeam: 'B' });
        expect(message.title).toBe('Rappel de prono');
    });
});

describe('buildResultMessage', () => {
    it('compose le résultat avec score et points', () => {
        const message = buildResultMessage('fr', {
            homeTeam: 'Afrique du Sud',
            awayTeam: 'Argentine',
            homeScore: 34,
            awayScore: 32,
            points: 13,
        });
        expect(message.title).toBe('Résultats & points');
        expect(message.body).toBe('Afrique du Sud 34 – 32 Argentine : tu marques 13 pts.');
    });

    it('accorde le singulier à 0 et 1 point', () => {
        const zero = buildResultMessage('fr', {
            homeTeam: 'A',
            awayTeam: 'B',
            homeScore: 10,
            awayScore: 20,
            points: 0,
        });
        const one = buildResultMessage('fr', {
            homeTeam: 'A',
            awayTeam: 'B',
            homeScore: 10,
            awayScore: 20,
            points: 1,
        });
        expect(zero.body).toContain('0 pt.');
        expect(one.body).toContain('1 pt.');
    });
});
