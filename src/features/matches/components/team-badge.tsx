import type { TeamRow } from '@/features/matches/types';
import { Text, View } from '@/tw';

type TeamBadgeProps = {
    team: TeamRow | null;
};

/** Drapeau + tricode d'une équipe. Fallbacks : nom complet sans tricode, « À déterminer » sans équipe. */
export function TeamBadge({ team }: TeamBadgeProps) {
    if (!team) {
        return (
            <View className="flex-1 items-center gap-1">
                <Text className="text-3xl">🏉</Text>
                <Text className="text-center text-xs text-gray-400">À déterminer</Text>
            </View>
        );
    }
    return (
        <View className="flex-1 items-center gap-1">
            <Text className="text-3xl">{team.flag_emoji ?? '🏉'}</Text>
            <Text className="text-center text-sm font-semibold text-gray-900">
                {team.code ?? team.name}
            </Text>
        </View>
    );
}
