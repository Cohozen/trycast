import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { teamName } from '@/features/matches/format-match';
import type { TeamRow } from '@/features/matches/types';
import { VerdictPill } from '@/features/predictions/components/verdict-pill';
import { ScrollView, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

import type { CelebrationItem } from '../types';
import { AnimatedPointsCounter } from './animated-points-counter';

type CelebrationOverlayProps = {
    visible: boolean;
    items: CelebrationItem[];
    totalPoints: number;
    onDismiss: () => void;
};

/**
 * Overlay plein écran de célébration (première connexion après un ou plusieurs
 * pronos gagnés) : total animé en grand, récap des matchs, accès direct aux
 * résultats. Même primitive Modal que le reste de l'app.
 */
export function CelebrationOverlay({
    visible,
    items,
    totalPoints,
    onDismiss,
}: CelebrationOverlayProps) {
    const { t } = useTranslation(['celebration', 'common', 'predictions', 'matches']);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (visible && !reducedMotion) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
                // Le haptic est un bonus : un échec ne doit rien casser.
            });
        }
    }, [visible, reducedMotion]);

    function resolveTeam(team: TeamRow | null): string {
        return team ? teamName(team, t) : '—';
    }

    function handleSeeResults() {
        onDismiss();
        router.push('/results');
    }

    return (
        <Modal
            animationType="fade"
            onRequestClose={onDismiss}
            statusBarTranslucent
            transparent
            visible={visible}>
            <View
                className="flex-1 bg-bg px-6"
                style={{
                    paddingTop: Math.max(insets.top, 56),
                    paddingBottom: Math.max(insets.bottom, 24),
                }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 32 }}
                    showsVerticalScrollIndicator={false}>
                    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(450)}>
                        <View className="items-center gap-2.5">
                            <Text className="font-body-bold text-[11px] uppercase tracking-[1px] text-text-faint">
                                {t('celebration:eyebrow')}
                            </Text>
                            <Text className="text-center font-display text-[26px] leading-[28px] text-text">
                                {t('celebration:title')}
                            </Text>
                            <View className="mt-1 flex-row items-baseline gap-1.5">
                                <AnimatedPointsCounter value={totalPoints} />
                                <Text className="font-body-bold text-[18px] text-accent">pts</Text>
                            </View>
                            <Text className="text-center font-body text-[14px] text-text-muted">
                                {t('celebration:subtitle', { count: items.length })}
                            </Text>
                        </View>
                    </Animated.View>

                    <View className="overflow-hidden rounded-md border border-border bg-surface">
                        {items.map((item, index) => (
                            <View
                                className={cn(
                                    'flex-row items-center gap-3 px-4 py-3',
                                    index > 0 && 'border-t border-border',
                                )}
                                key={item.matchId}>
                                <Text
                                    className="min-w-0 flex-1 font-body-semibold text-[14px] text-text"
                                    numberOfLines={1}>
                                    {resolveTeam(item.homeTeam)} – {resolveTeam(item.awayTeam)}
                                </Text>
                                <VerdictPill verdict={item.verdict} />
                                <Text className="font-body-bold text-[14px] text-accent">
                                    +{item.points}
                                </Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                <View className="gap-3 pt-4">
                    <Button
                        fullWidth
                        onPress={handleSeeResults}
                        title={t('celebration:seeResults')}
                    />
                    <Button
                        fullWidth
                        onPress={onDismiss}
                        title={t('common:actions.close')}
                        variant="ghost"
                    />
                </View>
            </View>
        </Modal>
    );
}
