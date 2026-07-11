import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path } from 'react-native-svg';

import type { RoundPoints } from '@/features/profile/compute-points-by-round';
import { Text, useThemeColor, View } from '@/tw';

const WIDTH = 286;
const HEIGHT = 84;
const PAD_X = 6;
const PAD_Y = 8;

/**
 * Courbe « Points par journée » de l'onglet Stats (maquette Profil) : ligne +
 * aire brand, un point par journée entamée, labels J1…Jn dessous. Une seule
 * journée = point centré sans ligne.
 */
export function PointsTrendChart({ trend }: { trend: readonly RoundPoints[] }) {
    const { t } = useTranslation(['profile']);
    const brandColor = useThemeColor('brand');
    const surfaceColor = useThemeColor('surface');

    const maxPoints = Math.max(...trend.map((entry) => entry.points), 1);
    const xOf = (index: number) =>
        trend.length === 1 ? WIDTH / 2 : PAD_X + ((WIDTH - 2 * PAD_X) * index) / (trend.length - 1);
    const yOf = (points: number) => HEIGHT - PAD_Y - ((HEIGHT - 2 * PAD_Y) * points) / maxPoints;

    const coords = trend.map((entry, index) => ({ x: xOf(index), y: yOf(entry.points) }));
    const linePath = coords
        .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
        .join(' ');
    const areaPath =
        coords.length > 1
            ? `${linePath} L ${coords[coords.length - 1].x} ${HEIGHT - PAD_Y} L ${coords[0].x} ${HEIGHT - PAD_Y} Z`
            : null;

    // Le round sert de clé : les buckets de computePointsByRound sont uniques par round.
    const keyOf = (round: string | null) => round ?? 'sans-round';
    const labelOf = (round: string | null) =>
        round === null
            ? t('profile:stats.trend.roundUnknown')
            : t('profile:stats.trend.roundLabel', { round });

    return (
        <View className="gap-1.5">
            <Svg
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', aspectRatio: WIDTH / HEIGHT }}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
                {areaPath ? <Path d={areaPath} fill={brandColor} fillOpacity={0.12} /> : null}
                {coords.length > 1 ? (
                    <Path
                        d={linePath}
                        fill="none"
                        stroke={brandColor}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                    />
                ) : null}
                {coords.map(({ x, y }, index) => (
                    <Circle
                        cx={x}
                        cy={y}
                        fill={index === coords.length - 1 ? brandColor : surfaceColor}
                        key={keyOf(trend[index].round)}
                        r={3.5}
                        stroke={brandColor}
                        strokeWidth={2}
                    />
                ))}
            </Svg>
            <View
                className={
                    trend.length === 1
                        ? 'flex-row justify-center px-0.5'
                        : 'flex-row justify-between px-0.5'
                }>
                {trend.map((entry) => (
                    <Text
                        className="font-body-bold text-[10px] tracking-[0.3px] text-text-faint"
                        key={keyOf(entry.round)}>
                        {labelOf(entry.round)}
                    </Text>
                ))}
            </View>
        </View>
    );
}
