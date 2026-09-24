import { useTranslation } from 'react-i18next';

import type { CommunitySummary } from '@/features/predictions/community-summary';
import type { MatchOutcome } from '@/features/scoring/types';
import { i18n } from '@/lib/i18n';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type CommunityCardProps = {
    summary: CommunitySummary;
    /** Libellés des colonnes 1 et 2 (tricodes des équipes). */
    homeLabel: string;
    awayLabel: string;
    /** Issue que j'ai jouée (pastille « Toi »), null sans prono. */
    myOutcome: MatchOutcome | null;
    /** Mes points sur le match (provisoires en live), null sans prono. */
    myPoints: number | null;
    /** Match en cours : exacts et moyenne sont provisoires. */
    isLive: boolean;
};

const COLUMNS: { outcome: MatchOutcome; align: string }[] = [
    { outcome: 'home', align: 'items-start' },
    { outcome: 'draw', align: 'items-center' },
    { outcome: 'away', align: 'items-end' },
];

const signed = (value: number, fractionDigits = 0) => {
    const formatted = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    }).format(value);
    return value > 0 ? `+${formatted}` : formatted;
};

/**
 * « Ce qu'a joué la communauté » (détail d'un match en cours ou terminé, DS du
 * 2026-09-24) : parts 1/N/2 — l'issue du score servi en grenat —, puis le
 * score le plus joué, les scores exacts trouvés et les points moyens.
 * Agrégats seulement (RPC get_match_community_histogram, après le kickoff).
 */
export function CommunityCard({
    summary,
    homeLabel,
    awayLabel,
    myOutcome,
    myPoints,
    isLive,
}: CommunityCardProps) {
    const { t } = useTranslation(['predictions']);
    const provisional = isLive ? ` · ${t('predictions:community.provisional')}` : '';
    const labels: Record<MatchOutcome, string> = {
        home: homeLabel,
        draw: t('predictions:community.draw'),
        away: awayLabel,
    };

    const rows = [
        {
            key: 'top',
            label: t('predictions:community.topScore'),
            sub: `${summary.topScore.pct}%`,
            value: `${summary.topScore.home} – ${summary.topScore.away}`,
        },
        {
            key: 'exact',
            label: t('predictions:community.exactFound'),
            sub: t('predictions:community.players', { count: summary.exact.count }) + provisional,
            value: `${summary.exact.pct}%`,
        },
        {
            key: 'average',
            label: t('predictions:community.average'),
            sub:
                myPoints !== null
                    ? t('predictions:community.yourPoints', { points: signed(myPoints) }) +
                      provisional
                    : isLive
                      ? t('predictions:community.provisional')
                      : '',
            value: signed(summary.averagePoints, 1),
        },
    ];

    return (
        <View className="gap-3.5 rounded-md border border-border bg-surface p-4 tc-shadow-sm">
            <View className="flex-row items-baseline justify-between gap-3">
                <Text className="shrink font-body-bold text-[11px] uppercase tracking-[0.88px] text-text-muted">
                    {t('predictions:community.title')}
                </Text>
                <Text className="font-body text-[12px] text-text-faint">
                    {t('predictions:community.count', { count: summary.total })}
                </Text>
            </View>

            <View className="gap-2">
                <View className="h-[10px] flex-row gap-[3px]">
                    {COLUMNS.map(({ outcome }) => (
                        <View
                            className={cn(
                                'min-w-[4px] rounded-[3px]',
                                outcome === summary.outcome ? 'bg-accent' : 'bg-border-strong',
                            )}
                            key={outcome}
                            style={{ flexGrow: summary.split[outcome], flexBasis: 0 }}
                        />
                    ))}
                </View>
                <View className="flex-row gap-2">
                    {COLUMNS.map(({ outcome, align }) => (
                        <View className={cn('flex-1 gap-[3px]', align)} key={outcome}>
                            <Text
                                className={cn(
                                    'font-display text-[22px] leading-[24px]',
                                    outcome === summary.outcome ? 'text-accent' : 'text-text-muted',
                                )}>
                                {summary.split[outcome]}%
                            </Text>
                            <View className="flex-row items-center gap-1.5">
                                <Text className="font-body-semibold text-[12px] text-text-muted">
                                    {labels[outcome]}
                                </Text>
                                {myOutcome === outcome ? (
                                    <View className="rounded-pill bg-accent/15 px-1.5 py-px">
                                        <Text className="font-body-bold text-[10px] uppercase tracking-[0.4px] text-accent">
                                            {t('predictions:community.you')}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <View>
                {rows.map((row) => (
                    <View
                        className="flex-row items-baseline gap-2.5 border-t border-border py-2"
                        key={row.key}>
                        <Text className="flex-1 font-body text-[13px] text-text">{row.label}</Text>
                        <Text className="font-body text-[12px] text-text-faint">{row.sub}</Text>
                        <Text className="font-body-bold text-[13px] text-text">{row.value}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
