import { describe, expect, it } from 'vitest';

import { formatNotificationTime } from './format-notification-time';

const NOW = new Date('2026-07-25T12:00:00Z').getTime();

function ago(ms: number): string {
    return new Date(NOW - ms).toISOString();
}

/**
 * Intl sépare le nombre de son unité par une espace insécable étroite (U+202F)
 * en français. On la normalise plutôt que de la coller dans les attendus, où
 * elle serait invisible à la relecture.
 */
function normalize(value: string): string {
    return value.replace(/[  ]/g, ' ');
}

describe('formatNotificationTime', () => {
    it('plancher à la minute pour une notification toute fraîche', () => {
        expect(normalize(formatNotificationTime(ago(5_000), 'fr', NOW))).toBe('il y a 1 min');
    });

    it('compte en minutes sous l’heure', () => {
        expect(normalize(formatNotificationTime(ago(20 * 60_000), 'fr', NOW))).toBe(
            'il y a 20 min',
        );
    });

    it('compte en heures sous la journée', () => {
        expect(normalize(formatNotificationTime(ago(3 * 3_600_000), 'fr', NOW))).toBe('il y a 3 h');
    });

    it('compte en jours sous la semaine', () => {
        expect(normalize(formatNotificationTime(ago(3 * 86_400_000), 'fr', NOW))).toBe(
            'il y a 3 j',
        );
    });

    it('bascule sur une date absolue au-delà d’une semaine', () => {
        // 10 jours plus tôt : « il y a 10 jours » n'aide plus, on date.
        expect(formatNotificationTime(ago(10 * 86_400_000), 'fr', NOW)).toContain('15');
    });

    it('suit la langue demandée', () => {
        expect(normalize(formatNotificationTime(ago(2 * 3_600_000), 'en', NOW))).toBe('2 hr. ago');
    });
});
