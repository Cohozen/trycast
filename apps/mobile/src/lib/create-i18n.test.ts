import { describe, expect, it } from 'vitest';

import { createI18n, resources } from '@/lib/create-i18n';

describe('createI18n', () => {
    it('sert le français pour une langue device supportée', () => {
        const i18n = createI18n('fr');
        expect(i18n.language).toBe('fr');
        expect(i18n.t('common:tabs.matches')).toBe('Matchs');
    });

    it('sert l’anglais pour une langue device anglaise', () => {
        const i18n = createI18n('en');
        expect(i18n.t('common:actions.cancel')).toBe('Cancel');
    });

    it('retombe sur le français pour une langue non livrée', () => {
        const i18n = createI18n('es');
        expect(i18n.t('common:actions.cancel')).toBe('Annuler');
    });

    it('résout le namespace par défaut (common) sans préfixe', () => {
        const i18n = createI18n('fr');
        expect(i18n.t('errors.generic')).toBe('Une erreur est survenue. Réessaie.');
    });
});

/**
 * Parité des clés entre langues. Le typage i18next (i18next.d.ts) n'est basé
 * que sur FR : une clé EN manquante ou en trop ne casse PAS `tsc`. Ce test est
 * donc le garde-fou — il échoue dès qu'un namespace diverge entre FR et EN.
 */

/** Chemins de toutes les feuilles d'un arbre de traduction, triés. */
function leafPaths(obj: unknown, prefix = ''): string[] {
    if (obj === null || typeof obj !== 'object') return [prefix];
    return Object.entries(obj as Record<string, unknown>)
        .flatMap(([key, value]) => leafPaths(value, prefix ? `${prefix}.${key}` : key))
        .sort();
}

const LANGUAGES = Object.keys(resources) as (keyof typeof resources)[];
const SOURCE = 'fr' as const;
const NAMESPACES = Object.keys(resources[SOURCE]) as (keyof (typeof resources)['fr'])[];

describe('parité des ressources i18n', () => {
    it('déclare les mêmes namespaces pour chaque langue', () => {
        for (const lang of LANGUAGES) {
            expect(Object.keys(resources[lang]).sort()).toEqual([...NAMESPACES].sort());
        }
    });

    for (const ns of NAMESPACES) {
        for (const lang of LANGUAGES) {
            if (lang === SOURCE) continue;
            it(`${lang}/${String(ns)} a exactement les clés de fr/${String(ns)}`, () => {
                expect(leafPaths(resources[lang][ns])).toEqual(leafPaths(resources[SOURCE][ns]));
            });
        }
    }
});
