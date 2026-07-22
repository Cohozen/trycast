import { beforeEach, describe, expect, it } from 'vitest';

import {
    isTelemetryEnabled,
    parseStoredPreference,
    resetTelemetryState,
    serializePreference,
    setTelemetryState,
    TELEMETRY_STORAGE_KEYS,
} from './telemetry-state';

beforeEach(() => {
    resetTelemetryState();
});

describe('parseStoredPreference', () => {
    it("laisse la télémétrie active au premier lancement (aucune clé stockée)", () => {
        expect(parseStoredPreference(null)).toBe(true);
        expect(parseStoredPreference(undefined)).toBe(true);
    });

    it('ne désactive que sur le littéral false', () => {
        expect(parseStoredPreference('false')).toBe(false);
        expect(parseStoredPreference('true')).toBe(true);
    });

    it('reste active sur une valeur corrompue plutôt que de couper en silence', () => {
        expect(parseStoredPreference('')).toBe(true);
        expect(parseStoredPreference('nope')).toBe(true);
        expect(parseStoredPreference('0')).toBe(true);
    });

    it('fait un aller-retour avec serializePreference', () => {
        expect(parseStoredPreference(serializePreference(true))).toBe(true);
        expect(parseStoredPreference(serializePreference(false))).toBe(false);
    });
});

describe('état en mémoire', () => {
    it('démarre actif pour les deux télémétries (opt-out)', () => {
        expect(isTelemetryEnabled('analytics')).toBe(true);
        expect(isTelemetryEnabled('diagnostics')).toBe(true);
    });

    it('bascule indépendamment chaque télémétrie', () => {
        setTelemetryState('analytics', false);
        expect(isTelemetryEnabled('analytics')).toBe(false);
        expect(isTelemetryEnabled('diagnostics')).toBe(true);
    });
});

describe('clés de stockage', () => {
    it('sont préfixées comme les autres préférences locales du projet', () => {
        // Même convention que trycast.theme-preference : un renommage casserait
        // le réglage déjà posé sur les appareils.
        expect(TELEMETRY_STORAGE_KEYS.analytics).toBe('trycast.telemetry.analytics');
        expect(TELEMETRY_STORAGE_KEYS.diagnostics).toBe('trycast.telemetry.diagnostics');
    });
});
