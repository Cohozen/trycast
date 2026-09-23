import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import type { BreakdownRow } from '@/features/predictions/breakdown-rows';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type BreakdownRowItemProps = {
    row: BreakdownRow;
    /** Carte « Points gagnés » du détail de match : ligne plus serrée, filet au-dessus. */
    dense?: boolean;
};

/** Ligne ✓/✗ du barème : pastille, libellé traduit, points signés. */
export function BreakdownRowItem({ row, dense = false }: BreakdownRowItemProps) {
    const { t } = useTranslation(['predictions']);
    return (
        <View
            className={cn(
                'flex-row items-center border-border',
                dense ? 'gap-2.5 border-t py-2' : 'gap-3 border-b py-2.5',
            )}>
            <View
                className={cn(
                    'items-center justify-center rounded-pill',
                    dense ? 'h-5 w-5' : 'h-[22px] w-[22px]',
                    row.mark === 'ok' && 'bg-success/15',
                    row.mark === 'ko' && 'bg-text/10',
                    row.mark === 'malus' && 'bg-danger/15',
                    row.mark === 'info' && 'border border-border-strong',
                    row.mark === 'joker' && 'w-auto min-w-[22px] bg-brand px-1',
                )}>
                <Text
                    className={cn(
                        'font-body-bold',
                        dense ? 'text-[11px]' : 'text-[12px]',
                        row.mark === 'ok' && 'text-success',
                        row.mark === 'ko' && 'text-text-faint',
                        row.mark === 'malus' && 'text-danger',
                        row.mark === 'info' && 'text-text-faint',
                        row.mark === 'joker' && 'font-display text-on-brand',
                    )}>
                    {row.mark === 'ok'
                        ? '✓'
                        : row.mark === 'info'
                          ? 'i'
                          : row.mark === 'joker'
                            ? '×2'
                            : '✗'}
                </Text>
            </View>
            <View className="flex-1 flex-row items-center gap-2">
                <Text
                    className={cn(
                        'shrink font-body text-text',
                        dense ? 'text-[13px]' : 'text-[14px]',
                    )}>
                    {t(row.labelKey, row.params)}
                </Text>
                {row.defensiveGapBadge !== undefined ? (
                    <Badge tone="info" variant="soft">
                        {t('predictions:breakdown.defensiveGap', { gap: row.defensiveGapBadge })}
                    </Badge>
                ) : null}
            </View>
            {row.points !== null ? (
                <Text
                    className={cn(
                        'font-body-bold',
                        dense ? 'text-[13px]' : 'text-[14px]',
                        row.points > 0 && (row.mark === 'joker' ? 'text-brand' : 'text-text'),
                        row.points < 0 && 'text-danger',
                        row.points === 0 && 'text-text-faint',
                    )}>
                    {row.points > 0 ? `+${row.points}` : row.points < 0 ? `${row.points}` : '0'}
                </Text>
            ) : null}
        </View>
    );
}
