import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/create-i18n';

describe('createI18n', () => {
    it('sert le français pour une langue device supportée', () => {
        const i18n = createI18n('fr');
        expect(i18n.language).toBe('fr');
        expect(i18n.t('common:tabs.matches')).toBe('Matchs');
    });

    it('retombe sur le français pour une langue non livrée', () => {
        const i18n = createI18n('en');
        expect(i18n.t('common:actions.cancel')).toBe('Annuler');
    });

    it('résout le namespace par défaut (common) sans préfixe', () => {
        const i18n = createI18n('fr');
        expect(i18n.t('errors.generic')).toBe('Une erreur est survenue. Réessaie.');
    });
});
