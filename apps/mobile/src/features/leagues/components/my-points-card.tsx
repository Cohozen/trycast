import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { RoundSummary } from '@/features/leagues/round-summary';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type MyPointsCardProps = {
    totalPoints: number;
    /** Mon rang au général (null tant qu'aucun prono scoré). */
    rank: number | null;
    /** Écart avec le joueur juste au-dessus (null si premier). */
    gapToAbove: number | null;
    /** Mon rang avant la journée en cours (null : rien à comparer). */
    previousRank: number | null;
    summary: RoundSummary;
};

const FORM_CLASSES = {
    good: 'bg-sand-050',
    missed: 'bg-sand-050/25',
    exact: 'border-[1.5px] border-sand-050 bg-grenat-500',
} as const;

// Bandes verticales de la pelouse (maquette : 28 px pleines / 28 px vides)
const STRIPES = Array.from({ length: 10 }, (_, index) => index);

/**
 * Carte « Tes points » en tête de l'accueil (maquette MesMatchs « hero », DS
 * 2026-09-23). Vert et sable FIGÉS quel que soit le thème, comme la marque ;
 * sans le halo grenat de la maquette (dégradé radial, qui rendait en natif
 * un disque gris à bord net) ;
 * le grenat n'y est qu'une étincelle (montée au classement, score exact).
 * Tendance : places gagnées/perdues depuis le début de la journée
 * (get_my_previous_rank), sinon l'écart avec le joueur du dessus.
 */
export function MyPointsCard({
    totalPoints,
    rank,
    gapToAbove,
    previousRank,
    summary,
}: MyPointsCardProps) {
    const { t } = useTranslation(['predictions', 'matches', 'leagues']);
    const router = useRouter();
    const sandColor = useThemeColor('sand-050');
    const numbers = new Intl.NumberFormat(i18n.language);

    const delta = rank !== null && previousRank !== null ? previousRank - rank : 0;
    const round = summary.round;
    const roundName = round
        ? round.stageKind
            ? t(`leagues:detail.results.stages.${round.stageKind}.title`)
            : round.label
              ? t('matches:results.number_day', { count: round.label })
              : null
        : null;

    return (
        <View className="relative gap-3 overflow-hidden rounded-lg bg-green-800 px-4.5 pb-3.5 pt-4 tc-shadow-md">
            <View className="absolute inset-0 flex-row" pointerEvents="none">
                {STRIPES.map((stripe) => (
                    <View className="w-14" key={stripe}>
                        <View className="h-full w-7 bg-sand-050/[0.035]" />
                    </View>
                ))}
            </View>

            <View className="flex-row items-center justify-between gap-2.5">
                <Text className="shrink font-body-bold text-[11px] uppercase tracking-[1.32px] text-sand-050/70">
                    {roundName
                        ? t('predictions:dashboard.header', { round: roundName })
                        : t('predictions:dashboard.headerNoRound')}
                </Text>
                {delta !== 0 ? (
                    <View
                        accessibilityLabel={t('predictions:dashboard.placesLabel')}
                        className={cn(
                            'flex-row items-center gap-1 rounded-pill py-0.75 pl-1.5 pr-2',
                            delta > 0
                                ? 'bg-grenat-500'
                                : 'border border-sand-050/20 bg-sand-050/15',
                        )}>
                        {/* Triangle ▲/▼ */}
                        <Text className="font-body-bold text-[9px] text-sand-100">
                            {delta > 0 ? '▲' : '▼'}
                        </Text>
                        <Text className="font-body-bold text-[12px] text-sand-100">
                            {delta > 0
                                ? t('predictions:dashboard.placesUp', { count: delta })
                                : t('predictions:dashboard.placesDown', { count: -delta })}
                        </Text>
                    </View>
                ) : rank !== null && rank > 1 && gapToAbove !== null ? (
                    <View className="rounded-pill border border-sand-050/20 bg-sand-050/15 px-2.25 py-0.75">
                        <Text className="font-body-bold text-[12px] text-sand-050">
                            {t('predictions:dashboard.gap', {
                                gap: gapToAbove,
                                rank: numbers.format(rank - 1),
                            })}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View className="flex-row items-end justify-between gap-3">
                <View className="flex-row items-baseline gap-1.5">
                    <Text className="font-display text-[56px] leading-[58px] text-sand-050">
                        {numbers.format(totalPoints)}
                    </Text>
                    <Text className="font-body-bold text-[14px] text-sand-050/70">pts</Text>
                    {round && round.points > 0 ? (
                        <Text className="ml-1 font-body-bold text-[13px] text-grenat-400">
                            {t('predictions:dashboard.roundPoints', { points: round.points })}
                        </Text>
                    ) : null}
                </View>
                {summary.form.length > 0 ? (
                    <View className="items-end gap-1.25 pb-2">
                        <Text className="font-body-bold text-[10px] uppercase tracking-[1.2px] text-sand-050/60">
                            {t('predictions:dashboard.form')}
                        </Text>
                        <View className="flex-row gap-1">
                            {summary.form.map((verdict, index) => (
                                <View
                                    className={cn(
                                        'h-4.5 w-2.25 rounded-[3px]',
                                        FORM_CLASSES[verdict],
                                    )}
                                    // biome-ignore lint/suspicious/noArrayIndexKey: série figée de 5 barres
                                    key={index}
                                />
                            ))}
                        </View>
                    </View>
                ) : null}
            </View>

            <View className="flex-row items-center gap-3 border-t border-sand-050/15 pt-2.75">
                <Text className="font-body text-[12px] text-sand-050/80">
                    <Text className="font-body-bold text-sand-050">{summary.goodCount}</Text>{' '}
                    {t('predictions:dashboard.good', { count: summary.goodCount })}
                </Text>
                {rank !== null ? (
                    <Text className="font-body text-[12px] text-sand-050/80">
                        <Text className="font-body-bold text-sand-050">
                            {t('predictions:dashboard.rankValue', {
                                count: rank,
                                rank: numbers.format(rank),
                            })}
                        </Text>{' '}
                        {t('predictions:dashboard.rankLabel')}
                    </Text>
                ) : null}
                <Pressable
                    accessibilityRole="button"
                    className="ml-auto flex-row items-center gap-0.5"
                    hitSlop={8}
                    onPress={() =>
                        router.push({ pathname: '/leaderboard', params: { scope: 'global' } })
                    }>
                    <Text className="font-body-bold text-[12px] text-sand-050">
                        {t('predictions:dashboard.leaderboard')}
                    </Text>
                    <ChevronRight color={sandColor} size={14} strokeWidth={2.4} />
                </Pressable>
            </View>
        </View>
    );
}
