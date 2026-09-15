import { describe, expect, it } from 'vitest';

import { FLAG_DEFS, starPoints } from './team-flags';

const NATIONS_CHAMPIONSHIP = [
    'FRA',
    'ENG',
    'IRL',
    'WAL',
    'SCO',
    'ITA',
    'NZL',
    'RSA',
    'AUS',
    'ARG',
    'JPN',
    'FIJ',
];

const HEX = /^#[0-9A-F]{6}$/i;

describe('FLAG_DEFS', () => {
    it('couvre les 12 nations du Nations Championship', () => {
        for (const code of NATIONS_CHAMPIONSHIP) {
            expect(FLAG_DEFS[code], code).toBeDefined();
        }
    });

    it('a une couleur de traînée hex, jamais blanche (invisible sur fond clair)', () => {
        for (const [code, def] of Object.entries(FLAG_DEFS)) {
            expect(def.primary, code).toMatch(HEX);
            expect(def.primary.toUpperCase(), code).not.toBe('#FFFFFF');
        }
    });

    it('a au moins une forme par drapeau, aux couleurs hex valides', () => {
        for (const [code, def] of Object.entries(FLAG_DEFS)) {
            expect(def.shapes.length, code).toBeGreaterThan(0);
            for (const shape of def.shapes) {
                expect(shape.fill, code).toMatch(HEX);
            }
        }
    });
});

describe('starPoints', () => {
    const parse = (points: string) =>
        points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);

    it('alterne 2×branches sommets entre rayon externe et interne', () => {
        const vertices = parse(starPoints(50, 50, 10, 4.5));
        expect(vertices).toHaveLength(10);
        vertices.forEach(([x, y], i) => {
            const radius = Math.hypot(x - 50, y - 50);
            expect(radius).toBeCloseTo(i % 2 === 0 ? 10 : 4.5, 0);
        });
    });

    it('pointe vers le haut et reste centrée sur (cx, cy)', () => {
        const vertices = parse(starPoints(20, 30, 8, 3.6));
        expect(vertices[0]).toEqual([20, 22]);
        const meanX = vertices.reduce((sum, [x]) => sum + x, 0) / vertices.length;
        const meanY = vertices.reduce((sum, [, y]) => sum + y, 0) / vertices.length;
        expect(meanX).toBeCloseTo(20, 0);
        expect(meanY).toBeCloseTo(30, 0);
    });
});
