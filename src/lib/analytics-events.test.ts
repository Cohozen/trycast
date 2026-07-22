import { describe, expect, it } from 'vitest';

import { type AnalyticsEvent, toAptabaseProps } from './analytics-events';

describe('toAptabaseProps', () => {
    it("n'envoie aucune propriété pour un événement qui n'en déclare pas", () => {
        expect(toAptabaseProps({ name: 'account_created' })).toBeUndefined();
        expect(toAptabaseProps({ name: 'league_joined' })).toBeUndefined();
    });

    it('convertit les booléens en chaînes (Aptabase refuse les booléens)', () => {
        expect(toAptabaseProps({ name: 'prediction_saved', props: { first: true } })).toEqual({
            first: 'true',
        });
    });

    it('laisse les littéraux de chaîne intacts', () => {
        expect(toAptabaseProps({ name: 'leaderboard_viewed', props: { scope: 'global' } })).toEqual({
            scope: 'global',
        });
    });
});

describe('le catalogue interdit les données personnelles à la compilation', () => {
    it("refuse une propriété d'identification sur un événement sans propriétés", () => {
        // @ts-expect-error — aucun événement ne doit pouvoir porter d'user_id
        const event: AnalyticsEvent = { name: 'account_created', props: { user_id: 'abc' } };
        expect(event.name).toBe('account_created');
    });

    it('refuse une propriété non déclarée sur un événement qui en a', () => {
        const event: AnalyticsEvent = {
            name: 'prediction_saved',
            // @ts-expect-error — `username` ne fait pas partie du contrat de l'événement
            props: { first: true, username: 'corentin' },
        };
        expect(event.name).toBe('prediction_saved');
    });

    it('refuse une valeur hors du littéral fermé', () => {
        const event: AnalyticsEvent = {
            name: 'leaderboard_viewed',
            // @ts-expect-error — seuls 'league' et 'global' sont admis
            props: { scope: 'e2e.user1@trycast.local' },
        };
        expect(event.name).toBe('leaderboard_viewed');
    });

    it("refuse un nom d'événement inventé", () => {
        // @ts-expect-error — le nom doit venir du catalogue
        const event: AnalyticsEvent = { name: 'user_email_captured' };
        expect(event).toBeTruthy();
    });
});
