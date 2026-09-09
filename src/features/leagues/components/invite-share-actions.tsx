import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform, Share } from 'react-native';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';
import { hapticLight } from '@/lib/haptics';
import { buildInviteUrl } from '@/lib/urls';
import { useThemeColor, View } from '@/tw';

type InviteShareActionsProps = {
    /** Code d'invitation de la ligue, affiché juste au-dessus par l'appelant. */
    code: string;
    name: string;
    /** D'où part le partage — seule propriété transmise à la mesure d'usage. */
    from: 'creation' | 'settings';
};

/**
 * Paire de boutons « Copier / Partager » d'un code d'invitation, montée à
 * l'identique après la création d'une ligue et dans ses réglages.
 *
 * Répartition assumée des deux actions : « Copier » met le **code** dans le
 * presse-papiers — c'est ce que l'appelant affiche en gros juste au-dessus, et
 * copier autre chose que ce qu'on montre serait déroutant — tandis que
 * « Partager » envoie un message porteur du **lien** d'invitation, qui ouvre
 * l'app directement et retombe sur le site pour qui ne l'a pas encore.
 */
export function InviteShareActions({ code, name, from }: InviteShareActionsProps) {
    const { t } = useTranslation(['leagues', 'common']);
    const toast = useToast();
    const onBrandColor = useThemeColor('on-brand');
    const textColor = useThemeColor('text');

    const copyCode = async () => {
        await Clipboard.setStringAsync(code);
        hapticLight();
        toast.show(t('leagues:detail.codeCopied', { code }), 'success');
    };

    const shareInvite = () => {
        const url = buildInviteUrl(code);
        // L'URL reste *dans* le message sur les deux plateformes : `url` n'est
        // honoré que par iOS, où certaines cibles de partage le substituent au
        // message au lieu de l'y ajouter. Le passer en plus n'y sert qu'à
        // alimenter les cibles qui n'acceptent qu'un lien.
        void Share.share({
            message: t('leagues:detail.shareMessage', { name, code, url }),
            ...(Platform.OS === 'ios' ? { url } : {}),
        });
        trackEvent({ name: 'league_invite_shared', props: { from } });
    };

    return (
        <View className="w-full flex-row gap-2.5">
            <View className="flex-1">
                <Button
                    fullWidth
                    leadingIcon={<Copy color={onBrandColor} size={16} strokeWidth={2} />}
                    onPress={copyCode}
                    title={t('common:actions.copy')}
                    variant="brand"
                />
            </View>
            <View className="flex-1">
                <Button
                    fullWidth
                    leadingIcon={<Share2 color={textColor} size={16} strokeWidth={2} />}
                    onPress={shareInvite}
                    title={t('common:actions.share')}
                    variant="secondary"
                />
            </View>
        </View>
    );
}
