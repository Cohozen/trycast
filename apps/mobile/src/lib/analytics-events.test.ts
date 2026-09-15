import { describe, expect, it } from 'vitest';

import { type AnalyticsEvent, toAptabaseProps } from './analytics-events';

describe('toAptabaseProps', () => {
    it("n'envoie aucune propriété pour un événement qui n'en déclare pas", () => {
        expect(toAptabaseProps({ name: 'league_created' })).toBeUndefined();
        expect(toAptabaseProps({ name: 'notifications_enabled' })).toBeUndefined();
    });

    it("distingue l'origine d'une adhésion et d'un partage", () => {
        expect(toAptabaseProps({ name: 'league_joined', props: { via: 'link' } })).toEqual({
            via: 'link',
        });
        expect(
            toAptabaseProps({ name: 'league_invite_shared', props: { from: 'settings' } }),
        ).toEqual({ from: 'settings' });
    });

    it('convertit les booléens en chaînes (Aptabase refuse les booléens)', () => {
        expect(toAptabaseProps({ name: 'prediction_saved', props: { first: true } })).toEqual({
            first: 'true',
        });
    });

    it('laisse les littéraux de chaîne intacts', () => {
        expect(toAptabaseProps({ name: 'leaderboard_viewed', props: { scope: 'global' } })).toEqual(
            {
                scope: 'global',
            },
        );
    });
});

describe('le catalogue interdit les données personnelles à la compilation', () => {
    it("refuse une propriété d'identification sur un événement sans propriétés", () => {
        // @ts-expect-error — aucun événement ne doit pouvoir porter d'user_id
        const event: AnalyticsEvent = { name: 'league_created', props: { user_id: 'abc' } };
        expect(event.name).toBe('league_created');
    });

    it("refuse un moyen de connexion hors des littéraux (l'identité n'y passe pas)", () => {
        const event: AnalyticsEvent = {
            name: 'signed_in',
            // @ts-expect-error — seuls 'password', 'google' et 'apple' sont admis
            props: { method: 'corentin@trycast.fr' },
        };
        expect(event.name).toBe('signed_in');
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
            // @ts-expect-error — seuls 'leagues' et 'global' sont admis
            props: { scope: 'e2e.user1@trycast.local' },
        };
        expect(event.name).toBe('leaderboard_viewed');
    });

    it("refuse le code d'invitation en propriété d'un partage", () => {
        const event: AnalyticsEvent = {
            name: 'league_invite_shared',
            // @ts-expect-error — le code identifie une ligue : il n'a rien à faire ici
            props: { from: 'settings', code: 'E2ETEST2' },
        };
        expect(event.name).toBe('league_invite_shared');
    });

    it("refuse un nom d'événement inventé", () => {
        // @ts-expect-error — le nom doit venir du catalogue
        const event: AnalyticsEvent = { name: 'user_email_captured' };
        expect(event).toBeTruthy();
    });
});
