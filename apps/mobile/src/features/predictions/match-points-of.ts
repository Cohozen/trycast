import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { parseBreakdown } from '@/features/predictions/verdict';
import { computeMatchPoints } from '@/features/scoring/compute-match-points';
import type { MatchPoints, ScoringRules } from '@/features/scoring/types';

/**
 * Mes points sur un match commencé. En cours : PROVISOIRES, calculés contre
 * le score live avec le module de scoring partagé (décision 2026-09-23) —
 * essais inconnus en direct, le bonus offensif reste « en attente ». Terminé :
 * breakdown persisté par le scoring. null sans prono ou avant le scoring.
 */
export function matchPointsOf(
    match: MatchWithTeams,
    prediction: PredictionRow | undefined,
    jokerOn: boolean,
    rules: ScoringRules,
): MatchPoints | null {
    if (!prediction) return null;
    if (match.status === 'in_play') {
        return computeMatchPoints(
            {
                homeScore: prediction.predicted_home_score,
                awayScore: prediction.predicted_away_score,
                bonusOffHome: prediction.predicted_bonus_off_home,
                bonusOffAway: prediction.predicted_bonus_off_away,
                joker: jokerOn,
            },
            {
                homeScore: match.live_home_score ?? 0,
                awayScore: match.live_away_score ?? 0,
                homeTries: null,
                awayTries: null,
            },
            { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
            rules,
        );
    }
    if (prediction.points_awarded === null) return null;
    const breakdown = parseBreakdown(prediction);
    return breakdown ? { total: prediction.points_awarded, breakdown } : null;
}
