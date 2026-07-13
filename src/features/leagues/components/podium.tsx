import { Star } from 'lucide-react-native';

import { Avatar } from '@/components/ui/avatar';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type PodiumProps = {
    /** Entrées du classement (le podium prend les 3 premières). */
    entries: readonly LeaderboardEntry[];
    meUserId: string | undefined;
};

const PLACE_STYLES = {
    1: {
        pedestal: 'h-24 border-[1.5px] border-accent/40 bg-accent/10 tc-glow-accent',
        number: 'text-[40px] text-accent',
    },
    2: {
        pedestal: 'h-[68px] border border-border bg-surface',
        number: 'text-[30px] text-text-muted',
    },
    3: {
        pedestal: 'h-[52px] border border-border bg-surface',
        number: 'text-[30px] text-text-muted',
    },
} as const;

function PodiumColumn({
    entry,
    place,
    isMe,
}: {
    entry: LeaderboardEntry;
    place: 1 | 2 | 3;
    isMe: boolean;
}) {
    const accentColor = useThemeColor('accent');
    const first = place === 1;
    const styles = PLACE_STYLES[place];

    return (
        <View
            className={cn(
                'flex-1 items-center gap-[7px]',
                first ? 'max-w-[118px]' : 'max-w-[106px]',
            )}>
            {first ? <Star color={accentColor} fill={accentColor} size={20} /> : null}
            <Avatar
                name={entry.username}
                ring={isMe}
                size={first ? 'lg' : 'md'}
                uri={entry.avatar_url}
            />
            <Text
                className={cn(
                    'max-w-full text-center text-[12px] text-text',
                    first ? 'font-body-bold text-[13px]' : 'font-body-semibold',
                )}
                numberOfLines={1}>
                {entry.username}
            </Text>
            <View className="flex-row items-baseline gap-0.5">
                <Text
                    className={cn(
                        'font-display leading-[21px]',
                        first ? 'text-[26px] leading-[27px] text-accent' : 'text-[20px] text-text',
                    )}>
                    {entry.total_points}
                </Text>
                <Text
                    className={cn(
                        'font-body-bold text-[9px]',
                        first ? 'text-[10px] text-accent' : 'text-text-faint',
                    )}>
                    pts
                </Text>
            </View>
            <View
                className={cn('w-full items-center justify-center rounded-t-sm', styles.pedestal)}>
                <Text className={cn('font-display leading-[41px]', styles.number)}>{place}</Text>
            </View>
        </View>
    );
}

/** Podium 2/1/3 du Classement (maquette) : le 1er porte l'étincelle grenat. */
export function Podium({ entries, meUserId }: PodiumProps) {
    const [first, second, third] = entries;
    if (!first || !second || !third) return null;

    return (
        <View className="flex-row items-end justify-center gap-2 px-0.5 pt-1.5">
            <PodiumColumn entry={second} isMe={second.user_id === meUserId} place={2} />
            <PodiumColumn entry={first} isMe={first.user_id === meUserId} place={1} />
            <PodiumColumn entry={third} isMe={third.user_id === meUserId} place={3} />
        </View>
    );
}
