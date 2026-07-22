import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    parseStoredPreference,
    serializePreference,
    setTelemetryState,
    TELEMETRY_STORAGE_KEYS,
    type TelemetryKind,
} from './telemetry-state';

/**
 * Persistance des préférences de télémétrie, sur le modèle de
 * `profile/theme-preference.ts`. La préférence est **locale à l'appareil** et
 * non un enregistrement de la table `consents` : les deux SDK démarrent avant
 * toute session, or `consents` est indexée sur auth.uid() — un plantage sur
 * l'écran de connexion échapperait au réglage. La table sert de trace
 * horodatée (exigence RGPD), pas de garde-fou runtime.
 *
 * La logique de décision vit dans `telemetry-state.ts` (module pur, testé).
 */

export async function loadTelemetryPreference(kind: TelemetryKind): Promise<boolean> {
    const stored = await AsyncStorage.getItem(TELEMETRY_STORAGE_KEYS[kind]);
    const enabled = parseStoredPreference(stored);
    setTelemetryState(kind, enabled);
    return enabled;
}

export async function setTelemetryPreference(
    kind: TelemetryKind,
    enabled: boolean,
): Promise<void> {
    // L'état mémoire d'abord : la bascule doit prendre effet immédiatement,
    // même si l'écriture disque traîne ou échoue.
    setTelemetryState(kind, enabled);
    await AsyncStorage.setItem(TELEMETRY_STORAGE_KEYS[kind], serializePreference(enabled));
}

/** À appeler au démarrage : hydrate l'état mémoire depuis le disque. */
export async function hydrateTelemetryPreferences(): Promise<void> {
    await Promise.all([loadTelemetryPreference('analytics'), loadTelemetryPreference('diagnostics')]);
}
