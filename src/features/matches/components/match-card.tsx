import type React from 'react';

import { TeamBadge } from '@/features/matches/components/team-badge';
import { formatKickoff, statusLabel } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { Text, View } from '@/tw';

type MatchCardProps = {
    match: MatchWithTeams;
    /** Contenu additionnel sous la ligne équipes/score (ex. prono sur la page Résultats). */
    children?: React.ReactNode;
};

export function MatchCard({ match, children }: MatchCardProps) {
    const badge = statusLabel(match.status);
    const hasScore = match.home_score != null && match.away_score != null;

    return (
        <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center gap-2">
                <TeamBadge team={match.home_team} />

                <View className="items-center gap-1 px-2">
                    {hasScore ? (
                        <Text className="text-xl font-bold text-gray-900">
                            {match.home_score} – {match.away_score}
                        </Text>
                    ) : (
                        <Text className="text-center text-sm text-gray-500">
                            {formatKickoff(match.kickoff_at)}
                        </Text>
                    )}
                    {badge ? (
                        <View className="rounded-full bg-gray-100 px-2 py-0.5">
                            <Text className="text-xs font-medium text-gray-600">{badge}</Text>
                        </View>
                    ) : null}
                </View>

                <TeamBadge team={match.away_team} />
            </View>
            {children}
        </View>
    );
}
