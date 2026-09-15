import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type PodiumProps = {
    /** Entrées du classement (le podium prend les 3 premières). */
    entries: readonly LeaderboardEntry[];
    meUserId: string | undefined;
    /** Ouvre le profil public d'un joueur. Ma propre marche reste inerte. */
    onSelect?: (userId: string) => void;
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
    onPress,
}: {
    entry: LeaderboardEntry;
    place: 1 | 2 | 3;
    isMe: boolean;
    onPress?: () => void;
}) {
    const { t } = useTranslation(['leagues']);
    const accentColor = useThemeColor('accent');
    const first = place === 1;
    const styles = PLACE_STYLES[place];

    // La classe de colonne reste sur l'élément le plus externe (flex-1 +
    // max-w portent la mise en page du podium) : Pressable ou View, jamais un
    // wrapper intermédiaire qui écraserait la répartition des 3 marches.
    const columnClassName = cn(
        'flex-1 items-center gap-[7px]',
        first ? 'max-w-[118px]' : 'max-w-[106px]',
    );

    const inner = (
        <>
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
        </>
    );

    if (!onPress) return <View className={columnClassName}>{inner}</View>;
    return (
        <Pressable
            accessibilityLabel={t('leagues:leaderboard.row.openProfile', {
                username: entry.username,
            })}
            accessibilityRole="button"
            className={columnClassName}
            onPress={onPress}>
            {inner}
        </Pressable>
    );
}

/** Podium 2/1/3 du Classement (maquette) : le 1er porte l'étincelle grenat. */
export function Podium({ entries, meUserId, onSelect }: PodiumProps) {
    const [first, second, third] = entries;
    if (!first || !second || !third) return null;

    // Ma propre marche n'ouvre rien : on ne consulte pas son propre profil.
    const pressOf = (entry: LeaderboardEntry) =>
        onSelect && entry.user_id !== meUserId ? () => onSelect(entry.user_id) : undefined;

    return (
        <View className="flex-row items-end justify-center gap-2 px-0.5 pt-1.5">
            <PodiumColumn
                entry={second}
                isMe={second.user_id === meUserId}
                onPress={pressOf(second)}
                place={2}
            />
            <PodiumColumn
                entry={first}
                isMe={first.user_id === meUserId}
                onPress={pressOf(first)}
                place={1}
            />
            <PodiumColumn
                entry={third}
                isMe={third.user_id === meUserId}
                onPress={pressOf(third)}
                place={3}
            />
        </View>
    );
}
