import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { LeagueRoundEntry } from '@/features/leagues/round-points';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type RoundStandingRowProps = {
    entry: LeagueRoundEntry;
    isMe: boolean;
};

/**
 * Ligne du classement d'une journée (maquette Détail Ligue, onglet
 * Résultats) : points de la journée en « +n » — pas le cumul de la saison.
 * Même vocabulaire visuel que LeaderboardRow (rang, avatar, accent sur moi),
 * mais des stats propres à la journée.
 */
export function RoundStandingRow({ entry, isMe }: RoundStandingRowProps) {
    const { t } = useTranslation(['leagues']);
    const exactLine =
        entry.exactScores > 0
            ? t('leagues:leaderboard.row.exacts', { count: entry.exactScores })
            : t('leagues:detail.results.exactsNone');

    return (
        <View
            className={cn(
                'flex-row items-center gap-3 rounded-md border bg-surface px-3.5 py-2.5',
                isMe ? 'border-accent/40 bg-accent/10' : 'border-border',
            )}>
            <Text
                className={cn(
                    'w-6 text-center font-display text-[17px]',
                    isMe ? 'text-accent' : entry.rank <= 3 ? 'text-brand' : 'text-text-faint',
                )}>
                {entry.rank}
            </Text>
            <Avatar name={entry.username} ring={isMe} size="sm" uri={entry.avatarUrl} />
            <View className="min-w-0 flex-1 gap-px">
                <Text
                    className={cn(
                        'text-[15px] text-text',
                        isMe ? 'font-body-bold' : 'font-body-semibold',
                    )}
                    numberOfLines={1}>
                    {entry.username}
                </Text>
                <Text
                    className={cn(
                        'font-body text-[12px]',
                        entry.exactScores > 0
                            ? 'font-body-semibold text-accent'
                            : 'text-text-faint',
                    )}>
                    {exactLine}
                </Text>
            </View>
            <View className="flex-row items-baseline gap-1">
                <Text
                    className={cn(
                        'font-display text-[20px] leading-[21px]',
                        isMe ? 'text-accent' : 'text-text',
                    )}>
                    +{entry.points}
                </Text>
                <Text className="font-body-bold text-[11px] text-text-muted">pts</Text>
            </View>
        </View>
    );
}
