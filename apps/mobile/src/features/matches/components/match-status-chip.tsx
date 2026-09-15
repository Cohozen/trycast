import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { statusLabel } from '@/features/matches/format-match';
import { livePeriodKey } from '@/features/matches/live-period';
import type { MatchWithTeams } from '@/features/matches/types';
import { Text, View } from '@/tw';

type MatchStatusChipProps = {
    match: Pick<MatchWithTeams, 'status' | 'live_period'>;
};

/** Dot pulsante du statut live (même boucle d'opacité que le skeleton). */
function LiveDot() {
    const reducedMotion = useReducedMotion();
    const opacity = useSharedValue(1);

    useEffect(() => {
        if (reducedMotion) return;
        opacity.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true);
    }, [opacity, reducedMotion]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={animatedStyle}>
            <View className="h-1.5 w-1.5 rounded-pill bg-accent" />
        </Animated.View>
    );
}

/**
 * Chip de statut de la page de détail (maquette Match Detail) : « À venir »
 * neutre, « En direct · période » grenat avec dot pulsante, sinon le statut
 * exact (Terminé/Reporté/Annulé).
 */
export function MatchStatusChip({ match }: MatchStatusChipProps) {
    const { t } = useTranslation(['matches']);

    if (match.status === 'in_play') {
        const periodKey = livePeriodKey(match.live_period);
        return (
            <View className="flex-row items-center gap-1.5 self-center rounded-pill bg-accent/15 px-3 py-1">
                <LiveDot />
                <Text className="font-body-bold text-[10.5px] uppercase tracking-[0.63px] text-accent">
                    {t('matches:live.badge')}
                    {periodKey ? ` · ${t(periodKey)}` : ''}
                </Text>
            </View>
        );
    }

    const statusKey = statusLabel(match.status);
    return (
        <View className="self-center rounded-pill bg-surface-sunken px-3 py-1">
            <Text className="font-body-bold text-[10.5px] uppercase tracking-[0.63px] text-text-muted">
                {statusKey ? t(statusKey) : t('matches:detail.upcoming')}
            </Text>
        </View>
    );
}
