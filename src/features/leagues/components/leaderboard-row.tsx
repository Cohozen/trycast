import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type LeaderboardRowProps = {
    entry: LeaderboardEntry;
    /** Met en évidence la ligne de l'utilisateur connecté. */
    isMe: boolean;
    /** Rang partagé avec au moins une autre entrée (mention « ex æquo »). */
    tie?: boolean;
};

/**
 * Ligne de classement du design system (général ou ligue) : rang tabulaire,
 * avatar initiales, pseudo + stats, points Anton. Ma ligne porte la bordure
 * accent (l'étincelle marque ma position).
 */
export function LeaderboardRow({ entry, isMe, tie = false }: LeaderboardRowProps) {
    const { t } = useTranslation(['leagues']);
    const sub = [
        t('leagues:leaderboard.row.predictions', { count: entry.predictions_scored }),
        entry.exact_scores > 0
            ? t('leagues:leaderboard.row.exacts', { count: entry.exact_scores })
            : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <View
            className={cn(
                'flex-row items-center gap-3 rounded-md border bg-surface px-3.5 py-3',
                isMe ? 'border-accent/40 bg-accent/10' : 'border-border',
            )}>
            <View className="w-8 items-center gap-px">
                <Text
                    className={cn(
                        'text-center font-display text-[17px]',
                        isMe ? 'text-accent' : 'text-text-faint',
                    )}>
                    {entry.rank}
                </Text>
                {tie ? (
                    <Text className="font-body-bold text-[7px] uppercase tracking-[0.28px] text-text-faint">
                        {t('leagues:leaderboard.tie')}
                    </Text>
                ) : null}
            </View>
            <Avatar name={entry.username} ring={isMe} size="sm" />
            <View className="min-w-0 flex-1 gap-px">
                <Text
                    className={cn(
                        'text-[15px]',
                        isMe ? 'font-body-bold text-text' : 'font-body-semibold text-text',
                    )}
                    numberOfLines={1}>
                    {entry.username}
                </Text>
                <Text className="font-body text-[12px] text-text-faint">{sub}</Text>
            </View>
            <View className="flex-row items-baseline gap-1">
                <Text className="font-display text-[20px] leading-[21px] text-text">
                    {entry.total_points}
                </Text>
                <Text className="font-body-bold text-[11px] text-text-muted">pts</Text>
            </View>
        </View>
    );
}
