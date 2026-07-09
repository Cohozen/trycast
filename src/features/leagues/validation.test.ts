import { describe, expect, it } from 'vitest';

import { normalizeInviteCode, validateLeagueName } from './validation';

describe('validateLeagueName', () => {
    it.each([
        ['Les Bleus', null],
        ['   Les Bleus   ', null],
        ['abc', null],
        ['a'.repeat(40), null],
    ])('accepte %j', (input, expected) => {
        expect(validateLeagueName(input)).toBe(expected);
    });

    it.each([[''], ['   ']])('refuse le vide (%j)', (input) => {
        expect(validateLeagueName(input)).toBe('leagues:validation.nameRequired');
    });

    it.each([['ab'], ['a'.repeat(41)]])('refuse une longueur invalide (%j)', (input) => {
        expect(validateLeagueName(input)).toBe('leagues:validation.nameLength');
    });
});

describe('normalizeInviteCode', () => {
    it.each([
        ['E2ETEST2', 'E2ETEST2'],
        ['e2etest2', 'E2ETEST2'],
        ['  e2e test 2  ', 'E2ETEST2'],
        ['E2ET-EST2', 'E2ETEST2'],
    ])('normalise %j', (input, expected) => {
        expect(normalizeInviteCode(input)).toBe(expected);
    });

    it.each([
        [''],
        ['ABCDEFG'], // trop court
        ['ABCDEFGHJ'], // trop long
        ['ABCDEFG0'], // 0 exclu de l'alphabet
        ['ABCDEFGI'], // I exclu
        ['ABCDEFGO'], // O exclu
        ['ABCDEFG1'], // 1 exclu
        ['ABCDEFGL'], // L exclu
    ])('refuse %j', (input) => {
        expect(normalizeInviteCode(input)).toBeNull();
    });
});
