import * as Sentry from '@sentry/react-native';

import { isTelemetryEnabled } from '@/features/privacy/telemetry-state';

/**
 * Suivi des plantages via Sentry (organisation en résidence de données
 * européenne — l'hôte du DSN est `…ingest.de.sentry.io`).
 *
 * Périmètre volontairement restreint aux **plantages et erreurs** : pas de
 * mesure de performance, pas de rejeu de session. Aucun identifiant
 * utilisateur n'est attaché (`Sentry.setUser` n'est jamais appelé) et
 * `sendDefaultPii` reste à false.
 *
 * L'initialisation se fait au plus tôt (scope module de `app/_layout.tsx`)
 * pour attraper les plantages de démarrage, et la coupure passe par
 * `beforeSend` plutôt que par une ré-initialisation : c'est la façon
 * documentée d'éteindre Sentry à chaud, et surtout la seule qui n'oblige pas
 * à attendre la lecture d'AsyncStorage avant de pouvoir capturer quoi que ce
 * soit.
 *
 * Sans `EXPO_PUBLIC_SENTRY_DSN`, tout ce module est inerte.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initDiagnostics(): void {
    if (!DSN) return;

    Sentry.init({
        dsn: DSN,
        sendDefaultPii: false,
        // Plantages et erreurs uniquement : aucune trace de performance.
        tracesSampleRate: 0,
        // Le fil d'Ariane aide à reconstituer le chemin jusqu'au plantage ;
        // il ne contient que des noms d'écrans et des appels réseau.
        enableAutoPerformanceTracing: false,
        beforeSend: (event) => (isTelemetryEnabled('diagnostics') ? event : null),
        beforeBreadcrumb: (breadcrumb) =>
            isTelemetryEnabled('diagnostics') ? breadcrumb : null,
    });
}

/**
 * Bascule à chaud depuis Réglages → Confidentialité. Rien à faire ici : le
 * `beforeSend` relit l'état à chaque envoi. La fonction existe pour purger le
 * fil d'Ariane accumulé avant la coupure — sans quoi le prochain rapport
 * (après réactivation) contiendrait un historique que l'utilisateur pensait
 * avoir refusé.
 */
export function setDiagnosticsEnabled(enabled: boolean): void {
    if (!DSN || enabled) return;
    Sentry.getCurrentScope().clearBreadcrumbs();
}
