import { describe, expect, it } from 'vitest';

import { initialsOf } from './initials';

describe('initialsOf', () => {
    it('prend les deux premières lettres d’un nom en un mot', () => {
        expect(initialsOf('Toulouse')).toBe('TO');
    });

    it('prend les initiales des deux premiers mots', () => {
        expect(initialsOf('Les Potes du Sud')).toBe('LP');
    });

    it('ignore les espaces superflus', () => {
        expect(initialsOf('  les   bleus  ')).toBe('LB');
    });

    it('retombe sur ? quand le nom est vide', () => {
        expect(initialsOf('')).toBe('?');
        expect(initialsOf('   ')).toBe('?');
    });

    it('gère un nom d’une seule lettre', () => {
        expect(initialsOf('x')).toBe('X');
    });
});
