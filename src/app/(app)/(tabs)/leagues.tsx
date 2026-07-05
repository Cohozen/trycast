import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/form';
import { useSession } from '@/features/auth/session-context';
import { LeagueCard } from '@/features/leagues/components/league-card';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '@/tw';

export default function LeaguesScreen() {
    const router = useRouter();
    const { session } = useSession();
    const leagues = useMyLeagues();

    if (leagues.isPending) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    if (leagues.isError) {
        return (
            <View className="flex-1 items-center justify-center gap-4 p-6">
                <Text className="text-center text-base text-gray-600">
                    Impossible de charger tes ligues.
                </Text>
                <PrimaryButton title="Réessayer" onPress={() => void leagues.refetch()} />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-6 pt-16">
            <Text className="text-2xl font-bold text-gray-900">Ligues</Text>

            {leagues.data.length === 0 ? (
                <View className="items-center gap-2 py-10">
                    <Text className="text-3xl">🤝</Text>
                    <Text className="text-center text-base text-gray-500">
                        Crée une ligue avec tes amis ou rejoins-en une avec un code
                        d’invitation.
                    </Text>
                </View>
            ) : (
                <View className="gap-3">
                    {leagues.data.map((league) => (
                        <LeagueCard
                            key={league.id}
                            league={league}
                            isOwner={league.owner_id === session?.user.id}
                        />
                    ))}
                </View>
            )}

            <View className="gap-3 pt-2">
                <PrimaryButton
                    title="Créer une ligue"
                    onPress={() => router.push('/league/create')}
                />
                <Pressable
                    accessibilityRole="button"
                    className="items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3.5 active:opacity-70"
                    onPress={() => router.push('/league/join')}>
                    <Text className="text-base font-semibold text-gray-700">
                        Rejoindre avec un code
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
