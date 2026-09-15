import { describe, expect, it } from 'vitest';

import { buildDayRange, dayKeyOf } from './day-range';

describe('dayKeyOf', () => {
    it('produit une clé locale YYYY-MM-DD', () => {
        expect(dayKeyOf(new Date(2026, 6, 9))).toBe('2026-07-09');
        expect(dayKeyOf(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03');
    });
});

describe('buildDayRange', () => {
    const today = new Date(2026, 6, 9); // 9 juillet 2026

    it('couvre en continu du début de compétition à aujourd’hui, en ordre chronologique', () => {
        const days = buildDayRange({
            startsOn: '2026-07-04',
            endsOn: '2026-08-30',
            matchDayKeys: new Set(['2026-07-04', '2026-07-08']),
            today,
        });
        expect(days.map((d) => d.key)).toEqual([
            '2026-07-04',
            '2026-07-05',
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
        ]);
        expect(days.map((d) => d.hasMatches)).toEqual([true, false, false, false, true, false]);
        expect(days.at(-1)?.isToday).toBe(true);
        expect(days.slice(0, -1).every((d) => !d.isToday)).toBe(true);
    });

    it('se borne à la fin de la compétition quand elle est passée', () => {
        const days = buildDayRange({
            startsOn: '2026-06-28',
            endsOn: '2026-06-30',
            matchDayKeys: new Set(['2026-06-29']),
            today,
        });
        expect(days.map((d) => d.key)).toEqual(['2026-06-28', '2026-06-29', '2026-06-30']);
        expect(days.every((d) => !d.isToday)).toBe(true);
    });

    it('étend les bornes si un jour de match tombe dehors (fuseau, données)', () => {
        const days = buildDayRange({
            startsOn: '2026-07-06',
            endsOn: '2026-08-30',
            matchDayKeys: new Set(['2026-07-05']),
            today,
        });
        expect(days[0]?.key).toBe('2026-07-05');
        expect(days[0]?.hasMatches).toBe(true);
    });

    it('vide quand la compétition n’a pas commencé et sans résultat', () => {
        const days = buildDayRange({
            startsOn: '2026-09-01',
            endsOn: '2026-10-15',
            matchDayKeys: new Set(),
            today,
        });
        expect(days).toEqual([]);
    });
});
