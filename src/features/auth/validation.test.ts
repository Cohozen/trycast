import { describe, expect, it } from 'vitest';

import {
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validateUsername,
} from './validation';

describe('validateUsername', () => {
    it.each([
        ['abc', null],
        ['Corentin_29', null],
        ['a'.repeat(20), null],
        ['AB_12', null],
    ])('accepte %s', (username, expected) => {
        expect(validateUsername(username)).toBe(expected);
    });

    it.each([
        ['ab', 'trop court'],
        ['', 'vide'],
        ['a'.repeat(21), 'trop long'],
        ['pseudo avec espaces', 'espaces'],
        ['pseudo-tiret', 'tiret'],
        ['pséudo', 'accent'],
        ['pseudo🏉', 'emoji'],
    ])('refuse %s (%s)', (username) => {
        expect(validateUsername(username)).not.toBeNull();
    });

    it('est aligné sur la contrainte SQL username_format (3-20, [A-Za-z0-9_])', () => {
        // Miroir du CHECK en base : si ce test casse, penser à migrer la contrainte SQL
        expect(validateUsername('x'.repeat(3))).toBeNull();
        expect(validateUsername('x'.repeat(20))).toBeNull();
        expect(validateUsername('x'.repeat(2))).not.toBeNull();
        expect(validateUsername('x'.repeat(21))).not.toBeNull();
    });
});

describe('validateEmail', () => {
    it.each(['corentin@exemple.fr', 'a@b.co', '  padded@mail.com  '])('accepte %s', (email) => {
        expect(validateEmail(email)).toBeNull();
    });

    it.each([
        '',
        'pas-un-email',
        'manque@tld',
        '@sans-local.fr',
        'espace @mail.fr',
    ])('refuse %s', (email) => {
        expect(validateEmail(email)).not.toBeNull();
    });
});

describe('validatePassword', () => {
    it('accepte 8 caractères et plus', () => {
        expect(validatePassword('12345678')).toBeNull();
        expect(validatePassword('un mot de passe long')).toBeNull();
    });

    it('refuse moins de 8 caractères', () => {
        expect(validatePassword('1234567')).not.toBeNull();
        expect(validatePassword('')).not.toBeNull();
    });
});

describe('validatePasswordConfirmation', () => {
    it('accepte deux mots de passe identiques', () => {
        expect(validatePasswordConfirmation('12345678', '12345678')).toBeNull();
    });

    it('refuse une vérification différente', () => {
        expect(validatePasswordConfirmation('12345678', '1234567')).toBe(
            'auth:validation.passwordMismatch',
        );
    });
});
