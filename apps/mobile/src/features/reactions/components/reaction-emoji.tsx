import { Text, View } from '@/tw';

type ReactionEmojiSize = 'chip' | 'filter' | 'trigger' | 'sheet' | 'picker';

type ReactionEmojiProps = {
    emoji: string;
    size: ReactionEmojiSize;
};

/**
 * Emplacement carré, de taille fixe par usage (maquette « TryCast
 * Reactions ») : 15 px sur la pastille, 16 dans les filtres, 20 sur le bouton
 * qui porte ma réaction, 24 dans la sheet, 28 dans le popover. Aujourd'hui un
 * emoji système ; demain un picto maison, qui prendra sa place ICI sans rien
 * changer aux mises en page.
 *
 * ⚠️ **La taille de police n'est pas la taille du glyphe** : mesuré au
 * simulateur le 2026-09-20, un emoji Apple est dessiné à ~1,2 fois sa taille
 * de police (13 pt de police → 16 pt à l'écran). La police se déduit donc de
 * la taille voulue, sinon les emoji débordent des cercles de la maquette.
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
const BOXES: Record<ReactionEmojiSize, number> = {
    chip: 15,
    filter: 16,
    trigger: 20,
    sheet: 24,
    picker: 28,
};

/** Rapport mesuré entre le glyphe dessiné et la taille de police. */
const GLYPH_RATIO = 1.2;

export function ReactionEmoji({ emoji, size }: ReactionEmojiProps) {
    const box = BOXES[size];
    const font = Math.round(box / GLYPH_RATIO);
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
