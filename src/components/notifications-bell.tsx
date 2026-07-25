import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { useSession } from '@/features/auth/session-context';
import { useUnreadNotificationCount } from '@/features/notifications/use-notifications';
import { Text, useThemeColor, View } from '@/tw';

/**
 * Accès à l'historique des notifications, posé en haut à droite de chaque
 * onglet (comme l'accès aux réglages sur le profil). La pastille compte les
 * non-lues ; au-delà de 9 elle passe en « 9+ » pour ne pas déborder du rond.
 */
export function NotificationsBell() {
    const { t } = useTranslation(['notifications']);
    const router = useRouter();
    const { session } = useSession();
    const unread = useUnreadNotificationCount(session?.user.id);
    const textColor = useThemeColor('text');

    return (
        <View>
            <IconButton
                accessibilityLabel={
                    unread > 0
                        ? `${t('notifications:bell')}, ${t('notifications:unread', { count: unread })}`
                        : t('notifications:bell')
                }
                onPress={() => router.push('/notifications')}
                variant="soft">
                <Bell color={textColor} size={20} strokeWidth={1.9} />
            </IconButton>
            {unread > 0 ? (
                <View
                    className="absolute -right-0.5 -top-0.5 h-4.5 min-w-4.5 items-center justify-center rounded-pill border-2 border-bg bg-accent px-1"
                    pointerEvents="none">
                    <Text className="font-body-bold text-[10px] leading-3 text-on-accent">
                        {unread > 9 ? '9+' : unread}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
