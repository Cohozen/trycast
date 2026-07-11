import { Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import type { ProfileStats } from '@/features/profile/compute-profile-stats';
import { PrecisionDonut } from '@/features/profile/components/precision-donut';
import { Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type ProfileStatsPanelProps = {
    stats: ProfileStats;
    /** Points au standing (null tant qu'aucun prono scoré). */
    points: number | null;
    rank: number | null;
    totalPlayers: number | null;
};

function StatCard({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <Card className="flex-1 gap-2 px-3.5 py-3.5">
            <Text className="font-body-bold text-[11px] tracking-[0.33px] text-text-faint">
                {label}
            </Text>
            <Text
                className={cn(
                    'font-display text-[32px] leading-[31px]',
                    accent ? 'text-accent' : 'text-text',
                )}>
                {value}
            </Text>
        </Card>
    );
}

/**
 * Onglet Stats du Profil (maquette Profil) : cartes 2×2, rang au général,
 * donut de précision. La courbe « Points par journée » reste un état vide
 * tant que le backend ne sert pas de série par journée.
 */
export function ProfileStatsPanel({ stats, points, rank, totalPlayers }: ProfileStatsPanelProps) {
    const { t } = useTranslation(['profile']);
    const brandColor = useThemeColor('brand');

    return (
        <View className="gap-4">
            <View className="flex-row gap-2.5">
                <StatCard
                    accent={points !== null && points > 0}
                    label={t('profile:stats.cards.points')}
                    value={points !== null ? String(points) : '0'}
                />
                <StatCard label={t('profile:stats.cards.played')} value={String(stats.played)} />
            </View>
            <View className="-mt-1.5 flex-row gap-2.5">
                <StatCard label={t('profile:stats.cards.good')} value={String(stats.good)} />
                <StatCard label={t('profile:stats.cards.exact')} value={String(stats.exact)} />
            </View>

            {rank !== null ? (
                <Card className="flex-row items-center gap-3 px-4 py-3">
                    <View className="h-9 w-9 items-center justify-center rounded-sm bg-brand/10">
                        <Globe color={brandColor} size={19} strokeWidth={1.9} />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                            {t('profile:stats.rank.overline')}
                        </Text>
                        <View className="flex-row items-baseline gap-1.5">
                            <Text className="font-display text-[22px] leading-[22px] text-text">
                                #{rank}
                            </Text>
                            {totalPlayers !== null ? (
                                <Text className="font-body-semibold text-[12.5px] text-text-muted">
                                    {t('profile:stats.rank.of', { count: totalPlayers })}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </Card>
            ) : (
                <View className="flex-row items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface px-4 py-3">
                    <View className="h-9 w-9 items-center justify-center rounded-sm bg-surface-sunken">
                        <Globe color={brandColor} size={19} strokeWidth={1.9} />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-bold text-[14px] text-text">
                            {t('profile:stats.rank.noneTitle')}
                        </Text>
                        <Text className="font-body text-[12px] text-text-muted">
                            {t('profile:stats.rank.noneHint')}
                        </Text>
                    </View>
                </View>
            )}

            <Card className="gap-3 p-4">
                <Text className="font-body-bold text-[12px] uppercase tracking-[0.96px] text-text">
                    {t('profile:stats.precision.title')}
                </Text>
                {stats.precisionPct !== null ? (
                    <PrecisionDonut
                        exact={stats.exact}
                        good={stats.good - stats.exact}
                        missed={stats.missed}
                        notPredicted={stats.notPredicted}
                        precisionPct={stats.precisionPct}
                    />
                ) : (
                    <Text className="font-body text-[13px] leading-[19px] text-text-muted">
                        {t('profile:stats.precision.empty')}
                    </Text>
                )}
            </Card>

            <Card className="gap-3 p-4">
                <Text className="font-body-bold text-[12px] uppercase tracking-[0.96px] text-text">
                    {t('profile:stats.trend.title')}
                </Text>
                <View className="items-center gap-3 px-2 pb-1.5 pt-3.5">
                    <View className="h-0 w-full border-b-2 border-dashed border-border-strong" />
                    <Text className="text-center font-body text-[12.5px] leading-[18px] text-text-muted">
                        {t('profile:stats.trend.empty')}
                    </Text>
                </View>
            </Card>
        </View>
    );
}
