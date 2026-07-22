import { useCallback, useEffect, useState } from 'react';

import { setAnalyticsEnabled } from '@/lib/analytics';
import { setDiagnosticsEnabled } from '@/lib/diagnostics';
import { loadTelemetryPreference, setTelemetryPreference } from './telemetry-preference';
import { isTelemetryEnabled, type TelemetryKind } from './telemetry-state';
import { useSetConsent } from './use-consent';

function applyToSdk(kind: TelemetryKind, enabled: boolean): void {
    if (kind === 'analytics') setAnalyticsEnabled(enabled);
    else setDiagnosticsEnabled(enabled);
}

/**
 * Pilote un interrupteur de télémétrie depuis Réglages → Confidentialité.
 *
 * La bascule fait trois choses, dans cet ordre : elle applique l'effet tout de
 * suite (état mémoire + SDK), elle persiste la préférence sur l'appareil, puis
 * elle enregistre la trace horodatée dans `consents` — cette dernière au
 * mieux : un échec réseau ne doit jamais empêcher quelqu'un de couper la
 * télémétrie.
 */
export function useTelemetrySetting(kind: TelemetryKind, userId: string) {
    const [enabled, setEnabled] = useState(() => isTelemetryEnabled(kind));
    const setConsent = useSetConsent(userId, kind);

    // L'état mémoire est déjà hydraté au démarrage, mais l'écran peut monter
    // avant que la lecture disque soit terminée.
    useEffect(() => {
        loadTelemetryPreference(kind).then(setEnabled);
    }, [kind]);

    const toggle = useCallback(() => {
        const next = !enabled;
        setEnabled(next);
        applyToSdk(kind, next);
        void setTelemetryPreference(kind, next);
        if (userId) setConsent.mutate(next);
    }, [enabled, kind, userId, setConsent]);

    return { enabled, toggle };
}
