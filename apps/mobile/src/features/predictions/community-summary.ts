import { distributionPercentages } from '@/features/predictions/distribution-percentages';
import type { CommunityHistogramRow } from '@/features/predictions/types';
import { computeMatchPoints } from '@/features/scoring/compute-match-points';
import type { MatchOdds, MatchOutcome, ScoringRules } from '@/features/scoring/types';

export type CommunitySummary = {
    /** Nombre de pronos (hors comptes de démo). */
    total: number;
    /** Parts 1/N/2 en pourcentages entiers qui somment à 100. */
    split: Record<MatchOutcome, number>;
    /** Issue du score servi (live ou final). */
    outcome: MatchOutcome;
    /** Score le plus joué et sa part (ex æquo : le premier dans l'ordre du score). */
    topScore: { home: number; away: number; pct: number };
    /** Pronos au score exact (contre le score servi) et leur part. */
    exact: { count: number; pct: number };
    /** Moyenne des points, arrondie au dixième. */
    averagePoints: number;
};

const outcomeOf = (home: number, away: number): MatchOutcome =>
    home > away ? 'home' : home < away ? 'away' : 'draw';

/**
 * Résumé « Ce qu'a joué la communauté » d'un match commencé, depuis
 * l'histogramme de ses pronos. `score` : score en direct (en cours) ou final.
 * Les points d'un groupe scoré font foi (essais et joker compris) ; sinon,
 * en live, ils sont recalculés contre `score` avec le module partagé — essais
 * inconnus, donc bonus offensif en attente, comme la carte « Points gagnés ».
 * null si personne n'a pronostiqué.
 */
export function summarizeCommunity(
    rows: CommunityHistogramRow[],
    score: { home: number; away: number },
    odds: MatchOdds,
    rules: ScoringRules,
): CommunitySummary | null {
    const counts: Record<MatchOutcome, number> = { home: 0, draw: 0, away: 0 };
    const byScore = new Map<string, { home: number; away: number; count: number }>();
    let total = 0;
    let exactCount = 0;
    let pointsSum = 0;

    for (const row of rows) {
        const n = row.predictions;
        total += n;
        counts[outcomeOf(row.predicted_home_score, row.predicted_away_score)] += n;

        const key = `${row.predicted_home_score}-${row.predicted_away_score}`;
        const entry = byScore.get(key);
        if (entry) entry.count += n;
        else
            byScore.set(key, {
                home: row.predicted_home_score,
                away: row.predicted_away_score,
                count: n,
            });

        if (row.predicted_home_score === score.home && row.predicted_away_score === score.away) {
            exactCount += n;
        }

        const points =
            row.points_awarded ??
            computeMatchPoints(
                {
                    homeScore: row.predicted_home_score,
                    awayScore: row.predicted_away_score,
                    bonusOffHome: row.bonus_off_home,
                    bonusOffAway: row.bonus_off_away,
                    joker: row.joker,
                },
                { homeScore: score.home, awayScore: score.away, homeTries: null, awayTries: null },
                odds,
                rules,
            ).total;
        pointsSum += points * n;
    }

    const split = distributionPercentages({ ...counts, total });
    if (split === null) return null;

    let top = { home: 0, away: 0, count: -1 };
    for (const candidate of [...byScore.values()].sort(
        (a, b) => a.home - b.home || a.away - b.away,
    )) {
        if (candidate.count > top.count) top = candidate;
    }

    const pct = (count: number) => Math.round((100 * count) / total);
    return {
        total,
        split,
        outcome: outcomeOf(score.home, score.away),
        topScore: { home: top.home, away: top.away, pct: pct(top.count) },
        exact: { count: exactCount, pct: pct(exactCount) },
        averagePoints: Math.round((10 * pointsSum) / total) / 10,
    };
}
