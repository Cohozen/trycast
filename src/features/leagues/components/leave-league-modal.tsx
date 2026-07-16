import { LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text, useThemeColor, View } from '@/tw';

type LeaveLeagueModalProps = {
    visible: boolean;
    leagueName: string;
    leaving: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Confirmation de départ d'une ligue (maquette Détail Ligue) : action
 * réversible (le code permet de revenir), une simple confirmation danger
 * suffit — pas de friction supplémentaire.
 */
export function LeaveLeagueModal({
    visible,
    leagueName,
    leaving,
    onConfirm,
    onCancel,
}: LeaveLeagueModalProps) {
    const { t } = useTranslation(['leagues', 'common']);
    const dangerColor = useThemeColor('danger');

    return (
        <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
            <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                <View className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                    <View className="items-center gap-3 px-5 pb-2 pt-6">
                        <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-danger/15">
                            <LogOut color={dangerColor} size={26} strokeWidth={1.9} />
                        </View>
                        <Text className="text-center font-display text-[25px] leading-[27px] text-text">
                            {t('leagues:detail.leave.title')}
                        </Text>
                        <Text className="text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                            {t('leagues:detail.leave.message', { name: leagueName })}
                        </Text>
                    </View>
                    <View className="gap-2.5 px-5 pb-4 pt-4">
                        <Button
                            fullWidth
                            loading={leaving}
                            onPress={onConfirm}
                            title={t('leagues:detail.leave.confirm')}
                            variant="danger"
                        />
                        <Button
                            disabled={leaving}
                            fullWidth
                            onPress={onCancel}
                            title={t('common:actions.cancel')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
