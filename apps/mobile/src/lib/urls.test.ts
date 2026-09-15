import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { type LegalPage, legalUrl } from './urls';

const pathOf = (url: string) => new URL(url).pathname;

describe('legalUrl', () => {
    it.each([
        ['le français', 'fr', '/confidentialite'],
        ["l'anglais", 'en', '/en/privacy'],
        ["l'anglais régional", 'en-GB', '/en/privacy'],
        // L'app retombe sur le français pour une langue qu'elle ne gère pas :
        // la page suit ce que l'utilisateur a sous les yeux.
        ['une langue non gérée', 'de', '/confidentialite'],
        ['une langue inconnue', undefined, '/confidentialite'],
    ])('ouvre la page dans %s', (_label, language, expected) => {
        expect(pathOf(legalUrl('privacy', language))).toBe(expected);
    });
});

/**
 * Les slugs viennent du site (table `routes` de apps/web/src/i18n/index.ts), que
 * l'app ne peut pas importer : apps/web/ est un paquet à part. Une page renommée
 * d'un côté seulement ouvrirait une 404 dans l'app, sans que rien ne le signale.
 */
function parseSiteRoutes(): Record<string, { fr: string; en: string }> {
    const source = readFileSync(
        fileURLToPath(new URL('../../../web/src/i18n/index.ts', import.meta.url)),
        'utf8',
    );
    const routes: Record<string, { fr: string; en: string }> = {};
    for (const [, name, fr, en] of source.matchAll(
        /(\w+):\s*\{\s*fr:\s*'([^']+)',\s*en:\s*'([^']+)',?\s*\}/g,
    )) {
        routes[name] = { fr, en };
    }
    return routes;
}

describe('pages légales app ↔ site', () => {
    const siteRoutes = parseSiteRoutes();

    it.each<LegalPage>(['terms', 'privacy', 'legalNotice'])(
        'ouvre les chemins que le site sert pour « %s »',
        (page) => {
            expect(siteRoutes[page], `route « ${page} » absente du site`).toBeDefined();
            expect(pathOf(legalUrl(page, 'fr'))).toBe(siteRoutes[page].fr);
            expect(pathOf(legalUrl(page, 'en'))).toBe(siteRoutes[page].en);
        },
    );
});
