import { describe, expect, it } from 'vitest';

import { dayStripMarks, dayStripOffsets } from './day-strip-layout';

const month = (date: Date) => String(date.getMonth() + 1);

describe('dayStripMarks', () => {
    it('étiquette le premier jour de chaque mois, séparateur hors premier', () => {
        const marks = dayStripMarks(
            [new Date(2027, 8, 25), new Date(2027, 8, 26), new Date(2027, 9, 2)],
            month,
        );
        expect(marks).toEqual([
            { monthLabel: '9', separatorBefore: false },
            { monthLabel: null, separatorBefore: false },
            { monthLabel: '10', separatorBefore: true },
        ]);
    });

    it('compare le mois année comprise', () => {
        const marks = dayStripMarks([new Date(2026, 0, 3), new Date(2027, 0, 3)], month);
        expect(marks[1]).toEqual({ monthLabel: '1', separatorBefore: true });
    });
});

describe('dayStripOffsets', () => {
    it('ajoute largeur de séparateur + écart au changement de mois', () => {
        const offsets = dayStripOffsets(
            [
                { monthLabel: '9', separatorBefore: false },
                { monthLabel: null, separatorBefore: false },
                { monthLabel: '10', separatorBefore: true },
            ],
            48,
            10,
            1,
        );
        expect(offsets).toEqual([0, 58, 58 + 58 + 11]);
    });
});
