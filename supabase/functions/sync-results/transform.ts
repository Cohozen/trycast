// Logique pure de sync-results (Lot 4) : parsing des scores Highlightly,
// construction des updates de résultats et des payloads de scoring.
// Zéro I/O, zéro global Deno — testé sous Vitest.
import { computeMatchPoints } from '../_shared/scoring/compute-match-points.ts';
import type { MatchOdds, PointsBreakdown, ScoringRules } from '../_shared/scoring/types.ts';
import type { ApiMatch, MatchStatus } from '../sync-fixtures/transform.ts';
import { mapApiStatus } from '../sync-fixtures/transform.ts';

// Au-delà de cette fenêtre sans résultat final, un match actionnable part en
// needs_review (correction admin) : sans borne, un match fantôme déclencherait
// un appel API toutes les 10 minutes pour toujours.
const RESULTS_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Colonnes lues sur un match en attente de résultat (sélection A). */
export type ActionableMatch = {
    api_game_id: number;
    kickoff_at: string;
    status: MatchStatus;
    home_tries: number | null;
};

// Payload d'update des résultats : STRICTEMENT statut, scores et tries_missing.
// Jamais les fixtures, cotes ou essais — même règle que buildMatchRows.
export type ResultUpdate = {
    api_game_id: number;
    status: MatchStatus;
    home_score?: number;
    away_score?: number;
    tries_missing?: true;
};

/** Sépare les matchs encore dans la fenêtre API de ceux à passer en revue admin. */
export function partitionActionableMatches<T extends { kickoff_at: string }>(
    matches: T[],
    now: Date,
): { fresh: T[]; stale: T[] } {
    const fresh: T[] = [];
    const stale: T[] = [];
    for (const match of matches) {
        const kickoff = new Date(match.kickoff_at).getTime();
        (now.getTime() - kickoff > RESULTS_WINDOW_MS ? stale : fresh).push(match);
    }
    return { fresh, stale };
}

/**
 * Score final depuis state.score ("34 - 32", home - away). null si absent ou
 * malformé : pas d'écriture, le match sera retenté au tick suivant.
 */
export function extractFinalScore(match: ApiMatch): { home: number; away: number } | null {
    const raw = match.state.score;
    if (typeof raw !== 'string') {
        return null;
    }
    const parts = raw.split('-');
    if (parts.length !== 2) {
        return null;
    }
    const home = Number(parts[0].trim());
    const away = Number(parts[1].trim());
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        return null;
    }
    return { home, away };
}

/**
 * Croise les matchs actionnables avec la réponse API : statut à jour, score
 * final quand il est là. tries_missing n'est levé qu'à l'écriture d'un score
 * final sans essais saisis (déclencheur de la saisie admin puis de la passe 2).
 */
export function buildResultUpdates(
    actionable: ActionableMatch[],
    apiMatches: ApiMatch[],
    unknownStatuses: string[] = [],
): { updates: ResultUpdate[]; unknownStatuses: string[] } {
    const apiById = new Map(apiMatches.map((match) => [match.id, match]));
    const unknown = new Set(unknownStatuses);
    const updates: ResultUpdate[] = [];

    for (const match of actionable) {
        const apiMatch = apiById.get(match.api_game_id);
        if (!apiMatch) {
            continue; // absent de la réponse : retenté au tick suivant
        }
        const { status, isUnknown } = mapApiStatus(apiMatch.state.description);
        if (isUnknown) {
            unknown.add(apiMatch.state.description);
        }

        const score = status === 'finished' ? extractFinalScore(apiMatch) : null;
        if (score) {
            updates.push({
                api_game_id: match.api_game_id,
                status,
                home_score: score.home,
                away_score: score.away,
                ...(match.home_tries === null ? { tries_missing: true as const } : {}),
            });
        } else if (status !== match.status) {
            // Statut seul (passage in_play, report, annulation…) — un match
            // "finished" sans score parsable reste actionnable au tick suivant
            updates.push({ api_game_id: match.api_game_id, status });
        }
    }
    return { updates, unknownStatuses: [...unknown] };
}

/** Lignes DB nécessaires au calcul des points d'un match. */
export type MatchScoringRow = {
    home_score: number;
    away_score: number;
    home_tries: number | null;
    away_tries: number | null;
    odds_home: number | string | null;
    odds_draw: number | string | null;
    odds_away: number | string | null;
};

export type PredictionRow = {
    id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    predicted_bonus_off_home: boolean;
    predicted_bonus_off_away: boolean;
};

/** Entrée du tableau p_predictions de la RPC apply_match_scores. */
export type RpcPredictionEntry = {
    prediction_id: string;
    points_awarded: number;
    points_breakdown: PointsBreakdown;
};

function toOdds(value: number | string | null): number | null {
    if (value === null) {
        return null;
    }
    const parsed = Number(value); // numeric PostgREST : tolère number ou chaîne
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Calcule les points de tous les pronos d'un match. Même fonction pour les
 * deux passes : la passe 1 reçoit des essais null (bonus offensif en attente),
 * la passe 2 les essais saisis — computeMatchPoints fait le reste.
 */
export function buildScoringPayload(
    match: MatchScoringRow,
    predictions: PredictionRow[],
    rules: ScoringRules,
): RpcPredictionEntry[] {
    const odds: MatchOdds = {
        home: toOdds(match.odds_home),
        draw: toOdds(match.odds_draw),
        away: toOdds(match.odds_away),
    };
    const result = {
        homeScore: match.home_score,
        awayScore: match.away_score,
        homeTries: match.home_tries,
        awayTries: match.away_tries,
    };

    return predictions.map((prediction) => {
        const points = computeMatchPoints(
            {
                homeScore: prediction.predicted_home_score,
                awayScore: prediction.predicted_away_score,
                bonusOffHome: prediction.predicted_bonus_off_home,
                bonusOffAway: prediction.predicted_bonus_off_away,
            },
            result,
            odds,
            rules,
        );
        return {
            prediction_id: prediction.id,
            points_awarded: points.total,
            points_breakdown: points.breakdown,
        };
    });
}

const SCORING_RULES_KEYS = [
    'version',
    'winnerPointsPerOddsUnit',
    'fallbackOdds',
    'exactScoreBonus',
    'exactGapBonus',
    'closeGapBonus',
    'closeGapTolerance',
    'defensiveBonusPoints',
    'defensiveBonusMaxGap',
    'offensiveBonusRatio',
    'offensiveBonusMinTries',
    'offensiveMalusPoints',
] as const;

/** Garde-fou runtime sur le jsonb scoring_rules.rules avant de scorer avec. */
export function parseScoringRules(raw: unknown): ScoringRules {
    if (raw === null || typeof raw !== 'object') {
        throw new Error('scoring_rules.rules: jsonb objet attendu');
    }
    const record = raw as Record<string, unknown>;
    for (const key of SCORING_RULES_KEYS) {
        if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
            throw new Error(`scoring_rules.rules: clé ${key} absente ou non numérique`);
        }
    }
    return record as ScoringRules;
}
