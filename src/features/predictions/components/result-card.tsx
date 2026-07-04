import { MatchCard } from '@/features/matches/components/match-card';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { Text, View } from '@/tw';

type ResultCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
};

function bonusLabel(match: MatchWithTeams, prediction: PredictionRow): string | null {
    const teams: string[] = [];
    if (prediction.predicted_bonus_off_home) {
        teams.push(match.home_team?.code ?? match.home_team?.name ?? 'domicile');
    }
    if (prediction.predicted_bonus_off_away) {
        teams.push(match.away_team?.code ?? match.away_team?.name ?? 'extérieur');
    }
    return teams.length > 0 ? `Bonus offensif : ${teams.join(', ')}` : null;
}

/** Carte de la page Résultats : score réel, mon prono et points obtenus. */
export function ResultCard({ match, prediction }: ResultCardProps) {
    return (
        <MatchCard match={match}>
            <View className="gap-1 border-t border-gray-100 pt-3">
                {prediction ? (
                    <>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600">
                                Ton prono : {prediction.predicted_home_score} –{' '}
                                {prediction.predicted_away_score}
                            </Text>
                            {prediction.points_awarded !== null ? (
                                <Text className="text-sm font-semibold text-gray-900">
                                    {prediction.points_awarded} pts
                                </Text>
                            ) : (
                                <Text className="text-sm text-gray-400">Points à venir</Text>
                            )}
                        </View>
                        {bonusLabel(match, prediction) ? (
                            <Text className="text-xs text-gray-500">
                                {bonusLabel(match, prediction)}
                            </Text>
                        ) : null}
                    </>
                ) : (
                    <Text className="text-sm text-gray-400">Pas de prono sur ce match</Text>
                )}
            </View>
        </MatchCard>
    );
}
