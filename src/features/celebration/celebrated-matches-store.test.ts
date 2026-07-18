import { describe, expect, it } from 'vitest';

import { parseCelebratedState, withCelebrated } from './celebrated-matches-store';

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
