import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { palette } from './palette';

/**
 * Les hex sont dupliqués entre src/global.css (classes NativeWind) et
 * src/tw/palette.ts (couleurs lues en JS) — react-native-css n'expose pas
 * les variables CSS au runtime natif. Ce test garantit que les deux
 * fichiers décrivent exactement les mêmes couleurs, dans les deux sens.
 */
function parseCssColors(): Record<string, { light: string; dark: string }> {
    const css = readFileSync(fileURLToPath(new URL('../global.css', import.meta.url)), 'utf8');
    const colors: Record<string, { light: string; dark: string }> = {};
    for (const [, token, value] of css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
        const lightDark = value.match(/^light-dark\((#[0-9a-f]{3,8}),\s*(#[0-9a-f]{3,8})\)$/);
        if (lightDark) {
            colors[token] = { light: lightDark[1], dark: lightDark[2] };
        } else {
            expect(value, `--color-${token} doit être un hex ou light-dark(hex, hex)`).toMatch(
                /^#[0-9a-f]{3,8}$/,
            );
            colors[token] = { light: value, dark: value };
        }
    }
    return colors;
}

describe('palette TS ↔ tokens CSS', () => {
    it('décrit exactement les mêmes couleurs que global.css', () => {
        expect(palette).toEqual(parseCssColors());
    });
});
