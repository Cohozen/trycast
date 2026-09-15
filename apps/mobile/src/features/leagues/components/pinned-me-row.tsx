import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Text, View } from '@/tw';

type PinnedMeRowProps = {
    rank: number;
    username: string;
    avatarUrl?: string | null;
    points: number;
    /** Écart de points avec le joueur juste au-dessus (null si premier). */
    gapToAbove: number | null;
};

/**
 * Barre « moi » épinglée au-dessus de la tab bar (maquette Classement,
 * scope Général) quand ma ligne est hors du top affiché. Le rang du joueur
 * au-dessus est approximé à rang − 1 (exact hors ex æquo).
 */
export function PinnedMeRow({ rank, username, avatarUrl, points, gapToAbove }: PinnedMeRowProps) {
    const { t } = useTranslation(['leagues']);

    return (
        <View className="absolute inset-x-3.5 bottom-28">
            <View className="flex-row items-center gap-3 rounded-md border-[1.5px] border-accent/45 bg-surface px-3.5 py-[11px] tc-shadow-lg">
                <View className="min-w-[42px] items-center">
                    <Text className="font-display text-[22px] leading-[22px] text-accent">
                        {rank}
                    </Text>
                    <Text className="font-body-bold text-[8px] uppercase tracking-[0.48px] text-accent">
                        {t('leagues:leaderboard.pinned.rankSuffix')}
                    </Text>
                </View>
                <Avatar name={username} ring size="sm" uri={avatarUrl} />
                <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="font-body-bold text-[14px] text-text" numberOfLines={1}>
                        {username}
                    </Text>
                    {gapToAbove !== null && rank > 1 ? (
                        <Text className="font-body-semibold text-[11px] text-text-muted">
                            {t('leagues:leaderboard.pinned.gap', {
                                gap: gapToAbove,
                                rank: rank - 1,
                            })}
                        </Text>
                    ) : null}
                </View>
                <View className="flex-row items-baseline gap-0.5">
                    <Text className="font-display text-[22px] leading-[23px] text-text">
                        {points}
                    </Text>
                    <Text className="font-body-bold text-[10px] text-text-faint">pts</Text>
                </View>
            </View>
        </View>
    );
}
