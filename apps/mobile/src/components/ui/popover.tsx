import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { cn } from '@/tw/variants';

/** Rectangle de l'ancre en coordonnées fenêtre (`measureInWindow`). */
export type PopoverAnchor = { x: number; y: number; width: number; height: number };

type PopoverProps = {
    /** Ancre mesurée ; `null` = fermé. */
    anchor: PopoverAnchor | null;
    onClose: () => void;
    children: ReactNode;
    /** Décalage du bord gauche du popover par rapport à celui de l'ancre. */
    offsetX?: number;
    accessibilityLabel?: string;
    /** Classes du contenant (fond, bordure, radius par défaut : pilule). */
    className?: string;
};

// Maquette « TryCast Reactions » : ouverture 200 ms, fermeture 120 ms, sortie
// douce ; le popover chevauche l'ancre de 4 px, flèche à 22 px de son bord.
const OPEN = { duration: 200, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 120, easing: Easing.out(Easing.cubic) };
const OVERLAP = 4;
const ARROW_LEFT = 22;
const ARROW_SIZE = 10;
const EDGE = 16;
/** En dessous de cette place au-dessus de l'ancre, le popover s'ouvre vers le bas. */
const FLIP_THRESHOLD = 76;

/**
 * Popover ancré à un élément, avec flèche (sélecteur de réactions…). Modal RN
 * transparent comme `Select` : un overlay en zIndex se ferait clipper par les
 * ScrollView Android, et le Modal bloque le scroll de l'écran pendant qu'il est
 * ouvert. S'ouvre au-dessus de l'ancre, ou en dessous quand la place manque
 * (ligne en haut d'écran). Fermeture au tap dehors et au retour Android.
 *
 * L'appelant mesure l'ancre (`measureInWindow` sur une vue `collapsable={false}`)
 * et passe le rectangle : pas d'effet de mesure ici. Le popover reste monté le
 * temps de sa sortie, comme `BottomSheet`, et « réduire les animations » le
 * fait apparaître et disparaître sans translation ni échelle.
 */
export function Popover({
    anchor,
    onClose,
    children,
    offsetX = 0,
    accessibilityLabel,
    className,
}: PopoverProps) {
    const window = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const reduce = useReducedMotion();

    // Dernière ancre affichée : survit à la fermeture le temps de la sortie.
    // Mise à jour en phase de rendu (motif « ajuster un état sur prop »).
    const [shown, setShown] = useState<PopoverAnchor | null>(anchor);
    if (anchor && anchor !== shown) {
        setShown(anchor);
    }
    // Taille mesurée du contenu : l'entrée n'est jouée qu'une fois connue,
    // sinon la première image serait mal placée.
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    // Fermé avant d'avoir été mesuré : rien n'a été montré, rien à animer.
    if (!anchor && shown && !size) {
        setShown(null);
    }

    const progress = useSharedValue(0);
    // Miroir de l'état voulu sur le thread UI (cf. BottomSheet : react-compiler
    // interdit de muter ailleurs une shared value lue par un effet).
    const target = useSharedValue(0);
    const open = anchor !== null && size !== null;
    useEffect(() => {
        target.value = open ? 1 : 0;
    }, [open, target]);

    const finishClose = () => {
        setShown(null);
        setSize(null);
    };

    useAnimatedReaction(
        () => target.value,
        (next, prev) => {
            if (next === prev) return;
            if (next === 1) {
                progress.value = withTiming(1, reduce ? { duration: 0 } : OPEN);
            } else if (prev !== null) {
                progress.value = withTiming(0, reduce ? { duration: 0 } : CLOSE, (finished) => {
                    if (finished) runOnJS(finishClose)();
                });
            }
        },
        [reduce],
    );

    const below = shown ? shown.y - insets.top < FLIP_THRESHOLD : false;

    const animatedStyle = useAnimatedStyle(() => {
        const p = progress.value;
        if (reduce) return { opacity: p };
        return {
            opacity: p,
            transform: [{ translateY: (1 - p) * (below ? -6 : 6) }, { scale: 0.92 + 0.08 * p }],
        };
    });

    if (!shown) return null;

    const width = size?.width ?? 0;
    const height = size?.height ?? 0;
    const left = Math.min(Math.max(shown.x + offsetX, EDGE), window.width - EDGE - width);
    const top = below ? shown.y + shown.height - OVERLAP : shown.y + OVERLAP - height;

    return (
        <Modal
            animationType="none"
            navigationBarTranslucent
            onRequestClose={onClose}
            statusBarTranslucent
            transparent
            visible>
            {/* Scrim invisible sans rôle : la fermeture accessible passe par
             * onRequestClose (cf. Select) */}
            <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
            <Animated.View
                accessibilityLabel={accessibilityLabel}
                accessibilityViewIsModal
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (!size || size.width !== layout.width || size.height !== layout.height) {
                        setSize({ width: layout.width, height: layout.height });
                    }
                }}
                style={[
                    styles.panel,
                    {
                        left,
                        top,
                        // L'échelle part de la pointe de la flèche, côté ancre
                        transformOrigin: `${ARROW_LEFT + ARROW_SIZE / 2}px ${below ? '0%' : '100%'}`,
                    },
                    animatedStyle,
                ]}>
                <View
                    className={cn(
                        'rounded-pill border border-border bg-surface tc-shadow-lg',
                        className,
                    )}>
                    {children}
                </View>
                {/* Flèche : carré tourné, deux bordures visibles côté ancre */}
                <View
                    className={cn(
                        'absolute rotate-45 border-border bg-surface',
                        below ? 'border-l border-t' : 'border-b border-r',
                    )}
                    pointerEvents="none"
                    style={{
                        left: ARROW_LEFT,
                        width: ARROW_SIZE,
                        height: ARROW_SIZE,
                        ...(below ? { top: -ARROW_SIZE / 2 } : { bottom: -ARROW_SIZE / 2 }),
                    }}
                />
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    panel: { position: 'absolute' },
});
