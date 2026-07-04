import { describe, expect, it } from 'vitest';
import { BAREME_V1 } from './bareme';
import { computeMatchPoints, computePotentialPoints } from './compute-match-points';
import type { MatchOdds, MatchResultInput, PredictionInput } from './types';

function prono(
    homeScore: number,
    awayScore: number,
    bonus: { home?: boolean; away?: boolean } = {},
): PredictionInput {
    return {
        homeScore,
        awayScore,
        bonusOffHome: bonus.home ?? false,
        bonusOffAway: bonus.away ?? false,
    };
}

function resultat(
    homeScore: number,
    awayScore: number,
    tries: { home?: number | null; away?: number | null } = {},
): MatchResultInput {
    return {
        homeScore,
        awayScore,
        homeTries: tries.home === undefined ? null : tries.home,
        awayTries: tries.away === undefined ? null : tries.away,
    };
}

const cotes = (home: number | null, draw: number | null, away: number | null): MatchOdds => ({
    home,
    draw,
    away,
});

describe('computeMatchPoints — vainqueur et cotes', () => {
    it('mauvais vainqueur ⇒ 0 partout, même avec un écart proche', () => {
        // Écart prédit -3, écart réel +3 : proche, mais mauvais 1/N/2
        const { total, breakdown } = computeMatchPoints(
            prono(17, 20),
            resultat(20, 17, { home: 2, away: 1 }),
            cotes(1.5, 25, 2.6),
            BAREME_V1,
        );
        expect(total).toBe(0);
        expect(breakdown.winnerCorrect).toBe(false);
        expect(breakdown.winnerPoints).toBe(0);
        expect(breakdown.gapPoints).toBe(0);
        expect(breakdown.defensiveBonusPoints).toBe(0);
    });

    it('bon vainqueur : 10 × la cote du résultat prédit, arrondi entier', () => {
        // Exemple de la feuille de route : cote 1.15 → 12 pts (pas 11, piège flottant)
        const { breakdown } = computeMatchPoints(
            prono(30, 3),
            resultat(35, 10, { home: 5, away: 1 }),
            cotes(1.15, 30, 7.5),
            BAREME_V1,
        );
        expect(breakdown.winnerPoints).toBe(12);
        expect(breakdown.oddsFallback).toBe(false);
    });

    it('outsider à grosse cote : prédire la surprise paie', () => {
        const { total, breakdown } = computeMatchPoints(
            prono(10, 20),
            resultat(12, 25, { home: 1, away: 3 }),
            cotes(1.3, 28, 9.0),
            BAREME_V1,
        );
        expect(breakdown.winnerPoints).toBe(90);
        // Écart prédit -10, réel -13 : à ±5 → +8 ; pas de bonus défensif (écart prédit > 7)
        expect(breakdown.gapPoints).toBe(8);
        expect(breakdown.defensiveBonusPoints).toBe(0);
        expect(total).toBe(98);
    });

    it('cote manquante ⇒ fallback 2.0, le scoring ne bloque jamais', () => {
        const { breakdown } = computeMatchPoints(
            prono(24, 17),
            resultat(30, 3, { home: 4, away: 0 }),
            cotes(null, null, null),
            BAREME_V1,
        );
        expect(breakdown.oddsUsed).toBe(2.0);
        expect(breakdown.oddsFallback).toBe(true);
        expect(breakdown.winnerPoints).toBe(20);
    });

    it('nul prédit et réalisé : cote du nul appliquée, pas de bonus défensif (pas de vaincu)', () => {
        const { total, breakdown } = computeMatchPoints(
            prono(20, 20),
            resultat(20, 20, { home: 2, away: 2 }),
            cotes(1.8, 21, 4.2),
            BAREME_V1,
        );
        expect(breakdown.winnerPoints).toBe(210);
        expect(breakdown.exactScorePoints).toBe(50);
        expect(breakdown.defensiveBonusPoints).toBe(0);
        expect(total).toBe(260);
    });
});

describe('computeMatchPoints — score exact et écarts (volets exclusifs)', () => {
    it('score exact : +50, sans cumuler le volet écart', () => {
        const { breakdown } = computeMatchPoints(
            prono(24, 17),
            resultat(24, 17, { home: 3, away: 2 }),
            cotes(1.5, 25, 2.6),
            BAREME_V1,
        );
        expect(breakdown.exactScorePoints).toBe(50);
        expect(breakdown.gapPoints).toBe(0);
        // Écart prédit 7 et défaite réelle de 7 → bonus défensif cumulé
        expect(breakdown.defensiveBonusPoints).toBe(5);
    });

    it('écart exact sans le score exact : +15', () => {
        const { breakdown } = computeMatchPoints(
            prono(20, 13),
            resultat(27, 20, { home: 3, away: 2 }),
            cotes(2.0, 25, 1.9),
            BAREME_V1,
        );
        expect(breakdown.exactScorePoints).toBe(0);
        expect(breakdown.gapPoints).toBe(15);
    });

    it('écart à ±5 : +8', () => {
        const { breakdown } = computeMatchPoints(
            prono(30, 10),
            resultat(28, 12, { home: 4, away: 1 }),
            cotes(1.4, 30, 6.0),
            BAREME_V1,
        );
        expect(breakdown.gapPoints).toBe(8);
    });

    it('écart au-delà de ±5 : rien', () => {
        const { breakdown } = computeMatchPoints(
            prono(30, 10),
            resultat(16, 10, { home: 2, away: 1 }),
            cotes(1.4, 30, 6.0),
            BAREME_V1,
        );
        expect(breakdown.gapPoints).toBe(0);
    });
});

describe('computeMatchPoints — bonus offensif (scoring en 2 temps)', () => {
    const oddsHome = cotes(1.5, 25, 2.6);

    it('case cochée et ≥ 4 essais : +25 % des points vainqueur', () => {
        const { breakdown } = computeMatchPoints(
            prono(35, 10, { home: true }),
            resultat(40, 12, { home: 5, away: 1 }),
            oddsHome,
            BAREME_V1,
        );
        // 25 % de 15 pts vainqueur → 4 (arrondi)
        expect(breakdown.winnerPoints).toBe(15);
        expect(breakdown.offensiveBonusPoints).toBe(4);
        expect(breakdown.offensiveBonusPending).toBe(false);
    });

    it('case cochée mais moins de 4 essais : 0, volet réglé', () => {
        const { breakdown } = computeMatchPoints(
            prono(35, 10, { home: true }),
            resultat(40, 12, { home: 3, away: 1 }),
            oddsHome,
            BAREME_V1,
        );
        expect(breakdown.offensiveBonusPoints).toBe(0);
        expect(breakdown.offensiveBonusPending).toBe(false);
    });

    it('essais non saisis (passe 1) : volet en attente, 0 point pour l’instant', () => {
        const { breakdown } = computeMatchPoints(
            prono(35, 10, { home: true }),
            resultat(40, 12),
            oddsHome,
            BAREME_V1,
        );
        expect(breakdown.offensiveBonusPoints).toBe(0);
        expect(breakdown.offensiveBonusPending).toBe(true);
    });

    it('deux cases validées : le bonus se cumule par équipe', () => {
        const { breakdown } = computeMatchPoints(
            prono(35, 28, { home: true, away: true }),
            resultat(38, 31, { home: 5, away: 4 }),
            cotes(2.0, 25, 1.9),
            BAREME_V1,
        );
        // 2 × 25 % de 20 pts vainqueur
        expect(breakdown.offensiveBonusPoints).toBe(10);
    });

    it('mauvais vainqueur : bonus offensif nul même à 4 essais et sans essais saisis', () => {
        const { breakdown } = computeMatchPoints(
            prono(35, 10, { home: true }),
            resultat(10, 35),
            cotes(1.5, 25, 2.6),
            BAREME_V1,
        );
        expect(breakdown.offensiveBonusPoints).toBe(0);
        expect(breakdown.offensiveBonusPending).toBe(false);
    });
});

describe('computePotentialPoints — aperçu « peut rapporter N pts »', () => {
    it('scénario prono réalisé : vainqueur + score exact + écart/défensif + bonus cochés', () => {
        const { total, breakdown } = computePotentialPoints(
            prono(24, 17, { home: true }),
            cotes(1.5, 25, 2.6),
            BAREME_V1,
        );
        // 15 (vainqueur) + 50 (score exact) + 5 (défensif, écart 7) + 4 (25 % de 15)
        expect(breakdown.winnerPoints).toBe(15);
        expect(breakdown.exactScorePoints).toBe(50);
        expect(breakdown.defensiveBonusPoints).toBe(5);
        expect(breakdown.offensiveBonusPoints).toBe(4);
        expect(breakdown.offensiveBonusPending).toBe(false);
        expect(total).toBe(74);
    });

    it('sans cotes : aperçu sur le multiplicateur fallback 2.0', () => {
        const { breakdown } = computePotentialPoints(
            prono(15, 12),
            cotes(null, null, null),
            BAREME_V1,
        );
        expect(breakdown.oddsFallback).toBe(true);
        expect(breakdown.winnerPoints).toBe(20);
    });
});
