import Animated, { Keyframe } from 'react-native-reanimated';

import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionChipProps = {
    emoji: string;
    count: number;
    /** La puce contient ma réaction : contour d'encre, compteur en gras. */
    mine: boolean;
};

// Apparition en rebond 0,6 → 1,12 → 1 (maquette : 220 ms). Les layout
// animations de Reanimated s'effacent seules avec « réduire les animations ».
const CHIP_IN = new Keyframe({
    0: { transform: [{ scale: 0.6 }] },
    60: { transform: [{ scale: 1.12 }] },
    100: { transform: [{ scale: 1 }] },
}).duration(220);

/**
 * Puce « emoji + compteur » sous la ligne d'un membre. Neutre dans les deux
 * états : le grenat est réservé au score exact et à ma ligne, le vert au
 * joker — ma réaction se distingue par un contour d'encre, jamais par une
 * couleur de marque.
 */
export function ReactionChip({ emoji, count, mine }: ReactionChipProps) {
    return (
        <Animated.View entering={CHIP_IN}>
            <View
                className={cn(
                    'h-[22px] flex-row items-center gap-1 rounded-pill border-[1.5px] bg-surface-sunken pl-1.5 pr-2',
                    mine ? 'border-text/40' : 'border-transparent',
                )}>
                <ReactionEmoji emoji={emoji} size="chip" />
                <Text
                    className={cn(
                        'text-[11px]',
                        mine ? 'font-body-bold text-text' : 'font-body-semibold text-text-muted',
                    )}>
                    {count}
                </Text>
            </View>
        </Animated.View>
    );
}
