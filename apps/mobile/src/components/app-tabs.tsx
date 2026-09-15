import { usePathname } from 'expo-router';
import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, StyleSheet, type LayoutRectangle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaderboardTabIcon } from '@/components/tab-icons/leaderboard-tab-icon';
import { MatchesTabIcon } from '@/components/tab-icons/matches-tab-icon';
import { TAB_ICON_MOTION_DURATION } from '@/components/tab-icons/motion';
import { ProfileTabIcon } from '@/components/tab-icons/profile-tab-icon';
import { ResultsTabIcon } from '@/components/tab-icons/results-tab-icon';
import type { TabIconComponent } from '@/components/tab-icons/types';
import { Pressable, Text, useThemeColor, View } from '@/tw';

/**
 * Barre d'onglets flottante du design system (4 onglets). L'onglet actif porte
 * l'étincelle grenat sur une pastille grenat translucide, dans les deux thèmes.
 * Le liseré de la barre (--glass-hairline du DS) est dérivé de la rampe
 * `border-strong` par thème : chaude et sourde en light, chaude et claire sur le
 * charbon en dark — surtout pas un blanc froid, qui trahissait le verre v1. Pas
 * de flou (--glass-bar suppose un backdrop-filter absent en RN) : surface quasi
 * opaque, plus robuste.
 *
 * La pastille active est un élément UNIQUE qui coulisse (Reanimated, ressort
 * amorti) de l'onglet quitté vers l'onglet cible ; l'icône et le label de
 * l'onglet actif fondent vers le grenat par cross-fade d'opacité (deux couches
 * empilées — robuste natif + web, où useThemeColor renvoie une var() CSS non
 * interpolable). Respecte « réduire les animations » (bascule instantanée).
 *
 * Les icônes ne viennent pas de lucide-react-native mais de `tab-icons/` : ce
 * sont les mêmes dessins, redessinés trait par trait pour que quelques-uns
 * puissent bouger brièvement quand l'onglet devient actif (chorégraphies et
 * courbes dans `tab-icons/motion.ts`).
 */

/** Ordre des routes des onglets → index de la pastille (source de vérité de l'onglet actif). */
const TAB_ROUTES = ['/', '/results', '/leaderboard', '/profile'] as const;

/** Ressort discret et très amorti : glisse et se pose, sans rebond marqué. */
const PILL_SPRING = { damping: 26, stiffness: 240, mass: 1 } as const;

type TabBarContextValue = {
    onMeasure: (index: number, frame: LayoutRectangle) => void;
    frames: Record<number, LayoutRectangle>;
    activeIndex: number;
};

const TabBarContext = createContext<TabBarContextValue | null>(null);

function useTabBar(): TabBarContextValue {
    const ctx = useContext(TabBarContext);
    if (!ctx) throw new Error('TabButton doit être rendu dans <AppTabs>');
    return ctx;
}

export default function AppTabs() {
    const { t } = useTranslation('common');
    const pathname = usePathname();
    // La barre reste montée sous les écrans poussés au-dessus des onglets
    // (Réglages, Règles, ligue…) : leur pathname n'est pas un onglet, donc on
    // CONSERVE le dernier onglet actif au lieu de retomber sur l'index 0 —
    // sinon la pastille file (invisiblement) vers la gauche pendant qu'on est
    // sur l'écran poussé, puis re-coulisse depuis la gauche au retour. Motif
    // React « ajuster un état sur changement de prop » (sans effet).
    const matchedIndex = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);
    const [activeIndex, setActiveIndex] = useState(matchedIndex < 0 ? 0 : matchedIndex);
    if (matchedIndex >= 0 && matchedIndex !== activeIndex) {
        setActiveIndex(matchedIndex);
    }

    // Géométrie mesurée de chaque onglet (x/y/width/height dans la barre) : la
    // pastille se cale dessus plutôt que sur une arithmétique gap/padding fragile.
    const [frames, setFrames] = useState<Record<number, LayoutRectangle>>({});
    const onMeasure = useCallback((index: number, frame: LayoutRectangle) => {
        setFrames((prev) => {
            const cur = prev[index];
            if (
                cur &&
                cur.x === frame.x &&
                cur.y === frame.y &&
                cur.width === frame.width &&
                cur.height === frame.height
            ) {
                return prev;
            }
            return { ...prev, [index]: frame };
        });
    }, []);

    const value = useMemo<TabBarContextValue>(
        () => ({ onMeasure, frames, activeIndex }),
        [onMeasure, frames, activeIndex],
    );

    return (
        <TabBarContext.Provider value={value}>
            <Tabs>
                <TabSlot style={{ height: '100%' }} />
                <TabList asChild>
                    <FloatingTabList>
                        <TabTrigger asChild href="/" name="index">
                            <TabButton icon={MatchesTabIcon} label={t('tabs.matches')} index={0} />
                        </TabTrigger>
                        <TabTrigger asChild href="/results" name="results">
                            <TabButton icon={ResultsTabIcon} label={t('tabs.results')} index={1} />
                        </TabTrigger>
                        <TabTrigger asChild href="/leaderboard" name="leaderboard">
                            <TabButton
                                icon={LeaderboardTabIcon}
                                label={t('tabs.leaderboard')}
                                index={2}
                            />
                        </TabTrigger>
                        <TabTrigger asChild href="/profile" name="profile">
                            <TabButton icon={ProfileTabIcon} label={t('tabs.profile')} index={3} />
                        </TabTrigger>
                    </FloatingTabList>
                </TabList>
            </Tabs>
        </TabBarContext.Provider>
    );
}

/** Clavier visible ? (surtout utile Android : la fenêtre se redimensionne et la barre remonterait au-dessus du clavier). */
function useKeyboardShown(): boolean {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        // iOS émet les événements will* (animation suivie), Android seulement did*.
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setShown(true),
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setShown(false),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);
    return shown;
}

function FloatingTabList(props: TabListProps) {
    // Marge basse dynamique : au-dessus de l'indicateur home / barre gestuelle,
    // plancher 16px sur les appareils sans inset (valeur runtime → prop style).
    const insets = useSafeAreaInsets();

    // La barre s'escamote quand le clavier est ouvert (saisie d'un score) :
    // fondu + léger glissé vers le bas, taps désactivés pendant ce temps.
    const keyboardShown = useKeyboardShown();
    const reduce = useReducedMotion();
    const hidden = useSharedValue(0);
    useEffect(() => {
        const target = keyboardShown ? 1 : 0;
        hidden.value = reduce ? target : withTiming(target, { duration: 160 });
    }, [keyboardShown, reduce, hidden]);
    const hideStyle = useAnimatedStyle(() => ({
        opacity: 1 - hidden.value,
        transform: [{ translateY: hidden.value * 24 }],
    }));

    return (
        <Animated.View
            pointerEvents={keyboardShown ? 'none' : 'box-none'}
            style={[styles.tabList, hideStyle]}>
            <View
                className="items-center px-4"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                <View className="w-full max-w-125 flex-row gap-1 rounded-[34px] border border-border-strong/85 bg-surface/95 p-2 tc-shadow-lg dark:border-border-strong/92">
                    <SlidingPill />
                    {props.children}
                </View>
            </View>
        </Animated.View>
    );
}

/** Pastille unique qui coulisse derrière l'onglet actif. */
function SlidingPill() {
    const { frames, activeIndex } = useTabBar();
    const reduce = useReducedMotion();

    const x = useSharedValue(0);
    const w = useSharedValue(0);
    const y = useSharedValue(0);
    const h = useSharedValue(0);
    const ready = useSharedValue(0);
    // Premier placement : se poser sur l'onglet initial sans glissé depuis la gauche.
    const firstPlacement = useRef(true);

    useEffect(() => {
        const frame = frames[activeIndex];
        if (!frame) return;
        const instant = firstPlacement.current || reduce;
        x.value = instant ? frame.x : withSpring(frame.x, PILL_SPRING);
        w.value = instant ? frame.width : withSpring(frame.width, PILL_SPRING);
        // y/height identiques d'un onglet à l'autre : pas d'animation nécessaire.
        y.value = frame.y;
        h.value = frame.height;
        ready.value = 1;
        firstPlacement.current = false;
    }, [frames, activeIndex, reduce, x, w, y, h, ready]);

    const style = useAnimatedStyle(() => ({
        opacity: ready.value,
        width: w.value,
        height: h.value,
        transform: [{ translateX: x.value }, { translateY: y.value }],
    }));

    return (
        <Animated.View pointerEvents="none" style={[styles.pill, style]}>
            <View className="flex-1 rounded-xl border tc-shadow-sm border-accent/30 bg-accent/15" />
        </Animated.View>
    );
}

type TabButtonProps = TabTriggerSlotProps & {
    icon: TabIconComponent;
    label: string;
    index: number;
};

export function TabButton({ icon: Icon, label, isFocused, index, ...props }: TabButtonProps) {
    const { onMeasure } = useTabBar();
    const accent = useThemeColor('accent');
    const faint = useThemeColor('text-faint');
    const reduce = useReducedMotion();

    // Progression 0 (inactif) → 1 (actif) : pilote le cross-fade icône + label.
    const progress = useSharedValue(isFocused ? 1 : 0);
    useEffect(() => {
        const target = isFocused ? 1 : 0;
        progress.value = reduce ? target : withTiming(target, { duration: 180 });
    }, [isFocused, reduce, progress]);
    const activeLayer = useAnimatedStyle(() => ({ opacity: progress.value }));

    // Frise de l'animation d'activation de l'icône : repos à 1, remise à 0 puis
    // ramenée à 1 LINÉAIREMENT (les easings vivent dans tab-icons/motion.ts).
    // La MÊME valeur alimente les deux couches empilées : c'est ce qui les garde
    // en phase, sinon les traits gris dépasseraient derrière les traits grenat.
    const timeline = useSharedValue(1);

    // Uniquement au passage inactif → actif. La ref initialisée sur isFocused
    // couvre deux cas d'un coup : pas d'animation au montage (l'onglet initial
    // ne s'anime pas au lancement, comme la pastille se pose sans glisser), et
    // pas de rejeu au retour d'un écran poussé — isFocused y reste vrai.
    const wasFocused = useRef(isFocused);
    useEffect(() => {
        if (isFocused && !wasFocused.current && !reduce) {
            timeline.value = 0; // affectation brute = annulation de l'animation en cours
            timeline.value = withTiming(1, {
                duration: TAB_ICON_MOTION_DURATION,
                easing: Easing.linear,
            });
        }
        wasFocused.current = isFocused;
    }, [isFocused, reduce, timeline]);

    return (
        <Pressable
            {...props}
            className="flex-1"
            onLayout={(e) => onMeasure(index, e.nativeEvent.layout)}>
            <View className="flex-1 items-center justify-center gap-1 px-2 py-3">
                {/* Couche de base : état inactif (grisé) */}
                <Icon color={faint} size={24} strokeWidth={1.9} timeline={timeline} />
                <Text className="font-body-bold text-[10px] tracking-[0.3px] text-text-faint">
                    {label}
                </Text>
                {/* Couche active (grenat), fondue par-dessus selon la progression */}
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, activeLayer]}>
                    <View className="flex-1 items-center justify-center gap-1 px-2 py-3">
                        <Icon color={accent} size={24} strokeWidth={2.4} timeline={timeline} />
                        <Text className="font-body-bold text-[10px] tracking-[0.3px] text-accent">
                            {label}
                        </Text>
                    </View>
                </Animated.View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: { position: 'absolute', left: 0, top: 0 },
    tabList: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
