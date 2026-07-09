/** Jour de la bande de sélection (maquette Résultats). */
export type StripDay = {
    key: string;
    date: Date;
    /** Des résultats existent ce jour-là (sinon pilule désactivée). */
    hasMatches: boolean;
    isToday: boolean;
};

/** Clé locale « YYYY-MM-DD » d'une date ou d'un ISO datetime. */
export function dayKeyOf(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/** « YYYY-MM-DD » → minuit local (new Date(iso) seul serait interprété UTC). */
function parseDateOnly(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

type DayRangeOptions = {
    /** competitions.starts_on */
    startsOn: string;
    /** competitions.ends_on */
    endsOn: string;
    /** Clés (dayKeyOf) des jours ayant des résultats. */
    matchDayKeys: ReadonlySet<string>;
    today?: Date;
};

/**
 * Plage continue de jours de la bande Résultats, du plus récent au plus
 * ancien : du début de la compétition à aujourd'hui (borné à sa fin), les
 * jours sans match restant affichés mais désactivés. Les bornes s'étendent
 * si un jour de match tombe dehors (fuseau, données) — aucun résultat ne
 * doit devenir inatteignable.
 */
export function buildDayRange(options: DayRangeOptions): StripDay[] {
    const { startsOn, endsOn, matchDayKeys, today = new Date() } = options;
    const todayKey = dayKeyOf(today);
    const sortedKeys = [...matchDayKeys].sort();

    let start = parseDateOnly(startsOn);
    let end = parseDateOnly(dayKeyOf(today) < endsOn ? dayKeyOf(today) : endsOn);
    if (sortedKeys.length > 0) {
        const firstMatchDay = parseDateOnly(sortedKeys[0]);
        const lastMatchDay = parseDateOnly(sortedKeys[sortedKeys.length - 1]);
        if (firstMatchDay < start) start = firstMatchDay;
        if (lastMatchDay > end) end = lastMatchDay;
    }
    if (start > end) return [];

    const days: StripDay[] = [];
    for (const cursor = new Date(end); cursor >= start; cursor.setDate(cursor.getDate() - 1)) {
        const date = new Date(cursor);
        const key = dayKeyOf(date);
        days.push({ key, date, hasMatches: matchDayKeys.has(key), isToday: key === todayKey });
    }
    return days;
}
