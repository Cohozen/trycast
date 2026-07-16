import { describe, expect, it } from 'vitest';

import { extractInviteCode, normalizeInviteCode, validateLeagueName } from './validation';

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

describe('extractInviteCode', () => {
    it.each([
        ['E2ETEST2', 'E2ETEST2'],
        ['  e2et-est2 ', 'E2ETEST2'],
        ['Rejoins ma ligue avec le code E2ETEST2 !', 'E2ETEST2'],
        ['https://trycast.app/join/E2ETEST2', 'E2ETEST2'],
        ['https://trycast.app/join?code=e2etest2', 'E2ETEST2'],
    ])('extrait %j', (input, expected) => {
        expect(extractInviteCode(input)).toBe(expected);
    });

    it.each([
        [''],
        ['aucun code ici'],
        ['ABCDEFG0'], // hors alphabet
        ['ABCDEFGHJKMN'], // séquence trop longue, pas un code isolé
        ['E2ETEST2 ou XW3KP7QM'], // deux candidats : ambigu, on ne devine pas
    ])('ne devine rien pour %j', (input) => {
        expect(extractInviteCode(input)).toBeNull();
    });
});
