import { describe, expect, it } from 'vitest';

import { notificationTime } from './format-notification-time';

const NOW = new Date('2026-07-25T12:00:00Z').getTime();

function ago(ms: number): string {
    return new Date(NOW - ms).toISOString();
}

describe('notificationTime', () => {
    it('plancher à la minute pour une notification toute fraîche', () => {
        expect(notificationTime(ago(5_000), NOW)).toEqual({
            kind: 'relative',
            key: 'time.minutes',
            value: 1,
        });
    });

    it('compte en minutes sous l’heure', () => {
        expect(notificationTime(ago(20 * 60_000), NOW)).toEqual({
            kind: 'relative',
            key: 'time.minutes',
            value: 20,
        });
    });

    it('compte en heures sous la journée', () => {
        expect(notificationTime(ago(3 * 3_600_000), NOW)).toEqual({
            kind: 'relative',
            key: 'time.hours',
            value: 3,
        });
    });

    it('compte en jours sous la semaine', () => {
        expect(notificationTime(ago(3 * 86_400_000), NOW)).toEqual({
            kind: 'relative',
            key: 'time.days',
            value: 3,
        });
    });

    it('bascule sur une date absolue au-delà d’une semaine', () => {
        const result = notificationTime(ago(10 * 86_400_000), NOW);
        expect(result.kind).toBe('absolute');
        expect(result.kind === 'absolute' && result.date.toISOString()).toBe(
            '2026-07-15T12:00:00.000Z',
        );
    });

    it('la bascule se fait pile à une semaine', () => {
        expect(notificationTime(ago(7 * 86_400_000 - 1), NOW).kind).toBe('relative');
        expect(notificationTime(ago(7 * 86_400_000), NOW).kind).toBe('absolute');
    });
});
