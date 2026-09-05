import { describe, expect, it } from 'vitest';

import {
    barShrink,
    CHART_BARS,
    CHART_BASELINE,
    CHECK_PATH_LENGTH,
    CHECK_WINDOW,
    HEAD_NOD,
    HEAD_WINDOW,
    LIST_ROWS,
    LIST_SHIFT,
    pulse,
    rise,
} from './motion';

/** Toutes les fenêtres pilotées par une impulsion aller-retour. */
const PULSE_WINDOWS = [...LIST_ROWS, ...CHART_BARS, HEAD_WINDOW];

/** Épaisseur de trait la plus grande de la barre d'onglets (couche active). */
const MAX_STROKE_WIDTH = 2.4;

describe('retour à l’état initial', () => {
    // Le contrat qui vaut le lot : en fin de frise, plus aucun trait n'est
    // déplacé, donc la géométrie Lucide est retrouvée au littéral près.
    it('annule toutes les impulsions en fin de frise', () => {
        for (const w of PULSE_WINDOWS) {
            expect(pulse(1, w.start, w.end)).toBe(0);
        }
    });

    it('laisse la coche entièrement tracée en fin de frise', () => {
        expect(rise(1, CHECK_WINDOW.start, CHECK_WINDOW.end)).toBe(1);
    });

    // Repos = 1 : l'état AVANT la première animation doit être celui d'APRÈS.
    it('donne le même repos avant la première animation et après la dernière', () => {
        for (const w of PULSE_WINDOWS) {
            expect(pulse(1, w.start, w.end)).toBe(pulse(1.5, w.start, w.end));
        }
        expect(rise(1, CHECK_WINDOW.start, CHECK_WINDOW.end)).toBe(1);
    });
});

describe('pulse', () => {
    it('vaut 0 aux bornes et hors de sa fenêtre', () => {
        expect(pulse(0.2, 0.2, 0.8)).toBe(0);
        expect(pulse(0.8, 0.2, 0.8)).toBe(0);
        expect(pulse(0, 0.2, 0.8)).toBe(0);
        expect(pulse(1, 0.2, 0.8)).toBe(0);
    });

    it('atteint son sommet à 1', () => {
        // PULSE_PEAK = 0,42 de la fenêtre.
        expect(pulse(0.2 + 0.42 * 0.6, 0.2, 0.8)).toBeCloseTo(1, 10);
    });

    it('reste dans [0, 1] sur toute la frise (aucun dépassement, aucun rebond)', () => {
        for (const w of PULSE_WINDOWS) {
            for (let i = 0; i <= 1000; i++) {
                const v = pulse(i / 1000, w.start, w.end);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe('rise', () => {
    it('est monotone croissante de 0 à 1', () => {
        let previous = 0;
        for (let i = 0; i <= 1000; i++) {
            const v = rise(i / 1000, CHECK_WINDOW.start, CHECK_WINDOW.end);
            expect(v).toBeGreaterThanOrEqual(previous);
            previous = v;
        }
        expect(previous).toBe(1);
    });

    it('vaut 0 avant sa fenêtre', () => {
        expect(rise(0, CHECK_WINDOW.start, CHECK_WINDOW.end)).toBe(0);
        expect(rise(CHECK_WINDOW.start, CHECK_WINDOW.start, CHECK_WINDOW.end)).toBe(0);
    });
});

describe('garde-fous géométriques', () => {
    // Longueur de « m9 11 3 3L22 4 » : (9,11) → (12,14) → (22,4).
    it('mesure la coche à la longueur de son tracé', () => {
        const climb = Math.hypot(3, 3);
        const sweep = Math.hypot(10, 10);
        expect(CHECK_PATH_LENGTH).toBeCloseTo(climb + sweep, 10);
        expect(CHECK_PATH_LENGTH).toBeCloseTo(18.3848, 4);
    });

    it('garde le glissé des rangées dans le viewBox', () => {
        // Bout du trait + glissé + demi-cap rond ≤ 24.
        expect(21 + LIST_SHIFT + MAX_STROKE_WIDTH / 2).toBeLessThanOrEqual(24);
        // …et la puce ne sort pas non plus par la gauche au repos.
        expect(3 - MAX_STROKE_WIDTH / 2).toBeGreaterThanOrEqual(0);
    });

    it('garde les barres au-dessus de leur ligne de base', () => {
        for (const bar of CHART_BARS) {
            expect(bar.top + barShrink(bar.top)).toBeLessThan(CHART_BASELINE);
        }
    });

    it('empêche la tête de heurter les épaules', () => {
        // Bas de la tête au plus bas du hochement, contre le haut des épaules (y = 15).
        expect(7 + HEAD_NOD + 4 + MAX_STROKE_WIDTH / 2).toBeLessThan(15);
    });
});

describe('ordonnancement des cascades', () => {
    it('décale les rangées de « Mes matchs » dans l’ordre de lecture', () => {
        for (let i = 1; i < LIST_ROWS.length; i++) {
            expect(LIST_ROWS[i].start).toBeGreaterThan(LIST_ROWS[i - 1].start);
            expect(LIST_ROWS[i].y).toBeGreaterThan(LIST_ROWS[i - 1].y);
        }
    });

    it('décale les barres du « Classement » de gauche à droite', () => {
        for (let i = 1; i < CHART_BARS.length; i++) {
            expect(CHART_BARS[i].start).toBeGreaterThan(CHART_BARS[i - 1].start);
            expect(CHART_BARS[i].x).toBeGreaterThan(CHART_BARS[i - 1].x);
        }
    });

    it('tient toutes les fenêtres dans la frise', () => {
        for (const w of [...PULSE_WINDOWS, CHECK_WINDOW]) {
            expect(w.start).toBeGreaterThanOrEqual(0);
            expect(w.end).toBeLessThanOrEqual(1);
            expect(w.end).toBeGreaterThan(w.start);
        }
    });
});
