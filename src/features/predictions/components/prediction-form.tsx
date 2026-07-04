import type { PostgrestError } from '@supabase/supabase-js';
import { useState } from 'react';

import { PrimaryButton } from '@/components/form';
import type { MatchWithTeams } from '@/features/matches/types';
import { BonusCheckbox } from '@/features/predictions/components/bonus-checkbox';
import { ScoreInput } from '@/features/predictions/components/score-input';
import { toFrenchPredictionMessage } from '@/features/predictions/errors';
import type { PredictionRow } from '@/features/predictions/types';
import { useUpsertPrediction } from '@/features/predictions/use-upsert-prediction';
import { parsePredictedScore, validatePredictedScore } from '@/features/predictions/validation';
import { BAREME_V1 } from '@/features/scoring/bareme';
import { computePotentialPoints } from '@/features/scoring/compute-match-points';
import { Text, View } from '@/tw';

type PredictionFormProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    userId: string;
};

/**
 * Saisie inline du prono d'un match à venir : score exact + cases bonus
 * offensif, aperçu « peut rapporter N pts » via le module de scoring partagé.
 * La deadline reste portée par la RLS : après kickoff le serveur refuse (42501).
 */
export function PredictionForm({ match, prediction, userId }: PredictionFormProps) {
    const [homeRaw, setHomeRaw] = useState(
        prediction ? String(prediction.predicted_home_score) : '',
    );
    const [awayRaw, setAwayRaw] = useState(
        prediction ? String(prediction.predicted_away_score) : '',
    );
    const [bonusHome, setBonusHome] = useState(prediction?.predicted_bonus_off_home ?? false);
    const [bonusAway, setBonusAway] = useState(prediction?.predicted_bonus_off_away ?? false);

    const upsert = useUpsertPrediction(userId, match.competition_id);

    const homeError = homeRaw === '' ? null : validatePredictedScore(homeRaw);
    const awayError = awayRaw === '' ? null : validatePredictedScore(awayRaw);
    const complete =
        homeRaw !== '' &&
        awayRaw !== '' &&
        validatePredictedScore(homeRaw) === null &&
        validatePredictedScore(awayRaw) === null;

    const draft = complete
        ? {
              match_id: match.id,
              predicted_home_score: parsePredictedScore(homeRaw),
              predicted_away_score: parsePredictedScore(awayRaw),
              predicted_bonus_off_home: bonusHome,
              predicted_bonus_off_away: bonusAway,
          }
        : null;

    const potential = draft
        ? computePotentialPoints(
              {
                  homeScore: draft.predicted_home_score,
                  awayScore: draft.predicted_away_score,
                  bonusOffHome: draft.predicted_bonus_off_home,
                  bonusOffAway: draft.predicted_bonus_off_away,
              },
              { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
              BAREME_V1,
          ).total
        : null;

    const saved =
        prediction !== undefined &&
        draft !== null &&
        draft.predicted_home_score === prediction.predicted_home_score &&
        draft.predicted_away_score === prediction.predicted_away_score &&
        draft.predicted_bonus_off_home === prediction.predicted_bonus_off_home &&
        draft.predicted_bonus_off_away === prediction.predicted_bonus_off_away;

    return (
        <View className="gap-3">
            <View className="flex-row items-center justify-center gap-3">
                <ScoreInput
                    value={homeRaw}
                    onChangeText={setHomeRaw}
                    accessibilityLabel="Score de l’équipe à domicile"
                    invalid={homeError !== null}
                />
                <Text className="text-lg font-bold text-gray-400">–</Text>
                <ScoreInput
                    value={awayRaw}
                    onChangeText={setAwayRaw}
                    accessibilityLabel="Score de l’équipe à l’extérieur"
                    invalid={awayError !== null}
                />
            </View>

            <View className="flex-row justify-between">
                <BonusCheckbox
                    label="4 essais ou +"
                    checked={bonusHome}
                    onToggle={() => setBonusHome((v) => !v)}
                />
                <BonusCheckbox
                    label="4 essais ou +"
                    checked={bonusAway}
                    onToggle={() => setBonusAway((v) => !v)}
                />
            </View>

            <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm text-gray-600">
                    {potential !== null ? `Peut rapporter ${potential} pts` : 'Entre ton score'}
                </Text>
                {saved ? (
                    <Text className="text-sm font-medium text-green-700">Prono enregistré ✓</Text>
                ) : (
                    <PrimaryButton
                        title="Valider"
                        loading={upsert.isPending}
                        disabled={draft === null}
                        onPress={() => {
                            if (draft) upsert.mutate(draft);
                        }}
                    />
                )}
            </View>

            {upsert.isError ? (
                <Text className="text-sm text-red-600">
                    {toFrenchPredictionMessage(upsert.error as PostgrestError)}
                </Text>
            ) : null}
        </View>
    );
}
