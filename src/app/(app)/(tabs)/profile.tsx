import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { useProfile } from '@/features/profile/use-profile';
import { ScrollView, Text, useThemeColor, View } from '@/tw';

export default function ProfileScreen() {
    const { t } = useTranslation(['profile', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id ?? '';

    const { data: profile, isPending } = useProfile(userId);
    const textColor = useThemeColor('text');

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-[18px] self-center px-5 pb-32 pt-14">
            <View className="flex-row items-start justify-between gap-3">
                <Text className="font-display text-[30px] leading-[30px] tracking-[0.3px] text-text">
                    {t('profile:title')}
                </Text>
                <IconButton
                    accessibilityLabel={t('profile:settings.title')}
                    onPress={() => router.push('/settings')}
                    variant="soft">
                    <Settings color={textColor} size={20} strokeWidth={1.9} />
                </IconButton>
            </View>

            {isPending ? (
                <Skeleton className="h-[88px]" variant="block" />
            ) : (
                <Card className="flex-row items-center gap-3.5 px-4 py-3.5">
                    <Avatar name={profile?.username ?? '?'} ring size="lg" />
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-bold text-[16px] text-text">
                            {profile?.username}
                        </Text>
                        <Text className="font-body text-[13px] text-text-muted" numberOfLines={1}>
                            {session?.user.email}
                        </Text>
                    </View>
                </Card>
            )}
        </ScrollView>
    );
}
