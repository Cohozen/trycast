import { type ReactNode, useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { cn } from '@/tw/variants';

type BottomSheetProps = {
    visible: boolean;
    onClose: () => void;
    /** Contenu du volet (sous la poignée). */
    children: ReactNode;
    /** Classes de la surface (bordure, teinte…). */
    className?: string;
    /** Classes du conteneur de contenu (padding horizontal, gap…). */
    contentClassName?: string;
    /** Teinte du fond assombri (défaut charbon neutre). */
    backdropColor?: string;
    /** Opacité maximale du fond assombri. */
    backdropOpacity?: number;
    /** Plancher du padding bas (au-dessus de la barre gestuelle). */
    bottomInset?: number;
};

// Fondu du fond en place + glissé du volet : ~320 ms à l'ouverture,
// un poil plus vif à la fermeture. Courbe douce (sortie cubique).
const OPEN = { duration: 320, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 240, easing: Easing.in(Easing.cubic) };
// Au-delà de ce quart de hauteur glissé (ou d'un geste lancé), on ferme.
const DISMISS_RATIO = 0.25;
const DISMISS_VELOCITY = 900;

/**
 * Volet ancré en bas, réutilisable (détail des points, aperçu de ligue…).
 * Corrige les limites du `Modal animationType="slide"` natif : le fond
 * assombri apparaît en fondu *sur tout l'écran* (le volet passe par-dessus),
 * l'animation est plus posée, et on peut fermer en glissant vers le bas —
 * pas seulement via un bouton. Respecte « réduire les animations ».
 */
export function BottomSheet({
    visible,
    onClose,
    children,
    className,
    contentClassName,
    backdropColor = '#16130E',
    backdropOpacity = 0.4,
    bottomInset = 32,
}: BottomSheetProps) {
    const insets = useSafeAreaInsets();
    const reduce = useReducedMotion();

    // On garde le volet monté le temps de jouer l'animation de sortie. Le
    // montage à l'ouverture se fait en phase de rendu (motif React « ajuster
    // un état sur changement de prop »), sans effet ni cascade de rendus.
    const [rendered, setRendered] = useState(visible);
    if (visible && !rendered) {
        setRendered(true);
    }

    // 0 = fermé (volet hors écran, fond transparent), 1 = ouvert.
    const progress = useSharedValue(0);
    // Décalage additionnel vers le bas pendant le glissé (≥ 0).
    const dragY = useSharedValue(0);
    // Hauteur mesurée du volet — sert de course d'animation. Initialisée à la
    // hauteur d'écran pour que le volet démarre hors champ avant la mesure.
    const height = useSharedValue(Dimensions.get('window').height);
    // Miroir de `visible` sur le thread UI : le seul mutant de `target`, ce
    // qui laisse `progress`/`dragY` libres d'être pilotés par les worklets
    // (règle react-compiler : une valeur lue par un effet ne peut être mutée
    // ailleurs — on isole donc l'animation hors de tout useEffect).
    const target = useSharedValue(visible ? 1 : 0);
    useEffect(() => {
        target.value = visible ? 1 : 0;
    }, [visible, target]);

    const finishClose = () => setRendered(false);

    // Réagit au miroir : glissé d'entrée/sortie du volet + démontage après la
    // sortie. Tout se passe côté worklet — aucune mutation de shared value en
    // dehors d'ici et des gestes.
    useAnimatedReaction(
        () => target.value,
        (next, prev) => {
            // Montage : jouer l'entrée si on s'ouvre, ne rien faire si fermé.
            if (prev === null || next === prev) {
                if (next === 1) {
                    progress.value = withTiming(1, reduce ? { duration: 0 } : OPEN);
                }
                return;
            }
            if (next === 1) {
                // Réouverture : on repart d'un glissé nul, au cas où une sortie
                // aurait été interrompue avant que son callback ne le remette à 0.
                dragY.value = 0;
                progress.value = withTiming(1, reduce ? { duration: 0 } : OPEN);
            } else {
                // On ne ramène plus `dragY` à 0 pendant la sortie : ça le
                // ferait remonter (vers le haut) pendant que `progress` pousse
                // le volet vers le bas, d'où le petit sursaut visible quand on
                // ferme en plein glissé. On laisse `dragY` tel quel — le volet
                // descend alors de façon strictement monotone (translateY va de
                // `dragY` à `height + dragY`) — et on le remet à zéro dans le
                // callback, hors écran, avant la prochaine ouverture.
                progress.value = withTiming(0, reduce ? { duration: 0 } : CLOSE, (finished) => {
                    if (finished) {
                        dragY.value = 0;
                        runOnJS(finishClose)();
                    }
                });
            }
        },
        [reduce],
    );

    // Gestes auto-workletisés par le plugin babel de Reanimated : muter une
    // shared value y est l'idiome standard, mais react-compiler ne reconnaît
    // pas ces callbacks comme des worklets (contrairement à useAnimatedReaction),
    // d'où les suppressions ciblées ci-dessous.
    const pan = Gesture.Pan()
        .onUpdate((event) => {
            // eslint-disable-next-line react-hooks/immutability -- worklet de geste
            dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
            const shouldDismiss =
                dragY.value > height.value * DISMISS_RATIO || event.velocityY > DISMISS_VELOCITY;
            if (shouldDismiss) {
                // On délègue la fermeture au parent (visible → false) : le
                // miroir rejoue alors l'animation de sortie de façon unifiée.
                runOnJS(onClose)();
            } else {
                // eslint-disable-next-line react-hooks/immutability -- worklet de geste
                dragY.value = withSpring(0, { damping: 20, stiffness: 220 });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - progress.value) * height.value + dragY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => {
        const dragFade = height.value > 0 ? 1 - dragY.value / height.value : 1;
        return {
            opacity: progress.value * backdropOpacity * Math.max(dragFade, 0),
        };
    });

    return (
        <Modal
            animationType="none"
            navigationBarTranslucent
            onRequestClose={onClose}
            statusBarTranslucent
            transparent
            visible={rendered}>
            <GestureHandlerRootView style={styles.root}>
                <View className="flex-1 justify-end">
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: backdropColor },
                            backdropStyle,
                        ]}
                    />
                    <Pressable
                        accessibilityRole="button"
                        onPress={onClose}
                        style={StyleSheet.absoluteFill}
                    />
                    <GestureDetector gesture={pan}>
                        <Animated.View
                            onLayout={(event) => {
                                height.value = event.nativeEvent.layout.height;
                            }}
                            style={sheetStyle}>
                            <View
                                className={cn(
                                    'rounded-t-lg bg-surface pt-2 tc-shadow-lg',
                                    className,
                                )}
                                style={{ paddingBottom: Math.max(insets.bottom, bottomInset) }}>
                                <View className="mb-3 h-1 w-10 self-center rounded-pill bg-border-strong" />
                                <View className={contentClassName}>{children}</View>
                            </View>
                        </Animated.View>
                    </GestureDetector>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
