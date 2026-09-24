import { describe, expect, it } from 'vitest';

import { BAREME_V2 } from '@/features/scoring/bareme';
import { computeMatchPoints } from '@/features/scoring/compute-match-points';

import { summarizeCommunity } from './community-summary';
import type { CommunityHistogramRow } from './types';

const ODDS = { home: 1.5, draw: 20, away: 3 };

function row(
    home: number,
    away: number,
    predictions: number,
    extra: Partial<CommunityHistogramRow> = {},
): CommunityHistogramRow {
    return {
        predicted_home_score: home,
        predicted_away_score: away,
        bonus_off_home: false,
        bonus_off_away: false,
        joker: false,
        points_awarded: null,
        predictions,
        ...extra,
    };
}

describe('summarizeCommunity', () => {
    it('null quand personne n’a pronostiqué', () => {
        expect(summarizeCommunity([], { home: 10, away: 3 }, ODDS, BAREME_V2)).toBeNull();
    });

    it('parts 1/N/2, score le plus joué et exacts contre le score servi', () => {
        const summary = summarizeCommunity(
            [
                row(24, 17, 3),
                row(20, 10, 1),
                row(24, 17, 1, { bonus_off_home: true }),
                row(13, 13, 1),
                row(10, 15, 2),
            ],
            { home: 24, away: 17 },
            ODDS,
            BAREME_V2,
        );
        expect(summary?.total).toBe(8);
        expect(summary?.split).toEqual({ home: 63, draw: 12, away: 25 });
        expect(summary?.outcome).toBe('home');
        // Les deux groupes 24–17 (bonus coché ou non) comptent pour le même score
        expect(summary?.topScore).toEqual({ home: 24, away: 17, pct: 50 });
        expect(summary?.exact).toEqual({ count: 4, pct: 50 });
    });

    it('points attribués prioritaires, recalcul live pour les groupes non scorés', () => {
        const live = computeMatchPoints(
            { homeScore: 20, awayScore: 10, bonusOffHome: false, bonusOffAway: false, joker: true },
            { homeScore: 24, awayScore: 17, homeTries: null, awayTries: null },
            ODDS,
            BAREME_V2,
        ).total;
        const summary = summarizeCommunity(
            [row(24, 17, 1, { points_awarded: 30 }), row(20, 10, 1, { joker: true })],
            { home: 24, away: 17 },
            ODDS,
            BAREME_V2,
        );
        expect(summary?.averagePoints).toBe(Math.round((10 * (30 + live)) / 2) / 10);
    });
});
