import { dispose, init, trackEvent as aptabaseTrackEvent } from '@aptabase/react-native';
import { nativeApplicationVersion } from 'expo-application';

import { isTelemetryEnabled } from '@/features/privacy/telemetry-state';
import { type AnalyticsEvent, toAptabaseProps } from './analytics-events';

/**
 * Mesure d'usage via Aptabase (région EU — encodée dans la clé `A-EU-…`).
 *
 * Sessions anonymes par construction : aucun identifiant d'appareil, aucun
 * cookie, sel rotatif quotidien côté serveur. Le catalogue d'événements typé
 * (`analytics-events.ts`) interdit en plus de faire passer une donnée
 * personnelle par les propriétés.
 *
 * Sans `EXPO_PUBLIC_APTABASE_KEY`, tout ce module est inerte : la CI et un
 * clone frais du dépôt fonctionnent sans configuration.
 */

const APP_KEY = process.env.EXPO_PUBLIC_APTABASE_KEY;

let started = false;

function start(): void {
    if (started || !APP_KEY) return;
    init(APP_KEY, {
        // Hors build natif (web), le SDK ne peut pas lire la version : on la
        // fournit pour que les événements restent rattachables à une version.
        appVersion: nativeApplicationVersion ?? undefined,
    });
    started = true;
}

function stop(): void {
    if (!started) return;
    dispose();
    started = false;
}

/**
 * À appeler une fois au démarrage, après hydratation des préférences.
 * N'initialise le SDK que si la clé existe **et** que l'utilisateur n'a pas
 * coupé la mesure.
 */
export function initAnalytics(): void {
    if (isTelemetryEnabled('analytics')) start();
}

/** Bascule à chaud depuis Réglages → Confidentialité. */
export function setAnalyticsEnabled(enabled: boolean): void {
    if (enabled) start();
    else stop();
}

/**
 * Enregistre un événement du catalogue. Sans effet si la mesure est coupée ou
 * si aucune clé n'est configurée — les appelants n'ont jamais à s'en soucier.
 */
export function trackEvent(event: AnalyticsEvent): void {
    if (!started || !isTelemetryEnabled('analytics')) return;

    if (__DEV__) {
        console.log('[analytics]', event.name, toAptabaseProps(event) ?? '');
    }

    // Les propriétés passent par toAptabaseProps : la doc d'Aptabase n'admet
    // que des chaînes et des nombres, alors que ses types acceptent aussi les
    // booléens. On convertit plutôt que de faire confiance au type.
    aptabaseTrackEvent(event.name, toAptabaseProps(event));
}
