import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionsByMatch } from '@/features/predictions/types';
import { verdictOf } from '@/features/predictions/verdict';

import { roundGroupKey } from './round-points';
import { findCompetitionStage } from './round-strip-items';
import type { CompetitionStage, StageKind } from './types';

export type FormVerdict = 'exact' | 'good' | 'missed';

export type RoundSummary = {
    /** Journée en cours : celle du dernier match commencé (null avant le premier). */
    round: {
        /** Round brut d'une journée de poule, null pour une étape. */
        label: string | null;
        stageKind: StageKind | null;
        /** Premier coup d'envoi du groupe : frontière du rang « d'avant ». */
        firstKickoff: string;
        /** Mes points sur ce groupe (pronos déjà scorés). */
        points: number;
    } | null;
    /** Mes pronos scorés au bon vainqueur, score exact compris. */
    goodCount: number;
    /** Verdicts de mes 5 derniers pronos scorés, du plus ancien au plus récent. */
    form: FormVerdict[];
};

const FORM_LENGTH = 5;

/**
 * Résumé de la carte « Tes points » de l'accueil, calculé depuis mes pronos
 * et les matchs déjà en cache. Journée = même regroupement que l'onglet
 * Résultats (étape à élimination directe, sinon round brut).
 */
export function summarizeRound(
    matches: readonly MatchWithTeams[],
    predictions: PredictionsByMatch,
    stages: readonly CompetitionStage[],
    now: Date,
): RoundSummary {
    const byKickoff = [...matches].sort(
        (a, b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at),
    );
    const keyOf = (match: MatchWithTeams) =>
        roundGroupKey(match.round, findCompetitionStage(stages, match.kickoff_at)?.key);

    const started = byKickoff.filter((match) => Date.parse(match.kickoff_at) <= now.getTime());
    const current = started.at(-1);
    let round: RoundSummary['round'] = null;
    if (current) {
        const key = keyOf(current);
        const group = byKickoff.filter((match) => keyOf(match) === key);
        const stage = findCompetitionStage(stages, current.kickoff_at);
        round = {
            label: stage ? null : current.round,
            stageKind: stage ? (stage.kind as StageKind) : null,
            firstKickoff: group[0]?.kickoff_at ?? current.kickoff_at,
            points: group.reduce(
                (sum, match) => sum + (predictions.get(match.id)?.points_awarded ?? 0),
                0,
            ),
        };
    }

    const verdicts: FormVerdict[] = [];
    for (const match of byKickoff) {
        const prediction = predictions.get(match.id);
        if (!prediction) continue;
        const verdict = verdictOf(prediction);
        if (verdict !== 'pending') verdicts.push(verdict);
    }

    return {
        round,
        goodCount: verdicts.filter((verdict) => verdict !== 'missed').length,
        form: verdicts.slice(-FORM_LENGTH),
    };
}
