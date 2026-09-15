import { useTranslation } from 'react-i18next';

import type { Verdict } from '@/features/predictions/verdict';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

const VERDICT_CLASSES: Record<Verdict, { pill: string; text: string }> = {
    // Score exact = l'étincelle grenat pleine, seul verdict en solid
    exact: { pill: 'bg-accent', text: 'text-on-accent' },
    good: { pill: 'bg-success/15', text: 'text-success' },
    missed: { pill: 'bg-surface-sunken', text: 'text-text-muted' },
    pending: { pill: 'bg-surface-sunken', text: 'text-text-faint' },
};

/** Pastille de verdict d'un prono scoré (maquette Résultats). */
export function VerdictPill({ verdict }: { verdict: Verdict }) {
    const { t } = useTranslation(['predictions']);
    const classes = VERDICT_CLASSES[verdict];
    const labels: Record<Verdict, string> = {
        exact: t('predictions:verdict.exact'),
        good: t('predictions:verdict.good'),
        missed: t('predictions:verdict.missed'),
        pending: t('predictions:verdict.pending'),
    };

    return (
        <View
            className={cn('flex-row items-center gap-1.5 rounded-pill px-2.5 py-1', classes.pill)}>
            {verdict === 'exact' ? <Text className="text-[10px] text-on-accent">★</Text> : null}
            <Text className={cn('font-body-bold text-[11px] tracking-[0.33px]', classes.text)}>
                {labels[verdict]}
            </Text>
        </View>
    );
}
