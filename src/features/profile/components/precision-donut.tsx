import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type PrecisionDonutProps = {
    precisionPct: number;
    /** Bons 1/N/2 hors scores exacts (la légende ne double-compte pas). */
    good: number;
    exact: number;
    missed: number;
};

const SIZE = 108;
const RADIUS = 46;
const STROKE = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function LegendRow({ dotClass, label }: { dotClass: string; label: string }) {
    return (
        <View className="flex-row items-center gap-2">
            <View className={cn('h-[9px] w-[9px] rounded-pill', dotClass)} />
            <Text className="font-body text-[13px] text-text-muted">{label}</Text>
        </View>
    );
}

/** Donut de précision de l'onglet Stats du Profil (maquette Profil). */
export function PrecisionDonut({ precisionPct, good, exact, missed }: PrecisionDonutProps) {
    const { t } = useTranslation(['profile']);
    const trackColor = useThemeColor('surface-sunken');
    const brandColor = useThemeColor('brand');
    const arc = (CIRCUMFERENCE * precisionPct) / 100;

    return (
        <View className="flex-row items-center gap-[18px]">
            <View className="h-[108px] w-[108px]">
                <Svg height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE}>
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        fill="none"
                        r={RADIUS}
                        stroke={trackColor}
                        strokeWidth={STROKE}
                    />
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        fill="none"
                        r={RADIUS}
                        stroke={brandColor}
                        strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
                        strokeLinecap="round"
                        strokeWidth={STROKE}
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    />
                </Svg>
                <View className="absolute inset-0 items-center justify-center gap-px">
                    <Text className="font-display text-[26px] leading-[26px] text-text">
                        {precisionPct}%
                    </Text>
                    <Text className="font-body-bold text-[9px] uppercase tracking-[0.45px] text-text-faint">
                        {t('profile:stats.precision.center')}
                    </Text>
                </View>
            </View>
            <View className="flex-1 gap-[9px]">
                <LegendRow
                    dotClass="bg-brand"
                    label={t('profile:stats.precision.good', { count: good })}
                />
                <LegendRow
                    dotClass="bg-accent"
                    label={t('profile:stats.precision.exact', { count: exact })}
                />
                <LegendRow
                    dotClass="bg-border-strong"
                    label={t('profile:stats.precision.missed', { count: missed })}
                />
            </View>
        </View>
    );
}
