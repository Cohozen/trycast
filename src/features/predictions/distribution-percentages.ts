import type { PredictionDistribution } from '@/features/predictions/types';
import type { MatchOutcome } from '@/features/scoring/types';

/**
 * Pourcentages entiers de la distribution communautaire 1/N/2, garantis de
 * sommer à 100 (méthode du plus fort reste — un simple arrondi par issue
 * peut donner 99 ou 101). null si personne n'a pronostiqué.
 */
export function distributionPercentages(
    distribution: PredictionDistribution,
): Record<MatchOutcome, number> | null {
    if (distribution.total <= 0) return null;
    const exact: Record<MatchOutcome, number> = {
        home: (100 * distribution.home) / distribution.total,
        draw: (100 * distribution.draw) / distribution.total,
        away: (100 * distribution.away) / distribution.total,
    };
    const floors: Record<MatchOutcome, number> = {
        home: Math.floor(exact.home),
        draw: Math.floor(exact.draw),
        away: Math.floor(exact.away),
    };
    let remainder = 100 - (floors.home + floors.draw + floors.away);
    const byLargestFraction = (['home', 'draw', 'away'] as const)
        .map((outcome) => ({ outcome, fraction: exact[outcome] - floors[outcome] }))
        .sort((a, b) => b.fraction - a.fraction);
    for (const { outcome } of byLargestFraction) {
        if (remainder <= 0) break;
        floors[outcome] += 1;
        remainder -= 1;
    }
    return floors;
}
