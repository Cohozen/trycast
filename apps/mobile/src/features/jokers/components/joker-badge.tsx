import { useTranslation } from 'react-i18next';

import { Text, View } from '@/tw';

/**
 * Pastille pleine « ×2 » : le joker de la phase est (ou a été) posé sur ce
 * match. Cartes verrouillée et résultat, ligne d'un membre de la ligue.
 */
export function JokerBadge() {
    const { t } = useTranslation('jokers');
    return (
        <View
            accessibilityLabel={t('badge.label')}
            accessible
            className="h-[22px] min-w-[30px] items-center justify-center rounded-pill bg-brand px-2">
            <Text className="font-display text-[12px] leading-[15px] tracking-[0.24px] text-on-brand">
                ×2
            </Text>
        </View>
    );
}
