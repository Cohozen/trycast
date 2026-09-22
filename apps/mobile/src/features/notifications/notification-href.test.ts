import { describe, expect, it } from 'vitest';

import { notificationHref } from './notification-href';

const LEAGUE = '5f0c2a8e-1b2c-4d3e-8f90-a1b2c3d4e5f6';

describe('notificationHref', () => {
    it('traduit les routes fixes', () => {
        expect(notificationHref('/(app)/(tabs)/')).toBe('/');
        expect(notificationHref('/(app)/(tabs)/results')).toBe('/results');
    });

    it('ouvre la journée de la ligue pour un coup de la journée', () => {
        expect(notificationHref(`/league/${LEAGUE}?tab=results&round=stage%3Afinal`)).toEqual({
            pathname: '/league/[id]',
            params: { id: LEAGUE, tab: 'results', round: 'stage:final' },
        });
    });

    it('ignore tout le reste', () => {
        for (const url of [
            null,
            undefined,
            '/settings',
            'https://evil.example/league',
            `/league/${LEAGUE}`,
            `/league/${LEAGUE}?tab=settings&round=3`,
            `/league/${LEAGUE}?tab=results&round=3&x=1`,
            `/league/not-a-uuid?tab=results&round=3`,
            `/league/${LEAGUE}?tab=results&round=%E0%A4%A`,
        ]) {
            expect(notificationHref(url)).toBeUndefined();
        }
    });
});
