import { Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type LeaderboardRowProps = {
    entry: LeaderboardEntry;
    /** Met en évidence la ligne de l'utilisateur connecté. */
    isMe: boolean;
    /** Rang partagé avec au moins une autre entrée (mention « ex æquo »). */
    tie?: boolean;
    /**
     * Ouvre le profil public du joueur. Absent = ligne inerte : c'est le cas
     * de ma propre ligne, qu'on n'ouvre pas depuis un classement.
     */
    onPress?: () => void;
};

/**
 * Ligne de classement du design system (général ou ligue) : rang tabulaire,
 * avatar initiales, pseudo + stats, points Anton. Ma ligne porte la bordure
 * accent (l'étincelle marque ma position).
 */
export function LeaderboardRow({ entry, isMe, tie = false, onPress }: LeaderboardRowProps) {
    const { t } = useTranslation(['leagues']);
    const accentColor = useThemeColor('accent');

    const content = (
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
            <Avatar name={entry.username} ring={isMe} size="sm" uri={entry.avatar_url} />
            <View className="min-w-0 flex-1 gap-0.75">
                <Text
                    className={cn(
                        'text-[15px]',
                        isMe ? 'font-body-bold text-text' : 'font-body-semibold text-text',
                    )}
                    numberOfLines={1}>
                    {entry.username}
                </Text>
                {/* Scores exacts en pastille cible (maquettes Classement et
                    Match Detail) : c'est le premier départage à égalité */}
                <View className="flex-row flex-wrap items-center gap-1.75">
                    <Text className="font-body-semibold text-[11px] text-text-faint">
                        {t('leagues:leaderboard.row.predictions', {
                            count: entry.predictions_scored,
                        })}
                    </Text>
                    {entry.exact_scores > 0 ? (
                        <View className="flex-row items-center gap-0.75 rounded-pill bg-accent/12 py-px pl-1.25 pr-1.75">
                            <Target color={accentColor} size={10} strokeWidth={2.4} />
                            <Text className="font-body-bold text-[10px] text-accent">
                                {t('leagues:leaderboard.row.exacts', {
                                    count: entry.exact_scores,
                                })}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <View className="flex-row items-baseline gap-1">
                <Text className="font-display text-[20px] leading-[21px] text-text">
                    {entry.total_points}
                </Text>
                <Text className="font-body-bold text-[11px] text-text-muted">pts</Text>
            </View>
        </View>
    );

    if (!onPress) return content;
    return (
        <Pressable
            accessibilityLabel={t('leagues:leaderboard.row.openProfile', {
                username: entry.username,
            })}
            accessibilityRole="button"
            onPress={onPress}>
            {content}
        </Pressable>
    );
}
