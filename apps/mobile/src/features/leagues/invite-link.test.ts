import { describe, expect, it } from 'vitest';

import { inviteCodeFromPath } from './invite-link';

describe('inviteCodeFromPath', () => {
    it.each([
        ['un lien complet', 'https://www.trycast.fr/rejoindre/E2ETEST2'],
        ['un chemin nu', '/rejoindre/E2ETEST2'],
        ['un slash final', 'https://www.trycast.fr/rejoindre/E2ETEST2/'],
        // L'hôte n'est pas filtré : c'est le système qui décide ce qui arrive.
        ["l'apex", 'https://trycast.fr/rejoindre/E2ETEST2'],
        ['une casse minuscule', 'https://www.trycast.fr/rejoindre/e2etest2'],
        ['une requête en plus', 'https://www.trycast.fr/rejoindre/E2ETEST2?utm_source=wa'],
    ])('extrait le code depuis %s', (_label, path) => {
        expect(inviteCodeFromPath(path)).toBe('E2ETEST2');
    });

    it.each([
        ['la racine', 'https://www.trycast.fr/'],
        ['une autre page', 'https://www.trycast.fr/cgu'],
        ['le chemin sans code', 'https://www.trycast.fr/rejoindre'],
        ['un segment de trop', 'https://www.trycast.fr/rejoindre/E2ETEST2/extra'],
        ['un code hors alphabet', 'https://www.trycast.fr/rejoindre/ABCDEFG0'],
        ['un code trop court', 'https://www.trycast.fr/rejoindre/ABC'],
        ['une chaîne quelconque', 'pas une url'],
        ['une chaîne vide', ''],
        // Le lien que produit la page web vise déjà la bonne route : il n'y a
        // rien à réécrire, et le laisser passer inchangé est le comportement
        // attendu.
        ['le deep link direct', 'trycast://league/new?tab=join&code=E2ETEST2'],
    ])('ne réécrit pas %s', (_label, path) => {
        expect(inviteCodeFromPath(path)).toBeNull();
    });
});
