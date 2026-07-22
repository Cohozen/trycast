/**
 * État en mémoire des deux télémétries (mesure d'usage, diagnostics).
 *
 * Module pur, sans aucun import natif : les enveloppes SDK doivent pouvoir
 * décider d'envoyer ou non de façon **synchrone** — le `beforeSend` de Sentry
 * n'attend personne — alors qu'AsyncStorage est asynchrone. L'état vit donc
 * ici, et `telemetry-preference.ts` se charge de l'hydrater depuis le disque.
 *
 * Opt-out assumé : tant qu'aucun « false » explicite n'a été lu, la télémétrie
 * est considérée active. C'est ce qui permet de capturer un plantage survenu
 * avant même que la préférence ait fini d'être relue.
 */

export type TelemetryKind = 'analytics' | 'diagnostics';

export const TELEMETRY_STORAGE_KEYS: Record<TelemetryKind, string> = {
    analytics: 'trycast.telemetry.analytics',
    diagnostics: 'trycast.telemetry.diagnostics',
};

const state: Record<TelemetryKind, boolean> = { analytics: true, diagnostics: true };

/**
 * Interprète la valeur stockée. Seul le littéral 'false' désactive : une clé
 * absente (premier lancement) ou corrompue laisse la télémétrie active, ce qui
 * est le comportement opt-out attendu.
 */
export function parseStoredPreference(stored: string | null | undefined): boolean {
    return stored !== 'false';
}

/** Sérialisation symétrique de `parseStoredPreference`. */
export function serializePreference(enabled: boolean): string {
    return enabled ? 'true' : 'false';
}

/** Lecture synchrone, utilisée par les enveloppes SDK à chaque envoi. */
export function isTelemetryEnabled(kind: TelemetryKind): boolean {
    return state[kind];
}

export function setTelemetryState(kind: TelemetryKind, enabled: boolean): void {
    state[kind] = enabled;
}

/** Remet l'état à sa valeur de départ — réservé aux tests. */
export function resetTelemetryState(): void {
    state.analytics = true;
    state.diagnostics = true;
}
