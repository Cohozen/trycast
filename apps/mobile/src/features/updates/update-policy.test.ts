import { describe, expect, it } from 'vitest';

import {
    CHECK_INTERVAL_MS,
    SILENT_RELOAD_AFTER_MS,
    shouldCheckForUpdate,
    shouldReloadSilently,
} from './update-policy';

const now = Date.UTC(2026, 8, 26, 12);

describe('shouldCheckForUpdate', () => {
    it('cherche si aucune recherche depuis le lancement', () => {
        expect(shouldCheckForUpdate(undefined, now)).toBe(true);
    });

    it('ne cherche pas avant la fin de l’intervalle', () => {
        expect(shouldCheckForUpdate(new Date(now - CHECK_INTERVAL_MS + 1), now)).toBe(false);
    });

    it('cherche une fois l’intervalle écoulé', () => {
        expect(shouldCheckForUpdate(new Date(now - CHECK_INTERVAL_MS), now)).toBe(true);
    });
});

describe('shouldReloadSilently', () => {
    const longAgo = now - SILENT_RELOAD_AFTER_MS;

    it('recharge après une longue absence avec une mise à jour en attente', () => {
        expect(
            shouldReloadSilently({ pending: true, backgroundedAt: longAgo, linkedAt: null, now }),
        ).toBe(true);
    });

    it('ne recharge pas sans mise à jour en attente', () => {
        expect(
            shouldReloadSilently({ pending: false, backgroundedAt: longAgo, linkedAt: null, now }),
        ).toBe(false);
    });

    it('ne recharge pas après une absence courte', () => {
        expect(
            shouldReloadSilently({
                pending: true,
                backgroundedAt: longAgo + 1,
                linkedAt: null,
                now,
            }),
        ).toBe(false);
    });

    it('ne recharge pas sans passage en arrière-plan', () => {
        expect(
            shouldReloadSilently({ pending: true, backgroundedAt: null, linkedAt: null, now }),
        ).toBe(false);
    });

    it('ne recharge pas une app rouverte par un lien ou une notification', () => {
        expect(
            shouldReloadSilently({ pending: true, backgroundedAt: longAgo, linkedAt: now, now }),
        ).toBe(false);
    });

    it('ignore un lien reçu avant le passage en arrière-plan', () => {
        expect(
            shouldReloadSilently({
                pending: true,
                backgroundedAt: longAgo,
                linkedAt: longAgo - 1,
                now,
            }),
        ).toBe(true);
    });
});
