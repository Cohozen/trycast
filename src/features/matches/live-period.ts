/**
 * Traduit le libellé d'état Highlightly (matches.live_period, ex. « First
 * Half ») en clé i18n courte pour la carte LIVE. Retourne null si le libellé
 * n'est pas une phase de jeu affichable (la carte montre alors « EN DIRECT »
 * seul). La minute exacte n'étant pas exposée de façon fiable, on s'en tient à
 * la période.
 */
export type LivePeriodKey =
    | 'matches:live.periods.firstHalf'
    | 'matches:live.periods.halfTime'
    | 'matches:live.periods.secondHalf'
    | 'matches:live.periods.extraTime'
    | 'matches:live.periods.breakTime'
    | 'matches:live.periods.penalties';

const PERIOD_KEYS: Record<string, LivePeriodKey> = {
    'first half': 'matches:live.periods.firstHalf',
    'half time': 'matches:live.periods.halfTime',
    'second half': 'matches:live.periods.secondHalf',
    'extra time': 'matches:live.periods.extraTime',
    'break time': 'matches:live.periods.breakTime',
    penalties: 'matches:live.periods.penalties',
};

export function livePeriodKey(period: string | null | undefined): LivePeriodKey | null {
    if (!period) {
        return null;
    }
    return PERIOD_KEYS[period.trim().toLowerCase()] ?? null;
}
