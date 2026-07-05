import { describe, expect, it } from 'vitest';
import { BAREME_V1 } from '../_shared/scoring/bareme.ts';
import type { ApiMatch } from '../sync-fixtures/transform.ts';
import {
    type ActionableMatch,
    buildResultUpdates,
    buildScoringPayload,
    extractFinalScore,
    parseScoringRules,
    partitionActionableMatches,
    type PredictionRow,
} from './transform.ts';

// Extraits de la réponse réelle GET /matches?leagueId=124179&season=2026
// (NC 2026, relevée le 2026-07-05)
function apiMatch(overrides: Partial<ApiMatch> & { id: number }): ApiMatch {
    return {
        date: '2026-07-04T07:10:00.000Z',
        week: '1',
        state: { score: null, description: 'Not started' },
        homeTeam: { id: 396499, name: 'New Zealand' },
        awayTeam: { id: 330121, name: 'France' },
        ...overrides,
    };
}

const NZ_FRA_FINISHED = apiMatch({
    id: 45285047,
    state: { score: '34 - 32', description: 'Finished' },
});
const ARG_ENG_UPCOMING = apiMatch({
    id: 45299514,
    date: '2026-07-18T19:10:00.000Z',
    state: { score: null, description: 'Not started' },
});

function actionable(overrides: Partial<ActionableMatch> = {}): ActionableMatch {
    return {
        api_game_id: 45285047,
        kickoff_at: '2026-07-04T07:10:00.000Z',
        status: 'finished',
        home_tries: null,
        ...overrides,
    };
}

describe('extractFinalScore', () => {
    it('parse la forme réelle "34 - 32"', () => {
        expect(extractFinalScore(NZ_FRA_FINISHED)).toEqual({ home: 34, away: 32 });
    });

    it('null quand le score est absent (match à venir)', () => {
        expect(extractFinalScore(ARG_ENG_UPCOMING)).toBeNull();
    });

    it('null quand le champ manque entièrement', () => {
        const match = apiMatch({ id: 1, state: { description: 'Finished' } });
        expect(extractFinalScore(match)).toBeNull();
    });

    it.each([
        '34 : 32',
        '34 - 32 - 1',
        'abc - 12',
        '12.5 - 3',
        '-1 - 3',
        '',
    ])('null sur score malformé "%s"', (score) => {
        const match = apiMatch({ id: 1, state: { score, description: 'Finished' } });
        expect(extractFinalScore(match)).toBeNull();
    });
});

describe('partitionActionableMatches', () => {
    const now = new Date('2026-07-06T12:00:00Z');

    it('sépare les matchs dans la fenêtre de 48 h des matchs périmés', () => {
        const recent = actionable({ kickoff_at: '2026-07-05T12:00:00Z' });
        const old = actionable({ kickoff_at: '2026-07-04T11:00:00Z' });
        const { fresh, stale } = partitionActionableMatches([recent, old], now);
        expect(fresh).toEqual([recent]);
        expect(stale).toEqual([old]);
    });
});

describe('buildResultUpdates', () => {
    it('match fini → statut + score + tries_missing', () => {
        const { updates } = buildResultUpdates([actionable()], [NZ_FRA_FINISHED]);
        expect(updates).toEqual([
            {
                api_game_id: 45285047,
                status: 'finished',
                home_score: 34,
                away_score: 32,
                tries_missing: true,
            },
        ]);
    });

    it('essais déjà saisis → pas de tries_missing', () => {
        const { updates } = buildResultUpdates([actionable({ home_tries: 4 })], [NZ_FRA_FINISHED]);
        expect(updates[0]).not.toHaveProperty('tries_missing');
    });

    it('match en cours → statut seul, jamais de score partiel', () => {
        const live = apiMatch({
            id: 45285047,
            state: { score: '12 - 7', description: 'Second Half' },
        });
        const { updates } = buildResultUpdates([actionable({ status: 'scheduled' })], [live]);
        expect(updates).toEqual([{ api_game_id: 45285047, status: 'in_play' }]);
    });

    it('fini côté API mais score manquant → statut seul (retenté au tick suivant)', () => {
        const noScore = apiMatch({
            id: 45285047,
            state: { score: null, description: 'Finished' },
        });
        const { updates } = buildResultUpdates([actionable({ status: 'in_play' })], [noScore]);
        expect(updates).toEqual([{ api_game_id: 45285047, status: 'finished' }]);
    });

    it('statut inchangé sans score → aucun update', () => {
        const { updates } = buildResultUpdates(
            [actionable({ status: 'scheduled', api_game_id: 45299514 })],
            [ARG_ENG_UPCOMING],
        );
        expect(updates).toEqual([]);
    });

    it('match absent de la réponse API → ignoré', () => {
        const { updates } = buildResultUpdates(
            [actionable({ api_game_id: 999 })],
            [NZ_FRA_FINISHED],
        );
        expect(updates).toEqual([]);
    });

    it('statut API inconnu → remonté, jamais de clé hors résultat', () => {
        const weird = apiMatch({
            id: 45285047,
            state: { score: '34 - 32', description: 'Golden Point' },
        });
        const { updates, unknownStatuses } = buildResultUpdates([actionable()], [weird]);
        expect(unknownStatuses).toEqual(['Golden Point']);
        // Statut inconnu → 'scheduled' (comportement mapApiStatus), pas fini → pas de score
        expect(updates.every((update) => !('home_score' in update))).toBe(true);
        for (const update of updates) {
            expect(Object.keys(update).sort()).toEqual(['api_game_id', 'status']);
        }
    });
});

describe('buildScoringPayload', () => {
    const match = {
        home_score: 34,
        away_score: 32,
        home_tries: null,
        away_tries: null,
        odds_home: 1.5,
        odds_draw: 21,
        odds_away: 2.8,
    };

    function prediction(overrides: Partial<PredictionRow> = {}): PredictionRow {
        return {
            id: 'p1',
            predicted_home_score: 30,
            predicted_away_score: 25,
            predicted_bonus_off_home: false,
            predicted_bonus_off_away: false,
            ...overrides,
        };
    }

    it('passe 1 : bon vainqueur, bonus offensif coché en attente (essais null)', () => {
        const [entry] = buildScoringPayload(
            match,
            [prediction({ predicted_bonus_off_home: true })],
            BAREME_V1,
        );
        expect(entry.prediction_id).toBe('p1');
        expect(entry.points_breakdown.winnerPoints).toBe(15); // 10 × 1.5
        expect(entry.points_breakdown.offensiveBonusPending).toBe(true);
        expect(entry.points_breakdown.offensiveBonusPoints).toBe(0);
    });

    it('passe 2 : essais saisis → bonus offensif crédité, pending éteint', () => {
        const [entry] = buildScoringPayload(
            { ...match, home_tries: 4, away_tries: 1 },
            [prediction({ predicted_bonus_off_home: true })],
            BAREME_V1,
        );
        expect(entry.points_breakdown.offensiveBonusPending).toBe(false);
        expect(entry.points_breakdown.offensiveBonusPoints).toBe(4); // 25 % de 15
        expect(entry.points_awarded).toBeGreaterThan(15);
    });

    it('mauvais vainqueur → 0 partout', () => {
        const [entry] = buildScoringPayload(
            match,
            [prediction({ predicted_home_score: 10, predicted_away_score: 20 })],
            BAREME_V1,
        );
        expect(entry.points_awarded).toBe(0);
    });

    it('cotes nulles → fallback 2.0', () => {
        const [entry] = buildScoringPayload(
            { ...match, odds_home: null, odds_draw: null, odds_away: null },
            [prediction()],
            BAREME_V1,
        );
        expect(entry.points_breakdown.oddsFallback).toBe(true);
        expect(entry.points_breakdown.oddsUsed).toBe(2.0);
    });

    it('cotes numeric en chaîne (PostgREST) → converties', () => {
        const [entry] = buildScoringPayload(
            { ...match, odds_home: '1.5', odds_draw: '21', odds_away: '2.8' },
            [prediction()],
            BAREME_V1,
        );
        expect(entry.points_breakdown.oddsUsed).toBe(1.5);
        expect(entry.points_breakdown.oddsFallback).toBe(false);
    });

    it('aucun prono → payload vide', () => {
        expect(buildScoringPayload(match, [], BAREME_V1)).toEqual([]);
    });
});

describe('parseScoringRules', () => {
    // Copie du seed de la migration 20260707000100 — doit rester identique à BAREME_V1
    const seed = {
        version: 1,
        winnerPointsPerOddsUnit: 10,
        fallbackOdds: 2.0,
        exactScoreBonus: 50,
        exactGapBonus: 15,
        closeGapBonus: 8,
        closeGapTolerance: 5,
        defensiveBonusPoints: 5,
        defensiveBonusMaxGap: 7,
        offensiveBonusRatio: 0.25,
        offensiveBonusMinTries: 4,
    };

    it('accepte le seed v1 tel quel et coïncide avec BAREME_V1', () => {
        expect(parseScoringRules(seed)).toEqual(BAREME_V1);
    });

    it('rejette une clé manquante', () => {
        const { fallbackOdds: _, ...incomplete } = seed;
        expect(() => parseScoringRules(incomplete)).toThrow(/fallbackOdds/);
    });

    it('rejette un non-objet', () => {
        expect(() => parseScoringRules(null)).toThrow();
        expect(() => parseScoringRules('{}')).toThrow();
    });
});
