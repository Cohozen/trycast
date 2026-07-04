import { describe, expect, it } from 'vitest';
import { TEAM_METADATA, findTeamMetadata } from './team-metadata';

describe('TEAM_METADATA', () => {
    it('contient une trentaine de nations', () => {
        expect(Object.keys(TEAM_METADATA).length).toBeGreaterThanOrEqual(28);
    });

    it('a des tricodes uniques, en 3 lettres majuscules', () => {
        const codes = Object.values(TEAM_METADATA).map((m) => m.code);
        expect(new Set(codes).size).toBe(codes.length);
        for (const code of codes) {
            expect(code).toMatch(/^[A-Z]{3}$/);
        }
    });

    it('a des couleurs en hexadécimal', () => {
        for (const { color } of Object.values(TEAM_METADATA)) {
            expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        }
    });

    it('a un emoji drapeau non vide pour chaque nation', () => {
        for (const { flagEmoji } of Object.values(TEAM_METADATA)) {
            expect(flagEmoji.length).toBeGreaterThan(0);
        }
    });
});

describe('findTeamMetadata', () => {
    it('retrouve une nation par son nom exact', () => {
        expect(findTeamMetadata('New Zealand')?.code).toBe('NZL');
    });

    it('est insensible à la casse et aux espaces', () => {
        expect(findTeamMetadata('  new zealand ')?.code).toBe('NZL');
        expect(findTeamMetadata('FRANCE')?.code).toBe('FRA');
    });

    it('résout les alias Highlightly vers la nation', () => {
        expect(findTeamMetadata('Fijian Drua')?.code).toBe('FIJ');
    });

    it('renvoie null pour une nation hors mapping', () => {
        expect(findTeamMetadata('Barbarians')).toBeNull();
    });
});
