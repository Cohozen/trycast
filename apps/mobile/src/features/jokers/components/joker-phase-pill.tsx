import { useTranslation } from 'react-i18next';

import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type JokerPhasePillProps = {
    /** Libellé court du match doublé (« ECO–NZL »), null si le joker est libre. */
    placedOn: string | null;
};

/**
 * Pastille d'en-tête de l'écran Matchs : état du joker de la phase en cours —
 * disponible (contour) ou posé sur tel match (teinte verte).
 */
export function JokerPhasePill({ placedOn }: JokerPhasePillProps) {
    const { t } = useTranslation('jokers');
    const placed = placedOn !== null;
    return (
        <View
            className={cn(
                'h-6 flex-row items-center gap-1.5 self-start rounded-pill border px-2.5',
                placed ? 'border-brand/30 bg-brand/10' : 'border-border bg-surface-sunken',
            )}>
            <Text
                className={cn(
                    'font-display text-[13px] leading-[16px] tracking-[0.26px]',
                    placed ? 'text-brand' : 'text-text-faint',
                )}>
                ×2
            </Text>
            <Text className="font-body-bold text-[11px] tracking-[0.33px] text-text-muted">
                {placed ? t('pill.placed', { match: placedOn }) : t('pill.available')}
            </Text>
        </View>
    );
}
