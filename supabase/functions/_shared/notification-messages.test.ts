import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildReminderMessage, buildResultMessage } from './notification-messages.ts';

describe('buildReminderMessage', () => {
    it('compose le rappel en français', () => {
        const message = buildReminderMessage('fr', {
            home: { name: 'France', code: 'FRA' },
            away: { name: 'New Zealand', code: 'NZL' },
        });
        expect(message.title).toBe('Rappel de prono');
        expect(message.body).toBe(
            "France – Nouvelle-Zélande : coup d'envoi dans moins d'une heure. Fais ton prono !",
        );
    });

    it('replie toute locale inconnue ou absente sur le français', () => {
        const fromUnknown = buildReminderMessage('eo', {
            home: { name: 'A' },
            away: { name: 'B' },
        });
        const fromNull = buildReminderMessage(null, { home: { name: 'A' }, away: { name: 'B' } });
        expect(fromUnknown.title).toBe('Rappel de prono');
        expect(fromNull.body).toContain('A – B');
    });

    it('résout la langue de base d’une locale régionale (fr-FR)', () => {
        const message = buildReminderMessage('fr-FR', { home: { name: 'A' }, away: { name: 'B' } });
        expect(message.title).toBe('Rappel de prono');
    });

    it('compose le rappel en anglais, sans traduire les noms API', () => {
        const message = buildReminderMessage('en-US', {
            home: { name: 'France', code: 'FRA' },
            away: { name: 'Fiji', code: 'FIJ' },
        });
        expect(message.title).toBe('Prediction reminder');
        expect(message.body).toBe('France – Fiji: kickoff in under an hour. Make your prediction!');
    });
});

describe('buildResultMessage', () => {
    it('compose le résultat avec score et points', () => {
        const message = buildResultMessage('fr', {
            home: { name: 'South Africa', code: 'RSA' },
            away: { name: 'Argentina', code: 'ARG' },
            homeScore: 34,
            awayScore: 32,
            points: 13,
        });
        expect(message.title).toBe('Résultats & points');
        expect(message.body).toBe('Afrique du Sud 34 – 32 Argentine : tu marques 13 pts.');
    });

    it('accorde le singulier à 0 et 1 point', () => {
        const zero = buildResultMessage('fr', {
            home: { name: 'A' },
            away: { name: 'B' },
            homeScore: 10,
            awayScore: 20,
            points: 0,
        });
        const one = buildResultMessage('fr', {
            home: { name: 'A' },
            away: { name: 'B' },
            homeScore: 10,
            awayScore: 20,
            points: 1,
        });
        expect(zero.body).toContain('0 pt.');
        expect(one.body).toContain('1 pt.');
    });

    it('accorde le pluriel anglais (0 pts, 1 pt)', () => {
        const zero = buildResultMessage('en', {
            home: { name: 'A' },
            away: { name: 'B' },
            homeScore: 10,
            awayScore: 20,
            points: 0,
        });
        const one = buildResultMessage('en', {
            home: { name: 'A' },
            away: { name: 'B' },
            homeScore: 10,
            awayScore: 20,
            points: 1,
        });
        expect(zero.body).toContain('you score 0 pts.');
        expect(one.body).toContain('you score 1 pt.');
    });
});

describe('noms d’équipes', () => {
    it('garde le nom brut quand le tricode est absent ou inconnu', () => {
        const message = buildReminderMessage('fr', {
            home: { name: 'Fijian Drua' },
            away: { name: 'Barbarians', code: 'BAR' },
        });
        expect(message.body).toContain('Fijian Drua – Barbarians');
    });

    // Le push et l'app doivent nommer les nations pareil : la table FR de
    // notification-messages.ts est la copie serveur de matches.json (une Edge
    // Function ne peut pas charger i18next). Une nation ajoutée d'un côté doit
    // l'être de l'autre, sinon ce test casse.
    it('reste aligné sur les traductions de l’app (src/locales/fr/matches.json)', () => {
        const appTeams: Record<string, string> = JSON.parse(
            readFileSync(new URL('../../../src/locales/fr/matches.json', import.meta.url), 'utf8'),
        ).teams;
        for (const [code, expected] of Object.entries(appTeams)) {
            const message = buildReminderMessage('fr', {
                home: { name: 'NOM API', code },
                away: { name: 'B' },
            });
            expect(message.body, `tricode ${code}`).toContain(`${expected} – B`);
        }
    });
});
