import { MatchCard } from '@/features/matches/components/match-card';
import type { MatchWithTeams } from '@/features/matches/types';
import { Text, View } from '@/tw';

type RoundSectionProps = {
    round: string;
    matches: MatchWithTeams[];
};

export function RoundSection({ round, matches }: RoundSectionProps) {
    return (
        <View className="gap-3">
            <Text className="text-lg font-semibold text-gray-900">{round}</Text>
            {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
            ))}
        </View>
    );
}
