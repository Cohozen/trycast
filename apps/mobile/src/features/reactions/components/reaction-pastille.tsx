import Animated, { Keyframe } from 'react-native-reanimated';

import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { View } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionPastilleProps = {
    emoji: string;
    /** Chevauche la pastille précédente (toutes sauf la première). */
    overlap: boolean;
};

// Apparition en rebond 0,6 → 1,12 → 1 (maquette : 220 ms). Les layout
// animations de Reanimated s'effacent seules avec « réduire les animations ».
const PASTILLE_IN = new Keyframe({
    0: { transform: [{ scale: 0.6 }] },
    60: { transform: [{ scale: 1.12 }] },
    100: { transform: [{ scale: 1 }] },
}).duration(220);

/**
 * Pastille ronde d'une réaction présente sur un prono. Les pastilles se
 * chevauchent en pile (maquette « TryCast Reactions ») : le liseré couleur
 * surface les détache les unes des autres. Elles ne portent pas de compteur —
 * c'est le total de la pile qui est affiché à côté.
 */
export function ReactionPastille({ emoji, overlap }: ReactionPastilleProps) {
    return (
        <Animated.View entering={PASTILLE_IN}>
            <View
                className={cn(
                    'h-6 w-6 items-center justify-center rounded-pill border-[1.5px] border-surface bg-surface-sunken tc-shadow-sm',
                    overlap && '-ml-[7px]',
                )}>
                <ReactionEmoji emoji={emoji} size="chip" />
            </View>
        </Animated.View>
    );
}
