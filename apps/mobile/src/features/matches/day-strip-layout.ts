/** Repères de mois d'une pilule de la bande Résultats (DS 2026-09-21). */
export type DayStripMark = {
    /** Mois abrégé, sur le premier jour affiché de chaque mois ; sinon null. */
    monthLabel: string | null;
    /** Séparateur vertical avant la pilule : changement de mois (hors 1re). */
    separatorBefore: boolean;
};

/**
 * Marque le premier jour de chaque mois : libellé du mois sur la pilule et
 * séparateur avant elle (sauf pour la toute première, qui porte seulement
 * son mois). Le mois se compare année comprise (décembre → janvier).
 */
export function dayStripMarks(
    dates: readonly Date[],
    formatMonth: (date: Date) => string,
): DayStripMark[] {
    let previous: string | null = null;
    return dates.map((date) => {
        const month = `${date.getFullYear()}-${date.getMonth()}`;
        const isNewMonth = month !== previous;
        const mark = {
            monthLabel: isNewMonth ? formatMonth(date) : null,
            separatorBefore: isNewMonth && previous !== null,
        };
        previous = month;
        return mark;
    });
}

/**
 * Décalage horizontal de chaque pilule par rapport à la première. Le pas
 * n'est plus constant : un séparateur ajoute sa largeur plus un écart.
 * L'indicateur grenat et le recentrage interpolent sur ces positions.
 */
export function dayStripOffsets(
    marks: readonly DayStripMark[],
    pillWidth: number,
    gap: number,
    separatorWidth: number,
): number[] {
    let x = 0;
    return marks.map((mark, index) => {
        if (index > 0) x += pillWidth + gap;
        if (mark.separatorBefore) x += separatorWidth + gap;
        return x;
    });
}
