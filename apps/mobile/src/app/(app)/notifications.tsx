import { BellOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { useSession } from '@/features/auth/session-context';
import { NotificationRow } from '@/features/notifications/components/notification-row';
import { useMarkNotificationsRead } from '@/features/notifications/use-mark-notifications-read';
import { useNotificationDeepLink } from '@/features/notifications/use-notification-deep-link';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useThemeColor, View } from '@/tw';

/**
 * Historique des notifications reçues, lues comme non lues (rien n'est jamais
 * retiré). Le tap marque comme lu et suit le deep link de la notification,
 * exactement comme un tap dans la barre système.
 */
export default function NotificationsScreen() {
    const { t } = useTranslation(['notifications']);
    const { session } = useSession();
    const userId = session?.user.id;
    const notifications = useNotifications(userId);
    const markRead = useMarkNotificationsRead(userId);
    const openDeepLink = useNotificationDeepLink();
    const mutedColor = useThemeColor('text-muted');
    const refreshControl = usePullToRefresh(() => notifications.refetch());

    const rows = notifications.data ?? [];
    const hasUnread = rows.some((notification) => !notification.read_at);

    return (
        <Screen contentClassName="gap-3 pt-2" refreshControl={refreshControl} top="none">
            {notifications.isPending ? (
                <>
                    <Skeleton className="h-[86px]" variant="block" />
                    <Skeleton className="h-[86px]" variant="block" />
                    <Skeleton className="h-[86px]" variant="block" />
                </>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<BellOff color={mutedColor} size={26} strokeWidth={1.7} />}
                    message={t('notifications:empty.message')}
                    title={t('notifications:empty.title')}
                />
            ) : (
                <>
                    {hasUnread ? (
                        <View className="items-end">
                            <Button
                                onPress={() => markRead.mutate('all')}
                                size="sm"
                                title={t('notifications:markAllRead')}
                                variant="ghost"
                            />
                        </View>
                    ) : null}
                    {rows.map((notification) => (
                        <NotificationRow
                            key={notification.id}
                            notification={notification}
                            onPress={() => {
                                if (!notification.read_at) {
                                    markRead.mutate({ ids: [notification.id] });
                                }
                                openDeepLink(notification.url);
                            }}
                        />
                    ))}
                </>
            )}
        </Screen>
    );
}
