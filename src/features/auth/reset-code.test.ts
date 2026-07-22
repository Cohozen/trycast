import { describe, expect, it } from 'vitest';

import { RESEND_COOLDOWN_MS, resendCooldownSeconds } from './reset-code';

const T0 = 1_784_662_519_000;

describe('resendCooldownSeconds', () => {
    it("autorise le renvoi quand aucun code n'a encore été envoyé", () => {
        expect(resendCooldownSeconds(null, T0)).toBe(0);
    });

    it('décompte la minute qui suit un envoi', () => {
        expect(resendCooldownSeconds(T0, T0)).toBe(60);
        expect(resendCooldownSeconds(T0, T0 + 30_000)).toBe(30);
        // Arrondi au supérieur : tant qu'il reste 1 ms, le bouton reste fermé
        expect(resendCooldownSeconds(T0, T0 + 59_999)).toBe(1);
    });

    it('rouvre le renvoi une fois le délai écoulé, sans jamais passer sous zéro', () => {
        expect(resendCooldownSeconds(T0, T0 + RESEND_COOLDOWN_MS)).toBe(0);
        expect(resendCooldownSeconds(T0, T0 + 10 * RESEND_COOLDOWN_MS)).toBe(0);
    });

    it("borne le décompte si l'horloge recule", () => {
        expect(resendCooldownSeconds(T0, T0 - 5_000)).toBe(60);
    });
});
