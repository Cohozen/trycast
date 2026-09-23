import { describe, expect, it } from 'vitest';

import { buildBreakdownRows } from '@/features/predictions/breakdown-rows';
import { BAREME_V2 } from '@/features/scoring/bareme';
import { computeMatchPoints } from '@/features/scoring/compute-match-points';

const ODDS = { home: 1.5, draw: 20, away: 3 };

function rowsFor(
    predicted: [number, number],
    result: [number, number],
    options: { bonusOffHome?: boolean; homeTries?: number | null; joker?: boolean } = {},
) {
    const { total, breakdown } = computeMatchPoints(
        {
            homeScore: predicted[0],
            awayScore: predicted[1],
            bonusOffHome: options.bonusOffHome ?? false,
            bonusOffAway: false,
            joker: options.joker,
        },
        {
            homeScore: result[0],
            awayScore: result[1],
            homeTries: options.homeTries ?? null,
            awayTries: null,
        },
        ODDS,
        BAREME_V2,
    );
    return buildBreakdownRows({
        breakdown,
        total,
        predictedHome: predicted[0],
        predictedAway: predicted[1],
        homeName: 'France',
        awayName: 'Irlande',
        rules: BAREME_V2,
    });
}

const keys = (rows: ReturnType<typeof rowsFor>) => rows.map((row) => row.key);

describe('buildBreakdownRows', () => {
    it('garde la ligne du bonus défensif quand le prono est serré, même non obtenue', () => {
        const rows = rowsFor([20, 15], [30, 10]);
        const defensive = rows.find((row) => row.key === 'defensive');
        expect(defensive).toMatchObject({ mark: 'ko', points: 0, defensiveGapBadge: 7 });
    });

    it('omet la ligne du bonus défensif quand le prono dépasse l’écart max', () => {
        expect(keys(rowsFor([30, 10], [30, 10]))).not.toContain('defensive');
    });

    it('libelle le vainqueur sans équipe ni cote', () => {
        const [winner] = rowsFor([10, 20], [10, 20]);
        expect(winner).toMatchObject({ labelKey: 'predictions:breakdown.winner', mark: 'ok' });
        expect(winner?.params).toBeUndefined();
    });

    it('nomme l’équipe en entier et passe les essais en précision', () => {
        const rows = rowsFor([20, 15], [20, 15], { bonusOffHome: true, homeTries: 4 });
        expect(rows.find((row) => row.key === 'offensive-home')).toMatchObject({
            labelKey: 'predictions:breakdown.offensive',
            params: { team: 'France' },
            mark: 'ok',
            detail: { key: 'predictions:breakdown.offensiveTries', params: { count: 4 } },
        });
    });

    it('signale le bonus offensif en attente sans points', () => {
        const rows = rowsFor([20, 15], [20, 15], { bonusOffHome: true, homeTries: null });
        expect(rows.find((row) => row.key === 'offensive-home')).toMatchObject({
            mark: 'info',
            points: null,
            detail: { key: 'predictions:breakdown.offensivePending' },
        });
    });

    it('ajoute la ligne joker à la moitié du total', () => {
        const rows = rowsFor([20, 15], [20, 15], { joker: true });
        const joker = rows.find((row) => row.key === 'joker');
        const base = rows
            .filter((row) => row.key !== 'joker')
            .reduce((sum, row) => sum + (row.points ?? 0), 0);
        expect(joker?.points).toBe(base);
    });
});
