import { TeamBadge } from '@/features/matches/components/team-badge';
import { formatKickoff } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { PredictionForm } from '@/features/predictions/components/prediction-form';
import type { PredictionRow } from '@/features/predictions/types';
import { Text, View } from '@/tw';

type UpcomingMatchCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    userId: string;
};

/** Carte d'un match à venir : équipes + coup d'envoi + saisie du prono. */
export function UpcomingMatchCard({ match, prediction, userId }: UpcomingMatchCardProps) {
    return (
        <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center gap-2">
                <TeamBadge team={match.home_team} />
                <View className="items-center gap-0.5 px-2">
                    <Text className="text-center text-sm text-gray-500">
                        {formatKickoff(match.kickoff_at)}
                    </Text>
                    {match.round ? (
                        <Text className="text-center text-xs text-gray-400">{match.round}</Text>
                    ) : null}
                </View>
                <TeamBadge team={match.away_team} />
            </View>
            <PredictionForm match={match} prediction={prediction} userId={userId} />
        </View>
    );
}
