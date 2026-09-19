import { Text, View } from '@/tw';

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
 * Le carré porte la mise en page, pas le glyphe : sur Android, l'emoji Noto
 * est plus large que sa taille de police et un Text borné au carré le rognait
 * à droite et en bas (constaté à l'émulateur, 2026-09-19). Le texte est donc
 * centré en absolu dans une zone plus grande que le carré, qui le laisse
 * déborder sans rien décaler.
 *
 * Décoratif pour les lecteurs d'écran (le libellé porte le sens), et
 * insensible à la taille de police système : un emoji agrandi déborderait
 * de son carré.
 */
const SIZES: Record<ReactionEmojiSize, { box: number; font: number }> = {
    chip: { box: 15, font: 13 },
    filter: { box: 16, font: 14 },
    sheet: { box: 24, font: 20 },
    picker: { box: 28, font: 25 },
};

export function ReactionEmoji({ emoji, size }: ReactionEmojiProps) {
    const { box, font } = SIZES[size];
    // Marge de débordement : de quoi loger le glyphe le plus large
    const bleed = Math.ceil(box / 2);

    return (
        <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={{ width: box, height: box }}>
            <Text
                allowFontScaling={false}
                className="absolute text-center"
                style={{
                    top: -bleed,
                    bottom: -bleed,
                    left: -bleed,
                    right: -bleed,
                    fontSize: font,
                    lineHeight: box + 2 * bleed,
                    textAlignVertical: 'center',
                    includeFontPadding: false,
                }}>
                {emoji}
            </Text>
        </View>
    );
}
