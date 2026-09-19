import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { Pressable, Text } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionFilterProps = {
    /** Texte visible : « Toutes » ou le compteur de la réaction. */
    label: string;
    /** Emoji devant le compteur ; absent pour « Toutes ». */
    emoji?: string;
    accessibilityLabel: string;
    active: boolean;
    onPress: () => void;
};

/**
 * Filtre de la sheet des réactions. Sélection NEUTRE (sunken + contour
 * d'encre), pas le grenat plein de la primitive `Chip` : une réaction n'est
 * jamais grenat (maquette « TryCast Reactions »).
 */
export function ReactionFilter({
    label,
    emoji,
    accessibilityLabel,
    active,
    onPress,
}: ReactionFilterProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
                'h-8 flex-row items-center gap-[5px] rounded-pill border-[1.5px] px-3',
                active ? 'border-text/40 bg-surface-sunken' : 'border-border bg-transparent',
            )}
            onPress={onPress}>
            {emoji ? <ReactionEmoji emoji={emoji} size="filter" /> : null}
            <Text
                className={cn(
                    'font-body-bold text-[12px]',
                    active ? 'text-text' : 'text-text-muted',
                )}>
                {label}
            </Text>
        </Pressable>
    );
}
