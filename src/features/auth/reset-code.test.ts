import { describe, expect, it } from 'vitest';

import { RESEND_COOLDOWN_MS, resendCooldownSeconds, sanitizeResetCodeInput } from './reset-code';

const T0 = 1_784_662_519_000;

describe('sanitizeResetCodeInput', () => {
    it('garde les 6 chiffres, y compris les zéros de tête', () => {
        expect(sanitizeResetCodeInput('418207')).toBe('418207');
        expect(sanitizeResetCodeInput('000000')).toBe('000000');
    });

    it('retire ce qui vient du copier-coller', () => {
        expect(sanitizeResetCodeInput('418 207')).toBe('418207');
        expect(sanitizeResetCodeInput('418-207')).toBe('418207');
        expect(sanitizeResetCodeInput('code : 418207')).toBe('418207');
    });

    it('tronque au-delà de la longueur attendue', () => {
        expect(sanitizeResetCodeInput('4182078901')).toBe('418207');
    });

    it("refuse les chiffres non latins, qu'un clavier localisé peut produire", () => {
        expect(sanitizeResetCodeInput('١٢٣٤٥٦')).toBe('');
    });
});

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
