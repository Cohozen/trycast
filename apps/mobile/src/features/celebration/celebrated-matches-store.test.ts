import { describe, expect, it } from 'vitest';

import {
    celebratedStorageKey,
    parseCelebratedState,
    resolveCelebratedState,
    withCelebrated,
} from './celebrated-matches-store';

describe('parseCelebratedState', () => {
    it('repli sur état vide non initialisé si absent', () => {
        expect(parseCelebratedState(null)).toEqual({ initialized: false, matchIds: [] });
    });

    it('repli sur état vide si JSON corrompu ou forme inattendue', () => {
        expect(parseCelebratedState('{not json')).toEqual({ initialized: false, matchIds: [] });
        expect(parseCelebratedState('[]')).toEqual({ initialized: false, matchIds: [] });
        expect(parseCelebratedState('{"matchIds":"nope"}')).toEqual({
            initialized: false,
            matchIds: [],
        });
    });

    it('lit un état valide et filtre les IDs non-string', () => {
        expect(parseCelebratedState('{"initialized":true,"matchIds":["a",1,"b",null]}')).toEqual({
            initialized: true,
            matchIds: ['a', 'b'],
        });
    });
});

describe('withCelebrated', () => {
    it('marque comme initialisé et fait l’union sans doublon', () => {
        const state = withCelebrated({ initialized: false, matchIds: ['a'] }, ['a', 'b']);
        expect(state).toEqual({ initialized: true, matchIds: ['a', 'b'] });
    });

    it('scelle l’initialisation même sans nouvel ID (baseline vide)', () => {
        expect(withCelebrated({ initialized: false, matchIds: [] }, [])).toEqual({
            initialized: true,
            matchIds: [],
        });
    });
});

describe('celebratedStorageKey', () => {
    it('range chaque compte sous sa propre clé', () => {
        expect(celebratedStorageKey('cohozen')).not.toBe(celebratedStorageKey('hugo'));
    });
});

describe('resolveCelebratedState', () => {
    const cohozen = '{"initialized":true,"matchIds":["rsa-sco"]}';

    it('un compte neuf sur un appareil déjà initialisé repart non initialisé', () => {
        // Hugo après Cohozen : ni ses gains masqués par la liste de Cohozen, ni
        // tout son historique d'un coup (absorbé à la première visite)
        expect(resolveCelebratedState(null, null)).toEqual({
            state: { initialized: false, matchIds: [] },
            fromLegacy: false,
        });
    });

    it('lit l’état propre au compte, sans toucher à la clé héritée', () => {
        expect(resolveCelebratedState(cohozen, '{"initialized":true,"matchIds":["x"]}')).toEqual({
            state: { initialized: true, matchIds: ['rsa-sco'] },
            fromLegacy: false,
        });
    });

    it('reprend la clé héritée quand le compte n’a pas encore la sienne', () => {
        expect(resolveCelebratedState(null, cohozen)).toEqual({
            state: { initialized: true, matchIds: ['rsa-sco'] },
            fromLegacy: true,
        });
    });
});
