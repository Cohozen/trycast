import { describe, expect, it } from 'vitest';

import {
    parsePendingInvite,
    PENDING_INVITE_TTL_MS,
    serializePendingInvite,
} from './pending-invite-store';

const NOW = 1_800_000_000_000;

describe('parsePendingInvite', () => {
    it('relit ce que serializePendingInvite a écrit', () => {
        expect(parsePendingInvite(serializePendingInvite('E2ETEST2', NOW), NOW)).toBe('E2ETEST2');
    });

    it('normalise le code relu', () => {
        expect(parsePendingInvite(serializePendingInvite('e2etest2', NOW), NOW)).toBe('E2ETEST2');
    });

    it('rend null quand rien n’est stocké', () => {
        expect(parsePendingInvite(null, NOW)).toBeNull();
        expect(parsePendingInvite(undefined, NOW)).toBeNull();
        expect(parsePendingInvite('', NOW)).toBeNull();
    });

    it('accepte une invitation encore fraîche', () => {
        const stored = serializePendingInvite('E2ETEST2', NOW);
        expect(parsePendingInvite(stored, NOW + PENDING_INVITE_TTL_MS)).toBe('E2ETEST2');
    });

    it('abandonne une invitation périmée', () => {
        const stored = serializePendingInvite('E2ETEST2', NOW);
        expect(parsePendingInvite(stored, NOW + PENDING_INVITE_TTL_MS + 1)).toBeNull();
    });

    it.each([
        ['pas du JSON', 'E2ETEST2'],
        ['un JSON non-objet', '"E2ETEST2"'],
        ['un objet vide', '{}'],
        ['un horodatage manquant', '{"code":"E2ETEST2"}'],
        ['un horodatage non numérique', '{"code":"E2ETEST2","at":"hier"}'],
        ['un code non textuel', '{"code":42,"at":1800000000000}'],
        // Défense en profondeur : une valeur trafiquée ne doit pas piloter la
        // navigation, même si l'écriture l'avait validée.
        ['un code hors alphabet', '{"code":"ABCDEFG0","at":1800000000000}'],
        ['un chemin déguisé en code', '{"code":"../../settings","at":1800000000000}'],
    ])('rend null pour %s', (_label, stored) => {
        expect(parsePendingInvite(stored, NOW)).toBeNull();
    });
});
