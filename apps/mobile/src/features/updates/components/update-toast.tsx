import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useOtaUpdate } from '@/features/updates/use-ota-update';
import { Pressable, Text, View } from '@/tw';

/**
 * Toast persistant « Une mise à jour est prête - Redémarrer », posé juste
 * au-dessus de la tab bar tant qu'une mise à jour à distance attend (maquette
 * `docs/design/project/MesMatchs.dc.html`). Encre inversée (fond `text`, texte
 * `bg`) pour se détacher des cartes sans prendre de couleur ; le grenat n'est
 * que l'étincelle de la pastille. Rendu dans la tab bar : il en hérite
 * l'escamotage au clavier et n'apparaît pas sur les écrans poussés.
 */
export function UpdateToast() {
    const { t } = useTranslation('common');
    const { pending, restarting, restart } = useOtaUpdate();

    if (!pending) return null;

    return (
        // Étiré à la largeur de la rangée : sous le parent `items-center`, un
        // wrapper sans largeur se calerait sur son texte.
        <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(160)}
            style={{ alignSelf: 'stretch', alignItems: 'center' }}>
            <View
                accessibilityLiveRegion="polite"
                className="mb-2 w-full max-w-125 flex-row items-center justify-between gap-3 rounded-md bg-text px-4 py-[13px] tc-shadow-lg">
                <View className="shrink flex-row items-center gap-2.5">
                    <View className="h-[7px] w-[7px] rounded-pill bg-accent" />
                    <Text className="shrink font-body text-[14px] text-bg">
                        {restarting ? t('update.restarting') : t('update.ready')}
                    </Text>
                </View>
                {restarting ? null : (
                    <Pressable
                        accessibilityRole="button"
                        hitSlop={12}
                        onPress={restart}
                        className="active:opacity-70">
                        <Text className="font-body-bold text-[14px] text-bg underline">
                            {t('update.restart')}
                        </Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}
