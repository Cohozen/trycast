import { usePathname } from 'expo-router';
import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { BarChart3, CheckCircle, List, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
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
import { StyleSheet, type LayoutRectangle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text, useThemeColor, View } from '@/tw';

/**
 * Barre d'onglets flottante du design system (4 onglets). L'onglet actif
 * porte l'étincelle grenat sur une pastille claire — teintée accent (grenat)
 * en dark sur la barre charbon (verre blanc en light, hairline claire +
 * pastille grenat en dark, cf. tokens --glass-* du DS v2). Pas de flou :
 * surface quasi opaque, plus robuste en RN.
 *
 * La pastille active est un élément UNIQUE qui coulisse (Reanimated, ressort
 * amorti) de l'onglet quitté vers l'onglet cible ; l'icône et le label de
 * l'onglet actif fondent vers le grenat par cross-fade d'opacité (deux couches
 * empilées — robuste natif + web, où useThemeColor renvoie une var() CSS non
 * interpolable). Respecte « réduire les animations » (bascule instantanée).
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
    const activeIndex = Math.max(0, TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]));

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
                            <TabButton icon={List} label={t('tabs.matches')} index={0} />
                        </TabTrigger>
                        <TabTrigger asChild href="/results" name="results">
                            <TabButton icon={CheckCircle} label={t('tabs.results')} index={1} />
                        </TabTrigger>
                        <TabTrigger asChild href="/leaderboard" name="leaderboard">
                            <TabButton icon={BarChart3} label={t('tabs.leaderboard')} index={2} />
                        </TabTrigger>
                        <TabTrigger asChild href="/profile" name="profile">
                            <TabButton icon={User} label={t('tabs.profile')} index={3} />
                        </TabTrigger>
                    </FloatingTabList>
                </TabList>
            </Tabs>
        </TabBarContext.Provider>
    );
}

function FloatingTabList(props: TabListProps) {
    // Marge basse dynamique : au-dessus de l'indicateur home / barre gestuelle,
    // plancher 16px sur les appareils sans inset (valeur runtime → prop style).
    const insets = useSafeAreaInsets();
    return (
        <View
            className="absolute inset-x-0 bottom-0 items-center px-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View className="w-full max-w-[500px] flex-row gap-1 rounded-[34px] border border-white/70 bg-surface/95 p-2 tc-shadow-lg dark:border-white/12">
                <SlidingPill />
                {props.children}
            </View>
        </View>
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
            <View className="flex-1 rounded-[28px] border border-white/50 bg-white/55 tc-shadow-sm dark:border-accent/30 dark:bg-accent/15" />
        </Animated.View>
    );
}

type TabButtonProps = TabTriggerSlotProps & { icon: LucideIcon; label: string; index: number };

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

    return (
        <Pressable
            {...props}
            className="flex-1"
            onLayout={(e) => onMeasure(index, e.nativeEvent.layout)}>
            <View className="flex-1 items-center justify-center gap-1.5 px-2 py-3">
                {/* Couche de base : état inactif (grisé) */}
                <Icon color={faint} size={24} strokeWidth={1.9} />
                <Text className="font-body-bold text-[10px] tracking-[0.3px] text-text-faint">
                    {label}
                </Text>
                {/* Couche active (grenat), fondue par-dessus selon la progression */}
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, activeLayer]}>
                    <View className="flex-1 items-center justify-center gap-1.5 px-2 py-3">
                        <Icon color={accent} size={24} strokeWidth={2.4} />
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
});
