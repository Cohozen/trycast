import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Text, useThemeColor, View } from '@/tw';

/**
 * Bloc « Pronos masqués » de la page de détail : avant le coup d'envoi, les
 * pronos des autres membres ne sont jamais montrés (la RPC serveur ne renvoie
 * rien de toute façon — ce bloc n'est que l'explication UX).
 */
export function MaskedPredictions() {
    const { t } = useTranslation(['predictions']);
    const textFaint = useThemeColor('text-faint');

    return (
        <View className="items-center gap-3 rounded-lg border border-dashed border-border-strong px-5 py-7">
            <View className="h-[46px] w-[46px] items-center justify-center rounded-pill bg-surface-sunken">
                <Lock color={textFaint} size={22} strokeWidth={1.8} />
            </View>
            <Text className="text-center font-body-bold text-[14px] text-text">
                {t('predictions:masked.title')}
            </Text>
            <Text className="max-w-[250px] text-center font-body text-[13px] leading-[18px] text-text-muted">
                {t('predictions:masked.message')}
            </Text>
        </View>
    );
}
