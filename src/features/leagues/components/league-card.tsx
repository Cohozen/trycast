import { useRouter } from 'expo-router';

import type { LeagueRow } from '@/features/leagues/types';
import { Pressable, Text, View } from '@/tw';

type LeagueCardProps = {
    league: LeagueRow;
    /** Affiche le badge « owner » sur mes propres ligues. */
    isOwner: boolean;
};

/** Carte de la liste « Mes ligues » : ouvre le classement de la ligue. */
export function LeagueCard({ league, isOwner }: LeagueCardProps) {
    const router = useRouter();
    return (
        <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:opacity-70"
            onPress={() => router.push({ pathname: '/league/[id]', params: { id: league.id } })}>
            <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">{league.name}</Text>
                {isOwner ? (
                    <Text className="text-xs text-gray-500">Ta ligue</Text>
                ) : null}
            </View>
            <Text className="text-lg text-gray-400">›</Text>
        </Pressable>
    );
}
