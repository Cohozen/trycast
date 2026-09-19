import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionEmojiSize = 'chip' | 'filter' | 'sheet' | 'picker';

type ReactionEmojiProps = {
    emoji: string;
    size: ReactionEmojiSize;
};

/**
 * Emplacement carré, de taille fixe par usage (maquette « TryCast
 * Reactions ») : 15 px sur la puce, 16 dans les filtres, 24 dans la sheet,
 * 28 dans le popover. Aujourd'hui un emoji système ; demain un picto maison,
 * qui prendra sa place ICI sans rien changer aux mises en page.
 *
 * Décoratif pour les lecteurs d'écran (le libellé porte le sens), et
 * insensible à la taille de police système : un emoji agrandi déborderait
 * de son carré.
 */
const sizeClasses: Record<ReactionEmojiSize, { box: string; text: string }> = {
    chip: { box: 'h-[15px] w-[15px]', text: 'text-[13px] leading-[15px]' },
    filter: { box: 'h-4 w-4', text: 'text-[14px] leading-[16px]' },
    sheet: { box: 'h-6 w-6', text: 'text-[20px] leading-[24px]' },
    picker: { box: 'h-7 w-7', text: 'text-[25px] leading-[28px]' },
};

export function ReactionEmoji({ emoji, size }: ReactionEmojiProps) {
    const s = sizeClasses[size];
    return (
        <View
            accessibilityElementsHidden
            className={cn('items-center justify-center', s.box)}
            importantForAccessibility="no-hide-descendants">
            <Text
                allowFontScaling={false}
                className={cn('text-center', s.text)}
                style={{ includeFontPadding: false }}>
                {emoji}
            </Text>
        </View>
    );
}
