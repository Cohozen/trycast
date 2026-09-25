import { UserX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { useBlockedPlayers } from '@/features/profile/use-blocked-players';
import { useUnblockPlayer } from '@/features/profile/use-unblock-player';
import { Text, useThemeColor, View } from '@/tw';

/**
 * Réglages → Joueurs bloqués : le seul endroit qui montre le vrai pseudo d'un
 * joueur bloqué, pour savoir qui débloquer. Pas de photo, les initiales
 * suffisent. Titre et retour portés par le header natif (layout (app)).
 */
export default function BlockedPlayersScreen() {
    const { t, i18n } = useTranslation(['profile', 'common']);
    const toast = useToast();
    const brandColor = useThemeColor('brand');
    const blocked = useBlockedPlayers();
    const unblock = useUnblockPlayer();

    const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
    const rows = blocked.data ?? [];

    return (
        <Screen contentClassName="gap-3 px-[18px] pb-10 pt-4" top="none">
            {blocked.isPending ? (
                <Skeleton className="h-16" variant="block" />
            ) : blocked.isError ? (
                <Text className="px-1.5 font-body text-[14px] text-text-muted">
                    {t('common:errors.generic')}
                </Text>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<UserX color={brandColor} size={22} strokeWidth={1.9} />}
                    message={t('profile:blockedPlayers.emptyBody')}
                    title={t('profile:blockedPlayers.emptyTitle')}
                />
            ) : (
                <>
                    <Text className="px-1.5 font-body text-[13px] leading-[19px] text-text-muted">
                        {t('profile:blockedPlayers.intro')}
                    </Text>
                    {rows.map((row) => {
                        const username = row.blocked?.username ?? '?';
                        return (
                            <Card
                                className="flex-row items-center gap-3 px-4 py-3"
                                key={row.blocked_id}>
                                <Avatar name={username} size="sm" />
                                <View className="min-w-0 flex-1">
                                    <Text
                                        className="font-body-semibold text-[15px] text-text"
                                        numberOfLines={1}>
                                        {username}
                                    </Text>
                                    <Text className="font-body text-caption text-text-muted">
                                        {t('profile:blockedPlayers.since', {
                                            date: dateFormat.format(new Date(row.created_at)),
                                        })}
                                    </Text>
                                </View>
                                <Button
                                    disabled={unblock.isPending}
                                    onPress={() =>
                                        unblock.mutate(row.blocked_id, {
                                            onSuccess: () =>
                                                toast.show(
                                                    t('profile:playerActions.unblocked'),
                                                    'success',
                                                ),
                                            onError: () =>
                                                toast.show(t('common:errors.generic'), 'neutral'),
                                        })
                                    }
                                    size="sm"
                                    title={t('profile:playerActions.unblock')}
                                    variant="secondary"
                                />
                            </Card>
                        );
                    })}
                </>
            )}
        </Screen>
    );
}
