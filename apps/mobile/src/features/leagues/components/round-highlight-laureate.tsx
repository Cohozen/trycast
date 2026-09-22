import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { HighlightLaureate } from '@/features/leagues/round-highlight';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

/**
 * Ligne d'un lauréat dans la carte du coup de la journée : avatar (cerclé si
 * c'est moi), pseudo, ×2 en contour vert si le joker était posé, prono, points
 * en grenat. Plus compacte quand les ex æquo s'empilent.
 */
export function RoundHighlightLaureate({
    laureate,
    single,
    subline,
}: {
    laureate: HighlightLaureate;
    single: boolean;
    subline: string;
}) {
    const { t } = useTranslation(['leagues', 'jokers']);
    return (
        <View className="flex-row items-center gap-2.5">
            <Avatar
                name={laureate.username}
                ring={laureate.isMe}
                size={single ? 'md' : 'sm'}
                uri={laureate.avatarUrl}
            />
            <View className="min-w-0 flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                    <Text
                        className="shrink font-body-bold text-[14.5px] text-text"
                        numberOfLines={1}>
                        {laureate.username}
                    </Text>
                    {laureate.isJoker ? (
                        <View
                            accessibilityLabel={t('jokers:badge.label')}
                            accessible
                            className="h-[18px] items-center justify-center rounded-pill border border-brand/55 px-[7px]">
                            <Text className="font-display text-[12px] leading-[15px] tracking-[0.24px] text-brand">
                                ×2
                            </Text>
                        </View>
                    ) : null}
                </View>
                <Text
                    className="font-body-semibold text-[11.5px] text-text-faint"
                    numberOfLines={1}>
                    {subline}
                </Text>
            </View>
            <View className="flex-row items-baseline gap-[3px]">
                <Text
                    className={cn(
                        'font-display text-accent',
                        single ? 'text-[34px] leading-[38px]' : 'text-[24px] leading-[28px]',
                    )}>
                    +{laureate.points}
                </Text>
                <Text className="font-body-bold text-[11px] text-accent">
                    {t('leagues:detail.results.highlight.points')}
                </Text>
            </View>
        </View>
    );
}
