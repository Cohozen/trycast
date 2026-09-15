import { describe, expect, it } from 'vitest';

import { buildWelcomeSteps } from './build-welcome-steps';

const keys = (permission: 'granted' | 'undetermined' | 'denied', pushSupported = true) =>
    buildWelcomeSteps({ permission, pushSupported });

describe('buildWelcomeSteps', () => {
    it('affiche toujours les quatre volets dans le même ordre', () => {
        for (const permission of ['granted', 'undetermined', 'denied'] as const) {
            expect(keys(permission).map((step) => step.key)).toEqual([
                'intro',
                'predictions',
                'leagues',
                'notifications',
            ]);
            expect(keys(permission, false)).toHaveLength(4);
        }
    });

    it('renvoie vers les règles et les ligues, quoi qu’il arrive', () => {
        const steps = keys('granted');
        expect(steps[1]?.action).toBe('rules');
        expect(steps[2]?.action).toBe('leagues');
    });

    it('propose d’activer les notifications tant que rien n’a été demandé', () => {
        expect(keys('undetermined').at(-1)?.action).toBe('enable-notifications');
    });

    it('renvoie aux réglages OS après un refus définitif', () => {
        expect(keys('denied').at(-1)?.action).toBe('open-os-settings');
    });

    it('n’offre aucun bouton si la permission est déjà accordée', () => {
        expect(keys('granted').at(-1)?.action).toBeNull();
    });

    it('n’offre aucun bouton là où le push n’existe pas (émulateur, web)', () => {
        for (const permission of ['granted', 'undetermined', 'denied'] as const) {
            expect(keys(permission, false).at(-1)?.action).toBeNull();
        }
    });
});
